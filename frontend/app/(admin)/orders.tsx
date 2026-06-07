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

// ─── Types ────────────────────────────────────────────────────────────────────

type OrderStatus =
  | "UNASSIGNED"
  | "ASSIGNED"
  | "DELIVERED"
  | "CANCELLED"
  | "cancelled"
  | "delivered"
  | "assigned"
  | "unassigned"
  | "picked_up"
  | "out_for_delivery";

interface Order {
  id: string;
  status: OrderStatus;
  admin_otp?: string;
  admin_id?: string;
  delivery_date?: string;
  delivery_slot?: string;
  customer_name?: string;
  customer_phone?: string;
  total_amount?: number;
  items: { product_name: string; quantity?: number; product_id?: string }[];
  address?: { tower?: string; flat?: string; area?: string };
  delivery_partner_name?: string;
  delivery_partner_phone?: string;
  pattern?: string;
  subscription_id?: string;
}

interface Subscription {
  id: string;
  user_id: string;
  admin_id?: string;
  pattern: string;
  is_active: boolean;
  status?: string;
  start_date?: string;
  end_date?: string;
  delivery_slot?: string;
  custom_days?: number[];
  total_amount?: number;
  total_quantity?: number;
  items: {
    product_id: string;
    quantity: number;
    price: number;
    amount: number;
  }[];
  customer_name?: string;
  customer_phone?: string;
  created_at?: string;
}

// ─── Product Name Cache ───────────────────────────────────────────────────────
// Resolves product_id → product name, shared across the screen

const productNameCache: Record<string, string> = {};

async function resolveProductName(productId: string): Promise<string> {
  if (productNameCache[productId]) return productNameCache[productId];
  try {
    const product = await api.getProduct(productId);
    const name = product?.name ?? productId;
    productNameCache[productId] = name;
    return name;
  } catch {
    productNameCache[productId] = productId;
    return productId;
  }
}

async function resolveProductNames(
  productIds: string[],
): Promise<Record<string, string>> {
  const unresolved = [...new Set(productIds)].filter(
    (id) => !productNameCache[id],
  );
  await Promise.all(unresolved.map(resolveProductName));
  const result: Record<string, string> = {};
  for (const id of productIds) {
    result[id] = productNameCache[id] ?? id;
  }
  return result;
}

// ─── Cancel Modal ─────────────────────────────────────────────────────────────

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
          <View style={cm.iconCircle}>
            <Ionicons name="close-circle" size={34} color="#FF5C5C" />
          </View>
          <Text style={cm.title}>Cancel Order?</Text>
          <Text style={cm.subtitle}>This action cannot be undone.</Text>
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
            {itemSummary ? (
              <View style={cm.previewDetail}>
                <Ionicons name="bag-outline" size={11} color="#8B6854" />
                <Text style={cm.previewDetailText} numberOfLines={1}>
                  {itemSummary}
                </Text>
              </View>
            ) : null}
          </View>
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

// ─── Subscription Detail Modal ────────────────────────────────────────────────

