import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../src/constants/colors";
import { api } from "../../src/services/api";

const statusMeta = (status?: string) => {
  switch (status) {
    case "delivered":
      return { label: "Delivered", icon: "checkmark-circle", color: "#16a34a", bg: "#F0FDF4", border: "#BBF7D0" };
    case "out_for_delivery":
      return { label: "Out for Delivery", icon: "bicycle", color: "#d97706", bg: "#FFFBEB", border: "#FDE68A" };
    case "cancelled":
      return { label: "Cancelled", icon: "close-circle", color: "#dc2626", bg: "#FEF2F2", border: "#FECACA" };
    default:
      return { label: status?.replace(/_/g, " ") || "Pending", icon: "time", color: "#6366f1", bg: "#EEF2FF", border: "#C7D2FE" };
  }
};

function formatDate(value?: string) {
  if (!value) return "Not scheduled";
  return new Date(value).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function OrderNotificationsScreen() {
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadLatestOrder = useCallback(async () => {
    try {
      const orders = await api.getOrders();
      setOrder(Array.isArray(orders) ? orders[0] || null : null);
    } catch {
      setOrder(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadLatestOrder();
  }, [loadLatestOrder]);

  const onRefresh = () => {
    setRefreshing(true);
    loadLatestOrder();
  };

  const meta = statusMeta(order?.status);
  const items = order?.items ?? [];

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Notifications</Text>
          <Text style={s.subtitle}>Latest order status and updates</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <View style={s.loadingWrap}>
            <ActivityIndicator color={Colors.primary} />
            <Text style={s.loadingText}>Loading latest order...</Text>
          </View>
        ) : !order ? (
          <View style={s.emptyCard}>
            <Ionicons name="notifications-off-outline" size={34} color="#9CA3AF" />
            <Text style={s.emptyTitle}>No order updates yet</Text>
            <Text style={s.emptySub}>Your latest order status will appear here.</Text>
          </View>
        ) : (
          <>
            <View style={s.statusCard}>
              <View style={[s.statusIcon, { backgroundColor: meta.bg, borderColor: meta.border }]}>
                <Ionicons name={meta.icon as any} size={28} color={meta.color} />
              </View>
              <Text style={s.statusTitle}>{meta.label}</Text>
              <Text style={s.statusSub}>
                Order #{String(order.id || order._id || "").slice(-6) || "Latest"}
              </Text>
              <View style={[s.statusPill, { backgroundColor: meta.bg, borderColor: meta.border }]}>
                <Text style={[s.statusPillText, { color: meta.color }]}>{meta.label}</Text>
              </View>
            </View>

            <View style={s.infoGrid}>
              <View style={s.infoCard}>
                <Text style={s.infoLabel}>Delivery Date</Text>
                <Text style={s.infoValue}>{formatDate(order.delivery_date)}</Text>
              </View>
              <View style={s.infoCard}>
                <Text style={s.infoLabel}>Total Amount</Text>
                <Text style={s.infoValue}>₹{order.total_amount ?? 0}</Text>
              </View>
            </View>

            <View style={s.card}>
              <Text style={s.cardTitle}>Items</Text>
              {items.length ? (
                items.map((item: any, index: number) => (
                  <View key={`${item.product_id || item.product_name}-${index}`} style={s.itemRow}>
                    <View style={s.itemIcon}>
                      <Ionicons name="cube-outline" size={16} color={Colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.itemName}>{item.product_name || "Product"}</Text>
                      <Text style={s.itemQty}>Qty {item.quantity ?? 1}</Text>
                    </View>
                    <Text style={s.itemPrice}>₹{item.total ?? item.price ?? 0}</Text>
                  </View>
                ))
              ) : (
                <Text style={s.noItems}>No item details available.</Text>
              )}
            </View>

            <View style={s.card}>
              <Text style={s.cardTitle}>What this means</Text>
              <Text style={s.message}>
                We will keep this page updated with the latest delivery status, delivery date, amount and item details for your most recent order.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F4F6" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F7",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 22, fontWeight: "900", color: "#111827" },
  subtitle: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  content: { padding: 20, gap: 14, paddingBottom: 36 },
  loadingWrap: { alignItems: "center", paddingVertical: 60, gap: 10 },
  loadingText: { fontSize: 13, color: "#6B7280", fontWeight: "700" },
  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EEF2F7",
  },
  emptyTitle: { fontSize: 17, fontWeight: "900", color: "#111827", marginTop: 12 },
  emptySub: { fontSize: 13, color: "#6B7280", textAlign: "center", marginTop: 5 },
  statusCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 22,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EEF2F7",
  },
  statusIcon: {
    width: 66,
    height: 66,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  statusTitle: { fontSize: 21, fontWeight: "900", color: "#111827", textTransform: "capitalize" },
  statusSub: { fontSize: 13, color: "#6B7280", marginTop: 4, fontWeight: "700" },
  statusPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 14,
  },
  statusPillText: { fontSize: 12, fontWeight: "900", textTransform: "capitalize" },
  infoGrid: { flexDirection: "row", gap: 12 },
  infoCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 15,
    borderWidth: 1,
    borderColor: "#EEF2F7",
  },
  infoLabel: { fontSize: 11, color: "#9CA3AF", fontWeight: "800", textTransform: "uppercase" },
  infoValue: { fontSize: 15, color: "#111827", fontWeight: "900", marginTop: 7 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EEF2F7",
  },
  cardTitle: { fontSize: 16, fontWeight: "900", color: "#111827", marginBottom: 12 },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
  itemIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: Colors.primary + "14",
    alignItems: "center",
    justifyContent: "center",
  },
  itemName: { fontSize: 14, fontWeight: "800", color: "#111827" },
  itemQty: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  itemPrice: { fontSize: 14, fontWeight: "900", color: Colors.primary },
  noItems: { fontSize: 13, color: "#6B7280", fontWeight: "600" },
  message: { fontSize: 13.5, color: "#4B5563", lineHeight: 20, fontWeight: "600" },
});
