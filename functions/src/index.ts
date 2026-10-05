import {initializeApp} from "firebase-admin/app";
import {createHash, randomBytes} from "node:crypto";
import {env} from "node:process";
import {
  DocumentReference,
  DocumentSnapshot,
  Timestamp,
  getFirestore,
} from "firebase-admin/firestore";
import {HttpsError, onCall} from "firebase-functions/v2/https";
import {onDocumentWritten} from "firebase-functions/v2/firestore";

import {
  AdminCatalogItem,
  AdminCatalogKind,
  AdminCatalogValidationError,
  OfficialExamCatalogItem,
  isAdminCatalogKind,
  parseAdminCatalogItem,
} from "./adminCatalog.js";
import {officialExamScore, OfficialExamRules} from "./officialExam.js";
import {
  AdminDailyReward,
  AdminMission,
  AdminOperationItem,
  AdminOperationKind,
  AdminOperationValidationError,
  AdminShopItem,
  isAdminOperationKind,
  parseAdminOperationItem,
} from "./adminOperations.js";
import {
  AdminImportValidationError,
  ImportedQuestion,
  parseQuestionBatch,
} from "./adminImport.js";
import {
  avatarItemById,
  AvatarShopItem,
  AvatarLoadout,
  avatarShopCatalog,
  balanceAfterAvatarPurchase,
  defaultAvatarLoadout,
  normalizeAvatarLoadout,
  starterAvatarItemIds,
} from "./avatarShop.js";
import {
  dailyMissionTemplates,
  dailyRewardFor,
  DailyRewardTemplate,
  defaultDailyRewards,
  madridDay,
  missionDocumentId,
  missionProgressIncrement,
  MissionTemplate,
} from "./engagement.js";
import {duelOutcome, trainingOpponent} from "./duel.js";
import {
  commonTerritoryKeys,
  friendDuelViewStatus,
  oppositeOutcome,
} from "./friendDuel.js";
import {
  matchmakingRange,
  normalizedRating,
  ratingsAreCompatible,
  updatedRatings,
} from "./matchmaking.js";
import {
  parseSubscriptionPlan,
  subscriptionEntitlement,
} from "./monetization.js";
import {mostSpecificTerritoryKey, rankEntries} from "./ranking.js";
import {isValidUsername, socialEdgeId, usernameKey} from "./social.js";
import {sharedStreak, StreakProfile} from "./socialActivity.js";
import {
  competitionMetricDelta,
  groupCodeFromBytes,
  normalizeCompetitionMetric,
  normalizeGroupCode,
  normalizeGroupName,
  StudyActivityTotals,
  StudyGroupCompetitionMetric,
} from "./studyGroups.js";

initializeApp();

const db = getFirestore();
const maxQuickQuestionCount = 25;
const maxSessionQuestionCount = 100;
const sessionLifetimeMs = 24 * 60 * 60 * 1000;
const officialExamSubmissionGraceMs = 30 * 1000;
const friendDuelLifetimeMs = 7 * 24 * 60 * 60 * 1000;
const matchmakingLifetimeMs = 10 * 60 * 1000;
const operationalConfigCacheMs = 60_000;
let missionConfigCache: {expiresAt: number; value: MissionTemplate[]} | null = null;
let rewardConfigCache: {expiresAt: number; value: DailyRewardTemplate[]} | null = null;
let shopConfigCache: {expiresAt: number; value: ActiveAvatarShopItem[]} | null = null;

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
  officialExamId?: string | null;
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

type StartOfficialExamInput = {
  examId: string;
};

type AvatarItemInput = {
  itemId: string;
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

type SendFriendDuelInvitationInput = {
  friendUid: string;
};

type RespondFriendDuelInvitationInput = {
  invitationId: string;
  accept: boolean;
};

type OpenFriendDuelInput = {
  duelId: string;
};

type SubmitFriendDuelInput = {
  duelId: string;
  answers: Answer[];
};

type GetRankingInput = {
  scope: "global" | "territory" | "friends";
};

type CreateStudyGroupInput = {
  name: string;
};

type JoinStudyGroupInput = {
  code: string;
};

type StudyGroupInput = {
  groupId: string;
};

type CreateStudyGroupCompetitionInput = StudyGroupInput & {
  name: string;
  metric: StudyGroupCompetitionMetric;
  durationDays: number;
};

type ReviewQuestionInput = {
  questionId: string;
  decision: "save" | "publish" | "disable";
  question?: unknown;
};

type BulkReviewQuestionsInput = {
  questionIds: string[];
  decision: "publish" | "disable";
};

type UpsertAdminCatalogItemInput = {
  kind: AdminCatalogKind;
  id: string;
  item: unknown;
};

type UpsertAdminOperationItemInput = {
  kind: AdminOperationKind;
  id: string;
  item: unknown;
};

export const bootstrapEmulatorAdmin = onCall(async (request) => {
  const uid = requireUid(request.auth?.uid);
  if (env.FUNCTIONS_EMULATOR !== "true") {
    throw new HttpsError("permission-denied", "Emulator-only operation.");
  }

  const now = Timestamp.now();
  const userRef = db.collection("users").doc(uid);
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(userRef);
    transaction.set(userRef, {
      uid,
      role: "admin",
      isAnonymous: true,
      username: "Administrador local",
      updatedAt: now,
      ...(snapshot.exists ? {} : {createdAt: now}),
    }, {merge: true});
  });
  return {role: "admin"};
});

export const getQuestionReviewQueue = onCall(async (request) => {
  const uid = requireUid(request.auth?.uid);
  const userSnapshot = await db.collection("users").doc(uid).get();
  requireAdmin(userSnapshot);

  const requestedLimit = request.data?.limit;
  const limit = requestedLimit === undefined ? 50 : Math.min(
    requireInteger(requestedLimit, "limit", 1, 50),
    50,
  );
  const [pendingSnapshot, draftSnapshot] = await Promise.all([
    db.collection("questions").where("status", "==", "pending_review").limit(limit).get(),
    db.collection("questions").where("status", "==", "draft").limit(limit).get(),
  ]);
  const snapshots = [...pendingSnapshot.docs, ...draftSnapshot.docs]
    .sort((first, second) => timestampMillis(second.data().updatedAt) -
      timestampMillis(first.data().updatedAt))
    .slice(0, limit);
  const duplicateMap = await questionDuplicateMap(snapshots);
  const questions = snapshots.map((snapshot) => adminQuestion(
    snapshot.id,
    snapshot.data(),
    (duplicateMap.get(stringValue(snapshot.data().contentFingerprint)) ?? [])
      .filter((duplicate) => duplicate.id !== snapshot.id),
  ));
  return {questions};
});

export const getAdminCatalog = onCall(async (request) => {
  const uid = requireUid(request.auth?.uid);
  const userSnapshot = await db.collection("users").doc(uid).get();
  requireAdmin(userSnapshot);

  const kinds: AdminCatalogKind[] = [
    "oppositions",
    "territories",
    "categories",
    "officialExams",
  ];
  const snapshots = await Promise.all(kinds.map((kind) => db.collection(kind).limit(300).get()));
  const catalog = Object.fromEntries(kinds.map((kind, index) => [
    kind,
    snapshots[index].docs
      .map((snapshot) => parseAdminCatalogItem(kind, snapshot.id, snapshot.data()))
      .sort(catalogSort),
  ]));
  return {catalog};
});

export const upsertAdminCatalogItem = onCall<UpsertAdminCatalogItemInput>(async (request) => {
  const uid = requireUid(request.auth?.uid);
  if (!isAdminCatalogKind(request.data?.kind)) {
    throw new HttpsError("invalid-argument", "Invalid catalog kind.");
  }

  let item: AdminCatalogItem;
  try {
    item = parseAdminCatalogItem(request.data.kind, request.data?.id, request.data?.item);
  } catch (error) {
    if (error instanceof AdminCatalogValidationError) {
      throw new HttpsError("invalid-argument", error.message);
    }
    throw error;
  }

  const kind = request.data.kind;
  const userRef = db.collection("users").doc(uid);
  const itemRef = db.collection(kind).doc(item.id);
  return db.runTransaction(async (transaction) => {
    const [userSnapshot, existingSnapshot] = await transaction.getAll(userRef, itemRef);
    requireAdmin(userSnapshot);

    if (kind === "categories" || kind === "officialExams") {
      const linkedItem = item as {oppositionId: string};
      const oppositionSnapshot = await transaction.get(
        db.collection("oppositions").doc(linkedItem.oppositionId),
      );
      if (!oppositionSnapshot.exists) {
        throw new HttpsError("failed-precondition", "The linked opposition does not exist.");
      }
    }
    if (kind === "categories") {
      const category = item as Extract<AdminCatalogItem, {parentId: string | null}>;
      if (category.parentId) {
        const parentSnapshot = await transaction.get(
          db.collection("categories").doc(category.parentId),
        );
        if (!parentSnapshot.exists ||
          parentSnapshot.data()?.oppositionId !== category.oppositionId) {
          throw new HttpsError(
            "failed-precondition",
            "The parent category must exist in the same opposition.",
          );
        }
      }
    }

    const data = {...item} as Record<string, unknown>;
    delete data.id;
    const now = Timestamp.now();
    transaction.set(itemRef, {
      ...data,
      updatedAt: now,
      updatedBy: uid,
      ...(existingSnapshot.exists ? {} : {createdAt: now, createdBy: uid}),
    }, {merge: true});
    return {item};
  });
});

export const getAdminOperations = onCall(async (request) => {
  const uid = requireUid(request.auth?.uid);
  const userSnapshot = await db.collection("users").doc(uid).get();
  requireAdmin(userSnapshot);

  const kinds: AdminOperationKind[] = [
    "missions",
    "dailyRewards",
    "shopItems",
    "subscriptionPlans",
    "appConfig",
  ];
  const snapshots = await Promise.all(kinds.map((kind) => db.collection(kind).limit(300).get()));
  const operations = Object.fromEntries(kinds.map((kind, index) => [
    kind,
    snapshots[index].docs
      .map((snapshot) => parseAdminOperationItem(kind, snapshot.id, snapshot.data()))
      .sort(operationSort),
  ]));
  return {operations};
});

export const upsertAdminOperationItem = onCall<UpsertAdminOperationItemInput>(async (request) => {
  const uid = requireUid(request.auth?.uid);
  if (!isAdminOperationKind(request.data?.kind)) {
    throw new HttpsError("invalid-argument", "Invalid operation kind.");
  }

  let item: AdminOperationItem;
  try {
    item = parseAdminOperationItem(request.data.kind, request.data?.id, request.data?.item);
  } catch (error) {
    if (error instanceof AdminOperationValidationError) {
      throw new HttpsError("invalid-argument", error.message);
    }
    throw error;
  }

  if (request.data.kind === "shopItems") {
    const shopItem = item as AdminShopItem;
    const knownItem = avatarItemById(shopItem.id);
    if (!knownItem || knownItem.category !== shopItem.category || knownItem.slot !== shopItem.slot) {
      throw new HttpsError(
        "failed-precondition",
        "Shop items must reference an existing client visual with the same category and slot.",
      );
    }
  }

  const kind = request.data.kind;
  const userRef = db.collection("users").doc(uid);
  const itemRef = db.collection(kind).doc(item.id);
  const result = await db.runTransaction(async (transaction) => {
    const [userSnapshot, existingSnapshot] = await transaction.getAll(userRef, itemRef);
    requireAdmin(userSnapshot);
    if (kind === "dailyRewards") {
      const reward = item as AdminDailyReward;
      const sameDaySnapshot = await transaction.get(
        db.collection("dailyRewards").where("day", "==", reward.day).limit(2),
      );
      if (sameDaySnapshot.docs.some((snapshot) => snapshot.id !== reward.id)) {
        throw new HttpsError("already-exists", `Daily reward day ${reward.day} already exists.`);
      }
    }

    const data = {...item} as Record<string, unknown>;
    delete data.id;
    const now = Timestamp.now();
    transaction.set(itemRef, {
      ...data,
      updatedAt: now,
      updatedBy: uid,
      ...(existingSnapshot.exists ? {} : {createdAt: now, createdBy: uid}),
    }, {merge: true});
    return {item};
  });
  invalidateOperationalCache(kind);
  return result;
});

export const reviewQuestion = onCall<ReviewQuestionInput>(async (request) => {
  const uid = requireUid(request.auth?.uid);
  const questionId = requireString(request.data?.questionId, "questionId", 160);
  const decision = request.data?.decision;
  if (!(["save", "publish", "disable"] as unknown[]).includes(decision)) {
    throw new HttpsError("invalid-argument", "Invalid review decision.");
  }

  let reviewedQuestion: ImportedQuestion | undefined;
  if (decision !== "disable") {
    try {
      reviewedQuestion = parseQuestionBatch({questions: [request.data?.question]}).questions[0];
    } catch (error) {
      if (error instanceof AdminImportValidationError) {
        throw new HttpsError("invalid-argument", error.message);
      }
      throw error;
    }
    if (reviewedQuestion.id !== questionId) {
      throw new HttpsError("invalid-argument", "Question id cannot be changed.");
    }
  }

  const userRef = db.collection("users").doc(uid);
  const questionRef = db.collection("questions").doc(questionId);
  const oppositionRef = reviewedQuestion ?
    db.collection("oppositions").doc(reviewedQuestion.oppositionId) : null;

  return db.runTransaction(async (transaction) => {
    const reads = await transaction.getAll(
      userRef,
      questionRef,
      ...(oppositionRef ? [oppositionRef] : []),
    );
    const [userSnapshot, questionSnapshot, oppositionSnapshot] = reads;
    requireAdmin(userSnapshot);
    if (!questionSnapshot.exists) {
      throw new HttpsError("not-found", "Question not found.");
    }
    const existing = questionSnapshot.data() ?? {};
    if (!["draft", "pending_review"].includes(String(existing.status))) {
      throw new HttpsError("failed-precondition", "Question is no longer pending review.");
    }
    if (oppositionSnapshot &&
      (!oppositionSnapshot.exists || oppositionSnapshot.data()?.active !== true)) {
      throw new HttpsError("failed-precondition", "Question opposition is missing or inactive.");
    }

    if (decision === "publish" && reviewedQuestion) {
      const duplicateSnapshot = await transaction.get(
        db.collection("questions")
          .where("contentFingerprint", "==", reviewedQuestion.contentFingerprint)
          .limit(10),
      );
      const duplicate = duplicateSnapshot.docs.find((snapshot) =>
        snapshot.id !== questionId && snapshot.data().status !== "disabled",
      );
      if (duplicate) {
        throw new HttpsError(
          "already-exists",
          `Question duplicates ${duplicate.id}; disable one before publishing.`,
        );
      }
    }

    const now = Timestamp.now();
    if (decision === "disable") {
      transaction.update(questionRef, {
        status: "disabled",
        verified: false,
        reviewedBy: uid,
        lastReviewedAt: now,
        updatedAt: now,
      });
      return {question: adminQuestion(questionId, {
        ...existing,
        status: "disabled",
        verified: false,
        reviewedBy: uid,
        lastReviewedAt: now,
        updatedAt: now,
      })};
    }

    if (!reviewedQuestion) {
      throw new HttpsError("invalid-argument", "Question content is required.");
    }
    const questionData: Partial<typeof reviewedQuestion> = {...reviewedQuestion};
    delete questionData.id;
    const status = decision === "publish" ? "published" : reviewedQuestion.status;
    const verified = decision === "publish";
    transaction.update(questionRef, {
      ...questionData,
      status,
      verified,
      reviewedBy: uid,
      lastReviewedAt: now,
      updatedAt: now,
    });
    return {question: adminQuestion(questionId, {
      ...existing,
      ...questionData,
      status,
      verified,
      reviewedBy: uid,
      lastReviewedAt: now,
      updatedAt: now,
    })};
  });
});

