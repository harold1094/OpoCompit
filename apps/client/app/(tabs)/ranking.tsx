import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/core/design/tokens';
import { useAppStore } from '@/features/app-state/useAppStore';
import { AppScreen } from '@/shared/components/AppScreen';

const leaderboard = [
  { name: 'LucíaM', xp: 4820, territory: 'Madrid' },
  { name: 'Alex112', xp: 4390, territory: 'Murcia' },
  { name: 'MarioCT', xp: 3960, territory: 'Cartagena' },
  { name: 'SaraBF', xp: 3510, territory: 'Valencia' },
];

export default function RankingScreen() {
  const profile = useAppStore((state) => state.profile);
  if (!profile) return null;

  const rows = [...leaderboard, { name: 'Tú', xp: profile.xp, territory: profile.territory.label }]
    .sort((left, right) => right.xp - left.xp)
    .map((entry, index) => ({ ...entry, position: index + 1 }));

  return (
    <AppScreen>
      <Text style={styles.title}>Ranking</Text>
      <Text style={styles.subtitle}>Compite sin perder de vista lo importante: responder mejor.</Text>

      <View style={styles.filters}>
        <View style={styles.filterActive}><Text style={styles.filterActiveText}>Global</Text></View>
        <View style={styles.filter}><Text style={styles.filterText}>Territorio</Text></View>
        <View style={styles.filter}><Text style={styles.filterText}>Amigos</Text></View>
      </View>

      <View style={styles.list}>
        {rows.map((entry) => {
          const isUser = entry.name === 'Tú';
          return (
            <View key={entry.name} style={[styles.row, isUser && styles.userRow]}>
              <Text style={[styles.position, entry.position <= 3 && styles.topPosition]}>{entry.position}</Text>
              <View style={[styles.avatar, isUser && styles.userAvatar]}>
                <MaterialCommunityIcons name="account-outline" size={22} color={isUser ? colors.surface : colors.ink} />
              </View>
              <View style={styles.copy}>
                <Text style={styles.name}>{entry.name}</Text>
                <Text style={styles.territory}>{entry.territory}</Text>
              </View>
              <Text style={styles.xp}>{entry.xp} XP</Text>
            </View>
          );
        })}
      </View>
      <Text style={styles.localNote}>Clasificación de demostración local. El ranking autoritativo se conectará a Cloud Functions.</Text>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.ink, fontSize: 30, fontWeight: '900' },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 20, marginTop: 4 },
  filters: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg, marginBottom: spacing.lg },
  filter: { flex: 1, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  filterActive: { flex: 1, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, backgroundColor: colors.ink },
  filterText: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  filterActiveText: { color: colors.surface, fontSize: 12, fontWeight: '800' },
  list: { gap: spacing.sm },
  row: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 10 },
  userRow: { borderColor: colors.brand, backgroundColor: colors.softBrand },
  position: { width: 25, color: colors.muted, fontSize: 15, fontWeight: '900', textAlign: 'center' },
  topPosition: { color: colors.gold },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper },
  userAvatar: { backgroundColor: colors.brand },
  copy: { flex: 1 },
  name: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  territory: { color: colors.muted, fontSize: 11, marginTop: 2 },
  xp: { color: colors.ink, fontSize: 12, fontWeight: '900' },
  localNote: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: spacing.lg, textAlign: 'center' },
});
