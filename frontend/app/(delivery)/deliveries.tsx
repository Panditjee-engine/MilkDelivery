import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { api } from "../../src/services/api";
import LoadingScreen from "../../src/components/LoadingScreen";

//helper for adresss
  function formatOrderAddress(address?: any): string {
  if (!address) return "Address not available";
  const isOnlineShape = !address.line1 && (address.tower || address.flat || address.area);
  if (isOnlineShape) {
    const firstLine = [address.flat, address.tower].filter(Boolean).join(", ");
    const lines = [
      firstLine,
      address.area,
      address.landmark ? `Near ${address.landmark}` : "",
      [address.city, address.state].filter(Boolean).join(", "),
      address.pincode,
    ].filter(Boolean);
    return lines.length ? lines.join(", ") : "Address not available";
  }
  const lines = [
    [address.line1, address.line2, address.landmark].filter(Boolean).join(", "),
    [address.city, address.state].filter(Boolean).join(", "),
    address.pincode,
  ].filter(Boolean);
  return lines.length ? lines.join(", ") : "Address not available";
}

const C = {
  primary: "#FF9675",
  accent: "#FD9E69",
  light: "#FFD999",
  dark: "#BB6B3F",
  bg: "#FFF8EF",
  card: "#FFFFFF",
  text: "#3D1F0A",
  textMuted: "#A07850",
  textLight: "#C9A882",
  border: "#F5E6D0",
};

type TabType = "active" | "completed";

