/**
 * src/screens/SimulatorScreen.js
 *
 * Phase 3 — What-If & Investment Simulator
 * 4 tabs: Investment | Expense Reduction | Debt Payoff | Goal Timeline
 * Pure formula engine, no AI, no internet.
 */

import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppContext } from '../context/AppContext';
import { saveSimulation } from '../db/database';
import { INVESTMENT_RETURNS, INFLATION_RATE_DEFAULT } from '../constants/benchmarks';
import {
  simulateInvestment, simulateExpenseReduction,
  simulateDebtPayoff, simulateGoalTimeline,
} from '../utils/financialEngine';
import { formatRupiah } from '../utils/formatting';
import { formatCurrencyInput, parseCurrencyRaw } from '../utils/formatting';

const TABS = [
  { key: 'investment', label: 'Investasi', icon: 'trending-up' },
  { key: 'expense',    label: 'Hemat',     icon: 'cut' },
  { key: 'debt',       label: 'Cicilan',   icon: 'card' },
  { key: 'goal',       label: 'Target',    icon: 'flag' },
];

const DURATION_OPTIONS = [
  { label: '1 Th',  months: 12 },
  { label: '3 Th',  months: 36 },
  { label: '5 Th',  months: 60 },
  { label: '10 Th', months: 120 },
  { label: '20 Th', months: 240 },
];

