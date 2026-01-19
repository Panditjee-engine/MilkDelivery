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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../../src/contexts/AuthContext';
import { Colors } from '../../src/constants/colors';
import Input from '../../src/components/Input';
import Button from '../../src/components/Button';

type Role = 'customer' | 'delivery_partner' | 'admin';

const roles = [
  {
    value: 'customer' as Role,
    label: 'Customer',
    icon: 'person',
    description: 'Order daily essentials',
  },
  {
    value: 'delivery_partner' as Role,
    label: 'Delivery Partner',
    icon: 'bicycle',
    description: 'Deliver orders',
  },
  {
    value: 'admin' as Role,
    label: 'Admin',
    icon: 'shield',
    description: 'Manage the platform',
  },
];

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<Role>('customer');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { register } = useAuth();
  const router = useRouter();

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
      await register({
        name,
        email,
        phone,
        password,
        role,
      });
      router.replace('/');
    } catch (error: any) {
      Alert.alert(
        'Registration Failed',
        error.message || 'Could not create account'
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
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join FreshMilk today</Text>
          </View>

          {/* Role Selection */}
          <View style={styles.roleSection}>
            <Text style={styles.sectionTitle}></Text>

            <View style={styles.roleContainer}>
              {roles.map((r) => {
                const isActive = role === r.value;

                return (
                  <TouchableOpacity
                    key={r.value}
                    activeOpacity={0.8}
                    style={[
                      styles.roleCard,
                      isActive && styles.roleCardActive,
                    ]}
                    onPress={() => setRole(r.value)}
                  >
                    <Ionicons
                      name={r.icon as any}
                      size={30}
                      color={
                        isActive
                          ? Colors.primary
                          : Colors.textSecondary
                      }
                    />

                    <Text
                      style={[
                        styles.roleLabel,
                        isActive && styles.roleLabelActive,
                      ]}
                    >
                      {r.label}
                    </Text>

                    <Text style={styles.roleDescription}>
                      {r.description}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.selectedRoleWrapper}>
              <Text style={styles.selectedRoleText}>
                I am a{' '}
                <Text style={styles.selectedRoleHighlight}>
                  {roles.find((r) => r.value === role)?.label}
                </Text>
              </Text>
            </View>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.formCard}>
              <Input
                label="Full Name *"
                placeholder="Enter your name"
                value={name}
                onChangeText={setName}
                leftIcon={
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color={Colors.textSecondary}
                  />
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
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color={Colors.textSecondary}
                  />
                }
              />

              <Input
                label="Phone (Optional)"
                placeholder="Enter phone number"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                leftIcon={
                  <Ionicons
                    name="call-outline"
                    size={20}
                    color={Colors.textSecondary}
                  />
                }
              />

              <Input
                label="Password *"
                placeholder="Create a password"
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
                        showPassword
                          ? 'eye-off-outline'
                          : 'eye-outline'
                      }
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
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={Colors.textSecondary}
                  />
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

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Already have an account?
            </Text>
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
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
  },

  /* Role */
  roleSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  roleContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  roleCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  roleCardActive: {
    borderColor: Colors.primary,
    // backgroundColor: Colors.primary + '10',
    elevation: 8,
  },
  roleLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  roleLabelActive: {
    color: Colors.primary,
  },
  roleDescription: {
    fontSize: 11,
    color: Colors.textLight,
    marginTop: 4,
    textAlign: 'center',
  },
  selectedRoleWrapper: {
    marginTop: 12,
    alignItems: 'center',
  },
  selectedRoleText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  selectedRoleHighlight: {
    fontWeight: '700',
    color: Colors.primary,
  },

  /* Form */
  form: {
    marginBottom: 24,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  button: {
    marginTop: 8,
  },

  /* Footer */
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 24,
  },
  footerText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
});
