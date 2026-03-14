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
import { surveyCreate, surveyEmailPreview } from "../../../services/surveys/api";
import type { EmailPreviewResponse } from "../../../services/surveys/types";

declare const __DEV__: boolean;

function validatePrefillUrl(url: string): string | null {
  if (!url.trim()) return "URL is required.";
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return "Please enter a valid URL.";
  }
  if (parsed.protocol !== 'https:') {
    return "URL must use HTTPS.";
  }
  const params = Array.from(parsed.searchParams.entries());
  if (params.length === 0) {
    return "URL must contain at least one query parameter for participant identification.";
  }
  return null;
}

export default function SurveyCreatePage() {
  const { studyId } = useLocalSearchParams() as { studyId?: string };
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isNarrow = width < 720;

  // Form fields
  const [title, setTitle] = useState("");
  const [paramUrl, setParamUrl] = useState("");

  // Email options (display-only during create, saved later during send)
  const [includeMessage, setIncludeMessage] = useState(false);
  const [messageText, setMessageText] = useState("");

  // Compliance
  const [complianceChecked, setComplianceChecked] = useState(false);

  // Confirmation modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Email preview state
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [preview, setPreview] = useState<EmailPreviewResponse | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);

  // Inline form validation errors
  const [titleError, setTitleError] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);

  function validateForm(): boolean {
    let valid = true;

    if (!title.trim()) {
      setTitleError("Survey title is required.");
      valid = false;
    } else {
      setTitleError(null);
    }

    const urlErr = validatePrefillUrl(paramUrl);
    if (urlErr) {
      setUrlError(urlErr);
      valid = false;
    } else {
      setUrlError(null);
    }

    return valid;
  }

  function handleOpenModal() {
    if (!validateForm()) return;
    if (!complianceChecked) return;
    setModalError(null);
    setModalVisible(true);
  }

  async function handleConfirm() {
    if (!studyId) {
      setModalError("Study ID is missing. Please go back and try again.");
      return;
    }

    const postingId = parseInt(studyId ?? '', 10);
    if (isNaN(postingId)) {
      setModalError("Invalid study ID");
      return;
    }

    setSubmitting(true);
    setModalError(null);

    try {
      const res = await surveyCreate({
        posting_id: postingId,
        title: title.trim(),
        parameterized_form_url: paramUrl.trim(),
      });

      setModalVisible(false);
      router.push(`/studies/${studyId}/surveys/${res.survey.survey_id}`);
    } catch (e: any) {
      // Show error inside modal — do NOT close modal on error
      setModalError(e?.message ?? "Failed to create survey. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEmailPreview() {
    setPreviewLoading(true);
    setPreviewError(null);
    setPreview(null);

    try {
      const res = await surveyEmailPreview({
        survey_title: title.trim() || undefined,
        form_url: paramUrl.trim() || undefined,
        include_message: includeMessage,
        message_text: includeMessage && messageText.trim() ? messageText.trim() : undefined,
      });
      setPreview(res);
      setPreviewVisible(true);
    } catch (e: any) {
      setPreviewError(e?.message ?? "Failed to load email preview.");
    } finally {
      setPreviewLoading(false);
    }
  }

  const canSubmit =
    title.trim().length > 0 &&
    validatePrefillUrl(paramUrl) === null &&
    complianceChecked;

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={[styles.container, isNarrow && styles.containerNarrow]} keyboardShouldPersistTaps="handled">

        {/* Page Header */}
        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.pageTitle}>Create Survey</Text>
            <Text style={styles.breadcrumb}>
              Study #{studyId} › Surveys › Create
            </Text>
          </View>
        </View>

        {/* Instructions Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoCardTitle}>How to set up your parameterized form</Text>
          <Text style={styles.infoCardBody}>
            1. Open your survey form and navigate to the response collection settings.{"\n"}
            2. Use your form provider's "pre-filled link" or "parameterized URL" feature to create a link that pre-fills the Participant ID field.{"\n"}
            3. Replace the placeholder value in the generated URL with{" "}
            <Text style={styles.codeInline}>PARTICIPANT_ID</Text> so it reads something like{" "}
            <Text style={styles.codeInline}>entry.123456789=PARTICIPANT_ID</Text>.{"\n"}
            4. Paste that complete parameterized form URL below.
          </Text>
        </View>

        {/* Main Form Card */}
        <View style={styles.card}>

          {/* Survey Title */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              Survey Title <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, !!titleError && styles.inputError]}
              placeholder="e.g. Week 4 Check-In Survey"
              placeholderTextColor={palette.light.text.muted}
              value={title}
              onChangeText={(v) => {
                setTitle(v);
                if (titleError && v.trim()) setTitleError(null);
              }}
              returnKeyType="next"
              autoCapitalize="words"
              maxLength={255}
            />
            {titleError && <Text style={styles.fieldError}>{titleError}</Text>}
          </View>

          {/* Parameterized Form URL */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              Parameterized Form URL <Text style={styles.required}>*</Text>
            </Text>
            <Text style={styles.fieldHint}>
              Paste the pre-filled URL containing at least one query parameter for participant identification.
            </Text>
            <TextInput
              style={[styles.input, styles.inputMonospace, !!urlError && styles.inputError]}
              placeholder="https://example.com/survey?param=PARTICIPANT_ID"
              placeholderTextColor={palette.light.text.muted}
              value={paramUrl}
              onChangeText={(v) => {
                setParamUrl(v);
                if (urlError) setUrlError(null);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="done"
              multiline
              numberOfLines={3}
              maxLength={2048}
            />
            {urlError && <Text style={styles.fieldError}>{urlError}</Text>}
          </View>

        </View>

        {/* Email Options Section */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Email Options</Text>
          <Text style={styles.sectionSubtitle}>
            Configure the optional message that will accompany survey invitations. These settings can be adjusted again when you send the survey.
          </Text>

          {/* Include Message Checkbox */}
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setIncludeMessage((v) => !v)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, includeMessage && styles.checkboxChecked]}>
              {includeMessage && <Text style={styles.checkboxMark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>
              Include a custom message with the survey invitation email
            </Text>
          </TouchableOpacity>

          {/* Message Text */}
          {includeMessage && (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Message Text</Text>
              <Text style={styles.fieldHint}>
                This message will appear in the body of the invitation email, above the survey link.
              </Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                placeholder="Enter a personal message for participants..."
                placeholderTextColor={palette.light.text.muted}
                value={messageText}
                onChangeText={setMessageText}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                maxLength={5000}
              />
            </View>
          )}

          {/* Email Preview Button */}
          <View style={styles.previewButtonRow}>
            <TouchableOpacity
              style={[styles.btnSecondary, previewLoading && styles.btnDisabled]}
              onPress={handleEmailPreview}
              disabled={previewLoading}
            >
              {previewLoading ? (
                <ActivityIndicator color={palette.light.primary} size="small" />
              ) : (
                <Text style={styles.btnSecondaryText}>Preview Email</Text>
              )}
            </TouchableOpacity>
          </View>

          {previewError && (
            <View style={styles.inlineErrorBanner}>
              <Text style={styles.inlineErrorText}>{previewError}</Text>
            </View>
          )}
        </View>

        {/* Email Preview Panel */}
        {previewVisible && preview && (
          <View style={styles.card}>
            <View style={styles.previewHeader}>
              <Text style={styles.sectionTitle}>Email Preview</Text>
              <TouchableOpacity onPress={() => setPreviewVisible(false)}>
                <Text style={styles.dismissText}>Dismiss</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.previewMeta}>
              <Text style={styles.previewMetaLabel}>Subject:</Text>
              <Text style={styles.previewMetaValue}>{preview.subject}</Text>
            </View>

            <View style={styles.previewBody}>
              <Text style={styles.previewBodyLabel}>Body:</Text>
              <View style={styles.previewBodyBox}>
                <Text style={styles.previewBodyText}>{preview.body_html}</Text>
              </View>
            </View>

            {(preview.placeholders_used ?? []).length > 0 && (
              <View style={styles.previewPlaceholders}>
                <Text style={styles.previewMetaLabel}>Placeholders used:</Text>
                {preview.placeholders_used.map((key) => (
                  <Text key={key} style={styles.previewPlaceholderItem}>
                    <Text style={styles.codeInline}>{key}</Text>
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Compliance Confirmation */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Compliance Confirmation</Text>

          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setComplianceChecked((v) => !v)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, complianceChecked && styles.checkboxChecked]}>
              {complianceChecked && <Text style={styles.checkboxMark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>
              I confirm that my form includes a required Participant ID field and that I generated this link using the form's pre-filled link option.
            </Text>
          </TouchableOpacity>

          {!complianceChecked && (
            <Text style={styles.complianceHint}>
              You must confirm compliance before creating the survey.
            </Text>
          )}
        </View>

        {/* Action Buttons */}
        <View style={[styles.actionRow, isNarrow && styles.actionRowNarrow]}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.push(`/studies/${studyId}/surveys`)}
          >
            <Text style={styles.backBtnText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btnPrimary, !canSubmit && styles.btnDisabled]}
            onPress={handleOpenModal}
            disabled={!canSubmit}
          >
            <Text style={styles.btnPrimaryText}>Review & Create</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Confirmation Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!submitting) {
            setModalVisible(false);
            setModalError(null);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, isNarrow && styles.modalBoxNarrow]}>
            <Text style={styles.modalTitle}>Confirm Survey Creation</Text>
            <Text style={styles.modalSubtitle}>
              Please review the details below before creating your survey.
            </Text>

            {/* Review Fields */}
            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>Title</Text>
              <Text style={styles.reviewValue}>{title.trim()}</Text>
            </View>

            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>Parameterized Form URL</Text>
              <Text style={styles.reviewValueMono} numberOfLines={4}>
                {paramUrl.trim()}
              </Text>
            </View>

            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>Custom Message</Text>
              <Text style={styles.reviewValue}>
                {includeMessage
                  ? messageText.trim()
                    ? `Yes — "${messageText.trim()}"`
                    : "Yes (no message text entered)"
                  : "No"}
              </Text>
            </View>

            {/* Modal-level Error */}
            {modalError && (
              <View style={styles.modalErrorBanner}>
                <Text style={styles.modalErrorText}>{modalError}</Text>
              </View>
            )}

            {/* Modal Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.btnSecondary, submitting && styles.btnDisabled]}
                onPress={() => {
                  if (!submitting) {
                    setModalVisible(false);
                    setModalError(null);
                  }
                }}
                disabled={submitting}
              >
                <Text style={styles.btnSecondaryText}>Go Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnPrimary, submitting && styles.btnDisabled]}
                onPress={handleConfirm}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.btnPrimaryText}>Create Survey</Text>
                )}
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
    maxWidth: 800,
    alignSelf: "center",
    width: "100%",
  },
  containerNarrow: {
    maxWidth: "100%",
  },

  // Page Header
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

  // Info Card
  infoCard: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  infoCardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1D4ED8",
  },
  infoCardBody: {
    fontSize: 13,
    color: "#1E40AF",
    lineHeight: 20,
  },

  // Cards
  card: {
    backgroundColor: Colors.light.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.light.border,
    padding: 20,
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

  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.text,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: palette.light.text.secondary,
    lineHeight: 18,
    marginTop: -8,
  },

  // Form Fields
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.text,
  },
  required: {
    color: palette.light.danger,
  },
  fieldHint: {
    fontSize: 12,
    color: palette.light.text.muted,
    lineHeight: 16,
  },
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
  inputError: {
    borderColor: palette.light.danger,
  },
  inputMonospace: {
    fontFamily: Platform.select({
      ios: "Menlo",
      android: "monospace",
      default: "monospace",
    }),
    fontSize: 13,
  },
  textarea: {
    minHeight: 100,
    textAlignVertical: "top",
    paddingTop: 10,
  },
  fieldError: {
    fontSize: 12,
    color: palette.light.danger,
    marginTop: 2,
  },
  codeInline: {
    fontFamily: Platform.select({
      ios: "Menlo",
      android: "monospace",
      default: "monospace",
    }),
    fontSize: 12,
    backgroundColor: palette.light.muted,
    color: palette.light.text.secondary,
  },

  // Checkbox
  checkboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: palette.light.border,
    backgroundColor: Colors.light.background,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: palette.light.primary,
    borderColor: palette.light.primary,
  },
  checkboxMark: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 15,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    color: Colors.light.text,
    lineHeight: 20,
  },

  // Compliance
  complianceHint: {
    fontSize: 12,
    color: palette.light.text.muted,
    fontStyle: "italic",
    marginTop: -4,
  },

  // Preview
  previewButtonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: -4,
  },
  previewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dismissText: {
    fontSize: 13,
    color: palette.light.text.muted,
    fontWeight: "600",
  },
  previewMeta: {
    gap: 4,
  },
  previewMetaLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: palette.light.text.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  previewMetaValue: {
    fontSize: 14,
    color: Colors.light.text,
  },
  previewBody: {
    gap: 6,
  },
  previewBodyLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: palette.light.text.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  previewBodyBox: {
    backgroundColor: palette.light.surface,
    borderWidth: 1,
    borderColor: palette.light.border,
    borderRadius: 8,
    padding: 12,
  },
  previewBodyText: {
    fontSize: 13,
    color: Colors.light.text,
    lineHeight: 20,
  },
  previewPlaceholders: {
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: palette.light.border,
    paddingTop: 12,
    marginTop: -4,
  },
  previewPlaceholderItem: {
    fontSize: 12,
    color: palette.light.text.secondary,
    lineHeight: 18,
  },

  // Inline Error Banner (for preview errors)
  inlineErrorBanner: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 8,
    padding: 10,
    marginTop: -4,
  },
  inlineErrorText: {
    fontSize: 13,
    color: "#DC2626",
  },

  // Action Row
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  actionRowNarrow: {
    flexDirection: "column",
    alignItems: "stretch",
  },

  // Buttons
  btnPrimary: {
    backgroundColor: palette.light.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    minWidth: 140,
  },
  btnPrimaryText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  btnSecondary: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: palette.light.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    minWidth: 120,
  },
  btnSecondaryText: {
    color: palette.light.primary,
    fontWeight: "700",
    fontSize: 14,
  },
  btnDisabled: {
    opacity: 0.45,
  },

  backBtn: {
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  backBtnText: {
    fontSize: 14,
    color: palette.light.text.muted,
    fontWeight: "600",
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: palette.light.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalBox: {
    backgroundColor: Colors.light.background,
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 520,
    gap: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
      },
      android: { elevation: 8 },
      default: { boxShadow: "0 8px 32px rgba(0,0,0,0.12)" } as any,
    }),
  },
  modalBoxNarrow: {
    maxWidth: "100%",
    borderRadius: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.light.text,
  },
  modalSubtitle: {
    fontSize: 13,
    color: palette.light.text.secondary,
    marginTop: -8,
    lineHeight: 18,
  },

  // Review Fields inside Modal
  reviewRow: {
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: palette.light.border,
    paddingTop: 12,
  },
  reviewLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: palette.light.text.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  reviewValue: {
    fontSize: 14,
    color: Colors.light.text,
    lineHeight: 20,
  },
  reviewValueMono: {
    fontSize: 12,
    color: Colors.light.text,
    fontFamily: Platform.select({
      ios: "Menlo",
      android: "monospace",
      default: "monospace",
    }),
    lineHeight: 18,
  },

  // Modal Error Banner
  modalErrorBanner: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 8,
    padding: 12,
  },
  modalErrorText: {
    fontSize: 13,
    color: "#DC2626",
    lineHeight: 18,
  },

  // Modal Action Buttons
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 4,
  },
});
