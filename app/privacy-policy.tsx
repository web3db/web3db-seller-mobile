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
  subTitle: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
    marginTop: 20,
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
      <style>{`.pp-footer-link:hover { color: rgba(255, 255, 255, 0.9) !important; }`}</style>
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
          <span className="pp-footer-link" style={webStyles.footerLink} onClick={() => router.push('/about')}>
            About Us
          </span>
          <span className="pp-footer-link" style={webStyles.footerLink} onClick={() => router.push('/services' as any)}>
            How It Works
          </span>
          <a className="pp-footer-link" style={webStyles.footerLink} href="https://www.uga.edu" target="_blank" rel="noopener noreferrer">
            University of Georgia
          </a>
          <a className="pp-footer-link" style={webStyles.footerLink} href="mailto:engr-sensorweb@uga.edu">
            Contact
          </a>
        </div>

        <div style={webStyles.footerLegal}>
          <span style={webStyles.footerLegalTitle}>Legal</span>
          <span className="pp-footer-link" style={{ ...webStyles.footerLegalLink, color: 'rgba(178, 34, 34, 0.8)' }}>
            Privacy Policy
          </span>
          <span className="pp-footer-link" style={webStyles.footerLegalLink}>Terms of Service</span>
        </div>
      </div>

      <div style={webStyles.footerDivider} />

      <div style={webStyles.footerBottom}>
        <span style={webStyles.footerCopyright}>
          &copy; {new Date().getFullYear()} Web3Health. All rights reserved.
        </span>
        <span style={webStyles.footerMaintained}>
          Website maintained by Web3 development team
        </span>
      </div>
    </footer>
  );
}

// ── Main Component ──────────────────────────────────────────

