import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BudgetProgressBar from '../components/BudgetProgressBar';
import StatusModal from '../components/StatusModal';
import { useAppContext } from '../context/AppContext';
import { getBudgetWithSpending, getCategories, setBudget, deleteBudget } from '../db/database';
import { formatRupiah, formatCurrencyInput, parseCurrencyRaw } from '../utils/formatting';

export default function BudgetScreen() {
  const db = useSQLiteContext();
  const { colors } = useAppContext();
  const styles = makeStyles(colors);
  const insets = useSafeAreaInsets();

  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCat, setSelectedCat] = useState(null);
  const [limitInput, setLimitInput] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusModal, setStatusModal] = useState({ visible: false, title: '', message: '', type: 'info' });

  const showStatus = (title, message, type) => setStatusModal({ visible: true, title, message, type });

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const loadData = useCallback(async () => {
    try {
      const [b, cats] = await Promise.all([
        getBudgetWithSpending(db, currentMonth, currentYear),
        getCategories(db, 'expense'),
      ]);
      setBudgets(b);
      setCategories(cats);
    } catch (e) {
      console.error('BudgetScreen loadData error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [db, currentMonth, currentYear]);

  useFocusEffect(useCallback(() => {
    loadData();
  }, [loadData]));

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleSave = async () => {
    if (!selectedCat) return showStatus('Pilih Kategori', 'Pilih kategori terlebih dahulu.', 'error');
    const limit = parseCurrencyRaw(limitInput);
    if (limit <= 0) return showStatus('Nominal Tidak Valid', 'Masukkan limit anggaran yang benar.', 'error');

    try {
      await setBudget(db, selectedCat, limit);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showStatus('Berhasil', editingId ? 'Budget diperbarui!' : 'Budget baru ditambahkan!', 'success');
      resetForm();
      loadData();
    } catch (e) {
      console.error('handleSave budget error:', e);
      showStatus('Gagal', 'Tidak dapat menyimpan budget.', 'error');
    }
  };

  const handleEdit = (item) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingId(item.id);
    setSelectedCat(item.category_id);
    setLimitInput(formatCurrencyInput(item.monthly_limit.toString()));
  };

  const handleDelete = (item) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Hapus Budget', `Hapus anggaran untuk "${item.category_name}"?`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteBudget(db, item.id);
            loadData();
          } catch (e) {
            Alert.alert('Gagal', 'Tidak dapat menghapus budget.');
          }
        },
      },
    ]);
  };

  const resetForm = () => {
    setSelectedCat(null);
    setLimitInput('');
    setEditingId(null);
  };

  const totalBudget = budgets.reduce((s, b) => s + b.monthly_limit, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);

  return (
    <View style={styles.root}>
      <FlatList
        data={budgets}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => handleEdit(item)} onLongPress={() => handleDelete(item)}>
            <View style={[styles.budgetCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <BudgetProgressBar
                category_name={item.category_name}
                monthly_limit={item.monthly_limit}
                spent={item.spent}
              />
            </View>
          </TouchableOpacity>
        )}
        ListHeaderComponent={
          <View>
            <Text style={styles.pageTitle}>Anggaran Bulanan</Text>

            {/* Summary */}
            <View style={[styles.summaryCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Total Anggaran</Text>
                  <Text style={[styles.summaryValue, { color: colors.brand }]}>{formatRupiah(totalBudget)}</Text>
                </View>
                <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Terpakai</Text>
                  <Text style={[styles.summaryValue, { color: totalSpent > totalBudget ? colors.expense : colors.income }]}>{formatRupiah(totalSpent)}</Text>
                </View>
                <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Sisa</Text>
                  <Text style={[styles.summaryValue, { color: totalBudget - totalSpent >= 0 ? colors.income : colors.expense }]}>{formatRupiah(totalBudget - totalSpent)}</Text>
                </View>
              </View>
            </View>

            {/* Add/Edit Form */}
            <View style={[styles.formCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <Text style={[styles.formTitle, { color: colors.textPrimary }]}>{editingId ? 'Edit Budget' : 'Tambah Budget Baru'}</Text>

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Kategori Pengeluaran</Text>
              <View style={styles.chipGrid}>
                {categories.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.bgPrimary }, selectedCat === c.id && { backgroundColor: colors.brandBg, borderColor: colors.brand }]}
                    onPress={() => setSelectedCat(c.id)}
                  >
                    <Text style={[styles.chipText, { color: colors.textMuted }, selectedCat === c.id && { color: colors.brand, fontWeight: '700' }]}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Limit per Bulan</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.bgPrimary, borderColor: colors.border, color: colors.textPrimary }]}
                keyboardType="number-pad"
                placeholder="Rp 0"
                placeholderTextColor={colors.textFaint}
                value={limitInput}
                onChangeText={(text) => setLimitInput(formatCurrencyInput(text))}
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                {editingId && (
                  <TouchableOpacity style={[styles.btn, { backgroundColor: colors.bgElevated, flex: 1 }]} onPress={resetForm}>
                    <Text style={[styles.btnText, { color: colors.textPrimary }]}>Batal</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={[styles.btn, { backgroundColor: colors.brand, flex: 2 }]} onPress={handleSave}>
                  <Ionicons name={editingId ? 'save' : 'add-circle'} size={18} color="#fff" />
                  <Text style={styles.btnText}>{editingId ? 'Update' : 'Tambah Budget'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>Daftar Anggaran</Text>
          </View>
        }
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyState}>
              <Ionicons name="wallet-outline" size={48} color={colors.bgElevated} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Belum ada anggaran</Text>
              <Text style={[styles.emptySub, { color: colors.textMuted }]}>Tambah budget di atas untuk mengontrol pengeluaran</Text>
            </View>
          )
        }
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
      />

      <StatusModal
        visible={statusModal.visible}
        onClose={() => setStatusModal({ ...statusModal, visible: false })}
        title={statusModal.title}
        message={statusModal.message}
        type={statusModal.type}
      />
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgPrimary },
  pageTitle: {
    fontSize: 20, fontWeight: '800', marginLeft: 20, marginTop: 16, marginBottom: 16, color: colors.textPrimary,
  },
  summaryCard: {
    marginHorizontal: 16, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 10, fontWeight: '700', marginBottom: 4 },
  summaryValue: { fontSize: 14, fontWeight: '800' },
  summaryDivider: { width: 1, height: 24, marginHorizontal: 8 },
  formCard: {
    marginHorizontal: 16, borderRadius: 18, padding: 20, marginBottom: 20, borderWidth: 1,
  },
  formTitle: { fontSize: 15, fontWeight: '700', marginBottom: 16 },
  fieldLabel: { fontSize: 11, fontWeight: '700', marginBottom: 8, letterSpacing: 0.5 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1,
  },
  chipText: { fontSize: 12, fontWeight: '600' },
  input: {
    padding: 14, borderRadius: 12, marginBottom: 14, borderWidth: 1, fontSize: 16, fontWeight: '700',
  },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 14, borderRadius: 12, gap: 8,
  },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  sectionLabel: {
    fontSize: 16, fontWeight: '800', marginLeft: 20, marginBottom: 16,
  },
  budgetCard: {
    marginHorizontal: 16, borderRadius: 16, borderWidth: 1, marginBottom: 8,
  },
  emptyState: { alignItems: 'center', padding: 40 },
  emptyText: { marginTop: 12, fontSize: 15, fontWeight: '600' },
  emptySub: { marginTop: 4, fontSize: 12, textAlign: 'center' },
});
