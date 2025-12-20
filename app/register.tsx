import React, { useState } from "react";
import {
  SafeAreaView,
  View,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";

import { useRouter } from "expo-router";
import { useSignUp } from "@clerk/clerk-expo";
import { Colors, palette } from "@/constants/theme";
import { useAuth } from "@clerk/clerk-expo";
// import { createUser } from "@/app/services/users/api";
import { unstable_createElement } from "react-native-web";

const RegisterScreen: React.FC = () => {
  const { isLoaded, signUp } = useSignUp();
  const { signOut, isSignedIn } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [orgName, setOrgName] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async () => {
    if (isSignedIn) {
      setError(
        "You're already signed in. Please sign out before creating a new account."
      );
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    console.log("[DEBUG] Starting registration process...");

    const missing: string[] = [];

    if (!orgName) missing.push("Organization Name");
    if (!email) missing.push("Email");
    if (!password) missing.push("Password");
    if (!confirmPassword) missing.push("Confirm Password");

    if (missing.length > 0) {
      setError(`Please fill out required fields: ${missing.join(", ")}`);
      setLoading(false);
      console.warn("[DEBUG] Validation failed: Missing", missing);
      return;
    }

    if (password !== confirmPassword) {
      setError("Password and Confirm Password do not match.");
      setLoading(false);
      console.warn("[DEBUG] Validation failed: Password mismatch");
      return;
    }

    try {
      // Step 1: Pass ALL form data into unsafeMetadata
      // This is so we can retrieve it AFTER email verification
      const userMetadata = {
        orgName: orgName,
        roleId: 2, // Default role
        isActive: true,
      };

      console.log(
        "[DEBUG] Step 1: Attempting Clerk sign up with payload and metadata:"
      );
      console.log("Email:", email);
      console.log("Metadata:", userMetadata);

      console.log("[DEBUG] Step 2: Calling signUp.create(...)");

      await signUp.create({
        emailAddress: email,
        password,
        unsafeMetadata: userMetadata, // Pass ALL data here
      });

      // console.log("[DEBUG] Step 2: signUp.create(...) succeeded");
      // const clerkId = (signUp as any)?.createdUserId;

      // console.log("[DEBUG] signUp state after create:", {
      //   status: (signUp as any)?.status,
      //   createdUserId: clerkId,
      // });

      // if (!clerkId) {
      //   throw new Error("Missing createdUserId after signUp.create");
      // }

      // console.log("[DEBUG] Step 3: Calling backend createUser(...)");
      // await createUser({
      //   clerkId,
      //   email,
      //   name: orgName,
      //   roleId: 2,
      //   isActive: true,
      // });

      // console.log("[DEBUG] Step 3: Backend createUser(...) succeeded");
      // await signOut();
      // router.replace("/login");
      // return;

      console.log("[DEBUG] Step 2: signUp.create(...) succeeded");

      // Step 3: Prepare email OTP verification (Email Code)
      console.log("[DEBUG] Step 3: Preparing email OTP verification...");
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });

      console.log("[DEBUG] Step 4: Navigating to /verify");
      router.push("/verify");
      return;
    } catch (err: any) {
      console.error("[DEBUG] Clerk Sign Up Error (raw):", err);
      console.error(
        "[DEBUG] Clerk Sign Up Error (json):",
        JSON.stringify(err, null, 2)
      );

      // Provide clearer messaging for captcha-related failures which are
      // commonly returned by Clerk when a captcha/reCAPTCHA token is required
      const rawMsg =
        err.errors?.[0]?.longMessage ||
        err.errors?.[0]?.message ||
        err.message ||
        "";

      const lc = String(rawMsg).toLowerCase();
      if (
        lc.includes("captcha") ||
        lc.includes("recaptcha") ||
        lc.includes("hcaptcha")
      ) {
        // Friendly guidance for developers/users: in dev you can disable captcha
        // in the Clerk dashboard, or configure the site key for reCAPTCHA on the
        // frontend. On production ensure your Clerk settings include the correct
        // captcha provider/site key for your domain.
        setError(
          "Signup blocked by CAPTCHA requirement. In development you can disable CAPTCHA in your Clerk dashboard, or configure reCAPTCHA site keys for your frontend environment. See console for full error details."
        );
        console.warn("Clerk CAPTCHA error details:", err);
      } else {
        const clerkError = rawMsg || "An unknown error occurred during sign-up";
        setError(clerkError);
      }
    } finally {
      setLoading(false);

      // await signOut({ redirectUrl: '/login' }); // Sign out to clear any session

      //router.push('/login');
    }
  };

  if (!isLoaded) {
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
            disabled={loading}
            style={styles.toggleBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.toggleBtnText}>
              {showPassword ? "Hide" : "Show"}
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

        {Platform.OS === "web"
          ? unstable_createElement("div", {
              id: "clerk-captcha",
              style: { marginBottom: 16 },
            })
          : null}

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
          <TouchableOpacity onPress={() => router.push("/login")}>
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
    backgroundColor: palette.light.surface,
  },
  safeArea: {
    flex: 1,
    backgroundColor: palette.light.surface,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    shadowColor: Colors.light.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    maxWidth: 500,
    width: "100%",
    alignSelf: "center",
    marginVertical: 24, // Added margin for scroll view on web/tablet
  },
  authCard: {
    // This style is no longer the main container, but can be used for inner cards if needed.
    // For now, we've moved its properties to scrollContainer
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
    color: Colors.light.text,
  },

  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  passwordInput: {
    flex: 1,
    marginBottom: 0, // row handles spacing
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
  row: {
    flexDirection: "row",
    gap: 16,
  },
  flex: {
    flex: 1,
  },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
    flexGrow: 1,
  },
  btnPrimary: {
    backgroundColor: Colors.light.tint,
  },
  btnPrimaryText: {
    color: palette.light.text.inverse,
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
  dropdownPaneInline: {
    borderWidth: 1,
    borderColor: palette.light.border,
    backgroundColor: Colors.light.background,
    borderRadius: 8,
    marginTop: 8,
    // Ensure the dropdown matches the field width and sits inline
    overflow: "hidden",
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 44,
  },
  dropdownOpen: {
    borderColor: Colors.light.tint,
    shadowColor: Colors.light.tint,
    elevation: 2,
  },
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
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    height: 20,
    width: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: palette.light.border,
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: Colors.light.tint,
    borderColor: Colors.light.tint,
  },
  checkboxTick: { color: palette.light.text.inverse, fontSize: 12 },
  metricLabel: { fontSize: 14 },
  muted: { color: palette.light.text.muted },
});

export default RegisterScreen;
