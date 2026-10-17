import {
  doc,
  getFirestore,
  onSnapshot,
  runTransaction,
  serverTimestamp,
} from '@react-native-firebase/firestore';
import { callFunction } from './callable';
import { startTracked } from './listenerRegistry';

export type AuthProvider = 'anonymous' | 'google';

type ProfileSource = {
  uid: string;
  photoURL: string | null;
  authProvider: AuthProvider;
};

// users/{uid}가 없을 때만 만든다. 트랜잭션이라 이미 있는 문서는 덮어쓰지 않는다.
// familyId는 가족에 들어갈 때 따로 채우므로 여기서는 넣지 않는다.
export async function ensureUserDocument({ uid, photoURL, authProvider }: ProfileSource) {
  const db = getFirestore();
  const ref = doc(db, 'users', uid);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists()) return;
    // displayName은 넣지 않는다. 사용자가 이름을 확인하고 저장할 때 서버 함수가 채운다.
    tx.set(ref, { photoURL, authProvider, createdAt: serverTimestamp() });
  });
}

/**
 * users/{uid}.displayName을 구독한다. 문서가 아직 없거나 읽지 못하면 undefined.
 * (문서는 로그인 직후 따로 만들어지므로, 없는 것과 이름이 비어 있는 것을 구분해야 한다.)
 */
export function subscribeDisplayName(uid: string, listener: (displayName: string | null | undefined) => void) {
  return startTracked(() =>
    onSnapshot(
      doc(getFirestore(), 'users', uid),
      (snap) => {
        if (!snap.exists()) return listener(undefined);
        const name = snap.data()?.displayName;
        listener(typeof name === 'string' ? name : null);
      },
      (e) => {
        console.warn('이름을 읽지 못했어요', e);
        listener(undefined);
      },
    ),
  );
}

/**
 * 닉네임을 저장한다. users와 가족 멤버 문서의 이름은 서버 함수만 바꾼다.
 * 가족 안에 같은 이름이 있으면 already-exists FunctionError로 reject한다.
 */
export async function updateDisplayName(name: string) {
  const result = await callFunction<{ name: string }, { displayName: string }>('updateDisplayName', {
    name,
  });
  return result.displayName;
}
