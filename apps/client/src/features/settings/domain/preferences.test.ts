import { defaultUserPreferences, mergeUserPreferences } from './preferences';

describe('user preferences', () => {
  it('keeps analytics disabled until the user opts in', () => {
    expect(defaultUserPreferences.analyticsEnabled).toBe(false);
  });

  it('updates one control without changing the others', () => {
    expect(mergeUserPreferences(defaultUserPreferences, {hapticsEnabled: false})).toEqual({
      ...defaultUserPreferences,
      hapticsEnabled: false,
    });
  });
});
