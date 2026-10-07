import { fireEvent, render, waitFor } from '@testing-library/react-native';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';

import LegalScreen from '../../../app/legal';

const mockBack = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  router: {back: mockBack, push: mockPush},
  useLocalSearchParams: () => ({}),
}));

jest.mock('expo-linking', () => ({
  openURL: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: () => null,
}));

jest.mock('./legalConfig', () => ({
  legalConfig: {
    owner: 'OpoCompit',
    supportEmail: 'soporte@opocompit.test',
    supportUrl: null,
    privacyUrl: null,
    termsUrl: null,
    accountDeletionUrl: 'https://opocompit.test/delete',
  },
  supportContactUrl: () => 'mailto:soporte@opocompit.test?subject=Soporte%20OpoCompit',
}));

describe('LegalScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(router, {back: mockBack, push: mockPush});
  });

  it('shows both legal documents and opens the configured support channel', async () => {
    const screen = render(<LegalScreen />);

    expect(screen.getByText('Política de privacidad')).toBeTruthy();
    fireEvent.press(screen.getByText('Términos'));
    expect(screen.getByText('Términos de uso')).toBeTruthy();

    fireEvent.press(screen.getByText('Soporte'));
    fireEvent.press(screen.getByText('Contactar con soporte'));

    await waitFor(() => {
      expect(Linking.openURL).toHaveBeenCalledWith(
        'mailto:soporte@opocompit.test?subject=Soporte%20OpoCompit',
      );
    });
  });

  it('links support to account settings and the public deletion route', () => {
    const screen = render(<LegalScreen />);
    fireEvent.press(screen.getByText('Soporte'));

    fireEvent.press(screen.getByText('Cuenta y eliminación'));
    expect(mockPush).toHaveBeenCalledWith('/settings');

    fireEvent.press(screen.getByText('Ruta pública de eliminación'));
    expect(mockPush).toHaveBeenCalledWith('/data-deletion');
  });
});
