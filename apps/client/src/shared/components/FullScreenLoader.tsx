import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';

import {colors, spacing} from '@/core/design/tokens';
import {BrandMark} from './BrandMark';

export function FullScreenLoader({label = 'Recuperando tu sesión'}: {label?: string}) {
  return (
    <View accessibilityRole="progressbar" style={styles.loading}>
      <BrandMark size={68} />
      <ActivityIndicator size="large" color={colors.brand} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.paper,
  },
  label: {color: colors.muted, fontSize: 13, fontWeight: '700'},
});
