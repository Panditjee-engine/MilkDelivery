import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
  FlatList,
  Pressable,
  Linking,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Svg, {
  Circle,
  G,
  Line,
  Path,
  Polygon,
  Polyline,
  Rect,
  Text as SvgText,
} from "react-native-svg";
import { useRouter } from "expo-router";
import { useAuth } from "../../src/contexts/AuthContext";
import { api } from "../../src/services/api";
import LoadingScreen from "../../src/components/LoadingScreen";
import { useIsFocused } from "@react-navigation/native";

// ── Warm Color Palette
const C = {
  primary: "#FF9675",
  secondary: "#FF9675",
  accent: "#FD9E69",
  light: "#FFD999",
  dark: "#BB6B3F",
  deep: "#8B6854",
  bg: "#FFF8EF",
  card: "#FFFFFF",
  text: "#3D1F0A",
  textMuted: "#A07850",
  textLight: "#C9A882",
};

const getLocalDateKey = (date = new Date()) => {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const PAID_STATUSES = [
  "paid",
  "success",
  "successful",
  "completed",
  "captured",
  "approved",
];

const isPaidOrder = (order: any) => {
  const status = String(order.payment_status || "").toLowerCase();
  const method = String(order.payment_method || "").toLowerCase();
  if (PAID_STATUSES.includes(status)) return true;
  return (
    ["wallet", "online", "razorpay"].includes(method) &&
    !["pending", "failed", "rejected", "unpaid", "refunded"].includes(status)
  );
};

const orderDateKey = (order: any) => {
  const raw = order.delivered_at || order.delivery_date || order.created_at;
  if (!raw) return "";
  if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  return getLocalDateKey(parsed);
};

const money = (amount: number) =>
  `₹${Number(amount || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;

const pct = (value: number, total: number) =>
  total > 0 ? Math.round((value / total) * 100) : 0;

const chartPoint = (
  index: number,
  value: number,
  max: number,
  count: number,
  width: number,
  height: number,
) => {
  const x = count <= 1 ? width / 2 : (index / (count - 1)) * width;
  const y = height - (max > 0 ? (value / max) * height : 0);
  return `${x},${y}`;
};

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSub}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

function KpiCard({
  label,
  value,
  icon,
  color,
  sub,
}: {
  label: string;
  value: string | number;
  icon: string;
  color: string;
  sub?: string;
}) {
  return (
    <View style={styles.kpiCard}>
      <View style={[styles.kpiIcon, { backgroundColor: color + "22" }]}>
        <Ionicons name={icon as any} size={17} color={color} />
      </View>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
      {sub ? <Text style={styles.kpiSub}>{sub}</Text> : null}
    </View>
  );
}

function StackedBar({
  segments,
}: {
  segments: Array<{ label: string; value: number; color: string }>;
}) {
  const total = segments.reduce((s, item) => s + item.value, 0);
  return (
    <View>
      <View style={styles.stackTrack}>
        {segments.map((item) => (
          <View
            key={item.label}
            style={[
              styles.stackSegment,
              {
                width: `${Math.max(pct(item.value, total), item.value ? 7 : 0)}%`,
                backgroundColor: item.color,
              },
            ]}
          />
        ))}
      </View>
      <View style={styles.legendRow}>
        {segments.map((item) => (
          <View key={item.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <Text style={styles.legendText}>
              {item.label} {item.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function ComboChart({
  data,
}: {
  data: Array<{ label: string; orders: number; revenue: number }>;
}) {
  const width = 300;
  const height = 98;
  const maxOrders = Math.max(...data.map((d) => d.orders), 1);
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);
  const barW = 20;
  const gap = width / Math.max(data.length, 1);
  const linePoints = data
    .map((d, i) => chartPoint(i, d.revenue, maxRevenue, data.length, width, height - 16))
    .join(" ");
  return (
    <Svg width="100%" height={120} viewBox={`0 0 ${width} 120`}>
      {data.map((d, i) => {
        const x = i * gap + gap / 2 - barW / 2;
        const h = (d.orders / maxOrders) * 58;
        return (
          <G key={d.label}>
            <Rect x={x} y={86 - h} width={barW} height={h} rx={6} fill="#FFD9B8" />
            <SvgText x={i * gap + gap / 2} y={112} fontSize="9" fill={C.textMuted} textAnchor="middle">
              {d.label}
            </SvgText>
          </G>
        );
      })}
      <Polyline points={linePoints} fill="none" stroke={C.dark} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d, i) => {
        const [x, y] = chartPoint(i, d.revenue, maxRevenue, data.length, width, height - 16).split(",").map(Number);
        return <Circle key={`${d.label}-dot`} cx={x} cy={y} r={4} fill={C.primary} stroke="#fff" strokeWidth={2} />;
      })}
    </Svg>
  );
}

function LineTrend({ data }: { data: Array<{ label: string; value: number }> }) {
  const width = 300;
  const height = 72;
  const max = Math.max(...data.map((d) => d.value), 1);
  const points = data
    .map((d, i) => chartPoint(i, d.value, max, data.length, width, height))
    .join(" ");
  return (
    <Svg width="100%" height={96} viewBox={`0 0 ${width} 96`}>
      {[0, 1, 2].map((i) => (
        <Line key={i} x1="0" x2={width} y1={14 + i * 26} y2={14 + i * 26} stroke="#FFE8D6" strokeWidth="1" />
      ))}
      <Polyline points={points} fill="none" stroke={C.primary} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d, i) => {
        const [x, y] = chartPoint(i, d.value, max, data.length, width, height).split(",").map(Number);
        return (
          <G key={d.label}>
            <Circle cx={x} cy={y} r={4} fill={C.dark} />
            <SvgText x={x} y={91} fontSize="9" fill={C.textMuted} textAnchor="middle">
              {d.label}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

function DonutChart({
  delivered,
  pending,
}: {
  delivered: number;
  pending: number;
}) {
  const total = Math.max(delivered + pending, 1);
  const radius = 31;
  const circumference = 2 * Math.PI * radius;
  const deliveredDash = (delivered / total) * circumference;
  return (
    <View style={styles.donutWrap}>
      <Svg width={88} height={88} viewBox="0 0 88 88">
        <Circle cx="44" cy="44" r={radius} stroke="#FFE8D6" strokeWidth="13" fill="none" />
        <Circle
          cx="44"
          cy="44"
          r={radius}
          stroke={C.dark}
          strokeWidth="13"
          fill="none"
          strokeDasharray={`${deliveredDash} ${circumference - deliveredDash}`}
          strokeLinecap="round"
          rotation="-90"
          origin="44,44"
        />
      </Svg>
      <View style={styles.donutCenter}>
        <Text style={styles.donutValue}>{pct(delivered, total)}%</Text>
        <Text style={styles.donutLabel}>Done</Text>
      </View>
    </View>
  );
}

function FunnelChart({ values }: { values: Array<{ label: string; value: number }> }) {
  const max = Math.max(...values.map((v) => v.value), 1);
  return (
    <View style={styles.funnelWrap}>
      {values.map((item, index) => (
        <View key={item.label} style={styles.funnelRow}>
          <View
            style={[
              styles.funnelBar,
              {
                width: `${Math.max(28, (item.value / max) * 100)}%`,
                backgroundColor: [C.primary, C.dark, C.accent, C.light][index % 4],
              },
            ]}
          >
            <Text style={styles.funnelText}>{item.label}</Text>
          </View>
          <Text style={styles.funnelValue}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

function RadarChart({ metrics }: { metrics: Array<{ label: string; value: number }> }) {
  const size = 128;
  const center = size / 2;
  const radius = 46;
  const pointFor = (value: number, index: number) => {
    const angle = (Math.PI * 2 * index) / metrics.length - Math.PI / 2;
    const r = radius * Math.min(value, 100) / 100;
    return `${center + Math.cos(angle) * r},${center + Math.sin(angle) * r}`;
  };
  const fullPointFor = (index: number) => {
    const angle = (Math.PI * 2 * index) / metrics.length - Math.PI / 2;
    return `${center + Math.cos(angle) * radius},${center + Math.sin(angle) * radius}`;
  };
  return (
    <Svg width="100%" height={134} viewBox={`0 0 ${size} ${size}`}>
      <Polygon points={metrics.map((_, i) => fullPointFor(i)).join(" ")} fill="#FFF8EF" stroke="#FFE8D6" strokeWidth="1" />
      {metrics.map((_, i) => {
        const [x, y] = fullPointFor(i).split(",").map(Number);
        return <Line key={i} x1={center} y1={center} x2={x} y2={y} stroke="#FFE8D6" strokeWidth="1" />;
      })}
      <Polygon points={metrics.map((m, i) => pointFor(m.value, i)).join(" ")} fill={C.primary + "55"} stroke={C.dark} strokeWidth="2" />
      {metrics.map((m, i) => {
        const [x, y] = fullPointFor(i).split(",").map(Number);
        return (
          <SvgText key={m.label} x={x} y={y + 4} fontSize="7" fill={C.textMuted} textAnchor="middle">
            {m.label}
          </SvgText>
        );
      })}
    </Svg>
  );
}

function TreemapChart({ data }: { data: Array<{ label: string; value: number }> }) {
  const total = data.reduce((s, item) => s + item.value, 0) || 1;
  return (
    <View style={styles.treemapWrap}>
      {data.slice(0, 5).map((item, index) => (
        <View
          key={item.label}
          style={[
            styles.treemapTile,
            {
              width: index < 2 ? "48%" : "31%",
              backgroundColor: ["#FFF3DC", "#FFE8D6", "#FFD9B8", "#FFEEDD", "#FFF8EF"][index],
            },
          ]}
        >
          <Text style={styles.treemapLabel} numberOfLines={1}>{item.label}</Text>
          <Text style={styles.treemapValue}>{money(item.value)}</Text>
        </View>
      ))}
    </View>
  );
}

function ScatterChart({ data }: { data: Array<{ x: number; y: number; label: string }> }) {
  const width = 300;
  const height = 110;
  const maxX = Math.max(...data.map((d) => d.x), 1);
  const maxY = Math.max(...data.map((d) => d.y), 1);
  return (
    <Svg width="100%" height={104} viewBox={`0 0 ${width} 104`}>
      <Line x1="0" x2={width} y1={height} y2={height} stroke="#FFE8D6" />
      <Line x1="0" x2="0" y1="0" y2={height} stroke="#FFE8D6" />
      {data.map((d, i) => (
        <Circle
          key={`${d.label}-${i}`}
          cx={(d.x / maxX) * (width - 18) + 8}
          cy={height - (d.y / maxY) * (height - 18)}
          r={4 + Math.min(d.y / maxY, 1) * 5}
          fill={i % 2 ? C.dark : C.primary}
          opacity={0.78}
        />
      ))}
    </Svg>
  );
}

function Heatmap({ data }: { data: Array<{ label: string; value: number }> }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <View style={styles.heatmapGrid}>
      {data.map((item) => {
        const alpha = 0.18 + (item.value / max) * 0.72;
        return (
          <View key={item.label} style={styles.heatCellWrap}>
            <View style={[styles.heatCell, { backgroundColor: `rgba(187,107,63,${alpha})` }]} />
            <Text style={styles.heatLabel}>{item.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

// ── Modal Types
type ModalType =
  | "customers"
  | "products"
  | "orders"
  | "delivered"
  | "total"
  | "pending"
  | null;

// ── Detail Modal Component
function DetailModal({
  visible,
  type,
  products,
  customers,
  orders,
  onClose,
}: {
  visible: boolean;
  type: ModalType;
  products: any[];
  customers: any[];
  orders: any[];
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();

  const config: Record<
    Exclude<ModalType, null>,
    { title: string; icon: string; color: string; bgColor: string }
  > = {
    customers: {
      title: "All Customers",
      icon: "people",
      color: C.dark,
      bgColor: "#FFF3DC",
    },
    products: {
      title: "All Products",
      icon: "cube",
      color: C.dark,
      bgColor: "#FFEEDD",
    },
    orders: {
      title: "Today's Orders",
      icon: "receipt",
      color: C.dark,
      bgColor: "#FFE8D6",
    },
    delivered: {
      title: "Delivered Orders",
      icon: "checkmark-circle",
      color: C.deep,
      bgColor: "#FFD9B8",
    },
    total: {
      title: "All Orders Today",
      icon: "list",
      color: C.dark,
      bgColor: "#FFE8D6",
    },
    pending: {
      title: "Pending Orders",
      icon: "time",
      color: C.secondary,
      bgColor: "#FFF0E0",
    },
  };

  if (!type) return null;
  const cfg = config[type];

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    if (type === "products") {
      return (
        <View style={[mStyles.listRow, index % 2 === 0 && mStyles.listRowAlt]}>
          <View
            style={[
              mStyles.listDot,
              { backgroundColor: item.is_available ? C.accent : C.textLight },
            ]}
          />
          <View style={mStyles.listInfo}>
            <Text style={mStyles.listTitle} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={mStyles.listSub}>
              ₹{item.price} · {item.unit}
            </Text>
          </View>
          <View
            style={[
              mStyles.pill,
              { backgroundColor: item.is_available ? "#FFF3DC" : "#FFE8D6" },
            ]}
          >
            <Text
              style={[
                mStyles.pillText,
                { color: item.is_available ? C.dark : C.secondary },
              ]}
            >
              {item.is_available ? "Active" : "Off"}
            </Text>
          </View>
        </View>
      );
    }

    if (type === "customers") {
      return (
        <View style={[mStyles.listRow, index % 2 === 0 && mStyles.listRowAlt]}>
          <View style={mStyles.avatarCircle}>
            <Text style={mStyles.avatarText}>
              {(item.name || item.phone || "#")[0].toUpperCase()}
            </Text>
          </View>
          <View style={mStyles.listInfo}>
            <Text style={mStyles.listTitle} numberOfLines={1}>
              {item.name || "Customer"}
            </Text>
            <Text style={mStyles.listSub}>
              {item.phone || item.email || "—"}
            </Text>
          </View>
          <View
            style={[
              mStyles.pill,
              { backgroundColor: item.is_active ? "#FFF3DC" : "#FFE8D6" },
            ]}
          >
            <Text
              style={[
                mStyles.pillText,
                { color: item.is_active ? C.dark : C.secondary },
              ]}
            >
              {item.is_active ? "Active" : "Off"}
            </Text>
          </View>
        </View>
      );
    }

    // orders / delivered / pending / total
    const statusColor =
      item.status === "delivered"
        ? C.dark
        : item.status === "pending"
          ? C.secondary
          : C.accent;

    return (
      <View style={[mStyles.listRow, index % 2 === 0 && mStyles.listRowAlt]}>
        <View style={[mStyles.orderNumBox, { backgroundColor: cfg.bgColor }]}>
          <Text style={[mStyles.orderNum, { color: cfg.color }]}>
            #{(item.id || "").slice(-4)}
          </Text>
        </View>
        <View style={mStyles.listInfo}>
          <Text style={mStyles.listTitle} numberOfLines={1}>
            {item.customer_name || item.customer || "Order"}
          </Text>
          <Text style={mStyles.listSub}>
            ₹{item.total_amount || item.total || 0}
          </Text>
        </View>
        <View style={[mStyles.pill, { backgroundColor: statusColor + "22" }]}>
          <Text style={[mStyles.pillText, { color: statusColor }]}>
            {item.status || "N/A"}
          </Text>
        </View>
      </View>
    );
  };

  // ── Determine list source
  const getListData = () => {
    if (type === "products") return products;
    if (type === "customers") return customers;
    if (type === "delivered")
      return orders.filter((o: any) => o.status === "delivered");
    if (type === "pending")
      return orders.filter((o: any) => o.status !== "delivered");
    return orders; // 'orders' | 'total'
  };

  const listData = getListData();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={mStyles.backdrop} onPress={onClose} />

      <View style={[mStyles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={mStyles.handle} />

        <View style={mStyles.sheetHeader}>
          <View
            style={[mStyles.sheetIconBox, { backgroundColor: cfg.bgColor }]}
          >
            <Ionicons name={cfg.icon as any} size={18} color={cfg.color} />
          </View>
          <Text style={mStyles.sheetTitle}>{cfg.title}</Text>
          <View style={mStyles.countPill}>
            <Text style={mStyles.countText}>{listData.length}</Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={mStyles.closeBtn}
            hitSlop={10}
          >
            <Ionicons name="close" size={20} color={C.textMuted} />
          </TouchableOpacity>
        </View>

        {listData.length === 0 ? (
          <View style={mStyles.emptyBox}>
            <Ionicons name="file-tray-outline" size={40} color={C.textLight} />
            <Text style={mStyles.emptyTxt}>No data available</Text>
          </View>
        ) : (
          <FlatList
            data={listData}
            keyExtractor={(item, i) => String(item.id ?? i)}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 4 }}
          />
        )}
      </View>
    </Modal>
  );
}

// ── Main Dashboard
export default function AdminDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [pendingRechargeRequests, setPendingRechargeRequests] = useState<any[]>(
    [],
  );
  const [modalType, setModalType] = useState<ModalType>(null);
  const isFocused = useIsFocused();
  const fetchingRef = useRef(false);

  const fetchData = async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const [
        dashboardData,
        productsData,
        usersData,
        ordersData,
        subscriptionsData,
        rechargeRequestsData,
      ] =
        await Promise.allSettled([
          api.getAdminDashboard(),
          api.getProducts(),
          api.getAllUsers("customer"),
          api.getAllOrders(),
          api.getAdminSubscriptionsAll().catch(() => []),
          api.getAdminRechargeRequests("pending").catch(() => []),
        ]);
      if (dashboardData.status === "fulfilled") setStats(dashboardData.value);
      if (productsData.status === "fulfilled" && Array.isArray(productsData.value)) {
        setProducts(productsData.value);
      }
      if (usersData.status === "fulfilled" && Array.isArray(usersData.value)) {
        setCustomers(usersData.value);
      }
      if (ordersData.status === "fulfilled" && Array.isArray(ordersData.value)) {
        setOrders(ordersData.value);
      }
      if (
        subscriptionsData.status === "fulfilled" &&
        Array.isArray(subscriptionsData.value)
      ) {
        setSubscriptions(subscriptionsData.value);
      }
      if (
        rechargeRequestsData.status === "fulfilled" &&
        Array.isArray(rechargeRequestsData.value)
      ) {
        setPendingRechargeRequests(rechargeRequestsData.value);
      }
    } catch (error) {
      console.error("Error fetching dashboard:", error);
    } finally {
      fetchingRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  };

useEffect(() => {
  if (!isFocused) return;
  fetchData();
}, [isFocused]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  if (loading) return <LoadingScreen />;

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const todayKey = getLocalDateKey();
  const totalOrdersToday = orders.length;
  const recurringSubscriptions = subscriptions.filter((sub: any) => {
    const pattern = String(sub.pattern || "").toLowerCase();
    return pattern !== "buy_once" && pattern !== "";
  });
  const todaySubscriptions = recurringSubscriptions.filter((sub: any) => {
    const raw = sub.created_at || sub.start_date;
    if (!raw) return false;
    if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}/.test(raw)) {
      return raw.slice(0, 10) === todayKey;
    }
    const parsed = new Date(raw);
    return !Number.isNaN(parsed.getTime()) && getLocalDateKey(parsed) === todayKey;
  });
  const todaySubscriptionAmount = todaySubscriptions.reduce(
    (sum: number, sub: any) =>
      sum + Number(sub.total_amount || sub.amount || 0),
    0,
  );
  const deliveredToday = orders.filter(
    (o: any) => o.status?.toLowerCase() === "delivered",
  ).length;
  const pending = totalOrdersToday - deliveredToday;
  const todayTotalAmount = orders.reduce(
    (sum: number, order: any) => sum + Number(order.total_amount || order.total || 0),
    0,
  );
  const todayPaidRevenue = orders
    .filter(
      (order: any) =>
        String(order.status || "").toLowerCase() === "delivered" &&
        isPaidOrder(order) &&
        orderDateKey(order) === todayKey,
    )
    .reduce(
      (sum: number, order: any) =>
        sum + Number(order.total_amount || order.total || 0),
      0,
    );
  const deliveryRate = totalOrdersToday
    ? Math.round((deliveredToday / totalOrdersToday) * 100)
    : 0;
  const deliveredOrders = orders.filter(
    (order: any) => String(order.status || "").toLowerCase() === "delivered",
  );
  const paidOrders = deliveredOrders.filter(isPaidOrder);
  const paidRevenue = paidOrders.reduce(
    (sum: number, order: any) => sum + Number(order.total_amount || order.total || 0),
    0,
  );
  const paidPendingOrders = orders.filter(
    (order: any) =>
      String(order.status || "").toLowerCase() !== "delivered" &&
      isPaidOrder(order),
  );
  const avgOrderValue = paidOrders.length ? Math.round(paidRevenue / paidOrders.length) : 0;
  const activeProducts = products.filter((p: any) => p.is_available !== false).length;
  const inactiveProducts = Math.max(products.length - activeProducts, 0);
  const cashOrders = orders.filter((order: any) =>
    ["cash_on_delivery", "cod", "cash"].includes(String(order.payment_method || "").toLowerCase()),
  ).length;
  const onlineOrders = orders.filter((order: any) =>
    ["online", "razorpay"].includes(String(order.payment_method || "").toLowerCase()),
  ).length;
  const walletOrders = orders.filter(
    (order: any) => String(order.payment_method || "").toLowerCase() === "wallet",
  ).length;

  const last7 = Array.from({ length: 7 }).map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const key = getLocalDateKey(date);
    const dayOrders = orders.filter((order: any) => orderDateKey(order) === key);
    const dayPaid = dayOrders
      .filter((order: any) => String(order.status || "").toLowerCase() === "delivered" && isPaidOrder(order))
      .reduce((sum: number, order: any) => sum + Number(order.total_amount || order.total || 0), 0);
    return {
      key,
      label: date.toLocaleDateString("en-IN", { weekday: "short" }).slice(0, 3),
      orders: dayOrders.length,
      revenue: dayPaid,
    };
  });

  const productRevenueMap = new Map<string, number>();
  paidOrders.forEach((order: any) => {
    (order.items || []).forEach((item: any) => {
      const label =
        item.product_name ||
        item.name ||
        products.find((p: any) => p.id === item.product_id)?.name ||
        "Product";
      const value = Number(item.amount || 0) || Number(item.price || 0) * Number(item.quantity || 1);
      productRevenueMap.set(label, (productRevenueMap.get(label) || 0) + value);
    });
  });
  const productRevenue = Array.from(productRevenueMap.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  const moduleHealth = [
    { label: "Products", value: activeProducts, color: C.dark },
    { label: "Inactive", value: inactiveProducts, color: C.textLight },
    { label: "Pending", value: pending, color: C.secondary },
    { label: "Paid", value: paidOrders.length, color: C.primary },
  ];
  const funnelData = [
    { label: "Orders", value: totalOrdersToday },
    { label: "Paid", value: paidOrders.length },
    { label: "Delivered", value: deliveredToday },
    { label: "Pending", value: pending },
  ];
  const radarMetrics = [
    { label: "Delivery", value: deliveryRate },
    { label: "Payment", value: pct(paidOrders.length, totalOrdersToday) },
    { label: "Catalog", value: pct(activeProducts, products.length) },
    { label: "Customers", value: Math.min(customers.length * 8, 100) },
    { label: "Wallet", value: pendingRechargeRequests.length ? 65 : 95 },
  ];
  const scatterData = orders.slice(0, 24).map((order: any, index: number) => ({
    x: index + 1,
    y: Number(order.total_amount || order.total || 0),
    label: order.id || String(index),
  }));
  const heatmapData = last7.flatMap((day) => [
    { label: `${day.label} O`, value: day.orders },
    { label: `${day.label} ₹`, value: Math.round(day.revenue / 100) },
  ]);
  const last7Revenue = last7.reduce((sum, day) => sum + day.revenue, 0);
  const paymentMixLabel = `Wallet ${walletOrders} · Online ${onlineOrders} · COD ${cashOrders}`;

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.primary}
            colors={[C.primary, C.accent]}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Admin Dashboard</Text>
            <Text style={styles.userName}>{user?.name}</Text>
            <Text style={styles.date}>{today}</Text>
          </View>
          <View style={styles.adminBadge}>
            <Ionicons name="shield-checkmark" size={22} color={C.deep} />
          </View>
        </View>



        {/* ── Revenue Card ── */}
        <View style={styles.revenueCard}>
          <View style={styles.revenueLeft}>
            <Text style={styles.revenueLabel}>{`Today's Revenue`}</Text>
            <Text style={styles.revenueAmount}>
              ₹{todayPaidRevenue.toLocaleString("en-IN", {
                maximumFractionDigits: 0,
              })}
            </Text>
            <View style={styles.revenueBadge}>
              <Ionicons name="checkmark-circle-outline" size={11} color={C.deep} />
              <Text style={styles.revenueBadgeText}>
                {paidOrders.length} paid
              </Text>
            </View>
          </View>
          <View style={styles.revenueIcon}>
            <Ionicons name="cash" size={30} color={C.deep} />
          </View>
        </View>

<TouchableOpacity
  style={styles.todayOrderCard}
  activeOpacity={0.82}
  onPress={() => Linking.openURL("https://gausatv.com/admin-dashboard")}
>
  <View style={styles.todayOrderLeft}>
    <View style={styles.todayOrderIcon}>
      <Ionicons name="globe-outline" size={22} color={C.dark} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.todayOrderTitle}>Open Web Dashboard</Text>
      <Text style={styles.todayOrderSub}>
        Access more tools and reports on cockpit
      </Text>
    </View>
  </View>
  <Ionicons name="open-outline" size={18} color={C.dark} />
