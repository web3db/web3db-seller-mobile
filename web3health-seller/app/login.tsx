import React, { useEffect, useState, useCallback } from 'react';
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

// 🔑 CLERK IMPORTS
import { useAuth, useSignIn, useOAuth } from '@clerk/clerk-expo'; 
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { useAuth as localAuth } from '@/hooks/AuthContext';

// Required for Clerk OAuth flow in Expo
WebBrowser.maybeCompleteAuthSession();

const LoginScreen: React.FC = () => {
  const router = useRouter();
  
  // 🔑 Clerk Hooks Initialization
  const { isLoaded: authLoaded, isSignedIn, setActive } = useAuth(); // For checking current auth state
  const { signIn, setActive: setSignInActive, isLoaded: signInLoaded } = useSignIn(); // For email/password flow
  
  // 🔑 OAuth Hook Initialization (Google Example)
  const googleOAuth = useOAuth({ strategy: 'oauth_google' });

  const { login } = localAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Handle Sign In with Google OAuth
  const handleGoogleSignIn = useCallback(async () => {
    try {
      const { createdSessionId, signIn, signUp, setActive } = await googleOAuth.startOAuthFlow();

      if (createdSessionId && setActive) {
        // Session created successfully, user is signed in.
        setActive({ session: createdSessionId });
      } else {
        // Handle other cases (e.g., user needs to complete sign-up)
        // For this example, we'll just log it.
        console.log("OAuth flow started but session not created.", { signIn, signUp });
      }
    } catch (err) {
      console.error("Google OAuth Error", JSON.stringify(err, null, 2));
      setError("Failed to sign in with Google. Please try again.");
    }
  }, [googleOAuth, setActive]);

  // Handle Sign In with Email/Password
  const handleLogin = async () => {
    setError('');
    setLoading(true);

    if (!signInLoaded) {
      setError("Still initializing... Please try again in a moment.");
      setLoading(false);
      return;
    }

    if (!email || !password) {
      setError("Please enter both email and password.");
      setLoading(false);
      return;
    }
    
    try {
      // 🔑 Step 1: Attempt to sign in
      const completeSignIn = await signIn.create({
        identifier: email, // This is your email/username
        password,
      });

      // Check if sign-in is complete (i.e., no MFA required)
      if (completeSignIn.status === 'complete') {
        // 🔑 Step 2: Set the session active.
        // This will automatically trigger the useEffect hook to redirect
        // when the `isSignedIn` state becomes true.
        await setSignInActive({ session: completeSignIn.createdSessionId });
      } else {
        // Handle other statuses (e.g., 'needs_second_factor', 'needs_new_password')
        // For simplicity, we'll log it, but in production, you'd navigate to an MFA screen.
        console.log('Sign-in status:', completeSignIn.status);
        setError("Sign-in requires additional steps. Check console.");
      }

      // Call the local login function
      await login(email);

      router.push('/studies');
      
    } catch (err: any) {
      // Log the full error for debugging
      console.error("Login Error:", JSON.stringify(err, null, 2));

      // Check for Clerk's specific error structure first.
      // If that's not available, fall back to a generic but common login error message.
      // This prevents showing a generic "unknown error" or an empty object '{}'.
      const clerkError =
        err.errors?.[0]?.longMessage ||
        err.message || // Fallback for other error types
        "Your email address and password don't match. Please try again.";
      setError(clerkError);
    } finally {
      setLoading(false);
    }
  };

  // If Clerk is still loading, show a loading indicator
  if (!authLoaded) {
    return (
      <View style={[styles.authRoot, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.authRoot}>
      <View style={styles.authCard}>
        <Text style={styles.h2}>Admin Sign in</Text>
        <Text style={styles.authHelp}>
          Sign in to manage your organization's studies and recruitment.
        </Text>

        {/* Display Error Message */}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

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
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
                <ActivityIndicator color="#ffffff" />
            ) : (
                <Text style={styles.btnPrimaryText}>Sign in</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/register')}>
            <Text style={styles.link}>Register</Text>
          </TouchableOpacity>
        </View>

        {/* Social Sign-in */}
        <View style={styles.socialRow}>
          <TouchableOpacity 
            style={styles.socialBtn} 
            onPress={handleGoogleSignIn}>
            <Text style={styles.socialBtnText}>Sign in with Google</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

// Styles based on the CSS class names you might be using
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
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
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
    gap: 16, // Added gap for better spacing
  },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 100,
    flexGrow: 1, // Allow button to take available space
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
  socialRow: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 24,
    gap: 12,
  },
  socialBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  socialBtnText: {
    color: '#334155',
    fontWeight: '600',
    fontSize: 16,
  },
  errorText: {
    color: '#ef4444', // Red 500
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '600',
  }
});

export default LoginScreen;
