import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

type Props = {
  ingredients: string[];
  onAdd: (name: string) => void;
  onRemove: (name: string) => void;
};

export default function IngredientSection({ ingredients, onAdd, onRemove }: Props) {
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState('');
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const submit = () => {
    const name = text.trim();
    if (name) onAdd(name);
    setText('');
  };

  return (
    <View>
      <Text style={styles.sectionTitle}>냉장고 재료</Text>

      <View style={styles.chips}>
        {ingredients.map((name) => (
          <Pressable
            key={name}
            onLongPress={() => setPendingDelete(name)}
            accessibilityHint="길게 누르면 삭제할 수 있어요"
            style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
          >
            <Text style={styles.chipText}>{name}</Text>
          </Pressable>
        ))}
        <Pressable
          accessibilityRole="button"
          onPress={() => setAdding((v) => !v)}
          style={({ pressed }) => [styles.chip, styles.addChip, pressed && styles.pressed]}
        >
          <Text style={styles.addChipText}>{adding ? '닫기' : '+ 추가'}</Text>
        </Pressable>
      </View>

      {adding && (
        <View style={styles.inputRow}>
          <TextInput
            autoFocus
            value={text}
            onChangeText={setText}
            onSubmitEditing={submit}
            placeholder="재료 이름"
            placeholderTextColor="#9CA3AF"
            returnKeyType="done"
            blurOnSubmit={false}
            style={styles.input}
          />
          <Pressable
            accessibilityRole="button"
            onPress={submit}
            style={({ pressed }) => [styles.inputButton, pressed && styles.pressed]}
          >
            <Text style={styles.inputButtonText}>추가</Text>
          </Pressable>
        </View>
      )}

      <Modal
        visible={pendingDelete !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingDelete(null)}
      >
        <View style={styles.dialogOverlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>{pendingDelete} 삭제할까요?</Text>
            <View style={styles.dialogButtons}>
              <Pressable style={styles.dialogButton} onPress={() => setPendingDelete(null)}>
                <Text style={styles.dialogCancel}>취소</Text>
              </Pressable>
              <Pressable
                style={styles.dialogButton}
                onPress={() => {
                  if (pendingDelete) onRemove(pendingDelete);
                  setPendingDelete(null);
                }}
              >
                <Text style={styles.dialogDelete}>삭제</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    marginBottom: 12,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 15,
    color: '#111',
  },
  addChip: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#9CA3AF',
  },
  addChipText: {
    fontSize: 15,
    color: '#6B7280',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  input: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#111',
  },
  inputButton: {
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
  },
  pressed: {
    opacity: 0.7,
  },
  dialogOverlay: {
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
  dialogTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111',
  },
  dialogButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 20,
  },
  dialogButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dialogCancel: {
    fontSize: 15,
    color: '#6B7280',
  },
  dialogDelete: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EF4444',
  },
});
