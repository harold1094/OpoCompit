import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Redirect, router, useFocusEffect, type Href } from 'expo-router';
import { ComponentProps, useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { colors, radius, spacing } from '@/core/design/tokens';
import { UserPreferences } from '@/core/domain/types';
import { useAppStore } from '@/features/app-state/useAppStore';
import { AppScreen } from '@/shared/components/AppScreen';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export default function SettingsScreen() {
  const hydrated = useAppStore((state) => state.hydrated);
  const profile = useAppStore((state) => state.profile);
  const backendMode = useAppStore((state) => state.backendMode);
  const preferences = useAppStore((state) => state.preferences);
  const loading = useAppStore((state) => state.isLoadingPreferences);
  const saving = useAppStore((state) => state.isSavingPreferences);
  const deleting = useAppStore((state) => state.isAccountLoading);
  const preferencesError = useAppStore((state) => state.preferencesError);
  const accountError = useAppStore((state) => state.accountError);
  const loadPreferences = useAppStore((state) => state.loadPreferences);
  const updatePreferences = useAppStore((state) => state.updatePreferences);
  const deleteAccount = useAppStore((state) => state.deleteAccount);
  const clearAccountError = useAppStore((state) => state.clearAccountError);
  const [confirmingDeletion, setConfirmingDeletion] = useState(false);
  const [confirmation, setConfirmation] = useState('');

  useFocusEffect(useCallback(() => {
    clearAccountError();
    void loadPreferences();
  }, [clearAccountError, loadPreferences]));

  if (!hydrated) return null;
  if (!profile) return <Redirect href="/onboarding" />;

  const toggle = (key: keyof UserPreferences) => {
    void updatePreferences({[key]: !preferences[key]});
  };
  const confirmDelete = async () => {
    if (confirmation !== 'ELIMINAR') return;
    if (await deleteAccount()) router.replace('/onboarding');
  };

  return (
    <AppScreen>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Volver"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={({pressed}) => [styles.backButton, pressed && styles.pressed]}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.ink} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Ajustes</Text>
          <Text style={styles.subtitle}>{loading ? 'Sincronizando preferencias' : 'Privacidad y experiencia'}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Experiencia</Text>
      <View style={styles.section}>
        <SettingRow
          description="Respuesta táctil al jugar y completar acciones."
          disabled={saving}
          icon="vibrate"
          label="Vibración"
          onChange={() => toggle('hapticsEnabled')}
          value={preferences.hapticsEnabled}
        />
      </View>

      <Text style={styles.sectionTitle}>Avisos dentro de la app</Text>
      <View style={styles.section}>
        <SettingRow
          description="Solicitudes y nuevas amistades."
          disabled={saving}
          icon="account-multiple-outline"
          label="Actividad social"
          onChange={() => toggle('socialNotificationsEnabled')}
          value={preferences.socialNotificationsEnabled}
        />
        <SettingRow
          description="Retos, aceptación y resultados."
          disabled={saving}
          icon="sword-cross"
          label="Duelos"
          onChange={() => toggle('duelNotificationsEnabled')}
          value={preferences.duelNotificationsEnabled}
        />
        <SettingRow
          description="Hitos y recompensas desbloqueadas."
          disabled={saving}
          icon="trophy-outline"
          label="Logros"
          onChange={() => toggle('achievementNotificationsEnabled')}
          value={preferences.achievementNotificationsEnabled}
          last
        />
      </View>

      <Text style={styles.sectionTitle}>Privacidad</Text>
      <View style={styles.section}>
        <SettingRow
          description="Comparte métricas técnicas anónimas para mejorar OpoCompit."
          disabled={saving}
          icon="chart-box-outline"
          label="Analítica de uso"
          onChange={() => toggle('analyticsEnabled')}
          value={preferences.analyticsEnabled}
          last
        />
      </View>
      {preferencesError ? <Text style={styles.error}>{preferencesError}</Text> : null}

      <Text style={styles.sectionTitle}>Cuenta y datos</Text>
      <View style={styles.section}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/account')}
          style={({pressed}) => [styles.navigationRow, pressed && styles.pressed]}
        >
          <MaterialCommunityIcons name="shield-account-outline" size={22} color={colors.aqua} />
          <View style={styles.rowCopy}>
            <Text style={styles.rowLabel}>Cuenta y acceso</Text>
            <Text style={styles.rowDescription}>
              {profile.isGuest
                ? 'Protege tu identidad con una cuenta.'
                : backendMode === 'firebase'
                  ? 'Sesión y recuperación de acceso.'
                  : 'Identidad vinculada; datos guardados en este dispositivo.'}
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color={colors.muted} />
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>Información y ayuda</Text>
      <View style={styles.section}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/legal' as Href)}
          style={({pressed}) => [styles.navigationRow, pressed && styles.pressed]}
        >
          <MaterialCommunityIcons name="file-document-outline" size={22} color={colors.aqua} />
          <View style={styles.rowCopy}>
            <Text style={styles.rowLabel}>Legal y soporte</Text>
            <Text style={styles.rowDescription}>
              Privacidad, términos, contacto y eliminación de datos.
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color={colors.muted} />
        </Pressable>
      </View>

      <View style={styles.dangerSection}>
        <Text style={styles.dangerTitle}>Eliminar cuenta y datos</Text>
        <Text style={styles.dangerText}>
          Se borrarán permanentemente tu perfil, progreso, inventario y relaciones sociales.
          Esta acción no se puede deshacer.
        </Text>
        {!confirmingDeletion ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setConfirmingDeletion(true)}
            style={({pressed}) => [styles.deleteButton, pressed && styles.pressed]}
          >
            <MaterialCommunityIcons name="delete-outline" size={20} color={colors.danger} />
            <Text style={styles.deleteButtonText}>Eliminar mi cuenta</Text>
          </Pressable>
        ) : (
          <View style={styles.confirmation}>
            <Text style={styles.confirmationLabel}>Escribe ELIMINAR para confirmar</Text>
            <TextInput
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!deleting}
              onChangeText={setConfirmation}
              placeholder="ELIMINAR"
              placeholderTextColor={colors.muted}
              style={styles.input}
              value={confirmation}
            />
            {accountError ? <Text style={styles.error}>{accountError}</Text> : null}
            <View style={styles.confirmationActions}>
              <Pressable
                disabled={deleting}
                onPress={() => {
                  clearAccountError();
                  setConfirmation('');
                  setConfirmingDeletion(false);
                }}
                style={({pressed}) => [styles.cancelButton, pressed && styles.pressed]}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={confirmation !== 'ELIMINAR' || deleting}
                onPress={() => void confirmDelete()}
                style={({pressed}) => [
                  styles.confirmDeleteButton,
                  (confirmation !== 'ELIMINAR' || deleting) && styles.disabled,
                  pressed && styles.pressed,
                ]}
              >
                {deleting ? <ActivityIndicator color={colors.surface} /> : (
                  <Text style={styles.confirmDeleteText}>Eliminar definitivamente</Text>
                )}
              </Pressable>
            </View>
          </View>
        )}
        <Text style={styles.storageNote}>
          {backendMode === 'firebase' ? 'Datos sincronizados con Firebase.' : 'Datos guardados en este dispositivo.'}
        </Text>
      </View>
    </AppScreen>
  );
}

