import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, Vibration, Animated, ActivityIndicator
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from '@react-navigation/native';
import {
  getStats, getRecentTransactions, getDateFilterBoundary,
  getAccounts, getTotalHarta, deleteTransaction
} from '../db/database';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { formatRupiah, formatRupiahFull, getGreeting } from '../utils/formatting';
import TransactionCard from '../components/TransactionCard';
import BottomSheetModal from '../components/BottomSheetModal';
import { useAppContext } from '../context/AppContext';

const FILTERS = [
  { key: 'today', label: 'Hari Ini' },
  { key: 'week', label: 'Minggu Ini' },
  { key: 'month', label: 'Bulan Ini' },
  { key: 'year', label: 'Tahun Ini' },
  { key: 'last_year', label: 'Tahun Lalu' },
  { key: 'all', label: 'Semua' },
];



export default function DashboardScreen({ navigation }) {
  const db = useSQLiteContext();
  const [stats, setStats] = useState({ income: 0, expense: 0, balance: 0 });
  const [recentTX, setRecentTX] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [totalHarta, setTotalHarta] = useState(0);
  const [filter, setFilter] = useState('all');
  const { userName } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [txToDelete, setTxToDelete] = useState(null);
  const fabAnim = useRef(new Animated.Value(1)).current;

  const loadData = useCallback(async (cancelled = { current: false }) => {
    try {
      setLoading(true);
      setLoadError(false);
      const bounds = getDateFilterBoundary(filter);
      const s = await getStats(db, bounds);
      if (cancelled.current) return;
      setStats(s);
      const tx = await getRecentTransactions(db, 20, bounds);
      if (cancelled.current) return;
      setRecentTX(tx);
      const acc = await getAccounts(db);
      if (cancelled.current) return;
      setAccounts(acc);
      const harta = await getTotalHarta(db);
      if (cancelled.current) return;
      setTotalHarta(harta);
    } catch (e) {
      console.error('Dashboard loadData error:', e);
      if (!cancelled.current) setLoadError(true);
    } finally {
      if (!cancelled.current) setLoading(false);
    }
  }, [db, filter]);

  useFocusEffect(useCallback(() => {
    const cancelled = { current: false };
    loadData(cancelled);
    return () => { cancelled.current = true; };
  }, [loadData]));

  const handleFabPress = () => {
    Animated.sequence([
      Animated.spring(fabAnim, { toValue: 0.88, useNativeDriver: true, speed: 30 }),
      Animated.spring(fabAnim, { toValue: 1, useNativeDriver: true, speed: 20 }),
    ]).start();
    navigation.navigate('Tambah Transaksi');
  };

  const handleDelete = (item) => {
    Vibration.vibrate(40);
    setTxToDelete(item);
    setModalVisible(true);
  };

  const executeDelete = async () => {
    if (!txToDelete) return;
    try {
      await deleteTransaction(db, txToDelete.id);
      setModalVisible(false);
      setTxToDelete(null);
      loadData();
    } catch (e) {
      console.error('Dashboard executeDelete error:', e);
      setModalVisible(false);
      setTxToDelete(null);
      Alert.alert(
        'Gagal Menghapus',
        'Transaksi tidak dapat dihapus. Silakan coba lagi.',
        [{ text: 'OK' }]
      );
    }
  };

  const savingsRate = stats.income > 0
    ? Math.max(0, ((stats.income - stats.expense) / stats.income) * 100)
    : 0;

  const getGreetingText = () => getGreeting();

  const renderTxItem = (item) => (
    <TransactionCard
      key={item.id}
      item={item}
      onPress={(tx) => navigation.navigate('Tambah Transaksi', { editTx: tx })}
      onLongPress={handleDelete}
    />
  );

  const netColor = (stats.income - stats.expense) >= 0 ? '#00c896' : '#ff4d6d';

  return (
    <View style={styles.root}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.brand} />
          <Text style={styles.loadingText}>Memuat data...</Text>
        </View>
      ) : loadError ? (
        <View style={styles.loadingContainer}>
          <Ionicons name="cloud-offline-outline" size={56} color="#ff4d6d33" />
          <Text style={[styles.loadingText, { color: '#ff4d6d', marginTop: 16 }]}>Gagal Memuat Data</Text>
          <TouchableOpacity
            style={{ marginTop: 20, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#1a1040', borderRadius: 12, borderWidth: 1, borderColor: '#7c6aff' }}
            onPress={() => loadData()}
          >
            <Text style={{ color: '#7c6aff', fontSize: 13, fontWeight: '700' }}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      ) : (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
      >
        {/* Header */}
        <View style={styles.headerArea}>
          <View>
            <Text style={styles.greeting}>{getGreetingText()},</Text>
            <Text style={styles.userName}>{userName} 👋</Text>
          </View>
          <TouchableOpacity style={styles.notifBtn} onPress={() => navigation.navigate('Pengaturan')}>
            <Ionicons name="person-circle-outline" size={28} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Filter Chips */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.filterScroll}
          contentContainerStyle={{ paddingLeft: 20, paddingRight: 32 }}
        >
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.chip, filter === f.key && styles.chipActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[styles.chipText, filter === f.key && styles.chipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Hero Balance Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <Text style={styles.heroLabel}>Total Aset (Kas Aktif)</Text>
            <View style={[styles.savingsBadge, { backgroundColor: savingsRate >= 20 ? '#003d2a' : savingsRate >= 0 ? '#2d1a00' : '#2d0a14' }]}>
              <Text style={[styles.savingsText, { color: savingsRate >= 20 ? '#00c896' : savingsRate >= 0 ? '#f59e0b' : '#ff4d6d' }]}>
                {savingsRate.toFixed(0)}% saved
              </Text>
            </View>
          </View>
          <Text style={styles.heroBalance}>{formatRupiahFull(totalHarta)}</Text>
          <View style={styles.heroDivider} />
          <View style={styles.heroStats}>
            <View style={styles.heroStatItem}>
              <View style={styles.heroStatIcon}>
                <Ionicons name="arrow-up-circle" size={16} color="#00c896" />
              </View>
              <View>
                <Text style={styles.heroStatLabel}>Pemasukan</Text>
                <Text style={[styles.heroStatVal, { color: '#00c896' }]}>+{formatRupiah(stats.income)}</Text>
              </View>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <View style={styles.heroStatIcon}>
                <Ionicons name="arrow-down-circle" size={16} color="#ff4d6d" />
              </View>
              <View>
                <Text style={styles.heroStatLabel}>Pengeluaran</Text>
                <Text style={[styles.heroStatVal, { color: '#ff4d6d' }]}>−{formatRupiah(stats.expense)}</Text>
              </View>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <View style={styles.heroStatIcon}>
                <Ionicons name="swap-vertical" size={16} color={netColor} />
              </View>
              <View>
                <Text style={styles.heroStatLabel}>Net Cash</Text>
                <Text style={[styles.heroStatVal, { color: netColor }]}>
                  {stats.income - stats.expense >= 0 ? '+' : '−'}
                  {formatRupiah(Math.abs(stats.income - stats.expense))}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Wallet Cards */}
        <Text style={styles.sectionLabel}>Dompet & Rekening</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.walletsScroll}>
          {accounts.map(acc => (
            <TouchableOpacity
              key={acc.id}
              style={[styles.walletCard, { borderLeftColor: acc.color }]}
              onPress={() => navigation.navigate('Tambah Transaksi', { accountId: acc.id })}
            >
              <View style={[styles.walletDot, { backgroundColor: acc.color }]} />
              <Text style={styles.walletType}>{acc.type.toUpperCase()}</Text>
              <Text style={styles.walletName} numberOfLines={1}>{acc.name}</Text>
              <Text style={[styles.walletBalance, { color: acc.color }]}>
                {formatRupiah(acc.current_balance)}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.addWalletCard}
            onPress={() => navigation.navigate('Pengaturan')}
          >
            <Ionicons name="add" size={24} color="#4a5568" />
            <Text style={styles.addWalletText}>Tambah{'\n'}Dompet</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Recent Transactions */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionLabel}>Riwayat Transaksi</Text>
          {recentTX.length > 0 && (
            <Text style={styles.sectionHint}>ketuk edit · tahan hapus</Text>
          )}
        </View>

        {recentTX.length > 0 ? (
          recentTX.map(item => renderTxItem(item))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={44} color="#2a3550" />
            <Text style={styles.emptyTitle}>Belum ada transaksi</Text>
            <Text style={styles.emptySubtitle}>Ketuk tombol + untuk mulai mencatat</Text>
          </View>
        )}
      </ScrollView>
      )}

      {/* FAB */}
      <Animated.View style={[styles.fabWrap, { transform: [{ scale: fabAnim }] }]}>
        <TouchableOpacity style={styles.fab} onPress={handleFabPress} activeOpacity={0.85}>
          <Ionicons name="add" size={30} color="#fff" />
        </TouchableOpacity>
      </Animated.View>

      <BottomSheetModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title="Batalkan Transaksi?"
        iconName="trash-outline"
        iconColor={Colors.expense}
        primaryBtnText="Hapus"
        primaryBtnIcon="trash"
        primaryBtnAction={executeDelete}
        primaryBtnColor={Colors.expense}
      >
        {txToDelete && (
          <Text style={styles.sheetBody}>
            Transaksi <Text style={styles.sheetBold}>{txToDelete.category_name || 'Transfer'}</Text> senilai{' '}
            <Text style={styles.sheetAmount}>{formatRupiahFull(txToDelete.amount)}</Text> akan dihapus.
            {'\n\n'}Saldo dompet <Text style={styles.sheetBold}>{txToDelete.account_name}</Text> akan
            otomatis {txToDelete.type === 'expense' ? 'dikembalikan.' : 'dikurangi.'}
          </Text>
        )}
      </BottomSheetModal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgPrimary },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: Colors.textMuted, marginTop: 12, fontSize: 13 },
  headerArea: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
  },
  greeting: { color: '#4a5568', fontSize: 13, fontWeight: '500' },
  userName: { color: '#e8edf5', fontSize: 22, fontWeight: '700', marginTop: 2 },
  notifBtn: { padding: 4 },

  filterScroll: { marginBottom: 18, flexGrow: 0 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: '#0d1526', marginRight: 8, borderWidth: 1, borderColor: '#1a2540',
  },
  chipActive: { backgroundColor: '#7c6aff', borderColor: '#7c6aff' },
  chipText: { color: '#4a5568', fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#fff' },

  heroCard: {
    marginHorizontal: 16, borderRadius: 20, backgroundColor: '#0d1526',
    padding: 22, marginBottom: 22, borderWidth: 1, borderColor: '#1a2540',
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  heroLabel: { color: '#4a5568', fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
  savingsBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  savingsText: { fontSize: 11, fontWeight: '700' },
  heroBalance: { color: '#e8edf5', fontSize: 30, fontWeight: '800', letterSpacing: -0.5, marginBottom: 18 },
  heroDivider: { height: 1, backgroundColor: '#1a2540', marginBottom: 18 },
  heroStats: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroStatItem: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  heroStatIcon: { marginRight: 8 },
  heroStatLabel: { color: '#4a5568', fontSize: 10, fontWeight: '600', marginBottom: 2 },
  heroStatVal: { fontSize: 13, fontWeight: '700' },
  heroStatDivider: { width: 1, height: 32, backgroundColor: '#1a2540', marginHorizontal: 8 },

  sectionLabel: { color: '#e8edf5', fontSize: 15, fontWeight: '700', marginLeft: 20, marginBottom: 12 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginRight: 20 },
  sectionHint: { color: '#2a3550', fontSize: 11, fontStyle: 'italic' },

  walletsScroll: { paddingLeft: 16, marginBottom: 24, flexGrow: 0, maxHeight: 110 },
  walletCard: {
    backgroundColor: '#0d1526', borderRadius: 14, padding: 14,
    marginRight: 12, width: 140, borderLeftWidth: 3, borderWidth: 1, borderColor: '#1a2540',
  },
  walletDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 8 },
  walletType: { color: '#4a5568', fontSize: 9, fontWeight: '700', letterSpacing: 1.2, marginBottom: 2 },
  walletName: { color: '#e8edf5', fontSize: 13, fontWeight: '700', marginBottom: 6 },
  walletBalance: { fontSize: 12, fontWeight: '600' },
  addWalletCard: {
    backgroundColor: '#0d1526', borderRadius: 14, padding: 14,
    marginRight: 16, width: 80, borderWidth: 1, borderColor: '#1a2540',
    borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center',
  },
  addWalletText: { color: '#4a5568', fontSize: 11, textAlign: 'center', marginTop: 6, lineHeight: 15 },

  emptyState: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 },
  emptyTitle: { color: '#2a3550', fontSize: 15, fontWeight: '600', marginTop: 14 },
  emptySubtitle: { color: '#1e2a42', fontSize: 12, marginTop: 6 },

  fabWrap: { position: 'absolute', bottom: 28, right: 20 },
  fab: {
    width: 58, height: 58, borderRadius: 18, backgroundColor: '#7c6aff',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#7c6aff', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45, shadowRadius: 12, elevation: 10,
  },

  sheetTitle: { color: '#e8edf5', fontSize: 18, fontWeight: '700', marginBottom: 10, textAlign: 'center' },
  sheetBody: { color: '#8892a4', fontSize: 14, lineHeight: 22, marginBottom: 26, textAlign: 'center' },
  sheetBold: { color: '#e8edf5', fontWeight: '700' },
  sheetAmount: { color: '#ff4d6d', fontWeight: '700' },
  sheetBtns: { flexDirection: 'row', gap: 10 },
  btnSecondary: {
    flex: 1, padding: 14, borderRadius: 14, borderWidth: 1,
    borderColor: '#1a2540', alignItems: 'center',
  },
  btnSecondaryText: { color: '#8892a4', fontWeight: '600', fontSize: 15 },
  btnDanger: {
    flex: 1, padding: 14, borderRadius: 14, backgroundColor: '#ff4d6d',
    alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6,
  },
  btnDangerText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});