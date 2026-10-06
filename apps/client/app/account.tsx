import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { colors, radius, spacing } from '@/core/design/tokens';
import { useAppStore } from '@/features/app-state/useAppStore';
import { AppScreen } from '@/shared/components/AppScreen';
import { PrimaryButton } from '@/shared/components/PrimaryButton';

export default function AccountScreen() {
  const profile = useAppStore((state) => state.profile);
  const backendMode = useAppStore((state) => state.backendMode);
  const loading = useAppStore((state) => state.isAccountLoading);
  const remoteError = useAppStore((state) => state.accountError);
  const linkEmail = useAppStore((state) => state.linkEmailAccount);
  const linkGoogle = useAppStore((state) => state.linkGoogleAccount);
  const signInEmail = useAppStore((state) => state.signInEmailAccount);
  const signInGoogle = useAppStore((state) => state.signInGoogleAccount);
  const resetPassword = useAppStore((state) => state.sendAccountPasswordReset);
  const signOut = useAppStore((state) => state.signOutAccount);
  const clearError = useAppStore((state) => state.clearAccountError);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isLinked = Boolean(profile && !profile.isGuest);
  const isLinking = Boolean(profile?.isGuest);
  const firebaseAvailable = backendMode === 'firebase' || !profile;
  const googleAvailable = Platform.OS === 'web' || (
    Platform.OS === 'android'
    && Boolean(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim())
  );
  const error = localError ?? remoteError;
  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  const validate = (confirmPassword: boolean) => {
    clearError();
    setNotice(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setLocalError('Introduce un correo electrónico válido.');
      return false;
    }
    if (password.length < 6) {
      setLocalError('La contraseña debe tener al menos 6 caracteres.');
      return false;
    }
    if (confirmPassword && password !== confirmation) {
      setLocalError('Las contraseñas no coinciden.');
      return false;
    }
    setLocalError(null);
    return true;
  };

  const submitEmail = async () => {
    if (!validate(isLinking)) return;
    const succeeded = isLinking
      ? await linkEmail(normalizedEmail, password)
      : await signInEmail(normalizedEmail, password);
    if (succeeded) router.replace('/(tabs)/profile');
  };

  const submitGoogle = async () => {
    clearError();
    setLocalError(null);
    setNotice(null);
    const succeeded = isLinking ? await linkGoogle() : await signInGoogle();
    if (succeeded) router.replace('/(tabs)/profile');
  };

  const recoverPassword = async () => {
    clearError();
    setLocalError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setLocalError('Escribe primero el correo de tu cuenta.');
      return;
    }
    if (await resetPassword(normalizedEmail)) {
      setNotice('Revisa tu correo para crear una contraseña nueva.');
    }
  };

  const exitAccount = async () => {
    if (await signOut()) router.replace('/onboarding');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.keyboard}
    >
      <AppScreen>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Volver"
            accessibilityRole="button"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <MaterialCommunityIcons name="arrow-left" size={22} color={colors.ink} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Cuenta</Text>
            <Text style={styles.subtitle}>
              {isLinked ? 'Sesión sincronizada' : isLinking ? 'Protege tu progreso' : 'Recupera tu progreso'}
            </Text>
          </View>
        </View>

        {isLinked ? (
          <View style={styles.connectedSection}>
            <View style={styles.connectedIcon}>
              <MaterialCommunityIcons name="shield-check" size={34} color={colors.success} />
            </View>
            <Text style={styles.connectedTitle}>Cuenta vinculada</Text>
            <Text style={styles.connectedText}>
              Tu progreso está asociado a una cuenta permanente y podrás recuperarlo al iniciar sesión.
            </Text>
            <PrimaryButton
              icon="logout"
              label="Cerrar sesión"
              loading={loading}
              onPress={() => void exitAccount()}
              variant="secondary"
            />
          </View>
        ) : (
          <>
            {isLinking ? (
              <View style={styles.preserveBand}>
                <MaterialCommunityIcons name="database-lock-outline" size={24} color={colors.aqua} />
                <View style={styles.preserveCopy}>
                  <Text style={styles.preserveTitle}>Mantendrás todos tus datos</Text>
                  <Text style={styles.preserveText}>
                    Nivel {profile?.level}, {profile?.xp} XP, monedas, estadísticas, amigos e inventario.
                  </Text>
                </View>
              </View>
            ) : null}

            <View style={styles.form}>
              <Text style={styles.label}>Correo electrónico</Text>
              <TextInput
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                keyboardType="email-address"
                onChangeText={setEmail}
                placeholder="tu@correo.com"
                placeholderTextColor={colors.muted}
                style={styles.input}
                value={email}
              />
              <Text style={styles.label}>Contraseña</Text>
              <TextInput
                autoCapitalize="none"
                autoComplete={isLinking ? 'new-password' : 'current-password'}
                onChangeText={setPassword}
                onSubmitEditing={() => !isLinking && void submitEmail()}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor={colors.muted}
                secureTextEntry
                style={styles.input}
                value={password}
              />
              {isLinking ? (
                <>
                  <Text style={styles.label}>Repite la contraseña</Text>
                  <TextInput
                    autoCapitalize="none"
                    autoComplete="new-password"
                    onChangeText={setConfirmation}
                    onSubmitEditing={() => void submitEmail()}
                    placeholder="Repite la contraseña"
                    placeholderTextColor={colors.muted}
                    secureTextEntry
                    style={styles.input}
                    value={confirmation}
                  />
                </>
              ) : null}
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}
            {notice ? <Text style={styles.notice}>{notice}</Text> : null}

            <View style={styles.actions}>
              <PrimaryButton
                icon={isLinking ? 'account-lock-outline' : 'login'}
                label={isLinking ? 'Crear cuenta y conservar progreso' : 'Iniciar sesión'}
                loading={loading}
                onPress={() => void submitEmail()}
              />
              <PrimaryButton
                icon="google"
                label="Continuar con Google"
                disabled={!firebaseAvailable || !googleAvailable}
                loading={loading}
                onPress={() => void submitGoogle()}
                variant="secondary"
              />
              {!isLinking ? (
                <Pressable
                  accessibilityRole="button"
                  disabled={loading}
                  onPress={() => void recoverPassword()}
                  style={({ pressed }) => [styles.recoveryButton, pressed && styles.pressed]}
                >
                  <Text style={styles.recoveryText}>He olvidado mi contraseña</Text>
                </Pressable>
              ) : null}
            </View>
          </>
        )}
      </AppScreen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboard: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: spacing.xl },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  pressed: { opacity: 0.76 },
  headerCopy: { flex: 1 },
  title: { color: colors.ink, fontSize: 25, fontWeight: '900' },
  subtitle: { color: colors.muted, fontSize: 13, marginTop: 2 },
  preserveBand: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: spacing.md, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line },
  preserveCopy: { flex: 1 },
  preserveTitle: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  preserveText: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 3 },
  form: { gap: spacing.sm, marginTop: spacing.xl },
  label: { color: colors.ink, fontSize: 12, fontWeight: '800', marginTop: spacing.sm },
  input: { minHeight: 50, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface, color: colors.ink, fontSize: 15, paddingHorizontal: spacing.md },
  actions: { gap: spacing.sm, marginTop: spacing.lg },
  recoveryButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  recoveryText: { color: colors.aqua, fontSize: 13, fontWeight: '900' },
  error: { color: colors.danger, fontSize: 13, lineHeight: 19, marginTop: spacing.md },
  notice: { color: colors.success, fontSize: 13, lineHeight: 19, marginTop: spacing.md },
  connectedSection: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
  connectedIcon: { width: 70, height: 70, borderRadius: 35, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.softAqua },
  connectedTitle: { color: colors.ink, fontSize: 22, fontWeight: '900' },
  connectedText: { maxWidth: 430, color: colors.muted, fontSize: 14, lineHeight: 21, textAlign: 'center', marginBottom: spacing.sm },
});
