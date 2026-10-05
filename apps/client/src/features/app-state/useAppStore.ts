import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  ActiveCustomQuiz,
  AvatarInventory,
  CustomQuizConfig,
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
  PendingFriendDuel,
  Question,
  QuizResult,
  RankingEntry,
  RankingScope,
  RankingSnapshot,
  SocialActivity,
  SocialUser,
  StudyGroup,
  StudyGroupCompetitionMetric,
  StudyGroupDetail,
  TerritorySelection,
  UserQuestionStat,
} from '@/core/domain/types';
import { trackEvent } from '@/core/analytics/analytics';
import {
  bootstrapGuestProfile,
  claimDailyRewardRemote,
  claimMissionRemote,
  createStudyGroupRemote,
  createStudyGroupCompetitionRemote,
  equipAvatarItemRemote,
  getAvatarShopRemote,
  getDailyEngagementRemote,
  getErrorReviewRemote,
  getLearningInsightsRemote,
  getMatchmakingStatusRemote,
  getMonetizationOverviewRemote,
  getOfficialExamsRemote,
  getRankingRemote,
  getSocialOverviewRemote,
  getStudyGroupRemote,
  getStudyGroupsRemote,
  isFirebaseEnabled,
  joinMatchmakingRemote,
  joinStudyGroupRemote,
  leaveStudyGroupRemote,
  leaveMatchmakingRemote,
  linkEmailAccountRemote,
  linkGoogleAccountRemote,
  readableFirebaseError,
  restoreFirebaseSessionRemote,
  removeFriendRemote,
  respondFriendRequestRemote,
  respondFriendDuelInvitationRemote,
  searchUsersRemote,
  sendFriendDuelInvitationRemote,
  sendFriendRequestRemote,
  sendAccountPasswordResetRemote,
  setPublicUsernameRemote,
  signInEmailAccountRemote,
  signInGoogleAccountRemote,
  signOutAccountRemote,
  startAnonymousSession,
  startCustomQuizRemote,
  startErrorReviewRemote,
  startQuickQuizRemote,
  startOfficialExamRemote,
  startClassicDuelRemote,
  openFriendDuelRemote,
  purchaseAvatarItemRemote,
  submitFriendDuelRemote,
  submitClassicDuelRemote,
  submitQuizSessionRemote,
} from '@/core/firebase/firebaseClient';
import {firebaseFailureKind} from '@/core/firebase/firebaseError';
import {
  avatarCatalog,
  defaultAvatarInventory,
} from '@/features/avatar/data/avatarCatalog';
import {
  localDailyEngagement,
  progressLocalMissions,
} from '@/features/gamification/domain/engagement';
import { localMonetizationOverview } from '@/features/premium/domain/monetization';
import {
  FIREFIGHTER_OPPOSITION_ID,
  FIREFIGHTER_OPPOSITION_NAME,
} from '@/features/onboarding/data/options';
import { eligibleForCustomQuiz, eligibleForQuickMatch } from '@/features/quiz/domain/questionFilter';
import { buildLearningInsights } from '@/features/quiz/domain/learningInsights';
import {
  applyResult,
  BLANK_ANSWER_ID,
  scoreQuickMatch,
} from '@/features/quiz/domain/scoring';
import { seedQuestions } from '@/features/quiz/data/seedQuestions';
import { duelOutcome, localOpponentPerformance } from '@/features/duels/domain/duel';
import { localSocialUsers } from '@/features/social/data/localSocialUsers';

type BackendMode = 'local' | 'firebase';
type ActiveGameMode = 'quick' | 'custom-practice' | 'simulation' | 'error-review' | 'official-exam' | 'duel' | 'friend-duel' | 'matchmaking-duel';
export type ConnectionStatus = 'idle' | 'checking' | 'connected' | 'offline' | 'session-expired';

