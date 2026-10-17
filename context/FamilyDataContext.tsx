import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { FamilyState, RealtimeFamilyRepository, SendCallInput } from '../repositories';
import type { Call, Family, Ingredient, Member, Reply, User } from '../types/models';
import { useAuth } from './AuthContext';

// 가족 상태는 구독으로 오고, 나머지는 변경 뒤에 다시 읽는다.
type Snapshot = {
  user: User;
  ingredients: Ingredient[];
  calls: Call[];
};

type FamilyDataValue = Snapshot & {
  family: Family | null;
  /** users/{uid}.familyId. 가족이 없으면 null */
  familyId: string | null;
  members: Member[];
  /** users/{uid}에 familyId가 있으면 true. family 문서를 읽는 중에도 true */
  hasFamily: boolean;
  /** 멤버 목록의 현재 이름. 못 찾으면(나간 사람) 저장돼 있던 이름, 그것도 없으면 '가족' */
  getMemberName: (userId: string, savedName?: string) => string;
  createFamily: (name: string) => Promise<void>;
  joinFamily: (inviteCode: string) => Promise<void>;
  leaveFamily: () => Promise<void>;
  addIngredient: (name: string) => Promise<void>;
  removeIngredient: (ingredientId: string) => Promise<void>;
  sendCall: (input: SendCallInput) => Promise<void>;
  respondToCall: (callId: string, value: Reply) => Promise<void>;
  /** 로그아웃할 때 사용자, 가족, 콜, 재료 상태를 모두 비운다. */
  resetAll: () => void;
};

const FamilyDataContext = createContext<FamilyDataValue | null>(null);

const SIGNED_OUT_USER: User = { id: '', name: '나' };
const EMPTY_FAMILY_STATE: FamilyState = { familyId: null, family: null, members: [] };

// 구독이 결과를 반영하길 기다리는 최대 시간. 넘기면 기다리지 않고 진행한다.
const SYNC_TIMEOUT_MS = 5000;

// 화면은 repository를 직접 만지지 않고 이 컨텍스트만 쓴다.
export function FamilyDataProvider({
  repository,
  children,
}: {
  repository: RealtimeFamilyRepository;
  children: ReactNode;
}) {
  const { uid } = useAuth();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [familyState, setFamilyState] = useState<FamilyState | null>(null);

  const latestFamilyId = useRef<string | null>(null);
  // 초기화할 때마다 올려서, 그 전에 시작한 읽기가 나중에 도착해도 버리게 한다.
  const generation = useRef(0);
  const syncWaiters = useRef(new Set<() => void>());

  const refresh = useCallback(async () => {
    const started = generation.current;
    const [user, ingredients, calls] = await Promise.all([
      repository.getCurrentUser(),
      repository.listIngredients(),
      repository.listCalls(),
    ]);
    if (started !== generation.current) return;
    setSnapshot({ user, ingredients, calls });
  }, [repository]);

  const resetAll = useCallback(() => {
    generation.current += 1;
    repository.reset();
    latestFamilyId.current = null;
    setFamilyState(EMPTY_FAMILY_STATE);
    setSnapshot({ user: SIGNED_OUT_USER, ingredients: [], calls: [] });
  }, [repository]);

  useEffect(
    () =>
      repository.subscribeFamily((next) => {
        latestFamilyId.current = next.familyId;
        setFamilyState(next);
        syncWaiters.current.forEach((check) => check());
      }),
    [repository],
  );

  // 사용자나 가족이 바뀌면 사용자 정보와 콜을 다시 읽는다.
  const familyId = familyState?.familyId ?? null;
  useEffect(() => {
    refresh();
  }, [refresh, uid, familyId]);

  // 가족을 만들거나 나간 직후 화면이 옛 상태로 한 번 깜빡이지 않도록, 구독이 반영될 때까지 기다린다.
  const waitForFamily = useCallback(
    (done: (familyId: string | null) => boolean) =>
      new Promise<void>((resolve) => {
        if (done(latestFamilyId.current)) return resolve();

        const finish = () => {
          clearTimeout(timer);
          syncWaiters.current.delete(check);
          resolve();
        };
        const check = () => {
          if (done(latestFamilyId.current)) finish();
        };
        const timer = setTimeout(finish, SYNC_TIMEOUT_MS);
        syncWaiters.current.add(check);
      }),
    [],
  );

  const value = useMemo<FamilyDataValue | null>(() => {
    if (!snapshot || !familyState) return null;

    // 변경 뒤에는 다시 읽어 화면과 저장소를 맞춘다.
    const mutate = async (op: () => Promise<unknown>) => {
      await op();
      await refresh();
    };

    return {
      ...snapshot,
      family: familyState.family,
      familyId: familyState.familyId,
      members: familyState.members,
      hasFamily: familyState.familyId !== null,
      getMemberName: (userId, savedName) =>
        familyState.members.find((m) => m.userId === userId)?.name || savedName || '가족',
      createFamily: async (name) => {
        await repository.createFamily(name);
        await waitForFamily((id) => id !== null);
      },
      joinFamily: async (inviteCode) => {
        await repository.joinFamily(inviteCode);
        await waitForFamily((id) => id !== null);
      },
      leaveFamily: async () => {
        await repository.leaveFamily();
        await waitForFamily((id) => id === null);
      },
      addIngredient: (name) => mutate(() => repository.addIngredient(name)),
      removeIngredient: (id) => mutate(() => repository.removeIngredient(id)),
      sendCall: (input) => mutate(() => repository.sendCall(input)),
      respondToCall: (callId, reply) => mutate(() => repository.respondToCall(callId, reply)),
      resetAll,
    };
  }, [snapshot, familyState, repository, refresh, waitForFamily, resetAll]);

  // 첫 로드 전에는 "가족 없음" 화면이 잠깐 비치지 않도록 그리지 않는다.
  if (!value) return null;

  return <FamilyDataContext.Provider value={value}>{children}</FamilyDataContext.Provider>;
}

export function useFamilyData() {
  const ctx = useContext(FamilyDataContext);
  if (!ctx) throw new Error('useFamilyData must be used within FamilyDataProvider');
  return ctx;
}
