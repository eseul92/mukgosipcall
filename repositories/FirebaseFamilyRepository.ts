import { getAuth, onAuthStateChanged } from '@react-native-firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from '@react-native-firebase/firestore';
import { RECEIPT_MAX_SAVE, RECEIPT_TOO_MANY_MESSAGE } from '../constants/receipt';
import { callFunction } from '../services/callable';
import { startTracked } from '../services/listenerRegistry';
import { shoppingNameKey } from '../utils/shopping';
import type {
  Call,
  CallSource,
  Family,
  Ingredient,
  MealType,
  Member,
  Reply,
  Response,
  ShoppingItem,
  User,
} from '../types/models';
import { DummyFamilyRepository } from './DummyFamilyRepository';
import type {
  FamilyState,
  NewShoppingItem,
  RealtimeFamilyRepository,
  SendCallInput,
} from './FamilyRepository';

type Unsubscribe = () => void;

const noop: Unsubscribe = () => {};

const EMPTY_STATE: FamilyState = {
  familyId: null,
  family: null,
  members: [],
  calls: [],
  ingredients: [],
  shoppingItems: [],
  shoppingStatus: 'ready',
};

// writeBatch는 한 번에 500개까지 쓸 수 있다. 항목당 쓰기 수에 맞춰 나눠서 보낸다.
const DELETE_CHUNK = 400;
const MOVE_CHUNK = 200;

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

function toIngredient(id: string, data: Record<string, unknown> | undefined): Ingredient {
  return {
    id,
    name: text(data?.name),
    addedBy: text(data?.addedBy),
    createdAt: toMillis(data?.createdAt),
  };
}

function toShoppingItem(id: string, data: Record<string, unknown> | undefined): ShoppingItem {
  const doneBy = text(data?.doneBy);
  const fromMenu = text(data?.fromMenu);
  return {
    id,
    name: text(data?.name),
    addedBy: text(data?.addedBy),
    done: data?.done === true,
    ...(doneBy ? { doneBy } : {}),
    ...(fromMenu ? { fromMenu } : {}),
    createdAt: toMillis(data?.createdAt),
  };
}

