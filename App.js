import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { initDatabase } from './src/db/database';

// Imported Screens
import { AppProvider, useAppContext } from './src/context/AppContext';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import MutasiScreen from './src/screens/MutasiScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import TransactionScreen from './src/screens/TransactionScreen';

const Tab = createBottomTabNavigator();

// Custom Loading Fallback
function LoadingFallback() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#060d1a' }}>
      <ActivityIndicator size="large" color="#7c6aff" />
      <Text style={{ marginTop: 14, color: '#8892a4', fontSize: 14, letterSpacing: 0.5 }}>Memuat database...</Text>
    </View>
  );
}

// Error Boundary — catches render crashes and shows fallback UI
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#060d1a', padding: 30 }}>
          <Ionicons name="warning-outline" size={56} color="#ff4d6d" />
          <Text style={{ color: '#e8edf5', fontSize: 18, fontWeight: '700', marginTop: 18, textAlign: 'center' }}>
            Terjadi Kesalahan
          </Text>
          <Text style={{ color: '#8892a4', fontSize: 13, textAlign: 'center', marginTop: 10, lineHeight: 20 }}>
            Aplikasi mengalami masalah. Coba restart atau hubungi developer.
          </Text>
          <Text style={{ color: '#2a3550', fontSize: 11, textAlign: 'center', marginTop: 12, fontFamily: 'monospace' }}>
            {this.state.error?.message || 'Unknown error'}
          </Text>
          <TouchableOpacity
            style={{ marginTop: 24, backgroundColor: '#7c6aff', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14 }}
            onPress={() => this.setState({ hasError: false, error: null })}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

function AppContent() {
  const insets = useSafeAreaInsets();
  const { colors } = useAppContext();

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;
            if (route.name === 'Beranda') iconName = focused ? 'home' : 'home-outline';
            else if (route.name === 'Mutasi') iconName = focused ? 'list' : 'list-outline';
            else if (route.name === 'Tambah Transaksi') iconName = focused ? 'add-circle' : 'add-circle-outline';
            else if (route.name === 'Statistik') iconName = focused ? 'bar-chart' : 'bar-chart-outline';
            else if (route.name === 'Pengaturan') iconName = focused ? 'settings' : 'settings-outline';
            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: colors.brand,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: {
            backgroundColor: colors.bgCard,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            height: 62 + insets.bottom,
            paddingBottom: 8 + insets.bottom,
            paddingTop: 6,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
          },
          headerStyle: {
            backgroundColor: colors.bgCard,
            shadowColor: 'transparent',
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            elevation: 0,
          },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: { fontWeight: 'bold', fontSize: 17 },
          headerShadowVisible: false,
        })}
      >
        <Tab.Screen 
          name="Beranda" 
          component={DashboardScreen} 
          options={{ title: 'Beranda' }} 
          listeners={{
            tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
          }}
        />
        <Tab.Screen 
          name="Mutasi" 
          component={MutasiScreen} 
          options={{ title: 'Mutasi' }} 
          listeners={{
            tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
          }}
        />
        <Tab.Screen 
          name="Tambah Transaksi" 
          component={TransactionScreen} 
          options={{ title: 'Catat Transaksi' }} 
          listeners={{
            tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
          }}
        />
        <Tab.Screen 
          name="Statistik" 
          component={AnalyticsScreen} 
          options={{ title: 'Statistik' }} 
          listeners={{
            tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
          }}
        />
        <Tab.Screen 
          name="Pengaturan" 
          component={SettingsScreen} 
          options={{ title: 'Pengaturan' }} 
          listeners={{
            tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

// StatusBar component yang respons terhadap theme
function AppStatusBar() {
  const { currentTheme } = useAppContext();
  return <StatusBar style={currentTheme === 'dark' ? 'light' : 'dark'} />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <SQLiteProvider
          databaseName="moneytracker.db"
          onInit={initDatabase}
          loadingFallback={<LoadingFallback />}
        >
          <AppProvider>
            <AppStatusBar />
            <AppContent />
          </AppProvider>
        </SQLiteProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}