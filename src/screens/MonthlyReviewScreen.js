/**
 * src/screens/MonthlyReviewScreen.js
 *
 * Phase 6 — Monthly Evaluation & Gamification Achievements Screen.
 * Displays month-over-month comparison, assessment history, and achievement badges.
 */

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator, RefreshControl, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppContext } from '../context/AppContext';
import {
  getAssessmentHistory, getAchievements, getFinancialGoals,
  getSimulations, getLatestAssessment,
} from '../db/database';
import { ACHIEVEMENTS_LIST, checkAndUnlockAchievements } from '../utils/achievementEngine';
import { formatRupiah } from '../utils/formatting';
import { getHealthLevel } from '../constants/benchmarks';

const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export default function MonthlyReviewScreen({ navigation }) {
  const db = useSQLiteContext();
  const { colors } = useAppContext();
  const styles = makeStyles(colors);
  const insets = useSafeAreaInsets();

  const [history, setHistory]           = useState([]);
  const [unlocked, setUnlocked]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [selectedTab, setSelectedTab]   = useState('review'); // 'review' | 'achievements'

  const loadData = useCallback(async () => {
    try {
      const [hist, latestAss, goals, sims, achs] = await Promise.all([
        getAssessmentHistory(db, 6),
        getLatestAssessment(db),
        getFinancialGoals(db, 'all'),
        getSimulations(db),
        getAchievements(db),
      ]);

      setHistory(hist);
      setUnlocked(achs.map(a => a.key));

      // Run achievement check
      if (latestAss) {
        await checkAndUnlockAchievements(db, { analysis: latestAss, goals, simulations: sims });
        const refreshedAchs = await getAchievements(db);
        setUnlocked(refreshedAchs.map(a => a.key));
      }
    } catch (e) {
      console.error('MonthlyReviewScreen load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [db]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  if (loading) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: colors.bgPrimary }]}>
        <ActivityIndicator size="large" color={colors.brand} />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>Memuat laporan bulanan...</Text>
      </View>
    );
  }

  const currentMonthAss = history[0] || null;
  const prevMonthAss    = history[1] || null;

  const scoreDelta = currentMonthAss && prevMonthAss
    ? currentMonthAss.health_score - prevMonthAss.health_score
    : 0;

  const cashFlowDelta = currentMonthAss && prevMonthAss
    ? currentMonthAss.cash_flow - prevMonthAss.cash_flow
    : 0;

  const currentLevel = currentMonthAss ? getHealthLevel(currentMonthAss.health_score) : null;

  return (
    <View style={[styles.root, { backgroundColor: colors.bgPrimary }]}>
      {/* Sub Tabs */}
      <View style={[styles.subTabBar, { backgroundColor: colors.bgCard, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.subTabBtn, selectedTab === 'review' && { borderBottomColor: colors.brand, borderBottomWidth: 2.5 }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedTab('review'); }}
        >
          <Ionicons name="calendar-outline" size={16} color={selectedTab === 'review' ? colors.brand : colors.textMuted} />
          <Text style={[styles.subTabLabel, { color: selectedTab === 'review' ? colors.brand : colors.textMuted, fontWeight: selectedTab === 'review' ? '700' : '500' }]}>
            Evaluasi Bulanan
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subTabBtn, selectedTab === 'achievements' && { borderBottomColor: colors.brand, borderBottomWidth: 2.5 }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedTab('achievements'); }}
        >
          <Ionicons name="trophy-outline" size={16} color={selectedTab === 'achievements' ? colors.brand : colors.textMuted} />
          <Text style={[styles.subTabLabel, { color: selectedTab === 'achievements' ? colors.brand : colors.textMuted, fontWeight: selectedTab === 'achievements' ? '700' : '500' }]}>
            Lencana ({unlocked.length}/{ACHIEVEMENTS_LIST.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={colors.brand} />}
      >
        {selectedTab === 'review' ? (
          <ReviewTab
            current={currentMonthAss}
            prev={prevMonthAss}
            history={history}
            scoreDelta={scoreDelta}
            cashFlowDelta={cashFlowDelta}
            level={currentLevel}
            colors={colors}
            styles={styles}
            navigation={navigation}
          />
        ) : (
          <AchievementsTab
            unlocked={unlocked}
            colors={colors}
            styles={styles}
          />
        )}
      </ScrollView>
    </View>
  );
}

// ─── Review Tab ───────────────────────────────────────────────────────────────
function ReviewTab({ current, prev, history, scoreDelta, cashFlowDelta, level, colors, styles, navigation }) {
  if (!current) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyEmoji}>📊</Text>
        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Belum Ada Evaluasi Bulanan</Text>
        <Text style={[styles.emptySub, { color: colors.textMuted }]}>
          Lakukan analisis keuangan pertama Anda untuk mulai melihat evaluasi bulanan & perkembangan kesehatan finansial.
        </Text>
        <TouchableOpacity
          style={[styles.startBtn, { backgroundColor: colors.brand }]}
          onPress={() => navigation.navigate('Assessment')}
        >
          <Text style={styles.startBtnText}>Jalankan Analisis Sekarang</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ padding: 16 }}>
      {/* Month Header Banner */}
      <LinearGradient colors={[colors.brand + 'DD', colors.brand + '88']} style={styles.monthBanner}>
        <View>
          <Text style={styles.monthBannerSubtitle}>Evaluasi Bulan</Text>
          <Text style={styles.monthBannerTitle}>{MONTH_NAMES[current.period_month - 1]} {current.period_year}</Text>
        </View>
        <View style={styles.monthBannerBadge}>
          <Text style={styles.monthBannerScore}>{Math.round(current.health_score)}</Text>
          <Text style={styles.monthBannerMax}>/100</Text>
        </View>
      </LinearGradient>

      {/* Month-over-Month Delta Card */}
      {prev && (
        <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Text style={[styles.cardHeaderTitle, { color: colors.textPrimary }]}> Perubahan dari {MONTH_NAMES[prev.period_month - 1]}</Text>
          <View style={styles.deltaGrid}>
            <View style={styles.deltaItem}>
              <Text style={[styles.deltaVal, { color: scoreDelta >= 0 ? colors.income : colors.expense }]}>
                {scoreDelta >= 0 ? `+${scoreDelta}` : scoreDelta} Poin
              </Text>
              <Text style={[styles.deltaLabel, { color: colors.textMuted }]}>Health Score</Text>
            </View>

            <View style={[styles.deltaDivider, { backgroundColor: colors.border }]} />

            <View style={styles.deltaItem}>
              <Text style={[styles.deltaVal, { color: cashFlowDelta >= 0 ? colors.income : colors.expense }]}>
                {cashFlowDelta >= 0 ? '+' : ''}{formatRupiah(cashFlowDelta)}
              </Text>
              <Text style={[styles.deltaLabel, { color: colors.textMuted }]}>Selisih Arus Kas</Text>
            </View>
          </View>
        </View>
      )}

      {/* Financial Health Summary Cards */}
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}> Ringkasan Kinerja Bulan Ini</Text>
      <View style={styles.summaryGrid}>
        <View style={[styles.summaryBox, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Ionicons name="arrow-up-circle-outline" size={20} color={colors.income} />
          <Text style={[styles.summaryBoxVal, { color: colors.income }]}>{formatRupiah(current.total_income)}</Text>
          <Text style={[styles.summaryBoxLabel, { color: colors.textMuted }]}>Total Pendapatan</Text>
        </View>

        <View style={[styles.summaryBox, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Ionicons name="arrow-down-circle-outline" size={20} color={colors.expense} />
          <Text style={[styles.summaryBoxVal, { color: colors.expense }]}>{formatRupiah(current.total_expense)}</Text>
          <Text style={[styles.summaryBoxLabel, { color: colors.textMuted }]}>Total Pengeluaran</Text>
        </View>

        <View style={[styles.summaryBox, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Ionicons name="wallet-outline" size={20} color={current.cash_flow >= 0 ? colors.income : colors.expense} />
          <Text style={[styles.summaryBoxVal, { color: current.cash_flow >= 0 ? colors.income : colors.expense }]}>
            {(current.cash_flow >= 0 ? '+' : '') + formatRupiah(current.cash_flow)}
          </Text>
          <Text style={[styles.summaryBoxLabel, { color: colors.textMuted }]}>Arus Kas Bersih</Text>
        </View>

        <View style={[styles.summaryBox, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Ionicons name="pie-chart-outline" size={20} color={colors.brand} />
          <Text style={[styles.summaryBoxVal, { color: colors.brand }]}>{(current.savings_rate * 100).toFixed(1)}%</Text>
          <Text style={[styles.summaryBoxLabel, { color: colors.textMuted }]}>Tingkat Tabungan</Text>
        </View>
      </View>

      {/* Assessment History Trend */}
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}> Histori Skor Keuangan</Text>
      <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        {history.map((h, i) => {
          const lvl = getHealthLevel(h.health_score);
          return (
            <View key={`${h.period_year}-${h.period_month}`} style={[styles.histRow, i < history.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.histMonth, { color: colors.textPrimary }]}>
                  {MONTH_NAMES[h.period_month - 1]} {h.period_year}
                </Text>
                <Text style={[styles.histSub, { color: colors.textMuted }]}>
                  Cash flow: {formatRupiah(h.cash_flow)}
                </Text>
              </View>
              <View style={[styles.histBadge, { backgroundColor: lvl.color + '20' }]}>
                <Text style={[styles.histScore, { color: lvl.color }]}>{Math.round(h.health_score)} pts</Text>
                <Text style={[styles.histLevel, { color: lvl.color }]}>{lvl.label}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── Achievements Tab ─────────────────────────────────────────────────────────
function AchievementsTab({ unlocked, colors, styles }) {
  const unlockedSet = new Set(unlocked);

  return (
    <View style={{ padding: 16 }}>
      <View style={[styles.bannerCard, { backgroundColor: colors.brandBg, borderColor: colors.brand + '40' }]}>
        <Text style={styles.bannerEmoji}>🏆</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.bannerTitle, { color: colors.brand }]}>Lencana Prestasi Keuangan</Text>
          <Text style={[styles.bannerSub, { color: colors.textSecondary }]}>
            Kumpulkan lencana dengan mengelola keuangan secara bijak. Semua pencapaian dihitung otomatis!
          </Text>
        </View>
      </View>

      <View style={styles.badgeGrid}>
        {ACHIEVEMENTS_LIST.map((ach) => {
          const isUnlocked = unlockedSet.has(ach.key);
          return (
            <View
              key={ach.key}
              style={[
                styles.badgeCard,
                { backgroundColor: colors.bgCard, borderColor: isUnlocked ? colors.brand : colors.border },
                !isUnlocked && { opacity: 0.5 },
              ]}
            >
              <View style={[styles.badgeIconBox, { backgroundColor: isUnlocked ? colors.brandBg : colors.bgElevated }]}>
                <Text style={styles.badgeEmoji}>{isUnlocked ? ach.emoji : '🔒'}</Text>
              </View>
              <Text style={[styles.badgeTitle, { color: isUnlocked ? colors.textPrimary : colors.textMuted }]} numberOfLines={1}>
                {ach.title}
              </Text>
              <Text style={[styles.badgeDesc, { color: colors.textMuted }]} numberOfLines={2}>
                {ach.desc}
              </Text>
              <View style={[styles.statusTag, { backgroundColor: isUnlocked ? colors.incomeBg : colors.bgElevated }]}>
                <Text style={[styles.statusTagText, { color: isUnlocked ? colors.income : colors.textFaint }]}>
                  {isUnlocked ? 'Tercapai 🎉' : 'Terkunci'}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 14 },

  subTabBar: { flexDirection: 'row', borderBottomWidth: 1 },
  subTabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14 },
  subTabLabel: { fontSize: 13 },

  emptyWrap: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 52, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  startBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
  startBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  monthBanner: {
    borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center',
    justify: 'space-between', marginBottom: 16, elevation: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6,
  },
  monthBannerSubtitle: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase' },
  monthBannerTitle: { fontSize: 20, fontWeight: '900', color: '#fff', marginTop: 2 },
  monthBannerBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  monthBannerScore: { fontSize: 22, fontWeight: '900', color: '#fff' },
  monthBannerMax: { fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.75)' },

  card: { borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 16 },
  cardHeaderTitle: { fontSize: 13, fontWeight: '700', marginBottom: 12 },

  deltaGrid: { flexDirection: 'row', alignItems: 'center' },
  deltaItem: { flex: 1, alignItems: 'center' },
  deltaVal: { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  deltaLabel: { fontSize: 11, fontWeight: '600' },
  deltaDivider: { width: 1, height: 30 },

  sectionTitle: { fontSize: 14, fontWeight: '800', marginBottom: 10, marginTop: 4, letterSpacing: 0.3 },

  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  summaryBox: { width: '48%', borderRadius: 14, padding: 12, borderWidth: 1, gap: 4 },
  summaryBoxVal: { fontSize: 14, fontWeight: '800' },
  summaryBoxLabel: { fontSize: 10, fontWeight: '600' },

  histRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  histMonth: { fontSize: 13, fontWeight: '700' },
  histSub: { fontSize: 11, marginTop: 2 },
  histBadge: { alignItems: 'flex-end', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  histScore: { fontSize: 12, fontWeight: '800' },
  histLevel: { fontSize: 9, fontWeight: '700' },

  bannerCard: { flexDirection: 'row', gap: 12, padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 16, alignItems: 'center' },
  bannerEmoji: { fontSize: 32 },
  bannerTitle: { fontSize: 14, fontWeight: '800', marginBottom: 4 },
  bannerSub: { fontSize: 11, lineHeight: 16 },

  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badgeCard: { width: '48%', borderRadius: 16, padding: 12, borderWidth: 1, alignItems: 'center' },
  badgeIconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  badgeEmoji: { fontSize: 22 },
  badgeTitle: { fontSize: 12, fontWeight: '700', marginBottom: 2, textAlign: 'center' },
  badgeDesc: { fontSize: 10, textAlign: 'center', lineHeight: 14, marginBottom: 8 },
  statusTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  statusTagText: { fontSize: 9, fontWeight: '700' },
});
