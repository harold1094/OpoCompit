import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, shadows, spacing } from '@/core/design/tokens';
import { OfficialExam } from '@/core/domain/types';
import { useAppStore } from '@/features/app-state/useAppStore';
import { AppScreen } from '@/shared/components/AppScreen';
import { ContentState } from '@/shared/components/ContentState';

export default function ExamsScreen() {
  const exams = useAppStore((state) => state.officialExams);
  const loadOfficialExams = useAppStore((state) => state.loadOfficialExams);
  const startOfficialExam = useAppStore((state) => state.startOfficialExam);
  const isLoading = useAppStore((state) => state.isLoadingOfficialExams);
  const isStarting = useAppStore((state) => state.isStartingQuiz);
  const error = useAppStore((state) => state.officialExamsError);

  useFocusEffect(useCallback(() => {
    void loadOfficialExams();
  }, [loadOfficialExams]));

  const start = async (exam: OfficialExam) => {
    const count = await startOfficialExam(exam);
    if (count > 0) {
      router.push('/quiz');
      return;
    }
    const message = useAppStore.getState().quizError;
    if (message) Alert.alert('No se pudo iniciar el examen', message);
  };

  return (
    <AppScreen>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Volver" onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={23} color={colors.ink} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Exámenes oficiales</Text>
          <Text style={styles.subtitle}>Reproduce convocatorias con sus reglas originales.</Text>
        </View>
      </View>

      <View style={styles.notice}>
        <MaterialCommunityIcons name="shield-check-outline" size={22} color={colors.aqua} />
        <Text style={styles.noticeText}>
          Solo aparecen exámenes publicados con preguntas revisadas.
        </Text>
      </View>

      {isLoading && exams.length === 0 ? (
        <ContentState kind="loading" title="Buscando exámenes" detail="Consultando el catálogo disponible." />
      ) : error && exams.length === 0 ? (
        <ContentState kind="error" title="No pudimos cargar los exámenes" detail={error} onRetry={() => void loadOfficialExams()} />
      ) : exams.length === 0 ? (
        <ContentState kind="empty" title="Todavía no hay exámenes publicados" detail="Los exámenes pendientes de revisión no se muestran a los alumnos." />
      ) : (
        <View style={styles.list}>
          {exams.map((exam) => (
            <Pressable
              accessibilityRole="button"
              disabled={isStarting}
              key={exam.id}
              onPress={() => void start(exam)}
              style={({ pressed }) => [styles.exam, pressed && styles.examPressed]}
            >
              <View style={styles.examIcon}>
                <MaterialCommunityIcons name="file-certificate-outline" size={28} color={colors.brand} />
              </View>
              <View style={styles.examBody}>
                <Text style={styles.examYear}>{exam.year}</Text>
                <Text style={styles.examName}>{exam.name}</Text>
                <Text numberOfLines={2} style={styles.examSource}>{exam.source}</Text>
                <View style={styles.rules}>
                  <Rule icon="help-circle-outline" label={`${exam.rules.questionCount} preguntas`} />
                  <Rule icon="clock-outline" label={formatDuration(exam.rules.durationSeconds)} />
                  <Rule icon="minus-circle-outline" label={`-${exam.rules.incorrectPenalty} por fallo`} />
                </View>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={25} color={colors.muted} />
            </Pressable>
          ))}
        </View>
      )}
    </AppScreen>
  );
}

function Rule({ icon, label }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string }) {
  return (
    <View style={styles.rule}>
      <MaterialCommunityIcons name={icon} size={15} color={colors.muted} />
      <Text style={styles.ruleText}>{label}</Text>
    </View>
  );
}

function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  return minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${minutes} min`;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: spacing.lg },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.surface, ...shadows.card },
  headerCopy: { flex: 1 },
  title: { color: colors.ink, fontSize: 25, fontWeight: '900' },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 18, marginTop: 3 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#BFE8E0', backgroundColor: colors.softAqua },
  noticeText: { flex: 1, color: colors.ink, fontSize: 13, lineHeight: 18, fontWeight: '700' },
  list: { gap: spacing.sm, marginTop: spacing.lg, marginBottom: spacing.xl },
  exam: { minHeight: 154, flexDirection: 'row', alignItems: 'center', gap: 13, padding: spacing.md, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, backgroundColor: colors.surface, ...shadows.card },
  examPressed: { backgroundColor: colors.softBrand, borderColor: '#F2B79F' },
  examIcon: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.softBrand },
  examBody: { flex: 1, minWidth: 0 },
  examYear: { color: colors.brand, fontSize: 11, fontWeight: '900' },
  examName: { color: colors.ink, fontSize: 17, lineHeight: 22, fontWeight: '900', marginTop: 2 },
  examSource: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 4 },
  rules: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 11 },
  rule: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ruleText: { color: colors.muted, fontSize: 11, fontWeight: '700' },
});
