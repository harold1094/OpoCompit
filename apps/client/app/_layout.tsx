import 'react-native-gesture-handler';

import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { colors } from '@/core/design/tokens';
import { trackEvent } from '@/core/analytics/analytics';
import {useAppStore} from '@/features/app-state/useAppStore';
import {AppStatusBanner} from '@/shared/components/AppStatusBanner';

function AnalyticsRouteTracker() {
  const pathname = usePathname();

  useEffect(() => {
    void trackEvent('app_open');
  }, []);

  useEffect(() => {
    void trackEvent('screen_view', { screen_name: pathname });
  }, [pathname]);

  return null;
}

function SessionRestorer() {
  const hydrated = useAppStore((state) => state.hydrated);
  const connectionStatus = useAppStore((state) => state.connectionStatus);
  const restoreSession = useAppStore((state) => state.restoreSession);

  useEffect(() => {
    if (hydrated && connectionStatus === 'idle') void restoreSession();
  }, [connectionStatus, hydrated, restoreSession]);

  return <AppStatusBanner />;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <AnalyticsRouteTracker />
        <SessionRestorer />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.paper },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="quiz" />
          <Stack.Screen name="results" />
          <Stack.Screen name="custom-test" />
          <Stack.Screen name="exams" />
          <Stack.Screen name="errors" />
          <Stack.Screen name="groups" />
          <Stack.Screen name="avatar-shop" />
          <Stack.Screen name="premium" />
          <Stack.Screen name="account" />
          <Stack.Screen name="admin" />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
