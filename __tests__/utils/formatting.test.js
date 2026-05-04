/**
 * __tests__/utils/formatting.test.js
 *
 * Unit tests untuk semua fungsi di src/utils/formatting.js
 * Jalankan: npm test
 */

import {
  formatRupiah,
  formatRupiahFull,
  formatCurrencyInput,
  parseCurrencyRaw,
  formatDate,
  formatDateShort,
  formatDateInput,
  getGreeting,
  escapeCSV,
} from '../../src/utils/formatting';

// ─── formatRupiah ──────────────────────────────────────────────────────────────
describe('formatRupiah', () => {
  it('mengembalikan Rp 0 untuk nilai 0', () => {
    expect(formatRupiah(0)).toBe('Rp 0');
  });

  it('mengembalikan Rp 0 untuk nilai null/undefined', () => {
    expect(formatRupiah(null)).toBe('Rp 0');
    expect(formatRupiah(undefined)).toBe('Rp 0');
  });

  it('memformat ribuan dengan singkatan "rb"', () => {
    expect(formatRupiah(50000)).toContain('rb');
    expect(formatRupiah(1000)).toContain('rb');
  });

  it('angka di bawah 1000 tanpa singkatan', () => {
    expect(formatRupiah(999)).toContain('999');
    expect(formatRupiah(500)).toContain('500');
  });

  it('memformat jutaan dengan singkatan "jt"', () => {
    expect(formatRupiah(1500000)).toContain('jt');
    expect(formatRupiah(2000000)).toContain('jt');
  });

  it('memformat miliaran dengan singkatan "M"', () => {
    expect(formatRupiah(1000000000)).toContain('M');
    expect(formatRupiah(2500000000)).toContain('M');
  });

  it('memformat triliunan dengan singkatan "T"', () => {
    expect(formatRupiah(1000000000000)).toContain('T');
  });

  it('menangani nilai negatif', () => {
    const result = formatRupiah(-50000);
    expect(result).toContain('rb');
  });

  it('menangani NaN', () => {
    expect(formatRupiah(NaN)).toBe('Rp 0');
  });
});

// ─── formatRupiahFull ─────────────────────────────────────────────────────────
describe('formatRupiahFull', () => {
  it('mengembalikan format penuh dengan titik pemisah ribuan', () => {
    expect(formatRupiahFull(50000)).toBe('Rp 50.000');
    expect(formatRupiahFull(1500000)).toBe('Rp 1.500.000');
    expect(formatRupiahFull(0)).toBe('Rp 0');
  });

  it('menangani null dengan aman', () => {
    expect(formatRupiahFull(null)).toBe('Rp 0');
    expect(formatRupiahFull(undefined)).toBe('Rp 0');
  });

  it('miliaran menggunakan singkatan M', () => {
    expect(formatRupiahFull(1000000000)).toContain('M');
  });

  it('triliunan menggunakan singkatan T', () => {
    expect(formatRupiahFull(1000000000000)).toContain('T');
  });
});

// ─── formatCurrencyInput ──────────────────────────────────────────────────────
describe('formatCurrencyInput', () => {
  it('mengembalikan string kosong untuk null/undefined/kosong', () => {
    expect(formatCurrencyInput('')).toBe('');
    expect(formatCurrencyInput(null)).toBe('');
    expect(formatCurrencyInput(undefined)).toBe('');
  });

  it('memformat angka menjadi "Rp X" dengan pemisah ribuan', () => {
    expect(formatCurrencyInput('50000')).toBe('Rp 50.000');
    expect(formatCurrencyInput('1000000')).toBe('Rp 1.000.000');
  });

  it('menghapus karakter non-digit', () => {
    expect(formatCurrencyInput('abc123def')).toBe('Rp 123');
    expect(formatCurrencyInput('Rp 50.000')).toBe('Rp 50.000');
  });

  it('mengembalikan string kosong jika tidak ada digit', () => {
    expect(formatCurrencyInput('abc')).toBe('');
  });
});

// ─── parseCurrencyRaw ─────────────────────────────────────────────────────────
describe('parseCurrencyRaw', () => {
  it('mengembalikan angka langsung jika input number', () => {
    expect(parseCurrencyRaw(50000)).toBe(50000);
    expect(parseCurrencyRaw(0)).toBe(0);
  });

  it('parse string Rupiah menjadi angka', () => {
    expect(parseCurrencyRaw('Rp 50.000')).toBe(50000);
    expect(parseCurrencyRaw('Rp 1.000.000')).toBe(1000000);
  });

  it('mengembalikan 0 untuk null/undefined/kosong', () => {
    expect(parseCurrencyRaw(null)).toBe(0);
    expect(parseCurrencyRaw(undefined)).toBe(0);
    expect(parseCurrencyRaw('')).toBe(0);
  });

  it('parse string digit murni', () => {
    expect(parseCurrencyRaw('12345')).toBe(12345);
  });

  it('mengembalikan 0 untuk string tanpa digit', () => {
    expect(parseCurrencyRaw('abc')).toBe(0);
  });
});

