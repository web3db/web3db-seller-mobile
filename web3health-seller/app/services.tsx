import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// ── Data ───────────────────────────────────────────────────

type Step = {
  id: number;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  description: string;
};

const contributorSteps: Step[] = [
  {
    id: 1,
    icon: 'download-outline',
    title: 'Install & Configure',
    description: 'Download the Web3Health app and complete initial onboarding. Set your notification preferences and data-sharing defaults to match your comfort level.',
  },
  {
    id: 2,
    icon: 'fitness-outline',
    title: 'Connect Health Data Sources',
    description: 'Securely link Apple HealthKit or Google Health Connect. Web3Health requests only the minimum permissions required for studies you choose to join.',
  },
  {
    id: 3,
    icon: 'clipboard-outline',
    title: 'Join Approved Initiatives',
    description: 'Browse active research studies and review their objectives, duration, and required data. Enroll only in initiatives that match your interests and comfort level.',
  },
  {
    id: 4,
    icon: 'eye-outline',
    title: 'Review Scope of Shared Data',
    description: 'Before confirming participation, see exactly which metrics will be shared, for how long, and with which institution. Every consent step is explicitly recorded.',
  },
  {
    id: 5,
    icon: 'settings-outline',
    title: 'Control Participation',
    description: 'Pause or withdraw from any study at any time, without explanation required. Your data stops flowing the moment you opt out — no delays, no exceptions.',
  },
  {
    id: 6,
    icon: 'analytics-outline',
    title: 'View Activity Logs',
    description: 'Access a complete log of every data access event, session, and study interaction. Full transparency on what was shared, when, and with whom.',
  },
];

const institutionSteps: Step[] = [
  {
    id: 1,
    icon: 'create-outline',
    title: 'Create Structured Initiatives',
    description: 'Design and publish research studies with defined objectives, data scope, eligibility criteria, and duration through the institutional dashboard.',
  },
  {
    id: 2,
    icon: 'funnel-outline',
    title: 'Define Data Scope',
    description: 'Specify required health metrics, minimum data coverage periods, and participant eligibility filters including age ranges and target health conditions.',
  },
  {
    id: 3,
    icon: 'shield-checkmark-outline',
    title: 'Access Secure Dashboards',
    description: 'Monitor real-time enrollment progress, data collection status, and aggregate participant metrics within a secure, access-controlled research environment.',
  },
  {
    id: 4,
    icon: 'bar-chart-outline',
    title: 'Review Participation Metrics',
    description: 'Track enrollment rates, retention, and data completeness across your cohort. Export structured datasets with full provenance metadata for reproducible analysis.',
  },
  {
    id: 5,
    icon: 'document-text-outline',
    title: 'Governance & Compliance',
    description: 'All studies are governed by documented consent records, data use agreements, and audit trails. Compliance reporting tools ensure adherence to institutional and regulatory requirements.',
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
    paddingTop: 60,
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
    maxWidth: 700,
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

  // ── Step Diagram ───────────────────────────────────────────
  stepSection: {
    paddingLeft: 80,
    paddingRight: 80,
    paddingTop: 48,
    paddingBottom: 80,
  },
  stepDiagramWrapper: {
    maxWidth: 1200,
    margin: '0 auto',
    transition: 'opacity 0.25s ease',
  },

  // Desktop: circle row at top
  circleRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  stepCircle: {
    width: 44,
    height: 44,
    borderRadius: '50%',
    backgroundColor: '#B22222',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxShadow: '0 2px 8px rgba(178, 34, 34, 0.3)',
  },
  stepCircleNumber: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stepConnector: {
    flex: 1,
    height: 2,
    backgroundColor: '#E0E0E0',
    position: 'relative' as const,
  },
  stepConnectorArrow: {
    position: 'absolute' as const,
    right: -6,
    top: -4,
    width: 0,
    height: 0,
    borderTop: '5px solid transparent',
    borderBottom: '5px solid transparent',
    borderLeft: '8px solid #E0E0E0',
  },

  // Card grid (below circles)
  stepCardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' as any,
    gap: 20,
  },
  stepCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.07)',
    border: '1px solid rgba(0,0,0,0.05)',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  stepCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(178, 34, 34, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCardTitle: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
    lineHeight: 1.3,
  },
  stepCardDescription: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 13,
    fontWeight: '400',
    color: '#555555',
    lineHeight: 1.65,
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
    display: 'inline-block',
    textAlign: 'center',
    boxShadow: '0 4px 14px rgba(178, 34, 34, 0.4)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
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
    transition: 'border-color 0.2s ease',
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
    transition: 'color 0.2s ease',
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
    maxWidth: 1200,
    margin: '32px auto 24px auto',
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

