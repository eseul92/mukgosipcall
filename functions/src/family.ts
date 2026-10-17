import {createHash, randomInt} from "node:crypto";
import {getApps, initializeApp} from "firebase-admin/app";
import {
  FieldValue,
  getFirestore,
  Transaction,
} from "firebase-admin/firestore";
import {CallableRequest, HttpsError, onCall} from "firebase-functions/https";

if (getApps().length === 0) {
  initializeApp();
}

const REGION = "asia-northeast3";
const db = getFirestore();

const MAX_MEMBERS = 10;
const MAX_NAME_LENGTH = 20;
const CODE_LENGTH = 6;
const CODE_RETRIES = 5;
// 헷갈리는 문자 0, O, 1, I, L 제외
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

const userRef = (uid: string) => db.collection("users").doc(uid);
const familyRef = (familyId: string) =>
  db.collection("families").doc(familyId);
const inviteRef = (code: string) => db.collection("invites").doc(code);
const nicknameRef = (familyId: string, key: string) =>
  familyRef(familyId).collection("nicknames").doc(key);

/**
 * 로그인한(익명이 아닌) 사용자의 uid를 반환한다.
 * @param {CallableRequest} request 호출 요청
 * @return {string} uid
 */
function requireUid(request: CallableRequest): string {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "로그인이 필요해요.");
  }
  if (request.auth.token.firebase?.sign_in_provider === "anonymous") {
    throw new HttpsError("permission-denied", "로그인 후 이용할 수 있어요");
  }
  return request.auth.uid;
}

/**
 * 요청 데이터에서 문자열 필드를 꺼낸다. 문자열이 아니면 빈 문자열.
 * @param {unknown} data 요청 데이터
 * @param {string} key 필드 이름
 * @return {string} 필드 값
 */
function readString(data: unknown, key: string): string {
  const value = (data as Record<string, unknown> | null)?.[key];
  return typeof value === "string" ? value : "";
}

/**
 * 초대 코드를 무작위로 만든다.
 * @return {string} 6자리 초대 코드
 */
function generateCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARS[randomInt(CODE_CHARS.length)];
  }
  return code;
}

type Nickname = {
  /** 화면에 보이는 이름: 앞뒤 공백 제거, 연속 공백은 하나로 */
  display: string;
  /** 가족 안에서 겹치는지 가리는 키: 공백을 모두 빼고 소문자로 만든 뒤 SHA-256 */
  key: string;
  /** display의 글자 수(이모지 등도 한 글자) */
  length: number;
};

/**
 * 닉네임을 표시용 이름과 중복 확인용 키로 나눈다.
 * 같은 이름이면 눈으로 구분할 수 없는 차이(공백, 대소문자, 한글 조합 방식)도
 * 같은 키가 된다.
 * @param {unknown} raw 입력값. 문자열이 아니면 빈 이름으로 본다.
 * @return {Nickname} 정규화한 닉네임
 */
function normalizeNickname(raw: unknown): Nickname {
  const text = typeof raw === "string" ? raw.normalize("NFC") : "";
  const display = text.trim().replace(/\s+/g, " ");
  const key = createHash("sha256")
    .update(display.replace(/\s/g, "").toLowerCase())
    .digest("hex");
  return {display, key, length: Array.from(display).length};
}

/**
 * 요청으로 받은 닉네임을 정규화하고 1~20자인지 확인한다.
 * @param {unknown} raw 입력값
 * @return {Nickname} 정규화한 닉네임
 */
function parseNickname(raw: unknown): Nickname {
  const nickname = normalizeNickname(raw);
  if (nickname.length < 1 || nickname.length > MAX_NAME_LENGTH) {
    throw new HttpsError(
      "invalid-argument",
      "이름은 1자 이상 20자 이하로 입력해 주세요.",
    );
  }
  return nickname;
}

/**
 * 시도 횟수를 1 올린다. 한도를 넘으면 resource-exhausted.
 * 가입 트랜잭션과 분리해야 실패한 시도도 횟수에 남는다.
 * @param {string} uid 사용자 uid
 */
async function consumeJoinAttempt(uid: string): Promise<void> {
  const ref = db.collection("rateLimits").doc(uid);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const now = Date.now();
    const startedAt: number = snap.data()?.windowStart?.toMillis() ?? 0;

    if (!snap.exists || now - startedAt >= RATE_LIMIT_WINDOW_MS) {
      tx.set(ref, {
        attempts: 1,
        windowStart: FieldValue.serverTimestamp(),
      });
      return;
    }
    if ((snap.data()?.attempts ?? 0) >= RATE_LIMIT_MAX) {
      throw new HttpsError(
        "resource-exhausted",
        "시도가 너무 많아요. 잠시 후 다시 해주세요.",
      );
    }
    tx.update(ref, {attempts: FieldValue.increment(1)});
  });
}

