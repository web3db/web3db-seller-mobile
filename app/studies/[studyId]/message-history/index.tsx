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
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { messageHistoryByPosting, surveyListByPosting } from "../../../services/surveys/api";
import type { MessageEvent, Survey } from "../../../services/surveys/types";

declare const __DEV__: boolean;

function EventSourceBadge({ source }: { source: string }) {
  const config: Record<string, { bg: string; text: string }> = {
    SURVEY_SEND: { bg: "#DBEAFE", text: "#1E40AF" },
    DISPATCH_CENTER: { bg: "#FEF9C3", text: "#854D0E" },
    CUSTOM_MESSAGE: { bg: "#F3E8FF", text: "#6B21A8" },
    // Backward compat for old values
    SEND_TO_ALL: { bg: "#DBEAFE", text: "#1E40AF" },
    DISPATCH: { bg: "#FEF9C3", text: "#854D0E" },
    MANUAL: { bg: "#F3E8FF", text: "#6B21A8" },
  };
  const c = config[source] ?? { bg: palette.light.muted, text: palette.light.text.secondary };
  return (
    <View style={[mStyles.badge, { backgroundColor: c.bg }]}>
      <Text style={[mStyles.badgeText, { color: c.text }]}>{source}</Text>
    </View>
  );
}

