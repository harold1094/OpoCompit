import {fireEvent, render, waitFor} from '@testing-library/react-native';
import {router} from 'expo-router';

import CustomTestScreen from '../../../app/custom-test';
import {useAppStore} from '@/features/app-state/useAppStore';

const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  router: {},
}));

jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: () => null,
}));

jest.mock('@/features/app-state/useAppStore', () => {
  const selector = jest.fn();
  Object.assign(selector, {getState: jest.fn()});
  return {useAppStore: selector};
});

describe('CustomTestScreen', () => {
  const startCustomQuiz = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(router, {push: mockPush, back: mockBack});
    startCustomQuiz.mockResolvedValue(5);
    const state = {
      profile: {territory: {label: 'Bomberos Cartagena'}},
      isStartingQuiz: false,
      quizError: null,
      startCustomQuiz,
    };
    const store = useAppStore as unknown as jest.Mock & {getState: jest.Mock};
    store.mockImplementation((selector: (value: typeof state) => unknown) => selector(state));
    store.getState.mockReturnValue(state);
  });

  it('starts a simulation with the selected filters', async () => {
    const screen = await render(<CustomTestScreen />);

    await fireEvent.press(screen.getByText('Simulacro'));
    await fireEvent.press(screen.getByText('5'));
    await fireEvent.press(screen.getByText('Incendios'));
    await fireEvent.press(screen.getByText('Nivel 1'));
    await fireEvent.press(screen.getByText('Toda España'));
    await fireEvent.press(screen.getByText('Nuevas'));
    await fireEvent.press(screen.getByText('Iniciar simulacro'));

    await waitFor(() => {
      expect(startCustomQuiz).toHaveBeenCalledWith({
        mode: 'simulation',
        questionCount: 5,
        categoryId: 'fires',
        difficulty: 1,
        territoryMode: 'all_spain',
        questionStatus: 'new',
      });
      expect(mockPush).toHaveBeenCalledWith('/quiz');
    });
  });
});
