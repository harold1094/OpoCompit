import { Platform } from 'react-native';

import {
  getFirebaseAppForAnalytics,
  isFirebaseEnabled,
  isUsingFirebaseEmulators,
} from '@/core/firebase/firebaseClient';

import {
  AnalyticsEventName,
  AnalyticsParameters,
  sanitizeAnalyticsParameters,
} from './analyticsPayload';

const analyticsEnabled = process.env.EXPO_PUBLIC_ANALYTICS_ENABLED === 'true';
let analyticsPromise: Promise<import('firebase/analytics').Analytics | null> | null = null;

function canUseAnalytics(): boolean {
  const measurementId = process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID;
  return analyticsEnabled &&
    Platform.OS === 'web' &&
    isFirebaseEnabled() &&
    !isUsingFirebaseEmulators() &&
    Boolean(measurementId && !measurementId.startsWith('your-'));
}

async function getAnalyticsInstance() {
  if (!canUseAnalytics()) return null;
  if (!analyticsPromise) {
    analyticsPromise = (async () => {
      const analyticsModule = await import('firebase/analytics');
      if (!(await analyticsModule.isSupported())) return null;
      const app = getFirebaseAppForAnalytics();
      return app ? analyticsModule.getAnalytics(app) : null;
    })().catch(() => null);
  }
  return analyticsPromise;
}

export async function trackEvent(
  name: AnalyticsEventName,
  parameters: AnalyticsParameters = {},
): Promise<void> {
  try {
    const analytics = await getAnalyticsInstance();
    if (!analytics) return;
    const { logEvent } = await import('firebase/analytics');
    const logProductEvent = logEvent as (
      instance: typeof analytics,
      eventName: string,
      eventParameters?: Record<string, string | number>,
    ) => void;
    logProductEvent(analytics, name, sanitizeAnalyticsParameters(parameters));
  } catch {
    // Analytics must never interrupt study or account flows.
  }
}
