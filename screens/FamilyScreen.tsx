import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ConfirmDialog from '../components/ConfirmDialog';
import LoginPromptSheet from '../components/LoginPromptSheet';
import Toast from '../components/Toast';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { FAMILY, MEMBERS, REPLY_LABELS, RecentCall } from '../data/dummy';
import useToast from '../hooks/useToast';

function responseSummary(call: RecentCall) {
  if (!call.responses?.length) return '응답 대기 중';
  return call.responses.map((r) => `${r.by} ${REPLY_LABELS[r.value]}`).join(' · ');
}

export default function FamilyScreen() {
  const { isGuest, signIn } = useAuth();
  const { calls, hasFamily, leaveFamily } = useAppData();
  const { message: toast, show: showToast } = useToast();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const copyCode = async () => {
    try {
      await Clipboard.setStringAsync(FAMILY.inviteCode);
      showToast('초대 코드를 복사했어요');
    } catch {
      showToast('복사하지 못했어요');
    }
  };

  const shareCode = async () => {
    try {
      await Share.share({
        message: `먹고싶콜에서 같이 밥 정해요. 초대 코드: ${FAMILY.inviteCode}`,
      });
    } catch {
      showToast('이 환경에서는 공유할 수 없어요');
    }
  };

  const confirmLeave = () => {
    setLeaving(false);
    leaveFamily();
    router.push('/family-connect');
  };

  if (isGuest) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}>
          <Text style={styles.guestTitle}>가족과 연결하려면 로그인이 필요해요</Text>
          <Text style={styles.guestDescription}>
            로그인하면 가족을 초대하고 함께 먹을 메뉴를 정할 수 있어요.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setSheetOpen(true)}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          >
            <Text style={styles.primaryButtonText}>로그인하기</Text>
          </Pressable>
        </View>

        <LoginPromptSheet
          visible={sheetOpen}
          title="가족과 연결하려면 로그인이 필요해요"
          description="로그인하면 가족을 초대하고 함께 먹을 메뉴를 정할 수 있어요."
          onClose={() => setSheetOpen(false)}
          onApplePress={() => {
            setSheetOpen(false);
            signIn();
          }}
          onGooglePress={() => {
            setSheetOpen(false);
            signIn();
          }}
        />
      </SafeAreaView>
    );
  }

  if (!hasFamily) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}>
          <Text style={styles.guestTitle}>아직 연결된 가족이 없어요</Text>
          <Text style={styles.guestDescription}>초대 코드를 입력해 가족과 연결해보세요.</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/family-connect')}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          >
            <Text style={styles.primaryButtonText}>가족 연결하기</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>가족</Text>

        <View style={styles.familyCard}>
          <Text style={styles.familyName}>{FAMILY.name}</Text>
          <Text style={styles.memberCount}>멤버 {MEMBERS.length}명</Text>
          <Text style={styles.codeLabel}>초대 코드</Text>
          <Text style={styles.code} selectable>
            {FAMILY.inviteCode}
          </Text>
          <View style={styles.cardButtons}>
            <Pressable
              accessibilityRole="button"
              onPress={copyCode}
              style={({ pressed }) => [styles.cardButton, pressed && styles.pressed]}
            >
              <Text style={styles.cardButtonText}>복사</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={shareCode}
              style={({ pressed }) => [styles.cardButton, pressed && styles.pressed]}
            >
              <Text style={styles.cardButtonText}>공유</Text>
            </Pressable>
          </View>
        </View>

        <View>
          <Text style={styles.sectionTitle}>멤버</Text>
          <View style={styles.list}>
            {MEMBERS.map((member) => (
              <View key={member.id} style={styles.row}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{member.name.charAt(0)}</Text>
                </View>
                <Text style={styles.memberName}>{member.name}</Text>
                {member.isOwner && (
                  <View style={styles.ownerBadge}>
                    <Text style={styles.ownerText}>그룹장</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

        <View>
          <Text style={styles.sectionTitle}>콜 기록</Text>
          <View style={styles.list}>
            {calls.map((call) => (
              <Pressable
                key={call.id}
                accessibilityRole="button"
                onPress={() => router.push({ pathname: '/respond', params: { callId: call.id } })}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{call.sender.charAt(0)}</Text>
                </View>
                <View style={styles.callBody}>
                  <Text style={styles.callMenu}>{call.menu}</Text>
                  <Text style={styles.callStatus} numberOfLines={1}>
                    {responseSummary(call)}
                  </Text>
                </View>
                <Text style={styles.callTime}>{call.time}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => setLeaving(true)}
          style={({ pressed }) => [styles.leaveButton, pressed && styles.pressed]}
        >
          <Text style={styles.leaveText}>가족 나가기</Text>
        </Pressable>
      </ScrollView>

      <Toast message={toast} />

      <ConfirmDialog
        visible={leaving}
        title="가족에서 나갈까요?"
        message="나가면 가족의 콜 기록을 볼 수 없어요."
        confirmLabel="나가기"
        onCancel={() => setLeaving(false)}
        onConfirm={confirmLeave}
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
  centered: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111',
  },
  guestTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111',
    textAlign: 'center',
  },
  guestDescription: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: '#6B7280',
    textAlign: 'center',
  },
  primaryButton: {
    marginTop: 24,
    paddingHorizontal: 32,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#FF5A5F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  familyCard: {
    backgroundColor: '#FFF1F0',
    borderRadius: 20,
    padding: 20,
  },
  familyName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111',
  },
  memberCount: {
    marginTop: 2,
    fontSize: 14,
    color: '#6B7280',
  },
  codeLabel: {
    marginTop: 20,
    fontSize: 13,
    fontWeight: '600',
    color: '#FF5A5F',
  },
  code: {
    marginTop: 4,
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: 6,
    color: '#111',
  },
  cardButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  cardButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardButtonText: {
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
  list: {
    gap: 14,
  },
  row: {
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
  memberName: {
    flex: 1,
    fontSize: 16,
    color: '#111',
  },
  ownerBadge: {
    paddingHorizontal: 10,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFF1F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF5A5F',
  },
  callBody: {
    flex: 1,
  },
  callMenu: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  callStatus: {
    marginTop: 2,
    fontSize: 13,
    color: '#6B7280',
  },
  callTime: {
    fontSize: 13,
    color: '#6B7280',
  },
  leaveButton: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  leaveText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  pressed: {
    opacity: 0.7,
  },
});
