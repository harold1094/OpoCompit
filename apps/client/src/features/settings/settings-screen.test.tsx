import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import SettingsScreen from '../../../app/settings';
import { defaultUserPreferences } from './domain/preferences';
import { useAppStore } from '@/features/app-state/useAppStore';

const mockBack = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  Redirect: () => null,
  router: {back: mockBack, push: mockPush, replace: mockReplace},
  useFocusEffect: (callback: () => void) => callback(),
}));

jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: () => null,
}));

jest.mock('@/features/app-state/useAppStore', () => ({
  useAppStore: jest.fn(),
}));

describe('SettingsScreen', () => {
  const loadPreferences = jest.fn();
  const updatePreferences = jest.fn();
  const deleteAccount = jest.fn();
  const clearAccountError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(router, {back: mockBack, push: mockPush, replace: mockReplace});
    updatePreferences.mockResolvedValue(true);
    deleteAccount.mockResolvedValue(true);
    const state = {
      hydrated: true,
      profile: {uid: 'user-1', username: 'Harold', isGuest: false},
      backendMode: 'firebase',
      preferences: defaultUserPreferences,
      isLoadingPreferences: false,
      isSavingPreferences: false,
      isAccountLoading: false,
      preferencesError: null,
      accountError: null,
      loadPreferences,
      updatePreferences,
      deleteAccount,
      clearAccountError,
    };
    (useAppStore as unknown as jest.Mock).mockImplementation(
      (selector: (value: typeof state) => unknown) => selector(state),
    );
  });

  it('loads settings and updates haptic feedback', async () => {
    const screen = await render(<SettingsScreen />);
    expect(loadPreferences).toHaveBeenCalledTimes(1);

    fireEvent(screen.getByLabelText('Vibración'), 'valueChange', false);
    expect(updatePreferences).toHaveBeenCalledWith({hapticsEnabled: false});
  });

  it('requires the exact confirmation before deleting the account', async () => {
    const screen = await render(<SettingsScreen />);
    await fireEvent.press(screen.getByText('Eliminar mi cuenta'));
    await fireEvent.changeText(screen.getByPlaceholderText('ELIMINAR'), 'ELIMINAR');
    await fireEvent.press(screen.getByText('Eliminar definitivamente'));

    await waitFor(() => {
      expect(deleteAccount).toHaveBeenCalledTimes(1);
      expect(mockReplace).toHaveBeenCalledWith('/onboarding');
    });
  });

  it('opens the legal and support center', async () => {
    const screen = await render(<SettingsScreen />);
    await fireEvent.press(screen.getByText('Legal y soporte'));

    expect(mockPush).toHaveBeenCalledWith('/legal');
  });
});
