import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppContext } from '../context/AppContext';
import { formatRupiah } from '../utils/formatting';

export default function BudgetProgressBar({ category_name, monthly_limit, spent, compact = false }) {
  const { colors } = useAppContext();
  const percentage = monthly_limit > 0 ? (spent / monthly_limit) * 100 : 0;
  const barWidth = Math.min(100, percentage);

  let barColor = colors.income;
  if (percentage >= 90) barColor = colors.expense;
  else if (percentage >= 70) barColor = colors.warning;

  let statusLabel = 'Aman';
  if (percentage >= 100) statusLabel = 'Over!';
  else if (percentage >= 90) statusLabel = 'Hampir Habis';
  else if (percentage >= 70) statusLabel = 'Perhatian';

  if (compact) {
    return (
      <View style={styles.compactRow}>
        <View style={styles.compactInfo}>
          <Text style={[styles.compactName, { color: colors.textPrimary }]} numberOfLines={1}>{category_name}</Text>
          <Text style={[styles.compactAmount, { color: barColor }]}>{statusLabel}</Text>
        </View>
        <View style={[styles.barTrack, { backgroundColor: colors.bgElevated }]}>
          <View style={[styles.barFill, { width: `${barWidth}%`, backgroundColor: barColor }]} />
        </View>
        <Text style={[styles.compactLimit, { color: colors.textMuted }]}>
          {formatRupiah(spent)} / {formatRupiah(monthly_limit)}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>{category_name}</Text>
        <View style={[styles.badge, { backgroundColor: barColor + '20' }]}>
          <Text style={[styles.badgeText, { color: barColor }]}>{percentage.toFixed(0)}%</Text>
        </View>
      </View>

      <View style={[styles.barTrack, { backgroundColor: colors.bgElevated }]}>
        <View style={[styles.barFill, { width: `${barWidth}%`, backgroundColor: barColor }]} />
      </View>

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.textMuted }]}>
          Terpakai: {formatRupiah(spent)}
        </Text>
        <Text style={[styles.footerText, { color: colors.textMuted }]}>
          Limit: {formatRupiah(monthly_limit)}
        </Text>
      </View>

      {percentage >= 100 && (
        <View style={[styles.warningBox, { backgroundColor: colors.expenseBg }]}>
          <Text style={[styles.warningText, { color: colors.expense }]}>
            Melebihi anggaran sebesar {formatRupiah(spent - monthly_limit)}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  name: { fontSize: 14, fontWeight: '700', flex: 1 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: { fontSize: 11, fontWeight: '800' },
  barTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  footerText: { fontSize: 11, fontWeight: '600' },
  warningBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
  },
  warningText: { fontSize: 11, fontWeight: '700' },

  // Compact mode
  compactRow: {
    marginBottom: 12,
  },
  compactInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  compactName: { fontSize: 13, fontWeight: '600', flex: 1 },
  compactAmount: { fontSize: 11, fontWeight: '700' },
  compactLimit: { fontSize: 10, marginTop: 4, textAlign: 'right' },
});
