import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Path, Circle, Text as SvgText } from 'react-native-svg';
import {
  getStats, getExpenseByCategory, getDateFilterBoundary,
  getFixedVsVariableExpense, getTotalHarta,
  calculateFinancialHealth, generateSummary,
  getSubCategoryExpense, getMonthComparison,
} from '../db/database';
import { Ionicons } from '@expo/vector-icons';
import { formatRupiah } from '../utils/formatting';
import MetricCard from '../components/MetricCard';
import StatusModal from '../components/StatusModal';

const COLOR_PALETTE = [
  '#7c6aff', '#00c896', '#ff4d6d', '#f59e0b',
  '#0ea5e9', '#ec4899', '#14b8a6', '#f97316',
  '#a78bfa', '#34d399', '#fb923c', '#60a5fa',
];

const FILTERS = [
  { key: 'today', label: 'Hari Ini' },
  { key: 'week', label: 'Minggu' },
  { key: 'month', label: 'Bulan Ini' },
  { key: 'year', label: 'Tahun Ini' },
  { key: 'last_year', label: 'Tahun Lalu' },
  { key: 'all', label: 'Semua' },
];


// ─── Donut Chart (SVG) ───────────────────────────────────────────────────────
function DonutChart({ data, total, size = 160 }) {
  if (!data?.length || total === 0) return null;

  const outerR = size / 2 - 8;
  const innerR = outerR * 0.62;
  const cx = size / 2;
  const cy = size / 2;
  const GAP = 0.016; // gap antar segment (radian)

  let cumAngle = -Math.PI / 2;

  const segs = data.slice(0, 12).map((item) => {
    const rawAngle = (item.total / total) * 2 * Math.PI;
    const angle = Math.max(0.02, rawAngle - GAP);
    const end = cumAngle + angle;
    const large = angle > Math.PI ? 1 : 0;

    const x1 = cx + outerR * Math.cos(cumAngle);
    const y1 = cy + outerR * Math.sin(cumAngle);
    const x2 = cx + outerR * Math.cos(end);
    const y2 = cy + outerR * Math.sin(end);
    const ix1 = cx + innerR * Math.cos(end);
    const iy1 = cy + innerR * Math.sin(end);
    const ix2 = cx + innerR * Math.cos(cumAngle);
    const iy2 = cy + innerR * Math.sin(cumAngle);

    const d = `M${x1.toFixed(2)} ${y1.toFixed(2)} A${outerR} ${outerR} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} L${ix1.toFixed(2)} ${iy1.toFixed(2)} A${innerR} ${innerR} 0 ${large} 0 ${ix2.toFixed(2)} ${iy2.toFixed(2)}Z`;
    cumAngle = end + GAP;
    return { ...item, d };
  });

  const centerText =
    total >= 1e9 ? `${(total / 1e9).toFixed(1)}M` :
    total >= 1e6 ? `${(total / 1e6).toFixed(1)}jt` :
    total >= 1e3 ? `${Math.round(total / 1e3)}rb` : String(Math.round(total));

  return (
    <Svg width={size} height={size}>
      {segs.map((s, i) => (
        <Path key={i} d={s.d} fill={s.color} />
      ))}
      <Circle cx={cx} cy={cy} r={innerR - 2} fill="#0d1526" />
      <SvgText
        x={cx} y={cy - 8}
        textAnchor="middle"
        fill="#4a5568"
        fontSize="9"
        fontWeight="700"
      >
        TOTAL
      </SvgText>
      <SvgText
        x={cx} y={cy + 12}
        textAnchor="middle"
        fill="#e8edf5"
        fontSize="17"
        fontWeight="800"
      >
        {centerText}
      </SvgText>
    </Svg>
  );
}

