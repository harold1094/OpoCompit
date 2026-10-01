import { colors, radius, shadows } from './tokens';

describe('OpoCompit visual system', () => {
  it('uses the warm, high-contrast palette from the mobile reference', () => {
    expect(colors.ink).toBe('#10233F');
    expect(colors.paper).toBe('#FFFCF8');
    expect(colors.brand).toBe('#FF5738');
    expect(colors.aqua).toBe('#00A991');
    expect(colors.softSky).toBe('#EAF8FC');
  });

  it('provides generous card radii and reusable elevation', () => {
    expect(radius.lg).toBe(20);
    expect(radius.xl).toBe(28);
    expect(shadows.card.boxShadow).toContain('rgba(16, 35, 63');
    expect(shadows.card.shadowOpacity).toBeUndefined();
  });
});
