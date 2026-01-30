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
                <Text style={styles.Web}>Web3</Text>
                <Text style={styles.Health}>Health</Text>
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
                            <Text style={[styles.loginButton, { backgroundColor: '#B22222',color: 'rgba(255, 255, 255, 0.85)', }]}>Sign In</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => router.push('/register')}>
                            <Text style={[styles.loginButton, { backgroundColor: 'white' }]}>Register</Text>
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
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandLogo: {
    width: 35,
    height: 35,
  },
  Health: {
    marginLeft: -7,
    fontWeight: '700',
    fontSize: 16,
    color: Colors.light.text,
  },
  Web: {
    fontWeight: '700',
    fontSize: 16,
    color: '#B22222',
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
  loginButton: {
    fontWeight: '600',
    fontSize: 16, 
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
    paddingHorizontal: 10,
    paddingVertical:10,
    borderRadius: 10,

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