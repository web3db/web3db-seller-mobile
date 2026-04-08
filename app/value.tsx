import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LABELS } from '@/constants/labels';

// ── Data ───────────────────────────────────────────────────

type FeatureItem = {
  id: number;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  description: string;
};

const participantFeatures: FeatureItem[] = [
  {
    id: 1,
    icon: 'pulse-outline',
    title: 'Detailed Health Tracking',
    description: 'Get a clear view of your daily activity, step counts, heart rate, and sleep patterns over time.',
  },
  {
    id: 2,
    icon: 'phone-portrait-outline',
    title: 'Your Data, Your Device',
    description: 'Health data stays on your device. Nothing is shared unless you give explicit consent for a specific study.',
  },
  {
    id: 3,
    icon: 'shield-checkmark-outline',
    title: 'Privacy-First Participation',
    description: 'You choose what to share, when to share it, and with whom. You stay in control throughout.',
  },
  {
    id: 4,
    icon: 'sync-outline',
    title: 'Seamless Daily Sync',
    description: 'Data updates automatically in the background. View your ongoing activity and contribution status within the app.',
  },
  {
    id: 5,
    icon: 'flask-outline',
    title: 'Contribute to Real Research',
    description: 'Join university-backed health studies and help advance science, all from your phone.',
  },
  {
    id: 6,
    icon: 'chatbox-outline',
    title: 'Respond to Surveys',
    description: 'Participate in researcher-created surveys alongside health data sharing for a more complete contribution.',
  },
];

const researcherFeatures: FeatureItem[] = [
  {
    id: 1,
    icon: 'analytics-outline',
    title: 'High-Frequency Data',
    description: 'Access health metrics at 5-minute granularity for detailed temporal analysis.',
  },
  {
    id: 2,
    icon: 'checkmark-circle-outline',
    title: 'Consented, Real-World Data',
    description: 'All data is collected with explicit participant consent, documented and recorded per study.',
  },
  {
    id: 3,
    icon: 'cloud-outline',
    title: 'Fully Remote Collection',
    description: 'No daily in-person visits required. Participants contribute data passively from their own devices.',
  },
  {
    id: 4,
    icon: 'time-outline',
    title: 'Continuous Monitoring',
    description: 'Capture real-world, continuous health data instead of isolated lab snapshots taken at scheduled intervals.',
  },
  {
    id: 5,
    icon: 'layers-outline',
    title: 'Structured Study Data',
    description: 'Data arrives organized through study enrollment with clear provenance and per-participant segmentation.',
  },
  {
    id: 6,
    icon: 'chatbox-ellipses-outline',
    title: 'Surveys and Participant Communication',
    description: 'Collect qualitative insights alongside health data through in-app surveys dispatched directly to study participants.',
  },
];

const earlyAdopterPoints = [
  {
    icon: 'ribbon-outline' as const,
    title: 'Early Contributor Recognition',
    text: 'Early users receive founder-tier acknowledgment as the platform grows.',
  },
  {
    icon: 'trending-up-outline' as const,
    title: 'Future Rewards',
    text: 'As the platform expands, early participants will be first in line for incentive programs.',
  },
  {
    icon: 'school-outline' as const,
    title: 'University-Backed Research',
    text: 'Your contributions support peer-reviewed studies led by university researchers and domain experts.',
  },
];

// ── Web Styles ─────────────────────────────────────────────

