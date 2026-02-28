import React from 'react';
import { View, Text, ScrollView, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';

// ── Web Styles ──────────────────────────────────────────────

const webStyles: Record<string, React.CSSProperties> = {
  pageContainer: {
    minHeight: '100vh',
    backgroundColor: '#FFFFFF',
    overflowX: 'hidden',
    overflowY: 'auto',
    paddingTop: 80,
  },
  heroSection: {
    paddingLeft: 80,
    paddingRight: 80,
    paddingTop: 60,
    paddingBottom: 48,
    backgroundColor: '#F9F9FB',
    borderBottom: '1px solid #E6E6E6',
  },
  heroTitle: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 'clamp(36px, 4vw, 48px)' as any,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
    textAlign: 'center',
  },
  heroMeta: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 14,
    fontWeight: '400',
    color: '#888888',
    textAlign: 'center',
  },
  contentWrapper: {
    maxWidth: 860,
    margin: '0 auto',
    paddingLeft: 80,
    paddingRight: 80,
    paddingTop: 64,
    paddingBottom: 80,
  },
  section: {
    marginBottom: 48,
  },
  sectionTitle: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottom: '2px solid rgba(178, 34, 34, 0.15)',
  },
  paragraph: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 15,
    fontWeight: '400',
    color: '#444444',
    lineHeight: 1.75,
    marginBottom: 12,
  },
  bulletList: {
    paddingLeft: 20,
    margin: '8px 0 12px 0',
  },
  bulletItem: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 15,
    fontWeight: '400',
    color: '#444444',
    lineHeight: 1.75,
    marginBottom: 6,
    listStyleType: 'disc',
  },
  summaryBox: {
    backgroundColor: 'rgba(178, 34, 34, 0.04)',
    borderLeft: '4px solid #B22222',
    borderRadius: '0 12px 12px 0',
    padding: 24,
    marginBottom: 12,
  },
  summaryItem: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 15,
    fontWeight: '400',
    color: '#444444',
    lineHeight: 1.75,
    marginBottom: 6,
    listStyleType: 'disc',
  },
  contactLink: {
    color: '#B22222',
    fontFamily: 'Barlow, sans-serif',
    fontSize: 15,
    fontWeight: '600',
    textDecoration: 'none',
  },
  footer: {
    backgroundColor: '#2D2D2D',
    paddingTop: 48,
    paddingBottom: 32,
    paddingLeft: 80,
    paddingRight: 80,
  },
  footerContent: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 48,
    flexWrap: 'wrap',
    maxWidth: 1200,
    margin: '0 auto',
  },
  footerBrand: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    minWidth: 200,
  },
  footerBrandName: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerBrandWeb: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 20,
    fontWeight: '700',
    color: '#B22222',
  },
  footerBrandHealth: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: -6,
  },
  footerBrandTagline: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 13,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.5)',
    lineHeight: 1.5,
    maxWidth: 260,
  },
  footerLinks: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    minWidth: 140,
  },
  footerLinksTitle: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
    marginBottom: 4,
  },
  footerLink: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.6)',
    cursor: 'pointer',
    textDecoration: 'none',
  },
  footerLegal: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    minWidth: 180,
    alignItems: 'flex-end',
  },
  footerLegalTitle: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
    marginBottom: 4,
  },
  footerLegalLink: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.6)',
    cursor: 'pointer',
    textDecoration: 'none',
  },
  footerDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    margin: '32px auto 24px auto',
    maxWidth: 1200,
  },
  footerBottom: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    maxWidth: 1200,
    margin: '0 auto',
  },
  footerCopyright: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 13,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.4)',
  },
  footerMaintained: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 13,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.4)',
  },
};

// ── Footer ──────────────────────────────────────────────────

