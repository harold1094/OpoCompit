import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, shadows, spacing } from '@/core/design/tokens';
import { AvatarPreview } from '@/features/avatar/components/AvatarPreview';
import { useAppStore } from '@/features/app-state/useAppStore';
import { AppScreen } from '@/shared/components/AppScreen';
import {ContentState} from '@/shared/components/ContentState';
import { PrimaryButton } from '@/shared/components/PrimaryButton';

export default function HomeScreen() {
  const profile = useAppStore((state) => state.profile);
  const avatarInventory = useAppStore((state) => state.avatarInventory);
  const dailyReward = useAppStore((state) => state.dailyReward);
  const missions = useAppStore((state) => state.missions);
  const isLoadingEngagement = useAppStore((state) => state.isLoadingEngagement);
  const engagementError = useAppStore((state) => state.engagementError);
  const startQuickMatch = useAppStore((state) => state.startQuickMatch);
  const isStartingQuiz = useAppStore((state) => state.isStartingQuiz);
  const isClaimingDailyReward = useAppStore((state) => state.isClaimingDailyReward);
  const claimingMissionId = useAppStore((state) => state.claimingMissionId);
  const refreshDailyEngagement = useAppStore((state) => state.refreshDailyEngagement);
  const claimDailyReward = useAppStore((state) => state.claimDailyReward);
  const claimMission = useAppStore((state) => state.claimMission);
  const unreadNotifications = useAppStore((state) => state.notificationOverview.unreadCount);
  const loadNotifications = useAppStore((state) => state.loadNotifications);

  useFocusEffect(
    useCallback(() => {
      void refreshDailyEngagement();
      void loadNotifications();
    }, [loadNotifications, refreshDailyEngagement]),
  );

  if (!profile) return null;
  const currentLevelXp = profile.xp % 100;
  const engagementUnavailable = !dailyReward && missions.length === 0;

  const play = async () => {
    const count = await startQuickMatch();
    if (count > 0) {
      void Haptics.selectionAsync();
      router.push('/quiz');
      return;
    }
    const message = useAppStore.getState().quizError;
    if (message) Alert.alert('No se pudo iniciar la partida', message);
  };

  const collectDailyReward = async () => {
    const claimed = await claimDailyReward();
    if (claimed) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }
    const message = useAppStore.getState().engagementError;
    if (message) Alert.alert('No se pudo recoger', message);
  };

  const collectMission = async (missionId: string) => {
    const claimed = await claimMission(missionId);
    if (claimed) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }
    const message = useAppStore.getState().engagementError;
    if (message) Alert.alert('No se pudo recoger', message);
  };

  return (
    <AppScreen>
      <View style={styles.topbar}>
        <View style={styles.identity}>
          <Pressable
            accessibilityLabel="Abrir avatar y tienda"
            accessibilityRole="button"
            onPress={() => router.push('/avatar-shop')}
            style={({ pressed }) => [styles.avatarButton, pressed && styles.modePressed]}
          >
            <AvatarPreview loadout={avatarInventory.equipped} size={50} />
          </Pressable>
          <View style={styles.identityCopy}>
            <Text style={styles.greeting}>Hola, {profile.username}</Text>
            <Text style={styles.territory}>{profile.territory.label}</Text>
          </View>
        </View>
        <View style={styles.topbarActions}>
          <Pressable
            accessibilityLabel={`${unreadNotifications} avisos sin leer`}
            accessibilityRole="button"
            onPress={() => router.push('/notifications')}
            style={({pressed}) => [styles.notificationButton, pressed && styles.modePressed]}
          >
            <MaterialCommunityIcons name="bell-outline" size={22} color={colors.ink} />
            {unreadNotifications > 0 ? (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {Math.min(unreadNotifications, 9)}{unreadNotifications > 9 ? '+' : ''}
                </Text>
              </View>
            ) : null}
          </Pressable>
          <View style={styles.wallet}>
            <MaterialCommunityIcons name="fire" size={18} color={colors.brand} />
            <Text style={styles.walletValue}>{profile.currentStreak}</Text>
            <View style={styles.walletDivider} />
            <MaterialCommunityIcons name="circle-multiple" size={17} color={colors.gold} />
            <Text style={styles.walletValue}>{profile.coins}</Text>
          </View>
        </View>
      </View>

      <View style={styles.levelRow}>
        <Text style={styles.level}>Nivel {profile.level}</Text>
        <Text style={styles.xp}>{profile.xp} XP</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${currentLevelXp}%` }]} />
      </View>

      <View style={styles.playZone}>
        <View style={styles.playTop}>
          <View style={styles.playText}>
            <Text style={styles.playEyebrow}>PARTIDA RÁPIDA</Text>
            <Text style={styles.playTitle}>Una ronda.{`\n`}Diez preguntas.</Text>
            <Text style={styles.playCopy}>Practica con contenido adaptado a {profile.territory.label}.</Text>
          </View>
          <View style={styles.playIllustration}>
            <View style={styles.playIllustrationBack} />
            <MaterialCommunityIcons name="school-outline" size={58} color={colors.ink} />
          </View>
        </View>
        <PrimaryButton
          label="JUGAR"
          icon="play"
          loading={isStartingQuiz}
          onPress={() => void play()}
        />
      </View>

      <View style={styles.modes}>
        <ModeButton
          icon="sword-cross"
          label="Duelo"
          color={colors.aqua}
          onPress={() => router.push('/(tabs)/social')}
        />
        <ModeButton
          icon="clipboard-text-outline"
          label="Test"
          color={colors.gold}
          onPress={() => router.push('/custom-test')}
        />
        <ModeButton
          icon="file-document-outline"
          label="Examen"
          color={colors.ink}
          onPress={() => router.push('/exams')}
        />
        <ModeButton
          icon="alert-circle-outline"
          label="Mis errores"
          color={colors.danger}
          onPress={() => router.push('/errors')}
        />
      </View>

      {engagementUnavailable ? (
        <ContentState
          kind={isLoadingEngagement ? 'loading' : engagementError ? 'error' : 'empty'}
          title={
            isLoadingEngagement
              ? 'Actualizando tu día'
              : engagementError
                ? 'No pudimos cargar tus misiones'
                : 'No hay misiones disponibles'
          }
          detail={
            isLoadingEngagement
              ? 'Estamos recuperando tu recompensa y tus objetivos.'
              : engagementError ?? 'Vuelve más tarde para consultar nuevos objetivos.'
          }
          onRetry={() => void refreshDailyEngagement()}
        />
      ) : dailyReward ? (
        <View style={styles.rewardBand}>
          <View style={styles.rewardIcon}>
            <MaterialCommunityIcons name="gift-outline" size={23} color={colors.gold} />
          </View>
          <View style={styles.rewardCopy}>
            <Text style={styles.rewardTitle}>Recompensa diaria</Text>
            <Text style={styles.rewardSubtitle}>Día {dailyReward.day} · {dailyReward.coins} monedas</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={dailyReward.claimed || isClaimingDailyReward}
            onPress={() => void collectDailyReward()}
            style={[styles.claimButton, dailyReward.claimed && styles.claimedButton]}
          >
            {isClaimingDailyReward ? (
              <ActivityIndicator color={colors.surface} size="small" />
            ) : (
              <Text style={styles.claimLabel}>{dailyReward.claimed ? 'Recogida' : 'Recoger'}</Text>
            )}
          </Pressable>
        </View>
      ) : null}

      {!engagementUnavailable ? (
        <>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>Misiones de hoy</Text>
            <Text style={styles.sectionCount}>{missions.filter((mission) => mission.claimed).length}/{missions.length}</Text>
          </View>
          <View style={styles.missionList}>
            {missions.map((mission) => {
              const ready = mission.progress >= mission.target && !mission.claimed;
              return (
                <Pressable
                  disabled={!ready || claimingMissionId !== null}
                  key={mission.id}
                  onPress={() => void collectMission(mission.id)}
                  style={styles.mission}
                >
                  <View style={[styles.missionStatus, ready && styles.missionReady]}>
                    {claimingMissionId === mission.id ? (
                      <ActivityIndicator color={colors.surface} size="small" />
                    ) : (
                      <MaterialCommunityIcons
                        name={mission.claimed ? 'check' : 'target'}
                        size={20}
                        color={mission.claimed ? colors.success : ready ? colors.surface : colors.aqua}
                      />
                    )}
                  </View>
                  <View style={styles.missionCopy}>
                    <Text style={styles.missionTitle}>{mission.title}</Text>
                    <Text style={styles.missionProgress}>{mission.progress}/{mission.target}</Text>
                  </View>
                  <Text style={styles.missionReward}>+{mission.rewardCoins}</Text>
                  <MaterialCommunityIcons name="circle-multiple" size={16} color={colors.gold} />
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}
    </AppScreen>
  );
}

function ModeButton({
  icon,
  label,
  color,
  onPress,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  color: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.mode,
        !onPress && styles.modeDisabled,
        pressed && onPress && styles.modePressed,
      ]}
    >
      <MaterialCommunityIcons name={icon} size={24} color={color} />
      <Text style={styles.modeLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, paddingTop: 2 },
  identity: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 },
  identityCopy: { flex: 1, minWidth: 0 },
  avatarButton: { width: 50, height: 50, borderRadius: radius.md, ...shadows.card },
  greeting: { color: colors.ink, fontWeight: '900', fontSize: 18 },
  territory: { color: colors.muted, fontSize: 12, marginTop: 2 },
  topbarActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  notificationButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface, ...shadows.card },
  notificationBadge: { position: 'absolute', minWidth: 17, height: 17, alignItems: 'center', justifyContent: 'center', top: -4, right: -4, paddingHorizontal: 4, borderRadius: radius.pill, backgroundColor: colors.brand },
  notificationBadgeText: { color: colors.surface, fontSize: 9, fontWeight: '900' },
  wallet: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, paddingVertical: 9, paddingHorizontal: 11, borderRadius: radius.md, ...shadows.card },
  walletValue: { color: colors.ink, fontWeight: '800', fontSize: 13 },
  walletDivider: { width: 1, height: 17, backgroundColor: colors.line, marginHorizontal: 3 },
  levelRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.lg },
  level: { color: colors.ink, fontWeight: '800', fontSize: 13 },
  xp: { color: colors.muted, fontWeight: '700', fontSize: 12 },
  progressTrack: { height: 8, borderRadius: radius.pill, backgroundColor: colors.line, marginTop: 7, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.aqua, borderRadius: radius.pill },
  playZone: { marginTop: spacing.lg, padding: 18, backgroundColor: colors.softBrand, borderRadius: radius.lg, overflow: 'hidden', ...shadows.card },
  playTop: { minHeight: 150, flexDirection: 'row', alignItems: 'center', gap: 8 },
  playText: { flex: 1, zIndex: 1 },
  playEyebrow: { color: colors.brand, fontSize: 11, fontWeight: '900', letterSpacing: 0.3 },
  playTitle: { color: colors.ink, fontSize: 26, lineHeight: 29, fontWeight: '900', marginTop: 6 },
  playCopy: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 7, marginBottom: spacing.md },
  playIllustration: { width: 112, height: 112, alignItems: 'center', justifyContent: 'center' },
  playIllustrationBack: { position: 'absolute', width: 128, height: 128, borderRadius: 64, backgroundColor: '#FFDCCB' },
  modes: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  mode: { flex: 1, minWidth: 0, height: 78, alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, ...shadows.card },
  modePressed: { backgroundColor: colors.softBrand },
  modeDisabled: { opacity: 0.5 },
  modeLabel: { color: colors.ink, fontSize: 11, fontWeight: '800', textAlign: 'center' },
  rewardBand: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: spacing.lg, backgroundColor: colors.softGold, borderWidth: 1, borderColor: '#F3D678', borderRadius: radius.lg, padding: 14, ...shadows.card },
  rewardIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  rewardCopy: { flex: 1 },
  rewardTitle: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  rewardSubtitle: { color: colors.muted, fontSize: 12, marginTop: 2 },
  claimButton: { minWidth: 76, minHeight: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.gold, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 8, ...shadows.card },
  claimedButton: { opacity: 0.45 },
  claimLabel: { color: colors.surface, fontSize: 12, fontWeight: '800' },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xl, marginBottom: spacing.sm },
  sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: '900' },
  sectionCount: { color: colors.muted, fontSize: 13, fontWeight: '800' },
  missionList: { gap: spacing.sm, marginBottom: spacing.xl },
  mission: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 12, ...shadows.card },
  missionStatus: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.softAqua, alignItems: 'center', justifyContent: 'center' },
  missionReady: { backgroundColor: colors.aqua },
  missionCopy: { flex: 1 },
  missionTitle: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  missionProgress: { color: colors.muted, fontSize: 12, marginTop: 2 },
  missionReward: { color: colors.ink, fontSize: 12, fontWeight: '900' },
});
