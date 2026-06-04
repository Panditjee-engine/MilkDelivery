import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { api } from "../../src/services/api";

interface Transaction {
  id: string;
  amount: number;
  type: "credit" | "debit";
  description: string;
  balance_after: number;
  created_at: string;
}

interface Order {
  id: string;
  _id?: string;
  customer_name: string;
  delivery_address: any;
  customer_phone: string;
  items: any[];
  total_amount: number;
  status: string;
  delivery_date: string;
  delivery_time?: string;
  created_at: string;
}

function formatDate(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

function calculateWorkingHours(checkinTime: string, checkoutTime?: string): number {
  if (!checkinTime) return 0;
  const start = new Date(checkinTime);
  const end = checkoutTime ? new Date(checkoutTime) : new Date();
  const diffMs = end.getTime() - start.getTime();
  return Math.max(0, diffMs / (1000 * 60 * 60)); // Convert to hours
}

export default function RiderWalletScreen() {
  const router = useRouter();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [checkinStatus, setCheckinStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [walletRes, txRes, ordersRes, statusRes] = await Promise.all([
        api.getWallet(),
        api.getWalletTransactions(),
        api.getMyOrders(),
        api.getCheckinStatus(),
      ]);
      setBalance(walletRes?.balance ?? 0);
      setTransactions(txRes ?? []);
      setOrders(ordersRes ?? []);
      setCheckinStatus(statusRes);
    } catch (e) {
      console.log("wallet fetch error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAll();
  };
  
  const todayStr = new Date().toISOString().split("T")[0];
  
  // Calculate today's earnings from transactions
  const todayTx = transactions.filter(
    (t) => t.type === "credit" && t.created_at?.startsWith(todayStr)
  );
  const todayEarnings = todayTx.reduce((s, t) => s + t.amount, 0);
  
  // Get today's delivered orders
  const todayDeliveredOrders = orders.filter(d => 
    d.status === "delivered" && d.delivery_date === todayStr
  );
  const todayDeliveries = todayDeliveredOrders.length;
  
  // Calculate working hours from shift data
  const todayHours = checkinStatus?.checkin_time 
    ? calculateWorkingHours(checkinStatus.checkin_time, checkinStatus.checkout_time)
    : 0;
  
  // Total earnings breakdown from transactions
  const allCreditTx = transactions.filter(t => t.type === "credit");
  const deliveryFee = allCreditTx.reduce((sum, t) => 
    t.description?.toLowerCase().includes("delivery") ? sum + t.amount : sum, 0
  );
  const tips = allCreditTx.reduce((sum, t) => 
    t.description?.toLowerCase().includes("tip") ? sum + t.amount : sum, 0
  );
  const bonus = allCreditTx.reduce((sum, t) => 
    t.description?.toLowerCase().includes("bonus") ? sum + t.amount : sum, 0
  );
  const fuelMaintenance = allCreditTx.reduce((sum, t) => 
    t.description?.toLowerCase().includes("fuel") || t.description?.toLowerCase().includes("maintenance") 
      ? sum + t.amount : sum, 0
  );
  
  // Calculate totals from orders
  const totalOrders = orders.filter(o => o.status === "delivered").length;
  const totalHours = todayHours; // Show today's hours for now
  
  // Calculate total distance (avg 3.5km per delivery)
  const totalDistance = totalOrders * 3.5;
  
  // Get recent delivered orders (last 5)
  const recentDeliveries = orders
    .filter(o => o.status === "delivered")
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  if (loading)
    return (
      <View style={s.loadingWrap}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={s.loadingText}>Loading earnings…</Text>
      </View>
    );

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FFD700"
          />
        }
      >
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Earnings</Text>
          <TouchableOpacity style={s.syncBtn} onPress={onRefresh}>
            <Ionicons name="sync-outline" size={22} color="#333" />
          </TouchableOpacity>
        </View>

        {/* Today's Earnings Card */}
        <View style={s.todayCard}>
          <View style={s.todayHeader}>
            <Text style={s.todayLabel}>Today's Earnings</Text>
            <View style={s.walletIcon}>
              <Ionicons name="wallet" size={20} color="#1A1A1A" />
            </View>
          </View>
          <Text style={s.todayAmount}>₹{todayEarnings.toFixed(0)}</Text>
          <Text style={s.todaySubtitle}>{todayDeliveries} Deliveries completed</Text>
        </View>

        {/* Today Stats */}
        <View style={s.todayStats}>
          <View style={s.todayStatCard}>
            <View style={s.todayStatIcon}>
              <Ionicons name="time-outline" size={20} color="#666" />
            </View>
            <Text style={s.todayStatLabel}>Today</Text>
            <Text style={s.todayStatValue}>{todayHours.toFixed(1)}</Text>
            <Text style={s.todayStatUnit}>Hours</Text>
          </View>
          
          <View style={s.todayStatCard}>
            <View style={s.todayStatIcon}>
              <Ionicons name="bicycle-outline" size={20} color="#666" />
            </View>
            <Text style={s.todayStatLabel}>Today</Text>
            <Text style={s.todayStatValue}>{todayDeliveries}</Text>
            <Text style={s.todayStatUnit}>Deliveries</Text>
          </View>
        </View>

        {/* Total Earnings Section */}
        <View style={s.totalEarningsCard}>
          <View style={s.totalHeader}>
            <Text style={s.totalLabel}>Total Earnings</Text>
            <Text style={s.totalAmount}>₹{balance.toFixed(0)}</Text>
          </View>
          
          <View style={s.totalStats}>
            <View style={s.totalStatItem}>
              <Text style={s.totalStatLabel}>Orders</Text>
              <Text style={s.totalStatValue}>{totalOrders}</Text>
            </View>
            <View style={s.totalStatItem}>
              <Text style={s.totalStatLabel}>Hours</Text>
              <Text style={s.totalStatValue}>{totalHours.toFixed(0)}h</Text>
            </View>
            <View style={s.totalStatItem}>
              <Text style={s.totalStatLabel}>Distance</Text>
              <Text style={s.totalStatValue}>{totalDistance.toFixed(0)} km</Text>
            </View>
          </View>
        </View>

        {/* Earnings Breakdown */}
        <View style={s.breakdownCard}>
          <EarningsRow 
            icon="cash-outline"
            label="Delivery Fee"
            amount={deliveryFee}
          />
          <EarningsRow 
            icon="gift-outline"
            label="Tips"
            amount={tips}
          />
          <EarningsRow 
            icon="star-outline"
            label="Bonus"
            amount={bonus}
          />
          <EarningsRow 
            icon="speedometer-outline"
            label="Fuel & Maintenance"
            amount={fuelMaintenance}
          />
        </View>

        {/* Recent Deliveries */}
        <View style={s.recentSection}>
          <View style={s.recentHeader}>
            <Text style={s.recentTitle}>Recent Deliveries</Text>
            <TouchableOpacity onPress={() => router.push("/(delivery)/deliveries")}>
              <Text style={s.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          
          {recentDeliveries.length > 0 ? (
            recentDeliveries.map((order) => (
              <DeliveryItem key={order.id || order._id} order={order} />
            ))
          ) : (
            <View style={s.emptyState}>
              <Ionicons name="bicycle-outline" size={48} color="#ddd" />
              <Text style={s.emptyText}>No deliveries yet</Text>
            </View>
          )}
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// Earnings Row Component
function EarningsRow({ icon, label, amount }: { icon: string; label: string; amount: number }) {
  return (
    <View style={s.earningsRow}>
      <View style={s.earningsLeft}>
        <View style={s.earningsIconBox}>
          <Ionicons name={icon as any} size={18} color="#FFD700" />
        </View>
        <Text style={s.earningsLabel}>{label}</Text>
      </View>
      <Text style={s.earningsAmount}>₹{amount.toFixed(0)}</Text>
    </View>
  );
}

// Delivery Item Component
function DeliveryItem({ order }: { order: Order }) {
  const orderNumber = (order.id || order._id)?.toString().slice(-6).toUpperCase() || "000000";
  const deliveryAddress = order.delivery_address || {};
  const addressText = `${deliveryAddress.tower || ""}${deliveryAddress.flat ? "/" + deliveryAddress.flat : ""}`.slice(0, 20);
  
  return (
    <View style={s.deliveryItem}>
      <View style={s.deliveryLeft}>
        <View style={s.deliveryIcon}>
          <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
        </View>
        <View style={{flex: 1}}>
          <Text style={s.deliveryOrderNum}>Order #{orderNumber}</Text>
          <Text style={s.deliveryCustomer}>{order.customer_name}</Text>
          {addressText && <Text style={s.deliveryAddress}>{addressText}</Text>}
        </View>
      </View>
      <View style={s.deliveryRight}>
        <Text style={s.deliveryAmount}>₹{order.total_amount.toFixed(0)}</Text>
        <Text style={s.deliveryDate}>{formatDate(order.created_at)}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#999',
    fontWeight: '600',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  syncBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },

  todayCard: {
    backgroundColor: '#FFD700',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  todayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  todayLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  walletIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  todayAmount: {
    fontSize: 36,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  todaySubtitle: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },

  todayStats: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  todayStatCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    alignItems: 'center',
  },
  todayStatIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  todayStatLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 4,
    fontWeight: '500',
  },
  todayStatValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  todayStatUnit: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },

  totalEarningsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  totalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  totalStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  totalStatItem: {
    alignItems: 'center',
  },
  totalStatLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
    fontWeight: '500',
  },
  totalStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },

  breakdownCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  earningsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  earningsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  earningsIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF8E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  earningsLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  earningsAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },

  recentSection: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFD700',
  },

  deliveryItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  deliveryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  deliveryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deliveryOrderNum: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  deliveryCustomer: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 2,
  },
  deliveryAddress: {
    fontSize: 11,
    color: '#999',
  },
  deliveryRight: {
    alignItems: 'flex-end',
  },
  deliveryAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4CAF50',
    marginBottom: 2,
  },
  deliveryDate: {
    fontSize: 11,
    color: '#999',
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 12,
  },
});
