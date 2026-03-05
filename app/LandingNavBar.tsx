import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Platform, useWindowDimensions } from 'react-native';
import { Colors, palette } from '@/constants/theme';
import { useAuth } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export const LandingNavbar: React.FC = () => {
  const { isSignedIn, signOut } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [menuOpen, setMenuOpen] = useState(false);

  // Mobile breakpoint — same as the rest of the site's media queries
  const isMobile = width < 768;
  const close = () => setMenuOpen(false);

  // ─── Web branch ────────────────────────────────────────────────────────────
  if (Platform.OS === 'web') {
    return (
      <div style={webStyles.headerContainer}>
        {/* Pill navbar */}
        <div style={webStyles.portalHeader}>
          {isMobile ? (
            <>
              {/* Logo on left, bigger, clickable */}
              <div onClick={() => { close(); router.push('/'); }} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <Image
                  source={require('../assets/images/Web3Health.png')}
                  style={{ width: 48, height: 48 } as any}
                />
              </div>
              {/* Web3Health text centered */}
              <div style={webStyles.brandTextCentered} onClick={() => { close(); router.push('/'); }}>
                <span style={webStyles.webText}>Web3</span>
                <span style={{ ...webStyles.healthText, marginLeft: 3 }}>Health</span>
              </div>
              {/* Hamburger */}
              <button style={webStyles.hamburger} onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
                <Ionicons name={menuOpen ? 'close' : 'menu'} size={26} color="#1a1a1a" />
              </button>
            </>
          ) : (
            <>
              {/* Desktop: brand left, nav right */}
              <div style={webStyles.brand} onClick={() => { close(); router.push('/'); }}>
                <Image
                  source={require('../assets/images/Web3Health.png')}
                  style={styles.brandLogo}
                />
                <span style={webStyles.webText}>Web3 </span>
                <span style={webStyles.healthText}> Health</span>
              </div>
              <div style={webStyles.nav}>
                <span style={webStyles.navLink} onClick={() => router.push('/about')}>About Us</span>
                <span style={webStyles.navLink} onClick={() => router.push('/services')}>How It Works</span>
                {isSignedIn ? (
                  <>
                    <span style={webStyles.navLink} onClick={() => router.push('/studies')}>Studies</span>
                    <span style={webStyles.navLink} onClick={() => router.push('/profile')}>Profile</span>
                    <span style={webStyles.logoutBtn} onClick={() => signOut()}>Log Out</span>
                  </>
                ) : (
                  <>
                    <span style={webStyles.loginButton} onClick={() => router.push('/login')}>Sign In</span>
                    <span style={webStyles.registerButton} onClick={() => router.push('/register')}>Register</span>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* Mobile: frosted-glass dropdown — same look as the pill */}
        {isMobile && menuOpen && (
          <div style={webStyles.mobileMenu}>
            <span style={webStyles.mobileLink} onClick={() => { close(); router.push('/about'); }}>About Us</span>
            <span style={webStyles.mobileLink} onClick={() => { close(); router.push('/services'); }}>How It Works</span>
            {isSignedIn ? (
              <>
                <span style={webStyles.mobileLink} onClick={() => { close(); router.push('/studies'); }}>Studies</span>
                <span style={webStyles.mobileLink} onClick={() => { close(); router.push('/profile'); }}>Profile</span>
                <span style={webStyles.mobileLink} onClick={() => { close(); signOut(); }}>Log Out</span>
              </>
            ) : (
              <>
                <span style={webStyles.mobileLoginBtn} onClick={() => { close(); router.push('/login'); }}>Sign In</span>
                <span style={webStyles.mobileRegisterBtn} onClick={() => { close(); router.push('/register'); }}>Register</span>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  // ─── Native (Expo Go) branch ───────────────────────────────────────────────
  return (
    <View style={styles.headerContainer}>
      <View style={styles.portalHeader}>
        <TouchableOpacity onPress={() => router.push('/')} style={styles.brand}>
          <Image source={require('../assets/images/Web3Health.png')} style={styles.brandLogo} />
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

// ─── Web styles ──────────────────────────────────────────────────────────────
const webStyles: Record<string, React.CSSProperties> = {
  headerContainer: {
    position: 'fixed',
    top: 0,
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
  brandTextCentered: {
    flex: 1,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  webText: {
    fontWeight: '700',
    fontSize: 20,
    color: '#1a1a1a',
    fontFamily: 'Barlow, sans-serif',
  },
  healthText: {
    marginLeft: -7,
    fontWeight: '700',
    fontSize: 20,
    color: Colors.light.text,
    fontFamily: 'Barlow, sans-serif',
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
    fontFamily: 'Barlow, sans-serif',
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
    fontFamily: 'Barlow, sans-serif',
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
    fontFamily: 'Barlow, sans-serif',
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
    fontFamily: 'Barlow, sans-serif',
  },
  hamburger: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Dropdown: same frosted glass as the pill
  mobileMenu: {
    marginTop: 8,
    marginLeft: 16,
    marginRight: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.8)',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
    padding: 8,
    display: 'flex',
    flexDirection: 'column',
  },
  mobileLink: {
    color: Colors.light.text,
    fontWeight: '600',
    fontSize: 16,
    cursor: 'pointer',
    fontFamily: 'Barlow, sans-serif',
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: 12,
    borderBottom: `1px solid ${palette.light.border}`,
    display: 'block',
  },
  mobileLoginBtn: {
    display: 'block',
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: '600',
    fontSize: 16,
    backgroundColor: '#B22222',
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: 12,
    paddingRight: 12,
    borderRadius: 8,
    cursor: 'pointer',
    fontFamily: 'Barlow, sans-serif',
    marginTop: 8,
    textAlign: 'center' as const,
  },
  mobileRegisterBtn: {
    display: 'block',
    color: Colors.light.text,
    fontWeight: '600',
    fontSize: 16,
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: 12,
    paddingRight: 12,
    borderRadius: 8,
    cursor: 'pointer',
    fontFamily: 'Barlow, sans-serif',
    marginTop: 6,
    marginBottom: 4,
    textAlign: 'center' as const,
    border: `1px solid ${palette.light.border}`,
  },
};

// ─── Native styles ───────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: palette.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: palette.light.border,
  },
  portalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
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
    fontSize: 15,
    color: Colors.light.text,
    fontFamily: 'Barlow',
  },
  Web: {
    fontWeight: '700',
    fontSize: 15,
    color: Colors.light.text,
    fontFamily: 'Barlow',
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  navLink: {
    color: Colors.light.text,
    fontWeight: '600',
    fontSize: 13,
    fontFamily: 'Barlow',
  },
  loginButton: {
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: '600',
    fontSize: 13,
    backgroundColor: '#B22222',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    fontFamily: 'Barlow',
  },
  logoutBtn: {
    color: Colors.light.text,
    fontWeight: '600',
    fontSize: 13,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: palette.light.border,
    borderRadius: 8,
    fontFamily: 'Barlow',
  },
});

export default LandingNavbar;
