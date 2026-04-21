import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, TransactionTypeConfig } from '../constants/theme';
import { formatRupiah, formatDateShort } from '../utils/formatting';

export default function TransactionCard({ 
  item, 
  onPress, 
  onLongPress, 
  showActions = false,
  onEdit,
  onDelete 
}) {
  const cfg = TransactionTypeConfig[item.type] || TransactionTypeConfig.expense;

  return (
    <TouchableOpacity
      style={styles.txItem}
      onLongPress={onLongPress ? () => onLongPress(item) : undefined}
      onPress={onPress ? () => onPress(item) : undefined}
      activeOpacity={0.75}
      delayLongPress={400}
    >
      <View style={[styles.txIconWrap, { backgroundColor: cfg.bg }]}>
        <Ionicons name={cfg.icon} size={18} color={cfg.color} />
      </View>
      
      <View style={styles.txMid}>
        <Text style={styles.txTitle} numberOfLines={1}>
          {item.category_name || 'Transfer Saldo'}
        </Text>
        <Text style={styles.txSub} numberOfLines={1}>
          {item.type === 'transfer'
            ? `${item.account_name} → ${item.to_account_name}`
            : `${item.account_name}${item.subcategory_name ? ' · ' + item.subcategory_name : ''}`}
        </Text>
        {!!item.description && showActions && (
          <Text style={styles.txDesc} numberOfLines={1}>{item.description}</Text>
        )}
      </View>

      <View style={styles.txRight}>
        <Text style={[styles.txAmount, { color: cfg.color }]} numberOfLines={1} adjustsFontSizeToFit>
          {cfg.sign}{formatRupiah(item.amount)}
        </Text>
        
        {showActions ? (
          <View style={styles.txActions}>
            <TouchableOpacity onPress={() => onEdit && onEdit(item)} style={styles.txActionBtn}>
              <Ionicons name="create-outline" size={14} color={Colors.brand} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onDelete && onDelete(item)} style={styles.txActionBtn}>
              <Ionicons name="trash-outline" size={14} color={Colors.expense} />
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.txDate}>{formatDateShort(item.date)}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  txIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  txMid: { flex: 1, marginRight: 8 },
  txTitle: { color: Colors.textPrimary, fontSize: 15, fontWeight: '600', marginBottom: 4 },
  txSub: { color: Colors.textMuted, fontSize: 13 },
  txDesc: { color: Colors.textSecondary, fontSize: 12, fontStyle: 'italic', marginTop: 4 },
  txRight: { alignItems: 'flex-end', minWidth: 80, flexShrink: 0 },
  txAmount: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  txDate: { color: Colors.textSecondary, fontSize: 12, fontWeight: '500' },
  txActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  txActionBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.bgElevated,
    justifyContent: 'center', alignItems: 'center',
  },
});
