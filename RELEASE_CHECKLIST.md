# Release Checklist

## Automated gates

- [x] Client TypeScript validation and Jest suite.
- [x] Functions build, lint, and Node test suite.
- [x] End-to-end Auth, Firestore, and Functions emulator verification.
- [x] Direct Firestore Rules checks for private profiles, protected writes, and question answers.
- [x] GitHub Actions verification on pushes and pull requests.
- [x] Privacy-filtered, opt-in web analytics foundation.

## Product gates

- [ ] Add Google and email account linking without losing guest progress.
- [ ] Add official-exam mode after reviewed question content is available.
- [ ] Complete accessibility and physical Android device testing.
- [ ] Validate empty, loading, offline, expired-session, and recovery states on Android.
- [ ] Prepare privacy policy, terms, data deletion, and support contact.

## Production infrastructure

- [ ] Select the permanent Firestore location and matching Functions region.
- [ ] Enable Authentication providers and configure production Firebase apps.
- [ ] Upgrade Firebase only after budget alerts and spending limits are agreed.
- [ ] Replace preview billing and ad configuration with approved store credentials.
- [ ] Add a native Android analytics adapter and verify consent requirements.
- [ ] Build a signed Android App Bundle and complete internal Play testing.

All unchecked infrastructure work remains disabled and incurs no project cost in the current local
emulator setup.
