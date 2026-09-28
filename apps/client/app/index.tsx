import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { colors } from '@/core/design/tokens';
import { useAppStore } from '@/features/app-state/useAppStore';

export default function EntryScreen() {
  const hydrated = useAppStore((state) => state.hydrated);
  const profile = useAppStore((state) => state.profile);

  if (!hydrated) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  return <Redirect href={profile ? '/(tabs)' : '/onboarding'} />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper },
});
