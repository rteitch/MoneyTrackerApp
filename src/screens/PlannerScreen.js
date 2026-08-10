/**
 * src/screens/PlannerScreen.js
 *
 * Financial Planner main screen.
 * Shows: Health Score, Diagnosis list, Recommendations, and cash flow summary.
 * All data from SQLite + formula engine. No AI.
 */

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator, RefreshControl, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import HealthScoreCard from '../components/HealthScoreCard';
import { useAppContext } from '../context/AppContext';
import {
  getFinancialProfile, getFixedExpenses, getFinancialGoals,
  getMonthlyTransactionSummary, getTotalLiquidBalance,
  getLatestAssessment, saveFinancialAssessment, getAssessmentHistory,
} from '../db/database';
import { runFinancialAnalysis } from '../utils/financialEngine';
import { runDiagnosis, generateRecommendations } from '../utils/diagnosisEngine';
import { formatRupiah } from '../utils/formatting';
import { getHealthLevel } from '../constants/benchmarks';
import { ANALYSIS_GROUPS } from '../constants/categoryMap';

const SEVERITY_CONFIG = {
  critical: { color: '#EF4444', bg: '#EF444410', label: 'Kritis',       icon: 'alert-circle' },
  high:     { color: '#f97316', bg: '#f9731610', label: 'Tinggi',       icon: 'warning' },
  medium:   { color: '#f59e0b', bg: '#f59e0b10', label: 'Sedang',      icon: 'information-circle' },
  low:      { color: '#10B981', bg: '#10B98110', label: 'Rendah',       icon: 'checkmark-circle' },
};