</TouchableOpacity>

        <TouchableOpacity
          style={styles.todayOrderCard}
          activeOpacity={0.82}
          onPress={() => router.push("/(admin)/order-summary" as any)}
        >
          <View style={styles.todayOrderLeft}>
            <View style={styles.todayOrderIcon}>
              <Ionicons name="receipt-outline" size={22} color={C.dark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.todayOrderTitle}>{`Today's Order Summary`}</Text>
              <Text style={styles.todayOrderSub}>
                {deliveredToday} delivered · {pending} pending · {deliveryRate}% done
              </Text>
            </View>
          </View>
          <View style={styles.todayOrderRight}>
            <Text style={styles.todayOrderCount}>{totalOrdersToday}</Text>
            <Text style={styles.todayOrderMeta}>{money(todayTotalAmount)}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={C.dark} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.todayOrderCard}
          activeOpacity={0.82}
          onPress={() =>
            router.push({
              pathname: "/(admin)/orders",
              params: { tab: "subscriptions" },
            } as any)
          }
        >
          <View style={styles.todayOrderLeft}>
            <View style={styles.todayOrderIcon}>
              <Ionicons name="repeat-outline" size={22} color={C.dark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.todayOrderTitle}>Today Subscriptions</Text>
              <Text style={styles.todayOrderSub}>
                Tap to view all customer subscriptions
              </Text>
            </View>
          </View>
          <View style={styles.todayOrderRight}>
            <Text style={styles.todayOrderCount}>{todaySubscriptions.length}</Text>
            <Text style={styles.todayOrderMeta}>
              {money(todaySubscriptionAmount)}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={C.dark} />
        </TouchableOpacity>

        {pendingRechargeRequests.length > 0 ? (
          <TouchableOpacity
            style={styles.rechargeRequestCard}
            activeOpacity={0.82}
            onPress={() => router.push("/(admin)/wallet-payment" as any)}
          >
            <View style={styles.rechargeRequestLeft}>
              <View style={styles.rechargeRequestIcon}>
                <Ionicons name="wallet-outline" size={20} color={C.dark} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rechargeRequestTitle}>
                  Pending Recharge Requests
                </Text>
                <Text style={styles.rechargeRequestSub}>
                  Review customer wallet payment requests
                </Text>
              </View>
            </View>
            <View style={styles.rechargeRequestCount}>
              <Text style={styles.rechargeRequestCountText}>
                {pendingRechargeRequests.length}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={C.dark} />
          </TouchableOpacity>
        ) : null}

        {/* ── Stats Grid ── */}
        <View style={styles.statsGrid}>
          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: "#FFF3DC" }]}
            onPress={() => setModalType("customers")}
            activeOpacity={0.75}
          >
            <View
              style={[styles.statIcon, { backgroundColor: C.primary + "30" }]}
            >
              <Ionicons name="people" size={16} color={C.dark} />
            </View>
            <Text style={[styles.statValue, { color: C.dark }]}>
              {customers.length || stats?.total_customers || 0}
            </Text>
            <Text style={styles.statLabel}>Customers</Text>
            <View style={styles.tapHint}>
              <Ionicons name="chevron-forward" size={11} color={C.textLight} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: "#FFEEDD" }]}
            onPress={() => setModalType("products")}
            activeOpacity={0.75}
          >
            <View
              style={[styles.statIcon, { backgroundColor: C.accent + "30" }]}
            >
              <Ionicons name="cube" size={16} color={C.dark} />
            </View>
            <Text style={[styles.statValue, { color: C.dark }]}>
              {products.length}
            </Text>
            <Text style={styles.statLabel}>Products</Text>
            <View style={styles.tapHint}>
              <Ionicons name="chevron-forward" size={11} color={C.textLight} />
            </View>
          </TouchableOpacity>

          {/* ── FIXED: Total Orders — orders.length use karo ── */}
          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: "#FFE8D6" }]}
            onPress={() => router.push("/(admin)/order-summary" as any)}
            activeOpacity={0.75}
          >
            <View
              style={[styles.statIcon, { backgroundColor: C.secondary + "30" }]}
            >
              <Ionicons name="receipt" size={16} color={C.dark} />
            </View>
            <Text style={[styles.statValue, { color: C.dark }]}>
              {totalOrdersToday}
            </Text>
            <Text style={styles.statLabel}>Total Orders</Text>
            <View style={styles.tapHint}>
              <Ionicons name="chevron-forward" size={11} color={C.textLight} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: "#FFD9B8" }]}
            onPress={() => setModalType("delivered")}
            activeOpacity={0.75}
          >
            <View style={[styles.statIcon, { backgroundColor: C.dark + "20" }]}>
              <Ionicons name="checkmark-circle" size={16} color={C.deep} />
            </View>
            <Text style={[styles.statValue, { color: C.deep }]}>
              {deliveredToday}
            </Text>
            <Text style={styles.statLabel}>Delivered</Text>
            <View style={styles.tapHint}>
              <Ionicons name="chevron-forward" size={11} color={C.textLight} />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.kpiTitleWrap}>
          <SectionTitle
            title="KPI Performance"
            subtitle={`${totalOrdersToday} orders today · ${paymentMixLabel}`}
          />
        </View>
        <View style={styles.kpiGrid}>
          <KpiCard
            label="Paid Revenue"
            value={money(paidRevenue)}
            icon="cash-outline"
            color={C.dark}
            sub={`${paidOrders.length} paid orders`}
          />
          <KpiCard
            label="Avg Order"
            value={money(avgOrderValue)}
            icon="analytics-outline"
            color={C.primary}
            sub="Delivered paid AOV"
          />
          <KpiCard
            label="Payment Rate"
            value={`${pct(paidOrders.length, totalOrdersToday)}%`}
            icon="card-outline"
            color={C.accent}
            sub={`${paidPendingOrders.length} paid pending`}
          />
          <KpiCard
            label="Catalog Health"
            value={`${pct(activeProducts, products.length)}%`}
            icon="pulse-outline"
            color={C.deep}
            sub={`${activeProducts}/${products.length || 0} active`}
          />
        </View>

        <View style={styles.chartCard}>
          <SectionTitle
            title="Module Health"
            subtitle={`${activeProducts} active products · ${pending} pending orders`}
          />
          <StackedBar segments={moduleHealth} />
        </View>

        <View style={styles.chartCard}>
          <SectionTitle
            title="Orders vs Revenue"
            subtitle={`Last 7 days · ${money(last7Revenue)} paid revenue`}
          />
          <ComboChart data={last7} />
        </View>

        <View style={styles.chartGrid}>
          <View style={styles.chartHalf}>
            <SectionTitle
              title="Line Trend"
              subtitle={`Today ${money(todayPaidRevenue)}`}
            />
            <LineTrend data={last7.map((d) => ({ label: d.label, value: d.revenue }))} />
          </View>
          <View style={styles.chartHalf}>
            <SectionTitle
              title="Donut"
              subtitle={`${deliveredToday}/${totalOrdersToday} delivered`}
            />
            <DonutChart delivered={deliveredToday} pending={pending} />
          </View>
        </View>

        <View style={styles.chartGrid}>
          <View style={styles.chartHalf}>
            <SectionTitle title="Funnel" subtitle={`${paidOrders.length} paid orders`} />
            <FunnelChart values={funnelData} />
          </View>
          <View style={styles.chartHalf}>
            <SectionTitle title="Radar" subtitle={`${deliveryRate}% delivery score`} />
            <RadarChart metrics={radarMetrics} />
          </View>
        </View>

        <View style={styles.chartCard}>
          <SectionTitle
            title="Treemap"
            subtitle={`${productRevenue.length} revenue products`}
          />
          {productRevenue.length ? (
            <TreemapChart data={productRevenue} />
          ) : (
            <Text style={styles.emptyText}>No paid product revenue yet</Text>
          )}
        </View>

        <View style={styles.chartGrid}>
          <View style={styles.chartHalf}>
            <SectionTitle title="Scatter" subtitle={`AOV ${money(avgOrderValue)}`} />
            <ScatterChart data={scatterData} />
          </View>
          <View style={styles.chartHalf}>
            <SectionTitle title="Activity Heatmap" subtitle="7-day activity" />
            <Heatmap data={heatmapData} />
          </View>
        </View>

        <TouchableOpacity
          style={styles.customerManagerCard}
          activeOpacity={0.8}
          onPress={() => router.push("/(admin)/gausevak/customers")}
        >
          <View style={styles.customerManagerLeft}>
            <View style={styles.customerManagerIcon}>
              <Ionicons name="people-circle" size={22} color={C.dark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.customerManagerTitle}>Customer Manager</Text>
              <Text style={styles.customerManagerSub}>
                Create, edit and manage offline customer records
              </Text>
            </View>
          </View>
          <Ionicons name="arrow-forward" size={18} color={C.dark} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.customerManagerCard, styles.extraTaskManagerCard]}
          activeOpacity={0.8}
          onPress={() =>
            router.push({
              pathname: "/(admin)/extra-tasks",
              params: { from: "dashboard" },
            } as any)
          }
        >
          <View style={styles.customerManagerLeft}>
            <View style={[styles.customerManagerIcon, styles.extraTaskManagerIcon]}>
              <Ionicons name="clipboard-outline" size={22} color={C.dark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.customerManagerTitle}>Extra Task Review</Text>
              <Text style={styles.customerManagerSub}>
                Verify worker extra work and give bonus or penalty points
              </Text>
            </View>
          </View>
          <Ionicons name="arrow-forward" size={18} color={C.dark} />
        </TouchableOpacity>

        {/* ── Delivery Progress ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconBox, { backgroundColor: "#FFF3DC" }]}>
              <Ionicons name="stats-chart" size={16} color={C.dark} />
            </View>
            <Text style={styles.cardTitle}>Delivery Progress</Text>
            <View style={styles.ratePill}>
              <Text style={styles.rateText}>{deliveryRate}%</Text>
            </View>
          </View>

          <View style={styles.progressBg}>
            <View
              style={[styles.progressFill, { width: `${deliveryRate}%` }]}
            />
          </View>

          <View style={styles.progressStats}>
            <TouchableOpacity
              style={styles.progressStat}
              onPress={() => setModalType("total")}
              activeOpacity={0.7}
            >
              <Text style={styles.progressStatVal}>
                {totalOrdersToday}
              </Text>
              <Text style={styles.progressStatLabel}>Total</Text>
              <Ionicons
                name="chevron-down"
                size={10}
                color={C.textLight}
                style={{ marginTop: 2 }}
              />
            </TouchableOpacity>

            <View style={styles.progressDivider} />

            <TouchableOpacity
              style={styles.progressStat}
              onPress={() => setModalType("delivered")}
              activeOpacity={0.7}
            >
              <Text style={[styles.progressStatVal, { color: C.dark }]}>
                {deliveredToday}
              </Text>
              <Text style={styles.progressStatLabel}>Delivered</Text>
              <Ionicons
                name="chevron-down"
                size={10}
                color={C.textLight}
                style={{ marginTop: 2 }}
              />
            </TouchableOpacity>

            <View style={styles.progressDivider} />

            <TouchableOpacity
              style={styles.progressStat}
              onPress={() => setModalType("pending")}
              activeOpacity={0.7}
            >
              <Text style={[styles.progressStatVal, { color: C.secondary }]}>
                {pending}
              </Text>
              <Text style={styles.progressStatLabel}>Pending</Text>
              <Ionicons
                name="chevron-down"
                size={10}
                color={C.textLight}
                style={{ marginTop: 2 }}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Product Overview ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconBox, { backgroundColor: "#FFEEDD" }]}>
              <Ionicons name="cube-outline" size={16} color={C.dark} />
            </View>
            <Text style={styles.cardTitle}>Product Overview</Text>
            {products.length > 0 && (
              <TouchableOpacity
                onPress={() => setModalType("products")}
                hitSlop={10}
              >
                <Ionicons
                  name="arrow-forward-circle-outline"
                  size={22}
                  color={C.accent}
                />
              </TouchableOpacity>
            )}
          </View>

          {products.length > 0 ? (
            <>
              {products.slice(0, 4).map((p, i) => (
                <View
                  key={p.id}
                  style={[
                    styles.productRow,
                    i < Math.min(products.length, 4) - 1 &&
                      styles.productRowBorder,
                  ]}
                >
                  <View style={styles.productDot} />
                  <Text style={styles.productName} numberOfLines={1}>
                    {p.name}
                  </Text>
                  <View
                    style={[
                      styles.availPill,
                      {
                        backgroundColor: p.is_available ? "#FFF3DC" : "#FFE8D6",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.availText,
                        { color: p.is_available ? C.dark : C.secondary },
                      ]}
                    >
                      {p.is_available ? "Active" : "Off"}
                    </Text>
                  </View>
                  <Text style={styles.productPrice}>₹{p.price}</Text>
                </View>
              ))}

              {products.length > 4 && (
                <TouchableOpacity
                  onPress={() => setModalType("products")}
                  style={styles.moreBtn}
                  activeOpacity={0.7}
                >
                  <Text style={styles.moreText}>
                    +{products.length - 4} more products
                  </Text>
                  <Ionicons name="chevron-forward" size={13} color={C.accent} />
                </TouchableOpacity>
              )}
            </>
          ) : (
            <Text style={styles.emptyText}>No products added yet</Text>
          )}
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* ── Detail Modal ── */}
      <DetailModal
        visible={modalType !== null}
        type={modalType}
        products={products}
        customers={customers}
        orders={orders}
        onClose={() => setModalType(null)}
      />
    </SafeAreaView>
  );
}

