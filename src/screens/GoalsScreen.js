/**
 * src/screens/GoalsScreen.js
 *
 * Phase 4 — Financial Goal Planner
 * List, add, track, and contribute to financial goals.
 * Fully offline with SQLite.
 */

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Modal, Platform,
  RefreshControl, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppContext } from '../context/AppContext';
import {
  getFinancialGoals, addFinancialGoal, updateFinancialGoal,
  deleteFinancialGoal, contributeToGoal,
} from '../db/database';
import { simulateGoalTimeline } from '../utils/financialEngine';
import { formatRupiah } from '../utils/formatting';
import { formatCurrencyInput, parseCurrencyRaw } from '../utils/formatting';

const GOAL_TYPES = [
  { key: 'emergency_fund', label: 'Dana Darurat',  emoji: '🛡️', color: '#10B981' },
  { key: 'house',          label: 'Rumah / DP',    emoji: '🏠', color: '#0ea5e9' },
  { key: 'vehicle',        label: 'Kendaraan',     emoji: '🚗', color: '#f59e0b' },
  { key: 'education',      label: 'Pendidikan',    emoji: '🎓', color: '#6366f1' },
  { key: 'wedding',        label: 'Pernikahan',    emoji: '💍', color: '#ec4899' },
  { key: 'vacation',       label: 'Liburan',       emoji: '✈️', color: '#06b6d4' },
  { key: 'business',       label: 'Modal Usaha',   emoji: '💼', color: '#f97316' },
  { key: 'retirement',     label: 'Pensiun',       emoji: '🌴', color: '#84cc16' },
  { key: 'custom',         label: 'Lainnya',       emoji: '⭐', color: '#8b5cf6' },
];

const STATUS_LABELS = {
  active:    { label: 'Aktif',     color: '#10B981' },
  paused:    { label: 'Dijeda',    color: '#f59e0b' },
  completed: { label: 'Selesai 🎉', color: '#0ea5e9' },
};

