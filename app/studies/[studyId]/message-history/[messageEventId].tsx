import React, { useEffect, useState, useMemo } from "react";
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
import { messageHistoryGet } from "@/app/services/surveys/api";
import type { MessageEventDetail, MessageRecipientOutcome } from "@/app/services/surveys/types";

const RECIPIENTS_PAGE_SIZE = 25;

const SOURCE_LABELS: Record<string, string> = {
  SURVEY_SEND:     "Bulk Send",
  DISPATCH_CENTER: "Dispatch",
  CUSTOM_MESSAGE:  "Custom",
};
const SOURCE_COLORS: Record<string, { bg: string; text: string }> = {
  SURVEY_SEND:     { bg: "#DBEAFE", text: "#1D4ED8" },
  DISPATCH_CENTER: { bg: "#EDE9FE", text: "#6D28D9" },
  CUSTOM_MESSAGE:  { bg: "#FEF3C7", text: "#92400E" },
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  SENT:    { bg: "#DCFCE7", text: "#166534" },
  FAILED:  { bg: "#FEE2E2", text: "#DC2626" },
};
function statusColors(status: string) {
  if (STATUS_COLORS[status]) return STATUS_COLORS[status];
  if (status.startsWith("SKIPPED")) return { bg: "#FEF9C3", text: "#92400E" };
  return { bg: palette.light.surface, text: Colors.light.text };
}

