import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/core/design/tokens';
import { useAppStore } from '@/features/app-state/useAppStore';
import { AppScreen } from '@/shared/components/AppScreen';
import { PrimaryButton } from '@/shared/components/PrimaryButton';

export default function HomeScreen() {
  const profile = useAppStore((state) => state.profile);
  const dailyReward = useAppStore((state) => state.dailyReward);
  const missions = useAppStore((state) => state.missions);
  const startQuickMatch = useAppStore((state) => state.startQuickMatch);
  const claimDailyReward = useAppStore((state) => state.claimDailyReward);
  const claimMission = useAppStore((state) => state.claimMission);

  if (!profile) return null;
  const currentLevelXp = profile.xp % 100;

  const play = () => {
    const count = startQuickMatch();
    if (count > 0) {
      void Haptics.selectionAsync();
      router.push('/quiz');
    }
  };

  return (
    <AppScreen>
      <View style={styles.topbar}>
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <MaterialCommunityIcons name="account-hard-hat-outline" size={28} color={colors.surface} />
          </View>
          <View>
            <Text style={styles.greeting}>Hola, {profile.username}</Text>
            <Text style={styles.territory}>{profile.territory.label}</Text>
          </View>
        </View>
        <View style={styles.wallet}>
          <MaterialCommunityIcons name="fire" size={18} color={colors.brand} />
          <Text style={styles.walletValue}>{profile.currentStreak}</Text>
          <View style={styles.walletDivider} />
          <MaterialCommunityIcons name="circle-multiple" size={17} color={colors.gold} />
          <Text style={styles.walletValue}>{profile.coins}</Text>
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
        <Text style={styles.playEyebrow}>PARTIDA RÁPIDA</Text>
        <Text style={styles.playTitle}>Una ronda. Diez preguntas.</Text>
        <Text style={styles.playCopy}>Contenido adaptado a {profile.territory.label}.</Text>
        <PrimaryButton label="JUGAR" icon="play" onPress={play} />
      </View>

      <View style={styles.modes}>
        <ModeButton icon="sword-cross" label="Duelo" color={colors.aqua} />
        <ModeButton icon="clipboard-text-outline" label="Test" color={colors.gold} />
        <ModeButton icon="file-document-outline" label="Examen" color={colors.ink} />
        <ModeButton
          icon="alert-circle-outline"
          label="Mis errores"
          color={colors.danger}
          onPress={() => router.push('/errors')}
        />
      </View>

      {dailyReward ? (
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
            disabled={dailyReward.claimed}
            onPress={() => {
              claimDailyReward();
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }}
            style={[styles.claimButton, dailyReward.claimed && styles.claimedButton]}
          >
            <Text style={styles.claimLabel}>{dailyReward.claimed ? 'Recogida' : 'Recoger'}</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>Misiones de hoy</Text>
        <Text style={styles.sectionCount}>{missions.filter((mission) => mission.claimed).length}/{missions.length}</Text>
      </View>
      <View style={styles.missionList}>
        {missions.map((mission) => {
          const ready = mission.progress >= mission.target && !mission.claimed;
          return (
            <Pressable
              disabled={!ready}
              key={mission.id}
              onPress={() => claimMission(mission.id)}
              style={styles.mission}
            >
              <View style={[styles.missionStatus, ready && styles.missionReady]}>
                <MaterialCommunityIcons
                  name={mission.claimed ? 'check' : 'target'}
                  size={20}
                  color={mission.claimed ? colors.success : ready ? colors.surface : colors.aqua}
                />
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
    <Pressable onPress={onPress} style={({ pressed }) => [styles.mode, pressed && styles.modePressed]}>
      <MaterialCommunityIcons name={icon} size={24} color={color} />
      <Text style={styles.modeLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.aqua, alignItems: 'center', justifyContent: 'center' },
  greeting: { color: colors.ink, fontWeight: '900', fontSize: 17 },
  territory: { color: colors.muted, fontSize: 12, marginTop: 2 },
  wallet: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, paddingVertical: 8, paddingHorizontal: 10, borderRadius: radius.md },
  walletValue: { color: colors.ink, fontWeight: '800', fontSize: 13 },
  walletDivider: { width: 1, height: 17, backgroundColor: colors.line, marginHorizontal: 3 },
  levelRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.lg },
  level: { color: colors.ink, fontWeight: '800', fontSize: 13 },
  xp: { color: colors.muted, fontWeight: '700', fontSize: 12 },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: colors.line, marginTop: 7, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.aqua, borderRadius: 4 },
  playZone: { marginTop: spacing.xl, marginHorizontal: -20, paddingHorizontal: 20, paddingVertical: 26, backgroundColor: colors.ink },
  playEyebrow: { color: colors.gold, fontSize: 12, fontWeight: '900' },
  playTitle: { color: colors.surface, fontSize: 27, lineHeight: 32, fontWeight: '900', marginTop: 7 },
  playCopy: { color: '#CBD1D6', fontSize: 14, marginTop: 5, marginBottom: spacing.lg },
  modes: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  mode: { flex: 1, minWidth: 0, height: 76, alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md },
  modePressed: { backgroundColor: colors.softBrand },
  modeLabel: { color: colors.ink, fontSize: 11, fontWeight: '800', textAlign: 'center' },
  rewardBand: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: spacing.xl, backgroundColor: colors.softGold, borderWidth: 1, borderColor: '#F2D98D', borderRadius: radius.md, padding: spacing.md },
  rewardIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  rewardCopy: { flex: 1 },
  rewardTitle: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  rewardSubtitle: { color: colors.muted, fontSize: 12, marginTop: 2 },
  claimButton: { backgroundColor: colors.ink, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 9 },
  claimedButton: { opacity: 0.45 },
  claimLabel: { color: colors.surface, fontSize: 12, fontWeight: '800' },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xl, marginBottom: spacing.sm },
  sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: '900' },
  sectionCount: { color: colors.muted, fontSize: 13, fontWeight: '800' },
  missionList: { gap: spacing.sm, marginBottom: spacing.xl },
  mission: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 12 },
  missionStatus: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.softAqua, alignItems: 'center', justifyContent: 'center' },
  missionReady: { backgroundColor: colors.aqua },
  missionCopy: { flex: 1 },
  missionTitle: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  missionProgress: { color: colors.muted, fontSize: 12, marginTop: 2 },
  missionReward: { color: colors.ink, fontSize: 12, fontWeight: '900' },
});
