import { fireEvent, render, waitFor } from '@testing-library/react-native';
import * as Linking from 'expo-linking';

import DataDeletionScreen from '../../../app/data-deletion';

jest.mock('expo-router', () => ({
  router: {back: jest.fn()},
}));

jest.mock('expo-linking', () => ({
  openURL: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: () => null,
}));

jest.mock('./legalConfig', () => ({
  legalConfig: {owner: 'OpoCompit'},
  deletionRequestUrl: () => 'https://opocompit.test/delete-account',
}));

describe('DataDeletionScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('explains deletion and opens the external request path', async () => {
    const screen = render(<DataDeletionScreen />);

    expect(screen.getByText('Qué se elimina')).toBeTruthy();
    fireEvent.press(screen.getByText('Solicitar eliminación'));

    await waitFor(() => {
      expect(Linking.openURL).toHaveBeenCalledWith('https://opocompit.test/delete-account');
    });
  });
});
