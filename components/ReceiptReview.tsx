import Ionicons from '@expo/vector-icons/Ionicons';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  RECEIPT_DUPLICATE_MESSAGE,
  RECEIPT_EMPTY_NAME_MESSAGE,
  RECEIPT_MAX_SAVE,
  RECEIPT_NO_ITEMS_MESSAGE,
  RECEIPT_TOO_MANY_MESSAGE,
} from '../constants/receipt';
import { SHOPPING_NAME_MAX, SHOPPING_TOO_LONG_MESSAGE } from '../constants/shopping';
import type { ReceiptItem } from '../types/models';
import { receiptNameReason } from '../utils/receiptParser';
import { normalizeShoppingName, shoppingNameKey } from '../utils/shopping';
import { charCount, limitChars } from '../utils/text';

type Row = ReceiptItem & { id: string };

type Props = {
  initialItems: ReceiptItem[];
  /** OCR 원문. 개발 모드에서만 접어 둔 영역으로 보여 준다 */
  rawLines: string[];
  /** 지금 냉장고에 있는 재료 이름 */
  existingNames: string[];
  /** 체크된 이름을 넘긴다. 실패하면 보여 줄 문장을 message로 담아 reject */
  onSave: (names: string[]) => Promise<void>;
  onRetake: () => void;
};

let rowCounter = 0;
const newRowId = () => `r-${rowCounter++}`;

