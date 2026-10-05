import assert from "node:assert/strict";
import {describe, it} from "node:test";

import {
  AchievementMetrics,
  defaultAchievementTemplates,
  evaluateAchievement,
  parseAchievementTemplate,
} from "./achievements.js";

const metrics: AchievementMetrics = {
  testsCompleted: 3,
  totalQuestions: 120,
  duelWins: 4,
  bestStreak: 7,
  perfectTests: 1,
  categories: {
    hydraulics: {correctCount: 50, timesSeen: 60},
  },
};

describe("achievement rules", () => {
  it("evaluates aggregate and category milestones", () => {
    const firstQuiz = defaultAchievementTemplates.find((item) => item.id === "first_quiz");
    const specialist = defaultAchievementTemplates.find(
      (item) => item.id === "hydraulics_specialist",
    );
    assert.ok(firstQuiz);
    assert.ok(specialist);
    assert.deepEqual(evaluateAchievement(firstQuiz, metrics), {progress: 1, completed: true});
    assert.deepEqual(evaluateAchievement(specialist, metrics), {progress: 50, completed: true});
  });

  it("requires the configured category accuracy", () => {
    const specialist = defaultAchievementTemplates.find(
      (item) => item.id === "hydraulics_specialist",
    );
    assert.ok(specialist);
    assert.equal(evaluateAchievement(specialist, {
      ...metrics,
      categories: {hydraulics: {correctCount: 50, timesSeen: 70}},
    }).completed, false);
  });

  it("parses valid backend configuration and rejects category rules without a category", () => {
    const parsed = parseAchievementTemplate("configured", {
      title: "Configurado",
      description: "Logro de prueba.",
      icon: "star-outline",
      metric: "totalQuestions",
      target: 25,
      categoryId: null,
      minimumAccuracy: null,
      rewardXp: 10,
      rewardCoins: 5,
      rewardGems: 0,
      priority: 1,
    });
    assert.equal(parsed.target, 25);
    assert.throws(() => parseAchievementTemplate("invalid", {
      ...parsed,
      metric: "categoryCorrectAnswers",
      categoryId: null,
    }));
  });
});
