import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, shadows, spacing } from '@/core/design/tokens';
import {
  AdminBulkReviewDecision,
  AdminQuestion,
  AdminReviewDecision,
  bootstrapEmulatorAdminRemote,
  bulkReviewQuestionsRemote,
  getQuestionReviewQueueRemote,
  importQuestionBatchRemote,
  isFirebaseEnabled,
  isUsingFirebaseEmulators,
  readableFirebaseError,
  reviewQuestionRemote,
} from '@/core/firebase/firebaseClient';
import { CsvImportError, csvToQuestionBatch } from '@/features/admin/csvImport';
import { AdminCatalogPanel } from '@/features/admin/AdminCatalogPanel';
import { AdminOperationsPanel } from '@/features/admin/AdminOperationsPanel';
import { AdminQuestionReportsPanel } from '@/features/admin/AdminQuestionReportsPanel';

type AdminView = 'review' | 'reports' | 'import' | 'catalog' | 'operations';
type QueueFilter = 'all' | 'pending_review' | 'draft' | 'duplicates';
type ImportFormat = 'json' | 'csv';

const importTemplate = JSON.stringify({
  batchId: 'web-review-sample-2026',
  sourceDocument: 'manual-bomberos.pdf',
  questions: [{
    oppositionId: 'firefighters_es',
    statement: '¿Qué comprobación debe realizarse antes de utilizar una manguera a presión?',
    answers: [
      { id: 'a', text: 'Comprobar únicamente el color' },
      { id: 'b', text: 'Revisar su estado y sus conexiones' },
      { id: 'c', text: 'Medir solamente la longitud' },
      { id: 'd', text: 'No es necesaria ninguna comprobación' },
    ],
    correctAnswerId: 'b',
    explanation: 'Antes del uso se revisan la manguera y todas sus conexiones.',
    categoryId: 'equipment',
    subcategoryId: null,
    difficulty: 1,
    scopeType: 'technical',
    country: 'ES',
    autonomousCommunity: null,
    province: null,
    municipality: null,
    specificCallId: null,
    officialExamId: null,
    year: 2026,
    source: 'Manual de formación',
    sourcePage: 1,
    verified: false,
    status: 'pending_review',
    validFrom: null,
    validUntil: null,
  }],
}, null, 2);

const csvTemplate = [
  'oppositionId,statement,answerA,answerB,answerC,answerD,correctAnswerId,explanation,categoryId,subcategoryId,difficulty,scopeType,country,autonomousCommunity,province,municipality,specificCallId,officialExamId,year,source,sourceDocument,sourcePage,validFrom,validUntil',
  'firefighters_es,"¿Qué comprobación debe realizarse antes de utilizar una manguera?",Comprobar el color,Revisar el estado y las conexiones,Medir la longitud,Ninguna comprobación,b,"Se revisan la manguera y sus conexiones.",equipment,,1,technical,ES,,,,,,2026,Manual de formación,manual-bomberos.pdf,1,,',
].join('\n');

