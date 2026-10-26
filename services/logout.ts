import { signOutGoogle } from './authService';
import { pauseAllListeners } from './listenerRegistry';
import { removeDeviceToken } from './pushNotifications';

export type LogoutDeps = {
  /** Firebase Auth 로그아웃. 실패하면 reject */
  signOut: () => Promise<void>;
  /** 앱 안의 사용자, 가족, 콜, 재료 상태를 비운다 */
  resetAppState: () => void;
};

/** 실패해도 로그만 남기고 다음 단계로 넘어간다. */
async function bestEffort(label: string, step: () => unknown) {
  try {
    await step();
  } catch (e) {
    console.warn(`로그아웃 정리 실패: ${label}`, e);
  }
}

/**
 * 로그아웃에 필요한 모든 정리를 이 순서로 한다.
 * Firebase signOut이 실패하면 아직 로그인된 상태이므로 구독을 되살리고 false를 돌려준다.
 * 그 밖의 단계가 실패해도 끝까지 진행한다.
 */
export async function performLogout({ signOut, resetAppState }: LogoutDeps) {
  // a. 모든 Firestore 실시간 구독 해제
  const resumeListeners = pauseAllListeners();

  // 푸시 토큰 제거: 이 기기의 토큰을 fcmTokens에서 지워 이전 계정에 알림이 가지 않게 한다.
  // 아직 로그인된 상태여야 지울 수 있어서 signOut보다 먼저 한다. 실패해도 로그아웃은 계속한다.
  await bestEffort('푸시 토큰 제거', removeDeviceToken);

  // b. 구글 로그인 세션 끊기 (다음 로그인에서 계정 선택 창이 뜬다)
  await bestEffort('Google signOut', signOutGoogle);

  // c. Firebase Auth 로그아웃
  try {
    await signOut();
  } catch (e) {
    console.warn('Firebase signOut 실패', e);
    resumeListeners();
    return false;
  }

  // d. 앱 안의 사용자, 가족, 콜, 재료 상태 초기화
  await bestEffort('앱 상태 초기화', resetAppState);

  // e. 기기에 저장된 임시 재료 삭제
  //    지금은 재료를 기기에 저장하지 않는다(메모리에만 있고 d에서 비워진다).
  //    재료를 AsyncStorage 등에 저장하게 되면 그 삭제를 여기에 추가한다.

  // f. 로그인 화면으로 이동하고 이전 화면 스택을 비운다.
  //    라우터를 직접 부르지 않는다. 로그인 상태가 풀리면 루트 레이아웃의 Stack.Protected 가드가
  //    보호된 화면들의 히스토리를 지우고 로그인 화면만 남긴다. 여기서 dismissAll 등을 부르면
  //    이미 비워진 스택에 POP_TO_TOP을 보내 "not handled by any navigator" 오류가 난다.

  return true;
}
