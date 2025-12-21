import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { useAuth } from '../../src/contexts/AuthContext';
import { api } from '../../src/services/api';
import { Colors } from '../../src/constants/colors';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import Input from '../../src/components/Input';

export default function ProfileScreen() {
  const { user, logout, updateUser } = useAuth();
  const router = useRouter();
  const [vacations, setVacations] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [vacationModal, setVacationModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectingStart, setSelectingStart] = useState(true);
  
  // Edit profile state
  const [editName, setEditName] = useState(user?.name || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');
  const [editAddress, setEditAddress] = useState(user?.address || { tower: '', flat: '', floor: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [vacData, ordersData] = await Promise.all([
        api.getVacations(),
        api.getOrders(),
      ]);
      setVacations(vacData);
      setOrders(ordersData);
    } catch (error) {
      console.error('Error fetching data:', error);
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

  const handleAddVacation = async () => {
    if (!startDate || !endDate) {
      Alert.alert('Error', 'Please select both start and end dates');
      return;
    }

    if (startDate > endDate) {
      Alert.alert('Error', 'End date must be after start date');
      return;
    }

    try {
      await api.createVacation(startDate, endDate);
      Alert.alert('Success', 'Vacation added! Deliveries will be skipped.');
      setVacationModal(false);
      setStartDate('');
      setEndDate('');
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleDeleteVacation = async (id: string) => {
    try {
      await api.deleteVacation(id);
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await api.updateProfile({
        name: editName,
        phone: editPhone,
        address: editAddress,
      });
      updateUser({ name: editName, phone: editPhone, address: editAddress });
      Alert.alert('Success', 'Profile updated');
      setEditModal(false);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };

  const getMarkedDates = () => {
    const marks: any = {};
    const today = new Date().toISOString().split('T')[0];
    
    if (startDate) {
      marks[startDate] = { selected: true, startingDay: true, color: Colors.primary };
    }
    if (endDate) {
      marks[endDate] = { selected: true, endingDay: true, color: Colors.primary };
    }
    if (startDate && endDate) {
      let current = new Date(startDate);
      const end = new Date(endDate);
      while (current <= end) {
        const dateStr = current.toISOString().split('T')[0];
        marks[dateStr] = {
          ...marks[dateStr],
          selected: true,
          color: Colors.primary,
          textColor: Colors.textInverse,
        };
        current.setDate(current.getDate() + 1);
      }
      marks[startDate] = { ...marks[startDate], startingDay: true };
      marks[endDate] = { ...marks[endDate], endingDay: true };
    }

    return marks;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase() || 'U'}</Text>
          </View>
          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <TouchableOpacity style={styles.editButton} onPress={() => setEditModal(true)}>
            <Ionicons name="pencil" size={16} color={Colors.primary} />
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Address */}
        <Card variant="outlined" style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location" size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Delivery Address</Text>
          </View>
          {user?.address ? (
            <Text style={styles.addressText}>
              {user.address.tower && `Tower: ${user.address.tower}, `}
              {user.address.flat && `Flat: ${user.address.flat}, `}
              {user.address.floor && `Floor: ${user.address.floor}`}
            </Text>
          ) : (
            <Text style={styles.addressText}>No address set. Tap Edit Profile to add.</Text>
          )}
        </Card>

        {/* Vacation Mode */}
        <Card variant="outlined" style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="airplane" size={20} color={Colors.secondary} />
            <Text style={styles.sectionTitle}>Vacation Mode</Text>
            <TouchableOpacity style={styles.addButton} onPress={() => setVacationModal(true)}>
              <Ionicons name="add" size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.vacationHint}>Mark dates when you'll be away. Deliveries will be skipped automatically.</Text>
          {vacations.length > 0 ? (
            vacations.map((v) => (
              <View key={v.id} style={styles.vacationItem}>
                <Ionicons name="calendar" size={16} color={Colors.textSecondary} />
                <Text style={styles.vacationDate}>
                  {formatDate(v.start_date)} - {formatDate(v.end_date)}
                </Text>
                <TouchableOpacity onPress={() => handleDeleteVacation(v.id)}>
                  <Ionicons name="trash" size={18} color={Colors.error} />
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <Text style={styles.noVacation}>No vacations scheduled</Text>
          )}
        </Card>

        {/* Recent Orders */}
        <Card variant="outlined" style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="receipt" size={20} color={Colors.accent} />
            <Text style={styles.sectionTitle}>Recent Orders</Text>
          </View>
          {orders.length > 0 ? (
            orders.slice(0, 5).map((order) => (
              <View key={order.id} style={styles.orderItem}>
                <View style={styles.orderInfo}>
                  <Text style={styles.orderDate}>{formatDate(order.delivery_date)}</Text>
                  <Text style={styles.orderItems}>
                    {order.items?.length || 0} items
                  </Text>
                </View>
                <View style={styles.orderStatus}>
                  <Text style={[
                    styles.orderStatusText,
                    { color: order.status === 'delivered' ? Colors.success : Colors.accent }
                  ]}>
                    {order.status}
                  </Text>
                  <Text style={styles.orderAmount}>₹{order.total_amount}</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.noOrders}>No orders yet</Text>
          )}
        </Card>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out" size={20} color={Colors.error} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Vacation Modal */}
      <Modal visible={vacationModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Vacation</Text>
              <TouchableOpacity onPress={() => setVacationModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.dateSelector}>
              <TouchableOpacity
                style={[styles.dateTab, selectingStart && styles.dateTabActive]}
                onPress={() => setSelectingStart(true)}
              >
                <Text style={[styles.dateTabLabel, selectingStart && styles.dateTabLabelActive]}>Start Date</Text>
                <Text style={styles.dateTabValue}>{startDate || 'Select'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dateTab, !selectingStart && styles.dateTabActive]}
                onPress={() => setSelectingStart(false)}
              >
                <Text style={[styles.dateTabLabel, !selectingStart && styles.dateTabLabelActive]}>End Date</Text>
                <Text style={styles.dateTabValue}>{endDate || 'Select'}</Text>
              </TouchableOpacity>
            </View>

            <Calendar
              minDate={new Date().toISOString().split('T')[0]}
              markedDates={getMarkedDates()}
              markingType="period"
              onDayPress={(day: any) => {
                if (selectingStart) {
                  setStartDate(day.dateString);
                  setSelectingStart(false);
                } else {
                  setEndDate(day.dateString);
                }
              }}
              theme={{
                todayTextColor: Colors.primary,
                selectedDayBackgroundColor: Colors.primary,
                arrowColor: Colors.primary,
              }}
            />

            <Button title="Save Vacation" onPress={handleAddVacation} style={styles.saveButton} />
          </View>
        </View>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal visible={editModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Input label="Name" value={editName} onChangeText={setEditName} placeholder="Your name" />
              <Input label="Phone" value={editPhone} onChangeText={setEditPhone} placeholder="Phone number" keyboardType="phone-pad" />
              
              <Text style={styles.addressTitle}>Delivery Address</Text>
              <Input
                label="Tower/Building"
                value={editAddress.tower || ''}
                onChangeText={(text) => setEditAddress({ ...editAddress, tower: text })}
                placeholder="Tower name/number"
              />
              <Input
                label="Flat Number"
                value={editAddress.flat || ''}
                onChangeText={(text) => setEditAddress({ ...editAddress, flat: text })}
                placeholder="Flat/Apartment number"
              />
              <Input
                label="Floor"
                value={editAddress.floor || ''}
                onChangeText={(text) => setEditAddress({ ...editAddress, floor: text })}
                placeholder="Floor number"
              />

              <Button title="Save Changes" onPress={handleSaveProfile} loading={saving} style={styles.saveButton} />
            </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 32,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.textInverse,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
  },
  userEmail: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  section: {
    margin: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primaryLight + '30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  vacationHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  vacationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 8,
  },
  vacationDate: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
  },
  noVacation: {
    fontSize: 14,
    color: Colors.textLight,
    fontStyle: 'italic',
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  orderInfo: {},
  orderDate: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  orderItems: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  orderStatus: {
    alignItems: 'flex-end',
  },
  orderStatusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  orderAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 2,
  },
  noOrders: {
    fontSize: 14,
    color: Colors.textLight,
    fontStyle: 'italic',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 16,
    padding: 16,
    backgroundColor: Colors.error + '15',
    borderRadius: 12,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.error,
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
    maxHeight: '90%',
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
  dateSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  dateTab: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  dateTabActive: {
    borderColor: Colors.primary,
  },
  dateTabLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  dateTabLabelActive: {
    color: Colors.primary,
  },
  dateTabValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 4,
  },
  saveButton: {
    marginTop: 16,
  },
  addressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 8,
    marginBottom: 12,
  },
});
