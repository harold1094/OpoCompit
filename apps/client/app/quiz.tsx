import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, radius, shadows, spacing } from '@/core/design/tokens';
import { useAppStore } from '@/features/app-state/useAppStore';
import { AppScreen } from '@/shared/components/AppScreen';

const answerLetters = ['A', 'B', 'C', 'D'];

export default function QuizScreen() {
  const questions = useAppStore((state) => state.activeQuestions);
  const answers = useAppStore((state) => state.selectedAnswers);
  const answerQuestion = useAppStore((state) => state.answerQuestion);
  const finishQuiz = useAppStore((state) => state.finishQuiz);
  const isSubmittingQuiz = useAppStore((state) => state.isSubmittingQuiz);
  const activeGameMode = useAppStore((state) => state.activeGameMode);
  const duelOpponent = useAppStore((state) => state.activeDuelOpponent);
  const [index, setIndex] = useState(0);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const transitionLock = useRef(false);

  useEffect(() => {
    transitionLock.current = false;
    setIsAdvancing(false);
  }, [index]);

  const question = questions[index];
  if (!question) {
    router.replace('/(tabs)');
    return null;
  }

  const selectedAnswer = answers[question.id];
  const isLast = index === questions.length - 1;
  const answersDisabled = isAdvancing || isSubmittingQuiz;

  const selectAnswer = async (answerId: string) => {
    if (transitionLock.current || isSubmittingQuiz) return;

    transitionLock.current = true;
    setIsAdvancing(true);
    answerQuestion(question.id, answerId);
    void Haptics.selectionAsync?.();

    if (!isLast) {
      setIndex((value) => value + 1);
      return;
    }
    if (await finishQuiz()) {
      void Haptics.notificationAsync?.(Haptics.NotificationFeedbackType.Success);
      router.replace('/results');
      return;
    }
    const message = useAppStore.getState().quizError;
    if (message) Alert.alert('No se pudo validar la partida', message);
    transitionLock.current = false;
    setIsAdvancing(false);
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
        {activeGameMode !== 'quick' && duelOpponent ? (
          <View style={styles.duelBand}>
            <MaterialCommunityIcons name="sword-cross" size={20} color={colors.aqua} />
            <View style={styles.duelCopy}>
              <Text style={styles.duelLabel}>
                {activeGameMode === 'friend-duel'
                  ? 'DUELO ENTRE AMIGOS'
                  : activeGameMode === 'matchmaking-duel'
                    ? 'DUELO COMPETITIVO'
                    : 'DUELO CLÁSICO'}
              </Text>
              <Text style={styles.duelOpponent}>Tú vs. {duelOpponent.name}</Text>
            </View>
            <Text style={styles.duelLevel}>Nv. {duelOpponent.level}</Text>
          </View>
        ) : null}
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
                accessibilityState={{ checked: selected, disabled: answersDisabled }}
                disabled={answersDisabled}
                key={answer.id}
                onPress={() => void selectAnswer(answer.id)}
                style={({ pressed }) => [
                  styles.answer,
                  selected && styles.answerSelected,
                  answersDisabled && styles.answerDisabled,
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
      </ScrollView>
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
  header: { height: 72, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 14, backgroundColor: 'transparent' },
  iconButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, ...shadows.card },
  progressWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  progressTrack: { flex: 1, height: 9, backgroundColor: colors.line, borderRadius: radius.pill, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.aqua, borderRadius: radius.pill },
  counter: { width: 45, color: colors.muted, fontSize: 12, fontWeight: '800', textAlign: 'right' },
  content: { padding: 20, paddingTop: 12, paddingBottom: 32 },
  duelBand: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing.lg, paddingHorizontal: 14, backgroundColor: colors.softAqua, borderWidth: 1, borderColor: '#BFEAE3', borderRadius: radius.lg, ...shadows.card },
  duelCopy: { flex: 1 },
  duelLabel: { color: colors.aqua, fontSize: 10, fontWeight: '900' },
  duelOpponent: { color: colors.ink, fontSize: 14, fontWeight: '900', marginTop: 2 },
  duelLevel: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  category: { color: colors.aqua, fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  difficulty: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  statement: { color: colors.ink, fontSize: 25, lineHeight: 33, fontWeight: '900', marginTop: spacing.lg, marginBottom: spacing.xl },
  answers: { gap: 10 },
  answer: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, ...shadows.card },
  answerSelected: { borderColor: colors.brand, backgroundColor: colors.softBrand },
  answerDisabled: { opacity: 0.72 },
  answerPressed: { opacity: 0.82 },
  answerLetter: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  answerLetterSelected: { backgroundColor: colors.brand, borderColor: colors.brand },
  answerLetterText: { color: colors.ink, fontSize: 13, fontWeight: '900' },
  answerLetterTextSelected: { color: colors.surface },
  answerText: { flex: 1, color: colors.ink, fontSize: 15, lineHeight: 21, fontWeight: '600' },
});
