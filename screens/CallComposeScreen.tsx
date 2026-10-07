import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAppData } from '../context/AppDataContext';
import { CallSource, FREQUENT_MENUS, RECIPES } from '../data/dummy';

function goConfirm(menu: string, source: CallSource) {
  router.push({ pathname: '/call-confirm', params: { menu, source } });
}

export default function CallComposeScreen() {
  const { ingredients } = useAppData();
  const [text, setText] = useState('');

  const submitCustom = () => {
    const menu = text.trim();
    if (menu) goConfirm(menu, 'custom');
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.inputRow}>
        <TextInput
          value={text}
          onChangeText={setText}
          onSubmitEditing={submitCustom}
          placeholder="먹고 싶은 걸 입력하세요"
          placeholderTextColor="#9CA3AF"
          returnKeyType="next"
          style={styles.input}
        />
        <Pressable
          accessibilityRole="button"
          disabled={!text.trim()}
          onPress={submitCustom}
          style={({ pressed }) => [
            styles.nextButton,
            !text.trim() && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.nextText}>다음</Text>
        </Pressable>
      </View>

      <View>
        <Text style={styles.sectionTitle}>냉장고 재료로 만들 수 있어요</Text>
        {ingredients.length === 0 ? (
          <Text style={styles.emptyText}>
            냉장고에 등록된 재료가 없어요. 홈에서 재료를 추가하면 만들 수 있는 요리를 추천해드려요.
          </Text>
        ) : (
          <View style={styles.cards}>
            {RECIPES.map((recipe) => {
              const missing = recipe.ingredients.filter((item) => !ingredients.includes(item));
              return (
                <Pressable
                  key={recipe.id}
                  accessibilityRole="button"
                  onPress={() => goConfirm(recipe.name, 'recommended')}
                  style={({ pressed }) => [styles.card, pressed && styles.pressed]}
                >
                  <Text style={styles.cardName}>{recipe.name}</Text>
                  <Text style={[styles.cardMissing, missing.length === 0 && styles.cardComplete]}>
                    {missing.length === 0 ? '재료가 모두 있어요' : `부족한 재료: ${missing.join(', ')}`}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      <View>
        <Text style={styles.sectionTitle}>자주 먹는 메뉴</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          keyboardShouldPersistTaps="handled"
        >
          {FREQUENT_MENUS.map((menu) => (
            <Pressable
              key={menu}
              accessibilityRole="button"
              onPress={() => goConfirm(menu, 'frequent')}
              style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
            >
              <Text style={styles.chipText}>{menu}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
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
    gap: 28,
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
  nextButton: {
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.7,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#6B7280',
  },
  cards: {
    gap: 10,
  },
  card: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    padding: 16,
    gap: 4,
  },
  cardName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111',
  },
  cardMissing: {
    fontSize: 14,
    color: '#6B7280',
  },
  cardComplete: {
    color: '#16A34A',
  },
  chips: {
    gap: 8,
    paddingRight: 24,
  },
  chip: {
    paddingHorizontal: 16,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 15,
    color: '#111',
  },
});
