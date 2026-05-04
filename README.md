# 💸 MoneyTracker

Aplikasi pencatat keuangan pribadi **offline-first** berbasis React Native + Expo. Dirancang untuk membantu pengguna Indonesia mengelola pemasukan, pengeluaran, transfer antar dompet, budgeting, transaksi berulang, dan pelacakan hutang/piutang — tanpa perlu koneksi internet.

> **Developed by RTEITCH**

---

## ✨ Fitur Utama

### 🏠 Dashboard (Beranda)
- Sapaan personalisasi berdasarkan waktu (Pagi/Siang/Sore/Malam)
- **Hero Card** menampilkan total aset (kas aktif), savings rate, pemasukan, pengeluaran, dan net cash flow
- Daftar **dompet & rekening** dengan saldo real-time (scroll horizontal)
- **Budget Summary** — progress anggaran per kategori dengan color-coded bar
- **Debt Summary** — ringkasan piutang, hutang, dan posisi bersih
- Riwayat transaksi terbaru dengan aksi edit (ketuk) dan hapus (tahan)
- Filter periode: Hari Ini, Minggu Ini, Bulan Ini, Tahun Ini, Tahun Lalu, Semua

### 📋 Mutasi
- Riwayat transaksi lengkap dengan **pencarian** (kategori, catatan, sub-kategori)
- Filter berdasarkan **tipe transaksi** (Semua, Keluar, Masuk, Transfer)
- Filter berdasarkan **periode** (Hari Ini, Minggu Ini, Bulan Ini, Tahun Ini, Tahun Lalu, Semua Waktu)
- **Summary bar**: total masuk, keluar, dan net untuk periode terpilih
- Pengelompokan otomatis berdasarkan tanggal
- **Export CSV** — bagikan laporan mutasi ke format spreadsheet
- Hapus transaksi via **bottom sheet modal** dengan konfirmasi

### ➕ Catat Transaksi
- Tipe: **Pengeluaran**, **Pemasukan**, **Transfer** antar dompet
- Input nominal dengan **quick amount buttons** (+10rb, +20rb, +50rb, +100rb, +200rb, +500rb)
- Pilih dompet asal & tujuan (khusus transfer)
- **Biaya admin** opsional untuk transfer
- Pilih **kategori & sub-kategori** (dengan drill-down)
- **Custom date** — catat transaksi di tanggal yang berbeda (format DD/MM/YYYY)
- Catatan/deskripsi opsional
- Mode **Edit transaksi** dengan pre-fill data

### 📊 Statistik (Analitik)
- **Skor Kesehatan Keuangan** (0-100) dengan status: Sehat / Perlu Perhatian / Kritis
- **Ringkasan naratif** otomatis berdasarkan kondisi finansial
- **Perbandingan Bulanan** — income & expense bulan ini vs bulan lalu dengan persentase perubahan
- **4 Metrik Kunci**:
  - Savings Rate (target ≥20%)
  - Expense Ratio (target ≤70%)
  - Fixed Cost Ratio
  - Dana Darurat / Runway (dalam bulan)
- **Ringkasan Arus Kas** — pemasukan, pengeluaran, dan net cash flow
- **Donut Chart (SVG)** — distribusi pengeluaran per kategori
- **Rincian per Kategori** dengan drill-down ke sub-kategori (on-demand loading)

### 💰 Anggaran (Budget)
- Buat anggaran per kategori pengeluaran dengan limit bulanan
- **Progress bar** dengan 3 level warna: hijau (<70%), kuning (70-90%), merah (>90%)
- Warning otomatis jika pengeluaran melebihi limit
- Summary card total budget vs total spending
- Akses dari Dashboard atau navigasi langsung

### 🔄 Transaksi Berulang (Recurring)
- Jadwalkan transaksi yang berulang: **harian, mingguan, bulanan, tahunan**
- **Auto-create** transaksi saat jatuh tempo saat app dibuka
- Toggle aktif/nonaktif per recurring
- Input via form yang sama dengan transaksi biasa
- Kelola di halaman **Pengaturan → Tab Berulang**