function Footer() {
  const router = useRouter();
  return (
    <footer style={webStyles.footer}>
      <style>{`.tos-footer-link:hover { color: rgba(255, 255, 255, 0.9) !important; }`}</style>
      <div style={webStyles.footerContent}>
        <div style={webStyles.footerBrand}>
          <div style={webStyles.footerBrandName}>
            <span style={webStyles.footerBrandWeb}>Web3</span>
            <span style={webStyles.footerBrandHealth}>Health</span>
          </div>
          <span style={webStyles.footerBrandTagline}>
            Accelerating health research with consented, anonymized activity data.
          </span>
        </div>

        <div style={webStyles.footerLinks}>
          <span style={webStyles.footerLinksTitle}>Navigate</span>
          <span className="tos-footer-link" style={webStyles.footerLink} onClick={() => router.push('/about')}>
            About Us
          </span>
          <span className="tos-footer-link" style={webStyles.footerLink} onClick={() => router.push('/services' as any)}>
            How It Works
          </span>
          <a className="tos-footer-link" style={webStyles.footerLink} href="https://www.uga.edu" target="_blank" rel="noopener noreferrer">
            University of Georgia
          </a>
          <a className="tos-footer-link" style={webStyles.footerLink} href="mailto:engr-sensorweb@uga.edu">
            Contact
          </a>
        </div>

        <div style={webStyles.footerLegal}>
          <span style={webStyles.footerLegalTitle}>Legal</span>
          <span
            className="tos-footer-link"
            style={webStyles.footerLegalLink}
            onClick={() => router.push('/privacy-policy')}
          >
            Privacy Policy
          </span>
          <span className="tos-footer-link" style={{ ...webStyles.footerLegalLink, color: 'rgba(178, 34, 34, 0.8)' }}>
            Terms of Service
          </span>
        </div>
      </div>

      <div style={webStyles.footerDivider} />

      <div style={webStyles.footerBottom}>
        <span style={webStyles.footerCopyright}>
          &copy; {new Date().getFullYear()} Web3Health. All rights reserved.
        </span>
        <span style={webStyles.footerMaintained}>
          Website Maintained by UGA CCPS development team
        </span>
      </div>
    </footer>
  );
}

// ── Main Component ──────────────────────────────────────────

