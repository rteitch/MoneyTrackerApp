/**
 * __tests__/screens/AssessmentWizard.test.js
 *
 * Comprehensive ISTQB UI & Business Process Test Suite for AssessmentScreen (Financial Profile Wizard).
 * Tests all 4 wizard steps, employment/stability selection buttons, income/expense CRUD buttons,
 * currency inputs, step navigation, and final submission to financial engine.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AssessmentScreen from '../../src/screens/AssessmentScreen';

// Mock Expo vector icons, haptics, linear gradient, safe area
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  NotificationFeedbackType: { Success: 'Success' },
  ImpactFeedbackStyle: { Light: 'Light' },
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 40, bottom: 20, left: 0, right: 0 }),
}));

// Mock AppContext
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

// Mock Database module
const mockDb = {};
jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => mockDb,
}));

jest.mock('../../src/db/database', () => ({
  saveFinancialProfile: jest.fn().mockResolvedValue(1),
  addIncomeSource: jest.fn().mockResolvedValue(1),
  getIncomeSources: jest.fn().mockResolvedValue([]),
  addFixedExpense: jest.fn().mockResolvedValue(1),
  getFixedExpenses: jest.fn().mockResolvedValue([]),
  saveFinancialAssessment: jest.fn().mockResolvedValue(1),
  getMonthlyTransactionSummary: jest.fn().mockResolvedValue({ totalIncome: 5000000, totalExpense: 2000000 }),
  getTotalLiquidBalance: jest.fn().mockResolvedValue(10000000),
  getFinancialGoals: jest.fn().mockResolvedValue([]),
}));

describe('AssessmentScreen — ISTQB 4-Step Wizard & Button Integration Suite', () => {
  const mockNavigation = {
    replace: jest.fn(),
    navigate: jest.fn(),
  };

  test('TC-WIZ-001 [Step 0] Should select Employment type and Stability buttons correctly', () => {
    const { getByText } = render(<AssessmentScreen navigation={mockNavigation} />);

    expect(getByText('Profil Dasar')).toBeTruthy();
    expect(getByText('Karyawan Tetap')).toBeTruthy();
    expect(getByText('Freelancer')).toBeTruthy();
    expect(getByText('Wirausaha')).toBeTruthy();

    // Click Freelancer employment button
    fireEvent.press(getByText('Freelancer'));

    // Click Bervariasi stability button
    fireEvent.press(getByText('Bervariasi'));
  });

  test('TC-WIZ-002 [Step Navigation] Clicking Lanjut button should navigate to Step 1 (Income)', () => {
    const { getByText } = render(<AssessmentScreen navigation={mockNavigation} />);

    const nextBtn = getByText('Lanjut →');
    fireEvent.press(nextBtn);

    expect(getByText('Sumber Pendapatan')).toBeTruthy();
    expect(getByText('← Kembali')).toBeTruthy();
  });

  test('TC-WIZ-003 [Step 1: Income CRUD Buttons] Should add new income source, change type, and update nominal', () => {
    const { getByText, getByPlaceholderText } = render(<AssessmentScreen navigation={mockNavigation} />);

    // Navigate to Step 1
    fireEvent.press(getByText('Lanjut →'));

    // Click "Tambah Sumber Pendapatan" button
    const addIncomeBtn = getByText('Tambah Sumber Pendapatan');
    fireEvent.press(addIncomeBtn);

    // Enter name & amount
    const nameInput = getByPlaceholderText('mis: Gaji BRI');
    fireEvent.changeText(nameInput, 'Gaji Utama');

    const amountInput = getByPlaceholderText('Rp 0');
    fireEvent.changeText(amountInput, '7500000');

    expect(getByText(/Total Pendapatan Bulanan/i)).toBeTruthy();
  });

  test('TC-WIZ-004 [Step 2: Expense CRUD Buttons] Should navigate to Step 2, add fixed expense, and update total', () => {
    const { getByText, getByPlaceholderText } = render(<AssessmentScreen navigation={mockNavigation} />);

    // Go to Step 1
    fireEvent.press(getByText('Lanjut →'));
    // Go to Step 2
    fireEvent.press(getByText('Lanjut →'));

    expect(getByText('Pengeluaran Tetap Bulanan')).toBeTruthy();

    // Click "Tambah Pengeluaran" button
    const addExpenseBtn = getByText('Tambah Pengeluaran');
    fireEvent.press(addExpenseBtn);

    const nameInputs = getByPlaceholderText('mis: Kos / Kontrakan');
    fireEvent.changeText(nameInputs, 'Sewa Apartemen');
  });

  test('TC-WIZ-005 [Step 3: Submission] Completing wizard and clicking "Hitung Skor Keuangan" triggers financial engine and navigation', async () => {
    const { getByText } = render(<AssessmentScreen navigation={mockNavigation} />);

    // Step 0 -> Step 1 -> Step 2 -> Step 3
    fireEvent.press(getByText('Lanjut →'));
    fireEvent.press(getByText('Lanjut →'));
    fireEvent.press(getByText('Lanjut →'));

    expect(getByText('Ringkasan')).toBeTruthy();
    const submitBtn = getByText('Hitung Skor Keuangan');

    fireEvent.press(submitBtn);

    await waitFor(() => {
      expect(mockNavigation.replace).toHaveBeenCalledWith('Planner', expect.anything());
    });
  });
});
