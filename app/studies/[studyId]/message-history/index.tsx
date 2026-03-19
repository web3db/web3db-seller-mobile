import React, { useEffect, useState, useCallback } from "react";
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
import { Colors, palette } from "@/constants/theme";
import { messageHistoryByPosting, surveyListByPosting } from "@/app/services/surveys/api";
import type { MessageEvent, Survey } from "@/app/services/surveys/types";

const PAGE_SIZE = 20;

const EVENT_SOURCE_LABELS: Record<string, string> = {
  SURVEY_SEND: "Bulk Send",
  DISPATCH_CENTER: "Dispatch",
  CUSTOM_MESSAGE: "Custom",
};

const EVENT_SOURCE_COLORS: Record<string, { bg: string; text: string }> = {
  SURVEY_SEND:     { bg: "#DBEAFE", text: "#1D4ED8" },
  DISPATCH_CENTER: { bg: "#EDE9FE", text: "#6D28D9" },
  CUSTOM_MESSAGE:  { bg: "#FEF3C7", text: "#92400E" },
};

const SOURCE_OPTIONS = [
  { label: "All Sources", value: "" },
  { label: "Bulk Send",   value: "SURVEY_SEND" },
  { label: "Dispatch",    value: "DISPATCH_CENTER" },
  { label: "Custom",      value: "CUSTOM_MESSAGE" },
];

