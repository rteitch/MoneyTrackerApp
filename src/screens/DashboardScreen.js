import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView
} from 'react-native';
import BottomSheetModal from '../components/BottomSheetModal';
import TransactionCard from '../components/TransactionCard';
import CountUp from '../components/CountUp';
import { useAppContext } from '../context/AppContext';
import {
  deleteTransaction,
  getAccounts,
  getDateFilterBoundary,
  getRecentTransactions,
  getStats,
  getTotalHarta
} from '../db/database';
import { formatRupiah, getGreeting } from '../utils/formatting';

const FILTER_OPTIONS = [
  { key: 'today', label: 'Hari Ini' },
  { key: 'week', label: 'Minggu Ini' },
  { key: 'month', label: 'Bulan Ini' },
  { key: 'year', label: 'Tahun Ini' },
  { key: 'all', label: 'Semua' },
];

export default function DashboardScreen({ navigation }) {
  const db = useSQLiteContext();
  const [stats, setStats] = useState({ income: 0, expense: 0, balance: 0 });
  const [recentTX, setRecentTX] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [totalHarta, setTotalHarta] = useState(0);
  const [filter, setFilter] = useState('all');
  const { userName, colors, currentTheme } = useAppContext();
  const styles = makeStyles(colors);

  const [initialLoading, setInitialLoading] = useState(true);  const [refreshing, setRefreshing] = useState(false);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  // Modal State
  const [selectedTx, setSelectedTx] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const boundary = getDateFilterBoundary(filter);
      const [s, tx, accs, total] = await Promise.all([
        getStats(db, boundary),
        getRecentTransactions(db, 10, boundary),
        getAccounts(db),
        getTotalHarta(db)
      ]);
      setStats(s);
      setRecentTX(tx);
      setAccounts(accs);
      setTotalHarta(total);
    } catch (e) {
      console.error('loadData error:', e);
      Alert.alert('Error', 'Gagal memuat data dashboard.');
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, [db, filter]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleTxPress = (tx) => {
    navigation.navigate('Tambah Transaksi', { editTx: tx, source: 'Beranda' });
  };

  const handleTxLongPress = (tx) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedTx(tx);
    setIsModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!selectedTx) return;
    try {
      await deleteTransaction(db, selectedTx.id);
      setIsModalVisible(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      loadData();
    } catch (e) {
      console.error('Delete error:', e);
      Alert.alert('Gagal', 'Terjadi kesalahan saat menghapus transaksi.');
    }
  };

  const savingsRate = stats.income > 0 ? ((stats.income - stats.expense) / stats.income) * 100 : 0;

  const renderHeader = useMemo(() => {
    const isLight = currentTheme === 'light';
    const heroGradient = isLight 
      ? [colors.brand, "#0066CC"] 
      : [colors.bgCard, colors.bgDeep];

    return (
      <View style={styles.header}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.userName}>{userName || 'User'}</Text>
          </View>
        </View>

        {/* Hero Card */}
        <LinearGradient
          colors={heroGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.heroCard,
            isLight && { 
              borderWidth: 0, 
              borderTopWidth: 0, // Inilah penyebab glitch-nya
              shadowColor: '#000', // Gunakan shadow hitam halus untuk mode terang agar lebih bersih
              shadowOpacity: 0.12,
              elevation: 0 
            }
          ]}
        >
          <View style={styles.heroDecoration1} />
          <View style={styles.heroDecoration2} />
          <View style={styles.heroTop}>
            <Text style={styles.heroLabel}>Total Aset (Kas Aktif)</Text>
            <View style={[
              styles.savingsBadge, 
              { backgroundColor: isLight ? 'rgba(255,255,255,0.2)' : (savingsRate >= 20 ? colors.incomeBg : (savingsRate >= 0 ? colors.warningBg : colors.expenseBg)) }
            ]}>
              <Text style={[
                styles.savingsText, 
                { color: isLight ? '#fff' : (savingsRate >= 20 ? colors.income : (savingsRate >= 0 ? colors.warning : colors.expense)) }
              ]}>
                {savingsRate.toFixed(0)}% saved
              </Text>
            </View>
          </View>
          <CountUp value={totalHarta} style={styles.heroBalance} isFull />
          <View style={styles.heroDivider} />
          <View style={styles.heroStats}>
            <View style={styles.heroStatItem}>
              <View style={styles.heroStatIcon}>
                <Ionicons name="arrow-up-circle" size={16} color={isLight ? '#fff' : colors.income} />
              </View>
              <View>
                <Text style={styles.heroStatLabel}>Pemasukan</Text>
                <Text style={[styles.heroStatVal, { color: isLight ? '#fff' : colors.income }]}>
                  + <CountUp value={stats.income} />
                </Text>
              </View>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <View style={styles.heroStatIcon}>
                <Ionicons name="arrow-down-circle" size={16} color={isLight ? '#fff' : colors.expense} />
              </View>
              <View>
                <Text style={styles.heroStatLabel}>Pengeluaran</Text>
                <Text style={[styles.heroStatVal, { color: isLight ? '#fff' : colors.expense }]}>
                  − <CountUp value={stats.expense} />
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Wallets Section */}
        <Text style={styles.sectionLabel}>Dompet & Rekening</Text>
        <FlatList
          horizontal
          data={accounts}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.walletScroll}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.7}
              style={[
                styles.walletCard, 
                { 
                  borderLeftColor: item.color,
                  shadowColor: item.color, // Glow tipis mengikuti warna dompet
                  shadowOpacity: currentTheme === 'light' ? 0.15 : 0.25,
                  shadowRadius: 6,
                  elevation: 6
                }
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                navigation.navigate('Mutasi', { accountId: item.id, accountName: item.name });
              }}
            >
              <View style={[styles.walletDot, { backgroundColor: item.color }]} />
              <Text style={styles.walletType}>{(item.type || 'cash').toUpperCase()}</Text>
              <Text style={styles.walletName} numberOfLines={1}>{item.name}</Text>
              <Text style={[styles.walletBalance, { color: isLight ? colors.textPrimary : item.color }]}>
                {formatRupiah(item.current_balance)}
              </Text>
              <View style={styles.walletProgressBG}>
                <View 
                  style={[
                    styles.walletProgressFill, 
                    { 
                      backgroundColor: item.color, 
                      width: `${Math.min(100, (item.current_balance / (totalHarta || 1)) * 100)}%` 
                    }
                  ]} 
                />
              </View>
            </TouchableOpacity>
          )}
          ListFooterComponent={
            <TouchableOpacity style={styles.addWalletCard} onPress={() => navigation.navigate('Pengaturan', { tab: 'wallet' })}>
              <Ionicons name="add-circle-outline" size={24} color={colors.textSecondary} />
              <Text style={styles.addWalletText}>Tambah</Text>
            </TouchableOpacity>
          }
        />

        {/* Recent Activity Header */}
        <View style={styles.activityHeader}>
          <Text style={[styles.sectionLabel, { marginLeft: 0, marginBottom: 0 }]}>Aktivitas Terbaru</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity 
              style={styles.filterToggle} 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setIsFilterExpanded(!isFilterExpanded);
              }}
            >
              <Text style={styles.filterToggleLabel}>
                {FILTER_OPTIONS.find(f => f.key === filter)?.label}
              </Text>
              <Ionicons name={isFilterExpanded ? "chevron-up" : "chevron-down"} size={14} color={colors.secondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Mutasi')}>
              <Text style={styles.seeAll}>Lihat Semua</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Filter Horizontal List (Shown only if expanded) */}
        {isFilterExpanded && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
            contentContainerStyle={styles.filterContent}
          >
            {FILTER_OPTIONS.map((f) => (
              <TouchableOpacity
                key={f.key}
                style={[styles.chip, filter === f.key && styles.chipActive]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setFilter(f.key);
                  setIsFilterExpanded(false);
                }}
              >
                <Text style={[styles.chipText, filter === f.key && styles.chipTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    );
  }, [userName, stats, totalHarta, accounts, filter, navigation, savingsRate, isFilterExpanded, colors, currentTheme, styles]);

  if (initialLoading) {
    return (
      <View style={[styles.loadingArea, { backgroundColor: colors.bgPrimary }]}>
        <ActivityIndicator size="large" color={colors.secondary} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bgPrimary }]}>
      <FlatList
        data={recentTX}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TransactionCard
            item={item}
            onPress={handleTxPress}
            onLongPress={handleTxLongPress}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={48} color={colors.bgElevated} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Belum ada transaksi</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />
        }
      />

      <BottomSheetModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        title="Hapus Transaksi?"
        iconName="trash-outline"
        primaryBtnText="Ya, Hapus"
        primaryBtnAction={confirmDelete}
        primaryBtnColor={colors.expense}
      >
        <View style={styles.modalBody}>
          <Text style={[styles.modalDesc, { color: colors.textSecondary }]}>Apakah Anda yakin ingin menghapus transaksi ini?</Text>
          {selectedTx && (
            <View style={[styles.modalTxPreview, { backgroundColor: colors.bgPrimary }]}>
              <Text style={[styles.modalTxCat, { color: colors.textPrimary }]}>{selectedTx.category_name}</Text>
              <Text style={[styles.modalTxAmt, { color: selectedTx.type === 'expense' ? colors.expense : colors.income }]}>
                {selectedTx.type === 'expense' ? '-' : '+'}{formatRupiah(selectedTx.amount)}
              </Text>
            </View>
          )}
        </View>
      </BottomSheetModal>
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgPrimary },
  loadingArea: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bgPrimary },
  header: { paddingBottom: 10 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    marginBottom: 20,
  },
  greeting: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, letterSpacing: 0.5 },
  userName: { fontSize: 22, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 },
  notifBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
  },
  heroCard: {
    marginHorizontal: 16,
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    overflow: 'hidden',
    position: 'relative',
    elevation: 12,
    shadowColor: colors.brand, // Glow oranye
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, // Shadow lebih kuat
    shadowRadius: 16,
    borderTopWidth: 3, // Garis aksen oranye di atas
    borderTopColor: colors.brand,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroDecoration1: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  heroDecoration2: {
    position: 'absolute',
    bottom: -40,
    left: -10,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  heroLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, color: 'rgba(255,255,255,0.7)' },
  heroBalance: { fontSize: 32, fontWeight: '900', marginBottom: 20, color: '#ffffff' },
  heroDivider: { height: 1, width: '100%', marginBottom: 20, backgroundColor: 'rgba(255,255,255,0.1)' },
  heroStats: { flexDirection: 'row', alignItems: 'center' },
  heroStatItem: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  heroStatIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 10, backgroundColor: 'rgba(255,255,255,0.1)' },
  heroStatLabel: { fontSize: 10, fontWeight: '700', marginBottom: 2, color: 'rgba(255,255,255,0.6)' },
  heroStatVal: { fontSize: 14, fontWeight: '800', color: '#ffffff' },
  heroStatDivider: { width: 1, height: 30, marginHorizontal: 15, backgroundColor: 'rgba(255,255,255,0.1)' },
  savingsBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  savingsText: { fontSize: 10, fontWeight: '800' },
  
  sectionLabel: { fontSize: 17, fontWeight: '800', marginLeft: 20, marginBottom: 16, color: colors.textPrimary, letterSpacing: 0.3 },
  walletScroll: { paddingLeft: 16, paddingRight: 8, marginBottom: 24 },
  walletCard: {
    width: 155,
    borderRadius: 22,
    padding: 16,
    marginRight: 14,
    borderWidth: 1,
    borderLeftWidth: 3,
    backgroundColor: colors.bgCard,
    borderColor: colors.border,
    // Titanium Depth
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  walletDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 10 },
  walletType: { fontSize: 9, fontWeight: '800', marginBottom: 4, color: colors.textMuted },
  walletName: { fontSize: 14, fontWeight: '700', marginBottom: 12, color: colors.textPrimary },
  walletBalance: { fontSize: 15, fontWeight: '800', marginBottom: 12 },
  walletProgressBG: { height: 4, width: '100%', borderRadius: 2, overflow: 'hidden', backgroundColor: colors.bgElevated },
  walletProgressFill: { height: '100%', borderRadius: 2 },
  addWalletCard: {
    width: 100,
    borderRadius: 20,
    marginRight: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.bgCard,
    borderColor: colors.border,
  },
  addWalletText: { fontSize: 12, fontWeight: '700', marginTop: 8, color: colors.textSecondary },
  
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    backgroundColor: colors.bgCard,
    borderColor: colors.border,
  },
  filterToggleLabel: { fontSize: 12, fontWeight: '700', color: colors.secondary },
  seeAll: { fontSize: 12, fontWeight: '700', color: colors.secondary },
  filterScroll: { marginBottom: 16 },
  filterContent: { paddingHorizontal: 16, gap: 10 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: colors.bgCard,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.secondary, borderColor: colors.secondary },
  chipText: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  chipTextActive: { color: '#fff' },
  
  listContent: { paddingBottom: 100 },
  emptyState: { padding: 40, alignItems: 'center' },
  emptyText: { marginTop: 12, fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  modalBody: { paddingVertical: 10 },
  modalDesc: { fontSize: 14, textAlign: 'center', marginBottom: 20, lineHeight: 20, color: colors.textSecondary },
  modalTxPreview: { padding: 16, borderRadius: 16, alignItems: 'center', backgroundColor: colors.bgPrimary },
  modalTxCat: { fontSize: 16, fontWeight: '700', marginBottom: 4, color: colors.textPrimary },
  modalTxAmt: { fontSize: 20, fontWeight: '800' },
});