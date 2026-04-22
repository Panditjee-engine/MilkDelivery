import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  LayoutAnimation,
  UIManager,
  Platform,
  Modal,
  Animated,
  ActivityIndicator,
} from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../src/services/api";
import LoadingScreen from "../../src/components/LoadingScreen";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type OrderStatus =
  | "UNASSIGNED"
  | "ASSIGNED"
  | "DELIVERED"
  | "CANCELLED"
  | "cancelled"
  | "delivered"
  | "assigned"
  | "unassigned";

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

// Cancel Confirm Modal
interface CancelModalProps {
  visible: boolean;
  order: Order | null;
  onConfirm: () => void;
  onDismiss: () => void;
  loading: boolean;
}

function CancelModal({
  visible,
  order,
  onConfirm,
  onDismiss,
  loading,
}: CancelModalProps) {
  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 220,
          friction: 13,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.88);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  if (!order) return null;

  const itemSummary = order.items
    ?.map((i) =>
      i.quantity ? `${i.product_name} ×${i.quantity}` : i.product_name,
    )
    .join(", ");

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <Animated.View style={[cm.overlay, { opacity: opacityAnim }]}>
        <Animated.View
          style={[cm.sheet, { transform: [{ scale: scaleAnim }] }]}
        >
          {/* Icon */}
          <View style={cm.iconCircle}>
            <Ionicons name="close-circle" size={34} color="#FF5C5C" />
          </View>

          {/* Title */}
          <Text style={cm.title}>Cancel Order?</Text>
          <Text style={cm.subtitle}>This action cannot be undone.</Text>

          {/* Order preview card */}
          <View style={cm.previewCard}>
            <View style={cm.previewRow}>
              <View style={cm.receiptIcon}>
                <Ionicons name="receipt-outline" size={13} color="#FF9675" />
              </View>
              <Text style={cm.previewOrderId}>
                #{order.id.slice(-6).toUpperCase()}
              </Text>
              {order.total_amount !== undefined && (
                <Text style={cm.previewAmount}>₹{order.total_amount}</Text>
              )}
            </View>
            {order.customer_name && (
              <View style={cm.previewDetail}>
                <Ionicons name="person-outline" size={11} color="#8B6854" />
                <Text style={cm.previewDetailText}>{order.customer_name}</Text>
              </View>
            )}
            {itemSummary && (
              <View style={cm.previewDetail}>
                <Ionicons name="bag-outline" size={11} color="#8B6854" />
                <Text style={cm.previewDetailText} numberOfLines={1}>
                  {itemSummary}
                </Text>
              </View>
            )}
          </View>

          {/* Buttons */}
          <View style={cm.btnRow}>
            <TouchableOpacity
              style={cm.btnCancel}
              onPress={onDismiss}
              disabled={loading}
              activeOpacity={0.75}
            >
              <Text style={cm.btnCancelText}>Keep Order</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[cm.btnConfirm, loading && { opacity: 0.6 }]}
              onPress={onConfirm}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={15} color="#fff" />
                  <Text style={cm.btnConfirmText}>Yes, Cancel</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const cm = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  sheet: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#fff",
    borderRadius: 24,
    paddingTop: 28,
    paddingHorizontal: 22,
    paddingBottom: 22,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FFF0F0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1A1A1A",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: "#8B6854",
    marginBottom: 18,
    fontWeight: "500",
  },
  previewCard: {
    width: "100%",
    backgroundColor: "#FFF8F4",
    borderRadius: 14,
    padding: 14,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: "#FFE8DC",
    gap: 6,
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  receiptIcon: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: "#FF967515",
    alignItems: "center",
    justifyContent: "center",
  },
  previewOrderId: {
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
    color: "#1A1A1A",
  },
  previewAmount: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FF9675",
  },
  previewDetail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  previewDetailText: {
    fontSize: 12,
    color: "#8B6854",
    fontWeight: "500",
    flex: 1,
  },
  btnRow: {
    flexDirection: "row",
    width: "100%",
    gap: 10,
  },
  btnCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#F5F0ED",
    alignItems: "center",
    justifyContent: "center",
  },
  btnCancelText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#8B6854",
  },
  btnConfirm: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#FF5C5C",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
  },
  btnConfirmText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#fff",
  },
});

// Main Screen
const FILTERS = ["ALL", "PENDING", "DELIVERED"] as const;

const statusConfig: Record<
  string,
  { color: string; bg: string; icon: any; label: string }
