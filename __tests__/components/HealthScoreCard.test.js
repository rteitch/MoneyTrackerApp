/**
 * __tests__/components/HealthScoreCard.test.js
 *
 * ISTQB RNTL Test Suite for HealthScoreCard Component.
 * Tests empty state CTA, full gradient card, compact card mode, and press interaction.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import HealthScoreCard from '../../src/components/HealthScoreCard';

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

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

// Mock AppContext
jest.mock('../../src/context/AppContext', () => ({
  useAppContext: () => ({
    colors: {
      brand: '#0ea5e9',
      brandBg: '#0ea5e915',
      textPrimary: '#0F172A',
      textMuted: '#64748B',
      bgCard: '#FFFFFF',
      bgElevated: '#F1F5F9',
    },
  }),
}));

describe('HealthScoreCard Component — ISTQB UI Test Suite', () => {

  const mockAnalysis = {
    healthScore: 82,
    level: { label: 'Sangat Sehat', color: '#0ea5e9', emoji: '💪' },
    scores: {
      cashFlow: 20,
      debt: 18,
      emergencyFund: 15,
      savingsRate: 16,
      housing: 8,
    },
    diagnoses: [{ id: 'D01', title: 'Cash flow' }],
  };

  test('TC-HSC-001 Should render Empty State CTA when analysis is null', () => {
    const onPressMock = jest.fn();
    const { getByText } = render(
      <HealthScoreCard analysis={null} onPressSeeDetail={onPressMock} />
    );

    expect(getByText('Financial Planner')).toBeTruthy();
    expect(getByText('Mulai Sekarang →')).toBeTruthy();

    fireEvent.press(getByText('Mulai Sekarang →'));
    expect(onPressMock).toHaveBeenCalled();
  });

  test('TC-HSC-002 Should render Full HealthScoreCard with scores breakdown', () => {
    const { getByText } = render(
      <HealthScoreCard analysis={mockAnalysis} />
    );

    expect(getByText('Financial Health Score')).toBeTruthy();
    expect(getByText(/Sangat Sehat/i)).toBeTruthy();
    expect(getByText('Arus Kas')).toBeTruthy();
    expect(getByText('Hutang')).toBeTruthy();
    expect(getByText('Darurat')).toBeTruthy();
    expect(getByText('Tabungan')).toBeTruthy();
    expect(getByText('Hunian')).toBeTruthy();
    expect(getByText(/1 masalah terdeteksi/i)).toBeTruthy();
  });

  test('TC-HSC-003 Should render Compact HealthScoreCard layout', () => {
    const onPressMock = jest.fn();
    const { getByText } = render(
      <HealthScoreCard analysis={mockAnalysis} compact={true} onPressSeeDetail={onPressMock} />
    );

    expect(getByText('Financial Health')).toBeTruthy();
    expect(getByText(/Sangat Sehat/i)).toBeTruthy();

    fireEvent.press(getByText('Financial Health'));
    expect(onPressMock).toHaveBeenCalled();
  });
});
