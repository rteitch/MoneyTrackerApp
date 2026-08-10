# 💸 MoneyTracker + Financial Planner Assistant

Aplikasi pencatat keuangan pribadi & **Financial Planner Assistant (100% Offline-First & Pure Rule-Based Engine)** berbasis React Native + Expo. Dirancang untuk membantu pengguna Indonesia mengelola transaksi, anggaran, hutang, serta melakukan **analisis kesehatan finansial, diagnosa problem keuangan, simulasi investasi/penghematan, dan pelacakan target finansial** — tanpa perlu AI, backend server, maupun koneksi internet.

> **Developed by RTEITCH**

---

## ✨ Fitur Utama

### 🧠 Financial Planner Assistant (Fitur Baru v2.5)
- **Financial Health Score (0–100)**: Menghitung skor kesehatan keuangan otomatis berbasis 6 indikator berbobot (*Cash Flow 25%*, *Beban Cicilan DTI 20%*, *Dana Darurat 20%*, *Tingkat Tabungan 20%*, *Biaya Hunian 10%*, *Target Finansial 5%*).
- **Wizard Analisis Keuangan (4 Step)**: Pengisian profil risiko/stabilitas, sumber pendapatan (gaji, bisnis, freelance, dll), dan pengeluaran tetap bulanan.
- **Rule-Based Diagnosis Engine (D01–D08)**: Mendeteksi 8 masalah finansial spesifik (Cash flow negatif, Biaya hunian > 30%, DTI > 30%, Dana darurat kurang, Lifestyle berlebih, dll) lengkap dengan tingkat urgensi dan estimasi dampak kerugian/penghematan dalam Rupiah/tahun.
- **Kartu Diagnosa Interaktif**: Tombol rekomendasi pada diagnosa yang dapat diklik langsung membuka layar Simulator atau Goal Planner yang sesuai.

### 💡 Simulator Keuangan (What-If & Growth)
- **Simulasi Investasi (Compound Interest)**: Estimasi pertumbuhan aset berdasarkan instrumen investasi khas Indonesia (SBN, Reksa Dana Saham/Pasar Uang, Deposito, Emas) dengan 3 skenario return (Konservatif, Moderat, Optimis) dan perhitungan inflasi.
- **Simulasi Hemat (What-If Expense Reducer)**: Hitung akumulasi modal 1–20 tahun dan lonjakan *savings rate* jika memotong pengeluaran tertentu.
- **Simulasi Pelunasan Hutang**: Jadwal amortisasi cicilan, sisa bulan pelunasan, & total bunga yang dibayar.
- **Simulasi Waktu Target**: Estimasi durasi bulan untuk mencapai nominal target tertentu.

### 🎯 Target Finansial (Goal Planner)
- Kelola berbagai tujuan finansial (Dana Darurat, DP Rumah, Kendaraan, Pendidikan, Liburan, Pensiun, dll).
- **Progress bar visual**, sisa alokasi bulanan, & *live preview* estimasi bulan selesai secara real-time saat mengetik form.
- Modul **Setor Dana Instan** dengan pilihan nominal cepat (100rb, 250rb, 500rb, 1jt, Pelunasan).

### 🏆 Evaluasi Bulanan & Lencana Prestasi (Gamifikasi)
- **Evaluasi Month-over-Month**: Perbandingan delta Health Score & Arus Kas dibanding bulan sebelumnya.
- **Lencana Prestasi Keuangan**: Unlock *achievement badges* otomatis dari SQLite ketika pengguna mencapai *milestone* finansial (misal: *Langkah Pertama*, *Bebas Cicilan*, *Raja Menabung*, *Benteng Finansial*, *Sangat Sehat ≥80*).

---

### 🏠 Dashboard & Pengelolaan Transaksi
- **Hero Card**: Total aset (kas aktif), savings rate, pemasukan, pengeluaran, dan net cash flow.
- **HealthScoreCard**: Ringkasan skor kesehatan keuangan langsung di dashboard utama.
- **Dompet & Rekening**: Kelola dompet/rekening (Tunai, Bank, E-Wallet, Investasi, Kredit) dengan saldo real-time.
- **Catat Transaksi**: Pengeluaran, Pemasukan, dan Transfer antar dompet dengan biaya admin.
- **Mutasi & Filter**: Cari transaksi, filter kategori/periode, dan **Export CSV** (dengan proteksi CSV Formula Injection).
- **Anggaran (Budget)**: Limit bulanan per kategori dengan indikator warna (*Hijau <70%*, *Kuning 70-90%*, *Merah >90%*).
- **Hutang & Piutang**: Track piutang/hutang dengan bayar cicilan parsial & pelunasan instan.
- **Transaksi Berulang**: Jadwalkan transaksi harian, mingguan, bulanan, tahunan dengan *auto-create* saat jatuh tempo.

---

## 🏗️ Arsitektur & Tech Stack

