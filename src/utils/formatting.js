/**
 * src/utils/formatting.js
 *
 * Kumpulan fungsi formatting yang dipakai di seluruh aplikasi.
 * Import dari sini — jangan tulis ulang di masing-masing screen.
 */

/**
 * Format angka jadi singkatan Rupiah.
 * Contoh: 1500000 → "Rp 1.5 jt", 2000000000 → "Rp 2.0 M"
 */
export function formatRupiah(num) {
  if (!num && num !== 0) return 'Rp 0';
  const abs = Math.abs(num);
  if (abs >= 1_000_000_000) return `Rp ${(abs / 1_000_000_000).toFixed(1)} M`;
  if (abs >= 1_000_000)     return `Rp ${(abs / 1_000_000).toFixed(1)} jt`;
  return 'Rp ' + abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Format angka jadi Rupiah penuh dengan titik pemisah ribuan.
 * Contoh: 50000 → "Rp 50.000"
 */
export function formatRupiahFull(num) {
  return 'Rp ' + (num || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Format ISO string jadi tanggal singkat Indonesia.
 * Contoh: "2026-04-21T..." → "21 Apr 2026"
 */
export function formatDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Format ISO string jadi tanggal singkat (tanpa tahun).
 * Contoh: "2026-04-21T..." → "21 Apr"
 */
export function formatDateShort(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

/**
 * Format ISO string jadi format DD/MM/YYYY untuk input field.
 */
export function formatDateInput(isoString) {
  const d = new Date(isoString);
  const day   = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year  = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Format ISO string jadi format CSV DD/MM/YYYY.
 */
export function formatDateCSV(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Parse tanggal dari format DD/MM/YYYY ke ISO string.
 * Mengembalikan null jika format tidak valid.
 */
export function parseDateInput(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  const [day, month, year] = parts;
  
  const d  = parseInt(day,   10);
  const m  = parseInt(month, 10);
  const y  = parseInt(year,  10);
  
  if (d < 1 || d > 31 || m < 1 || m > 12 || y < 2000 || y > 2100) return null;
  
  // Create date and check if it auto-corrected (e.g. Feb 31 -> Mar 3)
  const date = new Date(y, m - 1, d);
  if (isNaN(date.getTime())) return null;
  if (date.getDate() !== d || date.getMonth() !== (m - 1) || date.getFullYear() !== y) return null;

  // Use UTC to prevent local timezone offsets in tests/reports
  return new Date(Date.UTC(y, m - 1, d)).toISOString();
}

/**
 * Salam berdasarkan jam saat ini.
 */
export function getGreeting() {
  const h = new Date().getHours();
  if (h < 11) return 'Selamat Pagi';
  if (h < 15) return 'Selamat Siang';
  if (h < 18) return 'Selamat Sore';
  return 'Selamat Malam';
}

/**
 * Escapes characters for CSV format according to RFC 4180.
 * Wraps strings in double quotes if they contain commas, newlines, or double quotes.
 */
export function escapeCSV(str) {
  if (str === null || str === undefined) return '';
  const s = String(str);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}
