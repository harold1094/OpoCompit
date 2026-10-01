import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { colors, radius, shadows, spacing } from '@/core/design/tokens';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

type Props = {
  label: string;
  onPress: () => void;
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'brand' | 'secondary' | 'quiet';
};

export function PrimaryButton({
  label,
  onPress,
  icon,
  disabled = false,
  loading = false,
  variant = 'brand',
}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && styles.pressed,
        (disabled || loading) && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'brand' ? colors.surface : colors.ink} />
      ) : (
        <>
          {icon ? (
            <MaterialCommunityIcons
              name={icon}
              size={21}
              color={variant === 'brand' ? colors.surface : colors.ink}
            />
          ) : null}
          <Text style={[styles.label, variant !== 'brand' && styles.darkLabel]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 50,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  brand: { backgroundColor: colors.brand, ...shadows.floating },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, ...shadows.card },
  quiet: { backgroundColor: colors.softBrand },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.45 },
  label: { color: colors.surface, fontSize: 15, fontWeight: '900', letterSpacing: 0.2 },
  darkLabel: { color: colors.ink },
});
