import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// ── Data ───────────────────────────────────────────────────

const professorData = [
  {
    id: 1,
    name: 'Prof. WenZhan Song',
    title: 'Research Director',
    department: 'School of Computing',
    affiliation: 'University of Georgia',
    initials: 'WS',
    bio: 'Dr. Song is a professor in the School of Computing at UGA specializing in cyber-physical systems and IoT-based health monitoring. He leads the platform\'s architectural research direction and NSF grant oversight.',
  },
  {
    id: 2,
    name: 'Prof. Haijian Sun',
    title: 'Research Director',
    department: 'School of Engineering',
    affiliation: 'University of Georgia',
    initials: 'HS',
    bio: 'Dr. Sun is a professor in the School of Engineering focusing on wireless communications and biomedical signal processing. He contributes expertise in secure data transmission and mobile health sensor integration.',
  },
  {
    id: 3,
    name: 'Prof. Teaho Jung',
    title: 'Research Director',
    department: 'School of Computing',
    affiliation: 'University of Georgia',
    initials: 'TJ',
    bio: 'Dr. Jung is a professor in the School of Computing with expertise in distributed systems and data privacy. He leads research into consent-preserving data frameworks and institutional data governance protocols.',
  },
];

const developerData = [
  { id: 4, name: 'Mohit Naik',      title: 'Software Developer', department: 'School of Engineering', initials: 'MN' },
  { id: 5, name: 'Andrew Primiano', title: 'Software Developer', department: 'School of Computing',  initials: 'AP' },
  { id: 6, name: 'Jason Xiong',     title: 'Software Developer', department: 'School of Computing',  initials: 'JX' },
];

const backgroundCards = [
  {
    id: 1,
    icon: 'school-outline' as const,
    title: 'University Origin',
    text: 'Web3Health was founded within the University of Georgia research environment as an NSF-funded initiative, bringing together interdisciplinary expertise across computing, engineering, and biomedical research.',
  },
  {
    id: 2,
    icon: 'people-outline' as const,
    title: 'Collaborative Development',
    text: 'The platform is the result of close collaboration between faculty principal investigators and a dedicated software engineering team, combining academic research rigor with production-grade implementation.',
  },
  {
    id: 3,
    icon: 'shield-checkmark-outline' as const,
    title: 'Privacy-by-Design',
    text: 'Privacy is not an afterthought — every layer of Web3Health\'s architecture is built from the ground up around data minimization, participant autonomy, and transparent consent management.',
  },
];

const techFocusItems = [
  {
    id: 1,
    icon: 'phone-portrait-outline' as const,
    title: 'Mobile Health Integration',
    text: 'Native integration with Apple HealthKit and Google Health Connect enables passive, background collection of activity metrics directly from participants\' devices without manual data entry.',
  },
  {
    id: 2,
    icon: 'server-outline' as const,
    title: 'Secure Backend Infrastructure',
    text: 'Encrypted data pipelines and access-controlled APIs ensure that health data is protected in transit and at rest, with audit trails maintained for every data access event.',
  },
  {
    id: 3,
    icon: 'document-text-outline' as const,
    title: 'Consent & Permission Framework',
    text: 'Participants grant granular, per-study consent that can be modified or revoked at any time. No data is collected or shared without an explicit, recorded authorization.',
  },
  {
    id: 4,
    icon: 'time-outline' as const,
    title: 'Session Lifecycle Management',
    text: 'Authenticated session management governs access throughout the data contribution lifecycle, ensuring secure onboarding, active participation, and clean session termination.',
  },
  {
    id: 5,
    icon: 'bar-chart-outline' as const,
    title: 'Institutional Dashboard',
    text: 'Research organizations access a dedicated dashboard for study creation, participant enrollment tracking, eligibility screening, and structured dataset export.',
  },
];

