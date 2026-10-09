import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { api } from "../services/api";
import { useAuth } from "../contexts/AuthContext";

export default function CustomerPhoneAccess() {
  const router = useRouter();
  const { register } = useAuth();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const otpRef = useRef<TextInput>(null);
  const [otpFocused, setOtpFocused] = useState(false);
  useEffect(() => { if (!wait) return; const timer = setTimeout(() => setWait(wait-1), 1000); return () => clearTimeout(timer); }, [wait]);
  const run = async (verify: boolean) => {
    if (lock.current) return;
    if (!/^[6-9]\d{9}$/.test(phone)) { setError("Enter a valid 10-digit mobile number."); return; }
    if (verify && !/^\d{6}$/.test(code)) { setError("Enter the 6-digit verification code."); return; }
    lock.current = true; setBusy(true); setError("");
    try {
      if (verify) { await register({ customerOtp: true, phone: `+91${phone}`, otp: code }); router.replace("/(customer)/home" as any); }
      else { await api.sendCustomerOtp(`+91${phone}`); setSent(true); setWait(60); }
    } catch (e: any) { setError(typeof e?.message === "string" && !e.message.startsWith("{") ? e.message : "Could not verify your mobile number. Please try again."); }
    finally { lock.current = false; setBusy(false); }
  };
  return <SafeAreaView style={s.page}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={["#FF5200", "#FC8019", "#FFD580"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={theme.header}>
        <TouchableOpacity disabled={busy} accessibilityLabel={sent ? "Back to phone number" : "Back to login"} onPress={() => sent ? (setSent(false), setCode(""), setError("")) : router.replace("/(auth)/login" as any)} style={theme.back}><Ionicons name="arrow-back" size={22} color="#fff" /></TouchableOpacity>
        <View style={theme.logoArea}><Image source={require("../../assets/images/icon.png")} style={theme.logo} resizeMode="contain" /><Text style={theme.brand}>GauSatv</Text><Text style={theme.tagline}>Deliver Purity</Text></View>
        <View style={theme.steps}><View style={[theme.step, sent && theme.done]}>{sent ? <Ionicons name="checkmark" size={17} color="#fff" /> : <Text style={theme.stepNumber}>1</Text>}</View><Text style={theme.stepLabel}>Phone</Text><View style={theme.line} /><View style={[theme.step, !sent && { opacity: 0.5 }]}><Text style={theme.stepNumber}>2</Text></View><Text style={theme.stepLabel}>OTP</Text></View>
      </LinearGradient>
      <View style={s.body}>
      <Text style={s.title}>{sent ? "Verify your number" : "What is your number?"}</Text>
      <Text style={s.caption}>{sent ? `Enter the code sent to +91 ${phone}` : "We will keep it safe. No spam, ever."}</Text>
      {!sent ? <><Text style={s.label}>Mobile number</Text><View style={s.phone}><Text style={s.prefix}>+91</Text><TextInput accessibilityLabel="Mobile number" style={s.input} keyboardType="phone-pad" autoComplete="tel" maxLength={10} value={phone} onChangeText={text => setPhone(text.replace(/\D/g, ""))} editable={!busy} /></View></> : <>
        <Text style={s.label}>Verification code</Text>
        <View style={otpStyles.container}>
          <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={otpStyles.row}>
            {Array.from({ length: 6 }, (_, index) => <View key={index} style={[otpStyles.block, !!code[index] && otpStyles.filled, otpFocused && index === Math.min(code.length, 5) && otpStyles.active, !!error && otpStyles.invalid]}><Text style={otpStyles.digit}>{code[index] || ""}</Text></View>)}
          </View>
          {/* One native input preserves full-code paste, autofill and backspace. */}
          <TextInput ref={otpRef} accessibilityLabel="6-digit verification code" style={otpStyles.nativeInput} keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="sms-otp" maxLength={6} autoFocus value={code} onChangeText={text => { setCode(text.replace(/\D/g, "").slice(0, 6)); setError(""); }} editable={!busy} caretHidden selectionColor="transparent" onFocus={() => setOtpFocused(true)} onBlur={() => setOtpFocused(false)} onPressIn={() => { if (!busy) { otpRef.current?.blur(); requestAnimationFrame(() => otpRef.current?.focus()); } }} />
        </View>
        <TouchableOpacity disabled={busy} onPress={() => { setSent(false); setCode(""); setError(""); }}><Text style={s.link}>Change mobile number</Text></TouchableOpacity>
      </>}
      {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
      <TouchableOpacity disabled={busy} style={[s.button, busy && { opacity: 0.5 }]} onPress={() => void run(sent)}><LinearGradient colors={["#FF5200", "#FC8019"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={theme.button}>{busy ? <ActivityIndicator color="#fff" /> : <><Text style={s.buttonText}>{sent ? "Verify & Continue" : "Continue"}</Text><Ionicons name="arrow-forward" size={20} color="#fff" /></>}</LinearGradient></TouchableOpacity>
      {sent && <TouchableOpacity disabled={busy || wait > 0} onPress={() => void run(false)}><Text style={s.link}>{wait ? `Resend code in ${wait}s` : "Resend code"}</Text></TouchableOpacity>}
      <TouchableOpacity onPress={() => router.replace("/(auth)/login" as any)}><Text style={s.link}>Sign in with password</Text></TouchableOpacity>
      </View>
    </ScrollView></KeyboardAvoidingView></SafeAreaView>;
}
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#FFF8F5" }, body: { padding: 20, paddingTop: 24, gap: 18 },
  title: { fontSize: 24, fontWeight: "800", color: "#1C1C1C" }, caption: { color: "#6B6B6B", fontSize: 14 }, label: { fontSize: 14, color: "#1C1C1C", fontWeight: "600" },
  phone: { flexDirection: "row", alignItems: "center", backgroundColor: "white", borderRadius: 20, padding: 10, borderWidth: 1.5, borderColor: "#F0EBE8" }, prefix: { padding: 10, fontSize: 14, fontWeight: "700", backgroundColor: "#FFF8F5", borderRadius: 10 },
  input: { flex: 1, minWidth: 0, padding: 14, fontSize: 22, fontWeight: "700", color: "#1C1C1C", minHeight: 52 }, code: { flex: 0, backgroundColor: "white", borderWidth: 1.5, borderColor: "#F0EBE8", borderRadius: 20 },
  button: { borderRadius: 20, overflow: "hidden" }, buttonText: { color: "white", fontSize: 17, fontWeight: "800" }, link: { color: "#FF5200", paddingVertical: 8, fontSize: 14 }, error: { color: "#B42318", fontSize: 14 },
});
const otpStyles = StyleSheet.create({
  container: { height: 58, position: "relative" },
  row: { flex: 1, flexDirection: "row", gap: 8 },
  block: { flex: 1, minWidth: 0, borderRadius: 12, borderWidth: 1.5, borderColor: "#F0EBE8", backgroundColor: "white", alignItems: "center", justifyContent: "center" },
  filled: { backgroundColor: "#FFF3EE", borderColor: "#FFD6C2" },
  active: { borderColor: "#FF5200", borderWidth: 2 },
  invalid: { borderColor: "#B42318" },
  digit: { fontSize: 24, fontWeight: "700", color: "#1C1C1C" },
  nativeInput: { ...StyleSheet.absoluteFillObject, color: "transparent", backgroundColor: "transparent", fontSize: 24, padding: 0 },
});
const theme = StyleSheet.create({
  header: { padding: 20, paddingTop: 16, paddingBottom: 28, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  back: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.22)", justifyContent: "center", alignItems: "center" },
  logoArea: { alignItems: "center", gap: 4, marginTop: 12, marginBottom: 24 }, logo: { width: 64, height: 64, borderRadius: 16, marginBottom: 4 },
  brand: { fontSize: 28, fontWeight: "800", color: "#fff" }, tagline: { fontSize: 14, color: "rgba(255,255,255,0.85)" },
  steps: { flexDirection: "row", alignItems: "center", gap: 8 }, step: { width: 26, height: 26, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.28)", alignItems: "center", justifyContent: "center" }, done: { backgroundColor: "#48BB78" }, stepNumber: { color: "white", fontSize: 12, fontWeight: "800" }, stepLabel: { color: "white", fontSize: 12, fontWeight: "700" }, line: { flex: 1, height: 2, backgroundColor: "rgba(255,255,255,0.7)", marginHorizontal: 4 },
  button: { padding: 16, minHeight: 54, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 10 },
});
