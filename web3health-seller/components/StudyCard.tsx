import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, palette } from '@/constants/theme';
import { useNavigation, NavigationProp, ParamListBase } from '@react-navigation/native';
import { useRouter } from 'expo-router';

// Define a type for the study object to ensure data consistency
type Study = {
  id: string; // Assuming ID is a string, could also be a number
  title: string;
  type: string;
  description: string;
  organizer: string;
  spots: number;
};

// Define the props type for the StudyCard component
type StudyCardProps = {
  study: Study;
};

const router = useRouter();

// Define the component using React.FC (Functional Component) with its props type
const StudyCard: React.FC<StudyCardProps> = ({ study }) => {
  // Type the navigation hook for better type safety.
  // Replace `ParamListBase` with your RootStackParamList for specific screen names and params.
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  // Navigation functions to call on button press
  const handleViewPress = () => {
    // Navigate to a screen named 'StudyDetail', passing the study's ID as a parameter
    //navigation.navigate('Studies', { studyId: study.id });
    router.push({
      pathname: "/studies/[studyId]",
      params: { studyId: study.id },
    });
  };

  const handleManagePress = () => {
    // Navigate to a screen named 'ManageStudy', passing the study's ID
    //navigation.navigate('ManageStudy', { studyId: study.id });
    router.push({
      pathname: "/studies/[studyId]/manage",
      params: { studyId: study.id },
    });
  };

  return (
    <View style={styles.studyCard}>
      <View style={styles.header}>
        <Text style={styles.title}>{study.title}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{study.type}</Text>
        </View>
      </View>

      <Text style={styles.description}>{study.description}</Text>

      <Text style={styles.secureMuted}>
        Data shared will be de-identified and transferred over secure channels; participants must consent.
      </Text>

      <View style={styles.metaContainer}>
        <Text style={styles.metaText}>
          Organizer: <Text style={styles.boldText}>{study.organizer}</Text>
        </Text>
        <Text style={styles.metaText}>
          Spots: <Text style={styles.boldText}>{study.spots}</Text>
        </Text>
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={handleManagePress}>
          <Text style={styles.btnTextGhost}>Manage</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={handleViewPress}>
          <Text style={styles.btnTextPrimary}>View</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// StyleSheet remains the same
const styles = StyleSheet.create({
  studyCard: {
    backgroundColor: Colors.light.background,
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    // Shadow for iOS
    shadowColor: Colors.light.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    // Elevation for Android
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.text,
    flex: 1, // Ensures title doesn't push badge off-screen
    marginRight: 8,
  },
  badge: {
    backgroundColor: palette.light.surface,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: palette.light.text.secondary,
  },
  description: {
    fontSize: 14,
    color: palette.light.text.secondary,
    lineHeight: 20,
  },
  secureMuted: {
    fontSize: 12,
    color: palette.light.text.muted,
    fontStyle: 'italic',
    marginTop: 12,
  },
  metaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: palette.light.border,
    paddingTop: 12,
  },
  metaText: {
    fontSize: 14,
    color: palette.light.text.secondary,
  },
  boldText: {
    fontWeight: 'bold',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 10,
  },
  btn: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnPrimary: {
    backgroundColor: Colors.light.tint,
  },
  btnTextPrimary: {
    color: palette.light.text.inverse,
    fontWeight: 'bold',
  },
  btnGhost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.light.tint,
  },
  btnTextGhost: {
    color: Colors.light.tint,
    fontWeight: 'bold',
  },
});

export default StudyCard;