| Layer | Teknologi |
|---|---|
| **Framework** | React Native 0.81 + Expo SDK 54 |
| **Navigasi** | React Navigation (Bottom Tabs + Stack Navigator) |
| **Database** | SQLite (`expo-sqlite`) — 100% offline-first, WAL mode, Schema Migrations v4 |
| **Formula Engine** | Pure JavaScript (`financialEngine.js`, `diagnosisEngine.js`, `achievementEngine.js`) |
| **State** | React Context API (`AppContext`) |
| **Testing** | Jest + `@testing-library/react-native` + `jest-expo` (200 Unit & UI Tests, 100% Utils Coverage) |
| **File System & Export** | `expo-file-system` & `expo-sharing` (CSV Report Export dengan Sanitasi Keamanan) |

### Struktur Folder Utama

```
MoneyTrackerApp/
├── App.js                          # Root navigator & error boundary
├── src/
│   ├── components/
│   │   ├── BudgetProgressBar.js     # Progress bar anggaran & status (tested)
│   │   ├── HealthScoreCard.js       # Card skor kesehatan keuangan (tested)
│   │   ├── TransactionCard.js       # Card transaksi (tested)
│   │   └── MetricCard.js            # Card metrik keuangan
│   ├── constants/
│   │   ├── benchmarks.js            # Benchmark finansial & return investasi
│   │   ├── categoryMap.js           # Mapping kategori → kelompok analisis
│   │   └── theme.js                 # Design tokens (warna, spacing, radius)
│   ├── db/
│   │   └── database.js              # SQLite schema v4, CRUD planner & transaksi
│   ├── screens/
│   │   ├── DashboardScreen.js       # Beranda & Health Score Card
│   │   ├── PlannerScreen.js          # Dashboard Financial Planner & Diagnosa
│   │   ├── AssessmentScreen.js       # Wizard 4 langkah profil & pengeluaran tetap
│   │   ├── SimulatorScreen.js        # 4 Modul simulasi (Investasi, Hemat, Hutang, Target)
│   │   ├── GoalsScreen.js            # Target finansial & setor dana
│   │   ├── MonthlyReviewScreen.js    # Evaluasi bulanan & lencana prestasi
│   │   ├── AnalyticsScreen.js       # Chart statistik & perbandingan
│   │   ├── MutasiScreen.js          # Riwayat transaksi & export CSV
│   │   ├── BudgetScreen.js          # Anggaran bulanan
│   │   ├── DebtScreen.js            # Hutang & piutang
│   │   └── SettingsScreen.js        # Pengaturan dompet, kategori, berulang, profil
│   └── utils/
│       ├── financialEngine.js        # Core formula engine (health score, ratios)
│       ├── diagnosisEngine.js        # Rule engine diagnosa 8 masalah (D01-D08)
│       ├── achievementEngine.js      # System unlock lencana prestasi
│       └── formatting.js            # Format Rupiah, tanggal, sanitasi CSV
├── __tests__/                       # Automated ISTQB Test Suites (13 Suites, 200 Tests)
│   ├── components/                  # RNTL Component UI tests
│   ├── db/                          # Database CRUD mock tests
│   ├── security/                    # OWASP ASVS Security Review tests
│   └── utils/                       # Financial precision & engine unit tests
```

---

## 🛡️ Keamanan & Kepatuhan Standar (OWASP ASVS Audit)

- **100% Offline-First**: Tidak ada data keuangan yang dikirim ke internet/server eksternal. Data tersimpan di SQLite lokal.
- **SQL Injection Protected**: Seluruh operasi SQLite menggunakan *Parameterized Bindings (`?`)*.
- **CSV Formula Injection Protected**: Output CSV pada `escapeCSV()` diawali dengan karakter petik tunggal (`'`) untuk menetralisir eksekusi macro berbahaya pada Microsoft Excel (`=`, `+`, `-`, `@`).
- **Atomic Database Operations**: Operasi transaksi ganda menggunakan `BEGIN TRANSACTION / COMMIT / ROLLBACK`.
- **Soft Delete Pattern**: Transaksi yang dihapus ditandai `is_deleted = 1` tanpa pengrusakan relasi database.

---

## 🧪 Testing & Quality Assurance (ISTQB Foundation Standard)

Aplikasi memiliki suite pengujian otomatis lengkap menggunakan **Jest** dan **React Native Testing Library**:

```bash
# Menjalankan seluruh test suite (200 test cases)
npm test

# Menjalankan pengujian dengan laporan coverage detail
npm run test:coverage
```

### Hasil Test Coverage (`npm run test:coverage`):
- **Test Suites**: 13 Passed (100%)
- **Test Cases**: 200 Passed (100%)
- **Utils Line Coverage**: **100.00%**
- **Constants Line Coverage**: **100.00%**

---

## 🚀 Getting Started

### Prasyarat
- Node.js ≥ 18
- Expo CLI (`npm install -g expo-cli`)
- Android Studio / Emulator atau perangkat fisik dengan aplikasi Expo Go

### Instalasi & Menjalankan

```bash
# Clone repository
git clone https://github.com/rteitch/MoneyTrackerApp.git
cd MoneyTrackerApp

# Install dependencies
npm install

# Menjalankan aplikasi
npx expo start
```

---

<p align="center">
  <strong>MoneyTracker v2.5 + Financial Planner Suite</strong><br/>
  <em>Catat. Analisis. Simulasikan. Kelola Keuangan Anda 100% Offline.</em>
</p>
