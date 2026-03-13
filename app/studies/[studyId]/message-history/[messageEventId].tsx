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
import { messageHistoryGet } from "../../../services/surveys/api";
import type { MessageEvent, MessageRecipientItem } from "../../../services/surveys/types";

declare const __DEV__: boolean;

type StatusFilter = "ALL" | "SENT" | "FAILED" | "SKIPPED";

function OutcomeBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string }> = {
    SENT: { bg: "#DCFCE7", text: "#166534" },
    FAILED: { bg: "#FEF2F2", text: "#DC2626" },
    SKIPPED: { bg: "#FEF9C3", text: "#854D0E" },
    PENDING: { bg: palette.light.muted, text: palette.light.text.secondary },
  };
  const c = config[status] ?? config.PENDING;
  return (
    <View style={[dStyles.badge, { backgroundColor: c.bg }]}>
      <Text style={[dStyles.badgeText, { color: c.text }]}>{status}</Text>
    </View>
  );
}

function formatDate(iso: string | null) {
  if (!iso) return "-";
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

export default function MessageHistoryDetailPage() {
  const { studyId, messageEventId } = useLocalSearchParams() as {
    studyId?: string;
    messageEventId?: string;
  };
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isNarrow = width < 720;

  const [event, setEvent] = useState<MessageEvent | null>(null);
  const [messageText, setMessageText] = useState<string | undefined>(undefined);
  const [recipients, setRecipients] = useState<MessageRecipientItem[]>([]);
  const [recipTotal, setRecipTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const totalPages = Math.max(1, Math.ceil(recipTotal / pageSize));

  useEffect(() => {
    if (!messageEventId) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await messageHistoryGet(messageEventId!, {
          status: statusFilter === "ALL" ? undefined : statusFilter,
          page,
          page_size: pageSize,
        });
        if (!cancelled) {
          setEvent(res.event);
          setMessageText(res.message_text);
          setRecipients(res.recipients.items);
          setRecipTotal(res.recipients.total);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load message event");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [messageEventId, page, statusFilter, retryCount]);

  if (loading) {
    return (
      <SafeAreaView style={dStyles.root}>
        <View style={dStyles.center}>
          <ActivityIndicator size="large" color={palette.light.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={dStyles.root}>
        <ScrollView contentContainerStyle={dStyles.container}>
          <View style={dStyles.errorState}>
            <Text style={dStyles.errorTitle}>Unable to load message event</Text>
            <Text style={dStyles.errorText}>{error}</Text>
            <View style={dStyles.errorActions}>
              <TouchableOpacity style={dStyles.btnPrimary} onPress={() => setRetryCount((c) => c + 1)}>
                <Text style={dStyles.btnPrimaryText}>Retry</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={dStyles.btnGhost}
                onPress={() => router.push(`/studies/${studyId}/message-history`)}
              >
                <Text style={dStyles.btnGhostText}>Back to History</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={dStyles.root}>
        <View style={dStyles.notFoundContainer}>
          <Text style={dStyles.notFoundTitle}>Event not found</Text>
          <Text style={dStyles.notFoundSubtitle}>
            This message event could not be loaded or does not exist.
          </Text>
          <TouchableOpacity
            style={dStyles.notFoundButton}
            onPress={() => router.push(`/studies/${studyId}/message-history`)}
          >
            <Text style={dStyles.notFoundButtonText}>Back to History</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={dStyles.root}>
      <ScrollView contentContainerStyle={dStyles.container}>
        {/* Header */}
        <View style={dStyles.pageHeader}>
          <View style={{ flex: 1 }}>
            <Text style={dStyles.pageTitle}>Message Event #{messageEventId}</Text>
            <Text style={dStyles.breadcrumb}>
              Study #{studyId} › Message History › #{messageEventId}
            </Text>
          </View>
        </View>

        {/* Event Summary Card */}
        <View style={[dStyles.contentRow, isNarrow ? dStyles.columnLayout : dStyles.rowLayout]}>
          <View style={[dStyles.card, isNarrow ? dStyles.fullWidth : dStyles.leftColumn]}>
            <Text style={dStyles.cardSectionTitle}>Event Details</Text>

            {[
              ["Event ID", event.survey_message_event_id],
              ["Source", event.event_source],
              ["Dispatch Mode", event.dispatch_mode ?? "-"],
              ["Survey", event.survey_title ?? (event.survey_id ? `#${event.survey_id}` : "Multiple")],
              ["Created", formatDate(event.created_on)],
              ["Include Link", event.include_link ? "Yes" : "No"],
              ["Include Message", event.include_message ? "Yes" : "No"],
              ["Dry Run", event.dry_run ? "Yes" : "No"],
            ].map(([label, value]) => (
              <View key={String(label)} style={dStyles.infoRow}>
                <Text style={dStyles.infoLabel}>{label}</Text>
                <Text style={dStyles.infoValue}>{String(value)}</Text>
              </View>
            ))}
          </View>

          {/* Summary Stats */}
          <View style={[dStyles.card, isNarrow ? dStyles.fullWidth : dStyles.rightColumn]}>
            <Text style={dStyles.cardSectionTitle}>Summary</Text>
            <View style={dStyles.statsGrid}>
              {[
                { label: "Sent", value: event.pairs_sent, color: "#166534" },
                { label: "Failed", value: event.pairs_failed, color: "#DC2626" },
                { label: "Skipped", value: event.pairs_skipped, color: "#854D0E" },
              ].map((stat) => (
                <View key={stat.label} style={dStyles.statBox}>
                  <Text style={[dStyles.statNumber, { color: stat.color }]}>{stat.value}</Text>
                  <Text style={dStyles.statLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Message Content */}
        {event.include_message && messageText && (
          <View style={dStyles.card}>
            <Text style={dStyles.cardSectionTitle}>Message Content</Text>
            <View style={dStyles.messageBox}>
              <Text style={dStyles.messageText}>{messageText}</Text>
            </View>
          </View>
        )}

        {/* Recipients */}
        <View style={dStyles.card}>
          <Text style={dStyles.cardSectionTitle}>Recipients ({recipTotal})</Text>

          {/* Status filter */}
          <View style={dStyles.filterButtons}>
            {(["ALL", "SENT", "FAILED", "SKIPPED"] as StatusFilter[]).map((f) => (
              <TouchableOpacity
                key={f}
                style={[dStyles.filterBtn, statusFilter === f && dStyles.filterBtnActive]}
                onPress={() => { setStatusFilter(f); setPage(1); }}
              >
                <Text style={[dStyles.filterBtnText, statusFilter === f && dStyles.filterBtnTextActive]}>
                  {f}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {recipients.length === 0 ? (
            <Text style={dStyles.muted}>No recipients found for this filter.</Text>
          ) : (
            <View style={dStyles.tableWrapper}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ minWidth: isNarrow ? 550 : "100%" }}>
                  <View style={dStyles.tableHeaderRow}>
                    <Text style={[dStyles.thCell, { width: 140 }]}>Participant ID</Text>
                    <Text style={[dStyles.thCell, { width: 90, textAlign: "center" }]}>Status</Text>
                    <Text style={[dStyles.thCell, { width: 120 }]}>Skip Reason</Text>
                    <Text style={[dStyles.thCell, { width: 150, textAlign: "right" }]}>Attempted</Text>
                    <Text style={[dStyles.thCell, { width: 150, textAlign: "right" }]}>Completed</Text>
                    <Text style={[dStyles.thCell, { width: 120 }]}>Failure Code</Text>
                  </View>
                  {recipients.map((r, idx) => (
                    <View
                      key={r.survey_message_recipient_id}
                      style={[
                        dStyles.tableRow,
                        idx < recipients.length - 1 && dStyles.tableRowBorder,
                        idx % 2 === 1 && dStyles.tableRowAlt,
                      ]}
                    >
                      <Text style={[dStyles.tdCell, { width: 140 }]} numberOfLines={1}>
                        {r.participant_id}
                      </Text>
                      <View style={[{ width: 90, alignItems: "center" }]}>
                        <OutcomeBadge status={r.outcome_status} />
                      </View>
                      <Text style={[dStyles.tdCell, { width: 120 }]}>{r.skip_reason ?? "-"}</Text>
                      <Text style={[dStyles.tdCell, { width: 150, textAlign: "right" }]}>
                        {formatDate(r.attempted_on)}
                      </Text>
                      <Text style={[dStyles.tdCell, { width: 150, textAlign: "right" }]}>
                        {formatDate(r.completed_on)}
                      </Text>
                      <Text style={[dStyles.tdCell, { width: 120 }]}>{r.failure_code ?? "-"}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Pagination */}
          {recipTotal > pageSize && (
            <View style={dStyles.pagination}>
              <TouchableOpacity
                style={[dStyles.pageBtn, page <= 1 && dStyles.pageBtnDisabled]}
                onPress={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <Text style={dStyles.pageBtnText}>Prev</Text>
              </TouchableOpacity>
              <Text style={dStyles.pageInfo}>Page {page} of {totalPages}</Text>
              <TouchableOpacity
                style={[dStyles.pageBtn, page >= totalPages && dStyles.pageBtnDisabled]}
                onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                <Text style={dStyles.pageBtnText}>Next</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={dStyles.actionRow}>
          <TouchableOpacity
            style={dStyles.btnGhost}
            onPress={() => router.push(`/studies/${studyId}/message-history`)}
          >
            <Text style={dStyles.btnGhostText}>Back to Message History</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={dStyles.btnGhost}
            onPress={() => router.push(`/studies/${studyId}/surveys`)}
          >
            <Text style={dStyles.btnGhostText}>Back to Surveys</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const dStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.light.background },
  container: {
    padding: 20,
    paddingTop: Platform.OS === "web" ? 80 : 20,
    paddingBottom: 48,
    backgroundColor: palette.light.surface,
    gap: 16,
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },

  pageHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    flexWrap: "wrap",
  },
  pageTitle: { fontSize: 24, fontWeight: "800", color: Colors.light.text, lineHeight: 32 },
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
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12 },
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
  infoLabel: { fontSize: 13, color: palette.light.text.muted, flex: 1 },
  infoValue: { fontSize: 13, fontWeight: "600", color: Colors.light.text, flex: 1, textAlign: "right", marginLeft: 8 },

  statsGrid: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
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
  statNumber: { fontSize: 28, fontWeight: "800" },
  statLabel: { fontSize: 12, color: palette.light.text.muted, marginTop: 4, textAlign: "center" },

  messageBox: {
    backgroundColor: palette.light.surface,
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: palette.light.border,
  },
  messageText: { fontSize: 14, color: Colors.light.text, lineHeight: 20 },

  filterButtons: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  filterBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.light.border,
    backgroundColor: Colors.light.background,
  },
  filterBtnActive: { backgroundColor: palette.light.primary, borderColor: palette.light.primary },
  filterBtnText: { fontSize: 12, fontWeight: "600", color: palette.light.text.muted },
  filterBtnTextActive: { color: "#fff" },

  tableWrapper: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.light.border,
    overflow: "hidden",
  },
  tableHeaderRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 11,
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
    paddingHorizontal: 6,
  },
  tableRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  tableRowBorder: { borderBottomWidth: 1, borderBottomColor: palette.light.border },
  tableRowAlt: { backgroundColor: palette.light.surface },
  tdCell: { fontSize: 13, color: Colors.light.text, paddingHorizontal: 6 },

  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: "600" },

  pagination: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 16, marginTop: 8 },
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

  actionRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },

  muted: { color: palette.light.text.muted, fontSize: 14 },

  errorState: { alignItems: "center", paddingVertical: 48, gap: 12 },
  errorTitle: { fontSize: 18, fontWeight: "700", color: Colors.light.text },
  errorText: { fontSize: 14, color: "#DC2626", textAlign: "center" },
  errorActions: { flexDirection: "row", gap: 10 },

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

  notFoundContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  notFoundTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  notFoundSubtitle: { fontSize: 14, color: palette.light.text.muted, marginBottom: 24, textAlign: "center" },
  notFoundButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, backgroundColor: palette.light.primary },
  notFoundButtonText: { color: "#fff", fontWeight: "600" },
});
