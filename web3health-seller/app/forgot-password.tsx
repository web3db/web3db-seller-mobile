// app/forgot-password.tsx
import React, { useEffect, useMemo, useState } from "react";
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
import { useAuth, useSignIn } from "@clerk/clerk-expo";
import { Colors, palette } from "@/constants/theme";
import { useAuth as localAuth } from "@/hooks/AuthContext";

type Step = "request" | "reset";

const ForgotPasswordScreen: React.FC = () => {
  const router = useRouter();

  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const { isLoaded: signInLoaded, signIn, setActive } = useSignIn();
  const { login } = localAuth();

  const [step, setStep] = useState<Step>("request");

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canUseClerk = useMemo(
    () => authLoaded && signInLoaded,
    [authLoaded, signInLoaded]
  );

  useEffect(() => {
    if (!authLoaded) return;
    if (isSignedIn) router.replace("/studies");
  }, [authLoaded, isSignedIn, router]);

  const handleSendResetCode = async () => {
    setError("");
    setLoading(true);

    if (!canUseClerk) {
      setError("Still initializing... Please try again in a moment.");
      setLoading(false);
      return;
    }

    if (!email.trim()) {
      setError("Please enter your email.");
      setLoading(false);
      return;
    }

    try {
      // Clerk documented flow: create a sign-in with reset_password_email_code strategy. :contentReference[oaicite:4]{index=4}
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email.trim(),
      });

      setStep("reset");
      setCode("");
      setNewPassword("");
      setConfirmPassword("");
      setError("");
    } catch (err: any) {
      console.error(
        "Forgot Password (send code) Error:",
        JSON.stringify(err, null, 2)
      );
      const msg =
        err.errors?.[0]?.longMessage ||
        err.errors?.[0]?.message ||
        err.message ||
        "Failed to send reset code. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResendResetCode = async () => {
    setError("");
    setLoading(true);

    if (!canUseClerk) {
      setError("Still initializing... Please try again in a moment.");
      setLoading(false);
      return;
    }

    if (!email.trim()) {
      setError(
        "Missing email address. Please go back and re-enter your email."
      );
      setLoading(false);
      return;
    }

    try {
      // Same documented API used to send the reset code.
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email.trim(),
      });
      setError("");
    } catch (err: any) {
      console.error(
        "Forgot Password (resend code) Error:",
        JSON.stringify(err, null, 2)
      );
      const msg =
        err.errors?.[0]?.longMessage ||
        err.errors?.[0]?.message ||
        err.message ||
        "Failed to resend code. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setError("");
    setLoading(true);

    if (!canUseClerk) {
      setError("Still initializing... Please try again in a moment.");
      setLoading(false);
      return;
    }

    const trimmedCode = code.trim();

    if (!trimmedCode || trimmedCode.length < 4) {
      setError("Please enter the code sent to your email.");
      setLoading(false);
      return;
    }

    if (!newPassword) {
      setError("Please enter a new password.");
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      // Clerk documented flow: attemptFirstFactor with reset_password_email_code,
      // including code + new password. :contentReference[oaicite:5]{index=5}
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: trimmedCode,
        password: newPassword,
      });

      if (result.status === "complete") {
        // Clerk guide: successful reset signs user in; set active session. :contentReference[oaicite:6]{index=6}
        await setActive({ session: result.createdSessionId });

        // Keep parity with your app: hydrate local auth after Clerk session is active.
        await login(email.trim());

        router.replace("/studies");
        return;
      }

      if (result.status === "needs_second_factor") {
        // This can occur if the account requires MFA for sign-in after reset.
        // We’re not implementing additional factors here (your Phase 2 scope is email OTP only).
        setError(
          "Password reset succeeded, but additional verification is required to sign in."
        );
        return;
      }

      console.log("Reset result status:", result.status);
      setError(`Password reset did not complete: ${result.status}`);
    } catch (err: any) {
      console.error(
        "Forgot Password (reset) Error:",
        JSON.stringify(err, null, 2)
      );
      const msg =
        err.errors?.[0]?.longMessage ||
        err.errors?.[0]?.message ||
        err.message ||
        "Failed to reset password. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

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
        <Text style={styles.h2}>Reset password</Text>

        <Text style={styles.authHelp}>
          {step === "request"
            ? "Enter your email to receive a password reset code."
            : "Enter the code from your email and choose a new password."}
        </Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {step === "request" ? (
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

            <View style={styles.authActions}>
              <TouchableOpacity
                style={[styles.btn, styles.btnPrimary]}
                onPress={handleSendResetCode}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color={palette.light.text.inverse} />
                ) : (
                  <Text style={styles.btnPrimaryText}>Send code</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.replace("/login")}
                disabled={loading}
              >
                <Text style={styles.link}>Back to login</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.label}>Verification Code</Text>
            <TextInput
              style={styles.input}
              value={code}
              onChangeText={setCode}
              placeholder="123456"
              keyboardType="number-pad"
              editable={!loading}
              maxLength={8}
            />

            <View style={styles.resendRow}>
              <TouchableOpacity
                onPress={handleResendResetCode}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Text style={styles.resendLink}>Resend code</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>New Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="••••••••"
                secureTextEntry={!showNewPassword}
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowNewPassword((v) => !v)}
                disabled={loading}
                style={styles.toggleBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.toggleBtnText}>
                  {showNewPassword ? "Hide" : "Show"}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="••••••••"
                secureTextEntry={!showConfirmPassword}
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword((v) => !v)}
                disabled={loading}
                style={styles.toggleBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.toggleBtnText}>
                  {showConfirmPassword ? "Hide" : "Show"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.authActions}>
              <TouchableOpacity
                style={[styles.btn, styles.btnPrimary]}
                onPress={handleResetPassword}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color={palette.light.text.inverse} />
                ) : (
                  <Text style={styles.btnPrimaryText}>Reset password</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setStep("request");
                  setCode("");
                  setNewPassword("");
                  setConfirmPassword("");
                  setError("");
                }}
                disabled={loading}
              >
                <Text style={styles.link}>Start over</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

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

  resendRow: {
    marginTop: -8,
    marginBottom: 16,
    alignItems: "flex-end",
  },
  resendLink: {
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
    gap: 16,
  },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
    minWidth: 120,
    flexGrow: 1,
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
  errorText: {
    color: palette.light.danger,
    textAlign: "center",
    marginBottom: 16,
    fontWeight: "600",
  },
});

export default ForgotPasswordScreen;