export default function AdminScreen() {
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const { width } = useWindowDimensions();
  const isWide = width >= 920;
  const [view, setView] = useState<AdminView>(() => adminViewFromParam(tab));
  const [filter, setFilter] = useState<QueueFilter>('all');
  const [query, setQuery] = useState('');
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [draft, setDraft] = useState<AdminQuestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminReady, setAdminReady] = useState(false);
  const [saving, setSaving] = useState<AdminReviewDecision | null>(null);
  const [bulkSaving, setBulkSaving] = useState<AdminBulkReviewDecision | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [importFormat, setImportFormat] = useState<ImportFormat>('json');
  const [jsonInput, setJsonInput] = useState(importTemplate);
  const [csvInput, setCsvInput] = useState(csvTemplate);
  const [csvBatchId, setCsvBatchId] = useState('csv-review-2026');
  const [csvSourceDocument, setCsvSourceDocument] = useState('manual-bomberos.csv');
  const [importing, setImporting] = useState(false);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const nextQuestions = await getQuestionReviewQueueRemote();
      setQuestions(nextQuestions);
      setSelectedId((current) => {
        if (current && nextQuestions.some((question) => question.id === current)) return current;
        return nextQuestions[0]?.id ?? null;
      });
    } catch (loadError) {
      setError(readableFirebaseError(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    async function initialize() {
      if (!isFirebaseEnabled() || !isUsingFirebaseEmulators()) {
        setError('Activa Firebase y los emuladores locales para abrir el panel.');
        setLoading(false);
        return;
      }
      try {
        await bootstrapEmulatorAdminRemote();
        setAdminReady(true);
        await loadQueue();
      } catch (initializeError) {
        setError(readableFirebaseError(initializeError));
        setLoading(false);
      }
    }
    void initialize();
  }, [loadQueue]);

  useEffect(() => {
    const selected = questions.find((question) => question.id === selectedId) ?? null;
    setDraft(selected ? cloneQuestion(selected) : null);
    setSelectedIds((current) => current.filter((id) => questions.some((question) => question.id === id)));
  }, [questions, selectedId]);

  const visibleQuestions = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('es');
    return questions.filter((question) => {
      if (filter === 'duplicates') {
        if (question.duplicates.length === 0) return false;
      } else if (filter !== 'all' && question.status !== filter) return false;
      if (!normalizedQuery) return true;
      return [question.statement, question.categoryId, question.source]
        .some((value) => value.toLocaleLowerCase('es').includes(normalizedQuery));
    });
  }, [filter, query, questions]);

  const visibleIds = visibleQuestions.map((question) => question.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

  async function submitReview(decision: AdminReviewDecision) {
    if (!draft || saving) return;
    setSaving(decision);
    setError(null);
    setNotice(null);
    try {
      const reviewed = await reviewQuestionRemote(
        draft.id,
        decision,
        decision === 'disable' ? undefined : draft,
      );
      if (decision === 'save') {
        setQuestions((current) => current.map((question) => (
          question.id === reviewed.id ? reviewed : question
        )));
        setNotice('Cambios guardados. La pregunta continúa pendiente.');
      } else {
        setQuestions((current) => current.filter((question) => question.id !== reviewed.id));
        setNotice(decision === 'publish' ? 'Pregunta publicada y verificada.' : 'Pregunta descartada.');
      }
    } catch (reviewError) {
      setError(readableFirebaseError(reviewError));
    } finally {
      setSaving(null);
    }
  }

  function confirmDisable() {
    Alert.alert(
      'Descartar pregunta',
      'La pregunta quedará deshabilitada y saldrá de la cola de revisión.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Descartar', style: 'destructive', onPress: () => void submitReview('disable') },
      ],
    );
  }

  function toggleSelection(questionId: string) {
    setSelectedIds((current) => current.includes(questionId)
      ? current.filter((id) => id !== questionId)
      : [...current, questionId].slice(0, 50));
  }

  function toggleVisibleSelection() {
    setSelectedIds((current) => {
      if (allVisibleSelected) return current.filter((id) => !visibleIds.includes(id));
      return [...new Set([...current, ...visibleIds])].slice(0, 50);
    });
  }

  async function submitBulkReview(decision: AdminBulkReviewDecision) {
    if (selectedIds.length === 0 || bulkSaving) return;
    setBulkSaving(decision);
    setError(null);
    setNotice(null);
    try {
      const result = await bulkReviewQuestionsRemote(selectedIds, decision);
      const reviewedIds = new Set(result.questionIds);
      setQuestions((current) => current.filter((question) => !reviewedIds.has(question.id)));
      setSelectedIds([]);
      setNotice(decision === 'publish'
        ? `${result.reviewedCount} preguntas publicadas y verificadas.`
        : `${result.reviewedCount} preguntas descartadas.`);
    } catch (bulkError) {
      setError(readableFirebaseError(bulkError));
    } finally {
      setBulkSaving(null);
    }
  }

  function confirmBulkReview(decision: AdminBulkReviewDecision) {
    const count = selectedIds.length;
    Alert.alert(
      decision === 'publish' ? 'Publicar selección' : 'Descartar selección',
      decision === 'publish'
        ? `Se publicarán y verificarán ${count} preguntas.`
        : `Se deshabilitarán ${count} preguntas y saldrán de la cola.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: decision === 'publish' ? 'Publicar' : 'Descartar',
          style: decision === 'disable' ? 'destructive' : 'default',
          onPress: () => void submitBulkReview(decision),
        },
      ],
    );
  }

  function convertCsv() {
    setError(null);
    setNotice(null);
    try {
      const batch = csvToQuestionBatch(csvInput, {
        batchId: csvBatchId,
        sourceDocument: csvSourceDocument,
      });
      setJsonInput(JSON.stringify(batch, null, 2));
      setImportFormat('json');
      setNotice(`${batch.questions.length} preguntas convertidas. Revisa el JSON antes de importarlo.`);
    } catch (csvError) {
      setError(csvError instanceof CsvImportError ? csvError.message : 'No se pudo convertir el CSV.');
    }
  }

  async function submitImport() {
    if (importing) return;
    setImporting(true);
    setError(null);
    setNotice(null);
    try {
      const payload = JSON.parse(jsonInput) as unknown;
      const result = await importQuestionBatchRemote(payload);
      setNotice(
        result.idempotent
          ? `El lote ${result.batchId} ya estaba importado.`
          : `${result.importedCount} pregunta${result.importedCount === 1 ? '' : 's'} importada${result.importedCount === 1 ? '' : 's'}.`,
      );
      await loadQueue();
      setView('review');
    } catch (importError) {
      setError(importError instanceof SyntaxError
        ? 'El JSON no tiene un formato válido.'
        : readableFirebaseError(importError));
    } finally {
      setImporting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityLabel="Volver"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.ink} />
        </Pressable>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Administración</Text>
          <View style={styles.environmentRow}>
            <View style={styles.environmentDot} />
            <Text style={styles.environmentText}>Emulador local</Text>
          </View>
        </View>
        {view === 'review' ? (
          <Pressable
            accessibilityLabel="Actualizar cola"
            disabled={loading}
            onPress={() => void loadQueue()}
            style={({ pressed }) => [styles.refreshButton, pressed && styles.pressed]}
          >
            <MaterialCommunityIcons name="refresh" size={19} color={colors.ink} />
            {isWide ? <Text style={styles.refreshLabel}>Actualizar</Text> : null}
          </Pressable>
        ) : <View style={styles.headerSpacer} />}
      </View>

      <ScrollView horizontal contentContainerStyle={styles.viewTabs} showsHorizontalScrollIndicator={false}>
        <TabButton
          active={view === 'review'}
          icon="clipboard-check-outline"
          label="Preguntas"
          onPress={() => setView('review')}
        />
        <TabButton
          active={view === 'reports'}
          icon="flag-outline"
          label="Reportes"
          onPress={() => setView('reports')}
        />
        <TabButton
          active={view === 'import'}
          icon="file-import-outline"
          label="Importar"
          onPress={() => setView('import')}
        />
        <TabButton
          active={view === 'catalog'}
          icon="database-cog-outline"
          label="Datos"
          onPress={() => setView('catalog')}
        />
        <TabButton
          active={view === 'operations'}
          icon="chart-box-outline"
          label="Operación"
          onPress={() => setView('operations')}
        />
      </ScrollView>

      {error || notice ? (
        <View style={[styles.message, error ? styles.errorMessage : styles.successMessage]}>
          <MaterialCommunityIcons
            name={error ? 'alert-circle-outline' : 'check-circle-outline'}
            size={19}
            color={error ? colors.danger : colors.success}
          />
          <Text style={[styles.messageText, error ? styles.errorText : styles.successText]}>
            {error ?? notice}
          </Text>
        </View>
      ) : null}

      {view === 'review' ? (
        <ScrollView contentContainerStyle={styles.pageScroll} showsVerticalScrollIndicator={false}>
          <View style={[styles.workspace, isWide ? styles.workspaceWide : styles.workspaceNarrow]}>
            <View style={[styles.queuePane, isWide && styles.queuePaneWide]}>
              <View style={styles.searchBox}>
                <MaterialCommunityIcons name="magnify" size={20} color={colors.muted} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Buscar en la cola"
                  placeholderTextColor={colors.muted}
                  style={styles.searchInput}
                />
              </View>
              <View style={styles.filterRow}>
                <FilterButton active={filter === 'all'} label="Todas" onPress={() => setFilter('all')} />
                <FilterButton
                  active={filter === 'pending_review'}
                  label="Pendientes"
                  onPress={() => setFilter('pending_review')}
                />
                <FilterButton
                  active={filter === 'draft'}
                  label="Borradores"
                  onPress={() => setFilter('draft')}
                />
                <FilterButton
                  active={filter === 'duplicates'}
                  label="Duplicadas"
                  onPress={() => setFilter('duplicates')}
                />
              </View>

              <View style={styles.bulkBar}>
                <Pressable
                  accessibilityLabel={allVisibleSelected ? 'Quitar selección visible' : 'Seleccionar visibles'}
                  onPress={toggleVisibleSelection}
                  style={({ pressed }) => [styles.selectVisible, pressed && styles.pressed]}
                >
                  <MaterialCommunityIcons
                    name={allVisibleSelected ? 'checkbox-marked' : 'checkbox-blank-outline'}
                    size={20}
                    color={allVisibleSelected ? colors.aqua : colors.muted}
                  />
                  <Text style={styles.selectionText}>
                    {selectedIds.length > 0 ? `${selectedIds.length} seleccionadas` : 'Seleccionar visibles'}
                  </Text>
                </Pressable>
                {selectedIds.length > 0 ? (
                  <View style={styles.bulkActions}>
                    <Pressable
                      accessibilityLabel="Descartar preguntas seleccionadas"
                      disabled={bulkSaving !== null}
                      onPress={() => confirmBulkReview('disable')}
                      style={({ pressed }) => [styles.bulkIconButton, pressed && styles.pressed]}
                    >
                      {bulkSaving === 'disable' ? (
                        <ActivityIndicator color={colors.danger} size="small" />
                      ) : (
                        <MaterialCommunityIcons name="delete-outline" size={19} color={colors.danger} />
                      )}
                    </Pressable>
                    <Pressable
                      accessibilityLabel="Publicar preguntas seleccionadas"
                      disabled={bulkSaving !== null}
                      onPress={() => confirmBulkReview('publish')}
                      style={({ pressed }) => [styles.bulkPublishButton, pressed && styles.pressed]}
                    >
                      {bulkSaving === 'publish' ? (
                        <ActivityIndicator color={colors.surface} size="small" />
                      ) : (
                        <MaterialCommunityIcons name="check-all" size={19} color={colors.surface} />
                      )}
                      <Text style={styles.bulkPublishLabel}>Publicar</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>

              {loading ? (
                <View style={styles.centerState}>
                  <ActivityIndicator color={colors.brand} />
                  <Text style={styles.stateText}>Cargando cola…</Text>
                </View>
              ) : visibleQuestions.length === 0 ? (
                <View style={styles.centerState}>
                  <MaterialCommunityIcons name="clipboard-check-outline" size={34} color={colors.aqua} />
                  <Text style={styles.emptyTitle}>Cola al día</Text>
                  <Text style={styles.stateText}>No hay preguntas con este filtro.</Text>
                </View>
              ) : (
                <View style={styles.questionList}>
                  {visibleQuestions.map((question) => (
                    <QuestionRow
                      key={question.id}
                      active={question.id === selectedId}
                      selected={selectedIds.includes(question.id)}
                      question={question}
                      onPress={() => setSelectedId(question.id)}
                      onToggleSelection={() => toggleSelection(question.id)}
                    />
                  ))}
                </View>
              )}
            </View>

            <View style={styles.editorPane}>
              {draft ? (
                <QuestionEditor
                  question={draft}
                  saving={saving}
                  onChange={setDraft}
                  onSave={() => void submitReview('save')}
                  onPublish={() => void submitReview('publish')}
                  onDisable={confirmDisable}
                />
              ) : (
                <View style={styles.editorEmpty}>
                  <MaterialCommunityIcons name="text-box-search-outline" size={44} color={colors.muted} />
                  <Text style={styles.emptyTitle}>Selecciona una pregunta</Text>
                  <Text style={styles.stateText}>El contenido completo aparecerá aquí.</Text>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      ) : view === 'reports' ? (
        adminReady ? <AdminQuestionReportsPanel /> : (
          <View style={styles.centerState}>
            <ActivityIndicator color={colors.brand} />
            <Text style={styles.stateText}>Preparando sesión administrativa…</Text>
          </View>
        )
      ) : view === 'import' ? (
        <ScrollView contentContainerStyle={styles.importScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.importHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>NUEVO LOTE</Text>
              <Text style={styles.importTitle}>
                {importFormat === 'json' ? 'Importar preguntas' : 'Convertir CSV'}
              </Text>
            </View>
            <View style={styles.safetyBadge}>
              <MaterialCommunityIcons name="shield-check-outline" size={18} color={colors.aqua} />
              <Text style={styles.safetyText}>Revisión obligatoria</Text>
            </View>
          </View>
          <View style={styles.importFormatTabs}>
            <ImportFormatButton
              active={importFormat === 'json'}
              icon="code-json"
              label="JSON"
              onPress={() => setImportFormat('json')}
            />
            <ImportFormatButton
              active={importFormat === 'csv'}
              icon="file-delimited-outline"
              label="CSV"
              onPress={() => setImportFormat('csv')}
            />
          </View>
          {importFormat === 'csv' ? (
            <>
              <View style={styles.csvMetadata}>
                <View style={styles.flexField}>
                  <FieldLabel label="ID del lote" />
                  <TextInput
                    autoCapitalize="none"
                    onChangeText={setCsvBatchId}
                    style={styles.textInput}
                    value={csvBatchId}
                  />
                </View>
                <View style={styles.flexField}>
                  <FieldLabel label="Documento de origen" />
                  <TextInput
                    autoCapitalize="none"
                    onChangeText={setCsvSourceDocument}
                    style={styles.textInput}
                    value={csvSourceDocument}
                  />
                </View>
              </View>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                multiline
                onChangeText={setCsvInput}
                spellCheck={false}
                style={styles.csvEditor}
                textAlignVertical="top"
                value={csvInput}
              />
            </>
          ) : (
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              multiline
              onChangeText={setJsonInput}
              spellCheck={false}
              style={styles.jsonEditor}
              textAlignVertical="top"
              value={jsonInput}
            />
          )}
          <View style={styles.importFooter}>
            <Text style={styles.importMeta}>
              {(importFormat === 'json' ? jsonInput.length : csvInput.length).toLocaleString('es-ES')} caracteres
            </Text>
            <ActionButton
              icon={importFormat === 'json' ? 'file-import-outline' : 'swap-horizontal'}
              label={importFormat === 'json' ? 'Importar lote' : 'Convertir a JSON'}
              loading={importFormat === 'json' && importing}
              onPress={importFormat === 'json' ? () => void submitImport() : convertCsv}
              tone="brand"
            />
          </View>
        </ScrollView>
      ) : adminReady ? (
        view === 'catalog' ? <AdminCatalogPanel /> : <AdminOperationsPanel />
      ) : (
        <View style={styles.centerState}>
          <ActivityIndicator color={colors.brand} />
          <Text style={styles.stateText}>Preparando sesión administrativa…</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

function QuestionEditor({
  question,
  saving,
  onChange,
  onSave,
  onPublish,
  onDisable,
}: {
  question: AdminQuestion;
  saving: AdminReviewDecision | null;
  onChange: (question: AdminQuestion) => void;
  onSave: () => void;
  onPublish: () => void;
  onDisable: () => void;
}) {
  function updateAnswer(index: number, text: string) {
    onChange({
      ...question,
      answers: question.answers.map((answer, answerIndex) => (
        answerIndex === index ? { ...answer, text } : answer
      )),
    });
  }

  return (
    <View style={styles.editorContent}>
      <View style={styles.editorHeader}>
        <View style={styles.editorHeaderCopy}>
          <Text style={styles.sectionEyebrow}>PREGUNTA EN REVISIÓN</Text>
          <Text style={styles.questionId} numberOfLines={1}>{question.id}</Text>
        </View>
        <StatusBadge status={question.status} />
      </View>

      {question.duplicates.length > 0 ? (
        <View style={styles.duplicateWarning}>
          <MaterialCommunityIcons name="content-duplicate" size={21} color={colors.gold} />
          <View style={styles.duplicateCopy}>
            <Text style={styles.duplicateTitle}>
              {question.duplicates.length === 1 ? 'Coincidencia exacta detectada' : `${question.duplicates.length} coincidencias exactas`}
            </Text>
            <Text style={styles.duplicateDetail} numberOfLines={2}>
              {question.duplicates.map((duplicate) => `${duplicate.id} (${duplicate.status})`).join(', ')}
            </Text>
          </View>
        </View>
      ) : null}

      <FieldLabel label="Enunciado" />
      <TextInput
        multiline
        onChangeText={(statement) => onChange({ ...question, statement })}
        style={[styles.textInput, styles.statementInput]}
        textAlignVertical="top"
        value={question.statement}
      />

      <FieldLabel label="Respuestas" detail="Marca la opción correcta" />
      <View style={styles.answerList}>
        {question.answers.map((answer, index) => {
          const selected = answer.id === question.correctAnswerId;
          return (
            <View key={answer.id} style={[styles.answerRow, selected && styles.answerRowSelected]}>
              <Pressable
                accessibilityLabel={`Marcar respuesta ${answer.id} como correcta`}
                onPress={() => onChange({ ...question, correctAnswerId: answer.id })}
                style={styles.answerChoice}
              >
                <MaterialCommunityIcons
                  name={selected ? 'radiobox-marked' : 'radiobox-blank'}
                  size={22}
                  color={selected ? colors.aqua : colors.muted}
                />
                <Text style={[styles.answerId, selected && styles.answerIdSelected]}>
                  {answer.id.toUpperCase()}
                </Text>
              </Pressable>
              <TextInput
                onChangeText={(text) => updateAnswer(index, text)}
                style={styles.answerInput}
                value={answer.text}
              />
            </View>
          );
        })}
      </View>

      <FieldLabel label="Explicación" />
      <TextInput
        multiline
        onChangeText={(explanation) => onChange({ ...question, explanation })}
        style={[styles.textInput, styles.explanationInput]}
        textAlignVertical="top"
        value={question.explanation}
      />

      <View style={styles.twoColumns}>
        <View style={styles.flexField}>
          <FieldLabel label="Categoría" />
          <TextInput
            onChangeText={(categoryId) => onChange({ ...question, categoryId })}
            style={styles.textInput}
            value={question.categoryId}
          />
        </View>
        <View style={styles.flexField}>
          <FieldLabel label="Fuente" />
          <TextInput
            onChangeText={(source) => onChange({ ...question, source })}
            style={styles.textInput}
            value={question.source}
          />
        </View>
      </View>

      <FieldLabel label="Dificultad" />
      <View style={styles.difficultyRow}>
        {[1, 2, 3, 4, 5].map((difficulty) => (
          <Pressable
            key={difficulty}
            onPress={() => onChange({ ...question, difficulty })}
            style={({ pressed }) => [
              styles.difficultyButton,
              question.difficulty === difficulty && styles.difficultyButtonActive,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[
              styles.difficultyText,
              question.difficulty === difficulty && styles.difficultyTextActive,
            ]}>{difficulty}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.metadataBand}>
        <MetadataItem icon="map-marker-outline" label="Ámbito" value={scopeLabel(question)} />
        <MetadataItem
          icon="file-document-outline"
          label="Documento"
          value={question.sourceDocument ?? 'Sin documento'}
        />
        <MetadataItem
          icon="book-open-page-variant-outline"
          label="Página"
          value={question.sourcePage?.toString() ?? '—'}
        />
      </View>

      <View style={styles.actionBar}>
        <ActionButton
          icon="delete-outline"
          label="Descartar"
          loading={saving === 'disable'}
          onPress={onDisable}
          tone="danger"
        />
        <View style={styles.primaryActions}>
          <ActionButton
            icon="content-save-outline"
            label="Guardar"
            loading={saving === 'save'}
            onPress={onSave}
            tone="neutral"
          />
          <ActionButton
            icon="check-decagram-outline"
            label="Publicar"
            loading={saving === 'publish'}
            onPress={onPublish}
            tone="success"
          />
        </View>
      </View>
    </View>
  );
}

function TabButton({ active, icon, label, onPress }: {
  active: boolean;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.tabButton, active && styles.tabButtonActive]}>
      <MaterialCommunityIcons name={icon} size={19} color={active ? colors.brand : colors.muted} />
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function ImportFormatButton({ active, icon, label, onPress }: {
  active: boolean;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.importFormatButton,
        active && styles.importFormatButtonActive,
        pressed && styles.pressed,
      ]}
    >
      <MaterialCommunityIcons name={icon} size={18} color={active ? colors.surface : colors.muted} />
      <Text style={[styles.importFormatLabel, active && styles.importFormatLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function FilterButton({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.filterButton, active && styles.filterButtonActive]}>
      <Text style={[styles.filterLabel, active && styles.filterLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function QuestionRow({ active, selected, question, onPress, onToggleSelection }: {
  active: boolean;
  selected: boolean;
  question: AdminQuestion;
  onPress: () => void;
  onToggleSelection: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.questionRow,
        active && styles.questionRowActive,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.questionRowTop}>
        <View style={styles.questionRowStatus}>
          <Pressable
            accessibilityLabel={selected ? 'Quitar pregunta de la selección' : 'Seleccionar pregunta'}
            onPress={(event) => {
              event.stopPropagation();
              onToggleSelection();
            }}
            hitSlop={8}
          >
            <MaterialCommunityIcons
              name={selected ? 'checkbox-marked' : 'checkbox-blank-outline'}
              size={20}
              color={selected ? colors.aqua : colors.muted}
            />
          </Pressable>
          <StatusBadge status={question.status} compact />
        </View>
        <Text style={styles.questionDifficulty}>D{question.difficulty}</Text>
      </View>
      <Text numberOfLines={3} style={styles.questionStatement}>{question.statement}</Text>
      <View style={styles.questionRowMeta}>
        <View style={styles.questionCategoryRow}>
          {question.duplicates.length > 0 ? (
            <MaterialCommunityIcons name="content-duplicate" size={15} color={colors.gold} />
          ) : null}
          <Text numberOfLines={1} style={styles.questionCategory}>{question.categoryId}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={18} color={colors.muted} />
      </View>
    </Pressable>
  );
}

function StatusBadge({ status, compact = false }: { status: AdminQuestion['status']; compact?: boolean }) {
  const draft = status === 'draft';
  return (
    <View style={[styles.statusBadge, draft ? styles.draftBadge : styles.pendingBadge, compact && styles.compactBadge]}>
      <Text style={[styles.statusText, draft ? styles.draftText : styles.pendingText]}>
        {draft ? 'Borrador' : 'Pendiente'}
      </Text>
    </View>
  );
}

function FieldLabel({ label, detail }: { label: string; detail?: string }) {
  return (
    <View style={styles.fieldLabelRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {detail ? <Text style={styles.fieldDetail}>{detail}</Text> : null}
    </View>
  );
}

function MetadataItem({ icon, label, value }: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.metadataItem}>
      <MaterialCommunityIcons name={icon} size={18} color={colors.aqua} />
      <View style={styles.metadataCopy}>
        <Text style={styles.metadataLabel}>{label}</Text>
        <Text numberOfLines={1} style={styles.metadataValue}>{value}</Text>
      </View>
    </View>
  );
}

function ActionButton({ icon, label, loading, onPress, tone }: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  loading: boolean;
  onPress: () => void;
  tone: 'brand' | 'success' | 'neutral' | 'danger';
}) {
  const foreground = tone === 'brand' || tone === 'success' ? colors.surface :
    tone === 'danger' ? colors.danger : colors.ink;
  return (
    <Pressable
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        styles[`${tone}Action`],
        pressed && styles.pressed,
        loading && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={foreground} size="small" />
      ) : (
        <MaterialCommunityIcons name={icon} size={19} color={foreground} />
      )}
      <Text style={[styles.actionLabel, { color: foreground }]}>{label}</Text>
    </Pressable>
  );
}

function scopeLabel(question: AdminQuestion): string {
  return question.municipality ?? question.province ?? question.autonomousCommunity ?? question.country;
}

function cloneQuestion(question: AdminQuestion): AdminQuestion {
  return {
    ...question,
    answers: question.answers.map((answer) => ({ ...answer })),
    duplicates: question.duplicates.map((duplicate) => ({ ...duplicate })),
  };
}

function adminViewFromParam(tab: string | undefined): AdminView {
  return tab === 'catalog' || tab === 'reports' || tab === 'import' || tab === 'operations'
    ? tab
    : 'review';
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  topBar: { minHeight: 72, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.line },
  iconButton: { width: 40, height: 40, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  titleBlock: { flex: 1 },
  title: { color: colors.ink, fontSize: 20, fontWeight: '900' },
  environmentRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  environmentDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
  environmentText: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  refreshButton: { minHeight: 40, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface },
  refreshLabel: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  headerSpacer: { width: 40, height: 40 },
  viewTabs: { minWidth: '100%', height: 52, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.line },
  tabButton: { minWidth: 82, height: 51, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 4, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabButtonActive: { borderBottomColor: colors.brand },
  tabLabel: { color: colors.muted, fontSize: 13, fontWeight: '800' },
  tabLabelActive: { color: colors.ink },
  message: { minHeight: 42, paddingHorizontal: spacing.lg, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderBottomWidth: 1 },
  errorMessage: { backgroundColor: '#FFF1F1', borderBottomColor: '#F3C7C7' },
  successMessage: { backgroundColor: '#EDF8EF', borderBottomColor: '#BFE2C6' },
  messageText: { flexShrink: 1, fontSize: 13, fontWeight: '700' },
  errorText: { color: colors.danger },
  successText: { color: colors.success },
  pageScroll: { flexGrow: 1, alignItems: 'center', padding: spacing.md },
  workspace: { width: '100%', maxWidth: 1180, alignItems: 'stretch' },
  workspaceWide: { flexDirection: 'row', gap: spacing.md },
  workspaceNarrow: { gap: spacing.md },
  queuePane: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, overflow: 'hidden', ...shadows.card },
  queuePaneWide: { width: 340, flexShrink: 0 },
  searchBox: { height: 44, margin: 12, marginBottom: 8, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.field },
  searchInput: { flex: 1, minWidth: 0, color: colors.ink, fontSize: 14 },
  filterRow: { height: 42, paddingHorizontal: 12, flexDirection: 'row', gap: 6, borderBottomWidth: 1, borderBottomColor: colors.line },
  filterButton: { height: 30, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
  filterButtonActive: { backgroundColor: colors.softBrand },
  filterLabel: { color: colors.muted, fontSize: 11, fontWeight: '800' },
  filterLabelActive: { color: colors.brandDark },
  bulkBar: { minHeight: 50, paddingHorizontal: 12, paddingVertical: 7, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: '#FAFBFA' },
  selectVisible: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 7 },
  selectionText: { color: colors.ink, fontSize: 11, fontWeight: '800' },
  bulkActions: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  bulkIconButton: { width: 36, height: 34, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#F3C7C7', borderRadius: radius.sm, backgroundColor: '#FFF1F1' },
  bulkPublishButton: { minWidth: 88, height: 34, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: radius.sm, backgroundColor: colors.aqua },
  bulkPublishLabel: { color: colors.surface, fontSize: 11, fontWeight: '900' },
  centerState: { minHeight: 210, padding: spacing.lg, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  stateText: { color: colors.muted, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  emptyTitle: { color: colors.ink, fontSize: 15, fontWeight: '900', marginTop: 2 },
  questionList: { padding: 8, gap: 7 },
  questionRow: { minHeight: 128, padding: 12, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface },
  questionRowActive: { borderColor: colors.brand, backgroundColor: '#FFF8F4' },
  questionRowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  questionRowStatus: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  questionDifficulty: { color: colors.muted, fontSize: 10, fontWeight: '900' },
  questionStatement: { minHeight: 54, marginTop: 9, color: colors.ink, fontSize: 13, lineHeight: 18, fontWeight: '700' },
  questionRowMeta: { marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  questionCategoryRow: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 5 },
  questionCategory: { flex: 1, color: colors.aqua, fontSize: 11, fontWeight: '800' },
  editorPane: { flex: 1, minWidth: 0, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, ...shadows.card },
  editorEmpty: { minHeight: 420, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.lg },
  editorContent: { padding: spacing.lg },
  editorHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.line },
  editorHeaderCopy: { flex: 1, minWidth: 0 },
  duplicateWarning: { marginTop: spacing.md, padding: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 9, borderWidth: 1, borderColor: '#F0D89A', borderRadius: radius.sm, backgroundColor: colors.softGold },
  duplicateCopy: { flex: 1, minWidth: 0 },
  duplicateTitle: { color: '#765000', fontSize: 12, fontWeight: '900' },
  duplicateDetail: { color: '#765000', fontSize: 11, lineHeight: 16, marginTop: 2 },
  sectionEyebrow: { color: colors.brand, fontSize: 10, fontWeight: '900' },
  questionId: { color: colors.muted, fontSize: 12, marginTop: 5 },
  statusBadge: { minHeight: 26, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 13 },
  compactBadge: { minHeight: 22, paddingHorizontal: 8 },
  pendingBadge: { backgroundColor: colors.softGold },
  draftBadge: { backgroundColor: colors.softAqua },
  statusText: { fontSize: 10, fontWeight: '900' },
  pendingText: { color: '#8A5A00' },
  draftText: { color: colors.aqua },
  fieldLabelRow: { marginTop: spacing.lg, marginBottom: 7, flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  fieldLabel: { color: colors.ink, fontSize: 12, fontWeight: '900' },
  fieldDetail: { color: colors.muted, fontSize: 11 },
  textInput: { minHeight: 44, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.field, color: colors.ink, fontSize: 14, lineHeight: 20 },
  statementInput: { minHeight: 92 },
  explanationInput: { minHeight: 86 },
  answerList: { gap: 8 },
  answerRow: { minHeight: 48, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: '#FAFBFA' },
  answerRowSelected: { borderColor: colors.aqua, backgroundColor: colors.softAqua },
  answerChoice: { height: 46, flexDirection: 'row', alignItems: 'center', gap: 5 },
  answerId: { width: 18, color: colors.muted, fontSize: 12, fontWeight: '900' },
  answerIdSelected: { color: colors.aqua },
  answerInput: { flex: 1, minWidth: 0, height: 46, color: colors.ink, fontSize: 13 },
  twoColumns: { flexDirection: 'row', gap: spacing.md },
  flexField: { flex: 1, minWidth: 0 },
  difficultyRow: { flexDirection: 'row', gap: 7 },
  difficultyButton: { width: 42, height: 38, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface },
  difficultyButtonActive: { borderColor: colors.brand, backgroundColor: colors.softBrand },
  difficultyText: { color: colors.muted, fontSize: 13, fontWeight: '900' },
  difficultyTextActive: { color: colors.brandDark },
  metadataBand: { marginTop: spacing.lg, paddingVertical: 13, paddingHorizontal: 14, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line, backgroundColor: '#FAFBFA' },
  metadataItem: { minWidth: 140, flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  metadataCopy: { flex: 1, minWidth: 0 },
  metadataLabel: { color: colors.muted, fontSize: 9, fontWeight: '900' },
  metadataValue: { color: colors.ink, fontSize: 11, fontWeight: '700', marginTop: 2 },
  actionBar: { marginTop: spacing.lg, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.sm },
  primaryActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actionButton: { minWidth: 112, height: 42, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: radius.md, borderWidth: 1 },
  brandAction: { backgroundColor: colors.brand, borderColor: colors.brand },
  successAction: { backgroundColor: colors.aqua, borderColor: colors.aqua },
  neutralAction: { backgroundColor: colors.surface, borderColor: colors.line },
  dangerAction: { backgroundColor: '#FFF1F1', borderColor: '#F3C7C7' },
  actionLabel: { fontSize: 12, fontWeight: '900' },
  importScroll: { flexGrow: 1, alignItems: 'center', padding: spacing.lg },
  importHeader: { width: '100%', maxWidth: 920, marginBottom: spacing.md, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  importTitle: { color: colors.ink, fontSize: 24, fontWeight: '900', marginTop: 3 },
  safetyBadge: { minHeight: 34, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: radius.md, backgroundColor: colors.softAqua },
  safetyText: { color: colors.aqua, fontSize: 11, fontWeight: '900' },
  importFormatTabs: { width: '100%', maxWidth: 920, marginBottom: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 7 },
  importFormatButton: { minWidth: 94, height: 38, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface },
  importFormatButtonActive: { borderColor: colors.ink, backgroundColor: colors.ink },
  importFormatLabel: { color: colors.muted, fontSize: 12, fontWeight: '900' },
  importFormatLabelActive: { color: colors.surface },
  csvMetadata: { width: '100%', maxWidth: 920, marginBottom: spacing.md, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  jsonEditor: { width: '100%', maxWidth: 920, minHeight: 520, padding: spacing.md, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: '#171C20', color: '#E8EDF0', fontSize: 13, lineHeight: 20, fontFamily: 'monospace' },
  csvEditor: { width: '100%', maxWidth: 920, minHeight: 420, padding: spacing.md, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface, color: colors.ink, fontSize: 13, lineHeight: 20, fontFamily: 'monospace' },
  importFooter: { width: '100%', maxWidth: 920, marginTop: spacing.md, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  importMeta: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  pressed: { opacity: 0.78 },
  disabled: { opacity: 0.5 },
});
