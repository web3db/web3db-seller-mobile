
import React, { useEffect, useState } from "react";
import { Picker } from '@react-native-picker/picker';

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
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { updateTrnPosting } from "../../services/postings/api";

type Metric = { id: number; displayName: string };
type HealthCondition = { id: number; displayName: string };
type Study = {
  postingId: number;
  buyerUserId: number;
  buyerDisplayName: string;
  postingStatusId: number;
  postingStatusDisplayName: string;
  title: string;
  summary: string;
  description: string | null;
  applyOpenAt: string | null;
  applyCloseAt: string | null;
  dataCoverageDaysRequired: number | null;
  minAge: number;
  rewardTypeId: number | null;
  rewardTypeDisplayName: string | null;
  metrics: Metric[];
  viewPolicies: any[];
  healthConditions: HealthCondition[];
  tags: string[];
  images: any[];
  isActive: boolean;
  isModified: boolean | null;
  createdOn: string | null;
  modifiedOn: string | null;
};

const ManageStudy: React.FC = () => {
  const { studyId } = useLocalSearchParams() as { studyId?: string };
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isNarrow = width < 720;

  // form state (pre-filled, will be set after fetch)
  const [postingStatusId, setPostingStatusId] = useState<number>(1);
  const [postingStatusDisplayName, setPostingStatusDisplayName] = useState("");
  const [postingStatusCode, setPostingStatusCode] = useState<string>("Draft");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [applyOpenAt, setApplyOpenAt] = useState<string | null>(null);
  const [applyCloseAt, setApplyCloseAt] = useState<string | null>(null);
  const [dataCoverageDaysRequired, setDataCoverageDaysRequired] = useState("");
  const [minAge, setMinAge] = useState("");
  const [rewardTypeId, setRewardTypeId] = useState("");
  const [rewardTypeDisplayName, setRewardTypeDisplayName] = useState("");
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [healthConditions, setHealthConditions] = useState<HealthCondition[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [isModified, setIsModified] = useState<boolean | null>(null);
  const [createdOn, setCreatedOn] = useState<string | null>(null);
  const [modifiedOn, setModifiedOn] = useState<string | null>(null);
  const [postingId, setPostingId] = useState<number | null>(null);
  const [buyerUserId, setBuyerUserId] = useState<number | null>(null);
  const [buyerDisplayName, setBuyerDisplayName] = useState<string>("");
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    async function fetchStudyDetail() {
      if (!studyId) return;
      setLoading(true);
      try {
        // Hardcoded buyerId for now (should be dynamic in real app)
        const buyerId = 3;
        const endpoint = `/buyers_postings_detail/${buyerId}/${studyId}`;
        // Use the same FUNCTIONS_BASE as in api.ts
        const { FUNCTIONS_BASE } = await import("../../services/postings/api");
        const url = `${FUNCTIONS_BASE}${endpoint}`;
        const res = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
        if (!res.ok) throw new Error(`Failed to fetch study detail: ${res.status}`);
        const data = await res.json();
        // If the API returns an array, use the first item
        const detail = Array.isArray(data) ? data[0] : data;
        if (detail) {
          setPostingId(Number(detail.postingId));
          setTitle(detail.title ?? "");
          setSummary(detail.summary ?? "");
          setDescription(detail.description ?? "");
          setPostingStatusId(detail.postingStatusId ?? 1);
          setPostingStatusDisplayName(detail.postingStatusDisplayName ?? "");
          // Set postingStatusCode based on displayName or id
          if (detail.postingStatusDisplayName) {
            const codeMap: Record<string, string> = {
              "Draft": "Draft",
              "Open": "Open",
              "Paused": "Paused",
              "Closed": "Closed",
              "Archived": "Archived",
            };
            setPostingStatusCode(codeMap[detail.postingStatusDisplayName] || "Draft");
          } else if (detail.postingStatusId) {
            const idMap: Record<number, string> = {
              1: "Draft",
              2: "Open",
              3: "Paused",
              4: "Closed",
              5: "Archived",
            };
            setPostingStatusCode(idMap[detail.postingStatusId] || "Draft");
          } else {
            setPostingStatusCode("Draft");
          }
          setApplyOpenAt(detail.applyOpenAt ?? null);
          setApplyCloseAt(detail.applyCloseAt ?? null);
          setDataCoverageDaysRequired(detail.dataCoverageDaysRequired ? String(detail.dataCoverageDaysRequired) : "");
          setMinAge(detail.minAge ? String(detail.minAge) : "");
          setRewardTypeId(detail.rewardTypeId ? String(detail.rewardTypeId) : "");
          setRewardTypeDisplayName(detail.rewardTypeDisplayName ?? "");
          setMetrics(Array.isArray(detail.metrics) ? detail.metrics : []);
          setHealthConditions(Array.isArray(detail.healthConditions) ? detail.healthConditions : []);
          setTags(Array.isArray(detail.tags) ? detail.tags : []);
          setIsActive(detail.isActive ?? true);
          setIsModified(detail.isModified ?? null);
          setCreatedOn(detail.createdOn ?? null);
          setModifiedOn(detail.modifiedOn ?? null);
          setBuyerUserId(detail.buyerUserId ?? null);
          setBuyerDisplayName(detail.buyerDisplayName ?? "");
        }
      } catch (err) {
        // Optionally show error
      } finally {
        setLoading(false);
      }
    }
    fetchStudyDetail();
  }, [studyId]);

  // Tag management
  function addTag(tag: string) {
    if (tag && !tags.includes(tag)) setTags([...tags, tag]);
  }
  function removeTag(index: number) {
    setTags(tags.filter((_, i) => i !== index));
  }

  // Metric management
  function addMetric(metric: Metric) {
    setMetrics([...metrics, metric]);
  }
  function removeMetric(index: number) {
    setMetrics(metrics.filter((_, i) => i !== index));
  }

  // Health condition management
  function addHealthCondition(cond: HealthCondition) {
    setHealthConditions([...healthConditions, cond]);
  }
  function removeHealthCondition(index: number) {
    setHealthConditions(healthConditions.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (!postingId) {
      alert("No study loaded");
      return;
    }
    const payload = {
      postingStatusId: Number(postingStatusId),
      postingStatusDisplayName,
      postingStatusCode: postingStatusCode.toUpperCase(),
      title,
      summary,
      description,
      applyOpenAt,
      applyCloseAt,
      dataCoverageDaysRequired: dataCoverageDaysRequired ? Number(dataCoverageDaysRequired) : null,
      minAge: minAge ? Number(minAge) : 0,
      rewardTypeId: rewardTypeId ? Number(rewardTypeId) : null,
      rewardTypeDisplayName,
      metrics,
      viewPolicies: [],
      healthConditions,
      tags,
      images: [],
      isActive,
      isModified,
      createdOn,
      modifiedOn,
    };
    try {
      await updateTrnPosting(postingId, payload);
      router.replace(`/studies/${postingId}?saved=1`);
    } catch (err) {
      alert("Failed to save changes: " + (err instanceof Error ? err.message : String(err)));
    }
  }

  function handleCancel() {
    router.back();
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text>Loading study...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={[styles.contentRow, isNarrow ? styles.columnLayout : styles.rowLayout]}>
          {/* LEFT: Modern Form Card */}
          <View style={[styles.card, isNarrow ? styles.fullWidth : styles.leftColumn]}>
            <Text style={styles.heading}>Manage Study</Text>

            <Text style={styles.label}>Title</Text>
            <TextInput value={title} onChangeText={setTitle} style={styles.input} />

            <Text style={styles.label}>Summary</Text>
            <TextInput value={summary} onChangeText={setSummary} style={styles.input} />

            <Text style={styles.label}>Description</Text>
            <TextInput value={description ?? ""} onChangeText={setDescription} style={[styles.input, styles.multiline]} multiline />

            <Text style={styles.label}>Status</Text>
            <View style={styles.rowBetween}>
              <View style={[styles.input, { flex: 1, padding: 0, justifyContent: 'center' }]}> 
                <Picker
                  selectedValue={postingStatusCode}
                  onValueChange={(itemValue) => {
                    setPostingStatusCode(itemValue);
                    // Map code to id/displayName
                    const statusMap = {
                      Draft: { id: 1, displayName: "Draft", code: "DRAFT" },
                      Open: { id: 2, displayName: "Open", code: "OPEN" },
                      Paused: { id: 3, displayName: "Paused", code: "PAUSED" },
                      Closed: { id: 4, displayName: "Closed", code: "CLOSED" },
                      Archived: { id: 5, displayName: "Archived", code: "ARCHIVED" },
                    };
                    const status = statusMap[itemValue as keyof typeof statusMap] || statusMap.Draft;
                    setPostingStatusId(status.id);
                    setPostingStatusDisplayName(status.displayName.charAt(0).toUpperCase() + status.displayName.slice(1).toLowerCase());
                  }}
                  style={{ height: 40, width: '100%' }}
                >
                  <Picker.Item label="Draft" value="Draft" />
                  <Picker.Item label="Open" value="Open" />
                  <Picker.Item label="Paused" value="Paused" />
                  <Picker.Item label="Closed" value="Closed" />
                  <Picker.Item label="Archived" value="Archived" />
                </Picker>
              </View>
            </View>

            <Text style={styles.label}>Min Age</Text>
            <TextInput value={minAge} onChangeText={setMinAge} style={styles.input} keyboardType="numeric" />
{/* 
            <Text style={styles.label}>Reward Type</Text>
            <View style={styles.rowBetween}>
              <TextInput value={rewardTypeDisplayName ?? ""} onChangeText={setRewardTypeDisplayName} style={[styles.input, { flex: 1 }]} />
              <TextInput value={rewardTypeId ?? ""} onChangeText={setRewardTypeId} style={[styles.input, { width: 60, marginLeft: 8 }]} keyboardType="numeric" />
            </View> */}

            <Text style={styles.label}>Data Coverage Days Required</Text>
            <TextInput value={dataCoverageDaysRequired} onChangeText={setDataCoverageDaysRequired} style={styles.input} keyboardType="numeric" />

            <Text style={styles.label}>Apply Open At</Text>
            <TextInput
              value={applyOpenAt ?? ""}
              onChangeText={setApplyOpenAt}
              style={styles.input}
              placeholder="YYYY-MM-DD or ISO format"
            />

            <Text style={styles.label}>Apply Close At</Text>
            <TextInput
              value={applyCloseAt ?? ""}
              onChangeText={setApplyCloseAt}
              style={styles.input}
              placeholder="YYYY-MM-DD or ISO format"
            />

            {/* <Text style={styles.label}>Tags</Text>
            <View style={styles.rowBetween}>
              <TextInput placeholder="Add tag" style={[styles.input, { flex: 1 }]} onSubmitEditing={e => addTag(e.nativeEvent.text)} />
            </View>
            <View style={styles.participantsList}>
              {tags.length === 0 ? <Text style={styles.muted}>No tags</Text> : tags.map((tag, i) => (
                <View key={tag + i} style={styles.participantRow}>
                  <Text>{tag}</Text>
                  <TouchableOpacity onPress={() => removeTag(i)}><Text style={styles.removeText}>Remove</Text></TouchableOpacity>
                </View>
              ))}
            </View>

            <Text style={styles.label}>Metrics</Text>
            <View style={styles.rowBetween}>
              <TextInput placeholder="Metric name" style={[styles.input, { flex: 1 }]} onSubmitEditing={e => addMetric({ id: Date.now(), displayName: e.nativeEvent.text })} />
            </View>
            <View style={styles.participantsList}>
              {metrics.length === 0 ? <Text style={styles.muted}>No metrics</Text> : metrics.map((m, i) => (
                <View key={m.id + "-" + i} style={styles.participantRow}>
                  <Text>{m.displayName}</Text>
                  <TouchableOpacity onPress={() => removeMetric(i)}><Text style={styles.removeText}>Remove</Text></TouchableOpacity>
                </View>
              ))}
            </View> */}
{/* 
            <Text style={styles.label}>Health Conditions</Text>
            <View style={styles.rowBetween}>
              <TextInput placeholder="Condition name" style={[styles.input, { flex: 1 }]} onSubmitEditing={e => addHealthCondition({ id: Date.now(), displayName: e.nativeEvent.text })} />
            </View>
            <View style={styles.participantsList}>
              {healthConditions.length === 0 ? <Text style={styles.muted}>No conditions</Text> : healthConditions.map((c, i) => (
                <View key={c.id + "-" + i} style={styles.participantRow}>
                  <Text>{c.displayName}</Text>
                  <TouchableOpacity onPress={() => removeHealthCondition(i)}><Text style={styles.removeText}>Remove</Text></TouchableOpacity>
                </View>
              ))}
            </View> */}

            <View style={styles.formActions}>
              <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={handleSave}>
                <Text style={styles.btnPrimaryText}>Save Changes</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={handleCancel}>
                <Text style={styles.btnGhostText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* RIGHT: Stats Card */}
          <View style={[styles.card, isNarrow ? styles.fullWidth : styles.rightColumn]}>
            <Text style={styles.statHeading}>Study Statistics</Text>
            <View style={styles.statRow}>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{metrics.length}</Text>
                <Text style={styles.statLabel}>Metrics</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{healthConditions.length}</Text>
                <Text style={styles.statLabel}>Health Conditions</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{tags.length}</Text>
                <Text style={styles.statLabel}>Tags</Text>
              </View>
            </View>
            <View style={styles.metaBlock}>
              <Text style={styles.metaLabel}>Buyer</Text>
              <Text style={styles.metaValue}>{buyerDisplayName}</Text>
            </View>
            <View style={styles.metaBlock}>
              <Text style={styles.metaLabel}>Study ID</Text>
              <Text style={styles.metaValue}>{postingId}</Text>
            </View>
            <View style={styles.metaBlock}>
              <Text style={styles.metaLabel}>Status</Text>
              <Text style={styles.metaValue}>{postingStatusDisplayName}</Text>
            </View>
            <View style={styles.helpBox}>
              <Text style={styles.helpTitle}>Tips</Text>
              <Text style={styles.helpText}>All fields are editable. Use the form to update study details, tags, metrics, and conditions. Date pickers are provided for Open/close dates.</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* Styles */
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#ffffff" },
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
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    // drop shadow
    ...Platform.select({
      ios: {
        shadowColor: "#000",
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
  label: { fontSize: 14, marginTop: 8, marginBottom: 6, color: "#333" },
  input: {
    borderWidth: 1,
    borderColor: "#e6e6e6",
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#fafafa",
  },
  multiline: { height: 110, textAlignVertical: "top" as const },

  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  participantsList: { marginTop: 6 },

  participantRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f3f3",
  },
  removeText: { color: "#d00", fontWeight: "600" },

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
  btnPrimary: { backgroundColor: "#0b74ff" },
  btnPrimaryText: { color: "#fff", fontWeight: "700" },
  btnGhost: { backgroundColor: "transparent", borderWidth: 1, borderColor: "#cbd5e1" },
  btnGhostText: { color: "#374151", fontWeight: "600" },
  btnSmall: { backgroundColor: "#eef2ff", paddingHorizontal: 10 },
  btnSmallText: { color: "#4f46e5", fontWeight: "600" },

  toggleBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  toggleBtnActive: { backgroundColor: "#e6f2ff", borderColor: "#8fc9ff" },
  toggleText: { color: "#374151" },
  toggleTextActive: { color: "#0b74ff", fontWeight: "700" },

  /* Stats */
  statHeading: { fontSize: 16, fontWeight: "700", marginBottom: 12 },
  statRow: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  statBox: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    paddingVertical: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.04)",
  },
  statNumber: { fontSize: 28, fontWeight: "800" },
  statLabel: { color: "#6b7280", marginTop: 6 },

  metaBlock: { marginTop: 12 },
  metaLabel: { fontSize: 12, color: "#6b7280" },
  metaValue: { fontSize: 14, fontWeight: "600", marginTop: 4 },

  helpBox: {
    marginTop: 16,
    backgroundColor: "#f1f5f9",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.03)",
  },
  helpTitle: { fontWeight: "700", marginBottom: 6 },
  helpText: { color: "#374151" },

  muted: { color: "#8b8b8b" },
  metaText: { fontSize: 14, color: "#374151" },
});

export default ManageStudy;