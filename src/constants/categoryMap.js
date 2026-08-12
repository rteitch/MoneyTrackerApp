/**
 * src/constants/categoryMap.js
 *
 * Maps existing transaction category names → financial analysis groups.
 * Used by the Financial Engine to bucket expenses correctly.
 *
 * Groups: housing | food | transportation | debt | lifestyle | family | savings | other
 */

// Primary category name → analysis group
export const CATEGORY_GROUP_MAP = {
  // ── Housing ────────────────────────────────────────────────────────────────
  'Kebutuhan Pokok (Tetap)': 'housing',

  // ── Food ───────────────────────────────────────────────────────────────────
  'Makanan & Minuman': 'food',

  // ── Transportation (subset of housing bucket) ────────────────────────────
  // Will be split by subcategory below
  'Kendaraan (Non-Pokok)': 'transportation',

  // ── Lifestyle ──────────────────────────────────────────────────────────────
  'Langganan & Subscription': 'lifestyle',
  'Hiburan & Gaya Hidup':    'lifestyle',
  'Pakaian & Penampilan':    'lifestyle',
  'Komunikasi & Digital':    'lifestyle',

  // ── Debt / Financial Obligations ──────────────────────────────────────────
  'Kewajiban Keuangan': 'debt',

  // ── Savings / Investment ───────────────────────────────────────────────────
  'Tabungan & Investasi': 'savings',

  // ── Health ─────────────────────────────────────────────────────────────────
  'Kesehatan': 'health',

  // ── Education ──────────────────────────────────────────────────────────────
  'Pendidikan': 'education',

  // ── Family ────────────────────────────────────────────────────────────────
  'Anak & Keluarga':    'family',
  'Sosial & Keagamaan': 'family',

  // ── Business ───────────────────────────────────────────────────────────────
  'Bisnis & Pekerjaan': 'other',
  'Rumah Tangga':       'other',
};

// Subcategory name → group override (more specific than parent)
export const SUBCATEGORY_GROUP_MAP = {
  // Housing specifics
  'Sewa rumah / kos':         'housing',
  'Cicilan KPR':              'housing',
  'Tagihan listrik':          'housing',
  'Air (PDAM)':               'housing',
  'Gas / elpiji':             'housing',
  'Internet rumah':           'housing',
  'Iuran lingkungan':         'housing',
  'Biaya perawatan rumah':    'housing',
  'TV kabel':                 'housing',

  // Transportation specifics (from Kebutuhan Pokok)
  'Bensin / BBM':             'transportation',
  'KRL / MRT / Busway':       'transportation',

  // Debt specifics
  'Cicilan Kendaraan':        'debt',
  'Cicilan PayLater / Pinjaman': 'debt',
  'Asuransi':                 'insurance',
  'Pajak (PPh/PBB)':          'tax',
};

// Analysis group metadata (for UI display)
export const ANALYSIS_GROUPS = {
  housing:        { label: 'Tempat Tinggal',       icon: 'home',            color: '#0ea5e9' },
  food:           { label: 'Makanan & Minuman',     icon: 'restaurant',      color: '#10B981' },
  transportation: { label: 'Transportasi',           icon: 'car',             color: '#f59e0b' },
  debt:           { label: 'Cicilan & Hutang',      icon: 'card',            color: '#EF4444' },
  lifestyle:      { label: 'Gaya Hidup',            icon: 'color-palette',   color: '#8b5cf6' },
  family:         { label: 'Keluarga & Sosial',     icon: 'people',          color: '#ec4899' },
  savings:        { label: 'Tabungan & Investasi',  icon: 'trending-up',     color: '#14b8a6' },
  health:         { label: 'Kesehatan',             icon: 'medical',         color: '#06b6d4' },
  education:      { label: 'Pendidikan',            icon: 'school',          color: '#6366f1' },
  insurance:      { label: 'Asuransi',              icon: 'shield-checkmark', color: '#84cc16' },
  other:          { label: 'Lainnya',               icon: 'ellipsis-horizontal', color: '#94a3b8' },
};

/**
 * Get analysis group for a transaction given its category name and optional subcategory name.
 * Falls back to subcategory map, then category map, then 'other'.
 */
export function getAnalysisGroup(categoryName, subcategoryName) {
  if (subcategoryName && SUBCATEGORY_GROUP_MAP[subcategoryName]) {
    return SUBCATEGORY_GROUP_MAP[subcategoryName];
  }
  if (categoryName && CATEGORY_GROUP_MAP[categoryName]) {
    return CATEGORY_GROUP_MAP[categoryName];
  }
  return 'other';
}
