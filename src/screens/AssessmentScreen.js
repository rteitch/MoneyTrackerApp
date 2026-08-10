/**
 * src/screens/AssessmentScreen.js
 *
 * Financial Profile Assessment — multi-step wizard to capture:
 * Step 1: Basic Profile (employment, dependents)
 * Step 2: Income Sources
 * Step 3: Fixed Expenses
 * Step 4: Summary → Run analysis
 */

import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useRef, useState } from 'react';
import {
  Alert, Animated, Dimensions, KeyboardAvoidingView,
  Platform, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppContext } from '../context/AppContext';
import {
  saveFinancialProfile, addIncomeSource, getIncomeSources,
  addFixedExpense, getFixedExpenses, saveFinancialAssessment,
  getMonthlyTransactionSummary, getTotalLiquidBalance, getFinancialGoals,
} from '../db/database';
import { runFinancialAnalysis } from '../utils/financialEngine';
import { runDiagnosis } from '../utils/diagnosisEngine';
import { formatCurrencyInput, parseCurrencyRaw as parseAmount } from '../utils/formatting';

const { width: SW } = Dimensions.get('window');
const TOTAL_STEPS = 4;

const EMPLOYMENT_OPTIONS = [
  { key: 'employee',  label: 'Karyawan Tetap', icon: 'briefcase' },
  { key: 'freelance', label: 'Freelancer',      icon: 'laptop' },
  { key: 'business',  label: 'Wirausaha',       icon: 'storefront' },
  { key: 'other',     label: 'Lainnya',         icon: 'person' },
];

const STABILITY_OPTIONS = [
  { key: 'stable',    label: 'Tetap',    sub: 'Gaji bulanan rutin', icon: 'checkmark-circle' },
  { key: 'variable',  label: 'Bervariasi', sub: 'Kadang naik/turun', icon: 'trending-up' },
  { key: 'irregular', label: 'Tidak Tentu', sub: 'Proyek/musiman', icon: 'shuffle' },
];

const INCOME_TYPES = [
  { key: 'salary',     label: 'Gaji / Upah' },
  { key: 'business',   label: 'Usaha / Bisnis' },
  { key: 'freelance',  label: 'Freelance / Proyek' },
  { key: 'rental',     label: 'Sewa Properti' },
  { key: 'investment', label: 'Dividen / Investasi' },
  { key: 'bonus',      label: 'Bonus / THR' },
  { key: 'other',      label: 'Lainnya' },
];

const EXPENSE_CATEGORIES = [
  { key: 'housing',        label: 'Tempat Tinggal', icon: 'home',        color: '#0ea5e9' },
  { key: 'food',           label: 'Makan & Minum',  icon: 'restaurant',  color: '#10B981' },
  { key: 'transportation', label: 'Transportasi',    icon: 'car',         color: '#f59e0b' },
  { key: 'debt',           label: 'Cicilan / Hutang',icon: 'card',        color: '#EF4444' },
  { key: 'education',      label: 'Pendidikan',      icon: 'school',      color: '#6366f1' },
  { key: 'health',         label: 'Kesehatan',       icon: 'medical',     color: '#06b6d4' },
  { key: 'insurance',      label: 'Asuransi',        icon: 'shield-checkmark', color: '#84cc16' },
  { key: 'lifestyle',      label: 'Gaya Hidup',      icon: 'color-palette', color: '#8b5cf6' },
  { key: 'family',         label: 'Keluarga',        icon: 'people',      color: '#ec4899' },
  { key: 'other',          label: 'Lainnya',         icon: 'ellipsis-horizontal', color: '#94a3b8' },
];

