import 'package:cloud_firestore/cloud_firestore.dart';

import '../../../core/domain/player_profile.dart';

class FirestoreUserProfileService {
  FirestoreUserProfileService({
    FirebaseFirestore? firestore,
  }) : _firestore = firestore ?? FirebaseFirestore.instance;

  final FirebaseFirestore _firestore;

  Future<void> createGuestProfileIfMissing(PlayerProfile profile) async {
    final ref = _firestore.collection('users').doc(profile.uid);
    final snapshot = await ref.get();
    if (snapshot.exists) return;

    await ref.set({
      'uid': profile.uid,
      'isAnonymous': profile.isGuest,
      'username': profile.username,
      'role': profile.isGuest ? 'guest' : 'user',
      'oppositionId': profile.oppositionId,
      'oppositionName': profile.oppositionName,
      'territorySelection': {
        'label': profile.territory.label,
        'country': profile.territory.country,
        'autonomousCommunity': profile.territory.autonomousCommunity,
        'province': profile.territory.province,
        'municipality': profile.territory.municipality,
        'specificBody': profile.territory.specificBody,
      },
      'level': profile.level,
      'xp': profile.xp,
      'coins': profile.coins,
      'gems': profile.gems,
      'currentStreak': profile.currentStreak,
      'bestStreak': profile.bestStreak,
      'totalQuestions': profile.totalQuestions,
      'correctAnswers': profile.correctAnswers,
      'testsCompleted': profile.testsCompleted,
      'createdAt': FieldValue.serverTimestamp(),
      'updatedAt': FieldValue.serverTimestamp(),
    });
  }
}

