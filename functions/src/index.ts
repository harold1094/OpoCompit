import {initializeApp} from "firebase-admin/app";
import {Timestamp, getFirestore} from "firebase-admin/firestore";
import {HttpsError, onCall} from "firebase-functions/v2/https";

import {
  dailyMissionTemplates,
  dailyRewardFor,
  madridDay,
  missionDocumentId,
  missionProgressIncrement,
  MissionTemplate,
} from "./engagement.js";

initializeApp();

const db = getFirestore();
const maxQuestionCount = 25;
const sessionLifetimeMs = 24 * 60 * 60 * 1000;

type TerritorySelection = {
  label: string;
  country: string;
  autonomousCommunity?: string;
  province?: string;
  municipality?: string;
  specificBody?: string;
};

type Answer = {
  questionId: string;
  selectedAnswerId: string | null;
  elapsedMs?: number;
};

type QuestionDoc = {
  oppositionId: string;
  statement: string;
  answers: Array<{id: string; text: string}>;
  correctAnswerId: string;
  explanation: string;
  categoryId: string;
  difficulty: number;
  scopeType: string;
  territoryKeys: string[];
  source: string;
  status: string;
  verified: boolean;
};

type BootstrapGuestInput = {
  oppositionId: string;
  oppositionName: string;
  territory: TerritorySelection;
};

type StartQuickQuizInput = {
  questionCount?: number;
};

type SubmitQuizInput = {
  sessionId: string;
  answers: Answer[];
};

type ClaimMissionInput = {
  missionId: string;
};

export const bootstrapGuestProfile = onCall<BootstrapGuestInput>(async (request) => {
  const uid = requireUid(request.auth?.uid);
  const oppositionId = requireString(request.data?.oppositionId, "oppositionId", 80);
  const oppositionName = requireString(request.data?.oppositionName, "oppositionName", 80);
  const territory = parseTerritory(request.data?.territory);
  const userRef = db.collection("users").doc(uid);

  const profile = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(userRef);
    const now = Timestamp.now();

    if (snapshot.exists) {
      const existing = snapshot.data() ?? {};
      const updated = {
        ...existing,
        oppositionId,
        oppositionName,
        territorySelection: territory,
        updatedAt: now,
      };
      transaction.update(userRef, {
        oppositionId,
        oppositionName,
        territorySelection: territory,
        updatedAt: now,
      });
      return serializeProfile(uid, updated);
    }

    const created = {
      uid,
      isAnonymous: true,
      username: "Invitado",
      role: "guest",
      oppositionId,
      oppositionName,
      territorySelection: territory,
      level: 1,
      xp: 0,
      coins: 0,
      gems: 0,
      currentStreak: 0,
      bestStreak: 0,
      totalQuestions: 0,
      correctAnswers: 0,
      testsCompleted: 0,
      lastValidActivityDate: null,
      dailyRewardDay: 0,
      lastDailyRewardDate: null,
      createdAt: now,
      updatedAt: now,
    };
    transaction.set(userRef, created);
    return serializeProfile(uid, created);
  });

  return {profile};
});

export const getDailyEngagement = onCall(async (request) => {
  const uid = requireUid(request.auth?.uid);
  const now = Timestamp.now();
  const date = madridDay(now.toDate());
  const userRef = db.collection("users").doc(uid);
  const missionRefs = dailyMissionTemplates.map((mission) =>
    userRef.collection("missions").doc(missionDocumentId(date, mission.id)),
  );

  return db.runTransaction(async (transaction) => {
    const [userSnapshot, missionSnapshots] = await Promise.all([
      transaction.get(userRef),
      Promise.all(missionRefs.map((reference) => transaction.get(reference))),
    ]);
    if (!userSnapshot.exists) {
      throw new HttpsError("failed-precondition", "Guest profile must be created first.");
    }

    const user = userSnapshot.data() ?? {};
    const missions = dailyMissionTemplates.map((template, index) => {
      const snapshot = missionSnapshots[index];
      const data = snapshot.data() ?? {};
      if (!snapshot.exists) {
        transaction.set(missionRefs[index], missionDocument(template, date, now));
      }
      return serializeMission(template, data, date);
    });

    return {
      dailyReward: dailyRewardFor(user.dailyRewardDay, user.lastDailyRewardDate, date),
      missions,
    };
  });
});