type AppStore = {
  hydrated: boolean;
  backendMode: BackendMode;
  profile: PlayerProfile | null;
  activeQuestions: Question[];
  activeSessionId: string | null;
  activeGameMode: ActiveGameMode;
  activeOfficialExam: OfficialExam | null;
  activeCustomQuiz: ActiveCustomQuiz | null;
  activeDuelOpponent: DuelOpponent | null;
  activeStartedAt: number | null;
  selectedAnswers: Record<string, string | null>;
  questionStats: Record<string, UserQuestionStat>;
  errorReviewItems: ErrorReviewItem[];
  learningInsights: LearningInsights | null;
  dailyReward: DailyReward | null;
  missions: Mission[];
  avatarInventory: AvatarInventory;
  monetization: MonetizationOverview;
  officialExams: OfficialExam[];
  friends: SocialUser[];
  socialActivity: SocialActivity[];
  studyGroups: StudyGroup[];
  activeStudyGroup: StudyGroupDetail | null;
  incomingRequests: FriendRequest[];
  outgoingRequests: FriendRequest[];
  duelInvitations: FriendDuelInvitation[];
  matchmaking: MatchmakingState;
  ranking: RankingSnapshot | null;
  rankingScope: RankingScope;
  socialSearchResults: SocialUser[];
  lastResult: QuizResult | null;
  lastDuelResult: DuelResult | null;
  lastPendingFriendDuel: PendingFriendDuel | null;
  isStartingQuiz: boolean;
  isStartingDuel: boolean;
  isLoadingOfficialExams: boolean;
  isLoadingErrorReview: boolean;
  isLoadingLearningInsights: boolean;
  isSubmittingQuiz: boolean;
  isLoadingEngagement: boolean;
  isClaimingDailyReward: boolean;
  claimingMissionId: string | null;
  quizError: string | null;
  officialExamsError: string | null;
  errorReviewError: string | null;
  learningInsightsError: string | null;
  engagementError: string | null;
  avatarActionId: string | null;
  avatarError: string | null;
  isLoadingMonetization: boolean;
  monetizationError: string | null;
  isLoadingSocial: boolean;
  isLoadingGroups: boolean;
  isMatchmakingLoading: boolean;
  isLoadingRanking: boolean;
  isSavingUsername: boolean;
  socialActionId: string | null;
  groupAction: 'create' | 'join' | 'leave' | 'competition' | null;
  socialError: string | null;
  groupsError: string | null;
  rankingError: string | null;
  isAccountLoading: boolean;
  accountError: string | null;
  connectionStatus: ConnectionStatus;
  connectionMessage: string | null;
  isRestoringSession: boolean;
  lastSyncedAt: number | null;
  setHydrated: (hydrated: boolean) => void;
  restoreSession: () => Promise<boolean>;
  linkEmailAccount: (email: string, password: string) => Promise<boolean>;
  linkGoogleAccount: () => Promise<boolean>;
  signInEmailAccount: (email: string, password: string) => Promise<boolean>;
  signInGoogleAccount: () => Promise<boolean>;
  sendAccountPasswordReset: (email: string) => Promise<boolean>;
  signOutAccount: () => Promise<boolean>;
  clearAccountError: () => void;
  startGuest: (territory: TerritorySelection) => Promise<void>;
  startQuickMatch: () => Promise<number>;
  startCustomQuiz: (config: CustomQuizConfig) => Promise<number>;
  loadOfficialExams: () => Promise<void>;
  startOfficialExam: (exam: OfficialExam) => Promise<number>;
  startClassicDuel: (opponent: DuelOpponent) => Promise<number>;
  loadErrorReview: () => Promise<void>;
  loadLearningInsights: () => Promise<void>;
  startErrorReview: (categoryId?: string | null) => Promise<number>;
  answerQuestion: (questionId: string, answerId: string | null) => void;
  finishQuiz: () => Promise<QuizResult | null>;
  clearQuizError: () => void;
  refreshDailyEngagement: () => Promise<void>;
  claimDailyReward: () => Promise<boolean>;
  claimMission: (missionId: string) => Promise<boolean>;
  refreshAvatarShop: () => Promise<void>;
  purchaseAvatarItem: (itemId: string) => Promise<boolean>;
  equipAvatarItem: (itemId: string) => Promise<boolean>;
  refreshMonetization: () => Promise<void>;
  refreshSocial: () => Promise<void>;
  refreshStudyGroups: () => Promise<void>;
  createStudyGroup: (name: string) => Promise<StudyGroup | null>;
  joinStudyGroup: (code: string) => Promise<StudyGroup | null>;
  openStudyGroup: (groupId: string) => Promise<boolean>;
  createStudyGroupCompetition: (input: {
    groupId: string;
    name: string;
    metric: StudyGroupCompetitionMetric;
    durationDays: number;
  }) => Promise<boolean>;
  leaveStudyGroup: (groupId: string) => Promise<boolean>;
  setPublicUsername: (username: string) => Promise<boolean>;
  searchSocialUsers: (query: string) => Promise<void>;
  sendFriendRequest: (user: SocialUser) => Promise<boolean>;
  respondFriendRequest: (requestId: string, accept: boolean) => Promise<boolean>;
  removeFriend: (friendUid: string) => Promise<boolean>;
  sendFriendDuelInvitation: (friend: SocialUser) => Promise<boolean>;
  respondFriendDuelInvitation: (invitationId: string, accept: boolean) => Promise<boolean>;
  openFriendDuel: (
    invitation: FriendDuelInvitation,
  ) => Promise<'quiz' | 'results' | 'waiting' | null>;
  joinMatchmaking: () => Promise<void>;
  refreshMatchmaking: () => Promise<void>;
  leaveMatchmaking: () => Promise<void>;
  openMatchmakingDuel: () => Promise<'quiz' | 'results' | 'waiting' | null>;
  loadRanking: (scope: RankingScope) => Promise<void>;
};

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      hydrated: false,
      backendMode: 'local',
      profile: null,
      activeQuestions: [],
      activeSessionId: null,
      activeGameMode: 'quick',
      activeOfficialExam: null,
      activeCustomQuiz: null,
      activeDuelOpponent: null,
      activeStartedAt: null,
      selectedAnswers: {},
      questionStats: {},
      errorReviewItems: [],
      learningInsights: null,
      dailyReward: null,
      missions: [],
      avatarInventory: defaultAvatarInventory(),
      monetization: localMonetizationOverview(0),
      officialExams: [],
      friends: [],
      socialActivity: [],
      studyGroups: [],
      activeStudyGroup: null,
      incomingRequests: [],
      outgoingRequests: [],
      duelInvitations: [],
      matchmaking: { status: 'idle', rating: 1000 },
      ranking: null,
      rankingScope: 'global',
      socialSearchResults: [],
      lastResult: null,
      lastDuelResult: null,
      lastPendingFriendDuel: null,
      isStartingQuiz: false,
      isStartingDuel: false,
      isLoadingOfficialExams: false,
      isLoadingErrorReview: false,
      isLoadingLearningInsights: false,
      isSubmittingQuiz: false,
      isLoadingEngagement: false,
      isClaimingDailyReward: false,
      claimingMissionId: null,
      quizError: null,
      officialExamsError: null,
      errorReviewError: null,
      learningInsightsError: null,
      engagementError: null,
      avatarActionId: null,
      avatarError: null,
      isLoadingMonetization: false,
      monetizationError: null,
      isLoadingSocial: false,
      isLoadingGroups: false,
      isMatchmakingLoading: false,
      isLoadingRanking: false,
      isSavingUsername: false,
      socialActionId: null,
      groupAction: null,
      socialError: null,
      groupsError: null,
      rankingError: null,
      isAccountLoading: false,
      accountError: null,
      connectionStatus: 'idle',
      connectionMessage: null,
      isRestoringSession: false,
      lastSyncedAt: null,
      setHydrated: (hydrated) => set({ hydrated }),
      restoreSession: async () => {
        const state = get();
        if (!state.hydrated || state.isRestoringSession) return false;
        if (!isFirebaseEnabled()) {
          set({connectionStatus: 'connected', connectionMessage: null});
          return true;
        }

        if (state.backendMode !== 'firebase') {
          if (!state.profile) {
            set({connectionStatus: 'connected', connectionMessage: null});
            return true;
          }
          if (!state.profile.isGuest || state.profile.totalQuestions > 0) {
            set({
              connectionStatus: 'offline',
              connectionMessage: 'Tu progreso local sigue guardado en este dispositivo.',
            });
            return false;
          }

          set({
            connectionStatus: 'checking',
            connectionMessage: null,
            isRestoringSession: true,
          });
          try {
            const uid = await startAnonymousSession();
            const profile = await bootstrapGuestProfile({...state.profile, uid});
            set({
              backendMode: 'firebase',
              profile,
              connectionStatus: 'connected',
              connectionMessage: null,
              lastSyncedAt: Date.now(),
            });
            return true;
          } catch (error) {
            set(sessionRecoveryFailureState(error));
            return false;
          } finally {
            set({isRestoringSession: false});
          }
        }

        set({
          connectionStatus: 'checking',
          connectionMessage: null,
          isRestoringSession: true,
        });
        try {
          const profile = await restoreFirebaseSessionRemote();
          set({
            profile,
            connectionStatus: 'connected',
            connectionMessage: null,
            lastSyncedAt: Date.now(),
          });
          return true;
        } catch (error) {
          const failure = sessionRecoveryFailureState(error);
          if (firebaseFailureKind(error) === 'session-expired') {
            set({...authenticatedSessionState(null), ...failure});
          } else {
            set(failure);
          }
          return false;
        } finally {
          set({isRestoringSession: false});
        }
      },
      linkEmailAccount: async (email, password) => {
        const state = get();
        if (!state.profile || state.backendMode !== 'firebase' || state.isAccountLoading) {
          set({ accountError: 'Necesitas una sesión de invitado conectada con Firebase.' });
          return false;
        }
        set({ isAccountLoading: true, accountError: null });
        try {
          const profile = await linkEmailAccountRemote(email, password);
          set({
            profile,
            connectionStatus: 'connected',
            connectionMessage: null,
            lastSyncedAt: Date.now(),
          });
          void trackEvent('signup_completed', { auth_method: 'email' });
          return true;
        } catch (error) {
          set({...connectionFailureState(error), accountError: readableFirebaseError(error)});
          return false;
        } finally {
          set({ isAccountLoading: false });
        }
      },
      linkGoogleAccount: async () => {
        const state = get();
        if (!state.profile || state.backendMode !== 'firebase' || state.isAccountLoading) {
          set({ accountError: 'Necesitas una sesión de invitado conectada con Firebase.' });
          return false;
        }
        set({ isAccountLoading: true, accountError: null });
        try {
          const profile = await linkGoogleAccountRemote();
          set({
            profile,
            connectionStatus: 'connected',
            connectionMessage: null,
            lastSyncedAt: Date.now(),
          });
          void trackEvent('signup_completed', { auth_method: 'google' });
          return true;
        } catch (error) {
          set({...connectionFailureState(error), accountError: readableFirebaseError(error)});
          return false;
        } finally {
          set({ isAccountLoading: false });
        }
      },
      signInEmailAccount: async (email, password) => {
        const state = get();
        if (!isFirebaseEnabled() || state.isAccountLoading) {
          set({ accountError: 'El acceso necesita Firebase activado.' });
          return false;
        }
        set({ isAccountLoading: true, accountError: null });
        try {
          const profile = await signInEmailAccountRemote(email, password);
          set({
            ...authenticatedSessionState(profile),
            connectionStatus: 'connected',
            connectionMessage: null,
            lastSyncedAt: Date.now(),
          });
          void trackEvent('login_completed', { auth_method: 'email' });
          return true;
        } catch (error) {
          set({...connectionFailureState(error), accountError: readableFirebaseError(error)});
          return false;
        } finally {
          set({ isAccountLoading: false });
        }
      },
      signInGoogleAccount: async () => {
        const state = get();
        if (!isFirebaseEnabled() || state.isAccountLoading) {
          set({ accountError: 'El acceso necesita Firebase activado.' });
          return false;
        }
        set({ isAccountLoading: true, accountError: null });
        try {
          const profile = await signInGoogleAccountRemote();
          set({
            ...authenticatedSessionState(profile),
            connectionStatus: 'connected',
            connectionMessage: null,
            lastSyncedAt: Date.now(),
          });
          void trackEvent('login_completed', { auth_method: 'google' });
          return true;
        } catch (error) {
          set({...connectionFailureState(error), accountError: readableFirebaseError(error)});
          return false;
        } finally {
          set({ isAccountLoading: false });
        }
      },
      sendAccountPasswordReset: async (email) => {
        if (!isFirebaseEnabled()) {
          set({ accountError: 'La recuperación necesita Firebase activado.' });
          return false;
        }
        set({ isAccountLoading: true, accountError: null });
        try {
          await sendAccountPasswordResetRemote(email);
          return true;
        } catch (error) {
          set({...connectionFailureState(error), accountError: readableFirebaseError(error)});
          return false;
        } finally {
          set({ isAccountLoading: false });
        }
      },
      signOutAccount: async () => {
        set({ isAccountLoading: true, accountError: null });
        try {
          await signOutAccountRemote();
          set({
            ...authenticatedSessionState(null),
            connectionStatus: 'connected',
            connectionMessage: null,
          });
          return true;
        } catch (error) {
          set({...connectionFailureState(error), accountError: readableFirebaseError(error)});
          return false;
        } finally {
          set({ isAccountLoading: false });
        }
      },
      clearAccountError: () => set({ accountError: null }),
      startGuest: async (territory) => {
        let backendMode: BackendMode = 'local';
        let uid = 'local_guest';

        if (isFirebaseEnabled()) {
          try {
            uid = await startAnonymousSession();
            backendMode = 'firebase';
          } catch {
            uid = 'local_guest';
          }
        }

        let profile: PlayerProfile = localGuestProfile(uid, territory);
        let engagement = localDailyEngagement();
        if (backendMode === 'firebase') {
          try {
            profile = await bootstrapGuestProfile(profile);
            engagement = await getDailyEngagementRemote();
          } catch {
            backendMode = 'local';
            profile = localGuestProfile('local_guest', territory);
            engagement = localDailyEngagement();
          }
        }

        set({
          backendMode,
          profile,
          activeQuestions: [],
          activeSessionId: null,
          activeGameMode: 'quick',
          activeOfficialExam: null,
          activeCustomQuiz: null,
          activeDuelOpponent: null,
          activeStartedAt: null,
          selectedAnswers: {},
          questionStats: {},
          errorReviewItems: [],
          learningInsights: null,
          dailyReward: engagement.dailyReward,
          missions: engagement.missions,
          avatarInventory: defaultAvatarInventory(profile.coins, profile.gems),
          monetization: localMonetizationOverview(profile.gems),
          officialExams: [],
          friends: [],
          socialActivity: [],
          studyGroups: [],
          activeStudyGroup: null,
          incomingRequests: [],
          outgoingRequests: [],
          duelInvitations: [],
          matchmaking: { status: 'idle', rating: 1000 },
          ranking: null,
          rankingScope: 'global',
          socialSearchResults: [],
          lastResult: null,
          lastDuelResult: null,
          lastPendingFriendDuel: null,
          quizError: null,
          errorReviewError: null,
          learningInsightsError: null,
          engagementError: null,
          socialError: null,
          groupsError: null,
          rankingError: null,
          monetizationError: null,
          connectionStatus: backendMode === 'firebase' || !isFirebaseEnabled()
            ? 'connected'
            : 'offline',
          connectionMessage: backendMode === 'firebase' || !isFirebaseEnabled()
            ? null
            : 'Estás usando el modo sin conexión. Tu progreso se guarda en este dispositivo.',
          lastSyncedAt: backendMode === 'firebase' ? Date.now() : null,
        });
        void trackEvent('guest_started', {
          backend_mode: backendMode,
          territory_scope: territory.municipality
            ? 'municipal'
            : territory.autonomousCommunity
              ? 'regional'
              : 'national',
        });
      },
      startQuickMatch: async () => {
        const { profile, backendMode } = get();
        if (!profile) return 0;
        set({ isStartingQuiz: true, quizError: null });

        try {
          let activeQuestions: Question[];
          let activeSessionId: string | null = null;
          if (backendMode === 'firebase') {
            const remote = await startQuickQuizRemote(10);
            activeQuestions = remote.questions;
            activeSessionId = remote.sessionId;
          } else {
            activeQuestions = eligibleForQuickMatch(profile, seedQuestions);
          }

          set({
            activeQuestions,
            activeSessionId,
            activeGameMode: 'quick',
            activeOfficialExam: null,
            activeCustomQuiz: null,
            activeDuelOpponent: null,
            activeStartedAt: Date.now(),
            selectedAnswers: Object.fromEntries(
              activeQuestions.map((question) => [question.id, null]),
            ),
            lastResult: null,
            lastDuelResult: null,
            lastPendingFriendDuel: null,
          });
          void trackEvent('quiz_started', {
            game_mode: 'quick',
            question_count: activeQuestions.length,
            backend_mode: backendMode,
          });
          return activeQuestions.length;
        } catch (error) {
          set({...connectionFailureState(error), quizError: readableFirebaseError(error)});
          return 0;
        } finally {
          set({ isStartingQuiz: false });
        }
      },
      startCustomQuiz: async (config) => {
        const { profile, backendMode, questionStats } = get();
        if (!profile) return 0;
        set({ isStartingQuiz: true, quizError: null });

        try {
          let activeQuestions: Question[];
          let activeSessionId: string | null = null;
          let activeCustomQuiz: ActiveCustomQuiz;
          if (backendMode === 'firebase') {
            const remote = await startCustomQuizRemote(config);
            activeQuestions = remote.questions;
            activeSessionId = remote.sessionId;
            activeCustomQuiz = remote.customQuiz;
          } else {
            activeQuestions = eligibleForCustomQuiz(profile, seedQuestions, questionStats, config);
            activeCustomQuiz = {
              ...config,
              actualQuestionCount: activeQuestions.length,
              rules: config.mode === 'simulation'
                ? {
                    questionCount: activeQuestions.length,
                    durationSeconds: Math.max(300, activeQuestions.length * 60),
                    correctPoints: 1,
                    incorrectPenalty: 0.33,
                    blankPoints: 0,
                  }
                : null,
            };
          }
          if (activeQuestions.length === 0) {
            set({ quizError: 'No hay preguntas que coincidan con esos filtros.' });
            return 0;
          }

          set({
            activeQuestions,
            activeSessionId,
            activeGameMode: config.mode === 'simulation' ? 'simulation' : 'custom-practice',
            activeOfficialExam: null,
            activeCustomQuiz,
            activeDuelOpponent: null,
            activeStartedAt: Date.now(),
            selectedAnswers: Object.fromEntries(
              activeQuestions.map((question) => [question.id, null]),
            ),
            lastResult: null,
            lastDuelResult: null,
            lastPendingFriendDuel: null,
          });
          void trackEvent('quiz_started', {
            game_mode: config.mode === 'simulation' ? 'simulation' : 'custom_practice',
            question_count: activeQuestions.length,
            backend_mode: backendMode,
            category_id: config.categoryId ?? 'all',
            question_status: config.questionStatus,
          });
          return activeQuestions.length;
        } catch (error) {
          set({...connectionFailureState(error), quizError: readableFirebaseError(error)});
          return 0;
        } finally {
          set({ isStartingQuiz: false });
        }
      },
      loadOfficialExams: async () => {
        const { backendMode } = get();
        set({ isLoadingOfficialExams: true, officialExamsError: null });
        try {
          const officialExams = backendMode === 'firebase'
            ? await getOfficialExamsRemote()
            : [];
          set({ officialExams });
        } catch (error) {
          set({
            ...connectionFailureState(error),
            officialExamsError: readableFirebaseError(error),
          });
        } finally {
          set({ isLoadingOfficialExams: false });
        }
      },
      startOfficialExam: async (exam) => {
        const { profile, backendMode } = get();
        if (!profile || backendMode !== 'firebase') return 0;
        set({ isStartingQuiz: true, quizError: null });
        try {
          const remote = await startOfficialExamRemote(exam.id);
          const activeQuestions = remote.questions;
          set({
            activeQuestions,
            activeSessionId: remote.sessionId,
            activeGameMode: 'official-exam',
            activeOfficialExam: remote.exam,
            activeCustomQuiz: null,
            activeDuelOpponent: null,
            activeStartedAt: Date.now(),
            selectedAnswers: Object.fromEntries(
              activeQuestions.map((question) => [question.id, null]),
            ),
            lastResult: null,
            lastDuelResult: null,
            lastPendingFriendDuel: null,
          });
          void trackEvent('official_exam_started', {
            exam_id: remote.exam.id,
            question_count: activeQuestions.length,
          });
          return activeQuestions.length;
        } catch (error) {
          set({...connectionFailureState(error), quizError: readableFirebaseError(error)});
          return 0;
        } finally {
          set({ isStartingQuiz: false });
        }
      },
      startClassicDuel: async (opponent) => {
        const { profile, backendMode } = get();
        if (!profile) return 0;
        set({ isStartingDuel: true, quizError: null });

        try {
          let activeQuestions: Question[];
          let activeSessionId: string;
          let activeOpponent = opponent;
          if (backendMode === 'firebase') {
            const remote = await startClassicDuelRemote(opponent.id);
            activeQuestions = remote.questions;
            activeSessionId = remote.duelId;
            activeOpponent = remote.opponent;
          } else {
            activeQuestions = eligibleForQuickMatch(profile, seedQuestions);
            activeSessionId = `local_${Date.now()}`;
          }

          set({
            activeQuestions,
            activeSessionId,
            activeGameMode: 'duel',
            activeOfficialExam: null,
            activeCustomQuiz: null,
            activeDuelOpponent: activeOpponent,
            activeStartedAt: Date.now(),
            selectedAnswers: Object.fromEntries(
              activeQuestions.map((question) => [question.id, null]),
            ),
            lastResult: null,
            lastDuelResult: null,
            lastPendingFriendDuel: null,
          });
          void trackEvent('duel_created', {
            duel_kind: 'training',
            question_count: activeQuestions.length,
          });
          void trackEvent('quiz_started', {
            game_mode: 'duel',
            question_count: activeQuestions.length,
            backend_mode: backendMode,
          });
          return activeQuestions.length;
        } catch (error) {
          set({...connectionFailureState(error), quizError: readableFirebaseError(error)});
          return 0;
        } finally {
          set({ isStartingDuel: false });
        }
      },
      loadErrorReview: async () => {
        const { backendMode, profile, questionStats } = get();
        if (!profile) return;
        set({ isLoadingErrorReview: true, errorReviewError: null });
        try {
          const errorReviewItems = backendMode === 'firebase'
            ? await getErrorReviewRemote()
            : seedQuestions
              .filter((question) => {
                const stat = questionStats[question.id];
                const needsReview = stat?.needsReview ??
                  Boolean(stat && (stat.incorrectCount > 0 || stat.blankCount > 0));
                return question.oppositionId === profile.oppositionId && needsReview;
              })
              .map((question) => ({question, stat: questionStats[question.id]}));
          set({ errorReviewItems });
        } catch (error) {
          set({
            ...connectionFailureState(error),
            errorReviewError: readableFirebaseError(error),
          });
        } finally {
          set({ isLoadingErrorReview: false });
        }
      },
      loadLearningInsights: async () => {
        const { backendMode, profile, questionStats } = get();
        if (!profile) return;
        set({ isLoadingLearningInsights: true, learningInsightsError: null });
        try {
          const learningInsights = backendMode === 'firebase'
            ? await getLearningInsightsRemote()
            : buildLearningInsights(seedQuestions, questionStats);
          set({ learningInsights });
        } catch (error) {
          set({
            ...connectionFailureState(error),
            learningInsightsError: readableFirebaseError(error),
          });
        } finally {
          set({ isLoadingLearningInsights: false });
        }
      },
      startErrorReview: async (categoryId = null) => {
        const { profile, backendMode, errorReviewItems } = get();
        const filteredItems = categoryId
          ? errorReviewItems.filter((item) => item.question.categoryId === categoryId)
          : errorReviewItems;
        if (!profile || filteredItems.length === 0) return 0;
        set({ isStartingQuiz: true, quizError: null });
        try {
          let activeQuestions: Question[];
          let activeSessionId: string | null = null;
          if (backendMode === 'firebase') {
            const remote = await startErrorReviewRemote(10, categoryId);
            activeQuestions = remote.questions;
            activeSessionId = remote.sessionId;
          } else {
            activeQuestions = filteredItems.slice(0, 10).map((item) => item.question);
          }
          set({
            activeQuestions,
            activeSessionId,
            activeGameMode: 'error-review',
            activeOfficialExam: null,
            activeCustomQuiz: null,
            activeDuelOpponent: null,
            activeStartedAt: Date.now(),
            selectedAnswers: Object.fromEntries(
              activeQuestions.map((question) => [question.id, null]),
            ),
            lastResult: null,
            lastDuelResult: null,
            lastPendingFriendDuel: null,
            quizError: null,
          });
          void trackEvent('quiz_started', {
            game_mode: 'error_review',
            question_count: activeQuestions.length,
            backend_mode: backendMode,
          });
          return activeQuestions.length;
        } catch (error) {
          set({...connectionFailureState(error), quizError: readableFirebaseError(error)});
          return 0;
        } finally {
          set({ isStartingQuiz: false });
        }
      },
      answerQuestion: (questionId, answerId) => {
        set((state) => ({
          selectedAnswers: {
            ...state.selectedAnswers,
            [questionId]: answerId ?? BLANK_ANSWER_ID,
          },
        }));
        void trackEvent('question_answered', { answered: answerId !== null });
      },
      finishQuiz: async () => {
        const state = get();
        if (!state.profile || state.activeQuestions.length === 0) return null;
        set({ isSubmittingQuiz: true, quizError: null });

        try {
          let result: QuizResult;
          let profile: PlayerProfile;
          let dailyReward = state.dailyReward;
          let missions: Mission[];
          let duelResult: DuelResult | null = null;
          let pendingFriendDuel: PendingFriendDuel | null = null;
          let duelInvitations = state.duelInvitations;
          let matchmaking = state.matchmaking;

          if (
            state.backendMode === 'firebase' &&
            state.activeSessionId &&
            ['friend-duel', 'matchmaking-duel'].includes(state.activeGameMode)
          ) {
            const submission = quizSubmission(state);
            const remote = await submitFriendDuelRemote(state.activeSessionId, submission);
            result = remote.result;
            duelResult = remote.duel;
            profile = { ...state.profile, ...remote.progress };
            dailyReward = remote.engagement.dailyReward;
            missions = remote.engagement.missions;
            pendingFriendDuel = remote.status === 'waiting' && state.activeDuelOpponent
              ? {
                duelId: state.activeSessionId,
                opponent: state.activeDuelOpponent,
                kind: state.activeGameMode === 'matchmaking-duel' ? 'matchmaking' : 'friend',
              }
              : null;
            if (state.activeGameMode === 'friend-duel') {
              duelInvitations = state.duelInvitations.map((invitation) =>
                invitation.duelId === state.activeSessionId
                  ? {
                    ...invitation,
                    status: remote.status,
                    viewerSubmitted: true,
                    opponentSubmitted: remote.status === 'completed',
                  }
                  : invitation,
              );
            } else if (matchmaking.status === 'matched') {
              matchmaking = {
                ...matchmaking,
                duelStatus: remote.status,
                viewerSubmitted: true,
                opponentSubmitted: remote.status === 'completed',
              };
            }
          } else if (
            state.backendMode === 'firebase' &&
            state.activeSessionId &&
            state.activeGameMode === 'duel'
          ) {
            const submission = quizSubmission(state);
            const remote = await submitClassicDuelRemote(state.activeSessionId, submission);
            result = remote.result;
            duelResult = remote.duel;
            profile = { ...state.profile, ...remote.progress };
            dailyReward = remote.engagement.dailyReward;
            missions = remote.engagement.missions;
          } else if (state.backendMode === 'firebase' && state.activeSessionId) {
            const submission = quizSubmission(state);
            const remote = await submitQuizSessionRemote(state.activeSessionId, submission);
            result = remote.result;
            profile = { ...state.profile, ...remote.progress };
            dailyReward = remote.engagement.dailyReward;
            missions = remote.engagement.missions;
          } else {
            result = scoreQuickMatch(state.activeQuestions, state.selectedAnswers);
            if (state.activeGameMode === 'simulation' && state.activeCustomQuiz?.rules) {
              const rules = state.activeCustomQuiz.rules;
              result = {
                ...result,
                points: Math.round((
                  result.correct * rules.correctPoints
                  - result.incorrect * rules.incorrectPenalty
                  + result.blank * rules.blankPoints
                ) * 100) / 100,
                maximumPoints: state.activeQuestions.length * rules.correctPoints,
              };
            }
            if (state.activeGameMode !== 'quick' && state.activeDuelOpponent) {
              const opponent = localOpponentPerformance(state.activeDuelOpponent.id);
              const elapsedMs = Math.min(
                Math.max(0, Date.now() - (state.activeStartedAt ?? Date.now())),
                3_600_000,
              );
              const outcome = duelOutcome(
                result.correct,
                elapsedMs,
                Math.min(opponent.correct, state.activeQuestions.length),
                opponent.elapsedMs,
              );
              const bonusXp = outcome === 'win' ? 20 : outcome === 'draw' ? 10 : 0;
              const bonusCoins = outcome === 'win' ? 10 : outcome === 'draw' ? 5 : 0;
              result = {
                ...result,
                xpEarned: result.xpEarned + bonusXp,
                coinsEarned: result.coinsEarned + bonusCoins,
              };
              duelResult = {
                duelId: state.activeSessionId ?? `local_${Date.now()}`,
                kind: state.activeGameMode === 'friend-duel'
                  ? 'friend'
                  : state.activeGameMode === 'matchmaking-duel'
                    ? 'matchmaking'
                    : 'training',
                opponent: state.activeDuelOpponent,
                outcome,
                playerCorrect: result.correct,
                opponentCorrect: Math.min(opponent.correct, state.activeQuestions.length),
                playerElapsedMs: elapsedMs,
                opponentElapsedMs: opponent.elapsedMs,
              };
              if (state.activeGameMode === 'friend-duel') {
                duelInvitations = state.duelInvitations.map((invitation) =>
                  invitation.duelId === state.activeSessionId
                    ? {
                      ...invitation,
                      status: 'completed',
                      viewerSubmitted: true,
                      opponentSubmitted: true,
                    }
                    : invitation,
                );
              } else if (state.activeGameMode === 'matchmaking-duel' &&
                matchmaking.status === 'matched') {
                matchmaking = {
                  ...matchmaking,
                  rating: matchmaking.rating + (outcome === 'win' ? 12 : outcome === 'loss' ? -12 : 0),
                  duelStatus: 'completed',
                  viewerSubmitted: true,
                  opponentSubmitted: true,
                };
              }
            }
            profile = applyResult(state.profile, result);
            if (duelResult) {
              profile = {
                ...profile,
                duelsPlayed: (profile.duelsPlayed ?? 0) + 1,
                duelWins: (profile.duelWins ?? 0) + (duelResult.outcome === 'win' ? 1 : 0),
                duelLosses: (profile.duelLosses ?? 0) + (duelResult.outcome === 'loss' ? 1 : 0),
                duelDraws: (profile.duelDraws ?? 0) + (duelResult.outcome === 'draw' ? 1 : 0),
              };
            }
            const engagement = localDailyEngagement(state.dailyReward, state.missions);
            dailyReward = engagement.dailyReward;
            missions = progressLocalMissions(
              engagement.missions,
              result,
              state.activeGameMode === 'quick',
            );
          }

          set({
            profile,
            questionStats: applyQuestionStats(state.questionStats, result),
            dailyReward,
            missions,
            lastResult: result,
            lastDuelResult: duelResult,
            lastPendingFriendDuel: pendingFriendDuel,
            duelInvitations,
            matchmaking,
            activeSessionId: null,
          });
          void trackEvent('quiz_completed', {
            game_mode: state.activeGameMode,
            question_count: state.activeQuestions.length,
            correct_count: result.correct,
            blank_count: result.blank,
            duration_ms: Math.max(0, Date.now() - (state.activeStartedAt ?? Date.now())),
          });
          if (state.activeGameMode === 'official-exam' && state.activeOfficialExam) {
            void trackEvent('official_exam_completed', {
              exam_id: state.activeOfficialExam.id,
              question_count: state.activeQuestions.length,
              score_points: result.points,
            });
          }
          if (duelResult) {
            void trackEvent('duel_completed', {
              duel_kind: duelResult.kind,
              outcome: duelResult.outcome,
            });
          }
          if (profile.level > state.profile.level) {
            void trackEvent('level_up', { level: profile.level });
          }
          if (profile.currentStreak > state.profile.currentStreak) {
            void trackEvent('streak_extended', { streak_days: profile.currentStreak });
          } else if (profile.currentStreak < state.profile.currentStreak) {
            void trackEvent('streak_lost', { previous_streak_days: state.profile.currentStreak });
          }
          return result;
        } catch (error) {
          set({...connectionFailureState(error), quizError: readableFirebaseError(error)});
          return null;
        } finally {
          set({ isSubmittingQuiz: false });
        }
      },
      clearQuizError: () => set({ quizError: null }),
      refreshDailyEngagement: async () => {
        const state = get();
        if (!state.profile || state.isLoadingEngagement) return;
        set({ isLoadingEngagement: true, engagementError: null });
        try {
          const engagement =
            state.backendMode === 'firebase'
              ? await getDailyEngagementRemote()
              : localDailyEngagement(state.dailyReward, state.missions);
          set({ dailyReward: engagement.dailyReward, missions: engagement.missions });
        } catch (error) {
          set({...connectionFailureState(error), engagementError: readableFirebaseError(error)});
        } finally {
          set({ isLoadingEngagement: false });
        }
      },
      claimDailyReward: async () => {
        const state = get();
        if (!state.profile || !state.dailyReward || state.dailyReward.claimed) return false;
        set({ isClaimingDailyReward: true, engagementError: null });
        try {
          if (state.backendMode === 'firebase') {
            const remote = await claimDailyRewardRemote();
            set({
              profile: { ...state.profile, ...remote.progress },
              dailyReward: remote.dailyReward,
            });
          } else {
            const engagement = localDailyEngagement(state.dailyReward, state.missions);
            set({
              profile: {
                ...state.profile,
                coins: state.profile.coins + engagement.dailyReward.coins,
                gems: state.profile.gems + engagement.dailyReward.gems,
              },
              dailyReward: { ...engagement.dailyReward, claimed: true },
              missions: engagement.missions,
            });
          }
          void trackEvent('daily_reward_claimed', {
            reward_day: state.dailyReward.day,
            coins: state.dailyReward.coins,
            gems: state.dailyReward.gems,
          });
          return true;
        } catch (error) {
          set({...connectionFailureState(error), engagementError: readableFirebaseError(error)});
          return false;
        } finally {
          set({ isClaimingDailyReward: false });
        }
      },
      claimMission: async (missionId) => {
        const state = get();
        if (!state.profile || state.claimingMissionId) return false;
        const mission = state.missions.find((item) => item.id === missionId);
        if (!mission || mission.claimed || mission.progress < mission.target) return false;
        set({ claimingMissionId: missionId, engagementError: null });
        try {
          if (state.backendMode === 'firebase') {
            const remote = await claimMissionRemote(missionId);
            set({
              profile: { ...state.profile, ...remote.progress },
              missions: state.missions.map((item) =>
                item.id === missionId ? remote.mission : item,
              ),
            });
          } else {
            const xp = state.profile.xp + mission.rewardXp;
            set({
              profile: {
                ...state.profile,
                xp,
                level: Math.floor(Math.sqrt(xp / 100)) + 1,
                coins: state.profile.coins + mission.rewardCoins,
              },
              missions: state.missions.map((item) =>
                item.id === missionId ? { ...item, claimed: true } : item,
              ),
            });
          }
          void trackEvent('mission_completed', {
            mission_type: mission.type,
            reward_xp: mission.rewardXp,
            reward_coins: mission.rewardCoins,
          });
          return true;
        } catch (error) {
          set({...connectionFailureState(error), engagementError: readableFirebaseError(error)});
          return false;
        } finally {
          set({ claimingMissionId: null });
        }
      },
      refreshAvatarShop: async () => {
        const state = get();
        if (!state.profile || state.avatarActionId === 'refresh') return;
        set({ avatarActionId: 'refresh', avatarError: null });
        try {
          if (state.backendMode === 'firebase') {
            const inventory = await getAvatarShopRemote();
            set({
              avatarInventory: inventory,
              profile: {
                ...state.profile,
                coins: inventory.coins,
                gems: inventory.gems,
              },
            });
          } else {
            set({
              avatarInventory: {
                ...state.avatarInventory,
                coins: state.profile.coins,
                gems: state.profile.gems,
              },
            });
          }
        } catch (error) {
          set({...connectionFailureState(error), avatarError: readableFirebaseError(error)});
        } finally {
          set({ avatarActionId: null });
        }
      },
      purchaseAvatarItem: async (itemId) => {
        const state = get();
        if (!state.profile || state.avatarActionId) return false;
        const item = (state.avatarInventory.items ?? avatarCatalog)
          .find((catalogItem) => catalogItem.id === itemId);
        if (!item) return false;
        if (state.avatarInventory.ownedItemIds.includes(item.id)) return true;

        set({ avatarActionId: item.id, avatarError: null });
        try {
          if (state.backendMode === 'firebase') {
            const inventory = await purchaseAvatarItemRemote(item.id);
            set({
              avatarInventory: inventory,
              profile: {
                ...state.profile,
                coins: inventory.coins,
                gems: inventory.gems,
              },
            });
          } else {
            const balance = state.profile[item.currency];
            if (balance < item.price) {
              set({ avatarError: item.currency === 'coins'
                ? 'No tienes monedas suficientes.'
                : 'No tienes gemas suficientes.' });
              return false;
            }
            const profile = {
              ...state.profile,
              [item.currency]: balance - item.price,
            };
            set({
              profile,
              avatarInventory: {
                ...state.avatarInventory,
                ownedItemIds: [...state.avatarInventory.ownedItemIds, item.id],
                coins: profile.coins,
                gems: profile.gems,
              },
            });
          }
          void trackEvent('item_purchased', {
            item_category: item.category,
            currency: item.currency,
            price: item.price,
          });
          return true;
        } catch (error) {
          set({...connectionFailureState(error), avatarError: readableFirebaseError(error)});
          return false;
        } finally {
          set({ avatarActionId: null });
        }
      },
      equipAvatarItem: async (itemId) => {
        const state = get();
        if (!state.profile || state.avatarActionId) return false;
        const item = avatarCatalog.find((catalogItem) => catalogItem.id === itemId);
        if (!item || !state.avatarInventory.ownedItemIds.includes(item.id)) return false;

        set({ avatarActionId: item.id, avatarError: null });
        try {
          if (state.backendMode === 'firebase') {
            const inventory = await equipAvatarItemRemote(item.id);
            set({ avatarInventory: inventory });
          } else {
            set({
              avatarInventory: {
                ...state.avatarInventory,
                equipped: {
                  ...state.avatarInventory.equipped,
                  [item.slot]: item.id,
                },
              },
            });
          }
          void trackEvent('item_equipped', {
            item_category: item.category,
            item_slot: item.slot,
          });
          return true;
        } catch (error) {
          set({...connectionFailureState(error), avatarError: readableFirebaseError(error)});
          return false;
        } finally {
          set({ avatarActionId: null });
        }
      },
      refreshMonetization: async () => {
        const state = get();
        if (!state.profile || state.isLoadingMonetization) return;
        set({ isLoadingMonetization: true, monetizationError: null });
        try {
          const monetization = state.backendMode === 'firebase'
            ? await getMonetizationOverviewRemote()
            : localMonetizationOverview(state.profile.gems);
          set({ monetization });
        } catch (error) {
          set({...connectionFailureState(error), monetizationError: readableFirebaseError(error)});
        } finally {
          set({ isLoadingMonetization: false });
        }
      },
      refreshSocial: async () => {
        const state = get();
        if (!state.profile || state.isLoadingSocial) return;
        set({ isLoadingSocial: true, socialError: null });
        try {
          if (state.backendMode === 'firebase') {
            const overview = await getSocialOverviewRemote();
            set(overview);
          }
        } catch (error) {
          set({...connectionFailureState(error), socialError: readableFirebaseError(error)});
        } finally {
          set({ isLoadingSocial: false });
        }
      },
      refreshStudyGroups: async () => {
        const state = get();
        if (!state.profile || state.isLoadingGroups) return;
        if (state.backendMode !== 'firebase') {
          set({ groupsError: 'Los grupos necesitan la conexión segura con Firebase.' });
          return;
        }
        set({ isLoadingGroups: true, groupsError: null });
        try {
          set({ studyGroups: await getStudyGroupsRemote() });
        } catch (error) {
          set({...connectionFailureState(error), groupsError: readableFirebaseError(error)});
        } finally {
          set({ isLoadingGroups: false });
        }
      },
      createStudyGroup: async (name) => {
        const state = get();
        if (!state.profile || state.groupAction) return null;
        if (state.backendMode !== 'firebase') {
          set({ groupsError: 'Los grupos necesitan la conexión segura con Firebase.' });
          return null;
        }
        const trimmed = name.trim().replace(/\s+/g, ' ');
        if (trimmed.length < 3 || trimmed.length > 40) {
          set({ groupsError: 'El nombre debe tener entre 3 y 40 caracteres.' });
          return null;
        }
        set({ groupAction: 'create', groupsError: null });
        try {
          const group = await createStudyGroupRemote(trimmed);
          set({
            studyGroups: [group, ...state.studyGroups.filter((item) => item.id !== group.id)],
          });
          void trackEvent('group_created');
          return group;
        } catch (error) {
          set({...connectionFailureState(error), groupsError: readableFirebaseError(error)});
          return null;
        } finally {
          set({ groupAction: null });
        }
      },
      joinStudyGroup: async (code) => {
        const state = get();
        if (!state.profile || state.groupAction) return null;
        if (state.backendMode !== 'firebase') {
          set({ groupsError: 'Los grupos necesitan la conexión segura con Firebase.' });
          return null;
        }
        const normalized = code.trim().toUpperCase().replace(/[\s-]+/g, '');
        if (!/^[A-HJ-NP-Z2-9]{8}$/.test(normalized)) {
          set({ groupsError: 'Introduce un código de grupo válido de 8 caracteres.' });
          return null;
        }
        set({ groupAction: 'join', groupsError: null });
        try {
          const group = await joinStudyGroupRemote(normalized);
          set({
            studyGroups: [group, ...state.studyGroups.filter((item) => item.id !== group.id)],
          });
          void trackEvent('group_joined');
          return group;
        } catch (error) {
          set({...connectionFailureState(error), groupsError: readableFirebaseError(error)});
          return null;
        } finally {
          set({ groupAction: null });
        }
      },
      openStudyGroup: async (groupId) => {
        const state = get();
        if (!state.profile || state.isLoadingGroups || state.backendMode !== 'firebase') return false;
        set({ isLoadingGroups: true, groupsError: null });
        try {
          set({ activeStudyGroup: await getStudyGroupRemote(groupId) });
          return true;
        } catch (error) {
          set({...connectionFailureState(error), groupsError: readableFirebaseError(error)});
          return false;
        } finally {
          set({ isLoadingGroups: false });
        }
      },
      createStudyGroupCompetition: async (input) => {
        const state = get();
        if (!state.profile || state.groupAction || state.backendMode !== 'firebase') return false;
        const name = input.name.trim().replace(/\s+/g, ' ');
        if (name.length < 3 || name.length > 40) {
          set({ groupsError: 'El nombre debe tener entre 3 y 40 caracteres.' });
          return false;
        }
        set({ groupAction: 'competition', groupsError: null });
        try {
          await createStudyGroupCompetitionRemote({ ...input, name });
          set({ activeStudyGroup: await getStudyGroupRemote(input.groupId) });
          return true;
        } catch (error) {
          set({...connectionFailureState(error), groupsError: readableFirebaseError(error)});
          return false;
        } finally {
          set({ groupAction: null });
        }
      },
      leaveStudyGroup: async (groupId) => {
        const state = get();
        if (!state.profile || state.groupAction || state.backendMode !== 'firebase') return false;
        set({ groupAction: 'leave', groupsError: null });
        try {
          await leaveStudyGroupRemote(groupId);
          set({
            studyGroups: state.studyGroups.filter((group) => group.id !== groupId),
            activeStudyGroup: state.activeStudyGroup?.id === groupId
              ? null
              : state.activeStudyGroup,
          });
          return true;
        } catch (error) {
          set({...connectionFailureState(error), groupsError: readableFirebaseError(error)});
          return false;
        } finally {
          set({ groupAction: null });
        }
      },
      setPublicUsername: async (username) => {
        const state = get();
        if (!state.profile || state.isSavingUsername) return false;
        const trimmed = username.trim();
        if (!/^[A-Za-z0-9_]{3,20}$/.test(trimmed)) {
          set({ socialError: 'Usa entre 3 y 20 letras, números o guiones bajos.' });
          return false;
        }
        set({ isSavingUsername: true, socialError: null });
        try {
          let savedUsername = trimmed;
          if (state.backendMode === 'firebase') {
            savedUsername = (await setPublicUsernameRemote(trimmed)).username;
          } else if (
            localSocialUsers.some(
              (user) => user.username.toLowerCase() === trimmed.toLowerCase(),
            )
          ) {
            set({ socialError: 'Ese nombre ya está reservado en la demo local.' });
            return false;
          }
          set({
            profile: { ...state.profile, username: savedUsername },
            socialSearchResults: [],
          });
          return true;
        } catch (error) {
          set({...connectionFailureState(error), socialError: readableFirebaseError(error)});
          return false;
        } finally {
          set({ isSavingUsername: false });
        }
      },
      searchSocialUsers: async (query) => {
        const state = get();
        if (!state.profile) return;
        const trimmed = query.trim();
        if (!/^[A-Za-z0-9_]{3,20}$/.test(trimmed)) {
          set({
            socialSearchResults: [],
            socialError: 'Escribe el nombre exacto, con al menos 3 caracteres.',
          });
          return;
        }
        set({ isLoadingSocial: true, socialError: null, socialSearchResults: [] });
        try {
          const users = state.backendMode === 'firebase'
            ? await searchUsersRemote(trimmed)
            : localSocialUsers.filter(
              (user) => user.username.toLowerCase() === trimmed.toLowerCase(),
            );
          set({
            socialSearchResults: users.filter(
              (user) => !state.friends.some((friend) => friend.uid === user.uid),
            ),
            socialError: users.length === 0 ? 'No se ha encontrado ese usuario.' : null,
          });
        } catch (error) {
          set({...connectionFailureState(error), socialError: readableFirebaseError(error)});
        } finally {
          set({ isLoadingSocial: false });
        }
      },
      sendFriendRequest: async (user) => {
        const state = get();
        if (!state.profile || state.socialActionId) return false;
        set({ socialActionId: user.uid, socialError: null });
        try {
          let request: FriendRequest;
          if (state.backendMode === 'firebase') {
            request = await sendFriendRequestRemote(user.uid);
          } else {
            if (state.outgoingRequests.some((item) => item.user.uid === user.uid)) {
              set({ socialError: 'Ya hay una solicitud pendiente.' });
              return false;
            }
            request = {
              id: `local_${state.profile.uid}_${user.uid}`,
              direction: 'outgoing',
              status: 'pending',
              user,
              createdAt: new Date().toISOString(),
            };
          }
          set({
            outgoingRequests: [...state.outgoingRequests, request],
            socialSearchResults: state.socialSearchResults.filter(
              (item) => item.uid !== user.uid,
            ),
          });
          void trackEvent('friend_request_sent');
          return true;
        } catch (error) {
          set({...connectionFailureState(error), socialError: readableFirebaseError(error)});
          return false;
        } finally {
          set({ socialActionId: null });
        }
      },
      respondFriendRequest: async (requestId, accept) => {
        const state = get();
        if (state.socialActionId) return false;
        const request = state.incomingRequests.find((item) => item.id === requestId);
        if (!request) return false;
        set({ socialActionId: requestId, socialError: null });
        try {
          if (state.backendMode === 'firebase') {
            await respondFriendRequestRemote(requestId, accept);
            const overview = await getSocialOverviewRemote();
            set(overview);
          } else {
            set({
              incomingRequests: state.incomingRequests.filter((item) => item.id !== requestId),
              friends: accept ? [...state.friends, request.user] : state.friends,
            });
          }
          if (accept) void trackEvent('friend_added');
          return true;
        } catch (error) {
          set({...connectionFailureState(error), socialError: readableFirebaseError(error)});
          return false;
        } finally {
          set({ socialActionId: null });
        }
      },
      removeFriend: async (friendUid) => {
        const state = get();
        if (state.socialActionId) return false;
        set({ socialActionId: friendUid, socialError: null });
        try {
          if (state.backendMode === 'firebase') await removeFriendRemote(friendUid);
          set({ friends: state.friends.filter((friend) => friend.uid !== friendUid) });
          return true;
        } catch (error) {
          set({...connectionFailureState(error), socialError: readableFirebaseError(error)});
          return false;
        } finally {
          set({ socialActionId: null });
        }
      },
      sendFriendDuelInvitation: async (friend) => {
        const state = get();
        if (!state.profile || state.socialActionId) return false;
        if (state.duelInvitations.some(
          (invitation) => invitation.opponent.uid === friend.uid &&
            ['pending', 'active', 'waiting'].includes(invitation.status),
        )) {
          set({ socialError: 'Ya tenéis un reto activo.' });
          return false;
        }
        set({ socialActionId: `duel_${friend.uid}`, socialError: null });
        try {
          let invitation: FriendDuelInvitation;
          if (state.backendMode === 'firebase') {
            invitation = await sendFriendDuelInvitationRemote(friend.uid);
          } else {
            invitation = {
              id: `local_duel_${state.profile.uid}_${friend.uid}`,
              direction: 'outgoing',
              status: 'active',
              duelId: `local_friend_${Date.now()}`,
              opponent: friend,
              viewerSubmitted: false,
              opponentSubmitted: false,
              createdAt: new Date().toISOString(),
            };
          }
          set({
            duelInvitations: [
              ...state.duelInvitations.filter((item) => item.opponent.uid !== friend.uid),
              invitation,
            ],
          });
          return true;
        } catch (error) {
          set({...connectionFailureState(error), socialError: readableFirebaseError(error)});
          return false;
        } finally {
          set({ socialActionId: null });
        }
      },
      respondFriendDuelInvitation: async (invitationId, accept) => {
        const state = get();
        if (state.socialActionId) return false;
        const invitation = state.duelInvitations.find((item) => item.id === invitationId);
        if (!invitation) return false;
        set({ socialActionId: invitationId, socialError: null });
        try {
          if (state.backendMode === 'firebase') {
            await respondFriendDuelInvitationRemote(invitationId, accept);
            const overview = await getSocialOverviewRemote();
            set(overview);
          } else if (accept) {
            set({
              duelInvitations: state.duelInvitations.map((item) => item.id === invitationId
                ? { ...item, status: 'active', duelId: item.duelId ?? `local_friend_${Date.now()}` }
                : item),
            });
          } else {
            set({ duelInvitations: state.duelInvitations.filter((item) => item.id !== invitationId) });
          }
          if (accept) void trackEvent('duel_joined', { duel_kind: 'friend' });
          return true;
        } catch (error) {
          set({...connectionFailureState(error), socialError: readableFirebaseError(error)});
          return false;
        } finally {
          set({ socialActionId: null });
        }
      },
      openFriendDuel: async (invitation) => {
        const state = get();
        if (!state.profile || !invitation.duelId || state.isStartingDuel || state.socialActionId) {
          return null;
        }
        set({
          isStartingDuel: true,
          socialActionId: invitation.id,
          socialError: null,
          quizError: null,
        });
        try {
          const opponent = socialUserToDuelOpponent(invitation.opponent);
          if (state.backendMode === 'firebase') {
            const remote = await openFriendDuelRemote(invitation.duelId);
            const profile = { ...state.profile, ...remote.progress };
            if (remote.status === 'active' && remote.questions.length > 0) {
              set({
                profile,
                activeQuestions: remote.questions,
                activeSessionId: remote.duelId,
                activeGameMode: 'friend-duel',
                activeOfficialExam: null,
                activeCustomQuiz: null,
                activeDuelOpponent: remote.opponent,
                activeStartedAt: Date.now(),
                selectedAnswers: Object.fromEntries(
                  remote.questions.map((question) => [question.id, null]),
                ),
                lastResult: null,
                lastDuelResult: null,
                lastPendingFriendDuel: null,
              });
              return 'quiz';
            }
            if (remote.status === 'completed' && remote.result && remote.duel) {
              set({
                profile,
                lastResult: remote.result,
                lastDuelResult: remote.duel,
                lastPendingFriendDuel: null,
              });
              return 'results';
            }
            if (remote.status === 'waiting' && remote.result) {
              set({
                profile,
                lastResult: remote.result,
                lastDuelResult: null,
                lastPendingFriendDuel: {
                  duelId: remote.duelId,
                  opponent: remote.opponent,
                  kind: 'friend',
                },
              });
              return 'waiting';
            }
            throw new Error('El duelo no está disponible todavía.');
          }

          const activeQuestions = eligibleForQuickMatch(state.profile, seedQuestions);
          set({
            activeQuestions,
            activeSessionId: invitation.duelId,
            activeGameMode: 'friend-duel',
            activeOfficialExam: null,
            activeCustomQuiz: null,
            activeDuelOpponent: opponent,
            activeStartedAt: Date.now(),
            selectedAnswers: Object.fromEntries(
              activeQuestions.map((question) => [question.id, null]),
            ),
            lastResult: null,
            lastDuelResult: null,
            lastPendingFriendDuel: null,
          });
          return 'quiz';
        } catch (error) {
          set({...connectionFailureState(error), socialError: readableFirebaseError(error)});
          return null;
        } finally {
          set({ isStartingDuel: false, socialActionId: null });
        }
      },
      joinMatchmaking: async () => {
        const state = get();
        if (!state.profile || state.isMatchmakingLoading || state.profile.username === 'Invitado') {
          return;
        }
        set({ isMatchmakingLoading: true, socialError: null });
        void trackEvent('matchmaking_started');
        try {
          if (state.backendMode === 'firebase') {
            set({ matchmaking: await joinMatchmakingRemote() });
            return;
          }
          const queuedAt = new Date().toISOString();
          set({ matchmaking: { status: 'waiting', rating: 1000, range: 100, queuedAt } });
          await new Promise((resolve) => setTimeout(resolve, 650));
          const opponent = localSocialUsers[0];
          set({
            matchmaking: {
              status: 'matched',
              rating: 1000,
              duelId: `local_matchmaking_${Date.now()}`,
              opponent,
              duelStatus: 'active',
              viewerSubmitted: false,
              opponentSubmitted: false,
            },
          });
        } catch (error) {
          set({...connectionFailureState(error), socialError: readableFirebaseError(error)});
        } finally {
          set({ isMatchmakingLoading: false });
        }
      },
      refreshMatchmaking: async () => {
        const state = get();
        if (!state.profile || state.backendMode !== 'firebase' || state.isMatchmakingLoading) return;
        try {
          set({ matchmaking: await getMatchmakingStatusRemote() });
        } catch (error) {
          set({...connectionFailureState(error), socialError: readableFirebaseError(error)});
        }
      },
      leaveMatchmaking: async () => {
        const state = get();
        if (!state.profile || state.matchmaking.status !== 'waiting' || state.isMatchmakingLoading) {
          return;
        }
        set({ isMatchmakingLoading: true, socialError: null });
        try {
          const matchmaking = state.backendMode === 'firebase'
            ? await leaveMatchmakingRemote()
            : { status: 'idle' as const, rating: state.matchmaking.rating };
          set({ matchmaking });
        } catch (error) {
          set({...connectionFailureState(error), socialError: readableFirebaseError(error)});
        } finally {
          set({ isMatchmakingLoading: false });
        }
      },
      openMatchmakingDuel: async () => {
        const state = get();
        if (!state.profile || state.matchmaking.status !== 'matched' || state.isStartingDuel) {
          return null;
        }
        const match = state.matchmaking;
        set({ isStartingDuel: true, socialError: null, quizError: null });
        try {
          const opponent = socialUserToDuelOpponent(match.opponent);
          if (state.backendMode === 'firebase') {
            const remote = await openFriendDuelRemote(match.duelId);
            const profile = { ...state.profile, ...remote.progress };
            if (remote.status === 'active' && remote.questions.length > 0) {
              set({
                profile,
                activeQuestions: remote.questions,
                activeSessionId: remote.duelId,
                activeGameMode: 'matchmaking-duel',
                activeOfficialExam: null,
                activeCustomQuiz: null,
                activeDuelOpponent: remote.opponent,
                activeStartedAt: Date.now(),
                selectedAnswers: Object.fromEntries(
                  remote.questions.map((question) => [question.id, null]),
                ),
                lastResult: null,
                lastDuelResult: null,
                lastPendingFriendDuel: null,
              });
              return 'quiz';
            }
            if (remote.status === 'completed' && remote.result && remote.duel) {
              set({
                profile,
                lastResult: remote.result,
                lastDuelResult: remote.duel,
                lastPendingFriendDuel: null,
              });
              return 'results';
            }
            if (remote.status === 'waiting' && remote.result) {
              set({
                profile,
                lastResult: remote.result,
                lastDuelResult: null,
                lastPendingFriendDuel: {
                  duelId: remote.duelId,
                  opponent: remote.opponent,
                  kind: 'matchmaking',
                },
              });
              return 'waiting';
            }
            throw new Error('El duelo no está disponible todavía.');
          }

          const activeQuestions = eligibleForQuickMatch(state.profile, seedQuestions);
          set({
            activeQuestions,
            activeSessionId: match.duelId,
            activeGameMode: 'matchmaking-duel',
            activeOfficialExam: null,
            activeCustomQuiz: null,
            activeDuelOpponent: opponent,
            activeStartedAt: Date.now(),
            selectedAnswers: Object.fromEntries(
              activeQuestions.map((question) => [question.id, null]),
            ),
            lastResult: null,
            lastDuelResult: null,
            lastPendingFriendDuel: null,
          });
          return 'quiz';
        } catch (error) {
          set({...connectionFailureState(error), socialError: readableFirebaseError(error)});
          return null;
        } finally {
          set({ isStartingDuel: false });
        }
      },
      loadRanking: async (scope) => {
        const state = get();
        if (!state.profile || state.isLoadingRanking) return;
        set({ rankingScope: scope, isLoadingRanking: true, rankingError: null });
        try {
          const ranking = state.backendMode === 'firebase'
            ? await getRankingRemote(scope)
            : localRankingSnapshot(state.profile, scope, state.friends);
          set({ ranking });
        } catch (error) {
          set({...connectionFailureState(error), rankingError: readableFirebaseError(error)});
        } finally {
          set({ isLoadingRanking: false });
        }
      },
    }),
    {
      name: 'opocompit-client-state',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        backendMode: state.backendMode,
        profile: state.profile,
        activeQuestions: state.activeSessionId ? state.activeQuestions : [],
        activeSessionId: state.activeSessionId,
        activeGameMode: state.activeGameMode,
        activeOfficialExam: state.activeOfficialExam,
        activeCustomQuiz: state.activeCustomQuiz,
        activeDuelOpponent: state.activeDuelOpponent,
        activeStartedAt: state.activeSessionId ? state.activeStartedAt : null,
        selectedAnswers: state.activeSessionId ? state.selectedAnswers : {},
        questionStats: state.questionStats,
        dailyReward: state.dailyReward,
        missions: state.missions,
        avatarInventory: state.avatarInventory,
        monetization: state.monetization,
        friends: state.friends,
        socialActivity: state.socialActivity,
        incomingRequests: state.incomingRequests,
        outgoingRequests: state.outgoingRequests,
        duelInvitations: state.duelInvitations,
        matchmaking: state.matchmaking,
        rankingScope: state.rankingScope,
      }),
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
    },
  ),
);

