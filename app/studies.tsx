import React, { useState, useCallback } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useAuth } from "@clerk/clerk-expo";
import { useFocusEffect, useRouter } from "expo-router";
import StudyCard from "../components/StudyCard";
import { useAuth as localAuth } from "@/hooks/AuthContext";
import { Colors, palette } from "@/constants/theme";

import { listTrnPostings, listPostingStatuses } from "./services/postings/api";
import type { StudySummary, PostingStatus } from "./services/postings/types";

// ─── Web styles ───────────────────────────────────────────────────────────────
const webStyles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#F5F5F7",
    overflowX: "hidden",
  },
  inner: {
    maxWidth: 960,
    margin: "0 auto",
    padding: "48px 24px 80px",
  },
  pageHeader: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    boxShadow: "0 2px 12px rgba(0, 0, 0, 0.06)",
    padding: 32,
    marginBottom: 28,
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 16,
  },
  headerLeft: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    minWidth: 200,
  },
  pageTitle: {
    fontFamily: "Barlow, sans-serif",
    fontSize: 32,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  pageSubtitle: {
    fontFamily: "Barlow, sans-serif",
    fontSize: 15,
    fontWeight: "400",
    color: "#666666",
    lineHeight: 1.5,
    maxWidth: 480,
  },
  addButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#B22222",
    color: "#FFFFFF",
    fontFamily: "Barlow, sans-serif",
    fontSize: 15,
    fontWeight: "600",
    padding: "12px 24px",
    borderRadius: 12,
    border: "none",
    cursor: "pointer",
    boxShadow: "0 4px 14px rgba(178, 34, 34, 0.3)",
    flexShrink: 0,
    transition: "all 0.2s ease",
  },
  statsRow: {
    display: "flex",
    flexDirection: "row",
    gap: 16,
    marginBottom: 28,
    flexWrap: "wrap",
  },
  statCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    boxShadow: "0 2px 12px rgba(0, 0, 0, 0.06)",
    padding: "20px 28px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    minWidth: 140,
    flex: 1,
  },
  statValue: {
    fontFamily: "Barlow, sans-serif",
    fontSize: 36,
    fontWeight: "700",
    color: "#1a1a1a",
    lineHeight: 1.1,
    marginBottom: 6,
  },
  statLabel: {
    fontFamily: "Barlow, sans-serif",
    fontSize: 13,
    fontWeight: "500",
    color: "#888888",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  sectionTitle: {
    fontFamily: "Barlow, sans-serif",
    fontSize: 20,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 16,
  },
  message: {
    fontFamily: "Barlow, sans-serif",
    fontSize: 15,
    color: "#888888",
    textAlign: "center",
    padding: "40px 0",
  },
  errorText: {
    color: "#B22222",
    fontWeight: "600",
  },
};

// ─── Web screen ───────────────────────────────────────────────────────────────
const StudiesScreenWeb: React.FC<{
  studies: StudySummary[];
  statusLabelById: Map<number, string>;
  isLoading: boolean;
  error: string | null;
  router: ReturnType<typeof useRouter>;
}> = ({ studies, statusLabelById, isLoading, error, router }) => (
  <div style={webStyles.page}>
    <div style={webStyles.inner}>
      {/* Page header */}
      <div style={webStyles.pageHeader}>
        <div style={webStyles.headerLeft}>
          <h1 style={webStyles.pageTitle}>Your Studies</h1>
          <p style={webStyles.pageSubtitle}>
            Below are the studies your organization currently manages. Click a study to view details or manage recruitment.
          </p>
        </div>
        <button style={webStyles.addButton} onClick={() => router.push("/addstudy")}>
          + Add Study
        </button>
      </div>

      {/* Stats row */}
      <div style={webStyles.statsRow as any}>
        <div style={webStyles.statCard}>
          <span style={webStyles.statValue}>{isLoading ? "—" : studies.length}</span>
          <span style={webStyles.statLabel}>Active Studies</span>
        </div>
        <div style={webStyles.statCard}>
          <span style={webStyles.statValue}>
            {isLoading ? "—" : studies.reduce((s, st) => s + st.spots, 0)}
          </span>
          <span style={webStyles.statLabel}>Total Spots</span>
        </div>
      </div>

      {/* Study list */}
      <h2 style={webStyles.sectionTitle}>All Studies</h2>

      {isLoading && <p style={webStyles.message}>Loading studies…</p>}

      {error && (
        <p style={{ ...webStyles.message, ...webStyles.errorText }}>⚠ {error}</p>
      )}

      {!isLoading && !error && studies.length === 0 && (
        <p style={webStyles.message}>No studies found. Start by adding a new one!</p>
      )}

      {studies.map((study) => (
        <StudyCard
          key={study.id}
          study={study}
          statusLabel={statusLabelById.get(study.statusId) ?? `Status ${study.statusId}`}
          onPress={() => router.push(`/studies/${study.id}`)}
        />
      ))}
    </div>
  </div>
);

