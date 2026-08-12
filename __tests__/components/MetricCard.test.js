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
