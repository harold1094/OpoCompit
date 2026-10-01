import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, shadows, spacing } from '@/core/design/tokens';
import { useAppStore } from '@/features/app-state/useAppStore';
import { availableTerritories } from '@/features/onboarding/data/options';
import { AppScreen } from '@/shared/components/AppScreen';
import { PrimaryButton } from '@/shared/components/PrimaryButton';

export default function OnboardingScreen() {
  const startGuest = useAppStore((state) => state.startGuest);
  const [territoryIndex, setTerritoryIndex] = useState(2);
  const [loading, setLoading] = useState(false);

  const continueAsGuest = async () => {
    setLoading(true);
    await startGuest(availableTerritories[territoryIndex]);
    router.replace('/(tabs)');
  };

  return (
    <AppScreen>
      <View style={styles.brandRow}>
        <View style={styles.logo}>
          <MaterialCommunityIcons name="trophy-outline" size={27} color={colors.surface} />
        </View>
        <Text style={styles.brand}>OpoCompit</Text>
      </View>

      <View style={styles.hero}>
        <Text style={styles.eyebrow}>BOMBEROS</Text>
        <Text style={styles.title}>Prepara tu oposición jugando</Text>
        <Text style={styles.subtitle}>
          Empieza una partida ahora. Tu progreso se guarda y podrás vincular una cuenta más adelante.
        </Text>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>¿Qué ámbito preparas?</Text>
        <Text style={styles.sectionHint}>Usaremos solo preguntas compatibles.</Text>
      </View>

      <View style={styles.options}>
        {availableTerritories.map((territory, index) => {
          const selected = index === territoryIndex;
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              key={territory.label}
              onPress={() => setTerritoryIndex(index)}
              style={({ pressed }) => [
                styles.option,
                selected && styles.optionSelected,
                pressed && styles.optionPressed,
              ]}
            >
              <MaterialCommunityIcons
                name={selected ? 'radiobox-marked' : 'radiobox-blank'}
                size={22}
                color={selected ? colors.brand : colors.muted}
              />
              <View style={styles.optionCopy}>
                <Text style={styles.optionTitle}>{territory.label}</Text>
                <Text style={styles.optionSubtitle}>
                  {territory.municipality
                    ? 'Contenido nacional, autonómico y municipal'
                    : territory.autonomousCommunity
                      ? 'Contenido nacional y autonómico'
                      : 'Contenido general de España'}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.action}>
        <PrimaryButton
          label="Empezar como invitado"
          icon="arrow-right"
          loading={loading}
          onPress={() => void continueAsGuest()}
        />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 4 },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: { color: colors.ink, fontSize: 22, fontWeight: '900' },
  hero: { marginTop: spacing.xl, marginBottom: spacing.xl, padding: 22, borderRadius: radius.xl, backgroundColor: colors.softBrand, ...shadows.card },
  eyebrow: { color: colors.brand, fontWeight: '900', fontSize: 11, letterSpacing: 0.5 },
  title: { color: colors.ink, fontSize: 32, lineHeight: 37, fontWeight: '900', marginTop: spacing.sm },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: spacing.md, maxWidth: 560 },
  sectionHeader: { marginBottom: spacing.md },
  sectionTitle: { color: colors.ink, fontSize: 19, fontWeight: '800' },
  sectionHint: { color: colors.muted, fontSize: 13, marginTop: 3 },
  options: { gap: spacing.sm },
  option: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadows.card,
  },
  optionSelected: { borderColor: colors.brand, backgroundColor: colors.softBrand },
  optionPressed: { opacity: 0.82 },
  optionCopy: { flex: 1 },
  optionTitle: { color: colors.ink, fontWeight: '800', fontSize: 15 },
  optionSubtitle: { color: colors.muted, fontSize: 12, marginTop: 3 },
  action: { marginTop: spacing.xl, marginBottom: spacing.lg },
});
