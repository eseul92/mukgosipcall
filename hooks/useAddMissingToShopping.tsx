import { router } from 'expo-router';
import { useRef, useState } from 'react';
import ConfirmDialog from '../components/ConfirmDialog';
import LoginPromptSheet from '../components/LoginPromptSheet';
import { SHOPPING_WRITE_FAILED_MESSAGE } from '../constants/shopping';
import { useAuth } from '../context/AuthContext';
import { useFamilyData } from '../context/FamilyDataContext';
import type { RecommendedDish } from '../services/dishRecommender';
import useLoginHandlers from './useLoginHandlers';

const LOGIN_TITLE = '장보기를 쓰려면 로그인이 필요해요';
const LOGIN_DESCRIPTION = '로그인하면 부족한 재료를 가족과 함께 장볼 목록에 담을 수 있어요.';

function summary(added: number, skipped: number) {
  if (added === 0) return '모두 이미 목록에 있어요';
  return skipped === 0 ? `${added}개 추가했어요` : `${added}개 추가했어요 (${skipped}개는 이미 있어요)`;
}

/**
 * 추천 카드의 부족한 재료를 장보기에 담는다. 게스트이거나 가족이 없으면 담지 않고
 * 안내를 띄운다. dialogs는 화면 어딘가에 한 번 렌더해야 한다.
 */
export default function useAddMissingToShopping(showToast: (message: string, duration?: number) => void) {
  const { isGuest } = useAuth();
  const { hasFamily, addShoppingItems } = useFamilyData();
  const [needLogin, setNeedLogin] = useState(false);
  const [needFamily, setNeedFamily] = useState(false);
  const [busyDish, setBusyDish] = useState<string | null>(null);
  const busy = useRef(false);
  const { error: loginError, clearError, onGoogle } = useLoginHandlers((notice) =>
    showToast(notice, 4000),
  );

  const addMissing = async (dish: RecommendedDish) => {
    if (isGuest) return setNeedLogin(true);
    if (!hasFamily) return setNeedFamily(true);
    if (busy.current) return;

    busy.current = true;
    setBusyDish(dish.name);
    try {
      const { added, skipped } = await addShoppingItems(dish.missing, dish.name);
      showToast(summary(added, skipped), 2500);
    } catch (e) {
      console.warn('장보기에 담지 못했어요', e);
      showToast(SHOPPING_WRITE_FAILED_MESSAGE, 3000);
    } finally {
      busy.current = false;
      setBusyDish(null);
    }
  };

  const closeLogin = () => {
    setNeedLogin(false);
    clearError();
  };

  const dialogs = (
    <>
      <LoginPromptSheet
        visible={needLogin}
        title={LOGIN_TITLE}
        description={LOGIN_DESCRIPTION}
        onClose={closeLogin}
        onGooglePress={async () => {
          // 취소나 오류면 시트를 열어 둔 채 머문다.
          const result = await onGoogle();
          if (result?.status === 'success') closeLogin();
        }}
        errorMessage={loginError}
      />
      <ConfirmDialog
        visible={needFamily}
        title="가족과 연결해야 장보기를 쓸 수 있어요"
        message="초대 코드를 입력해 가족과 먼저 연결해주세요."
        confirmLabel="가족 연결하기"
        destructive={false}
        onCancel={() => setNeedFamily(false)}
        onConfirm={() => {
          setNeedFamily(false);
          router.push('/family-connect');
        }}
      />
    </>
  );

  return { addMissing, busyDish, dialogs };
}
