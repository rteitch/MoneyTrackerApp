/**
 * __tests__/components/BudgetProgressBar.test.js
 *
 * ISTQB Foundation Level UI & State Transition Test Suite for BudgetProgressBar Component.
 * Stack: Jest + @testing-library/react-native
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import BudgetProgressBar from '../../src/components/BudgetProgressBar';

// Mock AppContext
jest.mock('../../src/context/AppContext', () => ({
  useAppContext: () => ({
    colors: {
      income: '#10B981',
      expense: '#EF4444',
      warning: '#F59E0B',
      textPrimary: '#1E293B',
      textMuted: '#64748B',
      bgElevated: '#F1F5F9',
      expenseBg: '#FEE2E2',
    },
  }),
}));

describe('BudgetProgressBar Component — ISTQB UI & State Transition Test Suite', () => {

  test('TC-UI-001 [State Transition: Under Budget (<70%)] Should render green progress bar and under budget status', () => {
    const { getByText, queryByText } = render(
      <BudgetProgressBar category_name="Makanan & Minuman" monthly_limit={5000000} spent={2000000} />
    );

    expect(getByText('Makanan & Minuman')).toBeTruthy();
    expect(getByText('40%')).toBeTruthy();
    expect(getByText(/Rp 2 jt/i)).toBeTruthy();
    expect(getByText(/Rp 5 jt/i)).toBeTruthy();
    expect(queryByText(/Melebihi anggaran/i)).toBeNull();
  });

  test('TC-UI-002 [State Transition: Near Limit (70% - 89%)] Should render warning status', () => {
    const { getByText } = render(
      <BudgetProgressBar category_name="Transportasi" monthly_limit={1000000} spent={750000} />
    );

    expect(getByText('75%')).toBeTruthy();
  });

  test('TC-UI-003 [State Transition: Near Over (90% - 99%)] Should render expense alert color', () => {
    const { getByText } = render(
      <BudgetProgressBar category_name="Gaya Hidup" monthly_limit={1000000} spent={950000} />
    );

    expect(getByText('95%')).toBeTruthy();
  });

  test('TC-UI-004 [State Transition: Over Budget (>=100%)] Should render warning box with excess calculation', () => {
    const { getByText } = render(
      <BudgetProgressBar category_name="Belanja" monthly_limit={2000000} spent={2500000} />
    );

    expect(getByText('125%')).toBeTruthy();
    expect(getByText(/Rp 500 rb/i)).toBeTruthy();
  });

  test('TC-UI-005 [Compact Mode] Should render compact row layout correctly', () => {
    const { getByText, getAllByText } = render(
      <BudgetProgressBar category_name="Kos" monthly_limit={1500000} spent={1500000} compact={true} />
    );

    expect(getByText('Kos')).toBeTruthy();
    expect(getByText('Over!')).toBeTruthy();
    expect(getAllByText(/Rp 1,5 jt/i).length).toBeGreaterThan(0);
  });

  test('TC-UI-006 [Boundary: Zero Limit] Should handle monthly_limit = 0 gracefully without NaN percentage', () => {
    const { getByText } = render(
      <BudgetProgressBar category_name="Lainnya" monthly_limit={0} spent={100000} />
    );

    expect(getByText('0%')).toBeTruthy();
  });

});
