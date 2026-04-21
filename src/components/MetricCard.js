import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';

export default function MetricCard({ label, value, sub, color, icon }) {
  return (
    <View style={[styles.card, { borderLeftColor: color }]}>
      <Ionicons name={icon} size={18} color={color} style={styles.icon} />
      <Text style={styles.val}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      {sub && <Text style={styles.sub}>{sub}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1, 
    backgroundColor: Colors.bgCard, 
    borderRadius: 12, 
    padding: 14,
    borderLeftWidth: 3, 
    margin: 4,
  },
  icon: { marginBottom: 6 },
  val: { color: Colors.textPrimary, fontSize: 16, fontWeight: '800', marginBottom: 2 },
  label: { color: Colors.textMuted, fontSize: 11, fontWeight: '600' },
  sub: { color: Colors.textFaint, fontSize: 10, marginTop: 2 },
});