export const createFamily = onCall({region: REGION}, async (request) => {
  const uid = requireUid(request);

  const name = readString(request.data, "name").trim();
  const length = Array.from(name).length;
  if (length < 1 || length > MAX_NAME_LENGTH) {
    throw new HttpsError(
      "invalid-argument",
      "가족 이름은 1자 이상 20자 이하로 입력해 주세요.",
    );
  }

  return db.runTransaction(async (tx: Transaction) => {
    const userSnap = await tx.get(userRef(uid));
    if (userSnap.data()?.familyId) {
      throw new HttpsError("already-exists", "이미 가족에 속해 있어요.");
    }
    const nickname = normalizeNickname(userSnap.data()?.displayName);
    if (nickname.length < 1) {
      throw new HttpsError(
        "failed-precondition",
        "가족을 만들기 전에 이름을 정해 주세요",
      );
    }

    let code = "";
    for (let i = 0; i < CODE_RETRIES; i++) {
      const candidate = generateCode();
      const invite = await tx.get(inviteRef(candidate));
      if (!invite.exists) {
        code = candidate;
        break;
      }
    }
    if (!code) {
      throw new HttpsError(
        "unavailable",
        "초대 코드를 만들지 못했어요. 다시 시도해 주세요.",
      );
    }

    const family = db.collection("families").doc();
    tx.set(family, {
      name,
      ownerUid: uid,
      memberCount: 1,
      inviteCode: code,
      createdAt: FieldValue.serverTimestamp(),
    });
    tx.set(family.collection("members").doc(uid), {
      displayName: nickname.display,
      role: "owner",
      joinedAt: FieldValue.serverTimestamp(),
    });
    tx.set(nicknameRef(family.id, nickname.key), {uid});
    tx.set(inviteRef(code), {
      familyId: family.id,
      createdBy: uid,
      active: true,
      createdAt: FieldValue.serverTimestamp(),
    });
    tx.set(userRef(uid), {familyId: family.id}, {merge: true});

    return {familyId: family.id, inviteCode: code};
  });
});

export const joinFamily = onCall({region: REGION}, async (request) => {
  const uid = requireUid(request);

  const code = readString(request.data, "code").trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(code)) {
    throw new HttpsError(
      "invalid-argument",
      "초대 코드는 6자리예요. 다시 확인해 주세요.",
    );
  }

  // 이미 가족이 있거나 이름이 없으면 시도 횟수를 쓰지 않고 바로 거절한다.
  const before = await userRef(uid).get();
  if (before.data()?.familyId) {
    throw new HttpsError("already-exists", "이미 가족에 속해 있어요.");
  }
  if (normalizeNickname(before.data()?.displayName).length < 1) {
    throw new HttpsError(
      "failed-precondition",
      "참여하기 전에 이름을 정해 주세요",
    );
  }

  // 같은 이름 때문에 거절되는 경우도 시도 횟수에 들어간다.
  await consumeJoinAttempt(uid);

  return db.runTransaction(async (tx: Transaction) => {
    const userSnap = await tx.get(userRef(uid));
    if (userSnap.data()?.familyId) {
      throw new HttpsError("already-exists", "이미 가족에 속해 있어요.");
    }
    const nickname = normalizeNickname(userSnap.data()?.displayName);
    if (nickname.length < 1) {
      throw new HttpsError(
        "failed-precondition",
        "참여하기 전에 이름을 정해 주세요",
      );
    }

    const invite = await tx.get(inviteRef(code));
    const notFound = new HttpsError("not-found", "초대 코드를 확인해 주세요");
    if (!invite.exists || invite.data()?.active !== true) {
      throw notFound;
    }

    const familyId: string = invite.data()?.familyId;
    const family = await tx.get(familyRef(familyId));
    if (!family.exists) {
      throw notFound;
    }
    if ((family.data()?.memberCount ?? 0) >= MAX_MEMBERS) {
      throw new HttpsError(
        "failed-precondition",
        "가족 인원이 가득 찼어요",
      );
    }
    // 이름 문서가 없는 예전 멤버와는 겹침을 가릴 수 없어서 그대로 통과한다.
    const taken = await tx.get(nicknameRef(familyId, nickname.key));
    if (taken.exists) {
      throw new HttpsError(
        "already-exists",
        "가족 중에 같은 이름이 있어요. 이름을 바꾼 뒤 다시 참여해 주세요",
      );
    }

    tx.set(family.ref.collection("members").doc(uid), {
      displayName: nickname.display,
      role: "member",
      joinedAt: FieldValue.serverTimestamp(),
    });
    tx.set(nicknameRef(familyId, nickname.key), {uid});
    tx.update(family.ref, {memberCount: FieldValue.increment(1)});
    tx.set(userRef(uid), {familyId}, {merge: true});

    return {familyId};
  });
});

