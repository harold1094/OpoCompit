let consentGranted = false;

export function setAnalyticsConsent(granted: boolean): void {
  consentGranted = granted;
}

export function hasAnalyticsConsent(): boolean {
  return consentGranted;
}
