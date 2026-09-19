import React, { useState , useRef, useEffect} from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  Modal,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../../src/contexts/AuthContext";
import { api } from "../../src/services/api";
import { Colors } from "../../src/constants/colors";
import Button from "../../src/components/Button";
import Input from "../../src/components/Input";
import CropModal from "../../src/components/CropModal";

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
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={sheetStyles.overlayWrap}>
        <TouchableOpacity
          style={sheetStyles.backdropTouchable}
          activeOpacity={1}
          onPress={onClose}
        >
          <Animated.View style={[sheetStyles.backdrop, { opacity: backdropAnim }]} />
        </TouchableOpacity>

        <Animated.View
          style={[sheetStyles.sheet, { transform: [{ translateY: slideAnim }] }]}
        >
          <View style={sheetStyles.dragHandle} />

          <Text style={sheetStyles.title}>Change Profile Photo</Text>
          <Text style={sheetStyles.subtitle}>Choose where to pick your photo from</Text>

          <TouchableOpacity
            style={sheetStyles.optionRow}
            activeOpacity={0.75}
            onPress={onCamera}
          >
            <View style={[sheetStyles.optionIconBox, { backgroundColor: Colors.primary + "14" }]}>
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
            <View style={[sheetStyles.optionIconBox, { backgroundColor: "#EEF4FF" }]}>
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
  optionSub: { fontSize: 12, color: "#9CA3AF", marginTop: 2, fontWeight: "500" },
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

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteExpanded, setDeleteExpanded] = useState(false);

  const [photoSheetVisible, setPhotoSheetVisible] = useState(false);

  // ── Profile photo state
  const [profileImage, setProfileImage] = useState<string | null>(
    (user as any)?.profile_image || null,
  );
  const [uploadingImage, setUploadingImage] = useState(false);
  const [cropVisible, setCropVisible] = useState(false);
  const [rawImageUri, setRawImageUri] = useState<string | null>(null);
  const [rawImageSize, setRawImageSize] = useState<{ w: number; h: number } | null>(
    null,
  );

const goBack = () => {
  router.replace("/(customer)/profile");
};

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
      Alert.alert("Could not update photo", error?.message || "Please try again.");
    } finally {
      setUploadingImage(false);
      setRawImageUri(null);
      setRawImageSize(null);
    }
  };

 const handleChangePhoto = () => {
  setPhotoSheetVisible(true);
};

const choosePhotoSource = (fromCamera: boolean) => {
  setPhotoSheetVisible(false);
  // slight delay so the sheet closes smoothly before the native picker opens
  setTimeout(() => pickImage(fromCamera), 200);
};

  const saveProfile = async () => {
    if (!name.trim()) {
      Alert.alert("Name required", "Please enter your name.");
      return;
    }
    setSaving(true);
    try {
      await api.updateProfile({
        name: name.trim(),
        phone: phone.trim(),
      });
      updateUser({ name: name.trim(), phone: phone.trim() } as any);
      Alert.alert("Profile updated", "Your profile has been saved.", [
        { text: "OK", onPress: () => goBack() },
      ]);
    } catch (error: any) {
      Alert.alert("Could not update profile", error?.message || "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const deleteAccount = () => {
    if (!password.trim()) {
      Alert.alert("Password required", "Enter your password to delete your account.");
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
            <Text style={styles.avatarSub}>{user?.email || "Update your details"}</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.iconBox}>
                <Ionicons name="person-outline" size={18} color={Colors.primary} />
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
            />
            <Button
              title={saving ? "Saving..." : "Save Changes"}
              onPress={saveProfile}
              loading={saving}
              disabled={saving}
              style={{ marginTop: 10 }}
            />
          </View>

          <View style={[styles.card, styles.dangerCard]}>
            <TouchableOpacity
              style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 44 }}
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
  avatarImage: {
    width: 74,
    height: 74,
    borderRadius: 37,
  },
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
  dangerIconBox: { width: 32, height: 32, borderRadius: 8, backgroundColor: "#FEE2E2" },
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