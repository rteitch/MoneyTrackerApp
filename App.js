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
import ErrorBoundary from './src/components/ErrorBoundary';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import MutasiScreen from './src/screens/MutasiScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import TransactionScreen from './src/screens/TransactionScreen';

const Tab = createBottomTabNavigator();

// Custom Loading Fallback
function LoadingFallback() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1c1c1a' }}>
      <ActivityIndicator size="large" color="#FF5800" />
      <Text style={{ marginTop: 14, color: '#878681', fontSize: 14, letterSpacing: 0.5 }}>Memuat database...</Text>
    </View>
  );
}

// ErrorBoundary is imported from src/components/ErrorBoundary.js

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