// ── Modal Styles
const mStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(61,31,10,0.35)",
  },
  sheet: {
    backgroundColor: C.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "75%",
    paddingHorizontal: 20,
    paddingTop: 12,
    shadowColor: C.dark,
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -6 },
    elevation: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E0C8B0",
    alignSelf: "center",
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  sheetIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: C.text,
    flex: 1,
  },
  countPill: {
    backgroundColor: C.light,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
  },
  countText: {
    fontSize: 12,
    fontWeight: "700",
    color: C.dark,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#FFF3DC",
    justifyContent: "center",
    alignItems: "center",
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 10,
    borderRadius: 12,
    paddingHorizontal: 6,
  },
  listRowAlt: { backgroundColor: "#FFF8EF" },
  listDot: { width: 8, height: 8, borderRadius: 4 },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: C.light,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontSize: 14, fontWeight: "800", color: C.dark },
  orderNumBox: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  orderNum: { fontSize: 12, fontWeight: "700" },
  listInfo: { flex: 1 },
  listTitle: { fontSize: 14, fontWeight: "700", color: C.text },
  listSub: { fontSize: 12, color: C.textLight, marginTop: 2 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  pillText: { fontSize: 11, fontWeight: "700" },
  emptyBox: { alignItems: "center", paddingVertical: 40, gap: 10 },
  emptyTxt: { fontSize: 14, color: C.textLight, fontStyle: "italic" },
});

