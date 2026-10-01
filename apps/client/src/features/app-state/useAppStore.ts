import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  DailyReward,
  DuelOpponent,
  DuelResult,
  FriendDuelInvitation,
  FriendRequest,
  MatchmakingState,
  Mission,
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
import {
  bootstrapGuestProfile,
  claimDailyRewardRemote,
  claimMissionRemote,
  createStudyGroupRemote,
  createStudyGroupCompetitionRemote,
  getDailyEngagementRemote,
  getMatchmakingStatusRemote,
  getRankingRemote,
  getSocialOverviewRemote,
  getStudyGroupRemote,
  getStudyGroupsRemote,
  isFirebaseEnabled,
  joinMatchmakingRemote,
  joinStudyGroupRemote,
  leaveStudyGroupRemote,
  leaveMatchmakingRemote,
  readableFirebaseError,
  removeFriendRemote,
  respondFriendRequestRemote,
  respondFriendDuelInvitationRemote,
  searchUsersRemote,
  sendFriendDuelInvitationRemote,
  sendFriendRequestRemote,
  setPublicUsernameRemote,
  startAnonymousSession,
  startQuickQuizRemote,
  startClassicDuelRemote,
  openFriendDuelRemote,
  submitFriendDuelRemote,
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
import { localSocialUsers } from '@/features/social/data/localSocialUsers';

type BackendMode = 'local' | 'firebase';
type ActiveGameMode = 'quick' | 'duel' | 'friend-duel' | 'matchmaking-duel';

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
  isSubmittingQuiz: boolean;
  isLoadingEngagement: boolean;
  isClaimingDailyReward: boolean;
  claimingMissionId: string | null;
  quizError: string | null;
  engagementError: string | null;
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
      activeDuelOpponent: null,
      activeStartedAt: null,
      selectedAnswers: {},
      questionStats: {},
      dailyReward: null,
      missions: [],
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
      isSubmittingQuiz: false,
      isLoadingEngagement: false,
      isClaimingDailyReward: false,
      claimingMissionId: null,
      quizError: null,
      engagementError: null,
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
          engagementError: null,
          socialError: null,
          groupsError: null,
          rankingError: null,
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
            lastPendingFriendDuel: null,
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
            lastPendingFriendDuel: null,
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
          lastPendingFriendDuel: null,
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
          set({ socialError: readableFirebaseError(error) });
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
          set({ groupsError: readableFirebaseError(error) });
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
          return group;
        } catch (error) {
          set({ groupsError: readableFirebaseError(error) });
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
          return group;
        } catch (error) {
          set({ groupsError: readableFirebaseError(error) });
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
          set({ groupsError: readableFirebaseError(error) });
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
          set({ groupsError: readableFirebaseError(error) });
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
          set({ groupsError: readableFirebaseError(error) });
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
          set({ socialError: readableFirebaseError(error) });
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
          set({ socialError: readableFirebaseError(error) });
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
          return true;
        } catch (error) {
          set({ socialError: readableFirebaseError(error) });
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
          return true;
        } catch (error) {
          set({ socialError: readableFirebaseError(error) });
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
          set({ socialError: readableFirebaseError(error) });
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
          set({ socialError: readableFirebaseError(error) });
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
          return true;
        } catch (error) {
          set({ socialError: readableFirebaseError(error) });
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
          set({ socialError: readableFirebaseError(error) });
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
          set({ socialError: readableFirebaseError(error) });
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
          set({ socialError: readableFirebaseError(error) });
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
          set({ socialError: readableFirebaseError(error) });
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
          set({ socialError: readableFirebaseError(error) });
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
          set({ rankingError: readableFirebaseError(error) });
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
        questionStats: state.questionStats,
        dailyReward: state.dailyReward,
        missions: state.missions,
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
