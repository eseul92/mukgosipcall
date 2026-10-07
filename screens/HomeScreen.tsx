import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ConfirmDialog from '../components/ConfirmDialog';
import IngredientSection from '../components/IngredientSection';
import LoginPromptSheet from '../components/LoginPromptSheet';
import Toast from '../components/Toast';
import { REPLY_LABELS } from '../constants/call';
import { useAuth } from '../context/AuthContext';
import { useFamilyData } from '../context/FamilyDataContext';
import useLoginHandlers from '../hooks/useLoginHandlers';
import useToast from '../hooks/useToast';
import { formatRelativeTime } from '../utils/time';

const RECENT_COUNT = 3;

type Action = 'sendCall' | 'respond' | 'connectFamily';

const PROMPTS: Record<Action, { title: string; description: string }> = {
  sendCall: {
    title: '가족에게 콜을 보내려면 로그인이 필요해요',
    description: '로그인하면 먹고 싶은 걸 가족에게 바로 알릴 수 있어요.',
  },
  respond: {
    title: '콜에 응답하려면 로그인이 필요해요',
    description: '로그인하면 가족의 콜에 바로 답장할 수 있어요.',
  },
  connectFamily: {
    title: '가족과 연결하려면 로그인이 필요해요',
    description: '로그인하면 가족을 초대하고 함께 먹을 메뉴를 정할 수 있어요.',
  },
};

export default function HomeScreen() {
  const { isGuest } = useAuth();
  const { user, ingredients, addIngredient, removeIngredient, calls, hasFamily, getMemberName } =
    useFamilyData();
  const [needFamily, setNeedFamily] = useState(false);
  const [promptFor, setPromptFor] = useState<Action | null>(null);
  const { message: toast, show: showToast } = useToast();
  const { error: loginError, clearError, onGoogle } = useLoginHandlers((notice) =>
    showToast(notice, 4000),
  );

  const run = (action: Action, callId?: string) => {
    if (isGuest) {
      setPromptFor(action);
    } else if (action === 'sendCall') {
      if (hasFamily) router.push('/call');
      else setNeedFamily(true);
    } else if (action === 'connectFamily') {
      router.push('/family-connect');
    } else {
      router.push({ pathname: '/respond', params: { callId } });
    }
  };

  const closePrompt = () => {
    setPromptFor(null);
    clearError();
  };

  // 취소나 오류면 시트를 열어 둔 채 머문다.
  const handleGoogle = async () => {
    const result = await onGoogle();
    if (result?.status === 'success') closePrompt();
  };

  const prompt = promptFor ? PROMPTS[promptFor] : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.titleRow}>
          <Text style={styles.title}>먹고싶콜</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="알림"
            hitSlop={8}
            onPress={() => showToast('새 알림이 없어요')}
          >
            <Ionicons name="notifications-outline" size={26} color="#111" />
          </Pressable>
        </View>

        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>오늘의 한 끼</Text>
          <Text style={styles.heroTitle}>뭐 먹고 싶어?</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => run('sendCall')}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          >
            <Text style={styles.primaryButtonText}>가족에게 콜 보내기</Text>
          </Pressable>
        </View>

        <IngredientSection
          ingredients={ingredients}
          onAdd={addIngredient}
          onRemove={removeIngredient}
        />

        <Pressable
          accessibilityRole="button"
          onPress={() =>
            router.push({
              pathname: '/recipes',
              params: { ingredients: ingredients.map((item) => item.name).join(',') },
            })
          }
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
        >
          <Text style={styles.secondaryButtonText}>이 재료로 요리 추천받기</Text>
        </Pressable>

        <View>
          <Text style={styles.sectionTitle}>가족 최근 콜</Text>
          {isGuest || !hasFamily ? (
            <View style={styles.noFamily}>
              <Text style={styles.noFamilyText}>가족과 연결하면 최근 콜을 볼 수 있어요</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => run('connectFamily')}
                style={({ pressed }) => [styles.respondButton, pressed && styles.pressed]}
              >
                <Text style={styles.respondText}>가족 연결하기</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.calls}>
              {calls.slice(0, RECENT_COUNT).map((call) => (
                <View key={call.id} style={styles.callRow}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{getMemberName(call.senderId).charAt(0)}</Text>
                  </View>
                  <View style={styles.callBody}>
                    <Text style={styles.callMessage} numberOfLines={2}>
                      {call.menu} {call.mealType}
                    </Text>
                    {call.memo ? <Text style={styles.callMemo}>{call.memo}</Text> : null}
                    <Text style={styles.callTime}>
                      {getMemberName(call.senderId)} · {formatRelativeTime(call.createdAt)}
                    </Text>
                    {call.responses.length > 0 ? (
                      <View style={styles.responses}>
                        {call.responses.map((r) => (
                          <View key={r.userId} style={styles.responseBadge}>
                            <View style={styles.responseAvatar}>
                              <Text style={styles.responseAvatarText}>
                                {getMemberName(r.userId).charAt(0)}
                              </Text>
                            </View>
                            <Text style={styles.responseText}>{REPLY_LABELS[r.value]}</Text>
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </View>
                  {call.senderId !== user.id && (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => run('respond', call.id)}
                      style={({ pressed }) => [styles.respondButton, pressed && styles.pressed]}
                    >
                      <Text style={styles.respondText}>
                        {call.responses.some((r) => r.userId === user.id) ? '응답 수정' : '응답하기'}
                      </Text>
                    </Pressable>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <Toast message={toast} />

      <ConfirmDialog
        visible={needFamily}
        title="가족과 연결해야 콜을 보낼 수 있어요"
        message="초대 코드를 입력해 가족과 먼저 연결해주세요."
        confirmLabel="가족 연결하기"
        destructive={false}
        onCancel={() => setNeedFamily(false)}
        onConfirm={() => {
          setNeedFamily(false);
          router.push('/family-connect');
        }}
      />

      <LoginPromptSheet
        visible={prompt !== null}
        title={prompt?.title ?? ''}
        description={prompt?.description ?? ''}
        onClose={closePrompt}
        onGooglePress={handleGoogle}
        errorMessage={loginError}
      />
    </SafeAreaView>
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111',
  },
  heroCard: {
    backgroundColor: '#FFF1F0',
    borderRadius: 20,
    padding: 20,
  },
  heroLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF5A5F',
  },
  heroTitle: {
    marginTop: 4,
    fontSize: 26,
    fontWeight: '700',
    color: '#111',
  },
  primaryButton: {
    marginTop: 20,
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
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -8,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    marginBottom: 12,
  },
  calls: {
    gap: 14,
  },
  callRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  callBody: {
    flex: 1,
  },
  callMessage: {
    fontSize: 15,
    color: '#111',
  },
  callMemo: {
    marginTop: 2,
    fontSize: 13,
    color: '#374151',
  },
  callTime: {
    marginTop: 2,
    fontSize: 13,
    color: '#6B7280',
  },
  noFamily: {
    alignItems: 'center',
    gap: 12,
  },
  noFamilyText: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
  },
  responses: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  responseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 10,
    paddingLeft: 3,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  responseAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  responseAvatarText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#374151',
  },
  responseText: {
    fontSize: 12,
    color: '#374151',
  },
  respondButton: {
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  respondText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  pressed: {
    opacity: 0.7,
  },
});
