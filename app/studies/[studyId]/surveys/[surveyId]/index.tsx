import React, { useEffect, useState } from "react";
import { Colors, palette } from "@/constants/theme";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { surveyGet } from "../../../../services/surveys/api";
import type { Survey } from "../../../../services/surveys/types";

declare const __DEV__: boolean;

export default function SurveyManagePage() {
  const { studyId, surveyId } = useLocalSearchParams() as {
    studyId?: string;
    surveyId?: string;
  };
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isNarrow = width < 720;

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!surveyId) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await surveyGet(surveyId!, { include_stats: true });
        if (!cancelled) {
          // Validate posting_id matches studyId
          if (studyId && res.survey.posting_id !== Number(studyId)) {
            setError(
              `This survey (ID ${surveyId}) does not belong to study #${studyId}.`
            );
          } else {
            setSurvey(res.survey);
          }
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load survey");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [surveyId, studyId, retryCount]);

  function formatDate(iso: string) {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={palette.light.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.root}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.errorState}>
            <Text style={styles.errorTitle}>Unable to load survey</Text>
            <Text style={styles.errorText}>{error}</Text>
            <View style={styles.errorActions}>
              <TouchableOpacity
                style={styles.btnPrimary}
                onPress={() => setRetryCount((c) => c + 1)}
              >
                <Text style={styles.btnPrimaryText}>Retry</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnGhost}
                onPress={() => router.push(`/studies/${studyId}/surveys`)}
              >
                <Text style={styles.btnGhostText}>Back to Surveys</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!survey) return null;

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.pageHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.pageTitle} numberOfLines={2}>
              {survey.title}
            </Text>
            <Text style={styles.breadcrumb}>
              Study #{studyId} › Surveys › #{surveyId}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              survey.is_active
                ? styles.statusBadgeActive
                : styles.statusBadgeInactive,
            ]}
          >
            <Text
              style={[
                styles.statusBadgeText,
                survey.is_active
                  ? styles.statusBadgeActiveText
                  : styles.statusBadgeInactiveText,
              ]}
            >
              {survey.is_active ? "Active" : "Inactive"}
            </Text>
          </View>
        </View>

        {/* Details Card */}
        <View
          style={[
            styles.contentRow,
            isNarrow ? styles.columnLayout : styles.rowLayout,
          ]}
        >
          {/* Survey Details */}
          <View
            style={[
              styles.card,
              isNarrow ? styles.fullWidth : styles.leftColumn,
            ]}
          >
            <Text style={styles.cardSectionTitle}>Survey Details</Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Survey ID</Text>
              <Text style={styles.infoValue}>{survey.survey_id}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Study ID</Text>
              <Text style={styles.infoValue}>{survey.posting_id}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Status</Text>
              <Text style={styles.infoValue}>
                {survey.is_active ? "Active" : "Inactive"}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Created On</Text>
              <Text style={styles.infoValue}>{formatDate(survey.created_on)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Modified On</Text>
              <Text style={styles.infoValue}>{formatDate(survey.modified_on)}</Text>
            </View>

            {survey.google_form_responder_url && (
              <View style={styles.urlRow}>
                <Text style={styles.infoLabel}>Google Form URL</Text>
                <Text style={styles.urlValue} numberOfLines={3} selectable>
                  {survey.google_form_responder_url}
                </Text>
              </View>
            )}
          </View>

          {/* Stats Card */}
          <View
            style={[
              styles.card,
              isNarrow ? styles.fullWidth : styles.rightColumn,
            ]}
          >
            <Text style={styles.cardSectionTitle}>Statistics</Text>
            {survey.stats ? (
              <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                  <Text style={styles.statNumber}>
                    {survey.stats.recipients_total}
                  </Text>
                  <Text style={styles.statLabel}>Recipients</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statNumber}>
                    {survey.stats.opened_total}
                  </Text>
                  <Text style={styles.statLabel}>Opened</Text>
                </View>
                {survey.stats.recipients_total > 0 && (
                  <View style={styles.statBox}>
                    <Text style={styles.statNumber}>
                      {Math.round(
                        (survey.stats.opened_total /
                          survey.stats.recipients_total) *
                          100
                      )}
                      %
                    </Text>
                    <Text style={styles.statLabel}>Open Rate</Text>
                  </View>
                )}
              </View>
            ) : (
              <Text style={styles.muted}>Stats unavailable</Text>
            )}
          </View>
        </View>

        {/* Action Buttons */}
        <View
          style={[
            styles.actionButtons,
            isNarrow ? styles.actionButtonsColumn : styles.actionButtonsRow,
          ]}
        >
          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={() =>
              router.push(
                `/studies/${studyId}/surveys/${surveyId}/recipients`
              )
            }
          >
            <Text style={styles.btnPrimaryText}>View Recipients</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btnSecondary}
            onPress={() =>
              router.push(`/studies/${studyId}/surveys/dispatch`)
            }
          >
            <Text style={styles.btnSecondaryText}>Dispatch Center</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btnGhost}
            onPress={() => router.push(`/studies/${studyId}/surveys`)}
          >
            <Text style={styles.btnGhostText}>← Back to Surveys</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.light.background },
  container: {
    padding: 20,
    paddingTop: Platform.OS === "web" ? 80 : 20,
    paddingBottom: 48,
    backgroundColor: palette.light.surface,
    gap: 16,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  pageHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    flexWrap: "wrap",
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.light.text,
    lineHeight: 32,
  },
  breadcrumb: { fontSize: 13, color: palette.light.text.muted, marginTop: 4 },

  contentRow: { gap: 16, width: "100%" },
  rowLayout: { flexDirection: "row", alignItems: "flex-start" },
  columnLayout: { flexDirection: "column" },
  leftColumn: { flex: 2, marginRight: 8, minWidth: 0 },
  rightColumn: { flex: 1, marginLeft: 8, minWidth: 220 },
  fullWidth: { width: "100%" },

  card: {
    backgroundColor: Colors.light.background,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: palette.light.border,
    gap: 10,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: { elevation: 3 },
      default: { boxShadow: "0 2px 12px rgba(0,0,0,0.05)" } as any,
    }),
  },
  cardSectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: palette.light.text.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 9,
    paddingHorizontal: 12,
    backgroundColor: palette.light.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
  },
  infoLabel: {
    fontSize: 13,
    color: palette.light.text.muted,
    flex: 1,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.light.text,
    flex: 1,
    textAlign: "right",
    marginLeft: 8,
  },
  urlRow: {
    backgroundColor: palette.light.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    padding: 12,
    gap: 4,
  },
  urlValue: {
    fontSize: 12,
    color: palette.light.text.muted,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },

  statsGrid: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  statBox: {
    flex: 1,
    minWidth: 70,
    backgroundColor: palette.light.surface,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: palette.light.border,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: "800",
    color: palette.light.primary,
  },
  statLabel: {
    fontSize: 12,
    color: palette.light.text.muted,
    marginTop: 4,
    textAlign: "center",
  },

  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    alignSelf: "flex-start",
    marginTop: 2,
  },
  statusBadgeActive: { backgroundColor: "#DCFCE7" },
  statusBadgeActiveText: { color: "#166534" },
  statusBadgeInactive: { backgroundColor: palette.light.muted },
  statusBadgeInactiveText: { color: palette.light.text.secondary },
  statusBadgeText: { fontSize: 13, fontWeight: "700" },

  actionButtons: { gap: 10 },
  actionButtonsRow: { flexDirection: "row", flexWrap: "wrap" },
  actionButtonsColumn: { flexDirection: "column" },

  btnPrimary: {
    backgroundColor: palette.light.primary,
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
  },
  btnPrimaryText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  btnSecondary: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: palette.light.primary,
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
  },
  btnSecondaryText: { color: palette.light.primary, fontWeight: "700", fontSize: 14 },
  btnGhost: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: palette.light.border,
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
  },
  btnGhostText: { color: Colors.light.text, fontWeight: "600", fontSize: 14 },

  muted: { color: palette.light.text.muted, fontSize: 14 },

  errorState: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.light.text,
  },
  errorText: { fontSize: 14, color: "#DC2626", textAlign: "center" },
  errorActions: { flexDirection: "row", gap: 10 },
});
