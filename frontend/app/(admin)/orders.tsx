import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/services/api';
import { Colors } from '../../src/constants/colors';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import LoadingScreen from '../../src/components/LoadingScreen';

const statusColors: Record<string, string> = {
  pending: Colors.warning,
  assigned: Colors.info,
  out_for_delivery: Colors.primary,
  delivered: Colors.success,
  skipped: Colors.textSecondary,
  cancelled: Colors.error,
};

export default function OrdersScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [assignModal, setAssignModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [ordersData, partnersData] = await Promise.all([
        api.getAllOrders(filterStatus || undefined),
        api.getAllUsers('delivery_partner'),
      ]);
      setOrders(ordersData);
      setPartners(partnersData);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterStatus]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [filterStatus]);

  const openAssignModal = (order: any) => {
    setSelectedOrder(order);
    setAssignModal(true);
  };

  const handleAssign = async (partnerId: string) => {
    try {
      await api.assignDeliveryPartner(selectedOrder.id, partnerId);
      Alert.alert('Success', 'Delivery partner assigned');
      setAssignModal(false);
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  const statusFilters = ['all', 'pending', 'assigned', 'delivered', 'skipped'];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Orders</Text>
        <Text style={styles.subtitle}>{orders.length} orders</Text>
      </View>

      {/* Status Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
        {statusFilters.map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterChip,
              (filterStatus === status || (status === 'all' && !filterStatus)) && styles.filterChipActive,
            ]}
            onPress={() => setFilterStatus(status === 'all' ? null : status)}
          >
            <Text
              style={[
                styles.filterText,
                (filterStatus === status || (status === 'all' && !filterStatus)) && styles.filterTextActive,
              ]}
            >
              {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {orders.length > 0 ? (
          orders.map((order) => (
            <Card key={order.id} variant="outlined" style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <View style={styles.orderInfo}>
                  <Text style={styles.orderId}>#{order.id.slice(0, 8)}</Text>
                  <Text style={styles.orderDate}>{order.delivery_date}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: (statusColors[order.status] || Colors.textSecondary) + '20' }]}>
                  <Text style={[styles.statusText, { color: statusColors[order.status] || Colors.textSecondary }]}>
                    {order.status}
                  </Text>
                </View>
              </View>

              <View style={styles.orderDetails}>
                <View style={styles.detailRow}>
                  <Ionicons name="person" size={14} color={Colors.textSecondary} />
                  <Text style={styles.detailText}>User: {order.user_id.slice(0, 8)}...</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="cube" size={14} color={Colors.textSecondary} />
                  <Text style={styles.detailText}>{order.items?.length || 0} items</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="cash" size={14} color={Colors.textSecondary} />
                  <Text style={styles.detailText}>₹{order.total_amount}</Text>
                </View>
              </View>

              {order.items && (
                <View style={styles.itemsList}>
                  {order.items.slice(0, 3).map((item: any, idx: number) => (
                    <Text key={idx} style={styles.itemText}>
                      • {item.product_name} x{item.quantity}
                    </Text>
                  ))}
                  {order.items.length > 3 && (
                    <Text style={styles.moreItems}>+{order.items.length - 3} more</Text>
                  )}
                </View>
              )}

              {order.status === 'pending' && (
                <Button
                  title="Assign Partner"
                  onPress={() => openAssignModal(order)}
                  variant="outline"
                  size="small"
                  style={styles.assignButton}
                />
              )}

              {order.delivery_partner_id && (
                <View style={styles.partnerInfo}>
                  <Ionicons name="bicycle" size={14} color={Colors.secondary} />
                  <Text style={styles.partnerText}>Assigned to: {order.delivery_partner_id.slice(0, 8)}...</Text>
                </View>
              )}
            </Card>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={60} color={Colors.textLight} />
            <Text style={styles.emptyTitle}>No Orders</Text>
            <Text style={styles.emptyText}>No orders matching the selected filter</Text>
          </View>
        )}
      </ScrollView>

      {/* Assign Modal */}
      <Modal visible={assignModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Delivery Partner</Text>
              <TouchableOpacity onPress={() => setAssignModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {partners.length > 0 ? (
              <ScrollView style={styles.partnersList}>
                {partners.map((partner) => (
                  <TouchableOpacity
                    key={partner.id}
                    style={styles.partnerCard}
                    onPress={() => handleAssign(partner.id)}
                  >
                    <View style={styles.partnerAvatar}>
                      <Ionicons name="person" size={20} color={Colors.secondary} />
                    </View>
                    <View style={styles.partnerDetails}>
                      <Text style={styles.partnerName}>{partner.name}</Text>
                      <Text style={styles.partnerZone}>{partner.zone || 'No zone assigned'}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.noPartners}>No delivery partners available</Text>
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
  orderCard: {
    marginBottom: 12,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderInfo: {},
  orderId: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  orderDate: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  orderDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  itemsList: {
    backgroundColor: Colors.surfaceSecondary,
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  itemText: {
    fontSize: 12,
    color: Colors.text,
    marginBottom: 2,
  },
  moreItems: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  assignButton: {
    alignSelf: 'flex-start',
  },
  partnerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  partnerText: {
    fontSize: 12,
    color: Colors.secondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
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
    maxHeight: '70%',
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
  partnersList: {
    maxHeight: 400,
  },
  partnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: Colors.surfaceSecondary,
    marginBottom: 8,
  },
  partnerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.secondary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  partnerDetails: {
    flex: 1,
  },
  partnerName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  partnerZone: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  noPartners: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    paddingVertical: 20,
  },
});