export const claimDailyReward = onCall(async (request) => {
  const uid = requireUid(request.auth?.uid);
  const now = Timestamp.now();
  const date = madridDay(now.toDate());
  const userRef = db.collection("users").doc(uid);
  const claimRef = userRef.collection("dailyRewards").doc(date);

  return db.runTransaction(async (transaction) => {
    const [userSnapshot, claimSnapshot] = await Promise.all([
      transaction.get(userRef),
      transaction.get(claimRef),
    ]);
    if (!userSnapshot.exists) {
      throw new HttpsError("failed-precondition", "User profile missing.");
    }

    const user = userSnapshot.data() ?? {};
    const reward = dailyRewardFor(user.dailyRewardDay, user.lastDailyRewardDate, date);
    if (reward.claimed || claimSnapshot.exists) {
      return {
        dailyReward: {...reward, claimed: true},
        progress: serializeProgress(user),
      };
    }

    const coins = numberValue(user.coins) + reward.coins;
    const gems = numberValue(user.gems) + reward.gems;
    const profileUpdate = {
      coins,
      gems,
      dailyRewardDay: reward.day,
      lastDailyRewardDate: date,
      updatedAt: now,
    };
    transaction.update(userRef, profileUpdate);
    transaction.set(claimRef, {
      date,
      day: reward.day,
      coins: reward.coins,
      gems: reward.gems,
      claimedAt: now,
    });
    transaction.set(db.collection("currencyTransactions").doc(`${uid}_${date}_daily_coins`), {
      uid,
      type: "daily_reward",
      currency: "coins",
      amount: reward.coins,
      balanceAfter: coins,
      sourceId: date,
      createdAt: now,
    });
    if (reward.gems > 0) {
      transaction.set(db.collection("currencyTransactions").doc(`${uid}_${date}_daily_gems`), {
        uid,
        type: "daily_reward",
        currency: "gems",
        amount: reward.gems,
        balanceAfter: gems,
        sourceId: date,
        createdAt: now,
      });
    }

    return {
      dailyReward: {...reward, claimed: true},
      progress: serializeProgress({...user, ...profileUpdate}),
    };
  });
});

export const claimMission = onCall<ClaimMissionInput>(async (request) => {
  const uid = requireUid(request.auth?.uid);
  const missionId = requireString(request.data?.missionId, "missionId", 80);
  const template = dailyMissionTemplates.find((mission) => mission.id === missionId);
  if (!template) throw new HttpsError("not-found", "Mission not found.");

  const now = Timestamp.now();
  const date = madridDay(now.toDate());
  const userRef = db.collection("users").doc(uid);
  const missionRef = userRef.collection("missions").doc(missionDocumentId(date, missionId));

  return db.runTransaction(async (transaction) => {
    const [userSnapshot, missionSnapshot] = await Promise.all([
      transaction.get(userRef),
      transaction.get(missionRef),
    ]);
    if (!userSnapshot.exists) {
      throw new HttpsError("failed-precondition", "User profile missing.");
    }
    if (!missionSnapshot.exists) {
      throw new HttpsError("failed-precondition", "Mission has not started.");
    }

    const user = userSnapshot.data() ?? {};
    const mission = missionSnapshot.data() ?? {};
    if (mission.claimed === true) {
      return {
        mission: serializeMission(template, mission, date),
        progress: serializeProgress(user),
      };
    }
    if (numberValue(mission.progress) < template.target) {
      throw new HttpsError("failed-precondition", "Mission is not complete.");
    }

    const xp = numberValue(user.xp) + template.rewardXp;
    const coins = numberValue(user.coins) + template.rewardCoins;
    const profileUpdate = {
      xp,
      level: Math.floor(Math.sqrt(xp / 100)) + 1,
      coins,
      updatedAt: now,
    };
    transaction.update(userRef, profileUpdate);
    transaction.update(missionRef, {claimed: true, claimedAt: now, updatedAt: now});
    transaction.set(
      db.collection("currencyTransactions").doc(`${uid}_${date}_${missionId}_coins`),
      {
        uid,
        type: "mission",
        currency: "coins",
        amount: template.rewardCoins,
        balanceAfter: coins,
        sourceId: missionDocumentId(date, missionId),
        createdAt: now,
      },
    );

    return {
      mission: serializeMission(template, {...mission, claimed: true}, date),
      progress: serializeProgress({...user, ...profileUpdate}),
    };
  });
});

