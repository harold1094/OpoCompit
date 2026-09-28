import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/core/design/tokens';
import { useAppStore } from '@/features/app-state/useAppStore';
import { trainingOpponents } from '@/features/duels/domain/duel';
import { AppScreen } from '@/shared/components/AppScreen';

export default function SocialScreen() {
  const startClassicDuel = useAppStore((state) => state.startClassicDuel);
  const isStartingDuel = useAppStore((state) => state.isStartingDuel);
  const [startingOpponentId, setStartingOpponentId] = useState<string | null>(null);

  const challenge = async (opponent: (typeof trainingOpponents)[number]) => {
    setStartingOpponentId(opponent.id);
    const count = await startClassicDuel(opponent);
    if (count > 0) {
      void Haptics.selectionAsync();
      router.push('/quiz');
      return;
    }
    setStartingOpponentId(null);
    const message = useAppStore.getState().quizError;
    if (message) Alert.alert('No se pudo iniciar el duelo', message);
  };

  return (
    <AppScreen>
      <View style={styles.heading}>
        <View>
          <Text style={styles.title}>Social</Text>
          <Text style={styles.subtitle}>Elige rival y mide tu precisión.</Text>
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

      <Text style={styles.sectionTitle}>Rivales de entrenamiento</Text>
      <View style={styles.list}>
        {trainingOpponents.map((opponent) => (
          <View key={opponent.id} style={styles.friend}>
            <View style={styles.avatar}>
              <MaterialCommunityIcons name="account-outline" size={23} color={colors.ink} />
              <View style={styles.online} />
            </View>
            <View style={styles.friendCopy}>
              <Text style={styles.friendName}>{opponent.name}</Text>
              <Text style={styles.friendMeta}>Nivel {opponent.level} · {opponent.territoryLabel}</Text>
            </View>
            <Pressable
              accessibilityLabel={`Retar a ${opponent.name}`}
              accessibilityRole="button"
              disabled={isStartingDuel}
              onPress={() => void challenge(opponent)}
              style={({ pressed }) => [styles.duelButton, pressed && styles.duelButtonPressed]}
            >
              {isStartingDuel && startingOpponentId === opponent.id ? (
                <ActivityIndicator size="small" color={colors.aqua} />
              ) : (
                <MaterialCommunityIcons name="sword-cross" size={20} color={colors.aqua} />
              )}
            </Pressable>
          </View>
        ))}
      </View>
      <Text style={styles.localNote}>Partidas contra perfiles de entrenamiento. Los duelos entre amigos llegarán en el siguiente bloque social.</Text>
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
  duelButtonPressed: { opacity: 0.72 },
  localNote: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: spacing.lg, textAlign: 'center' },
});