interface SubModalProps {
  visible: boolean;
  subscription: Subscription | null;
  productNames: Record<string, string>;
  onDismiss: () => void;
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function SubscriptionDetailModal({
  visible,
  subscription,
  productNames,
  onDismiss,
}: SubModalProps) {
  const slideAnim = useRef(new Animated.Value(400)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 180,
          friction: 14,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slideAnim.setValue(400);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  if (!subscription) return null;

  const patternLabel: Record<string, string> = {
    daily: "Daily",
    alternate: "Alternate Days",
    custom: "Custom Days",
    buy_once: "One-Time",
  };
  const patternColor: Record<string, string> = {
    daily: "#BB6B3F",
    alternate: "#FF9675",
    custom: "#FFBF55",
    buy_once: "#8B6854",
  };
  const patternBg: Record<string, string> = {
    daily: "#FFF3E8",
    alternate: "#FFF0EB",
    custom: "#FFF8E8",
    buy_once: "#F5EDE8",
  };

  const color = patternColor[subscription.pattern] ?? "#8B6854";
  const bg = patternBg[subscription.pattern] ?? "#F5EDE8";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <Animated.View style={[sm.overlay, { opacity: opacityAnim }]}>
        <Animated.View
          style={[sm.sheet, { transform: [{ translateY: slideAnim }] }]}
        >
          <View style={sm.header}>
            <View style={sm.headerLeft}>
              <View style={[sm.patternBadge, { backgroundColor: bg }]}>
                <Ionicons
                  name={
                    subscription.pattern === "daily"
                      ? "repeat"
                      : subscription.pattern === "buy_once"
                        ? "cart"
                        : "calendar"
                  }
                  size={14}
                  color={color}
                />
                <Text style={[sm.patternText, { color }]}>
                  {patternLabel[subscription.pattern] ?? subscription.pattern}
                </Text>
              </View>
              <Text style={sm.subId}>
                #{subscription.id.slice(-6).toUpperCase()}
              </Text>
            </View>
            <TouchableOpacity
              style={sm.closeBtn}
              onPress={onDismiss}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color="#8B6854" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={[subscription]}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            renderItem={() => (
              <View style={sm.body}>
                {(subscription.customer_name ||
                  subscription.customer_phone) && (
                  <View style={sm.section}>
                    <Text style={sm.sectionLabel}>CUSTOMER</Text>
                    <View style={sm.infoRow}>
                      <View style={sm.infoIcon}>
                        <Ionicons name="person" size={13} color="#FF9675" />
                      </View>
                      <View>
                        {subscription.customer_name && (
                          <Text style={sm.infoMain}>
                            {subscription.customer_name}
                          </Text>
                        )}
                        {subscription.customer_phone && (
                          <View style={sm.phoneRow}>
                            <Ionicons
                              name="call-outline"
                              size={11}
                              color="#8B6854"
                            />
                            <Text style={sm.phoneText}>
                              {subscription.customer_phone}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                )}

                <View style={sm.section}>
                  <Text style={sm.sectionLabel}>SCHEDULE</Text>
                  <View style={sm.scheduleGrid}>
                    {subscription.start_date && (
                      <View style={sm.scheduleItem}>
                        <Ionicons
                          name="play-circle-outline"
                          size={13}
                          color="#8B6854"
                        />
                        <View>
                          <Text style={sm.scheduleKey}>Start</Text>
                          <Text style={sm.scheduleVal}>
                            {subscription.start_date}
                          </Text>
                        </View>
                      </View>
                    )}
                    {subscription.end_date && (
                      <View style={sm.scheduleItem}>
                        <Ionicons
                          name="stop-circle-outline"
                          size={13}
                          color="#8B6854"
                        />
                        <View>
                          <Text style={sm.scheduleKey}>End</Text>
                          <Text style={sm.scheduleVal}>
                            {subscription.end_date}
                          </Text>
                        </View>
                      </View>
                    )}
                    {subscription.delivery_slot && (
                      <View style={sm.scheduleItem}>
                        <Ionicons
                          name="time-outline"
                          size={13}
                          color="#8B6854"
                        />
                        <View>
                          <Text style={sm.scheduleKey}>Slot</Text>
                          <Text style={sm.scheduleVal}>
                            {subscription.delivery_slot}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                  {subscription.pattern === "custom" &&
                    subscription.custom_days &&
                    subscription.custom_days.length > 0 && (
                      <View style={sm.daysRow}>
                        {DAY_NAMES.map((d, i) => {
                          const active = subscription.custom_days!.includes(i);
                          return (
                            <View
                              key={i}
                              style={[sm.dayChip, active && sm.dayChipActive]}
                            >
                              <Text
                                style={[
                                  sm.dayChipText,
                                  active && sm.dayChipTextActive,
                                ]}
                              >
                                {d}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    )}
                </View>

                {/* ── Items Section (resolved product names) ── */}
                <View style={sm.section}>
                  <Text style={sm.sectionLabel}>ITEMS</Text>
                  <View style={sm.itemsCard}>
                    {subscription.items?.map((item, i) => {
                      const name =
                        productNames[item.product_id] ?? item.product_id;
                      return (
                        <View
                          key={i}
                          style={[sm.itemRow, i > 0 && sm.itemRowBorder]}
                        >
                          <View style={sm.itemDot} />
                          <View style={sm.itemNameWrap}>
                            <Text style={sm.itemName} numberOfLines={2}>
                              {name}
                            </Text>
                            <Text style={sm.itemUnitPrice}>
                              ₹{item.price} / unit
                            </Text>
                          </View>
                          <View style={sm.itemRight}>
                            <View style={sm.itemQtyBadge}>
                              <Text style={sm.itemQty}>×{item.quantity}</Text>
                            </View>
                            <Text style={sm.itemPrice}>₹{item.amount}</Text>
                          </View>
                        </View>
                      );
                    })}
                    <View style={sm.totalRow}>
                      <Text style={sm.totalLabel}>Total</Text>
                      <Text style={sm.totalVal}>
                        ₹{subscription.total_amount ?? 0}
                      </Text>
                    </View>
                  </View>
                </View>

                <View
                  style={[
                    sm.statusBanner,
                    {
                      backgroundColor: subscription.is_active
                        ? "#F0FFF4"
                        : "#FFF0F0",
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      subscription.is_active
                        ? "checkmark-circle"
                        : "close-circle"
                    }
                    size={16}
                    color={subscription.is_active ? "#22C55E" : "#FF5C5C"}
                  />
                  <Text
                    style={[
                      sm.statusText,
                      { color: subscription.is_active ? "#16A34A" : "#FF5C5C" },
                    ]}
                  >
                    {subscription.is_active
                      ? "Active Subscription"
                      : "Inactive"}
                  </Text>
                </View>
              </View>
            )}
          />
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ─── Subscription Row ─────────────────────────────────────────────────────────

interface SubRowProps {
  item: Subscription;
  expanded: boolean;
  onToggle: () => void;
  onViewDetail: () => void;
  productNames: Record<string, string>;
}

const DAY_ABBR = ["M", "T", "W", "T", "F", "S", "S"];
const PATTERN_CONFIG: Record<
  string,
  { color: string; bg: string; icon: any; label: string }
> = {
  daily: { color: "#BB6B3F", bg: "#FFF3E8", icon: "repeat", label: "Daily" },
  alternate: {
    color: "#FF9675",
    bg: "#FFF0EB",
    icon: "git-branch",
    label: "Alternate",
  },
  custom: {
    color: "#FFBF55",
    bg: "#FFF8E8",
    icon: "calendar",
    label: "Custom",
  },
};

function SubscriptionRow({
  item,
  expanded,
  onToggle,
  onViewDetail,
  productNames,
}: SubRowProps) {
  const pc = PATTERN_CONFIG[item.pattern] ?? PATTERN_CONFIG.daily;
  const itemCount = item.items?.length ?? 0;

  // Build a short summary line: "Milk ×2  ·  Curd ×1"
  const itemSummaryLine = item.items
    ?.slice(0, 2)
    .map((p) => {
      const name = productNames[p.product_id] ?? p.product_id;
      // Truncate long names
      const short = name.length > 14 ? name.slice(0, 13) + "…" : name;
      return `${short} ×${p.quantity}`;
    })
    .join("  ·  ")
    .concat(item.items?.length > 2 ? `  +${item.items.length - 2} more` : "");

  return (
    <View style={[ss.card, !item.is_active && ss.cardInactive]}>
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={onToggle}
        style={ss.summary}
      >
        {/* ── Card Header ── */}
        <View style={ss.cardHeader}>
          <View style={ss.idRow}>
            <View style={[ss.iconBox, { backgroundColor: pc.bg }]}>
              <Ionicons name={pc.icon} size={14} color={pc.color} />
            </View>
            <View>
              <Text style={ss.subId}>#{item.id.slice(-6).toUpperCase()}</Text>
              <Text style={ss.subItemCount}>
                {itemCount} product{itemCount !== 1 ? "s" : ""}
              </Text>
            </View>
          </View>
          <View style={ss.headerRight}>
            <View style={[ss.patternPill, { backgroundColor: pc.bg }]}>
              <Text style={[ss.patternText, { color: pc.color }]}>
                {pc.label}
              </Text>
            </View>
            {!item.is_active && (
              <View style={ss.inactivePill}>
                <Text style={ss.inactivePillText}>Inactive</Text>
              </View>
            )}
            <Ionicons
              name={expanded ? "chevron-up" : "chevron-down"}
              size={16}
              color="#BB6B3F"
              style={{ marginLeft: 6 }}
            />
          </View>
        </View>

        {/* ── Customer ── */}
        {item.customer_name && (
          <View style={ss.customerRow}>
            <Ionicons name="person-outline" size={12} color="#8B6854" />
            <Text style={ss.customerText}>{item.customer_name}</Text>
            {item.customer_phone && (
              <Text style={ss.customerPhone}> · {item.customer_phone}</Text>
            )}
          </View>
        )}

        {/* ── Item summary line ── */}
        {itemSummaryLine ? (
          <View style={ss.itemSummaryRow}>
            <Ionicons name="bag-outline" size={12} color="#FFBF55" />
            <Text style={ss.itemSummaryText} numberOfLines={1}>
              {itemSummaryLine}
            </Text>
          </View>
        ) : null}

        {/* ── Footer ── */}
        <View style={ss.footer}>
          <View style={ss.datesRow}>
            {item.start_date && (
              <View style={ss.dateBit}>
                <Ionicons name="calendar-outline" size={11} color="#FFBF55" />
                <Text style={ss.dateText}>{item.start_date}</Text>
              </View>
            )}
            {item.end_date && (
              <>
                <Text style={ss.dateSep}>→</Text>
                <Text style={ss.dateText}>{item.end_date}</Text>
              </>
            )}
          </View>
          <Text style={ss.amountText}>₹{item.total_amount ?? 0}</Text>
        </View>
      </TouchableOpacity>

      {/* ── Expanded Section ── */}
      {expanded && (
        <View style={ss.expanded}>
          <View style={ss.divider} />

          {/* Delivery slot */}
          {item.delivery_slot && (
            <View style={ss.slotRow}>
              <View style={ss.slotIcon}>
                <Ionicons name="time-outline" size={13} color="#FF9675" />
              </View>
              <View>
                <Text style={ss.slotLabel}>Delivery Slot</Text>
                <Text style={ss.slotText}>{item.delivery_slot}</Text>
              </View>
            </View>
          )}

          {/* Custom days */}
          {item.pattern === "custom" && item.custom_days && (
            <>
              <View style={ss.divider} />
              <Text style={ss.sectionLabel}>DELIVERY DAYS</Text>
              <View style={ss.daysRow}>
                {DAY_ABBR.map((d, i) => {
                  const active = item.custom_days!.includes(i);
                  return (
                    <View
                      key={i}
                      style={[ss.dayChip, active && ss.dayChipActive]}
                    >
                      <Text style={[ss.dayText, active && ss.dayTextActive]}>
                        {d}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </>
          )}

          {/* ── Items List (clean card per product) ── */}
          <View style={ss.divider} />
          <Text style={ss.sectionLabel}>
            ITEMS · {itemCount} product{itemCount !== 1 ? "s" : ""}
          </Text>
          <View style={ss.itemsCard}>
            {item.items?.map((p, i) => {
              const name = productNames[p.product_id] ?? p.product_id;
              return (
                <View
                  key={i}
                  style={[ss.itemCardRow, i > 0 && ss.itemCardBorder]}
                >
                  {/* left: index bubble + name */}
                  <View style={ss.itemCardLeft}>
                    <View style={ss.itemIndexBubble}>
                      <Text style={ss.itemIndexText}>{i + 1}</Text>
                    </View>
                    <View style={ss.itemCardInfo}>
                      <Text style={ss.itemCardName} numberOfLines={2}>
                        {name}
                      </Text>
                      <Text style={ss.itemCardPricePerUnit}>
                        ₹{p.price} / unit
                      </Text>
                    </View>
                  </View>
                  {/* right: qty × price = amount */}
                  <View style={ss.itemCardRight}>
                    <View style={ss.itemCardQtyBadge}>
                      <Ionicons
                        name="remove-outline"
                        size={10}
                        color="#8B6854"
                      />
                      <Text style={ss.itemCardQty}>{p.quantity}</Text>
                    </View>
                    <Text style={ss.itemCardAmount}>₹{p.amount}</Text>
                  </View>
                </View>
              );
            })}

            {/* Total row */}
            <View style={ss.itemsTotalRow}>
              <Text style={ss.itemsTotalLabel}>Total</Text>
              <Text style={ss.itemsTotalVal}>₹{item.total_amount ?? 0}</Text>
            </View>
          </View>

          <View style={ss.divider} />
          <TouchableOpacity
            style={ss.detailBtn}
            onPress={onViewDetail}
            activeOpacity={0.8}
          >
            <Ionicons name="eye-outline" size={15} color="#FF9675" />
            <Text style={ss.detailBtnText}>View Full Details</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ORDER_FILTERS = ["ALL", "PENDING", "DELIVERED"] as const;

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

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AdminOrdersScreen() {
  const [activeTab, setActiveTab] = useState<"orders" | "subscriptions">(
    "orders",
  );
  const [currentAdmin, setCurrentAdmin] = useState<{
    id: string;
    name?: string;
  } | null>(null);
  const [globalLoading, setGlobalLoading] = useState(true);

  // ── Orders state ──
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersRefreshing, setOrdersRefreshing] = useState(false);
  const [orderFilter, setOrderFilter] = useState<
    "ALL" | "PENDING" | "DELIVERED"
  >("ALL");
  const [expandedOrderIds, setExpandedOrderIds] = useState<Set<string>>(
    new Set(),
  );

  // Cancel modal
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  // ── Subscriptions state ──
  const [allSubscriptions, setAllSubscriptions] = useState<Subscription[]>([]);
  const [subsLoading, setSubsLoading] = useState(false);
  const [subsRefreshing, setSubsRefreshing] = useState(false);
  const [subFilter, setSubFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">(
    "ALL",
  );
  const [expandedSubIds, setExpandedSubIds] = useState<Set<string>>(new Set());
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);

  // ── Product name resolution ──
  const [productNames, setProductNames] = useState<Record<string, string>>({});
  const [resolvingNames, setResolvingNames] = useState(false);

  const tabAnim = useRef(new Animated.Value(0)).current;
  const isFocused = useIsFocused();

  // ── 1. Load admin identity ────────────────────────────────────────────────
  useEffect(() => {
    async function loadAdmin() {
      try {
        const profile = await api.getMe();
        setCurrentAdmin({ id: profile.id, name: profile.name });
      } catch (e) {
        console.error("Admin identity fetch failed:", e);
      } finally {
        setGlobalLoading(false);
      }
    }
    loadAdmin();
  }, []);

  // ── Tab switch ──
  const switchTab = (tab: "orders" | "subscriptions") => {
    setActiveTab(tab);
    Animated.spring(tabAnim, {
      toValue: tab === "orders" ? 0 : 1,
      useNativeDriver: false,
      tension: 200,
      friction: 16,
    }).start();
  };

  // ── 2. Fetch orders ──
  const fetchOrders = useCallback(async () => {
    if (!currentAdmin) return;
    try {
      const data: Order[] = await api.getAllOrders();

      const buyOnceOrders = data.filter((o) => {
        const p = (o.pattern ?? "").toLowerCase();
        return p === "buy_once" || p === "";
      });

      setAllOrders(buyOnceOrders.length > 0 ? buyOnceOrders : data);
    } catch (e: any) {
      console.error("[AdminOrders] fetchOrders FAILED:", e?.message ?? e);
    } finally {
      setOrdersLoading(false);
      setOrdersRefreshing(false);
    }
  }, [currentAdmin]);

  // ── 3. Fetch subscriptions ──
  const fetchSubscriptions = useCallback(async () => {
    if (!currentAdmin) return;
    try {
      let data: Subscription[] = [];

      try {
        data = await api.getAdminSubscriptionsAll();
      } catch (e1: any) {
        console.warn(
          "[AdminOrders] getAdminSubscriptionsAll failed:",
          e1?.message,
        );
        try {
          data = await api.getAdminSubscriptions(currentAdmin.id);
        } catch (e2: any) {
          console.warn(
            "[AdminOrders] getAdminSubscriptions failed:",
            e2?.message,
          );
          const all = await api.getSubscriptions();
          data = all.filter(
            (s: Subscription) => s.admin_id === currentAdmin.id,
          );
        }
      }

      const recurring = data.filter((s: Subscription) => {
        const p = (s.pattern ?? "").toLowerCase();
        return p !== "buy_once" && p !== "";
      });

      setAllSubscriptions(recurring);

      // Resolve all product names in one batch
      const allProductIds = recurring.flatMap((s) =>
        (s.items ?? []).map((item) => item.product_id),
      );
      if (allProductIds.length > 0) {
        setResolvingNames(true);
        try {
          const names = await resolveProductNames(allProductIds);
          setProductNames((prev) => ({ ...prev, ...names }));
        } finally {
          setResolvingNames(false);
        }
      }
    } catch (e: any) {
      console.error(
        "[AdminOrders] fetchSubscriptions FAILED:",
        e?.message ?? e,
      );
    } finally {
      setSubsLoading(false);
      setSubsRefreshing(false);
    }
  }, [currentAdmin]);

  // ── Effect: fetch on tab/focus change ──
  useEffect(() => {
    if (!isFocused || globalLoading || !currentAdmin) return;

    if (activeTab === "orders") {
      setOrdersLoading(true);
      fetchOrders();
      const timer = setInterval(fetchOrders, 30_000);
      return () => clearInterval(timer);
    } else {
      setSubsLoading(true);
      fetchSubscriptions();
    }
  }, [
    activeTab,
    isFocused,
    globalLoading,
    currentAdmin,
    fetchOrders,
    fetchSubscriptions,
  ]);

  // ── Refresh handlers ──
  const onOrdersRefresh = useCallback(() => {
    setOrdersRefreshing(true);
    fetchOrders();
  }, [fetchOrders]);

  const onSubsRefresh = useCallback(() => {
    setSubsRefreshing(true);
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  // ── Expand toggles ──
  const toggleOrderExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedOrderIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSubExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedSubIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Cancel order ──
  const handleCancelConfirm = async () => {
    if (!cancelTarget) return;
    setCancelLoading(true);
    try {
      await api.adminCancelOrder(cancelTarget.id);
      setAllOrders((prev) =>
        prev.map((o) =>
          o.id === cancelTarget.id
            ? { ...o, status: "cancelled" as OrderStatus }
            : o,
        ),
      );
      setCancelTarget(null);
    } catch (e) {
      console.error("Cancel failed:", e);
    } finally {
      setCancelLoading(false);
    }
  };

  // ── Helpers ──
  const isCancellable = (o: Order) => {
    const s = o.status?.toLowerCase();
    return s !== "delivered" && s !== "cancelled";
  };
  const isDelivered = (o: Order) => o.status?.toLowerCase() === "delivered";
  const isCancelled = (o: Order) => o.status?.toLowerCase() === "cancelled";

  const getItemSummary = (items: Order["items"]) => {
    if (!items?.length) return "No items";
    return items
      .map((i) =>
        i.quantity ? `${i.product_name} ×${i.quantity}` : i.product_name,
      )
      .join("  ·  ");
  };

  // ── Client-side filtering ──
  const filteredOrders = allOrders.filter((o) => {
    if (orderFilter === "ALL") return true;
    const s = o.status?.toLowerCase();
    if (orderFilter === "DELIVERED") return s === "delivered";
    if (orderFilter === "PENDING")
      return s !== "delivered" && s !== "cancelled";
    return true;
  });

  const filteredSubs = allSubscriptions.filter((s) => {
    if (subFilter === "ACTIVE") return s.is_active === true;
    if (subFilter === "INACTIVE") return s.is_active === false;
    return true;
  });

  const tabCount =
    activeTab === "orders" ? filteredOrders.length : filteredSubs.length;
  const ordersCount = allOrders.filter((o) => {
    const s = o.status?.toLowerCase();
    return s !== "delivered" && s !== "cancelled";
  }).length;

  if (globalLoading) return <LoadingScreen />;

  const tabIndicatorLeft = tabAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["2%", "52%"],
  });

  // ── Render order card ──
  const renderOrder = ({ item }: { item: Order }) => {
    const sc =
      statusConfig[item.status?.toLowerCase()] ?? statusConfig["unassigned"];
    const expanded = expandedOrderIds.has(item.id);
    const delivered = isDelivered(item);
    const cancelled = isCancelled(item);
    const cancellable = isCancellable(item);

    return (
      <View style={[styles.card, cancelled && styles.cardCancelled]}>
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => toggleOrderExpand(item.id)}
          style={styles.summary}
        >
          {/* Header row */}
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

          {/* Customer name */}
          {item.customer_name && (
            <View style={styles.customerRow}>
              <Ionicons name="person-outline" size={12} color="#8B6854" />
              <Text style={styles.customerText}>{item.customer_name}</Text>
            </View>
          )}

          {/* ── Item summary: show all product names cleanly ── */}
          <View style={styles.itemTagsRow}>
            {item.items?.map((p, i) => (
              <View
                key={i}
                style={[styles.itemTag, cancelled && styles.itemTagCancelled]}
              >
                <Text
                  style={[styles.itemTagText, cancelled && { color: "#bbb" }]}
                  numberOfLines={1}
                >
                  {p.product_name}
                  {p.quantity != null ? ` ×${p.quantity}` : ""}
                </Text>
              </View>
            ))}
          </View>

          {/* Footer */}
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
            ) : (
              <View style={styles.otpPill}>
                <Ionicons name="time-outline" size={13} color="#FFBF55" />
                <Text
                  style={[
                    styles.otpPillLabel,
                    { color: "#FFBF55", marginLeft: 4 },
                  ]}
                >
                  Pending
                </Text>
              </View>
            )}

            <View style={styles.footerRight}>
              {item.total_amount !== undefined && (
                <Text
                  style={[styles.summaryAmount, cancelled && { color: "#bbb" }]}
                >
                  ₹{item.total_amount}
                </Text>
              )}
              {cancellable && (
                <TouchableOpacity
                  style={styles.cancelChip}
                  onPress={() => setCancelTarget(item)}
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

        {/* Expanded detail */}
        {expanded && (
          <View style={styles.expandedSection}>
            <View style={styles.divider} />

            {(item.delivery_date || item.delivery_slot) && (
              <View style={styles.detailRow}>
                <Ionicons name="calendar-outline" size={13} color="#8B6854" />
                <Text style={styles.detailText}>
                  {item.delivery_date}
                  {item.delivery_slot ? `  ·  ${item.delivery_slot}` : ""}
                </Text>
              </View>
            )}

            <View style={styles.twoCol}>
              <View style={styles.col}>
                <Text style={styles.colLabel}>CUSTOMER</Text>
                <Text style={styles.colName}>{item.customer_name ?? "—"}</Text>
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
            {/* ── Expanded items: clean card layout ── */}
            <View style={styles.expandedItemsCard}>
              {item.items?.map((p, i) => (
                <View
                  key={i}
                  style={[
                    styles.expandedItemRow,
                    i > 0 && styles.expandedItemBorder,
                  ]}
                >
                  <View style={styles.expandedItemDot} />
                  <Text style={styles.expandedItemName}>{p.product_name}</Text>
                  {p.quantity != null && (
                    <View style={styles.expandedItemQtyBadge}>
                      <Text style={styles.expandedItemQty}>×{p.quantity}</Text>
                    </View>
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
                    <Text style={styles.otpLabel}>PICKUP OTP</Text>
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

  const renderSubscription = ({ item }: { item: Subscription }) => (
    <SubscriptionRow
      item={item}
      expanded={expandedSubIds.has(item.id)}
      onToggle={() => toggleSubExpand(item.id)}
      onViewDetail={() => setSelectedSub(item)}
      productNames={productNames}
    />
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <CancelModal
        visible={!!cancelTarget}
        order={cancelTarget}
        onConfirm={handleCancelConfirm}
        onDismiss={() => !cancelLoading && setCancelTarget(null)}
        loading={cancelLoading}
      />

      <SubscriptionDetailModal
        visible={!!selectedSub}
        subscription={selectedSub}
        productNames={productNames}
        onDismiss={() => setSelectedSub(null)}
      />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>
            {activeTab === "orders" ? "Orders" : "Subscriptions"}
          </Text>
          {activeTab === "orders" && ordersCount > 0 && (
            <View style={styles.urgentBadge}>
              <Text style={styles.urgentBadgeText}>{ordersCount} pending</Text>
            </View>
          )}
          {activeTab === "subscriptions" && resolvingNames && (
            <ActivityIndicator
              size="small"
              color="#FF9675"
              style={{ marginLeft: 8 }}
            />
          )}
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{tabCount}</Text>
        </View>
      </View>

      {/* Tab Switcher */}
      <View style={tabStyles.tabContainer}>
        <Animated.View
          style={[tabStyles.tabIndicator, { left: tabIndicatorLeft }]}
        />
        <TouchableOpacity
          style={tabStyles.tabBtn}
          onPress={() => switchTab("orders")}
          activeOpacity={0.8}
        >
          <Ionicons
            name="receipt-outline"
            size={14}
            color={activeTab === "orders" ? "#fff" : "#8B6854"}
          />
          <Text
            style={[
              tabStyles.tabText,
              activeTab === "orders" && tabStyles.tabTextActive,
            ]}
          >
            Orders
          </Text>
          {ordersCount > 0 && activeTab !== "orders" && (
            <View style={tabStyles.tabDot} />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={tabStyles.tabBtn}
          onPress={() => switchTab("subscriptions")}
          activeOpacity={0.8}
        >
          <Ionicons
            name="repeat-outline"
            size={14}
            color={activeTab === "subscriptions" ? "#fff" : "#8B6854"}
          />
          <Text
            style={[
              tabStyles.tabText,
              activeTab === "subscriptions" && tabStyles.tabTextActive,
            ]}
          >
            Subscriptions
          </Text>
        </TouchableOpacity>
      </View>

      {/* Orders Tab */}
      {activeTab === "orders" && (
        <>
          <View style={styles.filterRow}>
            {ORDER_FILTERS.map((f) => (
              <TouchableOpacity
                key={f}
                style={[
                  styles.filterChip,
                  orderFilter === f && styles.filterChipActive,
                ]}
                onPress={() => setOrderFilter(f)}
              >
                <Text
                  style={[
                    styles.filterText,
                    orderFilter === f && styles.filterTextActive,
                  ]}
                >
                  {f}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {ordersLoading && !ordersRefreshing ? (
            <View style={styles.loadingWrapper}>
              <ActivityIndicator size="large" color="#FF9675" />
              <Text style={styles.loadingText}>Loading orders…</Text>
            </View>
          ) : (
            <FlatList
              data={filteredOrders}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={ordersRefreshing}
                  onRefresh={onOrdersRefresh}
                  tintColor="#FF9675"
                />
              }
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <View style={styles.emptyIconCircle}>
                    <Ionicons
                      name="receipt-outline"
                      size={36}
                      color="#FF9675"
                    />
                  </View>
                  <Text style={styles.emptyTitle}>No orders found</Text>
                  <Text style={styles.emptyDesc}>
                    {orderFilter !== "ALL"
                      ? `No ${orderFilter.toLowerCase()} orders. Try a different filter.`
                      : "One-time orders placed by your customers will appear here."}
                  </Text>
                </View>
              }
              renderItem={renderOrder}
            />
          )}
        </>
      )}

      {/* Subscriptions Tab */}
      {activeTab === "subscriptions" && (
        <>
          <View style={styles.filterRow}>
            {(["ALL", "ACTIVE", "INACTIVE"] as const).map((f) => (
              <TouchableOpacity
                key={f}
                style={[
                  styles.filterChip,
                  subFilter === f && styles.filterChipActive,
                ]}
                onPress={() => setSubFilter(f)}
              >
                <Text
                  style={[
                    styles.filterText,
                    subFilter === f && styles.filterTextActive,
                  ]}
                >
                  {f}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {subsLoading && !subsRefreshing ? (
            <View style={styles.loadingWrapper}>
              <ActivityIndicator size="large" color="#FF9675" />
              <Text style={styles.loadingText}>Loading subscriptions…</Text>
            </View>
          ) : (
            <FlatList
              data={filteredSubs}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={subsRefreshing}
                  onRefresh={onSubsRefresh}
                  tintColor="#FF9675"
                />
              }
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <View style={styles.emptyIconCircle}>
                    <Ionicons name="repeat-outline" size={36} color="#FF9675" />
                  </View>
                  <Text style={styles.emptyTitle}>No subscriptions found</Text>
                  <Text style={styles.emptyDesc}>
                    {subFilter !== "ALL"
                      ? `No ${subFilter.toLowerCase()} subscriptions.`
                      : "Recurring subscriptions (daily, alternate, custom) appear here."}
                  </Text>
                </View>
              }
              renderItem={renderSubscription}
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
}

// ─── StyleSheets ──────────────────────────────────────────────────────────────

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
  title: { fontSize: 20, fontWeight: "800", color: "#1A1A1A", marginBottom: 6 },
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
  previewAmount: { fontSize: 15, fontWeight: "800", color: "#FF9675" },
  previewDetail: { flexDirection: "row", alignItems: "center", gap: 6 },
  previewDetailText: {
    fontSize: 12,
    color: "#8B6854",
    fontWeight: "500",
    flex: 1,
  },
  btnRow: { flexDirection: "row", width: "100%", gap: 10 },
  btnCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#F5F0ED",
    alignItems: "center",
    justifyContent: "center",
  },
  btnCancelText: { fontSize: 14, fontWeight: "700", color: "#8B6854" },
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
  btnConfirmText: { fontSize: 14, fontWeight: "800", color: "#fff" },
});

const sm = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "85%",
    paddingBottom: 30,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#FFF0E8",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  patternBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  patternText: { fontSize: 12, fontWeight: "700" },
  subId: { fontSize: 13, fontWeight: "800", color: "#8B6854" },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F5EDE8",
    alignItems: "center",
    justifyContent: "center",
  },
  body: { paddingHorizontal: 20, paddingTop: 4 },
  section: { marginTop: 20 },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#BB6B3F",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#FFF0EB",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  infoMain: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 3,
  },
  phoneRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  phoneText: { fontSize: 12, color: "#8B6854", fontWeight: "500" },
  scheduleGrid: { gap: 10 },
  scheduleItem: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  scheduleKey: {
    fontSize: 10,
    color: "#8B6854",
    fontWeight: "600",
    marginBottom: 1,
  },
  scheduleVal: { fontSize: 13, color: "#1A1A1A", fontWeight: "600" },
  daysRow: { flexDirection: "row", gap: 6, marginTop: 12, flexWrap: "wrap" },
  dayChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#F5EDE8",
  },
  dayChipActive: { backgroundColor: "#FF9675" },
  dayChipText: { fontSize: 11, fontWeight: "700", color: "#8B6854" },
  dayChipTextActive: { color: "#fff" },
  // ── items card (modal) ──
  itemsCard: {
    backgroundColor: "#FFF8F4",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#FFE8DC",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  itemRowBorder: { borderTopWidth: 1, borderTopColor: "#FFE8DC" },
  itemDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#FF9675",
    marginRight: 10,
  },
  itemNameWrap: { flex: 1 },
  itemName: { fontSize: 13, fontWeight: "600", color: "#1A1A1A" },
  itemUnitPrice: { fontSize: 11, color: "#8B6854", marginTop: 2 },
  itemRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  itemQtyBadge: {
    backgroundColor: "#F5EDE8",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  itemQty: { fontSize: 12, color: "#8B6854", fontWeight: "700" },
  itemPrice: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FF9675",
    minWidth: 48,
    textAlign: "right",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1.5,
    borderTopColor: "#FFE8DC",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  totalLabel: { fontSize: 12, fontWeight: "700", color: "#8B6854" },
  totalVal: { fontSize: 17, fontWeight: "800", color: "#1A1A1A" },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    padding: 12,
    marginTop: 20,
    marginBottom: 6,
  },
  statusText: { fontSize: 13, fontWeight: "700" },
});

const tabStyles = StyleSheet.create({
  tabContainer: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: "#F5EDE8",
    borderRadius: 16,
    padding: 4,
    position: "relative",
    height: 44,
  },
  tabIndicator: {
    position: "absolute",
    top: 4,
    width: "46%",
    height: 36,
    backgroundColor: "#FF9675",
    borderRadius: 12,
    shadowColor: "#FF9675",
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    zIndex: 1,
  },
  tabText: { fontSize: 14, fontWeight: "700", color: "#8B6854" },
  tabTextActive: { color: "#fff" },
  tabDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#FF5C5C",
    marginLeft: -2,
  },
});

const ss = StyleSheet.create({
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
  cardInactive: { backgroundColor: "#FDFAFA", shadowOpacity: 0.03 },
  summary: { padding: 16 },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  idRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  subId: { fontSize: 15, fontWeight: "800", color: "#1A1A1A" },
  subItemCount: {
    fontSize: 11,
    color: "#8B6854",
    fontWeight: "500",
    marginTop: 1,
  },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  patternPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  patternText: { fontSize: 11, fontWeight: "700" },
  inactivePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: "#FFF0F0",
  },
  inactivePillText: { fontSize: 10, fontWeight: "700", color: "#FF5C5C" },
  customerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  customerText: { fontSize: 13, color: "#8B6854", fontWeight: "500" },
  customerPhone: { fontSize: 12, color: "#FFBF55", fontWeight: "500" },
  // ── item summary strip ──
  itemSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFF8F0",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 10,
  },
  itemSummaryText: {
    flex: 1,
    fontSize: 12,
    color: "#BB6B3F",
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  datesRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  dateBit: { flexDirection: "row", alignItems: "center", gap: 4 },
  dateText: { fontSize: 12, color: "#8B6854", fontWeight: "500" },
  dateSep: {
    fontSize: 11,
    color: "#FFBF55",
    fontWeight: "700",
    marginHorizontal: 2,
  },
  amountText: { fontSize: 16, fontWeight: "800", color: "#1A1A1A" },
  // ── expanded ──
  expanded: { paddingHorizontal: 16, paddingBottom: 16 },
  divider: { height: 1, backgroundColor: "#FFF0E8", marginVertical: 12 },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#BB6B3F",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  // ── slot ──
  slotRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  slotIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: "#FFF0EB",
    alignItems: "center",
    justifyContent: "center",
  },
  slotLabel: {
    fontSize: 10,
    color: "#8B6854",
    fontWeight: "600",
    marginBottom: 1,
  },
  slotText: { fontSize: 13, color: "#1A1A1A", fontWeight: "600" },
  // ── days chips ──
  daysRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  dayChip: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#F5EDE8",
    alignItems: "center",
    justifyContent: "center",
  },
  dayChipActive: { backgroundColor: "#FF9675" },
  dayText: { fontSize: 11, fontWeight: "700", color: "#8B6854" },
  dayTextActive: { color: "#fff" },
  // ── items card (expanded in row) ──
  itemsCard: {
    backgroundColor: "#FFF8F4",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#FFE8DC",
  },
  itemCardRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 12,
  },
  itemCardBorder: { borderTopWidth: 1, borderTopColor: "#FFE8DC" },
  itemCardLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  itemIndexBubble: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#FF967520",
    alignItems: "center",
    justifyContent: "center",
  },
  itemIndexText: { fontSize: 10, fontWeight: "800", color: "#FF9675" },
  itemCardInfo: { flex: 1 },
  itemCardName: { fontSize: 13, fontWeight: "700", color: "#1A1A1A" },
  itemCardPricePerUnit: { fontSize: 11, color: "#8B6854", marginTop: 2 },
  itemCardRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  itemCardQtyBadge: {
    backgroundColor: "#F5EDE8",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  itemCardQty: { fontSize: 12, color: "#8B6854", fontWeight: "700" },
  itemCardAmount: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FF9675",
    minWidth: 48,
    textAlign: "right",
  },
  itemsTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1.5,
    borderTopColor: "#FFE8DC",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  itemsTotalLabel: { fontSize: 12, fontWeight: "700", color: "#8B6854" },
  itemsTotalVal: { fontSize: 16, fontWeight: "800", color: "#1A1A1A" },
  // ── detail button ──
  detailBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#FFF0EB",
    borderWidth: 1,
    borderColor: "#FFE0D4",
  },
  detailBtnText: { fontSize: 14, fontWeight: "700", color: "#FF9675" },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF8F4" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1A1A1A",
    letterSpacing: -0.5,
  },
  urgentBadge: {
    backgroundColor: "#FF5C5C15",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FF5C5C30",
  },
  urgentBadgeText: { fontSize: 11, fontWeight: "700", color: "#FF5C5C" },
  countBadge: {
    backgroundColor: "#FF967520",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  countText: { fontSize: 13, fontWeight: "800", color: "#FF9675" },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 14,
    flexWrap: "wrap",
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
  cardCancelled: { backgroundColor: "#FDFAFA", shadowOpacity: 0.03 },
  summary: { padding: 16 },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
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
  customerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  customerText: { fontSize: 13, color: "#8B6854", fontWeight: "500" },
  // ── item tags (order card) ──
  itemTagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },
  itemTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF3E8",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#FFE4CC",
  },
  itemTagCancelled: { backgroundColor: "#F8F8F8", borderColor: "#E8E8E8" },
  itemTagText: { fontSize: 12, fontWeight: "600", color: "#BB6B3F" },
  summaryFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  footerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
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
  // ── expanded order ──
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
  // ── expanded items card (orders) ──
  expandedItemsCard: {
    backgroundColor: "#FFF8F4",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#FFE8DC",
    marginTop: 8,
  },
  expandedItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
  },
  expandedItemBorder: { borderTopWidth: 1, borderTopColor: "#FFE8DC" },
  expandedItemDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#FF9675",
  },
  expandedItemName: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  expandedItemQtyBadge: {
    backgroundColor: "#F5EDE8",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  expandedItemQty: { fontSize: 12, color: "#8B6854", fontWeight: "700" },
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
  loadingWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    gap: 12,
  },
  loadingText: { fontSize: 14, color: "#8B6854", fontWeight: "500" },
  emptyState: {
    alignItems: "center",
    paddingTop: 80,
    gap: 10,
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFF0EB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  emptyTitle: { fontSize: 17, fontWeight: "800", color: "#1A1A1A" },
  emptyDesc: {
    fontSize: 13,
    color: "#8B6854",
    textAlign: "center",
    lineHeight: 20,
  },
});
