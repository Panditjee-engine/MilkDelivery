import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform,
  TouchableOpacity, Alert, TextInput, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { Colors } from '../../src/constants/colors';
import Input from '../../src/components/Input';
import Button from '../../src/components/Button';
import { api } from '../../src/services/api';

type Role = 'customer' | 'delivery_partner' | 'admin';
type Step = 'phone' | 'otp' | 'details';

const roles = [
  { value: 'customer' as Role, label: 'Customer', icon: 'person', description: 'Order daily essentials' },
  { value: 'delivery_partner' as Role, label: 'Delivery Partner', icon: 'bicycle', description: 'Deliver orders' },
  { value: 'admin' as Role, label: 'Admin', icon: 'shield', description: 'Manage the platform' },
];

export default function RegisterScreen() {
  const [step, setStep] = useState<Step>('phone');

  // Step 1
  const [phone, setPhone] = useState('');       // stores only 10 digits
  const [sendingOtp, setSendingOtp] = useState(false);

  // Step 2
  const [otp, setOtp] = useState(['', '', '', '']);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resending, setResending] = useState(false);
  const inputs = useRef<TextInput[]>([]);

  // Step 3
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<Role>('customer');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const router = useRouter();

  // Always send with +91 prefix
  const fullPhone = `+91${phone}`;

  // ── Step 1: Send OTP ──────────────────────────────────────────
  const handleSendOtp = async () => {
    if (!phone || phone.length !== 10) {
      Alert.alert('Error', 'Enter a valid 10-digit mobile number');
      return;
    }
    setSendingOtp(true);
    try {
      await api.sendOtp(fullPhone);
      setStep('otp');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSendingOtp(false);
    }
  };

  // ── Step 2: Verify OTP ────────────────────────────────────────
  const handleOtpChange = (val: string, idx: number) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[idx] = val;
    setOtp(next);
    if (val && idx < 3) inputs.current[idx + 1]?.focus();
  };

  const handleVerifyOtp = async () => {
    const code = otp.join('');
    if (code.length < 4) {
      Alert.alert('Error', 'Enter the 4-digit OTP');
      return;
    }
    setVerifyingOtp(true);
    try {
      await api.verifyOtp(fullPhone, code);
      setStep('details');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    setResending(true);
    setOtp(['', '', '', '']);
    try {
      await api.sendOtp(fullPhone);
      Alert.alert('Sent', 'New OTP sent to your phone');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setResending(false);
    }
  };

  // ── Step 3: Register ──────────────────────────────────────────
  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await register({ name, email, phone: fullPhone, password, role });
      router.replace('/');
    } catch (error: any) {
      Alert.alert('Registration Failed', error.message || 'Could not create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Back button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() =>
              step === 'phone'
                ? router.back()
                : setStep(step === 'otp' ? 'phone' : 'otp')
            }
          >
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>

          {/* Progress indicator */}
          <View style={styles.progressRow}>
            {(['phone', 'otp', 'details'] as Step[]).map((s, i) => {
              const stepIndex = ['phone', 'otp', 'details'].indexOf(step);
              const isDone = stepIndex > i;
              const isActive = step === s;
              return (
                <View key={s} style={styles.progressItem}>
                  <View style={[
                    styles.progressDot,
                    isActive && styles.progressDotActive,
                    isDone && styles.progressDotDone,
                  ]}>
                    <Text style={styles.progressDotText}>{i + 1}</Text>
                  </View>
                  {i < 2 && (
                    <View style={[
                      styles.progressLine,
                      isDone && styles.progressLineDone,
                    ]} />
                  )}
                </View>
              );
            })}
          </View>

          {/* ── STEP 1: Phone ── */}
          {step === 'phone' && (
            <View style={styles.stepContainer}>
              <Text style={styles.title}>Enter your phone</Text>
              <Text style={styles.subtitle}>
                We'll send a verification code via SMS
              </Text>

              <View style={styles.formCard}>

                {/* Phone input with hardcoded +91 */}
                <Text style={styles.inputLabel}>Mobile Number *</Text>
                <View style={styles.phoneRow}>
                  <View style={styles.countryCode}>
                    <Text style={styles.countryFlag}>🇮🇳</Text>
                    <Text style={styles.countryCodeText}>+91</Text>
                  </View>
                  <TextInput
                    style={styles.phoneInput}
                    placeholder="9999999999"
                    value={phone}
                    onChangeText={(val) => {
                      // Only allow digits, max 10
                      const cleaned = val.replace(/\D/g, '').slice(0, 10);
                      setPhone(cleaned);
                    }}
                    keyboardType="number-pad"
                    maxLength={10}
                    placeholderTextColor={Colors.textSecondary}
                  />
                </View>
                <Text style={styles.phoneHint}>
                  Enter 10-digit number without country code
                </Text>

                <Button
                  title="Send OTP"
                  onPress={handleSendOtp}
                  loading={sendingOtp}
                  style={styles.button}
                />
              </View>
            </View>
          )}

          {/* ── STEP 2: OTP ── */}
          {step === 'otp' && (
            <View style={styles.stepContainer}>
              <Text style={styles.title}>Verify OTP</Text>
              <Text style={styles.subtitle}>
                Enter the 4-digit code sent to{'\n'}
                <Text style={styles.highlight}>+91 {phone}</Text>
              </Text>

              <View style={styles.otpRow}>
                {otp.map((digit, i) => (
                  <TextInput
                    key={i}
                    ref={r => { if (r) inputs.current[i] = r; }}
                    style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
                    value={digit}
                    onChangeText={v => handleOtpChange(v, i)}
                    keyboardType="number-pad"
                    maxLength={1}
                    onKeyPress={({ nativeEvent }) => {
                      if (nativeEvent.key === 'Backspace' && !otp[i] && i > 0)
                        inputs.current[i - 1]?.focus();
                    }}
                  />
                ))}
              </View>

              <Button
                title="Verify OTP"
                onPress={handleVerifyOtp}
                loading={verifyingOtp}
                style={styles.button}
              />

              <TouchableOpacity
                onPress={handleResendOtp}
                disabled={resending}
                style={styles.resend}
              >
                {resending ? (
                  <ActivityIndicator color={Colors.primary} />
                ) : (
                  <Text style={styles.resendText}>
                    Didn't receive it? Resend OTP
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* ── STEP 3: Details ── */}
          {step === 'details' && (
            <View style={styles.stepContainer}>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>
                Phone verified ✓  Fill in your details
              </Text>

              {/* Role selector */}
              <View style={styles.roleContainer}>
                {roles.map((r) => (
                  <TouchableOpacity
                    key={r.value}
                    activeOpacity={0.8}
                    style={[
                      styles.roleCard,
                      role === r.value && styles.roleCardActive,
                    ]}
                    onPress={() => setRole(r.value)}
                  >
                    <Ionicons
                      name={r.icon as any}
                      size={28}
                      color={role === r.value ? Colors.primary : Colors.textSecondary}
                    />
                    <Text style={[
                      styles.roleLabel,
                      role === r.value && styles.roleLabelActive,
                    ]}>
                      {r.label}
                    </Text>
                    <Text style={styles.roleDescription}>
                      {r.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.formCard}>
                <Input
                  label="Full Name *"
                  placeholder="Enter your name"
                  value={name}
                  onChangeText={setName}
                  leftIcon={
                    <Ionicons name="person-outline" size={20} color={Colors.textSecondary} />
                  }
                />
                <Input
                  label="Email *"
                  placeholder="Enter your email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  leftIcon={
                    <Ionicons name="mail-outline" size={20} color={Colors.textSecondary} />
                  }
                />
                <Input
                  label="Password *"
                  placeholder="Create a password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  leftIcon={
                    <Ionicons name="lock-closed-outline" size={20} color={Colors.textSecondary} />
                  }
                  rightIcon={
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={Colors.textSecondary}
                      />
                    </TouchableOpacity>
                  }
                />
                <Input
                  label="Confirm Password *"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                  leftIcon={
                    <Ionicons name="lock-closed-outline" size={20} color={Colors.textSecondary} />
                  }
                />
                <Button
                  title="Create Account"
                  onPress={handleRegister}
                  loading={loading}
                  style={styles.button}
                />
              </View>
            </View>
          )}

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.linkText}>Sign In</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:         { flex: 1, backgroundColor: Colors.background },
  scrollContent:     { flexGrow: 1, padding: 24 },
  backButton:        { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },

  // Progress
  progressRow:       { flexDirection: 'row', alignItems: 'center', marginBottom: 32 },
  progressItem:      { flexDirection: 'row', alignItems: 'center', flex: 1 },
  progressDot:       { width: 28, height: 28, borderRadius: 14, backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' },
  progressDotActive: { backgroundColor: Colors.primary },
  progressDotDone:   { backgroundColor: Colors.primary },
  progressDotText:   { color: '#fff', fontSize: 12, fontWeight: '700' },
  progressLine:      { flex: 1, height: 2, backgroundColor: '#E5E7EB', marginHorizontal: 4 },
  progressLineDone:  { backgroundColor: Colors.primary },

  stepContainer:     { marginBottom: 24 },
  title:             { fontSize: 26, fontWeight: '700', color: Colors.text, marginBottom: 6 },
  subtitle:          { fontSize: 15, color: Colors.textSecondary, marginBottom: 24 },
  highlight:         { fontWeight: '700', color: Colors.primary },

  // Phone input
  inputLabel:        { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 8 },
  phoneRow:          { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, backgroundColor: '#fff', overflow: 'hidden' },
  countryCode:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 14, backgroundColor: '#F9FAFB', borderRightWidth: 1, borderRightColor: '#E5E7EB', gap: 6 },
  countryFlag:       { fontSize: 20 },
  countryCodeText:   { fontSize: 15, fontWeight: '600', color: Colors.text },
  phoneInput:        { flex: 1, paddingHorizontal: 14, paddingVertical: 14, fontSize: 16, color: Colors.text },
  phoneHint:         { fontSize: 12, color: Colors.textSecondary, marginTop: 6, marginBottom: 4 },

  formCard:          { backgroundColor: '#fff', borderRadius: 20, padding: 20, gap: 14, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  button:            { marginTop: 4 },

  // OTP
  otpRow:            { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 28 },
  otpBox:            { width: 60, height: 68, borderRadius: 14, borderWidth: 2, borderColor: '#E5E7EB', fontSize: 28, fontWeight: '700', textAlign: 'center', backgroundColor: '#fff' },
  otpBoxFilled:      { borderColor: Colors.primary },
  resend:            { alignItems: 'center', marginTop: 16 },
  resendText:        { color: Colors.primary, fontSize: 14, fontWeight: '600' },

  // Role
  roleContainer:     { flexDirection: 'row', gap: 10, marginBottom: 20 },
  roleCard:          { flex: 1, backgroundColor: '#fff', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 8, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', elevation: 3 },
  roleCardActive:    { borderColor: Colors.primary, elevation: 6 },
  roleLabel:         { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginTop: 6, textAlign: 'center' },
  roleLabelActive:   { color: Colors.primary },
  roleDescription:   { fontSize: 10, color: Colors.textLight, marginTop: 3, textAlign: 'center' },

  // Footer
  footer:            { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingBottom: 24, marginTop: 8 },
  footerText:        { fontSize: 14, color: Colors.textSecondary },
  linkText:          { fontSize: 14, fontWeight: '600', color: Colors.primary },
});