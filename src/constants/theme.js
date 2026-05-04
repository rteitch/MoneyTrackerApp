/**
 * src/constants/theme.js
 *
 * Single source of truth untuk semua design tokens.
 * Mendukung Dark Mode dan Light Mode.
 *
 * Palette:
 * - Brand    : #00478F — biru utama di SEMUA mode
 * - Secondary: #0066CC — biru terang untuk aksen
 * - Titanium : #878681 — netral sebagai muted text
 *
 * Theme modes:
 * - 'dark'   : Deep navy background dengan aksen biru
 * - 'light'  : Clean white/gray background dengan aksen biru
 * - 'system' : Mengikuti preferensi sistem (dark/light)
 */

// ─── Brand Palette ───────────────────────────────────────────────────────
const BRAND_BLUE      = "#00478F"; // Primary
const BRAND_LIGHT_BLUE = "#0066CC"; // Secondary/Accent
const NATURAL_TITANIUM = "#878681"; // Muted

const DarkColors = {
  // Backgrounds — Deep Navy Charcoal
  bgPrimary:  "#0F172A", // Slate-900 (Navy gelap elegan)
  bgCard:     "#1E293B", // Slate-800
  bgElevated: "#334155", // Slate-700
  bgDeep:     "#020617", // Slate-950

  // Theme Specific Backgrounds
  brandBg:   "#00478F20",
  incomeBg:  "#10B98120", 
  expenseBg: "#EF444420", 
  warningBg: "#FBBF2415",
  infoBg:    "#0066CC20",

  // Text
  textPrimary:   "#F8F9FA", // Off-white
  textSecondary: "#CBD5E1", 
  textMuted:     NATURAL_TITANIUM, 
  textFaint:     "#64748B",
  textFaintest:  "#475569",

  // Borders
  border:      "#334155", 
  borderLight: "#475569",

  // Overlays
  overlay:     "rgba(0,0,0,0.60)",
  overlayDark: "rgba(0,0,0,0.85)",
};

const LightColors = {
  // Backgrounds — Clean White & Off-White
  bgPrimary: "#F8FAFC", // Background Slate-50 yang sejuk
  bgCard: "#FFFFFF",    // Permukaan kartu putih bersih
  bgElevated: "#F1F5F9",
  bgDeep: "#E2E8F0",

  // Theme Specific Backgrounds
  brandBg:   BRAND_BLUE + "15",
  incomeBg:  "#10B98115",
  expenseBg: "#EF444415",
  warningBg: "#FBBF2415",
  infoBg:    BRAND_LIGHT_BLUE + "15",

  // Text
  textPrimary: "#0F172A", // Slate-900
  textSecondary: "#475569",
  textMuted: NATURAL_TITANIUM,
  textFaint: "#94A3B8",
  textFaintest: "#CBD5E1",

  // Borders
  border: "#E2E8F0",
  borderLight: "#F1F5F9",

  // Overlays
  overlay: "rgba(0,0,0,0.3)",
  overlayDark: "rgba(0,0,0,0.5)",
};

// ─── Common colors ──────────────────────────────────────────────────────────
const CommonColors = {
  brand:     BRAND_BLUE,
  secondary: BRAND_LIGHT_BLUE,
  income:    "#10B981",       // Fresh Emerald
  expense:   "#EF4444",       // Crisp Red
  warning:   "#FBBF24",       // Amber
  info:      BRAND_LIGHT_BLUE,
};

export const getThemeColors = (theme = "dark") => {
  if (theme === "light") {
    return { ...CommonColors, ...LightColors };
  }
  return { ...CommonColors, ...DarkColors };
};

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
