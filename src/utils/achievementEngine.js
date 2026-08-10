/**
 * src/utils/achievementEngine.js
 *
 * Phase 6 — Gamification & Achievement System.
 * Pure logic — evaluates local SQLite data against financial milestones.
 */

import { getAchievements, unlockAchievement } from '../db/database';

export const ACHIEVEMENTS_LIST = [
  {
    key: 'first_profile',
    title: 'Langkah Pertama',
    desc: 'Melengkapi profil & analisis keuangan pertama',
    emoji: '🚀',
    category: 'onboarding',
  },
  {
    key: 'score_60',
    title: 'Keuangan Sehat',
    desc: 'Mencapai Financial Health Score ≥ 60',
    emoji: '🟡',
    category: 'score',
  },
  {
    key: 'score_80',
    title: 'Sangat Sehat!',
    desc: 'Mencapai Financial Health Score ≥ 80',
    emoji: '💪',
    category: 'score',
  },
  {
    key: 'emergency_starter',
    title: 'Perisai Pertama',
    desc: 'Memiliki dana darurat minimal 1 bulan pengeluaran',
    emoji: '🛡️',
    category: 'savings',
  },
  {
    key: 'emergency_hero',
    title: 'Benteng Finansial',
    desc: 'Memiliki dana darurat aman ≥ 6 bulan pengeluaran',
    emoji: '🏰',
    category: 'savings',
  },
  {
    key: 'first_goal',
    title: 'Pemimpi Finansial',
    desc: 'Membuat target keuangan pertama',
    emoji: '🎯',
    category: 'goals',
  },
  {
    key: 'goal_completed',
    title: 'Pencapai Target',
    desc: 'Berhasil menyelesaikan 1 target finansial',
    emoji: '🎉',
    category: 'goals',
  },
  {
    key: 'first_simulation',
    title: 'Ahli Strategi',
    desc: 'Mencoba & menyimpan simulasi keuangan',
    emoji: '💡',
    category: 'simulator',
  },
  {
    key: 'zero_debt',
    title: 'Bebas Cicilan',
    desc: 'Rasio cicilan (DTI) 0%',
    emoji: '🕊️',
    category: 'debt',
  },
  {
    key: 'savings_master',
    title: 'Raja Menabung',
    desc: 'Tingkat tabungan (savings rate) ≥ 30%',
    emoji: '👑',
    category: 'savings',
  },
];

/**
 * Check and unlock achievements based on latest state.
 * Returns array of newly unlocked achievements.
 */
export async function checkAndUnlockAchievements(db, { analysis, goals = [], simulations = [] }) {
  const existing = await getAchievements(db);
  const unlockedKeys = new Set(existing.map(a => a.key));
  const newlyUnlocked = [];

  const check = async (key, condition) => {
    if (!unlockedKeys.has(key) && condition) {
      await unlockAchievement(db, key);
      const item = ACHIEVEMENTS_LIST.find(a => a.key === key);
      if (item) newlyUnlocked.push(item);
    }
  };

  if (analysis) {
    await check('first_profile', true);
    await check('score_60', (analysis.healthScore || 0) >= 60);
    await check('score_80', (analysis.healthScore || 0) >= 80);
    await check('emergency_starter', (analysis.emergencyMonths || 0) >= 1);
    await check('emergency_hero', (analysis.emergencyMonths || 0) >= 6);
    await check('zero_debt', (analysis.dti || 0) === 0);
    await check('savings_master', (analysis.savingsRate || 0) >= 0.30);
  }

  if (goals.length > 0) {
    await check('first_goal', true);
    await check('goal_completed', goals.some(g => g.status === 'completed'));
  }

  if (simulations.length > 0) {
    await check('first_simulation', true);
  }

  return newlyUnlocked;
}
