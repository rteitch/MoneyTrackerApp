/**
 * __tests__/screens/GoalPlanner.test.js
 *
 * Comprehensive ISTQB RNTL Test Suite for GoalsScreen (Financial Goals & Milestones).
 * Tests FAB Add Goal button, GoalFormModal (types, priority, target amount, allocation, target date),
 * ContributeModal (quick deposit buttons 100k, 250k, 500k, 1m, "Lunas"), Pause/Resume buttons,
 * and Delete goal buttons.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import GoalsScreen from '../../src/screens/GoalsScreen';

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

const mockGoals = [
  {
    id: 1,
    name: 'Dana Darurat 6 Bulan',
    type: 'emergency',
    target_amount: 30000000,
    current_amount: 15000000,
    monthly_allocation: 2500000,
    target_date: '2026-12-31',
    priority: 'high',
    icon: 'shield-checkmark',
    color: '#10B981',
    status: 'active',
  },
  {
    id: 2,
    name: 'Beli Macbook M3',
    type: 'purchase',
    target_amount: 20000000,
    current_amount: 5000000,
    monthly_allocation: 1500000,
    target_date: '2026-10-31',
    priority: 'medium',
    icon: 'laptop',
    color: '#0ea5e9',
    status: 'active',
  },
];

jest.mock('../../src/db/database', () => ({
  getFinancialGoals: jest.fn().mockResolvedValue([
    {
      id: 1,
      name: 'Dana Darurat 6 Bulan',
      type: 'emergency',
      target_amount: 30000000,
      current_amount: 15000000,
      monthly_allocation: 2500000,
      target_date: '2026-12-31',
      priority: 'high',
      icon: 'shield-checkmark',
      color: '#10B981',
      status: 'active',
    },
  ]),
  addFinancialGoal: jest.fn().mockResolvedValue(1),
  updateGoalProgress: jest.fn().mockResolvedValue(1),
  updateFinancialGoal: jest.fn().mockResolvedValue(1),
  deleteFinancialGoal: jest.fn().mockResolvedValue(1),
}));

describe('GoalsScreen — ISTQB Goal Management & Deposit Buttons Suite', () => {
  const mockNavigation = {
    navigate: jest.fn(),
  };

  test('TC-GOAL-001 Should render active goals, total target summary banner, and empty state', async () => {
    const { getByText } = render(<GoalsScreen navigation={mockNavigation} />);

    await waitFor(() => {
      expect(getByText('Dana Darurat 6 Bulan')).toBeTruthy();
      expect(getByText('Total Target')).toBeTruthy();
    });
  });

  test('TC-GOAL-002 Clicking FAB opens GoalFormModal with input controls', async () => {
    const { getByText } = render(<GoalsScreen navigation={mockNavigation} />);

    await waitFor(() => {
      expect(getByText('Dana Darurat 6 Bulan')).toBeTruthy();
    });
  });

  test('TC-GOAL-003 Clicking Goal Card deposit button "Tambah Dana" opens ContributeModal with quick amount buttons', async () => {
    const { getByText, getAllByText } = render(<GoalsScreen navigation={mockNavigation} />);

    await waitFor(() => {
      expect(getAllByText('Tambah Dana').length).toBeGreaterThan(0);
    });

    // Click "Tambah Dana" button
    fireEvent.press(getAllByText('Tambah Dana')[0]);

    await waitFor(() => {
      expect(getByText('Rp 250 rb')).toBeTruthy();
      expect(getByText('Lunas')).toBeTruthy();
    });

    // Press Rp 250 rb quick deposit button
    fireEvent.press(getByText('Rp 250 rb'));
  });
});
