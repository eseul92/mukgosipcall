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
import { SHOPPING_WRITE_FAILED_MESSAGE } from '../constants/shopping';
import { useFamilyData } from '../context/FamilyDataContext';
import useToast from '../hooks/useToast';
import type { ShoppingItem } from '../types/models';
import ConfirmDialog from './ConfirmDialog';
import Toast from './Toast';

// 오프라인에서는 쓰기가 서버 확인을 기다리며 오래 걸린다. 목록에는 바로 반영되므로
// 이 시간이 지나면 버튼을 풀어 준다(쓰기는 연결되면 이어서 반영된다).
const WRITE_WAIT_MS = 8000;
const BULK = 'bulk';
const ADD = 'add';

const withTimeout = (work: Promise<unknown>) =>
  Promise.race([work, new Promise<void>((resolve) => setTimeout(resolve, WRITE_WAIT_MS))]);

export default function ShoppingList() {
  const {
    shoppingItems,
    shoppingStatus,
    members,
    addShoppingItem,
    setShoppingItemDone,
    removeShoppingItem,
    clearDoneShoppingItems,
    moveShoppingItemsToFridge,
  } = useFamilyData();
  const { message: toast, show: showToast } = useToast();
  const [text, setText] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  // 닫히는 애니메이션 동안에도 이름이 남도록, 대상은 비우지 않고 표시 여부만 끈다.
  const [deleteTarget, setDeleteTarget] = useState<ShoppingItem | null>(null);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [clearVisible, setClearVisible] = useState(false);

  // 같은 동작이 끝나기 전에 다시 눌러도 한 번만 보낸다. 모두 지우기·넣기는 다른 동작과 겹치지 않는다.
  const inFlight = useRef(new Set<string>());
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());

  const run = async (key: string, work: () => Promise<unknown>, onError?: () => void) => {
    const active = inFlight.current;
    if (active.has(key) || active.has(BULK) || (key === BULK && active.size > 0)) return;

    active.add(key);
    setPending(new Set(active));
    try {
      await withTimeout(work());
    } catch (e) {
      console.warn('장보기를 저장하지 못했어요', e);
      if (onError) onError();
      else showToast(SHOPPING_WRITE_FAILED_MESSAGE, 3000);
    } finally {
      active.delete(key);
      setPending(new Set(active));
    }
  };

  const nameOf = (userId: string) => members.find((m) => m.userId === userId)?.name;

  const todo = shoppingItems.filter((item) => !item.done);
  const done = shoppingItems.filter((item) => item.done);
  const bulkBusy = pending.has(BULK);
  const anyBusy = pending.size > 0;

  const submit = () =>
    run(
      ADD,
      async () => {
        const message = await addShoppingItem(text);
        if (message) {
          setInputError(message);
        } else {
          setText('');
          setInputError(null);
        }
      },
      () => setInputError(SHOPPING_WRITE_FAILED_MESSAGE),
    );

  const fridgeMessage = (moved: number, added: number) =>
    added === moved
      ? '냉장고에 넣었어요'
      : `냉장고에 넣었어요 (이미 있는 재료 ${moved - added}개는 목록에서만 지웠어요)`;

  const moveOne = (item: ShoppingItem) =>
    run(`move:${item.id}`, async () => {
      const added = await moveShoppingItemsToFridge([item.id]);
      showToast(fridgeMessage(1, added), 2500);
    });

  const moveAll = () =>
    run(BULK, async () => {
      const added = await moveShoppingItemsToFridge(done.map((item) => item.id));
      showToast(fridgeMessage(done.length, added), 2500);
    });

  const askDelete = (item: ShoppingItem) => {
    setDeleteTarget(item);
    setDeleteVisible(true);
  };

  if (shoppingStatus === 'loading') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#FF5A5F" />
      </View>
    );
  }

  if (shoppingStatus === 'error') {
    return (
      <View style={styles.centered}>
        <Text style={styles.stateTitle}>장보기 목록을 불러오지 못했어요</Text>
        <Text style={styles.stateDescription}>잠시 후 앱을 다시 열어 주세요.</Text>
      </View>
    );
  }

  const renderRow = (item: ShoppingItem) => {
    const adder = nameOf(item.addedBy);
    const toggling = pending.has(`done:${item.id}`);
    const moving = pending.has(`move:${item.id}`);
    return (
      <Pressable
        key={item.id}
        onLongPress={() => (item.done ? moveOne(item) : askDelete(item))}
        accessibilityHint={
          item.done ? '길게 누르면 냉장고에 넣어요' : '길게 누르면 삭제할 수 있어요'
        }
        style={({ pressed }) => [styles.row, item.done && styles.rowDone, pressed && styles.pressed]}
      >
        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel={item.name}
          accessibilityState={{ checked: item.done, busy: toggling }}
          disabled={toggling || moving}
          hitSlop={8}
          onPress={() => run(`done:${item.id}`, () => setShoppingItemDone(item.id, !item.done))}
        >
          <Ionicons
            name={item.done ? 'checkmark-circle' : 'ellipse-outline'}
            size={28}
            color={item.done ? '#FF5A5F' : '#9CA3AF'}
          />
        </Pressable>
        <View style={styles.rowBody}>
          <Text style={[styles.name, item.done && styles.nameDone]} numberOfLines={2}>
            {item.name}
          </Text>
          {adder ? <Text style={styles.adder}>{adder}</Text> : null}
        </View>
        {item.done && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${item.name} 냉장고에 넣기`}
            disabled={toggling || moving || bulkBusy}
            onPress={() => moveOne(item)}
            hitSlop={6}
            style={({ pressed }) => [styles.smallButton, pressed && styles.pressed]}
          >
            {moving ? (
              <ActivityIndicator size="small" color="#374151" />
            ) : (
              <Text style={styles.smallButtonText}>냉장고에 넣기</Text>
            )}
          </Pressable>
        )}
      </Pressable>
    );
  };

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>장보기</Text>

        <View>
          <View style={styles.inputRow}>
            <TextInput
              value={text}
              onChangeText={(value) => {
                setText(value);
                setInputError(null);
              }}
              onSubmitEditing={submit}
              placeholder="살 것을 입력하세요"
              placeholderTextColor="#9CA3AF"
              returnKeyType="done"
              blurOnSubmit={false}
              style={[styles.input, inputError ? styles.inputInvalid : null]}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ busy: pending.has(ADD) }}
              disabled={pending.has(ADD)}
              onPress={submit}
              style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
            >
              {pending.has(ADD) ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.addButtonText}>추가</Text>
              )}
            </Pressable>
          </View>
          {inputError ? <Text style={styles.inputError}>{inputError}</Text> : null}
        </View>

        <View>
          <Text style={styles.sectionTitle}>살 것</Text>
          {todo.length === 0 ? (
            <Text style={styles.empty}>장볼 것이 없어요</Text>
          ) : (
            <View style={styles.list}>{todo.map(renderRow)}</View>
          )}
        </View>

        {done.length > 0 && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, styles.sectionTitleInline]}>산 것</Text>
              <View style={styles.headerActions}>
                <Pressable
                  accessibilityRole="button"
                  disabled={anyBusy}
                  onPress={moveAll}
                  hitSlop={6}
                  style={({ pressed }) => [pressed && styles.pressed]}
                >
                  {bulkBusy ? (
                    <ActivityIndicator size="small" color="#FF5A5F" />
                  ) : (
                    <Text style={[styles.headerAction, anyBusy && styles.disabled]}>
                      모두 냉장고에 넣기
                    </Text>
                  )}
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={anyBusy}
                  onPress={() => setClearVisible(true)}
                  hitSlop={6}
                  style={({ pressed }) => [pressed && styles.pressed]}
                >
                  <Text
                    style={[styles.headerAction, styles.headerActionMuted, anyBusy && styles.disabled]}
                  >
                    모두 지우기
                  </Text>
                </Pressable>
              </View>
            </View>
            <View style={styles.list}>{done.map(renderRow)}</View>
          </View>
        )}
      </ScrollView>

      <Toast message={toast} />

      <ConfirmDialog
        visible={deleteVisible}
        title={`${deleteTarget?.name ?? ''} 삭제할까요?`}
        confirmLabel="삭제"
        onCancel={() => setDeleteVisible(false)}
        onConfirm={() => {
          setDeleteVisible(false);
          if (deleteTarget) {
            const { id } = deleteTarget;
            run(`delete:${id}`, () => removeShoppingItem(id));
          }
        }}
      />

      <ConfirmDialog
        visible={clearVisible}
        title="산 것을 모두 지울까요?"
        message={`산 것 ${done.length}개가 목록에서 사라져요.`}
        confirmLabel="모두 지우기"
        onCancel={() => setClearVisible(false)}
        onConfirm={() => {
          setClearVisible(false);
          run(BULK, clearDoneShoppingItems);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
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
  content: {
    padding: 24,
    gap: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#111',
  },
  inputInvalid: {
    borderColor: '#EF4444',
  },
  inputError: {
    marginTop: 6,
    fontSize: 13,
    color: '#EF4444',
  },
  addButton: {
    minWidth: 64,
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FF5A5F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    marginBottom: 12,
  },
  sectionTitleInline: {
    marginBottom: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  headerAction: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF5A5F',
  },
  headerActionMuted: {
    color: '#6B7280',
  },
  disabled: {
    opacity: 0.4,
  },
  empty: {
    fontSize: 15,
    color: '#6B7280',
  },
  list: {
    gap: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowDone: {
    opacity: 0.5,
  },
  rowBody: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    color: '#111',
  },
  nameDone: {
    textDecorationLine: 'line-through',
  },
  adder: {
    marginTop: 2,
    fontSize: 13,
    color: '#6B7280',
  },
  smallButton: {
    minWidth: 84,
    paddingHorizontal: 10,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  pressed: {
    opacity: 0.7,
  },
});
