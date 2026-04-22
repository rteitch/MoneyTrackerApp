# Panduan Profesional React Native + Expo
> Pedoman lengkap membangun aplikasi mobile berkualitas produksi menggunakan Expo SDK, Expo Router, EAS, dan TypeScript — 2025/2026

---

## Daftar Isi
1. [Setup & Inisialisasi Proyek](#1-setup--inisialisasi-proyek)
2. [Struktur Folder Profesional](#2-struktur-folder-profesional)
3. [Konfigurasi TypeScript & Path Alias](#3-konfigurasi-typescript--path-alias)
4. [Navigasi dengan Expo Router](#4-navigasi-dengan-expo-router)
5. [State Management](#5-state-management)
6. [Optimasi Performa](#6-optimasi-performa)
7. [Styling & Tema](#7-styling--tema)
8. [API Layer & Data Fetching](#8-api-layer--data-fetching)
9. [EAS Build & Deploy](#9-eas-build--deploy)
10. [OTA Update](#10-ota-update)
11. [Keamanan](#11-keamanan)
12. [Kualitas Kode & Testing](#12-kualitas-kode--testing)
13. [Aksesibilitas & UX](#13-aksesibilitas--ux)
14. [Package yang Direkomendasikan](#14-package-yang-direkomendasikan)
15. [Production Checklist](#15-production-checklist)

---

## 1. Setup & Inisialisasi Proyek

### Persyaratan
- Node.js 18+ (LTS)
- Git
- EAS CLI (`npm install -g eas-cli`)

### Membuat Proyek Baru

```bash
# Selalu gunakan template default yang sudah menyertakan TypeScript
npx create-expo-app@latest NamaAplikasi

cd NamaAplikasi
npm install
```

### Development Build (Direkomendasikan untuk Production)

Gunakan **Development Build** (bukan Expo Go) untuk proyek serius, karena mendukung semua native module.

```bash
# Install EAS CLI
npm install -g eas-cli
eas login

# Buat development build
eas build --profile development --platform android
# atau
eas build --profile development --platform ios
```

---

## 2. Struktur Folder Profesional

Gunakan struktur **feature-based** yang terorganisir dan scalable:

```
NamaAplikasi/
├── app/                        ← Expo Router (routing file-based)
│   ├── _layout.tsx             ← Root layout & navigator utama
│   ├── (tabs)/                 ← Tab group (route tersembunyi di URL)
│   │   ├── _layout.tsx
│   │   ├── index.tsx           ← Tab Home
│   │   └── profile.tsx         ← Tab Profile
│   ├── (auth)/                 ← Auth group
│   │   ├── login.tsx
│   │   └── register.tsx
│   └── [id].tsx                ← Dynamic route
│
├── src/
│   ├── components/
│   │   ├── ui/                 ← Button, Card, Input, Modal, dll
│   │   └── features/           ← Komponen spesifik per fitur
│   ├── hooks/                  ← Custom hooks (useAuth, useFetch, dll)
│   ├── services/               ← API calls & logika eksternal
│   ├── stores/                 ← State management (Zustand)
│   ├── utils/                  ← Helper functions & konstanta
│   └── types/                  ← TypeScript interfaces & types
│
├── assets/
│   ├── fonts/                  ← Custom font files (.ttf, .otf)
│   ├── images/                 ← PNG, JPEG
│   └── icons/                  ← SVG icons
│
├── app.json                    ← Konfigurasi Expo
├── app.config.ts               ← Konfigurasi dinamis (untuk env vars)
├── eas.json                    ← Konfigurasi EAS Build
├── tsconfig.json
└── .env                        ← Environment variables (jangan di-commit!)
```

---

## 3. Konfigurasi TypeScript & Path Alias

### tsconfig.json

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@hooks/*": ["src/hooks/*"],
      "@services/*": ["src/services/*"],
      "@stores/*": ["src/stores/*"],
      "@utils/*": ["src/utils/*"],
      "@types/*": ["src/types/*"]
    }
  }
}
```

### Contoh Penggunaan

```typescript
// ✓ Bersih dengan path alias
import { Button } from '@components/ui/Button'
import { useAuthStore } from '@stores/auth'

// ✗ Relative path berantakan
import { Button } from '../../../components/ui/Button'
```

---

## 4. Navigasi dengan Expo Router

Expo Router menggunakan sistem routing berbasis file (mirip Next.js). Tidak perlu konfigurasi navigator secara manual.

### Root Layout

```typescript
// app/_layout.tsx
import { Stack } from 'expo-router'
import { useFonts } from 'expo-font'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect } from 'react'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Inter-Regular': require('@assets/fonts/Inter-Regular.ttf'),
    'Inter-Bold': require('@assets/fonts/Inter-Bold.ttf'),
  })

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync()
  }, [fontsLoaded])

  if (!fontsLoaded) return null

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
    </Stack>
  )
}
```

### Navigasi Programatik

```typescript
import { Link, useRouter, useLocalSearchParams } from 'expo-router'

// Deklaratif
<Link href="/profile/123">Lihat Profil</Link>
<Link href={{ pathname: '/product/[id]', params: { id: '42' } }}>Produk</Link>

// Programatik
const router = useRouter()
router.push('/detail/123')
router.replace('/(auth)/login')   // Replace (tidak bisa back)
router.back()

// Membaca params
const { id } = useLocalSearchParams<{ id: string }>()
```

### Auth Guard / Proteksi Route

```typescript
// app/(protected)/_layout.tsx
import { Redirect, Slot } from 'expo-router'
import { useAuthStore } from '@stores/auth'

export default function ProtectedLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />
  }

  return <Slot />
}
```

---

## 5. State Management

Gunakan strategi berlapis sesuai kebutuhan:

| Lingkup | Solusi | Kapan Digunakan |
|---|---|---|
| **Local** | `useState` / `useReducer` | State dalam satu komponen |
| **Global** | Zustand | Auth, tema, keranjang belanja, dll |
| **Server** | TanStack Query | Data dari API, caching, refetch |
| **Persistent** | `expo-secure-store` | Token, kredensial sensitif |
| **Ringan** | `AsyncStorage` | Preferensi pengguna, pengaturan |

### Contoh Zustand Store

```typescript
// src/stores/authStore.ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface User {
  id: string
  name: string
  email: string
}

interface AuthStore {
  token: string | null
  user: User | null
  isAuthenticated: boolean
  setAuth: (token: string, user: User) => void
  logout: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      setAuth: (token, user) => set({ token, user, isAuthenticated: true }),
      logout: () => set({ token: null, user: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
```

### TanStack Query untuk Server State

```typescript
// src/hooks/useProducts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { productService } from '@services/productService'

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: productService.getAll,
    staleTime: 5 * 60 * 1000, // 5 menit
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: productService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}
```

---

## 6. Optimasi Performa

### Aturan Rendering

```typescript
// ✓ Gunakan React.memo untuk komponen yang sering di-render ulang
const ProductCard = React.memo(({ product }: Props) => {
  return <View>...</View>
})

// ✓ Gunakan useCallback untuk fungsi yang diteruskan sebagai props
const handlePress = useCallback((id: string) => {
  router.push(`/product/${id}`)
}, [])

// ✓ Gunakan useMemo untuk kalkulasi berat
const sortedItems = useMemo(
  () => items.sort((a, b) => a.price - b.price),
  [items]
)
```

### FlatList vs ScrollView

```typescript
// ✓ Gunakan FlatList untuk daftar panjang
<FlatList
  data={products}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => <ProductCard product={item} />}
  getItemLayout={(_, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  })}
  removeClippedSubviews={true}
  maxToRenderPerBatch={10}
  windowSize={5}
  initialNumToRender={8}
/>

// ✗ Hindari untuk daftar panjang
<ScrollView>
  {products.map((p) => <ProductCard key={p.id} product={p} />)}
</ScrollView>
```

### StyleSheet

```typescript
// ✓ Gunakan StyleSheet.create — objek di-cache, tidak dibuat ulang setiap render
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 18, fontWeight: '600' },
})

// ✗ Hindari inline style object
<View style={{ flex: 1, padding: 16 }}>  // dibuat ulang setiap render
```

### Animasi

```typescript
// ✓ Gunakan Reanimated — berjalan di UI thread, tidak memblokir JS
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated'

const scale = useSharedValue(1)
const animatedStyle = useAnimatedStyle(() => ({
  transform: [{ scale: scale.value }],
}))

const onPress = () => {
  scale.value = withSpring(0.95, {}, () => {
    scale.value = withSpring(1)
  })
}
```

### Konfigurasi Hermes (app.json)

```json
{
  "expo": {
    "jsEngine": "hermes"
  }
}
```

---

## 7. Styling & Tema

### Pendekatan dengan NativeWind (Tailwind untuk RN)

```typescript
// Instal: npm install nativewind tailwindcss
// tailwind.config.js sudah dikonfigurasi

import { View, Text } from 'react-native'

export default function Card() {
  return (
    <View className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <Text className="text-lg font-semibold text-gray-900">Judul</Text>
      <Text className="text-sm text-gray-500 mt-1">Deskripsi konten</Text>
    </View>
  )
}
```

### Dark Mode

```typescript
// src/hooks/useTheme.ts
import { useColorScheme } from 'react-native'

export function useTheme() {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'

  return {
    isDark,
    colors: {
      background: isDark ? '#0a0a0a' : '#ffffff',
      text: isDark ? '#f5f5f5' : '#111111',
      card: isDark ? '#1a1a1a' : '#f9f9f9',
      border: isDark ? '#2a2a2a' : '#e5e5e5',
      primary: '#3B82F6',
    },
  }
}
```

---

## 8. API Layer & Data Fetching

### Konfigurasi Axios Terpusat

```typescript
// src/services/api.ts
import axios from 'axios'
import { useAuthStore } from '@stores/authStore'

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

// Request interceptor — tambahkan token otomatis
api.interceptors.request.use(async (config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor — tangani error global
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
    }
    return Promise.reject(error)
  }
)

export default api
```

### Service Layer

```typescript
// src/services/productService.ts
import api from './api'
import type { Product } from '@types/product'

export const productService = {
  getAll: async (): Promise<Product[]> => {
    const { data } = await api.get('/products')
    return data
  },

  getById: async (id: string): Promise<Product> => {
    const { data } = await api.get(`/products/${id}`)
    return data
  },

  create: async (payload: Omit<Product, 'id'>): Promise<Product> => {
    const { data } = await api.post('/products', payload)
    return data
  },
}
```

### Validasi dengan Zod

```typescript
// src/types/product.ts
import { z } from 'zod'

export const ProductSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Nama wajib diisi'),
  price: z.number().positive('Harga harus lebih dari 0'),
  stock: z.number().int().nonnegative(),
})

export type Product = z.infer<typeof ProductSchema>
```

---

## 9. EAS Build & Deploy

### Setup Awal

```bash
npm install -g eas-cli
eas login
eas build:configure
```

### Konfigurasi eas.json

```json
{
  "cli": { "version": ">= 7.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": { "APP_VARIANT": "development" }
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" },
      "env": { "APP_VARIANT": "staging" }
    },
    "production": {
      "autoIncrement": true,
      "env": { "APP_VARIANT": "production" }
    }
  },
  "submit": {
    "production": {
      "android": { "serviceAccountKeyPath": "./service-account.json" },
      "ios": { "appleId": "email@example.com" }
    }
  }
}
```

### Konfigurasi Multi-Environment (app.config.ts)

```typescript
// app.config.ts
import type { ConfigContext, ExpoConfig } from 'expo/config'

const variants: Record<string, Partial<ExpoConfig>> = {
  development: {
    name: 'MyApp (Dev)',
    ios: { bundleIdentifier: 'com.myapp.dev' },
    android: { package: 'com.myapp.dev' },
  },
  staging: {
    name: 'MyApp (Staging)',
    ios: { bundleIdentifier: 'com.myapp.staging' },
    android: { package: 'com.myapp.staging' },
  },
  production: {
    name: 'MyApp',
    ios: { bundleIdentifier: 'com.myapp' },
    android: { package: 'com.myapp' },
  },
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const variant = process.env.APP_VARIANT ?? 'development'
  return {
    ...config,
    ...variants[variant],
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL,
      eas: { projectId: 'YOUR_PROJECT_ID' },
    },
  }
}
```

### Perintah Build

```bash
# Development build (untuk testing harian)
eas build --profile development --platform android

# Preview build (untuk QA & stakeholder)
eas build --profile preview --platform all

# Production build
eas build --profile production --platform all

# Submit ke store langsung setelah build
eas build --profile production --platform all --auto-submit
```

---

## 10. OTA Update

OTA (Over-the-Air) Update memungkinkan pengiriman perbaikan bug langsung ke perangkat pengguna tanpa melalui review App Store/Play Store. **Penting:** hanya berlaku untuk perubahan JavaScript dan assets — bukan perubahan native.

### Setup

```bash
npx expo install expo-updates
eas update:configure
```

### Mengirim Update

```bash
# Update ke channel production
eas update --channel production --message "Perbaikan bug login"

# Update ke channel staging (untuk QA dulu)
eas update --channel staging --message "Fitur baru: dark mode"
```

### Strategi Channel

| Channel | Tujuan |
|---|---|
| `development` | Tim developer, testing harian |
| `staging` | QA, review stakeholder |
| `production` | Pengguna nyata |

### Best Practices OTA

- Selalu test di channel `staging` sebelum push ke `production`
- Gunakan semantic versioning untuk melacak perubahan
- Manfaatkan gradual rollout untuk update besar
- Monitor crash rate setelah setiap OTA update
- Siapkan rollback plan jika update bermasalah

---

## 11. Keamanan

### Penyimpanan Data Sensitif

```typescript
// ✓ Gunakan expo-secure-store untuk token & data sensitif
import * as SecureStore from 'expo-secure-store'

export const secureStorage = {
  set: async (key: string, value: string) => {
    await SecureStore.setItemAsync(key, value)
  },
  get: async (key: string) => {
    return await SecureStore.getItemAsync(key)
  },
  delete: async (key: string) => {
    await SecureStore.deleteItemAsync(key)
  },
}

// ✗ Jangan simpan token di AsyncStorage biasa (tidak terenkripsi)
await AsyncStorage.setItem('token', accessToken) // BERBAHAYA
```

### Environment Variables

```bash
# .env (jangan commit ke Git!)
EXPO_PUBLIC_API_URL=https://api.example.com
EXPO_PUBLIC_APP_ENV=production

# Secret (hanya untuk EAS Build, tidak expose ke client)
API_SECRET_KEY=...
```

```typescript
// Akses di kode
const apiUrl = process.env.EXPO_PUBLIC_API_URL  // aman untuk client
// Variabel tanpa EXPO_PUBLIC_ tidak tersedia di client runtime
```

### Aturan Keamanan Umum

- Aktifkan SSL Pinning untuk request API kritis
- Validasi semua input user sebelum dikirim ke server (gunakan Zod)
- Jangan simpan data sensitif di `AsyncStorage` biasa
- Obfuscate kode production dengan ProGuard (Android)
- Aktifkan App Transport Security (iOS)

---

## 12. Kualitas Kode & Testing

### ESLint & Prettier

```bash
npm install --save-dev eslint prettier eslint-config-expo @typescript-eslint/eslint-plugin
```

```json
// .eslintrc.json
{
  "extends": ["expo", "prettier"],
  "plugins": ["@typescript-eslint"],
  "rules": {
    "no-console": "warn",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": "error"
  }
}
```

### Error Boundary

```typescript
// src/components/ui/ErrorBoundary.tsx
import React from 'react'
import { View, Text, Button } from 'react-native'

interface State { hasError: boolean }

export class ErrorBoundary extends React.Component<
  React.PropsWithChildren,
  State
> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    // Kirim ke Sentry atau crash reporting
    console.error('App error:', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text>Terjadi kesalahan. Silakan coba lagi.</Text>
          <Button
            title="Coba Lagi"
            onPress={() => this.setState({ hasError: false })}
          />
        </View>
      )
    }
    return this.props.children
  }
}
```

### Testing

```bash
npm install --save-dev jest @testing-library/react-native
```

```typescript
// src/components/ui/__tests__/Button.test.tsx
import { render, fireEvent } from '@testing-library/react-native'
import { Button } from '@components/ui/Button'

describe('Button', () => {
  it('memanggil onPress saat ditekan', () => {
    const onPress = jest.fn()
    const { getByText } = render(<Button title="Tekan" onPress={onPress} />)
    fireEvent.press(getByText('Tekan'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })
})
```

---

## 13. Aksesibilitas & UX

### Prop Aksesibilitas

```typescript
// ✓ Selalu tambahkan label aksesibilitas
<TouchableOpacity
  onPress={handleSubmit}
  accessibilityLabel="Tombol masuk ke akun"
  accessibilityRole="button"
  accessibilityState={{ disabled: isLoading }}
>
  <Text>Masuk</Text>
</TouchableOpacity>

<Image
  source={require('@assets/images/logo.png')}
  accessibilityLabel="Logo MyApp"
/>
```

### Keyboard Handling

```typescript
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native'

<KeyboardAvoidingView
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  style={{ flex: 1 }}
>
  <ScrollView keyboardShouldPersistTaps="handled">
    {/* Form fields */}
  </ScrollView>
</KeyboardAvoidingView>
```

### Loading Skeleton (Lebih Baik dari Spinner)

```typescript
// Gunakan skeleton untuk UX yang lebih mulus
import { MotiView } from 'moti/skeleton'

export function ProductSkeleton() {
  return (
    <MotiView
      from={{ opacity: 0.5 }}
      animate={{ opacity: 1 }}
      transition={{ loop: true, type: 'timing', duration: 800 }}
      style={{ height: 120, borderRadius: 12, backgroundColor: '#e0e0e0' }}
    />
  )
}
```

---

## 14. Package yang Direkomendasikan

### Wajib

| Package | Kegunaan |
|---|---|
| `expo-router` | Navigasi file-based |
| `expo-constants` | Akses konfigurasi & env vars |
| `expo-secure-store` | Penyimpanan data terenkripsi |
| `expo-font` | Custom font |
| `expo-image` | Optimasi gambar dengan caching |
| `react-native-reanimated` | Animasi performa tinggi |
| `react-native-gesture-handler` | Gesture handler native |
| `react-native-safe-area-context` | Safe area (notch, dll) |

### Sangat Disarankan

| Package | Kegunaan |
|---|---|
| `zustand` | Global state management ringan |
| `@tanstack/react-query` | Server state & caching |
| `zod` | Validasi schema TypeScript |
| `axios` | HTTP client |
| `nativewind` | Tailwind CSS untuk React Native |
| `@sentry/react-native` | Error monitoring production |
| `moti` | Animasi deklaratif berbasis Reanimated |

---

## 15. Production Checklist

### Sebelum Submit ke Store

- [ ] TypeScript aktif (`strict: true`) di seluruh proyek
- [ ] Hermes engine diaktifkan (`"jsEngine": "hermes"` di app.json)
- [ ] Semua environment variable dikonfigurasi via `EXPO_PUBLIC_*`
- [ ] EAS Build dikonfigurasi (development / staging / production)
- [ ] OTA Update channel sudah disetup
- [ ] Error monitoring terpasang (Sentry / Crashlytics)
- [ ] Splash screen & app icon sesuai guideline Apple & Google
- [ ] Semua permission dijelaskan di `app.json` (kamera, lokasi, notifikasi, dll)
- [ ] Diuji di perangkat fisik iOS dan Android (bukan hanya emulator)
- [ ] Dark mode berfungsi dengan benar
- [ ] Keyboard handling tidak menutupi input form
- [ ] Semua gambar dioptimasi dan menggunakan `expo-image`
- [ ] Tidak ada `console.log` yang tertinggal di kode production
- [ ] App store metadata, deskripsi, dan screenshot sudah disiapkan
- [ ] Privacy policy URL sudah ada (wajib untuk kedua store)
- [ ] Versi app (`version`) dan build number (`buildNumber`/`versionCode`) sudah benar

### Standar Kode

- [ ] ESLint tidak mengeluarkan error atau warning
- [ ] Semua komponen memiliki TypeScript types yang tepat
- [ ] Tidak ada penggunaan `any` yang tidak diperlukan
- [ ] Unit test untuk logika bisnis kritis sudah ada
- [ ] Error boundary terpasang di level screen

---

## Referensi

- [Dokumentasi Resmi Expo](https://docs.expo.dev)
- [Expo Router Docs](https://expo.github.io/router/docs)
- [EAS Build Docs](https://docs.expo.dev/build/introduction)
- [React Native Performance](https://reactnative.dev/docs/performance)
- [TanStack Query](https://tanstack.com/query/latest)
- [Zustand](https://zustand-demo.pmnd.rs)

---

*Dibuat dengan referensi dokumentasi Expo resmi dan best practices komunitas React Native — April 2026*