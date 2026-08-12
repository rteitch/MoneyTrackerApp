import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DebtCard from '../components/DebtCard';
import StatusModal from '../components/StatusModal';
import { useAppContext } from '../context/AppContext';
import {
  getDebts,
  getDebtSummary,
  getDebtPayments,
  addDebt,
  addDebtPayment,
  settleDebt,
  deleteDebt,
} from '../db/database';
import { formatRupiah, formatCurrencyInput, parseCurrencyRaw, formatDate } from '../utils/formatting';

export default function DebtScreen() {
  const db = useSQLiteContext();
  const { colors } = useAppContext();
  const styles = makeStyles(colors);
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState('receivable');
  const [debts, setDebts] = useState([]);
  const [summary, setSummary] = useState({ totalReceivable: 0, totalPayable: 0, net: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [statusModal, setStatusModal] = useState({ visible: false, title: '', message: '', type: 'info' });

  // Form state
  const [personName, setPersonName] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');

  // Payment modal state
  const [payModalVisible, setPayModalVisible] = useState(false);
  const [payTarget, setPayTarget] = useState(null);
  const [payAmount, setPayAmount] = useState('');

  // Detail modal state
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailDebt, setDetailDebt] = useState(null);
  const [detailPayments, setDetailPayments] = useState([]);

  const showStatus = (title, message, type) => setStatusModal({ visible: true, title, message, type });

  const loadData = useCallback(async () => {
    try {
      const [d, s] = await Promise.all([
        getDebts(db, activeTab),
        getDebtSummary(db),
      ]);
      setDebts(d);
      setSummary(s);
    } catch (e) {
      console.error('DebtScreen loadData error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [db, activeTab]);

  useFocusEffect(useCallback(() => {
    loadData();
  }, [loadData]));

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleAddDebt = async () => {
    if (!personName.trim()) return showStatus('Error', 'Nama orang/instansi wajib diisi.', 'error');
    const amt = parseCurrencyRaw(amount);
    if (amt <= 0) return showStatus('Error', 'Masukkan nominal yang valid.', 'error');

    try {
      await addDebt(db, {
        type: activeTab,
        person_name: personName.trim(),
        amount: amt,
        description: description.trim(),
        due_date: dueDate || null,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showStatus('Berhasil', `${activeTab === 'receivable' ? 'Piutang' : 'Hutang'} berhasil ditambahkan!`, 'success');
      resetForm();
      loadData();
    } catch (e) {
      console.error('handleAddDebt error:', e);
      showStatus('Gagal', 'Tidak dapat menyimpan data.', 'error');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setPersonName('');
    setAmount('');
    setDescription('');
    setDueDate('');
  };

  const handlePay = (item) => {
    setPayTarget(item);
    setPayAmount('');
    setPayModalVisible(true);
  };

  const confirmPay = async () => {
    if (!payTarget) return;
    const amt = parseCurrencyRaw(payAmount);
    if (amt <= 0) return showStatus('Error', 'Masukkan nominal pembayaran.', 'error');
    if (amt > payTarget.remaining_amount) return showStatus('Error', 'Nominal melebihi sisa tagihan.', 'error');

    try {
      await addDebtPayment(db, payTarget.id, amt, new Date().toISOString());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPayModalVisible(false);
      setPayTarget(null);
      loadData();
    } catch (e) {
      showStatus('Gagal', 'Pembayaran tidak dapat diproses.', 'error');
    }
  };

  const handleSettle = (item) => {
    const label = item.type === 'receivable' ? 'piutang' : 'hutang';
    Alert.alert(
      'Lunasi',
      `Lunasi semua sisa ${label} "${item.person_name}" sebesar ${formatRupiah(item.remaining_amount)}?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Lunasi',
          onPress: async () => {
            try {
              await settleDebt(db, item.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              loadData();
            } catch (e) {
              Alert.alert('Gagal', 'Tidak dapat melunasi.');
            }
          },
        },
      ]
    );
  };

  const handleShowDetail = async (item) => {
    setDetailDebt(item);
    try {
      const payments = await getDebtPayments(db, item.id);
      setDetailPayments(payments);
    } catch (e) {
      setDetailPayments([]);
    }
    setDetailVisible(true);
  };

  const handleDeleteDebt = (item) => {
    Alert.alert('Hapus', `Hapus data "${item.person_name}"?`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDebt(db, item.id);
            setDetailVisible(false);
            loadData();
          } catch (e) {
            Alert.alert('Gagal', 'Tidak dapat menghapus.');
          }
        },
      },
    ]);
  };

  const TABS = [
    { key: 'receivable', label: 'Piutang', icon: 'arrow-down-circle', color: colors.income },
    { key: 'payable', label: 'Hutang', icon: 'arrow-up-circle', color: colors.expense },
  ];

  return (
    <View style={styles.root}>
      <FlatList
        data={debts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <DebtCard
            item={item}
            onPress={handleShowDetail}
            onPay={handlePay}
            onSettle={handleSettle}
          />
        )}
        ListHeaderComponent={
          <View>
            <Text style={styles.pageTitle}>Hutang & Piutang</Text>

            {/* Summary Card */}
            <View style={[styles.summaryCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Ionicons name="arrow-down-circle" size={16} color={colors.income} />
                  <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Piutang</Text>
                  <Text style={[styles.summaryValue, { color: colors.income }]}>{formatRupiah(summary.totalReceivable)}</Text>
                </View>
                <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
                <View style={styles.summaryItem}>
                  <Ionicons name="arrow-up-circle" size={16} color={colors.expense} />
                  <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Hutang</Text>
                  <Text style={[styles.summaryValue, { color: colors.expense }]}>{formatRupiah(summary.totalPayable)}</Text>
                </View>
                <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
                <View style={styles.summaryItem}>
                  <Ionicons name="swap-vertical" size={16} color={colors.brand} />
                  <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Bersih</Text>
                  <Text style={[styles.summaryValue, { color: summary.net >= 0 ? colors.income : colors.expense }]}>
                    {summary.net >= 0 ? '+' : ''}{formatRupiah(summary.net)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Tab Switcher */}
            <View style={[styles.tabs, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              {TABS.map(tab => (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.tab, activeTab === tab.key && { backgroundColor: tab.color + '15' }]}
                  onPress={() => { Haptics.selectionAsync(); setActiveTab(tab.key); }}
                >
                  <Ionicons name={tab.icon} size={14} color={activeTab === tab.key ? tab.color : colors.textMuted} />
                  <Text style={[styles.tabText, { color: activeTab === tab.key ? tab.color : colors.textMuted }]}>{tab.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Add Button */}
            {!showForm ? (
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: colors.brandBg, borderColor: colors.brand }]}
                onPress={() => setShowForm(true)}
              >
                <Ionicons name="add-circle" size={18} color={colors.brand} />
                <Text style={[styles.addBtnText, { color: colors.brand }]}>Tambah {activeTab === 'receivable' ? 'Piutang' : 'Hutang'} Baru</Text>
              </TouchableOpacity>
            ) : (
              <View style={[styles.formCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                <Text style={[styles.formTitle, { color: colors.textPrimary }]}>
                  Tambah {activeTab === 'receivable' ? 'Piutang' : 'Hutang'}
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.bgPrimary, borderColor: colors.border, color: colors.textPrimary }]}
                  placeholder="Nama orang / instansi"
                  placeholderTextColor={colors.textFaint}
                  value={personName}
                  onChangeText={setPersonName}
                  maxLength={50}
                />
                <TextInput
                  style={[styles.input, { backgroundColor: colors.bgPrimary, borderColor: colors.border, color: colors.textPrimary }]}
                  keyboardType="number-pad"
                  placeholder="Rp 0"
                  placeholderTextColor={colors.textFaint}
                  value={amount}
                  onChangeText={(t) => setAmount(formatCurrencyInput(t))}
                />
                <TextInput
                  style={[styles.input, { backgroundColor: colors.bgPrimary, borderColor: colors.border, color: colors.textPrimary }]}
                  placeholder="Keterangan (opsional)"
                  placeholderTextColor={colors.textFaint}
                  value={description}
                  onChangeText={setDescription}
                  maxLength={100}
                />
                <TextInput
                  style={[styles.input, { backgroundColor: colors.bgPrimary, borderColor: colors.border, color: colors.textPrimary }]}
                  placeholder="Jatuh tempo: YYYY-MM-DD (opsional)"
                  placeholderTextColor={colors.textFaint}
                  value={dueDate}
                  onChangeText={setDueDate}
                  maxLength={10}
                />
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity style={[styles.btn, { backgroundColor: colors.bgElevated, flex: 1 }]} onPress={resetForm}>
                    <Text style={[styles.btnText, { color: colors.textPrimary }]}>Batal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.btn, { backgroundColor: colors.brand, flex: 2 }]} onPress={handleAddDebt}>
                    <Ionicons name="add-circle" size={18} color="#fff" />
                    <Text style={styles.btnText}>Simpan</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={48} color={colors.bgElevated} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {activeTab === 'receivable' ? 'Belum ada piutang' : 'Belum ada hutang'}
              </Text>
            </View>
          )
        }
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
      />

      {/* Payment Modal */}
      {payModalVisible && payTarget && (
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Bayar Cicilan</Text>
            <Text style={[styles.modalDesc, { color: colors.textSecondary }]}>
              Sisa {activeTab === 'receivable' ? 'piutang' : 'hutang'}: {formatRupiah(payTarget.remaining_amount)}
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.bgPrimary, borderColor: colors.border, color: colors.textPrimary }]}
              keyboardType="number-pad"
              placeholder="Rp 0"
              placeholderTextColor={colors.textFaint}
              value={payAmount}
              onChangeText={(t) => setPayAmount(formatCurrencyInput(t))}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={[styles.btn, { backgroundColor: colors.bgElevated, flex: 1 }]} onPress={() => setPayModalVisible(false)}>
                <Text style={[styles.btnText, { color: colors.textPrimary }]}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { backgroundColor: colors.brand, flex: 2 }]} onPress={confirmPay}>
                <Text style={styles.btnText}>Bayar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Detail Modal */}
      {detailVisible && detailDebt && (
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.bgCard, borderColor: colors.border, maxHeight: '80%' }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{detailDebt.person_name}</Text>
              <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Tipe</Text>
                <Text style={[styles.detailValue, { color: detailDebt.type === 'receivable' ? colors.income : colors.expense }]}>
                  {detailDebt.type === 'receivable' ? 'Piutang' : 'Hutang'}
                </Text>
              </View>
              <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Nominal Awal</Text>
                <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{formatRupiah(detailDebt.original_amount)}</Text>
              </View>
              <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Sisa</Text>
                <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{formatRupiah(detailDebt.remaining_amount)}</Text>
              </View>
              {detailDebt.description ? (
                <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Keterangan</Text>
                  <Text style={[styles.detailValue, { color: colors.textSecondary }]}>{detailDebt.description}</Text>
                </View>
              ) : null}

              {detailPayments.length > 0 && (
                <>
                  <Text style={[styles.paymentTitle, { color: colors.textPrimary }]}>Riwayat Pembayaran</Text>
                  {detailPayments.map((p, i) => (
                    <View key={i} style={[styles.paymentRow, { borderBottomColor: colors.border }]}>
                      <View>
                        <Text style={[styles.paymentDate, { color: colors.textMuted }]}>{formatDate(p.date)}</Text>
                        {p.description ? <Text style={[styles.paymentDesc, { color: colors.textFaint }]}>{p.description}</Text> : null}
                      </View>
                      <Text style={[styles.paymentAmt, { color: colors.income }]}>{formatRupiah(p.amount)}</Text>
                    </View>
                  ))}
                </>
              )}
            </ScrollView>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: colors.bgElevated, flex: 1 }]}
                onPress={() => setDetailVisible(false)}
              >
                <Text style={[styles.btnText, { color: colors.textPrimary }]}>Tutup</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: colors.expense + '20', flex: 1 }]}
                onPress={() => { setDetailVisible(false); handleDeleteDebt(detailDebt); }}
              >
                <Ionicons name="trash" size={16} color={colors.expense} />
                <Text style={[styles.btnText, { color: colors.expense }]}>Hapus</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

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
  summaryItem: { flex: 1, alignItems: 'center', gap: 4 },
  summaryLabel: { fontSize: 10, fontWeight: '700' },
  summaryValue: { fontSize: 14, fontWeight: '800' },
  summaryDivider: { width: 1, height: 30, marginHorizontal: 8 },
  tabs: {
    flexDirection: 'row', marginHorizontal: 16, borderRadius: 14, padding: 4, marginBottom: 16, borderWidth: 1,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: 10, gap: 6,
  },
  tabText: { fontSize: 12, fontWeight: '700' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginHorizontal: 16, padding: 14, borderRadius: 14, marginBottom: 16, borderWidth: 1, gap: 8,
  },
  addBtnText: { fontSize: 14, fontWeight: '700' },
  formCard: {
    marginHorizontal: 16, borderRadius: 18, padding: 20, marginBottom: 16, borderWidth: 1,
  },
  formTitle: { fontSize: 15, fontWeight: '700', marginBottom: 16 },
  input: {
    padding: 14, borderRadius: 12, marginBottom: 12, borderWidth: 1, fontSize: 14,
  },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 14, borderRadius: 12, gap: 8,
  },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  emptyState: { alignItems: 'center', padding: 60 },
  emptyText: { marginTop: 12, fontSize: 15, fontWeight: '600' },

  // Modal styles
  modalOverlay: {
    ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', padding: 24, zIndex: 100,
  },
  modalContent: {
    width: '100%', borderRadius: 24, padding: 24, borderWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  modalDesc: { fontSize: 13, marginBottom: 16 },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1,
  },
  detailLabel: { fontSize: 13, fontWeight: '600' },
  detailValue: { fontSize: 13, fontWeight: '700' },
  paymentTitle: { fontSize: 14, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  paymentRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1,
  },
  paymentDate: { fontSize: 12, fontWeight: '600' },
  paymentDesc: { fontSize: 10, marginTop: 2 },
  paymentAmt: { fontSize: 13, fontWeight: '700' },
});
