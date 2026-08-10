/**
 * __tests__/utils/financialEngine.test.js
 *
 * ISTQB Foundation Level Compliant Test Suite for Core Financial Engine.
 *
 * Techniques Used:
 * - Equivalence Partitioning (Valid/Invalid data ranges)
 * - Boundary Value Analysis (Score sub-boundaries, 0%, 100%, 15%, 30%, 43%)
 * - Decision Table Testing (Cash Flow scoring, Health level mapping)
 * - Error Guessing (Empty inputs, zero division, negative values, interest overflow)
 */

import {
  runFinancialAnalysis,
  simulateExpenseReduction,
  simulateInvestment,
  simulateDebtPayoff,
  simulateGoalTimeline,
  formatPercent,
  getRatioBenchmarkStatus,
} from '../../src/utils/financialEngine';

describe('Financial Engine — ISTQB Unit Test Suite', () => {

  // ───────────────────────────────────────────────────────────────────────────
  // 1. runFinancialAnalysis()
  // ───────────────────────────────────────────────────────────────────────────
  describe('runFinancialAnalysis()', () => {
    
    test('TC-FE-001 [Positive Path] Should calculate analysis correctly from actual transactions', () => {
      const data = {
        transactions: [
          { type: 'income', amount: 10000000, category_name: 'Gaji' },
          { type: 'expense', amount: 3000000, category_name: 'Kebutuhan Pokok (Tetap)', subcategory_name: 'Sewa rumah / kos' },
          { type: 'expense', amount: 1500000, category_name: 'Makanan & Minuman' },
        ],
        profile: { monthly_income: 10000000, income_stability: 'stable' },
        fixedExpenses: [],
        debts: [],
        goals: [{ status: 'active', type: 'emergency_fund' }, { status: 'active', type: 'house' }],
        liquidBalance: 27000000,
      };

      const result = runFinancialAnalysis(data, 8, 2026);

      expect(result.period).toEqual({ month: 8, year: 2026 });
      expect(result.income).toBe(10000000);
      expect(result.expense).toBe(4500000);
      expect(result.cashFlow).toBe(5500000);
      expect(result.savingsRate).toBe(0.55);
      expect(result.dataSource).toBe('transactions');
      expect(result.healthScore).toBeGreaterThanOrEqual(80);
      expect(result.level.key).toBe('strong');
    });

    test('TC-FE-002 [Fallback/Equivalence] Should fallback to profile income if no income transactions exist', () => {
      const data = {
        transactions: [
          { type: 'expense', amount: 2000000, category_name: 'Makanan & Minuman' },
        ],
        profile: { monthly_income: 8000000, income_stability: 'stable' },
        fixedExpenses: [],
        debts: [],
        goals: [],
        liquidBalance: 10000000,
      };

      const result = runFinancialAnalysis(data, 8, 2026);

      expect(result.income).toBe(8000000);
      expect(result.dataSource).toBe('profile');
      expect(result.cashFlow).toBe(6000000);
    });

    test('TC-FE-003 [Boundary/Edge Case] Should handle 0 income and 0 expenses without throwing NaN', () => {
      const data = {
        transactions: [],
        profile: { monthly_income: 0 },
        fixedExpenses: [],
        debts: [],
        goals: [],
        liquidBalance: 0,
      };

      const result = runFinancialAnalysis(data, 8, 2026);

      expect(result.income).toBe(0);
      expect(result.expense).toBe(0);
      expect(result.cashFlow).toBe(0);
      expect(result.savingsRate).toBe(0);
      expect(result.dti).toBe(0);
      expect(result.emergencyMonths).toBe(0);
      expect(isNaN(result.healthScore)).toBe(false);
      expect(result.healthScore).toBeGreaterThanOrEqual(0);
    });

    test('TC-FE-004 [Decision Table] Cash flow scoring sub-boundaries', () => {
      // Test different savings rate / cash flow ratios against scoring tiers
      const makeDataWithIncome = (cf) => ({
        transactions: [
          { type: 'income', amount: 10000000 },
          { type: 'expense', amount: 10000000 - cf },
        ],
        profile: { monthly_income: 10000000 },
      });

      // Tier >= 30% -> score 25
      expect(runFinancialAnalysis(makeDataWithIncome(3000000), 8, 2026).scores.cashFlow).toBe(25);
      // Tier >= 20% -> score 20
      expect(runFinancialAnalysis(makeDataWithIncome(2000000), 8, 2026).scores.cashFlow).toBe(20);
      // Tier >= 10% -> score 15
      expect(runFinancialAnalysis(makeDataWithIncome(1000000), 8, 2026).scores.cashFlow).toBe(15);
      // Tier >= 0% -> score 8
      expect(runFinancialAnalysis(makeDataWithIncome(0), 8, 2026).scores.cashFlow).toBe(8);
      // Tier >= -10% -> score 3
      expect(runFinancialAnalysis(makeDataWithIncome(-1000000), 8, 2026).scores.cashFlow).toBe(3);
      // Tier < -10% -> score 0
      expect(runFinancialAnalysis(makeDataWithIncome(-2000000), 8, 2026).scores.cashFlow).toBe(0);
    });

    test('TC-FE-004B [Branch Coverage] Fixed expenses annual frequency & active debt records calculation', () => {
      const data = {
        transactions: [],
        profile: { monthly_income: 10000000 },
        fixedExpenses: [
          { category: 'housing', amount: 12000000, frequency: 'annual' },
          { category: 'food', amount: 1000000, frequency: 'monthly' },
        ],
        debts: [
          { status: 'active', monthly_payment: 1500000 },
          { status: 'settled', monthly_payment: 2000000 },
        ],
        goals: [{ status: 'active', type: 'custom' }],
        liquidBalance: 5000000,
      };

      const result = runFinancialAnalysis(data, 8, 2026);
      expect(result.groups.housing).toBe(1000000); // 12m / 12
      expect(result.totalDebtPayment).toBe(1500000); // Only active debt included
      expect(result.scores.goals).toBe(3); // 1 active goal
    });

    test('TC-FE-004C [Boundary] Debt and Housing sub-tier score coverage', () => {
      const makeHousingData = (housingRatio) => ({
        transactions: [
          { type: 'income', amount: 10000000 },
          { type: 'expense', amount: 10000000 * housingRatio, category_name: 'Kebutuhan Pokok (Tetap)', subcategory_name: 'Sewa rumah / kos' },
        ],
        profile: { monthly_income: 10000000 },
      });

      expect(runFinancialAnalysis(makeHousingData(0.33), 8, 2026).scores.housing).toBe(4);
      expect(runFinancialAnalysis(makeHousingData(0.38), 8, 2026).scores.housing).toBe(2);
      expect(runFinancialAnalysis(makeHousingData(0.45), 8, 2026).scores.housing).toBe(0);

      const makeDebtData = (dti) => ({
        transactions: [
          { type: 'income', amount: 10000000 },
          { type: 'expense', amount: 10000000 * dti, category_name: 'Kewajiban Keuangan', subcategory_name: 'Cicilan Kendaraan' },
        ],
        profile: { monthly_income: 10000000 },
      });

      expect(runFinancialAnalysis(makeDebtData(0.35), 8, 2026).scores.debt).toBe(5);
      expect(runFinancialAnalysis(makeDebtData(0.50), 8, 2026).scores.debt).toBe(0);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. simulateExpenseReduction()
  // ───────────────────────────────────────────────────────────────────────────
  describe('simulateExpenseReduction()', () => {

    test('TC-FE-005 [Happy Path] Should calculate monthly, annual, and 5-year savings', () => {
      const res = simulateExpenseReduction({
        currentExpense: 3000000,
        newExpense: 2000000,
        currentCashFlow: 1000000,
        netIncome: 10000000,
        months: 60,
      });

      expect(res.monthlySaving).toBe(1000000);
      expect(res.annualSaving).toBe(12000000);
      expect(res.capitalIn5Year).toBe(60000000);
      expect(res.newCashFlow).toBe(2000000);
      expect(res.newSavingsRate).toBe(0.20);
    });

    test('TC-FE-006 [Boundary] Should handle 0 income gracefully', () => {
      const res = simulateExpenseReduction({
        currentExpense: 1000000,
        newExpense: 500000,
        currentCashFlow: -1000000,
        netIncome: 0,
        months: 12,
      });

      expect(res.newSavingsRate).toBe(0);
      expect(res.monthlySaving).toBe(500000);
      expect(res.newCashFlow).toBe(-500000);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. simulateInvestment()
  // ───────────────────────────────────────────────────────────────────────────
  describe('simulateInvestment()', () => {

    test('TC-FE-007 [Compound Interest] Should calculate correct final value and real value after inflation', () => {
      const res = simulateInvestment({
        initialAmount: 10000000,
        monthlyContribution: 1000000,
        annualReturnRate: 0.12, // 12%/year
        inflationRate: 0.04,   // 4%/year
        durationMonths: 60,    // 5 years
      });

      expect(res.totalContribution).toBe(70000000); // 10m + 50m
      expect(res.estimatedFinalValue).toBeGreaterThan(70000000);
      expect(res.estimatedGrowth).toBe(res.estimatedFinalValue - res.totalContribution);
      expect(res.realValueAfterInflation).toBeLessThan(res.estimatedFinalValue);
      expect(res.disclaimer).toBeDefined();
    });

    test('TC-FE-008 [Zero Contribution] Should work with initial balance only', () => {
      const res = simulateInvestment({
        initialAmount: 5000000,
        monthlyContribution: 0,
        annualReturnRate: 0.10,
        inflationRate: 0.04,
        durationMonths: 12,
      });

      expect(res.totalContribution).toBe(5000000);
      expect(res.estimatedFinalValue).toBe(Math.round(5000000 * Math.pow(1 + 0.10 / 12, 12)));
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. simulateDebtPayoff()
  // ───────────────────────────────────────────────────────────────────────────
  describe('simulateDebtPayoff()', () => {

    test('TC-FE-009 [0% Bunga] Should divide principal by monthly payment directly', () => {
      const res = simulateDebtPayoff({
        principal: 12000000,
        annualInterestRate: 0,
        monthlyPayment: 1000000,
      });

      expect(res.payoffMonths).toBe(12);
      expect(res.totalInterestPaid).toBe(0);
      expect(res.totalPaid).toBe(12000000);
    });

    test('TC-FE-010 [Positive Interest] Should compute amortization correctly', () => {
      const res = simulateDebtPayoff({
        principal: 10000000,
        annualInterestRate: 0.12,
        monthlyPayment: 1000000,
      });

      expect(res.payoffMonths).toBe(11);
      expect(res.totalInterestPaid).toBeGreaterThan(0);
      expect(res.totalPaid).toBe(10000000 + res.totalInterestPaid);
    });

    test('TC-FE-011 [Boundary/Negative Interest Edge] Should return null if payment is less than monthly interest', () => {
      const res = simulateDebtPayoff({
        principal: 100000000,
        annualInterestRate: 0.24, // 2% per month = 2,000,000 interest
        monthlyPayment: 1000000,   // payment doesn't cover interest
      });

      expect(res.payoffMonths).toBeNull();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. simulateGoalTimeline()
  // ───────────────────────────────────────────────────────────────────────────
  describe('simulateGoalTimeline()', () => {

    test('TC-FE-012 [Happy Path] Should estimate remaining months accurately', () => {
      const res = simulateGoalTimeline({
        targetAmount: 50000000,
        currentAmount: 10000000,
        monthlyAlloc: 2000000,
      });

      expect(res.remainingAmount).toBe(40000000);
      expect(res.estimatedMonths).toBe(20);
      expect(res.onTrack).toBe(true);
    });

    test('TC-FE-013 [Boundary] Should return null months when monthly allocation is 0 or negative', () => {
      const res = simulateGoalTimeline({
        targetAmount: 10000000,
        currentAmount: 0,
        monthlyAlloc: 0,
      });

      expect(res.estimatedMonths).toBeNull();
      expect(res.onTrack).toBe(false);
    });

    test('TC-FE-014 [Already Reached] Should return 0 remaining and 0 months when current >= target', () => {
      const res = simulateGoalTimeline({
        targetAmount: 10000000,
        currentAmount: 15000000,
        monthlyAlloc: 1000000,
      });

      expect(res.remainingAmount).toBe(0);
      expect(res.estimatedMonths).toBe(0);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 6. Formatting & Benchmark Utilities
  // ───────────────────────────────────────────────────────────────────────────
  describe('Formatting & Benchmark Helpers', () => {

    test('TC-FE-015 formatPercent() should format ratios as percentage string', () => {
      expect(formatPercent(0.254)).toBe('25.4%');
      expect(formatPercent(0)).toBe('0.0%');
      expect(formatPercent(1.0)).toBe('100.0%');
    });

    test('TC-FE-016 getRatioBenchmarkStatus() should evaluate ratio status correctly', () => {
      expect(getRatioBenchmarkStatus('housing', 0.20)).toBe('ok');
      expect(getRatioBenchmarkStatus('housing', 0.32)).toBe('warning');
      expect(getRatioBenchmarkStatus('housing', 0.45)).toBe('danger');
      expect(getRatioBenchmarkStatus('unknown_group', 0.90)).toBe('ok');
    });
  });

});
