import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  AuthResult,
  AuthUser,
  getCurrentAuthUser,
  signInAsGuest,
  signInWithGoogle as googleSignIn,
  subscribeAuth,
} from '../services/authService';

type Status = 'signedOut' | 'guest' | 'signedIn';

type AuthValue = {
  status: Status;
  /** 현재 사용자가 익명이면 true */
  isGuest: boolean;
  uid: string | null;
  continueAsGuest: () => Promise<AuthResult>;
  signInWithGoogle: () => Promise<AuthResult>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  // 앱 시작 시 저장된 로그인 상태가 첫 이벤트로 들어온다.
  useEffect(
    () =>
      subscribeAuth((next) => {
        setUser(next);
        setReady(true);
      }),
    [],
  );

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
      uid: user?.uid ?? null,
      continueAsGuest: () => withRefresh(signInAsGuest),
      signInWithGoogle: () => withRefresh(googleSignIn),
    }),
    [user, withRefresh],
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