// ─── Monthly Comparison Card ──────────────────────────────────────────────────
function MonthComparisonCard({ data }) {
  if (!data) return null;
  const { thisMonth, lastMonth } = data;
  const max = Math.max(thisMonth.income, thisMonth.expense, lastMonth.income, lastMonth.expense, 1);

  const pctChange = (curr, prev) => {
    if (prev === 0) return curr > 0 ? '+∞%' : '0%';
    const pct = ((curr - prev) / prev) * 100;
    return (pct >= 0 ? '+' : '') + pct.toFixed(0) + '%';
  };

  const CompareRow = ({ label, thisVal, lastVal, color }) => {
    const thisW = Math.max(2, (thisVal / max) * 100);
    const lastW = Math.max(2, (lastVal / max) * 100);
    const pct = pctChange(thisVal, lastVal);
    const isPositive = thisVal >= lastVal;
    const badgeBg = isPositive ? '#003d2a' : '#2d0a14';
    const badgeColor = isPositive ? '#00c896' : '#ff4d6d';

    return (
      <View style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text style={{ color: '#8892a4', fontSize: 12, fontWeight: '600' }}>{label}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ color, fontSize: 13, fontWeight: '700' }}>{formatRupiah(thisVal)}</Text>
            <View style={{ backgroundColor: badgeBg, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 }}>
              <Text style={{ color: badgeColor, fontSize: 10, fontWeight: '700' }}>{pct}</Text>
            </View>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 }}>
          <Text style={{ color: '#4a5568', fontSize: 10, width: 46 }}>Bln Ini</Text>
          <View style={{ flex: 1, height: 7, backgroundColor: '#1a2540', borderRadius: 4 }}>
            <View style={{ width: `${thisW}%`, height: 7, backgroundColor: color, borderRadius: 4 }} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ color: '#2a3550', fontSize: 10, width: 46 }}>Bln Lalu</Text>
          <View style={{ flex: 1, height: 7, backgroundColor: '#1a2540', borderRadius: 4 }}>
            <View style={{ width: `${lastW}%`, height: 7, backgroundColor: color + '55', borderRadius: 4 }} />
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.card}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 }}>
        <Ionicons name="swap-vertical-outline" size={16} color="#7c6aff" />
        <Text style={styles.sectionTitle}>Perbandingan Bulanan</Text>
      </View>
      <CompareRow label="Pemasukan" thisVal={thisMonth.income} lastVal={lastMonth.income} color="#00c896" />
      <CompareRow label="Pengeluaran" thisVal={thisMonth.expense} lastVal={lastMonth.expense} color="#ff4d6d" />
    </View>
  );
}

