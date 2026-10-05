import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, radius, shadows, spacing } from '@/core/design/tokens';
import {
  AdminQuestionReport,
  getQuestionReportsQueueRemote,
  QuestionReportResolution,
  readableFirebaseError,
  resolveQuestionReportRemote,
} from '@/core/firebase/firebaseClient';

const reasonLabels: Record<AdminQuestionReport['reason'], string> = {
  incorrect_question: 'Pregunta incorrecta',
  incorrect_answer: 'Respuesta incorrecta',
  outdated: 'Desactualizada',
  incorrect_explanation: 'Explicación incorrecta',
  other: 'Otro motivo',
};

export function AdminQuestionReportsPanel() {
  const [reports, setReports] = useState<AdminQuestionReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setReports(await getQuestionReportsQueueRemote());
    } catch (loadError) {
      setError(readableFirebaseError(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const resolve = async (report: AdminQuestionReport, resolution: QuestionReportResolution) => {
    if (resolvingId) return;
    setResolvingId(report.id);
    setError(null);
    setNotice(null);
    try {
      await resolveQuestionReportRemote(report.id, resolution);
      setReports((current) => current.filter((item) => item.id !== report.id));
      setNotice(resolution === 'dismiss'
        ? 'Reporte descartado.'
        : resolution === 'mark_outdated'
          ? 'Pregunta retirada del entrenamiento actual y conservada en el histórico.'
          : 'Pregunta desactivada completamente.');
    } catch (resolveError) {
      setError(readableFirebaseError(resolveError));
    } finally {
      setResolvingId(null);
    }
  };

  const confirm = (report: AdminQuestionReport, resolution: QuestionReportResolution) => {
    const outdated = resolution === 'mark_outdated';
    Alert.alert(
      outdated ? 'Retirar del entrenamiento' : 'Desactivar pregunta',
      outdated
        ? 'Dejará de aparecer en prácticas nuevas, pero seguirá disponible en su examen oficial histórico.'
        : 'La pregunta dejará de estar disponible también para los exámenes históricos.',
      [
        {text: 'Cancelar', style: 'cancel'},
        {
          text: outdated ? 'Retirar' : 'Desactivar',
          style: resolution === 'disable_question' ? 'destructive' : 'default',
          onPress: () => void resolve(report, resolution),
        },
      ],
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>CALIDAD DEL CONTENIDO</Text>
          <Text style={styles.title}>Reportes de usuarios</Text>
          <Text style={styles.subtitle}>Revisa cada aviso antes de retirar contenido del entrenamiento.</Text>
        </View>
        <Pressable
          accessibilityLabel="Actualizar reportes"
          disabled={loading}
          onPress={() => void load()}
          style={({pressed}) => [styles.refresh, pressed && styles.pressed]}
        >
          <MaterialCommunityIcons name="refresh" size={19} color={colors.ink} />
          <Text style={styles.refreshText}>Actualizar</Text>
        </Pressable>
      </View>

      {error || notice ? (
        <View style={[styles.message, error ? styles.errorMessage : styles.noticeMessage]}>
          <MaterialCommunityIcons
            name={error ? 'alert-circle-outline' : 'check-circle-outline'}
            size={19}
            color={error ? colors.danger : colors.success}
          />
          <Text style={[styles.messageText, {color: error ? colors.danger : colors.success}]}>
            {error ?? notice}
          </Text>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.state}>
          <ActivityIndicator color={colors.brand} />
          <Text style={styles.stateText}>Cargando reportes…</Text>
        </View>
      ) : reports.length === 0 ? (
        <View style={styles.state}>
          <MaterialCommunityIcons name="check-decagram-outline" size={42} color={colors.aqua} />
          <Text style={styles.stateTitle}>Sin reportes pendientes</Text>
          <Text style={styles.stateText}>La cola de calidad está al día.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {reports.map((report) => {
            const resolving = resolvingId === report.id;
            return (
              <View key={report.id} style={styles.report}>
                <View style={styles.reportTop}>
                  <View style={styles.reasonBadge}>
                    <MaterialCommunityIcons name="flag-outline" size={16} color={colors.brand} />
                    <Text style={styles.reasonText}>{reasonLabels[report.reason]}</Text>
                  </View>
                  <Text style={styles.date}>{formatDate(report.updatedAt)}</Text>
                </View>
                <Text style={styles.statement}>{report.question.statement}</Text>
                {report.detail ? <Text style={styles.detail}>{report.detail}</Text> : null}
                <View style={styles.metadata}>
                  <Text style={styles.metaText}>{report.question.categoryId}</Text>
                  <Text style={styles.metaText}>{report.question.source}</Text>
                  {report.question.officialExamId ? (
                    <Text style={styles.historical}>Examen histórico</Text>
                  ) : null}
                </View>
                <View style={styles.actions}>
                  <ReportAction
                    disabled={resolvingId !== null}
                    icon="close-circle-outline"
                    label="Descartar"
                    loading={resolving}
                    onPress={() => void resolve(report, 'dismiss')}
                    tone="neutral"
                  />
                  <ReportAction
                    disabled={resolvingId !== null}
                    icon="calendar-remove-outline"
                    label="Retirar del entrenamiento"
                    onPress={() => confirm(report, 'mark_outdated')}
                    tone="warning"
                  />
                  <ReportAction
                    disabled={resolvingId !== null}
                    icon="delete-alert-outline"
                    label="Desactivar"
                    onPress={() => confirm(report, 'disable_question')}
                    tone="danger"
                  />
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

function ReportAction({disabled, icon, label, loading = false, onPress, tone}: {
  disabled: boolean;
  icon: 'close-circle-outline' | 'calendar-remove-outline' | 'delete-alert-outline';
  label: string;
  loading?: boolean;
  onPress: () => void;
  tone: 'neutral' | 'warning' | 'danger';
}) {
  const color = tone === 'danger' ? colors.danger : tone === 'warning' ? '#8A5A00' : colors.ink;
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({pressed}) => [
        styles.action,
        tone === 'warning' && styles.warningAction,
        tone === 'danger' && styles.dangerAction,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      {loading ? <ActivityIndicator color={color} size="small" /> : (
        <MaterialCommunityIcons name={icon} size={18} color={color} />
      )}
      <Text style={[styles.actionText, {color}]}>{label}</Text>
    </Pressable>
  );
}

function formatDate(value: string | null): string {
  if (!value) return '';
  return new Intl.DateTimeFormat('es-ES', {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'})
    .format(new Date(value));
}

const styles = StyleSheet.create({
  page: {flexGrow: 1, width: '100%', maxWidth: 980, alignSelf: 'center', padding: spacing.lg},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, marginBottom: spacing.lg},
  heading: {flex: 1, minWidth: 0},
  eyebrow: {color: colors.brand, fontSize: 10, fontWeight: '900'},
  title: {color: colors.ink, fontSize: 25, fontWeight: '900', marginTop: 3},
  subtitle: {color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4},
  refresh: {minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface},
  refreshText: {color: colors.ink, fontSize: 12, fontWeight: '800'},
  message: {minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: spacing.md, paddingHorizontal: 13, borderWidth: 1, borderRadius: radius.md},
  errorMessage: {borderColor: '#F3C7C7', backgroundColor: '#FFF1F1'},
  noticeMessage: {borderColor: '#BFE2C6', backgroundColor: '#EDF8EF'},
  messageText: {flex: 1, fontSize: 12, fontWeight: '800'},
  state: {minHeight: 280, alignItems: 'center', justifyContent: 'center', gap: spacing.sm},
  stateTitle: {color: colors.ink, fontSize: 17, fontWeight: '900'},
  stateText: {color: colors.muted, fontSize: 13},
  list: {gap: spacing.md},
  report: {padding: spacing.lg, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, backgroundColor: colors.surface, ...shadows.card},
  reportTop: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md},
  reasonBadge: {minHeight: 30, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9, borderRadius: radius.sm, backgroundColor: colors.softBrand},
  reasonText: {color: colors.brandDark, fontSize: 11, fontWeight: '900'},
  date: {color: colors.muted, fontSize: 10, fontWeight: '700'},
  statement: {color: colors.ink, fontSize: 16, lineHeight: 23, fontWeight: '900', marginTop: spacing.md},
  detail: {color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 8},
  metadata: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.md},
  metaText: {color: colors.muted, fontSize: 10, fontWeight: '800'},
  historical: {color: colors.aqua, fontSize: 10, fontWeight: '900'},
  actions: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.lg, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.line},
  action: {minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface},
  warningAction: {borderColor: '#F0D89A', backgroundColor: colors.softGold},
  dangerAction: {borderColor: '#F3C7C7', backgroundColor: '#FFF1F1'},
  actionText: {fontSize: 11, fontWeight: '900'},
  disabled: {opacity: 0.5},
  pressed: {opacity: 0.75},
});
