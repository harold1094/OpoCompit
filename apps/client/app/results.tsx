import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, shadows, spacing } from '@/core/design/tokens';
import { useAppStore } from '@/features/app-state/useAppStore';
import { AppScreen } from '@/shared/components/AppScreen';
import { PrimaryButton } from '@/shared/components/PrimaryButton';
import { StatTile } from '@/shared/components/StatTile';

export default function ResultsScreen() {
  const result = useAppStore((state) => state.lastResult);
  const duel = useAppStore((state) => state.lastDuelResult);
  const pendingFriendDuel = useAppStore((state) => state.lastPendingFriendDuel);
  const activeGameMode = useAppStore((state) => state.activeGameMode);
  const officialExam = useAppStore((state) => state.activeOfficialExam);
  const customQuiz = useAppStore((state) => state.activeCustomQuiz);
  const friends = useAppStore((state) => state.friends);
  const startClassicDuel = useAppStore((state) => state.startClassicDuel);
  const sendFriendDuelInvitation = useAppStore((state) => state.sendFriendDuelInvitation);
  const joinMatchmaking = useAppStore((state) => state.joinMatchmaking);
  const isStartingDuel = useAppStore((state) => state.isStartingDuel);
  const isMatchmakingLoading = useAppStore((state) => state.isMatchmakingLoading);
  if (!result) return <Redirect href="/(tabs)" />;
  const isOfficialExam = activeGameMode === 'official-exam' && officialExam !== null;
  const isSimulation = activeGameMode === 'simulation' && customQuiz?.rules != null;
  const isScoredExam = isOfficialExam || isSimulation;
  const scoringRules = isOfficialExam ? officialExam.rules : customQuiz?.rules ?? null;

  const rematch = async () => {
    if (!duel) return;
    if (duel.kind === 'friend') {
      const friend = friends.find((item) => item.uid === duel.opponent.id);
      if (friend && await sendFriendDuelInvitation(friend)) {
        router.replace('/(tabs)/social');
      }
      return;
    }
    if (duel.kind === 'matchmaking') {
      await joinMatchmaking();
      router.replace('/(tabs)/social');
      return;
    }
    const count = await startClassicDuel(duel.opponent);
    if (count > 0) router.replace('/quiz');
  };

  const outcomeCopy = duel
    ? duel.outcome === 'win'
      ? { title: 'Victoria', icon: 'trophy-outline' as const, color: colors.success }
      : duel.outcome === 'loss'
        ? { title: 'Derrota', icon: 'shield-outline' as const, color: colors.danger }
        : { title: 'Empate', icon: 'scale-balance' as const, color: colors.gold }
    : null;

  return (
    <AppScreen>
      <View style={styles.resultHeader}>
        <View style={[styles.resultIcon, outcomeCopy && { backgroundColor: outcomeCopy.color }]}>
          <MaterialCommunityIcons
            name={outcomeCopy?.icon ?? (result.percentage >= 0.8 ? 'trophy-outline' : 'check-bold')}
            size={37}
            color={colors.surface}
          />
        </View>
        <Text style={styles.eyebrow}>
          {isOfficialExam
            ? 'EXAMEN FINALIZADO'
            : isSimulation
              ? 'SIMULACRO COMPLETADO'
            : duel
              ? 'DUELO COMPLETADO'
              : pendingFriendDuel
                ? 'RESULTADO ENVIADO'
                : 'PARTIDA COMPLETADA'}
        </Text>
        <Text style={styles.score}>
          {isScoredExam
            ? formatPoints(result.points)
            : outcomeCopy?.title ?? (pendingFriendDuel
              ? 'En espera'
              : `${Math.round(result.percentage * 100)}%`)}
        </Text>
        <Text style={styles.scoreLabel}>
          {isScoredExam
            ? `${formatPoints(result.maximumPoints ?? result.attempts.length)} puntos posibles · ${Math.round(result.percentage * 100)}% de aciertos`
            : `${result.correct} de ${result.attempts.length} correctas`}
        </Text>
      </View>

      {isScoredExam && scoringRules ? (
        <View style={styles.examSummary}>
          <MaterialCommunityIcons
            name={isSimulation ? 'clipboard-clock-outline' : 'file-certificate-outline'}
            size={23}
            color={colors.brand}
          />
          <View style={styles.examSummaryCopy}>
            <Text style={styles.examSummaryName}>
              {isSimulation ? 'Simulacro personalizado' : officialExam?.name}
            </Text>
            <Text style={styles.examSummaryRule}>
              +{scoringRules.correctPoints} acierto · -{scoringRules.incorrectPenalty} fallo · {scoringRules.blankPoints} blanco
            </Text>
          </View>
        </View>
      ) : null}

      {duel || pendingFriendDuel ? (
        <View style={styles.versus}>
          <View style={styles.competitor}>
            <Text style={styles.competitorName}>Tú</Text>
            <Text style={styles.competitorScore}>{duel?.playerCorrect ?? result.correct}</Text>
            <Text style={styles.competitorTime}>
              {duel ? formatTime(duel.playerElapsedMs) : 'Completado'}
            </Text>
          </View>
          <Text style={styles.versusLabel}>VS</Text>
          <View style={styles.competitor}>
            <Text style={styles.competitorName}>
              {duel?.opponent.name ?? pendingFriendDuel?.opponent.name}
            </Text>
            <Text style={styles.competitorScore}>{duel?.opponentCorrect ?? '···'}</Text>
            <Text style={styles.competitorTime}>
              {duel ? formatTime(duel.opponentElapsedMs) : 'Pendiente'}
            </Text>
          </View>
        </View>
      ) : null}

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
        {duel ? (
          <PrimaryButton
            label={duel.kind === 'friend'
              ? 'Pedir revancha'
              : duel.kind === 'matchmaking'
                ? 'Buscar otro rival'
                : 'Revancha'}
            icon="refresh"
            loading={isStartingDuel || isMatchmakingLoading}
            onPress={() => void rematch()}
          />
        ) : null}
        {pendingFriendDuel ? (
          <PrimaryButton
            label="Volver a Social"
            icon="account-group-outline"
            onPress={() => router.replace('/(tabs)/social')}
          />
        ) : null}
        <PrimaryButton label="Volver al inicio" icon="home-variant-outline" onPress={() => router.replace('/(tabs)')} />
        <PrimaryButton label="Repasar mis errores" icon="alert-circle-outline" variant="secondary" onPress={() => router.replace('/errors')} />
      </View>
    </AppScreen>
  );
}

