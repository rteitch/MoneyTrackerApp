# PRD — MoneyTracker: Financial Planner Edition

**Product Name:** MoneyTracker — Financial Planner
**Document Version:** 2.0.0
**Status:** Active
**Platform:** Android (React Native + Expo)
**Target:** Individu & Keluarga — Indonesia
**Currency:** IDR
**Database:** SQLite (expo-sqlite) — offline-first, tanpa backend
**AI:** ❌ Tidak digunakan — semua analisis berbasis formula & rule engine murni

---

# 1. Product Overview

MoneyTracker Financial Planner adalah evolusi dari aplikasi pencatat keuangan menjadi **asisten perencanaan keuangan pribadi** yang berjalan 100% offline di perangkat pengguna.

Aplikasi tidak hanya mencatat:

> "Bulan ini saya menghabiskan Rp8 juta."

Tetapi menjawab:

> "Apakah kondisi keuangan saya sehat?"
> "Pengeluaran mana yang terlalu besar?"
> "Mana yang harus dikurangi terlebih dahulu?"
> "Berapa kemampuan saya untuk menabung?"
> "Kalau saya mengurangi pengeluaran tertentu, berapa uang yang bisa saya kumpulkan dalam 5 tahun?"
> "Apakah saya sudah siap berinvestasi?"

**Semua jawaban dihitung langsung dari data transaksi pengguna di SQLite — tanpa koneksi internet, tanpa server, tanpa AI.**

---

# 2. Pendekatan Teknis: Offline-First Rule Engine

## Prinsip Utama

Semua analisis dilakukan di sisi client menggunakan:

```
SQLite Transactions & Aggregations
       ↓
JavaScript Financial Formula Engine
       ↓
Rule-Based Diagnosis Engine
       ↓
Priority & Recommendation Generator
       ↓
UI Visualization
```

Tidak ada:
- API call ke server eksternal
- Model AI/ML
- Koneksi internet untuk fitur utama

## Keunggulan Pendekatan Ini

| Aspek | Keterangan |
|-------|------------|
| **Privacy** | Data keuangan tidak pernah meninggalkan perangkat |
| **Speed** | Analisis instan, tanpa latency jaringan |
| **Reliability** | Bekerja tanpa internet sepenuhnya |
| **Cost** | Zero server cost |
| **Trust** | Pengguna tidak perlu khawatir data bocor |

---

# 3. Problem Statement

Pengguna sering mengetahui angka-angka dasar (gaji, pengeluaran, cicilan) tetapi tidak memahami:

- Apakah cash flow mereka sehat
- Pengeluaran mana yang menjadi masalah utama
- Berapa kemampuan menabung yang realistis
- Kapan boleh mulai investasi
- Apakah target finansial mereka bisa tercapai
- Bagaimana perubahan kebiasaan memengaruhi kondisi jangka panjang

MoneyTracker Financial Planner mengubah data SQLite menjadi **keputusan yang dapat ditindaklanjuti**.

---

# 4. Product Vision

> **Membuat perencanaan keuangan profesional menjadi mudah dan bisa dilakukan oleh siapapun, secara offline, tanpa AI, cukup dengan data transaksi harian mereka.**

---

# 5. Core Principles

## 5.1 Diagnosis Before Recommendation

Sistem harus memiliki data yang cukup sebelum memberi rekomendasi:
- Minimal 1 bulan data transaksi, ATAU
- User mengisi Financial Profile (income, expense tetap, hutang)

## 5.2 Formula-Driven, Bukan Opini

Setiap diagnosis menggunakan formula yang transparan dan dapat dijelaskan:

```
Housing Ratio = Total Housing Expense / Net Income
Benchmark: ≤ 30–33%
```

## 5.3 Rekomendasi Harus Bisa Dijelaskan

Contoh:
> **Biaya tempat tinggal Anda terlalu tinggi.**
> Saat ini: 41% dari income. Target: ≤ 30%.
> Jika dikurangi Rp2 juta/bulan → surplus tahunan naik Rp24 juta.

## 5.4 Tidak Ada Jaminan Return Investasi

Semua simulasi investasi menggunakan label:
- "estimasi berdasarkan asumsi"
- "bukan jaminan hasil"
- "skenario historis"

---

# 6. Data Architecture (SQLite)

Semua data disimpan di **`moneytracker.db`** menggunakan `expo-sqlite`.

## Tabel Yang Sudah Ada

```sql
-- Sudah ada di aplikasi saat ini
accounts         -- dompet/rekening
categories       -- kategori transaksi
transactions     -- riwayat transaksi (income/expense/transfer)
budgets          -- anggaran bulanan per kategori
debts            -- hutang & piutang
recurring        -- transaksi berulang
preferences      -- pengaturan app (nama, tema)
```

## Tabel Baru Yang Perlu Ditambahkan

