import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAppData } from '../context/AppDataContext';

export default function FamilyConnectScreen() {
  const { joinFamily } = useAppData();
  const [code, setCode] = useState('');

  // 실제 초대 코드 검증은 아직 없다. 연결된 척만 한다.
  const connect = () => {
    joinFamily();
    router.dismissTo('/family');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>가족과 연결해요</Text>
      <Text style={styles.description}>가족에게 받은 6자리 초대 코드를 입력하세요.</Text>

      <TextInput
        value={code}
        onChangeText={(text) => setCode(text.replace(/\D/g, '').slice(0, 6))}
        onSubmitEditing={() => code.length === 6 && connect()}
        placeholder="000000"
        placeholderTextColor="#D1D5DB"
        keyboardType="number-pad"
        maxLength={6}
        style={styles.input}
      />

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
        onPress={connect}
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
