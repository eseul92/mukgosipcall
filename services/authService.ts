import {
  getAuth,
  GoogleAuthProvider,
  linkWithCredential,
  onAuthStateChanged,
  signInAnonymously,
  signInWithCredential,
} from '@react-native-firebase/auth';
import { GoogleSignin, isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin';
import { GOOGLE_WEB_CLIENT_ID } from '../constants/auth';
import { ensureUserDocument } from './userProfile';

export type AuthUser = {
  uid: string;
  isAnonymous: boolean;
};

export type AuthResult =
  | { status: 'success'; user: AuthUser | null; notice?: string }
  | { status: 'cancelled' }
  | { status: 'error'; message: string };

const SWITCHED_NOTICE = '게스트 때 입력한 정보는 옮겨지지 않아요';

GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });

type FirebaseUserLike = NonNullable<ReturnType<typeof getAuth>['currentUser']>;

function toAuthUser(user: FirebaseUserLike | null): AuthUser | null {
  return user ? { uid: user.uid, isAnonymous: user.isAnonymous } : null;
}

// 문서 생성이 실패해도 로그인 자체는 성공으로 둔다. 다음 로그인/앱 시작 때 다시 시도한다.
async function ensureProfile(user: FirebaseUserLike | null) {
  if (!user) return;
  try {
    await ensureUserDocument({
      uid: user.uid,
      displayName: user.displayName ?? null,
      photoURL: user.photoURL ?? null,
      authProvider: user.isAnonymous ? 'anonymous' : 'google',
    });
  } catch (e) {
    console.warn('users 문서를 만들지 못했어요', e);
  }
}

/** 로그인 상태를 구독한다. 앱 시작 시 저장된 로그인도 여기로 복원되어 들어온다. */
export function subscribeAuth(listener: (user: AuthUser | null) => void) {
  return onAuthStateChanged(getAuth(), (user) => {
    listener(toAuthUser(user));
    ensureProfile(user);
  });
}

/** 연결(link)은 상태 변경 이벤트를 보내지 않으므로 현재 사용자를 직접 읽는다. */
export function getCurrentAuthUser() {
  return toAuthUser(getAuth().currentUser);
}

function errorCode(e: unknown): string {
  const code = (e as { code?: unknown } | null)?.code;
  return typeof code === 'string' ? code : '';
}

function isNetworkError(e: unknown) {
  const code = errorCode(e);
  const message = e instanceof Error ? e.message : '';
  // 7 = Google Play 서비스의 NETWORK_ERROR
  return code === 'auth/network-request-failed' || code === '7' || /network/i.test(`${code} ${message}`);
}

function toFailure(e: unknown): AuthResult {
  if (isErrorWithCode(e)) {
    if (e.code === statusCodes.SIGN_IN_CANCELLED || e.code === statusCodes.IN_PROGRESS) {
      return { status: 'cancelled' };
    }
    if (e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return { status: 'error', message: 'Google Play 서비스를 사용할 수 없어요' };
    }
  }
  if (isNetworkError(e)) {
    return { status: 'error', message: '네트워크 연결을 확인해주세요' };
  }
  console.warn('로그인 실패', e);
  return { status: 'error', message: '로그인하지 못했어요. 잠시 후 다시 시도해주세요' };
}

export async function signInAsGuest(): Promise<AuthResult> {
  try {
    const { user } = await signInAnonymously(getAuth());
    await ensureProfile(user);
    return { status: 'success', user: toAuthUser(user) };
  } catch (e) {
    return toFailure(e);
  }
}

/**
 * 현재 사용자가 익명이면 같은 uid를 유지하도록 구글 자격을 연결한다.
 * 그 구글 계정이 이미 다른 계정에 연결돼 있으면 그 계정으로 로그인하고 안내를 돌려준다.
 */
export async function signInWithGoogle(): Promise<AuthResult> {
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (response.type === 'cancelled') return { status: 'cancelled' };

    const idToken = response.data.idToken;
    if (!idToken) return { status: 'error', message: '로그인하지 못했어요. 잠시 후 다시 시도해주세요' };

    const credential = GoogleAuthProvider.credential(idToken);
    const auth = getAuth();
    const current = auth.currentUser;

    if (current?.isAnonymous) {
      try {
        const { user } = await linkWithCredential(current, credential);
        await ensureProfile(user);
        return { status: 'success', user: toAuthUser(user) };
      } catch (e) {
        const code = errorCode(e);
        if (code !== 'auth/credential-already-in-use' && code !== 'auth/email-already-in-use') {
          throw e;
        }
        const { user } = await signInWithCredential(auth, credential);
        await ensureProfile(user);
        return { status: 'success', user: toAuthUser(user), notice: SWITCHED_NOTICE };
      }
    }

    const { user } = await signInWithCredential(auth, credential);
    await ensureProfile(user);
    return { status: 'success', user: toAuthUser(user) };
  } catch (e) {
    return toFailure(e);
  }
}
