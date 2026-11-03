import {
  RECEIPT_REASON_EXISTS,
  RECEIPT_REASON_NOT_FOOD,
} from '../constants/receipt';
import { SHOPPING_NAME_MAX } from '../constants/shopping';
import { RECEIPT_ALIASES } from '../data/receiptAliases';
import { RECEIPT_NON_FOOD_WORDS, RECEIPT_SKIP_WORDS } from '../data/receiptKeywords';
import type { ReceiptItem } from '../types/models';
import { normalizeShoppingName, shoppingNameKey } from './shopping';
import { charCount, limitChars } from './text';

// 영수증 OCR 결과에서 품목 이름만 뽑는 규칙. 기기 안에서만 돌고 외부 호출이 없다.
// 이 파일의 함수는 모두 순수 함수라서 utils/__tests__/receiptParser.test.ts로 확인한다.

const key = shoppingNameKey;

const SKIP_WORDS = RECEIPT_SKIP_WORDS.map(key);
const NON_FOOD_WORDS = RECEIPT_NON_FOOD_WORDS.map(key);

// 숫자 바로 뒤에 붙는 수량·단위. 긴 것을 먼저 둬야 '개입'이 '개'보다 먼저 맞는다.
const KOREAN_UNITS = ['개입', '인분', '송이', '구', '개', '입', '봉', '팩', '병', '캔', '매', '줄', '단', '포', '장', '마리', '통', '망', '판', '알'];
// 영문 단위는 뒤에 글자가 이어지지 않을 때만 지운다(예: 1L은 지우고 단어 중간은 남긴다).
const LATIN_UNITS = ['kg', 'mg', 'ml', 'g', 'l', 'ea', 'p', 'box'];

