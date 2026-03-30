import React, { useState, useCallback } from "react";
import { Colors, palette } from "@/constants/theme";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
} from "react-native";
import { useUser } from "@clerk/clerk-expo";
import { useFocusEffect, useRouter } from "expo-router";
import { getUserDetail, updateUser } from "./services/users/api";
import type { User } from "./services/users/api";
import { useAuth as localAuth } from "@/hooks/AuthContext";

const ProfileScreen: React.FC = () => {
  const { user: clerkUser, isLoaded } = useUser();
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = localAuth();

  // Editable name state
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const loadUserProfile = async () => {
        if (!isLoaded || !clerkUser) return;

        setIsLoading(true);
        setError(null);
        try {
          if (!user?.id) {
            setUserProfile(null);
            setError("No local user id found (please sign in again).");
            return;
          }

          const profile = await getUserDetail(Number(user.id));
          setUserProfile(profile);
          if (profile) setNameDraft(profile.name);
        } catch (e: any) {
          if (__DEV__) console.error("Failed to load user profile:", e);
          setError(`Failed to load profile: ${e.message || "Unknown error"}`);
        } finally {
          setIsLoading(false);
        }
      };

      loadUserProfile();
    }, [isLoaded, clerkUser, user?.id])
  );

  async function handleSaveName() {
    if (!userProfile || !user?.id) return;
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      Alert.alert("Invalid name", "Name cannot be empty.");
      return;
    }
    if (trimmed === userProfile.name) {
      setEditingName(false);
      return;
    }
    setSaving(true);
    try {
      const updated = await updateUser(String(user.id), {
        name: trimmed,
      });
      setUserProfile(updated);
      setNameDraft(updated.name);
      setEditingName(false);
    } catch (e: any) {
      const msg = e?.message ?? "Failed to save name";
      if (Platform.OS === "web") {
        window.alert(msg);
      } else {
        Alert.alert("Save failed", msg);
      }
    } finally {
      setSaving(false);
    }
  }

  function handleCancelEdit() {
    setNameDraft(userProfile?.name ?? "");
    setEditingName(false);
  }

  const renderReadOnlyDetail = (label: string, value: string | number | null | undefined) => (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value || "Not set"}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>My Profile</Text>

        {isLoading ? (
          <ActivityIndicator size="large" color={Colors.light.tint} style={{ marginTop: 20 }} />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : userProfile ? (
          <View style={styles.profileCard}>
            {/* Editable name field */}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Name</Text>
              {editingName ? (
                <View style={styles.editRow}>
                  <TextInput
                    style={styles.nameInput}
                    value={nameDraft}
                    onChangeText={setNameDraft}
                    autoFocus
                    editable={!saving}
                  />
                  <TouchableOpacity
                    style={[styles.saveBtn, saving && styles.disabledBtn]}
                    onPress={handleSaveName}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.saveBtnText}>Save</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleCancelEdit} disabled={saving}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.editableValue}
                  onPress={() => setEditingName(true)}
                >
                  <Text style={styles.detailValue}>{userProfile.name || "Not set"}</Text>
                  <Text style={styles.editHint}>Edit</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Read-only fields */}
            {renderReadOnlyDetail("Email", userProfile.email)}
            {renderReadOnlyDetail("Role", userProfile.roleName)}
          </View>
        ) : (
          <Text style={styles.errorText}>
            No profile data found in the database for your account.
          </Text>
        )}

        {/* Legal footer */}
        <View style={styles.legalFooter}>
          <TouchableOpacity onPress={() => router.push('/terms-of-service')}>
            <Text style={styles.legalLink}>Terms of Service</Text>
          </TouchableOpacity>
          <Text style={styles.legalSep}>·</Text>
          <TouchableOpacity onPress={() => router.push('/privacy-policy')}>
            <Text style={styles.legalLink}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.light.surface },
  container: { padding: 24 },
  title: { fontSize: 28, fontWeight: "bold", color: Colors.light.text, marginBottom: 24 },
  profileCard: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 20,
    shadowColor: Colors.light.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: palette.light.muted,
  },
  detailLabel: { fontSize: 16, color: palette.light.text.secondary, fontWeight: "500" },
  detailValue: { fontSize: 16, color: Colors.light.text, fontWeight: "600" },
  editableValue: { flexDirection: "row", alignItems: "center", gap: 8 },
  editHint: { fontSize: 13, color: Colors.light.tint, fontWeight: "600" },
  editRow: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1, justifyContent: "flex-end" },
  nameInput: {
    borderWidth: 1,
    borderColor: palette.light.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.text,
    minWidth: 140,
    backgroundColor: palette.light.surface,
  },
  saveBtn: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  saveBtnText: { color: "#FFFFFF", fontWeight: "600", fontSize: 14 },
  disabledBtn: { opacity: 0.6 },
  cancelText: { fontSize: 14, color: palette.light.text.secondary, fontWeight: "500" },
  errorText: {
    textAlign: "center",
    padding: 20,
    fontSize: 16,
    color: palette.light.danger,
    fontWeight: "bold",
  },
  legalFooter: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 32,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: palette.light.muted,
    gap: 8,
  },
  legalLink: { fontSize: 13, color: palette.light.text.secondary, fontWeight: "500" },
  legalSep: { fontSize: 13, color: palette.light.text.muted },
});

export default ProfileScreen;
