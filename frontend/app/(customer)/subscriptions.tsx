// orders.tsx — fixed: cancel now uses DELETE /orders/{order_id} directly

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
  Animated,
  Vibration,
  Easing,
  Platform,
  UIManager,
  LayoutAnimation,
  Alert,
  FlatList,
} from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../src/services/api";
import { Colors } from "../../src/constants/colors";
import LoadingScreen from "../../src/components/LoadingScreen";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrderItem {
  product_id: string;
  name?: string;
  quantity: number;
  price: number;
  amount: number;
}

interface Order {
  id: string;
  subscription_id?: string;
  user_id: string;
  admin_id?: string;
  admin_name?: string;
  items: OrderItem[];
  delivery_otp?: string;
  total_amount: number;
  status: string;
  delivery_date: string;
  pattern?: string;
  created_at?: string;
  updated_at?: string;
  assigned_at?: string;
  delivery_partner_id?: string;
  delivery_partner_name?: string;
  delivery_partner_phone?: string;
  product?: { id: string; name: string; price: number; unit: string };
  quantity?: number;
  product_name?: string;
  payment_method?: string;
  payment_status?: string;
  razorpay_payment_id?: string;
}

interface ProductMap {
  [productId: string]: { name: string; unit: string };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatDate(s: string): string {
  if (!s) return "—";
  const d = new Date(s + "T00:00:00");
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

function formatTime(iso: string): string {
  if (!iso) return "";
  try {
    const s = iso.endsWith("Z") || iso.includes("+") ? iso : iso + "Z";
    return new Date(s).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    });
  } catch {
    return "";
  }
}

function getProductName(order: Order, productMap: ProductMap): string {
  if (order.product_name) return order.product_name;
  if (order.product?.name) return order.product.name;
  if (order.items?.length > 0) {
    const first = order.items[0];
    if (first.name) {
      return order.items.length === 1
        ? first.name
        : `${first.name} +${order.items.length - 1} more`;
    }
    if (productMap[first.product_id]?.name) {
      return order.items.length === 1
        ? productMap[first.product_id].name
        : `${productMap[first.product_id].name} +${order.items.length - 1} more`;
    }
    return order.items.length === 1
      ? "Order Item"
      : `${order.items.length} Items`;
  }
  return "Order";
}

function getTotalQty(order: Order): number {
  if (order.items?.length > 0)
    return order.items.reduce((s, i) => s + i.quantity, 0);
  return order.quantity ?? 1;
}

function getPaymentLabel(method?: string): string {
  switch ((method || "wallet").toLowerCase()) {
    case "online":
      return "Online";
    case "cash_on_delivery":
    case "cod":
      return "Cash on Delivery";
    case "wallet":
      return "Wallet";
    default:
      return "Payment";
  }
}

// ─── Delivery badge ───────────────────────────────────────────────────────────

interface DeliveryBadge {
  text: string;
  icon: string;
  color: string;
  bg: string;
  borderColor: string;
}

