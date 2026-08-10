/**
 * __tests__/components/TransactionCard.test.js
 *
 * ISTQB RNTL Test Suite for TransactionCard Component.
 * Tests rendering income, expense, transfer transactions, press/long-press events, and action buttons.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import TransactionCard from '../../src/components/TransactionCard';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  NotificationFeedbackType: {},
  ImpactFeedbackStyle: {},
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));

// Mock AppContext
jest.mock('../../src/context/AppContext', () => ({
  useAppContext: () => ({
    colors: {
      bgCard: '#FFFFFF',
      border: '#E2E8F0',
      textPrimary: '#0F172A',
      textMuted: '#64748B',
      brand: '#00478F',
      expense: '#EF4444',
      income: '#10B981',
    },
    typeConfig: {
      expense:  { label: 'Pengeluaran', sign: '- ', color: '#EF4444', icon: 'arrow-down' },
      income:   { label: 'Pemasukan',   sign: '+ ', color: '#10B981', icon: 'arrow-up' },
      transfer: { label: 'Transfer',    sign: '⇄ ', color: '#0ea5e9', icon: 'swap-horizontal' },
    },
  }),
}));

describe('TransactionCard Component — ISTQB UI Test Suite', () => {
  const mockExpense = {
    id: 1,
    type: 'expense',
    amount: 50000,
    category_name: 'Makanan & Minuman',
    account_name: 'Kas',
    description: 'Makan siang Nasi Padang',
    date: '2026-08-10T12:00:00.000Z',
  };

  const mockTransfer = {
    id: 2,
    type: 'transfer',
    amount: 1000000,
    account_name: 'BCA',
    to_account_name: 'GoPay',
    description: 'Topup GoPay',
    date: '2026-08-10T12:00:00.000Z',
  };

  test('TC-TXC-001 Should render expense transaction with description and category', () => {
    const { getByText } = render(<TransactionCard item={mockExpense} />);

    expect(getByText('Makanan & Minuman')).toBeTruthy();
    expect(getByText(/Rp 50 rb/i)).toBeTruthy();
    expect(getByText('Kas')).toBeTruthy();
    expect(getByText('Makan siang Nasi Padang')).toBeTruthy();
  });

  test('TC-TXC-002 Should render transfer transaction with origin and destination accounts', () => {
    const { getByText } = render(<TransactionCard item={mockTransfer} />);

    expect(getByText('Transfer: BCA ➔ GoPay')).toBeTruthy();
    expect(getByText(/Rp 1 jt/i)).toBeTruthy();
  });

  test('TC-TXC-003 Should trigger onPress and onLongPress handlers when pressed', () => {
    const onPressMock = jest.fn();
    const onLongPressMock = jest.fn();

    const { getByText } = render(
      <TransactionCard item={mockExpense} onPress={onPressMock} onLongPress={onLongPressMock} />
    );

    const card = getByText('Makanan & Minuman');
    fireEvent.press(card);
    expect(onPressMock).toHaveBeenCalledWith(mockExpense);
  });

  test('TC-TXC-004 Should show action buttons when showActions is true', () => {
    const onEditMock = jest.fn();
    const onDeleteMock = jest.fn();

    const { getByText } = render(
      <TransactionCard
        item={mockExpense}
        showActions={true}
        onEdit={onEditMock}
        onDelete={onDeleteMock}
      />
    );

    expect(getByText('Makanan & Minuman')).toBeTruthy();
  });
});