export default function DeliveriesScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("active");
  const [checkinStatus, setCheckinStatus] = useState<any>(null);

  const [availableOrders, setAvailableOrders] = useState<any[]>([]);
  const [myOrders, setMyOrders] = useState<any[]>([]);

  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [otpType, setOtpType] = useState<"pickup" | "delivery">("pickup");
  const [currentOrder, setCurrentOrder] = useState<any>(null);
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [otpError, setOtpError] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);

  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const otpInputRefs = useRef<Array<TextInput | null>>([]);

  const isBuyOnce = (order: any) => {
    const p = (order.pattern || "").toString().toLowerCase();
    return p === "buy_once";
  };

  const fetchData = async () => {
    try {
      const [available, mine, status] = await Promise.all([
        api.getAvailableOrders(),
        api.getMyOrders(),
        api.getCheckinStatus(),
      ]);
      setCheckinStatus(status);
      setAvailableOrders((available || []).filter(isBuyOnce));
      setMyOrders((mine || []).filter(isBuyOnce));
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  const showSuccessToastMessage = (message: string) => {
    setSuccessMessage(message);
    setShowSuccessToast(true);
    Animated.sequence([
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => setShowSuccessToast(false));
  };


  
  const handleAcceptOrder = async (order: any) => {
    try {
      const orderId = order.id || order._id;
      await api.acceptOrder(orderId);
      Alert.alert("✓ Order Accepted", "You can now start the delivery");
      await fetchData();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to accept order");
    }
  };

  const handleStartPickup = (order: any) => {
    setCurrentOrder(order);
    setOtpType("pickup");
    setOtp(["", "", "", ""]);
    setOtpError("");
    setOtpModalVisible(true);
  };

  const handleStartDelivery = (order: any) => {
    setCurrentOrder(order);
    setOtpType("delivery");
    setOtp(["", "", "", ""]);
    setOtpError("");
    setOtpModalVisible(true);
  };

  const handleOtpChange = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setOtpError("");
    if (value && index < 3) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // ── FIXED: reads OTP directly from order object, no backend verify call ──
  const handleVerifyOtp = async () => {
    const otpString = otp.join("");
    if (otpString.length !== 4) {
      setOtpError("Please enter complete OTP");
      return;
    }

    setOtpLoading(true);
    setOtpError("");

    try {
      const expectedOtp =
        otpType === "pickup"
          ? String(currentOrder?.admin_otp ?? "")
          : String(currentOrder?.delivery_otp ?? "");

      if (!expectedOtp) {
        setOtpError("OTP not found on this order. Contact support.");
        return;
      }

      if (otpString.trim() !== expectedOtp.trim()) {
        setOtpError("Invalid OTP. Please check and try again.");
        return;
      }

      const orderId = currentOrder?.id || currentOrder?._id;
      if (!orderId) {
        setOtpError("Order ID missing. Please close and try again.");
        return;
      }

      if (otpType === "pickup") {
        await api.updateOrderStatus(orderId, "picked_up");
        setOtpModalVisible(false);
        // Update local state immediately so UI reflects change
        setMyOrders((prev) =>
          prev.map((o) =>
            (o.id || o._id) === orderId ? { ...o, status: "picked_up" } : o,
          ),
        );
        showSuccessToastMessage("✓ Order Picked Up Successfully!");
      } else {
        await api.updateOrderStatus(orderId, "delivered");
        setOtpModalVisible(false);
        // Update local state immediately
        setMyOrders((prev) =>
          prev.map((o) =>
            (o.id || o._id) === orderId ? { ...o, status: "delivered" } : o,
          ),
        );
        showSuccessToastMessage("✓ Order Delivered Successfully!");
      }

      // Background sync after short delay
      setTimeout(() => fetchData(), 1000);
    } catch (error: any) {
      setOtpError(error.message || "Failed to update order. Try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleCancelOrder = async (order: any) => {
    Alert.alert("Cancel Order", "Are you sure you want to cancel this order?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Cancel",
        style: "destructive",
        onPress: async () => {
          try {
            await api.cancelOrder(order.id || order._id);
            Alert.alert("✓ Order Cancelled");
            await fetchData();
          } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to cancel order");
          }
        },
      },
    ]);
  };

  if (loading) return <LoadingScreen />;

  

  const activeOrders = myOrders.filter((o) =>
    ["assigned", "picked_up", "out_for_delivery"].includes(o.status),
  );
  const completedOrders = myOrders.filter((o) => o.status === "delivered");

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Deliveries</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "active" && styles.tabActive]}
          onPress={() => setActiveTab("active")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "active" && styles.tabTextActive,
            ]}
          >
            Active ({availableOrders.length + activeOrders.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "completed" && styles.tabActive]}
          onPress={() => setActiveTab("completed")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "completed" && styles.tabTextActive,
            ]}
          >
            Completed ({completedOrders.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.primary}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {!checkinStatus?.checked_in || checkinStatus?.checked_out ? (
          <View style={styles.emptyState}>
            <Ionicons name="bicycle-outline" size={64} color={C.textLight} />
            <Text style={styles.emptyTitle}>Shift is Offline</Text>
            <Text style={styles.emptyText}>
              Start your shift from Home to see orders
            </Text>
            <TouchableOpacity
              style={styles.goToHomeButton}
              onPress={() => router.push("/(delivery)/home")}
            >
              <Ionicons name="home" size={18} color="#fff" />
              <Text style={styles.goToHomeButtonText}>Go to Home</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {activeTab === "active" ? (
              <>
                {activeOrders.length > 0 && (
                  <View style={styles.section}>
                    <SectionHeader
                      icon="bicycle-outline"
                      title="My Deliveries"
                      subtitle="In progress"
                      count={activeOrders.length}
                    />
                    {activeOrders.map((order) => (
                      <OrderCard
                        key={order.id || order._id}
                        order={order}
                        onPickup={() => handleStartPickup(order)}
                        onDeliver={() => handleStartDelivery(order)}
                        onCancel={() => handleCancelOrder(order)}
                      />
                    ))}
                  </View>
                )}

                {activeOrders.length === 0 && availableOrders.length > 0 && (
                  <View style={styles.section}>
                    <SectionHeader
                      icon="globe-outline"
                      title="Available Orders"
                      subtitle="Accept to start delivery"
                      count={availableOrders.length}
                    />
                    {availableOrders.map((order) => (
                      <OrderCard
                        key={order.id || order._id}
                        order={order}
                        onAccept={() => handleAcceptOrder(order)}
                        isAvailable
                      />
                    ))}
                  </View>
                )}

                {availableOrders.length === 0 && activeOrders.length === 0 && (
                  <View style={styles.emptyState}>
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={64}
                      color={C.textLight}
                    />
                    <Text style={styles.emptyTitle}>No Active Deliveries</Text>
                    <Text style={styles.emptyText}>
                      New orders will appear here
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <>
                {completedOrders.length > 0 ? (
                  <View style={styles.section}>
                    <SectionHeader
                      icon="checkmark-done-outline"
                      title="Completed Deliveries"
                      subtitle="Successfully delivered"
                      count={completedOrders.length}
                    />
                    {completedOrders.map((order) => (
                      <CompletedOrderCard
                        key={order.id || order._id}
                        order={order}
                      />
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyState}>
                    <Ionicons
                      name="archive-outline"
                      size={64}
                      color={C.textLight}
                    />
                    <Text style={styles.emptyTitle}>
                      No Completed Deliveries
                    </Text>
                    <Text style={styles.emptyText}>
                      Delivered orders will appear here
                    </Text>
                  </View>
                )}
              </>
            )}
          </>
        )}
        <View style={{ height: 30 }} />
      </ScrollView>

      {/* OTP Modal */}
      <Modal
        visible={otpModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setOtpModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setOtpModalVisible(false)}
            >
              <Ionicons name="close" size={24} color={C.textMuted} />
            </TouchableOpacity>

            <View style={styles.modalIcon}>
              <Ionicons
                name={otpType === "pickup" ? "cube" : "checkmark-circle"}
                size={32}
                color={C.primary}
              />
            </View>

            <Text style={styles.modalTitle}>
              {otpType === "pickup"
                ? "Verify Pickup OTP"
                : "Verify Delivery OTP"}
            </Text>
            <Text style={styles.modalSubtitle}>
              {otpType === "pickup"
                ? "Enter the 4-digit OTP from the admin"
                : "Enter the 4-digit OTP from the customer"}
            </Text>

            <View style={styles.otpContainer}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => {
                    otpInputRefs.current[index] = ref;
                  }}
                  style={[
                    styles.otpInput,
                    otpError ? styles.otpInputError : null,
                  ]}
                  value={digit}
                  onChangeText={(value) => handleOtpChange(value, index)}
                  onKeyPress={(e) => handleOtpKeyPress(e, index)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                />
              ))}
            </View>

            {otpError ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color="#D64545" />
                <Text style={styles.errorText}>{otpError}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.verifyButton, otpLoading && { opacity: 0.7 }]}
              onPress={handleVerifyOtp}
              disabled={otpLoading}
            >
              <Text style={styles.verifyButtonText}>
                {otpLoading ? "Verifying..." : "Verify & Continue"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Success Toast */}
      {showSuccessToast && (
        <Animated.View style={[styles.successToast, { opacity: toastOpacity }]}>
          <Ionicons name="checkmark-circle" size={24} color="#fff" />
          <Text style={styles.successToastText}>{successMessage}</Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
  count,
}: {
  icon: any;
  title: string;
  subtitle: string;
  count: number;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderLeft}>
        <View style={styles.sectionIcon}>
          <Ionicons name={icon} size={20} color={C.primary} />
        </View>
        <View>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <View style={styles.countBadge}>
        <Text style={styles.countText}>{count}</Text>
      </View>
    </View>
  );
}

