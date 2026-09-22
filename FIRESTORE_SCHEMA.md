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
  "lastValidActivityDate": null,
  "createdAt": "serverTimestamp",
  "updatedAt": "serverTimestamp"
}
```

Subcollections:

- `users/{uid}/questionStats/{questionId}`
- `users/{uid}/inventory/{itemId}`
- `users/{uid}/missions/{missionId}`
- `users/{uid}/achievements/{achievementId}`
- `users/{uid}/notifications/{notificationId}`

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

## Economy

- `currencyTransactions/{transactionId}` is append-only.
- User balances are derived aggregates updated by trusted Functions.

```json
{
  "uid": "user id",
  "type": "quiz_reward|mission|daily_reward|purchase|admin_adjustment",
  "currency": "coins|gems",
  "amount": 25,
  "balanceAfter": 300,
  "sourceId": "quizSessionId",
  "createdAt": "serverTimestamp"
}
```

## Other Collections

- `friends/{edgeId}`: accepted friendship edge.
- `friendRequests/{requestId}`: pending friend request.
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

