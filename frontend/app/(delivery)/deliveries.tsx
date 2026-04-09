import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Modal,
  Alert,
  TextInput,
  TouchableOpacity,
  Animated,
  Vibration,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../src/services/api";
import { Colors } from "../../src/constants/colors";
import LoadingScreen from "../../src/components/LoadingScreen";

// ─── Pattern config ────────────────────────────────────────────────────────────
const PATTERN_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: string }
> = {
  daily: {
    label: "Daily Sub",
    color: "#22c55e",
    bg: "#f0fdf4",
    icon: "repeat-outline",
  },
  alternate: {
    label: "Alternate Day",
    color: "#8b5cf6",
    bg: "#f5f3ff",
    icon: "repeat-outline",
  },
  custom: {
    label: "Custom Days",
    color: "#0891b2",
    bg: "#ecfeff",
    icon: "calendar-outline",
  },
  buy_once: {
    label: "One-time",
    color: "#f59e0b",
    bg: "#fffbeb",
    icon: "flash-outline",
  },
};

// ─── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  unassigned: { label: "Available", color: "#f59e0b", bg: "#FFF4E6" },
  available: { label: "Available", color: "#f59e0b", bg: "#FFF4E6" },
  assigned: { label: "Assigned", color: "#2563eb", bg: "#EFF6FF" },
  picked_up: { label: "Picked Up", color: "#7c3aed", bg: "#F5F3FF" },
  out_for_delivery: { label: "On the Way", color: "#0891b2", bg: "#ECFEFF" },
  delivered: { label: "Delivered", color: "#22c55e", bg: "#F0FDF4" },
};

// ─── OTP Verified Toast ────────────────────────────────────────────────────────
function OtpSuccessToast({
  visible,
  message,
}: {
  visible: boolean;
  message: string;
}) {
  const slideAnim = useRef(new Animated.Value(-80)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 9,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -80,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  if (!visible) return null;
  return (
    <Animated.View
      style={[toast.wrap, { transform: [{ translateY: slideAnim }] }]}
    >
      <View style={toast.iconBox}>
        <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
      </View>
      <Text style={toast.text}>{message}</Text>
    </Animated.View>
  );
}

const toast = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    zIndex: 999,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#22c55e",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 14,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#22c55e22",
    justifyContent: "center",
    alignItems: "center",
  },
  text: { flex: 1, fontSize: 13.5, fontWeight: "700", color: "#1C1C1C" },
});

