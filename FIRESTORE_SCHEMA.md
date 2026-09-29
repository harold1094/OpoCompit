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
  "country": "ES",
  "autonomousCommunity": "Murcia",
  "province": "Murcia",
  "municipality": "Cartagena",
  "specificBody": "Bomberos Cartagena",
  "parentIds": ["ES", "ES-MC", "ES-MC-Murcia"],
  "active": true
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
  "questionIds": [],
  "rules": {
    "questionCount": 53,
    "durationSeconds": null,
    "correctPoints": 1,
    "incorrectPenalty": -0.33,
    "blankPoints": 0
  },
  "source": "Official exam",
  "status": "draft|published|disabled"
}
```

## quizSessions/{sessionId}

```json
{
  "uid": "user id",
  "mode": "quick|custom|official_exam|duel",
  "oppositionId": "firefighters_es",
  "territoryKeys": ["ES", "ES-MC", "ES-MC-Cartagena"],
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

Precomputed entries for global, territory, opposition, friends, and groups.

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
  "uid": "player uid",
  "participantUids": ["player uid"],
  "mode": "classic_training",
  "opponent": {"id": "training_mario", "name": "MarioCT", "level": 8},
  "questionIds": [],
  "status": "started|completed",
  "result": null,
  "reward": null,
  "createdAt": "serverTimestamp",
  "completedAt": null
}
```

Started duels are only exposed through callable Functions. Direct Firestore reads are limited to completed duels owned by the participant.

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

## Other Collections

- `usernames/{normalizedUsername}`: private unique username reservation owned by Functions.
- `friends/{sortedUidPair}`: accepted friendship edge with public member snapshots.
- `friendRequests/{sortedUidPair}`: one pending, accepted, or declined request per user pair.
- `groups/{groupId}` and `groups/{groupId}/members/{uid}`.
- `duels/{duelId}`: classic duel sessions.
- `matchmakingQueues/{queueId}/entries/{uid}`: transactional queue entries.
- `missions/{missionId}` and `users/{uid}/missions/{missionId}`.
- `dailyRewards/{calendarId}`.
- `achievements/{achievementId}`.
- `shopItems/{itemId}`.
- `subscriptionPlans/{planId}`.
- `subscriptions/{uid}`.
- `appConfig/{configId}`.

Friend and request identifiers are deterministic from the two sorted user IDs. Clients can read only relationships in which they participate and cannot write them directly.
