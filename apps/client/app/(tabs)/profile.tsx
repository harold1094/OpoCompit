import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, shadows, spacing } from '@/core/design/tokens';
import { isUsingFirebaseEmulators } from '@/core/firebase/firebaseClient';
import { AvatarPreview } from '@/features/avatar/components/AvatarPreview';
import { useAppStore } from '@/features/app-state/useAppStore';
import { AppScreen } from '@/shared/components/AppScreen';
import { StatTile } from '@/shared/components/StatTile';

export default function ProfileScreen() {
  const profile = useAppStore((state) => state.profile);
  const avatarInventory = useAppStore((state) => state.avatarInventory);
  const backendMode = useAppStore((state) => state.backendMode);
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
  shopLink: { minHeight: 68, marginTop: spacing.lg, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, backgroundColor: colors.surface, ...shadows.card },
  shopIcon: { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.softAqua },
  premiumLink: { minHeight: 68, marginTop: spacing.sm, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, backgroundColor: colors.surface, ...shadows.card },
  premiumIcon: { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.softGold },
  shopWallet: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  shopBalance: { color: colors.ink, fontSize: 12, fontWeight: '900' },
  adminLink: { minHeight: 68, marginTop: spacing.lg, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, backgroundColor: colors.surface, ...shadows.card },
  adminLinkPressed: { opacity: 0.78 },
  adminIcon: { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.softBrand },
  adminCopy: { flex: 1 },
  adminTitle: { color: colors.ink, fontSize: 13, fontWeight: '900' },
  adminText: { color: colors.muted, fontSize: 11, marginTop: 3 },
  accountNote: { flexDirection: 'row', gap: 12, padding: spacing.md, marginTop: spacing.lg, marginBottom: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.softAqua },
  accountCopy: { flex: 1 },
  accountTitle: { color: colors.ink, fontSize: 13, fontWeight: '900' },
  accountText: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 3 },
});
