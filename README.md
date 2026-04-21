# 💸 MoneyTracker

Aplikasi pencatat keuangan pribadi **offline-first** berbasis React Native + Expo. Dirancang untuk membantu pengguna Indonesia mengelola pemasukan, pengeluaran, dan transfer antar dompet secara terstruktur — tanpa perlu koneksi internet.

> **Developed by RTEITCH**

---

## ✨ Fitur Utama

### 🏠 Dashboard (Beranda)
- Sapaan personalisasi berdasarkan waktu (Pagi/Siang/Sore/Malam)
- **Hero Card** menampilkan total aset (kas aktif), savings rate, pemasukan, pengeluaran, dan net cash flow
- Daftar **dompet & rekening** dengan saldo real-time (scroll horizontal)
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

### ⚙️ Pengaturan
- **Tab Dompet**: Tambah dompet baru (Tunai, Bank, E-Wallet, Investasi, Kredit), pilih warna, set saldo awal, opsi kecualikan dari total aset
- **Tab Kategori**: CRUD kategori induk (pengeluaran/pemasukan), tandai sebagai pengeluaran tetap (fixed), CRUD sub-kategori
- **Tab Profil**: Ubah nama pengguna, info aplikasi, zona berbahaya (bersihkan riwayat transaksi)
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
│   │   ├── BottomSheetModal.js      # Modal konfirmasi hapus (reusable)
│   │   ├── MetricCard.js            # Card metrik keuangan
│   │   ├── StatusModal.js           # Modal status/error (reusable)
│   │   └── TransactionCard.js       # Card transaksi (reusable)
│   ├── constants/
│   │   └── theme.js                 # Design tokens (warna, spacing)
│   ├── context/
│   │   └── AppContext.js            # Global state (username, preferences)
│   ├── db/
│   │   └── database.js              # SQLite schema, CRUD, migrasi, seed data
│   ├── screens/
│   │   ├── DashboardScreen.js       # Beranda
│   │   ├── MutasiScreen.js          # Riwayat & export
│   │   ├── TransactionScreen.js     # Form input transaksi
│   │   ├── AnalyticsScreen.js       # Statistik & chart
│   │   └── SettingsScreen.js        # Pengaturan
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
- **Database migrations** — skema versi untuk upgrade yang aman di masa depan

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
- `formatting.js` — format Rupiah, tanggal, CSV escape
- `theme.js` — design tokens & colors
- DB functions (mock) — `getAccounts`, `getTotalHarta`, `addCategory`, `deleteCategory`

---

## 📄 License

Private project — not for redistribution.

---

<p align="center">
  <strong>MoneyTracker v1.0</strong><br/>
  <em>Catat. Analisis. Kelola keuangan Anda.</em>
</p>
