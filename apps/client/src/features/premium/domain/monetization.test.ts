import {
  canShowInterstitial,
  localMonetizationOverview,
  premiumFeatureCopy,
} from './monetization';

describe('monetization policy', () => {
  it('ships complete copy for every configured premium benefit', () => {
    const overview = localMonetizationOverview(2);
    expect(overview.gemBalance).toBe(2);
    expect(overview.plans[0].features.every((feature) => premiumFeatureCopy[feature])).toBe(true);
    expect(overview.plans[0].purchasable).toBe(false);
  });

  it('never interrupts study or duels with interstitial ads', () => {
    const overview = {
      ...localMonetizationOverview(0),
      ads: {enabled: true, rewardedEnabled: false, resultInterval: 3},
    };
    expect(canShowInterstitial({surface: 'quiz', overview, completedSessions: 3})).toBe(false);
    expect(canShowInterstitial({surface: 'duel', overview, completedSessions: 3})).toBe(false);
    expect(canShowInterstitial({surface: 'results', overview, completedSessions: 2})).toBe(false);
    expect(canShowInterstitial({surface: 'results', overview, completedSessions: 3})).toBe(true);
  });

  it('disables ads for premium users', () => {
    const overview = {
      ...localMonetizationOverview(0),
      entitlement: {
        tier: 'premium' as const,
        status: 'active' as const,
        planId: 'premium',
        renewsAt: null,
      },
      ads: {enabled: true, rewardedEnabled: true, resultInterval: 1},
    };
    expect(canShowInterstitial({surface: 'results', overview, completedSessions: 1})).toBe(false);
  });
});
