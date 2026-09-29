import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  ScrollView,
  Platform,
  Vibration,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../services/api";
import { Colors } from "../constants/colors";

// ─── Types ──────────────────────────────────────────────────────────────────

interface OrderItem {
  product_id: string;
  name?: string;
  product_name?: string;
  quantity: number;
  price: number;
  amount: number;
  product_image?: string;
  image_type?: string;
}

interface Order {
  id: string;
  subscription_id?: string;
  items: OrderItem[];
  total_amount: number;
  status: string;
  delivery_date: string;
  pattern?: string;
  created_at?: string;
  updated_at?: string;
  assigned_at?: string;
  delivery_partner_name?: string;
  payment_method?: string;
  payment_status?: string;
  product_name?: string;
  quantity?: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

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

function getProductName(order: Order): string {
  if (order.product_name) return order.product_name;
  if (order.items?.length > 0) {
    const first = order.items[0];
    const firstName = first.product_name || first.name || "Order Item";
    return order.items.length === 1
      ? firstName
      : `${firstName} +${order.items.length - 1} more`;
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

function getProductImage(order: Order): string | undefined {
  const img = order.items?.[0]?.product_image;
  const type = order.items?.[0]?.image_type;
  if (!img) return undefined;
  if (img.startsWith("data:") || img.startsWith("http")) return img;
  return type === "base64" ? `data:image/jpeg;base64,${img}` : img;
}

const STATUS_META: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  unassigned: { label: "Pending", color: "#D97706", bg: "#FEF3C7" },
  assigned: { label: "Rider Assigned", color: "#2563EB", bg: "#EFF6FF" },
  out_for_delivery: { label: "On the Way", color: "#7C3AED", bg: "#F5F3FF" },
  delivered: { label: "Delivered", color: "#16A34A", bg: "#F0FDF4" },
  cancelled: { label: "Cancelled", color: "#DC2626", bg: "#FEF2F2" },
  skipped: { label: "Skipped", color: "#9CA3AF", bg: "#F3F4F6" },
};
function getMeta(status: string) {
  return STATUS_META[status] ?? STATUS_META.unassigned;
}

function isBuyOnceOrder(o: Order): boolean {
  return o.pattern === "buy_once" || !o.pattern;
}

// ─── Product thumbnail ──────────────────────────────────────────────────────

function ProductThumb({ uri, extra }: { uri?: string; extra: number }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);
  return (
    <View style={th.wrap}>
      {uri && !failed ? (
        <Image
          source={{ uri }}
          style={th.img}
          resizeMode="cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <View style={[th.img, th.fallback]}>
          <Ionicons name="cube-outline" size={24} color="#9CA3AF" />
        </View>
      )}
      {extra > 0 && (
        <View style={th.more}>
          <Text style={th.moreTxt}>+{extra}</Text>
        </View>
      )}
    </View>
  );
}

const th = StyleSheet.create({
  wrap: { width: 56, height: 56 },
  img: { width: 56, height: 56, borderRadius: 13, backgroundColor: "#F3F4F6" },
  fallback: { justifyContent: "center", alignItems: "center" },
  more: {
    position: "absolute",
    left: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.65)",
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 13,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  moreTxt: { color: "#fff", fontSize: 9, fontWeight: "800" },
});

// ─── Detail cell ────────────────────────────────────────────────────────────

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

// ─── Order Card ─────────────────────────────────────────────────────────────

function OrderCard({
  order,
  onPress,
}: {
  order: Order;
  onPress: (order: Order) => void;
}) {
  const meta = getMeta(order.status);
  const productName = getProductName(order);
  const totalQty = getTotalQty(order);
  const imageUri = getProductImage(order);
  const extraCount = Math.max(0, (order.items?.length || 0) - 1);

  return (
    <TouchableOpacity
      style={cd.wrapper}
      onPress={() => onPress(order)}
      onLongPress={() => {
        Vibration.vibrate(30);
        onPress(order);
      }}
      delayLongPress={300}
      activeOpacity={0.85}
    >
      <ProductThumb uri={imageUri} extra={extraCount} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={cd.productName} numberOfLines={1}>
          {productName}
        </Text>
        <Text style={cd.subLine} numberOfLines={1}>
          {totalQty} unit{totalQty !== 1 ? "s" : ""} ·{" "}
          {formatDate(order.delivery_date)}
        </Text>
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
      <View style={{ alignItems: "flex-end" }}>
        <Text style={cd.amount}>₹{order.total_amount?.toFixed(2)}</Text>
        <Ionicons name="chevron-forward" size={16} color="#C4C4C4" />
      </View>
    </TouchableOpacity>
  );
}

const cd = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  productName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111",
    marginBottom: 3,
  },
  subLine: {
    fontSize: 11.5,
    color: "#6B7280",
    fontWeight: "600",
    marginBottom: 6,
  },
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
  amount: { fontSize: 14, fontWeight: "900", color: "#111", marginBottom: 6 },
});

