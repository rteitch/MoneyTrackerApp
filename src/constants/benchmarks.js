/**
 * src/constants/benchmarks.js
 *
 * Financial benchmarks & investment reference rates.
 * All analysis uses these — no AI, pure formula-driven.
 */

// ─── Expense Ratio Benchmarks (% of net income) ─────────────────────────────
export const EXPENSE_BENCHMARKS = {
  housing:        { max: 0.30, warn: 0.35, label: 'Tempat Tinggal' },
  food:           { max: 0.15, warn: 0.20, label: 'Makanan & Minuman' },
  transportation: { max: 0.15, warn: 0.20, label: 'Transportasi' },
  debt:           { max: 0.30, warn: 0.43, label: 'Cicilan / Hutang' },
  lifestyle:      { max: 0.10, warn: 0.20, label: 'Gaya Hidup' },
  family:         { max: 0.10, warn: 0.15, label: 'Keluarga' },
  savings:        { min: 0.20, target: 0.30, label: 'Tabungan / Investasi' },
};

// ─── Emergency Fund Targets (months of essential expenses) ──────────────────
export const EMERGENCY_FUND_TARGETS = {
  stable:    { min: 3, recommended: 6,  high: 9  }, // karyawan tetap
  variable:  { min: 6, recommended: 9,  high: 12 }, // freelance / bisnis
  irregular: { min: 6, recommended: 12, high: 12 }, // tidak tentu
};

// ─── DTI (Debt-to-Income) Benchmarks ────────────────────────────────────────
export const DTI_BENCHMARKS = {
  safe:       0.15, // ≤ 15% — very safe
  manageable: 0.25, // ≤ 25% — manageable
  limit:      0.30, // ≤ 30% — at the limit (Bank Indonesia standard)
  high:       0.43, // ≤ 43% — high (US FHA standard upper bound)
  // > 43% = dangerous
};

// ─── Savings Rate Benchmarks ─────────────────────────────────────────────────
export const SAVINGS_RATE_BENCHMARKS = {
  minimum:   0.10, // 10% — minimum acceptable
  good:      0.20, // 20% — good (50/30/20 rule)
  excellent: 0.30, // 30% — excellent
};

// ─── Investment Historical Return Rates (annual, Indonesia) ─────────────────
// Source: historical average data, NOT guaranteed returns
export const INVESTMENT_RETURNS = {
  deposito:        { conservative: 0.040, moderate: 0.055, optimistic: 0.065, label: 'Deposito Bank' },
  sbn:             { conservative: 0.060, moderate: 0.068, optimistic: 0.075, label: 'SBN / ORI / Sukuk' },
  reksadana_pasar: { conservative: 0.055, moderate: 0.075, optimistic: 0.095, label: 'Reksa Dana Pasar Uang' },
  reksadana_saham: { conservative: 0.080, moderate: 0.120, optimistic: 0.160, label: 'Reksa Dana Saham' },
  emas:            { conservative: 0.060, moderate: 0.090, optimistic: 0.130, label: 'Emas' },
  saham:           { conservative: 0.070, moderate: 0.130, optimistic: 0.200, label: 'Saham Langsung' },
  custom:          { conservative: null,  moderate: null,  optimistic: null,  label: 'Custom' },
};

// ─── Inflation Rate (Indonesia) ──────────────────────────────────────────────
export const INFLATION_RATE_DEFAULT = 0.04; // 4% per tahun

// ─── Financial Health Score Weights ─────────────────────────────────────────
export const SCORE_WEIGHTS = {
  cashFlow:      0.25, // 25 poin
  debt:          0.20, // 20 poin
  emergencyFund: 0.20, // 20 poin
  savingsRate:   0.20, // 20 poin
  housing:       0.10, // 10 poin
  goals:         0.05, //  5 poin
};

// ─── Health Score Levels ─────────────────────────────────────────────────────
export const HEALTH_LEVELS = [
  { min: 81, max: 100, key: 'strong',      label: 'Sangat Sehat',    color: '#0ea5e9', emoji: '💪' },
  { min: 61, max: 80,  key: 'healthy',     label: 'Sehat',           color: '#10B981', emoji: '🟢' },
  { min: 41, max: 60,  key: 'needs_work',  label: 'Perlu Perbaikan', color: '#f59e0b', emoji: '🟡' },
  { min: 21, max: 40,  key: 'at_risk',     label: 'Berisiko',        color: '#f97316', emoji: '🟠' },
  { min: 0,  max: 20,  key: 'critical',    label: 'Kritis',          color: '#EF4444', emoji: '🔴' },
];

export function getHealthLevel(score) {
  return HEALTH_LEVELS.find(l => score >= l.min && score <= l.max) || HEALTH_LEVELS[HEALTH_LEVELS.length - 1];
}