// 단위 뒤에 한글이 이어지면 이름의 일부로 본다(예: '3 구운김'의 '구'는 지우지 않는다).
const KOREAN_UNIT_RE = new RegExp(
  `\\d+(?:[.,]\\d+)?\\s*(?:${KOREAN_UNITS.join('|')})(?![가-힣])`,
  'g',
);
const LATIN_UNIT_RE = new RegExp(`\\d+(?:[.,]\\d+)?\\s*(?:${LATIN_UNITS.join('|')})(?![a-z])`, 'gi');
// 괄호와 그 안의 내용: (300g), [행사], {대}
const BRACKETS_RE = /\([^)]*\)|\[[^\]]*\]|\{[^}]*\}|<[^>]*>/g;
// 바코드·상품 코드로 보이는 6자리 이상 숫자열
const CODE_RE = /\d{6,}/g;
// 1+1, 2+1 같은 행사 표기
const BUNDLE_RE = /\d+\s*\+\s*\d+/g;
// 2x, x3, *2 같은 수량 표기
const TIMES_RE = /(?:[x×*]\s*\d+|\d+\s*[x×*])(?![a-z])/gi;
// 가격: 1,000 / 12,500원 / -3,000 / ₩5000 / 5000원
const PRICE_RE = /[-₩\\]?\s*\d{1,3}(?:,\d{3})+\s*원?|\d+\s*원/g;
// 남은 기호는 띄어쓰기로 바꾼다. 괄호 닫기(')')는 브랜드 접두사를 떼어 낸 뒤에 지운다.
const SYMBOL_RE = /[*#☆★※•·:;/\\|_~=+\-'"!?@$%^&.,₩()[\]{}<>]/g;
// '풀)두부', 'CJ)햇반'처럼 이름 앞에 붙은 짧은 브랜드 접두사
const PREFIX_RE = /^[가-힣a-z]{1,4}\)\s*/i;
// 글자(한글·영문 등)가 하나도 없으면 숫자와 기호뿐인 줄이다.
const HAS_LETTER_RE = /\p{L}/u;
// 줄 앞의 번호(01, 1., 2)와 기호. 숫자 바로 뒤에 글자가 오면(3분카레) 이름으로 본다.
const LEADING_RE = /^(?:[\s*#\-.]|\d+(?=[\s.)]))+/;
const TRAILING_RE = /[\s*#\-.]+$/;

// 별칭은 기호까지 지운 키로 찾는다. '풀)두부'와 '풀 두부'가 같은 키가 된다.
const aliasKey = (text: string) => key(text.replace(SYMBOL_RE, ''));
const ALIASES = new Map(
  Object.entries(RECEIPT_ALIASES).map(([from, to]) => [aliasKey(from), to]),
);

const spaces = (text: string) => text.replace(/\s+/g, ' ').trim();

/** 합계, 결제, 가게 정보처럼 품목이 아닌 줄이면 true */
export function isSkippedReceiptLine(line: string): boolean {
  const lineKey = key(line);
  return SKIP_WORDS.some((word) => lineKey.includes(word));
}

/**
 * 한 줄에서 가격, 수량, 단위, 상품 코드, 괄호 내용, 기호를 지우고 품목 이름만 남긴다.
 * 별칭 표로 일반 이름으로 바꾸고 20자로 자른다. 남은 이름이 없으면 빈 문자열.
 */
export function cleanReceiptName(line: string): string {
  let text = line
    .replace(BRACKETS_RE, ' ')
    .replace(CODE_RE, ' ')
    .replace(BUNDLE_RE, ' ')
    .replace(KOREAN_UNIT_RE, ' ')
    .replace(LATIN_UNIT_RE, ' ')
    .replace(TIMES_RE, ' ')
    .replace(PRICE_RE, ' ');

  // 줄 앞뒤의 번호·기호(예: '01 ', '* ')를 걷어 낸 뒤 접두사를 본다.
  text = spaces(text.replace(LEADING_RE, '').replace(TRAILING_RE, ''));

  const withPrefix = ALIASES.get(aliasKey(text));
  if (withPrefix) return limitChars(withPrefix, SHOPPING_NAME_MAX);

  text = text.replace(PREFIX_RE, '');
  // 기호를 지운 뒤 숫자만 남은 낱말(남은 수량·가격 조각)을 버린다.
  text = spaces(
    text
      .replace(SYMBOL_RE, ' ')
      .split(' ')
      .filter((word) => HAS_LETTER_RE.test(word))
      .join(' '),
  );

  const name = ALIASES.get(aliasKey(text)) ?? text;
  return normalizeShoppingName(limitChars(name, SHOPPING_NAME_MAX));
}

/** 식품이 아닌 낱말이 들어 있으면 true */
export function isNonFoodName(name: string): boolean {
  const nameKey = key(name);
  return NON_FOOD_WORDS.some((word) => nameKey.includes(word));
}

/**
 * 이름에 대해 체크를 풀어 둘 이유를 돌려준다. 문제가 없으면 undefined.
 * 냉장고에 이미 있는지 먼저 보고, 그다음 식품이 아닌지 본다.
 */
export function receiptNameReason(name: string, existingNames: string[]): string | undefined {
  const nameKey = key(name);
  if (existingNames.some((existing) => key(existing) === nameKey)) return RECEIPT_REASON_EXISTS;
  if (isNonFoodName(name)) return RECEIPT_REASON_NOT_FOOD;
  return undefined;
}

/**
 * OCR 결과(줄 목록)에서 품목만 뽑는다.
 * - 합계·결제·가게 정보 줄은 버린다.
 * - 가격, 수량, 단위, 상품 코드는 지우고 별칭 표로 일반 이름으로 바꾼다.
 * - 1글자 이하이거나 숫자·기호뿐이면 버린다. 이름은 20자까지.
 * - 같은 영수증 안에서 같은 이름(공백 제거·소문자)은 하나로 합친다.
 * - 냉장고에 이미 있거나 식품이 아닌 것 같으면 checked를 false로 두고 reason을 단다.
 *
 * @param lines OCR이 읽은 줄. 한 원소 안에 줄바꿈이 있어도 나눠서 본다.
 * @param existingNames 지금 냉장고에 있는 재료 이름
 */
export function parseReceiptLines(lines: string[], existingNames: string[] = []): ReceiptItem[] {
  const items: ReceiptItem[] = [];
  const seen = new Set<string>();

  for (const line of lines.flatMap((text) => text.split(/\r?\n/))) {
    if (!line.trim() || isSkippedReceiptLine(line)) continue;

    const name = cleanReceiptName(line);
    if (charCount(name.replace(/\s/g, '')) <= 1 || !HAS_LETTER_RE.test(name)) continue;

    const nameKey = key(name);
    if (seen.has(nameKey)) continue;
    seen.add(nameKey);

    const reason = receiptNameReason(name, existingNames);
    items.push(reason ? { name, checked: false, reason } : { name, checked: true });
  }
  return items;
}
