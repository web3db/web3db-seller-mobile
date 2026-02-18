import React, { useEffect, useState } from "react";
import { Colors, palette } from '@/constants/theme';
import {

  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  useWindowDimensions,
  Platform,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from "@clerk/clerk-expo"; // Use Clerk's useAuth
import {
  createTrnPosting,
  listMetrics,
  listPostingStatuses,
  listRewardTypes,
  listHealthConditions
} from "./services/postings/api";
import { Metric, PostingStatus, RewardType, HealthCondition } from "./services/postings/types";
import SingleSelectDropdown from "../components/SingleSelectDropdown";
import { useAuth as localAuth } from "@/hooks/AuthContext";

type Study = {
  id: string;
  title: string;
  type: string;
  description: string;
  organizer: string;
  spots: number;
  participants?: string[];
  active?: boolean;
};

export default function ManageStudy(): React.ReactElement {
  const { studyId } = useLocalSearchParams() as { studyId?: string };
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isNarrow = width < 720;
  const { isSignedIn } = useAuth(); // Use Clerk's isSignedIn

  // form state (pre-filled)
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [length, setLength] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // --- Date Picker State ---
  const [applyOpenAt, setApplyOpenAt] = useState<Date | null>(null);
  const [applyCloseAt, setApplyCloseAt] = useState<Date | null>(null);
  const [openDateString, setOpenDateString] = useState('');
  const [closeDateString, setCloseDateString] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerField, setDatePickerField] = useState<'open' | 'close' | null>(null);
  const [active, setActive] = useState(true);

  // metrics state
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  // dropdown state / selected metric ids
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedMetricIds, setSelectedMetricIds] = useState<number[]>([]);

  // statuses
  const [statuses, setStatuses] = useState<PostingStatus[]>([]);
  const [statusesLoading, setStatusesLoading] = useState(false);
  const [statusesError, setStatusesError] = useState<string | null>(null);
  const [selectedStatusId, setSelectedStatusId] = useState<number>(2);

  // reward types
  const [rewardTypes, setRewardTypes] = useState<RewardType[]>([]);
  const [rewardTypesLoading, setRewardTypesLoading] = useState(false);
  const [rewardTypesError, setRewardTypesError] = useState<string | null>(null);
  // default selected reward type id = 1 (Points)
  const [selectedRewardTypeId, setSelectedRewardTypeId] = useState<number>(1);

  // health conditions
  const [healthConditions, setHealthConditions] = useState<HealthCondition[]>([]);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [selectedHealthConditionIds, setSelectedHealthConditionIds] = useState<number[]>([]);
  const [healthDropdownOpen, setHealthDropdownOpen] = useState(false);

  // reward value
  const [rewardValue, setRewardValue] = useState("");

  const { user } = localAuth();

  const buyerId = user ? Number(user.id) : -1;

  // mount metrics
  useEffect(() => {
    let mounted = true;
    async function loadMetrics() {
      setMetricsLoading(true);
      setMetricsError(null);
      try {
        const items = await listMetrics();
        if (!mounted) return;
        setMetrics(items);
      } catch (err) {
        console.error("Failed to load metrics", err);
        if (mounted) setMetricsError(String(err ?? "Failed to load metrics"));
      } finally {
        if (mounted) setMetricsLoading(false);
      }
    }
    void loadMetrics();
    return () => {
      mounted = false;
    };
  }, []);

  // mount posting statuses
  useEffect(() => {
    let mounted = true;
    async function loadStatuses() {
      setStatusesLoading(true);
      setStatusesError(null);
      try {
        const items = await listPostingStatuses();
        if (!mounted) return;
        setStatuses(items);
        // if returned items don't include default 2, optionally set first active
        if (!items.some((i) => i.postingStatusId === 2)) {
          const first = items.find((i) => i.isActive);
          if (first) setSelectedStatusId(first.postingStatusId);
        }
      } catch (err) {
        console.error("Failed to load statuses", err);
        if (mounted) setStatusesError(String(err ?? "Failed to load statuses"));
      } finally {
        if (mounted) setStatusesLoading(false);
      }
    }
    void loadStatuses();
    return () => { mounted = false; }
  }, []);

  // mount reward types
  useEffect(() => {
    let mounted = true;
    async function loadRewardTypes() {
      setRewardTypesLoading(true);
      setRewardTypesError(null);
      try {
        const items = await listRewardTypes();
        if (!mounted) return;
        setRewardTypes(items);
        // ensure default exists; if not pick first active
        if (!items.some((i) => i.rewardTypeId === 1)) {
          const firstActive = items.find((i) => i.isActive);
          if (firstActive) setSelectedRewardTypeId(firstActive.rewardTypeId);
        }
      } catch (err) {
        console.error("Failed to load reward types", err);
        if (mounted) setRewardTypesError(String(err ?? "Failed to load reward types"));
      } finally {
        if (mounted) setRewardTypesLoading(false);
      }
    }
    void loadRewardTypes();
    return () => { mounted = false; };
  }, []);

  // mount health conditions
  useEffect(() => {
    let mounted = true;
    async function loadHealth() {
      setHealthLoading(true);
      setHealthError(null);
      try {
        const items = await listHealthConditions();
        if (!mounted) return;
        setHealthConditions(items);
      } catch (err) {
        console.error("Failed to load health conditions", err);
        if (mounted) setHealthError(String(err ?? "Failed to load health conditions"));
      } finally {
        if (mounted) setHealthLoading(false);
      }
    }
    void loadHealth();
    return () => { mounted = false; };
  }, []);

  // --- Date Picker Handlers (from manage.tsx) ---
  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      if (datePickerField === 'open') {
        setApplyOpenAt(selectedDate);
        setOpenDateString(formatDateForDisplay(selectedDate));
      } else if (datePickerField === 'close') {
        setApplyCloseAt(selectedDate);
        setCloseDateString(formatDateForDisplay(selectedDate));
      }
    }
    setDatePickerField(null);
  };

  const handleWebDateChange = (text: string, field: 'open' | 'close') => {
    if (field === 'open') {
      setOpenDateString(text);
    } else {
      setCloseDateString(text);
    }

    const parts = text.split('-').map((s) => Number(s));
    if (parts.length === 3 && parts.every((n) => !isNaN(n))) {
      const [y, m, d] = parts;
      const utcDate = new Date(Date.UTC(y, m - 1, d));
      if (field === 'open') {
        setApplyOpenAt(utcDate);
      } else {
        setApplyCloseAt(utcDate);
      }
    }
  };

  const normalizeWebDate = (field: 'open' | 'close') => {
    const text = field === 'open' ? openDateString : closeDateString;
    const parts = String(text).split('-').map((s) => Number(s));
    if (parts.length === 3 && parts.every((n) => !isNaN(n))) {
      const [y, m, d] = parts;
      const utcDate = new Date(Date.UTC(y, m - 1, d));
      const normalized = utcDate.toISOString().split('T')[0];
      if (field === 'open') {
        setOpenDateString(normalized);
        setApplyOpenAt(utcDate);
      } else {
        setCloseDateString(normalized);
        setApplyCloseAt(utcDate);
      }
    }
  };

  const showDatepickerFor = (field: 'open' | 'close') => {
    setDatePickerField(field);
    setShowDatePicker(true);
  };

  // Helper to format date to YYYY-MM-DD
  const formatDateForDisplay = (date: Date | null) => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };
  // --- End Date Picker Handlers ---

  function toggleMetric(metricId: number) {
    setSelectedMetricIds((prev) =>
      prev.includes(metricId) ? prev.filter((id) => id !== metricId) : [...prev, metricId],
    );
  }

  function toggleHealthCondition(id: number) {
    setSelectedHealthConditionIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function selectedNames() {
    return metrics
      .filter((m) => selectedMetricIds.includes(m.metricId))
      .map((m) => m.displayName)
      .join(", ");
  }

  async function handlePublish() {
    const errors: Record<string, string> = {};
    if (!title.trim()) errors.title = "Title is required";
    if (!summary.trim()) errors.summary = "Summary is required";
    if (!length.trim()) errors.length = "Length is required";
    if (!applyOpenAt) errors.applyOpenAt = "Start date is required";
    if (selectedMetricIds.length === 0) errors.metrics = "At least one metric is required";
    if (selectedHealthConditionIds.length === 0) errors.healthConditions = "At least one health condition is required";
    if (!rewardValue.trim()) errors.rewardValue = "Reward value is required";

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});

    try {
      const payload: any = {
        title,
        summary,
        description,
        dataCoverageDaysRequired: Number(length) || 1,
        postingStatusId: active ? 1 : 0,
        // New DB column requires the buyer user id; include both common casings
        buyerId: buyerId,
        postingMetricIds: selectedMetricIds,
        rewardTypeId: selectedRewardTypeId,
        rewardValue: Number(rewardValue) || 0,
        healthConditionIds: selectedHealthConditionIds,
        applyOpenAt: applyOpenAt ? applyOpenAt.toISOString() : null,
        applyCloseAt: applyCloseAt ? applyCloseAt.toISOString() : null,
      };

      console.log("Publishing payload:", payload);
      const response = await createTrnPosting(buyerId,payload as any);

      // Navigate to created study detail
      router.replace(`/studies/${response.id}`);
    } catch (error) {
      console.error("Error saving study:", error);
      // show minimal feedback — you can replace with a toast
      alert("Failed to publish study. See console for details.");
    }
  }

  function handleCancel() {
    router.back();
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={[styles.contentRow, isNarrow ? styles.columnLayout : styles.rowLayout]}>
          {/* LEFT: Form Card */}
          <View style={[styles.card, isNarrow ? styles.fullWidth : styles.leftColumn]}>
            <Text style={styles.heading}>Create A New Study</Text>

            <Text style={styles.label}>Title <Text style={styles.required}>*</Text></Text>
            <TextInput value={title} onChangeText={setTitle} style={styles.input} />
            {formErrors.title ? <Text style={styles.errorText}>{formErrors.title}</Text> : null}

            <Text style={styles.label}>Summary <Text style={styles.required}>*</Text></Text>
            <TextInput value={summary} onChangeText={setSummary} style={styles.input} />
            {formErrors.summary ? <Text style={styles.errorText}>{formErrors.summary}</Text> : null}

            <Text style={styles.label}>Description</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              style={[styles.input, styles.multiline]}
              multiline
            />

            <Text style={styles.label}>Length (days) <Text style={styles.required}>*</Text></Text>
            <TextInput
              value={length}
              onChangeText={(t) => setLength(t.replace(/[^0-9]/g, ""))}
              style={styles.input}
              keyboardType="numeric"
            />
            {formErrors.length ? <Text style={styles.errorText}>{formErrors.length}</Text> : null}

            {/* Date Pickers */}
            <Text style={styles.label}>Apply Open Date <Text style={styles.required}>*</Text></Text>
            {Platform.OS === 'web' ? (
              <input
                type="date"
                style={{
                  borderWidth: 1,
                  borderColor: palette.light.border,
                  borderRadius: 8,
                  backgroundColor: palette.light.surface,
                  minHeight: 44,
                } as React.CSSProperties}
                value={openDateString}
                onChange={(e: any) => handleWebDateChange(e.target.value, 'open')}
                onBlur={() => normalizeWebDate('open')}
              />
            ) : (
              <TouchableOpacity onPress={() => showDatepickerFor('open')} style={styles.input}>
                <Text>{applyOpenAt ? formatDateForDisplay(applyOpenAt) : 'Select date...'}</Text>
              </TouchableOpacity>
            )}
            {formErrors.applyOpenAt ? <Text style={styles.errorText}>{formErrors.applyOpenAt}</Text> : null}

            <Text style={styles.label}>Apply Close Date</Text>
            {Platform.OS === 'web' ? (
              <input
                type="date"
                style={{
                  borderWidth: 1,
                  borderColor: palette.light.border,
                  borderRadius: 8,
                  backgroundColor: palette.light.surface,
                  minHeight: 44,
                } as React.CSSProperties}
                value={closeDateString}
                onChange={(e: any) => handleWebDateChange(e.target.value, 'close')}
                onBlur={() => normalizeWebDate('close')}
              />
            ) : (
              <TouchableOpacity onPress={() => showDatepickerFor('close')} style={styles.input}>
                <Text>{applyCloseAt ? formatDateForDisplay(applyCloseAt) : 'Select date...'}</Text>
              </TouchableOpacity>
            )}

            {/* DateTimePicker Modal (for native only) */}
            {showDatePicker && Platform.OS !== 'web' && (
              <DateTimePicker value={datePickerField === 'open' ? (applyOpenAt || new Date()) : (applyCloseAt || new Date())} mode="date" display="default" onChange={onDateChange} />
            )}

            <Text style={styles.label}>Status</Text>
            {statusesLoading ? (
              <ActivityIndicator />
            ) : statusesError ? (
              <Text style={{ color: "red" }}>{statusesError}</Text>
            ) : (
              <SingleSelectDropdown
                items={statuses.map((s) => ({ id: s.postingStatusId, displayName: s.displayName }))}
                selectedId={selectedStatusId}
                onSelect={(id) => setSelectedStatusId(Number(id))}
                placeholder="Select status..."
              />
            )}

            <Text style={[styles.label, { marginTop: 12 }]}>Metrics <Text style={styles.required}>*</Text></Text>
            {formErrors.metrics ? <Text style={styles.errorText}>{formErrors.metrics}</Text> : null}

            <View>
              <TouchableOpacity
                style={[styles.dropdownToggle, dropdownOpen && styles.dropdownOpen]}
                onPress={() => setDropdownOpen((v) => !v)}
              >
                <Text style={styles.dropdownText}>
                  {selectedMetricIds.length > 0 ? selectedNames() : "Select metrics..."}
                </Text>
                <Text style={styles.dropdownChevron}>{dropdownOpen ? "▴" : "▾"}</Text>
              </TouchableOpacity>

              {dropdownOpen && (
                <View style={styles.dropdownPane}>
                  {metricsLoading ? (
                    <ActivityIndicator />
                  ) : metricsError ? (
                    <Text style={{ color: "red" }}>{metricsError}</Text>
                  ) : metrics.length === 0 ? (
                    <Text style={styles.muted}>No metrics available</Text>
                  ) : (
                    <FlatList
                      data={metrics}
                      keyExtractor={(m) => String(m.metricId)}
                      style={{ maxHeight: 240 }}
                      keyboardShouldPersistTaps="handled"
                      showsVerticalScrollIndicator={true}
                      renderItem={({ item: m }) => {
                        const picked = selectedMetricIds.includes(m.metricId);
                        if (!m.isActive) return null; // skip inactive if you want
                        return (
                          <TouchableOpacity
                            style={styles.metricRow}
                            onPress={() => toggleMetric(m.metricId)}
                          >
                            <View style={[styles.checkbox, picked && styles.checkboxChecked]}>
                              {picked && <Text style={styles.checkboxTick}>✓</Text>}
                            </View>
                            <Text style={styles.metricLabel}>{m.displayName}</Text>
                          </TouchableOpacity>
                        );
                      }}
                    />
                  )}
                </View>
              )}

              <Text style={[styles.label, { marginTop: 12 }]}>Health Conditions <Text style={styles.required}>*</Text></Text>
              {formErrors.healthConditions ? <Text style={styles.errorText}>{formErrors.healthConditions}</Text> : null}

              <View>
                <TouchableOpacity
                  style={[styles.dropdownToggle, healthDropdownOpen && styles.dropdownOpen]}
                  onPress={() => setHealthDropdownOpen((v) => !v)}
                >
                  <Text style={styles.dropdownText}>
                    {selectedHealthConditionIds.length > 0
                      ? healthConditions
                        .filter((h) => selectedHealthConditionIds.includes(h.healthConditionId))
                        .map((h) => h.displayName)
                        .join(", ")
                      : "Select health conditions..."}
                  </Text>
                  <Text style={styles.dropdownChevron}>{healthDropdownOpen ? "▴" : "▾"}</Text>
                </TouchableOpacity>

                {healthDropdownOpen && (
                  <View style={styles.dropdownPane}>
                    {healthLoading ? (
                      <ActivityIndicator />
                    ) : healthError ? (
                      <Text style={{ color: "red" }}>{healthError}</Text>
                    ) : healthConditions.length === 0 ? (
                      <Text style={styles.muted}>No health conditions available</Text>
                    ) : (
                      <FlatList
                        data={healthConditions}
                        keyExtractor={(hc) => String(hc.healthConditionId)}
                        style={{ maxHeight: 240 }}
                        keyboardShouldPersistTaps="handled"
                        renderItem={({ item: hc }) => {
                          const picked = selectedHealthConditionIds.includes(hc.healthConditionId);
                          return (
                            <TouchableOpacity
                              key={hc.healthConditionId}
                              style={styles.metricRow}
                              onPress={() => toggleHealthCondition(hc.healthConditionId)}
                            >
                              <View style={[styles.checkbox, picked && styles.checkboxChecked]}>
                                {picked && <Text style={styles.checkboxTick}>✓</Text>}
                              </View>
                              <Text style={styles.metricLabel}>{hc.displayName}</Text>
                            </TouchableOpacity>
                          );
                        }}
                      />
                    )}
                  </View>
                )}

                <Text style={styles.label}>Reward Type</Text>
                {rewardTypesLoading ? (
                  <ActivityIndicator />
                ) : rewardTypesError ? (
                  <Text style={{ color: "red" }}>{rewardTypesError}</Text>
                ) : (
                  <SingleSelectDropdown
                    items={rewardTypes.map((r) => ({ id: r.rewardTypeId, displayName: r.displayName }))}
                    selectedId={selectedRewardTypeId}
                    onSelect={(id) => setSelectedRewardTypeId(Number(id))}
                    placeholder="Select reward type..."
                  />
                )}

                <Text style={styles.label}>Reward Value <Text style={styles.required}>*</Text></Text>
                <TextInput
                  value={rewardValue}
                  onChangeText={(t) => setRewardValue(t.replace(/[^0-9]/g, ""))}
                  style={styles.input}
                  keyboardType="numeric"
                />
                {formErrors.rewardValue ? <Text style={styles.errorText}>{formErrors.rewardValue}</Text> : null}

                <View style={styles.formActions}>
                  <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={handlePublish}>
                    <Text style={styles.btnPrimaryText}>Publish</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={handleCancel}>
                    <Text style={styles.btnGhostText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* Styles */
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.light.background },
  scrollContainer: { padding: 16, paddingBottom: 48 },
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
    // drop shadow
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
  label: { fontSize: 14, marginTop: 8, marginBottom: 6, color: Colors.light.text },
  input: {
    borderWidth: 1,
    borderColor: palette.light.border,
    borderRadius: 8,
    padding: 10,
    backgroundColor: palette.light.surface,
    minHeight: 44,
  },
  multiline: { height: 110, textAlignVertical: "top" as const },

  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  dropdownToggle: {
    borderWidth: 1,
    borderColor: palette.light.border,
    padding: 10,
    borderRadius: 8,
    backgroundColor: Colors.light.background,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 44,
  },
  dropdownOpen: { borderColor: Colors.light.tint, shadowColor: Colors.light.tint, elevation: 2 },
  dropdownText: { color: Colors.light.text },
  dropdownChevron: { color: palette.light.text.muted, marginLeft: 8 },

  dropdownPane: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: palette.light.border,
    borderRadius: 8,
    maxHeight: 240,
    backgroundColor: Colors.light.background,
    paddingVertical: 6,
  },

  metricRow: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    height: 20,
    width: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: palette.light.border,
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: { backgroundColor: Colors.light.tint, borderColor: Colors.light.tint },
  checkboxTick: { color: Colors.light.background, fontSize: 12 },
  metricLabel: { fontSize: 14 },

  participantsList: { marginTop: 6 },

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
  btnGhost: { backgroundColor: "transparent", borderWidth: 1, borderColor: palette.light.border },
  btnGhostText: { color: Colors.light.text, fontWeight: "600" },

  toggleBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.light.border,
  },
  toggleBtnActive: { backgroundColor: "#e6f2ff", borderColor: "#8fc9ff" },
  toggleText: { color: Colors.light.text },
  toggleTextActive: { color: Colors.light.tint, fontWeight: "700" },

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
  },
  statNumber: { fontSize: 28, fontWeight: "800" },
  statLabel: { color: palette.light.text.muted, marginTop: 6 },

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

  required: { color: "red", marginLeft: 4 },
  errorText: { color: "red", fontSize: 12, marginTop: 4 },
});