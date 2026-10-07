import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/core/design/tokens';
import { deletionRequestUrl, legalConfig } from '@/features/legal/legalConfig';
import { AppScreen } from '@/shared/components/AppScreen';
import { PrimaryButton } from '@/shared/components/PrimaryButton';

export default function DataDeletionScreen() {
  const [linkError, setLinkError] = useState<string | null>(null);
  const requestUrl = deletionRequestUrl();

  const openRequest = async () => {
    if (!requestUrl) return;
    setLinkError(null);
    try {
      await Linking.openURL(requestUrl);
    } catch {
      setLinkError('No se pudo abrir el canal de soporte. Inténtalo de nuevo más tarde.');
    }
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
          <Text style={styles.title}>Eliminar cuenta</Text>
          <Text style={styles.subtitle}>OpoCompit</Text>
        </View>
      </View>

      <View style={styles.notice}>
        <MaterialCommunityIcons name="delete-outline" size={26} color={colors.brand} />
        <View style={styles.noticeCopy}>
          <Text style={styles.noticeTitle}>Tú controlas tus datos</Text>
          <Text style={styles.noticeText}>
            Puedes eliminar tu cuenta y la información asociada desde la aplicación o solicitar ayuda sin iniciar sesión.
          </Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Desde la aplicación</Text>
      <Step number="1" text="Abre Perfil y entra en Ajustes y privacidad." />
      <Step number="2" text="Busca Eliminar cuenta y datos." />
      <Step number="3" text="Escribe ELIMINAR y confirma la acción." />

      <Text style={styles.sectionTitle}>Qué se elimina</Text>
      <Text style={styles.body}>
        Se eliminan la identidad de acceso, perfil, progreso, estadísticas privadas, inventario, preferencias y relaciones sociales. Los resultados competitivos y reportes que deban conservar la integridad del servicio se anonimizan.
      </Text>

      <Text style={styles.sectionTitle}>Solicitud externa</Text>
      <Text style={styles.body}>
        Si ya no tienes acceso a la aplicación, utiliza el canal de soporte y escribe el correo asociado a tu cuenta. Nunca incluyas contraseñas ni códigos de acceso.
      </Text>
      <View style={styles.action}>
        <PrimaryButton
          disabled={!requestUrl}
          icon="email-outline"
          label={requestUrl ? 'Solicitar eliminación' : 'Canal pendiente de publicación'}
          onPress={() => void openRequest()}
        />
      </View>
      {linkError ? <Text style={styles.error}>{linkError}</Text> : null}

      <Text style={styles.owner}>Responsable: {legalConfig.owner}</Text>
    </AppScreen>
  );
}

function Step({number, text}: {number: string; text: string}) {
  return (
    <View style={styles.step}>
      <View style={styles.stepNumber}><Text style={styles.stepNumberText}>{number}</Text></View>
      <Text style={styles.stepText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: spacing.lg},
  backButton: {width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface},
  pressed: {opacity: 0.76},
  headerCopy: {flex: 1},
  title: {color: colors.ink, fontSize: 25, fontWeight: '900'},
  subtitle: {color: colors.muted, fontSize: 12, marginTop: 2},
  notice: {flexDirection: 'row', gap: 12, padding: spacing.lg, borderRadius: radius.md, backgroundColor: colors.softBrand},
  noticeCopy: {flex: 1},
  noticeTitle: {color: colors.ink, fontSize: 16, fontWeight: '900'},
  noticeText: {color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: spacing.xs},
  sectionTitle: {color: colors.ink, fontSize: 16, fontWeight: '900', marginTop: spacing.xl, marginBottom: spacing.sm},
  step: {minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: colors.line},
  stepNumber: {width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, backgroundColor: colors.softAqua},
  stepNumberText: {color: colors.aqua, fontSize: 12, fontWeight: '900'},
  stepText: {flex: 1, color: colors.muted, fontSize: 13, lineHeight: 19},
  body: {color: colors.muted, fontSize: 13, lineHeight: 21},
  action: {marginTop: spacing.lg},
  error: {color: colors.danger, fontSize: 12, lineHeight: 18, marginTop: spacing.md},
  owner: {color: colors.muted, fontSize: 11, marginTop: spacing.xl, marginBottom: spacing.lg, textAlign: 'center'},
});
