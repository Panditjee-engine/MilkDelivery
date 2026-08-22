import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Animated,
  StatusBar,
  ActivityIndicator,
  Image,
  BackHandler,
} from "react-native";
import { api, BusinessLocation, BusinessLocationCreate, getApiBaseUrl } from "../../src/services/api";
import QRCode from "react-native-qrcode-svg";
import * as Sharing from "expo-sharing";
import * as ImagePicker from "expo-image-picker";
import ViewShot, { captureRef } from "react-native-view-shot";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "../../src/contexts/AuthContext";
import { APP_VERSION } from "../../src/services/useVersionCheck";

// ── Palette
const C = {
  bg: "#FFF8F4",
  card: "#fff",
  primary: "#FF9675",
  dark: "#BB6B3F",
  accent: "#8B6854",
  muted: "#A07850",
  light: "#C9A882",
  amber: "#FFBF55",
  peach: "#FFF3E8",
  deepPeach: "#FFE8D6",
  text: "#1A1A1A",
  border: "#FFF0E8",
};

// ── Types
type ModalType =
  | "cutoff"
  | "delivery"
  | "grace"
  | "business"
  | "contact"
  | "profile"
  | "password"
  | "share"
  | "locations"
  | null;

// password change has 3 steps:
//   "request"  → button to fetch OTP from server
//   "verify"   → OTP shown on screen, user types it in
//   "change"   → enter new password
type OtpStep = "request" | "verify" | "change";

type AdminContent = {
  id?: string;
  _id?: string;
  content_id?: string;
  title: string;
  description: string;
  images?: string[];
  is_active?: boolean;
};

interface Settings {
  cutoffHour: string;
  cutoffMin: string;
  cutoffAmPm: "AM" | "PM";
  deliveryStartHour: string;
  deliveryStartMin: string;
  deliveryStartAmPm: "AM" | "PM";
  deliveryEndHour: string;
  deliveryEndMin: string;
  deliveryEndAmPm: "AM" | "PM";
  gracePeriod: string;
  businessName: string;
  supportContact: string;
}

const GRACE_OPTIONS = [
  "No grace period",
  "1 day",
  "2 days",
  "3 days",
  "1 week",
];
const HOURS_12 = ["5", "6", "7", "8", "9", "10", "11", "12"];
const MINUTES = ["00", "15", "30", "45"];

// ── Helper: build referral code from a user object
function buildReferralCode(u: any): string {
  const name = u?.name || "GAU";
  const nameClean = name.replace(/[^a-zA-Z]/g, "");
  const namePart = nameClean.slice(0, 3).toUpperCase().padEnd(3, "X");
  const adminId = String(u?.id || "000");
  const asciiSum = adminId
    .split("")
    .reduce((sum: number, c: string) => sum + c.charCodeAt(0), 0);
  const numPart = String((asciiSum % 900) + 100);
  return `${namePart}${numPart}`;
}

// ── Custom Alert
type AlertBtn = {
  text: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void;
};
type AlertCfg = {
  visible: boolean;
  icon?: string;
  iconBg?: string;
  iconColor?: string;
  title: string;
  message?: string;
  buttons: AlertBtn[];
};