> = {
  delivered: {
    color: "#BB6B3F",
    bg: "#FFF3E8",
    icon: "checkmark-circle",
    label: "Delivered",
  },
  assigned: {
    color: "#FF9675",
    bg: "#FFF0EB",
    icon: "bicycle",
    label: "Assigned",
  },
  unassigned: {
    color: "#FFBF55",
    bg: "#FFF8E8",
    icon: "time",
    label: "Unassigned",
  },
  picked_up: {
    color: "#8B6854",
    bg: "#F5EDE8",
    icon: "cube",
    label: "Picked Up",
  },
  out_for_delivery: {
    color: "#8B6854",
    bg: "#FFF3EB",
    icon: "navigate",
    label: "On the Way",
  },
  cancelled: {
    color: "#FF5C5C",
    bg: "#FFF0F0",
    icon: "close-circle",
    label: "Cancelled",
  },
};

export default function AdminOrdersScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "DELIVERED">("ALL");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const isFocused = useIsFocused();

  // Cancel modal state
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  const fetchOrders = async () => {
    try {
      const status =
        filter === "ALL"
          ? undefined
          : filter === "DELIVERED"
            ? "DELIVERED"
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

  useEffect(() => {
    if (!isFocused) return;
    fetchOrders();
    const interval = setInterval(() => fetchOrders(), 2000);
    return () => clearInterval(interval);
  }, [filter, isFocused]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders();
  }, [filter]);

  const toggleExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Cancel handler 
  const handleCancelConfirm = async () => {
    if (!cancelTarget) return;
    setCancelLoading(true);
    try {
      await api.cancelOrder(cancelTarget.id); // ← add this to your api service (see below)
      setOrders((prev) =>
        prev.map((o) =>
          o.id === cancelTarget.id ? { ...o, status: "cancelled" } : o,
        ),
      );
      setCancelTarget(null);
    } catch (e) {
      console.error("Cancel failed", e);
    } finally {
      setCancelLoading(false);
    }
  };

  if (loading) return <LoadingScreen />;

  const isCancellable = (order: Order) => {
    const s = order.status?.toLowerCase();
    return s !== "delivered" && s !== "cancelled";
  };

  const isDelivered = (order: Order) =>
    order.status?.toLowerCase() === "delivered";

  const isCancelled = (order: Order) =>
    order.status?.toLowerCase() === "cancelled";

  const getItemSummary = (items: Order["items"]) => {
    if (!items?.length) return "No items";
    return items
      .map((i) =>
        i.quantity ? `${i.product_name} ×${i.quantity}` : i.product_name,
      )
      .join("  ·  ");
  };

  const renderOrder = ({ item }: { item: Order }) => {
    const sc =
      statusConfig[item.status?.toLowerCase()] ?? statusConfig["unassigned"];
    const expanded = expandedIds.has(item.id);
    const delivered = isDelivered(item);
    const cancelled = isCancelled(item);
    const cancellable = isCancellable(item);

    return (
      <View style={[styles.card, cancelled && styles.cardCancelled]}>
        {/* ── Collapsed summary ── */}
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => toggleExpand(item.id)}
          style={styles.summary}
        >
          {/* Top row */}
          <View style={styles.cardHeader}>
            <View style={styles.orderIdRow}>
              <View
                style={[
                  styles.receiptIcon,
                  cancelled && { backgroundColor: "#FF5C5C15" },
                ]}
              >
                <Ionicons
                  name="receipt-outline"
                  size={14}
                  color={cancelled ? "#FF5C5C" : "#FF9675"}
                />
              </View>
              <Text style={[styles.orderId, cancelled && { color: "#aaa" }]}>
                #{item.id.slice(-6).toUpperCase()}
              </Text>
            </View>

            <View style={styles.headerRight}>
              <View style={[styles.statusPill, { backgroundColor: sc.bg }]}>
                <Ionicons name={sc.icon} size={11} color={sc.color} />
                <Text style={[styles.statusText, { color: sc.color }]}>
                  {sc.label}
                </Text>
              </View>
              <Ionicons
                name={expanded ? "chevron-up" : "chevron-down"}
                size={16}
                color="#BB6B3F"
                style={{ marginLeft: 6 }}
              />
            </View>
          </View>

          {/* Items summary */}
          <View style={styles.itemSummaryRow}>
            <Ionicons name="bag-outline" size={13} color="#8B6854" />
            <Text
              style={[
                styles.itemSummaryText,
                cancelled && {
                  color: "#bbb",
                  textDecorationLine: "line-through",
                },
              ]}
              numberOfLines={1}
            >
              {getItemSummary(item.items)}
            </Text>
          </View>

          {/* Footer row */}
          <View style={styles.summaryFooter}>
            {!delivered && !cancelled && item.admin_otp ? (
              <View style={styles.otpPill}>
                <Text style={styles.otpPillLabel}>OTP</Text>
                <Text style={styles.otpPillValue}>{item.admin_otp}</Text>
              </View>
            ) : delivered ? (
              <View style={[styles.otpPill, styles.otpPillDelivered]}>
                <Ionicons name="checkmark-circle" size={13} color="#BB6B3F" />
                <Text
                  style={[
                    styles.otpPillLabel,
                    { color: "#BB6B3F", marginLeft: 4 },
                  ]}
                >
                  Delivered
                </Text>
              </View>
            ) : cancelled ? (
              <View style={[styles.otpPill, styles.otpPillCancelled]}>
                <Ionicons name="close-circle" size={13} color="#FF5C5C" />
                <Text
                  style={[
                    styles.otpPillLabel,
                    { color: "#FF5C5C", marginLeft: 4 },
                  ]}
                >
                  Cancelled
                </Text>
              </View>
            ) : null}

            <View style={styles.footerRight}>
              {item.total_amount !== undefined && (
                <Text
                  style={[styles.summaryAmount, cancelled && { color: "#bbb" }]}
                >
                  ₹{item.total_amount}
                </Text>
              )}

              {/* Cancel button — only on non-terminal orders */}
              {cancellable && (
                <TouchableOpacity
                  style={styles.cancelChip}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    setCancelTarget(item);
                  }}
                  activeOpacity={0.75}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name="close-circle-outline"
                    size={13}
                    color="#FF5C5C"
                  />
                  <Text style={styles.cancelChipText}>Cancel</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </TouchableOpacity>

        {/* ── Expanded details ── */}
        {expanded && (
          <View style={styles.expandedSection}>
            <View style={styles.divider} />

            {(item.delivery_date || item.delivery_slot) && (
              <View style={styles.detailRow}>
                <Ionicons name="calendar-outline" size={13} color="#8B6854" />
                <Text style={styles.detailText}>
                  {item.delivery_date}
                  {item.delivery_slot && `  ·  ${item.delivery_slot}`}
                </Text>
              </View>
            )}

            <View style={styles.twoCol}>
              <View style={styles.col}>
                <Text style={styles.colLabel}>CUSTOMER</Text>
                <Text style={styles.colName}>
                  {item.customer_name ?? "Unknown"}
                </Text>
                {item.customer_phone && (
                  <View style={styles.phoneRow}>
                    <Ionicons name="call-outline" size={11} color="#8B6854" />
                    <Text style={styles.phoneText}>{item.customer_phone}</Text>
                  </View>
                )}
              </View>

              <View style={styles.colDivider} />

              <View style={styles.col}>
                <Text style={styles.colLabel}>RIDER</Text>
                {item.delivery_partner_name ? (
                  <>
                    <Text style={styles.colName}>
                      {item.delivery_partner_name}
                    </Text>
                    {item.delivery_partner_phone && (
                      <View style={styles.phoneRow}>
                        <Ionicons
                          name="call-outline"
                          size={11}
                          color="#8B6854"
                        />
                        <Text style={styles.phoneText}>
                          {item.delivery_partner_phone}
                        </Text>
                      </View>
                    )}
                  </>
                ) : (
                  <View style={styles.unassignedRow}>
                    <Ionicons name="time-outline" size={13} color="#FFBF55" />
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

            {item.address && (
              <>
                <View style={styles.divider} />
                <Text style={styles.colLabel}>ADDRESS</Text>
                <View style={styles.detailRow}>
                  <Ionicons name="location-outline" size={13} color="#8B6854" />
                  <Text style={styles.detailText}>
                    {[item.address.flat, item.address.tower, item.address.area]
                      .filter(Boolean)
                      .join(", ")}
                  </Text>
                </View>
              </>
            )}

            {!delivered && !cancelled && item.admin_otp && (
              <>
                <View style={styles.divider} />
                <View style={styles.otpExpandedRow}>
                  <View style={styles.otpBox}>
                    <Text style={styles.otpLabel}>OTP</Text>
                    <Text style={styles.otpValue}>{item.admin_otp}</Text>
                  </View>
                  {item.total_amount !== undefined && (
                    <View style={styles.amountBox}>
                      <Text style={styles.amountLabel}>Total</Text>
                      <Text style={styles.amountValue}>
                        ₹{item.total_amount}
                      </Text>
                    </View>
                  )}
                </View>
              </>
            )}

            {(delivered || cancelled) && item.total_amount !== undefined && (
              <>
                <View style={styles.divider} />
                <View style={styles.amountBox}>
                  <Text style={styles.amountLabel}>Total</Text>
                  <Text
                    style={[styles.amountValue, cancelled && { color: "#bbb" }]}
                  >
                    ₹{item.total_amount}
                  </Text>
                </View>
              </>
            )}

            {/* Cancel button in expanded view — prominent */}
            {cancellable && (
              <>
                <View style={styles.divider} />
                <TouchableOpacity
                  style={styles.cancelExpandedBtn}
                  onPress={() => setCancelTarget(item)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="close-circle-outline"
                    size={16}
                    color="#FF5C5C"
                  />
                  <Text style={styles.cancelExpandedText}>
                    Cancel This Order
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Cancel confirmation modal */}
      <CancelModal
        visible={!!cancelTarget}
        order={cancelTarget}
        onConfirm={handleCancelConfirm}
        onDismiss={() => !cancelLoading && setCancelTarget(null)}
        loading={cancelLoading}
      />

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
            <Text
              style={[
                styles.filterText,
                filter === f && styles.filterTextActive,
              ]}
            >
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FF9675"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={48} color="#8B6854" />
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
  container: { flex: 1, backgroundColor: "#FFF8F4" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
    gap: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1A1A1A",
    letterSpacing: -0.5,
  },
  countBadge: {
    backgroundColor: "#FF967520",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  countText: { fontSize: 13, fontWeight: "800", color: "#FF9675" },

  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 14,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  filterChipActive: { backgroundColor: "#FF967512", borderColor: "#FF9675" },
  filterText: { fontSize: 13, fontWeight: "600", color: "#8B6854" },
  filterTextActive: { color: "#FF9675" },

  list: { paddingHorizontal: 16, paddingBottom: 30 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    marginBottom: 14,
    shadowColor: "#BB6B3F",
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    overflow: "hidden",
  },
  cardCancelled: {
    backgroundColor: "#FDFAFA",
    shadowOpacity: 0.03,
  },

  summary: { padding: 16 },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  orderIdRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  receiptIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#FF967515",
    justifyContent: "center",
    alignItems: "center",
  },
  orderId: { fontSize: 15, fontWeight: "800", color: "#1A1A1A" },
  headerRight: { flexDirection: "row", alignItems: "center" },

  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: { fontSize: 11, fontWeight: "700" },

  itemSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  itemSummaryText: {
    flex: 1,
    fontSize: 13,
    color: "#8B6854",
    fontWeight: "500",
  },

  summaryFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  footerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  otpPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFF8E8",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  otpPillDelivered: { backgroundColor: "#FFF3E8" },
  otpPillCancelled: { backgroundColor: "#FFF0F0" },
  otpPillLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFBF55",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  otpPillValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFBF55",
    letterSpacing: 2,
  },
  summaryAmount: { fontSize: 17, fontWeight: "800", color: "#1A1A1A" },

  // Cancel chip (collapsed view)
  cancelChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFF0F0",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#FFCDD2",
  },
  cancelChipText: { fontSize: 12, fontWeight: "700", color: "#FF5C5C" },

  // ── Expanded section ──
  expandedSection: { paddingHorizontal: 16, paddingBottom: 16 },
  divider: { height: 1, backgroundColor: "#FFF0E8", marginVertical: 14 },

  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  detailText: { fontSize: 13, color: "#8B6854", fontWeight: "500" },

  twoCol: { flexDirection: "row" },
  col: { flex: 1 },
  colDivider: { width: 1, backgroundColor: "#FFF0E8", marginHorizontal: 14 },
  colLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#BB6B3F",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  colName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  phoneRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  phoneText: { fontSize: 12, color: "#8B6854", fontWeight: "500" },
  unassignedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  unassignedText: { fontSize: 13, color: "#FFBF55", fontWeight: "600" },

  itemsList: { gap: 6, marginTop: 8 },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  itemDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#FF9675" },
  itemName: { flex: 1, fontSize: 13, fontWeight: "500", color: "#333" },
  itemQty: { fontSize: 12, color: "#8B6854", fontWeight: "600" },

  otpExpandedRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  otpBox: {
    backgroundColor: "#FFF8E8",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: "center",
  },
  otpLabel: {
    fontSize: 9,
    color: "#FFBF55",
    fontWeight: "700",
    letterSpacing: 1,
  },
  otpValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFBF55",
    letterSpacing: 3,
  },

  amountBox: { alignItems: "flex-end" },
  amountLabel: { fontSize: 10, color: "#8B6854", fontWeight: "600" },
  amountValue: { fontSize: 18, fontWeight: "800", color: "#1A1A1A" },

  // Cancel button in expanded view
  cancelExpandedBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: "#FFF0F0",
    borderWidth: 1,
    borderColor: "#FFCDD2",
  },
  cancelExpandedText: { fontSize: 14, fontWeight: "700", color: "#FF5C5C" },

  emptyState: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#8B6854" },
  emptyDesc: { fontSize: 13, color: "#8B6854" },
});
