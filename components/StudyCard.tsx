import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { Colors, palette } from "@/constants/theme";
import { useRouter } from "expo-router";
import type { StudySummary } from "@/app/services/postings/types";

type StudyCardProps = {
  study: StudySummary;
  statusLabel?: string;
  onPress?: () => void;
};

// ─── Status color helper ──────────────────────────────────────────────────────
function getStatusColors(label: string): { bg: string; color: string; dot: string } {
  const l = (label ?? "").toLowerCase();
  if (l.includes("open") || l.includes("active") || l.includes("recruit") || l.includes("live"))
    return { bg: "#DCFCE7", color: "#15803D", dot: "#16A34A" };
  if (l.includes("draft") || l.includes("pending") || l.includes("review"))
    return { bg: "#FEF9C3", color: "#854D0E", dot: "#CA8A04" };
  if (l.includes("clos") || l.includes("complet") || l.includes("ended") || l.includes("inactiv"))
    return { bg: "#FEE2E2", color: "#991B1B", dot: "#DC2626" };
  if (l.includes("paus") || l.includes("hold"))
    return { bg: "#DBEAFE", color: "#1E40AF", dot: "#2563EB" };
  return { bg: "#F3F4F6", color: "#374151", dot: "#6B7280" };
}

/** Format ISO date to readable short form, e.g. "Mar 12, 2026" */
function formatShortDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "—";
  }
}

