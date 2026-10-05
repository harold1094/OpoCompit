export type OfficialExamRules = {
  questionCount: number;
  durationSeconds: number;
  correctPoints: number;
  incorrectPenalty: number;
  blankPoints: number;
};

export function officialExamScore(
  correct: number,
  incorrect: number,
  blank: number,
  rules: OfficialExamRules,
) {
  const points = roundScore(
    correct * rules.correctPoints -
    incorrect * rules.incorrectPenalty +
    blank * rules.blankPoints,
  );
  const maximumPoints = roundScore(rules.questionCount * rules.correctPoints);
  return {points, maximumPoints};
}

function roundScore(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
