import {MaterialCommunityIcons} from '@expo/vector-icons';
import {router} from 'expo-router';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {colors, spacing} from '@/core/design/tokens';
import {useAppStore} from '@/features/app-state/useAppStore';

export function AppStatusBanner() {
  const status = useAppStore((state) => state.connectionStatus);
  const message = useAppStore((state) => state.connectionMessage);
  const restoring = useAppStore((state) => state.isRestoringSession);
  const restoreSession = useAppStore((state) => state.restoreSession);

  if (status !== 'offline' && status !== 'session-expired') return null;

  const expired = status === 'session-expired';
  const action = () => {
    if (expired) {
      router.push('/account');
      return;
    }
    void restoreSession();
  };

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.safe, expired ? styles.expiredSafe : styles.offlineSafe]}
    >
      <View accessibilityLiveRegion="polite" style={styles.banner}>
        <MaterialCommunityIcons
          name={expired ? 'account-alert-outline' : 'wifi-off'}
          size={20}
          color={expired ? colors.danger : colors.ink}
        />
        <Text style={styles.message}>{message}</Text>
        <Pressable
          accessibilityRole="button"
          disabled={restoring}
          onPress={action}
          style={({pressed}) => [styles.action, pressed && styles.pressed]}
        >
          <MaterialCommunityIcons
            name={expired ? 'login' : 'refresh'}
            size={18}
            color={colors.ink}
          />
          <Text style={styles.actionLabel}>{expired ? 'Entrar' : 'Reintentar'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {borderBottomWidth: 1},
  offlineSafe: {backgroundColor: colors.softGold, borderBottomColor: '#E9CE79'},
  expiredSafe: {backgroundColor: '#FFF1F1', borderBottomColor: '#F2C7C7'},
  banner: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  message: {flex: 1, color: colors.ink, fontSize: 12, lineHeight: 17, fontWeight: '700'},
  action: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
  },
  actionLabel: {color: colors.ink, fontSize: 12, fontWeight: '900'},
  pressed: {opacity: 0.7},
});
