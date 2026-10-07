import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { Ingredient } from '../types/models';
import ConfirmDialog from './ConfirmDialog';

type Props = {
  ingredients: Ingredient[];
  onAdd: (name: string) => void;
  onRemove: (ingredientId: string) => void;
};

export default function IngredientSection({ ingredients, onAdd, onRemove }: Props) {
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState('');
  // 닫히는 애니메이션 동안에도 재료 이름이 남도록, 대상은 비우지 않고 표시 여부만 끈다.
  const [pendingDelete, setPendingDelete] = useState<Ingredient | null>(null);
  const [confirmVisible, setConfirmVisible] = useState(false);

  const askDelete = (ingredient: Ingredient) => {
    setPendingDelete(ingredient);
    setConfirmVisible(true);
  };

  const submit = () => {
    const name = text.trim();
    if (name) onAdd(name);
    setText('');
  };

  return (
    <View>
      <Text style={styles.sectionTitle}>냉장고 재료</Text>

      <View style={styles.chips}>
        {ingredients.map((ingredient) => (
          <Pressable
            key={ingredient.id}
            onLongPress={() => askDelete(ingredient)}
            accessibilityHint="길게 누르면 삭제할 수 있어요"
            style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
          >
            <Text style={styles.chipText}>{ingredient.name}</Text>
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

      <ConfirmDialog
        visible={confirmVisible}
        title={`${pendingDelete?.name ?? ''} 삭제할까요?`}
        confirmLabel="삭제"
        onCancel={() => setConfirmVisible(false)}
        onConfirm={() => {
          if (pendingDelete) onRemove(pendingDelete.id);
          setConfirmVisible(false);
        }}
      />
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
});
