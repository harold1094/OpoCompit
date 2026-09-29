import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/core/design/tokens';
import { RankingEntry, RankingScope } from '@/core/domain/types';
import { useAppStore } from '@/features/app-state/useAppStore';
import { AppScreen } from '@/shared/components/AppScreen';

const scopes: Array<{ id: RankingScope; label: string }> = [
  { id: 'global', label: 'Global' },
  { id: 'territory', label: 'Territorio' },
  { id: 'friends', label: 'Amigos' },
];

export default function RankingScreen() {
  const profile = useAppStore((state) => state.profile);
  const ranking = useAppStore((state) => state.ranking);
  const scope = useAppStore((state) => state.rankingScope);
  const isLoading = useAppStore((state) => state.isLoadingRanking);
  const error = useAppStore((state) => state.rankingError);
  const loadRanking = useAppStore((state) => state.loadRanking);

  useFocusEffect(
    useCallback(() => {
      void loadRanking(scope);
    }, [loadRanking, scope]),
  );

  if (!profile) return null;
  const entries = ranking?.scope === scope ? ranking.entries : [];
  const viewerOutsideTop = ranking?.scope === scope && ranking.viewer &&
    !entries.some((entry) => entry.uid === ranking.viewer?.uid) ? ranking.viewer : null;
  const contextLabel = scope === 'territory'
    ? ranking?.territoryLabel ?? profile.territory.label
    : scope === 'friends'
      ? 'Tu círculo'
      : 'Todos los opositores';

  return (
    <AppScreen>
      <View style={styles.heading}>
        <View style={styles.headingCopy}>
          <Text style={styles.title}>Ranking</Text>
          <Text style={styles.subtitle}>Histórico · {contextLabel}</Text>
        </View>
        <Pressable
          accessibilityLabel="Actualizar ranking"
          accessibilityRole="button"
          disabled={isLoading}
          onPress={() => void loadRanking(scope)}
          style={({ pressed }) => [styles.refreshButton, pressed && styles.pressed]}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.aqua} size="small" />
          ) : (
            <MaterialCommunityIcons name="refresh" size={22} color={colors.aqua} />
          )}
        </Pressable>
      </View>

      <View accessibilityRole="tablist" style={styles.filters}>
        {scopes.map((option) => {
          const active = option.id === scope;
          return (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: active, disabled: isLoading }}
              disabled={isLoading}
              key={option.id}
              onPress={() => void loadRanking(option.id)}
              style={({ pressed }) => [
                styles.filter,
                active && styles.filterActive,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.filterText, active && styles.filterActiveText]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {error ? (
        <View style={styles.messageBand}>
          <MaterialCommunityIcons name="alert-circle-outline" size={20} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            accessibilityLabel="Reintentar ranking"
            onPress={() => void loadRanking(scope)}
            style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
          >
            <MaterialCommunityIcons name="refresh" size={20} color={colors.aqua} />
          </Pressable>
        </View>
      ) : null}

      {isLoading && entries.length === 0 ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={colors.aqua} size="large" />
        </View>
      ) : null}

      {!isLoading && !error && entries.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="account-group-outline" size={30} color={colors.muted} />
          <Text style={styles.emptyTitle}>Aún no hay rivales aquí</Text>
          <Text style={styles.emptyText}>
            {scope === 'friends' ? 'Añade amigos para comparar vuestro progreso.' : 'Juega una partida para estrenar la clasificación.'}
          </Text>
        </View>
      ) : null}

      {entries.length > 0 ? (
        <View style={styles.list}>
          {entries.map((entry) => <RankingRow entry={entry} key={entry.uid} />)}
        </View>
      ) : null}

      {viewerOutsideTop ? (
        <View style={styles.viewerWrap}>
          <Text style={styles.viewerLabel}>Tu posición</Text>
          <RankingRow entry={viewerOutsideTop} />
        </View>
      ) : null}
    </AppScreen>
  );
}

function RankingRow({ entry }: { entry: RankingEntry }) {
  const topThree = entry.position <= 3;
  return (
    <View style={[styles.row, entry.isViewer && styles.userRow]}>
      <View style={styles.positionWrap}>
        {topThree ? (
          <MaterialCommunityIcons name="medal-outline" size={21} color={colors.gold} />
        ) : (
          <Text style={styles.position}>{entry.position}</Text>
        )}
      </View>
      <View style={[styles.avatar, entry.isViewer && styles.userAvatar]}>
        <MaterialCommunityIcons
          name="account-outline"
          size={22}
          color={entry.isViewer ? colors.surface : colors.ink}
        />
      </View>
      <View style={styles.copy}>
        <Text numberOfLines={1} style={styles.name}>
          {entry.isViewer ? `${entry.username} · Tú` : entry.username}
        </Text>
        <Text numberOfLines={1} style={styles.territory}>
          Nivel {entry.level} · {entry.territoryLabel}
        </Text>
      </View>
      <Text style={styles.xp}>{entry.score.toLocaleString('es-ES')} XP</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  headingCopy: { flex: 1 },
  title: { color: colors.ink, fontSize: 30, fontWeight: '900' },
  subtitle: { color: colors.muted, fontSize: 14, marginTop: 4 },
  refreshButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.softAqua },
  pressed: { opacity: 0.72 },
  filters: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg, marginBottom: spacing.lg },
  filter: { flex: 1, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  filterActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  filterText: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  filterActiveText: { color: colors.surface },
  list: { gap: spacing.sm },
  row: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 10 },
  userRow: { borderColor: colors.brand, backgroundColor: colors.softBrand },
  positionWrap: { width: 27, alignItems: 'center', justifyContent: 'center' },
  position: { color: colors.muted, fontSize: 15, fontWeight: '900' },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper },
  userAvatar: { backgroundColor: colors.brand },
  copy: { flex: 1, minWidth: 0 },
  name: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  territory: { color: colors.muted, fontSize: 11, marginTop: 2 },
  xp: { color: colors.ink, fontSize: 12, fontWeight: '900' },
  messageBand: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing.md, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface },
  errorText: { flex: 1, color: colors.danger, fontSize: 12, lineHeight: 17 },
  retryButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  loadingState: { minHeight: 260, alignItems: 'center', justifyContent: 'center' },
  emptyState: { minHeight: 230, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  emptyTitle: { color: colors.ink, fontSize: 16, fontWeight: '900', marginTop: spacing.sm },
  emptyText: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 4 },
  viewerWrap: { marginTop: spacing.xl, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.line },
  viewerLabel: { color: colors.muted, fontSize: 11, fontWeight: '900', marginBottom: spacing.sm, textTransform: 'uppercase' },
});
