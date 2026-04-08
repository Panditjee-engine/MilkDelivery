import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
  TextInput,
  Animated,
  Modal,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../../src/contexts/AuthContext";
import { Colors } from "../../src/constants/colors";
import Input from "../../src/components/Input";
import Button from "../../src/components/Button";
import { api } from "../../src/services/api";

type LoginMethod = "email" | "phone";
type ToastType = "error" | "success" | "warn";

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
    }, 3200);
    return () => clearTimeout(t);
  }, [visible]);

  if (!visible) return null;

  const config = {
    error: { icon: "close-circle", color: "#E74C3C", bg: "#FEF2F2" },
    success: { icon: "checkmark-circle", color: "#2ECC71", bg: "#F0FDF4" },
    warn: { icon: "warning", color: "#F39C12", bg: "#FFFBEB" },
  }[type];

  return (
    <Animated.View
      style={[
        ts.wrap,
        { transform: [{ translateY: slide }], borderLeftColor: config.color },
      ]}
    >
      <View style={[ts.iconBadge, { backgroundColor: config.color + "22" }]}>
        <Ionicons name={config.icon as any} size={20} color={config.color} />
      </View>
      <Text style={ts.msg} numberOfLines={3}>
        {message}
      </Text>
      <TouchableOpacity
        onPress={onHide}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="close" size={16} color="#9CA3AF" />
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
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 14,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  msg: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: "600",
    color: "#1C1C1C",
    lineHeight: 19,
  },
});

