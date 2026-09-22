import 'package:flutter/material.dart';

import '../core/design/app_theme.dart';
import 'router.dart';

class OpoCompitApp extends StatelessWidget {
  const OpoCompitApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'OpoCompit',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      routerConfig: appRouter,
    );
  }
}

