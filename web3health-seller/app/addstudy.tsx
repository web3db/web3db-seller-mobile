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
import { useNavigation, NavigationProp, ParamListBase } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';

// --- Utility Function to Save Data (Async) ---
const saveStudy = async (study: object) => {
  try {
    const rawStudies = await AsyncStorage.getItem('studies');
    const studies = rawStudies ? JSON.parse(rawStudies) : [];
    studies.unshift(study);
    await AsyncStorage.setItem('studies', JSON.stringify(studies));
  } catch (e) {
    console.error("Failed to save study.", e);
    Alert.alert("Error", "There was an issue saving the study.");
  }
};


// --- The Screen Component ---
const AddStudyScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  
  // State for each form field
  const [title, setTitle] = useState('');
  const [type, setType] = useState('Remote'); // Default value for the picker
  const [description, setDescription] = useState('');
  const [organizer, setOrganizer] = useState('Your Organization');
  const [spots, setSpots] = useState('');

  const handleSubmit = async () => {
    if (!title || !description) {
      Alert.alert("Validation Error", "Please fill out the Title and Description fields.");
      return;
    }

    const study = {
      id: 's_' + Date.now(),
      title,
      type,
      description,
      organizer,
      spots: Number(spots) || 0,
      participants: 0,
    };

    await saveStudy(study);
    navigation.navigate('Studies'); // Navigate after saving
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.card}>
          <Text style={styles.header}>Create a new study</Text>
          <Text style={styles.subHeader}>
            Fill out the details below to create a new research study. This will be visible to potential participants.
          </Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Title</Text>
            <TextInput style={styles.input} value={title} onChangeText={setTitle} />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Type</Text>
            <View style={styles.pickerContainer}>
              <Picker selectedValue={type} onValueChange={(itemValue) => setType(itemValue)}>
                <Picker.Item label="Remote" value="Remote" />
                <Picker.Item label="In-person" value="In-person" />
              </Picker>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={description}
              onChangeText={setDescription}
              multiline={true}
              numberOfLines={4}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Organizer</Text>
            <TextInput style={styles.input} value={organizer} onChangeText={setOrganizer} />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Available Spots</Text>
            <TextInput
              style={styles.input}
              value={spots}
              onChangeText={setSpots}
              placeholder="e.g., 500"
              keyboardType="numeric"
            />
          </View>

          <TouchableOpacity style={styles.button} onPress={handleSubmit}>
            <Text style={styles.buttonText}>Create</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// --- Styles based on your provided CSS ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  scrollContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    padding: 24, // Converted from 1.5rem and 2em
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subHeader: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 24,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#374151',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#ffffff',
  },
  textarea: {
    minHeight: 100,
    textAlignVertical: 'top', // Ensures text starts at the top
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  button: {
    backgroundColor: '#4f46e5',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default AddStudyScreen;