```sql
-- Financial Profile (isian manual user)
CREATE TABLE financial_profile (
  id               INTEGER PRIMARY KEY,
  monthly_income   REAL NOT NULL DEFAULT 0,      -- Pendapatan bulanan bersih
  income_stability TEXT NOT NULL DEFAULT 'stable', -- 'stable'|'variable'|'irregular'
  employment_type  TEXT NOT NULL DEFAULT 'employee', -- 'employee'|'freelance'|'business'
  marital_status   TEXT NOT NULL DEFAULT 'single',   -- 'single'|'married'|'divorced'
  dependents       INTEGER NOT NULL DEFAULT 0,
  age              INTEGER,
  location_type    TEXT DEFAULT 'city',          -- 'city'|'suburban'|'rural'
  updated_at       TEXT DEFAULT (datetime('now'))
);

-- Income Sources (sumber pendapatan)
CREATE TABLE income_sources (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL, -- 'salary'|'business'|'freelance'|'rental'|'investment'|'bonus'|'other'
  amount      REAL NOT NULL DEFAULT 0,
  frequency   TEXT NOT NULL DEFAULT 'monthly', -- 'monthly'|'weekly'|'annual'|'irregular'
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT DEFAULT (datetime('now'))
);

-- Fixed Expenses (pengeluaran tetap bulanan, terpisah dari transaksi harian)
CREATE TABLE fixed_expenses (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  name             TEXT NOT NULL,
  category         TEXT NOT NULL, -- 'housing'|'transportation'|'food'|'debt'|'insurance'|'education'|'lifestyle'|'family'|'other'
  necessity_level  TEXT NOT NULL DEFAULT 'essential', -- 'essential'|'important'|'optional'|'luxury'
  amount           REAL NOT NULL DEFAULT 0,
  frequency        TEXT NOT NULL DEFAULT 'monthly',
  is_active        INTEGER NOT NULL DEFAULT 1,
  created_at       TEXT DEFAULT (datetime('now'))
);

-- Financial Goals (target finansial)
CREATE TABLE financial_goals (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT NOT NULL,
  type            TEXT NOT NULL, -- 'emergency_fund'|'house'|'vehicle'|'education'|'wedding'|'vacation'|'business'|'retirement'|'custom'
  target_amount   REAL NOT NULL DEFAULT 0,
  current_amount  REAL NOT NULL DEFAULT 0,
  monthly_alloc   REAL NOT NULL DEFAULT 0,   -- alokasi bulanan
  target_date     TEXT,                       -- YYYY-MM-DD
  priority        INTEGER NOT NULL DEFAULT 1, -- 1=tertinggi
  status          TEXT NOT NULL DEFAULT 'active', -- 'active'|'paused'|'completed'
  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now'))
);

-- Financial Assessments (snapshot analisis periodik)
CREATE TABLE financial_assessments (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  period_month         INTEGER NOT NULL, -- 1-12
  period_year          INTEGER NOT NULL,
  total_income         REAL NOT NULL DEFAULT 0,
  total_expense        REAL NOT NULL DEFAULT 0,
  cash_flow            REAL NOT NULL DEFAULT 0,
  savings_rate         REAL NOT NULL DEFAULT 0,
  health_score         REAL NOT NULL DEFAULT 0,
  -- Score breakdown
  score_cashflow       REAL DEFAULT 0,
  score_debt           REAL DEFAULT 0,
  score_emergency      REAL DEFAULT 0,
  score_savings        REAL DEFAULT 0,
  score_housing        REAL DEFAULT 0,
  score_goals          REAL DEFAULT 0,
  -- Expense ratios
  ratio_housing        REAL DEFAULT 0,
  ratio_food           REAL DEFAULT 0,
  ratio_transport      REAL DEFAULT 0,
  ratio_debt           REAL DEFAULT 0,
  ratio_lifestyle      REAL DEFAULT 0,
  calculated_at        TEXT DEFAULT (datetime('now')),
  UNIQUE(period_month, period_year)
);

-- Saved Simulations (hasil what-if yang disimpan user)
CREATE TABLE simulations (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  name                 TEXT NOT NULL,
  type                 TEXT NOT NULL, -- 'whatif'|'investment'|'goal'|'debt_payoff'
  input_json           TEXT NOT NULL, -- JSON string parameter input
  result_json          TEXT NOT NULL, -- JSON string hasil kalkulasi
  created_at           TEXT DEFAULT (datetime('now'))
);

-- Achievements (gamifikasi)
CREATE TABLE achievements (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  key          TEXT NOT NULL UNIQUE,
  unlocked_at  TEXT
);
```

---

# 7. Financial Analysis Engine (JavaScript)

Semua kalkulasi dilakukan di `src/utils/financialEngine.js`.

## 7.1 Input Data

Engine mengambil data dari SQLite:

