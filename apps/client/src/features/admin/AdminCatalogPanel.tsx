import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { colors, spacing } from '@/core/design/tokens';
import {
  AdminCatalog,
  AdminCatalogItem,
  AdminCatalogKind,
  AdminCategory,
  AdminOfficialExam,
  AdminOpposition,
  AdminTerritory,
  getAdminCatalogRemote,
  readableFirebaseError,
  upsertAdminCatalogItemRemote,
} from '@/core/firebase/firebaseClient';

const catalogOptions: Array<{
  kind: AdminCatalogKind;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}> = [
  { kind: 'oppositions', label: 'Oposiciones', icon: 'briefcase-outline' },
  { kind: 'territories', label: 'Territorios', icon: 'map-marker-outline' },
  { kind: 'categories', label: 'Categorías', icon: 'shape-outline' },
  { kind: 'officialExams', label: 'Exámenes', icon: 'file-certificate-outline' },
];

export function AdminCatalogPanel() {
  const { width } = useWindowDimensions();
  const isWide = width >= 880;
  const [kind, setKind] = useState<AdminCatalogKind>('oppositions');
  const [catalog, setCatalog] = useState<AdminCatalog | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AdminCatalogItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCatalog(await getAdminCatalogRemote());
    } catch (loadError) {
      setError(readableFirebaseError(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const items = useMemo<AdminCatalogItem[]>(() => catalog?.[kind] ?? [], [catalog, kind]);

  useEffect(() => {
    const selected = items.find((item) => item.id === selectedId);
    if (selected) {
      setDraft(cloneCatalogItem(selected));
      return;
    }
    const first = items[0] ?? null;
    setSelectedId(first?.id ?? null);
    setDraft(first ? cloneCatalogItem(first) : null);
  }, [items, selectedId]);

  function changeKind(nextKind: AdminCatalogKind) {
    setKind(nextKind);
    setSelectedId(null);
    setNotice(null);
    setError(null);
  }

  function selectItem(item: AdminCatalogItem) {
    setSelectedId(item.id);
    setDraft(cloneCatalogItem(item));
    setNotice(null);
    setError(null);
  }

  function createItem() {
    const next = newCatalogItem(kind, catalog);
    setSelectedId(null);
    setDraft(next);
    setNotice(null);
    setError(null);
  }

  function updateDraft(patch: Partial<AdminCatalogItem>) {
    setDraft((current) => current ? { ...current, ...patch } as AdminCatalogItem : current);
  }

  async function saveItem() {
    if (!draft || saving) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const saved = await upsertAdminCatalogItemRemote(kind, draft);
      setSelectedId(saved.id);
      setNotice('Cambios guardados en el catálogo.');
      await loadCatalog();
    } catch (saveError) {
      setError(readableFirebaseError(saveError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <View style={styles.headingRow}>
        <View>
          <Text style={styles.eyebrow}>CONTENIDO BASE</Text>
          <Text style={styles.title}>Catálogos administrativos</Text>
        </View>
        <Pressable
          accessibilityLabel="Actualizar catálogos"
          disabled={loading}
          onPress={() => void loadCatalog()}
          style={({ pressed }) => [styles.refreshButton, pressed && styles.pressed]}
        >
          <MaterialCommunityIcons name="refresh" size={19} color={colors.ink} />
          <Text style={styles.refreshText}>Actualizar</Text>
        </Pressable>
      </View>

      <View style={styles.kindTabs}>
        {catalogOptions.map((option) => (
          <Pressable
            key={option.kind}
            onPress={() => changeKind(option.kind)}
            style={[styles.kindTab, kind === option.kind && styles.kindTabActive]}
          >
            <MaterialCommunityIcons
              name={option.icon}
              size={18}
              color={kind === option.kind ? colors.brand : colors.muted}
            />
            <Text style={[styles.kindLabel, kind === option.kind && styles.kindLabelActive]}>
              {option.label}
            </Text>
            <Text style={styles.kindCount}>{catalog?.[option.kind].length ?? 0}</Text>
          </Pressable>
        ))}
      </View>

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

      <View style={[styles.workspace, isWide ? styles.workspaceWide : styles.workspaceNarrow]}>
        <View style={[styles.listPane, isWide && styles.listPaneWide]}>
          <View style={styles.listHeader}>
            <View>
              <Text style={styles.listTitle}>{catalogLabel(kind)}</Text>
              <Text style={styles.listMeta}>{items.length} registros</Text>
            </View>
            <Pressable
              accessibilityLabel={`Crear ${catalogLabel(kind).toLocaleLowerCase('es')}`}
              onPress={createItem}
              style={({ pressed }) => [styles.newButton, pressed && styles.pressed]}
            >
              <MaterialCommunityIcons name="plus" size={19} color={colors.surface} />
              <Text style={styles.newButtonText}>Crear</Text>
            </Pressable>
          </View>
          {loading ? (
            <View style={styles.centerState}>
              <ActivityIndicator color={colors.brand} />
              <Text style={styles.mutedText}>Cargando catálogos…</Text>
            </View>
          ) : items.length === 0 ? (
            <View style={styles.centerState}>
              <MaterialCommunityIcons name="database-off-outline" size={32} color={colors.muted} />
              <Text style={styles.mutedText}>Todavía no hay registros.</Text>
            </View>
          ) : (
            <View style={styles.itemList}>
              {items.map((item) => {
                const active = item.id === selectedId;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => selectItem(item)}
                    style={({ pressed }) => [
                      styles.itemRow,
                      active && styles.itemRowActive,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.itemCopy}>
                      <Text numberOfLines={1} style={styles.itemName}>{catalogItemName(item)}</Text>
                      <Text numberOfLines={1} style={styles.itemId}>{item.id}</Text>
                    </View>
                    <View style={[styles.stateDot, isCatalogItemEnabled(item) && styles.stateDotActive]} />
                    <MaterialCommunityIcons name="chevron-right" size={18} color={colors.muted} />
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.editorPane}>
          {draft ? (
            <CatalogEditor
              draft={draft}
              isNew={selectedId === null}
              kind={kind}
              onChange={updateDraft}
              onSave={() => void saveItem()}
              saving={saving}
            />
          ) : (
            <View style={styles.centerState}>
              <MaterialCommunityIcons name="form-select" size={38} color={colors.muted} />
              <Text style={styles.mutedText}>Selecciona o crea un registro.</Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

function CatalogEditor({ draft, isNew, kind, onChange, onSave, saving }: {
  draft: AdminCatalogItem;
  isNew: boolean;
  kind: AdminCatalogKind;
  onChange: (patch: Partial<AdminCatalogItem>) => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <View style={styles.editorContent}>
      <View style={styles.editorHeader}>
        <View style={styles.editorTitleCopy}>
          <Text style={styles.eyebrow}>EDICIÓN RÁPIDA</Text>
          <Text numberOfLines={1} style={styles.editorTitle}>{catalogItemName(draft)}</Text>
        </View>
        <MaterialCommunityIcons name="database-edit-outline" size={24} color={colors.aqua} />
      </View>

      <LabeledInput
        editable={isNew}
        label="ID estable"
        onChangeText={(id) => onChange({ id } as Partial<AdminCatalogItem>)}
        value={draft.id}
      />
      {kind === 'oppositions' ? (
        <OppositionFields item={draft as AdminOpposition} onChange={onChange} />
      ) : kind === 'territories' ? (
        <TerritoryFields item={draft as AdminTerritory} onChange={onChange} />
      ) : kind === 'categories' ? (
        <CategoryFields item={draft as AdminCategory} onChange={onChange} />
      ) : (
        <ExamFields item={draft as AdminOfficialExam} onChange={onChange} />
      )}

      <View style={styles.saveBar}>
        <Text style={styles.saveHint}>Los IDs se usan en preguntas y relaciones.</Text>
        <Pressable
          disabled={saving}
          onPress={onSave}
          style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}
        >
          {saving ? (
            <ActivityIndicator color={colors.surface} size="small" />
          ) : (
            <MaterialCommunityIcons name="content-save-outline" size={19} color={colors.surface} />
          )}
          <Text style={styles.saveButtonText}>Guardar</Text>
        </Pressable>
      </View>
    </View>
  );
}

function OppositionFields({ item, onChange }: {
  item: AdminOpposition;
  onChange: (patch: Partial<AdminCatalogItem>) => void;
}) {
  return (
    <>
      <View style={styles.twoColumns}>
        <LabeledInput label="Nombre" value={item.name} onChangeText={(name) => onChange({ name })} />
        <LabeledInput label="Slug" value={item.slug} onChangeText={(slug) => onChange({ slug })} />
      </View>
      <LabeledInput
        keyboardType="number-pad"
        label="Prioridad"
        value={String(item.priority)}
        onChangeText={(value) => onChange({ priority: numeric(value) })}
      />
      <ActiveToggle active={item.active} onChange={(active) => onChange({ active })} />
    </>
  );
}

function TerritoryFields({ item, onChange }: {
  item: AdminTerritory;
  onChange: (patch: Partial<AdminCatalogItem>) => void;
}) {
  return (
    <>
      <View style={styles.twoColumns}>
        <LabeledInput label="Nombre visible" value={item.label} onChangeText={(label) => onChange({ label })} />
        <LabeledInput label="País" value={item.country} onChangeText={(country) => onChange({ country })} />
      </View>
      <View style={styles.twoColumns}>
        <LabeledInput
          label="Comunidad autónoma"
          value={item.autonomousCommunity ?? ''}
          onChangeText={(autonomousCommunity) => onChange({ autonomousCommunity: nullable(autonomousCommunity) })}
        />
        <LabeledInput label="Provincia" value={item.province ?? ''} onChangeText={(province) => onChange({ province: nullable(province) })} />
      </View>
      <View style={styles.twoColumns}>
        <LabeledInput label="Municipio" value={item.municipality ?? ''} onChangeText={(municipality) => onChange({ municipality: nullable(municipality) })} />
        <LabeledInput label="Cuerpo específico" value={item.specificBody ?? ''} onChangeText={(specificBody) => onChange({ specificBody: nullable(specificBody) })} />
      </View>
      <LabeledInput keyboardType="number-pad" label="Prioridad" value={String(item.priority)} onChangeText={(value) => onChange({ priority: numeric(value) })} />
      <ActiveToggle active={item.active} onChange={(active) => onChange({ active })} />
    </>
  );
}

function CategoryFields({ item, onChange }: {
  item: AdminCategory;
  onChange: (patch: Partial<AdminCatalogItem>) => void;
}) {
  return (
    <>
      <View style={styles.twoColumns}>
        <LabeledInput label="Nombre" value={item.name} onChangeText={(name) => onChange({ name })} />
        <LabeledInput label="Oposición" value={item.oppositionId} onChangeText={(oppositionId) => onChange({ oppositionId })} />
      </View>
      <View style={styles.twoColumns}>
        <LabeledInput label="Categoría superior" value={item.parentId ?? ''} onChangeText={(parentId) => onChange({ parentId: nullable(parentId) })} />
        <LabeledInput keyboardType="number-pad" label="Prioridad" value={String(item.priority)} onChangeText={(value) => onChange({ priority: numeric(value) })} />
      </View>
      <ActiveToggle active={item.active} onChange={(active) => onChange({ active })} />
    </>
  );
}

function ExamFields({ item, onChange }: {
  item: AdminOfficialExam;
  onChange: (patch: Partial<AdminCatalogItem>) => void;
}) {
  function changeRule(patch: Partial<AdminOfficialExam['rules']>) {
    onChange({ rules: { ...item.rules, ...patch } } as Partial<AdminCatalogItem>);
  }
  return (
    <>
      <LabeledInput label="Nombre" value={item.name} onChangeText={(name) => onChange({ name })} />
      <View style={styles.twoColumns}>
        <LabeledInput label="Oposición" value={item.oppositionId} onChangeText={(oppositionId) => onChange({ oppositionId })} />
        <LabeledInput label="Fecha" value={item.date} onChangeText={(date) => onChange({ date, year: numeric(date.slice(0, 4)) })} />
      </View>
      <LabeledInput label="Ámbitos (separados por coma)" value={item.territoryKeys.join(', ')} onChangeText={(value) => onChange({ territoryKeys: commaList(value) })} />
      <LabeledInput label="Fuente oficial" value={item.source} onChangeText={(source) => onChange({ source })} />
      <Text style={styles.fieldLabel}>Estado</Text>
      <View style={styles.choiceRow}>
        {(['draft', 'published', 'disabled'] as const).map((status) => (
          <ChoiceButton key={status} active={item.status === status} label={examStatusLabel(status)} onPress={() => onChange({ status })} />
        ))}
      </View>
      <Text style={styles.subheading}>Reglas del examen</Text>
      <View style={styles.twoColumns}>
        <LabeledInput keyboardType="number-pad" label="Preguntas" value={String(item.rules.questionCount)} onChangeText={(value) => changeRule({ questionCount: numeric(value) })} />
        <LabeledInput keyboardType="number-pad" label="Duración (seg.)" value={String(item.rules.durationSeconds)} onChangeText={(value) => changeRule({ durationSeconds: numeric(value) })} />
      </View>
      <View style={styles.threeColumns}>
        <LabeledInput keyboardType="decimal-pad" label="Acierto" value={String(item.rules.correctPoints)} onChangeText={(value) => changeRule({ correctPoints: decimal(value) })} />
        <LabeledInput keyboardType="decimal-pad" label="Fallo" value={String(item.rules.incorrectPenalty)} onChangeText={(value) => changeRule({ incorrectPenalty: decimal(value) })} />
        <LabeledInput keyboardType="decimal-pad" label="En blanco" value={String(item.rules.blankPoints)} onChangeText={(value) => changeRule({ blankPoints: decimal(value) })} />
      </View>
    </>
  );
}

function LabeledInput({ label, value, onChangeText, keyboardType, editable = true }: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'number-pad' | 'decimal-pad';
  editable?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        autoCapitalize="none"
        editable={editable}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        style={[styles.input, !editable && styles.inputDisabled]}
        value={value}
      />
    </View>
  );
}

function ActiveToggle({ active, onChange }: { active: boolean; onChange: (active: boolean) => void }) {
  return (
    <Pressable onPress={() => onChange(!active)} style={styles.toggleRow}>
      <MaterialCommunityIcons
        name={active ? 'toggle-switch' : 'toggle-switch-off-outline'}
        size={34}
        color={active ? colors.aqua : colors.muted}
      />
      <View>
        <Text style={styles.toggleTitle}>{active ? 'Registro activo' : 'Registro desactivado'}</Text>
        <Text style={styles.toggleDetail}>Controla si puede usarse en nuevo contenido.</Text>
      </View>
    </Pressable>
  );
}

function ChoiceButton({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.choiceButton, active && styles.choiceButtonActive]}>
      <Text style={[styles.choiceText, active && styles.choiceTextActive]}>{label}</Text>
    </Pressable>
  );
}

function newCatalogItem(kind: AdminCatalogKind, catalog: AdminCatalog | null): AdminCatalogItem {
  const oppositionId = catalog?.oppositions[0]?.id ?? 'firefighters_es';
  if (kind === 'oppositions') {
    return { id: 'new_opposition', name: 'Nueva oposición', slug: 'nueva-oposicion', active: true, priority: 0 };
  }
  if (kind === 'territories') {
    return { id: 'new_territory', label: 'Nuevo territorio', country: 'ES', autonomousCommunity: null, province: null, municipality: null, specificBody: null, active: true, priority: 0 };
  }
  if (kind === 'categories') {
    return { id: 'new_category', oppositionId, name: 'Nueva categoría', parentId: null, active: true, priority: 0 };
  }
  return {
    id: 'new_exam', oppositionId, name: 'Nuevo examen oficial', date: '2026-01-01', year: 2026,
    territoryKeys: ['ES'], source: 'Fuente oficial', status: 'draft',
    rules: { questionCount: 100, durationSeconds: 7_200, correctPoints: 1, incorrectPenalty: 0.33, blankPoints: 0 },
  };
}

function cloneCatalogItem(item: AdminCatalogItem): AdminCatalogItem {
  if ('rules' in item) return { ...item, territoryKeys: [...item.territoryKeys], rules: { ...item.rules } };
  return { ...item };
}

function catalogItemName(item: AdminCatalogItem): string {
  return 'name' in item ? item.name : item.label;
}

function isCatalogItemEnabled(item: AdminCatalogItem): boolean {
  return 'active' in item ? item.active : item.status === 'published';
}

function catalogLabel(kind: AdminCatalogKind): string {
  return catalogOptions.find((option) => option.kind === kind)?.label ?? 'Catálogo';
}

function examStatusLabel(status: AdminOfficialExam['status']): string {
  return status === 'draft' ? 'Borrador' : status === 'published' ? 'Publicado' : 'Desactivado';
}

function nullable(value: string): string | null {
  return value.trim() || null;
}

function numeric(value: string): number {
  return Number.parseInt(value, 10) || 0;
}

function decimal(value: string): number {
  return Number.parseFloat(value.replace(',', '.')) || 0;
}

function commaList(value: string): string[] {
  return value.split(',').map((entry) => entry.trim()).filter(Boolean);
}

const styles = StyleSheet.create({
  page: { padding: spacing.lg, paddingBottom: spacing.xxl, width: '100%', maxWidth: 1240, alignSelf: 'center', gap: spacing.md },
  headingRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  eyebrow: { color: colors.aqua, fontSize: 11, fontWeight: '900', letterSpacing: 0 },
  title: { color: colors.ink, fontSize: 24, fontWeight: '900', marginTop: 3 },
  refreshButton: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, paddingHorizontal: 12, borderRadius: 8 },
  refreshText: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  kindTabs: { flexDirection: 'row', flexWrap: 'wrap', borderBottomWidth: 1, borderBottomColor: colors.line },
  kindTab: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  kindTabActive: { borderBottomColor: colors.brand },
  kindLabel: { color: colors.muted, fontSize: 13, fontWeight: '800' },
  kindLabelActive: { color: colors.ink },
  kindCount: { color: colors.muted, fontSize: 11, fontWeight: '800', backgroundColor: colors.field, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  message: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: 12, borderWidth: 1, borderRadius: 8 },
  errorMessage: { backgroundColor: '#FFF3F3', borderColor: '#F6CCCC' },
  successMessage: { backgroundColor: '#EFFAF3', borderColor: '#BCE8CB' },
  messageText: { flex: 1, fontSize: 13, fontWeight: '700' },
  errorText: { color: colors.danger },
  successText: { color: colors.success },
  workspace: { alignItems: 'stretch', gap: spacing.md },
  workspaceWide: { flexDirection: 'row' },
  workspaceNarrow: { flexDirection: 'column' },
  listPane: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 8, overflow: 'hidden' },
  listPaneWide: { width: 350, minHeight: 420, flexShrink: 0 },
  listHeader: { minHeight: 66, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, paddingHorizontal: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.line },
  listTitle: { color: colors.ink, fontSize: 16, fontWeight: '900' },
  listMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  newButton: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.brand, paddingHorizontal: 11, borderRadius: 8 },
  newButtonText: { color: colors.surface, fontSize: 13, fontWeight: '900' },
  centerState: { minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.lg },
  mutedText: { color: colors.muted, fontSize: 13, textAlign: 'center' },
  itemList: { paddingVertical: 4 },
  itemRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, borderLeftWidth: 3, borderLeftColor: 'transparent', borderBottomWidth: 1, borderBottomColor: colors.line },
  itemRowActive: { backgroundColor: colors.softBrand, borderLeftColor: colors.brand },
  itemCopy: { flex: 1, minWidth: 0 },
  itemName: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  itemId: { color: colors.muted, fontSize: 11, marginTop: 3 },
  stateDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.line },
  stateDotActive: { backgroundColor: colors.success },
  editorPane: { flex: 1, minWidth: 0, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 8, minHeight: 420 },
  editorContent: { padding: spacing.lg, gap: 12 },
  editorHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  editorTitleCopy: { flex: 1, minWidth: 0 },
  editorTitle: { color: colors.ink, fontSize: 19, fontWeight: '900', marginTop: 3 },
  twoColumns: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  threeColumns: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  field: { flex: 1, minWidth: 180, gap: 6 },
  fieldLabel: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  input: { minHeight: 42, color: colors.ink, backgroundColor: colors.field, borderWidth: 1, borderColor: colors.line, borderRadius: 7, paddingHorizontal: 11, fontSize: 14 },
  inputDisabled: { color: colors.muted, backgroundColor: '#F1F4F6' },
  toggleRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.field, borderWidth: 1, borderColor: colors.line, borderRadius: 8, paddingHorizontal: 12 },
  toggleTitle: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  toggleDetail: { color: colors.muted, fontSize: 11, marginTop: 2 },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  choiceButton: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 7, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  choiceButtonActive: { borderColor: colors.aqua, backgroundColor: colors.softAqua },
  choiceText: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  choiceTextActive: { color: colors.aqua },
  subheading: { color: colors.ink, fontSize: 14, fontWeight: '900', marginTop: 6, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.line },
  saveBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.line },
  saveHint: { flex: 1, color: colors.muted, fontSize: 11 },
  saveButton: { minHeight: 42, minWidth: 112, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: colors.success, borderRadius: 8, paddingHorizontal: 14 },
  saveButtonText: { color: colors.surface, fontSize: 13, fontWeight: '900' },
  pressed: { opacity: 0.72 },
});
