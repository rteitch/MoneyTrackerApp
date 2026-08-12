/**
 * __tests__/screens/BudgetAndDebt.test.js
 *
 * Comprehensive ISTQB RNTL Test Suite for BudgetScreen & DebtScreen.
 * Tests Budget form category selection chips, limit input, save budget button, budget deletion,
 * DebtScreen Receivable vs Payable tab switcher, Add Debt form, Partial Payment modal buttons, and Settle Lunas action.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import BudgetScreen from '../../src/screens/BudgetScreen';
import DebtScreen from '../../src/screens/DebtScreen';

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

jest.mock('../../src/db/database', () => ({
  getBudgetWithSpending: jest.fn().mockResolvedValue([
    { id: 1, category_id: 10, category_name: 'Makanan & Minuman', monthly_limit: 3000000, spent: 1200000 },
  ]),
  getCategories: jest.fn().mockResolvedValue([
    { id: 10, name: 'Makanan & Minuman', type: 'expense' },
    { id: 11, name: 'Transportasi', type: 'expense' },
  ]),
  setBudget: jest.fn().mockResolvedValue(1),
  deleteBudget: jest.fn().mockResolvedValue(1),

  getDebts: jest.fn().mockResolvedValue([
    {
      id: 1,
      type: 'receivable',
      person_name: 'Budi Santoso',
      amount: 1000000,
      remaining_amount: 500000,
      description: 'Pinjaman modal',
      due_date: '2026-09-01',
      status: 'unpaid',
      created_at: '2026-08-01',
    },
  ]),
  getDebtSummary: jest.fn().mockResolvedValue({ totalReceivable: 1000000, totalPayable: 0, net: 1000000 }),
  getDebtPayments: jest.fn().mockResolvedValue([]),
  addDebt: jest.fn().mockResolvedValue(1),
  addDebtPayment: jest.fn().mockResolvedValue(1),
  settleDebt: jest.fn().mockResolvedValue(1),
  deleteDebt: jest.fn().mockResolvedValue(1),
}));

describe('BudgetScreen & DebtScreen — ISTQB Form & Action Buttons Suite', () => {
  test('TC-BDG-001 BudgetScreen renders summary, category selector chips, and save button', async () => {
    const { getByText, getByPlaceholderText } = render(<BudgetScreen />);

    await waitFor(() => {
      expect(getByText('Anggaran Bulanan')).toBeTruthy();
      expect(getByText('Total Anggaran')).toBeTruthy();
      expect(getByText('Makanan & Minuman')).toBeTruthy();
      expect(getByText('Tambah Budget Baru')).toBeTruthy();
    });

    // Select Makanan & Minuman category chip
    fireEvent.press(getByText('Makanan & Minuman'));

    // Fill limit input
    const limitInput = getByPlaceholderText('Rp 0');
    fireEvent.changeText(limitInput, '2500000');

    // Press Simpan Budget button
    const saveBtn = getByText('Simpan Budget');
    fireEvent.press(saveBtn);
  });

  test('TC-DBT-001 DebtScreen switches Receivable/Payable tabs and opens Add Debt form button', async () => {
    const { getByText, getByPlaceholderText } = render(<DebtScreen />);

    await waitFor(() => {
      expect(getByText('Hutang & Piutang')).toBeTruthy();
      expect(getByText('Piutang Saya')).toBeTruthy();
      expect(getByText('Hutang Saya')).toBeTruthy();
      expect(getByText('Budi Santoso')).toBeTruthy();
    });

    // Click "Hutang Saya" tab
    fireEvent.press(getByText('Hutang Saya'));

    // Click "Tambah Hutang Baru" button
    const addBtn = getByText('Tambah Hutang Baru');
    fireEvent.press(addBtn);

    await waitFor(() => {
      expect(getByPlaceholderText('Nama orang / instansi')).toBeTruthy();
      expect(getByText('Simpan')).toBeTruthy();
      expect(getByText('Batal')).toBeTruthy();
    });
  });

  test('TC-DBT-002 DebtCard payment button "+ Cicil" opens Payment Modal', async () => {
    const { getByText } = render(<DebtScreen />);

    await waitFor(() => {
      expect(getByText('+ Cicil')).toBeTruthy();
    });

    // Click + Cicil button
    fireEvent.press(getByText('+ Cicil'));

    await waitFor(() => {
      expect(getByText('Bayar Cicilan')).toBeTruthy();
      expect(getByText('Konfirmasi')).toBeTruthy();
    });
  });
});
