import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/core/design/tokens';
import { AppScreen } from '@/shared/components/AppScreen';

const friends = [
  { name: 'MarioCT', level: 8, streak: 12, online: true },
  { name: 'LucíaM', level: 11, streak: 21, online: false },
  { name: 'Alex112', level: 7, streak: 6, online: true },
];

export default function SocialScreen() {
  return (
    <AppScreen>
      <View style={styles.heading}>
        <View>
          <Text style={styles.title}>Social</Text>
          <Text style={styles.subtitle}>Estudiar acompañado cambia la constancia.</Text>
        </View>
        <View style={styles.addButton}>
          <MaterialCommunityIcons name="account-plus-outline" size={22} color={colors.surface} />
        </View>
      </View>

      <View style={styles.streakBand}>
        <MaterialCommunityIcons name="fire" size={31} color={colors.brand} />
        <View style={styles.streakCopy}>
          <Text style={styles.streakTitle}>Racha compartida</Text>
          <Text style={styles.streakText}>Tú y MarioCT lleváis 6 días estudiando.</Text>
        </View>
        <Text style={styles.streakValue}>6</Text>
      </View>

      <Text style={styles.sectionTitle}>Amigos</Text>
      <View style={styles.list}>
        {friends.map((friend) => (
          <View key={friend.name} style={styles.friend}>
            <View style={styles.avatar}>
              <MaterialCommunityIcons name="account-outline" size={23} color={colors.ink} />
              {friend.online ? <View style={styles.online} /> : null}
            </View>
            <View style={styles.friendCopy}>
              <Text style={styles.friendName}>{friend.name}</Text>
              <Text style={styles.friendMeta}>Nivel {friend.level} · {friend.streak} días</Text>
            </View>
            <View style={styles.duelButton}>
              <MaterialCommunityIcons name="sword-cross" size={20} color={colors.aqua} />
            </View>
          </View>
        ))}
      </View>
      <Text style={styles.localNote}>Los amigos y duelos siguen en modo local durante la migración a React.</Text>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: colors.ink, fontSize: 30, fontWeight: '900' },
  subtitle: { color: colors.muted, fontSize: 14, marginTop: 4 },
  addButton: { width: 43, height: 43, borderRadius: radius.md, backgroundColor: colors.aqua, alignItems: 'center', justifyContent: 'center' },
  streakBand: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: -20, marginTop: spacing.xl, paddingHorizontal: 22, paddingVertical: 20, backgroundColor: colors.ink },
  streakCopy: { flex: 1 },
  streakTitle: { color: colors.surface, fontSize: 15, fontWeight: '900' },
  streakText: { color: '#CBD1D6', fontSize: 12, marginTop: 3 },
  streakValue: { color: colors.gold, fontSize: 31, fontWeight: '900' },
  sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: '900', marginTop: spacing.xl, marginBottom: spacing.sm },
  list: { gap: spacing.sm },
  friend: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 11, padding: 10, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  online: { position: 'absolute', right: 0, bottom: 1, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success, borderWidth: 2, borderColor: colors.surface },
  friendCopy: { flex: 1 },
  friendName: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  friendMeta: { color: colors.muted, fontSize: 11, marginTop: 2 },
  duelButton: { width: 38, height: 38, borderRadius: radius.sm, backgroundColor: colors.softAqua, alignItems: 'center', justifyContent: 'center' },
  localNote: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: spacing.lg, textAlign: 'center' },
});
