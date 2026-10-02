import 'react-native-gesture-handler';

import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { colors } from '@/core/design/tokens';
import { trackEvent } from '@/core/analytics/analytics';

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

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <AnalyticsRouteTracker />
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
          <Stack.Screen name="errors" />
          <Stack.Screen name="groups" />
          <Stack.Screen name="avatar-shop" />
          <Stack.Screen name="premium" />
          <Stack.Screen name="admin" />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