// 인식된 품목을 고치고 골라 냉장고에 넣는다.
export default function ReceiptReview({
  initialItems,
  rawLines,
  existingNames,
  onSave,
  onRetake,
}: Props) {
  const [rows, setRows] = useState<Row[]>(() =>
    initialItems.map((item) => ({ ...item, id: newRowId() })),
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [addText, setAddText] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [rawOpen, setRawOpen] = useState(false);
  // 저장이 끝나기 전에 다시 눌러도 한 번만 보낸다.
  const savingRef = useRef(false);

  const checkedRows = rows.filter((row) => row.checked);
  const allChecked = rows.length > 0 && checkedRows.length === rows.length;

  // 이름을 정리하고 1~20자, 목록 안 중복을 확인한다. 문제가 있으면 문장을 돌려준다.
  const validate = (name: string, exceptId?: string) => {
    const length = charCount(name);
    if (length < 1) return RECEIPT_EMPTY_NAME_MESSAGE;
    if (length > SHOPPING_NAME_MAX) return SHOPPING_TOO_LONG_MESSAGE;
    const nameKey = shoppingNameKey(name);
    if (rows.some((row) => row.id !== exceptId && shoppingNameKey(row.name) === nameKey)) {
      return RECEIPT_DUPLICATE_MESSAGE;
    }
    return null;
  };

  // 이름이 바뀌면 이유를 다시 따진다. 이미 있거나 식품이 아니면 체크를 풀어 둔다.
  const withName = (name: string) => {
    const reason = receiptNameReason(name, existingNames);
    return reason ? { name, checked: false, reason } : { name, checked: true, reason: undefined };
  };

  const startEdit = (row: Row) => {
    if (saving) return;
    setEditingId(row.id);
    setEditText(row.name);
    setEditError(null);
  };

  /** 고친 이름을 반영한다. keepOnError가 false면 잘못된 이름은 버리고 원래 이름으로 둔다. */
  const commitEdit = (keepOnError: boolean) => {
    if (!editingId) return;
    const name = normalizeShoppingName(editText);
    const invalid = validate(name, editingId);
    if (invalid) {
      if (keepOnError) {
        setEditError(invalid);
        return;
      }
    } else {
      setRows((prev) =>
        prev.map((row) =>
          row.id !== editingId || row.name === name ? row : { ...row, ...withName(name) },
        ),
      );
    }
    setEditingId(null);
    setEditError(null);
  };

  const toggle = (id: string) =>
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, checked: !row.checked } : row)));

  const toggleAll = () => setRows((prev) => prev.map((row) => ({ ...row, checked: !allChecked })));

  const remove = (id: string) => {
    if (editingId === id) setEditingId(null);
    setRows((prev) => prev.filter((row) => row.id !== id));
  };

  const submitAdd = () => {
    const name = normalizeShoppingName(addText);
    const invalid = validate(name);
    if (invalid) {
      setAddError(invalid);
      return;
    }
    setRows((prev) => [...prev, { id: newRowId(), ...withName(name) }]);
    setAddText('');
    setAddError(null);
  };

  const save = async () => {
    if (savingRef.current || checkedRows.length === 0) return;
    if (checkedRows.length > RECEIPT_MAX_SAVE) {
      setSaveError(RECEIPT_TOO_MANY_MESSAGE);
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setSaveError(null);
    try {
      await onSave(checkedRows.map((row) => row.name));
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
      savingRef.current = false;
      setSaving(false);
    }
    // 성공하면 화면이 닫히므로 버튼은 계속 막아 둔다.
  };

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {rows.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={40} color="#9CA3AF" />
            <Text style={styles.emptyText}>{RECEIPT_NO_ITEMS_MESSAGE}</Text>
            <Pressable
              accessibilityRole="button"
              disabled={saving}
              onPress={onRetake}
              style={({ pressed }) => [styles.outlineButton, pressed && styles.pressed]}
            >
              <Text style={styles.outlineButtonText}>다시 찍기</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.header}>
            <Text style={styles.headerText}>
              인식된 품목 {rows.length}개 · {checkedRows.length}개 선택
            </Text>
            <Pressable
              accessibilityRole="button"
              disabled={saving}
              onPress={toggleAll}
              hitSlop={6}
              style={({ pressed }) => [pressed && styles.pressed]}
            >
              <Text style={styles.headerAction}>{allChecked ? '전체 해제' : '전체 선택'}</Text>
            </Pressable>
          </View>
        )}

        {rows.length > 0 && (
          <View style={styles.list}>
            {rows.map((row) => {
              const editing = editingId === row.id;
              return (
                <View key={row.id} style={styles.row}>
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityLabel={row.name}
                    accessibilityState={{ checked: row.checked, disabled: saving }}
                    disabled={saving}
                    hitSlop={8}
                    onPress={() => toggle(row.id)}
                  >
                    <Ionicons
                      name={row.checked ? 'checkbox' : 'square-outline'}
                      size={26}
                      color={row.checked ? '#FF5A5F' : '#9CA3AF'}
                    />
                  </Pressable>

                  <View style={styles.rowBody}>
                    {editing ? (
                      <>
                        <TextInput
                          autoFocus
                          value={editText}
                          onChangeText={(text) => {
                            setEditText(limitChars(text, SHOPPING_NAME_MAX));
                            setEditError(null);
                          }}
                          onSubmitEditing={() => commitEdit(true)}
                          onBlur={() => commitEdit(false)}
                          returnKeyType="done"
                          blurOnSubmit={false}
                          style={[styles.editInput, editError ? styles.inputInvalid : null]}
                        />
                        {editError ? <Text style={styles.inputError}>{editError}</Text> : null}
                      </>
                    ) : (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityHint="누르면 이름을 고칠 수 있어요"
                        disabled={saving}
                        onPress={() => startEdit(row)}
                      >
                        <Text style={styles.name}>{row.name}</Text>
                        {row.reason ? <Text style={styles.reason}>{row.reason}</Text> : null}
                      </Pressable>
                    )}
                  </View>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${row.name} 삭제`}
                    disabled={saving}
                    hitSlop={8}
                    onPress={() => remove(row.id)}
                    style={({ pressed }) => [pressed && styles.pressed]}
                  >
                    <Ionicons name="trash-outline" size={22} color="#9CA3AF" />
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}

        {adding ? (
          <View>
            <View style={styles.addRow}>
              <TextInput
                autoFocus
                value={addText}
                onChangeText={(text) => {
                  setAddText(limitChars(text, SHOPPING_NAME_MAX));
                  setAddError(null);
                }}
                onSubmitEditing={submitAdd}
                placeholder="빠진 품목 이름"
                placeholderTextColor="#9CA3AF"
                returnKeyType="done"
                blurOnSubmit={false}
                style={[styles.addInput, addError ? styles.inputInvalid : null]}
              />
              <Pressable
                accessibilityRole="button"
                disabled={saving}
                onPress={submitAdd}
                style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
              >
                <Text style={styles.addButtonText}>추가</Text>
              </Pressable>
            </View>
            {addError ? <Text style={styles.inputError}>{addError}</Text> : null}
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            disabled={saving}
            onPress={() => setAdding(true)}
            style={({ pressed }) => [styles.directAdd, pressed && styles.pressed]}
          >
            <Ionicons name="add" size={20} color="#6B7280" />
            <Text style={styles.directAddText}>직접 추가</Text>
          </Pressable>
        )}

        {__DEV__ && (
          <View style={styles.raw}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setRawOpen((open) => !open)}
              style={styles.rawHeader}
            >
              <Text style={styles.rawTitle}>
                인식된 원문 보기 ({rawLines.length}줄) · 개발 모드 전용
              </Text>
              <Ionicons name={rawOpen ? 'chevron-up' : 'chevron-down'} size={18} color="#6B7280" />
            </Pressable>
            {rawOpen && (
              <Text selectable style={styles.rawText}>
                {rawLines.length > 0 ? rawLines.join('\n') : '(인식된 글자가 없어요)'}
              </Text>
            )}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {saveError ? <Text style={styles.saveError}>{saveError}</Text> : null}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: checkedRows.length === 0 || saving, busy: saving }}
          disabled={checkedRows.length === 0 || saving}
          onPress={save}
          style={({ pressed }) => [
            styles.primaryButton,
            checkedRows.length === 0 && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>{checkedRows.length}개 냉장고에 넣기</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    padding: 24,
    gap: 20,
  },
  empty: {
    alignItems: 'center',
    gap: 14,
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#374151',
    textAlign: 'center',
  },
  outlineButton: {
    paddingHorizontal: 20,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  headerText: {
    flexShrink: 1,
    fontSize: 14,
    color: '#6B7280',
  },
  headerAction: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF5A5F',
  },
  list: {
    gap: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowBody: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    color: '#111',
  },
  reason: {
    marginTop: 2,
    fontSize: 12,
    color: '#9CA3AF',
  },
  editInput: {
    height: 40,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 10,
    fontSize: 16,
    color: '#111',
  },
  inputInvalid: {
    borderColor: '#EF4444',
  },
  inputError: {
    marginTop: 4,
    fontSize: 12,
    color: '#EF4444',
  },
  addRow: {
    flexDirection: 'row',
    gap: 8,
  },
  addInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#111',
  },
  addButton: {
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
  },
  directAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#9CA3AF',
  },
  directAddText: {
    fontSize: 15,
    color: '#6B7280',
  },
  raw: {
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    padding: 12,
    gap: 8,
  },
  rawHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  rawTitle: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  rawText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#374151',
    fontFamily: 'monospace',
  },
  footer: {
    padding: 16,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  saveError: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
  },
  primaryButton: {
    height: 54,
    borderRadius: 14,
    backgroundColor: '#FF5A5F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.7,
  },
});
