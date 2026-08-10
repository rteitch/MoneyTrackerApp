/**
 * __tests__/utils/diagnosisEngine.test.js
 *
 * ISTQB Foundation Level Compliant Test Suite for Rule-Based Diagnosis Engine.
 *
 * Techniques Used:
 * - Decision Table Testing (Triggering diagnosis codes D01-D08 based on condition matrix)
 * - Boundary Value Analysis (Cash flow = 0 / <0, DTI = 0.30 / 0.43, Housing ratio thresholds)
 * - Priority & Severity Sorting Verification
 */

import { runDiagnosis, generateRecommendations } from '../../src/utils/diagnosisEngine';

describe('Diagnosis Engine — ISTQB Unit Test Suite', () => {

  const baseAnalysis = {
    income: 10000000,
    expense: 5000000,
    cashFlow: 5000000,
    savingsRate: 0.50,
    dti: 0,
    groups: { housing: 2000000, food: 1500000, debt: 0, lifestyle: 500000 },
    ratios: { housing: 0.20, lifestyle: 0.05 },
    emergencyMonths: 6,
    emergencyTarget: { recommended: 6 },
    liquidBalance: 30000000,
    goals: [{ id: 1, status: 'active' }],
  };

  test('TC-DE-001 [Positive Path] Should return empty/low diagnoses for healthy financial state', () => {
    const diagnoses = runDiagnosis(baseAnalysis);
    expect(diagnoses.length).toBe(0);
  });

  test('TC-DE-002 [D01 - Critical/High] Negative Cash Flow trigger and severity calculation', () => {
    const criticalAnalysis = {
      ...baseAnalysis,
      income: 10000000,
      cashFlow: -2000000, // Deficit = 2m (20% of income > 15% -> critical)
    };

    const diagnoses = runDiagnosis(criticalAnalysis);
    const d01 = diagnoses.find(d => d.id === 'D01');

    expect(d01).toBeDefined();
    expect(d01.severity).toBe('critical');
    expect(d01.impact).toBe(24000000); // 2m * 12
  });

  test('TC-DE-003 [D02 - Boundary] High Housing ratio triggers D02 with correct severity', () => {
    const highHousingAnalysis = {
      ...baseAnalysis,
      income: 10000000,
      groups: { housing: 4800000 },
      ratios: { housing: 0.48 }, // > 0.45 -> critical
    };

    const diagnoses = runDiagnosis(highHousingAnalysis);
    const d02 = diagnoses.find(d => d.id === 'D02');

    expect(d02).toBeDefined();
    expect(d02.severity).toBe('critical');
    expect(d02.impact).toBe(1800000); // 4.8m - 3m target (30%)
  });

  test('TC-DE-004 [D03 - Boundary] High DTI (> 0.30 & > 0.43)', () => {
    const highDtiAnalysis = {
      ...baseAnalysis,
      income: 10000000,
      dti: 0.45, // > 0.43 -> critical
    };

    const diagnoses = runDiagnosis(highDtiAnalysis);
    const d03 = diagnoses.find(d => d.id === 'D03');

    expect(d03).toBeDefined();
    expect(d03.severity).toBe('critical');
  });

  test('TC-DE-005 [D04 & D04B] No Emergency Fund vs Partial Emergency Fund', () => {
    // 0 emergency months -> D04 critical
    const noEmergencyAss = { ...baseAnalysis, emergencyMonths: 0, liquidBalance: 0 };
    const diagNoEmergency = runDiagnosis(noEmergencyAss);
    expect(diagNoEmergency.some(d => d.id === 'D04' && d.severity === 'critical')).toBe(true);

    // 3 emergency months out of 6 -> D04B medium
    const partialEmergencyAss = { ...baseAnalysis, emergencyMonths: 3 };
    const diagPartialEmergency = runDiagnosis(partialEmergencyAss);
    expect(diagPartialEmergency.some(d => d.id === 'D04B' && d.severity === 'medium')).toBe(true);
  });

  test('TC-DE-006 [D05] Low Savings Rate (< 10%)', () => {
    const lowSavingsAss = {
      ...baseAnalysis,
      income: 10000000,
      cashFlow: 300000,
      savingsRate: 0.03, // < 5% -> high
    };

    const diagnoses = runDiagnosis(lowSavingsAss);
    const d05 = diagnoses.find(d => d.id === 'D05');

    expect(d05).toBeDefined();
    expect(d05.severity).toBe('high');
  });

  test('TC-DE-007 [D06] High Lifestyle Spending (> 10%)', () => {
    const highLifestyleAss = {
      ...baseAnalysis,
      income: 10000000,
      groups: { lifestyle: 2800000 },
      ratios: { lifestyle: 0.28 }, // > 25% -> high
    };

    const diagnoses = runDiagnosis(highLifestyleAss);
    const d06 = diagnoses.find(d => d.id === 'D06');

    expect(d06).toBeDefined();
    expect(d06.severity).toBe('high');
  });

  test('TC-DE-008 [D07] No Financial Goals when surplus exists', () => {
    const noGoalsAss = {
      ...baseAnalysis,
      goals: [], // no active goals
    };

    const diagnoses = runDiagnosis(noGoalsAss);
    const d07 = diagnoses.find(d => d.id === 'D07');

    expect(d07).toBeDefined();
    expect(d07.severity).toBe('low');
  });

  test('TC-DE-009 [D08 - Critical Priority] Debt expense + Negative cashflow combo', () => {
    const debtComboAss = {
      ...baseAnalysis,
      cashFlow: -1000000,
      groups: { debt: 1500000 },
    };

    const diagnoses = runDiagnosis(debtComboAss);
    expect(diagnoses[0].id).toBe('D08'); // D08 should sort to top as highest priority critical
    expect(diagnoses[0].severity).toBe('critical');
  });

  test('TC-DE-010 generateRecommendations() should limit output to top 5 ranked items', () => {
    const mockDiagnoses = [
      { id: 'D08', title: 'D08 Title', severity: 'critical', impact: 12000000, actions: [{ label: 'Act 1' }] },
      { id: 'D01', title: 'D01 Title', severity: 'critical', impact: 6000000, actions: [] },
      { id: 'D03', title: 'D03 Title', severity: 'high', impact: 2000000, actions: [] },
      { id: 'D04', title: 'D04 Title', severity: 'high', impact: 1000000, actions: [] },
      { id: 'D05', title: 'D05 Title', severity: 'medium', impact: 500000, actions: [] },
      { id: 'D07', title: 'D07 Title', severity: 'low', impact: 0, actions: [] },
    ];

    const recs = generateRecommendations(mockDiagnoses, baseAnalysis);
    expect(recs.length).toBe(5);
    expect(recs[0].rank).toBe(1);
    expect(recs[0].diagnosisId).toBe('D08');
  });

});
