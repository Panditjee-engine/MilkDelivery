import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  TextInput,
  Animated,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../src/contexts/AuthContext";
import { LinearGradient } from "expo-linear-gradient";
import { api } from "../../src/services/api"; 

// ── Brand Colors 
const C = {
  primary: "#FF5200",
  accent: "#FC8019",
  bg: "#FFF8F5",
  text: "#1C1C1C",
  textSub: "#6B6B6B",
  textLight: "#A8A8A8",
  border: "#F0EBE8",
  success: "#2ECC71",
  error: "#E74C3C",
  warn: "#F39C12",
  green: "#48BB78",
  errorBg: "#FEF2F2",
  successBg: "#F0FDF4",
};

const { width } = Dimensions.get("window");
type Role = "customer" | "delivery_partner" | "admin";
type Step = "phone" | "details";
type ToastType = "error" | "success" | "warn";
type Status = "idle" | "checking" | "ok" | "error";

// ── Validation helpers 

/** Indian mobile: 10 digits, starts 6-9, not all same digit */
function validateIndianMobile(num: string): { ok: boolean; reason?: string } {
  if (!num) return { ok: false, reason: "Enter your mobile number" };
  if (num.length < 10)
    return {
      ok: false,
      reason: `${10 - num.length} more digit${10 - num.length > 1 ? "s" : ""} needed`,
    };
  if (!/^[6-9]/.test(num))
    return { ok: false, reason: "Indian numbers must start with 6, 7, 8 or 9" };
  if (/^(.)\1{9}$/.test(num))
    return { ok: false, reason: "Enter a real mobile number" };
  return { ok: true };
}

function validateEmail(val: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
}

// ── Toast 
function Toast({
  message,
  type,
  visible,
  onHide,
}: {
  message: string;
  type: ToastType;
  visible: boolean;
  onHide: () => void;
}) {
  const slide = useRef(new Animated.Value(-120)).current;

  useEffect(() => {
    if (!visible) return;
    Animated.spring(slide, {
      toValue: 0,
      useNativeDriver: true,
      tension: 80,
      friction: 9,
    }).start();
    const t = setTimeout(() => {
      Animated.timing(slide, {
        toValue: -120,
        duration: 300,
        useNativeDriver: true,
      }).start(onHide);
    }, 3000);
    return () => clearTimeout(t);
  }, [visible]);

  if (!visible) return null;

  const map = {
    error: { icon: "close-circle", color: C.error },
    success: { icon: "checkmark-circle", color: C.success },
    warn: { icon: "warning", color: C.warn },
  };
  const { icon, color } = map[type];

  return (
    <Animated.View
      style={[
        ts.wrap,
        { transform: [{ translateY: slide }], borderLeftColor: color },
      ]}
    >
      <View style={[ts.iconBox, { backgroundColor: color + "22" }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <Text style={ts.msg}>{message}</Text>
      <TouchableOpacity onPress={onHide}>
        <Ionicons name="close" size={18} color={C.textLight} />
      </TouchableOpacity>
    </Animated.View>
  );
}
const ts = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    zIndex: 999,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  msg: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: "600",
    color: C.text,
    lineHeight: 18,
  },
});

// ── Inline field error 
function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginTop: -8,
        marginBottom: 10,
        paddingLeft: 2,
      }}
    >
      <Ionicons name="alert-circle" size={13} color={C.error} />
      <Text
        style={{ fontSize: 12, color: C.error, fontWeight: "500", flex: 1 }}
      >
        {msg}
      </Text>
    </View>
  );
}

