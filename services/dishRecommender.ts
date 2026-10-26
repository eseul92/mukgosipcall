import { localDishRecommender } from './localDishRecommender';

// 서버의 AI 추천 함수(recommendDishes)와 같은 형식이다.
export type RecommendedDish = {
  name: string;
  description: string;
  /** 부족한 재료. 최대 3개, 기본 양념 제외 */
  missing: string[];
};

export type RecommendResult = { dishes: RecommendedDish[] };

export interface DishRecommender {
  /** 재료 이름으로 만들 수 있는 요리를 추천한다. 겹치는 재료가 없으면 dishes가 빈 배열 */
  recommend(ingredients: string[]): Promise<RecommendResult>;
}

// 서버 함수로 바꿀 때는 이 구현만 교체한다.
export const dishRecommender: DishRecommender = localDishRecommender;
