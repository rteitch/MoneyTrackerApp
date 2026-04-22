/**
 * src/utils/formatting.js
 *
 * Kumpulan fungsi formatting yang sudah disempurnakan.
 * Menangani angka besar (T/M) dan lokalisasi Indonesia.
 */

/**
 * Format angka jadi singkatan Rupiah yang sangat ringkas.
 * Contoh: 1.500.000 -> "Rp 1,5 jt"
 */
export function formatRupiah(num) {
  if (num === null || num === undefined || isNaN(num)) return 'Rp 0';

  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';

  const formatCompact = (value, unit) => {
    const formattedValue = new Intl.NumberFormat('id-ID', {
      maximumFractionDigits: 1,
      minimumFractionDigits: 0,
    }).format(value);
    return `Rp ${sign}${formattedValue} ${unit}`;
  };

  if (abs >= 1_000_000_000_000) return formatCompact(abs / 1_000_000_000_000, 'T');
  if (abs >= 1_000_000_000) return formatCompact(abs / 1_000_000_000, 'M');
  if (abs >= 1_000_000) return formatCompact(abs / 1_000_000, 'jt');
  if (abs >= 1_000) return formatCompact(abs / 1_000, 'rb');

  return `Rp ${sign}${new Intl.NumberFormat('id-ID').format(abs)}`;
}

/**
 * Format angka jadi Rupiah penuh yang "Cerdas".
 * Jika < 1 Miliar, tampilkan angka penuh (Rp 500.000).
 * Jika >= 1 Miliar, gunakan singkatan agar UI tidak berantakan (seperti di screenshot).
 */
export function formatRupiahFull(num) {
  const abs = Math.abs(num || 0);
  const sign = (num || 0) < 0 ? '-' : '';

  if (abs >= 1_000_000_000_000) {
    const value = (abs / 1_000_000_000_000).toLocaleString('id-ID', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return `Rp ${sign}${value} T`;
  }

  if (abs >= 1_000_000_000) {
    const value = (abs / 1_000_000_000).toLocaleString('id-ID', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return `Rp ${sign}${value} M`;
  }

  // Untuk jutaan ke bawah, tampilkan angka penuh dengan titik
  const formatted = new Intl.NumberFormat('id-ID').format(abs);
  return `Rp ${sign}${formatted}`;
}

/**
 * Format input teks secara real-time untuk TextInput.
 */
export function formatCurrencyInput(text) {
  if (!text) return '';
  const raw = text.replace(/\D/g, '');
  if (!raw) return '';

  const formatted = new Intl.NumberFormat('id-ID').format(parseInt(raw, 10));
  return `Rp ${formatted}`;
}

/**
 * Mengubah string format Rupiah kembali menjadi angka murni.
 */
export function parseCurrencyRaw(text) {
  if (typeof text === 'number') return text;
  if (!text) return 0;
  return parseInt(text.replace(/\D/g, ''), 10) || 0;
}

/**
 * Format ISO Date ke "21 Apr 2026"
 */
export function formatDate(isoString) {
  if (!isoString) return '-';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

/**
 * Format ISO Date ke "21 Apr"
 */
export function formatDateShort(isoString) {
  if (!isoString) return '-';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short'
  });
}

/**
 * Format DD/MM/YYYY untuk input form.
 */
export function formatDateInput(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Salam berdasarkan waktu.
 */
export function getGreeting() {
  const hours = new Date().getHours();
  if (hours >= 5 && hours < 11) return 'Selamat Pagi';
  if (hours >= 11 && hours < 15) return 'Selamat Siang';
  if (hours >= 15 && hours < 18) return 'Selamat Sore';
  return 'Selamat Malam';
}

/**
 * Escape string untuk CSV.
 */
export function escapeCSV(val) {
  if (val === null || val === undefined) return '';
  let str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    str = `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}