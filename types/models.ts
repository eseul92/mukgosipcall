// 시각은 모두 epoch ms(number)로 다룬다. Firebase 연결 시 Timestamp와 변환한다.

export type MealType = '만들어줘' | '사먹자' | '시켜먹자';

// 콜 메뉴를 고른 경로
export type CallSource = 'recommended' | 'frequent' | 'custom';

// 응답값은 이 고정된 값만 저장한다.
export type Reply = 'cook' | 'eatout' | 'later';

export type MemberRole = 'owner' | 'member';

export interface User {
  id: string;
  name: string;
}

export interface Family {
  id: string;
  name: string;
  inviteCode: string;
  ownerId: string;
  memberCount?: number;
}

export interface Member {
  userId: string;
  familyId: string;
  name: string;
  role: MemberRole;
}

export interface Ingredient {
  id: string;
  name: string;
  addedBy: string;
  createdAt: number;
}

export interface Response {
  userId: string;
  /** 응답 당시 이름. 멤버 목록에서 못 찾을 때(나간 사람)만 쓴다. */
  userName?: string;
  value: Reply;
  createdAt: number;
}

export interface Call {
  id: string;
  familyId: string;
  senderId: string;
  /** 보낼 당시 이름. 멤버 목록에서 못 찾을 때(나간 사람)만 쓴다. */
  senderName?: string;
  menu: string;
  mealType: MealType;
  memo?: string;
  source: CallSource;
  createdAt: number;
  responses: Response[];
}

export interface ShoppingItem {
  id: string;
  name: string;
  addedBy: string;
  done: boolean;
  /** 마지막으로 체크·해제한 사람 */
  doneBy?: string;
  /** 추천 카드에서 담았을 때의 요리 이름 */
  fromMenu?: string;
  createdAt: number;
}

export type ShoppingStatus = 'loading' | 'ready' | 'error';

/** 영수증에서 뽑은 품목. 확인 화면에서 고친 뒤 냉장고 재료로 넣는다. */
export interface ReceiptItem {
  name: string;
  /** 냉장고에 넣을지. 식품이 아니거나 이미 있으면 false로 시작한다 */
  checked: boolean;
  /** 체크를 풀어 둔 이유. 이름 아래에 작게 보여 준다 */
  reason?: string;
}