// ── Dashboard Styles
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scrollContent: { paddingBottom: 8 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  greeting: { fontSize: 11, color: C.textLight, fontWeight: "600" },
  userName: {
    fontSize: 19,
    fontWeight: "800",
    color: C.text,
    letterSpacing: -0.3,
  },
  date: { fontSize: 11, color: C.textLight, marginTop: 2 },
  adminBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: C.light,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: C.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  revenueCard: {
    marginHorizontal: 20,
    marginBottom: 10,
    backgroundColor: C.primary,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: C.dark,
    shadowOpacity: 0.16,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  revenueLeft: { gap: 2 },
  revenueLabel: { fontSize: 12, color: C.deep, fontWeight: "700" },
  revenueAmount: {
    fontSize: 29,
    fontWeight: "900",
    color: C.text,
    letterSpacing: -1,
  },
  revenueBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.light,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  revenueBadgeText: { fontSize: 10, color: C.deep, fontWeight: "800" },
  revenueIcon: { opacity: 0.45 },

  todayOrderCard: {
    marginHorizontal: 20,
    marginBottom: 10,
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1.5,
    borderColor: "#FFE1CC",
    shadowColor: C.dark,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  todayOrderLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  todayOrderIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "#FFF3DC",
    alignItems: "center",
    justifyContent: "center",
  },
  todayOrderTitle: { fontSize: 13, fontWeight: "900", color: C.text },
  todayOrderSub: {
    fontSize: 10.5,
    color: C.textMuted,
    fontWeight: "600",
    marginTop: 2,
    lineHeight: 14,
  },
  todayOrderRight: { alignItems: "flex-end" },
  todayOrderCount: { fontSize: 20, fontWeight: "900", color: C.dark },
  todayOrderMeta: { fontSize: 10.5, fontWeight: "800", color: C.textMuted },

  rechargeRequestCard: {
    marginHorizontal: 20,
    marginBottom: 10,
    backgroundColor: "#FFF3DC",
    borderRadius: 15,
    padding: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1.5,
    borderColor: "#FFD9B8",
  },
  rechargeRequestLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rechargeRequestIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: C.primary + "30",
    alignItems: "center",
    justifyContent: "center",
  },
  rechargeRequestTitle: { fontSize: 12.5, fontWeight: "900", color: C.text },
  rechargeRequestSub: {
    fontSize: 10,
    color: C.textMuted,
    fontWeight: "600",
    marginTop: 2,
    lineHeight: 15,
  },
  rechargeRequestCount: {
    minWidth: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  rechargeRequestCountText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#fff",
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 10,
  },
  statCard: {
    width: "47.5%",
    minHeight: 82,
    borderRadius: 13,
    paddingHorizontal: 11,
    paddingVertical: 9,
    gap: 2,
    position: "relative",
  },
  statIcon: {
    width: 24,
    height: 24,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 1,
  },
  statValue: { fontSize: 18, fontWeight: "900", letterSpacing: -0.35 },
  statLabel: { fontSize: 9.5, color: C.textMuted, fontWeight: "800" },
  tapHint: { position: "absolute", bottom: 8, right: 8 },
  customerManagerCard: {
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: "#FFF3DC",
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  extraTaskManagerCard: {
    backgroundColor: "#FFEEDD",
  },
  customerManagerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  customerManagerIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: C.primary + "30",
    alignItems: "center",
    justifyContent: "center",
  },
  extraTaskManagerIcon: {
    backgroundColor: C.accent + "26",
  },
  customerManagerTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: C.text,
  },
  customerManagerSub: {
    fontSize: 12,
    color: C.textMuted,
    fontWeight: "500",
    marginTop: 2,
  },

  card: {
    backgroundColor: C.card,
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 18,
    shadowColor: C.dark,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  cardIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitle: { fontSize: 15, fontWeight: "700", color: C.text, flex: 1 },
  ratePill: {
    backgroundColor: "#f8c18e",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  rateText: { fontSize: 12, fontWeight: "800", color: C.dark },

  progressBg: {
    height: 8,
    backgroundColor: "#FFE8C8",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 16,
  },
  progressFill: { height: 8, backgroundColor: C.primary, borderRadius: 4 },
  progressStats: { flexDirection: "row", justifyContent: "space-around" },
  progressStat: { alignItems: "center", flex: 1, paddingVertical: 4 },
  progressStatVal: { fontSize: 26, fontWeight: "800", color: C.text },
  progressStatLabel: {
    fontSize: 11,
    color: C.textLight,
    marginTop: 3,
    fontWeight: "600",
  },
  progressDivider: { width: 1, backgroundColor: "#FFE8C8" },

  productRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    gap: 10,
  },
  productRowBorder: { borderBottomWidth: 1, borderBottomColor: "#FFF3DC" },
  productDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: C.accent,
  },
  productName: { flex: 1, fontSize: 14, fontWeight: "600", color: C.text },
  availPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  availText: { fontSize: 11, fontWeight: "700" },
  productPrice: { fontSize: 13, fontWeight: "700", color: C.text },

  moreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    gap: 4,
  },
  moreText: { fontSize: 12, color: C.accent, fontWeight: "700" },
  emptyText: { fontSize: 13, color: C.textLight, fontStyle: "italic" },
  sectionHeader: {
    marginBottom: 9,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: C.text,
  },
  sectionSub: {
    fontSize: 11,
    color: C.textMuted,
    fontWeight: "600",
    marginTop: 2,
  },
  kpiTitleWrap: {
    paddingHorizontal: 16,
    marginBottom: 2,
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  kpiCard: {
    width: "47.5%",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: "#FFE8D6",
    shadowColor: C.dark,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  kpiIcon: {
    width: 26,
    height: 26,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 5,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: "900",
    color: C.text,
    letterSpacing: -0.4,
  },
  kpiLabel: { fontSize: 10, color: C.textMuted, fontWeight: "800", marginTop: 1 },
  kpiSub: { fontSize: 9, color: C.textLight, fontWeight: "700", marginTop: 3 },
  chartCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 12,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderColor: "#FFE8D6",
    borderLeftColor: C.primary,
    shadowColor: C.dark,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  chartGrid: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  chartHalf: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderColor: "#FFE8D6",
    borderLeftColor: C.primary,
    minHeight: 150,
    shadowColor: C.dark,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  stackTrack: {
    height: 14,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "#FFF3DC",
    flexDirection: "row",
  },
  stackSegment: { height: "100%" },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 8,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 9.5, color: C.textMuted, fontWeight: "700" },
  donutWrap: { alignSelf: "center", alignItems: "center", justifyContent: "center" },
  donutCenter: { position: "absolute", alignItems: "center" },
  donutValue: { fontSize: 16, fontWeight: "900", color: C.text },
  donutLabel: { fontSize: 9, color: C.textMuted, fontWeight: "800" },
  funnelWrap: { gap: 6 },
  funnelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  funnelBar: {
    minHeight: 21,
    borderRadius: 8,
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  funnelText: { color: C.text, fontSize: 9.5, fontWeight: "900" },
  funnelValue: { width: 20, fontSize: 10, fontWeight: "900", color: C.textMuted },
  treemapWrap: {
    minHeight: 94,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  treemapTile: {
    minWidth: "30%",
    minHeight: 44,
    borderRadius: 12,
    padding: 8,
    justifyContent: "space-between",
  },
  treemapLabel: { fontSize: 9.5, fontWeight: "900", color: C.text },
  treemapValue: { fontSize: 11, fontWeight: "900", color: C.dark },
  heatmapGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    paddingTop: 4,
  },
  heatCellWrap: { width: 27, alignItems: "center", gap: 2 },
  heatCell: { width: 21, height: 21, borderRadius: 7 },
  heatLabel: { fontSize: 7, color: C.textMuted, fontWeight: "800" },
});
