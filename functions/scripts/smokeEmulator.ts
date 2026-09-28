import assert from "node:assert/strict";

import {seedQuestions} from "../../apps/client/src/features/quiz/data/seedQuestions.ts";

const projectId = "opocompit-dev";
const authBaseUrl = "http://127.0.0.1:9099";
const functionsBaseUrl = `http://127.0.0.1:5001/${projectId}/us-central1`;

type CallableEnvelope<T> = {result?: T; error?: {message?: string; status?: string}};
type Progress = {
  xp: number;
  coins: number;
  gems: number;
  level: number;
  duelsPlayed: number;
  duelWins: number;
  duelLosses: number;
  duelDraws: number;
};
type MissionState = {id: string; progress: number; target: number; claimed: boolean};

async function call<T>(name: string, data: unknown, idToken: string): Promise<T> {
  const response = await fetch(`${functionsBaseUrl}/${name}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${idToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({data}),
  });
  const body = await response.json() as CallableEnvelope<T>;
  if (!response.ok || body.error) {
    throw new Error(
      `${name} failed: ${body.error?.status ?? response.status} ${body.error?.message ?? ""}`,
    );
  }
  assert.ok(body.result, `${name} returned no result.`);
  return body.result;
}

async function main() {
  const authResponse = await fetch(
    `${authBaseUrl}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=emulator-key`,
    {
      method: "POST",
      headers: {"content-type": "application/json"},
      body: JSON.stringify({returnSecureToken: true}),
    },
  );
  const authBody = await authResponse.text();
  assert.equal(authResponse.ok, true, `Anonymous Auth failed: ${authBody}`);
  const auth = JSON.parse(authBody) as {idToken: string; localId: string};
  assert.ok(auth.idToken);
  assert.ok(auth.localId);

  const bootstrap = await call<{profile: Progress}>(
    "bootstrapGuestProfile",
    {
      oppositionId: "firefighters_es",
      oppositionName: "Bomberos",
      territory: {
        label: "Bomberos Cartagena",
        country: "ES",
        autonomousCommunity: "Murcia",
        province: "Murcia",
        municipality: "Cartagena",
        specificBody: "Bomberos Cartagena",
      },
    },
    auth.idToken,
  );
  assert.equal(bootstrap.profile.xp, 0);
  assert.equal(bootstrap.profile.coins, 0);

  const initialEngagement = await call<{
    dailyReward: {day: number; claimed: boolean};
    missions: MissionState[];
  }>("getDailyEngagement", {}, auth.idToken);
  assert.equal(initialEngagement.dailyReward.day, 1);
  assert.equal(initialEngagement.dailyReward.claimed, false);
  assert.equal(initialEngagement.missions.length, 3);

  const firstDailyClaim = await call<{progress: Progress}>(
    "claimDailyReward",
    {},
    auth.idToken,
  );
  const repeatedDailyClaim = await call<{progress: Progress}>(
    "claimDailyReward",
    {},
    auth.idToken,
  );
  assert.equal(firstDailyClaim.progress.coins, 25);
  assert.equal(repeatedDailyClaim.progress.coins, 25);

  const answersByQuestion = new Map(
    seedQuestions.map((question) => [question.id, question.correctAnswerId]),
  );
  let latestMissions: MissionState[] = [];

  for (let game = 0; game < 3; game++) {
    const started = await call<{
      sessionId: string;
      questions: Array<{id: string; correctAnswerId?: string; explanation?: string}>;
    }>("startQuickQuiz", {questionCount: 10}, auth.idToken);
    assert.equal(started.questions.length, 10);
    assert.equal(
      started.questions.every((question) => question.correctAnswerId === undefined),
      true,
    );
    assert.equal(
      started.questions.every((question) => question.explanation === undefined),
      true,
    );

    const submitted = await call<{
      result: {correct: number; attempts: unknown[]};
      progress: Progress;
      engagement: {missions: MissionState[]};
    }>(
      "submitQuizSession",
      {
        sessionId: started.sessionId,
        answers: started.questions.map((question) => ({
          questionId: question.id,
          selectedAnswerId: answersByQuestion.get(question.id),
        })),
      },
      auth.idToken,
    );
    assert.equal(submitted.result.correct, 10);
    assert.equal(submitted.result.attempts.length, 10);
    latestMissions = submitted.engagement.missions;
  }

  assert.deepEqual(latestMissions.map((mission) => mission.progress), [1, 30, 15]);

  let finalProgress: Progress | null = null;
  for (const mission of latestMissions) {
    const claim = await call<{progress: Progress}>(
      "claimMission",
      {missionId: mission.id},
      auth.idToken,
    );
    finalProgress = claim.progress;
  }
  assert.ok(finalProgress);
  assert.equal(finalProgress.xp, 475);
  assert.equal(finalProgress.coins, 145);
  assert.equal(finalProgress.gems, 0);
  assert.equal(finalProgress.level, 3);

  const repeatedMissionClaim = await call<{progress: Progress}>(
    "claimMission",
    {missionId: latestMissions[0].id},
    auth.idToken,
  );
  assert.equal(repeatedMissionClaim.progress.xp, 475);
  assert.equal(repeatedMissionClaim.progress.coins, 145);

  const startedDuel = await call<{
    duelId: string;
    opponent: {id: string; name: string};
    questions: Array<{id: string; correctAnswerId?: string; explanation?: string}>;
  }>("startClassicDuel", {opponentId: "training_mario"}, auth.idToken);
  assert.equal(startedDuel.opponent.name, "MarioCT");
  assert.equal(startedDuel.questions.length, 10);
  assert.equal(
    startedDuel.questions.every((question) => question.correctAnswerId === undefined),
    true,
  );
  assert.equal(
    startedDuel.questions.every((question) => question.explanation === undefined),
    true,
  );

  const submittedDuel = await call<{
    result: {correct: number; xpEarned: number; coinsEarned: number};
    duel: {outcome: string; playerCorrect: number; opponentCorrect: number};
    progress: Progress;
    engagement: {missions: MissionState[]};
  }>(
    "submitClassicDuel",
    {
      duelId: startedDuel.duelId,
      answers: startedDuel.questions.map((question) => ({
        questionId: question.id,
        selectedAnswerId: answersByQuestion.get(question.id),
      })),
    },
    auth.idToken,
  );
  assert.equal(submittedDuel.result.correct, 10);
  assert.equal(submittedDuel.result.xpEarned, 150);
  assert.equal(submittedDuel.result.coinsEarned, 35);
  assert.equal(submittedDuel.duel.outcome, "win");
  assert.equal(submittedDuel.duel.playerCorrect, 10);
  assert.equal(submittedDuel.duel.opponentCorrect, 7);
  assert.equal(submittedDuel.progress.xp, 625);
  assert.equal(submittedDuel.progress.coins, 180);
  assert.equal(submittedDuel.progress.duelsPlayed, 1);
  assert.equal(submittedDuel.progress.duelWins, 1);
  assert.deepEqual(
    submittedDuel.engagement.missions.map((mission) => mission.progress),
    [1, 30, 15],
  );

  let duplicateDuelBlocked = false;
  try {
    await call(
      "submitClassicDuel",
      {duelId: startedDuel.duelId, answers: []},
      auth.idToken,
    );
  } catch (error) {
    duplicateDuelBlocked = error instanceof Error && error.message.includes("FAILED_PRECONDITION");
  }
  assert.equal(duplicateDuelBlocked, true);

  console.log(JSON.stringify({
    uid: auth.localId,
    quizzesCompleted: 3,
    questionsAnswered: 30,
    correctAnswers: 30,
    finalProgress: submittedDuel.progress,
    duplicateClaimsBlocked: true,
    duelValidated: true,
    duplicateDuelBlocked,
  }, null, 2));
}

void main();
