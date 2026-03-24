import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
  Image,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../../src/contexts/AuthContext';
import { Colors } from '../../src/constants/colors';
import Input from '../../src/components/Input';
import Button from '../../src/components/Button';

type LoginMethod = 'email' | 'phone';

export default function LoginScreen() {
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('email');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [phone, setPhone] = useState('');
  const [phonePassword, setPhonePassword] = useState('');
  const [showPhonePassword, setShowPhonePassword] = useState(false);

  const [loading, setLoading] = useState(false);

  // AuthContext must export both login AND workerLogin
  const { login, workerLogin } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    // Grab identifier + password based on active tab
    const identifier =
      loginMethod === 'email' ? email.trim() : `+91${phone}`;
    const pwd =
      loginMethod === 'email' ? password : phonePassword;

    // Basic validation
    if (loginMethod === 'email' && (!email || !password)) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (loginMethod === 'phone' && (phone.length !== 10 || !phonePassword)) {
      Alert.alert('Error', 'Enter a valid 10-digit number and password');
      return;
    }

    setLoading(true);
    try {
      // ── Step 1: Try customer/admin/rider login ──────────────────
      try {
        await login(identifier, pwd);
        router.replace('/');   // ← customer home
        return;
      } catch {
        // user login failed — silently fall through to worker attempt
      }

      // ── Step 2: Fallback — try worker login ─────────────────────
      // Worker login only accepts email, so use email directly.
      // If they logged in via phone we still need their email,
      // so for phone-mode we pass the raw phone as identifier
      // and let the backend reject with a clear message if it's
      // not a valid worker email.
      await workerLogin(identifier, pwd);
      router.replace('/(worker)' as any);   // ← worker home

    } catch (error: any) {
      // Both attempts failed
      Alert.alert(
        'Login Failed',
        error.message || 'Invalid credentials. Please check and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
                source={require('./loginassets/gauhamlogo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.title}>Welcome to Gausatv</Text>
            <Text style={styles.subtitle}>Sign in to continue</Text>
          </View>

          {/* Toggle Email / Phone — unchanged */}
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                loginMethod === 'email' && styles.toggleBtnActive,
              ]}
              onPress={() => setLoginMethod('email')}
            >
              <Ionicons
                name="mail-outline"
                size={16}
                color={loginMethod === 'email' ? '#fff' : Colors.textSecondary}
              />
              <Text
                style={[
                  styles.toggleText,
                  loginMethod === 'email' && styles.toggleTextActive,
                ]}
              >
                Email
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.toggleBtn,
                loginMethod === 'phone' && styles.toggleBtnActive,
              ]}
              onPress={() => setLoginMethod('phone')}
            >
              <Ionicons
                name="call-outline"
                size={16}
                color={loginMethod === 'phone' ? '#fff' : Colors.textSecondary}
              />
              <Text
                style={[
                  styles.toggleText,
                  loginMethod === 'phone' && styles.toggleTextActive,
                ]}
              >
                Phone
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.card}>

              {/* ── Email fields ── */}
              {loginMethod === 'email' && (
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
                          name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                          size={20}
                          color={Colors.textSecondary}
                        />
                      </TouchableOpacity>
                    }
                  />
                </>
              )}

              {/* ── Phone fields ── */}
              {loginMethod === 'phone' && (
                <>
                  <Text style={styles.inputLabel}>Mobile Number</Text>
                  <View style={styles.phoneRow}>
                    <View style={styles.countryCode}>
                      <Text style={styles.countryFlag}>🇮🇳</Text>
                      <Text style={styles.countryCodeText}>+91</Text>
                    </View>
                    <TextInput
                      style={styles.phoneInput}
                      placeholder="9999999999"
                      value={phone}
                      onChangeText={(val) =>
                        setPhone(val.replace(/\D/g, '').slice(0, 10))
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
                        onPress={() =>
                          setShowPhonePassword(!showPhonePassword)
                        }
                      >
                        <Ionicons
                          name={
                            showPhonePassword
                              ? 'eye-off-outline'
                              : 'eye-outline'
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
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account?</Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
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
  container:       { flex: 1, backgroundColor: '#F4F6FA' },
  keyboardView:    { flex: 1 },
  scrollContent:   { flexGrow: 1, padding: 24 },

  header:          { alignItems: 'center', marginTop: 40, marginBottom: 32 },
  logoCircle:      {},
  logoImage:       { width: 96, height: 96, marginBottom: 12 },
  title:           { fontSize: 28, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  subtitle:        { fontSize: 16, color: Colors.textSecondary },

  toggleContainer: { flexDirection: 'row', backgroundColor: '#E5E7EB', borderRadius: 12, padding: 4, marginBottom: 24 },
  toggleBtn:       { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, gap: 6 },
  toggleBtnActive: { backgroundColor: Colors.primary },
  toggleText:      { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  toggleTextActive:{ color: '#fff' },

  form:            { marginBottom: 24 },
  card:            { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 8 },
  button:          { marginTop: 8 },

  inputLabel:      { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 6 },
  phoneRow:        { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, backgroundColor: '#fff', overflow: 'hidden', marginBottom: 4 },
  countryCode:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 14, backgroundColor: '#F9FAFB', borderRightWidth: 1, borderRightColor: '#E5E7EB', gap: 6 },
  countryFlag:     { fontSize: 20 },
  countryCodeText: { fontSize: 15, fontWeight: '600', color: Colors.text },
  phoneInput:      { flex: 1, paddingHorizontal: 14, paddingVertical: 14, fontSize: 16, color: Colors.text },

  footer:          { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 24 },
  footerText:      { fontSize: 14, color: Colors.textSecondary },
  linkText:        { fontSize: 14, fontWeight: '600', color: Colors.primary },

  demoSection:     { padding: 16, backgroundColor: Colors.surfaceSecondary, borderRadius: 12 },
  demoTitle:       { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 8 },
  demoText:        { fontSize: 12, color: Colors.textSecondary },
});