export const leaveFamily = onCall({region: REGION}, async (request) => {
  const uid = requireUid(request);

  // 읽기만 하는 트랜잭션: 상태를 확인하고, 그룹장이 혼자면 초대를 먼저 막는다.
  const outcome = await db.runTransaction(async (tx: Transaction) => {
    const userSnap = await tx.get(userRef(uid));
    const familyId: string | undefined = userSnap.data()?.familyId;
    if (!familyId) {
      throw new HttpsError("failed-precondition", "속해 있는 가족이 없어요.");
    }

    const family = await tx.get(familyRef(familyId));
    if (!family.exists) {
      // 가족 문서가 이미 없으면 사용자 쪽 연결만 정리한다.
      tx.set(userRef(uid), {familyId: FieldValue.delete()}, {merge: true});
      return {kind: "done" as const};
    }

    const data = family.data()!;
    const isOwner = data.ownerUid === uid;
    const memberCount: number = data.memberCount ?? 1;

    if (isOwner && memberCount >= 2) {
      throw new HttpsError(
        "failed-precondition",
        "다른 멤버가 있을 때는 그룹장이 나갈 수 없어요",
      );
    }

    if (isOwner) {
      // 삭제 도중 새 멤버가 들어오지 못하도록 초대를 먼저 비활성화한다.
      // 가입 트랜잭션과 같은 문서를 건드리므로 동시 가입은 충돌 후 재시도된다.
      tx.update(inviteRef(data.inviteCode), {active: false});
      return {kind: "dissolve" as const, familyId, code: data.inviteCode};
    }

    // 내 이름 문서도 지운다. 없거나 다른 사람의 것이면 건드리지 않는다.
    const memberRef = family.ref.collection("members").doc(uid);
    const member = await tx.get(memberRef);
    const mine = normalizeNickname(member.data()?.displayName);
    const nicknameDoc = mine.length > 0 ?
      await tx.get(nicknameRef(familyId, mine.key)) :
      null;

    if (nicknameDoc?.exists && nicknameDoc.data()?.uid === uid) {
      tx.delete(nicknameDoc.ref);
    }
    tx.delete(memberRef);
    tx.update(family.ref, {memberCount: FieldValue.increment(-1)});
    tx.set(userRef(uid), {familyId: FieldValue.delete()}, {merge: true});
    return {kind: "done" as const};
  });

  if (outcome.kind === "dissolve") {
    // recursiveDelete는 트랜잭션 안에서 쓸 수 없다.
    await db.recursiveDelete(familyRef(outcome.familyId));
    const batch = db.batch();
    batch.delete(inviteRef(outcome.code));
    batch.set(userRef(uid), {familyId: FieldValue.delete()}, {merge: true});
    await batch.commit();
  }

  return {ok: true};
});

export const updateDisplayName = onCall({region: REGION}, async (request) => {
  const uid = requireUid(request);
  const nickname = parseNickname(readString(request.data, "name"));

  await db.runTransaction(async (tx: Transaction) => {
    const userSnap = await tx.get(userRef(uid));
    const familyId: string | undefined = userSnap.data()?.familyId;

    // 가족이 없으면 겹침을 가릴 곳이 없으니 내 이름만 저장한다.
    if (!familyId) {
      tx.set(userRef(uid), {displayName: nickname.display}, {merge: true});
      return;
    }

    const memberRef = familyRef(familyId).collection("members").doc(uid);
    const member = await tx.get(memberRef);
    if (!member.exists) {
      throw new HttpsError(
        "failed-precondition",
        "가족 정보를 찾을 수 없어요. 가족에서 나간 뒤 다시 참여해 주세요.",
      );
    }

    const previous = normalizeNickname(member.data()?.displayName);
    const nextDoc = await tx.get(nicknameRef(familyId, nickname.key));
    const takenBySomeone = nextDoc.exists && nextDoc.data()?.uid !== uid;
    if (takenBySomeone) {
      throw new HttpsError(
        "already-exists",
        "가족 중에 같은 이름이 있어요. 다른 이름을 써 주세요",
      );
    }

    // 내 이전 이름 문서는 내 것일 때만 지운다. 이름 문서가 없는 예전
    // 멤버이거나, 같은 키를 이미 다른 사람이 쓰고 있으면 건드리지 않는다.
    const sameKey = previous.key === nickname.key;
    const previousDoc = previous.length > 0 && !sameKey ?
      await tx.get(nicknameRef(familyId, previous.key)) :
      null;

    if (previousDoc?.exists && previousDoc.data()?.uid === uid) {
      tx.delete(previousDoc.ref);
    }
    // 같은 이름으로 다시 저장하면 문서는 그대로 두고, 대소문자나 띄어쓰기
    // 차이가 있으면 표시 이름만 바꾼다.
    if (!sameKey || !nextDoc.exists) {
      tx.set(nextDoc.ref, {uid});
    }
    tx.update(memberRef, {displayName: nickname.display});
    tx.set(userRef(uid), {displayName: nickname.display}, {merge: true});
  });

  return {displayName: nickname.display};
});
