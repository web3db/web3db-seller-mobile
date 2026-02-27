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
import { surveyListByPosting } from "../../../services/surveys/api";
import type { Survey } from "../../../services/surveys/types";

declare const __DEV__: boolean;

export default function SurveysListPage() {
  const { studyId } = useLocalSearchParams() as { studyId?: string };
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isNarrow = width < 720;

  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [filterActive, setFilterActive] = useState<boolean | undefined>(undefined);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    if (!studyId) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await surveyListByPosting(studyId!, {
          include_stats: true,
          page,
          page_size: pageSize,
          is_active: filterActive,
        });
        if (!cancelled) {
          setSurveys(res.surveys);
          setTotal(res.total);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load surveys");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [studyId, page, filterActive]);

  const filteredSurveys = searchText.trim()
    ? surveys.filter((s) =>
        s.title.toLowerCase().includes(searchText.toLowerCase())
      )
    : surveys;

  function handleFilterChange(val: boolean | undefined) {
    setFilterActive(val);
    setPage(1);
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.pageTitle}>Surveys</Text>
            <Text style={styles.breadcrumb}>
              Study #{studyId} › Surveys
            </Text>
          </View>
          <View style={[styles.headerActions, isNarrow && styles.headerActionsNarrow]}>
            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={() => router.push(`/studies/${studyId}/surveys/create`)}
            >
              <Text style={styles.btnPrimaryText}>+ Create Survey</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnSecondary}
              onPress={() => router.push(`/studies/${studyId}/surveys/dispatch`)}
            >
              <Text style={styles.btnSecondaryText}>Dispatch Center</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Filters & Search */}
        <View style={[styles.filterBar, isNarrow && styles.filterBarNarrow]}>
          <View style={styles.filterButtons}>
            {[
              { label: "All", value: undefined },
              { label: "Active", value: true },
              { label: "Inactive", value: false },
            ].map((opt) => (
              <TouchableOpacity
                key={String(opt.label)}
                style={[
                  styles.filterBtn,
                  filterActive === opt.value && styles.filterBtnActive,
                ]}
                onPress={() => handleFilterChange(opt.value)}
              >
                <Text
                  style={[
                    styles.filterBtnText,
                    filterActive === opt.value && styles.filterBtnTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="Search surveys..."
            placeholderTextColor={palette.light.text.muted}
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>

        {/* Error Banner */}
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => setPage((p) => p)}>
              <Text style={styles.retryText}>Retry</Text>
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

        {/* Table / Card List */}
        {!loading && filteredSurveys.length === 0 && !error && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No surveys found</Text>
            <Text style={styles.emptySubtitle}>
              {searchText
                ? "Try a different search term."
                : "Create your first survey to get started."}
            </Text>
            {!searchText && (
              <TouchableOpacity
                style={styles.btnPrimary}
                onPress={() =>
                  router.push(`/studies/${studyId}/surveys/create`)
                }
              >
                <Text style={styles.btnPrimaryText}>Create Survey</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {!loading && filteredSurveys.length > 0 && (
          <View style={styles.card}>
            {/* Table Header — hidden on mobile */}
            {!isNarrow && (
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableHeaderCell, { flex: 3 }]}>Title</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: "center" }]}>Status</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1.5, textAlign: "right" }]}>Created</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: "right" }]}>Recipients</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: "right" }]}>Opened</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: "center" }]}>Action</Text>
              </View>
            )}

            {filteredSurveys.map((survey, idx) => (
              isNarrow ? (
                // Mobile card layout
                <TouchableOpacity
                  key={survey.survey_id}
                  style={[
                    styles.mobileRow,
                    idx < filteredSurveys.length - 1 && styles.mobileRowBorder,
                  ]}
                  onPress={() =>
                    router.push(`/studies/${studyId}/surveys/${survey.survey_id}`)
                  }
                >
                  <View style={styles.mobileRowTop}>
                    <Text style={styles.mobileRowTitle} numberOfLines={2}>
                      {survey.title}
                    </Text>
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
                  <Text style={styles.mobileRowMeta}>
                    Created {new Date(survey.created_on).toLocaleDateString()}
                    {survey.stats
                      ? ` · ${survey.stats.recipients_total} recipients · ${survey.stats.opened_total} opened`
                      : ""}
                  </Text>
                </TouchableOpacity>
              ) : (
                // Desktop table row
                <View
                  key={survey.survey_id}
                  style={[
                    styles.tableRow,
                    idx < filteredSurveys.length - 1 && styles.tableRowBorder,
                  ]}
                >
                  <Text
                    style={[styles.tableCell, { flex: 3 }]}
                    numberOfLines={2}
                  >
                    {survey.title}
                  </Text>
                  <View style={[{ flex: 1, alignItems: "center" }]}>
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
                  <Text
                    style={[
                      styles.tableCell,
                      { flex: 1.5, textAlign: "right" },
                    ]}
                  >
                    {new Date(survey.created_on).toLocaleDateString()}
                  </Text>
                  <Text
                    style={[styles.tableCell, { flex: 1, textAlign: "right" }]}
                  >
                    {survey.stats?.recipients_total ?? "-"}
                  </Text>
                  <Text
                    style={[styles.tableCell, { flex: 1, textAlign: "right" }]}
                  >
                    {survey.stats?.opened_total ?? "-"}
                  </Text>
                  <View style={[{ flex: 1, alignItems: "center" }]}>
                    <TouchableOpacity
                      style={styles.viewBtn}
                      onPress={() =>
                        router.push(
                          `/studies/${studyId}/surveys/${survey.survey_id}`
                        )
                      }
                    >
                      <Text style={styles.viewBtnText}>View</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )
            ))}
          </View>
        )}

        {/* Pagination */}
        {!loading && total > pageSize && (
          <View style={styles.pagination}>
            <TouchableOpacity
              style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
              onPress={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <Text style={styles.pageBtnText}>← Prev</Text>
            </TouchableOpacity>
            <Text style={styles.pageInfo}>
              Page {page} of {totalPages} ({total} total)
            </Text>
            <TouchableOpacity
              style={[
                styles.pageBtn,
                page >= totalPages && styles.pageBtnDisabled,
              ]}
              onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              <Text style={styles.pageBtnText}>Next →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Back */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.push(`/studies/${studyId}`)}
        >
          <Text style={styles.backBtnText}>← Back to Study</Text>
        </TouchableOpacity>
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

  pageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: 12,
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
  headerActions: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  headerActionsNarrow: {
    flexDirection: "column",
    width: "100%",
  },

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
  filterButtons: {
    flexDirection: "row",
    gap: 8,
  },
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
  filterBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: palette.light.text.muted,
  },
  filterBtnTextActive: {
    color: "#fff",
  },
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

  card: {
    backgroundColor: Colors.light.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.light.border,
    overflow: "hidden",
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

  tableHeaderRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: palette.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: palette.light.border,
  },
  tableHeaderCell: {
    fontSize: 12,
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
  tableCell: {
    fontSize: 14,
    color: Colors.light.text,
  },

  mobileRow: {
    padding: 16,
    backgroundColor: Colors.light.background,
  },
  mobileRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: palette.light.border,
  },
  mobileRowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 6,
  },
  mobileRowTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: Colors.light.text,
  },
  mobileRowMeta: {
    fontSize: 13,
    color: palette.light.text.muted,
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  statusBadgeActive: { backgroundColor: "#DCFCE7" },
  statusBadgeActiveText: { color: "#166534" },
  statusBadgeInactive: { backgroundColor: palette.light.muted },
  statusBadgeInactiveText: { color: palette.light.text.secondary },
  statusBadgeText: { fontSize: 12, fontWeight: "600" },

  viewBtn: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: palette.light.primary,
  },
  viewBtnText: { fontSize: 13, fontWeight: "600", color: palette.light.primary },

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
  pageBtnDisabled: {
    borderColor: palette.light.border,
    opacity: 0.5,
  },
  pageBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.light.primary,
  },
  pageInfo: {
    fontSize: 14,
    color: palette.light.text.muted,
  },

  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.light.text,
  },
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

  backBtn: {
    alignSelf: "flex-start",
    paddingVertical: 8,
  },
  backBtnText: {
    fontSize: 14,
    color: palette.light.text.muted,
    fontWeight: "600",
  },

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
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  btnSecondaryText: {
    color: palette.light.primary,
    fontWeight: "700",
    fontSize: 14,
  },
});
