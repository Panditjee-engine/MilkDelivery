import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { Colors } from '../../src/constants/colors';

export default function AdminSettingsScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout', style: 'destructive',
        onPress: async () => { await logout(); router.replace('/'); },
      },
    ]);
  };

  const SettingRow = ({
    icon, iconBg, iconColor, label, value
  }: {
    icon: any; iconBg: string; iconColor: string; label: string; value: string;
  }) => (
    <TouchableOpacity style={styles.settingRow}>
      <View style={[styles.settingIconBox, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={17} color={iconColor} />
      </View>
      <View style={styles.settingInfo}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.settingValue}>{value}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#ddd" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Ionicons name="shield-checkmark" size={28} color="#fff" />
            </View>
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
          </View>

          <View style={styles.adminBadge}>
            <Ionicons name="shield-checkmark" size={11} color={Colors.primary} />
            <Text style={styles.adminBadgeText}>Administrator</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>System Configuration</Text>
          </View>

          <View style={styles.card}>
            <SettingRow
              icon="time-outline"
              iconBg="#EEF4FF"
              iconColor="#4F7EFF"
              label="Order Cut-off Time"
              value="10:00 PM"
            />
            <View style={styles.rowDivider} />
            <SettingRow
              icon="bicycle-outline"
              iconBg="#F0FDF4"
              iconColor="#22c55e"
              label="Delivery Window"
              value="5:00 AM – 7:00 AM"
            />
            <View style={styles.rowDivider} />
            <SettingRow
              icon="wallet-outline"
              iconBg="#FFF4E6"
              iconColor="#f59e0b"
              label="Grace Period"
              value="1 day negative balance"
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Business Information</Text>
          </View>

          <View style={styles.card}>
            <SettingRow
              icon="storefront-outline"
              iconBg="#F5F3FF"
              iconColor="#7c3aed"
              label="Business Name"
              value="GauSatva"
            />
            <View style={styles.rowDivider} />
            <SettingRow
              icon="call-outline"
              iconBg="#ECFEFF"
              iconColor="#0891b2"
              label="Support Contact"
              value="+91 9999999999"
            />
          </View>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={19} color="#ef4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F7F4' },

  header: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: -0.5,
  },

  profileCard: {
    backgroundColor: Colors.primary,
    marginHorizontal: 20,
    borderRadius: 22,
    padding: 22,
    marginBottom: 22,
    alignItems: 'center',
    shadowColor: Colors.primary,
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
    borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: { alignItems: 'center', marginBottom: 12 },
  profileName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.3,
  },
  profileEmail: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 3,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  adminBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },

  section: { marginBottom: 16 },
  sectionHeader: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#bbb',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  card: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 18,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },

  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  settingIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingInfo: { flex: 1 },
  settingLabel: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  settingValue: { fontSize: 12, color: '#aaa', marginTop: 2, fontWeight: '500' },
  rowDivider: { height: 1, backgroundColor: '#F5F5F5', marginLeft: 48 },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 8,
    padding: 16,
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    gap: 8,
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#ef4444' },
});