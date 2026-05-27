import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { Colors } from '../../src/constants/colors';
import { api } from '../../src/services/api';

export default function DeliveryProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [deleteModal, setDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout', style: 'destructive',
        onPress: async () => { await logout(); router.replace('/'); },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    setDeletePassword('');
    setDeleteModal(true);
  };

  const confirmDeleteAccount = () => {
    if (!deletePassword.trim()) {
      Alert.alert('Password Required', 'Enter your password to delete your account.');
      return;
    }
    Alert.alert(
      'Delete Account',
      'This will permanently delete your Gau Satva account and remove your personal profile data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            setDeletingAccount(true);
            try {
              await api.deleteAccount(deletePassword);
              setDeleteModal(false);
              router.replace('/(auth)/login');
            } catch (error: any) {
              Alert.alert('Delete Failed', error?.message || 'Could not delete account. Please try again.');
            } finally {
              setDeletingAccount(false);
            }
          },
        },
      ],
    );
  };

  const HelpRow = ({ icon, iconBg, iconColor, label }: {
    icon: any; iconBg: string; iconColor: string; label: string;
  }) => (
    <TouchableOpacity style={styles.helpRow}>
      <View style={[styles.helpIconBox, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={16} color={iconColor} />
      </View>
      <Text style={styles.helpLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={15} color="#ddd" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>

        <View style={styles.heroCard}>
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Ionicons name="bicycle" size={30} color="#fff" />
            </View>
          </View>

          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>

          <View style={styles.roleBadge}>
            <Ionicons name="bicycle" size={11} color="#fff" />
            <Text style={styles.roleBadgeText}>Delivery Partner</Text>
          </View>
        </View>

        <View style={styles.zoneCard}>
          <View style={styles.zoneLeft}>
            <View style={[styles.cardIconBox, { backgroundColor: '#EEF4FF' }]}>
              <Ionicons name="location" size={18} color="#4F7EFF" />
            </View>
            <View>
              <Text style={styles.zoneLabel}>Assigned Zone</Text>
              <Text style={styles.zoneValue}>{user?.zone || 'Not Assigned'}</Text>
            </View>
          </View>
          {!user?.zone && (
            <View style={styles.zonePill}>
              <Text style={styles.zonePillText}>Contact Admin</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <View style={styles.card}>
            <View style={styles.contactRow}>
              <View style={[styles.cardIconBox, { backgroundColor: '#F0FDF4' }]}>
                <Ionicons name="call-outline" size={16} color="#22c55e" />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>Phone</Text>
                <Text style={styles.contactValue}>{user?.phone || 'Not provided'}</Text>
              </View>
            </View>

            <View style={styles.rowDivider} />

            <View style={styles.contactRow}>
              <View style={[styles.cardIconBox, { backgroundColor: '#FFF4E6' }]}>
                <Ionicons name="mail-outline" size={16} color="#f59e0b" />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>Email</Text>
                <Text style={styles.contactValue}>{user?.email}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Help & Support</Text>
          <View style={styles.card}>
            <HelpRow
              icon="book-outline"
              iconBg="#EEF4FF"
              iconColor="#4F7EFF"
              label="Delivery Guidelines"
            />
            <View style={styles.rowDivider} />
            <HelpRow
              icon="headset-outline"
              iconBg="#F0FDF4"
              iconColor="#22c55e"
              label="Contact Support"
            />
            <View style={styles.rowDivider} />
            <HelpRow
              icon="help-circle-outline"
              iconBg="#FFF4E6"
              iconColor="#f59e0b"
              label="FAQs"
            />
          </View>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={19} color="#ef4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteAccountBtn} onPress={handleDeleteAccount}>
          <Ionicons name="trash-outline" size={19} color="#dc2626" />
          <Text style={styles.deleteAccountText}>Delete Account</Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>

      <Modal visible={deleteModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.deleteSheet}>
            <View style={styles.deleteIconWrap}>
              <Ionicons name="trash-outline" size={26} color="#dc2626" />
            </View>
            <Text style={styles.deleteTitle}>Delete Account</Text>
            <Text style={styles.deleteHelp}>
              Enter your password to confirm permanent account deletion.
            </Text>
            <TextInput
              style={styles.passwordInput}
              value={deletePassword}
              onChangeText={setDeletePassword}
              placeholder="Password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
            />
            <View style={styles.deleteActions}>
              <TouchableOpacity style={styles.cancelDeleteBtn} onPress={() => setDeleteModal(false)}>
                <Text style={styles.cancelDeleteText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmDeleteBtn} onPress={confirmDeleteAccount} disabled={deletingAccount}>
                {deletingAccount ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.confirmDeleteText}>Continue</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F7F4' },

  heroCard: {
    backgroundColor: Colors.primary,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    marginBottom: 14,
  },
  avatarRing: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 14,
  },
  avatar: {
    width: 66, height: 66, borderRadius: 33,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  userName: {
    fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: -0.3,
  },
  userEmail: {
    fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 3, marginBottom: 14,
  },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
  },
  roleBadgeText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  zoneCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  zoneLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  zoneLabel: { fontSize: 11, color: '#bbb', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  zoneValue: { fontSize: 16, fontWeight: '800', color: '#1A1A1A', marginTop: 2 },
  zonePill: {
    backgroundColor: '#FFF4E6', paddingHorizontal: 12,
    paddingVertical: 6, borderRadius: 20,
  },
  zonePillText: { fontSize: 11, fontWeight: '700', color: '#f59e0b' },

  section: { marginBottom: 14 },
  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: '#bbb',
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: 8, marginLeft: 20,
  },

  card: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 18,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  cardIconBox: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  rowDivider: { height: 1, backgroundColor: '#F5F5F5', marginLeft: 48 },

  contactRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, paddingVertical: 14,
  },
  contactInfo: { flex: 1 },
  contactLabel: { fontSize: 11, color: '#bbb', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  contactValue: { fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginTop: 2 },

  helpRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, paddingVertical: 13,
  },
  helpIconBox: {
    width: 34, height: 34, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  helpLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1A1A1A' },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginHorizontal: 20, padding: 16,
    backgroundColor: '#FEF2F2', borderRadius: 16, gap: 8,
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#ef4444' },
  deleteAccountBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginHorizontal: 20, marginTop: 10, padding: 16,
    backgroundColor: '#FFF7F7', borderRadius: 16, gap: 8,
    borderWidth: 1, borderColor: '#FECACA',
  },
  deleteAccountText: { fontSize: 15, fontWeight: '800', color: '#dc2626' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  deleteSheet: {
    width: '100%', backgroundColor: '#fff', borderRadius: 24,
    padding: 22, alignItems: 'center',
  },
  deleteIconWrap: {
    width: 58, height: 58, borderRadius: 20,
    backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  deleteTitle: { fontSize: 21, fontWeight: '900', color: '#111827' },
  deleteHelp: {
    fontSize: 14, color: '#6B7280', textAlign: 'center',
    lineHeight: 20, marginTop: 8, marginBottom: 16,
  },
  passwordInput: {
    width: '100%', borderWidth: 1, borderColor: '#E5E7EB',
    borderRadius: 14, padding: 14, fontSize: 15, color: '#111827',
    marginBottom: 16,
  },
  deleteActions: { flexDirection: 'row', gap: 10, width: '100%' },
  cancelDeleteBtn: {
    flex: 1, height: 48, borderRadius: 14, backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },
  cancelDeleteText: { fontSize: 15, fontWeight: '800', color: '#111827' },
  confirmDeleteBtn: {
    flex: 1, height: 48, borderRadius: 14, backgroundColor: '#dc2626',
    alignItems: 'center', justifyContent: 'center',
  },
  confirmDeleteText: { fontSize: 15, fontWeight: '900', color: '#fff' },
});