export const startQuickQuiz = onCall<StartQuickQuizInput>(async (request) => {
  const uid = requireUid(request.auth?.uid);
  const questionCount = parseQuestionCount(request.data?.questionCount);
  const userSnapshot = await db.collection("users").doc(uid).get();

  if (!userSnapshot.exists) {
    throw new HttpsError("failed-precondition", "Guest profile must be created first.");
  }

  const user = userSnapshot.data() ?? {};
  const oppositionId = requireString(user.oppositionId, "stored oppositionId", 80);
  const territory = parseTerritory(user.territorySelection);
  const territoryKeys = buildTerritoryKeys(territory);

  const snapshot = await db.collection("questions")
    .where("oppositionId", "==", oppositionId)
    .where("status", "==", "published")
    .where("verified", "==", true)
    .where("territoryKeys", "array-contains-any", territoryKeys.slice(0, 10))
    .orderBy("difficulty", "asc")
    .limit(questionCount)
    .get();

  if (snapshot.empty) {
    throw new HttpsError("not-found", "No eligible questions found.");
  }

  const questions = snapshot.docs.map((document) => {
    const data = document.data() as QuestionDoc;
    return publicQuestion(document.id, data);
  });

  const sessionRef = db.collection("quizSessions").doc();
  await sessionRef.set({
    uid,
    mode: "quick",
    oppositionId,
    territoryKeys,
    questionIds: snapshot.docs.map((document) => document.id),
    answers: [],
    status: "started",
    createdAt: Timestamp.now(),
    submittedAt: null,
  });

  return {sessionId: sessionRef.id, questions};
});

