/**
 * __tests__/db/plannerDatabaseFunctions.test.js
 *
 * ISTQB Compliant Unit Test Suite for Financial Planner DB CRUD operations.
 * Uses mock SQLite instance to test statements, queries, and fallback logic.
 */

import {
  getFinancialProfile,
  saveFinancialProfile,
  getIncomeSources,
  addIncomeSource,
  updateIncomeSource,
  deleteIncomeSource,
  getTotalMonthlyIncome,
  getFixedExpenses,
  addFixedExpense,
  updateFixedExpense,
  deleteFixedExpense,
  getFinancialGoals,
  addFinancialGoal,
  updateFinancialGoal,
  contributeToGoal,
  deleteFinancialGoal,
  saveFinancialAssessment,
  getLatestAssessment,
  getAssessmentHistory,
  getMonthlyTransactionSummary,
  getTotalLiquidBalance,
  saveSimulation,
  getSimulations,
  deleteSimulation,
  getAchievements,
  unlockAchievement,
} from '../../src/db/database';

describe('Planner Database CRUD Functions — Unit Test Suite', () => {
  let mockDb;

  beforeEach(() => {
    mockDb = {
      getFirstAsync: jest.fn(),
      getAllAsync: jest.fn(),
      runAsync: jest.fn(),
      execAsync: jest.fn(),
    };
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Financial Profile
  // ───────────────────────────────────────────────────────────────────────────
  describe('Financial Profile CRUD', () => {
    test('TC-DB-001 getFinancialProfile() should query profile with id = 1', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ id: 1, monthly_income: 10000000 });
      const res = await getFinancialProfile(mockDb);
      expect(mockDb.getFirstAsync).toHaveBeenCalledWith('SELECT * FROM financial_profile WHERE id = 1');
      expect(res.monthly_income).toBe(10000000);
    });

    test('TC-DB-002 saveFinancialProfile() should UPDATE if profile exists', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ id: 1 });
      mockDb.runAsync.mockResolvedValue({ changes: 1 });

      const profile = {
        monthly_income: 12000000, income_stability: 'stable', employment_type: 'employee',
        marital_status: 'single', dependents: 0, age: 28, location_type: 'city',
      };

      await saveFinancialProfile(mockDb, profile);

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE financial_profile SET'),
        [12000000, 'stable', 'employee', 'single', 0, 28, 'city']
      );
    });

    test('TC-DB-003 saveFinancialProfile() should INSERT if profile does not exist', async () => {
      mockDb.getFirstAsync.mockResolvedValue(null);
      mockDb.runAsync.mockResolvedValue({ changes: 1 });

      const profile = {
        monthly_income: 8000000, income_stability: 'variable', employment_type: 'freelance',
        marital_status: 'single', dependents: 1, age: 25, location_type: 'suburban',
      };

      await saveFinancialProfile(mockDb, profile);

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO financial_profile'),
        [8000000, 'variable', 'freelance', 'single', 1, 25, 'suburban']
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Income Sources
  // ───────────────────────────────────────────────────────────────────────────
  describe('Income Sources CRUD', () => {
    test('TC-DB-004 getIncomeSources() should fetch active sources', async () => {
      mockDb.getAllAsync.mockResolvedValue([{ id: 1, name: 'Gaji', amount: 10000000 }]);
      const sources = await getIncomeSources(mockDb);
      expect(sources.length).toBe(1);
    });

    test('TC-DB-005 addIncomeSource() should insert and return row ID', async () => {
      mockDb.runAsync.mockResolvedValue({ lastInsertRowId: 42 });
      const id = await addIncomeSource(mockDb, { name: 'Freelance', type: 'freelance', amount: 2000000, frequency: 'monthly' });
      expect(id).toBe(42);
    });

    test('TC-DB-006 updateIncomeSource() & deleteIncomeSource()', async () => {
      mockDb.runAsync.mockResolvedValue({ changes: 1 });
      await updateIncomeSource(mockDb, 42, { name: 'Bonus', type: 'bonus', amount: 5000000, frequency: 'annual' });
      expect(mockDb.runAsync).toHaveBeenCalledWith(expect.stringContaining('UPDATE income_sources'), expect.any(Array));

      await deleteIncomeSource(mockDb, 42);
      expect(mockDb.runAsync).toHaveBeenCalledWith('UPDATE income_sources SET is_active=0 WHERE id=?', [42]);
    });

    test('TC-DB-007 getTotalMonthlyIncome() should calculate total with frequency normalization', async () => {
      mockDb.getAllAsync.mockResolvedValue([
        { amount: 12000000, frequency: 'monthly' },
        { amount: 24000000, frequency: 'annual' }, // 2m/mo
        { amount: 500000, frequency: 'weekly' },    // 2m/mo
      ]);

      const total = await getTotalMonthlyIncome(mockDb);
      expect(total).toBe(16000000); // 12 + 2 + 2
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Fixed Expenses
  // ───────────────────────────────────────────────────────────────────────────
  describe('Fixed Expenses CRUD', () => {
    test('TC-DB-008 getFixedExpenses() & addFixedExpense() & deleteFixedExpense()', async () => {
      mockDb.getAllAsync.mockResolvedValue([{ id: 1, name: 'Sewa Kos', amount: 1500000 }]);
      const list = await getFixedExpenses(mockDb);
      expect(list.length).toBe(1);

      mockDb.runAsync.mockResolvedValue({ lastInsertRowId: 10 });
      const newId = await addFixedExpense(mockDb, { name: 'Listrik', category: 'housing', amount: 500000 });
      expect(newId).toBe(10);

      await updateFixedExpense(mockDb, 10, { name: 'Listrik PLN', category: 'housing', amount: 600000 });
      await deleteFixedExpense(mockDb, 10);
      expect(mockDb.runAsync).toHaveBeenCalledWith('UPDATE fixed_expenses SET is_active=0 WHERE id=?', [10]);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Financial Goals
  // ───────────────────────────────────────────────────────────────────────────
  describe('Financial Goals CRUD', () => {
    test('TC-DB-009 getFinancialGoals() status filtering', async () => {
      mockDb.getAllAsync.mockResolvedValue([{ id: 1, status: 'active' }]);
      
      await getFinancialGoals(mockDb, 'active');
      expect(mockDb.getAllAsync).toHaveBeenCalledWith(expect.stringContaining('status=?'), ['active']);

      await getFinancialGoals(mockDb, 'all');
      expect(mockDb.getAllAsync).toHaveBeenCalledWith('SELECT * FROM financial_goals ORDER BY priority, created_at');
    });

    test('TC-DB-010 addFinancialGoal() & updateFinancialGoal() & deleteFinancialGoal()', async () => {
      mockDb.runAsync.mockResolvedValue({ lastInsertRowId: 5 });
      const goalId = await addFinancialGoal(mockDb, { name: 'DP Rumah', type: 'house', target_amount: 50000000 });
      expect(goalId).toBe(5);

      await updateFinancialGoal(mockDb, 5, { name: 'DP Rumah Cluster', type: 'house', target_amount: 60000000, current_amount: 10000000, monthly_alloc: 2000000, target_date: '2026-12', priority: 1, status: 'active' });
      expect(mockDb.runAsync).toHaveBeenCalledWith(expect.stringContaining('UPDATE financial_goals SET'), expect.any(Array));

      await deleteFinancialGoal(mockDb, 5);
      expect(mockDb.runAsync).toHaveBeenCalledWith('DELETE FROM financial_goals WHERE id=?', [5]);
    });

    test('TC-DB-011 contributeToGoal() should add amount and complete goal if target is reached', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ id: 1, current_amount: 48000000, target_amount: 50000000 });
      mockDb.runAsync.mockResolvedValue({ changes: 1 });

      const res = await contributeToGoal(mockDb, 1, 5000000); // 48m + 5m -> capped at 50m

      expect(res.newAmount).toBe(50000000);
      expect(res.newStatus).toBe('completed');
    });

    test('TC-DB-012 contributeToGoal() throws Error if goal is not found', async () => {
      mockDb.getFirstAsync.mockResolvedValue(null);
      await expect(contributeToGoal(mockDb, 99, 1000)).rejects.toThrow('Goal not found');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. Financial Assessments
  // ───────────────────────────────────────────────────────────────────────────
  describe('Financial Assessments', () => {
    test('TC-DB-013 saveFinancialAssessment() & getLatestAssessment()', async () => {
      mockDb.runAsync.mockResolvedValue({ changes: 1 });
      const ass = {
        period_month: 8, period_year: 2026, total_income: 10000000, total_expense: 5000000,
        cash_flow: 5000000, savings_rate: 0.5, health_score: 82, ratios: { housing: 0.2 }, diagnoses: [{ id: 'D01' }],
      };

      await saveFinancialAssessment(mockDb, ass);
      expect(mockDb.runAsync).toHaveBeenCalledWith(expect.stringContaining('INSERT OR REPLACE INTO financial_assessments'), expect.any(Array));

      mockDb.getFirstAsync.mockResolvedValue({
        period_month: 8, period_year: 2026, health_score: 82,
        ratios_json: '{"housing":0.2}', diagnoses_json: '[{"id":"D01"}]',
      });

      const latest = await getLatestAssessment(mockDb);
      expect(latest.health_score).toBe(82);
      expect(latest.ratios).toEqual({ housing: 0.2 });
      expect(latest.diagnoses).toEqual([{ id: 'D01' }]);
    });

    test('TC-DB-014 getLatestAssessment() returns null if no record exists', async () => {
      mockDb.getFirstAsync.mockResolvedValue(null);
      const latest = await getLatestAssessment(mockDb);
      expect(latest).toBeNull();
    });

    test('TC-DB-015 getAssessmentHistory() returns array of parsed assessments', async () => {
      mockDb.getAllAsync.mockResolvedValue([
        { period_month: 8, period_year: 2026, ratios_json: '{}', diagnoses_json: '[]' },
        { period_month: 7, period_year: 2026, ratios_json: '{}', diagnoses_json: '[]' },
      ]);

      const hist = await getAssessmentHistory(mockDb, 6);
      expect(hist.length).toBe(2);
      expect(hist[0].ratios).toEqual({});
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 6. Aggregated Transaction & Liquid Balance Queries
  // ───────────────────────────────────────────────────────────────────────────
  describe('Aggregated Queries', () => {
    test('TC-DB-016 getMonthlyTransactionSummary()', async () => {
      mockDb.getAllAsync.mockResolvedValue([{ type: 'expense', amount: 50000 }]);
      const summary = await getMonthlyTransactionSummary(mockDb, 8, 2026);
      expect(summary.length).toBe(1);
      expect(mockDb.getAllAsync).toHaveBeenCalledWith(expect.stringContaining('transactions t'), ['2026-08-01', '2026-08-31']);
    });

    test('TC-DB-017 getTotalLiquidBalance()', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ total: 15000000 });
      const total = await getTotalLiquidBalance(mockDb);
      expect(total).toBe(15000000);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 7. Simulations & Achievements
  // ───────────────────────────────────────────────────────────────────────────
  describe('Simulations & Achievements CRUD', () => {
    test('TC-DB-018 saveSimulation() & getSimulations() & deleteSimulation()', async () => {
      mockDb.runAsync.mockResolvedValue({ lastInsertRowId: 100 });
      const simId = await saveSimulation(mockDb, { name: 'Investasi Saham', type: 'investment', input: { a: 1 }, result: { b: 2 } });
      expect(simId).toBe(100);

      mockDb.getAllAsync.mockResolvedValue([{ id: 100, name: 'Investasi Saham', input_json: '{"a":1}', result_json: '{"b":2}' }]);
      const sims = await getSimulations(mockDb);
      expect(sims[0].input).toEqual({ a: 1 });

      await deleteSimulation(mockDb, 100);
      expect(mockDb.runAsync).toHaveBeenCalledWith('DELETE FROM simulations WHERE id=?', [100]);
    });

    test('TC-DB-019 getAchievements() & unlockAchievement()', async () => {
      mockDb.getAllAsync.mockResolvedValue([{ key: 'first_profile' }]);
      const list = await getAchievements(mockDb);
      expect(list.length).toBe(1);

      await unlockAchievement(mockDb, 'score_80');
      expect(mockDb.runAsync).toHaveBeenCalledWith(expect.stringContaining('INSERT OR IGNORE INTO achievements'), ['score_80']);
    });
  });
});
