# Firestore Schema

The schema is designed around cheap reads, server-authoritative writes, territorial filtering, and precomputed aggregates.

## users/{uid}

```json
{
  "uid": "auth uid",
  "isAnonymous": true,
  "username": "guest_1234",
  "role": "guest|user|moderator|admin",
  "oppositionId": "firefighters_es",
  "territorySelection": {
    "country": "ES",
    "autonomousCommunity": "Murcia",
    "province": "Murcia",
    "municipality": "Cartagena",
    "specificBody": "Bomberos Cartagena"
  },
  "territoryKeys": ["ES", "ES-Murcia", "ES-Murcia-Cartagena"],
  "level": 1,
  "xp": 0,
  "coins": 0,
  "gems": 0,
  "currentStreak": 0,
  "bestStreak": 0,
  "totalQuestions": 0,
  "correctAnswers": 0,
  "testsCompleted": 0,
  "duelsPlayed": 0,
  "duelWins": 0,
  "duelLosses": 0,
  "duelDraws": 0,
  "lastValidActivityDate": null,
  "dailyRewardDay": 0,
  "lastDailyRewardDate": null,
  "avatarEquipped": {
    "base": "base_rookie",
    "face": "face_smile",
    "hair": "hair_short",
    "outfit": "outfit_training",
    "accessory": "accessory_none",
    "background": "background_clear",
    "frame": "frame_clean",
    "badge": "badge_none",
    "effect": "effect_none"
  },
  "createdAt": "serverTimestamp",
  "updatedAt": "serverTimestamp"
}
```

Subcollections:

- `users/{uid}/questionStats/{questionId}`
- `users/{uid}/inventory/{itemId}`
- `users/{uid}/missions/{missionId}`
- `users/{uid}/dailyRewards/{YYYY-MM-DD}`
- `users/{uid}/achievements/{achievementId}`
- `users/{uid}/notifications/{notificationId}`

Question statistics store the immutable question `categoryId`, cumulative `timesSeen`,
`correctCount`, `incorrectCount`, and `blankCount`, plus the latest answer and timestamp.
`needsReview` is set by trusted submissions:
wrong or blank answers set it to `true`, and a later correct answer clears it.

`users/{uid}/inventory/{itemId}` is written only by `purchaseAvatarItem`. It stores the catalog
snapshot, price paid, currency, and acquisition timestamp. Starter items are implicit and free, so
they require no documents. The equipped map is validated against the owned inventory by
`equipAvatarItem`; clients never write balances, inventory, or equipment directly.

Daily mission document IDs include the Madrid date, for example `2026-09-28_daily_15_correct`. Each document stores the server-owned `progress`, `claimed` state, rewards, and definition snapshot for that day.

## oppositions/{oppositionId}

```json
{
  "name": "Bomberos",
  "slug": "bomberos",
  "active": true,
  "priority": 10
}
```

## territories/{territoryId}

```json
{
  "label": "Cartagena (Murcia)",
  "country": "ES",
  "autonomousCommunity": "Murcia",
  "province": "Murcia",
  "municipality": "Cartagena",
  "specificBody": "Bomberos Cartagena",
  "active": true,
  "priority": 10
}
```

## categories/{categoryId}

```json
{
  "oppositionId": "firefighters_es",
  "name": "Hidráulica",
  "parentId": null,
  "active": true,
  "priority": 20
}
```

## questions/{questionId}

```json
{
  "oppositionId": "firefighters_es",
  "statement": "Question text",
  "answers": [
    {"id": "a", "text": "Answer A"},
    {"id": "b", "text": "Answer B"}
  ],
  "correctAnswerId": "a",
  "explanation": "Explanation",
  "categoryId": "legislation",
  "subcategoryId": null,
  "difficulty": 2,
  "scopeType": "national|autonomic|provincial|municipal|official_exam|technical",
  "territoryKeys": ["ES", "ES-MC", "ES-MC-Cartagena"],
  "country": "ES",
  "autonomousCommunity": "Murcia",
  "province": "Murcia",
  "municipality": "Cartagena",
  "specificCallId": null,
  "officialExamId": null,
  "year": 2026,
  "source": "Manual CEIS Guadalajara",
  "sourceDocument": "ceis_guadalajara.pdf",
  "sourcePage": 12,
  "contentFingerprint": "sha256 of opposition and normalized statement",
  "verified": true,
  "status": "draft|pending_review|published|disabled",
  "validFrom": null,
  "validUntil": null,
  "lastReviewedAt": null,
  "createdAt": "serverTimestamp",
  "updatedAt": "serverTimestamp",
  "createdBy": "uid"
}
```

