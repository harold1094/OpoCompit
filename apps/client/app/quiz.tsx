import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Redirect, router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, radius, shadows, spacing } from '@/core/design/tokens';
import { useAppStore } from '@/features/app-state/useAppStore';
import { BLANK_ANSWER_ID } from '@/features/quiz/domain/scoring';
import { AppScreen } from '@/shared/components/AppScreen';
import { FullScreenLoader } from '@/shared/components/FullScreenLoader';

const answerLetters = ['A', 'B', 'C', 'D', 'E', 'F'];

export default function QuizScreen() {
  const hydrated = useAppStore((state) => state.hydrated);
  const questions = useAppStore((state) => state.activeQuestions);
  const answers = useAppStore((state) => state.selectedAnswers);
  const answerQuestion = useAppStore((state) => state.answerQuestion);
  const finishQuiz = useAppStore((state) => state.finishQuiz);
  const isSubmittingQuiz = useAppStore((state) => state.isSubmittingQuiz);
  const activeGameMode = useAppStore((state) => state.activeGameMode);
  const activeOfficialExam = useAppStore((state) => state.activeOfficialExam);
  const activeCustomQuiz = useAppStore((state) => state.activeCustomQuiz);
  const activeStartedAt = useAppStore((state) => state.activeStartedAt);
  const duelOpponent = useAppStore((state) => state.activeDuelOpponent);
  const hapticsEnabled = useAppStore((state) => state.preferences?.hapticsEnabled ?? true);
  const [index, setIndex] = useState(0);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const transitionLock = useRef(false);
  const timeExpired = useRef(false);
  const isOfficialExam = activeGameMode === 'official-exam' && activeOfficialExam !== null;
  const isSimulation = activeGameMode === 'simulation' && activeCustomQuiz?.rules != null;
  const isExamStyle = isOfficialExam || isSimulation;
  const examRules = isOfficialExam ? activeOfficialExam.rules : activeCustomQuiz?.rules ?? null;

  useEffect(() => {
    transitionLock.current = false;
    setIsAdvancing(false);
  }, [index]);

  const submitQuiz = useCallback(async () => {
    if (isSubmittingQuiz) return;
    transitionLock.current = true;
    setIsAdvancing(true);
    if (await finishQuiz()) {
      if (hapticsEnabled) {
        void Haptics.notificationAsync?.(Haptics.NotificationFeedbackType.Success);
      }
      router.replace('/results');
      return;
    }
    const message = useAppStore.getState().quizError;
    if (message) Alert.alert('No se pudo validar la partida', message);
    transitionLock.current = false;
    setIsAdvancing(false);
  }, [finishQuiz, hapticsEnabled, isSubmittingQuiz]);

  useEffect(() => {
    if (!isExamStyle || !activeStartedAt || !examRules) {
      setRemainingSeconds(null);
      return;
    }
    const deadline = activeStartedAt + examRules.durationSeconds * 1_000;
    const update = () => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1_000));
      setRemainingSeconds(remaining);
      if (remaining === 0 && !timeExpired.current) {
        timeExpired.current = true;
        void submitQuiz();
      }
    };
    update();
    const interval = setInterval(update, 1_000);
    return () => clearInterval(interval);
  }, [activeStartedAt, examRules, isExamStyle, submitQuiz]);

  if (!hydrated) return <FullScreenLoader label="Recuperando tu partida" />;
  const question = questions[index];
  if (!question) return <Redirect href="/(tabs)" />;

  const selectedAnswer = answers[question.id];
  const isLast = index === questions.length - 1;
  const answersDisabled = isAdvancing || isSubmittingQuiz;
  const answeredCount = Object.values(answers).filter((answer) => answer !== null).length;

  const selectAnswer = async (answerId: string) => {
    if (transitionLock.current || isSubmittingQuiz) return;
    answerQuestion(question.id, answerId);
    if (hapticsEnabled) void Haptics.selectionAsync?.();

    if (isExamStyle) return;
    transitionLock.current = true;
    setIsAdvancing(true);
    if (!isLast) {
      setIndex((value) => value + 1);
      return;
    }
    await submitQuiz();
  };

  const leaveQuiz = () => {
    if (!isExamStyle) {
      router.replace('/(tabs)');
      return;
    }
    const label = isSimulation ? 'simulacro' : 'examen';
    const message = `El ${label} quedará abierto y no se entregará hasta que vuelvas y pulses Entregar.`;
    if (Platform.OS === 'web') {
      if (window.confirm(`¿Salir del ${label}?\n\n${message}`)) {
        router.replace(isSimulation ? '/custom-test' : '/exams');
      }
      return;
    }
    Alert.alert(
      `¿Salir del ${label}?`,
      message,
      [
        { text: 'Continuar', style: 'cancel' },
        {
          text: 'Salir',
          style: 'destructive',
          onPress: () => router.replace(isSimulation ? '/custom-test' : '/exams'),
        },
      ],
    );
  };

  const finishExamStyleQuiz = () => {
    const message = `Has respondido ${answeredCount} de ${questions.length} preguntas. Las demás contarán como en blanco.`;
    if (Platform.OS === 'web') {
      if (window.confirm(`Entregar examen\n\n${message}`)) void submitQuiz();
      return;
    }
    Alert.alert(
      'Entregar examen',
      message,
      [
        { text: 'Revisar', style: 'cancel' },
        { text: 'Entregar', onPress: () => void submitQuiz() },
      ],
    );
  };

  return (
    <AppScreen scroll={false} padded={false}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Salir de la partida" onPress={leaveQuiz} style={styles.iconButton}>
          <MaterialCommunityIcons name="close" size={24} color={colors.ink} />
        </Pressable>
        <View style={styles.progressWrap}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${((index + 1) / questions.length) * 100}%` }]} />
          </View>
          <Text style={styles.counter}>{index + 1} / {questions.length}</Text>
        </View>
        {isExamStyle ? (
          <View style={[styles.timer, remainingSeconds !== null && remainingSeconds < 60 && styles.timerUrgent]}>
            <MaterialCommunityIcons name="timer-outline" size={17} color={remainingSeconds !== null && remainingSeconds < 60 ? colors.danger : colors.ink} />
            <Text style={[styles.timerText, remainingSeconds !== null && remainingSeconds < 60 && styles.timerTextUrgent]}>
              {formatTimer(remainingSeconds ?? 0)}
            </Text>
          </View>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isExamStyle ? (
          <View style={styles.examBand}>
            <MaterialCommunityIcons
              name={isSimulation ? 'clipboard-clock-outline' : 'file-certificate-outline'}
              size={21}
              color={colors.brand}
            />
            <View style={styles.duelCopy}>
              <Text style={styles.examLabel}>{isSimulation ? 'SIMULACRO' : 'EXAMEN OFICIAL'}</Text>
              <Text numberOfLines={1} style={styles.duelOpponent}>
                {isSimulation
                  ? `Test personalizado · ${questions.length} preguntas`
                  : activeOfficialExam?.name ?? 'Examen oficial'}
              </Text>
            </View>
            <Text style={styles.duelLevel}>{answeredCount}/{questions.length}</Text>
          </View>
        ) : activeGameMode !== 'quick' && duelOpponent ? (
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

      {isExamStyle ? (
        <View style={styles.examControls}>
          <Pressable
            accessibilityLabel="Pregunta anterior"
            disabled={index === 0 || answersDisabled}
            onPress={() => setIndex((value) => Math.max(0, value - 1))}
            style={[styles.controlIcon, index === 0 && styles.controlDisabled]}
          >
            <MaterialCommunityIcons name="chevron-left" size={25} color={colors.ink} />
          </Pressable>
          <Pressable
            disabled={answersDisabled}
            onPress={() => answerQuestion(question.id, null)}
            style={[styles.blankButton, selectedAnswer === BLANK_ANSWER_ID && styles.blankSelected]}
          >
            <MaterialCommunityIcons name="minus-circle-outline" size={18} color={colors.muted} />
            <Text style={styles.blankLabel}>En blanco</Text>
          </Pressable>
          <Pressable
            disabled={selectedAnswer === null || selectedAnswer === undefined || answersDisabled}
            onPress={() => isLast ? finishExamStyleQuiz() : setIndex((value) => value + 1)}
            style={[
              styles.nextButton,
              (selectedAnswer === null || selectedAnswer === undefined || answersDisabled) && styles.controlDisabled,
            ]}
          >
            <Text style={styles.nextLabel}>{isLast ? 'Entregar' : 'Siguiente'}</Text>
            <MaterialCommunityIcons name={isLast ? 'check' : 'chevron-right'} size={21} color={colors.surface} />
          </Pressable>
        </View>
      ) : null}
    </AppScreen>
  );
}

function formatTimer(seconds: number): string {
  const hours = Math.floor(seconds / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  const remainder = seconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
    : `${minutes}:${String(remainder).padStart(2, '0')}`;
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
  header: { minHeight: 72, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12, backgroundColor: 'transparent' },
  iconButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, ...shadows.card },
  progressWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressTrack: { flex: 1, height: 9, backgroundColor: colors.line, borderRadius: radius.pill, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.aqua, borderRadius: radius.pill },
  counter: { width: 45, color: colors.muted, fontSize: 12, fontWeight: '800', textAlign: 'right' },
  timer: { minWidth: 70, height: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 9, borderRadius: radius.sm, backgroundColor: colors.surface, ...shadows.card },
  timerUrgent: { backgroundColor: '#FFF1F1' },
  timerText: { color: colors.ink, fontSize: 12, fontWeight: '900' },
  timerTextUrgent: { color: colors.danger },
  content: { padding: 20, paddingTop: 12, paddingBottom: 32 },
  duelBand: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing.lg, paddingHorizontal: 14, backgroundColor: colors.softAqua, borderWidth: 1, borderColor: '#BFEAE3', borderRadius: radius.lg, ...shadows.card },
  examBand: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing.lg, paddingHorizontal: 14, backgroundColor: colors.softBrand, borderWidth: 1, borderColor: '#F1C3AF', borderRadius: radius.lg, ...shadows.card },
  duelCopy: { flex: 1, minWidth: 0 },
  duelLabel: { color: colors.aqua, fontSize: 10, fontWeight: '900' },
  examLabel: { color: colors.brand, fontSize: 10, fontWeight: '900' },
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
  examControls: { minHeight: 74, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.surface },
  controlIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.paper },
  blankButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.paper },
  blankSelected: { borderColor: colors.muted, backgroundColor: colors.line },
  blankLabel: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  nextButton: { flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 12, borderRadius: radius.md, backgroundColor: colors.brand },
  nextLabel: { color: colors.surface, fontSize: 13, fontWeight: '900' },
  controlDisabled: { opacity: 0.38 },
});