// ── Step Diagram ────────────────────────────────────────────

function StepDiagram({ steps, visible }: { steps: Step[]; visible: boolean }) {
  return (
    <div
      className="hiw-diagram"
      style={{
        ...webStyles.stepDiagramWrapper,
        opacity: visible ? 1 : 0,
      }}
    >
      {/* Circle row with connectors — hidden on mobile via CSS */}
      <div className="hiw-circle-row" style={webStyles.circleRow}>
        {steps.map((step, i) => (
          <React.Fragment key={step.id}>
            <div style={webStyles.stepCircle}>
              <span style={webStyles.stepCircleNumber}>{step.id}</span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ position: 'relative', flex: 1, height: 2, backgroundColor: '#E0E0E0' }}>
                <div style={webStyles.stepConnectorArrow} />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step cards */}
      <div className="hiw-card-grid" style={webStyles.stepCardGrid}>
        {steps.map((step, i) => (
          <AnimatedSection key={step.id} delay={0.05 + i * 0.07}>
            {/* Mobile: vertical step number shown via CSS class */}
            <div className="hiw-step-card" style={webStyles.stepCard}>
              {/* Mobile step number badge — shown only on small screens */}
              <div className="hiw-mobile-num" style={{ display: 'none', alignItems: 'center', gap: 12 }}>
                <div style={{ ...webStyles.stepCircle, width: 36, height: 36 }}>
                  <span style={{ ...webStyles.stepCircleNumber, fontSize: 14 }}>{step.id}</span>
                </div>
              </div>
              <div style={webStyles.stepCardIcon}>
                <Ionicons name={step.icon} size={22} color="#B22222" />
              </div>
              <span style={webStyles.stepCardTitle}>{step.title}</span>
              <span style={webStyles.stepCardDescription}>{step.description}</span>
            </div>
          </AnimatedSection>
        ))}
      </div>
    </div>
  );
}

// ── Footer ─────────────────────────────────────────────────

