/**
 * src/constants/theme.js
 * 
 * Single source of truth untuk semua design tokens.
 * Mendukung Dark Mode dan Light Mode.
 */

const DarkColors = {
  // Backgrounds
  bgPrimary: '#060d1a',   
  bgCard: '#0d1526',   
  bgElevated: '#1a2540',   
  bgDeep: '#0a1020',   

  // Theme Specific Backgrounds
  brandBg: '#1a1040',
  incomeBg: '#002d22',
  expenseBg: '#2d0a14',
  warningBg: '#2d1a00',
  infoBg: '#021d2d',

  // Text
  textPrimary: '#e8edf5', 
  textSecondary: '#8892a4', 
  textMuted: '#4a5568', 
  textFaint: '#2a3550', 
  textFaintest: '#1e2a42',

  // Borders
  border: '#1a2540',
  borderLight: '#0d1526',

  // Overlays
  overlay: 'rgba(0,0,0,0.65)',
  overlayDark: 'rgba(0,0,0,0.85)',
};

const LightColors = {
  // Backgrounds
  bgPrimary: '#f8fafc',   // Slate 50
  bgCard: '#ffffff',   
  bgElevated: '#f1f5f9',   // Slate 100
  bgDeep: '#e2e8f0',   // Slate 200

  // Theme Specific Backgrounds
  brandBg: '#7c6aff15', // Transparan brand
  incomeBg: '#00c89615',
  expenseBg: '#ff4d6d15',
  warningBg: '#f59e0b15',
  infoBg: '#0ea5e915',

  // Text
  textPrimary: '#0f172a', // Slate 900
  textSecondary: '#475569', // Slate 600
  textMuted: '#94a3b8', // Slate 400
  textFaint: '#cbd5e1', // Slate 300
  textFaintest: '#f1f5f9',

  // Borders
  border: '#e2e8f0',
  borderLight: '#f1f5f9',

  // Overlays
  overlay: 'rgba(0,0,0,0.3)',
  overlayDark: 'rgba(0,0,0,0.5)',
};

// Common colors across themes
const CommonColors = {
  brand: '#7c6aff',   
  income: '#00c896',   
  expense: '#ff4d6d',   
  warning: '#f59e0b',   
  info: '#0ea5e9',   
};

export const getThemeColors = (theme = 'dark') => {
  const base = theme === 'light' ? LightColors : DarkColors;
  return { ...base, ...CommonColors };
};

// Legacy Export for compatibility while transitioning
export const Colors = { ...DarkColors, ...CommonColors };

export const FontSizes = {
  xs: 10,
  sm: 11,
  base: 13,
  md: 14,
  lg: 15,
  xl: 16,
  '2xl': 18,
  '3xl': 20,
  hero: 30,
};

export const FontWeights = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  heavy: '800',
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 14,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  full: 9999,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
};

export const TransactionTypeConfig = {
  expense: { icon: 'arrow-down', color: CommonColors.expense, bg: CommonColors.expenseBg, label: 'Keluar', sign: '−' },
  income: { icon: 'arrow-up', color: CommonColors.income, bg: CommonColors.incomeBg, label: 'Masuk', sign: '+' },
  transfer: { icon: 'swap-horizontal', color: CommonColors.brand, bg: CommonColors.brandBg, label: 'Transfer', sign: '' },
};

export const getTransactionTypeConfig = (theme = 'dark') => {
  const colors = getThemeColors(theme);
  return {
    expense: { icon: 'arrow-down', color: colors.expense, bg: colors.expenseBg, label: 'Keluar', sign: '−' },
    income: { icon: 'arrow-up', color: colors.income, bg: colors.incomeBg, label: 'Masuk', sign: '+' },
    transfer: { icon: 'swap-horizontal', color: colors.brand, bg: colors.brandBg, label: 'Transfer', sign: '' },
  };
};