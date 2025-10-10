import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert
} from 'react-native';
import { useAuth } from '../hooks/AuthContext'; // Adjust path as needed
import { useRouter } from 'expo-router';

const LoginScreen: React.FC = () => {
  const auth = useAuth();
    const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // This effect handles redirection if the user is already authenticated.
  // It replaces the <Navigate> component from react-router-dom.
  useEffect(() => {
    if (auth.isAuthenticated) {
      // StackActions.replace() removes the login screen from the history,
      // so the user can't go "back" to it. We use router.replace for this.
      router.replace('/studies');
    }
  }, [auth.isAuthenticated, router]);

  const handleLogin = () => {
    // In a real app, you would add validation and an API call here.
    if (!email || !password) {
        Alert.alert("Error", "Please enter both email and password.");
        return;
    }
    
    // UI-only: call the auth context. The useEffect will handle navigation.
    console.log("Attempting to log in with:", email);
    auth.login(email, password);
  };

  return (
    <SafeAreaView style={styles.authRoot}>
      <View style={styles.authCard}>
        <Text style={styles.h2}>Admin Sign in</Text>
        <Text style={styles.authHelp}>
          Sign in to manage your organization's studies and recruitment.
        </Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="you@organization.org"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          secureTextEntry={true} // Hides the password text
        />

        <View style={styles.authActions}>
          <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={handleLogin}>
            <Text style={styles.btnPrimaryText}>Sign in</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/register')}>
            <Text style={styles.link}>Register</Text>
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
    width: 500,
    maxWidth: '80%',
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
  },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnPrimary: {
    backgroundColor: '#4f46e5',
        width: 100,

  },
  btnPrimaryText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  link: {
    color: '#4f46e5',
    fontWeight: '600',
    padding: 8, // Make it easier to tap
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
});

export default LoginScreen;