### 📒 Hutang & Piutang (Debt Tracking)
- Catat **piutang** (uang dipinjam orang) dan **hutang** (uang yang Anda pinjam)
- **Progress bar pelunasan** per hutang
- **Cicilan parsial** — bayar sebagian, sisa otomatis berkurang
- **Settle** — lunasi sisa dengan sekali klik
- Riwayat pembayaran per hutang
- Status badge: Belum Lunas, Cicilan, Lunas
- Peringatan **due date** (merah jika overdue)
- Summary card: total piutang, hutang, posisi bersih

### ⚙️ Pengaturan
- **Tab Dompet**: Tambah dompet baru (Tunai, Bank, E-Wallet, Investasi, Kredit), pilih warna, set saldo awal, opsi kecualikan dari total aset
- **Tab Kategori**: CRUD kategori induk (pengeluaran/pemasukan), tandai sebagai pengeluaran tetap (fixed), CRUD sub-kategori
- **Tab Berulang**: Kelola transaksi berulang (tambah, edit, toggle, hapus)
- **Tab Profil**: Ubah nama pengguna, tema (Dark/Light/System), info aplikasi, zona bahaya (bersihkan riwayat transaksi)
- **Factory Reset** — hapus semua transaksi, kembalikan saldo ke nilai awal (dompet & kategori tetap aman)

---

## 🏗️ Arsitektur & Tech Stack

| Layer | Teknologi |
|---|---|
| **Framework** | React Native 0.81 + Expo SDK 54 |
| **Navigasi** | React Navigation (Bottom Tabs) |
| **Database** | SQLite (expo-sqlite) — offline-first, WAL mode |
| **State** | React Context API (AppContext) |
| **Charts** | Custom SVG Donut Chart (react-native-svg) |
| **File System** | expo-file-system (CSV export) |
| **Sharing** | expo-sharing (bagikan file CSV) |
| **Icons** | Ionicons (@expo/vector-icons) |

### Struktur Folder

```
MoneyTrackerApp/
├── App.js                          # Entry point, navigasi, error boundary
├── src/
│   ├── components/
│   │   ├── BudgetProgressBar.js     # Progress bar anggaran (reusable)
│   │   ├── BottomSheetModal.js      # Modal konfirmasi hapus (reusable)
│   │   ├── DebtCard.js              # Card hutang/piutang (reusable)
│   │   ├── ErrorBoundary.js         # Error boundary global
│   │   ├── MetricCard.js            # Card metrik keuangan
│   │   ├── StatusModal.js           # Modal status/error (reusable)
│   │   └── TransactionCard.js       # Card transaksi (reusable)
│   ├── constants/
│   │   └── theme.js                 # Design tokens (warna, spacing, radius)
│   ├── context/
│   │   └── AppContext.js            # Global state (username, theme, recurring)
│   ├── db/
│   │   └── database.js              # SQLite schema, CRUD, migrasi, seed data
│   ├── screens/
│   │   ├── AnalyticsScreen.js       # Statistik & chart
│   │   ├── BudgetScreen.js          # Kelola anggaran per kategori
│   │   ├── DashboardScreen.js       # Beranda
│   │   ├── DebtScreen.js            # Hutang & piutang
│   │   ├── MutasiScreen.js          # Riwayat & export
│   │   ├── SettingsScreen.js        # Pengaturan (dompet, kategori, berulang, profil)
│   │   └── TransactionScreen.js     # Form input transaksi
│   └── utils/
│       └── formatting.js            # Format Rupiah, tanggal, CSV escape
├── __tests__/                       # Unit tests (Jest)
│   ├── db/database.test.js
│   ├── utils/formatting.test.js
│   └── constants/theme.test.js
└── .github/workflows/test.yml       # CI pipeline
```

---

## 🛡️ Keamanan & Keandalan

