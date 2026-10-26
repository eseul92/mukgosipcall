import { useEffect, useMemo, useState } from 'react';
import { dishRecommender, type RecommendedDish } from '../services/dishRecommender';

// 재료 이름으로 요리를 추천받는다. 계산 중이면 null, 재료가 비어 있으면 빈 배열.
export default function useDishRecommendations(ingredientNames: string[]) {
  const [dishes, setDishes] = useState<RecommendedDish[] | null>(null);

  // 배열은 렌더마다 새로 만들어지므로 내용이 바뀔 때만 다시 추천한다.
  const key = ingredientNames.join('\n');
  const names = useMemo(() => (key ? key.split('\n') : []), [key]);

  useEffect(() => {
    if (names.length === 0) {
      setDishes([]);
      return;
    }

    let cancelled = false;
    setDishes(null);
    dishRecommender
      .recommend(names)
      .then((result) => {
        if (!cancelled) setDishes(result.dishes);
      })
      .catch((e) => {
        console.warn('요리를 추천하지 못했어요', e);
        if (!cancelled) setDishes([]);
      });
    return () => {
      cancelled = true;
    };
  }, [names]);

  return dishes;
}