export const bulkReviewQuestions = onCall<BulkReviewQuestionsInput>(async (request) => {
  const uid = requireUid(request.auth?.uid);
  const decision = request.data?.decision;
  if (!(["publish", "disable"] as unknown[]).includes(decision)) {
    throw new HttpsError("invalid-argument", "Invalid bulk review decision.");
  }
  if (!Array.isArray(request.data?.questionIds) ||
    request.data.questionIds.length === 0 || request.data.questionIds.length > 50) {
    throw new HttpsError(
      "invalid-argument",
      "questionIds must contain between 1 and 50 entries.",
    );
  }
  const questionIds = request.data.questionIds.map((value, index) => {
    const id = requireString(value, `questionIds[${index}]`, 160);
    if (!/^[A-Za-z0-9_-]+$/.test(id)) {
      throw new HttpsError("invalid-argument", `questionIds[${index}] is invalid.`);
    }
    return id;
  });
  if (new Set(questionIds).size !== questionIds.length) {
    throw new HttpsError("invalid-argument", "Duplicate question ids are not allowed.");
  }

  const userRef = db.collection("users").doc(uid);
  const questionRefs = questionIds.map((id) => db.collection("questions").doc(id));

  return db.runTransaction(async (transaction) => {
    const [userSnapshot, ...questionSnapshots] = await transaction.getAll(
      userRef,
      ...questionRefs,
    );
    requireAdmin(userSnapshot);

    questionSnapshots.forEach((snapshot, index) => {
      if (!snapshot.exists) {
        throw new HttpsError("not-found", `Question ${questionIds[index]} not found.`);
      }
      if (!["draft", "pending_review"].includes(String(snapshot.data()?.status))) {
        throw new HttpsError(
          "failed-precondition",
          `Question ${questionIds[index]} is no longer pending review.`,
        );
      }
    });

    if (decision === "publish") {
      const oppositionIds = [...new Set(questionSnapshots.map((snapshot) =>
        requireString(snapshot.data()?.oppositionId, "oppositionId", 80),
      ))];
      const oppositionSnapshots = await transaction.getAll(...oppositionIds.map((id) =>
        db.collection("oppositions").doc(id),
      ));
      oppositionSnapshots.forEach((snapshot, index) => {
        if (!snapshot.exists || snapshot.data()?.active !== true) {
          throw new HttpsError(
            "failed-precondition",
            `Opposition ${oppositionIds[index]} does not exist or is inactive.`,
          );
        }
      });

      const fingerprints = questionSnapshots.map((snapshot) =>
        requireString(snapshot.data()?.contentFingerprint, "contentFingerprint", 80),
      );
      if (new Set(fingerprints).size !== fingerprints.length) {
        throw new HttpsError(
          "already-exists",
          "The selection contains duplicate question statements.",
        );
      }
      const selectedIds = new Set(questionIds);
      for (const fingerprintChunk of chunks(fingerprints, 30)) {
        const duplicateSnapshot = await transaction.get(
          db.collection("questions")
            .where("contentFingerprint", "in", fingerprintChunk)
            .limit(100),
        );
        const duplicate = duplicateSnapshot.docs.find((snapshot) =>
          !selectedIds.has(snapshot.id) && snapshot.data().status !== "disabled",
        );
        if (duplicate) {
          throw new HttpsError(
            "already-exists",
            `The selection contains a duplicate of ${duplicate.id}.`,
          );
        }
      }
    }

    const now = Timestamp.now();
    questionRefs.forEach((reference) => transaction.update(reference, {
      status: decision === "publish" ? "published" : "disabled",
      verified: decision === "publish",
      reviewedBy: uid,
      lastReviewedAt: now,
      updatedAt: now,
    }));

    return {
      decision,
      reviewedCount: questionIds.length,
      questionIds,
    };
  });
});

export const importQuestionBatch = onCall<unknown>(async (request) => {
  const uid = requireUid(request.auth?.uid);
  let importedBatch;
  try {
    importedBatch = parseQuestionBatch(request.data);
  } catch (error) {
    if (error instanceof AdminImportValidationError) {
      throw new HttpsError("invalid-argument", error.message);
    }
    throw error;
  }

  const userRef = db.collection("users").doc(uid);
  const batchRef = db.collection("questionImportBatches").doc(importedBatch.batchId);
  const questionRefs = importedBatch.questions.map((question) =>
    db.collection("questions").doc(question.id),
  );
  const oppositionIds = [...new Set(importedBatch.questions.map(
    (question) => question.oppositionId,
  ))];
  const oppositionRefs = oppositionIds.map((oppositionId) =>
    db.collection("oppositions").doc(oppositionId),
  );

  return db.runTransaction(async (transaction) => {
    const userSnapshot = await transaction.get(userRef);
    if (!userSnapshot.exists || userSnapshot.data()?.role !== "admin") {
      throw new HttpsError("permission-denied", "Administrator role required.");
    }

    const existingBatch = await transaction.get(batchRef);
    if (existingBatch.exists) {
      const data = existingBatch.data() ?? {};
      if (data.createdBy !== uid || data.contentFingerprint !== importedBatch.contentFingerprint) {
        throw new HttpsError("already-exists", "Import batch id is already in use.");
      }
      return {
        batchId: importedBatch.batchId,
        importedCount: Number(data.importedCount ?? 0),
        questionIds: Array.isArray(data.questionIds) ? data.questionIds : [],
        status: "completed",
        idempotent: true,
      };
    }

    const [oppositionSnapshots, questionSnapshots] = await Promise.all([
      transaction.getAll(...oppositionRefs),
      transaction.getAll(...questionRefs),
    ]);
    oppositionSnapshots.forEach((snapshot, index) => {
      if (!snapshot.exists || snapshot.data()?.active !== true) {
        throw new HttpsError(
          "failed-precondition",
          `Opposition ${oppositionIds[index]} does not exist or is inactive.`,
        );
      }
    });
    const existingQuestionIds = questionSnapshots
      .filter((snapshot) => snapshot.exists)
      .map((snapshot) => snapshot.id);
    if (existingQuestionIds.length > 0) {
      throw new HttpsError(
        "already-exists",
        `Question ids already exist: ${existingQuestionIds.join(", ")}.`,
      );
    }

    const now = Timestamp.now();
    importedBatch.questions.forEach((question, index) => {
      const questionData: Partial<typeof question> = {...question};
      delete questionData.id;
      transaction.create(questionRefs[index], {
        ...questionData,
        createdBy: uid,
        createdAt: now,
        updatedAt: now,
        lastReviewedAt: null,
      });
    });
    const questionIds = importedBatch.questions.map((question) => question.id);
    transaction.create(batchRef, {
      contentFingerprint: importedBatch.contentFingerprint,
      sourceDocument: importedBatch.sourceDocument,
      createdBy: uid,
      importedCount: questionIds.length,
      questionIds,
      status: "completed",
      createdAt: now,
      updatedAt: now,
    });

    return {
      batchId: importedBatch.batchId,
      importedCount: questionIds.length,
      questionIds,
      status: "completed",
      idempotent: false,
    };
  });
});

export const bootstrapGuestProfile = onCall<BootstrapGuestInput>(async (request) => {
  const uid = requireUid(request.auth?.uid);
  const oppositionId = requireString(request.data?.oppositionId, "oppositionId", 80);
  const oppositionName = requireString(request.data?.oppositionName, "oppositionName", 80);
  const territory = parseTerritory(request.data?.territory);
  const territoryKeys = buildTerritoryKeys(territory);
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
        territoryKeys,
        updatedAt: now,
      };
      transaction.update(userRef, {
        oppositionId,
        oppositionName,
        territorySelection: territory,
        territoryKeys,
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
      territoryKeys,
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
      avatarEquipped: defaultAvatarLoadout,
      createdAt: now,
      updatedAt: now,
    };
    transaction.set(userRef, created);
    return serializeProfile(uid, created);
  });

  return {profile};
});

export const getCurrentProfile = onCall(async (request) => {
  const uid = requireUid(request.auth?.uid);
  const snapshot = await db.collection("users").doc(uid).get();
  if (!snapshot.exists) {
    throw new HttpsError("not-found", "User profile missing.");
  }
  return {profile: serializeProfile(uid, snapshot.data() ?? {})};
});

export const completeAccountLink = onCall(async (request) => {
  const uid = requireUid(request.auth?.uid);
  const provider = authProvider(request.auth?.token.firebase);
  if (!provider || provider === "anonymous") {
    throw new HttpsError("failed-precondition", "A permanent authentication provider is required.");
  }

  const userRef = db.collection("users").doc(uid);
  const profile = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(userRef);
    if (!snapshot.exists) {
      throw new HttpsError("not-found", "User profile missing.");
    }
    const current = snapshot.data() ?? {};
    const updated = {
      ...current,
      isAnonymous: false,
      role: current.role === "guest" ? "user" : current.role,
      accountProvider: provider,
      linkedAt: current.linkedAt ?? Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    transaction.update(userRef, {
      isAnonymous: false,
      role: updated.role,
      accountProvider: provider,
      linkedAt: updated.linkedAt,
      updatedAt: updated.updatedAt,
    });
    return serializeProfile(uid, updated);
  });

  return {profile};
});

export const getAvatarShop = onCall(async (request) => {
  const uid = requireUid(request.auth?.uid);
  return {inventory: await avatarInventoryForUid(uid)};
});

export const getMonetizationOverview = onCall(async (request) => {
  const uid = requireUid(request.auth?.uid);
  const [userSnapshot, subscriptionSnapshot, plansSnapshot, configSnapshot] = await Promise.all([
    db.collection("users").doc(uid).get(),
    db.collection("subscriptions").doc(uid).get(),
    db.collection("subscriptionPlans").where("active", "==", true).limit(10).get(),
    db.collection("appConfig").doc("monetization").get(),
  ]);
  if (!userSnapshot.exists) {
    throw new HttpsError("failed-precondition", "User profile missing.");
  }

  const plans = plansSnapshot.docs
    .map((document) => parseSubscriptionPlan(document.id, document.data()))
    .filter((plan) => plan !== null)
    .sort((first, second) => second.priority - first.priority || first.id.localeCompare(second.id));
  const subscription = subscriptionSnapshot.data() ?? null;
  const expiresAt = subscription?.expiresAt;
  const entitlement = subscriptionEntitlement(subscription ? {
    ...subscription,
    expiresAtMs: expiresAt instanceof Timestamp ? expiresAt.toMillis() : null,
  } : null, Date.now());
  const config = configSnapshot.data() ?? {};
  const providerReady = config.adProviderReady === true;

  return {
    plans,
    entitlement,
    gemBalance: numberValue(userSnapshot.data()?.gems),
    ads: {
      enabled: providerReady && config.adsEnabled === true,
      rewardedEnabled: providerReady && config.rewardedAdsEnabled === true,
      resultInterval: Math.max(1, Math.min(20, numberValue(config.resultInterval) || 3)),
    },
  };
});

export const purchaseAvatarItem = onCall<AvatarItemInput>(async (request) => {
  const uid = requireUid(request.auth?.uid);
  const itemId = requireString(request.data?.itemId, "itemId", 80);
  const catalog = await activeAvatarShopCatalog();
  const item = avatarItemById(itemId, catalog);
  if (!item) throw new HttpsError("not-found", "Avatar item not found.");
  const configuredItem = catalog.find((catalogItem) => catalogItem.id === item.id);

  const userRef = db.collection("users").doc(uid);
  const inventoryRef = userRef.collection("inventory").doc(item.id);
  const subscriptionRef = db.collection("subscriptions").doc(uid);
  const transactionRef = db.collection("currencyTransactions").doc(`${uid}_avatar_${item.id}`);
  const idempotent = await db.runTransaction(async (transaction) => {
    const [userSnapshot, inventorySnapshot, subscriptionSnapshot] = await Promise.all([
      transaction.get(userRef),
      transaction.get(inventoryRef),
      transaction.get(subscriptionRef),
    ]);
    if (!userSnapshot.exists) {
      throw new HttpsError("failed-precondition", "User profile missing.");
    }
    if (starterAvatarItemIds.includes(item.id) || inventorySnapshot.exists) return true;
    if (configuredItem?.premiumOnly) {
      const subscription = subscriptionSnapshot.data() ?? null;
      const expiresAt = subscription?.expiresAt;
      const entitlement = subscriptionEntitlement(subscription ? {
        ...subscription,
        expiresAtMs: expiresAt instanceof Timestamp ? expiresAt.toMillis() : null,
      } : null, Date.now());
      if (entitlement.tier !== "premium") {
        throw new HttpsError("permission-denied", "Premium is required for this item.");
      }
    }

    const user = userSnapshot.data() ?? {};
    const balances = {
      coins: numberValue(user.coins),
      gems: numberValue(user.gems),
    };
    const nextBalances = balanceAfterAvatarPurchase(balances, item);
    if (!nextBalances) {
      throw new HttpsError("failed-precondition", `Not enough ${item.currency}.`);
    }

    const now = Timestamp.now();
    transaction.update(userRef, {...nextBalances, updatedAt: now});
    transaction.create(inventoryRef, {
      itemId: item.id,
      category: item.category,
      slot: item.slot,
      rarity: item.rarity,
      acquiredWith: item.currency,
      pricePaid: item.price,
      acquiredAt: now,
    });
    transaction.create(transactionRef, {
      uid,
      type: "purchase",
      currency: item.currency,
      amount: -item.price,
      balanceAfter: nextBalances[item.currency],
      sourceId: item.id,
      createdAt: now,
    });
    return false;
  });

  return {inventory: await avatarInventoryForUid(uid, catalog), idempotent};
});

