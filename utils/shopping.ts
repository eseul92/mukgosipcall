import {
  SHOPPING_EMPTY_NAME_MESSAGE,
  SHOPPING_NAME_MAX,
  SHOPPING_TOO_LONG_MESSAGE,
} from '../constants/shopping';
import type { ShoppingItem } from '../types/models';
import { charCount } from './text';

/** 앞뒤 공백을 지우고 연속 공백을 하나로 줄인다. */
export const normalizeShoppingName = (name: string) => name.trim().replace(/\s+/g, ' ');

/** 같은 이름인지 비교하는 키. 공백을 모두 없애고 소문자로 맞춘다. */
export const shoppingNameKey = (name: string) => name.replace(/\s+/g, '').toLowerCase();

/** 정리된 이름이 1~20자인지 확인한다. 문제가 있으면 보여 줄 문장을 돌려준다. */
export function validateShoppingName(name: string): string | null {
  const length = charCount(name);
  if (length < 1) return SHOPPING_EMPTY_NAME_MESSAGE;
  if (length > SHOPPING_NAME_MAX) return SHOPPING_TOO_LONG_MESSAGE;
  return null;
}

/**
 * 담으려는 이름 중 목록(done이 false인 항목)에 없는 것만 고른다.
 * 담으려는 이름끼리 겹쳐도 한 번만 담는다. 규칙에 맞지 않는 이름은 skipped로 센다.
 */
export function planShoppingAdditions(items: ShoppingItem[], names: string[]) {
  const seen = new Set(items.filter((item) => !item.done).map((item) => shoppingNameKey(item.name)));
  const toAdd: string[] = [];
  let skipped = 0;

  for (const raw of names) {
    const name = normalizeShoppingName(raw);
    const key = shoppingNameKey(name);
    if (validateShoppingName(name) || seen.has(key)) {
      skipped += 1;
      continue;
    }
    seen.add(key);
    toAdd.push(name);
  }
  return { toAdd, skipped };
}
