import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { colors, radius, spacing } from '@/core/design/tokens';
import { FriendDuelInvitation, SocialUser } from '@/core/domain/types';
import { useAppStore } from '@/features/app-state/useAppStore';
import { trainingOpponents } from '@/features/duels/domain/duel';
import { AppScreen } from '@/shared/components/AppScreen';

export default function SocialScreen() {
  const profile = useAppStore((state) => state.profile);
  const friends = useAppStore((state) => state.friends);
  const incomingRequests = useAppStore((state) => state.incomingRequests);
  const outgoingRequests = useAppStore((state) => state.outgoingRequests);
  const duelInvitations = useAppStore((state) => state.duelInvitations);
  const searchResults = useAppStore((state) => state.socialSearchResults);
  const socialError = useAppStore((state) => state.socialError);
  const isLoadingSocial = useAppStore((state) => state.isLoadingSocial);
  const isSavingUsername = useAppStore((state) => state.isSavingUsername);
  const socialActionId = useAppStore((state) => state.socialActionId);
  const isStartingDuel = useAppStore((state) => state.isStartingDuel);
  const refreshSocial = useAppStore((state) => state.refreshSocial);
  const setPublicUsername = useAppStore((state) => state.setPublicUsername);
  const searchSocialUsers = useAppStore((state) => state.searchSocialUsers);
  const sendFriendRequest = useAppStore((state) => state.sendFriendRequest);
  const respondFriendRequest = useAppStore((state) => state.respondFriendRequest);
  const removeFriend = useAppStore((state) => state.removeFriend);
  const sendFriendDuelInvitation = useAppStore((state) => state.sendFriendDuelInvitation);
  const respondFriendDuelInvitation = useAppStore((state) => state.respondFriendDuelInvitation);
  const openFriendDuel = useAppStore((state) => state.openFriendDuel);
  const startClassicDuel = useAppStore((state) => state.startClassicDuel);
  const [showSearch, setShowSearch] = useState(false);
  const [username, setUsername] = useState('');
  const [query, setQuery] = useState('');
  const [startingOpponentId, setStartingOpponentId] = useState<string | null>(null);

  const incomingDuelInvitations = duelInvitations.filter(
    (invitation) => invitation.status === 'pending' && invitation.direction === 'incoming',
  );
  const outgoingDuelInvitations = duelInvitations.filter(
    (invitation) => invitation.status === 'pending' && invitation.direction === 'outgoing',
  );
  const playableDuels = duelInvitations.filter((invitation) => invitation.status !== 'pending');

  useFocusEffect(
    useCallback(() => {
      void refreshSocial();
    }, [refreshSocial]),
  );

  if (!profile) return null;
  const needsUsername = profile.username === 'Invitado';

  const saveUsername = async () => {
    if (await setPublicUsername(username)) {
      setUsername('');
      setShowSearch(true);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const challenge = async (opponent: (typeof trainingOpponents)[number]) => {
    setStartingOpponentId(opponent.id);
    const count = await startClassicDuel(opponent);
    if (count > 0) {
      void Haptics.selectionAsync();
      router.push('/quiz');
      return;
    }
    setStartingOpponentId(null);
    const message = useAppStore.getState().quizError;
    if (message) Alert.alert('No se pudo iniciar el duelo', message);
  };

  const remove = (friend: SocialUser) => {
    Alert.alert('Eliminar amistad', `¿Quieres eliminar a ${friend.username}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => void removeFriend(friend.uid) },
    ]);
  };

  const challengeFriend = async (friend: SocialUser) => {
    if (await sendFriendDuelInvitation(friend)) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const openInvitation = async (invitation: FriendDuelInvitation) => {
    const destination = await openFriendDuel(invitation);
    if (destination === 'quiz') router.push('/quiz');
    if (destination === 'results' || destination === 'waiting') router.push('/results');
  };

  return (
    <AppScreen>
      <View style={styles.heading}>
        <View style={styles.headingCopy}>
          <Text style={styles.title}>Social</Text>
          <Text style={styles.subtitle}>
            {needsUsername ? 'Crea tu identidad para encontrar compañeros.' : `@${profile.username}`}
          </Text>
        </View>
        <Pressable
          accessibilityLabel={showSearch ? 'Cerrar búsqueda' : 'Buscar usuario'}
          accessibilityRole="button"
          disabled={needsUsername}
          onPress={() => setShowSearch((value) => !value)}
          style={({ pressed }) => [
            styles.addButton,
            needsUsername && styles.disabledButton,
            pressed && styles.iconPressed,
          ]}
        >
          <MaterialCommunityIcons
            name={showSearch ? 'close' : 'account-plus-outline'}
            size={22}
            color={colors.surface}
          />
        </Pressable>
      </View>

      <View style={styles.socialBand}>
        <MaterialCommunityIcons name="account-group-outline" size={31} color={colors.brand} />
        <View style={styles.socialBandCopy}>
          <Text style={styles.socialBandTitle}>Tu círculo</Text>
          <Text style={styles.socialBandText}>
            {friends.length} amigos · {incomingRequests.length + incomingDuelInvitations.length} avisos
          </Text>
        </View>
        <Text style={styles.socialBandValue}>{friends.length}</Text>
      </View>

      {needsUsername ? (
        <View style={styles.setupPanel}>
          <Text style={styles.panelTitle}>Elige tu nombre de usuario</Text>
          <View style={styles.inputRow}>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={20}
              onChangeText={setUsername}
              onSubmitEditing={() => void saveUsername()}
              placeholder="harold_27"
              placeholderTextColor={colors.muted}
              style={styles.input}
              value={username}
            />
            <IconAction
              accessibilityLabel="Guardar nombre de usuario"
              icon="check"
              loading={isSavingUsername}
              onPress={() => void saveUsername()}
            />
          </View>
        </View>
      ) : null}

      {showSearch && !needsUsername ? (
        <View style={styles.searchPanel}>
          <Text style={styles.panelTitle}>Buscar por nombre exacto</Text>
          <View style={styles.inputRow}>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={20}
              onChangeText={setQuery}
              onSubmitEditing={() => void searchSocialUsers(query)}
              placeholder="Nombre de usuario"
              placeholderTextColor={colors.muted}
              style={styles.input}
              value={query}
            />
            <IconAction
              accessibilityLabel="Buscar usuario"
              icon="magnify"
              loading={isLoadingSocial}
              onPress={() => void searchSocialUsers(query)}
            />
          </View>
          {searchResults.map((user) => (
            <SocialRow
              action={
                <IconAction
                  accessibilityLabel={`Enviar solicitud a ${user.username}`}
                  icon="account-plus-outline"
                  loading={socialActionId === user.uid}
                  onPress={() => void sendFriendRequest(user)}
                  variant="soft"
                />
              }
              key={user.uid}
              user={user}
            />
          ))}
        </View>
      ) : null}

      {socialError ? <Text style={styles.errorText}>{socialError}</Text> : null}

      {incomingRequests.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Solicitudes</Text>
          <View style={styles.list}>
            {incomingRequests.map((request) => (
              <SocialRow
                action={
                  <View style={styles.requestActions}>
                    <IconAction
                      accessibilityLabel={`Rechazar a ${request.user.username}`}
                      icon="close"
                      onPress={() => void respondFriendRequest(request.id, false)}
                      variant="neutral"
                    />
                    <IconAction
                      accessibilityLabel={`Aceptar a ${request.user.username}`}
                      icon="check"
                      loading={socialActionId === request.id}
                      onPress={() => void respondFriendRequest(request.id, true)}
                      variant="soft"
                    />
                  </View>
                }
                key={request.id}
                user={request.user}
              />
            ))}
          </View>
        </View>
      ) : null}

      {outgoingRequests.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pendientes</Text>
          <View style={styles.list}>
            {outgoingRequests.map((request) => (
              <SocialRow
                action={<Text style={styles.pendingLabel}>Enviada</Text>}
                key={request.id}
                user={request.user}
              />
            ))}
          </View>
        </View>
      ) : null}

      {incomingDuelInvitations.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Retos recibidos</Text>
          <View style={styles.list}>
            {incomingDuelInvitations.map((invitation) => (
              <SocialRow
                action={
                  <View style={styles.requestActions}>
                    <IconAction
                      accessibilityLabel={`Rechazar reto de ${invitation.opponent.username}`}
                      icon="close"
                      disabled={socialActionId === invitation.id}
                      onPress={() => void respondFriendDuelInvitation(invitation.id, false)}
                      variant="neutral"
                    />
                    <IconAction
                      accessibilityLabel={`Aceptar reto de ${invitation.opponent.username}`}
                      icon="sword-cross"
                      loading={socialActionId === invitation.id}
                      onPress={() => void respondFriendDuelInvitation(invitation.id, true)}
                      variant="soft"
                    />
                  </View>
                }
                key={invitation.id}
                meta="Duelo clásico · pendiente"
                user={invitation.opponent}
              />
            ))}
          </View>
        </View>
      ) : null}

      {outgoingDuelInvitations.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Retos enviados</Text>
          <View style={styles.list}>
            {outgoingDuelInvitations.map((invitation) => (
              <SocialRow
                action={<Text style={styles.pendingLabel}>Enviado</Text>}
                key={invitation.id}
                meta="Esperando respuesta"
                user={invitation.opponent}
              />
            ))}
          </View>
        </View>
      ) : null}

      {playableDuels.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Duelos con amigos</Text>
          <View style={styles.list}>
            {playableDuels.map((invitation) => (
              <SocialRow
                action={
                  invitation.status === 'waiting' ? (
                    <Text style={styles.pendingLabel}>Esperando</Text>
                  ) : (
                    <IconAction
                      accessibilityLabel={
                        invitation.status === 'completed'
                          ? `Ver resultado contra ${invitation.opponent.username}`
                          : `Jugar contra ${invitation.opponent.username}`
                      }
                      icon={invitation.status === 'completed' ? 'trophy-outline' : 'play'}
                      loading={isStartingDuel && socialActionId === invitation.id}
                      onPress={() => void openInvitation(invitation)}
                      variant="soft"
                    />
                  )
                }
                key={invitation.id}
                meta={duelInvitationMeta(invitation)}
                user={invitation.opponent}
              />
            ))}
          </View>
        </View>
      ) : null}

      {friends.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Amigos</Text>
          <View style={styles.list}>
            {friends.map((friend) => {
              const hasOpenDuel = duelInvitations.some(
                (invitation) => invitation.opponent.uid === friend.uid &&
                  ['pending', 'active', 'waiting'].includes(invitation.status),
              );
              return (
                <SocialRow
                  action={
                    <View style={styles.requestActions}>
                      <IconAction
                        accessibilityLabel={
                          hasOpenDuel ? `Reto activo con ${friend.username}` : `Retar a ${friend.username}`
                        }
                        disabled={hasOpenDuel}
                        icon={hasOpenDuel ? 'timer-sand' : 'sword-cross'}
                        loading={socialActionId === `duel_${friend.uid}`}
                        onPress={() => void challengeFriend(friend)}
                        variant="soft"
                      />
                      <IconAction
                        accessibilityLabel={`Eliminar a ${friend.username}`}
                        icon="account-remove-outline"
                        loading={socialActionId === friend.uid}
                        onPress={() => remove(friend)}
                        variant="neutral"
                      />
                    </View>
                  }
                  key={friend.uid}
                  user={friend}
                />
              );
            })}
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Rivales de entrenamiento</Text>
        <View style={styles.list}>
          {trainingOpponents.map((opponent) => (
            <View key={opponent.id} style={styles.row}>
              <Avatar />
              <View style={styles.rowCopy}>
                <Text style={styles.rowName}>{opponent.name}</Text>
                <Text style={styles.rowMeta}>Nivel {opponent.level} · {opponent.territoryLabel}</Text>
              </View>
              <IconAction
                accessibilityLabel={`Retar a ${opponent.name}`}
                icon="sword-cross"
                loading={isStartingDuel && startingOpponentId === opponent.id}
                onPress={() => void challenge(opponent)}
                variant="soft"
              />
            </View>
          ))}
        </View>
      </View>

    </AppScreen>
  );
}

function SocialRow({
  user,
  action,
  meta,
}: {
  user: SocialUser;
  action: React.ReactNode;
  meta?: string;
}) {
  return (
    <View style={styles.row}>
      <Avatar />
      <View style={styles.rowCopy}>
        <Text style={styles.rowName}>{user.username}</Text>
        <Text style={styles.rowMeta}>
          {meta ?? `Nivel ${user.level} · ${user.territoryLabel} · ${user.currentStreak} días`}
        </Text>
      </View>
      {action}
    </View>
  );
}

function duelInvitationMeta(invitation: FriendDuelInvitation): string {
  if (invitation.status === 'completed') return 'Resultado disponible';
  if (invitation.status === 'waiting') return 'Has terminado · falta tu rival';
  if (invitation.opponentSubmitted) return 'Tu rival ya ha terminado';
  return 'Duelo clásico · listo para jugar';
}

function Avatar() {
  return (
    <View style={styles.avatar}>
      <MaterialCommunityIcons name="account-outline" size={23} color={colors.ink} />
      <View style={styles.online} />
    </View>
  );
}

function IconAction({
  accessibilityLabel,
  disabled = false,
  icon,
  loading = false,
  onPress,
  variant = 'solid',
}: {
  accessibilityLabel: string;
  disabled?: boolean;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  loading?: boolean;
  onPress: () => void;
  variant?: 'solid' | 'soft' | 'neutral';
}) {
  const backgroundColor = variant === 'solid'
    ? colors.aqua
    : variant === 'soft'
      ? colors.softAqua
      : colors.paper;
  const color = variant === 'solid' ? colors.surface : variant === 'soft' ? colors.aqua : colors.muted;
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconAction,
        { backgroundColor },
        disabled && styles.disabledButton,
        pressed && styles.iconPressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={color} size="small" />
      ) : (
        <MaterialCommunityIcons color={color} name={icon} size={20} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  headingCopy: { flex: 1 },
  title: { color: colors.ink, fontSize: 30, fontWeight: '900' },
  subtitle: { color: colors.muted, fontSize: 14, marginTop: 4 },
  addButton: { width: 43, height: 43, borderRadius: radius.md, backgroundColor: colors.aqua, alignItems: 'center', justifyContent: 'center' },
  disabledButton: { opacity: 0.35 },
  iconPressed: { opacity: 0.72 },
  socialBand: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: -20, marginTop: spacing.xl, paddingHorizontal: 22, paddingVertical: 20, backgroundColor: colors.ink },
  socialBandCopy: { flex: 1 },
  socialBandTitle: { color: colors.surface, fontSize: 15, fontWeight: '900' },
  socialBandText: { color: '#CBD1D6', fontSize: 12, marginTop: 3 },
  socialBandValue: { color: colors.gold, fontSize: 31, fontWeight: '900' },
  setupPanel: { marginTop: spacing.xl },
  searchPanel: { marginTop: spacing.xl, gap: spacing.sm },
  panelTitle: { color: colors.ink, fontSize: 16, fontWeight: '900' },
  inputRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  input: { flex: 1, minHeight: 44, paddingHorizontal: 13, color: colors.ink, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, fontSize: 14 },
  errorText: { color: colors.danger, fontSize: 12, lineHeight: 18, marginTop: spacing.sm },
  section: { marginTop: spacing.xl },
  sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: '900', marginBottom: spacing.sm },
  list: { gap: spacing.sm },
  row: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 11, padding: 10, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  online: { position: 'absolute', right: 0, bottom: 1, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success, borderWidth: 2, borderColor: colors.surface },
  rowCopy: { flex: 1 },
  rowName: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  rowMeta: { color: colors.muted, fontSize: 11, marginTop: 2 },
  iconAction: { width: 40, height: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  requestActions: { flexDirection: 'row', gap: 6 },
  pendingLabel: { color: colors.muted, fontSize: 11, fontWeight: '800' },
});
