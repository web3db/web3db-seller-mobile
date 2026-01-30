import React, { useState } from 'react';
import { StyleSheet, Platform, ScrollView, Image } from 'react-native';
import LandingNavbar from './LandingNavBar';
import { Ionicons } from '@expo/vector-icons';

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
    marginTop: 64,
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
    width: 250,
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
    <div style={webStyles.benefitsSection}>
      <h2 style={webStyles.benefitsTitle}>Benefits</h2>
      <div style={webStyles.benefitsContent}>
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
        <div style={webStyles.creditsBox}>
          <span style={webStyles.creditsTitle}>Early Member Credits</span>
          <span style={webStyles.creditsText}>
            Early users are eligible for free tokens that can be redeemed later for prizes and cash rewards.
          </span>
        </div>
      </div>
    </div>
  );
}


function Landing() {
  if (Platform.OS === 'web') {
    return (
      <div style={webStyles.pageContainer}>
        <LandingNavbar />
        <div style={webStyles.mainContent}>
          {/* Left Column - Hero Section */}
          <div style={webStyles.heroSection}>
            <h1 style={webStyles.heroTitle}>
              Accelerate <span style={webStyles.heroTitleBold}>health research</span> with <span style={webStyles.heroTitleBold}>consented activity data</span>
            </h1>
            <p style={webStyles.heroSubtitle}>
              <span style={webStyles.heroSubtitleBold}>Web3Health</span> helps organizations recruit participants who already use <span style={webStyles.heroSubtitleBold}>activity trackers</span> and securely collect <span style={webStyles.heroSubtitleBold}>anonymized data</span> for reproducible science.
            </p>
            <button style={webStyles.getStartedButton}>Get Started</button>
            <Partners />
          </div>

          {/* Right Column - Boxes */}
          <div style={webStyles.rightColumn}>
            {/* Image Box */}
            <div style={webStyles.imageBox}>
              <Image
                source={require('../assets/images/LandingPageW.png')}
                style={{ width: '100%', height: 300, borderRadius: 16 }}
                resizeMode="cover"
              />
            </div>

            {/* How It Works Box */}
            <div style={webStyles.howItWorksBox}>
              <h2 style={webStyles.howItWorksTitle}>How it works</h2>
              <div style={webStyles.sectionsContainer}>
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
      </div>
    );
  }

  return (
    <>
    <LandingNavbar/>
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
    </ScrollView>
    </>
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
