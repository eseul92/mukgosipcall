/** 한 번에 고를 수 있는 영수증 사진 수 */
export const RECEIPT_MAX_PHOTOS = 3;
/** 한 번에 냉장고에 넣을 수 있는 품목 수 */
export const RECEIPT_MAX_SAVE = 100;

export const RECEIPT_REASON_NOT_FOOD = '식품이 아닌 것 같아요';
export const RECEIPT_REASON_EXISTS = '이미 있어요';

export const RECEIPT_NO_ITEMS_MESSAGE =
  '영수증에서 품목을 찾지 못했어요. 더 밝은 곳에서 다시 찍거나 직접 추가해 주세요';
export const RECEIPT_OCR_FAILED_MESSAGE = '영수증을 읽지 못했어요. 다시 찍거나 다른 사진을 골라 주세요';
export const RECEIPT_PICK_FAILED_MESSAGE = '사진을 가져오지 못했어요. 다시 시도해 주세요';
export const RECEIPT_SAVE_FAILED_MESSAGE = '냉장고에 넣지 못했어요. 잠시 후 다시 시도해 주세요';
export const RECEIPT_TOO_MANY_MESSAGE = `한 번에 ${RECEIPT_MAX_SAVE}개까지 넣을 수 있어요`;
export const RECEIPT_DUPLICATE_MESSAGE = '이미 목록에 있어요';
export const RECEIPT_EMPTY_NAME_MESSAGE = '품목 이름을 입력해 주세요';
export const RECEIPT_CAMERA_DENIED_MESSAGE =
  '카메라 권한이 꺼져 있어요. 설정에서 켜거나 앨범에서 골라 주세요';
