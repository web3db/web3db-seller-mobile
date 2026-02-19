import React, { useEffect, useState } from "react";
import { Colors, palette } from "@/constants/theme";
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
import { getPostingShares } from "../../services/postings/api";
import { useAuth } from "@/hooks/AuthContext";
import type { StudyDetail } from "../../services/postings/types";

export default function StudyDetail() {
  const { studyId, saved } = useLocalSearchParams() as {
    studyId?: string;
    saved?: string;
  };
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isNarrow = width < 720;

  const [showSaved, setShowSaved] = useState<boolean>(
    saved === "1" || saved === "true"
  );
  const [bannerOpacity] = useState(new Animated.Value(showSaved ? 1 : 0));
  const [study, setStudy] = useState<StudyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Shares (participant/session) UI
  const [sharesData, setSharesData] = useState<any | null>(null);
  const [sharesLoading, setSharesLoading] = useState(false);
  const [sharesError, setSharesError] = useState<string | null>(null);
  const [expandedShares, setExpandedShares] = useState<Record<number, boolean>>(
    {}
  );
  const [csvDownloading, setCsvDownloading] = useState(false);
  /** Per-metric chart data: dates (X) and average value per date (Y). */
  const [metricCharts, setMetricCharts] = useState<
    { metricId: number; metricName: string; dates: string[]; averages: number[] }[]
  >([]);
  /** Active bar for hover/press: show value and expand. */
  const [activeBar, setActiveBar] = useState<{
    metricId: number;
    date: string;
  } | null>(null);

  const { user } = useAuth();

  /** Escape a CSV field (quote if contains comma, newline, or quote). */
  function escapeCsvField(value: string | number | null | undefined): string {
    const s = value === null || value === undefined ? "" : String(value);
    if (/[",\r\n]/.test(s)) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  }

  /**
   * Build user.csv: one row per participant.
   * Columns: user_id, clerkId, birthyear, race, sex, height, weight
   */
  function buildUserCsv(shares: any[]): string {
    const headers = [
      "user_id",
      "birthyear",
      "race",
      "sex",
      "height",
      "weight",
    ];
    const rows: string[][] = [headers.map(escapeCsvField)];

    for (const sh of shares ?? []) {
      const userId =
        sh.participantId ??
        sh.participant_id ??
        sh.userId ??
        sh.user_id ??
        "";
      const meta = sh.participantMeta ?? sh.participant_meta ?? {};
      const birthyear = meta.birthYear ?? meta.birth_year ?? "";
      const race = typeof meta.race === "object"
        ? (meta.race?.name ?? meta.race?.displayName ?? meta.race?.code ?? "")
        : String(meta.race ?? "");
      const sex = typeof meta.sex === "object"
        ? (meta.sex?.name ?? meta.sex?.displayName ?? meta.sex?.code ?? "")
        : String(meta.sex ?? "");
      const heightObj = meta.height;
      const height = heightObj != null && typeof heightObj === "object"
        ? String(heightObj.value ?? "") + (heightObj.unitCode ? ` ${heightObj.unitCode}` : "")
        : String(meta.height ?? "");
      const weightObj = meta.weight;
      const weight = weightObj != null && typeof weightObj === "object"
        ? String(weightObj.value ?? "") + (weightObj.unitCode ? ` ${weightObj.unitCode}` : "")
        : String(meta.weight ?? "");

      rows.push(
        [userId, birthyear, race, sex, height, weight].map(
          escapeCsvField
        )
      );
    }

    return rows.map((r) => r.join(",")).join("\r\n");
  }

  /**
   * Build user_data.csv: one row per bucket.
   * Columns: user_id, start time, end time, data, units
   */
  function buildUserDataCsv(shares: any[]): string {
    const headers = [
      "user_id",
      "start time",
      "end time",
      "data",
      "units",
    ];
    const rows: string[][] = [headers.map(escapeCsvField)];

    for (const sh of shares ?? []) {
      const userId =
        sh.participantId ??
        sh.participant_id ??
        sh.userId ??
        sh.user_id ??
        "";

      const segs = sh.segments ?? [];
      for (const seg of segs) {
        const metrics = seg.metrics ?? [];
        for (const m of metrics) {
          const unitCode =
            m.unitCode ?? m.unit_code ?? "";

          const buckets =
            m.computedJson?.buckets ?? m.computed_json?.buckets ?? null;
          if (!Array.isArray(buckets) || buckets.length === 0) continue;

          for (const b of buckets) {
            const start =
              b.start ??
              b.startUtc ??
              b.start_utc ??
              b.from ??
              b.fromUtc ??
              b.from_utc ??
              "";
            const end =
              b.end ??
              b.endUtc ??
              b.end_utc ??
              b.to ??
              b.toUtc ??
              b.to_utc ??
              "";
            const value = b.value ?? b.val ?? b.data ?? "";

            rows.push(
              [userId, start, end, value, unitCode].map(escapeCsvField)
            );
          }
        }
      }
    }

    return rows.map((r) => r.join(",")).join("\r\n");
  }

  async function handleDownloadCsv() {
    if (!sharesData?.shares || sharesData.shares.length === 0) {
      Alert.alert(
        "No data",
        "There is no share data available to download for this study."
      );
      return;
    }
    setCsvDownloading(true);
    try {
      const postingId = sharesData.postingId ?? study?.postingId ?? studyId;
      const userCsv = buildUserCsv(sharesData.shares);
      const userDataCsv = buildUserDataCsv(sharesData.shares);
      const combinedCsv = userCsv + "\r\n" + userDataCsv;

      if (Platform.OS === "web") {
        const blob = new Blob([combinedCsv], {
          type: "text/csv;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `study-${postingId}-data.csv`;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        await Share.share({
          message: combinedCsv,
          title: "Study Data",
        });
      }
    } catch (err: any) {
      Alert.alert(
        "Download failed",
        err?.message ?? "Could not download CSV"
      );
    } finally {
      setCsvDownloading(false);
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

  /** Returns number of days since this participant joined (at least 1). */
  function getShareExpectedDays(
    study: StudyDetail | null,
    share: any
  ): number | null {
    const startIso =
      share?.joinTimeLocal ??
      share?.join_time_local ??
      study?.applyOpenAt ??
      study?.createdOn;
    if (!startIso) return null;

    const start = new Date(startIso);
    if (Number.isNaN(start.getTime())) return null;

    const now = new Date();
    const msPerDay = 24 * 60 * 60 * 1000;

    const diffDays = Math.floor((now.getTime() - start.getTime()) / msPerDay);
    return Math.max(1, diffDays + 1);
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

  /** Returns a "nice" Y-axis ceiling (1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, …). */
  function niceYCeiling(maxVal: number): number {
    if (maxVal <= 0) return 1;
    const exp = Math.floor(Math.log10(maxVal));
    const magnitude = Math.pow(10, exp);
    const normalized = maxVal / magnitude;
    if (normalized <= 1) return 1 * magnitude;
    if (normalized <= 2) return 2 * magnitude;
    if (normalized <= 5) return 5 * magnitude;
    return 10 * magnitude;
  }

  /** Format bucket time for x-axis label (time only). */
  function formatBucketTime(iso: string): string {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  }

  /**
   * Line chart for computedJson.buckets: value over time.
   * Buckets: { start, end, value }[].
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
    const [activePointIndex, setActivePointIndex] = useState<number | null>(null);
    const padding = { left: 44, right: 12, top: 8, bottom: 28 };
    const plotWidth = chartWidth - padding.left - padding.right;
    const plotHeight = chartHeight - padding.top - padding.bottom;

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

    const { tMin, tMax, vMin, vMax } = React.useMemo(() => {
      if (points.length === 0)
        return { tMin: 0, tMax: 1, vMin: 0, vMax: 1 };
      const ts = points.map((p) => p.t);
      const vs = points.map((p) => p.v);
      return {
        tMin: Math.min(...ts),
        tMax: Math.max(...ts),
        vMin: Math.min(...vs),
        vMax: Math.max(...vs),
      };
    }, [points]);

    const tRange = tMax - tMin || 1;
    const vRange = vMax - vMin || 1;

    const toX = (t: number) =>
      padding.left + ((t - tMin) / tRange) * plotWidth;
    const toY = (v: number) =>
      padding.top + (1 - (v - vMin) / vRange) * plotHeight;

    const segments: { x1: number; y1: number; x2: number; y2: number }[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      segments.push({
        x1: toX(points[i].t),
        y1: toY(points[i].v),
        x2: toX(points[i + 1].t),
        y2: toY(points[i + 1].v),
      });
    }

    return (
      <View style={[styles.bucketsChartCard, { width: chartWidth }]}>
        <Text style={styles.bucketsChartTitle}>
          {metricName}
          {unitCode ? ` (${unitCode})` : ""} — over time
        </Text>
        <View style={[styles.bucketsChartPlot, { width: chartWidth, height: chartHeight }]}>
          {/* Y-axis labels */}
          <View
            style={[
              styles.bucketsChartYAxis,
              { left: 0, top: 0, height: chartHeight, width: padding.left },
            ]}
          >
            <Text style={styles.bucketsChartAxisLabel} numberOfLines={1}>
              {vMax === vMin ? String(vMax) : Number.isInteger(vMax) ? String(vMax) : vMax.toFixed(1)}
            </Text>
            <Text style={[styles.bucketsChartAxisLabel, { marginTop: "auto" }]} numberOfLines={1}>
              {vMax === vMin ? String(vMin) : Number.isInteger(vMin) ? String(vMin) : vMin.toFixed(1)}
            </Text>
          </View>
          {/* Line segments */}
          {segments.map((seg, idx) => {
            const dx = seg.x2 - seg.x1;
            const dy = seg.y2 - seg.y1;
            const length = Math.sqrt(dx * dx + dy * dy) || 1;
            const angle = Math.atan2(dy, dx);
            const centerX = (seg.x1 + seg.x2) / 2;
            const centerY = (seg.y1 + seg.y2) / 2;
            return (
              <View
                key={idx}
                style={[
                  styles.bucketsChartLineSegment,
                  {
                    position: "absolute",
                    left: centerX - length / 2,
                    top: centerY - 1,
                    width: length,
                    height: 2,
                    transform: [{ rotate: `${angle}rad` }],
                  },
                ]}
              />
            );
          })}
          {/* Dots at each point - value label on hover/press */}
          {points.map((p, idx) => {
            const x = toX(p.t);
            const y = toY(p.v);
            const isActive = activePointIndex === idx;
            const valueStr =
              Number.isInteger(p.v) ? String(p.v) : p.v.toFixed(2);
            return (
              <Pressable
                key={idx}
                style={[
                  styles.bucketsChartDot,
                  {
                    position: "absolute",
                    left: x - 6,
                    top: y - 6,
                  },
                ]}
                onPressIn={() => setActivePointIndex(idx)}
                onPressOut={() => setActivePointIndex(null)}
                onHoverIn={() => setActivePointIndex(idx)}
                onHoverOut={() => setActivePointIndex(null)}
              >
                {isActive && (
                  <Text
                    style={[
                      styles.bucketsChartDotLabel,
                      {
                        position: "absolute",
                        left: 6,
                        bottom: 16,
                        transform: [{ translateX: -20 }],
                      },
                    ]}
                  >
                    {valueStr}
                    {unitCode ? ` ${unitCode}` : ""}
                  </Text>
                )}
              </Pressable>
            );
          })}
          {/* X-axis labels */}
          {points.length > 0 && (
            <>
              <Text
                style={[
                  styles.bucketsChartXLabel,
                  { left: padding.left, bottom: 4 },
                ]}
                numberOfLines={1}
              >
                {formatBucketTime(buckets[0].start)}
              </Text>
              <Text
                style={[
                  styles.bucketsChartXLabel,
                  { right: padding.right, bottom: 4, left: undefined },
                ]}
                numberOfLines={1}
              >
                {formatBucketTime(buckets[buckets.length - 1].end)}
              </Text>
            </>
          )}
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
    metric: number | string
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
          const matches =
            matchByMetricId
              ? (m.metricId ?? m.metric_id) === metric
              : (m.metricName ?? m.metric_name ?? "").toString() === String(metric);
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
        // Use the centralized API function which includes data normalization
        const { getTrnPostingDetail } = await import(
          "../../services/postings/api"
        );
        const buyerId = user?.id ? Number(user.id) : -1;
        // console.log("[StudyDetail] auth user (used as buyerId):", { user, buyerId });
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
  }, [studyId]);

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
        // HARD CODED TO 9001 TO GET DATA
        const res = await getPostingShares(Number(studyId));
        //const res = await getPostingShares(9001);
        console.log("[StudyDetail] getPostingShares return value:", res);
        // save full response (postingId, postingTitle, shares[])
        setSharesData(res);
      } catch (err: any) {
        console.error("Failed to load posting shares", err);
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
    const charts: { metricId: number; metricName: string; dates: string[]; averages: number[] }[] = [];
    for (const [metricId, metricName] of metricsSeen) {
      const byDate = groupMetricDataByDate(shares, metricId);
      const dates = Object.keys(byDate).sort();
      const data: Record<string, number[]> = {};
      for (const date of dates) {
        const arr = byDate[date] ?? [];
        data[date] = arr.map((d: any) => {
          const total = d.totalValue ?? d.total ?? d.total_value;
          if (total != null && !Number.isNaN(Number(total))) return Number(total);
          const avg = d.avgValue ?? d.avg_value;
          return (avg != null && !Number.isNaN(Number(avg))) ? Number(avg) : 0;
        });
      }
      console.log(`[Metric ${metricId}] ${metricName}:`, { dates, data });
      const averages = dates.map(
        (d) =>
          (data[d].reduce((a, b) => a + b, 0) / (data[d].length || 1))
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
            <Text style={styles.bannerText}>Changes saved successfully</Text>
          </Animated.View>
        )}

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
                <Text style={styles.infoLabel}>Data Coverage Days Required</Text>
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
                  {study.applyOpenAt ? formatUtcToLocal(study.applyOpenAt) : "-"}
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
                  study.tags.map((tag, i) => (
                    <View key={(tag ?? "") + "-" + i} style={styles.tagPill}>
                      <Text style={styles.tagPillText}>{tag}</Text>
                    </View>
                  ))
                )}
              </View>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>Study Info</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Buyer</Text>
                <Text style={styles.infoValue}>{study.buyerDisplayName}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Modified On</Text>
                <Text style={styles.infoValue}>{study.modifiedOn ?? "-"}</Text>
              </View>
            </View>

            {/* <Text style={styles.label}>Created On</Text>
            <Text style={styles.value}>{study.createdOn ?? "-"}</Text> */}

            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>Metric Trends</Text>
            {metricCharts.length === 0 && !sharesLoading && sharesData?.shares?.length > 0 ? (
              <Text style={styles.muted}>No metric data to chart</Text>
            ) : (
              <View style={styles.chartsContainer}>
                {metricCharts.map((chart) => {
                  const maxAvg =
                    Math.max(...chart.averages, 0) || 1;
                  const yMax = niceYCeiling(maxAvg);
                  const chartHeight = 200;
                  const yTicks = [
                    yMax,
                    (3 * yMax) / 4,
                    yMax / 2,
                    yMax / 4,
                    0,
                  ];
                  return (
                    <View
                      key={chart.metricId}
                      style={styles.chartCard}
                    >
                      <Text style={styles.chartTitle}>
                        {chart.metricName}
                      </Text>
                      <View style={[styles.chartRow, { height: chartHeight + 28 }]}>
                        <View style={[styles.chartYAxis, { height: chartHeight }]}>
                          {yTicks.map((tick, ti) => (
                            <View
                              key={ti}
                              style={[
                                styles.chartYAxisTick,
                                ti === 0 && styles.chartYAxisTickFirst,
                                ti === 4 && styles.chartYAxisTickLast,
                              ]}
                            >
                              <Text style={styles.chartYAxisLabel}>
                                {Number.isInteger(tick)
                                  ? String(tick)
                                  : tick.toFixed(1)}
                              </Text>
                            </View>
                          ))}
                        </View>
                        <View style={styles.chartBars}>
                          {chart.dates.map((date, i) => {
                            const avg = chart.averages[i] ?? 0;
                            const barHeight =
                              yMax > 0
                                ? (avg / yMax) * chartHeight
                                : 0;
                            const isActive =
                              activeBar?.metricId === chart.metricId &&
                              activeBar?.date === date;
                            const barScale = isActive ? 1.1 : 1;
                            return (
                              <Pressable
                                key={date}
                                style={styles.chartBarWrapper}
                                onPressIn={() =>
                                  setActiveBar({
                                    metricId: chart.metricId,
                                    date,
                                  })
                                }
                                onPressOut={() => setActiveBar(null)}
                                {...(Platform.OS === "web"
                                  ? ({
                                      onMouseEnter: () =>
                                        setActiveBar({
                                          metricId: chart.metricId,
                                          date,
                                        }),
                                      onMouseLeave: () =>
                                        setActiveBar(null),
                                    } as any)
                                  : {})}
                              >
                                <View
                                  style={[
                                    styles.chartBar,
                                    { height: chartHeight },
                                  ]}
                                >
                                  <View style={styles.chartBarValueSlot}>
                                    {isActive && (
                                      <Text
                                        style={styles.chartBarValue}
                                        numberOfLines={1}
                                      >
                                        {Number.isInteger(avg)
                                          ? String(avg)
                                          : avg.toFixed(1)}
                                      </Text>
                                    )}
                                  </View>
                                  <View style={{ flex: 1 }} />
                                  <View
                                    style={[
                                      styles.chartBarFill,
                                      {
                                        height: Math.max(
                                          barHeight,
                                          avg > 0 ? 4 : 0
                                        ),
                                        transform: [
                                          { scaleX: barScale },
                                          { scaleY: barScale },
                                        ],
                                      },
                                    ]}
                                  />
                                </View>
                                <Text
                                  style={styles.chartBarLabel}
                                  numberOfLines={1}
                                >
                                  {date}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
            </View>

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
                  const participantId = sh.participantId ?? sh.userId ?? "-";
                  const metaParts = [raceName, sexName, heightStr, weightStr].filter(Boolean);
                  const metaLine = metaParts.length > 0 ? metaParts.join(" · ") : null;

                  // Calculate progress
                  const progress = getShareProgress(study, sh);

                  return (
                  <View
                    key={(sh.participantId ?? sh.userId ?? sh.sessionId ?? i) + "-" + i}
                    style={styles.shareBox}
                  >
                    <TouchableOpacity
                      onPress={() => toggleShareExpand(i)}
                      style={styles.shareHeader}
                    >
                      <View>
                        <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap" }}>
                          <Text style={styles.shareTitle}>
                            User — {participantId}
                          </Text>
                          {progress && (
                            <View
                              style={[
                                styles.badgeContainer,
                                progress.onTrack ? styles.badgeSuccess : styles.badgeWarning,
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
                                {progress.completed}/{progress.expected} days submitted
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.shareSubtitle}>
                          Session: {sh.sessionNumber ?? sh.sessionId ?? "-"} · {sh.statusName ?? ""}
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
                                Segment {seg.segmentNumber ?? seg.segmentId ?? si} — Day{" "}
                                {seg.dayNumber ?? seg.dayIndex ?? "-"}
                              </Text>
                              <Text style={styles.segmentSubheader}>
                                From: {formatUtcToLocal(seg.fromUtc)} · To:{" "}
                                {formatUtcToLocal(seg.toUtc)}
                              </Text>

                              {!seg.metrics || seg.metrics.length === 0 ? (
                                <Text
                                  style={[styles.muted, { paddingVertical: 8 }]}
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
                                  {seg.metrics.map((m: any, mi: number) => (
                                    <View
                                      key={(m.metricId ?? mi) + "-" + mi}
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
                                        {m.metricName ?? `Metric ${m.metricId}`}
                                      </Text>
                                      <Text
                                        style={[
                                          styles.tableCell,
                                          { flex: 0.7, textAlign: "right" },
                                        ]}
                                      >
                                        {m.unitCode ?? "-"}
                                      </Text>
                                      <Text
                                        style={[
                                          styles.tableCell,
                                          { flex: 0.8, textAlign: "right" },
                                        ]}
                                      >
                                        {formatMetricValue(m.avgValue)}
                                      </Text>
                                      <Text
                                        style={[
                                          styles.tableCell,
                                          { flex: 0.8, textAlign: "right" },
                                        ]}
                                      >
                                        {formatMetricValue(m.minValue)}
                                      </Text>
                                      <Text
                                        style={[
                                          styles.tableCell,
                                          { flex: 0.8, textAlign: "right" },
                                        ]}
                                      >
                                        {formatMetricValue(m.maxValue)}
                                      </Text>
                                      <Text
                                        style={[
                                          styles.tableCell,
                                          { flex: 1, textAlign: "right" },
                                        ]}
                                      >
                                        {formatMetricValue(m.totalValue)}
                                      </Text>
                                      <Text
                                        style={[
                                          styles.tableCell,
                                          { flex: 1, textAlign: "right" },
                                        ]}
                                      >
                                        {m.samplesCount ?? "-"}
                                      </Text>
                                    </View>
                                  ))}
                                </View>
                              )}
                              {seg.metrics?.map((m: any, mi: number) => {
                                const buckets = m.computedJson?.buckets;
                                if (!Array.isArray(buckets) || buckets.length === 0) return null;
                                const minWidthPerPoint = 12;
                                const widthFromPoints = buckets.length * minWidthPerPoint;
                                const chartWidth = Math.max(
                                  Math.max(320, Math.min(width - 48, 900)),
                                  widthFromPoints
                                );
                                return (
                                  <ScrollView
                                    key={(m.metricId ?? mi) + "-buckets-scroll"}
                                    horizontal
                                    showsHorizontalScrollIndicator
                                    style={styles.bucketsChartScroll}
                                    contentContainerStyle={styles.bucketsChartScrollContent}
                                  >
                                    <BucketsLineChart
                                      key={(m.metricId ?? mi) + "-buckets"}
                                      buckets={buckets}
                                      metricName={m.metricName ?? `Metric ${m.metricId}`}
                                      unitCode={m.unitCode}
                                      chartWidth={chartWidth}
                                    />
                                  </ScrollView>
                                );
                              })}
                            </View>
                          ))
                        )}
                      </View>
                    )}
                  </View>
                ); })}
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
                onPress={handleDownloadCsv}
                disabled={csvDownloading}
              >
                {csvDownloading ? (
                  <ActivityIndicator size="small" color={Colors.light.tint} />
                ) : (
                  <Text style={styles.btnSecondaryText}>
                    Download Data as CSV
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
                <Text style={styles.statNumber}>{study.tags?.length ?? 0}</Text>
                <Text style={styles.statLabel}>Tags</Text>
              </View>
            </View>

            <View style={styles.metaBlock}>
              <Text style={styles.metaLabel}>Buyer</Text>
              <Text style={styles.metaValue}>{study.buyerDisplayName}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Styles: intentionally matches manage.tsx for consistent layout
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.light.background },
  scrollContainer: {
    padding: 20,
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

  bucketsChartScroll: {
    marginTop: 12,
    width: "100%",
  },
  bucketsChartScrollContent: {
    flexGrow: 0,
  },
  bucketsChartCard: {
    marginTop: 0,
    padding: 10,
    backgroundColor: Colors.light.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  bucketsChartTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 6,
  },
  bucketsChartPlot: {
    position: "relative",
  },
  bucketsChartYAxis: {
    position: "absolute",
    justifyContent: "space-between",
    paddingRight: 4,
  },
  bucketsChartAxisLabel: {
    fontSize: 10,
    color: palette.light.text.muted,
  },
  bucketsChartLineSegment: {
    backgroundColor: palette.light.primary,
  },
  bucketsChartDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: palette.light.primary,
  },
  bucketsChartDotLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.light.text,
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    textAlign: "center",
  },
  bucketsChartXLabel: {
    position: "absolute",
    fontSize: 10,
    color: palette.light.text.muted,
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
});