// ─── Web styles ───────────────────────────────────────────────────────────────
const webStyles: Record<string, React.CSSProperties> = {
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    border: "1px solid #EBEBEB",
    marginBottom: 16,
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
    overflow: "hidden",
  },
  // Red gradient header
  header: {
    background: "linear-gradient(135deg, #B22222 0%, #8B1A1A 100%)",
    padding: "16px 20px",
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  headerLeft: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontFamily: "Barlow, sans-serif",
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
    margin: 0,
    whiteSpace: "nowrap" as any,
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  headerOrganizer: {
    fontFamily: "Barlow, sans-serif",
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255,255,255,0.7)",
    margin: 0,
  },
  statusBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: "4px 10px",
    borderRadius: 20,
    fontFamily: "Barlow, sans-serif",
    fontSize: 12,
    fontWeight: "600",
    whiteSpace: "nowrap" as any,
    flexShrink: 0,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: "50%" as any,
    display: "inline-block",
  },
  // Body
  body: {
    padding: "16px 20px",
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  description: {
    fontFamily: "Barlow, sans-serif",
    fontSize: 13,
    color: "#666666",
    lineHeight: 1.5,
    margin: 0,
    overflow: "hidden",
    display: "-webkit-box" as any,
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical" as any,
  },
  // Stat boxes row
  statsRow: {
    display: "flex",
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  statBox: {
    flex: 1,
    minWidth: 100,
    backgroundColor: "#F9F9FB",
    borderRadius: 10,
    padding: "10px 12px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
    border: "1px solid #F0F0F0",
  },
  statValue: {
    fontFamily: "Barlow, sans-serif",
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  statLabel: {
    fontFamily: "Barlow, sans-serif",
    fontSize: 11,
    fontWeight: "500",
    color: "#888888",
    textTransform: "uppercase",
    letterSpacing: "0.3px",
  },
  // Pills section
  pillsSection: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  pillsLabel: {
    fontFamily: "Barlow, sans-serif",
    fontSize: 11,
    fontWeight: "600",
    color: "#888888",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    margin: 0,
  },
  pillsRow: {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  pill: {
    fontFamily: "Barlow, sans-serif",
    fontSize: 12,
    fontWeight: "500",
    padding: "4px 10px",
    borderRadius: 14,
    whiteSpace: "nowrap" as any,
  },
  metricPill: {
    backgroundColor: "rgba(178, 34, 34, 0.08)",
    color: "#B22222",
  },
  healthPill: {
    backgroundColor: "#EFF6FF",
    color: "#1E40AF",
  },
  tagPill: {
    backgroundColor: "#F3F4F6",
    color: "#374151",
  },
  // Actions
  actionsRow: {
    display: "flex",
    flexDirection: "row",
    gap: 8,
    justifyContent: "flex-end",
    paddingTop: 4,
  },
  btnPrimary: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "8px 16px",
    borderRadius: 8,
    border: "none",
    backgroundColor: "#B22222",
    fontFamily: "Barlow, sans-serif",
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
    cursor: "pointer",
    boxShadow: "0 2px 6px rgba(178,34,34,0.2)",
  },
  btnGhost: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "8px 16px",
    borderRadius: 8,
    border: "1.5px solid #B22222",
    backgroundColor: "transparent",
    fontFamily: "Barlow, sans-serif",
    fontSize: 13,
    fontWeight: "600",
    color: "#B22222",
    cursor: "pointer",
  },
};

// ─── Web component ────────────────────────────────────────────────────────────
const StudyCardWeb: React.FC<StudyCardProps> = ({ study, statusLabel, onPress }) => {
  const router = useRouter();

  const handleViewPress = () => {
    if (onPress) return onPress();
    router.push({ pathname: "/studies/[studyId]", params: { studyId: String(study.id) } });
  };

  const handleManagePress = () => {
    router.push({ pathname: "/studies/[studyId]/manage", params: { studyId: study.id } });
  };

  const label = statusLabel ?? study.statusDisplayName ?? `Status ${study.statusId}`;
  const isDraft = label.toLowerCase().includes("draft");
  const statusColors = getStatusColors(label);

  const hasMetrics = study.metrics && study.metrics.length > 0;
  const hasHealthConditions = study.healthConditions && study.healthConditions.length > 0;
  const hasTags = study.tags && study.tags.length > 0;
  const hasPills = hasMetrics || hasHealthConditions || hasTags;

  return (
    <div style={webStyles.card}>
      {/* Red gradient header with title + status badge */}
      <div style={webStyles.header}>
        <div style={webStyles.headerLeft as any}>
          <p style={webStyles.headerTitle}>{study.title}</p>
          <p style={webStyles.headerOrganizer}>{study.organizer}</p>
        </div>
        <span
          style={{
            ...webStyles.statusBadge,
            backgroundColor: statusColors.bg,
            color: statusColors.color,
          }}
        >
          <span style={{ ...webStyles.statusDot, backgroundColor: statusColors.dot }} />
          {label}
        </span>
      </div>

      {/* Card body */}
      <div style={webStyles.body}>
        {/* Description */}
        <p style={webStyles.description}>
          {study.description || study.summary || "—"}
        </p>

        {/* Stat boxes */}
        <div style={webStyles.statsRow}>
          <div style={webStyles.statBox}>
            <span style={webStyles.statValue}>{study.rewardTypeDisplayName ?? "—"}</span>
            <span style={webStyles.statLabel}>Reward</span>
          </div>
          <div style={webStyles.statBox}>
            <span style={webStyles.statValue}>
              {study.dataCoverageDaysRequired != null ? `${study.dataCoverageDaysRequired}d` : "—"}
            </span>
            <span style={webStyles.statLabel}>Duration</span>
          </div>
          <div style={webStyles.statBox}>
            <span style={webStyles.statValue}>
              {study.minAge != null ? `${study.minAge}+` : "—"}
            </span>
            <span style={webStyles.statLabel}>Min Age</span>
          </div>
          <div style={webStyles.statBox}>
            <span style={webStyles.statValue}>{formatShortDate(study.applyCloseAt)}</span>
            <span style={webStyles.statLabel}>Apply By</span>
          </div>
        </div>

        {/* Metric / Health Condition / Tag pills */}
        {hasPills && (
          <div style={webStyles.pillsSection}>
            {hasMetrics && (
              <div>
                <p style={webStyles.pillsLabel}>Tracked Metrics</p>
                <div style={webStyles.pillsRow}>
                  {study.metrics.map((m) => (
                    <span key={m.id} style={{ ...webStyles.pill, ...webStyles.metricPill }}>
                      {m.displayName}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {hasHealthConditions && (
              <div>
                <p style={webStyles.pillsLabel}>Health Conditions</p>
                <div style={webStyles.pillsRow}>
                  {study.healthConditions.map((hc) => (
                    <span key={hc.id} style={{ ...webStyles.pill, ...webStyles.healthPill }}>
                      {hc.displayName}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {hasTags && (
              <div>
                <p style={webStyles.pillsLabel}>Tags</p>
                <div style={webStyles.pillsRow}>
                  {study.tags.map((tag, i) => (
                    <span key={`${tag}-${i}`} style={{ ...webStyles.pill, ...webStyles.tagPill }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div style={webStyles.actionsRow}>
          <button style={webStyles.btnGhost} onClick={handleManagePress}>
            {isDraft ? "Publish" : "Manage"}
          </button>
          <button style={webStyles.btnPrimary} onClick={handleViewPress}>
            View Study
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Native component ─────────────────────────────────────────────────────────
const StudyCardNative: React.FC<StudyCardProps> = ({ study, statusLabel, onPress }) => {
  const router = useRouter();

  const handleViewPress = () => {
    if (onPress) return onPress();
    router.push({ pathname: "/studies/[studyId]", params: { studyId: String(study.id) } });
  };

  const handleManagePress = () => {
    router.push({ pathname: "/studies/[studyId]/manage", params: { studyId: study.id } });
  };

  const label = statusLabel ?? study.statusDisplayName ?? `Status ${study.statusId}`;
  const statusColors = getStatusColors(label);
  const hasMetrics = study.metrics && study.metrics.length > 0;
  const hasHealthConditions = study.healthConditions && study.healthConditions.length > 0;
  const hasTags = study.tags && study.tags.length > 0;

  return (
    <View style={nativeStyles.studyCard}>
      {/* Header with title + status */}
      <View style={nativeStyles.headerBar}>
        <View style={nativeStyles.headerLeft}>
          <Text style={nativeStyles.title} numberOfLines={2}>{study.title}</Text>
          <Text style={nativeStyles.organizer}>{study.organizer}</Text>
        </View>
        <View style={[nativeStyles.badge, { backgroundColor: statusColors.bg }]}>
          <View style={[nativeStyles.badgeDot, { backgroundColor: statusColors.dot }]} />
          <Text style={[nativeStyles.badgeText, { color: statusColors.color }]}>{label}</Text>
        </View>
      </View>

      {/* Description */}
      <Text style={nativeStyles.description} numberOfLines={2}>{study.description || study.summary}</Text>

      {/* Stat row */}
      <View style={nativeStyles.statsRow}>
        <View style={nativeStyles.statBox}>
          <Text style={nativeStyles.statValue}>{study.rewardTypeDisplayName ?? "—"}</Text>
          <Text style={nativeStyles.statLabel}>Reward</Text>
        </View>
        <View style={nativeStyles.statBox}>
          <Text style={nativeStyles.statValue}>
            {study.dataCoverageDaysRequired != null ? `${study.dataCoverageDaysRequired}d` : "—"}
          </Text>
          <Text style={nativeStyles.statLabel}>Duration</Text>
        </View>
        <View style={nativeStyles.statBox}>
          <Text style={nativeStyles.statValue}>
            {study.minAge != null ? `${study.minAge}+` : "—"}
          </Text>
          <Text style={nativeStyles.statLabel}>Min Age</Text>
        </View>
      </View>

      {/* Metric pills */}
      {hasMetrics && (
        <View style={nativeStyles.pillsSection}>
          <Text style={nativeStyles.pillsLabel}>Metrics</Text>
          <View style={nativeStyles.pillsRow}>
            {study.metrics.map((m) => (
              <View key={m.id} style={nativeStyles.metricPill}>
                <Text style={nativeStyles.metricPillText}>{m.displayName}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Health condition pills */}
      {hasHealthConditions && (
        <View style={nativeStyles.pillsSection}>
          <Text style={nativeStyles.pillsLabel}>Health Conditions</Text>
          <View style={nativeStyles.pillsRow}>
            {study.healthConditions.map((hc) => (
              <View key={hc.id} style={nativeStyles.healthPill}>
                <Text style={nativeStyles.healthPillText}>{hc.displayName}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Tag pills */}
      {hasTags && (
        <View style={nativeStyles.pillsSection}>
          <Text style={nativeStyles.pillsLabel}>Tags</Text>
          <View style={nativeStyles.pillsRow}>
            {study.tags.map((tag, i) => (
              <View key={`${tag}-${i}`} style={nativeStyles.tagPill}>
                <Text style={nativeStyles.tagPillText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Actions */}
      <View style={nativeStyles.actionsContainer}>
        <TouchableOpacity
          style={[nativeStyles.btn, nativeStyles.btnGhost]}
          onPress={handleManagePress}
        >
          <Text style={nativeStyles.btnTextGhost}>
            {label.toLowerCase().includes("draft") ? "Publish" : "Manage"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[nativeStyles.btn, nativeStyles.btnPrimary]}
          onPress={handleViewPress}
        >
          <Text style={nativeStyles.btnTextPrimary}>View</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── Exported component ───────────────────────────────────────────────────────
const StudyCard: React.FC<StudyCardProps> = (props) => {
  if (Platform.OS === "web") return <StudyCardWeb {...props} />;
  return <StudyCardNative {...props} />;
};

const nativeStyles = StyleSheet.create({
  studyCard: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    marginVertical: 6,
    marginHorizontal: 16,
    shadowColor: Colors.light.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#EBEBEB",
    overflow: "hidden",
  },
  headerBar: {
    backgroundColor: "#B22222",
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  headerLeft: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  organizer: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    marginTop: 2,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  description: {
    fontSize: 13,
    color: palette.light.text.secondary,
    lineHeight: 18,
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#F9F9FB",
    borderRadius: 8,
    padding: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  statValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "500",
    color: "#888888",
    textTransform: "uppercase",
    marginTop: 2,
  },
  pillsSection: {
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  pillsLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#888888",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  pillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  metricPill: {
    backgroundColor: "rgba(178, 34, 34, 0.08)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  metricPillText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#B22222",
  },
  healthPill: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  healthPillText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#1E40AF",
  },
  tagPill: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  tagPillText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#374151",
  },
  actionsContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: 14,
    paddingTop: 12,
    gap: 8,
  },
  btn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  btnPrimary: { backgroundColor: Colors.light.tint },
  btnTextPrimary: { color: palette.light.text.inverse, fontWeight: "600", fontSize: 13 },
  btnGhost: { borderWidth: 1, borderColor: Colors.light.tint, backgroundColor: "transparent" },
  btnTextGhost: { color: Colors.light.tint, fontWeight: "600", fontSize: 13 },
});

export default StudyCard;
