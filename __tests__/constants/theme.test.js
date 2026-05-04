/**
 * __tests__/constants/theme.test.js
 *
 * Tests untuk memvalidasi design tokens di theme.js tidak berubah secara tidak disengaja.
 * Mendukung dark dan light mode via getThemeColors().
 *
 * Jalankan: npm test
 */

import {
  getThemeColors,
  getTransactionTypeConfig,
  FontSizes,
  FontWeights,
  Radius,
  Spacing,
} from '../../src/constants/theme';

// ─── Dark Theme Colors ─────────────────────────────────────────────────────
describe('Dark theme colors', () => {
  const colors = getThemeColors('dark');

  it('memiliki semua token background yang diperlukan', () => {
    expect(colors).toHaveProperty('bgPrimary');
    expect(colors).toHaveProperty('bgCard');
    expect(colors).toHaveProperty('bgElevated');
    expect(colors).toHaveProperty('bgDeep');
  });

  it('memiliki warna semantik untuk income, expense, dan warning', () => {
    expect(colors).toHaveProperty('income');
    expect(colors).toHaveProperty('expense');
    expect(colors).toHaveProperty('warning');
  });

  it('memiliki warna teks bertingkat', () => {
    expect(colors).toHaveProperty('textPrimary');
    expect(colors).toHaveProperty('textSecondary');
    expect(colors).toHaveProperty('textMuted');
    expect(colors).toHaveProperty('textFaint');
  });

  it('memiliki brand dan secondary', () => {
    expect(colors).toHaveProperty('brand');
    expect(colors).toHaveProperty('secondary');
  });

  it('semua nilai hex yang valid (bukan overlay)', () => {
    const hexPattern = /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3}|[0-9A-Fa-f]{8})$/;
    Object.entries(colors).forEach(([key, val]) => {
      if (!key.includes('overlay') && !key.includes('Overlay') && typeof val === 'string') {
        expect(val).toMatch(hexPattern);
      }
    });
  });
});

// ─── Light Theme Colors ────────────────────────────────────────────────────
describe('Light theme colors', () => {
  const colors = getThemeColors('light');

  it('memiliki semua token background yang diperlukan', () => {
    expect(colors).toHaveProperty('bgPrimary');
    expect(colors).toHaveProperty('bgCard');
    expect(colors).toHaveProperty('bgElevated');
  });

  it('bgPrimary berbeda dari dark mode', () => {
    const darkColors = getThemeColors('dark');
    expect(colors.bgPrimary).not.toBe(darkColors.bgPrimary);
    expect(colors.bgCard).not.toBe(darkColors.bgCard);
  });

  it('warna brand konsisten antara dark dan light', () => {
    const darkColors = getThemeColors('dark');
    expect(colors.brand).toBe(darkColors.brand);
    expect(colors.income).toBe(darkColors.income);
    expect(colors.expense).toBe(darkColors.expense);
  });
});

// ─── getThemeColors default ────────────────────────────────────────────────
describe('getThemeColors default', () => {
  it('tanpa argumen mengembalikan dark theme', () => {
    const defaultColors = getThemeColors();
    const darkColors = getThemeColors('dark');
    expect(defaultColors.bgPrimary).toBe(darkColors.bgPrimary);
  });

  it('theme tidak dikenal mengembalikan dark theme', () => {
    const unknownColors = getThemeColors('purple');
    const darkColors = getThemeColors('dark');
    expect(unknownColors.bgPrimary).toBe(darkColors.bgPrimary);
  });
});

// ─── FontSizes ──────────────────────────────────────────────────────────────
describe('FontSizes design tokens', () => {
  it('memiliki semua ukuran yang diperlukan', () => {
    expect(FontSizes).toHaveProperty('xs');
    expect(FontSizes).toHaveProperty('sm');
    expect(FontSizes).toHaveProperty('base');
    expect(FontSizes).toHaveProperty('md');
    expect(FontSizes).toHaveProperty('lg');
    expect(FontSizes).toHaveProperty('xl');
    expect(FontSizes).toHaveProperty('hero');
  });

  it('semua ukuran adalah angka positif', () => {
    Object.values(FontSizes).forEach(size => {
      expect(typeof size).toBe('number');
      expect(size).toBeGreaterThan(0);
    });
  });

  it('xs lebih kecil dari hero (urutan benar)', () => {
    expect(FontSizes.xs).toBeLessThan(FontSizes.hero);
    expect(FontSizes.sm).toBeLessThan(FontSizes.lg);
  });
});

