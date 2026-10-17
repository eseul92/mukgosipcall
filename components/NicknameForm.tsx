import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { NICKNAME_MAX } from '../constants/family';
import { useAuth } from '../context/AuthContext';
import useSaveDisplayName from '../hooks/useSaveDisplayName';
import { charCount, limitChars } from '../utils/text';

type Props = {
  /** 입력창 기본값. 없으면 구글 이름. 기본값일 뿐이라 사용자가 저장을 눌러야 저장된다. */
  initialName?: string;
  /** 설명 대신 보여줄 안내 (예: 같은 이름이 있다는 서버 메시지) */
  notice?: string;
  submitLabel?: string;
  /** 저장이 끝났을 때 */
  onSaved?: () => void;
  /** 있을 때만 취소 버튼이 보인다. 이름이 없는 사용자에게는 넘기지 않는다(건너뛰기 없음). */
  onCancel?: () => void;
};

// 기본은 건너뛰기가 없다. 닉네임을 저장해야만 다음으로 넘어간다.
export default function NicknameForm({
  initialName,
  notice,
  submitLabel = '다음',
  onSaved,
  onCancel,
}: Props) {
  const { authName } = useAuth();
  const { save, pending, error, clearError } = useSaveDisplayName();
  const [name, setName] = useState(() =>
    limitChars((initialName ?? authName ?? '').trim(), NICKNAME_MAX),
  );

  const ready = name.trim().length > 0;
  const submit = async () => {
    if (ready && (await save(name))) onSaved?.();
  };

  return (
    <View style={styles.content}>
      <Text style={styles.title}>가족에게 보일 이름을 정해 주세요</Text>
      <Text style={[styles.description, notice ? styles.notice : null]}>
        {notice ?? '나중에 가족 탭에서 바꿀 수 있어요.'}
      </Text>

      <TextInput
        value={name}
        onChangeText={(text) => {
          clearError();
          setName(limitChars(text, NICKNAME_MAX));
        }}
        onSubmitEditing={submit}
        editable={!pending}
        autoFocus
        returnKeyType="done"
        placeholder="이름"
        placeholderTextColor="#9CA3AF"
        style={styles.input}
      />
      <Text style={styles.count}>
        {charCount(name)}/{NICKNAME_MAX}
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: pending || !ready, busy: pending }}
        disabled={pending || !ready}
        onPress={submit}
        style={({ pressed }) => [
          styles.button,
          (pending || !ready) && styles.disabled,
          pressed && styles.pressed,
        ]}
      >
        {pending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>{submitLabel}</Text>
        )}
      </Pressable>

      {onCancel ? (
        <Pressable
          accessibilityRole="button"
          disabled={pending}
          onPress={onCancel}
          style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}
        >
          <Text style={styles.cancelText}>취소</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 24,
    paddingTop: 48,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111',
  },
  description: {
    marginTop: 8,
    fontSize: 15,
    color: '#6B7280',
  },
  notice: {
    color: '#EF4444',
  },
  input: {
    marginTop: 28,
    height: 56,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 18,
    color: '#111',
  },
  count: {
    marginTop: 6,
    alignSelf: 'flex-end',
    fontSize: 13,
    color: '#9CA3AF',
  },
  error: {
    marginTop: 8,
    fontSize: 14,
    color: '#EF4444',
  },
  button: {
    marginTop: 20,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#FF5A5F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  cancelButton: {
    marginTop: 8,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 15,
    color: '#6B7280',
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.7,
  },
});
