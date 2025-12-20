import { Tabs, Redirect } from 'expo-router'; // 1. Import Redirect
import React from 'react';

// 2. Import Clerk's authentication hook
import { useAuth } from '@clerk/clerk-expo'; 

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const { isSignedIn, isLoaded } = useAuth(); // 3. Get authentication status
  const colorScheme = useColorScheme();

  // 4. Handle Loading and Unauthenticated State
  if (!isLoaded) {
    // Show a loading screen while Clerk initializes
    return null; 
  }

  if (!isSignedIn) {
    // Redirect unauthenticated users to the sign-in/public screen
    // Redirect to the login screen.
    return <Redirect href="/login" />; 
  }

  // 5. Render Tabs only if signed in
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        // Since you set display: "none", the authentication check 
        // will still ensure the user can't navigate here without signing in.
        tabBarStyle: { display: 'none' }, 
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="paperplane.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}