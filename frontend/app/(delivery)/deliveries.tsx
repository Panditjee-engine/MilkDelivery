import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Alert, Modal, TextInput, Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { api } from "../../src/services/api";
import { Colors } from "../../src/constants/colors";
import LoadingScreen from "../../src/components/LoadingScreen";

type TabType = "active" | "completed";

export default function DeliveriesScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("active");
  const [checkinStatus, setCheckinStatus] = useState<any>(null);
  
  // Available orders (unassigned, shown to all)
  const [availableOrders, setAvailableOrders] = useState<any[]>([]);
  
  // My orders (assigned to me, in-progress, completed)
  const [myOrders, setMyOrders] = useState<any[]>([]);
  
  // OTP Modal state
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [otpType, setOtpType] = useState<"pickup" | "delivery">("pickup");
  const [currentOrder, setCurrentOrder] = useState<any>(null);
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [otpError, setOtpError] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  
  // Success toast
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const toastOpacity = useRef(new Animated.Value(0)).current;

  const otpInputRefs = useRef<Array<TextInput | null>>([]);

  // Helper: returns true for buy-once orders only (pattern === "buy_once")
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
      
      // Strict filter: Only show buy-once orders to riders
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

  // Show success toast
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

  // Accept order
  const handleAcceptOrder = async (order: any) => {
    try {
      await api.acceptOrder(order.id || order._id);
      Alert.alert("✓ Order Accepted", "You can now start the delivery");
      await fetchData();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to accept order");
    }
  };

  // Open OTP modal for pickup
  const handleStartPickup = (order: any) => {
    setCurrentOrder(order);
    setOtpType("pickup");
    setOtp(["", "", "", ""]);
    setOtpError("");
    setOtpModalVisible(true);
  };

  // Open OTP modal for delivery
  const handleStartDelivery = (order: any) => {
    setCurrentOrder(order);
    setOtpType("delivery");
    setOtp(["", "", "", ""]);
    setOtpError("");
    setOtpModalVisible(true);
  };

  // Handle OTP input change
  const handleOtpChange = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setOtpError("");

    // Auto-focus next input
    if (value && index < 3) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  // Handle OTP backspace
  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Verify OTP against backend validation endpoints
  const handleVerifyOtp = async () => {
    const otpString = otp.join("");
    if (otpString.length !== 4) {
      setOtpError("Please enter complete OTP");
      return;
    }

    setOtpLoading(true);
    setOtpError("");
    
    try {
      const orderId = currentOrder.id || currentOrder._id;

      // Contact backend to verify current OTP input securely
      if (otpType === "pickup") {
        await api.verifyPickupOtp(orderId, otpString);
        await api.updateOrderStatus(orderId, "picked_up");
        setOtpModalVisible(false);
        showSuccessToastMessage("✓ Order Picked Up Successfully!");
      } else {
        await api.verifyDeliveryOtp(orderId, otpString);
        await api.updateOrderStatus(orderId, "delivered");
        setOtpModalVisible(false);
        showSuccessToastMessage("✓ Order Delivered Successfully!");
      }
      await fetchData();
    } catch (error: any) {
      setOtpError(error.message || "Invalid OTP. Please check and try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  // Cancel order (reject)
  const handleCancelOrder = async (order: any) => {
    Alert.alert(
      "Cancel Order",
      "Are you sure you want to cancel this order?",
      [
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
      ]
    );
  };

  if (loading) return <LoadingScreen />;

  // Filter orders for each tab status
  const activeOrders = myOrders.filter((o) =>
    ["assigned", "picked_up", "out_for_delivery"].includes(o.status)
  );
  const completedOrders = myOrders.filter((o) => o.status === "delivered");

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
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
          <Text style={[styles.tabText, activeTab === "active" && styles.tabTextActive]}>
            Active ({availableOrders.length + activeOrders.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "completed" && styles.tabActive]}
          onPress={() => setActiveTab("completed")}
        >
          <Text style={[styles.tabText, activeTab === "completed" && styles.tabTextActive]}>
            Completed ({completedOrders.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Check if shift is ON */}
        {!checkinStatus?.checked_in || checkinStatus?.checked_out ? (
          <View style={styles.emptyState}>
            <Ionicons name="bicycle-outline" size={64} color="#ddd" />
            <Text style={styles.emptyTitle}>Shift is Offline</Text>
            <Text style={styles.emptyText}>Start your shift from Home to see orders</Text>
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
                {/* My Active Orders Section */}
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

                {/* Available Orders Section */}
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

                {/* Empty State */}
                {availableOrders.length === 0 && activeOrders.length === 0 && (
                  <View style={styles.emptyState}>
                    <Ionicons name="checkmark-circle-outline" size={64} color="#ddd" />
                    <Text style={styles.emptyTitle}>No Active Deliveries</Text>
                    <Text style={styles.emptyText}>New orders will appear here</Text>
                  </View>
                )}
              </>
            ) : (
              <>
                {/* Completed Orders Section */}
                {completedOrders.length > 0 ? (
                  <View style={styles.section}>
                    <SectionHeader
                      icon="checkmark-done-outline"
                      title="Completed Deliveries"
                      subtitle="Successfully delivered"
                      count={completedOrders.length}
                    />
                    {completedOrders.map((order) => (
                      <CompletedOrderCard key={order.id || order._id} order={order} />
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyState}>
                    <Ionicons name="archive-outline" size={64} color="#ddd" />
                    <Text style={styles.emptyTitle}>No Completed Deliveries</Text>
                    <Text style={styles.emptyText}>Delivered orders will appear here</Text>
                  </View>
                )}
              </>
            )}
          </>
        )}
        <View style={{ height: 30 }} />
      </ScrollView>

      {/* OTP Modal */}
      <Modal visible={otpModalVisible} transparent animationType="fade" onRequestClose={() => setOtpModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.modalClose} onPress={() => setOtpModalVisible(false)}>
              <Ionicons name="close" size={24} color="#999" />
            </TouchableOpacity>
            
            <View style={styles.modalIcon}>
              <Ionicons name={otpType === "pickup" ? "cube" : "checkmark-circle"} size={32} color={Colors.primary} />
            </View>
            
            <Text style={styles.modalTitle}>
              {otpType === "pickup" ? "Verify Pickup OTP" : "Verify Delivery OTP"}
            </Text>
            <Text style={styles.modalSubtitle}>
              Enter the 4-digit OTP to {otpType === "pickup" ? "pick up" : "complete delivery"}
            </Text>
            
            <View style={styles.otpContainer}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => (otpInputRefs.current[index] = ref)}
                  style={[styles.otpInput, otpError && styles.otpInputError]}
                  value={digit}
                  onChangeText={(value) => handleOtpChange(value, index)}
                  onKeyPress={(e) => handleOtpKeyPress(e, index)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                />
              ))}
            </View>
            
            {otpError && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color="#FF4444" />
                <Text style={styles.errorText}>{otpError}</Text>
              </View>
            )}
            
            <TouchableOpacity style={styles.verifyButton} onPress={handleVerifyOtp} disabled={otpLoading}>
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

