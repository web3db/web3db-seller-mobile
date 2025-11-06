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

const VerifyScreen: React.FC = () => {
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async () => {
    if (!isLoaded) return;
    setLoading(true);
    setError('');

    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (completeSignUp.status === 'complete') {
        await setActive({ session: completeSignUp.createdSessionId });
        router.replace('/studies');
      } else {
        // This can happen if the sign-up is not complete for other reasons
        console.log('Sign up status:', completeSignUp.status);
        setError('Verification failed. Please try again.');
      }
    } catch (err: any) {
      console.error("Clerk Verification Error:", JSON.stringify(err, null, 2));
      const clerkError = err.errors?.[0]?.longMessage || 'Invalid verification code.';
      setError(clerkError);
    } finally {
      setLoading(false);
    }
  };

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
  h2: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 8, color: '#1e293b' },
  authHelp: { fontSize: 14, textAlign: 'center', color: '#64748b', marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '500', color: '#334155', marginBottom: 6 },
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