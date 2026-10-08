import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import LeafletMap, { LeafletHandle } from "../src/components/LeafletMap";
import { useAuth } from "../src/contexts/AuthContext";
import { api } from "../src/services/api";
import { Colors } from "../src/constants/colors";

// ─── Types / helpers ──────────────────────────────────────────────────────────

type Addr = {
  id: string;
  label: "home" | "work" | "other";
  is_default: boolean;
  flat: string;
  building: string;
  tower?: string;
  full_address: string;
  area: string;
  city: string;
  pincode: string;
  landmark: string;
  lat: number | null;
  lng: number | null;
};

type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

const DEFAULT_REGION: Region = {
  latitude: 28.6692,
  longitude: 77.4538,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

const blankAddr = (isDefault: boolean): Addr => ({
  id: `addr_${Date.now()}`,
  label: "home",
  is_default: isDefault,
  flat: "",
  building: "",
  full_address: "",
  area: "",
  city: "",
  pincode: "",
  landmark: "",
  lat: null,
  lng: null,
});

const loadAddresses = (user: any): Addr[] => {
  const list = Array.isArray(user?.addresses) ? user.addresses : [];
  const mapped: Addr[] = list.map((a: any, i: number) => ({
    ...blankAddr(false),
    ...a,
    building: a.building || a.tower || "",
    id: a.id || `addr_${i}`,
  }));
  if (!mapped.length && user?.address && typeof user.address === "object") {
    mapped.push({
      ...blankAddr(true),
      ...user.address,
      building: user.address.building || user.address.tower || "",
      id: user.address.id || "addr_default",
    });
  }
  if (mapped.length && !mapped.some((a) => a.is_default))
    mapped[0].is_default = true;
  return mapped;
};

const formatAddr = (a: any) =>
  [a?.flat, a?.building || a?.tower, a?.area, a?.city, a?.pincode]
    .filter(Boolean)
    .join(", ");

const reverse = async (lat: number, lng: number): Promise<Partial<Addr>> => {
  const patch: Partial<Addr> = { lat, lng };
  try {
    const [r] = await Location.reverseGeocodeAsync({
      latitude: lat,
      longitude: lng,
    });
    if (r) {
      patch.area = r.district || r.subregion || r.street || "";
      patch.city = r.city || r.subregion || "";
      patch.pincode = r.postalCode || "";
      patch.full_address = [
        r.name,
        r.street,
        r.district,
        r.city,
        r.region,
        r.postalCode,
      ]
        .filter(Boolean)
        .join(", ");
    }
  } catch {}
  return patch;
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CustomerAddressesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: winH } = useWindowDimensions();
  const params = useLocalSearchParams<{
    addressRequired?: string;
    returnTo?: string;
  }>();
  const { user, updateUser } = useAuth();

  const mapRef = useRef<LeafletHandle>(null);
  const [addresses, setAddresses] = useState<Addr[]>(() => loadAddresses(user));
  const [listQuery, setListQuery] = useState("");
  const [mapQuery, setMapQuery] = useState("");
  const [mapOpen, setMapOpen] = useState(false);
  const [step, setStep] = useState<"map" | "details">("map");
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Addr>(blankAddr(true));

  const setField = (k: keyof Addr, v: any) =>
    setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    setAddresses(loadAddresses(user));
  }, [(user as any)?.addresses, (user as any)?.address]);

  // ── location helpers
  const goToDetails = async (lat: number, lng: number) => {
   mapRef.current?.flyTo(lat, lng);
    const patch = await reverse(lat, lng);
    setForm((f) => ({ ...f, ...patch }));
    setStep("details");
  };

  const useCurrentLocation = async () => {
    setBusy(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Please allow location access.");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      await goToDetails(pos.coords.latitude, pos.coords.longitude);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not get location");
    } finally {
      setBusy(false);
    }
  };

  // search inside the map modal
  const searchInMap = async () => {
    if (!mapQuery.trim()) return;
    setBusy(true);
    try {
      const res = await Location.geocodeAsync(mapQuery.trim());
      if (!res.length) {
        Alert.alert("Not found", "Try a more specific search.");
        return;
      }
      await goToDetails(res[0].latitude, res[0].longitude);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Search failed");
    } finally {
      setBusy(false);
    }
  };

  // search on the list screen → opens details for that place
  const searchFromList = async () => {
    if (!listQuery.trim()) return;
    setBusy(true);
    try {
      const res = await Location.geocodeAsync(listQuery.trim());
      if (!res.length) {
        Alert.alert("Not found", "Try a more specific search.");
        return;
      }
      const { latitude, longitude } = res[0];
      const patch = await reverse(latitude, longitude);
      setEditingId(null);
      setForm({ ...blankAddr(addresses.length === 0), ...patch });
      setRegion({
        latitude,
        longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });
      setMapQuery("");
      setStep("details");
      setMapOpen(true);
      setListQuery("");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Search failed");
    } finally {
      setBusy(false);
    }
  };

  const confirmPin = () => goToDetails(region.latitude, region.longitude);

 const openNew = () => {
  setEditingId(null);
  setForm(blankAddr(addresses.length === 0));
  setRegion(DEFAULT_REGION); // ADD
  setMapQuery("");
  setStep("map");
  setMapOpen(true);
};

