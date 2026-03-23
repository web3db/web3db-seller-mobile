import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Colors, palette } from "@/constants/theme";
import { FUNCTIONS_BASE } from "@/app/services/postings/api";

const SUPABASE_ANON_KEY =
  (typeof process !== "undefined" &&
    process.env?.EXPO_PUBLIC_SUPABASE_ANON_KEY) ||
  "";

export default function SurveyRedirectPage() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const [status, setStatus] = useState<"loading" | "redirecting" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    if (!token) {
      setErrorMessage("Invalid survey link — no token found.");
      setStatus("error");
      return;
    }
    resolveAndRedirect(token);
  }, [token]);

  async function resolveAndRedirect(t: string) {
    try {
      const url = `${FUNCTIONS_BASE}/survey_redirect/${encodeURIComponent(t)}`;
      const res = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(SUPABASE_ANON_KEY
            ? { Authorization: `Bearer ${SUPABASE_ANON_KEY}` }
            : {}),
        },
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok || !json?.redirect_url) {
        setErrorMessage(
          json?.message ?? "This survey link is invalid or has expired."
        );
        setStatus("error");
        return;
      }

      setStatus("redirecting");

      // On web: redirect the browser to the Google Form
      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.location.href = json.redirect_url;
      } else {
        // On native: open in system browser
        const { Linking } = await import("react-native");
        await Linking.openURL(json.redirect_url);
      }
    } catch (err: any) {
      setErrorMessage("Could not reach the server. Please try again.");
      setStatus("error");
    }
  }

  if (status === "loading" || status === "redirecting") {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={palette.light.primary} />
        <Text style={styles.loadingText}>
          {status === "redirecting" ? "Opening survey…" : "Validating link…"}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.center}>
      <View style={styles.errorCard}>
        <Text style={styles.errorTitle}>Link Unavailable</Text>
        <Text style={styles.errorMessage}>{errorMessage}</Text>
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={() => {
            setStatus("loading");
            if (token) resolveAndRedirect(token);
          }}
        >
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.light.background,
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: palette.light.text.muted,
  },
  errorCard: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 14,
    padding: 28,
    maxWidth: 400,
    width: "100%",
    alignItems: "center",
    gap: 12,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#DC2626",
  },
  errorMessage: {
    fontSize: 14,
    color: "#7F1D1D",
    textAlign: "center",
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: 8,
    backgroundColor: palette.light.primary,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
});
