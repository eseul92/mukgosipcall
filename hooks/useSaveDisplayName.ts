import { useRef, useState } from 'react';
import { NICKNAME_MAX } from '../constants/family';
import { useAuth } from '../context/AuthContext';
import { FunctionError } from '../services/callable';
import { updateDisplayName } from '../services/userProfile';
import { charCount } from '../utils/text';

const SAVE_FAILED = '이름을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.';

/** 공백을 뺀 이름이 1~20자인지 확인한다. 문제가 없으면 null. */
export function validateNickname(raw: string): string | null {
  const length = charCount(raw.trim());
  if (length < 1) return '이름을 입력해 주세요.';
  if (length > NICKNAME_MAX) return `이름은 ${NICKNAME_MAX}자 이하로 입력해 주세요.`;
  return null;
}

// 닉네임 입력 화면과 이름 바꾸기가 같은 검증·저장·중복 탭 방지를 쓴다.
// 저장은 서버 함수(updateDisplayName)만 한다. 같은 이름이 있으면 서버 메시지를 그대로 error로 준다.
export default function useSaveDisplayName() {
  const { uid } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);

  /** 저장했으면 true */
  const save = async (raw: string) => {
    if (busy.current || !uid) return false;

    const invalid = validateNickname(raw);
    if (invalid) {
      setError(invalid);
      return false;
    }

    busy.current = true;
    setPending(true);
    setError(null);
    try {
      await updateDisplayName(raw.trim());
      return true;
    } catch (e) {
      setError(e instanceof FunctionError && e.fromServer ? e.message : SAVE_FAILED);
      return false;
    } finally {
      busy.current = false;
      setPending(false);
    }
  };

  return { save, pending, error, clearError: () => setError(null) };
}
