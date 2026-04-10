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
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../src/contexts/AuthContext";

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
  | null;

// OTP step: 'input' → 'verify' → 'change'
type OtpStep = "input" | "verify" | "change";

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
  // OTP display
  otpCode?: string;
};

function CustomAlert({
  cfg,
  onDismiss,
}: {
  cfg: AlertCfg;
  onDismiss: () => void;
}) {
  if (!cfg.visible) return null;
  return (
    <Modal
      transparent
      animationType="fade"
      visible={cfg.visible}
      onRequestClose={onDismiss}
    >
      <View style={aS.overlay}>
        <View style={aS.box}>
          <View
            style={[
              aS.iconWrap,
              { backgroundColor: cfg.iconBg ?? C.deepPeach },
            ]}
          >
            <Ionicons
              name={(cfg.icon ?? "information-circle-outline") as any}
              size={28}
              color={cfg.iconColor ?? C.dark}
            />
          </View>
          <Text style={aS.title}>{cfg.title}</Text>
          {cfg.message ? <Text style={aS.msg}>{cfg.message}</Text> : null}

          {/* OTP Code Display */}
          {cfg.otpCode ? (
            <View style={aS.otpBox}>
              {cfg.otpCode.split("").map((digit, i) => (
                <View key={i} style={aS.otpDigitBox}>
                  <Text style={aS.otpDigit}>{digit}</Text>
                </View>
              ))}
            </View>
          ) : null}

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
        </View>
      </View>
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
    otpCode?: string,
  ) =>
    setCfg({
      visible: true,
      title,
      message,
      buttons: buttons ?? [{ text: "OK" }],
      icon,
      iconBg,
      iconColor,
      otpCode,
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
          <Pressable style={mS.sheet} onPress={() => {}}>
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
  return (
    <TouchableOpacity
      style={s.settingRow}
      onPress={onPress}
      activeOpacity={0.7}
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
      <View style={s.editBadge}>
        <Ionicons name="pencil" size={11} color={C.dark} />
        <Text style={s.editBadgeTxt}>Edit</Text>
      </View>
    </TouchableOpacity>
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
    if (cleaned && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !value[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={mS.otpRow}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <TextInput
          key={i}
          ref={(ref) => { inputs.current[i] = ref; }}
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

// ── Main Screen
export default function AdminSettingsScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { cfg: alertCfg, show: showAlert, dismiss: dismissAlert } = useAlert();

  const [activeModal, setActiveModal] = useState<ModalType>(null);
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
    businessName: "GauSatva",
    supportContact: "+91 9999999999",
  });
  const [draft, setDraft] = useState<Settings>(settings);

  // Profile edit state
  const [profileDraft, setProfileDraft] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    phone: user?.phone ?? "",
  });

  // ── Password / OTP state
  const [otpStep, setOtpStep] = useState<OtpStep>("input");
  const [otpContact, setOtpContact] = useState(""); // email or phone
  const [generatedOtp, setGeneratedOtp] = useState(""); // simulated OTP
  const [enteredOtp, setEnteredOtp] = useState(""); // user typed OTP
  const [otpResendTimer, setOtpResendTimer] = useState(0);
  const [pwDraft, setPwDraft] = useState({ newPw: "", confirm: "" });
  const [showPw, setShowPw] = useState({ newPw: false, confirm: false });

  useEffect(() => {
    AsyncStorage.getItem("APP_SETTINGS").then((data) => {
      if (data) setSettings(JSON.parse(data));
    });
  }, []);

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
      setOtpStep("input");
      setOtpContact("");
      setGeneratedOtp("");
      setEnteredOtp("");
      setPwDraft({ newPw: "", confirm: "" });
      setShowPw({ newPw: false, confirm: false });
    }
    setActiveModal(type);
  };
  const closeModal = () => setActiveModal(null);

  const saveSettings = async () => {
    setSettings({ ...draft });
    await AsyncStorage.setItem("APP_SETTINGS", JSON.stringify(draft));
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
    // TODO: call api.updateProfile(profileDraft)
    setActiveModal(null);
    showAlert(
      "Profile Updated",
      "Your profile info has been updated.",
      undefined,
      "person-circle",
      C.deepPeach,
      C.dark,
    );
  };

  // ── OTP: Step 1 — Request OTP
  const handleRequestOtp = () => {
    const trimmed = otpContact.trim();
    if (!trimmed) {
      showAlert(
        "Required",
        "Please enter your email address or phone number.",
        undefined,
        "alert-circle-outline",
        C.deepPeach,
        C.amber,
      );
      return;
    }
    // Basic validation
    const isEmail = /\S+@\S+\.\S+/.test(trimmed);
    const isPhone = /^[+]?[\d\s\-()]{7,15}$/.test(trimmed);
    if (!isEmail && !isPhone) {
      showAlert(
        "Invalid Input",
        "Enter a valid email address or phone number.",
        undefined,
        "alert-circle-outline",
        C.deepPeach,
        C.amber,
      );
      return;
    }

    // Generate a 6-digit OTP (simulated — replace with real API call)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(otp);
    setOtpStep("verify");
    setOtpResendTimer(30);

    // TODO: call api.sendOtp(trimmed) — the otp below is for demo only
    showAlert(
      "OTP Sent",
      `Your one-time password has been sent to ${trimmed}`,
      [
        {
          text: "Got it",
          onPress: () => {},
        },
      ],
      "mail-outline",
      C.deepPeach,
      C.dark,
      otp, // display OTP in alert (remove in production)
    );
  };

  // ── OTP: Step 2 — Verify OTP
  const handleVerifyOtp = () => {
    if (enteredOtp.length < 6) {
      showAlert(
        "Incomplete OTP",
        "Please enter all 6 digits of the OTP.",
        undefined,
        "alert-circle-outline",
        C.deepPeach,
        C.amber,
      );
      return;
    }
    if (enteredOtp !== generatedOtp) {
      showAlert(
        "Invalid OTP",
        "The OTP you entered is incorrect. Please try again.",
        undefined,
        "close-circle-outline",
        "#FFE8D6",
        "#E53935",
      );
      setEnteredOtp("");
      return;
    }
    setOtpStep("change");
  };

  // ── OTP: Resend OTP
  const handleResendOtp = () => {
    if (otpResendTimer > 0) return;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(otp);
    setEnteredOtp("");
    setOtpResendTimer(30);
    // TODO: call api.sendOtp(otpContact)
    showAlert(
      "OTP Resent",
      `A new OTP has been sent to ${otpContact}`,
      undefined,
      "refresh-circle-outline",
      C.deepPeach,
      C.dark,
      otp,
    );
  };

  // ── OTP: Step 3 — Save new password
  const handleSavePassword = () => {
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
        "New password must be at least 6 characters.",
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
    // TODO: call api.changePassword(pwDraft.newPw)
    setActiveModal(null);
    showAlert(
      "Password Changed",
      "Your password has been updated successfully.",
      undefined,
      "shield-checkmark",
      C.deepPeach,
      C.dark,
    );
  };

  const handleLogout = () => {
    showAlert(
      "Logout",
      "Are you sure you want to logout from your account?",
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

  // Display strings
  const cutoffDisplay = `${settings.cutoffHour}:${settings.cutoffMin} ${settings.cutoffAmPm}`;
  const deliveryDisplay = `${settings.deliveryStartHour}:${settings.deliveryStartMin} ${settings.deliveryStartAmPm} – ${settings.deliveryEndHour}:${settings.deliveryEndMin} ${settings.deliveryEndAmPm}`;
  const graceDisplay = settings.gracePeriod;

  // ── Password modal step labels
  const pwStepTitle =
    otpStep === "input"
      ? "Verify Identity"
      : otpStep === "verify"
        ? "Enter OTP"
        : "Set New Password";

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <CustomAlert cfg={alertCfg} onDismiss={dismissAlert} />

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Text style={s.title}>Settings</Text>
        </View>

        {/* ── Profile Card ── */}
        <View style={s.profileCard}>
          <View style={s.avatarRing}>
            <View style={s.avatar}>
              <Ionicons name="shield-checkmark" size={28} color="#fff" />
            </View>
          </View>
          <View style={s.profileInfo}>
            <Text style={s.profileName}>{user?.name}</Text>
            <Text style={s.profileEmail}>{user?.email}</Text>
          </View>
          <View style={s.profileBtnRow}>
            <TouchableOpacity
              style={s.profileEditBtn}
              onPress={() => openModal("profile")}
            >
              <Ionicons name="pencil" size={13} color={C.dark} />
              <Text style={s.profileEditTxt}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                s.profileEditBtn,
                { backgroundColor: "rgba(255,255,255,0.12)" },
              ]}
              onPress={() => openModal("password")}
            >
              <Ionicons
                name="lock-closed"
                size={13}
                color="rgba(255,255,255,0.9)"
              />
              <Text
                style={[s.profileEditTxt, { color: "rgba(255,255,255,0.9)" }]}
              >
                Change Password
              </Text>
            </TouchableOpacity>
          </View>
          <View style={s.adminBadge}>
            <Ionicons name="shield-checkmark" size={11} color="#fff" />
            <Text style={s.adminBadgeTxt}>Administrator</Text>
          </View>
        </View>

        {/* ── System Configuration ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>System Configuration</Text>
          <View style={s.card}>
            <SettingRow
              icon="time-outline"
              iconBg="#FFF8E8"
              iconColor={C.amber}
              label="Order Cut-off Time"
              value={cutoffDisplay}
              onPress={() => openModal("cutoff")}
            />
            <View style={s.divider} />
            <SettingRow
              icon="bicycle-outline"
              iconBg={C.peach}
              iconColor={C.primary}
              label="Delivery Window"
              value={deliveryDisplay}
              onPress={() => openModal("delivery")}
            />
            <View style={s.divider} />
            <SettingRow
              icon="wallet-outline"
              iconBg="#F5EDE8"
              iconColor={C.dark}
              label="Grace Period"
              value={graceDisplay}
              onPress={() => openModal("grace")}
            />
          </View>
        </View>

        {/* ── Business Information ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Business Information</Text>
          <View style={s.card}>
            <SettingRow
              icon="storefront-outline"
              iconBg="#FFF0E8"
              iconColor={C.accent}
              label="Business Name"
              value={settings.businessName}
              onPress={() => openModal("business")}
            />
            <View style={s.divider} />
            <SettingRow
              icon="call-outline"
              iconBg="#FFF8E8"
              iconColor={C.accent}
              label="Support Contact"
              value={settings.supportContact}
              onPress={() => openModal("contact")}
            />
          </View>
        </View>

        {/* ── Logout ── */}
        <TouchableOpacity
          style={s.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={19} color={C.dark} />
          <Text style={s.logoutTxt}>Logout</Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* ── Modal: Order Cut-off ── */}
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

      {/* ── Modal: Delivery Window ── */}
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

      {/* ── Modal: Grace Period ── */}
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

      {/* ── Modal: Business Name ── */}
      <SettingModal
        visible={activeModal === "business"}
        title="Business Name"
        icon="storefront-outline"
        onClose={closeModal}
        onSave={saveSettings}
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
          style={mS.saveBtn}
          onPress={saveSettings}
          activeOpacity={0.8}
        >
          <Ionicons name="checkmark-circle" size={18} color="#fff" />
          <Text style={mS.saveTxt}>Save Changes</Text>
        </TouchableOpacity>
      </SettingModal>

      {/* ── Modal: Support Contact ── */}
      <SettingModal
        visible={activeModal === "contact"}
        title="Support Contact"
        icon="call-outline"
        onClose={closeModal}
        onSave={saveSettings}
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
          style={mS.saveBtn}
          onPress={saveSettings}
          activeOpacity={0.8}
        >
          <Ionicons name="checkmark-circle" size={18} color="#fff" />
          <Text style={mS.saveTxt}>Save Changes</Text>
        </TouchableOpacity>
      </SettingModal>

      {/* ── Modal: Edit Profile ── */}
      <SettingModal
        visible={activeModal === "profile"}
        title="Edit Profile"
        icon="person-outline"
        onClose={closeModal}
        onSave={saveProfile}
      >
        {[
          {
            label: "Full Name",
            key: "name",
            placeholder: "Your name",
            keyboard: "default",
          },
          {
            label: "Email Address",
            key: "email",
            placeholder: "your@email.com",
            keyboard: "email-address",
          },
          {
            label: "Phone Number",
            key: "phone",
            placeholder: "+91 XXXXXXXXXX",
            keyboard: "phone-pad",
          },
        ].map((f) => (
          <View key={f.key}>
            <Text style={mS.fieldLabel}>{f.label}</Text>
            <TextInput
              style={mS.input}
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
        ))}
        <TouchableOpacity
          style={mS.saveBtn}
          onPress={saveProfile}
          activeOpacity={0.8}
        >
          <Ionicons name="checkmark-circle" size={18} color="#fff" />
          <Text style={mS.saveTxt}>Save Changes</Text>
        </TouchableOpacity>
      </SettingModal>

      {/* ── Modal: Change Password (OTP Flow) ── */}
      <SettingModal
        visible={activeModal === "password"}
        title={pwStepTitle}
        icon="lock-closed-outline"
        onClose={closeModal}
        onSave={() => {}} // save handled per-step
      >
        {/* Step indicator */}
        <View style={mS.stepRow}>
          {(["input", "verify", "change"] as OtpStep[]).map((step, i) => (
            <React.Fragment key={step}>
              <View
                style={[
                  mS.stepDot,
                  otpStep === step && mS.stepDotActive,
                  (otpStep === "verify" && i === 0) ||
                  (otpStep === "change" && i <= 1)
                    ? mS.stepDotDone
                    : null,
                ]}
              >
                {(otpStep === "verify" && i === 0) ||
                (otpStep === "change" && i <= 1) ? (
                  <Ionicons name="checkmark" size={10} color="#fff" />
                ) : (
                  <Text style={mS.stepDotTxt}>{i + 1}</Text>
                )}
              </View>
              {i < 2 && (
                <View
                  style={[
                    mS.stepLine,
                    (otpStep === "verify" && i === 0) ||
                    (otpStep === "change" && i <= 1)
                      ? mS.stepLineDone
                      : null,
                  ]}
                />
              )}
            </React.Fragment>
          ))}
        </View>

        {/* ── Step 1: Enter email / phone ── */}
        {otpStep === "input" && (
          <View>
            <View style={mS.stepInfo}>
              <Ionicons
                name="shield-outline"
                size={32}
                color={C.primary}
                style={{ marginBottom: 10 }}
              />
              <Text style={mS.stepInfoTitle}>Verify your identity</Text>
              <Text style={mS.stepInfoDesc}>
                Enter your registered email address or phone number to receive a
                one-time password.
              </Text>
            </View>
            <Text style={mS.fieldLabel}>Email / Phone Number</Text>
            <TextInput
              style={mS.input}
              value={otpContact}
              onChangeText={setOtpContact}
              placeholder="email@example.com or +91 XXXXXXXXXX"
              placeholderTextColor={C.light}
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus
            />
            <TouchableOpacity
              style={mS.saveBtn}
              onPress={handleRequestOtp}
              activeOpacity={0.8}
            >
              <Ionicons name="send-outline" size={17} color="#fff" />
              <Text style={mS.saveTxt}>Send OTP</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Step 2: Enter OTP ── */}
        {otpStep === "verify" && (
          <View>
            <View style={mS.stepInfo}>
              <Ionicons
                name="keypad-outline"
                size={32}
                color={C.primary}
                style={{ marginBottom: 10 }}
              />
              <Text style={mS.stepInfoTitle}>Enter OTP</Text>
              <Text style={mS.stepInfoDesc}>
                We sent a 6-digit code to{" "}
                <Text style={{ color: C.dark, fontWeight: "700" }}>
                  {otpContact}
                </Text>
                . It expires in 10 minutes.
              </Text>
            </View>

            <Text style={mS.fieldLabel}>One-Time Password</Text>
            <OtpInput value={enteredOtp} onChange={setEnteredOtp} />

            {/* Resend row */}
            <View style={mS.resendRow}>
              <Text style={mS.resendLabel}>Didn't receive it?</Text>
              <TouchableOpacity
                onPress={handleResendOtp}
                disabled={otpResendTimer > 0}
              >
                <Text
                  style={[
                    mS.resendBtn,
                    otpResendTimer > 0 && mS.resendBtnDisabled,
                  ]}
                >
                  {otpResendTimer > 0
                    ? `Resend in ${otpResendTimer}s`
                    : "Resend OTP"}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={mS.saveBtn}
              onPress={handleVerifyOtp}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
              <Text style={mS.saveTxt}>Verify OTP</Text>
            </TouchableOpacity>

            {/* Back */}
            <TouchableOpacity
              style={mS.backBtn}
              onPress={() => setOtpStep("input")}
            >
              <Ionicons name="arrow-back-outline" size={14} color={C.muted} />
              <Text style={mS.backTxt}>Change email / phone</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Step 3: Set new password ── */}
        {otpStep === "change" && (
          <View>
            <View style={mS.stepInfo}>
              <Ionicons
                name="lock-open-outline"
                size={32}
                color={C.primary}
                style={{ marginBottom: 10 }}
              />
              <Text style={mS.stepInfoTitle}>Set new password</Text>
              <Text style={mS.stepInfoDesc}>
                Identity verified. Enter your new password below.
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
                      name={
                        showPw[f.key] ? "eye-off-outline" : "eye-outline"
                      }
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
              style={mS.saveBtn}
              onPress={handleSavePassword}
              activeOpacity={0.8}
            >
              <Ionicons name="shield-checkmark" size={18} color="#fff" />
              <Text style={mS.saveTxt}>Update Password</Text>
            </TouchableOpacity>
          </View>
        )}
      </SettingModal>
    </SafeAreaView>
  );
}