const quickLinksData = [
  { id: 1, title: 'University of Georgia', description: 'Our primary research institution', url: 'https://www.uga.edu', icon: 'school-outline' as const },
  { id: 2, title: 'NSF Research Grant', description: 'National Science Foundation project', url: 'https://www.nsf.gov', icon: 'flask-outline' as const },
  { id: 3, title: 'Center For Cyber-Physical Systems', description: 'Browse academic publications', url: 'https://cps.uga.edu/', icon: 'book-outline' as const },
  { id: 4, title: 'Contact Us', description: 'Get in touch with the team', url: 'mailto:agp44843@uga.edu', icon: 'mail-outline' as const },
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
  },
  heroTitle: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 'clamp(36px, 4vw, 48px)' as any,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 16,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 'clamp(16px, 1.5vw, 20px)' as any,
    fontWeight: '400',
    color: '#666666',
    textAlign: 'center',
    maxWidth: 820,
    margin: '0 auto',
    lineHeight: 1.65,
  },

  // ── Mission ───────────────────────────────────────────────
  missionSection: {
    paddingLeft: 80,
    paddingRight: 80,
    paddingTop: 80,
    paddingBottom: 60,
  },
  missionInner: {
    maxWidth: 900,
    margin: '0 auto',
  },
  sectionTitle: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 'clamp(28px, 3vw, 36px)' as any,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 24,
  },
  sectionParagraph: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 16,
    fontWeight: '400',
    color: '#444444',
    lineHeight: 1.75,
    marginBottom: 0,
  },

  // ── Vision ────────────────────────────────────────────────
  visionSection: {
    paddingLeft: 80,
    paddingRight: 80,
    paddingTop: 20,
    paddingBottom: 80,
  },
  visionInner: {
    maxWidth: 900,
    margin: '0 auto',
  },
  visionPullQuote: {
    borderLeft: '4px solid #B22222',
    backgroundColor: 'rgba(178, 34, 34, 0.04)',
    borderRadius: '0 12px 12px 0',
    padding: 28,
    marginBottom: 32,
  },
  visionPullText: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    lineHeight: 1.65,
    fontStyle: 'italic',
  },
  visionBulletList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  visionBulletItem: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  visionBulletIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(178, 34, 34, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  visionBulletText: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 15,
    fontWeight: '400',
    color: '#444444',
    lineHeight: 1.65,
  },
  visionBulletTitle: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
  },

  // ── Background ────────────────────────────────────────────
  backgroundSection: {
    paddingLeft: 80,
    paddingRight: 80,
    paddingTop: 80,
    paddingBottom: 80,
    backgroundColor: '#F9F9FB',
  },
  backgroundTitle: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 'clamp(28px, 3vw, 36px)' as any,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 48,
    textAlign: 'center',
  },
  backgroundGrid: {
    display: 'flex',
    flexDirection: 'row',
    gap: 28,
    maxWidth: 1100,
    margin: '0 auto',
    flexWrap: 'wrap',
  },
  backgroundCard: {
    flex: 1,
    minWidth: 260,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  backgroundCardIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(178, 34, 34, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  backgroundCardTitle: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  backgroundCardText: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 14,
    fontWeight: '400',
    color: '#555555',
    lineHeight: 1.7,
  },

  // ── Team / Leadership ─────────────────────────────────────
  facultySection: {
    paddingLeft: 80,
    paddingRight: 80,
    paddingTop: 80,
    paddingBottom: 80,
  },
  facultyTitle: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 'clamp(28px, 3vw, 36px)' as any,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
    textAlign: 'center',
  },
  teamSubLabel: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 12,
    fontWeight: '700',
    color: '#B22222',
    textTransform: 'uppercase' as const,
    letterSpacing: '1.5px',
    marginBottom: 24,
    textAlign: 'center',
  },
  teamDivider: {
    height: 1,
    backgroundColor: '#EEEEEE',
    maxWidth: 1200,
    margin: '40px auto',
  },
  facultyGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' as any,
    gap: 32,
    maxWidth: 1200,
    margin: '0 auto',
  },
  developerGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' as any,
    gap: 24,
    maxWidth: 1200,
    margin: '0 auto',
  },
  facultyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    border: '1px solid rgba(0,0,0,0.04)',
  },
  developerCard: {
    backgroundColor: '#F9F9FB',
    borderRadius: 14,
    padding: 24,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    border: '1px solid #EEEEEE',
  },
  facultyPhoto: {
    width: 100,
    height: 100,
    borderRadius: '50%',
    backgroundColor: 'rgba(178, 34, 34, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    border: '3px solid rgba(178, 34, 34, 0.15)',
  },
  developerPhoto: {
    width: 72,
    height: 72,
    borderRadius: '50%',
    backgroundColor: 'rgba(178, 34, 34, 0.07)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  facultyPhotoInitials: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 34,
    fontWeight: '700',
    color: '#B22222',
  },
  developerPhotoInitials: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 24,
    fontWeight: '700',
    color: '#B22222',
  },
  facultyName: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 6,
  },
  developerName: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  facultyRole: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 14,
    fontWeight: '600',
    color: '#B22222',
    marginBottom: 4,
  },
  facultyDept: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 13,
    fontWeight: '400',
    color: '#888888',
    marginBottom: 4,
  },
  facultyAffiliation: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 12,
    fontWeight: '500',
    color: '#AAAAAA',
    marginBottom: 16,
  },
  facultyBio: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 13,
    fontWeight: '400',
    color: '#555555',
    lineHeight: 1.65,
    textAlign: 'center',
    paddingTop: 12,
    borderTop: '1px solid #EEEEEE',
    width: '100%',
  },

  // ── Technical Focus ───────────────────────────────────────
  techFocusSection: {
    paddingLeft: 80,
    paddingRight: 80,
    paddingTop: 80,
    paddingBottom: 80,
    backgroundColor: '#F9F9FB',
  },
  techFocusTitle: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 'clamp(28px, 3vw, 36px)' as any,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
    textAlign: 'center',
  },
  techFocusSubtitle: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 16,
    fontWeight: '400',
    color: '#666666',
    textAlign: 'center',
    marginBottom: 48,
    lineHeight: 1.5,
  },
  techFocusGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' as any,
    gap: 24,
    maxWidth: 1200,
    margin: '0 auto',
  },
  techFocusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 28,
    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.07)',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    border: '1px solid rgba(0,0,0,0.04)',
  },
  techFocusCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(178, 34, 34, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  techFocusCardTitle: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  techFocusCardText: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 14,
    fontWeight: '400',
    color: '#555555',
    lineHeight: 1.65,
  },

  // ── Quick Links ───────────────────────────────────────────
  linksSection: {
    paddingLeft: 80,
    paddingRight: 80,
    paddingTop: 80,
    paddingBottom: 80,
  },
  linksTitle: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 'clamp(28px, 3vw, 36px)' as any,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 40,
    textAlign: 'center',
  },
  linksGrid: {
    display: 'flex',
    flexDirection: 'row',
    gap: 24,
    flexWrap: 'wrap',
    justifyContent: 'center',
    maxWidth: 1100,
    margin: '0 auto',
  },
  linkCard: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 20,
    paddingLeft: 24,
    paddingRight: 28,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
    cursor: 'pointer',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    textDecoration: 'none',
    minWidth: 260,
    flex: 1,
    maxWidth: 300,
    border: '1px solid rgba(0,0,0,0.04)',
  },
  linkIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(178, 34, 34, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  linkContent: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
  },
  linkTitle: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  linkDescription: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 13,
    fontWeight: '400',
    color: '#666666',
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
    marginTop: 32,
    marginBottom: 24,
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
      { threshold: 0.1 }
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

