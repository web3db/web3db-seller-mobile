import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSignUp } from '@clerk/clerk-expo';
import { createUser, CreateUserPayload } from './services/users/api'; // Correctly import from the user API
import { useAuth as localAuth } from '@/hooks/AuthContext';
import { CreateUserPayloadDTO } from './services/users/types';
import { useAuth } from '@clerk/clerk-expo';

const RegisterScreen: React.FC = () => {
  const { isLoaded, signUp } = useSignUp();
  const { signOut } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [raceId, setRaceId] = useState('');
  const [sexId, setSexId] = useState('');
  const [heightNum, setHeightNum] = useState('');
  const [weightNum, setWeightNum] = useState('');
  // For simplicity, we'll assume IDs for units. In a real app, you'd fetch these.
  const [heightUnitId, setHeightUnitId] = useState('1'); // e.g., 1 for 'cm'
  const [weightUnitId, setWeightUnitId] = useState('1'); // e.g., 1 for 'kg'
  const [measurementSystemId, setMeasurementSystemId] = useState('1'); // e.g., 1 for 'Metric'

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = localAuth();

  const handleRegister = async () => {
    if (!isLoaded) return;
    setLoading(true);
    setError('');

    if (!orgName || !email || !password || !birthYear) { // Added birthYear to required fields
      setError("Please fill out all fields.");
      setLoading(false);
      return;
    }

    try {
      // Step 1: Create the user in Clerk
      const signUpAttempt = await signUp.create({
        emailAddress: email,
        password,
        unsafeMetadata: { orgName },
      });

      // Step 2: If Clerk user is created, insert into Supabase
      if (signUpAttempt.createdUserId) {
        // Construct the payload for our new API function
        const userPayload: CreateUserPayload = {
          ClerkId: signUpAttempt.createdUserId,
          Email: email,
          Name: orgName,
          IsActive: true,
          BirthYear: parseInt(birthYear, 10) || null,
          RaceId: parseInt(raceId, 10) || null,
          SexId: parseInt(sexId, 10) || null,
          HeightNum: parseFloat(heightNum) || null,
          // HeightUnitId, WeightUnitId, and MeasurementSystemId are not in CreateUserPayload
          // Add them to the type if they should be passed to the API.
          RoleId: 2, // Default role for a new seller
        };

        const dbPayload: CreateUserPayloadDTO = {
          clerkId: signUpAttempt.createdUserId,
          email: email,
          name: orgName,
          birthYear: parseInt(birthYear, 10) || 0,
          heightNum: parseFloat(heightNum) || null,
          weightNum: parseFloat(weightNum) || null,
          raceId: parseInt(raceId, 10) || null,
          sexId: parseInt(sexId, 10) || null,
          roleId: 2, // Default role for a new seller
        };

        // Call the centralized API function, similar to createTrnPosting
        const response = await createUser(dbPayload);

        // You can optionally log the response from your database
        console.log("Successfully created user in DB:", response); 
      }

      //await signOut();

      

      //await login(email);

      // Step 3: Prepare for email verification
      //await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });

      // Step 4: Navigate to the verification screen
      //router.push('/verify');
    } catch (err: any) {
      console.error("Clerk Sign Up Error:", JSON.stringify(err, null, 2));
      const clerkError = err.errors?.[0]?.longMessage || err.errors?.[0]?.message || 'An unknown error occurred during sign-up';
      setError(clerkError);
    } finally {
      setLoading(false);

      await signOut({ redirectUrl: '/login' }); // Sign out to clear any session

      //router.push('/login');
    }
  };

  if (!isLoaded) {
    return (
      <View style={[styles.authRoot, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.h2}>Admin Registration</Text>
        <Text style={styles.authHelp}>
          Create an admin account for your organization.
        </Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Text style={styles.label}>Organization Name</Text>
        <TextInput
          style={styles.input}
          value={orgName}
          onChangeText={setOrgName}
          placeholder="Your Organization, Inc."
          editable={!loading}
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="you@organization.org"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
        />

        <Text style={styles.label}>Birth Year</Text>
        <TextInput
          style={styles.input}
          value={birthYear}
          onChangeText={setBirthYear}
          placeholder="YYYY"
          keyboardType="number-pad"
          maxLength={4}
          editable={!loading}
        />

        {/* For simplicity, these are text inputs. In a real app, use dropdowns. */}
        <Text style={styles.label}>Race ID</Text>
        <TextInput
          style={styles.input}
          value={raceId}
          onChangeText={setRaceId}
          placeholder="Enter Race ID (e.g., 1, 2, 3)"
          keyboardType="number-pad"
          editable={!loading}
        />

        <Text style={styles.label}>Sex ID</Text>
        <TextInput
          style={styles.input}
          value={sexId}
          onChangeText={setSexId}
          placeholder="Enter Sex ID (e.g., 1 for Male, 2 for Female)"
          keyboardType="number-pad"
          editable={!loading}
        />

        <View style={styles.row}>
          <View style={styles.flex}>
            <Text style={styles.label}>Height</Text>
            <TextInput
              style={styles.input}
              value={heightNum}
              onChangeText={setHeightNum}
              placeholder="e.g., 180"
              keyboardType="numeric"
              editable={!loading}
            />
          </View>
          <View style={styles.flex}>
            <Text style={styles.label}>Weight</Text>
            <TextInput
              style={styles.input}
              value={weightNum}
              onChangeText={setWeightNum}
              placeholder="e.g., 75"
              keyboardType="numeric"
              editable={!loading}
            />
          </View>
        </View>

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          secureTextEntry={true}
          editable={!loading}
        />

        <View style={styles.authActions}>
          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.btnPrimaryText}>Create Account</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/login')}>
            <Text style={styles.link}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// Reusing styles from login.tsx for consistency
const styles = StyleSheet.create({
  authRoot: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
  },
  authCard: {
    // This style is no longer the main container, but can be used for inner cards if needed.
    // For now, we've moved its properties to scrollContainer
  },
  h2: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#1e293b',
  },
  authHelp: {
    fontSize: 14,
    textAlign: 'center',
    color: '#64748b',
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  authActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    gap: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  flex: {
    flex: 1,
  },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    flexGrow: 1,
  },
  btnPrimary: {
    backgroundColor: '#4f46e5',
  },
  btnPrimaryText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  link: {
    color: '#4f46e5',
    fontWeight: '600',
    padding: 8,
  },
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '600',
  }
});

export default RegisterScreen;
