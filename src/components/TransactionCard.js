import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAppContext } from '../context/AppContext';
import { formatRupiah, formatDate } from '../utils/formatting';
import { FontSizes, Radius, Spacing } from '../constants/theme';

export default function TransactionCard({ item, onPress, onLongPress, showActions = false, onEdit, onDelete }) {
  const { colors, typeConfig } = useAppContext();
  const styles = makeStyles(colors);
  const config = typeConfig[item.type] || typeConfig.expense;
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        activeOpacity={0.7}
        style={styles.card}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress?.(item); }}
        onLongPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onLongPress?.(item); }}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        delayLongPress={400}
      >
        <View style={[styles.iconBox, { backgroundColor: config.color + '15' }]}>
          <Ionicons name={config.icon} size={18} color={config.color} />
        </View>

        <View style={styles.content}>
          <View style={styles.topRow}>
            <Text style={styles.category} numberOfLines={1}>
              {item.type === 'transfer' ? `Transfer: ${item.account_name} ➔ ${item.to_account_name}` : item.category_name}
            </Text>
            <Text style={[styles.amount, { color: config.color }]}>
              {config.sign}{formatRupiah(item.amount)}
            </Text>
          </View>

          <View style={styles.bottomRow}>
            <View style={styles.metaRow}>
              <Text style={styles.subText}>{formatDate(item.date)}</Text>
              {item.account_name && item.type !== 'transfer' && (
                <>
                  <Text style={styles.dot}> • </Text>
                  <Text style={styles.subText}>{item.account_name}</Text>
                </>
              )}
            </View>
            {item.description ? (
              <Text style={styles.description} numberOfLines={1}>{item.description}</Text>
            ) : null}
          </View>
        </View>

        {showActions && (
          <View style={styles.actions}>
            <TouchableOpacity onPress={() => onEdit?.(item)} style={styles.actionBtn}>
              <Ionicons name="pencil" size={16} color={colors.brand} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onDelete?.(item)} style={styles.actionBtn}>
              <Ionicons name="trash" size={16} color={colors.expense} />
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    backgroundColor: colors.bgCard,
    borderColor: colors.border,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  content: { flex: 1, marginRight: 8 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  category: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  amount: { fontSize: 15, fontWeight: '700' },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  subText: { fontSize: 12, fontWeight: '500', color: colors.textMuted },
  dot: { fontSize: 12, color: colors.textFaint },
  description: { fontSize: 12, fontStyle: 'italic', marginTop: 4, color: colors.textSecondary },
  actions: { flexDirection: 'row', gap: 10, paddingLeft: 12, borderLeftWidth: 1, borderLeftColor: colors.border },
  actionBtn: {
    width: 32, height: 32, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },
});