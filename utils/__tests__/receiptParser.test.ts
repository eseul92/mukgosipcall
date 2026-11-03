import { describe, expect, it } from '@jest/globals';
import {
  RECEIPT_REASON_EXISTS,
  RECEIPT_REASON_NOT_FOOD,
} from '../../constants/receipt';
import { cleanReceiptName, parseReceiptLines } from '../receiptParser';

const names = (lines: string[], existing: string[] = []) =>
  parseReceiptLines(lines, existing).map((item) => item.name);

describe('parseReceiptLines', () => {
  it('합계·결제·가게 정보 줄은 버린다', () => {
    expect(
      names([
        '[영수증] 행복마트 성수점',
        '사업자번호 123-45-67890',
        '전화 02-123-4567',
        '판매일시 2026-11-03 14:22',
        '합 계 15,800',
        '부가세 1,436',
        '면세물품가액 8,000',
        '신한카드 승인 12345678',
        '적립 포인트 158',
      ]),
    ).toEqual([]);
  });

  it('가격, 수량, 단위, 상품 코드를 지우고 품목명만 남긴다', () => {
    expect(
      names([
        '8801234567890 대파 1단 2,980',
        '양파 1.5kg 4,500',
        '01 우유 900ml 2 5,600',
        '* 콩나물 300g 1,200',
        '사과 (봉) 1+1 9,900',
        '3분카레 1,500',
      ]),
    ).toEqual(['대파', '양파', '우유', '콩나물', '사과', '3분카레']);
  });

  it('별칭 표로 일반 이름으로 바꾼다', () => {
    expect(names(['신선계란 30구 6,980', '풀)두부 1,500', '깐마늘 200g 3,000'])).toEqual([
      '계란',
      '두부',
      '마늘',
    ]);
  });

  it('표에 없는 브랜드 접두사는 떼어 낸다', () => {
    expect(cleanReceiptName('CJ)비비고만두 6,980')).toBe('비비고만두');
  });

  it('같은 영수증 안에서 같은 이름은 하나로 합친다', () => {
    expect(names(['두부 1,500', '두 부 1,500', '풀)두부 1,800'])).toEqual(['두부']);
  });

  it('식품이 아니면 체크를 풀고 이유를 단다', () => {
    expect(parseReceiptLines(['종량제봉투 20L 1,000', '주방세제 3,500', '애호박 1,500'])).toEqual([
      { name: '종량제봉투', checked: false, reason: RECEIPT_REASON_NOT_FOOD },
      { name: '주방세제', checked: false, reason: RECEIPT_REASON_NOT_FOOD },
      { name: '애호박', checked: true },
    ]);
  });

  it('냉장고에 이미 있으면 체크를 풀고 이유를 단다(공백·대소문자 무시)', () => {
    expect(parseReceiptLines(['신선계란 30구 6,980', 'Spam 클래식 3,200'], ['계 란', 'spam클래식'])).toEqual([
      { name: '계란', checked: false, reason: RECEIPT_REASON_EXISTS },
      { name: 'Spam 클래식', checked: false, reason: RECEIPT_REASON_EXISTS },
    ]);
  });

  it('1글자 이하이거나 숫자·기호뿐인 줄은 버린다', () => {
    expect(names(['무 1,000', '2,500', '----------', '***', '12 34 56', ''])).toEqual([]);
  });

  it('공백을 정리하고 20자를 넘으면 자른다', () => {
    const [item] = parseReceiptLines(['  국산   통밀   식빵  2,800']);
    expect(item.name).toBe('국산 통밀 식빵');

    const [long] = parseReceiptLines(['아주아주긴이름의프리미엄유기농샐러드채소모음 9,900']);
    expect(Array.from(long.name)).toHaveLength(20);
  });

  it('한 원소 안의 줄바꿈도 나눠서 본다', () => {
    expect(names(['감자 1봉 3,980\n합계 3,980\n당근 2개 2,000'])).toEqual(['감자', '당근']);
  });
});
