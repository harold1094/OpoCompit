import {initializeApp} from "firebase-admin/app";
import {
  DocumentReference,
  DocumentSnapshot,
  Timestamp,
  getFirestore,
} from "firebase-admin/firestore";
import {HttpsError, onCall} from "firebase-functions/v2/https";

import {
  dailyMissionTemplates,
  dailyRewardFor,
  madridDay,
  missionDocumentId,
  missionProgressIncrement,
  MissionTemplate,
} from "./engagement.js";
import {duelOutcome, trainingOpponent} from "./duel.js";
import {isValidUsername, socialEdgeId, usernameKey} from "./social.js";

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

type StartClassicDuelInput = {
  opponentId: string;
};

type SubmitClassicDuelInput = {
  duelId: string;
  answers: Answer[];
};

type SetPublicUsernameInput = {
  username: string;
};

type SearchUsersInput = {
  query: string;
};

type SendFriendRequestInput = {
  targetUid: string;
};

type RespondFriendRequestInput = {
  requestId: string;
  accept: boolean;
};

type RemoveFriendInput = {
  friendUid: string;
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
      duelsPlayed: 0,
      duelWins: 0,
      duelLosses: 0,
      duelDraws: 0,
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

export const startClassicDuel = onCall<StartClassicDuelInput>(async (request) => {
  const uid = requireUid(request.auth?.uid);
  const opponentId = requireString(request.data?.opponentId, "opponentId", 80);
  const opponent = trainingOpponent(opponentId);
  if (!opponent) {
    throw new HttpsError("not-found", "Training opponent not found.");
  }

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
    .limit(10)
    .get();

  if (snapshot.empty) {
    throw new HttpsError("not-found", "No eligible questions found.");
  }

  const duelRef = db.collection("duels").doc();
  const publicOpponent = {
    id: opponent.id,
    name: opponent.name,
    level: opponent.level,
    territoryLabel: opponent.territoryLabel,
  };
  await duelRef.set({
    uid,
    participantUids: [uid],
    mode: "classic_training",
    opponent: publicOpponent,
    oppositionId,
    territoryKeys,
    questionIds: snapshot.docs.map((document) => document.id),
    status: "started",
    createdAt: Timestamp.now(),
    completedAt: null,
  });

  return {
    duelId: duelRef.id,
    opponent: publicOpponent,
    questions: snapshot.docs.map((document) =>
      publicQuestion(document.id, document.data() as QuestionDoc)),
  };
});

export const submitClassicDuel = onCall<SubmitClassicDuelInput>(async (request) => {
  const uid = requireUid(request.auth?.uid);
  const duelId = requireString(request.data?.duelId, "duelId", 160);
  const submittedAnswers = parseAnswers(request.data?.answers);
  const duelRef = db.collection("duels").doc(duelId);

  return db.runTransaction(async (transaction) => {
    const duelSnapshot = await transaction.get(duelRef);
    if (!duelSnapshot.exists) {
      throw new HttpsError("not-found", "Duel not found.");
    }

    const duel = duelSnapshot.data() ?? {};
    if (duel.uid !== uid) {
      throw new HttpsError("permission-denied", "Not your duel.");
    }
    if (duel.status !== "started") {
      throw new HttpsError("failed-precondition", "Duel already submitted.");
    }
    if (!(duel.createdAt instanceof Timestamp) ||
      Date.now() - duel.createdAt.toMillis() > sessionLifetimeMs) {
      throw new HttpsError("deadline-exceeded", "Duel expired.");
    }

    const opponentId = requireString(
      (duel.opponent as Record<string, unknown> | undefined)?.id,
      "stored opponentId",
      80,
    );
    const opponent = trainingOpponent(opponentId);
    if (!opponent) {
      throw new HttpsError("failed-precondition", "Training opponent is no longer available.");
    }

    const questionIds = parseQuestionIds(duel.questionIds);
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
      if (selectedAnswerId !== null &&
        !question.data.answers.some((option) => option.id === selectedAnswerId)) {
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

    const playerElapsedMs = Math.min(
      Math.max(0, completedAt.toMillis() - duel.createdAt.toMillis()),
      3_600_000,
    );
    const opponentCorrect = Math.min(opponent.correctAnswers, questions.length);
    const outcome = duelOutcome(
      correct,
      playerElapsedMs,
      opponentCorrect,
      opponent.elapsedMs,
    );
    const percentage = correct / questions.length;
    const outcomeXp = outcome === "win" ? 20 : outcome === "draw" ? 10 : 0;
    const outcomeCoins = outcome === "win" ? 10 : outcome === "draw" ? 5 : 0;
    const xpEarned = correct * 10 + 20 + (percentage >= 0.8 ? 10 : 0) + outcomeXp;
    const coinsEarned = correct * 2 + 5 + outcomeCoins;
    const user = userSnapshot.data() ?? {};
    const previousStreak = numberValue(user.currentStreak);
    const streak = nextStreak(previousStreak, user.lastValidActivityDate, completedAt);
    const xp = numberValue(user.xp) + xpEarned;
    const coins = numberValue(user.coins) + coinsEarned;
    const profileUpdate = {
      xp,
      level: Math.floor(Math.sqrt(xp / 100)) + 1,
      coins,
      currentStreak: streak,
      bestStreak: Math.max(numberValue(user.bestStreak), streak),
      totalQuestions: numberValue(user.totalQuestions) + questions.length,
      correctAnswers: numberValue(user.correctAnswers) + correct,
      testsCompleted: numberValue(user.testsCompleted) + 1,
      duelsPlayed: numberValue(user.duelsPlayed) + 1,
      duelWins: numberValue(user.duelWins) + (outcome === "win" ? 1 : 0),
      duelLosses: numberValue(user.duelLosses) + (outcome === "loss" ? 1 : 0),
      duelDraws: numberValue(user.duelDraws) + (outcome === "draw" ? 1 : 0),
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
        incorrectCount: numberValue(previous.incorrectCount) +
          (!attempt.isCorrect && !attempt.isBlank ? 1 : 0),
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
          missionProgressIncrement(template.type, questions.length, correct, false),
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

    const result = {
      attempts,
      correct,
      incorrect,
      blank,
      points: correct,
      percentage,
      xpEarned,
      coinsEarned,
      completedAt: completedAt.toDate().toISOString(),
    };
    const duelResult = {
      duelId,
      opponent: {
        id: opponent.id,
        name: opponent.name,
        level: opponent.level,
        territoryLabel: opponent.territoryLabel,
      },
      outcome,
      playerCorrect: correct,
      opponentCorrect,
      playerElapsedMs,
      opponentElapsedMs: opponent.elapsedMs,
    };
    transaction.update(duelRef, {
      answers: questionIds.map((questionId) => ({
        questionId,
        selectedAnswerId: answersByQuestion.get(questionId)?.selectedAnswerId ?? null,
      })),
      status: "completed",
      result: duelResult,
      reward: {xpEarned, coinsEarned},
      completedAt,
    });
    transaction.set(db.collection("currencyTransactions").doc(), {
      uid,
      type: "duel_reward",
      currency: "coins",
      amount: coinsEarned,
      balanceAfter: coins,
      sourceId: duelId,
      createdAt: completedAt,
    });

    return {
      result,
      duel: duelResult,
      progress: serializeProgress({...user, ...profileUpdate}),
      engagement: {
        dailyReward: dailyRewardFor(user.dailyRewardDay, user.lastDailyRewardDate, date),
        missions,
      },
    };
  });
});

export const setPublicUsername = onCall<SetPublicUsernameInput>(async (request) => {
  const uid = requireUid(request.auth?.uid);
  const username = requireString(request.data?.username, "username", 20);
  if (!isValidUsername(username)) {
    throw new HttpsError(
      "invalid-argument",
      "Username must contain 3 to 20 letters, numbers, or underscores.",
    );
  }

  const key = usernameKey(username);
  const userRef = db.collection("users").doc(uid);
  const usernameRef = db.collection("usernames").doc(key);

  return db.runTransaction(async (transaction) => {
    const userSnapshot = await transaction.get(userRef);
    if (!userSnapshot.exists) {
      throw new HttpsError("failed-precondition", "User profile missing.");
    }
    const user = userSnapshot.data() ?? {};
    const reservationSnapshot = await transaction.get(usernameRef);
    if (reservationSnapshot.exists && reservationSnapshot.data()?.uid !== uid) {
      throw new HttpsError("already-exists", "Username is already in use.");
    }

    const previousKey = typeof user.usernameKey === "string" ? user.usernameKey : null;
    let previousReservation: DocumentSnapshot | null = null;
    let previousRef: DocumentReference | null = null;
    if (previousKey && previousKey !== key) {
      previousRef = db.collection("usernames").doc(previousKey);
      previousReservation = await transaction.get(previousRef);
    }

    const now = Timestamp.now();
    const update = {username, usernameKey: key, updatedAt: now};
    transaction.update(userRef, update);
    transaction.set(usernameRef, {uid, username, updatedAt: now});
    if (previousRef && previousReservation?.data()?.uid === uid) {
      transaction.delete(previousRef);
    }
    return {user: serializeSocialUser(uid, {...user, ...update})};
  });
});

export const searchUsers = onCall<SearchUsersInput>(async (request) => {
  const uid = requireUid(request.auth?.uid);
  const query = requireString(request.data?.query, "query", 20);
  if (!isValidUsername(query)) return {users: []};

  const reservation = await db.collection("usernames").doc(usernameKey(query)).get();
  if (!reservation.exists || reservation.data()?.uid === uid) return {users: []};
  const targetUid = requireString(reservation.data()?.uid, "stored uid", 160);
  const target = await db.collection("users").doc(targetUid).get();
  if (!target.exists) return {users: []};
  return {users: [serializeSocialUser(target.id, target.data() ?? {})]};
});

export const getSocialOverview = onCall(async (request) => {
  const uid = requireUid(request.auth?.uid);
  return socialOverview(uid);
});

export const sendFriendRequest = onCall<SendFriendRequestInput>(async (request) => {
  const uid = requireUid(request.auth?.uid);
  const targetUid = requireString(request.data?.targetUid, "targetUid", 160);
  if (uid === targetUid) {
    throw new HttpsError("invalid-argument", "You cannot add yourself.");
  }

  const edgeId = socialEdgeId(uid, targetUid);
  const requesterRef = db.collection("users").doc(uid);
  const targetRef = db.collection("users").doc(targetUid);
  const requestRef = db.collection("friendRequests").doc(edgeId);
  const friendRef = db.collection("friends").doc(edgeId);

  const friendRequest = await db.runTransaction(async (transaction) => {
    const [requester, target, existingRequest, existingFriend] = await Promise.all([
      transaction.get(requesterRef),
      transaction.get(targetRef),
      transaction.get(requestRef),
      transaction.get(friendRef),
    ]);
    if (!requester.exists || !target.exists) {
      throw new HttpsError("not-found", "User not found.");
    }
    if (!requester.data()?.usernameKey) {
      throw new HttpsError("failed-precondition", "Choose a username before adding friends.");
    }
    if (!target.data()?.usernameKey) {
      throw new HttpsError("not-found", "User is not available for search.");
    }
    if (existingFriend.exists) {
      throw new HttpsError("already-exists", "You are already friends.");
    }
    if (existingRequest.data()?.status === "pending") {
      throw new HttpsError("already-exists", "A friend request is already pending.");
    }

    const now = Timestamp.now();
    const data = {
      fromUid: uid,
      toUid: targetUid,
      fromUser: serializeSocialUser(uid, requester.data() ?? {}),
      toUser: serializeSocialUser(targetUid, target.data() ?? {}),
      status: "pending",
      createdAt: now,
      updatedAt: now,
    };
    transaction.set(requestRef, data);
    return serializeFriendRequest(requestRef.id, data, uid);
  });

  return {request: friendRequest};
});

export const respondFriendRequest = onCall<RespondFriendRequestInput>(async (request) => {
  const uid = requireUid(request.auth?.uid);
  const requestId = requireString(request.data?.requestId, "requestId", 340);
  if (typeof request.data?.accept !== "boolean") {
    throw new HttpsError("invalid-argument", "Invalid friend request response.");
  }
  const requestRef = db.collection("friendRequests").doc(requestId);

  return db.runTransaction(async (transaction) => {
    const requestSnapshot = await transaction.get(requestRef);
    if (!requestSnapshot.exists) {
      throw new HttpsError("not-found", "Friend request not found.");
    }
    const friendRequest = requestSnapshot.data() ?? {};
    if (friendRequest.toUid !== uid) {
      throw new HttpsError("permission-denied", "This request is not for you.");
    }
    if (friendRequest.status !== "pending") {
      throw new HttpsError("failed-precondition", "Friend request already resolved.");
    }

    const fromUid = requireString(friendRequest.fromUid, "stored fromUid", 160);
    const fromRef = db.collection("users").doc(fromUid);
    const toRef = db.collection("users").doc(uid);
    const [fromUser, toUser] = await Promise.all([
      transaction.get(fromRef),
      transaction.get(toRef),
    ]);
    if (!fromUser.exists || !toUser.exists) {
      throw new HttpsError("failed-precondition", "Friend profile missing.");
    }

    const now = Timestamp.now();
    const status = request.data.accept ? "accepted" : "declined";
    transaction.update(requestRef, {status, updatedAt: now, resolvedAt: now});
    let friend = null;
    if (request.data.accept) {
      const friendRef = db.collection("friends").doc(socialEdgeId(fromUid, uid));
      const fromSnapshot = serializeSocialUser(fromUid, fromUser.data() ?? {});
      const toSnapshot = serializeSocialUser(uid, toUser.data() ?? {});
      transaction.set(friendRef, {
        uids: [fromUid, uid],
        members: [fromSnapshot, toSnapshot],
        createdAt: now,
        updatedAt: now,
      });
      friend = fromSnapshot;
    }

    return {
      request: serializeFriendRequest(
        requestId,
        {...friendRequest, status, updatedAt: now},
        uid,
      ),
      friend,
    };
  });
});

export const removeFriend = onCall<RemoveFriendInput>(async (request) => {
  const uid = requireUid(request.auth?.uid);
  const friendUid = requireString(request.data?.friendUid, "friendUid", 160);
  const friendRef = db.collection("friends").doc(socialEdgeId(uid, friendUid));

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(friendRef);
    if (!snapshot.exists || !parseStringArray(snapshot.data()?.uids).includes(uid)) {
      throw new HttpsError("not-found", "Friendship not found.");
    }
    transaction.delete(friendRef);
  });
  return {removedUid: friendUid};
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
  const territory: TerritorySelection = {
    label: requireString(data.label, "territory.label", 100),
    country: requireString(data.country, "territory.country", 8),
  };
  const optionalFields: Array<[keyof TerritorySelection, unknown]> = [
    ["autonomousCommunity", data.autonomousCommunity],
    ["province", data.province],
    ["municipality", data.municipality],
    ["specificBody", data.specificBody],
  ];
  optionalFields.forEach(([field, rawValue]) => {
    const parsed = optionalString(rawValue, `territory.${field}`);
    if (parsed !== undefined) territory[field] = parsed;
  });
  return territory;
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
    duelsPlayed: numberValue(data.duelsPlayed),
    duelWins: numberValue(data.duelWins),
    duelLosses: numberValue(data.duelLosses),
    duelDraws: numberValue(data.duelDraws),
    lastValidActivityDate: data.lastValidActivityDate instanceof Timestamp ?
      data.lastValidActivityDate.toDate().toISOString() : null,
  };
}

async function socialOverview(uid: string) {
  const [incomingSnapshot, outgoingSnapshot, friendsSnapshot] = await Promise.all([
    db.collection("friendRequests").where("toUid", "==", uid).limit(50).get(),
    db.collection("friendRequests").where("fromUid", "==", uid).limit(50).get(),
    db.collection("friends").where("uids", "array-contains", uid).limit(50).get(),
  ]);

  const incomingRequests = incomingSnapshot.docs
    .filter((document) => document.data().status === "pending")
    .map((document) => serializeFriendRequest(document.id, document.data(), uid));
  const outgoingRequests = outgoingSnapshot.docs
    .filter((document) => document.data().status === "pending")
    .map((document) => serializeFriendRequest(document.id, document.data(), uid));
  const friends = friendsSnapshot.docs.flatMap((document) => {
    const members: unknown[] = Array.isArray(document.data().members) ?
      document.data().members : [];
    const friend = members.find((member) =>
      typeof member === "object" && member !== null &&
      (member as Record<string, unknown>).uid !== uid,
    );
    return friend ? [serializeStoredSocialUser(friend)] : [];
  });

  return {friends, incomingRequests, outgoingRequests};
}

function serializeSocialUser(uid: string, data: Record<string, unknown>) {
  const territory = typeof data.territorySelection === "object" &&
    data.territorySelection !== null ?
    data.territorySelection as Record<string, unknown> : {};
  return {
    uid,
    username: typeof data.username === "string" ? data.username : "Invitado",
    level: Math.max(1, numberValue(data.level)),
    territoryLabel: typeof territory.label === "string" ? territory.label : "España",
    currentStreak: numberValue(data.currentStreak),
    duelWins: numberValue(data.duelWins),
  };
}

function serializeStoredSocialUser(value: unknown) {
  const data = typeof value === "object" && value !== null ?
    value as Record<string, unknown> : {};
  return {
    uid: typeof data.uid === "string" ? data.uid : "",
    username: typeof data.username === "string" ? data.username : "Invitado",
    level: Math.max(1, numberValue(data.level)),
    territoryLabel: typeof data.territoryLabel === "string" ? data.territoryLabel : "España",
    currentStreak: numberValue(data.currentStreak),
    duelWins: numberValue(data.duelWins),
  };
}

function serializeFriendRequest(
  id: string,
  data: Record<string, unknown>,
  viewerUid: string,
) {
  const incoming = data.toUid === viewerUid;
  const status = data.status === "accepted" || data.status === "declined" ?
    data.status : "pending";
  return {
    id,
    direction: incoming ? "incoming" : "outgoing",
    status,
    user: serializeStoredSocialUser(incoming ? data.fromUser : data.toUser),
    createdAt: data.createdAt instanceof Timestamp ?
      data.createdAt.toDate().toISOString() : new Date(0).toISOString(),
  };
}

function parseStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
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
