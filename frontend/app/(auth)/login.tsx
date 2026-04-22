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

type ToastType = "error" | "success" | "warn";

function looksLikePhone(value: string): boolean {
  return /^\d/.test(value.trim());
}

function isValidIndianPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length === 10 && /^[6-9]/.test(digits);
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

// ── OTP Popup Modal 
function OTPPopupModal({
  visible,
  code,
  identifier,
  onClose,
}: {
  visible: boolean;
  code: string;
  identifier: string;
  onClose: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.8);
      opacityAnim.setValue(0);
      glowAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          damping: 12,
          stiffness: 220,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(glowAnim, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(glowAnim, {
              toValue: 0,
              duration: 1000,
              useNativeDriver: true,
            }),
          ]),
        ).start();
      });
    }
  }, [visible]);

  const isPhone = looksLikePhone(identifier);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={otp.overlay}>
        <Animated.View
          style={[
            otp.card,
            { opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          <View style={otp.badge}>
            <Ionicons
              name={isPhone ? "phone-portrait-outline" : "mail-outline"}
              size={13}
              color={Colors.primary}
            />
            <Text style={otp.badgeText}>
              {isPhone ? "SMS Code" : "Email Code"}
            </Text>
          </View>
          <View style={otp.iconRing}>
            <View style={otp.iconCircle}>
              <Ionicons name="keypad" size={28} color="#fff" />
            </View>
          </View>
          <Text style={otp.title}>Your Verification Code</Text>
          <Text style={otp.subtitle}>
            Sent to{" "}
            <Text style={otp.identifierText}>
              {isPhone ? `+91 ${identifier}` : identifier}
            </Text>
          </Text>
          <Animated.View
            style={[
              otp.codeBox,
              {
                opacity: glowAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.9, 1],
                }),
              },
            ]}
          >
            <Text style={otp.codeText}>{code}</Text>
          </Animated.View>
          <Text style={otp.hint}>
            Enter this code in the verification field below
          </Text>
          <TouchableOpacity
            style={otp.closeBtn}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Text style={otp.closeBtnText}>Got it</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const otp = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 28,
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 24,
    width: "100%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 36,
    shadowOffset: { width: 0, height: 16 },
    elevation: 20,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.primary + "15",
    borderWidth: 1,
    borderColor: Colors.primary + "30",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  iconRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: Colors.primary + "15",
    borderWidth: 2,
    borderColor: Colors.primary + "35",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111",
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13.5,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 22,
    lineHeight: 20,
  },
  identifierText: { fontWeight: "700", color: "#374151" },
  codeBox: {
    width: "100%",
    backgroundColor: Colors.primary + "0D",
    borderWidth: 2,
    borderColor: Colors.primary + "40",
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: "center",
    marginBottom: 14,
  },
  codeText: {
    fontSize: 38,
    fontWeight: "900",
    color: Colors.primary,
    letterSpacing: 12,
  },
  hint: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center",
    marginBottom: 22,
    lineHeight: 18,
  },
  closeBtn: {
    width: "100%",
    backgroundColor: Colors.primary,
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: Colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  closeBtnText: { fontSize: 16, fontWeight: "800", color: "#fff" },
});

