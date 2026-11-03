import type { ReceiptItem } from '../types/models';
import { parseReceiptLines } from '../utils/receiptParser';

export interface ReceiptParser {
  /**
   * 영수증 OCR 줄에서 냉장고에 넣을 품목을 뽑는다.
   * @param lines OCR이 읽은 줄(원문). 로그나 서버로 보내지 않는다.
   * @param existingNames 지금 냉장고에 있는 재료 이름. 같은 이름은 checked: false, reason '이미 있어요'
   */
  parse(lines: string[], existingNames: string[]): Promise<ReceiptItem[]>;
}

// 지금은 기기 안의 규칙(utils/receiptParser.ts)으로 뽑는다.
const localReceiptParser: ReceiptParser = {
  async parse(lines, existingNames) {
    return parseReceiptLines(lines, existingNames);
  },
};

// AI로 바꿀 때는 이 구현만 교체한다(반환 형식이 같아야 한다).
// 원문을 서버로 보내게 되므로 그때는 개인정보 안내와 CLAUDE.md도 함께 고친다.
export const receiptParser: ReceiptParser = localReceiptParser;
