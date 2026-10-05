import {fireEvent, render, waitFor} from '@testing-library/react-native';
import {router} from 'expo-router';

import NotificationsScreen from '../../../app/notifications';
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

jest.mock('@/features/app-state/useAppStore', () => ({
  useAppStore: jest.fn(),
}));

describe('NotificationsScreen', () => {
  const loadNotifications = jest.fn();
  const markNotificationsRead = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(router, {push: mockPush, back: mockBack});
    loadNotifications.mockResolvedValue(undefined);
    markNotificationsRead.mockResolvedValue(undefined);
    const state = {
      notificationOverview: {
        unreadCount: 1,
        items: [{
          id: 'friend_request_edge',
          type: 'friend_request' as const,
          title: 'Nueva solicitud de amistad',
          body: 'Lucía quiere añadirte como amigo.',
          route: '/(tabs)/social',
          entityId: 'edge',
          readAt: null,
          createdAt: '2026-10-05T10:00:00.000Z',
        }],
      },
      isLoadingNotifications: false,
      notificationsError: null,
      loadNotifications,
      markNotificationsRead,
    };
    (useAppStore as unknown as jest.Mock).mockImplementation(
      (selector: (value: typeof state) => unknown) => selector(state),
    );
  });

  it('loads the inbox and opens an unread social notification', async () => {
    const screen = await render(<NotificationsScreen />);
    expect(loadNotifications).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByText('Nueva solicitud de amistad'));
    await waitFor(() => {
      expect(markNotificationsRead).toHaveBeenCalledWith(['friend_request_edge']);
      expect(mockPush).toHaveBeenCalledWith('/(tabs)/social');
    });
  });

  it('marks the complete inbox as read', async () => {
    const screen = await render(<NotificationsScreen />);
    fireEvent.press(screen.getByText('Leer todo'));
    expect(markNotificationsRead).toHaveBeenCalledWith();
  });
});
