import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FirebaseAuthInternal from '@firebase/auth';
import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import {
  Auth,
  connectAuthEmulator,
  EmailAuthProvider,
  getAuth,
  GoogleAuthProvider,
  initializeAuth,
  linkWithCredential,
  linkWithPopup,
  Persistence,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInAnonymously,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  connectFunctionsEmulator,
  getFunctions,
  httpsCallable,
} from 'firebase/functions';
import { Platform } from 'react-native';

export { readableFirebaseError } from './firebaseError';

import {
  AchievementOverview,
  NotificationOverview,
  AvatarInventory,
  ActiveCustomQuiz,
  CustomQuizConfig,
  DailyEngagement,
  DailyReward,
  DuelOpponent,
  DuelResult,
  ErrorReviewItem,
  FriendDuelInvitation,
  FriendRequest,
  LearningInsights,
  MatchmakingState,
  Mission,
  MonetizationOverview,
  OfficialExam,
  PlayerProfile,
  PlayerProgress,
  Question,
  QuestionReportReason,
  QuizAnswerSubmission,
  QuizResult,
  RankingScope,
  RankingSnapshot,
  SocialOverview,
  SocialUser,
  StudyGroup,
  StudyGroupCompetitionMetric,
  StudyGroupDetail,
  UserPreferences,
} from '@/core/domain/types';

const firebaseEnabled = process.env.EXPO_PUBLIC_FIREBASE_ENABLED === 'true';
let authInstance: Auth | null = null;
let authEmulatorConnected = false;
let functionsEmulatorConnected = false;

type StartQuickQuizResponse = {
  sessionId: string;
  questions: Question[];
};

type StartCustomQuizResponse = StartQuickQuizResponse & {
  customQuiz: ActiveCustomQuiz;
};

type SubmitQuizResponse = {
  result: QuizResult;
  progress: PlayerProgress;
  engagement: DailyEngagement;
};

type StartClassicDuelResponse = {
  duelId: string;
  opponent: DuelOpponent;
  questions: Question[];
};

type SubmitClassicDuelResponse = SubmitQuizResponse & {
  duel: DuelResult;
};

type ClaimDailyRewardResponse = {
  dailyReward: DailyReward;
  progress: PlayerProgress;
};

type ClaimMissionResponse = {
  mission: Mission;
  progress: PlayerProgress;
};

type SocialUserResponse = { user: SocialUser };
type SocialSearchResponse = { users: SocialUser[] };
type FriendRequestResponse = { request: FriendRequest };
type FriendDuelInvitationResponse = { invitation: FriendDuelInvitation };
type MatchmakingResponse = { matchmaking: MatchmakingState };
type AvatarInventoryResponse = { inventory: AvatarInventory };
type AchievementOverviewResponse = {
  achievements: AchievementOverview;
  progress: PlayerProgress;
};

export type AdminQuestion = {
  id: string;
  oppositionId: string;
  statement: string;
  answers: Array<{ id: string; text: string }>;
  correctAnswerId: string;
  explanation: string;
  categoryId: string;
  subcategoryId: string | null;
  difficulty: number;
  scopeType: string;
  territoryKeys: string[];
  country: string;
  autonomousCommunity: string | null;
  province: string | null;
  municipality: string | null;
  specificCallId: string | null;
  officialExamId: string | null;
  year: number | null;
  source: string;
  sourceDocument: string | null;
  sourcePage: number | null;
  verified: boolean;
  status: 'draft' | 'pending_review' | 'published' | 'disabled';
  validFrom: string | null;
  validUntil: string | null;
  createdBy: string;
  reviewedBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  lastReviewedAt: string | null;
  duplicates: Array<{
    id: string;
    status: string;
    statement: string;
  }>;
};

export type AdminQuestionReport = {
  id: string;
  questionId: string;
  reason: QuestionReportReason;
  detail: string | null;
  status: 'open';
  createdAt: string | null;
  updatedAt: string | null;
  question: {
    statement: string;
    categoryId: string;
    source: string;
    officialExamId: string | null;
    status: string;
    validFrom: string | null;
    validUntil: string | null;
  };
};

