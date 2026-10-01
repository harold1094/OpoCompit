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
  AdminAppConfig,
  AdminDailyReward,
  AdminMission,
  AdminOperationItem,
  AdminOperationKind,
  AdminOperations,
  AdminShopItem,
  AdminSubscriptionPlan,
  getAdminOperationsRemote,
  readableFirebaseError,
  upsertAdminOperationItemRemote,
} from '@/core/firebase/firebaseClient';

const operationTabs: Array<{
  kind: AdminOperationKind;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}> = [
  { kind: 'missions', label: 'Misiones', icon: 'target' },
  { kind: 'dailyRewards', label: 'Recompensas', icon: 'gift-outline' },
  { kind: 'shopItems', label: 'Tienda', icon: 'storefront-outline' },
  { kind: 'subscriptionPlans', label: 'Premium', icon: 'crown-outline' },
  { kind: 'appConfig', label: 'Configuración', icon: 'tune-variant' },
];

export function AdminOperationsPanel() {
  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const [kind, setKind] = useState<AdminOperationKind>('missions');
  const [operations, setOperations] = useState<AdminOperations | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AdminOperationItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadOperations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setOperations(await getAdminOperationsRemote());
    } catch (loadError) {
      setError(readableFirebaseError(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOperations();
  }, [loadOperations]);

  const items = useMemo<AdminOperationItem[]>(() => operations?.[kind] ?? [], [kind, operations]);

  useEffect(() => {
    const selected = items.find((item) => item.id === selectedId);
    if (selected) {
      setDraft(cloneOperation(selected));
      return;
    }
    const first = items[0] ?? null;
    setSelectedId(first?.id ?? null);
    setDraft(first ? cloneOperation(first) : null);
  }, [items, selectedId]);

  function selectKind(nextKind: AdminOperationKind) {
    setKind(nextKind);
    setSelectedId(null);
    setError(null);
    setNotice(null);
  }

  function selectItem(item: AdminOperationItem) {
    setSelectedId(item.id);
    setDraft(cloneOperation(item));
    setError(null);
    setNotice(null);
  }

  function createItem() {
    const next = newOperationItem(kind);
    if (!next) return;
    setSelectedId(null);
    setDraft(next);
    setError(null);
    setNotice(null);
  }

  function updateDraft(patch: Partial<AdminOperationItem>) {
    setDraft((current) => current ? { ...current, ...patch } as AdminOperationItem : current);
  }

  async function saveItem() {
    if (!draft || saving) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const saved = await upsertAdminOperationItemRemote(kind, draft);
      setSelectedId(saved.id);
      setNotice('Configuración guardada y disponible para la aplicación.');
      await loadOperations();
    } catch (saveError) {
      setError(readableFirebaseError(saveError));
    } finally {
      setSaving(false);
    }
  }

  const canCreate = kind !== 'shopItems' && kind !== 'appConfig';

  return (
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <View style={styles.headingRow}>
        <View style={styles.headingCopy}>
          <Text style={styles.eyebrow}>OPERACIÓN DEL PRODUCTO</Text>
          <Text style={styles.title}>Economía y engagement</Text>
        </View>
        <Pressable
          accessibilityLabel="Actualizar configuración"
          disabled={loading}
          onPress={() => void loadOperations()}
          style={({ pressed }) => [styles.refreshButton, pressed && styles.pressed]}
        >
          <MaterialCommunityIcons name="refresh" size={19} color={colors.ink} />
          <Text style={styles.refreshText}>Actualizar</Text>
        </Pressable>
      </View>

      <View style={styles.kindTabs}>
        {operationTabs.map((tab) => (
          <Pressable
            key={tab.kind}
            onPress={() => selectKind(tab.kind)}
            style={[styles.kindTab, tab.kind === kind && styles.kindTabActive]}
          >
            <MaterialCommunityIcons name={tab.icon} size={18} color={tab.kind === kind ? colors.brand : colors.muted} />
            <Text style={[styles.kindLabel, tab.kind === kind && styles.kindLabelActive]}>{tab.label}</Text>
            <Text style={styles.kindCount}>{operations?.[tab.kind].length ?? 0}</Text>
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
          <Text style={[styles.messageText, error ? styles.errorText : styles.successText]}>{error ?? notice}</Text>
        </View>
      ) : null}

      <View style={[styles.workspace, isWide ? styles.workspaceWide : styles.workspaceNarrow]}>
        <View style={[styles.listPane, isWide && styles.listPaneWide]}>
          <View style={styles.listHeader}>
            <View>
              <Text style={styles.listTitle}>{operationLabel(kind)}</Text>
              <Text style={styles.listMeta}>{items.length} registros</Text>
            </View>
            {canCreate ? (
              <Pressable onPress={createItem} style={({ pressed }) => [styles.newButton, pressed && styles.pressed]}>
                <MaterialCommunityIcons name="plus" size={19} color={colors.surface} />
                <Text style={styles.newButtonText}>Crear</Text>
              </Pressable>
            ) : null}
          </View>
          {loading ? (
            <CenterState icon="loading" label="Cargando configuración…" />
          ) : items.length === 0 ? (
            <CenterState icon="database-off-outline" label="No hay registros configurados." />
          ) : (
            <View>
              {items.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => selectItem(item)}
                  style={({ pressed }) => [
                    styles.itemRow,
                    item.id === selectedId && styles.itemRowActive,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.itemCopy}>
                    <Text numberOfLines={1} style={styles.itemName}>{operationItemName(item)}</Text>
                    <Text numberOfLines={1} style={styles.itemId}>{operationItemDetail(item)}</Text>
                  </View>
                  <View style={[styles.stateDot, operationEnabled(item) && styles.stateDotActive]} />
                  <MaterialCommunityIcons name="chevron-right" size={18} color={colors.muted} />
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <View style={styles.editorPane}>
          {draft ? (
            <OperationEditor
              draft={draft}
              isNew={selectedId === null}
              kind={kind}
              onChange={updateDraft}
              onSave={() => void saveItem()}
              saving={saving}
            />
          ) : (
            <CenterState icon="form-select" label="Selecciona o crea un registro." />
          )}
        </View>
      </View>
    </ScrollView>
  );
}

function OperationEditor({ draft, isNew, kind, onChange, onSave, saving }: {
  draft: AdminOperationItem;
  isNew: boolean;
  kind: AdminOperationKind;
  onChange: (patch: Partial<AdminOperationItem>) => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <View style={styles.editorContent}>
      <View style={styles.editorHeader}>
        <View style={styles.headingCopy}>
          <Text style={styles.eyebrow}>EDICIÓN RÁPIDA</Text>
          <Text numberOfLines={2} style={styles.editorTitle}>{operationItemName(draft)}</Text>
        </View>
        <MaterialCommunityIcons name="database-edit-outline" size={24} color={colors.aqua} />
      </View>
      <Field editable={isNew && kind !== 'appConfig'} label="ID estable" value={draft.id} onChangeText={(id) => onChange({ id } as Partial<AdminOperationItem>)} />

      {kind === 'missions' ? (
        <MissionFields item={draft as AdminMission} onChange={onChange} />
      ) : kind === 'dailyRewards' ? (
        <RewardFields item={draft as AdminDailyReward} onChange={onChange} />
      ) : kind === 'shopItems' ? (
        <ShopFields item={draft as AdminShopItem} onChange={onChange} />
      ) : kind === 'subscriptionPlans' ? (
        <PlanFields item={draft as AdminSubscriptionPlan} onChange={onChange} />
      ) : (
        <ConfigFields item={draft as AdminAppConfig} onChange={onChange} />
      )}

      <View style={styles.saveBar}>
        <Text style={styles.saveHint}>Los cambios se validan y se aplican desde Firebase.</Text>
        <Pressable disabled={saving} onPress={onSave} style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}>
          {saving ? <ActivityIndicator color={colors.surface} size="small" /> : <MaterialCommunityIcons name="content-save-outline" size={19} color={colors.surface} />}
          <Text style={styles.saveButtonText}>Guardar</Text>
        </Pressable>
      </View>
    </View>
  );
}

function MissionFields({ item, onChange }: EditorProps<AdminMission>) {
  return <>
    <Field label="Título" value={item.title} onChangeText={(title) => onChange({ title })} />
    <Field label="Descripción" value={item.description} onChangeText={(description) => onChange({ description })} />
    <ChoiceField label="Tipo" options={[
      ['completeQuickMatches', 'Partidas'], ['answerQuestions', 'Preguntas'], ['correctAnswers', 'Aciertos'],
    ]} value={item.type} onChange={(type) => onChange({ type: type as AdminMission['type'] })} />
    <View style={styles.threeColumns}>
      <NumberField label="Objetivo" value={item.target} onChange={(target) => onChange({ target })} />
      <NumberField label="XP" value={item.rewardXp} onChange={(rewardXp) => onChange({ rewardXp })} />
      <NumberField label="Monedas" value={item.rewardCoins} onChange={(rewardCoins) => onChange({ rewardCoins })} />
    </View>
    <NumberField label="Prioridad" value={item.priority} onChange={(priority) => onChange({ priority })} />
    <Toggle label="Misión activa" detail="Aparece en la rotación diaria." value={item.active} onChange={(active) => onChange({ active })} />
  </>;
}

function RewardFields({ item, onChange }: EditorProps<AdminDailyReward>) {
  return <>
    <View style={styles.threeColumns}>
      <NumberField label="Día" value={item.day} onChange={(day) => onChange({ day })} />
      <NumberField label="Monedas" value={item.coins} onChange={(coins) => onChange({ coins })} />
      <NumberField label="Gemas" value={item.gems} onChange={(gems) => onChange({ gems })} />
    </View>
    <Toggle label="Recompensa activa" detail="Forma parte del ciclo de acceso diario." value={item.active} onChange={(active) => onChange({ active })} />
  </>;
}

function ShopFields({ item, onChange }: EditorProps<AdminShopItem>) {
  return <>
    <Field label="Nombre" value={item.name} onChangeText={(name) => onChange({ name })} />
    <View style={styles.twoColumns}>
      <Field editable={false} label="Categoría visual" value={item.category} onChangeText={() => undefined} />
      <Field editable={false} label="Hueco del avatar" value={item.slot} onChangeText={() => undefined} />
    </View>
    <ChoiceField label="Rareza" options={[
      ['common', 'Común'], ['rare', 'Raro'], ['epic', 'Épico'], ['legendary', 'Legendario'],
    ]} value={item.rarity} onChange={(rarity) => onChange({ rarity: rarity as AdminShopItem['rarity'] })} />
    <View style={styles.twoColumns}>
      <NumberField label="Precio" value={item.price} onChange={(price) => onChange({ price })} />
      <ChoiceField label="Moneda" options={[["coins", "Monedas"], ["gems", "Gemas"]]} value={item.currency} onChange={(currency) => onChange({ currency: currency as AdminShopItem['currency'] })} />
    </View>
    <NumberField label="Prioridad" value={item.priority} onChange={(priority) => onChange({ priority })} />
    <Toggle label="Objeto activo" detail="Está visible y puede comprarse." value={item.active} onChange={(active) => onChange({ active })} />
    <Toggle label="Exclusivo Premium" detail="Requiere una suscripción válida para comprarlo." value={item.premiumOnly} onChange={(premiumOnly) => onChange({ premiumOnly })} />
  </>;
}

function PlanFields({ item, onChange }: EditorProps<AdminSubscriptionPlan>) {
  function toggleFeature(feature: AdminSubscriptionPlan['features'][number]) {
    onChange({ features: item.features.includes(feature) ? item.features.filter((value) => value !== feature) : [...item.features, feature] });
  }
  return <>
    <View style={styles.twoColumns}>
      <Field label="Nombre" value={item.name} onChangeText={(name) => onChange({ name })} />
      <Field label="Precio visible" value={item.priceLabel} onChangeText={(priceLabel) => onChange({ priceLabel })} />
    </View>
    <ChoiceField label="Periodo" options={[["monthly", "Mensual"], ["yearly", "Anual"]]} value={item.billingPeriod} onChange={(billingPeriod) => onChange({ billingPeriod: billingPeriod as AdminSubscriptionPlan['billingPeriod'] })} />
    <Text style={styles.fieldLabel}>Beneficios</Text>
    <View style={styles.choiceRow}>
      {(['ad_free', 'monthly_gems', 'exclusive_cosmetics', 'advanced_stats'] as const).map((feature) => (
        <Choice key={feature} active={item.features.includes(feature)} label={featureLabel(feature)} onPress={() => toggleFeature(feature)} />
      ))}
    </View>
    <View style={styles.twoColumns}>
      <NumberField label="Gemas por periodo" value={item.gemReward} onChange={(gemReward) => onChange({ gemReward })} />
      <NumberField label="Prioridad" value={item.priority} onChange={(priority) => onChange({ priority })} />
    </View>
    <Field label="ID de producto en la tienda" value={item.storeProductId ?? ''} onChangeText={(storeProductId) => onChange({ storeProductId: storeProductId.trim() || null })} />
    <Toggle label="Plan activo" detail="Puede mostrarse en la pantalla Premium." value={item.active} onChange={(active) => onChange({ active })} />
    <Toggle label="Sin anuncios" detail="Elimina los anuncios permitidos." value={item.adFree} onChange={(adFree) => onChange({ adFree })} />
    <Toggle label="Cosméticos exclusivos" detail="Desbloquea contenido marcado como Premium." value={item.exclusiveCosmetics} onChange={(exclusiveCosmetics) => onChange({ exclusiveCosmetics })} />
    <Toggle label="Compra habilitada" detail="Solo activar con un producto real configurado." value={item.purchasable} onChange={(purchasable) => onChange({ purchasable })} />
  </>;
}

function ConfigFields({ item, onChange }: EditorProps<AdminAppConfig>) {
  return <>
    <View style={styles.configWarning}>
      <MaterialCommunityIcons name="shield-check-outline" size={20} color={colors.aqua} />
      <Text style={styles.configWarningText}>Los anuncios permanecen apagados hasta que el proveedor también esté preparado.</Text>
    </View>
    <Toggle label="Publicidad habilitada" detail="Permite anuncios solo en superficies no disruptivas." value={item.adsEnabled} onChange={(adsEnabled) => onChange({ adsEnabled })} />
    <Toggle label="Anuncios recompensados" detail="Permite recompensas voluntarias cuando exista proveedor." value={item.rewardedAdsEnabled} onChange={(rewardedAdsEnabled) => onChange({ rewardedAdsEnabled })} />
    <Toggle label="Proveedor preparado" detail="Interruptor de seguridad para producción." value={item.adProviderReady} onChange={(adProviderReady) => onChange({ adProviderReady })} />
    <NumberField label="Intervalo entre resultados" value={item.resultInterval} onChange={(resultInterval) => onChange({ resultInterval })} />
  </>;
}

type EditorProps<T extends AdminOperationItem> = {
  item: T;
  onChange: (patch: Partial<AdminOperationItem>) => void;
};

function Field({ label, value, onChangeText, editable = true }: { label: string; value: string; onChangeText: (value: string) => void; editable?: boolean }) {
  return <View style={styles.field}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput autoCapitalize="none" editable={editable} onChangeText={onChangeText} style={[styles.input, !editable && styles.inputDisabled]} value={value} />
  </View>;
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <Field label={label} value={String(value)} onChangeText={(text) => onChange(Number.parseInt(text, 10) || 0)} />;
}

function ChoiceField({ label, options, value, onChange }: { label: string; options: string[][]; value: string; onChange: (value: string) => void }) {
  return <View style={styles.field}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <View style={styles.choiceRow}>{options.map(([id, optionLabel]) => <Choice key={id} active={id === value} label={optionLabel} onPress={() => onChange(id)} />)}</View>
  </View>;
}

function Choice({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.choice, active && styles.choiceActive]}>
    <Text style={[styles.choiceText, active && styles.choiceTextActive]}>{label}</Text>
  </Pressable>;
}

function Toggle({ label, detail, value, onChange }: { label: string; detail: string; value: boolean; onChange: (value: boolean) => void }) {
  return <Pressable onPress={() => onChange(!value)} style={styles.toggle}>
    <MaterialCommunityIcons name={value ? 'toggle-switch' : 'toggle-switch-off-outline'} size={34} color={value ? colors.aqua : colors.muted} />
    <View style={styles.toggleCopy}>
      <Text style={styles.toggleTitle}>{label}</Text>
      <Text style={styles.toggleDetail}>{detail}</Text>
    </View>
  </Pressable>;
}

function CenterState({ icon, label }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string }) {
  return <View style={styles.centerState}>
    {icon === 'loading' ? <ActivityIndicator color={colors.brand} /> : <MaterialCommunityIcons name={icon} size={34} color={colors.muted} />}
    <Text style={styles.mutedText}>{label}</Text>
  </View>;
}

