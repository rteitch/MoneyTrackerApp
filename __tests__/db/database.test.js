/**
 * __tests__/db/database.test.js
 *
 * Unit tests untuk fungsi pure/logic di src/db/database.js
 * 
 * Catatan: Fungsi yang membutuhkan SQLite (addTransaction, deleteTransaction, 
 * updateTransaction, dll) diuji dengan mock database supaya bisa berjalan 
 * tanpa device fisik/emulator.
 *
 * Jalankan: npm test
 */

import {
  calculateFinancialHealth,
  generateSummary,
  getDateFilterBoundary,
} from '../../src/db/database';

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: jest.fn(),
  openDatabaseSync: jest.fn(),
}));

// ─── calculateFinancialHealth ─────────────────────────────────────────────────
describe('calculateFinancialHealth', () => {
  it('menghasilkan status "sehat" ketika savings rate tinggi', () => {
    const result = calculateFinancialHealth({
      income: 10_000_000,
      expense: 5_000_000,
      balance: 30_000_000,
      fixedExpense: 2_000_000,
    });
    expect(result.status).toBe('sehat');
    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.savingsRate).toBe(50.0);
  });

  it('menghasilkan status "warning" ketika pengeluaran mendekati pemasukan', () => {
    const result = calculateFinancialHealth({
      income: 5_000_000,
      expense: 4_000_000,
      balance: 6_000_000,
      fixedExpense: 2_500_000,
    });
    expect(result.status).toBe('warning');
    expect(result.score).toBeGreaterThanOrEqual(40);
    expect(result.score).toBeLessThan(70);
  });

  it('menghasilkan status "kritis" ketika pengeluaran melebihi pemasukan', () => {
    const result = calculateFinancialHealth({
      income: 2_000_000,
      expense: 3_000_000,
      balance: 500_000,
      fixedExpense: 2_500_000,
    });
    expect(result.status).toBe('kritis');
    expect(result.score).toBeLessThan(40);
  });

  it('menangani income = 0 tanpa error (tidak ada pembagian nol)', () => {
    expect(() => {
      calculateFinancialHealth({ income: 0, expense: 0, balance: 0, fixedExpense: 0 });
    }).not.toThrow();
  });

  it('menghitung savingsRate dengan benar', () => {
    const result = calculateFinancialHealth({
      income: 10_000_000,
      expense: 7_000_000,
      balance: 5_000_000,
      fixedExpense: 4_000_000,
    });
    expect(result.savingsRate).toBe(30.0);
    expect(result.eir).toBe(70.0);
  });

  it('menghitung runway dengan benar', () => {
    // balance = 6_000_000, expense = 2_000_000 → runway = 3.0 bulan
    const result = calculateFinancialHealth({
      income: 5_000_000,
      expense: 2_000_000,
      balance: 6_000_000,
      fixedExpense: 1_000_000,
    });
    expect(result.runway).toBe(3.0);
  });

  it('mengembalikan runway Infinity ketika tidak ada pengeluaran', () => {
    const result = calculateFinancialHealth({
      income: 5_000_000,
      expense: 0,
      balance: 10_000_000,
      fixedExpense: 0,
    });
    expect(result.runway).toBe(Infinity);
  });

  it('skor tidak melebihi 100', () => {
    const result = calculateFinancialHealth({
      income: 100_000_000,
      expense: 1_000_000,
      balance: 1_000_000_000,
      fixedExpense: 500_000,
    });
    expect(result.score).toBeLessThanOrEqual(100);
  });
});

// ─── generateSummary ──────────────────────────────────────────────────────────
describe('generateSummary', () => {
  it('mengembalikan string ketika kondisi sehat', () => {
    const metrics = {
      savingsRate: 35,
      eir: 65,
      fixedRatio: 30,
      runway: 8,
      netCashFlow: 3_500_000,
      status: 'sehat',
      score: 80,
    };
    const summary = generateSummary(metrics, []);
    expect(typeof summary).toBe('string');
    expect(summary.length).toBeGreaterThan(0);
    expect(summary).toContain('sehat');
  });

  it('menampilkan peringatan deficit ketika savingsRate negatif', () => {
    const metrics = {
      savingsRate: -10,
      eir: 110,
      fixedRatio: 60,
      runway: 0.5,
      netCashFlow: -1_000_000,
      status: 'kritis',
      score: 15,
    };
    const summary = generateSummary(metrics, []);
    expect(summary).toContain('defisit');
  });

  it('menampilkan kategori teratas jika melebihi 30% pengeluaran', () => {
    const metrics = {
      savingsRate: 20,
      eir: 80,
      fixedRatio: 40,
      runway: 3,
      netCashFlow: 1_000_000,
      status: 'warning',
      score: 55,
      totalExp: 5_000_000,
    };
    const topCat = [{ name: 'Makanan & Minuman', total: 2_000_000 }];
    const summary = generateSummary(metrics, topCat);
    expect(summary).toContain('Makanan & Minuman');
  });

  it('tidak error ketika topCategories kosong', () => {
    const metrics = {
      savingsRate: 20,
      eir: 80,
      fixedRatio: 40,
      runway: 3,
      netCashFlow: 1_000_000,
      status: 'warning',
      score: 55,
    };
    expect(() => generateSummary(metrics, [])).not.toThrow();
    expect(() => generateSummary(metrics, null)).not.toThrow();
    expect(() => generateSummary(metrics, undefined)).not.toThrow();
  });
});

