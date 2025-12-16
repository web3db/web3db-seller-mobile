import React, { useState, useCallback } from 'react';
import { Colors, palette } from '@/constants/theme';
import {

  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import { useFocusEffect, useRouter } from 'expo-router';
import { getUserProfileByClerkId, getUserDetail } from './services/users/api'; // Corrected import path
import type { User } from './services/users/types'; // Corrected import path
import { useAuth as localAuth } from '@/hooks/AuthContext';

const ProfileScreen: React.FC = () => {
  const { user: clerkUser, isLoaded } = useUser();
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = localAuth();

  useFocusEffect(
    useCallback(() => {
      const loadUserProfile = async () => {
        if (!isLoaded || !clerkUser) {
          return; // Wait for Clerk user to be loaded
        }

        setIsLoading(true);
        setError(null);
        console.log("Loading user profile for Clerk ID:", clerkUser.id);
        try {
          const profile = await getUserDetail(user?.id ? Number(user.id) : -1);
          setUserProfile(profile);
        } catch (e: any) {
          console.error("Failed to load user profile:", e);
          setError(`Failed to load profile: ${e.message || 'Unknown error'}`);
        } finally {
          setIsLoading(false);
        }
      };

      loadUserProfile();
    }, [isLoaded, clerkUser])
  );

  const renderProfileDetail = (label: string, value: string | number | null | undefined) => (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value || 'Not set'}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>My Profile</Text>

        {isLoading ? (
          <ActivityIndicator size="large" color={Colors.light.tint} style={{ marginTop: 20 }} />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : userProfile ? (
          <View style={styles.profileCard}>
            {renderProfileDetail('Name', userProfile.name)}
            {renderProfileDetail('Email', userProfile.email)}
            {renderProfileDetail('Role', userProfile.roleName)}
          </View>
        ) : (
          <Text style={styles.errorText}>No profile data found in the database for your account.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.light.surface,
  },
  container: {
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 24,
  },
  profileCard: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 20,
    shadowColor: Colors.light.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: palette.light.muted,
  },
  detailLabel: {
    fontSize: 16,
    color: palette.light.text.secondary,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 16,
    color: Colors.light.text,
    fontWeight: '600',
  },
  errorText: {
    textAlign: 'center',
    padding: 20,
    fontSize: 16,
    color: palette.light.danger,
    fontWeight: 'bold',
  },
});

export default ProfileScreen;