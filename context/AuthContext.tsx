import { createContext, ReactNode, useContext, useMemo, useState } from 'react';

type Status = 'signedOut' | 'guest' | 'signedIn';

type AuthValue = {
  status: Status;
  isGuest: boolean;
  enterAsGuest: () => void;
  signIn: () => void;
};

const AuthContext = createContext<AuthValue | null>(null);

// 실제 인증은 아직 연결하지 않았다. 상태만 관리한다.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('signedOut');

  const value = useMemo<AuthValue>(
    () => ({
      status,
      isGuest: status === 'guest',
      enterAsGuest: () => setStatus('guest'),
      signIn: () => setStatus('signedIn'),
    }),
    [status],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