// ── Wrong Password Modal 
function WrongPasswordModal({
  visible,
  email,
  onTryAgain,
  onForgotPassword,
  onClose,
}: {
  visible: boolean;
  email: string;
  onTryAgain: () => void;
  onForgotPassword: () => void;
  onClose: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          damping: 14,
          stiffness: 200,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        Animated.sequence([
          Animated.timing(shakeAnim, {
            toValue: 8,
            duration: 60,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnim, {
            toValue: -8,
            duration: 60,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnim, {
            toValue: 6,
            duration: 60,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnim, {
            toValue: -6,
            duration: 60,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnim, {
            toValue: 0,
            duration: 60,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={wm.overlay}>
        <Animated.View
          style={[
            wm.card,
            { opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          <Animated.View
            style={[wm.iconWrap, { transform: [{ translateX: shakeAnim }] }]}
          >
            <View style={wm.iconCircle}>
              <Ionicons name="lock-closed" size={32} color="#ef4444" />
            </View>
          </Animated.View>

          <Text style={wm.title}>Wrong Password</Text>
          <Text style={wm.subtitle}>
            The password you entered for{"\n"}
            <Text style={wm.emailText}>{email || "your account"}</Text>
            {"\n"}is incorrect.
          </Text>

          <View style={wm.optionRow}>
            <Ionicons name="refresh-outline" size={16} color="#6b7280" />
            <Text style={wm.optionText}>Double-check caps lock is off</Text>
          </View>
          <View style={wm.optionRow}>
            <Ionicons
              name="shield-checkmark-outline"
              size={16}
              color="#6b7280"
            />
            <Text style={wm.optionText}>
              Make sure you're using the right account
            </Text>
          </View>

          <TouchableOpacity
            style={wm.btnPrimary}
            onPress={onTryAgain}
            activeOpacity={0.85}
          >
            <Ionicons name="arrow-back-outline" size={16} color="#fff" />
            <Text style={wm.btnPrimaryText}>Try Again</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={wm.btnSecondary}
            onPress={onForgotPassword}
            activeOpacity={0.85}
          >
            <Ionicons name="key-outline" size={16} color={Colors.primary} />
            <Text style={wm.btnSecondaryText}>Reset My Password</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} style={wm.dismiss}>
            <Text style={wm.dismissText}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const wm = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    width: "100%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 12 },
    elevation: 16,
  },
  iconWrap: { marginBottom: 20 },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#fef2f2",
    borderWidth: 2,
    borderColor: "#fecaca",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111",
    marginBottom: 10,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  emailText: { fontWeight: "700", color: "#374151" },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    alignSelf: "flex-start",
  },
  optionText: { fontSize: 13, color: "#6b7280" },
  btnPrimary: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    marginTop: 20,
    shadowColor: Colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  btnPrimaryText: { fontSize: 16, fontWeight: "800", color: "#fff" },
  btnSecondary: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: Colors.primary + "12",
    borderWidth: 1.5,
    borderColor: Colors.primary + "30",
    marginTop: 10,
  },
  btnSecondaryText: { fontSize: 15, fontWeight: "700", color: Colors.primary },
  dismiss: { marginTop: 16 },
  dismissText: { fontSize: 14, color: "#9ca3af", fontWeight: "600" },
});

// ── Forgot Password Modal 
type ForgotStep = "email" | "code" | "newPassword" | "done";

function ForgotPasswordModal({
  visible,
  prefillEmail,
  onClose,
  showToast,
}: {
  visible: boolean;
  prefillEmail: string;
  onClose: () => void;
  showToast: (msg: string, type: ToastType) => void;
}) {
  const [step, setStep] = useState<ForgotStep>("email");
  const [fpEmail, setFpEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");

  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (visible) {
      setStep("email");
      setFpEmail(prefillEmail);
      setResetCode("");
      setNewPassword("");
      setConfirmPassword("");
      setVerificationCode("");
      scaleAnim.setValue(0.88);
      opacityAnim.setValue(0);
      slideAnim.setValue(20);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          damping: 14,
          stiffness: 200,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 14,
          stiffness: 160,
        }),
      ]).start();
    }
  }, [visible, prefillEmail]);

  const animateStep = () => {
    slideAnim.setValue(24);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      damping: 14,
      stiffness: 180,
    }).start();
  };

  const handleSendCode = async () => {
    if (!fpEmail.trim()) {
      showToast("Enter your email address", "error");
      return;
    }
    setLoading(true);
    try {
      const res = await api.forgotPassword(fpEmail.trim().toLowerCase());
      if (res.dev_code) setVerificationCode(res.dev_code);
      animateStep();
      setStep("code");
      showToast("Reset code sent! Check your email.", "success");
    } catch (e: any) {
      showToast(e.message || "Something went wrong", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = () => {
    if (resetCode.length !== 6) {
      showToast("Enter the 6-digit code", "error");
      return;
    }
    animateStep();
    setStep("newPassword");
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 6) {
      showToast("Password must be at least 6 characters", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("Passwords don't match", "error");
      return;
    }
    setLoading(true);
    try {
      await api.resetPassword(
        fpEmail.trim().toLowerCase(),
        resetCode,
        newPassword,
      );
      animateStep();
      setStep("done");
    } catch (e: any) {
      showToast(e.message || "Reset failed. Try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const stepConfig = {
    email: {
      icon: "mail-outline",
      color: Colors.primary,
      title: "Forgot Password?",
      subtitle: "Enter your email and we'll send a reset code.",
    },
    code: {
      icon: "keypad-outline",
      color: "#8b5cf6",
      title: "Enter Reset Code",
      subtitle: `We sent a 6-digit code to\n${fpEmail}`,
    },
    newPassword: {
      icon: "lock-open-outline",
      color: "#22c55e",
      title: "New Password",
      subtitle: "Choose a strong new password.",
    },
    done: {
      icon: "checkmark-circle",
      color: "#22c55e",
      title: "Password Reset!",
      subtitle: "You can now sign in with your new password.",
    },
  }[step];

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={fm.overlay}>
        <Animated.View
          style={[
            fm.card,
            { opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          {step !== "done" && (
            <View style={fm.stepRow}>
              {(["email", "code", "newPassword"] as ForgotStep[]).map(
                (s, i) => (
                  <View
                    key={s}
                    style={{ flexDirection: "row", alignItems: "center" }}
                  >
                    <View
                      style={[
                        fm.stepDot,
                        (step === s ||
                          i <
                            ["email", "code", "newPassword"].indexOf(step)) && {
                          backgroundColor: Colors.primary,
                        },
                      ]}
                    />
                    {i < 2 && (
                      <View
                        style={[
                          fm.stepLine,
                          i <
                            ["email", "code", "newPassword"].indexOf(step) && {
                            backgroundColor: Colors.primary,
                          },
                        ]}
                      />
                    )}
                  </View>
                ),
              )}
            </View>
          )}

          <View
            style={[
              fm.iconCircle,
              {
                backgroundColor: stepConfig.color + "15",
                borderColor: stepConfig.color + "40",
              },
            ]}
          >
            <Ionicons
              name={stepConfig.icon as any}
              size={30}
              color={stepConfig.color}
            />
          </View>

          <Text style={fm.title}>{stepConfig.title}</Text>

          <Animated.View
            style={{ width: "100%", transform: [{ translateY: slideAnim }] }}
          >
            <Text style={fm.subtitle}>{stepConfig.subtitle}</Text>

            {step === "email" && (
              <>
                <View style={fm.inputWrap}>
                  <Ionicons
                    name="mail-outline"
                    size={18}
                    color="#9ca3af"
                    style={fm.inputIcon}
                  />
                  <TextInput
                    style={fm.input}
                    placeholder="your@email.com"
                    value={fpEmail}
                    onChangeText={setFpEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
                <TouchableOpacity
                  style={[fm.btn, { backgroundColor: Colors.primary }]}
                  onPress={handleSendCode}
                  activeOpacity={0.85}
                  disabled={loading}
                >
                  {loading ? (
                    <Text style={fm.btnText}>Sending...</Text>
                  ) : (
                    <>
                      <Ionicons name="send-outline" size={16} color="#fff" />
                      <Text style={fm.btnText}>Send Reset Code</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}

            {step === "code" && (
              <>
                {!!verificationCode && (
                  <View style={fm.codeDisplay}>
                    <View style={fm.codeDisplayHeader}>
                      <Ionicons
                        name="mail-open-outline"
                        size={14}
                        color="#8b5cf6"
                      />
                      <Text style={fm.codeDisplayLabel}>Verification Code</Text>
                    </View>
                    <Text style={fm.codeDisplayValue}>{verificationCode}</Text>
                    <Text style={fm.codeDisplayHint}>
                      Enter this code below
                    </Text>
                  </View>
                )}
                <View style={fm.inputWrap}>
                  <Ionicons
                    name="keypad-outline"
                    size={18}
                    color="#9ca3af"
                    style={fm.inputIcon}
                  />
                  <TextInput
                    style={fm.input}
                    placeholder="6-digit code"
                    value={resetCode}
                    onChangeText={(v) =>
                      setResetCode(v.replace(/\D/g, "").slice(0, 6))
                    }
                    keyboardType="number-pad"
                    maxLength={6}
                    placeholderTextColor="#9ca3af"
                  />
                </View>
                <TouchableOpacity
                  style={[fm.btn, { backgroundColor: "#8b5cf6" }]}
                  onPress={handleVerifyCode}
                  activeOpacity={0.85}
                >
                  <Ionicons name="checkmark-outline" size={16} color="#fff" />
                  <Text style={fm.btnText}>Verify Code</Text>
                </TouchableOpacity>
                <TouchableOpacity style={fm.resend} onPress={handleSendCode}>
                  <Text style={fm.resendText}>Resend code</Text>
                </TouchableOpacity>
              </>
            )}

            {step === "newPassword" && (
              <>
                <View style={fm.inputWrap}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={18}
                    color="#9ca3af"
                    style={fm.inputIcon}
                  />
                  <TextInput
                    style={fm.input}
                    placeholder="New password"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showNew}
                    placeholderTextColor="#9ca3af"
                  />
                  <TouchableOpacity onPress={() => setShowNew(!showNew)}>
                    <Ionicons
                      name={showNew ? "eye-off-outline" : "eye-outline"}
                      size={18}
                      color="#9ca3af"
                    />
                  </TouchableOpacity>
                </View>
                <View style={fm.inputWrap}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={18}
                    color="#9ca3af"
                    style={fm.inputIcon}
                  />
                  <TextInput
                    style={fm.input}
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirm}
                    placeholderTextColor="#9ca3af"
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirm(!showConfirm)}
                  >
                    <Ionicons
                      name={showConfirm ? "eye-off-outline" : "eye-outline"}
                      size={18}
                      color="#9ca3af"
                    />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={[fm.btn, { backgroundColor: "#22c55e" }]}
                  onPress={handleResetPassword}
                  activeOpacity={0.85}
                  disabled={loading}
                >
                  {loading ? (
                    <Text style={fm.btnText}>Resetting...</Text>
                  ) : (
                    <>
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={16}
                        color="#fff"
                      />
                      <Text style={fm.btnText}>Reset Password</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}

            {step === "done" && (
              <TouchableOpacity
                style={[fm.btn, { backgroundColor: Colors.primary }]}
                onPress={onClose}
                activeOpacity={0.85}
              >
                <Ionicons name="log-in-outline" size={16} color="#fff" />
                <Text style={fm.btnText}>Sign In Now</Text>
              </TouchableOpacity>
            )}
          </Animated.View>

          {step !== "done" && (
            <TouchableOpacity onPress={onClose} style={fm.cancel}>
              <Text style={fm.cancelText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const fm = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 28,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
    width: "100%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 14 },
    elevation: 18,
  },
  stepRow: { flexDirection: "row", alignItems: "center", marginBottom: 24 },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#e5e7eb",
  },
  stepLine: {
    width: 32,
    height: 2,
    backgroundColor: "#e5e7eb",
    marginHorizontal: 4,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 21,
    fontWeight: "800",
    color: "#111",
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13.5,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 20,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 12,
    backgroundColor: "#fafafa",
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: "#111" },
  btn: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    borderRadius: 16,
    marginTop: 4,
  },
  btnText: { fontSize: 15, fontWeight: "800", color: "#fff" },
  resend: { alignSelf: "center", marginTop: 14 },
  resendText: { fontSize: 13, color: Colors.primary, fontWeight: "600" },
  codeDisplay: {
    width: "100%",
    backgroundColor: "#f5f3ff",
    borderWidth: 1.5,
    borderColor: "#ddd6fe",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
    alignItems: "center",
  },
  codeDisplayHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  codeDisplayLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#7c3aed",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  codeDisplayValue: {
    fontSize: 32,
    fontWeight: "900",
    color: "#4c1d95",
    letterSpacing: 8,
    marginBottom: 4,
  },
  codeDisplayHint: { fontSize: 11, color: "#9ca3af", fontWeight: "500" },
  cancel: { marginTop: 18 },
  cancelText: { fontSize: 14, color: "#9ca3af", fontWeight: "600" },
});

// ── Main Login Screen 
export default function LoginScreen() {
  const [loginMethod, setLoginMethod] = useState<LoginMethod>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState("");
  const [phonePassword, setPhonePassword] = useState("");
  const [showPhonePassword, setShowPhonePassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [wrongPasswordModal, setWrongPasswordModal] = useState(false);
  const [forgotPasswordModal, setForgotPasswordModal] = useState(false);
  const [prefillEmail, setPrefillEmail] = useState("");

  const [toast, setToast] = useState({
    visible: false,
    message: "",
    type: "error" as ToastType,
  });
  const showToast = (message: string, type: ToastType = "error") =>
    setToast({ visible: true, message, type });
  const hideToast = () => setToast((t) => ({ ...t, visible: false }));

  const { login, workerLogin } = useAuth();
  const router = useRouter();

  // ── Helper: detect wrong-password errors 
  const isWrongPassword = (err: any): boolean => {
    const msg = (err?.message || "").toLowerCase();
    return (
      msg.includes("invalid") ||
      msg.includes("password") ||
      msg.includes("incorrect") ||
      msg.includes("unauthorized") ||
      msg.includes("401")
    );
  };

  // ── FIXED handleLogin 
  const handleLogin = async () => {
    const pwd = loginMethod === "email" ? password : phonePassword;

    // Validation
    if (loginMethod === "email") {
      if (!email.trim()) {
        showToast("Please enter your email address", "error");
        return;
      }
      if (!password) {
        showToast("Please enter your password", "error");
        return;
      }
    }
    if (loginMethod === "phone") {
      if (phone.length !== 10) {
        showToast("Enter a valid 10-digit mobile number", "error");
        return;
      }
      if (!/^[6-9]/.test(phone)) {
        showToast("Indian numbers must start with 6, 7, 8 or 9", "error");
        return;
      }
      if (!phonePassword) {
        showToast("Please enter your password", "error");
        return;
      }
    }

    setLoading(true);

    let userLoginError: any = null;
    let workerLoginError: any = null;

    try {
      // ── Step 1: Try USER login 
      try {
        const identifier =
          loginMethod === "email" ? email.trim() : `+91${phone}`;
        await login(identifier, pwd);
        showToast("Welcome back! ", "success");
        setTimeout(() => router.replace("/"), 800);
        return; 
      } catch (err: any) {
        userLoginError = err; 
      }

      // ── Step 2: Try WORKER login (email only) 
      if (loginMethod === "email") {
        try {
          await workerLogin(email.trim(), pwd);
          showToast("Welcome, worker ", "success");
          setTimeout(() => router.replace("/(worker)" as any), 800);
          return; // success — exit
        } catch (err: any) {
          workerLoginError = err; // store error, do NOT return
        }
      }

      // ── Step 3: Both failed — decide what to show ──────────────────────
      // Show wrong-password modal if either attempt got a credentials error
      if (
        loginMethod === "email" &&
        (isWrongPassword(userLoginError) || isWrongPassword(workerLoginError))
      ) {
        setPrefillEmail(email.trim());
        setWrongPasswordModal(true);
        return;
      }

      // For phone or any other error — generic toast
      showToast(
        loginMethod === "phone"
          ? "Invalid phone number or password"
          : "Invalid email or password",
        "error",
      );
    } catch {
      showToast("Something went wrong. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForgotFromModal = () => {
    setWrongPasswordModal(false);
    setTimeout(() => setForgotPasswordModal(true), 300);
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom", "left", "right"]}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
        translucent={false}
      />
      <View style={styles.statusBarPatch} />

      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={hideToast}
      />

      <WrongPasswordModal
        visible={wrongPasswordModal}
        email={prefillEmail}
        onTryAgain={() => {
          setWrongPasswordModal(false);
          if (loginMethod === "email") setPassword("");
          else setPhonePassword("");
        }}
        onForgotPassword={handleOpenForgotFromModal}
        onClose={() => setWrongPasswordModal(false)}
      />

      <ForgotPasswordModal
        visible={forgotPasswordModal}
        prefillEmail={prefillEmail}
        onClose={() => setForgotPasswordModal(false)}
        showToast={showToast}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoCircle}>
              <Image
                source={require("./loginassets/gauhamlogo.png")}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.title}>Welcome to Gausatv</Text>
            <Text style={styles.subtitle}>Sign in to continue</Text>
          </View>

          {/* Toggle */}
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                loginMethod === "email" && styles.toggleBtnActive,
              ]}
              onPress={() => setLoginMethod("email")}
            >
              <Ionicons
                name="mail-outline"
                size={16}
                color={loginMethod === "email" ? "#fff" : Colors.textSecondary}
              />
              <Text
                style={[
                  styles.toggleText,
                  loginMethod === "email" && styles.toggleTextActive,
                ]}
              >
                Email
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                loginMethod === "phone" && styles.toggleBtnActive,
              ]}
              onPress={() => setLoginMethod("phone")}
            >
              <Ionicons
                name="call-outline"
                size={16}
                color={loginMethod === "phone" ? "#fff" : Colors.textSecondary}
              />
              <Text
                style={[
                  styles.toggleText,
                  loginMethod === "phone" && styles.toggleTextActive,
                ]}
              >
                Phone
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.card}>
              {loginMethod === "email" && (
                <>
                  <Input
                    label="Email"
                    placeholder="Enter your email"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    leftIcon={
                      <Ionicons
                        name="mail-outline"
                        size={20}
                        color={Colors.textSecondary}
                      />
                    }
                  />
                  <Input
                    label="Password"
                    placeholder="Enter your password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    leftIcon={
                      <Ionicons
                        name="lock-closed-outline"
                        size={20}
                        color={Colors.textSecondary}
                      />
                    }
                    rightIcon={
                      <TouchableOpacity
                        onPress={() => setShowPassword(!showPassword)}
                      >
                        <Ionicons
                          name={
                            showPassword ? "eye-off-outline" : "eye-outline"
                          }
                          size={20}
                          color={Colors.textSecondary}
                        />
                      </TouchableOpacity>
                    }
                  />
                </>
              )}

              {loginMethod === "phone" && (
                <>
                  <Text style={styles.inputLabel}>Mobile Number</Text>
                  <View style={styles.phoneRow}>
                    <View style={styles.countryCode}>
                      <Text style={styles.countryCodeText}>+91</Text>
                    </View>
                    <TextInput
                      style={styles.phoneInput}
                      placeholder="mobile number"
                      value={phone}
                      onChangeText={(val) =>
                        setPhone(val.replace(/\D/g, "").slice(0, 10))
                      }
                      keyboardType="number-pad"
                      maxLength={10}
                      placeholderTextColor={Colors.textSecondary}
                    />
                  </View>
                  <Input
                    label="Password"
                    placeholder="Enter your password"
                    value={phonePassword}
                    onChangeText={setPhonePassword}
                    secureTextEntry={!showPhonePassword}
                    leftIcon={
                      <Ionicons
                        name="lock-closed-outline"
                        size={20}
                        color={Colors.textSecondary}
                      />
                    }
                    rightIcon={
                      <TouchableOpacity
                        onPress={() => setShowPhonePassword(!showPhonePassword)}
                      >
                        <Ionicons
                          name={
                            showPhonePassword
                              ? "eye-off-outline"
                              : "eye-outline"
                          }
                          size={20}
                          color={Colors.textSecondary}
                        />
                      </TouchableOpacity>
                    }
                  />
                </>
              )}

              <Button
                title="Sign In"
                onPress={handleLogin}
                loading={loading}
                style={styles.button}
              />

              <TouchableOpacity
                style={styles.forgotLink}
                onPress={() => {
                  setPrefillEmail(loginMethod === "email" ? email.trim() : "");
                  setForgotPasswordModal(true);
                }}
              >
                <Text style={styles.forgotLinkText}>Forgot password?</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account?</Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/register")}>
              <Text style={styles.linkText}>Sign Up</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.demoSection}>
            <Text style={styles.demoTitle}>Gausatv</Text>
            <Text style={styles.demoText}>Dairy and cattle management</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F6FA" },
  statusBarPatch: {
    backgroundColor: "#FFFFFF",
    height: Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0,
  },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: 24 },

  header: { alignItems: "center", marginTop: 40, marginBottom: 32 },
  logoCircle: {},
  logoImage: { width: 150, height: 150, marginBottom: 12 },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: { fontSize: 16, color: Colors.textSecondary },

  toggleContainer: {
    flexDirection: "row",
    backgroundColor: "#E5E7EB",
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  toggleBtnActive: { backgroundColor: Colors.primary },
  toggleText: { fontSize: 14, fontWeight: "600", color: Colors.textSecondary },
  toggleTextActive: { color: "#fff" },

  form: { marginBottom: 24 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  button: { marginTop: 8 },

  forgotLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    marginTop: 4,
    paddingVertical: 4,
  },
  forgotLinkText: { fontSize: 14, color: Colors.primary, fontWeight: "600" },

  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 6,
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    backgroundColor: "#fff",
    overflow: "hidden",
    marginBottom: 4,
  },
  countryCode: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: "#F9FAFB",
    borderRightWidth: 1,
    borderRightColor: "#E5E7EB",
    gap: 6,
  },
  countryFlag: { fontSize: 20 },
  countryCodeText: { fontSize: 15, fontWeight: "600", color: Colors.text },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text,
  },

  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginBottom: 24,
  },
  footerText: { fontSize: 14, color: Colors.textSecondary },
  linkText: { fontSize: 14, fontWeight: "600", color: Colors.primary },

  demoSection: {
    padding: 16,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
  },
  demoTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 8,
  },
  demoText: { fontSize: 12, color: Colors.textSecondary },
});