const webStyles: Record<string, React.CSSProperties> = {
  pageContainer: {
    minHeight: '100vh',
    backgroundColor: '#FFFFFF',
    overflowX: 'hidden',
    overflowY: 'auto',
  },

  // ── Hero ──────────────────────────────────────────────────
  heroSection: {
    paddingLeft: 80,
    paddingRight: 80,
    paddingTop: 100,
    paddingBottom: 48,
    backgroundColor: '#F9F9FB',
    borderBottom: '1px solid #E6E6E6',
    textAlign: 'center',
  },
  heroTitle: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 'clamp(36px, 4vw, 48px)' as any,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  heroSubtitle: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 'clamp(16px, 1.5vw, 20px)' as any,
    fontWeight: '400',
    color: '#666666',
    maxWidth: 720,
    margin: '0 auto',
    lineHeight: 1.65,
  },

  // ── Tab Toggle ─────────────────────────────────────────────
  tabSection: {
    paddingLeft: 80,
    paddingRight: 80,
    paddingTop: 64,
    paddingBottom: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  tabLabel: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 13,
    fontWeight: '600',
    color: '#888888',
    textTransform: 'uppercase' as const,
    letterSpacing: '1.5px',
    marginBottom: 20,
  },
  tabRow: {
    display: 'flex',
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#F0F0F2',
    borderRadius: 14,
    padding: 5,
  },
  tabButton: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 15,
    fontWeight: '600',
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 24,
    paddingRight: 24,
    borderRadius: 10,
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.2s ease',
  },
  tabButtonActive: {
    backgroundColor: '#B22222',
    color: '#FFFFFF',
    boxShadow: '0 2px 8px rgba(178, 34, 34, 0.35)',
  },
  tabButtonInactive: {
    backgroundColor: 'transparent',
    color: '#555555',
  },

  // ── Feature Cards ───────────────────────────────────────────
  featureSection: {
    paddingLeft: 80,
    paddingRight: 80,
    paddingTop: 48,
    paddingBottom: 80,
  },
  featureWrapper: {
    maxWidth: 1200,
    margin: '0 auto',
    transition: 'opacity 0.25s ease',
  },
  featureGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' as any,
    gap: 24,
  },
  featureCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 28,
    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.07)',
    border: '1px solid rgba(0,0,0,0.04)',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  featureCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(178, 34, 34, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureCardTitle: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 17,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  featureCardText: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 14,
    fontWeight: '400',
    color: '#555555',
    lineHeight: 1.65,
  },

  // ── Early Adopter ───────────────────────────────────────────
  earlyAdopterSection: {
    paddingLeft: 80,
    paddingRight: 80,
    paddingTop: 0,
    paddingBottom: 80,
  },
  earlyAdopterInner: {
    maxWidth: 900,
    margin: '0 auto',
    backgroundColor: '#F9F9FB',
    borderRadius: 20,
    padding: 40,
    border: '1px solid #EEEEEE',
  },
  earlyAdopterTitle: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 28,
    textAlign: 'center',
  },
  earlyAdopterGrid: {
    display: 'flex',
    flexDirection: 'row',
    gap: 24,
    flexWrap: 'wrap',
  },
  earlyAdopterItem: {
    flex: 1,
    minWidth: 220,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: 10,
  },
  earlyAdopterIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(178, 34, 34, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  earlyAdopterItemTitle: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  earlyAdopterItemText: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 14,
    fontWeight: '400',
    color: '#555555',
    lineHeight: 1.55,
  },

  // ── CTA Section ────────────────────────────────────────────
  ctaSection: {
    paddingLeft: 80,
    paddingRight: 80,
    paddingTop: 80,
    paddingBottom: 80,
    backgroundColor: '#1a1a1a',
  },
  ctaHeadline: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 'clamp(28px, 3vw, 40px)' as any,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  ctaSubheadline: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 16,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: 56,
    lineHeight: 1.5,
  },
  ctaCards: {
    display: 'flex',
    flexDirection: 'row',
    gap: 28,
    maxWidth: 900,
    margin: '0 auto',
    flexWrap: 'wrap',
  },
  ctaCard: {
    flex: 1,
    minWidth: 280,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 36,
    border: '1px solid rgba(255,255,255,0.1)',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  ctaCardIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaCardTitle: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  ctaCardBody: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 1.65,
  },
  ctaButtonPrimary: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    backgroundColor: '#B22222',
    paddingTop: 13,
    paddingBottom: 13,
    paddingLeft: 28,
    paddingRight: 28,
    borderRadius: 12,
    border: 'none',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    textAlign: 'center',
    boxShadow: '0 4px 14px rgba(178, 34, 34, 0.4)',
    textDecoration: 'none',
    marginTop: 8,
    width: 'fit-content',
  },
  ctaButtonOutline: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    backgroundColor: 'transparent',
    paddingTop: 13,
    paddingBottom: 13,
    paddingLeft: 28,
    paddingRight: 28,
    borderRadius: 12,
    border: '2px solid rgba(255,255,255,0.4)',
    cursor: 'pointer',
    display: 'inline-block',
    textAlign: 'center',
    textDecoration: 'none',
    marginTop: 8,
    width: 'fit-content',
  },

  // ── Footer ────────────────────────────────────────────────
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
  footerBrand: { display: 'flex', flexDirection: 'column', gap: 12, minWidth: 200 },
  footerBrandName: { display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 },
  footerBrandWeb: { fontFamily: 'Barlow, sans-serif', fontSize: 20, fontWeight: '700', color: '#B22222' },
  footerBrandHealth: { fontFamily: 'Barlow, sans-serif', fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginLeft: -6 },
  footerBrandTagline: { fontFamily: 'Barlow, sans-serif', fontSize: 13, fontWeight: '400', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5, maxWidth: 260 },
  footerLinks: { display: 'flex', flexDirection: 'column', gap: 14, minWidth: 140 },
  footerLinksTitle: { fontFamily: 'Barlow, sans-serif', fontSize: 14, fontWeight: '700', color: '#FFFFFF', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: 4 },
  footerLink: { fontFamily: 'Barlow, sans-serif', fontSize: 14, fontWeight: '400', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', textDecoration: 'none' },
  footerLegal: { display: 'flex', flexDirection: 'column', gap: 14, minWidth: 180, alignItems: 'flex-end' },
  footerLegalTitle: { fontFamily: 'Barlow, sans-serif', fontSize: 14, fontWeight: '700', color: '#FFFFFF', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: 4 },
  footerLegalLink: { fontFamily: 'Barlow, sans-serif', fontSize: 14, fontWeight: '400', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', textDecoration: 'none' },
  footerDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', maxWidth: 1200, margin: '32px auto 24px auto' },
  footerBottom: { display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, maxWidth: 1200, margin: '0 auto' },
  footerCopyright: { fontFamily: 'Barlow, sans-serif', fontSize: 13, fontWeight: '400', color: 'rgba(255,255,255,0.4)' },
  footerMaintained: { fontFamily: 'Barlow, sans-serif', fontSize: 13, fontWeight: '400', color: 'rgba(255,255,255,0.4)' },
};

// ── Animated Section Wrapper ────────────────────────────────

function AnimatedSection({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.08 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        animation: visible ? `fadeInUp 0.6s ease ${delay}s forwards` : 'none',
      }}
    >
      {children}
    </div>
  );
}

