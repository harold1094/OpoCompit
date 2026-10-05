import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/core/design/tokens';
import { useAppStore } from '@/features/app-state/useAppStore';
import { AchievementRow } from '@/features/achievements/components/AchievementRow';
import { AppScreen } from '@/shared/components/AppScreen';
import { ContentState } from '@/shared/components/ContentState';
import { PrimaryButton } from '@/shared/components/PrimaryButton';

type AchievementFilter = 'all' | 'unlocked' | 'progress';

export default function AchievementsScreen() {
  const [filter, setFilter] = useState<AchievementFilter>('all');
  const overview = useAppStore((state) => state.achievementOverview);
  const loading = useAppStore((state) => state.isLoadingAchievements);
  const error = useAppStore((state) => state.achievementsError);
  const loadAchievements = useAppStore((state) => state.loadAchievements);

  useFocusEffect(
    useCallback(() => {
      void loadAchievements();
    }, [loadAchievements]),
  );

  const items = useMemo(() => {
    if (!overview) return [];
    if (filter === 'unlocked') return overview.items.filter((item) => item.unlocked);
    if (filter === 'progress') return overview.items.filter((item) => !item.unlocked);
    return overview.items;
  }, [filter, overview]);

  return (
    <AppScreen>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <MaterialCommunityIcons name="trophy-outline" size={26} color={colors.gold} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Logros</Text>
          <Text style={styles.subtitle}>Tu progreso también se construye a largo plazo.</Text>
        </View>
      </View>

      {overview ? (
        <View style={styles.summary}>
          <View>
            <Text style={styles.summaryLabel}>DESBLOQUEADOS</Text>
            <Text style={styles.summaryValue}>{overview.unlockedCount} de {overview.totalCount}</Text>
          </View>
          <View style={styles.summaryIcon}>
            <MaterialCommunityIcons name="medal-outline" size={32} color={colors.gold} />
          </View>
        </View>
      ) : null}

      <View style={styles.filters}>
        <Filter label="Todos" selected={filter === 'all'} onPress={() => setFilter('all')} />
        <Filter label="Conseguidos" selected={filter === 'unlocked'} onPress={() => setFilter('unlocked')} />
        <Filter label="En progreso" selected={filter === 'progress'} onPress={() => setFilter('progress')} />
      </View>

      {loading && !overview ? (
        <ContentState kind="loading" title="Calculando tus logros" detail="Revisamos tu progreso validado." />
      ) : error && !overview ? (
        <ContentState kind="error" title="No pudimos cargar tus logros" detail={error} onRetry={() => void loadAchievements()} />
      ) : items.length === 0 ? (
        <ContentState kind="empty" title="No hay logros en esta vista" detail="Prueba con otro filtro." />
      ) : (
        <View style={styles.list}>
          {items.map((achievement) => (
            <AchievementRow key={achievement.id} achievement={achievement} />
          ))}
        </View>
      )}

      <View style={styles.back}>
        <PrimaryButton label="Volver al perfil" icon="arrow-left" variant="secondary" onPress={() => router.back()} />
      </View>
    </AppScreen>
  );
}

function Filter({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{selected}}
      onPress={onPress}
      style={[styles.filter, selected && styles.filterSelected]}
    >
      <Text style={[styles.filterText, selected && styles.filterTextSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: spacing.lg },
  headerIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.softGold },
  headerCopy: { flex: 1 },
  title: { color: colors.ink, fontSize: 28, fontWeight: '900' },
  subtitle: { color: colors.muted, fontSize: 13, marginTop: 3 },
  summary: { minHeight: 94, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, backgroundColor: colors.navy, borderRadius: radius.lg },
  summaryLabel: { color: colors.gold, fontSize: 10, fontWeight: '900' },
  summaryValue: { color: colors.surface, fontSize: 25, fontWeight: '900', marginTop: 3 },
  summaryIcon: { width: 54, height: 54, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: '#293E58' },
  filters: { flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.lg },
  filter: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xs, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface },
  filterSelected: { borderColor: colors.brand, backgroundColor: colors.softBrand },
  filterText: { color: colors.muted, fontSize: 11, fontWeight: '800', textAlign: 'center' },
  filterTextSelected: { color: colors.brand },
  list: { gap: spacing.sm },
  back: { marginTop: spacing.lg, marginBottom: spacing.lg },
});
