import { sanitizeAnalyticsParameters } from './analyticsPayload';

describe('analytics parameter privacy', () => {
  it('keeps bounded product metrics and normalizes booleans', () => {
    expect(sanitizeAnalyticsParameters({
      game_mode: 'quick',
      question_count: 10,
      completed: true,
    })).toEqual({ game_mode: 'quick', question_count: 10, completed: 1 });
  });

  it('drops identifiers, invalid values and malformed keys', () => {
    expect(sanitizeAnalyticsParameters({
      email: 'student@example.com',
      username: 'HaroldCT',
      uid: 'private-id',
      answer: 'a',
      'invalid-key': 'value',
      duration_ms: Number.NaN,
      backend_mode: null,
    })).toEqual({});
  });

  it('trims and limits text parameters', () => {
    expect(sanitizeAnalyticsParameters({
      screen_name: `  /${'a'.repeat(120)}  `,
    }).screen_name).toHaveLength(100);
  });
});
