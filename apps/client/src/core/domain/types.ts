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
  opponent: DuelOpponent;
  outcome: DuelOutcome;
  playerCorrect: number;
  opponentCorrect: number;
  playerElapsedMs: number;
  opponentElapsedMs: number;
};