Indexes:

- `oppositionId ASC, status ASC, territoryKeys ARRAY_CONTAINS, difficulty ASC`
- `oppositionId ASC, status ASC, categoryId ASC`
- `officialExamId ASC, status ASC`
- `status ASC, verified ASC, updatedAt DESC`

## officialExams/{examId}

```json
{
  "oppositionId": "firefighters_es",
  "name": "Bomberos Cartagena",
  "date": "2026-04-25",
  "year": 2026,
  "territoryKeys": ["ES", "ES-MC", "ES-MC-Cartagena"],
  "rules": {
    "questionCount": 53,
    "durationSeconds": 7200,
    "correctPoints": 1,
    "incorrectPenalty": 0.33,
    "blankPoints": 0
  },
  "source": "Official exam",
  "status": "draft|published|disabled"
}
```

## questionImportBatches/{batchId}

Immutable audit record written only by `importQuestionBatch`. Admins may read it directly, while
all client writes are denied.

```json
{
  "contentFingerprint": "sha256",
  "sourceDocument": "document.pdf",
  "createdBy": "admin uid",
  "importedCount": 25,
  "questionIds": ["question-id"],
  "status": "completed",
  "createdAt": "serverTimestamp",
  "updatedAt": "serverTimestamp"
}
```

## quizSessions/{sessionId}

```json
{
  "uid": "user id",
  "mode": "quick|custom_practice|simulation|error_review|official_exam|duel",
  "oppositionId": "firefighters_es",
  "territoryKeys": ["ES", "ES-MC", "ES-MC-Cartagena"],
  "customQuizConfig": {
    "questionCount": 10,
    "categoryId": null,
    "difficulty": null,
    "territoryMode": "profile|all_spain",
    "questionStatus": "all|new|incorrect|completed"
  },
  "simulationRules": null,
  "questionIds": [],
  "answers": [
    {"questionId": "q1", "selectedAnswerId": "a", "elapsedMs": 5000}
  ],
  "status": "started|submitted|validated|abandoned",
  "score": null,
  "createdAt": "serverTimestamp",
  "submittedAt": null
}
```

## rankings/{rankingId}/entries/{uid}

Reserved for future precomputed weekly, monthly, opposition, and group snapshots.
The MVP all-time global and territorial rankings query the trusted aggregate fields in
`users` through `getRanking`; friend rankings read at most 50 accepted relationships.
Clients never read other private user documents directly.

```json
{
  "uid": "user id",
  "username": "player",
  "avatarSnapshot": {},
  "score": 12500,
  "rank": 42,
  "period": "weekly|monthly|all_time",
  "updatedAt": "serverTimestamp"
}
```

## duels/{duelId}

```json
{
  "participantUids": ["first uid", "second uid"],
  "mode": "classic_training|classic_friend|classic_matchmaking",
  "players": [{"uid": "player uid", "username": "player"}],
  "questionIds": [],
  "starts": [{"uid": "player uid", "startedAt": "serverTimestamp"}],
  "submissions": [{"uid": "player uid", "correct": 8, "elapsedMs": 76000}],
  "status": "started|active|completed",
  "createdAt": "serverTimestamp",
  "completedAt": null
}
```

Training duels retain their server-defined opponent snapshot. Friend and matchmaking duels expire after seven days while active, start a separate trusted timer for each player, and remain readable after completion. Started duels are only exposed through callable Functions. Direct Firestore reads are limited to completed duels owned by the participant.

## matchmakingEntries/{uid}

Private server-owned queue entry with opposition, compatible territory keys, Elo rating, opponent snapshot, duel identifier, submission state, and expiry. Waiting entries expire after ten minutes. Clients can read only their own entry and mutate it exclusively through callable Functions.

## Economy

- `currencyTransactions/{transactionId}` is append-only.
- User balances are derived aggregates updated by trusted Functions.

```json
{
  "uid": "user id",
  "type": "quiz_reward|duel_reward|mission|daily_reward|purchase|admin_adjustment",
  "currency": "coins|gems",
  "amount": 25,
  "balanceAfter": 300,
  "sourceId": "quizSessionId",
  "createdAt": "serverTimestamp"
}
```

## socialActivities/{activityId}

Server-owned, idempotent activity generated after validated quizzes and duels. The social callable
returns only events belonging to current friends and limits the merged feed to 20 entries.

```json
{
  "actorUid": "user id",
  "type": "quiz_completed|duel_completed",
  "mode": "training|friend|matchmaking|null",
  "outcome": "win|loss|draw|null",
  "correct": 8,
  "total": 10,
  "streak": 4,
  "oppositionId": "firefighters_es",
  "createdAt": "serverTimestamp"
}
```