export default function GoalsScreen({ navigation }) {
  const db = useSQLiteContext();
  const { colors } = useAppContext();
  const styles = makeStyles(colors);

  const [goals, setGoals]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm]   = useState(false);
  const [showContrib, setShowContrib] = useState(null); // goal object
  const [editGoal, setEditGoal]   = useState(null);

  // Form state
  const [form, setForm] = useState({ name: '', type: 'emergency_fund', target_amount: '', current_amount: '', monthly_alloc: '', target_date: '' });

  const loadGoals = useCallback(async () => {
    try {
      const all = await getFinancialGoals(db, 'all');
      setGoals(all);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [db]);

  useFocusEffect(useCallback(() => { loadGoals(); }, [loadGoals]));

  const openForm = (goal = null) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (goal) {
      setEditGoal(goal);
      setForm({
        name: goal.name, type: goal.type,
        target_amount: goal.target_amount.toString(),
        current_amount: goal.current_amount.toString(),
        monthly_alloc: goal.monthly_alloc.toString(),
        target_date: goal.target_date || '',
      });
    } else {
      setEditGoal(null);
      setForm({ name: '', type: 'emergency_fund', target_amount: '', current_amount: '', monthly_alloc: '', target_date: '' });
    }
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return Alert.alert('Nama kosong', 'Masukkan nama tujuan finansial.');
    const target = parseCurrencyRaw(form.target_amount) || 0;
    if (target === 0) return Alert.alert('Target kosong', 'Masukkan nominal target.');

    const payload = {
      name: form.name.trim(),
      type: form.type,
      target_amount: target,
      current_amount: parseCurrencyRaw(form.current_amount) || 0,
      monthly_alloc: parseCurrencyRaw(form.monthly_alloc) || 0,
      target_date: form.target_date || null,
      priority: 1,
      status: 'active',
    };

    try {
      if (editGoal) {
        await updateFinancialGoal(db, editGoal.id, { ...editGoal, ...payload });
      } else {
        await addFinancialGoal(db, payload);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowForm(false);
      loadGoals();
    } catch (e) { Alert.alert('Error', 'Gagal menyimpan goal.'); }
  };

  const handleDelete = (goal) => {
    Alert.alert('Hapus Goal', `Hapus "${goal.name}"?`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus', style: 'destructive',
        onPress: async () => {
          await deleteFinancialGoal(db, goal.id);
          loadGoals();
        },
      },
    ]);
  };

  const handleToggleStatus = async (goal) => {
    const newStatus = goal.status === 'active' ? 'paused' : 'active';
    await updateFinancialGoal(db, goal.id, { ...goal, status: newStatus });
    loadGoals();
  };

  const handleContribute = async (amount) => {
    if (!showContrib) return;
    try {
      await contributeToGoal(db, showContrib.id, parseCurrencyRaw(amount) || 0);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowContrib(null);
      loadGoals();
    } catch (e) { Alert.alert('Error', 'Gagal menambah kontribusi.'); }
  };

  const activeGoals    = goals.filter(g => g.status === 'active');
  const pausedGoals    = goals.filter(g => g.status === 'paused');
  const completedGoals = goals.filter(g => g.status === 'completed');
  const totalCurrent = goals.reduce((s, g) => s + g.current_amount, 0);
  const totalTarget = goals.reduce((s, g) => s + g.target_amount, 0);

  return (
    <View style={[styles.root, { backgroundColor: colors.bgPrimary }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadGoals(); }} tintColor={colors.brand} />}
      >
        {/* Total Target Banner */}
        {activeGoals.length > 0 && (
          <LinearGradient colors={[colors.brand, '#0284c7']} style={styles.summaryBanner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryVal}>{formatRupiah(totalCurrent)}</Text>
              <Text style={styles.summaryLabel}>Terkumpul</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryVal}>{formatRupiah(totalTarget)}</Text>
              <Text style={styles.summaryLabel}>Total Target</Text>
            </View>
          </LinearGradient>
        )}

        {/* Empty State */}
        {goals.length === 0 && !loading && (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyEmoji}>🎯</Text>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Belum Ada Target Finansial</Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>
              Buat target seperti Dana Darurat, DP Rumah, atau Liburan untuk melacak progres tabunganmu.
            </Text>
          </View>
        )}

        {/* Active Goals */}
        {activeGoals.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>🎯 Target Aktif ({activeGoals.length})</Text>
            {activeGoals.map(g => <GoalCard key={g.id} goal={g} colors={colors} styles={styles}
              onEdit={() => openForm(g)} onDelete={() => handleDelete(g)}
              onContribute={() => setShowContrib(g)} onToggle={() => handleToggleStatus(g)} />)}
          </>
        )}

        {pausedGoals.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>⏸ Dijeda</Text>
            {pausedGoals.map(g => <GoalCard key={g.id} goal={g} colors={colors} styles={styles}
              onEdit={() => openForm(g)} onDelete={() => handleDelete(g)}
              onContribute={() => setShowContrib(g)} onToggle={() => handleToggleStatus(g)} />)}
          </>
        )}

        {completedGoals.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>✅ Selesai</Text>
            {completedGoals.map(g => <GoalCard key={g.id} goal={g} colors={colors} styles={styles}
              onEdit={() => openForm(g)} onDelete={() => handleDelete(g)}
              onContribute={null} onToggle={null} />)}
          </>
        )}
      </ScrollView>

      {/* FAB Add Button */}
      <TouchableOpacity style={[styles.fab, { backgroundColor: colors.brand, bottom: 80 + insets.bottom }]} onPress={() => openForm()}>
        <Ionicons name="add" size={26} color="#fff" />
      </TouchableOpacity>

      {/* Add/Edit Form Modal */}
      <GoalFormModal
        visible={showForm}
        onClose={() => setShowForm(false)}
        onSave={handleSave}
        form={form}
        setForm={setForm}
        isEdit={!!editGoal}
        colors={colors}
        styles={styles}
      />

      {/* Contribute Modal */}
      {showContrib && (
        <ContributeModal
          goal={showContrib}
          onClose={() => setShowContrib(null)}
          onContribute={handleContribute}
          colors={colors}
          styles={styles}
        />
      )}
    </View>
  );
}

