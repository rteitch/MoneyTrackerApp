import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../context/AppContext';
import { formatRupiah, formatDate } from '../utils/formatting';

export default function DebtCard({ item, onPress, onPay, onSettle }) {
  const { colors } = useAppContext();
  const isReceivable = item.type === 'receivable';
  const isSettled = item.status === 'settled';
  const isPartial = item.status === 'partial';
  const progress = item.original_amount > 0 ? ((item.original_amount - item.remaining_amount) / item.original_amount) * 100 : 0;

  const isOverdue = item.due_date && !isSettled && new Date(item.due_date) < new Date();

  let statusColor = colors.textMuted;
  let statusLabel = 'Belum Lunas';
  if (isSettled) { statusColor = colors.income; statusLabel = 'Lunas'; }
  else if (isPartial) { statusColor = colors.warning; statusLabel = 'Cicilan'; }
  if (isOverdue && !isSettled) { statusColor = colors.expense; statusLabel = 'Jatuh Tempo!'; }

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.bgCard, borderColor: isOverdue && !isSettled ? colors.expense + '40' : colors.border }]}
      onPress={() => onPress?.(item)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={[styles.iconBox, { backgroundColor: (isReceivable ? colors.income : colors.expense) + '15' }]}>
          <Ionicons
            name={isReceivable ? 'arrow-down-circle' : 'arrow-up-circle'}
            size={20}
            color={isReceivable ? colors.income : colors.expense}
          />
        </View>
        <View style={styles.headerInfo}>
          <Text style={[styles.personName, { color: colors.textPrimary }]} numberOfLines={1}>{item.person_name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>
        <Text style={[styles.amount, { color: isReceivable ? colors.income : colors.expense }]}>
          {formatRupiah(item.remaining_amount)}
        </Text>
      </View>

      {item.description ? (
        <Text style={[styles.description, { color: colors.textMuted }]} numberOfLines={1}>{item.description}</Text>
      ) : null}

      {/* Progress Bar */}
      <View style={[styles.progressTrack, { backgroundColor: colors.bgElevated }]}>
        <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: isReceivable ? colors.income : colors.expense }]} />
      </View>
      <View style={styles.progressInfo}>
        <Text style={[styles.progressLabel, { color: colors.textMuted }]}>
          {isSettled ? 'Lunas' : `${progress.toFixed(0)}% terbayar`}
        </Text>
        <Text style={[styles.progressLabel, { color: colors.textMuted }]}>
          dari {formatRupiah(item.original_amount)}
        </Text>
      </View>

      {item.due_date && !isSettled && (
        <View style={[styles.dueRow, isOverdue && { backgroundColor: colors.expenseBg }]}>
          <Ionicons name={isOverdue ? 'alert-circle' : 'calendar-outline'} size={12} color={isOverdue ? colors.expense : colors.textMuted} />
          <Text style={[styles.dueText, { color: isOverdue ? colors.expense : colors.textMuted }]}>
            {isOverdue ? 'Terlambat! ' : 'Jatuh tempo: '}{formatDate(item.due_date)}
          </Text>
        </View>
      )}

      {!isSettled && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.brandBg }]}
            onPress={() => onPay?.(item)}
          >
            <Ionicons name="cash-outline" size={14} color={colors.brand} />
            <Text style={[styles.actionText, { color: colors.brand }]}>Bayar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.incomeBg }]}
            onPress={() => onSettle?.(item)}
          >
            <Ionicons name="checkmark-circle-outline" size={14} color={colors.income} />
            <Text style={[styles.actionText, { color: colors.income }]}>Lunasi</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 8,
  },
  iconBox: {
    width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  headerInfo: { flex: 1 },
  personName: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  statusBadge: {
    alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8,
  },
  statusText: { fontSize: 10, fontWeight: '700' },
  amount: { fontSize: 16, fontWeight: '800' },
  description: { fontSize: 12, marginBottom: 10, fontStyle: 'italic' },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  progressFill: { height: '100%', borderRadius: 3 },
  progressInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel: { fontSize: 10, fontWeight: '600' },
  dueRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8,
  },
  dueText: { fontSize: 11, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: 10, gap: 6,
  },
  actionText: { fontSize: 12, fontWeight: '700' },
});
