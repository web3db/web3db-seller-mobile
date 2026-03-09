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

// ─── Web styles ──────────────────────────────────────────────────────────────
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
    padding: 28,
    paddingBottom: 24,
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: 12,
  },
  cardTitle: {
    fontFamily: "Barlow, sans-serif",
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    lineHeight: 1.3,
    flex: 1,
    minWidth: 200,
  },
  statusBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    backdropFilter: "blur(8px)",
    padding: "6px 14px",
    borderRadius: 20,
    fontFamily: "Barlow, sans-serif",
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
    flexShrink: 0,
    whiteSpace: "nowrap",
  },
  cardBody: {
    padding: 28,
  },
  description: {
    fontFamily: "Barlow, sans-serif",
    fontSize: 15,
    fontWeight: "400",
    color: "#444444",
    lineHeight: 1.7,
    marginBottom: 20,
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" as any,
    gap: 16,
    marginBottom: 20,
  },
  statBox: {
    display: "flex",
    flexDirection: "column",
    padding: 16,
    backgroundColor: "#F9F9FB",
    borderRadius: 12,
    border: "1px solid rgba(0, 0, 0, 0.04)",
  },
  statLabel: {
    fontFamily: "Barlow, sans-serif",
    fontSize: 11,
    fontWeight: "600",
    color: "#888888",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom: 6,
  },
  statValue: {
    fontFamily: "Barlow, sans-serif",
    fontSize: 17,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  secureMuted: {
    fontFamily: "Barlow, sans-serif",
    fontSize: 12,
    color: "#888888",
    fontStyle: "italic",
    marginBottom: 24,
  },
  divider: {
    height: 1,
    backgroundColor: "#EEEEEE",
    marginBottom: 20,
  },
  footer: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    flexWrap: "wrap",
  },
  btnGhost: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "9px 22px",
    borderRadius: 10,
    border: "2px solid #B22222",
    backgroundColor: "transparent",
    fontFamily: "Barlow, sans-serif",
    fontSize: 14,
    fontWeight: "600",
    color: "#B22222",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  btnPrimary: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "9px 22px",
    borderRadius: 10,
    border: "none",
    backgroundColor: "#B22222",
    fontFamily: "Barlow, sans-serif",
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(178, 34, 34, 0.3)",
    transition: "all 0.2s ease",
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

  const isDraft = (statusLabel ?? "").toLowerCase().includes("draft");

  return (
    <div style={webStyles.card}>
      <div style={webStyles.cardHeader}>
        <span style={webStyles.cardTitle}>{study.title}</span>
        <span style={webStyles.statusBadge}>
          ● {statusLabel ?? `Status ${study.statusId}`}
        </span>
      </div>

      <div style={webStyles.cardBody}>
        <p style={webStyles.description}>{study.description || study.summary}</p>

        <div style={webStyles.statsGrid as any}>
          <div style={webStyles.statBox}>
            <span style={webStyles.statLabel}>Organizer</span>
            <span style={webStyles.statValue}>{study.organizer}</span>
          </div>
          <div style={webStyles.statBox}>
            <span style={webStyles.statLabel}>Open Spots</span>
            <span style={webStyles.statValue}>{study.spots}</span>
          </div>
        </div>

        <p style={webStyles.secureMuted}>
          Data shared will be de-identified and transferred over secure channels; contributors must consent.
        </p>

        <div style={webStyles.divider} />

        <div style={webStyles.footer}>
          <button style={webStyles.btnGhost} onClick={handleManagePress}>
            {isDraft ? "Publish" : "Manage Study"}
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