export const equipAvatarItem = onCall<AvatarItemInput>(async (request) => {
  const uid = requireUid(request.auth?.uid);
  const itemId = requireString(request.data?.itemId, "itemId", 80);
  const catalog = await activeAvatarShopCatalog();
  const item = avatarItemById(itemId, catalog);
  if (!item) throw new HttpsError("not-found", "Avatar item not found.");

  const userRef = db.collection("users").doc(uid);
  const inventoryRef = userRef.collection("inventory").doc(item.id);
  await db.runTransaction(async (transaction) => {
    const [userSnapshot, inventorySnapshot] = await Promise.all([
      transaction.get(userRef),
      transaction.get(inventoryRef),
    ]);
    if (!userSnapshot.exists) {
      throw new HttpsError("failed-precondition", "User profile missing.");
    }
    if (!starterAvatarItemIds.includes(item.id) && !inventorySnapshot.exists) {
      throw new HttpsError("permission-denied", "Avatar item is not owned.");
    }

    const user = userSnapshot.data() ?? {};
    const equipped = normalizeAvatarLoadout(
      user.avatarEquipped,
      catalog.map((catalogItem) => catalogItem.id),
      catalog,
    );
    equipped[item.slot] = item.id;
    transaction.update(userRef, {avatarEquipped: equipped, updatedAt: Timestamp.now()});
  });

  return {inventory: await avatarInventoryForUid(uid, catalog)};
});

export const getDailyEngagement = onCall(async (request) => {
  const uid = requireUid(request.auth?.uid);
  const [missionTemplates, rewardSchedule] = await Promise.all([
    activeMissionTemplates(),
    activeDailyRewards(),
  ]);
  const now = Timestamp.now();
  const date = madridDay(now.toDate());
  const userRef = db.collection("users").doc(uid);
  const missionRefs = missionTemplates.map((mission) =>
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
    const missions = missionTemplates.map((template, index) => {
      const snapshot = missionSnapshots[index];
      const data = snapshot.data() ?? {};
      if (!snapshot.exists) {
        transaction.set(missionRefs[index], missionDocument(template, date, now));
      }
      return serializeMission(template, data, date);
    });

    return {
      dailyReward: dailyRewardFor(
        user.dailyRewardDay,
        user.lastDailyRewardDate,
        date,
        rewardSchedule,
      ),
      missions,
    };
  });
});