// ── Alert Styles
const aS = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(61,31,10,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  box: {
    width: "100%",
    backgroundColor: "#FFF8EF",
    borderRadius: 24,
    paddingTop: 28,
    paddingBottom: 20,
    paddingHorizontal: 24,
    alignItems: "center",
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
  // OTP display in alert
  otpBox: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
    marginTop: 4,
  },
  otpDigitBox: {
    width: 38,
    height: 46,
    borderRadius: 10,
    backgroundColor: "#FFE8D6",
    borderWidth: 1.5,
    borderColor: "#FFBF55",
    justifyContent: "center",
    alignItems: "center",
  },
  otpDigit: {
    fontSize: 20,
    fontWeight: "800",
    color: "#BB6B3F",
    letterSpacing: 1,
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

// ── Modal Styles
const mS = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(61,31,10,0.35)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFF8EF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "90%",
  },
  drag: {
    width: 40,
    height: 4,
    backgroundColor: "#C9A882",
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
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#FFE8D6",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 17, fontWeight: "800", color: "#3D1F0A" },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
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
    letterSpacing: 0.6,
    marginBottom: 10,
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
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FF9675",
    borderRadius: 14,
    paddingVertical: 15,
    marginTop: 8,
  },
  saveTxt: { fontSize: 15, fontWeight: "800", color: "#fff" },
  pwRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  eyeBtn: {
    width: 44,
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

  // Step indicator
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFE8D6",
    borderWidth: 1.5,
    borderColor: "#FFD4B0",
    justifyContent: "center",
    alignItems: "center",
  },
  stepDotActive: {
    backgroundColor: "#FF9675",
    borderColor: "#FF9675",
  },
  stepDotDone: {
    backgroundColor: "#BB6B3F",
    borderColor: "#BB6B3F",
  },
  stepDotTxt: { fontSize: 12, fontWeight: "800", color: "#BB6B3F" },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#FFE8D6",
    marginHorizontal: 4,
    maxWidth: 40,
  },
  stepLineDone: { backgroundColor: "#BB6B3F" },

  // Step info box
  stepInfo: {
    alignItems: "center",
    backgroundColor: "#FFF0E4",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
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

  // OTP input boxes
  otpRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 16,
  },
  otpBox: {
    flex: 1,
    height: 54,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#FFE8C8",
    fontSize: 22,
    fontWeight: "800",
    color: "#3D1F0A",
    textAlign: "center",
  },
  otpBoxFilled: {
    borderColor: "#FF9675",
    backgroundColor: "#FFF8EF",
  },

  // Resend
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

  // Back button
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

