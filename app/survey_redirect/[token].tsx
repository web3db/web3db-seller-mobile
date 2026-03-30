import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors, palette } from "@/constants/theme";

export default function SurveyRedirectPage() {
  return (
    <View style={styles.center}>
      <View style={styles.card}>
        <Text style={styles.title}>Link No Longer Active</Text>
        <Text style={styles.message}>
          This survey link is no longer active. Please contact your study
          coordinator for assistance.
        </Text>
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
  card: {
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
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#DC2626",
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    color: "#7F1D1D",
    textAlign: "center",
    lineHeight: 22,
  },
});
