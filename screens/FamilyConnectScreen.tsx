import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LoginPromptSheet from '../components/LoginPromptSheet';
import NicknameForm from '../components/NicknameForm';
import Toast from '../components/Toast';
import { FAMILY_NAME_MAX, INVITE_CODE_LENGTH, RETRY_MESSAGE } from '../constants/family';
import { useAuth } from '../context/AuthContext';
import { useFamilyData } from '../context/FamilyDataContext';
import { FunctionError } from '../services/callable';
import useLoginHandlers from '../hooks/useLoginHandlers';
import useToast from '../hooks/useToast';
import { charCount, limitChars } from '../utils/text';

type Kind = 'join' | 'create';

// 참여할 때 가족 중에 같은 이름이 있으면 서버가 already-exists와 함께 이 문구가 든 메시지를 준다.
// "이미 가족에 속해 있어요"도 already-exists라서 메시지로 구분한다.
const isNameTaken = (e: unknown): e is FunctionError =>
  e instanceof FunctionError && e.code === 'already-exists' && e.message.includes('같은 이름');

export default function FamilyConnectScreen() {
  const { isGuest, hasNickname, displayName } = useAuth();
  const { joinFamily, createFamily } = useFamilyData();
  const { message: toast, show: showToast } = useToast();
  const { error: loginError, clearError, onGoogle } = useLoginHandlers((notice) =>
    showToast(notice, 4000),
  );

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [errors, setErrors] = useState<Record<Kind, string | null>>({ join: null, create: null });
  const [pending, setPending] = useState<Kind | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  // 닉네임을 정한 뒤 이어서 할 일
  const [nicknameFor, setNicknameFor] = useState<Kind | null>(null);
  // 참여하다가 같은 이름 오류를 받았을 때의 서버 메시지. 있으면 이름 바꾸기로 안내한다.
  const [nameTaken, setNameTaken] = useState<string | null>(null);
  const busy = useRef(false);

  const trimmedName = name.trim();
  const codeReady = code.length === INVITE_CODE_LENGTH;
  const nameReady = trimmedName.length > 0;
  const nameBlank = name.length > 0 && !nameReady;

  const execute = async (kind: Kind, action: () => Promise<void>) => {
    if (busy.current) return;
    busy.current = true;
    setPending(kind);
    setErrors({ join: null, create: null });
    try {
      await action();
      router.dismissTo('/family');
    } catch (e) {
      if (kind === 'join' && isNameTaken(e)) {
        // 입력한 초대 코드는 그대로 두고, 이름을 바꾼 뒤 같은 코드로 다시 참여한다.
        setNameTaken(e.message);
        setNicknameFor('join');
      } else {
        setErrors((prev) => ({ ...prev, [kind]: e instanceof Error ? e.message : RETRY_MESSAGE }));
      }
    } finally {
      busy.current = false;
      setPending(null);
    }
  };

  const actions: Record<Kind, () => Promise<void>> = {
    join: () => joinFamily(code),
    create: () => createFamily(trimmedName),
  };

  const submit = (kind: Kind, ready: boolean) => {
    if (busy.current) return;
    // 게스트는 함수를 부르지 않고 로그인부터 안내한다.
    if (isGuest) {
      setSheetOpen(true);
      return;
    }
    if (!ready) return;
    // 이름이 없으면 먼저 정하게 하고, 저장이 끝난 뒤에 함수를 부른다.
    if (!hasNickname) {
      setNicknameFor(kind);
      return;
    }
    execute(kind, actions[kind]);
  };

  const join = () => submit('join', codeReady);
  const create = () => submit('create', nameReady);

  const onNicknameSaved = () => {
    const kind = nicknameFor;
    setNicknameFor(null);
    setNameTaken(null);
    if (kind) execute(kind, actions[kind]);
  };

  // 이미 이름이 있는 사용자가 이름 바꾸기를 접고 돌아가는 경우에만 쓴다.
  const cancelRename = () => {
    setNicknameFor(null);
    setNameTaken(null);
  };

  const closeSheet = () => {
    setSheetOpen(false);
    clearError();
  };

  // 취소나 오류면 시트를 열어 둔 채 머문다.
  const handleGoogle = async () => {
    const result = await onGoogle();
    if (result?.status === 'success') closeSheet();
  };

  const joinDisabled = pending !== null || (!isGuest && !codeReady);
  const createDisabled = pending !== null || (!isGuest && !nameReady);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>가족과 연결해요</Text>
        <Text style={styles.description}>가족에게 받은 6자리 초대 코드를 입력하세요.</Text>

        <TextInput
          value={code}
          onChangeText={(text) => {
            setErrors((prev) => ({ ...prev, join: null }));
            setCode(
              text
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, '')
                .slice(0, INVITE_CODE_LENGTH),
            );
          }}
          onSubmitEditing={join}
          editable={pending === null}
          placeholder="ABC123"
          placeholderTextColor="#D1D5DB"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={INVITE_CODE_LENGTH}
          style={styles.codeInput}
        />

        {errors.join ? <Text style={styles.error}>{errors.join}</Text> : null}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: joinDisabled, busy: pending === 'join' }}
          disabled={joinDisabled}
          onPress={join}
          style={({ pressed }) => [
            styles.primaryButton,
            joinDisabled && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          {pending === 'join' ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>연결하기</Text>
          )}
        </Pressable>

        <View style={styles.divider}>
          <View style={styles.line} />
          <Text style={styles.dividerText}>또는</Text>
          <View style={styles.line} />
        </View>

        <Text style={styles.sectionTitle}>새 가족 만들기</Text>
        <TextInput
          value={name}
          onChangeText={(text) => {
            setErrors((prev) => ({ ...prev, create: null }));
            setName(limitChars(text, FAMILY_NAME_MAX));
          }}
          onSubmitEditing={create}
          editable={pending === null}
          placeholder="가족 이름 (예: 우리 가족)"
          placeholderTextColor="#9CA3AF"
          returnKeyType="done"
          style={styles.nameInput}
        />
        <Text style={[styles.hint, nameBlank && styles.hintError]}>
          {nameBlank
            ? '공백만으로는 만들 수 없어요'
            : `${charCount(name)}/${FAMILY_NAME_MAX}`}
        </Text>

        {errors.create ? <Text style={styles.error}>{errors.create}</Text> : null}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: createDisabled, busy: pending === 'create' }}
          disabled={createDisabled}
          onPress={create}
          style={({ pressed }) => [
            styles.secondaryButton,
            createDisabled && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          {pending === 'create' ? (
            <ActivityIndicator color="#111" />
          ) : (
            <Text style={styles.secondaryButtonText}>가족 만들기</Text>
          )}
        </Pressable>
      </ScrollView>

      <Toast message={toast} />

      {/* 이름이 없을 때는 건너뛰기 없음: 뒤로 가기로도 닫히지 않는다. 같은 이름 오류일 때만 취소할 수 있다. */}
      <Modal
        visible={nicknameFor !== null}
        animationType="slide"
        onRequestClose={nameTaken ? cancelRename : () => {}}
      >
        <SafeAreaView style={styles.nicknameModal}>
          <NicknameForm
            initialName={nameTaken ? (displayName ?? '') : undefined}
            notice={nameTaken ?? undefined}
            submitLabel={nameTaken ? '저장하고 다시 참여' : undefined}
            onSaved={onNicknameSaved}
            onCancel={nameTaken ? cancelRename : undefined}
          />
        </SafeAreaView>
      </Modal>

      <LoginPromptSheet
        visible={sheetOpen}
        title="가족과 연결하려면 로그인이 필요해요"
        description="로그인하면 가족을 초대하고 함께 먹을 메뉴를 정할 수 있어요."
        onClose={closeSheet}
        onGooglePress={handleGoogle}
        errorMessage={loginError}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 24,
  },
  nicknameModal: {
    flex: 1,
    backgroundColor: '#fff',
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
  codeInput: {
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
  divider: {
    marginVertical: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  nameInput: {
    marginTop: 12,
    height: 52,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#111',
  },
  hint: {
    marginTop: 6,
    alignSelf: 'flex-end',
    fontSize: 13,
    color: '#9CA3AF',
  },
  hintError: {
    alignSelf: 'flex-start',
    color: '#EF4444',
  },
  secondaryButton: {
    marginTop: 12,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
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
