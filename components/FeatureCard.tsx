import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, palette } from '@/constants/theme';

// 1. Define the type for the component's props
type FeatureCardProps = {
  title: string;
  desc: string;
};

// 2. Define the component using React.FC with the props type
const FeatureCard: React.FC<FeatureCardProps> = ({ title, desc }) => {
  return (
    // 3. Use <View> instead of <div> and apply styles from the StyleSheet
    <View style={styles.card}>
      {/* 4. Use <Text> for all text elements like <h3> and <p> */}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{desc}</Text>
    </View>
  );
};

// 5. Create a StyleSheet to define the component's appearance
const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.light.background,
    borderRadius: 8,
    padding: 20,
    marginVertical: 8,
    marginHorizontal: 16,
    // Shadow for iOS
    shadowColor: Colors.light.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    // Elevation for Android
    elevation: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: palette.light.text.muted, // A muted gray color
    lineHeight: 20,
  },
});

export default FeatureCard;