## groups/{groupId}

Private study group managed only by callable Functions. The client cannot read group metadata or
membership documents directly.

```json
{
  "name": "Bomberos Cartagena 2027",
  "ownerUid": "user id",
  "adminUids": ["user id"],
  "joinCode": "ABCD2345",
  "memberCount": 2,
  "rankingMetric": "xp",
  "competition": {
    "id": "competition id",
    "name": "Reto de octubre",
    "metric": "xp|questions|correct|duels",
    "startsAt": "serverTimestamp",
    "endsAt": "serverTimestamp",
    "scores": {"member uid": 120}
  },
  "active": true,
  "createdAt": "serverTimestamp",
  "updatedAt": "serverTimestamp"
}
```

`groups/{groupId}/members/{uid}` stores `uid`, `groupId`, `role`, and `joinedAt`. Membership queries
are capped at 20 groups per user, while a group is capped at 50 members. `groupCodes/{code}` is a
private reservation that maps a join code to its group and is deleted with an empty owner group.
The general ranking reads each member's trusted all-time XP live. One current or most-recent
temporary competition is stored compactly in the group document; the 50-member cap keeps its score
map bounded. Only validated activity inside the competition timestamps can change that map.

`socialActivities/{activityId}/competitionApplications/{applicationId}` stores private idempotency
markers for competition scoring. These records prevent retries of the same Firestore event from
adding the same score twice and are never readable by clients.

## missions/{missionId}

Admin-managed templates used by the server when creating each user's daily mission documents.

```json
{
  "title": "Calienta motores",
  "description": "Responde 30 preguntas.",
  "type": "completeQuickMatches|answerQuestions|correctAnswers",
  "target": 30,
  "rewardXp": 30,
  "rewardCoins": 15,
  "active": true,
  "priority": 20
}
```

## dailyRewards/{rewardId}

Ordered reward cycle. Active days may be skipped without breaking the cycle because progress stores
the configured day identifier rather than relying on array position.

```json
{"day": 1, "coins": 25, "gems": 0, "active": true}
```

## shopItems/{itemId}

Server-authoritative price and availability for visual assets shipped by the client.

```json
{
  "name": "Marco campeón",
  "category": "frames",
  "slot": "frame",
  "rarity": "legendary",
  "price": 320,
  "currency": "coins",
  "active": true,
  "premiumOnly": false,
  "priority": 10
}
```

## subscriptionPlans/{planId}

Public-to-authenticated configuration read through the monetization callable. The client never
hardcodes a purchasable price.

```json
{
  "name": "OpoCompit Premium",
  "priceLabel": "Store-provided display price",
  "billingPeriod": "monthly|yearly",
  "features": ["ad_free", "monthly_gems", "exclusive_cosmetics", "advanced_stats"],
  "gemReward": 10,
  "adFree": true,
  "exclusiveCosmetics": true,
  "active": true,
  "priority": 10,
  "storeProductId": "nullable until billing launch",
  "purchasable": false
}
```

`subscriptions/{uid}` is private and server-owned. It stores `planId`, `status`, provider references,
`expiresAt`, and audit timestamps. `appConfig/monetization` keeps `adsEnabled`,
`rewardedAdsEnabled`, `adProviderReady`, and the bounded results-screen interval. Direct client writes
are denied; the admin callable validates and audits updates.

## Other Collections

- `usernames/{normalizedUsername}`: private unique username reservation owned by Functions.
- `friends/{sortedUidPair}`: accepted friendship edge with public member snapshots.
- `socialActivities/{activityId}`: private server-owned study events exposed only through the bounded social callable.
- `friendRequests/{sortedUidPair}`: one pending, accepted, or declined request per user pair.
- `duelInvitations/{sortedUidPair}`: the current pending, active, declined, or completed challenge for a friend pair.
- `groups/{groupId}` and `groups/{groupId}/members/{uid}`: private callable-only group records.
- `groupCodes/{code}`: private unique code reservations owned by Functions.
- `duels/{duelId}`: classic duel sessions.
- `matchmakingEntries/{uid}`: private transactional queue entries.
- `missions/{missionId}` and `users/{uid}/missions/{missionId}`.
- `dailyRewards/{calendarId}`.
- `achievements/{achievementId}`.
- `shopItems/{itemId}`.
- `subscriptionPlans/{planId}`.
- `subscriptions/{uid}`.
- `appConfig/{configId}`.

Friend, request, and active duel invitation identifiers are deterministic from the two sorted user IDs. Clients can read only relationships in which they participate and cannot write them directly.
