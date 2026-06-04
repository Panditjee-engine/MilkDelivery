import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView,
  RefreshControl, Alert, TouchableOpacity, Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "../../src/contexts/AuthContext";
import { api } from "../../src/services/api";
import { Colors } from "../../src/constants/colors";
import LoadingScreen from "../../src/components/LoadingScreen";

export default function DeliveryHome() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkinStatus, setCheckinStatus] = useState<any>(null);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = async () => {
    try {
      const [status, ordersData] = await Promise.all([
        api.getCheckinStatus(),
        api.getMyOrders(),
      ]);
      setCheckinStatus(status);
      setMyOrders(ordersData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const onRefresh = useCallback(() => { setRefreshing(true); fetchData(); }, []);

  const handleToggleShift = async (value: boolean) => {
    setActionLoading(true);
    try {
      if (value) {
        await api.checkin();
        Alert.alert("✓ Shift Started", "Ready to deliver!");
      } else {
        await api.checkout();
        Alert.alert("✓ Shift Ended", "Good work today!");
      }
      await fetchData();
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <LoadingScreen />;

  const isOnDuty = checkinStatus?.checked_in && !checkinStatus?.checked_out;
  const totalDeliveries = myOrders.length;
  const completedCount = myOrders.filter(d => d.status === "delivered").length;
  const pendingCount = myOrders.filter(d => ["assigned", "picked_up", "out_for_delivery"].includes(d.status)).length;
  const failedCount = myOrders.filter(d => d.status === "failed" || d.status === "cancelled").length;

  // Get assigned deliveries to display (max 2)
  const assignedDeliveries = myOrders.filter(d => 
    ["assigned", "picked_up", "out_for_delivery"].includes(d.status)
  ).slice(0, 2);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header with Profile */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.profileImage}>
              <Ionicons name="person" size={28} color="#666" />
            </View>
            <View>
              <Text style={styles.greeting}>Hi, {user?.name || "Raju"}</Text>
              <Text style={styles.subtitle}>
                {isOnDuty ? "Ready to deliver ?" : "Start your shift to see orders"}
              </Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.notificationBtn}>
              <Ionicons name="notifications-outline" size={22} color="#1A1A1A" />
              {pendingCount > 0 && <View style={styles.notificationDot} />}
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuBtn}>
              <Ionicons name="menu" size={24} color="#1A1A1A" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Shift Toggle - Small Switch */}
        <View style={styles.shiftToggleContainer}>
          <View style={styles.shiftToggleLeft}>
            <View style={[styles.shiftDot, { backgroundColor: isOnDuty ? '#22c55e' : '#999' }]} />
            <Text style={styles.shiftToggleLabel}>
              {isOnDuty ? "On Shift" : "Off Shift"}
            </Text>
          </View>
          <Switch
            value={isOnDuty}
            onValueChange={handleToggleShift}
            disabled={actionLoading}
            trackColor={{ false: '#E5E5E5', true: Colors.primary }}
            thumbColor={isOnDuty ? '#fff' : '#f4f3f4'}
            ios_backgroundColor="#E5E5E5"
          />
        </View>

        {/* Show content only if on duty */}
        {isOnDuty ? (
          <>
            {/* Delivery Performance */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Delivery Performance</Text>
              <Text style={styles.sectionSubtitle}>Overview of today's performance</Text>

              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>Total Deliveries</Text>
                  <Text style={styles.statValue}>{totalDeliveries}</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>Completed</Text>
                  <Text style={styles.statValue}>{completedCount}</Text>
                </View>
              </View>

              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>Pending</Text>
                  <Text style={styles.statValue}>{pendingCount}</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>Failed</Text>
                  <Text style={styles.statValue}>{failedCount}</Text>
                </View>
              </View>
            </View>

            {/* Assigned Deliveries */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Assigned Deliveries</Text>
                <TouchableOpacity onPress={() => router.push("/(delivery)/deliveries")}>
                  <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
              </View>

              {assignedDeliveries.length > 0 ? (
                assignedDeliveries.map((order) => (
                  <OrderCard key={order.id || order._id} order={order} router={router} />
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="checkmark-circle-outline" size={48} color="#ddd" />
                  <Text style={styles.emptyText}>No pending deliveries</Text>
                </View>
              )}
            </View>

            {/* Subscription Deliveries */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>📦 Subscriptions</Text>
                <TouchableOpacity onPress={() => router.push("/(delivery)/subscriptions")}>
                  <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.sectionSubtitle}>Scheduled deliveries today</Text>

              <TouchableOpacity
                style={styles.subscriptionCTA}
                onPress={() => router.push("/(delivery)/subscriptions")}
              >
                <View style={styles.subscriptionCTALeft}>
                  <Ionicons name="cube-outline" size={20} color={Colors.primary} />
                  <View>
                    <Text style={styles.subscriptionCTATitle}>View Today's Subscriptions</Text>
                    <Text style={styles.subscriptionCTASubtitle}>Check scheduled deliveries</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#ddd" />
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="bicycle-outline" size={64} color="#ddd" />
            <Text style={styles.emptyTitle}>Start your shift</Text>
            <Text style={styles.emptyText}>Toggle the switch above to begin</Text>
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// Order Card Component
function OrderCard({ order, router }: { order: any; router: any }) {
  const getStatusConfig = (status: string) => {
    const configs: any = {
      assigned: { label: "Assigned", color: "#2563eb", bg: "#EFF6FF" },
      picked_up: { label: "Picked Up", color: "#7c3aed", bg: "#F5F3FF" },
      out_for_delivery: { label: "In Transit", color: "#0891b2", bg: "#ECFEFF" },
    };
    return configs[status] || { label: "Partial", color: "#f59e0b", bg: "#FFFBEB" };
  };

  const statusConfig = getStatusConfig(order.status);
  const orderNumber = (order.id || order._id)?.toString().slice(-6).toUpperCase() || "000000";
  const orderTime = order.delivery_time || "2:30 PM";

  // Parse address safely
  const deliveryAddress = order.delivery_address || {};
  const addressText = `${deliveryAddress.tower || ""}${deliveryAddress.flat ? "/" + deliveryAddress.flat : ""}${deliveryAddress.street ? ", " + deliveryAddress.street : ""}`;

  return (
    <TouchableOpacity 
      style={styles.orderCard}
      onPress={() => router.push("/(delivery)/deliveries")}
    >
      <View style={styles.orderHeader}>
        <View style={styles.orderLeft}>
          <View style={styles.orderIcon}>
            <Ionicons name="cube" size={20} color={Colors.primary} />
          </View>
          <View>
            <Text style={styles.orderNumber}>Order : #{orderNumber}</Text>
            <Text style={styles.orderTime}>{orderTime}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
          <Text style={[styles.statusText, { color: statusConfig.color }]}>
            {statusConfig.label}
          </Text>
        </View>
      </View>

      <View style={styles.orderDivider} />

      <Text style={styles.customerName}>{order.customer_name || "Customer"}</Text>
      {addressText && (
        <View style={styles.orderInfo}>
          <Ionicons name="location-outline" size={13} color="#999" />
          <Text style={styles.orderAddress}>{addressText}</Text>
        </View>
      )}
      {order.customer_phone && (
        <View style={styles.orderInfo}>
          <Ionicons name="call-outline" size={13} color="#999" />
          <Text style={styles.orderPhone}>{order.customer_phone}</Text>
        </View>
      )}

      <View style={styles.orderFooter}>
        <View style={styles.orderItems}>
          <Ionicons name="cube-outline" size={14} color="#666" />
          <Text style={styles.orderItemsText}>
            {order.items?.length || 0} items  ₹{order.total_amount || 0}
          </Text>
        </View>
        <View style={styles.actionButton}>
          <Text style={styles.actionButtonText}>
            {order.status === "assigned" ? "Start" : "View Details"}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
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
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8E8E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  notificationBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF0F0',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF4444',
  },
  menuBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },

  shiftToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  shiftToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  shiftDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  shiftToggleLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },

  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#999',
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFD700',
  },

  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
  },

  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  orderIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F5E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  orderTime: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },

  orderDivider: {
    height: 1,
    backgroundColor: '#F5F5F5',
    marginBottom: 12,
  },

  customerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  orderInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 6,
  },
  orderAddress: {
    fontSize: 12,
    color: '#666',
    flex: 1,
    lineHeight: 16,
  },
  orderPhone: {
    fontSize: 12,
    color: '#666',
  },

  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  orderItems: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  orderItemsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  actionButton: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A1A',
  },

  subscriptionCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF4E8',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE8D6',
  },
  subscriptionCTALeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  subscriptionCTATitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  subscriptionCTASubtitle: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 16,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});