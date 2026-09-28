import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/core/design/tokens';
import { useAppStore } from '@/features/app-state/useAppStore';
import { AppScreen } from '@/shared/components/AppScreen';
import { StatTile } from '@/shared/components/StatTile';

export default function ProfileScreen() {
  const profile = useAppStore((state) => state.profile);
  const backendMode = useAppStore((state) => state.backendMode);
  if (!profile) return null;
  const accuracy = profile.totalQuestions === 0 ? 0 : profile.correctAnswers / profile.totalQuestions;

  return (
    <AppScreen>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <MaterialCommunityIcons name="account-hard-hat-outline" size={47} color={colors.surface} />
        </View>
        <Text style={styles.name}>{profile.username}</Text>
        <Text style={styles.scope}>{profile.oppositionName} · {profile.territory.label}</Text>
        <View style={styles.sessionBadge}>
          <View style={[styles.sessionDot, { backgroundColor: profile.uid === 'local_guest' ? colors.gold : colors.success }]} />
          <Text style={styles.sessionText}>
            {profile.uid === 'local_guest' ? 'Modo local' : 'Invitado Firebase'}
          </Text>
        </View>
      </View>

      <View style={styles.levelBand}>
        <View>
          <Text style={styles.levelLabel}>NIVEL ACTUAL</Text>
          <Text style={styles.levelValue}>{profile.level}</Text>
        </View>
        <View style={styles.levelDivider} />
        <View style={styles.levelCopy}>
          <Text style={styles.levelTitle}>{profile.xp} XP acumulados</Text>
          <Text style={styles.levelSubtitle}>Sigue respondiendo para avanzar.</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Estadísticas</Text>
      <View style={styles.grid}>
        <StatTile label="Racha actual" value={`${profile.currentStreak} días`} accent={colors.brand} />
        <StatTile label="Mejor racha" value={`${profile.bestStreak} días`} accent={colors.gold} />
      </View>
      <View style={styles.grid}>
        <StatTile label="Preguntas" value={`${profile.totalQuestions}`} accent={colors.ink} />
        <StatTile label="Precisión" value={`${Math.round(accuracy * 100)}%`} accent={colors.success} />
      </View>
      <View style={styles.grid}>
        <StatTile label="Tests" value={`${profile.testsCompleted}`} accent={colors.aqua} />
        <StatTile label="Aciertos" value={`${profile.correctAnswers}`} accent={colors.success} />
      </View>
      <View style={styles.grid}>
        <StatTile label="Duelos" value={`${profile.duelsPlayed ?? 0}`} accent={colors.ink} />
        <StatTile label="Victorias" value={`${profile.duelWins ?? 0}`} accent={colors.gold} />
      </View>

      <View style={styles.accountNote}>
        <MaterialCommunityIcons name="shield-check-outline" size={22} color={colors.aqua} />
        <View style={styles.accountCopy}>
          <Text style={styles.accountTitle}>Sesión preparada</Text>
          <Text style={styles.accountText}>
            {backendMode === 'firebase'
              ? 'Tu invitado anónimo puede vincularse después sin perder el progreso.'
              : 'Activa Firebase en el entorno para sincronizar este progreso entre dispositivos.'}
          </Text>
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', paddingTop: spacing.md, paddingBottom: spacing.xl },
  avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: colors.aqua, alignItems: 'center', justifyContent: 'center' },
  name: { color: colors.ink, fontSize: 25, fontWeight: '900', marginTop: 12 },
  scope: { color: colors.muted, fontSize: 13, marginTop: 3 },
  sessionBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
  sessionDot: { width: 7, height: 7, borderRadius: 4 },
  sessionText: { color: colors.muted, fontSize: 11, fontWeight: '800' },
  levelBand: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, backgroundColor: colors.ink, marginHorizontal: -20, paddingHorizontal: 26, paddingVertical: 20 },
  levelLabel: { color: colors.gold, fontSize: 10, fontWeight: '900' },
  levelValue: { color: colors.surface, fontSize: 40, fontWeight: '900' },
  levelDivider: { width: 1, height: 50, backgroundColor: '#42505A' },
  levelCopy: { flex: 1 },
  levelTitle: { color: colors.surface, fontSize: 16, fontWeight: '900' },
  levelSubtitle: { color: '#CBD1D6', fontSize: 12, marginTop: 3 },
  sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: '900', marginTop: spacing.xl, marginBottom: spacing.sm },
  grid: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  accountNote: { flexDirection: 'row', gap: 12, padding: spacing.md, marginTop: spacing.lg, marginBottom: spacing.lg, borderRadius: radius.md, backgroundColor: colors.softAqua },
  accountCopy: { flex: 1 },
  accountTitle: { color: colors.ink, fontSize: 13, fontWeight: '900' },
  accountText: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 3 },
});
