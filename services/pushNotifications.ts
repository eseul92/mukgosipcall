import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth } from '@react-native-firebase/auth';
import {
  arrayRemove,
  arrayUnion,
  doc,
  getFirestore,
  updateDoc,
} from '@react-native-firebase/firestore';
import {
  getInitialNotification,
  getMessaging,
  getToken,
  onMessage,
  onNotificationOpenedApp,
  onTokenRefresh,
  setBackgroundMessageHandler,
} from '@react-native-firebase/messaging';
import { Linking, PermissionsAndroid, Platform } from 'react-native';

// 푸시 알림은 Android만 지원한다.
export const PUSH_SUPPORTED = Platform.OS === 'android';

// 백그라운드에서 오는 알림은 시스템이 알아서 보여 준다. 처리할 것이 없다는 표시만 한다.
if (PUSH_SUPPORTED) {
  setBackgroundMessageHandler(getMessaging(), async () => {});
}

const ASKED_KEY = 'push.permissionAsked';

export type PushTarget = { type: 'call' | 'response'; callId: string };

// ---------- 알림 권한 ----------

/** Android 12 이하는 권한 없이 알림을 보낼 수 있고, 13부터 POST_NOTIFICATIONS가 필요하다. */
export async function isPermissionGranted() {
  if (!PUSH_SUPPORTED) return false;
  if (Number(Platform.Version) < 33) return true;
  return PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
}

export async function requestPermission() {
  if (Number(Platform.Version) < 33) return true;
  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
  );
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

export function openNotificationSettings() {
  return Linking.openSettings();
}

/** 권한 설명을 이미 보여 줬는지. 저장소를 못 읽으면 보여 준 것으로 본다(반복해서 묻지 않기 위해). */
export async function wasPermissionAsked() {
  try {
    return (await AsyncStorage.getItem(ASKED_KEY)) === '1';
  } catch (e) {
    console.warn('알림 권한 안내 기록을 읽지 못했어요', e);
    return true;
  }
}

export async function markPermissionAsked() {
  try {
    await AsyncStorage.setItem(ASKED_KEY, '1');
  } catch (e) {
    console.warn('알림 권한 안내 기록을 저장하지 못했어요', e);
  }
}

// ---------- FCM 토큰 ----------

const userRef = (uid: string) => doc(getFirestore(), 'users', uid);

// 이 기기에서 가장 최근에 users 문서에 넣은 토큰
let registeredToken: string | null = null;

/** 현재 기기의 토큰을 users/{uid}.fcmTokens에 넣는다. */
export async function registerDeviceToken(uid: string) {
  const token = await getToken(getMessaging());
  await updateDoc(userRef(uid), { fcmTokens: arrayUnion(token) });
  registeredToken = token;
}

/** 토큰이 갱신되면 새 토큰을 넣고 이전 토큰을 뺀다. 같은 필드를 한 번에 두 번 바꿀 수 없어 차례로 한다. */
export async function replaceDeviceToken(uid: string, token: string) {
  await updateDoc(userRef(uid), { fcmTokens: arrayUnion(token) });
  const previous = registeredToken;
  registeredToken = token;
  if (previous && previous !== token) {
    await updateDoc(userRef(uid), { fcmTokens: arrayRemove(previous) });
  }
}

export function subscribeTokenRefresh(listener: (token: string) => void) {
  return onTokenRefresh(getMessaging(), listener);
}

/**
 * 로그아웃 전에 현재 기기의 토큰을 지워서 이전 계정에 알림이 가지 않게 한다.
 * 아직 로그인된 상태에서 불러야 한다.
 */
export async function removeDeviceToken() {
  const user = getAuth().currentUser;
  if (!user || user.isAnonymous) return;

  const token = registeredToken ?? (await getToken(getMessaging()));
  await updateDoc(userRef(user.uid), { fcmTokens: arrayRemove(token) });
  registeredToken = null;
}

// ---------- 알림 수신 ----------

export type ForegroundNotification = PushTarget & { title: string; body: string };

function toTarget(data: { [key: string]: string | object } | undefined): PushTarget | null {
  const type = data?.type;
  const callId = data?.callId;
  if ((type !== 'call' && type !== 'response') || typeof callId !== 'string' || !callId) {
    return null;
  }
  return { type, callId };
}

/** 앱이 열려 있을 때 온 알림 */
export function subscribeForeground(listener: (notification: ForegroundNotification) => void) {
  return onMessage(getMessaging(), async (message) => {
    const target = toTarget(message.data);
    if (!target) return;
    listener({
      ...target,
      title: message.notification?.title ?? '먹고싶콜',
      body: message.notification?.body ?? '',
    });
  });
}

/** 앱이 백그라운드일 때 알림을 눌러 앱이 열린 경우 */
export function subscribeOpened(listener: (target: PushTarget) => void) {
  return onNotificationOpenedApp(getMessaging(), (message) => {
    const target = toTarget(message.data);
    if (target) listener(target);
  });
}

/** 앱이 종료된 상태에서 알림을 눌러 앱이 열린 경우. 한 번 읽으면 비워진다. */
export async function readInitialNotification() {
  const message = await getInitialNotification(getMessaging());
  return toTarget(message?.data);
}