function OrderCard({
  order,
  onAccept,
  onPickup,
  onDeliver,
  onCancel,
  isAvailable,
}: {
  order: any;
  onAccept?: () => void;
  onPickup?: () => void;
  onDeliver?: () => void;
  onCancel?: () => void;
  isAvailable?: boolean;
}) {
  const isPrePickup = isAvailable || order.status === "assigned";
  const contactName = order.display_name || (isPrePickup ? "Admin" : order.customer_name || "Customer");
  const contactPhone = order.display_phone || order.customer_phone || "N/A";
  const addressText = formatOrderAddress(order.display_address || order.address);
  const items: any[] = order.items || [];

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <View style={styles.stageTag}>
            <Ionicons
              name={isPrePickup ? "storefront-outline" : "home-outline"}
              size={11}
              color={C.dark}
            />
            <Text style={styles.stageTagText}>
              {isPrePickup ? "Pickup from Admin" : "Deliver to Customer"}
            </Text>
          </View>
          <Text style={styles.customerName}>{contactName}</Text>
        </View>
        <Text style={styles.amount}>₹{order.total_amount || 0}</Text>
      </View>

      <Text style={styles.phone}> {contactPhone}</Text>
      <Text style={styles.address}> {addressText}</Text>

      {items.length > 0 && (
        <View style={styles.itemsBox}>
          <Text style={styles.itemsBoxTitle}>Order Items</Text>
          {items.map((item, idx) => (
            <View key={idx} style={styles.itemRow}>
              <Text style={styles.itemName} numberOfLines={1}>
                {item.product_name || "Product"} × {item.quantity}
              </Text>
              <Text style={styles.itemAmount}>
                ₹{item.amount ?? (item.price || 0) * (item.quantity || 0)}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.cardFooter}>
        {isAvailable ? (
          <TouchableOpacity style={styles.actionButton} onPress={onAccept}>
            <Text style={styles.actionButtonText}>Accept Order</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.buttonGroup}>
            {order.status === "assigned" ? (
              <TouchableOpacity style={styles.pickupButton} onPress={onPickup}>
                <Text style={styles.pickupButtonText}>Verify Pickup</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.deliverButton}
                onPress={onDeliver}
              >
                <Text style={styles.deliverButtonText}>Complete Delivery</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

function CompletedOrderCard({ order }: { order: any }) {
  return (
    <View style={[styles.card, { opacity: 0.85 }]}>
      <View style={styles.cardHeader}>
        <Text style={styles.customerName}>
          {order.display_name || order.customer_name || "Customer"}
        </Text>
        <Text style={styles.completedBadge}>Delivered</Text>
      </View>
      <Text style={styles.address}>
        📍 {formatOrderAddress(order.display_address || order.address)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: "700", color: C.text },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: C.card,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  tab: { flex: 1, paddingVertical: 14, alignItems: "center" },
  tabActive: { borderBottomWidth: 3, borderBottomColor: C.primary },
  tabText: { fontSize: 14, fontWeight: "600", color: C.textMuted },
  tabTextActive: { color: C.primary, fontWeight: "700" },
  scrollContent: { padding: 16 },
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.light,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: C.text },
  sectionSubtitle: { fontSize: 12, color: C.textMuted },
  countBadge: {
    backgroundColor: C.light,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: { fontSize: 12, fontWeight: "600", color: C.dark },
  card: {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
    elevation: 2,
    shadowColor: C.dark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  customerName: { fontSize: 16, fontWeight: "700", color: C.text },
  amount: { fontSize: 16, fontWeight: "700", color: C.primary },
  phone: { fontSize: 14, color: C.textMuted, marginBottom: 4 },
  address: { fontSize: 13, color: C.textMuted, marginBottom: 12 },
  cardFooter: { marginTop: 4 },
  actionButton: {
    backgroundColor: C.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  actionButtonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  buttonGroup: { flexDirection: "row", gap: 8 },
  pickupButton: {
    flex: 2,
    backgroundColor: C.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  pickupButtonText: { color: "#FFFFFF", fontWeight: "700" },
  deliverButton: {
    flex: 2,
    backgroundColor: C.accent,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  deliverButtonText: { color: "#FFFFFF", fontWeight: "700" },
  cancelButton: {
    flex: 1,
    backgroundColor: C.bg,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  cancelButtonText: { color: C.textMuted, fontWeight: "600" },
  completedBadge: {
    backgroundColor: C.light,
    color: C.dark,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    fontSize: 12,
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: C.text },
  emptyText: { fontSize: 14, color: C.textMuted, textAlign: "center" },
  goToHomeButton: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: C.dark,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 12,
  },
  goToHomeButtonText: { color: "#FFFFFF", fontWeight: "600" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(61, 31, 10, 0.45)",
    justifyContent: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
  },
  modalClose: { position: "absolute", right: 16, top: 16 },
  modalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.light,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: C.text,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: C.textMuted,
    textAlign: "center",
    marginBottom: 24,
  },
  otpContainer: { flexDirection: "row", gap: 12, marginBottom: 20 },
  otpInput: {
    width: 56,
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: C.border,
    backgroundColor: C.bg,
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    color: C.text,
  },
  otpInputError: { borderColor: "#D64545" },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 16,
  },
  errorText: { fontSize: 13, color: "#D64545", fontWeight: "500" },
  verifyButton: {
    backgroundColor: C.primary,
    width: "100%",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  verifyButtonText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  successToast: {
    position: "absolute",
    bottom: 40,
    left: 24,
    right: 24,
    backgroundColor: C.dark,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  successToastText: { color: "#FFFFFF", fontWeight: "600", fontSize: 14 },
  stageTag: {
  flexDirection: "row",
  alignItems: "center",
  gap: 4,
  alignSelf: "flex-start",
  backgroundColor: C.light,
  paddingHorizontal: 8,
  paddingVertical: 3,
  borderRadius: 8,
  marginBottom: 4,
},
stageTagText: { fontSize: 10, fontWeight: "700", color: C.dark },
itemsBox: {
  backgroundColor: C.bg,
  borderRadius: 10,
  padding: 10,
  marginBottom: 12,
  borderWidth: 1,
  borderColor: C.border,
},
itemsBoxTitle: {
  fontSize: 11,
  fontWeight: "700",
  color: C.textMuted,
  textTransform: "uppercase",
  marginBottom: 6,
},
itemRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  paddingVertical: 3,
},
itemName: { flex: 1, fontSize: 13, color: C.text, fontWeight: "500" },
itemAmount: { fontSize: 13, color: C.dark, fontWeight: "700" },
});