export default function TermsOfService() {
  if (Platform.OS === 'web') {
    return (
      <div style={webStyles.pageContainer}>
        <style>{`
          @media (max-width: 900px) {
            .tos-content { padding-left: 32px !important; padding-right: 32px !important; }
            .tos-hero    { padding-left: 32px !important; padding-right: 32px !important; }
            .tos-footer  { padding-left: 32px !important; padding-right: 32px !important; }
          }
          @media (max-width: 600px) {
            .tos-content { padding-left: 20px !important; padding-right: 20px !important; }
            .tos-hero    { padding-left: 20px !important; padding-right: 20px !important; }
            .tos-footer  { padding-left: 20px !important; padding-right: 20px !important; }
          }
        `}</style>

        {/* Hero */}
        <div className="tos-hero" style={webStyles.heroSection}>
          <h1 style={webStyles.heroTitle}>Terms &amp; Conditions</h1>
          <p style={webStyles.heroMeta}>Last updated: 2025-12-17</p>
        </div>

        {/* Content */}
        <div className="tos-content" style={webStyles.contentWrapper}>

          {/* Research Project Disclosure */}
          <div style={webStyles.section}>
            <h2 style={webStyles.sectionTitle}>Research Project Disclosure</h2>
            <div style={webStyles.summaryBox}>
              <p style={{ ...webStyles.summaryItem, listStyleType: 'none', marginBottom: 0 } as any}>
                Web3Health is a research-driven mobile application under active development by the UGA SensorWeb Lab.
                By using the app, you acknowledge that the app may collect account information, health data you
                authorize, and app diagnostics as described in the Privacy Policy, subject to your consent and settings.
              </p>
            </div>
          </div>

          {/* Acceptance of Terms */}
          <div style={webStyles.section}>
            <h2 style={webStyles.sectionTitle}>Acceptance of Terms</h2>
            <p style={webStyles.paragraph}>
              By accessing or using Web3Health you agree to these Terms. If you do not agree, do not use the app.
            </p>
          </div>

          {/* Eligibility & Usage */}
          <div style={webStyles.section}>
            <h2 style={webStyles.sectionTitle}>Eligibility &amp; Usage</h2>
            <ul style={webStyles.bulletList}>
              <li style={webStyles.bulletItem}>You are responsible for maintaining the confidentiality of your account.</li>
              <li style={webStyles.bulletItem}>You agree to use the app only for lawful purposes and in accordance with research or partner program rules you opt into.</li>
            </ul>
          </div>

          {/* Health Data */}
          <div style={webStyles.section}>
            <h2 style={webStyles.sectionTitle}>Health Data</h2>
            <ul style={webStyles.bulletList}>
              <li style={webStyles.bulletItem}>You control which health metrics are accessed and shared.</li>
              <li style={webStyles.bulletItem}>You can pause or cancel sharing at any time.</li>
              <li style={webStyles.bulletItem}>Partners and studies you opt into may have additional terms.</li>
            </ul>
          </div>

          {/* Third-Party Services */}
          <div style={webStyles.section}>
            <h2 style={webStyles.sectionTitle}>Third-Party Services</h2>
            <p style={webStyles.paragraph}>
              The app relies on third-party services to provide core functionality (for example authentication and
              backend services). Your use of the app is also subject to the Privacy Policy, which describes how
              these service providers process data on our behalf.
            </p>
          </div>

          {/* Termination */}
          <div style={webStyles.section}>
            <h2 style={webStyles.sectionTitle}>Termination</h2>
            <p style={webStyles.paragraph}>
              We may suspend or terminate access to the app if we believe the Terms are violated or if necessary
              to protect users, the service, or comply with law.
            </p>
          </div>

          {/* Disclaimer */}
          <div style={webStyles.section}>
            <h2 style={webStyles.sectionTitle}>Disclaimer</h2>
            <p style={webStyles.paragraph}>
              The app does not provide medical advice. Content is for informational and research purposes only.
            </p>
          </div>

          {/* Limitation of Liability */}
          <div style={webStyles.section}>
            <h2 style={webStyles.sectionTitle}>Limitation of Liability</h2>
            <p style={webStyles.paragraph}>
              To the maximum extent permitted by law, Web3Health and UGA SensorWeb Lab are not liable for indirect
              or consequential damages arising from your use of the app.
            </p>
          </div>

          {/* Changes */}
          <div style={webStyles.section}>
            <h2 style={webStyles.sectionTitle}>Changes</h2>
            <p style={webStyles.paragraph}>
              We may modify these Terms. Continued use constitutes acceptance of the updated Terms.
            </p>
          </div>

          {/* Contact */}
          <div style={webStyles.section}>
            <h2 style={webStyles.sectionTitle}>Contact</h2>
            <p style={webStyles.paragraph}>
              Email:{' '}
              <a href="mailto:engr-sensorweb@uga.edu" style={webStyles.contactLink}>engr-sensorweb@uga.edu</a>
            </p>
          </div>

        </div>

        {/* Footer */}
        <Footer />
      </div>
    );
  }

  // ── Native Fallback ─────────────────────────────────────────
  return (
    <ScrollView style={nativeStyles.container} contentContainerStyle={nativeStyles.scrollContent}>
      <Text style={nativeStyles.title}>Terms &amp; Conditions</Text>
      <Text style={nativeStyles.meta}>Last updated: 2025-12-17</Text>

      <Text style={nativeStyles.heading}>Research Project Disclosure</Text>
      <Text style={nativeStyles.body}>
        Web3Health is a research-driven mobile application under active development by the UGA SensorWeb Lab.
        By using the app, you acknowledge that the app may collect account information, health data you authorize,
        and app diagnostics as described in the Privacy Policy, subject to your consent and settings.
      </Text>

      <Text style={nativeStyles.heading}>Acceptance of Terms</Text>
      <Text style={nativeStyles.body}>
        By accessing or using Web3Health you agree to these Terms. If you do not agree, do not use the app.
      </Text>

      <Text style={nativeStyles.heading}>Eligibility &amp; Usage</Text>
      <Text style={nativeStyles.body}>
        • You are responsible for maintaining the confidentiality of your account.{'\n'}
        • You agree to use the app only for lawful purposes and in accordance with research or partner program rules you opt into.
      </Text>

      <Text style={nativeStyles.heading}>Health Data</Text>
      <Text style={nativeStyles.body}>
        • You control which health metrics are accessed and shared.{'\n'}
        • You can pause or cancel sharing at any time.{'\n'}
        • Partners and studies you opt into may have additional terms.
      </Text>

      <Text style={nativeStyles.heading}>Third-Party Services</Text>
      <Text style={nativeStyles.body}>
        The app relies on third-party services to provide core functionality (for example authentication and backend
        services). Your use of the app is also subject to the Privacy Policy, which describes how these service
        providers process data on our behalf.
      </Text>

      <Text style={nativeStyles.heading}>Termination</Text>
      <Text style={nativeStyles.body}>
        We may suspend or terminate access to the app if we believe the Terms are violated or if necessary to
        protect users, the service, or comply with law.
      </Text>

      <Text style={nativeStyles.heading}>Disclaimer</Text>
      <Text style={nativeStyles.body}>
        The app does not provide medical advice. Content is for informational and research purposes only.
      </Text>

      <Text style={nativeStyles.heading}>Limitation of Liability</Text>
      <Text style={nativeStyles.body}>
        To the maximum extent permitted by law, Web3Health and UGA SensorWeb Lab are not liable for indirect or
        consequential damages arising from your use of the app.
      </Text>

      <Text style={nativeStyles.heading}>Changes</Text>
      <Text style={nativeStyles.body}>
        We may modify these Terms. Continued use constitutes acceptance of the updated Terms.
      </Text>

      <Text style={nativeStyles.heading}>Contact</Text>
      <Text style={nativeStyles.body}>engr-sensorweb@uga.edu</Text>
    </ScrollView>
  );
}

const nativeStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
    textAlign: 'center',
  },
  meta: {
    fontSize: 13,
    color: '#888888',
    textAlign: 'center',
    marginBottom: 32,
  },
  heading: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
    marginTop: 24,
  },
  body: {
    fontSize: 14,
    color: '#444444',
    lineHeight: 22,
    marginBottom: 8,
  },
});
