import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, SafeAreaView } from 'react-native';
import { useAuth } from '../hooks/AuthContext'; // Assumes AuthContext.tsx is in the same folder
import { useRouter } from 'expo-router';

export const Navbar: React.FC = () => {
  const auth = useAuth();
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
                {auth.isAuthenticated ? (
                    <>
                        <TouchableOpacity onPress={() => router.push('/studies')}>
                            <Text style={styles.navLink}>Studies</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => auth.logout()}>
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
    backgroundColor: '#f8fafc',
  },
  portalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15,23,42,0.04)',
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
    color: '#0f172a',
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  navLink: {
    color: '#0f172a',
    fontWeight: '600',
    fontSize: 16,
  },
  logoutBtn: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 15,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.06)',
    borderRadius: 8,
  },
});

export default Navbar;