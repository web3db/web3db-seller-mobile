import React, { useState } from 'react';
import {
    SafeAreaView,
    ScrollView,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
// No longer need to import Picker

type Study = {
    id: string; title: string; type: string; description: string; organizer: string; spots: number;
};

const AddStudyScreen: React.FC = () => {
  const router = useRouter();
  
  const [title, setTitle] = useState('');
  const [type, setType] = useState('Remote'); // State is still 'Remote' or 'In-Person'
  const [description, setDescription] = useState('');
  const [organizer, setOrganizer] = useState('Your Organization');
  const [spots, setSpots] = useState('');

  const handleSubmit = async () => {
    if (!title || !description || !organizer || !spots) {
        Alert.alert('Error', 'Please fill out all fields.');
        return;
    }

    const newStudy: Study = {
        id: `study_${Date.now()}`, // Simple unique ID
        title,
        type,
        description,
        organizer,
        spots: parseInt(spots, 10),
    };

    try {
        const existingStudiesJSON = await AsyncStorage.getItem('studies');
        const existingStudies: Study[] = existingStudiesJSON ? JSON.parse(existingStudiesJSON) : [];
        await AsyncStorage.setItem('studies', JSON.stringify([...existingStudies, newStudy]));
        router.replace('/studies');
    } catch (error) {
        Alert.alert('Error', 'Failed to save the study.');
        console.error('Failed to save study to AsyncStorage', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.card}>
          <Text style={styles.header}>Create a new study</Text>
          <Text style={styles.subHeader}>
            Fill out the details below to create a new research study.
          </Text>

          {/* ... Title input ... */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Title</Text>
            <TextInput style={styles.input} value={title} onChangeText={setTitle} />
          </View>
          
          {/* --- NEW SEGMENTED CONTROL --- */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Type</Text>
            <View style={styles.segmentedControlContainer}>
              <TouchableOpacity
                style={[styles.segmentButton, type === 'Remote' && styles.segmentButtonActive]}
                onPress={() => setType('Remote')}
              >
                <Text style={[styles.segmentButtonText, type === 'Remote' && styles.segmentButtonTextActive]}>
                  Remote
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segmentButton, type === 'In-Person' && styles.segmentButtonActive]}
                onPress={() => setType('In-Person')}
              >
                <Text style={[styles.segmentButtonText, type === 'In-Person' && styles.segmentButtonTextActive]}>
                  In-Person
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          {/* --- END OF NEW CODE --- */}

          {/* ... Other inputs ... */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput style={[styles.input, styles.textarea]} value={description} onChangeText={setDescription} multiline={true} numberOfLines={4}/>
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Organizer</Text>
            <TextInput style={styles.input} value={organizer} onChangeText={setOrganizer} />
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Available Spots</Text>
            <TextInput style={styles.input} value={spots} onChangeText={setSpots} keyboardType="numeric" />
          </View>

          <TouchableOpacity style={styles.button} onPress={handleSubmit}>
            <Text style={styles.buttonText}>Create</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};


const styles = StyleSheet.create({
  // ... (previous styles for container, card, header, etc. remain the same)
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  scrollContainer: { padding: 16 },
  card: { backgroundColor: '#ffffff', padding: 24, borderRadius: 12, elevation: 3 },
  header: { fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
  subHeader: { fontSize: 14, color: '#6b7280', marginBottom: 24 },
  formGroup: { marginBottom: 16 },
  label: { fontSize: 16, fontWeight: '500', marginBottom: 8, color: '#374151' },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, backgroundColor: '#ffffff' },
  textarea: { minHeight: 100, textAlignVertical: 'top' },
  button: { backgroundColor: '#4f46e5', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  buttonText: { color: '#ffffff', fontWeight: 'bold', fontSize: 16 },

  // --- NEW STYLES FOR SEGMENTED CONTROL ---
  segmentedControlContainer: {
    flexDirection: 'row',
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentButtonActive: {
    backgroundColor: '#ffffff',
    borderRadius: 7,
    margin: 2,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  segmentButtonText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  segmentButtonTextActive: {
    fontWeight: 'bold',
    color: '#4f46e5',
  },
});

export default AddStudyScreen;