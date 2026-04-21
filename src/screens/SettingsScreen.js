import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert, Switch, Modal
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from '@react-navigation/native';
import {
  getCategories, deleteCategory, addSubCategory,
  getSubCategories, deleteSubCategory, getAccounts, factoryReset, updateAccountBalance
} from '../db/database';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../context/AppContext';
import StatusModal from '../components/StatusModal';

const WALLET_TYPES = [
  { key: 'cash', label: 'Tunai', icon: 'wallet', color: '#00c896' },
  { key: 'bank', label: 'Bank', icon: 'business', color: '#0ea5e9' },
  { key: 'ewallet', label: 'E-Wallet', icon: 'phone-portrait', color: '#7c6aff' },
  { key: 'investment', label: 'Investasi', icon: 'trending-up', color: '#14b8a6' },
  { key: 'credit', label: 'Kredit', icon: 'card', color: '#f59e0b' },
];

const WALLET_COLORS = [
  '#00c896', '#0ea5e9', '#7c6aff', '#ff4d6d', '#f59e0b',
  '#14b8a6', '#f97316', '#ec4899', '#a78bfa', '#3b82f6',
];

function Section({ title, subtitle, children }) {
  return (
    <View style={sectionStyles.wrap}>
      <Text style={sectionStyles.title}>{title}</Text>
      {subtitle && <Text style={sectionStyles.sub}>{subtitle}</Text>}
      {children}
    </View>
  );
}
const sectionStyles = StyleSheet.create({
  wrap: {
    backgroundColor: '#0d1526', borderRadius: 18, padding: 20,
    marginHorizontal: 16, marginBottom: 16, borderWidth: 1, borderColor: '#1a2540',
  },
  title: { color: '#e8edf5', fontSize: 15, fontWeight: '700', marginBottom: 4 },
  sub: { color: '#4a5568', fontSize: 12, marginBottom: 16, lineHeight: 18 },
});

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const { userName: globalUserName, setUserName: setGlobalUserName } = useAppContext();

  const [inputUserName, setInputUserName] = useState('');
  const [walletName, setWalletName] = useState('');
  const [walletType, setWalletType] = useState('bank');
  const [walletColor, setWalletColor] = useState('#0ea5e9');
  const [initialBalance, setInitialBalance] = useState('');
  const [excludeFromTotal, setExcludeFromTotal] = useState(false);
  const [editWalletId, setEditWalletId] = useState(null);

  const [catName, setCatName] = useState('');
  const [catType, setCatType] = useState('expense');
  const [isFixed, setIsFixed] = useState(false);

  const [existingCats, setExistingCats] = useState([]);
  const [parentCatId, setParentCatId] = useState(null);
  const [subCatName, setSubCatName] = useState('');
  const [existingSubs, setExistingSubs] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [activeTab, setActiveTab] = useState('wallet'); // 'wallet' | 'category' | 'profile'
  
  const [isResetModalVisible, setResetModalVisible] = useState(false);
  const [statusModal, setStatusModal] = useState({ visible: false, title: '', message: '', type: 'info' });

  const showStatus = (title, message, type) => {
    setStatusModal({ visible: true, title, message, type });
  };

  const loadSubs = useCallback(async (pid, cancelled = { current: false }) => {
    if (!pid) return setExistingSubs([]);
    try {
      const subs = await getSubCategories(db, pid);
      if (cancelled.current) return;
      setExistingSubs(subs);
    } catch (e) {
      console.error('Settings loadSubs error:', e);
    }
  }, [db]);

  React.useEffect(() => {
    const cancelled = { current: false };
    loadSubs(parentCatId, cancelled);
    return () => { cancelled.current = true; };
  }, [parentCatId, loadSubs]);

  const loadData = useCallback(async (cancelled = { current: false }) => {
    try {
      if (globalUserName) {
        setInputUserName(globalUserName);
      }
      const cats = await getCategories(db, catType);
      if (cancelled.current) return;
      setExistingCats(cats);
      const accs = await getAccounts(db);
      if (cancelled.current) return;
      setAccounts(accs);
    } catch (e) {
      console.error('Settings loadData error:', e);
    }
  }, [db, catType, globalUserName]);

  useFocusEffect(useCallback(() => {
    const cancelled = { current: false };
    loadData(cancelled);
    return () => { cancelled.current = true; };
  }, [loadData]));

  const handleSaveUser = async () => {
    if (!inputUserName.trim()) return showStatus('Error', 'Nama tidak boleh kosong.', 'error');
    try {
      await setGlobalUserName(inputUserName);
      showStatus('Sukses', 'Profil berhasil disimpan.', 'success');
    } catch (e) {
      console.error('handleSaveUser error:', e);
      showStatus('Gagal Menyimpan', 'Nama tidak dapat disimpan. Silakan coba lagi.', 'error');
    }
  };

  const handleFactoryReset = () => {
    setResetModalVisible(true);
  };

  const confirmReset = async () => {
    try {
      await factoryReset(db);
      setResetModalVisible(false);
      Alert.alert(
        'Berhasil',
        'Riwayat transaksi telah dibersihkan. Saldo dompet kembali ke nilai awal.',
        [{ text: 'OK' }]
      );
      loadData(); 
    } catch (e) {
      console.error('confirmReset error:', e);
      setResetModalVisible(false);
      Alert.alert(
        'Gagal Reset',
        'Tidak dapat membersihkan riwayat transaksi. Silakan coba lagi.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleAddOrUpdateWallet = async () => {
    if (!walletName.trim()) return showStatus('Error', 'Nama dompet wajib diisi.', 'error');
    const bal = parseInt(initialBalance.replace(/[^0-9]/g, ''), 10) || 0;
    const isExcluded = excludeFromTotal || walletType === 'investment' || walletType === 'credit' ? 1 : 0;
    try {
      if (editWalletId) {
        await db.runAsync(
          'UPDATE accounts SET name = ?, type = ?, color = ?, initial_balance = ?, exclude_from_total = ? WHERE id = ?',
          [walletName.trim(), walletType, walletColor, bal, isExcluded, editWalletId]
        );
        await updateAccountBalance(db, editWalletId);
        showStatus('Berhasil', `Dompet "${walletName}" diperbarui!`, 'success');
        setEditWalletId(null);
      } else {
        await db.runAsync(
          'INSERT INTO accounts (name, type, color, initial_balance, current_balance, is_active, exclude_from_total) VALUES (?, ?, ?, ?, ?, 1, ?)',
          [walletName.trim(), walletType, walletColor, bal, bal, isExcluded]
        );
        showStatus('Berhasil', `Dompet "${walletName}" ditambahkan!`, 'success');
      }
      setWalletName('');
      setInitialBalance('');
      setExcludeFromTotal(false);
      loadData();
    } catch (e) {
      console.error('handleAddOrUpdateWallet error:', e);
      showStatus('Gagal', 'Sistem tidak dapat menyimpan dompet. Silakan coba lagi.', 'error');
    }
  };

  const cancelEditWallet = () => {
    setEditWalletId(null);
    setWalletName('');
    setInitialBalance('');
    setExcludeFromTotal(false);
  };

  const handleManageWallet = (acc) => {
    Alert.alert('Kelola Dompet', `Apa yang ingin Anda lakukan dengan "${acc.name}"?`, [
      { text: 'Edit Dompet', onPress: () => {
          setEditWalletId(acc.id);
          setWalletName(acc.name);
          setWalletType(acc.type);
          setWalletColor(acc.color);
          setInitialBalance('Rp ' + (acc.initial_balance || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
          setExcludeFromTotal(acc.exclude_from_total === 1);
      }},
      { text: 'Hapus / Nonaktifkan', style: 'destructive', onPress: () => handleDeleteAccount(acc) },
      { text: 'Batal', style: 'cancel' }
    ]);
  };

  const handleDeleteAccount = (acc) => {
    Alert.alert(
      'Nonaktifkan Dompet',
      `Nonaktifkan "${acc.name}"? Dompet ini tidak akan muncul lagi di pilihan transaksi.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Nonaktifkan', style: 'destructive', onPress: async () => {
            try {
              await db.runAsync('UPDATE accounts SET is_active = 0 WHERE id = ?', [acc.id]);
              loadData();
            } catch (e) {
              console.error('Deactivate account error:', e);
              Alert.alert('Error', 'Gagal menonaktifkan dompet.');
            }
          }
        },
      ]
    );
  };

  const handleAddCategory = async () => {
    if (!catName.trim()) return showStatus('Error', 'Nama kategori wajib diisi.', 'error');
    try {
      await db.runAsync(
        'INSERT INTO categories (name, type, is_fixed) VALUES (?, ?, ?)',
        [catName.trim(), catType, isFixed ? 1 : 0]
      );
      setCatName('');
      setIsFixed(false);
      loadData();
    } catch (e) {
      console.error('handleAddCategory error:', e);
      showStatus('Gagal Menambah', 'Kategori tidak dapat ditambahkan. Silakan coba lagi.', 'error');
    }
  };

  const handleAddSub = async () => {
    if (!parentCatId || !subCatName.trim()) return showStatus('Error', 'Pilih kategori induk & ketik nama subkategori.', 'error');
    try {
      await addSubCategory(db, { category_id: parentCatId, name: subCatName.trim() });
      setSubCatName('');
      loadSubs(parentCatId);
    } catch (e) {
      console.error('handleAddSub error:', e);
      showStatus('Gagal Menambah', 'Subkategori tidak dapat ditambahkan. Silakan coba lagi.', 'error');
    }
  };

  const handleDeleteSub = (id, name) => {
    Alert.alert('Hapus', `Hapus sub-kategori "${name}"?`, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: async () => {
        try {
          await deleteSubCategory(db, id);
          loadSubs(parentCatId);
        } catch (e) {
          console.error('handleDeleteSub error:', e);
          Alert.alert('Gagal Menghapus', 'Subkategori tidak dapat dihapus. Silakan coba lagi.', [{ text: 'OK' }]);
        }
      }},
    ]);
  };

  const handleDeleteCat = (id, name) => {
    Alert.alert('Hapus Kategori', `Hapus "${name}"? Transaksi lama tetap tersimpan.`, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: async () => {
        try {
          await deleteCategory(db, id);
          setParentCatId(null);
          loadData();
        } catch (e) {
          console.error('handleDeleteCat error:', e);
          Alert.alert('Gagal Menghapus', 'Kategori tidak dapat dihapus. Silakan coba lagi.', [{ text: 'OK' }]);
        }
      }},
    ]);
  };

  const TABS = [
    { key: 'wallet', label: 'Dompet', icon: 'wallet' },
    { key: 'category', label: 'Kategori', icon: 'pricetag' },
    { key: 'profile', label: 'Profil', icon: 'person' },
  ];

  return (
    <ScrollView style={styles.root} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
      <Text style={styles.pageTitle}>Pengaturan</Text>

      {/* Tab Switcher */}
      <View style={styles.tabs}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons name={tab.icon} size={16} color={activeTab === tab.key ? '#7c6aff' : '#4a5568'} />
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* WALLET TAB */}
      {activeTab === 'wallet' && (
        <>
          <Section title={editWalletId ? "Edit Dompet" : "Tambah Dompet Baru"} subtitle={editWalletId ? "Perubahan nominal awal akan mengkalkulasi ulang saldo." : "Pilih tipe dan warna untuk identifikasi dompet."}>
            <TextInput
              style={styles.input}
              placeholder="Nama dompet (cth: BCA Tabungan)"
              placeholderTextColor="#2a3550"
              value={walletName}
              onChangeText={setWalletName}
            />
            <Text style={styles.fieldLabel}>Tipe Dompet</Text>
            <View style={styles.typeGrid}>
              {WALLET_TYPES.map(t => (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.typeChip, walletType === t.key && { borderColor: t.color, backgroundColor: t.color + '1a' }]}
                  onPress={() => { setWalletType(t.key); setWalletColor(t.color); }}
                >
                  <Ionicons name={t.icon} size={14} color={walletType === t.key ? t.color : '#4a5568'} />
                  <Text style={[styles.typeChipText, walletType === t.key && { color: t.color }]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.fieldLabel}>Warna</Text>
            <View style={styles.colorRow}>
              {WALLET_COLORS.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.colorDot, { backgroundColor: c }, walletColor === c && styles.colorDotActive]}
                  onPress={() => setWalletColor(c)}
                />
              ))}
            </View>
            <Text style={styles.fieldLabel}>Saldo Awal</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              placeholder="Rp 0"
              placeholderTextColor="#2a3550"
              value={initialBalance}
              onChangeText={(text) => {
                const raw = text.replace(/[^0-9]/g, '');
                if (!raw) return setInitialBalance('');
                setInitialBalance('Rp ' + parseInt(raw, 10).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
              }}
            />
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchLabel}>Kecualikan dari Total Aset?</Text>
                <Text style={styles.switchSub}>Aktifkan untuk kartu kredit, investasi, atau pinjaman.</Text>
              </View>
              <Switch
                value={excludeFromTotal}
                onValueChange={setExcludeFromTotal}
                trackColor={{ false: '#1a2540', true: '#7c6aff' }}
                thumbColor={excludeFromTotal ? '#fff' : '#4a5568'}
              />
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              {editWalletId && (
                <TouchableOpacity style={[styles.btnPrimary, { backgroundColor: '#1a2540', flex: 1 }]} onPress={cancelEditWallet}>
                  <Text style={[styles.btnPrimaryText, { color: '#ff4d6d' }]}>Batal</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.btnPrimary, { flex: 2 }]} onPress={handleAddOrUpdateWallet}>
                <Ionicons name={editWalletId ? 'save' : 'add-circle'} size={18} color="#fff" />
                <Text style={styles.btnPrimaryText}>{editWalletId ? 'Update Dompet' : 'Simpan Dompet Baru'}</Text>
              </TouchableOpacity>
            </View>
          </Section>

          <Section title="Dompet Aktif" subtitle="Ketuk untuk mengedit atau menghapus.">
            {accounts.map(acc => (
              <TouchableOpacity
                key={acc.id}
                style={styles.accItem}
                onPress={() => handleManageWallet(acc)}
                onLongPress={() => handleDeleteAccount(acc)}
              >
                <View style={[styles.accDot, { backgroundColor: acc.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.accName}>{acc.name}</Text>
                  <Text style={styles.accType}>{acc.type.toUpperCase()} {acc.exclude_from_total ? '· Eksklusif' : ''}</Text>
                </View>
                <Text style={[styles.accBalance, { color: acc.color }]}>
                  Rp {(acc.current_balance || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                </Text>
              </TouchableOpacity>
            ))}
            {accounts.length === 0 && <Text style={styles.empty}>Belum ada dompet aktif.</Text>}
          </Section>
        </>
      )}

      {/* CATEGORY TAB */}
      {activeTab === 'category' && (
        <>
          <Section title="Tambah Kategori Induk" subtitle="Buat kategori kustom untuk transaksi Anda.">
            <View style={styles.pillRow}>
              <TouchableOpacity
                style={[styles.pill, catType === 'expense' && { borderColor: '#ff4d6d', backgroundColor: '#ff4d6d1a' }]}
                onPress={() => { setCatType('expense'); setParentCatId(null); }}
              >
                <Text style={[styles.pillText, catType === 'expense' && { color: '#ff4d6d' }]}>Pengeluaran</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pill, catType === 'income' && { borderColor: '#00c896', backgroundColor: '#00c8961a' }]}
                onPress={() => { setCatType('income'); setParentCatId(null); }}
              >
                <Text style={[styles.pillText, catType === 'income' && { color: '#00c896' }]}>Pemasukan</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Nama kategori baru..."
              placeholderTextColor="#2a3550"
              value={catName}
              onChangeText={setCatName}
            />
            {catType === 'expense' && (
              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchLabel}>Pengeluaran Tetap (Fixed)?</Text>
                  <Text style={styles.switchSub}>Tandai bila ini biaya rutin bulanan (cicilan, langganan, dll).</Text>
                </View>
                <Switch
                  value={isFixed}
                  onValueChange={setIsFixed}
                  trackColor={{ false: '#1a2540', true: '#7c6aff' }}
                  thumbColor={isFixed ? '#fff' : '#4a5568'}
                />
              </View>
            )}
            <TouchableOpacity style={styles.btnPrimary} onPress={handleAddCategory}>
              <Ionicons name="add-circle" size={18} color="#fff" />
              <Text style={styles.btnPrimaryText}>Tambah Kategori</Text>
            </TouchableOpacity>
          </Section>

          <Section title={`Kategori ${catType === 'expense' ? 'Pengeluaran' : 'Pemasukan'}`} subtitle="Ketuk untuk pilih dan kelola subkategori.">
            {existingCats.map(c => (
              <TouchableOpacity
                key={c.id}
                style={[styles.catRow, parentCatId === c.id && styles.catRowActive]}
                onPress={() => setParentCatId(parentCatId === c.id ? null : c.id)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.catName}>
                    {c.name}
                    {c.is_fixed === 1 && <Text style={styles.fixedTag}> · Tetap</Text>}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleDeleteCat(c.id, c.name)} style={styles.deleteBtnSmall}>
                  <Ionicons name="trash-outline" size={14} color="#ff4d6d" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
            {existingCats.length === 0 && <Text style={styles.empty}>Belum ada kategori.</Text>}
          </Section>

          {parentCatId !== null && (
            <Section title="Sub-Kategori" subtitle={`Subkategori untuk: ${existingCats.find(c => c.id === parentCatId)?.name || ''}`}>
              {existingSubs.map(s => (
                <View key={s.id} style={styles.subRow}>
                  <Text style={styles.subName}>· {s.name}</Text>
                  <TouchableOpacity onPress={() => handleDeleteSub(s.id, s.name)} style={styles.deleteBtnSmall}>
                    <Ionicons name="close-circle" size={16} color="#ff4d6d" />
                  </TouchableOpacity>
                </View>
              ))}
              <TextInput
                style={[styles.input, { marginTop: 8 }]}
                placeholder="Nama subkategori baru..."
                placeholderTextColor="#2a3550"
                value={subCatName}
                onChangeText={setSubCatName}
              />
              <TouchableOpacity style={[styles.btnPrimary, { backgroundColor: '#7c6aff' }]} onPress={handleAddSub}>
                <Ionicons name="add-circle" size={18} color="#fff" />
                <Text style={styles.btnPrimaryText}>Tambah Subkategori</Text>
              </TouchableOpacity>
            </Section>
          )}
        </>
      )}

      {/* PROFILE TAB */}
      {activeTab === 'profile' && (
        <>
          <Section title="Profil Pengguna" subtitle="Nama ini ditampilkan sebagai sapaan di beranda.">
            <TextInput
              style={styles.input}
              placeholder="Nama Anda"
              placeholderTextColor="#2a3550"
              value={inputUserName}
              onChangeText={setInputUserName}
            />
            <TouchableOpacity style={styles.btnPrimary} onPress={handleSaveUser}>
              <Ionicons name="save" size={18} color="#fff" />
              <Text style={styles.btnPrimaryText}>Simpan Nama</Text>
            </TouchableOpacity>
          </Section>

          <View style={[styles.infoCard, { marginBottom: 20 }]}>
            <Ionicons name="information-circle-outline" size={20} color="#4a5568" style={{ marginBottom: 8 }} />
            <Text style={styles.infoTitle}>MoneyTracker v1.0</Text>
            <Text style={styles.infoText}>Aplikasi pencatat keuangan pribadi offline. Data tersimpan aman di perangkat Anda.</Text>
            <Text style={{ marginTop: 12, color: '#7c6aff', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 }}>DEVELOPED BY RTEITCH</Text>
          </View>

          <View style={styles.dangerCard}>
            <Text style={styles.dangerTitle}>Zona Berbahaya</Text>
            <Text style={styles.dangerSub}>Hapus riwayat transaksi tapi pertahankan dompet & kategori.</Text>
            <TouchableOpacity style={[styles.btnPrimary, { backgroundColor: '#ff4d6d15', borderWidth: 1, borderColor: '#ff4d6d' }]} onPress={handleFactoryReset}>
              <Ionicons name="trash" size={18} color="#ff4d6d" />
              <Text style={[styles.btnPrimaryText, { color: '#ff4d6d' }]}>Bersihkan Riwayat Transaksi</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* CUSTOM RESET MODAL */}
      <Modal
        visible={isResetModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setResetModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconBox}>
              <Ionicons name="warning" size={32} color="#ff4d6d" />
            </View>
            <Text style={styles.modalTitle}>Hapus Riwayat?</Text>
            <Text style={styles.modalDesc}>
              Semua <Text style={{ color: '#e8edf5', fontWeight: '700' }}>RIWAYAT TRANSAKSI</Text> akan dihapus permanen. Saldo dompet akan di-reset ke nilai awal.
              {'\n\n'}
              <Text style={{ fontStyle: 'italic', color: '#00c896' }}>Dompet & Kategori Anda tetap aman.</Text>
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#1a2540' }]}
                onPress={() => setResetModalVisible(false)}
              >
                <Text style={[styles.modalBtnText, { color: '#e8edf5' }]}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#ff4d6d' }]}
                onPress={confirmReset}
              >
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>Ya, Hapus</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* CUSTOM STATUS/ERROR MODAL */}
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
  pageTitle: { color: '#e8edf5', fontSize: 20, fontWeight: '800', marginLeft: 20, marginTop: 16, marginBottom: 16 },

  tabs: {
    flexDirection: 'row', marginHorizontal: 16, backgroundColor: '#0d1526',
    borderRadius: 14, padding: 4, marginBottom: 20, borderWidth: 1, borderColor: '#1a2540',
  },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, gap: 6 },
  tabActive: { backgroundColor: '#7c6aff1a' },
  tabText: { color: '#4a5568', fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#7c6aff' },

  input: {
    backgroundColor: '#060d1a', color: '#e8edf5', padding: 14,
    borderRadius: 12, marginBottom: 14, borderWidth: 1, borderColor: '#1a2540', fontSize: 14,
  },
  fieldLabel: { color: '#8892a4', fontSize: 11, fontWeight: '700', marginBottom: 8, letterSpacing: 0.5 },

  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  typeChip: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1, borderColor: '#1a2540', gap: 6,
  },
  typeChipText: { color: '#4a5568', fontSize: 12, fontWeight: '600' },

  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  colorDot: { width: 28, height: 28, borderRadius: 14 },
  colorDotActive: { borderWidth: 3, borderColor: '#fff', transform: [{ scale: 1.15 }] },

  switchRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#060d1a', padding: 14, borderRadius: 12, marginBottom: 14,
  },
  switchLabel: { color: '#e8edf5', fontSize: 13, fontWeight: '600' },
  switchSub: { color: '#4a5568', fontSize: 11, marginTop: 3, lineHeight: 15 },

  btnPrimary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#00c896', padding: 14, borderRadius: 12, gap: 8,
  },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  accItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#1a2540',
  },
  accDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  accName: { color: '#e8edf5', fontSize: 14, fontWeight: '600' },
  accType: { color: '#4a5568', fontSize: 11, marginTop: 2 },
  accBalance: { fontSize: 13, fontWeight: '700' },

  pillRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  pill: {
    flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10,
    borderWidth: 1, borderColor: '#1a2540',
  },
  pillText: { color: '#4a5568', fontSize: 13, fontWeight: '700' },

  catRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: '#1a2540', paddingHorizontal: 4,
  },
  catRowActive: { backgroundColor: '#7c6aff1a', borderRadius: 8, paddingHorizontal: 10, marginHorizontal: -6 },
  catName: { color: '#e8edf5', fontSize: 13, fontWeight: '600' },
  fixedTag: { color: '#f59e0b', fontSize: 11, fontWeight: '600' },

  subRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1a2540',
  },
  subName: { color: '#8892a4', fontSize: 13 },

  deleteBtnSmall: { padding: 6 },

  infoCard: {
    marginHorizontal: 16, backgroundColor: '#0d1526', borderRadius: 14,
    padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#1a2540',
  },
  infoTitle: { color: '#e8edf5', fontWeight: '700', fontSize: 14, marginBottom: 6 },
  infoText: { color: '#4a5568', fontSize: 12, textAlign: 'center', lineHeight: 18 },

  dangerCard: {
    marginHorizontal: 16, backgroundColor: '#1a0d15', borderRadius: 18,
    padding: 20, marginBottom: 30, borderWidth: 1, borderColor: '#ff4d6d33',
  },
  dangerTitle: { color: '#ff4d6d', fontSize: 15, fontWeight: '700', marginBottom: 4 },
  dangerSub: { color: '#8892a4', fontSize: 12, marginBottom: 16, lineHeight: 18 },

  empty: { color: '#2a3550', fontStyle: 'italic', fontSize: 13, paddingVertical: 8, textAlign: 'center' },

  // Modal styles
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalContent: {
    backgroundColor: '#0d1526', width: '100%', borderRadius: 24,
    padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#1a2540',
  },
  modalIconBox: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#ff4d6d15',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  modalTitle: { color: '#e8edf5', fontSize: 20, fontWeight: '800', marginBottom: 12 },
  modalDesc: { color: '#8892a4', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  modalActions: { flexDirection: 'row', gap: 12, width: '100%' },
  modalBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  modalBtnText: { fontSize: 14, fontWeight: '700' },
});