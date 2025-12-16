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
import {
  updateTrnPosting,
  listMetrics,
  listHealthConditions,
  listRewardTypes,
  listPostingStatuses,
} from "../../services/postings/api";
import {
  Metric,
  HealthCondition,
  RewardType,
  PostingStatus,
} from "../../services/postings/types";
import SingleSelectDropdown from "../../../components/SingleSelectDropdown";
import { useAuth } from "@/hooks/AuthContext";

const ManageStudy: React.FC = () => {
  const { studyId } = useLocalSearchParams() as { studyId?: string };
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isNarrow = width < 720;

  // Form state
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [dataCoverageDaysRequired, setDataCoverageDaysRequired] = useState("");
  const [rewardValue, setRewardValue] = useState(""); // Added rewardValue state
  const [postingId, setPostingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // --- Date Picker State ---
  const [applyOpenAt, setApplyOpenAt] = useState<Date | null>(null);
  const [applyCloseAt, setApplyCloseAt] = useState<Date | null>(null);
  const [openDateString, setOpenDateString] = useState(''); // <-- Add this
  const [closeDateString, setCloseDateString] = useState(''); // <-- Add this
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerField, setDatePickerField] = useState<'open' | 'close' | null>(null);

  // --- Dropdown options state ---
  const [statuses, setStatuses] = useState<PostingStatus[]>([]);
  const [rewardTypes, setRewardTypes] = useState<RewardType[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [healthConditions, setHealthConditions] = useState<HealthCondition[]>([]);
  
  // --- Loading/Errors state ---
  const [statusesLoading, setStatusesLoading] = useState(true);
  const [rewardTypesLoading, setRewardTypesLoading] = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [healthLoading, setHealthLoading] = useState(true);

  // --- Selected IDs state ---
  const [selectedStatusId, setSelectedStatusId] = useState<number | null>(null);
  const [selectedRewardTypeId, setSelectedRewardTypeId] = useState<number | null>(null);
  const [selectedMetricIds, setSelectedMetricIds] = useState<number[]>([]);
  const [selectedHealthConditionIds, setSelectedHealthConditionIds] = useState<number[]>([]);

  // --- Dropdown UI state ---
  const [metricsDropdownOpen, setMetricsDropdownOpen] = useState(false);
  const [healthDropdownOpen, setHealthDropdownOpen] = useState(false);

  const { user } = useAuth();

  useEffect(() => {
    listPostingStatuses().then(setStatuses).finally(() => setStatusesLoading(false));
    listRewardTypes().then(setRewardTypes).finally(() => setRewardTypesLoading(false));
    listMetrics().then(setMetrics).finally(() => setMetricsLoading(false));
    listHealthConditions().then(setHealthConditions).finally(() => setHealthLoading(false));
  }, []);

  useEffect(() => {
    async function fetchStudyDetail() {
      if (!studyId) return;
      setLoading(true);
      try {
        const buyerId = user?.id ?? -1;
        const { getTrnPostingDetail } = await import("../../services/postings/api");
        const detail = await getTrnPostingDetail(buyerId, studyId);

        if (detail) {
          setPostingId(Number(detail.postingId));
          setTitle(detail.title ?? "");
          setSummary(detail.summary ?? "");
          setDescription(detail.description ?? "");
          setDataCoverageDaysRequired(detail.dataCoverageDaysRequired ? String(detail.dataCoverageDaysRequired) : "");
          setRewardValue(detail.rewardValue ? String(detail.rewardValue) : ""); // Set rewardValue from fetched detail
          // If the API returned ISO strings, extract the YYYY-MM-DD portion so we don't show timezone-shifted times
          const extractDatePart = (iso?: string | null) => {
            if (!iso) return '';
            return String(iso).split('T')[0];
          };

          const openDateStr = extractDatePart(detail.applyOpenAt);
          setOpenDateString(openDateStr);
          if (openDateStr) {
            const [y, m, d] = openDateStr.split('-').map((s: string) => Number(s));
            setApplyOpenAt(new Date(Date.UTC(y, (m || 1) - 1, d || 1)));
          } else {
            setApplyOpenAt(null);
          }

          const closeDateStr = extractDatePart(detail.applyCloseAt);
          setCloseDateString(closeDateStr);
          if (closeDateStr) {
            const [y, m, d] = closeDateStr.split('-').map((s: string) => Number(s));
            setApplyCloseAt(new Date(Date.UTC(y, (m || 1) - 1, d || 1)));
          } else {
            setApplyCloseAt(null);
          }

          setSelectedStatusId(detail.postingStatusId ?? null);
          setSelectedRewardTypeId(detail.rewardTypeId ?? null);
          // The detail API returns an array of objects: { metricId: number, ... }
          // We need to map this to an array of just the IDs.
          setSelectedMetricIds(Array.isArray(detail.metrics) ? detail.metrics.map((m: any) => Number(m.metricId)) : []); // metricId is consistent
          setSelectedHealthConditionIds(Array.isArray(detail.healthConditions) ? detail.healthConditions.map((h: any) => Number(h.id)) : []); // Use 'id' from normalized data
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchStudyDetail();
  }, [studyId]);

  // --- Date Picker Handler ---
  const onDateChange = (event: any, selectedDate?: Date) => {
    // On Android, the picker closes automatically. On iOS, we need to hide it manually.
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
    // Reset which field is being edited
    setDatePickerField(null);
  };

  const handleWebDateChange = (text: string, field: 'open' | 'close') => {
    // Always update the visible string so the user can type partial values
    if (field === 'open') {
      setOpenDateString(text);
    } else {
      setCloseDateString(text);
    }

    // Try to parse full YYYY-MM-DD into a Date and update date state only when valid
    // Parse YYYY-MM-DD and create a UTC date (so toISOString() will keep the same calendar date)
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
    } else {
      // keep user's text, don't update apply dates
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

  const formatDate = (date: Date | null) => {
    return date ? date.toISOString().split('T')[0] : 'Select date...';
  };

  function toggleMetric(metricId: number) {
    setSelectedMetricIds((prev) =>
      prev.includes(metricId) ? prev.filter((id) => id !== metricId) : [...prev, metricId]
    );
  }

  function toggleHealthCondition(id: number) {
    setSelectedHealthConditionIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function selectedMetricsNames() {
    return metrics
      .filter((m) => selectedMetricIds.includes(m.metricId))
      .map((m) => m.displayName)
      .join(", ");
  }

  function selectedHealthConditionNames() {
    return healthConditions
      .filter((h) => selectedHealthConditionIds.includes(h.healthConditionId))
      .map((h) => h.displayName)
      .join(", ");
  }

  async function handleSave() {
  if (!postingId) return alert("No study loaded");
  const payload = {
    title,
    summary,
    description,
    dataCoverageDaysRequired: dataCoverageDaysRequired ? Number(dataCoverageDaysRequired) : null,
    // posting status id (number or null)
    postingStatusId: selectedStatusId ? Number(selectedStatusId) : null,
    // reward type id
    rewardTypeId: selectedRewardTypeId,
    // The create/update functions expect `postingMetricsIds` (not `metrics`)
    rewardValue: Number(rewardValue) || 0, // Include rewardValue in payload
    metrics: selectedMetricIds,
    // The create/update functions expect `healthConditionIds`
    healthConditionIds: selectedHealthConditionIds,
    // dates (ISO strings or null)
    applyOpenAt: applyOpenAt ? applyOpenAt.toISOString() : null,
    applyCloseAt: applyCloseAt ? applyCloseAt.toISOString() : null,
  };
  try {
    const res = await updateTrnPosting(user?.id ?? -1, postingId, payload as any);
    console.log(res)
    router.replace(`/studies/${postingId}?saved=1`);
  } catch (err) {
    alert("Failed to save changes: " + (err instanceof Error ? err.message : String(err)));
  }
}

  function handleCancel() {
    router.back();
  }

  // Determine which date is currently being edited for the picker
  const currentPickerDate = datePickerField === 'open' ? (applyOpenAt || new Date()) : (applyCloseAt || new Date());
  
  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" />
          <Text style={{ marginTop: 8 }}>Loading study...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={[styles.contentRow, isNarrow ? styles.columnLayout : styles.rowLayout]}>
          <View style={[styles.card, isNarrow ? styles.fullWidth : styles.leftColumn]}>
            <Text style={styles.heading}>Manage Study</Text>

            <Text style={styles.label}>Title</Text>
            <TextInput value={title} onChangeText={setTitle} style={styles.input} />

            <Text style={styles.label}>Summary</Text>
            <TextInput value={summary} onChangeText={setSummary} style={styles.input} />

            <Text style={styles.label}>Description</Text>
            <TextInput value={description ?? ""} onChangeText={setDescription} style={[styles.input, styles.multiline]} multiline />
            
            <Text style={styles.label}>Length (days)</Text>
            <TextInput value={dataCoverageDaysRequired} onChangeText={setDataCoverageDaysRequired} style={styles.input} keyboardType="numeric" />

            {/* Date Pickers */}
            <Text style={styles.label}>Apply Open Date</Text>
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
              <DateTimePicker
                value={datePickerField === 'open' ? (applyOpenAt || new Date()) : (applyCloseAt || new Date())}
                mode="date"
                display="default"
                onChange={onDateChange}
              />
            )}

            <Text style={styles.label}>Status</Text>
            {statusesLoading ? <ActivityIndicator/> : 
              <SingleSelectDropdown
                items={statuses.map((s) => ({ id: s.postingStatusId, displayName: s.displayName }))}
                selectedId={selectedStatusId}
                onSelect={(id) => setSelectedStatusId(Number(id))}
                placeholder="Select status..."
              />
            }

            <Text style={styles.label}>Reward Type</Text>
            {rewardTypesLoading ? <ActivityIndicator/> : 
              <SingleSelectDropdown
                items={rewardTypes.map((r) => ({ id: r.rewardTypeId, displayName: r.displayName }))}
                selectedId={selectedRewardTypeId}
                onSelect={(id) => setSelectedRewardTypeId(Number(id))}
                placeholder="Select reward type..."
              />
            }

            <Text style={styles.label}>Reward Value</Text>
            <TextInput
              value={rewardValue}
              onChangeText={(t) => setRewardValue(t.replace(/[^0-9]/g, ""))} // Allow only numeric input
              style={styles.input}
              keyboardType="numeric"
            />

            <Text style={[styles.label, { marginTop: 12 }]}>Metrics</Text>
            <TouchableOpacity style={[styles.dropdownToggle, metricsDropdownOpen && styles.dropdownOpen]} onPress={() => setMetricsDropdownOpen((v) => !v)}>
              <Text style={styles.dropdownText} numberOfLines={1}>
                {selectedMetricIds.length > 0 ? selectedMetricsNames() : "Select metrics..."}
              </Text>
              <Text style={styles.dropdownChevron}>{metricsDropdownOpen ? "▴" : "▾"}</Text>
            </TouchableOpacity>
            {metricsDropdownOpen && (
              <View style={styles.dropdownPane}>
                {metricsLoading ? <ActivityIndicator /> : 
                  <FlatList
                    data={((metrics as any).filter((m: any) => (m.isActive ?? true)) as any[])
                      .slice()
                      .sort((a, b) => {
                        const aSel = selectedMetricIds.includes(a.metricId);
                        const bSel = selectedMetricIds.includes(b.metricId);
                        if (aSel === bSel) return 0;
                        return aSel ? -1 : 1;
                      })}
                    keyExtractor={(m) => String(m.metricId)}
                    renderItem={({ item }) => {
                      const picked = selectedMetricIds.includes(item.metricId);
                      return (
                        <TouchableOpacity style={styles.metricRow} onPress={() => toggleMetric(item.metricId)}>
                          <View style={[styles.checkbox, picked && styles.checkboxChecked]}><Text style={styles.checkboxTick}>✓</Text></View>
                          <Text style={styles.metricLabel}>{item.displayName}</Text>
                        </TouchableOpacity>
                      );
                    }}
                  />
                }
              </View>
            )}

            <Text style={[styles.label, { marginTop: 12 }]}>Health Conditions</Text>
            <TouchableOpacity style={[styles.dropdownToggle, healthDropdownOpen && styles.dropdownOpen]} onPress={() => setHealthDropdownOpen((v) => !v)}>
              <Text style={styles.dropdownText} numberOfLines={1}>
                {selectedHealthConditionIds.length > 0 ? selectedHealthConditionNames() : "Select conditions..."}
              </Text>
              <Text style={styles.dropdownChevron}>{healthDropdownOpen ? "▴" : "▾"}</Text>
            </TouchableOpacity>
            {healthDropdownOpen && (
              <View style={styles.dropdownPane}>
                {healthLoading ? <ActivityIndicator /> : 
                  <FlatList
                    data={healthConditions.slice().sort((a, b) => {
                      const aSel = selectedHealthConditionIds.includes(a.healthConditionId);
                      const bSel = selectedHealthConditionIds.includes(b.healthConditionId);
                      if (aSel === bSel) return 0;
                      return aSel ? -1 : 1;
                    })}
                    keyExtractor={(h) => String(h.healthConditionId)}
                    renderItem={({ item }) => {
                      const picked = selectedHealthConditionIds.includes(item.healthConditionId);
                      return (
                        <TouchableOpacity style={styles.metricRow} onPress={() => toggleHealthCondition(item.healthConditionId)}>
                          <View style={[styles.checkbox, picked && styles.checkboxChecked]}><Text style={styles.checkboxTick}>✓</Text></View>
                          <Text style={styles.metricLabel}>{item.displayName}</Text>
                        </TouchableOpacity>
                      );
                    }}
                  />
                }
              </View>
            )}

            <View style={styles.formActions}>
              <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={handleSave}>
                <Text style={styles.btnPrimaryText}>Save Changes</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={handleCancel}>
                <Text style={styles.btnGhostText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={[styles.card, isNarrow ? styles.fullWidth : styles.rightColumn]}></View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.light.background },
  scrollContainer: { padding: 16, paddingBottom: 48 },
  contentRow: { width: "100%", gap: 16 },
  rowLayout: { flexDirection: "row", alignItems: "flex-start" },
  columnLayout: { flexDirection: "column" },
  card: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    ...Platform.select({
      ios: { shadowColor: Colors.light.text, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 12 },
      android: { elevation: 3 },
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
    justifyContent: 'center',
  },
  multiline: { height: 110, textAlignVertical: "top", paddingVertical: 10 },
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
  dropdownText: { color: Colors.light.text, flex: 1 },
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
  checkboxTick: { color: Colors.light.background, fontSize: 12, fontWeight: 'bold' },
  metricLabel: { fontSize: 14 },
  formActions: { marginTop: 24, flexDirection: "row", gap: 8, flexWrap: "wrap" },
  btn: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, alignItems: "center" },
  btnPrimary: { backgroundColor: Colors.light.tint },
  btnPrimaryText: { color: Colors.light.background, fontWeight: "700" },
  btnGhost: { backgroundColor: "transparent", borderWidth: 1, borderColor: palette.light.border },
  btnGhostText: { color: Colors.light.text, fontWeight: "600" },
});

export default ManageStudy;