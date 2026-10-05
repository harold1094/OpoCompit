import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import { useAppStore } from '@/features/app-state/useAppStore';
import QuizScreen from '../../../app/quiz';

const mockReplace = jest.fn();
const mockSelectionAsync = jest.fn();
const mockNotificationAsync = jest.fn();

jest.mock('expo-router', () => ({
  router: { replace: mockReplace },
}));

jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: () => null,
}));

jest.mock('expo-haptics', () => ({
  __esModule: true,
  selectionAsync: mockSelectionAsync,
  notificationAsync: mockNotificationAsync,
  NotificationFeedbackType: { Success: 'success' },
}));

jest.mock('@/features/app-state/useAppStore', () => {
  const selector = jest.fn();
  Object.assign(selector, { getState: jest.fn() });
  return { useAppStore: selector };
});

const questions = [
  {
    id: 'q1',
    oppositionId: 'firefighters_es',
    statement: 'Primera pregunta',
    answers: [
      { id: 'a', text: 'Primera respuesta' },
      { id: 'b', text: 'Segunda respuesta' },
    ],
    categoryId: 'fires',
    difficulty: 1,
    scopeType: 'national' as const,
    territoryKeys: ['ES'],
    source: 'test',
  },
  {
    id: 'q2',
    oppositionId: 'firefighters_es',
    statement: 'Última pregunta',
    answers: [
      { id: 'a', text: 'Respuesta final' },
      { id: 'b', text: 'Alternativa final' },
    ],
    categoryId: 'fires',
    difficulty: 1,
    scopeType: 'national' as const,
    territoryKeys: ['ES'],
    source: 'test',
  },
];

describe('QuizScreen automatic progression', () => {
  const answerQuestion = jest.fn();
  const finishQuiz = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(router, { replace: mockReplace });
    finishQuiz.mockResolvedValue({ correct: 2 });

    const state = {
      hydrated: true,
      activeQuestions: questions,
      selectedAnswers: { q1: null, q2: null },
      answerQuestion,
      finishQuiz,
      isSubmittingQuiz: false,
      activeGameMode: 'quick',
      activeOfficialExam: null,
      activeStartedAt: Date.now(),
      activeDuelOpponent: null,
      quizError: null,
    };
    const store = useAppStore as unknown as jest.Mock & { getState: jest.Mock };
    store.mockImplementation((selector: (value: typeof state) => unknown) => selector(state));
    store.getState.mockReturnValue(state);
  });

  it('records an answer and immediately advances without blank or next actions', async () => {
    const screen = await render(<QuizScreen />);

    expect(screen.queryByText('Dejar en blanco')).toBeNull();
    expect(screen.queryByText('Siguiente')).toBeNull();

    await fireEvent.press(screen.getByText('Primera respuesta'));

    expect(answerQuestion).toHaveBeenCalledTimes(1);
    expect(answerQuestion).toHaveBeenCalledWith('q1', 'a');
    expect(screen.getByText('Última pregunta')).toBeTruthy();
  });

  it('finishes automatically after answering the last question', async () => {
    const screen = await render(<QuizScreen />);

    await fireEvent.press(screen.getByText('Primera respuesta'));
    await fireEvent.press(screen.getByText('Respuesta final'));

    await waitFor(() => {
      expect(finishQuiz).toHaveBeenCalledTimes(1);
      expect(mockReplace).toHaveBeenCalledWith('/results');
    });
  });
});