export default function PlannerScreen({ navigation, route }) {
  const db = useSQLiteContext();
  const { colors } = useAppContext();
  const styles = makeStyles(colors);

  const [analysis, setAnalysis] = useState(route.params?.freshAnalysis || null);
  const [diagnoses, setDiagnoses] = useState(route.params?.freshAnalysis?.diagnoses || []);
  const [history, setHistory] = useState([]);
  const [hasProfile, setHasProfile] = useState(null); // null = unknown
  const [loading, setLoading] = useState(!route.params?.freshAnalysis);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState({});

  const loadData = useCallback(async () => {
    try {
      const profile = await getFinancialProfile(db);
      setHasProfile(!!profile);

      if (!profile) { setLoading(false); return; }

      const now = new Date();
      const month = now.getMonth() + 1;
      const year  = now.getFullYear();

      const [txData, liquidBalance, goals, fixedExpenses, hist] = await Promise.all([
        getMonthlyTransactionSummary(db, month, year),
        getTotalLiquidBalance(db),
        getFinancialGoals(db, 'active'),
        getFixedExpenses(db),
        getAssessmentHistory(db, 6),
      ]);

      const result = runFinancialAnalysis(
        { transactions: txData, profile, fixedExpenses, debts: [], goals, liquidBalance },
        month, year
      );
      const dx = runDiagnosis(result);

      setAnalysis({ ...result, diagnoses: dx });
      setDiagnoses(dx);
      setHistory(hist);

      // Save to DB
      await saveFinancialAssessment(db, {
        period_month: month, period_year: year, ...result, diagnoses: dx,
      });
    } catch (e) {
      console.error('PlannerScreen loadData error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [db]);

  useFocusEffect(useCallback(() => {
    if (!route.params?.freshAnalysis) loadData();
    else { setLoading(false); setHasProfile(true); }
  }, [loadData]));

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const toggleExpand = (id) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpanded(p => ({ ...p, [id]: !p[id] }));
  };

  if (loading) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: colors.bgPrimary }]}>
        <ActivityIndicator size="large" color={colors.brand} />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>Menghitung skor keuangan...</Text>
      </View>
    );
  }

  if (!hasProfile) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: colors.bgPrimary }]}>
        <View style={[styles.emptyIcon, { backgroundColor: colors.brandBg }]}>
          <Ionicons name="analytics" size={40} color={colors.brand} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Belum Ada Profil Keuangan</Text>
        <Text style={[styles.emptySub, { color: colors.textMuted }]}>
          Isi profil keuangan singkat untuk mendapatkan analisis dan rekomendasi yang dipersonalisasi.
        </Text>
        <TouchableOpacity
          style={[styles.startBtn, { backgroundColor: colors.brand }]}
          onPress={() => navigation.navigate('Assessment')}
        >
          <Ionicons name="rocket" size={18} color="#fff" />
          <Text style={styles.startBtnText}>Mulai Analisis Keuangan</Text>
        </TouchableOpacity>
        <Text style={[styles.offlineNote, { color: colors.textFaint }]}>🔒 100% offline — data tidak keluar dari perangkat</Text>
      </View>
    );
  }

  const now = new Date();
  const monthNames = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.bgPrimary }]}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 120 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
    >
      {/* Period */}
      <View style={styles.periodRow}>
        <Text style={[styles.periodLabel, { color: colors.textMuted }]}>
          Analisis: {monthNames[now.getMonth()]} {now.getFullYear()}
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Assessment')}>
          <Text style={[styles.editLink, { color: colors.brand }]}>Edit Profil</Text>
        </TouchableOpacity>
      </View>

      {/* Health Score Card */}
      <HealthScoreCard analysis={analysis} onPressSeeDetail={() => {}} />

      {/* Key Metrics */}
      {analysis && (
        <View style={styles.metricsGrid}>
          <MetricCard
            label="Pendapatan" value={formatRupiah(analysis.income)}
            icon="arrow-up-circle" color={colors.income} bg={colors.incomeBg} colors={colors}
          />
          <MetricCard
            label="Pengeluaran" value={formatRupiah(analysis.expense)}
            icon="arrow-down-circle" color={colors.expense} bg={colors.expenseBg} colors={colors}
          />
          <MetricCard
            label="Cash Flow" value={(analysis.cashFlow >= 0 ? '+' : '') + formatRupiah(analysis.cashFlow)}
            icon="swap-horizontal" color={analysis.cashFlow >= 0 ? colors.income : colors.expense}
            bg={analysis.cashFlow >= 0 ? colors.incomeBg : colors.expenseBg} colors={colors}
          />
          <MetricCard
            label="Tabungan" value={`${(analysis.savingsRate * 100).toFixed(1)}%`}
            icon="trending-up" color={colors.brand} bg={colors.brandBg} colors={colors}
          />
          <MetricCard
            label="Dana Darurat" value={`${analysis.emergencyMonths?.toFixed(1) || '0'} bln`}
            icon="shield-checkmark" color="#10B981" bg="#10B98115" colors={colors}
          />
          <MetricCard
            label="DTI Ratio" value={`${(analysis.dti * 100).toFixed(1)}%`}
            icon="card" color={analysis.dti > 0.30 ? colors.expense : colors.income}
            bg={analysis.dti > 0.30 ? colors.expenseBg : colors.incomeBg} colors={colors}
          />
        </View>
      )}

      {/* Quick Tools Banner */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickToolsRow}>
        <TouchableOpacity
          style={[styles.quickToolCard, { backgroundColor: '#8b5cf615', borderColor: '#8b5cf640' }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate('Goals'); }}
        >
          <Ionicons name="flag" size={18} color="#8b5cf6" />
          <View>
            <Text style={[styles.quickToolTitle, { color: colors.textPrimary }]}>Target Finansial</Text>
            <Text style={[styles.quickToolSub, { color: colors.textMuted }]}>Lacak tujuan</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickToolCard, { backgroundColor: '#10B98115', borderColor: '#10B98140' }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate('Simulator'); }}
        >
          <Ionicons name="calculator" size={18} color="#10B981" />
          <View>
            <Text style={[styles.quickToolTitle, { color: colors.textPrimary }]}>Simulator</Text>
            <Text style={[styles.quickToolSub, { color: colors.textMuted }]}>Hitung skenario</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickToolCard, { backgroundColor: '#f59e0b15', borderColor: '#f59e0b40' }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate('MonthlyReview'); }}
        >
          <Ionicons name="trophy" size={18} color="#f59e0b" />
          <View>
            <Text style={[styles.quickToolTitle, { color: colors.textPrimary }]}>Evaluasi & Lencana</Text>
            <Text style={[styles.quickToolSub, { color: colors.textMuted }]}>Laporan & Prestasi</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* Expense Breakdown */}
      {analysis?.groups && (
        <>
          <Text style={styles.sectionTitle}>Komposisi Pengeluaran</Text>
          <View style={[styles.breakdownCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            {Object.entries(analysis.groups)
              .filter(([, v]) => v > 0)
              .sort(([, a], [, b]) => b - a)
              .map(([key, amount]) => {
                const ratio = analysis.income > 0 ? amount / analysis.income : 0;
                const groupInfo = ANALYSIS_GROUPS[key] || ANALYSIS_GROUPS.other;
                const isHigh = ratio > 0.30 && key === 'housing' || ratio > 0.20 && key !== 'housing';
                return (
                  <View key={key} style={styles.breakdownRow}>
                    <View style={[styles.breakdownDot, { backgroundColor: groupInfo.color }]} />
                    <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]} numberOfLines={1}>{groupInfo.label}</Text>
                    <View style={styles.breakdownBarWrap}>
                      <View style={[styles.breakdownBar, { width: `${Math.min(ratio * 100, 100)}%`, backgroundColor: groupInfo.color + (isHigh ? 'cc' : '88') }]} />
                    </View>
                    <Text style={[styles.breakdownPct, { color: isHigh ? colors.expense : colors.textMuted }]}>
                      {(ratio * 100).toFixed(0)}%
                    </Text>
                  </View>
                );
              })
            }
          </View>
        </>
      )}

      {/* Diagnoses */}
      {diagnoses.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Diagnosa Keuangan ({diagnoses.length})</Text>
          {diagnoses.map((d) => {
            const cfg = SEVERITY_CONFIG[d.severity] || SEVERITY_CONFIG.medium;
            const isOpen = expanded[d.id];
            return (
              <TouchableOpacity
                key={d.id}
                style={[styles.diagCard, { backgroundColor: cfg.bg, borderColor: cfg.color + '40', borderLeftColor: cfg.color }]}
                onPress={() => toggleExpand(d.id)}
                activeOpacity={0.8}
              >
                <View style={styles.diagHeader}>
                  <View style={styles.diagLeft}>
                    <Text style={styles.diagEmoji}>{d.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.diagTitle, { color: cfg.color }]}>{d.title}</Text>
                      <View style={[styles.severityBadge, { backgroundColor: cfg.color + '20' }]}>
                        <Text style={[styles.severityText, { color: cfg.color }]}>{cfg.label}</Text>
                      </View>
                    </View>
                  </View>
                  <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color={cfg.color} />
                </View>
                {isOpen && (
                  <View style={styles.diagBody}>
                    <Text style={[styles.diagMessage, { color: colors.textSecondary }]}>{d.message}</Text>
                    {d.detail && <Text style={[styles.diagDetail, { color: colors.textMuted }]}>{d.detail}</Text>}
                    {d.impact > 0 && (
                      <View style={[styles.impactRow, { backgroundColor: colors.bgElevated }]}>
                        <Ionicons name="flash" size={13} color={cfg.color} />
                        <Text style={[styles.impactText, { color: cfg.color }]}>
                          Dampak: {formatRupiah(d.impact)}/tahun
                        </Text>
                      </View>
                    )}
                    {d.actions?.length > 0 && (
                      <View style={styles.actionsWrap}>
                        <Text style={[styles.actionsLabel, { color: colors.textMuted }]}>Tindakan yang disarankan:</Text>
                        {d.actions.map((a, i) => {
                          const handleActionPress = () => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            if (a.type === 'simulator' || a.type === 'expense_reduction') {
                              navigation.navigate('Simulator');
                            } else if (a.type === 'create_goal' || a.type === 'goal_allocation') {
                              navigation.navigate('Goals');
                            } else if (a.type === 'debt_payoff' || a.type === 'debt_priority') {
                              navigation.navigate('Simulator');
                            } else {
                              // default / info
                              navigation.navigate('Assessment');
                            }
                          };

                          return (
                            <TouchableOpacity key={i} style={styles.actionItem} onPress={handleActionPress}>
                              <Ionicons name="arrow-forward-circle" size={14} color={cfg.color} />
                              <Text style={[styles.actionText, { color: colors.textSecondary }]}>{a.label}</Text>
                              <Ionicons name="chevron-forward" size={12} color={colors.textFaint} />
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </>
      )}

      {diagnoses.length === 0 && analysis && (
        <View style={[styles.allGoodCard, { backgroundColor: colors.incomeBg, borderColor: colors.income + '40' }]}>
          <Text style={styles.allGoodEmoji}>🎉</Text>
          <Text style={[styles.allGoodTitle, { color: colors.income }]}>Keuangan Anda Sehat!</Text>
          <Text style={[styles.allGoodSub, { color: colors.textSecondary }]}>Tidak ada masalah serius yang terdeteksi bulan ini.</Text>
        </View>
      )}

      {/* Disclaimer */}
      <View style={[styles.disclaimer, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        <Ionicons name="information-circle-outline" size={14} color={colors.textFaint} />
        <Text style={[styles.disclaimerText, { color: colors.textFaint }]}>
          Analisis ini bersifat edukatif berdasarkan data yang Anda masukkan, bukan konsultasi keuangan profesional.
        </Text>
      </View>
    </ScrollView>
  );
}

function MetricCard({ label, value, icon, color, bg, colors }) {
  return (
    <View style={{
      width: '31%', backgroundColor: colors.bgCard, borderRadius: 14, padding: 12,
      borderWidth: 1, borderColor: colors.border, alignItems: 'center',
      elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3,
    }}>
      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={{ fontSize: 13, fontWeight: '800', color, marginBottom: 2 }} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={{ fontSize: 9, fontWeight: '600', color: colors.textMuted, textAlign: 'center' }}>{label}</Text>
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 14 },

  // Empty
  emptyIcon: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  startBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 16, marginBottom: 12 },
  startBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  offlineNote: { fontSize: 12, marginTop: 8 },

  periodRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  periodLabel: { fontSize: 12, fontWeight: '600' },
  editLink: { fontSize: 12, fontWeight: '700' },

  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 8, marginBottom: 16, justifyContent: 'space-between' },

  quickToolsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 20 },
  quickToolCard: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, borderRadius: 14, borderWidth: 1,
  },
  quickToolTitle: { fontSize: 12, fontWeight: '700' },
  quickToolSub: { fontSize: 10, marginTop: 1 },

  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary, marginHorizontal: 16, marginBottom: 12, letterSpacing: 0.2 },

  breakdownCard: { marginHorizontal: 16, borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 24 },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  breakdownDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  breakdownLabel: { fontSize: 11, fontWeight: '600', width: 90 },
  breakdownBarWrap: { flex: 1, height: 6, backgroundColor: colors.bgElevated, borderRadius: 3, overflow: 'hidden', marginHorizontal: 8 },
  breakdownBar: { height: '100%', borderRadius: 3 },
  breakdownPct: { fontSize: 11, fontWeight: '700', width: 32, textAlign: 'right' },

  diagCard: {
    marginHorizontal: 16, borderRadius: 16, padding: 16, marginBottom: 10,
    borderWidth: 1, borderLeftWidth: 4,
  },
  diagHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  diagLeft: { flexDirection: 'row', alignItems: 'flex-start', flex: 1, gap: 10 },
  diagEmoji: { fontSize: 20 },
  diagTitle: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  severityBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  severityText: { fontSize: 10, fontWeight: '700' },
  diagBody: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)' },
  diagMessage: { fontSize: 13, lineHeight: 19, marginBottom: 8 },
  diagDetail: { fontSize: 12, lineHeight: 17, marginBottom: 10, fontStyle: 'italic' },
  impactRow: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: 10, marginBottom: 10 },
  impactText: { fontSize: 12, fontWeight: '700' },
  actionsWrap: { marginTop: 4 },
  actionsLabel: { fontSize: 11, fontWeight: '700', marginBottom: 6 },
  actionItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  actionText: { fontSize: 12, lineHeight: 17, flex: 1 },

  allGoodCard: { marginHorizontal: 16, borderRadius: 16, padding: 20, borderWidth: 1, alignItems: 'center', marginBottom: 16 },
  allGoodEmoji: { fontSize: 36, marginBottom: 8 },
  allGoodTitle: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  allGoodSub: { fontSize: 13, textAlign: 'center' },

  disclaimer: { flexDirection: 'row', gap: 8, margin: 16, padding: 14, borderRadius: 12, borderWidth: 1, alignItems: 'flex-start' },
  disclaimerText: { flex: 1, fontSize: 11, lineHeight: 16 },
});
