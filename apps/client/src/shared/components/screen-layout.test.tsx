import { render } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';
import type { ReactTestRendererJSON } from 'react-test-renderer';

import { layout } from '@/core/design/tokens';
import { AppScreen } from './AppScreen';

describe('AppScreen', () => {
  it('keeps padded content inside narrow web viewports', async () => {
    const screen = await render(
      <AppScreen>
        <Text>Contenido</Text>
      </AppScreen>,
    );

    const paddedContent = findNodeWithHorizontalPadding(screen.toJSON());
    expect(paddedContent).toBeTruthy();
    expect(StyleSheet.flatten(paddedContent?.props.style)).toMatchObject({
      paddingHorizontal: layout.contentPadding,
    });
  });
});

function findNodeWithHorizontalPadding(
  node: ReactTestRendererJSON | ReactTestRendererJSON[] | null,
): ReactTestRendererJSON | null {
  if (!node) return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const match = findNodeWithHorizontalPadding(child);
      if (match) return match;
    }
    return null;
  }
  const style = StyleSheet.flatten(node.props.style) as { paddingHorizontal?: number } | undefined;
  if (style?.paddingHorizontal === layout.contentPadding) return node;
  for (const child of node.children ?? []) {
    if (typeof child === 'string') continue;
    const match = findNodeWithHorizontalPadding(child);
    if (match) return match;
  }
  return null;
}