// ─── getDateFilterBoundary ────────────────────────────────────────────────────
describe('getDateFilterBoundary', () => {
  it('mengembalikan objek dengan property start dan end', () => {
    const result = getDateFilterBoundary('month');
    expect(result).toHaveProperty('start');
    expect(result).toHaveProperty('end');
  });

  it('start selalu sebelum atau sama dengan end', () => {
    const filters = ['today', 'week', 'month', 'year', 'last_year', 'all'];
    filters.forEach(f => {
      const { start, end } = getDateFilterBoundary(f);
      expect(new Date(start).getTime()).toBeLessThanOrEqual(new Date(end).getTime());
    });
  });

  it('filter "today" menghasilkan range tanggal hari ini', () => {
    const { start, end } = getDateFilterBoundary('today');
    const today = new Date();
    const startDate = new Date(start);
    expect(startDate.getDate()).toBe(today.getDate());
    expect(startDate.getMonth()).toBe(today.getMonth());
    expect(startDate.getFullYear()).toBe(today.getFullYear());
  });

  it('filter tidak dikenal mengembalikan range default (semua waktu)', () => {
    const { start, end } = getDateFilterBoundary('unknown_filter');
    expect(new Date(start).getFullYear()).toBeLessThan(1971);
    expect(new Date(end).getFullYear()).toBeGreaterThan(2100);
  });
});

// ─── DB Async Functions Mock Tests ────────────────────────────────────────────

import {
  getAccounts,
  getTotalHarta,
  addCategory,
  deleteCategory,
} from '../../src/db/database';

describe('Database Async Functions', () => {
  let mockDb;

  beforeEach(() => {
    mockDb = {
      getFirstAsync: jest.fn(),
      getAllAsync: jest.fn(),
      runAsync: jest.fn(),
      execAsync: jest.fn(),
    };
  });

  it('getAccounts mengembalikan data dari db', async () => {
    const mockAccounts = [{ id: 1, name: 'Dompet Tunai' }];
    mockDb.getAllAsync.mockResolvedValueOnce(mockAccounts);
    
    const result = await getAccounts(mockDb);
    
    expect(mockDb.getAllAsync).toHaveBeenCalledWith('SELECT * FROM accounts WHERE is_active = 1');
    expect(result).toEqual(mockAccounts);
  });

  it('getTotalHarta mengembalikan total saldo dari semua dompet aktif', async () => {
    mockDb.getFirstAsync.mockResolvedValueOnce({ total: 15_000_000 });
    
    const result = await getTotalHarta(mockDb);
    
    expect(mockDb.getFirstAsync).toHaveBeenCalledWith('SELECT SUM(current_balance) as total FROM accounts WHERE is_active = 1 AND exclude_from_total = 0');
    expect(result).toBe(15_000_000);
  });

  it('getTotalHarta mengembalikan 0 jika tidak ada saldo', async () => {
    mockDb.getFirstAsync.mockResolvedValueOnce(null);
    const result = await getTotalHarta(mockDb);
    expect(result).toBe(0);
  });

  it('addCategory menambah kategori dan memanggil runAsync dengan argumen yang benar', async () => {
    mockDb.runAsync.mockResolvedValueOnce({ lastInsertRowId: 5 });
    
    await addCategory(mockDb, { name: 'Gaji', type: 'income', is_fixed: 1 });
    
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      'INSERT INTO categories (name, type, is_fixed) VALUES (?, ?, ?)',
      ['Gaji', 'income', 1]
    );
  });

  it('deleteCategory melakukan soft delete', async () => {
    mockDb.runAsync.mockResolvedValueOnce(true);
    
    await deleteCategory(mockDb, 3);
    
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      'UPDATE categories SET is_deleted = 1 WHERE id = ?',
      [3]
    );
  });
});
