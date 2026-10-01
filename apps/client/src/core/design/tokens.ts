import type { ViewStyle } from 'react-native';

export const colors = {
  ink: '#10233F',
  muted: '#6B809C',
  paper: '#FFFCF8',
  surface: '#FFFFFF',
  brand: '#FF5738',
  brandDark: '#E84427',
  aqua: '#00A991',
  gold: '#F5A900',
  danger: '#E94D4D',
  success: '#24AD5F',
  line: '#E5EBF0',
  softBrand: '#FFF0E9',
  softAqua: '#E8F8F5',
  softGold: '#FFF5D8',
  softSky: '#EAF8FC',
  navy: '#182C46',
  field: '#F8FAFC',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const layout = {
  maxWidth: 640,
  contentPadding: 20,
} as const;

export const shadows: Record<'card' | 'floating', ViewStyle> = {
  card: {
    boxShadow: '0 7px 16px rgba(16, 35, 63, 0.07)',
    elevation: 3,
  },
  floating: {
    boxShadow: '0 10px 22px rgba(16, 35, 63, 0.12)',
    elevation: 7,
  },
};
