import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  DailyReward,
  Mission,
  PlayerProfile,
  Question,
  QuizResult,
  TerritorySelection,
  UserQuestionStat,
} from '@/core/domain/types';
import {
  bootstrapGuestProfile,
  isFirebaseEnabled,
  readableFirebaseError,
  startAnonymousSession,
  startQuickQuizRemote,
  submitQuizSessionRemote,
} from '@/core/firebase/firebaseClient';
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

type BackendMode = 'local' | 'firebase';

type AppStore = {
  hydrated: boolean;
  backendMode: BackendMode;
  profile: PlayerProfile | null;
  activeQuestions: Question[];
  activeSessionId: string | null;
  selectedAnswers: Record<string, string | null>;
  questionStats: Record<string, UserQuestionStat>;
  dailyReward: DailyReward | null;
  missions: Mission[];
  lastResult: QuizResult | null;
  isStartingQuiz: boolean;
  isSubmittingQuiz: boolean;
  quizError: string | null;
  setHydrated: (hydrated: boolean) => void;
  startGuest: (territory: TerritorySelection) => Promise<void>;
  startQuickMatch: () => Promise<number>;
  startErrorReview: () => number;
  answerQuestion: (questionId: string, answerId: string | null) => void;
  finishQuiz: () => Promise<QuizResult | null>;
  clearQuizError: () => void;
  claimDailyReward: () => void;
  claimMission: (missionId: string) => void;
};

const initialMissions = (): Mission[] => [
  {
    id: 'daily_complete_quick',
    title: 'Primera partida del día',
    description: 'Completa una partida rápida.',
    type: 'completeQuickMatches',
    target: 1,
    rewardXp: 20,
    rewardCoins: 10,
    progress: 0,
    claimed: false,
  },
  {
    id: 'daily_30_questions',
    title: 'Calienta motores',
    description: 'Responde 30 preguntas.',
    type: 'answerQuestions',
    target: 30,
    rewardXp: 30,
    rewardCoins: 15,
    progress: 0,
    claimed: false,
  },
  {
    id: 'daily_15_correct',
    title: 'Precisión útil',
    description: 'Consigue 15 respuestas correctas.',
    type: 'correctAnswers',
    target: 15,
    rewardXp: 35,
    rewardCoins: 20,
    progress: 0,
    claimed: false,
  },
];

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      hydrated: false,
      backendMode: 'local',
      profile: null,
      activeQuestions: [],
      activeSessionId: null,
      selectedAnswers: {},
      questionStats: {},
      dailyReward: null,
      missions: [],
      lastResult: null,
      isStartingQuiz: false,
      isSubmittingQuiz: false,
      quizError: null,
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
        if (backendMode === 'firebase') {
          try {
            profile = await bootstrapGuestProfile(profile);
          } catch {
            backendMode = 'local';
            profile = localGuestProfile('local_guest', territory);
          }
        }

        set({
          backendMode,
          profile,
          activeQuestions: [],
          activeSessionId: null,
          selectedAnswers: {},
          questionStats: {},
          dailyReward: { day: 1, coins: 25, gems: 0, claimed: false },
          missions: initialMissions(),
          lastResult: null,
          quizError: null,
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
            selectedAnswers: Object.fromEntries(
              activeQuestions.map((question) => [question.id, null]),
            ),
            lastResult: null,
          });
          return activeQuestions.length;
        } catch (error) {
          set({ quizError: readableFirebaseError(error) });
          return 0;
        } finally {
          set({ isStartingQuiz: false });
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
          selectedAnswers: Object.fromEntries(
            activeQuestions.map((question) => [question.id, null]),
          ),
          lastResult: null,
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

          if (state.backendMode === 'firebase' && state.activeSessionId) {
            const submission = state.activeQuestions.map((question) => ({
              questionId: question.id,
              selectedAnswerId:
                state.selectedAnswers[question.id] === BLANK_ANSWER_ID
                  ? null
                  : (state.selectedAnswers[question.id] ?? null),
            }));
            const remote = await submitQuizSessionRemote(state.activeSessionId, submission);
            result = remote.result;
            profile = { ...state.profile, ...remote.progress };
          } else {
            result = scoreQuickMatch(state.activeQuestions, state.selectedAnswers);
            profile = applyResult(state.profile, result);
          }

          set({
            profile,
            questionStats: applyQuestionStats(state.questionStats, result),
            missions: progressMissions(state.missions, result),
            lastResult: result,
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
      claimDailyReward: () => {
        const { profile, dailyReward } = get();
        if (!profile || !dailyReward || dailyReward.claimed) return;
        set({
          profile: {
            ...profile,
            coins: profile.coins + dailyReward.coins,
            gems: profile.gems + dailyReward.gems,
          },
          dailyReward: { ...dailyReward, claimed: true },
        });
      },
      claimMission: (missionId) => {
        const { profile, missions } = get();
        if (!profile) return;
        const mission = missions.find((item) => item.id === missionId);
        if (!mission || mission.claimed || mission.progress < mission.target) return;
        const xp = profile.xp + mission.rewardXp;
        set({
          profile: {
            ...profile,
            xp,
            level: Math.floor(Math.sqrt(xp / 100)) + 1,
            coins: profile.coins + mission.rewardCoins,
          },
          missions: missions.map((item) =>
            item.id === missionId ? { ...item, claimed: true } : item,
          ),
        });
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
  };
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

function progressMissions(missions: Mission[], result: QuizResult): Mission[] {
  return missions.map((mission) => {
    const increment =
      mission.type === 'answerQuestions'
        ? result.attempts.length
        : mission.type === 'correctAnswers'
          ? result.correct
          : 1;
    return { ...mission, progress: Math.min(mission.target, mission.progress + increment) };
  });
}