export type QuestionReportResolution = 'dismiss' | 'mark_outdated' | 'disable_question';

type OfficialExamsResponse = {
  exams: OfficialExam[];
};

type StartOfficialExamResponse = StartQuickQuizResponse & {
  exam: OfficialExam;
};

type ErrorReviewResponse = {
  items: ErrorReviewItem[];
};

export type AdminCatalogKind = 'oppositions' | 'territories' | 'categories' | 'officialExams';

export type AdminOpposition = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  priority: number;
};

export type AdminTerritory = {
  id: string;
  label: string;
  country: string;
  autonomousCommunity: string | null;
  province: string | null;
  municipality: string | null;
  specificBody: string | null;
  active: boolean;
  priority: number;
};

export type AdminCategory = {
  id: string;
  oppositionId: string;
  name: string;
  parentId: string | null;
  active: boolean;
  priority: number;
};

export type AdminOfficialExam = {
  id: string;
  oppositionId: string;
  name: string;
  date: string;
  year: number;
  territoryKeys: string[];
  source: string;
  status: 'draft' | 'published' | 'disabled';
  rules: {
    questionCount: number;
    durationSeconds: number;
    correctPoints: number;
    incorrectPenalty: number;
    blankPoints: number;
  };
};

export type AdminCatalogItem = AdminOpposition | AdminTerritory | AdminCategory | AdminOfficialExam;

export type AdminCatalog = {
  oppositions: AdminOpposition[];
  territories: AdminTerritory[];
  categories: AdminCategory[];
  officialExams: AdminOfficialExam[];
};

export type AdminOperationKind =
  | 'missions'
  | 'dailyRewards'
  | 'shopItems'
  | 'subscriptionPlans'
  | 'appConfig';

export type AdminMission = {
  id: string;
  title: string;
  description: string;
  type: 'completeQuickMatches' | 'answerQuestions' | 'correctAnswers';
  target: number;
  rewardXp: number;
  rewardCoins: number;
  active: boolean;
  priority: number;
};

export type AdminDailyReward = {
  id: string;
  day: number;
  coins: number;
  gems: number;
  active: boolean;
};

export type AdminShopItem = {
  id: string;
  name: string;
  category: 'avatars' | 'clothing' | 'accessories' | 'frames' | 'backgrounds' | 'badges' | 'effects';
  slot: 'base' | 'face' | 'hair' | 'outfit' | 'accessory' | 'background' | 'frame' | 'badge' | 'effect';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  price: number;
  currency: 'coins' | 'gems';
  active: boolean;
  premiumOnly: boolean;
  priority: number;
};

export type AdminSubscriptionPlan = {
  id: string;
  name: string;
  priceLabel: string;
  billingPeriod: 'monthly' | 'yearly';
  features: Array<'ad_free' | 'monthly_gems' | 'exclusive_cosmetics' | 'advanced_stats'>;
  gemReward: number;
  adFree: boolean;
  exclusiveCosmetics: boolean;
  active: boolean;
  priority: number;
  storeProductId: string | null;
  purchasable: boolean;
};

export type AdminAppConfig = {
  id: 'monetization';
  adsEnabled: boolean;
  rewardedAdsEnabled: boolean;
  adProviderReady: boolean;
  resultInterval: number;
};

export type AdminOperationItem = AdminMission | AdminDailyReward | AdminShopItem |
  AdminSubscriptionPlan | AdminAppConfig;

export type AdminOperations = {
  missions: AdminMission[];
  dailyRewards: AdminDailyReward[];
  shopItems: AdminShopItem[];
  subscriptionPlans: AdminSubscriptionPlan[];
  appConfig: AdminAppConfig[];
};

export type AdminReviewDecision = 'save' | 'publish' | 'disable';
export type AdminBulkReviewDecision = 'publish' | 'disable';

