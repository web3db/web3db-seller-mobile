import React, { useEffect, useState } from "react";
import { Colors, palette } from "@/constants/theme";
import { LABELS } from "@/constants/labels";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  useWindowDimensions,
  Platform,
  Animated,
  ActivityIndicator,
  Share,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  getPostingShares,
  getTrnPostingDetail,
} from "../../services/postings/api";
import { useAuth } from "@/hooks/AuthContext";
import type { StudyDetail } from "../../services/postings/types";

import { surveyListByPosting } from "../../services/surveys/api";
import type { Survey } from "../../services/surveys/types";

// ---------------------------------------------------------------------------
// Survey stat card (used in SurveysTabContent)
// ---------------------------------------------------------------------------

function SurveyStatCard({ label, value }: { label: string; value: number }) {
  return (
    <View style={surveyStyles.statCard}>
      <Text style={surveyStyles.statCardValue}>{value}</Text>
      <Text style={surveyStyles.statCardLabel}>{label}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Surveys Tab Content (renders inside the Surveys tab of StudyDetail)
// ---------------------------------------------------------------------------

function SurveysTabContent({
  studyId,
  isNarrow,
}: {
  studyId: string;
  isNarrow: boolean;
}) {
  const router = useRouter();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await surveyListByPosting(studyId, {
          include_stats: true,
          page: 1,
          page_size: 5,
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
  }, [studyId, retryCount]);

  const activeSurveys = surveys.filter((s) => s.is_active).length;
  const recipientsTotal = surveys.reduce(
    (sum, s) => sum + (s.stats?.recipients_total ?? 0),
    0,
  );
  const openedTotal = surveys.reduce(
    (sum, s) => sum + (s.stats?.opened_total ?? 0),
    0,
  );

  return (
    <View style={surveyStyles.container}>
      {/* Header */}
      <View style={surveyStyles.header}>
        <Text style={surveyStyles.headerTitle}>Surveys</Text>
        <Text style={surveyStyles.headerSubtitle}>
          Manage surveys for this study. Create, dispatch, and monitor survey
          participation.
        </Text>
      </View>

      {/* Summary Stats Strip */}
      <View style={surveyStyles.statStrip}>
        <SurveyStatCard label="Total" value={total} />
        <SurveyStatCard label="Active" value={activeSurveys} />
        {recipientsTotal > 0 && (
          <SurveyStatCard label="Recipients" value={recipientsTotal} />
        )}
        {openedTotal > 0 && (
          <SurveyStatCard label="Opened" value={openedTotal} />
        )}
      </View>

      {/* Error Banner */}
      {error && (
        <View style={surveyStyles.errorBanner}>
          <Text style={surveyStyles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => setRetryCount((c) => c + 1)}>
            <Text style={surveyStyles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Loading */}
      {loading && (
        <ActivityIndicator
          color={palette.light.primary}
          style={{ marginTop: 24, marginBottom: 8 }}
        />
      )}

      {/* Empty State */}
      {!loading && !error && surveys.length === 0 && (
        <View style={surveyStyles.emptyState}>
          <Text style={surveyStyles.emptyTitle}>No surveys yet</Text>
          <Text style={surveyStyles.emptySubtitle}>
            Create a survey to send to participants via email.
          </Text>
          <TouchableOpacity
            style={surveyStyles.actionBtnPrimary}
            onPress={() => router.push(`/studies/${studyId}/surveys/create`)}
          >
            <Text style={surveyStyles.actionBtnPrimaryText}>Create Survey</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Recent Surveys List */}
      {!loading && surveys.length > 0 && (
        <View style={surveyStyles.surveyList}>
          {surveys.map((survey) => (
            <TouchableOpacity
              key={survey.survey_id}
              style={surveyStyles.surveyRow}
              onPress={() =>
                router.push(`/studies/${studyId}/surveys/${survey.survey_id}`)
              }
            >
              <View style={surveyStyles.surveyRowLeft}>
                <Text style={surveyStyles.surveyTitle} numberOfLines={1}>
                  {survey.title}
                </Text>
                {survey.stats && (
                  <Text style={surveyStyles.surveyMeta}>
                    {survey.stats.recipients_total} recipients ·{" "}
                    {survey.stats.opened_total} opened
                  </Text>
                )}
                <Text style={surveyStyles.surveyDate}>
                  Created {new Date(survey.created_on).toLocaleDateString()}
                </Text>
              </View>
              <View
                style={[
                  surveyStyles.surveyBadge,
                  survey.is_active
                    ? surveyStyles.surveyBadgeActive
                    : surveyStyles.surveyBadgeInactive,
                ]}
              >
                <Text
                  style={[
                    surveyStyles.surveyBadgeText,
                    survey.is_active
                      ? surveyStyles.surveyBadgeActiveText
                      : surveyStyles.surveyBadgeInactiveText,
                  ]}
                >
                  {survey.is_active ? "Active" : "Inactive"}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
          {total > 5 && (
            <Text style={surveyStyles.moreText}>
              +{total - 5} more · tap "View All Surveys" below
            </Text>
          )}
        </View>
      )}

      {/* Action Buttons */}
      <View
        style={[
          surveyStyles.actions,
          isNarrow ? surveyStyles.actionsColumn : surveyStyles.actionsRow,
        ]}
      >
        <TouchableOpacity
          style={[surveyStyles.actionBtnPrimary, isNarrow && { flex: 1 }]}
          onPress={() => router.push(`/studies/${studyId}/surveys`)}
        >
          <Text style={surveyStyles.actionBtnPrimaryText}>
            View All Surveys
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[surveyStyles.actionBtnSecondary, isNarrow && { flex: 1 }]}
          onPress={() => router.push(`/studies/${studyId}/surveys/create`)}
        >
          <Text style={surveyStyles.actionBtnSecondaryText}>Create Survey</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[surveyStyles.actionBtnSecondary, isNarrow && { flex: 1 }]}
          onPress={() => router.push(`/studies/${studyId}/surveys/dispatch`)}
        >
          <Text style={surveyStyles.actionBtnSecondaryText}>
            Dispatch Center
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// surveyStyles — module-level so SurveysTabContent can reference them
// ---------------------------------------------------------------------------

const surveyStyles = StyleSheet.create({
  container: {
    backgroundColor: Colors.light.background,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: palette.light.border,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: { elevation: 4 },
      default: { boxShadow: "0 4px 20px rgba(0,0,0,0.06)" } as any,
    }),
  },
  header: { marginBottom: 20 },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.light.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: palette.light.text.muted,
  },
  statStrip: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
    flexWrap: "wrap",
  },
  statCard: {
    flex: 1,
    minWidth: 70,
    backgroundColor: palette.light.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: palette.light.border,
  },
  statCardValue: {
    fontSize: 28,
    fontWeight: "800",
    color: palette.light.primary,
  },
  statCardLabel: {
    fontSize: 12,
    color: palette.light.text.muted,
    marginTop: 4,
    textAlign: "center",
  },
  surveyList: { gap: 8, marginBottom: 20 },
  surveyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    backgroundColor: palette.light.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.light.border,
  },
  surveyRowLeft: { flex: 1, marginRight: 12 },
  surveyTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 2,
  },
  surveyMeta: { fontSize: 12, color: palette.light.text.muted, marginTop: 2 },
  surveyDate: { fontSize: 12, color: palette.light.text.muted, marginTop: 2 },
  surveyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  surveyBadgeActive: { backgroundColor: "#DCFCE7" },
  surveyBadgeActiveText: { color: "#166534" },
  surveyBadgeInactive: { backgroundColor: palette.light.muted },
  surveyBadgeInactiveText: { color: palette.light.text.secondary },
  surveyBadgeText: { fontSize: 12, fontWeight: "600" },
  moreText: {
    fontSize: 13,
    color: palette.light.text.muted,
    textAlign: "center",
    marginTop: 4,
  },
  actions: { gap: 10, marginTop: 4 },
  actionsRow: { flexDirection: "row", flexWrap: "wrap" },
  actionsColumn: { flexDirection: "column" },
  actionBtnPrimary: {
    backgroundColor: palette.light.primary,
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 8,
    alignItems: "center",
  },
  actionBtnPrimaryText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  actionBtnSecondary: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: palette.light.primary,
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 8,
    alignItems: "center",
  },
  actionBtnSecondaryText: {
    color: palette.light.primary,
    fontWeight: "700",
    fontSize: 14,
  },
  emptyState: { alignItems: "center", paddingVertical: 32 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.light.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: palette.light.text.muted,
    textAlign: "center",
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  errorBanner: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  errorText: { color: "#DC2626", flex: 1 },
  retryText: {
    color: palette.light.primary,
    fontWeight: "600",
    marginLeft: 12,
  },
});

// ---------------------------------------------------------------------------
// Main StudyDetail component
// ---------------------------------------------------------------------------
export default function StudyDetail() {
  const { studyId, saved, draft } = useLocalSearchParams() as {
    studyId?: string;
    saved?: string;
    draft?: string;
  };
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isNarrow = width < 720;

  const [showSaved, setShowSaved] = useState<boolean>(
    saved === "1" || saved === "true" || draft === "1" || draft === "true",
  );
  const [bannerOpacity] = useState(new Animated.Value(showSaved ? 1 : 0));
  const [study, setStudy] = useState<StudyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Tab state
  // const [activeTab, setActiveTab] = useState<
  //   "overview" | "participants" | "surveys"
  // >("overview");
  const [activeTab, setActiveTab] = useState<"overview" | "surveys">(
    "overview",
  );
  // Shares (participant/session) UI
  const [sharesData, setSharesData] = useState<any | null>(null);
  const [sharesLoading, setSharesLoading] = useState(false);
  const [sharesError, setSharesError] = useState<string | null>(null);
  const [expandedShares, setExpandedShares] = useState<Record<number, boolean>>(
    {},
  );
  const [xlsxDownloading, setXlsxDownloading] = useState(false);
  /** Per-metric chart data: dates (X) and average value per date (Y). */
  const [metricCharts, setMetricCharts] = useState<
    {
      metricId: number;
      metricName: string;
      dates: string[];
      averages: number[];
    }[]
  >([]);
  /** Active bar for hover/press: show value and expand. */
  const [activeBar, setActiveBar] = useState<{
    metricId: number;
    date: string;
  } | null>(null);

  const { user } = useAuth();

  /**
   * Build rows for the "Research Participant Demographics" sheet: one row per participant.
   * Columns: Research Participant ID, Age, Gender, Height, Weight, Health Conditions
   */
  function buildUserSheetRows(
    shares: any[],
  ): (string | number | null | undefined)[][] {
    const rows: (string | number | null | undefined)[][] = [
      [
        `${LABELS.CONTRIBUTOR} ID`,
        "Age",
        "Gender",
        "Height",
        "Weight",
        "Health Conditions",
      ],
    ];

    const shareList = shares ?? [];
    for (let idx = 0; idx < shareList.length; idx++) {
      const sh = shareList[idx];
      const userId =
        sh.participantId ?? sh.participant_id ?? sh.userId ?? sh.user_id ?? "";
      const meta = sh.participantMeta ?? sh.participant_meta ?? {};
      const birthyear = meta.birthYear ?? meta.birth_year;
      const birthYearNum =
        typeof birthyear === "number"
          ? birthyear
          : birthyear != null && !Number.isNaN(Number(birthyear))
            ? Number(birthyear)
            : null;
      const currentYear = new Date().getFullYear();
      const age =
        birthYearNum != null && birthYearNum > 0 && birthYearNum <= currentYear
          ? currentYear - birthYearNum
          : "";

      const sex =
        typeof meta.sex === "object"
          ? (meta.sex?.name ?? meta.sex?.displayName ?? meta.sex?.code ?? "")
          : String(meta.sex ?? "");
      const heightObj = meta.height;
      const height =
        heightObj != null && typeof heightObj === "object"
          ? String(heightObj.value ?? "") +
            (heightObj.unitCode ? ` ${heightObj.unitCode}` : "")
          : String(meta.height ?? "");
      const weightObj = meta.weight;
      const weight =
        weightObj != null && typeof weightObj === "object"
          ? String(weightObj.value ?? "") +
            (weightObj.unitCode ? ` ${weightObj.unitCode}` : "")
          : String(meta.weight ?? "");
      const rawHealthConditions =
        meta.healthConditions ?? meta.health_conditions ?? null;
      let healthConditions = "";
      if (Array.isArray(rawHealthConditions)) {
        healthConditions = rawHealthConditions
          .map((hc: any) => {
            if (hc == null) return "";
            if (typeof hc === "string") return hc;
            return (
              hc.displayName ?? hc.display_name ?? hc.name ?? hc.code ?? ""
            );
          })
          .filter(Boolean)
          .join("; ");
      } else if (typeof rawHealthConditions === "string") {
        healthConditions = rawHealthConditions;
      }

      rows.push([userId, age, sex, height, weight, healthConditions]);
      if (idx < shareList.length - 1) {
        rows.push([]);
      }
    }

    return rows;
  }

  /**
   * Build rows for the "Metrics Data" sheet: one row per participant per time interval.
   * Columns: Research Participant ID, Metric Name, Date, Time Granularity, Metric Value, Units
   */
  function buildUserDataSheetRows(
    shares: any[],
  ): (string | number | null | undefined)[][] {
    type MetricCol = { name: string; unit: string; header: string };
    const metricColMap = new Map<string, MetricCol>();

    type RowKey = string;
    const rowMap = new Map<RowKey, { userId: string; start: string; end: string; values: Map<string, number | string> }>();

    for (const sh of shares ?? []) {
      const userId =
        sh.participantId ?? sh.participant_id ?? sh.userId ?? sh.user_id ?? "";

      for (const seg of sh.segments ?? []) {
        for (const m of seg.metrics ?? []) {
          const metricName: string =
            m.metricName ??
            m.metric_name ??
            (m.metricId != null ? `Metric ${m.metricId}` : "");
          const unitCode: string = m.unitCode ?? m.unit_code ?? "";
          const colKey = `${metricName}||${unitCode}`;

          if (!metricColMap.has(colKey)) {
            metricColMap.set(colKey, {
              name: metricName,
              unit: unitCode,
              header: unitCode ? `${metricName} (${unitCode})` : metricName,
            });
          }

          const buckets =
            m.computedJson?.buckets ?? m.computed_json?.buckets ?? null;
          if (!Array.isArray(buckets) || buckets.length === 0) continue;

          for (const b of buckets) {
            const start =
              b.start ?? b.startUtc ?? b.start_utc ?? b.from ?? b.fromUtc ?? b.from_utc ?? "";
            const end =
              b.end ?? b.endUtc ?? b.end_utc ?? b.to ?? b.toUtc ?? b.to_utc ?? "";
            const value = b.value ?? b.val ?? b.data ?? "";

            const rowKey: RowKey = `${userId}||${start}||${end}`;
            if (!rowMap.has(rowKey)) {
              rowMap.set(rowKey, { userId, start, end, values: new Map() });
            }
            rowMap.get(rowKey)!.values.set(colKey, value);
          }
        }
      }
    }

    const metricCols = Array.from(metricColMap.entries());
    const header: (string | number | null | undefined)[] = [
      `${LABELS.CONTRIBUTOR} ID`,
      "Start Time",
      "End Time",
      ...metricCols.map(([, col]) => col.header),
    ];

    const rows: (string | number | null | undefined)[][] = [header];

    const sortedEntries = Array.from(rowMap.values()).sort((a, b) => {
      if (a.userId < b.userId) return -1;
      if (a.userId > b.userId) return 1;
      return a.start < b.start ? -1 : a.start > b.start ? 1 : 0;
    });

    let previousUserId: string | null = null;
    for (const entry of sortedEntries) {
      if (previousUserId !== null && entry.userId !== previousUserId) {
        rows.push([]);
      }
      const row: (string | number | null | undefined)[] = [
        entry.userId,
        entry.start,
        entry.end,
        ...metricCols.map(([colKey]) => entry.values.get(colKey) ?? ""),
      ];
      rows.push(row);
      previousUserId = entry.userId;
    }

    return rows;
  }

  async function handleDownloadXlsx() {
    if (!sharesData?.shares || sharesData.shares.length === 0) {
      Alert.alert(
        "No data",
        "There is no share data available to download for this study.",
      );
      return;
    }
    setXlsxDownloading(true);
    try {
      if (Platform.OS !== "web") {
        Alert.alert(
          "Download not available",
          "Downloading the Excel file is only supported on web right now.",
        );
        return;
      }

      const XLSXMod = await import("xlsx");
      const XLSX: any = (XLSXMod as any).default ?? XLSXMod;

      const postingId = sharesData.postingId ?? study?.postingId ?? studyId;
      const userRows = buildUserSheetRows(sharesData.shares);
      const userDataRows = buildUserDataSheetRows(sharesData.shares);

      const wb = XLSX.utils.book_new();
      const usersSheet = XLSX.utils.aoa_to_sheet(userRows);
      XLSX.utils.book_append_sheet(wb, usersSheet, "Participant Demographics");

      const userDataSheet = XLSX.utils.aoa_to_sheet(userDataRows);
      XLSX.utils.book_append_sheet(wb, userDataSheet, "Metrics Data");

      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `study-${postingId}-data.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      Alert.alert(
        "Download failed",
        err?.message ?? "Could not download Excel file",
      );
    } finally {
      setXlsxDownloading(false);
    }
  }

  function formatUtcToLocal(utc?: string) {
    if (!utc) return "-";
    try {
      return new Date(utc).toLocaleString();
    } catch {
      return utc;
    }
  }

  /**
   * Formats a metric value to limit long decimals to 2 places.
   * Leaves integers and numbers with 1-2 decimals as they are.
   */
  function formatMetricValue(value: number | null): string {
    if (value === null) {
      return "-";
    }
    if (typeof value !== "number") {
      return String(value);
    }

    const valueString = String(value);
    const decimalPart = valueString.split(".")[1];

    // If there is a decimal part and it has more than 2 digits, round it
    if (decimalPart && decimalPart.length > 2) {
      // Use toFixed(2) for rounding and ensuring 2 decimal places,
      // then parseFloat().toString() to remove trailing zeros (e.g., "59.00" -> "59.0").
      return parseFloat(value.toFixed(2)).toString();
    }

    // For integers or numbers with 1-2 decimal places, return as is
    return valueString;
  }

  /** Returns the study's configured duration in days. */
  function getShareExpectedDays(
    study: StudyDetail | null,
    _share: any,
  ): number | null {
    const days = study?.dataCoverageDaysRequired;
    if (days == null || days <= 0) return null;
    return days;
  }

  /** Each segment is assumed to represent one full day of data. */
  function getShareCompletedDays(share: any): number {
    return Array.isArray(share?.segments) ? share.segments.length : 0;
  }

  /** Aggregates progress info per participant share. */
  function getShareProgress(study: StudyDetail | null, share: any) {
    const expected = getShareExpectedDays(study, share);
    if (expected == null) return null;

    const completed = getShareCompletedDays(share);
    return {
      completed,
      expected,
      onTrack: completed >= expected,
    };
  }

  /**
   * Compute nice round Y-axis ticks. Always starts at 0 (no negatives).
   * Uses round step sizes (1, 2, 5, 10, 20, 50, 100, 200, 500, …).
   */
  function computeYTicks(dataMin: number, dataMax: number, targetCount = 5) {
    const floor = Math.max(0, dataMin);
    const ceil = dataMax <= floor ? floor + 1 : dataMax;
    const rawRange = ceil - floor;

    const magnitude = Math.pow(10, Math.floor(Math.log10(rawRange || 1)));
    const residual = rawRange / magnitude;
    let niceStep: number;
    if (residual <= 1) niceStep = magnitude * 0.2;
    else if (residual <= 2) niceStep = magnitude * 0.5;
    else if (residual <= 5) niceStep = magnitude;
    else niceStep = magnitude * 2;

    if (niceStep <= 0) niceStep = 1;

    const niceMin = Math.floor(floor / niceStep) * niceStep;
    const niceMax = Math.ceil(ceil / niceStep) * niceStep;

    const ticks: number[] = [];
    for (let v = niceMin; v <= niceMax + niceStep * 0.001; v += niceStep) {
      ticks.push(Math.round(v * 1e9) / 1e9);
    }

    return { vMin: Math.max(0, niceMin), vMax: niceMax, yTicks: ticks };
  }

  /** Format a timestamp for X-axis tick labels. */
  function formatTickTime(ms: number): string {
    const d = new Date(ms);
    return d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatTickDate(ms: number): string {
    const d = new Date(ms);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  /**
   * Smooth SVG line chart using react-native-svg.
   * - Catmull-Rom → cubic Bezier spline for smooth curves
   * - Proper Y/X axis with tick marks & labels
   * - Designed to sit inside a scrollable container with a sticky Y-axis
   */
  function BucketsLineChart({
    buckets,
    metricName,
    unitCode,
    chartWidth,
    chartHeight = 320,
  }: {
    buckets: { start: string; end: string; value: number }[];
    metricName: string;
    unitCode?: string | null;
    chartWidth: number;
    chartHeight?: number;
  }) {
    const SvgComponents = React.useMemo(() => {
      try {
        const mod = require("react-native-svg");
        return {
          Svg: mod.Svg || mod.default,
          Path: mod.Path,
          Line: mod.Line,
          Text: mod.Text as any,
          Circle: mod.Circle,
          G: mod.G,
          Defs: mod.Defs,
          LinearGradient: mod.LinearGradient,
          Stop: mod.Stop,
          Rect: mod.Rect,
        };
      } catch {
        return null;
      }
    }, []);

    const [activeIdx, setActiveIdx] = useState<number | null>(null);

    const PADDING = { left: 0, right: 16, top: 20, bottom: 52 };
    const plotW = chartWidth - PADDING.left - PADDING.right;
    const plotH = chartHeight - PADDING.top - PADDING.bottom;

    const points = React.useMemo(() => {
      const list = buckets
        .map((b) => {
          const t = new Date(b.start).getTime();
          const v = Number(b.value);
          if (Number.isNaN(t) || Number.isNaN(v)) return null;
          return { t, v };
        })
        .filter((p): p is { t: number; v: number } => p != null);
      list.sort((a, b) => a.t - b.t);
      return list;
    }, [buckets]);

    const { tMin, tMax, yTicks, vMin, vMax } = React.useMemo(() => {
      if (points.length === 0)
        return { tMin: 0, tMax: 1, yTicks: [0, 1], vMin: 0, vMax: 1 };
      const ts = points.map((p) => p.t);
      const vs = points.map((p) => p.v);
      const { vMin, vMax, yTicks } = computeYTicks(
        Math.min(...vs),
        Math.max(...vs),
      );
      return {
        tMin: Math.min(...ts),
        tMax: Math.max(...ts),
        yTicks,
        vMin,
        vMax,
      };
    }, [points]);

    const xTicks = React.useMemo(() => {
      if (points.length === 0) return [];
      const tRange = tMax - tMin;
      if (tRange <= 0) return [tMin];
      const HOUR = 3_600_000;
      const DAY = 86_400_000;
      let interval: number;
      if (tRange <= 6 * HOUR) interval = HOUR;
      else if (tRange <= 24 * HOUR) interval = 2 * HOUR;
      else if (tRange <= 3 * DAY) interval = 6 * HOUR;
      else if (tRange <= 7 * DAY) interval = DAY;
      else interval = Math.ceil(tRange / 8 / DAY) * DAY;

      const firstTick = Math.ceil(tMin / interval) * interval;
      const ticks: number[] = [];
      for (let tick = firstTick; tick <= tMax; tick += interval)
        ticks.push(tick);
      if (ticks.length === 0) ticks.push(tMin);
      return ticks;
    }, [points, tMin, tMax]);

    const tRange = tMax - tMin || 1;
    const vRange = vMax - vMin || 1;
    const toX = (t: number) => PADDING.left + ((t - tMin) / tRange) * plotW;
    const toY = (v: number) => PADDING.top + (1 - (v - vMin) / vRange) * plotH;

    const splinePath = React.useMemo(() => {
      if (points.length === 0) return "";
      if (points.length === 1)
        return `M ${toX(points[0].t)} ${toY(points[0].v)}`;

      const coords = points.map((p) => ({ x: toX(p.t), y: toY(p.v) }));
      const tension = 0.15;
      const yFloor = toY(vMin);
      const yCeil = toY(vMax);
      const clampY = (y: number) => Math.max(yCeil, Math.min(yFloor, y));
      let d = `M ${coords[0].x} ${coords[0].y}`;

      for (let i = 0; i < coords.length - 1; i++) {
        const p0 = coords[Math.max(i - 1, 0)];
        const p1 = coords[i];
        const p2 = coords[i + 1];
        const p3 = coords[Math.min(i + 2, coords.length - 1)];

        const cp1x = p1.x + (p2.x - p0.x) * tension;
        const cp1y = clampY(p1.y + (p2.y - p0.y) * tension);
        const cp2x = p2.x - (p3.x - p1.x) * tension;
        const cp2y = clampY(p2.y - (p3.y - p1.y) * tension);

        d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
      }
      return d;
    }, [points, tMin, tMax, vMin, vMax, chartWidth, chartHeight]);

    const areaPath = React.useMemo(() => {
      if (points.length < 2) return "";
      const baseY = toY(vMin);
      const coords = points.map((p) => ({ x: toX(p.t), y: toY(p.v) }));
      return `${splinePath} L ${coords[coords.length - 1].x} ${baseY} L ${coords[0].x} ${baseY} Z`;
    }, [splinePath, points, vMin, chartWidth, chartHeight]);

    if (!SvgComponents) {
      return (
        <View style={{ padding: 12 }}>
          <Text>Chart unavailable (react-native-svg not loaded)</Text>
        </View>
      );
    }

    const {
      Svg,
      Path,
      Line: SvgLine,
      Text: SvgText,
      Circle,
      G,
      Defs,
      LinearGradient,
      Stop,
      Rect,
    } = SvgComponents;
    const HOUR = 3_600_000;
    const showDate = tMax - tMin > 24 * HOUR;

    return (
      <View style={svgStyles.chartContainer}>
        <Svg width={chartWidth} height={chartHeight}>
          <Defs>
            <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop
                offset="0%"
                stopColor={palette.light.primary}
                stopOpacity="0.18"
              />
              <Stop
                offset="100%"
                stopColor={palette.light.primary}
                stopOpacity="0.01"
              />
            </LinearGradient>
          </Defs>

          {/* Horizontal grid lines at Y ticks */}
          {yTicks.map((tick, i) => {
            const y = toY(tick);
            return (
              <SvgLine
                key={`grid-${i}`}
                x1={PADDING.left}
                y1={y}
                x2={chartWidth - PADDING.right}
                y2={y}
                stroke="#e5e7eb"
                strokeWidth={1}
                strokeDasharray="4,3"
              />
            );
          })}

          {/* X-axis baseline */}
          <SvgLine
            x1={PADDING.left}
            y1={chartHeight - PADDING.bottom}
            x2={chartWidth - PADDING.right}
            y2={chartHeight - PADDING.bottom}
            stroke="#d1d5db"
            strokeWidth={1}
          />

          {/* X tick marks & labels */}
          {xTicks.map((tick, i) => {
            const x = toX(tick);
            return (
              <G key={`xt-${i}`}>
                <SvgLine
                  x1={x}
                  y1={chartHeight - PADDING.bottom}
                  x2={x}
                  y2={chartHeight - PADDING.bottom + 5}
                  stroke="#9ca3af"
                  strokeWidth={1}
                />
                <SvgText
                  x={x}
                  y={chartHeight - PADDING.bottom + 18}
                  fontSize={10}
                  fill="#6B7280"
                  textAnchor="middle"
                >
                  {formatTickTime(tick)}
                </SvgText>
                {showDate && (
                  <SvgText
                    x={x}
                    y={chartHeight - PADDING.bottom + 30}
                    fontSize={9}
                    fill="#9ca3af"
                    textAnchor="middle"
                  >
                    {formatTickDate(tick)}
                  </SvgText>
                )}
              </G>
            );
          })}

          {/* X-axis label */}
          <SvgText
            x={(PADDING.left + chartWidth - PADDING.right) / 2}
            y={chartHeight - 4}
            fontSize={11}
            fill="#6B7280"
            textAnchor="middle"
            fontWeight="500"
          >
            Time
          </SvgText>

          {/* Area fill under curve */}
          {areaPath ? <Path d={areaPath} fill="url(#areaGrad)" /> : null}

          {/* Smooth spline line */}
          {splinePath ? (
            <Path
              d={splinePath}
              fill="none"
              stroke={palette.light.primary}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}

          {/* Active point indicator (rendered inside SVG) */}
          {activeIdx != null &&
            activeIdx >= 0 &&
            activeIdx < points.length &&
            (() => {
              const p = points[activeIdx];
              const x = toX(p.t);
              const y = toY(p.v);
              const label =
                (Number.isInteger(p.v) ? String(p.v) : p.v.toFixed(2)) +
                (unitCode ? ` ${unitCode}` : "");
              const tooltipW = Math.max(72, label.length * 8);
              return (
                <G>
                  <SvgLine
                    x1={x}
                    y1={PADDING.top}
                    x2={x}
                    y2={chartHeight - PADDING.bottom}
                    stroke={palette.light.primary}
                    strokeWidth={1}
                    strokeOpacity={0.35}
                    strokeDasharray="3,3"
                  />
                  <Circle
                    cx={x}
                    cy={y}
                    r={4}
                    fill="#fff"
                    stroke={palette.light.primary}
                    strokeWidth={2}
                  />
                  <Rect
                    x={x - tooltipW / 2}
                    y={y - 30}
                    width={tooltipW}
                    height={22}
                    rx={6}
                    fill="rgba(0,0,0,0.78)"
                  />
                  <SvgText
                    x={x}
                    y={y - 15}
                    fontSize={11}
                    fill="#fff"
                    textAnchor="middle"
                    fontWeight="600"
                    dominantBaseline="central"
                  >
                    {label}
                  </SvgText>
                </G>
              );
            })()}
        </Svg>
        {/* Transparent hit areas overlaid on top of SVG for hover + press */}
        {points.map((p, idx) => {
          const x = toX(p.t);
          return (
            <Pressable
              key={`hit-${idx}`}
              onPressIn={() => setActiveIdx(idx)}
              onPressOut={() => setActiveIdx(null)}
              onHoverIn={() => setActiveIdx(idx)}
              onHoverOut={() => setActiveIdx(null)}
              style={{
                position: "absolute",
                left: x - 14,
                top: PADDING.top,
                width: 28,
                height: plotH,
              }}
            />
          );
        })}
      </View>
    );
  }

  /**
   * Wrapper that renders a sticky Y-axis to the left of a horizontally
   * scrollable chart area.
   */
  function StickyYAxisChart({
    buckets,
    metricName,
    unitCode,
    containerWidth,
    chartHeight = 320,
  }: {
    buckets: { start: string; end: string; value: number }[];
    metricName: string;
    unitCode?: string | null;
    containerWidth: number;
    chartHeight?: number;
  }) {
    const SvgComponents = React.useMemo(() => {
      try {
        const mod = require("react-native-svg");
        return {
          Svg: mod.Svg || mod.default,
          Line: mod.Line,
          Text: mod.Text as any,
        };
      } catch {
        return null;
      }
    }, []);

    const Y_AXIS_WIDTH = 52;
    const PADDING = { top: 20, bottom: 52 };
    const plotH = chartHeight - PADDING.top - PADDING.bottom;

    const { yTicks, vMin, vMax } = React.useMemo(() => {
      const parsed = buckets
        .map((b) => Number(b.value))
        .filter((v) => !Number.isNaN(v));
      if (parsed.length === 0) return { yTicks: [0, 1], vMin: 0, vMax: 1 };
      return computeYTicks(Math.min(...parsed), Math.max(...parsed));
    }, [buckets]);

    const vRange = vMax - vMin || 1;
    const toY = (v: number) => PADDING.top + (1 - (v - vMin) / vRange) * plotH;

    const formatVal = (v: number) =>
      Number.isInteger(v) ? String(v) : v.toFixed(1);

    const minWidthPerPoint = 14;
    const naturalWidth = containerWidth - Y_AXIS_WIDTH;
    const scrollableWidth = Math.max(
      naturalWidth,
      buckets.length * minWidthPerPoint,
    );

    return (
      <View style={svgStyles.outerWrapper}>
        <Text style={svgStyles.chartTitle}>
          {metricName}
          {unitCode ? ` (${unitCode})` : ""} — over time
        </Text>
        <View style={svgStyles.stickyWrapper}>
          {/* Fixed Y-axis column */}
          {SvgComponents ? (
            <View
              style={[
                svgStyles.yAxisColumn,
                { width: Y_AXIS_WIDTH, height: chartHeight },
              ]}
            >
              <SvgComponents.Svg width={Y_AXIS_WIDTH} height={chartHeight}>
                {/* Y-axis label (rotated) */}
                <SvgComponents.Text
                  x={11}
                  y={PADDING.top + plotH / 2}
                  fontSize={10}
                  fill="#6B7280"
                  textAnchor="middle"
                  fontWeight="500"
                  rotation={-90}
                  originX={11}
                  originY={PADDING.top + plotH / 2}
                >
                  {metricName}
                  {unitCode ? ` (${unitCode})` : ""}
                </SvgComponents.Text>
                {/* Y-axis line */}
                <SvgComponents.Line
                  x1={Y_AXIS_WIDTH - 1}
                  y1={PADDING.top}
                  x2={Y_AXIS_WIDTH - 1}
                  y2={chartHeight - PADDING.bottom}
                  stroke="#d1d5db"
                  strokeWidth={1}
                />
                {/* Tick marks & labels */}
                {yTicks.map((tick, i) => {
                  const y = toY(tick);
                  return (
                    <React.Fragment key={i}>
                      <SvgComponents.Line
                        x1={Y_AXIS_WIDTH - 5}
                        y1={y}
                        x2={Y_AXIS_WIDTH - 1}
                        y2={y}
                        stroke="#9ca3af"
                        strokeWidth={1}
                      />
                      <SvgComponents.Text
                        x={Y_AXIS_WIDTH - 8}
                        y={y}
                        fontSize={10}
                        fill="#6B7280"
                        textAnchor="end"
                        dominantBaseline="central"
                      >
                        {formatVal(tick)}
                      </SvgComponents.Text>
                    </React.Fragment>
                  );
                })}
              </SvgComponents.Svg>
            </View>
          ) : (
            <View style={{ width: Y_AXIS_WIDTH }} />
          )}

          {/* Scrollable chart area */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator
            style={svgStyles.chartScrollView}
            contentContainerStyle={{ flexGrow: 0 }}
          >
            <BucketsLineChart
              buckets={buckets}
              metricName={metricName}
              unitCode={unitCode}
              chartWidth={scrollableWidth}
              chartHeight={chartHeight}
            />
          </ScrollView>
        </View>
      </View>
    );
  }

  /**
   * For a given metric, groups shares data by date.
   * Returns JSON in the form { [date]: list of data }.
   * Date key is YYYY-MM-DD from segment.fromUtc when present, otherwise "day-{dayIndex}".
   * Each list item includes the metric values plus segment/session context.
   */
  function groupMetricDataByDate(
    shares: any[],
    metric: number | string,
  ): Record<string, any[]> {
    const byDate: Record<string, any[]> = {};
    const matchByMetricId = typeof metric === "number";
    for (const sh of shares ?? []) {
      const segs = sh.segments ?? [];
      for (const seg of segs) {
        const dateKey = seg.fromUtc
          ? new Date(seg.fromUtc).toISOString().slice(0, 10)
          : `day-${seg.dayIndex ?? "?"}`;
        const metrics = seg.metrics ?? [];
        for (const m of metrics) {
          const matches = matchByMetricId
            ? (m.metricId ?? m.metric_id) === metric
            : (m.metricName ?? m.metric_name ?? "").toString() ===
              String(metric);
          if (!matches) continue;
          if (!byDate[dateKey]) byDate[dateKey] = [];
          byDate[dateKey].push({
            ...m,
            userId: sh.userId,
            userDisplayName: sh.userDisplayName,
            sessionId: sh.sessionId,
            segmentId: seg.segmentId,
            dayIndex: seg.dayIndex,
            fromUtc: seg.fromUtc,
            toUtc: seg.toUtc,
          });
        }
      }
    }
    return byDate;
  }

  function toggleShareExpand(idx: number) {
    setExpandedShares((prev) => ({ ...prev, [idx]: !prev[idx] }));
  }

  useEffect(() => {
    async function fetchStudyDetail() {
      if (!studyId) return;
      setLoading(true);
      setError(null);
      try {
        if (!user?.id) {
          setError("You must be signed in to view study details.");
          return;
        }
        const buyerId = Number(user.id);
        const detail = await getTrnPostingDetail(buyerId, studyId);
        // console.log("[StudyDetail] getTrnPostingDetail return value:", detail);

        setStudy(detail);
      } catch (err: any) {
        setError(err.message || "Failed to load study");
      } finally {
        setLoading(false);
      }
    }
    fetchStudyDetail();
  }, [studyId, user?.id]);

  useEffect(() => {
    if (showSaved && study) {
      Animated.timing(bannerOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      const t = setTimeout(() => {
        Animated.timing(bannerOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
        setShowSaved(false);
        router.replace(`/studies/${study.postingId}`);
      }, 3000);
      return () => clearTimeout(t);
    }
    bannerOpacity.setValue(0);
  }, [showSaved, bannerOpacity, router, study]);

  useEffect(() => {
    // In case the page was opened with the param, ensure internal state is set
    if (saved === "1" || saved === "true") {
      setShowSaved(true);
    }
  }, [saved]);

  // share fetching
  useEffect(() => {
    async function fetchShares() {
      if (!studyId) return;
      setSharesLoading(true);
      setSharesError(null);
      try {
        const res = await getPostingShares(Number(studyId));
        if (__DEV__)
          console.log("[StudyDetail] getPostingShares return value:", res);
        // save full response (postingId, postingTitle, shares[])
        setSharesData(res);
      } catch (err: any) {
        if (__DEV__) console.error("Failed to load posting shares", err);
        setSharesError(err?.message ?? String(err));
      } finally {
        setSharesLoading(false);
      }
    }
    void fetchShares();
  }, [studyId]);

  // After shares are loaded, group each metric by date, log to console, and build chart data
  useEffect(() => {
    if (!sharesData?.shares?.length) {
      setMetricCharts([]);
      return;
    }
    const shares = sharesData.shares;
    const metricsSeen = new Map<number, string>();
    for (const sh of shares) {
      for (const seg of sh.segments ?? []) {
        for (const m of seg.metrics ?? []) {
          const id = m.metricId ?? (m as any).metric_id;
          const name = m.metricName ?? (m as any).metric_name ?? `Metric ${id}`;
          if (id != null && !metricsSeen.has(id)) metricsSeen.set(id, name);
        }
      }
    }
    const charts: {
      metricId: number;
      metricName: string;
      dates: string[];
      averages: number[];
    }[] = [];
    for (const [metricId, metricName] of metricsSeen) {
      const byDate = groupMetricDataByDate(shares, metricId);
      const dates = Object.keys(byDate).sort();
      const data: Record<string, number[]> = {};
      for (const date of dates) {
        const arr = byDate[date] ?? [];
        data[date] = arr.map((d: any) => {
          const total = d.totalValue ?? d.total ?? d.total_value;
          if (total != null && !Number.isNaN(Number(total)))
            return Number(total);
          const avg = d.avgValue ?? d.avg_value;
          return avg != null && !Number.isNaN(Number(avg)) ? Number(avg) : 0;
        });
      }
      if (__DEV__)
        console.log(`[Metric ${metricId}] ${metricName}:`, { dates, data });
      const averages = dates.map(
        (d) => data[d].reduce((a, b) => a + b, 0) / (data[d].length || 1),
      );
      charts.push({ metricId, metricName, dates, averages });
    }
    setMetricCharts(charts);
  }, [sharesData]);

  if (!studyId) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.center}>
          <Text style={styles.error}>Missing study id</Text>
        </View>
      </SafeAreaView>
    );
  }
  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.center}>
          <Text>Loading study...</Text>
        </View>
      </SafeAreaView>
    );
  }
  if (error) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }
  if (!study) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.center}>
          <Text style={styles.error}>Study not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {showSaved && (
          <Animated.View style={[styles.banner, { opacity: bannerOpacity }]}>
            <Text style={styles.bannerText}>
              {draft === "1" || draft === "true"
                ? "Study saved as draft. To publish, update the status to Open from the Manage Study page."
                : "Changes saved successfully"}
            </Text>
          </Animated.View>
        )}

        {/* ── Tab Bar ── */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === "overview" && styles.tabBtnActive,
            ]}
            onPress={() => setActiveTab("overview")}
          >
            <Text
              style={[
                styles.tabBtnText,
                activeTab === "overview" && styles.tabBtnTextActive,
              ]}
            >
              Overview
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === "surveys" && styles.tabBtnActive,
            ]}
            onPress={() => setActiveTab("surveys")}
          >
            <Text
              style={[
                styles.tabBtnText,
                activeTab === "surveys" && styles.tabBtnTextActive,
              ]}
            >
              Surveys
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Overview Tab ── */}
        {activeTab === "overview" && (
          <View
            style={[
              styles.contentRow,
              isNarrow ? styles.columnLayout : styles.rowLayout,
            ]}
          >
            {/* LEFT: Read-only Info Card */}
            <View
              style={[
                styles.card,
                isNarrow ? styles.fullWidth : styles.leftColumn,
              ]}
            >
              <View style={styles.detailHero}>
                <Text style={styles.detailHeroLabel}>Study Details</Text>
                <Text style={styles.detailHeroTitle}>{study.title}</Text>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusBadgeText}>
                    {study.postingStatusDisplayName}
                  </Text>
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Overview</Text>
                <Text style={styles.detailSummary}>{study.summary}</Text>
                <Text style={[styles.detailDescription, styles.multilineValue]}>
                  {study.description}
                </Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Eligibility</Text>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Min Age</Text>
                  <Text style={styles.infoValue}>{study.minAge ?? "-"}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>
                    Data Coverage Days Required
                  </Text>
                  <Text style={styles.infoValue}>
                    {study.dataCoverageDaysRequired ?? "-"}
                  </Text>
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Application Window</Text>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Apply Open At</Text>
                  <Text style={styles.infoValue}>
                    {study.applyOpenAt
                      ? formatUtcToLocal(study.applyOpenAt)
                      : "-"}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Apply Close At</Text>
                  <Text style={styles.infoValue}>
                    {study.applyCloseAt
                      ? formatUtcToLocal(study.applyCloseAt)
                      : "-"}
                  </Text>
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Reward</Text>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Type</Text>
                  <Text style={styles.infoValue}>
                    {study.rewardTypeDisplayName ?? "-"}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Value</Text>
                  <Text style={styles.infoValue}>
                    {study.rewardValue !== null ? study.rewardValue : "-"}
                  </Text>
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Metrics</Text>
                <View style={styles.tagList}>
                  {!study.metricDisplayName ||
                  study.metricDisplayName.length === 0 ? (
                    <Text style={styles.muted}>No metrics</Text>
                  ) : (
                    study.metricDisplayName.map((m, i) => (
                      <View
                        key={study.metricId![i] + "-" + i}
                        style={styles.tagPill}
                      >
                        <Text style={styles.tagPillText}>{m}</Text>
                      </View>
                    ))
                  )}
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Health Conditions</Text>
                <View style={styles.tagList}>
                  {!study.healthConditions ||
                  study.healthConditions.length === 0 ? (
                    <Text style={styles.muted}>No conditions</Text>
                  ) : (
                    study.healthConditions.map((c, i) => (
                      <View key={c.id + "-" + i} style={styles.tagPill}>
                        <Text style={styles.tagPillText}>{c.displayName}</Text>
                      </View>
                    ))
                  )}
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Tags</Text>
                <View style={styles.tagList}>
                  {!study.tags || study.tags.length === 0 ? (
                    <Text style={styles.muted}>No tags</Text>
                  ) : (
                    study.tags
                      .map((tag: any) => {
                        if (typeof tag === "string") return tag;
                        if (!tag) return "";
                        return (
                          tag.displayName ??
                          tag.display_name ??
                          tag.name ??
                          tag.code ??
                          ""
                        );
                      })
                      .filter(
                        (name: any) =>
                          typeof name === "string" && name.trim().length > 0,
                      )
                      .map((name: string, i: number) => (
                        <View key={`${name}-${i}`} style={styles.tagPill}>
                          <Text style={styles.tagPillText}>{name}</Text>
                        </View>
                      ))
                  )}
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Study Info</Text>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>
                    {LABELS.INSTITUTIONAL_PARTNER}
                  </Text>
                  <Text style={styles.infoValue}>{study.buyerDisplayName}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Modified On</Text>
                  <Text style={styles.infoValue}>
                    {study.modifiedOn
                      ? formatUtcToLocal(study.modifiedOn)
                      : "-"}
                  </Text>
                </View>
              </View>

              {/* <Text style={styles.label}>Created On</Text>
            <Text style={styles.value}>{study.createdOn ?? "-"}</Text> */}

              {/* Metric Trends chart removed */}

              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Participant Shares</Text>

                {sharesLoading ? (
                  <ActivityIndicator />
                ) : sharesError ? (
                  <Text style={{ color: "red" }}>{sharesError}</Text>
                ) : !sharesData?.shares || sharesData.shares.length === 0 ? (
                  <Text style={styles.muted}>No shares available</Text>
                ) : (
                  <View style={{ marginTop: 8 }}>
                    {sharesData.shares.map((sh: any, i: number) => {
                      const meta = sh.participantMeta ?? {};
                      const raceName = meta.race?.name ?? "";
                      const sexName = meta.sex?.name ?? "";
                      const heightVal = meta.height;
                      const heightStr =
                        heightVal != null && heightVal.value != null
                          ? `${heightVal.value} ${heightVal.displayName ?? ""}`.trim()
                          : "";
                      const weightVal = meta.weight;
                      const weightStr =
                        weightVal != null && weightVal.value != null
                          ? `${weightVal.value} ${weightVal.displayName ?? ""}`.trim()
                          : "";
                      const participantId =
                        sh.participantId ?? sh.userId ?? "-";
                      const metaParts = [
                        raceName,
                        sexName,
                        heightStr,
                        weightStr,
                      ].filter(Boolean);
                      const metaLine =
                        metaParts.length > 0 ? metaParts.join(" · ") : null;

                      // Calculate progress
                      const progress = getShareProgress(study, sh);

                      return (
                        <View
                          key={
                            (sh.participantId ??
                              sh.userId ??
                              sh.sessionId ??
                              i) +
                            "-" +
                            i
                          }
                          style={styles.shareBox}
                        >
                          <TouchableOpacity
                            onPress={() => toggleShareExpand(i)}
                            style={styles.shareHeader}
                          >
                            <View>
                              <View
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  flexWrap: "wrap",
                                }}
                              >
                                <Text style={styles.shareTitle}>
                                  User — {participantId}
                                </Text>
                                {progress && (
                                  <View
                                    style={[
                                      styles.badgeContainer,
                                      progress.onTrack
                                        ? styles.badgeSuccess
                                        : styles.badgeWarning,
                                    ]}
                                  >
                                    <View
                                      style={[
                                        styles.badgeDot,
                                        progress.onTrack
                                          ? styles.badgeSuccessDot
                                          : styles.badgeWarningDot,
                                      ]}
                                    />
                                    <Text
                                      style={[
                                        styles.badgeText,
                                        progress.onTrack
                                          ? styles.badgeSuccessText
                                          : styles.badgeWarningText,
                                      ]}
                                    >
                                      {progress.completed}/{progress.expected}{" "}
                                      days submitted
                                    </Text>
                                  </View>
                                )}
                              </View>
                              <Text style={styles.shareSubtitle}>
                                Session:{" "}
                                {sh.sessionNumber ?? sh.sessionId ?? "-"} ·{" "}
                                {sh.statusName ?? ""}
                              </Text>
                              {metaLine ? (
                                <Text style={styles.shareSubtitle}>
                                  {metaLine}
                                </Text>
                              ) : null}
                            </View>
                            <Text style={styles.shareChevron}>
                              {expandedShares[i] ? "▴" : "▾"}
                            </Text>
                          </TouchableOpacity>

                          {expandedShares[i] && (
                            <View style={styles.shareDetails}>
                              {!sh.segments || sh.segments.length === 0 ? (
                                <Text style={styles.muted}>No segments</Text>
                              ) : (
                                sh.segments.map((seg: any, si: number) => (
                                  <View
                                    key={(seg.segmentId ?? si) + "-" + si}
                                    style={styles.segmentBox}
                                  >
                                    <Text style={styles.segmentHeader}>
                                      Segment{" "}
                                      {seg.segmentNumber ?? seg.segmentId ?? si}{" "}
                                      — Day{" "}
                                      {seg.dayNumber ?? seg.dayIndex ?? "-"}
                                    </Text>
                                    <Text style={styles.segmentSubheader}>
                                      From: {formatUtcToLocal(seg.fromUtc)} ·
                                      To: {formatUtcToLocal(seg.toUtc)}
                                    </Text>

                                    {!seg.metrics ||
                                    seg.metrics.length === 0 ? (
                                      <Text
                                        style={[
                                          styles.muted,
                                          { paddingVertical: 8 },
                                        ]}
                                      >
                                        No metrics
                                      </Text>
                                    ) : (
                                      <View style={styles.tableContainer}>
                                        {/* Table Header */}
                                        <View style={styles.tableHeaderRow}>
                                          <Text
                                            style={[
                                              styles.tableHeaderCell,
                                              { flex: 1.5 },
                                            ]}
                                          >
                                            Metric
                                          </Text>
                                          <Text
                                            style={[
                                              styles.tableHeaderCell,
                                              { flex: 0.7, textAlign: "right" },
                                            ]}
                                          >
                                            Unit
                                          </Text>
                                          <Text
                                            style={[
                                              styles.tableHeaderCell,
                                              { flex: 0.8, textAlign: "right" },
                                            ]}
                                          >
                                            Avg
                                          </Text>
                                          <Text
                                            style={[
                                              styles.tableHeaderCell,
                                              { flex: 0.8, textAlign: "right" },
                                            ]}
                                          >
                                            Min
                                          </Text>
                                          <Text
                                            style={[
                                              styles.tableHeaderCell,
                                              { flex: 0.8, textAlign: "right" },
                                            ]}
                                          >
                                            Max
                                          </Text>
                                          <Text
                                            style={[
                                              styles.tableHeaderCell,
                                              { flex: 1, textAlign: "right" },
                                            ]}
                                          >
                                            Total
                                          </Text>
                                          <Text
                                            style={[
                                              styles.tableHeaderCell,
                                              { flex: 1, textAlign: "right" },
                                            ]}
                                          >
                                            Samples
                                          </Text>
                                        </View>
                                        {/* Table Body */}
                                        {seg.metrics.map(
                                          (m: any, mi: number) => (
                                            <View
                                              key={
                                                (m.metricId ?? mi) + "-" + mi
                                              }
                                              style={[
                                                styles.tableRow,
                                                mi === seg.metrics.length - 1 &&
                                                  styles.tableRowLast,
                                              ]}
                                            >
                                              <Text
                                                style={[
                                                  styles.tableCell,
                                                  { flex: 1.5 },
                                                ]}
                                              >
                                                {m.metricName ??
                                                  `Metric ${m.metricId}`}
                                              </Text>
                                              <Text
                                                style={[
                                                  styles.tableCell,
                                                  {
                                                    flex: 0.7,
                                                    textAlign: "right",
                                                  },
                                                ]}
                                              >
                                                {m.unitCode ?? "-"}
                                              </Text>
                                              <Text
                                                style={[
                                                  styles.tableCell,
                                                  {
                                                    flex: 0.8,
                                                    textAlign: "right",
                                                  },
                                                ]}
                                              >
                                                {formatMetricValue(m.avgValue)}
                                              </Text>
                                              <Text
                                                style={[
                                                  styles.tableCell,
                                                  {
                                                    flex: 0.8,
                                                    textAlign: "right",
                                                  },
                                                ]}
                                              >
                                                {formatMetricValue(m.minValue)}
                                              </Text>
                                              <Text
                                                style={[
                                                  styles.tableCell,
                                                  {
                                                    flex: 0.8,
                                                    textAlign: "right",
                                                  },
                                                ]}
                                              >
                                                {formatMetricValue(m.maxValue)}
                                              </Text>
                                              <Text
                                                style={[
                                                  styles.tableCell,
                                                  {
                                                    flex: 1,
                                                    textAlign: "right",
                                                  },
                                                ]}
                                              >
                                                {formatMetricValue(
                                                  m.totalValue,
                                                )}
                                              </Text>
                                              <Text
                                                style={[
                                                  styles.tableCell,
                                                  {
                                                    flex: 1,
                                                    textAlign: "right",
                                                  },
                                                ]}
                                              >
                                                {m.samplesCount ?? "-"}
                                              </Text>
                                            </View>
                                          ),
                                        )}
                                      </View>
                                    )}
                                    {seg.metrics?.map((m: any, mi: number) => {
                                      const buckets = m.computedJson?.buckets;
                                      if (
                                        !Array.isArray(buckets) ||
                                        buckets.length === 0
                                      )
                                        return null;
                                      const containerW = Math.max(
                                        320,
                                        Math.min(width - 48, 900),
                                      );
                                      return (
                                        <StickyYAxisChart
                                          key={(m.metricId ?? mi) + "-chart"}
                                          buckets={buckets}
                                          metricName={
                                            m.metricName ??
                                            `Metric ${m.metricId}`
                                          }
                                          unitCode={m.unitCode}
                                          containerWidth={containerW}
                                        />
                                      );
                                    })}
                                  </View>
                                ))
                              )}
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>

              <View style={styles.formActions}>
                <TouchableOpacity
                  style={[styles.btn, styles.btnPrimary]}
                  onPress={() =>
                    router.push(`/studies/${study.postingId}/manage`)
                  }
                >
                  <Text style={styles.btnPrimaryText}>Manage Study</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btn, styles.btnSecondary]}
                  onPress={handleDownloadXlsx}
                  disabled={xlsxDownloading}
                >
                  {xlsxDownloading ? (
                    <ActivityIndicator size="small" color={Colors.light.tint} />
                  ) : (
                    <Text style={styles.btnSecondaryText}>
                      Download Data as Excel (.xlsx)
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btn, styles.btnGhost]}
                  onPress={() => router.back()}
                >
                  <Text style={styles.btnGhostText}>Back</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* RIGHT: Stats Card */}
            <View
              style={[
                styles.card,
                isNarrow ? styles.fullWidth : styles.rightColumn,
              ]}
            >
              <Text style={styles.statHeading}>Study Statistics</Text>

              <View style={styles.statRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statNumber}>
                    {study.metricId?.length ?? 0}
                  </Text>
                  <Text style={styles.statLabel}>Metrics</Text>
                </View>

                <View style={styles.statBox}>
                  <Text style={styles.statNumber}>
                    {study.healthConditions?.length ?? 0}
                  </Text>
                  <Text style={styles.statLabel}>Health Conditions</Text>
                </View>

                <View style={styles.statBox}>
                  <Text style={styles.statNumber}>
                    {study.tags?.length ?? 0}
                  </Text>
                  <Text style={styles.statLabel}>Tags</Text>
                </View>
              </View>

              <View style={styles.metaBlock}>
                <Text style={styles.metaLabel}>
                  {LABELS.INSTITUTIONAL_PARTNER}
                </Text>
                <Text style={styles.metaValue}>{study.buyerDisplayName}</Text>
              </View>
            </View>
          </View>
        )}

        {/* ── Surveys Tab ── */}
        {activeTab === "surveys" && (
          <SurveysTabContent studyId={String(studyId)} isNarrow={isNarrow} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Styles: intentionally matches manage.tsx for consistent layout
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.light.background },
  scrollContainer: {
    padding: 20,
    paddingTop: Platform.OS === "web" ? 80 : 20,
    paddingBottom: 48,
    backgroundColor: palette.light.surface,
  },
  banner: {
    backgroundColor: palette.light.success,
    borderColor: palette.light.success,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12,
    alignSelf: "center",
  },
  bannerText: { color: "#065F46", fontWeight: "600" },
  contentRow: {
    width: "100%",
    gap: 16,
  },
  rowLayout: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  columnLayout: {
    flexDirection: "column",
  },

  card: {
    backgroundColor: Colors.light.background,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: palette.light.border,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: { elevation: 4 },
      default: {
        boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
      },
    }),
  },

  leftColumn: { flex: 2, marginRight: 8, minWidth: 0 },
  rightColumn: { flex: 1, marginLeft: 8, minWidth: 260, maxWidth: 420 },

  fullWidth: { width: "100%" },

  heading: { fontSize: 20, fontWeight: "700", marginBottom: 8 },

  /* Beautified Study Details */
  detailHero: {
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: palette.light.muted,
  },
  detailHeroLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: palette.light.primary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  detailHeroTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.light.text,
    lineHeight: 32,
    marginBottom: 12,
  },
  statusBadge: {
    alignSelf: "flex-start",
    backgroundColor: palette.light.muted,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: palette.light.text.secondary,
  },
  detailSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: palette.light.text.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  detailSummary: {
    fontSize: 16,
    color: palette.light.text.secondary,
    lineHeight: 24,
  },
  detailDescription: {
    fontSize: 15,
    color: Colors.light.text,
    lineHeight: 22,
    marginTop: 8,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: palette.light.surface,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
  },
  infoLabel: {
    fontSize: 14,
    color: palette.light.text.muted,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.text,
    flex: 1,
    flexShrink: 1,
    textAlign: "right",
    marginLeft: 12,
  },
  tagList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tagPill: {
    backgroundColor: palette.light.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.light.muted,
  },
  tagPillText: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.light.text,
  },

  label: {
    fontSize: 14,
    marginTop: 8,
    marginBottom: 6,
    color: palette.light.text.muted,
  },
  value: { fontSize: 16, color: Colors.light.text },
  multilineValue: { lineHeight: 20, marginBottom: 4 },

  participantsList: { marginTop: 6 },

  participantRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: palette.light.muted,
  },

  formActions: {
    marginTop: 16,
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  btnPrimary: { backgroundColor: Colors.light.tint },
  btnPrimaryText: { color: Colors.light.background, fontWeight: "700" },
  btnSecondary: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: Colors.light.tint,
  },
  btnSecondaryText: { color: Colors.light.tint, fontWeight: "600" },
  btnGhost: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: palette.light.border,
  },
  btnGhostText: { color: Colors.light.text, fontWeight: "600" },

  /* Stats */
  statHeading: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 16,
    color: Colors.light.text,
  },
  statRow: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  statBox: {
    flex: 1,
    backgroundColor: palette.light.surface,
    borderRadius: 12,
    paddingVertical: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: palette.light.border,
    textAlign: "center",
  },
  statNumber: {
    fontSize: 28,
    fontWeight: "800",
    color: palette.light.primary,
  },
  statLabel: {
    color: palette.light.text.muted,
    marginTop: 6,
    textAlign: "center",
  },

  metaBlock: { marginTop: 12 },
  metaLabel: { fontSize: 12, color: palette.light.text.muted },
  metaValue: { fontSize: 14, fontWeight: "600", marginTop: 4 },

  helpBox: {
    marginTop: 16,
    backgroundColor: palette.light.muted,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.03)",
  },
  helpTitle: { fontWeight: "700", marginBottom: 6 },
  helpText: { color: Colors.light.text },

  muted: { color: palette.light.text.muted },

  error: { color: "red", textAlign: "center", marginTop: 24 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },

  shareBox: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    marginTop: 8,
    backgroundColor: Colors.light.background,
    overflow: "hidden", // to contain the rounded corners
  },
  shareHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    backgroundColor: Colors.light.background,
  },
  shareTitle: {
    fontWeight: "700",
    fontSize: 16,
  },
  shareSubtitle: {
    color: palette.light.text.muted,
    marginTop: 2,
  },
  shareChevron: {
    color: palette.light.text.muted,
    fontSize: 18,
    transform: [{ translateY: -2 }], // visual alignment
  },
  shareDetails: {
    padding: 12,
    paddingTop: 0, // No top padding, already spaced
    backgroundColor: palette.light.surface,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },

  segmentBox: {
    padding: 10,
    backgroundColor: palette.light.surface,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: palette.light.muted,
  },
  segmentHeader: {
    fontWeight: "700",
    fontSize: 15,
  },
  segmentSubheader: {
    color: palette.light.text.muted,
    marginTop: 4,
    marginBottom: 10,
    fontSize: 13,
  },
  tableContainer: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 6,
    overflow: "hidden", // clips the corners
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: palette.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  tableHeaderCell: {
    paddingHorizontal: 8,
    paddingVertical: 10,
    fontSize: 12,
    fontWeight: "600",
    color: palette.light.text.muted,
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    backgroundColor: Colors.light.background,
  },
  tableRowLast: {
    borderBottomWidth: 0, // No border for the last row in the table
  },
  tableCell: {
    paddingHorizontal: 8,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.light.text,
  },

  chartsContainer: {
    marginTop: 8,
    gap: 24,
  },
  chartCard: {
    padding: 12,
    backgroundColor: palette.light.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.light.muted,
  },
  chartTitle: {
    fontWeight: "700",
    fontSize: 15,
    marginBottom: 8,
    color: Colors.light.text,
  },
  chartRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "stretch",
  },
  chartYAxis: {
    width: 40,
    justifyContent: "space-between",
    paddingRight: 8,
    borderRightWidth: 1,
    borderRightColor: palette.light.muted,
  },
  chartYAxisTick: {
    height: 20,
    justifyContent: "center",
  },
  chartYAxisTickFirst: {
    justifyContent: "flex-start",
  },
  chartYAxisTickLast: {
    justifyContent: "flex-end",
  },
  chartYAxisLabel: {
    fontSize: 11,
    color: palette.light.text.muted,
  },
  chartBars: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    flex: 1,
    paddingHorizontal: 4,
  },
  chartBarWrapper: {
    flex: 1,
    alignItems: "center",
    minWidth: 40,
  },
  chartBar: {
    width: "70%",
    maxWidth: 48,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  chartBarFill: {
    width: "100%",
    backgroundColor: palette.light.primary,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  chartBarValueSlot: {
    minHeight: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  chartBarValue: {
    fontSize: 12,
    fontWeight: "700",
    color: palette.light.primary,
  },
  chartBarLabel: {
    marginTop: 6,
    fontSize: 10,
    color: palette.light.text.muted,
    textAlign: "center",
  },

  /* Progress Badges */
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  badgeWarning: { backgroundColor: "#FEF3C7" },
  badgeWarningDot: { backgroundColor: "#F59E0B" },
  badgeWarningText: { color: "#92400E" },
  badgeSuccess: { backgroundColor: "#DCFCE7" },
  badgeSuccessDot: { backgroundColor: "#16A34A" },
  badgeSuccessText: { color: "#166534" },

  /* Tab Bar */
  tabBar: {
    flexDirection: "row",
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.light.border,
    marginBottom: 16,
    overflow: "hidden",
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 13,
    alignItems: "center",
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  tabBtnActive: {
    borderBottomColor: palette.light.primary,
    backgroundColor: "rgba(186,12,47,0.04)",
  },
  tabBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.light.text.muted,
  },
  tabBtnTextActive: {
    color: palette.light.primary,
  },
});

const svgStyles = StyleSheet.create({
  outerWrapper: {
    marginTop: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: Colors.light.background,
    overflow: "hidden",
  },
  stickyWrapper: {
    flexDirection: "row",
  },
  yAxisColumn: {
    backgroundColor: Colors.light.background,
    zIndex: 2,
    borderRightWidth: 0,
  },
  chartScrollView: {
    flex: 1,
  },
  chartContainer: {
    paddingTop: 0,
    paddingRight: 8,
  },
  chartTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.light.text,
    paddingHorizontal: 8,
    paddingTop: 8,
    marginBottom: 2,
  },
});