// ─── Score Ring ───────────────────────────────────────────────────────────────
function ScoreRing({ score, status }) {
  const color = status === 'sehat' ? '#00c896' : status === 'kritis' ? '#ff4d6d' : '#f59e0b';
  return (
    <View style={[scoreRingStyles.ring, { borderColor: color }]}>
      <Text style={[scoreRingStyles.score, { color }]}>{score}</Text>
      <Text style={scoreRingStyles.outOf}>/100</Text>
    </View>
  );
}
const scoreRingStyles = StyleSheet.create({
  ring: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 4, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#060d1a',
  },
  score: { fontSize: 22, fontWeight: '800' },
  outOf: { color: '#4a5568', fontSize: 10, marginTop: -2 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AnalyticsScreen() {
  const db = useSQLiteContext();
  const [stats, setStats] = useState({ income: 0, expense: 0, balance: 0 });
  const [expenseData, setExpenseData] = useState([]);
  const [filter, setFilter] = useState('month');
  const [financeScore, setFinanceScore] = useState(0);
  const [financeStatus, setFinanceStatus] = useState('warning');
  const [financeSummary, setFinanceSummary] = useState('');
  const [health, setHealth] = useState(null);
  const [monthComparison, setMonthComparison] = useState(null);
  // Drill-down state
  const [expandedCatId, setExpandedCatId] = useState(null);
  const [subData, setSubData] = useState({});
  const [loadingSub, setLoadingSub] = useState(false);

  const [statusModal, setStatusModal] = useState({ visible: false, title: '', message: '', type: 'info' });
  const showStatus = (title, message, type) => {
    setStatusModal({ visible: true, title, message, type });
  };

  const loadData = useCallback(async (cancelled = { current: false }) => {
    try {
      const bounds = getDateFilterBoundary(filter);

      const s = await getStats(db, bounds);
      if (cancelled.current) return;
      setStats(s);

      const cats = await getExpenseByCategory(db, bounds);
      if (cancelled.current) return;
      let sum = 0;
      cats.forEach(c => (sum += c.total));
      const chartData = cats.map((c, i) => ({
        id: c.id,
        name: c.name,
        total: c.total,
        percentage: sum > 0 ? ((c.total / sum) * 100).toFixed(1) : '0.0',
        color: COLOR_PALETTE[i % COLOR_PALETTE.length],
      }));
      setExpenseData(chartData);
      // Reset drill-down saat filter berubah
      setExpandedCatId(null);
      setSubData({});

      const flexArr = await getFixedVsVariableExpense(db, bounds);
      if (cancelled.current) return;
      let fixedSum = 0;
      flexArr.forEach(r => { if (r.is_fixed === 1) fixedSum += r.total; });

      const harta = (await getTotalHarta(db)) || 0;
      if (cancelled.current) return;

      const h = calculateFinancialHealth({
        income: s.income,
        expense: s.expense,
        balance: harta,
        fixedExpense: fixedSum,
      });
      h.totalExp = s.expense;
      setHealth(h);
      setFinanceScore(h.score);
      setFinanceStatus(h.status);
      setFinanceSummary(
        s.income === 0 && s.expense === 0
          ? 'Belum ada data finansial untuk periode ini.'
          : generateSummary(h, cats)
      );

      // Perbandingan bulanan (selalu bulan ini vs bulan lalu)
      const comparison = await getMonthComparison(db);
      if (!cancelled.current) setMonthComparison(comparison);

    } catch (e) {
      console.error('AnalyticsScreen loadData error:', e);
      showStatus('Error', 'Gagal memuat data analisis.', 'error');
    }
  }, [db, filter]);

  useFocusEffect(useCallback(() => {
    const cancelled = { current: false };
    loadData(cancelled);
    return () => { cancelled.current = true; };
  }, [loadData]));

  // Drill-down: tap kategori → load subkategori on demand
  const handleCategoryTap = async (cat) => {
    if (expandedCatId === cat.id) {
      setExpandedCatId(null);
      return;
    }
    setExpandedCatId(cat.id);
    if (subData[cat.id]) return; // sudah di-cache

    setLoadingSub(true);
    try {
      const bounds = getDateFilterBoundary(filter);
      const subs = await getSubCategoryExpense(db, cat.id, bounds);
      setSubData(prev => ({ ...prev, [cat.id]: subs }));
    } catch (e) {
      console.error('Sub category load error:', e);
      showStatus('Gagal Memuat', 'Tidak dapat memuat sub-kategori. Coba ketuk lagi.', 'error');
    } finally {
      setLoadingSub(false);
    }
  };

  const totalExpense = expenseData.reduce((a, c) => a + c.total, 0);
  const maxExpense = expenseData.length > 0 ? expenseData[0].total : 1;

  const statusConfig = {
    sehat:   { color: '#00c896', label: 'Keuangan Sehat',   icon: 'checkmark-circle' },
    warning: { color: '#f59e0b', label: 'Perlu Perhatian',  icon: 'warning' },
    kritis:  { color: '#ff4d6d', label: 'Kondisi Kritis',   icon: 'alert-circle' },
  };
  const sc = statusConfig[financeStatus];

  return (
    <ScrollView
      style={styles.root}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 80 }}
    >
      {/* ── Filter Chips ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.chip, filter === f.key && styles.chipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.chipText, filter === f.key && styles.chipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Health Score Card ── */}
      <View style={[styles.healthCard, { borderColor: sc.color + '55' }]}>
        <View style={styles.healthLeft}>
          <View style={styles.healthBadge}>
            <Ionicons name={sc.icon} size={14} color={sc.color} />
            <Text style={[styles.healthBadgeText, { color: sc.color }]}>{sc.label}</Text>
          </View>
          <Text style={styles.healthTitle}>Skor Keuangan</Text>
          <Text style={styles.healthDesc} numberOfLines={4}>{financeSummary}</Text>
        </View>
        <ScoreRing score={financeScore} status={financeStatus} />
      </View>

      {/* ── Monthly Comparison Card ── */}
      <MonthComparisonCard data={monthComparison} />

      {/* ── Key Metrics ── */}
      {health && (
        <View style={styles.metricsSection}>
          <Text style={styles.sectionTitle}>Metrik Keuangan</Text>
          <View style={styles.metricsRow}>
            <MetricCard
              label="Savings Rate"
              value={`${health.savingsRate}%`}
              sub={health.savingsRate >= 20 ? '✓ Ideal ≥20%' : '↑ Target 20%'}
              color={health.savingsRate >= 20 ? '#00c896' : '#f59e0b'}
              icon="trending-up"
            />
            <MetricCard
              label="Expense Ratio"
              value={`${health.eir}%`}
              sub={health.eir <= 70 ? '✓ Efisien ≤70%' : '↓ Target <70%'}
              color={health.eir <= 70 ? '#00c896' : '#ff4d6d'}
              icon="pie-chart"
            />
          </View>
          <View style={styles.metricsRow}>
            <MetricCard
              label="Fixed Cost"
              value={`${health.fixedRatio}%`}
              sub="Dari total pemasukan"
              color={health.fixedRatio <= 50 ? '#00c896' : '#f59e0b'}
              icon="lock-closed"
            />
            <MetricCard
              label="Dana Darurat"
              value={health.runway === Infinity ? '∞ bln' : `${health.runway} bln`}
              sub={health.runway >= 6 ? '✓ Sangat aman' : health.runway >= 3 ? 'Cukup aman' : '⚠ Perlu ditambah'}
              color={health.runway >= 3 ? '#00c896' : '#ff4d6d'}
              icon="shield-checkmark"
            />
          </View>
        </View>
      )}

      {/* ── Cash Flow Summary ── */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Ringkasan Arus Kas</Text>
        <View style={styles.cashFlowRow}>
          <View style={styles.cashFlowItem}>
            <Text style={styles.cashFlowLabel}>Pemasukan</Text>
            <Text style={[styles.cashFlowVal, { color: '#00c896' }]}>+{formatRupiah(stats.income)}</Text>
          </View>
          <View style={styles.cashFlowDivider} />
          <View style={styles.cashFlowItem}>
            <Text style={styles.cashFlowLabel}>Pengeluaran</Text>
            <Text style={[styles.cashFlowVal, { color: '#ff4d6d' }]}>−{formatRupiah(stats.expense)}</Text>
          </View>
        </View>
        <View style={styles.netRow}>
          <Text style={styles.netLabel}>Net Cash Flow</Text>
          <Text style={[styles.netVal, { color: stats.income - stats.expense >= 0 ? '#00c896' : '#ff4d6d' }]}>
            {stats.income - stats.expense >= 0 ? '+' : '−'}
            {formatRupiah(Math.abs(stats.income - stats.expense))}
          </Text>
        </View>
      </View>

      {/* ── Donut Chart + Inline Legend ── */}
      {expenseData.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Distribusi Pengeluaran</Text>
          <View style={styles.chartRow}>
            {/* Donut */}
            <DonutChart data={expenseData} total={totalExpense} size={160} />
            {/* Legend top 7 */}
            <View style={styles.legendList}>
              {expenseData.slice(0, 7).map((item, i) => (
                <View key={i} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.legendName} numberOfLines={1}>{item.name}</Text>
                    <Text style={[styles.legendPct, { color: item.color }]}>{item.percentage}%</Text>
                  </View>
                </View>
              ))}
              {expenseData.length > 7 && (
                <Text style={styles.legendMore}>+{expenseData.length - 7} kategori lainnya</Text>
              )}
            </View>
          </View>
        </View>
      )}

      {/* ── Expense Breakdown with Drill-Down ── */}
      {expenseData.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Rincian per Kategori</Text>
          <Text style={styles.tapHint}>Ketuk kategori untuk melihat sub-kategori ↓</Text>

          {expenseData.map((item, i) => {
            const isExpanded = expandedCatId === item.id;
            const barW = Math.max(2, Math.min(100, (item.total / maxExpense) * 100));
            return (
              <View key={item.id || i}>
                {/* Category row */}
                <TouchableOpacity
                  style={[styles.breakdownItem, isExpanded && styles.breakdownItemActive]}
                  onPress={() => handleCategoryTap(item)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.catRankBadge, { backgroundColor: item.color + '22' }]}>
                    <Text style={[styles.catRank, { color: item.color }]}>{i + 1}</Text>
                  </View>
                  <View style={styles.breakdownMid}>
                    <Text style={styles.breakdownName} numberOfLines={1}>{item.name}</Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${barW}%`, backgroundColor: item.color }]} />
                    </View>
                  </View>
                  <View style={styles.breakdownRight}>
                    <Text style={[styles.breakdownAmt, { color: item.color }]}>{formatRupiah(item.total)}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                      <Text style={styles.breakdownPct}>{item.percentage}%</Text>
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={11}
                        color="#4a5568"
                      />
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Drill-down sub-categories */}
                {isExpanded && (
                  <View style={[styles.subBreakdown, { borderLeftColor: item.color }]}>
                    {loadingSub && !subData[item.id] ? (
                      <Text style={styles.subLoading}>Memuat sub-kategori...</Text>
                    ) : !subData[item.id] || subData[item.id].length === 0 ? (
                      <Text style={styles.subEmpty}>Tidak ada sub-kategori tercatat.</Text>
                    ) : (
                      subData[item.id].map((sub, j) => {
                        const subPct = item.total > 0 ? ((sub.total / item.total) * 100).toFixed(0) : 0;
                        const subBarW = item.total > 0 ? (sub.total / item.total) * 100 : 0;
                        return (
                          <View key={j} style={styles.subItem}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.subName} numberOfLines={1}>· {sub.name}</Text>
                              <View style={styles.subBarTrack}>
                                <View style={[styles.subBarFill, { width: `${subBarW}%`, backgroundColor: item.color + 'aa' }]} />
                              </View>
                            </View>
                            <View style={styles.subRight}>
                              <Text style={[styles.subAmt, { color: item.color }]}>{formatRupiah(sub.total)}</Text>
                              <Text style={styles.subPct}>{subPct}%</Text>
                            </View>
                          </View>
                        );
                      })
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* ── Empty State ── */}
      {expenseData.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="bar-chart-outline" size={44} color="#1a2540" />
          <Text style={styles.emptyTitle}>Belum Ada Data</Text>
          <Text style={styles.emptySub}>Mulai catat transaksi untuk melihat analisis keuangan Anda.</Text>
        </View>
      )}

      <StatusModal
        visible={statusModal.visible}
        onClose={() => setStatusModal({ ...statusModal, visible: false })}
        title={statusModal.title}
        message={statusModal.message}
        type={statusModal.type}
      />

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#060d1a' },

  filterScroll: { paddingLeft: 16, paddingVertical: 12, flexGrow: 0, marginBottom: 4 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: '#0d1526', marginRight: 8, borderWidth: 1, borderColor: '#1a2540',
  },
  chipActive: { backgroundColor: '#7c6aff', borderColor: '#7c6aff' },
  chipText: { color: '#4a5568', fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#fff' },

  // Health Card
  healthCard: {
    marginHorizontal: 16, backgroundColor: '#0d1526', borderRadius: 18,
    padding: 20, marginBottom: 16, borderWidth: 1,
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
  },
  healthLeft: { flex: 1, marginRight: 16 },
  healthBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
    backgroundColor: '#1a2540', alignSelf: 'flex-start', marginBottom: 10,
  },
  healthBadgeText: { fontSize: 11, fontWeight: '700' },
  healthTitle: { color: '#e8edf5', fontSize: 16, fontWeight: '700', marginBottom: 8 },
  healthDesc: { color: '#8892a4', fontSize: 12, lineHeight: 19 },

  // Metrics
  metricsSection: { marginHorizontal: 12, marginBottom: 12 },
  sectionTitle: { color: '#e8edf5', fontSize: 15, fontWeight: '700', marginBottom: 0 },
  metricsRow: { flexDirection: 'row', marginTop: 12 },

  // Card
  card: {
    marginHorizontal: 16, backgroundColor: '#0d1526', borderRadius: 16,
    padding: 18, marginBottom: 16, borderWidth: 1, borderColor: '#1a2540',
  },

  // Cash flow
  cashFlowRow: { flexDirection: 'row', marginBottom: 14, marginTop: 14 },
  cashFlowItem: { flex: 1, alignItems: 'center' },
  cashFlowLabel: { color: '#4a5568', fontSize: 11, fontWeight: '600', marginBottom: 4 },
  cashFlowVal: { fontSize: 16, fontWeight: '800' },
  cashFlowDivider: { width: 1, backgroundColor: '#1a2540', marginHorizontal: 16, borderRadius: 1 },
  netRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 14, borderTopWidth: 1, borderTopColor: '#1a2540',
  },
  netLabel: { color: '#8892a4', fontSize: 13, fontWeight: '600' },
  netVal: { fontSize: 16, fontWeight: '800' },

  // Donut + legend
  chartRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginTop: 14,
  },
  legendList: { flex: 1, paddingLeft: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 11 },
  legendDot: { width: 9, height: 9, borderRadius: 5, marginRight: 7, flexShrink: 0 },
  legendName: { color: '#e8edf5', fontSize: 11, fontWeight: '600' },
  legendPct: { fontSize: 10, fontWeight: '700', marginTop: 1 },
  legendMore: { color: '#2a3550', fontSize: 10, marginTop: 4, fontStyle: 'italic' },

  // Breakdown
  tapHint: { color: '#2a3550', fontSize: 11, marginBottom: 14, marginTop: 6, fontStyle: 'italic' },
  breakdownItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1a2540',
    gap: 10,
  },
  breakdownItemActive: { backgroundColor: '#0a1020', borderRadius: 10, paddingHorizontal: 6, marginHorizontal: -6 },
  catRankBadge: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  catRank: { fontSize: 11, fontWeight: '800' },
  breakdownMid: { flex: 1 },
  breakdownName: { color: '#e8edf5', fontSize: 13, fontWeight: '600', marginBottom: 6 },
  barTrack: { height: 4, backgroundColor: '#1a2540', borderRadius: 2 },
  barFill: { height: 4, borderRadius: 2 },
  breakdownRight: { alignItems: 'flex-end', minWidth: 80 },
  breakdownAmt: { fontSize: 13, fontWeight: '700' },
  breakdownPct: { color: '#4a5568', fontSize: 11, marginTop: 2 },

  // Sub-breakdown (drill-down)
  subBreakdown: {
    backgroundColor: '#060d1a', borderRadius: 10,
    padding: 12, marginBottom: 4, marginLeft: 36,
    borderLeftWidth: 2, marginTop: -1,
  },
  subLoading: { color: '#4a5568', fontSize: 12, textAlign: 'center', paddingVertical: 10 },
  subEmpty: { color: '#2a3550', fontSize: 12, textAlign: 'center', paddingVertical: 10, fontStyle: 'italic' },
  subItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#0d1526',
    gap: 10,
  },
  subName: { color: '#8892a4', fontSize: 12 },
  subBarTrack: { height: 3, backgroundColor: '#1a2540', borderRadius: 2, marginTop: 4 },
  subBarFill: { height: 3, borderRadius: 2 },
  subRight: { alignItems: 'flex-end', minWidth: 70 },
  subAmt: { fontSize: 12, fontWeight: '700' },
  subPct: { color: '#4a5568', fontSize: 10, marginTop: 2 },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 30 },
  emptyTitle: { color: '#2a3550', fontSize: 16, fontWeight: '700', marginTop: 16 },
  emptySub: { color: '#1e2a42', fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 20 },
});