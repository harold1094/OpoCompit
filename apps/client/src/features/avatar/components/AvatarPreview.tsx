import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { AvatarLoadout } from '@/core/domain/types';
import { avatarItemById } from '@/features/avatar/data/avatarCatalog';

type Props = {
  loadout: AvatarLoadout;
  size?: number;
};

export function AvatarPreview({ loadout, size = 160 }: Props) {
  const base = avatarItemById(loadout.base);
  const hair = avatarItemById(loadout.hair);
  const outfit = avatarItemById(loadout.outfit);
  const background = avatarItemById(loadout.background);
  const frame = avatarItemById(loadout.frame);
  const focused = loadout.face === 'face_focus';
  const glasses = loadout.accessory === 'accessory_glasses';
  const helmet = loadout.accessory === 'accessory_helmet';
  const hasBadge = loadout.badge === 'badge_focus';
  const hasEffect = loadout.effect === 'effect_spark';
  const headSize = size * 0.42;

  return (
    <View
      accessibilityLabel="Vista previa del avatar equipado"
      style={[
        styles.preview,
        {
          width: size,
          height: size,
          borderRadius: size * 0.18,
          borderWidth: Math.max(3, size * 0.035),
          borderColor: frame.visual.primary,
          backgroundColor: background.visual.primary,
        },
      ]}
    >
      {background.visual.secondary ? (
        <View
          style={[
            styles.backgroundBand,
            {
              height: size * 0.34,
              backgroundColor: background.visual.secondary,
            },
          ]}
        />
      ) : null}

      {hasEffect ? (
        <>
          <MaterialCommunityIcons
            name="star-four-points"
            size={size * 0.15}
            color="#F5A900"
            style={[styles.effect, { left: size * 0.08, top: size * 0.1 }]}
          />
          <MaterialCommunityIcons
            name="star-four-points"
            size={size * 0.1}
            color="#FF5738"
            style={[styles.effect, { right: size * 0.09, top: size * 0.2 }]}
          />
        </>
      ) : null}

      <View
        style={[
          styles.body,
          {
            width: size * 0.62,
            height: size * 0.45,
            bottom: -size * 0.08,
            borderRadius: size * 0.2,
            backgroundColor: outfit.visual.primary,
          },
        ]}
      >
        <View style={[styles.outfitLine, { width: size * 0.34, top: size * 0.12 }]} />
      </View>

      <View
        style={[
          styles.head,
          {
            width: headSize,
            height: headSize,
            borderRadius: headSize / 2,
            top: size * 0.21,
            backgroundColor: base.visual.primary,
          },
        ]}
      >
        <View
          style={[
            styles.hair,
            {
              width: headSize * (loadout.hair === 'hair_wave' ? 0.9 : 0.82),
              height: headSize * 0.38,
              borderRadius: headSize * 0.2,
              backgroundColor: hair.visual.primary,
              transform: [{ rotate: loadout.hair === 'hair_wave' ? '-8deg' : '0deg' }],
            },
          ]}
        />
        <View style={[styles.eyeRow, { top: headSize * 0.49, gap: headSize * 0.2 }]}>
          <View style={[styles.eye, focused && styles.focusedEye, { width: headSize * 0.08 }]} />
          <View style={[styles.eye, focused && styles.focusedEye, { width: headSize * 0.08 }]} />
        </View>
        <View
          style={[
            styles.mouth,
            focused && styles.focusedMouth,
            {
              width: headSize * 0.24,
              height: headSize * 0.1,
              bottom: headSize * 0.17,
              borderRadius: headSize * 0.1,
            },
          ]}
        />
        {glasses ? (
          <View style={[styles.glasses, { top: headSize * 0.39, gap: headSize * 0.04 }]}>
            <View style={[styles.lens, { width: headSize * 0.28, height: headSize * 0.2 }]} />
            <View style={[styles.bridge, { width: headSize * 0.08 }]} />
            <View style={[styles.lens, { width: headSize * 0.28, height: headSize * 0.2 }]} />
          </View>
        ) : null}
      </View>

      {helmet ? (
        <View
          style={[
            styles.helmet,
            {
              width: headSize * 1.08,
              height: headSize * 0.42,
              top: size * 0.16,
              borderRadius: headSize * 0.22,
            },
          ]}
        >
          <View style={[styles.helmetStripe, { width: headSize * 0.72 }]} />
        </View>
      ) : null}

      {hasBadge ? (
        <View style={[styles.badge, { width: size * 0.22, height: size * 0.22, borderRadius: size * 0.11 }]}>
          <MaterialCommunityIcons name="shield-star" size={size * 0.14} color="#FF5738" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  preview: { position: 'relative', overflow: 'hidden', alignItems: 'center' },
  backgroundBand: { position: 'absolute', right: 0, bottom: 0, left: 0 },
  effect: { position: 'absolute' },
  body: { position: 'absolute', alignItems: 'center' },
  outfitLine: { position: 'absolute', height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.65)' },
  head: { position: 'absolute', overflow: 'hidden', alignItems: 'center' },
  hair: { position: 'absolute', top: -3 },
  eyeRow: { position: 'absolute', flexDirection: 'row' },
  eye: { height: 4, borderRadius: 2, backgroundColor: '#10233F' },
  focusedEye: { height: 3, transform: [{ rotate: '-8deg' }] },
  mouth: { position: 'absolute', borderBottomWidth: 3, borderBottomColor: '#A14C4C' },
  focusedMouth: { height: 1, borderRadius: 0 },
  glasses: { position: 'absolute', flexDirection: 'row', alignItems: 'center' },
  lens: { borderWidth: 2, borderColor: '#10233F', borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.22)' },
  bridge: { height: 2, backgroundColor: '#10233F' },
  helmet: { position: 'absolute', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 4, backgroundColor: '#F5A900', borderBottomWidth: 4, borderBottomColor: '#FFFFFF' },
  helmetStripe: { height: 5, borderRadius: 3, backgroundColor: '#FF5738' },
  badge: { position: 'absolute', left: 8, bottom: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5EBF0' },
});
