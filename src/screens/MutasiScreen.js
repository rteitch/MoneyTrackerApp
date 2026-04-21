import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList,
  TextInput, Alert, Platform, Vibration, ActivityIndicator
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { formatRupiah, formatRupiahFull, formatDate, formatDateCSV, escapeCSV } from '../utils/formatting';
import {
  getAllTransactions, deleteTransaction, getDateFilterBoundary
} from '../db/database';
import TransactionCard from '../components/TransactionCard';
import BottomSheetModal from '../components/BottomSheetModal';

const TYPE_FILTERS = [
  { key: 'all', label: 'Semua', icon: 'list' },
  { key: 'expense', label: 'Keluar', icon: 'arrow-down-circle', color: '#ff4d6d' },
  { key: 'income', label: 'Masuk', icon: 'arrow-up-circle', color: '#00c896' },
  { key: 'transfer', label: 'Transfer', icon: 'swap-horizontal', color: '#7c6aff' },
];

const PERIOD_FILTERS = [
  { key: 'month', label: 'Bulan Ini' },
  { key: 'week', label: 'Minggu Ini' },
  { key: 'today', label: 'Hari Ini' },
  { key: 'year', label: 'Tahun Ini' },
  { key: 'last_year', label: 'Tahun Lalu' },
  { key: 'all', label: 'Semua Waktu' },
];

const TYPE_CONFIG = {
  expense: { label: 'Keluar' },
  income: { label: 'Masuk' },
  transfer: { label: 'Transfer' }
};


