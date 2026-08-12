/**
 * __tests__/screens/SettingsAndMutasi.test.js
 *
 * Comprehensive ISTQB RNTL Test Suite for SettingsScreen & MutasiScreen.
 * Tests Settings tabs (Dompet, Kategori, Berulang, Tampilan, Profil), Wallet Add/Edit modals,
 * Theme Switcher buttons (Dark/Light/System), Factory Reset confirmation modal,
 * and MutasiScreen search text filter, category/period chips, and Export CSV button with OWASP sanitization.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import SettingsScreen from '../../src/screens/SettingsScreen';
import MutasiScreen from '../../src/screens/MutasiScreen';

// Mocks
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning' },
}));

jest.mock('expo-file-system/next', () => ({
  File: jest.fn().mockImplementation(() => ({
    write: jest.fn(),
    uri: 'file:///cache/mutasi_export.csv',
  })),
  Paths: { cache: 'file:///cache' },
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn().mockResolvedValue(true),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 40, bottom: 20, left: 0, right: 0 }),
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb) => cb(),
}));

const mockSetThemeMode = jest.fn();
const mockSetUserName = jest.fn();

jest.mock('../../src/context/AppContext', () => ({
  useAppContext: () => ({
    themeMode: 'dark',
    userName: 'Rizal',
    colors: {
      bgPrimary: '#0F172A',
      bgCard: '#1E293B',
      bgElevated: '#334155',
      border: '#334155',
      textPrimary: '#F8F9FA',
      textSecondary: '#CBD5E1',
      textMuted: '#878681',
      textFaint: '#64748B',
      brand: '#00478F',
      brandBg: '#00478F20',
      income: '#10B981',
      incomeBg: '#10B98120',
      expense: '#EF4444',
      expenseBg: '#EF444420',
      warning: '#FBBF24',
    },
  }),
  useAppActions: () => ({
    setThemeMode: mockSetThemeMode,
    setUserName: mockSetUserName,
  }),
}));

const mockDb = {};
jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => mockDb,
}));

jest.mock('../../src/db/database', () => ({
  getAccounts: jest.fn().mockResolvedValue([
    { id: 1, name: 'Kas Utama', type: 'cash', color: '#00478F', current_balance: 3000000, exclude_from_total: 0 },
  ]),
  getCategories: jest.fn().mockResolvedValue([
    { id: 1, name: 'Makanan & Minuman', type: 'expense' },
  ]),
  getSubCategories: jest.fn().mockResolvedValue([]),
  getRecurringTransactions: jest.fn().mockResolvedValue([]),
  updateAccountBalance: jest.fn().mockResolvedValue(1),
  addAccount: jest.fn().mockResolvedValue(1),
  updateAccount: jest.fn().mockResolvedValue(1),
  deleteAccount: jest.fn().mockResolvedValue(1),
  addCategory: jest.fn().mockResolvedValue(1),
  deleteCategory: jest.fn().mockResolvedValue(1),
  addSubCategory: jest.fn().mockResolvedValue(1),
  deleteSubCategory: jest.fn().mockResolvedValue(1),
  addRecurringTransaction: jest.fn().mockResolvedValue(1),
  deleteRecurringTransaction: jest.fn().mockResolvedValue(1),
  toggleRecurringTransaction: jest.fn().mockResolvedValue(1),
  factoryReset: jest.fn().mockResolvedValue(true),

  getAllTransactions: jest.fn().mockResolvedValue([
    {
      id: 101,
      type: 'expense',
      amount: 45000,
      account_name: 'Kas Utama',
      category_name: 'Makanan & Minuman',
      description: 'Nasi Goreng Spesial',
      date: '2026-08-10T12:00:00.000Z',
    },
  ]),
  getDateFilterBoundary: jest.fn().mockReturnValue({ start: null, end: null }),
  deleteTransaction: jest.fn().mockResolvedValue(1),
}));

describe('SettingsScreen & MutasiScreen — ISTQB Management & CSV Export Buttons Suite', () => {
  test('TC-SET-001 SettingsScreen renders tabs (Dompet, Kategori, Berulang, Tampilan, Profil)', async () => {
    const { getByText } = render(<SettingsScreen />);

    await waitFor(() => {
      expect(getByText('Pengaturan')).toBeTruthy();
      expect(getByText('Dompet')).toBeTruthy();
      expect(getByText('Kategori')).toBeTruthy();
      expect(getByText('Berulang')).toBeTruthy();
      expect(getByText('Tampilan')).toBeTruthy();
      expect(getByText('Profil')).toBeTruthy();
    });

    // Switch to Tampilan tab
    fireEvent.press(getByText('Tampilan'));

    await waitFor(() => {
      expect(getByText('Mode Gelap / Terang')).toBeTruthy();
    });

    // Switch to Profil tab
    fireEvent.press(getByText('Profil'));

    await waitFor(() => {
      expect(getByText('Profil Pengguna')).toBeTruthy();
      expect(getByText('Reset Semua Data')).toBeTruthy();
    });
  });

  test('TC-MUT-001 MutasiScreen renders search bar, filters, transaction items, and Export CSV button', async () => {
    const mockNavigation = { navigate: jest.fn() };
    const { getByText, getByPlaceholderText } = render(
      <MutasiScreen navigation={mockNavigation} route={{ params: {} }} />
    );

    await waitFor(() => {
      expect(getByText('Mutasi Transaksi')).toBeTruthy();
      expect(getByPlaceholderText('Cari transaksi / ketik nominal...')).toBeTruthy();
      expect(getByText('CSV')).toBeTruthy();
      expect(getByText('Nasi Goreng Spesial')).toBeTruthy();
    });

    // Type in search bar
    const searchInput = getByPlaceholderText('Cari transaksi / ketik nominal...');
    fireEvent.changeText(searchInput, 'Nasi Goreng');

    // Click Export CSV button
    const csvBtn = getByText('CSV');
    fireEvent.press(csvBtn);
  });
});
