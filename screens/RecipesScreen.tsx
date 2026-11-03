import { ScrollView, StyleSheet, Text, View } from 'react-native';
import AddMissingButton from '../components/AddMissingButton';
import Toast from '../components/Toast';
import { RECOMMEND_NO_INGREDIENTS, RECOMMEND_NO_MATCH } from '../constants/call';
import { useFamilyData } from '../context/FamilyDataContext';
import useAddMissingToShopping from '../hooks/useAddMissingToShopping';
import useDishRecommendations from '../hooks/useDishRecommendations';
import useToast from '../hooks/useToast';

export default function RecipesScreen() {
  const { ingredients } = useFamilyData();
  const names = ingredients.map((item) => item.name);
  const dishes = useDishRecommendations(names);
  const { message: toast, show: showToast } = useToast();
  const { addMissing, busyDish, dialogs } = useAddMissingToShopping(showToast);

  return (
    <View style={styles.container}>
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {names.length > 0 && <Text style={styles.subtitle}>{names.join(', ')}(으)로 만들 수 있어요</Text>}

      {names.length === 0 ? (
        <Text style={styles.subtitle}>{RECOMMEND_NO_INGREDIENTS}</Text>
      ) : dishes === null ? null : dishes.length === 0 ? (
        <Text style={styles.subtitle}>{RECOMMEND_NO_MATCH}</Text>
      ) : (
        dishes.map((dish) => (
          <View key={dish.name} style={styles.card}>
            <Text style={styles.name}>{dish.name}</Text>
            <Text style={styles.description}>{dish.description}</Text>
            <Text style={[styles.ingredients, dish.missing.length === 0 && styles.complete]}>
              {dish.missing.length === 0
                ? '재료가 모두 있어요'
                : `부족한 재료: ${dish.missing.join(', ')}`}
            </Text>
            {dish.missing.length > 0 && (
              <AddMissingButton
                loading={busyDish === dish.name}
                onPress={() => addMissing(dish)}
              />
            )}
          </View>
        ))
      )}
    </ScrollView>
    <Toast message={toast} />
    {dialogs}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 24,
    gap: 12,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 4,
  },
  card: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 16,
    gap: 6,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: '#374151',
  },
  ingredients: {
    fontSize: 13,
    color: '#6B7280',
  },
  complete: {
    color: '#16A34A',
  },
});
