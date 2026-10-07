import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Logo from '../components/Logo';

type Props = {
  onApplePress?: () => void;
  onGooglePress?: () => void;
  onGuestPress?: () => void;
  errorMessage?: string | null;
};

// 안드로이드에서는 Apple 로그인 버튼을 숨긴다.
const SHOW_APPLE = Platform.OS !== 'android';

export default function LoginScreen({
  onApplePress,
  onGooglePress,
  onGuestPress,
  errorMessage,
}: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoShadow}>
          <Logo size={112} />
        </View>
        <Text style={styles.appName}>먹고싶콜</Text>
        <Text style={styles.tagline}>먹고 싶은 게 생기면, 가족에게 콜!</Text>
      </View>

      <View style={styles.buttons}>
        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

        {SHOW_APPLE && (
          <Pressable
            accessibilityRole="button"
            onPress={onApplePress}
            style={({ pressed }) => [styles.button, styles.appleButton, pressed && styles.pressed]}
          >
            <Text style={[styles.icon, styles.appleText]}>{''}</Text>
            <Text style={[styles.buttonText, styles.appleText]}>Apple로 계속하기</Text>
          </Pressable>
        )}

        <Pressable
          accessibilityRole="button"
          onPress={onGooglePress}
          style={({ pressed }) => [styles.button, styles.googleButton, pressed && styles.pressed]}
        >
          <Text style={[styles.icon, styles.googleIcon]}>G</Text>
          <Text style={[styles.buttonText, styles.googleText]}>Google로 계속하기</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={onGuestPress}
          style={({ pressed }) => [styles.guestButton, pressed && styles.pressed]}
        >
          <Text style={styles.guestText}>로그인 없이 둘러보기</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 24,
  },
  header: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoShadow: {
    borderRadius: 32,
    shadowColor: '#FF5A5F',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    backgroundColor: '#fff',
  },
  appName: {
    marginTop: 20,
    fontSize: 28,
    fontWeight: '700',
    color: '#111',
  },
  tagline: {
    marginTop: 8,
    fontSize: 16,
    color: '#6B7280',
  },
  buttons: {
    gap: 12,
    paddingBottom: 32,
  },
  button: {
    height: 52,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  appleButton: {
    backgroundColor: '#000',
  },
  googleButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  guestButton: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestText: {
    fontSize: 15,
    color: '#6B7280',
    textDecorationLine: 'underline',
  },
  error: {
    textAlign: 'center',
    fontSize: 14,
    color: '#EF4444',
  },
  pressed: {
    opacity: 0.7,
  },
  icon: {
    fontSize: 20,
    fontWeight: '700',
  },
  googleIcon: {
    color: '#4285F4',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  appleText: {
    color: '#fff',
  },
  googleText: {
    color: '#111',
  },
});
