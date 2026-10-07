import { useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import type { AuthResult } from '../services/authService';

// 로그인 버튼 핸들러를 한곳에 모은다. 취소는 조용히 넘기고, 오류는 error로 돌려준다.
// onNotice는 로그인은 성공했지만 알려줄 내용이 있을 때(예: 게스트 정보 미이전) 호출된다.
export default function useLoginHandlers(onNotice?: (message: string) => void) {
  const { continueAsGuest, signInWithGoogle } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);

  const run = async (action: () => Promise<AuthResult>) => {
    if (busy.current) return null;
    busy.current = true;
    setError(null);
    try {
      const result = await action();
      if (result.status === 'error') setError(result.message);
      if (result.status === 'success' && result.notice) onNotice?.(result.notice);
      return result;
    } finally {
      busy.current = false;
    }
  };

  return {
    error,
    clearError: () => setError(null),
    onGuest: () => run(continueAsGuest),
    onGoogle: () => run(signInWithGoogle),
  };
}