// ─── Order Detail Modal ─────────────────────────────────────────────────────

function OrderDetailModal({
  visible,
  order,
  onClose,
}: {
  visible: boolean;
  order: Order | null;
  onClose: () => void;
}) {
  if (!order) return null;

  const meta = getMeta(order.status);
  const isBuyOnce = isBuyOnceOrder(order);
  const imageUri = getProductImage(order);
  const isDelivered = order.status === "delivered";
  const deliveredAt =
    isDelivered && (order.updated_at || order.assigned_at)
      ? formatTime(order.updated_at || order.assigned_at || "")
      : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={odm.overlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={odm.sheet}>
          <View style={odm.dragHandle} />
          <View style={odm.header}>
            <Text style={odm.title}>Order Details</Text>
            <TouchableOpacity style={odm.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={16} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            <View style={odm.productRow}>
              {imageUri ? (
                <Image
                  source={{ uri: imageUri }}
                  style={odm.productImg}
                  resizeMode="cover"
                />
              ) : (
                <View style={[odm.productImg, odm.productImgFallback]}>
                  <Ionicons name="cube-outline" size={28} color="#9CA3AF" />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={odm.productName} numberOfLines={2}>
                  {getProductName(order)}
                </Text>
                <View
                  style={[
                    odm.statusBadge,
                    {
                      backgroundColor: meta.bg,
                      borderColor: meta.color + "40",
                    },
                  ]}
                >
                  <View
                    style={[odm.statusDot, { backgroundColor: meta.color }]}
                  />
                  <Text style={[odm.statusTxt, { color: meta.color }]}>
                    {meta.label}
                  </Text>
                </View>
              </View>
            </View>

            {order.items?.length > 1 && (
              <View style={odm.itemsBox}>
                {order.items.map((item, idx) => (
                  <View key={idx} style={odm.itemRow}>
                    <Text style={odm.itemQty}>{item.quantity}×</Text>
                    <Text style={odm.itemName} numberOfLines={1}>
                      {item.product_name || item.name || `Item ${idx + 1}`}
                    </Text>
                    <Text style={odm.itemAmt}>₹{item.amount?.toFixed(2)}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={odm.grid}>
              <DetailCell
                label="Order Type"
                value={isBuyOnce ? "Buy Once" : "Subscription"}
              />
              <DetailCell
                label="Quantity"
                value={`${getTotalQty(order)} unit${getTotalQty(order) !== 1 ? "s" : ""}`}
              />
              <DetailCell
                label="Order Date"
                value={order.created_at ? formatTime(order.created_at) : "—"}
              />
              <DetailCell
                label="Delivery Date"
                value={formatDate(order.delivery_date)}
              />
              {isDelivered && deliveredAt && (
                <DetailCell label="Delivered On" value={deliveredAt} accent />
              )}
              <DetailCell
                label="Total Amount"
                value={`₹${order.total_amount?.toFixed(2)}`}
                accent
              />
              <DetailCell
                label="Payment"
                value={`${getPaymentLabel(order.payment_method)} · ${order.payment_status || "pending"}`}
              />
              <DetailCell
                label="Order #"
                value={`#${order.id.slice(-8).toUpperCase()}`}
                mono
              />
            </View>

            {order.delivery_partner_name && (
              <View style={odm.riderRow}>
                <View style={odm.riderIcon}>
                  <Ionicons name="bicycle-outline" size={16} color="#2563EB" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={odm.riderLabel}>Delivered by</Text>
                  <Text style={odm.riderName}>
                    {order.delivery_partner_name}
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const odm = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 30 : 20,
    maxHeight: "85%",
  },
  dragHandle: {
    width: 36,
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 14,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: { fontSize: 18, fontWeight: "800", color: "#111" },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  productRow: { flexDirection: "row", gap: 14, marginBottom: 16 },
  productImg: {
    width: 72,
    height: 72,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
  },
  productImgFallback: { justifyContent: "center", alignItems: "center" },
  productName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111",
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusTxt: { fontSize: 11, fontWeight: "700" },
  itemsBox: {
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    paddingVertical: 4,
    marginBottom: 14,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  itemQty: { fontSize: 12, fontWeight: "800", color: "#6B7280", width: 28 },
  itemName: { flex: 1, fontSize: 12, fontWeight: "700", color: "#111" },
  itemAmt: { fontSize: 12, fontWeight: "800", color: Colors.primary },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  riderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
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
  },
  riderName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
    marginTop: 1,
  },
});

// ─── Main exported component ────────────────────────────────────────────────

interface OrderHistoryListProps {
  /** "buy_once" shows one-time orders, "subscription" shows daily/alternate/custom orders, "all" shows everything */
  patternFilter?: "buy_once" | "subscription" | "all";
  pageSize?: number;
  title?: string;
  emptyText?: string;
}

export default function OrderHistoryList({
  patternFilter = "buy_once",
  pageSize = 5,
  title,
  emptyText = "No orders yet",
}: OrderHistoryListProps) {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const fetchingRef = useRef(false);

  const fetchOrders = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const data = await api.getCustomerOrders();
      const sorted = [...data].sort((a: Order, b: Order) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tb - ta;
      });
      setOrders(sorted);
    } catch (err) {
      console.warn("OrderHistoryList: failed to fetch orders", err);
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filtered = orders.filter((o) =>
    patternFilter === "all"
      ? true
      : patternFilter === "buy_once"
        ? isBuyOnceOrder(o)
        : !isBuyOnceOrder(o),
  );
  const visible = filtered.slice(0, visibleCount);

  if (loading) {
    return (
      <View style={ohl.loadingBox}>
        <Text style={ohl.loadingTxt}>Loading orders…</Text>
      </View>
    );
  }

  return (
    <View>
      {title ? <Text style={ohl.sectionTitle}>{title}</Text> : null}

      {filtered.length === 0 ? (
        <View style={ohl.emptyBox}>
          <Ionicons name="receipt-outline" size={28} color="#ccc" />
          <Text style={ohl.emptyTxt}>{emptyText}</Text>
        </View>
      ) : (
        <>
          {visible.map((order) => (
            <OrderCard key={order.id} order={order} onPress={setDetailOrder} />
          ))}
          {filtered.length > visibleCount && (
            <TouchableOpacity
              style={ohl.loadMoreBtn}
              onPress={() => setVisibleCount((v) => v + pageSize)}
              activeOpacity={0.85}
            >
              <Text style={ohl.loadMoreTxt}>
                Load More ({filtered.length - visibleCount} more)
              </Text>
              <Ionicons name="chevron-down" size={14} color={Colors.primary} />
            </TouchableOpacity>
          )}
        </>
      )}

      <OrderDetailModal
        visible={!!detailOrder}
        order={detailOrder}
        onClose={() => setDetailOrder(null)}
      />
    </View>
  );
}

// ─── Exports for reuse elsewhere (e.g. wallet.tsx) ─────────────────────────

export { OrderDetailModal, getProductName, getProductImage };
export type { Order };

export function useOrderMap() {
  const [map, setMap] = useState<Record<string, Order>>({});
  useEffect(() => {
    let mounted = true;
    api
      .getCustomerOrders()
      .then((data: Order[]) => {
        if (!mounted) return;
        const m: Record<string, Order> = {};
        for (const o of data) m[o.id] = o;
        setMap(m);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);
  return map;
}

const ohl = StyleSheet.create({
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1A1A1A",
    marginBottom: 10,
  },
  loadingBox: { paddingVertical: 24, alignItems: "center" },
  loadingTxt: { fontSize: 13, color: "#9CA3AF", fontWeight: "600" },
  emptyBox: { alignItems: "center", paddingVertical: 30, gap: 8 },
  emptyTxt: { fontSize: 13, color: "#9CA3AF", fontWeight: "600" },
  loadMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: Colors.primary + "30",
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 2,
    marginBottom: 4,
  },
  loadMoreTxt: { fontSize: 13, fontWeight: "800", color: Colors.primary },
});