function SettingRow({
  description,
  disabled,
  icon,
  label,
  last = false,
  onChange,
  value,
}: {
  description: string;
  disabled: boolean;
  icon: IconName;
  label: string;
  last?: boolean;
  onChange: () => void;
  value: boolean;
}) {
  return (
    <View style={[styles.settingRow, last && styles.lastRow]}>
      <MaterialCommunityIcons name={icon} size={22} color={colors.ink} />
      <View style={styles.rowCopy}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowDescription}>{description}</Text>
      </View>
      <Switch
        accessibilityLabel={label}
        disabled={disabled}
        onValueChange={onChange}
        thumbColor={colors.surface}
        trackColor={{false: colors.line, true: colors.aqua}}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: spacing.md},
  backButton: {width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface},
  pressed: {opacity: 0.76},
  headerCopy: {flex: 1},
  title: {color: colors.ink, fontSize: 25, fontWeight: '900'},
  subtitle: {color: colors.muted, fontSize: 13, marginTop: 2},
  sectionTitle: {color: colors.ink, fontSize: 15, fontWeight: '900', marginTop: spacing.lg, marginBottom: spacing.sm},
  section: {borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface, overflow: 'hidden'},
  settingRow: {minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.line},
  lastRow: {borderBottomWidth: 0},
  rowCopy: {flex: 1, minWidth: 0},
  rowLabel: {color: colors.ink, fontSize: 14, fontWeight: '900'},
  rowDescription: {color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 3},
  navigationRow: {minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: spacing.md},
  error: {color: colors.danger, fontSize: 12, lineHeight: 18, marginTop: spacing.sm},
  dangerSection: {marginTop: spacing.xl, marginBottom: spacing.xl, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.line},
  dangerTitle: {color: colors.danger, fontSize: 16, fontWeight: '900'},
  dangerText: {color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: spacing.sm},
  deleteButton: {minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.md, borderWidth: 1, borderColor: colors.danger, borderRadius: radius.md, backgroundColor: colors.surface},
  deleteButtonText: {color: colors.danger, fontSize: 14, fontWeight: '900'},
  confirmation: {gap: spacing.sm, marginTop: spacing.md},
  confirmationLabel: {color: colors.ink, fontSize: 12, fontWeight: '800'},
  input: {minHeight: 50, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.danger, borderRadius: radius.md, backgroundColor: colors.surface, color: colors.ink, fontSize: 15, fontWeight: '800'},
  confirmationActions: {flexDirection: 'row', gap: spacing.sm},
  cancelButton: {minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface},
  cancelText: {color: colors.ink, fontSize: 13, fontWeight: '900'},
  confirmDeleteButton: {flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: colors.danger},
  confirmDeleteText: {color: colors.surface, fontSize: 13, fontWeight: '900', textAlign: 'center'},
  disabled: {opacity: 0.4},
  storageNote: {color: colors.muted, fontSize: 10, marginTop: spacing.md, textAlign: 'center'},
});
