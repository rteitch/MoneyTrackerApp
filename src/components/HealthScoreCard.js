/**
 * src/components/HealthScoreCard.js
 *
 * Premium Financial Health Score Card component.
 * Shows score (0–100), level label, progress arc, and score breakdown.
 */

import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAppContext } from '../context/AppContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SEVERITY_COLORS = { critical: '#EF4444', high: '#f97316', medium: '#f59e0b', low: '#10B981' };

export default function HealthScoreCard({ analysis, onPressSeeDetail, compact = false }) {
  const { colors } = useAppContext();
  const styles = makeStyles(colors);

  const animScore = useRef(new Animated.Value(0)).current;
  const [displayScore, setDisplayScore] = useState(0);

  const score = analysis?.healthScore ?? null;
  const level = analysis?.level;

  useEffect(() => {
    if (score === null) return;
    animScore.setValue(0);
    const listener = animScore.addListener(({ value }) => setDisplayScore(Math.round(value)));
    Animated.timing(animScore, {
      toValue: score,
      duration: 1200,
      useNativeDriver: false,
    }).start();
    return () => animScore.removeListener(listener);
  }, [score]);

  // Empty state
  if (!analysis || score === null) {
    return (
      <TouchableOpacity
        style={[styles.card, styles.emptyCard, { borderColor: colors.brand }]}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPressSeeDetail?.(); }}
        activeOpacity={0.8}
      >
        <View style={[styles.emptyIcon, { backgroundColor: colors.brandBg }]}>
          <Ionicons name="analytics" size={28} color={colors.brand} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Financial Planner</Text>
        <Text style={[styles.emptySub, { color: colors.textMuted }]}>
          Isi profil keuangan untuk melihat{'\n'}Financial Health Score kamu
        </Text>
        <View style={[styles.emptyBtn, { backgroundColor: colors.brand }]}>
          <Text style={styles.emptyBtnText}>Mulai Sekarang →</Text>
        </View>
      </TouchableOpacity>
    );
  }

  const progressW = ((score / 100) * (SCREEN_WIDTH - 72));
  const levelColor = level?.color || colors.brand;

  if (compact) {
    return (
      <TouchableOpacity
        style={[styles.compactCard, { borderColor: levelColor + '40', backgroundColor: colors.bgCard }]}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPressSeeDetail?.(); }}
        activeOpacity={0.8}
      >
        <View style={[styles.compactScoreBox, { backgroundColor: levelColor + '18' }]}>
          <Text style={[styles.compactScore, { color: levelColor }]}>{displayScore}</Text>
          <Text style={[styles.compactMax, { color: levelColor + 'aa' }]}>/100</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={[styles.compactLabel, { color: colors.textPrimary }]}>Financial Health</Text>
          <Text style={[styles.compactLevel, { color: levelColor }]}>{level?.emoji} {level?.label}</Text>
          <View style={[styles.barBg, { backgroundColor: colors.bgElevated }]}>
            <View style={[styles.barFill, { width: `${score}%`, backgroundColor: levelColor }]} />
          </View>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPressSeeDetail?.(); }}
    >
      <LinearGradient
        colors={[levelColor + 'CC', levelColor + '88']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {/* Decoration circles */}
        <View style={styles.deco1} />
        <View style={styles.deco2} />

        {/* Header */}
        <View style={styles.row}>
          <View>
            <Text style={styles.headerLabel}>Financial Health Score</Text>
            <Text style={styles.levelBadge}>{level?.emoji}  {level?.label}</Text>
          </View>
          <View style={[styles.scoreCircle, { borderColor: 'rgba(255,255,255,0.5)' }]}>
            <Text style={styles.scoreNum}>{displayScore}</Text>
            <Text style={styles.scoreMax}>/100</Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressBg}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: animScore.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>

        {/* Score breakdown row */}
        {analysis.scores && (
          <View style={styles.scoresRow}>
            {[
              { key: 'cashFlow', label: 'Arus Kas', max: 25 },
              { key: 'debt',     label: 'Hutang',   max: 20 },
              { key: 'emergencyFund', label: 'Darurat', max: 20 },
              { key: 'savingsRate', label: 'Tabungan', max: 20 },
              { key: 'housing', label: 'Hunian', max: 10 },
            ].map(({ key, label, max }) => {
              const val = analysis.scores[key] || 0;
              const pct = Math.round((val / max) * 100);
              return (
                <View key={key} style={styles.scoreItem}>
                  <Text style={styles.scoreItemVal}>{val}<Text style={styles.scoreItemMax}>/{max}</Text></Text>
                  <Text style={styles.scoreItemLabel}>{label}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Diagnostics count */}
        {analysis.diagnoses && analysis.diagnoses.length > 0 && (
          <View style={styles.diagRow}>
            <Ionicons name="alert-circle" size={14} color="rgba(255,255,255,0.9)" />
            <Text style={styles.diagText}>
              {analysis.diagnoses.length} masalah terdeteksi — Tap untuk detail
            </Text>
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  card: {
    marginHorizontal: 16, borderRadius: 24, padding: 20,
    marginBottom: 20, overflow: 'hidden', position: 'relative',
    elevation: 8, shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12,
  },
  deco1: {
    position: 'absolute', top: -30, right: -30, width: 120, height: 120,
    borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.08)',
  },
  deco2: {
    position: 'absolute', bottom: -40, left: -10, width: 160, height: 160,
    borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.05)',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerLabel: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.75)', letterSpacing: 0.5, marginBottom: 4 },
  levelBadge: { fontSize: 18, fontWeight: '800', color: '#fff' },
  scoreCircle: {
    width: 68, height: 68, borderRadius: 34, borderWidth: 2.5,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  scoreNum: { fontSize: 22, fontWeight: '900', color: '#fff', lineHeight: 26 },
  scoreMax: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
  progressBg: {
    height: 6, borderRadius: 3, marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  progressFill: {
    height: '100%', borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.9)',
  },
  scoresRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  scoreItem: { alignItems: 'center', flex: 1 },
  scoreItemVal: { fontSize: 14, fontWeight: '800', color: '#fff' },
  scoreItemMax: { fontSize: 9, fontWeight: '600', color: 'rgba(255,255,255,0.65)' },
  scoreItemLabel: { fontSize: 9, fontWeight: '600', color: 'rgba(255,255,255,0.75)', marginTop: 2, textAlign: 'center' },
  diagRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  diagText: { fontSize: 11, color: 'rgba(255,255,255,0.9)', fontWeight: '600', flex: 1 },

  // Compact variant
  compactCard: {
    marginHorizontal: 16, borderRadius: 18, padding: 16, marginBottom: 16,
    flexDirection: 'row', alignItems: 'center', borderWidth: 1,
    elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
  },
  compactScoreBox: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  compactScore: { fontSize: 20, fontWeight: '900', lineHeight: 24 },
  compactMax: { fontSize: 9, fontWeight: '700' },
  compactLabel: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  compactLevel: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  barBg: { height: 4, borderRadius: 2, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 2 },

  // Empty state
  emptyCard: {
    marginHorizontal: 16, borderRadius: 24, padding: 24, marginBottom: 20,
    alignItems: 'center', borderWidth: 1.5, borderStyle: 'dashed',
    backgroundColor: colors.bgCard,
  },
  emptyIcon: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '800', marginBottom: 6 },
  emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 19, marginBottom: 16 },
  emptyBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12 },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
