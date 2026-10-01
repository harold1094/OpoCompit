import {
  MonetizationOverview,
  PremiumFeature,
  SubscriptionPlan,
} from '@/core/domain/types';

export type AdSurface = 'quiz' | 'duel' | 'results' | 'home' | 'profile' | 'social';

export const premiumFeatureCopy: Record<PremiumFeature, {
  title: string;
  description: string;
  icon: 'advertisements-off' | 'diamond-stone' | 'hanger' | 'chart-box-outline';
}> = {
  ad_free: {
    title: 'Sin anuncios',
    description: 'Una experiencia de estudio más limpia.',
    icon: 'advertisements-off',
  },
  monthly_gems: {
    title: 'Gemas periódicas',
    description: 'Para cosméticos especiales, nunca para ventajas académicas.',
    icon: 'diamond-stone',
  },
  exclusive_cosmetics: {
    title: 'Cosméticos exclusivos',
    description: 'Avatares, marcos y efectos de colección.',
    icon: 'hanger',
  },
  advanced_stats: {
    title: 'Estadísticas avanzadas',
    description: 'Más profundidad para entender tu progreso.',
    icon: 'chart-box-outline',
  },
};

export function localMonetizationOverview(gemBalance: number): MonetizationOverview {
  return {
    plans: [previewPlan],
    entitlement: {tier: 'free', status: 'free', planId: null, renewsAt: null},
    gemBalance,
    ads: {enabled: false, rewardedEnabled: false, resultInterval: 3},
  };
}

export function canShowInterstitial(input: {
  surface: AdSurface;
  overview: MonetizationOverview;
  completedSessions: number;
}): boolean {
  if (!input.overview.ads.enabled || input.overview.entitlement.tier === 'premium') return false;
  if (input.surface !== 'results') return false;
  const interval = Math.max(1, Math.trunc(input.overview.ads.resultInterval));
  return input.completedSessions > 0 && input.completedSessions % interval === 0;
}

const previewPlan: SubscriptionPlan = {
  id: 'premium_monthly_preview',
  name: 'OpoCompit Premium',
  priceLabel: 'Próximamente',
  billingPeriod: 'monthly',
  features: ['ad_free', 'monthly_gems', 'exclusive_cosmetics', 'advanced_stats'],
  gemReward: 10,
  adFree: true,
  exclusiveCosmetics: true,
  priority: 10,
  storeProductId: null,
  purchasable: false,
};
