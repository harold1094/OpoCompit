import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/core/design/tokens';
import { useAppStore } from '@/features/app-state/useAppStore';
import { BLANK_ANSWER_ID } from '@/features/quiz/domain/scoring';
import { AppScreen } from '@/shared/components/AppScreen';
import { PrimaryButton } from '@/shared/components/PrimaryButton';

const answerLetters = ['A', 'B', 'C', 'D'];

export default function QuizScreen() {
  const questions = useAppStore((state) => state.activeQuestions);
  const answers = useAppStore((state) => state.selectedAnswers);
  const answerQuestion = useAppStore((state) => state.answerQuestion);
  const finishQuiz = useAppStore((state) => state.finishQuiz);
  const isSubmittingQuiz = useAppStore((state) => state.isSubmittingQuiz);
  const [index, setIndex] = useState(0);

  const question = questions[index];
  if (!question) {
    router.replace('/(tabs)');
    return null;
  }

  const selectedAnswer = answers[question.id];
  const answered = selectedAnswer !== null && selectedAnswer !== undefined;
  const isLast = index === questions.length - 1;

  const next = async () => {
    void Haptics.selectionAsync();
    if (!isLast) {
      setIndex((value) => value + 1);
      return;
    }
    if (await finishQuiz()) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/results');
      return;
    }
    const message = useAppStore.getState().quizError;
    if (message) Alert.alert('No se pudo validar la partida', message);
  };

  return (
    <AppScreen scroll={false} padded={false}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Salir de la partida" onPress={() => router.replace('/(tabs)')} style={styles.iconButton}>
          <MaterialCommunityIcons name="close" size={24} color={colors.ink} />
        </Pressable>
        <View style={styles.progressWrap}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${((index + 1) / questions.length) * 100}%` }]} />
          </View>
          <Text style={styles.counter}>{index + 1} / {questions.length}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.metaRow}>
          <Text style={styles.category}>{categoryLabel(question.categoryId)}</Text>
          <Text style={styles.difficulty}>Dificultad {question.difficulty}</Text>
        </View>
        <Text style={styles.statement}>{question.statement}</Text>

        <View style={styles.answers}>
          {question.answers.map((answer, answerIndex) => {
            const selected = selectedAnswer === answer.id;
            return (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                key={answer.id}
                onPress={() => {
                  answerQuestion(question.id, answer.id);
                  void Haptics.selectionAsync();
                }}
                style={({ pressed }) => [
                  styles.answer,
                  selected && styles.answerSelected,
                  pressed && styles.answerPressed,
                ]}
              >
                <View style={[styles.answerLetter, selected && styles.answerLetterSelected]}>
                  <Text style={[styles.answerLetterText, selected && styles.answerLetterTextSelected]}>
                    {answerLetters[answerIndex]}
                  </Text>
                </View>
                <Text style={styles.answerText}>{answer.text}</Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={() => answerQuestion(question.id, null)}
          style={[styles.blank, selectedAnswer === BLANK_ANSWER_ID && styles.blankSelected]}
        >
          <MaterialCommunityIcons name="minus-circle-outline" size={19} color={colors.muted} />
          <Text style={styles.blankText}>Dejar en blanco</Text>
        </Pressable>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          disabled={!answered}
          label={isLast ? 'Terminar partida' : 'Siguiente'}
          icon={isLast ? 'flag-checkered' : 'arrow-right'}
          loading={isLast && isSubmittingQuiz}
          onPress={() => void next()}
        />
      </View>
    </AppScreen>
  );
}

function categoryLabel(category: string): string {
  const labels: Record<string, string> = {
    legislation: 'Legislación',
    hydraulics: 'Hidráulica',
    fires: 'Incendios',
    prevention: 'Prevención',
    platform: 'Territorio',
    first_aid: 'Primeros auxilios',
    hazmat: 'Mercancías peligrosas',
    construction: 'Construcción',
  };
  return labels[category] ?? category;
}

const styles = StyleSheet.create({
  header: { height: 68, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 14, borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: colors.surface },
  iconButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  progressWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  progressTrack: { flex: 1, height: 8, backgroundColor: colors.line, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.aqua, borderRadius: 4 },
  counter: { width: 45, color: colors.muted, fontSize: 12, fontWeight: '800', textAlign: 'right' },
  content: { padding: 20, paddingBottom: 32 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  category: { color: colors.aqua, fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  difficulty: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  statement: { color: colors.ink, fontSize: 25, lineHeight: 33, fontWeight: '900', marginTop: spacing.lg, marginBottom: spacing.xl },
  answers: { gap: 10 },
  answer: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line },
  answerSelected: { borderColor: colors.brand, backgroundColor: colors.softBrand },
  answerPressed: { opacity: 0.82 },
  answerLetter: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  answerLetterSelected: { backgroundColor: colors.brand, borderColor: colors.brand },
  answerLetterText: { color: colors.ink, fontSize: 13, fontWeight: '900' },
  answerLetterTextSelected: { color: colors.surface },
  answerText: { flex: 1, color: colors.ink, fontSize: 15, lineHeight: 21, fontWeight: '600' },
  blank: { height: 48, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', marginTop: spacing.lg, borderRadius: radius.md },
  blankSelected: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  blankText: { color: colors.muted, fontSize: 14, fontWeight: '700' },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.surface },
});
