import Constants from 'expo-constants';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import ConfirmDialog from '../components/ConfirmDialog';
import LoginPromptSheet from '../components/LoginPromptSheet';
import RenameDialog from '../components/RenameDialog';
import Toast from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import useLoginHandlers from '../hooks/useLoginHandlers';
import useLogout from '../hooks/useLogout';
import useToast from '../hooks/useToast';

const LOGOUT_FAILED = '로그아웃에 실패했어요. 다시 시도해 주세요';

export default function SettingsScreen() {
  const { isGuest, displayName, email } = useAuth();
  const { logout, pending } = useLogout();
  const { message: toast, show: showToast } = useToast();
  const { error: loginError, clearError, onGoogle } = useLoginHandlers((notice) =>
    showToast(notice, 4000),
  );
  const [renaming, setRenaming] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const confirmLogout = async () => {
    setConfirming(false);
    if (!(await logout())) showToast(LOGOUT_FAILED, 3000);
  };

  const closeSheet = () => {
    setSheetOpen(false);
    clearError();
  };

  // 취소나 오류면 시트를 열어 둔 채 머문다.
  const handleGoogle = async () => {
    const result = await onGoogle();
    if (result?.status === 'success') closeSheet();
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>내 정보</Text>

          <View style={styles.row}>
            <Text style={styles.label}>이름</Text>
            <Text style={styles.value} numberOfLines={1}>
              {isGuest ? '게스트' : (displayName ?? '-')}
            </Text>
            {!isGuest && (
              <Pressable
                accessibilityRole="button"
                onPress={() => setRenaming(true)}
                hitSlop={6}
                style={({ pressed }) => [styles.renameButton, pressed && styles.pressed]}
              >
                <Text style={styles.renameText}>이름 바꾸기</Text>
              </Pressable>
            )}
          </View>

          {email ? (
            <View style={styles.row}>
              <Text style={styles.label}>이메일</Text>
              <Text style={styles.value} numberOfLines={1}>
                {email}
              </Text>
            </View>
          ) : null}
        </View>

        {isGuest ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setSheetOpen(true)}
            style={({ pressed }) => [styles.loginButton, pressed && styles.pressed]}
          >
            <Text style={styles.loginText}>로그인하기</Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: pending, busy: pending }}
            disabled={pending}
            onPress={() => setConfirming(true)}
            style={({ pressed }) => [styles.logoutButton, pressed && styles.pressed]}
          >
            {pending ? (
              <ActivityIndicator size="small" color="#9CA3AF" />
            ) : (
              <Text style={styles.logoutText}>로그아웃</Text>
            )}
          </Pressable>
        )}

        <Text style={styles.version}>앱 버전 {Constants.expoConfig?.version ?? '-'}</Text>
      </View>

      <Toast message={toast} />

      <RenameDialog
        visible={renaming}
        initialName={displayName ?? ''}
        onClose={() => setRenaming(false)}
        onSaved={() => {
          setRenaming(false);
          showToast('이름을 바꿨어요');
        }}
      />

      <ConfirmDialog
        visible={confirming}
        title="로그아웃할까요?"
        confirmLabel="로그아웃"
        onCancel={() => setConfirming(false)}
        onConfirm={confirmLogout}
      />

      <LoginPromptSheet
        visible={sheetOpen}
        title="로그인하면 가족과 연결할 수 있어요"
        description="로그인하면 가족을 초대하고 함께 먹을 메뉴를 정할 수 있어요."
        onClose={closeSheet}
        onGooglePress={handleGoogle}
        errorMessage={loginError}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 24,
    gap: 24,
  },
  card: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 20,
    gap: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  label: {
    width: 52,
    fontSize: 14,
    color: '#6B7280',
  },
  value: {
    flex: 1,
    fontSize: 16,
    color: '#111',
  },
  renameButton: {
    paddingHorizontal: 10,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  renameText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  loginButton: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  // 눈에 덜 띄도록 테두리 없이 작은 회색 글씨로 둔다.
  logoutButton: {
    alignSelf: 'center',
    minWidth: 96,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  version: {
    textAlign: 'center',
    fontSize: 13,
    color: '#9CA3AF',
  },
  pressed: {
    opacity: 0.7,
  },
});
