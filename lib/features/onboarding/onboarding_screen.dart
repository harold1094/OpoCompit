import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/design/app_colors.dart';
import '../../core/design/app_spacing.dart';
import '../../shared/widgets/primary_button.dart';
import '../app_state/application/app_controller.dart';
import 'domain/onboarding_options.dart';

class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  var _selectedTerritory = availableTerritories[2];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Spacer(),
              Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [AppColors.brand, AppColors.gold],
                  ),
                  borderRadius: BorderRadius.circular(24),
                ),
                child: const Icon(
                  Icons.local_fire_department_rounded,
                  color: Colors.white,
                  size: 42,
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              Text(
                'OpoCompit',
                style: Theme.of(context).textTheme.displaySmall?.copyWith(
                      fontWeight: FontWeight.w900,
                    ),
              ),
              const SizedBox(height: AppSpacing.sm),
              Text(
                'Prepara tu oposición jugando. Entra como invitado, responde 10 preguntas y empieza a subir nivel.',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      color: AppColors.muted,
                      height: 1.35,
                    ),
              ),
              const SizedBox(height: AppSpacing.xl),
              Text(
                'Oposición',
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
              ),
              const SizedBox(height: AppSpacing.sm),
              const _LockedChoice(label: firefighterOppositionName),
              const SizedBox(height: AppSpacing.lg),
              Text(
                'Territorio',
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
              ),
              const SizedBox(height: AppSpacing.sm),
              DropdownButtonFormField(
                initialValue: _selectedTerritory,
                items: availableTerritories
                    .map(
                      (territory) => DropdownMenuItem(
                        value: territory,
                        child: Text(territory.label),
                      ),
                    )
                    .toList(),
                onChanged: (territory) {
                  if (territory != null) {
                    setState(() => _selectedTerritory = territory);
                  }
                },
                decoration: InputDecoration(
                  filled: true,
                  fillColor: AppColors.surface,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(18),
                    borderSide: const BorderSide(color: AppColors.line),
                  ),
                ),
              ),
              const Spacer(),
              PrimaryButton(
                label: 'Entrar y jugar',
                onPressed: () {
                  ref
                      .read(appControllerProvider.notifier)
                      .startGuest(_selectedTerritory);
                  context.go('/home');
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _LockedChoice extends StatelessWidget {
  const _LockedChoice({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.line),
      ),
      child: Row(
        children: [
          const Icon(Icons.shield_rounded, color: AppColors.brand),
          const SizedBox(width: AppSpacing.sm),
          Text(
            label,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
          ),
        ],
      ),
    );
  }
}