export const claimDailyReward = onCall(async (request) => {
  const uid = requireUid(request.auth?.uid);
  const rewardSchedule = await activeDailyRewards();
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
    const reward = dailyRewardFor(
      user.dailyRewardDay,
      user.lastDailyRewardDate,
      date,
      rewardSchedule,
    );
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
  const missionTemplates = await activeMissionTemplates();
  const template = missionTemplates.find((mission) => mission.id === missionId);
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

export const getOfficialExams = onCall(async (request) => {
  const uid = requireUid(request.auth?.uid);
  const userSnapshot = await db.collection("users").doc(uid).get();
  if (!userSnapshot.exists) {
    throw new HttpsError("failed-precondition", "Guest profile must be created first.");
  }

  const oppositionId = requireString(
    userSnapshot.data()?.oppositionId,
    "stored oppositionId",
    80,
  );
  const snapshot = await db.collection("officialExams")
    .where("oppositionId", "==", oppositionId)
    .where("status", "==", "published")
    .limit(50)
    .get();

  const exams = snapshot.docs.flatMap((document) => {
    try {
      return [serializeOfficialExam(parseAdminCatalogItem(
        "officialExams",
        document.id,
        document.data(),
      ) as OfficialExamCatalogItem)];
    } catch {
      return [];
    }
  }).sort((first, second) => second.date.localeCompare(first.date));

  return {exams};
});

export const startOfficialExam = onCall<StartOfficialExamInput>(async (request) => {
  const uid = requireUid(request.auth?.uid);
  const examId = requireString(request.data?.examId, "examId", 160);
  const [userSnapshot, examSnapshot, questionSnapshot] = await Promise.all([
    db.collection("users").doc(uid).get(),
    db.collection("officialExams").doc(examId).get(),
    db.collection("questions").where("officialExamId", "==", examId).limit(500).get(),
  ]);
  if (!userSnapshot.exists) {
    throw new HttpsError("failed-precondition", "Guest profile must be created first.");
  }
  if (!examSnapshot.exists) {
    throw new HttpsError("not-found", "Official exam not found.");
  }

  let exam: OfficialExamCatalogItem;
  try {
    exam = parseAdminCatalogItem(
      "officialExams",
      examSnapshot.id,
      examSnapshot.data(),
    ) as OfficialExamCatalogItem;
  } catch {
    throw new HttpsError("failed-precondition", "Official exam configuration is invalid.");
  }
  if (exam.status !== "published") {
    throw new HttpsError("failed-precondition", "Official exam is not published.");
  }
  if (exam.oppositionId !== userSnapshot.data()?.oppositionId) {
    throw new HttpsError("permission-denied", "Official exam is not available for this opposition.");
  }

  const eligibleQuestions = questionSnapshot.docs
    .filter((document) => {
      const data = document.data() as QuestionDoc;
      return data.status === "published" && data.verified === true;
    })
    .sort((first, second) => first.id.localeCompare(second.id, "es", {numeric: true}));
  if (eligibleQuestions.length < exam.rules.questionCount) {
    throw new HttpsError(
      "failed-precondition",
      "Official exam does not have enough reviewed questions yet.",
    );
  }
  const selectedQuestions = eligibleQuestions.slice(0, exam.rules.questionCount);
  const sessionRef = db.collection("quizSessions").doc();
  await sessionRef.set({
    uid,
    mode: "official_exam",
    oppositionId: exam.oppositionId,
    officialExamId: exam.id,
    officialExamRules: exam.rules,
    questionIds: selectedQuestions.map((document) => document.id),
    answers: [],
    status: "started",
    createdAt: Timestamp.now(),
    submittedAt: null,
  });

  return {
    sessionId: sessionRef.id,
    exam: serializeOfficialExam(exam),
    questions: selectedQuestions.map((document) =>
      publicQuestion(document.id, document.data() as QuestionDoc),
    ),
  };
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
  const [missionTemplates, rewardSchedule] = await Promise.all([
    activeMissionTemplates(),
    activeDailyRewards(),
  ]);

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
    const officialExamRules = session.mode === "official_exam" ?
      storedOfficialExamRules(session.officialExamRules, questionIds.length) : null;
    if (
      officialExamRules &&
      Date.now() - createdAt.toMillis() >
        officialExamRules.durationSeconds * 1000 + officialExamSubmissionGraceMs
    ) {
      throw new HttpsError("deadline-exceeded", "Official exam time expired.");
    }
    const allowedQuestionIds = new Set(questionIds);
    if (submittedAnswers.some((answer) => !allowedQuestionIds.has(answer.questionId))) {
      throw new HttpsError("invalid-argument", "Answer contains an unknown question.");
    }

    const userRef = db.collection("users").doc(uid);
    const questionRefs = questionIds.map((id) => db.collection("questions").doc(id));
    const statRefs = questionIds.map((id) => userRef.collection("questionStats").doc(id));
    const completedAt = Timestamp.now();
    const date = madridDay(completedAt.toDate());
    const missionRefs = missionTemplates.map((mission) =>
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
        question: reviewedQuizQuestion(question.id, question.data),
        selectedAnswerId,
        isBlank,
        isCorrect,
      };
    });

    const percentage = questions.length === 0 ? 0 : correct / questions.length;
    const scoredExam = officialExamRules ?
      officialExamScore(correct, incorrect, blank, officialExamRules) : null;
    const points = scoredExam?.points ?? correct;
    const maximumPoints = scoredExam?.maximumPoints ?? questions.length;
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

    const missions = missionTemplates.map((template, index) => {
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
      score: {
        correct,
        incorrect,
        blank,
        points,
        maximumPoints,
        percentage,
        xpEarned,
        coinsEarned,
      },
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
    transaction.set(db.collection("socialActivities").doc(`quiz_${sessionRef.id}`), {
      actorUid: uid,
      type: "quiz_completed",
      xpEarned,
      correct,
      total: questions.length,
      duelCompleted: false,
      streak,
      oppositionId: stringValue(user.oppositionId),
      createdAt: completedAt,
    });

    return {
      result: {
        attempts,
        correct,
        incorrect,
        blank,
        points,
        maximumPoints,
        percentage,
        xpEarned,
        coinsEarned,
        completedAt: completedAt.toDate().toISOString(),
      },
      progress: serializeProgress({...user, ...profileUpdate}),
      engagement: {
        dailyReward: dailyRewardFor(
          user.dailyRewardDay,
          user.lastDailyRewardDate,
          date,
          rewardSchedule,
        ),
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
  const [missionTemplates, rewardSchedule] = await Promise.all([
    activeMissionTemplates(),
    activeDailyRewards(),
  ]);

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
    const missionRefs = missionTemplates.map((mission) =>
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
        question: reviewedQuizQuestion(question.id, question.data),
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

    const missions = missionTemplates.map((template, index) => {
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
      kind: "training",
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
    transaction.set(db.collection("socialActivities").doc(`duel_${duelId}_${uid}`), {
      actorUid: uid,
      type: "duel_completed",
      mode: "training",
      outcome,
      xpEarned,
      correct,
      total: questions.length,
      duelCompleted: true,
      streak,
      oppositionId: stringValue(user.oppositionId),
      createdAt: completedAt,
    });

    return {
      result,
      duel: duelResult,
      progress: serializeProgress({...user, ...profileUpdate}),
      engagement: {
        dailyReward: dailyRewardFor(
          user.dailyRewardDay,
          user.lastDailyRewardDate,
          date,
          rewardSchedule,
        ),
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

export const getStudyGroups = onCall(async (request) => {
  const uid = requireUid(request.auth?.uid);
  const memberships = await db.collectionGroup("members")
    .where("uid", "==", uid)
    .limit(20)
    .get();
  const membershipByGroup = new Map(memberships.docs.map((document) => [
    requireString(document.data().groupId, "stored group id", 160),
    String(document.data().role) === "owner" ? "owner" :
      String(document.data().role) === "admin" ? "admin" : "member",
  ]));
  if (membershipByGroup.size === 0) return {groups: []};
  const groupSnapshots = await db.getAll(...[...membershipByGroup.keys()].map((groupId) =>
    db.collection("groups").doc(groupId),
  ));
  const groups = groupSnapshots
    .filter((snapshot) => snapshot.exists && snapshot.data()?.active === true)
    .sort((first, second) => timestampMillis(second.data()?.updatedAt) -
      timestampMillis(first.data()?.updatedAt))
    .map((snapshot) => serializeStudyGroup(
      snapshot.id,
      snapshot.data() ?? {},
      membershipByGroup.get(snapshot.id) ?? "member",
    ));
  return {groups};
});

export const createStudyGroup = onCall<CreateStudyGroupInput>(async (request) => {
  const uid = requireUid(request.auth?.uid);
  const name = normalizeGroupName(request.data?.name);
  if (!name) throw new HttpsError("invalid-argument", "Invalid group name.");

  const joinCode = groupCodeFromBytes(randomBytes(8));
  const groupRef = db.collection("groups").doc();
  const memberRef = groupRef.collection("members").doc(uid);
  const codeRef = db.collection("groupCodes").doc(joinCode);
  const userRef = db.collection("users").doc(uid);

  return db.runTransaction(async (transaction) => {
    const [userSnapshot, codeSnapshot] = await transaction.getAll(userRef, codeRef);
    if (!userSnapshot.exists) {
      throw new HttpsError("failed-precondition", "User profile missing.");
    }
    const user = userSnapshot.data() ?? {};
    const username = String(user.username ?? "");
    const storedUsernameKey = String(user.usernameKey ?? "");
    if (!isValidUsername(username) || usernameKey(username) !== storedUsernameKey) {
      throw new HttpsError("failed-precondition", "Choose a public username before creating a group.");
    }
    const usernameReservation = await transaction.get(
      db.collection("usernames").doc(storedUsernameKey),
    );
    if (!usernameReservation.exists || usernameReservation.data()?.uid !== uid) {
      throw new HttpsError("failed-precondition", "Choose a public username before creating a group.");
    }
    if (numberValue(user.groupCount) >= 10) {
      throw new HttpsError("resource-exhausted", "You already belong to the maximum number of groups.");
    }
    if (codeSnapshot.exists) {
      throw new HttpsError("aborted", "Join code collision. Try again.");
    }

    const now = Timestamp.now();
    const group = {
      name,
      ownerUid: uid,
      adminUids: [uid],
      joinCode,
      memberCount: 1,
      rankingMetric: "xp",
      active: true,
      createdAt: now,
      updatedAt: now,
    };
    transaction.create(groupRef, group);
    transaction.create(memberRef, {
      uid,
      groupId: groupRef.id,
      role: "owner",
      joinedAt: now,
    });
    transaction.create(codeRef, {groupId: groupRef.id, createdAt: now});
    transaction.update(userRef, {groupCount: numberValue(user.groupCount) + 1, updatedAt: now});
    return {group: serializeStudyGroup(groupRef.id, group, "owner")};
  });
});

export const joinStudyGroup = onCall<JoinStudyGroupInput>(async (request) => {
  const uid = requireUid(request.auth?.uid);
  const joinCode = normalizeGroupCode(request.data?.code);
  if (!joinCode) throw new HttpsError("invalid-argument", "Invalid group code.");

  const codeRef = db.collection("groupCodes").doc(joinCode);
  const userRef = db.collection("users").doc(uid);
  return db.runTransaction(async (transaction) => {
    const [userSnapshot, codeSnapshot] = await transaction.getAll(userRef, codeRef);
    if (!userSnapshot.exists) {
      throw new HttpsError("failed-precondition", "User profile missing.");
    }
    if (!codeSnapshot.exists) throw new HttpsError("not-found", "Study group not found.");
    const user = userSnapshot.data() ?? {};
    const username = String(user.username ?? "");
    const storedUsernameKey = String(user.usernameKey ?? "");
    if (!isValidUsername(username) || usernameKey(username) !== storedUsernameKey) {
      throw new HttpsError("failed-precondition", "Choose a public username before joining a group.");
    }
    const usernameReservation = await transaction.get(
      db.collection("usernames").doc(storedUsernameKey),
    );
    if (!usernameReservation.exists || usernameReservation.data()?.uid !== uid) {
      throw new HttpsError("failed-precondition", "Choose a public username before joining a group.");
    }
    const groupId = requireString(codeSnapshot.data()?.groupId, "stored group id", 160);
    const groupRef = db.collection("groups").doc(groupId);
    const memberRef = groupRef.collection("members").doc(uid);
    const [groupSnapshot, memberSnapshot] = await transaction.getAll(groupRef, memberRef);
    if (!groupSnapshot.exists || groupSnapshot.data()?.active !== true) {
      throw new HttpsError("not-found", "Study group not found.");
    }
    const group = groupSnapshot.data() ?? {};
    if (memberSnapshot.exists) {
      return {group: serializeStudyGroup(groupId, group, String(memberSnapshot.data()?.role))};
    }
    if (numberValue(user.groupCount) >= 10) {
      throw new HttpsError("resource-exhausted", "You already belong to the maximum number of groups.");
    }
    if (numberValue(group.memberCount) >= 50) {
      throw new HttpsError("resource-exhausted", "Study group is full.");
    }

    const now = Timestamp.now();
    const competition = addCompetitionMember(group.competition, uid, now);
    transaction.create(memberRef, {uid, groupId, role: "member", joinedAt: now});
    transaction.update(groupRef, {
      memberCount: numberValue(group.memberCount) + 1,
      updatedAt: now,
      ...(competition ? {competition} : {}),
    });
    transaction.update(userRef, {groupCount: numberValue(user.groupCount) + 1, updatedAt: now});
    return {group: serializeStudyGroup(groupId, {
      ...group,
      memberCount: numberValue(group.memberCount) + 1,
      updatedAt: now,
    }, "member")};
  });
});

export const getStudyGroup = onCall<StudyGroupInput>(async (request) => {
  const uid = requireUid(request.auth?.uid);
  const groupId = requireDocumentId(request.data?.groupId, "groupId");
  const groupRef = db.collection("groups").doc(groupId);
  const [groupSnapshot, viewerMembership] = await db.getAll(
    groupRef,
    groupRef.collection("members").doc(uid),
  );
  if (!groupSnapshot.exists || groupSnapshot.data()?.active !== true) {
    throw new HttpsError("not-found", "Study group not found.");
  }
  if (!viewerMembership.exists) {
    throw new HttpsError("permission-denied", "Study group membership required.");
  }

  const memberSnapshots = await groupRef.collection("members").limit(50).get();
  const userSnapshots = memberSnapshots.empty ? [] : await db.getAll(...memberSnapshots.docs.map(
    (membership) => db.collection("users").doc(membership.id),
  ));
  const roleByUid = new Map(memberSnapshots.docs.map((membership) => [
    membership.id,
    String(membership.data().role),
  ]));
  const memberProfiles = userSnapshots
    .filter((snapshot) => snapshot.exists)
    .map((snapshot) => {
      const user = snapshot.data() ?? {};
      const publicUser = serializeSocialUser(snapshot.id, user);
      const storedRole = roleByUid.get(snapshot.id);
      const role: "owner" | "admin" | "member" = storedRole === "owner" ? "owner" :
        storedRole === "admin" ? "admin" : "member";
      return {
        ...publicUser,
        role,
        xp: numberValue(user.xp),
        isViewer: snapshot.id === uid,
      };
    });
  const members = rankEntries(memberProfiles.map(({xp, ...member}) => ({
    ...member,
    score: xp,
  })));
  const groupData = groupSnapshot.data() ?? {};
  return {
    group: {
      ...serializeStudyGroup(
        groupId,
        groupData,
        String(viewerMembership.data()?.role),
      ),
      members,
      competition: serializeStudyGroupCompetition(groupData.competition, memberProfiles),
    },
  };
});

export const createStudyGroupCompetition = onCall<CreateStudyGroupCompetitionInput>(
  async (request) => {
    const uid = requireUid(request.auth?.uid);
    const groupId = requireDocumentId(request.data?.groupId, "groupId");
    const name = normalizeGroupName(request.data?.name);
    const metric = normalizeCompetitionMetric(request.data?.metric);
    const durationDays = requireInteger(request.data?.durationDays, "durationDays", 1, 90);
    if (!name || !metric) {
      throw new HttpsError("invalid-argument", "Invalid competition configuration.");
    }

    const groupRef = db.collection("groups").doc(groupId);
    const membershipRef = groupRef.collection("members").doc(uid);
    return db.runTransaction(async (transaction) => {
      const [groupSnapshot, membershipSnapshot, memberSnapshots] = await Promise.all([
        transaction.get(groupRef),
        transaction.get(membershipRef),
        transaction.get(groupRef.collection("members").limit(50)),
      ]);
      if (!groupSnapshot.exists || groupSnapshot.data()?.active !== true) {
        throw new HttpsError("not-found", "Study group not found.");
      }
      const role = String(membershipSnapshot.data()?.role);
      if (!membershipSnapshot.exists || !["owner", "admin"].includes(role)) {
        throw new HttpsError("permission-denied", "Group administrator role required.");
      }

      const group = groupSnapshot.data() ?? {};
      const previousCompetition = storedRecord(group.competition);
      if (previousCompetition.endsAt instanceof Timestamp &&
        previousCompetition.endsAt.toMillis() > Date.now()) {
        throw new HttpsError("already-exists", "The group already has an active competition.");
      }

      const startsAt = Timestamp.now();
      const endsAt = Timestamp.fromMillis(
        startsAt.toMillis() + durationDays * 24 * 60 * 60 * 1000,
      );
      const scores = Object.fromEntries(memberSnapshots.docs.map((member) => [member.id, 0]));
      const competition = {
        id: groupRef.collection("competitionIds").doc().id,
        name,
        metric,
        startsAt,
        endsAt,
        scores,
        createdBy: uid,
        createdAt: startsAt,
        updatedAt: startsAt,
      };
      transaction.update(groupRef, {competition, updatedAt: startsAt});
      return {groupId, competitionId: competition.id};
    });
  },
);

export const leaveStudyGroup = onCall<StudyGroupInput>(async (request) => {
  const uid = requireUid(request.auth?.uid);
  const groupId = requireDocumentId(request.data?.groupId, "groupId");
  const groupRef = db.collection("groups").doc(groupId);
  const memberRef = groupRef.collection("members").doc(uid);
  const userRef = db.collection("users").doc(uid);

  return db.runTransaction(async (transaction) => {
    const [groupSnapshot, memberSnapshot, userSnapshot] = await transaction.getAll(
      groupRef,
      memberRef,
      userRef,
    );
    if (!groupSnapshot.exists || !memberSnapshot.exists) {
      throw new HttpsError("not-found", "Study group membership not found.");
    }
    const group = groupSnapshot.data() ?? {};
    const memberCount = numberValue(group.memberCount);
    const role = String(memberSnapshot.data()?.role);
    const now = Timestamp.now();

    if (role === "owner" && memberCount > 1) {
      throw new HttpsError(
        "failed-precondition",
        "The owner cannot leave while other members remain.",
      );
    }
    transaction.delete(memberRef);
    if (role === "owner") {
      const joinCode = requireString(group.joinCode, "stored join code", 20);
      transaction.delete(db.collection("groupCodes").doc(joinCode));
      transaction.delete(groupRef);
    } else {
      const competition = removeCompetitionMember(group.competition, uid);
      transaction.update(groupRef, {
        memberCount: Math.max(0, memberCount - 1),
        updatedAt: now,
        ...(competition ? {competition} : {}),
      });
    }
    if (userSnapshot.exists) {
      transaction.update(userRef, {
        groupCount: Math.max(0, numberValue(userSnapshot.data()?.groupCount) - 1),
        updatedAt: now,
      });
    }
    return {groupId, left: true};
  });
});

export const scoreStudyGroupActivity = onDocumentWritten(
  "socialActivities/{activityId}",
  async (event) => {
    const afterSnapshot = event.data?.after;
    if (!afterSnapshot?.exists) return;
    const after = afterSnapshot.data() ?? {};
    const before = event.data?.before.exists ? event.data.before.data() ?? {} : {};
    const actorUid = stringValue(after.actorUid);
    const occurredAt = after.updatedAt instanceof Timestamp ? after.updatedAt : after.createdAt;
    if (!actorUid || !(occurredAt instanceof Timestamp)) return;

    const memberships = await db.collectionGroup("members")
      .where("uid", "==", actorUid)
      .limit(10)
      .get();
    await Promise.all(memberships.docs.map(async (membership) => {
      const groupId = stringValue(membership.data().groupId);
      if (!groupId) return;
      const groupRef = db.collection("groups").doc(groupId);
      const memberRef = groupRef.collection("members").doc(actorUid);

      await db.runTransaction(async (transaction) => {
        const [groupSnapshot, memberSnapshot] = await transaction.getAll(groupRef, memberRef);
        if (!groupSnapshot.exists || !memberSnapshot.exists) return;
        const group = groupSnapshot.data() ?? {};
        const competition = storedCompetition(group.competition);
        if (!competition || occurredAt.toMillis() < competition.startsAt.toMillis() ||
          occurredAt.toMillis() > competition.endsAt.toMillis()) return;

        const scoreDelta = competitionMetricDelta(
          competition.metric,
          studyActivityTotals(before),
          studyActivityTotals(after),
        );
        if (scoreDelta <= 0) return;

        const applicationId = createHash("sha256")
          .update(`${competition.id}:${event.id}`)
          .digest("hex");
        const applicationRef = afterSnapshot.ref
          .collection("competitionApplications")
          .doc(applicationId);
        const applicationSnapshot = await transaction.get(applicationRef);
        if (applicationSnapshot.exists) return;

        const currentScore = numberValue(competition.scores[actorUid]);
        const updatedAt = Timestamp.now();
        transaction.update(groupRef, {
          competition: {
            ...competition,
            scores: {...competition.scores, [actorUid]: currentScore + scoreDelta},
            updatedAt,
          },
        });
        transaction.create(applicationRef, {
          groupId,
          competitionId: competition.id,
          actorUid,
          metric: competition.metric,
          scoreDelta,
          activityEventId: event.id,
          createdAt: updatedAt,
        });
      });
    }));
  },
);

export const getRanking = onCall<GetRankingInput>(async (request) => {
  const uid = requireUid(request.auth?.uid);
  const scope = request.data?.scope;
  if (!["global", "territory", "friends"].includes(String(scope))) {
    throw new HttpsError("invalid-argument", "Invalid ranking scope.");
  }
  const userSnapshot = await db.collection("users").doc(uid).get();
  if (!userSnapshot.exists) {
    throw new HttpsError("failed-precondition", "User profile missing.");
  }
  const user = userSnapshot.data() ?? {};

  if (scope === "friends") {
    const friendships = await db.collection("friends")
      .where("uids", "array-contains", uid)
      .limit(50)
      .get();
    const participantUids = new Set([uid]);
    friendships.docs.forEach((document) => {
      parseStringArray(document.data().uids).forEach((participantUid) =>
        participantUids.add(participantUid),
      );
    });
    const profiles = await db.getAll(...[...participantUids].map((participantUid) =>
      db.collection("users").doc(participantUid),
    ));
    const ranked = rankEntries(profiles.flatMap((profile) => profile.exists ? [{
      uid: profile.id,
      score: numberValue(profile.data()?.xp),
      data: profile.data() ?? {},
    }] : []));
    const entries = ranked.map((entry) =>
      serializeRankingEntry(entry.uid, entry.data, entry.position, uid),
    );
    return {
      scope,
      period: "all_time",
      territoryLabel: null,
      entries,
      viewer: entries.find((entry) => entry.uid === uid) ?? null,
    };
  }

  const territory = parseTerritory(user.territorySelection);
  const territoryKeys = parseStringArray(user.territoryKeys).length > 0 ?
    parseStringArray(user.territoryKeys) : buildTerritoryKeys(territory);
  const territoryKey = mostSpecificTerritoryKey(territoryKeys);
  const rankingQuery = scope === "territory" ?
    db.collection("users")
      .where("territoryKeys", "array-contains", territoryKey)
      .orderBy("xp", "desc")
      .limit(25) :
    db.collection("users").orderBy("xp", "desc").limit(25);
  const rankingSnapshot = await rankingQuery.get();
  const ranked = rankEntries(rankingSnapshot.docs.map((document) => ({
    uid: document.id,
    score: numberValue(document.data().xp),
    data: document.data(),
  })));
  const entries = ranked.map((entry) =>
    serializeRankingEntry(entry.uid, entry.data, entry.position, uid),
  );
  let viewer = entries.find((entry) => entry.uid === uid) ?? null;
  if (!viewer) {
    const higherScores = scope === "territory" ?
      await db.collection("users")
        .where("territoryKeys", "array-contains", territoryKey)
        .where("xp", ">", numberValue(user.xp))
        .count()
        .get() :
      await db.collection("users")
        .where("xp", ">", numberValue(user.xp))
        .count()
        .get();
    viewer = serializeRankingEntry(
      uid,
      user,
      higherScores.data().count + 1,
      uid,
    );
  }
  return {
    scope,
    period: "all_time",
    territoryLabel: scope === "territory" ? territory.label : null,
    entries,
    viewer,
  };
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

export const sendFriendDuelInvitation = onCall<SendFriendDuelInvitationInput>(async (request) => {
  const uid = requireUid(request.auth?.uid);
  const friendUid = requireString(request.data?.friendUid, "friendUid", 160);
  if (uid === friendUid) {
    throw new HttpsError("invalid-argument", "You cannot challenge yourself.");
  }

  const invitationId = socialEdgeId(uid, friendUid);
  const friendRef = db.collection("friends").doc(invitationId);
  const invitationRef = db.collection("duelInvitations").doc(invitationId);
  const fromRef = db.collection("users").doc(uid);
  const toRef = db.collection("users").doc(friendUid);

  return db.runTransaction(async (transaction) => {
    const [friendship, existingInvitation, fromUser, toUser] = await Promise.all([
      transaction.get(friendRef),
      transaction.get(invitationRef),
      transaction.get(fromRef),
      transaction.get(toRef),
    ]);
    if (!friendship.exists || !parseStringArray(friendship.data()?.uids).includes(uid)) {
      throw new HttpsError("failed-precondition", "Only friends can challenge each other.");
    }
    if (!fromUser.exists || !toUser.exists) {
      throw new HttpsError("failed-precondition", "Friend profile missing.");
    }
    const now = Timestamp.now();
    const existingData = existingInvitation.data() ?? {};
    const existingExpiresAt = existingData.expiresAt;
    const existingIsOpen = ["pending", "active"].includes(String(existingData.status)) &&
      (!(existingExpiresAt instanceof Timestamp) || existingExpiresAt.toMillis() > now.toMillis());
    if (existingIsOpen) {
      throw new HttpsError("already-exists", "There is already an active challenge.");
    }

    const data = {
      fromUid: uid,
      toUid: friendUid,
      fromUser: serializeSocialUser(uid, fromUser.data() ?? {}),
      toUser: serializeSocialUser(friendUid, toUser.data() ?? {}),
      status: "pending",
      duelId: null,
      submittedUids: [],
      createdAt: now,
      updatedAt: now,
      expiresAt: Timestamp.fromMillis(now.toMillis() + friendDuelLifetimeMs),
    };
    transaction.set(invitationRef, data);
    return {invitation: serializeDuelInvitation(invitationId, data, uid)};
  });
});

export const respondFriendDuelInvitation = onCall<RespondFriendDuelInvitationInput>(
  async (request) => {
    const uid = requireUid(request.auth?.uid);
    const invitationId = requireString(request.data?.invitationId, "invitationId", 340);
    if (typeof request.data?.accept !== "boolean") {
      throw new HttpsError("invalid-argument", "Invalid duel invitation response.");
    }
    const invitationRef = db.collection("duelInvitations").doc(invitationId);

    if (!request.data.accept) {
      return db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(invitationRef);
        if (!snapshot.exists || snapshot.data()?.toUid !== uid) {
          throw new HttpsError("permission-denied", "This invitation is not for you.");
        }
        if (snapshot.data()?.status !== "pending") {
          throw new HttpsError("failed-precondition", "Invitation already resolved.");
        }
        transaction.update(invitationRef, {
          status: "declined",
          updatedAt: Timestamp.now(),
        });
        return {declined: true};
      });
    }

    const initialInvitation = await invitationRef.get();
    if (!initialInvitation.exists || initialInvitation.data()?.toUid !== uid) {
      throw new HttpsError("permission-denied", "This invitation is not for you.");
    }
    if (initialInvitation.data()?.status !== "pending") {
      throw new HttpsError("failed-precondition", "Invitation already resolved.");
    }
    if (duelInvitationExpired(initialInvitation.data() ?? {})) {
      throw new HttpsError("deadline-exceeded", "Invitation expired.");
    }
    const fromUid = requireString(initialInvitation.data()?.fromUid, "stored fromUid", 160);
    const [fromUser, toUser] = await Promise.all([
      db.collection("users").doc(fromUid).get(),
      db.collection("users").doc(uid).get(),
    ]);
    if (!fromUser.exists || !toUser.exists) {
      throw new HttpsError("failed-precondition", "Friend profile missing.");
    }
    const fromData = fromUser.data() ?? {};
    const toData = toUser.data() ?? {};
    const oppositionId = requireString(fromData.oppositionId, "stored oppositionId", 80);
    if (toData.oppositionId !== oppositionId) {
      throw new HttpsError("failed-precondition", "Both players must prepare the same opposition.");
    }
    const sharedTerritoryKeys = commonTerritoryKeys(
      buildTerritoryKeys(parseTerritory(fromData.territorySelection)),
      buildTerritoryKeys(parseTerritory(toData.territorySelection)),
    );
    if (sharedTerritoryKeys.length === 0) {
      throw new HttpsError("failed-precondition", "The players have no compatible content.");
    }
    const questions = await db.collection("questions")
      .where("oppositionId", "==", oppositionId)
      .where("status", "==", "published")
      .where("verified", "==", true)
      .where("territoryKeys", "array-contains-any", sharedTerritoryKeys.slice(0, 10))
      .orderBy("difficulty", "asc")
      .limit(10)
      .get();
    if (questions.empty) {
      throw new HttpsError("not-found", "No compatible questions found.");
    }

    const duelRef = db.collection("duels").doc();
    const friendRef = db.collection("friends").doc(socialEdgeId(fromUid, uid));
    const now = Timestamp.now();
    const accepted = await db.runTransaction(async (transaction) => {
      const [invitation, friendship, freshFromUser, freshToUser] = await Promise.all([
        transaction.get(invitationRef),
        transaction.get(friendRef),
        transaction.get(db.collection("users").doc(fromUid)),
        transaction.get(db.collection("users").doc(uid)),
      ]);
      if (!invitation.exists || invitation.data()?.toUid !== uid) {
        throw new HttpsError("permission-denied", "This invitation is not for you.");
      }
      if (invitation.data()?.status !== "pending") {
        throw new HttpsError("failed-precondition", "Invitation already resolved.");
      }
      if (duelInvitationExpired(invitation.data() ?? {})) {
        throw new HttpsError("deadline-exceeded", "Invitation expired.");
      }
      if (!friendship.exists || !freshFromUser.exists || !freshToUser.exists) {
        throw new HttpsError("failed-precondition", "Friendship is no longer available.");
      }
      const friendshipUids = parseStringArray(friendship.data()?.uids);
      if (!friendshipUids.includes(fromUid) || !friendshipUids.includes(uid)) {
        throw new HttpsError("failed-precondition", "Friendship is no longer available.");
      }
      const freshFromData = freshFromUser.data() ?? {};
      const freshToData = freshToUser.data() ?? {};
      if (freshFromData.oppositionId !== oppositionId || freshToData.oppositionId !== oppositionId) {
        throw new HttpsError("failed-precondition", "Player opposition changed.");
      }
      const freshSharedTerritoryKeys = commonTerritoryKeys(
        buildTerritoryKeys(parseTerritory(freshFromData.territorySelection)),
        buildTerritoryKeys(parseTerritory(freshToData.territorySelection)),
      );
      if (freshSharedTerritoryKeys.join("|") !== sharedTerritoryKeys.join("|")) {
        throw new HttpsError("failed-precondition", "Player territory changed.");
      }
      const players = [
        serializeSocialUser(fromUid, freshFromData),
        serializeSocialUser(uid, freshToData),
      ];
      transaction.set(duelRef, {
        participantUids: [fromUid, uid],
        mode: "classic_friend",
        invitationId,
        players,
        oppositionId,
        territoryKeys: sharedTerritoryKeys,
        questionIds: questions.docs.map((document) => document.id),
        starts: [],
        submissions: [],
        status: "active",
        createdAt: invitation.data()?.createdAt ?? now,
        acceptedAt: now,
        completedAt: null,
      });
      const update = {
        status: "active",
        duelId: duelRef.id,
        submittedUids: [],
        updatedAt: now,
        expiresAt: Timestamp.fromMillis(now.toMillis() + friendDuelLifetimeMs),
      };
      transaction.update(invitationRef, update);
      return serializeDuelInvitation(
        invitationId,
        {...(invitation.data() ?? {}), ...update},
        uid,
      );
    });
    return {invitation: accepted};
  },
);

export const joinMatchmaking = onCall(async (request) => {
  const uid = requireUid(request.auth?.uid);
  const entryRef = db.collection("matchmakingEntries").doc(uid);
  const [userSnapshot, existingEntry] = await Promise.all([
    db.collection("users").doc(uid).get(),
    entryRef.get(),
  ]);
  if (!userSnapshot.exists) {
    throw new HttpsError("failed-precondition", "User profile missing.");
  }
  const user = userSnapshot.data() ?? {};
  if (!user.usernameKey) {
    throw new HttpsError("failed-precondition", "Choose a username before finding a rival.");
  }
  const rating = normalizedRating(user.duelRating);
  const now = Timestamp.now();
  const existingData = existingEntry.data() ?? {};
  if (existingData.status === "matched" &&
    !matchmakingEntryExpired(existingData)) {
    return {matchmaking: serializeMatchmakingEntry(existingData, uid, rating)};
  }

  const oppositionId = requireString(user.oppositionId, "stored oppositionId", 80);
  const territoryKeys = buildTerritoryKeys(parseTerritory(user.territorySelection));
  const candidatesSnapshot = await db.collection("matchmakingEntries")
    .where("oppositionId", "==", oppositionId)
    .where("status", "==", "waiting")
    .orderBy("createdAt", "asc")
    .limit(50)
    .get();
  const candidates = candidatesSnapshot.docs
    .filter((document) => document.id !== uid && !matchmakingEntryExpired(document.data()))
    .map((document) => ({id: document.id, data: document.data()}))
    .filter((candidate) => {
      const candidateCreatedAt = candidate.data.createdAt;
      const waitMs = candidateCreatedAt instanceof Timestamp ?
        Math.max(0, now.toMillis() - candidateCreatedAt.toMillis()) : 0;
      const ownCreatedAt = existingData.status === "waiting" &&
        !matchmakingEntryExpired(existingData) &&
        existingData.createdAt instanceof Timestamp ? existingData.createdAt : now;
      const ownWaitMs = Math.max(0, now.toMillis() - ownCreatedAt.toMillis());
      return commonTerritoryKeys(territoryKeys, parseStringArray(candidate.data.territoryKeys))
        .length > 0 && ratingsAreCompatible(
        rating,
        normalizedRating(candidate.data.rating),
        ownWaitMs,
        waitMs,
      );
    })
    .sort((first, second) => {
      const firstDifference = Math.abs(rating - normalizedRating(first.data.rating));
      const secondDifference = Math.abs(rating - normalizedRating(second.data.rating));
      return firstDifference - secondDifference;
    });

  const candidate = candidates[0];
  if (!candidate) {
    const waiting = await db.runTransaction(async (transaction) => {
      const freshEntry = await transaction.get(entryRef);
      const freshData = freshEntry.data() ?? {};
      if (freshData.status === "matched" &&
        !matchmakingEntryExpired(freshData)) {
        return freshData;
      }
      const createdAt = freshData.status === "waiting" &&
        !matchmakingEntryExpired(freshData) &&
        freshData.createdAt instanceof Timestamp ? freshData.createdAt : now;
      const data = {
        uid,
        status: "waiting",
        oppositionId,
        territoryKeys,
        rating,
        user: serializeSocialUser(uid, user),
        duelId: null,
        opponent: null,
        submittedUids: [],
        createdAt,
        updatedAt: now,
        expiresAt: Timestamp.fromMillis(createdAt.toMillis() + matchmakingLifetimeMs),
      };
      transaction.set(entryRef, data);
      return data;
    });
    return {matchmaking: serializeMatchmakingEntry(waiting, uid, rating)};
  }

  const candidateRef = db.collection("matchmakingEntries").doc(candidate.id);
  const candidateUserRef = db.collection("users").doc(candidate.id);
  const candidateUserSnapshot = await candidateUserRef.get();
  if (!candidateUserSnapshot.exists) {
    throw new HttpsError("failed-precondition", "Rival profile missing.");
  }
  const candidateUser = candidateUserSnapshot.data() ?? {};
  const sharedTerritoryKeys = commonTerritoryKeys(
    territoryKeys,
    buildTerritoryKeys(parseTerritory(candidateUser.territorySelection)),
  );
  if (sharedTerritoryKeys.length === 0) {
    throw new HttpsError("aborted", "The rival is no longer compatible. Try again.");
  }
  const questions = await db.collection("questions")
    .where("oppositionId", "==", oppositionId)
    .where("status", "==", "published")
    .where("verified", "==", true)
    .where("territoryKeys", "array-contains-any", sharedTerritoryKeys.slice(0, 10))
    .orderBy("difficulty", "asc")
    .limit(10)
    .get();
  if (questions.empty) {
    throw new HttpsError("not-found", "No compatible questions found.");
  }

  const duelRef = db.collection("duels").doc();
  const matched = await db.runTransaction(async (transaction) => {
    const [freshEntry, freshCandidate, freshUser, freshCandidateUser] = await Promise.all([
      transaction.get(entryRef),
      transaction.get(candidateRef),
      transaction.get(db.collection("users").doc(uid)),
      transaction.get(candidateUserRef),
    ]);
    const freshEntryData = freshEntry.data() ?? {};
    if (freshEntryData.status === "matched" &&
      !matchmakingEntryExpired(freshEntryData)) {
      return freshEntryData;
    }
    const freshCandidateData = freshCandidate.data() ?? {};
    if (!freshCandidate.exists || freshCandidateData.status !== "waiting" ||
      matchmakingEntryExpired(freshCandidateData) || !freshUser.exists ||
      !freshCandidateUser.exists) {
      throw new HttpsError("aborted", "The rival is no longer available. Try again.");
    }
    const freshUserData = freshUser.data() ?? {};
    const freshCandidateUserData = freshCandidateUser.data() ?? {};
    if (freshUserData.oppositionId !== oppositionId ||
      freshCandidateUserData.oppositionId !== oppositionId) {
      throw new HttpsError("failed-precondition", "Player opposition changed.");
    }
    const freshSharedTerritoryKeys = commonTerritoryKeys(
      buildTerritoryKeys(parseTerritory(freshUserData.territorySelection)),
      buildTerritoryKeys(parseTerritory(freshCandidateUserData.territorySelection)),
    );
    const candidateCreatedAt = freshCandidateData.createdAt;
    const ownCreatedAt = freshEntryData.status === "waiting" &&
      !matchmakingEntryExpired(freshEntryData) &&
      freshEntryData.createdAt instanceof Timestamp ? freshEntryData.createdAt : now;
    if (freshSharedTerritoryKeys.join("|") !== sharedTerritoryKeys.join("|") ||
      !(candidateCreatedAt instanceof Timestamp) ||
      !ratingsAreCompatible(
        normalizedRating(freshUserData.duelRating),
        normalizedRating(freshCandidateUserData.duelRating),
        Math.max(0, now.toMillis() - ownCreatedAt.toMillis()),
        Math.max(0, now.toMillis() - candidateCreatedAt.toMillis()),
      )) {
      throw new HttpsError("aborted", "The rival is no longer compatible. Try again.");
    }

    const players = [
      serializeSocialUser(uid, freshUserData),
      serializeSocialUser(candidate.id, freshCandidateUserData),
    ];
    transaction.set(duelRef, {
      participantUids: [uid, candidate.id],
      mode: "classic_matchmaking",
      players,
      oppositionId,
      territoryKeys: freshSharedTerritoryKeys,
      questionIds: questions.docs.map((document) => document.id),
      starts: [],
      submissions: [],
      status: "active",
      createdAt: now,
      acceptedAt: now,
      completedAt: null,
    });
    const expiresAt = Timestamp.fromMillis(now.toMillis() + friendDuelLifetimeMs);
    const ownData = {
      uid,
      status: "matched",
      oppositionId,
      territoryKeys: freshSharedTerritoryKeys,
      rating: normalizedRating(freshUserData.duelRating),
      user: players[0],
      duelId: duelRef.id,
      opponent: players[1],
      submittedUids: [],
      createdAt: ownCreatedAt,
      matchedAt: now,
      updatedAt: now,
      expiresAt,
    };
    const candidateData = {
      uid: candidate.id,
      status: "matched",
      oppositionId,
      territoryKeys: freshSharedTerritoryKeys,
      rating: normalizedRating(freshCandidateUserData.duelRating),
      user: players[1],
      duelId: duelRef.id,
      opponent: players[0],
      submittedUids: [],
      createdAt: candidateCreatedAt,
      matchedAt: now,
      updatedAt: now,
      expiresAt,
    };
    transaction.set(entryRef, ownData);
    transaction.set(candidateRef, candidateData);
    return ownData;
  });
  return {matchmaking: serializeMatchmakingEntry(matched, uid, rating)};
});

export const getMatchmakingStatus = onCall(async (request) => {
  const uid = requireUid(request.auth?.uid);
  const [entry, user] = await Promise.all([
    db.collection("matchmakingEntries").doc(uid).get(),
    db.collection("users").doc(uid).get(),
  ]);
  const rating = normalizedRating(user.data()?.duelRating);
  if (!entry.exists || matchmakingEntryExpired(entry.data() ?? {})) {
    return {matchmaking: {status: "idle", rating}};
  }
  return {matchmaking: serializeMatchmakingEntry(entry.data() ?? {}, uid, rating)};
});

export const leaveMatchmaking = onCall(async (request) => {
  const uid = requireUid(request.auth?.uid);
  const entryRef = db.collection("matchmakingEntries").doc(uid);
  await db.runTransaction(async (transaction) => {
    const entry = await transaction.get(entryRef);
    if (!entry.exists || entry.data()?.status !== "waiting") return;
    transaction.update(entryRef, {status: "cancelled", updatedAt: Timestamp.now()});
  });
  const user = await db.collection("users").doc(uid).get();
  return {matchmaking: {status: "idle", rating: normalizedRating(user.data()?.duelRating)}};
});

export const openFriendDuel = onCall<OpenFriendDuelInput>(async (request) => {
  const uid = requireUid(request.auth?.uid);
  const duelId = requireString(request.data?.duelId, "duelId", 160);
  const duelRef = db.collection("duels").doc(duelId);

  const duel = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(duelRef);
    if (!snapshot.exists) throw new HttpsError("not-found", "Duel not found.");
    const data = snapshot.data() ?? {};
    if (!["classic_friend", "classic_matchmaking"].includes(String(data.mode)) ||
      !parseStringArray(data.participantUids).includes(uid)) {
      throw new HttpsError("permission-denied", "Not your duel.");
    }
    if (!["active", "completed"].includes(String(data.status))) {
      throw new HttpsError("failed-precondition", "Duel is not available.");
    }
    const acceptedAt = data.acceptedAt;
    if (!(acceptedAt instanceof Timestamp) ||
      (data.status === "active" && Date.now() - acceptedAt.toMillis() > friendDuelLifetimeMs)) {
      throw new HttpsError("deadline-exceeded", "Duel expired.");
    }
    const starts = friendDuelEntries(data.starts);
    if (data.status === "active" && !starts.some((entry) => entry.uid === uid)) {
      const updatedStarts = [...starts, {uid, startedAt: Timestamp.now()}];
      transaction.update(duelRef, {starts: updatedStarts});
      return {...data, starts: updatedStarts};
    }
    return data;
  });

  const userSnapshot = await db.collection("users").doc(uid).get();
  if (!userSnapshot.exists) throw new HttpsError("failed-precondition", "User profile missing.");
  const submissions = friendDuelEntries(duel.submissions);
  const viewerSubmission = submissions.find((entry) => entry.uid === uid);
  const opponentSubmission = submissions.find((entry) => entry.uid !== uid);
  const questionIds = parseQuestionIds(duel.questionIds);
  const questionSnapshots = viewerSubmission ? [] : await Promise.all(
    questionIds.map((id) => db.collection("questions").doc(id).get()),
  );
  const questions = questionSnapshots.map((snapshot) => {
    if (!snapshot.exists) throw new HttpsError("failed-precondition", "Question missing.");
    return publicQuestion(snapshot.id, snapshot.data() as QuestionDoc);
  });

  return {
    duelId,
    status: friendDuelViewStatus(duel.status, Boolean(viewerSubmission), Boolean(opponentSubmission)),
    opponent: friendDuelOpponent(duel.players, uid),
    questions,
    result: viewerSubmission?.result ?? null,
    duel: duel.status === "completed" ? serializeCompletedFriendDuel(duelId, duel, uid) : null,
    progress: serializeProgress(userSnapshot.data() ?? {}),
  };
});

export const submitFriendDuel = onCall<SubmitFriendDuelInput>(async (request) => {
  const uid = requireUid(request.auth?.uid);
  const duelId = requireString(request.data?.duelId, "duelId", 160);
  const submittedAnswers = parseAnswers(request.data?.answers);
  const duelRef = db.collection("duels").doc(duelId);
  const [missionTemplates, rewardSchedule] = await Promise.all([
    activeMissionTemplates(),
    activeDailyRewards(),
  ]);

  return db.runTransaction(async (transaction) => {
    const duelSnapshot = await transaction.get(duelRef);
    if (!duelSnapshot.exists) throw new HttpsError("not-found", "Duel not found.");
    const duel = duelSnapshot.data() ?? {};
    const participantUids = parseStringArray(duel.participantUids);
    if (!["classic_friend", "classic_matchmaking"].includes(String(duel.mode)) ||
      !participantUids.includes(uid)) {
      throw new HttpsError("permission-denied", "Not your duel.");
    }
    if (duel.status !== "active") {
      throw new HttpsError("failed-precondition", "Duel already completed.");
    }
    const acceptedAt = duel.acceptedAt;
    if (!(acceptedAt instanceof Timestamp) ||
      Date.now() - acceptedAt.toMillis() > friendDuelLifetimeMs) {
      throw new HttpsError("deadline-exceeded", "Duel expired.");
    }
    const submissions = friendDuelEntries(duel.submissions);
    if (submissions.some((entry) => entry.uid === uid)) {
      throw new HttpsError("failed-precondition", "Duel already submitted.");
    }
    const start = friendDuelEntries(duel.starts).find((entry) => entry.uid === uid)?.startedAt;
    if (!(start instanceof Timestamp)) {
      throw new HttpsError("failed-precondition", "Open the duel before submitting it.");
    }

    const opponentUid = participantUids.find((participantUid) => participantUid !== uid);
    if (!opponentUid) throw new HttpsError("failed-precondition", "Opponent missing.");
    const questionIds = parseQuestionIds(duel.questionIds);
    const allowedQuestionIds = new Set(questionIds);
    if (submittedAnswers.some((answer) => !allowedQuestionIds.has(answer.questionId))) {
      throw new HttpsError("invalid-argument", "Answer contains an unknown question.");
    }

    const userRef = db.collection("users").doc(uid);
    const opponentRef = db.collection("users").doc(opponentUid);
    const questionRefs = questionIds.map((id) => db.collection("questions").doc(id));
    const statRefs = questionIds.map((id) => userRef.collection("questionStats").doc(id));
    const completedAt = Timestamp.now();
    const date = madridDay(completedAt.toDate());
    const missionRefs = missionTemplates.map((mission) =>
      userRef.collection("missions").doc(missionDocumentId(date, mission.id)),
    );
    const [userSnapshot, opponentSnapshot, questionSnapshots, statSnapshots, missionSnapshots] =
      await Promise.all([
        transaction.get(userRef),
        transaction.get(opponentRef),
        Promise.all(questionRefs.map((reference) => transaction.get(reference))),
        Promise.all(statRefs.map((reference) => transaction.get(reference))),
        Promise.all(missionRefs.map((reference) => transaction.get(reference))),
      ]);
    if (!userSnapshot.exists || !opponentSnapshot.exists) {
      throw new HttpsError("failed-precondition", "Player profile missing.");
    }

    const questions = questionSnapshots.map((snapshot) => {
      if (!snapshot.exists) throw new HttpsError("failed-precondition", "Question missing.");
      return {id: snapshot.id, data: snapshot.data() as QuestionDoc};
    });
    const scored = scoreStoredQuestions(questions, submittedAnswers);
    const elapsedMs = Math.min(Math.max(0, completedAt.toMillis() - start.toMillis()), 3_600_000);
    const previousSubmission = submissions.find((entry) => entry.uid === opponentUid);
    const isCompleted = Boolean(previousSubmission);
    const outcome = previousSubmission ? duelOutcome(
      scored.correct,
      elapsedMs,
      numberValue(previousSubmission.correct),
      numberValue(previousSubmission.elapsedMs),
    ) : null;
    const outcomeXp = outcome === "win" ? 20 : outcome === "draw" ? 10 : 0;
    const outcomeCoins = outcome === "win" ? 10 : outcome === "draw" ? 5 : 0;
    const baseXp = scored.correct * 10 + 20 + (scored.percentage >= 0.8 ? 10 : 0);
    const baseCoins = scored.correct * 2 + 5;
    const xpEarned = baseXp + outcomeXp;
    const coinsEarned = baseCoins + outcomeCoins;
    const user = userSnapshot.data() ?? {};
    const previousStreak = numberValue(user.currentStreak);
    const streak = nextStreak(previousStreak, user.lastValidActivityDate, completedAt);
    const xp = numberValue(user.xp) + xpEarned;
    const coins = numberValue(user.coins) + coinsEarned;
    const profileUpdate: Record<string, unknown> = {
      xp,
      level: Math.floor(Math.sqrt(xp / 100)) + 1,
      coins,
      currentStreak: streak,
      bestStreak: Math.max(numberValue(user.bestStreak), streak),
      totalQuestions: numberValue(user.totalQuestions) + questions.length,
      correctAnswers: numberValue(user.correctAnswers) + scored.correct,
      testsCompleted: numberValue(user.testsCompleted) + 1,
      duelsPlayed: numberValue(user.duelsPlayed) + (isCompleted ? 1 : 0),
      duelWins: numberValue(user.duelWins) + (outcome === "win" ? 1 : 0),
      duelLosses: numberValue(user.duelLosses) + (outcome === "loss" ? 1 : 0),
      duelDraws: numberValue(user.duelDraws) + (outcome === "draw" ? 1 : 0),
      lastValidActivityDate: completedAt,
      updatedAt: completedAt,
    };
    transaction.update(userRef, profileUpdate);

    statSnapshots.forEach((snapshot, index) => {
      const attempt = scored.attempts[index];
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

    const missions = missionTemplates.map((template, index) => {
      const previous = missionSnapshots[index].data() ?? {};
      const progress = Math.min(
        template.target,
        numberValue(previous.progress) +
          missionProgressIncrement(template.type, questions.length, scored.correct, false),
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
      attempts: scored.attempts,
      correct: scored.correct,
      incorrect: scored.incorrect,
      blank: scored.blank,
      points: scored.correct,
      percentage: scored.percentage,
      xpEarned,
      coinsEarned,
      completedAt: completedAt.toDate().toISOString(),
    };
    let updatedSubmissions = [...submissions, {
      uid,
      correct: scored.correct,
      elapsedMs,
      result,
      submittedAt: completedAt,
    }];
    let duelResult = null;
    let opponentActivityUpdate: Record<string, unknown> | null = null;
    if (previousSubmission && outcome) {
      const opponentOutcome = oppositeOutcome(outcome);
      const opponentBonusXp = opponentOutcome === "win" ? 20 : opponentOutcome === "draw" ? 10 : 0;
      const opponentBonusCoins = opponentOutcome === "win" ? 10 :
        opponentOutcome === "draw" ? 5 : 0;
      const opponent = opponentSnapshot.data() ?? {};
      const opponentXp = numberValue(opponent.xp) + opponentBonusXp;
      const opponentUpdate: Record<string, unknown> = {
        xp: opponentXp,
        level: Math.floor(Math.sqrt(opponentXp / 100)) + 1,
        coins: numberValue(opponent.coins) + opponentBonusCoins,
        duelsPlayed: numberValue(opponent.duelsPlayed) + 1,
        duelWins: numberValue(opponent.duelWins) + (opponentOutcome === "win" ? 1 : 0),
        duelLosses: numberValue(opponent.duelLosses) + (opponentOutcome === "loss" ? 1 : 0),
        duelDraws: numberValue(opponent.duelDraws) + (opponentOutcome === "draw" ? 1 : 0),
        updatedAt: completedAt,
      };
      if (duel.mode === "classic_matchmaking") {
        const ratings = updatedRatings(user.duelRating, opponent.duelRating, outcome);
        profileUpdate.duelRating = ratings.first;
        opponentUpdate.duelRating = ratings.second;
      }
      transaction.update(userRef, profileUpdate);
      transaction.update(opponentRef, opponentUpdate);
      const previousResult = storedRecord(previousSubmission.result);
      opponentActivityUpdate = {
        outcome: opponentOutcome,
        xpEarned: numberValue(previousResult.xpEarned) + opponentBonusXp,
        duelCompleted: true,
        updatedAt: completedAt,
      };
      updatedSubmissions = updatedSubmissions.map((submission) => submission.uid === opponentUid ? {
        ...submission,
        outcome: opponentOutcome,
        result: {
          ...previousResult,
          xpEarned: numberValue(previousResult.xpEarned) + opponentBonusXp,
          coinsEarned: numberValue(previousResult.coinsEarned) + opponentBonusCoins,
        },
      } : submission.uid === uid ? {...submission, outcome} : submission);
      duelResult = {
        duelId,
        kind: duel.mode === "classic_matchmaking" ? "matchmaking" : "friend",
        opponent: friendDuelOpponent(duel.players, uid),
        outcome,
        playerCorrect: scored.correct,
        opponentCorrect: numberValue(previousSubmission.correct),
        playerElapsedMs: elapsedMs,
        opponentElapsedMs: numberValue(previousSubmission.elapsedMs),
      };
      if (opponentBonusCoins > 0) {
        transaction.set(db.collection("currencyTransactions").doc(), {
          uid: opponentUid,
          type: "duel_reward",
          currency: "coins",
          amount: opponentBonusCoins,
          balanceAfter: numberValue(opponent.coins) + opponentBonusCoins,
          sourceId: `${duelId}_outcome`,
          createdAt: completedAt,
        });
      }
    }

    transaction.update(duelRef, {
      submissions: updatedSubmissions,
      status: isCompleted ? "completed" : "active",
      completedAt: isCompleted ? completedAt : null,
      updatedAt: completedAt,
    });
    if (duel.mode === "classic_friend") {
      const invitationId = requireString(duel.invitationId, "stored invitationId", 340);
      transaction.update(db.collection("duelInvitations").doc(invitationId), {
        status: isCompleted ? "completed" : "active",
        submittedUids: updatedSubmissions.map((submission) => submission.uid),
        updatedAt: completedAt,
      });
    } else {
      participantUids.forEach((participantUid) => {
        transaction.update(db.collection("matchmakingEntries").doc(participantUid), {
          status: isCompleted ? "completed" : "matched",
          submittedUids: updatedSubmissions.map((submission) => submission.uid),
          updatedAt: completedAt,
        });
      });
    }
    transaction.set(db.collection("currencyTransactions").doc(), {
      uid,
      type: "duel_reward",
      currency: "coins",
      amount: coinsEarned,
      balanceAfter: coins,
      sourceId: duelId,
      createdAt: completedAt,
    });
    transaction.set(db.collection("socialActivities").doc(`duel_${duelId}_${uid}`), {
      actorUid: uid,
      type: "duel_completed",
      mode: duel.mode === "classic_matchmaking" ? "matchmaking" : "friend",
      outcome,
      xpEarned,
      correct: scored.correct,
      total: questions.length,
      duelCompleted: isCompleted,
      streak,
      oppositionId: stringValue(user.oppositionId),
      createdAt: completedAt,
    });
    if (previousSubmission && opponentActivityUpdate) {
      transaction.set(db.collection("socialActivities").doc(`duel_${duelId}_${opponentUid}`), {
        ...opponentActivityUpdate,
      }, {merge: true});
    }

    return {
      status: isCompleted ? "completed" : "waiting",
      result,
      duel: duelResult,
      progress: serializeProgress({...user, ...profileUpdate}),
      engagement: {
        dailyReward: dailyRewardFor(
          user.dailyRewardDay,
          user.lastDailyRewardDate,
          date,
          rewardSchedule,
        ),
        missions,
      },
    };
  });
});

function requireUid(uid: string | undefined): string {
  if (!uid) throw new HttpsError("unauthenticated", "Authentication required.");
  return uid;
}

function requireAdmin(snapshot: DocumentSnapshot): void {
  if (!snapshot.exists || snapshot.data()?.role !== "admin") {
    throw new HttpsError("permission-denied", "Administrator role required.");
  }
}

function requireString(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== "string" || value.trim().length === 0 || value.length > maxLength) {
    throw new HttpsError("invalid-argument", `Invalid ${field}.`);
  }
  return value.trim();
}

function requireDocumentId(value: unknown, field: string): string {
  const id = requireString(value, field, 160);
  if (!/^[A-Za-z0-9_-]+$/.test(id)) {
    throw new HttpsError("invalid-argument", `Invalid ${field}.`);
  }
  return id;
}

function optionalString(value: unknown, field: string, maxLength = 100): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return requireString(value, field, maxLength);
}

function requireInteger(value: unknown, field: string, minimum: number, maximum: number): number {
  if (!Number.isInteger(value) || Number(value) < minimum || Number(value) > maximum) {
    throw new HttpsError("invalid-argument", `Invalid ${field}.`);
  }
  return Number(value);
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
  return Math.min(Number(value), maxQuickQuestionCount);
}

function parseQuestionIds(value: unknown): string[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > maxSessionQuestionCount) {
    throw new HttpsError("failed-precondition", "Invalid session questions.");
  }
  const ids = value.map((id) => requireString(id, "questionId", 160));
  if (new Set(ids).size !== ids.length) {
    throw new HttpsError("failed-precondition", "Duplicate session questions.");
  }
  return ids;
}

function parseAnswers(value: unknown): Answer[] {
  if (!Array.isArray(value) || value.length > maxSessionQuestionCount) {
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

function serializeOfficialExam(exam: OfficialExamCatalogItem) {
  return {
    id: exam.id,
    oppositionId: exam.oppositionId,
    name: exam.name,
    date: exam.date,
    year: exam.year,
    territoryKeys: exam.territoryKeys,
    source: exam.source,
    rules: exam.rules,
  };
}

function storedOfficialExamRules(value: unknown, questionCount: number): OfficialExamRules {
  const data = storedRecord(value);
  const rules = {
    questionCount: Number(data.questionCount),
    durationSeconds: Number(data.durationSeconds),
    correctPoints: Number(data.correctPoints),
    incorrectPenalty: Number(data.incorrectPenalty),
    blankPoints: Number(data.blankPoints),
  };
  if (
    !Number.isInteger(rules.questionCount) ||
    rules.questionCount !== questionCount ||
    !Number.isInteger(rules.durationSeconds) ||
    rules.durationSeconds < 60 ||
    ![rules.correctPoints, rules.incorrectPenalty, rules.blankPoints]
      .every((entry) => Number.isFinite(entry) && entry >= 0)
  ) {
    throw new HttpsError("failed-precondition", "Official exam rules are invalid.");
  }
  return rules;
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

function reviewedQuizQuestion(id: string, question: QuestionDoc) {
  return {
    ...publicQuestion(id, question),
    correctAnswerId: question.correctAnswerId,
    explanation: question.explanation,
  };
}

type AdminQuestionDuplicate = {
  id: string;
  status: string;
  statement: string;
};

async function questionDuplicateMap(
  snapshots: Array<DocumentSnapshot<Record<string, unknown>>>,
): Promise<Map<string, AdminQuestionDuplicate[]>> {
  const fingerprints = [...new Set(snapshots
    .map((snapshot) => stringValue(snapshot.data()?.contentFingerprint))
    .filter(Boolean))];
  const result = new Map<string, AdminQuestionDuplicate[]>();
  for (const fingerprintChunk of chunks(fingerprints, 30)) {
    const duplicateSnapshot = await db.collection("questions")
      .where("contentFingerprint", "in", fingerprintChunk)
      .limit(200)
      .get();
    duplicateSnapshot.docs.forEach((snapshot) => {
      const data = snapshot.data();
      const fingerprint = stringValue(data.contentFingerprint);
      const duplicates = result.get(fingerprint) ?? [];
      duplicates.push({
        id: snapshot.id,
        status: stringValue(data.status),
        statement: stringValue(data.statement),
      });
      result.set(fingerprint, duplicates);
    });
  }
  return result;
}

function authProvider(firebaseClaim: unknown): string | null {
  if (!firebaseClaim || typeof firebaseClaim !== "object") return null;
  const provider = (firebaseClaim as {sign_in_provider?: unknown}).sign_in_provider;
  return typeof provider === "string" ? provider : null;
}

function catalogSort(first: AdminCatalogItem, second: AdminCatalogItem): number {
  const firstPriority = "priority" in first ? first.priority : 0;
  const secondPriority = "priority" in second ? second.priority : 0;
  if (firstPriority !== secondPriority) return secondPriority - firstPriority;
  return catalogItemName(first).localeCompare(catalogItemName(second), "es");
}

type ActiveAvatarShopItem = AvatarShopItem & {
  name: string;
  premiumOnly: boolean;
  priority: number;
};

async function activeMissionTemplates(): Promise<MissionTemplate[]> {
  if (missionConfigCache && missionConfigCache.expiresAt > Date.now()) {
    return missionConfigCache.value;
  }
  const snapshot = await db.collection("missions").limit(50).get();
  const configured = snapshot.docs.flatMap((document) => {
    try {
      const mission = parseAdminOperationItem(
        "missions",
        document.id,
        document.data(),
      ) as AdminMission;
      return mission.active ? [mission] : [];
    } catch {
      return [];
    }
  }).sort((first, second) => second.priority - first.priority || first.id.localeCompare(second.id));
  const value = snapshot.empty ? dailyMissionTemplates : configured.map((mission) => ({
    id: mission.id,
    title: mission.title,
    description: mission.description,
    type: mission.type,
    target: mission.target,
    rewardXp: mission.rewardXp,
    rewardCoins: mission.rewardCoins,
  }));
  missionConfigCache = {expiresAt: Date.now() + operationalConfigCacheMs, value};
  return value;
}

async function activeDailyRewards(): Promise<DailyRewardTemplate[]> {
  if (rewardConfigCache && rewardConfigCache.expiresAt > Date.now()) {
    return rewardConfigCache.value;
  }
  const snapshot = await db.collection("dailyRewards").limit(31).get();
  const configured = snapshot.docs.flatMap((document) => {
    try {
      const reward = parseAdminOperationItem(
        "dailyRewards",
        document.id,
        document.data(),
      ) as AdminDailyReward;
      return reward.active ? [{day: reward.day, coins: reward.coins, gems: reward.gems}] : [];
    } catch {
      return [];
    }
  }).sort((first, second) => first.day - second.day);
  const value = snapshot.empty ? defaultDailyRewards : configured;
  rewardConfigCache = {expiresAt: Date.now() + operationalConfigCacheMs, value};
  return value;
}

async function activeAvatarShopCatalog(): Promise<ActiveAvatarShopItem[]> {
  if (shopConfigCache && shopConfigCache.expiresAt > Date.now()) {
    return shopConfigCache.value;
  }
  const snapshot = await db.collection("shopItems").limit(100).get();
  const fallback = avatarShopCatalog.map((item, index) => ({
      ...item,
      name: item.id,
      premiumOnly: false,
      priority: avatarShopCatalog.length - index,
    }));
  const configured = snapshot.docs.flatMap((document) => {
    try {
      const configured = parseAdminOperationItem(
        "shopItems",
        document.id,
        document.data(),
      ) as AdminShopItem;
      const visual = avatarItemById(configured.id);
      if (!configured.active || !visual || visual.category !== configured.category ||
        visual.slot !== configured.slot) return [];
      return [{
        id: configured.id,
        name: configured.name,
        category: configured.category,
        slot: configured.slot,
        rarity: configured.rarity,
        price: configured.price,
        currency: configured.currency,
        premiumOnly: configured.premiumOnly,
        priority: configured.priority,
      }];
    } catch {
      return [];
    }
  }).sort((first, second) => second.priority - first.priority || first.id.localeCompare(second.id));
  const value = snapshot.empty ? fallback : configured;
  shopConfigCache = {expiresAt: Date.now() + operationalConfigCacheMs, value};
  return value;
}

function invalidateOperationalCache(kind: AdminOperationKind) {
  if (kind === "missions") missionConfigCache = null;
  if (kind === "dailyRewards") rewardConfigCache = null;
  if (kind === "shopItems") shopConfigCache = null;
}

function operationSort(first: AdminOperationItem, second: AdminOperationItem): number {
  if ("day" in first && "day" in second) return first.day - second.day;
  const firstPriority = "priority" in first ? first.priority : 0;
  const secondPriority = "priority" in second ? second.priority : 0;
  if (firstPriority !== secondPriority) return secondPriority - firstPriority;
  return operationItemName(first).localeCompare(operationItemName(second), "es");
}

function operationItemName(item: AdminOperationItem): string {
  if ("name" in item) return item.name;
  if ("title" in item) return item.title;
  if ("day" in item) return `Día ${item.day}`;
  return item.id;
}

function catalogItemName(item: AdminCatalogItem): string {
  return "name" in item ? item.name : item.label;
}

function chunks<T>(values: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

function adminQuestion(
  id: string,
  question: Record<string, unknown>,
  duplicates: AdminQuestionDuplicate[] = [],
) {
  return {
    id,
    oppositionId: stringValue(question.oppositionId),
    statement: stringValue(question.statement),
    answers: Array.isArray(question.answers) ? question.answers : [],
    correctAnswerId: stringValue(question.correctAnswerId),
    explanation: stringValue(question.explanation),
    categoryId: stringValue(question.categoryId),
    subcategoryId: nullableStringValue(question.subcategoryId),
    difficulty: numberValue(question.difficulty),
    scopeType: stringValue(question.scopeType),
    territoryKeys: parseStringArray(question.territoryKeys),
    country: stringValue(question.country),
    autonomousCommunity: nullableStringValue(question.autonomousCommunity),
    province: nullableStringValue(question.province),
    municipality: nullableStringValue(question.municipality),
    specificCallId: nullableStringValue(question.specificCallId),
    officialExamId: nullableStringValue(question.officialExamId),
    year: nullableNumberValue(question.year),
    source: stringValue(question.source),
    sourceDocument: nullableStringValue(question.sourceDocument),
    sourcePage: nullableNumberValue(question.sourcePage),
    verified: question.verified === true,
    status: stringValue(question.status),
    validFrom: nullableStringValue(question.validFrom),
    validUntil: nullableStringValue(question.validUntil),
    createdBy: stringValue(question.createdBy),
    reviewedBy: nullableStringValue(question.reviewedBy),
    createdAt: timestampIso(question.createdAt),
    updatedAt: timestampIso(question.updatedAt),
    lastReviewedAt: timestampIso(question.lastReviewedAt),
    duplicates,
  };
}

function numberValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function nullableNumberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function nullableStringValue(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function timestampIso(value: unknown): string | null {
  return value instanceof Timestamp ? value.toDate().toISOString() : null;
}

function timestampMillis(value: unknown): number {
  return value instanceof Timestamp ? value.toMillis() : 0;
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

async function avatarInventoryForUid(
  uid: string,
  suppliedCatalog?: ActiveAvatarShopItem[],
) {
  const catalog = suppliedCatalog ?? await activeAvatarShopCatalog();
  const userRef = db.collection("users").doc(uid);
  const [userSnapshot, inventorySnapshot] = await Promise.all([
    userRef.get(),
    userRef.collection("inventory").limit(100).get(),
  ]);
  if (!userSnapshot.exists) {
    throw new HttpsError("failed-precondition", "User profile missing.");
  }

  const user = userSnapshot.data() ?? {};
  const ownedItemIds = [...new Set([
    ...starterAvatarItemIds,
    ...inventorySnapshot.docs.map((document) => document.id),
  ])];
  return {
    items: catalog,
    ownedItemIds,
    equipped: normalizeAvatarLoadout(
      user.avatarEquipped as AvatarLoadout,
      ownedItemIds,
      catalog,
    ),
    coins: numberValue(user.coins),
    gems: numberValue(user.gems),
  };
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
  const [
    viewerSnapshot,
    incomingSnapshot,
    outgoingSnapshot,
    friendsSnapshot,
    incomingDuelsSnapshot,
    outgoingDuelsSnapshot,
  ] = await Promise.all([
    db.collection("users").doc(uid).get(),
    db.collection("friendRequests").where("toUid", "==", uid).limit(50).get(),
    db.collection("friendRequests").where("fromUid", "==", uid).limit(50).get(),
    db.collection("friends").where("uids", "array-contains", uid).limit(50).get(),
    db.collection("duelInvitations").where("toUid", "==", uid).limit(50).get(),
    db.collection("duelInvitations").where("fromUid", "==", uid).limit(50).get(),
  ]);

  if (!viewerSnapshot.exists) {
    throw new HttpsError("failed-precondition", "User profile missing.");
  }

  const incomingRequests = incomingSnapshot.docs
    .filter((document) => document.data().status === "pending")
    .map((document) => serializeFriendRequest(document.id, document.data(), uid));
  const outgoingRequests = outgoingSnapshot.docs
    .filter((document) => document.data().status === "pending")
    .map((document) => serializeFriendRequest(document.id, document.data(), uid));
  const friendUids = [...new Set(friendsSnapshot.docs.flatMap((document) =>
    parseStringArray(document.data().uids).filter((memberUid) => memberUid !== uid),
  ))].slice(0, 50);
  const friendSnapshots = friendUids.length > 0 ? await db.getAll(
    ...friendUids.map((friendUid) => db.collection("users").doc(friendUid)),
  ) : [];
  const friendData = new Map(friendSnapshots
    .filter((snapshot) => snapshot.exists)
    .map((snapshot) => [snapshot.id, snapshot.data() ?? {}]));
  const viewerData = viewerSnapshot.data() ?? {};
  const now = new Date();
  const friends = friendUids.flatMap((friendUid) => {
    const data = friendData.get(friendUid);
    if (!data) return [];
    const streak = sharedStreak(streakProfile(viewerData), streakProfile(data), now);
    return [{
      ...serializeSocialUser(friendUid, data),
      sharedStreak: streak.days,
      viewerActiveToday: streak.viewerActiveToday,
      activeToday: streak.friendActiveToday,
      lastActiveAt: timestampIso(data.lastValidActivityDate),
    }];
  });
  const activity = await recentFriendActivity(friendUids, friendData);
  const duelInvitations = [...incomingDuelsSnapshot.docs, ...outgoingDuelsSnapshot.docs]
    .filter((document) => document.data().status !== "declined" &&
      !duelInvitationExpired(document.data()))
    .map((document) => serializeDuelInvitation(document.id, document.data(), uid));

  return {friends, incomingRequests, outgoingRequests, duelInvitations, activity};
}

async function recentFriendActivity(
  friendUids: string[],
  friendData: Map<string, Record<string, unknown>>,
) {
  if (friendUids.length === 0) return [];
  const uidChunks = chunk(friendUids, 30);
  const snapshots = await Promise.all(uidChunks.map((uids) =>
    db.collection("socialActivities")
      .where("actorUid", "in", uids)
      .orderBy("createdAt", "desc")
      .limit(20)
      .get(),
  ));
  return snapshots.flatMap((snapshot) => snapshot.docs)
    .sort((first, second) => timestampMillis(second.data().createdAt) -
      timestampMillis(first.data().createdAt))
    .slice(0, 20)
    .flatMap((document) => {
      const data = document.data();
      const actorUid = stringValue(data.actorUid);
      const actor = friendData.get(actorUid);
      if (!actor) return [];
      return [{
        id: document.id,
        type: data.type === "duel_completed" ? "duel_completed" : "quiz_completed",
        actor: serializeSocialUser(actorUid, actor),
        correct: numberValue(data.correct),
        total: numberValue(data.total),
        outcome: ["win", "loss", "draw"].includes(String(data.outcome)) ? data.outcome : null,
        streak: numberValue(data.streak),
        createdAt: timestampIso(data.createdAt) ?? new Date(0).toISOString(),
      }];
    });
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

function serializeStudyGroup(id: string, data: Record<string, unknown>, role: string) {
  return {
    id,
    name: stringValue(data.name),
    ownerUid: stringValue(data.ownerUid),
    joinCode: stringValue(data.joinCode),
    memberCount: Math.max(0, numberValue(data.memberCount)),
    rankingMetric: "xp" as const,
    viewerRole: role === "owner" ? "owner" as const :
      role === "admin" ? "admin" as const : "member" as const,
    createdAt: timestampIso(data.createdAt) ?? new Date(0).toISOString(),
    updatedAt: timestampIso(data.updatedAt) ?? new Date(0).toISOString(),
  };
}

type StoredStudyGroupCompetition = {
  id: string;
  name: string;
  metric: StudyGroupCompetitionMetric;
  startsAt: Timestamp;
  endsAt: Timestamp;
  scores: Record<string, number>;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

type StudyGroupMemberProfile = ReturnType<typeof serializeSocialUser> & {
  role: "owner" | "admin" | "member";
  xp: number;
  isViewer: boolean;
};

function storedCompetition(value: unknown): StoredStudyGroupCompetition | null {
  const data = storedRecord(value);
  const metric = normalizeCompetitionMetric(data.metric);
  if (!stringValue(data.id) || !stringValue(data.name) || !metric ||
    !(data.startsAt instanceof Timestamp) || !(data.endsAt instanceof Timestamp)) return null;
  const rawScores = storedRecord(data.scores);
  const scores = Object.fromEntries(Object.entries(rawScores)
    .filter(([uid]) => /^[A-Za-z0-9_-]{1,160}$/.test(uid))
    .slice(0, 50)
    .map(([uid, score]) => [uid, Math.max(0, numberValue(score))]));
  return {
    id: stringValue(data.id),
    name: stringValue(data.name),
    metric,
    startsAt: data.startsAt,
    endsAt: data.endsAt,
    scores,
    createdBy: stringValue(data.createdBy),
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt : data.startsAt,
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt : data.startsAt,
  };
}

function addCompetitionMember(value: unknown, uid: string, now: Timestamp) {
  const competition = storedCompetition(value);
  if (!competition || now.toMillis() > competition.endsAt.toMillis()) return null;
  return {
    ...competition,
    scores: {...competition.scores, [uid]: numberValue(competition.scores[uid])},
    updatedAt: now,
  };
}

function removeCompetitionMember(value: unknown, uid: string) {
  const competition = storedCompetition(value);
  if (!competition) return null;
  const scores = {...competition.scores};
  delete scores[uid];
  return {...competition, scores, updatedAt: Timestamp.now()};
}

function serializeStudyGroupCompetition(
  value: unknown,
  members: StudyGroupMemberProfile[],
) {
  const competition = storedCompetition(value);
  if (!competition) return null;
  const entries = rankEntries(members.map((member) => ({
    uid: member.uid,
    username: member.username,
    level: member.level,
    territoryLabel: member.territoryLabel,
    currentStreak: member.currentStreak,
    duelWins: member.duelWins,
    role: member.role,
    isViewer: member.isViewer,
    score: numberValue(competition.scores[member.uid]),
  })));
  return {
    id: competition.id,
    name: competition.name,
    metric: competition.metric,
    startsAt: competition.startsAt.toDate().toISOString(),
    endsAt: competition.endsAt.toDate().toISOString(),
    status: Date.now() <= competition.endsAt.toMillis() ? "active" as const : "finished" as const,
    entries,
  };
}

function studyActivityTotals(data: Record<string, unknown>): StudyActivityTotals {
  return {
    xp: Math.max(0, numberValue(data.xpEarned)),
    questions: Math.max(0, numberValue(data.total)),
    correct: Math.max(0, numberValue(data.correct)),
    duels: data.duelCompleted === true ? 1 : 0,
  };
}

function streakProfile(data: Record<string, unknown>): StreakProfile {
  return {
    currentStreak: numberValue(data.currentStreak),
    lastValidActivityDate: data.lastValidActivityDate instanceof Timestamp ?
      data.lastValidActivityDate.toDate() : null,
  };
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function serializeRankingEntry(
  uid: string,
  data: Record<string, unknown>,
  position: number,
  viewerUid: string,
) {
  const territory = storedRecord(data.territorySelection);
  return {
    uid,
    username: typeof data.username === "string" ? data.username : "Invitado",
    level: Math.max(1, numberValue(data.level)),
    territoryLabel: typeof territory.label === "string" ? territory.label : "España",
    score: numberValue(data.xp),
    position,
    isViewer: uid === viewerUid,
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

function storedRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
}

function friendDuelEntries(value: unknown): Array<Record<string, unknown> & {uid: string}> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const data = storedRecord(entry);
    return typeof data.uid === "string" ? [{...data, uid: data.uid}] : [];
  });
}

function serializeDuelInvitation(
  id: string,
  data: Record<string, unknown>,
  viewerUid: string,
) {
  const incoming = data.toUid === viewerUid;
  const opponentUid = incoming ? data.fromUid : data.toUid;
  const submittedUids = parseStringArray(data.submittedUids);
  const viewerSubmitted = submittedUids.includes(viewerUid);
  const opponentSubmitted = typeof opponentUid === "string" && submittedUids.includes(opponentUid);
  return {
    id,
    direction: incoming ? "incoming" : "outgoing",
    status: friendDuelViewStatus(data.status, viewerSubmitted, opponentSubmitted),
    duelId: typeof data.duelId === "string" ? data.duelId : null,
    opponent: serializeStoredSocialUser(incoming ? data.fromUser : data.toUser),
    viewerSubmitted,
    opponentSubmitted,
    createdAt: data.createdAt instanceof Timestamp ?
      data.createdAt.toDate().toISOString() : new Date(0).toISOString(),
  };
}

function duelInvitationExpired(data: Record<string, unknown>): boolean {
  if (!["pending", "active"].includes(String(data.status))) return false;
  return data.expiresAt instanceof Timestamp && data.expiresAt.toMillis() <= Date.now();
}

function matchmakingEntryExpired(data: Record<string, unknown>): boolean {
  return data.expiresAt instanceof Timestamp && data.expiresAt.toMillis() <= Date.now();
}

function serializeMatchmakingEntry(
  data: Record<string, unknown>,
  viewerUid: string,
  currentRating: number,
) {
  if (data.status === "waiting") {
    const createdAt = data.createdAt instanceof Timestamp ? data.createdAt : Timestamp.now();
    return {
      status: "waiting",
      rating: currentRating,
      range: matchmakingRange(Math.max(0, Date.now() - createdAt.toMillis())),
      queuedAt: createdAt.toDate().toISOString(),
    };
  }
  if (["matched", "completed"].includes(String(data.status))) {
    const submittedUids = parseStringArray(data.submittedUids);
    const opponent = serializeStoredSocialUser(data.opponent);
    return {
      status: "matched",
      rating: currentRating,
      duelId: typeof data.duelId === "string" ? data.duelId : "",
      opponent,
      duelStatus: friendDuelViewStatus(
        data.status,
        submittedUids.includes(viewerUid),
        submittedUids.includes(opponent.uid),
      ),
      viewerSubmitted: submittedUids.includes(viewerUid),
      opponentSubmitted: submittedUids.includes(opponent.uid),
    };
  }
  return {status: "idle", rating: currentRating};
}

function friendDuelOpponent(value: unknown, viewerUid: string) {
  const players = Array.isArray(value) ? value : [];
  const opponent = serializeStoredSocialUser(players.find((player) =>
    storedRecord(player).uid !== viewerUid,
  ));
  return {
    id: opponent.uid,
    name: opponent.username,
    level: opponent.level,
    territoryLabel: opponent.territoryLabel,
  };
}

function serializeCompletedFriendDuel(
  duelId: string,
  duel: Record<string, unknown>,
  viewerUid: string,
) {
  const submissions = friendDuelEntries(duel.submissions);
  const viewer = submissions.find((submission) => submission.uid === viewerUid);
  const opponent = submissions.find((submission) => submission.uid !== viewerUid);
  if (!viewer || !opponent) {
    throw new HttpsError("failed-precondition", "Duel result is incomplete.");
  }
  const calculatedOutcome = duelOutcome(
    numberValue(viewer.correct),
    numberValue(viewer.elapsedMs),
    numberValue(opponent.correct),
    numberValue(opponent.elapsedMs),
  );
  const outcome = ["win", "loss", "draw"].includes(String(viewer.outcome)) ?
    String(viewer.outcome) : calculatedOutcome;
  return {
    duelId,
    kind: duel.mode === "classic_matchmaking" ? "matchmaking" : "friend",
    opponent: friendDuelOpponent(duel.players, viewerUid),
    outcome,
    playerCorrect: numberValue(viewer.correct),
    opponentCorrect: numberValue(opponent.correct),
    playerElapsedMs: numberValue(viewer.elapsedMs),
    opponentElapsedMs: numberValue(opponent.elapsedMs),
  };
}

function scoreStoredQuestions(
  questions: Array<{id: string; data: QuestionDoc}>,
  submittedAnswers: Answer[],
) {
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
      question: reviewedQuizQuestion(question.id, question.data),
      selectedAnswerId,
      isBlank,
      isCorrect,
    };
  });
  return {
    attempts,
    correct,
    blank,
    incorrect,
    percentage: correct / questions.length,
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
