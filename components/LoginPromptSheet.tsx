import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  visible: boolean;
  title: string;
  description: string;
  onClose: () => void;
  onApplePress?: () => void;
  onGooglePress?: () => void;
  errorMessage?: string | null;
};

// 안드로이드에서는 Apple 로그인 버튼을 숨긴다.
const SHOW_APPLE = Platform.OS !== 'android';

export default function LoginPromptSheet({
  visible,
  title,
  description,
  onClose,
  onApplePress,
  onGooglePress,
  errorMessage,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="닫기" />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
          <View style={styles.handle} />
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>

          <View style={styles.buttons}>
            {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

            {SHOW_APPLE && (
              <Pressable
                accessibilityRole="button"
                onPress={onApplePress}
                style={({ pressed }) => [styles.button, styles.appleButton, pressed && styles.pressed]}
              >
                <Text style={[styles.icon, styles.appleText]}>{''}</Text>
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
              onPress={onClose}
              style={({ pressed }) => [styles.laterButton, pressed && styles.pressed]}
            >
              <Text style={styles.laterText}>나중에 할게요</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111',
  },
  description: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: '#6B7280',
  },
  buttons: {
    marginTop: 24,
    gap: 12,
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
  error: {
    textAlign: 'center',
    fontSize: 14,
    color: '#EF4444',
  },
  laterButton: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  laterText: {
    fontSize: 15,
    color: '#6B7280',
  },
  pressed: {
    opacity: 0.7,
  },
});
