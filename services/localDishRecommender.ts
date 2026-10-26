import { INGREDIENT_ALIASES } from '../data/ingredientAliases';
import { RECIPES } from '../data/recipes';
import type { DishRecommender } from './dishRecommender';

const MAX_DISHES = 3;
const MAX_MISSING = 3;

// 공백을 없애고 소문자로 바꿔 비교한다.
const normalize = (name: string) => name.replace(/\s+/g, '').toLowerCase();

// 별칭을 묶음의 대표 이름으로 바꾸는 표
const CANONICAL = new Map<string, string>();
for (const group of INGREDIENT_ALIASES) {
  const key = normalize(group[0]);
  for (const name of group) CANONICAL.set(normalize(name), key);
}

const canonicalOf = (name: string) => {
  const normalized = normalize(name);
  return CANONICAL.get(normalized) ?? normalized;
};

// 레시피 핵심 재료 중 겹치는 비율이 높은 순으로 최대 3개를 고른다.
// 비율이 같으면 겹치는 재료가 많은 것, 그다음은 레시피에 적힌 순서.
export const localDishRecommender: DishRecommender = {
  async recommend(ingredients) {
    const owned = new Set(ingredients.map(canonicalOf).filter((name) => name !== ''));

    const scored = RECIPES.map((recipe, order) => {
      const missing = recipe.ingredients.filter((item) => !owned.has(canonicalOf(item)));
      const matched = recipe.ingredients.length - missing.length;
      return { recipe, missing, matched, ratio: matched / recipe.ingredients.length, order };
    })
      .filter((item) => item.matched >= 1)
      .sort((a, b) => b.ratio - a.ratio || b.matched - a.matched || a.order - b.order);

    return {
      dishes: scored.slice(0, MAX_DISHES).map(({ recipe, missing }) => ({
        name: recipe.name,
        description: recipe.description,
        missing: missing.slice(0, MAX_MISSING),
      })),
    };
  },
};
