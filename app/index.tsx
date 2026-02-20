import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Platform, ScrollView, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter} from 'expo-router';

const router = useRouter();

// Web-specific styles
const webStyles: Record<string, React.CSSProperties> = {
  pageContainer: {
    minHeight: '100vh',
    backgroundColor: '#FFFFFF',
    overflowX: 'hidden',
    overflowY: 'auto',
  },
  mainContent: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingLeft: 80,
    paddingRight: 80,
    paddingTop: 140,
    paddingBottom: 100,
    gap: 60,
    flexWrap: 'wrap',
  },
  heroSection: {
    flex: 1,
    minWidth: 300,
    maxWidth: 500,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    paddingTop: 0,
  },
  heroTitle: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 'clamp(32px, 4vw, 48px)' as any,
    fontWeight: '400',
    color: '#1a1a1a',
    lineHeight: 1.2,
    marginBottom: 24,
  },
  heroTitleBold: {
    fontWeight: '700',
  },
  heroSubtitle: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 'clamp(16px, 1.5vw, 18px)' as any,
    fontWeight: '400',
    color: '#666666',
    lineHeight: 1.6,
    marginBottom: 32,
  },
  heroSubtitleBold: {
    fontWeight: '600',
    color: '#1a1a1a',
  },
  getStartedButton: {
    display: 'inline-block',
    backgroundColor: '#B22222',
    color: '#FFFFFF',
    fontFamily: 'Barlow, sans-serif',
    fontSize: 18,
    fontWeight: '600',
    paddingTop: 14,
    paddingBottom: 14,
    paddingLeft: 32,
    paddingRight: 32,
    borderRadius: 12,
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(178, 34, 34, 0.3)',
    width: 'fit-content',
  },
  rightColumn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    flex: 2,
    minWidth: 300,
    maxWidth: 1000,
  },
  imageBox: {
    width: '100%',
    maxWidth: 900,
    minWidth: 300,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
    overflow: 'hidden',
    height: 300,
    marginTop: -100,
  },
  howItWorksBox: {
    width: '100%',
    maxWidth: 900,
    minWidth: 300,
    marginTop: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
    boxSizing: 'border-box',
  },
  howItWorksTitle: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 32,
    color: '#1a1a1a',
  },
  sectionsContainer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 24,
  },
  section: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(178, 34, 34, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  sectionDescription: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 14,
    fontWeight: '400',
    color: '#666666',
    lineHeight: 1.5,
  },
  // Partners Styles
  partnersSection: {
    marginTop: 80,
    width: '100%',
    maxWidth: 500,
  },
  partnersHeader: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 13,
    fontWeight: '600',
    color: '#888888',
    textTransform: 'uppercase',
    letterSpacing: '1.5px',
    marginBottom: 20,
  },
  partnersMarquee: {
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  partnersTrack: {
    display: 'flex',
    flexDirection: 'row',
    gap: 24,
    animation: 'marquee 20s linear infinite',
    width: 'fit-content',
  },
  partnerCard: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    paddingLeft: 16,
    paddingRight: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    flexShrink: 0,
  },
  partnerCardHover: {
    transform: 'translateY(-4px)',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
  },
  partnerLogo: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#f8f8f8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  partnerName: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  // Benefits Section Styles
  benefitsSection: {
    width: '100%',
    maxWidth: 1000,
    minWidth: 300,
    marginTop: 24,
  },
  benefitsTitle: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 24,
    color: '#1a1a1a',
  },
  benefitsContent: {
    display: 'flex',
    flexDirection: 'row',
    gap: 20,
    alignItems: 'stretch',
  },
  bulletList: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  bulletItem: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  bulletCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(178, 34, 34, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  bulletText: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 14,
    fontWeight: '400',
    color: '#444444',
    lineHeight: 1.5,
  },
  creditsBox: {
    width: 350,
    flexShrink: 0,
    borderRadius: 16,
    padding: 14,
    paddingTop: 12,
    paddingBottom: 12,
    boxShadow: '0 4px 16px rgba(178, 34, 34, 0.25)',
    background: '#B22222',
    backgroundImage: `
      linear-gradient(135deg, #C62828 0%, #8B0000 100%),
      radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 1px, transparent 1px),
      radial-gradient(circle at 75% 75%, rgba(255,255,255,0.08) 1px, transparent 1px),
      radial-gradient(circle at 50% 50%, rgba(255,255,255,0.05) 2px, transparent 2px)
    `,
    backgroundSize: '100% 100%, 20px 20px, 20px 20px, 30px 30px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
  },
  creditsTitle: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  creditsText: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 13,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 1.5,
  },
  // Why Choose Us Styles
  whyChooseUsSection: {
    paddingLeft: 80,
    paddingRight: 80,
    paddingTop: 0,
    paddingBottom: 80,
    marginTop: -30,
  },
  whyChooseUsTitle: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 'clamp(28px, 3vw, 36px)' as any,
    fontWeight: '700',
    textAlign: 'center',
    color: '#1a1a1a',
    marginBottom: 56,
  },
  whyChooseUsColumns: {
    display: 'flex',
    flexDirection: 'row',
    gap: 48,
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  whyChooseUsItem: {
    flex: 1,
    minWidth: 280,
    maxWidth: 400,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  whyChooseUsIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: 'rgba(178, 34, 34, 0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  whyChooseUsSubtitle: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 14,
  },
  whyChooseUsText: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 15,
    fontWeight: '400',
    color: '#555555',
    lineHeight: 1.7,
  },
  // Featured Study Styles
  featuredStudySection: {
    paddingLeft: 80,
    paddingRight: 80,
    paddingTop: 0,
    paddingBottom: 80,
    marginTop: -30,
  },
  featuredStudyTitle: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 'clamp(28px, 3vw, 36px)' as any,
    fontWeight: '700',
    textAlign: 'center',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  featuredStudySubtitle: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 16,
    fontWeight: '400',
    color: '#666666',
    textAlign: 'center',
    marginBottom: 48,
    lineHeight: 1.5,
  },
  featuredStudyCard: {
    maxWidth: 960,
    margin: '0 auto',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    boxShadow: '0 8px 40px rgba(0, 0, 0, 0.08)',
    overflow: 'hidden',
    border: '1px solid rgba(0, 0, 0, 0.04)',
  },
  featuredStudyCardHeader: {
    background: 'linear-gradient(135deg, #C62828 0%, #8B0000 100%)',
    padding: 32,
    paddingBottom: 28,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 16,
  },
  featuredStudyCardTitle: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 1.3,
    maxWidth: 600,
  },
  featuredStudyStatusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(8px)',
    padding: '6px 14px',
    borderRadius: 20,
    fontFamily: 'Barlow, sans-serif',
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    flexShrink: 0,
  },
  featuredStudyCardBody: {
    padding: 32,
  },
  featuredStudySummary: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 16,
    fontWeight: '400',
    color: '#444444',
    lineHeight: 1.7,
    marginBottom: 28,
  },
  featuredStudyGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' as any,
    gap: 20,
    marginBottom: 28,
  },
  featuredStudyStatBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: '#F9F9FB',
    borderRadius: 12,
    border: '1px solid rgba(0, 0, 0, 0.04)',
  },
  featuredStudyStatIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(178, 34, 34, 0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  featuredStudyStatLabel: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 12,
    fontWeight: '600',
    color: '#888888',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: 4,
  },
  featuredStudyStatValue: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  featuredStudyMetricsRow: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 28,
  },
  featuredStudyMetricTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 14px',
    backgroundColor: 'rgba(178, 34, 34, 0.06)',
    borderRadius: 20,
    fontFamily: 'Barlow, sans-serif',
    fontSize: 13,
    fontWeight: '500',
    color: '#B22222',
  },
  featuredStudyConditionsRow: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 28,
  },
  featuredStudyConditionTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 14px',
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    fontFamily: 'Barlow, sans-serif',
    fontSize: 13,
    fontWeight: '500',
    color: '#555555',
  },
  featuredStudyDivider: {
    height: 1,
    backgroundColor: '#EEEEEE',
    marginBottom: 24,
  },
  featuredStudyFooter: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
  },
  featuredStudyParticipants: {
    display: 'flex',
    flexDirection: 'column',
  },
  featuredStudyParticipantsCount: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  featuredStudyParticipantsLabel: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 13,
    fontWeight: '400',
    color: '#888888',
    marginTop: 2,
  },
  featuredStudyProgressBar: {
    width: 200,
    height: 6,
    backgroundColor: '#EEEEEE',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 6,
  },
  featuredStudyProgressFill: {
    height: '100%',
    backgroundColor: '#B22222',
    borderRadius: 3,
  },
  featuredStudyCta: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#B22222',
    color: '#FFFFFF',
    fontFamily: 'Barlow, sans-serif',
    fontSize: 16,
    fontWeight: '600',
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: 28,
    paddingRight: 28,
    borderRadius: 12,
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(178, 34, 34, 0.3)',
  },
  // Footer Styles
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
    textTransform: 'uppercase',
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
    textTransform: 'uppercase',
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

