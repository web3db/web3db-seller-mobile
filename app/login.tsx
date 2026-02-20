import React, { useEffect, useState } from "react";
import { Colors, palette } from "@/constants/theme";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth, useSignIn, useSession } from "@clerk/clerk-expo";
import * as WebBrowser from "expo-web-browser";

import { useAuth as localAuth } from "@/hooks/AuthContext";

// Required for Clerk OAuth flow in Expo
WebBrowser.maybeCompleteAuthSession();

const LoginScreen: React.FC = () => {
  const router = useRouter();

  // 🔑 Clerk Hooks Initialization
  const { isLoaded: authLoaded, isSignedIn, setActive } = useAuth(); // For checking current auth state
   const {
    signIn,
    setActive: setSignInActive,
    isLoaded: signInLoaded,
  } = useSignIn(); // For email/password flow

  const { isLoaded: sessionLoaded, session } = useSession();

  // Post-auth gate: after session activation, we check session.currentTask before proceeding.
  const [postAuthPending, setPostAuthPending] = useState(false);
  const [postAuthEmail, setPostAuthEmail] = useState<string | null>(null);

  const isResetPasswordTask = React.useCallback((s: any) => {
    const task = s?.currentTask;
    const key = task?.key ?? task?.name ?? task;
    return key === "reset-password";
  }, []);

  const { login } = localAuth();


  useEffect(() => {
    if (!authLoaded || !sessionLoaded) return;

    // If signed in AND reset-password task exists, force reset screen.
    if (isSignedIn && session && isResetPasswordTask(session)) {
      router.replace("/reset-required");
      return;
    }

    // Normal signed-in flow.
    if (isSignedIn) {
      router.replace("/studies");
      return;
    }

    console.log("[LOGIN] authLoaded =", authLoaded, "isSignedIn =", isSignedIn);
  }, [authLoaded, sessionLoaded, isSignedIn, session, router, isResetPasswordTask]);


  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Client Trust / step-up (Email OTP)
  const [needsOtp, setNeedsOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const finalizeSignedInSession = async (createdSessionId: string) => {
    // Save email and mark post-auth pending so session effect can decide next route.
    const normEmail = email.trim().toLowerCase();
    setPostAuthEmail(normEmail);
    setPostAuthPending(true);

    // Activate Clerk session first
    await setSignInActive({ session: createdSessionId });

    // Do NOT call login() or navigate here. The session effect below will route:
    // - /reset-required if reset-password task exists
    // - otherwise run login() and route /studies
  };


  // Handle Sign In with Email/Password
  const handleLogin = async () => {
      setError("");
    setLoading(true);

    if (postAuthPending) {
      setLoading(false);
      return;
    }


    if (!signInLoaded) {
      setError("Still initializing... Please try again in a moment.");
      setLoading(false);
      return;
    }

    if (isSignedIn) {
      setLoading(false);
      router.replace("/studies");
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
      // If sign-in is complete, activate session and proceed
      if (completeSignIn.status === "complete") {
        await finalizeSignedInSession(completeSignIn.createdSessionId);
        return;
      }

      // Client Trust can require a second factor on new devices.
      // Clerk indicates this via `needs_second_factor` and `email_code` support. :contentReference[oaicite:1]{index=1}
      if (completeSignIn.status === "needs_second_factor") {
        const supported = (completeSignIn as any)?.supportedSecondFactors ?? [];
        const supportsEmailCode = supported.some(
          (f: any) => f?.strategy === "email_code" || f === "email_code"
        );

        if (!supportsEmailCode) {
          console.log("Sign-in needs second factor, supported:", supported);
          setError(
            "Second-factor is required, but email OTP is not available."
          );
          return;
        }

        // Send the Email OTP
        await (signIn as any).prepareSecondFactor({ strategy: "email_code" });

        // Switch UI to OTP entry step
        setNeedsOtp(true);
        setOtpCode("");
        setError("");
        return;
      }

      // Any other status: surface it for debugging
      console.log("Sign-in status:", completeSignIn.status);
      setError(`Sign-in requires additional steps: ${completeSignIn.status}`);
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

  const handleVerifyOtp = async () => {
     setError("");
    setLoading(true);

    if (postAuthPending) {
      setLoading(false);
      return;
    }


    if (!signInLoaded) {
      setError("Still initializing... Please try again in a moment.");
      setLoading(false);
      return;
    }

    if (!otpCode || otpCode.length !== 6) {
      setError("Please enter the 6-digit code.");
      setLoading(false);
      return;
    }

    try {
      const result = await (signIn as any).attemptSecondFactor({
        strategy: "email_code",
        code: otpCode,
      });

      if (result.status === "complete") {
        await finalizeSignedInSession(result.createdSessionId);
        return;
      }

      console.log("OTP verify status:", result.status);
      setError("Verification did not complete. Please try again.");
    } catch (err: any) {
      console.error("OTP Verify Error:", JSON.stringify(err, null, 2));
      const msg =
        err.errors?.[0]?.longMessage ||
        err.errors?.[0]?.message ||
        err.message ||
        "Invalid code. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Post-auth decision: once session is active, either force reset-required or proceed normally.
  useEffect(() => {
    if (!authLoaded || !sessionLoaded) return;
    if (!postAuthPending) return;
    if (!session) return;

    const emailForHydration = postAuthEmail;
    if (!emailForHydration) {
      setPostAuthPending(false);
      return;
    }

    if (isResetPasswordTask(session)) {
      setPostAuthPending(false);
      router.replace("/reset-required");
      return;
    }

    (async () => {
      try {
        await login(emailForHydration);
        router.replace("/studies");
      } finally {
        setPostAuthPending(false);
      }
    })();
  }, [
    authLoaded,
    sessionLoaded,
    session,
    postAuthPending,
    postAuthEmail,
    router,
    login,
    isResetPasswordTask,
  ]);

  // If Clerk is still loading, show a loading indicator


  if (!authLoaded) {
    return (
      <View
        style={[
          styles.authRoot,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color={Colors.light.tint} />
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

        {!needsOtp ? (
          <>
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
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secureTextEntry={!showPassword}
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((v) => !v)}
                disabled={loading || postAuthPending}
                style={styles.toggleBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.toggleBtnText}>
                  {showPassword ? "Hide" : "Show"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.forgotRow}>
              <TouchableOpacity
                onPress={() => {
                  console.log(
                    "[LOGIN] tapped forgot-password, isSignedIn =",
                    isSignedIn
                  );
                  router.push("/forgot-password");
                }}
                disabled={loading || postAuthPending}
                activeOpacity={0.7}
              >
                <Text style={styles.forgotLink}>Forgot password?</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.authActions}>
              <TouchableOpacity
                style={[styles.btn, styles.btnPrimary]}
                onPress={handleLogin}
                disabled={loading || postAuthPending}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color={palette.light.text.inverse} />
                ) : (
                  <Text style={styles.btnPrimaryText}>Sign in</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push("/register")}>
                <Text style={styles.link}>Register</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.h2}>Verify sign-in</Text>
            <Text style={styles.authHelp}>
              Enter the 6-digit code sent to your email to finish signing in.
            </Text>

            <Text style={styles.label}>Verification Code</Text>
            <TextInput
              style={styles.input}
              value={otpCode}
              onChangeText={setOtpCode}
              placeholder="123456"
              keyboardType="number-pad"
              editable={!loading}
              maxLength={6}
            />

            <View style={styles.authActions}>
              <TouchableOpacity
                style={[styles.btn, styles.btnPrimary]}
                onPress={handleVerifyOtp}
                disabled={loading || postAuthPending}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color={palette.light.text.inverse} />
                ) : (
                  <Text style={styles.btnPrimaryText}>Verify</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setNeedsOtp(false);
                  setOtpCode("");
                  setError("");
                }}
                disabled={loading || postAuthPending}
              >
                <Text style={styles.link}>Back</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Social Sign-in
        <View style={styles.socialRow}>
          <TouchableOpacity
            style={styles.socialBtn}
            onPress={handleGoogleSignIn}
          >
            <Text style={styles.socialBtnText}>Sign in with Google</Text>
          </TouchableOpacity>
        </View> */}
      </View>
    </SafeAreaView>
  );
};

// Styles based on the CSS class names you might be using
const styles = StyleSheet.create({
  authRoot: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: palette.light.surface,
    padding: 16,
  },
  authCard: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 24,
    shadowColor: Colors.light.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    maxWidth: 500,
    width: "100%",
    alignSelf: "center",
  },
  h2: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
    color: Colors.light.text,
  },
  authHelp: {
    fontSize: 14,
    textAlign: "center",
    color: palette.light.text.secondary,
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.light.text,
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
  },

  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  passwordInput: {
    flex: 1,
    marginBottom: 0,
  },
  toggleBtn: {
    marginLeft: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  toggleBtnText: {
    color: Colors.light.tint,
    fontWeight: "600",
  },

  forgotRow: {
    marginTop: -8,
    marginBottom: 16,
    alignItems: "flex-end",
  },
  forgotLink: {
    color: Colors.light.tint,
    fontWeight: "600",
    paddingVertical: 6,
    paddingHorizontal: 2,
  },

  authActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    gap: 16, // Added gap for better spacing
  },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
    minWidth: 100,
    flexGrow: 1, // Allow button to take available space
  },
  btnPrimary: {
    backgroundColor: Colors.light.tint,
  },
  btnPrimaryText: {
    color: Colors.light.background,
    fontWeight: "bold",
    fontSize: 16,
  },
  link: {
    color: Colors.light.tint,
    fontWeight: "600",
    padding: 8,
  },
  socialRow: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: palette.light.border,
    paddingTop: 24,
    gap: 12,
  },
  socialBtn: {
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: palette.light.border,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  socialBtnText: {
    color: Colors.light.text,
    fontWeight: "600",
    fontSize: 16,
  },
  errorText: {
    color: palette.light.danger, // Red 500
    textAlign: "center",
    marginBottom: 16,
    fontWeight: "600",
  },
});

export default LoginScreen;
