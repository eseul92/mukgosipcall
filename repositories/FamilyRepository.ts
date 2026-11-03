import type {
  Call,
  CallSource,
  Family,
  Ingredient,
  MealType,
  Member,
  Reply,
  ShoppingItem,
  ShoppingStatus,
  User,
} from '../types/models';

export type SendCallInput = {
  menu: string;
  mealType: MealType;
  memo?: string;
  source: CallSource;
};

/** 가족 관련 실시간 상태. 가족 정보는 구독으로만 읽는다. */
export type FamilyState = {
  /** users/{uid}.familyId. 가족이 없으면 null */
  familyId: string | null;
  /** 가족이 없거나 아직 읽는 중이면 null */
  family: Family | null;
  /** 합류한 순서 */
  members: Member[];
  /** 최신순. 가족이 없으면 빈 배열 */
  calls: Call[];
  /** 만든 순서(오래된 것부터). 가족이 없으면 빈 배열 */
  ingredients: Ingredient[];
  /** 만든 순서(오래된 것부터). 가족이 없으면 빈 배열 */
  shoppingItems: ShoppingItem[];
  /** 첫 목록을 받기 전 loading, 구독이 실패하면 error */
  shoppingStatus: ShoppingStatus;
};

export type NewShoppingItem = {
  /** 이미 정리·검증된 이름 */
  name: string;
  fromMenu?: string;
};

// 화면은 이 인터페이스(를 감싼 FamilyDataContext)만 쓴다.
// 현재 사용자와 현재 가족은 구현체가 알고 있다.
export interface FamilyRepository {
  getCurrentUser(): Promise<User>;
  listIngredients(): Promise<Ingredient[]>;

  // 화면은 결과값을 쓰지 않는다. 가족 상태는 subscribeFamily로 갱신된다.
  /** 실패하면 사용자에게 보여줄 문장을 message로 담아 reject */
  createFamily(name: string): Promise<unknown>;
  /** 실패하면 사용자에게 보여줄 문장을 message로 담아 reject */
  joinFamily(inviteCode: string): Promise<unknown>;
  /** 실패하면 사용자에게 보여줄 문장을 message로 담아 reject */
  leaveFamily(): Promise<void>;

  addIngredient(name: string): Promise<Ingredient>;
  /**
   * 이미 정리·검증된 이름들을 한 번에 더한다(영수증 스캔). 최대 RECEIPT_MAX_SAVE개.
   * 가족이 있으면 한 번의 writeBatch라서 전부 저장되거나 전부 실패한다.
   */
  addIngredients(names: string[]): Promise<void>;
  removeIngredient(ingredientId: string): Promise<void>;

  // 화면은 결과값을 쓰지 않는다. 콜 목록은 subscribeFamily로 갱신된다.
  /** 가족이 없으면 reject */
  sendCall(input: SendCallInput): Promise<unknown>;
  /** 같은 사용자가 다시 응답하면 이전 응답을 바꾼다 */
  respondToCall(callId: string, value: Reply): Promise<unknown>;
}

/** 가족 상태를 실시간으로 구독할 수 있는 저장소 */
export interface RealtimeFamilyRepository extends FamilyRepository {
  /**
   * 로그인한 사용자의 가족 상태를 구독한다. 로그아웃하거나 사용자가 바뀌면
   * 이전 사용자의 구독을 해제하고 새 상태를 보낸다. 반환값으로 구독을 해제한다.
   */
  subscribeFamily(listener: (state: FamilyState) => void): () => void;
  /** 로그아웃할 때 이전 사용자의 가족, 콜, 재료 상태를 모두 버린다. */
  reset(): void;

  // 장보기는 Firestore에만 있다. 목록은 subscribeFamily로 갱신되고, 실패하면 reject한다.
  /** 한 번에 쓰므로 전부 저장되거나 전부 실패한다. */
  addShoppingItems(items: NewShoppingItem[]): Promise<void>;
  /** done과 doneBy(현재 사용자)만 바꾼다. */
  setShoppingItemDone(itemId: string, done: boolean): Promise<void>;
  removeShoppingItems(itemIds: string[]): Promise<void>;
  /**
   * 냉장고 재료로 옮기고 장보기 항목을 지운다. 같은 이름의 재료가 이미 있으면
   * 재료는 더하지 않고 항목만 지운다. 돌려주는 값은 새로 더한 재료 수.
   */
  moveShoppingItemsToFridge(items: { id: string; name: string }[]): Promise<number>;
}