// Placeholder partner data - replace with real logos/names
const partnerData = [
  { name: 'University Of Georgia', color: '#B22222',logo: require('../assets/images/Companylogo.png') },
  { name: 'University of Notre Dame', color: '#B22222', logo: require('../assets/images/NotreDame.png') },
  { name: 'Web3db', color: '#B22222' , logo: require('../assets/images/WEB3.png')},
];

function Partners() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Trigger entrance animation on mount
  React.useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Duplicate partners for seamless marquee loop
  const duplicatedPartners = [...partnerData, ...partnerData];

  return (
    <div
      className="landing-partners"
      style={{
        ...webStyles.partnersSection,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 0.6s ease, transform 0.6s ease',
      }}
    >
      {/* Inject keyframes for marquee */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .partner-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
        }
      `}</style>

      <span style={webStyles.partnersHeader}>Supported By</span>

      <div style={webStyles.partnersMarquee}>
        <div style={webStyles.partnersTrack}>
          {duplicatedPartners.map((partner, index) => (
            <div
              key={index}
              className="partner-card"
              style={{
                ...webStyles.partnerCard,
                ...(hoveredIndex === index ? webStyles.partnerCardHover : {}),
              }}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <div style={webStyles.partnerLogo}>
                {partner.logo && (
                  <Image
                    source={partner.logo}
                    style={{ width: 40, height: 40 }}
                    resizeMode="contain"
                  />
                )}
              </div>
              <span style={webStyles.partnerName}>{partner.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const benefitItems = [
  'End-to-end encrypted transfers, de-identification, and access controls for research-grade datasets.',
  'Tools to simplify participant sign-up, eligibility screening and enrollment tracking.',
  'Capture fine-grained consent and provenance metadata for reproducible research.',
];

function Benefits() {
  return (
    <div className="landing-benefits" style={webStyles.benefitsSection}>
      <h2 style={webStyles.benefitsTitle}>Benefits</h2>
      <div className="landing-benefits-content" style={webStyles.benefitsContent}>
        <div style={webStyles.bulletList}>
          {benefitItems.map((item, index) => (
            <div key={index} style={webStyles.bulletItem}>
              <div style={webStyles.bulletCheck}>
                <Ionicons name="checkmark" size={14} color="#B22222" />
              </div>
              <span style={webStyles.bulletText}>{item}</span>
            </div>
          ))}
        </div>
        <div className="landing-credits-box" style={webStyles.creditsBox}>
          <span style={webStyles.creditsTitle}>Early Member Credits</span>
          <span style={webStyles.creditsText}>
            Early users are eligible for free tokens that can be redeemed later for prizes and cash rewards.
          </span>
        </div>
      </div>
    </div>
  );
}


const whyChooseUsData = [
  {
    icon: 'shield-checkmark-outline' as const,
    title: 'Decentralized Security',
    text: 'Your data stays yours. Our decentralized architecture removes central points of failure, eliminating the risk of massive breaches. Health metrics are encrypted across a secure network where only you hold the keys\u2014giving you full digital sovereignty over who sees your information and when.',
  },
  {
    icon: 'flask-outline' as const,
    title: 'Privacy-Preserving Research',
    text: 'Contribute to groundbreaking studies while staying completely anonymous. Our NSF-backed privacy protocols let researchers gain vital insights without ever identifying you personally. Help solve complex health problems while your real identity remains fully protected.',
  },
  {
    icon: 'cash-outline' as const,
    title: 'Incentivized Contribution',
    text: 'Get rewarded for the data you already generate. Through our transparent reward system, you earn direct compensation for every study you complete or dataset you share. A blockchain-backed economy where your commitment to a healthier lifestyle literally pays off.',
  },
];

function WhyChooseUs() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={sectionRef} className="landing-wcu" style={webStyles.whyChooseUsSection}>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <h2
        style={{
          ...webStyles.whyChooseUsTitle,
          opacity: isVisible ? 1 : 0,
          animation: isVisible ? 'fadeInUp 0.6s ease forwards' : 'none',
        }}
      >
        Why Choose Us
      </h2>

      <div className="landing-wcu-columns" style={webStyles.whyChooseUsColumns}>
        {whyChooseUsData.map((item, index) => (
          <div
            key={index}
            className="landing-wcu-item"
            style={{
              ...webStyles.whyChooseUsItem,
              opacity: isVisible ? 1 : 0,
              animation: isVisible
                ? `fadeInUp 0.6s ease ${0.2 + index * 0.15}s forwards`
                : 'none',
            }}
          >
            <div style={webStyles.whyChooseUsIcon}>
              <Ionicons name={item.icon} size={30} color="#B22222" />
            </div>
            <span style={webStyles.whyChooseUsSubtitle}>{item.title}</span>
            <span style={webStyles.whyChooseUsText}>{item.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const featuredStudyData = {
  title: 'Impact of Daily Step Count on Cardiovascular Health Outcomes',
  summary:
    'A 90-day observational study examining correlations between daily step count patterns, resting heart rate trends, and long-term cardiovascular risk markers in adults aged 30-65.',
  buyerDisplayName: 'University of Georgia - College of Public Health',
  postingStatusDisplayName: 'Actively Recruiting',
  applyOpenAt: '2026-01-15',
  applyCloseAt: '2026-04-15',
  dataCoverageDaysRequired: 90,
  minAge: 30,
  rewardTypeDisplayName: 'Digital Token',
  rewardValue: 150,
  metricDisplayNames: ['Daily Step Count', 'Resting Heart Rate', 'Sleep Duration', 'Active Minutes'],
  healthConditions: [
    { id: 1, displayName: 'Hypertension' },
    { id: 2, displayName: 'Type 2 Diabetes' },
  ],
  participantCount: 248,
  spotsRemaining: 52,
};

function FeaturedStudy() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const study = featuredStudyData;
  const enrollmentPercent = Math.round(
    (study.participantCount / (study.participantCount + study.spotsRemaining)) * 100
  );

  return (
    <div ref={sectionRef} className="landing-fs" style={webStyles.featuredStudySection}>
      <h2 style={{
        ...webStyles.featuredStudyTitle,
        opacity: isVisible ? 1 : 0,
        animation: isVisible ? 'fadeInUp 0.6s ease forwards' : 'none',
      }}>
        Featured Study
      </h2>
      <p style={{
        ...webStyles.featuredStudySubtitle,
        opacity: isVisible ? 1 : 0,
        animation: isVisible ? 'fadeInUp 0.6s ease 0.1s forwards' : 'none',
      }}>
        See what active research looks like on Web3Health
      </p>

      <div style={{
        ...webStyles.featuredStudyCard,
        opacity: isVisible ? 1 : 0,
        animation: isVisible ? 'fadeInUp 0.6s ease 0.2s forwards' : 'none',
      }}>
        {/* Header */}
        <div className="landing-fs-header" style={webStyles.featuredStudyCardHeader}>
          <span className="landing-fs-card-title" style={webStyles.featuredStudyCardTitle}>{study.title}</span>
          <span style={webStyles.featuredStudyStatusBadge}>
            <Ionicons name="ellipse" size={8} color="#4ADE80" />
            {study.postingStatusDisplayName}
          </span>
        </div>

        {/* Body */}
        <div className="landing-fs-body" style={webStyles.featuredStudyCardBody}>
          <p style={webStyles.featuredStudySummary}>{study.summary}</p>

          {/* Stats Grid */}
          <div className="landing-fs-grid" style={webStyles.featuredStudyGrid}>
            <div style={webStyles.featuredStudyStatBox}>
              <div style={webStyles.featuredStudyStatIcon}>
                <Ionicons name="gift-outline" size={18} color="#B22222" />
              </div>
              <span style={webStyles.featuredStudyStatLabel}>Reward</span>
              <span style={webStyles.featuredStudyStatValue}>{study.rewardValue} {study.rewardTypeDisplayName}s</span>
            </div>
            <div style={webStyles.featuredStudyStatBox}>
              <div style={webStyles.featuredStudyStatIcon}>
                <Ionicons name="calendar-outline" size={18} color="#B22222" />
              </div>
              <span style={webStyles.featuredStudyStatLabel}>Duration</span>
              <span style={webStyles.featuredStudyStatValue}>{study.dataCoverageDaysRequired} days</span>
            </div>
            <div style={webStyles.featuredStudyStatBox}>
              <div style={webStyles.featuredStudyStatIcon}>
                <Ionicons name="people-outline" size={18} color="#B22222" />
              </div>
              <span style={webStyles.featuredStudyStatLabel}>Min Age</span>
              <span style={webStyles.featuredStudyStatValue}>{study.minAge}+</span>
            </div>
            <div style={webStyles.featuredStudyStatBox}>
              <div style={webStyles.featuredStudyStatIcon}>
                <Ionicons name="time-outline" size={18} color="#B22222" />
              </div>
              <span style={webStyles.featuredStudyStatLabel}>Apply By</span>
              <span style={webStyles.featuredStudyStatValue}>
                {new Date(study.applyCloseAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          </div>

          {/* Metrics */}
          <span style={{ ...webStyles.featuredStudyStatLabel, display: 'block', marginBottom: 10 }}>
            Tracked Health Metrics
          </span>
          <div style={webStyles.featuredStudyMetricsRow}>
            {study.metricDisplayNames.map((metric, i) => (
              <span key={i} style={webStyles.featuredStudyMetricTag}>
                <Ionicons name="pulse-outline" size={14} color="#B22222" />
                {metric}
              </span>
            ))}
          </div>

          {/* Health Conditions */}
          <span style={{ ...webStyles.featuredStudyStatLabel, display: 'block', marginBottom: 10 }}>
            Target Health Conditions
          </span>
          <div style={webStyles.featuredStudyConditionsRow}>
            {study.healthConditions.map((condition) => (
              <span key={condition.id} style={webStyles.featuredStudyConditionTag}>
                <Ionicons name="medical-outline" size={14} color="#555555" />
                {condition.displayName}
              </span>
            ))}
          </div>

          {/* Divider */}
          <div style={webStyles.featuredStudyDivider} />

          {/* Footer */}
          <div style={webStyles.featuredStudyFooter}>
            <div style={webStyles.featuredStudyParticipants}>
              <span style={webStyles.featuredStudyParticipantsCount}>
                {study.participantCount} enrolled &middot; {study.spotsRemaining} spots remaining
              </span>
              <span style={webStyles.featuredStudyParticipantsLabel}>
                Organized by {study.buyerDisplayName}
              </span>
              <div style={webStyles.featuredStudyProgressBar}>
                <div style={{ ...webStyles.featuredStudyProgressFill, width: `${enrollmentPercent}%` }} />
              </div>
            </div>
            <span style={webStyles.featuredStudyCta}>
              Get Started
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="landing-footer" style={webStyles.footer}>
      <style>{`
        .footer-link:hover { color: rgba(255, 255, 255, 0.9) !important; }
      `}</style>
      <div className="landing-footer-content" style={webStyles.footerContent}>
        {/* Left Column - Brand */}
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

        {/* Middle Column - Navigation Links */}
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
          <a className="footer-link" style={webStyles.footerLink} href="agp44843@uga.edu">
            Contact
          </a>
        </div>

        {/* Right Column - Legal */}
        <div className="landing-footer-legal" style={webStyles.footerLegal}>
          <span style={webStyles.footerLegalTitle}>Legal</span>
          <span className="footer-link" style={webStyles.footerLegalLink} onClick={() => router.push('/privacy-policy' as any)}>Privacy Policy</span>
          <span className="footer-link" style={webStyles.footerLegalLink}>Terms of Service</span>
        </div>
      </div>

      <div style={webStyles.footerDivider} />

      <div className="landing-footer-bottom" style={webStyles.footerBottom}>
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

function Landing() {
  if (Platform.OS === 'web') {
    return (
      <div style={webStyles.pageContainer}>
        <style>{`
          /* ---- Tablet ---- */
          @media (max-width: 900px) {
            .landing-main {
              flex-direction: column !important;
              padding-left: 32px !important;
              padding-right: 32px !important;
              padding-top: 110px !important;
              gap: 40px !important;
            }
            .landing-hero {
              max-width: 100% !important;
            }
            .landing-right-col {
              align-items: stretch !important;
              max-width: 100% !important;
            }
            .landing-image-box {
              margin-top: 0 !important;
            }
            .landing-wcu,
            .landing-fs,
            .landing-footer {
              padding-left: 32px !important;
              padding-right: 32px !important;
            }
          }
          /* ---- Small tablet / large phone ---- */
          @media (max-width: 768px) {
            .landing-main {
              padding-left: 24px !important;
              padding-right: 24px !important;
              padding-top: 100px !important;
              padding-bottom: 60px !important;
            }
            .landing-hiw-sections {
              flex-direction: column !important;
              gap: 20px !important;
            }
            .landing-benefits-content {
              flex-direction: column !important;
            }
            .landing-credits-box {
              width: 100% !important;
            }
            .landing-wcu,
            .landing-fs,
            .landing-footer {
              padding-left: 24px !important;
              padding-right: 24px !important;
            }
            .landing-wcu-columns {
              gap: 32px !important;
            }
            .landing-wcu-item {
              min-width: 240px !important;
            }
            .landing-footer-content {
              flex-direction: column !important;
              gap: 32px !important;
            }
            .landing-footer-legal {
              align-items: flex-start !important;
            }
            .landing-footer-bottom {
              flex-direction: column !important;
              align-items: flex-start !important;
            }
            .landing-fs-header {
              padding: 24px !important;
            }
            .landing-fs-body {
              padding: 24px !important;
            }
          }
          /* ---- Phone ---- */
          @media (max-width: 480px) {
            .landing-main {
              padding-left: 16px !important;
              padding-right: 16px !important;
              padding-top: 80px !important;
              padding-bottom: 48px !important;
              gap: 24px !important;
            }
            .landing-hero {
              min-width: unset !important;
            }
            .landing-right-col {
              min-width: unset !important;
            }
            .landing-image-box {
              min-width: unset !important;
              height: 200px !important;
            }
            .landing-image-box img {
              height: 200px !important;
            }
            .landing-hiw-box {
              min-width: unset !important;
              padding: 20px !important;
            }
            .landing-benefits {
              min-width: unset !important;
            }
            .landing-wcu,
            .landing-fs,
            .landing-footer {
              padding-left: 16px !important;
              padding-right: 16px !important;
            }
            .landing-wcu {
              padding-bottom: 48px !important;
            }
            .landing-wcu-item {
              min-width: 100% !important;
              max-width: 100% !important;
            }
            .landing-fs-header {
              padding: 20px !important;
            }
            .landing-fs-body {
              padding: 20px !important;
            }
            .landing-fs-grid {
              grid-template-columns: 1fr 1fr !important;
            }
            .landing-fs-card-title {
              font-size: 18px !important;
            }
            .landing-partners {
              margin-top: 48px !important;
            }
          }
        `}</style>
        <div className="landing-main" style={webStyles.mainContent}>
          {/* Left Column - Hero Section */}
          <div className="landing-hero" style={webStyles.heroSection}>
            <h1 style={webStyles.heroTitle}>
              Accelerate <span style={webStyles.heroTitleBold}>health research</span> with <span style={webStyles.heroTitleBold}>consented activity data</span>
            </h1>
            <p style={webStyles.heroSubtitle}>
              <span style={webStyles.heroSubtitleBold}>Web3Health</span> helps organizations recruit participants who already use <span style={webStyles.heroSubtitleBold}>activity trackers</span> and securely collect <span style={webStyles.heroSubtitleBold}>anonymized data</span> for reproducible science.
            </p>
            <TouchableOpacity onPress={() => router.push('/login')}> 
              <div style={webStyles.getStartedButton}> Get Started</div>
            </TouchableOpacity>
            <Partners />
          </div>

          {/* Right Column - Boxes */}
          <div className="landing-right-col" style={webStyles.rightColumn}>
            {/* Image Box */}
            <div className="landing-image-box" style={webStyles.imageBox}>
              <Image
                source={require('../assets/images/LandingPageW.png')}
                style={{ width: '100%', height: 300, borderRadius: 16 }}
                resizeMode="cover"
              />
            </div>

            {/* How It Works Box */}
            <div className="landing-hiw-box" style={webStyles.howItWorksBox}>
              <h2 style={webStyles.howItWorksTitle}>How it works</h2>
              <div className="landing-hiw-sections" style={webStyles.sectionsContainer}>
                {/* Create Section */}
                <div style={webStyles.section}>
                  <div style={webStyles.iconContainer}>
                    <Ionicons name="create-outline" size={24} color="#B22222" />
                  </div>
                  <span style={webStyles.sectionTitle}>Create</span>
                  <span style={webStyles.sectionDescription}>
                    Organizations create a study and define eligibility criteria for participants.
                  </span>
                </div>

                {/* Secure Section */}
                <div style={webStyles.section}>
                  <div style={webStyles.iconContainer}>
                    <Ionicons name="shield-checkmark-outline" size={24} color="#B22222" />
                  </div>
                  <span style={webStyles.sectionTitle}>Secure</span>
                  <span style={webStyles.sectionDescription}>
                    Participants consent and securely share anonymized step/activity data from their devices.
                  </span>
                </div>

                {/* Data Section */}
                <div style={webStyles.section}>
                  <div style={webStyles.iconContainer}>
                    <Ionicons name="analytics-outline" size={24} color="#B22222" />
                  </div>
                  <span style={webStyles.sectionTitle}>Data</span>
                  <span style={webStyles.sectionDescription}>
                    Researchers analyze aggregated datasets with clear, verifiable data provenance.
                  </span>
                </div>
              </div>
            </div>

            {/* Benefits Section */}
            <Benefits />
          </div>
        </div>

        {/* Why Choose Us - Full Width Section */}
        <WhyChooseUs />

        {/* Featured Study Section */}
        <FeaturedStudy />

        {/* Footer */}
        <Footer />
      </div>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 70,
  },
});

export default Landing;
