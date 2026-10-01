import { render } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';

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

type RenderNode = {
  type?: string;
  props: Record<string, unknown>;
  children?: Array<RenderNode | string>;
};

function findNodeWithHorizontalPadding(node: RenderNode | null): RenderNode | null {
  if (!node) return null;
  const style = StyleSheet.flatten(node.props.style) as { paddingHorizontal?: number } | undefined;
  if (style?.paddingHorizontal === layout.contentPadding) return node;
  for (const child of node.children ?? []) {
    if (typeof child === 'string') continue;
    const match = findNodeWithHorizontalPadding(child);
    if (match) return match;
  }
  return null;
}
