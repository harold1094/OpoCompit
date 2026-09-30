import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { colors, radius, spacing } from '@/core/design/tokens';
import { StudyGroup, StudyGroupMember } from '@/core/domain/types';
import { useAppStore } from '@/features/app-state/useAppStore';
import { AppScreen } from '@/shared/components/AppScreen';

type GroupForm = 'create' | 'join' | null;

export default function GroupsScreen() {
  const hydrated = useAppStore((state) => state.hydrated);
  const profile = useAppStore((state) => state.profile);
  const groups = useAppStore((state) => state.studyGroups);
  const activeGroup = useAppStore((state) => state.activeStudyGroup);
  const loading = useAppStore((state) => state.isLoadingGroups);
  const action = useAppStore((state) => state.groupAction);
  const error = useAppStore((state) => state.groupsError);
  const refresh = useAppStore((state) => state.refreshStudyGroups);
  const createGroup = useAppStore((state) => state.createStudyGroup);
  const joinGroup = useAppStore((state) => state.joinStudyGroup);
  const openGroup = useAppStore((state) => state.openStudyGroup);
  const leaveGroup = useAppStore((state) => state.leaveStudyGroup);
  const [form, setForm] = useState<GroupForm>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  useFocusEffect(useCallback(() => {
    void refresh();
  }, [refresh]));

  if (!hydrated) return null;
  if (!profile) return <Redirect href="/onboarding" />;

  const hasPublicUsername = profile.username !== 'Invitado';

  const submitCreate = async () => {
    const group = await createGroup(name);
    if (!group) return;
    setName('');
    setForm(null);
    await openGroup(group.id);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const submitJoin = async () => {
    const group = await joinGroup(code);
    if (!group) return;
    setCode('');
    setForm(null);
    await openGroup(group.id);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const confirmLeave = () => {
    if (!activeGroup) return;
    const ownerDeleting = activeGroup.viewerRole === 'owner' && activeGroup.memberCount === 1;
    Alert.alert(
      ownerDeleting ? 'Eliminar grupo' : 'Salir del grupo',
      ownerDeleting
        ? 'El grupo vacío y su código dejarán de existir.'
        : 'Dejarás de aparecer en su clasificación.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: ownerDeleting ? 'Eliminar' : 'Salir',
          style: 'destructive',
          onPress: async () => {
            if (await leaveGroup(activeGroup.id)) {
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          },
        },
      ],
    );
  };

  if (activeGroup) {
    const ownerCanDelete = activeGroup.viewerRole === 'owner' && activeGroup.memberCount === 1;
    const canLeave = activeGroup.viewerRole !== 'owner' || ownerCanDelete;
    return (
      <AppScreen>
        <View style={styles.header}>
          <IconButton label="Volver a mis grupos" icon="arrow-left" onPress={() => {
            useAppStore.setState({ activeStudyGroup: null });
          }} />
          <View style={styles.headerCopy}>
            <Text style={styles.title} numberOfLines={2}>{activeGroup.name}</Text>
            <Text style={styles.subtitle}>{activeGroup.memberCount} miembros · Ranking XP</Text>
          </View>
          <IconButton
            label="Compartir código del grupo"
            icon="share-variant-outline"
            onPress={() => void Share.share({
              message: `Únete a ${activeGroup.name} en OpoCompit con el código ${activeGroup.joinCode}`,
            })}
          />
        </View>

        <View style={styles.codeBand}>
          <View>
            <Text style={styles.codeLabel}>CÓDIGO PRIVADO</Text>
            <Text style={styles.codeValue}>{activeGroup.joinCode}</Text>
          </View>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{roleLabel(activeGroup.viewerRole)}</Text>
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Clasificación</Text>
          {loading ? <ActivityIndicator color={colors.aqua} size="small" /> : null}
        </View>
        <View style={styles.rankingList}>
          {activeGroup.members.map((member) => <MemberRow key={member.uid} member={member} />)}
        </View>

        {canLeave ? (
          <Pressable
            accessibilityRole="button"
            disabled={action === 'leave'}
            onPress={confirmLeave}
            style={({ pressed }) => [styles.leaveButton, pressed && styles.pressed]}
          >
            {action === 'leave' ? (
              <ActivityIndicator color={colors.danger} size="small" />
            ) : (
              <MaterialCommunityIcons name="exit-to-app" size={19} color={colors.danger} />
            )}
            <Text style={styles.leaveText}>{ownerCanDelete ? 'Eliminar grupo' : 'Salir del grupo'}</Text>
          </Pressable>
        ) : null}
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <View style={styles.header}>
        <IconButton label="Volver a Social" icon="arrow-left" onPress={() => router.back()} />
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Grupos</Text>
          <Text style={styles.subtitle}>{groups.length} de 10 disponibles</Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <ModeButton
          active={form === 'create'}
          disabled={!hasPublicUsername}
          icon="plus"
          label="Crear"
          onPress={() => setForm((current) => current === 'create' ? null : 'create')}
        />
        <ModeButton
          active={form === 'join'}
          disabled={!hasPublicUsername}
          icon="key-outline"
          label="Unirme"
          onPress={() => setForm((current) => current === 'join' ? null : 'join')}
        />
      </View>

      {!hasPublicUsername ? (
        <Pressable onPress={() => router.replace('/(tabs)/social')} style={styles.usernameNotice}>
          <MaterialCommunityIcons name="account-edit-outline" size={21} color={colors.brand} />
          <Text style={styles.usernameNoticeText}>Crea tu nombre público desde Social</Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color={colors.muted} />
        </Pressable>
      ) : null}

      {form === 'create' ? (
        <View style={styles.formBand}>
          <TextInput
            maxLength={40}
            onChangeText={setName}
            onSubmitEditing={() => void submitCreate()}
            placeholder="Bomberos Cartagena 2027"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={name}
          />
          <SubmitButton icon="plus" loading={action === 'create'} onPress={() => void submitCreate()} />
        </View>
      ) : null}

      {form === 'join' ? (
        <View style={styles.formBand}>
          <TextInput
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={9}
            onChangeText={setCode}
            onSubmitEditing={() => void submitJoin()}
            placeholder="ABCD2345"
            placeholderTextColor={colors.muted}
            style={[styles.input, styles.codeInput]}
            value={code}
          />
          <SubmitButton icon="login" loading={action === 'join'} onPress={() => void submitJoin()} />
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>Mis grupos</Text>
        {loading ? <ActivityIndicator color={colors.aqua} size="small" /> : null}
      </View>
      {!loading && groups.length === 0 ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="account-multiple-plus-outline" size={36} color={colors.aqua} />
          <Text style={styles.emptyTitle}>Tu primera liga privada</Text>
          <Text style={styles.emptyText}>Crea un grupo o entra con un código.</Text>
        </View>
      ) : (
        <View style={styles.groupList}>
          {groups.map((group) => (
            <GroupRow key={group.id} group={group} loading={loading} onPress={() => void openGroup(group.id)} />
          ))}
        </View>
      )}
    </AppScreen>
  );
}

function GroupRow({ group, loading, onPress }: {
  group: StudyGroup;
  loading: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [styles.groupRow, pressed && styles.pressed]}
    >
      <View style={styles.groupIcon}>
        <MaterialCommunityIcons name="account-group-outline" size={25} color={colors.aqua} />
      </View>
      <View style={styles.groupCopy}>
        <Text style={styles.groupName} numberOfLines={2}>{group.name}</Text>
        <Text style={styles.groupMeta}>{group.memberCount} miembros · {roleLabel(group.viewerRole)}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={22} color={colors.muted} />
    </Pressable>
  );
}

function MemberRow({ member }: { member: StudyGroupMember }) {
  return (
    <View style={[styles.memberRow, member.isViewer && styles.viewerRow]}>
      <Text style={styles.position}>{member.position}</Text>
      <View style={styles.avatar}>
        <MaterialCommunityIcons name="account-outline" size={21} color={colors.ink} />
      </View>
      <View style={styles.groupCopy}>
        <View style={styles.memberNameRow}>
          <Text style={styles.memberName}>{member.username}</Text>
          {member.role !== 'member' ? <Text style={styles.memberRole}>{roleLabel(member.role)}</Text> : null}
        </View>
        <Text style={styles.groupMeta}>Nivel {member.level} · {member.territoryLabel}</Text>
      </View>
      <Text style={styles.score}>{member.score} XP</Text>
    </View>
  );
}

function IconButton({ label, icon, onPress }: {
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
    >
      <MaterialCommunityIcons name={icon} size={21} color={colors.ink} />
    </Pressable>
  );
}

function ModeButton({ active, disabled, icon, label, onPress }: {
  active: boolean;
  disabled: boolean;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.modeButton,
        active && styles.modeButtonActive,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <MaterialCommunityIcons name={icon} size={19} color={active ? colors.surface : colors.ink} />
      <Text style={[styles.modeLabel, active && styles.modeLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function SubmitButton({ icon, loading, onPress }: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  loading: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [styles.submitButton, pressed && styles.pressed]}
    >
      {loading ? (
        <ActivityIndicator color={colors.surface} size="small" />
      ) : (
        <MaterialCommunityIcons name={icon} size={21} color={colors.surface} />
      )}
    </Pressable>
  );
}

function roleLabel(role: StudyGroup['viewerRole']): string {
  if (role === 'owner') return 'Creador';
  if (role === 'admin') return 'Admin';
  return 'Miembro';
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerCopy: { flex: 1, minWidth: 0 },
  title: { color: colors.ink, fontSize: 27, fontWeight: '900' },
  subtitle: { marginTop: 3, color: colors.muted, fontSize: 12 },
  iconButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface },
  actionRow: { marginTop: spacing.xl, flexDirection: 'row', gap: spacing.sm },
  modeButton: { flex: 1, height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface },
  modeButtonActive: { borderColor: colors.ink, backgroundColor: colors.ink },
  modeLabel: { color: colors.ink, fontSize: 13, fontWeight: '900' },
  modeLabelActive: { color: colors.surface },
  usernameNotice: { minHeight: 52, marginTop: spacing.md, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface },
  usernameNoticeText: { flex: 1, color: colors.ink, fontSize: 12, fontWeight: '800' },
  formBand: { marginTop: spacing.md, flexDirection: 'row', gap: spacing.sm },
  input: { flex: 1, minWidth: 0, height: 46, paddingHorizontal: 13, color: colors.ink, fontSize: 14, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface },
  codeInput: { fontWeight: '900' },
  submitButton: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.aqua },
  error: { marginTop: spacing.md, color: colors.danger, fontSize: 12, lineHeight: 18 },
  sectionHeading: { marginTop: spacing.xl, marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: '900' },
  empty: { minHeight: 190, alignItems: 'center', justifyContent: 'center', gap: 8, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line },
  emptyTitle: { color: colors.ink, fontSize: 15, fontWeight: '900' },
  emptyText: { color: colors.muted, fontSize: 12 },
  groupList: { gap: spacing.sm },
  groupRow: { minHeight: 72, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface },
  groupIcon: { width: 45, height: 45, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.softAqua },
  groupCopy: { flex: 1, minWidth: 0 },
  groupName: { color: colors.ink, fontSize: 14, lineHeight: 19, fontWeight: '900' },
  groupMeta: { marginTop: 3, color: colors.muted, fontSize: 11 },
  codeBand: { marginHorizontal: -20, marginTop: spacing.xl, paddingHorizontal: 22, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, backgroundColor: colors.ink },
  codeLabel: { color: '#CBD1D6', fontSize: 9, fontWeight: '900' },
  codeValue: { marginTop: 3, color: colors.gold, fontSize: 24, fontWeight: '900' },
  roleBadge: { minHeight: 28, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: colors.softAqua },
  roleBadgeText: { color: colors.aqua, fontSize: 10, fontWeight: '900' },
  rankingList: { borderTopWidth: 1, borderTopColor: colors.line },
  memberRow: { minHeight: 66, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 9, borderBottomWidth: 1, borderBottomColor: colors.line },
  viewerRow: { backgroundColor: '#FFF8F4' },
  position: { width: 24, textAlign: 'center', color: colors.brand, fontSize: 15, fontWeight: '900' },
  avatar: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: colors.surface },
  memberNameRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  memberName: { color: colors.ink, fontSize: 13, fontWeight: '900' },
  memberRole: { color: colors.aqua, fontSize: 9, fontWeight: '900' },
  score: { color: colors.ink, fontSize: 12, fontWeight: '900' },
  leaveButton: { minHeight: 42, marginTop: spacing.xl, alignSelf: 'flex-start', paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: '#F3C7C7', borderRadius: radius.md, backgroundColor: '#FFF1F1' },
  leaveText: { color: colors.danger, fontSize: 12, fontWeight: '900' },
  pressed: { opacity: 0.76 },
  disabled: { opacity: 0.4 },
});
