import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  AuthResult,
  AuthUser,
  getCurrentAuthUser,
  signInAsGuest,
  signInWithGoogle as googleSignIn,
  subscribeAuth,
} from '../services/authService';
import { subscribeDisplayName } from '../services/userProfile';

type Status = 'signedOut' | 'guest' | 'signedIn';

type AuthValue = {
  status: Status;
  /** 현재 사용자가 익명이면 true */
  isGuest: boolean;
  uid: string | null;
  /** 구글 계정 이름. 닉네임 입력의 기본값으로 쓴다. */
  authName: string | null;
  /** 로그인했는데(익명 제외) users/{uid}.displayName이 비어 있으면 true */
  needsNickname: boolean;
  /** users/{uid}.displayName. 비어 있거나 아직 못 읽었으면 null */
  displayName: string | null;
  /** displayName이 확인됐고 비어 있지 않으면 true */
  hasNickname: boolean;
  continueAsGuest: () => Promise<AuthResult>;
  signInWithGoogle: () => Promise<AuthResult>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<{ uid: string; displayName: string | null } | null>(null);

  // 앱 시작 시 저장된 로그인 상태가 첫 이벤트로 들어온다.
  useEffect(
    () =>
      subscribeAuth((next) => {
        setUser(next);
        setReady(true);
      }),
    [],
  );

  // 닉네임이 비었는지 알려고 users 문서의 이름을 구독한다. 익명 계정은 필요 없다.
  const uid = user?.uid ?? null;
  const isAnonymous = user?.isAnonymous ?? true;
  useEffect(() => {
    setProfile(null);
    if (!uid || isAnonymous) return;
    return subscribeDisplayName(uid, (displayName) =>
      setProfile(displayName === undefined ? null : { uid, displayName }),
    );
  }, [uid, isAnonymous]);

  // 익명 계정에 구글을 연결하면 uid가 그대로라 상태 이벤트가 오지 않으므로 결과로 직접 갱신한다.
  const withRefresh = useCallback(async (action: () => Promise<AuthResult>) => {
    const result = await action();
    if (result.status === 'success') setUser(result.user ?? getCurrentAuthUser());
    return result;
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      status: user === null ? 'signedOut' : user.isAnonymous ? 'guest' : 'signedIn',
      isGuest: user?.isAnonymous === true,
      uid,
      authName: user?.displayName ?? null,
      // 문서가 아직 없을 때(로그인 직후 만드는 중)는 묻지 않는다.
      needsNickname: profile !== null && profile.uid === uid && !profile.displayName?.trim(),
      displayName: (profile?.uid === uid && profile.displayName?.trim()) || null,
      hasNickname: profile !== null && profile.uid === uid && !!profile.displayName?.trim(),
      continueAsGuest: () => withRefresh(signInAsGuest),
      signInWithGoogle: () => withRefresh(googleSignIn),
    }),
    [user, uid, profile, withRefresh],
  );

  // 로그인 상태를 복원하기 전에는 로그인 화면이 잠깐 비치지 않도록 그리지 않는다.
  if (!ready) return null;

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
