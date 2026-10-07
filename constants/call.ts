import type { MealType, Reply } from '../types/models';

export const MEAL_TYPES: MealType[] = ['만들어줘', '사먹자', '시켜먹자'];

export const REPLIES: Reply[] = ['cook', 'eatout', 'later'];

export const REPLY_LABELS: Record<Reply, string> = {
  cook: '내가 만들게요',
  eatout: '사 먹자',
  later: '다음에',
};

export const MEMO_PRESETS = ['오늘 저녁', '주말에', '매운 걸로', '간단하게'];

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
