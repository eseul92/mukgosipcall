import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NICKNAME_MAX } from '../constants/family';
import useSaveDisplayName from '../hooks/useSaveDisplayName';
import { charCount, limitChars } from '../utils/text';

type Props = {
  visible: boolean;
  initialName: string;
  onClose: () => void;
  onSaved: () => void;
};

// 열 때마다 새로 만들어서 현재 이름과 빈 오류로 시작한다.
export default function RenameDialog({ visible, ...props }: Props) {
  return visible ? <RenameDialogBody {...props} /> : null;
}

function RenameDialogBody({ initialName, onClose, onSaved }: Omit<Props, 'visible'>) {
  const { save, pending, error, clearError } = useSaveDisplayName();
  const [name, setName] = useState(initialName);

  const submit = async () => {
    if (await save(name)) onSaved();
  };

  // 저장하는 동안에는 닫히지 않게 한다.
  const close = () => {
    if (!pending) onClose();
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.dialog}>
          <Text style={styles.title}>이름 바꾸기</Text>
          <Text style={styles.message}>가족에게 보일 이름이에요.</Text>

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

          <View style={styles.buttons}>
            <Pressable style={styles.button} onPress={close} disabled={pending}>
              <Text style={styles.cancel}>취소</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: pending, busy: pending }}
              style={[styles.button, styles.saveButton]}
              onPress={submit}
              disabled={pending}
            >
              {pending ? (
                <ActivityIndicator size="small" color="#FF5A5F" />
              ) : (
                <Text style={styles.save}>저장</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  dialog: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111',
  },
  message: {
    marginTop: 4,
    fontSize: 14,
    color: '#6B7280',
  },
  input: {
    marginTop: 16,
    height: 48,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
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
  buttons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  saveButton: {
    minWidth: 52,
    alignItems: 'center',
  },
  cancel: {
    fontSize: 15,
    color: '#6B7280',
  },
  save: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FF5A5F',
  },
});
