import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { Colors } from '../../src/constants/colors';

export default function DeliveryProfileScreen() {
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

        <View style={{ height: 30 }} />
      </ScrollView>
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
});