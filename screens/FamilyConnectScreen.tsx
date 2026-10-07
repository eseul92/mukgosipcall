import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFamilyData } from '../context/FamilyDataContext';

export default function FamilyConnectScreen() {
  const { joinFamily, createFamily } = useFamilyData();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const finish = async (action: () => Promise<void>) => {
    try {
      await action();
      router.dismissTo('/family');
    } catch (e) {
      setError(e instanceof Error ? e.message : '다시 시도해주세요');
    }
  };

  const connect = () => finish(() => joinFamily(code));
  const create = () => finish(() => createFamily('우리 가족'));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>가족과 연결해요</Text>
      <Text style={styles.description}>가족에게 받은 6자리 초대 코드를 입력하세요.</Text>

      <TextInput
        value={code}
        onChangeText={(text) => {
          setError(null);
          setCode(text.replace(/\D/g, '').slice(0, 6));
        }}
        onSubmitEditing={() => code.length === 6 && connect()}
        placeholder="000000"
        placeholderTextColor="#D1D5DB"
        keyboardType="number-pad"
        maxLength={6}
        style={styles.input}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        accessibilityRole="button"
        disabled={code.length !== 6}
        onPress={connect}
        style={({ pressed }) => [
          styles.primaryButton,
          code.length !== 6 && styles.disabled,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.primaryButtonText}>연결하기</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={create}
        style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
      >
        <Text style={styles.secondaryButtonText}>새 가족 만들기</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111',
  },
  description: {
    marginTop: 8,
    fontSize: 15,
    color: '#6B7280',
  },
  input: {
    marginTop: 28,
    height: 64,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 14,
    textAlign: 'center',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 8,
    color: '#111',
  },
  error: {
    marginTop: 12,
    fontSize: 14,
    color: '#EF4444',
  },
  primaryButton: {
    marginTop: 16,
    height: 56,
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
  secondaryButton: {
    marginTop: 12,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
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
});
