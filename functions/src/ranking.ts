export type RankableEntry = {
  uid: string;
  score: number;
};

export function rankEntries<T extends RankableEntry>(entries: T[]): Array<T & {position: number}> {
  const sorted = [...entries].sort((first, second) =>
    second.score - first.score || first.uid.localeCompare(second.uid),
  );
  let previousScore: number | null = null;
  let position = 0;
  return sorted.map((entry, index) => {
    if (entry.score !== previousScore) position = index + 1;
    previousScore = entry.score;
    return {...entry, position};
  });
}

export function mostSpecificTerritoryKey(territoryKeys: string[]): string {
  return territoryKeys[territoryKeys.length - 1] ?? "ES";
}
