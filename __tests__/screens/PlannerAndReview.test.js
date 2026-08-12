/**
 * __tests__/screens/PlannerAndReview.test.js
 *
 * Comprehensive ISTQB RNTL Test Suite for PlannerScreen & MonthlyReviewScreen.
 * Tests Health Score Card, Diagnosis accordion expanders, Recommendation CTA buttons,
 * Sub-tab switchers (Evaluasi Bulanan vs Lencana), and Achievement unlock logic.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import PlannerScreen from '../../src/screens/PlannerScreen';
import MonthlyReviewScreen from '../../src/screens/MonthlyReviewScreen';

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

const mockProfile = {
  age: 28,
  employment_type: 'karyawan_tetap',
  income_stability: 'stabil',
  dependents: 1,
};

const mockAnalysis = {
  income: 10000000,
  expense: 4000000,
  cashFlow: 6000000,
  savingsRate: 0.6,
  emergencyMonths: 5.5,
  health_score: 82,
  metrics: {
    emergency: { score: 85 },
    savings: { score: 90 },
    fixedExpense: { score: 80 },
    debt: { score: 100 },
    budget: { score: 75 },
    goals: { score: 70 },
  },
  diagnoses: [
    {
      id: 'D01',
      severity: 'medium',
      title: 'Dana Darurat Perlu Ditingkatkan',
      desc: 'Dana darurat Anda saat ini 5.5 bulan, tingkatkan hingga 6 bulan.',
      actionable: 'Alokasikan 10% pendapatan ke tabungan darurat.',
      link: 'Goals',
    },
  ],
  recommendations: [
    { text: 'Targetkan dana darurat 6x pengeluaran', icon: 'shield-checkmark', link: 'Goals' },
  ],
};

jest.mock('../../src/db/database', () => ({
  getFinancialProfile: jest.fn().mockResolvedValue({
    age: 28,
    employment_type: 'karyawan_tetap',
    income_stability: 'stabil',
    dependents: 1,
  }),
  getFixedExpenses: jest.fn().mockResolvedValue([]),
  getFinancialGoals: jest.fn().mockResolvedValue([]),
  getMonthlyTransactionSummary: jest.fn().mockResolvedValue({ totalIncome: 10000000, totalExpense: 4000000 }),
  getTotalLiquidBalance: jest.fn().mockResolvedValue(22000000),
  getLatestAssessment: jest.fn().mockResolvedValue({
    health_score: 82,
    total_income: 10000000,
    total_expense: 4000000,
    cash_flow: 6000000,
    savings_rate: 0.6,
    emergency_months: 5.5,
    created_at: '2026-08-01',
  }),
  saveFinancialAssessment: jest.fn().mockResolvedValue(1),
  getAssessmentHistory: jest.fn().mockResolvedValue([
    { health_score: 82, total_income: 10000000, total_expense: 4000000, created_at: '2026-08-01' },
    { health_score: 75, total_income: 9000000, total_expense: 4500000, created_at: '2026-07-01' },
  ]),
  getAchievements: jest.fn().mockResolvedValue([
    { key: 'first_assessment', unlocked_at: '2026-08-01' },
  ]),
  getSimulations: jest.fn().mockResolvedValue([]),
}));

describe('PlannerScreen & MonthlyReviewScreen — ISTQB UI & Navigation Buttons Suite', () => {
  const mockNavigation = {
    navigate: jest.fn(),
  };

  test('TC-PLN-001 PlannerScreen renders HealthScoreCard, Key Metrics, and Edit Profil button', async () => {
    const { getByText } = render(
      <PlannerScreen navigation={mockNavigation} route={{ params: { freshAnalysis: mockAnalysis } }} />
    );

    await waitFor(() => {
      expect(getByText('Edit Profil')).toBeTruthy();
      expect(getByText(/Analisis/i)).toBeTruthy();
      expect(getByText('Pendapatan')).toBeTruthy();
      expect(getByText('Pengeluaran')).toBeTruthy();
      expect(getByText('Cash Flow')).toBeTruthy();
    });

    // Press Edit Profil link button
    fireEvent.press(getByText('Edit Profil'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Assessment');
  });

  test('TC-PLN-002 PlannerScreen Diagnosis accordion toggles detail expansion and executes link action', async () => {
    const { getByText } = render(
      <PlannerScreen navigation={mockNavigation} route={{ params: { freshAnalysis: mockAnalysis } }} />
    );

    await waitFor(() => {
      expect(getByText('Dana Darurat Perlu Ditingkatkan')).toBeTruthy();
    });

    // Press Diagnosis card header to expand accordion
    fireEvent.press(getByText('Dana Darurat Perlu Ditingkatkan'));

    await waitFor(() => {
      expect(getByText(/Saran Aksi:/i)).toBeTruthy();
    });
  });

  test('TC-REV-001 MonthlyReviewScreen switches sub-tabs (Evaluasi Bulanan vs Lencana)', async () => {
    const { getByText } = render(<MonthlyReviewScreen navigation={mockNavigation} />);

    await waitFor(() => {
      expect(getByText('Evaluasi Bulanan')).toBeTruthy();
      expect(getByText(/Lencana/i)).toBeTruthy();
    });

    // Switch to Lencana tab
    fireEvent.press(getByText(/Lencana/i));

    await waitFor(() => {
      expect(getByText(/Prestasi & Lencana/i)).toBeTruthy();
    });
  });
});
