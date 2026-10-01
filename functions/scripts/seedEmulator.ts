import {deleteApp, initializeApp} from "firebase-admin/app";
import {Timestamp, getFirestore} from "firebase-admin/firestore";

import {seedQuestions} from "../../apps/client/src/features/quiz/data/seedQuestions.ts";
import {questionContentFingerprint} from "../src/adminImport.ts";

const projectId = "opocompit-dev";
const emulatorHost = "127.0.0.1:8080";
process.env.GCLOUD_PROJECT = projectId;
process.env.FIRESTORE_EMULATOR_HOST = emulatorHost;

async function main() {
  const app = initializeApp({projectId});
  const db = getFirestore(app);
  const now = Timestamp.now();
  const batch = db.batch();

  batch.set(db.collection("oppositions").doc("firefighters_es"), {
    name: "Bomberos",
    slug: "bomberos",
    active: true,
    priority: 10,
    updatedAt: now,
  });

  batch.set(db.collection("territories").doc("es_murcia_cartagena"), {
    label: "Cartagena (Murcia)",
    country: "ES",
    autonomousCommunity: "Murcia",
    province: "Murcia",
    municipality: "Cartagena",
    specificBody: null,
    active: true,
    priority: 10,
    updatedAt: now,
  });

  const categoryNames: Record<string, string> = {
    legislation: "Legislación",
    hydraulics: "Hidráulica",
    fires: "Incendios",
    prevention: "Prevención",
    platform: "Plataformas y vehículos",
    first_aid: "Primeros auxilios",
    hazmat: "Materias peligrosas",
    construction: "Construcción",
  };
  [...new Set(seedQuestions.map((question) => question.categoryId))]
    .forEach((categoryId, index) => {
      batch.set(db.collection("categories").doc(categoryId), {
        oppositionId: "firefighters_es",
        name: categoryNames[categoryId] ?? categoryId,
        parentId: null,
        active: true,
        priority: 100 - index,
        updatedAt: now,
      });
    });

  batch.set(db.collection("officialExams").doc("cartagena_firefighters_2025"), {
    oppositionId: "firefighters_es",
    name: "Bomberos de Cartagena 2025",
    date: "2025-06-15",
    year: 2025,
    territoryKeys: ["ES", "ES-Murcia", "ES-Murcia-Cartagena"],
    source: "Convocatoria oficial del Ayuntamiento de Cartagena",
    status: "draft",
    rules: {
      questionCount: 100,
      durationSeconds: 7_200,
      correctPoints: 1,
      incorrectPenalty: 0.33,
      blankPoints: 0,
    },
    updatedAt: now,
  });

  batch.set(db.collection("subscriptionPlans").doc("premium_monthly_preview"), {
    name: "OpoCompit Premium",
    priceLabel: "Próximamente",
    billingPeriod: "monthly",
    features: ["ad_free", "monthly_gems", "exclusive_cosmetics", "advanced_stats"],
    gemReward: 10,
    adFree: true,
    exclusiveCosmetics: true,
    active: true,
    priority: 10,
    storeProductId: null,
    purchasable: false,
    updatedAt: now,
  });

  batch.set(db.collection("appConfig").doc("monetization"), {
    adsEnabled: false,
    rewardedAdsEnabled: false,
    adProviderReady: false,
    resultInterval: 3,
    updatedAt: now,
  });

  for (const question of seedQuestions) {
    batch.set(db.collection("questions").doc(question.id), {
      ...question,
      status: "published",
      verified: true,
      contentFingerprint: questionContentFingerprint(question.oppositionId, question.statement),
      country: "ES",
      createdAt: now,
      updatedAt: now,
      createdBy: "emulator_seed",
    });
  }

  await batch.commit();
  console.log(`Seeded ${seedQuestions.length} existing development questions into ${emulatorHost}.`);
  await deleteApp(app);
}

void main();
