/**
 * src/utils/financialEngine.js
 *
 * Core Financial Analysis Engine — pure JavaScript, no AI.
 * Takes raw data from SQLite and produces structured analysis.
 */

import { getAnalysisGroup } from '../constants/categoryMap';
import {
  SCORE_WEIGHTS,
  EXPENSE_BENCHMARKS,
  EMERGENCY_FUND_TARGETS,
  DTI_BENCHMARKS,
  SAVINGS_RATE_BENCHMARKS,
  getHealthLevel,
} from '../constants/benchmarks';

// ─── Main Entry Point ─────────────────────────────────────────────────────────

/**
 * Run full financial analysis.
 * @param {object} data - { transactions, profile, fixedExpenses, debts, goals, liquidBalance }
 * @param {number} month - 1-12
 * @param {number} year
 * @returns {object} Full analysis result
 */
export function runFinancialAnalysis(data, month, year) {
  const { transactions = [], profile = {}, fixedExpenses = [], debts = [], goals = [], liquidBalance = 0 } = data;

  // ── Step 1: Aggregate income & expense from transactions ──────────────────
  const txIncome  = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const txExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  // Use profile income if transactions have no income data (new user)
  const netIncome = txIncome > 0 ? txIncome : (profile.monthly_income || 0);
  const totalExpense = txExpense;

  // ── Step 2: Build expense groups ──────────────────────────────────────────
  const groups = buildExpenseGroups(transactions, fixedExpenses);

  // ── Step 3: Calculate expense ratios ──────────────────────────────────────
  const ratios = calcRatios(groups, netIncome);

  // ── Step 4: Debt metrics ───────────────────────────────────────────────────
  const totalDebtPayment = calcTotalMonthlyDebtPayment(debts, groups);
  const dti = netIncome > 0 ? totalDebtPayment / netIncome : 0;

  // ── Step 5: Cash flow & savings ───────────────────────────────────────────
  const cashFlow    = netIncome - totalExpense;
  const savingsRate = netIncome > 0 ? cashFlow / netIncome : 0;

  // ── Step 6: Emergency fund ────────────────────────────────────────────────
  const essentialExpense = calcEssentialMonthlyExpense(groups, debts);
  const emergencyMonths  = essentialExpense > 0 ? liquidBalance / essentialExpense : 0;
  const emergencyTarget  = EMERGENCY_FUND_TARGETS[profile.income_stability || 'stable'];

  // ── Step 7: Health Score ───────────────────────────────────────────────────
  const scores = calcHealthScores({
    cashFlow, netIncome, savingsRate, dti,
    emergencyMonths, emergencyTarget, ratios,
    goals, profile,
  });
  const healthScore = Object.entries(SCORE_WEIGHTS).reduce(
    (total, [key, weight]) => total + (scores[key] || 0) * 100 * weight / getMaxScore(key),
    0
  );
  const roundedScore = Math.round(Math.min(100, Math.max(0, healthScore)));
  const level = getHealthLevel(roundedScore);

  return {
    period: { month, year },
    income: netIncome,
    expense: totalExpense,
    cashFlow,
    savingsRate,
    groups,
    ratios,
    dti,
    totalDebtPayment,
    emergencyMonths,
    emergencyTarget,
    liquidBalance,
    scores,
    healthScore: roundedScore,
    level,
    dataSource: txIncome > 0 ? 'transactions' : 'profile',
  };
}

// ─── Expense Grouping ─────────────────────────────────────────────────────────

function buildExpenseGroups(transactions, fixedExpenses) {
  const groups = {
    housing: 0, food: 0, transportation: 0, debt: 0,
    lifestyle: 0, family: 0, savings: 0, health: 0,
    education: 0, insurance: 0, other: 0,
  };

  // From actual transactions
  for (const tx of transactions) {
    if (tx.type !== 'expense') continue;
    const group = getAnalysisGroup(tx.category_name, tx.subcategory_name);
    groups[group] = (groups[group] || 0) + tx.amount;
  }

  // Add fixed expenses (for profile-based analysis when no transactions)
  for (const fe of fixedExpenses) {
    const group = fe.category || 'other';
    const monthlyAmount = fe.frequency === 'annual' ? fe.amount / 12 : fe.amount;
    groups[group] = (groups[group] || 0) + monthlyAmount;
  }

  return groups;
}