// ── Wrong Password Modal 
function WrongPasswordModal({
  visible,
  identifier,
  onTryAgain,
  onForgotPassword,
  onClose,
}: {
  visible: boolean;
  identifier: string;
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
            <Text style={wm.emailText}>{identifier || "your account"}</Text>
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
type ForgotStep = "identifier" | "code" | "newPassword" | "done";

function ForgotPasswordModal({
  visible,
  prefillIdentifier,
  onClose,
  showToast,
}: {
  visible: boolean;
  prefillIdentifier: string;
  onClose: () => void;
  showToast: (msg: string, type: ToastType) => void;
}) {
  const [step, setStep] = useState<ForgotStep>("identifier");
  const [fpIdentifier, setFpIdentifier] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpPopupVisible, setOtpPopupVisible] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");

  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const isPhone = looksLikePhone(fpIdentifier);

  useEffect(() => {
    if (visible) {
      setStep("identifier");
      setFpIdentifier(prefillIdentifier);
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
  }, [visible, prefillIdentifier]);

  const animateStep = () => {
    slideAnim.setValue(24);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      damping: 14,
      stiffness: 180,
    }).start();
  };

  // ── Build the identifier to send to the backend 
  const buildSendIdentifier = (): string | null => {
    const val = fpIdentifier.trim();
    if (!val) return null;

    if (looksLikePhone(val)) {
      const digits = val.replace(/\D/g, "");
      if (!isValidIndianPhone(digits)) return null;
      return `+91${digits}`;
    }
    return val.toLowerCase();
  };

  const handleSendCode = async () => {
    const sendTo = buildSendIdentifier();
    if (!sendTo) {
      const val = fpIdentifier.trim();
      if (!val) {
        showToast("Enter your email or phone number", "error");
      } else if (looksLikePhone(val)) {
        showToast("Enter a valid 10-digit Indian mobile number", "error");
      } else {
        showToast("Enter a valid email address", "error");
      }
      return;
    }

    setLoading(true);
    try {
      const res = await api.forgotPassword(sendTo);
      if (res.dev_code) {
        setVerificationCode(res.dev_code);
        setOtpPopupVisible(true);
      }
      animateStep();
      setStep("code");
      showToast(
        looksLikePhone(fpIdentifier.trim())
          ? "OTP sent to your mobile number!"
          : "Reset code sent! Check your email.",
        "success",
      );
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

    const sendTo = buildSendIdentifier();
    if (!sendTo) {
      showToast("Invalid identifier", "error");
      return;
    }

    setLoading(true);
    try {
      await api.resetPassword(sendTo, resetCode, newPassword);
      animateStep();
      setStep("done");
    } catch (e: any) {
      showToast(e.message || "Reset failed. Try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const stepConfig = {
    identifier: {
      icon: isPhone ? "phone-portrait-outline" : "mail-outline",
      color: Colors.primary,
      title: "Forgot Password?",
      subtitle: "Enter your email or phone number\nto receive a reset code.",
    },
    code: {
      icon: "keypad-outline",
      color: "#8b5cf6",
      title: "Enter Reset Code",
      subtitle: `We sent a 6-digit code to\n${
        looksLikePhone(fpIdentifier)
          ? `+91 ${fpIdentifier.replace(/\D/g, "")}`
          : fpIdentifier
      }`,
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
    <>
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
                {(["identifier", "code", "newPassword"] as ForgotStep[]).map(
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
                              ["identifier", "code", "newPassword"].indexOf(
                                step,
                              )) && { backgroundColor: Colors.primary },
                        ]}
                      />
                      {i < 2 && (
                        <View
                          style={[
                            fm.stepLine,
                            i <
                              ["identifier", "code", "newPassword"].indexOf(
                                step,
                              ) && { backgroundColor: Colors.primary },
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

              {step === "identifier" && (
                <>
                  <View style={fm.inputWrap}>
                    <Ionicons
                      name={isPhone ? "call-outline" : "mail-outline"}
                      size={18}
                      color="#9ca3af"
                      style={fm.inputIcon}
                    />
                    {isPhone && (
                      <View style={fm.phonePrefixBox}>
                        <Text style={fm.phonePrefixText}>+91</Text>
                      </View>
                    )}
                    <TextInput
                      style={fm.input}
                      placeholder="Email or phone number"
                      value={fpIdentifier}
                      onChangeText={setFpIdentifier}
                      keyboardType={isPhone ? "number-pad" : "email-address"}
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
                    <TouchableOpacity
                      style={fm.viewCodeBtn}
                      onPress={() => setOtpPopupVisible(true)}
                      activeOpacity={0.85}
                    >
                      <Ionicons
                        name="eye-outline"
                        size={15}
                        color={Colors.primary}
                      />
                      <Text style={fm.viewCodeBtnText}>View my code</Text>
                    </TouchableOpacity>
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

      <OTPPopupModal
        visible={otpPopupVisible}
        code={verificationCode}
        identifier={fpIdentifier.trim()}
        onClose={() => setOtpPopupVisible(false)}
      />
    </>
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
  phonePrefixBox: {
    marginRight: 8,
    paddingRight: 8,
    borderRightWidth: 1,
    borderRightColor: "#e5e7eb",
  },
  phonePrefixText: { fontSize: 14, fontWeight: "700", color: "#374151" },
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
  viewCodeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: Colors.primary + "10",
    borderWidth: 1.5,
    borderColor: Colors.primary + "30",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 14,
    alignSelf: "center",
  },
  viewCodeBtnText: { fontSize: 13, fontWeight: "700", color: Colors.primary },
  cancel: { marginTop: 18 },
  cancelText: { fontSize: 14, color: "#9ca3af", fontWeight: "600" },
});

// ── Main Login Screen 
export default function LoginScreen() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [wrongPasswordModal, setWrongPasswordModal] = useState(false);
  const [forgotPasswordModal, setForgotPasswordModal] = useState(false);
  const [prefillIdentifier, setPrefillIdentifier] = useState("");

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

  const isPhoneInput = looksLikePhone(identifier);

  // ── Build the identifier to send to backend 
  const buildLoginIdentifier = (val: string): string => {
    if (looksLikePhone(val)) {
      return `+91${val.replace(/\D/g, "")}`;
    }
    return val.toLowerCase();
  };

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

  const handleLogin = async () => {
    const val = identifier.trim();

    if (!val) {
      showToast("Please enter your email or phone number", "error");
      return;
    }
    if (!password) {
      showToast("Please enter your password", "error");
      return;
    }

    if (isPhoneInput) {
      if (!isValidIndianPhone(val)) {
        showToast(
          "Enter a valid 10-digit mobile number starting with 6-9",
          "error",
        );
        return;
      }
    }

    setLoading(true);

    let userLoginError: any = null;
    let workerLoginError: any = null;

    try {
      const loginId = buildLoginIdentifier(val);

      // ── Step 1: Try USER login 
      try {
        await login(loginId, password);
        showToast("Welcome ", "success");
        setTimeout(() => router.replace("/"), 800);
        return;
      } catch (err: any) {
        userLoginError = err;
      }

      // ── Step 2: Try WORKER login 
      try {
        // workerLogin backend accepts email field but we send identifier
        // which could be phone — the backend finds by phone too
        await workerLogin(loginId, password);
        showToast("Welcome", "success");
        setTimeout(() => router.replace("/(worker)" as any), 800);
        return;
      } catch (err: any) {
        workerLoginError = err;
      }

      // ── Step 3: Both failed
      if (
        isWrongPassword(userLoginError) ||
        isWrongPassword(workerLoginError)
      ) {
        setPrefillIdentifier(val);
        setWrongPasswordModal(true);
        return;
      }

      showToast(
        isPhoneInput
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
        identifier={prefillIdentifier}
        onTryAgain={() => {
          setWrongPasswordModal(false);
          setPassword("");
        }}
        onForgotPassword={handleOpenForgotFromModal}
        onClose={() => setWrongPasswordModal(false)}
      />

      <ForgotPasswordModal
        visible={forgotPasswordModal}
        prefillIdentifier={prefillIdentifier}
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

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.card}>
              {/* Smart identifier input */}
              <View style={styles.identifierWrap}>
                <View style={styles.identifierIcon}>
                  <Ionicons
                    name={isPhoneInput ? "call-outline" : "mail-outline"}
                    size={20}
                    color={Colors.textSecondary}
                  />
                </View>
                {isPhoneInput && (
                  <View style={styles.phonePrefixInline}>
                    <Text style={styles.phonePrefixInlineText}>+91</Text>
                    <View style={styles.phonePrefixDivider} />
                  </View>
                )}
                <TextInput
                  style={styles.identifierInput}
                  placeholder="Email or phone number"
                  value={identifier}
                  onChangeText={setIdentifier}
                  keyboardType="default"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="off"
                  placeholderTextColor={styles.placeholderColor.color}
                />
                {identifier.length > 0 && (
                  <View
                    style={[
                      styles.typeChip,
                      {
                        backgroundColor: isPhoneInput
                          ? "#e0f2fe"
                          : Colors.primary + "15",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.typeChipText,
                        { color: isPhoneInput ? "#0284c7" : Colors.primary },
                      ]}
                    >
                      {isPhoneInput ? "Phone" : "Email"}
                    </Text>
                  </View>
                )}
              </View>

              {/* Password */}
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
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color={Colors.textSecondary}
                    />
                  </TouchableOpacity>
                }
              />

              <Button
                title="Sign In"
                onPress={handleLogin}
                loading={loading}
                style={styles.button}
              />

              <TouchableOpacity
                style={styles.forgotLink}
                onPress={() => {
                  setPrefillIdentifier(identifier.trim());
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
  identifierWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 52,
  },
  identifierIcon: { marginRight: 10 },
  phonePrefixInline: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 4,
  },
  phonePrefixInlineText: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.text,
    marginRight: 8,
  },
  phonePrefixDivider: {
    width: 1,
    height: 18,
    backgroundColor: "#E5E7EB",
    marginRight: 8,
  },
  identifierInput: { flex: 1, fontSize: 15, color: Colors.text },
  placeholderColor: { color: Colors.textSecondary },
  typeChip: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 6,
  },
  typeChipText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
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
