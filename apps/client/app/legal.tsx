import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, type Href, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { ComponentProps, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/core/design/tokens';
import { legalConfig, supportContactUrl } from '@/features/legal/legalConfig';
import {
  LegalDocumentKey,
  legalDocuments,
  legalVersion,
} from '@/features/legal/legalContent';
import { AppScreen } from '@/shared/components/AppScreen';

type TabKey = LegalDocumentKey | 'support';
type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

const tabs: Array<{key: TabKey; label: string}> = [
  {key: 'privacy', label: 'Privacidad'},
  {key: 'terms', label: 'Términos'},
  {key: 'support', label: 'Soporte'},
];

export default function LegalScreen() {
  const {section} = useLocalSearchParams<{section?: string}>();
  const initialTab = tabs.some((tab) => tab.key === section) ? section as TabKey : 'privacy';
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [linkError, setLinkError] = useState<string | null>(null);

  const openExternal = async (url: string | null) => {
    if (!url) return;
    setLinkError(null);
    try {
      await Linking.openURL(url);
    } catch {
      setLinkError('No se pudo abrir el enlace. Inténtalo de nuevo más tarde.');
    }
  };

  return (
    <AppScreen>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Volver"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={({pressed}) => [styles.iconButton, pressed && styles.pressed]}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.ink} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Legal y soporte</Text>
          <Text style={styles.subtitle}>Versión {legalVersion}</Text>
        </View>
      </View>

      <View accessibilityRole="tablist" style={styles.tabs}>
        {tabs.map((tab) => {
          const selected = activeTab === tab.key;
          return (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{selected}}
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={({pressed}) => [
                styles.tab,
                selected && styles.selectedTab,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.tabLabel, selected && styles.selectedTabLabel]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {activeTab === 'support' ? (
        <SupportContent
          linkError={linkError}
          onOpenExternal={(url) => void openExternal(url)}
        />
      ) : (
        <LegalContent documentKey={activeTab} onOpenExternal={(url) => void openExternal(url)} />
      )}
    </AppScreen>
  );
}

function LegalContent({
  documentKey,
  onOpenExternal,
}: {
  documentKey: LegalDocumentKey;
  onOpenExternal: (url: string) => void;
}) {
  const document = legalDocuments[documentKey];
  const publicUrl = documentKey === 'privacy' ? legalConfig.privacyUrl : legalConfig.termsUrl;

  return (
    <View style={styles.document}>
      <Text style={styles.documentTitle}>{document.title}</Text>
      <Text style={styles.documentSummary}>{document.summary}</Text>
      {publicUrl ? (
        <Pressable
          accessibilityRole="link"
          onPress={() => onOpenExternal(publicUrl)}
          style={({pressed}) => [styles.publicLink, pressed && styles.pressed]}
        >
          <MaterialCommunityIcons name="open-in-new" size={18} color={colors.aqua} />
          <Text style={styles.publicLinkText}>Abrir versión pública</Text>
        </Pressable>
      ) : null}
      {document.sections.map((section) => (
        <View key={section.title} style={styles.legalSection}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          {section.paragraphs.map((paragraph) => (
            <Text key={paragraph} style={styles.paragraph}>{paragraph}</Text>
          ))}
          {section.bullets?.map((bullet) => (
            <View key={bullet} style={styles.bulletRow}>
              <View style={styles.bullet} />
              <Text style={styles.bulletText}>{bullet}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function SupportContent({
  linkError,
  onOpenExternal,
}: {
  linkError: string | null;
  onOpenExternal: (url: string | null) => void;
}) {
  const contactUrl = supportContactUrl();

  return (
    <View style={styles.document}>
      <Text style={styles.documentTitle}>Soporte</Text>
      <Text style={styles.documentSummary}>
        Ayuda con tu cuenta, datos, preguntas o funcionamiento de OpoCompit.
      </Text>

      <SupportRow
        description={contactUrl
          ? legalConfig.supportEmail ?? 'Formulario de soporte de OpoCompit'
          : 'El canal definitivo se configurará antes de publicar la app.'}
        disabled={!contactUrl}
        icon="lifebuoy"
        label={contactUrl ? 'Contactar con soporte' : 'Contacto pendiente'}
        onPress={() => onOpenExternal(contactUrl)}
      />
      <SupportRow
        description="Gestiona el acceso o elimina permanentemente tu cuenta y datos."
        icon="shield-account-outline"
        label="Cuenta y eliminación"
        onPress={() => router.push('/settings')}
      />
      <SupportRow
        description="Instrucciones disponibles también fuera de la sesión de la app."
        icon="delete-outline"
        label="Ruta pública de eliminación"
        onPress={() => router.push('/data-deletion' as Href)}
      />

      {linkError ? <Text style={styles.error}>{linkError}</Text> : null}

      <View style={styles.supportNote}>
        <MaterialCommunityIcons name="lock-outline" size={20} color={colors.aqua} />
        <Text style={styles.supportNoteText}>
          Nunca envíes contraseñas, códigos de acceso ni respuestas de recuperación.
        </Text>
      </View>

      <Text style={styles.owner}>Responsable: {legalConfig.owner}</Text>
    </View>
  );
}

function SupportRow({
  description,
  disabled = false,
  icon,
  label,
  onPress,
}: {
  description: string;
  disabled?: boolean;
  icon: IconName;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({pressed}) => [
        styles.supportRow,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.supportIcon}>
        <MaterialCommunityIcons name={icon} size={22} color={colors.aqua} />
      </View>
      <View style={styles.supportCopy}>
        <Text style={styles.supportLabel}>{label}</Text>
        <Text style={styles.supportDescription}>{description}</Text>
      </View>
      {!disabled ? <MaterialCommunityIcons name="chevron-right" size={22} color={colors.muted} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: spacing.lg},
  iconButton: {width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface},
  pressed: {opacity: 0.76},
  headerCopy: {flex: 1},
  title: {color: colors.ink, fontSize: 25, fontWeight: '900'},
  subtitle: {color: colors.muted, fontSize: 12, marginTop: 2},
  tabs: {height: 44, flexDirection: 'row', padding: 3, borderRadius: radius.md, backgroundColor: colors.field},
  tab: {flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm},
  selectedTab: {backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line},
  tabLabel: {color: colors.muted, fontSize: 12, fontWeight: '800'},
  selectedTabLabel: {color: colors.ink},
  document: {paddingBottom: spacing.xl},
  documentTitle: {color: colors.ink, fontSize: 21, fontWeight: '900', marginTop: spacing.xl},
  documentSummary: {color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: spacing.xs},
  publicLink: {minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, alignSelf: 'flex-start', marginTop: spacing.md},
  publicLinkText: {color: colors.aqua, fontSize: 13, fontWeight: '900'},
  legalSection: {paddingTop: spacing.lg, marginTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.line},
  sectionTitle: {color: colors.ink, fontSize: 15, fontWeight: '900', marginBottom: spacing.sm},
  paragraph: {color: colors.muted, fontSize: 13, lineHeight: 21, marginBottom: spacing.sm},
  bulletRow: {flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: spacing.sm},
  bullet: {width: 6, height: 6, borderRadius: 3, backgroundColor: colors.aqua, marginTop: 7},
  bulletText: {flex: 1, color: colors.muted, fontSize: 13, lineHeight: 20},
  supportRow: {minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: spacing.md, padding: spacing.md, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface},
  supportIcon: {width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.softAqua},
  supportCopy: {flex: 1, minWidth: 0},
  supportLabel: {color: colors.ink, fontSize: 14, fontWeight: '900'},
  supportDescription: {color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 3},
  disabled: {opacity: 0.58},
  error: {color: colors.danger, fontSize: 12, lineHeight: 18, marginTop: spacing.md},
  supportNote: {flexDirection: 'row', gap: 10, marginTop: spacing.xl, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.softAqua},
  supportNoteText: {flex: 1, color: colors.muted, fontSize: 12, lineHeight: 18},
  owner: {color: colors.muted, fontSize: 11, marginTop: spacing.lg, textAlign: 'center'},
});
