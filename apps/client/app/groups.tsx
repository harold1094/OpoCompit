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

import { colors, radius, shadows, spacing } from '@/core/design/tokens';
import {
  StudyGroup,
  StudyGroupCompetition,
  StudyGroupCompetitionMetric,
  StudyGroupMember,
} from '@/core/domain/types';
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
  const createCompetition = useAppStore((state) => state.createStudyGroupCompetition);
  const leaveGroup = useAppStore((state) => state.leaveStudyGroup);
  const [form, setForm] = useState<GroupForm>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [competitionFormOpen, setCompetitionFormOpen] = useState(false);
  const [competitionName, setCompetitionName] = useState('Reto del grupo');
  const [competitionMetric, setCompetitionMetric] = useState<StudyGroupCompetitionMetric>('xp');
  const [competitionDays, setCompetitionDays] = useState(7);

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

  const submitCompetition = async () => {
    if (!activeGroup) return;
    const created = await createCompetition({
      groupId: activeGroup.id,
      name: competitionName,
      metric: competitionMetric,
      durationDays: competitionDays,
    });
    if (!created) return;
    setCompetitionFormOpen(false);
    setCompetitionName('Reto del grupo');
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  if (activeGroup) {
    const ownerCanDelete = activeGroup.viewerRole === 'owner' && activeGroup.memberCount === 1;
    const canLeave = activeGroup.viewerRole !== 'owner' || ownerCanDelete;
    const canManageCompetition = ['owner', 'admin'].includes(activeGroup.viewerRole);
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
        <CompetitionSection
          action={action}
          canManage={canManageCompetition}
          competition={activeGroup.competition}
          days={competitionDays}
          formOpen={competitionFormOpen}
          metric={competitionMetric}
          name={competitionName}
          onDaysChange={setCompetitionDays}
          onFormToggle={() => setCompetitionFormOpen((current) => !current)}
          onMetricChange={setCompetitionMetric}
          onNameChange={setCompetitionName}
          onRefresh={() => void openGroup(activeGroup.id)}
          onSubmit={() => void submitCompetition()}
        />
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Clasificación general</Text>
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

function CompetitionSection({
  action,
  canManage,
  competition,
  days,
  formOpen,
  metric,
  name,
  onDaysChange,
  onFormToggle,
  onMetricChange,
  onNameChange,
  onRefresh,
  onSubmit,
}: {
  action: 'create' | 'join' | 'leave' | 'competition' | null;
  canManage: boolean;
  competition: StudyGroupCompetition | null;
  days: number;
  formOpen: boolean;
  metric: StudyGroupCompetitionMetric;
  name: string;
  onDaysChange: (days: number) => void;
  onFormToggle: () => void;
  onMetricChange: (metric: StudyGroupCompetitionMetric) => void;
  onNameChange: (name: string) => void;
  onRefresh: () => void;
  onSubmit: () => void;
}) {
  const canCreate = !competition || competition.status === 'finished';
  return (
    <View>
      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>Competición</Text>
        {competition ? (
          <IconButton label="Actualizar clasificación" icon="refresh" onPress={onRefresh} />
        ) : null}
      </View>

      {competition ? (
        <View style={styles.competitionBand}>
          <View style={styles.competitionTitleRow}>
            <View style={styles.competitionIcon}>
              <MaterialCommunityIcons name="trophy-outline" size={22} color={colors.gold} />
            </View>
            <View style={styles.groupCopy}>
              <Text style={styles.competitionName} numberOfLines={2}>{competition.name}</Text>
              <Text style={styles.groupMeta}>
                {metricLabel(competition.metric)} · {formatCompetitionPeriod(competition)}
              </Text>
            </View>
            <View style={competition.status === 'active' ? styles.activeBadge : styles.finishedBadge}>
              <Text style={competition.status === 'active'
                ? styles.activeBadgeText
                : styles.finishedBadgeText}
              >
                {competition.status === 'active' ? 'EN CURSO' : 'FINALIZADA'}
              </Text>
            </View>
          </View>
          <View style={styles.competitionRanking}>
            {competition.entries.map((member) => (
              <MemberRow
                key={member.uid}
                member={member}
                scoreUnit={metricUnit(competition.metric)}
              />
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.competitionEmpty}>
          <MaterialCommunityIcons name="trophy-outline" size={30} color={colors.gold} />
          <Text style={styles.emptyTitle}>Sin competición activa</Text>
        </View>
      )}

      {canManage && canCreate ? (
        <Pressable
          accessibilityRole="button"
          onPress={onFormToggle}
          style={({ pressed }) => [styles.competitionToggle, pressed && styles.pressed]}
        >
          <MaterialCommunityIcons
            name={formOpen ? 'close' : 'trophy-award'}
            size={19}
            color={colors.ink}
          />
          <Text style={styles.competitionToggleText}>
            {formOpen ? 'Cerrar' : competition ? 'Nueva competición' : 'Crear competición'}
          </Text>
        </Pressable>
      ) : null}

      {canManage && canCreate && formOpen ? (
        <View style={styles.competitionForm}>
          <TextInput
            maxLength={40}
            onChangeText={onNameChange}
            placeholder="Reto de octubre"
            placeholderTextColor={colors.muted}
            style={[styles.input, styles.competitionInput]}
            value={name}
          />
          <Text style={styles.optionLabel}>MÉTRICA</Text>
          <View style={styles.optionGrid}>
            {(['xp', 'questions', 'correct', 'duels'] as const).map((option) => (
              <OptionButton
                active={metric === option}
                key={option}
                label={metricLabel(option)}
                onPress={() => onMetricChange(option)}
              />
            ))}
          </View>
          <Text style={styles.optionLabel}>DURACIÓN</Text>
          <View style={styles.durationRow}>
            {[7, 14, 30].map((option) => (
              <OptionButton
                active={days === option}
                compact
                key={option}
                label={`${option} días`}
                onPress={() => onDaysChange(option)}
              />
            ))}
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={action === 'competition'}
            onPress={onSubmit}
            style={({ pressed }) => [styles.competitionSubmit, pressed && styles.pressed]}
          >
            {action === 'competition' ? (
              <ActivityIndicator color={colors.surface} size="small" />
            ) : (
              <MaterialCommunityIcons name="flag-checkered" size={19} color={colors.surface} />
            )}
            <Text style={styles.competitionSubmitText}>Iniciar competición</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
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

function MemberRow({ member, scoreUnit = 'XP' }: {
  member: StudyGroupMember;
  scoreUnit?: string;
}) {
  return (
    <View style={[styles.memberRow, member.isViewer && styles.viewerRow]}>
      <Text style={styles.position}>{member.position}</Text>
      <View style={styles.avatar}>
        <MaterialCommunityIcons name="account-outline" size={21} color={colors.ink} />
      </View>
      <View style={styles.groupCopy}>
        <View style={styles.memberNameRow}>
          <Text style={styles.memberName} numberOfLines={1}>{member.username}</Text>
          {member.role !== 'member' ? <Text style={styles.memberRole}>{roleLabel(member.role)}</Text> : null}
        </View>
        <Text style={styles.groupMeta}>Nivel {member.level} · {member.territoryLabel}</Text>
      </View>
      <Text style={styles.score}>{member.score} {scoreUnit}</Text>
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

function metricLabel(metric: StudyGroupCompetitionMetric): string {
  if (metric === 'questions') return 'Preguntas';
  if (metric === 'correct') return 'Aciertos';
  if (metric === 'duels') return 'Duelos';
  return 'XP';
}

function metricUnit(metric: StudyGroupCompetitionMetric): string {
  if (metric === 'questions') return 'preg.';
  if (metric === 'correct') return 'aciertos';
  if (metric === 'duels') return 'duelos';
  return 'XP';
}

function formatCompetitionPeriod(competition: StudyGroupCompetition): string {
  const formatter = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' });
  return `${formatter.format(new Date(competition.startsAt))} - ${
    formatter.format(new Date(competition.endsAt))
  }`;
}

function OptionButton({ active, compact = false, label, onPress }: {
  active: boolean;
  compact?: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.optionButton,
        compact && styles.durationButton,
        active && styles.optionButtonActive,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.optionButtonText, active && styles.optionButtonTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerCopy: { flex: 1, minWidth: 0 },
  title: { color: colors.ink, fontSize: 27, fontWeight: '900' },
  subtitle: { marginTop: 3, color: colors.muted, fontSize: 12 },
  iconButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface, ...shadows.card },
  actionRow: { marginTop: spacing.xl, flexDirection: 'row', gap: spacing.sm },
  modeButton: { flex: 1, height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface, ...shadows.card },
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
  empty: { minHeight: 190, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: spacing.lg, borderRadius: radius.xl, backgroundColor: colors.surface, ...shadows.card },
  emptyTitle: { color: colors.ink, fontSize: 15, fontWeight: '900' },
  emptyText: { color: colors.muted, fontSize: 12 },
  groupList: { gap: spacing.sm },
  groupRow: { minHeight: 72, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, backgroundColor: colors.surface, ...shadows.card },
  groupIcon: { width: 45, height: 45, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.softAqua },
  groupCopy: { flex: 1, minWidth: 0 },
  groupName: { color: colors.ink, fontSize: 14, lineHeight: 19, fontWeight: '900' },
  groupMeta: { marginTop: 3, color: colors.muted, fontSize: 11 },
  codeBand: { marginTop: spacing.xl, paddingHorizontal: 22, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, backgroundColor: colors.navy, borderRadius: radius.lg, ...shadows.floating },
  codeLabel: { color: '#CBD1D6', fontSize: 9, fontWeight: '900' },
  codeValue: { marginTop: 3, color: colors.gold, fontSize: 24, fontWeight: '900' },
  roleBadge: { minHeight: 28, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: colors.softAqua },
  roleBadgeText: { color: colors.aqua, fontSize: 10, fontWeight: '900' },
  competitionBand: { paddingVertical: 4 },
  competitionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  competitionIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.softGold },
  competitionName: { color: colors.ink, fontSize: 15, lineHeight: 20, fontWeight: '900' },
  activeBadge: { minHeight: 26, paddingHorizontal: 9, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: colors.softAqua },
  activeBadgeText: { color: colors.aqua, fontSize: 9, fontWeight: '900' },
  finishedBadge: { minHeight: 26, paddingHorizontal: 9, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#EEF0F2' },
  finishedBadgeText: { color: colors.muted, fontSize: 9, fontWeight: '900' },
  competitionRanking: { marginTop: spacing.md, gap: spacing.sm },
  competitionEmpty: { minHeight: 112, alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: spacing.lg, borderRadius: radius.xl, backgroundColor: colors.surface, ...shadows.card },
  competitionToggle: { minHeight: 42, marginTop: spacing.md, alignSelf: 'flex-start', paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface, ...shadows.card },
  competitionToggleText: { color: colors.ink, fontSize: 12, fontWeight: '900' },
  competitionForm: { marginTop: spacing.md, paddingVertical: spacing.md, gap: spacing.sm, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line },
  competitionInput: { flex: 0, width: '100%' },
  optionLabel: { marginTop: spacing.xs, color: colors.muted, fontSize: 9, fontWeight: '900' },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  durationRow: { flexDirection: 'row', gap: spacing.sm },
  optionButton: { minWidth: 0, flexBasis: '47%', flexGrow: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface, ...shadows.card },
  durationButton: { flexBasis: 0 },
  optionButtonActive: { borderColor: colors.aqua, backgroundColor: colors.softAqua },
  optionButtonText: { color: colors.muted, fontSize: 11, fontWeight: '800' },
  optionButtonTextActive: { color: colors.aqua },
  competitionSubmit: { minHeight: 44, marginTop: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: radius.md, backgroundColor: colors.aqua, ...shadows.floating },
  competitionSubmitText: { color: colors.surface, fontSize: 12, fontWeight: '900' },
  rankingList: { gap: spacing.sm },
  memberRow: { minHeight: 66, paddingVertical: 9, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface, ...shadows.card },
  viewerRow: { backgroundColor: '#FFF8F4' },
  position: { width: 24, textAlign: 'center', color: colors.brand, fontSize: 15, fontWeight: '900' },
  avatar: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: colors.surface },
  memberNameRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  memberName: { maxWidth: '100%', color: colors.ink, fontSize: 13, fontWeight: '900' },
  memberRole: { color: colors.aqua, fontSize: 9, fontWeight: '900' },
  score: { maxWidth: 92, textAlign: 'right', color: colors.ink, fontSize: 12, fontWeight: '900' },
  leaveButton: { minHeight: 42, marginTop: spacing.xl, alignSelf: 'flex-start', paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: '#F3C7C7', borderRadius: radius.md, backgroundColor: '#FFF1F1' },
  leaveText: { color: colors.danger, fontSize: 12, fontWeight: '900' },
  pressed: { opacity: 0.76 },
  disabled: { opacity: 0.4 },
});
