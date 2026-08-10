/**
 * src/utils/diagnosisEngine.js
 *
 * Rule-Based Diagnosis Engine — detects financial problems from analysis results.
 * Pure logic, no AI. Every diagnosis has severity, message, and actionable recommendations.
 */

import { formatRupiah } from './formatting';
import { EXPENSE_BENCHMARKS } from '../constants/benchmarks';

const SEVERITY_ORDER = { critical: 4, high: 3, medium: 2, low: 1 };

/**
 * Run diagnosis on analysis output from financialEngine.js
 * @param {object} analysis - result of runFinancialAnalysis()
 * @returns {object[]} sorted array of diagnoses
 */
export function runDiagnosis(analysis) {
  const {
    income, expense, cashFlow, savingsRate, dti,
    groups, ratios, emergencyMonths, emergencyTarget,
    liquidBalance, goals = [],
  } = analysis;

  const diagnoses = [];

  // ── D01: Negative Cash Flow ─────────────────────────────────────────────────
  if (cashFlow < 0) {
    const deficit = Math.abs(cashFlow);
    const ratio = income > 0 ? deficit / income : 1;
    diagnoses.push({
      id: 'D01',
      severity: ratio > 0.15 ? 'critical' : 'high',
      title: 'Cash Flow Negatif',
      emoji: '🚨',
      message: `Pengeluaran Anda melebihi pendapatan sebesar ${formatRupiah(deficit)}/bulan. Jika dibiarkan, Anda akan kekurangan ${formatRupiah(deficit * 12)} dalam setahun.`,
      impact: deficit * 12,
      actions: [
        { label: 'Identifikasi pengeluaran yang bisa dikurangi', type: 'expense_reduction' },
        { label: 'Cari tambahan sumber pendapatan', type: 'income_increase' },
        { label: 'Simulasikan perubahan gaya hidup', type: 'simulator' },
      ],
      priority: 1,
    });
  }

  // ── D02: High Housing Cost ──────────────────────────────────────────────────
  const housingRatio = ratios.housing || 0;
  if (housingRatio > EXPENSE_BENCHMARKS.housing.max && income > 0) {
    const excess  = (groups.housing || 0) - income * EXPENSE_BENCHMARKS.housing.max;
    diagnoses.push({
      id: 'D02',
      severity: housingRatio > 0.45 ? 'critical' : housingRatio > 0.40 ? 'high' : 'medium',
      title: 'Biaya Tempat Tinggal Terlalu Tinggi',
      emoji: '🏠',
      message: `Tempat tinggal menggunakan ${(housingRatio * 100).toFixed(1)}% pendapatan Anda. Batas yang disarankan adalah ≤ 30%.`,
      detail: `Potensi penghematan: ${formatRupiah(excess)}/bulan jika mencapai target 30%.`,
      impact: excess,
      actions: [
        { label: 'Simulasikan pindah ke hunian lebih terjangkau', type: 'simulator', params: { category: 'housing' } },
        { label: 'Cari cara menambah pendapatan', type: 'income_increase' },
      ],
      priority: 2,
    });
  }

  // ── D03: High DTI (Debt-to-Income) ──────────────────────────────────────────
  if (dti > 0.30 && income > 0) {
    diagnoses.push({
      id: 'D03',
      severity: dti > 0.43 ? 'critical' : 'high',
      title: 'Beban Cicilan Terlalu Tinggi',
      emoji: '💳',
      message: `${(dti * 100).toFixed(1)}% pendapatan Anda digunakan untuk membayar cicilan. Batas aman adalah ≤ 30% (standar Bank Indonesia).`,
      detail: dti > 0.43 ? 'Kondisi ini dapat mempersulit pengajuan kredit baru.' : undefined,
      impact: (dti - 0.30) * income,
      actions: [
        { label: 'Simulasikan percepatan pelunasan hutang', type: 'debt_payoff' },
        { label: 'Evaluasi hutang berbunga tinggi terlebih dahulu', type: 'debt_priority' },
      ],
      priority: 3,
    });
  }

  // ── D04: No Emergency Fund ──────────────────────────────────────────────────
  const targetMonths = emergencyTarget?.recommended || 6;
  if (emergencyMonths < 1) {
    const targetAmount = (expense > 0 ? expense : income * 0.6) * targetMonths;
    diagnoses.push({
      id: 'D04',
      severity: emergencyMonths === 0 ? 'critical' : 'high',
      title: 'Dana Darurat Tidak Ada / Sangat Kecil',
      emoji: '🛡️',
      message: `Dana darurat Anda hanya cukup untuk ${emergencyMonths.toFixed(1)} bulan. Minimal yang disarankan adalah ${targetMonths} bulan pengeluaran.`,
      detail: `Target dana darurat Anda: ${formatRupiah(targetAmount)}.`,
      impact: targetAmount - liquidBalance,
      actions: [
        { label: 'Buat target dana darurat', type: 'create_goal', params: { type: 'emergency_fund' } },
        { label: 'Alokasikan surplus untuk dana darurat dulu', type: 'goal_allocation' },
      ],
      priority: 4,
    });
  } else if (emergencyMonths < targetMonths) {
    diagnoses.push({
      id: 'D04B',
      severity: 'medium',
      title: 'Dana Darurat Belum Cukup',
      emoji: '🛡️',
      message: `Dana darurat Anda baru cukup untuk ${emergencyMonths.toFixed(1)} bulan dari target ${targetMonths} bulan.`,
      impact: 0,
      actions: [
        { label: 'Tingkatkan alokasi tabungan darurat', type: 'goal_allocation' },
      ],
      priority: 5,
    });
  }

  // ── D05: Low Savings Rate ───────────────────────────────────────────────────
  if (savingsRate >= 0 && savingsRate < 0.10 && income > 0 && cashFlow >= 0) {
    diagnoses.push({
      id: 'D05',
      severity: savingsRate < 0.05 ? 'high' : 'medium',
      title: 'Tingkat Tabungan Rendah',
      emoji: '📉',
      message: `Anda saat ini menabung ${(savingsRate * 100).toFixed(1)}% dari pendapatan. Target yang disarankan adalah minimal 20%.`,
      detail: `Meningkatkan tabungan ke 20% berarti ${formatRupiah(income * 0.20)}/bulan atau ${formatRupiah(income * 0.20 * 12)}/tahun.`,
      impact: income * (0.20 - savingsRate),
      actions: [
        { label: 'Identifikasi pengeluaran opsional untuk dikurangi', type: 'expense_reduction' },
        { label: 'Simulasikan pertumbuhan tabungan', type: 'simulator' },
      ],
      priority: 6,
    });
  }

  // ── D06: High Lifestyle Spending ─────────────────────────────────────────────
  const lifestyleRatio = ratios.lifestyle || 0;
  if (lifestyleRatio > EXPENSE_BENCHMARKS.lifestyle.max && income > 0) {
    const excess = (groups.lifestyle || 0) - income * EXPENSE_BENCHMARKS.lifestyle.max;
    diagnoses.push({
      id: 'D06',
      severity: lifestyleRatio > 0.25 ? 'high' : 'medium',
      title: 'Pengeluaran Gaya Hidup Tinggi',
      emoji: '🎭',
      message: `${(lifestyleRatio * 100).toFixed(1)}% pendapatan Anda digunakan untuk gaya hidup (hiburan, langganan, belanja). Batas yang disarankan adalah ≤ 10%.`,
      detail: `Mengurangi ke target bisa menghemat ${formatRupiah(excess)}/bulan.`,
      impact: excess,
      actions: [
        { label: 'Tinjau daftar langganan aktif', type: 'review_subscriptions' },
        { label: 'Simulasikan pengurangan pengeluaran lifestyle', type: 'simulator', params: { category: 'lifestyle' } },
      ],
      priority: 7,
    });
  }

  // ── D07: No Financial Goals ─────────────────────────────────────────────────
  const activeGoals = goals.filter(g => g.status === 'active');
  if (activeGoals.length === 0 && cashFlow > 0) {
    diagnoses.push({
      id: 'D07',
      severity: 'low',
      title: 'Belum Ada Target Finansial',
      emoji: '🎯',
      message: 'Kondisi keuangan Anda sudah surplus. Mulai tetapkan tujuan finansial agar surplus tidak habis tanpa arah.',
      impact: 0,
      actions: [
        { label: 'Buat target dana darurat', type: 'create_goal', params: { type: 'emergency_fund' } },
        { label: 'Rencanakan tujuan jangka panjang', type: 'create_goal' },
      ],
      priority: 10,
    });
  }

  // ── D08: Credit / Debt Warning ──────────────────────────────────────────────
  const hasDebtExpense = (groups.debt || 0) > 0;
  if (hasDebtExpense && cashFlow < 0) {
    diagnoses.push({
      id: 'D08',
      severity: 'critical',
      title: 'Menggunakan Hutang untuk Biaya Rutin',
      emoji: '⚠️',
      message: 'Cash flow Anda negatif dan Anda masih memiliki cicilan aktif. Artinya pengeluaran rutin dibiayai dari hutang — kondisi yang sangat berisiko.',
      impact: Math.abs(cashFlow) * 12,
      actions: [
        { label: 'Hentikan penambahan hutang baru', type: 'info' },
        { label: 'Fokus stabilkan cash flow terlebih dahulu', type: 'expense_reduction' },
      ],
      priority: 0, // Highest
    });
  }

  // Sort by severity (highest first), then by priority
  return diagnoses.sort((a, b) => {
    const sev = (SEVERITY_ORDER[b.severity] || 0) - (SEVERITY_ORDER[a.severity] || 0);
    return sev !== 0 ? sev : a.priority - b.priority;
  });
}

/**
 * Generate top recommendations from diagnoses (max 3).
 */
export function generateRecommendations(diagnoses, analysis) {
  const { income, cashFlow } = analysis;

  return diagnoses.slice(0, 5).map((d, i) => ({
    rank: i + 1,
    diagnosisId: d.id,
    title: d.title,
    emoji: d.emoji,
    severity: d.severity,
    impact: d.impact || 0,
    impactLabel: d.impact > 0 ? `Potensi dampak: ${formatRupiah(d.impact)}/tahun` : undefined,
    primaryAction: d.actions?.[0] || null,
    allActions: d.actions || [],
    message: d.message,
  }));
}
