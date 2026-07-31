import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { api } from '../../src/services/api';
import { Colors } from '../../src/constants/colors';
import LoadingScreen from '../../src/components/LoadingScreen';
import { formatDeliveryAddress } from '../../src/utils/address';

export default function DeliveryProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  
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

  if (loading) return <LoadingScreen />;

  const displayUser = profileData || user;
  const completedOrders = myOrders.filter((o) => o.status === 'delivered');
  const totalCompleted = completedOrders.length;
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.profileImage}>
              <Ionicons name="person" size={32} color="#666" />
            </View>
            <View>
              <Text style={styles.userName}>{displayUser?.name || 'Delivery Partner'}</Text>
              <Text style={styles.userSubtitle}>Delivery Partner</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.editButton} onPress={handleOpenEditModal}>
            <Ionicons name="pencil-outline" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Profile Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statIconBox}>
              <Ionicons name="checkmark-circle-outline" size={24} color="#22c55e" />
            </View>
            <Text style={styles.statLabel}>Completed</Text>
            <Text style={styles.statValue}>{totalCompleted}</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statIconBox}>
              <Ionicons name="star-outline" size={24} color="#FFD700" />
            </View>
            <Text style={styles.statLabel}>Rating</Text>
            <Text style={styles.statValue}>4.8</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statIconBox}>
              <Ionicons name="location-outline" size={24} color="#2563eb" />
            </View>
            <Text style={styles.statLabel}>Zone</Text>
            <Text style={styles.statValue}>{displayUser?.zone || '-'}</Text>
          </View>
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: '#F0FDF4' }]}>
                <Ionicons name="call-outline" size={18} color="#22c55e" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Phone</Text>
                <Text style={styles.infoValue}>{displayUser?.phone || 'Not provided'}</Text>
              </View>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: '#FFF4E6' }]}>
                <Ionicons name="mail-outline" size={18} color="#f59e0b" />
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
              <Ionicons name="location" size={22} color={Colors.primary} />
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
            <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Recent Completed Orders */}
        {completedOrders.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Recent Deliveries</Text>
              <Text style={styles.sectionSubtext}>{completedOrders.length} completed</Text>
            </View>

            <View style={styles.ordersContainer}>
              {completedOrders.slice(0, 3).map((order) => (
                <View key={order.id || order._id} style={styles.orderItem}>
                  <View style={styles.orderItemLeft}>
                    <View style={styles.orderIcon}>
                      <Ionicons name="checkmark-done" size={16} color="#22c55e" />
                    </View>
                    <View style={styles.orderInfo}>
                      <Text style={styles.orderCustomer}>
                        {order.customer_name || 'Customer'}
                      </Text>
                      <Text style={styles.orderTime}>
                        ₹{order.total_amount || 0}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.orderStatus}>
                    <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
                  </View>
                </View>
              ))}
            </View>

            {completedOrders.length > 3 && (
              <TouchableOpacity
                style={styles.viewAllOrders}
                onPress={() => router.push('/(delivery)/deliveries')}
              >
                <Text style={styles.viewAllOrdersText}>View All {completedOrders.length} Deliveries</Text>
                <Ionicons name="arrow-forward" size={16} color={Colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Additional Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Information</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: '#EEF4FF' }]}>
                <Ionicons name="bicycle-outline" size={18} color="#2563eb" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Status</Text>
                <Text style={styles.infoValue}>Active</Text>
              </View>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: '#F5F3FF' }]}>
                <Ionicons name="calendar-outline" size={18} color="#7c3aed" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Joined</Text>
                <Text style={styles.infoValue}>January 2024</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Help & Support */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Help & Support</Text>
          
          <View style={styles.infoCard}>
            <TouchableOpacity style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: '#EEF4FF' }]}>
                <Ionicons name="book-outline" size={18} color="#2563eb" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Delivery Guidelines</Text>
                <Text style={styles.infoValue}>Tips & best practices</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#ddd" />
            </TouchableOpacity>

            <View style={styles.infoDivider} />

            <TouchableOpacity style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: '#F0FDF4' }]}>
                <Ionicons name="headset-outline" size={18} color="#22c55e" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Contact Support</Text>
                <Text style={styles.infoValue}>Get help anytime</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#ddd" />
            </TouchableOpacity>

            <View style={styles.infoDivider} />

            <TouchableOpacity style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: '#FFF4E6' }]}>
                <Ionicons name="help-circle-outline" size={18} color="#f59e0b" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>FAQs</Text>
                <Text style={styles.infoValue}>Common questions</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#ddd" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
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
                <Ionicons name="close" size={24} color="#999" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {/* Name Field */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Full Name</Text>
                <View style={styles.formInputContainer}>
                  <Ionicons name="person-outline" size={18} color="#999" />
                  <TextInput
                    style={styles.formInput}
                    placeholder="Enter your name"
                    value={editForm.name}
                    onChangeText={(text) => setEditForm({ ...editForm, name: text })}
                    placeholderTextColor="#ccc"
                  />
                </View>
              </View>

              {/* Email Field */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Email Address</Text>
                <View style={styles.formInputContainer}>
                  <Ionicons name="mail-outline" size={18} color="#999" />
                  <TextInput
                    style={styles.formInput}
                    placeholder="Enter your email"
                    value={editForm.email}
                    onChangeText={(text) => setEditForm({ ...editForm, email: text })}
                    placeholderTextColor="#ccc"
                    editable={false}
                  />
                </View>
              </View>

              {/* Phone Field */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Phone Number</Text>
                <View style={styles.formInputContainer}>
                  <Ionicons name="call-outline" size={18} color="#999" />
                  <TextInput
                    style={styles.formInput}
                    placeholder="Enter your phone"
                    value={editForm.phone}
                    onChangeText={(text) => setEditForm({ ...editForm, phone: text })}
                    placeholderTextColor="#ccc"
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
    backgroundColor: '#F8F9FA',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
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
    backgroundColor: '#E8E8E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  userSubtitle: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF4E8',
    justifyContent: 'center',
    alignItems: 'center',
  },

  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 11,
    color: '#999',
    fontWeight: '500',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },

  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
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
    color: '#999',
    fontWeight: '500',
  },

  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
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
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#F5F5F5',
  },
  addressButtonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DDEFE3',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  addressButtonIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#EEF8F1',
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
    color: '#1A1A1A',
  },
  addressButtonPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#ECFDF5',
  },
  addressButtonPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.primary,
  },
  addressButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    lineHeight: 17,
  },

  ordersContainer: {
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  orderItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  orderIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderInfo: {
    flex: 1,
  },
  orderCustomer: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  orderTime: {
    fontSize: 12,
    color: '#999',
  },
  orderStatus: {
    marginLeft: 8,
  },

  viewAllOrders: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 10,
  },
  viewAllOrdersText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },

  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    gap: 10,
    marginTop: 8,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ef4444',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
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
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
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
    color: '#1A1A1A',
    marginBottom: 8,
  },
  formInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  formInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    fontSize: 14,
    color: '#1A1A1A',
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
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#666',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#FFD700',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
});
