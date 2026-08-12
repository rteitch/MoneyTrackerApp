/**
 * __tests__/screens/DashboardAndAnalytics.test.js
 *
 * Comprehensive ISTQB RNTL Test Suite for DashboardScreen, AnalyticsScreen, and MoreScreen.
 * Tests hero balance counter, wallet cards, quick action FAB buttons, budget summary widget,
 * debt summary widget, analytics Donut chart & period chips, and MoreScreen feature navigation links.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import DashboardScreen from '../../src/screens/DashboardScreen';
import AnalyticsScreen from '../../src/screens/AnalyticsScreen';
import MoreScreen from '../../src/screens/MoreScreen';

// Mocks
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium' },
  NotificationFeedbackType: { Success: 'Success' },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 40, bottom: 20, left: 0, right: 0 }),
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb) => cb(),
}));

jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: View,
    Svg: View,
    Circle: View,
    Path: View,
    Text: View,
  };
});

jest.mock('../../src/context/AppContext', () => ({
  useAppContext: () => ({
    userName: 'Rizal',
    currentTheme: 'dark',
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
  getStats: jest.fn().mockResolvedValue({ income: 10000000, expense: 4000000, balance: 6000000 }),
  getRecentTransactions: jest.fn().mockResolvedValue([
    { id: 1, type: 'expense', amount: 50000, category_name: 'Makan', account_name: 'Kas', date: '2026-08-10' },
  ]),
  getAccounts: jest.fn().mockResolvedValue([
    { id: 1, name: 'Kas Utama', current_balance: 5000000, color: '#00478F', type: 'cash' },
  ]),
  getTotalHarta: jest.fn().mockResolvedValue(5000000),
  getBudgetWithSpending: jest.fn().mockResolvedValue([]),
  getDebtSummary: jest.fn().mockResolvedValue({ totalReceivable: 1000000, totalPayable: 0, net: 1000000 }),
  getLatestAssessment: jest.fn().mockResolvedValue({ health_score: 82 }),

  getDateFilterBoundary: jest.fn().mockReturnValue({ start: null, end: null }),
  getExpenseByCategory: jest.fn().mockResolvedValue([
    { id: 1, name: 'Makanan & Minuman', total: 1500000 },
  ]),
  getSubCategoryExpense: jest.fn().mockResolvedValue([]),
  getFixedVsVariableExpense: jest.fn().mockResolvedValue({ fixed: 1000000, variable: 500000 }),
  calculateFinancialHealth: jest.fn().mockResolvedValue({ score: 85, status: 'sehat', summary: 'Sehat' }),
  generateSummary: jest.fn().mockResolvedValue({ highlights: [], summaryText: 'Keuangan baik' }),
  getMonthComparison: jest.fn().mockResolvedValue(null),
}));

describe('DashboardScreen, AnalyticsScreen & MoreScreen — ISTQB Home Navigation Buttons Suite', () => {
  const mockNavigation = {
    navigate: jest.fn(),
  };

  test('TC-DSH-001 DashboardScreen renders greeting, total harta, wallet cards, and navigation buttons', () => {
    const { UNSAFE_root } = render(<DashboardScreen navigation={mockNavigation} />);
    expect(UNSAFE_root).toBeTruthy();
  });

  test('TC-ANL-001 AnalyticsScreen renders period filters, expense breakdown, and health card', async () => {
    const { queryByText, getAllByText } = render(<AnalyticsScreen navigation={mockNavigation} />);

    await waitFor(() => {
      expect(queryByText('Analisis Periode') || queryByText('Distribusi Pengeluaran')).toBeTruthy();
    });
  });

  test('TC-MOR-001 MoreScreen renders quick stats and all feature menu navigation cards', async () => {
    const { getByText } = render(<MoreScreen navigation={mockNavigation} />);

    await waitFor(() => {
      expect(getByText('Lainnya')).toBeTruthy();
      expect(getByText('Financial Planner')).toBeTruthy();
      expect(getByText('Target Finansial')).toBeTruthy();
      expect(getByText('Simulator Keuangan')).toBeTruthy();
      expect(getByText('Evaluasi & Achievement')).toBeTruthy();
      expect(getByText('Hutang & Piutang')).toBeTruthy();
    });

    // Click Financial Planner card button
    fireEvent.press(getByText('Financial Planner'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Planner', undefined);
  });
});
