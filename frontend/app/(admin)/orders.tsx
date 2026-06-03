import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
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
import DateTimePicker from "@react-native-community/datetimepicker";
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
  items: {
    product_name?: string;
    product_id?: string;
    product?: { id?: string; _id?: string; name?: string };
    id?: string;
    _id?: string;
    quantity?: number;
    name?: string;
  }[];
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
const DATE_FILTERS = ["ALL", "TODAY", "TOMORROW", "CUSTOM"] as const;

const getLocalDateKey = (date = new Date()) => {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const getTomorrowDateKey = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return getLocalDateKey(date);
};

const getOrderDateKey = (date?: string) => {
  if (!date) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(date)) return date.slice(0, 10);
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return getLocalDateKey(parsed);
};

const dateFromKey = (dateKey?: string) => {
  if (!dateKey) return new Date();
  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) return new Date();
  return new Date(year, month - 1, day);
};

const getOrderItemName = (item: Order["items"][number]) =>
  item.product_name || item.product?.name || item.name || "";
const getOrderItemProductId = (item: Order["items"][number]) =>
  item.product_id || item.product?.id || item.product?._id || item.id || item._id || "";
const getProductId = (product: any) => product?.id || product?._id || "";
const normalizeName = (value: string) => value.trim().toLowerCase();
const itemMatchesProduct = (
  item: Order["items"][number],
  product: string,
  productMeta?: any,
) => {
  if (product === "ALL") return true;
  const productId = getProductId(productMeta);
  const itemId = getOrderItemProductId(item);
  if (productId && itemId && productId === itemId) return true;
  const itemValue = normalizeName(getOrderItemName(item));
  const productValue = normalizeName(product);
  const metaValue = normalizeName(productMeta?.name || product);
  return (
    itemValue === productValue ||
    itemValue === metaValue ||
    itemValue.includes(productValue) ||
    productValue.includes(itemValue) ||
    itemValue.includes(metaValue) ||
    metaValue.includes(itemValue)
  );
};

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
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "DELIVERED">("ALL");
  const [dateFilter, setDateFilter] = useState<(typeof DATE_FILTERS)[number]>("ALL");
  const [productFilter, setProductFilter] = useState("ALL");
  const [selectedCustomer, setSelectedCustomer] = useState("ALL");
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [datePickerTarget, setDatePickerTarget] = useState<"start" | "end" | null>(null);
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const isFocused = useIsFocused();

  // Cancel modal state
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  const fetchOrders = async () => {
    try {
      const date =
        dateFilter === "TODAY"
          ? getLocalDateKey()
          : dateFilter === "TOMORROW"
            ? getTomorrowDateKey()
            : undefined;
      const [ordersData, productsData] = await Promise.all([
        api.getAllOrders(undefined, date),
        api.getProducts(),
      ]);
      setOrders(ordersData);
      setProducts(productsData);
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
  }, [dateFilter, customStartDate, customEndDate, isFocused]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders();
  }, [dateFilter, customStartDate, customEndDate]);

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
      await api.adminCancelOrder(cancelTarget.id); // ← add this to your api service (see below)
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
        i.quantity ? `${getOrderItemName(i)} ×${i.quantity}` : getOrderItemName(i),
      )
      .join("  ·  ");
  };

  const productTabs = useMemo(() => {
    const fromOrders = orders.flatMap((order) =>
      (order.items || []).map((item) => getOrderItemName(item)).filter(Boolean),
    );
    return ["ALL", ...Array.from(new Set([...products.map((p) => p.name), ...fromOrders]))];
  }, [orders, products]);

  const customerOptions = useMemo(() => {
    const names = orders
      .map((order) => order.customer_name || order.customer_phone || "Unknown Customer")
      .filter(Boolean);
    return ["ALL", ...Array.from(new Set(names))];
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const selectedProductMeta = products.find((product) => {
      const productValue = normalizeName(product.name || "");
      const selectedValue = normalizeName(productFilter);
      return (
        productValue === selectedValue ||
        productValue.includes(selectedValue) ||
        selectedValue.includes(productValue)
      );
    });
    return orders.filter((order) => {
      const status = order.status?.toLowerCase();
      const statusMatch =
        filter === "ALL" ||
        (filter === "DELIVERED"
          ? status === "delivered"
          : status !== "delivered" && status !== "cancelled");
      const customerMatch =
        selectedCustomer === "ALL" ||
        order.customer_name === selectedCustomer ||
        order.customer_phone === selectedCustomer;
      const productMatch =
        productFilter === "ALL" ||
        order.items?.some((item) =>
          itemMatchesProduct(item, productFilter, selectedProductMeta),
        );
      const dateMatch =
        dateFilter === "ALL" ||
        (dateFilter === "CUSTOM"
          ? (!customStartDate || getOrderDateKey(order.delivery_date) >= customStartDate) &&
            (!customEndDate || getOrderDateKey(order.delivery_date) <= customEndDate)
          : getOrderDateKey(order.delivery_date) ===
            (dateFilter === "TODAY" ? getLocalDateKey() : getTomorrowDateKey()));
      return statusMatch && customerMatch && productMatch && dateMatch;
    });
  }, [customEndDate, customStartDate, dateFilter, filter, orders, productFilter, products, selectedCustomer]);

  const activeFilterCount = [
    filter !== "ALL",
    dateFilter !== "ALL",
    selectedCustomer !== "ALL",
  ].filter(Boolean).length;

  const resetFilters = () => {
    setFilter("ALL");
    setDateFilter("ALL");
    setProductFilter("ALL");
    setSelectedCustomer("ALL");
    setCustomerDropdownOpen(false);
    setCustomStartDate("");
    setCustomEndDate("");
    setDatePickerTarget(null);
  };

  const handleCustomDateChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") setDatePickerTarget(null);
    if (!selectedDate || !datePickerTarget) return;
    const dateKey = getLocalDateKey(selectedDate);
    if (datePickerTarget === "start") {
      setCustomStartDate(dateKey);
      if (customEndDate && dateKey > customEndDate) setCustomEndDate(dateKey);
    } else {
      setCustomEndDate(dateKey);
      if (customStartDate && dateKey < customStartDate) setCustomStartDate(dateKey);
    }
  };

  if (loading) return <LoadingScreen />;

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
                  <Text style={styles.itemName}>{getOrderItemName(p)}</Text>
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
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Orders</Text>
          <Text style={styles.activeFilterText}>
            {filteredOrders.length} shown · {filter} · {dateFilter}
          </Text>
        </View>
          <TouchableOpacity
          style={styles.headerFilterBtn}
          onPress={() => setFilterSheetVisible(true)}
          activeOpacity={0.82}
        >
          <Ionicons name="options-outline" size={19} color="#BB6B3F" />
          {activeFilterCount ? (
            <View style={styles.filterCountDot}>
              <Text style={styles.filterCountText}>{activeFilterCount}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      <Modal
        visible={filterSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterSheetVisible(false)}
      >
        <View style={styles.sheetOverlay}>
          <View style={styles.filterSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Filter Orders</Text>
              <TouchableOpacity style={styles.sheetCloseBtn} onPress={() => setFilterSheetVisible(false)}>
                <Ionicons name="close" size={18} color="#8B6854" />
              </TouchableOpacity>
            </View>

            <Text style={styles.sheetLabel}>Customer</Text>
            <TouchableOpacity
              style={styles.customerDropdown}
              onPress={() => setCustomerDropdownOpen((open) => !open)}
              activeOpacity={0.82}
            >
              <Ionicons name="person-outline" size={16} color="#8B6854" />
              <Text style={styles.customerDropdownText} numberOfLines={1}>
                {selectedCustomer === "ALL" ? "All Customers" : selectedCustomer}
              </Text>
              <Ionicons
                name={customerDropdownOpen ? "chevron-up" : "chevron-down"}
                size={17}
                color="#8B6854"
              />
            </TouchableOpacity>
            {customerDropdownOpen ? (
              <View style={styles.customerDropdownList}>
                <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                  {customerOptions.map((customer) => {
                    const active = selectedCustomer === customer;
                    return (
                      <TouchableOpacity
                        key={customer}
                        style={[
                          styles.customerOption,
                          active && styles.customerOptionActive,
                        ]}
                        onPress={() => {
                          setSelectedCustomer(customer);
                          setCustomerDropdownOpen(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.customerOptionText,
                            active && styles.customerOptionTextActive,
                          ]}
                          numberOfLines={1}
                        >
                          {customer === "ALL" ? "All Customers" : customer}
                        </Text>
                        {active ? (
                          <Ionicons name="checkmark" size={16} color="#BB6B3F" />
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}

            <Text style={styles.sheetLabel}>Status</Text>
            <View style={styles.filterRowSheet}>
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

            <Text style={styles.sheetLabel}>Date</Text>
            <View style={styles.filterRowSheet}>
              {DATE_FILTERS.map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[styles.filterChip, dateFilter === f && styles.filterChipActive]}
                  onPress={() => setDateFilter(f)}
                >
                  <Text style={[styles.filterText, dateFilter === f && styles.filterTextActive]}>
                    {f}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {dateFilter === "CUSTOM" ? (
              <>
                <View style={styles.dateRangeRow}>
                  <TouchableOpacity
                    style={styles.dateRangeBtn}
                    onPress={() => setDatePickerTarget("start")}
                    activeOpacity={0.82}
                  >
                    <Text style={styles.dateRangeLabel}>From</Text>
                    <Text style={styles.dateRangeValue}>
                      {customStartDate || "Select date"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.dateRangeBtn}
                    onPress={() => setDatePickerTarget("end")}
                    activeOpacity={0.82}
                  >
                    <Text style={styles.dateRangeLabel}>To</Text>
                    <Text style={styles.dateRangeValue}>
                      {customEndDate || "Select date"}
                    </Text>
                  </TouchableOpacity>
                </View>
                {datePickerTarget ? (
                  <View style={styles.datePickerWrap}>
                    <DateTimePicker
                      value={
                        dateFromKey(
                          datePickerTarget === "start"
                            ? customStartDate || getLocalDateKey()
                            : customEndDate || customStartDate || getLocalDateKey(),
                        )
                      }
                      mode="date"
                      display={Platform.OS === "ios" ? "inline" : "default"}
                      onChange={handleCustomDateChange}
                      maximumDate={new Date()}
                    />
                    {Platform.OS === "ios" ? (
                      <TouchableOpacity
                        style={styles.datePickerDoneBtn}
                        onPress={() => setDatePickerTarget(null)}
                      >
                        <Text style={styles.datePickerDoneText}>Done</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ) : null}
              </>
            ) : null}

            <View style={styles.sheetActions}>
              <TouchableOpacity style={styles.resetBtn} onPress={resetFilters}>
                <Text style={styles.resetBtnText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyBtn} onPress={() => setFilterSheetVisible(false)}>
                <Text style={styles.applyBtnText}>Show {filteredOrders.length} Orders</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.productFilterScroll}
        contentContainerStyle={styles.productFilterContent}
      >
        {productTabs.map((product) => (
          <TouchableOpacity
            key={product}
            style={[
              styles.productFilterChip,
              productFilter === product && styles.productFilterChipActive,
            ]}
            onPress={() => setProductFilter(product)}
            activeOpacity={0.82}
          >
            <Text
              style={[
                styles.productFilterText,
                productFilter === product && styles.productFilterTextActive,
              ]}
            >
              {product}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        style={styles.orderList}
        data={filteredOrders}
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
            <Text style={styles.emptyDesc}>Try changing customer, product or date filter</Text>
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
  activeFilterText: {
    fontSize: 12,
    color: "#8B6854",
    fontWeight: "700",
    marginTop: 2,
  },
  headerFilterBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#FFE1CC",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  filterCountDot: {
    position: "absolute",
    top: -5,
    right: -5,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FF9675",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  filterCountText: { fontSize: 10, fontWeight: "900", color: "#fff" },
  countBadge: {
    backgroundColor: "#FF967520",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  countText: { fontSize: 13, fontWeight: "800", color: "#FF9675" },

  customerDropdown: {
    marginBottom: 10,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#FFE1CC",
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  customerDropdownText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  customerDropdownList: {
    maxHeight: 180,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#FFE1CC",
    marginBottom: 10,
    overflow: "hidden",
  },
  customerOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#FFF0E8",
    gap: 10,
  },
  customerOptionActive: { backgroundColor: "#FFF3E8" },
  customerOptionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#8B6854",
  },
  customerOptionTextActive: { color: "#BB6B3F", fontWeight: "900" },

  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(61,31,10,0.35)",
    justifyContent: "flex-end",
  },
  filterSheet: {
    backgroundColor: "#FFF8F4",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 24,
  },
  sheetHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E8CDBD",
    alignSelf: "center",
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#1A1A1A",
  },
  sheetCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FFE1CC",
  },
  sheetLabel: {
    fontSize: 11,
    color: "#8B6854",
    fontWeight: "900",
    letterSpacing: 0.7,
    marginBottom: 8,
    marginTop: 6,
    textTransform: "uppercase",
  },
  filterRowSheet: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  customDateInput: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#FFE1CC",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  dateRangeRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  dateRangeBtn: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#FFE1CC",
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  dateRangeLabel: {
    fontSize: 10,
    fontWeight: "900",
    color: "#C9A882",
    textTransform: "uppercase",
    marginBottom: 3,
  },
  dateRangeValue: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1A1A1A",
  },
  datePickerWrap: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#FFE1CC",
    marginBottom: 10,
    overflow: "hidden",
  },
  datePickerDoneBtn: {
    alignSelf: "flex-end",
    backgroundColor: "#FF9675",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    margin: 10,
  },
  datePickerDoneText: { fontSize: 13, fontWeight: "900", color: "#fff" },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A1A",
    padding: 0,
  },

  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 10,
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

  sheetActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  resetBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#FFE1CC",
    paddingVertical: 14,
  },
  resetBtnText: { fontSize: 14, fontWeight: "900", color: "#8B6854" },
  applyBtn: {
    flex: 1.5,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "#FF9675",
    paddingVertical: 14,
  },
  applyBtnText: { fontSize: 14, fontWeight: "900", color: "#fff" },

  productFilterScroll: {
    flexGrow: 0,
    maxHeight: 52,
  },
  productFilterContent: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 8,
  },
  productFilterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#FFE1CC",
  },
  productFilterChipActive: {
    backgroundColor: "#8B6854",
    borderColor: "#8B6854",
  },
  productFilterText: { fontSize: 12, fontWeight: "800", color: "#8B6854" },
  productFilterTextActive: { color: "#fff" },

  orderList: { flex: 1 },
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
