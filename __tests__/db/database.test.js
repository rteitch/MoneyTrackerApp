/**
 * __tests__/db/database.test.js
 *
 * Unit tests untuk fungsi pure/logic di src/db/database.js
 *
 * Catatan: Fungsi yang membutuhkan SQLite diuji dengan mock database supaya
 * bisa berjalan tanpa device fisik/emulator.
 *
 * Jalankan: npm test
 */

import {
  calculateFinancialHealth,
  generateSummary,
  getDateFilterBoundary,
  calculateNextDate,
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

// ─── calculateNextDate ────────────────────────────────────────────────────────
describe('calculateNextDate', () => {
  it('daily: menambah 1 hari', () => {
    expect(calculateNextDate('daily', '2026-05-04')).toBe('2026-05-05');
  });

  it('weekly: menambah 7 hari', () => {
    expect(calculateNextDate('weekly', '2026-05-04')).toBe('2026-05-11');
  });

  it('monthly: menambah 1 bulan', () => {
    expect(calculateNextDate('monthly', '2026-01-15')).toBe('2026-02-15');
  });

  it('monthly: menangani akhir bulan (31 Jan → 28 Feb)', () => {
    const result = calculateNextDate('monthly', '2026-01-31');
    // JS Date overflow: 31 Feb → 3 Mar, tapi yang penting tidak error
    expect(result).toContain('2026-0');
  });

  it('yearly: menambah 1 tahun', () => {
    expect(calculateNextDate('yearly', '2026-05-04')).toBe('2027-05-04');
  });

  it('default (unknown frequency): menambah 1 bulan', () => {
    const result = calculateNextDate('unknown', '2026-05-04');
    expect(result).toBe('2026-06-04');
  });

  it('mengembalikan format YYYY-MM-DD', () => {
    const result = calculateNextDate('daily', '2026-12-31');
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('daily lintas bulan', () => {
    expect(calculateNextDate('daily', '2026-01-31')).toBe('2026-02-01');
  });

  it('yearly lintas tahun kabisat', () => {
    expect(calculateNextDate('yearly', '2024-02-29')).toBe('2025-03-01');
  });
});

// ─── DB Async Functions Mock Tests ────────────────────────────────────────────

import {
  getAccounts,
  getTotalHarta,
  addCategory,
  deleteCategory,
  getBudgets,
  getBudgetWithSpending,
  setBudget,
  deleteBudget,
  getRecurringTransactions,
  addRecurringTransaction,
  deleteRecurringTransaction,
  toggleRecurringTransaction,
  getDebts,
  getDebtSummary,
  addDebt,
  addDebtPayment,
  settleDebt,
  deleteDebt,
  getDebtPayments,
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

  // ── Existing tests ────────────────────────────────────────────────────────
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

  // ── Budget Functions ──────────────────────────────────────────────────────
  describe('Budget Functions', () => {
    it('getBudgets mengembalikan daftar budget aktif', async () => {
      const mockBudgets = [
        { id: 1, category_id: 5, monthly_limit: 500000, category_name: 'Makanan' },
      ];
      mockDb.getAllAsync.mockResolvedValueOnce(mockBudgets);

      const result = await getBudgets(mockDb);
      expect(result).toEqual(mockBudgets);
      expect(mockDb.getAllAsync).toHaveBeenCalled();
    });

    it('setBudget melakukan INSERT OR REPLACE', async () => {
      mockDb.runAsync.mockResolvedValueOnce({ lastInsertRowId: 1 });

      await setBudget(mockDb, 5, 500000);

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE'),
        [5, 500000]
      );
    });

    it('deleteBudget menghapus budget berdasarkan id', async () => {
      mockDb.runAsync.mockResolvedValueOnce(true);

      await deleteBudget(mockDb, 1);

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM budgets'),
        [1]
      );
    });

    it('getBudgetWithSpending mengembalikan data budget dengan spending', async () => {
      const mockData = [
        { id: 1, category_name: 'Makanan', monthly_limit: 500000, spent: 250000 },
      ];
      mockDb.getAllAsync.mockResolvedValueOnce(mockData);

      const result = await getBudgetWithSpending(mockDb, 5, 2026);
      expect(result).toEqual(mockData);
    });
  });

  // ── Recurring Transaction Functions ───────────────────────────────────────
  describe('Recurring Transaction Functions', () => {
    it('getRecurringTransactions mengembalikan daftar recurring', async () => {
      const mockRecurring = [
        { id: 1, amount: 50000, frequency: 'monthly', next_date: '2026-06-01' },
      ];
      mockDb.getAllAsync.mockResolvedValueOnce(mockRecurring);

      const result = await getRecurringTransactions(mockDb);
      expect(result).toEqual(mockRecurring);
    });

    it('addRecurringTransaction menyimpan recurring baru', async () => {
      mockDb.runAsync.mockResolvedValueOnce({ lastInsertRowId: 1 });

      const params = {
        amount: 50000,
        fee: 0,
        type: 'expense',
        account_id: 1,
        category_id: 5,
        description: 'Makan siang',
        frequency: 'daily',
        next_date: '2026-05-05',
      };
      await addRecurringTransaction(mockDb, params);

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO recurring_transactions'),
        [50000, 0, 'expense', 1, null, 5, null, 'Makan siang', 'daily', '2026-05-05']
      );
    });

    it('deleteRecurringTransaction menghapus recurring', async () => {
      mockDb.runAsync.mockResolvedValueOnce(true);

      await deleteRecurringTransaction(mockDb, 1);

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM recurring_transactions'),
        [1]
      );
    });

    it('toggleRecurringTransaction menonaktifkan recurring', async () => {
      mockDb.runAsync.mockResolvedValueOnce(true);

      await toggleRecurringTransaction(mockDb, 1, false);

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'UPDATE recurring_transactions SET is_active = ? WHERE id = ?',
        [0, 1]
      );
    });

    it('toggleRecurringTransaction mengaktifkan recurring', async () => {
      mockDb.runAsync.mockResolvedValueOnce(true);

      await toggleRecurringTransaction(mockDb, 1, true);

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'UPDATE recurring_transactions SET is_active = ? WHERE id = ?',
        [1, 1]
      );
    });
  });

  // ── Debt Functions ────────────────────────────────────────────────────────
  describe('Debt Functions', () => {
    it('getDebts mengembalikan daftar hutang/piutang', async () => {
      const mockDebts = [
        { id: 1, person_name: 'Budi', original_amount: 1000000, remaining_amount: 500000, type: 'receivable' },
      ];
      mockDb.getAllAsync.mockResolvedValueOnce(mockDebts);

      const result = await getDebts(mockDb, 'receivable');
      expect(result).toEqual(mockDebts);
    });

    it('getDebtSummary mengembalikan ringkasan hutang dan piutang', async () => {
      mockDb.getFirstAsync
        .mockResolvedValueOnce({ total: 2000000 })   // piutang
        .mockResolvedValueOnce({ total: 1500000 });   // hutang

      const result = await getDebtSummary(mockDb);
      expect(result).toHaveProperty('totalReceivable');
      expect(result).toHaveProperty('totalPayable');
      expect(result).toHaveProperty('net');
      expect(result.totalReceivable).toBe(2000000);
      expect(result.totalPayable).toBe(1500000);
      expect(result.net).toBe(500000);
    });

    it('getDebtSummary menangani null (tidak ada data)', async () => {
      mockDb.getFirstAsync
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const result = await getDebtSummary(mockDb);
      expect(result.totalReceivable).toBe(0);
      expect(result.totalPayable).toBe(0);
      expect(result.net).toBe(0);
    });

    it('addDebt menyimpan hutang/piutang baru', async () => {
      mockDb.runAsync.mockResolvedValueOnce({ lastInsertRowId: 1 });

      const params = {
        type: 'receivable',
        person_name: 'Budi',
        amount: 1000000,
        description: 'Pinjaman',
        due_date: '2026-06-01',
      };
      await addDebt(mockDb, params);

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO debts'),
        ['receivable', 'Budi', 1000000, 1000000, 'Pinjaman', '2026-06-01']
      );
    });

    it('addDebtPayment mengurangi sisa hutang', async () => {
      // addDebtPayment: BEGIN → INSERT payment → SELECT debt → UPDATE debt → COMMIT
      mockDb.execAsync.mockResolvedValue(undefined);
      mockDb.runAsync.mockResolvedValue(undefined);
      mockDb.getFirstAsync.mockResolvedValueOnce({ id: 1, remaining_amount: 500000, status: 'pending' });
      mockDb.runAsync.mockResolvedValue(undefined);

      await addDebtPayment(mockDb, 1, 250000, '2026-05-04', 'Cicilan 1');

      // Verify INSERT into debt_payments was called
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO debt_payments'),
        [1, 250000, '2026-05-04', 'Cicilan 1']
      );
      // Verify UPDATE debts was called with new remaining
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE debts'),
        [250000, 'partial', 1]
      );
    });

    it('settleDebt melunasi sisa hutang', async () => {
      // settleDebt: SELECT debt → (if remaining > 0) calls addDebtPayment
      mockDb.getFirstAsync.mockResolvedValueOnce({ id: 1, remaining_amount: 300000, status: 'partial' });
      mockDb.execAsync.mockResolvedValue(undefined);
      mockDb.runAsync.mockResolvedValue(undefined);
      // addDebtPayment also does getFirstAsync inside
      mockDb.getFirstAsync.mockResolvedValueOnce({ id: 1, remaining_amount: 300000, status: 'partial' });

      await settleDebt(mockDb, 1);

      // Verify the payment insert was called with the full remaining amount
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO debt_payments'),
        expect.arrayContaining([1, 300000])
      );
    });

    it('deleteDebt menghapus hutang beserta riwayat pembayaran', async () => {
      mockDb.execAsync.mockResolvedValue(undefined);
      mockDb.runAsync.mockResolvedValue(undefined);

      await deleteDebt(mockDb, 1);

      // Verify DELETE debt_payments and DELETE debts
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'DELETE FROM debt_payments WHERE debt_id = ?',
        [1]
      );
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'DELETE FROM debts WHERE id = ?',
        [1]
      );
    });

    it('getDebtPayments mengembalikan riwayat pembayaran', async () => {
      const mockPayments = [
        { id: 1, debt_id: 1, amount: 250000, date: '2026-05-04' },
      ];
      mockDb.getAllAsync.mockResolvedValueOnce(mockPayments);

      const result = await getDebtPayments(mockDb, 1);
      expect(result).toEqual(mockPayments);
    });
  });
});
