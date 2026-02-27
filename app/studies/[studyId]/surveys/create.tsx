import React, { useState } from "react";
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
import { surveyCreate } from "../../../services/surveys/api";

declare const __DEV__: boolean;

/**
 * Validates a Google pre-filled URL:
 * - Must be a valid URL
 * - Hostname must be docs.google.com
 * - Must have exactly one entry.<digits> param
 */
function validatePrefillUrl(url: string): string | null {
  if (!url.trim()) return "URL is required.";
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return "Must be a valid URL (e.g. https://docs.google.com/forms/…).";
  }
  if (parsed.hostname !== "docs.google.com") {
    return "URL must be from docs.google.com.";
  }
  const entryMatches = url.match(/entry\.\d+/g) ?? [];
  if (entryMatches.length === 0) {
    return "URL must include at least one pre-filled entry parameter (e.g. entry.123456789=PARTICIPANT_ID).";
  }
  if (entryMatches.length > 1) {
    return "URL must include exactly one Participant ID entry field — multiple entry.* params found.";
  }
  return null;
}

export default function CreateSurveyPage() {
  const { studyId } = useLocalSearchParams() as { studyId?: string };
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isNarrow = width < 720;

  const [title, setTitle] = useState("");
  const [prefillUrl, setPrefillUrl] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const [titleError, setTitleError] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function validate(): boolean {
    let ok = true;
    if (!title.trim()) {
      setTitleError("Survey title is required.");
      ok = false;
    } else if (title.trim().length > 200) {
      setTitleError("Title must be 200 characters or fewer.");
      ok = false;
    } else {
      setTitleError(null);
    }
    const urlErr = validatePrefillUrl(prefillUrl);
    setUrlError(urlErr);
    if (urlErr) ok = false;
    return ok;
  }

  function handleCreate() {
    if (!validate()) return;
    setShowModal(true);
  }

  async function handleConfirm() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await surveyCreate({
        posting_id: Number(studyId),
        title: title.trim(),
        google_prefilled_url: prefillUrl.trim(),
      });
      setShowModal(false);
      router.push(`/studies/${studyId}/surveys/${res.survey.survey_id}`);
    } catch (e: any) {
      setSubmitError(e?.message ?? "Failed to create survey");
      setShowModal(false);
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit =
    title.trim().length > 0 &&
    prefillUrl.trim().length > 0 &&
    confirmed &&
    !submitting;

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Create Survey</Text>
          <Text style={styles.breadcrumb}>
            Study #{studyId} › Surveys › Create
          </Text>
        </View>

        {/* Instruction Section */}
        <View style={styles.card}>
          <Text style={styles.instructionHeading}>
            How to set up your Google Form survey
          </Text>
          {[
            {
              step: "1",
              text: 'Open your Google Form and add a "Short answer" question titled Participant ID. Mark it as Required.',
            },
            {
              step: "2",
              text: 'Click the three-dot menu in the top right → "Get pre-filled link". Fill in a placeholder value (e.g. TEST) for the Participant ID question.',
            },
            {
              step: "3",
              text: 'Click "Get Link" and copy the URL — it will contain entry.XXXXXXXXX=TEST in the query string.',
            },
            {
              step: "4",
              text: "Paste that URL below. When a survey is dispatched, the placeholder will be replaced with each participant's unique pseudonymous ID.",
            },
            {
              step: "⚠",
              text: "Only one Participant ID entry field is supported. Do not use the same form for multiple separate participant identifiers.",
            },
          ].map((item) => (
            <View key={item.step} style={styles.instructionRow}>
              <View style={styles.instructionStepBubble}>
                <Text style={styles.instructionStepText}>{item.step}</Text>
              </View>
              <Text style={styles.instructionText}>{item.text}</Text>
            </View>
          ))}
        </View>

        {/* Form */}
        <View style={[styles.card, isNarrow ? null : styles.formCardWide]}>
          <Text style={styles.formSectionTitle}>Survey Details</Text>

          {/* Title Field */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              Survey Title <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, titleError ? styles.inputError : null]}
              placeholder="e.g. Week 1 Wellbeing Check-in"
              placeholderTextColor={palette.light.text.muted}
              value={title}
              onChangeText={(t) => {
                setTitle(t);
                if (titleError) setTitleError(null);
              }}
              maxLength={200}
            />
            {titleError && (
              <Text style={styles.fieldError}>{titleError}</Text>
            )}
            <Text style={styles.fieldHint}>
              {title.length}/200 characters
            </Text>
          </View>

          {/* Prefill URL Field */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              Google Pre-filled URL <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.inputMultiline,
                urlError ? styles.inputError : null,
              ]}
              placeholder="https://docs.google.com/forms/d/e/.../viewform?usp=pp_url&entry.123456789=TEST"
              placeholderTextColor={palette.light.text.muted}
              value={prefillUrl}
              onChangeText={(t) => {
                setPrefillUrl(t);
                if (urlError) setUrlError(null);
              }}
              multiline
              numberOfLines={3}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {urlError && <Text style={styles.fieldError}>{urlError}</Text>}
            {!urlError && prefillUrl.trim().length > 0 && (
              <Text style={styles.fieldSuccess}>
                ✓ URL looks valid
              </Text>
            )}
          </View>

          {/* Compliance Checkbox */}
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setConfirmed((c) => !c)}
          >
            <View
              style={[
                styles.checkbox,
                confirmed && styles.checkboxChecked,
              ]}
            >
              {confirmed && <Text style={styles.checkboxMark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>
              I confirm that my Google Form includes a required{" "}
              <Text style={{ fontWeight: "700" }}>Participant ID</Text> field
              and that I generated this link using the{" "}
              <Text style={{ fontStyle: "italic" }}>
                "Get pre-filled link"
              </Text>{" "}
              option in Google Forms.
            </Text>
          </TouchableOpacity>

          {/* Submit Error */}
          {submitError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{submitError}</Text>
            </View>
          )}

          {/* Buttons */}
          <View style={styles.formActions}>
            <TouchableOpacity
              style={[
                styles.btnPrimary,
                !canSubmit && styles.btnDisabled,
              ]}
              onPress={handleCreate}
              disabled={!canSubmit}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.btnPrimaryText}>Create Survey</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnGhost}
              onPress={() => router.push(`/studies/${studyId}/surveys`)}
            >
              <Text style={styles.btnGhostText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Back */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.push(`/studies/${studyId}/surveys`)}
        >
          <Text style={styles.backBtnText}>← Back to Surveys</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Confirm Create Survey</Text>
            <Text style={styles.modalBody}>
              You are about to create a new survey:
            </Text>
            <View style={styles.modalDetail}>
              <Text style={styles.modalDetailLabel}>Title</Text>
              <Text style={styles.modalDetailValue}>{title.trim()}</Text>
            </View>
            <View style={styles.modalDetail}>
              <Text style={styles.modalDetailLabel}>Study</Text>
              <Text style={styles.modalDetailValue}>#{studyId}</Text>
            </View>
            <Text style={styles.modalNote}>
              The Google Form URL will be stored and used to generate
              personalised links for each participant when you dispatch.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.btnPrimary}
                onPress={handleConfirm}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.btnPrimaryText}>Yes, Create</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnGhost}
                onPress={() => setShowModal(false)}
                disabled={submitting}
              >
                <Text style={styles.btnGhostText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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

  pageHeader: { gap: 4 },
  pageTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: Colors.light.text,
  },
  breadcrumb: { fontSize: 13, color: palette.light.text.muted },

  card: {
    backgroundColor: Colors.light.background,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: palette.light.border,
    gap: 16,
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
  formCardWide: { maxWidth: 640, alignSelf: "flex-start", width: "100%" },

  instructionHeading: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.text,
    marginBottom: 4,
  },
  instructionRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  instructionStepBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: palette.light.primary,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  instructionStepText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    color: Colors.light.text,
    lineHeight: 20,
  },

  formSectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.light.text,
  },
  fieldGroup: { gap: 6 },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.text,
  },
  required: { color: palette.light.primary },
  input: {
    borderWidth: 1,
    borderColor: palette.light.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.light.text,
    backgroundColor: Colors.light.background,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  inputError: { borderColor: "#EF4444" },
  fieldError: { fontSize: 13, color: "#EF4444" },
  fieldSuccess: { fontSize: 13, color: "#16A34A" },
  fieldHint: { fontSize: 12, color: palette.light.text.muted },

  checkboxRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    backgroundColor: palette.light.surface,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.light.border,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: palette.light.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: palette.light.primary,
    borderColor: palette.light.primary,
  },
  checkboxMark: { color: "#fff", fontSize: 13, fontWeight: "700" },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    color: Colors.light.text,
    lineHeight: 20,
  },

  formActions: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
    marginTop: 4,
  },
  btnPrimary: {
    backgroundColor: palette.light.primary,
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
  },
  btnPrimaryText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  btnDisabled: { opacity: 0.45 },
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

  errorBanner: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 8,
    padding: 12,
  },
  errorText: { color: "#DC2626", fontSize: 14 },

  backBtn: { alignSelf: "flex-start", paddingVertical: 8 },
  backBtnText: { fontSize: 14, color: palette.light.text.muted, fontWeight: "600" },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: Colors.light.background,
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 480,
    gap: 14,
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
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.light.text,
  },
  modalBody: { fontSize: 14, color: palette.light.text.secondary },
  modalDetail: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: palette.light.surface,
    padding: 12,
    borderRadius: 8,
  },
  modalDetailLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: palette.light.text.muted,
    width: 48,
  },
  modalDetailValue: {
    flex: 1,
    fontSize: 13,
    color: Colors.light.text,
  },
  modalNote: {
    fontSize: 13,
    color: palette.light.text.muted,
    lineHeight: 18,
  },
  modalActions: { flexDirection: "row", gap: 10 },
});
