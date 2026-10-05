import { Question, UserQuestionStat } from '@/core/domain/types';
import { buildLearningInsights } from './learningInsights';

function question(id: string, categoryId: string): Question {
  return {
    id,
    oppositionId: 'firefighters_es',
    statement: id,
    answers: [{id: 'a', text: 'A'}],
    categoryId,
    difficulty: 1,
    scopeType: 'national',
    territoryKeys: ['ES'],
    source: 'test',
  };
}

function stat(
  questionId: string,
  correctCount: number,
  incorrectCount: number,
  needsReview = false,
): UserQuestionStat {
  return {
    questionId,
    timesSeen: correctCount + incorrectCount,
    correctCount,
    incorrectCount,
    blankCount: 0,
    needsReview,
    lastAnswerId: 'a',
    lastAnsweredAt: '2026-10-05T00:00:00.000Z',
  };
}

describe('learning insights', () => {
  it('aggregates results and identifies the strongest and weakest categories', () => {
    const insights = buildLearningInsights(
      [question('fire-1', 'fires'), question('fire-2', 'fires'), question('law-1', 'legislation')],
      {
        'fire-1': stat('fire-1', 3, 1),
        'fire-2': stat('fire-2', 1, 0),
        'law-1': stat('law-1', 1, 3, true),
      },
    );

    expect(insights.totalSeen).toBe(9);
    expect(insights.correctCount).toBe(5);
    expect(insights.strongestCategory?.categoryId).toBe('fires');
    expect(insights.weakestCategory).toMatchObject({
      categoryId: 'legislation',
      pendingReviewCount: 1,
      accuracy: 0.25,
    });
    expect(insights.categories.map((category) => category.categoryId)).toEqual([
      'legislation',
      'fires',
    ]);
  });

  it('uses the category persisted in a stat when the question is no longer local', () => {
    const insights = buildLearningInsights([], {
      removed: {...stat('removed', 2, 0), categoryId: 'rescue'},
    });

    expect(insights.categories[0]).toMatchObject({categoryId: 'rescue', accuracy: 1});
  });
});