// ─── Main screen ──────────────────────────────────────────────────────────────
const StudiesScreen: React.FC = () => {
  const router = useRouter();
  const [studies, setStudies] = useState<StudySummary[]>([]);
  const [statuses, setStatuses] = useState<PostingStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = localAuth();

  useFocusEffect(
    useCallback(() => {
      const loadStudies = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const buyerId = user?.id ? Number(user.id) : -1;
          const [fetchedStatuses, fetchedStudies] = await Promise.all([
            listPostingStatuses(),
            listTrnPostings(buyerId),
          ]);
          setStatuses(fetchedStatuses);
          setStudies(fetchedStudies);
        } catch (e: any) {
          console.error("Failed to load studies from API:", e);
          setError(`Failed to load studies: ${e.message || "Unknown network error"}`);
          setStudies([]);
        } finally {
          setIsLoading(false);
        }
      };
      loadStudies();
    }, [])
  );

  const statusLabelById = new Map<number, string>(
    statuses.map((s: PostingStatus) => [s.postingStatusId, s.displayName])
  );

  if (Platform.OS === "web") {
    return (
      <StudiesScreenWeb
        studies={studies}
        statusLabelById={statusLabelById}
        isLoading={isLoading}
        error={error}
        router={router}
      />
    );
  }

  // ── Native render ──
  return (
    <SafeAreaView style={nativeStyles.root}>
      <ScrollView contentContainerStyle={nativeStyles.homeRoot}>
        <View style={nativeStyles.header}>
          <View style={nativeStyles.leftColumn}>
            <Text style={nativeStyles.title}>Your Studies</Text>
            <Text style={nativeStyles.subtitle}>
              Below are the studies your organization currently manages.
            </Text>
          </View>
          <TouchableOpacity
            style={[nativeStyles.btn, nativeStyles.btnPrimary, nativeStyles.addButton]}
            onPress={() => router.push("/addstudy")}
          >
            <Text style={nativeStyles.btnTextPrimary}>+ Add Study</Text>
          </TouchableOpacity>
        </View>

        <View style={nativeStyles.stats}>
          <View style={nativeStyles.statBox}>
            <Text style={nativeStyles.statValue}>{isLoading ? "..." : studies.length}</Text>
            <Text style={nativeStyles.statLabel}>Active Studies</Text>
          </View>
        </View>

        <View style={nativeStyles.listContainer}>
          {isLoading && <Text style={nativeStyles.message}>Loading studies…</Text>}
          {error && <Text style={[nativeStyles.message, nativeStyles.errorText]}>⚠ {error}</Text>}
          {!isLoading && studies.length === 0 && !error && (
            <Text style={nativeStyles.message}>No studies found. Start by adding a new one!</Text>
          )}
          {studies.map((study) => (
            <StudyCard
              key={study.id}
              study={study}
              statusLabel={statusLabelById.get(study.statusId) ?? `Status ${study.statusId}`}
              onPress={() => router.push(`/studies/${study.id}`)}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Native styles ────────────────────────────────────────────────────────────
const nativeStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.light.background },
  homeRoot: { paddingVertical: 32 },
  listContainer: { paddingHorizontal: 16 },
  header: {
    backgroundColor: palette.light.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.light.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginBottom: 16,
  },
  leftColumn: { flex: 1, minWidth: 0, marginRight: 12 },
  stats: {
    flexDirection: "row",
    marginHorizontal: 16,
    justifyContent: "space-between",
    marginVertical: 10,
    gap: 12,
    marginBottom: 20,
  },
  statBox: {
    backgroundColor: palette.light.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.light.border,
    alignItems: "center",
    flex: 1,
    padding: 8,
  },
  statValue: { fontSize: 32, fontWeight: "bold", marginTop: 8, marginBottom: 4 },
  statLabel: { fontSize: 14, color: palette.light.text.secondary, marginBottom: 8 },
  title: { fontWeight: "bold", fontSize: 24, marginBottom: 8 },
  subtitle: { fontSize: 16, color: palette.light.text.secondary },
  btn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "transparent",
  },
  btnPrimary: { backgroundColor: Colors.light.tint },
  btnTextPrimary: { color: palette.light.text.inverse, fontWeight: "600" },
  addButton: { alignSelf: "flex-start" },
  message: {
    textAlign: "center",
    padding: 20,
    fontSize: 16,
    color: palette.light.text.secondary,
  },
  errorText: { color: palette.light.danger, fontWeight: "bold" },
});

export default StudiesScreen;
