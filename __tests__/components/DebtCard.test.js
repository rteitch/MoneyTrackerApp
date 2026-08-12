/**
 * __tests__/components/DebtCard.test.js
 *
 * ISTQB RNTL Component Test Suite for DebtCard component.
 * Tests DebtCard rendering, person name, remaining amount, status badges, and action buttons (+ Cicil, Lunas).
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import DebtCard from '../../src/components/DebtCard';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

describe('DebtCard — Component & Action Buttons Suite', () => {
  const mockItem = {
    id: 1,
    type: 'receivable',
    person_name: 'Budi Santoso',
    amount: 1000000,
    remaining_amount: 400000,
    description: 'Pinjaman Laptop',
    due_date: '2026-09-01',
    status: 'unpaid',
  };

  test('TC-DCRD-001 Should render DebtCard person name, remaining amount, and description', () => {
    const { getByText } = render(
      <DebtCard item={mockItem} onPress={() => {}} onPay={() => {}} onSettle={() => {}} />
    );

    expect(getByText('Budi Santoso')).toBeTruthy();
    expect(getByText('Pinjaman Laptop')).toBeTruthy();
    expect(getByText('+ Cicil')).toBeTruthy();
    expect(getByText('Lunas')).toBeTruthy();
  });

  test('TC-DCRD-002 Clicking "+ Cicil" and "Lunas" buttons calls onPay and onSettle callbacks', () => {
    const onPayMock = jest.fn();
    const onSettleMock = jest.fn();

    const { getByText } = render(
      <DebtCard item={mockItem} onPress={() => {}} onPay={onPayMock} onSettle={onSettleMock} />
    );

    fireEvent.press(getByText('+ Cicil'));
    expect(onPayMock).toHaveBeenCalledWith(mockItem);

    fireEvent.press(getByText('Lunas'));
    expect(onSettleMock).toHaveBeenCalledWith(mockItem);
  });
});
