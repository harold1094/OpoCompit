import { PlayerProfile, Question, TerritorySelection } from '@/core/domain/types';

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