function newOperationItem(kind: AdminOperationKind): AdminOperationItem | null {
  if (kind === 'missions') return { id: 'new_mission', title: 'Nueva misión', description: 'Completa el objetivo.', type: 'answerQuestions', target: 10, rewardXp: 20, rewardCoins: 10, active: true, priority: 0 };
  if (kind === 'dailyRewards') return { id: 'new_reward', day: 1, coins: 25, gems: 0, active: true };
  if (kind === 'subscriptionPlans') return { id: 'new_plan', name: 'Nuevo plan', priceLabel: 'Próximamente', billingPeriod: 'monthly', features: ['ad_free'], gemReward: 0, adFree: true, exclusiveCosmetics: false, active: false, priority: 0, storeProductId: null, purchasable: false };
  return null;
}

function cloneOperation(item: AdminOperationItem): AdminOperationItem {
  return 'features' in item ? { ...item, features: [...item.features] } : { ...item };
}

function operationItemName(item: AdminOperationItem): string {
  if ('name' in item) return item.name;
  if ('title' in item) return item.title;
  if ('day' in item) return `Día ${item.day}`;
  return 'Configuración de monetización';
}

function operationItemDetail(item: AdminOperationItem): string {
  if ('target' in item) return `${item.target} objetivo · ${item.rewardCoins} monedas`;
  if ('day' in item) return `${item.coins} monedas · ${item.gems} gemas`;
  if ('price' in item) return `${item.price} ${item.currency}`;
  if ('billingPeriod' in item) return `${item.priceLabel} · ${item.billingPeriod}`;
  return `Intervalo ${item.resultInterval}`;
}

