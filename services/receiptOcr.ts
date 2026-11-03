import { File, Paths } from 'expo-file-system';
import ReceiptOcr from '../modules/receipt-ocr';

// 영수증 사진을 기기 안(ML Kit 한국어 모델, 로컬 모듈 modules/receipt-ocr)에서 읽는다.
// 사진과 원문은 어디에도 보내거나 저장하지 않는다. 로그에는 사진 경로나 인식된 글자를 남기지 않는다.

/** 사진들을 읽어 줄 목록으로 돌려준다. 사진 순서대로 이어 붙인다. */
export async function recognizeReceiptLines(uris: string[]): Promise<string[]> {
  if (!ReceiptOcr) {
    throw Object.assign(new Error('영수증 인식 모듈이 없는 빌드예요'), { code: 'ERR_NO_MODULE' });
  }
  const lines: string[] = [];
  for (const uri of uris) {
    for (const line of await ReceiptOcr.recognizeLines(uri)) {
      const trimmed = line.trim();
      if (trimmed) lines.push(trimmed);
    }
  }
  return lines;
}

/**
 * 촬영·선택하며 앱 캐시에 생긴 사진 사본을 지운다.
 * 앨범 원본을 지우지 않도록 앱 캐시 폴더 안의 파일만 지운다.
 */
export function deleteReceiptImages(uris: string[]) {
  const cache = Paths.cache.uri;
  for (const uri of uris) {
    if (!uri.startsWith(cache)) continue;
    try {
      const file = new File(uri);
      if (file.exists) file.delete();
    } catch {
      // 지우지 못해도 캐시 폴더라 시스템이 나중에 정리한다. 경로는 로그에 남기지 않는다.
      console.warn('영수증 사진 임시 파일을 지우지 못했어요');
    }
  }
}
