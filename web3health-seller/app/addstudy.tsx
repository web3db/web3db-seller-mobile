import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  useWindowDimensions,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "../hooks/AuthContext"; // Adjust path as needed
import { createTrnPosting } from "./services/postings/api";

type Study = {
  id: string;
  title: string;
  type: string;
  description: string;
  organizer: string;
  spots: number;
  participants?: string[];
  active?: boolean;
};

export default function ManageStudy(): JSX.Element {
  const { studyId } = useLocalSearchParams() as { studyId?: string };
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isNarrow = width < 720;
  const auth = useAuth();

  // form state (pre-filled)
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [length, setLength] = useState("");
  const [active, setActive] = useState(true);
  useEffect(() => {
    // In a real app fetch the study using studyId and populate state.
    // Here initial state is already set above.
  }, [studyId]);


  async function handlePublish() {
    // In a real app call the API here.
    // For now navigate back to the read-only detail and show the banner via query param.


    try {
      const payload = {
        title,
        summary,
        description,
        dataCoverageDaysRequired: Number(length) || 1,
        postingStatusId: active ? 1 : 0,
      };
      
      const response = await createTrnPosting(payload as any);
      

      // Navigate to the index with a query flag that signals "saved"
      // index.tsx will read the param and show a temporary banner.
      router.replace(`/studies/${response.id}?saved=1`);
    } catch (error) {
      console.error("Error saving study:", error);
    }


  }

  function handleCancel() {
    router.back();
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View
          style={[
            styles.contentRow,
            isNarrow ? styles.columnLayout : styles.rowLayout,
          ]}
        >
          {/* LEFT: Form Card */}
          <View style={[styles.card, isNarrow ? styles.fullWidth : styles.leftColumn]}>
            <Text style={styles.heading}>Create A New Study</Text>

            <Text style={styles.label}>Title</Text>
            <TextInput value={title} onChangeText={setTitle} style={styles.input} />

            <Text style={styles.label}>Summary</Text>
            <TextInput value={summary} onChangeText={setSummary} style={styles.input} />

            <Text style={styles.label}>Description</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              style={[styles.input, styles.multiline]}
              multiline
            />

            <Text style={styles.label}>Length</Text>
            <TextInput
              value={length}
              onChangeText={(t) => setLength(t.replace(/[^0-9]/g, ""))}
              style={styles.input}
              keyboardType="numeric"
            />

            <Text style={styles.label}>Active</Text>
            <View style={styles.rowBetween}>
              <Text style={styles.metaText}>{active ? "Yes" : "No"}</Text>
              <TouchableOpacity
                onPress={() => setActive((v) => !v)}
                style={[styles.toggleBtn, active && styles.toggleBtnActive]}
              >
                <Text style={[styles.toggleText, active && styles.toggleTextActive]}>
                  {active ? "Active" : "Inactive"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formActions}>
              <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={handlePublish}>
                <Text style={styles.btnPrimaryText}>Publish</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={handleCancel}>
                <Text style={styles.btnGhostText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* RIGHT: Stats Card */}
          <View style={[styles.card, isNarrow ? styles.fullWidth : styles.rightColumn]}>
            <Text style={styles.statHeading}>Study Statistics</Text>

            <View style={styles.statRow}>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>0</Text>
                <Text style={styles.statLabel}>Participants</Text>
              </View>

              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{Number(length) || 0}</Text>
                <Text style={styles.statLabel}>Days</Text>
              </View>
            </View>

            <View style={styles.metaBlock}>
              <Text style={styles.metaLabel}>Organizer</Text>
              <Text style={styles.metaValue}>{auth.user?.name ? auth.user.name : "Unknown"}</Text>
            </View>

            <View style={styles.helpBox}>
              <Text style={styles.helpTitle}>Tips</Text>
              <Text style={styles.helpText}>
                Use the form to adjust title, length and description. Use "Add Participant" to add
                demo participants while testing locally.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* Styles */
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#ffffff" },
  scrollContainer: { padding: 16, paddingBottom: 48 },
  contentRow: {
    width: "100%",
    gap: 16,
  },
  rowLayout: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  columnLayout: {
    flexDirection: "column",
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    // drop shadow
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: { elevation: 3 },
      default: {},
    }),
  },

  leftColumn: { flex: 2, marginRight: 8, minWidth: 0 },
  rightColumn: { flex: 1, marginLeft: 8, minWidth: 260, maxWidth: 420 },

  fullWidth: { width: "100%" },

  heading: { fontSize: 20, fontWeight: "700", marginBottom: 8 },
  label: { fontSize: 14, marginTop: 8, marginBottom: 6, color: "#333" },
  input: {
    borderWidth: 1,
    borderColor: "#e6e6e6",
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#fafafa",
  },
  multiline: { height: 110, textAlignVertical: "top" as const },

  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  participantsList: { marginTop: 6 },

  participantRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f3f3",
  },
  removeText: { color: "#d00", fontWeight: "600" },

  formActions: {
    marginTop: 16,
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  btnPrimary: { backgroundColor: "#0b74ff" },
  btnPrimaryText: { color: "#fff", fontWeight: "700" },
  btnGhost: { backgroundColor: "transparent", borderWidth: 1, borderColor: "#cbd5e1" },
  btnGhostText: { color: "#374151", fontWeight: "600" },
  btnSmall: { backgroundColor: "#eef2ff", paddingHorizontal: 10 },
  btnSmallText: { color: "#4f46e5", fontWeight: "600" },

  toggleBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  toggleBtnActive: { backgroundColor: "#e6f2ff", borderColor: "#8fc9ff" },
  toggleText: { color: "#374151" },
  toggleTextActive: { color: "#0b74ff", fontWeight: "700" },

  /* Stats */
  statHeading: { fontSize: 16, fontWeight: "700", marginBottom: 12 },
  statRow: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  statBox: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    paddingVertical: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.04)",
  },
  statNumber: { fontSize: 28, fontWeight: "800" },
  statLabel: { color: "#6b7280", marginTop: 6 },

  metaBlock: { marginTop: 12 },
  metaLabel: { fontSize: 12, color: "#6b7280" },
  metaValue: { fontSize: 14, fontWeight: "600", marginTop: 4 },

  helpBox: {
    marginTop: 16,
    backgroundColor: "#f1f5f9",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.03)",
  },
  helpTitle: { fontWeight: "700", marginBottom: 6 },
  helpText: { color: "#374151" },

  muted: { color: "#8b8b8b" },
});