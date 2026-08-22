import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  api,
  BusinessLocation,
  BusinessLocationCreate,
} from "../../src/services/api";
import { useAuth } from "../../src/contexts/AuthContext";

const C = {
  bg: "#FFF8F4",
  card: "#FFFFFF",
  primary: "#FF9675",
  dark: "#BB6B3F",
  accent: "#8B6854",
  muted: "#A07850",
  light: "#C9A882",
  peach: "#FFF3E8",
  deepPeach: "#FFE8D6",
  text: "#1A1A1A",
  green: "#16A34A",
  red: "#DC2626",
};

const emptyLocation: BusinessLocationCreate = {
  label: "",
  address_line: "",
  city: "",
  state: "",
  pincode: "",
  is_primary: false,
};

export default function BusinessInformationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ from?: string }>();
  const { user, updateUser, logout } = useAuth();
  const [businessName, setBusinessName] = useState(user?.name || "");
  const [supportContact, setSupportContact] = useState(user?.phone || "");
  const [locations, setLocations] = useState<BusinessLocation[]>([]);
  const [locationDraft, setLocationDraft] =
    useState<BusinessLocationCreate>(emptyLocation);
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [showLocationForm, setShowLocationForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);

  const primaryLocation = useMemo(
    () => locations.find((item) => item.is_primary) || locations[0],
    [locations],
  );

  const goBack = useCallback(() => {
    if (params.from === "settings") {
      router.replace("/(admin)/settings" as any);
      return;
    }
    router.back();
  }, [params.from, router]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        if (deleteModal) {
          setDeleteModal(false);
          return true;
        }
        goBack();
        return true;
      });
      return () => sub.remove();
    }, [deleteModal, goBack]),
  );

  useEffect(() => {
    setBusinessName(user?.name || "");
    setSupportContact(user?.phone || "");
  }, [user?.name, user?.phone]);

  const loadLocations = useCallback(async () => {
    try {
      const data = await api.getBusinessLocations();
      setLocations(Array.isArray(data) ? data : []);
    } catch (error: any) {
      Alert.alert("Could not load locations", error?.message || "Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  const syncCachedUser = async (updated: any) => {
    updateUser?.(updated);
    const cached = await AsyncStorage.getItem("user_data");
    if (cached) {
      const parsed = JSON.parse(cached);
      await AsyncStorage.setItem(
        "user_data",
        JSON.stringify({ ...parsed, ...updated }),
      );
    }
  };

  const saveProfile = async () => {
    const name = businessName.trim();
    const phone = supportContact.trim();
    if (!name) {
      Alert.alert("Business name required", "Please enter your business name.");
      return;
    }
    if (!phone) {
      Alert.alert("Support contact required", "Please enter your support contact.");
      return;
    }
    setSavingProfile(true);
    try {
      const result = await api.updateProfile({ name, phone });
      await syncCachedUser(result && typeof result === "object" ? result : { name, phone });
      Alert.alert("Saved", "Business information updated.");
    } catch (error: any) {
      Alert.alert("Update failed", error?.message || "Please try again.");
    } finally {
      setSavingProfile(false);
    }
  };

  const resetLocationForm = () => {
    setEditingLocationId(null);
    setLocationDraft(emptyLocation);
    setShowLocationForm(false);
  };

  const editLocation = (item: BusinessLocation) => {
    setEditingLocationId(item.id);
    setLocationDraft({
      label: item.label || "",
      address_line: item.address_line || "",
      city: item.city || "",
      state: item.state || "",
      pincode: item.pincode || "",
      is_primary: Boolean(item.is_primary),
    });
    setShowLocationForm(true);
  };

  const saveLocation = async () => {
    const payload: BusinessLocationCreate = {
      label: locationDraft.label.trim(),
      address_line: locationDraft.address_line.trim(),
      city: locationDraft.city.trim(),
      state: locationDraft.state.trim(),
      pincode: locationDraft.pincode?.trim() || "",
      is_primary: Boolean(locationDraft.is_primary),
    };
    if (!payload.label || !payload.address_line || !payload.city || !payload.state) {
      Alert.alert("Missing details", "Please fill label, address, city and state.");
      return;
    }
    setSavingLocation(true);
    try {
      if (editingLocationId) {
        await api.updateBusinessLocation(editingLocationId, payload);
      } else {
        await api.createBusinessLocation(payload);
      }
      resetLocationForm();
      await loadLocations();
      Alert.alert("Saved", editingLocationId ? "Location updated." : "Location added.");
    } catch (error: any) {
      Alert.alert("Save failed", error?.message || "Please try again.");
    } finally {
      setSavingLocation(false);
    }
  };

  const deleteLocation = (item: BusinessLocation) => {
    Alert.alert(
      "Delete Location?",
      `${item.label || "This location"} will be removed.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.deleteBusinessLocation(item.id);
              await loadLocations();
              if (editingLocationId === item.id) resetLocationForm();
            } catch (error: any) {
              Alert.alert("Delete failed", error?.message || "Please try again.");
            }
          },
        },
      ],
    );
  };

  const confirmDeleteAccount = () => {
    if (!deletePassword.trim()) {
      Alert.alert("Password required", "Enter your password to delete account.");
      return;
    }
    Alert.alert(
      "Delete Account",
      "This will permanently delete your account. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await api.deleteAccount(deletePassword);
              setDeleteModal(false);
              await logout();
            } catch (error: any) {
              Alert.alert("Delete failed", error?.message || "Could not delete account.");
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={s.screen}>
      <View style={[s.header, { paddingTop: Math.max(insets.top + 8, 18) }]}>
        <TouchableOpacity style={s.backBtn} onPress={goBack}>
          <Ionicons name="chevron-back" size={22} color={C.dark} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Business Information</Text>
          <Text style={s.subtitle}>Profile, support and business locations</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadLocations();
            }}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={s.heroCard}>
          <View style={s.heroIcon}>
            <Ionicons name="storefront-outline" size={24} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.heroTitle}>{businessName || "Business name"}</Text>
            <Text style={s.heroSub}>
              {primaryLocation
                ? `${primaryLocation.city}, ${primaryLocation.state}`
                : "Add your primary business location"}
            </Text>
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Business Profile</Text>
          <Text style={s.label}>Business Name</Text>
          <TextInput
            style={s.input}
            value={businessName}
            onChangeText={setBusinessName}
            placeholder="Enter business name"
            placeholderTextColor={C.light}
          />
          <Text style={s.label}>Support Contact</Text>
          <TextInput
            style={s.input}
            value={supportContact}
            onChangeText={setSupportContact}
            placeholder="Enter support phone number"
            placeholderTextColor={C.light}
            keyboardType="phone-pad"
          />
          <TouchableOpacity
            style={[s.primaryBtn, savingProfile && { opacity: 0.65 }]}
            onPress={saveProfile}
            disabled={savingProfile}
          >
            {savingProfile ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="save-outline" size={16} color="#fff" />
                <Text style={s.primaryTxt}>Save Business Profile</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={s.card}>
          <View style={s.sectionTop}>
            <View>
              <Text style={s.cardTitle}>Business Locations</Text>
              <Text style={s.cardSub}>{locations.length} saved location(s)</Text>
            </View>
            <TouchableOpacity
              style={s.smallBtn}
              onPress={() => {
                resetLocationForm();
                setShowLocationForm(true);
              }}
            >
              <Ionicons name="add" size={16} color={C.dark} />
              <Text style={s.smallBtnTxt}>New</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={s.centerBox}>
              <ActivityIndicator color={C.primary} />
              <Text style={s.emptyTxt}>Loading locations...</Text>
            </View>
          ) : locations.length ? (
            locations.map((item) => (
              <View key={item.id} style={s.locationCard}>
                <View style={{ flex: 1 }}>
                  <View style={s.locationTitleRow}>
                    <Text style={s.locationTitle}>{item.label}</Text>
                    {item.is_primary ? <Text style={s.primaryPill}>Primary</Text> : null}
                  </View>
                  <Text style={s.locationText}>
                    {[item.address_line, item.city, item.state, item.pincode]
                      .filter(Boolean)
                      .join(", ")}
                  </Text>
                </View>
                <View style={s.locationActions}>
                  <TouchableOpacity style={s.iconBtn} onPress={() => editLocation(item)}>
                    <Ionicons name="create-outline" size={16} color={C.dark} />
                  </TouchableOpacity>
                  <TouchableOpacity style={s.iconBtnDanger} onPress={() => deleteLocation(item)}>
                    <Ionicons name="trash-outline" size={16} color={C.red} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <View style={s.centerBox}>
              <Ionicons name="location-outline" size={30} color={C.light} />
              <Text style={s.emptyTxt}>No business locations added yet</Text>
            </View>
          )}

          {showLocationForm ? (
            <View style={s.locationForm}>
              <Text style={s.formTitle}>
                {editingLocationId ? "Edit Location" : "Add Location"}
              </Text>
              <TextInput
                style={s.input}
                value={locationDraft.label}
                onChangeText={(v) => setLocationDraft((d) => ({ ...d, label: v }))}
                placeholder="Label, e.g. Main Farm"
                placeholderTextColor={C.light}
              />
              <TextInput
                style={[s.input, s.textArea]}
                value={locationDraft.address_line}
                onChangeText={(v) =>
                  setLocationDraft((d) => ({ ...d, address_line: v }))
                }
                placeholder="Address"
                placeholderTextColor={C.light}
                multiline
              />
              <View style={s.inputRow}>
                <TextInput
                  style={[s.input, { flex: 1 }]}
                  value={locationDraft.city}
                  onChangeText={(v) => setLocationDraft((d) => ({ ...d, city: v }))}
                  placeholder="City"
                  placeholderTextColor={C.light}
                />
                <TextInput
                  style={[s.input, { flex: 1 }]}
                  value={locationDraft.state}
                  onChangeText={(v) => setLocationDraft((d) => ({ ...d, state: v }))}
                  placeholder="State"
                  placeholderTextColor={C.light}
                />
              </View>
              <TextInput
                style={s.input}
                value={locationDraft.pincode}
                onChangeText={(v) => setLocationDraft((d) => ({ ...d, pincode: v }))}
                placeholder="Pincode optional"
                placeholderTextColor={C.light}
                keyboardType="number-pad"
              />
              <TouchableOpacity
                style={s.checkRow}
                onPress={() =>
                  setLocationDraft((d) => ({ ...d, is_primary: !d.is_primary }))
                }
              >
                <Ionicons
                  name={locationDraft.is_primary ? "checkbox" : "square-outline"}
                  size={20}
                  color={locationDraft.is_primary ? C.green : C.muted}
                />
                <Text style={s.checkTxt}>Mark as primary business location</Text>
              </TouchableOpacity>
              <View style={s.formActions}>
                <TouchableOpacity style={s.cancelBtn} onPress={resetLocationForm}>
                  <Text style={s.cancelTxt}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.saveLocBtn, savingLocation && { opacity: 0.65 }]}
                  onPress={saveLocation}
                  disabled={savingLocation}
                >
                  {savingLocation ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={s.saveLocTxt}>
                      {editingLocationId ? "Update" : "Add"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </View>

        <TouchableOpacity
          style={s.deleteCard}
          onPress={() => {
            setDeletePassword("");
            setDeleteModal(true);
          }}
        >
          <View style={s.deleteIcon}>
            <Ionicons name="trash-outline" size={18} color={C.red} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.deleteTitle}>Delete Account</Text>
            <Text style={s.deleteSub}>Permanently remove this admin account</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#FCA5A5" />
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={deleteModal}
        transparent
        animationType="slide"
        onRequestClose={() => setDeleteModal(false)}
      >
        <KeyboardAvoidingView
          style={s.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={s.sheet}>
            <View style={s.drag} />
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Delete Account</Text>
              <TouchableOpacity style={s.closeBtn} onPress={() => setDeleteModal(false)}>
                <Ionicons name="close" size={16} color={C.dark} />
              </TouchableOpacity>
            </View>
            <Text style={s.sheetSub}>
              Enter your password to confirm permanent account deletion.
            </Text>
            <TextInput
              style={s.input}
              value={deletePassword}
              onChangeText={setDeletePassword}
              placeholder="Password"
              placeholderTextColor={C.light}
              secureTextEntry
            />
            <TouchableOpacity
              style={[s.deleteConfirmBtn, deleting && { opacity: 0.65 }]}
              onPress={confirmDeleteAccount}
              disabled={deleting}
            >
              {deleting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.deleteConfirmTxt}>Continue</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingBottom: 12,
    backgroundColor: C.bg,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.deepPeach,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 21, fontWeight: "900", color: C.text },
  subtitle: { marginTop: 2, fontSize: 12, fontWeight: "700", color: C.muted },
  content: { padding: 18, paddingBottom: 40 },
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: C.dark,
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: { fontSize: 17, fontWeight: "900", color: "#fff" },
  heroSub: { marginTop: 4, fontSize: 12, fontWeight: "700", color: "#FFE8D6" },
  card: {
    backgroundColor: C.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: C.deepPeach,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: { fontSize: 16, fontWeight: "900", color: C.text },
  cardSub: { marginTop: 3, fontSize: 12, fontWeight: "700", color: C.muted },
  label: {
    marginTop: 14,
    marginBottom: 7,
    fontSize: 11,
    fontWeight: "900",
    color: C.accent,
    textTransform: "uppercase",
  },
  input: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.deepPeach,
    backgroundColor: "#FFFDFB",
    paddingHorizontal: 13,
    fontSize: 14,
    fontWeight: "700",
    color: C.text,
  },
  textArea: { minHeight: 80, paddingTop: 12, textAlignVertical: "top" },
  primaryBtn: {
    marginTop: 16,
    minHeight: 48,
    borderRadius: 15,
    backgroundColor: C.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryTxt: { color: "#fff", fontSize: 14, fontWeight: "900" },
  sectionTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  smallBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.peach,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 999,
  },
  smallBtnTxt: { fontSize: 12, fontWeight: "900", color: C.dark },
  centerBox: { minHeight: 110, alignItems: "center", justifyContent: "center", gap: 8 },
  emptyTxt: { color: C.light, fontSize: 12, fontWeight: "800" },
  locationCard: {
    flexDirection: "row",
    gap: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "#FFFDFB",
    borderWidth: 1,
    borderColor: C.deepPeach,
    marginBottom: 10,
  },
  locationTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  locationTitle: { fontSize: 14, fontWeight: "900", color: C.text },
  primaryPill: {
    fontSize: 9,
    fontWeight: "900",
    color: C.green,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: "hidden",
  },
  locationText: { marginTop: 5, fontSize: 12, fontWeight: "700", color: C.muted },
  locationActions: { flexDirection: "row", gap: 7 },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: C.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnDanger: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  locationForm: {
    marginTop: 8,
    padding: 12,
    borderRadius: 18,
    backgroundColor: C.peach,
    gap: 10,
  },
  formTitle: { fontSize: 14, fontWeight: "900", color: C.text },
  inputRow: { flexDirection: "row", gap: 10 },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  checkTxt: { fontSize: 12, fontWeight: "800", color: C.muted },
  formActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelTxt: { fontSize: 13, fontWeight: "900", color: C.dark },
  saveLocBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: C.dark,
    alignItems: "center",
    justifyContent: "center",
  },
  saveLocTxt: { fontSize: 13, fontWeight: "900", color: "#fff" },
  deleteCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFF5F5",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FECACA",
    padding: 14,
  },
  deleteIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteTitle: { fontSize: 15, fontWeight: "900", color: C.red },
  deleteSub: { marginTop: 3, fontSize: 11, fontWeight: "700", color: "#991B1B" },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheet: {
    backgroundColor: C.card,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 18,
  },
  drag: {
    width: 42,
    height: 5,
    borderRadius: 999,
    backgroundColor: C.deepPeach,
    alignSelf: "center",
    marginBottom: 14,
  },
  sheetHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  sheetTitle: { flex: 1, fontSize: 18, fontWeight: "900", color: C.text },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: C.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetSub: { fontSize: 12, fontWeight: "700", color: C.muted, marginBottom: 12 },
  deleteConfirmBtn: {
    marginTop: 14,
    minHeight: 48,
    borderRadius: 15,
    backgroundColor: C.red,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteConfirmTxt: { color: "#fff", fontSize: 14, fontWeight: "900" },
});
