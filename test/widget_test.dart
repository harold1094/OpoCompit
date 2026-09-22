import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:opocompit/app/app.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  testWidgets('app starts on home and offers guest setup', (tester) async {
    SharedPreferences.setMockInitialValues({});

    await tester.pumpWidget(
      const ProviderScope(
        child: OpoCompitApp(),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Configurar jugador'), findsOneWidget);
  });
}

