import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable, HttpsError } from '@react-native-firebase/functions';
import { RETRY_MESSAGE } from '../constants/family';

const REGION = 'asia-northeast3';
const HANGUL = /[가-힣]/;

/** message는 항상 사용자에게 그대로 보여줄 수 있는 한국어 문장이다. */
export class FunctionError extends Error {
  /** HttpsError의 code (예: 'already-exists'). 서버 응답이 아니면 'unknown' */
  readonly code: string;
  /** 서버가 쓴 문장이면 true, 네트워크 오류 등으로 안내 문장으로 바꿨으면 false */
  readonly fromServer: boolean;

  constructor(message: string, code: string, fromServer: boolean) {
    super(message);
    this.name = 'FunctionError';
    this.code = code;
    this.fromServer = fromServer;
  }
}

/**
 * HttpsError의 message는 서버가 쓴 한국어 문장이라 그대로 쓴다.
 * 네트워크 오류처럼 네이티브가 채운 message(UNAVAILABLE 등 영문)나 빈 message는 안내 문장으로 바꾼다.
 */
function toFunctionError(e: unknown): FunctionError {
  if (e instanceof HttpsError && typeof e.message === 'string' && HANGUL.test(e.message)) {
    return new FunctionError(e.message, e.code, true);
  }
  const code = e instanceof HttpsError ? e.code : 'unknown';
  return new FunctionError(RETRY_MESSAGE, code, false);
}

export async function callFunction<Request, Result>(name: string, data?: Request): Promise<Result> {
  try {
    const callable = httpsCallable<Request, Result>(getFunctions(getApp(), REGION), name);
    const response = await callable(data);
    return response.data;
  } catch (e) {
    console.warn(`${name} 호출 실패`, e);
    throw toFunctionError(e);
  }
}
