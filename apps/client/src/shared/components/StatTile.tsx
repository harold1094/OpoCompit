import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/core/design/tokens';

type Props = {
  label: string;
  value: string;
  accent?: string;
};

export function StatTile({ label, value, accent = colors.brand }: Props) {
  return (
    <View style={styles.tile}>
      <View style={[styles.marker, { backgroundColor: accent }]} />
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: 100,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  marker: { width: 24, height: 3, marginBottom: spacing.sm },
  value: { color: colors.ink, fontSize: 22, fontWeight: '900' },
  label: { color: colors.muted, fontSize: 12, marginTop: 2 },
});