function Footer() {
  const router = useRouter();
  return (
    <footer className="hiw-footer" style={webStyles.footer}>
      <style>{`.footer-link:hover { color: rgba(255, 255, 255, 0.9) !important; }`}</style>
      <div className="hiw-footer-content" style={webStyles.footerContent}>
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
          <span className="footer-link" style={webStyles.footerLink} onClick={() => router.push('/about')}>
            About Us
          </span>
          <span className="footer-link" style={webStyles.footerLink} onClick={() => router.push('/services')}>
            How It Works
          </span>
          <a className="footer-link" style={webStyles.footerLink} href="https://www.uga.edu" target="_blank" rel="noopener noreferrer">
            University of Georgia
          </a>
          <a className="footer-link" style={webStyles.footerLink} href="mailto:agp44843@uga.edu">
            Contact
          </a>
        </div>

        <div className="hiw-footer-legal" style={webStyles.footerLegal}>
          <span style={webStyles.footerLegalTitle}>Legal</span>
          <span className="footer-link" style={webStyles.footerLegalLink}>Privacy Policy</span>
          <span className="footer-link" style={webStyles.footerLegalLink}>Terms of Service</span>
        </div>
      </div>

      <div style={webStyles.footerDivider} />

      <div className="hiw-footer-bottom" style={webStyles.footerBottom}>
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

// ── Main Component ─────────────────────────────────────────

export default function HowItWorks() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'contributors' | 'institutions'>('contributors');
  const [diagramVisible, setDiagramVisible] = useState(true);

  const steps = activeTab === 'contributors' ? contributorSteps : institutionSteps;

  function switchTab(tab: 'contributors' | 'institutions') {
    if (tab === activeTab) return;
    setDiagramVisible(false);
    setTimeout(() => {
      setActiveTab(tab);
      setDiagramVisible(true);
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
            .hiw-hero, .hiw-tab-section, .hiw-step-section,
            .hiw-cta, .hiw-footer {
              padding-left: 32px !important;
              padding-right: 32px !important;
            }
          }

          /* ---- Small tablet ---- */
          @media (max-width: 768px) {
            .hiw-hero, .hiw-tab-section, .hiw-step-section,
            .hiw-cta, .hiw-footer {
              padding-left: 24px !important;
              padding-right: 24px !important;
            }
            /* Hide horizontal circle row on mobile */
            .hiw-circle-row {
              display: none !important;
            }
            /* Show the per-card mobile step number */
            .hiw-mobile-num {
              display: flex !important;
            }
            /* Single column on mobile */
            .hiw-card-grid {
              grid-template-columns: 1fr !important;
            }
            .hiw-cta-cards {
              flex-direction: column !important;
            }
            .hiw-footer-content {
              flex-direction: column !important;
            }
            .hiw-footer-legal {
              align-items: flex-start !important;
            }
            .hiw-footer-bottom {
              flex-direction: column !important;
              align-items: flex-start !important;
            }
          }

          /* ---- Phone ---- */
          @media (max-width: 480px) {
            .hiw-hero, .hiw-tab-section, .hiw-step-section,
            .hiw-cta, .hiw-footer {
              padding-left: 16px !important;
              padding-right: 16px !important;
            }
            .hiw-hero {
              padding-top: 40px !important;
              padding-bottom: 32px !important;
            }
            .hiw-tab-row {
              flex-direction: column !important;
              width: 100% !important;
            }
            .hiw-tab-button {
              width: 100% !important;
              text-align: center !important;
            }
          }

          .hiw-step-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 6px 20px rgba(0,0,0,0.1);
            transition: transform 0.25s ease, box-shadow 0.25s ease;
          }
          .hiw-cta-btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(178, 34, 34, 0.5) !important;
          }
          .hiw-cta-btn-outline:hover {
            border-color: rgba(255,255,255,0.8) !important;
          }
        `}</style>

        {/* 1. Hero */}
        <div className="hiw-hero" style={webStyles.heroSection}>
          <h1 style={webStyles.heroTitle}>How It Works</h1>
          <p style={webStyles.heroSubtitle}>
            Web3Health connects contributors and research institutions through a transparent, consent-driven data platform. Select your role to explore the workflow.
          </p>
        </div>

        {/* 2. Tab Toggle */}
        <div className="hiw-tab-section" style={webStyles.tabSection}>
          <span style={webStyles.tabLabel}>Select your role</span>
          <div className="hiw-tab-row" style={webStyles.tabRow}>
            <button
              className="hiw-tab-button"
              style={{
                ...webStyles.tabButton,
                ...(activeTab === 'contributors' ? webStyles.tabButtonActive : webStyles.tabButtonInactive),
              }}
              onClick={() => switchTab('contributors')}
            >
              For Contributors
            </button>
            <button
              className="hiw-tab-button"
              style={{
                ...webStyles.tabButton,
                ...(activeTab === 'institutions' ? webStyles.tabButtonActive : webStyles.tabButtonInactive),
              }}
              onClick={() => switchTab('institutions')}
            >
              For Institutional Partners
            </button>
          </div>
        </div>

        {/* 3. Step Diagram */}
        <div className="hiw-step-section" style={webStyles.stepSection}>
          <StepDiagram steps={steps} visible={diagramVisible} />
        </div>

        {/* 4. CTA Section */}
        <AnimatedSection>
          <div className="hiw-cta" style={webStyles.ctaSection}>
            <h2 style={webStyles.ctaHeadline}>Ready to get started?</h2>
            <p style={webStyles.ctaSubheadline}>
              Join the growing network of contributors and institutions advancing health research.
            </p>
            <div className="hiw-cta-cards" style={webStyles.ctaCards}>
              {/* Contributor CTA */}
              <div style={webStyles.ctaCard}>
                <div style={{ ...webStyles.ctaCardIcon, backgroundColor: 'rgba(178, 34, 34, 0.2)' }}>
                  <Ionicons name="phone-portrait-outline" size={26} color="#FF6B6B" />
                </div>
                <span style={webStyles.ctaCardTitle}>I'm a Contributor</span>
                <span style={webStyles.ctaCardBody}>
                  Web3Health is a mobile app for iOS and Android. Download it to connect your health data, browse active studies, and participate entirely on your own terms.
                </span>
                <a
                  className="hiw-cta-btn-primary"
                  style={{ ...webStyles.ctaButtonPrimary, display: 'inline-flex', alignItems: 'center', gap: 8 }}
                  href="https://apps.apple.com/us/app/web3health-sensorweb/id6756590982"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Ionicons name="logo-apple" size={18} color="#FFFFFF" />
                  Download on the App Store
                </a>
              </div>

              {/* Institution CTA */}
              <div style={webStyles.ctaCard}>
                <div style={{ ...webStyles.ctaCardIcon, backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
                  <Ionicons name="business-outline" size={26} color="rgba(255,255,255,0.8)" />
                </div>
                <span style={webStyles.ctaCardTitle}>I'm a Research Partner</span>
                <span style={webStyles.ctaCardBody}>
                  Create an institutional account, configure your first study, and start recruiting participants through the Web3Health dashboard.
                </span>
                <span
                  className="hiw-cta-btn-outline"
                  style={webStyles.ctaButtonOutline}
                  onClick={() => router.push('/register')}
                >
                  Get Started
                </span>
              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* 5. Footer */}
        <Footer />
      </div>
    );
  }

  // ── Native Fallback ────────────────────────────────────────
  return (
    <ScrollView style={nativeStyles.container} contentContainerStyle={nativeStyles.scrollContent}>
      <Text style={nativeStyles.title}>How It Works</Text>
      <Text style={nativeStyles.subtitle}>
        Web3Health connects contributors and research institutions through a transparent, consent-driven data platform.
      </Text>

      <Text style={nativeStyles.sectionHeading}>For Contributors</Text>
      {contributorSteps.map((step) => (
        <View key={step.id} style={nativeStyles.card}>
          <View style={nativeStyles.cardHeader}>
            <View style={nativeStyles.stepBadge}>
              <Text style={nativeStyles.stepBadgeText}>{step.id}</Text>
            </View>
            <Text style={nativeStyles.cardTitle}>{step.title}</Text>
          </View>
          <Text style={nativeStyles.cardBody}>{step.description}</Text>
        </View>
      ))}

      <Text style={[nativeStyles.sectionHeading, { marginTop: 32 }]}>For Institutional Partners</Text>
      {institutionSteps.map((step) => (
        <View key={step.id} style={nativeStyles.card}>
          <View style={nativeStyles.cardHeader}>
            <View style={nativeStyles.stepBadge}>
              <Text style={nativeStyles.stepBadgeText}>{step.id}</Text>
            </View>
            <Text style={nativeStyles.cardTitle}>{step.title}</Text>
          </View>
          <Text style={nativeStyles.cardBody}>{step.description}</Text>
        </View>
      ))}
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
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  stepBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#B22222',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
    flex: 1,
  },
  cardBody: {
    fontSize: 13,
    color: '#555555',
    lineHeight: 20,
  },
});
