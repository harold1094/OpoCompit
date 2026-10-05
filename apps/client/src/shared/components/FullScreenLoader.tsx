import {MaterialCommunityIcons} from '@expo/vector-icons';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';

import {colors, spacing} from '@/core/design/tokens';

export function FullScreenLoader({label = 'Recuperando tu sesión'}: {label?: string}) {
  return (
    <View accessibilityRole="progressbar" style={styles.loading}>
      <View style={styles.brandIcon}>
        <MaterialCommunityIcons name="trophy-outline" size={28} color={colors.surface} />
      </View>
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
  brandIcon: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: colors.brand,
  },
  label: {color: colors.muted, fontSize: 13, fontWeight: '700'},
});
