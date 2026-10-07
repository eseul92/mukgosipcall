// Firebase 연결 전까지 쓰는 더미 데이터

export const INITIAL_INGREDIENTS = ['계란', '김치', '대파', '밥', '두부'];

export type CallSource = 'recommended' | 'frequent' | 'custom';

export const MEAL_TYPES = ['만들어줘', '사먹자', '시켜먹자'] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export const ME = '나';

// 응답값은 이 고정된 키만 저장한다.
export const REPLY_LABELS = {
  cook: '내가 만들게요',
  eatout: '사 먹자',
  later: '다음에',
} as const;
export type Reply = keyof typeof REPLY_LABELS;

export type CallResponse = {
  by: string;
  value: Reply;
};

export const MEMO_PRESETS = ['오늘 저녁', '주말에', '매운 걸로', '간단하게'];

export type RecentCall = {
  id: string;
  sender: string;
  message: string;
  time: string;
  menu: string;
  mealType: MealType;
  memo?: string;
  // 내가 보낸 콜에만 있는 값
  source?: CallSource;
  responses?: CallResponse[];
};

export const FREQUENT_MENUS = [
  '김치찌개',
  '된장찌개',
  '떡볶이',
  '삼겹살',
  '치킨',
  '비빔밥',
  '라면',
  '제육볶음',
  '순두부찌개',
  '부대찌개',
];

export const RECENT_CALLS: RecentCall[] = [
  {
    id: '1',
    sender: '엄마',
    message: '김치찌개 만들어줘',
    time: '10분 전',
    menu: '김치찌개',
    mealType: '만들어줘',
    memo: '오늘 저녁',
  },
  {
    id: '2',
    sender: '아빠',
    message: '라면 시켜먹자',
    time: '1시간 전',
    menu: '라면',
    mealType: '시켜먹자',
    memo: '매운 걸로',
  },
  {
    id: '3',
    sender: '동생',
    message: '계란말이 만들어줘',
    time: '어제',
    menu: '계란말이',
    mealType: '만들어줘',
    responses: [{ by: '엄마', value: 'cook' }],
  },
];

export type Recipe = {
  id: string;
  name: string;
  description: string;
  time: string;
  ingredients: string[];
};

export const RECIPES: Recipe[] = [
  {
    id: '1',
    name: '김치볶음밥',
    description: '김치와 대파를 볶다가 밥을 넣고 계란 프라이를 올려요.',
    time: '15분',
    ingredients: ['김치', '밥', '대파', '계란'],
  },
  {
    id: '2',
    name: '두부김치',
    description: '볶은 김치를 따끈한 두부와 함께 곁들여요.',
    time: '20분',
    ingredients: ['두부', '김치', '대파'],
  },
  {
    id: '3',
    name: '계란찜',
    description: '대파를 송송 썰어 넣고 부드럽게 쪄요.',
    time: '10분',
    ingredients: ['계란', '대파'],
  },
];
