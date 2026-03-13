import React, { useEffect, useRef, useState } from "react";
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
  Modal,
  TextInput,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { surveyGet, surveySend, surveyEmailPreview } from "../../../../services/surveys/api";
import type { Survey, SurveySendResponse, EmailPreviewResponse } from "../../../../services/surveys/types";

declare const __DEV__: boolean;

export default function SurveyManagePage() {
  const { studyId, surveyId } = useLocalSearchParams() as {
    studyId?: string;
    surveyId?: string;
  };
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isNarrow = width < 720;

  // Survey data
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Send-to-all section
  const [includeMessage, setIncludeMessage] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [complianceConfirmed, setComplianceConfirmed] = useState(false);

  // Email preview
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [emailPreview, setEmailPreview] = useState<EmailPreviewResponse | null>(null);

  // Send modal + results
  const [sendModalVisible, setSendModalVisible] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendResult, setSendResult] = useState<SurveySendResponse | null>(null);
  const sendingRef = useRef(false);

  // Load survey
  useEffect(() => {
    if (!surveyId) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await surveyGet(surveyId!, { include_stats: true });
        if (!cancelled) setSurvey(res.survey);
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
  }, [surveyId, retryCount]);

  function formatDate(iso: string | null | undefined): string {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return iso;
    }
  }

  async function handleEmailPreview() {
    if (!survey) return;
    setPreviewLoading(true);
    setPreviewError(null);
    setEmailPreview(null);
    try {
      const res = await surveyEmailPreview({
        survey_title: survey.title,
        include_link: true,
        include_message: includeMessage,
        message_text: includeMessage ? messageText : undefined,
      });
      setEmailPreview(res);
    } catch (e: any) {
      setPreviewError(e?.message ?? "Failed to load email preview");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleSendConfirm() {
    if (!surveyId) return;
    if (sendingRef.current) return;
    sendingRef.current = true;
    setSendLoading(true);
    setSendError(null);
    try {
      const res = await surveySend(surveyId, {
        include_message: includeMessage,
        message_text: includeMessage ? messageText : undefined,
      });
      setSendResult(res);
      setSendModalVisible(false);
      setComplianceConfirmed(false);
    } catch (e: any) {
      setSendError(e?.message ?? "Send failed");
    } finally {
      setSendLoading(false);
      sendingRef.current = false;
    }
  }

  // ── Loading state ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" color={palette.light.primary} />
          <Text style={styles.loadingText}>Loading survey...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────────
  if (error && !survey) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.centerFill}>
          <Text style={styles.errorHeading}>Failed to load survey</Text>
          <Text style={styles.errorBody}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => setRetryCount((c) => c + 1)}
          >
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backLinkBtn}
            onPress={() => router.push(`/studies/${studyId}/surveys`)}
          >
            <Text style={styles.backLinkText}>Back to Surveys</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Main render ──────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Page Header */}
        <View style={styles.pageHeader}>
          <View style={styles.pageHeaderLeft}>
            <Text style={styles.pageTitle}>Survey Detail</Text>
            <Text style={styles.breadcrumb}>
              Study #{studyId} › Surveys › #{surveyId}
            </Text>
          </View>
          {survey && (
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
          )}
        </View>

        {/* Non-blocking error banner */}
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{error}</Text>
            <TouchableOpacity onPress={() => setRetryCount((c) => c + 1)}>
              <Text style={styles.errorBannerRetry}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {survey && (
          <>
            {/* ── Details Card ─────────────────────────────────────────────── */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Survey Details</Text>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Title</Text>
                <Text style={styles.detailValue}>{survey.title}</Text>
              </View>

              <View style={styles.detailDivider} />

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Survey ID</Text>
                <Text style={styles.detailValue}>{survey.survey_id}</Text>
              </View>

              <View style={styles.detailDivider} />

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Posting ID</Text>
                <Text style={styles.detailValue}>{survey.posting_id}</Text>
              </View>

              <View style={styles.detailDivider} />

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Form URL</Text>
                {survey.form_responder_url ? (
                  <Text
                    style={[styles.detailValue, styles.urlText]}
                    numberOfLines={2}
                  >
                    {survey.form_responder_url}
                  </Text>
                ) : (
                  <Text style={[styles.detailValue, styles.mutedText]}>
                    Not set
                  </Text>
                )}
              </View>

              <View style={styles.detailDivider} />

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Participant Param Key</Text>
                {survey.participant_param_key ? (
                  <Text style={[styles.detailValue, styles.monoText]}>
                    {survey.participant_param_key}
                  </Text>
                ) : (
                  <Text style={[styles.detailValue, styles.mutedText]}>
                    Not set
                  </Text>
                )}
              </View>

              <View style={styles.detailDivider} />

              <View style={[styles.detailRow, styles.detailRowWrap]}>
                <View style={styles.detailRowHalf}>
                  <Text style={styles.detailLabel}>Created</Text>
                  <Text style={styles.detailValue}>
                    {formatDate(survey.created_on)}
                  </Text>
                </View>
                <View style={styles.detailRowHalf}>
                  <Text style={styles.detailLabel}>Last Modified</Text>
                  <Text style={styles.detailValue}>
                    {formatDate(survey.modified_on)}
                  </Text>
                </View>
              </View>
            </View>

            {/* ── Stats Card ───────────────────────────────────────────────── */}
            {survey.stats && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Statistics</Text>
                <View
                  style={[
                    styles.statsRow,
                    isNarrow && styles.statsRowNarrow,
                  ]}
                >
                  <View style={styles.statBox}>
                    <Text style={styles.statNumber}>
                      {survey.stats.recipients_total}
                    </Text>
                    <Text style={styles.statLabel}>Total Recipients</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statBox}>
                    <Text style={styles.statNumber}>
                      {survey.stats.opened_total}
                    </Text>
                    <Text style={styles.statLabel}>Total Opened</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statBox}>
                    <Text style={styles.statNumber}>
                      {survey.stats.recipients_total > 0
                        ? Math.round(
                            (survey.stats.opened_total /
                              survey.stats.recipients_total) *
                              100
                          )
                        : 0}
                      %
                    </Text>
                    <Text style={styles.statLabel}>Open Rate</Text>
                  </View>
                </View>
              </View>
            )}

            {/* ── Send to All Enrolled ─────────────────────────────────────── */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Send to All Enrolled</Text>
              <Text style={styles.cardSubtitle}>
                Send this survey to all currently enrolled participants who have
                not yet received it.
              </Text>

              {/* Include Message toggle */}
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => {
                  setIncludeMessage((v) => !v);
                  setEmailPreview(null);
                  setPreviewError(null);
                }}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.checkbox,
                    includeMessage && styles.checkboxChecked,
                  ]}
                >
                  {includeMessage && (
                    <Text style={styles.checkboxTick}>✓</Text>
                  )}
                </View>
                <Text style={styles.checkboxLabel}>
                  Include a custom message in the email
                </Text>
              </TouchableOpacity>

              {/* Message text area */}
              {includeMessage && (
                <View style={styles.messageInputWrap}>
                  <Text style={styles.fieldLabel}>Message</Text>
                  <TextInput
                    style={styles.messageInput}
                    value={messageText}
                    onChangeText={(t) => {
                      setMessageText(t);
                      setEmailPreview(null);
                      setPreviewError(null);
                    }}
                    placeholder="Enter an optional message to include in the email..."
                    placeholderTextColor={palette.light.text.muted}
                    multiline
                    textAlignVertical="top"
                    maxLength={5000}
                  />
                </View>
              )}

              {/* Email Preview */}
              <View style={styles.previewSection}>
                <View style={styles.previewHeader}>
                  <Text style={styles.previewHeading}>Email Preview</Text>
                  <TouchableOpacity
                    style={styles.previewBtn}
                    onPress={handleEmailPreview}
                    disabled={previewLoading}
                  >
                    {previewLoading ? (
                      <ActivityIndicator
                        size="small"
                        color={palette.light.primary}
                      />
                    ) : (
                      <Text style={styles.previewBtnText}>
                        {emailPreview ? "Refresh Preview" : "Load Preview"}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>

                {previewError && (
                  <View style={styles.inlineError}>
                    <Text style={styles.inlineErrorText}>{previewError}</Text>
                  </View>
                )}

                {emailPreview && (
                  <View style={styles.previewBox}>
                    <View style={styles.previewSubjectRow}>
                      <Text style={styles.previewSubjectLabel}>Subject: </Text>
                      <Text style={styles.previewSubjectValue}>
                        {emailPreview.rendered_subject}
                      </Text>
                    </View>
                    <View style={styles.previewBodyDivider} />
                    <Text style={styles.previewBodyLabel}>Body</Text>
                    <Text style={styles.previewBodyText}>
                      {emailPreview.rendered_body}
                    </Text>
                  </View>
                )}
              </View>

              {/* Send result */}
              {sendResult && (() => {
                const hasFailures = sendResult.pairs_failed > 0 && sendResult.pairs_sent === 0;
                return (
                <View style={[styles.sendResultBox, hasFailures && { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                  <Text style={[styles.sendResultTitle, hasFailures && { color: '#DC2626' }]}>Last Send Result</Text>
                  <View style={styles.sendResultRow}>
                    <View style={styles.sendResultStat}>
                      <Text style={styles.sendResultNumber}>
                        {sendResult.pairs_sent}
                      </Text>
                      <Text style={styles.sendResultLabel}>Sent</Text>
                    </View>
                    <View style={styles.sendResultStat}>
                      <Text
                        style={[
                          styles.sendResultNumber,
                          sendResult.pairs_failed > 0 &&
                            styles.sendResultFailed,
                        ]}
                      >
                        {sendResult.pairs_failed}
                      </Text>
                      <Text style={styles.sendResultLabel}>Failed</Text>
                    </View>
                    <View style={styles.sendResultStat}>
                      <Text style={styles.sendResultNumber}>
                        {sendResult.pairs_skipped}
                      </Text>
                      <Text style={styles.sendResultLabel}>Skipped</Text>
                    </View>
                  </View>
                  {sendResult.errors && sendResult.errors.length > 0 && (
                    <View style={styles.sendResultErrors}>
                      <Text style={styles.sendResultErrorsTitle}>Errors</Text>
                      {sendResult.errors.map((err, i) => (
                        <Text key={i} style={styles.sendResultErrorItem}>
                          [{err.code}] {err.message}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
                );
              })()}

              {/* Compliance confirmation */}
              <TouchableOpacity
                style={[styles.checkboxRow, styles.complianceRow]}
                onPress={() => setComplianceConfirmed((v) => !v)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.checkbox,
                    complianceConfirmed && styles.checkboxChecked,
                  ]}
                >
                  {complianceConfirmed && (
                    <Text style={styles.checkboxTick}>✓</Text>
                  )}
                </View>
                <Text style={styles.complianceLabel}>
                  I confirm I want to send surveys to all enrolled participants
                </Text>
              </TouchableOpacity>

              {/* Send to All button */}
              <TouchableOpacity
                style={[
                  styles.sendAllBtn,
                  !complianceConfirmed && styles.sendAllBtnDisabled,
                ]}
                disabled={!complianceConfirmed}
                onPress={() => {
                  setSendError(null);
                  setSendModalVisible(true);
                }}
              >
                <Text style={styles.sendAllBtnText}>Send to All</Text>
              </TouchableOpacity>
            </View>

            {/* ── Action Buttons ───────────────────────────────────────────── */}
            <View
              style={[
                styles.actionsRow,
                isNarrow && styles.actionsRowNarrow,
              ]}
            >
              <TouchableOpacity
                style={styles.btnSecondary}
                onPress={() =>
                  router.push(
                    `/studies/${studyId}/surveys/${surveyId}/recipients`
                  )
                }
              >
                <Text style={styles.btnSecondaryText}>View Recipients</Text>
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
                style={styles.btnSecondary}
                onPress={() =>
                  router.push(
                    `/studies/${studyId}/message-history`
                  )
                }
              >
                <Text style={styles.btnSecondaryText}>Message History</Text>
              </TouchableOpacity>
            </View>

            {/* Back link */}
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.push(`/studies/${studyId}/surveys`)}
            >
              <Text style={styles.backBtnText}>Back to Surveys</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* ── Send Confirmation Modal ──────────────────────────────────────────── */}
      <Modal
        visible={sendModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSendModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Confirm Send</Text>
            <Text style={styles.modalBody}>
              This will send the survey email to all enrolled participants who
              have not yet received it. This action cannot be undone.
            </Text>

            {includeMessage && messageText.trim().length > 0 && (
              <View style={styles.modalMessagePreview}>
                <Text style={styles.modalMessageLabel}>Custom message:</Text>
                <Text style={styles.modalMessageText}>{messageText}</Text>
              </View>
            )}

            {sendError && (
              <View style={styles.inlineError}>
                <Text style={styles.inlineErrorText}>{sendError}</Text>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setSendModalVisible(false);
                  setSendError(null);
                }}
                disabled={sendLoading}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalConfirmBtn,
                  sendLoading && styles.modalConfirmBtnDisabled,
                ]}
                onPress={handleSendConfirm}
                disabled={sendLoading}
              >
                {sendLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalConfirmBtnText}>
                    Yes, Send to All
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  container: {
    padding: 20,
    paddingTop: Platform.OS === "web" ? 80 : 20,
    paddingBottom: 56,
    backgroundColor: palette.light.surface,
    gap: 16,
  },

  // ── Center fill (loading / error full-screen) ──────────────────────────────
  centerFill: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    gap: 12,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: palette.light.text.muted,
  },
  errorHeading: {
    fontSize: 18,
    fontWeight: "700",
    color: palette.light.danger,
    textAlign: "center",
  },
  errorBody: {
    fontSize: 14,
    color: palette.light.text.secondary,
    textAlign: "center",
  },
  retryBtn: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: palette.light.primary,
  },
  retryBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  backLinkBtn: {
    paddingVertical: 8,
  },
  backLinkText: {
    fontSize: 14,
    color: palette.light.text.muted,
    fontWeight: "600",
  },

  // ── Page header ────────────────────────────────────────────────────────────
  pageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: 12,
  },
  pageHeaderLeft: {
    flex: 1,
    minWidth: 0,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: Colors.light.text,
  },
  breadcrumb: {
    fontSize: 13,
    color: palette.light.text.muted,
    marginTop: 4,
  },

  // ── Non-blocking error banner ──────────────────────────────────────────────
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
  errorBannerText: {
    color: "#DC2626",
    flex: 1,
    fontSize: 14,
  },
  errorBannerRetry: {
    color: palette.light.primary,
    fontWeight: "600",
    marginLeft: 12,
    fontSize: 14,
  },

  // ── Status badge ───────────────────────────────────────────────────────────
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  statusBadgeActive: { backgroundColor: "#DCFCE7" },
  statusBadgeInactive: { backgroundColor: palette.light.muted },
  statusBadgeText: { fontSize: 13, fontWeight: "700" },
  statusBadgeActiveText: { color: "#166534" },
  statusBadgeInactiveText: { color: palette.light.text.secondary },

  // ── Card ───────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: Colors.light.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.light.border,
    padding: 20,
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
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.light.text,
    marginBottom: 16,
  },
  cardSubtitle: {
    fontSize: 14,
    color: palette.light.text.secondary,
    marginTop: -8,
    marginBottom: 16,
    lineHeight: 20,
  },

  // ── Detail rows ────────────────────────────────────────────────────────────
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 8,
    gap: 12,
  },
  detailRowWrap: {
    flexWrap: "wrap",
  },
  detailRowHalf: {
    flex: 1,
    minWidth: 120,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: palette.light.text.muted,
    minWidth: 140,
  },
  detailValue: {
    fontSize: 14,
    color: Colors.light.text,
    flex: 1,
    textAlign: "right",
  },
  detailDivider: {
    height: 1,
    backgroundColor: palette.light.border,
  },
  urlText: {
    color: palette.light.primary,
    fontSize: 13,
  },
  mutedText: {
    color: palette.light.text.muted,
    fontStyle: "italic",
  },
  monoText: {
    fontFamily: Platform.select({
      ios: "Menlo",
      android: "monospace",
      default: "monospace",
    }),
    fontSize: 13,
    color: Colors.light.text,
  },

  // ── Stats ──────────────────────────────────────────────────────────────────
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  statsRowNarrow: {
    flexDirection: "column",
    gap: 12,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
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
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 48,
    backgroundColor: palette.light.border,
  },

  // ── Send-to-all section ────────────────────────────────────────────────────
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: palette.light.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.background,
  },
  checkboxChecked: {
    backgroundColor: palette.light.primary,
    borderColor: palette.light.primary,
  },
  checkboxTick: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 15,
  },
  checkboxLabel: {
    fontSize: 14,
    color: Colors.light.text,
    flex: 1,
  },

  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: palette.light.text.secondary,
    marginBottom: 6,
  },
  messageInputWrap: {
    marginTop: 12,
  },
  messageInput: {
    borderWidth: 1,
    borderColor: palette.light.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: Colors.light.text,
    backgroundColor: palette.light.surface,
    minHeight: 110,
    textAlignVertical: "top",
  },

  // ── Email preview ──────────────────────────────────────────────────────────
  previewSection: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: palette.light.border,
    paddingTop: 16,
  },
  previewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  previewHeading: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.light.text,
  },
  previewBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.light.primary,
    minWidth: 100,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 34,
  },
  previewBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: palette.light.primary,
  },
  previewBox: {
    backgroundColor: palette.light.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.light.border,
    padding: 14,
    gap: 8,
  },
  previewSubjectRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  previewSubjectLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: palette.light.text.secondary,
  },
  previewSubjectValue: {
    fontSize: 13,
    color: Colors.light.text,
    flex: 1,
  },
  previewBodyDivider: {
    height: 1,
    backgroundColor: palette.light.border,
  },
  previewBodyLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: palette.light.text.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  previewBodyText: {
    fontSize: 13,
    color: Colors.light.text,
    lineHeight: 20,
  },

  // ── Send result ────────────────────────────────────────────────────────────
  sendResultBox: {
    marginTop: 16,
    backgroundColor: "#F0FDF4",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    padding: 14,
    gap: 10,
  },
  sendResultTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#166534",
  },
  sendResultRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  sendResultStat: {
    alignItems: "center",
    flex: 1,
  },
  sendResultNumber: {
    fontSize: 24,
    fontWeight: "800",
    color: "#166534",
  },
  sendResultFailed: {
    color: palette.light.danger,
  },
  sendResultLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#166534",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  sendResultErrors: {
    marginTop: 4,
    padding: 10,
    backgroundColor: "#FEF2F2",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FECACA",
    gap: 4,
  },
  sendResultErrorsTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#DC2626",
    marginBottom: 2,
  },
  sendResultErrorItem: {
    fontSize: 12,
    color: "#DC2626",
  },

  // ── Compliance + Send All button ───────────────────────────────────────────
  complianceRow: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: palette.light.border,
  },
  complianceLabel: {
    fontSize: 14,
    color: Colors.light.text,
    flex: 1,
    fontWeight: "500",
  },
  sendAllBtn: {
    marginTop: 14,
    backgroundColor: palette.light.primary,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: "center",
  },
  sendAllBtnDisabled: {
    opacity: 0.45,
  },
  sendAllBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
    letterSpacing: 0.3,
  },

  // ── Inline error ───────────────────────────────────────────────────────────
  inlineError: {
    backgroundColor: "#FEF2F2",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FECACA",
    padding: 10,
    marginTop: 8,
  },
  inlineErrorText: {
    color: "#DC2626",
    fontSize: 13,
  },

  // ── Action buttons row ─────────────────────────────────────────────────────
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  actionsRowNarrow: {
    flexDirection: "column",
  },
  btnSecondary: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: palette.light.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    flex: 1,
    minWidth: 120,
  },
  btnSecondaryText: {
    color: palette.light.primary,
    fontWeight: "700",
    fontSize: 14,
  },

  // ── Back button ────────────────────────────────────────────────────────────
  backBtn: {
    alignSelf: "flex-start",
    paddingVertical: 8,
  },
  backBtnText: {
    fontSize: 14,
    color: palette.light.text.muted,
    fontWeight: "600",
  },

  // ── Modal ──────────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: palette.light.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalBox: {
    backgroundColor: Colors.light.background,
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 480,
    gap: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 24,
      },
      android: { elevation: 12 },
      default: { boxShadow: "0 8px 32px rgba(0,0,0,0.18)" } as any,
    }),
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.light.text,
  },
  modalBody: {
    fontSize: 14,
    color: palette.light.text.secondary,
    lineHeight: 22,
  },
  modalMessagePreview: {
    backgroundColor: palette.light.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.light.border,
    padding: 12,
    gap: 4,
  },
  modalMessageLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: palette.light.text.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  modalMessageText: {
    fontSize: 14,
    color: Colors.light.text,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-end",
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.light.border,
    alignItems: "center",
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.light.text.secondary,
  },
  modalConfirmBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: palette.light.primary,
    alignItems: "center",
    minWidth: 130,
    justifyContent: "center",
    minHeight: 40,
  },
  modalConfirmBtnDisabled: {
    opacity: 0.6,
  },
  modalConfirmBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
});
