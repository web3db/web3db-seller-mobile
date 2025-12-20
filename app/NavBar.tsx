import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, SafeAreaView } from 'react-native';
import { Colors, palette } from '@/constants/theme';
import { useAuth, useUser } from '@clerk/clerk-expo'; // 1. Import Clerk's useAuth
import { useRouter } from 'expo-router';

export const Navbar: React.FC = () => {
  const { isSignedIn, signOut } = useAuth(); // 2. Use Clerk's auth state and signOut
  const router = useRouter();

  return (
    <SafeAreaView style={styles.headerSafeArea}>
        <View style={styles.portalHeader}>
            <TouchableOpacity onPress={() => router.push('/')} style={styles.brand}>
                <Image 
                    source={require('../assets/images/Web3Health.png')} // Make sure this path is correct
                    style={styles.brandLogo} 
                />
                <Text style={styles.brandText}>Web3Health</Text>
            </TouchableOpacity>
            <View style={styles.nav}>
                {isSignedIn ? (
                    <>
                        <TouchableOpacity onPress={() => router.push('/studies')}>
                            <Text style={styles.navLink}>Studies</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => router.push('/profile')}>
                            <Text style={styles.navLink}>Profile</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => signOut()}>
                            <Text style={styles.logoutBtn}>Log Out</Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    <>
                        <TouchableOpacity onPress={() => router.push('/login')}>
                            <Text style={styles.navLink}>Sign In</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => router.push('/register')}>
                            <Text style={styles.navLink}>Register</Text>
                        </TouchableOpacity>
                    </>
                )}
            </View>
        </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  headerSafeArea: {
    backgroundColor: palette.light.surface,
  },
  portalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: palette.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: palette.light.border,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandLogo: {
    width: 28,
    height: 28,
  },
  brandText: {
    fontWeight: '700',
    fontSize: 16,
    color: Colors.light.text,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  navLink: {
    color: Colors.light.text,
    fontWeight: '600',
    fontSize: 16,
  },
  logoutBtn: {
    color: Colors.light.text,
    fontWeight: '600',
    fontSize: 15,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: palette.light.border,
    borderRadius: 8,
  },
});

export default Navbar;