function socialUserToDuelOpponent(user: SocialUser): DuelOpponent {
  return {
    id: user.uid,
    name: user.username,
    level: user.level,
    territoryLabel: user.territoryLabel,
  };
}

function connectionFailureState(error: unknown): Partial<AppStore> {
  const kind = firebaseFailureKind(error);
  if (kind === 'offline') {
    return {
      connectionStatus: 'offline',
      connectionMessage: 'Sin conexión. Mostramos los últimos datos guardados.',
    };
  }
  if (kind === 'session-expired') {
    return {
      ...authenticatedSessionState(null),
      connectionStatus: 'session-expired',
      connectionMessage: 'Tu sesión ha caducado. Inicia sesión para recuperar tu progreso.',
    };
  }
  return {};
}

function sessionRecoveryFailureState(error: unknown): Partial<AppStore> {
  const failure = connectionFailureState(error);
  if (failure.connectionStatus) return failure;
  return {
    connectionStatus: 'offline',
    connectionMessage: 'No pudimos conectar con el servicio. Mostramos tus últimos datos.',
  };
}

function authenticatedSessionState(profile: PlayerProfile | null): Partial<AppStore> {
  return {
    backendMode: isFirebaseEnabled() ? 'firebase' : 'local',
    profile,
    activeQuestions: [],
    activeSessionId: null,
    activeGameMode: 'quick',
    activeOfficialExam: null,
    activeCustomQuiz: null,
    activeDuelOpponent: null,
    activeStartedAt: null,
    selectedAnswers: {},
    questionStats: {},
    errorReviewItems: [],
    learningInsights: null,
    dailyReward: null,
    missions: [],
    avatarInventory: defaultAvatarInventory(profile?.coins ?? 0, profile?.gems ?? 0),
    monetization: localMonetizationOverview(profile?.gems ?? 0),
    officialExams: [],
    friends: [],
    socialActivity: [],
    studyGroups: [],
    activeStudyGroup: null,
    incomingRequests: [],
    outgoingRequests: [],
    duelInvitations: [],
    matchmaking: { status: 'idle', rating: 1000 },
    ranking: null,
    rankingScope: 'global',
    socialSearchResults: [],
    lastResult: null,
    lastDuelResult: null,
    lastPendingFriendDuel: null,
    quizError: null,
    officialExamsError: null,
    errorReviewError: null,
    learningInsightsError: null,
    engagementError: null,
    avatarError: null,
    monetizationError: null,
    socialError: null,
    groupsError: null,
    rankingError: null,
    accountError: null,
  };
}

