import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, shadows, spacing } from '@/core/design/tokens';
import { trackEvent } from '@/core/analytics/analytics';
import { PremiumFeature, SubscriptionPlan } from '@/core/domain/types';
import { useAppStore } from '@/features/app-state/useAppStore';
import { premiumFeatureCopy } from '@/features/premium/domain/monetization';
import { AppScreen } from '@/shared/components/AppScreen';
import { PrimaryButton } from '@/shared/components/PrimaryButton';

export default function PremiumScreen() {
  const profile = useAppStore((state) => state.profile);
  const overview = useAppStore((state) => state.monetization);
  const loading = useAppStore((state) => state.isLoadingMonetization);
  const error = useAppStore((state) => state.monetizationError);
  const refresh = useAppStore((state) => state.refreshMonetization);

  useFocusEffect(useCallback(() => {
    void refresh();
    void trackEvent('paywall_viewed');
  }, [refresh]));

  if (!profile) return <Redirect href="/onboarding" />;
  const activePlan = overview.plans.find((plan) => plan.id === overview.entitlement.planId);

  return (
    <AppScreen>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Volver al perfil"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.ink} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Premium</Text>
          <Text style={styles.subtitle}>Personalización y profundidad extra</Text>
        </View>
        {loading ? <ActivityIndicator color={colors.aqua} /> : null}
      </View>

      <View style={styles.statusBand}>
        <View style={styles.statusIcon}>
          <MaterialCommunityIcons
            name={overview.entitlement.tier === 'premium' ? 'crown' : 'shield-outline'}
            size={25}
            color={overview.entitlement.tier === 'premium' ? colors.gold : colors.aqua}
          />
        </View>
        <View style={styles.statusCopy}>
          <Text style={styles.statusLabel}>PLAN ACTUAL</Text>
          <Text style={styles.statusValue}>{activePlan?.name ?? 'Gratuito'}</Text>
        </View>
        <View style={styles.gemBalance}>
          <MaterialCommunityIcons name="diamond-stone" size={18} color={colors.aqua} />
          <Text style={styles.gemValue}>{overview.gemBalance}</Text>
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Text style={styles.sectionTitle}>Planes</Text>
      {overview.plans.map((plan) => (
        <PlanPanel
          active={overview.entitlement.planId === plan.id}
          key={plan.id}
          plan={plan}
        />
      ))}

      {overview.plans.length === 0 && !loading ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="clock-outline" size={28} color={colors.muted} />
          <Text style={styles.emptyTitle}>Planes en preparación</Text>
        </View>
      ) : null}

      <View style={styles.fairPlay}>
        <MaterialCommunityIcons name="book-open-variant" size={23} color={colors.aqua} />
        <View style={styles.fairPlayCopy}>
          <Text style={styles.fairPlayTitle}>Estudio ilimitado para todos</Text>
          <Text style={styles.fairPlayText}>
            Premium mejora la experiencia y la personalización, nunca el acceso esencial a las preguntas.
          </Text>
        </View>
      </View>
    </AppScreen>
  );
}

function PlanPanel({ active, plan }: { active: boolean; plan: SubscriptionPlan }) {
  return (
    <View style={[styles.planPanel, active && styles.planPanelActive]}>
      <View style={styles.planHeading}>
        <View style={styles.crownIcon}>
          <MaterialCommunityIcons name="crown-outline" size={28} color={colors.gold} />
        </View>
        <View style={styles.planCopy}>
          <Text style={styles.planName}>{plan.name}</Text>
          <Text style={styles.planPrice}>{plan.priceLabel}</Text>
        </View>
        {plan.gemReward > 0 ? (
          <View style={styles.gemReward}>
            <MaterialCommunityIcons name="diamond-stone" size={15} color={colors.aqua} />
            <Text style={styles.gemRewardText}>+{plan.gemReward}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.benefits}>
        {plan.features.map((feature) => <Benefit feature={feature} key={feature} />)}
      </View>

      <PrimaryButton
        disabled={!plan.purchasable || active}
        icon={active ? 'check-circle-outline' : 'crown-outline'}
        label={active ? 'Plan activo' : plan.purchasable ? 'Continuar' : 'Disponible próximamente'}
        onPress={() => undefined}
      />
    </View>
  );
}

function Benefit({ feature }: { feature: PremiumFeature }) {
  const copy = premiumFeatureCopy[feature];
  return (
    <View style={styles.benefit}>
      <View style={styles.benefitIcon}>
        <MaterialCommunityIcons name={copy.icon} size={20} color={colors.aqua} />
      </View>
      <View style={styles.benefitCopy}>
        <Text style={styles.benefitTitle}>{copy.title}</Text>
        <Text style={styles.benefitText}>{copy.description}</Text>
      </View>
      <MaterialCommunityIcons name="check" size={18} color={colors.success} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  backButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.surface, ...shadows.card },
  headerCopy: { flex: 1 },
  title: { color: colors.ink, fontSize: 26, fontWeight: '900' },
  subtitle: { color: colors.muted, fontSize: 12, marginTop: 3 },
  statusBand: { minHeight: 82, marginTop: spacing.xl, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.lg, backgroundColor: colors.navy, ...shadows.floating },
  statusIcon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: '#243D5B' },
  statusCopy: { flex: 1 },
  statusLabel: { color: colors.gold, fontSize: 9, fontWeight: '900' },
  statusValue: { color: colors.surface, fontSize: 17, fontWeight: '900', marginTop: 3 },
  gemBalance: { minWidth: 58, minHeight: 34, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: radius.pill, backgroundColor: colors.surface },
  gemValue: { color: colors.ink, fontSize: 12, fontWeight: '900' },
  error: { color: colors.danger, fontSize: 12, lineHeight: 18, marginTop: spacing.md },
  sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: '900', marginTop: spacing.xl, marginBottom: spacing.sm },
  planPanel: { padding: spacing.md, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, backgroundColor: colors.surface, ...shadows.card },
  planPanelActive: { borderColor: colors.aqua },
  planHeading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  crownIcon: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.softGold },
  planCopy: { flex: 1 },
  planName: { color: colors.ink, fontSize: 18, fontWeight: '900' },
  planPrice: { color: colors.muted, fontSize: 12, marginTop: 3 },
  gemReward: { minHeight: 30, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, borderRadius: radius.pill, backgroundColor: colors.softAqua },
  gemRewardText: { color: colors.ink, fontSize: 11, fontWeight: '900' },
  benefits: { marginVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.line },
  benefit: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  benefitIcon: { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.softAqua },
  benefitCopy: { flex: 1 },
  benefitTitle: { color: colors.ink, fontSize: 13, fontWeight: '900' },
  benefitText: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 2 },
  emptyState: { minHeight: 130, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, backgroundColor: colors.surface },
  emptyTitle: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  fairPlay: { flexDirection: 'row', gap: 12, padding: spacing.md, marginTop: spacing.lg, marginBottom: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.softAqua },
  fairPlayCopy: { flex: 1 },
  fairPlayTitle: { color: colors.ink, fontSize: 13, fontWeight: '900' },
  fairPlayText: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 3 },
  pressed: { opacity: 0.78 },
});
