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
import { Colors, palette } from '@/constants/theme';
import { CreateUserPayloadDTO } from './services/users/types';
import { useAuth } from '@clerk/clerk-expo';

import { makeRedirectUri } from "expo-auth-session";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import {supabase} from '../supbase';


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

  // Assume the necessary variables and imports are in scope:
// import { createUser, CreateUserPayloadDTO } from '.../services/users/api';
// const { email, password, orgName, birthYear, raceId, sexId, heightNum, weightNum } = ...;
// const supabase = ...; // Supabase client instance

const handleRegister = async () => {
  try {
    setLoading(true);
    setError('');

    // Required for web and deep linking setup (Steps 1, 2, 3)
    WebBrowser.maybeCompleteAuthSession();
    const redirectTo = makeRedirectUri();

    // 1️⃣ Sign up user (email verification magic link)
    // IMPORTANT: Only pass fields needed for the verification/redirect logic.
    // We remove the physical/metadata fields here, as we will use the dedicated API call later.
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          // Keep minimal metadata if needed, but the main data goes via 'createUser'
          // We will use 'orgName' for 'name' as per the previous request.
          name: orgName, 
        },
      },
    });

    if (signUpError) throw signUpError;
    
    // ... (Steps 2, 3: Wait for email verification and extract tokens) ...
    
    // ... (URL listening and token extraction logic remains the same) ...

    const url = await new Promise<string | null>((resolve) => {
        // ... (existing Linking.addEventListener and setTimeout logic) ...
        const sub = Linking.addEventListener('url', ({ url }) => {
            sub.remove();
            resolve(url);
        });
        setTimeout(() => {
            sub.remove();
            resolve(null);
        }, 60000); // Increased timeout to 1 minute
    });

    if (!url) {
      alert('Check your email to verify your account.');
      return;
    }

    const { params, errorCode } = QueryParams.getQueryParams(url);
    if (errorCode) throw new Error(errorCode);
    const { access_token, refresh_token } = params;
    if (!access_token || !refresh_token) return;

    // 4️⃣ Create Supabase session
    const { error: sessionError } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });

    if (sessionError) throw sessionError;
    
    // 5️⃣ Call the dedicated API function to create the MST_User record
    // This happens AFTER successful authentication/session creation.
    
    const user = (await supabase.auth.getUser()).data.user;
    if (!user || !user.id) {
        throw new Error("Could not retrieve user ID after session creation.");
    }
    
    const registrationPayload: CreateUserPayloadDTO = {
      clerkId: user.id,            // The Supabase Auth ID
      email: user.email!,          // The user's email
      name: orgName,               // Using 'orgName' for the user's display name
      birthYear: Number(birthYear),
      raceId: Number(raceId),
      sexId: Number(sexId),
      heightNum: Number(heightNum),
      weightNum: Number(weightNum),
      // We assume default unit IDs are handled by the database or left null
      // heightUnitId: Number(heightUnitId),
      // weightUnitId: Number(weightUnitId),
      // measurementSystemId: Number(measurementSystemId),
      roleId: 2,                   // Role ID is hardcoded to 2
      isActive: true,
    };
    
    // The createUser function uses your API client to call the Edge Function
    const newUser = await createUser(registrationPayload);
    
    console.log("MST_User record created successfully:", newUser);

    alert('Account verified and signed in!');
    
  } catch (err: any) {
    setError(err.message ?? 'Registration failed');
  } finally {
    setLoading(false);
  }
};
  

  /*const handleRegister = async () => {
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
  }; */

  if (!isLoaded) {
    return (
      <View
        style={[
          styles.authRoot,
          { justifyContent: 'center', alignItems: 'center' },
        ]}
      >
        <ActivityIndicator size="large" color={Colors.light.tint} />
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
              <ActivityIndicator color={palette.light.text.inverse} />
            ) : (
              <Text style={styles.btnPrimaryText}>Create Account</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/login')}>
            <Text style={styles.link}>Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/verify')}>
            <Text style={styles.link}>Test</Text>
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
    backgroundColor: palette.light.surface,
  },
  safeArea: {
    flex: 1,
    backgroundColor: palette.light.surface,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    shadowColor: Colors.light.text,
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
    color: Colors.light.text,
  },
  authHelp: {
    fontSize: 14,
    textAlign: 'center',
    color: palette.light.text.secondary,
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: palette.light.text.secondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: palette.light.surface,
    borderWidth: 1,
    borderColor: palette.light.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
    color: Colors.light.text, // Added text color for input
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
    backgroundColor: Colors.light.tint,
  },
  btnPrimaryText: {
    color: palette.light.text.inverse,
    fontWeight: 'bold',
    fontSize: 16,
  },
  link: {
    color: Colors.light.tint,
    fontWeight: '600',
    padding: 8,
  },
  errorText: {
    color: palette.light.danger,
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '600',
  },
  dropdownPaneInline: {
    borderWidth: 1,
    borderColor: palette.light.border,
    backgroundColor: Colors.light.background,
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
    borderBottomColor: palette.light.muted,
  },
  dropdownItemText: {
    fontSize: 15,
    color: Colors.light.text,
  },
  dropdownToggle: {
    borderWidth: 1,
    borderColor: palette.light.border,
    padding: 10,
    borderRadius: 8,
    backgroundColor: Colors.light.background,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 44,
  },
  dropdownOpen: { borderColor: Colors.light.tint, shadowColor: Colors.light.tint, elevation: 2 },
  dropdownText: { color: Colors.light.text },
  dropdownChevron: { color: palette.light.text.muted, marginLeft: 8 },
  dropdownPane: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: palette.light.border,
    borderRadius: 8,
    maxHeight: 240,
    backgroundColor: Colors.light.background,
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
    borderColor: palette.light.border,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: Colors.light.tint, borderColor: Colors.light.tint },
  checkboxTick: { color: palette.light.text.inverse, fontSize: 12 },
  metricLabel: { fontSize: 14 },
  muted: { color: palette.light.text.muted },
});

export default RegisterScreen;