// ── Vision ─────────────────────────────────────────────────

const visionBullets = [
  {
    icon: 'layers-outline' as const,
    title: 'Responsible Data Governance',
    text: 'Building a model where data flows are auditable, participant rights are enforceable, and institutional access is always bounded by explicit consent.',
  },
  {
    icon: 'person-outline' as const,
    title: 'Contributor Empowerment',
    text: 'Participants are not passive data sources — they are active contributors who own, control, and are compensated for the value their health data creates.',
  },
  {
    icon: 'business-outline' as const,
    title: 'Structured Institutional Collaboration',
    text: 'Providing research institutions with the tools and governance frameworks needed to conduct rigorous, reproducible, privacy-preserving studies at scale.',
  },
];

function Vision() {
  return (
    <div className="about-vision" style={webStyles.visionSection}>
      <div style={webStyles.visionInner}>
        <AnimatedSection>
          <h2 style={webStyles.sectionTitle}>Our Vision</h2>
          <div style={webStyles.visionPullQuote}>
            <p style={webStyles.visionPullText}>
              "A future where health data advances science without compromising individual privacy — where every contributor is informed, protected, and valued."
            </p>
          </div>
        </AnimatedSection>
        <div style={webStyles.visionBulletList}>
          {visionBullets.map((item, i) => (
            <AnimatedSection key={item.icon} delay={0.1 + i * 0.1}>
              <div style={webStyles.visionBulletItem}>
                <div style={webStyles.visionBulletIcon}>
                  <Ionicons name={item.icon} size={18} color="#B22222" />
                </div>
                <div>
                  <span style={webStyles.visionBulletTitle}>{item.title} — </span>
                  <span style={webStyles.visionBulletText}>{item.text}</span>
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Background ─────────────────────────────────────────────

function Background() {
  return (
    <div className="about-background" style={webStyles.backgroundSection}>
      <AnimatedSection>
        <h2 style={webStyles.backgroundTitle}>Background</h2>
      </AnimatedSection>
      <div className="about-background-grid" style={webStyles.backgroundGrid}>
        {backgroundCards.map((card, i) => (
          <AnimatedSection key={card.id} delay={i * 0.12}>
            <div style={webStyles.backgroundCard}>
              <div style={webStyles.backgroundCardIcon}>
                <Ionicons name={card.icon} size={26} color="#B22222" />
              </div>
              <span style={webStyles.backgroundCardTitle}>{card.title}</span>
              <span style={webStyles.backgroundCardText}>{card.text}</span>
            </div>
          </AnimatedSection>
        ))}
      </div>
    </div>
  );
}

// ── Team Grid ──────────────────────────────────────────────

function TeamGrid() {
  return (
    <div className="about-faculty" style={webStyles.facultySection}>
      <AnimatedSection>
        <h2 style={webStyles.facultyTitle}>Our Team</h2>
      </AnimatedSection>

      {/* Professors */}
      <AnimatedSection delay={0.1}>
        <p style={webStyles.teamSubLabel}>Principal Investigators</p>
      </AnimatedSection>
      <div className="about-faculty-grid" style={webStyles.facultyGrid}>
        {professorData.map((prof, i) => (
          <AnimatedSection key={prof.id} delay={0.15 + i * 0.1}>
            <div className="about-faculty-card" style={webStyles.facultyCard}>
              <div style={webStyles.facultyPhoto}>
                <span style={webStyles.facultyPhotoInitials}>{prof.initials}</span>
              </div>
              <span style={webStyles.facultyName}>{prof.name}</span>
              <span style={webStyles.facultyRole}>{prof.title}</span>
              <span style={webStyles.facultyDept}>{prof.department}</span>
              <span style={webStyles.facultyAffiliation}>{prof.affiliation}</span>
              <p style={webStyles.facultyBio}>{prof.bio}</p>
            </div>
          </AnimatedSection>
        ))}
      </div>

      {/* Divider */}
      <div style={webStyles.teamDivider} />

      {/* Developers */}
      <AnimatedSection delay={0.1}>
        <p style={webStyles.teamSubLabel}>Development Team</p>
      </AnimatedSection>
      <div className="about-dev-grid" style={webStyles.developerGrid}>
        {developerData.map((dev, i) => (
          <AnimatedSection key={dev.id} delay={0.15 + i * 0.1}>
            <div style={webStyles.developerCard}>
              <div style={webStyles.developerPhoto}>
                <span style={webStyles.developerPhotoInitials}>{dev.initials}</span>
              </div>
              <span style={webStyles.developerName}>{dev.name}</span>
              <span style={webStyles.facultyRole}>{dev.title}</span>
              <span style={webStyles.facultyDept}>{dev.department}</span>
            </div>
          </AnimatedSection>
        ))}
      </div>
    </div>
  );
}

// ── Technical Focus ────────────────────────────────────────

function TechnicalFocus() {
  return (
    <div className="about-tech" style={webStyles.techFocusSection}>
      <AnimatedSection>
        <h2 style={webStyles.techFocusTitle}>Technical Focus</h2>
        <p style={webStyles.techFocusSubtitle}>
          A high-level overview of the systems powering Web3Health
        </p>
      </AnimatedSection>
      <div className="about-tech-grid" style={webStyles.techFocusGrid}>
        {techFocusItems.map((item, i) => (
          <AnimatedSection key={item.id} delay={0.1 + i * 0.08}>
            <div style={webStyles.techFocusCard}>
              <div style={webStyles.techFocusCardIcon}>
                <Ionicons name={item.icon} size={24} color="#B22222" />
              </div>
              <span style={webStyles.techFocusCardTitle}>{item.title}</span>
              <span style={webStyles.techFocusCardText}>{item.text}</span>
            </div>
          </AnimatedSection>
        ))}
      </div>
    </div>
  );
}

// ── Quick Links ────────────────────────────────────────────

function QuickLinks() {
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  return (
    <div className="about-links" style={webStyles.linksSection}>
      <AnimatedSection>
        <h2 style={webStyles.linksTitle}>Quick Links</h2>
      </AnimatedSection>
      <div className="about-links-grid" style={webStyles.linksGrid}>
        {quickLinksData.map((link) => (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="about-link-card"
            style={{
              ...webStyles.linkCard,
              ...(hoveredId === link.id
                ? { transform: 'translateY(-4px)', boxShadow: '0 6px 20px rgba(178, 34, 34, 0.15)' }
                : {}),
            }}
            onMouseEnter={() => setHoveredId(link.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <div style={webStyles.linkIcon}>
              <Ionicons name={link.icon} size={22} color="#B22222" />
            </div>
            <div style={webStyles.linkContent}>
              <span style={webStyles.linkTitle}>{link.title}</span>
              <span style={webStyles.linkDescription}>{link.description}</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

// ── Footer ─────────────────────────────────────────────────

function Footer() {
  const router = useRouter();
  return (
    <footer className="about-footer" style={webStyles.footer}>
      <style>{`.footer-link:hover { color: rgba(255, 255, 255, 0.9) !important; }`}</style>
      <div className="about-footer-content" style={webStyles.footerContent}>
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
          <span className="footer-link" style={webStyles.footerLink} onClick={() => router.push('/services' as any)}>
            How It Works
          </span>
          <a className="footer-link" style={webStyles.footerLink} href="https://www.uga.edu" target="_blank" rel="noopener noreferrer">
            University of Georgia
          </a>
          <a className="footer-link" style={webStyles.footerLink} href="mailto:agp44843@uga.edu">
            Contact
          </a>
        </div>

        <div className="about-footer-legal" style={webStyles.footerLegal}>
          <span style={webStyles.footerLegalTitle}>Legal</span>
          <span className="footer-link" style={webStyles.footerLegalLink}>Privacy Policy</span>
          <span className="footer-link" style={webStyles.footerLegalLink}>Terms of Service</span>
        </div>
      </div>

      <div style={webStyles.footerDivider} />

      <div className="about-footer-bottom" style={webStyles.footerBottom}>
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

export default function About() {
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
            .about-hero, .about-mission, .about-vision,
            .about-background, .about-faculty,
            .about-tech, .about-links, .about-footer {
              padding-left: 32px !important;
              padding-right: 32px !important;
            }
            .about-faculty-grid {
              grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)) !important;
            }
            .about-background-grid {
              gap: 20px !important;
            }
            .about-footer-content {
              gap: 32px !important;
            }
          }

          /* ---- Small tablet ---- */
          @media (max-width: 768px) {
            .about-hero, .about-mission, .about-vision,
            .about-background, .about-faculty,
            .about-tech, .about-links, .about-footer {
              padding-left: 24px !important;
              padding-right: 24px !important;
            }
            .about-background-grid {
              flex-direction: column !important;
            }
            .about-links-grid {
              flex-direction: column !important;
            }
            .about-link-card {
              min-width: 100% !important;
              max-width: 100% !important;
            }
            .about-footer-content {
              flex-direction: column !important;
            }
            .about-footer-legal {
              align-items: flex-start !important;
            }
            .about-footer-bottom {
              flex-direction: column !important;
              align-items: flex-start !important;
            }
            .about-dev-grid {
              grid-template-columns: 1fr 1fr !important;
            }
          }

          /* ---- Phone ---- */
          @media (max-width: 480px) {
            .about-hero, .about-mission, .about-vision,
            .about-background, .about-faculty,
            .about-tech, .about-links, .about-footer {
              padding-left: 16px !important;
              padding-right: 16px !important;
            }
            .about-hero {
              padding-top: 40px !important;
              padding-bottom: 32px !important;
            }
            .about-faculty-grid {
              grid-template-columns: 1fr !important;
              gap: 16px !important;
            }
            .about-faculty-card {
              padding: 24px !important;
            }
            .about-tech-grid {
              grid-template-columns: 1fr !important;
            }
            .about-dev-grid {
              grid-template-columns: 1fr !important;
            }
          }

          .about-faculty-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
          }
          .about-link-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 6px 20px rgba(178, 34, 34, 0.15);
          }
        `}</style>

        {/* 1. Hero */}
        <div className="about-hero" style={webStyles.heroSection}>
          <h1 style={webStyles.heroTitle}>About Web3Health</h1>
          <p style={webStyles.heroSubtitle}>
            Web3Health is a secure and transparent health data infrastructure platform built at the University of Georgia — enabling privacy-preserving research through consented, contributor-owned data.
          </p>
        </div>

        {/* 2. Mission */}
        <div className="about-mission" style={webStyles.missionSection}>
          <div style={webStyles.missionInner}>
            <AnimatedSection>
              <h2 style={webStyles.sectionTitle}>Our Mission</h2>
              <p style={webStyles.sectionParagraph}>
                Web3Health empowers individuals to selectively share health and activity data — such as step counts, sleep patterns, and vital signs — with approved research partners, while retaining full ownership and control. Participants grant granular consent, receive fair compensation through a blockchain-backed reward system, and can revoke access at any time. Our goal is to accelerate reproducible health research while upholding the highest standards of privacy, autonomy, and scientific rigor.
              </p>
            </AnimatedSection>
          </div>
        </div>

        {/* 3. Vision */}
        <Vision />

        {/* 4. Background */}
        <Background />

        {/* 5. Leadership */}
        <TeamGrid />

        {/* 6. Technical Focus */}
        <TechnicalFocus />

        {/* 7. Quick Links */}
        <QuickLinks />

        {/* 8. Footer */}
        <Footer />
      </div>
    );
  }

  // ── Native Fallback ────────────────────────────────────────
  return (
    <ScrollView style={nativeStyles.container} contentContainerStyle={nativeStyles.scrollContent}>
      <Text style={nativeStyles.title}>About Web3Health</Text>
      <Text style={nativeStyles.subtitle}>
        A secure and transparent health data infrastructure platform enabling privacy-preserving research through consented, contributor-owned data.
      </Text>

      <Text style={nativeStyles.heading}>Our Mission</Text>
      <Text style={nativeStyles.body}>
        Web3Health empowers individuals to selectively share health and activity data with approved research partners while retaining full ownership and control. Participants grant granular consent, receive fair compensation, and can revoke access at any time.
      </Text>

      <Text style={nativeStyles.heading}>Our Vision</Text>
      <Text style={nativeStyles.body}>
        A future where health data advances science without compromising individual privacy — where every contributor is informed, protected, and valued.
      </Text>

      <Text style={nativeStyles.heading}>Principal Investigators</Text>
      {professorData.map((m) => (
        <View key={m.id} style={nativeStyles.card}>
          <Text style={nativeStyles.cardName}>{m.name}</Text>
          <Text style={nativeStyles.cardRole}>{m.title}</Text>
          <Text style={nativeStyles.cardDept}>{m.department} · {m.affiliation}</Text>
          <Text style={nativeStyles.cardBio}>{m.bio}</Text>
        </View>
      ))}

      <Text style={nativeStyles.heading}>Development Team</Text>
      {developerData.map((m) => (
        <View key={m.id} style={nativeStyles.card}>
          <Text style={nativeStyles.cardName}>{m.name}</Text>
          <Text style={nativeStyles.cardRole}>{m.title}</Text>
          <Text style={nativeStyles.cardDept}>{m.department}</Text>
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
  heading: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 10,
    marginTop: 24,
  },
  body: {
    fontSize: 15,
    color: '#444444',
    lineHeight: 23,
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#F9F9FB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  cardRole: {
    fontSize: 14,
    fontWeight: '600',
    color: '#B22222',
    marginBottom: 2,
  },
  cardDept: {
    fontSize: 13,
    color: '#888888',
    marginBottom: 6,
  },
  cardBio: {
    fontSize: 13,
    color: '#555555',
    lineHeight: 20,
    marginTop: 4,
  },
});
