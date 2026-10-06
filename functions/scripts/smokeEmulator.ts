import assert from "node:assert/strict";

import {seedQuestions} from "../../apps/client/src/features/quiz/data/seedQuestions.ts";

const projectId = "opocompit-dev";
const authBaseUrl = "http://127.0.0.1:9099";
const functionsBaseUrl = `http://127.0.0.1:5001/${projectId}/us-central1`;
const firestoreBaseUrl =
  `http://127.0.0.1:8080/v1/projects/${projectId}/databases/(default)/documents`;

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
type MissionState = {
  id: string;
  title: string;
  progress: number;
  target: number;
  claimed: boolean;
};
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

async function linkEmailAuth(idToken: string, email: string, password: string) {
  const response = await fetch(
    `${authBaseUrl}/identitytoolkit.googleapis.com/v1/accounts:update?key=emulator-key`,
    {
      method: "POST",
      headers: {"content-type": "application/json"},
      body: JSON.stringify({idToken, email, password, returnSecureToken: true}),
    },
  );
  const text = await response.text();
  assert.equal(response.ok, true, `Email link failed: ${text}`);
  return JSON.parse(text) as {idToken: string; localId: string};
}

async function signInEmailAuth(email: string, password: string) {
  const response = await fetch(
    `${authBaseUrl}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=emulator-key`,
    {
      method: "POST",
      headers: {"content-type": "application/json"},
      body: JSON.stringify({email, password, returnSecureToken: true}),
    },
  );
  const text = await response.text();
  assert.equal(response.ok, true, `Email sign-in failed: ${text}`);
  return JSON.parse(text) as {idToken: string; localId: string};
}

