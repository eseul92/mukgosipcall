import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LoginPromptSheet from '../components/LoginPromptSheet';
import ShoppingList from '../components/ShoppingList';
import Toast from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { useFamilyData } from '../context/FamilyDataContext';
import useLoginHandlers from '../hooks/useLoginHandlers';
import useToast from '../hooks/useToast';

const LOGIN_TITLE = '장보기를 쓰려면 로그인이 필요해요';
const LOGIN_DESCRIPTION = '로그인하면 가족과 함께 장볼 목록을 만들 수 있어요.';

export default function ShoppingScreen() {
  const { isGuest } = useAuth();
  const { hasFamily, family } = useFamilyData();
  const { message: toast, show: showToast } = useToast();
  const { error: loginError, clearError, onGoogle } = useLoginHandlers((notice) =>
    showToast(notice, 4000),
  );
  const [sheetOpen, setSheetOpen] = useState(false);

  if (isGuest) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}>
          <Text style={styles.stateTitle}>{LOGIN_TITLE}</Text>
          <Text style={styles.stateDescription}>{LOGIN_DESCRIPTION}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setSheetOpen(true)}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          >
            <Text style={styles.primaryButtonText}>로그인하기</Text>
          </Pressable>
        </View>

        <Toast message={toast} />

        <LoginPromptSheet
          visible={sheetOpen}
          title={LOGIN_TITLE}
          description={LOGIN_DESCRIPTION}
          onClose={() => {
            setSheetOpen(false);
            clearError();
          }}
          onGooglePress={async () => {
            // 취소나 오류면 시트를 열어 둔 채 머문다.
            const result = await onGoogle();
            if (result?.status === 'success') setSheetOpen(false);
          }}
          errorMessage={loginError}
        />
      </SafeAreaView>
    );
  }

  if (!hasFamily) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}>
          <Text style={styles.stateTitle}>가족을 먼저 연결해 주세요</Text>
          <Text style={styles.stateDescription}>
            가족과 연결하면 함께 쓰는 장볼 목록을 만들 수 있어요.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.navigate('/family')}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          >
            <Text style={styles.primaryButtonText}>가족 탭으로 가기</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // 가족이 있지만 가족 문서를 아직 읽는 중
  if (!family) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator color="#FF5A5F" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ShoppingList />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111',
    textAlign: 'center',
  },
  stateDescription: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: '#6B7280',
    textAlign: 'center',
  },
  primaryButton: {
    marginTop: 24,
    paddingHorizontal: 32,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#FF5A5F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  pressed: {
    opacity: 0.7,
  },
});
