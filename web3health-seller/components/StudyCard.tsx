import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation, NavigationProp, ParamListBase } from '@react-navigation/native';

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

// Define the component using React.FC (Functional Component) with its props type
const StudyCard: React.FC<StudyCardProps> = ({ study }) => {
  // Type the navigation hook for better type safety.
  // Replace `ParamListBase` with your RootStackParamList for specific screen names and params.
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  // Navigation functions to call on button press
  const handleViewPress = () => {
    // Navigate to a screen named 'StudyDetail', passing the study's ID as a parameter
    navigation.navigate('StudyDetail', { studyId: study.id });
  };

  const handleManagePress = () => {
    // Navigate to a screen named 'ManageStudy', passing the study's ID
    navigation.navigate('ManageStudy', { studyId: study.id });
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
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    // Shadow for iOS
    shadowColor: '#000',
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
    color: '#333',
    flex: 1, // Ensures title doesn't push badge off-screen
    marginRight: 8,
  },
  badge: {
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555',
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  secureMuted: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
    marginTop: 12,
  },
  metaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  metaText: {
    fontSize: 14,
    color: '#444',
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
    backgroundColor: '#007bff',
  },
  btnTextPrimary: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  btnGhost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#007bff',
  },
  btnTextGhost: {
    color: '#007bff',
    fontWeight: 'bold',
  },
});

export default StudyCard;