- **Offline-first** — semua data tersimpan lokal di SQLite, tidak ada data yang dikirim ke server
- **Atomic transactions** — operasi CRUD menggunakan `BEGIN/COMMIT/ROLLBACK` untuk integritas data
- **Soft delete** — transaksi yang dihapus ditandai `is_deleted = 1`, bukan dihapus permanen
- **Balance recalculation** — saldo dompet dihitung ulang dari scratch setiap ada perubahan transaksi
- **Error boundary** — crash di level render ditangkap dan ditampilkan UI fallback
- **Comprehensive error handling** — semua operasi async memiliki try-catch dengan feedback user yang jelas
- **Database migrations** — skema versi (v1 → v2 → v3) untuk upgrade yang aman
- **Input validation** — maxLength pada semua input teks, validasi username
- **Dark/Light/System theme** — konsisten di seluruh aplikasi termasuk screen baru

---

## 📦 Kategori Bawaan

Aplikasi dilengkapi **17 kategori** dan **75+ sub-kategori** yang sudah disesuaikan untuk konteks keuangan Indonesia:

| Tipe | Kategori |
|---|---|
| **Pemasukan** | Pemasukan Aktif (Gaji, Honor, Bonus), Pemasukan Pasif (Dividen, Bunga, Cashback) |
| **Pengeluaran** | Kebutuhan Pokok, Makanan & Minuman, Komunikasi & Digital, Langganan, Kesehatan, Pakaian, Pendidikan, Hiburan, Sosial & Keagamaan, Kewajiban Keuangan, Tabungan & Investasi, Rumah Tangga, Anak & Keluarga, Kendaraan, Bisnis |

---

## 🚀 Getting Started

### Prasyarat
- Node.js ≥ 18
- Expo CLI (`npm install -g expo-cli`)
- Android Studio (emulator) atau perangkat fisik dengan Expo Go

### Instalasi

```bash
# Clone repository
git clone https://github.com/rteitch/MoneyTrackerApp.git
cd MoneyTrackerApp

# Install dependencies
npm install

# Jalankan aplikasi
npx expo start
```

### Menjalankan di Device

Setelah `npx expo start`, pilih:
- **`a`** — Buka di Android emulator
- **`i`** — Buka di iOS simulator (macOS only)
- **Scan QR** — Buka di Expo Go (perangkat fisik)

### Build APK (Production)

```bash
# Install EAS CLI
npm install -g eas-cli

# Build APK preview
eas build -p android --profile preview

# Build production
eas build -p android --profile production
```

---

## 🧪 Testing

```bash
# Jalankan semua test
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

Test suite mencakup:
- `calculateFinancialHealth` — skor, status, metrik keuangan
- `generateSummary` — ringkasan naratif otomatis
- `getDateFilterBoundary` — boundary filter periode
- `calculateNextDate` — hitung tanggal berikutnya (daily/weekly/monthly/yearly)
- `formatRupiah`, `formatRupiahFull` — format angka Rupiah (singkatan & penuh)
- `formatCurrencyInput`, `parseCurrencyRaw` — input & parse nominal
- `formatDate`, `formatDateShort`, `formatDateInput` — format tanggal
- `getGreeting` — sapaan berdasarkan waktu
- `escapeCSV` — escape string untuk CSV
- `getThemeColors`, `getTransactionTypeConfig` — design tokens (dark/light)
- `FontSizes`, `FontWeights`, `Radius`, `Spacing` — token konsistensi
- DB functions (mock) — `getAccounts`, `getTotalHarta`, `addCategory`, `deleteCategory`
- Budget functions (mock) — `getBudgets`, `setBudget`, `deleteBudget`, `getBudgetWithSpending`
- Recurring functions (mock) — `getRecurringTransactions`, `addRecurringTransaction`, `deleteRecurringTransaction`, `toggleRecurringTransaction`
- Debt functions (mock) — `getDebts`, `getDebtSummary`, `addDebt`, `addDebtPayment`, `settleDebt`, `deleteDebt`, `getDebtPayments`

---

## 📄 License

Private project — not for redistribution.

---

<p align="center">
  <strong>MoneyTracker v2.0</strong><br/>
  <em>Catat. Analisis. Kelola keuangan Anda.</em>
</p>
