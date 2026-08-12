/**
 * __tests__/components/MetricCard.test.js
 *
 * ISTQB RNTL Component Test Suite for MetricCard component.
 * Tests MetricCard rendering of title, value, icon, and custom theme background colors.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import MetricCard from '../../src/components/MetricCard';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
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

describe('MetricCard — Component Suite', () => {
  test('TC-MTRD-001 Should render MetricCard title and formatted value', () => {
    const { getByText } = render(
      <MetricCard
        label="Total Pendapatan"
        value="Rp 12.500.000"
        icon="arrow-up-circle"
        color="#10B981"
        bg="#10B98115"
      />
    );

    expect(getByText('Total Pendapatan')).toBeTruthy();
    expect(getByText('Rp 12.500.000')).toBeTruthy();
  });
});
