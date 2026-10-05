import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, shadows, spacing } from '@/core/design/tokens';
import { useAppStore } from '@/features/app-state/useAppStore';
import { questionCategoryLabel } from '@/features/quiz/data/categoryCatalog';
import { AppScreen } from '@/shared/components/AppScreen';
import { ContentState } from '@/shared/components/ContentState';
import { PrimaryButton } from '@/shared/components/PrimaryButton';

export default function ErrorsScreen() {
  const params = useLocalSearchParams<{ category?: string }>();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(params.category ?? null);
  const errors = useAppStore((state) => state.errorReviewItems);
  const isLoading = useAppStore((state) => state.isLoadingErrorReview);
  const isStarting = useAppStore((state) => state.isStartingQuiz);
  const error = useAppStore((state) => state.errorReviewError);
  const loadErrorReview = useAppStore((state) => state.loadErrorReview);
  const startErrorReview = useAppStore((state) => state.startErrorReview);

  useFocusEffect(
    useCallback(() => {
      void loadErrorReview();
    }, [loadErrorReview]),
  );

  const categories = useMemo(
    () => [...new Set(errors.map(({ question }) => question.categoryId))]
      .sort((first, second) => questionCategoryLabel(first).localeCompare(questionCategoryLabel(second))),
    [errors],
  );
  const filteredErrors = useMemo(
    () => selectedCategory
      ? errors.filter(({ question }) => question.categoryId === selectedCategory)
      : errors,
    [errors, selectedCategory],
  );

  const start = async () => {
    if (await startErrorReview(selectedCategory) > 0) {
      router.push('/quiz');
      return;
    }
    const message = useAppStore.getState().quizError;
    if (message) Alert.alert('No se pudo iniciar el repaso', message);
  };

  return (
    <AppScreen>
      <View style={styles.header}>
        <MaterialCommunityIcons name="alert-circle-outline" size={28} color={colors.danger} />
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Mis errores</Text>
          <Text style={styles.subtitle}>Convierte los fallos en preguntas dominadas.</Text>
        </View>
      </View>

      {isLoading && errors.length === 0 ? (
        <ContentState
          kind="loading"
          title="Buscando tus errores"
          detail="Preparamos solo las preguntas que todavía necesitas dominar."
        />
      ) : error && errors.length === 0 ? (
        <ContentState
          kind="error"
          title="No pudimos cargar tus errores"
          detail={error}
          onRetry={() => void loadErrorReview()}
        />
      ) : errors.length === 0 ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="check-decagram-outline" size={46} color={colors.aqua} />
          <Text style={styles.emptyTitle}>Todavía no hay errores</Text>
          <Text style={styles.emptyCopy}>Completa una partida y aquí aparecerán las preguntas que conviene repasar.</Text>
        </View>
      ) : (
        <>
          <View style={styles.filters}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: selectedCategory === null }}
              onPress={() => setSelectedCategory(null)}
              style={[styles.filter, selectedCategory === null && styles.filterSelected]}
            >
              <Text style={[styles.filterText, selectedCategory === null && styles.filterTextSelected]}>
                Todos ({errors.length})
              </Text>
            </Pressable>
            {categories.map((categoryId) => {
              const selected = selectedCategory === categoryId;
              const count = errors.filter(({ question }) => question.categoryId === categoryId).length;
              return (
                <Pressable
                  key={categoryId}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setSelectedCategory(categoryId)}
                  style={[styles.filter, selected && styles.filterSelected]}
                >
                  <Text style={[styles.filterText, selected && styles.filterTextSelected]}>
                    {questionCategoryLabel(categoryId)} ({count})
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {filteredErrors.length === 0 ? (
            <View style={styles.filteredEmpty}>
              <MaterialCommunityIcons name="check-circle-outline" size={30} color={colors.success} />
              <Text style={styles.filteredEmptyText}>No tienes errores pendientes en este tema.</Text>
            </View>
          ) : <View style={styles.list}>
          {filteredErrors.map(({ question, stat }) => {
            return (
              <View key={question.id} style={styles.row}>
                <View style={styles.countBox}>
                  <Text style={styles.count}>{stat.incorrectCount + stat.blankCount}</Text>
                  <Text style={styles.countLabel}>fallos</Text>
                </View>
                <View style={styles.rowCopy}>
                  <Text numberOfLines={2} style={styles.question}>{question.statement}</Text>
                  <Text style={styles.category}>{questionCategoryLabel(question.categoryId)}</Text>
                </View>
              </View>
            );
          })}
          </View>}
        </>
      )}

      <View style={styles.actions}>
        <PrimaryButton
          label="Empezar repaso"
          icon="refresh"
          disabled={filteredErrors.length === 0}
          loading={isStarting}
          onPress={() => void start()}
        />
        <PrimaryButton label="Volver" icon="arrow-left" variant="secondary" onPress={() => router.back()} />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: spacing.xl },
  headerCopy: { flex: 1 },
  title: { color: colors.ink, fontSize: 28, fontWeight: '900' },
  subtitle: { color: colors.muted, fontSize: 14, marginTop: 3 },
  empty: { alignItems: 'center', paddingVertical: 54, paddingHorizontal: 30, backgroundColor: colors.surface, borderRadius: radius.xl, ...shadows.card },
  emptyTitle: { color: colors.ink, fontSize: 20, fontWeight: '900', marginTop: spacing.md },
  emptyCopy: { color: colors.muted, textAlign: 'center', fontSize: 14, lineHeight: 21, marginTop: spacing.sm },
  list: { gap: spacing.sm },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  filter: { minHeight: 38, justifyContent: 'center', paddingHorizontal: 13, borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, backgroundColor: colors.surface },
  filterSelected: { borderColor: colors.brand, backgroundColor: colors.softBrand },
  filterText: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  filterTextSelected: { color: colors.brand },
  filteredEmpty: { minHeight: 120, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  filteredEmptyText: { color: colors.muted, fontSize: 13, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, ...shadows.card },
  countBox: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FDECEC' },
  count: { color: colors.danger, fontSize: 17, fontWeight: '900' },
  countLabel: { color: colors.danger, fontSize: 9, fontWeight: '800' },
  rowCopy: { flex: 1 },
  question: { color: colors.ink, fontSize: 13, lineHeight: 18, fontWeight: '700' },
  category: { color: colors.muted, fontSize: 11, marginTop: 4, textTransform: 'uppercase' },
  actions: { gap: spacing.sm, marginTop: spacing.xl },
});
