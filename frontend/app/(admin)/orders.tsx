import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../src/services/api";
import { Colors } from "../../src/constants/colors";
import LoadingScreen from "../../src/components/LoadingScreen";

type OrderStatus = "UNASSIGNED" | "ASSIGNED" | "DELIVERED";

interface Order {
  id: string;
  status: OrderStatus;
  admin_otp?: string;
  delivery_date?: string;
  delivery_slot?: string;
  customer_name?: string;
  customer_phone?: string;
  total_amount?: number;
  items: { product_name: string; quantity?: number }[];
  address?: { tower?: string; flat?: string; area?: string };
  delivery_partner_name?: string;
  delivery_partner_phone?: string;
}

const FILTERS = ["ALL", "PENDING", "DELIVERED"] as const;

const statusConfig: Record<string, { color: string; bg: string; icon: any; label: string }> = {
  delivered:  { color: "#16a34a", bg: "#F0FDF4", icon: "checkmark-circle", label: "Delivered" },
  assigned:   { color: "#2563eb", bg: "#EFF6FF", icon: "bicycle",          label: "Assigned"  },
  unassigned: { color: "#d97706", bg: "#FFFBEB", icon: "time",             label: "Unassigned"},
  picked_up:  { color: "#7c3aed", bg: "#F5F3FF", icon: "cube",             label: "Picked Up" },
  out_for_delivery: { color: "#0891b2", bg: "#ECFEFF", icon: "navigate",   label: "On the Way"},
};

