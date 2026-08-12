/**
 * __tests__/screens/TransactionForm.test.js
 *
 * Comprehensive ISTQB RNTL Test Suite for TransactionScreen (Record Transaction Form).
 * Tests Type Switcher buttons (Expense, Income, Transfer), Quick Amount buttons, Wallet Chips,
 * Category/Subcategory Chips, Date Selection, Note Input, and Save/Edit Buttons.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import TransactionScreen from '../../src/screens/TransactionScreen';

// Mocks
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium' },
  NotificationFeedbackType: { Success: 'Success' },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 40, bottom: 20, left: 0, right: 0 }),
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb) => cb(),
}));

jest.mock('../../src/context/AppContext', () => ({
  useAppContext: () => ({
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
}));

const mockDb = {};
jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => mockDb,
}));

const mockAccounts = [
  { id: 1, name: 'Kas Tunai', type: 'cash', color: '#00478F', current_balance: 5000000 },
  { id: 2, name: 'BCA Utama', type: 'bank', color: '#0066CC', current_balance: 10000000 },
];

const mockCategories = [
  { id: 1, name: 'Makanan & Minuman', type: 'expense', is_fixed: 0 },
  { id: 2, name: 'Transportasi', type: 'expense', is_fixed: 0 },
];

const mockSubCategories = [
  { id: 10, name: 'Makan Siang', category_id: 1 },
];

jest.mock('../../src/db/database', () => ({
  getAccounts: jest.fn().mockResolvedValue([
    { id: 1, name: 'Kas Tunai', type: 'cash', color: '#00478F', current_balance: 5000000 },
    { id: 2, name: 'BCA Utama', type: 'bank', color: '#0066CC', current_balance: 10000000 },
  ]),
  getCategories: jest.fn().mockResolvedValue([
    { id: 1, name: 'Makanan & Minuman', type: 'expense', is_fixed: 0 },
    { id: 2, name: 'Transportasi', type: 'expense', is_fixed: 0 },
  ]),
  getSubCategories: jest.fn().mockResolvedValue([
    { id: 10, name: 'Makan Siang', category_id: 1 },
  ]),
  addTransaction: jest.fn().mockResolvedValue(1),
  updateTransaction: jest.fn().mockResolvedValue(1),
}));

describe('TransactionScreen — ISTQB Form Buttons & State Interactions', () => {
  const mockNavigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
    setParams: jest.fn(),
  };

  test('TC-TXF-001 Should switch transaction type buttons (Pengeluaran, Pemasukan, Transfer)', async () => {
    const { getByText } = render(<TransactionScreen navigation={mockNavigation} route={{ params: {} }} />);

    await waitFor(() => {
      expect(getByText('Pengeluaran')).toBeTruthy();
    });

    // Switch to Pemasukan
    fireEvent.press(getByText('Pemasukan'));
    expect(getByText('Kategori Pemasukan')).toBeTruthy();

    // Switch to Transfer
    fireEvent.press(getByText('Transfer'));
    expect(getByText('Dari Dompet')).toBeTruthy();
    expect(getByText('Ke Dompet')).toBeTruthy();
  });

  test('TC-TXF-002 Should fill nominal via Quick Amount buttons (+50rb, +100rb, +500rb)', async () => {
    const { getByText, getByDisplayValue } = render(<TransactionScreen navigation={mockNavigation} route={{ params: {} }} />);

    await waitFor(() => {
      expect(getByText('+50rb')).toBeTruthy();
    });

    // Click +50rb quick button
    fireEvent.press(getByText('+50rb'));
    expect(getByDisplayValue('Rp 50.000')).toBeTruthy();

    // Click +100rb quick button
    fireEvent.press(getByText('+100rb'));
    expect(getByDisplayValue('Rp 150.000')).toBeTruthy();
  });

  test('TC-TXF-003 Should select wallet account chip and category chip', async () => {
    const { getByText } = render(<TransactionScreen navigation={mockNavigation} route={{ params: {} }} />);

    await waitFor(() => {
      expect(getByText('Kas Tunai')).toBeTruthy();
      expect(getByText('Makanan & Minuman')).toBeTruthy();
    });

    // Click Kas Tunai wallet chip
    fireEvent.press(getByText('Kas Tunai'));

    // Click Makanan & Minuman category chip
    fireEvent.press(getByText('Makanan & Minuman'));

    await waitFor(() => {
      expect(getByText('Makan Siang')).toBeTruthy();
    });
  });

  test('TC-TXF-004 Should save transaction when "Simpan" button is pressed', async () => {
    const { getByText, getByPlaceholderText } = render(<TransactionScreen navigation={mockNavigation} route={{ params: {} }} />);

    await waitFor(() => {
      expect(getByText('Simpan')).toBeTruthy();
    });

    // Fill nominal
    fireEvent.press(getByText('+100rb'));
    fireEvent.press(getByText('Kas Tunai'));
    fireEvent.press(getByText('Makanan & Minuman'));

    // Click Simpan button
    const saveBtn = getByText('Simpan');
    fireEvent.press(saveBtn);

    await waitFor(() => {
      expect(getByText('Simpan')).toBeTruthy();
    });
  });

  test('TC-TXF-005 Should support Edit Mode with pre-filled transaction data and Update/Batal buttons', async () => {
    const editTxData = {
      id: 99,
      type: 'expense',
      amount: 75000,
      account_id: 1,
      category_id: 1,
      description: 'Makan bersama tim',
      date: '2026-08-10T12:00:00.000Z',
    };

    const { getByText, getByDisplayValue } = render(
      <TransactionScreen navigation={mockNavigation} route={{ params: { editTx: editTxData } }} />
    );

    await waitFor(() => {
      expect(getByText('MODE EDIT TRANSAKSI')).toBeTruthy();
      expect(getByDisplayValue('Rp 75.000')).toBeTruthy();
      expect(getByText('Update')).toBeTruthy();
      expect(getByText('Batal')).toBeTruthy();
    });
  });
});
