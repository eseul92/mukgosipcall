import LoginScreen from '../../screens/LoginScreen';
import { useAuth } from '../../context/AuthContext';

export default function Login() {
  const { enterAsGuest, signIn } = useAuth();
  return <LoginScreen onGuestPress={enterAsGuest} onApplePress={signIn} onGooglePress={signIn} />;
}
