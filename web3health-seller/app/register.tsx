import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { useNavigation, NavigationProp, ParamListBase } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage'; // This import is correct
import { useAuth } from '../hooks/AuthContext'; // Adjust path as needed

const RegisterScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const auth = useAuth();
  
  const [orgName, setOrgName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // This effect handles redirection if the user is already authenticated.
  useEffect(() => {
    if (auth.isAuthenticated) {
      navigation.replace('studies');
    }
  }, [auth.isAuthenticated, navigation]);

  const handleRegister = async () => {
    // Basic validation
    if (!orgName || !email || !password) {
      Alert.alert("Error", "Please fill out all fields.");
      return;
    }
    
    try {
      // 1. Replicate localStorage with AsyncStorage (it's async!)
      const org = { name: orgName };
      await AsyncStorage.setItem('org', JSON.stringify(org));
      
      // 2. UI-only: call the auth context. The useEffect will handle navigation.
      console.log("Registering and logging in with:", email);
      auth.login({ email, org: org.name });
    } catch (error) {
      console.error("Failed to save organization data", error);
      Alert.alert("Error", "Could not save registration data.");
    }
  };

  return (
    <SafeAreaView style={styles.authRoot}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.authCard}>
          <Text style={styles.h2}>Admin Registration</Text>
          <Text style={styles.p}>
            Create an admin account for your organization. This demo saves data locally only.
          </Text>

          <View style={styles.label}>
            <Text style={styles.labelText}>Organization name</Text>
            <TextInput
              style={styles.input}
              value={orgName}
              onChangeText={setOrgName}
              placeholder="Organization, e.g. Sleep Labs"
              autoCapitalize="words"
            />
          </View>
          
          <View style={styles.label}>
            <Text style={styles.labelText}>Admin email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="admin@org.org"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.label}>
            <Text style={styles.labelText}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Choose a strong password"
              secureTextEntry={true}
            />
          </View>

          <View style={styles.authActions}>
            <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={handleRegister}>
              <Text style={styles.btnPrimaryText}>Create account</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.socialRow}>
            <TouchableOpacity style={styles.socialBtn}>
              <Text style={styles.socialBtnText}>Continue with Google</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialBtn}>
              <Text style={styles.socialBtnText}>Continue with SSO</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// Re-using the same styles from the Login screen for consistency
const styles = StyleSheet.create({
  authRoot: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
authCard: {
    marginTop: 24,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    width: 500,
    maxWidth: '80%',
    alignSelf: 'center',
  },
  h2: {
    marginBottom: 4,
    color: '#0f172a',
    fontSize: 24,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  p: {
    marginBottom: 24,
    color: '#6b7280',
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
  label: {
    marginBottom: 16,
  },
  labelText: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },
  input: {
    width: '100%',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    color: '#0f172a',
    fontSize: 16,
    marginTop: 4,
  },
  authActions: {
    marginTop: 24,
  },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnPrimary: {
    backgroundColor: '#4f46e5',
    width: '100%',
  },
  btnPrimaryText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 24,
  },
  socialBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialBtnText: {
    fontWeight: '600',
    color: '#374151',
    fontSize: 15,
  },
});

export default RegisterScreen;