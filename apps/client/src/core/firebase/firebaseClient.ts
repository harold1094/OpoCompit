import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FirebaseAuthInternal from '@firebase/auth';
import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import {
  Auth,
  connectAuthEmulator,
  getAuth,
  initializeAuth,
  Persistence,
  signInAnonymously,
} from 'firebase/auth';
import {
  connectFunctionsEmulator,
  getFunctions,
  httpsCallable,
} from 'firebase/functions';
import { Platform } from 'react-native';

import {
  DailyEngagement,
  DailyReward,
  Mission,
  PlayerProfile,
  PlayerProgress,
  Question,
  QuizAnswerSubmission,
  QuizResult,
} from '@/core/domain/types';

const firebaseEnabled = process.env.EXPO_PUBLIC_FIREBASE_ENABLED === 'true';
let authInstance: Auth | null = null;
let authEmulatorConnected = false;
let functionsEmulatorConnected = false;

type StartQuickQuizResponse = {
  sessionId: string;
  questions: Question[];
};

type SubmitQuizResponse = {
  result: QuizResult;
  progress: PlayerProgress;
  engagement: DailyEngagement;
};

type ClaimDailyRewardResponse = {
  dailyReward: DailyReward;
  progress: PlayerProgress;
};

type ClaimMissionResponse = {
  mission: Mission;
  progress: PlayerProgress;
};

function firebaseApp(): FirebaseApp | null {
  if (!firebaseEnabled) return null;
  if (getApps().length > 0) return getApp();

  return initializeApp({
    apiKey: requiredEnv(process.env.EXPO_PUBLIC_FIREBASE_API_KEY, 'EXPO_PUBLIC_FIREBASE_API_KEY'),
    authDomain: requiredEnv(
      process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
    ),
    projectId: requiredEnv(
      process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
    ),
    storageBucket: requiredEnv(
      process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
    ),
    messagingSenderId: requiredEnv(
      process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    ),
    appId: requiredEnv(process.env.EXPO_PUBLIC_FIREBASE_APP_ID, 'EXPO_PUBLIC_FIREBASE_APP_ID'),
    measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
  });
}

function firebaseAuth(app: FirebaseApp): Auth {
  if (!authInstance) {
    if (Platform.OS === 'web') {
      authInstance = getAuth(app);
    } else {
      try {
        const getNativePersistence = (
          FirebaseAuthInternal as unknown as {
            getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence;
          }
        ).getReactNativePersistence;
        authInstance = initializeAuth(app, {
          persistence: getNativePersistence(AsyncStorage),
        });
      } catch {
        authInstance = getAuth(app);
      }
    }
  }

  if (usingFirebaseEmulators() && !authEmulatorConnected) {
    connectAuthEmulator(authInstance, `http://${emulatorHost()}:9099`, {
      disableWarnings: true,
    });
    authEmulatorConnected = true;
  }
  return authInstance;
}

function callable<Request, Response>(name: string) {
  const app = firebaseApp();
  if (!app) throw new Error('Firebase is disabled.');
  const functions = getFunctions(
    app,
    process.env.EXPO_PUBLIC_FIREBASE_FUNCTIONS_REGION || 'us-central1',
  );

  if (
    usingFirebaseEmulators() &&
    !functionsEmulatorConnected
  ) {
    connectFunctionsEmulator(functions, emulatorHost(), 5001);
    functionsEmulatorConnected = true;
  }
  return httpsCallable<Request, Response>(functions, name);
}

export async function startAnonymousSession(): Promise<string> {
  const app = firebaseApp();
  if (!app) return 'local_guest';

  const auth = firebaseAuth(app);
  if (auth.currentUser) return auth.currentUser.uid;
  const credential = await signInAnonymously(auth);
  return credential.user.uid;
}

export async function bootstrapGuestProfile(profile: PlayerProfile): Promise<PlayerProfile> {
  await startAnonymousSession();
  const invoke = callable<
    Pick<PlayerProfile, 'oppositionId' | 'oppositionName' | 'territory'>,
    { profile: PlayerProfile }
  >('bootstrapGuestProfile');
  const response = await invoke({
    oppositionId: profile.oppositionId,
    oppositionName: profile.oppositionName,
    territory: profile.territory,
  });
  return response.data.profile;
}

export async function startQuickQuizRemote(questionCount = 10): Promise<StartQuickQuizResponse> {
  await startAnonymousSession();
  const invoke = callable<{ questionCount: number }, StartQuickQuizResponse>('startQuickQuiz');
  const response = await invoke({ questionCount });
  return response.data;
}

export async function submitQuizSessionRemote(
  sessionId: string,
  answers: QuizAnswerSubmission[],
): Promise<SubmitQuizResponse> {
  await startAnonymousSession();
  const invoke = callable<
    { sessionId: string; answers: QuizAnswerSubmission[] },
    SubmitQuizResponse
  >('submitQuizSession');
  const response = await invoke({ sessionId, answers });
  return response.data;
}

export async function getDailyEngagementRemote(): Promise<DailyEngagement> {
  await startAnonymousSession();
  const invoke = callable<Record<string, never>, DailyEngagement>('getDailyEngagement');
  const response = await invoke({});
  return response.data;
}

export async function claimDailyRewardRemote(): Promise<ClaimDailyRewardResponse> {
  await startAnonymousSession();
  const invoke = callable<Record<string, never>, ClaimDailyRewardResponse>('claimDailyReward');
  const response = await invoke({});
  return response.data;
}

export async function claimMissionRemote(missionId: string): Promise<ClaimMissionResponse> {
  await startAnonymousSession();
  const invoke = callable<{ missionId: string }, ClaimMissionResponse>('claimMission');
  const response = await invoke({ missionId });
  return response.data;
}

export function isFirebaseEnabled(): boolean {
  return firebaseEnabled;
}

export function readableFirebaseError(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = String((error as { code: unknown }).code).replace('functions/', '');
    const messages: Record<string, string> = {
      unauthenticated: 'La sesión de invitado ha caducado. Vuelve a entrar.',
      'failed-precondition': 'La partida ya no se puede validar.',
      'deadline-exceeded': 'La partida ha caducado. Empieza una nueva.',
      'not-found': 'Todavía no hay preguntas publicadas para este territorio.',
      unavailable: 'Firebase no está disponible ahora mismo. Inténtalo de nuevo.',
    };
    return messages[code] ?? 'No se pudo completar la operación con Firebase.';
  }
  return error instanceof Error ? error.message : 'Ha ocurrido un error inesperado.';
}

function requiredEnv(value: string | undefined, name: string): string {
  if (!value || value.startsWith('your-')) {
    throw new Error(`Missing Firebase environment variable: ${name}`);
  }
  return value;
}

function usingFirebaseEmulators(): boolean {
  return process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATORS === 'true';
}

function emulatorHost(): string {
  return (
    process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST ||
    (Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1')
  );
}
