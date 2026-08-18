import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl, Modal, TextInput, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from '../../src/contexts/AuthContext';
import { api } from '../../src/services/api';
import LoadingScreen from '../../src/components/LoadingScreen';
import { formatDeliveryAddress } from '../../src/utils/address';
import { APP_VERSION } from "../../src/services/useVersionCheck";

const C = {
  primary: "#FF9675",
  accent: "#FD9E69",
  light: "#FFD999",
  dark: "#BB6B3F",
  bg: "#FFF8EF",
  card: "#FFFFFF",
  text: "#3D1F0A",
  textMuted: "#A07850",
  textLight: "#C9A882",
  border: "#F5E6D0",
};

const RIDER_TIPS_URL = 'https://gausatv.com/rider-tips';
const FAQ_URL = 'https://gausatv.com/faq';

export default function DeliveryProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [adminDetails, setAdminDetails] = useState<any>(null);

  // Edit modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
  });

  useEffect(() => {
    fetchAllData();
  }, []);

 const fetchAllData = async () => {
  try {
    const [profile, orders] = await Promise.all([
      api.getMe(),
      api.getMyOrders(),
    ]);
    setProfileData(profile);
    setMyOrders(orders || []);

    try {
  const admin = await api.getAssignedAdmin();
  setAdminDetails(admin);
} catch (err: any) {
  setAdminDetails(null);
}
  } catch (error) {
    console.error('Error fetching data:', error);
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
};

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllData();
  };

  const handleOpenEditModal = () => {
    const currentUser = profileData || user;
    setEditForm({
      name: currentUser?.name || '',
      email: currentUser?.email || '',
      phone: currentUser?.phone || '',
    });
    setEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    if (!editForm.name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }

    setEditLoading(true);
    try {
      await api.updateProfile(editForm);
      Alert.alert('Success', 'Profile updated successfully');
      setEditModalVisible(false);
      await fetchAllData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setEditLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/');
        },
      },
    ]);
  };

  const openExternalLink = (url: string) => {
    Linking.openURL(url).catch(() =>
      Alert.alert('Error', 'Unable to open this link right now.'),
    );
  };

  const handleContactAdmin = () => {
    if (adminDetails?.phone) {
      Linking.openURL(`tel:${adminDetails.phone}`).catch(() =>
        Alert.alert('Error', 'Unable to place the call.'),
      );
    } else {
      Alert.alert('Contact Support', 'Admin phone number is not available yet.');
    }
  };

  const formatAdminAddress = (address: any): string => {
    if (!address) return 'Not provided';
    if (typeof address === 'string') return address;
    const parts = [
      address.line1,
      address.line2,
      address.city,
      address.state,
      address.pincode,
    ].filter(Boolean);
    return parts.length ? parts.join(', ') : 'Not provided';
  };

  if (loading) return <LoadingScreen />;

  const displayUser = profileData || user;
  const savedAddresses = Array.isArray(displayUser?.addresses) ? displayUser.addresses : [];
  const defaultAddress =
    savedAddresses.find((address: any) => address?.is_default) ||
    savedAddresses[0] ||
    displayUser?.address ||
    null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
      >
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.profileImage}>
              <Ionicons name="person" size={32} color={C.dark} />
            </View>
            <View>
              <Text style={styles.userName}>{displayUser?.name || 'Delivery Partner'}</Text>
              <Text style={styles.userSubtitle}>Delivery Partner</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.editButton} onPress={handleOpenEditModal}>
            <Ionicons name="pencil-outline" size={20} color={C.primary} />
          </TouchableOpacity>
        </View>

        {/* Assigned Zone */}
        <View style={styles.zoneCardWrap}>
          <View style={styles.zoneCard}>
            <View style={styles.zoneIconBox}>
              <Ionicons name="location-outline" size={24} color={C.primary} />
            </View>
            <View style={styles.zoneTextWrap}>
              <Text style={styles.zoneLabel}>Assigned Zone</Text>
              <Text style={styles.zoneValue}>{displayUser?.zone || 'Not assigned'}</Text>
            </View>
          </View>
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="call-outline" size={18} color={C.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Phone</Text>
                <Text style={styles.infoValue}>{displayUser?.phone || 'Not provided'}</Text>
              </View>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="mail-outline" size={18} color={C.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{displayUser?.email}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Address Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Address</Text>
          <TouchableOpacity
            style={styles.addressButtonCard}
            activeOpacity={0.88}
            onPress={() => router.push('/address-book' as any)}
          >
            <View style={styles.addressButtonIcon}>
              <Ionicons name="location" size={22} color={C.primary} />
            </View>
            <View style={styles.addressButtonContent}>
              <View style={styles.addressButtonTop}>
                <Text style={styles.addressButtonTitle}>Manage Address</Text>
                <View style={styles.addressButtonPill}>
                  <Text style={styles.addressButtonPillText}>
                    {savedAddresses.length ? `${savedAddresses.length} Saved` : 'Add New'}
                  </Text>
                </View>
              </View>
              <Text style={styles.addressButtonText} numberOfLines={2}>
                {defaultAddress
                  ? formatDeliveryAddress(defaultAddress)
                  : 'Add, edit, update or delete your delivery address'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={C.primary} />
          </TouchableOpacity>
        </View>

        {/* Your Gaushala / Admin Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Gaushala</Text>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <MaterialCommunityIcons name="home-city-outline" size={18} color={C.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Gaushala / Admin Name</Text>
                <Text style={styles.infoValue}>
                  {adminDetails?.business_name || adminDetails?.name || 'Not available'}
                </Text>
              </View>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="call-outline" size={18} color={C.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Admin Phone</Text>
                <Text style={styles.infoValue}>{adminDetails?.phone || 'Not provided'}</Text>
              </View>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="mail-outline" size={18} color={C.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Admin Email</Text>
                <Text style={styles.infoValue}>{adminDetails?.email || 'Not provided'}</Text>
              </View>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="location-outline" size={18} color={C.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Admin Address</Text>
                <Text style={styles.infoValue}>
                  {formatAdminAddress(adminDetails?.address)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Help & Support */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Help & Support</Text>

          <View style={styles.infoCard}>
            <TouchableOpacity style={styles.infoRow} onPress={() => openExternalLink(RIDER_TIPS_URL)}>
              <View style={styles.infoIcon}>
                <Ionicons name="book-outline" size={18} color={C.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Delivery Guidelines</Text>
                <Text style={styles.infoValue}>Tips & best practices</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={C.textLight} />
            </TouchableOpacity>

            <View style={styles.infoDivider} />

            <TouchableOpacity style={styles.infoRow} onPress={handleContactAdmin}>
              <View style={styles.infoIcon}>
                <Ionicons name="headset-outline" size={18} color={C.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Contact Support</Text>
                <Text style={styles.infoValue}>Get help anytime</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={C.textLight} />
            </TouchableOpacity>

            <View style={styles.infoDivider} />

            <TouchableOpacity style={styles.infoRow} onPress={() => openExternalLink(FAQ_URL)}>
              <View style={styles.infoIcon}>
                <Ionicons name="help-circle-outline" size={18} color={C.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>FAQs</Text>
                <Text style={styles.infoValue}>Common questions</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={C.textLight} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Version */}
        <View style={styles.versionStrip}>
          <MaterialCommunityIcons name="cow" size={14} color={C.dark} />
          <Text style={styles.versionTxt}>GauSatva Version-{APP_VERSION}</Text>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#B3261E" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setEditModalVisible(false)}
              >
                <Ionicons name="close" size={24} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {/* Name Field */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Full Name</Text>
                <View style={styles.formInputContainer}>
                  <Ionicons name="person-outline" size={18} color={C.textMuted} />
                  <TextInput
                    style={styles.formInput}
                    placeholder="Enter your name"
                    value={editForm.name}
                    onChangeText={(text) => setEditForm({ ...editForm, name: text })}
                    placeholderTextColor={C.textLight}
                  />
                </View>
              </View>

              {/* Email Field */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Email Address</Text>
                <View style={styles.formInputContainer}>
                  <Ionicons name="mail-outline" size={18} color={C.textMuted} />
                  <TextInput
                    style={styles.formInput}
                    placeholder="Enter your email"
                    value={editForm.email}
                    onChangeText={(text) => setEditForm({ ...editForm, email: text })}
                    placeholderTextColor={C.textLight}
                    editable={false}
                  />
                </View>
              </View>

              {/* Phone Field */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Phone Number</Text>
                <View style={styles.formInputContainer}>
                  <Ionicons name="call-outline" size={18} color={C.textMuted} />
                  <TextInput
                    style={styles.formInput}
                    placeholder="Enter your phone"
                    value={editForm.phone}
                    onChangeText={(text) => setEditForm({ ...editForm, phone: text })}
                    placeholderTextColor={C.textLight}
                  />
                </View>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveProfile}
                disabled={editLoading}
              >
                <Text style={styles.saveButtonText}>
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  profileImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
    marginBottom: 2,
  },
  userSubtitle: {
    fontSize: 12,
    color: C.textMuted,
    fontWeight: '500',
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.light,
    justifyContent: 'center',
    alignItems: 'center',
  },

  zoneCardWrap: {
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 24,
  },
  zoneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: C.dark,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  zoneIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: C.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoneTextWrap: {
    flex: 1,
  },
  zoneLabel: {
    fontSize: 12,
    color: C.textMuted,
    fontWeight: '500',
    marginBottom: 2,
  },
  zoneValue: {
    fontSize: 17,
    fontWeight: '700',
    color: C.text,
  },

  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: C.text,
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionSubtext: {
    fontSize: 12,
    color: C.textMuted,
    fontWeight: '500',
  },

  infoCard: {
    backgroundColor: C.card,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: C.dark,
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: C.bg,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: C.textMuted,
    fontWeight: '500',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
  },
  infoDivider: {
    height: 1,
    backgroundColor: C.border,
  },
  addressButtonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: C.dark,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  addressButtonIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: C.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressButtonContent: {
    flex: 1,
  },
  addressButtonTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 5,
  },
  addressButtonTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: C.text,
  },
  addressButtonPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: C.light,
  },
  addressButtonPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: C.dark,
  },
  addressButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.textMuted,
    lineHeight: 17,
  },

  // Version
  versionStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    marginBottom: 4,
  },
  versionTxt: { fontSize: 12, fontWeight: "600", color: C.dark },

  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FDEDEA',
    borderRadius: 12,
    gap: 10,
    marginTop: 8,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#B3261E',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(61, 31, 10, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: C.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.text,
  },
  modalClose: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: C.text,
    marginBottom: 8,
  },
  formInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.bg,
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  formInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    fontSize: 14,
    color: C.text,
  },

  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: C.textMuted,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: C.primary,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});