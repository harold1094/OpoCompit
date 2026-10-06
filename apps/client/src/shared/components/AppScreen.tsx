import { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, layout } from '@/core/design/tokens';

type Props = PropsWithChildren<{
  scroll?: boolean;
  padded?: boolean;
}>;

export function AppScreen({ children, scroll = true, padded = true }: Props) {
  const content = (
    <View style={[styles.content, padded && styles.padded]}>
      {children}
    </View>
  );
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.backdrop}>
        <View style={styles.glowTop} />
        <View style={styles.glowBottom} />
      </View>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper, overflow: 'hidden' },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, overflow: 'hidden', pointerEvents: 'none' },
  glowTop: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    top: -165,
    right: -125,
    backgroundColor: colors.softSky,
    opacity: 0.9,
  },
  glowBottom: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: 170,
    bottom: -230,
    left: -210,
    backgroundColor: colors.softSky,
    opacity: 0.75,
  },
  scroll: { width: '100%', flexGrow: 1, alignItems: 'center' },
  content: { flex: 1, width: '100%', maxWidth: layout.maxWidth, alignSelf: 'center' },
  padded: { paddingHorizontal: layout.contentPadding, paddingVertical: layout.contentPadding },
});
