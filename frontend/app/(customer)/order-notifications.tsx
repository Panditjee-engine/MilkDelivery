import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../src/constants/colors";
import { api } from "../../src/services/api";
import { Calendar } from "react-native-calendars";

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

const dateKey = (value?: string) => {
  if (!value) return "";
  const match = value.match(/^\d{4}-\d{2}-\d{2}/);
  if (match) return match[0];
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const patternLabel = (pattern?: string) =>
  ({
    daily: "Every day",
    alternate: "Alternate days",
    custom: "Custom days",
    buy_once: "One-time order",
  })[pattern || ""] || pattern?.replace(/_/g, " ") || "Normal order";

export default function OrderNotificationsScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [order, setOrder] = useState<any>(null);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadLatestOrder = useCallback(async () => {
    try {
      const [orders, subscriptionData] = await Promise.all([
        api.getOrders(),
        api.getSubscriptions(),
      ]);
      const list = Array.isArray(orders) ? orders : [];
      setOrders(list);
      setOrder(list[0] || null);
      setSubscriptions(Array.isArray(subscriptionData) ? subscriptionData : []);
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
  const selectedOrders = orders.filter((item) => dateKey(item.delivery_date || item.created_at) === selectedDate);
  const displayedQuantity = (dayOrder: any, item: any) => {
    const subscription = subscriptions.find(
      (sub) =>
        sub.id === dayOrder.subscription_id ||
        sub.id === item?.subscription_id ||
        sub.product_id === item?.product_id ||
        sub.product?.id === item?.product_id ||
        sub.product?.name === item?.product_name,
    );
    return item?.quantity ?? subscription?.quantity ?? 1;
  };
  const markedDates = orders.reduce<Record<string, any>>((marked, item) => {
    const key = dateKey(item.delivery_date || item.created_at);
    if (key) {
      marked[key] = {
        marked: true,
        dotColor: Colors.primary,
        customStyles: {
          container: { backgroundColor: Colors.primary + "18", borderWidth: 1, borderColor: Colors.primary + "55" },
          text: { color: Colors.primary, fontWeight: "900" },
        },
      };
    }
    return marked;
  }, {});
  if (selectedDate) {
    markedDates[selectedDate] = {
      ...(markedDates[selectedDate] || {}),
      customStyles: {
        container: { backgroundColor: Colors.primary, borderRadius: 10, elevation: 3 },
        text: { color: "#fff", fontWeight: "900" },
      },
    };
  }

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
        <TouchableOpacity style={s.calendarBtn} onPress={() => setCalendarVisible(true)}>
          <Ionicons name="calendar-outline" size={21} color={Colors.primary} />
          {orders.length > 0 && <View style={s.calendarDot} />}
        </TouchableOpacity>
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
              <View style={s.patternPill}>
                <Ionicons name={order.pattern === "buy_once" ? "bag-handle-outline" : "repeat"} size={13} color="#b45309" />
                <Text style={s.patternText}>{patternLabel(order.pattern)}</Text>
              </View>
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
            {order.pattern && order.pattern !== "buy_once" && (
              <TouchableOpacity
                style={s.manageSubscriptionBtn}
                onPress={() => router.push("/(customer)/subscriptions")}
              >
                <Ionicons name="calendar-outline" size={17} color="#fff" />
                <Text style={s.manageSubscriptionText}>Modify subscription by date</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>

      <Modal visible={calendarVisible} transparent animationType="slide" onRequestClose={() => setCalendarVisible(false)}>
        <View style={s.modalOverlay}>
          <View style={s.calendarSheet}>
            <View style={s.sheetHeader}>
              <View>
                <Text style={s.sheetTitle}>Order Calendar</Text>
                <Text style={s.sheetSubtitle}>Tap a highlighted date to see orders</Text>
              </View>
              <TouchableOpacity style={s.closeBtn} onPress={() => setCalendarVisible(false)}>
                <Ionicons name="close" size={20} color="#111827" />
              </TouchableOpacity>
            </View>
            <Calendar
              markingType="custom"
              markedDates={markedDates}
              onDayPress={(day) => setSelectedDate(day.dateString)}
              theme={{
                todayTextColor: Colors.primary,
                arrowColor: Colors.primary,
                selectedDayBackgroundColor: Colors.primary,
                dotColor: Colors.primary,
              }}
            />
            <ScrollView style={s.dayOrders} showsVerticalScrollIndicator={false}>
              {!selectedDate ? (
                <Text style={s.calendarHint}>Highlighted dates have scheduled or completed orders.</Text>
              ) : selectedOrders.length === 0 ? (
                <View style={s.noDayOrder}>
                  <Ionicons name="calendar-clear-outline" size={28} color="#9CA3AF" />
                  <Text style={s.noDayOrderText}>No orders on {formatDate(selectedDate)}</Text>
                </View>
              ) : (
                <>
                  <Text style={s.selectedDateTitle}>{formatDate(selectedDate)}</Text>
                  {selectedOrders.map((dayOrder, orderIndex) => {
                    const dayMeta = statusMeta(dayOrder.status);
                    return (
                      <View key={dayOrder.id || orderIndex} style={s.dayOrderCard}>
                        <View style={s.dayOrderTop}>
                          <Text style={s.dayOrderName}>Order #{String(dayOrder.id || dayOrder._id || "").slice(-6)}</Text>
                          <Text style={[s.dayOrderStatus, { color: dayMeta.color }]}>{dayMeta.label}</Text>
                        </View>
                        <View style={s.dayPattern}>
                          <Ionicons name={dayOrder.pattern === "buy_once" ? "bag-handle-outline" : "repeat"} size={12} color="#b45309" />
                          <Text style={s.dayPatternText}>{patternLabel(dayOrder.pattern)}</Text>
                        </View>
                        {(dayOrder.items || []).map((item: any, index: number) => (
                          <View key={`${item.product_id || item.product_name}-${index}`} style={s.dayItemRow}>
                            <Text style={s.dayItemName}>{item.product_name || "Product"}</Text>
                            <Text style={s.dayItemQty}>×{displayedQuantity(dayOrder, item)}</Text>
                            <Text style={s.dayItemPrice}>₹{item.total ?? item.price ?? 0}</Text>
                          </View>
                        ))}
                      </View>
                    );
                  })}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  calendarBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.primary + "12", alignItems: "center", justifyContent: "center" },
  calendarDot: { position: "absolute", right: 9, top: 8, width: 7, height: 7, borderRadius: 4, backgroundColor: "#f59e0b", borderWidth: 1, borderColor: "#fff" },
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
  patternPill: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#FFFBEB", borderColor: "#FBBF24", borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, marginTop: 12 },
  patternText: { fontSize: 12, fontWeight: "900", color: "#b45309", textTransform: "capitalize" },
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
  manageSubscriptionBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, backgroundColor: Colors.primary, borderRadius: 17, paddingVertical: 14 },
  manageSubscriptionText: { color: "#fff", fontSize: 13, fontWeight: "900" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(17,24,39,0.45)", justifyContent: "flex-end" },
  calendarSheet: { backgroundColor: "#F8FAFC", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 18, paddingHorizontal: 16, paddingBottom: 24, maxHeight: "92%" },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4, marginBottom: 10 },
  sheetTitle: { fontSize: 20, fontWeight: "900", color: "#111827" },
  sheetSubtitle: { fontSize: 12, color: "#6B7280", marginTop: 3 },
  closeBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#E5E7EB", alignItems: "center", justifyContent: "center" },
  dayOrders: { marginTop: 12, maxHeight: 280 },
  calendarHint: { padding: 18, textAlign: "center", color: "#6B7280", fontWeight: "600" },
  noDayOrder: { alignItems: "center", padding: 22, gap: 8 },
  noDayOrderText: { color: "#6B7280", fontWeight: "700" },
  selectedDateTitle: { fontSize: 15, fontWeight: "900", color: "#111827", marginBottom: 10 },
  dayOrderCard: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 18, padding: 14, marginBottom: 10 },
  dayOrderTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  dayOrderName: { fontSize: 14, fontWeight: "900", color: "#111827" },
  dayOrderStatus: { fontSize: 11, fontWeight: "900", textTransform: "capitalize" },
  dayPattern: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 5, backgroundColor: "#FFFBEB", borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4, marginTop: 8, marginBottom: 6 },
  dayPatternText: { fontSize: 10, fontWeight: "900", color: "#b45309", textTransform: "capitalize" },
  dayItemRow: { flexDirection: "row", alignItems: "center", paddingTop: 8, borderTopWidth: 1, borderTopColor: "#F3F4F6", marginTop: 5 },
  dayItemName: { flex: 1, fontSize: 13, fontWeight: "700", color: "#374151" },
  dayItemQty: { fontSize: 12, color: "#6B7280", marginRight: 12 },
  dayItemPrice: { fontSize: 13, fontWeight: "900", color: Colors.primary },
});
