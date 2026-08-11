import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import { api, AdminNotificationItem } from "../../src/services/api";

const C = {
  bg: "#FFF8EF",
  card: "#FFFFFF",
  text: "#3D1F0A",
  muted: "#8B6854",
  soft: "#FFE8D6",
  primary: "#FF9675",
  dark: "#BB6B3F",
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "order", label: "Orders" },
  { key: "subscription", label: "Subscriptions" },
  { key: "wallet", label: "Wallet" },
  { key: "vacation", label: "Vacations" },
] as const;

const categoryStyle: Record<
  string,
  { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string; label: string }
> = {
  order: { icon: "receipt-outline", color: "#2563EB", bg: "#EFF6FF", label: "Order" },
  subscription: {
    icon: "repeat-outline",
    color: "#16A34A",
    bg: "#ECFDF3",
    label: "Subscription",
  },
  wallet: { icon: "wallet-outline", color: "#15803D", bg: "#ECFDF3", label: "Wallet" },
  vacation: { icon: "calendar-outline", color: "#DC2626", bg: "#FEF2F2", label: "Vacation" },
  general: {
    icon: "notifications-outline",
    color: C.dark,
    bg: "#FFF3DC",
    label: "General",
  },
};

const formatTime = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function AdminNotificationScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [items, setItems] = useState<AdminNotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unread, setUnread] = useState(0);
  const [read, setRead] = useState(0);

  const fetchNotifications = useCallback(async () => {
    try {
      const result = await api.getAdminNotifications(selectedCategory, 120);
      setItems(result.data || []);
      setUnread(result.unread || 0);
      setRead(result.read || 0);
    } catch (error) {
      console.error("[AdminNotification] fetch failed:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    if (isFocused) fetchNotifications();
  }, [fetchNotifications, isFocused]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications();
  }, [fetchNotifications]);

  const markRead = async (item: AdminNotificationItem) => {
    if (item.is_read) return;
    setItems((prev) =>
      prev.map((row) => (row.id === item.id ? { ...row, is_read: true } : row)),
    );
    setUnread((value) => Math.max(value - 1, 0));
    setRead((value) => value + 1);
    try {
      await api.markAdminNotificationRead(item.id);
    } catch {
      fetchNotifications();
    }
  };

  const markAllRead = async () => {
    if (!unread) return;
    const changed = unread;
    setItems((prev) => prev.map((row) => ({ ...row, is_read: true })));
    setUnread(0);
    setRead((value) => value + changed);
    try {
      await api.markAllAdminNotificationsRead();
    } catch {
      fetchNotifications();
    }
  };

  const total = useMemo(() => unread + read, [read, unread]);

  const renderItem = ({ item }: { item: AdminNotificationItem }) => {
    const cfg = categoryStyle[item.category] || categoryStyle.general;
    return (
      <TouchableOpacity
        style={[
          styles.notificationCard,
          {
            borderLeftColor: cfg.color,
            backgroundColor: item.is_read ? "#fff" : cfg.bg,
            borderColor: item.is_read ? "#FFE8D6" : cfg.bg,
          },
          !item.is_read && [
            styles.unreadCard,
            { shadowColor: cfg.color },
          ],
        ]}
        activeOpacity={0.82}
        onPress={() => markRead(item)}
      >
        <View style={[styles.cardIcon, { backgroundColor: cfg.bg }]}>
          <Ionicons name={cfg.icon} size={19} color={cfg.color} />
        </View>
        <View style={styles.cardBody}>
          <View style={styles.cardTopRow}>
            <View style={[styles.typePill, { backgroundColor: cfg.bg }]}>
              <Text style={[styles.typePillText, { color: cfg.color }]}>
                {cfg.label}
              </Text>
            </View>
            <Text style={styles.timeText}>{formatTime(item.sent_at)}</Text>
          </View>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.cardMessage} numberOfLines={3}>
            {item.body || "No message details available."}
          </Text>
        </View>
        {!item.is_read ? <View style={styles.unreadDot} /> : null}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.subtitle}>
            Orders, subscriptions, wallet and vacation updates
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.markAllBtn, unread === 0 && styles.markAllDisabled]}
          onPress={markAllRead}
          disabled={unread === 0}
        >
          <Text style={styles.markAllText}>Read all</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{total}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: C.primary }]}>{unread}</Text>
          <Text style={styles.summaryLabel}>Unread</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: "#15803D" }]}>{read}</Text>
          <Text style={styles.summaryLabel}>Read</Text>
        </View>
      </View>

      <View>
        <FlatList
          horizontal
          data={FILTERS as any}
          keyExtractor={(item) => item.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          renderItem={({ item }) => {
            const active = selectedCategory === item.key;
            return (
              <TouchableOpacity
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => {
                  setLoading(true);
                  setSelectedCategory(item.key);
                }}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={C.primary} />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, index) => item.id || String(index)}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={C.primary}
              colors={[C.primary]}
            />
          }
          contentContainerStyle={items.length ? styles.listContent : styles.emptyContent}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="notifications-off-outline" size={42} color="#D6B99D" />
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptySub}>
                Customer actions will appear here as they happen.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: C.soft,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 20, fontWeight: "900", color: C.text },
  subtitle: { fontSize: 11, fontWeight: "700", color: C.muted, marginTop: 2 },
  markAllBtn: {
    borderRadius: 12,
    backgroundColor: C.primary,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  markAllDisabled: { opacity: 0.5 },
  markAllText: { fontSize: 11, fontWeight: "900", color: "#fff" },
  summaryRow: {
    flexDirection: "row",
    gap: 9,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: C.soft,
  },
  summaryValue: { fontSize: 19, fontWeight: "900", color: C.text },
  summaryLabel: { fontSize: 10, fontWeight: "800", color: C.muted, marginTop: 1 },
  filterRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 10 },
  filterChip: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: C.soft,
  },
  filterChipActive: { backgroundColor: "#FFE8D6", borderColor: C.primary },
  filterText: { fontSize: 11.5, fontWeight: "900", color: C.muted },
  filterTextActive: { color: C.dark },
  listContent: { paddingHorizontal: 16, paddingBottom: 28, gap: 10 },
  notificationCard: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 12,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: "#FFE8D6",
    position: "relative",
  },
  unreadCard: {
    opacity: 0.86,
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  cardIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { flex: 1 },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 5,
  },
  typePill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  typePillText: { fontSize: 9.5, fontWeight: "900" },
  timeText: { fontSize: 9.5, color: C.muted, fontWeight: "700" },
  cardTitle: { fontSize: 13.5, fontWeight: "900", color: C.text },
  cardMessage: {
    fontSize: 11.5,
    color: C.muted,
    fontWeight: "600",
    lineHeight: 16,
    marginTop: 3,
  },
  unreadDot: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.primary,
  },
  loadingBox: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  loadingText: { fontSize: 12, fontWeight: "800", color: C.muted },
  emptyContent: { flexGrow: 1, alignItems: "center", justifyContent: "center" },
  emptyBox: { alignItems: "center", paddingHorizontal: 30 },
  emptyTitle: { fontSize: 15, fontWeight: "900", color: C.text, marginTop: 12 },
  emptySub: {
    fontSize: 12,
    fontWeight: "600",
    color: C.muted,
    textAlign: "center",
    marginTop: 4,
    lineHeight: 17,
  },
});