// ─── FontWeights ────────────────────────────────────────────────────────────
describe('FontWeights design tokens', () => {
  it('memiliki semua weight yang diperlukan', () => {
    expect(FontWeights).toHaveProperty('regular');
    expect(FontWeights).toHaveProperty('medium');
    expect(FontWeights).toHaveProperty('semibold');
    expect(FontWeights).toHaveProperty('bold');
    expect(FontWeights).toHaveProperty('heavy');
  });

  it('semua weight adalah string', () => {
    Object.values(FontWeights).forEach(w => {
      expect(typeof w).toBe('string');
    });
  });
});

// ─── Radius ─────────────────────────────────────────────────────────────────
describe('Radius design tokens', () => {
  it('memiliki radius yang diperlukan', () => {
    expect(Radius).toHaveProperty('sm');
    expect(Radius).toHaveProperty('md');
    expect(Radius).toHaveProperty('lg');
    expect(Radius).toHaveProperty('full');
  });

  it('sm lebih kecil dari lg', () => {
    expect(Radius.sm).toBeLessThan(Radius.lg);
  });

  it('full adalah angka besar', () => {
    expect(Radius.full).toBeGreaterThan(1000);
  });
});

// ─── Spacing ────────────────────────────────────────────────────────────────
describe('Spacing design tokens', () => {
  it('memiliki spacing yang diperlukan', () => {
    expect(Spacing).toHaveProperty('xs');
    expect(Spacing).toHaveProperty('sm');
    expect(Spacing).toHaveProperty('md');
    expect(Spacing).toHaveProperty('lg');
    expect(Spacing).toHaveProperty('xl');
    expect(Spacing).toHaveProperty('2xl');
  });

  it('xs lebih kecil dari xl', () => {
    expect(Spacing.xs).toBeLessThan(Spacing.xl);
  });
});

// ─── TransactionTypeConfig ──────────────────────────────────────────────────
describe('TransactionTypeConfig (dark)', () => {
  const typeConfig = getTransactionTypeConfig('dark');

  it('memiliki ketiga tipe transaksi: expense, income, transfer', () => {
    expect(typeConfig).toHaveProperty('expense');
    expect(typeConfig).toHaveProperty('income');
    expect(typeConfig).toHaveProperty('transfer');
  });

  it('setiap tipe memiliki property yang diperlukan', () => {
    ['expense', 'income', 'transfer'].forEach(type => {
      const config = typeConfig[type];
      expect(config).toHaveProperty('icon');
      expect(config).toHaveProperty('color');
      expect(config).toHaveProperty('bg');
      expect(config).toHaveProperty('label');
      expect(config).toHaveProperty('sign');
      expect(typeof config.icon).toBe('string');
      expect(typeof config.color).toBe('string');
    });
  });

  it('expense memiliki tanda minus', () => {
    expect(typeConfig.expense.sign).toBe('−');
  });

  it('income memiliki tanda plus', () => {
    expect(typeConfig.income.sign).toBe('+');
  });

  it('transfer memiliki sign kosong', () => {
    expect(typeConfig.transfer.sign).toBe('');
  });
});

describe('TransactionTypeConfig (light)', () => {
  it('menghasilkan config untuk light mode tanpa error', () => {
    const typeConfig = getTransactionTypeConfig('light');
    expect(typeConfig).toHaveProperty('expense');
    expect(typeConfig).toHaveProperty('income');
    expect(typeConfig).toHaveProperty('transfer');
  });

  it('warna expense konsisten antar tema', () => {
    const dark = getTransactionTypeConfig('dark');
    const light = getTransactionTypeConfig('light');
    expect(dark.expense.color).toBe(light.expense.color);
  });
});
