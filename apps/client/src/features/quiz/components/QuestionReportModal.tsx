import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Question, QuestionReportReason } from '@/core/domain/types';
import { colors, radius, shadows, spacing } from '@/core/design/tokens';
import { readableFirebaseError, reportQuestionRemote } from '@/core/firebase/firebaseClient';
import { PrimaryButton } from '@/shared/components/PrimaryButton';

const reasons: Array<{id: QuestionReportReason; label: string}> = [
  {id: 'incorrect_question', label: 'Pregunta incorrecta'},
  {id: 'incorrect_answer', label: 'Respuesta incorrecta'},
  {id: 'outdated', label: 'Pregunta desactualizada'},
  {id: 'incorrect_explanation', label: 'Explicación incorrecta'},
  {id: 'other', label: 'Otro'},
];

export function QuestionReportModal({
  question,
  onClose,
  onSubmitted,
}: {
  question: Question | null;
  onClose: () => void;
  onSubmitted: (questionId: string) => void;
}) {
  const [reason, setReason] = useState<QuestionReportReason>('incorrect_question');
  const [detail, setDetail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!question) return;
    setReason('incorrect_question');
    setDetail('');
    setError(null);
    setSubmitting(false);
  }, [question]);

  const submit = async () => {
    if (!question || submitting) return;
    const normalizedDetail = detail.trim();
    if (reason === 'other' && !normalizedDetail) {
      setError('Cuéntanos brevemente qué debería revisarse.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await reportQuestionRemote(question.id, reason, normalizedDetail || null);
      onSubmitted(question.id);
      onClose();
    } catch (submitError) {
      setError(readableFirebaseError(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent
      visible={question !== null}
    >
      <View style={styles.backdrop}>
        <View accessibilityViewIsModal style={styles.dialog}>
          <View style={styles.header}>
            <View style={styles.heading}>
              <Text style={styles.title}>Reportar pregunta</Text>
              <Text numberOfLines={2} style={styles.statement}>{question?.statement}</Text>
            </View>
            <Pressable
              accessibilityLabel="Cerrar reporte"
              onPress={onClose}
              style={({pressed}) => [styles.close, pressed && styles.pressed]}
            >
              <MaterialCommunityIcons name="close" size={21} color={colors.ink} />
            </Pressable>
          </View>

          <View accessibilityRole="radiogroup" style={styles.reasons}>
            {reasons.map((item) => {
              const selected = reason === item.id;
              return (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{checked: selected}}
                  key={item.id}
                  onPress={() => {
                    setReason(item.id);
                    setError(null);
                  }}
                  style={({pressed}) => [
                    styles.reason,
                    selected && styles.reasonSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <MaterialCommunityIcons
                    name={selected ? 'radiobox-marked' : 'radiobox-blank'}
                    size={20}
                    color={selected ? colors.brand : colors.muted}
                  />
                  <Text style={[styles.reasonText, selected && styles.reasonTextSelected]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <TextInput
            maxLength={500}
            multiline
            onChangeText={setDetail}
            placeholder={reason === 'other' ? 'Describe el problema' : 'Añade un detalle (opcional)'}
            placeholderTextColor={colors.muted}
            style={styles.detail}
            value={detail}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.actions}>
            <PrimaryButton label="Cancelar" onPress={onClose} variant="secondary" />
            <PrimaryButton
              icon="flag-outline"
              label="Enviar reporte"
              loading={submitting}
              onPress={() => void submit()}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {flex: 1, zIndex: 1000, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, backgroundColor: 'rgba(15, 28, 47, 0.72)'},
  dialog: {width: '100%', maxWidth: 520, maxHeight: '92%', zIndex: 1001, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface, ...shadows.floating, elevation: 100},
  header: {flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md},
  heading: {flex: 1, minWidth: 0},
  title: {color: colors.ink, fontSize: 22, fontWeight: '900'},
  statement: {color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 5},
  close: {width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md},
  reasons: {gap: 6, marginTop: spacing.lg},
  reason: {minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 10, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md},
  reasonSelected: {borderColor: colors.brand, backgroundColor: colors.softBrand},
  reasonText: {color: colors.ink, fontSize: 13, fontWeight: '700'},
  reasonTextSelected: {color: colors.brandDark, fontWeight: '900'},
  detail: {minHeight: 82, maxHeight: 130, marginTop: spacing.md, padding: 12, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.field, color: colors.ink, fontSize: 13, lineHeight: 19, textAlignVertical: 'top'},
  error: {color: colors.danger, fontSize: 12, lineHeight: 17, marginTop: spacing.sm},
  actions: {gap: spacing.sm, marginTop: spacing.md},
  pressed: {opacity: 0.76},
});
