import {MaterialCommunityIcons} from '@expo/vector-icons';
import {ActivityIndicator, Pressable, StyleSheet, Text, View} from 'react-native';

import {colors, spacing} from '@/core/design/tokens';

type Props = {
  kind: 'loading' | 'empty' | 'error';
  title: string;
  detail: string;
  onRetry?: () => void;
};

export function ContentState({kind, title, detail, onRetry}: Props) {
  const icon = kind === 'empty' ? 'calendar-blank-outline' : 'alert-circle-outline';
  return (
    <View accessibilityLiveRegion="polite" style={styles.state}>
      {kind === 'loading' ? (
        <ActivityIndicator color={colors.aqua} />
      ) : (
        <MaterialCommunityIcons
          name={icon}
          size={24}
          color={kind === 'error' ? colors.danger : colors.muted}
        />
      )}
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.detail}>{detail}</Text>
      </View>
      {kind === 'error' && onRetry ? (
        <Pressable
          accessibilityLabel="Reintentar"
          accessibilityRole="button"
          onPress={onRetry}
          style={({pressed}) => [styles.retry, pressed && styles.pressed]}
        >
          <MaterialCommunityIcons name="refresh" size={21} color={colors.aqua} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  state: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.line,
  },
  copy: {flex: 1},
  title: {color: colors.ink, fontSize: 14, fontWeight: '900'},
  detail: {color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 3},
  retry: {width: 44, height: 44, alignItems: 'center', justifyContent: 'center'},
  pressed: {opacity: 0.7},
});
