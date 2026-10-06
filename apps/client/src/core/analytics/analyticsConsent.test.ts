import { hasAnalyticsConsent, setAnalyticsConsent } from './analyticsConsent';

describe('analytics consent', () => {
  afterEach(() => setAnalyticsConsent(false));

  it('starts disabled and follows an explicit choice', () => {
    expect(hasAnalyticsConsent()).toBe(false);
    setAnalyticsConsent(true);
    expect(hasAnalyticsConsent()).toBe(true);
  });
});