// ─── Goal Card ────────────────────────────────────────────────────────────────
function GoalCard({ goal, colors, styles, onEdit, onDelete, onContribute, onToggle }) {
  const typeInfo = GOAL_TYPES.find(t => t.key === goal.type) || GOAL_TYPES[GOAL_TYPES.length - 1];
  const pct = goal.target_amount > 0 ? Math.min(100, (goal.current_amount / goal.target_amount) * 100) : 0;
  const remaining = goal.target_amount - goal.current_amount;

  // Timeline estimate
  const timeline = goal.monthly_alloc > 0 && remaining > 0
    ? simulateGoalTimeline({ targetAmount: goal.target_amount, currentAmount: goal.current_amount, monthlyAlloc: goal.monthly_alloc })
    : null;

  return (
    <View style={[styles.goalCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
      {/* Header */}
      <View style={styles.goalHeader}>
        <View style={[styles.goalEmoji, { backgroundColor: typeInfo.color + '20' }]}>
          <Text style={styles.goalEmojiText}>{typeInfo.emoji}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.goalName, { color: colors.textPrimary }]} numberOfLines={1}>{goal.name}</Text>
          <View style={styles.goalMeta}>
            <Text style={[styles.goalType, { color: typeInfo.color }]}>{typeInfo.label}</Text>
            <View style={[styles.statusBadge, { backgroundColor: STATUS_LABELS[goal.status]?.color + '20' }]}>
              <Text style={[styles.statusText, { color: STATUS_LABELS[goal.status]?.color }]}>
                {STATUS_LABELS[goal.status]?.label}
              </Text>
            </View>
          </View>
        </View>
        {/* Actions */}
        <View style={styles.goalActions}>
          {onEdit    && <TouchableOpacity onPress={onEdit}   style={styles.actionIcon}><Ionicons name="pencil-outline" size={15} color={colors.textMuted} /></TouchableOpacity>}
          {onDelete  && <TouchableOpacity onPress={onDelete} style={styles.actionIcon}><Ionicons name="trash-outline" size={15} color={colors.expense}   /></TouchableOpacity>}
        </View>
      </View>

      {/* Progress */}
      <View style={styles.progressSection}>
        <View style={styles.progressLabelRow}>
          <Text style={[styles.progressCurrent, { color: typeInfo.color }]}>{formatRupiah(goal.current_amount)}</Text>
          <Text style={[styles.progressTarget, { color: colors.textMuted }]}>/ {formatRupiah(goal.target_amount)}</Text>
          <Text style={[styles.progressPct, { color: typeInfo.color }]}>{pct.toFixed(0)}%</Text>
        </View>
        <View style={[styles.progressBg, { backgroundColor: colors.bgElevated }]}>
          <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: typeInfo.color }]} />
        </View>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        {remaining > 0 && (
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: colors.textSecondary }]}>{formatRupiah(remaining)}</Text>
            <Text style={[styles.statLabel, { color: colors.textFaint }]}>Sisa</Text>
          </View>
        )}
        {goal.monthly_alloc > 0 && (
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: colors.textSecondary }]}>{formatRupiah(goal.monthly_alloc)}</Text>
            <Text style={[styles.statLabel, { color: colors.textFaint }]}>/ bulan</Text>
          </View>
        )}
        {timeline && (
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: colors.brand }]}>{timeline.estimatedMonths} bln</Text>
            <Text style={[styles.statLabel, { color: colors.textFaint }]}>estimasi selesai</Text>
          </View>
        )}
        {goal.target_date && (
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: colors.textSecondary }]}>{goal.target_date}</Text>
            <Text style={[styles.statLabel, { color: colors.textFaint }]}>target tgl</Text>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      {goal.status !== 'completed' && (
        <View style={styles.cardBtns}>
          {onContribute && (
            <TouchableOpacity style={[styles.cardBtn, { backgroundColor: typeInfo.color + '18', borderColor: typeInfo.color + '40' }]} onPress={onContribute}>
              <Ionicons name="add-circle-outline" size={15} color={typeInfo.color} />
              <Text style={[styles.cardBtnText, { color: typeInfo.color }]}>Tambah Dana</Text>
            </TouchableOpacity>
          )}
          {onToggle && (
            <TouchableOpacity style={[styles.cardBtn, { backgroundColor: colors.bgElevated, borderColor: colors.border }]} onPress={onToggle}>
              <Ionicons name={goal.status === 'active' ? 'pause-circle-outline' : 'play-circle-outline'} size={15} color={colors.textMuted} />
              <Text style={[styles.cardBtnText, { color: colors.textMuted }]}>{goal.status === 'active' ? 'Jeda' : 'Aktifkan'}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Goal Form Modal ──────────────────────────────────────────────────────────
function GoalFormModal({ visible, onClose, onSave, form, setForm, isEdit, colors, styles }) {
  const insets = useSafeAreaInsets();
  const setField = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.bgPrimary }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.modalHeader, { borderBottomColor: colors.border, paddingTop: Math.max(16, insets.top) }]}>
          <TouchableOpacity onPress={onClose}><Text style={[styles.modalCancel, { color: colors.textMuted }]}>Batal</Text></TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{isEdit ? 'Edit Target' : 'Target Baru'}</Text>
          <TouchableOpacity onPress={onSave}><Text style={[styles.modalSave, { color: colors.brand }]}>Simpan</Text></TouchableOpacity>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingBottom: 60 + insets.bottom }}>
          {/* Goal Type */}
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Tipe Tujuan</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {GOAL_TYPES.map(t => (
              <TouchableOpacity key={t.key}
                style={[styles.typeChip, form.type === t.key && { backgroundColor: t.color + '20', borderColor: t.color }]}
                onPress={() => setField('type', t.key)}>
                <Text style={styles.typeEmoji}>{t.emoji}</Text>
                <Text style={[styles.typeChipLabel, form.type === t.key && { color: t.color, fontWeight: '700' }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Nama Tujuan *</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.bgCard, color: colors.textPrimary, borderColor: colors.border }]}
            placeholder="mis: Dana Darurat 6 Bulan" placeholderTextColor={colors.textFaint}
            value={form.name} onChangeText={v => setField('name', v)} />

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Target Dana (Rp) *</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.bgCard, color: colors.textPrimary, borderColor: colors.border }]}
            keyboardType="number-pad" placeholder="Rp 0" placeholderTextColor={colors.textFaint}
            value={form.target_amount} onChangeText={v => setField('target_amount', formatCurrencyInput(v))} />

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Dana yang Sudah Ada (Rp)</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.bgCard, color: colors.textPrimary, borderColor: colors.border }]}
            keyboardType="number-pad" placeholder="Rp 0" placeholderTextColor={colors.textFaint}
            value={form.current_amount} onChangeText={v => setField('current_amount', formatCurrencyInput(v))} />

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Alokasi Bulanan (Rp)</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.bgCard, color: colors.textPrimary, borderColor: colors.border }]}
            keyboardType="number-pad" placeholder="Rp 0" placeholderTextColor={colors.textFaint}
            value={form.monthly_alloc} onChangeText={v => setField('monthly_alloc', formatCurrencyInput(v))} />

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Target Tanggal (YYYY-MM)</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.bgCard, color: colors.textPrimary, borderColor: colors.border }]}
            placeholder="mis: 2025-12" placeholderTextColor={colors.textFaint}
            value={form.target_date} onChangeText={v => setField('target_date', v)} />

          {/* Live timeline preview */}
          {parseCurrencyRaw(form.target_amount) > 0 && parseCurrencyRaw(form.monthly_alloc) > 0 && (() => {
            const tl = simulateGoalTimeline({
              targetAmount: parseCurrencyRaw(form.target_amount),
              currentAmount: parseCurrencyRaw(form.current_amount) || 0,
              monthlyAlloc: parseCurrencyRaw(form.monthly_alloc),
            });
            return (
              <View style={[styles.previewBox, { backgroundColor: colors.brandBg, borderColor: colors.brand + '40' }]}>
                <Ionicons name="time-outline" size={16} color={colors.brand} />
                <Text style={[styles.previewText, { color: colors.brand }]}>
                  Estimasi selesai dalam <Text style={{ fontWeight: '800' }}>{tl.estimatedMonths} bulan ({tl.estimatedYears} tahun)</Text>
                </Text>
              </View>
            );
          })()}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Contribute Modal ─────────────────────────────────────────────────────────
