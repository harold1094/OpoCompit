import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, radius, shadows, spacing } from '@/core/design/tokens';
import { AvatarItemCategory } from '@/core/domain/types';
import { AvatarPreview } from '@/features/avatar/components/AvatarPreview';
import {
  avatarCatalog,
  avatarCategories,
  LocalAvatarShopItem,
} from '@/features/avatar/data/avatarCatalog';
import { useAppStore } from '@/features/app-state/useAppStore';
import { AppScreen } from '@/shared/components/AppScreen';

type ViewMode = 'wardrobe' | 'shop';

export default function AvatarShopScreen() {
  const profile = useAppStore((state) => state.profile);
  const inventory = useAppStore((state) => state.avatarInventory);
  const actionId = useAppStore((state) => state.avatarActionId);
  const error = useAppStore((state) => state.avatarError);
  const refresh = useAppStore((state) => state.refreshAvatarShop);
  const purchase = useAppStore((state) => state.purchaseAvatarItem);
  const equip = useAppStore((state) => state.equipAvatarItem);
  const [mode, setMode] = useState<ViewMode>('wardrobe');
  const [category, setCategory] = useState<AvatarItemCategory>('avatars');

  useFocusEffect(useCallback(() => {
    void refresh();
  }, [refresh]));

  const effectiveCatalog = useMemo(() => {
    const remoteItems = inventory.items ?? [];
    if (remoteItems.length === 0) return [...avatarCatalog];
    return remoteItems.flatMap((remoteItem) => {
      const localItem = avatarCatalog.find((item) => item.id === remoteItem.id);
      return localItem ? [{ ...localItem, ...remoteItem }] : [];
    });
  }, [inventory.items]);

  const visibleItems = useMemo(() => effectiveCatalog.filter((item) =>
    item.category === category && (
      mode === 'shop' || inventory.ownedItemIds.includes(item.id)
    ),
  ), [category, effectiveCatalog, inventory.ownedItemIds, mode]);

  if (!profile) return <Redirect href="/onboarding" />;

  return (
    <AppScreen>
      <View style={styles.header}>
        <IconButton label="Volver al perfil" icon="arrow-left" onPress={() => router.back()} />
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Avatar y tienda</Text>
          <Text style={styles.collection}>
            {inventory.ownedItemIds.length} de {effectiveCatalog.length} objetos
          </Text>
        </View>
        {actionId === 'refresh' ? <ActivityIndicator color={colors.aqua} /> : null}
      </View>

      <View style={styles.hero}>
        <AvatarPreview loadout={inventory.equipped} size={184} />
        <View style={styles.wallet}>
          <CurrencyChip icon="circle-multiple" color={colors.gold} value={profile.coins} />
          <CurrencyChip icon="diamond-stone" color={colors.aqua} value={profile.gems} />
        </View>
      </View>

      <View style={styles.modeControl}>
        <ModeButton active={mode === 'wardrobe'} icon="wardrobe-outline" label="Armario" onPress={() => setMode('wardrobe')} />
        <ModeButton active={mode === 'shop'} icon="storefront-outline" label="Tienda" onPress={() => setMode('shop')} />
      </View>

      <ScrollView
        contentContainerStyle={styles.categoryList}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
      >
        {avatarCategories.map((option) => (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: category === option.id }}
            key={option.id}
            onPress={() => setCategory(option.id)}
            style={({ pressed }) => [
              styles.category,
              category === option.id && styles.categoryActive,
              pressed && styles.pressed,
            ]}
          >
            <MaterialCommunityIcons
              name={option.icon}
              size={17}
              color={category === option.id ? colors.surface : colors.muted}
            />
            <Text style={[
              styles.categoryText,
              category === option.id && styles.categoryTextActive,
            ]}>
              {option.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.itemGrid}>
        {visibleItems.map((item) => {
          const owned = inventory.ownedItemIds.includes(item.id);
          const equipped = inventory.equipped[item.slot] === item.id;
          return (
            <ItemCard
              actionPending={actionId === item.id}
              equipped={equipped}
              item={item}
              key={item.id}
              mode={mode}
              onPress={() => void (owned ? equip(item.id) : purchase(item.id))}
              owned={owned}
            />
          );
        })}
      </View>
    </AppScreen>
  );
}

function ItemCard({ actionPending, equipped, item, mode, onPress, owned }: {
  actionPending: boolean;
  equipped: boolean;
  item: LocalAvatarShopItem;
  mode: ViewMode;
  onPress: () => void;
  owned: boolean;
}) {
  return (
    <View style={[styles.itemCard, equipped && styles.itemCardEquipped]}>
      <View style={[styles.itemVisual, { backgroundColor: `${item.visual.primary}22` }]}>
        <MaterialCommunityIcons name={item.visual.icon} size={34} color={item.visual.primary} />
      </View>
      <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
      <Text style={[styles.rarity, { color: rarityColor(item.rarity) }]}>
        {rarityLabel(item.rarity)}
      </Text>
      <Pressable
        accessibilityRole="button"
        disabled={equipped || actionPending}
        onPress={onPress}
        style={({ pressed }) => [
          styles.itemAction,
          owned && styles.equipAction,
          equipped && styles.equippedAction,
          pressed && styles.pressed,
        ]}
      >
        {actionPending ? (
          <ActivityIndicator color={owned ? colors.ink : colors.surface} size="small" />
        ) : (
          <>
            <MaterialCommunityIcons
              name={equipped ? 'check' : owned ? 'hanger' : item.currency === 'coins' ? 'circle-multiple' : 'diamond-stone'}
              size={16}
              color={owned ? colors.ink : colors.surface}
            />
            <Text style={[styles.itemActionText, owned && styles.equipActionText]}>
              {equipped ? 'Equipado' : owned ? 'Equipar' : `${item.price}`}
            </Text>
          </>
        )}
      </Pressable>
      {mode === 'shop' && owned && !equipped ? (
        <View style={styles.ownedMark}>
          <MaterialCommunityIcons name="check" size={12} color={colors.success} />
        </View>
      ) : null}
    </View>
  );
}

function ModeButton({ active, icon, label, onPress }: {
  active: boolean;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [styles.modeButton, active && styles.modeButtonActive, pressed && styles.pressed]}
    >
      <MaterialCommunityIcons name={icon} size={19} color={active ? colors.surface : colors.muted} />
      <Text style={[styles.modeText, active && styles.modeTextActive]}>{label}</Text>
    </Pressable>
  );
}

