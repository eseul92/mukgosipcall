import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAppData } from '../context/AppDataContext';
import { ME, REPLY_LABELS, Reply } from '../data/dummy';

const REPLIES = Object.keys(REPLY_LABELS) as Reply[];

export default function RespondScreen() {
  const { callId } = useLocalSearchParams<{ callId?: string }>();
  const { calls, respondToCall } = useAppData();
  const call = calls.find((c) => c.id === callId);

  if (!call) {
    return (
      <View style={styles.container}>
        <Text style={styles.notFound}>콜을 찾을 수 없어요</Text>
      </View>
    );
  }

  const reply = (value: Reply) => {
    respondToCall(call.id, ME, value);
    router.back();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.callCard}>
        <View style={styles.senderRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{call.sender.charAt(0)}</Text>
          </View>
          <Text style={styles.sender}>{call.sender}</Text>
          <Text style={styles.time}>{call.time}</Text>
        </View>
        <Text style={styles.menu}>{call.menu}</Text>
        <Text style={styles.mealType}>{call.mealType}</Text>
        {call.memo ? <Text style={styles.memo}>{call.memo}</Text> : null}
      </View>

      <View style={styles.buttons}>
        {REPLIES.map((value) => (
          <Pressable
            key={value}
            accessibilityRole="button"
            onPress={() => reply(value)}
            style={({ pressed }) => [
              styles.button,
              value === 'cook' && styles.cookButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.buttonText, value === 'cook' && styles.cookText]}>
              {REPLY_LABELS[value]}
            </Text>
          </Pressable>
        ))}
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
  notFound: {
    padding: 24,
    fontSize: 15,
    color: '#6B7280',
  },
  callCard: {
    backgroundColor: '#FFF1F0',
    borderRadius: 20,
    padding: 20,
    gap: 4,
  },
  senderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  sender: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
  },
  time: {
    fontSize: 13,
    color: '#6B7280',
  },
  menu: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111',
  },
  mealType: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF5A5F',
  },
  memo: {
    marginTop: 8,
    fontSize: 15,
    color: '#374151',
  },
  buttons: {
    gap: 12,
  },
  button: {
    height: 64,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cookButton: {
    backgroundColor: '#FF5A5F',
    borderColor: '#FF5A5F',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  cookText: {
    color: '#fff',
  },
  pressed: {
    opacity: 0.7,
  },
});
