import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

// Alert.alert은 웹에서 동작하지 않아 Modal로 직접 만든다.
export default function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = '취소',
  destructive = true,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <View style={styles.buttons}>
            <Pressable style={styles.button} onPress={onCancel}>
              <Text style={styles.cancel}>{cancelLabel}</Text>
            </Pressable>
            <Pressable style={styles.button} onPress={onConfirm}>
              <Text style={[styles.confirm, !destructive && styles.confirmNeutral]}>
                {confirmLabel}
              </Text>
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
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: '#6B7280',
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 20,
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cancel: {
    fontSize: 15,
    color: '#6B7280',
  },
  confirm: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EF4444',
  },
  confirmNeutral: {
    color: '#FF5A5F',
  },
});
