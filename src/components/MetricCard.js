import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../context/AppContext';

export default function MetricCard({ label, value, sub, color, icon }) {
  const { colors } = useAppContext();
  return (
    <View style={[styles.card, { backgroundColor: colors.bgCard, borderLeftColor: color }]}>
      <Ionicons name={icon} size={18} color={color} style={styles.icon} />
      <Text style={[styles.val, { color: colors.textPrimary }]}>{value}</Text>
      <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      {sub && <Text style={[styles.sub, { color: colors.textFaint }]}>{sub}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1, 
    borderRadius: 12, 
    padding: 14,
    borderLeftWidth: 3, 
    margin: 4,
  },
  icon: { marginBottom: 6 },
  val: { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  label: { fontSize: 11, fontWeight: '600' },
  sub: { fontSize: 10, marginTop: 2 },
});
