import {deleteApp, initializeApp} from "firebase-admin/app";
import {Timestamp, getFirestore} from "firebase-admin/firestore";

import {seedQuestions} from "../../apps/client/src/features/quiz/data/seedQuestions.ts";

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
