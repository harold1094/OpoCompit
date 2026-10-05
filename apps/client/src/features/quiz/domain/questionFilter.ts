import {
  CustomQuizConfig,
  PlayerProfile,
  Question,
  TerritorySelection,
  UserQuestionStat,
} from '@/core/domain/types';

export function territoryKeys(territory: TerritorySelection): string[] {
  const keys = [territory.country];
  if (territory.autonomousCommunity) {
    keys.push(`${territory.country}-${territory.autonomousCommunity}`);
  }
  if (territory.autonomousCommunity && territory.municipality) {
    keys.push(`${territory.country}-${territory.autonomousCommunity}-${territory.municipality}`);
  }
  return keys;
}

export function eligibleForQuickMatch(
  profile: PlayerProfile,
  questions: Question[],
  limit = 10,
): Question[] {
  const userKeys = new Set(territoryKeys(profile.territory));

  return questions
    .filter(
      (question) =>
        question.oppositionId === profile.oppositionId &&
        question.territoryKeys.some((key) => userKeys.has(key)),
    )
    .sort((left, right) => left.difficulty - right.difficulty || left.id.localeCompare(right.id))
    .slice(0, limit);
}

export function eligibleForCustomQuiz(
  profile: PlayerProfile,
  questions: Question[],
  stats: Record<string, UserQuestionStat>,
  config: CustomQuizConfig,
): Question[] {
  const userKeys = new Set(territoryKeys(profile.territory));

  return questions
    .filter((question) => {
      const stat = stats[question.id];
      const territoryMatches = config.territoryMode === 'all_spain'
        ? question.territoryKeys.some((key) => key === 'ES' || key.startsWith('ES-'))
        : question.territoryKeys.some((key) => userKeys.has(key));
      const statusMatches = config.questionStatus === 'all'
        || (config.questionStatus === 'new' && !stat?.timesSeen)
        || (config.questionStatus === 'incorrect' && stat?.needsReview === true)
        || (config.questionStatus === 'completed' && Boolean(stat?.timesSeen));
      return question.oppositionId === profile.oppositionId
        && territoryMatches
        && (config.categoryId === null || question.categoryId === config.categoryId)
        && (config.difficulty === null || question.difficulty === config.difficulty)
        && statusMatches;
    })
    .sort((left, right) => left.difficulty - right.difficulty || left.id.localeCompare(right.id))
    .slice(0, config.questionCount);
}
