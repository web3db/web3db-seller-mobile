import React, { useEffect, useMemo, useState } from "react";
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
import { Redirect, useRouter } from "expo-router";

import { useAuth, useSession, useUser } from "@clerk/clerk-expo";

const ResetRequiredScreen: React.FC = () => {
  const router = useRouter();

  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const { isLoaded: sessionLoaded, session } = useSession();
  const { isLoaded: userLoaded, user } = useUser();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const resetTaskDetected = useMemo(() => {
    const task = (session as any)?.currentTask;
    const key = task?.key ?? task?.name ?? task;
    return key === "reset-password";
  }, [session]);

  // If the user is signed in but doesn't have the reset-password task anymore,
  // they shouldn't stay on this page.
  useEffect(() => {
    if (!authLoaded || !sessionLoaded) return;
    if (!isSignedIn) return;

    if (session && !resetTaskDetected) {
      router.replace("/studies");
    }
  }, [authLoaded, sessionLoaded, isSignedIn, session, resetTaskDetected, router]);

  const onSubmit = async () => {
    setError("");

    if (!authLoaded || !sessionLoaded || !userLoaded) {
      setError("Still initializing... Please try again in a moment.");
      return;
    }

    if (!isSignedIn || !user) {
      router.replace("/login");
      return;
    }

    if (!resetTaskDetected) {
      router.replace("/studies");
      return;
    }

    if (!currentPassword) {
      setError("Please enter your current password.");
      return;
    }
    if (!newPassword) {
      setError("Please enter a new password.");
      return;
    }
    if (!confirmNewPassword) {
      setError("Please confirm your new password.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError("New passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      // Clerk Core 2 (Expo): requires currentPassword + newPassword.
      // signOutOfOtherSessions is optional but recommended for security.
      await user.updatePassword({
        currentPassword,
        newPassword,
        signOutOfOtherSessions: true,
      });

      // After this, Clerk should clear the reset-password session task.
      // Let layout guard + session effect route them normally.
      router.replace("/studies");
    } catch (err: any) {
      const msg =
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        err?.message ||
        "Could not update password. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Global loading state
  if (!authLoaded || !sessionLoaded) {
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

  // If signed out, they cannot complete a session task
  if (!isSignedIn) {
    return <Redirect href="/login" />;
  }

  return (
    <SafeAreaView style={styles.authRoot}>
      <View style={styles.authCard}>
        <Text style={styles.h2}>Reset required</Text>
        <Text style={styles.authHelp}>
          For security, you need to update your password before continuing.
        </Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {!userLoaded ? (
          <View style={{ paddingVertical: 12 }}>
            <ActivityIndicator color={Colors.light.tint} />
          </View>
        ) : (
          <>
            <Text style={styles.label}>Current password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="••••••••"
                secureTextEntry={!showCurrent}
                editable={!loading}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() => setShowCurrent((v) => !v)}
                disabled={loading}
                style={styles.toggleBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.toggleBtnText}>
                  {showCurrent ? "Hide" : "Show"}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>New password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="••••••••"
                secureTextEntry={!showNew}
                editable={!loading}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() => setShowNew((v) => !v)}
                disabled={loading}
                style={styles.toggleBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.toggleBtnText}>
                  {showNew ? "Hide" : "Show"}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Confirm new password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                value={confirmNewPassword}
                onChangeText={setConfirmNewPassword}
                placeholder="••••••••"
                secureTextEntry={!showConfirm}
                editable={!loading}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() => setShowConfirm((v) => !v)}
                disabled={loading}
                style={styles.toggleBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.toggleBtnText}>
                  {showConfirm ? "Hide" : "Show"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.authActions}>
              <TouchableOpacity
                style={[styles.btn, styles.btnPrimary]}
                onPress={onSubmit}
                disabled={loading || !resetTaskDetected}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color={palette.light.text.inverse} />
                ) : (
                  <Text style={styles.btnPrimaryText}>Update password</Text>
                )}
              </TouchableOpacity>

              {/* Optional escape hatch */}
              <TouchableOpacity
                onPress={() => router.replace("/login")}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Text style={styles.link}>Back to login</Text>
              </TouchableOpacity>
            </View>

            {!resetTaskDetected ? (
              <Text style={styles.noteText}>
                No reset task is pending for this session.
              </Text>
            ) : null}
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
    marginBottom: 0,
  },
  passwordInput: {
    flex: 1,
    marginBottom: 16,
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
  noteText: {
    marginTop: 12,
    color: palette.light.text.secondary,
    fontSize: 12,
    textAlign: "center",
  },
});

export default ResetRequiredScreen;