```javascript
// Data Sources
const data = {
  transactions: [],     // dari tabel transactions (3–12 bulan)
  fixedExpenses: [],    // dari tabel fixed_expenses
  incomeSources: [],    // dari tabel income_sources
  profile: {},          // dari tabel financial_profile
  debts: [],            // dari tabel debts
  budgets: [],          // dari tabel budgets
  goals: [],            // dari tabel financial_goals
  accounts: [],         // dari tabel accounts (untuk emergency fund)
};
```

## 7.2 Core Formulas

### Monthly Net Income

```javascript
function calcMonthlyIncome(incomeSources, transactions, month, year) {
  // Prioritas: income_sources (jika diisi)
  // Fallback: agregasi transaksi type='income' bulan tersebut
}
```

### Cash Flow

```javascript
cashFlow = totalIncome - totalExpense;
cashFlowRatio = cashFlow / totalIncome; // positif = surplus
```

### Savings Rate

```javascript
savingsRate = (cashFlow / totalIncome) * 100;
// Target: ≥ 20% (ideal)
// Minimum: ≥ 10% (acceptable)
// < 0: berbahaya
```

### Expense Ratios per Kategori

```javascript
const ratios = {
  housing:       housingExpense / netIncome,       // Benchmark: ≤ 0.30
  food:          foodExpense / netIncome,           // Benchmark: ≤ 0.15
  transportation: transportExpense / netIncome,    // Benchmark: ≤ 0.15
  debt:          totalDebtPayment / netIncome,     // Benchmark: ≤ 0.30 (DTI)
  lifestyle:     lifestyleExpense / netIncome,     // Benchmark: ≤ 0.10
  savings:       savingsAmount / netIncome,        // Target: ≥ 0.20
};
```

### Debt-to-Income Ratio (DTI)

```javascript
dti = totalMonthlyDebtPayment / grossMonthlyIncome;
// ≤ 0.30: Aman
// 0.30–0.43: Hati-hati
// > 0.43: Berbahaya
```

### Emergency Fund Coverage

```javascript
emergencyFundMonths = totalLiquidAssets / monthlyEssentialExpense;
// target: 3–6 bulan (karyawan)
// target: 6–12 bulan (freelancer/bisnis)
```

---

# 8. Financial Health Score Engine

## Formula Scoring (0–100)

Score dihitung dari 6 komponen:

```javascript
const SCORE_WEIGHTS = {
  cashFlow:      0.25,  // 25 poin
  debt:          0.20,  // 20 poin
  emergencyFund: 0.20,  // 20 poin
  savingsRate:   0.20,  // 20 poin
  housing:       0.10,  // 10 poin
  goals:         0.05,  //  5 poin
};
```

## Scoring Per Komponen

### Cash Flow Score (0–25)

```javascript
function scoreCashFlow(cashFlowRatio) {
  if (cashFlowRatio >= 0.30) return 25;       // Excellent
  if (cashFlowRatio >= 0.20) return 20;       // Good
  if (cashFlowRatio >= 0.10) return 15;       // Acceptable
  if (cashFlowRatio >= 0.00) return 8;        // Tight
  if (cashFlowRatio >= -0.10) return 3;       // Negative (light)
  return 0;                                    // Critical deficit
}
```

### Debt Score (0–20)

```javascript
function scoreDebt(dti) {
  if (dti === 0) return 20;               // Debt free
  if (dti <= 0.15) return 18;             // Very low debt
  if (dti <= 0.25) return 14;             // Manageable
  if (dti <= 0.30) return 10;             // At limit
  if (dti <= 0.43) return 5;              // High
  return 0;                               // Dangerous
}
```

### Emergency Fund Score (0–20)

```javascript
function scoreEmergencyFund(months, incomeType) {
  const target = incomeType === 'stable' ? 6 : 9;
  const ratio = months / target;
  if (ratio >= 1.0) return 20;
  if (ratio >= 0.75) return 15;
  if (ratio >= 0.50) return 10;
  if (ratio >= 0.25) return 5;
  return 0;
}
```

### Savings Rate Score (0–20)

```javascript
function scoreSavings(rate) {
  if (rate >= 0.30) return 20;     // Excellent saver
  if (rate >= 0.20) return 16;     // Good
  if (rate >= 0.10) return 10;     // Acceptable
  if (rate >= 0.05) return 5;      // Low
  if (rate >= 0.00) return 2;      // Near zero
  return 0;                        // Negative saving
}
```

### Housing Score (0–10)

```javascript
function scoreHousing(housingRatio) {
  if (housingRatio <= 0.20) return 10;    // Very affordable
  if (housingRatio <= 0.25) return 8;     // Affordable
  if (housingRatio <= 0.30) return 6;     // Acceptable
  if (housingRatio <= 0.35) return 4;     // Slightly high
  if (housingRatio <= 0.40) return 2;     // High
  return 0;                               // Too high
}
```

### Goals Score (0–5)

```javascript
function scoreGoals(activeGoals, hasEmergencyFundGoal) {
  if (activeGoals >= 2 && hasEmergencyFundGoal) return 5;
  if (activeGoals >= 1) return 3;
  return 0;
}
```

