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
  Modal, // Import Modal
  FlatList, // Import FlatList
} from 'react-native';

// --- Screen Component ---
const AddStudyScreen: React.FC = () => {
  const [type, setType] = useState('Remote');
  const [isPickerVisible, setPickerVisible] = useState(false); // State to control modal
  const studyTypes = [{label: 'Remote', value: 'Remote'}, {label: 'In-person', value: 'In-person'}];

  // ... (other states and functions)

  const handleSelectType = (selectedValue: string) => {
    setType(selectedValue);
    setPickerVisible(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.card}>
          {/* ... other inputs ... */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Type</Text>
            <TouchableOpacity 
              style={styles.pickerInput} 
              onPress={() => setPickerVisible(true)}
            >
              <Text style={styles.pickerInputText}>{type}</Text>
              <Text>▼</Text>
            </TouchableOpacity>
          </View>
          {/* ... other inputs and button ... */}
        </View>
      </ScrollView>

      {/* --- MODAL PICKER --- */}
      <Modal
        visible={isPickerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPickerVisible(false)}
      >
        <TouchableOpacity style={styles.modalBackdrop} onPress={() => setPickerVisible(false)}>
          <View style={styles.modalContent}>
            <FlatList
              data={studyTypes}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.modalOption}
                  onPress={() => handleSelectType(item.value)}
                >
                  <Text style={styles.modalOptionText}>{item.label}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

// --- Styles (add these to your existing StyleSheet) ---
const styles = StyleSheet.create({
  // ... (all previous styles)
  pickerInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
  },
  pickerInputText: {
    fontSize: 16,
  },
  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    width: '80%',
    maxHeight: '50%',
  },
  modalOption: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalOptionText: {
    fontSize: 18,
    textAlign: 'center',
  },
});