import {getApps, initializeApp} from "firebase-admin/app";
import {
  DocumentSnapshot,
  FieldValue,
  getFirestore,
} from "firebase-admin/firestore";
import {getMessaging, MulticastMessage} from "firebase-admin/messaging";
import {onDocumentCreated} from "firebase-functions/firestore";
import * as logger from "firebase-functions/logger";

if (getApps().length === 0) {
  initializeApp();
}

const REGION = "asia-northeast3";
const db = getFirestore();

const TITLE = "먹고싶콜";
const CHANNEL_ID = "calls";
const FALLBACK_NAME = "가족";
const MAX_MEMO_LENGTH = 100;
// sendEachForMulticast는 한 번에 500개까지 보낼 수 있다.
const MULTICAST_LIMIT = 500;
// 이 오류가 난 토큰은 더 이상 쓸 수 없으니 지운다.
const DEAD_TOKEN_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
]);

const RESPONSE_BODIES: Record<string, (name: string, menu: string) => string> =
  {
    cook: (name, menu) => `${name}: ${menu} 만들어 줄게요`,
    eatout: (name, menu) => `${name}: ${menu} 사 먹자고 해요`,
    later: (name, menu) => `${name}: ${menu} 다음에 하자고 해요`,
  };

/**
 * 문자열이면 앞뒤 공백을 지워서, 아니면 빈 문자열을 돌려준다.
 * @param {unknown} value 문서에서 읽은 값
 * @return {string} 정리한 문자열
 */
function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * members 문서에서 현재 이름을 읽는다. 없으면 '가족'.
 * @param {DocumentSnapshot | undefined} member members 문서
 * @return {string} 표시 이름
 */
function nameOf(member: DocumentSnapshot | undefined): string {
  return text(member?.data()?.displayName) || FALLBACK_NAME;
}

/**
 * 사용자들의 FCM 토큰을 모은다. 같은 토큰이 여러 사용자에게 있으면 모두 기록한다.
 * @param {string[]} uids 알림을 받을 사용자
 * @return {Promise<Map<string, string[]>>} 토큰 -> 그 토큰을 가진 uid들
 */
async function collectTokens(uids: string[]): Promise<Map<string, string[]>> {
  const owners = new Map<string, string[]>();
  if (uids.length === 0) return owners;

  const users = await db.getAll(
    ...uids.map((uid) => db.collection("users").doc(uid)),
  );
  for (const user of users) {
    const tokens: unknown = user.data()?.fcmTokens;
    if (!Array.isArray(tokens)) continue;

    for (const token of tokens) {
      if (typeof token !== "string" || !token) continue;
      owners.set(token, [...(owners.get(token) ?? []), user.id]);
    }
  }
  return owners;
}

/**
 * 더 이상 쓸 수 없는 토큰을 그 토큰을 가진 사용자의 fcmTokens에서 지운다.
 * @param {Map<string, string[]>} owners 토큰 -> uid들
 * @param {string[]} deadTokens 지울 토큰
 */
async function removeDeadTokens(
  owners: Map<string, string[]>,
  deadTokens: string[],
): Promise<void> {
  const byUser = new Map<string, string[]>();
  for (const token of deadTokens) {
    for (const uid of owners.get(token) ?? []) {
      byUser.set(uid, [...(byUser.get(uid) ?? []), token]);
    }
  }

  const results = await Promise.allSettled(
    [...byUser].map(([uid, tokens]) =>
      db.collection("users").doc(uid).update({
        fcmTokens: FieldValue.arrayRemove(...tokens),
      }),
    ),
  );
  const failed = results.filter((r) => r.status === "rejected").length;
  logger.info("죽은 토큰 정리", {removed: deadTokens.length, failed});
}

/**
 * 토큰들에 알림을 보내고, 쓸 수 없다고 응답한 토큰은 지운다.
 * @param {Map<string, string[]>} owners 토큰 -> uid들
 * @param {Function} build 토큰 묶음으로 보낼 메시지를 만드는 함수
 */
