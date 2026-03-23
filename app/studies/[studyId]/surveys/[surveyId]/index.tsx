import React, { useEffect, useState } from "react";
import { Colors, palette } from "@/constants/theme";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { surveyGet, surveySend } from "../../../../services/surveys/api";
import type { Survey, SurveySendResponse } from "../../../../services/surveys/types";

declare const __DEV__: boolean;

export default function SurveyManagePage() {
  const { studyId, surveyId } = useLocalSearchParams() as {
    studyId?: string;
    surveyId?: string;
  };
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isNarrow = width < 720;

  // Survey load state
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Bulk send state
  const [includeMessage, setIncludeMessage] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [confirmedBulk, setConfirmedBulk] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<SurveySendResponse | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    if (!surveyId) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await surveyGet(surveyId!, { include_stats: true });
        if (!cancelled) {
          if (studyId && res.survey.posting_id !== Number(studyId)) {
            setLoadError(
              `This survey (ID ${surveyId}) does not belong to study #${studyId}.`
            );
          } else {
            setSurvey(res.survey);
          }
        }
      } catch (e: any) {
        if (!cancelled) setLoadError(e?.message ?? "Failed to load survey");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [surveyId, studyId, retryCount]);

  function formatDate(iso: string) {
    try { return new Date(iso).toLocaleString(); } catch { return iso; }
  }

  const canSend =
    confirmedBulk &&
    (!includeMessage || messageText.trim().length > 0) &&
    !sending;

  async function handleConfirmSend() {
    if (!surveyId) return;
    setSending(true);
    setSendError(null);
    setSendResult(null);
    try {
      const res = await surveySend(surveyId, {
        include_message: includeMessage,
        message_text: includeMessage ? messageText.trim() : undefined,
      });
      setSendResult(res);
      setShowSendModal(false);
      // Reset form after successful send
      setConfirmedBulk(false);
      setIncludeMessage(false);
      setMessageText("");
      // Refresh survey stats
      setRetryCount((c) => c + 1);
    } catch (e: any) {
      setSendError(e?.message ?? "Send failed");
      setShowSendModal(false);
    } finally {
      setSending(false);
    }
  }

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={palette.light.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (loadError) {
    return (
      <SafeAreaView style={styles.root}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.errorState}>
            <Text style={styles.errorTitle}>Unable to load survey</Text>
            <Text style={styles.errorMsg}>{loadError}</Text>
            <View style={styles.rowGap}>
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

  const surveyTitle = survey.title;
  const previewSubject = `${surveyTitle} – Survey Invite`;

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.container}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <View style={styles.pageHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.pageTitle} numberOfLines={2}>
              {surveyTitle}
            </Text>
            <Text style={styles.breadcrumb}>
              Study #{studyId} › Surveys › #{surveyId}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              survey.is_active ? styles.badgeActive : styles.badgeInactive,
            ]}
          >
            <Text
              style={[
                styles.statusBadgeText,
                survey.is_active ? styles.badgeActiveText : styles.badgeInactiveText,
              ]}
            >
              {survey.is_active ? "Active" : "Inactive"}
            </Text>
          </View>
        </View>

        {/* ── Details + Stats row ─────────────────────────────────────────── */}
        <View style={[styles.twoCol, isNarrow ? styles.colStack : styles.colRow]}>
          {/* Survey Details */}
          <View style={[styles.card, isNarrow ? styles.fullWidth : styles.col2]}>
            <Text style={styles.cardLabel}>Survey Details</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>Status</Text>
              <Text style={styles.infoVal}>
                {survey.is_active ? "Active" : "Inactive"}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>Created On</Text>
              <Text style={styles.infoVal}>{formatDate(survey.created_on)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>Modified On</Text>
              <Text style={styles.infoVal}>{formatDate(survey.modified_on)}</Text>
            </View>
            {survey.google_form_responder_url && (
              <View style={styles.urlRow}>
                <Text style={styles.infoKey}>Form URL</Text>
                <Text style={styles.urlVal} numberOfLines={3} selectable>
                  {survey.google_form_responder_url}
                </Text>
              </View>
            )}
          </View>

          {/* Stats */}
          <View style={[styles.card, isNarrow ? styles.fullWidth : styles.col1]}>
            <Text style={styles.cardLabel}>Statistics</Text>
            {survey.stats ? (
              <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                  <Text style={styles.statNum}>{survey.stats.recipients_total}</Text>
                  <Text style={styles.statLbl}>Recipients</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statNum}>{survey.stats.opened_total}</Text>
                  <Text style={styles.statLbl}>Opened</Text>
                </View>
                {survey.stats.recipients_total > 0 && (
                  <View style={styles.statBox}>
                    <Text style={styles.statNum}>
                      {Math.round(
                        (survey.stats.opened_total / survey.stats.recipients_total) * 100
                      )}%
                    </Text>
                    <Text style={styles.statLbl}>Open Rate</Text>
                  </View>
                )}
              </View>
            ) : (
              <Text style={styles.muted}>Stats unavailable</Text>
            )}
          </View>
        </View>

        {/* ── Send to All Enrolled ────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Send to All Enrolled</Text>
          <Text style={styles.sectionNote}>
            Send this survey to every participant currently enrolled in this study.
            Already-sent participants will not receive a duplicate unless you use
            the Dispatch Center with RESEND mode.
          </Text>

          {/* Custom message toggle */}
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setIncludeMessage((v) => !v)}
          >
            <View style={[styles.checkbox, includeMessage && styles.checkboxOn]}>
              {includeMessage && <Text style={styles.checkboxMark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>Include a custom message in the email</Text>
          </TouchableOpacity>

          {includeMessage && (
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Message Text</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                placeholder="e.g. Thank you for participating. Please complete this short survey at your earliest convenience."
                placeholderTextColor={palette.light.text.muted}
                value={messageText}
                onChangeText={setMessageText}
                multiline
                numberOfLines={4}
              />
              <Text style={styles.fieldHint}>
                Keep your message professional and free of personal identifiers.
              </Text>
            </View>
          )}

          {/* Email Preview */}
          <Text style={styles.previewHeading}>Email Preview</Text>
          <View style={styles.emailPreview}>
            <View style={styles.emailPreviewRow}>
              <Text style={styles.emailPreviewField}>Subject</Text>
              <Text style={styles.emailPreviewValue}>{previewSubject}</Text>
            </View>
            <View style={styles.emailPreviewDivider} />
            <Text style={styles.emailPreviewBody}>
              {"Hi [Participant],\n\n[Researcher] has invited you to complete the survey:\n\n"}
              <Text style={{ fontWeight: "700" }}>{`"${surveyTitle}"`}</Text>
              {"\n\nThis survey is part of: Study #" + studyId}
              {includeMessage && messageText.trim()
                ? `\n\n${messageText.trim()}`
                : ""}
              {"\n\nPlease use the link below to begin:\n\n"}
              <Text style={styles.emailLink}>[Your unique survey link]</Text>
              {"\n\nYour participation is appreciated.\n\nThank you,\n[Researcher]"}
            </Text>
            <View style={styles.emailNote}>
              <Text style={styles.emailNoteText}>
                Participant IDs are embedded in the link and will not appear in the email body.
              </Text>
            </View>
          </View>

          {/* Compliance checkbox */}
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setConfirmedBulk((v) => !v)}
          >
            <View style={[styles.checkbox, confirmedBulk && styles.checkboxOn]}>
              {confirmedBulk && <Text style={styles.checkboxMark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>
              I confirm this email is appropriate and contains{" "}
              <Text style={{ fontWeight: "700" }}>no sensitive or internal identifiers</Text>.
            </Text>
          </TouchableOpacity>

          {/* Send error */}
          {sendError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{sendError}</Text>
            </View>
          )}

          {/* Send result */}
          {sendResult && (
            <View style={styles.resultCard}>
              <Text style={styles.resultTitle}>
                {sendResult.ok ? "Send Complete" : "Send Finished with Errors"}
              </Text>
              <View style={styles.resultGrid}>
                {[
                  ["Found", sendResult.results.participants_found],
                  ["Created", sendResult.results.recipients_created],
                  ["Existing", sendResult.results.recipients_existing],
                  ["Attempted", sendResult.results.emails_attempted],
                  ["Sent", sendResult.results.emails_succeeded],
                  ["Failed", sendResult.results.emails_failed],
                ].map(([label, val]) => (
                  <View key={label as string} style={styles.resultStat}>
                    <Text style={styles.resultStatNum}>{val}</Text>
                    <Text style={styles.resultStatLbl}>{label}</Text>
                  </View>
                ))}
              </View>
              {sendResult.errors.length > 0 && (
                <View style={styles.resultErrors}>
                  <Text style={styles.resultErrorsTitle}>
                    {sendResult.errors.length} error(s):
                  </Text>
                  {sendResult.errors.map((e, i) => (
                    <Text key={i} style={styles.resultErrorItem}>
                      [{e.code}] {e.message}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Send button */}
          <TouchableOpacity
            style={[styles.btnPrimary, !canSend && styles.btnDisabled]}
            onPress={() => setShowSendModal(true)}
            disabled={!canSend}
          >
            {sending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.btnPrimaryText}>Send to All Enrolled</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Primary Actions ─────────────────────────────────────────────── */}
        <View
          style={[
            styles.actionButtons,
            isNarrow ? styles.colStack : styles.actionButtonsRow,
          ]}
        >
          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={() =>
              router.push(`/studies/${studyId}/surveys/${surveyId}/recipients`)
            }
          >
            <Text style={styles.btnPrimaryText}>View Recipients</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btnSecondary}
            onPress={() => router.push(`/studies/${studyId}/surveys/dispatch`)}
          >
            <Text style={styles.btnSecondaryText}>Dispatch Center</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btnSecondary}
            onPress={() => router.push(`/studies/${studyId}/message-history`)}
          >
            <Text style={styles.btnSecondaryText}>Message History</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btnGhost}
            onPress={() => router.push(`/studies/${studyId}/surveys`)}
          >
            <Text style={styles.btnGhostText}>← Back to Surveys</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── Confirmation Modal ───────────────────────────────────────────── */}
      <Modal
        visible={showSendModal}
        transparent
        animationType="fade"
        onRequestClose={() => !sending && setShowSendModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Confirm Send to All</Text>
            <Text style={styles.modalBody}>
              You are about to send this survey to all enrolled participants.
            </Text>
            <View style={styles.modalDetail}>
              <Text style={styles.modalDetailKey}>Survey</Text>
              <Text style={styles.modalDetailVal}>{surveyTitle}</Text>
            </View>
            <View style={styles.modalDetail}>
              <Text style={styles.modalDetailKey}>Study</Text>
              <Text style={styles.modalDetailVal}>#{studyId}</Text>
            </View>
            <View style={styles.modalDetail}>
              <Text style={styles.modalDetailKey}>Custom Message</Text>
              <Text style={styles.modalDetailVal}>
                {includeMessage ? "Yes" : "No"}
              </Text>
            </View>
            <Text style={styles.modalNote}>
              Participants who have already received this survey will be skipped.
              Use Dispatch Center to resend.
            </Text>
            <View style={styles.rowGap}>
              <TouchableOpacity
                style={styles.btnPrimary}
                onPress={handleConfirmSend}
                disabled={sending}
              >
                {sending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.btnPrimaryText}>Yes, Send</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnGhost}
                onPress={() => setShowSendModal(false)}
                disabled={sending}
              >
                <Text style={styles.btnGhostText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },

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

  twoCol: { gap: 16, width: "100%" },
  colRow: { flexDirection: "row", alignItems: "flex-start" },
  colStack: { flexDirection: "column" },
  col2: { flex: 2, marginRight: 8, minWidth: 0 },
  col1: { flex: 1, marginLeft: 8, minWidth: 200 },
  fullWidth: { width: "100%" },

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
  sectionTitle: { fontSize: 18, fontWeight: "700", color: Colors.light.text },
  sectionNote: {
    fontSize: 13,
    color: palette.light.text.muted,
    lineHeight: 18,
    marginTop: -4,
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
  infoKey: { fontSize: 13, color: palette.light.text.muted, flex: 1 },
  infoVal: {
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
  urlVal: {
    fontSize: 12,
    color: palette.light.text.muted,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },

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
  statNum: { fontSize: 28, fontWeight: "800", color: palette.light.primary },
  statLbl: { fontSize: 12, color: palette.light.text.muted, marginTop: 4, textAlign: "center" },

  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    alignSelf: "flex-start",
    marginTop: 2,
  },
  badgeActive: { backgroundColor: "#DCFCE7" },
  badgeActiveText: { color: "#166534" },
  badgeInactive: { backgroundColor: palette.light.muted },
  badgeInactiveText: { color: palette.light.text.secondary },
  statusBadgeText: { fontSize: 13, fontWeight: "700" },

  checkboxRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    backgroundColor: palette.light.surface,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.light.border,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: palette.light.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  checkboxOn: {
    backgroundColor: palette.light.primary,
    borderColor: palette.light.primary,
  },
  checkboxMark: { color: "#fff", fontSize: 13, fontWeight: "700" },
  checkboxLabel: { flex: 1, fontSize: 14, color: Colors.light.text, lineHeight: 20 },

  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 14, fontWeight: "600", color: Colors.light.text },
  fieldHint: { fontSize: 12, color: palette.light.text.muted },
  input: {
    borderWidth: 1,
    borderColor: palette.light.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.light.text,
    backgroundColor: Colors.light.background,
  },
  inputMultiline: { minHeight: 90, textAlignVertical: "top" },

  previewHeading: { fontSize: 15, fontWeight: "700", color: Colors.light.text },
  emailPreview: {
    borderWidth: 1,
    borderColor: palette.light.border,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: palette.light.surface,
  },
  emailPreviewRow: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    backgroundColor: Colors.light.background,
    alignItems: "flex-start",
  },
  emailPreviewField: {
    fontSize: 12,
    fontWeight: "700",
    color: palette.light.text.muted,
    width: 54,
    paddingTop: 1,
  },
  emailPreviewValue: { flex: 1, fontSize: 13, color: Colors.light.text, fontWeight: "600" },
  emailPreviewDivider: { height: 1, backgroundColor: palette.light.border },
  emailPreviewBody: { padding: 14, fontSize: 13, color: Colors.light.text, lineHeight: 20 },
  emailLink: {
    color: palette.light.primary,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  emailNote: {
    backgroundColor: "#FEF9C3",
    borderTopWidth: 1,
    borderTopColor: "#FDE68A",
    padding: 10,
  },
  emailNoteText: { fontSize: 12, color: "#92400E", lineHeight: 16 },

  errorBanner: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 8,
    padding: 12,
  },
  errorBannerText: { color: "#DC2626", fontSize: 14 },

  resultCard: {
    borderWidth: 1,
    borderColor: "#BBF7D0",
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  resultTitle: { fontSize: 15, fontWeight: "700", color: "#166534" },
  resultGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  resultStat: {
    minWidth: 70,
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  resultStatNum: { fontSize: 22, fontWeight: "800", color: "#166534" },
  resultStatLbl: { fontSize: 11, color: "#166534", marginTop: 2 },
  resultErrors: { gap: 4 },
  resultErrorsTitle: { fontSize: 13, fontWeight: "700", color: "#DC2626" },
  resultErrorItem: { fontSize: 13, color: "#DC2626" },

  actionButtons: { gap: 10 },
  actionButtonsRow: { flexDirection: "row", flexWrap: "wrap" },

  rowGap: { flexDirection: "row", gap: 10 },

  btnPrimary: {
    backgroundColor: palette.light.primary,
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
  },
  btnPrimaryText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  btnDisabled: { opacity: 0.45 },
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

  errorState: { alignItems: "center", paddingVertical: 48, gap: 12 },
  errorTitle: { fontSize: 18, fontWeight: "700", color: Colors.light.text },
  errorMsg: { fontSize: 14, color: "#DC2626", textAlign: "center" },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: Colors.light.background,
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 480,
    gap: 14,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
      },
      android: { elevation: 8 },
      default: { boxShadow: "0 8px 32px rgba(0,0,0,0.18)" } as any,
    }),
  },
  modalTitle: { fontSize: 20, fontWeight: "800", color: Colors.light.text },
  modalBody: { fontSize: 14, color: palette.light.text.secondary },
  modalDetail: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: palette.light.surface,
    padding: 12,
    borderRadius: 8,
  },
  modalDetailKey: {
    fontSize: 13,
    fontWeight: "700",
    color: palette.light.text.muted,
    width: 80,
  },
  modalDetailVal: { flex: 1, fontSize: 13, color: Colors.light.text },
  modalNote: { fontSize: 13, color: palette.light.text.muted, lineHeight: 18 },
});