export default function MessageHistoryDetailPage() {
  const { studyId, messageEventId } = useLocalSearchParams() as {
    studyId?: string;
    messageEventId?: string;
  };
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isNarrow = width < 680;

  const [event, setEvent]     = useState<MessageEventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Client-side pagination for recipients table
  const [recipPage, setRecipPage] = useState(1);

  useEffect(() => {
    if (!messageEventId) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await messageHistoryGet(messageEventId!);
        if (!cancelled) {
          if (studyId && res.event.posting_id !== Number(studyId)) {
            setError(
              `This event (ID ${messageEventId}) does not belong to study #${studyId}.`
            );
          } else {
            setEvent(res.event);
            setRecipPage(1);
          }
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load event");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [messageEventId, studyId, retryCount]);

  const recipients = event?.recipients ?? [];
  const totalRecipPages = Math.max(1, Math.ceil(recipients.length / RECIPIENTS_PAGE_SIZE));
  const pagedRecipients = useMemo(
    () => recipients.slice((recipPage - 1) * RECIPIENTS_PAGE_SIZE, recipPage * RECIPIENTS_PAGE_SIZE),
    [recipients, recipPage]
  );

  function formatDate(iso: string | null | undefined) {
    if (!iso) return "—";
    try { return new Date(iso).toLocaleString(); } catch { return iso; }
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={palette.light.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error || !event) {
    return (
      <SafeAreaView style={styles.root}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.errorState}>
            <Text style={styles.errorTitle}>Unable to load event</Text>
            <Text style={styles.errorMsg}>{error ?? "Event not found"}</Text>
            <View style={styles.rowGap}>
              <TouchableOpacity
                style={styles.btnPrimary}
                onPress={() => setRetryCount((c) => c + 1)}
              >
                <Text style={styles.btnPrimaryText}>Retry</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnGhost}
                onPress={() => router.push(`/studies/${studyId}/message-history`)}
              >
                <Text style={styles.btnGhostText}>← Back</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const sourceColor = SOURCE_COLORS[event.event_source] ?? { bg: palette.light.surface, text: Colors.light.text };
  const sourceLabel = SOURCE_LABELS[event.event_source] ?? event.event_source;

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.container}>

        {/* ── Header ───────────────────────────────────────────────────── */}
        <View style={styles.pageHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.pageTitle}>Event #{event.message_event_id}</Text>
            <Text style={styles.breadcrumb}>
              Study #{studyId} › Message History › #{event.message_event_id}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.push(`/studies/${studyId}/message-history`)}
          >
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
        </View>

        {/* ── Event Summary Card ───────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardLabel}>Event Summary</Text>
            <View style={[styles.badge, { backgroundColor: sourceColor.bg }]}>
              <Text style={[styles.badgeText, { color: sourceColor.text }]}>{sourceLabel}</Text>
            </View>
          </View>

          <View style={[styles.infoGrid, isNarrow ? styles.infoGridCol : styles.infoGridRow]}>
            <View style={styles.infoCol}>
              <InfoRow label="Event ID"    value={String(event.message_event_id)} />
              <InfoRow label="Created On"  value={formatDate(event.created_on)} />
              {event.created_by_name && (
                <InfoRow label="Created By" value={event.created_by_name} />
              )}
              <InfoRow label="Source"      value={sourceLabel} />
              {event.dispatch_mode && (
                <InfoRow label="Dispatch Mode" value={event.dispatch_mode} />
              )}
            </View>
            <View style={styles.infoCol}>
              <InfoRow
                label="Survey"
                value={
                  event.survey_title
                    ? event.survey_title
                    : event.survey_id
                    ? `Survey #${event.survey_id}`
                    : "Multiple surveys"
                }
                onPress={
                  event.survey_id
                    ? () => router.push(`/studies/${studyId}/surveys/${event.survey_id}`)
                    : undefined
                }
              />
              <InfoRow label="Survey Link"     value={event.include_link    ? "Included" : "Not included"} />
              <InfoRow label="Custom Message"  value={event.include_message ? "Included" : "Not included"} />
            </View>
          </View>

          {/* Summary counts */}
          <View style={styles.summaryRow}>
            {[
              { label: "Evaluated", val: event.summary?.targeted ?? 0 },
              { label: "Sent",      val: event.summary?.sent    ?? 0, color: "#16A34A" },
              { label: "Failed",    val: event.summary?.failed  ?? 0, color: "#DC2626" },
              { label: "Skipped",   val: event.summary?.skipped ?? 0, color: "#92400E" },
            ].map(({ label, val, color }) => (
              <View key={label} style={styles.summaryCell}>
                <Text style={[styles.summaryCellNum, color ? { color } : null]}>{val}</Text>
                <Text style={styles.summaryCellLbl}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Message Content Panel ────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Custom Message</Text>
          {event.include_message && event.message_text ? (
            <View style={styles.messageBox}>
              <Text style={styles.messageText}>{event.message_text}</Text>
            </View>
          ) : (
            <Text style={styles.muted}>No custom message was included in this send.</Text>
          )}
        </View>

        {/* ── Recipients Table ─────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardLabel}>
              Recipients ({recipients.length})
            </Text>
            {totalRecipPages > 1 && (
              <Text style={styles.pageIndicatorInline}>
                Page {recipPage}/{totalRecipPages}
              </Text>
            )}
          </View>

          {recipients.length === 0 ? (
            <Text style={styles.muted}>No recipient records found for this event.</Text>
          ) : (
            <>
              {/* Table header */}
              <View style={[styles.tableHeader, isNarrow && styles.tableHeaderNarrow]}>
                <Text style={[styles.thCell, styles.thParticipant]}>Participant ID</Text>
                {event.event_source === "DISPATCH_CENTER" && (
                  <Text style={[styles.thCell, styles.thSurvey]}>Survey</Text>
                )}
                <Text style={[styles.thCell, styles.thStatus]}>Status</Text>
                <Text style={[styles.thCell, styles.thDate]}>Attempted</Text>
                <Text style={[styles.thCell, styles.thDate]}>Completed</Text>
              </View>

              {pagedRecipients.map((r, idx) => (
                <RecipientRow
                  key={`${r.participant_id}-${r.survey_id ?? ""}-${idx}`}
                  r={r}
                  showSurveyCol={event.event_source === "DISPATCH_CENTER"}
                  isNarrow={isNarrow}
                  formatDate={formatDate}
                />
              ))}

              {/* Pagination */}
              {totalRecipPages > 1 && (
                <View style={styles.pagination}>
                  <TouchableOpacity
                    style={[styles.pageBtn, recipPage <= 1 && styles.pageBtnDisabled]}
                    onPress={() => setRecipPage((p) => Math.max(1, p - 1))}
                    disabled={recipPage <= 1}
                  >
                    <Text style={styles.pageBtnText}>← Prev</Text>
                  </TouchableOpacity>
                  <Text style={styles.pageIndicator}>
                    {recipPage} / {totalRecipPages}
                  </Text>
                  <TouchableOpacity
                    style={[styles.pageBtn, recipPage >= totalRecipPages && styles.pageBtnDisabled]}
                    onPress={() => setRecipPage((p) => Math.min(totalRecipPages, p + 1))}
                    disabled={recipPage >= totalRecipPages}
                  >
                    <Text style={styles.pageBtnText}>Next →</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function InfoRow({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress?: () => void;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoKey}>{label}</Text>
      {onPress ? (
        <TouchableOpacity onPress={onPress}>
          <Text style={[styles.infoVal, styles.infoValLink]}>{value}</Text>
        </TouchableOpacity>
      ) : (
        <Text style={styles.infoVal} numberOfLines={2}>{value}</Text>
      )}
    </View>
  );
}

function RecipientRow({
  r,
  showSurveyCol,
  isNarrow,
  formatDate,
}: {
  r: MessageRecipientOutcome;
  showSurveyCol: boolean;
  isNarrow: boolean;
  formatDate: (s: string | null | undefined) => string;
}) {
  const colors = statusColors(r.outcome_status);
  const isFailed  = r.outcome_status === "FAILED";
  const isSkipped = r.outcome_status.startsWith("SKIPPED");

  return (
    <View style={styles.tableRow}>
      {/* Participant ID */}
      <Text style={[styles.tdCell, styles.thParticipant, styles.tdMono]} numberOfLines={1}>
        {r.participant_id}
      </Text>

      {/* Survey col (dispatch only) */}
      {showSurveyCol && (
        <Text style={[styles.tdCell, styles.thSurvey]}>
          {r.survey_id ? `#${r.survey_id}` : "—"}
        </Text>
      )}

      {/* Status badge */}
      <View style={[styles.thStatus, styles.tdCell]}>
        <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
          <Text style={[styles.statusBadgeText, { color: colors.text }]}>
            {r.outcome_status}
          </Text>
        </View>
        {isSkipped && r.skip_reason && (
          <Text style={styles.subNote}>{r.skip_reason}</Text>
        )}
        {isFailed && r.failure_code && (
          <Text style={[styles.subNote, styles.subNoteError]}>{r.failure_code}</Text>
        )}
      </View>

      {/* Attempted On */}
      <Text style={[styles.tdCell, styles.thDate, styles.tdDate]}>
        {formatDate(r.attempted_on)}
      </Text>

      {/* Completed On */}
      <Text style={[styles.tdCell, styles.thDate, styles.tdDate]}>
        {formatDate(r.completed_on)}
      </Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
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

  card: {
    backgroundColor: Colors.light.background,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: palette.light.border,
    gap: 12,
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
  cardLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: palette.light.text.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  badgeText: { fontSize: 12, fontWeight: "700" },

  infoGrid: { gap: 8 },
  infoGridRow: { flexDirection: "row", gap: 12 },
  infoGridCol: { flexDirection: "column" },
  infoCol: { flex: 1, gap: 6 },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: palette.light.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    gap: 8,
  },
  infoKey: { fontSize: 13, color: palette.light.text.muted, flex: 1 },
  infoVal: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.light.text,
    flex: 1.5,
    textAlign: "right",
  },
  infoValLink: {
    color: palette.light.primary,
    textDecorationLine: "underline",
  },

  summaryRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: palette.light.border,
    paddingTop: 12,
    gap: 4,
  },
  summaryCell: { flex: 1, alignItems: "center" },
  summaryCellNum: { fontSize: 24, fontWeight: "800", color: Colors.light.text },
  summaryCellLbl: { fontSize: 11, color: palette.light.text.muted, marginTop: 2 },

  messageBox: {
    backgroundColor: palette.light.surface,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: palette.light.border,
  },
  messageText: { fontSize: 14, color: Colors.light.text, lineHeight: 20 },
  muted: { fontSize: 14, color: palette.light.text.muted },

  // Table
  tableHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: palette.light.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.light.border,
  },
  tableHeaderNarrow: {},
  thCell: {
    fontSize: 12,
    fontWeight: "700",
    color: palette.light.text.muted,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  thParticipant: { flex: 2, minWidth: 0 },
  thSurvey:      { flex: 1, minWidth: 60 },
  thStatus:      { flex: 1.5, minWidth: 90 },
  thDate:        { flex: 1.5, minWidth: 80 },

  tableRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: Colors.light.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    gap: 4,
  },
  tdCell: {},
  tdMono: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 12,
    color: Colors.light.text,
  },
  tdDate: {
    fontSize: 12,
    color: palette.light.text.muted,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  statusBadgeText: { fontSize: 11, fontWeight: "700" },
  subNote: {
    fontSize: 11,
    color: palette.light.text.muted,
    marginTop: 3,
  },
  subNoteError: { color: "#DC2626" },

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
  pageIndicatorInline: { fontSize: 13, color: palette.light.text.muted },

  errorState: { alignItems: "center", paddingVertical: 48, gap: 12 },
  errorTitle: { fontSize: 18, fontWeight: "700", color: Colors.light.text },
  errorMsg: { fontSize: 14, color: "#DC2626", textAlign: "center" },
  rowGap: { flexDirection: "row", gap: 10 },

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
