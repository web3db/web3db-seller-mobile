import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert, // Note: Alert may not work as expected in Expo Go on web.
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSignUp, useClerk } from '@clerk/clerk-expo'; // Import useClerk for later
import { listSexes, listRaces, createUser, CreateUserPayload } from './services/users/api';
import { Modal, FlatList } from 'react-native';
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
  const [sexes, setSexes] = useState<Array<{sexId:number; sexCode:string; displayName:string; isActive:boolean}>>([]);
  const [sexDropdownOpen, setSexDropdownOpen] = useState(false);
  const [races, setRaces] = useState<Array<{raceId:number; raceCode:string; displayName:string; isActive:boolean}>>([]);
  const [raceDropdownOpen, setRaceDropdownOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [sexItems, raceItems] = await Promise.all([listSexes(), listRaces()]);
        if (!mounted) return;
        setSexes(sexItems);
        setRaces(raceItems);
        // Intentionally do NOT auto-select a default value; user must choose
        // this keeps the placeholder 'Select ...' visible and makes these fields required.
      } catch (err) {
        console.warn('Failed to load sexes or races', err);
      }
    })();
    return () => { mounted = false; };
  }, []);
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

    console.log('[DEBUG] Starting registration process...');

    const missing: string[] = [];
    if (!orgName) missing.push('Organization Name');
    if (!email) missing.push('Email');
    if (!password) missing.push('Password');
    if (!birthYear) missing.push('Birth Year');
    if (!raceId) missing.push('Race');
    if (!sexId) missing.push('Gender');
    if (!heightNum) missing.push('Height');
    if (!weightNum) missing.push('Weight');

    if (missing.length > 0) {
      setError(`Please fill out required fields: ${missing.join(', ')}`);
      setLoading(false);
      console.warn('[DEBUG] Validation failed: Missing', missing);
      return;
    }

    try {
      // Step 1: Pass ALL form data into unsafeMetadata
      // This is so we can retrieve it AFTER email verification
      const userMetadata = {
        orgName: orgName,
        birthYear: parseInt(birthYear, 10) || null,
        raceId: parseInt(raceId, 10) || null,
        sexId: parseInt(sexId, 10) || null,
        heightNum: parseFloat(heightNum) || null,
        heightUnitId: parseInt(heightUnitId, 10) || null,
        weightNum: parseFloat(weightNum) || null,
        weightUnitId: parseInt(weightUnitId, 10) || null,
        measurementSystemId: parseInt(measurementSystemId, 10) || null,
        roleId: 2, // Default role
        isActive: true,
      };

      console.log(
        '[DEBUG] Step 1: Attempting Clerk sign up with payload and metadata:',
      );
      console.log('Email:', email);
      console.log('Metadata:', userMetadata);

      // Create the user in Clerk
      await signUp.create({
        emailAddress: email,
        password,
        unsafeMetadata: userMetadata, // Pass ALL data here
      });

      // NOTE: signUp.createdUserId will NOT exist yet.
      // We no longer call createUser() from this screen.

      //await signOut();

      //await login(email);

      // Step 3: Prepare for email verification
      //await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });

      // Step 4: Navigate to the verification screen
      //router.push('/verify');
    } catch (err: any) {
      console.error('Clerk Sign Up Error:', JSON.stringify(err, null, 2));
      // Provide clearer messaging for captcha-related failures which are
      // commonly returned by Clerk when a captcha/reCAPTCHA token is required
      const rawMsg =
        err.errors?.[0]?.longMessage || err.errors?.[0]?.message || err.message || '';

      const lc = String(rawMsg).toLowerCase();
      if (lc.includes('captcha') || lc.includes('recaptcha') || lc.includes('hcaptcha')) {
        // Friendly guidance for developers/users: in dev you can disable captcha
        // in the Clerk dashboard, or configure the site key for reCAPTCHA on the
        // frontend. On production ensure your Clerk settings include the correct
        // captcha provider/site key for your domain.
        setError(
          'Signup blocked by CAPTCHA requirement. In development you can disable CAPTCHA in your Clerk dashboard, or configure reCAPTCHA site keys for your frontend environment. See console for full error details.'
        );
        console.warn('Clerk CAPTCHA error details:', err);
      } else {
        const clerkError = rawMsg || 'An unknown error occurred during sign-up';
        setError(clerkError);
      }
    } finally {
      setLoading(false);

      await signOut({ redirectUrl: '/login' }); // Sign out to clear any session

      //router.push('/login');
    }
  };

  if (!isLoaded) {
    return (
      <View
        style={[
          styles.authRoot,
          { justifyContent: 'center', alignItems: 'center' },
        ]}
      >
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
        <Text style={styles.label}>Race</Text>
        <TouchableOpacity
          style={[styles.dropdownToggle, raceDropdownOpen && styles.dropdownOpen]}
          onPress={() => setRaceDropdownOpen((v) => !v)}
          activeOpacity={0.8}
        >
          <Text style={styles.dropdownText}>
            {raceId
              ? (races.find((r) => String(r.raceId) === raceId)?.displayName ?? `Race ${raceId}`)
              : 'Select race...'}
          </Text>
          <Text style={styles.dropdownChevron}>{raceDropdownOpen ? '▴' : '▾'}</Text>
        </TouchableOpacity>

        {raceDropdownOpen && (
          <View style={styles.dropdownPane}>
            <FlatList
              data={races.filter((r) => r.isActive)}
              keyExtractor={(it) => String(it.raceId)}
              style={{ maxHeight: 160 }}
              nestedScrollEnabled
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.metricRow}
                  onPress={() => {
                    setRaceId(String(item.raceId));
                    setRaceDropdownOpen(false);
                  }}
                >
                  <Text style={styles.metricLabel}>{item.displayName}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        <Text style={styles.label}>Gender</Text>
        <TouchableOpacity
          style={[styles.dropdownToggle, sexDropdownOpen && styles.dropdownOpen]}
          onPress={() => setSexDropdownOpen((v) => !v)}
          activeOpacity={0.8}
        >
          <Text style={styles.dropdownText}>
            {sexId
              ? (sexes.find((s) => String(s.sexId) === sexId)?.displayName ?? `Sex ${sexId}`)
              : 'Select gender...'}
          </Text>
          <Text style={styles.dropdownChevron}>{sexDropdownOpen ? '▴' : '▾'}</Text>
        </TouchableOpacity>

        {sexDropdownOpen && (
          <View style={styles.dropdownPane}>
            <FlatList
              data={sexes.filter((s) => s.isActive)}
              keyExtractor={(it) => String(it.sexId)}
              style={{ maxHeight: 160 }}
              nestedScrollEnabled
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.metricRow}
                  onPress={() => {
                    setSexId(String(item.sexId));
                    setSexDropdownOpen(false);
                  }}
                >
                  <Text style={styles.metricLabel}>{item.displayName}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

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
    marginVertical: 24, // Added margin for scroll view on web/tablet
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
    color: '#1e293b', // Added text color for input
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
  },
  dropdownPaneInline: {
    borderWidth: 1,
    borderColor: '#e6e6e6',
    backgroundColor: '#fff',
    borderRadius: 8,
    marginTop: 8,
    // Ensure the dropdown matches the field width and sits inline
    overflow: 'hidden',
    zIndex: 50,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dropdownItemText: {
    fontSize: 15,
    color: '#111827',
  },
  dropdownToggle: {
    borderWidth: 1,
    borderColor: '#e6e6e6',
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 44,
  },
  dropdownOpen: { borderColor: '#0b74ff', shadowColor: '#0b74ff', elevation: 2 },
  dropdownText: { color: '#111827' },
  dropdownChevron: { color: '#6b7280', marginLeft: 8 },
  dropdownPane: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e6e6e6',
    borderRadius: 8,
    maxHeight: 240,
    backgroundColor: '#fff',
    paddingVertical: 6,
  },
  metricRow: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    height: 20,
    width: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: '#0b74ff', borderColor: '#0b74ff' },
  checkboxTick: { color: '#fff', fontSize: 12 },
  metricLabel: { fontSize: 14 },
  muted: { color: '#8b8b8b' },
});

export default RegisterScreen;