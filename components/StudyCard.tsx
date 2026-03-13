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
// Returns solid, high-contrast colors for white backgrounds.
function getStatusColors(label: string): { bg: string; color: string; dot: string } {
  const l = (label ?? "").toLowerCase();
  if (l.includes("open") || l.includes("active") || l.includes("recruit") || l.includes("live"))
    return { bg: "#DCFCE7", color: "#15803D", dot: "#16A34A" };         // green
  if (l.includes("draft") || l.includes("pending") || l.includes("review"))
    return { bg: "#FEF9C3", color: "#854D0E", dot: "#CA8A04" };         // amber
  if (l.includes("clos") || l.includes("complet") || l.includes("ended") || l.includes("inactiv"))
    return { bg: "#FEE2E2", color: "#991B1B", dot: "#DC2626" };         // red
  if (l.includes("paus") || l.includes("hold"))
    return { bg: "#DBEAFE", color: "#1E40AF", dot: "#2563EB" };         // blue
  return { bg: "#F3F4F6", color: "#374151", dot: "#6B7280" };           // gray
}

// ─── Web styles ───────────────────────────────────────────────────────────────
const webStyles: Record<string, React.CSSProperties> = {
  // Horizontal row — no gradient header
  row: {
    display: "grid",
    gridTemplateColumns: "repeat(12, 1fr)" as any,
    gap: "0 16px",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    border: "1px solid #EBEBEB",
    padding: "16px 20px",
    marginBottom: 10,
    boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
  },
  // Left: title + organizer (5 cols)
  titleCol: {
    gridColumn: "span 5" as any,
    display: "flex",
    flexDirection: "column",
    gap: 4,
    minWidth: 0,
  },
  title: {
    fontFamily: "Barlow, sans-serif",
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A1A",
    margin: 0,
    whiteSpace: "nowrap" as any,
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  organizer: {
    fontFamily: "Barlow, sans-serif",
    fontSize: 12,
    fontWeight: "500",
    color: "#888888",
    margin: 0,
    whiteSpace: "nowrap" as any,
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  // Middle: status badge (2 cols)
  statusCol: {
    gridColumn: "span 2" as any,
    display: "flex",
    justifyContent: "center",
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
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: "50%" as any,
    flexShrink: 0,
    display: "inline-block",
  },
  // Description snippet (3 cols)
  descCol: {
    gridColumn: "span 3" as any,
    fontFamily: "Barlow, sans-serif",
    fontSize: 13,
    color: "#666666",
    lineHeight: 1.5,
    overflow: "hidden",
    display: "-webkit-box" as any,
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical" as any,
  },
  // Actions (2 cols)
  actionsCol: {
    gridColumn: "span 2" as any,
    display: "flex",
    flexDirection: "column",
    gap: 6,
    alignItems: "stretch",
  },
  btnPrimary: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "7px 12px",
    borderRadius: 8,
    border: "none",
    backgroundColor: "#B22222",
    fontFamily: "Barlow, sans-serif",
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
    cursor: "pointer",
    boxShadow: "0 2px 6px rgba(178,34,34,0.2)",
  },
  btnGhost: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "7px 12px",
    borderRadius: 8,
    border: "1.5px solid #B22222",
    backgroundColor: "transparent",
    fontFamily: "Barlow, sans-serif",
    fontSize: 12,
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

  const label = statusLabel ?? `Status ${study.statusId}`;
  const isDraft = label.toLowerCase().includes("draft");
  const statusColors = getStatusColors(label);

  return (
    <div style={webStyles.row as any}>
      {/* Title + organizer (5 cols) */}
      <div style={webStyles.titleCol as any}>
        <p style={webStyles.title}>{study.title}</p>
        <p style={webStyles.organizer}>{study.organizer}</p>
      </div>

      {/* Status badge (2 cols) */}
      <div style={webStyles.statusCol as any}>
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

      {/* Description snippet (3 cols) */}
      <p style={webStyles.descCol as any}>
        {study.description || study.summary || "—"}
      </p>

      {/* Actions (2 cols) */}
      <div style={webStyles.actionsCol as any}>
        <button style={webStyles.btnPrimary} onClick={handleViewPress}>
          View Study
        </button>
        <button style={webStyles.btnGhost} onClick={handleManagePress}>
          {isDraft ? "Publish" : "Manage"}
        </button>
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

  return (
    <View style={nativeStyles.studyCard}>
      <View style={nativeStyles.header}>
        <Text style={nativeStyles.title} numberOfLines={2}>{study.title}</Text>
        <View style={nativeStyles.badge}>
          <Text style={nativeStyles.badgeText}>
            {statusLabel ?? `Status ${study.statusId}`}
          </Text>
        </View>
      </View>

      <Text style={nativeStyles.organizer}>{study.organizer}</Text>
      <Text style={nativeStyles.description} numberOfLines={2}>{study.description}</Text>

      <View style={nativeStyles.actionsContainer}>
        <TouchableOpacity
          style={[nativeStyles.btn, nativeStyles.btnGhost]}
          onPress={handleManagePress}
        >
          <Text style={nativeStyles.btnTextGhost}>
            {(statusLabel ?? "").toLowerCase().includes("draft") ? "Publish" : "Manage"}
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
    borderRadius: 8,
    padding: 16,
    marginVertical: 6,
    marginHorizontal: 16,
    shadowColor: Colors.light.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#EBEBEB",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.text,
    flex: 1,
  },
  badge: {
    backgroundColor: palette.light.surface,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: palette.light.text.secondary,
  },
  organizer: {
    fontSize: 12,
    color: palette.light.text.secondary,
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    color: palette.light.text.secondary,
    lineHeight: 18,
  },
  actionsContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 12,
    gap: 8,
  },
  btn: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  btnPrimary: { backgroundColor: Colors.light.tint },
  btnTextPrimary: { color: palette.light.text.inverse, fontWeight: "600", fontSize: 13 },
  btnGhost: { borderWidth: 1, borderColor: Colors.light.tint, backgroundColor: "transparent" },
  btnTextGhost: { color: Colors.light.tint, fontWeight: "600", fontSize: 13 },
});

export default StudyCard;
