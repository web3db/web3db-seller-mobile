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
  Platform,
  useWindowDimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { surveyRecipientsList } from "../../../../services/surveys/api";
import type { SurveyRecipient } from "../../../../services/surveys/types";

declare const __DEV__: boolean;

type StatusFilter = "all" | "sent" | "opened";

function StatusBadge({ status }: { status: SurveyRecipient["status"] }) {
  const config: Record<
    SurveyRecipient["status"],
    { bg: string; text: string; label: string }
  > = {
    OPENED: { bg: "#DCFCE7", text: "#166534", label: "Opened" },
    SENT: { bg: "#FEF9C3", text: "#854D0E", label: "Sent" },
    NOT_SENT: { bg: palette.light.muted, text: palette.light.text.secondary, label: "Not Sent" },
  };
  const c = config[status] ?? config.NOT_SENT;
  return (
    <View style={[rStyles.badge, { backgroundColor: c.bg }]}>
      <Text style={[rStyles.badgeText, { color: c.text }]}>{c.label}</Text>
    </View>
  );
}

function formatDate(iso: string | null) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function RecipientsPage() {
  const { studyId, surveyId } = useLocalSearchParams() as {
    studyId?: string;
    surveyId?: string;
  };
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isNarrow = width < 720;

  const [recipients, setRecipients] = useState<SurveyRecipient[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchText, setSearchText] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    if (!surveyId) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await surveyRecipientsList(surveyId!, {
          status: statusFilter === "all" ? undefined : statusFilter,
          page,
          page_size: pageSize,
        });
        if (!cancelled) {
          setRecipients(res.recipients);
          setTotal(res.total);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load recipients");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [surveyId, page, statusFilter, retryCount]);

  const filteredRecipients = searchText.trim()
    ? recipients.filter((r) =>
        r.participant_id.toLowerCase().includes(searchText.toLowerCase())
      )
    : recipients;

  function handleFilterChange(val: StatusFilter) {
    setStatusFilter(val);
    setPage(1);
  }

  return (
    <SafeAreaView style={rStyles.root}>
      <ScrollView contentContainerStyle={rStyles.container}>
        {/* Header */}
        <View style={rStyles.pageHeader}>
          <View>
            <Text style={rStyles.pageTitle}>Recipients</Text>
            <Text style={rStyles.breadcrumb}>
              Study #{studyId} › Surveys › #{surveyId} › Recipients
            </Text>
          </View>
        </View>

        {/* Filters Row */}
        <View style={[rStyles.filterBar, isNarrow && rStyles.filterBarNarrow]}>
          <View style={rStyles.filterButtons}>
            {(["all", "sent", "opened"] as StatusFilter[]).map((f) => (
              <TouchableOpacity
                key={f}
                style={[
                  rStyles.filterBtn,
                  statusFilter === f && rStyles.filterBtnActive,
                ]}
                onPress={() => handleFilterChange(f)}
              >
                <Text
                  style={[
                    rStyles.filterBtnText,
                    statusFilter === f && rStyles.filterBtnTextActive,
                  ]}
                >
                  {f === "all" ? "All" : f === "sent" ? "Sent" : "Opened"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={rStyles.searchInput}
            placeholder="Search participant ID…"
            placeholderTextColor={palette.light.text.muted}
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>

        {/* Error Banner */}
        {error && (
          <View style={rStyles.errorBanner}>
            <Text style={rStyles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => setRetryCount((c) => c + 1)}>
              <Text style={rStyles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Loading */}
        {loading && (
          <ActivityIndicator
            color={palette.light.primary}
            style={{ marginVertical: 32 }}
          />
        )}

        {/* Empty State */}
        {!loading && !error && filteredRecipients.length === 0 && (
          <View style={rStyles.emptyState}>
            <Text style={rStyles.emptyTitle}>No recipients found</Text>
            <Text style={rStyles.emptySubtitle}>
              {searchText
                ? "Try a different participant ID."
                : statusFilter !== "all"
                ? `No recipients with status "${statusFilter}".`
                : "Use the Dispatch Center to send surveys to participants."}
            </Text>
            {!searchText && statusFilter === "all" && (
              <TouchableOpacity
                style={rStyles.btnPrimary}
                onPress={() =>
                  router.push(`/studies/${studyId}/surveys/dispatch`)
                }
              >
                <Text style={rStyles.btnPrimaryText}>Go to Dispatch Center</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Table */}
        {!loading && filteredRecipients.length > 0 && (
          <View style={rStyles.tableWrapper}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ minWidth: isNarrow ? 600 : "100%" }}>
                {/* Table Header */}
                <View style={rStyles.tableHeaderRow}>
                  <Text style={[rStyles.thCell, { width: 160 }]}>
                    Participant ID
                  </Text>
                  <Text style={[rStyles.thCell, { width: 90, textAlign: "center" }]}>
                    Status
                  </Text>
                  <Text style={[rStyles.thCell, { width: 160, textAlign: "right" }]}>
                    Sent On
                  </Text>
                  <Text style={[rStyles.thCell, { width: 160, textAlign: "right" }]}>
                    Opened On
                  </Text>
                  <Text style={[rStyles.thCell, { width: 80, textAlign: "right" }]}>
                    Opens
                  </Text>
                  <Text style={[rStyles.thCell, { width: 180, textAlign: "right" }]}>
                    Last Opened
                  </Text>
                </View>

                {/* Table Body */}
                {filteredRecipients.map((r, idx) => (
                  <View
                    key={r.survey_recipient_id}
                    style={[
                      rStyles.tableRow,
                      idx < filteredRecipients.length - 1 &&
                        rStyles.tableRowBorder,
                      idx % 2 === 1 && rStyles.tableRowAlt,
                    ]}
                  >
                    <Text
                      style={[rStyles.tdCell, { width: 160 }]}
                      numberOfLines={1}
                    >
                      {r.participant_id}
                    </Text>
                    <View style={[{ width: 90, alignItems: "center" }]}>
                      <StatusBadge status={r.status} />
                    </View>
                    <Text
                      style={[
                        rStyles.tdCell,
                        { width: 160, textAlign: "right" },
                      ]}
                    >
                      {formatDate(r.sent_on)}
                    </Text>
                    <Text
                      style={[
                        rStyles.tdCell,
                        { width: 160, textAlign: "right" },
                      ]}
                    >
                      {formatDate(r.opened_on)}
                    </Text>
                    <Text
                      style={[
                        rStyles.tdCell,
                        { width: 80, textAlign: "right" },
                      ]}
                    >
                      {r.open_count}
                    </Text>
                    <Text
                      style={[
                        rStyles.tdCell,
                        { width: 180, textAlign: "right" },
                      ]}
                    >
                      {formatDate(r.last_opened_on)}
                    </Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Summary */}
        {!loading && total > 0 && (
          <Text style={rStyles.summaryText}>
            Showing {filteredRecipients.length} of {total} recipients
          </Text>
        )}

        {/* Pagination */}
        {!loading && total > pageSize && (
          <View style={rStyles.pagination}>
            <TouchableOpacity
              style={[rStyles.pageBtn, page <= 1 && rStyles.pageBtnDisabled]}
              onPress={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <Text style={rStyles.pageBtnText}>← Prev</Text>
            </TouchableOpacity>
            <Text style={rStyles.pageInfo}>
              Page {page} of {totalPages}
            </Text>
            <TouchableOpacity
              style={[
                rStyles.pageBtn,
                page >= totalPages && rStyles.pageBtnDisabled,
              ]}
              onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              <Text style={rStyles.pageBtnText}>Next →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Action Buttons */}
        <View style={rStyles.actionRow}>
          <TouchableOpacity
            style={rStyles.btnSecondary}
            onPress={() => router.push(`/studies/${studyId}/surveys/dispatch`)}
          >
            <Text style={rStyles.btnSecondaryText}>Dispatch Center</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={rStyles.btnGhost}
            onPress={() =>
              router.push(`/studies/${studyId}/surveys/${surveyId}`)
            }
          >
            <Text style={rStyles.btnGhostText}>← Back to Survey</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const rStyles = StyleSheet.create({
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
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: Colors.light.text,
  },
  breadcrumb: { fontSize: 13, color: palette.light.text.muted, marginTop: 4 },

  filterBar: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap",
  },
  filterBarNarrow: {
    flexDirection: "column",
    alignItems: "stretch",
  },
  filterButtons: { flexDirection: "row", gap: 8 },
  filterBtn: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.light.border,
    backgroundColor: Colors.light.background,
  },
  filterBtnActive: {
    backgroundColor: palette.light.primary,
    borderColor: palette.light.primary,
  },
  filterBtnText: { fontSize: 13, fontWeight: "600", color: palette.light.text.muted },
  filterBtnTextActive: { color: "#fff" },
  searchInput: {
    flex: 1,
    minWidth: 180,
    height: 38,
    borderWidth: 1,
    borderColor: palette.light.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: Colors.light.text,
    backgroundColor: Colors.light.background,
  },

  tableWrapper: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.light.border,
    overflow: "hidden",
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
  tableRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: palette.light.border,
  },
  tableRowAlt: {
    backgroundColor: palette.light.surface,
  },
  tdCell: {
    fontSize: 13,
    color: Colors.light.text,
    paddingHorizontal: 6,
  },

  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: { fontSize: 12, fontWeight: "600" },

  summaryText: {
    fontSize: 13,
    color: palette.light.text.muted,
    textAlign: "center",
  },

  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
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

  emptyState: { alignItems: "center", paddingVertical: 48, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: Colors.light.text },
  emptySubtitle: {
    fontSize: 14,
    color: palette.light.text.muted,
    textAlign: "center",
  },

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
});