const openEdit = (a: Addr) => {
  setEditingId(a.id);
  setForm(a);
  if (a.lat && a.lng) {
    setRegion({
      latitude: a.lat,
      longitude: a.lng,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    });
  } else {
    setRegion(DEFAULT_REGION); // ADD
  }
  setStep("details");
  setMapOpen(true);
};

  // ── persist
  const persist = async (list: Addr[]) => {
    const def = list.find((a) => a.is_default) || list[0] || null;
    const normalized = list.map((a) => ({
      ...a,
      is_default: def ? a.id === def.id : false,
    }));
    const address = normalized.find((a) => a.is_default) || null;
    await api.updateProfile({ address, addresses: normalized });
    updateUser({ address, addresses: normalized } as any);
    setAddresses(normalized);
  };

  const saveAddress = async () => {
    if (!form.flat.trim() || !form.building.trim()) {
      Alert.alert("Missing details", "Flat and building are required.");
      return;
    }
    if (!form.lat || !form.lng) {
      Alert.alert("Pick location", "Please select a location on the map.");
      return;
    }
    const payload: Addr = {
      ...form,
      flat: form.flat.trim(),
      building: form.building.trim(),
      tower: form.building.trim(),
      area: form.area.trim(),
      city: form.city.trim(),
      pincode: form.pincode.trim(),
      landmark: form.landmark.trim(),
    };
    setSaving(true);
    try {
      let list = editingId
        ? addresses.map((a) => (a.id === editingId ? payload : a))
        : [...addresses, payload];
      if (payload.is_default) {
        list = list.map((a) => ({ ...a, is_default: a.id === payload.id }));
      }
      await persist(list);
      setMapOpen(false);
      if (params.returnTo === "catalog") {
        router.replace("/(customer)/catalog" as any);
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not save address");
    } finally {
      setSaving(false);
    }
  };

  const setDefault = async (a: Addr) => {
    try {
      await persist(
        addresses.map((x) => ({ ...x, is_default: x.id === a.id })),
      );
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not update default");
    }
  };

  const removeAddress = (a: Addr) =>
    Alert.alert("Delete address", "Remove this saved address?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const rest = addresses.filter((x) => x.id !== a.id);
            if (rest.length && !rest.some((x) => x.is_default))
              rest[0].is_default = true;
            await persist(rest);
          } catch (e: any) {
            Alert.alert("Error", e?.message || "Could not delete");
          }
        },
      },
    ]);

  // ─── UI ─────────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </TouchableOpacity>
        <Text style={s.title}>Delivery Addresses</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      >
        {params.addressRequired === "1" && addresses.length === 0 && (
          <View style={s.requiredCard}>
            <Ionicons name="location" size={18} color="#dc2626" />
            <Text style={s.requiredText}>
              Please add your delivery address before placing an order.
            </Text>
          </View>
        )}

        {/* search */}
        <View style={s.searchBox}>
          <Ionicons name="search" size={18} color="#888" />
          <TextInput
            style={s.searchInput}
            placeholder="Search area, street, landmark"
            value={listQuery}
            onChangeText={setListQuery}
            returnKeyType="search"
            onSubmitEditing={searchFromList}
          />
          {busy ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            !!listQuery && (
              <TouchableOpacity onPress={searchFromList}>
                <Text style={{ color: Colors.primary, fontWeight: "800" }}>
                  Go
                </Text>
              </TouchableOpacity>
            )
          )}
        </View>

        {/* add address */}
        <TouchableOpacity
          style={s.addBtn}
          onPress={openNew}
          activeOpacity={0.85}
        >
          <Ionicons name="add-circle" size={20} color="#fff" />
          <Text style={s.addBtnText}>Add new address</Text>
        </TouchableOpacity>

        {/* saved */}
        <Text style={s.section}>SAVED ADDRESSES</Text>

        {addresses.length === 0 && (
          <TouchableOpacity style={s.emptyCard} onPress={openNew}>
            <Ionicons
              name="location-outline"
              size={28}
              color={Colors.primary}
            />
            <Text style={s.emptyTitle}>No address added yet</Text>
            <Text style={s.emptyText}>
              Add your delivery address to order faster.
            </Text>
          </TouchableOpacity>
        )}

        {addresses.map((a) => (
          <View key={a.id} style={s.addrCard}>
            <View style={s.addrTop}>
              <View style={s.badge}>
                <Ionicons
                  name={
                    a.label === "work"
                      ? "briefcase-outline"
                      : a.label === "other"
                        ? "location-outline"
                        : "home-outline"
                  }
                  size={13}
                  color={Colors.primary}
                />
                <Text style={s.badgeText}>{a.label.toUpperCase()}</Text>
              </View>
              {a.is_default && (
                <View style={s.defBadge}>
                  <Text style={s.defText}>DEFAULT</Text>
                </View>
              )}
            </View>

            <Text style={s.addrText}>{formatAddr(a) || a.full_address}</Text>
            {!!a.landmark && <Text style={s.sub}>Landmark: {a.landmark}</Text>}
            {a.lat && a.lng ? (
              <Text style={s.sub}>
                📍 {Number(a.lat).toFixed(5)}, {Number(a.lng).toFixed(5)}
              </Text>
            ) : (
              <Text style={[s.sub, { color: "#dc2626" }]}>
                Location not pinned. Tap Edit.
              </Text>
            )}

            <View style={s.actions}>
              {!a.is_default && (
                <TouchableOpacity
                  style={s.actionBtn}
                  onPress={() => setDefault(a)}
                >
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={15}
                    color={Colors.primary}
                  />
                  <Text style={s.actionText}>Set Default</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={s.actionBtn} onPress={() => openEdit(a)}>
                <Ionicons name="create-outline" size={15} color="#2563eb" />
                <Text style={[s.actionText, { color: "#2563eb" }]}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.actionBtn}
                onPress={() => removeAddress(a)}
              >
                <Ionicons name="trash-outline" size={15} color="#dc2626" />
                <Text style={[s.actionText, { color: "#dc2626" }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* ── Map + details modal ── */}
      <Modal
        visible={mapOpen}
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setMapOpen(false)}
      >
        <View style={{ flex: 1 }}>
          <StatusBar style="dark" translucent />
<View
  style={StyleSheet.absoluteFill}
  pointerEvents={step === "map" ? "auto" : "none"}
>
  <LeafletMap
    ref={mapRef}
    lat={region.latitude}
    lng={region.longitude}
    onMove={(la, ln) =>
      setRegion((r) => ({ ...r, latitude: la, longitude: ln }))
    }
  />
</View>

          {step === "map" && (
            <View pointerEvents="none" style={s.pinWrap}>
              <Ionicons name="location" size={42} color={Colors.primary} />
            </View>
          )}

          {/* top: close + search */}
          <View
            style={[s.topBar, { paddingTop: insets.top + 8 }]}
            pointerEvents="box-none"
          >
            <TouchableOpacity
              style={s.roundBtn}
              onPress={() => setMapOpen(false)}
            >
              <Ionicons name="close" size={20} color="#111" />
            </TouchableOpacity>
            {step === "map" && (
              <View style={s.mapSearchBox}>
                <Ionicons name="search" size={18} color="#888" />
                <TextInput
                  style={s.searchInput}
                  placeholder="Search area, street, landmark"
                  value={mapQuery}
                  onChangeText={setMapQuery}
                  returnKeyType="search"
                  onSubmitEditing={searchInMap}
                />
                {!!mapQuery && (
                  <TouchableOpacity onPress={searchInMap}>
                    <Text style={{ color: Colors.primary, fontWeight: "800" }}>
                      Go
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* step 1 buttons */}
          {step === "map" && (
            <View
              style={[
                s.bottom,
                { bottom: Platform.OS === "ios" ? 12 + insets.bottom : 24 },
              ]}
            >
              <TouchableOpacity
                style={s.primaryBtn}
                onPress={useCurrentLocation}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="navigate" size={18} color="#fff" />
                    <Text style={s.primaryText}>Use current location</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={s.ghostBtn}
                onPress={confirmPin}
                disabled={busy}
              >
                <Text style={s.ghostText}>Confirm pin location</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* step 2 details */}
          {step === "details" && (
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              style={s.sheetWrap}
            >
              <View
                style={[
                  s.sheet,
                  {
                    maxHeight: winH * 0.6,
                    paddingBottom: Platform.OS === "ios" ? insets.bottom : 2,
                  },
                ]}
              >
                <View style={s.handle} />
                <ScrollView
                  style={{ flexShrink: 1 }}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  <View style={s.locRow}>
                    <Ionicons
                      name="location"
                      size={18}
                      color={Colors.primary}
                    />
                    <Text style={s.locText} numberOfLines={2}>
                      {form.full_address || "Selected location"}
                    </Text>
                    <TouchableOpacity onPress={() => setStep("map")}>
                      <Text
                        style={{ color: Colors.primary, fontWeight: "800" }}
                      >
                        Change
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={s.chipRow}>
                    {(["home", "work", "other"] as const).map((l) => (
                      <TouchableOpacity
                        key={l}
                        style={[s.chip, form.label === l && s.chipActive]}
                        onPress={() => setField("label", l)}
                      >
                        <Text
                          style={[
                            s.chipText,
                            form.label === l && { color: "#fff" },
                          ]}
                        >
                          {l.charAt(0).toUpperCase() + l.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={s.row2}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.lbl}>Flat / House no. *</Text>
                      <TextInput
                        style={s.input}
                        value={form.flat}
                        onChangeText={(v) => setField("flat", v)}
                        placeholder="e.g. 868"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.lbl}>Building / Society *</Text>
                      <TextInput
                        style={s.input}
                        value={form.building}
                        onChangeText={(v) => setField("building", v)}
                        placeholder="e.g. Tower B"
                      />
                    </View>
                  </View>

                  <Text style={s.lbl}>Area</Text>
                  <TextInput
                    style={s.input}
                    value={form.area}
                    onChangeText={(v) => setField("area", v)}
                  />

                  <View style={s.row2}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.lbl}>City</Text>
                      <TextInput
                        style={s.input}
                        value={form.city}
                        onChangeText={(v) => setField("city", v)}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.lbl}>Pincode</Text>
                      <TextInput
                        style={s.input}
                        value={form.pincode}
                        onChangeText={(v) =>
                          setField("pincode", v.replace(/\D/g, "").slice(0, 6))
                        }
                        keyboardType="number-pad"
                        maxLength={6}
                      />
                    </View>
                  </View>

                  <Text style={s.lbl}>Landmark (optional)</Text>
                  <TextInput
                    style={s.input}
                    value={form.landmark}
                    onChangeText={(v) => setField("landmark", v)}
                  />

                  <View style={s.row2}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.lbl}>Latitude</Text>
                      <TextInput
                        style={[s.input, s.readonly]}
                        value={
                          form.lat != null ? Number(form.lat).toFixed(6) : ""
                        }
                        editable={false}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.lbl}>Longitude</Text>
                      <TextInput
                        style={[s.input, s.readonly]}
                        value={
                          form.lng != null ? Number(form.lng).toFixed(6) : ""
                        }
                        editable={false}
                      />
                    </View>
                  </View>

                  <TouchableOpacity
                    style={s.defRow}
                    onPress={() => setField("is_default", !form.is_default)}
                  >
                    <View
                      style={[
                        s.check,
                        form.is_default && { backgroundColor: Colors.primary },
                      ]}
                    >
                      {form.is_default && (
                        <Ionicons name="checkmark" size={14} color="#fff" />
                      )}
                    </View>
                    <Text style={{ fontWeight: "700", color: "#111" }}>
                      Set as default address
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[s.primaryBtn, { marginTop: 14 }]}
                    onPress={saveAddress}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={s.primaryText}>Save address</Text>
                    )}
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F6F8" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#EEF0F3",
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 18, fontWeight: "900", color: "#111827" },

  requiredCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    marginBottom: 14,
  },
  requiredText: { flex: 1, fontSize: 13, fontWeight: "800", color: "#991B1B" },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: "#EEF0F3",
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#111" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 14,
  },
  addBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  section: {
    fontSize: 11,
    fontWeight: "800",
    color: "#999",
    letterSpacing: 1,
    marginTop: 22,
    marginBottom: 10,
  },
  emptyCard: {
    alignItems: "center",
    padding: 24,
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#BFD7C7",
  },
  emptyTitle: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: "900",
    color: "#111827",
  },
  emptyText: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    textAlign: "center",
  },

  addrCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#EEF0F3",
  },
  addrTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#EEF8F1",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: { fontSize: 10, fontWeight: "900", color: Colors.primary },
  defBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  defText: { fontSize: 10, fontWeight: "900", color: "#fff" },
  addrText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    lineHeight: 20,
  },
  sub: { fontSize: 12, color: "#64748B", marginTop: 4 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: "#F9FAFB",
  },
  actionText: { fontSize: 12, fontWeight: "900", color: Colors.primary },

  // map modal
  pinWrap: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -21,
    marginTop: -42,
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
  },
  roundBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  mapSearchBox: {
    flex: 1,
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 22,
    paddingHorizontal: 14,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  bottom: { position: "absolute", left: 16, right: 16, gap: 10 },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 15,
  },
  primaryText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  ghostBtn: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 13,
    elevation: 3,
  },
  ghostText: { color: Colors.primary, fontWeight: "800", fontSize: 14 },

  sheetWrap: { position: "absolute", left: 0, right: 0, bottom: 0 },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    maxHeight: "65%",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
    alignSelf: "center",
    marginBottom: 14,
  },
  locRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F8FBF7",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  locText: { flex: 1, fontSize: 13, fontWeight: "600", color: "#111827" },
  chipRow: { flexDirection: "row", gap: 8, marginBottom: 6 },
  chip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary + "33",
    backgroundColor: Colors.primary + "08",
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 12, fontWeight: "800", color: Colors.primary },
  row2: { flexDirection: "row", gap: 10 },
  lbl: {
    fontSize: 11,
    fontWeight: "700",
    color: "#888",
    marginTop: 12,
    marginBottom: 5,
  },
  input: {
    backgroundColor: "#F8F8FA",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: "#111",
    borderWidth: 1,
    borderColor: "#eee",
  },
  readonly: { color: "#94A3B8" },
  defRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 16,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});
