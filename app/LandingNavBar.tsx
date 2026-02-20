import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Platform } from 'react-native';
import { Colors, palette } from '@/constants/theme';
import { useAuth } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';

export const LandingNavbar: React.FC = () => {
  const { isSignedIn, signOut } = useAuth();
  const router = useRouter();

  if (Platform.OS === 'web') {
    return (
      <div style={webStyles.headerContainer}>
        <div style={webStyles.portalHeader}>
          <div style={webStyles.brand} onClick={() => router.push('/')}>
            <Image
              source={require('../assets/images/Web3Health.png')}
              style={styles.brandLogo}
            />
            <span style={webStyles.webText}>Web3</span>
            <span style={webStyles.healthText}>Health</span>
          </div>
          <div style={webStyles.nav}>
            <span style={webStyles.navLink} onClick={() => router.push('/about')}>
              About Us
            </span>
            <span style={webStyles.navLink} onClick={() => router.push('/services')}>
              How It Works
            </span>
            {isSignedIn ? (
              <>
                <span style={webStyles.navLink} onClick={() => router.push('/studies')}>
                  Studies
                </span>
                <span style={webStyles.navLink} onClick={() => router.push('/profile')}>
                  Profile
                </span>
                <span style={webStyles.logoutBtn} onClick={() => signOut()}>
                  Log Out
                </span>
              </>
            ) : (
              <>
                <span style={webStyles.loginButton} onClick={() => router.push('/login')}>
                  Sign In
                </span>
                <span style={webStyles.registerButton} onClick={() => router.push('/register')}>
                  Register
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Fallback for native platforms
  return (
    <View style={styles.headerContainer}>
      <View style={styles.portalHeader}>
        <TouchableOpacity onPress={() => router.push('/')} style={styles.brand}>
          <Image
            source={require('../assets/images/Web3Health.png')}
            style={styles.brandLogo}
          />
          <Text style={styles.Web}>Web3</Text>
          <Text style={styles.Health}>Health</Text>
        </TouchableOpacity>
        <View style={styles.nav}>
          <TouchableOpacity onPress={() => router.push('/about')}>
            <Text style={styles.navLink}>About Us</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/services')}>
            <Text style={styles.navLink}>How It Works</Text>
          </TouchableOpacity>
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
                <Text style={styles.loginButton}>Sign In</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/register')}>
                <Text style={styles.navLink}>Register</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </View>
  );
};

// Web-specific styles - fixed transparent navbar
const webStyles: Record<string, React.CSSProperties> = {
  headerContainer: {
    position: 'fixed',
    top: 10,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingLeft: 16,
    paddingRight: 16,
  },
  portalHeader: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 12,
    paddingBottom: 12,
    marginLeft: 16,
    marginRight: 16,
    borderRadius: 12,
    // Frosted glass effect - blur content behind
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.8)',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
  },
  brand: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    cursor: 'pointer',
  },
  webText: {
    fontWeight: '700',
    fontSize: 20,
    color: '#1a1a1a',
    fontFamily: "Barlow, sans-serif",
  },
  healthText: {
    marginLeft: -7,
    fontWeight: '700',
    fontSize: 20,
    color: Colors.light.text,
    fontFamily: "Barlow, sans-serif",
  },
  nav: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  navLink: {
    color: Colors.light.text,
    fontWeight: '600',
    fontSize: 16,
    cursor: 'pointer',
    fontFamily: "Barlow, sans-serif",
  },
  loginButton: {
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: '600',
    fontSize: 16,
    backgroundColor: '#B22222',
    paddingLeft: 10,
    paddingRight: 10,
    paddingTop: 10,
    paddingBottom: 10,
    borderRadius: 10,
    cursor: 'pointer',
    fontFamily: "Barlow, sans-serif",
  },
  registerButton: {
    color: Colors.light.text,
    fontWeight: '600',
    fontSize: 16,
    backgroundColor: 'white',
    paddingLeft: 10,
    paddingRight: 10,
    paddingTop: 10,
    paddingBottom: 10,
    borderRadius: 10,
    cursor: 'pointer',
    fontFamily: "Barlow, sans-serif",
  },
  logoutBtn: {
    color: Colors.light.text,
    fontWeight: '600',
    fontSize: 15,
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 10,
    paddingRight: 10,
    border: `1px solid ${palette.light.border}`,
    borderRadius: 8,
    cursor: 'pointer',
    fontFamily: "Barlow, sans-serif",
  },
};

// React Native styles (fallback) - transparent navbar
const styles = StyleSheet.create({
  headerContainer: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingHorizontal: 16,
  },
  portalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    backgroundColor: 'transparent',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandLogo: {
    width: 40,
    height: 40,
  },
  Health: {
    marginLeft: -7,
    fontWeight: '700',
    fontSize: 16,
    color: Colors.light.text,
    fontFamily: 'Barlow',
  },
  Web: {
    fontWeight: '700',
    fontSize: 16,
    color: Colors.light.text, // Make #B22222 later
    fontFamily: 'Barlow',
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
    fontFamily: 'Barlow',
  },
  loginButton: {
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: '600',
    fontSize: 16,
    backgroundColor: '#B22222',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 10,
    fontFamily: 'Barlow',
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
    fontFamily: 'Barlow',
  },
});

export default LandingNavbar;