## Health Levels

| Score | Level | Deskripsi |
|-------|-------|-----------|
| 0–20 | 🔴 **Critical** | Cash flow negatif, utang tinggi, tidak ada emergency fund |
| 21–40 | 🟠 **At Risk** | Masih ada masalah besar yang harus segera diselesaikan |
| 41–60 | 🟡 **Needs Improvement** | Kondisi mulai stabil tapi belum ideal |
| 61–80 | 🟢 **Healthy** | Keuangan relatif sehat |
| 81–100 | 🔵 **Strong** | Keuangan sangat sehat, siap membangun aset |

---

# 9. Diagnosis Engine

Engine mendeteksi masalah secara otomatis berdasarkan data.

## Daftar Diagnosa

### D01 — Negative Cash Flow

```javascript
{
  id: 'D01',
  trigger: cashFlow < 0,
  severity: cashFlow < -income * 0.10 ? 'critical' : 'high',
  title: 'Cash Flow Negatif',
  message: `Anda mengeluarkan Rp${formatRupiah(-cashFlow)} lebih banyak dari pendapatan setiap bulan.`,
  impact: Math.abs(cashFlow) * 12, // kerugian per tahun
  action: 'Kurangi pengeluaran atau tingkatkan pendapatan sebelum memikirkan investasi.',
}
```

### D02 — High Housing Cost

```javascript
{
  id: 'D02',
  trigger: housingRatio > 0.33,
  severity: housingRatio > 0.45 ? 'critical' : housingRatio > 0.40 ? 'high' : 'medium',
  title: 'Biaya Tempat Tinggal Terlalu Tinggi',
  message: `Tempat tinggal menggunakan ${(housingRatio*100).toFixed(1)}% income Anda. Target: ≤ 30%.`,
  potentialSaving: housingExpense - (income * 0.30),
}
```

### D03 — High Debt-to-Income

```javascript
{
  id: 'D03',
  trigger: dti > 0.30,
  severity: dti > 0.43 ? 'critical' : 'high',
  title: 'Beban Hutang Terlalu Tinggi',
  message: `${(dti*100).toFixed(1)}% pendapatan Anda digunakan untuk membayar cicilan. Batas aman: ≤ 30%.`,
}
```

### D04 — No Emergency Fund

```javascript
{
  id: 'D04',
  trigger: emergencyFundMonths < 1,
  severity: 'high',
  title: 'Tidak Ada Dana Darurat',
  message: 'Dana darurat Anda kurang dari 1 bulan pengeluaran essensial.',
  target: monthlyEssential * 6,
}
```

### D05 — Low Savings Rate

```javascript
{
  id: 'D05',
  trigger: savingsRate < 0.10 && cashFlow >= 0,
  severity: savingsRate < 0.05 ? 'high' : 'medium',
  title: 'Tingkat Tabungan Rendah',
  message: `Anda menabung ${(savingsRate*100).toFixed(1)}% dari income. Target ideal: ≥ 20%.`,
}
```

### D06 — High Lifestyle Spending

```javascript
{
  id: 'D06',
  trigger: lifestyleRatio > 0.20,
  severity: lifestyleRatio > 0.30 ? 'high' : 'medium',
  title: 'Pengeluaran Lifestyle Tinggi',
  message: `${(lifestyleRatio*100).toFixed(1)}% income digunakan untuk kebutuhan tersier.`,
  potentialSaving: lifestyleExpense - (income * 0.10),
}
```

### D07 — Credit Card Danger

```javascript
{
  id: 'D07',
  trigger: hasCreditCardDebt && cashFlow < 0,
  severity: 'critical',
  title: 'Menggunakan Kartu Kredit untuk Biaya Rutin',
  message: 'Anda sedang menggunakan utang untuk membiayai pengeluaran sehari-hari. Ini sangat berbahaya.',
}
```

### D08 — No Financial Goals

```javascript
{
  id: 'D08',
  trigger: activeGoals === 0 && healthScore > 50,
  severity: 'low',
  title: 'Belum Ada Target Finansial',
  message: 'Kondisi keuangan sudah cukup stabil. Mulai tetapkan tujuan finansial Anda.',
}
```

---

# 10. Recommendation Engine

Setiap Diagnosa menghasilkan Rekomendasi yang diprioritaskan:

```javascript
function generateRecommendations(diagnoses) {
  return diagnoses
    .sort((a, b) => SEVERITY_PRIORITY[b.severity] - SEVERITY_PRIORITY[a.severity])
    .map(d => buildRecommendation(d));
}

const SEVERITY_PRIORITY = {
  critical: 4,
  high:     3,
  medium:   2,
  low:      1,
};
```

## Contoh Rekomendasi Output