export default function PrivacyPolicy() {
  if (Platform.OS === 'web') {
    return (
      <div style={webStyles.pageContainer}>
        <style>{`
          @media (max-width: 900px) {
            .pp-content { padding-left: 32px !important; padding-right: 32px !important; }
            .pp-hero    { padding-left: 32px !important; padding-right: 32px !important; }
            .pp-footer  { padding-left: 32px !important; padding-right: 32px !important; }
          }
          @media (max-width: 600px) {
            .pp-content { padding-left: 20px !important; padding-right: 20px !important; }
            .pp-hero    { padding-left: 20px !important; padding-right: 20px !important; }
            .pp-footer  { padding-left: 20px !important; padding-right: 20px !important; }
          }
        `}</style>

        {/* Hero */}
        <div className="pp-hero" style={webStyles.heroSection}>
          <h1 style={webStyles.heroTitle}>Privacy Policy</h1>
          <p style={webStyles.heroMeta}>Last updated: 2025-12-17</p>
        </div>

        {/* Content */}
        <div className="pp-content" style={webStyles.contentWrapper}>

          {/* Who we are */}
          <div style={webStyles.section}>
            <h2 style={webStyles.sectionTitle}>Who We Are</h2>
            <p style={webStyles.paragraph}>
              Web3Health is developed as part of academic research at the University of Georgia SensorWeb Lab.
              This policy explains what information the app collects, how it is used, and your choices.
            </p>
          </div>

          {/* Summary */}
          <div style={webStyles.section}>
            <h2 style={webStyles.sectionTitle}>Summary</h2>
            <div style={webStyles.summaryBox}>
              <ul style={webStyles.bulletList}>
                <li style={webStyles.summaryItem}>We collect account information and the health data types you explicitly authorize on your device.</li>
                <li style={webStyles.summaryItem}>We use that data to show you dashboards and to run sharing features you choose to use.</li>
                <li style={webStyles.summaryItem}>We do not sell your personal information.</li>
                <li style={webStyles.summaryItem}>You can revoke permissions and request export or deletion by email.</li>
              </ul>
            </div>
          </div>

          {/* Information we collect */}
          <div style={webStyles.section}>
            <h2 style={webStyles.sectionTitle}>Information We Collect</h2>

            <p style={webStyles.subTitle}>1) Account and profile information</p>
            <ul style={webStyles.bulletList}>
              <li style={webStyles.bulletItem}>Email address and basic account identifiers required for sign-in and account management.</li>
              <li style={webStyles.bulletItem}>Optional profile fields you choose to provide (for example, a display name).</li>
            </ul>

            <p style={webStyles.subTitle}>2) Health data (only with your permission)</p>
            <p style={webStyles.paragraph}>
              The app reads health metrics from your device only after you grant permission. If you do not grant
              permission, health dashboards may be empty and sharing features may not work.
            </p>
            <ul style={webStyles.bulletList}>
              <li style={webStyles.bulletItem}>Health metrics you authorize (for example: steps, distance, heart rate, sleep, and calories).</li>
              <li style={webStyles.bulletItem}>Associated timestamps and summary values needed to display charts and compute selected time windows.</li>
            </ul>

            <p style={webStyles.subTitle}>3) App and device information for reliability and security</p>
            <ul style={webStyles.bulletList}>
              <li style={webStyles.bulletItem}>Basic device and app information (for example, operating system version and app version) used for troubleshooting.</li>
              <li style={webStyles.bulletItem}>Diagnostics such as crash reports and error logs, if enabled in the build you are using.</li>
            </ul>

            <p style={webStyles.subTitle}>4) What we do not intentionally collect</p>
            <ul style={webStyles.bulletList}>
              <li style={webStyles.bulletItem}>We do not intentionally collect precise real-time location unless you add a feature that requires it and disclose it here.</li>
              <li style={webStyles.bulletItem}>We do not intentionally collect contacts, photos, microphone recordings, or camera content unless you add a feature that requires it and disclose it here.</li>
            </ul>
          </div>

          {/* How we use information */}
          <div style={webStyles.section}>
            <h2 style={webStyles.sectionTitle}>How We Use Information</h2>
            <ul style={webStyles.bulletList}>
              <li style={webStyles.bulletItem}><strong>Provide core functionality:</strong> show health dashboards and app screens, and operate features you choose to use.</li>
              <li style={webStyles.bulletItem}><strong>Sharing features you opt into:</strong> process your chosen sharing settings and time windows.</li>
              <li style={webStyles.bulletItem}><strong>Research context:</strong> support academic research workflows where applicable, including aggregated reporting, consistent with your selections and this policy.</li>
              <li style={webStyles.bulletItem}><strong>Maintain and improve the app:</strong> debugging, reliability, performance, and security monitoring.</li>
            </ul>
          </div>

          {/* How information is shared */}
          <div style={webStyles.section}>
            <h2 style={webStyles.sectionTitle}>How Information Is Shared</h2>
            <p style={webStyles.paragraph}>We do not sell your personal information.</p>
            <p style={webStyles.paragraph}>We share information only in the following situations:</p>
            <ul style={webStyles.bulletList}>
              <li style={webStyles.bulletItem}><strong>Service providers:</strong> vendors that process data on our behalf to provide the app. For example: Clerk (authentication and user management) and Supabase (backend services such as database and APIs).</li>
              <li style={webStyles.bulletItem}><strong>When you choose to share:</strong> if you opt into a study, program, or sharing flow inside the app, we process and transmit the information required for that flow.</li>
              <li style={webStyles.bulletItem}><strong>Legal and safety:</strong> if required to comply with law or valid legal process, or to protect users, the public, or the integrity of the service.</li>
            </ul>
          </div>

          {/* Security */}
          <div style={webStyles.section}>
            <h2 style={webStyles.sectionTitle}>Security</h2>
            <ul style={webStyles.bulletList}>
              <li style={webStyles.bulletItem}>We use encrypted network connections (HTTPS/TLS) for data transmitted between the app and our backend services.</li>
              <li style={webStyles.bulletItem}>We apply access controls to limit who can access data.</li>
              <li style={webStyles.bulletItem}>No system can be guaranteed 100% secure. If you believe your account has been compromised, contact us immediately.</li>
            </ul>
          </div>

          {/* Data retention */}
          <div style={webStyles.section}>
            <h2 style={webStyles.sectionTitle}>Data Retention</h2>
            <ul style={webStyles.bulletList}>
              <li style={webStyles.bulletItem}>We retain information as needed to provide the service and for legitimate operational needs (for example, security, audit, and reliability).</li>
              <li style={webStyles.bulletItem}>When you request deletion, we process it manually and will delete or de-identify data unless we must retain it for legal, security, or operational reasons.</li>
            </ul>
          </div>

          {/* Your choices */}
          <div style={webStyles.section}>
            <h2 style={webStyles.sectionTitle}>Your Choices</h2>
            <ul style={webStyles.bulletList}>
              <li style={webStyles.bulletItem}>Revoke health data permissions at any time through your device settings (for example, HealthKit on iOS or Health Connect on Android).</li>
              <li style={webStyles.bulletItem}>
                Request access, correction, export, or deletion by emailing{' '}
                <a href="mailto:engr-sensorweb@uga.edu" style={webStyles.contactLink}>engr-sensorweb@uga.edu</a>.
                At this time, deletion requests are processed manually.
              </li>
            </ul>
          </div>

          {/* Children */}
          <div style={webStyles.section}>
            <h2 style={webStyles.sectionTitle}>Children</h2>
            <p style={webStyles.paragraph}>
              This app is not intended for children. If you believe a child has provided personal information,
              contact us to request deletion.
            </p>
          </div>

          {/* Changes */}
          <div style={webStyles.section}>
            <h2 style={webStyles.sectionTitle}>Changes to This Policy</h2>
            <p style={webStyles.paragraph}>
              We may update this policy from time to time. We will update the "Last updated" date and, if changes
              are material, we may provide additional notice in the app or on this page.
            </p>
          </div>

          {/* Contact */}
          <div style={webStyles.section}>
            <h2 style={webStyles.sectionTitle}>Contact</h2>
            <p style={webStyles.paragraph}>
              Questions or requests:{' '}
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
      <Text style={nativeStyles.title}>Privacy Policy</Text>
      <Text style={nativeStyles.meta}>Last updated: 2025-12-17</Text>

      <Text style={nativeStyles.heading}>Who We Are</Text>
      <Text style={nativeStyles.body}>
        Web3Health is developed as part of academic research at the University of Georgia SensorWeb Lab.
        This policy explains what information the app collects, how it is used, and your choices.
      </Text>

      <Text style={nativeStyles.heading}>Summary</Text>
      <Text style={nativeStyles.body}>
        • We collect account information and the health data types you explicitly authorize on your device.{'\n'}
        • We use that data to show you dashboards and to run sharing features you choose to use.{'\n'}
        • We do not sell your personal information.{'\n'}
        • You can revoke permissions and request export or deletion by email.
      </Text>

      <Text style={nativeStyles.heading}>Information We Collect</Text>
      <Text style={nativeStyles.subHeading}>1) Account and profile information</Text>
      <Text style={nativeStyles.body}>
        • Email address and basic account identifiers required for sign-in and account management.{'\n'}
        • Optional profile fields you choose to provide (for example, a display name).
      </Text>
      <Text style={nativeStyles.subHeading}>2) Health data (only with your permission)</Text>
      <Text style={nativeStyles.body}>
        The app reads health metrics from your device only after you grant permission.{'\n\n'}
        • Health metrics you authorize (for example: steps, distance, heart rate, sleep, and calories).{'\n'}
        • Associated timestamps and summary values needed to display charts and compute selected time windows.
      </Text>
      <Text style={nativeStyles.subHeading}>3) App and device information</Text>
      <Text style={nativeStyles.body}>
        • Basic device and app information used for troubleshooting.{'\n'}
        • Diagnostics such as crash reports and error logs, if enabled.
      </Text>
      <Text style={nativeStyles.subHeading}>4) What we do not intentionally collect</Text>
      <Text style={nativeStyles.body}>
        • We do not intentionally collect precise real-time location, contacts, photos, microphone recordings, or camera content unless a feature requires it and is disclosed here.
      </Text>

      <Text style={nativeStyles.heading}>How We Use Information</Text>
      <Text style={nativeStyles.body}>
        • Provide core functionality: show health dashboards and operate features you choose to use.{'\n'}
        • Sharing features you opt into: process your chosen sharing settings and time windows.{'\n'}
        • Research context: support academic research workflows where applicable.{'\n'}
        • Maintain and improve the app: debugging, reliability, performance, and security monitoring.
      </Text>

      <Text style={nativeStyles.heading}>How Information Is Shared</Text>
      <Text style={nativeStyles.body}>
        We do not sell your personal information. We share only with service providers (Clerk, Supabase), when you choose to share, or as required by law.
      </Text>

      <Text style={nativeStyles.heading}>Security</Text>
      <Text style={nativeStyles.body}>
        We use HTTPS/TLS for data in transit and apply access controls. No system is 100% secure — contact us immediately if you believe your account is compromised.
      </Text>

      <Text style={nativeStyles.heading}>Data Retention</Text>
      <Text style={nativeStyles.body}>
        We retain data as needed to provide the service. Deletion requests are processed manually — email us to request deletion.
      </Text>

      <Text style={nativeStyles.heading}>Your Choices</Text>
      <Text style={nativeStyles.body}>
        • Revoke health data permissions through your device settings at any time.{'\n'}
        • Request access, correction, export, or deletion by emailing engr-sensorweb@uga.edu.
      </Text>

      <Text style={nativeStyles.heading}>Children</Text>
      <Text style={nativeStyles.body}>
        This app is not intended for children. Contact us if you believe a child has provided personal information.
      </Text>

      <Text style={nativeStyles.heading}>Changes to This Policy</Text>
      <Text style={nativeStyles.body}>
        We may update this policy from time to time and will update the "Last updated" date accordingly.
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
  subHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
    marginTop: 14,
  },
  body: {
    fontSize: 14,
    color: '#444444',
    lineHeight: 22,
    marginBottom: 8,
  },
});
