import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { FamilyRepository, SendCallInput } from '../repositories';
import type { Call, Family, Ingredient, Member, Reply, User } from '../types/models';

type Snapshot = {
  user: User;
  family: Family | null;
  members: Member[];
  ingredients: Ingredient[];
  calls: Call[];
};

type FamilyDataValue = Snapshot & {
  hasFamily: boolean;
  getMemberName: (userId: string) => string;
  createFamily: (name: string) => Promise<void>;
  joinFamily: (inviteCode: string) => Promise<void>;
  leaveFamily: () => Promise<void>;
  addIngredient: (name: string) => Promise<void>;
  removeIngredient: (ingredientId: string) => Promise<void>;
  sendCall: (input: SendCallInput) => Promise<void>;
  respondToCall: (callId: string, value: Reply) => Promise<void>;
};

const FamilyDataContext = createContext<FamilyDataValue | null>(null);

// 화면은 repository를 직접 만지지 않고 이 컨텍스트만 쓴다.
export function FamilyDataProvider({
  repository,
  children,
}: {
  repository: FamilyRepository;
  children: ReactNode;
}) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);

  const refresh = useCallback(async () => {
    const [user, family, members, ingredients, calls] = await Promise.all([
      repository.getCurrentUser(),
      repository.getFamily(),
      repository.listMembers(),
      repository.listIngredients(),
      repository.listCalls(),
    ]);
    setSnapshot({ user, family, members, ingredients, calls });
  }, [repository]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo<FamilyDataValue | null>(() => {
    if (!snapshot) return null;

    // 변경 뒤에는 항상 다시 읽어 화면과 저장소를 맞춘다.
    const mutate = async (op: () => Promise<unknown>) => {
      await op();
      await refresh();
    };

    return {
      ...snapshot,
      hasFamily: snapshot.family !== null,
      getMemberName: (userId) =>
        snapshot.members.find((m) => m.userId === userId)?.name ?? '알 수 없음',
      createFamily: (name) => mutate(() => repository.createFamily(name)),
      joinFamily: (inviteCode) => mutate(() => repository.joinFamily(inviteCode)),
      leaveFamily: () => mutate(() => repository.leaveFamily()),
      addIngredient: (name) => mutate(() => repository.addIngredient(name)),
      removeIngredient: (id) => mutate(() => repository.removeIngredient(id)),
      sendCall: (input) => mutate(() => repository.sendCall(input)),
      respondToCall: (callId, reply) => mutate(() => repository.respondToCall(callId, reply)),
    };
  }, [snapshot, repository, refresh]);

  // 첫 로드 전에는 "가족 없음" 화면이 잠깐 비치지 않도록 그리지 않는다.
  if (!value) return null;

  return <FamilyDataContext.Provider value={value}>{children}</FamilyDataContext.Provider>;
}

export function useFamilyData() {
  const ctx = useContext(FamilyDataContext);
  if (!ctx) throw new Error('useFamilyData must be used within FamilyDataProvider');
  return ctx;
}
