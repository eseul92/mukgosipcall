import type {
  Call,
  CallSource,
  Family,
  Ingredient,
  MealType,
  Member,
  Reply,
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
}
