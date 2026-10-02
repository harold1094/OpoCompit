export type AnalyticsEventName =
  | 'app_open'
  | 'screen_view'
  | 'onboarding_started'
  | 'guest_started'
  | 'signup_completed'
  | 'login_completed'
  | 'quiz_started'
  | 'quiz_completed'
  | 'quiz_abandoned'
  | 'question_answered'
  | 'duel_created'
  | 'duel_joined'
  | 'duel_completed'
  | 'matchmaking_started'
  | 'friend_request_sent'
  | 'friend_added'
  | 'group_created'
  | 'group_joined'
  | 'daily_reward_claimed'
  | 'mission_completed'
  | 'streak_extended'
  | 'streak_lost'
  | 'level_up'
  | 'shop_viewed'
  | 'item_purchased'
  | 'item_equipped'
  | 'paywall_viewed';

export type AnalyticsParameters = Record<string, string | number | boolean | null | undefined>;
export type SafeAnalyticsParameters = Record<string, string | number>;

const sensitiveKeys = new Set([
  'answer',
  'email',
  'id_token',
  'name',
  'phone',
  'selected_answer',
  'token',
  'uid',
  'user_id',
  'username',
]);

export function sanitizeAnalyticsParameters(
  parameters: AnalyticsParameters,
): SafeAnalyticsParameters {
  const safeParameters: SafeAnalyticsParameters = {};
  Object.entries(parameters).forEach(([key, value]) => {
    const normalizedKey = key.trim().toLowerCase();
    if (
      !/^[a-z][a-z0-9_]{0,39}$/.test(normalizedKey) ||
      sensitiveKeys.has(normalizedKey) ||
      value === null ||
      value === undefined
    ) {
      return;
    }

    if (typeof value === 'string') {
      const sanitizedValue = value.trim().slice(0, 100);
      if (sanitizedValue) safeParameters[normalizedKey] = sanitizedValue;
    } else if (typeof value === 'number') {
      if (Number.isFinite(value)) safeParameters[normalizedKey] = value;
    } else {
      safeParameters[normalizedKey] = value ? 1 : 0;
    }
  });
  return safeParameters;
}
