import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/core/design/tokens';
import { useAppStore } from '@/features/app-state/useAppStore';
import { AppScreen } from '@/shared/components/AppScreen';
import { PrimaryButton } from '@/shared/components/PrimaryButton';
import { StatTile } from '@/shared/components/StatTile';

export default function ResultsScreen() {
  const result = useAppStore((state) => state.lastResult);
  if (!result) return <Redirect href="/(tabs)" />;

  return (
    <AppScreen>
      <View style={styles.resultHeader}>
        <View style={styles.resultIcon}>
          <MaterialCommunityIcons
            name={result.percentage >= 0.8 ? 'trophy-outline' : 'check-bold'}
            size={37}
            color={colors.surface}
          />
        </View>
        <Text style={styles.eyebrow}>PARTIDA COMPLETADA</Text>
        <Text style={styles.score}>{Math.round(result.percentage * 100)}%</Text>
        <Text style={styles.scoreLabel}>{result.correct} de {result.attempts.length} correctas</Text>
      </View>

      <View style={styles.stats}>
        <StatTile label="Aciertos" value={`${result.correct}`} accent={colors.success} />
        <StatTile label="Errores" value={`${result.incorrect}`} accent={colors.danger} />
        <StatTile label="En blanco" value={`${result.blank}`} accent={colors.muted} />
      </View>

      <View style={styles.rewards}>
        <Text style={styles.sectionTitle}>Tu recompensa</Text>
        <View style={styles.rewardRow}>
          <View style={styles.reward}>
            <MaterialCommunityIcons name="star-four-points" size={24} color={colors.aqua} />
            <View>
              <Text style={styles.rewardValue}>+{result.xpEarned} XP</Text>
              <Text style={styles.rewardLabel}>Experiencia</Text>
            </View>
          </View>
          <View style={styles.reward}>
            <MaterialCommunityIcons name="circle-multiple" size={25} color={colors.gold} />
            <View>
              <Text style={styles.rewardValue}>+{result.coinsEarned}</Text>
              <Text style={styles.rewardLabel}>Monedas</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.review}>
        <Text style={styles.sectionTitle}>Revisión</Text>
        {result.attempts.map((attempt, index) => (
          <View key={attempt.question.id} style={styles.reviewRow}>
            <View
              style={[
                styles.reviewStatus,
                { backgroundColor: attempt.isCorrect ? colors.success : attempt.isBlank ? colors.muted : colors.danger },
              ]}
            >
              <MaterialCommunityIcons
                name={attempt.isCorrect ? 'check' : attempt.isBlank ? 'minus' : 'close'}
                size={17}
                color={colors.surface}
              />
            </View>
            <Text numberOfLines={2} style={styles.reviewText}>{index + 1}. {attempt.question.statement}</Text>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <PrimaryButton label="Volver al inicio" icon="home-variant-outline" onPress={() => router.replace('/(tabs)')} />
        <PrimaryButton label="Repasar mis errores" icon="alert-circle-outline" variant="secondary" onPress={() => router.replace('/errors')} />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  resultHeader: { alignItems: 'center', paddingVertical: spacing.lg },
  resultIcon: { width: 68, height: 68, borderRadius: 34, backgroundColor: colors.aqua, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  eyebrow: { color: colors.muted, fontSize: 12, fontWeight: '900' },
  score: { color: colors.ink, fontSize: 58, lineHeight: 64, fontWeight: '900', marginTop: spacing.sm },
  scoreLabel: { color: colors.muted, fontSize: 15, marginTop: 3 },
  stats: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  rewards: { marginTop: spacing.xl },
  sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: '900', marginBottom: spacing.sm },
  rewardRow: { flexDirection: 'row', gap: spacing.sm },
  reward: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, padding: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md },
  rewardValue: { color: colors.ink, fontSize: 16, fontWeight: '900' },
  rewardLabel: { color: colors.muted, fontSize: 11, marginTop: 2 },
  review: { marginTop: spacing.xl },
  reviewRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  reviewStatus: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  reviewText: { flex: 1, color: colors.ink, fontSize: 13, lineHeight: 18 },
  actions: { gap: spacing.sm, marginTop: spacing.xl, marginBottom: spacing.lg },
});