function calcRatios(groups, income) {
  if (!income || income === 0) return {};
  const ratios = {};
  for (const [key, val] of Object.entries(groups)) {
    ratios[key] = val / income;
  }
  return ratios;
}

function calcTotalMonthlyDebtPayment(debts, groups) {
  // From debt records (hutang yang aktif)
  const debtFromRecords = debts
    .filter(d => d.status !== 'settled')
    .reduce((s, d) => s + (d.monthly_payment || 0), 0);

  // Also include from expense groups tagged as 'debt'
  return Math.max(debtFromRecords, groups.debt || 0);
}

function calcEssentialMonthlyExpense(groups, debts) {
  // Essential = housing + food + transportation + health + debt obligations
  return (groups.housing || 0)
       + (groups.food || 0)
       + (groups.transportation || 0)
       + (groups.health || 0)
       + (groups.debt || 0);
}

// ─── Health Score Components ──────────────────────────────────────────────────

function getMaxScore(key) {
  const maxes = { cashFlow: 25, debt: 20, emergencyFund: 20, savingsRate: 20, housing: 10, goals: 5 };
  return maxes[key] || 10;
}

function calcHealthScores({ cashFlow, netIncome, savingsRate, dti, emergencyMonths, emergencyTarget, ratios, goals, profile }) {
  return {
    cashFlow:      scoreCashFlow(cashFlow, netIncome),
    debt:          scoreDebt(dti),
    emergencyFund: scoreEmergencyFund(emergencyMonths, emergencyTarget),
    savingsRate:   scoreSavings(savingsRate),
    housing:       scoreHousing(ratios.housing || 0),
    goals:         scoreGoals(goals),
  };
}

function scoreCashFlow(cashFlow, income) {
  if (!income || income === 0) return 0;
  const r = cashFlow / income;
  if (r >= 0.30) return 25;
  if (r >= 0.20) return 20;
  if (r >= 0.10) return 15;
  if (r >= 0.00) return 8;
  if (r >= -0.10) return 3;
  return 0;
}

function scoreDebt(dti) {
  if (dti === 0) return 20;
  if (dti <= 0.15) return 18;
  if (dti <= 0.25) return 14;
  if (dti <= 0.30) return 10;
  if (dti <= 0.43) return 5;
  return 0;
}

function scoreEmergencyFund(months, target) {
  const recommended = target?.recommended || 6;
  const ratio = months / recommended;
  if (ratio >= 1.0) return 20;
  if (ratio >= 0.75) return 15;
  if (ratio >= 0.50) return 10;
  if (ratio >= 0.25) return 5;
  if (ratio > 0) return 2;
  return 0;
}

function scoreSavings(rate) {
  if (rate >= 0.30) return 20;
  if (rate >= 0.20) return 16;
  if (rate >= 0.10) return 10;
  if (rate >= 0.05) return 5;
  if (rate >= 0.00) return 2;
  return 0;
}

function scoreHousing(ratio) {
  if (ratio === 0) return 8;         // no data
  if (ratio <= 0.20) return 10;
  if (ratio <= 0.25) return 8;
  if (ratio <= 0.30) return 6;
  if (ratio <= 0.35) return 4;
  if (ratio <= 0.40) return 2;
  return 0;
}

function scoreGoals(goals = []) {
  const activeGoals = goals.filter(g => g.status === 'active').length;
  const hasEmergencyGoal = goals.some(g => g.type === 'emergency_fund' && g.status === 'active');
  if (activeGoals >= 2 && hasEmergencyGoal) return 5;
  if (activeGoals >= 2) return 4;
  if (activeGoals >= 1) return 3;
  return 0;
}

