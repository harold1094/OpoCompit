import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  DailyReward,
  DuelOpponent,
  DuelResult,
  Mission,
  PlayerProfile,
  Question,
  QuizResult,
  TerritorySelection,
  UserQuestionStat,
} from '@/core/domain/types';
import {
  bootstrapGuestProfile,
  claimDailyRewardRemote,
  claimMissionRemote,
  getDailyEngagementRemote,
  isFirebaseEnabled,
  readableFirebaseError,
  startAnonymousSession,
  startQuickQuizRemote,
  startClassicDuelRemote,
  submitClassicDuelRemote,
  submitQuizSessionRemote,
} from '@/core/firebase/firebaseClient';
import {
  localDailyEngagement,
  progressLocalMissions,
} from '@/features/gamification/domain/engagement';
import {
  FIREFIGHTER_OPPOSITION_ID,
  FIREFIGHTER_OPPOSITION_NAME,
} from '@/features/onboarding/data/options';
import { eligibleForQuickMatch } from '@/features/quiz/domain/questionFilter';
import {
  applyResult,
  BLANK_ANSWER_ID,
  scoreQuickMatch,
} from '@/features/quiz/domain/scoring';
import { seedQuestions } from '@/features/quiz/data/seedQuestions';
import { duelOutcome, localOpponentPerformance } from '@/features/duels/domain/duel';

type BackendMode = 'local' | 'firebase';
type ActiveGameMode = 'quick' | 'duel';

type AppStore = {
  hydrated: boolean;
  backendMode: BackendMode;
  profile: PlayerProfile | null;
  activeQuestions: Question[];
  activeSessionId: string | null;
  activeGameMode: ActiveGameMode;
  activeDuelOpponent: DuelOpponent | null;
  activeStartedAt: number | null;
  selectedAnswers: Record<string, string | null>;
  questionStats: Record<string, UserQuestionStat>;
  dailyReward: DailyReward | null;
  missions: Mission[];
  lastResult: QuizResult | null;
  lastDuelResult: DuelResult | null;
  isStartingQuiz: boolean;
  isStartingDuel: boolean;
  isSubmittingQuiz: boolean;
  isLoadingEngagement: boolean;
  isClaimingDailyReward: boolean;
  claimingMissionId: string | null;
  quizError: string | null;
  engagementError: string | null;
  setHydrated: (hydrated: boolean) => void;
  startGuest: (territory: TerritorySelection) => Promise<void>;
  startQuickMatch: () => Promise<number>;
  startClassicDuel: (opponent: DuelOpponent) => Promise<number>;
  startErrorReview: () => number;
  answerQuestion: (questionId: string, answerId: string | null) => void;
  finishQuiz: () => Promise<QuizResult | null>;
  clearQuizError: () => void;
  refreshDailyEngagement: () => Promise<void>;
  claimDailyReward: () => Promise<boolean>;
  claimMission: (missionId: string) => Promise<boolean>;
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
      activeDuelOpponent: null,
      activeStartedAt: null,
      selectedAnswers: {},
      questionStats: {},
      dailyReward: null,
      missions: [],
      lastResult: null,
      lastDuelResult: null,
      isStartingQuiz: false,
      isStartingDuel: false,
      isSubmittingQuiz: false,
      isLoadingEngagement: false,
      isClaimingDailyReward: false,
      claimingMissionId: null,
      quizError: null,
      engagementError: null,
      setHydrated: (hydrated) => set({ hydrated }),
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
          activeDuelOpponent: null,
          activeStartedAt: null,
          selectedAnswers: {},
          questionStats: {},
          dailyReward: engagement.dailyReward,
          missions: engagement.missions,
          lastResult: null,
          lastDuelResult: null,
          quizError: null,
          engagementError: null,
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
            activeDuelOpponent: null,
            activeStartedAt: Date.now(),
            selectedAnswers: Object.fromEntries(
              activeQuestions.map((question) => [question.id, null]),
            ),
            lastResult: null,
            lastDuelResult: null,
          });
          return activeQuestions.length;
        } catch (error) {
          set({ quizError: readableFirebaseError(error) });
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
            activeDuelOpponent: activeOpponent,
            activeStartedAt: Date.now(),
            selectedAnswers: Object.fromEntries(
              activeQuestions.map((question) => [question.id, null]),
            ),
            lastResult: null,
            lastDuelResult: null,
          });
          return activeQuestions.length;
        } catch (error) {
          set({ quizError: readableFirebaseError(error) });
          return 0;
        } finally {
          set({ isStartingDuel: false });
        }
      },
      startErrorReview: () => {
        const { profile, questionStats } = get();
        if (!profile) return 0;
        const reviewIds = new Set(
          Object.values(questionStats)
            .filter((stat) => stat.incorrectCount > 0 || stat.blankCount > 0)
            .map((stat) => stat.questionId),
        );
        const activeQuestions = seedQuestions
          .filter(
            (question) =>
              question.oppositionId === profile.oppositionId && reviewIds.has(question.id),
          )
          .slice(0, 10);
        set({
          activeQuestions,
          activeSessionId: null,
          activeGameMode: 'quick',
          activeDuelOpponent: null,
          activeStartedAt: Date.now(),
          selectedAnswers: Object.fromEntries(
            activeQuestions.map((question) => [question.id, null]),
          ),
          lastResult: null,
          lastDuelResult: null,
          quizError: null,
        });
        return activeQuestions.length;
      },
      answerQuestion: (questionId, answerId) =>
        set((state) => ({
          selectedAnswers: {
            ...state.selectedAnswers,
            [questionId]: answerId ?? BLANK_ANSWER_ID,
          },
        })),
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

          if (
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
            if (state.activeGameMode === 'duel' && state.activeDuelOpponent) {
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
                opponent: state.activeDuelOpponent,
                outcome,
                playerCorrect: result.correct,
                opponentCorrect: Math.min(opponent.correct, state.activeQuestions.length),
                playerElapsedMs: elapsedMs,
                opponentElapsedMs: opponent.elapsedMs,
              };
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
              state.activeGameMode !== 'duel',
            );
          }

          set({
            profile,
            questionStats: applyQuestionStats(state.questionStats, result),
            dailyReward,
            missions,
            lastResult: result,
            lastDuelResult: duelResult,
            activeSessionId: null,
          });
          return result;
        } catch (error) {
          set({ quizError: readableFirebaseError(error) });
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
          set({ engagementError: readableFirebaseError(error) });
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
          return true;
        } catch (error) {
          set({ engagementError: readableFirebaseError(error) });
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
          return true;
        } catch (error) {
          set({ engagementError: readableFirebaseError(error) });
          return false;
        } finally {
          set({ claimingMissionId: null });
        }
      },
    }),
    {
      name: 'opocompit-client-state',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        backendMode: state.backendMode,
        profile: state.profile,
        questionStats: state.questionStats,
        dailyReward: state.dailyReward,
        missions: state.missions,
      }),
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
    },
  ),
);

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
      timesSeen: (previous?.timesSeen ?? 0) + 1,
      correctCount: (previous?.correctCount ?? 0) + (attempt.isCorrect ? 1 : 0),
      incorrectCount:
        (previous?.incorrectCount ?? 0) + (!attempt.isCorrect && !attempt.isBlank ? 1 : 0),
      blankCount: (previous?.blankCount ?? 0) + (attempt.isBlank ? 1 : 0),
      lastAnswerId: attempt.selectedAnswerId,
      lastAnsweredAt: result.completedAt,
    };
  });
  return updated;
}