function localRankingSnapshot(
  profile: PlayerProfile,
  scope: RankingScope,
  friends: SocialUser[],
): RankingSnapshot {
  const scores: Record<string, number> = {
    local_mario: 3960,
    local_lucia: 4820,
    local_alex: 4390,
  };
  const candidates = scope === 'friends'
    ? friends
    : scope === 'territory'
      ? localSocialUsers.filter((user) =>
        profile.territory.label.toLowerCase().includes(user.territoryLabel.toLowerCase()),
      )
      : localSocialUsers;
  const uniqueCandidates = [...new Map(candidates.map((user) => [user.uid, user])).values()];
  const rawEntries: Omit<RankingEntry, 'position'>[] = [
    ...uniqueCandidates.map((user) => ({
      uid: user.uid,
      username: user.username,
      level: user.level,
      territoryLabel: user.territoryLabel,
      score: scores[user.uid] ?? user.duelWins * 100,
      isViewer: false,
    })),
    {
      uid: profile.uid,
      username: profile.username,
      level: profile.level,
      territoryLabel: profile.territory.label,
      score: profile.xp,
      isViewer: true,
    },
  ];
  const sorted = rawEntries.sort((first, second) =>
    second.score - first.score || first.uid.localeCompare(second.uid),
  );
  let previousScore: number | null = null;
  let position = 0;
  const entries = sorted.map((entry, index) => {
    if (entry.score !== previousScore) position = index + 1;
    previousScore = entry.score;
    return { ...entry, position };
  });
  return {
    scope,
    period: 'all_time',
    territoryLabel: scope === 'territory' ? profile.territory.label : null,
    entries,
    viewer: entries.find((entry) => entry.isViewer) ?? null,
  };
}

