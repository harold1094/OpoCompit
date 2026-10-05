import {fireEvent, render, waitFor} from '@testing-library/react-native';
import {router} from 'expo-router';

import ErrorsScreen from '../../../app/errors';
import {useAppStore} from '@/features/app-state/useAppStore';

const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  router: {},
  useFocusEffect: (callback: () => void) => callback(),
}));

jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: () => null,
}));

jest.mock('@/features/app-state/useAppStore', () => {
  const selector = jest.fn();
  Object.assign(selector, {getState: jest.fn()});
  return {useAppStore: selector};
});

describe('ErrorsScreen', () => {
  const loadErrorReview = jest.fn();
  const startErrorReview = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(router, {push: mockPush, back: mockBack});
    loadErrorReview.mockResolvedValue(undefined);
    startErrorReview.mockResolvedValue(1);
    const state = {
      errorReviewItems: [{
        question: {
          id: 'q1',
          oppositionId: 'firefighters_es',
          statement: 'Pregunta pendiente de dominar',
          answers: [{id: 'a', text: 'Respuesta'}],
          categoryId: 'fires',
          difficulty: 1,
          scopeType: 'national',
          territoryKeys: ['ES'],
          source: 'test',
        },
        stat: {
          questionId: 'q1',
          timesSeen: 2,
          correctCount: 1,
          incorrectCount: 1,
          blankCount: 0,
          needsReview: true,
          lastAnswerId: 'b',
          lastAnsweredAt: new Date().toISOString(),
        },
      }],
      isLoadingErrorReview: false,
      isStartingQuiz: false,
      errorReviewError: null,
      quizError: null,
      loadErrorReview,
      startErrorReview,
    };
    const store = useAppStore as unknown as jest.Mock & {getState: jest.Mock};
    store.mockImplementation((selector: (value: typeof state) => unknown) => selector(state));
    store.getState.mockReturnValue(state);
  });

  it('loads synchronized errors and starts their review session', async () => {
    const screen = await render(<ErrorsScreen />);

    expect(loadErrorReview).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Pregunta pendiente de dominar')).toBeTruthy();

    fireEvent.press(screen.getByText('Empezar repaso'));
    await waitFor(() => {
      expect(startErrorReview).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith('/quiz');
    });
  });
});
