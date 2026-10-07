import LoginScreen from '../../screens/LoginScreen';
import useLoginHandlers from '../../hooks/useLoginHandlers';

export default function Login() {
  const { error, onGuest, onGoogle } = useLoginHandlers();

  // Apple 로그인은 아직 연결하지 않았다(안드로이드에서는 버튼도 숨겨져 있다).
  return <LoginScreen onGuestPress={onGuest} onGooglePress={onGoogle} errorMessage={error} />;
}
