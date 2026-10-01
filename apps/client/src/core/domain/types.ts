export type TerritorySelection = {
  label: string;
  country: string;
  autonomousCommunity?: string;
  province?: string;
  municipality?: string;
  specificBody?: string;
};

export type AnswerOption = {
  id: string;
  text: string;
};

export type Question = {
  id: string;
  oppositionId: string;
  statement: string;
  answers: AnswerOption[];
  correctAnswerId?: string;
  explanation?: string;
  categoryId: string;
  difficulty: number;
  scopeType: string;
  territoryKeys: string[];
  source: string;
};

export type PlayerProfile = {
  uid: string;
  username: string;
  isGuest: boolean;
  oppositionId: string;
  oppositionName: string;
  territory: TerritorySelection;
  xp: number;
  level: number;
  coins: number;
  gems: number;
  currentStreak: number;
  bestStreak: number;
  totalQuestions: number;
  correctAnswers: number;
  testsCompleted: number;
  duelsPlayed: number;
  duelWins: number;
  duelLosses: number;
  duelDraws: number;
  lastValidActivityDate?: string | null;
};

export type PlayerProgress = Pick<
  PlayerProfile,
  | 'xp'
  | 'level'
  | 'coins'
  | 'gems'
  | 'currentStreak'
  | 'bestStreak'
  | 'totalQuestions'
  | 'correctAnswers'
  | 'testsCompleted'
  | 'duelsPlayed'
  | 'duelWins'
  | 'duelLosses'
  | 'duelDraws'
  | 'lastValidActivityDate'
>;

export type QuizAnswerSubmission = {
  questionId: string;
  selectedAnswerId: string | null;
  elapsedMs?: number;
};

export type QuestionAttempt = {
  question: Question;
  selectedAnswerId: string | null;
  isBlank: boolean;
  isCorrect: boolean;
};

export type QuizResult = {
  attempts: QuestionAttempt[];
  correct: number;
  incorrect: number;
  blank: number;
  points: number;
  percentage: number;
  xpEarned: number;
  coinsEarned: number;
  completedAt: string;
};

export type UserQuestionStat = {
  questionId: string;
  timesSeen: number;
  correctCount: number;
  incorrectCount: number;
  blankCount: number;
  lastAnswerId: string | null;
  lastAnsweredAt: string;
};

export type Mission = {
  id: string;
  date: string;
  title: string;
  description: string;
  type: 'completeQuickMatches' | 'answerQuestions' | 'correctAnswers';
  target: number;
  rewardXp: number;
  rewardCoins: number;
  progress: number;
  claimed: boolean;
};

export type DailyReward = {
  date: string;
  day: number;
  coins: number;
  gems: number;
  claimed: boolean;
};

export type DailyEngagement = {
  dailyReward: DailyReward;
  missions: Mission[];
};

export type DuelOpponent = {
  id: string;
  name: string;
  level: number;
  territoryLabel: string;
};

export type DuelOutcome = 'win' | 'loss' | 'draw';

export type DuelResult = {
  duelId: string;
  kind: 'training' | 'friend' | 'matchmaking';
  opponent: DuelOpponent;
  outcome: DuelOutcome;
  playerCorrect: number;
  opponentCorrect: number;
  playerElapsedMs: number;
  opponentElapsedMs: number;
};

export type SocialUser = {
  uid: string;
  username: string;
  level: number;
  territoryLabel: string;
  currentStreak: number;
  duelWins: number;
  sharedStreak?: number;
  viewerActiveToday?: boolean;
  activeToday?: boolean;
  lastActiveAt?: string | null;
};

export type SocialActivity = {
  id: string;
  type: 'quiz_completed' | 'duel_completed';
  actor: SocialUser;
  correct: number;
  total: number;
  outcome: DuelOutcome | null;
  streak: number;
  createdAt: string;
};

export type FriendRequest = {
  id: string;
  direction: 'incoming' | 'outgoing';
  status: 'pending' | 'accepted' | 'declined';
  user: SocialUser;
  createdAt: string;
};

export type FriendDuelInvitationStatus = 'pending' | 'active' | 'waiting' | 'completed';

export type FriendDuelInvitation = {
  id: string;
  direction: 'incoming' | 'outgoing';
  status: FriendDuelInvitationStatus;
  duelId: string | null;
  opponent: SocialUser;
  viewerSubmitted: boolean;
  opponentSubmitted: boolean;
  createdAt: string;
};

export type PendingFriendDuel = {
  duelId: string;
  opponent: DuelOpponent;
  kind: 'friend' | 'matchmaking';
};

export type MatchmakingState =
  | { status: 'idle'; rating: number }
  | { status: 'waiting'; rating: number; range: number; queuedAt: string }
  | {
    status: 'matched';
    rating: number;
    duelId: string;
    opponent: SocialUser;
    duelStatus: Exclude<FriendDuelInvitationStatus, 'pending'>;
    viewerSubmitted: boolean;
    opponentSubmitted: boolean;
  };

export type RankingScope = 'global' | 'territory' | 'friends';

export type RankingEntry = {
  uid: string;
  username: string;
  level: number;
  territoryLabel: string;
  score: number;
  position: number;
  isViewer: boolean;
};

export type RankingSnapshot = {
  scope: RankingScope;
  period: 'all_time';
  territoryLabel: string | null;
  entries: RankingEntry[];
  viewer: RankingEntry | null;
};

export type SocialOverview = {
  friends: SocialUser[];
  incomingRequests: FriendRequest[];
  outgoingRequests: FriendRequest[];
  duelInvitations: FriendDuelInvitation[];
  activity: SocialActivity[];
};

export type StudyGroupRole = 'owner' | 'admin' | 'member';

export type StudyGroup = {
  id: string;
  name: string;
  ownerUid: string;
  joinCode: string;
  memberCount: number;
  rankingMetric: 'xp';
  viewerRole: StudyGroupRole;
  createdAt: string;
  updatedAt: string;
};

export type StudyGroupMember = SocialUser & {
  role: StudyGroupRole;
  score: number;
  position: number;
  isViewer: boolean;
};

export type StudyGroupCompetitionMetric = 'xp' | 'questions' | 'correct' | 'duels';

export type StudyGroupCompetition = {
  id: string;
  name: string;
  metric: StudyGroupCompetitionMetric;
  startsAt: string;
  endsAt: string;
  status: 'active' | 'finished';
  entries: StudyGroupMember[];
};

export type StudyGroupDetail = StudyGroup & {
  members: StudyGroupMember[];
  competition: StudyGroupCompetition | null;
};