// ── Floating label input 
interface FIProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: any;
  autoCapitalize?: any;
  rightIcon?: React.ReactNode;
  leftEmoji?: string;
  error?: string;
  status?: Status;
  onBlur?: () => void;
}
function FloatInput({
  label,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  rightIcon,
  leftEmoji,
  error,
  status,
  onBlur: extBlur,
}: FIProps) {
  const [focused, setFocused] = useState(false);
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  const onFocus = () => {
    setFocused(true);
    Animated.timing(anim, {
      toValue: 1,
      duration: 180,
      useNativeDriver: false,
    }).start();
  };
  const onBlur = () => {
    setFocused(false);
    if (!value)
      Animated.timing(anim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: false,
      }).start();
    extBlur?.();
  };

  const borderColor = error
    ? C.error
    : status === "ok"
      ? C.success
      : focused
        ? C.primary
        : C.border;
  const labelTop = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [14, -9],
  });
  const labelSize = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [15, 11],
  });
  const labelColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      C.textLight,
      error ? C.error : focused ? C.primary : C.textSub,
    ],
  });

  return (
    <>
      <View style={[fi.wrap, { borderColor }]}>
        <Animated.Text
          style={[
            fi.label,
            { top: labelTop, fontSize: labelSize, color: labelColor },
          ]}
        >
          {label}
        </Animated.Text>
        <View style={fi.row}>
          {leftEmoji ? <Text style={fi.emoji}>{leftEmoji}</Text> : null}
          <TextInput
            style={fi.input}
            value={value}
            onChangeText={onChangeText}
            onFocus={onFocus}
            onBlur={onBlur}
            secureTextEntry={secureTextEntry}
            keyboardType={keyboardType ?? "default"}
            autoCapitalize={autoCapitalize ?? "sentences"}
            placeholderTextColor="transparent"
          />
          {status === "checking" && (
            <ActivityIndicator size="small" color={C.primary} />
          )}
          {status === "ok" && !rightIcon && (
            <Ionicons name="checkmark-circle" size={20} color={C.success} />
          )}
          {status === "error" && !rightIcon && (
            <Ionicons name="close-circle" size={20} color={C.error} />
          )}
          {rightIcon}
        </View>
      </View>
      <FieldError msg={error} />
    </>
  );
}
const fi = StyleSheet.create({
  wrap: {
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 10,
    backgroundColor: "#fff",
    marginBottom: 14,
    position: "relative",
  },
  label: {
    position: "absolute",
    left: 14,
    backgroundColor: "#fff",
    paddingHorizontal: 2,
    fontWeight: "500",
    zIndex: 1,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  emoji: { fontSize: 16 },
  input: { flex: 1, fontSize: 15, color: C.text, height: 26, padding: 0 },
});

// ── Roles 
const ROLES = [
  {
    value: "customer" as Role,
    label: "Customer",
    emoji: "🛒",
    desc: "Order essentials",
  },
  {
    value: "delivery_partner" as Role,
    label: "Delivery",
    emoji: "🚴",
    desc: "Earn on your ride",
  },
  {
    value: "admin" as Role,
    label: "Admin",
    emoji: "🛡️",
    desc: "Manage platform",
  },
];

export default function RegisterScreen() {
  const [step, setStep] = useState<Step>("phone");

  // Fields
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<Role>("customer");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  // Errors
  const [phoneErr, setPhoneErr] = useState("");
  const [emailErr, setEmailErr] = useState("");
  const [nameErr, setNameErr] = useState("");
  const [passErr, setPassErr] = useState("");
  const [confErr, setConfErr] = useState("");

  // DB-check statuses
  const [phoneSt, setPhoneSt] = useState<Status>("idle");
  const [emailSt, setEmailSt] = useState<Status>("idle");

  // Debounce refs
  const phoneTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emailTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Toast
  const [toast, setToast] = useState({
    visible: false,
    message: "",
    type: "error" as ToastType,
  });
  const showToast = (message: string, type: ToastType = "error") =>
    setToast({ visible: true, message, type });
  const hideToast = () => setToast((t) => ({ ...t, visible: false }));

  const { register } = useAuth();
  const router = useRouter();

  // ── Phone change: validate + debounced duplicate check 
  const handlePhoneChange = (val: string) => {
    const cleaned = val.replace(/\D/g, "").slice(0, 10);
    setPhone(cleaned);
    setPhoneErr("");
    setPhoneSt("idle");
    if (phoneTimer.current) clearTimeout(phoneTimer.current);

    if (!cleaned) return;

    const { ok, reason } = validateIndianMobile(cleaned);
    if (!ok) {
      setPhoneErr(reason!);
      setPhoneSt("error");
      return;
    }

    if (cleaned.length === 10) {
      setPhoneSt("checking");
      phoneTimer.current = setTimeout(async () => {
        const exists = await api.checkDuplicate("phone", `+91${cleaned}`);
        if (exists) {
          setPhoneErr("Number already registered — try signing in instead.");
          setPhoneSt("error");
        } else {
          setPhoneSt("ok");
        }
      }, 600);
    }
  };

  // ── Email change: format validate + debounced duplicate check ────
  const handleEmailChange = (val: string) => {
    setEmail(val);
    setEmailErr("");
    setEmailSt("idle");
    if (emailTimer.current) clearTimeout(emailTimer.current);

    if (!val) return;

    if (!validateEmail(val)) {
      setEmailErr("Enter a valid email address");
      setEmailSt("error");
      return;
    }

    setEmailSt("checking");
    emailTimer.current = setTimeout(async () => {
      const exists = await api.checkDuplicate(
        "email",
        val.trim().toLowerCase(),
      );
      if (exists) {
        setEmailErr("Email already registered — try signing in instead.");
        setEmailSt("error");
      } else {
        setEmailSt("ok");
      }
    }, 700);
  };

  // ── Step animation 
  const slideAnim = useRef(new Animated.Value(0)).current;
  const goToDetails = () => {
    Animated.timing(slideAnim, {
      toValue: -width,
      duration: 260,
      useNativeDriver: true,
    }).start(() => {
      setStep("details");
      slideAnim.setValue(width);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 60,
        friction: 10,
      }).start();
    });
  };
  const goToPhone = () => {
    Animated.timing(slideAnim, {
      toValue: width,
      duration: 260,
      useNativeDriver: true,
    }).start(() => {
      setStep("phone");
      slideAnim.setValue(-width);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 60,
        friction: 10,
      }).start();
    });
  };

  // ── Step 1 submit 
  const handleNext = async () => {
    const { ok, reason } = validateIndianMobile(phone);
    if (!ok) {
      setPhoneErr(reason!);
      setPhoneSt("error");
      showToast(reason!, "error");
      return;
    }
    if (phoneSt === "checking") {
      showToast("Checking number, please wait…", "warn");
      return;
    }
    if (phoneSt === "error") {
      showToast(phoneErr || "Fix the phone number", "error");
      return;
    }

    // If user never paused long enough for the debounce, run the check now
    if (phoneSt === "idle") {
      setPhoneSt("checking");
      const exists = await api.checkDuplicate("phone", `+91${phone}`);
      if (exists) {
        setPhoneErr("Number already registered — try signing in instead.");
        setPhoneSt("error");
        showToast("This number is already in use", "error");
        return;
      }
      setPhoneSt("ok");
    }

    goToDetails();
  };

  // ── Step 2 submit 
  const handleRegister = async () => {
    let hasErr = false;

    if (!name.trim()) {
      setNameErr("Full name is required");
      hasErr = true;
    }
    if (!email.trim()) {
      setEmailErr("Email is required");
      setEmailSt("error");
      hasErr = true;
    } else if (!validateEmail(email)) {
      setEmailErr("Enter a valid email address");
      setEmailSt("error");
      hasErr = true;
    }
    if (!password) {
      setPassErr("Password is required");
      hasErr = true;
    } else if (password.length < 6) {
      setPassErr("Min 6 characters required");
      hasErr = true;
    }
    if (password !== confirmPassword) {
      setConfErr("Passwords do not match");
      hasErr = true;
    }

    if (hasErr) {
      showToast("Please fix the errors below", "error");
      return;
    }
    if (emailSt === "checking") {
      showToast("Verifying email, please wait…", "warn");
      return;
    }
    if (emailSt === "error") {
      showToast(emailErr || "Fix the email first", "error");
      return;
    }

    // Run email duplicate check if debounce never fired
    if (emailSt === "idle") {
      const exists = await api.checkDuplicate(
        "email",
        email.trim().toLowerCase(),
      );
      if (exists) {
        setEmailErr("Email already registered — try signing in instead.");
        setEmailSt("error");
        showToast("Email already in use", "error");
        return;
      }
    }

    setLoading(true);
    try {
      await register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: `+91${phone}`,
        password,
        role,
      });
      showToast("Account created! Welcome 🎉", "success");
      setTimeout(() => router.replace("/"), 1200);
    } catch (error: any) {
      const msg: string = error?.message ?? "";
      // Surface server-side duplicate errors to the right field
      if (/email/i.test(msg)) {
        setEmailErr("This email is already registered.");
        setEmailSt("error");
      } else if (/phone/i.test(msg)) {
        goToPhone();
        setTimeout(() => {
          setPhoneErr("This number is already registered.");
          setPhoneSt("error");
        }, 400);
      }
      showToast(msg || "Could not create account", "error");
    } finally {
      setLoading(false);
    }
  };

  // Clear errors on correction
  const handlePasswordChange = (v: string) => {
    setPassword(v);
    if (passErr && v.length >= 6) setPassErr("");
    if (confErr && confirmPassword === v) setConfErr("");
  };
  const handleConfirmChange = (v: string) => {
    setConfirmPassword(v);
    if (confErr && v === password) setConfErr("");
  };
  const handleNameChange = (v: string) => {
    setName(v);
    if (nameErr && v.trim()) setNameErr("");
  };

  // ── Render 
  return (
    <SafeAreaView style={s.container}>
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={hideToast}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <LinearGradient
            colors={[C.primary, C.accent, "#FFD580"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.headerGrad}
          >
            <TouchableOpacity
              style={s.backBtn}
              onPress={() => (step === "phone" ? router.back() : goToPhone())}
            >
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <View style={s.logoArea}>
              <Text style={s.logoEmoji}></Text>
              <Text style={s.logoText}>GauSatv</Text>
              <Text style={s.logoSub}>Deliver Purity</Text>
            </View>
            <View style={s.pills}>
              {(["phone", "details"] as Step[]).map((s2, i) => (
                <View key={s2} style={s.pillRow}>
                  <View
                    style={[
                      s.pill,
                      step === s2 && s.pillActive,
                      step === "details" && i === 0 && s.pillDone,
                    ]}
                  >
                    {step === "details" && i === 0 ? (
                      <Ionicons name="checkmark" size={12} color="#fff" />
                    ) : (
                      <Text style={s.pillNum}>{i + 1}</Text>
                    )}
                  </View>
                  <Text
                    style={[
                      s.pillLabel,
                      step === s2 && { color: "#fff", fontWeight: "700" },
                    ]}
                  >
                    {i === 0 ? "Phone" : "Details"}
                  </Text>
                  {i === 0 && (
                    <View
                      style={[s.pillLine, step === "details" && s.pillLineDone]}
                    />
                  )}
                </View>
              ))}
            </View>
          </LinearGradient>

          <Animated.View
            style={[s.body, { transform: [{ translateX: slideAnim }] }]}
          >
            {/* ══ STEP 1 ══ */}
            {step === "phone" && (
              <View>
                <Text style={s.stepTitle}>What's your number?</Text>
                <Text style={s.stepSub}>
                  We'll keep it safe. No spam, ever.
                </Text>

                <View
                  style={[
                    s.phoneCard,
                    phoneSt === "error" && s.phoneCardErr,
                    phoneSt === "ok" && s.phoneCardOk,
                  ]}
                >
                  <View style={s.phoneRow}>
                    <View style={s.countryChip}>
                      <Text style={s.countryCode}>+91</Text>
                      <Ionicons
                        name="chevron-down"
                        size={14}
                        color={C.textSub}
                      />
                    </View>
                    <TextInput
                      style={s.phoneInput}
                      placeholder="mobile number"
                      placeholderTextColor={C.textLight}
                      value={phone}
                      onChangeText={handlePhoneChange}
                      keyboardType="number-pad"
                      maxLength={10}
                    />
                    {phoneSt === "checking" && (
                      <ActivityIndicator size="small" color={C.primary} />
                    )}
                    {phoneSt === "ok" && (
                      <Ionicons
                        name="checkmark-circle"
                        size={24}
                        color={C.success}
                      />
                    )}
                    {phoneSt === "error" && (
                      <Ionicons name="close-circle" size={24} color={C.error} />
                    )}
                  </View>

                  {/* Fill dots */}
                  <View style={s.dotsRow}>
                    {Array.from({ length: 10 }).map((_, i) => (
                      <View
                        key={i}
                        style={[
                          s.dot,
                          i < phone.length &&
                            (phoneSt === "error" ? s.dotErr : s.dotFilled),
                        ]}
                      />
                    ))}
                  </View>

                  {/* Status banner inside card */}
                  {phoneErr ? (
                    <View style={s.phoneBanner}>
                      <Ionicons name="alert-circle" size={15} color={C.error} />
                      <Text style={[s.phoneBannerText, { color: C.error }]}>
                        {phoneErr}
                      </Text>
                    </View>
                  ) : phoneSt === "ok" ? (
                    <View
                      style={[s.phoneBanner, { backgroundColor: C.successBg }]}
                    >
                      <Ionicons
                        name="shield-checkmark"
                        size={15}
                        color={C.success}
                      />
                      <Text style={[s.phoneBannerText, { color: C.success }]}>
                        Number is available 
                      </Text>
                    </View>
                  ) : phone.length > 0 && phone.length < 10 ? (
                    <View
                      style={[s.phoneBanner, { backgroundColor: "#FFF9EC" }]}
                    >
                      <Ionicons name="keypad" size={15} color={C.warn} />
                      <Text style={[s.phoneBannerText, { color: C.warn }]}>
                        {10 - phone.length} more digit
                        {10 - phone.length !== 1 ? "s" : ""} to go
                      </Text>
                    </View>
                  ) : null}
                </View>

                <Text style={s.hint}>
                  By continuing you agree to our{" "}
                  <Text style={{ color: C.primary, fontWeight: "600" }}>
                    Terms
                  </Text>{" "}
                  and{" "}
                  <Text style={{ color: C.primary, fontWeight: "600" }}>
                    Privacy Policy
                  </Text>
                </Text>

                <TouchableOpacity
                  style={[s.cta, phoneSt === "error" && s.ctaDim]}
                  onPress={handleNext}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={
                      phoneSt === "error"
                        ? ["#ccc", "#bbb"]
                        : [C.primary, C.accent]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={s.ctaGrad}
                  >
                    {phoneSt === "checking" ? (
                      <>
                        <ActivityIndicator color="#fff" size="small" />
                        <Text style={s.ctaText}>Checking…</Text>
                      </>
                    ) : (
                      <>
                        <Text style={s.ctaText}>Continue</Text>
                        <Ionicons name="arrow-forward" size={20} color="#fff" />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}

            {/* ══ STEP 2 ══ */}
            {step === "details" && (
              <View>
                <Text style={s.stepTitle}>Almost there!</Text>
                <Text style={s.stepSub}>Enter Credentials</Text>

                <Text style={s.sectionLabel}></Text>
                <View style={s.roleRow}>
                  {ROLES.map((r) => {
                    const active = role === r.value;
                    return (
                      <TouchableOpacity
                        key={r.value}
                        style={[s.roleCard, active && s.roleCardActive]}
                        onPress={() => setRole(r.value)}
                        activeOpacity={0.8}
                      >
                        <Text style={s.roleEmoji}>{r.emoji}</Text>
                        <Text
                          style={[s.roleLabel, active && { color: C.primary }]}
                        >
                          {r.label}
                        </Text>
                        <Text style={s.roleDesc}>{r.desc}</Text>
                        {active && (
                          <View style={s.roleCheck}>
                            <Ionicons name="checkmark" size={10} color="#fff" /> 
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={s.form}>
                  <FloatInput
                    label="Full Name"
                    value={name}
                    onChangeText={handleNameChange}
                    error={nameErr}
                  />

                  <FloatInput
                    label="Email Address"
                    value={email}
                    onChangeText={handleEmailChange}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    error={emailErr}
                    status={emailSt}
                  />
                  {emailSt === "ok" && !emailErr && (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                        marginTop: -10,
                        marginBottom: 10,
                      }}
                    >
                      <Ionicons
                        name="shield-checkmark"
                        size={13}
                        color={C.success}
                      />
                      <Text
                        style={{
                          fontSize: 12,
                          color: C.success,
                          fontWeight: "600",
                        }}
                      >
                        Email available 
                      </Text>
                    </View>
                  )}

                  <FloatInput
                    label="Password"
                    value={password}
                    onChangeText={handlePasswordChange}
                    secureTextEntry={!showPass}
                    error={passErr}
                    rightIcon={
                      <TouchableOpacity onPress={() => setShowPass(!showPass)}>
                        <Ionicons
                          name={showPass ? "eye-off-outline" : "eye-outline"}
                          size={20}
                          color={C.textLight}
                        />
                      </TouchableOpacity>
                    }
                  />

                  {password.length > 0 && (
                    <View style={s.strengthRow}>
                      {[1, 2, 3, 4].map((n) => (
                        <View
                          key={n}
                          style={[
                            s.strengthBar,
                            password.length >= n * 2 && {
                              backgroundColor:
                                password.length >= 8
                                  ? C.success
                                  : password.length >= 5
                                    ? C.warn
                                    : C.error,
                            },
                          ]}
                        />
                      ))}
                      <Text
                        style={[
                          s.strengthLabel,
                          {
                            color:
                              password.length >= 8
                                ? C.success
                                : password.length >= 5
                                  ? C.warn
                                  : C.error,
                          },
                        ]}
                      >
                        {password.length < 5
                          ? "Weak"
                          : password.length < 8
                            ? "Fair"
                            : "Strong"}
                      </Text>
                    </View>
                  )}

                  <FloatInput
                    label="Confirm Password"
                    value={confirmPassword}
                    onChangeText={handleConfirmChange}
                    secureTextEntry={!showPass}
                    error={confErr}
                    status={
                      confirmPassword &&
                      !confErr &&
                      confirmPassword === password
                        ? "ok"
                        : undefined
                    }
                  />
                </View>

                <TouchableOpacity
                  style={[s.cta, loading && { opacity: 0.75 }]}
                  onPress={handleRegister}
                  activeOpacity={0.85}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={[C.primary, C.accent]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={s.ctaGrad}
                  >
                    {loading ? (
                      <>
                        <ActivityIndicator color="#fff" size="small" />
                        <Text style={s.ctaText}>Creating account…</Text>
                      </>
                    ) : (
                      <>
                        <Text style={s.ctaText}>Create Account</Text>
                        <Ionicons
                          name="rocket-outline"
                          size={20}
                          color="#fff"
                        />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>

          <View style={s.footer}>
            <Text style={s.footerText}>Already have an account?</Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={s.footerLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { flexGrow: 1 },

  headerGrad: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  logoArea: { alignItems: "center", marginBottom: 20 },
  logoEmoji: { fontSize: 38, marginBottom: 4 },
  logoText: {
    fontSize: 26,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.5,
  },
  logoSub: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 2 },

  pills: { flexDirection: "row", justifyContent: "center", gap: 4 },
  pillRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  pill: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  pillActive: { backgroundColor: "#fff" },
  pillDone: { backgroundColor: C.green },
  pillNum: { fontSize: 11, fontWeight: "800", color: "#fff" },
  pillLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255,255,255,0.7)",
  },
  pillLine: {
    width: 32,
    height: 2,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 1,
  },
  pillLineDone: { backgroundColor: "#fff" },

  body: { padding: 20, paddingTop: 24 },
  stepTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: C.text,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  stepSub: { fontSize: 14, color: C.textSub, marginBottom: 24 },

  phoneCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    borderColor: C.border,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 6,
    marginBottom: 16,
  },
  phoneCardErr: {
    borderColor: C.error,
    shadowColor: C.error,
    shadowOpacity: 0.12,
  },
  phoneCardOk: {
    borderColor: C.success,
    shadowColor: C.success,
    shadowOpacity: 0.12,
  },
  phoneRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  countryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.bg,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  countryCode: { fontSize: 14, fontWeight: "700", color: C.text },
  phoneInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: "700",
    color: C.text,
    letterSpacing: 1,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 4,
    marginTop: 14,
    justifyContent: "center",
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.border },
  dotFilled: { backgroundColor: C.primary, transform: [{ scale: 1.2 }] },
  dotErr: { backgroundColor: C.error, transform: [{ scale: 1.2 }] },
  phoneBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
    backgroundColor: C.errorBg,
    borderRadius: 10,
    padding: 10,
  },
  phoneBannerText: { fontSize: 12.5, fontWeight: "600", flex: 1 },

  hint: {
    fontSize: 12,
    color: C.textLight,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
  },

  cta: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 8,
    shadowColor: C.primary,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  ctaDim: { shadowOpacity: 0.05, elevation: 2 },
  ctaGrad: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.2,
  },

  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: C.textSub,
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  roleRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  roleCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: C.border,
    position: "relative",
  },
  roleCardActive: {
    borderColor: C.primary,
    backgroundColor: "#FFF3EE",
    shadowColor: C.primary,
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  roleEmoji: { fontSize: 24, marginBottom: 4 },
  roleLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: C.textSub,
    marginBottom: 2,
  },
  roleDesc: { fontSize: 9, color: C.textLight, textAlign: "center" },
  roleCheck: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: C.primary,
    justifyContent: "center",
    alignItems: "center",
  },

  form: { marginBottom: 20 },
  strengthRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: -8,
    marginBottom: 12,
  },
  strengthBar: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: C.border,
  },
  strengthLabel: { fontSize: 11, width: 40, fontWeight: "700" },

  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingVertical: 24,
  },
  footerText: { fontSize: 14, color: C.textSub },
  footerLink: { fontSize: 14, fontWeight: "800", color: C.primary },
});