function localGuestProfile(uid: string, territory: TerritorySelection): PlayerProfile {
  return {
    uid,
    username: 'Invitado',
    isGuest: true,
    oppositionId: FIREFIGHTER_OPPOSITION_ID,
    oppositionName: FIREFIGHTER_OPPOSITION_NAME,
    territory,
    xp: 0,
    level: 1,
    coins: 0,
    gems: 0,
    currentStreak: 0,
    bestStreak: 0,
    totalQuestions: 0,
    correctAnswers: 0,
    testsCompleted: 0,
    duelsPlayed: 0,
    duelWins: 0,
    duelLosses: 0,
    duelDraws: 0,
  };
}

function quizSubmission(state: AppStore) {
  return state.activeQuestions.map((question) => ({
    questionId: question.id,
    selectedAnswerId:
      state.selectedAnswers[question.id] === BLANK_ANSWER_ID
        ? null
        : (state.selectedAnswers[question.id] ?? null),
  }));
}

function applyQuestionStats(
  current: Record<string, UserQuestionStat>,
  result: QuizResult,
): Record<string, UserQuestionStat> {
  const updated = { ...current };
  result.attempts.forEach((attempt) => {
    const previous = updated[attempt.question.id];
    updated[attempt.question.id] = {
      questionId: attempt.question.id,
      categoryId: attempt.question.categoryId,
      timesSeen: (previous?.timesSeen ?? 0) + 1,
      correctCount: (previous?.correctCount ?? 0) + (attempt.isCorrect ? 1 : 0),
      incorrectCount:
        (previous?.incorrectCount ?? 0) + (!attempt.isCorrect && !attempt.isBlank ? 1 : 0),
      blankCount: (previous?.blankCount ?? 0) + (attempt.isBlank ? 1 : 0),
      needsReview: !attempt.isCorrect,
      lastAnswerId: attempt.selectedAnswerId,
      lastAnsweredAt: result.completedAt,
    };
  });
  return updated;
}