function getDeliveryBadge(order: Order): DeliveryBadge | null {
  const refTime = order.updated_at || order.assigned_at || order.created_at;
  if (order.status === "assigned") {
    const assignedAt = refTime ? new Date(refTime).getTime() : Date.now();
    const remaining = Math.max(
      0,
      Math.round((assignedAt + 15 * 60 * 1000 - Date.now()) / 60000),
    );
    return {
      text: remaining <= 0 ? "Arriving now" : `~${remaining} min`,
      icon: "bicycle-outline",
      color: "#2563EB",
      bg: "#EFF6FF",
      borderColor: "#BFDBFE",
    };
  }
  if (order.status === "out_for_delivery") {
    const startedAt = refTime ? new Date(refTime).getTime() : Date.now();
    const remaining = Math.max(
      0,
      Math.round((startedAt + 10 * 60 * 1000 - Date.now()) / 60000),
    );
    return {
      text: remaining <= 0 ? "Arriving now" : `~${remaining} min`,
      icon: "navigate-outline",
      color: "#7C3AED",
      bg: "#F5F3FF",
      borderColor: "#DDD6FE",
    };
  }
  if (order.status === "delivered") {
    const t = refTime ? formatTime(refTime) : "";
    return {
      text: t ? `Delivered ${t}` : "Delivered",
      icon: "checkmark-circle-outline",
      color: "#16A34A",
      bg: "#F0FDF4",
      borderColor: "#BBF7D0",
    };
  }
  return null;
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_META: Record<
  string,
  { label: string; color: string; bg: string; icon: string; step: number }
> = {
  unassigned: {
    label: "Pending",
    color: "#D97706",
    bg: "#FEF3C7",
    icon: "time-outline",
    step: 1,
  },
  assigned: {
    label: "Rider Assigned",
    color: "#2563EB",
    bg: "#EFF6FF",
    icon: "bicycle-outline",
    step: 2,
  },
  out_for_delivery: {
    label: "On the Way",
    color: "#7C3AED",
    bg: "#F5F3FF",
    icon: "navigate-outline",
    step: 3,
  },
  delivered: {
    label: "Delivered",
    color: "#16A34A",
    bg: "#F0FDF4",
    icon: "checkmark-circle",
    step: 4,
  },
  cancelled: {
    label: "Cancelled",
    color: "#DC2626",
    bg: "#FEF2F2",
    icon: "close-circle-outline",
    step: 0,
  },
  skipped: {
    label: "Skipped",
    color: "#9CA3AF",
    bg: "#F3F4F6",
    icon: "play-skip-forward-outline",
    step: 0,
  },
};
function getMeta(status: string) {
  return STATUS_META[status] ?? STATUS_META.unassigned;
}

// ─── Summary bar ──────────────────────────────────────────────────────────────

function SummaryBar({ orders }: { orders: Order[] }) {
  const active = orders.filter(
    (o) => !["delivered", "cancelled", "skipped"].includes(o.status),
  ).length;
  const delivered = orders.filter((o) => o.status === "delivered").length;
  const cancelled = orders.filter((o) =>
    ["cancelled", "skipped"].includes(o.status),
  ).length;
  return (
    <View style={smS.wrap}>
      <View style={smS.row}>
        <View style={smS.pill}>
          <Text style={smS.n}>{orders.length}</Text>
          <Text style={smS.l}> Total</Text>
        </View>
        {active > 0 && (
          <View
            style={[
              smS.pill,
              { backgroundColor: "#EFF6FF", borderColor: "#2563EB40" },
            ]}
          >
            <View style={[smS.dot, { backgroundColor: "#2563EB" }]} />
            <Text style={[smS.n, { color: "#2563EB" }]}> {active}</Text>
            <Text style={[smS.l, { color: "#2563EBCC" }]}> Active</Text>
          </View>
        )}
        {delivered > 0 && (
          <View
            style={[
              smS.pill,
              { backgroundColor: "#F0FDF4", borderColor: "#16A34A40" },
            ]}
          >
            <View style={[smS.dot, { backgroundColor: "#16A34A" }]} />
            <Text style={[smS.n, { color: "#16A34A" }]}> {delivered}</Text>
            <Text style={[smS.l, { color: "#16A34ACC" }]}> Delivered</Text>
          </View>
        )}
        {cancelled > 0 && (
          <View
            style={[
              smS.pill,
              { backgroundColor: "#FEF2F2", borderColor: "#DC262640" },
            ]}
          >
            <View style={[smS.dot, { backgroundColor: "#DC2626" }]} />
            <Text style={[smS.n, { color: "#DC2626" }]}> {cancelled}</Text>
            <Text style={[smS.l, { color: "#DC2626CC" }]}> Cancelled</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const smS = StyleSheet.create({
  wrap: {
    borderBottomWidth: 1,
    borderBottomColor: "#EBEBEB",
    backgroundColor: "#fff",
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 14,
    paddingVertical: 7,
    gap: 6,
    alignItems: "center",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderColor: "#E5E7EB",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dot: { width: 5, height: 5, borderRadius: 3 },
  n: { fontSize: 12, fontWeight: "800", color: "#374151" },
  l: { fontSize: 11, fontWeight: "600", color: "#6B7280" },
});

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <View style={sh.wrap}>
      <View style={sh.line} />
      <Text style={sh.label}>{label}</Text>
      <View style={sh.line} />
    </View>
  );
}
const sh = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  line: { flex: 1, height: 1, backgroundColor: "#E5E7EB" },
  label: {
    fontSize: 10,
    fontWeight: "800",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
});

// ─── Delivery badge view ──────────────────────────────────────────────────────

function DeliveryBadgeView({ badge }: { badge: DeliveryBadge }) {
  return (
    <View
      style={[
        db.wrap,
        { backgroundColor: badge.bg, borderColor: badge.borderColor },
      ]}
    >
      <Ionicons name={badge.icon as any} size={10} color={badge.color} />
      <Text style={[db.txt, { color: badge.color }]}>{badge.text}</Text>
    </View>
  );
}
const db = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  txt: { fontSize: 10, fontWeight: "700" },
});

// ─── Progress bar ─────────────────────────────────────────────────────────────

const STEPS = ["Placed", "Assigned", "On Way", "Delivered"];

function DeliveryProgress({ status }: { status: string }) {
  const meta = getMeta(status);
  if (["cancelled", "skipped"].includes(status)) return null;
  return (
    <View style={pg.wrap}>
      {STEPS.map((label, i) => {
        const done = meta.step > i + 1;
        const active = meta.step === i + 1;
        const dotBg = done || active ? meta.color : "#E5E7EB";
        return (
          <React.Fragment key={label}>
            <View style={pg.step}>
              <View
                style={[pg.dot, { backgroundColor: dotBg, borderColor: dotBg }]}
              >
                {done && <Ionicons name="checkmark" size={9} color="#fff" />}
                {active && <View style={pg.pulse} />}
              </View>
              <Text
                style={[
                  pg.label,
                  (done || active) && { color: meta.color, fontWeight: "700" },
                ]}
              >
                {label}
              </Text>
            </View>
            {i < STEPS.length - 1 && (
              <View
                style={[
                  pg.line,
                  { backgroundColor: done ? meta.color : "#E5E7EB" },
                ]}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}
const pg = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 8,
    marginBottom: 4,
  },
  step: { alignItems: "center", gap: 4 },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  pulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#fff" },
  label: {
    fontSize: 9,
    color: "#9CA3AF",
    fontWeight: "500",
    textAlign: "center",
    width: 48,
  },
  line: { flex: 1, height: 2, marginTop: 9, borderRadius: 2 },
});

// ─── OTP block ────────────────────────────────────────────────────────────────

function OTPBlock({ otp }: { otp: string }) {
  const pulse = useRef(new Animated.Value(1)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.04,
          duration: 850,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 850,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);
  return (
    <Animated.View style={[oS.wrap, { opacity: fadeIn }]}>
      <View style={oS.header}>
        <Ionicons
          name="shield-checkmark-outline"
          size={13}
          color={Colors.primary}
        />
        <Text style={oS.headerTxt}>Delivery OTP</Text>
        <Text style={oS.headerSub}>Share with rider</Text>
      </View>
      <Animated.Text style={[oS.otp, { transform: [{ scale: pulse }] }]}>
        {otp}
      </Animated.Text>
    </Animated.View>
  );
}
const oS = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.primary + "0C",
    borderWidth: 1.5,
    borderColor: Colors.primary + "30",
    borderRadius: 14,
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 6,
  },
  headerTxt: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  headerSub: {
    fontSize: 10,
    color: Colors.primary + "99",
    fontWeight: "500",
    marginLeft: 4,
  },
  otp: {
    fontSize: 40,
    fontWeight: "900",
    color: Colors.primary,
    letterSpacing: 10,
  },
});

// ─── Detail cell ──────────────────────────────────────────────────────────────

function DetailCell({
  label,
  value,
  accent,
  mono,
}: {
  label: string;
  value: string;
  accent?: boolean;
  mono?: boolean;
}) {
  return (
    <View style={dc.cell}>
      <Text style={dc.label}>{label}</Text>
      <Text
        style={[
          dc.value,
          accent && { color: Colors.primary },
          mono && {
            fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
          },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}
const dc = StyleSheet.create({
  cell: {
    width: "48%",
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    padding: 10,
  },
  label: {
    fontSize: 9,
    color: "#9CA3AF",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 3,
  },
  value: { fontSize: 13, fontWeight: "800", color: "#111" },
});

// ─── Order Card ───────────────────────────────────────────────────────────────

function OrderCard({
  order,
  index,
  productMap,
  onCancelPress,
}: {
  order: Order;
  index: number;
  productMap: ProductMap;
  onCancelPress: (order: Order) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [badge, setBadge] = useState<DeliveryBadge | null>(() =>
    getDeliveryBadge(order),
  );
  const chevron = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(24)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const t = setTimeout(() => {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 14,
          stiffness: 140,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }),
      ]).start();
    }, index * 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!["assigned", "out_for_delivery"].includes(order.status)) return;
    const iv = setInterval(() => setBadge(getDeliveryBadge(order)), 30_000);
    return () => clearInterval(iv);
  }, [order.status, order.updated_at]);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Animated.sequence([
      Animated.timing(cardScale, {
        toValue: 0.987,
        duration: 80,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
      Animated.spring(cardScale, {
        toValue: 1,
        useNativeDriver: true,
        damping: 12,
        stiffness: 300,
      }),
    ]).start();
    Animated.timing(chevron, {
      toValue: expanded ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    setExpanded((e) => !e);
  };

  const meta = getMeta(order.status);
  const isActive = !["delivered", "cancelled", "skipped"].includes(
    order.status,
  );
  const isCancelled = ["cancelled", "skipped"].includes(order.status);
  const productName = getProductName(order, productMap);
  const totalQty = getTotalQty(order);
  const adminName =
    order.admin_name ||
    (order.admin_id ? `Store ${order.admin_id.slice(-4)}` : "");
  const pattern =
    order.pattern === "buy_once" ? "One-time" : (order.pattern ?? "");
  const chevronRot = chevron.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  return (
    <Animated.View
      style={[
        cd.wrapper,
        isCancelled && { opacity: 0.6 },
        { opacity, transform: [{ translateY }, { scale: cardScale }] },
      ]}
    >
      <View style={[cd.stripe, { backgroundColor: meta.color }]} />

      <TouchableOpacity style={cd.top} onPress={toggle} activeOpacity={0.88}>
        <View style={[cd.iconBox, { backgroundColor: meta.bg }]}>
          <Ionicons name={meta.icon as any} size={20} color={meta.color} />
        </View>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={cd.productName} numberOfLines={1}>
            {productName}
          </Text>
          <View style={cd.metaRow}>
            <Text style={cd.dateText}>{formatDate(order.delivery_date)}</Text>
            {badge && (
              <>
                <View style={cd.dotSep} />
                <DeliveryBadgeView badge={badge} />
              </>
            )}
          </View>
          <View
            style={[
              cd.statusBadge,
              { backgroundColor: meta.bg, borderColor: meta.color + "40" },
            ]}
          >
            <View style={[cd.statusDot, { backgroundColor: meta.color }]} />
            <Text style={[cd.statusTxt, { color: meta.color }]}>
              {meta.label}
            </Text>
          </View>
        </View>

        <View style={{ alignItems: "flex-end", gap: 6 }}>
          <Text style={cd.amount}>₹{order.total_amount?.toFixed(2)}</Text>
          {order.delivery_otp && isActive && (
            <View
              style={[
                cd.otpPill,
                {
                  borderColor: Colors.primary + "40",
                  backgroundColor: Colors.primary + "0F",
                },
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={9}
                color={Colors.primary}
              />
              <Text style={[cd.otpPillTxt, { color: Colors.primary }]}>
                {order.delivery_otp}
              </Text>
            </View>
          )}
          <Animated.View style={{ transform: [{ rotate: chevronRot }] }}>
            <Ionicons name="chevron-down" size={17} color="#C4C4C4" />
          </Animated.View>
        </View>
      </TouchableOpacity>

      <View style={cd.divider} />

      {expanded && (
        <View style={cd.expanded}>
          <DeliveryProgress status={order.status} />

          <View style={cd.sectionLabel}>
            <Ionicons name="cube-outline" size={11} color="#9CA3AF" />
            <Text style={cd.sectionLabelTxt}>Order Details</Text>
          </View>

          <View style={cd.detailGrid}>
            <DetailCell
              label="Total Qty"
              value={`${totalQty} unit${totalQty !== 1 ? "s" : ""}`}
            />
            <DetailCell
              label="Amount"
              value={`₹${order.total_amount?.toFixed(2)}`}
              accent
            />
            <DetailCell
              label="Delivery"
              value={formatDate(order.delivery_date)}
            />
            {pattern !== "" && <DetailCell label="Type" value={pattern} />}
            <DetailCell
              label="Payment"
              value={`${getPaymentLabel(order.payment_method)} · ${order.payment_status || "pending"}`}
            />
            <DetailCell
              label="Order #"
              value={`#${order.id.slice(-8).toUpperCase()}`}
              mono
            />
            {order.created_at && (
              <DetailCell label="Placed" value={formatTime(order.created_at)} />
            )}
          </View>

          {order.items?.length > 1 && (
            <>
              <View style={cd.sectionLabel}>
                <Ionicons name="list-outline" size={11} color="#9CA3AF" />
                <Text style={cd.sectionLabelTxt}>Items</Text>
              </View>
              <View style={cd.itemsList}>
                {order.items.map((item, idx) => (
                  <View key={idx} style={cd.itemRow}>
                    <Text style={cd.itemQty}>{item.quantity}×</Text>
                    <Text style={cd.itemName} numberOfLines={1}>
                      {item.name ||
                        productMap[item.product_id]?.name ||
                        `Item ${idx + 1}`}
                    </Text>
                    <Text style={cd.itemAmt}>₹{item.amount?.toFixed(2)}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {adminName !== "" && (
            <View style={cd.storeRow}>
              <View style={cd.storeIcon}>
                <Ionicons name="storefront-outline" size={14} color="#6366F1" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={cd.storeLabel}>Fulfilled by</Text>
                <Text style={cd.storeName}>{adminName}</Text>
              </View>
              {order.created_at && (
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={cd.storeLabel}>Ordered</Text>
                  <Text style={cd.storeTime}>
                    {formatTime(order.created_at)}
                  </Text>
                </View>
              )}
            </View>
          )}

          {order.delivery_partner_name && (
            <View style={cd.riderRow}>
              <View style={cd.riderIcon}>
                <Ionicons name="bicycle-outline" size={16} color="#2563EB" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={cd.riderLabel}>Delivery partner</Text>
                <Text style={cd.riderName}>{order.delivery_partner_name}</Text>
                {order.delivery_partner_phone && (
                  <Text style={cd.riderPhone}>{order.delivery_partner_phone}</Text>
                )}
              </View>
              <View style={cd.riderBadge}>
                <Text style={cd.riderBadgeText}>Assigned</Text>
              </View>
            </View>
          )}

          {order.delivery_otp && isActive && (
            <OTPBlock otp={order.delivery_otp} />
          )}

          {isActive && (
            <TouchableOpacity
              style={cd.cancelBtn}
              onPress={() => onCancelPress(order)}
              activeOpacity={0.8}
            >
              <Ionicons name="close-circle-outline" size={14} color="#EF4444" />
              <Text style={cd.cancelBtnTxt}>Cancel Order</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </Animated.View>
  );
}

const cd = StyleSheet.create({
  wrapper: {
    backgroundColor: "#fff",
    borderRadius: 18,
    marginBottom: 10,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  stripe: { height: 3 },
  top: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  productName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111",
    marginBottom: 3,
    letterSpacing: -0.2,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
    flexWrap: "wrap",
  },
  dateText: { fontSize: 11, color: "#9CA3AF", fontWeight: "600" },
  dotSep: { width: 3, height: 3, borderRadius: 2, backgroundColor: "#D1D5DB" },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusTxt: { fontSize: 10, fontWeight: "700" },
  amount: { fontSize: 15, fontWeight: "900", color: "#111" },
  otpPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  otpPillTxt: { fontSize: 14, fontWeight: "900", letterSpacing: 3 },
  divider: { height: 1, backgroundColor: "#F5F5F5", marginHorizontal: 14 },
  expanded: { paddingHorizontal: 14, paddingBottom: 12, paddingTop: 8 },
  sectionLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 10,
    marginBottom: 6,
  },
  sectionLabelTxt: {
    fontSize: 9,
    fontWeight: "800",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  detailGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginBottom: 2,
  },
  itemsList: {
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    paddingVertical: 4,
    marginBottom: 6,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  itemQty: { fontSize: 12, fontWeight: "800", color: "#6B7280", width: 28 },
  itemName: { flex: 1, fontSize: 12, fontWeight: "700", color: "#111" },
  itemAmt: { fontSize: 12, fontWeight: "800", color: Colors.primary },
  storeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F5F3FF",
    borderRadius: 12,
    padding: 10,
    marginTop: 8,
  },
  storeIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#EDE9FE",
    justifyContent: "center",
    alignItems: "center",
  },
  storeLabel: {
    fontSize: 9,
    color: "#9CA3AF",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  storeName: { fontSize: 13, fontWeight: "700", color: "#111", marginTop: 1 },
  storeTime: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
    marginTop: 1,
  },
  riderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  riderIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#DBEAFE",
    justifyContent: "center",
    alignItems: "center",
  },
  riderLabel: {
    fontSize: 9,
    color: "#2563EB",
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  riderName: { fontSize: 14, fontWeight: "800", color: "#111827", marginTop: 1 },
  riderPhone: { fontSize: 11, fontWeight: "700", color: "#4B5563", marginTop: 1 },
  riderBadge: {
    backgroundColor: "#DBEAFE",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  riderBadgeText: { fontSize: 10, fontWeight: "800", color: "#2563EB" },
  cancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FEF2F2",
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
    marginTop: 8,
  },
  cancelBtnTxt: { fontSize: 13, fontWeight: "700", color: "#EF4444" },
});

// ─── Cancel Modal ─────────────────────────────────────────────────────────────

function CancelModal({
  visible,
  order,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  order: Order | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const scale = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) {
      scale.setValue(0.85);
      opacity.setValue(0);
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          damping: 14,
          stiffness: 200,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const isBuyOnce = order?.pattern === "buy_once" || !order?.subscription_id;
  const bodyText = isBuyOnce
    ? "This will cancel the order and any charged amount will be refunded to your wallet."
    : "This cancels today's delivery. Your subscription continues for future dates.";

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={cm.overlay}>
        <Animated.View style={[cm.card, { opacity, transform: [{ scale }] }]}>
          <View style={cm.iconCircle}>
            <Ionicons name="alert-circle-outline" size={32} color="#EF4444" />
          </View>
          <Text style={cm.title}>Cancel Order?</Text>
          <Text style={cm.body}>{bodyText}</Text>
          <View style={cm.btnRow}>
            <TouchableOpacity
              style={cm.keepBtn}
              onPress={onCancel}
              activeOpacity={0.8}
            >
              <Text style={cm.keepTxt}>Keep it</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={cm.cancelBtn}
              onPress={onConfirm}
              activeOpacity={0.8}
            >
              <Text style={cm.cancelTxt}>Yes, Cancel</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
const cm = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.52)",
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 26,
    width: "100%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 12,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FEF2F2",
    borderWidth: 2,
    borderColor: "#FECACA",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111",
    marginBottom: 8,
    textAlign: "center",
  },
  body: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 22,
  },
  btnRow: { flexDirection: "row", gap: 10, width: "100%" },
  keepBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  keepTxt: { fontSize: 14, fontWeight: "700", color: "#374151" },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: "#EF4444",
    alignItems: "center",
  },
  cancelTxt: { fontSize: 14, fontWeight: "800", color: "#fff" },
});

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <View style={em.wrap}>
      <View style={em.iconBox}>
        <Ionicons name="receipt-outline" size={36} color={Colors.primary} />
      </View>
      <Text style={em.title}>No orders yet</Text>
      <Text style={em.body}>Your order history will appear here.</Text>
    </View>
  );
}
const em = StyleSheet.create({
  wrap: { alignItems: "center", paddingTop: 64, paddingHorizontal: 32 },
  iconBox: {
    width: 76,
    height: 76,
    borderRadius: 22,
    backgroundColor: Colors.primary + "12",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    color: "#374151",
    marginBottom: 6,
    textAlign: "center",
  },
  body: { fontSize: 13, color: "#9CA3AF", textAlign: "center", lineHeight: 20 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function OrdersScreen() {
  const isFocused = useIsFocused();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [productMap, setProductMap] = useState<ProductMap>({});
  const [cancelOrder, setCancelOrder] = useState<Order | null>(null);
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const fetchingOrdersRef = useRef(false);

  const headerY = useRef(new Animated.Value(-20)).current;
  const headerOp = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(headerY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 14,
        stiffness: 160,
      }),
      Animated.timing(headerOp, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const loadProductMap = useCallback(async () => {
    try {
      const products = await api.getCatalogProducts();
      const map: ProductMap = {};
      for (const p of products) {
        if (p.id) map[p.id] = { name: p.name, unit: p.unit ?? "unit" };
      }
      setProductMap(map);
    } catch {
      /* non-fatal */
    }
  }, []);

  const fetchData = useCallback(async () => {
    if (fetchingOrdersRef.current) return;
    fetchingOrdersRef.current = true;
    try {
      const data = await api.getOrders();
      const sorted = [...data].sort((a: Order, b: Order) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tb - ta;
      });
      setOrders(sorted);
    } catch (err) {
      console.warn("Failed to fetch orders:", (err as any)?.message || err);
    } finally {
      fetchingOrdersRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!isFocused) return;
    loadProductMap();
    fetchData();
    const iv = setInterval(fetchData, 60_000);
    return () => clearInterval(iv);
  }, [isFocused, fetchData, loadProductMap]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleCancelPress = (order: Order) => {
    setCancelOrder(order);
    setCancelModal(true);
    Vibration.vibrate(40);
  };

  // ── FIX: Always cancel by order ID via DELETE /orders/{id} ─────────────────
  // This single endpoint on the backend:
  //   1. Looks up the order by order ID in the orders collection (always correct)
  //   2. Sets order status = "cancelled"
  //   3. Also deactivates the linked subscription if any (handles both buy_once and recurring)
  //
  // Previous approach used subscription_id → always 404'd for buy_once because
  // those subscriptions are deactivated immediately after order generation.
  // The fallback then tried order.id at the subscriptions endpoint → wrong collection → 404.
  const handleConfirmCancel = async () => {
    if (!cancelOrder || cancelling) return;
    setCancelling(true);
    setCancelModal(false);

    try {
      // Single call — no fallback loop needed
      await api.cancelOrder(cancelOrder.id);
      await fetchData();
    } catch (err: any) {
      console.error("Cancel failed:", err.message);
      Alert.alert(
        "Cancel Failed",
        err.message || "Something went wrong. Please try again.",
        [{ text: "OK" }],
      );
    } finally {
      setCancelling(false);
      setCancelOrder(null);
    }
  };

  const active = orders.filter(
    (o) => !["delivered", "cancelled", "skipped"].includes(o.status),
  );
  const delivered = orders.filter((o) => o.status === "delivered");
  const cancelled = orders.filter((o) =>
    ["cancelled", "skipped"].includes(o.status),
  );

  type ListItem =
    | { type: "header"; key: string; label: string }
    | { type: "order"; key: string; order: Order; sectionIndex: number };

  const listData: ListItem[] = [];
  if (active.length > 0) {
    listData.push({ type: "header", key: "h-active", label: "Active" });
    active.forEach((o, i) =>
      listData.push({ type: "order", key: o.id, order: o, sectionIndex: i }),
    );
  }
  if (delivered.length > 0) {
    listData.push({ type: "header", key: "h-delivered", label: "Delivered" });
    delivered.forEach((o, i) =>
      listData.push({
        type: "order",
        key: o.id + "-d",
        order: o,
        sectionIndex: i,
      }),
    );
  }
  if (cancelled.length > 0) {
    listData.push({ type: "header", key: "h-cancelled", label: "Cancelled" });
    cancelled.forEach((o, i) =>
      listData.push({
        type: "order",
        key: o.id + "-c",
        order: o,
        sectionIndex: i,
      }),
    );
  }

  if (loading) return <LoadingScreen />;

  return (
    <SafeAreaView style={sc.container} edges={["top"]}>
      {/* Header */}
      <Animated.View
        style={[
          sc.header,
          { transform: [{ translateY: headerY }], opacity: headerOp },
        ]}
      >
        <View>
          <Text style={sc.title}>My Orders</Text>
          <Text style={sc.subtitle}>
            {orders.length} order{orders.length !== 1 ? "s" : ""} total
          </Text>
        </View>
        <View style={sc.headerBadge}>
          <Ionicons name="receipt-outline" size={19} color={Colors.primary} />
        </View>
      </Animated.View>

      {/* Summary pills */}
      <SummaryBar orders={orders} />

      {/* List */}
      {orders.length === 0 ? (
        <ScrollView
          contentContainerStyle={sc.emptyContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
            />
          }
        >
          <EmptyState />
        </ScrollView>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item) => item.key}
          contentContainerStyle={sc.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
            />
          }
          renderItem={({ item }) => {
            if (item.type === "header") {
              return <SectionHeader label={item.label} />;
            }
            return (
              <OrderCard
                order={item.order}
                index={item.sectionIndex}
                productMap={productMap}
                onCancelPress={handleCancelPress}
              />
            );
          }}
        />
      )}

      <CancelModal
        visible={cancelModal}
        order={cancelOrder}
        onConfirm={handleConfirmCancel}
        onCancel={() => {
          setCancelModal(false);
          setCancelOrder(null);
        }}
      />
    </SafeAreaView>
  );
}

const sc = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F3F8" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: "#F2F3F8",
  },
  title: {
    fontSize: 25,
    fontWeight: "800",
    color: "#111",
    letterSpacing: -0.5,
  },
  subtitle: { fontSize: 12, color: "#9CA3AF", marginTop: 1, fontWeight: "500" },
  headerBadge: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: Colors.primary + "15",
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: { paddingHorizontal: 13, paddingTop: 8, paddingBottom: 40 },
  emptyContent: { flexGrow: 1 },
});