// ─── Pattern Badge ─────────────────────────────────────────────────────────────
function PatternBadge({ pattern }: { pattern?: string }) {
  if (!pattern) return null;
  const cfg = PATTERN_CONFIG[pattern];
  if (!cfg) return null;
  return (
    <View style={[pb.badge, { backgroundColor: cfg.bg }]}>
      <Ionicons name={cfg.icon as any} size={9} color={cfg.color} />
      <Text style={[pb.text, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

const pb = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  text: { fontSize: 9, fontWeight: "800", letterSpacing: 0.3 },
});

// ─── OTP Modal ─────────────────────────────────────────────────────────────────
function OtpModal({
  visible,
  type,
  onSubmit,
  onClose,
}: {
  visible: boolean;
  type: "admin" | "user" | null;
  onSubmit: (otp: string) => void;
  onClose: () => void;
}) {
  const [otpValue, setOtpValue] = useState("");
  const inputRef = useRef<TextInput>(null);
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (visible) {
      setOtpValue("");
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 200,
      }).start();
      setTimeout(() => inputRef.current?.focus(), 200);
    } else {
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleClose = () => {
    setOtpValue("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onShow={() => inputRef.current?.focus()}
    >
      <View style={otp.overlay}>
        <Animated.View
          style={[otp.sheet, { transform: [{ translateY: slideAnim }] }]}
        >
          <View style={otp.dragHandle} />

          <View style={otp.header}>
            <View style={otp.headerLeft}>
              <View
                style={[
                  otp.headerIcon,
                  { backgroundColor: type === "admin" ? "#EFF6FF" : "#F0FDF4" },
                ]}
              >
                <Ionicons
                  name={
                    type === "admin" ? "storefront-outline" : "person-outline"
                  }
                  size={20}
                  color={type === "admin" ? "#2563eb" : "#22c55e"}
                />
              </View>
              <View>
                <Text style={otp.title}>Enter OTP</Text>
                <Text style={otp.subtitle}>
                  {type === "admin"
                    ? "Get OTP from the shop owner"
                    : "Get OTP from the customer"}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={otp.closeBtn} onPress={handleClose}>
              <Ionicons name="close" size={16} color="#666" />
            </TouchableOpacity>
          </View>

          {/* OTP boxes */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => inputRef.current?.focus()}
            style={otp.boxesWrap}
          >
            <View style={otp.boxesRow}>
              {[0, 1, 2, 3].map((index) => (
                <View
                  key={index}
                  style={[
                    otp.box,
                    otpValue.length === index && otp.boxActive,
                    otpValue.length > index && otp.boxFilled,
                  ]}
                >
                  <Text style={otp.digit}>{otpValue[index] || ""}</Text>
                </View>
              ))}
            </View>
            <TextInput
              ref={inputRef}
              value={otpValue}
              onChangeText={(t) => {
                if (/^\d*$/.test(t) && t.length <= 4) setOtpValue(t);
              }}
              keyboardType="number-pad"
              maxLength={4}
              autoFocus
              caretHidden
              style={otp.hiddenInput}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              otp.submitBtn,
              { backgroundColor: type === "admin" ? "#2563eb" : "#22c55e" },
              otpValue.length < 4 && otp.submitBtnDisabled,
            ]}
            onPress={() => {
              onSubmit(otpValue);
              setOtpValue("");
            }}
            disabled={otpValue.length < 4}
          >
            <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
            <Text style={otp.submitBtnText}>Verify & Continue</Text>
          </TouchableOpacity>

          <TouchableOpacity style={otp.cancelBtn} onPress={handleClose}>
            <Text style={otp.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const otp = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 36,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#E0E0E0",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 28,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  title: { fontSize: 18, fontWeight: "800", color: "#1A1A1A" },
  subtitle: { fontSize: 12, color: "#aaa", marginTop: 2 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
  },
  boxesWrap: { position: "relative", marginBottom: 28 },
  boxesRow: { flexDirection: "row", justifyContent: "space-between" },
  box: {
    width: 68,
    height: 72,
    borderWidth: 1.5,
    borderColor: "#E5E5E5",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FAFAFA",
  },
  boxActive: {
    borderColor: Colors.primary,
    borderWidth: 2,
    backgroundColor: Colors.primary + "08",
  },
  boxFilled: { borderColor: "#22c55e", backgroundColor: "#F0FDF4" },
  digit: { fontSize: 28, fontWeight: "800", color: "#1A1A1A" },
  hiddenInput: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    opacity: 0.01,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 15,
    marginBottom: 12,
  },
  submitBtnDisabled: { backgroundColor: "#E5E5E5" },
  submitBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  cancelBtn: { alignItems: "center", paddingVertical: 12 },
  cancelText: { fontSize: 14, fontWeight: "600", color: "#aaa" },
});