export default function AssessmentScreen({ navigation }) {
  const db = useSQLiteContext();
  const { colors } = useAppContext();
  const styles = makeStyles(colors);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Step 1: Profile
  const [employment, setEmployment]     = useState('employee');
  const [stability, setStability]       = useState('stable');
  const [dependents, setDependents]     = useState('0');
  const [age, setAge]                   = useState('');

  // Step 2: Income sources
  const [incomes, setIncomes] = useState([{ name: 'Gaji Pokok', type: 'salary', amount: '', frequency: 'monthly' }]);

  // Step 3: Fixed expenses
  const [expenses, setExpenses] = useState([
    { name: 'Sewa / Kos', category: 'housing', amount: '', necessity_level: 'essential' },
    { name: 'Makan Sehari-hari', category: 'food', amount: '', necessity_level: 'essential' },
    { name: 'Transportasi', category: 'transportation', amount: '', necessity_level: 'essential' },
  ]);

  // ── Navigation ─────────────────────────────────────────────────────────────
  const goNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = step + 1;
    Animated.timing(slideAnim, { toValue: -SW * step, duration: 0, useNativeDriver: true }).start();
    setStep(next);
  };

  const goBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep(s => Math.max(0, s - 1));
  };

  // ── Income helpers ─────────────────────────────────────────────────────────
  const addIncome = () => setIncomes(prev => [...prev, { name: '', type: 'salary', amount: '', frequency: 'monthly' }]);
  const updateIncome = (i, field, val) => setIncomes(prev => prev.map((inc, idx) => idx === i ? { ...inc, [field]: val } : inc));
  const removeIncome = (i) => setIncomes(prev => prev.filter((_, idx) => idx !== i));

  // ── Expense helpers ────────────────────────────────────────────────────────
  const addExpense = () => setExpenses(prev => [...prev, { name: '', category: 'other', amount: '', necessity_level: 'essential' }]);
  const updateExpense = (i, field, val) => setExpenses(prev => prev.map((ex, idx) => idx === i ? { ...ex, [field]: val } : ex));
  const removeExpense = (i) => setExpenses(prev => prev.filter((_, idx) => idx !== i));

  // ── Calculate total monthly income ────────────────────────────────────────
  const totalMonthlyIncome = incomes.reduce((sum, inc) => {
    const amt = parseAmount(inc.amount) || 0;
    const monthly = inc.frequency === 'annual' ? amt / 12 : inc.frequency === 'weekly' ? amt * 4 : amt;
    return sum + monthly;
  }, 0);

  const totalMonthlyExpense = expenses.reduce((sum, ex) => sum + (parseAmount(ex.amount) || 0), 0);

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    setLoading(true);
    try {
      // Save profile
      await saveFinancialProfile(db, {
        monthly_income:   totalMonthlyIncome,
        income_stability: stability,
        employment_type:  employment,
        marital_status:   'single',
        dependents:       parseInt(dependents) || 0,
        age:              parseInt(age) || null,
        location_type:    'city',
      });

      // Save income sources
      for (const inc of incomes) {
        if (parseAmount(inc.amount) > 0) {
          await addIncomeSource(db, { ...inc, amount: parseAmount(inc.amount) });
        }
      }

      // Save fixed expenses
      for (const ex of expenses) {
        if (parseAmount(ex.amount) > 0) {
          await addFixedExpense(db, { ...ex, amount: parseAmount(ex.amount) });
        }
      }

      // Run analysis immediately
      const now = new Date();
      const txData = await getMonthlyTransactionSummary(db, now.getMonth() + 1, now.getFullYear());
      const liquidBalance = await getTotalLiquidBalance(db);
      const goals = await getFinancialGoals(db, 'active');
      const allFixedExpenses = await getFixedExpenses(db);
      const profile = {
        monthly_income: totalMonthlyIncome,
        income_stability: stability,
        employment_type: employment,
      };

      const analysis = runFinancialAnalysis(
        { transactions: txData, profile, fixedExpenses: allFixedExpenses, debts: [], goals, liquidBalance },
        now.getMonth() + 1,
        now.getFullYear()
      );
      const diagnoses = runDiagnosis(analysis);

      await saveFinancialAssessment(db, {
        period_month: now.getMonth() + 1,
        period_year: now.getFullYear(),
        ...analysis,
        diagnoses,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.replace('Planner', { freshAnalysis: { ...analysis, diagnoses } });
    } catch (e) {
      console.error('Assessment error:', e);
      Alert.alert('Error', 'Gagal menyimpan data. Coba lagi.');
    } finally {
      setLoading(false);
    }
  }, [db, employment, stability, dependents, age, incomes, expenses, navigation]);

  // ── Render Steps ───────────────────────────────────────────────────────────
  const renderStep0 = () => (
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 60 + insets.bottom }}>
      <Text style={styles.stepTitle}>Profil Dasar</Text>
      <Text style={styles.stepSub}>Informasi ini membantu analisis lebih akurat</Text>

      <Text style={styles.fieldLabel}>Jenis Pekerjaan</Text>
      <View style={styles.optionGrid}>
        {EMPLOYMENT_OPTIONS.map(o => (
          <TouchableOpacity
            key={o.key}
            style={[styles.optionCard, employment === o.key && { borderColor: colors.brand, backgroundColor: colors.brandBg }]}
            onPress={() => setEmployment(o.key)}
          >
            <Ionicons name={o.icon} size={20} color={employment === o.key ? colors.brand : colors.textMuted} />
            <Text style={[styles.optionLabel, employment === o.key && { color: colors.brand, fontWeight: '700' }]}>{o.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.fieldLabel}>Stabilitas Pendapatan</Text>
      {STABILITY_OPTIONS.map(o => (
        <TouchableOpacity
          key={o.key}
          style={[styles.radioRow, stability === o.key && { borderColor: colors.brand, backgroundColor: colors.brandBg }]}
          onPress={() => setStability(o.key)}
        >
          <View style={[styles.radioCircle, stability === o.key && { borderColor: colors.brand }]}>
            {stability === o.key && <View style={[styles.radioDot, { backgroundColor: colors.brand }]} />}
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.radioLabel, stability === o.key && { color: colors.brand }]}>{o.label}</Text>
            <Text style={styles.radioSub}>{o.sub}</Text>
          </View>
          <Ionicons name={o.icon} size={18} color={stability === o.key ? colors.brand : colors.textMuted} />
        </TouchableOpacity>
      ))}

      <View style={styles.row2}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={styles.fieldLabel}>Usia</Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            placeholder="mis: 27"
            placeholderTextColor={colors.textFaint}
            value={age}
            onChangeText={setAge}
            maxLength={3}
          />
        </View>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.fieldLabel}>Jumlah Tanggungan</Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={colors.textFaint}
            value={dependents}
            onChangeText={setDependents}
            maxLength={2}
          />
        </View>
      </View>
    </ScrollView>
  );

  const renderStep1 = () => (
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 60 + insets.bottom }}>
      <Text style={styles.stepTitle}>Sumber Pendapatan</Text>
      <Text style={styles.stepSub}>Masukkan pendapatan bulanan bersih (setelah pajak)</Text>

      {incomes.map((inc, i) => (
        <View key={i} style={styles.itemCard}>
          <View style={styles.itemHeader}>
            <Text style={styles.itemNum}>#{i + 1}</Text>
            {incomes.length > 1 && (
              <TouchableOpacity onPress={() => removeIncome(i)}>
                <Ionicons name="trash-outline" size={16} color={colors.expense} />
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.fieldLabel}>Nama</Text>
          <TextInput
            style={styles.input}
            placeholder="mis: Gaji BRI"
            placeholderTextColor={colors.textFaint}
            value={inc.name}
            onChangeText={v => updateIncome(i, 'name', v)}
          />
          <Text style={styles.fieldLabel}>Tipe</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            {INCOME_TYPES.map(t => (
              <TouchableOpacity
                key={t.key}
                style={[styles.chip, inc.type === t.key && { backgroundColor: colors.brandBg, borderColor: colors.brand }]}
                onPress={() => updateIncome(i, 'type', t.key)}
              >
                <Text style={[styles.chipText, inc.type === t.key && { color: colors.brand, fontWeight: '700' }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={styles.fieldLabel}>Nominal (Rp)</Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            placeholder="Rp 0"
            placeholderTextColor={colors.textFaint}
            value={inc.amount}
            onChangeText={v => updateIncome(i, 'amount', formatCurrencyInput(v))}
          />
        </View>
      ))}

      <TouchableOpacity style={[styles.addBtn, { borderColor: colors.brand }]} onPress={addIncome}>
        <Ionicons name="add-circle-outline" size={18} color={colors.brand} />
        <Text style={[styles.addBtnText, { color: colors.brand }]}>Tambah Sumber Pendapatan</Text>
      </TouchableOpacity>

      {totalMonthlyIncome > 0 && (
        <View style={[styles.totalRow, { backgroundColor: colors.brandBg, borderColor: colors.brand }]}>
          <Text style={[styles.totalLabel, { color: colors.brand }]}>Total Pendapatan Bulanan</Text>
          <Text style={[styles.totalVal, { color: colors.brand }]}>Rp {totalMonthlyIncome.toLocaleString('id')}</Text>
        </View>
      )}
    </ScrollView>
  );

  const renderStep2 = () => (
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 60 + insets.bottom }}>
      <Text style={styles.stepTitle}>Pengeluaran Tetap Bulanan</Text>
      <Text style={styles.stepSub}>Pengeluaran yang wajib dibayar setiap bulan (Sewa, Makan, Cicilan, dll)</Text>

      {expenses.map((ex, i) => (
        <View key={i} style={styles.itemCard}>
          <View style={styles.itemHeader}>
            <View style={[styles.catDot, { backgroundColor: EXPENSE_CATEGORIES.find(c => c.key === ex.category)?.color || '#94a3b8' }]} />
            {expenses.length > 1 && (
              <TouchableOpacity onPress={() => removeExpense(i)}>
                <Ionicons name="trash-outline" size={16} color={colors.expense} />
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.fieldLabel}>Nama Pengeluaran</Text>
          <TextInput
            style={styles.input}
            placeholder="mis: Kos / Kontrakan"
            placeholderTextColor={colors.textFaint}
            value={ex.name}
            onChangeText={v => updateExpense(i, 'name', v)}
          />
          <Text style={styles.fieldLabel}>Kategori</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            {EXPENSE_CATEGORIES.map(c => (
              <TouchableOpacity
                key={c.key}
                style={[styles.chip, ex.category === c.key && { backgroundColor: c.color + '20', borderColor: c.color }]}
                onPress={() => updateExpense(i, 'category', c.key)}
              >
                <Ionicons name={c.icon} size={12} color={ex.category === c.key ? c.color : colors.textMuted} style={{ marginRight: 4 }} />
                <Text style={[styles.chipText, ex.category === c.key && { color: c.color, fontWeight: '700' }]}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={styles.fieldLabel}>Nominal / Bulan (Rp)</Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            placeholder="Rp 0"
            placeholderTextColor={colors.textFaint}
            value={ex.amount}
            onChangeText={v => updateExpense(i, 'amount', formatCurrencyInput(v))}
          />
        </View>
      ))}

      <TouchableOpacity style={[styles.addBtn, { borderColor: colors.income }]} onPress={addExpense}>
        <Ionicons name="add-circle-outline" size={18} color={colors.income} />
        <Text style={[styles.addBtnText, { color: colors.income }]}>Tambah Pengeluaran</Text>
      </TouchableOpacity>

      {totalMonthlyExpense > 0 && (
        <View style={[styles.totalRow, { backgroundColor: colors.expenseBg, borderColor: colors.expense }]}>
          <Text style={[styles.totalLabel, { color: colors.expense }]}>Total Pengeluaran Tetap / Bulan</Text>
          <Text style={[styles.totalVal, { color: colors.expense }]}>Rp {totalMonthlyExpense.toLocaleString('id')}</Text>
        </View>
      )}
    </ScrollView>
  );

  const renderStep3 = () => {
    const cf = totalMonthlyIncome - totalMonthlyExpense;
    return (
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 60 + insets.bottom }}>
        <Text style={styles.stepTitle}>Ringkasan</Text>
        <Text style={styles.stepSub}>Periksa sebelum menghitung skor</Text>

        <View style={[styles.summaryCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <SummaryRow label="Pendapatan Bulanan" value={`Rp ${totalMonthlyIncome.toLocaleString('id')}`} color={colors.income} />
          <SummaryRow label="Pengeluaran Tetap" value={`Rp ${totalMonthlyExpense.toLocaleString('id')}`} color={colors.expense} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SummaryRow
            label="Estimasi Cash Flow"
            value={`${cf >= 0 ? '+' : ''}Rp ${cf.toLocaleString('id')}`}
            color={cf >= 0 ? colors.income : colors.expense}
            bold
          />
        </View>

        {cf < 0 && (
          <View style={[styles.warningBox, { backgroundColor: colors.expenseBg, borderColor: colors.expense + '60' }]}>
            <Ionicons name="warning" size={16} color={colors.expense} />
            <Text style={[styles.warningText, { color: colors.expense }]}>
              Cash flow negatif terdeteksi. Analisis akan menampilkan rekomendasi untuk memperbaiki kondisi ini.
            </Text>
          </View>
        )}

        <Text style={[styles.note, { color: colors.textMuted }]}>
          ✓ Data disimpan hanya di perangkat ini{'\n'}
          ✓ Analisis sepenuhnya offline{'\n'}
          ✓ Tidak ada data yang dikirim ke server
        </Text>
      </ScrollView>
    );
  };

  const steps = [renderStep0, renderStep1, renderStep2, renderStep3];
  const stepLabels = ['Profil', 'Pendapatan', 'Pengeluaran', 'Selesai'];
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.bgPrimary }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 20}
    >
      {/* Progress */}
      <View style={styles.progressWrapper}>
        {stepLabels.map((label, i) => (
          <View key={i} style={styles.progressStep}>
            <View style={[styles.progressDot,
              i < step  && { backgroundColor: colors.brand },
              i === step && { backgroundColor: colors.brand, width: 28, height: 28, borderRadius: 14 },
              i > step  && { backgroundColor: colors.bgElevated },
            ]}>
              {i < step
                ? <Ionicons name="checkmark" size={12} color="#fff" />
                : <Text style={[styles.progressNum, { color: i <= step ? '#fff' : colors.textMuted }]}>{i + 1}</Text>
              }
            </View>
            <Text style={[styles.progressLabel, i === step && { color: colors.brand, fontWeight: '700' }]}>{label}</Text>
            {i < TOTAL_STEPS - 1 && <View style={[styles.progressLine, { backgroundColor: i < step ? colors.brand : colors.bgElevated }]} />}
          </View>
        ))}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {steps[step]?.()}
      </View>

      {/* Footer */}
      <View
        style={[
          styles.footer,
          {
            borderTopColor: colors.border,
            backgroundColor: colors.bgCard,
            paddingBottom: Math.max(16, insets.bottom + 12),
          },
        ]}
      >
        {step > 0 && (
          <TouchableOpacity style={[styles.btnSecondary, { borderColor: colors.border }]} onPress={goBack}>
            <Text style={[styles.btnSecondaryText, { color: colors.textSecondary }]}>← Kembali</Text>
          </TouchableOpacity>
        )}
        {step < TOTAL_STEPS - 1 ? (
          <TouchableOpacity
            style={[styles.btnPrimary, { backgroundColor: colors.brand, flex: step > 0 ? 1 : undefined, marginLeft: step > 0 ? 12 : 0 }]}
            onPress={goNext}
          >
            <Text style={styles.btnPrimaryText}>Lanjut →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.btnPrimary, { backgroundColor: colors.brand, flex: 1, marginLeft: step > 0 ? 12 : 0, opacity: loading ? 0.7 : 1 }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Ionicons name="analytics" size={18} color="#fff" />
            <Text style={styles.btnPrimaryText}>{loading ? 'Menghitung...' : 'Hitung Skor Keuangan'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

function SummaryRow({ label, value, color, bold }) {
  const { colors } = useAppContext();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 }}>
      <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{label}</Text>
      <Text style={{ color: color || colors.textPrimary, fontSize: 14, fontWeight: bold ? '800' : '600' }}>{value}</Text>
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  root: { flex: 1 },
  progressWrapper: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  progressStep: { alignItems: 'center', flex: 1, position: 'relative' },
  progressDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  progressNum: { fontSize: 11, fontWeight: '700' },
  progressLabel: { fontSize: 10, color: colors.textMuted, fontWeight: '600' },
  progressLine: { position: 'absolute', top: 12, left: '60%', right: '-40%', height: 2 },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
  stepTitle: { fontSize: 22, fontWeight: '800', color: colors.textPrimary, marginBottom: 6, letterSpacing: -0.5 },
  stepSub: { fontSize: 13, color: colors.textMuted, marginBottom: 20, lineHeight: 18 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, marginBottom: 8, letterSpacing: 0.3 },
  input: {
    padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 14,
    fontSize: 14, backgroundColor: colors.bgCard,
    color: colors.textPrimary, borderColor: colors.border,
  },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  optionCard: {
    width: '47%', padding: 14, borderRadius: 14, borderWidth: 1,
    borderColor: colors.border, backgroundColor: colors.bgCard,
    alignItems: 'center', gap: 6,
  },
  optionLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, textAlign: 'center' },
  radioRow: {
    flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1,
    borderColor: colors.border, backgroundColor: colors.bgCard, marginBottom: 10,
  },
  radioCircle: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  radioLabel: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  radioSub: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  row2: { flexDirection: 'row' },
  itemCard: { backgroundColor: colors.bgCard, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  itemNum: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  catDot: { width: 12, height: 12, borderRadius: 6 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, marginRight: 8,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgCard,
    flexDirection: 'row', alignItems: 'center',
  },
  chipText: { fontSize: 12, color: colors.textMuted },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: 14, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', marginBottom: 16,
  },
  addBtnText: { fontSize: 13, fontWeight: '700' },
  totalRow: { borderRadius: 14, padding: 16, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 13, fontWeight: '600' },
  totalVal: { fontSize: 15, fontWeight: '800' },
  summaryCard: { borderRadius: 18, padding: 16, borderWidth: 1, marginBottom: 16 },
  divider: { height: 1, marginVertical: 8 },
  warningBox: { flexDirection: 'row', gap: 8, padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 16, alignItems: 'flex-start' },
  warningText: { flex: 1, fontSize: 12, lineHeight: 18 },
  note: { fontSize: 12, lineHeight: 20, textAlign: 'center', padding: 16, borderRadius: 12, backgroundColor: colors.bgCard },
  footer: { flexDirection: 'row', padding: 16, borderTopWidth: 1 },
  btnPrimary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, paddingHorizontal: 24, borderRadius: 14, gap: 8,
  },
  btnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  btnSecondary: {
    paddingVertical: 14, paddingHorizontal: 20, borderRadius: 14, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  btnSecondaryText: { fontSize: 14, fontWeight: '600' },
});
