import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/services/api';
import { Colors } from '../../src/constants/colors';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import Input from '../../src/components/Input';
import LoadingScreen from '../../src/components/LoadingScreen';

export default function UsersScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [filterRole, setFilterRole] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [zoneModal, setZoneModal] = useState(false);
  const [refundModal, setRefundModal] = useState(false);
  const [zone, setZone] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchData = async () => {
    try {
      const data = await api.getAllUsers(filterRole || undefined);
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterRole]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [filterRole]);

  const openZoneModal = (user: any) => {
    setSelectedUser(user);
    setZone(user.zone || '');
    setZoneModal(true);
  };

  const openRefundModal = (user: any) => {
    setSelectedUser(user);
    setRefundAmount('');
    setRefundReason('');
    setRefundModal(true);
  };

  const handleAssignZone = async () => {
    if (!zone.trim()) {
      Alert.alert('Error', 'Please enter a zone');
      return;
    }

    setUpdating(true);
    try {
      await api.assignZone(selectedUser.id, zone.trim());
      Alert.alert('Success', 'Zone assigned');
      setZoneModal(false);
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleRefund = async () => {
    const amount = parseFloat(refundAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    if (!refundReason.trim()) {
      Alert.alert('Error', 'Please enter a reason');
      return;
    }
// Proceed with refund
    setUpdating(true);
    try {
      await api.processRefund(selectedUser.id, amount, refundReason.trim());
      Alert.alert('Success', `₹${amount} refunded to ${selectedUser.name}`);
      setRefundModal(false);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  const roleFilters = ['all', 'customer', 'delivery_partner', 'admin'];
  const roleLabels: Record<string, string> = {
    all: 'All',
    customer: 'Customers',
    delivery_partner: 'Partners',
    admin: 'Admins',
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'customer': return 'person';
      case 'delivery_partner': return 'bicycle';
      case 'admin': return 'shield';
      default: return 'person';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'customer': return Colors.primary;
      case 'delivery_partner': return Colors.secondary;
      case 'admin': return Colors.accent;
      default: return Colors.textSecondary;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Users</Text>
        <Text style={styles.subtitle}>{users.length} users</Text>
      </View>

      {/* Role Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
        {roleFilters.map((role) => (
          <TouchableOpacity
            key={role}
            style={[
              styles.filterChip,
              (filterRole === role || (role === 'all' && !filterRole)) && styles.filterChipActive,
            ]}
            onPress={() => setFilterRole(role === 'all' ? null : role)}
          >
            <Text
              style={[
                styles.filterText,
                (filterRole === role || (role === 'all' && !filterRole)) && styles.filterTextActive,
              ]}
            >
              {roleLabels[role]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {users.map((user) => (
          <Card key={user.id} variant="outlined" style={styles.userCard}>
            <View style={styles.userHeader}>
              <View style={[styles.userAvatar, { backgroundColor: getRoleColor(user.role) + '20' }]}>
                <Ionicons name={getRoleIcon(user.role) as any} size={24} color={getRoleColor(user.role)} />
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user.name}</Text>
                <Text style={styles.userEmail}>{user.email}</Text>
              </View>
              <View style={[styles.roleBadge, { backgroundColor: getRoleColor(user.role) + '20' }]}>
                <Text style={[styles.roleText, { color: getRoleColor(user.role) }]}>
                  {user.role.replace('_', ' ')}
                </Text>
              </View>
            </View>

            <View style={styles.userDetails}>
              {user.phone && (
                <View style={styles.detailItem}>
                  <Ionicons name="call" size={14} color={Colors.textSecondary} />
                  <Text style={styles.detailText}>{user.phone}</Text>
                </View>
              )}
              {user.zone && (
                <View style={styles.detailItem}>
                  <Ionicons name="location" size={14} color={Colors.textSecondary} />
                  <Text style={styles.detailText}>{user.zone}</Text>
                </View>
              )}
              {user.address && (
                <View style={styles.detailItem}>
                  <Ionicons name="home" size={14} color={Colors.textSecondary} />
                  <Text style={styles.detailText}>
                    {user.address.tower && `Tower ${user.address.tower}`}
                    {user.address.flat && `, Flat ${user.address.flat}`}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.userActions}>
              {user.role === 'delivery_partner' && (
                <TouchableOpacity style={styles.actionButton} onPress={() => openZoneModal(user)}>
                  <Ionicons name="location" size={16} color={Colors.primary} />
                  <Text style={styles.actionText}>Assign Zone</Text>
                </TouchableOpacity>
              )}
              {user.role === 'customer' && (
                <TouchableOpacity style={styles.actionButton} onPress={() => openRefundModal(user)}>
                  <Ionicons name="cash" size={16} color={Colors.success} />
                  <Text style={[styles.actionText, { color: Colors.success }]}>Refund</Text>
                </TouchableOpacity>
              )}
            </View>
          </Card>
        ))}
      </ScrollView>

      {/* Zone Modal */}
      <Modal visible={zoneModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Zone</Text>
              <TouchableOpacity onPress={() => setZoneModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {selectedUser && (
              <>
                <Text style={styles.modalUserName}>{selectedUser.name}</Text>
                <Input
                  label="Zone"
                  value={zone}
                  onChangeText={setZone}
                  placeholder="e.g., Sector 15, Block A"
                />
                <Button
                  title="Save Zone"
                  onPress={handleAssignZone}
                  loading={updating}
                />
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Refund Modal */}
      <Modal visible={refundModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Process Refund</Text>
              <TouchableOpacity onPress={() => setRefundModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {selectedUser && (
              <>
                <Text style={styles.modalUserName}>{selectedUser.name}</Text>
                <Input
                  label="Amount"
                  value={refundAmount}
                  onChangeText={setRefundAmount}
                  placeholder="Enter amount"
                  keyboardType="numeric"
                />
                <Input
                  label="Reason"
                  value={refundReason}
                  onChangeText={setRefundReason}
                  placeholder="Enter reason for refund"
                  multiline
                />
                <Button
                  title="Process Refund"
                  onPress={handleRefund}
                  loading={updating}
                />
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  filters: {
    paddingHorizontal: 16,
    marginBottom: 16,
    maxHeight: 44,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surfaceSecondary,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  filterTextActive: {
    color: Colors.textInverse,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  userCard: {
    marginBottom: 12,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  userEmail: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  userDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  userActions: {
    flexDirection: 'row',
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  modalUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
});
