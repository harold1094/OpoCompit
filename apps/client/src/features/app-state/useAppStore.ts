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
  createGuestProfileIfMissing,
  startAnonymousSession,
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

type AppStore = {
  hydrated: boolean;
  profile: PlayerProfile | null;
  activeQuestions: Question[];
  selectedAnswers: Record<string, string | null>;
  questionStats: Record<string, UserQuestionStat>;
  dailyReward: DailyReward | null;
  missions: Mission[];
  lastResult: QuizResult | null;
  setHydrated: (hydrated: boolean) => void;
  startGuest: (territory: TerritorySelection) => Promise<void>;
  startQuickMatch: () => number;
  startErrorReview: () => number;
  answerQuestion: (questionId: string, answerId: string | null) => void;
  finishQuiz: () => QuizResult | null;
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
      profile: null,
      activeQuestions: [],
      selectedAnswers: {},
      questionStats: {},
      dailyReward: null,
      missions: [],
      lastResult: null,
      setHydrated: (hydrated) => set({ hydrated }),
      startGuest: async (territory) => {
        let uid = 'local_guest';
        try {
          uid = await startAnonymousSession();
        } catch {
          uid = 'local_guest';
        }

        const profile: PlayerProfile = {
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

        set({
          profile,
          activeQuestions: [],
          selectedAnswers: {},
          questionStats: {},
          dailyReward: { day: 1, coins: 25, gems: 0, claimed: false },
          missions: initialMissions(),
          lastResult: null,
        });
        void createGuestProfileIfMissing(profile).catch(() => undefined);
      },
      startQuickMatch: () => {
        const { profile } = get();
        if (!profile) return 0;
        const activeQuestions = eligibleForQuickMatch(profile, seedQuestions);
        set({
          activeQuestions,
          selectedAnswers: Object.fromEntries(activeQuestions.map((question) => [question.id, null])),
          lastResult: null,
        });
        return activeQuestions.length;
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
          selectedAnswers: Object.fromEntries(activeQuestions.map((question) => [question.id, null])),
          lastResult: null,
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
      finishQuiz: () => {
        const state = get();
        if (!state.profile || state.activeQuestions.length === 0) return null;
        const result = scoreQuickMatch(state.activeQuestions, state.selectedAnswers);
        const profile = applyResult(state.profile, result);
        const questionStats = { ...state.questionStats };

        result.attempts.forEach((attempt) => {
          const previous = questionStats[attempt.question.id];
          questionStats[attempt.question.id] = {
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

        const missions = state.missions.map((mission) => {
          const increment =
            mission.type === 'answerQuestions'
              ? result.attempts.length
              : mission.type === 'correctAnswers'
                ? result.correct
                : 1;
          return { ...mission, progress: Math.min(mission.target, mission.progress + increment) };
        });

        set({ profile, questionStats, missions, lastResult: result });
        return result;
      },
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
        profile: state.profile,
        questionStats: state.questionStats,
        dailyReward: state.dailyReward,
        missions: state.missions,
      }),
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
    },
  ),
);
