import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { RECIPES } from '../data/dummy';

export default function RecipesScreen() {
  const { ingredients } = useLocalSearchParams<{ ingredients?: string }>();
  const list = ingredients ? ingredients.split(',').filter(Boolean) : [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.subtitle}>
        {list.length > 0 ? `${list.join(', ')}(으)로 만들 수 있어요` : '이런 요리는 어때요?'}
      </Text>

      {RECIPES.map((recipe) => (
        <View key={recipe.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.name}>{recipe.name}</Text>
            <Text style={styles.time}>{recipe.time}</Text>
          </View>
          <Text style={styles.description}>{recipe.description}</Text>
          <Text style={styles.ingredients}>재료: {recipe.ingredients.join(', ')}</Text>
        </View>
      ))}
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  time: {
    fontSize: 13,
    color: '#6B7280',
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
});
