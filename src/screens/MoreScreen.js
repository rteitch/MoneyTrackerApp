import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAppContext } from '../context/AppContext';
import { getDebtSummary, getBudgetWithSpending } from '../db/database';
import { formatRupiah } from '../utils/formatting';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 12;
const CARD_PADDING = 16;
const CARD_WIDTH = (SCREEN_WIDTH - CARD_PADDING * 2 - CARD_GAP) / 2;

export default function MoreScreen({ navigation }) {
  const db = useSQLiteContext();
  const { colors, currentTheme } = useAppContext();
  const styles = makeStyles(colors);

  const [debtSummary, setDebtSummary] = useState({ totalReceivable: 0, totalPayable: 0, net: 0 });
  const [budgetSummary, setBudgetSummary] = useState({ total: 0, spent: 0, count: 0 });
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const now = new Date();
      const [ds, budgets] = await Promise.all([
        getDebtSummary(db),
        getBudgetWithSpending(db, now.getMonth() + 1, now.getFullYear()),
      ]);
      setDebtSummary(ds);
      const totalBudget = budgets.reduce((s, b) => s + b.monthly_limit, 0);
      const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
      setBudgetSummary({ total: totalBudget, spent: totalSpent, count: budgets.length });
    } catch (e) {
      console.error('MoreScreen loadData error:', e);
    } finally {
      setRefreshing(false);
    }
  }, [db]);

  useFocusEffect(useCallback(() => {
    loadData();
  }, [loadData]));

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const navigateTo = (screen, params) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate(screen, params);
  };

  const FEATURE_MENU = [
    {
      key: 'planner',
      label: 'Financial Planner',
      subtitle: 'Skor, diagnosa & rekomendasi keuangan',
      icon: 'analytics',
      color: '#0ea5e9',
      highlight: true,
      onPress: () => navigateTo('Planner'),
    },
    {
      key: 'goals',
      label: 'Target Finansial',
      subtitle: 'Atur & pantau tujuan keuangan',
      icon: 'flag',
      color: '#8b5cf6',
      onPress: () => navigateTo('Goals'),
    },
    {
      key: 'simulator',
      label: 'Simulator Keuangan',
      subtitle: 'Simulasi investasi, hemat & cicilan',
      icon: 'calculator',
      color: '#10B981',
      onPress: () => navigateTo('Simulator'),
    },
    {
      key: 'review',
      label: 'Evaluasi & Achievement',
      subtitle: 'Laporan bulanan & lencana prestasi',
      icon: 'trophy',
      color: '#f59e0b',
      onPress: () => navigateTo('MonthlyReview'),
    },
    {
      key: 'debt',
      label: 'Hutang & Piutang',
      subtitle: debtSummary.totalReceivable > 0 || debtSummary.totalPayable > 0
        ? `Piutang ${formatRupiah(debtSummary.totalReceivable)}`
        : 'Kelola hutang piutang',
      icon: 'swap-vertical',
      color: '#0ea5e9',
      onPress: () => navigateTo('Hutang'),
    },
    {
      key: 'budget',
      label: 'Anggaran',
      subtitle: budgetSummary.count > 0
        ? `${budgetSummary.count} kategori aktif`
        : 'Atur limit pengeluaran',
      icon: 'pie-chart',
      color: '#f59e0b',
      onPress: () => navigateTo('Anggaran'),
    },
  ];

  const SETTINGS_MENU = [
    {
      key: 'wallet',
      label: 'Dompet',
      subtitle: 'Kelola dompet & rekening',
      icon: 'wallet',
      color: colors.brand,
      onPress: () => navigateTo('Pengaturan', { initialTab: 'wallet' }),
    },
    {
      key: 'category',
      label: 'Kategori',
      subtitle: 'Atur kategori transaksi',
      icon: 'pricetag',
      color: '#10B981',
      onPress: () => navigateTo('Pengaturan', { initialTab: 'category' }),
    },
    {
      key: 'recurring',
      label: 'Transaksi Berulang',
      subtitle: 'Gaji, langganan, cicilan',
      icon: 'repeat',
      color: '#8b5cf6',
      onPress: () => navigateTo('Pengaturan', { initialTab: 'recurring' }),
    },
    {
      key: 'appearance',
      label: 'Tampilan',
      subtitle: 'Tema & mode gelap',
      icon: 'color-palette',
      color: '#ec4899',
      onPress: () => navigateTo('Pengaturan', { initialTab: 'appearance' }),
    },
    {
      key: 'profile',
      label: 'Profil',
      subtitle: 'Nama & pengaturan akun',
      icon: 'person',
      color: '#14b8a6',
      onPress: () => navigateTo('Pengaturan', { initialTab: 'profile' }),
    },
    {
      key: 'reset',
      label: 'Reset Data',
      subtitle: 'Hapus semua riwayat',
      icon: 'warning',
      color: colors.expense,
      onPress: () => navigateTo('Pengaturan', { initialTab: 'profile' }),
    },
  ];

  const renderMenuCard = (item, isLarge = false) => (
    <TouchableOpacity
      key={item.key}
      style={[
        styles.menuCard,
        isLarge && styles.menuCardLarge,
      ]}
      onPress={item.onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.menuIconBox, { backgroundColor: item.color + '18' }]}>
        <Ionicons name={item.icon} size={22} color={item.color} />
      </View>
      <Text style={styles.menuLabel} numberOfLines={1}>{item.label}</Text>
      <Text style={styles.menuSubtitle} numberOfLines={1}>{item.subtitle}</Text>
      <View style={[styles.menuArrow, { backgroundColor: item.color + '12' }]}>
        <Ionicons name="chevron-forward" size={14} color={item.color} />
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.bgPrimary }]}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />
      }
    >
      {/* Header */}
      <Text style={styles.pageTitle}>Lainnya</Text>

      {/* Quick Stats */}
      <View style={styles.quickStats}>
        <TouchableOpacity
          style={[styles.statCard, { borderColor: colors.border, backgroundColor: colors.bgCard }]}
          onPress={() => navigateTo('Hutang')}
          activeOpacity={0.7}
        >
          <View style={[styles.statIcon, { backgroundColor: colors.incomeBg }]}>
            <Ionicons name="arrow-down-circle" size={18} color={colors.income} />
          </View>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Piutang</Text>
          <Text style={[styles.statValue, { color: colors.income }]}>
            {formatRupiah(debtSummary.totalReceivable)}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statCard, { borderColor: colors.border, backgroundColor: colors.bgCard }]}
          onPress={() => navigateTo('Hutang')}
          activeOpacity={0.7}
        >
          <View style={[styles.statIcon, { backgroundColor: colors.expenseBg }]}>
            <Ionicons name="arrow-up-circle" size={18} color={colors.expense} />
          </View>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Hutang</Text>
          <Text style={[styles.statValue, { color: colors.expense }]}>
            {formatRupiah(debtSummary.totalPayable)}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statCard, { borderColor: colors.border, backgroundColor: colors.bgCard }]}
          onPress={() => navigateTo('Anggaran')}
          activeOpacity={0.7}
        >
          <View style={[styles.statIcon, { backgroundColor: colors.warningBg }]}>
            <Ionicons name="pie-chart" size={18} color={colors.warning} />
          </View>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Budget</Text>
          <Text style={[styles.statValue, { color: colors.warning }]}>
            {budgetSummary.count > 0 ? `${budgetSummary.count} aktif` : '—'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Feature Menu */}
      <Text style={styles.sectionTitle}>Fitur</Text>
      <View style={styles.menuGrid}>
        {FEATURE_MENU.map(item => renderMenuCard(item, true))}
      </View>

      {/* Settings Menu */}
      <Text style={styles.sectionTitle}>Pengaturan</Text>
      <View style={styles.menuGrid}>
        {SETTINGS_MENU.map(item => renderMenuCard(item))}
      </View>

      {/* App Info */}
      <View style={[styles.appInfo, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        <View style={[styles.appIconBox, { backgroundColor: colors.brandBg }]}>
          <Ionicons name="wallet" size={20} color={colors.brand} />
        </View>
        <Text style={[styles.appName, { color: colors.textPrimary }]}>MoneyTracker</Text>
        <Text style={[styles.appVersion, { color: colors.textMuted }]}>Versi 1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  root: { flex: 1 },
  pageTitle: {
    fontSize: 24, fontWeight: '800', marginLeft: 20, marginTop: 16, marginBottom: 20,
    color: colors.textPrimary, letterSpacing: -0.5,
  },

  // Quick Stats
  quickStats: {
    flexDirection: 'row', paddingHorizontal: CARD_PADDING, gap: CARD_GAP, marginBottom: 28,
  },
  statCard: {
    flex: 1, borderRadius: 16, padding: 14, borderWidth: 1, alignItems: 'center',
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 3,
  },
  statIcon: {
    width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: { fontSize: 10, fontWeight: '700', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.3 },
  statValue: { fontSize: 12, fontWeight: '800' },

  // Section
  sectionTitle: {
    fontSize: 16, fontWeight: '800', marginLeft: 20, marginBottom: 14,
    color: colors.textPrimary, letterSpacing: 0.2,
  },

  // Menu Grid
  menuGrid: {
    flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: CARD_PADDING,
    gap: CARD_GAP, marginBottom: 24,
  },
  menuCard: {
    width: CARD_WIDTH, borderRadius: 18, padding: 16, borderWidth: 1,
    borderColor: colors.border, backgroundColor: colors.bgCard,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 3, position: 'relative',
  },
  menuCardLarge: {
    // Same width, just for semantic differentiation
  },
  menuIconBox: {
    width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
  },
  menuLabel: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  menuSubtitle: { fontSize: 11, color: colors.textMuted, lineHeight: 15 },
  menuArrow: {
    position: 'absolute', top: 14, right: 14, width: 26, height: 26,
    borderRadius: 8, justifyContent: 'center', alignItems: 'center',
  },

  // App Info
  appInfo: {
    marginHorizontal: 16, borderRadius: 18, padding: 24, borderWidth: 1,
    alignItems: 'center', marginBottom: 30,
  },
  appIconBox: {
    width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center',
    marginBottom: 10,
  },
  appName: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  appVersion: { fontSize: 12, fontWeight: '600' },
});