export default function AdminOrdersScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "DELIVERED">("ALL");

  const fetchOrders = async () => {
    try {
      const status =
        filter === "ALL" ? undefined
        : filter === "DELIVERED" ? "DELIVERED"
        : "ASSIGNED";
      const data = await api.getAllOrders(status);
      setOrders(data);
    } catch (e) {
      console.error("Error loading orders", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchOrders(); }, [filter]);

  const onRefresh = useCallback(() => { setRefreshing(true); fetchOrders(); }, [filter]);

  if (loading) return <LoadingScreen />;

  const renderOrder = ({ item }: { item: Order }) => {
    const sc = statusConfig[item.status] ?? statusConfig["UNASSIGNED"];

    return (
      <View style={styles.card}>

        <View style={styles.cardHeader}>
          <View style={styles.orderIdRow}>
            <View style={styles.receiptIcon}>
              <Ionicons name="receipt-outline" size={14} color={Colors.primary} />
            </View>
            <Text style={styles.orderId}>#{item.id.slice(-6).toUpperCase()}</Text>
          </View>

          <View style={[styles.statusPill, { backgroundColor: sc.bg }]}>
            <Ionicons name={sc.icon} size={11} color={sc.color} />
            <Text style={[styles.statusText, { color: sc.color }]}>{sc.label}</Text>
          </View>
        </View>

        {(item.delivery_date || item.delivery_slot) && (
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={12} color="#aaa" />
            <Text style={styles.dateText}>
              {item.delivery_date}  {item.delivery_slot && `· ${item.delivery_slot}`}
            </Text>
          </View>
        )}

        <View style={styles.divider} />

        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={styles.colLabel}>CUSTOMER</Text>
            <Text style={styles.colName}>{item.customer_name ?? "Unknown"}</Text>
            {item.customer_phone && (
              <View style={styles.phoneRow}>
                <Ionicons name="call-outline" size={11} color="#aaa" />
                <Text style={styles.phoneText}>{item.customer_phone}</Text>
              </View>
            )}
          </View>

          <View style={styles.colDivider} />

          <View style={styles.col}>
            <Text style={styles.colLabel}>RIDER</Text>
            {item.delivery_partner_name ? (
              <>
                <Text style={styles.colName}>{item.delivery_partner_name}</Text>
                {item.delivery_partner_phone && (
                  <View style={styles.phoneRow}>
                    <Ionicons name="call-outline" size={11} color="#aaa" />
                    <Text style={styles.phoneText}>{item.delivery_partner_phone}</Text>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.unassignedRow}>
                <Ionicons name="time-outline" size={13} color="#f59e0b" />
                <Text style={styles.unassignedText}>Not assigned</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.divider} />

        <Text style={styles.colLabel}>ITEMS</Text>
        <View style={styles.itemsList}>
          {item.items?.map((p, i) => (
            <View key={i} style={styles.itemRow}>
              <View style={styles.itemDot} />
              <Text style={styles.itemName}>{p.product_name}</Text>
              {p.quantity && (
                <Text style={styles.itemQty}>×{p.quantity}</Text>
              )}
            </View>
          ))}
        </View>

        <View style={styles.divider} />

        <View style={styles.footer}>
          <View style={styles.otpBox}>
            <Text style={styles.otpLabel}>OTP</Text>
            <Text style={styles.otpValue}>{item.admin_otp ?? "----"}</Text>
          </View>

          {item.total_amount !== undefined && (
            <View style={styles.amountBox}>
              <Text style={styles.amountLabel}>Total</Text>
              <Text style={styles.amountValue}>₹{item.total_amount}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>

      <View style={styles.header}>
        <Text style={styles.title}>Orders</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{orders.length}</Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={48} color="#ddd" />
            <Text style={styles.emptyTitle}>No orders found</Text>
            <Text style={styles.emptyDesc}>Try changing the filter</Text>
          </View>
        }
        renderItem={renderOrder}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F7F4' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
    gap: 10,
  },
  title: { fontSize: 26, fontWeight: '800', color: '#1A1A1A', letterSpacing: -0.5 },
  countBadge: {
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  countText: { fontSize: 13, fontWeight: '800', color: Colors.primary },

  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 14,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: Colors.primary + '12',
    borderColor: Colors.primary,
  },
  filterText: { fontSize: 13, fontWeight: '600', color: '#aaa' },
  filterTextActive: { color: Colors.primary },

  list: { paddingHorizontal: 16, paddingBottom: 30 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderIdRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  receiptIcon: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center', alignItems: 'center',
  },
  orderId: { fontSize: 15, fontWeight: '800', color: '#1A1A1A' },

  statusPill: {
    flexDirection: 'row', alignItems: 'center',
    gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  statusText: { fontSize: 11, fontWeight: '700' },

  dateRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 5, marginBottom: 4,
  },
  dateText: { fontSize: 12, color: '#aaa', fontWeight: '500' },

  divider: { height: 1, backgroundColor: '#F5F5F5', marginVertical: 14 },

  twoCol: { flexDirection: 'row' },
  col: { flex: 1 },
  colDivider: { width: 1, backgroundColor: '#F5F5F5', marginHorizontal: 14 },
  colLabel: {
    fontSize: 10, fontWeight: '700', color: '#bbb',
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6,
  },
  colName: { fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  phoneText: { fontSize: 12, color: '#aaa', fontWeight: '500' },
  unassignedRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  unassignedText: { fontSize: 13, color: '#f59e0b', fontWeight: '600' },

  itemsList: { gap: 6, marginTop: 8 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary },
  itemName: { flex: 1, fontSize: 13, fontWeight: '500', color: '#333' },
  itemQty: { fontSize: 12, color: '#aaa', fontWeight: '600' },

  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  otpBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
  },
  otpLabel: { fontSize: 9, color: '#d97706', fontWeight: '700', letterSpacing: 1 },
  otpValue: { fontSize: 20, fontWeight: '800', color: '#d97706', letterSpacing: 3 },

  amountBox: { alignItems: 'flex-end' },
  amountLabel: { fontSize: 10, color: '#aaa', fontWeight: '600' },
  amountValue: { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },

  emptyState: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#ccc' },
  emptyDesc: { fontSize: 13, color: '#ddd' },
});