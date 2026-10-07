import { getFirestore, runTransaction, serverTimestamp, doc } from '@react-native-firebase/firestore';

export type AuthProvider = 'anonymous' | 'google';

type ProfileSource = {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
  authProvider: AuthProvider;
};

// users/{uid}가 없을 때만 만든다. 트랜잭션이라 이미 있는 문서는 절대 덮어쓰지 않는다.
// familyId는 가족에 들어갈 때 따로 채우므로 여기서는 넣지 않는다.
export async function ensureUserDocument({ uid, displayName, photoURL, authProvider }: ProfileSource) {
  const db = getFirestore();
  const ref = doc(db, 'users', uid);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists()) return;
    tx.set(ref, { displayName, photoURL, authProvider, createdAt: serverTimestamp() });
  });
}