// Section Header Component
function SectionHeader({ icon, title, subtitle, count }: { icon: any; title: string; subtitle: string; count: number; }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderLeft}>
        <View style={styles.sectionIcon}>
          <Ionicons name={icon} size={20} color={Colors.primary} />
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

// Order Card Component
function OrderCard({ order, onAccept, onPickup, onDeliver, onCancel, isAvailable }: { order: any; onAccept?: () => void; onPickup?: () => void; onDeliver?: () => void; onCancel?: () => void; isAvailable?: boolean; }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.customerName}>{order.customer_name || "Customer"}</Text>
        <Text style={styles.amount}>₹{order.total_amount || 0}</Text>
      </View>
      <Text style={styles.phone}>📞 {order.customer_phone || "N/A"}</Text>
      <Text style={styles.address}>📍 Delivery: {order.delivery_address?.line1 || "No Address Provided"}</Text>
      
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
              <TouchableOpacity style={styles.deliverButton} onPress={onDeliver}>
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

// Completed Order Card Component
function CompletedOrderCard({ order }: { order: any; }) {
  return (
    <View style={[styles.card, { opacity: 0.8 }]}>
      <View style={styles.cardHeader}>
        <Text style={styles.customerName}>{order.customer_name || "Customer"}</Text>
        <Text style={styles.completedBadge}>Delivered</Text>
      </View>
      <Text style={styles.address}>📍 {order.delivery_address?.line1 || ""}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F6F9" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, backgroundColor: "#FFF" },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#1A1A1A" },
  tabContainer: { flexDirection: "row", backgroundColor: "#FFF", paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "#EAEAEA" },
  tab: { flex: 1, paddingVertical: 14, alignItems: "center" },
  tabActive: { borderBottomWidth: 3, borderBottomColor: Colors.primary },
  tabText: { fontSize: 14, fontWeight: "600", color: "#666" },
  tabTextActive: { color: Colors.primary, fontWeight: "700" },
  scrollContent: { padding: 16 },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  sectionIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#FFF7CC", justifyContent: "center", alignItems: "center" },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#1A1A1A" },
  sectionSubtitle: { fontSize: 12, color: "#666" },
  countBadge: { backgroundColor: "#EAEAEA", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  countText: { fontSize: 12, fontWeight: "600", color: "#1A1A1A" },
  card: { backgroundColor: "#FFF", borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  customerName: { fontSize: 16, fontWeight: "700", color: "#1A1A1A" },
  amount: { fontSize: 16, fontWeight: "700", color: Colors.primary },
  phone: { fontSize: 14, color: "#444", marginBottom: 4 },
  address: { fontSize: 13, color: "#666", marginBottom: 12 },
  cardFooter: { marginTop: 4 },
  actionButton: { backgroundColor: Colors.primary, paddingVertical: 12, borderRadius: 8, alignItems: "center" },
  actionButtonText: { color: "#1A1A1A", fontWeight: "700", fontSize: 14 },
  buttonGroup: { flexDirection: "row", gap: 8 },
  pickupButton: { flex: 2, backgroundColor: Colors.primary, paddingVertical: 12, borderRadius: 8, alignItems: "center" },
  pickupButtonText: { color: "#1A1A1A", fontWeight: "700" },
  deliverButton: { flex: 2, backgroundColor: "#4CAF50", paddingVertical: 12, borderRadius: 8, alignItems: "center" },
  deliverButtonText: { color: "#FFF", fontWeight: "700" },
  cancelButton: { flex: 1, backgroundColor: "#F5F5F5", paddingVertical: 12, borderRadius: 8, alignItems: "center", borderWidth: 1, borderColor: "#DDD" },
  cancelButtonText: { color: "#666", fontWeight: "600" },
  completedBadge: { backgroundColor: "#E8F5E9", color: "#4CAF50", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, fontSize: 12, fontWeight: "600" },
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 60, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#444" },
  emptyText: { fontSize: 14, color: "#888", textAlign: "center" },
  goToHomeButton: { flexDirection: "row", gap: 8, backgroundColor: "#1A1A1A", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24, marginTop: 12 },
  goToHomeButtonText: { color: "#FFF", fontWeight: "600" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 },
  modalContent: { backgroundColor: "#FFF", borderRadius: 16, padding: 24, alignItems: "center" },
  modalClose: { position: "absolute", right: 16, top: 16 },
  modalIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#FFF7CC", justifyContent: "center", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: "700", color: "#1A1A1A", marginBottom: 4 },
  modalSubtitle: { fontSize: 14, color: "#666", textAlign: "center", marginBottom: 24 },
  otpContainer: { flexDirection: "row", gap: 12, marginBottom: 20 },
  otpInput: { width: 56, height: 56, borderRadius: 12, borderWidth: 2, borderColor: "#E5E5E5", backgroundColor: "#F8F9FA", fontSize: 24, fontWeight: "700", textAlign: "center", color: "#1A1A1A" },
  otpInputError: { borderColor: "#FF4444" },
  errorContainer: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 16 },
  errorText: { fontSize: 13, color: "#FF4444", fontWeight: "500" },
  verifyButton: { backgroundColor: Colors.primary, width: "100%", paddingVertical: 16, borderRadius: 12, alignItems: "center" },
  verifyButtonText: { fontSize: 16, fontWeight: "700", color: "#1A1A1A" },
  successToast: { position: "absolute", bottom: 40, left: 24, right: 24, backgroundColor: "#1A1A1A", flexDirection: "row", alignItems: "center", gap: 10, padding: 16, borderRadius: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 5 },
  successToastText: { color: "#FFF", fontWeight: "600", fontSize: 14 }
});