import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  CustomQuizConfig,
  CustomQuizMode,
  CustomQuizQuestionStatus,
  CustomQuizTerritoryMode,
} from '@/core/domain/types';
import { colors, radius, shadows, spacing } from '@/core/design/tokens';
import { useAppStore } from '@/features/app-state/useAppStore';
import { AppScreen } from '@/shared/components/AppScreen';
import { PrimaryButton } from '@/shared/components/PrimaryButton';

const counts = [5, 10, 15, 20, 25];
const categories = [
  { id: null, label: 'Todas', icon: 'view-grid-outline' as const },
  { id: 'legislation', label: 'Legislación', icon: 'scale-balance' as const },
  { id: 'fires', label: 'Incendios', icon: 'fire' as const },
  { id: 'hydraulics', label: 'Hidráulica', icon: 'water-outline' as const },
  { id: 'prevention', label: 'Prevención', icon: 'hard-hat' as const },
  { id: 'first_aid', label: 'Primeros auxilios', icon: 'medical-bag' as const },
  { id: 'hazmat', label: 'Mercancías peligrosas', icon: 'biohazard' as const },
  { id: 'construction', label: 'Construcción', icon: 'office-building-outline' as const },
  { id: 'platform', label: 'Territorio', icon: 'map-marker-outline' as const },
];

export default function CustomTestScreen() {
  const startCustomQuiz = useAppStore((state) => state.startCustomQuiz);
  const isStarting = useAppStore((state) => state.isStartingQuiz);
  const profile = useAppStore((state) => state.profile);
  const [mode, setMode] = useState<CustomQuizMode>('practice');
  const [questionCount, setQuestionCount] = useState(10);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<number | null>(null);
  const [territoryMode, setTerritoryMode] = useState<CustomQuizTerritoryMode>('profile');
  const [questionStatus, setQuestionStatus] = useState<CustomQuizQuestionStatus>('all');

  const start = async () => {
    const config: CustomQuizConfig = {
      mode,
      questionCount,
      categoryId,
      difficulty,
      territoryMode,
      questionStatus,
    };
    const count = await startCustomQuiz(config);
    if (count > 0) {
      router.push('/quiz');
      return;
    }
    const message = useAppStore.getState().quizError;
    if (message) Alert.alert('No se pudo crear el test', message);
  };

  return (
    <AppScreen>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Volver" onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={23} color={colors.ink} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Crear test</Text>
          <Text style={styles.subtitle}>Configura una sesión a tu medida.</Text>
        </View>
      </View>

      <View style={styles.modeControl}>
        <ModeOption
          active={mode === 'practice'}
          icon="lightning-bolt-outline"
          label="Práctica"
          onPress={() => setMode('practice')}
        />
        <ModeOption
          active={mode === 'simulation'}
          icon="clipboard-clock-outline"
          label="Simulacro"
          onPress={() => setMode('simulation')}
        />
      </View>

      <SectionTitle icon="counter" label="Preguntas" />
      <View style={styles.countRow}>
        {counts.map((count) => (
          <Choice
            active={questionCount === count}
            key={count}
            label={String(count)}
            onPress={() => setQuestionCount(count)}
          />
        ))}
      </View>

      <SectionTitle icon="shape-outline" label="Categoría" />
      <View style={styles.categoryGrid}>
        {categories.map((category) => {
          const active = categoryId === category.id;
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              key={category.id ?? 'all'}
              onPress={() => setCategoryId(category.id)}
              style={[styles.category, active && styles.selected]}
            >
              <MaterialCommunityIcons
                name={category.icon}
                size={19}
                color={active ? colors.brand : colors.muted}
              />
              <Text style={[styles.categoryLabel, active && styles.selectedText]}>
                {category.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <SectionTitle icon="signal" label="Dificultad" />
      <View style={styles.choiceRow}>
        <Choice active={difficulty === null} label="Todas" onPress={() => setDifficulty(null)} />
        {[1, 2, 3].map((level) => (
          <Choice
            active={difficulty === level}
            key={level}
            label={`Nivel ${level}`}
            onPress={() => setDifficulty(level)}
          />
        ))}
      </View>

      <SectionTitle icon="map-marker-radius-outline" label="Territorio" />
      <View style={styles.twoColumns}>
        <WideChoice
          active={territoryMode === 'profile'}
          icon="crosshairs-gps"
          label={profile?.territory.label ?? 'Mi territorio'}
          onPress={() => setTerritoryMode('profile')}
        />
        <WideChoice
          active={territoryMode === 'all_spain'}
          icon="earth"
          label="Toda España"
          onPress={() => setTerritoryMode('all_spain')}
        />
      </View>

      <SectionTitle icon="history" label="Historial" />
      <View style={styles.statusGrid}>
        <WideChoice active={questionStatus === 'all'} icon="layers-outline" label="Todas" onPress={() => setQuestionStatus('all')} />
        <WideChoice active={questionStatus === 'new'} icon="star-four-points-outline" label="Nuevas" onPress={() => setQuestionStatus('new')} />
        <WideChoice active={questionStatus === 'incorrect'} icon="alert-circle-outline" label="Mis errores" onPress={() => setQuestionStatus('incorrect')} />
        <WideChoice active={questionStatus === 'completed'} icon="check-circle-outline" label="Realizadas" onPress={() => setQuestionStatus('completed')} />
      </View>

      {mode === 'simulation' ? (
        <View style={styles.rulesBand}>
          <MaterialCommunityIcons name="timer-outline" size={22} color={colors.brand} />
          <View style={styles.rulesCopy}>
            <Text style={styles.rulesTitle}>{Math.max(5, questionCount)} min</Text>
            <Text style={styles.rulesText}>+1 acierto · -0,33 fallo · 0 blanco</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.action}>
        <PrimaryButton
          icon={mode === 'simulation' ? 'clipboard-clock-outline' : 'play'}
          label={mode === 'simulation' ? 'Iniciar simulacro' : 'Comenzar práctica'}
          loading={isStarting}
          onPress={() => void start()}
        />
      </View>
    </AppScreen>
  );
}

function SectionTitle({ icon, label }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string }) {
  return (
    <View style={styles.sectionTitle}>
      <MaterialCommunityIcons name={icon} size={18} color={colors.ink} />
      <Text style={styles.sectionLabel}>{label}</Text>
    </View>
  );
}

function ModeOption({ active, icon, label, onPress }: {
  active: boolean;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.modeOption, active && styles.modeSelected]}>
      <MaterialCommunityIcons name={icon} size={20} color={active ? colors.surface : colors.muted} />
      <Text style={[styles.modeLabel, active && styles.modeSelectedText]}>{label}</Text>
    </Pressable>
  );
}

function Choice({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.choice, active && styles.selected]}>
      <Text style={[styles.choiceLabel, active && styles.selectedText]}>{label}</Text>
    </Pressable>
  );
}

