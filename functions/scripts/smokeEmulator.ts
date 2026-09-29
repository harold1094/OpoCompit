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
type SocialUser = {uid: string; username: string};
type SocialOverview = {
  friends: SocialUser[];
  incomingRequests: Array<{id: string; user: SocialUser}>;
  outgoingRequests: Array<{id: string; user: SocialUser}>;
  duelInvitations: Array<{
    id: string;
    duelId: string | null;
    status: string;
    opponent: SocialUser;
    opponentSubmitted: boolean;
  }>;
};

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

async function createAnonymousAuth() {
  const response = await fetch(
    `${authBaseUrl}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=emulator-key`,
    {
      method: "POST",
      headers: {"content-type": "application/json"},
      body: JSON.stringify({returnSecureToken: true}),
    },
  );
  const text = await response.text();
  assert.equal(response.ok, true, `Anonymous Auth failed: ${text}`);
  const auth = JSON.parse(text) as {idToken: string; localId: string};
  assert.ok(auth.idToken);
  assert.ok(auth.localId);
  return auth;
}

async function main() {
  const auth = await createAnonymousAuth();

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

  const firstUsername = await call<{user: SocialUser}>(
    "setPublicUsername",
    {username: "HaroldCT"},
    auth.idToken,
  );
  assert.equal(firstUsername.user.username, "HaroldCT");

  const friendAuth = await createAnonymousAuth();
  await call(
    "bootstrapGuestProfile",
    {
      oppositionId: "firefighters_es",
      oppositionName: "Bomberos",
      territory: {
        label: "Región de Murcia",
        country: "ES",
        autonomousCommunity: "Murcia",
      },
    },
    friendAuth.idToken,
  );

  let duplicateUsernameBlocked = false;
  try {
    await call("setPublicUsername", {username: "haroldct"}, friendAuth.idToken);
  } catch (error) {
    duplicateUsernameBlocked = error instanceof Error && error.message.includes("ALREADY_EXISTS");
  }
  assert.equal(duplicateUsernameBlocked, true);
  await call("setPublicUsername", {username: "LuciaReal"}, friendAuth.idToken);

  const search = await call<{users: SocialUser[]}>(
    "searchUsers",
    {query: "luciareal"},
    auth.idToken,
  );
  assert.equal(search.users.length, 1);
  assert.equal(search.users[0].uid, friendAuth.localId);

  const sentRequest = await call<{request: {id: string}}>(
    "sendFriendRequest",
    {targetUid: friendAuth.localId},
    auth.idToken,
  );
  const friendBeforeAccept = await call<SocialOverview>(
    "getSocialOverview",
    {},
    friendAuth.idToken,
  );
  assert.equal(friendBeforeAccept.incomingRequests.length, 1);
  assert.equal(friendBeforeAccept.incomingRequests[0].user.username, "HaroldCT");

  await call(
    "respondFriendRequest",
    {requestId: sentRequest.request.id, accept: true},
    friendAuth.idToken,
  );
  const [firstOverview, secondOverview] = await Promise.all([
    call<SocialOverview>("getSocialOverview", {}, auth.idToken),
    call<SocialOverview>("getSocialOverview", {}, friendAuth.idToken),
  ]);
  assert.equal(firstOverview.friends[0].username, "LuciaReal");
  assert.equal(secondOverview.friends[0].username, "HaroldCT");
  assert.equal(firstOverview.outgoingRequests.length, 0);
  assert.equal(secondOverview.incomingRequests.length, 0);

  const sentDuelInvitation = await call<{
    invitation: {id: string; status: string};
  }>(
    "sendFriendDuelInvitation",
    {friendUid: friendAuth.localId},
    auth.idToken,
  );
  assert.equal(sentDuelInvitation.invitation.status, "pending");
  const duelInbox = await call<SocialOverview>("getSocialOverview", {}, friendAuth.idToken);
  assert.equal(duelInbox.duelInvitations[0].opponent.username, "HaroldCT");
  assert.equal(duelInbox.duelInvitations[0].status, "pending");

  const acceptedDuelInvitation = await call<{
    invitation: {duelId: string; status: string};
  }>(
    "respondFriendDuelInvitation",
    {invitationId: sentDuelInvitation.invitation.id, accept: true},
    friendAuth.idToken,
  );
  assert.equal(acceptedDuelInvitation.invitation.status, "active");
  assert.ok(acceptedDuelInvitation.invitation.duelId);
  const friendDuelId = acceptedDuelInvitation.invitation.duelId;

  const [firstFriendDuel, secondFriendDuel] = await Promise.all([
    call<{
      questions: Array<{id: string; correctAnswerId?: string}>;
      opponent: {name: string};
      status: string;
    }>("openFriendDuel", {duelId: friendDuelId}, auth.idToken),
    call<{
      questions: Array<{id: string; correctAnswerId?: string}>;
      opponent: {name: string};
      status: string;
    }>("openFriendDuel", {duelId: friendDuelId}, friendAuth.idToken),
  ]);
  assert.equal(firstFriendDuel.status, "active");
  assert.equal(firstFriendDuel.opponent.name, "LuciaReal");
  assert.deepEqual(
    firstFriendDuel.questions.map((question) => question.id),
    secondFriendDuel.questions.map((question) => question.id),
  );
  assert.equal(
    firstFriendDuel.questions.every((question) => question.correctAnswerId === undefined),
    true,
  );

  const firstFriendSubmission = await call<{
    status: string;
    result: {correct: number};
    duel: null;
  }>(
    "submitFriendDuel",
    {
      duelId: friendDuelId,
      answers: firstFriendDuel.questions.map((question) => ({
        questionId: question.id,
        selectedAnswerId: answersByQuestion.get(question.id),
      })),
    },
    auth.idToken,
  );
  assert.equal(firstFriendSubmission.status, "waiting");
  assert.equal(firstFriendSubmission.result.correct, 10);
  assert.equal(firstFriendSubmission.duel, null);

  const waitingOverview = await call<SocialOverview>("getSocialOverview", {}, auth.idToken);
  assert.equal(waitingOverview.duelInvitations[0].status, "waiting");
  const opponentTurnOverview = await call<SocialOverview>(
    "getSocialOverview",
    {},
    friendAuth.idToken,
  );
  assert.equal(opponentTurnOverview.duelInvitations[0].status, "active");
  assert.equal(opponentTurnOverview.duelInvitations[0].opponentSubmitted, true);

  const secondFriendSubmission = await call<{
    status: string;
    duel: {outcome: string; playerCorrect: number; opponentCorrect: number};
    progress: Progress;
  }>(
    "submitFriendDuel",
    {
      duelId: friendDuelId,
      answers: secondFriendDuel.questions.map((question) => ({
        questionId: question.id,
        selectedAnswerId: null,
      })),
    },
    friendAuth.idToken,
  );
  assert.equal(secondFriendSubmission.status, "completed");
  assert.equal(secondFriendSubmission.duel.outcome, "loss");
  assert.equal(secondFriendSubmission.duel.playerCorrect, 0);
  assert.equal(secondFriendSubmission.duel.opponentCorrect, 10);
  assert.equal(secondFriendSubmission.progress.duelsPlayed, 1);
  assert.equal(secondFriendSubmission.progress.duelLosses, 1);

  const completedFriendDuel = await call<{
    status: string;
    result: {correct: number; xpEarned: number; coinsEarned: number};
    duel: {outcome: string; playerCorrect: number; opponentCorrect: number};
    progress: Progress;
  }>("openFriendDuel", {duelId: friendDuelId}, auth.idToken);
  assert.equal(completedFriendDuel.status, "completed");
  assert.equal(completedFriendDuel.duel.outcome, "win");
  assert.equal(completedFriendDuel.result.xpEarned, 150);
  assert.equal(completedFriendDuel.result.coinsEarned, 35);
  assert.equal(completedFriendDuel.progress.xp, 775);
  assert.equal(completedFriendDuel.progress.coins, 215);
  assert.equal(completedFriendDuel.progress.duelsPlayed, 2);
  assert.equal(completedFriendDuel.progress.duelWins, 2);

  let duplicateFriendDuelBlocked = false;
  try {
    await call(
      "submitFriendDuel",
      {duelId: friendDuelId, answers: []},
      auth.idToken,
    );
  } catch (error) {
    duplicateFriendDuelBlocked = error instanceof Error &&
      error.message.includes("FAILED_PRECONDITION");
  }
  assert.equal(duplicateFriendDuelBlocked, true);

  await call("removeFriend", {friendUid: friendAuth.localId}, auth.idToken);
  const afterRemoval = await call<SocialOverview>("getSocialOverview", {}, auth.idToken);
  assert.equal(afterRemoval.friends.length, 0);

  console.log(JSON.stringify({
    uid: auth.localId,
    quizzesCompleted: 3,
    questionsAnswered: 30,
    correctAnswers: 30,
    finalProgress: submittedDuel.progress,
    duplicateClaimsBlocked: true,
    duelValidated: true,
    duplicateDuelBlocked,
    friendshipRoundTripValidated: true,
    asynchronousFriendDuelValidated: true,
    duplicateFriendDuelBlocked,
    duplicateUsernameBlocked,
  }, null, 2));
}

void main();