```javascript
{
  priority: 1,
  diagnosisId: 'D01',
  title: 'Stabilkan Cash Flow Dulu',
  why: 'Cash flow negatif berarti pengeluaran melebihi pendapatan Rp2.785.000/bulan.',
  actions: [
    {
      label: 'Kurangi pengeluaran lifestyle',
      potentialSaving: 1500000,
      difficulty: 'easy',
    },
    {
      label: 'Pindah ke hunian lebih terjangkau',
      potentialSaving: 3000000,
      difficulty: 'hard',
    },
    {
      label: 'Tambah sumber income',
      potentialSaving: null,
      difficulty: 'hard',
    },
  ],
  impact: {
    monthly: 2785000,
    annual: 33420000,
    fiveYear: 167100000,
  },
}
```

---

# 11. What-If Simulator

User dapat mensimulasikan perubahan kondisi finansial secara virtual. Semua kalkulasi dilakukan di JavaScript tanpa menyimpan ke database (kecuali user memilih "simpan simulasi").

## 11.1 Expense Reduction Simulator

```javascript
function simulateExpenseReduction(currentExpense, newExpense, months = 60) {
  const monthlyDiff = currentExpense - newExpense;
  return {
    monthlySaving:    monthlyDiff,
    annualSaving:     monthlyDiff * 12,
    fiveYearCapital:  monthlyDiff * months,
    newCashFlow:      currentCashFlow + monthlyDiff,
    newSavingsRate:   (currentCashFlow + monthlyDiff) / monthlyIncome,
  };
}
```

## 11.2 Investment Growth Simulator

**Tidak menggunakan AI — murni formula compound interest:**

```javascript
function simulateInvestment({
  initialAmount,
  monthlyContribution,
  annualReturnRate,    // input oleh user: misal 8% untuk reksa dana
  inflationRate,       // default: 5% (Indonesia)
  durationMonths,
}) {
  const monthlyRate = annualReturnRate / 12;
  let balance = initialAmount;

  for (let i = 0; i < durationMonths; i++) {
    balance = balance * (1 + monthlyRate) + monthlyContribution;
  }

  const totalContribution = initialAmount + (monthlyContribution * durationMonths);
  const nominalGrowth = balance - totalContribution;
  const realValue = balance / Math.pow(1 + inflationRate, durationMonths / 12);

  return {
    totalContribution,
    estimatedFinalValue: balance,
    estimatedGrowth:     nominalGrowth,
    realValueAfterInflation: realValue,
    disclaimer: 'Simulasi ini adalah estimasi berdasarkan asumsi yang Anda masukkan, bukan jaminan hasil investasi.',
  };
}
```

## 11.3 Debt Payoff Simulator

```javascript
function simulateDebtPayoff({ principal, interestRate, monthlyPayment }) {
  const monthlyRate = interestRate / 12;
  let balance = principal;
  let months = 0;
  let totalInterest = 0;

  while (balance > 0 && months < 600) {
    const interestThisMonth = balance * monthlyRate;
    const principalThisMonth = Math.min(monthlyPayment - interestThisMonth, balance);
    totalInterest += interestThisMonth;
    balance -= principalThisMonth;
    months++;
  }

  return {
    payoffMonths: months,
    totalInterestPaid: totalInterest,
    totalPaid: principal + totalInterest,
    monthlyPayment,
  };
}
```

## 11.4 Goal Timeline Simulator

```javascript
function simulateGoalTimeline({ targetAmount, currentAmount, monthlyAllocation }) {
  const remaining = targetAmount - currentAmount;
  const months = Math.ceil(remaining / monthlyAllocation);
  const targetDate = addMonths(new Date(), months);

  return {
    remainingAmount: remaining,
    estimatedMonths: months,
    estimatedDate: targetDate,
    onTrack: months <= targetMonths,
  };
}
```

---

# 12. Financial Goal Planner

User dapat membuat target finansial. Sistem menghitung:
- Alokasi bulanan yang dibutuhkan
- Estimasi waktu pencapaian
- Apakah target realistis berdasarkan surplus saat ini

## Tipe Goal

| Tipe | Icon | Deskripsi |
|------|------|-----------|
| emergency_fund | 🛡 | Dana darurat (3–12 bulan pengeluaran) |
| house | 🏠 | DP/beli rumah |
| vehicle | 🚗 | Kendaraan |
| education | 🎓 | Biaya pendidikan |
| wedding | 💍 | Pernikahan |
| vacation | ✈️ | Liburan |
| business | 💼 | Modal usaha |
| retirement | 🌴 | Pensiun |
| custom | ⭐ | Tujuan lain |

## Auto-Recommended Goal

Sistem otomatis menyarankan goal berdasarkan diagnosa:

```javascript
// Jika D04 aktif (no emergency fund):
suggestGoal({
  type: 'emergency_fund',
  targetAmount: monthlyEssential * 6,
  message: 'Prioritaskan dana darurat sebelum tujuan lain.',
});
```

---