// ─── formatDate ──────────────────────────────────────────────────────────────
describe('formatDate', () => {
  it('memformat ISO date ke format Indonesia', () => {
    const result = formatDate('2026-04-21T00:00:00.000Z');
    expect(result).toContain('21');
    expect(result).toContain('Apr');
    expect(result).toContain('2026');
  });

  it('mengembalikan "-" untuk null/undefined', () => {
    expect(formatDate(null)).toBe('-');
    expect(formatDate(undefined)).toBe('-');
    expect(formatDate('')).toBe('-');
  });

  it('mengembalikan "-" untuk invalid date', () => {
    expect(formatDate('invalid-date')).toBe('-');
  });
});

// ─── formatDateShort ─────────────────────────────────────────────────────────
describe('formatDateShort', () => {
  it('memformat tanpa tahun', () => {
    const result = formatDateShort('2026-04-21T00:00:00.000Z');
    expect(result).toContain('21');
    expect(result).toContain('Apr');
    expect(result).not.toContain('2026');
  });

  it('mengembalikan "-" untuk null', () => {
    expect(formatDateShort(null)).toBe('-');
  });
});

// ─── formatDateInput ──────────────────────────────────────────────────────────
describe('formatDateInput', () => {
  it('memformat ISO date ke DD/MM/YYYY', () => {
    const result = formatDateInput('2026-04-21T00:00:00.000Z');
    expect(result).toBe('21/04/2026');
  });

  it('mengembalikan string kosong untuk null/undefined', () => {
    expect(formatDateInput(null)).toBe('');
    expect(formatDateInput(undefined)).toBe('');
  });

  it('mengembalikan string kosong untuk invalid date', () => {
    expect(formatDateInput('invalid')).toBe('');
  });

  it('padding hari dan bulan dengan nol', () => {
    const result = formatDateInput('2026-01-05T00:00:00.000Z');
    expect(result).toBe('05/01/2026');
  });
});

// ─── getGreeting ──────────────────────────────────────────────────────────────
describe('getGreeting', () => {
  const originalDate = global.Date;

  const mockHour = (hour) => {
    const mockNow = new Date(2026, 3, 21, hour, 0, 0);
    global.Date = class extends Date {
      constructor(...args) {
        if (args.length === 0) return mockNow;
        return super(...args);
      }
    };
  };

  afterEach(() => {
    global.Date = originalDate;
  });

  it('mengembalikan Selamat Pagi sebelum jam 11', () => {
    mockHour(7);
    expect(getGreeting()).toBe('Selamat Pagi');
  });

  it('mengembalikan Selamat Siang antara jam 11-14', () => {
    mockHour(12);
    expect(getGreeting()).toBe('Selamat Siang');
  });

  it('mengembalikan Selamat Sore antara jam 15-17', () => {
    mockHour(16);
    expect(getGreeting()).toBe('Selamat Sore');
  });

  it('mengembalikan Selamat Malam jam >= 18', () => {
    mockHour(20);
    expect(getGreeting()).toBe('Selamat Malam');
  });

  it('mengembalikan Selamat Pagi jam 5', () => {
    mockHour(5);
    expect(getGreeting()).toBe('Selamat Pagi');
  });

  it('mengembalikan Selamat Malam jam 0 (tengah malam)', () => {
    mockHour(0);
    expect(getGreeting()).toBe('Selamat Malam');
  });
});

// ─── escapeCSV ────────────────────────────────────────────────────────────────
describe('escapeCSV', () => {
  it('mengembalikan string kosong untuk null atau undefined', () => {
    expect(escapeCSV(null)).toBe('');
    expect(escapeCSV(undefined)).toBe('');
  });

  it('mengembalikan string asli jika tidak ada karakter khusus', () => {
    expect(escapeCSV('Halo Dunia')).toBe('Halo Dunia');
    expect(escapeCSV(12345)).toBe('12345');
  });

  it('mengapit string dengan tanda kutip jika mengandung koma', () => {
    expect(escapeCSV('Halo, Dunia')).toBe('"Halo, Dunia"');
  });

  it('mengapit string dengan tanda kutip jika mengandung baris baru (newline)', () => {
    expect(escapeCSV('Baris 1\nBaris 2')).toBe('"Baris 1\nBaris 2"');
  });

  it('mengapit string dengan tanda kutip dan melakukan escape pada double quotes', () => {
    expect(escapeCSV('Dia berkata "Halo" kepadaku')).toBe('"Dia berkata ""Halo"" kepadaku"');
  });

  it('menangani angka 0', () => {
    expect(escapeCSV(0)).toBe('0');
  });
});