export type BulkReviewResult = {
  decision: AdminBulkReviewDecision;
  reviewedCount: number;
  questionIds: string[];
};

export type QuestionImportResult = {
  batchId: string;
  importedCount: number;
  questionIds: string[];
  status: 'completed';
  idempotent: boolean;
};

export type OpenFriendDuelResponse = {
  duelId: string;
  status: 'active' | 'waiting' | 'completed';
  opponent: DuelOpponent;
  questions: Question[];
  result: QuizResult | null;
  duel: DuelResult | null;
  progress: PlayerProgress;
};

export type SubmitFriendDuelResponse = SubmitQuizResponse & {
  status: 'waiting' | 'completed';
  duel: DuelResult | null;
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
  await auth.authStateReady();
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

async function currentProfileRemote(): Promise<PlayerProfile> {
  const invoke = callable<Record<string, never>, { profile: PlayerProfile }>('getCurrentProfile');
  return (await invoke({})).data.profile;
}

export async function restoreFirebaseSessionRemote(): Promise<PlayerProfile> {
  const app = firebaseApp();
  if (!app) throw new Error('Firebase is disabled.');
  const auth = firebaseAuth(app);
  await auth.authStateReady();
  if (!auth.currentUser) {
    throw Object.assign(new Error('No persisted Firebase session.'), {
      code: 'auth/user-token-expired',
    });
  }
  await auth.currentUser.getIdToken();
  return currentProfileRemote();
}

async function completeAccountLinkRemote(): Promise<PlayerProfile> {
  const invoke = callable<Record<string, never>, { profile: PlayerProfile }>('completeAccountLink');
  return (await invoke({})).data.profile;
}

export async function linkEmailAccountRemote(
  email: string,
  password: string,
): Promise<PlayerProfile> {
  const app = firebaseApp();
  if (!app) throw new Error('Firebase is disabled.');
  const auth = firebaseAuth(app);
  if (!auth.currentUser?.isAnonymous) {
    throw new Error('La sesión actual ya está vinculada a una cuenta.');
  }
  await linkWithCredential(
    auth.currentUser,
    EmailAuthProvider.credential(email, password),
  );
  await auth.currentUser.getIdToken(true);
  return completeAccountLinkRemote();
}

export async function signInEmailAccountRemote(
  email: string,
  password: string,
): Promise<PlayerProfile> {
  const app = firebaseApp();
  if (!app) throw new Error('Firebase is disabled.');
  const auth = firebaseAuth(app);
  await signInWithEmailAndPassword(auth, email, password);
  return currentProfileRemote();
}

export async function linkGoogleAccountRemote(): Promise<PlayerProfile> {
  if (Platform.OS !== 'web') {
    throw new Error('Google para Android necesita los identificadores OAuth de producción.');
  }
  const app = firebaseApp();
  if (!app) throw new Error('Firebase is disabled.');
  const auth = firebaseAuth(app);
  if (!auth.currentUser?.isAnonymous) {
    throw new Error('La sesión actual ya está vinculada a una cuenta.');
  }
  await linkWithPopup(auth.currentUser, new GoogleAuthProvider());
  await auth.currentUser.getIdToken(true);
  return completeAccountLinkRemote();
}

export async function signInGoogleAccountRemote(): Promise<PlayerProfile> {
  if (Platform.OS !== 'web') {
    throw new Error('Google para Android necesita los identificadores OAuth de producción.');
  }
  const app = firebaseApp();
  if (!app) throw new Error('Firebase is disabled.');
  const auth = firebaseAuth(app);
  await signInWithPopup(auth, new GoogleAuthProvider());
  return currentProfileRemote();
}

export async function sendAccountPasswordResetRemote(email: string): Promise<void> {
  const app = firebaseApp();
  if (!app) throw new Error('Firebase is disabled.');
  await sendPasswordResetEmail(firebaseAuth(app), email);
}

export async function signOutAccountRemote(): Promise<void> {
  const app = firebaseApp();
  if (!app) return;
  await signOut(firebaseAuth(app));
}

export async function getUserPreferencesRemote(): Promise<UserPreferences> {
  await startAnonymousSession();
  const invoke = callable<Record<string, never>, {preferences: UserPreferences}>('getUserPreferences');
  return (await invoke({})).data.preferences;
}

export async function updateUserPreferencesRemote(
  preferences: Partial<UserPreferences>,
): Promise<UserPreferences> {
  await startAnonymousSession();
  const invoke = callable<
    {preferences: Partial<UserPreferences>},
    {preferences: UserPreferences}
  >('updateUserPreferences');
  return (await invoke({preferences})).data.preferences;
}

export async function deleteCurrentAccountRemote(): Promise<void> {
  const app = firebaseApp();
  if (!app) throw new Error('Firebase is disabled.');
  const auth = firebaseAuth(app);
  if (!auth.currentUser) throw new Error('No hay una sesión activa.');
  const invoke = callable<{confirmation: string}, {deleted: boolean}>('deleteCurrentAccount');
  await invoke({confirmation: 'ELIMINAR'});
  await signOut(auth).catch(() => undefined);
}

export async function getAvatarShopRemote(): Promise<AvatarInventory> {
  await startAnonymousSession();
  const invoke = callable<Record<string, never>, AvatarInventoryResponse>('getAvatarShop');
  return (await invoke({})).data.inventory;
}

export async function getMonetizationOverviewRemote(): Promise<MonetizationOverview> {
  await startAnonymousSession();
  const invoke = callable<Record<string, never>, MonetizationOverview>('getMonetizationOverview');
  return (await invoke({})).data;
}

export async function getAchievementsRemote(): Promise<AchievementOverviewResponse> {
  await startAnonymousSession();
  const invoke = callable<Record<string, never>, AchievementOverviewResponse>('getAchievements');
  return (await invoke({})).data;
}

export async function getNotificationsRemote(): Promise<NotificationOverview> {
  await startAnonymousSession();
  const invoke = callable<Record<string, never>, NotificationOverview>('getNotifications');
  return (await invoke({})).data;
}

export async function markNotificationsReadRemote(notificationIds: string[]): Promise<void> {
  await startAnonymousSession();
  const invoke = callable<{notificationIds: string[]}, {notificationIds: string[]; readAt: string}>(
    'markNotificationsRead',
  );
  await invoke({notificationIds});
}

export async function reportQuestionRemote(
  questionId: string,
  reason: QuestionReportReason,
  detail: string | null,
): Promise<{reportId: string; status: 'open'; idempotent: boolean}> {
  await startAnonymousSession();
  const invoke = callable<
    {questionId: string; reason: QuestionReportReason; detail: string | null},
    {reportId: string; status: 'open'; idempotent: boolean}
  >('reportQuestion');
  return (await invoke({questionId, reason, detail})).data;
}

export async function purchaseAvatarItemRemote(itemId: string): Promise<AvatarInventory> {
  await startAnonymousSession();
  const invoke = callable<{ itemId: string }, AvatarInventoryResponse>('purchaseAvatarItem');
  return (await invoke({ itemId })).data.inventory;
}

export async function equipAvatarItemRemote(itemId: string): Promise<AvatarInventory> {
  await startAnonymousSession();
  const invoke = callable<{ itemId: string }, AvatarInventoryResponse>('equipAvatarItem');
  return (await invoke({ itemId })).data.inventory;
}

export async function startQuickQuizRemote(questionCount = 10): Promise<StartQuickQuizResponse> {
  await startAnonymousSession();
  const invoke = callable<{ questionCount: number }, StartQuickQuizResponse>('startQuickQuiz');
  const response = await invoke({ questionCount });
  return response.data;
}

export async function startCustomQuizRemote(config: CustomQuizConfig): Promise<StartCustomQuizResponse> {
  await startAnonymousSession();
  const invoke = callable<CustomQuizConfig, StartCustomQuizResponse>('startCustomQuiz');
  return (await invoke(config)).data;
}

export async function getErrorReviewRemote(): Promise<ErrorReviewItem[]> {
  await startAnonymousSession();
  const invoke = callable<Record<string, never>, ErrorReviewResponse>('getErrorReview');
  return (await invoke({})).data.items;
}

export async function getLearningInsightsRemote(): Promise<LearningInsights> {
  await startAnonymousSession();
  const invoke = callable<Record<string, never>, LearningInsights>('getLearningInsights');
  return (await invoke({})).data;
}

export async function startErrorReviewRemote(
  questionCount = 10,
  categoryId: string | null = null,
): Promise<StartQuickQuizResponse> {
  await startAnonymousSession();
  const invoke = callable<
    { questionCount: number; categoryId: string | null },
    StartQuickQuizResponse
  >('startErrorReview');
  return (await invoke({ questionCount, categoryId })).data;
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

export async function startClassicDuelRemote(
  opponentId: string,
): Promise<StartClassicDuelResponse> {
  await startAnonymousSession();
  const invoke = callable<{ opponentId: string }, StartClassicDuelResponse>('startClassicDuel');
  const response = await invoke({ opponentId });
  return response.data;
}

export async function submitClassicDuelRemote(
  duelId: string,
  answers: QuizAnswerSubmission[],
): Promise<SubmitClassicDuelResponse> {
  await startAnonymousSession();
  const invoke = callable<
    { duelId: string; answers: QuizAnswerSubmission[] },
    SubmitClassicDuelResponse
  >('submitClassicDuel');
  const response = await invoke({ duelId, answers });
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

export async function setPublicUsernameRemote(username: string): Promise<SocialUser> {
  await startAnonymousSession();
  const invoke = callable<{ username: string }, SocialUserResponse>('setPublicUsername');
  const response = await invoke({ username });
  return response.data.user;
}

export async function searchUsersRemote(query: string): Promise<SocialUser[]> {
  await startAnonymousSession();
  const invoke = callable<{ query: string }, SocialSearchResponse>('searchUsers');
  const response = await invoke({ query });
  return response.data.users;
}

export async function getSocialOverviewRemote(): Promise<SocialOverview> {
  await startAnonymousSession();
  const invoke = callable<Record<string, never>, SocialOverview>('getSocialOverview');
  const response = await invoke({});
  return response.data;
}

export async function getStudyGroupsRemote(): Promise<StudyGroup[]> {
  await startAnonymousSession();
  const invoke = callable<Record<string, never>, { groups: StudyGroup[] }>('getStudyGroups');
  const response = await invoke({});
  return response.data.groups;
}

export async function createStudyGroupRemote(name: string): Promise<StudyGroup> {
  await startAnonymousSession();
  const invoke = callable<{ name: string }, { group: StudyGroup }>('createStudyGroup');
  const response = await invoke({ name });
  return response.data.group;
}

export async function joinStudyGroupRemote(code: string): Promise<StudyGroup> {
  await startAnonymousSession();
  const invoke = callable<{ code: string }, { group: StudyGroup }>('joinStudyGroup');
  const response = await invoke({ code });
  return response.data.group;
}

export async function getStudyGroupRemote(groupId: string): Promise<StudyGroupDetail> {
  await startAnonymousSession();
  const invoke = callable<{ groupId: string }, { group: StudyGroupDetail }>('getStudyGroup');
  const response = await invoke({ groupId });
  return response.data.group;
}

export async function leaveStudyGroupRemote(groupId: string): Promise<void> {
  await startAnonymousSession();
  const invoke = callable<{ groupId: string }, { groupId: string; left: boolean }>('leaveStudyGroup');
  await invoke({ groupId });
}

export async function createStudyGroupCompetitionRemote(input: {
  groupId: string;
  name: string;
  metric: StudyGroupCompetitionMetric;
  durationDays: number;
}): Promise<void> {
  await startAnonymousSession();
  const invoke = callable<typeof input, { groupId: string; competitionId: string }>(
    'createStudyGroupCompetition',
  );
  await invoke(input);
}

export async function sendFriendRequestRemote(targetUid: string): Promise<FriendRequest> {
  await startAnonymousSession();
  const invoke = callable<{ targetUid: string }, FriendRequestResponse>('sendFriendRequest');
  const response = await invoke({ targetUid });
  return response.data.request;
}

export async function respondFriendRequestRemote(
  requestId: string,
  accept: boolean,
): Promise<void> {
  await startAnonymousSession();
  const invoke = callable<{ requestId: string; accept: boolean }, unknown>(
    'respondFriendRequest',
  );
  await invoke({ requestId, accept });
}

export async function removeFriendRemote(friendUid: string): Promise<void> {
  await startAnonymousSession();
  const invoke = callable<{ friendUid: string }, unknown>('removeFriend');
  await invoke({ friendUid });
}

export async function sendFriendDuelInvitationRemote(
  friendUid: string,
): Promise<FriendDuelInvitation> {
  await startAnonymousSession();
  const invoke = callable<{ friendUid: string }, FriendDuelInvitationResponse>(
    'sendFriendDuelInvitation',
  );
  const response = await invoke({ friendUid });
  return response.data.invitation;
}

export async function respondFriendDuelInvitationRemote(
  invitationId: string,
  accept: boolean,
): Promise<FriendDuelInvitation | null> {
  await startAnonymousSession();
  const invoke = callable<
    { invitationId: string; accept: boolean },
    FriendDuelInvitationResponse | { declined: true }
  >('respondFriendDuelInvitation');
  const response = await invoke({ invitationId, accept });
  return 'invitation' in response.data ? response.data.invitation : null;
}

export async function openFriendDuelRemote(duelId: string): Promise<OpenFriendDuelResponse> {
  await startAnonymousSession();
  const invoke = callable<{ duelId: string }, OpenFriendDuelResponse>('openFriendDuel');
  const response = await invoke({ duelId });
  return response.data;
}

export async function submitFriendDuelRemote(
  duelId: string,
  answers: QuizAnswerSubmission[],
): Promise<SubmitFriendDuelResponse> {
  await startAnonymousSession();
  const invoke = callable<
    { duelId: string; answers: QuizAnswerSubmission[] },
    SubmitFriendDuelResponse
  >('submitFriendDuel');
  const response = await invoke({ duelId, answers });
  return response.data;
}

export async function joinMatchmakingRemote(): Promise<MatchmakingState> {
  await startAnonymousSession();
  const invoke = callable<Record<string, never>, MatchmakingResponse>('joinMatchmaking');
  const response = await invoke({});
  return response.data.matchmaking;
}

export async function getMatchmakingStatusRemote(): Promise<MatchmakingState> {
  await startAnonymousSession();
  const invoke = callable<Record<string, never>, MatchmakingResponse>('getMatchmakingStatus');
  const response = await invoke({});
  return response.data.matchmaking;
}

export async function leaveMatchmakingRemote(): Promise<MatchmakingState> {
  await startAnonymousSession();
  const invoke = callable<Record<string, never>, MatchmakingResponse>('leaveMatchmaking');
  const response = await invoke({});
  return response.data.matchmaking;
}

export async function getRankingRemote(scope: RankingScope): Promise<RankingSnapshot> {
  await startAnonymousSession();
  const invoke = callable<{ scope: RankingScope }, RankingSnapshot>('getRanking');
  const response = await invoke({ scope });
  return response.data;
}

export async function bootstrapEmulatorAdminRemote(): Promise<void> {
  if (!usingFirebaseEmulators()) throw new Error('El panel administrativo requiere emuladores.');
  await startAnonymousSession();
  const invoke = callable<Record<string, never>, { role: string }>('bootstrapEmulatorAdmin');
  await invoke({});
}

export async function getQuestionReviewQueueRemote(limit = 50): Promise<AdminQuestion[]> {
  await startAnonymousSession();
  const invoke = callable<{ limit: number }, { questions: AdminQuestion[] }>(
    'getQuestionReviewQueue',
  );
  const response = await invoke({ limit });
  return response.data.questions;
}

export async function getQuestionReportsQueueRemote(limit = 50): Promise<AdminQuestionReport[]> {
  await startAnonymousSession();
  const invoke = callable<{limit: number}, {reports: AdminQuestionReport[]}>(
    'getQuestionReportsQueue',
  );
  return (await invoke({limit})).data.reports;
}

export async function resolveQuestionReportRemote(
  reportId: string,
  resolution: QuestionReportResolution,
): Promise<void> {
  await startAnonymousSession();
  const invoke = callable<
    {reportId: string; resolution: QuestionReportResolution},
    {reportId: string}
  >('resolveQuestionReport');
  await invoke({reportId, resolution});
}

export async function getOfficialExamsRemote(): Promise<OfficialExam[]> {
  await startAnonymousSession();
  const invoke = callable<Record<string, never>, OfficialExamsResponse>('getOfficialExams');
  return (await invoke({})).data.exams;
}

export async function startOfficialExamRemote(examId: string): Promise<StartOfficialExamResponse> {
  await startAnonymousSession();
  const invoke = callable<{ examId: string }, StartOfficialExamResponse>('startOfficialExam');
  return (await invoke({ examId })).data;
}

export async function getAdminCatalogRemote(): Promise<AdminCatalog> {
  await startAnonymousSession();
  const invoke = callable<Record<string, never>, { catalog: AdminCatalog }>('getAdminCatalog');
  return (await invoke({})).data.catalog;
}

export async function upsertAdminCatalogItemRemote<T extends AdminCatalogItem>(
  kind: AdminCatalogKind,
  item: T,
): Promise<T> {
  await startAnonymousSession();
  const invoke = callable<
    { kind: AdminCatalogKind; id: string; item: T },
    { item: T }
  >('upsertAdminCatalogItem');
  return (await invoke({ kind, id: item.id, item })).data.item;
}

export async function getAdminOperationsRemote(): Promise<AdminOperations> {
  await startAnonymousSession();
  const invoke = callable<Record<string, never>, { operations: AdminOperations }>(
    'getAdminOperations',
  );
  return (await invoke({})).data.operations;
}

export async function upsertAdminOperationItemRemote<T extends AdminOperationItem>(
  kind: AdminOperationKind,
  item: T,
): Promise<T> {
  await startAnonymousSession();
  const invoke = callable<
    { kind: AdminOperationKind; id: string; item: T },
    { item: T }
  >('upsertAdminOperationItem');
  return (await invoke({ kind, id: item.id, item })).data.item;
}

export async function reviewQuestionRemote(
  questionId: string,
  decision: AdminReviewDecision,
  question?: AdminQuestion,
): Promise<AdminQuestion> {
  await startAnonymousSession();
  const invoke = callable<
    { questionId: string; decision: AdminReviewDecision; question?: AdminQuestion },
    { question: AdminQuestion }
  >('reviewQuestion');
  const response = await invoke({ questionId, decision, question });
  return response.data.question;
}

export async function bulkReviewQuestionsRemote(
  questionIds: string[],
  decision: AdminBulkReviewDecision,
): Promise<BulkReviewResult> {
  await startAnonymousSession();
  const invoke = callable<
    { questionIds: string[]; decision: AdminBulkReviewDecision },
    BulkReviewResult
  >('bulkReviewQuestions');
  const response = await invoke({ questionIds, decision });
  return response.data;
}

export async function importQuestionBatchRemote(batch: unknown): Promise<QuestionImportResult> {
  await startAnonymousSession();
  const invoke = callable<unknown, QuestionImportResult>('importQuestionBatch');
  const response = await invoke(batch);
  return response.data;
}

export function isFirebaseEnabled(): boolean {
  return firebaseEnabled;
}

export function getFirebaseAppForAnalytics(): FirebaseApp | null {
  return firebaseApp();
}

export function isUsingFirebaseEmulators(): boolean {
  return usingFirebaseEmulators();
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