# 13. Dashboard — Financial Planner Mode

Dashboard utama menampilkan ringkasan finansial dan top recommendation:

## Layout

```
┌─────────────────────────────────────────┐
│ 👋 Selamat pagi, Rizal                  │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ Financial Health Score            │  │
│  │        78 / 100 🟢               │  │
│  │  ████████████████████░░░░         │  │
│  │  Healthy                          │  │
│  └───────────────────────────────────┘  │
│                                         │
│  Income    Expense    Cash Flow         │
│  25 Juta   18.2 Juta  +6.8 Juta       │
│                                         │
│  Savings Rate: 27.2%                    │
│  Dana Darurat: 4.2 bulan               │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ ⚠️ TOP RECOMMENDATION             │  │
│  │ Biaya perumahan Anda 38% income   │  │
│  │ Potensi hemat: Rp2 juta/bulan    │  │
│  │ [ Lihat Detail ] [ Simulasi ]     │  │
│  └───────────────────────────────────┘  │
│                                         │
│  [Beranda] [Mutasi] [+] [Statistik] [Lainnya] │
└─────────────────────────────────────────┘
```

---

# 14. Planner Screen (Layar Baru)

Layar baru di tab "Lainnya" → "Financial Planner":

## Sub-sections

1. **Diagnosis** — daftar masalah yang terdeteksi + severity
2. **Rekomendasi** — aksi prioritas dengan estimasi dampak
3. **Simulasi** — what-if simulator (expense, investment, debt, goal)
4. **Goals** — target finansial + progress
5. **Monthly Review** — perbandingan bulan ini vs bulan lalu

---

# 15. Screen Architecture Baru

```
App.js (Stack Navigator)
├── MainTabs (Bottom Tabs)
│   ├── Beranda (DashboardScreen)     → menampilkan health score + top 1 recommendation
│   ├── Mutasi (MutasiScreen)         → riwayat transaksi
│   ├── [FAB] Catat Transaksi
│   ├── Statistik (AnalyticsScreen)   → chart & expense breakdown
│   └── Lainnya (MoreScreen)          → grid menu
│
├── Stack Screens
│   ├── Tambah Transaksi (TransactionScreen)
│   ├── Hutang (DebtScreen)
│   ├── Anggaran (BudgetScreen)
│   ├── Pengaturan (SettingsScreen)
│   ├── PlannerScreen (NEW)           → financial diagnosis + rekomendasi
│   ├── GoalsScreen (NEW)             → financial goals
│   ├── SimulatorScreen (NEW)         → what-if & investment simulator
│   ├── AssessmentScreen (NEW)        → setup financial profile (onboarding planner)
│   └── MonthlyReviewScreen (NEW)     → laporan bulanan
```

---

# 16. Financial Profile Assessment (Onboarding)

Ketika user membuka Planner untuk pertama kali, sistem memandu pengisian:

## Step 1: Income
- Pendapatan bulanan bersih
- Tipe pekerjaan (karyawan/freelance/bisnis)
- Stabilitas income

## Step 2: Fixed Expenses
- Perumahan (kos/kontrakan/cicilan KPR)
- Transportasi
- Makan & kebutuhan pokok
- Cicilan hutang (jika ada)
- Asuransi
- Pengeluaran keluarga

## Step 3: Savings & Emergency Fund
- Total tabungan saat ini (ambil dari balance akun atau input manual)
- Akun mana yang liquid (untuk hitung emergency fund)

## Step 4: Hutang
- Data hutang (opsional, bisa diambil dari DebtScreen yang sudah ada)

## Step 5: Goals
- Sudah ada tujuan finansial? (opsional)

**Setelah assessment → langsung tampilkan Health Score + Diagnosa.**

---

# 17. Monthly Review Engine

Dijalankan otomatis saat bulan berganti (cek via `processDueRecurring` yang sudah ada) atau dipicu manual oleh user.

```javascript
async function generateMonthlyReview(db, month, year) {
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;

  const current = await getMonthlyAggregates(db, month, year);
  const previous = await getMonthlyAggregates(db, prevMonth, prevYear);

  const assessment = calculateAssessment(current, profile);
  await saveAssessment(db, assessment, month, year);

  return {
    current,
    previous,
    assessment,
    changes: {
      income:       current.income - previous.income,
      expense:      current.expense - previous.expense,
      savings:      current.cashFlow - previous.cashFlow,
      healthScore:  assessment.healthScore - (previousAssessment?.healthScore || 0),
    },
    biggestIncrease: findBiggestCategoryChange(current, previous, 'increase'),
    biggestDecrease: findBiggestCategoryChange(current, previous, 'decrease'),
    recommendations: generateRecommendations(diagnoses),
  };
}
```

---

# 18. Gamification Engine

Achievement diberikan berdasarkan kondisi terukur, bukan opini AI:

| Key | Icon | Trigger |
|-----|------|---------|
| `first_transaction` | 💳 | Transaksi pertama dicatat |
| `first_budget` | 📊 | Budget pertama dibuat |
| `first_goal` | 🎯 | Goal pertama dibuat |
| `positive_cashflow` | ✅ | Cash flow positif 1 bulan |
| `cashflow_streak_3` | 🔥 | Cash flow positif 3 bulan berturut |
| `savings_10pct` | 💰 | Savings rate ≥ 10% |
| `savings_20pct` | 💰💰 | Savings rate ≥ 20% |
| `emergency_fund_1m` | 🛡 | Dana darurat ≥ 1 bulan |
| `emergency_fund_3m` | 🛡🛡 | Dana darurat ≥ 3 bulan |
| `emergency_fund_6m` | 🛡🛡🛡 | Dana darurat ≥ 6 bulan |
| `debt_reduced_10pct` | 📉 | Total hutang berkurang ≥ 10% |
| `debt_free` | 🏆 | Semua hutang lunas |
| `health_score_60` | 🌱 | Health Score ≥ 60 |
| `health_score_80` | 🌟 | Health Score ≥ 80 |
| `consistent_recorder` | 📝 | Mencatat transaksi ≥ 20 hari/bulan |
| `first_10m_saved` | 🏦 | Total saldo akun ≥ 10 juta |
| `first_simulation` | 🔮 | Pertama kali pakai simulator |

---

# 19. Category Mapping untuk Financial Analysis

Kategori transaksi yang ada perlu di-map ke kategori analisis:

```javascript
const CATEGORY_MAP = {
  // Housing
  'Kos / Sewa': 'housing',
  'Cicilan KPR': 'housing',
  'Listrik': 'housing',
  'Air': 'housing',
  'Internet': 'housing',

  // Transportation
  'Bensin': 'transportation',
  'Transportasi Online': 'transportation',
  'Parkir': 'transportation',
  'Cicilan Motor': 'transportation',

  // Food
  'Makan': 'food',
  'Belanja Dapur': 'food',
  'Kopi': 'food',

  // Lifestyle
  'Hiburan': 'lifestyle',
  'Gym': 'lifestyle',
  'Langganan': 'lifestyle',
  'Shopping': 'lifestyle',
  'Liburan': 'lifestyle',

  // Debt
  'Cicilan': 'debt',
  'Kartu Kredit': 'debt',

  // Family
  'Orang Tua': 'family',
  'Anak': 'family',
};
```

User dapat mengatur mapping ini di settings.

---

# 20. Investment Simulator Benchmarks (Built-in)

Karena tidak ada AI, benchmark investasi di-hardcode berdasarkan data historis Indonesia:

```javascript
const INVESTMENT_BENCHMARKS = {
  deposito:    { conserv: 0.04, moderate: 0.05, optimistic: 0.06 },
  sbn:         { conserv: 0.06, moderate: 0.065, optimistic: 0.07 },
  reksadana_psar: { conserv: 0.07, moderate: 0.09, optimistic: 0.12 },
  emas:        { conserv: 0.05, moderate: 0.08, optimistic: 0.12 },
  saham:       { conserv: 0.06, moderate: 0.12, optimistic: 0.18 },
  custom:      null, // user input sendiri
};

const INFLATION_DEFAULT = 0.04; // 4% per tahun (asumsi Indonesia 2024–2025)
```

**Disclaimer wajib ditampilkan di setiap output simulator:**
> ⚠️ *Angka di atas adalah estimasi berdasarkan data historis dan asumsi yang Anda masukkan. Bukan jaminan hasil investasi. Investasi mengandung risiko.*

---

# 21. MVP Phase Plan

## Phase 1 — Foundation ✅ (Sudah Ada)
- Pencatatan transaksi
- Multi-wallet / akun
- Kategori
- Budget bulanan
- Hutang & piutang
- Transaksi berulang
- Statistik & chart
- Dark/light mode

## Phase 2 — Financial Profile & Health Score
- Tabel `financial_profile`, `income_sources`, `fixed_expenses`
- AssessmentScreen (onboarding planner)
- Financial Health Score Engine (formula-based)
- Health Score card di Dashboard

## Phase 3 — Diagnosis & Recommendation Engine
- Diagnosis Engine (D01–D08)
- Recommendation Engine dengan prioritas
- PlannerScreen — tampilkan diagnosis + rekomendasi

## Phase 4 — Simulator
- What-if Expense Reducer
- Investment Growth Simulator (compound interest)
- Debt Payoff Simulator
- SimulatorScreen

## Phase 5 — Goals
- Tabel `financial_goals`
- GoalsScreen
- Auto-suggest goal dari diagnosa
- Goal progress tracker

## Phase 6 — Monthly Review & Gamification
- Monthly Review Engine
- MonthlyReviewScreen
- Achievement system
- `financial_assessments` history

---

# 22. File Structure Baru

