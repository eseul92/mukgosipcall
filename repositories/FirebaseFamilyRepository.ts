import { getAuth, onAuthStateChanged } from '@react-native-firebase/auth';
import {
  addDoc,
  collection,
  doc,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from '@react-native-firebase/firestore';
import { callFunction } from '../services/callable';
import { startTracked } from '../services/listenerRegistry';
import type {
  Call,
  CallSource,
  Family,
  MealType,
  Member,
  Reply,
  Response,
  User,
} from '../types/models';
import { DummyFamilyRepository } from './DummyFamilyRepository';
import type {
  FamilyState,
  RealtimeFamilyRepository,
  SendCallInput,
} from './FamilyRepository';

type Unsubscribe = () => void;

const noop: Unsubscribe = () => {};

const EMPTY_STATE: FamilyState = { familyId: null, family: null, members: [], calls: [] };

// 화면에 보여 줄 최근 콜 개수. 콜마다 응답을 따로 구독하므로 너무 키우지 않는다.
const CALL_LIMIT = 30;

// Firestore 규칙이 허용하는 calls.mode 값과 앱의 MealType을 서로 바꾼다.
const MODE_BY_MEAL_TYPE: Record<MealType, string> = {
  만들어줘: 'make',
  사먹자: 'eatout',
  시켜먹자: 'delivery',
};
const MEAL_TYPE_BY_MODE: Record<string, MealType> = {
  make: '만들어줘',
  eatout: '사먹자',
  delivery: '시켜먹자',
};
const SOURCES: CallSource[] = ['recommended', 'frequent', 'custom'];
const REPLIES: Reply[] = ['cook', 'eatout', 'later'];

const text = (value: unknown) => (typeof value === 'string' ? value : '');

// 서버 시각이 아직 정해지지 않은 쓰기는 data({ serverTimestamps: 'estimate' })로 읽어 Timestamp가 온다.
function toMillis(value: unknown): number {
  const toMs = (value as { toMillis?: () => number } | null)?.toMillis;
  return typeof toMs === 'function' ? toMs.call(value) : Date.now();
}

function toFamily(id: string, data: Record<string, unknown> | undefined): Family {
  return {
    id,
    name: text(data?.name),
    inviteCode: text(data?.inviteCode),
    ownerId: text(data?.ownerUid),
    memberCount: typeof data?.memberCount === 'number' ? data.memberCount : undefined,
  };
}

function toMember(familyId: string, userId: string, data: Record<string, unknown>): Member {
  return {
    userId,
    familyId,
    name: text(data.displayName) || '멤버',
    role: data.role === 'owner' ? 'owner' : 'member',
  };
}

function toCall(familyId: string, id: string, data: Record<string, unknown> | undefined): Call {
  const source = SOURCES.find((s) => s === data?.source) ?? 'custom';
  return {
    id,
    familyId,
    senderId: text(data?.senderUid),
    senderName: text(data?.senderName) || undefined,
    menu: text(data?.menu),
    mealType: MEAL_TYPE_BY_MODE[text(data?.mode)] ?? '만들어줘',
    memo: text(data?.memo) || undefined,
    source,
    createdAt: toMillis(data?.createdAt),
    responses: [],
  };
}

function toResponse(userId: string, data: Record<string, unknown>): Response | null {
  const value = REPLIES.find((r) => r === data.type);
  if (!value) return null;
  return { userId, value, createdAt: toMillis(data.createdAt) };
}

// 최근 콜과 콜마다 달린 응답을 구독해, 둘 중 무엇이 바뀌어도 콜 목록 전체를 다시 보낸다.
function watchCalls(familyId: string, onChange: (calls: Call[]) => void): Unsubscribe {
  const db = getFirestore();
  const warn = (e: unknown) => console.warn('콜을 읽지 못했어요', e);

  let calls: Call[] = [];
  const responses = new Map<string, Response[]>();
  const stopResponses = new Map<string, Unsubscribe>();

  const emit = () =>
    onChange(calls.map((call) => ({ ...call, responses: responses.get(call.id) ?? [] })));

  const watchResponses = (callId: string) =>
    onSnapshot(
      collection(db, 'families', familyId, 'calls', callId, 'responses'),
      (snap) => {
        const list = snap.docs
          .map((d) => toResponse(d.id, d.data()))
          .filter((r): r is Response => r !== null)
          .sort((a, b) => a.createdAt - b.createdAt);
        responses.set(callId, list);
        emit();
      },
      warn,
    );

  const stopCalls = onSnapshot(
    query(collection(db, 'families', familyId, 'calls'), orderBy('createdAt', 'desc'), limit(CALL_LIMIT)),
    (snap) => {
      calls = snap.docs.map((d) =>
        toCall(familyId, d.id, d.data({ serverTimestamps: 'estimate' })),
      );

      // 목록에서 빠진 콜의 응답 구독은 끊고, 새로 들어온 콜은 구독을 시작한다.
      const ids = new Set(calls.map((call) => call.id));
      for (const [id, stop] of stopResponses) {
        if (ids.has(id)) continue;
        stop();
        stopResponses.delete(id);
        responses.delete(id);
      }
      for (const id of ids) {
        if (!stopResponses.has(id)) stopResponses.set(id, watchResponses(id));
      }
      emit();
    },
    warn,
  );

  return () => {
    stopCalls();
    stopResponses.forEach((stop) => stop());
    stopResponses.clear();
  };
}

function watchFamily(
  familyId: string,
  onChange: (patch: Partial<Pick<FamilyState, 'family' | 'members' | 'calls'>>) => void,
): Unsubscribe {
  const db = getFirestore();
  const warn = (e: unknown) => console.warn('가족 정보를 읽지 못했어요', e);

  const stopFamily = onSnapshot(
    doc(db, 'families', familyId),
    (snap) => onChange({ family: snap.exists() ? toFamily(snap.id, snap.data()) : null }),
    warn,
  );
  const stopMembers = onSnapshot(
    query(collection(db, 'families', familyId, 'members'), orderBy('joinedAt')),
    (snap) =>
      onChange({ members: snap.docs.map((d) => toMember(familyId, d.id, d.data())) }),
    warn,
  );
  const stopCalls = watchCalls(familyId, (calls) => onChange({ calls }));

  return () => {
    stopFamily();
    stopMembers();
    stopCalls();
  };
}

// 가족 기능(생성/참여/탈퇴/구독)과 콜을 Firebase로 연결한다.
// 재료는 아직 더미 구현에 맡긴다.
export class FirebaseFamilyRepository implements RealtimeFamilyRepository {
  private dummy = new DummyFamilyRepository();
  /** 마지막으로 구독이 알려 준 familyId */
  private familyId: string | null = null;

  async getCurrentUser(): Promise<User> {
    const user = getAuth().currentUser;
    return { id: user?.uid ?? '', name: user?.displayName ?? '나' };
  }

  subscribeFamily(listener: (state: FamilyState) => void): Unsubscribe {
    let stopWatching = noop;

    const stopAuth = onAuthStateChanged(getAuth(), (user) => {
      stopWatching();
      stopWatching = noop;
      if (user) {
        stopWatching = startTracked(() => this.watchUser(user.uid, listener));
      } else {
        this.publish(EMPTY_STATE, listener);
      }
    });

    return () => {
      stopAuth();
      stopWatching();
    };
  }

  // users/{uid}의 familyId가 바뀔 때마다 가족 문서와 멤버 구독을 갈아 끼운다.
  private watchUser(uid: string, listener: (state: FamilyState) => void): Unsubscribe {
    let active = true;
    let known = false;
    let state = EMPTY_STATE;
    let stopFamily = noop;

    const publish = (next: FamilyState) => {
      if (!active) return;
      state = next;
      this.publish(next, listener);
    };

    const stopUser = onSnapshot(
      doc(getFirestore(), 'users', uid),
      (snap) => {
        const raw = snap.data()?.familyId;
        const familyId = typeof raw === 'string' && raw ? raw : null;
        if (known && familyId === state.familyId) return;
        known = true;

        stopFamily();
        stopFamily = noop;
        publish({ familyId, family: null, members: [], calls: [] });
        if (familyId) {
          stopFamily = watchFamily(familyId, (patch) => publish({ ...state, ...patch }));
        }
      },
      (e) => {
        console.warn('사용자 정보를 읽지 못했어요', e);
        // 첫 응답을 못 받아도 화면이 계속 비어 있지 않도록 가족 없음으로 둔다.
        if (!known) {
          known = true;
          publish(EMPTY_STATE);
        }
      },
    );

    return () => {
      active = false;
      stopUser();
      stopFamily();
    };
  }

  reset() {
    this.dummy = new DummyFamilyRepository();
    this.familyId = null;
  }

  private publish(state: FamilyState, listener: (state: FamilyState) => void) {
    this.familyId = state.familyId;
    listener(state);
  }

  createFamily(name: string) {
    return callFunction<{ name: string }, { familyId: string; inviteCode: string }>(
      'createFamily',
      { name },
    );
  }

  joinFamily(inviteCode: string) {
    return callFunction<{ code: string }, { familyId: string }>('joinFamily', {
      code: inviteCode,
    });
  }

  async leaveFamily() {
    await callFunction<undefined, { ok: boolean }>('leaveFamily');
  }

  // 콜을 보내면 서버의 onCallCreated가 가족에게 푸시를 보낸다. 목록은 구독으로 갱신된다.
  async sendCall(input: SendCallInput) {
    const familyId = this.familyId;
    const uid = getAuth().currentUser?.uid;
    if (!familyId || !uid) throw new Error('가족과 연결해야 콜을 보낼 수 있어요');

    // Firestore는 undefined 값을 받지 않으므로 메모가 없으면 필드를 뺀다.
    const memo = input.memo?.trim();
    await addDoc(collection(getFirestore(), 'families', familyId, 'calls'), {
      senderUid: uid,
      menu: input.menu,
      mode: MODE_BY_MEAL_TYPE[input.mealType],
      source: input.source,
      ...(memo ? { memo } : {}),
      createdAt: serverTimestamp(),
    });
  }

  // 응답 문서 ID는 응답한 사람의 uid라서, 다시 응답하면 이전 응답을 덮어쓴다.
  async respondToCall(callId: string, value: Reply) {
    const familyId = this.familyId;
    const uid = getAuth().currentUser?.uid;
    if (!familyId || !uid) throw new Error('가족과 연결해야 응답할 수 있어요');

    await setDoc(doc(getFirestore(), 'families', familyId, 'calls', callId, 'responses', uid), {
      type: value,
      createdAt: serverTimestamp(),
    });
  }

  // 아래는 아직 더미 그대로다.

  listIngredients() {
    return this.dummy.listIngredients();
  }

  addIngredient(name: string) {
    return this.dummy.addIngredient(name);
  }

  removeIngredient(ingredientId: string) {
    return this.dummy.removeIngredient(ingredientId);
  }
}
