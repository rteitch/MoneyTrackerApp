import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { File, Paths } from "expo-file-system/next";
import * as Sharing from "expo-sharing";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useRef, useState, useMemo, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  RefreshControl,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import BottomSheetModal from "../components/BottomSheetModal";
import TransactionCard from "../components/TransactionCard";
import { useAppContext } from '../context/AppContext';
import {
  deleteTransaction,
  getAllTransactions,
  getDateFilterBoundary,
  getAccounts,
} from "../db/database";
import {
  formatRupiah,
  formatRupiahFull,
  formatDate,
} from "../utils/formatting";

const TYPE_FILTERS = [
  { key: "all", label: "Semua", icon: "list" },
  { key: "expense", label: "Keluar", icon: "arrow-down-circle" },
  { key: "income", label: "Masuk", icon: "arrow-up-circle" },
  { key: "transfer", label: "Transfer", icon: "swap-horizontal" },
];

const PERIOD_FILTERS = [
  { key: "month", label: "Bulan Ini" },
  { key: "week", label: "Minggu Ini" },
  { key: "today", label: "Hari Ini" },
  { key: "year", label: "Tahun Ini" },
  { key: "all", label: "Semua" },
];

export default function MutasiScreen({ navigation, route }) {
  const { colors } = useAppContext();
  const styles = makeStyles(colors);
  const db = useSQLiteContext();
  
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("month");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  
  const pageRef = useRef(0);
  const hasMoreRef = useRef(true);
  const loadingMoreRef = useRef(false);
  const LIMIT = 20;
  
  // UI State
  const [isPeriodExpanded, setIsPeriodExpanded] = useState(false);
  const [isAccountExpanded, setIsAccountExpanded] = useState(false);
  const [accountFilter, setAccountFilter] = useState(route?.params?.accountId || null);
  const [accountName, setAccountName] = useState(route?.params?.accountName || "");
  
  // Modal State
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [txToDelete, setTxToDelete] = useState(null);

  const loadData = useCallback(async (reset = true) => {
    try {
      if (reset) {
        setLoading(true);
        pageRef.current = 0;
        hasMoreRef.current = true;
      } else {
        if (!hasMoreRef.current || loadingMoreRef.current) return;
        setLoadingMore(true);
        loadingMoreRef.current = true;
      }
      setLoadError(false);
      
      const currentOffset = pageRef.current * LIMIT;
      const bounds = getDateFilterBoundary(periodFilter);
      
      const [txs, accs] = await Promise.all([
        getAllTransactions(db, searchQuery, typeFilter, bounds, accountFilter, LIMIT, currentOffset),
        reset ? getAccounts(db) : Promise.resolve([]),
      ]);
      
      if (reset) {
        setTransactions(txs);
      } else {
        setTransactions(prev => {
          const existingIds = new Set(prev.map(t => t.id));
          const newTxs = txs.filter(t => !existingIds.has(t.id));
          return [...prev, ...newTxs];
        });
      }
      
      hasMoreRef.current = txs.length === LIMIT;
      if (txs.length > 0) pageRef.current += 1;
      
      if (reset && accs.length > 0) setAccounts(accs);
    } catch (e) {
      console.error("MutasiScreen loadData error:", e);
      setLoadError(true);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      loadingMoreRef.current = false;
      setRefreshing(false);
    }
  }, [db, searchQuery, typeFilter, periodFilter, accountFilter]);

  useFocusEffect(
    useCallback(() => {
      loadData(true);
    }, [loadData])
  );

  // Sync route params when navigation occurs
  useEffect(() => {
    if (route?.params?.accountId) {
      setAccountFilter(route.params.accountId);
      setAccountName(route.params.accountName || "Dompet");
      setPeriodFilter("all"); // Default to 'all' saat buka dari dashboard agar data muncul
      // Clear params after consuming so it doesn't re-trigger
      navigation.setParams({ accountId: undefined, accountName: undefined });
    }
  }, [route?.params?.accountId, route?.params?.accountName, navigation]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  const resetAllFilters = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSearchQuery("");
    setTypeFilter("all");
    setPeriodFilter("month");
    setAccountFilter(null);
    setAccountName("");
    setIsAccountExpanded(false);
    setIsPeriodExpanded(false);
  };

  const isFiltered = searchQuery !== "" || typeFilter !== "all" || periodFilter !== "month" || accountFilter !== null;

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const handleExportCSV = async () => {
    if (transactions.length === 0) {
      Alert.alert(
        "Tidak Ada Data",
        "Tidak ada transaksi untuk diekspor pada filter yang dipilih.",
        [{ text: "OK" }],
      );
      return;
    }

    try {
      await new Promise((r) => setTimeout(r, 50));

      const periodLabel =
        PERIOD_FILTERS.find((p) => p.key === periodFilter)?.label || "Semua";

      const fmtRp = (val) => {
        if (!val || val === 0) return "Rp 0";
        return "Rp " + Number(val).toLocaleString("id-ID");
      };

      const fmtTgl = (isoStr) => {
        if (!isoStr) return "-";
        const d = new Date(isoStr);
        if (isNaN(d)) return isoStr;
        const dd = String(d.getDate()).padStart(2, "0");
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const yyyy = d.getFullYear();
        const hh = String(d.getHours()).padStart(2, "0");
        const min = String(d.getMinutes()).padStart(2, "0");
        return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
      };

      const cell = (val) => {
        if (val === null || val === undefined) return '"-"';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      };

      const SEPARATOR = ";";

      const headerRow = [
        "Tanggal",
        "Tipe",
        "Nominal",
        "Kategori",
        "Sub-Kategori",
        "Dari Dompet",
        "Ke Dompet",
        "Keterangan",
      ]
        .map(cell)
        .join(SEPARATOR);

      const typeLabels = {
        expense: "Keluar",
        income: "Masuk",
        transfer: "Transfer"
      };

      const dataRows = transactions.map((t) => {
        return [
          fmtTgl(t.date),
          typeLabels[t.type] || t.type,
          fmtRp(t.amount),
          t.category_name || "Transfer",
          t.subcategory_name || "-",
          t.account_name || "-",
          t.to_account_name || "-",
          t.description || "-",
        ]
          .map(cell)
          .join(SEPARATOR);
      });

      const BOM = "\uFEFF";
      const csvContent = BOM + [headerRow, ...dataRows].join("\r\n");

      const now = new Date();
      const typeLabel = TYPE_FILTERS.find(f => f.key === typeFilter)?.label || "Semua";
      const currentAccName = accountFilter ? (accounts.find(a => a.id === accountFilter)?.name || "Dompet") : "Semua_Dompet";
      const safePeriod = periodLabel.replace(/\s+/g, "_");
      const safeType = typeLabel.replace(/\s+/g, "_");
      const safeAcc = currentAccName.replace(/\s+/g, "_");
      
      const dateStamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
      const fileName = `mutasi_${safeType}_${safeAcc}_${safePeriod}_${dateStamp}.csv`;

      const fileRef = new File(Paths.cache, fileName);
      fileRef.write(csvContent);
      const fileUri = fileRef.uri;

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "text/csv",
          dialogTitle: "Simpan / Bagikan Laporan Mutasi",
          UTI: "public.comma-separated-values-text",
        });
      } else {
        Alert.alert("Export Berhasil", `File tersimpan di:\n${fileUri}`, [
          { text: "OK" },
        ]);
      }
    } catch (_e) {
      console.error("Export error:", _e);
      Alert.alert(
        "Gagal Export",
        `Terjadi kesalahan saat membuat laporan.\n\n${_e?.message || "Silakan coba lagi."}`,
        [{ text: "OK" }],
      );
    } finally {
      // do nothing
    }
  };
  const handleDeletePress = (item) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setTxToDelete(item);
    setDeleteModalVisible(true);
  };

  const executeDelete = async () => {
    if (!txToDelete) return;
    try {
      await deleteTransaction(db, txToDelete.id);
      setDeleteModalVisible(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      loadData();
    } catch (e) {
      Alert.alert("Gagal", "Transaksi tidak dapat dihapus.");
    }
  };

  const renderHeader = useMemo(() => (
    <View style={{ backgroundColor: colors.bgPrimary }}>
      {/* Search Row */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari transaksi..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== "" && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.exportBtn} onPress={handleExportCSV}>
          <Ionicons name="download-outline" size={20} color={colors.brand} />
        </TouchableOpacity>
      </View>

      {/* Type Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
        {TYPE_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.typeChip, typeFilter === f.key && styles.typeChipActive]}
            onPress={() => {
              Haptics.selectionAsync();
              setTypeFilter(f.key);
            }}
          >
            <Ionicons name={f.icon} size={14} color={typeFilter === f.key ? colors.brand : colors.textMuted} style={{ marginRight: 6 }} />
            <Text style={[styles.typeChipText, typeFilter === f.key && styles.typeChipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Account & Period Filters */}
      <View style={styles.combinedFilterRow}>
        <View style={styles.filterWrapper}>
          <Text style={styles.filterSmallLabel}>Dompet</Text>
          <TouchableOpacity 
            style={[styles.filterToggle, accountFilter && styles.filterToggleActive]} 
            onPress={() => {
              setIsAccountExpanded(!isAccountExpanded);
              setIsPeriodExpanded(false);
            }}
          >
            <Text style={[styles.filterToggleLabel, accountFilter && styles.filterToggleLabelActive]} numberOfLines={1}>
              {accountFilter ? (accounts.find(a => a.id === accountFilter)?.name || "Dompet") : "Semua"}
            </Text>
            <Ionicons name={isAccountExpanded ? "chevron-up" : "chevron-down"} size={12} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={styles.filterWrapper}>
          <Text style={styles.filterSmallLabel}>Periode</Text>
          <TouchableOpacity 
            style={[styles.filterToggle, periodFilter !== 'all' && styles.filterToggleActive]} 
            onPress={() => {
              setIsPeriodExpanded(!isPeriodExpanded);
              setIsAccountExpanded(false);
            }}
          >
            <Text style={[styles.filterToggleLabel, periodFilter !== 'all' && styles.filterToggleLabelActive]}>
              {PERIOD_FILTERS.find(f => f.key === periodFilter)?.label}
            </Text>
            <Ionicons name={isPeriodExpanded ? "chevron-up" : "chevron-down"} size={12} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {isFiltered && (
          <TouchableOpacity style={styles.resetBtn} onPress={resetAllFilters}>
            <Ionicons name="reload-outline" size={16} color={colors.expense} />
          </TouchableOpacity>
        )}
      </View>

      {/* Expansion Lists */}
      {isAccountExpanded && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.expansionScroll} contentContainerStyle={styles.expansionContent}>
          <TouchableOpacity 
            style={[styles.periodChip, !accountFilter && styles.periodChipActive]}
            onPress={() => { setAccountFilter(null); setIsAccountExpanded(false); }}
          >
            <Text style={[styles.periodChipText, !accountFilter && styles.periodChipTextActive]}>Semua</Text>
          </TouchableOpacity>
          {accounts.map(acc => (
            <TouchableOpacity 
              key={acc.id} 
              style={[styles.periodChip, accountFilter === acc.id && { backgroundColor: acc.color, borderColor: acc.color }]}
              onPress={() => { setAccountFilter(acc.id); setIsAccountExpanded(false); }}
            >
              <Text style={[styles.periodChipText, accountFilter === acc.id && styles.periodChipTextActive]}>{acc.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {isPeriodExpanded && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.expansionScroll} contentContainerStyle={styles.expansionContent}>
          {PERIOD_FILTERS.map(f => (
            <TouchableOpacity 
              key={f.key} 
              style={[styles.periodChip, periodFilter === f.key && styles.periodChipActive]}
              onPress={() => { setPeriodFilter(f.key); setIsPeriodExpanded(false); }}
            >
              <Text style={[styles.periodChipText, periodFilter === f.key && styles.periodChipTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Summary Bar */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Pemasukan</Text>
            <Text style={[styles.summaryValue, { color: colors.income }]}>+ {formatRupiah(totalIncome)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Pengeluaran</Text>
            <Text style={[styles.summaryValue, { color: colors.expense }]}>− {formatRupiah(totalExpense)}</Text>
          </View>
        </View>
      </View>
      <Text style={styles.listHint}>💡 Ketuk transaksi untuk edit, tahan untuk hapus</Text>
    </View>
  ), [colors, styles, accounts, searchQuery, typeFilter, periodFilter, accountFilter, isAccountExpanded, isPeriodExpanded, totalIncome, totalExpense, handleExportCSV, isFiltered]);

  const groupedTransactions = useMemo(() => {
    const groups = {};
    transactions.forEach(tx => {
      const date = tx.date;
      if (!groups[date]) groups[date] = [];
      groups[date].push(tx);
    });
    return Object.keys(groups).sort((a, b) => b.localeCompare(a)).map(date => ({
      date,
      data: groups[date],
      totalIncome: groups[date].filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
      totalExpense: groups[date].filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    }));
  }, [transactions]);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bgPrimary }]}>
      <StatusBar barStyle={colors.bgPrimary === '#ffffff' ? 'dark-content' : 'light-content'} />
      
      <FlatList
        data={groupedTransactions}
        keyExtractor={(item) => item.date}
        ListHeaderComponent={renderHeader}
        onEndReached={() => loadData(false)}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? (
            <View style={{ padding: 20 }}>
              <ActivityIndicator size="small" color={colors.brand} />
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View key={item.date}>
            <View style={styles.dateHeader}>
              <Text style={styles.dateHeaderText}>{formatDate(item.date)}</Text>
              <View style={styles.dateSummary}>
                {item.totalIncome > 0 && <Text style={styles.dateIncome}>+{formatRupiah(item.totalIncome)}</Text>}
                {item.totalExpense > 0 && <Text style={styles.dateExpense}>−{formatRupiah(item.totalExpense)}</Text>}
              </View>
            </View>
            {item.data.map(tx => (
              <TransactionCard
                key={tx.id}
                item={tx}
                onPress={(t) => navigation.navigate("Tambah Transaksi", { editTx: t, source: 'Mutasi' })}
                onLongPress={handleDeletePress}
              />            ))}
          </View>
        )}
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={56} color={colors.bgElevated} />
              <Text style={styles.emptyTitle}>Tidak ada transaksi</Text>
            </View>
          )
        }
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
      />

      {loading && !refreshing && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      )}

      <BottomSheetModal
        visible={deleteModalVisible}
        onClose={() => setDeleteModalVisible(false)}
        title="Hapus Transaksi?"
        iconName="trash-outline"
        primaryBtnText="Hapus"
        primaryBtnAction={executeDelete}
        primaryBtnColor={colors.expense}
      >
        <View style={styles.modalBody}>
          <Text style={[styles.modalDesc, { color: colors.textSecondary }]}>Hapus transaksi ini secara permanen?</Text>
          {txToDelete && (
            <View style={[styles.modalPreview, { backgroundColor: colors.bgPrimary }]}>
              <Text style={[styles.modalCat, { color: colors.textPrimary }]}>{txToDelete.category_name || 'Transfer'}</Text>
              <Text style={[styles.modalAmt, { color: txToDelete.type === 'expense' ? colors.expense : colors.income }]}>
                {txToDelete.type === 'expense' ? '-' : '+'}{formatRupiahFull(txToDelete.amount)}
              </Text>
            </View>
          )}
        </View>
      </BottomSheetModal>
    </SafeAreaView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgPrimary },
  searchRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  searchBox: { 
    flex: 1, flexDirection: 'row', alignItems: 'center', 
    paddingHorizontal: 12, height: 44, borderRadius: 12, 
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgCard 
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: colors.textPrimary },
  exportBtn: { 
    width: 44, height: 44, borderRadius: 12, borderWidth: 1, 
    justifyContent: 'center', alignItems: 'center',
    borderColor: colors.border, backgroundColor: colors.bgCard
  },
  filterScroll: { marginBottom: 12 },
  filterContent: { paddingHorizontal: 16, gap: 10 },
  typeChip: { 
    flexDirection: 'row', alignItems: 'center', 
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, 
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgCard 
  },
  typeChipActive: { backgroundColor: colors.brandBg, borderColor: colors.brand },
  typeChipText: { fontSize: 12, color: colors.textMuted },
  typeChipTextActive: { color: colors.brand, fontWeight: "700" },

  combinedFilterRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 16, alignItems: 'flex-end' },
  filterWrapper: { flex: 1 },
  filterSmallLabel: { fontSize: 10, fontWeight: '700', marginBottom: 4, marginLeft: 4, color: colors.textMuted },
  filterToggle: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
    paddingHorizontal: 12, height: 40, borderRadius: 10, 
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgCard 
  },
  filterToggleActive: { backgroundColor: colors.brandBg, borderColor: colors.brand },
  filterToggleLabel: { fontSize: 12, flex: 1, color: colors.textMuted },
  filterToggleLabelActive: { color: colors.textPrimary, fontWeight: '700' },

  resetBtn: { 
    width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center',
    backgroundColor: colors.expense + '20'
  },
  expansionScroll: { marginBottom: 16 },
  expansionContent: { paddingHorizontal: 16, gap: 8 },
  periodChip: { 
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12, 
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgCard 
  },
  periodChipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  periodChipText: { color: colors.textMuted },
  periodChipTextActive: { color: '#fff' },

  summaryBar: { 
    marginHorizontal: 16, borderRadius: 16, padding: 16, marginBottom: 16, 
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgCard 
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 10, fontWeight: '700', marginBottom: 4, color: colors.textMuted },
  summaryValue: { fontSize: 14, fontWeight: '800' },
  summaryDivider: { width: 1, height: 24, marginHorizontal: 10, backgroundColor: colors.border },

  listHint: { fontSize: 11, fontStyle: 'italic', textAlign: 'center', marginBottom: 12, color: colors.textMuted },

  dateHeader: {    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, marginTop: 8,
    backgroundColor: colors.bgPrimary
  },
  dateHeaderText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  dateSummary: { flexDirection: 'row', gap: 10 },
  dateIncome: { fontSize: 11, fontWeight: '700', color: colors.income },
  dateExpense: { fontSize: 11, fontWeight: '700', color: colors.expense },
  
  listContent: { paddingBottom: 100 },
  emptyState: { alignItems: 'center', padding: 60 },
  emptyTitle: { marginTop: 16, fontSize: 15, fontWeight: '600', color: colors.textSecondary },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.1)', justifyContent: 'center', alignItems: 'center' },
  modalBody: { padding: 16 },
  modalDesc: { fontSize: 14, textAlign: 'center', marginBottom: 16, color: colors.textSecondary },
  modalPreview: { padding: 16, borderRadius: 12, alignItems: 'center', backgroundColor: colors.bgPrimary },
  modalCat: { fontSize: 16, fontWeight: '700', marginBottom: 4, color: colors.textPrimary },
  modalAmt: { fontSize: 20, fontWeight: '800' },
});
