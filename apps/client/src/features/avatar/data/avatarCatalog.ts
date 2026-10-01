import { ComponentProps } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import {
  AvatarInventory,
  AvatarItemCategory,
  AvatarLoadout,
  AvatarShopItem,
} from '@/core/domain/types';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export type AvatarVisual = {
  icon: IconName;
  primary: string;
  secondary?: string;
};

export type LocalAvatarShopItem = AvatarShopItem & {
  visual: AvatarVisual;
};

export const avatarCategories: ReadonlyArray<{
  id: AvatarItemCategory;
  label: string;
  icon: IconName;
}> = [
  { id: 'avatars', label: 'Avatar', icon: 'account-circle-outline' },
  { id: 'clothing', label: 'Ropa', icon: 'tshirt-crew-outline' },
  { id: 'accessories', label: 'Accesorios', icon: 'sunglasses' },
  { id: 'frames', label: 'Marcos', icon: 'image-frame' },
  { id: 'backgrounds', label: 'Fondos', icon: 'image-outline' },
  { id: 'badges', label: 'Insignias', icon: 'shield-star-outline' },
  { id: 'effects', label: 'Efectos', icon: 'star-four-points-outline' },
];

export const avatarCatalog: readonly LocalAvatarShopItem[] = [
  avatarItem('base_rookie', 'Explorador', 'avatars', 'base', 'common', 0, 'coins', 'account-outline', '#F2C7A5'),
  avatarItem('base_veteran', 'Veterano', 'avatars', 'base', 'epic', 300, 'coins', 'account-star-outline', '#9A6646'),
  avatarItem('face_smile', 'Sonrisa', 'avatars', 'face', 'common', 0, 'coins', 'emoticon-happy-outline', '#10233F'),
  avatarItem('face_focus', 'Concentración', 'avatars', 'face', 'rare', 80, 'coins', 'emoticon-neutral-outline', '#10233F'),
  avatarItem('hair_short', 'Corte corto', 'avatars', 'hair', 'common', 0, 'coins', 'account', '#593D2B'),
  avatarItem('hair_wave', 'Onda cobre', 'avatars', 'hair', 'rare', 110, 'coins', 'account-cowboy-hat-outline', '#B85C38'),
  avatarItem('outfit_training', 'Equipación base', 'clothing', 'outfit', 'common', 0, 'coins', 'tshirt-crew-outline', '#00A991'),
  avatarItem('outfit_rescue', 'Chaqueta coral', 'clothing', 'outfit', 'rare', 120, 'coins', 'tshirt-v-outline', '#FF5738'),
  avatarItem('outfit_night', 'Uniforme nocturno', 'clothing', 'outfit', 'epic', 220, 'coins', 'shield-account-outline', '#182C46'),
  avatarItem('accessory_none', 'Sin accesorio', 'accessories', 'accessory', 'common', 0, 'coins', 'minus-circle-outline', '#6B809C'),
  avatarItem('accessory_glasses', 'Gafas de estudio', 'accessories', 'accessory', 'rare', 90, 'coins', 'glasses', '#10233F'),
  avatarItem('accessory_helmet', 'Casco de respuesta', 'accessories', 'accessory', 'epic', 180, 'coins', 'hard-hat', '#F5A900'),
  avatarItem('frame_clean', 'Marco limpio', 'frames', 'frame', 'common', 0, 'coins', 'image-frame', '#FFFFFF'),
  avatarItem('frame_mint', 'Marco menta', 'frames', 'frame', 'rare', 100, 'coins', 'image-frame', '#00A991'),
  avatarItem('frame_gold', 'Marco campeón', 'frames', 'frame', 'legendary', 320, 'coins', 'crown-outline', '#F5A900'),
  avatarItem('background_clear', 'Fondo claro', 'backgrounds', 'background', 'common', 0, 'coins', 'white-balance-sunny', '#EAF8FC'),
  avatarItem('background_sky', 'Cielo de estudio', 'backgrounds', 'background', 'common', 25, 'coins', 'weather-partly-cloudy', '#BCECF4'),
  avatarItem('background_sunset', 'Última ronda', 'backgrounds', 'background', 'epic', 160, 'coins', 'weather-sunset', '#FFD5C2', '#FF8A65'),
  avatarItem('badge_none', 'Sin insignia', 'badges', 'badge', 'common', 0, 'coins', 'minus-circle-outline', '#6B809C'),
  avatarItem('badge_focus', 'Mente enfocada', 'badges', 'badge', 'epic', 200, 'coins', 'shield-star-outline', '#FF5738'),
  avatarItem('effect_none', 'Sin efecto', 'effects', 'effect', 'common', 0, 'coins', 'minus-circle-outline', '#6B809C'),
  avatarItem('effect_spark', 'Destello épico', 'effects', 'effect', 'legendary', 1, 'gems', 'star-four-points', '#F5A900'),
] as const;

export const defaultAvatarLoadout: AvatarLoadout = {
  base: 'base_rookie',
  face: 'face_smile',
  hair: 'hair_short',
  outfit: 'outfit_training',
  accessory: 'accessory_none',
  background: 'background_clear',
  frame: 'frame_clean',
  badge: 'badge_none',
  effect: 'effect_none',
};

export const starterAvatarItemIds = Object.values(defaultAvatarLoadout);

export function defaultAvatarInventory(coins = 0, gems = 0): AvatarInventory {
  return {
    ownedItemIds: [...starterAvatarItemIds],
    equipped: { ...defaultAvatarLoadout },
    coins,
    gems,
  };
}

export function avatarItemById(itemId: string): LocalAvatarShopItem {
  return avatarCatalog.find((item) => item.id === itemId) ?? avatarCatalog[0];
}

function avatarItem(
  id: string,
  name: string,
  category: AvatarItemCategory,
  slot: AvatarShopItem['slot'],
  rarity: AvatarShopItem['rarity'],
  price: number,
  currency: AvatarShopItem['currency'],
  icon: IconName,
  primary: string,
  secondary?: string,
): LocalAvatarShopItem {
  return { id, name, category, slot, rarity, price, currency, visual: { icon, primary, secondary } };
}
