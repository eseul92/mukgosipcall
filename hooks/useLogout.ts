import { useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useFamilyData } from '../context/FamilyDataContext';
import { performLogout } from '../services/logout';

export default function useLogout() {
  const { signOut } = useAuth();
  const { resetAll } = useFamilyData();
  const [pending, setPending] = useState(false);
  const busy = useRef(false);

  /** 로그아웃했으면 true, Firebase 로그아웃에 실패했으면 false */
  const logout = async () => {
    if (busy.current) return false;
    busy.current = true;
    setPending(true);
    try {
      return await performLogout({ signOut, resetAppState: resetAll });
    } finally {
      busy.current = false;
      setPending(false);
    }
  };

  return { logout, pending };
}
