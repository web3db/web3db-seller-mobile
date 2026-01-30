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

  /** Build CSV string from shares data (one row per metric, flattened). */
  function buildSharesCsv(
    postingId: number | string,
    postingTitle: string,
    shares: any[]
  ): string {
    const headers = [
      "Study ID",
      "Study Title",
      "User",
      "User ID",
      "Session ID",
      "Status",
      "Segment ID",
      "Day",
      "Segment From",
      "Segment To",
      "Metric",
      "Unit",
      "Avg",
      "Min",
      "Max",
      "Total",
      "Samples",
    ];
    const rows: string[][] = [headers.map(escapeCsvField)];

    for (const sh of shares) {
      const segs = sh.segments ?? [];
      for (const seg of segs) {
        const metrics = seg.metrics ?? [];
        const fromStr = seg.fromUtc
          ? formatUtcToLocal(seg.fromUtc)
          : "";
        const toStr = seg.toUtc ? formatUtcToLocal(seg.toUtc) : "";
        for (const m of metrics) {
          rows.push(
            [
              postingId,
              postingTitle,
              sh.userDisplayName ?? "",
              sh.userId ?? "",
              sh.sessionId ?? "",
              sh.statusName ?? "",
              seg.segmentId ?? "",
              seg.dayIndex ?? "",
              fromStr,
              toStr,
              m.metricName ?? "",
              m.unitCode ?? "",
              formatMetricValue(m.avgValue),
              formatMetricValue(m.minValue),
              formatMetricValue(m.maxValue),
              formatMetricValue(m.totalValue),
              m.samplesCount ?? "",
            ].map(escapeCsvField)
          );
        }
        if (metrics.length === 0) {
          rows.push(
            [
              postingId,
              postingTitle,
              sh.userDisplayName ?? "",
              sh.userId ?? "",
              sh.sessionId ?? "",
              sh.statusName ?? "",
              seg.segmentId ?? "",
              seg.dayIndex ?? "",
              fromStr,
              toStr,
              "",
              "",
              "",
              "",
              "",
              "",
              "",
            ].map(escapeCsvField)
          );
        }
      }
      if (segs.length === 0) {
        rows.push(
          [
            postingId,
            postingTitle,
            sh.userDisplayName ?? "",
            sh.userId ?? "",
            sh.sessionId ?? "",
            sh.statusName ?? "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
          ].map(escapeCsvField)
        );
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
      const postingTitle =
        sharesData.postingTitle ?? study?.title ?? "Study";
      const csv = buildSharesCsv(
        postingId,
        postingTitle,
        sharesData.shares
      );

      if (Platform.OS === "web") {
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `study-${postingId}-data.csv`;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        await Share.share({
          message: csv,
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
        const detail = await getTrnPostingDetail(buyerId, studyId);

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
        data[date] = arr.map(
          (d: any) => d.totalValue ?? d.total ?? d.total_value ?? 0
        );
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
            <Text style={styles.heading}>Study Details</Text>

            <Text style={styles.label}>Title</Text>
            <Text style={styles.value}>{study.title}</Text>

            <Text style={styles.label}>Summary</Text>
            <Text style={styles.value}>{study.summary}</Text>

            <Text style={styles.label}>Description</Text>
            <Text style={[styles.value, styles.multilineValue]}>
              {study.description}
            </Text>

            <Text style={styles.label}>Status</Text>
            <Text style={styles.value}>{study.postingStatusDisplayName}</Text>

            <Text style={styles.label}>Min Age</Text>
            <Text style={styles.value}>{study.minAge}</Text>

            <Text style={styles.label}>Data Coverage Days Required</Text>
            <Text style={styles.value}>
              {study.dataCoverageDaysRequired ?? "-"}
            </Text>

            <Text style={styles.label}>Apply Open At</Text>
            <Text style={styles.value}>{study.applyOpenAt ?? "-"}</Text>

            <Text style={styles.label}>Apply Close At</Text>
            <Text style={styles.value}>{study.applyCloseAt ?? "-"}</Text>

            <Text style={styles.label}>Reward Type</Text>
            <Text style={styles.value}>
              {study.rewardTypeDisplayName ?? "-"}
            </Text>

            <Text style={styles.label}>Reward Value</Text>
            <Text style={styles.value}>
              {study.rewardValue !== null ? study.rewardValue : "-"}
            </Text>

            <Text style={[styles.label, { marginTop: 12 }]}>Metrics</Text>
            <View style={styles.participantsList}>
              {!study.metricDisplayName ||
              study.metricDisplayName.length === 0 ? (
                <Text style={styles.muted}>No metrics</Text>
              ) : (
                study.metricDisplayName.map((m, i) => (
                  <View
                    key={study.metricId![i] + "-" + i}
                    style={styles.participantRow}
                  >
                    <Text>{m}</Text>
                  </View>
                ))
              )}
            </View>

            <Text style={[styles.label, { marginTop: 12 }]}>
              Health Conditions
            </Text>
            <View style={styles.participantsList}>
              {!study.healthConditions ||
              study.healthConditions.length === 0 ? (
                <Text style={styles.muted}>No conditions</Text>
              ) : (
                study.healthConditions.map((c, i) => (
                  <View key={c.id + "-" + i} style={styles.participantRow}>
                    <Text>{c.displayName}</Text>
                  </View>
                ))
              )}
            </View>

            <Text style={styles.label}>Buyer</Text>
            <Text style={styles.value}>{study.buyerDisplayName}</Text>

            <Text style={styles.label}>Study ID</Text>
            <Text style={styles.value}>{study.postingId}</Text>

            {/* <Text style={styles.label}>Created On</Text>
            <Text style={styles.value}>{study.createdOn ?? "-"}</Text> */}

            <Text style={styles.label}>Modified On</Text>
            <Text style={styles.value}>{study.modifiedOn ?? "-"}</Text>

            {/* <Text style={[styles.label, { marginTop: 12 }]}>Tags</Text>
            <View style={styles.participantsList}>
              {(!study.tags || study.tags.length === 0) ? (
                <Text style={styles.muted}>No tags</Text>
              ) : (
                study.tags.map((tag, i) => (
                  <View key={tag + i} style={styles.participantRow}>
                    <Text>{tag}</Text>
                  </View>
                ))
              )}
            </View> */}

            <Text style={[styles.label, { marginTop: 12 }]}>
              Metric trends
            </Text>
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

            <Text style={[styles.label, { marginTop: 12 }]}>
              Participant Shares
            </Text>

            {sharesLoading ? (
              <ActivityIndicator />
            ) : sharesError ? (
              <Text style={{ color: "red" }}>{sharesError}</Text>
            ) : !sharesData?.shares || sharesData.shares.length === 0 ? (
              <Text style={styles.muted}>No shares available</Text>
            ) : (
              <View style={{ marginTop: 8 }}>
                {sharesData.shares.map((sh: any, i: number) => (
                  <View
                    key={(sh.userId ?? sh.sessionId ?? i) + "-" + i}
                    style={styles.shareBox}
                  >
                    <TouchableOpacity
                      onPress={() => toggleShareExpand(i)}
                      style={styles.shareHeader}
                    >
                      <View>
                        <Text style={styles.shareTitle}>
                          {sh.userDisplayName ?? `User ${sh.userId ?? "-"}`}
                        </Text>
                        <Text style={styles.shareSubtitle}>
                          Session: {sh.sessionId ?? "-"} · {sh.statusName ?? ""}
                        </Text>
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
                                Segment {seg.segmentId ?? si} — Day{" "}
                                {seg.dayIndex ?? "-"}
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
                            </View>
                          ))
                        )}
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}

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

            <View style={styles.metaBlock}>
              <Text style={styles.metaLabel}>Study ID</Text>
              <Text style={styles.metaValue}>{study.postingId}</Text>
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
  scrollContainer: { padding: 16, paddingBottom: 48 },
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
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    ...Platform.select({
      ios: {
        shadowColor: Colors.light.text,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: { elevation: 3 },
      default: {},
    }),
  },

  leftColumn: { flex: 2, marginRight: 8, minWidth: 0 },
  rightColumn: { flex: 1, marginLeft: 8, minWidth: 260, maxWidth: 420 },

  fullWidth: { width: "100%" },

  heading: { fontSize: 20, fontWeight: "700", marginBottom: 8 },
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
  statHeading: { fontSize: 16, fontWeight: "700", marginBottom: 12 },
  statRow: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  statBox: {
    flex: 1,
    backgroundColor: palette.light.surface,
    borderRadius: 10,
    paddingVertical: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.04)",
    textAlign: "center",
  },
  statNumber: { fontSize: 28, fontWeight: "800" },
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
});
