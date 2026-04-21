/**
 * src/constants/theme.js
 * 
 * Single source of truth untuk semua design tokens.
 * Ubah di sini, berlaku di seluruh aplikasi.
 */

export const Colors = {
  // Backgrounds
  bgPrimary:   '#060d1a',   // layar utama
  bgCard:      '#0d1526',   // card, input, chip
  bgElevated:  '#1a2540',   // border, divider, badge
  bgDeep:      '#0a1020',   // active item tint

  // Brand
  brand:       '#7c6aff',   // ungu utama (tombol, aksen)
  brandBg:     '#1a1040',   // background brand

  // Semantic
  income:      '#00c896',   // hijau = pemasukan
  incomeBg:    '#002d22',
  expense:     '#ff4d6d',   // merah = pengeluaran
  expenseBg:   '#2d0a14',
  warning:     '#f59e0b',   // kuning = peringatan
  warningBg:   '#2d1a00',
  info:        '#0ea5e9',   // biru = informasi

  // Text
  textPrimary:   '#e8edf5', // judul, nilai utama
  textSecondary: '#8892a4', // subtitle, label
  textMuted:     '#4a5568', // placeholder, inactive tab
  textFaint:     '#2a3550', // hint, inactive chip
  textFaintest:  '#1e2a42', // barely visible hint

  // Borders
  border:       '#1a2540',
  borderLight:  '#0d1526',

  // Overlays
  overlay:      'rgba(0,0,0,0.65)',
  overlayDark:  'rgba(0,0,0,0.7)',
};

export const FontSizes = {
  xs:   10,
  sm:   11,
  base: 13,
  md:   14,
  lg:   15,
  xl:   16,
  '2xl': 18,
  '3xl': 20,
  hero:  30,
};

export const FontWeights = {
  regular: '400',
  medium:  '500',
  semibold:'600',
  bold:    '700',
  heavy:   '800',
};

export const Radius = {
  sm:   8,
  md:   12,
  lg:   14,
  xl:   16,
  '2xl':20,
  '3xl':24,
  full: 9999,
};

export const Spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  '2xl':24,
};

// Type config dipakai di beberapa screen
export const TransactionTypeConfig = {
  expense:  { icon: 'arrow-down',      color: Colors.expense,  bg: Colors.expenseBg,  label: 'Keluar',   sign: '−' },
  income:   { icon: 'arrow-up',        color: Colors.income,   bg: Colors.incomeBg,   label: 'Masuk',    sign: '+' },
  transfer: { icon: 'swap-horizontal', color: Colors.brand,    bg: Colors.brandBg,    label: 'Transfer', sign: '' },
};