// ── Screen Styles
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF8F4" },
  header: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8 },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1A1A1A",
    letterSpacing: -0.5,
  },

  profileCard: {
    backgroundColor: "#FF9675",
    marginHorizontal: 20,
    borderRadius: 22,
    padding: 22,
    marginBottom: 22,
    alignItems: "center",
    shadowColor: "#BB6B3F",
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  avatarRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  profileInfo: { alignItems: "center", marginBottom: 14 },
  profileName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.3,
  },
  profileEmail: { fontSize: 13, color: "rgba(255,255,255,0.75)", marginTop: 3 },
  profileBtnRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  profileEditBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.88)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  profileEditTxt: { fontSize: 12, fontWeight: "700", color: "#BB6B3F" },
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  adminBadgeTxt: { fontSize: 12, fontWeight: "700", color: "#fff" },

  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#BB6B3F",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  card: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    borderRadius: 18,
    paddingHorizontal: 16,
    shadowColor: "#BB6B3F",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  divider: { height: 1, backgroundColor: "#FFF0E8", marginLeft: 48 },

  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  settingInfo: { flex: 1 },
  settingLabel: { fontSize: 14, fontWeight: "600", color: "#1A1A1A" },
  settingValue: {
    fontSize: 12,
    color: "#8B6854",
    marginTop: 2,
    fontWeight: "500",
  },
  editBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFE8D6",
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  editBadgeTxt: { fontSize: 11, fontWeight: "700", color: "#BB6B3F" },

  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 20,
    marginTop: 8,
    padding: 16,
    backgroundColor: "#F5EDE8",
    borderRadius: 16,
    gap: 8,
  },
  logoutTxt: { fontSize: 15, fontWeight: "700", color: "#BB6B3F" },
});