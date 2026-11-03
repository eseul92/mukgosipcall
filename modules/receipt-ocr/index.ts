import { requireOptionalNativeModule } from 'expo';

// 영수증 OCR 로컬 모듈(Android 전용). 코드는 android/src/main/java/expo/modules/receiptocr/.
type ReceiptOcrModule = {
  /** 사진 한 장(file:// 또는 content:// URI)을 기기 안에서 읽어 줄 목록을 돌려준다. */
  recognizeLines(uri: string): Promise<string[]>;
};

// 모듈이 들어 있지 않은 빌드(웹, 모듈을 넣기 전의 개발 빌드)에서는 null이다.
// 앱 시작 때 죽지 않고, 인식할 때만 실패하도록 선택적으로 불러온다.
export default requireOptionalNativeModule<ReceiptOcrModule>('ReceiptOcr');
