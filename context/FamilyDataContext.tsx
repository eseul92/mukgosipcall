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
import type {
  Call,
  Family,
  Ingredient,
  Member,
  Reply,
  ShoppingItem,
  ShoppingStatus,
  User,
} from '../types/models';
import { SHOPPING_DUPLICATE_MESSAGE } from '../constants/shopping';
import {
  normalizeShoppingName,
  planShoppingAdditions,
  shoppingNameKey,
  validateShoppingName,
} from '../utils/shopping';
import { useAuth } from './AuthContext';

// 가족 상태, 콜, 장보기, 가족의 재료는 구독으로 오고, 사용자와 가족 없는 사용자의 재료는 변경 뒤에 다시 읽는다.
type Snapshot = {
  user: User;
  ingredients: Ingredient[];
};

type FamilyDataValue = Snapshot & {
  /** 최신순 */
  calls: Call[];
  family: Family | null;
  /** users/{uid}.familyId. 가족이 없으면 null */
  familyId: string | null;
  members: Member[];
  /** 만든 순서(오래된 것부터) */
  shoppingItems: ShoppingItem[];
  shoppingStatus: ShoppingStatus;
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
  /**
   * 장보기에 담는다. 이름이 규칙에 맞지 않거나 목록에 이미 있으면 저장하지 않고
   * 보여 줄 문장을 돌려준다. 저장되면 null. 저장에 실패하면 reject.
   */
  addShoppingItem: (name: string, fromMenu?: string) => Promise<string | null>;
  /** 이미 목록에 있거나 규칙에 맞지 않는 이름은 건너뛴다. */
  addShoppingItems: (
    names: string[],
    fromMenu: string,
  ) => Promise<{ added: number; skipped: number }>;
  setShoppingItemDone: (itemId: string, done: boolean) => Promise<void>;
  removeShoppingItem: (itemId: string) => Promise<void>;
  /** 산 것(done) 항목을 모두 지운다. */
  clearDoneShoppingItems: () => Promise<void>;
  /** 냉장고 재료로 옮긴다. 새로 더한 재료 수를 돌려준다. */
  moveShoppingItemsToFridge: (itemIds: string[]) => Promise<number>;
  /** 로그아웃할 때 사용자, 가족, 콜, 재료 상태를 모두 비운다. */
  resetAll: () => void;
};

const FamilyDataContext = createContext<FamilyDataValue | null>(null);

const SIGNED_OUT_USER: User = { id: '', name: '나' };
const EMPTY_FAMILY_STATE: FamilyState = {
  familyId: null,
  family: null,
  members: [],
  calls: [],
  ingredients: [],
  shoppingItems: [],
  shoppingStatus: 'ready',
};

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
    const [user, ingredients] = await Promise.all([
      repository.getCurrentUser(),
      repository.listIngredients(),
    ]);
    if (started !== generation.current) return;
    setSnapshot({ user, ingredients });
  }, [repository]);

  const resetAll = useCallback(() => {
    generation.current += 1;
    repository.reset();
    latestFamilyId.current = null;
    setFamilyState(EMPTY_FAMILY_STATE);
    setSnapshot({ user: SIGNED_OUT_USER, ingredients: [] });
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

  // 사용자나 가족이 바뀌면 사용자 정보와 재료를 다시 읽는다.
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
      // 가족이 있으면 구독한 재료, 없으면(게스트 포함) 메모리 재료
      ingredients: familyState.familyId ? familyState.ingredients : snapshot.ingredients,
      calls: familyState.calls,
      family: familyState.family,
      familyId: familyState.familyId,
      members: familyState.members,
      shoppingItems: familyState.shoppingItems,
      shoppingStatus: familyState.shoppingStatus,
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
      addIngredient: async (rawName) => {
        const name = normalizeShoppingName(rawName);
        if (!name) return;
        // 가족의 재료는 같은 이름(공백 제거·소문자)이 있으면 다시 넣지 않는다.
        const key = shoppingNameKey(name);
        if (
          familyState.familyId &&
          familyState.ingredients.some((item) => shoppingNameKey(item.name) === key)
        ) {
          return;
        }
        await mutate(() => repository.addIngredient(name));
      },
      removeIngredient: (id) => mutate(() => repository.removeIngredient(id)),
      // 콜 목록은 구독이 갱신하므로 다시 읽지 않는다.
      sendCall: async (input) => {
        await repository.sendCall(input);
      },
      respondToCall: async (callId, reply) => {
        await repository.respondToCall(callId, reply);
      },
      // 장보기 목록도 구독이 갱신하므로 다시 읽지 않는다.
      addShoppingItem: async (rawName, fromMenu) => {
        const name = normalizeShoppingName(rawName);
        const invalid = validateShoppingName(name);
        if (invalid) return invalid;
        if (planShoppingAdditions(familyState.shoppingItems, [name]).toAdd.length === 0) {
          return SHOPPING_DUPLICATE_MESSAGE;
        }
        await repository.addShoppingItems([{ name, ...(fromMenu ? { fromMenu } : {}) }]);
        return null;
      },
      addShoppingItems: async (names, fromMenu) => {
        const { toAdd, skipped } = planShoppingAdditions(familyState.shoppingItems, names);
        await repository.addShoppingItems(toAdd.map((name) => ({ name, fromMenu })));
        return { added: toAdd.length, skipped };
      },
      setShoppingItemDone: (itemId, done) => repository.setShoppingItemDone(itemId, done),
      removeShoppingItem: (itemId) => repository.removeShoppingItems([itemId]),
      clearDoneShoppingItems: () =>
        repository.removeShoppingItems(
          familyState.shoppingItems.filter((item) => item.done).map((item) => item.id),
        ),
      moveShoppingItemsToFridge: (itemIds) => {
        const wanted = new Set(itemIds);
        return repository.moveShoppingItemsToFridge(
          familyState.shoppingItems
            .filter((item) => wanted.has(item.id))
            .map(({ id, name }) => ({ id, name })),
        );
      },
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
