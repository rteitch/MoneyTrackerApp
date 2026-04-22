import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useSQLiteContext } from 'expo-sqlite';
import React, { useCallback, useState } from 'react';
import {
    Alert,
    Modal, RefreshControl,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import StatusModal from '../components/StatusModal';
import { useAppActions, useAppContext } from '../context/AppContext';
import {
    addSubCategory,
    deleteCategory,
    deleteSubCategory,
    factoryReset,
    getAccounts,
    getCategories,
    getSubCategories,
    updateAccountBalance
} from '../db/database';
import { formatCurrencyInput, parseCurrencyRaw } from '../utils/formatting';

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

function Section({ title, subtitle, children, styles }) {
  return (
    <View style={styles.sectionWrap}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle && <Text style={styles.sectionSub}>{subtitle}</Text>}
      {children}
    </View>
  );
}

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const { userName: globalUserName, colors, themeMode } = useAppContext();
  const { setUserName, setThemeMode } = useAppActions();
  
  // Generate dynamic styles based on theme
  const styles = makeStyles(colors);

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
  const [refreshing, setRefreshing] = useState(false);

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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleSaveUser = async () => {
    if (!inputUserName.trim()) return showStatus('Error', 'Nama tidak boleh kosong.', 'error');
    try {
      await setUserName(inputUserName);
      showStatus('Sukses', 'Profil berhasil disimpan.', 'success');
    } catch (e) {
      console.error('handleSaveUser error:', e);
      showStatus('Gagal Menyimpan', 'Nama tidak dapat disimpan. Silakan coba lagi.', 'error');
    }
  };

  const handleThemeChange = async (mode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await setThemeMode(mode);
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
    const bal = parseCurrencyRaw(initialBalance);
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
          setInitialBalance(formatCurrencyInput((acc.initial_balance || 0).toString()));
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
    { key: 'appearance', label: 'Tampilan', icon: 'color-palette' },
    { key: 'profile', label: 'Profil', icon: 'person' },
  ];

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle={colors.bgPrimary === '#ffffff' ? 'dark-content' : 'light-content'} backgroundColor={colors.bgPrimary} />
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 80 }}
        refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.brand}
          colors={[colors.brand]}
        />
      }
    >
      <Text style={styles.pageTitle}>Pengaturan</Text>

      {/* Tab Switcher */}
      <View style={styles.tabs}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && { backgroundColor: colors.brand + '1a' }]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons name={tab.icon} size={16} color={activeTab === tab.key ? colors.brand : colors.textMuted} />
            <Text style={[styles.tabText, { color: activeTab === tab.key ? colors.brand : colors.textMuted }]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* WALLET TAB */}
      {activeTab === 'wallet' && (
        <>
          <Section 
            styles={styles}
            title={editWalletId ? "Edit Dompet" : "Tambah Dompet Baru"} 
            subtitle={editWalletId ? "Perubahan nominal awal akan mengkalkulasi ulang saldo." : "Pilih tipe dan warna untuk identifikasi dompet."}
          >
            <TextInput
              style={styles.input}
              placeholder="Nama dompet (cth: BCA Tabungan)"
              placeholderTextColor={colors.textFaint}
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
                  <Ionicons name={t.icon} size={14} color={walletType === t.key ? t.color : colors.textMuted} />
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
              placeholderTextColor={colors.textFaint}
              value={initialBalance}
              onChangeText={(text) => setInitialBalance(formatCurrencyInput(text))}
            />
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchLabel}>Kecualikan dari Total Aset?</Text>
                <Text style={styles.switchSub}>Aktifkan untuk kartu kredit, investasi, atau pinjaman.</Text>
              </View>
              <Switch
                value={excludeFromTotal}
                onValueChange={setExcludeFromTotal}
                trackColor={{ false: colors.bgElevated, true: colors.brand }}
                thumbColor={excludeFromTotal ? '#fff' : colors.textMuted}
              />
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              {editWalletId && (
                <TouchableOpacity style={[styles.btnPrimary, { backgroundColor: colors.bgElevated, flex: 1 }]} onPress={cancelEditWallet}>
                  <Text style={[styles.btnPrimaryText, { color: colors.expense }]}>Batal</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.btnPrimary, { backgroundColor: colors.income, flex: 2 }]} onPress={handleAddOrUpdateWallet}>
                <Ionicons name={editWalletId ? 'save' : 'add-circle'} size={18} color="#fff" />
                <Text style={styles.btnPrimaryText}>{editWalletId ? 'Update Dompet' : 'Simpan Dompet Baru'}</Text>
              </TouchableOpacity>
            </View>
          </Section>

          <Section styles={styles} title="Dompet Aktif" subtitle="Ketuk untuk mengedit atau menghapus.">
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
          <Section styles={styles} title="Tambah Kategori Induk" subtitle="Buat kategori kustom untuk transaksi Anda.">
            <View style={styles.pillRow}>
              <TouchableOpacity
                style={[styles.pill, catType === 'expense' && { borderColor: colors.expense, backgroundColor: colors.expense + '1a' }]}
                onPress={() => { setCatType('expense'); setParentCatId(null); }}
              >
                <Text style={[styles.pillText, catType === 'expense' && { color: colors.expense }]}>Pengeluaran</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pill, catType === 'income' && { borderColor: colors.income, backgroundColor: colors.income + '1a' }]}
                onPress={() => { setCatType('income'); setParentCatId(null); }}
              >
                <Text style={[styles.pillText, catType === 'income' && { color: colors.income }]}>Pemasukan</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Nama kategori baru..."
              placeholderTextColor={colors.textFaint}
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
                  trackColor={{ false: colors.bgElevated, true: colors.brand }}
                  thumbColor={isFixed ? '#fff' : colors.textMuted}
                />
              </View>
            )}
            <TouchableOpacity style={[styles.btnPrimary, { backgroundColor: colors.brand }]} onPress={handleAddCategory}>
              <Ionicons name="add-circle" size={18} color="#fff" />
              <Text style={styles.btnPrimaryText}>Tambah Kategori</Text>
            </TouchableOpacity>
          </Section>

          <Section styles={styles} title={`Kategori ${catType === 'expense' ? 'Pengeluaran' : 'Pemasukan'}`} subtitle="Ketuk untuk pilih dan kelola subkategori.">
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
                  <Ionicons name="trash-outline" size={14} color={colors.expense} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
            {existingCats.length === 0 && <Text style={styles.empty}>Belum ada kategori.</Text>}
          </Section>

          {parentCatId !== null && (
            <Section styles={styles} title="Sub-Kategori" subtitle={`Subkategori untuk: ${existingCats.find(c => c.id === parentCatId)?.name || ''}`}>
              {existingSubs.map(s => (
                <View key={s.id} style={styles.subRow}>
                  <Text style={styles.subName}>· {s.name}</Text>
                  <TouchableOpacity onPress={() => handleDeleteSub(s.id, s.name)} style={styles.deleteBtnSmall}>
                    <Ionicons name="close-circle" size={16} color={colors.expense} />
                  </TouchableOpacity>
                </View>
              ))}
              <TextInput
                style={[styles.input, { marginTop: 8 }]}
                placeholder="Nama subkategori baru..."
                placeholderTextColor={colors.textFaint}
                value={subCatName}
                onChangeText={setSubCatName}
              />
              <TouchableOpacity style={[styles.btnPrimary, { backgroundColor: colors.brand }]} onPress={handleAddSub}>
                <Ionicons name="add-circle" size={18} color="#fff" />
                <Text style={styles.btnPrimaryText}>Tambah Subkategori</Text>
              </TouchableOpacity>
            </Section>
          )}
        </>
      )}

      {/* APPEARANCE TAB */}
      {activeTab === 'appearance' && (
        <>
          <Section styles={styles} title="Tema Aplikasi" subtitle="Pilih suasana aplikasi yang paling nyaman untuk mata Anda.">
            <View style={styles.themeGrid}>
              {[
                { key: 'dark', label: 'Dark Mode', icon: 'moon' },
                { key: 'light', label: 'Light Mode', icon: 'sunny' },
                { key: 'system', label: 'Ikuti Sistem', icon: 'laptop' },
              ].map(t => (
                <TouchableOpacity
                  key={t.key}
                  style={[
                    styles.themeCard, 
                    themeMode === t.key && { borderColor: colors.brand, backgroundColor: colors.brand + '10' }
                  ]}
                  onPress={() => handleThemeChange(t.key)}
                >
                  <View style={[styles.themeIcon, { backgroundColor: themeMode === t.key ? colors.brand : colors.bgElevated }]}>
                    <Ionicons name={t.icon} size={20} color={themeMode === t.key ? '#fff' : colors.textSecondary} />
                  </View>
                  <Text style={[styles.themeLabel, themeMode === t.key && { color: colors.brand }]}>{t.label}</Text>
                  {themeMode === t.key && <Ionicons name="checkmark-circle" size={16} color={colors.brand} style={styles.themeCheck} />}
                </TouchableOpacity>
              ))}
            </View>
          </Section>
        </>
      )}

      {/* PROFILE TAB */}
      {activeTab === 'profile' && (
        <>
          <Section styles={styles} title="Profil Pengguna" subtitle="Nama ini ditampilkan sebagai sapaan di beranda.">
            <TextInput
              style={styles.input}
              placeholder="Nama Anda"
              placeholderTextColor={colors.textFaint}
              value={inputUserName}
              onChangeText={setInputUserName}
            />
            <TouchableOpacity style={[styles.btnPrimary, { backgroundColor: colors.brand }]} onPress={handleSaveUser}>
              <Ionicons name="save" size={18} color="#fff" />
              <Text style={styles.btnPrimaryText}>Simpan Nama</Text>
            </TouchableOpacity>
          </Section>

          <View style={[styles.infoCard, { marginBottom: 20 }]}>
            <Ionicons name="information-circle-outline" size={20} color={colors.textMuted} style={{ marginBottom: 8 }} />
            <Text style={styles.infoTitle}>MoneyTracker v1.1</Text>
            <Text style={styles.infoText}>Aplikasi pencatat keuangan pribadi offline. Data tersimpan aman di perangkat Anda.</Text>
            <Text style={{ marginTop: 12, color: colors.brand, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 }}>DEVELOPED BY RTEITCH</Text>
          </View>

          <View style={styles.dangerCard}>
            <Text style={styles.dangerTitle}>Zona Berbahaya</Text>
            <Text style={styles.dangerSub}>Hapus riwayat transaksi tapi pertahankan dompet & kategori.</Text>
            <TouchableOpacity style={[styles.btnPrimary, { backgroundColor: colors.expense + '15', borderWidth: 1, borderColor: colors.expense }]} onPress={handleFactoryReset}>
              <Ionicons name="trash" size={18} color={colors.expense} />
              <Text style={[styles.btnPrimaryText, { color: colors.expense }]}>Bersihkan Riwayat Transaksi</Text>
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
            <View style={[styles.modalIconBox, { backgroundColor: colors.expense + '15' }]}>
              <Ionicons name="warning" size={32} color={colors.expense} />
            </View>
            <Text style={styles.modalTitle}>Hapus Riwayat?</Text>
            <Text style={styles.modalDesc}>
              Semua <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>RIWAYAT TRANSAKSI</Text> akan dihapus permanen. Saldo dompet akan di-reset ke nilai awal.
              {'\n\n'}
              <Text style={{ fontStyle: 'italic', color: colors.income }}>Dompet & Kategori Anda tetap aman.</Text>
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.bgElevated }]}
                onPress={() => setResetModalVisible(false)}
              >
                <Text style={[styles.modalBtnText, { color: colors.textPrimary }]}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.expense }]}
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
    </SafeAreaView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgPrimary },
  pageTitle: { fontSize: 20, fontWeight: '800', marginLeft: 20, marginTop: 16, marginBottom: 16, color: colors.textPrimary },

  tabs: {
    flexDirection: 'row', marginHorizontal: 16,
    borderRadius: 14, padding: 4, marginBottom: 20, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.bgCard,
  },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, gap: 6 },
  tabText: { fontSize: 11, fontWeight: '700' },

  sectionWrap: {
    borderRadius: 18, padding: 20,
    marginHorizontal: 16, marginBottom: 16, borderWidth: 1,
    backgroundColor: colors.bgCard, borderColor: colors.border,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4, color: colors.textPrimary },
  sectionSub: { fontSize: 12, marginBottom: 16, lineHeight: 18, color: colors.textSecondary },

  input: {
    padding: 14, borderRadius: 12, marginBottom: 14, borderWidth: 1, fontSize: 14,
    backgroundColor: colors.bgPrimary, color: colors.textPrimary, borderColor: colors.border,
  },
  fieldLabel: { fontSize: 11, fontWeight: '700', marginBottom: 8, letterSpacing: 0.5, color: colors.textSecondary },

  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  typeChip: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1, borderColor: colors.border, gap: 6,
  },
  typeChipText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },

  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  colorDot: { width: 28, height: 28, borderRadius: 14 },
  colorDotActive: { borderWidth: 3, borderColor: colors.textPrimary, transform: [{ scale: 1.15 }] },

  switchRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.bgPrimary, padding: 14, borderRadius: 12, marginBottom: 14,
  },
  switchLabel: { color: colors.textPrimary, fontSize: 13, fontWeight: '600' },
  switchSub: { color: colors.textMuted, fontSize: 11, marginTop: 3, lineHeight: 15 },

  btnPrimary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.income, padding: 14, borderRadius: 12, gap: 8,
  },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  accItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  accDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  accName: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
  accType: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  accBalance: { fontSize: 13, fontWeight: '700' },

  pillRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  pill: {
    flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10,
    borderWidth: 1, borderColor: colors.border,
  },
  pillText: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },

  catRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: 4,
  },
  catRowActive: { backgroundColor: colors.brand + '1a', borderRadius: 8, paddingHorizontal: 10, marginHorizontal: -6 },
  catName: { color: colors.textPrimary, fontSize: 13, fontWeight: '600' },
  fixedTag: { color: colors.warning, fontSize: 11, fontWeight: '600' },

  subRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  subName: { color: colors.textSecondary, fontSize: 13 },

  deleteBtnSmall: { padding: 6 },

  infoCard: {
    marginHorizontal: 16, backgroundColor: colors.bgCard, borderRadius: 14,
    padding: 20, alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  infoTitle: { color: colors.textPrimary, fontWeight: '700', fontSize: 14, marginBottom: 6 },
  infoText: { color: colors.textMuted, fontSize: 12, textAlign: 'center', lineHeight: 18 },

  dangerCard: {
    marginHorizontal: 16, backgroundColor: colors.expense + '08', borderRadius: 18,
    padding: 20, marginBottom: 30, borderWidth: 1, borderColor: colors.expense + '33',
  },
  dangerTitle: { color: colors.expense, fontSize: 15, fontWeight: '700', marginBottom: 4 },
  dangerSub: { color: colors.textSecondary, fontSize: 12, marginBottom: 16, lineHeight: 18 },

  empty: { color: colors.textFaint, fontStyle: 'italic', fontSize: 13, paddingVertical: 8, textAlign: 'center' },

  // Modal styles
  themeGrid: { flexDirection: 'row', gap: 10 },
  themeCard: { 
    flex: 1, padding: 16, borderRadius: 16, borderWidth: 1, alignItems: 'center',
    position: 'relative', overflow: 'hidden', backgroundColor: colors.bgPrimary,
  },
  themeIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  themeLabel: { fontSize: 10, fontWeight: '700', textAlign: 'center', color: colors.textPrimary },
  themeCheck: { position: 'absolute', top: 6, right: 6 },

  modalOverlay: {
    flex: 1, backgroundColor: colors.overlay,
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalContent: {
    width: '100%', borderRadius: 24,
    padding: 24, alignItems: 'center', borderWidth: 1, backgroundColor: colors.bgCard, borderColor: colors.border,
  },
  modalIconBox: {
    width: 64, height: 64, borderRadius: 32,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 12, color: colors.textPrimary },
  modalDesc: { fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 24, color: colors.textSecondary },
  modalActions: { flexDirection: 'row', gap: 12, width: '100%' },
  modalBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  modalBtnText: { fontSize: 14, fontWeight: '700' },
});