```
src/
├── screens/
│   ├── DashboardScreen.js        ✅ (existing, perlu update untuk health score card)
│   ├── MutasiScreen.js           ✅ (existing)
│   ├── TransactionScreen.js      ✅ (existing)
│   ├── AnalyticsScreen.js        ✅ (existing)
│   ├── MoreScreen.js             ✅ (baru - sudah dibuat)
│   ├── SettingsScreen.js         ✅ (existing)
│   ├── DebtScreen.js             ✅ (existing)
│   ├── BudgetScreen.js           ✅ (existing)
│   ├── PlannerScreen.js          🆕 (Phase 3)
│   ├── AssessmentScreen.js       🆕 (Phase 2)
│   ├── GoalsScreen.js            🆕 (Phase 5)
│   ├── SimulatorScreen.js        🆕 (Phase 4)
│   └── MonthlyReviewScreen.js    🆕 (Phase 6)
│
├── utils/
│   ├── formatting.js             ✅ (existing)
│   ├── financialEngine.js        🆕 (Phase 2) — core formula engine
│   ├── diagnosisEngine.js        🆕 (Phase 3) — rule-based diagnosis
│   ├── recommendationEngine.js   🆕 (Phase 3) — recommendation builder
│   ├── simulatorEngine.js        🆕 (Phase 4) — what-if calculators
│   └── achievementEngine.js      🆕 (Phase 6) — gamification checks
│
├── db/
│   ├── database.js               ✅ (existing, perlu migrasi tabel baru)
│   └── migrations.js             🆕 — SQL migration scripts
│
├── components/
│   ├── CustomTabBar.js           ✅ (baru - sudah dibuat)
│   ├── HealthScoreCard.js        🆕 (Phase 2)
│   ├── DiagnosisCard.js          🆕 (Phase 3)
│   ├── RecommendationCard.js     🆕 (Phase 3)
│   ├── SimulatorForm.js          🆕 (Phase 4)
│   └── GoalCard.js               🆕 (Phase 5)
│
└── constants/
    ├── theme.js                  ✅ (existing)
    ├── benchmarks.js             🆕 — financial benchmarks & investment rates
    └── categoryMap.js            🆕 — mapping kategori → analisis
```

---

# 23. Database Migration Strategy

Karena sudah ada data user di SQLite, migrasi harus dilakukan secara non-destructive menggunakan `ALTER TABLE` dan `CREATE TABLE IF NOT EXISTS`:

```javascript
// src/db/migrations.js
export const MIGRATIONS = [
  {
    version: 2,
    sql: [
      `CREATE TABLE IF NOT EXISTS financial_profile (...)`,
      `CREATE TABLE IF NOT EXISTS income_sources (...)`,
      `CREATE TABLE IF NOT EXISTS fixed_expenses (...)`,
      `CREATE TABLE IF NOT EXISTS financial_goals (...)`,
      `CREATE TABLE IF NOT EXISTS financial_assessments (...)`,
      `CREATE TABLE IF NOT EXISTS simulations (...)`,
      `CREATE TABLE IF NOT EXISTS achievements (...)`,
      `INSERT OR IGNORE INTO preferences (key, value) VALUES ('db_version', '1')`,
    ]
  },
  {
    version: 3,
    // future migrations
  }
];

export async function runMigrations(db) {
  const currentVersion = await getPref(db, 'db_version', '1');
  for (const migration of MIGRATIONS) {
    if (migration.version > parseInt(currentVersion)) {
      for (const sql of migration.sql) {
        await db.execAsync(sql);
      }
      await setPref(db, 'db_version', String(migration.version));
    }
  }
}
```

---

# 24. Financial Safety Disclaimers

Semua simulasi dan rekomendasi yang ditampilkan harus menyertakan:

> ⚠️ **Informasi ini bersifat edukatif dan tidak merupakan saran investasi atau konsultasi keuangan profesional. Untuk keputusan keuangan besar, konsultasikan dengan perencana keuangan berlisensi (CFP).**

Disclaimer ini wajib muncul di:
- SimulatorScreen
- GoalsScreen (target jangka panjang)
- PlannerScreen (recommendation section)

---

# 25. Success Metrics (Offline)

Karena tidak ada backend, metrics diukur melalui usage patterns di dalam app:

| Metric | Target | Cara Ukur |
|--------|--------|-----------|
| User mengisi Financial Profile | >60% | `financial_profile` tidak kosong |
| User membuat minimal 1 Goal | >40% | Count `financial_goals` |
| User menjalankan minimal 1 Simulasi | >30% | Count `simulations` |
| Health Score rata-rata naik | - | Delta `financial_assessments` |
| Pencatatan konsisten (≥20 hari/bulan) | >50% | Count distinct transaction_date |

---

*Dokumen ini menggambarkan evolusi MoneyTracker dari expense tracker menjadi financial planner berbasis formula, 100% offline, tanpa AI, menggunakan SQLite sebagai satu-satunya database.*
