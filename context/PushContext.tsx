import { router, useRootNavigationState } from 'expo-router';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import ConfirmDialog from '../components/ConfirmDialog';
import NotificationBanner from '../components/NotificationBanner';
import {
  ForegroundNotification,
  isPermissionGranted,
  markPermissionAsked,
  openNotificationSettings,
  PUSH_SUPPORTED,
  PushTarget,
  readInitialNotification,
  registerDeviceToken,
  replaceDeviceToken,
  requestPermission,
  subscribeForeground,
  subscribeOpened,
  subscribeTokenRefresh,
  wasPermissionAsked,
} from '../services/pushNotifications';
import { useAuth } from './AuthContext';
import { useFamilyData } from './FamilyDataContext';

// unknown: 확인 중이거나 알림을 쓰지 않는 상태(게스트, 로그아웃, iOS)
// undetermined: 아직 한 번도 안내하지 않음
// blocked: 안내했는데 허용하지 않음. 설정에서 켜야 한다.
export type PushPermission = 'unknown' | 'granted' | 'undetermined' | 'blocked';

type PushValue = {
  permission: PushPermission;
  openSettings: () => void;
};

const PushContext = createContext<PushValue | null>(null);

const BANNER_DURATION_MS = 4000;
const warn = (message: string) => (e: unknown) => console.warn(message, e);

// 알림 권한, FCM 토큰 등록, 앱이 열려 있을 때의 배너, 알림을 눌렀을 때의 이동을 맡는다.
export function PushProvider({ children }: { children: ReactNode }) {
  const { status, uid, hasNickname } = useAuth();
  const { hasFamily } = useFamilyData();
  const navigationKey = useRootNavigationState()?.key;

  const [granted, setGranted] = useState<boolean | null>(null);
  const [asked, setAsked] = useState<boolean | null>(null);
  const [banner, setBanner] = useState<ForegroundNotification | null>(null);

  // 게스트는 가족이 없고 서버도 익명 계정을 받지 않으니 로그인한 사용자만 쓴다.
  const active = PUSH_SUPPORTED && status === 'signedIn' && hasNickname;

  const permission: PushPermission =
    !active || granted === null || asked === null
      ? 'unknown'
      : granted
        ? 'granted'
        : asked
          ? 'blocked'
          : 'undetermined';

  // ---- 권한 상태: 시작할 때와 설정에서 돌아왔을 때 다시 읽는다 ----
  const refreshPermission = useCallback(async () => {
    const [isGranted, wasAsked] = await Promise.all([isPermissionGranted(), wasPermissionAsked()]);
    setGranted(isGranted);
    setAsked(wasAsked);
  }, []);

  useEffect(() => {
    if (!active) return;
    refreshPermission().catch(warn('알림 권한을 확인하지 못했어요'));
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshPermission().catch(warn('알림 권한을 확인하지 못했어요'));
    });
    return () => subscription.remove();
  }, [active, refreshPermission]);

  // ---- 가족에 소속된 뒤 한 번 설명하고 권한을 요청한다 ----
  const promptVisible = active && hasFamily && permission === 'undetermined';

  const answerPrompt = async (allow: boolean) => {
    // 먼저 닫고 기록해서 같은 안내를 두 번 띄우지 않는다.
    setAsked(true);
    await markPermissionAsked();
    if (allow) setGranted(await requestPermission());
  };

  // ---- 허용되면 이 기기의 토큰을 users/{uid}.fcmTokens에 넣는다 ----
  useEffect(() => {
    if (!active || !uid || permission !== 'granted') return;
    registerDeviceToken(uid).catch(warn('FCM 토큰을 저장하지 못했어요'));
    return subscribeTokenRefresh((token) => {
      replaceDeviceToken(uid, token).catch(warn('갱신된 FCM 토큰을 저장하지 못했어요'));
    });
  }, [active, uid, permission]);

  // ---- 알림을 누르면 해당 콜로 이동 ----
  // 앱이 막 켜졌을 때는 로그인과 라우터가 준비된 뒤에 이동해야 해서, 준비될 때까지 들고 있는다.
  const pendingTarget = useRef<PushTarget | null>(null);
  const ready = useRef(false);

  const openPending = useCallback(() => {
    const target = pendingTarget.current;
    if (!target || !ready.current) return;
    pendingTarget.current = null;
    router.push({ pathname: '/respond', params: { callId: target.callId } });
  }, []);

  const openTarget = useCallback(
    (target: PushTarget) => {
      pendingTarget.current = target;
      openPending();
    },
    [openPending],
  );

  const routerReady = !!navigationKey;
  useEffect(() => {
    ready.current = active && routerReady;
    openPending();
  }, [active, routerReady, openPending]);

  useEffect(() => {
    if (!active) return;
    // 백그라운드에서 눌러 앱이 열린 경우
    const unsubscribe = subscribeOpened(openTarget);
    // 종료된 상태에서 눌러 앱이 열린 경우
    readInitialNotification()
      .then((target) => target && openTarget(target))
      .catch(warn('눌린 알림을 읽지 못했어요'));
    return unsubscribe;
  }, [active, openTarget]);

  // ---- 앱이 열려 있을 때 온 알림은 상단 배너로 ----
  useEffect(() => {
    if (!active) return;
    return subscribeForeground(setBanner);
  }, [active]);

  useEffect(() => {
    if (!banner) return;
    const timer = setTimeout(() => setBanner(null), BANNER_DURATION_MS);
    return () => clearTimeout(timer);
  }, [banner]);

  const value = useMemo<PushValue>(
    () => ({ permission, openSettings: () => void openNotificationSettings() }),
    [permission],
  );

  return (
    <PushContext.Provider value={value}>
      {children}

      {banner ? (
        <NotificationBanner
          title={banner.title}
          body={banner.body}
          onPress={() => {
            setBanner(null);
            openTarget(banner);
          }}
        />
      ) : null}

      <ConfirmDialog
        visible={promptVisible}
        title="알림을 켤까요?"
        message="가족이 콜을 보내면 알려드려요"
        confirmLabel="알림 켜기"
        cancelLabel="나중에"
        destructive={false}
        onConfirm={() => answerPrompt(true)}
        onCancel={() => answerPrompt(false)}
      />
    </PushContext.Provider>
  );
}

export function usePush() {
  const ctx = useContext(PushContext);
  if (!ctx) throw new Error('usePush must be used within PushProvider');
  return ctx;
}
