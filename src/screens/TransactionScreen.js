import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from '@react-navigation/native';
import { getCategories, getSubCategories, addTransaction, updateTransaction, getAccounts } from '../db/database';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { parseDateInput } from '../utils/formatting';
import StatusModal from '../components/StatusModal';

const TYPE_OPTIONS = [
  { key: 'expense', label: 'Pengeluaran', color: Colors.expense, bg: Colors.expenseBg, icon: 'arrow-down-circle' },
  { key: 'income', label: 'Pemasukan', color: Colors.income, bg: Colors.incomeBg, icon: 'arrow-up-circle' },
  { key: 'transfer', label: 'Transfer', color: Colors.brand, bg: Colors.brandBg, icon: 'swap-horizontal' },
];

const QUICK_AMOUNTS = [10000, 20000, 50000, 100000, 200000, 500000];

export default function TransactionScreen({ navigation, route }) {
  const db = useSQLiteContext();
  const preselectedAccountId = route?.params?.accountId || null;
  const editTx = route?.params?.editTx || null;
  const isEditMode = !!editTx;

  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [fee, setFee] = useState('');
  const [desc, setDesc] = useState('');
  const [useCustomDate, setUseCustomDate] = useState(false);
  const [customDateStr, setCustomDateStr] = useState('');

  const [accountId, setAccountId] = useState(null);
  const [toAccountId, setToAccountId] = useState(null);

  const [selectedCat, setSelectedCat] = useState(null);
  const [selectedSub, setSelectedSub] = useState(null);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [saving, setSaving] = useState(false);

  const [statusModal, setStatusModal] = useState({ visible: false, title: '', message: '', type: 'info' });

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
            setAmount('Rp ' + numAmt.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
            if (editTx.fee) {
              setFee('Rp ' + editTx.fee.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
            }
            setDesc(editTx.description || '');
            setAccountId(editTx.account_id);
            setToAccountId(editTx.to_account_id || null);
            setSelectedCat(editTx.category_id || null);
            setSelectedSub(editTx.subcategory_id || null);

            // Atur tanggal
            const txDate = new Date(editTx.date);
            const day = String(txDate.getDate()).padStart(2, '0');
            const month = String(txDate.getMonth() + 1).padStart(2, '0');
            const year = txDate.getFullYear();
            const today = new Date();
            const isToday = txDate.toDateString() === today.toDateString();
            if (!isToday) {
              setUseCustomDate(true);
              setCustomDateStr(`${day}/${month}/${year}`);
            } else {
              setUseCustomDate(false);
              setCustomDateStr('');
            }

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
            setUseCustomDate(false);
            setCustomDateStr('');

            if (type !== 'transfer') {
              const cats = await getCategories(db, type);
              if (cancelled) return;
              setCategories(cats);
              setSubCategories([]);
            }
          }
        } catch (e) {
          console.error('TransactionScreen load error:', e);
          showStatus('Gagal Memuat', 'Terjadi kesalahan saat memuat data transaksi. Coba kembali ke halaman sebelumnya.', 'error');
        }
      }
      load();
      return () => { cancelled = true; };
    }, [db, editTx, isEditMode, preselectedAccountId, type])
  );

  const handleTypeChange = (newType) => {
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
    try {
      const subs = await getSubCategories(db, catId);
      setSubCategories(subs);
    } catch (e) {
      console.error('getSubCategories error:', e);
      showStatus('Gagal Memuat', 'Tidak dapat memuat sub-kategori. Silakan coba lagi.', 'error');
    }
  };

  const applyQuickAmount = (val) => {
    const existing = parseInt(amount.replace(/[^0-9]/g, ''), 10) || 0;
    const total = existing + val;
    setAmount('Rp ' + total.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
  };

  const handleSave = async () => {
    const amt = parseInt(amount.replace(/[^0-9]/g, ''), 10);
    if (isNaN(amt) || amt <= 0) return showStatus('Nominal Tidak Valid', 'Masukkan nominal yang benar.', 'error');
    if (!accountId) return showStatus('Pilih Dompet', 'Harap pilih dompet asal terlebih dahulu.', 'error');

    let txDate = new Date().toISOString();
    if (useCustomDate && customDateStr) {
      const parsed = parseDateInput(customDateStr);
      if (parsed) {
        txDate = parsed;
      } else {
        return showStatus('Format Tanggal Salah', 'Gunakan format DD/MM/YYYY, contoh: 21/04/2026.', 'error');
      }
    } else if (isEditMode && editTx && !useCustomDate) {
      txDate = editTx.date;
    }

    setSaving(true);
    try {
      const txParams = {};

      if (type === 'transfer') {
        if (!toAccountId) return showStatus('Pilih Tujuan', 'Pilih dompet tujuan transfer.', 'error');
        if (accountId === toAccountId) return showStatus('Dompet Sama', 'Dompet asal dan tujuan tidak boleh sama.', 'error');
        const adminFee = parseInt(fee.replace(/[^0-9]/g, ''), 10) || 0;
        Object.assign(txParams, { amount: amt, fee: adminFee, type: 'transfer', account_id: accountId, to_account_id: toAccountId, description: desc, date: txDate });
      } else {
        if (!selectedCat) return showStatus('Pilih Kategori', 'Harap pilih kategori transaksi.', 'error');
        if (subcategories.length > 0 && !selectedSub)
          return showStatus('Pilih Sub-Kategori', 'Kategori ini memiliki sub-kategori, mohon pilih salah satu.', 'error');
        Object.assign(txParams, { amount: amt, type, account_id: accountId, category_id: selectedCat, subcategory_id: selectedSub, description: desc, date: txDate });
      }

      if (isEditMode && editTx) {
        await updateTransaction(db, editTx.id, txParams, editTx);
        showStatus('Berhasil', 'Transaksi berhasil diperbarui!', 'success');
        setTimeout(() => navigation.goBack(), 1200);
      } else {
        await addTransaction(db, txParams);
        navigation.goBack();
      }
    } catch (e) {
      console.error('handleSave error:', e);
      showStatus('Gagal Menyimpan', 'Transaksi tidak dapat disimpan. Pastikan semua data sudah benar dan coba lagi.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const activeType = TYPE_OPTIONS.find(t => t.key === type);

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* Type Switcher */}
        <View style={styles.typeSwitcher}>
          {TYPE_OPTIONS.map(t => (
            <TouchableOpacity
              key={t.key}
              style={[styles.typeBtn, type === t.key && { backgroundColor: t.bg, borderColor: t.color }]}
              onPress={() => handleTypeChange(t.key)}
            >
              <Ionicons name={t.icon} size={14} color={type === t.key ? t.color : '#4a5568'} style={{ marginRight: 5 }} />
              <Text style={[styles.typeText, type === t.key && { color: t.color }]}>{t.label}</Text>
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
            placeholderTextColor="#2a3550"
            value={amount}
            onChangeText={(text) => {
              const raw = text.replace(/[^0-9]/g, '');
              if (!raw) return setAmount('');
              setAmount('Rp ' + parseInt(raw, 10).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
            }}
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
                <Text style={[styles.walletChipText, accountId === acc.id && { color: acc.color }]}>{acc.name}</Text>
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
                  <Text style={[styles.walletChipText, toAccountId === acc.id && { color: acc.color }]}>{acc.name}</Text>
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
              placeholderTextColor="#2a3550"
              value={fee}
              onChangeText={(text) => {
                const raw = text.replace(/[^0-9]/g, '');
                if (!raw) return setFee('');
                setFee('Rp ' + parseInt(raw, 10).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
              }}
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
                    {c.is_fixed === 1 && <View style={styles.fixedDot} />}
                    <Text style={[styles.catChipText, selectedCat === c.id && styles.catChipTextActive]}>
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
            </View>

            {subcategories.length > 0 && (
              <View style={styles.subSection}>
                <Text style={[styles.label, { marginTop: 0 }]}>Sub-Kategori</Text>
                <View style={styles.chipGrid}>
                  {subcategories
                    .filter(s => !selectedSub || s.id === selectedSub)
                    .map(s => (
                      <TouchableOpacity
                        key={s.id}
                        style={[styles.subChip, selectedSub === s.id && styles.catChipActive]}
                        onPress={() => setSelectedSub(selectedSub === s.id ? null : s.id)}
                      >
                        <Text style={[styles.catChipText, selectedSub === s.id && styles.catChipTextActive]}>
                          {s.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Custom Date */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.dateToggle}
            onPress={() => setUseCustomDate(!useCustomDate)}
          >
            <View style={[styles.checkbox, useCustomDate && styles.checkboxActive]}>
              {useCustomDate && <Ionicons name="checkmark" size={12} color="#fff" />}
            </View>
            <Text style={styles.dateToggleText}>Atur tanggal berbeda (bukan hari ini)</Text>
          </TouchableOpacity>
          {useCustomDate && (
            <TextInput
              style={styles.inputBox}
              placeholder="DD/MM/YYYY (contoh: 15/04/2025)"
              placeholderTextColor="#2a3550"
              value={customDateStr}
              onChangeText={setCustomDateStr}
              keyboardType="number-pad"
            />
          )}
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.label}>Catatan (Opsional)</Text>
          <TextInput
            style={styles.inputBox}
            placeholder={type === 'transfer' ? 'Keterangan transfer...' : 'Catatan singkat...'}
            placeholderTextColor="#2a3550"
            value={desc}
            onChangeText={setDesc}
            multiline
          />
        </View>

      </ScrollView>

      {/* Save Button */}
      <View style={styles.saveArea}>
        {isEditMode && (
          <Text style={styles.editModeLabel}>Mode Edit Transaksi</Text>
        )}
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: isEditMode ? '#7c6aff' : activeType.color }, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          <Ionicons name={isEditMode ? 'create' : 'checkmark-circle'} size={20} color="#fff" />
          <Text style={styles.saveBtnText}>
            {saving ? (isEditMode ? 'Memperbarui...' : 'Menyimpan...') : (isEditMode ? 'Update Transaksi' : 'Simpan Transaksi')}
          </Text>
        </TouchableOpacity>
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#060d1a' },

  typeSwitcher: {
    flexDirection: 'row', margin: 16, backgroundColor: '#0d1526',
    borderRadius: 14, padding: 4, borderWidth: 1, borderColor: '#1a2540',
  },
  typeBtn: {
    flex: 1, flexDirection: 'row', paddingVertical: 10, alignItems: 'center',
    justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: 'transparent',
  },
  typeText: { color: '#4a5568', fontWeight: '700', fontSize: 12 },

  amountCard: {
    marginHorizontal: 16, backgroundColor: '#0d1526', borderRadius: 16,
    padding: 18, marginBottom: 16, borderWidth: 1, borderColor: '#1a2540',
  },
  amountLabel: { color: '#4a5568', fontSize: 12, fontWeight: '600', marginBottom: 8 },
  amountInput: { fontSize: 32, fontWeight: '800', marginBottom: 16 },
  quickAmountsScroll: { flexGrow: 0 },
  quickBtn: {
    paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#1a2540',
    borderRadius: 10, marginRight: 8,
  },
  quickBtnText: { color: '#8892a4', fontSize: 12, fontWeight: '700' },

  section: { marginHorizontal: 16, marginBottom: 16 },
  label: { color: '#8892a4', fontSize: 12, fontWeight: '700', marginBottom: 10, letterSpacing: 0.3 },

  walletChip: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: '#0d1526', borderWidth: 1, borderColor: '#1a2540',
    borderRadius: 12, marginRight: 8,
  },
  walletDot: { width: 8, height: 8, borderRadius: 4, marginRight: 7 },
  walletChipText: { color: '#8892a4', fontSize: 13, fontWeight: '600' },

  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 9,
    backgroundColor: '#0d1526', borderWidth: 1, borderColor: '#1a2540', borderRadius: 12,
  },
  catChipActive: { backgroundColor: '#7c6aff22', borderColor: '#7c6aff' },
  catChipText: { color: '#8892a4', fontSize: 13 },
  catChipTextActive: { color: '#7c6aff', fontWeight: '700' },
  fixedDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#f59e0b', marginRight: 6 },

  subSection: { marginTop: 12, backgroundColor: '#0d1526', borderRadius: 12, padding: 12 },
  subChip: {
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: '#060d1a', borderWidth: 1, borderColor: '#1a2540', borderRadius: 10,
  },

  inputBox: {
    backgroundColor: '#0d1526', color: '#e8edf5', fontSize: 15,
    padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#1a2540',
  },

  dateToggle: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  checkbox: {
    width: 20, height: 20, borderRadius: 6, borderWidth: 1, borderColor: '#1a2540',
    backgroundColor: '#0d1526', justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  checkboxActive: { backgroundColor: '#7c6aff', borderColor: '#7c6aff' },
  dateToggleText: { color: '#8892a4', fontSize: 13 },

  saveArea: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#060d1a', padding: 16, paddingBottom: 28,
    borderTopWidth: 1, borderTopColor: '#1a2540',
  },
  editModeLabel: {
    color: '#7c6aff', fontSize: 11, fontWeight: '700', textAlign: 'center',
    letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase',
  },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 16, borderRadius: 14, gap: 8,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});