// ── Footer ─────────────────────────────────────────────────

function Footer() {
  const router = useRouter();
  return (
    <footer className="val-footer" style={webStyles.footer}>
      <style>{`.footer-link:hover { color: rgba(255, 255, 255, 0.9) !important; }`}</style>
      <div className="val-footer-content" style={webStyles.footerContent}>
        <div style={webStyles.footerBrand}>
          <div style={webStyles.footerBrandName}>
            <Image
              source={require('../assets/images/Web3Health.png')}
              style={{ width: 32, height: 32 }}
              resizeMode="contain"
            />
            <span style={webStyles.footerBrandWeb}>Web3</span>
            <span style={webStyles.footerBrandHealth}>Health</span>
          </div>
          <span style={webStyles.footerBrandTagline}>
            Accelerating health research with consented, anonymized activity data.
          </span>
        </div>

        <div style={webStyles.footerLinks}>
          <span style={webStyles.footerLinksTitle}>Navigate</span>
          <span className="footer-link" style={webStyles.footerLink} onClick={() => router.push('/about')}>About Us</span>
          <span className="footer-link" style={webStyles.footerLink} onClick={() => router.push('/services')}>How It Works</span>
          <span className="footer-link" style={webStyles.footerLink} onClick={() => router.push('/value' as any)}>What You Get</span>
          <a className="footer-link" style={webStyles.footerLink} href="mailto:engr-sensorweb@uga.edu">Contact</a>
        </div>

        <div className="val-footer-legal" style={webStyles.footerLegal}>
          <span style={webStyles.footerLegalTitle}>Legal</span>
          <span className="footer-link" style={webStyles.footerLegalLink} onClick={() => router.push('/privacy-policy' as any)}>Privacy Policy</span>
          <span className="footer-link" style={webStyles.footerLegalLink} onClick={() => router.push('/terms-of-service' as any)}>Terms of Service</span>
        </div>
      </div>

      <div style={webStyles.footerDivider} />

      <div className="val-footer-bottom" style={webStyles.footerBottom}>
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

// ── Main Component ─────────────────────────────────────────

export default function ValuePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'participants' | 'researchers'>('participants');
  const [contentVisible, setContentVisible] = useState(true);

  const features = activeTab === 'participants' ? participantFeatures : researcherFeatures;

  function switchTab(tab: 'participants' | 'researchers') {
    if (tab === activeTab) return;
    setContentVisible(false);
    setTimeout(() => {
      setActiveTab(tab);
      setContentVisible(true);
    }, 200);
  }

  if (Platform.OS === 'web') {
    return (
      <div style={webStyles.pageContainer}>
        <style>{`
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(24px); }
            to   { opacity: 1; transform: translateY(0);    }
          }

          /* ---- Tablet ---- */
          @media (max-width: 900px) {
            .val-hero, .val-tab-section, .val-feature-section,
            .val-early, .val-cta, .val-footer {
              padding-left: 32px !important;
              padding-right: 32px !important;
            }
          }

          /* ---- Small tablet ---- */
          @media (max-width: 768px) {
            .val-hero, .val-tab-section, .val-feature-section,
            .val-early, .val-cta, .val-footer {
              padding-left: 24px !important;
              padding-right: 24px !important;
            }
            .val-cta-cards {
              flex-direction: column !important;
            }
            .val-footer-content {
              flex-direction: column !important;
            }
            .val-footer-legal {
              align-items: flex-start !important;
            }
            .val-footer-bottom {
              flex-direction: column !important;
              align-items: flex-start !important;
            }
            .val-early-grid {
              flex-direction: column !important;
            }
          }

          /* ---- Phone ---- */
          @media (max-width: 480px) {
            .val-hero, .val-tab-section, .val-feature-section,
            .val-early, .val-cta, .val-footer {
              padding-left: 16px !important;
              padding-right: 16px !important;
            }
            .val-hero {
              padding-top: 100px !important;
              padding-bottom: 32px !important;
            }
            .val-feature-grid {
              grid-template-columns: 1fr !important;
            }
            .val-tab-row {
              flex-direction: column !important;
              width: 100% !important;
            }
            .val-tab-button {
              width: 100% !important;
              text-align: center !important;
            }
          }

          .val-feature-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 6px 20px rgba(0,0,0,0.1);
            transition: transform 0.25s ease, box-shadow 0.25s ease;
          }
        `}</style>

        {/* 1. Hero */}
        <div className="val-hero" style={webStyles.heroSection}>
          <h1 style={webStyles.heroTitle}>What You Get</h1>
          <p style={webStyles.heroSubtitle}>
            Web3Health provides clear value for both {LABELS.CONTRIBUTOR}s and {LABELS.INSTITUTIONAL_PARTNER}s. Select your role to see how the platform works for you.
          </p>
        </div>

        {/* 2. Tab Toggle */}
        <div className="val-tab-section" style={webStyles.tabSection}>
          <span style={webStyles.tabLabel}>Select your role</span>
          <div className="val-tab-row" style={webStyles.tabRow}>
            <button
              className="val-tab-button"
              style={{
                ...webStyles.tabButton,
                ...(activeTab === 'participants' ? webStyles.tabButtonActive : webStyles.tabButtonInactive),
              }}
              onClick={() => switchTab('participants')}
            >
              For {LABELS.CONTRIBUTOR}s
            </button>
            <button
              className="val-tab-button"
              style={{
                ...webStyles.tabButton,
                ...(activeTab === 'researchers' ? webStyles.tabButtonActive : webStyles.tabButtonInactive),
              }}
              onClick={() => switchTab('researchers')}
            >
              For {LABELS.INSTITUTIONAL_PARTNER}s
            </button>
          </div>
        </div>

        {/* 3. Feature Cards */}
        <div className="val-feature-section" style={webStyles.featureSection}>
          <div style={{ ...webStyles.featureWrapper, opacity: contentVisible ? 1 : 0 }}>
            <div className="val-feature-grid" style={webStyles.featureGrid}>
              {features.map((item, i) => (
                <AnimatedSection key={`${activeTab}-${item.id}`} delay={0.05 + i * 0.07}>
                  <div className="val-feature-card" style={webStyles.featureCard}>
                    <div style={webStyles.featureCardIcon}>
                      <Ionicons name={item.icon} size={24} color="#B22222" />
                    </div>
                    <span style={webStyles.featureCardTitle}>{item.title}</span>
                    <span style={webStyles.featureCardText}>{item.description}</span>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </div>

        {/* 4. Early Adopter section (participants only) */}
        {activeTab === 'participants' && contentVisible && (
          <div className="val-early" style={webStyles.earlyAdopterSection}>
            <AnimatedSection>
              <div style={webStyles.earlyAdopterInner}>
                <h3 style={webStyles.earlyAdopterTitle}>Early Adopter Benefits</h3>
                <div className="val-early-grid" style={webStyles.earlyAdopterGrid}>
                  {earlyAdopterPoints.map((item) => (
                    <div key={item.icon} style={webStyles.earlyAdopterItem}>
                      <div style={webStyles.earlyAdopterIcon}>
                        <Ionicons name={item.icon} size={22} color="#B22222" />
                      </div>
                      <span style={webStyles.earlyAdopterItemTitle}>{item.title}</span>
                      <span style={webStyles.earlyAdopterItemText}>{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </AnimatedSection>
          </div>
        )}

        {/* 5. CTA Section */}
        <AnimatedSection>
          <div className="val-cta" style={webStyles.ctaSection}>
            <h2 style={webStyles.ctaHeadline}>Ready to get started?</h2>
            <p style={webStyles.ctaSubheadline}>
              {`Join the growing network of ${LABELS.CONTRIBUTOR}s and ${LABELS.INSTITUTIONAL_PARTNER}s advancing health research.`}
            </p>
            <div className="val-cta-cards" style={webStyles.ctaCards}>
              {/* Participant CTA */}
              <div style={webStyles.ctaCard}>
                <div style={{ ...webStyles.ctaCardIcon, backgroundColor: 'rgba(178, 34, 34, 0.2)' }}>
                  <Ionicons name="phone-portrait-outline" size={26} color="#FF6B6B" />
                </div>
                <span style={webStyles.ctaCardTitle}>I'm a {LABELS.CONTRIBUTOR}</span>
                <span style={webStyles.ctaCardBody}>
                  Download the Web3Health app, connect your health data, browse active studies, and participate on your own terms.
                </span>
                <div style={{ display: 'flex', flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                  <a
                    style={webStyles.ctaButtonPrimary}
                    href="https://apps.apple.com/us/app/web3health-sensorweb/id6756590982"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Ionicons name="logo-apple" size={18} color="#FFFFFF" />
                    App Store
                  </a>
                  <a
                    style={webStyles.ctaButtonPrimary}
                    href="https://play.google.com/store/apps/details?id=org.sensorweb.Web3Health"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Ionicons name="logo-google-playstore" size={18} color="#FFFFFF" />
                    Google Play
                  </a>
                </div>
              </div>

              {/* Researcher CTA */}
              <div style={webStyles.ctaCard}>
                <div style={{ ...webStyles.ctaCardIcon, backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
                  <Ionicons name="business-outline" size={26} color="rgba(255,255,255,0.8)" />
                </div>
                <span style={webStyles.ctaCardTitle}>I'm a {LABELS.INSTITUTIONAL_PARTNER}</span>
                <span style={webStyles.ctaCardBody}>
                  Create an institutional account, configure your first study, and start recruiting participants through the dashboard.
                </span>
                <span
                  style={webStyles.ctaButtonOutline}
                  onClick={() => router.push('/register')}
                >
                  Get Started
                </span>
              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* 6. Footer */}
        <Footer />
      </div>
    );
  }

  // ── Native Fallback ────────────────────────────────────────
  return (
    <ScrollView style={nativeStyles.container} contentContainerStyle={nativeStyles.scrollContent}>
      <Text style={nativeStyles.title}>What You Get</Text>
      <Text style={nativeStyles.subtitle}>
        {`Web3Health provides clear value for both ${LABELS.CONTRIBUTOR}s and ${LABELS.INSTITUTIONAL_PARTNER}s.`}
      </Text>

      <Text style={nativeStyles.sectionHeading}>For {LABELS.CONTRIBUTOR}s</Text>
      {participantFeatures.map((item) => (
        <View key={item.id} style={nativeStyles.card}>
          <Text style={nativeStyles.cardTitle}>{item.title}</Text>
          <Text style={nativeStyles.cardBody}>{item.description}</Text>
        </View>
      ))}

      <Text style={[nativeStyles.sectionHeading, { marginTop: 32 }]}>For {LABELS.INSTITUTIONAL_PARTNER}s</Text>
      {researcherFeatures.map((item) => (
        <View key={item.id} style={nativeStyles.card}>
          <Text style={nativeStyles.cardTitle}>{item.title}</Text>
          <Text style={nativeStyles.cardBody}>{item.description}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const nativeStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContent: { padding: 24, paddingBottom: 48 },
  title: { fontSize: 28, fontWeight: '700', color: '#1a1a1a', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#666666', textAlign: 'center', marginBottom: 32, lineHeight: 22 },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: '#B22222',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: '#F9F9FB',
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', marginBottom: 6 },
  cardBody: { fontSize: 13, color: '#555555', lineHeight: 20 },
});