export const submitQuizSession = onCall<SubmitQuizInput>(async (request) => {
  const uid = requireUid(request.auth?.uid);
  const sessionId = requireString(request.data?.sessionId, "sessionId", 160);
  const submittedAnswers = parseAnswers(request.data?.answers);
  const sessionRef = db.collection("quizSessions").doc(sessionId);

  return db.runTransaction(async (transaction) => {
    const sessionSnapshot = await transaction.get(sessionRef);
    if (!sessionSnapshot.exists) {
      throw new HttpsError("not-found", "Quiz session not found.");
    }

    const session = sessionSnapshot.data() ?? {};
    if (session.uid !== uid) {
      throw new HttpsError("permission-denied", "Not your quiz session.");
    }
    if (session.status !== "started") {
      throw new HttpsError("failed-precondition", "Session already submitted.");
    }

    const createdAt = session.createdAt;
    if (!(createdAt instanceof Timestamp) || Date.now() - createdAt.toMillis() > sessionLifetimeMs) {
      throw new HttpsError("deadline-exceeded", "Quiz session expired.");
    }

    const questionIds = parseQuestionIds(session.questionIds);
    const allowedQuestionIds = new Set(questionIds);
    if (submittedAnswers.some((answer) => !allowedQuestionIds.has(answer.questionId))) {
      throw new HttpsError("invalid-argument", "Answer contains an unknown question.");
    }

    const userRef = db.collection("users").doc(uid);
    const questionRefs = questionIds.map((id) => db.collection("questions").doc(id));
    const statRefs = questionIds.map((id) => userRef.collection("questionStats").doc(id));
    const completedAt = Timestamp.now();
    const date = madridDay(completedAt.toDate());
    const missionRefs = dailyMissionTemplates.map((mission) =>
      userRef.collection("missions").doc(missionDocumentId(date, mission.id)),
    );
    const [userSnapshot, questionSnapshots, statSnapshots, missionSnapshots] = await Promise.all([
      transaction.get(userRef),
      Promise.all(questionRefs.map((reference) => transaction.get(reference))),
      Promise.all(statRefs.map((reference) => transaction.get(reference))),
      Promise.all(missionRefs.map((reference) => transaction.get(reference))),
    ]);

    if (!userSnapshot.exists) {
      throw new HttpsError("failed-precondition", "User profile missing.");
    }

    const questions = questionSnapshots.map((snapshot) => {
      if (!snapshot.exists) {
        throw new HttpsError("failed-precondition", "Question missing.");
      }
      return {id: snapshot.id, data: snapshot.data() as QuestionDoc};
    });
    const answersByQuestion = new Map(
      submittedAnswers.map((answer) => [answer.questionId, answer]),
    );
    let correct = 0;
    let blank = 0;
    let incorrect = 0;

    const attempts = questions.map((question) => {
      const answer = answersByQuestion.get(question.id);
      const selectedAnswerId = answer?.selectedAnswerId ?? null;
      if (
        selectedAnswerId !== null &&
        !question.data.answers.some((option) => option.id === selectedAnswerId)
      ) {
        throw new HttpsError("invalid-argument", "Invalid answer option.");
      }

      const isBlank = selectedAnswerId === null;
      const isCorrect = selectedAnswerId === question.data.correctAnswerId;
      if (isBlank) blank++;
      else if (isCorrect) correct++;
      else incorrect++;

      return {
        question: reviewQuestion(question.id, question.data),
        selectedAnswerId,
        isBlank,
        isCorrect,
      };
    });

    const percentage = questions.length === 0 ? 0 : correct / questions.length;
    const xpEarned = correct * 10 + 20 + (percentage >= 0.8 ? 10 : 0);
    const coinsEarned = correct * 2 + 5;
    const user = userSnapshot.data() ?? {};
    const previousXp = numberValue(user.xp);
    const previousCoins = numberValue(user.coins);
    const previousStreak = numberValue(user.currentStreak);
    const streak = nextStreak(previousStreak, user.lastValidActivityDate, completedAt);
    const xp = previousXp + xpEarned;
    const coins = previousCoins + coinsEarned;
    const level = Math.floor(Math.sqrt(xp / 100)) + 1;
    const profileUpdate = {
      xp,
      level,
      coins,
      currentStreak: streak,
      bestStreak: Math.max(numberValue(user.bestStreak), streak),
      totalQuestions: numberValue(user.totalQuestions) + questions.length,
      correctAnswers: numberValue(user.correctAnswers) + correct,
      testsCompleted: numberValue(user.testsCompleted) + 1,
      lastValidActivityDate: completedAt,
      updatedAt: completedAt,
    };

    transaction.update(userRef, profileUpdate);

    statSnapshots.forEach((snapshot, index) => {
      const attempt = attempts[index];
      const previous = snapshot.data() ?? {};
      transaction.set(statRefs[index], {
        questionId: attempt.question.id,
        timesSeen: numberValue(previous.timesSeen) + 1,
        correctCount: numberValue(previous.correctCount) + (attempt.isCorrect ? 1 : 0),
        incorrectCount: numberValue(previous.incorrectCount) + (!attempt.isCorrect && !attempt.isBlank ? 1 : 0),
        blankCount: numberValue(previous.blankCount) + (attempt.isBlank ? 1 : 0),
        lastAnswerId: attempt.selectedAnswerId,
        lastAnsweredAt: completedAt,
      }, {merge: true});
    });

    const missions = dailyMissionTemplates.map((template, index) => {
      const previous = missionSnapshots[index].data() ?? {};
      const progress = Math.min(
        template.target,
        numberValue(previous.progress) +
          missionProgressIncrement(template.type, questions.length, correct),
      );
      const updated = {
        ...missionDocument(template, date, completedAt),
        progress,
        claimed: previous.claimed === true,
        createdAt: previous.createdAt ?? completedAt,
        updatedAt: completedAt,
      };
      transaction.set(missionRefs[index], updated);
      return serializeMission(template, updated, date);
    });

    const sanitizedAnswers = questionIds.map((questionId) => {
      const answer = answersByQuestion.get(questionId);
      return {
        questionId,
        selectedAnswerId: answer?.selectedAnswerId ?? null,
        elapsedMs: answer?.elapsedMs ?? null,
      };
    });
    transaction.update(sessionRef, {
      answers: sanitizedAnswers,
      status: "validated",
      score: {correct, incorrect, blank, percentage, xpEarned, coinsEarned},
      submittedAt: completedAt,
    });

    const transactionRef = db.collection("currencyTransactions").doc();
    transaction.set(transactionRef, {
      uid,
      type: "quiz_reward",
      currency: "coins",
      amount: coinsEarned,
      balanceAfter: coins,
      sourceId: sessionRef.id,
      createdAt: completedAt,
    });

    return {
      result: {
        attempts,
        correct,
        incorrect,
        blank,
        points: correct,
        percentage,
        xpEarned,
        coinsEarned,
        completedAt: completedAt.toDate().toISOString(),
      },
      progress: serializeProgress({...user, ...profileUpdate}),
      engagement: {
        dailyReward: dailyRewardFor(user.dailyRewardDay, user.lastDailyRewardDate, date),
        missions,
      },
    };
  });
});

