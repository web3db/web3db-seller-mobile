import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';

// Re-importing the simple FeatureCard and StudyCard components from earlier
import FeatureCard from '../../components/FeatureCard';
import StudyCard from '../../components/StudyCard';

// --- Data ---
type Study = {
  id: string; title: string; type: string; description: string; organizer: string; spots: number;
};

const sampleStudies: Study[] = [
  {
    id: 'pa1',
    title: '4‑Week Physical Activity Study',
    type: 'Remote',
    description: 'A four-week study collecting step counts and activity patterns from participants who already use an activity tracker (phone or wearable).',
    organizer: 'Web3Health',
    spots: 500,
  },
];

const features = [
  { title: 'Secure data sharing', desc: 'End-to-end encrypted transfers, de-identification, and access controls for research-grade datasets.' },
  { title: 'Scalable recruitment', desc: 'Tools to simplify participant sign-up, eligibility screening and enrollment tracking.' },
  { title: 'Transparency & consent', desc: 'Capture fine-grained consent and provenance metadata for reproducible research.' },
];

const howItWorksSteps = [
    'Organizations create a study and define eligibility criteria for participants.',
    'Participants consent and securely share anonymized step/activity data from their devices.',
    'Researchers analyze aggregated datasets with clear, verifiable data provenance.',
];

// --- HomeScreen Component ---
const HomeScreen: React.FC = () => {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.homeRoot}>
        {/* Hero Section */}
        <View style={styles.heroLanding}>
            <View style={styles.heroLandingCopy}>
              <Text style={styles.h1}>Accelerate health research with consented activity data</Text>
              <Text style={styles.muted}>
                Web3Health helps organizations recruit participants who already use activity trackers and securely collect anonymized data for reproducible science.
              </Text>
              <View style={styles.heroActions}>
                <TouchableOpacity 
                  style={[styles.btn, styles.btnPrimary]} 
                  onPress={() => router.push('/login')}
                >
                  <Text style={styles.btnTextPrimary}>Get started</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.btn, styles.btnGhost]}
                >
                  <Text style={styles.btnTextGhost}>Learn more</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.heroLandingVisual}>
              <View style={styles.featuredStudy}>
                <Text style={styles.h3}>Featured study</Text>
                <StudyCard study={sampleStudies[0]} />
              </View>
            </View>
        </View>

        {/* Features Section */}
        <View style={styles.features}>
          <Text style={styles.h2}>Platform features</Text>
          <View style={styles.featuresGrid}>
            {features.map((feature, index) => (
              <FeatureCard key={index} title={feature.title} desc={feature.desc} />
            ))}
          </View>
        </View>

        {/* How It Works Section */}
        <View style={styles.howItWorks}>
          <Text style={styles.h2}>How it works</Text>
          <View style={styles.howItWorksGrid}>
            {howItWorksSteps.map((step, index) => (
                <View key={index} style={styles.howItWorksItem}>
                    <View style={styles.stepCounter}>
                        <Text style={styles.stepCounterText}>{index + 1}</Text>
                    </View>
                    <Text style={styles.stepText}>{step}</Text>
                </View>
            ))}
          </View>
        </View>
        
        {/* Security Section */}
        <View style={styles.security}>
            <Text style={styles.h2}>Security & privacy</Text>
            <Text style={styles.muted}>We recommend de-identification, minimal collection, and cryptographic protections. The platform is designed to support these practices so organizations can safely accelerate science.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// --- Styles Translated from Your CSS ---
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  homeRoot: {
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  h1: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  h2: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 16,
  },
  h3: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  muted: {
    color: '#6b7280',
    fontSize: 16,
    lineHeight: 24,
  },
  // Hero Section
  heroLanding: {
    // Simplified from linear-gradient
    backgroundColor: '#f8fafc',
    paddingVertical: 48,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.04)',
    flexDirection: 'row', // Arrange children side-by-side
    gap: 16, // Add space between the two columns
    alignItems: 'center', // Align items vertically in the center
  },
  heroLandingCopy: {
    flex: 1, // Allow this column to take available space
  },
  heroLandingVisual: {
    flex: 1, // Allow this column to take available space
  },
  heroActions: {
    marginTop: 16,
    flexDirection: 'row',
  },
  featuredStudy: {},
  // Buttons
  btn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  btnPrimary: {
    backgroundColor: '#4f46e5',
  },
  btnTextPrimary: {
    color: 'white',
    fontWeight: '600',
  },
  btnGhost: {
    borderColor: '#cbd5e1',
    backgroundColor: 'transparent',
    marginLeft: 8,
  },
  btnTextGhost: {
    color: '#374151',
    fontWeight: '600',
  },
  // Features Section
  features: {
    marginTop: 64,
  },
  featuresGrid: {
    // display: flex is default, gap is supported
    gap: 16,
  },
  // How It Works Section
  howItWorks: {
    marginTop: 64,
  },
  howItWorksGrid: {
    marginTop: 24,
    gap: 24,
  },
  howItWorksItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  stepCounter: {
    // Recreating the ::before pseudo-element
    width: 36,
    height: 36,
    borderRadius: 18, // half of width/height
    backgroundColor: '#eef2ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCounterText: {
    fontWeight: '700',
    fontSize: 20,
    color: '#4338ca',
  },
  stepText: {
    flex: 1, // Allows text to wrap
    fontSize: 16,
    lineHeight: 24,
    color: '#334155', // A suitable color from your other styles
  },
  // Security Section
  security: {
    marginTop: 64,
  },
});

export default HomeScreen;