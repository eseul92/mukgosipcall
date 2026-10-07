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

// 화면은 이 인터페이스(를 감싼 FamilyDataContext)만 쓴다.
// 현재 사용자와 현재 가족은 구현체가 알고 있다.
export interface FamilyRepository {
  getCurrentUser(): Promise<User>;
  /** 속한 가족이 없으면 null */
  getFamily(): Promise<Family | null>;
  listMembers(): Promise<Member[]>;
  listIngredients(): Promise<Ingredient[]>;
  /** 최신순. 가족이 없으면 빈 배열 */
  listCalls(): Promise<Call[]>;

  createFamily(name: string): Promise<Family>;
  /** 초대 코드가 올바르지 않으면 reject */
  joinFamily(inviteCode: string): Promise<Family>;
  leaveFamily(): Promise<void>;

  addIngredient(name: string): Promise<Ingredient>;
  removeIngredient(ingredientId: string): Promise<void>;

  /** 가족이 없으면 reject */
  sendCall(input: SendCallInput): Promise<Call>;
  /** 같은 사용자가 다시 응답하면 이전 응답을 바꾼다 */
  respondToCall(callId: string, value: Reply): Promise<Call>;
}
