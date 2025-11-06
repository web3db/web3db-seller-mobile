import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSignUp } from '@clerk/clerk-expo';
// Import the createUser function and payload type from your API file
import { createUser, CreateUserPayload } from './services/users/api';

const VerifyScreen: React.FC = () => {
  // Use the REAL hooks, not mocks
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async () => {
    if (!isLoaded) return;
    setLoading(true);
    setError('');

    console.log('[DEBUG] Attempting email verification with code:', code);

    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (completeSignUp.status === 'complete') {
        console.log('[DEBUG] Clerk verification successful.');

        // This is the critical check
        if (!completeSignUp.createdUserId) {
          console.error(
            '[DEBUG] Verification complete but no createdUserId found.',
          );
          setError(
            'Verification succeeded but user ID was not found. Please try again.',
          );
          setLoading(false);
          return;
        }

        console.log(
          '[DEBUG] Clerk UserID found:',
          completeSignUp.createdUserId,
        );

        // 4. Get the metadata we saved:
        const metadata = completeSignUp.unsafeMetadata as {
          orgName: string;
          birthYear: number | null;
          raceId: number | null;
          sexId: number | null;
          heightNum: number | null;
          heightUnitId: number | null;
          weightNum: number | null;
          weightUnitId: number | null;
          measurementSystemId: number | null;
          roleId: number | null;
          isActive: boolean;
        };
        
        if (!metadata) {
           console.error('[DEBUG] Metadata not found on sign up object.');
           setError('Verification succeeded but user profile data was lost. Please contact support.');
           setLoading(false);
           return;
        }

        // 5. Build the Supabase payload:
        const userPayload: CreateUserPayload = {
          clerkId: completeSignUp.createdUserId,
          email: completeSignUp.emailAddress, // Get email from the verified sign up
          name: metadata.orgName,
          isActive: metadata.isActive,
          birthYear: metadata.birthYear,
          raceId: metadata.raceId,
          sexId: metadata.sexId,
          heightNum: metadata.heightNum,
          heightUnitId: metadata.heightUnitId,
          weightNum: metadata.weightNum,
          weightUnitId: metadata.weightUnitId,
          measurementSystemId: metadata.measurementSystemId,
          roleId: metadata.roleId,
        };

        console.log(
          '[DEBUG] Step 6: Calling createUser (Supabase) with payload:',
          userPayload,
        );

        // 6. Call the createUser API function:
        try {
          await createUser(userPayload);
          console.log('[DEBUG] Successfully created Supabase user.');

          // 7. Set the session active and navigate to the dashboard
          await setActive({ session: completeSignUp.createdSessionId });
          console.log('[DEBUG] Session set active. Navigating to /studies.');
          router.replace('/studies');
        } catch (dbError: any) {
          console.error(
            '[DEBUG] Failed to create Supabase user:',
            dbError.message,
          );
          setError(
            'Your email was verified, but we failed to create your profile. Please contact support.',
          );
        }
      } else {
        // This can happen if the sign-up is not complete for other reasons
        console.warn('[DEBUG] Sign up status not complete:', completeSignUp.status);
        setError('Verification failed. Please try again.');
      }
    } catch (err: any) {
      console.error(
        '[DEBUG] Clerk Verification Error:',
        JSON.stringify(err, null, 2),
      );
      const clerkError =
        err.errors?.[0]?.longMessage || 'Invalid verification code.';
      setError(clerkError);
    } finally {
      setLoading(false);
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
    <SafeAreaView style={styles.authRoot}>
      <View style={styles.authCard}>
        <Text style={styles.h2}>Verify Your Email</Text>
        <Text style={styles.authHelp}>
          Enter the 6-digit code sent to your email address.
        </Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Text style={styles.label}>Verification Code</Text>
        <TextInput
          style={styles.input}
          value={code}
          onChangeText={setCode}
          placeholder="123456"
          keyboardType="number-pad"
          editable={!loading}
          maxLength={6}
        />

        <View style={styles.authActions}>
          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary]}
            onPress={handleVerify}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.btnPrimaryText}>Verify</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

// Reusing styles from login/register for consistency
const styles = StyleSheet.create({
  authRoot: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#f0f2f5',
    padding: 16,
  },
  authCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
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
  authActions: { marginTop: 8 },
  btn: { paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  btnPrimary: { backgroundColor: '#4f46e5' },
  btnPrimaryText: { color: '#ffffff', fontWeight: 'bold', fontSize: 16 },
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '600',
  },
});

export default VerifyScreen;