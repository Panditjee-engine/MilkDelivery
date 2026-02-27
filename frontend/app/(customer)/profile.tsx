import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { useAuth } from '../../src/contexts/AuthContext';
import { api } from '../../src/services/api';
import { Colors } from '../../src/constants/colors';
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
  const [editName, setEditName] = useState(user?.name || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');
  const [editAddress, setEditAddress] = useState(user?.address || { tower: '', flat: '', floor: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchData(); }, []);

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
        text: 'Logout', style: 'destructive',
        onPress: async () => { await logout(); router.replace('/'); },
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
    Alert.alert('Remove Vacation', 'Delete this vacation period?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try { await api.deleteVacation(id); fetchData(); }
          catch (e: any) { Alert.alert('Error', e.message); }
        }
      }
    ]);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await api.updateProfile({ name: editName, phone: editPhone, address: editAddress });
      updateUser({ name: editName, phone: editPhone, address: editAddress });
      Alert.alert('Success', 'Profile updated');
      setEditModal(false);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });

  const getMarkedDates = () => {
    const marks: any = {};
    if (startDate) marks[startDate] = { selected: true, startingDay: true, color: Colors.primary };
    if (endDate) marks[endDate] = { selected: true, endingDay: true, color: Colors.primary };
    if (startDate && endDate) {
      let current = new Date(startDate);
      const end = new Date(endDate);
      while (current <= end) {
        const dateStr = current.toISOString().split('T')[0];
        marks[dateStr] = { ...marks[dateStr], selected: true, color: Colors.primary, textColor: '#fff' };
        current.setDate(current.getDate() + 1);
      }
      marks[startDate] = { ...marks[startDate], startingDay: true };
      marks[endDate] = { ...marks[endDate], endingDay: true };
    }
    return marks;
  };

  const statusColor = (status: string) =>
    status === 'delivered' ? '#22c55e' : status === 'out_for_delivery' ? '#f59e0b' : '#94a3b8';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>

        <View style={styles.hero}>
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
          </View>

          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>

          {user?.phone && (
            <View style={styles.phoneBadge}>
              <Ionicons name="call-outline" size={12} color="#666" />
              <Text style={styles.phoneText}>{user.phone}</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => setEditModal(true)}
          >
            <Ionicons name="pencil" size={14} color="#fff" />
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconBox, { backgroundColor: '#EEF4FF' }]}>
              <Ionicons name="location" size={18} color="#4F7EFF" />
            </View>
            <Text style={styles.cardTitle}>Delivery Address</Text>
          </View>

          {user?.address && (user.address.tower || user.address.flat) ? (
            <View style={styles.addressBox}>
              {user.address.tower && (
                <View style={styles.addressRow}>
                  <Text style={styles.addressKey}>Tower</Text>
                  <Text style={styles.addressVal}>{user.address.tower}</Text>
                </View>
              )}
              {user.address.flat && (
                <View style={styles.addressRow}>
                  <Text style={styles.addressKey}>Flat</Text>
                  <Text style={styles.addressVal}>{user.address.flat}</Text>
                </View>
              )}
              {user.address.floor && (
                <View style={styles.addressRow}>
                  <Text style={styles.addressKey}>Floor</Text>
                  <Text style={styles.addressVal}>{user.address.floor}</Text>
                </View>
              )}
            </View>
          ) : (
            <TouchableOpacity
              style={styles.emptyAddress}
              onPress={() => setEditModal(true)}
            >
              <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
              <Text style={styles.emptyAddressText}>Add delivery address</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconBox, { backgroundColor: '#FFF4E6' }]}>
              <Ionicons name="airplane" size={18} color="#f59e0b" />
            </View>
            <Text style={styles.cardTitle}>Vacation Mode</Text>
            <TouchableOpacity
              style={styles.addIconBtn}
              onPress={() => setVacationModal(true)}
            >
              <Ionicons name="add" size={18} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.hintText}>
            Deliveries are skipped automatically on these dates.
          </Text>

          {vacations.length > 0 ? (
            <View style={styles.vacationList}>
              {vacations.map((v) => (
                <View key={v.id} style={styles.vacationChip}>
                  <Ionicons name="calendar-outline" size={13} color="#f59e0b" />
                  <Text style={styles.vacationChipText}>
                    {formatDate(v.start_date)} → {formatDate(v.end_date)}
                  </Text>
                  <TouchableOpacity onPress={() => handleDeleteVacation(v.id)}>
                    <Ionicons name="close-circle" size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>No vacations scheduled</Text>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconBox, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="receipt" size={18} color="#22c55e" />
            </View>
            <Text style={styles.cardTitle}>Recent Orders</Text>
          </View>

          {orders.length > 0 ? (
            orders.slice(0, 5).map((order, i) => (
              <View
                key={order.id}
                style={[styles.orderRow, i < Math.min(orders.length, 5) - 1 && styles.orderRowBorder]}
              >
                <View>
                  <Text style={styles.orderDate}>{formatDate(order.delivery_date)}</Text>
                  <Text style={styles.orderItems}>{order.items?.length || 0} items</Text>
                </View>
                <View style={styles.orderRight}>
                  <View style={[styles.statusPill, { backgroundColor: statusColor(order.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: statusColor(order.status) }]}>
                      {order.status?.replace(/_/g, ' ')}
                    </Text>
                  </View>
                  <Text style={styles.orderAmt}>₹{order.total_amount}</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No orders yet</Text>
          )}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>

      <Modal visible={vacationModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.dragHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Vacation</Text>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setVacationModal(false)}>
                <Ionicons name="close" size={16} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.dateTabs}>
              <TouchableOpacity
                style={[styles.dateTab, selectingStart && styles.dateTabActive]}
                onPress={() => setSelectingStart(true)}
              >
                <Text style={styles.dateTabLabel}>Start</Text>
                <Text style={[styles.dateTabValue, selectingStart && styles.dateTabValueActive]}>
                  {startDate || '—'}
                </Text>
              </TouchableOpacity>
              <Ionicons name="arrow-forward" size={16} color="#ccc" />
              <TouchableOpacity
                style={[styles.dateTab, !selectingStart && styles.dateTabActive]}
                onPress={() => setSelectingStart(false)}
              >
                <Text style={styles.dateTabLabel}>End</Text>
                <Text style={[styles.dateTabValue, !selectingStart && styles.dateTabValueActive]}>
                  {endDate || '—'}
                </Text>
              </TouchableOpacity>
            </View>

            <Calendar
              minDate={new Date().toISOString().split('T')[0]}
              markedDates={getMarkedDates()}
              markingType="period"
              onDayPress={(day: any) => {
                if (selectingStart) { setStartDate(day.dateString); setSelectingStart(false); }
                else { setEndDate(day.dateString); }
              }}
              theme={{
                todayTextColor: Colors.primary,
                selectedDayBackgroundColor: Colors.primary,
                arrowColor: Colors.primary,
              }}
            />

            <Button title="Save Vacation" onPress={handleAddVacation} style={{ marginTop: 16 }} />
          </View>
        </View>
      </Modal>

      <Modal visible={editModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.dragHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setEditModal(false)}>
                <Ionicons name="close" size={16} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Input label="Name" value={editName} onChangeText={setEditName} placeholder="Your name" />
              <Input label="Phone" value={editPhone} onChangeText={setEditPhone} placeholder="Phone number" keyboardType="phone-pad" />

              <Text style={styles.addressSectionLabel}>Delivery Address</Text>
              <Input
                label="Tower / Building"
                value={editAddress.tower || ''}
                onChangeText={(t) => setEditAddress({ ...editAddress, tower: t })}
                placeholder="Tower name or number"
              />
              <Input
                label="Flat Number"
                value={editAddress.flat || ''}
                onChangeText={(t) => setEditAddress({ ...editAddress, flat: t })}
                placeholder="Flat / Apartment number"
              />
              <Input
                label="Floor"
                value={editAddress.floor || ''}
                onChangeText={(t) => setEditAddress({ ...editAddress, floor: t })}
                placeholder="Floor number"
              />
              <Button title="Save Changes" onPress={handleSaveProfile} loading={saving} style={{ marginTop: 8, marginBottom: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F7F4' },

  hero: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 28,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  avatarRing: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 3,
    borderColor: Colors.primary + '30',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 32, fontWeight: '800', color: '#fff' },
  userName: { fontSize: 22, fontWeight: '800', color: '#1A1A1A', letterSpacing: -0.3 },
  userEmail: { fontSize: 13, color: '#aaa', marginTop: 3 },
  phoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 8,
  },
  phoneText: { fontSize: 12, color: '#666', fontWeight: '500' },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
    marginTop: 14,
  },
  editBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  cardIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', flex: 1 },
  addIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },

  addressBox: { gap: 8 },
  addressRow: { flexDirection: 'row', justifyContent: 'space-between' },
  addressKey: { fontSize: 13, color: '#aaa', fontWeight: '500' },
  addressVal: { fontSize: 13, color: '#1A1A1A', fontWeight: '600' },
  emptyAddress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  emptyAddressText: { fontSize: 14, color: Colors.primary, fontWeight: '600' },

  hintText: { fontSize: 12, color: '#bbb', marginBottom: 12, marginTop: -6 },
  vacationList: { gap: 8 },
  vacationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF9EC',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  vacationChipText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#92400e' },
  emptyText: { fontSize: 13, color: '#ccc', fontStyle: 'italic' },

  orderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  orderRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  orderDate: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  orderItems: { fontSize: 12, color: '#aaa', marginTop: 2 },
  orderRight: { alignItems: 'flex-end', gap: 4 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  orderAmt: { fontSize: 14, fontWeight: '800', color: '#1A1A1A' },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 4,
    padding: 16,
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    gap: 8,
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#ef4444' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 36,
    maxHeight: '92%',
  },
  dragHandle: {
    width: 40, height: 4, backgroundColor: '#E0E0E0',
    borderRadius: 2, alignSelf: 'center', marginBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1A1A1A' },
  closeBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center',
  },

  dateTabs: {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, marginBottom: 16,
  },
  dateTab: {
    flex: 1, backgroundColor: '#F8F8F8',
    borderRadius: 12, padding: 12,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  dateTabActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '08' },
  dateTabLabel: { fontSize: 11, color: '#aaa', fontWeight: '600', textTransform: 'uppercase' },
  dateTabValue: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginTop: 4 },
  dateTabValueActive: { color: Colors.primary },

  addressSectionLabel: {
    fontSize: 13, fontWeight: '700', color: '#999',
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginTop: 8, marginBottom: 8,
  },
});