function requireUid(uid: string | undefined): string {
  if (!uid) throw new HttpsError("unauthenticated", "Authentication required.");
  return uid;
}

function requireString(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== "string" || value.trim().length === 0 || value.length > maxLength) {
    throw new HttpsError("invalid-argument", `Invalid ${field}.`);
  }
  return value.trim();
}

function optionalString(value: unknown, field: string, maxLength = 100): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return requireString(value, field, maxLength);
}

function parseTerritory(value: unknown): TerritorySelection {
  if (typeof value !== "object" || value === null) {
    throw new HttpsError("invalid-argument", "Invalid territory.");
  }
  const data = value as Record<string, unknown>;
  return {
    label: requireString(data.label, "territory.label", 100),
    country: requireString(data.country, "territory.country", 8),
    autonomousCommunity: optionalString(data.autonomousCommunity, "territory.autonomousCommunity"),
    province: optionalString(data.province, "territory.province"),
    municipality: optionalString(data.municipality, "territory.municipality"),
    specificBody: optionalString(data.specificBody, "territory.specificBody"),
  };
}

function buildTerritoryKeys(territory: TerritorySelection): string[] {
  const keys = [territory.country];
  if (territory.autonomousCommunity) {
    keys.push(`${territory.country}-${territory.autonomousCommunity}`);
  }
  if (territory.autonomousCommunity && territory.municipality) {
    keys.push(`${territory.country}-${territory.autonomousCommunity}-${territory.municipality}`);
  }
  return keys;
}

function parseQuestionCount(value: unknown): number {
  if (value === undefined) return 10;
  if (!Number.isInteger(value) || Number(value) < 1) {
    throw new HttpsError("invalid-argument", "Invalid question count.");
  }
  return Math.min(Number(value), maxQuestionCount);
}

function parseQuestionIds(value: unknown): string[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > maxQuestionCount) {
    throw new HttpsError("failed-precondition", "Invalid session questions.");
  }
  const ids = value.map((id) => requireString(id, "questionId", 160));
  if (new Set(ids).size !== ids.length) {
    throw new HttpsError("failed-precondition", "Duplicate session questions.");
  }
  return ids;
}

