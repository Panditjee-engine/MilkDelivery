import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
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
  Alert,
} from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { api } from "../../src/services/api";
import LoadingScreen from "../../src/components/LoadingScreen";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Types

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
  items: {
    product_name?: string;
    product_id?: string;
    product?: { id?: string; _id?: string; name?: string; unit?: string };
    id?: string;
    _id?: string;
    quantity?: number;
    name?: string;
    unit?: string;
  }[];
  address?: any;
  delivery_partner_name?: string;
  delivery_partner_phone?: string;
  pattern?: string;
  subscription_id?: string;
}

interface SubscriptionItem {
  product_id: string;
  product_name?: string; // ← stored on backend
  quantity: number;
  price: number;
  amount: number;
  unit?: string;
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
  payment_method?: string;
  wallet_balance?: number;
  delivery_status?: string;
  items: SubscriptionItem[];
  customer_name?: string;
  customer_phone?: string;
  customer_address?: any;
  created_at?: string;
  on_vacation_today?: boolean; // ← NEW
  vacation_start_date?: string | null; // ← NEW
  vacation_end_date?: string | null;
}

// ─── Helpers
//for get all subscription order till end dat eto check mark delivered order
const getSubscriptionDeliveryDates = (
  sub: Subscription,
  maxDates = 60,
): string[] => {
  const startKey = getOrderDateKey(sub.start_date);
  if (!startKey) return [];
  const endKey =
    getOrderDateKey(sub.end_date) ||
    getLocalDateKey(
      (() => {
        const d = dateFromKey(startKey);
        d.setDate(d.getDate() + 89); // cap ~90 days ahead if no end_date
        return d;
      })(),
    );

  const dates: string[] = [];
  let cursor = dateFromKey(startKey);
  const end = dateFromKey(endKey);
  while (cursor <= end && dates.length < maxDates) {
    const key = getLocalDateKey(cursor);
    if (shouldSubscriptionDeliverOn(sub, key)) dates.push(key);
    cursor = new Date(cursor);
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
};

/** Resolve product name: stored name → cache → product_id */
const resolveItemName = (
  item: SubscriptionItem,
  productNames: Record<string, string>,
): string =>
  item.product_name ||
  productNames[item.product_id] ||
  item.product_id ||
  "Product";

const getOrderItemName = (item: Order["items"][number]) =>
  item.product_name || item.product?.name || item.name || "";

const getOrderItemProductId = (item: Order["items"][number]) =>
  item.product_id ||
  item.product?.id ||
  item.product?._id ||
  item.id ||
  item._id ||
  "";

const getProductId = (product: any) => product?.id || product?._id || "";

const formatQuantity = (value: number) =>
  Number.isInteger(value)
    ? String(value)
    : value.toFixed(2).replace(/\.?0+$/, "");

const parseUnitDescriptor = (unit?: string) => {
  const text = String(unit || "")
    .trim()
    .toLowerCase();
  const match = text.match(
    /(\d+(?:\.\d+)?)?\s*(ml|milliliter|millilitre|l|ltr|liter|litre|g|gm|gram|kg|kilogram|pc|pcs|piece|pieces|unit|units)/,
  );
  if (!match) return null;
  const size = Number.parseFloat(match[1] || "1");
  const token = match[2];
  if (["ml", "milliliter", "millilitre"].includes(token)) {
    return { kind: "volume", packSize: size };
  }
  if (["l", "ltr", "liter", "litre"].includes(token)) {
    return { kind: "volume", packSize: size * 1000 };
  }
  if (["g", "gm", "gram"].includes(token))
    return { kind: "weight", packSize: size };
  if (["kg", "kilogram"].includes(token)) {
    return { kind: "weight", packSize: size * 1000 };
  }
  return { kind: "count", packSize: size };
};

const formatBaseMetric = (amount: number, kind?: string) => {
  if (kind === "volume") {
    return amount >= 1000
      ? `${formatQuantity(amount / 1000)} L`
      : `${formatQuantity(amount)} ml`;
  }
  if (kind === "weight") {
    return amount >= 1000
      ? `${formatQuantity(amount / 1000)} kg`
      : `${formatQuantity(amount)} g`;
  }
  return `${formatQuantity(amount)} qty`;
};

const getOrderItemUnit = (item: Order["items"][number], products: any[]) => {
  const itemId = getOrderItemProductId(item);
  const product = products.find((p) => getProductId(p) === itemId);
  return item.unit || item.product?.unit || product?.unit || "qty";
};

const formatOrderItemQuantity = (
  item: Order["items"][number],
  products: any[],
) => {
  const quantity = Number(item.quantity || 1);
  const unit = getOrderItemUnit(item, products);
  const parsed = parseUnitDescriptor(unit);
  if (!parsed) return `${formatQuantity(quantity)} ${unit}`;
  const total = quantity * parsed.packSize;
  const totalText = formatBaseMetric(total, parsed.kind);
  return /\d/.test(String(unit))
    ? `${formatQuantity(quantity)} x ${unit} = ${totalText}`
    : totalText;
};

const getSubscriptionItemProduct = (
  item: SubscriptionItem,
  products: any[],
) => {
  const byId = products.find(
    (p) =>
      String(p.id || "") === String(item.product_id || "") ||
      String(p._id || "") === String(item.product_id || ""),
  );
  if (byId) return byId;

  const itemName = normalizeName(item.product_name || "");
  if (!itemName) return undefined;
  return products.find((p) => {
    const productName = normalizeName(p.name || p.product_name || "");
    return (
      productName &&
      (productName === itemName ||
        productName.includes(itemName) ||
        itemName.includes(productName))
    );
  });
};

const getSubscriptionItemName = (
  item: SubscriptionItem,
  productNames: Record<string, string>,
  products: any[],
) =>
  item.product_name ||
  productNames[item.product_id] ||
  getSubscriptionItemProduct(item, products)?.name ||
  item.product_id ||
  "Product";

const extractUnitLabel = (value?: string) => {
  const match = String(value || "").match(
    /(\d+(?:\.\d+)?)?\s*(ml|milliliter|millilitre|l|ltr|liter|litre|g|gm|gram|kg|kilogram|pc|pcs|piece|pieces|unit|units)\b/i,
  );
  return match ? match[0].replace(/\s+/g, "") : "";
};

const getSubscriptionItemUnit = (
  item: SubscriptionItem,
  productNames: Record<string, string>,
  products: any[],
) => {
  const product = getSubscriptionItemProduct(item, products);
  return (
    item.unit ||
    product?.unit ||
    extractUnitLabel(getSubscriptionItemName(item, productNames, products)) ||
    extractUnitLabel(product?.name || product?.product_name) ||
    "qty"
  );
};

const isGheeText = (text: string) => /\b(ghee|ghi)\b/.test(text.toLowerCase());

const isMilkSubscriptionItem = (
  item: SubscriptionItem,
  productNames: Record<string, string>,
  products: any[],
) => {
  const product = getSubscriptionItemProduct(item, products);
  const name = getSubscriptionItemName(item, productNames, products);
  const unit = getSubscriptionItemUnit(item, productNames, products);
  const category = String(product?.category || product?.category_name || "");
  const text = `${name} ${category} ${unit}`.toLowerCase();
  if (isGheeText(text)) return false;
  return (
    /\b(milk|doodh)\b/.test(text) ||
    category.toLowerCase().includes("milk") ||
    category.toLowerCase().includes("dairy")
  );
};

const formatSubscriptionItemQuantity = (
  item: SubscriptionItem,
  productNames: Record<string, string>,
  products: any[],
) => {
  const quantity = Number(item.quantity || 1);
  const unit = getSubscriptionItemUnit(item, productNames, products);
  const parsed = parseUnitDescriptor(unit);
  if (!parsed) return `${formatQuantity(quantity)} ${unit}`;
  const totalText = formatBaseMetric(quantity * parsed.packSize, parsed.kind);
  return /\d/.test(unit)
    ? `${formatQuantity(quantity)} x ${unit} = ${totalText}`
    : totalText;
};

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

const buildAddressText = (address: any) => {
  if (!address) return "";
  if (typeof address === "string") return address.trim();
  const value = [
    address.full_address,
    address.address,
    address.line1,
    address.line2,
    address.flat,
    address.house,
    address.house_no,
    address.building,
    address.tower,
    address.floor,
    address.society,
    address.area,
    address.landmark,
    address.city,
    address.state,
    address.pincode,
    address.pin_code,
  ]
    .filter(Boolean)
    .join(", ");
  return value;
};

const pickUserAddress = (user: any) => {
  if (!user) return null;
  if (user.address || user.delivery_address)
    return user.address || user.delivery_address;
  const addresses = Array.isArray(user.addresses) ? user.addresses : [];
  return (
    addresses.find((address) => address?.is_default || address?.default) ||
    addresses[0] ||
    null
  );
};

const orderProductTitle = (items: Order["items"]) => {
  if (!items?.length) return "Product details";
  const first = getOrderItemName(items[0]) || "Product";
  return items.length > 1 ? `${first} +${items.length - 1} more` : first;
};

const subscriptionProductTitle = (
  items: SubscriptionItem[],
  productNames: Record<string, string>,
  products: any[],
) => {
  if (!items?.length) return "Product details";
  const first = getSubscriptionItemName(items[0], productNames, products);
  return items.length > 1 ? `${first} +${items.length - 1} more` : first;
};

// ─── Date Helpers 

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

const shouldSubscriptionDeliverOn = (sub: Subscription, dateKey: string) => {
  const status = String(sub.status || "").toLowerCase();
  if (
    sub.is_active === false ||
    ["cancelled", "canceled", "inactive", "paused", "rejected"].includes(status)
  ) {
    return false;
  }

  const pattern = String(sub.pattern || "").toLowerCase();
  const startKey = getOrderDateKey(sub.start_date);
  const endKey = getOrderDateKey(sub.end_date);
  if (!pattern || !startKey || dateKey < startKey) return false;
  if (endKey && dateKey > endKey) return false;

  const target = dateFromKey(dateKey);
  const start = dateFromKey(startKey);
  const daysDiff = Math.floor(
    (target.getTime() - start.getTime()) / (24 * 60 * 60 * 1000),
  );
  const mondayZeroDay = (target.getDay() + 6) % 7;
  const customDays = Array.isArray(sub.custom_days) ? sub.custom_days : [];

  if (pattern === "daily") return true;
  if (pattern === "alternate") return daysDiff % 2 === 0;
  if (pattern === "custom" || pattern === "weekly") {
    return customDays.map(Number).includes(mondayZeroDay);
  }
  if (pattern === "buy_once") return dateKey === startKey;
  return false;
};

//new helper for cehck status not is active true false
const isSubscriptionActive = (sub: Subscription) =>
  String(sub.status || "").toLowerCase() === "active";

const subscriptionDeliveryAmount = (sub: Subscription) => {
  const itemTotal = (sub.items || []).reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0,
  );
  return Number(itemTotal || sub.total_amount || 0);
};