function CustomAlert({
  cfg,
  onDismiss,
}: {
  cfg: AlertCfg;
  onDismiss: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (cfg.visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 70,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
    }
  }, [cfg.visible]);

  if (!cfg.visible) return null;
  return (
    <Modal
      transparent
      animationType="none"
      visible={cfg.visible}
      onRequestClose={onDismiss}
    >
      <Animated.View style={[aS.overlay, { opacity: opacityAnim }]}>
        <Animated.View style={[aS.box, { transform: [{ scale: scaleAnim }] }]}>
          <View
            style={[
              aS.iconWrap,
              { backgroundColor: cfg.iconBg ?? C.deepPeach },
            ]}
          >
            <Ionicons
              name={(cfg.icon ?? "information-circle-outline") as any}
              size={26}
              color={cfg.iconColor ?? C.dark}
            />
          </View>
          <Text style={aS.title}>{cfg.title}</Text>
          {cfg.message ? <Text style={aS.msg}>{cfg.message}</Text> : null}
          <View
            style={[
              aS.btnRow,
              cfg.buttons.length === 1 && { justifyContent: "center" },
            ]}
          >
            {cfg.buttons.map((b, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  aS.btn,
                  b.style === "destructive" && aS.btnDest,
                  b.style === "cancel" && aS.btnCancel,
                  cfg.buttons.length === 1 && { flex: 1 },
                ]}
                activeOpacity={0.75}
                onPress={() => {
                  onDismiss();
                  b.onPress?.();
                }}
              >
                <Text
                  style={[
                    aS.btnTxt,
                    b.style === "destructive" && aS.btnTxtDest,
                    b.style === "cancel" && aS.btnTxtCancel,
                  ]}
                >
                  {b.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

function useAlert() {
  const [cfg, setCfg] = useState<AlertCfg>({
    visible: false,
    title: "",
    buttons: [],
  });
  const show = (
    title: string,
    message?: string,
    buttons?: AlertBtn[],
    icon?: string,
    iconBg?: string,
    iconColor?: string,
  ) =>
    setCfg({
      visible: true,
      title,
      message,
      buttons: buttons ?? [{ text: "OK" }],
      icon,
      iconBg,
      iconColor,
    });
  const dismiss = () => setCfg((p) => ({ ...p, visible: false }));
  return { cfg, show, dismiss };
}

// ── Picker Chip Row
function PickerRow({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: string[];
  selected: string;
  onSelect: (v: string) => void;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      {label ? <Text style={mS.fieldLabel}>{label}</Text> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[mS.chip, selected === opt && mS.chipActive]}
            onPress={() => onSelect(opt)}
          >
            <Text style={[mS.chipTxt, selected === opt && mS.chipTxtActive]}>
              {opt}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

// ── Modal Shell
function SettingModal({
  visible,
  title,
  icon,
  onClose,
  onSave,
  children,
}: {
  visible: boolean;
  title: string;
  icon?: string;
  onClose: () => void;
  onSave: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <Pressable style={mS.overlay} onPress={onClose}>
          <Pressable style={mS.sheet} onPress={() => { }}>
            <View style={mS.drag} />
            <View style={mS.header}>
              <View style={mS.headerLeft}>
                {icon && (
                  <View style={mS.headerIcon}>
                    <Ionicons name={icon as any} size={16} color={C.dark} />
                  </View>
                )}
                <Text style={mS.headerTitle}>{title}</Text>
              </View>
              <TouchableOpacity style={mS.closeBtn} onPress={onClose}>
                <Ionicons name="close" size={16} color={C.dark} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={mS.body}>
              {children}
              <View style={{ height: 24 }} />
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Share Modal (QR code)
function ShareModal({
  visible,
  onClose,
  adminUser,
}: {
  visible: boolean;
  onClose: () => void;
  adminUser: any;
}) {
  const captureRefContainer = useRef<any>(null);
  const [sharing, setSharing] = useState(false);
  const [qrData, setQrData] = useState<{
    admin_id: string;
    admin_name: string;
    qr_value: string;
    referral_code: string;
  } | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);

  useEffect(() => {
    if (visible && !qrData) fetchQrData();
  }, [visible]);

  const fetchQrData = async () => {
    setLoadingQr(true);
    try {
      const name = adminUser?.name || "GAU";
      const adminId = String(adminUser?.id || "000");
      const universalLink = `${getApiBaseUrl()}/api/admin/store-redirect?ref=${adminId}`;
      setQrData({
        admin_id: adminId,
        admin_name: name,
        qr_value: universalLink,
        referral_code: buildReferralCode(adminUser),
      });
    } catch (e) {
      setQrData({
        admin_id: String(adminUser?.id || "000"),
        admin_name: adminUser?.name || "GAU",
        qr_value:
          "https://play.google.com/store/apps/details?id=com.badal_12.frontend",
        referral_code: "GAU100",
      });
    } finally {
      setLoadingQr(false);
    }
  };

  const handleShare = async () => {
    if (sharing || !captureRefContainer.current) return;
    try {
      setSharing(true);
      const uri = await captureRef(captureRefContainer.current, {
        format: "png",
        quality: 1,
      });
      if (!(await Sharing.isAvailableAsync())) return;
      await Sharing.shareAsync(uri, {
        mimeType: "image/png",
        dialogTitle: "Share QR code of your Farm",
      });
    } catch (error) {
      console.warn("Share failed", error);
    } finally {
      setSharing(false);
    }
  };

  const qrValue =
    qrData?.qr_value ||
    `gausatv://register?admin_id=${adminUser?.id || "default"}`;
  const displayName = qrData?.admin_name || adminUser?.name || "GauSatva";
  const shortCode =
    qrData?.referral_code ||
    String(qrData?.admin_id || adminUser?.id || "")
      .slice(-6)
      .toUpperCase();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={mS.overlay}>
        <View style={mS.sheet}>
          <View style={mS.drag} />
          <View style={mS.header}>
            <View style={mS.headerLeft}>
              <View style={mS.headerIcon}>
                <Ionicons name="qr-code-outline" size={16} color={C.dark} />
              </View>
              <Text style={mS.headerTitle}>Share Your QR</Text>
            </View>
            <TouchableOpacity style={mS.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={16} color={C.dark} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} style={mS.body}>
            {loadingQr ? (
              <View style={qrS.loadingBox}>
                <ActivityIndicator color={C.primary} size="large" />
                <Text style={qrS.loadingText}>Generating your QR...</Text>
              </View>
            ) : (
              <>
                <View style={qrS.infoBanner}>
                  <Ionicons
                    name="information-circle-outline"
                    size={16}
                    color={C.dark}
                  />
                  <Text style={qrS.infoBannerText}>
                    The customer who uses your referral code will only see your
                    {" "}Gaushala{"'"}s products.
                  </Text>
                </View>
                <ViewShot
                  ref={(ref) => {
                    captureRefContainer.current = ref;
                  }}
                  style={qrS.shotWrap}
                >
                  <View style={qrS.card}>
                    <View style={qrS.cardHeader}>
                      <View style={qrS.leafBadge}>
                        <Ionicons name="leaf" size={14} color="#fff" />
                      </View>
                      <Text style={qrS.gaushaalaName}>{displayName}</Text>
                    </View>
                    <Text style={qrS.cardTitle}>
                      Scan Our QR To Connect With Us
                    </Text>
                    <Text style={qrS.cardSubtitle}>
                      Scan the QR code to download our app and use the referral
                      code to connect directly with the{"\n"}farm and explore
                      fresh products.
                    </Text>
                    <View style={qrS.qrBox}>
                      <QRCode
                        value={qrValue}
                        size={180}
                        backgroundColor="white"
                        color={C.dark}
                      />
                    </View>
                    <View style={qrS.cardFooter}>
                      <View style={qrS.footerDivider} />
                      <View style={qrS.footerRow}>
                        <Ionicons
                          name="shield-checkmark"
                          size={11}
                          color={C.muted}
                        />
                        <Text style={qrS.footerText}>
                          GauSatv · Pure & Fresh
                        </Text>
                      </View>
                    </View>
                  </View>
                </ViewShot>
                <View style={qrS.codeRow}>
                  <Text style={qrS.codeLabel}>Your Referral - Code:</Text>
                  <View style={qrS.codePill}>
                    <Text style={qrS.codeValue}>{shortCode}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={mS.saveBtn}
                  onPress={handleShare}
                  activeOpacity={0.8}
                  disabled={sharing}
                >
                  <Ionicons
                    name="share-social-outline"
                    size={18}
                    color="#fff"
                  />
                  <Text style={mS.saveTxt}>
                    {sharing ? "Sharing..." : "Share QR"}
                  </Text>
                </TouchableOpacity>
              </>
            )}
            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ── Setting Row
function SettingRow({
  icon,
  iconBg,
  iconColor,
  label,
  value,
  onPress,
}: {
  icon: string;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  onPress: () => void;
}) {
  const pressAnim = useRef(new Animated.Value(1)).current;
  const onPressIn = () =>
    Animated.spring(pressAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  const onPressOut = () =>
    Animated.spring(pressAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();

  return (
    <Animated.View style={{ transform: [{ scale: pressAnim }] }}>
      <TouchableOpacity
        style={s.settingRow}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
      >
        <View style={[s.iconBox, { backgroundColor: iconBg }]}>
          <Ionicons name={icon as any} size={17} color={iconColor} />
        </View>
        <View style={s.settingInfo}>
          <Text style={s.settingLabel}>{label}</Text>
          <Text style={s.settingValue} numberOfLines={1}>
            {value}
          </Text>
        </View>
        <View style={s.chevronWrap}>
          <Ionicons name="chevron-forward" size={15} color={C.light} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── OTP Input: 6 individual boxes
function OtpInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const inputs = useRef<(TextInput | null)[]>([]);

  const handleChange = (text: string, index: number) => {
    const cleaned = text.replace(/[^0-9]/g, "").slice(-1);
    const arr = value.padEnd(6, " ").split("");
    arr[index] = cleaned || " ";
    const next = arr.join("").trimEnd();
    onChange(next);
    if (cleaned && index < 5) inputs.current[index + 1]?.focus();
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !value[index] && index > 0)
      inputs.current[index - 1]?.focus();
  };

  return (
    <View style={mS.otpRow}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <TextInput
          key={i}
          ref={(ref) => {
            inputs.current[i] = ref;
          }}
          style={[
            mS.otpBox,
            value[i] && value[i] !== " " ? mS.otpBoxFilled : null,
          ]}
          value={value[i] && value[i] !== " " ? value[i] : ""}
          onChangeText={(t) => handleChange(t, i)}
          onKeyPress={(e) => handleKeyPress(e, i)}
          keyboardType="number-pad"
          maxLength={1}
          textAlign="center"
          selectTextOnFocus
        />
      ))}
    </View>
  );
}

// ── Section Header
function SectionHeader({ title }: { title: string }) {
  return (
    <View style={s.sectionHeaderRow}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.sectionLine} />
    </View>
  );
}

// ── Info Pill
function InfoPill({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={s.infoPill}>
      <Ionicons name={icon as any} size={12} color={C.muted} />
      <Text style={s.infoPillTxt}>{label}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Main Screen
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminSettingsScreen() {
  const { user, logout, updateUser } = useAuth();
  const router = useRouter();
  const { cfg: alertCfg, show: showAlert, dismiss: dismissAlert } = useAlert();
  const headerAnim = useRef(new Animated.Value(0)).current;

  const referralCode = buildReferralCode(user);

  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<Settings>({
    cutoffHour: "10",
    cutoffMin: "00",
    cutoffAmPm: "PM",
    deliveryStartHour: "5",
    deliveryStartMin: "00",
    deliveryStartAmPm: "AM",
    deliveryEndHour: "7",
    deliveryEndMin: "00",
    deliveryEndAmPm: "AM",
    gracePeriod: "1 day",
    // businessName / supportContact are kept in sync with the real admin
    // profile (user.name / user.phone) via the useEffect below — these
    // defaults only matter before `user` has loaded.
    businessName: user?.name ?? "GauSatva",
    supportContact: (user as any)?.phone ?? "+91 9999999999",
  });
  const [draft, setDraft] = useState<Settings>(settings);
  const [profileDraft, setProfileDraft] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    phone: (user as any)?.phone ?? "",
  });

  // ── Password change state (real OTP flow)
  const [otpStep, setOtpStep] = useState<OtpStep>("request");
  const [screenOtp, setScreenOtp] = useState(""); // OTP returned by backend, shown on screen
  const [enteredOtp, setEnteredOtp] = useState("");
  const [otpResendTimer, setOtpResendTimer] = useState(0);
  const [pwLoading, setPwLoading] = useState(false); // loading spinner for API calls
  const [pwDraft, setPwDraft] = useState({ newPw: "", confirm: "" });
  const [showPw, setShowPw] = useState({ newPw: false, confirm: false });

  // ── Referral / delete account state
  const [referralExpanded, setReferralExpanded] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [contentModal, setContentModal] = useState(false);
  const [contentItems, setContentItems] = useState<AdminContent[]>([]);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentSaving, setContentSaving] = useState(false);
  const [contentDraft, setContentDraft] = useState<{
    id: string | null;
    title: string;
    description: string;
    images: string[];
    is_active: boolean;
  }>({ id: null, title: "", description: "", images: [], is_active: true });

  // ── Business Locations state (multiple branches for the same business)
  const [locations, setLocations] = useState<BusinessLocation[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [locationSaving, setLocationSaving] = useState(false);
  const [editingLocationId, setEditingLocationId] = useState<string | null>(
    null,
  );
  const [locationDraft, setLocationDraft] = useState<BusinessLocationCreate>({
    label: "",
    address_line: "",
    city: "",
    state: "",
    pincode: "",
    is_primary: false,
  });

  // ── Load non-profile settings (cutoff/delivery/grace) from AsyncStorage.
  //    businessName / supportContact are deliberately excluded here — they
  //    are always derived live from `user`, never from the cache, so a
  //    stale cached value can never override the real admin profile.
  useEffect(() => {
    AsyncStorage.getItem("APP_SETTINGS").then((data) => {
      if (data) {
        const parsed = JSON.parse(data);
        const { businessName, supportContact, ...rest } = parsed;
        setSettings((s) => ({ ...s, ...rest }));
      }
    });
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
    loadContent();
    loadLocations();
  }, []);

  // ── Business Name & Support Contact always mirror the admin's real profile.
  //    Any time `user` changes (e.g. after saveProfile/saveBusinessName/
  //    saveSupportContact updates it via updateUser), these two settings
  //    fields update to match automatically.
  useEffect(() => {
    setSettings((s) => ({
      ...s,
      businessName: user?.name ?? s.businessName,
      supportContact: (user as any)?.phone ?? s.supportContact,
    }));
  }, [user]);

  // Resend countdown
  useEffect(() => {
    if (otpResendTimer <= 0) return;
    const t = setTimeout(() => setOtpResendTimer((p) => p - 1), 1000);
    return () => clearTimeout(t);
  }, [otpResendTimer]);

  const openModal = (type: ModalType) => {
    setDraft({ ...settings });
    if (type === "profile")
      setProfileDraft({
        name: user?.name ?? "",
        email: user?.email ?? "",
        phone: (user as any)?.phone ?? "",
      });
    if (type === "password") {
      setOtpStep("request");
      setScreenOtp("");
      setEnteredOtp("");
      setPwDraft({ newPw: "", confirm: "" });
      setShowPw({ newPw: false, confirm: false });
      setPwLoading(false);
    }
    if (type === "locations") {
      resetLocationDraft();
      loadLocations();
    }
    setActiveModal(type);
  };
  const closeModal = () => setActiveModal(null);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (deleteModal) {
        setDeleteModal(false);
        return true;
      }
      if (activeModal) {
        closeModal();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [activeModal, deleteModal]);

  const getContentId = (item: AdminContent) =>
    String(item.id || item._id || item.content_id || "");

  const normalizeImageUri = (img: string) => {
    if (!img) return "";
    if (img.startsWith("http") || img.startsWith("data:image")) return img;
    return `data:image/jpeg;base64,${img}`;
  };

  const resetContentDraft = () =>
    setContentDraft({
      id: null,
      title: "",
      description: "",
      images: [],
      is_active: true,
    });

  const loadContent = async () => {
    setContentLoading(true);
    try {
      const res = await api.getContent();
      setContentItems(Array.isArray(res?.data) ? res.data : []);
    } catch (error: any) {
      showAlert(
        "Content Load Failed",
        error?.message || "Could not load content right now.",
        undefined,
        "alert-circle-outline",
        C.deepPeach,
        C.amber,
      );
    } finally {
      setContentLoading(false);
    }
  };

  const openContentModal = () => router.push("/(admin)/content" as any);

  const pickContentImages = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showAlert(
        "Permission Needed",
        "Please allow photo access to add content images.",
        undefined,
        "image-outline",
        C.deepPeach,
        C.dark,
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      base64: true,
      quality: 0.72,
    });
    if (result.canceled) return;
    const images = result.assets
      .map((asset) => asset.base64)
      .filter(Boolean) as string[];
    setContentDraft((draft) => ({
      ...draft,
      images: [...draft.images, ...images],
    }));
  };

  const saveContent = async () => {
    if (!contentDraft.title.trim() || !contentDraft.description.trim()) {
      showAlert(
        "Missing Details",
        "Please enter both title and description.",
        undefined,
        "document-text-outline",
        C.deepPeach,
        C.dark,
      );
      return;
    }
    setContentSaving(true);
    try {
      if (contentDraft.id) {
        await api.updateContent(contentDraft.id, {
          title: contentDraft.title.trim(),
          description: contentDraft.description.trim(),
          images: contentDraft.images,
          is_active: contentDraft.is_active,
          updated_at: new Date().toISOString(),
        });
      } else {
        await api.addContent({
          title: contentDraft.title.trim(),
          description: contentDraft.description.trim(),
          images: contentDraft.images,
        });
      }
      resetContentDraft();
      await loadContent();
      showAlert(
        "Saved",
        "Content saved successfully.",
        undefined,
        "checkmark-circle",
        "#E8F5E9",
        "#388E3C",
      );
    } catch (error: any) {
      showAlert(
        "Save Failed",
        error?.message || "Could not save content.",
        undefined,
        "alert-circle-outline",
        C.deepPeach,
        C.amber,
      );
    } finally {
      setContentSaving(false);
    }
  };

  const editContent = (item: AdminContent) => {
    showAlert(
      "Edit Content?",
      "This will load the selected content into the form for editing.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Edit",
          onPress: () =>
            setContentDraft({
              id: getContentId(item),
              title: item.title || "",
              description: item.description || "",
              images: item.images || [],
              is_active: item.is_active ?? true,
            }),
        },
      ],
      "pencil-outline",
      C.deepPeach,
      C.dark,
    );
  };

  const toggleContent = async (item: AdminContent) => {
    const id = getContentId(item);
    if (!id) return;
    const willActivate = item.is_active === false;
    showAlert(
      willActivate ? "Activate Content?" : "Deactivate Content?",
      willActivate
        ? "This content will become visible again."
        : "This content will be hidden from active content.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: willActivate ? "Activate" : "Deactivate",
          onPress: async () => {
            try {
              await api.toggleContentStatus(id);
              await loadContent();
            } catch (error: any) {
              showAlert(
                "Update Failed",
                error?.message || "Could not update status.",
              );
            }
          },
        },
      ],
      "power-outline",
      C.deepPeach,
      C.dark,
    );
  };

  const deleteContent = (item: AdminContent) => {
    const id = getContentId(item);
    if (!id) return;
    showAlert(
      "Delete Content?",
      "This content will be permanently deleted.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.deleteContent(id);
              await loadContent();
            } catch (error: any) {
              showAlert(
                "Delete Failed",
                error?.message || "Could not delete content.",
              );
            }
          },
        },
      ],
      "trash-outline",
      "#FEE2E2",
      "#dc2626",
    );
  };

  // ─────────────────────────────────────────────
  // Business Locations — CRUD against /admin/locations
  // ─────────────────────────────────────────────
  const resetLocationDraft = () => {
    setEditingLocationId(null);
    setLocationDraft({
      label: "",
      address_line: "",
      city: "",
      state: "",
      pincode: "",
      is_primary: false,
    });
  };

  const loadLocations = async () => {
    setLocationsLoading(true);
    try {
      const data = await api.getBusinessLocations();
      setLocations(Array.isArray(data) ? data : []);
    } catch (error: any) {
      showAlert(
        "Load Failed",
        error?.message || "Could not load locations.",
        undefined,
        "alert-circle-outline",
        C.deepPeach,
        C.amber,
      );
    } finally {
      setLocationsLoading(false);
    }
  };

  const editLocation = (loc: BusinessLocation) => {
    setEditingLocationId(loc.id);
    setLocationDraft({
      label: loc.label,
      address_line: loc.address_line,
      city: loc.city,
      state: loc.state,
      pincode: loc.pincode,
      is_primary: loc.is_primary,
    });
  };

  const saveLocation = async () => {
    const { label, address_line, city, state, pincode } = locationDraft;
    if (
      !label.trim() ||
      !address_line.trim() ||
      !city.trim() ||
      !state.trim() ||
      !pincode.trim()
    ) {
      showAlert(
        "Missing Details",
        "Please fill in all fields.",
        undefined,
        "alert-circle-outline",
        C.deepPeach,
        C.amber,
      );
      return;
    }
    if (pincode.trim().length !== 6) {
      showAlert(
        "Invalid Pincode",
        "Pincode must be 6 digits.",
        undefined,
        "alert-circle-outline",
        C.deepPeach,
        C.amber,
      );
      return;
    }
    setLocationSaving(true);
    try {
      const payload: BusinessLocationCreate = {
        label: label.trim(),
        address_line: address_line.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        is_primary: !!locationDraft.is_primary,
      };
      if (editingLocationId) {
        await api.updateBusinessLocation(editingLocationId, payload);
      } else {
        await api.createBusinessLocation(payload);
      }
      resetLocationDraft();
      await loadLocations();
      showAlert(
        "Saved",
        editingLocationId ? "Location updated." : "Location added.",
        undefined,
        "checkmark-circle",
        "#E8F5E9",
        "#388E3C",
      );
    } catch (error: any) {
      showAlert(
        "Save Failed",
        error?.message || "Could not save location.",
        undefined,
        "alert-circle-outline",
        C.deepPeach,
        C.amber,
      );
    } finally {
      setLocationSaving(false);
    }
  };

  const deleteLocation = (loc: BusinessLocation) => {
    showAlert(
      "Delete Location?",
      `Remove "${loc.label}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.deleteBusinessLocation(loc.id);
              if (editingLocationId === loc.id) resetLocationDraft();
              await loadLocations();
            } catch (error: any) {
              showAlert(
                "Delete Failed",
                error?.message || "Could not delete location.",
                undefined,
                "alert-circle-outline",
                "#FEF2F2",
                "#dc2626",
              );
            }
          },
        },
      ],
      "trash-outline",
      "#FEE2E2",
      "#dc2626",
    );
  };

  // Generic settings save — used only by cutoff / delivery / grace.
  // businessName & supportContact are intentionally excluded: they are
  // saved via saveBusinessName / saveSupportContact against the real
  // admin profile instead of the local AsyncStorage cache.
  const saveSettings = async () => {
    const { businessName, supportContact, ...rest } = draft;
    const next = { ...settings, ...rest };
    setSettings(next);
    await AsyncStorage.setItem("APP_SETTINGS", JSON.stringify(next));
    setActiveModal(null);
    showAlert(
      "Saved",
      "Settings updated successfully.",
      undefined,
      "checkmark-circle",
      "#E8F5E9",
      "#388E3C",
    );
  };

  const saveProfile = async () => {
    if (!profileDraft.name.trim()) {
      showAlert(
        "Missing Name",
        "Name cannot be empty.",
        undefined,
        "alert-circle-outline",
        C.deepPeach,
        C.amber,
      );
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        name: profileDraft.name.trim(),
        email: profileDraft.email.trim(),
        phone: profileDraft.phone.trim(),
      };
      const result = await api.updateProfile(payload);
      const updatedUser =
        result && typeof result === "object" ? result : payload;
      updateUser?.(updatedUser);
      const cached = await AsyncStorage.getItem("user_data");
      if (cached) {
        const parsed = JSON.parse(cached);
        await AsyncStorage.setItem(
          "user_data",
          JSON.stringify({ ...parsed, ...updatedUser }),
        );
      }
      setActiveModal(null);
      showAlert(
        "Profile Updated",
        "Your profile has been updated.",
        undefined,
        "person-circle",
        C.deepPeach,
        C.dark,
      );
    } catch (error: any) {
      showAlert(
        "Update Failed",
        error?.message || "Something went wrong. Please try again.",
        undefined,
        "alert-circle-outline",
        C.deepPeach,
        C.amber,
      );
    } finally {
      setIsSaving(false);
    }
  };

  // ─────────────────────────────────────────────
  // Business Name → updates the admin's real `name` field
  // ─────────────────────────────────────────────
  const saveBusinessName = async () => {
    const trimmed = draft.businessName.trim();
    if (!trimmed) {
      showAlert(
        "Missing Name",
        "Business name cannot be empty.",
        undefined,
        "alert-circle-outline",
        C.deepPeach,
        C.amber,
      );
      return;
    }
    setIsSaving(true);
    try {
      const result = await api.updateProfile({ name: trimmed });
      const updatedUser =
        result && typeof result === "object" ? result : { name: trimmed };
      updateUser?.(updatedUser);
      const cached = await AsyncStorage.getItem("user_data");
      if (cached) {
        const parsed = JSON.parse(cached);
        await AsyncStorage.setItem(
          "user_data",
          JSON.stringify({ ...parsed, ...updatedUser }),
        );
      }
      setActiveModal(null);
      showAlert(
        "Saved",
        "Business name updated.",
        undefined,
        "checkmark-circle",
        "#E8F5E9",
        "#388E3C",
      );
    } catch (error: any) {
      showAlert(
        "Update Failed",
        error?.message || "Could not update business name.",
        undefined,
        "alert-circle-outline",
        C.deepPeach,
        C.amber,
      );
    } finally {
      setIsSaving(false);
    }
  };

  // ─────────────────────────────────────────────
  // Support Contact → updates the admin's real `phone` field
  // ─────────────────────────────────────────────
  const saveSupportContact = async () => {
    const trimmed = draft.supportContact.trim();
    if (!trimmed) {
      showAlert(
        "Missing Number",
        "Support contact cannot be empty.",
        undefined,
        "alert-circle-outline",
        C.deepPeach,
        C.amber,
      );
      return;
    }
    setIsSaving(true);
    try {
      const result = await api.updateProfile({ phone: trimmed });
      const updatedUser =
        result && typeof result === "object" ? result : { phone: trimmed };
      updateUser?.(updatedUser);
      const cached = await AsyncStorage.getItem("user_data");
      if (cached) {
        const parsed = JSON.parse(cached);
        await AsyncStorage.setItem(
          "user_data",
          JSON.stringify({ ...parsed, ...updatedUser }),
        );
      }
      setActiveModal(null);
      showAlert(
        "Saved",
        "Support contact updated.",
        undefined,
        "checkmark-circle",
        "#E8F5E9",
        "#388E3C",
      );
    } catch (error: any) {
      showAlert(
        "Update Failed",
        error?.message || "Could not update support contact.",
        undefined,
        "alert-circle-outline",
        C.deepPeach,
        C.amber,
      );
    } finally {
      setIsSaving(false);
    }
  };

  // ─────────────────────────────────────────────
  // Password change — Step 1: fetch OTP from backend
  // ─────────────────────────────────────────────
  const handleRequestOtp = async () => {
    setPwLoading(true);
    try {
      const res = await api.requestChangePasswordOtp();
      setScreenOtp(res.otp); // show it on screen
      setEnteredOtp("");
      setOtpStep("verify");
      setOtpResendTimer(30);
    } catch (err: any) {
      showAlert(
        "Failed",
        err?.message || "Could not generate OTP. Please try again.",
        undefined,
        "alert-circle-outline",
        C.deepPeach,
        C.amber,
      );
    } finally {
      setPwLoading(false);
    }
  };

  // ─────────────────────────────────────────────
  // Password change — Resend OTP
  // ─────────────────────────────────────────────
  const handleResendOtp = async () => {
    if (otpResendTimer > 0) return;
    setPwLoading(true);
    try {
      const res = await api.requestChangePasswordOtp();
      setScreenOtp(res.otp);
      setEnteredOtp("");
      setOtpResendTimer(30);
    } catch (err: any) {
      showAlert(
        "Resend Failed",
        err?.message || "Could not resend OTP.",
        undefined,
        "alert-circle-outline",
        C.deepPeach,
        C.amber,
      );
    } finally {
      setPwLoading(false);
    }
  };

  // ─────────────────────────────────────────────
  // Password change — Step 2: verify OTP
  // ─────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    if (enteredOtp.trim().length < 6) {
      showAlert(
        "Incomplete OTP",
        "Please enter all 6 digits.",
        undefined,
        "alert-circle-outline",
        C.deepPeach,
        C.amber,
      );
      return;
    }
    setPwLoading(true);
    try {
      await api.verifyChangePasswordOtp(enteredOtp.trim());
      setOtpStep("change");
    } catch (err: any) {
      showAlert(
        "Invalid OTP",
        err?.message || "The OTP you entered is incorrect.",
        undefined,
        "close-circle-outline",
        "#FFE8D6",
        "#E53935",
      );
      setEnteredOtp("");
    } finally {
      setPwLoading(false);
    }
  };

  // ─────────────────────────────────────────────
  // Password change — Step 3: save new password
  // ─────────────────────────────────────────────
  const handleSavePassword = async () => {
    if (!pwDraft.newPw || !pwDraft.confirm) {
      showAlert(
        "Fill All Fields",
        "Please fill in both password fields.",
        undefined,
        "lock-closed-outline",
        C.deepPeach,
        C.amber,
      );
      return;
    }
    if (pwDraft.newPw.length < 6) {
      showAlert(
        "Too Short",
        "Password must be at least 6 characters.",
        undefined,
        "alert-circle-outline",
        C.deepPeach,
        C.amber,
      );
      return;
    }
    if (pwDraft.newPw !== pwDraft.confirm) {
      showAlert(
        "Mismatch",
        "Passwords do not match.",
        undefined,
        "alert-circle-outline",
        C.deepPeach,
        C.amber,
      );
      return;
    }
    setPwLoading(true);
    try {
      await api.confirmChangePassword(pwDraft.newPw, pwDraft.confirm);
      setActiveModal(null);
      showAlert(
        "Password Changed",
        "Your password has been updated successfully.",
        undefined,
        "shield-checkmark",
        C.deepPeach,
        C.dark,
      );
    } catch (err: any) {
      showAlert(
        "Failed",
        err?.message || "Could not update password.",
        undefined,
        "alert-circle-outline",
        C.deepPeach,
        C.amber,
      );
    } finally {
      setPwLoading(false);
    }
  };

  const handleLogout = () => {
    showAlert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            await logout();
            router.replace("/");
          },
        },
      ],
      "log-out-outline",
      "#FFE8D6",
      C.primary,
    );
  };

  const handleDeleteAccount = () => {
    setDeletePassword("");
    setDeleteModal(true);
  };

  const confirmDeleteAccount = () => {
    if (!deletePassword.trim()) {
      showAlert(
        "Password Required",
        "Enter your password to delete your account.",
        undefined,
        "alert-circle-outline",
        "#FEF2F2",
        "#dc2626",
      );
      return;
    }
    showAlert(
      "Delete Account",
      "This will permanently delete your account. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: async () => {
            setDeletingAccount(true);
            try {
              await api.deleteAccount(deletePassword);
              setDeleteModal(false);
              router.replace("/(auth)/login");
            } catch (err: any) {
              showAlert(
                "Delete Failed",
                err?.message ?? "Could not delete account.",
                undefined,
                "alert-circle-outline",
                "#FEF2F2",
                "#dc2626",
              );
            } finally {
              setDeletingAccount(false);
            }
          },
        },
      ],
      "trash-outline",
      "#FEF2F2",
      "#dc2626",
    );
  };

  // Display strings
  const cutoffDisplay = `${settings.cutoffHour}:${settings.cutoffMin} ${settings.cutoffAmPm}`;
  const deliveryDisplay = `${settings.deliveryStartHour}:${settings.deliveryStartMin} ${settings.deliveryStartAmPm} – ${settings.deliveryEndHour}:${settings.deliveryEndMin} ${settings.deliveryEndAmPm}`;
  const locationsDisplay = locations.length
    ? `${locations.length} location${locations.length !== 1 ? "s" : ""} added`
    : "No locations added";

  const pwStepTitle =
    otpStep === "request"
      ? "Change Password"
      : otpStep === "verify"
        ? "Enter OTP"
        : "Set New Password";

  const initials = (user?.name ?? "A")
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <CustomAlert cfg={alertCfg} onDismiss={dismissAlert} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* ── Top Bar */}
        <Animated.View
          style={[
            s.topBar,
            {
              opacity: headerAnim,
              transform: [
                {
                  translateY: headerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-12, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={s.topBarTitle}>Settings</Text>
          <View style={s.topBarRight}>
            <InfoPill icon="shield-checkmark-outline" label="Admin" />
          </View>
        </Animated.View>

        {/* ── Hero Profile Card */}
        <Animated.View
          style={[
            s.heroCard,
            {
              opacity: headerAnim,
              transform: [
                {
                  translateY: headerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={s.heroBubble1} />
          <View style={s.heroBubble2} />
          <View style={s.heroAvatarRow}>
            <View style={s.heroAvatarRing}>
              <View style={s.heroAvatar}>
                <Text style={s.heroAvatarTxt}>{initials}</Text>
              </View>
            </View>
            <View style={s.heroBadge}>
              <Ionicons name="shield-checkmark" size={10} color="#fff" />
              <Text style={s.heroBadgeTxt}>Admin</Text>
            </View>
          </View>
          <Text style={s.heroName}>{user?.name ?? "Administrator"}</Text>
          <Text style={s.heroEmail}>{user?.email ?? ""}</Text>
          <View style={s.heroDivider} />
          <View style={s.heroBtnRow}>
            <TouchableOpacity
              style={s.heroBtn}
              onPress={() => openModal("profile")}
              activeOpacity={0.85}
            >
              <Ionicons name="pencil-outline" size={14} color={C.dark} />
              <Text style={s.heroBtnTxt}>Edit Profile</Text>
            </TouchableOpacity>
            <View style={s.heroBtnSep} />
            <TouchableOpacity
              style={[s.heroBtn, s.heroBtnDark]}
              onPress={() => openModal("password")}
              activeOpacity={0.85}
            >
              <Ionicons
                name="lock-closed-outline"
                size={14}
                color="rgba(255,255,255,0.9)"
              />
              <Text style={[s.heroBtnTxt, { color: "rgba(255,255,255,0.9)" }]}>
                Password
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* ── Referral & Share */}
        <View style={s.referralCard}>
          <TouchableOpacity
            style={[
              s.referralHeader,
              referralExpanded ? s.referralHeaderExpanded : null,
            ]}
            activeOpacity={0.85}
            onPress={() => setReferralExpanded((prev) => !prev)}
          >
            <View style={s.referralIconWrap}>
              <Ionicons name="gift-outline" size={18} color={C.dark} />
            </View>
            <View style={s.referralContent}>
              <Text style={s.referralTitle}>Referral & Share</Text>
              <Text style={s.referralSubtitle}>
                Share your farm QR and referral code with customers.
              </Text>
            </View>
            <View style={s.referralToggleBtn}>
              <Ionicons
                name={referralExpanded ? "remove" : "add"}
                size={18}
                color={C.dark}
              />
            </View>
          </TouchableOpacity>
          {referralExpanded ? (
            <View style={s.referralRow}>
              <View style={s.referralCodeBlock}>
                <Text style={s.referralLabel}>Referral Code</Text>
                <View style={s.referralCodePill}>
                  <Text style={s.referralCodeValue}>{referralCode}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={s.referralShareBtn}
                activeOpacity={0.85}
                onPress={() => openModal("share")}
              >
                <Ionicons name="share-social-outline" size={15} color="#fff" />
                <Text style={s.referralShareTxt}>Share</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {/* ── Content Management */}
        <View style={s.contentCard}>
          <View style={s.contentCardHeader}>
            <View style={s.contentIconWrap}>
              <Ionicons name="images-outline" size={18} color={C.dark} />
            </View>
            <View style={s.contentCardBody}>
              <Text style={s.contentCardTitle}>App Content</Text>
              <Text style={s.contentCardSubtitle}>
                Add image content for customer app banners and highlights.
              </Text>
            </View>
            <View style={s.contentCountPill}>
              <Text style={s.contentCountText}>{contentItems.length}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={s.contentManageBtn}
            activeOpacity={0.85}
            onPress={() =>
              router.push({
                pathname: "/(admin)/content",
                params: { from: "settings" },
              } as any)
            }
          >
            <Ionicons name="create-outline" size={15} color="#fff" />
            <Text style={s.contentManageText}>Manage Content</Text>
          </TouchableOpacity>
        </View>

        {/* ── Wallet Payment */}
        <View style={s.contentCard}>
          <View style={s.contentCardHeader}>
            <View style={s.contentIconWrap}>
              <Ionicons name="qr-code-outline" size={18} color={C.dark} />
            </View>
            <View style={s.contentCardBody}>
              <Text style={s.contentCardTitle}>Wallet Payment</Text>
              <Text style={s.contentCardSubtitle}>
                Upload payment QR and manage customer recharge requests.
              </Text>
            </View>
            <View style={s.contentCountPill}>
              <Ionicons name="wallet-outline" size={16} color={C.dark} />
            </View>
          </View>
          <TouchableOpacity
            style={s.contentManageBtn}
            activeOpacity={0.85}
            onPress={() =>
              router.push({
                pathname: "/(admin)/wallet-payment",
                params: { from: "settings" },
              } as any)
            }
          >
            <Ionicons name="card-outline" size={15} color="#fff" />
            <Text style={s.contentManageText}>Manage Wallet Payment</Text>
          </TouchableOpacity>
        </View>

        {/* ── App Settings */}
        <View style={s.contentCard}>
          <View style={s.contentCardHeader}>
            <View style={s.contentIconWrap}>
              <Ionicons name="phone-portrait-outline" size={18} color={C.dark} />
            </View>
            <View style={s.contentCardBody}>
              <Text style={s.contentCardTitle}>App Settings</Text>
              <Text style={s.contentCardSubtitle}>
                Manage customer payment methods like Wallet, Online and COD.
              </Text>
            </View>
            <View style={s.contentCountPill}>
              <Ionicons name="options-outline" size={16} color={C.dark} />
            </View>
          </View>
          <TouchableOpacity
            style={s.contentManageBtn}
            activeOpacity={0.85}
            onPress={() =>
              router.push({
                pathname: "/(admin)/app-settings",
                params: { from: "settings" },
              } as any)
            }
          >
            <Ionicons name="settings-outline" size={15} color="#fff" />
            <Text style={s.contentManageText}>Manage App Settings</Text>
          </TouchableOpacity>
        </View>

        {/* ── Invoice Template */}
        <View style={s.contentCard}>
          <View style={s.contentCardHeader}>
            <View style={s.contentIconWrap}>
              <Ionicons name="receipt-outline" size={18} color={C.dark} />
            </View>
            <View style={s.contentCardBody}>
              <Text style={s.contentCardTitle}>Invoice Template</Text>
              <Text style={s.contentCardSubtitle}>
                Customize PDF invoice header, color, terms and footer.
              </Text>
            </View>
            <View style={s.contentCountPill}>
              <Ionicons name="document-text-outline" size={16} color={C.dark} />
            </View>
          </View>
          <TouchableOpacity
            style={s.contentManageBtn}
            activeOpacity={0.85}
            onPress={() =>
              router.push({
                pathname: "/(admin)/invoice-template",
                params: { from: "settings" },
              } as any)
            }
          >
            <Ionicons name="create-outline" size={15} color="#fff" />
            <Text style={s.contentManageText}>Manage Invoice Template</Text>
          </TouchableOpacity>
        </View>

        {/* ── Notifications */}
        <View style={s.contentCard}>
          <View style={s.contentCardHeader}>
            <View style={s.contentIconWrap}>
              <Ionicons name="notifications-outline" size={18} color={C.dark} />
            </View>
            <View style={s.contentCardBody}>
              <Text style={s.contentCardTitle}>Notifications</Text>
              <Text style={s.contentCardSubtitle}>
                View order, subscription, wallet and vacation alerts.
              </Text>
            </View>
            <View style={s.contentCountPill}>
              <Ionicons name="notifications" size={16} color={C.dark} />
            </View>
          </View>
          <TouchableOpacity
            style={s.contentManageBtn}
            activeOpacity={0.85}
            onPress={() =>
              router.push({
                pathname: "/(admin)/notification",
                params: { from: "settings" },
              } as any)
            }
          >
            <Ionicons name="open-outline" size={15} color="#fff" />
            <Text style={s.contentManageText}>Open Notifications</Text>
          </TouchableOpacity>
        </View>

        {/* ── System Configuration */}
        <View style={s.section}>
          <SectionHeader title="System Configuration" />
          <View style={s.card}>
            <SettingRow
              icon="time-outline"
              iconBg="#FFF8E8"
              iconColor={C.amber}
              label="Order Cut-off Time"
              value="Manage rules"
              onPress={() => router.push("/(admin)/order-cutoff" as any)}
            />
            <View style={s.divider} />
            <SettingRow
              icon="bicycle-outline"
              iconBg={C.peach}
              iconColor={C.primary}
              label="Delivery Window"
              value="Manage windows"
              onPress={() => router.push("/(admin)/delivery-window" as any)}
            />
            <View style={s.divider} />
            <SettingRow
              icon="wallet-outline"
              iconBg="#F5EDE8"
              iconColor={C.dark}
              label="Grace Period"
              value={settings.gracePeriod}
              onPress={() => openModal("grace")}
            />
          </View>
        </View>

        {/* ── Business Information */}
        <View style={s.section}>
          <SectionHeader title="Business Information" />
          <View style={s.card}>
            <SettingRow
              icon="storefront-outline"
              iconBg="#FFF0E8"
              iconColor={C.accent}
              label="Business Information"
              value={`${settings.businessName} · ${locationsDisplay}`}
              onPress={() =>
                router.push({
                  pathname: "/(admin)/business-information",
                  params: { from: "settings" },
                } as any)
              }
            />
          </View>
        </View>

        <View style={s.versionStrip}>
          <MaterialCommunityIcons name="cow" size={16} color="#1e5e20" />
          <Text style={[s.versionTxt, { color: "#1a5c1b" }]}>
            GauSatva Version-{APP_VERSION}
          </Text>
        </View>

        <TouchableOpacity
          style={s.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <View style={s.logoutIconWrap}>
            <Ionicons name="log-out-outline" size={18} color={C.dark} />
          </View>
          <Text style={s.logoutTxt}>Logout</Text>
          <Ionicons
            name="chevron-forward"
            size={15}
            color={C.light}
            style={{ marginLeft: "auto" }}
          />
        </TouchableOpacity>

      </ScrollView>

      {/* ── Share Modal */}
      <ShareModal
        visible={activeModal === "share"}
        onClose={closeModal}
        adminUser={user}
      />

      {/* ── Delete Account Modal */}
      <Modal
        visible={deleteModal}
        animationType="slide"
        transparent
        onRequestClose={() => setDeleteModal(false)}
      >
        <View style={mS.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={mS.sheet}
          >
            <View style={mS.drag} />
            <View style={mS.header}>
              <View style={mS.headerLeft}>
                <View style={[mS.headerIcon, { backgroundColor: "#FEE2E2" }]}>
                  <Ionicons name="trash-outline" size={16} color="#dc2626" />
                </View>
                <Text style={mS.headerTitle}>Delete Account</Text>
              </View>
              <TouchableOpacity
                style={mS.closeBtn}
                onPress={() => setDeleteModal(false)}
              >
                <Ionicons name="close" size={16} color={C.dark} />
              </TouchableOpacity>
            </View>
            <View style={mS.body}>
              <Text style={mS.shareSubtitle}>
                Enter your password to confirm permanent account deletion.
              </Text>
              <TextInput
                style={mS.input}
                value={deletePassword}
                onChangeText={setDeletePassword}
                placeholder="Password"
                placeholderTextColor={C.light}
                secureTextEntry
              />
              <TouchableOpacity
                style={[mS.saveBtn, { backgroundColor: "#dc2626" }]}
                onPress={confirmDeleteAccount}
                disabled={deletingAccount}
                activeOpacity={0.8}
              >
                {deletingAccount ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={mS.saveTxt}>Continue</Text>
                )}
              </TouchableOpacity>
              <View style={{ height: 16 }} />
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ── Modal: Order Cut-off */}
      <SettingModal
        visible={activeModal === "cutoff"}
        title="Order Cut-off Time"
        icon="time-outline"
        onClose={closeModal}
        onSave={saveSettings}
      >
        <PickerRow
          label="Hour"
          options={HOURS_12}
          selected={draft.cutoffHour}
          onSelect={(v) => setDraft((d) => ({ ...d, cutoffHour: v }))}
        />
        <PickerRow
          label="Minute"
          options={MINUTES}
          selected={draft.cutoffMin}
          onSelect={(v) => setDraft((d) => ({ ...d, cutoffMin: v }))}
        />
        <PickerRow
          label="AM / PM"
          options={["AM", "PM"]}
          selected={draft.cutoffAmPm}
          onSelect={(v) =>
            setDraft((d) => ({ ...d, cutoffAmPm: v as "AM" | "PM" }))
          }
        />
        <TouchableOpacity
          style={mS.saveBtn}
          onPress={saveSettings}
          activeOpacity={0.8}
        >
          <Ionicons name="checkmark-circle" size={18} color="#fff" />
          <Text style={mS.saveTxt}>Save Changes</Text>
        </TouchableOpacity>
      </SettingModal>

      {/* ── Modal: Delivery Window */}
      <SettingModal
        visible={activeModal === "delivery"}
        title="Delivery Window"
        icon="bicycle-outline"
        onClose={closeModal}
        onSave={saveSettings}
      >
        <Text style={mS.subHeading}>Start Time</Text>
        <PickerRow
          label="Hour"
          options={HOURS_12}
          selected={draft.deliveryStartHour}
          onSelect={(v) => setDraft((d) => ({ ...d, deliveryStartHour: v }))}
        />
        <PickerRow
          label="Minute"
          options={MINUTES}
          selected={draft.deliveryStartMin}
          onSelect={(v) => setDraft((d) => ({ ...d, deliveryStartMin: v }))}
        />
        <PickerRow
          label="AM / PM"
          options={["AM", "PM"]}
          selected={draft.deliveryStartAmPm}
          onSelect={(v) =>
            setDraft((d) => ({ ...d, deliveryStartAmPm: v as "AM" | "PM" }))
          }
        />
        <View style={mS.separator} />
        <Text style={mS.subHeading}>End Time</Text>
        <PickerRow
          label="Hour"
          options={HOURS_12}
          selected={draft.deliveryEndHour}
          onSelect={(v) => setDraft((d) => ({ ...d, deliveryEndHour: v }))}
        />
        <PickerRow
          label="Minute"
          options={MINUTES}
          selected={draft.deliveryEndMin}
          onSelect={(v) => setDraft((d) => ({ ...d, deliveryEndMin: v }))}
        />
        <PickerRow
          label="AM / PM"
          options={["AM", "PM"]}
          selected={draft.deliveryEndAmPm}
          onSelect={(v) =>
            setDraft((d) => ({ ...d, deliveryEndAmPm: v as "AM" | "PM" }))
          }
        />
        <TouchableOpacity
          style={mS.saveBtn}
          onPress={saveSettings}
          activeOpacity={0.8}
        >
          <Ionicons name="checkmark-circle" size={18} color="#fff" />
          <Text style={mS.saveTxt}>Save Changes</Text>
        </TouchableOpacity>
      </SettingModal>

      {/* ── Modal: Grace Period */}
      <SettingModal
        visible={activeModal === "grace"}
        title="Grace Period"
        icon="wallet-outline"
        onClose={closeModal}
        onSave={saveSettings}
      >
        <Text style={mS.fieldLabel}>Allowed Negative Balance Duration</Text>
        <View style={mS.graceGrid}>
          {GRACE_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[mS.chip, draft.gracePeriod === opt && mS.chipActive]}
              onPress={() => setDraft((d) => ({ ...d, gracePeriod: opt }))}
            >
              <Text
                style={[
                  mS.chipTxt,
                  draft.gracePeriod === opt && mS.chipTxtActive,
                ]}
              >
                {opt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          style={mS.saveBtn}
          onPress={saveSettings}
          activeOpacity={0.8}
        >
          <Ionicons name="checkmark-circle" size={18} color="#fff" />
          <Text style={mS.saveTxt}>Save Changes</Text>
        </TouchableOpacity>
      </SettingModal>

      {/* ── Modal: Business Name (writes to admin's real `name`) */}
      <SettingModal
        visible={activeModal === "business"}
        title="Business Name"
        icon="storefront-outline"
        onClose={closeModal}
        onSave={saveBusinessName}
      >
        <Text style={mS.fieldLabel}>Business Name</Text>
        <TextInput
          style={mS.input}
          value={draft.businessName}
          onChangeText={(v) => setDraft((d) => ({ ...d, businessName: v }))}
          placeholder="Enter business name"
          placeholderTextColor={C.light}
          autoFocus
        />
        <TouchableOpacity
          style={[mS.saveBtn, isSaving && mS.saveBtnDisabled]}
          onPress={saveBusinessName}
          activeOpacity={0.8}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
              <Text style={mS.saveTxt}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>
      </SettingModal>

      {/* ── Modal: Support Contact (writes to admin's real `phone`) */}
      <SettingModal
        visible={activeModal === "contact"}
        title="Support Contact"
        icon="call-outline"
        onClose={closeModal}
        onSave={saveSupportContact}
      >
        <Text style={mS.fieldLabel}>Phone Number</Text>
        <TextInput
          style={mS.input}
          value={draft.supportContact}
          onChangeText={(v) => setDraft((d) => ({ ...d, supportContact: v }))}
          placeholder="+91 XXXXXXXXXX"
          placeholderTextColor={C.light}
          keyboardType="phone-pad"
          autoFocus
        />
        <TouchableOpacity
          style={[mS.saveBtn, isSaving && mS.saveBtnDisabled]}
          onPress={saveSupportContact}
          activeOpacity={0.8}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
              <Text style={mS.saveTxt}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>
      </SettingModal>

      {/* ── Modal: Business Locations (multiple branches, own collection) ── */}
      <SettingModal
        visible={activeModal === "locations"}
        title="Business Locations"
        icon="location-outline"
        onClose={closeModal}
        onSave={() => { }}
      >
        {locationsLoading ? (
          <ActivityIndicator
            color={C.primary}
            style={{ marginVertical: 24 }}
          />
        ) : locations.length === 0 ? (
          <View style={loc.emptyBox}>
            <Ionicons name="location-outline" size={26} color={C.light} />
            <Text style={loc.emptyText}>
              No locations added yet. Add your branches below.
            </Text>
          </View>
        ) : (
          locations.map((item) => (
            <View key={item.id} style={loc.card}>
              <View style={loc.cardTop}>
                <View style={loc.cardTitleRow}>
                  <Text style={loc.cardLabel} numberOfLines={1}>
                    {item.label}
                  </Text>
                  {item.is_primary ? (
                    <View style={loc.primaryPill}>
                      <Ionicons name="star" size={10} color="#fff" />
                      <Text style={loc.primaryPillTxt}>Primary</Text>
                    </View>
                  ) : null}
                </View>
                <View style={loc.cardActions}>
                  <TouchableOpacity
                    style={loc.cardActionBtn}
                    onPress={() => editLocation(item)}
                  >
                    <Ionicons name="pencil-outline" size={15} color={C.dark} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[loc.cardActionBtn, { backgroundColor: "#FEE2E2" }]}
                    onPress={() => deleteLocation(item)}
                  >
                    <Ionicons name="trash-outline" size={15} color="#dc2626" />
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={loc.cardAddress}>
                {item.address_line}, {item.city}, {item.state} -{" "}
                {item.pincode}
              </Text>
            </View>
          ))
        )}

        <View style={mS.separator} />

        <Text style={mS.subHeading}>
          {editingLocationId ? "Edit Location" : "Add a New Location"}
        </Text>

        <Text style={mS.fieldLabel}>Label</Text>
        <TextInput
          style={mS.input}
          value={locationDraft.label}
          onChangeText={(v) =>
            setLocationDraft((d) => ({ ...d, label: v }))
          }
          placeholder="e.g. Main Farm, Sector 12 Branch"
          placeholderTextColor={C.light}
        />

        <Text style={mS.fieldLabel}>Address Line</Text>
        <TextInput
          style={mS.input}
          value={locationDraft.address_line}
          onChangeText={(v) =>
            setLocationDraft((d) => ({ ...d, address_line: v }))
          }
          placeholder="House no, street, area"
          placeholderTextColor={C.light}
        />

        <Text style={mS.fieldLabel}>City</Text>
        <TextInput
          style={mS.input}
          value={locationDraft.city}
          onChangeText={(v) => setLocationDraft((d) => ({ ...d, city: v }))}
          placeholder="City"
          placeholderTextColor={C.light}
        />

        <Text style={mS.fieldLabel}>State</Text>
        <TextInput
          style={mS.input}
          value={locationDraft.state}
          onChangeText={(v) => setLocationDraft((d) => ({ ...d, state: v }))}
          placeholder="State"
          placeholderTextColor={C.light}
        />

        <Text style={mS.fieldLabel}>Pincode</Text>
        <TextInput
          style={mS.input}
          value={locationDraft.pincode}
          onChangeText={(v) =>
            setLocationDraft((d) => ({
              ...d,
              pincode: v.replace(/\D/g, "").slice(0, 6),
            }))
          }
          placeholder="6-digit pincode"
          placeholderTextColor={C.light}
          keyboardType="number-pad"
          maxLength={6}
        />

        <TouchableOpacity
          style={loc.primaryToggle}
          activeOpacity={0.8}
          onPress={() =>
            setLocationDraft((d) => ({ ...d, is_primary: !d.is_primary }))
          }
        >
          <Ionicons
            name={locationDraft.is_primary ? "checkbox" : "square-outline"}
            size={20}
            color={C.primary}
          />
          <Text style={loc.primaryToggleTxt}>Set as primary location</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[mS.saveBtn, locationSaving && mS.saveBtnDisabled]}
          onPress={saveLocation}
          activeOpacity={0.8}
          disabled={locationSaving}
        >
          {locationSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons
                name={editingLocationId ? "checkmark-circle" : "add-circle"}
                size={18}
                color="#fff"
              />
              <Text style={mS.saveTxt}>
                {editingLocationId ? "Update Location" : "Add Location"}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {editingLocationId ? (
          <TouchableOpacity
            style={mS.backBtn}
            onPress={resetLocationDraft}
          >
            <Ionicons name="close-outline" size={14} color={C.muted} />
            <Text style={mS.backTxt}>Cancel edit</Text>
          </TouchableOpacity>
        ) : null}
      </SettingModal>

      {/* ── Modal: Edit Profile */}
      <SettingModal
        visible={activeModal === "profile"}
        title="Edit Profile"
        icon="person-outline"
        onClose={closeModal}
        onSave={saveProfile}
      >
        <View style={mS.profilePreview}>
          <View style={mS.profilePreviewAvatar}>
            <Text style={mS.profilePreviewInitials}>{initials}</Text>
          </View>
          <View>
            <Text style={mS.profilePreviewName}>
              {profileDraft.name || "Your Name"}
            </Text>
            <Text style={mS.profilePreviewEmail}>
              {profileDraft.email || "your@email.com"}
            </Text>
          </View>
        </View>
        {[
          {
            label: "Business name",
            key: "name",
            placeholder: "Enter Business Name",
            keyboard: "default",
            icon: "person-outline",
          },
          {
            label: "Email Address",
            key: "email",
            placeholder: "Business@email.com",
            keyboard: "email-address",
            icon: "mail-outline",
          },
          {
            label: "Phone Number",
            key: "phone",
            placeholder: "+91 XXXXXXXXXX",
            keyboard: "phone-pad",
            icon: "call-outline",
          },
        ].map((f) => (
          <View key={f.key} style={{ marginBottom: 4 }}>
            <Text style={mS.fieldLabel}>{f.label}</Text>
            <View style={mS.inputWrap}>
              <View style={mS.inputIcon}>
                <Ionicons name={f.icon as any} size={15} color={C.light} />
              </View>
              <TextInput
                style={[mS.input, mS.inputWithIcon]}
                value={profileDraft[f.key as keyof typeof profileDraft]}
                onChangeText={(v) =>
                  setProfileDraft((p) => ({ ...p, [f.key]: v }))
                }
                placeholder={f.placeholder}
                placeholderTextColor={C.light}
                keyboardType={f.keyboard as any}
                autoCapitalize={f.key === "name" ? "words" : "none"}
              />
            </View>
          </View>
        ))}
        <TouchableOpacity
          style={[mS.saveBtn, isSaving && mS.saveBtnDisabled]}
          onPress={saveProfile}
          activeOpacity={0.8}
          disabled={isSaving}
        >
          <Ionicons
            name={isSaving ? "hourglass-outline" : "checkmark-circle"}
            size={18}
            color="#fff"
          />
          <Text style={mS.saveTxt}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Text>
        </TouchableOpacity>
      </SettingModal>

      {/* ─────────────────────────────────────────────
          ── Modal: Change Password (real OTP flow)
          ───────────────────────────────────────────── */}
      <SettingModal
        visible={activeModal === "password"}
        title={pwStepTitle}
        icon="lock-closed-outline"
        onClose={closeModal}
        onSave={() => { }}
      >
        {/* Step indicator */}
        <View style={mS.stepRow}>
          {(["request", "verify", "change"] as OtpStep[]).map((step, i) => {
            const done =
              (otpStep === "verify" && i === 0) ||
              (otpStep === "change" && i <= 1);
            const active = otpStep === step;
            return (
              <React.Fragment key={step}>
                <View
                  style={[
                    mS.stepDot,
                    active && mS.stepDotActive,
                    done && mS.stepDotDone,
                  ]}
                >
                  {done ? (
                    <Ionicons name="checkmark" size={10} color="#fff" />
                  ) : (
                    <Text style={mS.stepDotTxt}>{i + 1}</Text>
                  )}
                </View>
                {i < 2 && (
                  <View style={[mS.stepLine, done && mS.stepLineDone]} />
                )}
              </React.Fragment>
            );
          })}
        </View>

        {/* ── Step 1: Request OTP */}
        {otpStep === "request" && (
          <View>
            <View style={mS.stepInfo}>
              <View style={mS.stepInfoIconWrap}>
                <Ionicons name="shield-outline" size={28} color={C.primary} />
              </View>
              <Text style={mS.stepInfoTitle}>Verify your identity</Text>
              <Text style={mS.stepInfoDesc}>
                Tap the button below to generate a one-time password. It will
                appear on-screen for you to use.
              </Text>
            </View>
            <TouchableOpacity
              style={[mS.saveBtn, pwLoading && mS.saveBtnDisabled]}
              onPress={handleRequestOtp}
              activeOpacity={0.8}
              disabled={pwLoading}
            >
              {pwLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="key-outline" size={17} color="#fff" />
                  <Text style={mS.saveTxt}>Generate OTP</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* ── Step 2: Show OTP on screen + entry boxes */}
        {otpStep === "verify" && (
          <View>
            {/* OTP shown prominently at top of modal */}
            <View style={pw.otpDisplayCard}>
              <View style={pw.otpDisplayHeader}>
                <Ionicons name="eye-outline" size={15} color={C.dark} />
                <Text style={pw.otpDisplayLabel}>Your One-Time Password</Text>
              </View>
              <View style={pw.otpDisplayDigits}>
                {screenOtp.split("").map((digit, i) => (
                  <View key={i} style={pw.otpDisplayDigitBox}>
                    <Text style={pw.otpDisplayDigit}>{digit}</Text>
                  </View>
                ))}
              </View>
              <Text style={pw.otpDisplayHint}>Valid for 10 minutes</Text>
            </View>

            <View style={mS.stepInfo}>
              <View style={mS.stepInfoIconWrap}>
                <Ionicons name="keypad-outline" size={28} color={C.primary} />
              </View>
              <Text style={mS.stepInfoTitle}>Enter the OTP above</Text>
              <Text style={mS.stepInfoDesc}>
                Type the 6-digit code shown in the box above into the input
                below.
              </Text>
            </View>

            <Text style={mS.fieldLabel}>Enter OTP</Text>
            <OtpInput value={enteredOtp} onChange={setEnteredOtp} />

            {/* Resend row */}
            <View style={mS.resendRow}>
              <Text style={mS.resendLabel}>Need a new code?</Text>
              <TouchableOpacity
                onPress={handleResendOtp}
                disabled={otpResendTimer > 0 || pwLoading}
              >
                <Text
                  style={[
                    mS.resendBtn,
                    (otpResendTimer > 0 || pwLoading) && mS.resendBtnDisabled,
                  ]}
                >
                  {otpResendTimer > 0
                    ? `Resend in ${otpResendTimer}s`
                    : "Regenerate OTP"}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[mS.saveBtn, pwLoading && mS.saveBtnDisabled]}
              onPress={handleVerifyOtp}
              activeOpacity={0.8}
              disabled={pwLoading}
            >
              {pwLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color="#fff" />
                  <Text style={mS.saveTxt}>Verify OTP</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={mS.backBtn}
              onPress={() => {
                setOtpStep("request");
                setScreenOtp("");
                setEnteredOtp("");
              }}
            >
              <Ionicons name="arrow-back-outline" size={14} color={C.muted} />
              <Text style={mS.backTxt}>Go back</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Step 3: New password */}
        {otpStep === "change" && (
          <View>
            <View style={mS.stepInfo}>
              <View style={mS.stepInfoIconWrap}>
                <Ionicons
                  name="lock-open-outline"
                  size={28}
                  color={C.primary}
                />
              </View>
              <Text style={mS.stepInfoTitle}>Set new password</Text>
              <Text style={mS.stepInfoDesc}>
                OTP verified. Enter your new password below.
              </Text>
            </View>
            {(
              [
                { label: "New Password", key: "newPw" },
                { label: "Confirm New Password", key: "confirm" },
              ] as const
            ).map((f) => (
              <View key={f.key}>
                <Text style={mS.fieldLabel}>{f.label}</Text>
                <View style={mS.pwRow}>
                  <TextInput
                    style={[mS.input, { flex: 1, marginBottom: 0 }]}
                    value={pwDraft[f.key]}
                    onChangeText={(v) =>
                      setPwDraft((p) => ({ ...p, [f.key]: v }))
                    }
                    placeholder="••••••••"
                    placeholderTextColor={C.light}
                    secureTextEntry={!showPw[f.key]}
                  />
                  <TouchableOpacity
                    style={mS.eyeBtn}
                    onPress={() =>
                      setShowPw((p) => ({ ...p, [f.key]: !p[f.key] }))
                    }
                  >
                    <Ionicons
                      name={showPw[f.key] ? "eye-off-outline" : "eye-outline"}
                      size={18}
                      color={C.accent}
                    />
                  </TouchableOpacity>
                </View>
                <View style={{ height: 12 }} />
              </View>
            ))}
            <View style={mS.pwHint}>
              <Ionicons
                name="information-circle-outline"
                size={14}
                color={C.muted}
              />
              <Text style={mS.pwHintTxt}>
                Password must be at least 6 characters
              </Text>
            </View>
            <TouchableOpacity
              style={[mS.saveBtn, pwLoading && mS.saveBtnDisabled]}
              onPress={handleSavePassword}
              activeOpacity={0.8}
              disabled={pwLoading}
            >
              {pwLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="shield-checkmark" size={18} color="#fff" />
                  <Text style={mS.saveTxt}>Update Password</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </SettingModal>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────

const aS = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(61,31,10,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
  },
  box: {
    width: "100%",
    backgroundColor: "#FFF8EF",
    borderRadius: 28,
    paddingTop: 28,
    paddingBottom: 22,
    paddingHorizontal: 24,
    alignItems: "center",
    shadowColor: "#BB6B3F",
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    color: "#3D1F0A",
    textAlign: "center",
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  msg: {
    fontSize: 14,
    color: "#A07850",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
    fontWeight: "500",
  },
  btnRow: { flexDirection: "row", gap: 10, width: "100%", marginTop: 4 },
  btn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: "#FFE8D6",
    alignItems: "center",
  },
  btnCancel: { backgroundColor: "#FFF3DC" },
  btnDest: { backgroundColor: "#FF9675" },
  btnTxt: { fontSize: 14, fontWeight: "700", color: "#BB6B3F" },
  btnTxtCancel: { color: "#A07850" },
  btnTxtDest: { color: "#3D1F0A" },
});

const mS = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(61,31,10,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFF8EF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: "92%",
  },
  drag: {
    width: 36,
    height: 4,
    backgroundColor: "#D4B896",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 14,
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#FFE8C8",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "#FFE8D6",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 17, fontWeight: "800", color: "#3D1F0A" },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "#FFE8D6",
    justifyContent: "center",
    alignItems: "center",
  },
  body: { padding: 20 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#BB6B3F",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  subHeading: {
    fontSize: 13,
    fontWeight: "800",
    color: "#3D1F0A",
    marginBottom: 10,
    marginTop: 4,
  },
  separator: { height: 1, backgroundColor: "#FFE8C8", marginVertical: 16 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#FFE8D6",
    backgroundColor: "#FFF8EF",
    marginRight: 8,
    marginBottom: 8,
  },
  chipActive: { backgroundColor: "#FF9675", borderColor: "#FF9675" },
  chipTxt: { fontSize: 13, fontWeight: "600", color: "#8B6854" },
  chipTxtActive: { color: "#fff", fontWeight: "700" },
  graceGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 4 },
  inputWrap: { position: "relative", marginBottom: 12 },
  inputIcon: {
    position: "absolute",
    left: 14,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    zIndex: 1,
  },
  input: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
    fontSize: 15,
    color: "#3D1F0A",
    borderWidth: 1.5,
    borderColor: "#FFE8C8",
    fontWeight: "500",
  },
  inputWithIcon: { paddingLeft: 42, marginBottom: 0 },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FF9675",
    borderRadius: 14,
    paddingVertical: 15,
    marginTop: 8,
    shadowColor: "#FF9675",
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  saveBtnDisabled: { backgroundColor: "#FFBF9E", shadowOpacity: 0 },
  saveTxt: { fontSize: 15, fontWeight: "800", color: "#fff" },
  shareSubtitle: {
    fontSize: 13,
    color: "#A07850",
    lineHeight: 18,
    marginBottom: 16,
    fontWeight: "500",
  },
  pwRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  eyeBtn: {
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#FFE8C8",
  },
  pwHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
    marginBottom: 8,
  },
  pwHintTxt: { fontSize: 12, color: "#A07850", fontWeight: "500" },
  profilePreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#FFF0E4",
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
  },
  profilePreviewAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FF9675",
    justifyContent: "center",
    alignItems: "center",
  },
  profilePreviewInitials: { fontSize: 16, fontWeight: "800", color: "#fff" },
  profilePreviewName: { fontSize: 15, fontWeight: "700", color: "#3D1F0A" },
  profilePreviewEmail: { fontSize: 12, color: "#A07850", marginTop: 2 },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  stepDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#FFE8D6",
    borderWidth: 1.5,
    borderColor: "#FFD4B0",
    justifyContent: "center",
    alignItems: "center",
  },
  stepDotActive: { backgroundColor: "#FF9675", borderColor: "#FF9675" },
  stepDotDone: { backgroundColor: "#BB6B3F", borderColor: "#BB6B3F" },
  stepDotTxt: { fontSize: 12, fontWeight: "800", color: "#BB6B3F" },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#FFE8D6",
    marginHorizontal: 4,
    maxWidth: 44,
  },
  stepLineDone: { backgroundColor: "#BB6B3F" },
  stepInfo: {
    alignItems: "center",
    backgroundColor: "#FFF0E4",
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
  },
  stepInfoIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: C.deepPeach,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  stepInfoTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#3D1F0A",
    marginBottom: 6,
  },
  stepInfoDesc: {
    fontSize: 13,
    color: "#A07850",
    textAlign: "center",
    lineHeight: 19,
    fontWeight: "500",
  },
  otpRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 16,
  },
  otpBox: {
    flex: 1,
    height: 56,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#FFE8C8",
    fontSize: 22,
    fontWeight: "800",
    color: "#3D1F0A",
    textAlign: "center",
  },
  otpBoxFilled: { borderColor: "#FF9675", backgroundColor: "#FFF8EF" },
  resendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 16,
  },
  resendLabel: { fontSize: 13, color: "#A07850" },
  resendBtn: {
    fontSize: 13,
    fontWeight: "700",
    color: "#BB6B3F",
    textDecorationLine: "underline",
  },
  resendBtnDisabled: { color: "#C9A882", textDecorationLine: "none" },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 14,
    paddingVertical: 8,
  },
  backTxt: { fontSize: 13, color: "#A07850", fontWeight: "600" },
});

// OTP display card styles (shown on screen at step 2)
const pw = StyleSheet.create({
  otpDisplayCard: {
    backgroundColor: "#FFF3E8",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    borderWidth: 2,
    borderColor: C.deepPeach,
    marginBottom: 20,
  },
  otpDisplayHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 16,
  },
  otpDisplayLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: C.dark,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  otpDisplayDigits: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  otpDisplayDigitBox: {
    width: 44,
    height: 54,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: C.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: C.primary,
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  otpDisplayDigit: {
    fontSize: 24,
    fontWeight: "900",
    color: C.dark,
    letterSpacing: -0.5,
  },
  otpDisplayHint: {
    fontSize: 11,
    color: C.muted,
    fontWeight: "600",
  },
});

// Business Locations modal styles
const loc = StyleSheet.create({
  emptyBox: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF0E4",
    borderRadius: 16,
    paddingVertical: 28,
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    color: C.muted,
    textAlign: "center",
    fontWeight: "500",
    lineHeight: 18,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#FFE8C8",
    padding: 14,
    marginBottom: 10,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: "#3D1F0A",
    flexShrink: 1,
  },
  primaryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: C.primary,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  primaryPillTxt: { fontSize: 9, fontWeight: "800", color: "#fff" },
  cardActions: { flexDirection: "row", gap: 8 },
  cardActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: "#FFE8D6",
    justifyContent: "center",
    alignItems: "center",
  },
  cardAddress: {
    fontSize: 12.5,
    color: "#A07850",
    marginTop: 8,
    lineHeight: 18,
    fontWeight: "500",
  },
  primaryToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
    marginBottom: 6,
  },
  primaryToggleTxt: { fontSize: 13, color: "#3D1F0A", fontWeight: "600" },
});

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF8F4" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 6,
  },
  topBarTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#1A1A1A",
    letterSpacing: -0.8,
  },
  topBarRight: { flexDirection: "row", gap: 8 },
  infoPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: C.deepPeach,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  infoPillTxt: { fontSize: 11, fontWeight: "700", color: C.muted },
  heroCard: {
    marginHorizontal: 16,
    marginBottom: 18,
    marginTop: 8,
    backgroundColor: C.primary,
    borderRadius: 28,
    padding: 24,
    alignItems: "center",
    overflow: "hidden",
    shadowColor: "#BB6B3F",
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  heroBubble1: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.08)",
    top: -30,
    right: -20,
  },
  heroBubble2: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.06)",
    bottom: -20,
    left: 20,
  },
  heroAvatarRow: { alignItems: "center", marginBottom: 12 },
  heroAvatarRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2.5,
    borderColor: "rgba(255,255,255,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  heroAvatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "rgba(255,255,255,0.22)",
    justifyContent: "center",
    alignItems: "center",
  },
  heroAvatarTxt: {
    fontSize: 24,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -0.5,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(187,107,63,0.55)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  heroBadgeTxt: {
    fontSize: 10,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.5,
  },
  heroName: {
    fontSize: 20,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  heroEmail: {
    fontSize: 13,
    color: "rgba(255,255,255,0.72)",
    fontWeight: "500",
  },
  heroDivider: {
    width: "80%",
    height: 1,
    backgroundColor: "rgba(255,255,255,0.18)",
    marginVertical: 16,
  },
  heroBtnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
    width: "100%",
  },
  heroBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 14,
    paddingVertical: 11,
  },
  heroBtnDark: { backgroundColor: "rgba(255,255,255,0.15)" },
  heroBtnSep: { width: 10 },
  heroBtnTxt: { fontSize: 13, fontWeight: "700", color: C.dark },
  referralCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 18,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: C.deepPeach,
    shadowColor: "#BB6B3F",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  referralHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  referralHeaderExpanded: { marginBottom: 12 },
  referralIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: C.peach,
    justifyContent: "center",
    alignItems: "center",
  },
  referralContent: { flex: 1 },
  referralTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: C.text,
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  referralSubtitle: {
    fontSize: 11,
    lineHeight: 16,
    color: C.muted,
    fontWeight: "500",
  },
  referralToggleBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: C.peach,
    justifyContent: "center",
    alignItems: "center",
  },
  referralRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  referralCodeBlock: { flex: 1, gap: 8 },
  referralLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: C.accent,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  referralCodePill: {
    alignSelf: "flex-start",
    backgroundColor: "#FFF6EE",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.deepPeach,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  referralCodeValue: {
    fontSize: 16,
    fontWeight: "800",
    color: C.dark,
    letterSpacing: 1,
  },
  referralShareBtn: {
    minWidth: 90,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: C.primary,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  referralShareTxt: { fontSize: 12, fontWeight: "800", color: "#fff" },
  contentCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 18,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: C.deepPeach,
    shadowColor: "#BB6B3F",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  contentCardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  contentIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: C.peach,
    justifyContent: "center",
    alignItems: "center",
  },
  contentCardBody: { flex: 1 },
  contentCardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: C.text,
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  contentCardSubtitle: {
    fontSize: 11,
    lineHeight: 16,
    color: C.muted,
    fontWeight: "500",
  },
  contentCountPill: {
    minWidth: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: C.peach,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  contentCountText: { fontSize: 13, fontWeight: "900", color: C.dark },
  contentManageBtn: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: C.primary,
    borderRadius: 14,
    paddingVertical: 11,
  },
  contentManageText: { fontSize: 12, fontWeight: "800", color: "#fff" },
  section: { marginBottom: 8, paddingHorizontal: 16 },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: C.dark,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  sectionLine: { flex: 1, height: 1, backgroundColor: "#FFE4CE" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 4,
    shadowColor: "#BB6B3F",
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  divider: { height: 1, backgroundColor: "#FFF4EC", marginLeft: 60 },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    gap: 14,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  settingInfo: { flex: 1 },
  settingLabel: { fontSize: 14, fontWeight: "700", color: "#1A1A1A" },
  settingValue: {
    fontSize: 12,
    color: "#8B6854",
    marginTop: 2,
    fontWeight: "500",
  },
  chevronWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#FFF4EC",
    justifyContent: "center",
    alignItems: "center",
  },
  versionStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    marginBottom: 4,
  },
  versionTxt: { fontSize: 12, color: C.light, fontWeight: "600" },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    padding: 16,
    backgroundColor: "#FFF4EE",
    borderRadius: 20,
    gap: 12,
    borderWidth: 1.5,
    borderColor: "#FFE4CE",
  },
  logoutIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: C.deepPeach,
    justifyContent: "center",
    alignItems: "center",
  },
  logoutTxt: { fontSize: 15, fontWeight: "700", color: "#BB6B3F" },
  deleteAccountBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    backgroundColor: "#FEF2F2",
    borderRadius: 20,
    gap: 12,
    borderWidth: 1.5,
    borderColor: "#FECACA",
  },
  deleteIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
  },
  deleteAccountTxt: { fontSize: 15, fontWeight: "800", color: "#dc2626" },
});

const qrS = StyleSheet.create({
  loadingBox: { alignItems: "center", paddingVertical: 60, gap: 16 },
  loadingText: { fontSize: 14, color: C.muted, fontWeight: "600" },
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: C.peach,
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: C.deepPeach,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    color: C.dark,
    lineHeight: 19,
  },
  shotWrap: { borderRadius: 22, overflow: "hidden", marginBottom: 14 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 24,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: C.deepPeach,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  leafBadge: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: C.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  gaushaalaName: {
    fontSize: 16,
    fontWeight: "800",
    color: C.dark,
    letterSpacing: -0.3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: C.text,
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    fontSize: 12,
    color: C.muted,
    textAlign: "center",
    lineHeight: 18,
    fontWeight: "500",
    marginBottom: 4,
  },
  qrBox: {
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: C.deepPeach,
    marginVertical: 18,
    shadowColor: C.dark,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardFooter: { width: "100%", alignItems: "center", gap: 10 },
  footerDivider: { width: "80%", height: 1, backgroundColor: C.deepPeach },
  footerRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  footerText: {
    fontSize: 11,
    fontWeight: "600",
    color: C.muted,
    letterSpacing: 0.3,
  },
  codeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 14,
  },
  codeLabel: { fontSize: 15, color: C.muted, fontWeight: "600" },
  codePill: {
    backgroundColor: C.deepPeach,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  codeValue: {
    fontSize: 15,
    fontWeight: "800",
    color: C.dark,
    letterSpacing: 1.5,
  },
});