function parseAnswers(value: unknown): Answer[] {
  if (!Array.isArray(value) || value.length > maxQuestionCount) {
    throw new HttpsError("invalid-argument", "Invalid answers.");
  }
  const answers = value.map((raw) => {
    if (typeof raw !== "object" || raw === null) {
      throw new HttpsError("invalid-argument", "Invalid answer.");
    }
    const data = raw as Record<string, unknown>;
    const selectedAnswerId = data.selectedAnswerId === null || data.selectedAnswerId === undefined ? null :
      requireString(data.selectedAnswerId, "selectedAnswerId", 80);
    const elapsedMs = data.elapsedMs;
    if (elapsedMs !== undefined && (!Number.isInteger(elapsedMs) || Number(elapsedMs) < 0)) {
      throw new HttpsError("invalid-argument", "Invalid elapsed time.");
    }
    return {
      questionId: requireString(data.questionId, "questionId", 160),
      selectedAnswerId,
      elapsedMs: elapsedMs === undefined ? undefined : Math.min(Number(elapsedMs), 3_600_000),
    };
  });
  if (new Set(answers.map((answer) => answer.questionId)).size !== answers.length) {
    throw new HttpsError("invalid-argument", "Duplicate answers.");
  }
  return answers;
}

function publicQuestion(id: string, question: QuestionDoc) {
  return {
    id,
    oppositionId: question.oppositionId,
    statement: question.statement,
    answers: question.answers,
    categoryId: question.categoryId,
    difficulty: question.difficulty,
    scopeType: question.scopeType,
    territoryKeys: question.territoryKeys,
    source: question.source,
  };
}

function reviewQuestion(id: string, question: QuestionDoc) {
  return {
    ...publicQuestion(id, question),
    correctAnswerId: question.correctAnswerId,
    explanation: question.explanation,
  };
}

function numberValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function nextStreak(current: number, previousValue: unknown, now: Timestamp): number {
  if (!(previousValue instanceof Timestamp)) return 1;
  const previousDay = madridDay(previousValue.toDate());
  const currentDay = madridDay(now.toDate());
  const difference = Math.round(
    (Date.parse(`${currentDay}T00:00:00Z`) - Date.parse(`${previousDay}T00:00:00Z`)) /
    86_400_000,
  );
  if (difference === 0) return current;
  if (difference === 1) return current + 1;
  return 1;
}

function serializeProfile(uid: string, data: Record<string, unknown>) {
  return {
    uid,
    username: typeof data.username === "string" ? data.username : "Invitado",
    isGuest: data.isAnonymous !== false,
    oppositionId: typeof data.oppositionId === "string" ? data.oppositionId : "",
    oppositionName: typeof data.oppositionName === "string" ? data.oppositionName : "",
    territory: parseTerritory(data.territorySelection),
    ...serializeProgress(data),
  };
}

function serializeProgress(data: Record<string, unknown>) {
  return {
    xp: numberValue(data.xp),
    level: Math.max(1, numberValue(data.level)),
    coins: numberValue(data.coins),
    gems: numberValue(data.gems),
    currentStreak: numberValue(data.currentStreak),
    bestStreak: numberValue(data.bestStreak),
    totalQuestions: numberValue(data.totalQuestions),
    correctAnswers: numberValue(data.correctAnswers),
    testsCompleted: numberValue(data.testsCompleted),
    lastValidActivityDate: data.lastValidActivityDate instanceof Timestamp ?
      data.lastValidActivityDate.toDate().toISOString() : null,
  };
}

function missionDocument(template: MissionTemplate, date: string, now: Timestamp) {
  return {
    missionId: template.id,
    date,
    title: template.title,
    description: template.description,
    type: template.type,
    target: template.target,
    rewardXp: template.rewardXp,
    rewardCoins: template.rewardCoins,
    progress: 0,
    claimed: false,
    createdAt: now,
    updatedAt: now,
  };
}

function serializeMission(
  template: MissionTemplate,
  data: Record<string, unknown>,
  date: string,
) {
  return {
    id: template.id,
    date,
    title: template.title,
    description: template.description,
    type: template.type,
    target: template.target,
    rewardXp: template.rewardXp,
    rewardCoins: template.rewardCoins,
    progress: Math.min(template.target, numberValue(data.progress)),
    claimed: data.claimed === true,
  };
}
