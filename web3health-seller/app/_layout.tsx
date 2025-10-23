import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import React from 'react';
import Navbar from './NavBar';
import { AuthProvider } from '@/hooks/AuthContext';

// Suppress all warnings and logs in the app
LogBox.ignoreAllLogs();

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <SafeAreaView style={{ flex: 1 }}>
          <Navbar />
          <Stack screenOptions={{ headerShown: false }} />
        </SafeAreaView>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );
}
