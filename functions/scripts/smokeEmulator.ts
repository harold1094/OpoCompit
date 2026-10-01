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
type SocialUser = {
  uid: string;
  username: string;
  sharedStreak?: number;
  viewerActiveToday?: boolean;
  activeToday?: boolean;
};
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
  activity: Array<{
    id: string;
    type: string;
    actor: SocialUser;
    correct: number;
    total: number;
    streak: number;
    createdAt: string;
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

  const monetization = await call<{
    plans: Array<{id: string; purchasable: boolean; storeProductId: string | null}>;
    entitlement: {tier: string; status: string};
    gemBalance: number;
    ads: {enabled: boolean; rewardedEnabled: boolean; resultInterval: number};
  }>("getMonetizationOverview", {}, auth.idToken);
  assert.equal(monetization.plans.length, 1);
  assert.equal(monetization.plans[0].id, "premium_monthly_preview");
  assert.equal(monetization.plans[0].purchasable, false);
  assert.equal(monetization.plans[0].storeProductId, null);
  assert.equal(monetization.entitlement.tier, "free");
  assert.equal(monetization.entitlement.status, "free");
  assert.equal(monetization.gemBalance, 0);
  assert.equal(monetization.ads.enabled, false);
  assert.equal(monetization.ads.rewardedEnabled, false);
  assert.equal(monetization.ads.resultInterval, 3);

  let nonAdminReviewBlocked = false;
  try {
    await call("getQuestionReviewQueue", {}, auth.idToken);
  } catch (error) {
    nonAdminReviewBlocked = error instanceof Error && error.message.includes("PERMISSION_DENIED");
  }
  assert.equal(nonAdminReviewBlocked, true);

  let nonAdminBulkReviewBlocked = false;
  try {
    await call(
      "bulkReviewQuestions",
      {questionIds: ["admin-import-smoke-question"], decision: "publish"},
      auth.idToken,
    );
  } catch (error) {
    nonAdminBulkReviewBlocked = error instanceof Error && error.message.includes("PERMISSION_DENIED");
  }
  assert.equal(nonAdminBulkReviewBlocked, true);

  const importPayload = {
    batchId: "smoke-admin-import",
    sourceDocument: "smoke-manual.pdf",
    questions: [{
      id: "admin-import-smoke-question",
      oppositionId: "firefighters_es",
      statement: "Which review state must an imported question use?",
      answers: [
        {id: "a", text: "Published"},
        {id: "b", text: "Pending review"},
      ],
      correctAnswerId: "b",
      explanation: "Imported content requires human review before publication.",
      categoryId: "platform_rules",
      difficulty: 1,
      scopeType: "national",
      country: "ES",
      source: "OpoCompit import policy",
      status: "pending_review",
      verified: false,
    }],
  };
  let nonAdminImportBlocked = false;
  try {
    await call("importQuestionBatch", importPayload, auth.idToken);
  } catch (error) {
    nonAdminImportBlocked = error instanceof Error && error.message.includes("PERMISSION_DENIED");
  }
  assert.equal(nonAdminImportBlocked, true);

  const emulatorAdmin = await call<{role: string}>("bootstrapEmulatorAdmin", {}, auth.idToken);
  assert.equal(emulatorAdmin.role, "admin");
  const firstImport = await call<{
    importedCount: number;
    questionIds: string[];
    status: string;
    idempotent: boolean;
  }>("importQuestionBatch", importPayload, auth.idToken);
  assert.equal(firstImport.importedCount, 1);
  assert.deepEqual(firstImport.questionIds, ["admin-import-smoke-question"]);
  assert.equal(firstImport.status, "completed");
  assert.equal(firstImport.idempotent, false);

  const repeatedImport = await call<typeof firstImport>(
    "importQuestionBatch",
    importPayload,
    auth.idToken,
  );
  assert.equal(repeatedImport.idempotent, true);
  assert.deepEqual(repeatedImport.questionIds, firstImport.questionIds);

  type ReviewQuestion = typeof importPayload.questions[0] & {
    territoryKeys: string[];
    subcategoryId: string | null;
    autonomousCommunity: string | null;
    province: string | null;
    municipality: string | null;
    specificCallId: string | null;
    officialExamId: string | null;
    year: number | null;
    sourceDocument: string | null;
    sourcePage: number | null;
    validFrom: string | null;
    validUntil: string | null;
  };
  const initialReviewQueue = await call<{questions: ReviewQuestion[]}>(
    "getQuestionReviewQueue",
    {limit: 20},
    auth.idToken,
  );
  const importedForReview = initialReviewQueue.questions.find(
    (question) => question.id === "admin-import-smoke-question",
  );
  assert.ok(importedForReview);

  let publishedImportBlocked = false;
  try {
    await call(
      "importQuestionBatch",
      {...importPayload, batchId: "invalid-published-import", questions: [{
        ...importPayload.questions[0],
        id: "invalid-published-question",
        status: "published",
      }]},
      auth.idToken,
    );
  } catch (error) {
    publishedImportBlocked = error instanceof Error && error.message.includes("INVALID_ARGUMENT");
  }
  assert.equal(publishedImportBlocked, true);

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
      started.questions.some((question) => question.id === "admin-import-smoke-question"),
      false,
    );
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

  type MatchmakingState = {
    status: string;
    rating: number;
    range?: number;
    duelId?: string;
    duelStatus?: string;
    opponent?: SocialUser;
    viewerSubmitted?: boolean;
    opponentSubmitted?: boolean;
  };
  const firstQueue = await call<{matchmaking: MatchmakingState}>(
    "joinMatchmaking",
    {},
    auth.idToken,
  );
  assert.equal(firstQueue.matchmaking.status, "waiting");
  assert.equal(firstQueue.matchmaking.rating, 1000);
  assert.equal(firstQueue.matchmaking.range, 100);

  const leftQueue = await call<{matchmaking: MatchmakingState}>(
    "leaveMatchmaking",
    {},
    auth.idToken,
  );
  assert.equal(leftQueue.matchmaking.status, "idle");
  const queueAfterLeaving = await call<{matchmaking: MatchmakingState}>(
    "getMatchmakingStatus",
    {},
    auth.idToken,
  );
  assert.equal(queueAfterLeaving.matchmaking.status, "idle");

  await call("joinMatchmaking", {}, auth.idToken);
  const secondQueue = await call<{matchmaking: MatchmakingState}>(
    "joinMatchmaking",
    {},
    friendAuth.idToken,
  );
  assert.equal(secondQueue.matchmaking.status, "matched");
  assert.equal(secondQueue.matchmaking.opponent?.username, "HaroldCT");
  assert.ok(secondQueue.matchmaking.duelId);
  const matchmakingDuelId = secondQueue.matchmaking.duelId;
  const firstMatchedQueue = await call<{matchmaking: MatchmakingState}>(
    "getMatchmakingStatus",
    {},
    auth.idToken,
  );
  assert.equal(firstMatchedQueue.matchmaking.status, "matched");
  assert.equal(firstMatchedQueue.matchmaking.duelId, matchmakingDuelId);
  assert.equal(firstMatchedQueue.matchmaking.opponent?.username, "LuciaReal");

  const [firstMatchmakingDuel, secondMatchmakingDuel] = await Promise.all([
    call<{questions: Array<{id: string}>; status: string}>(
      "openFriendDuel",
      {duelId: matchmakingDuelId},
      auth.idToken,
    ),
    call<{questions: Array<{id: string}>; status: string}>(
      "openFriendDuel",
      {duelId: matchmakingDuelId},
      friendAuth.idToken,
    ),
  ]);
  assert.equal(firstMatchmakingDuel.questions.length, 10);
  assert.deepEqual(
    firstMatchmakingDuel.questions.map((question) => question.id),
    secondMatchmakingDuel.questions.map((question) => question.id),
  );

  const firstMatchmakingSubmission = await call<{
    status: string;
    result: {correct: number};
  }>(
    "submitFriendDuel",
    {
      duelId: matchmakingDuelId,
      answers: firstMatchmakingDuel.questions.map((question) => ({
        questionId: question.id,
        selectedAnswerId: answersByQuestion.get(question.id),
      })),
    },
    auth.idToken,
  );
  assert.equal(firstMatchmakingSubmission.status, "waiting");
  assert.equal(firstMatchmakingSubmission.result.correct, 10);
  const waitingMatchmaking = await call<{matchmaking: MatchmakingState}>(
    "getMatchmakingStatus",
    {},
    auth.idToken,
  );
  assert.equal(waitingMatchmaking.matchmaking.duelStatus, "waiting");
  assert.equal(waitingMatchmaking.matchmaking.viewerSubmitted, true);

  const secondMatchmakingSubmission = await call<{
    status: string;
    duel: {kind: string; outcome: string};
  }>(
    "submitFriendDuel",
    {
      duelId: matchmakingDuelId,
      answers: secondMatchmakingDuel.questions.map((question) => ({
        questionId: question.id,
        selectedAnswerId: null,
      })),
    },
    friendAuth.idToken,
  );
  assert.equal(secondMatchmakingSubmission.status, "completed");
  assert.equal(secondMatchmakingSubmission.duel.kind, "matchmaking");
  assert.equal(secondMatchmakingSubmission.duel.outcome, "loss");

  const [winnerQueue, loserQueue] = await Promise.all([
    call<{matchmaking: MatchmakingState}>("getMatchmakingStatus", {}, auth.idToken),
    call<{matchmaking: MatchmakingState}>("getMatchmakingStatus", {}, friendAuth.idToken),
  ]);
  assert.equal(winnerQueue.matchmaking.duelStatus, "completed");
  assert.equal(loserQueue.matchmaking.duelStatus, "completed");
  assert.equal(winnerQueue.matchmaking.rating, 1012);
  assert.equal(loserQueue.matchmaking.rating, 988);

  const completedMatchmakingDuel = await call<{
    status: string;
    duel: {kind: string; outcome: string};
  }>("openFriendDuel", {duelId: matchmakingDuelId}, auth.idToken);
  assert.equal(completedMatchmakingDuel.status, "completed");
  assert.equal(completedMatchmakingDuel.duel.kind, "matchmaking");
  assert.equal(completedMatchmakingDuel.duel.outcome, "win");

  let duplicateMatchmakingDuelBlocked = false;
  try {
    await call(
      "submitFriendDuel",
      {duelId: matchmakingDuelId, answers: []},
      auth.idToken,
    );
  } catch (error) {
    duplicateMatchmakingDuelBlocked = error instanceof Error &&
      error.message.includes("FAILED_PRECONDITION");
  }
  assert.equal(duplicateMatchmakingDuelBlocked, true);

  const rematchQueue = await call<{matchmaking: MatchmakingState}>(
    "joinMatchmaking",
    {},
    auth.idToken,
  );
  assert.equal(rematchQueue.matchmaking.status, "waiting");
  assert.equal(rematchQueue.matchmaking.rating, 1012);
  await call("leaveMatchmaking", {}, auth.idToken);

  const madridAuth = await createAnonymousAuth();
  await call(
    "bootstrapGuestProfile",
    {
      oppositionId: "firefighters_es",
      oppositionName: "Bomberos",
      territory: {
        label: "Comunidad de Madrid",
        country: "ES",
        autonomousCommunity: "Madrid",
      },
    },
    madridAuth.idToken,
  );

  let groupWithoutPublicUsernameBlocked = false;
  try {
    await call("createStudyGroup", {name: "Grupo sin identidad"}, madridAuth.idToken);
  } catch (error) {
    groupWithoutPublicUsernameBlocked = error instanceof Error &&
      error.message.includes("FAILED_PRECONDITION");
  }
  assert.equal(groupWithoutPublicUsernameBlocked, true);
  await call("setPublicUsername", {username: "MadridZero"}, madridAuth.idToken);

  type StudyGroup = {
    id: string;
    name: string;
    joinCode: string;
    memberCount: number;
    viewerRole: "owner" | "admin" | "member";
  };
  type StudyGroupDetail = StudyGroup & {
    members: Array<{
      uid: string;
      username: string;
      score: number;
      position: number;
      role: "owner" | "admin" | "member";
    }>;
    competition: null | {
      id: string;
      metric: string;
      status: string;
      entries: Array<{uid: string; score: number; position: number}>;
    };
  };

  const createdGroup = await call<{group: StudyGroup}>(
    "createStudyGroup",
    {name: "  Bomberos   Cartagena 2027  "},
    auth.idToken,
  );
  assert.equal(createdGroup.group.name, "Bomberos Cartagena 2027");
  assert.equal(createdGroup.group.joinCode.length, 8);
  assert.equal(createdGroup.group.memberCount, 1);
  assert.equal(createdGroup.group.viewerRole, "owner");

  const ownerGroups = await call<{groups: StudyGroup[]}>("getStudyGroups", {}, auth.idToken);
  assert.equal(ownerGroups.groups.length, 1);
  assert.equal(ownerGroups.groups[0].id, createdGroup.group.id);

  const createdCompetition = await call<{groupId: string; competitionId: string}>(
    "createStudyGroupCompetition",
    {
      groupId: createdGroup.group.id,
      name: "Reto de precisión",
      metric: "correct",
      durationDays: 7,
    },
    auth.idToken,
  );
  assert.equal(createdCompetition.groupId, createdGroup.group.id);
  assert.ok(createdCompetition.competitionId);
  const competitionBeforeActivity = await call<{group: StudyGroupDetail}>(
    "getStudyGroup",
    {groupId: createdGroup.group.id},
    auth.idToken,
  );
  assert.equal(competitionBeforeActivity.group.competition?.metric, "correct");
  assert.equal(competitionBeforeActivity.group.competition?.entries[0].score, 0);

  let duplicateCompetitionBlocked = false;
  try {
    await call(
      "createStudyGroupCompetition",
      {
        groupId: createdGroup.group.id,
        name: "Segundo reto",
        metric: "xp",
        durationDays: 14,
      },
      auth.idToken,
    );
  } catch (error) {
    duplicateCompetitionBlocked = error instanceof Error && error.message.includes("ALREADY_EXISTS");
  }
  assert.equal(duplicateCompetitionBlocked, true);

  const competitionQuiz = await call<{
    sessionId: string;
    questions: Array<{id: string}>;
  }>("startQuickQuiz", {questionCount: 10}, auth.idToken);
  await call(
    "submitQuizSession",
    {
      sessionId: competitionQuiz.sessionId,
      answers: competitionQuiz.questions.map((question) => ({
        questionId: question.id,
        selectedAnswerId: answersByQuestion.get(question.id),
      })),
    },
    auth.idToken,
  );

  let competitionAfterActivity: StudyGroupDetail | null = null;
  for (let attempt = 0; attempt < 30; attempt++) {
    const detail = await call<{group: StudyGroupDetail}>(
      "getStudyGroup",
      {groupId: createdGroup.group.id},
      auth.idToken,
    );
    if (detail.group.competition?.entries[0]?.score === 10) {
      competitionAfterActivity = detail.group;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  assert.ok(competitionAfterActivity);
  assert.equal(competitionAfterActivity.competition?.entries[0].position, 1);

  const joinedGroup = await call<{group: StudyGroup}>(
    "joinStudyGroup",
    {
      code: `${createdGroup.group.joinCode.slice(0, 4)}-${
        createdGroup.group.joinCode.slice(4).toLowerCase()
      }`,
    },
    friendAuth.idToken,
  );
  assert.equal(joinedGroup.group.id, createdGroup.group.id);
  assert.equal(joinedGroup.group.memberCount, 2);
  assert.equal(joinedGroup.group.viewerRole, "member");

  let memberCompetitionBlocked = false;
  try {
    await call(
      "createStudyGroupCompetition",
      {
        groupId: createdGroup.group.id,
        name: "Reto no autorizado",
        metric: "duels",
        durationDays: 7,
      },
      friendAuth.idToken,
    );
  } catch (error) {
    memberCompetitionBlocked = error instanceof Error && error.message.includes("PERMISSION_DENIED");
  }
  assert.equal(memberCompetitionBlocked, true);

  const repeatedJoin = await call<{group: StudyGroup}>(
    "joinStudyGroup",
    {code: createdGroup.group.joinCode},
    friendAuth.idToken,
  );
  assert.equal(repeatedJoin.group.memberCount, 2);

  const groupDetail = await call<{group: StudyGroupDetail}>(
    "getStudyGroup",
    {groupId: createdGroup.group.id},
    auth.idToken,
  );
  assert.equal(groupDetail.group.members.length, 2);
  assert.equal(groupDetail.group.members[0].uid, auth.localId);
  assert.equal(groupDetail.group.members[0].username, "HaroldCT");
  assert.equal(groupDetail.group.members[0].position, 1);
  assert.equal(groupDetail.group.competition?.entries.length, 2);
  assert.equal(
    groupDetail.group.competition?.entries.find((entry) => entry.uid === friendAuth.localId)?.score,
    0,
  );
  assert.equal(
    groupDetail.group.members.some((member) => member.uid === friendAuth.localId),
    true,
  );

  let nonMemberGroupBlocked = false;
  try {
    await call("getStudyGroup", {groupId: createdGroup.group.id}, madridAuth.idToken);
  } catch (error) {
    nonMemberGroupBlocked = error instanceof Error && error.message.includes("PERMISSION_DENIED");
  }
  assert.equal(nonMemberGroupBlocked, true);

  let ownerLeaveBlocked = false;
  try {
    await call("leaveStudyGroup", {groupId: createdGroup.group.id}, auth.idToken);
  } catch (error) {
    ownerLeaveBlocked = error instanceof Error && error.message.includes("FAILED_PRECONDITION");
  }
  assert.equal(ownerLeaveBlocked, true);

  await call("leaveStudyGroup", {groupId: createdGroup.group.id}, friendAuth.idToken);
  const ownerOnlyGroup = await call<{group: StudyGroupDetail}>(
    "getStudyGroup",
    {groupId: createdGroup.group.id},
    auth.idToken,
  );
  assert.equal(ownerOnlyGroup.group.memberCount, 1);
  assert.equal(ownerOnlyGroup.group.members.length, 1);
  await call("leaveStudyGroup", {groupId: createdGroup.group.id}, auth.idToken);
  const groupsAfterDeletion = await call<{groups: StudyGroup[]}>(
    "getStudyGroups",
    {},
    auth.idToken,
  );
  assert.equal(groupsAfterDeletion.groups.length, 0);

  let deletedGroupMissing = false;
  try {
    await call("getStudyGroup", {groupId: createdGroup.group.id}, auth.idToken);
  } catch (error) {
    deletedGroupMissing = error instanceof Error && error.message.includes("NOT_FOUND");
  }
  assert.equal(deletedGroupMissing, true);

  type AvatarInventory = {
    ownedItemIds: string[];
    equipped: Record<string, string>;
    coins: number;
    gems: number;
  };
  const avatarBeforePurchase = await call<{inventory: AvatarInventory}>(
    "getAvatarShop",
    {},
    auth.idToken,
  );
  assert.equal(avatarBeforePurchase.inventory.ownedItemIds.includes("base_rookie"), true);
  assert.equal(avatarBeforePurchase.inventory.equipped.base, "base_rookie");
  assert.equal(avatarBeforePurchase.inventory.coins >= 25, true);

  const purchasedAvatarItem = await call<{
    inventory: AvatarInventory;
    idempotent: boolean;
  }>("purchaseAvatarItem", {itemId: "background_sky"}, auth.idToken);
  assert.equal(purchasedAvatarItem.idempotent, false);
  assert.equal(purchasedAvatarItem.inventory.ownedItemIds.includes("background_sky"), true);
  assert.equal(
    purchasedAvatarItem.inventory.coins,
    avatarBeforePurchase.inventory.coins - 25,
  );

  const repeatedAvatarPurchase = await call<{
    inventory: AvatarInventory;
    idempotent: boolean;
  }>("purchaseAvatarItem", {itemId: "background_sky"}, auth.idToken);
  assert.equal(repeatedAvatarPurchase.idempotent, true);
  assert.equal(repeatedAvatarPurchase.inventory.coins, purchasedAvatarItem.inventory.coins);

  const equippedAvatarItem = await call<{inventory: AvatarInventory}>(
    "equipAvatarItem",
    {itemId: "background_sky"},
    auth.idToken,
  );
  assert.equal(equippedAvatarItem.inventory.equipped.background, "background_sky");

  let unownedAvatarItemBlocked = false;
  try {
    await call("equipAvatarItem", {itemId: "background_sunset"}, auth.idToken);
  } catch (error) {
    unownedAvatarItemBlocked = error instanceof Error && error.message.includes("PERMISSION_DENIED");
  }
  assert.equal(unownedAvatarItemBlocked, true);

  type RankingSnapshot = {
    scope: string;
    territoryLabel: string | null;
    entries: Array<{
      uid: string;
      username: string;
      score: number;
      position: number;
      isViewer: boolean;
    }>;
    viewer: {uid: string; position: number; isViewer: boolean} | null;
  };
  const globalRanking = await call<RankingSnapshot>(
    "getRanking",
    {scope: "global"},
    auth.idToken,
  );
  assert.equal(globalRanking.entries.length, 3);
  assert.equal(globalRanking.entries[0].uid, auth.localId);
  assert.equal(globalRanking.viewer?.position, 1);
  assert.equal(globalRanking.viewer?.isViewer, true);
  assert.equal(globalRanking.entries.at(-1)?.username, "MadridZero");

  const territoryRanking = await call<RankingSnapshot>(
    "getRanking",
    {scope: "territory"},
    auth.idToken,
  );
  assert.equal(territoryRanking.territoryLabel, "Bomberos Cartagena");
  assert.equal(territoryRanking.entries.length, 1);
  assert.equal(
    territoryRanking.entries.some((entry) => entry.uid === madridAuth.localId),
    false,
  );
  const regionalRanking = await call<RankingSnapshot>(
    "getRanking",
    {scope: "territory"},
    friendAuth.idToken,
  );
  assert.equal(regionalRanking.territoryLabel, "Región de Murcia");
  assert.equal(regionalRanking.entries.length, 2);
  assert.equal(regionalRanking.entries.some((entry) => entry.uid === auth.localId), true);
  assert.equal(regionalRanking.entries.some((entry) => entry.uid === madridAuth.localId), false);

  const friendsRanking = await call<RankingSnapshot>(
    "getRanking",
    {scope: "friends"},
    auth.idToken,
  );
  assert.equal(friendsRanking.entries.length, 2);
  assert.equal(friendsRanking.entries.some((entry) => entry.uid === friendAuth.localId), true);

  const socialWithActivity = await call<SocialOverview>(
    "getSocialOverview",
    {},
    auth.idToken,
  );
  const liveFriend = socialWithActivity.friends.find((friend) => friend.uid === friendAuth.localId);
  assert.ok(liveFriend);
  assert.equal(liveFriend.sharedStreak, 1);
  assert.equal(liveFriend.viewerActiveToday, true);
  assert.equal(liveFriend.activeToday, true);
  assert.equal(socialWithActivity.activity.length <= 20, true);
  assert.equal(
    socialWithActivity.activity.some((activity) =>
      activity.actor.uid === friendAuth.localId && activity.type === "duel_completed"),
    true,
  );

  await call("removeFriend", {friendUid: friendAuth.localId}, auth.idToken);
  const afterRemoval = await call<SocialOverview>("getSocialOverview", {}, auth.idToken);
  assert.equal(afterRemoval.friends.length, 0);
  assert.equal(afterRemoval.activity.length, 0);
  const friendsRankingAfterRemoval = await call<RankingSnapshot>(
    "getRanking",
    {scope: "friends"},
    auth.idToken,
  );
  assert.equal(friendsRankingAfterRemoval.entries.length, 1);
  assert.equal(friendsRankingAfterRemoval.entries[0].uid, auth.localId);

  const savedReview = await call<{question: ReviewQuestion & {status: string; verified: boolean}}>(
    "reviewQuestion",
    {
      questionId: importedForReview.id,
      decision: "save",
      question: {
        ...importedForReview,
        explanation: "Human-reviewed explanation kept pending before publication.",
      },
    },
    auth.idToken,
  );
  assert.equal(savedReview.question.status, "pending_review");
  assert.equal(savedReview.question.verified, false);
  assert.equal(
    savedReview.question.explanation,
    "Human-reviewed explanation kept pending before publication.",
  );

  const publishedReview = await call<{question: ReviewQuestion & {status: string; verified: boolean}}>(
    "reviewQuestion",
    {
      questionId: importedForReview.id,
      decision: "publish",
      question: savedReview.question,
    },
    auth.idToken,
  );
  assert.equal(publishedReview.question.status, "published");
  assert.equal(publishedReview.question.verified, true);
  const finalReviewQueue = await call<{questions: ReviewQuestion[]}>(
    "getQuestionReviewQueue",
    {},
    auth.idToken,
  );
  assert.equal(
    finalReviewQueue.questions.some((question) => question.id === importedForReview.id),
    false,
  );

  const bulkQuestions = [
    {id: "bulk-review-smoke-1", statement: "Bulk review smoke question one?"},
    {id: "bulk-review-smoke-2", statement: "Bulk review smoke question two?"},
    {id: "bulk-review-smoke-3", statement: "Bulk review smoke question three?"},
  ].map(({id, statement}) => ({
    ...importPayload.questions[0],
    id,
    statement,
  }));
  const bulkImport = await call<{importedCount: number}>(
    "importQuestionBatch",
    {batchId: "smoke-bulk-review", questions: bulkQuestions},
    auth.idToken,
  );
  assert.equal(bulkImport.importedCount, 3);
  const bulkPublished = await call<{
    decision: string;
    reviewedCount: number;
    questionIds: string[];
  }>(
    "bulkReviewQuestions",
    {questionIds: ["bulk-review-smoke-1", "bulk-review-smoke-2"], decision: "publish"},
    auth.idToken,
  );
  assert.equal(bulkPublished.decision, "publish");
  assert.equal(bulkPublished.reviewedCount, 2);
  const bulkDisabled = await call<typeof bulkPublished>(
    "bulkReviewQuestions",
    {questionIds: ["bulk-review-smoke-3"], decision: "disable"},
    auth.idToken,
  );
  assert.equal(bulkDisabled.decision, "disable");
  assert.equal(bulkDisabled.reviewedCount, 1);
  const afterBulkReview = await call<{questions: ReviewQuestion[]}>(
    "getQuestionReviewQueue",
    {},
    auth.idToken,
  );
  assert.equal(
    afterBulkReview.questions.some((question) => question.id.startsWith("bulk-review-smoke-")),
    false,
  );

  console.log(JSON.stringify({
    uid: auth.localId,
    quizzesCompleted: 4,
    questionsAnswered: 40,
    correctAnswers: 40,
    finalProgress: submittedDuel.progress,
    duplicateClaimsBlocked: true,
    duelValidated: true,
    duplicateDuelBlocked,
    friendshipRoundTripValidated: true,
    asynchronousFriendDuelValidated: true,
    duplicateFriendDuelBlocked,
    compatibleMatchmakingValidated: true,
    duplicateMatchmakingDuelBlocked,
    serverAuthoritativeRankingsValidated: true,
    sharedFriendStreakValidated: true,
    boundedSocialActivityValidated: true,
    privateStudyGroupsValidated: true,
    groupMembershipPrivacyValidated: true,
    groupWithoutPublicUsernameBlocked,
    temporaryGroupCompetitionValidated: true,
    duplicateCompetitionBlocked,
    memberCompetitionBlocked,
    avatarShopPurchaseValidated: true,
    duplicateAvatarPurchaseProtected: true,
    unownedAvatarItemBlocked,
    monetizationConfigurationValidated: true,
    disruptiveAdsDisabled: true,
    adminQuestionImportValidated: true,
    adminQuestionReviewValidated: true,
    adminBulkReviewValidated: true,
    nonAdminImportBlocked,
    nonAdminReviewBlocked,
    nonAdminBulkReviewBlocked,
    publishedImportBlocked,
    duplicateUsernameBlocked,
  }, null, 2));
}

void main();