const isWalletSubscription = (sub: Subscription) =>
  String(sub.payment_method || "").toLowerCase() === "wallet";

const getSubscriptionWalletBlock = (sub: Subscription) => {
  if (!isWalletSubscription(sub)) return null;
  if (sub.wallet_balance === undefined || sub.wallet_balance === null) return null;
  const due = subscriptionDeliveryAmount(sub);
  const balance = Number(sub.wallet_balance ?? 0);
  if (Number.isFinite(balance) && due > 0 && balance < due) {
    return { due, balance };
  }
  return null;
};

const getKnownCustomerWalletBalance = (customer: any) => {
  const raw = customer?.wallet_balance ?? customer?.wallet?.balance;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
};

const subscriptionOverlapsRange = (
  sub: Subscription,
  startKey: string,
  endKey: string,
) => {
  const subStart = getOrderDateKey(sub.start_date);
  const subEnd = getOrderDateKey(sub.end_date) || "9999-12-31";
  if (!subStart) return false;
  return (!startKey || subEnd >= startKey) && (!endKey || subStart <= endKey);
};

// ─── Product Name Cache

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
  // Only fetch for IDs that don't have a stored product_name
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

// ─── Constants

const ORDER_FILTERS = [
  "ACTIVE",
  "PENDING",
  "DELIVERED",
  "CANCELLED",
  "ALL",
] as const;
const DATE_FILTERS = ["ALL", "TODAY", "TOMORROW", "CUSTOM"] as const;

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
  weekly: {
    color: "#0891b2",
    bg: "#ECFEFF",
    icon: "calendar-number",
    label: "Weekly",
  },
};

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_ABBR = ["M", "T", "W", "T", "F", "S", "S"];

// ─── Cancel Modal

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
      i.quantity
        ? `${getOrderItemName(i)} ×${i.quantity}`
        : getOrderItemName(i),
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

// ─── Subscription Detail Modal

interface SubModalProps {
  visible: boolean;
  subscription: Subscription | null;
  productNames: Record<string, string>;
  products: any[];
  onDismiss: () => void;
}