export default function SimulatorScreen({ navigation }) {
  const db = useSQLiteContext();
  const { colors } = useAppContext();
  const styles = makeStyles(colors);
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('investment');

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.bgPrimary }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 20}
    >
      {/* Tab Switcher */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBar}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabBtn, tab === t.key && { backgroundColor: colors.brand }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setTab(t.key); }}
          >
            <Ionicons name={t.icon} size={14} color={tab === t.key ? '#fff' : colors.textMuted} />
            <Text style={[styles.tabLabel, { color: tab === t.key ? '#fff' : colors.textMuted, fontWeight: tab === t.key ? '700' : '500' }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Tab contents */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.tabContent, { paddingBottom: 120 + insets.bottom }]}
      >
        {tab === 'investment' && <InvestmentTab colors={colors} styles={styles} db={db} />}
        {tab === 'expense'    && <ExpenseTab    colors={colors} styles={styles} db={db} />}
        {tab === 'debt'       && <DebtTab       colors={colors} styles={styles} db={db} />}
        {tab === 'goal'       && <GoalTab       colors={colors} styles={styles} db={db} />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Investment Simulator ─────────────────────────────────────────────────────
function InvestmentTab({ colors, styles, db }) {
  const [initial, setInitial]       = useState('');
  const [monthly, setMonthly]       = useState('');
  const [duration, setDuration]     = useState(60);
  const [instrument, setInstrument] = useState('reksadana_saham');
  const [scenario, setScenario]     = useState('moderate');
  const [result, setResult]         = useState(null);

  const calculate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const ini = parseCurrencyRaw(initial) || 0;
    const mon = parseCurrencyRaw(monthly) || 0;
    if (ini === 0 && mon === 0) return Alert.alert('Input kosong', 'Masukkan modal awal atau kontribusi bulanan.');

    const rates = INVESTMENT_RETURNS[instrument];
    const rate  = rates[scenario] || 0.08;

    const res = simulateInvestment({
      initialAmount:      ini,
      monthlyContribution: mon,
      annualReturnRate:    rate,
      inflationRate:       INFLATION_RATE_DEFAULT,
      durationMonths:      duration,
    });
    setResult({ ...res, rate, instrument, scenario, duration });
  };

  const saveResult = async () => {
    if (!result) return;
    try {
      await saveSimulation(db, {
        name: `Investasi ${INVESTMENT_RETURNS[instrument]?.label} ${duration / 12} Th`,
        type: 'investment',
        input: { initial, monthly, duration, instrument, scenario },
        result,
      });
      Alert.alert('Tersimpan!', 'Simulasi telah disimpan.');
    } catch (e) { Alert.alert('Error', 'Gagal menyimpan.'); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tabContent}>
        <Text style={styles.tabTitle}>📈 Simulasi Pertumbuhan Investasi</Text>
        <Text style={styles.tabSub}>Hitung estimasi hasil investasi berdasarkan asumsi return historis</Text>

        {/* Instrument */}
        <Text style={styles.fieldLabel}>Instrumen Investasi</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          {Object.entries(INVESTMENT_RETURNS).filter(([k]) => k !== 'custom').map(([key, info]) => (
            <TouchableOpacity key={key}
              style={[styles.chip, instrument === key && { backgroundColor: colors.brandBg, borderColor: colors.brand }]}
              onPress={() => setInstrument(key)}>
              <Text style={[styles.chipText, instrument === key && { color: colors.brand, fontWeight: '700' }]}>{info.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Scenario */}
        <Text style={styles.fieldLabel}>Skenario Return</Text>
        <View style={styles.scenarioRow}>
          {['conservative','moderate','optimistic'].map(s => {
            const labels = { conservative: '🐢 Konservatif', moderate: '⚖️ Moderat', optimistic: '🚀 Optimis' };
            const rate = INVESTMENT_RETURNS[instrument]?.[s];
            return (
              <TouchableOpacity key={s}
                style={[styles.scenarioBtn, scenario === s && { backgroundColor: colors.brandBg, borderColor: colors.brand }]}
                onPress={() => setScenario(s)}>
                <Text style={[styles.scenarioBtnLabel, scenario === s && { color: colors.brand, fontWeight: '700' }]}>{labels[s]}</Text>
                <Text style={[styles.scenarioBtnRate, { color: scenario === s ? colors.brand : colors.textMuted }]}>{rate ? `${(rate * 100).toFixed(1)}%/th` : '-'}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Inputs */}
        <Text style={styles.fieldLabel}>Modal Awal (Rp)</Text>
        <TextInput style={styles.input} keyboardType="number-pad" placeholder="Rp 0" placeholderTextColor={colors.textFaint}
          value={initial} onChangeText={v => setInitial(formatCurrencyInput(v))} />

        <Text style={styles.fieldLabel}>Kontribusi Bulanan (Rp)</Text>
        <TextInput style={styles.input} keyboardType="number-pad" placeholder="Rp 500.000" placeholderTextColor={colors.textFaint}
          value={monthly} onChangeText={v => setMonthly(formatCurrencyInput(v))} />

        <Text style={styles.fieldLabel}>Durasi</Text>
        <View style={styles.durationRow}>
          {DURATION_OPTIONS.map(d => (
            <TouchableOpacity key={d.months}
              style={[styles.durationBtn, duration === d.months && { backgroundColor: colors.brand }]}
              onPress={() => setDuration(d.months)}>
              <Text style={[styles.durationLabel, { color: duration === d.months ? '#fff' : colors.textSecondary }]}>{d.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={[styles.calcBtn, { backgroundColor: colors.brand }]} onPress={calculate}>
          <Ionicons name="calculator" size={18} color="#fff" />
          <Text style={styles.calcBtnText}>Hitung Estimasi</Text>
        </TouchableOpacity>

        {result && <InvestmentResult result={result} colors={colors} styles={styles} onSave={saveResult} />}

        <DisclaimerBox colors={colors} styles={styles} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function InvestmentResult({ result, colors, styles, onSave }) {
  const { estimatedFinalValue, totalContribution, estimatedGrowth, realValueAfterInflation, rate, duration } = result;
  const growthPct = totalContribution > 0 ? ((estimatedGrowth / totalContribution) * 100).toFixed(0) : 0;

  return (
    <LinearGradient colors={[colors.brand + 'CC', colors.brand + '88']} style={styles.resultCard}>
      <View style={styles.resultRow}>
        <ResultStat label="Estimasi Nilai Akhir" value={formatRupiah(estimatedFinalValue)} large />
      </View>
      <View style={styles.resultGrid}>
        <ResultStat label="Total Diinvestasikan" value={formatRupiah(totalContribution)} />
        <ResultStat label="Estimasi Keuntungan" value={formatRupiah(estimatedGrowth)} highlight />
        <ResultStat label="Pertumbuhan" value={`+${growthPct}%`} highlight />
        <ResultStat label="Nilai Riil (vs inflasi)" value={formatRupiah(realValueAfterInflation)} />
      </View>
      <TouchableOpacity style={styles.saveBtn} onPress={onSave}>
        <Ionicons name="bookmark-outline" size={14} color="#fff" />
        <Text style={styles.saveBtnText}>Simpan Simulasi</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}

// ─── Expense Reduction Simulator ─────────────────────────────────────────────
function ExpenseTab({ colors, styles, db }) {
  const [currentExpense, setCurrentExpense] = useState('');
  const [newExpense, setNewExpense]         = useState('');
  const [currentCF, setCurrentCF]           = useState('');
  const [income, setIncome]                 = useState('');
  const [duration, setDuration]             = useState(60);
  const [result, setResult]                 = useState(null);

  const calculate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const cur  = parseCurrencyRaw(currentExpense) || 0;
    const nw   = parseCurrencyRaw(newExpense) || 0;
    const cf   = parseCurrencyRaw(currentCF) || 0;
    const inc  = parseCurrencyRaw(income) || 0;
    if (cur === 0 || nw >= cur) return Alert.alert('Cek Input', 'Pengeluaran baru harus lebih kecil dari saat ini.');

    const res = simulateExpenseReduction({ currentExpense: cur, newExpense: nw, currentCashFlow: cf, netIncome: inc, months: duration });
    setResult({ ...res, duration });
  };

  const saveResult = async () => {
    if (!result) return;
    try {
      await saveSimulation(db, {
        name: `Hemat ${formatRupiah(result.monthlySaving)}/bln`,
        type: 'whatif',
        input: { currentExpense, newExpense, currentCF, income, duration },
        result,
      });
      Alert.alert('Tersimpan!', 'Simulasi telah disimpan.');
    } catch (e) { Alert.alert('Error', 'Gagal menyimpan.'); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tabContent}>
        <Text style={styles.tabTitle}>✂️ Simulasi Pengurangan Pengeluaran</Text>
        <Text style={styles.tabSub}>Lihat dampak jika kamu mengurangi suatu pengeluaran</Text>

        <Text style={styles.fieldLabel}>Pengeluaran Saat Ini (Rp/bulan)</Text>
        <TextInput style={styles.input} keyboardType="number-pad" placeholder="mis: Rp 3.000.000" placeholderTextColor={colors.textFaint}
          value={currentExpense} onChangeText={v => setCurrentExpense(formatCurrencyInput(v))} />

        <Text style={styles.fieldLabel}>Pengeluaran Baru yang Ditarget (Rp/bulan)</Text>
        <TextInput style={styles.input} keyboardType="number-pad" placeholder="mis: Rp 1.500.000" placeholderTextColor={colors.textFaint}
          value={newExpense} onChangeText={v => setNewExpense(formatCurrencyInput(v))} />

        <Text style={styles.fieldLabel}>Cash Flow Bulan Ini (Rp) — opsional</Text>
        <TextInput style={styles.input} keyboardType="number-pad" placeholder="mis: Rp 2.000.000" placeholderTextColor={colors.textFaint}
          value={currentCF} onChangeText={v => setCurrentCF(formatCurrencyInput(v))} />

        <Text style={styles.fieldLabel}>Pendapatan Bulanan (Rp) — opsional</Text>
        <TextInput style={styles.input} keyboardType="number-pad" placeholder="mis: Rp 10.000.000" placeholderTextColor={colors.textFaint}
          value={income} onChangeText={v => setIncome(formatCurrencyInput(v))} />

        <Text style={styles.fieldLabel}>Proyeksi</Text>
        <View style={styles.durationRow}>
          {DURATION_OPTIONS.map(d => (
            <TouchableOpacity key={d.months}
              style={[styles.durationBtn, duration === d.months && { backgroundColor: colors.brand }]}
              onPress={() => setDuration(d.months)}>
              <Text style={[styles.durationLabel, { color: duration === d.months ? '#fff' : colors.textSecondary }]}>{d.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={[styles.calcBtn, { backgroundColor: colors.income }]} onPress={calculate}>
          <Ionicons name="calculator" size={18} color="#fff" />
          <Text style={styles.calcBtnText}>Hitung Dampak</Text>
        </TouchableOpacity>

        {result && (
          <LinearGradient colors={[colors.income + 'CC', colors.income + '88']} style={styles.resultCard}>
            <ResultStat label="Hemat / Bulan" value={formatRupiah(result.monthlySaving)} large />
            <View style={styles.resultGrid}>
              <ResultStat label="Hemat / Tahun" value={formatRupiah(result.annualSaving)} highlight />
              <ResultStat label={`Modal ${duration / 12} Tahun`} value={formatRupiah(result.capitalIn5Year)} highlight />
              {result.newSavingsRate > 0 && <ResultStat label="Savings Rate Baru" value={`${(result.newSavingsRate * 100).toFixed(1)}%`} />}
              {result.newCashFlow !== 0 && <ResultStat label="Cash Flow Baru" value={formatRupiah(result.newCashFlow)} />}
            </View>
            <TouchableOpacity style={styles.saveBtn} onPress={saveResult}>
              <Ionicons name="bookmark-outline" size={14} color="#fff" />
              <Text style={styles.saveBtnText}>Simpan Simulasi</Text>
            </TouchableOpacity>
          </LinearGradient>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Debt Payoff Simulator ────────────────────────────────────────────────────
function DebtTab({ colors, styles, db }) {
  const [principal, setPrincipal]   = useState('');
  const [rate, setRate]             = useState('');
  const [payment, setPayment]       = useState('');
  const [result, setResult]         = useState(null);

  const calculate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const p = parseCurrencyRaw(principal) || 0;
    const r = parseFloat(rate.replace(',', '.')) / 100 || 0;
    const m = parseCurrencyRaw(payment) || 0;
    if (p === 0 || m === 0) return Alert.alert('Input kosong', 'Masukkan nominal hutang dan cicilan bulanan.');

    const res = simulateDebtPayoff({ principal: p, annualInterestRate: r, monthlyPayment: m });
    setResult(res);
  };

  const saveResult = async () => {
    if (!result) return;
    try {
      await saveSimulation(db, {
        name: `Pelunasan Hutang ${formatRupiah(parseCurrencyRaw(principal))}`,
        type: 'debt_payoff',
        input: { principal, rate, payment },
        result,
      });
      Alert.alert('Tersimpan!', 'Simulasi telah disimpan.');
    } catch (e) { Alert.alert('Error', 'Gagal menyimpan.'); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tabContent}>
        <Text style={styles.tabTitle}>💳 Simulasi Pelunasan Hutang</Text>
        <Text style={styles.tabSub}>Hitung berapa lama dan berapa bunga yang akan dibayarkan</Text>

        <Text style={styles.fieldLabel}>Sisa Hutang / Pokok (Rp)</Text>
        <TextInput style={styles.input} keyboardType="number-pad" placeholder="mis: Rp 50.000.000" placeholderTextColor={colors.textFaint}
          value={principal} onChangeText={v => setPrincipal(formatCurrencyInput(v))} />

        <Text style={styles.fieldLabel}>Bunga Tahunan (%) — kosongkan jika 0%</Text>
        <TextInput style={styles.input} keyboardType="decimal-pad" placeholder="mis: 12" placeholderTextColor={colors.textFaint}
          value={rate} onChangeText={setRate} />

        <Text style={styles.fieldLabel}>Cicilan Bulanan (Rp)</Text>
        <TextInput style={styles.input} keyboardType="number-pad" placeholder="mis: Rp 2.000.000" placeholderTextColor={colors.textFaint}
          value={payment} onChangeText={v => setPayment(formatCurrencyInput(v))} />

        <TouchableOpacity style={[styles.calcBtn, { backgroundColor: '#EF4444' }]} onPress={calculate}>
          <Ionicons name="calculator" size={18} color="#fff" />
          <Text style={styles.calcBtnText}>Hitung Pelunasan</Text>
        </TouchableOpacity>

        {result && (
          <LinearGradient colors={['#EF4444CC', '#EF444488']} style={styles.resultCard}>
            {result.payoffMonths === null ? (
              <Text style={styles.resultWarning}>⚠️ Cicilan terlalu kecil untuk menutup bunga. Tambah jumlah cicilan.</Text>
            ) : (
              <>
                <ResultStat label="Lunas dalam" value={`${result.payoffMonths} bulan (${(result.payoffMonths / 12).toFixed(1)} tahun)`} large />
                <View style={styles.resultGrid}>
                  <ResultStat label="Total Bunga" value={formatRupiah(result.totalInterestPaid)} highlight />
                  <ResultStat label="Total Dibayar" value={formatRupiah(result.totalPaid)} />
                </View>
                <TouchableOpacity style={styles.saveBtn} onPress={saveResult}>
                  <Ionicons name="bookmark-outline" size={14} color="#fff" />
                  <Text style={styles.saveBtnText}>Simpan Simulasi</Text>
                </TouchableOpacity>
              </>
            )}
          </LinearGradient>
        )}

        <View style={[styles.infoBox, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Ionicons name="bulb-outline" size={16} color={colors.brand} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            <Text style={{ fontWeight: '700' }}>Strategi Debt Avalanche:</Text> Lunasi hutang dengan bunga tertinggi terlebih dahulu untuk menghemat total bunga.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Goal Timeline Simulator ──────────────────────────────────────────────────
function GoalTab({ colors, styles, db }) {
  const [target, setTarget]       = useState('');
  const [current, setCurrent]     = useState('');
  const [monthly, setMonthly]     = useState('');
  const [result, setResult]       = useState(null);

  const calculate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const t = parseCurrencyRaw(target) || 0;
    const c = parseCurrencyRaw(current) || 0;
    const m = parseCurrencyRaw(monthly) || 0;
    if (t === 0 || m === 0) return Alert.alert('Input kosong', 'Masukkan nominal target dan alokasi bulanan.');

    const res = simulateGoalTimeline({ targetAmount: t, currentAmount: c, monthlyAlloc: m });
    setResult(res);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tabContent}>
        <Text style={styles.tabTitle}>🎯 Simulasi Pencapaian Target</Text>
        <Text style={styles.tabSub}>Berapa lama untuk mencapai tujuan finansialmu?</Text>

        <Text style={styles.fieldLabel}>Target Dana (Rp)</Text>
        <TextInput style={styles.input} keyboardType="number-pad" placeholder="mis: Rp 60.000.000" placeholderTextColor={colors.textFaint}
          value={target} onChangeText={v => setTarget(formatCurrencyInput(v))} />

        <Text style={styles.fieldLabel}>Dana yang Sudah Terkumpul (Rp)</Text>
        <TextInput style={styles.input} keyboardType="number-pad" placeholder="Rp 0" placeholderTextColor={colors.textFaint}
          value={current} onChangeText={v => setCurrent(formatCurrencyInput(v))} />

        <Text style={styles.fieldLabel}>Alokasi Bulanan (Rp)</Text>
        <TextInput style={styles.input} keyboardType="number-pad" placeholder="mis: Rp 2.000.000" placeholderTextColor={colors.textFaint}
          value={monthly} onChangeText={v => setMonthly(formatCurrencyInput(v))} />

        <TouchableOpacity style={[styles.calcBtn, { backgroundColor: '#8b5cf6' }]} onPress={calculate}>
          <Ionicons name="calculator" size={18} color="#fff" />
          <Text style={styles.calcBtnText}>Hitung Waktu Pencapaian</Text>
        </TouchableOpacity>

        {result && (
          <LinearGradient colors={['#8b5cf6CC', '#8b5cf688']} style={styles.resultCard}>
            <ResultStat label="Perkiraan Selesai" value={`${result.estimatedMonths} bulan (${result.estimatedYears} tahun)`} large />
            <View style={styles.resultGrid}>
              <ResultStat label="Sisa Dana" value={formatRupiah(result.remainingAmount)} />
              <ResultStat label="Alokasi/Bulan" value={formatRupiah(parseCurrencyRaw(monthly))} />
            </View>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: 'rgba(255,255,255,0.2)', marginTop: 8 }]}
              onPress={() => Alert.alert('Buat Goal', 'Buka Goal Planner untuk membuat target ini secara resmi.')}>
              <Ionicons name="flag-outline" size={14} color="#fff" />
              <Text style={styles.saveBtnText}>Buat sebagai Goal →</Text>
            </TouchableOpacity>
          </LinearGradient>
        )}

        <DisclaimerBox colors={colors} styles={styles} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Shared components ────────────────────────────────────────────────────────
function ResultStat({ label, value, large, highlight }) {
  return (
    <View style={{ alignItems: 'center', flex: 1, paddingVertical: 6 }}>
      <Text style={{ fontSize: large ? 20 : 14, fontWeight: '900', color: '#fff', textAlign: 'center' }}>{value}</Text>
      <Text style={{ fontSize: 9, fontWeight: '600', color: 'rgba(255,255,255,0.75)', marginTop: 2, textAlign: 'center' }}>{label}</Text>
    </View>
  );
}

function DisclaimerBox({ colors, styles }) {
  return (
    <View style={[styles.disclaimer, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
      <Ionicons name="information-circle-outline" size={14} color={colors.textFaint} />
      <Text style={[styles.disclaimerText, { color: colors.textFaint }]}>
        ⚠️ Semua angka adalah <Text style={{ fontWeight: '700' }}>estimasi</Text> berdasarkan asumsi yang Anda masukkan. Bukan jaminan hasil investasi. Investasi mengandung risiko.
      </Text>
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  root: { flex: 1 },
  tabBar: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  tabBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border,
  },
  tabLabel: { fontSize: 13 },
  tabContent: { paddingHorizontal: 16, paddingBottom: 120 },
  tabTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, marginBottom: 4, letterSpacing: -0.3 },
  tabSub: { fontSize: 12, color: colors.textMuted, marginBottom: 20, lineHeight: 17 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, marginBottom: 8, letterSpacing: 0.3 },
  input: {
    padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 14,
    fontSize: 15, backgroundColor: colors.bgCard, color: colors.textPrimary, borderColor: colors.border,
  },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, marginRight: 8,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgCard,
  },
  chipText: { fontSize: 12, color: colors.textMuted },
  scenarioRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  scenarioBtn: {
    flex: 1, padding: 12, borderRadius: 12, borderWidth: 1,
    borderColor: colors.border, backgroundColor: colors.bgCard, alignItems: 'center',
  },
  scenarioBtnLabel: { fontSize: 11, color: colors.textSecondary, marginBottom: 4 },
  scenarioBtnRate: { fontSize: 13, fontWeight: '800' },
  durationRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  durationBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border,
  },
  durationLabel: { fontSize: 12, fontWeight: '700' },
  calcBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 14, marginBottom: 20, elevation: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4,
  },
  calcBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  resultCard: {
    borderRadius: 20, padding: 20, marginBottom: 20, overflow: 'hidden',
    elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10,
  },
  resultRow: { alignItems: 'center', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.2)', paddingBottom: 16 },
  resultGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  resultWarning: { color: '#fff', fontSize: 14, fontWeight: '700', textAlign: 'center', lineHeight: 22 },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.25)',
  },
  saveBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  infoBox: {
    flexDirection: 'row', gap: 10, padding: 14, borderRadius: 14,
    borderWidth: 1, marginTop: 8, alignItems: 'flex-start',
  },
  infoText: { flex: 1, fontSize: 12, lineHeight: 18 },
  disclaimer: { flexDirection: 'row', gap: 8, padding: 14, borderRadius: 12, borderWidth: 1, alignItems: 'flex-start', marginTop: 8 },
  disclaimerText: { flex: 1, fontSize: 11, lineHeight: 16 },
});
