import { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, layout } from '@/core/design/tokens';

type Props = PropsWithChildren<{
  scroll?: boolean;
  padded?: boolean;
}>;

export function AppScreen({ children, scroll = true, padded = true }: Props) {
  const { width } = useWindowDimensions();
  const outerGutter = padded ? layout.contentPadding * 2 : 0;
  const contentWidth = Math.max(0, Math.min(width - outerGutter, layout.maxWidth));
  const content = (
    <View style={[styles.content, { width: contentWidth }, padded && styles.padded]}>
      {children}
    </View>
  );
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  scroll: { flexGrow: 1, alignItems: 'center' },
  content: { flex: 1, alignSelf: 'center' },
  padded: { paddingVertical: layout.contentPadding },
});
