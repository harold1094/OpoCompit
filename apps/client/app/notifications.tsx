import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import type { ComponentProps } from 'react';
import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppNotification, AppNotificationType } from '@/core/domain/types';
import { colors, radius, shadows, spacing } from '@/core/design/tokens';
import { useAppStore } from '@/features/app-state/useAppStore';
import { AppScreen } from '@/shared/components/AppScreen';
import { ContentState } from '@/shared/components/ContentState';
import { PrimaryButton } from '@/shared/components/PrimaryButton';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

const notificationVisuals: Record<AppNotificationType, {icon: IconName; color: string; background: string}> = {
  friend_request: {icon: 'account-plus-outline', color: colors.aqua, background: colors.softAqua},
  friend_accepted: {icon: 'account-check-outline', color: colors.success, background: colors.softAqua},
  duel_invitation: {icon: 'sword-cross', color: colors.brand, background: colors.softBrand},
  duel_accepted: {icon: 'shield-sword-outline', color: colors.aqua, background: colors.softAqua},
  duel_result: {icon: 'trophy-outline', color: colors.gold, background: colors.softGold},
  achievement: {icon: 'medal-outline', color: colors.gold, background: colors.softGold},
};

export default function NotificationsScreen() {
  const overview = useAppStore((state) => state.notificationOverview);
  const loading = useAppStore((state) => state.isLoadingNotifications);
  const error = useAppStore((state) => state.notificationsError);
  const loadNotifications = useAppStore((state) => state.loadNotifications);
  const markNotificationsRead = useAppStore((state) => state.markNotificationsRead);

  useFocusEffect(
    useCallback(() => {
      void loadNotifications();
    }, [loadNotifications]),
  );

  const openNotification = async (notification: AppNotification) => {
    if (notification.readAt === null) await markNotificationsRead([notification.id]);
    if (notification.route === '/achievements') {
      router.push('/achievements');
    } else {
      router.push('/(tabs)/social');
    }
  };

  return (
    <AppScreen>
      <View style={styles.header}>
        <View style={styles.heading}>
          <Text style={styles.title}>Avisos</Text>
          <Text style={styles.subtitle}>{overview.unreadCount} sin leer</Text>
        </View>
        {overview.unreadCount > 0 ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => void markNotificationsRead()}
            style={({pressed}) => [styles.readAll, pressed && styles.pressed]}
          >
            <MaterialCommunityIcons name="email-open-outline" size={18} color={colors.aqua} />
            <Text style={styles.readAllText}>Leer todo</Text>
          </Pressable>
        ) : null}
      </View>

      {loading && overview.items.length === 0 ? (
        <ContentState kind="loading" title="Cargando avisos" detail="Revisamos tus novedades." />
      ) : error && overview.items.length === 0 ? (
        <ContentState kind="error" title="No pudimos cargar los avisos" detail={error} onRetry={() => void loadNotifications()} />
      ) : overview.items.length === 0 ? (
        <ContentState kind="empty" title="Todo al día" detail="Aquí aparecerán retos, solicitudes, resultados y logros." />
      ) : (
        <View style={styles.list}>
          {overview.items.map((notification) => (
            <NotificationRow
              key={notification.id}
              notification={notification}
              onPress={() => void openNotification(notification)}
            />
          ))}
        </View>
      )}

      <View style={styles.back}>
        <PrimaryButton label="Volver" icon="arrow-left" variant="secondary" onPress={() => router.back()} />
      </View>
    </AppScreen>
  );
}

function NotificationRow({notification, onPress}: {notification: AppNotification; onPress: () => void}) {
  const visual = notificationVisuals[notification.type] ?? notificationVisuals.achievement;
  const unread = notification.readAt === null;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({pressed}) => [styles.row, unread && styles.rowUnread, pressed && styles.pressed]}
    >
      <View style={[styles.icon, {backgroundColor: visual.background}]}>
        <MaterialCommunityIcons name={visual.icon} size={23} color={visual.color} />
      </View>
      <View style={styles.copy}>
        <View style={styles.rowHeading}>
          <Text style={styles.rowTitle}>{notification.title}</Text>
          {unread ? <View accessibilityLabel="Sin leer" style={styles.unreadDot} /> : null}
        </View>
        <Text style={styles.body}>{notification.body}</Text>
        <Text style={styles.date}>{formatNotificationDate(notification.createdAt)}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={colors.muted} />
    </Pressable>
  );
}

function formatNotificationDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, marginBottom: spacing.lg },
  heading: { flex: 1 },
  title: { color: colors.ink, fontSize: 28, fontWeight: '900' },
  subtitle: { color: colors.muted, fontSize: 13, marginTop: 3 },
  readAll: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10 },
  readAllText: { color: colors.aqua, fontSize: 12, fontWeight: '900' },
  list: { gap: spacing.sm },
  row: { minHeight: 88, flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, backgroundColor: colors.surface, ...shadows.card },
  rowUnread: { borderColor: '#BCE6DE', backgroundColor: '#FAFFFE' },
  icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
  copy: { flex: 1 },
  rowHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowTitle: { flex: 1, color: colors.ink, fontSize: 13, fontWeight: '900' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brand },
  body: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 3 },
  date: { color: colors.muted, fontSize: 10, fontWeight: '700', marginTop: 6 },
  pressed: { opacity: 0.75 },
  back: { marginTop: spacing.lg, marginBottom: spacing.lg },
});
