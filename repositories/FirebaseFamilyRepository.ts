import { getAuth, onAuthStateChanged } from '@react-native-firebase/auth';
import {
  collection,
  doc,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
} from '@react-native-firebase/firestore';
import { callFunction } from '../services/callable';
import type { Family, Member, Reply, User } from '../types/models';
import { DummyFamilyRepository } from './DummyFamilyRepository';
import type {
  FamilyState,
  RealtimeFamilyRepository,
  SendCallInput,
} from './FamilyRepository';

type Unsubscribe = () => void;

const noop: Unsubscribe = () => {};

const EMPTY_STATE: FamilyState = { familyId: null, family: null, members: [] };

const text = (value: unknown) => (typeof value === 'string' ? value : '');

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

function watchFamily(
  familyId: string,
  onChange: (patch: Partial<Pick<FamilyState, 'family' | 'members'>>) => void,
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

  return () => {
    stopFamily();
    stopMembers();
  };
}

// 가족 기능(생성/참여/탈퇴/구독)만 Firebase로 연결한다.
// 재료와 콜은 아직 더미 구현에 맡긴다.
export class FirebaseFamilyRepository implements RealtimeFamilyRepository {
  private readonly dummy = new DummyFamilyRepository();
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
        stopWatching = this.watchUser(user.uid, listener);
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
        publish({ familyId, family: null, members: [] });
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

  async listCalls() {
    return this.familyId ? this.dummy.listCalls() : [];
  }

  async sendCall(input: SendCallInput) {
    if (!this.familyId) throw new Error('가족과 연결해야 콜을 보낼 수 있어요');
    return this.dummy.sendCall(input);
  }

  respondToCall(callId: string, value: Reply) {
    return this.dummy.respondToCall(callId, value);
  }
}