export default function MutasiScreen({ navigation }) {
  const db = useSQLiteContext();
  const [transactions, setTransactions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('month');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [txToDelete, setTxToDelete] = useState(null);

  const searchTimeout = useRef(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(false);
      const bounds = getDateFilterBoundary(periodFilter);
      const [txs] = await Promise.all([
        getAllTransactions(db, searchQuery, typeFilter, bounds),
      ]);
      setTransactions(txs);
    } catch (e) {
      console.error('MutasiScreen loadData error:', e);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [db, searchQuery, typeFilter, periodFilter]);

  useFocusEffect(useCallback(() => {
    loadData();
  }, [loadData]));

  const handleSearchChange = (text) => {
    setSearchQuery(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      // loadData akan dipanggil via useFocusEffect/useCallback dependency
    }, 300);
  };

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const handleEdit = (item) => {
    navigation.navigate('Tambah Transaksi', { editTx: item });
  };

  const handleDeletePress = (item) => {
    Vibration.vibrate(40);
    setTxToDelete(item);
    setDeleteModalVisible(true);
  };

  const executeDelete = async () => {
    if (!txToDelete) return;
    try {
      await deleteTransaction(db, txToDelete.id);
      setDeleteModalVisible(false);
      setTxToDelete(null);
      loadData();
    } catch (e) {
      console.error('executeDelete error:', e);
      setDeleteModalVisible(false);
      setTxToDelete(null);
      Alert.alert(
        'Gagal Menghapus',
        'Transaksi tidak dapat dihapus. Silakan coba lagi.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleExportCSV = async () => {
    if (transactions.length === 0) {
      Alert.alert(
        'Tidak Ada Data',
        'Tidak ada transaksi untuk diekspor pada periode yang dipilih.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      setExporting(true);
      // Yield thread so UI can render ActivityIndicator before heavy mapping tasks.
      await new Promise(r => setTimeout(r, 50));

      const periodLabel = PERIOD_FILTERS.find(p => p.key === periodFilter)?.label || 'Semua';
      const header = 'Tanggal,Tipe,Nominal,Fee,Kategori,Sub-Kategori,Dari Dompet,Ke Dompet,Keterangan\n';
      const rows = transactions.map(t => {
        const tgl = formatDateCSV(t.date);
        const tipe = TYPE_CONFIG[t.type]?.label || t.type;
        const nominal = t.amount || 0;
        const fee = t.fee || 0;
        const kat = escapeCSV(t.category_name || 'Transfer');
        const subkat = escapeCSV(t.subcategory_name || '-');
        const dariDompet = escapeCSV(t.account_name || '-');
        const keDompet = escapeCSV(t.to_account_name || '-');
        const catatan = escapeCSV(t.description || '-');
        return `${tgl},${tipe},${nominal},${fee},${kat},${subkat},${dariDompet},${keDompet},${catatan}`;
      }).join('\n');

      // UTF-8 BOM agar Excel membaca karakter Indonesia dengan benar
      const BOM = '﻿';
      const csvContent = BOM + header + rows;
      const now = new Date();
      // Gunakan hanya karakter aman untuk nama file
      const safePeriod = periodLabel.replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `mutasi_${safePeriod}_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}.csv`;
      // Fallback ke documentDirectory jika cacheDirectory null
      const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
      if (!baseDir) throw new Error('Direktori penyimpanan tidak tersedia.');
      const fileUri = baseDir + fileName;

      try {
        await FileSystem.writeAsStringAsync(fileUri, csvContent, {
          encoding: FileSystem.EncodingType.UTF8,
        });
      } catch (writeErr) {
        console.error('CSV write error:', writeErr);
        Alert.alert(
          'Gagal Menyimpan File',
          'Tidak dapat menulis file ke penyimpanan. Pastikan memori perangkat mencukupi.',
          [{ text: 'OK' }]
        );
        return;
      }

      try {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'text/csv',
            dialogTitle: 'Bagikan Laporan Mutasi',
            UTI: 'public.comma-separated-values-text',
          });
        } else {
          Alert.alert(
            'File Tersimpan',
            `Laporan berhasil disimpan di:\n${fileUri}`,
            [{ text: 'OK' }]
          );
        }
      } catch (shareErr) {
        console.error('Share error:', shareErr);
        // File sudah tersimpan, hanya sharing yang gagal — informasikan lokasi file
        Alert.alert(
          'File Tersimpan',
          `Laporan berhasil dibuat namun tidak dapat dibagikan langsung.\nFile tersimpan di:\n${fileUri}`,
          [{ text: 'OK' }]
        );
      }
    } catch (e) {
      console.error('handleExportCSV error:', e);
      Alert.alert(
        'Gagal Export',
        `Terjadi kesalahan tidak terduga saat membuat laporan.\n${e?.message || ''}\nSilakan coba lagi.`,
        [{ text: 'OK' }]
      );
    } finally {
      setExporting(false);
    }
  };

  // Group transactions by date
  const groupedData = [];
  let currentDate = null;
  transactions.forEach(tx => {
    const dateLabel = formatDate(tx.date);
    if (dateLabel !== currentDate) {
      currentDate = dateLabel;
      groupedData.push({ type: 'header', date: dateLabel, id: 'h_' + tx.id });
    }
    groupedData.push({ type: 'item', ...tx });
  });

  const renderItem = ({ item }) => {
    if (item.type === 'header') {
      return (
        <View style={styles.dateHeader}>
          <View style={styles.dateDot} />
          <Text style={styles.dateHeaderText}>{item.date}</Text>
        </View>
      );
    }
    return (
      <TransactionCard
        item={item}
        showActions={true}
        onEdit={handleEdit}
        onDelete={handleDeletePress}
      />
    );
  };

  return (
    <View style={styles.root}>
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={16} color="#4a5568" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari kategori, catatan..."
            placeholderTextColor="#2a3550"
            value={searchQuery}
            onChangeText={handleSearchChange}
            returnKeyType="search"
          />
          {!!searchQuery && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color="#4a5568" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.exportBtn, exporting && { opacity: 0.5 }]}
          onPress={handleExportCSV}
          disabled={exporting}
        >
          {exporting
            ? <ActivityIndicator size={16} color="#00c896" />
            : <Ionicons name="download-outline" size={18} color="#00c896" />
          }
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.typeFilterScroll}
        contentContainerStyle={styles.typeFilterContent}
      >
        {TYPE_FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.typeChip, typeFilter === f.key && styles.typeChipActive]}
            onPress={() => setTypeFilter(f.key)}
          >
            <Ionicons name={f.icon} size={13} color={typeFilter === f.key ? (f.color || '#fff') : '#4a5568'} style={{ marginRight: 5 }} />
            <Text style={[styles.typeChipText, typeFilter === f.key && { color: f.color || '#fff' }]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.periodFilterScroll}
        contentContainerStyle={styles.periodFilterContent}
      >
        {PERIOD_FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.periodChip, periodFilter === f.key && styles.periodChipActive]}
            onPress={() => setPeriodFilter(f.key)}
          >
            <Text style={[styles.periodChipText, periodFilter === f.key && styles.periodChipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Masuk</Text>
          <Text style={[styles.summaryValue, { color: '#00c896' }]}>+{formatRupiah(totalIncome)}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Keluar</Text>
          <Text style={[styles.summaryValue, { color: '#ff4d6d' }]}>−{formatRupiah(totalExpense)}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Net</Text>
          <Text style={[styles.summaryValue, { color: (totalIncome - totalExpense) >= 0 ? '#00c896' : '#ff4d6d' }]}>
            {(totalIncome - totalExpense) >= 0 ? '+' : '−'}{formatRupiah(Math.abs(totalIncome - totalExpense))}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7c6aff" />
        </View>
      ) : loadError ? (
        <View style={styles.emptyState}>
          <Ionicons name="cloud-offline-outline" size={56} color="#ff4d6d33" />
          <Text style={styles.emptyTitle}>Gagal Memuat Data</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
            <Text style={styles.retryBtnText}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      ) : groupedData.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={56} color="#1a2540" />
          <Text style={styles.emptyTitle}>Belum Ada Transaksi</Text>
        </View>
      ) : (
        <FlatList
          data={groupedData}
          renderItem={renderItem}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 30, paddingTop: 8 }}
          showsVerticalScrollIndicator={false}
          initialNumToRender={12}
          maxToRenderPerBatch={10}
          windowSize={7}
        />
      )}

      <BottomSheetModal
        visible={deleteModalVisible}
        onClose={() => setDeleteModalVisible(false)}
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
            <Text style={styles.sheetAmount}>{formatRupiahFull(txToDelete.amount)}</Text> akan dihapus permanen.
            {'\n\n'}Saldo rekening <Text style={styles.sheetBold}>{txToDelete.account_name}</Text> akan disesuaikan secara otomatis.
          </Text>
        )}
      </BottomSheetModal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#060d1a' },
  searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10, gap: 10 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#0d1526', borderRadius: 12, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 10 : 6, borderWidth: 1, borderColor: '#1a2540' },
  searchInput: { flex: 1, color: '#e8edf5', fontSize: 14 },
  exportBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#002d22', borderWidth: 1, borderColor: '#00c896', justifyContent: 'center', alignItems: 'center' },
  typeFilterScroll: { flexShrink: 0, flexGrow: 0, marginBottom: 6 },
  typeFilterContent: { paddingHorizontal: 16, paddingVertical: 4, alignItems: 'center' },
  typeChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, marginRight: 8, backgroundColor: '#0d1526', borderRadius: 20, borderWidth: 1, borderColor: '#1a2540' },
  typeChipActive: { backgroundColor: '#1a1040', borderColor: '#7c6aff' },
  typeChipText: { color: '#4a5568', fontSize: 12, fontWeight: '600' },
  periodFilterScroll: { flexShrink: 0, flexGrow: 0, marginBottom: 10 },
  periodFilterContent: { paddingHorizontal: 16, paddingVertical: 6, alignItems: 'center' },
  periodChip: { paddingHorizontal: 12, paddingVertical: 6, marginRight: 8, backgroundColor: '#0d1526', borderRadius: 16, borderWidth: 1, borderColor: '#1a2540', alignSelf: 'flex-start' },
  periodChipActive: { backgroundColor: '#7c6aff', borderColor: '#7c6aff' },
  periodChipText: { color: '#4a5568', fontSize: 11, fontWeight: '600' },
  periodChipTextActive: { color: '#fff' },
  summaryBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 8, backgroundColor: '#0d1526', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#1a2540' },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { color: '#4a5568', fontSize: 10, fontWeight: '600', marginBottom: 3 },
  summaryValue: { fontSize: 12, fontWeight: '700' },
  summaryDivider: { width: 1, height: 28, backgroundColor: '#1a2540' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { color: '#2a3550', fontSize: 16, fontWeight: '700', marginTop: 16 },
  retryBtn: { marginTop: 20, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#1a1040', borderRadius: 12, borderWidth: 1, borderColor: '#7c6aff' },
  retryBtnText: { color: '#7c6aff', fontSize: 13, fontWeight: '700' },
  dateHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 6 },
  dateDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#7c6aff', marginRight: 8 },
  dateHeaderText: { color: '#8892a4', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
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