// ─── Order Card ─────────────────────────────────────────────────────────────────
function OrderCard({
  order,
  onAccept,
  onPickup,
  onOutForDelivery,
  onDeliver,
}: {
  order: any;
  onAccept: () => void;
  onPickup: () => void;
  onOutForDelivery: () => void;
  onDeliver: () => void;
}) {
  const status = order.status;
  const sc = STATUS_CONFIG[status] ?? STATUS_CONFIG.unassigned;
  const isAvailable = status === "unassigned" || status === "available";
  const isCompleted = status === "delivered";

  return (
    <View style={[oc.card, isCompleted && oc.completedCard]}>
      {/* Header row */}
      <View style={oc.cardHeader}>
        <View style={oc.orderIdRow}>
          <View style={[oc.iconBox, { backgroundColor: sc.bg }]}>
            <Ionicons
              name={
                isAvailable
                  ? "cube-outline"
                  : status === "assigned"
                    ? "bicycle-outline"
                    : status === "picked_up"
                      ? "bag-handle-outline"
                      : status === "out_for_delivery"
                        ? "navigate-outline"
                        : "checkmark-circle-outline"
              }
              size={15}
              color={sc.color}
            />
          </View>
          <View>
            <Text style={oc.orderId}>
              #{(order.id || order._id)?.slice(-6).toUpperCase()}
            </Text>
            {order.delivery_date && (
              <Text style={oc.dateText}>{order.delivery_date}</Text>
            )}
          </View>
        </View>
        <View style={oc.rightBadges}>
          {order.pattern && <PatternBadge pattern={order.pattern} />}
          <View style={[oc.statusPill, { backgroundColor: sc.bg }]}>
            <View style={[oc.statusDot, { backgroundColor: sc.color }]} />
            <Text style={[oc.statusPillText, { color: sc.color }]}>
              {sc.label}
            </Text>
          </View>
        </View>
      </View>

      <View style={oc.divider} />

      {/* Available order: just deliver-to */}
      {isAvailable && (
        <>
          <Text style={oc.colLabel}>DELIVER TO</Text>
          <Text style={oc.personName}>{order.customer_name}</Text>
          {order.customer_phone && (
            <View style={oc.infoRow}>
              <Ionicons name="call-outline" size={12} color="#aaa" />
              <Text style={oc.infoText}>{order.customer_phone}</Text>
            </View>
          )}
          {(order.delivery_address?.tower || order.delivery_address?.flat) && (
            <View style={oc.infoRow}>
              <Ionicons name="location-outline" size={12} color="#aaa" />
              <Text style={oc.infoText}>
                {order.delivery_address?.tower} {order.delivery_address?.flat}
              </Text>
            </View>
          )}
          <View style={oc.divider} />
        </>
      )}

      {/* Active orders: pickup + deliver-to */}
      {!isAvailable && !isCompleted && (
        <>
          <View style={oc.twoCol}>
            <View style={oc.col}>
              <Text style={oc.colLabel}>PICKUP FROM</Text>
              <Text style={oc.personName}>{order.admin_name}</Text>
              {order.admin_phone && (
                <View style={oc.infoRow}>
                  <Ionicons name="call-outline" size={12} color="#aaa" />
                  <Text style={oc.infoText}>{order.admin_phone}</Text>
                </View>
              )}
              {order.pickup_address?.tower && (
                <View style={oc.infoRow}>
                  <Ionicons name="location-outline" size={12} color="#aaa" />
                  <Text style={oc.infoText}>
                    {order.pickup_address?.tower} {order.pickup_address?.flat}
                  </Text>
                </View>
              )}
            </View>
            <View style={oc.colDivider} />
            <View style={oc.col}>
              <Text style={oc.colLabel}>DELIVER TO</Text>
              <Text style={oc.personName}>{order.customer_name}</Text>
              {order.customer_phone && (
                <View style={oc.infoRow}>
                  <Ionicons name="call-outline" size={12} color="#aaa" />
                  <Text style={oc.infoText}>{order.customer_phone}</Text>
                </View>
              )}
              {(order.delivery_address?.tower ||
                order.delivery_address?.flat) && (
                <View style={oc.infoRow}>
                  <Ionicons name="location-outline" size={12} color="#aaa" />
                  <Text style={oc.infoText}>
                    {order.delivery_address?.tower}{" "}
                    {order.delivery_address?.flat}
                  </Text>
                </View>
              )}
            </View>
          </View>
          <View style={oc.divider} />
        </>
      )}

      {/* Completed: compact */}
      {isCompleted && (
        <View style={oc.completedRow}>
          <View>
            <Text style={oc.personName}>{order.customer_name}</Text>
            <Text style={oc.infoText}>{order.delivery_date}</Text>
          </View>
          <Text style={oc.completedAmount}>₹{order.total_amount}</Text>
        </View>
      )}

      {/* Items */}
      {!isCompleted && order.items?.length > 0 && (
        <>
          <Text style={oc.colLabel}>ITEMS</Text>
          <View style={oc.itemsList}>
            {order.items.map((item: any, i: number) => (
              <View key={i} style={oc.itemRow}>
                <View style={oc.itemDot} />
                <Text style={oc.itemText}>{item.product_name}</Text>
                <Text style={oc.itemQty}>×{item.quantity}</Text>
                <Text style={oc.itemPrice}>
                  ₹{(item.price * item.quantity).toFixed(0)}
                </Text>
              </View>
            ))}
          </View>
          {order.total_amount && (
            <View style={oc.totalRow}>
              <Text style={oc.totalLabel}>Total</Text>
              <Text style={oc.totalValue}>₹{order.total_amount}</Text>
            </View>
          )}
        </>
      )}

      {/* Action buttons */}
      {isAvailable && (
        <TouchableOpacity
          style={[oc.actionBtn, { backgroundColor: Colors.primary }]}
          onPress={onAccept}
        >
          <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
          <Text style={oc.actionBtnText}>Accept Order</Text>
        </TouchableOpacity>
      )}
      {status === "assigned" && (
        <TouchableOpacity
          style={[oc.actionBtn, { backgroundColor: "#7c3aed" }]}
          onPress={onPickup}
        >
          <Ionicons name="cube-outline" size={17} color="#fff" />
          <Text style={oc.actionBtnText}>Pickup — Enter Admin OTP</Text>
        </TouchableOpacity>
      )}
      {status === "picked_up" && (
        <TouchableOpacity
          style={[oc.actionBtn, { backgroundColor: "#0891b2" }]}
          onPress={onOutForDelivery}
        >
          <Ionicons name="navigate-outline" size={17} color="#fff" />
          <Text style={oc.actionBtnText}>Out For Delivery</Text>
        </TouchableOpacity>
      )}
      {status === "out_for_delivery" && (
        <TouchableOpacity
          style={[oc.actionBtn, { backgroundColor: "#16a34a" }]}
          onPress={onDeliver}
        >
          <Ionicons name="checkmark-done-outline" size={17} color="#fff" />
          <Text style={oc.actionBtnText}>Deliver — Enter Customer OTP</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const oc = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  completedCard: { opacity: 0.72 },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  orderIdRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  orderId: { fontSize: 15, fontWeight: "800", color: "#1A1A1A" },
  dateText: { fontSize: 11, color: "#aaa", marginTop: 1 },

  rightBadges: { alignItems: "flex-end", gap: 6 },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusPillText: { fontSize: 11, fontWeight: "700" },

  divider: { height: 1, backgroundColor: "#F5F5F5", marginVertical: 12 },
  colLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#bbb",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  personName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 3,
  },
  infoText: { fontSize: 12, color: "#aaa", fontWeight: "500" },

  twoCol: { flexDirection: "row" },
  col: { flex: 1 },
  colDivider: { width: 1, backgroundColor: "#F5F5F5", marginHorizontal: 12 },

  itemsList: { gap: 6, marginTop: 6, marginBottom: 10 },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  itemDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  itemText: { flex: 1, fontSize: 13, fontWeight: "500", color: "#333" },
  itemQty: { fontSize: 12, color: "#aaa", fontWeight: "600" },
  itemPrice: { fontSize: 12, fontWeight: "700", color: "#1A1A1A" },

  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    marginBottom: 4,
  },
  totalLabel: { fontSize: 12, fontWeight: "700", color: "#888" },
  totalValue: { fontSize: 16, fontWeight: "800", color: "#1A1A1A" },

  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 13,
    marginTop: 8,
  },
  actionBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },

  completedRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  completedAmount: { fontSize: 18, fontWeight: "800", color: "#1A1A1A" },
});

