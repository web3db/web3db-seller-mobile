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

// ─── Status badge color helper ────────────────────────────────────────────────
function getStatusColors(label: string): { bg: string; color: string; dot: string } {
  const l = (label ?? "").toLowerCase();
  if (l.includes("open") || l.includes("active") || l.includes("recruit") || l.includes("live"))
    return { bg: "rgba(22, 163, 74, 0.12)", color: "#15803d", dot: "#16a34a" };
  if (l.includes("draft") || l.includes("pending") || l.includes("review"))
    return { bg: "rgba(202, 138, 4, 0.12)", color: "#92400e", dot: "#d97706" };
  if (l.includes("clos") || l.includes("complet") || l.includes("ended") || l.includes("inactiv"))
    return { bg: "rgba(220, 38, 38, 0.12)", color: "#991b1b", dot: "#dc2626" };
  if (l.includes("paus") || l.includes("hold"))
    return { bg: "rgba(37, 99, 235, 0.12)", color: "#1e40af", dot: "#2563eb" };
  return { bg: "rgba(107, 114, 128, 0.12)", color: "#374151", dot: "#6b7280" };
}

// ─── Web styles ───────────────────────────────────────────────────────────────
const webStyles: Record<string, React.CSSProperties> = {
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    boxShadow: "0 8px 40px rgba(0, 0, 0, 0.08)",
    overflow: "hidden",
    border: "1px solid rgba(0, 0, 0, 0.04)",
    marginBottom: 24,
  },
  cardHeader: {
    background: "linear-gradient(135deg, #C62828 0%, #8B0000 100%)",
    padding: "24px 28px",
  },
  cardTitle: {
    fontFamily: "Barlow, sans-serif",
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    lineHeight: 1.3,
    margin: 0,
  },
  cardBody: {
    padding: 28,
  },
  // 12-column grid: description (left) + actions (right)
  bodyGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(12, 1fr)" as any,
    gap: "0 32px",
    alignItems: "start",
  },
  leftCol: {
    gridColumn: "span 8" as any,
  },
  rightCol: {
    gridColumn: "span 4" as any,
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 12,
  },
  statusBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "5px 12px",
    borderRadius: 20,
    fontFamily: "Barlow, sans-serif",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 14,
    width: "fit-content",
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: "50%" as any,
    flexShrink: 0,
  },
  description: {
    fontFamily: "Barlow, sans-serif",
    fontSize: 15,
    fontWeight: "400",
    color: "#444444",
    lineHeight: 1.7,
    margin: 0,
    marginBottom: 16,
  },
  organizerRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  organizerLabel: {
    fontFamily: "Barlow, sans-serif",
    fontSize: 12,
    fontWeight: "600",
    color: "#888888",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  organizerValue: {
    fontFamily: "Barlow, sans-serif",
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  secureMuted: {
    fontFamily: "Barlow, sans-serif",
    fontSize: 12,
    color: "#aaaaaa",
    fontStyle: "italic",
    marginTop: 10,
  },
  btnGhost: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "9px 20px",
    borderRadius: 10,
    border: "2px solid #B22222",
    backgroundColor: "transparent",
    fontFamily: "Barlow, sans-serif",
    fontSize: 14,
    fontWeight: "600",
    color: "#B22222",
    cursor: "pointer",
    width: "100%",
    boxSizing: "border-box",
  },
  btnPrimary: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "9px 20px",
    borderRadius: 10,
    border: "none",
    backgroundColor: "#B22222",
    fontFamily: "Barlow, sans-serif",
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(178, 34, 34, 0.3)",
    width: "100%",
    boxSizing: "border-box",
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
    <div style={webStyles.card}>
      {/* Gradient header — title only */}
      <div style={webStyles.cardHeader}>
        <p style={webStyles.cardTitle}>{study.title}</p>
      </div>

      {/* Body — 12-col grid */}
      <div style={webStyles.cardBody}>
        {/* Color-coded status badge */}
        <div
          style={{
            ...webStyles.statusBadge,
            backgroundColor: statusColors.bg,
            color: statusColors.color,
          }}
        >
          <span style={{ ...webStyles.statusDot, backgroundColor: statusColors.dot }} />
          {label}
        </div>

        <div style={webStyles.bodyGrid as any}>
          {/* Left 8 cols: description + organizer */}
          <div style={webStyles.leftCol as any}>
            <p style={webStyles.description}>{study.description || study.summary}</p>

            <div style={webStyles.organizerRow}>
              <span style={webStyles.organizerLabel}>Organizer</span>
              <span style={webStyles.organizerValue}>{study.organizer}</span>
            </div>

            <p style={webStyles.secureMuted}>
              Data shared will be de-identified and transferred over secure channels.
            </p>
          </div>

          {/* Right 4 cols: action buttons */}
          <div style={webStyles.rightCol as any}>
            <button style={webStyles.btnGhost} onClick={handleManagePress}>
              {isDraft ? "Publish" : "Manage Study"}
            </button>
            <button style={webStyles.btnPrimary} onClick={handleViewPress}>
              View Study
            </button>
          </div>
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

  return (
    <View style={nativeStyles.studyCard}>
      <View style={nativeStyles.header}>
        <Text style={nativeStyles.title}>{study.title}</Text>
        <View style={nativeStyles.badge}>
          <Text style={nativeStyles.badgeText}>
            {statusLabel ?? `Status ${study.statusId}`}
          </Text>
        </View>
      </View>

      <Text style={nativeStyles.description}>{study.description}</Text>

      <Text style={nativeStyles.secureMuted}>
        Data shared will be de-identified and transferred over secure channels;
        contributors must consent.
      </Text>

      <View style={nativeStyles.metaContainer}>
        <Text style={nativeStyles.metaText}>
          Organizer: <Text style={nativeStyles.boldText}>{study.organizer}</Text>
        </Text>
      </View>

      <View style={nativeStyles.actionsContainer}>
        <TouchableOpacity
          style={[nativeStyles.btn, nativeStyles.btnGhost]}
          onPress={handleManagePress}
        >
          <Text style={nativeStyles.btnTextGhost}>
            {(statusLabel ?? "").toLowerCase().includes("draft") ? "Publish" : "Manage Study"}
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
    marginVertical: 8,
    marginHorizontal: 16,
    shadowColor: Colors.light.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.light.text,
    flex: 1,
    marginRight: 8,
  },
  badge: {
    backgroundColor: palette.light.surface,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: palette.light.text.secondary,
  },
  description: {
    fontSize: 14,
    color: palette.light.text.secondary,
    lineHeight: 20,
  },
  secureMuted: {
    fontSize: 12,
    color: palette.light.text.muted,
    fontStyle: "italic",
    marginTop: 12,
  },
  metaContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: palette.light.border,
    paddingTop: 12,
  },
  metaText: {
    fontSize: 14,
    color: palette.light.text.secondary,
  },
  boldText: {
    fontWeight: "bold",
  },
  actionsContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 16,
    gap: 10,
  },
  btn: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  btnPrimary: {
    backgroundColor: Colors.light.tint,
  },
  btnTextPrimary: {
    color: palette.light.text.inverse,
    fontWeight: "bold",
  },
  btnGhost: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: Colors.light.tint,
  },
  btnTextGhost: {
    color: Colors.light.tint,
    fontWeight: "bold",
  },
});

export default StudyCard;
