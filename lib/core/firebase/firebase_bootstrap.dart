import 'package:firebase_app_check/firebase_app_check.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

import '../../firebase_options.dart';

class FirebaseBootstrap {
  static const enabled = bool.fromEnvironment('OPOCOMPIT_USE_FIREBASE');

  static Future<void> initializeIfEnabled() async {
    WidgetsFlutterBinding.ensureInitialized();

    if (!enabled) return;

    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );

    // Web App Check needs a reCAPTCHA provider. Keep web disabled in local dev
    // until the production site key is configured in Firebase.
    if (kIsWeb) return;

    await FirebaseAppCheck.instance.activate(
      androidProvider: kDebugMode
          ? AndroidProvider.debug
          : AndroidProvider.playIntegrity,
      appleProvider: kDebugMode ? AppleProvider.debug : AppleProvider.appAttest,
    );
  }
}
