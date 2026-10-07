import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAppData } from '../context/AppDataContext';
import { CallSource, ME, MEAL_TYPES, MEMO_PRESETS, MealType } from '../data/dummy';

const SOURCES: CallSource[] = ['recommended', 'frequent', 'custom'];

export default function CallConfirmScreen() {
  const { menu, source } = useLocalSearchParams<{ menu?: string; source?: string }>();
  const { addCall } = useAppData();
  const [mealType, setMealType] = useState<MealType>(MEAL_TYPES[0]);
  const [memo, setMemo] = useState('');

  const callSource = SOURCES.find((s) => s === source) ?? 'custom';

  const togglePreset = (preset: string) =>
    setMemo((prev) =>
      prev.includes(preset)
        ? prev.replace(preset, '').replace(/\s+/g, ' ').trim()
        : `${prev.trim()} ${preset}`.trim(),
    );

  const send = () => {
    if (!menu) return;
    const trimmedMemo = memo.trim();
    addCall({
      sender: ME,
      message: `${menu} ${mealType}`,
      menu,
      mealType,
      memo: trimmedMemo || undefined,
      source: callSource,
    });
    router.dismissTo('/');
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.menuCard}>
        <Text style={styles.menuLabel}>선택한 메뉴</Text>
        <Text style={styles.menuName}>{menu}</Text>
      </View>

      <View style={styles.segments}>
        {MEAL_TYPES.map((type) => {
          const selected = type === mealType;
          return (
            <Pressable
              key={type}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setMealType(type)}
              style={[styles.segment, selected && styles.segmentSelected]}
            >
              <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>{type}</Text>
            </Pressable>
          );
        })}
      </View>

      <TextInput
        value={memo}
        onChangeText={setMemo}
        placeholder="메모 (선택)"
        placeholderTextColor="#9CA3AF"
        multiline
        style={styles.memo}
      />

      <View style={styles.presets}>
        {MEMO_PRESETS.map((preset) => {
          const selected = memo.includes(preset);
          return (
            <Pressable
              key={preset}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => togglePreset(preset)}
              style={[styles.preset, selected && styles.presetSelected]}
            >
              <Text style={[styles.presetText, selected && styles.presetTextSelected]}>{preset}</Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        accessibilityRole="button"
        disabled={!menu}
        onPress={send}
        style={({ pressed }) => [styles.sendButton, pressed && styles.pressed]}
      >
        <Text style={styles.sendText}>콜 보내기</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 24,
    gap: 20,
  },
  menuCard: {
    backgroundColor: '#FFF1F0',
    borderRadius: 16,
    padding: 20,
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF5A5F',
  },
  menuName: {
    marginTop: 4,
    fontSize: 26,
    fontWeight: '700',
    color: '#111',
  },
  segments: {
    flexDirection: 'row',
    gap: 8,
  },
  segment: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentSelected: {
    borderColor: '#111',
    backgroundColor: '#111',
  },
  segmentText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  segmentTextSelected: {
    color: '#fff',
  },
  memo: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#111',
    textAlignVertical: 'top',
  },
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: -8,
  },
  preset: {
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetSelected: {
    backgroundColor: '#111',
  },
  presetText: {
    fontSize: 14,
    color: '#111',
  },
  presetTextSelected: {
    color: '#fff',
  },
  sendButton: {
    height: 56,
    borderRadius: 14,
    backgroundColor: '#FF5A5F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  pressed: {
    opacity: 0.7,
  },
});