function WideChoice({ active, icon, label, onPress }: {
  active: boolean;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.wideChoice, active && styles.selected]}>
      <MaterialCommunityIcons name={icon} size={18} color={active ? colors.brand : colors.muted} />
      <Text numberOfLines={2} style={[styles.wideChoiceLabel, active && styles.selectedText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: spacing.lg },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.surface, ...shadows.card },
  headerCopy: { flex: 1 },
  title: { color: colors.ink, fontSize: 26, fontWeight: '900' },
  subtitle: { color: colors.muted, fontSize: 13, marginTop: 3 },
  modeControl: { height: 52, flexDirection: 'row', gap: 4, padding: 4, borderRadius: radius.md, backgroundColor: colors.line },
  modeOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: radius.sm },
  modeSelected: { backgroundColor: colors.ink },
  modeLabel: { color: colors.muted, fontSize: 13, fontWeight: '800' },
  modeSelectedText: { color: colors.surface },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: spacing.xl, marginBottom: spacing.sm },
  sectionLabel: { color: colors.ink, fontSize: 16, fontWeight: '900' },
  countRow: { flexDirection: 'row', gap: 7 },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { minWidth: 52, minHeight: 42, flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, backgroundColor: colors.surface },
  choiceLabel: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  selected: { borderColor: colors.brand, backgroundColor: colors.softBrand },
  selectedText: { color: colors.brand },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  category: { width: '48.7%', minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 11, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, backgroundColor: colors.surface },
  categoryLabel: { flex: 1, color: colors.muted, fontSize: 12, lineHeight: 15, fontWeight: '800' },
  twoColumns: { flexDirection: 'row', gap: 8 },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  wideChoice: { width: '48.7%', minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 11, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, backgroundColor: colors.surface },
  wideChoiceLabel: { flex: 1, color: colors.muted, fontSize: 12, lineHeight: 16, fontWeight: '800' },
  rulesBand: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: spacing.xl, paddingHorizontal: spacing.md, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#F1C3AF', backgroundColor: colors.softBrand },
  rulesCopy: { flex: 1 },
  rulesTitle: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  rulesText: { color: colors.muted, fontSize: 12, marginTop: 2 },
  action: { marginTop: spacing.xl, marginBottom: spacing.lg },
});
