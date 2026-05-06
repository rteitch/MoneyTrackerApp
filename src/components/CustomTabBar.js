import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRef } from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppContext } from '../context/AppContext';

const TAB_ICONS = {
  Beranda:   { default: 'home-outline',      focused: 'home' },
  Mutasi:    { default: 'list-outline',       focused: 'list' },
  Statistik: { default: 'bar-chart-outline',  focused: 'bar-chart' },
  Lainnya:   { default: 'grid-outline',       focused: 'grid' },
};

const TAB_LABELS = {
  Beranda:   'Beranda',
  Mutasi:    'Mutasi',
  Statistik: 'Statistik',
  Lainnya:   'Lainnya',
};

export default function CustomTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const { colors } = useAppContext();

  // Animation for FAB scale
  const fabScale = useRef(new Animated.Value(1)).current;

  const handleFabPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Bounce animation
    Animated.sequence([
      Animated.timing(fabScale, { toValue: 0.88, duration: 80, useNativeDriver: true }),
      Animated.spring(fabScale, { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }),
    ]).start();
    navigation.navigate('Tambah Transaksi');
  };

  const BOTTOM_HEIGHT = 62 + insets.bottom;

  // Split tabs: 2 left, FAB center, 2 right
  const visibleTabs = state.routes.filter(r => Object.keys(TAB_ICONS).includes(r.name));
  const leftTabs = visibleTabs.slice(0, 2);
  const rightTabs = visibleTabs.slice(2, 4);

  const renderTab = (route) => {
    const isFocused = state.index === state.routes.findIndex(r => r.name === route.name);
    const iconDef = TAB_ICONS[route.name];
    if (!iconDef) return null;

    const onPress = () => {
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!isFocused && !event.defaultPrevented) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.navigate(route.name);
      }
    };

    return (
      <TouchableOpacity
        key={route.key}
        style={styles.tabBtn}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={[styles.tabIndicator, isFocused && { backgroundColor: colors.brand + '18' }]}>
          <Ionicons
            name={isFocused ? iconDef.focused : iconDef.default}
            size={22}
            color={isFocused ? colors.brand : colors.textMuted}
          />
          <Text
            style={[
              styles.tabLabel,
              { color: isFocused ? colors.brand : colors.textMuted },
              isFocused && { fontWeight: '700' },
            ]}
            numberOfLines={1}
          >
            {TAB_LABELS[route.name]}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View
      style={[
        styles.container,
        {
          height: BOTTOM_HEIGHT,
          paddingBottom: insets.bottom,
          backgroundColor: colors.bgCard,
          borderTopColor: colors.border,
        },
      ]}
    >
      {/* Left tabs */}
      <View style={styles.tabGroup}>
        {leftTabs.map(renderTab)}
      </View>

      {/* FAB Center Button */}
      <View style={styles.fabWrapper}>
        <Animated.View style={{ transform: [{ scale: fabScale }] }}>
          <TouchableOpacity
            style={[styles.fab, { backgroundColor: colors.brand }]}
            onPress={handleFabPress}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={28} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
        <Text style={[styles.fabLabel, { color: colors.textMuted }]}>Catat</Text>
      </View>

      {/* Right tabs */}
      <View style={styles.tabGroup}>
        {rightTabs.map(renderTab)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
  },
  tabGroup: {
    flex: 1,
    flexDirection: 'row',
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 8,
  },
  tabIndicator: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    minWidth: 60,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 3,
    letterSpacing: 0.2,
  },

  // FAB
  fabWrapper: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 0,
    marginTop: -20, // lifts FAB above tab bar
    width: 80,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#00478F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.40,
    shadowRadius: 10,
  },
  fabLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
    letterSpacing: 0.2,
  },
});