function SubscriptionDetailModal({
  visible,
  subscription,
  productNames,
  products,
  onDismiss,
}: SubModalProps) {
  const slideAnim = useRef(new Animated.Value(400)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  type OrderRecord = { delivery_date: string; status: string };
  const [orderRecords, setOrderRecords] = useState<OrderRecord[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  useEffect(() => {
    if (visible && subscription?.id) {
      setOrdersLoading(true);
      api
        .getAdminSubscriptionOrders(subscription.id)
        .then(setOrderRecords)
        .catch(() => setOrderRecords([]))
        .finally(() => setOrdersLoading(false));
    } else {
      setOrderRecords([]);
    }
  }, [visible, subscription?.id]);

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

  const orderStatusByDate = useMemo(() => {
    const map: Record<string, string> = {};
    orderRecords.forEach((o) => {
      map[o.delivery_date] = o.status;
    });
    return map;
  }, [orderRecords]);

  const scheduleDates = useMemo(
    () => (subscription ? getSubscriptionDeliveryDates(subscription) : []),
    [subscription],
  );

  // ── ALL hooks are declared above this line. Nothing below may be a hook. ──
  if (!subscription) return null;

  const patternLabel: Record<string, string> = {
    daily: "Daily",
    alternate: "Alternate Days",
    custom: "Custom Days",
    weekly: "Weekly",
    buy_once: "One-Time",
  };
  const patternColor: Record<string, string> = {
    daily: "#BB6B3F",
    alternate: "#FF9675",
    custom: "#FFBF55",
    weekly: "#0891b2",
    buy_once: "#8B6854",
  };
  const patternBg: Record<string, string> = {
    daily: "#FFF3E8",
    alternate: "#FFF0EB",
    custom: "#FFF8E8",
    weekly: "#ECFEFF",
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
                {/* Customer */}
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

                {/* Schedule */}
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

                {/* Items */}
                <View style={sm.section}>
                  <Text style={sm.sectionLabel}>ITEMS</Text>
                  <View style={sm.itemsCard}>
                    {subscription.items?.map((item, i) => {
                      const name = getSubscriptionItemName(
                        item,
                        productNames,
                        products,
                      );
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
                              {formatSubscriptionItemQuantity(
                                item,
                                productNames,
                                products,
                              )}
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

                {/* Delivery Calendar — one row per scheduled delivery date */}
                <View style={sm.section}>
                  <Text style={sm.sectionLabel}>
                    DELIVERY CALENDAR{" "}
                    {ordersLoading
                      ? "· loading…"
                      : `· ${scheduleDates.length} dates`}
                  </Text>
                  <View style={sm.itemsCard}>
                    {scheduleDates.length === 0 ? (
                      <View style={{ padding: 14 }}>
                        <Text style={{ fontSize: 12, color: "#8B6854" }}>
                          No scheduled dates found.
                        </Text>
                      </View>
                    ) : (
                      scheduleDates.map((dateKey, i) => {
                        const status = (
                          orderStatusByDate[dateKey] || ""
                        ).toLowerCase();
                        const isDelivered = status === "delivered";
                        const isCancelled =
                          status === "cancelled" || status === "skipped";
                        const today = getLocalDateKey();
                        const isFuture = dateKey > today;

                        const icon = isDelivered
                          ? "checkmark-circle"
                          : isCancelled
                            ? "close-circle"
                            : isFuture
                              ? "ellipse-outline"
                              : "time-outline";
                        const iconColor = isDelivered
                          ? "#16A34A"
                          : isCancelled
                            ? "#FF5C5C"
                            : isFuture
                              ? "#C9A882"
                              : "#FFBF55";
                        const label = isDelivered
                          ? "Delivered"
                          : isCancelled
                            ? status === "skipped"
                              ? "Skipped"
                              : "Cancelled"
                            : isFuture
                              ? "Upcoming"
                              : "Pending";

                        return (
                          <View
                            key={dateKey}
                            style={[sm.itemRow, i > 0 && sm.itemRowBorder]}
                          >
                            <Ionicons
                              name={icon as any}
                              size={16}
                              color={iconColor}
                              style={{ marginRight: 10 }}
                            />
                            <View style={{ flex: 1 }}>
                              <Text style={sm.itemName}>{dateKey}</Text>
                            </View>
                            <Text
                              style={{
                                fontSize: 11,
                                fontWeight: "700",
                                color: iconColor,
                              }}
                            >
                              {label}
                            </Text>
                          </View>
                        );
                      })
                    )}
                  </View>
                </View>

                {/* Status */}
                <View
                  style={[
                    sm.statusBanner,
                    {
                      backgroundColor: isSubscriptionActive(subscription)
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
                    color={
                      isSubscriptionActive(subscription) ? "#22C55E" : "#FF5C5C"
                    }
                  />
                  <Text
                    style={[
                      sm.statusText,
                      {
                        color: isSubscriptionActive(subscription)
                          ? "#16A34A"
                          : "#FF5C5C",
                      },
                    ]}
                  >
                    {isSubscriptionActive(subscription)
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

// ─── Subscription Row

interface SubRowProps {
  item: Subscription;
  expanded: boolean;
  selected: boolean;
  onToggle: () => void;
  onToggleSelected: () => void;
  onViewDetail: () => void;
  onMarkDelivered: () => void;
  productNames: Record<string, string>;
  products: any[];
  bulkLoading: boolean;
}

function SubscriptionRow({
  item,
  expanded,
  selected,
  onToggle,
  onToggleSelected,
  onViewDetail,
  onMarkDelivered,
  productNames,
  products,
  bulkLoading,
}: SubRowProps) {
  const pc = PATTERN_CONFIG[item.pattern] ?? PATTERN_CONFIG.daily;
  const onVacation = !!item.on_vacation_today;
  const itemCount = item.items?.length ?? 0;
  const productTitle = subscriptionProductTitle(
    item.items || [],
    productNames,
    products,
  );
  const address = buildAddressText(item.customer_address);

  // ← NEW: block "Mark Delivered" before the subscription's start date
  const todayKey = getLocalDateKey();
  const startKey = getOrderDateKey(item.start_date);
  const notStartedYet = !!startKey && todayKey < startKey;
  const walletBlock = getSubscriptionWalletBlock(item);

  const canDeliver =
    isSubscriptionActive(item) &&
    !item.on_vacation_today &&
    !notStartedYet &&
    !walletBlock &&
    !["delivered", "cancelled", "skipped"].includes(
      String(item.delivery_status || item.status || "").toLowerCase(),
    );

  const isDeliveredToday =
    String(item.delivery_status || "").toLowerCase() === "delivered";

  // FIXED: use resolveItemName for summary line
  const itemSummaryLine = item.items
    ?.slice(0, 2)
    .map((p) => {
      const name = getSubscriptionItemName(p, productNames, products);
      const short = name.length > 14 ? name.slice(0, 13) + "…" : name;
      return `${short} · ${formatSubscriptionItemQuantity(
        p,
        productNames,
        products,
      )}`;
    })
    .join("  ·  ")
    .concat(item.items?.length > 2 ? `  +${item.items.length - 2} more` : "");

  return (
    <View style={[ss.card, !isSubscriptionActive(item) && ss.cardInactive]}>
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={onToggle}
        style={ss.summary}
      >
        <View style={ss.cardHeader}>
          <View style={ss.idRow}>
            {canDeliver ? (
              <TouchableOpacity
                style={[styles.selectBox, selected && styles.selectBoxActive]}
                onPress={(event) => {
                  event.stopPropagation?.();
                  onToggleSelected();
                }}
                activeOpacity={0.75}
              >
                {selected ? (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                ) : null}
              </TouchableOpacity>
            ) : null}
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
            <View style={ss.headerRightInfo}>
              <View
                style={[
                  ss.subStatusPill,
                  onVacation
                    ? ss.subStatusVacation
                    : isSubscriptionActive(item)
                      ? ss.subStatusActive
                      : ss.subStatusInactive,
                ]}
              >
                <Text
                  style={[
                    ss.subStatusText,
                    {
                      color: onVacation
                        ? "#B45309"
                        : isSubscriptionActive(item)
                          ? "#16A34A"
                          : "#FF5C5C",
                    },
                  ]}
                >
                  {onVacation
                    ? "On Vacation"
                    : isSubscriptionActive(item)
                      ? "Active"
                      : "Inactive"}
                </Text>
              </View>
              {onVacation && item.vacation_start_date && (
                <Text style={ss.vacationDates}>
                  {item.vacation_start_date} → {item.vacation_end_date}
                </Text>
              )}
              {isDeliveredToday && (
                <View style={ss.deliveredTodayPill}>
                  <Ionicons name="checkmark-circle" size={10} color="#16A34A" />
                  <Text style={ss.deliveredTodayText}>Delivered Today</Text>
                </View>
              )}
              {walletBlock ? (
                <View style={ss.walletLowPill}>
                  <Ionicons name="wallet-outline" size={10} color="#DC2626" />
                  <Text style={ss.walletLowText}>Low Wallet</Text>
                </View>
              ) : null}
              <Text style={ss.headerProductName} numberOfLines={1}>
                {productTitle}
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

        {/* Customer */}
        {item.customer_name && (
          <View style={ss.customerRow}>
            <Ionicons name="person-outline" size={12} color="#8B6854" />
            <Text style={ss.customerText}>{item.customer_name}</Text>
            {item.customer_phone && (
              <Text style={ss.customerPhone}> · {item.customer_phone}</Text>
            )}
          </View>
        )}
      </TouchableOpacity>

      {/* Expanded section — FIXED: uses resolveItemName */}
      {expanded && (
        <View style={ss.expanded}>
          <View style={ss.divider} />

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

          <View style={ss.divider} />
          <View
            style={[
              ss.patternPill,
              { alignSelf: "flex-start", backgroundColor: pc.bg },
            ]}
          >
            <Ionicons name={pc.icon} size={12} color={pc.color} />
            <Text style={[ss.patternText, { color: pc.color }]}>
              {pc.label}
            </Text>
          </View>

          <View style={ss.datesRowExpanded}>
            {item.start_date && (
              <View style={ss.dateBit}>
                <Ionicons name="calendar-outline" size={11} color="#FFBF55" />
                <Text style={ss.dateText}>Start {item.start_date}</Text>
              </View>
            )}
            {item.end_date && (
              <View style={ss.dateBit}>
                <Ionicons
                  name="calendar-number-outline"
                  size={11}
                  color="#FFBF55"
                />
                <Text style={ss.dateText}>End {item.end_date}</Text>
              </View>
            )}
          </View>

          {address ? (
            <>
              <View style={ss.divider} />
              <Text style={ss.sectionLabel}>ADDRESS</Text>
              <View style={ss.slotRow}>
                <View style={ss.slotIcon}>
                  <Ionicons name="location-outline" size={13} color="#FF9675" />
                </View>
                <Text style={ss.slotText}>{address}</Text>
              </View>
            </>
          ) : null}

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

          <View style={ss.divider} />
          <Text style={ss.sectionLabel}>
            ITEMS · {itemCount} product{itemCount !== 1 ? "s" : ""}
          </Text>
          <View style={ss.itemsCard}>
            {item.items?.map((p, i) => {
              // FIXED: resolveItemName used here
              const name = resolveItemName(p, productNames);
              return (
                <View
                  key={i}
                  style={[ss.itemCardRow, i > 0 && ss.itemCardBorder]}
                >
                  <View style={ss.itemCardLeft}>
                    <View style={ss.itemIndexBubble}>
                      <Text style={ss.itemIndexText}>{i + 1}</Text>
                    </View>
                    <View style={ss.itemCardInfo}>
                      <Text style={ss.itemCardName} numberOfLines={2}>
                        {name}
                      </Text>
                      <Text style={ss.itemCardPricePerUnit}>
                        {formatSubscriptionItemQuantity(
                          p,
                          productNames,
                          products,
                        )}
                      </Text>
                    </View>
                  </View>
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
            <View style={ss.itemsTotalRow}>
              <Text style={ss.itemsTotalLabel}>Total</Text>
              <Text style={ss.itemsTotalVal}>₹{item.total_amount ?? 0}</Text>
            </View>
          </View>
          <View style={ss.divider} />
          {canDeliver ? (
            <>
              <TouchableOpacity
                style={styles.deliveredExpandedBtn}
                onPress={onMarkDelivered}
                activeOpacity={0.8}
                disabled={bulkLoading}
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={16}
                  color="#16A34A"
                />
                <Text style={styles.deliveredExpandedText}>Mark Delivered</Text>
              </TouchableOpacity>
              <View style={styles.actionGap} />
            </>
          ) : isDeliveredToday ? (
            <>
              <View style={styles.deliveredDoneBanner}>
                <Ionicons
                  name="checkmark-done-circle"
                  size={18}
                  color="#16A34A"
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.deliveredDoneTitle}>Delivered Today</Text>
                  <Text style={styles.deliveredDoneSub}>
                    Order for today has been marked complete.
                  </Text>
                </View>
              </View>
              <View style={styles.actionGap} />
            </>
          ) : notStartedYet ? (
            <>
              <View style={styles.unassignedRow}>
                <Ionicons name="time-outline" size={13} color="#FFBF55" />
                <Text style={styles.unassignedText}>
                  Starts on {item.start_date}
                </Text>
              </View>
              <View style={styles.actionGap} />
            </>
          ) : walletBlock ? (
            <>
              <View style={styles.walletBlockedBanner}>
                <Ionicons name="wallet-outline" size={16} color="#DC2626" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.walletBlockedTitle}>
                    Low Wallet Balance
                  </Text>
                  <Text style={styles.walletBlockedSub}>
                    Balance ₹{walletBlock.balance} · Required ₹{walletBlock.due}
                  </Text>
                </View>
              </View>
              <View style={styles.actionGap} />
            </>
          ) : null}
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

// ─── Main Screen

export default function AdminOrdersScreen() {
  const isFocused = useIsFocused();
  const params = useLocalSearchParams<{ tab?: string }>();

  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"orders" | "subscriptions">(
    "orders",
  );
  const tabAnim = useRef(new Animated.Value(0)).current;

  const [currentAdmin, setCurrentAdmin] = useState<{
    id: string;
    name?: string;
  } | null>(null);
  const [globalLoading, setGlobalLoading] = useState(true);

  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersRefreshing, setOrdersRefreshing] = useState(false);
  const [expandedOrderIds, setExpandedOrderIds] = useState<Set<string>>(
    new Set(),
  );
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(
    new Set(),
  );

  const [filter, setFilter] =
    useState<(typeof ORDER_FILTERS)[number]>("ACTIVE");
  const [dateFilter, setDateFilter] =
    useState<(typeof DATE_FILTERS)[number]>("ALL");
  const [productFilter, setProductFilter] = useState("ALL");
  const [selectedCustomer, setSelectedCustomer] = useState("ALL");
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [datePickerTarget, setDatePickerTarget] = useState<
    "start" | "end" | null
  >(null);
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);

  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  const [allSubscriptions, setAllSubscriptions] = useState<Subscription[]>([]);
  const [subsLoading, setSubsLoading] = useState(false);
  const [subsRefreshing, setSubsRefreshing] = useState(false);
  const [subFilter, setSubFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">(
    "ACTIVE",
  );
  const [expandedSubIds, setExpandedSubIds] = useState<Set<string>>(new Set());
  const [selectedSubIds, setSelectedSubIds] = useState<Set<string>>(new Set());
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  const [productNames, setProductNames] = useState<Record<string, string>>({});
  const [resolvingNames, setResolvingNames] = useState(false);

  // ── Load admin identity
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

  const switchTab = (tab: "orders" | "subscriptions") => {
    setActiveTab(tab);
    Animated.spring(tabAnim, {
      toValue: tab === "orders" ? 0 : 1,
      useNativeDriver: false,
      tension: 200,
      friction: 16,
    }).start();
  };

  useEffect(() => {
    if (params.tab === "subscriptions") {
      switchTab("subscriptions");
    } else if (params.tab === "orders") {
      switchTab("orders");
    }
  }, [params.tab]);

  // ── Fetch orders
const fetchOrders = useCallback(async () => {
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

    setAllOrders(ordersData);       // backend already returns buy_once only
    setProducts(productsData);
  } catch (e: any) {
    console.error("[AdminOrders] fetchOrders FAILED:", e?.message ?? e);
  } finally {
    setOrdersLoading(false);
    setOrdersRefreshing(false);
  }
}, [currentAdmin, dateFilter, customStartDate, customEndDate]);

  // ── Fetch subscriptions
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
          const all = await api.getSubscriptions();
          data = all.filter(
            (s: Subscription) => s.admin_id === currentAdmin.id,
          );
        } catch (e2: any) {
          console.warn("[AdminOrders] fallback failed:", e2?.message);
        }
      }

      const recurring = data.filter((s: Subscription) => {
        const p = (s.pattern ?? "").toLowerCase();
        return p !== "buy_once" && p !== "";
      });

      const [customers, adminCustomers] = await Promise.all([
        api.getAllUsers("customer").catch(() => []),
        api.getAdminCustomers({ limit: 1000 }).catch(() => []),
      ]);
      const customerMap = new Map<string, any>();
      (Array.isArray(customers) ? customers : []).forEach((customer) => {
        [customer.id, customer._id, customer.phone, customer.name]
          .filter(Boolean)
          .forEach((key) => customerMap.set(String(key), customer));
      });
      (Array.isArray(adminCustomers) ? adminCustomers : []).forEach((customer) => {
        [
          customer.id,
          customer._id,
          customer.linked_user_id,
          customer.phone,
          customer.name,
        ]
          .filter(Boolean)
          .forEach((key) => customerMap.set(String(key), customer));
      });

      const withAddress = recurring.map((sub) => {
        const customer =
          customerMap.get(String(sub.user_id || "")) ||
          customerMap.get(String(sub.customer_phone || "")) ||
          customerMap.get(String(sub.customer_name || ""));
        const address = pickUserAddress(customer);
        const currentAddress = buildAddressText(sub.customer_address)
          ? sub.customer_address
          : address;
        return {
          ...sub,
          customer_address: currentAddress,
          customer_name: sub.customer_name || customer?.name,
          customer_phone: sub.customer_phone || customer?.phone,
          wallet_balance:
            sub.wallet_balance ?? getKnownCustomerWalletBalance(customer),
        };
      });

      const vacations = await api.getAdminVacationsAll().catch(() => []);
      const today = getLocalDateKey();
      const withVacation = withAddress.map((sub) => {
        const userVacation = vacations.find((v: any) => {
          const vacUserId = String(v.user_id || v.customer_id || "");
          if (!vacUserId || vacUserId !== String(sub.user_id || ""))
            return false;
          const start = getOrderDateKey(v.start_date);
          const end = getOrderDateKey(v.end_date);
          return start && end && today >= start && today <= end;
        });
        return userVacation
          ? {
              ...sub,
              on_vacation_today: true,
              vacation_start_date: userVacation.start_date,
              vacation_end_date: userVacation.end_date,
            }
          : { ...sub, on_vacation_today: false };
      });
      console.log(
        "RAW SUB SAMPLE:",
        JSON.stringify(
          withAddress.find((s) => s.customer_name) || withAddress[0],
        ),
      );

      setAllSubscriptions(withVacation);

      // Only resolve names for items that DON'T have product_name stored
      const needsResolution = withVacation.flatMap((s) =>
        (s.items ?? [])
          .filter((item) => !item.product_name)
          .map((item) => item.product_id),
      );

      if (needsResolution.length > 0) {
        setResolvingNames(true);
        try {
          const names = await resolveProductNames(needsResolution);
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

  // ── Fetch on tab/focus change
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
      const timer = setInterval(fetchSubscriptions, 5_000);
      return () => clearInterval(timer);
    }
  }, [
    activeTab,
    isFocused,
    globalLoading,
    currentAdmin,
    fetchOrders,
    fetchSubscriptions,
  ]);

  const onOrdersRefresh = useCallback(() => {
    setOrdersRefreshing(true);
    fetchOrders();
  }, [fetchOrders]);

  const onSubsRefresh = useCallback(() => {
    setSubsRefreshing(true);
    fetchSubscriptions();
  }, [fetchSubscriptions]);

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

  const toggleOrderSelected = (id: string) => {
    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSubSelected = (id: string) => {
    const sub = allSubscriptions.find((item) => item.id === id);
    if (sub && getSubscriptionWalletBlock(sub)) {
      const block = getSubscriptionWalletBlock(sub)!;
      Alert.alert(
        "Low wallet balance",
        `This subscription cannot be selected for delivery. Customer balance is ₹${block.balance}, required ₹${block.due}.`,
      );
      return;
    }
    setSelectedSubIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

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

  const isCancellable = (o: Order) => {
    const s = o.status?.toLowerCase();
    return s !== "delivered" && s !== "cancelled";
  };
  const isDelivered = (o: Order) => o.status?.toLowerCase() === "delivered";
  const isCancelled = (o: Order) => o.status?.toLowerCase() === "cancelled";

  const productTabs = useMemo(() => {
    const fromOrders = allOrders.flatMap((order) =>
      (order.items || []).map((item) => getOrderItemName(item)).filter(Boolean),
    );
    return [
      "ALL",
      ...Array.from(new Set([...products.map((p) => p.name), ...fromOrders])),
    ];
  }, [allOrders, products]);

  const customerOptions = useMemo(() => {
    const source = activeTab === "orders" ? allOrders : allSubscriptions;
    const names = source
      .map(
        (item) =>
          item.customer_name || item.customer_phone || "Unknown Customer",
      )
      .filter(Boolean);
    return ["ALL", ...Array.from(new Set(names))];
  }, [activeTab, allOrders, allSubscriptions]);

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
    return allOrders.filter((order) => {
      const status = order.status?.toLowerCase();
      const isCancelled =
        status === "cancelled" ||
        status === "canceled" ||
        status === "rejected" ||
        status === "skipped";
      const statusMatch =
        filter === "ALL" ||
        (filter === "ACTIVE"
          ? !isCancelled
          : filter === "DELIVERED"
            ? status === "delivered"
            : filter === "CANCELLED"
              ? isCancelled
              : status !== "delivered" && !isCancelled);
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
          ? (!customStartDate ||
              getOrderDateKey(order.delivery_date) >= customStartDate) &&
            (!customEndDate ||
              getOrderDateKey(order.delivery_date) <= customEndDate)
          : getOrderDateKey(order.delivery_date) ===
            (dateFilter === "TODAY"
              ? getLocalDateKey()
              : getTomorrowDateKey()));
      return statusMatch && customerMatch && productMatch && dateMatch;
    });
  }, [
    allOrders,
    products,
    filter,
    dateFilter,
    productFilter,
    selectedCustomer,
    customStartDate,
    customEndDate,
  ]);

  const filteredSubs = allSubscriptions.filter((s) => {
    const statusMatch =
      subFilter === "ALL" ||
      (subFilter === "ACTIVE"
        ? isSubscriptionActive(s)
        : !isSubscriptionActive(s));
    const customerMatch =
      selectedCustomer === "ALL" ||
      s.customer_name === selectedCustomer ||
      s.customer_phone === selectedCustomer;
    const dateMatch =
      dateFilter === "ALL" ||
      (dateFilter === "CUSTOM"
        ? subscriptionOverlapsRange(s, customStartDate, customEndDate)
        : shouldSubscriptionDeliverOn(
            s,
            dateFilter === "TODAY" ? getLocalDateKey() : getTomorrowDateKey(),
          ));
    return statusMatch && customerMatch && dateMatch;
  });

  const subscriptionSummary = useMemo(() => {
    const productMap = new Map<
      string,
      {
        subscriptions: number;
        quantity: number;
        unit: string;
        isMilk: boolean;
        isGhee: boolean;
      }
    >();
    let milkSubscriptions = 0;
    let gheeSubscriptions = 0;

    filteredSubs.forEach((sub) => {
      const items = sub.items || [];
      const hasGhee = items.some((item) => {
        const name = getSubscriptionItemName(item, productNames, products);
        return isGheeText(name);
      });
      const hasMilk = items.some((item) =>
        isMilkSubscriptionItem(item, productNames, products),
      );
      if (hasMilk) milkSubscriptions += 1;
      if (hasGhee) gheeSubscriptions += 1;

      const seenInSub = new Set<string>();
      items.forEach((item) => {
        const name = getSubscriptionItemName(item, productNames, products);
        const unit = getSubscriptionItemUnit(item, productNames, products);
        const key = normalizeName(name);
        const current = productMap.get(key) || {
          subscriptions: 0,
          quantity: 0,
          unit,
          isMilk: isMilkSubscriptionItem(item, productNames, products),
          isGhee: isGheeText(name),
        };
        productMap.set(key, {
          ...current,
          subscriptions: current.subscriptions + (seenInSub.has(key) ? 0 : 1),
          quantity: current.quantity + Number(item.quantity || 1),
          unit: current.unit || unit,
          isMilk:
            current.isMilk ||
            isMilkSubscriptionItem(item, productNames, products),
          isGhee: current.isGhee || isGheeText(name),
        });
        seenInSub.add(key);
      });
    });

    const productsSummary = Array.from(productMap.entries())
      .map(([nameKey, data]) => ({
        name:
          filteredSubs
            .flatMap((sub) => sub.items || [])
            .map((item) =>
              getSubscriptionItemName(item, productNames, products),
            )
            .find((name) => normalizeName(name) === nameKey) || "Product",
        ...data,
      }))
      .sort((a, b) => b.subscriptions - a.subscriptions);
    const fullCreamMilk = productsSummary.find((item) =>
      normalizeName(item.name).includes("full cream milk"),
    );

    return {
      total: filteredSubs.length,
      milkSubscriptions,
      gheeSubscriptions,
      fullCreamMilk,
      productsSummary,
    };
  }, [filteredSubs, productNames, products]);

  const selectableOrders = useMemo(
    () =>
      filteredOrders.filter((order) => {
        const status = String(order.status || "").toLowerCase();
        return (
          status !== "delivered" &&
          status !== "cancelled" &&
          status !== "skipped"
        );
      }),
    [filteredOrders],
  );

  const selectableTodayOrders = useMemo(
    () =>
      selectableOrders.filter(
        (order) => getOrderDateKey(order.delivery_date) === getLocalDateKey(),
      ),
    [selectableOrders],
  );

  const selectableSubs = useMemo(
    () =>
      filteredSubs.filter((sub) => {
        const status = String(
          sub.delivery_status || sub.status || "",
        ).toLowerCase();
        const startKey = getOrderDateKey(sub.start_date);
        const notStartedYet = !!startKey && getLocalDateKey() < startKey;
        return (
          status !== "delivered" &&
          status !== "cancelled" &&
          status !== "skipped" &&
          isSubscriptionActive(sub) &&
          !notStartedYet &&
          !getSubscriptionWalletBlock(sub)
        );
      }),
    [filteredSubs],
  );

  const selectableTodaySubs = useMemo(
    () =>
      selectableSubs.filter((sub) =>
        shouldSubscriptionDeliverOn(sub, getLocalDateKey()),
      ),
    [selectableSubs],
  );

  useEffect(() => {
    if (activeTab !== "subscriptions") return;
    const allowed = new Set(selectableSubs.map((sub) => sub.id));
    setSelectedSubIds((prev) => {
      const next = new Set(Array.from(prev).filter((id) => allowed.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [activeTab, selectableSubs]);

  const setSelectedOrders = (ids: string[]) =>
    setSelectedOrderIds(new Set(ids));
  const setSelectedSubs = (ids: string[]) => setSelectedSubIds(new Set(ids));

  const handleSingleOrderDelivered = async (order: Order) => {
    setBulkLoading(true);
    try {
      await api.updateAdminOrderStatus(order.id, "delivered");
      await fetchOrders();
      setSelectedOrderIds((prev) => {
        const next = new Set(prev);
        next.delete(order.id);
        return next;
      });
    } catch (e: any) {
      Alert.alert(
        "Could not mark delivered",
        e?.message || "Please try again.",
      );
    } finally {
      setBulkLoading(false);
    }
  };

  const handleSingleSubDelivered = async (sub: Subscription) => {
    const walletBlock = getSubscriptionWalletBlock(sub);
    if (walletBlock) {
      Alert.alert(
        "Low wallet balance",
        `Cannot mark this subscription delivered. Customer balance is ₹${walletBlock.balance}, required ₹${walletBlock.due}.`,
      );
      return;
    }
    setBulkLoading(true);
    try {
      await api.updateAdminSubscriptionStatus(sub.id, "delivered");
      await fetchSubscriptions();
      setSelectedSubIds((prev) => {
        const next = new Set(prev);
        next.delete(sub.id);
        return next;
      });
    } catch (e: any) {
      Alert.alert(
        "Could not mark delivered",
        e?.message || "Please try again.",
      );
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkDelivered = async () => {
    const isOrders = activeTab === "orders";
    let ids = Array.from(isOrders ? selectedOrderIds : selectedSubIds);
    if (!isOrders) {
      const allowedIds = new Set(selectableSubs.map((sub) => sub.id));
      const blockedCount = ids.filter((id) => !allowedIds.has(id)).length;
      ids = ids.filter((id) => allowedIds.has(id));
      if (blockedCount) {
        setSelectedSubIds(new Set(ids));
        Alert.alert(
          "Some subscriptions skipped",
          "Low-wallet or inactive subscriptions were removed from selection.",
        );
      }
    }
    if (!ids.length) {
      Alert.alert(
        "Select items",
        `Select ${isOrders ? "orders" : "subscriptions"} first.`,
      );
      return;
    }
    Alert.alert(
      "Mark Delivered?",
      `Mark ${ids.length} selected ${isOrders ? "orders" : "subscriptions"} as delivered?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Mark Delivered",
          onPress: async () => {
            setBulkLoading(true);
            try {
              if (isOrders) {
                await api.bulkUpdateAdminOrderStatus(ids, "delivered");
                setSelectedOrderIds(new Set());
                await fetchOrders();
              } else {
                await api.bulkUpdateAdminSubscriptionStatus(ids, "delivered");
                setSelectedSubIds(new Set());
                await fetchSubscriptions();
              }
            } catch (e: any) {
              Alert.alert(
                "Bulk update failed",
                e?.message || "Please try again.",
              );
            } finally {
              setBulkLoading(false);
            }
          },
        },
      ],
    );
  };

  const activeFilterCount = [
    activeTab === "orders" ? filter !== "ACTIVE" : subFilter !== "ACTIVE",
    dateFilter !== "ALL",
    selectedCustomer !== "ALL",
  ].filter(Boolean).length;

  const resetFilters = () => {
    setFilter("ACTIVE");
    setSubFilter("ACTIVE");
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
      if (customStartDate && dateKey < customStartDate)
        setCustomStartDate(dateKey);
    }
  };

  const ordersCount = allOrders.filter((o) => {
    const s = o.status?.toLowerCase();
    return s !== "delivered" && s !== "cancelled";
  }).length;

  const tabCount =
    activeTab === "orders" ? filteredOrders.length : filteredSubs.length;

  const tabIndicatorLeft = tabAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["2%", "52%"],
  });
  const selectedCount =
    activeTab === "orders" ? selectedOrderIds.size : selectedSubIds.size;
  const visibleSelectableCount =
    activeTab === "orders" ? selectableOrders.length : selectableSubs.length;
  const todaySelectableCount =
    activeTab === "orders"
      ? selectableTodayOrders.length
      : selectableTodaySubs.length;

  if (globalLoading) return <LoadingScreen />;

  // ── Render order card
  const renderOrder = ({ item }: { item: Order }) => {
    const sc =
      statusConfig[item.status?.toLowerCase()] ?? statusConfig["unassigned"];
    const expanded = expandedOrderIds.has(item.id);
    const delivered = isDelivered(item);
    const cancelled = isCancelled(item);
    const cancellable = isCancellable(item);
    const selected = selectedOrderIds.has(item.id);
    const productTitle = orderProductTitle(item.items || []);
    const address = buildAddressText(item.address);

    return (
      <View style={[styles.card, cancelled && styles.cardCancelled]}>
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => toggleOrderExpand(item.id)}
          style={styles.summary}
        >
          <View style={styles.cardHeader}>
            <View style={styles.orderIdRow}>
              {cancellable ? (
                <TouchableOpacity
                  style={[styles.selectBox, selected && styles.selectBoxActive]}
                  onPress={(event) => {
                    event.stopPropagation?.();
                    toggleOrderSelected(item.id);
                  }}
                  activeOpacity={0.75}
                >
                  {selected ? (
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  ) : null}
                </TouchableOpacity>
              ) : null}
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
              <View style={styles.headerRightInfo}>
                <View style={[styles.statusPill, { backgroundColor: sc.bg }]}>
                  <Ionicons name={sc.icon} size={11} color={sc.color} />
                  <Text style={[styles.statusText, { color: sc.color }]}>
                    {sc.label}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.headerProductName,
                    cancelled && { color: "#bbb" },
                  ]}
                  numberOfLines={1}
                >
                  {productTitle}
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

          {item.customer_name && (
            <View style={styles.customerRow}>
              <Ionicons name="person-outline" size={12} color="#8B6854" />
              <Text style={styles.customerText}>{item.customer_name}</Text>
            </View>
          )}

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
                  <Text style={styles.expandedItemName}>
                    {getOrderItemName(p)}
                  </Text>
                  {p.quantity != null && (
                    <View style={styles.expandedItemQtyBadge}>
                      <Text style={styles.expandedItemQty}>
                        {formatOrderItemQuantity(p, products)}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>

            {address ? (
              <>
                <View style={styles.divider} />
                <Text style={styles.colLabel}>ADDRESS</Text>
                <View style={styles.detailRow}>
                  <Ionicons name="location-outline" size={13} color="#8B6854" />
                  <Text style={styles.detailText}>{address}</Text>
                </View>
              </>
            ) : null}

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
                  style={styles.deliveredExpandedBtn}
                  onPress={() => handleSingleOrderDelivered(item)}
                  activeOpacity={0.8}
                  disabled={bulkLoading}
                >
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={16}
                    color="#16A34A"
                  />
                  <Text style={styles.deliveredExpandedText}>
                    Mark Delivered
                  </Text>
                </TouchableOpacity>
                <View style={styles.actionGap} />
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
      selected={selectedSubIds.has(item.id)}
      onToggle={() => toggleSubExpand(item.id)}
      onToggleSelected={() => toggleSubSelected(item.id)}
      onViewDetail={() => setSelectedSub(item)}
      onMarkDelivered={() => handleSingleSubDelivered(item)}
      productNames={productNames}
      products={products}
      bulkLoading={bulkLoading}
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
        products={products}
        onDismiss={() => setSelectedSub(null)}
      />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>
            {activeTab === "orders" ? "Orders" : "Subscriptions"}
          </Text>
          {activeTab === "orders" && (
            <Text style={styles.activeFilterText}>
              {filteredOrders.length} shown · {filter} · {dateFilter}
            </Text>
          )}
          {activeTab === "subscriptions" && (
            <Text style={styles.activeFilterText}>
              {filteredSubs.length} shown · {subFilter} · {dateFilter}
            </Text>
          )}
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
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
  <TouchableOpacity
    style={styles.headerNotificationBtn}
    onPress={() =>
      router.push({
        pathname: "/(admin)/notification",
        params: { from: "orders", tab: activeTab },
      } as any)
    }
    activeOpacity={0.82}
  >
    <Ionicons name="notifications-outline" size={19} color="#BB6B3F" />
  </TouchableOpacity>
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
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{tabCount}</Text>
          </View>
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

      <View style={styles.bulkBar}>
        <View style={styles.bulkHeaderRow}>
          <Text style={styles.bulkHeading}>
            {activeTab === "orders"
              ? "Orders Mark Delivered"
              : "Subscriptions Mark Delivered"}
          </Text>
          <TouchableOpacity
            style={[
              styles.bulkDeliveredBtn,
              (selectedCount === 0 || bulkLoading) && styles.bulkBtnDisabled,
            ]}
            onPress={handleBulkDelivered}
            disabled={selectedCount === 0 || bulkLoading}
          >
            {bulkLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="checkmark-circle" size={15} color="#fff" />
            )}
            <Text style={styles.bulkDeliveredText}>Mark Delivered</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.bulkInfo}>
          <Ionicons name="checkmark-done-outline" size={15} color="#BB6B3F" />
          <Text style={styles.bulkInfoText}>{selectedCount} selected</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.bulkActions}
        >
          <TouchableOpacity
            style={styles.bulkChip}
            onPress={() =>
              activeTab === "orders"
                ? setSelectedOrders(
                    selectableTodayOrders.map((item) => item.id),
                  )
                : setSelectedSubs(selectableTodaySubs.map((item) => item.id))
            }
            disabled={todaySelectableCount === 0 || bulkLoading}
          >
            <Text style={styles.bulkChipText}>
              Select Today ({todaySelectableCount})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.bulkChip}
            onPress={() =>
              activeTab === "orders"
                ? setSelectedOrders(selectableOrders.map((item) => item.id))
                : setSelectedSubs(selectableSubs.map((item) => item.id))
            }
            disabled={visibleSelectableCount === 0 || bulkLoading}
          >
            <Text style={styles.bulkChipText}>
              Select Visible ({visibleSelectableCount})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.bulkChip}
            onPress={() =>
              activeTab === "orders"
                ? setSelectedOrderIds(new Set())
                : setSelectedSubIds(new Set())
            }
            disabled={selectedCount === 0 || bulkLoading}
          >
            <Text style={styles.bulkChipText}>Clear</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* ORDERS TAB */}
      {activeTab === "orders" && (
        <>
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

          {ordersLoading && !ordersRefreshing ? (
            <View style={styles.loadingWrapper}>
              <ActivityIndicator size="large" color="#FF9675" />
              <Text style={styles.loadingText}>Loading orders…</Text>
            </View>
          ) : (
            <FlatList
              style={styles.orderList}
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
                    {filter !== "ALL" ||
                    dateFilter !== "ALL" ||
                    selectedCustomer !== "ALL"
                      ? "Try changing customer, product or date filter."
                      : "One-time orders placed by your customers will appear here."}
                  </Text>
                </View>
              }
              renderItem={renderOrder}
            />
          )}
        </>
      )}

      {/* SUBSCRIPTIONS TAB */}
      {/* SUBSCRIPTIONS TAB */}
      {activeTab === "subscriptions" && (
        <>
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
              ListHeaderComponent={
                <View style={styles.subscriptionSummaryWrap}>
                  <View style={styles.subscriptionSummaryGrid}>
                    <View style={styles.subscriptionSummaryCard}>
                      <Text style={styles.subscriptionSummaryValue}>
                        {subscriptionSummary.total}
                      </Text>
                      <Text style={styles.subscriptionSummaryLabel}>
                        Total Subs
                      </Text>
                    </View>
                    <View style={styles.subscriptionSummaryCard}>
                      <Text style={styles.subscriptionSummaryValue}>
                        {subscriptionSummary.milkSubscriptions}
                      </Text>
                      <Text style={styles.subscriptionSummaryLabel}>
                        Milk Subs
                      </Text>
                    </View>
                    <View style={styles.subscriptionSummaryCard}>
                      <Text style={styles.subscriptionSummaryValue}>
                        {subscriptionSummary.gheeSubscriptions}
                      </Text>
                      <Text style={styles.subscriptionSummaryLabel}>
                        Ghee Subs
                      </Text>
                    </View>
                    <View style={styles.subscriptionSummaryCard}>
                      <Text style={styles.subscriptionSummaryValue}>
                        {subscriptionSummary.fullCreamMilk?.subscriptions || 0}
                      </Text>
                      <Text style={styles.subscriptionSummaryLabel}>
                        Full Cream Milk
                      </Text>
                    </View>
                  </View>

                  {subscriptionSummary.productsSummary.length > 0 ? (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.subscriptionProductChips}
                    >
                      {subscriptionSummary.productsSummary
                        .slice(0, 6)
                        .map((item) => (
                          <View
                            key={item.name}
                            style={styles.subscriptionProductChip}
                          >
                            <Text
                              style={styles.subscriptionProductName}
                              numberOfLines={1}
                            >
                              {item.name}
                            </Text>
                            <Text style={styles.subscriptionProductMeta}>
                              {item.subscriptions} subs ·{" "}
                              {formatBaseMetric(
                                item.quantity *
                                  (parseUnitDescriptor(item.unit)?.packSize ||
                                    1),
                                parseUnitDescriptor(item.unit)?.kind,
                              )}
                            </Text>
                          </View>
                        ))}
                    </ScrollView>
                  ) : null}
                </View>
              }
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <View style={styles.emptyIconCircle}>
                    <Ionicons name="repeat-outline" size={36} color="#FF9675" />
                  </View>
                  <Text style={styles.emptyTitle}>No subscriptions found</Text>
                  <Text style={styles.emptyDesc}>
                    {subFilter !== "ALL" ||
                    dateFilter !== "ALL" ||
                    selectedCustomer !== "ALL"
                      ? "Try changing customer, status or date filter."
                      : "Recurring subscriptions (daily, alternate, custom) appear here."}
                  </Text>
                </View>
              }
              renderItem={renderSubscription}
            />
          )}
        </>
      )}

      {/* Filter Sheet Modal */}
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
              <Text style={styles.sheetTitle}>
                {activeTab === "orders"
                  ? "Filter Orders"
                  : "Filter Subscriptions"}
              </Text>
              <TouchableOpacity
                style={styles.sheetCloseBtn}
                onPress={() => setFilterSheetVisible(false)}
              >
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
                {selectedCustomer === "ALL"
                  ? "All Customers"
                  : selectedCustomer}
              </Text>
              <Ionicons
                name={customerDropdownOpen ? "chevron-up" : "chevron-down"}
                size={17}
                color="#8B6854"
              />
            </TouchableOpacity>
            {customerDropdownOpen && (
              <View style={styles.customerDropdownList}>
                <ScrollView
                  nestedScrollEnabled
                  showsVerticalScrollIndicator={false}
                >
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
                        {active && (
                          <Ionicons
                            name="checkmark"
                            size={16}
                            color="#BB6B3F"
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            <Text style={styles.sheetLabel}>Status</Text>
            <View style={styles.filterRowSheet}>
              {(activeTab === "orders"
                ? ORDER_FILTERS
                : (["ACTIVE", "INACTIVE", "ALL"] as const)
              ).map((f) => {
                const active =
                  activeTab === "orders" ? filter === f : subFilter === f;
                return (
                  <TouchableOpacity
                    key={f}
                    style={[
                      styles.filterChip,
                      active && styles.filterChipActive,
                    ]}
                    onPress={() =>
                      activeTab === "orders"
                        ? setFilter(f as typeof filter)
                        : setSubFilter(f as typeof subFilter)
                    }
                  >
                    <Text
                      style={[
                        styles.filterText,
                        active && styles.filterTextActive,
                      ]}
                    >
                      {f}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.sheetLabel}>Date</Text>
            <View style={styles.filterRowSheet}>
              {DATE_FILTERS.map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[
                    styles.filterChip,
                    dateFilter === f && styles.filterChipActive,
                  ]}
                  onPress={() => setDateFilter(f)}
                >
                  <Text
                    style={[
                      styles.filterText,
                      dateFilter === f && styles.filterTextActive,
                    ]}
                  >
                    {f}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {dateFilter === "CUSTOM" && (
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
                {datePickerTarget && (
                  <View style={styles.datePickerWrap}>
                    <DateTimePicker
                      value={dateFromKey(
                        datePickerTarget === "start"
                          ? customStartDate || getLocalDateKey()
                          : customEndDate ||
                              customStartDate ||
                              getLocalDateKey(),
                      )}
                      mode="date"
                      display={Platform.OS === "ios" ? "inline" : "default"}
                      onChange={handleCustomDateChange}
                      maximumDate={new Date()}
                    />
                    {Platform.OS === "ios" && (
                      <TouchableOpacity
                        style={styles.datePickerDoneBtn}
                        onPress={() => setDatePickerTarget(null)}
                      >
                        <Text style={styles.datePickerDoneText}>Done</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </>
            )}

            <View style={styles.sheetActions}>
              <TouchableOpacity style={styles.resetBtn} onPress={resetFilters}>
                <Text style={styles.resetBtnText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyBtn}
                onPress={() => setFilterSheetVisible(false)}
              >
                <Text style={styles.applyBtnText}>
                  Show {tabCount}{" "}
                  {activeTab === "orders" ? "Orders" : "Subscriptions"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── StyleSheets

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
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    maxWidth: "48%",
  },
  headerRightInfo: { alignItems: "flex-end", flexShrink: 1 },
  headerProductName: {
    marginTop: 4,
    maxWidth: 150,
    fontSize: 11,
    fontWeight: "900",
    color: "#BB6B3F",
    textAlign: "right",
  },
  subStatusPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
  },
  subStatusActive: { backgroundColor: "#ECFDF5" },
  subStatusVacation: { backgroundColor: "#FFFBEB" },
  subStatusInactive: { backgroundColor: "#FFF0F0" },
  subStatusText: { fontSize: 10.5, fontWeight: "900" },
  vacationDates: {
    fontSize: 10,
    color: "#92400E",
    marginTop: 4,
    textAlign: "right",
  },
  deliveredTodayPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    marginTop: 4,
  },
  deliveredTodayText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#16A34A",
  },
  walletLowPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    marginTop: 4,
  },
  walletLowText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#DC2626",
  },
  patternPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
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
  datesRowExpanded: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  dateBit: { flexDirection: "row", alignItems: "center", gap: 4 },
  dateText: { fontSize: 12, color: "#8B6854", fontWeight: "500" },
  dateSep: {
    fontSize: 11,
    color: "#FFBF55",
    fontWeight: "700",
    marginHorizontal: 2,
  },
  amountText: { fontSize: 16, fontWeight: "800", color: "#1A1A1A" },
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
  slotText: { flex: 1, fontSize: 13, color: "#1A1A1A", fontWeight: "600" },
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
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    flexWrap: "wrap",
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
    width: "100%",
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
  headerNotificationBtn: {
  width: 44,
  height: 44,
  borderRadius: 14,
  backgroundColor: "#FFF3DC",
  borderWidth: 1.5,
  borderColor: "#FFE1CC",
  alignItems: "center",
  justifyContent: "center",
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
  bulkBar: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#FFE1CC",
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 8,
  },
  bulkHeading: {
    flex: 1,
    fontSize: 13,
    fontWeight: "900",
    color: "#3D1F0A",
  },
  bulkHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  bulkInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  bulkInfoText: { fontSize: 12, fontWeight: "900", color: "#8B6854" },
  bulkActions: { gap: 8, alignItems: "center" },
  bulkChip: {
    borderRadius: 999,
    backgroundColor: "#FFF8F4",
    borderWidth: 1,
    borderColor: "#FFE1CC",
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  bulkChipText: { fontSize: 11.5, fontWeight: "900", color: "#8B6854" },
  bulkDeliveredBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    backgroundColor: "#16A34A",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bulkBtnDisabled: { opacity: 0.55 },
  bulkDeliveredText: { fontSize: 11.5, fontWeight: "900", color: "#fff" },
  productFilterScroll: { flexGrow: 0, maxHeight: 52 },
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
  subscriptionSummaryWrap: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: "#FFE1CC",
  },
  subscriptionSummaryGrid: {
    flexDirection: "row",
    gap: 7,
  },
  subscriptionSummaryCard: {
    flex: 1,
    minHeight: 58,
    borderRadius: 12,
    backgroundColor: "#FFF8F4",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  subscriptionSummaryValue: {
    fontSize: 16,
    fontWeight: "900",
    color: "#3D1F0A",
  },
  subscriptionSummaryLabel: {
    marginTop: 2,
    fontSize: 9,
    fontWeight: "800",
    color: "#8B6854",
    textAlign: "center",
  },
  subscriptionProductChips: {
    gap: 7,
    paddingTop: 9,
  },
  subscriptionProductChip: {
    minWidth: 132,
    maxWidth: 176,
    borderRadius: 12,
    backgroundColor: "#FFF3E8",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#FFE4CC",
  },
  subscriptionProductName: {
    fontSize: 11,
    fontWeight: "900",
    color: "#3D1F0A",
  },
  subscriptionProductMeta: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: "800",
    color: "#BB6B3F",
  },
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
  sheetTitle: { fontSize: 18, fontWeight: "900", color: "#1A1A1A" },
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
  dateRangeRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
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
  dateRangeValue: { fontSize: 13, fontWeight: "800", color: "#1A1A1A" },
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
  sheetActions: { flexDirection: "row", gap: 10, marginTop: 12 },
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
  cardCancelled: { backgroundColor: "#FDFAFA", shadowOpacity: 0.03 },
  summary: { padding: 16 },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  orderIdRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  selectBox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#FFD6C2",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  selectBoxActive: { backgroundColor: "#16A34A", borderColor: "#16A34A" },
  receiptIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#FF967515",
    justifyContent: "center",
    alignItems: "center",
  },
  orderId: { fontSize: 15, fontWeight: "800", color: "#1A1A1A" },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    maxWidth: "50%",
  },
  headerRightInfo: { alignItems: "flex-end", flexShrink: 1 },
  headerProductName: {
    marginTop: 4,
    maxWidth: 150,
    fontSize: 11,
    fontWeight: "900",
    color: "#BB6B3F",
    textAlign: "right",
  },
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
  itemTagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },
  itemTag: {
    flexDirection: "row",
    alignItems: "center",
    maxWidth: "100%",
    backgroundColor: "#FFF3E8",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#FFE4CC",
  },
  itemTagCancelled: { backgroundColor: "#F8F8F8", borderColor: "#E8E8E8" },
  itemTagText: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: "600",
    color: "#BB6B3F",
  },
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
    maxWidth: "58%",
    backgroundColor: "#F5EDE8",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  expandedItemQty: {
    fontSize: 12,
    color: "#8B6854",
    fontWeight: "700",
    textAlign: "right",
  },
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
  deliveredExpandedBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  deliveredExpandedText: { fontSize: 14, fontWeight: "800", color: "#16A34A" },
  deliveredDoneBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  walletBlockedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  walletBlockedTitle: { fontSize: 13.5, fontWeight: "900", color: "#DC2626" },
  walletBlockedSub: { fontSize: 11.5, color: "#991B1B", marginTop: 1 },
  actionGap: { height: 8 },
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
  deliveredDoneTitle: { fontSize: 13.5, fontWeight: "800", color: "#16A34A" },
  deliveredDoneSub: { fontSize: 11.5, color: "#15803d", marginTop: 1 },
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
  subStatusVacation: { backgroundColor: "#FFFBEB" },
  vacationDates: {
    marginTop: 3,
    fontSize: 10,
    fontWeight: "700",
    color: "#B45309",
    textAlign: "right",
  },
  vacationBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  vacationBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: "#92400e",
  },
});
//for confirmation