function operationEnabled(item: AdminOperationItem): boolean {
  if ('active' in item) return item.active;
  return item.adProviderReady;
}

function operationLabel(kind: AdminOperationKind): string {
  return operationTabs.find((tab) => tab.kind === kind)?.label ?? 'Operación';
}

function featureLabel(feature: AdminSubscriptionPlan['features'][number]): string {
  const labels = { ad_free: 'Sin anuncios', monthly_gems: 'Gemas', exclusive_cosmetics: 'Cosméticos', advanced_stats: 'Estadísticas' };
  return labels[feature];
}

const styles = StyleSheet.create({
  page: { width: '100%', maxWidth: 1240, alignSelf: 'center', padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  headingRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  headingCopy: { flex: 1, minWidth: 220 },
  eyebrow: { color: colors.aqua, fontSize: 11, fontWeight: '900', letterSpacing: 0 },
  title: { color: colors.ink, fontSize: 24, fontWeight: '900', marginTop: 3 },
  refreshButton: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, paddingHorizontal: 12, borderRadius: 8 },
  refreshText: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  kindTabs: { flexDirection: 'row', flexWrap: 'wrap', borderBottomWidth: 1, borderBottomColor: colors.line },
  kindTab: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 13, borderBottomWidth: 3, borderBottomColor: 'transparent' },
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
  listPaneWide: { width: 350, minHeight: 440, flexShrink: 0 },
  listHeader: { minHeight: 66, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, paddingHorizontal: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.line },
  listTitle: { color: colors.ink, fontSize: 16, fontWeight: '900' },
  listMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  newButton: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.brand, paddingHorizontal: 11, borderRadius: 8 },
  newButtonText: { color: colors.surface, fontSize: 13, fontWeight: '900' },
  centerState: { minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.lg },
  mutedText: { color: colors.muted, fontSize: 13, textAlign: 'center' },
  itemRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, borderLeftWidth: 3, borderLeftColor: 'transparent', borderBottomWidth: 1, borderBottomColor: colors.line },
  itemRowActive: { backgroundColor: colors.softBrand, borderLeftColor: colors.brand },
  itemCopy: { flex: 1, minWidth: 0 },
  itemName: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  itemId: { color: colors.muted, fontSize: 11, marginTop: 3 },
  stateDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.line },
  stateDotActive: { backgroundColor: colors.success },
  editorPane: { flex: 1, minWidth: 0, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 8, minHeight: 440 },
  editorContent: { padding: spacing.lg, gap: 12 },
  editorHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  editorTitle: { color: colors.ink, fontSize: 19, fontWeight: '900', marginTop: 3 },
  field: { flex: 1, minWidth: 170, gap: 6 },
  fieldLabel: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  input: { minHeight: 42, color: colors.ink, backgroundColor: colors.field, borderWidth: 1, borderColor: colors.line, borderRadius: 7, paddingHorizontal: 11, fontSize: 14 },
  inputDisabled: { color: colors.muted, backgroundColor: '#F1F4F6' },
  twoColumns: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  threeColumns: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  choice: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 7, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  choiceActive: { borderColor: colors.aqua, backgroundColor: colors.softAqua },
  choiceText: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  choiceTextActive: { color: colors.aqua },
  toggle: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.field, borderWidth: 1, borderColor: colors.line, borderRadius: 8, paddingHorizontal: 12 },
  toggleCopy: { flex: 1, minWidth: 0 },
  toggleTitle: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  toggleDetail: { color: colors.muted, fontSize: 11, marginTop: 2 },
  configWarning: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 12, borderRadius: 8, backgroundColor: colors.softAqua, borderWidth: 1, borderColor: '#BFE8E0' },
  configWarningText: { flex: 1, color: colors.aqua, fontSize: 12, lineHeight: 17, fontWeight: '700' },
  saveBar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.line },
  saveHint: { flex: 1, minWidth: 180, color: colors.muted, fontSize: 11 },
  saveButton: { minHeight: 42, minWidth: 112, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: colors.success, borderRadius: 8, paddingHorizontal: 14 },
  saveButtonText: { color: colors.surface, fontSize: 13, fontWeight: '900' },
  pressed: { opacity: 0.72 },
});