export default function MessageHistoryListPage() {
  const { studyId } = useLocalSearchParams() as { studyId?: string };
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isNarrow = width < 720;

  const [events, setEvents] = useState<MessageEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Filters
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [filterSurveyId, setFilterSurveyId] = useState<number | undefined>(undefined);
  const [filterEventSource, setFilterEventSource] = useState<string | undefined>(undefined);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Load surveys for filter dropdown
  useEffect(() => {
    if (!studyId) return;
    let cancelled = false;
    surveyListByPosting(studyId, { page_size: 100 })
      .then((res) => { if (!cancelled) setSurveys(res.surveys); })
      .catch((e) => { if (__DEV__) console.warn('[MessageHistory] Failed to load survey filters:', e); });
    return () => { cancelled = true; };
  }, [studyId]);

  // Load events
  useEffect(() => {
    if (!studyId) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await messageHistoryByPosting(studyId!, {
          survey_id: filterSurveyId,
          event_source: filterEventSource,
          page,
          page_size: pageSize,
        });
        if (!cancelled) {
          setEvents(res.events);
          setTotal(res.total);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load message history");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [studyId, page, filterSurveyId, filterEventSource, retryCount]);

  function formatDate(iso: string) {
    try { return new Date(iso).toLocaleString(); } catch { return iso; }
  }

  return (
    <SafeAreaView style={mStyles.root}>
      <ScrollView contentContainerStyle={mStyles.container}>
        {/* Header */}
        <View style={mStyles.pageHeader}>
          <View>
            <Text style={mStyles.pageTitle}>Message History</Text>
            <Text style={mStyles.breadcrumb}>Study #{studyId} › Message History</Text>
          </View>
          <TouchableOpacity
            style={mStyles.btnGhost}
            onPress={() => router.push(`/studies/${studyId}/surveys`)}
          >
            <Text style={mStyles.btnGhostText}>Back to Surveys</Text>
          </TouchableOpacity>
        </View>

        {/* Filters */}
        <View style={[mStyles.filterBar, isNarrow && mStyles.filterBarNarrow]}>
          {/* Event source filter */}
          <View style={mStyles.filterButtons}>
            {[
              { label: "All", value: undefined },
              { label: "Survey Send", value: "SURVEY_SEND" },
              { label: "Dispatch Center", value: "DISPATCH_CENTER" },
              { label: "Custom Message", value: "CUSTOM_MESSAGE" },
            ].map((opt) => (
              <TouchableOpacity
                key={String(opt.label)}
                style={[
                  mStyles.filterBtn,
                  filterEventSource === opt.value && mStyles.filterBtnActive,
                ]}
                onPress={() => { setFilterEventSource(opt.value); setPage(1); }}
              >
                <Text
                  style={[
                    mStyles.filterBtnText,
                    filterEventSource === opt.value && mStyles.filterBtnTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Survey filter */}
          {surveys.length > 0 && (
            <View style={mStyles.filterButtons}>
              <TouchableOpacity
                style={[mStyles.filterBtn, !filterSurveyId && mStyles.filterBtnActive]}
                onPress={() => { setFilterSurveyId(undefined); setPage(1); }}
              >
                <Text style={[mStyles.filterBtnText, !filterSurveyId && mStyles.filterBtnTextActive]}>
                  All Surveys
                </Text>
              </TouchableOpacity>
              {surveys.slice(0, 3).map((s) => (
                <TouchableOpacity
                  key={s.survey_id}
                  style={[mStyles.filterBtn, filterSurveyId === s.survey_id && mStyles.filterBtnActive]}
                  onPress={() => { setFilterSurveyId(s.survey_id); setPage(1); }}
                >
                  <Text
                    style={[mStyles.filterBtnText, filterSurveyId === s.survey_id && mStyles.filterBtnTextActive]}
                    numberOfLines={1}
                  >
                    {s.title}
                  </Text>
                </TouchableOpacity>
              ))}
              {surveys.length > 3 && (
                <Text style={mStyles.moreText}>
                  +{surveys.length - 3} more
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Error */}
        {error && (
          <View style={mStyles.errorBanner}>
            <Text style={mStyles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => setRetryCount((c) => c + 1)}>
              <Text style={mStyles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Loading */}
        {loading && <ActivityIndicator color={palette.light.primary} style={{ marginVertical: 32 }} />}

        {/* Empty */}
        {!loading && !error && events.length === 0 && (
          <View style={mStyles.emptyState}>
            <Text style={mStyles.emptyTitle}>No message events found</Text>
            <Text style={mStyles.emptySubtitle}>
              Message events are created when you send or dispatch surveys.
            </Text>
          </View>
        )}

        {/* Events Table */}
        {!loading && events.length > 0 && (
          <View style={mStyles.card}>
            {!isNarrow && (
              <View style={mStyles.tableHeaderRow}>
                <Text style={[mStyles.thCell, { flex: 2 }]}>Created</Text>
                <Text style={[mStyles.thCell, { flex: 1.5, textAlign: "center" }]}>Source</Text>
                <Text style={[mStyles.thCell, { flex: 2 }]}>Survey</Text>
                <Text style={[mStyles.thCell, { flex: 0.8, textAlign: "center" }]}>Link</Text>
                <Text style={[mStyles.thCell, { flex: 0.8, textAlign: "center" }]}>Msg</Text>
                <Text style={[mStyles.thCell, { flex: 1, textAlign: "right" }]}>Sent</Text>
                <Text style={[mStyles.thCell, { flex: 1, textAlign: "right" }]}>Failed</Text>
                <Text style={[mStyles.thCell, { flex: 1, textAlign: "right" }]}>Skipped</Text>
              </View>
            )}

            {events.map((evt, idx) => (
              <TouchableOpacity
                key={evt.message_event_id}
                style={[
                  mStyles.tableRow,
                  idx < events.length - 1 && mStyles.tableRowBorder,
                ]}
                onPress={() =>
                  router.push(`/studies/${studyId}/message-history/${evt.message_event_id}`)
                }
              >
                {isNarrow ? (
                  <View style={mStyles.mobileRow}>
                    <View style={mStyles.mobileRowTop}>
                      <Text style={mStyles.mobileRowDate}>{formatDate(evt.created_on)}</Text>
                      <EventSourceBadge source={evt.event_source} />
                    </View>
                    <Text style={mStyles.mobileRowSurvey} numberOfLines={1}>
                      {evt.survey_title ?? "Multiple surveys"}
                    </Text>
                    <Text style={mStyles.mobileRowMeta}>
                      {evt.total_sent} sent · {evt.total_failed} failed · {evt.total_skipped} skipped
                      {evt.include_survey_link ? " · Link" : ""}
                      {evt.include_message ? " · Message" : ""}
                    </Text>
                  </View>
                ) : (
                  <>
                    <Text style={[mStyles.tdCell, { flex: 2 }]}>{formatDate(evt.created_on)}</Text>
                    <View style={[{ flex: 1.5, alignItems: "center" }]}>
                      <EventSourceBadge source={evt.event_source} />
                    </View>
                    <Text style={[mStyles.tdCell, { flex: 2 }]} numberOfLines={1}>
                      {evt.survey_title ?? "Multiple surveys"}
                    </Text>
                    <Text style={[mStyles.tdCell, { flex: 0.8, textAlign: "center" }]}>
                      {evt.include_survey_link ? "Yes" : "No"}
                    </Text>
                    <Text style={[mStyles.tdCell, { flex: 0.8, textAlign: "center" }]}>
                      {evt.include_message ? "Yes" : "No"}
                    </Text>
                    <Text style={[mStyles.tdCell, { flex: 1, textAlign: "right" }]}>{evt.total_sent}</Text>
                    <Text style={[mStyles.tdCell, { flex: 1, textAlign: "right" }]}>{evt.total_failed}</Text>
                    <Text style={[mStyles.tdCell, { flex: 1, textAlign: "right" }]}>{evt.total_skipped}</Text>
                  </>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Pagination */}
        {!loading && total > pageSize && (
          <View style={mStyles.pagination}>
            <TouchableOpacity
              style={[mStyles.pageBtn, page <= 1 && mStyles.pageBtnDisabled]}
              onPress={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <Text style={mStyles.pageBtnText}>Prev</Text>
            </TouchableOpacity>
            <Text style={mStyles.pageInfo}>Page {page} of {totalPages} ({total} total)</Text>
            <TouchableOpacity
              style={[mStyles.pageBtn, page >= totalPages && mStyles.pageBtnDisabled]}
              onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              <Text style={mStyles.pageBtnText}>Next</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const mStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.light.background },
  container: {
    padding: 20,
    paddingTop: Platform.OS === "web" ? 80 : 20,
    paddingBottom: 48,
    backgroundColor: palette.light.surface,
    gap: 16,
  },

  pageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: 12,
  },
  pageTitle: { fontSize: 26, fontWeight: "800", color: Colors.light.text },
  breadcrumb: { fontSize: 13, color: palette.light.text.muted, marginTop: 4 },

  filterBar: { gap: 12 },
  filterBarNarrow: { flexDirection: "column" },
  filterButtons: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  filterBtn: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.light.border,
    backgroundColor: Colors.light.background,
    maxWidth: 160,
  },
  filterBtnActive: {
    backgroundColor: palette.light.primary,
    borderColor: palette.light.primary,
  },
  filterBtnText: { fontSize: 13, fontWeight: "600", color: palette.light.text.muted },
  filterBtnTextActive: { color: "#fff" },

  card: {
    backgroundColor: Colors.light.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.light.border,
    overflow: "hidden",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12 },
      android: { elevation: 3 },
      default: { boxShadow: "0 2px 12px rgba(0,0,0,0.05)" } as any,
    }),
  },

  tableHeaderRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: palette.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: palette.light.border,
  },
  thCell: {
    fontSize: 11,
    fontWeight: "700",
    color: palette.light.text.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: Colors.light.background,
  },
  tableRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: palette.light.border,
  },
  tdCell: { fontSize: 13, color: Colors.light.text },

  mobileRow: { gap: 6 },
  mobileRowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  mobileRowDate: { fontSize: 14, fontWeight: "600", color: Colors.light.text },
  mobileRowSurvey: { fontSize: 13, color: Colors.light.text },
  mobileRowMeta: { fontSize: 12, color: palette.light.text.muted },

  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: "600" },

  pagination: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 16 },
  pageBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.light.primary,
  },
  pageBtnDisabled: { borderColor: palette.light.border, opacity: 0.5 },
  pageBtnText: { fontSize: 14, fontWeight: "600", color: palette.light.primary },
  pageInfo: { fontSize: 14, color: palette.light.text.muted },

  emptyState: { alignItems: "center", paddingVertical: 48, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: Colors.light.text },
  emptySubtitle: { fontSize: 14, color: palette.light.text.muted, textAlign: "center" },

  errorBanner: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  errorText: { color: "#DC2626", flex: 1 },
  retryText: { color: palette.light.primary, fontWeight: "600", marginLeft: 12 },

  btnGhost: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: palette.light.border,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  btnGhostText: { color: Colors.light.text, fontWeight: "600", fontSize: 13 },

  moreText: { fontSize: 12, color: palette.light.text.muted, alignSelf: "center" },
});