export default function MessageHistoryPage() {
  const { studyId, survey_id: qsSurveyId } = useLocalSearchParams() as {
    studyId?: string;
    survey_id?: string;
  };
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isNarrow = width < 680;

  // Filter state — pre-populate survey_id from query string if present
  const [filterSurveyId, setFilterSurveyId] = useState<string>(qsSurveyId ?? "");
  const [filterSource, setFilterSource]     = useState<string>("");
  const [page, setPage]                     = useState(1);

  // Data state
  const [events, setEvents]     = useState<MessageEvent[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  // Survey list for filter dropdown
  const [surveys, setSurveys]   = useState<Survey[]>([]);

  // Load survey list once for filter dropdown
  useEffect(() => {
    if (!studyId) return;
    surveyListByPosting(studyId, { page_size: 100 })
      .then((r) => setSurveys(r.surveys ?? []))
      .catch(() => {});
  }, [studyId]);

  const loadEvents = useCallback(async () => {
    if (!studyId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await messageHistoryByPosting(studyId, {
        ...(filterSurveyId ? { survey_id: filterSurveyId } : {}),
        ...(filterSource   ? { event_source: filterSource } : {}),
        page,
        page_size: PAGE_SIZE,
      });
      setEvents(res.events ?? []);
      setTotal(res.total ?? 0);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load message history");
    } finally {
      setLoading(false);
    }
  }, [studyId, filterSurveyId, filterSource, page]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  // Reset to page 1 when filters change
  function applyFilter(surveyId: string, source: string) {
    setFilterSurveyId(surveyId);
    setFilterSource(source);
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function formatDate(iso: string) {
    try { return new Date(iso).toLocaleString(); } catch { return iso; }
  }

  function sourceBadge(source: string) {
    const colors = EVENT_SOURCE_COLORS[source] ?? { bg: palette.light.surface, text: Colors.light.text };
    const label  = EVENT_SOURCE_LABELS[source] ?? source;
    return (
      <View style={[styles.badge, { backgroundColor: colors.bg }]}>
        <Text style={[styles.badgeText, { color: colors.text }]}>{label}</Text>
      </View>
    );
  }

  function SurveyFilterPicker() {
    const options = [
      { label: "All Surveys", value: "" },
      ...surveys.map((s) => ({ label: s.title, value: String(s.survey_id) })),
    ];
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
        {options.map((o) => (
          <TouchableOpacity
            key={o.value}
            style={[styles.chip, filterSurveyId === o.value && styles.chipActive]}
            onPress={() => applyFilter(o.value, filterSource)}
          >
            <Text style={[styles.chipText, filterSurveyId === o.value && styles.chipTextActive]}>
              {o.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  }

  function SourceFilterPicker() {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
        {SOURCE_OPTIONS.map((o) => (
          <TouchableOpacity
            key={o.value}
            style={[styles.chip, filterSource === o.value && styles.chipActive]}
            onPress={() => applyFilter(filterSurveyId, o.value)}
          >
            <Text style={[styles.chipText, filterSource === o.value && styles.chipTextActive]}>
              {o.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.container}>

        {/* ── Header ───────────────────────────────────────────────────── */}
        <View style={styles.pageHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.pageTitle}>Message History</Text>
            <Text style={styles.breadcrumb}>Study #{studyId} › Message History</Text>
          </View>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.push(`/studies/${studyId}/surveys/dispatch`)}
          >
            <Text style={styles.backBtnText}>← Back to Dispatch</Text>
          </TouchableOpacity>
        </View>

        {/* ── Filters ──────────────────────────────────────────────────── */}
        <View style={styles.filtersCard}>
          <Text style={styles.filterLabel}>Survey</Text>
          <SurveyFilterPicker />
          <Text style={[styles.filterLabel, { marginTop: 8 }]}>Source</Text>
          <SourceFilterPicker />
        </View>

        {/* ── Content ──────────────────────────────────────────────────── */}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={palette.light.primary} />
          </View>
        ) : error ? (
          <View style={styles.errorState}>
            <Text style={styles.errorTitle}>Failed to load</Text>
            <Text style={styles.errorMsg}>{error}</Text>
            <TouchableOpacity style={styles.btnPrimary} onPress={loadEvents}>
              <Text style={styles.btnPrimaryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : events.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptyMsg}>
              No messages have been sent for this study
              {filterSurveyId || filterSource ? " with the current filters" : ""}.
            </Text>
            {!filterSurveyId && !filterSource && (
              <TouchableOpacity
                style={styles.btnPrimary}
                onPress={() => router.push(`/studies/${studyId}/surveys/dispatch`)}
              >
                <Text style={styles.btnPrimaryText}>Go to Dispatch Center</Text>
              </TouchableOpacity>
            )}
            {(filterSurveyId || filterSource) && (
              <TouchableOpacity
                style={styles.btnGhost}
                onPress={() => applyFilter("", "")}
              >
                <Text style={styles.btnGhostText}>Clear Filters</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <>
            <Text style={styles.resultCount}>
              {total} event{total !== 1 ? "s" : ""}
              {filterSurveyId || filterSource ? " (filtered)" : ""}
            </Text>

            {events.map((ev) => (
              <TouchableOpacity
                key={ev.message_event_id}
                style={styles.eventCard}
                onPress={() =>
                  router.push(
                    `/studies/${studyId}/message-history/${ev.message_event_id}`
                  )
                }
                activeOpacity={0.75}
              >
                {/* Row 1: timestamp + badge */}
                <View style={styles.eventTopRow}>
                  <Text style={styles.eventDate}>{formatDate(ev.created_on)}</Text>
                  {sourceBadge(ev.event_source)}
                </View>

                {/* Row 2: survey context */}
                <Text style={styles.eventSurvey}>
                  {ev.survey_title
                    ? ev.survey_title
                    : ev.survey_id
                    ? `Survey #${ev.survey_id}`
                    : "Multiple surveys"}
                </Text>

                {/* Row 3: dispatch mode + flags */}
                <View style={styles.eventMetaRow}>
                  {ev.dispatch_mode && (
                    <View style={styles.metaPill}>
                      <Text style={styles.metaPillText}>{ev.dispatch_mode}</Text>
                    </View>
                  )}
                  {ev.include_link && (
                    <View style={styles.metaPill}>
                      <Text style={styles.metaPillText}>Link</Text>
                    </View>
                  )}
                  {ev.include_message && (
                    <View style={[styles.metaPill, styles.metaPillMsg]}>
                      <Text style={[styles.metaPillText, styles.metaPillMsgText]}>
                        Message included
                      </Text>
                    </View>
                  )}
                </View>

                {/* Row 4: summary counts */}
                <View style={[styles.summaryRow, isNarrow && styles.summaryRowWrap]}>
                  {[
                    { label: "Evaluated", val: ev.summary?.targeted ?? 0 },
                    { label: "Sent",      val: ev.summary?.sent    ?? 0, color: "#16A34A" },
                    { label: "Failed",    val: ev.summary?.failed  ?? 0, color: "#DC2626" },
                    { label: "Skipped",   val: ev.summary?.skipped ?? 0 },
                  ].map(({ label, val, color }) => (
                    <View key={label} style={styles.summaryCell}>
                      <Text style={[styles.summaryCellNum, color ? { color } : null]}>
                        {val}
                      </Text>
                      <Text style={styles.summaryCellLbl}>{label}</Text>
                    </View>
                  ))}
                  <View style={styles.summaryArrow}>
                    <Text style={styles.summaryArrowText}>›</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <View style={styles.pagination}>
                <TouchableOpacity
                  style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
                  onPress={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  <Text style={styles.pageBtnText}>← Prev</Text>
                </TouchableOpacity>
                <Text style={styles.pageIndicator}>
                  Page {page} of {totalPages}
                </Text>
                <TouchableOpacity
                  style={[styles.pageBtn, page >= totalPages && styles.pageBtnDisabled]}
                  onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  <Text style={styles.pageBtnText}>Next →</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
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
  center: { paddingVertical: 48, alignItems: "center" },

  pageHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    flexWrap: "wrap",
  },
  pageTitle: { fontSize: 24, fontWeight: "800", color: Colors.light.text },
  breadcrumb: { fontSize: 13, color: palette.light.text.muted, marginTop: 4 },
  backBtn: {
    borderWidth: 1,
    borderColor: palette.light.border,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  backBtnText: { fontSize: 13, fontWeight: "600", color: Colors.light.text },

  filtersCard: {
    backgroundColor: Colors.light.background,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.light.border,
    gap: 6,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: palette.light.text.muted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  chipScroll: { flexGrow: 0 },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.light.border,
    backgroundColor: Colors.light.background,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: palette.light.primary,
    borderColor: palette.light.primary,
  },
  chipText: { fontSize: 13, color: Colors.light.text, fontWeight: "500" },
  chipTextActive: { color: "#fff", fontWeight: "700" },

  resultCount: {
    fontSize: 13,
    color: palette.light.text.muted,
    marginTop: -4,
  },

  eventCard: {
    backgroundColor: Colors.light.background,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.light.border,
    gap: 10,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
      default: { boxShadow: "0 1px 8px rgba(0,0,0,0.05)" } as any,
    }),
  },
  eventTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  eventDate: { fontSize: 13, color: palette.light.text.muted, fontWeight: "500" },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: { fontSize: 12, fontWeight: "700" },
  eventSurvey: { fontSize: 15, fontWeight: "700", color: Colors.light.text },
  eventMetaRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  metaPill: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: palette.light.surface,
    borderWidth: 1,
    borderColor: palette.light.border,
  },
  metaPillText: { fontSize: 11, color: palette.light.text.muted, fontWeight: "600" },
  metaPillMsg: { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" },
  metaPillMsgText: { color: "#1D4ED8" },

  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: palette.light.border,
    paddingTop: 10,
    gap: 4,
  },
  summaryRowWrap: { flexWrap: "wrap" },
  summaryCell: { flex: 1, alignItems: "center", minWidth: 60 },
  summaryCellNum: { fontSize: 18, fontWeight: "800", color: Colors.light.text },
  summaryCellLbl: { fontSize: 11, color: palette.light.text.muted, marginTop: 1 },
  summaryArrow: { paddingLeft: 8 },
  summaryArrowText: { fontSize: 22, color: palette.light.text.muted },

  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingTop: 8,
  },
  pageBtn: {
    borderWidth: 1,
    borderColor: palette.light.border,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  pageBtnDisabled: { opacity: 0.35 },
  pageBtnText: { fontSize: 13, fontWeight: "600", color: Colors.light.text },
  pageIndicator: { fontSize: 13, color: palette.light.text.muted },

  emptyState: { alignItems: "center", paddingVertical: 48, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: Colors.light.text },
  emptyMsg: { fontSize: 14, color: palette.light.text.muted, textAlign: "center", lineHeight: 20 },

  errorState: { alignItems: "center", paddingVertical: 48, gap: 12 },
  errorTitle: { fontSize: 18, fontWeight: "700", color: Colors.light.text },
  errorMsg: { fontSize: 14, color: "#DC2626", textAlign: "center" },

  btnPrimary: {
    backgroundColor: palette.light.primary,
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
  },
  btnPrimaryText: { color: "#fff", fontWeight: "700", fontSize: 14 },
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
});
