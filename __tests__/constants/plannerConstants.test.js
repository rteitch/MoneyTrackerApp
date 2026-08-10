/**
 * __tests__/constants/plannerConstants.test.js
 *
 * Unit tests for constants and mapping helpers (benchmarks.js & categoryMap.js)
 */

import { getHealthLevel, EXPENSE_BENCHMARKS, HEALTH_LEVELS } from '../../src/constants/benchmarks';
import { getAnalysisGroup, CATEGORY_GROUP_MAP, SUBCATEGORY_GROUP_MAP } from '../../src/constants/categoryMap';

describe('Planner Constants & Mapping — Unit Test Suite', () => {

  describe('benchmarks.js', () => {
    test('getHealthLevel() maps score ranges correctly', () => {
      expect(getHealthLevel(90).key).toBe('strong');
      expect(getHealthLevel(70).key).toBe('healthy');
      expect(getHealthLevel(50).key).toBe('needs_work');
      expect(getHealthLevel(30).key).toBe('at_risk');
      expect(getHealthLevel(10).key).toBe('critical');
      expect(getHealthLevel(-5).key).toBe('critical'); // Fallback to critical for negative/overflow score
    });

    test('EXPENSE_BENCHMARKS contains mandatory financial groups', () => {
      expect(EXPENSE_BENCHMARKS.housing).toBeDefined();
      expect(EXPENSE_BENCHMARKS.food).toBeDefined();
      expect(EXPENSE_BENCHMARKS.debt).toBeDefined();
    });
  });

  describe('categoryMap.js', () => {
    test('getAnalysisGroup() maps categories and subcategories correctly', () => {
      // Subcategory specific override
      expect(getAnalysisGroup('Kebutuhan Pokok (Tetap)', 'Sewa rumah / kos')).toBe('housing');
      expect(getAnalysisGroup('Kebutuhan Pokok (Tetap)', 'Bensin / BBM')).toBe('transportation');
      expect(getAnalysisGroup('Kebutuhan Pokok (Tetap)', 'Cicilan Kendaraan')).toBe('debt');

      // Category level mapping
      expect(getAnalysisGroup('Makanan & Minuman')).toBe('food');
      expect(getAnalysisGroup('Kewajiban Keuangan')).toBe('debt');
      expect(getAnalysisGroup('Tabungan & Investasi')).toBe('savings');

      // Unknown category fallback
      expect(getAnalysisGroup('Unknown Category 123')).toBe('other');
    });
  });

});
