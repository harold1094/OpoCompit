import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { doc, getFirestore, serverTimestamp, setDoc } from 'firebase/firestore';

import { PlayerProfile } from '@/core/domain/types';

const firebaseEnabled = process.env.EXPO_PUBLIC_FIREBASE_ENABLED === 'true';

function firebaseApp() {
  if (!firebaseEnabled) return null;
  if (getApps().length > 0) return getApp();

  return initializeApp({
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
  });
}

export async function startAnonymousSession(): Promise<string> {
  const app = firebaseApp();
  if (!app) return 'local_guest';

  const auth = getAuth(app);
  if (auth.currentUser) return auth.currentUser.uid;
  const credential = await signInAnonymously(auth);
  return credential.user.uid;
}

export async function createGuestProfileIfMissing(profile: PlayerProfile): Promise<void> {
  const app = firebaseApp();
  if (!app || profile.uid === 'local_guest') return;

  const reference = doc(getFirestore(app), 'users', profile.uid);
  await setDoc(
    reference,
    {
      uid: profile.uid,
      isAnonymous: profile.isGuest,
      username: profile.username,
      role: 'guest',
      oppositionId: profile.oppositionId,
      oppositionName: profile.oppositionName,
      territorySelection: profile.territory,
      level: profile.level,
      xp: profile.xp,
      coins: profile.coins,
      gems: profile.gems,
      currentStreak: profile.currentStreak,
      bestStreak: profile.bestStreak,
      totalQuestions: profile.totalQuestions,
      correctAnswers: profile.correctAnswers,
      testsCompleted: profile.testsCompleted,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export function isFirebaseEnabled(): boolean {
  return firebaseEnabled;
}