async function send(
  owners: Map<string, string[]>,
  build: (tokens: string[]) => MulticastMessage,
): Promise<void> {
  const tokens = [...owners.keys()];
  const deadTokens: string[] = [];
  let successCount = 0;

  for (let i = 0; i < tokens.length; i += MULTICAST_LIMIT) {
    const chunk = tokens.slice(i, i + MULTICAST_LIMIT);
    const batch = await getMessaging().sendEachForMulticast(build(chunk));
    successCount += batch.successCount;

    batch.responses.forEach((response, index) => {
      const code = response.error?.code;
      if (code && DEAD_TOKEN_CODES.has(code)) deadTokens.push(chunk[index]);
    });
  }

  logger.info("알림 발송", {
    requested: tokens.length,
    success: successCount,
  });
  if (deadTokens.length > 0) await removeDeadTokens(owners, deadTokens);
}

/**
 * 모든 알림이 같이 쓰는 메시지 틀.
 * @param {string[]} tokens 받을 토큰
 * @param {string} body 알림 내용
 * @param {Record<string, string>} data 앱으로 넘길 데이터
 * @return {MulticastMessage} 발송할 메시지
 */
function buildMessage(
  tokens: string[],
  body: string,
  data: Record<string, string>,
): MulticastMessage {
  return {
    tokens,
    notification: {title: TITLE, body},
    data,
    android: {
      priority: "high",
      notification: {channelId: CHANNEL_ID},
    },
  };
}

/**
 * 오류는 개인 정보가 섞이지 않게 종류만 남긴다.
 * @param {string} name 함수 이름
 * @param {unknown} e 발생한 오류
 */
function logFailure(name: string, e: unknown): void {
  const code = (e as {code?: unknown} | null)?.code;
  logger.error(`${name} 실패`, {
    code: typeof code === "string" ? code : undefined,
  });
}

// 새 콜이 생기면 보낸 사람을 뺀 가족 멤버에게 알린다.
export const onCallCreated = onDocumentCreated(
  {document: "families/{familyId}/calls/{callId}", region: REGION},
  async (event) => {
    try {
      const {familyId, callId} = event.params;
      const call = event.data?.data();
      const senderUid = text(call?.senderUid);
      const menu = text(call?.menu);
      if (!senderUid || !menu) return;

      const members = await db
        .collection("families").doc(familyId).collection("members").get();
      const sender = members.docs.find((doc) => doc.id === senderUid);
      const receivers = members.docs
        .map((doc) => doc.id)
        .filter((uid) => uid !== senderUid);

      const owners = await collectTokens(receivers);
      if (owners.size === 0) return;

      const memo = Array.from(text(call?.memo))
        .slice(0, MAX_MEMO_LENGTH).join("");
      const body =
        `${nameOf(sender)}: ${menu} 먹고 싶어요` + (memo ? ` · ${memo}` : "");

      await send(owners, (tokens) =>
        buildMessage(tokens, body, {type: "call", familyId, callId}));
    } catch (e) {
      // 다시 시도하면 같은 알림이 중복될 수 있어서 로그만 남기고 끝낸다.
      logFailure("onCallCreated", e);
    }
  },
);

// 응답이 처음 달리면 콜을 보낸 사람에게만 알린다. 응답을 바꾸는 수정은 알리지 않는다.
export const onResponseCreated = onDocumentCreated(
  {
    document: "families/{familyId}/calls/{callId}/responses/{uid}",
    region: REGION,
  },
  async (event) => {
    try {
      const {familyId, callId, uid: responderUid} = event.params;
      const buildBody = RESPONSE_BODIES[text(event.data?.data()?.type)];
      if (!buildBody) return;

      const familyDoc = db.collection("families").doc(familyId);
      const call = await familyDoc.collection("calls").doc(callId).get();
      const senderUid = text(call.data()?.senderUid);
      const menu = text(call.data()?.menu);
      if (!senderUid || !menu || senderUid === responderUid) return;

      // 가족에서 나간 사람에게는 보내지 않는다.
      const [responder, sender] = await db.getAll(
        familyDoc.collection("members").doc(responderUid),
        familyDoc.collection("members").doc(senderUid),
      );
      if (!sender.exists) return;

      const owners = await collectTokens([senderUid]);
      if (owners.size === 0) return;

      const body = buildBody(nameOf(responder), menu);
      await send(owners, (tokens) =>
        buildMessage(tokens, body, {type: "response", familyId, callId}));
    } catch (e) {
      logFailure("onResponseCreated", e);
    }
  },
);