function chunk<T>(list: T[], size: number): T[][] {
  const parts: T[][] = [];
  for (let i = 0; i < list.length; i += size) parts.push(list.slice(i, i + size));
  return parts;
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

// 냉장고 재료는 만든 순서(오래된 것부터)로 구독한다.
function watchIngredients(
  familyId: string,
  onChange: (patch: Pick<FamilyState, 'ingredients'>) => void,
): Unsubscribe {
  return onSnapshot(
    query(collection(getFirestore(), 'families', familyId, 'ingredients'), orderBy('createdAt', 'asc')),
    (snap) =>
      onChange({
        ingredients: snap.docs.map((d) =>
          toIngredient(d.id, d.data({ serverTimestamps: 'estimate' })),
        ),
      }),
    (e) => console.warn('재료를 읽지 못했어요', e),
  );
}

// 장보기 목록은 만든 순서(오래된 것부터)로 구독한다.
function watchShopping(
  familyId: string,
  onChange: (patch: Pick<FamilyState, 'shoppingStatus'> & Partial<FamilyState>) => void,
): Unsubscribe {
  return onSnapshot(
    query(collection(getFirestore(), 'families', familyId, 'shoppingItems'), orderBy('createdAt', 'asc')),
    (snap) =>
      onChange({
        shoppingItems: snap.docs.map((d) =>
          toShoppingItem(d.id, d.data({ serverTimestamps: 'estimate' })),
        ),
        shoppingStatus: 'ready',
      }),
    (e) => {
      console.warn('장보기 목록을 읽지 못했어요', e);
      onChange({ shoppingStatus: 'error' });
    },
  );
}

function watchFamily(
  familyId: string,
  onChange: (
    patch: Partial<
      Pick<
        FamilyState,
        'family' | 'members' | 'calls' | 'ingredients' | 'shoppingItems' | 'shoppingStatus'
      >
    >,
  ) => void,
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
  const stopIngredients = watchIngredients(familyId, onChange);
  const stopShopping = watchShopping(familyId, onChange);

  return () => {
    stopFamily();
    stopMembers();
    stopCalls();
    stopIngredients();
    stopShopping();
  };
}

// 가족 기능(생성/참여/탈퇴/구독), 콜, 장보기, 재료를 Firebase로 연결한다.
// 가족이 없는 사용자(게스트 포함)의 재료만 더미 구현(메모리)에 맡긴다.
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
        publish({
          familyId,
          family: null,
          members: [],
          calls: [],
          ingredients: [],
          shoppingItems: [],
          shoppingStatus: 'loading',
        });
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

  private requireShoppingContext() {
    const familyId = this.familyId;
    const uid = getAuth().currentUser?.uid;
    if (!familyId || !uid) throw new Error('가족과 연결해야 장보기를 쓸 수 있어요');
    return { familyId, uid };
  }

  // 목록은 구독으로 갱신된다. createdAt은 반드시 서버 시각, 선택 필드는 값이 있을 때만 넣는다.
  async addShoppingItems(items: NewShoppingItem[]) {
    const { familyId, uid } = this.requireShoppingContext();
    if (items.length === 0) return;

    const db = getFirestore();
    const batch = writeBatch(db);
    for (const item of items) {
      batch.set(doc(collection(db, 'families', familyId, 'shoppingItems')), {
        name: item.name,
        addedBy: uid,
        done: false,
        ...(item.fromMenu ? { fromMenu: item.fromMenu } : {}),
        createdAt: serverTimestamp(),
      });
    }
    await batch.commit();
  }

  // 규칙상 체크·해제는 done과 doneBy만 바꿀 수 있다.
  async setShoppingItemDone(itemId: string, done: boolean) {
    const { familyId, uid } = this.requireShoppingContext();
    await updateDoc(doc(getFirestore(), 'families', familyId, 'shoppingItems', itemId), {
      done,
      doneBy: uid,
    });
  }

  async removeShoppingItems(itemIds: string[]) {
    const { familyId } = this.requireShoppingContext();
    const db = getFirestore();
    for (const part of chunk(itemIds, DELETE_CHUNK)) {
      const batch = writeBatch(db);
      for (const id of part) batch.delete(doc(db, 'families', familyId, 'shoppingItems', id));
      await batch.commit();
    }
  }

  async moveShoppingItemsToFridge(items: { id: string; name: string }[]) {
    const { familyId, uid } = this.requireShoppingContext();
    if (items.length === 0) return 0;

    const db = getFirestore();
    // 같은 이름의 재료가 이미 있으면 재료는 더하지 않는다.
    const existing = await getDocs(collection(db, 'families', familyId, 'ingredients'));
    const known = new Set(existing.docs.map((d) => shoppingNameKey(text(d.data().name))));

    let added = 0;
    for (const part of chunk(items, MOVE_CHUNK)) {
      const batch = writeBatch(db);
      let addedInPart = 0;
      for (const item of part) {
        const key = shoppingNameKey(item.name);
        if (!known.has(key)) {
          known.add(key);
          addedInPart += 1;
          batch.set(doc(collection(db, 'families', familyId, 'ingredients')), {
            name: item.name,
            addedBy: uid,
            createdAt: serverTimestamp(),
          });
        }
        batch.delete(doc(db, 'families', familyId, 'shoppingItems', item.id));
      }
      await batch.commit();
      added += addedInPart;
    }
    return added;
  }

  // 가족이 있으면 재료는 구독(FamilyState.ingredients)으로 읽는다.
  // 아래 목록은 가족이 없는 사용자의 메모리 재료다.
  listIngredients() {
    return this.dummy.listIngredients();
  }

  async addIngredient(name: string) {
    const familyId = this.familyId;
    const uid = getAuth().currentUser?.uid;
    if (!familyId || !uid) return this.dummy.addIngredient(name);

    const ref = await addDoc(collection(getFirestore(), 'families', familyId, 'ingredients'), {
      name,
      addedBy: uid,
      createdAt: serverTimestamp(),
    });
    return { id: ref.id, name, addedBy: uid, createdAt: Date.now() };
  }

  // 규칙상 재료는 name, addedBy(본인), createdAt(서버 시각)만 쓸 수 있다.
  async addIngredients(names: string[]) {
    if (names.length > RECEIPT_MAX_SAVE) throw new Error(RECEIPT_TOO_MANY_MESSAGE);
    const familyId = this.familyId;
    const uid = getAuth().currentUser?.uid;
    if (!familyId || !uid) return this.dummy.addIngredients(names);
    if (names.length === 0) return;

    const db = getFirestore();
    const batch = writeBatch(db);
    for (const name of names) {
      batch.set(doc(collection(db, 'families', familyId, 'ingredients')), {
        name,
        addedBy: uid,
        createdAt: serverTimestamp(),
      });
    }
    await batch.commit();
  }

  async removeIngredient(ingredientId: string) {
    const familyId = this.familyId;
    if (!familyId) return this.dummy.removeIngredient(ingredientId);

    await deleteDoc(doc(getFirestore(), 'families', familyId, 'ingredients', ingredientId));
  }
}
