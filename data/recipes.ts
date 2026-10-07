// 추천 요리 더미 데이터. 나중에 AI 추천으로 교체한다.

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