async function firestoreRequest(
  documentPath: string,
  idToken: string,
  init: RequestInit = {},
): Promise<Response> {
  const encodedPath = documentPath.split("/").map(encodeURIComponent).join("/");
  return fetch(`${firestoreBaseUrl}/${encodedPath}`, {
    ...init,
    headers: {
      authorization: `Bearer ${idToken}`,
      "content-type": "application/json",
      ...init.headers,
    },
  });
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

  const securityProbeAuth = await createAnonymousAuth();
  const ownProfileRead = await firestoreRequest(`users/${auth.localId}`, auth.idToken);
  assert.equal(ownProfileRead.status, 200);
  const privateProfileRead = await firestoreRequest(
    `users/${auth.localId}`,
    securityProbeAuth.idToken,
  );
  assert.equal(privateProfileRead.status, 403);
  const questionBankRead = await firestoreRequest(
    `questions/${seedQuestions[0].id}`,
    auth.idToken,
  );
  assert.equal(questionBankRead.status, 403);
  const directUserWrite = await firestoreRequest(`users/${auth.localId}`, auth.idToken, {
    method: "PATCH",
    body: JSON.stringify({fields: {role: {stringValue: "admin"}}}),
  });
  assert.equal(directUserWrite.status, 403);
  const directQuestionReportWrite = await firestoreRequest(
    "questionReports/direct-client-write",
    auth.idToken,
    {
      method: "PATCH",
      body: JSON.stringify({fields: {status: {stringValue: "open"}}}),
    },
  );
  assert.equal(directQuestionReportWrite.status, 403);

  let anonymousAccountLinkBlocked = false;
  try {
    await call("completeAccountLink", {}, auth.idToken);
  } catch (error) {
    anonymousAccountLinkBlocked = error instanceof Error &&
      error.message.includes("FAILED_PRECONDITION");
  }
  assert.equal(anonymousAccountLinkBlocked, true);

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

  let nonAdminCatalogBlocked = false;
  try {
    await call("getAdminCatalog", {}, auth.idToken);
  } catch (error) {
    nonAdminCatalogBlocked = error instanceof Error && error.message.includes("PERMISSION_DENIED");
  }
  assert.equal(nonAdminCatalogBlocked, true);

  let nonAdminOperationsBlocked = false;
  try {
    await call("getAdminOperations", {}, auth.idToken);
  } catch (error) {
    nonAdminOperationsBlocked = error instanceof Error && error.message.includes("PERMISSION_DENIED");
  }
  assert.equal(nonAdminOperationsBlocked, true);

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
  const adminQuestionRead = await firestoreRequest(
    `questions/${seedQuestions[0].id}`,
    auth.idToken,
  );
  assert.equal(adminQuestionRead.status, 200);
  const initialCatalog = await call<{
    catalog: {
      oppositions: Array<{id: string}>;
      territories: Array<{id: string}>;
      categories: Array<{id: string}>;
      officialExams: Array<{id: string}>;
    };
  }>("getAdminCatalog", {}, auth.idToken);
  assert.equal(initialCatalog.catalog.oppositions.some((item) => item.id === "firefighters_es"), true);
  assert.equal(initialCatalog.catalog.territories.some((item) => item.id === "es_murcia_cartagena"), true);
  assert.equal(initialCatalog.catalog.officialExams.some(
    (item) => item.id === "cartagena_firefighters_2025",
  ), true);
  const savedCategory = await call<{item: {id: string; name: string}}>(
    "upsertAdminCatalogItem",
    {
      kind: "categories",
      id: "smoke_admin_category",
      item: {
        id: "smoke_admin_category",
        oppositionId: "firefighters_es",
        name: "Categoría de prueba administrativa",
        parentId: null,
        active: true,
        priority: 1,
      },
    },
    auth.idToken,
  );
  assert.equal(savedCategory.item.id, "smoke_admin_category");
  type AdminMissionItem = {
    id: string;
    title: string;
    description: string;
    type: string;
    target: number;
    rewardXp: number;
    rewardCoins: number;
    active: boolean;
    priority: number;
  };
  type AdminShopItem = {
    id: string;
    name: string;
    category: string;
    slot: string;
    rarity: string;
    price: number;
    currency: string;
    active: boolean;
    premiumOnly: boolean;
    priority: number;
  };
  const initialOperations = await call<{
    operations: {
      missions: AdminMissionItem[];
      dailyRewards: Array<{id: string}>;
      shopItems: AdminShopItem[];
      subscriptionPlans: Array<{id: string}>;
      appConfig: Array<{id: string}>;
    };
  }>("getAdminOperations", {}, auth.idToken);
  assert.equal(initialOperations.operations.missions.length, 3);
  assert.equal(initialOperations.operations.dailyRewards.length, 7);
  assert.equal(initialOperations.operations.shopItems.length, 22);
  assert.equal(initialOperations.operations.subscriptionPlans.length, 1);
  assert.equal(initialOperations.operations.appConfig.length, 1);

  const configuredMission = initialOperations.operations.missions.find(
    (mission) => mission.id === "daily_complete_quick",
  );
  assert.ok(configuredMission);
  await call(
    "upsertAdminOperationItem",
    {
      kind: "missions",
      id: configuredMission.id,
      item: {...configuredMission, title: "Primera partida configurada"},
    },
    auth.idToken,
  );
  const configuredShopItem = initialOperations.operations.shopItems.find(
    (item) => item.id === "background_sky",
  );
  assert.ok(configuredShopItem);
  await call(
    "upsertAdminOperationItem",
    {
      kind: "shopItems",
      id: configuredShopItem.id,
      item: {...configuredShopItem, price: 26},
    },
    auth.idToken,
  );
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

  const duplicateImportPayload = {
    ...importPayload,
    batchId: "smoke-admin-import-duplicate",
    questions: [{...importPayload.questions[0], id: "admin-import-smoke-duplicate"}],
  };
  await call("importQuestionBatch", duplicateImportPayload, auth.idToken);

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
    duplicates: Array<{id: string; status: string; statement: string}>;
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
  assert.equal(
    importedForReview.duplicates.some((question) => question.id === "admin-import-smoke-duplicate"),
    true,
  );

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
  assert.equal(
    initialEngagement.missions.find((mission) => mission.id === "daily_complete_quick")?.title,
    "Primera partida configurada",
  );

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
  const requestNotifications = await call<{
    items: Array<{id: string; type: string; readAt: string | null}>;
    unreadCount: number;
  }>("getNotifications", {}, friendAuth.idToken);
  const friendRequestNotification = requestNotifications.items.find(
    (item) => item.type === "friend_request",
  );
  assert.ok(friendRequestNotification);
  assert.equal(requestNotifications.unreadCount, 1);
  await call(
    "markNotificationsRead",
    {notificationIds: [friendRequestNotification.id]},
    friendAuth.idToken,
  );
  const readRequestNotifications = await call<{unreadCount: number}>(
    "getNotifications",
    {},
    friendAuth.idToken,
  );
  assert.equal(readRequestNotifications.unreadCount, 0);
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
  const acceptedFriendNotifications = await call<{
    items: Array<{type: string}>;
  }>("getNotifications", {}, auth.idToken);
  assert.equal(
    acceptedFriendNotifications.items.some((item) => item.type === "friend_accepted"),
    true,
  );

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
  const duelInviteNotifications = await call<{
    items: Array<{type: string}>;
  }>("getNotifications", {}, friendAuth.idToken);
  assert.equal(
    duelInviteNotifications.items.some((item) => item.type === "duel_invitation"),
    true,
  );

  const acceptedDuelInvitation = await call<{
    invitation: {duelId: string; status: string};
  }>(
    "respondFriendDuelInvitation",
    {invitationId: sentDuelInvitation.invitation.id, accept: true},
    friendAuth.idToken,
  );
  assert.equal(acceptedDuelInvitation.invitation.status, "active");
  assert.ok(acceptedDuelInvitation.invitation.duelId);
  const acceptedDuelNotifications = await call<{
    items: Array<{type: string}>;
  }>("getNotifications", {}, auth.idToken);
  assert.equal(
    acceptedDuelNotifications.items.some((item) => item.type === "duel_accepted"),
    true,
  );
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
  const [winnerNotifications, loserNotifications] = await Promise.all([
    call<{items: Array<{type: string; body: string}>}>("getNotifications", {}, auth.idToken),
    call<{items: Array<{type: string; body: string}>}>(
      "getNotifications",
      {},
      friendAuth.idToken,
    ),
  ]);
  assert.equal(
    winnerNotifications.items.some((item) =>
      item.type === "duel_result" && item.body.includes("ganado"),
    ),
    true,
  );
  assert.equal(
    loserNotifications.items.some((item) => item.type === "duel_result"),
    true,
  );

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
    items: Array<{id: string; price: number}>;
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
  assert.equal(
    avatarBeforePurchase.inventory.items.find((item) => item.id === "background_sky")?.price,
    26,
  );

  const purchasedAvatarItem = await call<{
    inventory: AvatarInventory;
    idempotent: boolean;
  }>("purchaseAvatarItem", {itemId: "background_sky"}, auth.idToken);
  assert.equal(purchasedAvatarItem.idempotent, false);
  assert.equal(purchasedAvatarItem.inventory.ownedItemIds.includes("background_sky"), true);
  assert.equal(
    purchasedAvatarItem.inventory.coins,
    avatarBeforePurchase.inventory.coins - 26,
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

  let duplicatePublishBlocked = false;
  try {
    await call(
      "reviewQuestion",
      {
        questionId: importedForReview.id,
        decision: "publish",
        question: savedReview.question,
      },
      auth.idToken,
    );
  } catch (error) {
    duplicatePublishBlocked = error instanceof Error && error.message.includes("ALREADY_EXISTS");
  }
  assert.equal(duplicatePublishBlocked, true);
  await call(
    "reviewQuestion",
    {questionId: "admin-import-smoke-duplicate", decision: "disable"},
    auth.idToken,
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

  const examAuth = await createAnonymousAuth();
  await call(
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
      },
    },
    examAuth.idToken,
  );
  const nationwidePractice = await call<{
    questions: Array<{id: string; correctAnswerId?: string}>;
  }>(
    "startCustomQuiz",
    {
      mode: "practice",
      questionCount: 25,
      categoryId: "legislation",
      difficulty: 1,
      territoryMode: "all_spain",
      questionStatus: "all",
    },
    examAuth.idToken,
  );
  assert.equal(nationwidePractice.questions.some((question) => question.id === "q_const_1"), true);
  assert.equal(
    nationwidePractice.questions.some((question) => question.id === "q_madrid_excluded"),
    true,
  );
  assert.equal(
    nationwidePractice.questions.every((question) => question.correctAnswerId === undefined),
    true,
  );

  const simulation = await call<{
    sessionId: string;
    questions: Array<{id: string; correctAnswerId?: string}>;
    customQuiz: {
      actualQuestionCount: number;
      rules: {
        questionCount: number;
        durationSeconds: number;
        incorrectPenalty: number;
      };
    };
  }>(
    "startCustomQuiz",
    {
      mode: "simulation",
      questionCount: 5,
      categoryId: "platform",
      difficulty: 1,
      territoryMode: "profile",
      questionStatus: "new",
    },
    examAuth.idToken,
  );
  assert.equal(simulation.questions.length, 2);
  assert.equal(simulation.customQuiz.actualQuestionCount, 2);
  assert.equal(simulation.customQuiz.rules.questionCount, 2);
  assert.equal(simulation.customQuiz.rules.durationSeconds, 300);
  assert.equal(simulation.customQuiz.rules.incorrectPenalty, 0.33);
  const firstSimulationQuestion = seedQuestions.find(
    (question) => question.id === simulation.questions[0].id,
  );
  const secondSimulationQuestion = seedQuestions.find(
    (question) => question.id === simulation.questions[1].id,
  );
  assert.ok(firstSimulationQuestion);
  assert.ok(secondSimulationQuestion);
  const wrongSimulationAnswer = secondSimulationQuestion.answers.find(
    (answer) => answer.id !== secondSimulationQuestion.correctAnswerId,
  );
  assert.ok(wrongSimulationAnswer);
  const submittedSimulation = await call<{
    result: {correct: number; incorrect: number; points: number; maximumPoints: number};
  }>(
    "submitQuizSession",
    {
      sessionId: simulation.sessionId,
      answers: [
        {
          questionId: firstSimulationQuestion.id,
          selectedAnswerId: firstSimulationQuestion.correctAnswerId,
        },
        {
          questionId: secondSimulationQuestion.id,
          selectedAnswerId: wrongSimulationAnswer.id,
        },
      ],
    },
    examAuth.idToken,
  );
  assert.equal(submittedSimulation.result.correct, 1);
  assert.equal(submittedSimulation.result.incorrect, 1);
  assert.equal(submittedSimulation.result.points, 0.67);
  assert.equal(submittedSimulation.result.maximumPoints, 2);
  const incorrectCustomQuiz = await call<{
    questions: Array<{id: string}>;
  }>(
    "startCustomQuiz",
    {
      mode: "practice",
      questionCount: 5,
      categoryId: "platform",
      difficulty: 1,
      territoryMode: "profile",
      questionStatus: "incorrect",
    },
    examAuth.idToken,
  );
  assert.deepEqual(incorrectCustomQuiz.questions.map((question) => question.id), [
    secondSimulationQuestion.id,
  ]);
  const officialExams = await call<{
    exams: Array<{id: string; rules: {questionCount: number}}>;
  }>("getOfficialExams", {}, examAuth.idToken);
  const demoExam = officialExams.exams.find(
    (exam) => exam.id === "cartagena_firefighters_2025",
  );
  assert.ok(demoExam);
  assert.equal(demoExam.rules.questionCount, seedQuestions.length);
  const startedExam = await call<{
    sessionId: string;
    questions: Array<{id: string; correctAnswerId?: string}>;
  }>("startOfficialExam", {examId: demoExam.id}, examAuth.idToken);
  assert.equal(startedExam.questions.length, seedQuestions.length);
  assert.equal(startedExam.questions.every((question) => question.correctAnswerId === undefined), true);
  const firstQuestion = seedQuestions.find((question) => question.id === startedExam.questions[0].id);
  const secondQuestion = seedQuestions.find((question) => question.id === startedExam.questions[1].id);
  assert.ok(firstQuestion);
  assert.ok(secondQuestion);
  const incorrectAnswer = secondQuestion.answers.find(
    (answer) => answer.id !== secondQuestion.correctAnswerId,
  );
  assert.ok(incorrectAnswer);
  const submittedExam = await call<{
    result: {correct: number; incorrect: number; blank: number; points: number; maximumPoints: number};
  }>(
    "submitQuizSession",
    {
      sessionId: startedExam.sessionId,
      answers: [
        {questionId: firstQuestion.id, selectedAnswerId: firstQuestion.correctAnswerId},
        {questionId: secondQuestion.id, selectedAnswerId: incorrectAnswer.id},
      ],
    },
    examAuth.idToken,
  );
  assert.equal(submittedExam.result.correct, 1);
  assert.equal(submittedExam.result.incorrect, 1);
  assert.equal(submittedExam.result.blank, seedQuestions.length - 2);
  assert.equal(submittedExam.result.points, 0.67);
  assert.equal(submittedExam.result.maximumPoints, seedQuestions.length);

  type ErrorReviewItem = {
    question: {id: string; categoryId: string; correctAnswerId?: string};
    stat: {needsReview: boolean};
  };
  const initialErrorReview = await call<{items: ErrorReviewItem[]}>(
    "getErrorReview",
    {},
    examAuth.idToken,
  );
  const initialErrorCount = initialErrorReview.items.length;
  assert.ok(initialErrorCount > 0);
  assert.equal(initialErrorReview.items.every((item) => item.stat.needsReview), true);
  assert.equal(
    initialErrorReview.items.every((item) => item.question.correctAnswerId === undefined),
    true,
  );
  const learningInsights = await call<{
    categories: Array<{
      categoryId: string;
      timesSeen: number;
      pendingReviewCount: number;
      accuracy: number;
    }>;
    strongestCategory: {categoryId: string} | null;
    weakestCategory: {categoryId: string} | null;
    totalSeen: number;
    correctCount: number;
    accuracy: number;
  }>("getLearningInsights", {}, examAuth.idToken);
  assert.ok(learningInsights.categories.length > 1);
  assert.ok(learningInsights.totalSeen >= seedQuestions.length);
  assert.ok(learningInsights.correctCount > 0);
  assert.ok(learningInsights.strongestCategory);
  assert.ok(learningInsights.weakestCategory);
  assert.equal(
    learningInsights.categories.every((category) =>
      category.timesSeen > 0 && category.accuracy >= 0 && category.accuracy <= 1,
    ),
    true,
  );

  const selectedReviewCategory = initialErrorReview.items[0].question.categoryId;
  const firstErrorReview = await call<{
    sessionId: string;
    questions: Array<{id: string; categoryId: string; correctAnswerId?: string}>;
  }>("startErrorReview", {
    questionCount: 10,
    categoryId: selectedReviewCategory,
  }, examAuth.idToken);
  assert.ok(firstErrorReview.questions.length > 0);
  assert.equal(
    firstErrorReview.questions.every((question) => question.categoryId === selectedReviewCategory),
    true,
  );
  assert.equal(firstErrorReview.questions.every(
    (question) => question.correctAnswerId === undefined,
  ), true);
  await call(
    "submitQuizSession",
    {
      sessionId: firstErrorReview.sessionId,
      answers: firstErrorReview.questions.map((question) => ({
        questionId: question.id,
        selectedAnswerId: answersByQuestion.get(question.id),
      })),
    },
    examAuth.idToken,
  );
  const remainingErrorReview = await call<{items: ErrorReviewItem[]}>(
    "getErrorReview",
    {},
    examAuth.idToken,
  );
  assert.equal(
    remainingErrorReview.items.length,
    initialErrorCount - firstErrorReview.questions.length,
  );

  if (remainingErrorReview.items.length > 0) {
    const finalErrorReview = await call<{
      sessionId: string;
      questions: Array<{id: string}>;
    }>("startErrorReview", {questionCount: 10}, examAuth.idToken);
    await call(
      "submitQuizSession",
      {
        sessionId: finalErrorReview.sessionId,
        answers: finalErrorReview.questions.map((question) => ({
          questionId: question.id,
          selectedAnswerId: answersByQuestion.get(question.id),
        })),
      },
      examAuth.idToken,
    );
  }
  const masteredErrorReview = await call<{items: ErrorReviewItem[]}>(
    "getErrorReview",
    {},
    examAuth.idToken,
  );
  assert.equal(masteredErrorReview.items.length, 0);

  const profileBeforeLink = await call<{
    profile: Progress & {
      uid: string;
      isGuest: boolean;
      totalQuestions: number;
      testsCompleted: number;
    };
  }>("getCurrentProfile", {}, auth.idToken);
  assert.equal(profileBeforeLink.profile.isGuest, true);

  const accountEmail = `${auth.localId.toLowerCase()}@opocompit.test`;
  const accountPassword = "SmokePassword123!";
  const linkedAuth = await linkEmailAuth(auth.idToken, accountEmail, accountPassword);
  assert.equal(linkedAuth.localId, auth.localId);
  const linkedAccount = await call<{profile: Progress & {uid: string; isGuest: boolean}}>(
    "completeAccountLink",
    {},
    linkedAuth.idToken,
  );
  assert.equal(linkedAccount.profile.uid, auth.localId);
  assert.equal(linkedAccount.profile.isGuest, false);
  assert.equal(linkedAccount.profile.xp, profileBeforeLink.profile.xp);
  assert.equal(linkedAccount.profile.coins, profileBeforeLink.profile.coins);
  assert.equal(linkedAccount.profile.totalQuestions, profileBeforeLink.profile.totalQuestions);
  assert.equal(linkedAccount.profile.testsCompleted, profileBeforeLink.profile.testsCompleted);

  const signedInAuth = await signInEmailAuth(accountEmail, accountPassword);
  assert.equal(signedInAuth.localId, auth.localId);
  const restoredAccount = await call<{
    profile: Progress & {uid: string; isGuest: boolean; username: string};
  }>(
    "getCurrentProfile",
    {},
    signedInAuth.idToken,
  );
  assert.equal(restoredAccount.profile.uid, auth.localId);
  assert.equal(restoredAccount.profile.isGuest, false);
  assert.equal(restoredAccount.profile.xp, linkedAccount.profile.xp);
  assert.equal(restoredAccount.profile.coins, linkedAccount.profile.coins);
  await call("bootstrapEmulatorAdmin", {}, signedInAuth.idToken);
  const adminAccount = await call<{
    profile: Progress & {uid: string; isGuest: boolean; username: string};
  }>("getCurrentProfile", {}, signedInAuth.idToken);
  assert.equal(adminAccount.profile.isGuest, false);
  assert.equal(adminAccount.profile.username, restoredAccount.profile.username);

  const firstAchievementOverview = await call<{
    achievements: {
      items: Array<{id: string; unlocked: boolean; progress: number; target: number}>;
      unlockedCount: number;
      totalCount: number;
      newlyUnlockedIds: string[];
    };
    progress: Progress;
  }>("getAchievements", {}, signedInAuth.idToken);
  assert.ok(firstAchievementOverview.achievements.totalCount >= 8);
  assert.ok(firstAchievementOverview.achievements.unlockedCount >= 2);
  assert.equal(
    firstAchievementOverview.achievements.items.find((item) => item.id === "first_quiz")?.unlocked,
    true,
  );
  assert.equal(
    firstAchievementOverview.achievements.items.find((item) => item.id === "perfect_quiz")?.unlocked,
    true,
  );
  assert.ok(firstAchievementOverview.achievements.newlyUnlockedIds.includes("first_quiz"));
  assert.ok(firstAchievementOverview.progress.xp > restoredAccount.profile.xp);
  assert.ok(firstAchievementOverview.progress.coins > restoredAccount.profile.coins);
  assert.ok(firstAchievementOverview.progress.gems > restoredAccount.profile.gems);

  const repeatedAchievementOverview = await call<{
    achievements: {newlyUnlockedIds: string[]};
    progress: Progress;
  }>("getAchievements", {}, signedInAuth.idToken);
  assert.deepEqual(repeatedAchievementOverview.achievements.newlyUnlockedIds, []);
  assert.equal(repeatedAchievementOverview.progress.xp, firstAchievementOverview.progress.xp);
  assert.equal(repeatedAchievementOverview.progress.coins, firstAchievementOverview.progress.coins);
  assert.equal(repeatedAchievementOverview.progress.gems, firstAchievementOverview.progress.gems);
  const achievementNotifications = await call<{
    items: Array<{type: string; route: string}>;
  }>("getNotifications", {}, signedInAuth.idToken);
  assert.equal(
    achievementNotifications.items.some((item) =>
      item.type === "achievement" && item.route === "/achievements",
    ),
    true,
  );

  const reportTargetId = "q_madrid_excluded";
  const createdReport = await call<{
    reportId: string;
    status: string;
    idempotent: boolean;
  }>(
    "reportQuestion",
    {
      questionId: reportTargetId,
      reason: "outdated",
      detail: "Smoke test for historical content retirement.",
    },
    examAuth.idToken,
  );
  assert.equal(createdReport.status, "open");
  assert.equal(createdReport.idempotent, false);
  const repeatedReport = await call<typeof createdReport>(
    "reportQuestion",
    {
      questionId: reportTargetId,
      reason: "outdated",
      detail: "Updated context without creating another report.",
    },
    examAuth.idToken,
  );
  assert.equal(repeatedReport.reportId, createdReport.reportId);
  assert.equal(repeatedReport.idempotent, true);

  let nonAdminReportQueueBlocked = false;
  try {
    await call("getQuestionReportsQueue", {}, examAuth.idToken);
  } catch (error) {
    nonAdminReportQueueBlocked = error instanceof Error &&
      error.message.includes("PERMISSION_DENIED");
  }
  assert.equal(nonAdminReportQueueBlocked, true);
  const reportQueue = await call<{
    reports: Array<{id: string; questionId: string; reason: string}>;
  }>("getQuestionReportsQueue", {}, auth.idToken);
  assert.equal(reportQueue.reports.some((report) =>
    report.id === createdReport.reportId &&
    report.questionId === reportTargetId &&
    report.reason === "outdated",
  ), true);
  const privateReportRead = await firestoreRequest(
    `questionReports/${createdReport.reportId}`,
    examAuth.idToken,
  );
  assert.equal(privateReportRead.status, 403);
  const adminReportRead = await firestoreRequest(
    `questionReports/${createdReport.reportId}`,
    auth.idToken,
  );
  assert.equal(adminReportRead.status, 200);
  await call(
    "resolveQuestionReport",
    {reportId: createdReport.reportId, resolution: "mark_outdated"},
    auth.idToken,
  );
  const currentPracticeAfterReport = await call<{
    questions: Array<{id: string}>;
  }>(
    "startCustomQuiz",
    {
      mode: "practice",
      questionCount: 25,
      categoryId: "legislation",
      difficulty: 1,
      territoryMode: "all_spain",
      questionStatus: "all",
    },
    examAuth.idToken,
  );
  assert.equal(
    currentPracticeAfterReport.questions.some((question) => question.id === reportTargetId),
    false,
  );
  const historicalExamAfterReport = await call<{
    questions: Array<{id: string}>;
  }>("startOfficialExam", {examId: demoExam.id}, examAuth.idToken);
  assert.equal(
    historicalExamAfterReport.questions.some((question) => question.id === reportTargetId),
    true,
  );

  const deletionOwner = await createAnonymousAuth();
  const deletionSurvivor = await createAnonymousAuth();
  for (const account of [deletionOwner, deletionSurvivor]) {
    await call(
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
        },
      },
      account.idToken,
    );
  }
  const defaultPreferences = await call<{
    preferences: {analyticsEnabled: boolean; hapticsEnabled: boolean};
  }>("getUserPreferences", {}, deletionOwner.idToken);
  assert.equal(defaultPreferences.preferences.analyticsEnabled, false);
  assert.equal(defaultPreferences.preferences.hapticsEnabled, true);
  const updatedPreferences = await call<{
    preferences: {analyticsEnabled: boolean; hapticsEnabled: boolean};
  }>(
    "updateUserPreferences",
    {preferences: {analyticsEnabled: true, hapticsEnabled: false}},
    deletionOwner.idToken,
  );
  assert.equal(updatedPreferences.preferences.analyticsEnabled, true);
  assert.equal(updatedPreferences.preferences.hapticsEnabled, false);
  await call("setPublicUsername", {username: "DeleteOwner"}, deletionOwner.idToken);
  await call("setPublicUsername", {username: "KeepMember"}, deletionSurvivor.idToken);
  await call(
    "updateUserPreferences",
    {preferences: {socialNotificationsEnabled: false}},
    deletionSurvivor.idToken,
  );
  const deletionGroup = await call<{
    group: {id: string; joinCode: string; viewerRole: string};
  }>("createStudyGroup", {name: "Grupo que continúa"}, deletionOwner.idToken);
  await call(
    "joinStudyGroup",
    {code: deletionGroup.group.joinCode},
    deletionSurvivor.idToken,
  );
  await call(
    "sendFriendRequest",
    {targetUid: deletionSurvivor.localId},
    deletionOwner.idToken,
  );
  const filteredNotifications = await call<{
    items: Array<{type: string}>;
  }>("getNotifications", {}, deletionSurvivor.idToken);
  assert.equal(
    filteredNotifications.items.some((notification) => notification.type === "friend_request"),
    false,
  );
  const linkedDeletionOwner = await linkEmailAuth(
    deletionOwner.idToken,
    "delete-owner@opocompit.test",
    "Delete123!",
  );
  await call("completeAccountLink", {}, linkedDeletionOwner.idToken);
  let invalidDeletionConfirmationBlocked = false;
  try {
    await call("deleteCurrentAccount", {confirmation: "BORRAR"}, linkedDeletionOwner.idToken);
  } catch (error) {
    invalidDeletionConfirmationBlocked = error instanceof Error &&
      error.message.includes("INVALID_ARGUMENT");
  }
  assert.equal(invalidDeletionConfirmationBlocked, true);
  await call("deleteCurrentAccount", {confirmation: "ELIMINAR"}, linkedDeletionOwner.idToken);

  const deletedProfileRead = await firestoreRequest(
    `users/${deletionOwner.localId}`,
    auth.idToken,
  );
  assert.equal(deletedProfileRead.status, 404);
  let deletedLoginBlocked = false;
  try {
    await signInEmailAuth("delete-owner@opocompit.test", "Delete123!");
  } catch {
    deletedLoginBlocked = true;
  }
  assert.equal(deletedLoginBlocked, true);
  const survivingGroup = await call<{
    group: {viewerRole: string; memberCount: number; members: Array<{uid: string}>};
  }>("getStudyGroup", {groupId: deletionGroup.group.id}, deletionSurvivor.idToken);
  assert.equal(survivingGroup.group.viewerRole, "owner");
  assert.equal(survivingGroup.group.memberCount, 1);
  assert.deepEqual(
    survivingGroup.group.members.map((member) => member.uid),
    [deletionSurvivor.localId],
  );
  const survivingSocial = await call<SocialOverview>(
    "getSocialOverview",
    {},
    deletionSurvivor.idToken,
  );
  assert.equal(survivingSocial.incomingRequests.length, 0);

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
    adminCatalogValidated: true,
    adminOperationsValidated: true,
    customQuizFlowValidated: true,
    learningInsightsValidated: true,
    achievementsValidated: true,
    duplicateAchievementRewardsBlocked: true,
    internalNotificationsValidated: true,
    notificationReadStateValidated: true,
    questionReportsValidated: true,
    reportDeduplicationValidated: true,
    historicalQuestionValidityValidated: true,
    userPreferencesValidated: true,
    analyticsConsentDefaultValidated: true,
    disabledNotificationCategoryFiltered: true,
    invalidDeletionConfirmationBlocked,
    accountDeletionValidated: true,
    deletedAuthenticationBlocked: true,
    deletedOwnerGroupTransferred: true,
    deletedSocialRelationshipsRemoved: true,
    officialExamFlowValidated: true,
    errorReviewFlowValidated: true,
    runtimeConfigurationValidated: true,
    firestoreRulesValidated: true,
    directUserWriteBlocked: true,
    directQuestionReportWriteBlocked: true,
    privateProfileReadBlocked: true,
    privateQuestionReportReadBlocked: true,
    questionBankReadBlocked: true,
    adminQuestionReadValidated: true,
    anonymousAccountLinkBlocked,
    guestAccountConversionValidated: true,
    returningEmailLoginValidated: true,
    linkedProgressPreserved: true,
    emulatorAdminIdentityPreserved: true,
    duplicateQuestionDetectionValidated: true,
    duplicatePublishBlocked,
    nonAdminImportBlocked,
    nonAdminReviewBlocked,
    nonAdminBulkReviewBlocked,
    nonAdminCatalogBlocked,
    nonAdminOperationsBlocked,
    nonAdminReportQueueBlocked,
    publishedImportBlocked,
    duplicateUsernameBlocked,
  }, null, 2));
}

void main();
