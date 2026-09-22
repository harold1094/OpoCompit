import {initializeApp} from 'firebase-admin/app';
import {FieldValue, getFirestore} from 'firebase-admin/firestore';
import {HttpsError, onCall} from 'firebase-functions/v2/https';

initializeApp();

const db = getFirestore();

type Answer = {
  questionId: string;
  selectedAnswerId?: string | null;
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

type StartQuickQuizInput = {
  oppositionId: string;
  territoryKeys: string[];
  questionCount?: number;
};

type SubmitQuizInput = {
  sessionId: string;
  answers: Answer[];
};

export const startQuickQuiz = onCall<StartQuickQuizInput>(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }

  const oppositionId = request.data.oppositionId;
  const territoryKeys = request.data.territoryKeys ?? [];
  const questionCount = Math.min(request.data.questionCount ?? 10, 25);

  if (!oppositionId || territoryKeys.length === 0) {
    throw new HttpsError('invalid-argument', 'Missing opposition or territory.');
  }

  const snapshot = await db.collection('questions')
    .where('oppositionId', '==', oppositionId)
    .where('status', '==', 'published')
    .where('verified', '==', true)
    .where('territoryKeys', 'array-contains-any', territoryKeys.slice(0, 10))
    .limit(questionCount)
    .get();

  if (snapshot.empty) {
    throw new HttpsError('not-found', 'No eligible questions found.');
  }

  const questions = snapshot.docs.map((doc) => {
    const data = doc.data() as QuestionDoc;
    return {
      id: doc.id,
      statement: data.statement,
      answers: data.answers,
      explanation: data.explanation,
      categoryId: data.categoryId,
      difficulty: data.difficulty,
      scopeType: data.scopeType,
      territoryKeys: data.territoryKeys,
      source: data.source,
    };
  });

  const sessionRef = db.collection('quizSessions').doc();
  await sessionRef.set({
    uid,
    mode: 'quick',
    oppositionId,
    territoryKeys,
    questionIds: snapshot.docs.map((doc) => doc.id),
    answers: [],
    status: 'started',
    createdAt: FieldValue.serverTimestamp(),
    submittedAt: null,
  });

  return {
    sessionId: sessionRef.id,
    questions,
  };
});

export const submitQuizSession = onCall<SubmitQuizInput>(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }

  const sessionRef = db.collection('quizSessions').doc(request.data.sessionId);
  const result = await db.runTransaction(async (transaction) => {
    const sessionSnapshot = await transaction.get(sessionRef);
    if (!sessionSnapshot.exists) {
      throw new HttpsError('not-found', 'Quiz session not found.');
    }

    const session = sessionSnapshot.data();
    if (!session || session.uid !== uid) {
      throw new HttpsError('permission-denied', 'Not your quiz session.');
    }
    if (session.status !== 'started') {
      throw new HttpsError('failed-precondition', 'Session already submitted.');
    }

    const questionIds = session.questionIds as string[];
    const questionSnapshots = await Promise.all(
      questionIds.map((id) => transaction.get(db.collection('questions').doc(id))),
    );
    const questions = questionSnapshots.map((snapshot) => {
      if (!snapshot.exists) {
        throw new HttpsError('failed-precondition', 'Question missing.');
      }
      return {
        id: snapshot.id,
        data: snapshot.data() as QuestionDoc,
      };
    });

    const answersByQuestion = new Map(
      request.data.answers.map((answer) => [answer.questionId, answer]),
    );

    let correct = 0;
    let blank = 0;
    let incorrect = 0;

    for (const question of questions) {
      const answer = answersByQuestion.get(question.id);
      const selectedAnswerId = answer?.selectedAnswerId ?? null;
      if (!selectedAnswerId) {
        blank++;
      } else if (selectedAnswerId === question.data.correctAnswerId) {
        correct++;
      } else {
        incorrect++;
      }
    }

    const percentage = questions.length === 0 ? 0 : correct / questions.length;
    const xpEarned = correct * 10 + 20 + (percentage >= 0.8 ? 10 : 0);
    const coinsEarned = correct * 2 + 5;

    const userRef = db.collection('users').doc(uid);
    transaction.set(
      userRef,
      {
        xp: FieldValue.increment(xpEarned),
        coins: FieldValue.increment(coinsEarned),
        totalQuestions: FieldValue.increment(questions.length),
        correctAnswers: FieldValue.increment(correct),
        testsCompleted: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      },
      {merge: true},
    );

    transaction.update(sessionRef, {
      answers: request.data.answers,
      status: 'validated',
      score: {
        correct,
        incorrect,
        blank,
        percentage,
        xpEarned,
        coinsEarned,
      },
      submittedAt: FieldValue.serverTimestamp(),
    });

    const transactionRef = db.collection('currencyTransactions').doc();
    transaction.set(transactionRef, {
      uid,
      type: 'quiz_reward',
      currency: 'coins',
      amount: coinsEarned,
      sourceId: sessionRef.id,
      createdAt: FieldValue.serverTimestamp(),
    });

    return {
      correct,
      incorrect,
      blank,
      percentage,
      xpEarned,
      coinsEarned,
    };
  });

  return result;
});

