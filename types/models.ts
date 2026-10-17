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