function ContributeModal({ goal, onClose, onContribute, colors, styles }) {
  const insets = useSafeAreaInsets();
  const [amount, setAmount] = useState('');
  const typeInfo = GOAL_TYPES.find(t => t.key === goal.type) || GOAL_TYPES[GOAL_TYPES.length - 1];
  const remaining = goal.target_amount - goal.current_amount;

  return (
    <Modal visible animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.bgPrimary }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.modalHeader, { borderBottomColor: colors.border, paddingTop: Math.max(16, insets.top) }]}>
          <TouchableOpacity onPress={onClose}><Text style={[styles.modalCancel, { color: colors.textMuted }]}>Batal</Text></TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Tambah Dana</Text>
          <TouchableOpacity onPress={() => onContribute(amount)}><Text style={[styles.modalSave, { color: typeInfo.color }]}>Simpan</Text></TouchableOpacity>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, paddingBottom: 60 + insets.bottom }}>
          <Text style={[styles.contribGoalName, { color: colors.textPrimary }]}>{typeInfo.emoji} {goal.name}</Text>
          <Text style={[styles.contribRemaining, { color: colors.textMuted }]}>Sisa: {formatRupiah(remaining)}</Text>

          {/* Quick amounts */}
          <View style={styles.quickRow}>
            {[100000, 250000, 500000, 1000000].filter(v => v <= remaining + 1).map(v => (
              <TouchableOpacity key={v} style={[styles.quickBtn, { borderColor: typeInfo.color + '60', backgroundColor: typeInfo.color + '15' }]}
                onPress={() => setAmount(formatCurrencyInput(v.toString()))}>
                <Text style={[styles.quickBtnText, { color: typeInfo.color }]}>{formatRupiah(v)}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[styles.quickBtn, { borderColor: typeInfo.color + '60', backgroundColor: typeInfo.color + '15' }]}
              onPress={() => setAmount(formatCurrencyInput(remaining.toString()))}>
              <Text style={[styles.quickBtnText, { color: typeInfo.color }]}>Lunas</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 20 }]}>Nominal (Rp)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.bgCard, color: colors.textPrimary, borderColor: colors.border, fontSize: 20 }]}
            keyboardType="number-pad" placeholder="Rp 0" placeholderTextColor={colors.textFaint}
            autoFocus value={amount} onChangeText={v => setAmount(formatCurrencyInput(v))} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  root: { flex: 1 },
  summaryBanner: { margin: 16, borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryVal: { fontSize: 18, fontWeight: '900', color: '#fff' },
  summaryLabel: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  summaryDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.25)' },
  emptyWrap: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 52, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '800', marginHorizontal: 16, marginTop: 16, marginBottom: 8, letterSpacing: 0.3 },
  goalCard: {
    marginHorizontal: 16, marginBottom: 12, borderRadius: 18, padding: 16, borderWidth: 1,
    elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4,
  },
  goalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  goalEmoji: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  goalEmojiText: { fontSize: 22 },
  goalName: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  goalMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  goalType: { fontSize: 11, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '700' },
  goalActions: { flexDirection: 'row', gap: 4 },
  actionIcon: { padding: 8 },
  progressSection: { marginBottom: 12 },
  progressLabelRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 8, gap: 4 },
  progressCurrent: { fontSize: 16, fontWeight: '800' },
  progressTarget: { fontSize: 12, fontWeight: '600', flex: 1 },
  progressPct: { fontSize: 14, fontWeight: '800' },
  progressBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12 },
  statItem: { alignItems: 'flex-start' },
  statVal: { fontSize: 13, fontWeight: '700' },
  statLabel: { fontSize: 10, fontWeight: '600', marginTop: 1 },
  cardBtns: { flexDirection: 'row', gap: 8 },
  cardBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 9, borderRadius: 10, borderWidth: 1,
  },
  cardBtnText: { fontSize: 12, fontWeight: '700' },
  fab: {
    position: 'absolute', bottom: 90, right: 20, width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center', elevation: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
  },
  // Modal
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1,
  },
  modalCancel: { fontSize: 15 },
  modalTitle: { fontSize: 16, fontWeight: '700' },
  modalSave: { fontSize: 15, fontWeight: '700' },
  fieldLabel: { fontSize: 11, fontWeight: '700', marginBottom: 8, letterSpacing: 0.3 },
  input: { padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 14, fontSize: 14 },
  typeChip: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 12, marginRight: 8, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.bgCard, gap: 6,
  },
  typeEmoji: { fontSize: 16 },
  typeChipLabel: { fontSize: 12, color: colors.textMuted },
  previewBox: { flexDirection: 'row', gap: 8, padding: 14, borderRadius: 12, borderWidth: 1, alignItems: 'center', marginTop: 4 },
  previewText: { flex: 1, fontSize: 13 },
  // Contribute Modal
  contribGoalName: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  contribRemaining: { fontSize: 13, marginBottom: 16 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  quickBtnText: { fontSize: 12, fontWeight: '700' },
});
