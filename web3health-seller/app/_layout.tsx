import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, StyleSheet, SafeAreaView, Platform } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { palette } from '@/constants/theme';
import React, { useEffect } from 'react';

import Navbar from './NavBar'; // Import the Navbar

import { AuthProvider } from '@/hooks/AuthContext';

// 🔑 CLERK IMPORTS
import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import { tokenCache } from '@clerk/clerk-expo/token-cache';

// ⚠️ IMPORTANT: Get your Clerk Publishable Key from your .env file
const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
console.log("Clerk Publishable Key:", CLERK_PUBLISHABLE_KEY); // Debugging line

export default function RootLayout() {
  return (
    // 🔑 CLERKProvider WRAPPER
    // This is now the top-level component and will not re-render.
    <ClerkProvider 
      publishableKey={CLERK_PUBLISHABLE_KEY!} 
      tokenCache={Platform.OS !== 'web' ? tokenCache : undefined}
    >
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ClerkProvider>
  );
}

function AppContent() {
  const colorScheme = useColorScheme();
  const { isLoaded, isSignedIn } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  if (!isLoaded) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" /></View>;
  }

  // Protect routes: if Clerk says not signed in, redirect to /login for any
  // path except the public landing page and the login/register pages.
  // `segments` is empty for the root landing page.
  const first = segments[0];
  const isPublicLanding = !first; // root
  const isAuthPage = first === 'login' || first === 'register' || first === 'verify';

  if (!isSignedIn && !isPublicLanding && !isAuthPage) {
    // Use replace to avoid back navigation to protected page
    router.replace('/login');
    return null;
  }

  // Ensure the publishable key is available before rendering
  if (!CLERK_PUBLISHABLE_KEY) {
    throw new Error('Missing Clerk Publishable Key in .env file.');
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <SafeAreaView style={styles.container}>
        <StatusBar style="auto" />
        <View style={{ flex: 1 }}>
          <Navbar />
          <Stack screenOptions={{ headerShown: false }} />
        </View>
      </SafeAreaView>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.light.surface, // Match Navbar background
  },
});