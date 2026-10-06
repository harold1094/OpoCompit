import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, shadows, spacing } from '@/core/design/tokens';
import {
  isFirebaseAuthEnabled,
  isUsingFirebaseEmulators,
} from '@/core/firebase/firebaseClient';
import { AvatarPreview } from '@/features/avatar/components/AvatarPreview';
import { useAppStore } from '@/features/app-state/useAppStore';
import { AchievementRow } from '@/features/achievements/components/AchievementRow';
import { questionCategoryLabel } from '@/features/quiz/data/categoryCatalog';
import { AppScreen } from '@/shared/components/AppScreen';
import { StatTile } from '@/shared/components/StatTile';

export default function ProfileScreen() {
  const profile = useAppStore((state) => state.profile);
  const avatarInventory = useAppStore((state) => state.avatarInventory);
  const backendMode = useAppStore((state) => state.backendMode);
  const insights = useAppStore((state) => state.learningInsights);
  const insightsLoading = useAppStore((state) => state.isLoadingLearningInsights);
  const insightsError = useAppStore((state) => state.learningInsightsError);
  const loadLearningInsights = useAppStore((state) => state.loadLearningInsights);
  const achievements = useAppStore((state) => state.achievementOverview);
  const achievementsLoading = useAppStore((state) => state.isLoadingAchievements);
  const achievementsError = useAppStore((state) => state.achievementsError);
  const loadAchievements = useAppStore((state) => state.loadAchievements);

  useFocusEffect(
    useCallback(() => {
      void loadLearningInsights();
      void loadAchievements();
    }, [loadAchievements, loadLearningInsights]),
  );

  if (!profile) return null;
  const accuracy = profile.totalQuestions === 0 ? 0 : profile.correctAnswers / profile.totalQuestions;

  return (
    <AppScreen>
      <View style={styles.header}>
        <View style={styles.profileGlowLeft} />
        <View style={styles.profileGlowRight} />
        <Pressable
          accessibilityLabel="Abrir avatar y tienda"
          accessibilityRole="button"
          onPress={() => router.push('/avatar-shop')}
          style={({ pressed }) => [styles.avatarButton, pressed && styles.adminLinkPressed]}
        >
          <AvatarPreview loadout={avatarInventory.equipped} size={92} />
        </Pressable>
        <Text style={styles.name}>{profile.username}</Text>
        <Text style={styles.scope}>{profile.oppositionName} · {profile.territory.label}</Text>
        <View style={styles.sessionBadge}>
          <View style={[styles.sessionDot, { backgroundColor: profile.isGuest ? colors.gold : colors.success }]} />
          <Text style={styles.sessionText}>
            {!profile.isGuest
              ? 'Cuenta vinculada'
              : profile.uid === 'local_guest'
                ? 'Modo local'
                : 'Invitado Firebase'}
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

      <View style={styles.topicHeader}>
        <Text style={styles.sectionTitle}>Rendimiento por temas</Text>
        {insightsLoading ? <Text style={styles.topicStatus}>Actualizando...</Text> : null}
      </View>
      {insightsError && !insights ? (
        <Pressable onPress={() => void loadLearningInsights()} style={styles.insightsMessage}>
          <MaterialCommunityIcons name="cloud-alert-outline" size={21} color={colors.danger} />
          <Text style={styles.insightsMessageText}>No se pudieron cargar. Pulsa para reintentar.</Text>
        </Pressable>
      ) : !insights || insights.categories.length === 0 ? (
        <View style={styles.insightsMessage}>
          <MaterialCommunityIcons name="chart-box-outline" size={21} color={colors.aqua} />
          <Text style={styles.insightsMessageText}>Completa un test para descubrir tus puntos fuertes y débiles.</Text>
        </View>
      ) : (
        <View>
          <View style={styles.topicHighlights}>
            <View style={styles.topicHighlight}>
              <MaterialCommunityIcons name="trending-up" size={20} color={colors.success} />
              <Text style={styles.topicHighlightLabel}>Tema fuerte</Text>
              <Text numberOfLines={2} style={styles.topicHighlightValue}>
                {questionCategoryLabel(insights.strongestCategory?.categoryId ?? '')}
              </Text>
              <Text style={styles.topicHighlightPercent}>
                {Math.round((insights.strongestCategory?.accuracy ?? 0) * 100)}%
              </Text>
            </View>
            <View style={styles.topicHighlight}>
              <MaterialCommunityIcons name="target" size={20} color={colors.brand} />
              <Text style={styles.topicHighlightLabel}>A reforzar</Text>
              <Text numberOfLines={2} style={styles.topicHighlightValue}>
                {questionCategoryLabel(insights.weakestCategory?.categoryId ?? '')}
              </Text>
              <Text style={styles.topicHighlightPercent}>
                {Math.round((insights.weakestCategory?.accuracy ?? 0) * 100)}%
              </Text>
            </View>
          </View>

          <View style={styles.topicList}>
            {insights.categories.map((category) => (
              <View key={category.categoryId} style={styles.topicRow}>
                <View style={styles.topicRowHeading}>
                  <Text style={styles.topicName}>{questionCategoryLabel(category.categoryId)}</Text>
                  <Text style={styles.topicPercent}>{Math.round(category.accuracy * 100)}%</Text>
                </View>
                <View style={styles.topicTrack}>
                  <View
                    style={[
                      styles.topicProgress,
                      { width: `${Math.round(category.accuracy * 100)}%` },
                    ]}
                  />
                </View>
                <Text style={styles.topicMeta}>
                  {category.correctCount} de {category.timesSeen} correctas · {category.pendingReviewCount} pendientes
                </Text>
              </View>
            ))}
          </View>

          {(insights.weakestCategory?.pendingReviewCount ?? 0) > 0 ? (
            <Pressable
              onPress={() => router.push({
                pathname: '/errors',
                params: { category: insights.weakestCategory?.categoryId },
              })}
              style={({ pressed }) => [styles.reviewWeakLink, pressed && styles.adminLinkPressed]}
            >
              <MaterialCommunityIcons name="target" size={20} color={colors.brand} />
              <Text style={styles.reviewWeakText}>Repasar el tema más débil</Text>
              <MaterialCommunityIcons name="chevron-right" size={21} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>
      )}

      <View style={styles.topicHeader}>
        <Text style={styles.sectionTitle}>Logros</Text>
        {achievements ? (
          <Text style={styles.topicStatus}>
            {achievements.unlockedCount} de {achievements.totalCount}
          </Text>
        ) : achievementsLoading ? <Text style={styles.topicStatus}>Actualizando...</Text> : null}
      </View>
      {achievementsError && !achievements ? (
        <Pressable onPress={() => void loadAchievements()} style={styles.insightsMessage}>
          <MaterialCommunityIcons name="cloud-alert-outline" size={21} color={colors.danger} />
          <Text style={styles.insightsMessageText}>No se pudieron cargar. Pulsa para reintentar.</Text>
        </Pressable>
      ) : achievements ? (
        <View style={styles.achievementPreview}>
          {achievements.items.slice(0, 2).map((achievement) => (
            <AchievementRow key={achievement.id} achievement={achievement} />
          ))}
          <Pressable
            onPress={() => router.push('/achievements')}
            style={({ pressed }) => [styles.achievementsLink, pressed && styles.adminLinkPressed]}
          >
            <MaterialCommunityIcons name="trophy-outline" size={21} color={colors.gold} />
            <Text style={styles.achievementsLinkText}>Ver todos los logros</Text>
            <MaterialCommunityIcons name="chevron-right" size={21} color={colors.muted} />
          </Pressable>
        </View>
      ) : (
        <View style={styles.insightsMessage}>
          <MaterialCommunityIcons name="trophy-outline" size={21} color={colors.gold} />
          <Text style={styles.insightsMessageText}>Calculando tu progreso de logros.</Text>
        </View>
      )}

      <Pressable
        onPress={() => router.push('/avatar-shop')}
        style={({ pressed }) => [styles.shopLink, pressed && styles.adminLinkPressed]}
      >
        <View style={styles.shopIcon}>
          <MaterialCommunityIcons name="hanger" size={22} color={colors.aqua} />
        </View>
        <View style={styles.adminCopy}>
          <Text style={styles.adminTitle}>Avatar y tienda</Text>
          <Text style={styles.adminText}>{avatarInventory.ownedItemIds.length} objetos en tu colección</Text>
        </View>
        <View style={styles.shopWallet}>
          <MaterialCommunityIcons name="circle-multiple" size={15} color={colors.gold} />
          <Text style={styles.shopBalance}>{profile.coins}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={22} color={colors.muted} />
      </Pressable>

      <Pressable
        onPress={() => router.push('/premium')}
        style={({ pressed }) => [styles.premiumLink, pressed && styles.adminLinkPressed]}
      >
        <View style={styles.premiumIcon}>
          <MaterialCommunityIcons name="crown-outline" size={22} color={colors.gold} />
        </View>
        <View style={styles.adminCopy}>
          <Text style={styles.adminTitle}>OpoCompit Premium</Text>
          <Text style={styles.adminText}>Plan gratuito y ventajas Premium</Text>
        </View>
        <View style={styles.shopWallet}>
          <MaterialCommunityIcons name="diamond-stone" size={15} color={colors.aqua} />
          <Text style={styles.shopBalance}>{profile.gems}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={22} color={colors.muted} />
      </Pressable>

      {backendMode === 'firebase' && isUsingFirebaseEmulators() ? (
        <Pressable
          onPress={() => router.push('/admin')}
          style={({ pressed }) => [styles.adminLink, pressed && styles.adminLinkPressed]}
        >
          <View style={styles.adminIcon}>
            <MaterialCommunityIcons name="clipboard-edit-outline" size={22} color={colors.brand} />
          </View>
          <View style={styles.adminCopy}>
            <Text style={styles.adminTitle}>Administrar preguntas</Text>
            <Text style={styles.adminText}>Importación y cola de revisión local</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color={colors.muted} />
        </Pressable>
      ) : null}

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/settings')}
        style={({ pressed }) => [styles.adminLink, pressed && styles.adminLinkPressed]}
      >
        <View style={styles.settingsIcon}>
          <MaterialCommunityIcons name="cog-outline" size={22} color={colors.ink} />
        </View>
        <View style={styles.adminCopy}>
          <Text style={styles.adminTitle}>Ajustes y privacidad</Text>
          <Text style={styles.adminText}>Avisos, vibración, analítica y tus datos</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={22} color={colors.muted} />
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/account')}
        style={({ pressed }) => [styles.accountNote, pressed && styles.adminLinkPressed]}
      >
        <MaterialCommunityIcons
          name={profile.isGuest ? 'shield-plus-outline' : 'shield-check-outline'}
          size={22}
          color={profile.isGuest ? colors.brand : colors.success}
        />
        <View style={styles.accountCopy}>
          <Text style={styles.accountTitle}>
            {profile.isGuest ? 'Guarda tu progreso' : 'Cuenta y acceso'}
          </Text>
          <Text style={styles.accountText}>
            {!profile.isGuest
              ? backendMode === 'firebase'
                ? 'Gestiona tu sesión y el acceso a tu progreso.'
                : 'Identidad vinculada; el progreso sigue guardado en este dispositivo.'
              : backendMode === 'firebase'
                ? 'Crea una cuenta sin perder XP, monedas, amigos ni inventario.'
                : isFirebaseAuthEnabled()
                  ? 'Vincula Google sin perder XP, monedas ni estadísticas.'
                  : 'Tu progreso está guardado en este dispositivo.'}
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={22} color={colors.muted} />
      </Pressable>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: { minHeight: 210, alignItems: 'center', justifyContent: 'center', paddingTop: spacing.md, paddingBottom: spacing.lg, overflow: 'hidden' },
  profileGlowLeft: { position: 'absolute', width: 150, height: 150, borderRadius: 75, left: -65, bottom: -55, backgroundColor: colors.softAqua, pointerEvents: 'none' },
  profileGlowRight: { position: 'absolute', width: 130, height: 130, borderRadius: 65, right: -50, top: -45, backgroundColor: colors.softBrand, pointerEvents: 'none' },
  avatarButton: { borderRadius: radius.lg, ...shadows.floating },
  name: { color: colors.ink, fontSize: 25, fontWeight: '900', marginTop: 12 },
  scope: { color: colors.muted, fontSize: 13, marginTop: 3 },
  sessionBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5, ...shadows.card },
  sessionDot: { width: 7, height: 7, borderRadius: 4 },
  sessionText: { color: colors.muted, fontSize: 11, fontWeight: '800' },
  levelBand: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, backgroundColor: colors.navy, paddingHorizontal: 22, paddingVertical: 18, borderRadius: radius.lg, ...shadows.floating },
  levelLabel: { color: colors.gold, fontSize: 10, fontWeight: '900' },
  levelValue: { color: colors.surface, fontSize: 40, fontWeight: '900' },
  levelDivider: { width: 1, height: 50, backgroundColor: '#42505A' },
  levelCopy: { flex: 1 },
  levelTitle: { color: colors.surface, fontSize: 16, fontWeight: '900' },
  levelSubtitle: { color: '#CBD1D6', fontSize: 12, marginTop: 3 },
  sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: '900', marginTop: spacing.xl, marginBottom: spacing.sm },
  grid: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  topicHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  topicStatus: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  insightsMessage: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 10, padding: spacing.md, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, backgroundColor: colors.surface },
  insightsMessageText: { flex: 1, color: colors.muted, fontSize: 12, lineHeight: 18 },
  topicHighlights: { flexDirection: 'row', gap: spacing.sm },
  topicHighlight: { flex: 1, minHeight: 128, padding: spacing.md, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, backgroundColor: colors.surface },
  topicHighlightLabel: { color: colors.muted, fontSize: 10, fontWeight: '800', marginTop: spacing.sm, textTransform: 'uppercase' },
  topicHighlightValue: { color: colors.ink, fontSize: 13, lineHeight: 17, fontWeight: '900', marginTop: 3 },
  topicHighlightPercent: { color: colors.aqua, fontSize: 20, fontWeight: '900', marginTop: 'auto' },
  topicList: { gap: spacing.md, marginTop: spacing.lg },
  topicRow: { gap: 6 },
  topicRowHeading: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  topicName: { flex: 1, color: colors.ink, fontSize: 13, fontWeight: '800' },
  topicPercent: { color: colors.ink, fontSize: 13, fontWeight: '900' },
  topicTrack: { height: 7, overflow: 'hidden', borderRadius: radius.pill, backgroundColor: colors.line },
  topicProgress: { height: '100%', minWidth: 2, borderRadius: radius.pill, backgroundColor: colors.aqua },
  topicMeta: { color: colors.muted, fontSize: 11 },
  reviewWeakLink: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: spacing.lg, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.softBrand, borderRadius: radius.lg, backgroundColor: colors.softBrand },
  reviewWeakText: { flex: 1, color: colors.brandDark, fontSize: 13, fontWeight: '900' },
  achievementPreview: { gap: spacing.sm },
  achievementsLink: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, backgroundColor: colors.surface },
  achievementsLinkText: { flex: 1, color: colors.ink, fontSize: 13, fontWeight: '900' },
  shopLink: { minHeight: 68, marginTop: spacing.lg, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, backgroundColor: colors.surface, ...shadows.card },
  shopIcon: { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.softAqua },
  premiumLink: { minHeight: 68, marginTop: spacing.sm, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, backgroundColor: colors.surface, ...shadows.card },
  premiumIcon: { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.softGold },
  shopWallet: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  shopBalance: { color: colors.ink, fontSize: 12, fontWeight: '900' },
  adminLink: { minHeight: 68, marginTop: spacing.lg, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, backgroundColor: colors.surface, ...shadows.card },
  adminLinkPressed: { opacity: 0.78 },
  adminIcon: { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.softBrand },
  settingsIcon: { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.field },
  adminCopy: { flex: 1 },
  adminTitle: { color: colors.ink, fontSize: 13, fontWeight: '900' },
  adminText: { color: colors.muted, fontSize: 11, marginTop: 3 },
  accountNote: { flexDirection: 'row', gap: 12, padding: spacing.md, marginTop: spacing.lg, marginBottom: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.softAqua },
  accountCopy: { flex: 1 },
  accountTitle: { color: colors.ink, fontSize: 13, fontWeight: '900' },
  accountText: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 3 },
});
