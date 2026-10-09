import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  Modal,
  Animated,
  ActivityIndicator,
  BackHandler,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import LeafletMap, { LeafletHandle } from "../../src/components/LeafletMap";
import { useRouter, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useAuth } from "../../src/contexts/AuthContext";
import { api } from "../../src/services/api";
import { Colors } from "../../src/constants/colors";
import Button from "../../src/components/Button";
import Input from "../../src/components/Input";
import CropModal from "../../src/components/CropModal";

// ─── Types / helpers ──────────────────────────────────────────────────────────

type Addr = {
  id: string;
  label: "home" | "work" | "other";
  is_default: boolean;
  flat: string;
  building: string;
  tower?: string; // = building, keeps old helpers working
  full_address: string;
  area: string;
  city: string;
  pincode: string;
  landmark: string;
  lat: number | null;
  lng: number | null;
};

const DEFAULT_REGION: Region = {
  latitude: 28.6692,
  longitude: 77.4538,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
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

// ─── Photo source sheet ───────────────────────────────────────────────────────

function PhotoSourceSheet({
  visible,
  onClose,
  onCamera,
  onGallery,
}: {
  visible: boolean;
  onClose: () => void;
  onCamera: () => void;
  onGallery: () => void;
}) {
  const slideAnim = useRef(new Animated.Value(300)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 70,
          friction: 11,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slideAnim.setValue(300);
      backdropAnim.setValue(0);
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={sheetStyles.overlayWrap}>
        <TouchableOpacity
          style={sheetStyles.backdropTouchable}
          activeOpacity={1}
          onPress={onClose}
        >
          <Animated.View
            style={[sheetStyles.backdrop, { opacity: backdropAnim }]}
          />
        </TouchableOpacity>

        <Animated.View
          style={[
            sheetStyles.sheet,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={sheetStyles.dragHandle} />
          <Text style={sheetStyles.title}>Change Profile Photo</Text>
          <Text style={sheetStyles.subtitle}>
            Choose where to pick your photo from
          </Text>

          <TouchableOpacity
            style={sheetStyles.optionRow}
            activeOpacity={0.75}
            onPress={onCamera}
          >
            <View
              style={[
                sheetStyles.optionIconBox,
                { backgroundColor: Colors.primary + "14" },
              ]}
            >
              <Ionicons name="camera" size={20} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={sheetStyles.optionTitle}>Take a Photo</Text>
              <Text style={sheetStyles.optionSub}>Use your camera</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
          </TouchableOpacity>

          <TouchableOpacity
            style={sheetStyles.optionRow}
            activeOpacity={0.75}
            onPress={onGallery}
          >
            <View
              style={[
                sheetStyles.optionIconBox,
                { backgroundColor: "#EEF4FF" },
              ]}
            >
              <Ionicons name="images" size={20} color="#4F7EFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={sheetStyles.optionTitle}>Choose from Gallery</Text>
              <Text style={sheetStyles.optionSub}>Pick an existing photo</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
          </TouchableOpacity>

          <TouchableOpacity
            style={sheetStyles.cancelBtn}
            activeOpacity={0.8}
            onPress={onClose}
          >
            <Text style={sheetStyles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const sheetStyles = StyleSheet.create({
  overlayWrap: { flex: 1, justifyContent: "flex-end" },
  backdropTouchable: { ...StyleSheet.absoluteFillObject },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
    alignSelf: "center",
    marginBottom: 18,
  },
  title: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 18,
    fontWeight: "500",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#F1F1F1",
  },
  optionIconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
  },
  optionTitle: { fontSize: 15, fontWeight: "800", color: "#111827" },
  optionSub: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
    fontWeight: "500",
  },
  cancelBtn: {
    marginTop: 6,
    height: 50,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  cancelText: { fontSize: 15, fontWeight: "800", color: "#6B7280" },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    returnTo?: string;
    addressRequired?: string;
  }>();
  const { user, updateUser } = useAuth();

  // profile fields
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [email, setEmail] = useState(user?.email || "");
  const [initialPassword, setInitialPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [canSetPassword, setCanSetPassword] = useState(user?.password_login_enabled === false);
  const passwordSaveLock = useRef(false);
  useFocusEffect(useCallback(() => {
    let active = true;
    void api.getMe().then(profile => {
      if (active) setCanSetPassword(profile.password_login_enabled === false);
    }).catch(() => {});
    return () => { active = false; };
  }, [user?.id]));
  const [farms, setFarms] = useState<Awaited<ReturnType<typeof api.getReferralDirectory>>>([]);
  const [farmOpen, setFarmOpen] = useState(false);
  const [farmLoading, setFarmLoading] = useState(false);
  const [farmError, setFarmError] = useState("");
  const farmLock = useRef(false);
  const linkedFarmId = user?.admin_id || user?.referral_admin_id;
  const linkedFarm = farms.find(farm => farm.admin_id === linkedFarmId);
  const loadFarms = useCallback(async () => {
    setFarmLoading(true); setFarmError("");
    try { setFarms(await api.getReferralDirectory()); }
    catch { setFarmError("Could not load gaushalas. Tap to retry."); }
    finally { setFarmLoading(false); }
  }, []);
  useEffect(() => { void loadFarms(); }, [loadFarms]);
  const connectFarm = (farm: (typeof farms)[number]) => {
    Alert.alert("Connect with Gaushala?", `Connect your account with ${farm.admin_name}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Connect", onPress: async () => {
        if (farmLock.current) return;
        farmLock.current = true; setFarmLoading(true);
        try {
          const result = await api.connectGaushala(farm.referral_code);
          updateUser({ admin_id: result.admin_id, referral_admin_id: result.admin_id });
          setFarmOpen(false);
        } catch (error: any) { Alert.alert("Could not connect", error?.message || "Please try again."); }
        finally { farmLock.current = false; setFarmLoading(false); }
      } },
    ]);
  };
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteExpanded, setDeleteExpanded] = useState(false);

  // photo
  const [photoSheetVisible, setPhotoSheetVisible] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(
    (user as any)?.profile_image || null,
  );
  const [uploadingImage, setUploadingImage] = useState(false);
  const [cropVisible, setCropVisible] = useState(false);
  const [rawImageUri, setRawImageUri] = useState<string | null>(null);
  const [rawImageSize, setRawImageSize] = useState<{
    w: number;
    h: number;
  } | null>(null);

  // location
  const mapRef = useRef<LeafletHandle>(null);
  const [addresses, setAddresses] = useState<Addr[]>(() => loadAddresses(user));
  const [mapOpen, setMapOpen] = useState(false);
  const [step, setStep] = useState<"map" | "details">("map");
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [savingAddr, setSavingAddr] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Addr>(blankAddr(true));

  const setField = (k: keyof Addr, v: any) =>
    setForm((f) => ({ ...f, [k]: v }));

  // keep list in sync if user changes elsewhere
  useEffect(() => {
    setAddresses(loadAddresses(user));
  }, [(user as any)?.addresses, (user as any)?.address]);

  // ── navigation
  const goBack = () => {
    if (params.returnTo === "catalog") {
      router.replace("/(customer)/catalog");
    } else {
      router.replace("/(customer)/profile");
    }
  };

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        if (cropVisible) return false;
        if (mapOpen) {
          setMapOpen(false);
          return true;
        }
        goBack();
        return true;
      });
      return () => sub.remove();
    }, [mapOpen, cropVisible, params.returnTo]),
  );
  // ── photo
  const pickImage = async (fromCamera: boolean) => {
    try {
      const permissionResult = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          "Permission needed",
          fromCamera
            ? "Camera permission is required."
            : "Gallery permission is required.",
        );
        return;
      }

      const result = fromCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: false,
            quality: 1,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: false,
            quality: 1,
          });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      setRawImageUri(asset.uri);
      setRawImageSize({ w: asset.width, h: asset.height });
      setCropVisible(true);
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Could not open picker");
    }
  };

  const handleCropDone = async (croppedUri: string) => {
    setCropVisible(false);
    setUploadingImage(true);
    setProfileImage(croppedUri);
    try {
      const uploaded = await api.uploadProfileImage(croppedUri);
      updateUser({ profile_image: uploaded.url } as any);
      setProfileImage(uploaded.url);
    } catch (error: any) {
      Alert.alert(
        "Could not update photo",
        error?.message || "Please try again.",
      );
    } finally {
      setUploadingImage(false);
      setRawImageUri(null);
      setRawImageSize(null);
    }
  };

  const handleChangePhoto = () => setPhotoSheetVisible(true);

const choosePhotoSource = (fromCamera: boolean) => {
  setPhotoSheetVisible(false);
  // slight delay so the sheet closes smoothly before the native picker opens
  setTimeout(() => pickImage(fromCamera), 200);
};

  const saveInitialPassword = async () => {
    if (saving || passwordSaveLock.current || !canSetPassword) return;
    if (initialPassword.length < 5) {
      Alert.alert("Password too short", "Use at least 5 characters.");
      return;
    }
    if (initialPassword !== confirmPassword) {
      Alert.alert("Passwords do not match", "Enter the same password in both fields.");
      return;
    }
    passwordSaveLock.current = true;
    setSaving(true);
    try {
      await api.setCustomerInitialPassword(initialPassword);
      setCanSetPassword(false);
      setInitialPassword(""); setConfirmPassword(""); setShowPassword(false);
      updateUser({ password_login_enabled: true });
      Alert.alert("Password set", "You can now sign in using your mobile number and password.");
    } catch (error: any) {
      Alert.alert("Could not set password", error?.message || "Please try again.");
    } finally { passwordSaveLock.current = false; setSaving(false); }
  };

  // ── profile save / delete
  const saveProfile = async () => {
    if (saving) return;
    if (canSetPassword && (initialPassword || confirmPassword)) {
      if (initialPassword.length < 5) {
        Alert.alert("Password too short", "Use at least 5 characters.");
        return;
      }
      if (initialPassword !== confirmPassword) {
        Alert.alert("Passwords do not match", "Enter the same password in both fields.");
        return;
      }
    }
    if (!name.trim()) {
      Alert.alert("Name required", "Please enter your name.");
      return;
    }
    setSaving(true);
    try {
      await api.updateProfile({
        name: name.trim(),
        phone: phone.trim(),
        ...(email.trim() ? { email: email.trim() } : {}),
      });
      if (canSetPassword && initialPassword) {
        await api.setCustomerInitialPassword(initialPassword);
        setCanSetPassword(false);
        setInitialPassword(""); setConfirmPassword(""); setShowPassword(false);
      }
      updateUser({ name: name.trim(), phone: phone.trim(), email: email.trim(), ...(initialPassword ? { password_login_enabled: true } : {}) } as any);
      await api.updateProfile({ name: name.trim(), phone: phone.trim() });
      updateUser({ name: name.trim(), phone: phone.trim() } as any);
      Alert.alert("Profile updated", "Your profile has been saved.", [
        { text: "OK", onPress: () => goBack() },
      ]);
    } catch (error: any) {
      Alert.alert(
        "Could not update profile",
        error?.message || "Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteAccount = () => {
    if (!password.trim()) {
      Alert.alert(
        "Password required",
        "Enter your password to delete your account.",
      );
      return;
    }
    Alert.alert(
      "Delete Account?",
      "This will permanently delete your Gau Satva account and personal profile data. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await api.deleteAccount(password);
              router.replace("/(auth)/login");
            } catch (error: any) {
              Alert.alert(
                "Could not delete account",
                error?.message || "Please check your password and try again.",
              );
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  // ── location helpers
  const resolveLocation = async (lat: number, lng: number) => {
    mapRef.current?.flyTo(lat, lng);
    let patch: Partial<Addr> = { lat, lng };
    try {
      const [r] = await Location.reverseGeocodeAsync({
        latitude: lat,
        longitude: lng,
      });
      if (r) {
        patch = {
          ...patch,
          area: r.district || r.subregion || r.street || "",
          city: r.city || r.subregion || "",
          pincode: r.postalCode || "",
          full_address: [
            r.name,
            r.street,
            r.district,
            r.city,
            r.region,
            r.postalCode,
          ]
            .filter(Boolean)
            .join(", "),
        };
      }
    } catch {}
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
      await resolveLocation(pos.coords.latitude, pos.coords.longitude);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not get location");
    } finally {
      setBusy(false);
    }
  };

  const searchPlace = async () => {
    if (!query.trim()) return;
    setBusy(true);
    try {
      const res = await Location.geocodeAsync(query.trim());
      if (!res.length) {
        Alert.alert("Not found", "Try a more specific search.");
        return;
      }
      await resolveLocation(res[0].latitude, res[0].longitude);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Search failed");
    } finally {
      setBusy(false);
    }
  };

  const confirmPin = () => resolveLocation(region.latitude, region.longitude);

  const openNewAddress = () => {
    setEditingId(null);
    setForm(blankAddr(addresses.length === 0));
     setRegion(DEFAULT_REGION);
    setQuery("");
    setStep("map");
    setMapOpen(true);
  };

  const openEditAddress = (a: Addr) => {
    setEditingId(a.id);
    setForm(a);
    if (a.lat && a.lng) {
      setRegion({
        latitude: a.lat,
        longitude: a.lng,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });
    }else {
    setRegion(DEFAULT_REGION); // 👈 ADD
  }
    setStep("details");
    setMapOpen(true);
  };

  const persistAddresses = async (list: Addr[]) => {
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
    setSavingAddr(true);
    try {
      let list = editingId
        ? addresses.map((a) => (a.id === editingId ? payload : a))
        : [...addresses, payload];
      if (payload.is_default) {
        list = list.map((a) => ({ ...a, is_default: a.id === payload.id }));
      }
      await persistAddresses(list);
      setMapOpen(false);
      if (params.returnTo === "catalog") {
        router.replace("/(customer)/catalog");
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not save address");
    } finally {
      setSavingAddr(false);
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
            await persistAddresses(rest);
          } catch (e: any) {
            Alert.alert("Error", e?.message || "Could not delete");
          }
        },
      },
    ]);

  // ─── UI ─────────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack}>
          <Ionicons name="chevron-back" size={22} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Avatar ── */}
          <View style={styles.avatarCard}>
            <TouchableOpacity
              style={styles.avatarWrap}
              activeOpacity={0.85}
              onPress={handleChangePhoto}
              disabled={uploadingImage}
            >
              <View style={styles.avatarClip}>
                {profileImage ? (
                  <Image
                    key={profileImage}
                    source={{ uri: profileImage }}
                    style={styles.avatarImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {name.trim()?.charAt(0).toUpperCase() || "U"}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.cameraBadge}>
                <Ionicons
                  name={uploadingImage ? "hourglass-outline" : "camera"}
                  size={12}
                  color="#fff"
                />
              </View>
            </TouchableOpacity>
            <Text style={styles.avatarName}>{name || "Your profile"}</Text>
            <Text style={styles.avatarSub}>
              {user?.email || "Update your details"}
            </Text>
          </View>

          {/* ── Profile details ── */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.iconBox}>
                <Ionicons
                  name="person-outline"
                  size={18}
                  color={Colors.primary}
                />
              </View>
              <Text style={styles.cardTitle}>Profile Details</Text>
            </View>
            <Input
              label="Name"
              value={name}
              onChangeText={setName}
              placeholder="Your name"
            />
            <Input
              label="Phone"
              value={phone}
              onChangeText={setPhone}
              placeholder="Phone number"
              keyboardType="phone-pad"
              editable={false}
            />
            <Input label="Email (optional)" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="Your email" />
            {canSetPassword && <>
              <Input label="Set Password" value={initialPassword} onChangeText={setInitialPassword} secureTextEntry={!showPassword} autoCapitalize="none" autoCorrect={false} editable={!saving} placeholder="Minimum 5 characters" />
              <Input label="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showPassword} autoCapitalize="none" autoCorrect={false} editable={!saving} placeholder="Re-enter your password" />
              <TouchableOpacity accessibilityLabel={showPassword ? "Hide passwords" : "Show passwords"} onPress={() => setShowPassword(!showPassword)} style={{ alignSelf: "flex-end", padding: 12 }}><Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={22} color={Colors.primary} /></TouchableOpacity>
              <Button title="Set Password" onPress={saveInitialPassword} disabled={saving || !initialPassword || !confirmPassword} />
            </>}
            <Button
              title={saving ? "Saving..." : "Save Changes"}
              onPress={saveProfile}
              loading={saving}
              disabled={saving}
              style={{ marginTop: 10 }}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Gaushala</Text>
            {!!farmError && <TouchableOpacity onPress={() => void loadFarms()}><Text style={{ color: "#B42318", paddingVertical: 12 }}>{farmError}</Text></TouchableOpacity>}
            {linkedFarmId ? <Text style={{ paddingVertical: 12, color: Colors.primary }}>{linkedFarm ? `${linkedFarm.admin_name} · ${linkedFarm.referral_code}` : "Your account is connected with a gaushala."}</Text> : <>
              <TouchableOpacity disabled={farmLoading} accessibilityRole="button" accessibilityState={{ expanded: farmOpen }} onPress={() => setFarmOpen(!farmOpen)} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14, gap: 10 }}><Text style={{ flex: 1 }}>{farmLoading ? "Loading..." : "Select Gaushala / Referral"}</Text><Ionicons name={farmOpen ? "chevron-up" : "chevron-down"} size={20} color={Colors.primary} /></TouchableOpacity>
              {farmOpen && <ScrollView nestedScrollEnabled style={{ maxHeight: 220 }}>{farms.map(farm => <TouchableOpacity key={farm.admin_id} disabled={farmLoading} onPress={() => connectFarm(farm)} style={{ paddingVertical: 12, borderBottomWidth: 1, borderColor: "#eee" }}><Text>{farm.admin_name} · {farm.referral_code}</Text></TouchableOpacity>)}{!farms.length && <Text>No active gaushalas available.</Text>}</ScrollView>}
            </>}
          </View>

          {/* ── Locations ── */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: "#EEF2FF" }]}>
                <Ionicons name="location-outline" size={18} color="#6366f1" />
              </View>
              <Text style={styles.cardTitle}>Delivery Locations</Text>
            </View>

            {params.addressRequired === "1" && addresses.length === 0 && (
              <View style={ls.requiredBanner}>
                <Ionicons name="alert-circle" size={16} color="#dc2626" />
                <Text style={ls.requiredText}>
                  Add a delivery address to continue placing your order.
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={ls.addBtn}
              onPress={openNewAddress}
              activeOpacity={0.85}
            >
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={ls.addBtnText}>Add new address</Text>
            </TouchableOpacity>

            <Text style={ls.section}>SAVED ADDRESSES</Text>

            {addresses.length === 0 && (
              <Text style={ls.empty}>No saved addresses yet</Text>
            )}

            {addresses.map((a) => (
              <TouchableOpacity
                key={a.id}
                style={ls.addrCard}
                activeOpacity={0.85}
                onPress={() => openEditAddress(a)}
              >
                <View style={ls.addrTop}>
                  <View style={ls.badge}>
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
                    <Text style={ls.badgeText}>{a.label.toUpperCase()}</Text>
                  </View>
                  {a.is_default && (
                    <View style={ls.defBadge}>
                      <Text style={ls.defText}>DEFAULT</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={ls.delBtn}
                    onPress={() => removeAddress(a)}
                  >
                    <Ionicons name="trash-outline" size={15} color="#ef4444" />
                  </TouchableOpacity>
                </View>
                <Text style={ls.addrText}>
                  {formatAddr(a) || a.full_address}
                </Text>
                {!!a.landmark && (
                  <Text style={ls.sub}>Landmark: {a.landmark}</Text>
                )}
                {a.lat && a.lng ? (
                  <Text style={ls.sub}>
                    📍 {Number(a.lat).toFixed(5)}, {Number(a.lng).toFixed(5)}
                  </Text>
                ) : (
                  <Text style={[ls.sub, { color: "#dc2626" }]}>
                    Tap to pin location on map
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Delete account ── */}
          <View style={[styles.card, styles.dangerCard]}>
            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                minHeight: 44,
              }}
              accessibilityRole="button"
              accessibilityState={{ expanded: deleteExpanded }}
              disabled={deleting}
              onPress={() => {
                setDeleteExpanded(!deleteExpanded);
                setPassword("");
              }}
            >
              <View style={[styles.iconBox, styles.dangerIconBox]}>
                <Ionicons name="trash-outline" size={18} color="#DC2626" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.dangerTitle}>Delete Account</Text>
              </View>
              <Ionicons
                name={deleteExpanded ? "chevron-up" : "chevron-down"}
                size={18}
                color="#991B1B"
              />
            </TouchableOpacity>
            {deleteExpanded && (
              <View style={{ paddingTop: 12 }}>
                <Text style={styles.dangerText}>
                  Permanently delete your account. This cannot be undone.
                </Text>
                <Input
                  label="Password"
                  placeholder="Enter password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
                <TouchableOpacity
                  style={[styles.deleteBtn, deleting && styles.disabledBtn]}
                  onPress={deleteAccount}
                  disabled={deleting}
                  activeOpacity={0.86}
                >
                  <Ionicons name="trash-outline" size={17} color="#DC2626" />
                  <Text style={styles.deleteBtnText}>
                    {deleting ? "Deleting..." : "Delete Account"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

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
            <View pointerEvents="none" style={ls.pinWrap}>
              <Ionicons name="location" size={42} color={Colors.primary} />
            </View>
          )}

          {/* top: close + search */}
          <View
            style={[ls.topBar, { paddingTop: insets.top + 8 }]}
            pointerEvents="box-none"
          >
            <TouchableOpacity
              style={ls.roundBtn}
              onPress={() => setMapOpen(false)}
            >
              <Ionicons name="close" size={20} color="#111" />
            </TouchableOpacity>
            {step === "map" && (
              <View style={ls.searchBox}>
                <Ionicons name="search" size={18} color="#888" />
                <TextInput
                  style={ls.searchInput}
                  placeholder="Search area, street, landmark"
                  value={query}
                  onChangeText={setQuery}
                  returnKeyType="search"
                  onSubmitEditing={searchPlace}
                />
                {!!query && (
                  <TouchableOpacity onPress={searchPlace}>
                    <Text style={{ color: Colors.primary, fontWeight: "800" }}>
                      Go
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* bottom: step 1 */}
          {step === "map" && (
            <View style={[ls.bottom, { bottom: 24 + insets.bottom }]}>
              <TouchableOpacity
                style={ls.primaryBtn}
                onPress={useCurrentLocation}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="navigate" size={18} color="#fff" />
                    <Text style={ls.primaryText}>Use current location</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={ls.ghostBtn}
                onPress={confirmPin}
                disabled={busy}
              >
                <Text style={ls.ghostText}>Confirm pin location</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* bottom: step 2 */}
          {step === "details" && (
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              style={ls.sheetWrap}
            >
              <View style={ls.sheet}>
                <View style={ls.handle} />
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  <View style={ls.locRow}>
                    <Ionicons
                      name="location"
                      size={18}
                      color={Colors.primary}
                    />
                    <Text style={ls.locText} numberOfLines={2}>
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

                  <View style={ls.chipRow}>
                    {(["home", "work", "other"] as const).map((l) => (
                      <TouchableOpacity
                        key={l}
                        style={[ls.chip, form.label === l && ls.chipActive]}
                        onPress={() => setField("label", l)}
                      >
                        <Text
                          style={[
                            ls.chipText,
                            form.label === l && { color: "#fff" },
                          ]}
                        >
                          {l.charAt(0).toUpperCase() + l.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={ls.row2}>
                    <View style={{ flex: 1 }}>
                      <Text style={ls.lbl}>Flat / House no. *</Text>
                      <TextInput
                        style={ls.input}
                        value={form.flat}
                        onChangeText={(v) => setField("flat", v)}
                        placeholder="e.g. 868"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={ls.lbl}>Building / Society *</Text>
                      <TextInput
                        style={ls.input}
                        value={form.building}
                        onChangeText={(v) => setField("building", v)}
                        placeholder="e.g. Tower B"
                      />
                    </View>
                  </View>

                  <Text style={ls.lbl}>Area</Text>
                  <TextInput
                    style={ls.input}
                    value={form.area}
                    onChangeText={(v) => setField("area", v)}
                  />

                  <View style={ls.row2}>
                    <View style={{ flex: 1 }}>
                      <Text style={ls.lbl}>City</Text>
                      <TextInput
                        style={ls.input}
                        value={form.city}
                        onChangeText={(v) => setField("city", v)}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={ls.lbl}>Pincode</Text>
                      <TextInput
                        style={ls.input}
                        value={form.pincode}
                        onChangeText={(v) => setField("pincode", v)}
                        keyboardType="number-pad"
                        maxLength={6}
                      />
                    </View>
                  </View>

                  <Text style={ls.lbl}>Landmark (optional)</Text>
                  <TextInput
                    style={ls.input}
                    value={form.landmark}
                    onChangeText={(v) => setField("landmark", v)}
                  />

                  <View style={ls.row2}>
                    <View style={{ flex: 1 }}>
                      <Text style={ls.lbl}>Latitude</Text>
                      <TextInput
                        style={[ls.input, ls.readonly]}
                        value={
                          form.lat != null ? Number(form.lat).toFixed(6) : ""
                        }
                        editable={false}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={ls.lbl}>Longitude</Text>
                      <TextInput
                        style={[ls.input, ls.readonly]}
                        value={
                          form.lng != null ? Number(form.lng).toFixed(6) : ""
                        }
                        editable={false}
                      />
                    </View>
                  </View>

                  <TouchableOpacity
                    style={ls.defRow}
                    onPress={() => setField("is_default", !form.is_default)}
                  >
                    <View
                      style={[
                        ls.check,
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
                    style={[ls.primaryBtn, { marginTop: 14, marginBottom: 10 }]}
                    onPress={saveAddress}
                    disabled={savingAddr}
                  >
                    {savingAddr ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={ls.primaryText}>Save address</Text>
                    )}
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          )}
        </View>
      </Modal>

      <CropModal
        visible={cropVisible}
        imageUri={rawImageUri}
        imageSize={rawImageSize}
        onCancel={() => {
          setCropVisible(false);
          setRawImageUri(null);
          setRawImageSize(null);
        }}
        onDone={handleCropDone}
      />

      <PhotoSourceSheet
        visible={photoSheetVisible}
        onClose={() => setPhotoSheetVisible(false)}
        onCamera={() => choosePhotoSource(true)}
        onGallery={() => choosePhotoSource(false)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F4F6" },
  header: {
    height: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#EFEFEF",
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F5F5",
  },
  headerTitle: { fontSize: 18, fontWeight: "900", color: "#1F2937" },
  headerSpacer: { width: 38 },
  content: { padding: 16, paddingBottom: 34 },
  avatarCard: {
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 18,
    backgroundColor: "#fff",
    borderRadius: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },
  avatarWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    marginBottom: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarClip: {
    width: 74,
    height: 74,
    borderRadius: 37,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.primary,
  },
  avatar: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: { width: 74, height: 74, borderRadius: 37 },
  cameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.primary,
    borderWidth: 2.5,
    borderColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontSize: 30, fontWeight: "900", color: "#fff" },
  avatarName: { fontSize: 18, fontWeight: "900", color: "#111827" },
  avatarSub: { marginTop: 3, fontSize: 13, color: "#6B7280" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.primary + "12",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontSize: 16, fontWeight: "900", color: "#1F2937" },
  dangerCard: {
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    borderColor: "#FECACA",
    backgroundColor: "#FFF7F7",
  },
  dangerIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#FEE2E2",
  },
  dangerTitle: { fontSize: 15, fontWeight: "900", color: "#991B1B" },
  dangerText: {
    marginTop: 3,
    fontSize: 12.5,
    lineHeight: 18,
    color: "#7F1D1D",
  },
  deleteBtn: {
    marginTop: 10,
    height: 48,
    borderRadius: 15,
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FECACA",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  disabledBtn: { opacity: 0.65 },
  deleteBtnText: { fontSize: 14.5, fontWeight: "900", color: "#DC2626" },
});

// location styles
const ls = StyleSheet.create({
  requiredBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  requiredText: { flex: 1, fontSize: 12, color: "#B91C1C", fontWeight: "600" },
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
    marginTop: 20,
    marginBottom: 10,
  },
  empty: { color: "#bbb", fontStyle: "italic" },
  addrCard: {
    backgroundColor: "#F8FBF7",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.primary + "22",
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
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.primary + "20",
  },
  badgeText: { fontSize: 10, fontWeight: "900", color: Colors.primary },
  defBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  defText: { fontSize: 10, fontWeight: "900", color: "#fff" },
  delBtn: {
    marginLeft: "auto",
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
  },
  addrText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    lineHeight: 20,
  },
  sub: { fontSize: 12, color: "#64748B", marginTop: 4 },

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
  searchBox: {
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
  searchInput: { flex: 1, fontSize: 14, color: "#111" },
  bottom: { position: "absolute", left: 16, right: 16, bottom: 32, gap: 10 },
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
    paddingBottom: 24,
    maxHeight: 560,
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
