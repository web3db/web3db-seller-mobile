import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
  Animated,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

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

export default function StudyDetail(): JSX.Element {
  const { studyId, saved } = useLocalSearchParams() as { studyId?: string; saved?: string };
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isNarrow = width < 720;

  const [showSaved, setShowSaved] = useState<boolean>(saved === "1" || saved === "true");
  const [bannerOpacity] = useState(new Animated.Value(showSaved ? 1 : 0));

  // Replace this with a real fetch/useStudy hook when available.
  const study: Study = {
    id: studyId ?? "unknown",
    title: "4‑Week Physical Activity Study",
    type: "Remote",
    description:
      "A four-week study collecting step counts and activity patterns from participants who already use an activity tracker (phone or wearable).",
    organizer: "Web3Health",
    spots: 500,
    participants: ["alice", "bob", "carol"],
    active: true,
  };

  useEffect(() => {
    if (showSaved) {
      // fade in (already visible) then hide after 3s and remove query param
      Animated.timing(bannerOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      const t = setTimeout(() => {
        Animated.timing(bannerOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
        setShowSaved(false);
        // remove query param so refresh doesn't show banner again
        // replace to same path without query
        router.replace(`/studies/${study.id}`);
      }, 3000);
      return () => clearTimeout(t);
    }
    // If saved param was not present, ensure banner hidden
    bannerOpacity.setValue(0);
  }, [showSaved, bannerOpacity, router, study.id]);

  useEffect(() => {
    // In case the page was opened with the param, ensure internal state is set
    if (saved === "1" || saved === "true") {
      setShowSaved(true);
    }
  }, [saved]);

  if (!studyId) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.center}>
          <Text style={styles.error}>Missing study id</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {showSaved && (
          <Animated.View style={[styles.banner, { opacity: bannerOpacity }]}>
            <Text style={styles.bannerText}>Changes saved successfully</Text>
          </Animated.View>
        )}

        <View
          style={[
            styles.contentRow,
            isNarrow ? styles.columnLayout : styles.rowLayout,
          ]}
        >
          {/* LEFT: Read-only Info Card */}
          <View style={[styles.card, isNarrow ? styles.fullWidth : styles.leftColumn]}>
            <Text style={styles.heading}>Study Details</Text>

            <Text style={styles.label}>Title</Text>
            <Text style={styles.value}>{study.title}</Text>

            <Text style={styles.label}>Type</Text>
            <Text style={styles.value}>{study.type}</Text>

            <Text style={styles.label}>Description</Text>
            <Text style={[styles.value, styles.multilineValue]}>{study.description}</Text>

            <Text style={styles.label}>Spots</Text>
            <Text style={styles.value}>{study.spots}</Text>

            <Text style={styles.label}>Active</Text>
            <Text style={styles.value}>{study.active ? "Yes" : "No"}</Text>

            <Text style={[styles.label, { marginTop: 12 }]}>Participants</Text>
            <View style={styles.participantsList}>
              {(!study.participants || study.participants.length === 0) ? (
                <Text style={styles.muted}>No participants</Text>
              ) : (
                study.participants.map((p, i) => (
                  <View key={`${p}-${i}`} style={styles.participantRow}>
                    <Text>{p}</Text>
                  </View>
                ))
              )}
            </View>

            <View style={styles.formActions}>
              <TouchableOpacity
                style={[styles.btn, styles.btnPrimary]}
                onPress={() => router.push(`/studies/${study.id}/manage`)}
              >
                <Text style={styles.btnPrimaryText}>Manage Study</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btn, styles.btnGhost]}
                onPress={() => router.back()}
              >
                <Text style={styles.btnGhostText}>Back</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* RIGHT: Stats Card */}
          <View style={[styles.card, isNarrow ? styles.fullWidth : styles.rightColumn]}>
            <Text style={styles.statHeading}>Study Statistics</Text>

            <View style={styles.statRow}>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{study.participants?.length ?? 0}</Text>
                <Text style={styles.statLabel}>Participants</Text>
              </View>

              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{study.spots}</Text>
                <Text style={styles.statLabel}>Spots</Text>
              </View>
            </View>

            <View style={styles.metaBlock}>
              <Text style={styles.metaLabel}>Organizer</Text>
              <Text style={styles.metaValue}>{study.organizer}</Text>
            </View>

            <View style={styles.metaBlock}>
              <Text style={styles.metaLabel}>Study ID</Text>
              <Text style={styles.metaValue}>{study.id}</Text>
            </View>

            <View style={styles.metaBlock}>
              <Text style={styles.metaLabel}>Status</Text>
              <Text style={styles.metaValue}>{study.active ? "Active" : "Inactive"}</Text>
            </View>

            <View style={styles.helpBox}>
              <Text style={styles.helpTitle}>Notes</Text>
              <Text style={styles.helpText}>
                This is a read-only view. Click Manage Study to edit settings and recruitment.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* Styles: intentionally matches manage.tsx for consistent layout */
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#ffffff" },
  scrollContainer: { padding: 16, paddingBottom: 48 },
  banner: {
    backgroundColor: "#ECFDF5",
    borderColor: "#10B981",
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12,
    alignSelf: "center",
  },
  bannerText: { color: "#065F46", fontWeight: "600" },
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
  label: { fontSize: 14, marginTop: 8, marginBottom: 6, color: "#6b7280" },
  value: { fontSize: 16, color: "#111827" },
  multilineValue: { lineHeight: 20, marginBottom: 4 },

  participantsList: { marginTop: 6 },

  participantRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f3f3",
  },

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

  error: { color: "red", textAlign: "center", marginTop: 24 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 16 },
});