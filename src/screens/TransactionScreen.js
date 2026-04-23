import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from '@react-navigation/native';
import { getCategories, getSubCategories, addTransaction, updateTransaction, getAccounts } from '../db/database';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../context/AppContext';
import { formatDate, formatCurrencyInput, parseCurrencyRaw } from '../utils/formatting';
import StatusModal from '../components/StatusModal';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';

// TYPE_OPTIONS defined inside component for theme support

const QUICK_AMOUNTS = [10000, 20000, 50000, 100000, 200000, 500000];

export default function TransactionScreen({ navigation, route }) {
  const db = useSQLiteContext();
  const { colors } = useAppContext();

  const TYPE_OPTIONS = [    { key: 'expense', label: 'Pengeluaran', color: colors.expense, bg: colors.expenseBg, icon: 'arrow-down-circle' },
    { key: 'income', label: 'Pemasukan', color: colors.income, bg: colors.incomeBg, icon: 'arrow-up-circle' },
    { key: 'transfer', label: 'Transfer', color: colors.brand, bg: colors.brandBg, icon: 'swap-horizontal' },
  ];
  const preselectedAccountId = route?.params?.accountId || null;
  const editTx = route?.params?.editTx || null;
  const isEditMode = !!editTx;

  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [fee, setFee] = useState('');
  const [desc, setDesc] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [accountId, setAccountId] = useState(null);
  const [toAccountId, setToAccountId] = useState(null);

  const [selectedCat, setSelectedCat] = useState(null);
  const [selectedSub, setSelectedSub] = useState(null);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [saving, setSaving] = useState(false);

  const [statusModal, setStatusModal] = useState({ visible: false, title: '', message: '', type: 'info' });

  const resetForm = useCallback(() => {
    setType('expense');
    setAmount('');
    setFee('');
    setDesc('');
    setSelectedCat(null);
    setSelectedSub(null);
    setToAccountId(null);
    setDate(new Date());
    // Clear params so it doesn't re-trigger edit mode on next focus
    navigation.setParams({ editTx: null, source: null });
  }, [navigation]);

  const showStatus = (title, message, type) => {
    setStatusModal({ visible: true, title, message, type });
  };

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      async function load() {
        try {
          const accs = await getAccounts(db);
          if (cancelled) return;
          setAccounts(accs);

          if (isEditMode && editTx) {
            // Pre-fill form dengan data transaksi yang akan diedit
            setType(editTx.type);
            const numAmt = editTx.amount || 0;
            setAmount(formatCurrencyInput(numAmt.toString()));
            if (editTx.fee) {
              setFee(formatCurrencyInput(editTx.fee.toString()));
            }
            setDesc(editTx.description || '');
            setAccountId(editTx.account_id);
            setToAccountId(editTx.to_account_id || null);
            setSelectedCat(editTx.category_id || null);
            setSelectedSub(editTx.subcategory_id || null);

            // Atur tanggal
            const txDate = new Date(editTx.date);
            setDate(txDate);

            if (editTx.type !== 'transfer') {
              const cats = await getCategories(db, editTx.type);
              if (cancelled) return;
              setCategories(cats);
              if (editTx.category_id) {
                const subs = await getSubCategories(db, editTx.category_id);
                if (cancelled) return;
                setSubCategories(subs);
              } else {
                setSubCategories([]);
              }
            }
          } else {
            // Mode tambah baru (reset form)
            const defaultAcc = preselectedAccountId
              ? preselectedAccountId
              : accs.length > 0 ? accs[0].id : null;
            setAccountId(defaultAcc);
            setAmount('');
            setFee('');
            setDesc('');
            setSelectedCat(null);
            setSelectedSub(null);
            setToAccountId(null);
            setDate(new Date());

            // Note: we fetch categories separately via useEffect so it doesn't reset amount on type change
          }
        } catch (e) {
          console.error('TransactionScreen load error:', e);
          showStatus('Gagal Memuat', 'Terjadi kesalahan saat memuat data transaksi. Coba kembali ke halaman sebelumnya.', 'error');
        }
      }
      load();
      return () => { 
        cancelled = true; 
        // Reset form when leaving the screen to keep it clean
        resetForm();
      };
    }, [db, editTx, isEditMode, preselectedAccountId, resetForm])
  );

  // Terpisah agar tidak me-reset nominal/isian form ketika tipe transaksi diganti
  React.useEffect(() => {
    let cancelled = false;
    async function fetchCats() {
      if (type !== 'transfer') {
        const cats = await getCategories(db, type);
        if (!cancelled) setCategories(cats);
      } else {
        if (!cancelled) setCategories([]);
      }
    }
    fetchCats();
    return () => { cancelled = true; };
  }, [type, db]);

  const handleTypeChange = (newType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setType(newType);
    setSelectedCat(null);
    setSelectedSub(null);
    setSubCategories([]);
  };

  const handleCategorySelect = async (catId) => {
    if (selectedCat === catId) {
      setSelectedCat(null);
      setSubCategories([]);
      setSelectedSub(null);
      return;
    }
    setSelectedCat(catId);
    setSelectedSub(null);
    Haptics.selectionAsync();
    try {
      const subs = await getSubCategories(db, catId);
      setSubCategories(subs);
    } catch (e) {
      console.error('getSubCategories error:', e);
      showStatus('Gagal Memuat', 'Tidak dapat memuat sub-kategori. Silakan coba lagi.', 'error');
    }
  };

  const applyQuickAmount = (val) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const existing = parseCurrencyRaw(amount);
    const total = existing + val;
    setAmount(formatCurrencyInput(total.toString()));
  };

  const handleSave = async () => {
    const amt = parseCurrencyRaw(amount);
    if (amt <= 0) return showStatus('Nominal Tidak Valid', 'Masukkan nominal yang benar.', 'error');
    if (!accountId) return showStatus('Pilih Dompet', 'Harap pilih dompet asal terlebih dahulu.', 'error');

    let txDate = date.toISOString();

    setSaving(true);
    try {
      const txParams = {};

      if (type === 'transfer') {
        if (!toAccountId) return showStatus('Pilih Tujuan', 'Pilih dompet tujuan transfer.', 'error');
        if (accountId === toAccountId) return showStatus('Dompet Sama', 'Dompet asal dan tujuan tidak boleh sama.', 'error');
        const adminFee = parseCurrencyRaw(fee);
        Object.assign(txParams, { amount: amt, fee: adminFee, type: 'transfer', account_id: accountId, to_account_id: toAccountId, description: desc, date: txDate });
      } else {
        if (!selectedCat) return showStatus('Pilih Kategori', 'Harap pilih kategori transaksi.', 'error');
        if (subcategories.length > 0 && !selectedSub)
          return showStatus('Pilih Sub-Kategori', 'Kategori ini memiliki sub-kategori, mohon pilih salah satu.', 'error');
        Object.assign(txParams, { amount: amt, type, account_id: accountId, category_id: selectedCat, subcategory_id: selectedSub, description: desc, date: txDate });
      }

      if (isEditMode && editTx) {
        await updateTransaction(db, editTx.id, txParams, editTx);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showStatus('Berhasil', 'Transaksi berhasil diperbarui!', 'success');
        setTimeout(() => {
          const returnTo = route.params?.source || 'Beranda';
          resetForm();
          navigation.navigate(returnTo);
        }, 1200);
      } else {
        await addTransaction(db, txParams);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        resetForm();
        navigation.navigate(route.params?.source || 'Beranda');
      }
    } catch (e) {
      console.error('handleSave error:', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showStatus('Gagal Menyimpan', 'Transaksi tidak dapat disimpan. Pastikan semua data sudah benar dan coba lagi.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const styles = makeStyles(colors);
  const activeType = TYPE_OPTIONS.find(t => t.key === type);

  return (
    <KeyboardAvoidingView 
      style={styles.root} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* Type Switcher */}
        <View style={styles.typeSwitcher}>
          {TYPE_OPTIONS.map(t => (
            <TouchableOpacity
              key={t.key}
              style={[
                styles.typeBtn, 
                type === t.key && { 
                  backgroundColor: t.bg, 
                  borderColor: t.color,
                }
              ]}
              onPress={() => handleTypeChange(t.key)}
            >
              <Ionicons name={t.icon} size={14} color={type === t.key ? t.color : colors.textMuted} style={{ marginRight: 5 }} />
              <Text style={[styles.typeText, { color: type === t.key ? t.color : colors.textMuted }]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Amount Input */}
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Nominal Transaksi</Text>
          <TextInput
            style={[styles.amountInput, { color: activeType.color }]}
            keyboardType="number-pad"
            placeholder="Rp 0"
            placeholderTextColor={colors.textFaint}
            value={amount}
            onChangeText={(text) => setAmount(formatCurrencyInput(text))}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickAmountsScroll}>
            {QUICK_AMOUNTS.map(val => (
              <TouchableOpacity key={val} style={styles.quickBtn} onPress={() => applyQuickAmount(val)}>
                <Text style={styles.quickBtnText}>+{val >= 1_000_000 ? (val / 1_000_000) + 'jt' : (val / 1000) + 'rb'}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* From Wallet */}
        <View style={styles.section}>
          <Text style={styles.label}>
            {type === 'expense' ? 'Dari Dompet' : type === 'income' ? 'Ke Dompet' : 'Dari Dompet'}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {accounts.map(acc => (
              <TouchableOpacity
                key={acc.id}
                style={[styles.walletChip, accountId === acc.id && { backgroundColor: acc.color + '22', borderColor: acc.color }]}
                onPress={() => setAccountId(acc.id)}
              >
                <View style={[styles.walletDot, { backgroundColor: acc.color }]} />
                <Text style={[styles.walletChipText, accountId === acc.id && { color: acc.color, fontWeight: '700' }]}>{acc.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* To Wallet (Transfer only) */}
        {type === 'transfer' && (
          <View style={styles.section}>
            <Text style={styles.label}>Ke Dompet Tujuan</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {accounts.filter(a => a.id !== accountId).map(acc => (
                <TouchableOpacity
                  key={acc.id}
                  style={[styles.walletChip, toAccountId === acc.id && { backgroundColor: acc.color + '22', borderColor: acc.color }]}
                  onPress={() => setToAccountId(acc.id)}
                >
                  <View style={[styles.walletDot, { backgroundColor: acc.color }]} />
                  <Text style={[styles.walletChipText, toAccountId === acc.id && { color: acc.color, fontWeight: '700' }]}>{acc.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Fee (Transfer only) */}
        {type === 'transfer' && (
          <View style={styles.section}>
            <Text style={styles.label}>Biaya Admin (Opsional)</Text>
            <TextInput
              style={styles.inputBox}
              keyboardType="number-pad"
              placeholder="Rp 0"
              placeholderTextColor={colors.textFaint}
              value={fee}
              onChangeText={(text) => setFee(formatCurrencyInput(text))}
            />
          </View>
        )}

        {/* Category */}
        {type !== 'transfer' && (
          <View style={styles.section}>
            <Text style={styles.label}>
              {selectedCat ? 'Kategori (ketuk untuk ganti)' : 'Pilih Kategori'}
            </Text>
            <View style={styles.chipGrid}>
              {categories
                .filter(c => !selectedCat || c.id === selectedCat)
                .map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.catChip, selectedCat === c.id && styles.catChipActive]}
                    onPress={() => handleCategorySelect(c.id)}
                  >
                    {c.is_fixed === 1 && <View style={[styles.fixedDot, { backgroundColor: colors.warning }]} />}
                    <Text style={[styles.catChipText, selectedCat === c.id && styles.catChipTextActive]}>
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
            </View>

            {subcategories.length > 0 && selectedCat && (
              <View style={styles.subSection}>
                <Text style={[styles.label, { marginTop: 0 }]}>Sub-Kategori</Text>
                <View style={styles.chipGrid}>
                  {subcategories.map(s => (
                    <TouchableOpacity
                      key={s.id}
                      style={[styles.subChip, selectedSub === s.id && styles.subChipActive]}
                      onPress={() => setSelectedSub(selectedSub === s.id ? null : s.id)}
                    >
                      <Text style={[styles.subChipText, selectedSub === s.id && styles.subChipTextActive]}>
                        {s.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Date Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>Tanggal Transaksi</Text>
          <TouchableOpacity
            style={styles.datePickerBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowDatePicker(true);
            }}
          >
            <View style={styles.datePickerIcon}>
              <Ionicons name="calendar-outline" size={18} color={colors.brand} />
            </View>
            <Text style={styles.datePickerText}>{formatDate(date.toISOString())}</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onDateChange}
              maximumDate={new Date()}
            />
          )}
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.label}>Catatan (Opsional)</Text>
          <TextInput
            style={styles.inputBox}
            placeholder={type === 'transfer' ? 'Keterangan transfer...' : 'Catatan singkat...'}
            placeholderTextColor={colors.textFaint}
            value={desc}
            onChangeText={setDesc}
            multiline
          />
        </View>

      </ScrollView>

      {/* Save Button Area */}
      <View style={styles.saveArea}>
        {isEditMode && (
          <Text style={styles.editModeLabel}>Mode Edit Transaksi</Text>
        )}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {isEditMode && (
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border, flex: 1 }]}
              onPress={() => {
                const returnTo = route.params?.source || 'Beranda';
                resetForm();
                navigation.navigate(returnTo);
              }}
            >
              <Text style={[styles.saveBtnText, { color: colors.textPrimary }]}>Batal</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.brand, flex: 2 }, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
          >
            <Ionicons name={isEditMode ? 'create' : 'checkmark-circle'} size={20} color="#fff" />
            <Text style={styles.saveBtnText}>
              {saving ? (isEditMode ? 'Memperbarui...' : 'Menyimpan...') : (isEditMode ? 'Update' : 'Simpan')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <StatusModal
        visible={statusModal.visible}
        onClose={() => setStatusModal({ ...statusModal, visible: false })}
        title={statusModal.title}
        message={statusModal.message}
        type={statusModal.type}
      />

    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgPrimary },
  scroll: { flex: 1 },
  content: { paddingBottom: 40 },
  typeSwitcher: {
    flexDirection: 'row', margin: 16,
    borderRadius: 14, padding: 4, borderWidth: 1,
    backgroundColor: colors.bgCard, borderColor: colors.border,
  },
  typeBtn: {
    flex: 1, flexDirection: 'row', paddingVertical: 10, alignItems: 'center',
    justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: 'transparent',
  },
  typeText: { fontWeight: '700', fontSize: 12 },

  amountCard: {
    marginHorizontal: 16, borderRadius: 24,
    padding: 20, marginBottom: 20, borderWidth: 1,
    backgroundColor: colors.bgCard, borderColor: colors.border,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  amountLabel: { fontSize: 12, fontWeight: '600', marginBottom: 8, color: colors.textSecondary },
  amountInput: { fontSize: 32, fontWeight: '800', marginBottom: 16, color: colors.textPrimary },
  quickAmountsScroll: { flexGrow: 0 },
  quickBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 10, marginRight: 8,
    backgroundColor: colors.bgElevated,
  },
  quickBtnText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },

  section: { marginHorizontal: 16, marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '700', marginBottom: 10, letterSpacing: 0.3, color: colors.textSecondary },

  walletChip: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderRadius: 12, marginRight: 8,
    backgroundColor: colors.bgCard, borderColor: colors.border,
  },
  walletDot: { width: 8, height: 8, borderRadius: 4, marginRight: 7 },
  walletChipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  walletChipTextActive: { color: colors.textPrimary },

  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 9,
    borderWidth: 1, borderRadius: 12,
    backgroundColor: colors.bgCard, borderColor: colors.border,
  },
  catChipActive: { backgroundColor: colors.brandBg, borderColor: colors.brand },
  catChipText: { fontSize: 13, color: colors.textMuted },
  catChipTextActive: { color: colors.brand, fontWeight: '700' },
  fixedDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },

  subSection: { marginTop: 12, borderRadius: 12, padding: 12, backgroundColor: colors.bgElevated },
  subChip: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderRadius: 10,
    backgroundColor: colors.bgCard, borderColor: colors.border,
  },
  subChipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  subChipText: { fontSize: 12, color: colors.textMuted },
  subChipTextActive: { color: '#fff' },

  inputBox: {
    fontSize: 15, padding: 14, borderRadius: 12, borderWidth: 1,
    backgroundColor: colors.bgCard, borderColor: colors.border, color: colors.textPrimary,
  },

  dateToggle: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  checkbox: {
    width: 20, height: 20, borderRadius: 6, borderWidth: 1,
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
    backgroundColor: colors.bgCard, borderColor: colors.border,
  },
  checkboxActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  dateToggleText: { fontSize: 13, color: colors.textSecondary },

  saveArea: {
    padding: 16, paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    borderTopWidth: 1, borderColor: colors.border,
    backgroundColor: colors.bgCard,
  },
  datePickerBtn: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, borderRadius: 12, borderWidth: 1,
    backgroundColor: colors.bgCard, borderColor: colors.border,
  },
  datePickerIcon: { marginRight: 12 },
  datePickerText: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  editModeLabel: {
    fontSize: 11, fontWeight: '700', textAlign: 'center',
    letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase',
    color: colors.brand,
  },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 16, borderRadius: 14, gap: 8,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});