function formatTime(milliseconds: number): string {
  const seconds = Math.round(milliseconds / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function formatPoints(points: number): string {
  return Number.isInteger(points) ? String(points) : points.toFixed(2).replace('.', ',');
}

const styles = StyleSheet.create({
  resultHeader: { alignItems: 'center', paddingVertical: spacing.lg, paddingHorizontal: spacing.md, borderRadius: radius.xl, backgroundColor: colors.softAqua, ...shadows.card },
  resultIcon: { width: 70, height: 70, borderRadius: 35, backgroundColor: colors.aqua, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md, borderWidth: 5, borderColor: colors.surface, ...shadows.card },
  eyebrow: { color: colors.muted, fontSize: 12, fontWeight: '900' },
  score: { color: colors.ink, fontSize: 58, lineHeight: 64, fontWeight: '900', marginTop: spacing.sm },
  scoreLabel: { color: colors.muted, fontSize: 15, marginTop: 3 },
  versus: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md, padding: spacing.md, backgroundColor: colors.navy, borderRadius: radius.lg, ...shadows.floating },
  examSummary: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: spacing.md, paddingHorizontal: spacing.md, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#F1C3AF', backgroundColor: colors.softBrand },
  examSummaryCopy: { flex: 1 },
  examSummaryName: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  examSummaryRule: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 3 },
  competitor: { flex: 1, alignItems: 'center' },
  competitorName: { color: colors.surface, fontSize: 13, fontWeight: '900' },
  competitorScore: { color: colors.gold, fontSize: 35, fontWeight: '900', marginTop: 3 },
  competitorTime: { color: '#CBD1D6', fontSize: 11, fontWeight: '700' },
  versusLabel: { color: colors.muted, fontSize: 12, fontWeight: '900' },
  stats: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  rewards: { marginTop: spacing.xl },
  sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: '900', marginBottom: spacing.sm },
  rewardRow: { flexDirection: 'row', gap: spacing.sm },
  reward: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, padding: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, ...shadows.card },
  rewardValue: { color: colors.ink, fontSize: 16, fontWeight: '900' },
  rewardLabel: { color: colors.muted, fontSize: 11, marginTop: 2 },
  review: { marginTop: spacing.xl },
  reviewRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing.sm, paddingHorizontal: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, ...shadows.card },
  reviewStatus: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  reviewText: { flex: 1, color: colors.ink, fontSize: 13, lineHeight: 18 },
  actions: { gap: spacing.sm, marginTop: spacing.xl, marginBottom: spacing.lg },
});
