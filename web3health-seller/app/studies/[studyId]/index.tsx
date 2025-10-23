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
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getPostingShares } from "../../services/postings/api";

type StudyDetail = {
  postingId: number;
  buyerUserId: number;
  buyerDisplayName: string;
  postingStatusId: number;
  postingStatusDisplayName: string;
  title: string;
  summary: string;
  description: string | null;
  applyOpenAt: string | null;
  applyCloseAt: string | null;
  dataCoverageDaysRequired: number | null;
  minAge: number;
  rewardTypeId: number | null;
  rewardTypeDisplayName: string | null;
  rewardValue: number | null;
  //metrics: { metricId: number; metricDisplayName: string }[];
  metricId: number[] | null;
  metricDisplayName: string[] | null;
  viewPolicies: any[];
  healthConditions: { id: number; displayName: string }[];
  tags: string[];
  images: any[];
  isActive: boolean;
  isModified: boolean | null;
  createdOn: string | null;
  modifiedOn: string | null;
};

export default function StudyDetail() {
  const { studyId, saved } = useLocalSearchParams() as { studyId?: string; saved?: string };
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isNarrow = width < 720;

  const [showSaved, setShowSaved] = useState<boolean>(saved === "1" || saved === "true");
  const [bannerOpacity] = useState(new Animated.Value(showSaved ? 1 : 0));
  const [study, setStudy] = useState<StudyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Shares (participant/session) UI
  const [sharesData, setSharesData] = useState<any | null>(null);
  const [sharesLoading, setSharesLoading] = useState(false);
  const [sharesError, setSharesError] = useState<string | null>(null);
  const [expandedShares, setExpandedShares] = useState<Record<number, boolean>>({});

  function formatUtcToLocal(utc?: string) {
    if (!utc) return "-";
    try {
      return new Date(utc).toLocaleString();
    } catch {
      return utc;
    }
  }

  function toggleShareExpand(idx: number) {
    setExpandedShares((prev) => ({ ...prev, [idx]: !prev[idx] }));
  }

  useEffect(() => {
    async function fetchStudyDetail() {
      if (!studyId) return;
      setLoading(true);
      setError(null);
      try {
        // Use the centralized API function which includes data normalization
        const { getTrnPostingDetail } = await import("../../services/postings/api");
        const buyerId = 3;
        const detail = await getTrnPostingDetail(buyerId, studyId);
        setStudy(detail);
      } catch (err: any) {
        setError(err.message || 'Failed to load study');
      } finally {
        setLoading(false);
      }
    }
    fetchStudyDetail();
  }, [studyId]);

  useEffect(() => {
    if (showSaved && study) {
      Animated.timing(bannerOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      const t = setTimeout(() => {
        Animated.timing(bannerOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
        setShowSaved(false);
        router.replace(`/studies/${study.postingId}`);
      }, 3000);
      return () => clearTimeout(t);
    }
    bannerOpacity.setValue(0);
  }, [showSaved, bannerOpacity, router, study]);

  useEffect(() => {
    // In case the page was opened with the param, ensure internal state is set
    if (saved === "1" || saved === "true") {
      setShowSaved(true);
    }
  }, [saved]);

  // share fetching
  useEffect(() => {
    async function fetchShares() {
      if (!studyId) return;
      setSharesLoading(true);
      setSharesError(null);
      try {
        // HARD CODED TO 9001 TO GET DATA
        const res = await getPostingShares(Number(studyId));
        //const res = await getPostingShares(9001);
        // save full response (postingId, postingTitle, shares[])
        setSharesData(res);
      } catch (err: any) {
        console.error("Failed to load posting shares", err);
        setSharesError(err?.message ?? String(err));
      } finally {
        setSharesLoading(false);
      }
    }
    void fetchShares();
  }, [studyId]);

  if (!studyId) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.center}>
          <Text style={styles.error}>Missing study id</Text>
        </View>
      </SafeAreaView>
    );
  }
  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.center}>
          <Text>Loading study...</Text>
        </View>
      </SafeAreaView>
    );
  }
  if (error) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }
  if (!study) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.center}>
          <Text style={styles.error}>Study not found</Text>
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

            <Text style={styles.label}>Summary</Text>
            <Text style={styles.value}>{study.summary}</Text>

            <Text style={styles.label}>Description</Text>
            <Text style={[styles.value, styles.multilineValue]}>{study.description}</Text>

            <Text style={styles.label}>Status</Text>
            <Text style={styles.value}>{study.postingStatusDisplayName}</Text>

            <Text style={styles.label}>Min Age</Text>
            <Text style={styles.value}>{study.minAge}</Text>

            <Text style={styles.label}>Data Coverage Days Required</Text>
            <Text style={styles.value}>{study.dataCoverageDaysRequired ?? "-"}</Text>

            <Text style={styles.label}>Apply Open At</Text>
            <Text style={styles.value}>{study.applyOpenAt ?? "-"}</Text>

            <Text style={styles.label}>Apply Close At</Text>
            <Text style={styles.value}>{study.applyCloseAt ?? "-"}</Text>

            <Text style={styles.label}>Reward Type</Text>
            <Text style={styles.value}>{study.rewardTypeDisplayName ?? "-"}</Text>

            <Text style={styles.label}>Reward Value</Text>
            <Text style={styles.value}>{study.rewardValue !== null ? study.rewardValue : "-"}</Text>


            <Text style={[styles.label, { marginTop: 12 }]}>Metrics</Text>
            <View style={styles.participantsList}>
              {(!study.metricDisplayName || study.metricDisplayName.length === 0) ? (
                <Text style={styles.muted}>No metrics</Text>
              ) : (
                study.metricDisplayName.map((m, i) => (
                  <View key={study.metricId![i] + '-' + i} style={styles.participantRow}>
                    <Text>{m}</Text>
                  </View>
                ))
              )}
            </View>

            <Text style={[styles.label, { marginTop: 12 }]}>Health Conditions</Text>
            <View style={styles.participantsList}>
              {(!study.healthConditions || study.healthConditions.length === 0) ? (
                <Text style={styles.muted}>No conditions</Text>
              ) : (
                study.healthConditions.map((c, i) => (
                  <View key={c.id + '-' + i} style={styles.participantRow}>
                    <Text>{c.displayName}</Text>
                  </View>
                ))
              )}
            </View>

            <Text style={styles.label}>Buyer</Text>
            <Text style={styles.value}>{study.buyerDisplayName}</Text>

            <Text style={styles.label}>Study ID</Text>
            <Text style={styles.value}>{study.postingId}</Text>

            {/* 
            <Text style={styles.label}>Created On</Text>
            <Text style={styles.value}>{study.createdOn ?? "-"}</Text> */}

            <Text style={styles.label}>Modified On</Text>
            <Text style={styles.value}>{study.modifiedOn ?? "-"}</Text>

            {/* <Text style={[styles.label, { marginTop: 12 }]}>Tags</Text>
            <View style={styles.participantsList}>
              {(!study.tags || study.tags.length === 0) ? (
                <Text style={styles.muted}>No tags</Text>
              ) : (
                study.tags.map((tag, i) => (
                  <View key={tag + i} style={styles.participantRow}>
                    <Text>{tag}</Text>
                  </View>
                ))
              )}
            </View> */}

                        <Text style={[styles.label, { marginTop: 12 }]}>Participant Shares</Text>

            {sharesLoading ? (
              <ActivityIndicator />
            ) : sharesError ? (
              <Text style={{ color: "red" }}>{sharesError}</Text>
            ) : !sharesData?.shares || sharesData.shares.length === 0 ? (
              <Text style={styles.muted}>No shares available</Text>
            ) : (
              <View style={{ marginTop: 8 }}>
                {sharesData.shares.map((sh: any, i: number) => (
                  <View
                    key={(sh.userId ?? sh.sessionId ?? i) + "-" + i}
                    style={{
                      borderWidth: 1,
                      borderColor: "#eee",
                      borderRadius: 8,
                      padding: 10,
                      marginTop: 8,
                      backgroundColor: "#fff",
                    }}
                  >
                    <TouchableOpacity
                      onPress={() => toggleShareExpand(i)}
                      style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
                    >
                      <View>
                        <Text style={{ fontWeight: "700" }}>{sh.userDisplayName ?? `User ${sh.userId ?? "-"}`}</Text>
                        <Text style={{ color: "#6b7280" }}>
                          Session: {sh.sessionId ?? "-"} · {sh.statusName ?? ""}
                        </Text>
                      </View>
                      <Text style={{ color: "#6b7280" }}>{expandedShares[i] ? "▴" : "▾"}</Text>
                    </TouchableOpacity>

                    {expandedShares[i] && (
                      <View style={{ marginTop: 10 }}>
                        {(!sh.segments || sh.segments.length === 0) ? (
                          <Text style={styles.muted}>No segments</Text>
                        ) : (
                          sh.segments.map((seg: any, si: number) => (
                            <View
                              key={(seg.segmentId ?? si) + "-" + si}
                              style={{ padding: 8, backgroundColor: "#fafafa", borderRadius: 8, marginTop: 8 }}
                            >
                              <Text style={{ fontWeight: "700" }}>
                                Segment {seg.segmentId ?? si} — Day {seg.dayIndex ?? "-"}
                              </Text>
                              <Text style={{ color: "#6b7280", marginTop: 4 }}>
                                From: {formatUtcToLocal(seg.fromUtc)} · To: {formatUtcToLocal(seg.toUtc)}
                              </Text>

                              <View style={{ marginTop: 8 }}>
                                {(!seg.metrics || seg.metrics.length === 0) ? (
                                  <Text style={styles.muted}>No metrics</Text>
                                ) : (
                                  seg.metrics.map((m: any, mi: number) => (
                                    <View
                                      key={(m.metricId ?? mi) + "-" + mi}
                                      style={{ paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#eee" }}
                                    >
                                      <Text style={{ fontWeight: "600" }}>
                                        {m.metricName ?? m.metricName ?? `Metric ${m.metricId ?? mi}`}{" "}
                                        {m.unitCode ? `(${m.unitCode})` : ""}
                                      </Text>

                                      {Object.entries(m)
                                        .filter(([k]) => k !== "metricName" && k !== "metricId" && k !== "unitCode")
                                        .map(([k, v]) => (
                                          <Text key={k} style={{ color: "#111827" }}>
                                            {k}: {typeof v === "object" ? JSON.stringify(v) : String(v)}
                                          </Text>
                                        ))}
                                    </View>
                                  ))
                                )}
                              </View>
                            </View>
                          ))
                        )}
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}

            <View style={styles.formActions}>
              <TouchableOpacity
                style={[styles.btn, styles.btnPrimary]}
                onPress={() => router.push(`/studies/${study.postingId}/manage`)}
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
                <Text style={styles.statNumber}>{study.metrics?.length ?? 0}</Text>
                <Text style={styles.statLabel}>Metrics</Text>
              </View>

              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{study.healthConditions?.length ?? 0}</Text>
                <Text style={styles.statLabel}>Health Conditions</Text>
              </View>

              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{study.tags?.length ?? 0}</Text>
                <Text style={styles.statLabel}>Tags</Text>
              </View>
            </View>

            <View style={styles.metaBlock}>
              <Text style={styles.metaLabel}>Buyer</Text>
              <Text style={styles.metaValue}>{study.buyerDisplayName}</Text>
            </View>

            <View style={styles.metaBlock}>
              <Text style={styles.metaLabel}>Study ID</Text>
              <Text style={styles.metaValue}>{study.postingId}</Text>
            </View>

          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Styles: intentionally matches manage.tsx for consistent layout
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
    textAlign: "center",
  },
  statNumber: { fontSize: 28, fontWeight: "800" },
  statLabel: { color: "#6b7280", marginTop: 6 ,     textAlign: "center",
},

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