# Legal Release Notes

OpoCompit includes an in-app privacy policy, terms of use, support area, direct account deletion,
and a public account-deletion route. The current legal text is versioned as 7 October 2026 and
matches the features enabled in the repository today.

## Source of truth

- Legal text: `apps/client/src/features/legal/legalContent.ts`
- Contact and public URLs: `apps/client/src/features/legal/legalConfig.ts`
- In-app center: `/legal`
- Public deletion instructions: `/data-deletion`
- Direct authenticated deletion: `/settings`

## Required before Play submission

1. Confirm the person or legal entity responsible for OpoCompit.
2. Create a dedicated support email or private support form.
3. Set the `EXPO_PUBLIC_LEGAL_OWNER` and `EXPO_PUBLIC_SUPPORT_EMAIL` variables.
4. Publish the web legal pages at stable public HTTPS URLs.
5. Set `EXPO_PUBLIC_PRIVACY_URL`, `EXPO_PUBLIC_TERMS_URL`, and
   `EXPO_PUBLIC_ACCOUNT_DELETION_URL` to those published pages.
6. Enter the privacy and account-deletion URLs in Play Console.
7. Complete Data safety using the behavior of the final signed build, including every enabled SDK.
8. Obtain a final legal review before production publication.

The support email is deliberately not invented in code. Until it is configured, the app labels the
contact channel as pending and does not open an unsafe or nonexistent address.

## Current data map

- Required account data: anonymous Firebase identifier; email and provider only after linking.
- User-provided public data: username, avatar, and declared study territory.
- App activity: study progress, answers, results, errors, rewards, social relationships, groups,
  duels, reports, preferences, and internal notifications.
- Optional analytics: disabled unless the user consents in Settings and the environment enables it.
- Advertising and paid subscriptions: not active in the current release configuration.
- Precise location, contacts, microphone, camera, health data, and payment card details: not used.

Google Play requires the privacy policy inside the app and at a public, active, non-PDF URL. Apps
that create accounts must also provide both in-app deletion and an external deletion resource:

- https://support.google.com/googleplay/android-developer/answer/10144311
- https://support.google.com/googleplay/android-developer/answer/13327111

The Spanish Data Protection Agency recommends short access paths, clear Spanish wording, specific
purposes, optional-versus-required processing, retention details, and granular consent:

- https://www.aepd.es/guias/nota-tecnica-apps-moviles.pdf
