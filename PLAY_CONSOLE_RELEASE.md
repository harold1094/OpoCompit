# Google Play Console Release Draft

This is the working submission sheet for `com.opocompit.app`. It reflects the repository on
7 October 2026 and the intended Firebase-backed production behavior. Do not submit it unchanged
until the final AAB, legal owner, support contact, and Play Console account have been confirmed.

Google makes the developer responsible for matching the Data safety form to the final artifact and
every SDK it contains. Recheck this document after any dependency, analytics, advertising, billing,
notification, or backend configuration change.

## Public URLs

- Privacy policy: `https://opocompit-dev.web.app/legal?section=privacy`
- Terms: `https://opocompit-dev.web.app/legal?section=terms`
- Account deletion: `https://opocompit-dev.web.app/data-deletion`

The privacy URL is public HTTPS, not a PDF, and does not require a session. Before submission it
must also show the final legal owner and a working privacy/support contact.

## App content declarations

| Play Console item | Draft answer | Release note |
| --- | --- | --- |
| Contains ads | No | AdMob and rewarded ads are not included or active in this release. Change this before enabling either one. |
| App access | No restricted access | A reviewer can enter as a guest without credentials. Google and email linking are optional. |
| Account creation | Yes | Anonymous guest identity can be linked to Google or email/password. |
| In-app account deletion | Yes | `Perfil > Ajustes y privacidad > Eliminar cuenta y datos`. |
| External deletion resource | Yes | Use the public account-deletion URL above. A working request contact is still required. |
| News app | No | OpoCompit is an educational quiz and competition app. |
| Government app | No | It is not affiliated with a public administration. |
| Financial features | No | Coins and gems have no monetary value and real-money purchases are disabled. |
| Health features | No | The app does not process health or fitness data. |
| Target audience | Decision required | Confirm the intended age range before answering. Do not opt into Families without a dedicated review. |
| Content rating | Questionnaire required | Answer from the final published question catalog, not only the current demo content. |

Suggested reviewer note:

> OpoCompit can be tested immediately as a guest. Choose Bomberos and any available territory,
> then start a quick match from Inicio. Account linking is optional. Account deletion is available
> from Perfil, Ajustes y privacidad.

## Data safety overview

- Does the app collect or share required user data types? **Yes**.
- Is all collected data encrypted in transit? **Yes**, for the Firebase and Google services used by
  this release. Confirm again from the final AAB and backend configuration.
- Can users request data deletion? **Yes**, in-app and through the public deletion resource.
- Does the app share user data? **No** under the Play definition used for this draft. Firebase and
  Google authentication act as service providers, and Google sign-in is initiated by the user.
- Independent security review badge: **No**. The repository review is not a paid MASA assessment.
- Families badge: **No**, unless the product later deliberately targets children and passes the
  separate Families review.

## Data types to declare

| Play data type | Collected | Required | Purposes | OpoCompit behavior |
| --- | --- | --- | --- | --- |
| Personal info: Name | Yes | Optional | App functionality, account management | A user may choose a public username. Google sign-in may also return a display name, although OpoCompit does not use it as the public username. |
| Personal info: Email address | Yes | Optional | Account management, fraud prevention/security | Collected only when the user links or signs in with email or Google. Guests can study without providing it. |
| Personal info: User IDs | Yes | Required | App functionality, account management, fraud prevention/security | Firebase creates an identifier for anonymous and permanent accounts. |
| Personal info: Other info | Yes | Required | App functionality, personalization | Opposition, declared study territory, preferences, progress aggregates, level and streak configuration. The declared territory is study scope, not measured physical location. |
| Contacts | Yes | Optional | App functionality | In-app friend relationships form a social graph. The app does not read the device address book. |
| Financial info: Purchase history | Review before submission | Optional | App functionality, fraud prevention/security | The server records virtual shop transactions made only with earned coins or gems. No real-money billing is enabled. Confirm Play's treatment of virtual-only transactions in the final form. |
| App activity: In-app search history | Yes, ephemeral | Optional | App functionality | Exact username searches are sent to a callable Function and used for that request; the query is not stored by OpoCompit. Mark ephemeral processing if the form offers it. |
| App activity: Other user-generated content | Yes | Optional | App functionality | Group names and optional free-text details in question reports. |
| App activity: Other actions | Yes | Required | App functionality, personalization, fraud prevention/security | Quiz answers, results, errors, progress, rewards, achievements, inventory actions, duels, rankings, groups and notification state. |

The following types are **not collected by the current Android release**:

- Approximate or precise physical location.
- Phone number, postal address, race, beliefs, sexual orientation, health or fitness data.
- Emails or SMS content, photos, videos, audio, files, calendar, installed apps or web history.
- Crash logs, diagnostics or native Android analytics. Crashlytics and a native analytics adapter
  are not installed or enabled.
- Advertising ID or advertising profiles. Ads are disabled and no AdMob SDK is included.
- Payment card data. Play Billing and purchasable subscriptions are not enabled.

Do not select `App interactions` solely because events exist in source code. Android analytics is
disabled in this release; product analytics currently runs only on web after explicit consent. The
server-owned gameplay records are covered by `Other actions`.

## SDK and configuration review

- Firebase Authentication processes account identifiers, optional email, IP address, user-agent
  information and Firebase app metadata for authentication and abuse prevention.
- Google sign-in returns identity information only after the user starts that flow.
- Full Firestore and Functions gameplay synchronization is disabled in the current preview
  environment but is part of the intended production behavior described in the data table.
- Firebase Analytics on Android, Crashlytics, Cloud Messaging, AdMob and Play Billing are not active.
- Local-only AsyncStorage data is outside Play's collection definition until it is transmitted off
  the device. The final production label nevertheless covers synchronized gameplay data.

## Final submission gates

- [ ] Confirm the legal person or company shown in the Play listing and privacy policy.
- [ ] Configure and verify the real support/privacy contact.
- [ ] Review the privacy and terms text with qualified legal counsel.
- [ ] Inspect the final signed AAB permissions and embedded SDKs.
- [ ] Reconcile this data map against the exact production environment variables.
- [ ] Confirm whether virtual-only shop history should be selected as Purchase history.
- [ ] Complete target audience and content-rating questionnaires from the final catalog.
- [ ] Enter the declarations in Play Console and save a copy of the submitted answers.
- [ ] Repeat this review whenever data collection or an SDK changes.

## Official references

- Google Play Data safety: https://support.google.com/googleplay/android-developer/answer/10787469
- Google Play User Data policy: https://support.google.com/googleplay/android-developer/answer/10144311
- Google Play account deletion: https://support.google.com/googleplay/android-developer/answer/13327111
- Firebase Android disclosure guide: https://firebase.google.com/docs/android/play-data-disclosure
- Firebase privacy and data processing: https://firebase.google.com/support/privacy