// ─── Section Header ────────────────────────────────────────────────────────────
function SectionHeader({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  return (
    <View style={sh.row}>
      <View style={[sh.dot, { backgroundColor: color }]} />
      <Text style={sh.label}>{label}</Text>
      <View style={[sh.badge, { backgroundColor: color + "18" }]}>
        <Text style={[sh.badgeText, { color }]}>{count}</Text>
      </View>
    </View>
  );
}

const sh = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  label: {
    fontSize: 11,
    fontWeight: "800",
    color: "#bbb",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: "700" },
});

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function DeliveriesScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deliveries, setDeliveries] = useState<any[]>([]);

  const [otpModal, setOtpModal] = useState(false);
  const [otpOrder, setOtpOrder] = useState<any>(null);
  const [otpType, setOtpType] = useState<"admin" | "user" | null>(null);

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2800);
  };

  const fetchData = async () => {
    try {
      const [available, myOrders] = await Promise.all([
        api.getAvailableOrders(),
        api.getMyOrders(),
      ]);

      // Deduplicate by id
      const map = new Map<string, any>();
      [...available, ...myOrders].forEach((o) => {
        const key = o.id || o._id;
        if (key) map.set(String(key), o);
      });
      setDeliveries(Array.from(map.values()));
    } catch (error) {
      console.error("Error fetching deliveries:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
      const interval = setInterval(fetchData, 15000); // auto-refresh every 15s
      return () => clearInterval(interval);
    }, []),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
  };

  const acceptOrder = async (orderId: string) => {
    try {
      await api.acceptOrder(orderId);
      showToast("Order accepted! 🎉");
      fetchData();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not accept order");
    }
  };

  const updateStatus = async (orderId: string, status: string) => {
    try {
      await api.updateOrderStatus(orderId, status);
      fetchData();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not update status");
    }
  };

  const openOtpModal = (order: any, type: "admin" | "user") => {
    setOtpOrder(order);
    setOtpType(type);
    setOtpModal(true);
  };

  const handleOtpSubmit = async (enteredOtp: string) => {
    if (!otpOrder) return;

    if (otpType === "admin") {
      if (enteredOtp === otpOrder.admin_otp) {
        setOtpModal(false);
        await updateStatus(otpOrder.id || otpOrder._id, "picked_up");
        showToast("Package picked up! 📦");
        Vibration.vibrate([0, 60, 40, 80]);
      } else {
        Alert.alert("Wrong OTP", "The admin OTP you entered is incorrect.");
      }
    } else if (otpType === "user") {
      if (enteredOtp === otpOrder.delivery_otp) {
        setOtpModal(false);
        await updateStatus(otpOrder.id || otpOrder._id, "delivered");
        showToast("Delivery completed! ✅");
        Vibration.vibrate([0, 60, 40, 80]);
      } else {
        Alert.alert("Wrong OTP", "The customer OTP you entered is incorrect.");
      }
    }
  };

  if (loading) return <LoadingScreen />;

  const availableOrders = deliveries.filter(
    (d) => d.status === "unassigned" || d.status === "available",
  );
  const activeOrders = deliveries.filter((d) =>
    ["assigned", "picked_up", "out_for_delivery"].includes(d.status),
  );
  const completedOrders = deliveries.filter((d) => d.status === "delivered");

  // Split actives into subscription vs one-time for display
  const subOrders = activeOrders.filter(
    (o) => o.pattern && o.pattern !== "buy_once",
  );
  const onceOrders = activeOrders.filter(
    (o) => !o.pattern || o.pattern === "buy_once",
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <OtpSuccessToast visible={toastVisible} message={toastMessage} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Deliveries</Text>
          <Text style={styles.headerSub}>
            {availableOrders.length > 0
              ? `${availableOrders.length} new order${availableOrders.length > 1 ? "s" : ""} waiting`
              : activeOrders.length > 0
                ? `${activeOrders.length} active delivery${activeOrders.length > 1 ? "ies" : ""}`
                : "All caught up!"}
          </Text>
        </View>
        <View style={styles.headerBadges}>
          {availableOrders.length > 0 && (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>{availableOrders.length}</Text>
            </View>
          )}
          {activeOrders.length > 0 && (
            <View style={styles.activeBadge}>
              <View style={styles.activeDot} />
              <Text style={styles.activeBadgeText}>{activeOrders.length}</Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
        contentContainerStyle={styles.listContent}
      >
        {/* Available */}
        {availableOrders.length > 0 && (
          <SectionHeader
            label="New Orders"
            count={availableOrders.length}
            color="#f59e0b"
          />
        )}
        {availableOrders.map((order) => (
          <OrderCard
            key={order.id || order._id}
            order={order}
            onAccept={() => acceptOrder(order.id || order._id)}
            onPickup={() => openOtpModal(order, "admin")}
            onOutForDelivery={() =>
              updateStatus(order.id || order._id, "out_for_delivery")
            }
            onDeliver={() => openOtpModal(order, "user")}
          />
        ))}

        {/* Subscription active orders */}
        {subOrders.length > 0 && (
          <SectionHeader
            label="Subscriptions"
            count={subOrders.length}
            color="#8b5cf6"
          />
        )}
        {subOrders.map((order) => (
          <OrderCard
            key={order.id || order._id}
            order={order}
            onAccept={() => acceptOrder(order.id || order._id)}
            onPickup={() => openOtpModal(order, "admin")}
            onOutForDelivery={() =>
              updateStatus(order.id || order._id, "out_for_delivery")
            }
            onDeliver={() => openOtpModal(order, "user")}
          />
        ))}

        {/* One-time active orders */}
        {onceOrders.length > 0 && (
          <SectionHeader
            label="One-time Orders"
            count={onceOrders.length}
            color="#2563eb"
          />
        )}
        {onceOrders.map((order) => (
          <OrderCard
            key={order.id || order._id}
            order={order}
            onAccept={() => acceptOrder(order.id || order._id)}
            onPickup={() => openOtpModal(order, "admin")}
            onOutForDelivery={() =>
              updateStatus(order.id || order._id, "out_for_delivery")
            }
            onDeliver={() => openOtpModal(order, "user")}
          />
        ))}

        {/* Completed */}
        {completedOrders.length > 0 && (
          <SectionHeader
            label="Completed Today"
            count={completedOrders.length}
            color="#22c55e"
          />
        )}
        {completedOrders.map((order) => (
          <OrderCard
            key={order.id || order._id}
            order={order}
            onAccept={() => {}}
            onPickup={() => {}}
            onOutForDelivery={() => {}}
            onDeliver={() => {}}
          />
        ))}

        {/* Empty */}
        {deliveries.length === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="bicycle-outline" size={48} color="#ddd" />
            </View>
            <Text style={styles.emptyTitle}>No deliveries yet</Text>
            <Text style={styles.emptyDesc}>Pull down to refresh</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* OTP Modal */}
      <OtpModal
        visible={otpModal}
        type={otpType}
        onSubmit={handleOtpSubmit}
        onClose={() => setOtpModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F7F4" },
  listContent: { paddingHorizontal: 16, paddingBottom: 20 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1A1A1A",
    letterSpacing: -0.5,
  },
  headerSub: { fontSize: 12, color: "#aaa", marginTop: 2 },

  headerBadges: { flexDirection: "row", gap: 8, alignItems: "center" },
  newBadge: {
    backgroundColor: "#FFF4E6",
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  newBadgeText: { fontSize: 13, fontWeight: "800", color: "#f59e0b" },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#2563eb",
  },
  activeBadgeText: { fontSize: 12, fontWeight: "700", color: "#2563eb" },

  emptyState: { alignItems: "center", paddingTop: 80, gap: 10 },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#ccc" },
  emptyDesc: { fontSize: 13, color: "#ddd" },
});
