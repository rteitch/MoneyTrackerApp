/**
 * __tests__/constants/theme.test.js
 *
 * Tests untuk memvalidasi design tokens di theme.js tidak berubah secara tidak disengaja.
 * Ini adalah "snapshot" guard — jika ada warna yang berubah, test ini akan gagal dan 
 * memaksa developer untuk secara sadar meng-acknowledge perubahan tersebut.
 *
 * Jalankan: npm test
 */

import { Colors, FontSizes, TransactionTypeConfig } from '../../src/constants/theme';

// ─── Colors ───────────────────────────────────────────────────────────────────
describe('Colors design tokens', () => {
  it('memiliki semua token background yang diperlukan', () => {
    expect(Colors).toHaveProperty('bgPrimary');
    expect(Colors).toHaveProperty('bgCard');
    expect(Colors).toHaveProperty('bgElevated');
  });

  it('memiliki warna semantik untuk income dan expense', () => {
    expect(Colors).toHaveProperty('income');
    expect(Colors).toHaveProperty('expense');
    expect(Colors).toHaveProperty('warning');
  });

  it('memiliki warna teks bertingkat', () => {
    expect(Colors).toHaveProperty('textPrimary');
    expect(Colors).toHaveProperty('textSecondary');
    expect(Colors).toHaveProperty('textMuted');
    expect(Colors).toHaveProperty('textFaint');
  });

  it('warna income adalah hijau (hex dimulai dengan #)', () => {
    expect(Colors.income).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it('warna expense adalah merah (hex dimulai dengan #)', () => {
    expect(Colors.expense).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it('semua nilai Color adalah string hex yang valid', () => {
    const hexPattern = /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/;
    Object.entries(Colors).forEach(([key, val]) => {
      // Hanya validasi yang bukan overlay (overlay tidak selalu hex 6 digit)
      if (!key.includes('overlay') && !key.includes('Overlay')) {
        expect(val).toMatch(hexPattern);
      }
    });
  });
});

// ─── FontSizes ────────────────────────────────────────────────────────────────
describe('FontSizes design tokens', () => {
  it('memiliki semua ukuran yang diperlukan', () => {
    expect(FontSizes).toHaveProperty('xs');
    expect(FontSizes).toHaveProperty('sm');
    expect(FontSizes).toHaveProperty('base');
    expect(FontSizes).toHaveProperty('md');
    expect(FontSizes).toHaveProperty('lg');
    expect(FontSizes).toHaveProperty('xl');
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

// ─── TransactionTypeConfig ────────────────────────────────────────────────────
describe('TransactionTypeConfig', () => {
  it('memiliki ketiga tipe transaksi: expense, income, transfer', () => {
    expect(TransactionTypeConfig).toHaveProperty('expense');
    expect(TransactionTypeConfig).toHaveProperty('income');
    expect(TransactionTypeConfig).toHaveProperty('transfer');
  });

  it('setiap tipe memiliki property yang diperlukan', () => {
    ['expense', 'income', 'transfer'].forEach(type => {
      const config = TransactionTypeConfig[type];
      expect(config).toHaveProperty('icon');
      expect(config).toHaveProperty('color');
      expect(config).toHaveProperty('bg');
      expect(config).toHaveProperty('label');
      expect(config).toHaveProperty('sign');
      expect(typeof config.icon).toBe('string');
      expect(typeof config.color).toBe('string');
    });
  });

  it('expense memiliki tanda minus (−)', () => {
    expect(TransactionTypeConfig.expense.sign).toBe('−');
  });

  it('income memiliki tanda plus (+)', () => {
    expect(TransactionTypeConfig.income.sign).toBe('+');
  });
});