// ─── Simulation Engines ───────────────────────────────────────────────────────

/**
 * What-if: What if I reduce an expense?
 */
export function simulateExpenseReduction({ currentExpense, newExpense, currentCashFlow, netIncome, months = 60 }) {
  const saving = currentExpense - newExpense;
  const newCashFlow = currentCashFlow + saving;
  const newSavingsRate = netIncome > 0 ? newCashFlow / netIncome : 0;
  return {
    monthlySaving:  saving,
    annualSaving:   saving * 12,
    capitalIn5Year: saving * months,
    newCashFlow,
    newSavingsRate,
  };
}

/**
 * Investment growth simulator (compound interest).
 * NO guaranteed returns — user inputs their own assumption.
 */
export function simulateInvestment({ initialAmount, monthlyContribution, annualReturnRate, inflationRate = 0.04, durationMonths }) {
  const monthlyRate = annualReturnRate / 12;
  let balance = initialAmount || 0;

  for (let i = 0; i < durationMonths; i++) {
    balance = balance * (1 + monthlyRate) + (monthlyContribution || 0);
  }

  const totalContrib  = (initialAmount || 0) + ((monthlyContribution || 0) * durationMonths);
  const nominalGrowth = balance - totalContrib;
  const years         = durationMonths / 12;
  const realValue     = balance / Math.pow(1 + inflationRate, years);

  return {
    totalContribution:      Math.round(totalContrib),
    estimatedFinalValue:    Math.round(balance),
    estimatedGrowth:        Math.round(nominalGrowth),
    realValueAfterInflation: Math.round(realValue),
    disclaimer: 'Simulasi ini adalah estimasi berdasarkan asumsi yang Anda masukkan, bukan jaminan hasil investasi.',
  };
}

/**
 * Debt payoff calculator.
 */
export function simulateDebtPayoff({ principal, annualInterestRate, monthlyPayment }) {
  if (!annualInterestRate || annualInterestRate === 0) {
    // Simple division if no interest
    const months = monthlyPayment > 0 ? Math.ceil(principal / monthlyPayment) : 0;
    return { payoffMonths: months, totalInterestPaid: 0, totalPaid: principal };
  }

  const monthlyRate = annualInterestRate / 12;
  let balance       = principal;
  let months        = 0;
  let totalInterest = 0;
  const MAX_MONTHS  = 600;

  while (balance > 0 && months < MAX_MONTHS) {
    const interest  = balance * monthlyRate;
    const principal = monthlyPayment - interest;
    if (principal <= 0) { months = MAX_MONTHS; break; } // payment too low to cover interest
    totalInterest += interest;
    balance       -= principal;
    months++;
  }

  return {
    payoffMonths:   months >= MAX_MONTHS ? null : months,
    totalInterestPaid: Math.round(totalInterest),
    totalPaid:      Math.round(principal + totalInterest),
    monthlyPayment,
  };
}

/**
 * Goal timeline estimator.
 */
export function simulateGoalTimeline({ targetAmount, currentAmount, monthlyAlloc }) {
  const remaining = Math.max(0, targetAmount - currentAmount);
  if (!monthlyAlloc || monthlyAlloc <= 0) {
    return { estimatedMonths: null, remainingAmount: remaining, onTrack: false };
  }
  const months = Math.ceil(remaining / monthlyAlloc);
  return {
    remainingAmount: remaining,
    estimatedMonths: months,
    estimatedYears:  (months / 12).toFixed(1),
    onTrack: true,
  };
}

// ─── Formatting Helpers ───────────────────────────────────────────────────────

export function formatPercent(ratio) {
  return `${(ratio * 100).toFixed(1)}%`;
}

export function getRatioBenchmarkStatus(group, ratio) {
  const bench = EXPENSE_BENCHMARKS[group];
  if (!bench) return 'ok';
  if (bench.max && ratio > (bench.warn || bench.max * 1.15)) return 'danger';
  if (bench.max && ratio > bench.max) return 'warning';
  return 'ok';
}
