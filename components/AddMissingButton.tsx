import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

type Props = {
  loading: boolean;
  onPress: () => void;
};

// 추천 카드의 "부족한 재료"를 장보기에 담는 버튼
export default function AddMissingButton({ loading, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: loading }}
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#FF5A5F" />
      ) : (
        <Text style={styles.text}>부족한 재료 장보기에 추가</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 14,
    minWidth: 120,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#FF5A5F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF5A5F',
  },
  pressed: {
    opacity: 0.7,
  },
});
