/**
 * __tests__/utils/achievementEngine.test.js
 *
 * ISTQB Foundation Level Compliant Test Suite for Achievement Engine.
 * Uses Dependency Mocking for DB calls.
 */

import { checkAndUnlockAchievements, ACHIEVEMENTS_LIST } from '../../src/utils/achievementEngine';
import * as dbModule from '../../src/db/database';

jest.mock('../../src/db/database', () => ({
  getAchievements: jest.fn(),
  unlockAchievement: jest.fn(),
}));

describe('Achievement Engine — ISTQB Unit Test Suite', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('TC-AE-001 [Positive Path] Should unlock onboarding & health score achievements for high score', async () => {
    dbModule.getAchievements.mockResolvedValue([]); // No achievements unlocked yet
    dbModule.unlockAchievement.mockResolvedValue();

    const analysis = {
      healthScore: 85,
      emergencyMonths: 6,
      dti: 0,
      savingsRate: 0.35,
    };
    const goals = [{ id: 1, status: 'completed' }];
    const simulations = [{ id: 1 }];

    const newlyUnlocked = await checkAndUnlockAchievements(null, { analysis, goals, simulations });

    expect(dbModule.unlockAchievement).toHaveBeenCalledWith(null, 'first_profile');
    expect(dbModule.unlockAchievement).toHaveBeenCalledWith(null, 'score_60');
    expect(dbModule.unlockAchievement).toHaveBeenCalledWith(null, 'score_80');
    expect(dbModule.unlockAchievement).toHaveBeenCalledWith(null, 'emergency_starter');
    expect(dbModule.unlockAchievement).toHaveBeenCalledWith(null, 'emergency_hero');
    expect(dbModule.unlockAchievement).toHaveBeenCalledWith(null, 'zero_debt');
    expect(dbModule.unlockAchievement).toHaveBeenCalledWith(null, 'savings_master');
    expect(dbModule.unlockAchievement).toHaveBeenCalledWith(null, 'first_goal');
    expect(dbModule.unlockAchievement).toHaveBeenCalledWith(null, 'goal_completed');
    expect(dbModule.unlockAchievement).toHaveBeenCalledWith(null, 'first_simulation');

    expect(newlyUnlocked.length).toBe(10);
  });

  test('TC-AE-002 [Idempotency] Should NOT re-unlock achievements that are already unlocked', async () => {
    dbModule.getAchievements.mockResolvedValue([
      { key: 'first_profile' },
      { key: 'score_60' },
    ]);
    dbModule.unlockAchievement.mockResolvedValue();

    const analysis = {
      healthScore: 65,
      emergencyMonths: 0,
      dti: 0.10,
      savingsRate: 0.15,
    };

    const newlyUnlocked = await checkAndUnlockAchievements(null, { analysis, goals: [], simulations: [] });

    expect(dbModule.unlockAchievement).not.toHaveBeenCalledWith(null, 'first_profile');
    expect(dbModule.unlockAchievement).not.toHaveBeenCalledWith(null, 'score_60');
    expect(newlyUnlocked.some(a => a.key === 'first_profile')).toBe(false);
  });

  test('TC-AE-003 [Boundary/Negative] Should NOT unlock high tier achievements when conditions are not met', async () => {
    dbModule.getAchievements.mockResolvedValue([]);
    dbModule.unlockAchievement.mockResolvedValue();

    const analysis = {
      healthScore: 40,
      emergencyMonths: 0.5,
      dti: 0.35,
      savingsRate: 0.05,
    };

    const newlyUnlocked = await checkAndUnlockAchievements(null, { analysis, goals: [], simulations: [] });

    expect(dbModule.unlockAchievement).toHaveBeenCalledWith(null, 'first_profile');
    expect(dbModule.unlockAchievement).not.toHaveBeenCalledWith(null, 'score_60');
    expect(dbModule.unlockAchievement).not.toHaveBeenCalledWith(null, 'score_80');
    expect(dbModule.unlockAchievement).not.toHaveBeenCalledWith(null, 'zero_debt');
    expect(dbModule.unlockAchievement).not.toHaveBeenCalledWith(null, 'savings_master');

    expect(newlyUnlocked.some(a => a.key === 'score_80')).toBe(false);
  });

});