function CurrencyChip({ color, icon, value }: {
  color: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  value: number;
}) {
  return (
    <View style={styles.currencyChip}>
      <MaterialCommunityIcons name={icon} size={17} color={color} />
      <Text style={styles.currencyValue}>{value}</Text>
    </View>
  );
}

function IconButton({ icon, label, onPress }: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
    >
      <MaterialCommunityIcons name={icon} size={22} color={colors.ink} />
    </Pressable>
  );
}

function rarityLabel(rarity: LocalAvatarShopItem['rarity']): string {
  if (rarity === 'legendary') return 'LEGENDARIO';
  if (rarity === 'epic') return 'ÉPICO';
  if (rarity === 'rare') return 'RARO';
  return 'COMÚN';
}

function rarityColor(rarity: LocalAvatarShopItem['rarity']): string {
  if (rarity === 'legendary') return colors.gold;
  if (rarity === 'epic') return colors.brand;
  if (rarity === 'rare') return colors.aqua;
  return colors.muted;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerCopy: { flex: 1 },
  iconButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.surface, ...shadows.card },
  title: { color: colors.ink, fontSize: 26, fontWeight: '900' },
  collection: { marginTop: 3, color: colors.muted, fontSize: 12 },
  hero: { alignItems: 'center', paddingVertical: spacing.xl },
  wallet: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  currencyChip: { minWidth: 76, minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: colors.surface, ...shadows.card },
  currencyValue: { color: colors.ink, fontSize: 13, fontWeight: '900' },
  modeControl: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: radius.md, backgroundColor: colors.field },
  modeButton: { flex: 1, minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: radius.sm },
  modeButtonActive: { backgroundColor: colors.navy, ...shadows.card },
  modeText: { color: colors.muted, fontSize: 13, fontWeight: '900' },
  modeTextActive: { color: colors.surface },
  categoryScroll: { marginHorizontal: -20, marginTop: spacing.lg, flexGrow: 0 },
  categoryList: { gap: 8, paddingHorizontal: 20, paddingBottom: 5 },
  category: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, backgroundColor: colors.surface },
  categoryActive: { borderColor: colors.aqua, backgroundColor: colors.aqua },
  categoryText: { color: colors.muted, fontSize: 11, fontWeight: '800' },
  categoryTextActive: { color: colors.surface },
  error: { marginTop: spacing.md, color: colors.danger, fontSize: 12, lineHeight: 18 },
  itemGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md, paddingBottom: spacing.xl },
  itemCard: { position: 'relative', flexGrow: 0, flexBasis: '48%', minWidth: 145, minHeight: 210, padding: 12, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, backgroundColor: colors.surface, ...shadows.card },
  itemCardEquipped: { borderColor: colors.aqua, backgroundColor: colors.softAqua },
  itemVisual: { height: 72, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
  itemName: { minHeight: 38, marginTop: 10, color: colors.ink, fontSize: 13, lineHeight: 18, fontWeight: '900' },
  rarity: { marginTop: 2, fontSize: 9, fontWeight: '900' },
  itemAction: { minHeight: 36, marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: radius.sm, backgroundColor: colors.brand },
  equipAction: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  equippedAction: { opacity: 0.62 },
  itemActionText: { color: colors.surface, fontSize: 11, fontWeight: '900' },
  equipActionText: { color: colors.ink },
  ownedMark: { position: 'absolute', top: 7, right: 7, width: 20, height: 20, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#E9F8EF' },
  pressed: { opacity: 0.76 },
});
