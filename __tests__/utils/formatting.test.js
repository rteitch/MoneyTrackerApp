/**
 * __tests__/utils/formatting.test.js
 *
 * Unit tests untuk semua fungsi di src/utils/formatting.js
 * Jalankan: npm test
 */

import {
  formatRupiah,
  formatRupiahFull,
  formatDate,
  formatDateShort,
  formatDateInput,
  formatDateCSV,
  parseDateInput,
  getGreeting,
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

  it('memformat ribuan dengan titik pemisah', () => {
    expect(formatRupiah(50000)).toBe('Rp 50.000');
    expect(formatRupiah(1000)).toBe('Rp 1.000');
    expect(formatRupiah(999)).toBe('Rp 999');
  });

  it('memformat jutaan dengan singkatan "jt"', () => {
    expect(formatRupiah(1500000)).toBe('Rp 1.5 jt');
    expect(formatRupiah(2000000)).toBe('Rp 2.0 jt');
    expect(formatRupiah(10000000)).toBe('Rp 10.0 jt');
  });

  it('memformat miliaran dengan singkatan "M"', () => {
    expect(formatRupiah(1000000000)).toBe('Rp 1.0 M');
    expect(formatRupiah(2500000000)).toBe('Rp 2.5 M');
  });

  it('menangani nilai negatif (menggunakan abs)', () => {
    expect(formatRupiah(-50000)).toBe('Rp 50.000');
    expect(formatRupiah(-1500000)).toBe('Rp 1.5 jt');
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
});

// ─── parseDateInput ───────────────────────────────────────────────────────────
describe('parseDateInput', () => {
  it('menerima format DD/MM/YYYY yang valid dan mengembalikan ISO string', () => {
    const result = parseDateInput('21/04/2026');
    expect(result).not.toBeNull();
    expect(typeof result).toBe('string');
    expect(result).toContain('2026-04-21');
  });

  it('menolak string kosong atau null', () => {
    expect(parseDateInput('')).toBeNull();
    expect(parseDateInput(null)).toBeNull();
    expect(parseDateInput(undefined)).toBeNull();
  });

  it('menolak format yang salah (bukan DD/MM/YYYY)', () => {
    expect(parseDateInput('2026-04-21')).toBeNull(); // format ISO
    expect(parseDateInput('21-04-2026')).toBeNull(); // format dash
    expect(parseDateInput('21/04')).toBeNull();       // kurang bagian
  });

  it('menolak tanggal di luar range valid', () => {
    expect(parseDateInput('00/04/2026')).toBeNull(); // hari 0
    expect(parseDateInput('32/04/2026')).toBeNull(); // hari 32
    expect(parseDateInput('21/13/2026')).toBeNull(); // bulan 13
    expect(parseDateInput('21/04/1999')).toBeNull(); // tahun < 2000
    expect(parseDateInput('21/04/2101')).toBeNull(); // tahun > 2100
  });

  it('menolak tanggal invalid meskipun angkanya masuk range (contoh: 31 Feb)', () => {
    // Date('2026-02-31') → Invalid Date → return null
    expect(parseDateInput('31/02/2026')).toBeNull();
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
});

// ─── escapeCSV ────────────────────────────────────────────────────────────────
import { escapeCSV } from '../../src/utils/formatting';

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
});
