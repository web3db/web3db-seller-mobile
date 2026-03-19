import React, { useEffect, useMemo, useState } from "react";
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
import { useAuth } from "@/hooks/AuthContext";
import {
  surveyListByPosting,
  surveyDispatchView,
  surveyDispatch,
} from "../../../services/surveys/api";
import { getTrnPostingDetail } from "../../../services/postings/api";
import type {
  Survey,
  DispatchViewResponse,
  DispatchParticipant,
  RecipientStatus,
  DispatchMode,
  DispatchResponse,
} from "../../../services/surveys/types";

declare const __DEV__: boolean;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildStatusKey(surveyId: number, participantId: string) {
  return `${surveyId}:${participantId}`;
}

function StatusChip({
  status,
}: {
  status: RecipientStatus["status"] | undefined;
}) {
  if (!status || status === "NOT_SENT") {
    return (
      <View style={[dStyles.statusChip, dStyles.chipNotSent]}>
        <Text style={[dStyles.chipText, dStyles.chipNotSentText]}>—</Text>
      </View>
    );
  }
  if (status === "SENT") {
    return (
      <View style={[dStyles.statusChip, dStyles.chipSent]}>
        <Text style={[dStyles.chipText, dStyles.chipSentText]}>Sent</Text>
      </View>
    );
  }
  return (
    <View style={[dStyles.statusChip, dStyles.chipOpened]}>
      <Text style={[dStyles.chipText, dStyles.chipOpenedText]}>Opened</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Dispatch Center Page
// ---------------------------------------------------------------------------

export default function DispatchCenterPage() {
  const { studyId } = useLocalSearchParams() as { studyId?: string };
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isNarrow = width < 720;
  const { user } = useAuth();

  // ── Study name (for email preview) ─────────────────────────────
  const [studyName, setStudyName] = useState<string>("");
  useEffect(() => {
    if (!studyId || !user?.id) return;
    getTrnPostingDetail(user.id, studyId)
      .then((d) => { if (d?.title) setStudyName(d.title); })
      .catch(() => {});
  }, [studyId, user?.id]);

  // ── Surveys ────────────────────────────────────────────────────
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [surveysLoading, setSurveysLoading] = useState(false);
  const [surveysError, setSurveysError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // ── Dispatch view (participants + status) ───────────────────────
  const [viewData, setViewData] = useState<DispatchViewResponse | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState<string | null>(null);
  const [partPage, setPartPage] = useState(1);
  const partPageSize = 50;

  // ── Selection state ────────────────────────────────────────────
  const [selectedSurveyIds, setSelectedSurveyIds] = useState<Set<number>>(
    new Set()
  );
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<
    Set<string>
  >(new Set());

  // ── Mode ──────────────────────────────────────────────────────
  const [mode, setMode] = useState<DispatchMode>("SEND_MISSING");

  // ── Search ────────────────────────────────────────────────────
  const [participantSearch, setParticipantSearch] = useState("");

  // ── Email options ─────────────────────────────────────────────
  const [includeLink, setIncludeLink] = useState(true);
  const [includeMessage, setIncludeMessage] = useState(false);
  const [messageText, setMessageText] = useState("");

  // ── Dispatch state ────────────────────────────────────────────
  const [showConfirm, setShowConfirm] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [dispatchResult, setDispatchResult] = useState<DispatchResponse | null>(
    null
  );
  const [dispatchError, setDispatchError] = useState<string | null>(null);

  // ── Load surveys ───────────────────────────────────────────────
  useEffect(() => {
    if (!studyId) return;
    let cancelled = false;
    async function load() {
      setSurveysLoading(true);
      setSurveysError(null);
      try {
        const res = await surveyListByPosting(studyId!, {
          include_stats: true,
          page_size: 100,
        });
        if (!cancelled) setSurveys(res.surveys);
      } catch (e: any) {
        if (!cancelled)
          setSurveysError(e?.message ?? "Failed to load surveys");
      } finally {
        if (!cancelled) setSurveysLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [studyId, retryCount]);

  // ── Load dispatch view (participants + status) ─────────────────
  useEffect(() => {
    if (!studyId) return;
    let cancelled = false;
    async function load() {
      setViewLoading(true);
      setViewError(null);
      try {
        const res = await surveyDispatchView(studyId!, {
          page: partPage,
          page_size: partPageSize,
        });
        if (!cancelled) setViewData(res);
      } catch (e: any) {
        if (!cancelled)
          setViewError(e?.message ?? "Failed to load participants");
      } finally {
        if (!cancelled) setViewLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [studyId, partPage, retryCount]);

  // ── Derived: participants from dispatch view ───────────────────
  const participants: DispatchParticipant[] = viewData?.participants?.items ?? [];
  const partTotal = viewData?.participants?.total ?? 0;
  const partTotalPages = Math.max(1, Math.ceil(partTotal / partPageSize));

  const filteredParticipants = participantSearch.trim()
    ? participants.filter((p) =>
        p.participant_id.toLowerCase().includes(participantSearch.toLowerCase())
      )
    : participants;

  // ── Derived: user_id ↔ participant_id lookup ──────────────────
  const userIdToParticipantId = useMemo(() => {
    const map = new Map<number, string>();
    for (const p of participants) {
      if (p.user_id != null) map.set(p.user_id, p.participant_id);
    }
    return map;
  }, [participants]);

  const participantIdToUserId = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of participants) {
      if (p.user_id != null) map.set(p.participant_id, p.user_id);
    }
    return map;
  }, [participants]);

  // ── Derived: status map ────────────────────────────────────────
  const statusMap = useMemo(() => {
    const map = new Map<string, RecipientStatus["status"]>();
    for (const rs of viewData?.recipient_status ?? []) {
      const pid =
        rs.participant_id ??
        (rs.user_id != null ? userIdToParticipantId.get(rs.user_id) : undefined);
      if (pid) map.set(buildStatusKey(rs.survey_id, pid), rs.status);
    }
    return map;
  }, [viewData, userIdToParticipantId]);

  // ── Selection helpers ──────────────────────────────────────────
  function toggleSurvey(id: number) {
    setSelectedSurveyIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleParticipant(id: string) {
    setSelectedParticipantIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllSurveys() {
    setSelectedSurveyIds(new Set(surveys.map((s) => s.survey_id)));
  }

  function clearSurveys() {
    setSelectedSurveyIds(new Set());
  }

  function selectAllParticipantsOnPage() {
    setSelectedParticipantIds((prev) => {
      const next = new Set(prev);
      for (const p of filteredParticipants) next.add(p.participant_id);
      return next;
    });
  }

  function clearParticipants() {
    setSelectedParticipantIds(new Set());
  }

  // ── Validation ────────────────────────────────────────────────
  const pairCount = selectedSurveyIds.size * selectedParticipantIds.size;
  const PAIR_CAP = 10_000;
  const overCap = pairCount > PAIR_CAP;
  const messageValid = !includeMessage || messageText.trim().length > 0;
  const canDispatch =
    selectedSurveyIds.size > 0 &&
    selectedParticipantIds.size > 0 &&
    !overCap &&
    messageValid &&
    !dispatching;

  // ── Dispatch ─────────────────────────────────────────────────
  async function handleConfirmDispatch() {
    setDispatching(true);
    setDispatchError(null);
    try {
      const userIds = [...selectedParticipantIds]
        .map((pid) => participantIdToUserId.get(pid))
        .filter((uid): uid is number => uid != null);
      const res = await surveyDispatch({
        posting_id: Number(studyId),
        survey_ids: [...selectedSurveyIds],
        user_ids: userIds,
        mode,
        dry_run: false,
        include_link: includeLink,
        include_message: includeMessage,
        ...(includeMessage && messageText.trim()
          ? { message_text: messageText.trim() }
          : {}),
      });
      setDispatchResult(res);
      setShowConfirm(false);
      // Refresh
      setRetryCount((c) => c + 1);
    } catch (e: any) {
      setDispatchError(e?.message ?? "Dispatch failed");
      setShowConfirm(false);
    } finally {
      setDispatching(false);
    }
  }

  const modeLabels: Record<DispatchMode, string> = {
    SEND_MISSING: "Send Missing",
    RESEND_EXISTING: "Resend Existing",
    SEND_AND_RESEND: "Send & Resend All",
  };

  const modeDescriptions: Record<DispatchMode, string> = {
    SEND_MISSING: "Only send to participants who have not received this survey yet.",
    RESEND_EXISTING: "Resend to participants who already received it.",
    SEND_AND_RESEND: "Send to all selected participants regardless of prior status.",
  };

  const dataLoaded = !surveysLoading && !surveysError && !viewLoading;

  return (
    <SafeAreaView style={dStyles.root}>
      <ScrollView contentContainerStyle={dStyles.container}>
        {/* ── Header ── */}
        <View style={dStyles.pageHeader}>
          <View style={{ flex: 1 }}>
            <Text style={dStyles.pageTitle}>Survey Dispatch Center</Text>
            <Text style={dStyles.breadcrumb}>
              Study #{studyId} › Surveys › Dispatch
            </Text>
          </View>
          <View style={[dStyles.headerActions, isNarrow && { width: "100%" }]}>
            <TouchableOpacity
              style={dStyles.btnSecondary}
              onPress={() => router.push(`/studies/${studyId}/surveys/create`)}
            >
              <Text style={dStyles.btnSecondaryText}>+ Create Survey</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={dStyles.btnGhost}
              onPress={() => router.push(`/studies/${studyId}/message-history` as any)}
            >
              <Text style={dStyles.btnGhostText}>Message History</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={dStyles.btnGhost}
              onPress={() => router.push(`/studies/${studyId}/surveys`)}
            >
              <Text style={dStyles.btnGhostText}>← Back to Surveys</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Errors ── */}
        {(surveysError || viewError) && (
          <View style={dStyles.errorBanner}>
            <Text style={dStyles.errorText}>{surveysError ?? viewError}</Text>
            <TouchableOpacity onPress={() => setRetryCount((c) => c + 1)}>
              <Text style={dStyles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Loading ── */}
        {(surveysLoading || viewLoading) && (
          <ActivityIndicator
            size="large"
            color={palette.light.primary}
            style={{ marginVertical: 40 }}
          />
        )}

        {/* ── Dispatch Result ── */}
        {dispatchResult && (
          <View style={dStyles.resultCard}>
            <Text style={dStyles.resultTitle}>Dispatch Complete</Text>
            <View style={dStyles.resultGrid}>
              {[
                ["Surveys", dispatchResult.results.surveys_requested],
                ["Participants", dispatchResult.results.users_requested],
                ["Pairs", dispatchResult.results.pairs_requested],
                ["Created", dispatchResult.results.recipients_created],
                ["Existing", dispatchResult.results.recipients_existing],
                ["Emails Sent", dispatchResult.results.emails_succeeded],
                ["Emails Failed", dispatchResult.results.emails_failed],
              ].map(([label, val]) => (
                <View key={String(label)} style={dStyles.resultItem}>
                  <Text style={dStyles.resultItemValue}>{val}</Text>
                  <Text style={dStyles.resultItemLabel}>{label}</Text>
                </View>
              ))}
            </View>
            {dispatchResult.errors.length > 0 && (
              <View style={dStyles.resultErrors}>
                <Text style={dStyles.resultErrorsTitle}>
                  {dispatchResult.errors.length} error(s):
                </Text>
                {dispatchResult.errors.slice(0, 5).map((e, i) => (
                  <Text key={i} style={dStyles.resultErrorItem}>
                    • [{e.code}] {e.message}
                  </Text>
                ))}
                {dispatchResult.errors.length > 5 && (
                  <Text style={dStyles.resultErrorItem}>
                    …and {dispatchResult.errors.length - 5} more
                  </Text>
                )}
              </View>
            )}
            <TouchableOpacity
              style={dStyles.dismissBtn}
              onPress={() => setDispatchResult(null)}
            >
              <Text style={dStyles.dismissBtnText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Dispatch Error ── */}
        {dispatchError && (
          <View style={dStyles.errorBanner}>
            <Text style={dStyles.errorText}>{dispatchError}</Text>
          </View>
        )}

        {dataLoaded && (
          <View
            style={[
              dStyles.mainRow,
              isNarrow ? dStyles.mainRowNarrow : dStyles.mainRowWide,
            ]}
          >
            {/* ── Surveys Panel ── */}
            <View
              style={[
                dStyles.panel,
                isNarrow ? dStyles.panelFull : dStyles.panelLeft,
              ]}
            >
              <View style={dStyles.panelHeader}>
                <Text style={dStyles.panelTitle}>Surveys</Text>
                <View style={dStyles.panelControls}>
                  <TouchableOpacity onPress={selectAllSurveys}>
                    <Text style={dStyles.controlLink}>All</Text>
                  </TouchableOpacity>
                  <Text style={dStyles.controlSep}>·</Text>
                  <TouchableOpacity onPress={clearSurveys}>
                    <Text style={dStyles.controlLink}>Clear</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {surveys.length === 0 ? (
                <View style={dStyles.panelEmpty}>
                  <Text style={dStyles.panelEmptyText}>
                    No surveys created yet.
                  </Text>
                  <TouchableOpacity
                    style={dStyles.btnPrimary}
                    onPress={() =>
                      router.push(`/studies/${studyId}/surveys/create`)
                    }
                  >
                    <Text style={dStyles.btnPrimaryText}>Create Survey</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                surveys.map((s) => (
                  <TouchableOpacity
                    key={s.survey_id}
                    style={[
                      dStyles.checkRow,
                      selectedSurveyIds.has(s.survey_id) &&
                        dStyles.checkRowSelected,
                    ]}
                    onPress={() => toggleSurvey(s.survey_id)}
                  >
                    <View
                      style={[
                        dStyles.checkBox,
                        selectedSurveyIds.has(s.survey_id) &&
                          dStyles.checkBoxChecked,
                      ]}
                    >
                      {selectedSurveyIds.has(s.survey_id) && (
                        <Text style={dStyles.checkMark}>✓</Text>
                      )}
                    </View>
                    <View style={dStyles.checkRowContent}>
                      <Text style={dStyles.checkRowTitle} numberOfLines={1}>
                        {s.title}
                      </Text>
                      <View
                        style={{
                          flexDirection: "row",
                          gap: 8,
                          alignItems: "center",
                        }}
                      >
                        <View
                          style={[
                            dStyles.miniBadge,
                            s.is_active
                              ? dStyles.miniBadgeActive
                              : dStyles.miniBadgeInactive,
                          ]}
                        >
                          <Text
                            style={[
                              dStyles.miniBadgeText,
                              s.is_active
                                ? dStyles.miniBadgeActiveText
                                : dStyles.miniBadgeInactiveText,
                            ]}
                          >
                            {s.is_active ? "Active" : "Inactive"}
                          </Text>
                        </View>
                        {s.stats && (
                          <Text style={dStyles.checkRowMeta}>
                            {s.stats.recipients_total} sent
                          </Text>
                        )}
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() =>
                        router.push(
                          `/studies/${studyId}/surveys/${s.survey_id}`
                        )
                      }
                    >
                      <Text style={dStyles.manageLink}>Manage</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))
              )}
              <Text style={dStyles.selectionCount}>
                {selectedSurveyIds.size} of {surveys.length} selected
              </Text>
            </View>

            {/* ── Participants Panel ── */}
            <View
              style={[
                dStyles.panel,
                isNarrow ? dStyles.panelFull : dStyles.panelRight,
              ]}
            >
              <View style={dStyles.panelHeader}>
                <Text style={dStyles.panelTitle}>
                  Participants ({partTotal})
                </Text>
                <View style={dStyles.panelControls}>
                  <TouchableOpacity onPress={selectAllParticipantsOnPage}>
                    <Text style={dStyles.controlLink}>All</Text>
                  </TouchableOpacity>
                  <Text style={dStyles.controlSep}>·</Text>
                  <TouchableOpacity onPress={clearParticipants}>
                    <Text style={dStyles.controlLink}>Clear</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TextInput
                style={dStyles.searchInput}
                placeholder="Search participant ID…"
                placeholderTextColor={palette.light.text.muted}
                value={participantSearch}
                onChangeText={setParticipantSearch}
              />

              {filteredParticipants.length === 0 ? (
                <Text style={dStyles.panelEmptyText}>
                  {participantSearch ? "No matches." : "No enrolled participants."}
                </Text>
              ) : (
                filteredParticipants.map((p) => {
                  const hasUserId = p.user_id != null;
                  return (
                    <TouchableOpacity
                      key={p.participant_id}
                      style={[
                        dStyles.checkRow,
                        selectedParticipantIds.has(p.participant_id) &&
                          dStyles.checkRowSelected,
                        !hasUserId && dStyles.checkRowDisabled,
                      ]}
                      onPress={() => hasUserId && toggleParticipant(p.participant_id)}
                      disabled={!hasUserId}
                    >
                      <View
                        style={[
                          dStyles.checkBox,
                          selectedParticipantIds.has(p.participant_id) &&
                            dStyles.checkBoxChecked,
                          !hasUserId && dStyles.checkBoxDisabled,
                        ]}
                      >
                        {selectedParticipantIds.has(p.participant_id) && (
                          <Text style={dStyles.checkMark}>✓</Text>
                        )}
                      </View>
                      <View style={dStyles.checkRowContent}>
                        <Text style={dStyles.participantId} numberOfLines={1}>
                          {p.participant_id}
                        </Text>
                        <View style={dStyles.participantMeta}>
                          {hasUserId ? (
                            <Text style={dStyles.participantUserId}>
                              UID: {p.user_id}
                            </Text>
                          ) : (
                            <View style={dStyles.notLinkedBadge}>
                              <Text style={dStyles.notLinkedText}>Not Linked</Text>
                            </View>
                          )}
                          {hasUserId && (
                            <View style={dStyles.enrolledBadge}>
                              <Text style={dStyles.enrolledText}>Enrolled</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}

              {/* Participant Pagination */}
              {partTotal > partPageSize && (
                <View style={dStyles.miniPagination}>
                  <TouchableOpacity
                    style={[dStyles.miniPageBtn, partPage <= 1 && dStyles.miniPageBtnDisabled]}
                    onPress={() => setPartPage((p) => Math.max(1, p - 1))}
                    disabled={partPage <= 1}
                  >
                    <Text style={dStyles.miniPageBtnText}>‹ Prev</Text>
                  </TouchableOpacity>
                  <Text style={dStyles.miniPageInfo}>{partPage}/{partTotalPages}</Text>
                  <TouchableOpacity
                    style={[dStyles.miniPageBtn, partPage >= partTotalPages && dStyles.miniPageBtnDisabled]}
                    onPress={() => setPartPage((p) => Math.min(partTotalPages, p + 1))}
                    disabled={partPage >= partTotalPages}
                  >
                    <Text style={dStyles.miniPageBtnText}>Next ›</Text>
                  </TouchableOpacity>
                </View>
              )}

              <Text style={dStyles.selectionCount}>
                {selectedParticipantIds.size} of {partTotal} selected
              </Text>
            </View>
          </View>
        )}

        {/* ── Status Grid ── */}
        {dataLoaded &&
          selectedSurveyIds.size > 0 &&
          selectedParticipantIds.size > 0 && (
            <View style={dStyles.gridSection}>
              <Text style={dStyles.gridTitle}>Status Grid</Text>
              <Text style={dStyles.gridSubtitle}>
                Shows current email status for each survey × participant
                combination
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator>
                <View>
                  {/* Grid Header */}
                  <View style={dStyles.gridHeaderRow}>
                    <View style={dStyles.gridCorner} />
                    {[...selectedSurveyIds].map((sid) => {
                      const s = surveys.find((x) => x.survey_id === sid);
                      return (
                        <View key={sid} style={dStyles.gridColHeader}>
                          <Text
                            style={dStyles.gridColHeaderText}
                            numberOfLines={2}
                          >
                            {s?.title ?? `Survey ${sid}`}
                          </Text>
                        </View>
                      );
                    })}
                  </View>

                  {/* Grid Rows */}
                  {[...selectedParticipantIds].map((pid) => (
                    <View key={pid} style={dStyles.gridDataRow}>
                      <View style={dStyles.gridRowLabel}>
                        <Text
                          style={dStyles.gridRowLabelText}
                          numberOfLines={1}
                        >
                          {pid}
                        </Text>
                      </View>
                      {[...selectedSurveyIds].map((sid) => (
                        <View key={sid} style={dStyles.gridCell}>
                          <StatusChip
                            status={statusMap.get(buildStatusKey(sid, pid))}
                          />
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

        {/* ── Mode Selector ── */}
        {dataLoaded && (
          <View style={dStyles.modeSection}>
            <Text style={dStyles.modeSectionTitle}>Dispatch Mode</Text>
            <View style={dStyles.modeButtons}>
              {(Object.keys(modeLabels) as DispatchMode[]).map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[dStyles.modeBtn, mode === m && dStyles.modeBtnActive]}
                  onPress={() => setMode(m)}
                >
                  <Text
                    style={[
                      dStyles.modeBtnText,
                      mode === m && dStyles.modeBtnTextActive,
                    ]}
                  >
                    {modeLabels[m]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={dStyles.modeDescription}>{modeDescriptions[mode]}</Text>
          </View>
        )}

        {/* ── Email Options ── */}
        {dataLoaded && (
          <View style={dStyles.emailSection}>
            <Text style={dStyles.emailSectionTitle}>Email Options</Text>

            {/* Include link toggle */}
            <TouchableOpacity
              style={dStyles.checkRowOption}
              onPress={() => setIncludeLink((v) => !v)}
            >
              <View style={[dStyles.checkBox, includeLink && dStyles.checkBoxChecked]}>
                {includeLink && <Text style={dStyles.checkMark}>✓</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={dStyles.optionLabel}>Include survey link</Text>
                <Text style={dStyles.optionHint}>
                  Participants will receive a secure link to open their survey.
                </Text>
              </View>
            </TouchableOpacity>

            {/* Include custom message toggle */}
            <TouchableOpacity
              style={dStyles.checkRowOption}
              onPress={() => {
                setIncludeMessage((v) => !v);
                if (includeMessage) setMessageText("");
              }}
            >
              <View style={[dStyles.checkBox, includeMessage && dStyles.checkBoxChecked]}>
                {includeMessage && <Text style={dStyles.checkMark}>✓</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={dStyles.optionLabel}>Include a custom message</Text>
                <Text style={dStyles.optionHint}>
                  Add a personal note to the email sent to participants.
                </Text>
              </View>
            </TouchableOpacity>

            {/* Message text input */}
            {includeMessage && (
              <View style={dStyles.messageInputWrap}>
                <TextInput
                  style={[
                    dStyles.messageInput,
                    !messageText.trim() && dStyles.messageInputError,
                  ]}
                  placeholder="Enter your message to participants…"
                  placeholderTextColor={palette.light.text.muted}
                  value={messageText}
                  onChangeText={setMessageText}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
                {!messageText.trim() && (
                  <Text style={dStyles.fieldError}>
                    Message is required when "Include a custom message" is checked.
                  </Text>
                )}
              </View>
            )}
          </View>
        )}

        {/* ── Email Preview ── */}
        {dataLoaded && (
          <View style={dStyles.previewSection}>
            <Text style={dStyles.emailSectionTitle}>Email Preview</Text>
            <Text style={dStyles.previewHint}>
              Sample preview using placeholder values — no real participant data.
            </Text>

            {/* Show both previews for SEND_AND_RESEND, single for others */}
            {(mode === "SEND_MISSING" || mode === "SEND_AND_RESEND") && (
              <View style={dStyles.previewCard}>
                <View style={dStyles.previewTemplateBadge}>
                  <Text style={dStyles.previewTemplateBadgeText}>SURVEY_INVITE</Text>
                </View>
                <Text style={dStyles.previewSubjectLabel}>Subject</Text>
                <Text style={dStyles.previewSubject}>
                  {`Study ${studyName || studyId} – ${
                    selectedSurveyIds.size === 1
                      ? (surveys.find((s) => selectedSurveyIds.has(s.survey_id))?.title ?? "Selected Survey")
                      : selectedSurveyIds.size > 1
                      ? `Selected Survey +${selectedSurveyIds.size - 1} more`
                      : "Selected Survey"
                  }`}
                </Text>
                <Text style={dStyles.previewBodyLabel}>Body</Text>
                <View style={dStyles.previewBody}>
                  <Text style={dStyles.previewBodyText}>
                    {`Hi Participant,\n\nResearcher has invited you to complete the survey:\n\n"${
                      selectedSurveyIds.size === 1
                        ? (surveys.find((s) => selectedSurveyIds.has(s.survey_id))?.title ?? "Selected Survey")
                        : "Selected Survey"
                    }"\n\nThis survey is part of:\nStudy ${studyName || studyId}`}
                    {includeMessage && messageText.trim()
                      ? `\n\n${messageText.trim()}`
                      : ""}
                    {includeLink
                      ? "\n\n[Survey Link Button]"
                      : "\n\n(No survey link — include_link is off)"}
                    {"\n\nYour participation is appreciated.\n\nThank you,\nResearcher"}
                  </Text>
                </View>
              </View>
            )}

            {(mode === "RESEND_EXISTING" || mode === "SEND_AND_RESEND") && (
              <View style={[dStyles.previewCard, mode === "SEND_AND_RESEND" && { marginTop: 12 }]}>
                <View style={[dStyles.previewTemplateBadge, dStyles.previewTemplateBadgeReminder]}>
                  <Text style={dStyles.previewTemplateBadgeText}>SURVEY_REMINDER</Text>
                </View>
                <Text style={dStyles.previewSubjectLabel}>Subject</Text>
                <Text style={dStyles.previewSubject}>
                  {`Reminder: ${
                    selectedSurveyIds.size === 1
                      ? (surveys.find((s) => selectedSurveyIds.has(s.survey_id))?.title ?? "Selected Survey")
                      : "Selected Survey"
                  }`}
                </Text>
                <Text style={dStyles.previewBodyLabel}>Body</Text>
                <View style={dStyles.previewBody}>
                  <Text style={dStyles.previewBodyText}>
                    {`Hi Participant,\n\nThis is a reminder from Researcher regarding:\n\n"${
                      selectedSurveyIds.size === 1
                        ? (surveys.find((s) => selectedSurveyIds.has(s.survey_id))?.title ?? "Selected Survey")
                        : "Selected Survey"
                    }"\n\nIf you have not yet completed the survey, you may access it here:`}
                    {includeLink
                      ? "\n\n[Survey Link Button]"
                      : "\n\n(No survey link — include_link is off)"}
                    {includeMessage && messageText.trim()
                      ? `\n\n${messageText.trim()}`
                      : ""}
                    {"\n\nIf you have already completed it, please disregard this message.\n\nThank you,\nResearcher"}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ── Dispatch Action Bar ── */}
        {dataLoaded && (
          <View style={dStyles.actionBar}>
            <View style={dStyles.actionBarLeft}>
              <Text style={dStyles.pairCount}>
                {selectedSurveyIds.size} survey
                {selectedSurveyIds.size !== 1 ? "s" : ""} ×{" "}
                {selectedParticipantIds.size} participant
                {selectedParticipantIds.size !== 1 ? "s" : ""} ={" "}
                <Text
                  style={[
                    dStyles.pairCountNum,
                    overCap && { color: "#DC2626" },
                  ]}
                >
                  {pairCount.toLocaleString()} pair
                  {pairCount !== 1 ? "s" : ""}
                </Text>
              </Text>
              {overCap && (
                <Text style={dStyles.capWarning}>
                  Exceeds {PAIR_CAP.toLocaleString()} pair limit. Please reduce
                  selection.
                </Text>
              )}
              {!messageValid && (
                <Text style={dStyles.capWarning}>
                  A custom message is required when "Include a custom message" is checked.
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={[dStyles.btnDispatch, !canDispatch && dStyles.btnDisabled]}
              onPress={() => setShowConfirm(true)}
              disabled={!canDispatch}
            >
              {dispatching ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={dStyles.btnDispatchText}>Dispatch Surveys</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* ── Confirmation Modal ── */}
      <Modal
        visible={showConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirm(false)}
      >
        <View style={dStyles.modalOverlay}>
          <View style={dStyles.modalCard}>
            <Text style={dStyles.modalTitle}>Confirm Dispatch</Text>

            {[
              ["Surveys", selectedSurveyIds.size],
              ["Participants", selectedParticipantIds.size],
              ["Total Pairs", pairCount],
              ["Mode", modeLabels[mode]],
              ["Survey Link", includeLink ? "Included" : "Not included"],
              ["Custom Message", includeMessage ? "Included" : "None"],
            ].map(([label, val]) => (
              <View key={String(label)} style={dStyles.modalRow}>
                <Text style={dStyles.modalRowLabel}>{label}</Text>
                <Text style={dStyles.modalRowValue}>{val}</Text>
              </View>
            ))}

            <View style={dStyles.modalWarning}>
              <Text style={dStyles.modalWarningText}>
                This will send emails to the selected participants. Emails
                cannot be unsent once dispatched.
              </Text>
            </View>

            <View style={dStyles.modalActions}>
              <TouchableOpacity
                style={[dStyles.btnDispatch, dispatching && dStyles.btnDisabled]}
                onPress={handleConfirmDispatch}
                disabled={dispatching}
              >
                {dispatching ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={dStyles.btnDispatchText}>Yes, Dispatch</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={dStyles.btnGhost}
                onPress={() => setShowConfirm(false)}
                disabled={dispatching}
              >
                <Text style={dStyles.btnGhostText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const dStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.light.background },
  container: {
    padding: 20,
    paddingTop: Platform.OS === "web" ? 80 : 20,
    paddingBottom: 80,
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
  pageTitle: { fontSize: 24, fontWeight: "800", color: Colors.light.text },
  breadcrumb: { fontSize: 13, color: palette.light.text.muted, marginTop: 4 },
  headerActions: { flexDirection: "row", gap: 10, flexWrap: "wrap" },

  // Error / loading
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
  errorText: { color: "#DC2626", flex: 1, fontSize: 14 },
  retryText: { color: palette.light.primary, fontWeight: "600", marginLeft: 12 },

  // Main layout
  mainRow: { gap: 16 },
  mainRowWide: { flexDirection: "row", alignItems: "flex-start" },
  mainRowNarrow: { flexDirection: "column" },

  // Panels
  panel: {
    backgroundColor: Colors.light.background,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.light.border,
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
      default: { boxShadow: "0 2px 8px rgba(0,0,0,0.04)" } as any,
    }),
  },
  panelLeft: { flex: 1, marginRight: 8 },
  panelRight: { flex: 1, marginLeft: 8 },
  panelFull: { width: "100%" },

  panelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  panelTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.light.text,
  },
  panelControls: { flexDirection: "row", alignItems: "center", gap: 4 },
  controlLink: {
    fontSize: 13,
    color: palette.light.primary,
    fontWeight: "600",
  },
  controlSep: { fontSize: 13, color: palette.light.text.muted },

  panelEmpty: { alignItems: "center", paddingVertical: 20, gap: 12 },
  panelEmptyText: {
    fontSize: 13,
    color: palette.light.text.muted,
    textAlign: "center",
  },

  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  checkRowSelected: {
    backgroundColor: "rgba(186,12,47,0.06)",
    borderColor: "rgba(186,12,47,0.2)",
  },
  checkBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: palette.light.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  checkBoxChecked: {
    backgroundColor: palette.light.primary,
    borderColor: palette.light.primary,
  },
  checkMark: { color: "#fff", fontSize: 12, fontWeight: "700" },
  checkRowContent: { flex: 1, gap: 3 },
  checkRowTitle: { fontSize: 14, fontWeight: "600", color: Colors.light.text },
  checkRowMeta: { fontSize: 12, color: palette.light.text.muted },
  participantId: { fontSize: 13, color: Colors.light.text },
  participantMeta: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  participantUserId: { fontSize: 11, color: palette.light.text.muted },

  checkRowDisabled: { opacity: 0.45 },
  checkBoxDisabled: { borderColor: palette.light.border, backgroundColor: palette.light.muted },

  enrolledBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  enrolledText: { fontSize: 10, fontWeight: "700", color: "#166534" },

  notLinkedBadge: {
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  notLinkedText: { fontSize: 10, fontWeight: "700", color: "#DC2626" },
  manageLink: {
    fontSize: 12,
    color: palette.light.primary,
    fontWeight: "600",
  },

  miniBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  miniBadgeActive: { backgroundColor: "#DCFCE7" },
  miniBadgeActiveText: { color: "#166534" },
  miniBadgeInactive: { backgroundColor: palette.light.muted },
  miniBadgeInactiveText: { color: palette.light.text.secondary },
  miniBadgeText: { fontSize: 11, fontWeight: "600" },

  selectionCount: {
    fontSize: 12,
    color: palette.light.text.muted,
    marginTop: 4,
    textAlign: "right",
  },

  searchInput: {
    height: 36,
    borderWidth: 1,
    borderColor: palette.light.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 13,
    color: Colors.light.text,
    backgroundColor: Colors.light.background,
  },

  // Status Grid
  gridSection: {
    backgroundColor: Colors.light.background,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.light.border,
    gap: 8,
  },
  gridTitle: { fontSize: 15, fontWeight: "700", color: Colors.light.text },
  gridSubtitle: { fontSize: 13, color: palette.light.text.muted },
  gridHeaderRow: { flexDirection: "row" },
  gridCorner: { width: 140, height: 48 },
  gridColHeader: {
    width: 90,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    borderLeftWidth: 1,
    borderLeftColor: palette.light.border,
  },
  gridColHeaderText: {
    fontSize: 11,
    fontWeight: "700",
    color: palette.light.text.muted,
    textAlign: "center",
  },
  gridDataRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: palette.light.border,
  },
  gridRowLabel: {
    width: 140,
    height: 40,
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  gridRowLabelText: {
    fontSize: 12,
    color: Colors.light.text,
  },
  gridCell: {
    width: 90,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderLeftWidth: 1,
    borderLeftColor: palette.light.border,
  },
  statusChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  chipText: { fontSize: 11, fontWeight: "600" },
  chipNotSent: { backgroundColor: palette.light.muted },
  chipNotSentText: { color: palette.light.text.muted },
  chipSent: { backgroundColor: "#FEF9C3" },
  chipSentText: { color: "#854D0E" },
  chipOpened: { backgroundColor: "#DCFCE7" },
  chipOpenedText: { color: "#166534" },

  // Email Options
  emailSection: {
    backgroundColor: Colors.light.background,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.light.border,
    gap: 12,
  },
  emailSectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.light.text,
  },
  checkRowOption: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 4,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.text,
  },
  optionHint: {
    fontSize: 12,
    color: palette.light.text.muted,
    marginTop: 2,
  },
  messageInputWrap: { gap: 4 },
  messageInput: {
    borderWidth: 1,
    borderColor: palette.light.border,
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    color: Colors.light.text,
    backgroundColor: Colors.light.background,
    minHeight: 90,
  },
  messageInputError: { borderColor: "#DC2626" },
  fieldError: { fontSize: 12, color: "#DC2626" },

  // Email Preview
  previewSection: {
    backgroundColor: Colors.light.background,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.light.border,
    gap: 12,
  },
  previewHint: { fontSize: 12, color: palette.light.text.muted },
  previewCard: {
    backgroundColor: palette.light.surface,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: palette.light.border,
    gap: 6,
  },
  previewTemplateBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 4,
  },
  previewTemplateBadgeReminder: { backgroundColor: "#FEF9C3" },
  previewTemplateBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#1E40AF",
    letterSpacing: 0.5,
  },
  previewSubjectLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: palette.light.text.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  previewSubject: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.light.text,
  },
  previewBodyLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: palette.light.text.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 6,
  },
  previewBody: {
    backgroundColor: Colors.light.background,
    borderRadius: 6,
    padding: 10,
    borderWidth: 1,
    borderColor: palette.light.border,
  },
  previewBodyText: {
    fontSize: 12,
    color: Colors.light.text,
    lineHeight: 18,
  },

  // Mode Selector
  modeSection: {
    backgroundColor: Colors.light.background,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.light.border,
    gap: 10,
  },
  modeSectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.light.text,
  },
  modeButtons: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  modeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.light.border,
    backgroundColor: Colors.light.background,
  },
  modeBtnActive: {
    backgroundColor: palette.light.primary,
    borderColor: palette.light.primary,
  },
  modeBtnText: { fontSize: 13, fontWeight: "600", color: palette.light.text.muted },
  modeBtnTextActive: { color: "#fff" },
  modeDescription: { fontSize: 13, color: palette.light.text.muted, lineHeight: 18 },

  // Action Bar
  actionBar: {
    backgroundColor: Colors.light.background,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.light.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
      default: { boxShadow: "0 -2px 12px rgba(0,0,0,0.06)" } as any,
    }),
  },
  actionBarLeft: { flex: 1, gap: 4 },
  pairCount: { fontSize: 14, color: Colors.light.text },
  pairCountNum: { fontWeight: "700", color: palette.light.primary },
  capWarning: { fontSize: 13, color: "#DC2626" },

  btnDispatch: {
    backgroundColor: palette.light.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
    minWidth: 160,
  },
  btnDispatchText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  btnDisabled: { opacity: 0.45 },

  // Result Card
  resultCard: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 14,
    padding: 20,
    gap: 12,
  },
  resultTitle: { fontSize: 18, fontWeight: "700", color: "#166534" },
  resultGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  resultItem: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    minWidth: 80,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  resultItemValue: { fontSize: 22, fontWeight: "800", color: "#166534" },
  resultItemLabel: { fontSize: 11, color: "#15803D", marginTop: 2, textAlign: "center" },
  resultErrors: {
    backgroundColor: "#FEF2F2",
    borderRadius: 8,
    padding: 12,
    gap: 4,
  },
  resultErrorsTitle: { fontSize: 13, fontWeight: "700", color: "#DC2626" },
  resultErrorItem: { fontSize: 12, color: "#DC2626" },
  dismissBtn: {
    alignSelf: "flex-end",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  dismissBtnText: { fontSize: 13, color: "#166534", fontWeight: "600" },

  // Buttons
  btnPrimary: {
    backgroundColor: palette.light.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  btnPrimaryText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  btnSecondary: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: palette.light.primary,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  btnSecondaryText: { color: palette.light.primary, fontWeight: "700", fontSize: 13 },
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

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: Colors.light.background,
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 480,
    gap: 12,
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
  modalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: palette.light.surface,
    borderRadius: 8,
  },
  modalRowLabel: { fontSize: 13, color: palette.light.text.muted, fontWeight: "600" },
  modalRowValue: { fontSize: 13, color: Colors.light.text, fontWeight: "700" },
  modalWarning: {
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 8,
    padding: 12,
  },
  modalWarningText: { fontSize: 13, color: "#92400E", lineHeight: 18 },
  modalActions: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
});
