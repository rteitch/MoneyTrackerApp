import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initDatabase } from './src/db/database';

// Context & Error Boundary
import { AppProvider, useAppContext } from './src/context/AppContext';
import ErrorBoundary from './src/components/ErrorBoundary';
import CustomTabBar from './src/components/CustomTabBar';

// Screens
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import AssessmentScreen from './src/screens/AssessmentScreen';
import BudgetScreen from './src/screens/BudgetScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import DebtScreen from './src/screens/DebtScreen';
import GoalsScreen from './src/screens/GoalsScreen';
import MonthlyReviewScreen from './src/screens/MonthlyReviewScreen';
import MoreScreen from './src/screens/MoreScreen';
import MutasiScreen from './src/screens/MutasiScreen';
import PlannerScreen from './src/screens/PlannerScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import SimulatorScreen from './src/screens/SimulatorScreen';
import TransactionScreen from './src/screens/TransactionScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// ─── Loading Fallback ──────────────────────────────────────────────────────────
function LoadingFallback() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A' }}>
      <ActivityIndicator size="large" color="#00478F" />
      <Text style={{ marginTop: 14, color: '#878681', fontSize: 14, letterSpacing: 0.5 }}>
        Memuat database...
      </Text>
    </View>
  );
}

// ─── Bottom Tabs (4 tabs only) ────────────────────────────────────────────────
function MainTabs() {
  const { colors } = useAppContext();

  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={({ route }) => ({
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
      />
      <Tab.Screen
        name="Mutasi"
        component={MutasiScreen}
        options={{ title: 'Mutasi' }}
      />
      <Tab.Screen
        name="Statistik"
        component={AnalyticsScreen}
        options={{ title: 'Statistik' }}
      />
      <Tab.Screen
        name="Lainnya"
        component={MoreScreen}
        options={{ title: 'Lainnya' }}
      />
    </Tab.Navigator>
  );
}

// ─── Root Stack Navigator ─────────────────────────────────────────────────────
// Allows modal screens to overlay the tab bar
function AppContent() {
  const { colors } = useAppContext();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bgPrimary },
      }}
    >
      {/* Main tab view */}
      <Stack.Screen name="MainTabs" component={MainTabs} />

      {/* Screens accessible from tabs but without their own tab */}
      <Stack.Screen
        name="Tambah Transaksi"
        component={TransactionScreen}
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: colors.bgCard },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: { fontWeight: 'bold', fontSize: 17 },
          headerShadowVisible: false,
          title: 'Catat Transaksi',
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="Hutang"
        component={DebtScreen}
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: colors.bgCard },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: { fontWeight: 'bold', fontSize: 17 },
          headerShadowVisible: false,
          title: 'Hutang & Piutang',
        }}
      />
      <Stack.Screen
        name="Anggaran"
        component={BudgetScreen}
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: colors.bgCard },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: { fontWeight: 'bold', fontSize: 17 },
          headerShadowVisible: false,
          title: 'Anggaran Bulanan',
        }}
      />
      <Stack.Screen
        name="Pengaturan"
        component={SettingsScreen}
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: colors.bgCard },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: { fontWeight: 'bold', fontSize: 17 },
          headerShadowVisible: false,
          title: 'Pengaturan',
        }}
      />
      <Stack.Screen
        name="Planner"
        component={PlannerScreen}
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: colors.bgCard },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: { fontWeight: 'bold', fontSize: 17 },
          headerShadowVisible: false,
          title: 'Financial Planner',
        }}
      />
      <Stack.Screen
        name="Assessment"
        component={AssessmentScreen}
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: colors.bgCard },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: { fontWeight: 'bold', fontSize: 17 },
          headerShadowVisible: false,
          title: 'Analisis Keuangan',
        }}
      />
      <Stack.Screen
        name="Simulator"
        component={SimulatorScreen}
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: colors.bgCard },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: { fontWeight: 'bold', fontSize: 17 },
          headerShadowVisible: false,
          title: '💡 Simulator',
        }}
      />
      <Stack.Screen
        name="Goals"
        component={GoalsScreen}
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: colors.bgCard },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: { fontWeight: 'bold', fontSize: 17 },
          headerShadowVisible: false,
          title: '🎯 Target Finansial',
        }}
      />
      <Stack.Screen
        name="MonthlyReview"
        component={MonthlyReviewScreen}
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: colors.bgCard },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: { fontWeight: 'bold', fontSize: 17 },
          headerShadowVisible: false,
          title: '🏆 Evaluasi & Achievement',
        }}
      />
    </Stack.Navigator>
  );
}

// ─── Status Bar ───────────────────────────────────────────────────────────────
function AppStatusBar() {
  const { currentTheme } = useAppContext();
  return <StatusBar style={currentTheme === 'dark' ? 'light' : 'dark'} />;
}

// ─── Root App ─────────────────────────────────────────────────────────────────
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
            <NavigationContainer>
              <AppStatusBar />
              <AppContent />
            </NavigationContainer>
          </AppProvider>
        </SQLiteProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}