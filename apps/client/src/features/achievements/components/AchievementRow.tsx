import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Achievement } from '@/core/domain/types';
import { colors, radius, shadows, spacing } from '@/core/design/tokens';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export function AchievementRow({ achievement }: { achievement: Achievement }) {
  const percentage = Math.round((achievement.progress / achievement.target) * 100);
  return (
    <View style={[styles.row, achievement.unlocked && styles.rowUnlocked]}>
      <View style={[styles.icon, achievement.unlocked ? styles.iconUnlocked : styles.iconLocked]}>
        <MaterialCommunityIcons
          name={(achievement.icon || 'medal-outline') as IconName}
          size={25}
          color={achievement.unlocked ? colors.gold : colors.muted}
        />
      </View>
      <View style={styles.copy}>
        <View style={styles.heading}>
          <Text style={styles.title}>{achievement.title}</Text>
          {achievement.unlocked ? (
            <View style={styles.unlockedBadge}>
              <MaterialCommunityIcons name="check" size={12} color={colors.success} />
              <Text style={styles.unlockedText}>Conseguido</Text>
            </View>
          ) : (
            <Text style={styles.counter}>{achievement.progress}/{achievement.target}</Text>
          )}
        </View>
        <Text style={styles.description}>{achievement.description}</Text>
        {!achievement.unlocked ? (
          <View style={styles.progressTrack}>
            <View style={[styles.progress, {width: `${percentage}%`}]} />
          </View>
        ) : null}
        <View style={styles.rewards}>
          {achievement.rewardXp > 0 ? (
            <Reward icon="star-four-points-outline" value={`${achievement.rewardXp} XP`} color={colors.aqua} />
          ) : null}
          {achievement.rewardCoins > 0 ? (
            <Reward icon="circle-multiple" value={`${achievement.rewardCoins}`} color={colors.gold} />
          ) : null}
          {achievement.rewardGems > 0 ? (
            <Reward icon="diamond-stone" value={`${achievement.rewardGems}`} color={colors.brand} />
          ) : null}
        </View>
      </View>
    </View>
  );
}

function Reward({ icon, value, color }: { icon: IconName; value: string; color: string }) {
  return (
    <View style={styles.reward}>
      <MaterialCommunityIcons name={icon} size={13} color={color} />
      <Text style={styles.rewardText}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, padding: spacing.md, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, backgroundColor: colors.surface, ...shadows.card },
  rowUnlocked: { borderColor: '#F5D886' },
  icon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
  iconUnlocked: { backgroundColor: colors.softGold },
  iconLocked: { backgroundColor: colors.field },
  copy: { flex: 1 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { flex: 1, color: colors.ink, fontSize: 14, fontWeight: '900' },
  description: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 3 },
  counter: { color: colors.muted, fontSize: 11, fontWeight: '800' },
  unlockedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  unlockedText: { color: colors.success, fontSize: 10, fontWeight: '900' },
  progressTrack: { height: 6, overflow: 'hidden', borderRadius: radius.pill, backgroundColor: colors.line, marginTop: spacing.sm },
  progress: { height: '100%', minWidth: 2, borderRadius: radius.pill, backgroundColor: colors.aqua },
  rewards: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: spacing.sm },
  reward: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  rewardText: { color: colors.muted, fontSize: 10, fontWeight: '800' },
});
