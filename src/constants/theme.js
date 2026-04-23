/**
 * src/constants/theme.js
 *
 * Single source of truth untuk semua design tokens.
 * Mendukung Dark Mode dan Light Mode.
 *
 * Palette Warna Utama Aplikasi (iPhone Pantone):
 * - Brand    : #FF5800 (Pantone 1505 C)  — oranye utama di SEMUA mode
 * - Secondary: #BCBEC0 (Pantone 420 C)  — abu-abu warm sebagai pendukung
 * - Titanium : #878681 (Natural Titanium)— metalik netral sebagai aksen
 *
 * Theme modes:
 * - 'dark'   : Titanium grey dark — brand oranye #FF5800 di atas abu titanium
 * - 'light'  : Clean light — brand oranye #FF5800 di atas background terang
 * - 'system' : Mengikuti preferensi sistem (dark/light)
 */

// ─── Pantone / iPhone 15 Palette ────────────────────────────────────────────
const PANTONE_ORANGE   = "#FF5800"; // Pantone 1505 C  — brand utama
const PANTONE_SILVER   = "#BCBEC0"; // Pantone 420 C   — secondary/border
const TITANIUM_NATURAL = "#878681"; // Natural Titanium — aksen metalik

const DarkColors = {
  // Backgrounds — Titanium Grey (Natural Titanium aesthetic)
  bgPrimary:  "#1c1c1a", // Titanium gelap utama
  bgCard:     "#252522", // Kartu — satu level lebih terang
  bgElevated: "#303030", // Elevated surface — abu sedang
  bgDeep:     "#111110", // Paling gelap (header, tab bar)

  // Theme Specific Backgrounds
  // Theme Specific Backgrounds
  brandBg:   "#3d1800", // Oranye sangat gelap sebagai tint brand (diperjelas)
  incomeBg:  "#003d2e", // Hijau gelap yang lebih terlihat
  expenseBg: "#3d0f1a", // Merah gelap yang lebih terlihat
  warningBg: "#3d2a00",
  infoBg:    "#0e1a3d",

  // Text — ivory warm untuk kontras dengan titanium
  textPrimary:   "#f5f4ee", // Ivory warm — paling terang
  textSecondary: PANTONE_SILVER,   // #BCBEC0 — Pantone 420 C
  textMuted:     TITANIUM_NATURAL, // #878681 — Natural Titanium
  textFaint:     "#4a4a42",
  textFaintest:  "#272720",

  // Borders — titanium subtle
  border:      "#38382e", // Abu titanium gelap
  borderLight: "#2a2a24",

  // Overlays
  overlay:     "rgba(10,10,8,0.60)",
  overlayDark: "rgba(10,10,8,0.85)",
};

const LightColors = {
  // Backgrounds
  bgPrimary: "#f8fafc",
  bgCard: "#ffffff",
  bgElevated: "#f1f5f9",
  bgDeep: "#e2e8f0",

  // Theme Specific Backgrounds
  brandBg:   "#FF580015", // Oranye transparan di atas putih
  incomeBg:  "#00c89615",
  expenseBg: "#ff4d6d15",
  warningBg: "#f59e0b15",
  infoBg:    "#0ea5e915",

  // Text
  textPrimary: "#0f172a",
  textSecondary: "#475569",
  textMuted: "#94a3b8",
  textFaint: "#cbd5e1",
  textFaintest: "#f1f5f9",

  // Borders
  border: "#e2e8f0",
  borderLight: "#f1f5f9",

  // Overlays
  overlay: "rgba(0,0,0,0.3)",
  overlayDark: "rgba(0,0,0,0.5)",
};

const iPhone15Colors = {
  // Backgrounds — warm titanium dengan sedikit coklat-gelap agar oranye pop
  bgPrimary:  "#18180f", // Titanium sangat gelap (kekuningan gelap)
  bgCard:     "#222218", // Kartu sedikit lebih terang
  bgElevated: "#2c2c22", // Elevated surface
  bgDeep:     "#0e0e0a", // Paling gelap

  // Theme Specific Backgrounds — menggunakan Pantone Orange sebagai brand
  brandBg:   PANTONE_ORANGE + "20", // Oranye transparan 12%
  incomeBg:  "#00c89615",
  expenseBg: "#ff4d6d15",
  warningBg: "#f59e0b15",
  infoBg:    "#0ea5e915",

  // Text — warm ivory + Pantone Silver hierarchy
  textPrimary:   "#f5f4ee",           // Ivory warm
  textSecondary: PANTONE_SILVER,      // #BCBEC0 — sekunder Pantone 420 C
  textMuted:     TITANIUM_NATURAL,    // #878681 — Natural Titanium
  textFaint:     "#4a4a42",           // Lebih gelap
  textFaintest:  "#272720",

  // Borders — menggunakan Natural Titanium sebagai border halus
  border:      "#36362c",             // Warm dark border
  borderLight: TITANIUM_NATURAL + "40", // Titanium transparan sebagai garis halus

  // Overlays
  overlay:     "rgba(10,10,6,0.55)",
  overlayDark: "rgba(10,10,6,0.80)",

  // Extra tokens khusus iPhone-15
  titanium:    TITANIUM_NATURAL,      // #878681 — untuk ornamen/badge metalik
  pantone:     PANTONE_SILVER,        // #BCBEC0 — untuk chip/border sekunder
};

// ─── Common colors — #FF5800 sebagai brand utama SEMUA mode ─────────────────
const CommonColors = {
  brand:   PANTONE_ORANGE,  // #FF5800 — oranye utama universal
  income:  "#00c896",       // Deep Emerald Green (lebih premium)
  expense: "#ff4d6d",       // Rose Coral Red
  warning: "#f59e0b",
  info:    "#0ea5e9",
};

export const getThemeColors = (theme = "dark") => {
  if (theme === "light") {
    return { ...LightColors, ...CommonColors };
  }
  // 'dark' | 'system' | fallback — semua pakai titanium grey dark
  return { ...DarkColors, ...CommonColors };
};

// Legacy Export for compatibility while transitioning
export const Colors = { ...DarkColors, ...CommonColors };

export const FontSizes = {
  xs: 10,
  sm: 11,
  base: 13,
  md: 14,
  lg: 15,
  xl: 16,
  "2xl": 18,
  "3xl": 20,
  hero: 30,
};

export const FontWeights = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
  heavy: "800",
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 14,
  xl: 16,
  "2xl": 20,
  "3xl": 24,
  full: 9999,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
};

export const TransactionTypeConfig = {
  expense: {
    icon: "arrow-down",
    color: CommonColors.expense,
    bg: CommonColors.expenseBg,
    label: "Keluar",
    sign: "−",
  },
  income: {
    icon: "arrow-up",
    color: CommonColors.income,
    bg: CommonColors.incomeBg,
    label: "Masuk",
    sign: "+",
  },
  transfer: {
    icon: "swap-horizontal",
    color: CommonColors.brand,
    bg: CommonColors.brandBg,
    label: "Transfer",
    sign: "",
  },
};

export const getTransactionTypeConfig = (theme = "dark") => {
  const colors = getThemeColors(theme);
  return {
    expense: {
      icon: "arrow-down",
      color: colors.expense,
      bg: colors.expenseBg,
      label: "Keluar",
      sign: "−",
    },
    income: {
      icon: "arrow-up",
      color: colors.income,
      bg: colors.incomeBg,
      label: "Masuk",
      sign: "+",
    },
    transfer: {
      icon: "swap-horizontal",
      color: colors.brand,
      bg: colors.brandBg,
      label: "Transfer",
      sign: "",
    },
  };
};
