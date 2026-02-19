import React, { useState, useCallback, useRef } from "react";
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  Modal, Alert, TextInput, TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../src/services/api";
import { Colors } from "../../src/constants/colors";
import Button from "../../src/components/Button";
import LoadingScreen from "../../src/components/LoadingScreen";

export default function DeliveriesScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [otpModal, setOtpModal] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [otpOrder, setOtpOrder] = useState<any>(null);
  const [otpType, setOtpType] = useState<"admin" | "user" | null>(null);
  const inputRef = useRef<TextInput>(null);

  const fetchData = async () => {
    try {
      const [available, myOrders] = await Promise.all([
        api.getAvailableOrders(),
        api.getMyOrders(),
      ]);
      setDeliveries([...available, ...myOrders]);
    } catch (error) {
      console.error("Error fetching deliveries:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  const onRefresh = async () => { setRefreshing(true); await fetchData(); };

  const acceptOrder = async (orderId: string) => { await api.acceptOrder(orderId); fetchData(); };
  const updateOrderStatus = async (orderId: string, status: string) => {
    await api.updateOrderStatus(orderId, status); fetchData();
  };
  const openAdminOtpModal = (order: any) => { setOtpOrder(order); setOtpType("admin"); setOtpModal(true); };
  const openUserOtpModal = (order: any) => { setOtpOrder(order); setOtpType("user"); setOtpModal(true); };

  const handleOtpSubmit = async () => {
    if (!otpOrder) return;
    if (otpType === "admin") {
      if (otpValue === otpOrder.admin_otp) { await updateOrderStatus(otpOrder.id, "picked_up"); }
      else { Alert.alert("Wrong OTP", "The admin OTP you entered is incorrect."); return; }
    }
    if (otpType === "user") {
      if (otpValue === otpOrder.delivery_otp) { await updateOrderStatus(otpOrder.id, "delivered"); }
      else { Alert.alert("Wrong OTP", "The customer OTP you entered is incorrect."); return; }
    }
    setOtpModal(false);
    setOtpValue("");
  };

  if (loading) return <LoadingScreen />;

  const availableOrders = deliveries.filter(d => d.status === "unassigned" || d.status === "available");
  const activeOrders = deliveries.filter(d => ["assigned", "picked_up", "out_for_delivery"].includes(d.status));
  const completedOrders = deliveries.filter(d => d.status === "delivered");

  const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    assigned:         { label: "Assigned",      color: "#2563eb", bg: "#EFF6FF" },
    picked_up:        { label: "Picked Up",     color: "#7c3aed", bg: "#F5F3FF" },
    out_for_delivery: { label: "On the Way",    color: "#0891b2", bg: "#ECFEFF" },
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.title}>Deliveries</Text>
        <View style={styles.headerBadges}>
          {availableOrders.length > 0 && (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>{availableOrders.length} New</Text>
            </View>
          )}
          {activeOrders.length > 0 && (
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>{activeOrders.length} Active</Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.listContent}
      >

        {/* ── AVAILABLE ORDERS ── */}
        {availableOrders.length > 0 && (
          <Text style={styles.sectionLabel}>NEW ORDERS</Text>
        )}
        {availableOrders.map((order) => (
          <View key={order.id} style={styles.card}>
            {/* Card Header */}
            <View style={styles.cardHeader}>
              <View style={styles.orderIdRow}>
                <View style={[styles.iconBox, { backgroundColor: '#FFF4E6' }]}>
                  <Ionicons name="cube-outline" size={15} color="#f59e0b" />
                </View>
                <Text style={styles.orderId}>#{order.id?.slice(-6).toUpperCase()}</Text>
              </View>
              <View style={[styles.statusPill, { backgroundColor: '#FFF4E6' }]}>
                <View style={[styles.statusDot, { backgroundColor: '#f59e0b' }]} />
                <Text style={[styles.statusPillText, { color: '#f59e0b' }]}>Available</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Customer Info */}
            <Text style={styles.colLabel}>DELIVER TO</Text>
            <Text style={styles.personName}>{order.customer_name}</Text>
            {order.customer_phone && (
              <View style={styles.phoneRow}>
                <Ionicons name="call-outline" size={12} color="#aaa" />
                <Text style={styles.phoneText}>{order.customer_phone}</Text>
              </View>
            )}
            {(order.delivery_address?.tower || order.delivery_address?.flat) && (
              <View style={styles.addressRow}>
                <Ionicons name="location-outline" size={12} color="#aaa" />
                <Text style={styles.addressText}>
                  {order.delivery_address?.tower} {order.delivery_address?.flat}
                </Text>
              </View>
            )}

            <View style={styles.divider} />

            {/* Items */}
            <Text style={styles.colLabel}>ITEMS</Text>
            <View style={styles.itemsList}>
              {order.items?.map((item: any, i: number) => (
                <View key={i} style={styles.itemRow}>
                  <View style={styles.itemDot} />
                  <Text style={styles.itemText}>{item.product_name}</Text>
                  <Text style={styles.itemQty}>×{item.quantity}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={styles.acceptBtn}
              onPress={() => acceptOrder(order.id)}
            >
              <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
              <Text style={styles.acceptBtnText}>Accept Order</Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* ── ACTIVE ORDERS ── */}
        {activeOrders.length > 0 && (
          <Text style={styles.sectionLabel}>ACTIVE</Text>
        )}
        {activeOrders.map((order) => {
          const sc = statusConfig[order.status] ?? statusConfig["assigned"];
          return (
            <View key={order.id} style={styles.card}>
              {/* Header */}
              <View style={styles.cardHeader}>
                <View style={styles.orderIdRow}>
                  <View style={[styles.iconBox, { backgroundColor: sc.bg }]}>
                    <Ionicons name="bicycle-outline" size={15} color={sc.color} />
                  </View>
                  <Text style={styles.orderId}>#{order.id?.slice(-6).toUpperCase()}</Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: sc.bg }]}>
                  <View style={[styles.statusDot, { backgroundColor: sc.color }]} />
                  <Text style={[styles.statusPillText, { color: sc.color }]}>{sc.label}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Two col: Pickup + Deliver */}
              <View style={styles.twoCol}>
                <View style={styles.col}>
                  <Text style={styles.colLabel}>PICKUP FROM</Text>
                  <Text style={styles.personName}>{order.admin_name}</Text>
                  {order.admin_phone && (
                    <View style={styles.phoneRow}>
                      <Ionicons name="call-outline" size={12} color="#aaa" />
                      <Text style={styles.phoneText}>{order.admin_phone}</Text>
                    </View>
                  )}
                  {order.pickup_address?.tower && (
                    <View style={styles.addressRow}>
                      <Ionicons name="location-outline" size={12} color="#aaa" />
                      <Text style={styles.addressText}>
                        {order.pickup_address?.tower} {order.pickup_address?.flat}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.colDivider} />

                <View style={styles.col}>
                  <Text style={styles.colLabel}>DELIVER TO</Text>
                  <Text style={styles.personName}>{order.customer_name}</Text>
                  {order.customer_phone && (
                    <View style={styles.phoneRow}>
                      <Ionicons name="call-outline" size={12} color="#aaa" />
                      <Text style={styles.phoneText}>{order.customer_phone}</Text>
                    </View>
                  )}
                  {order.delivery_address?.tower && (
                    <View style={styles.addressRow}>
                      <Ionicons name="location-outline" size={12} color="#aaa" />
                      <Text style={styles.addressText}>
                        {order.delivery_address?.tower} {order.delivery_address?.flat}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.divider} />

              {/* Items */}
              <Text style={styles.colLabel}>ITEMS</Text>
              <View style={styles.itemsList}>
                {order.items?.map((item: any, i: number) => (
                  <View key={i} style={styles.itemRow}>
                    <View style={styles.itemDot} />
                    <Text style={styles.itemText}>{item.product_name}</Text>
                    <Text style={styles.itemQty}>×{item.quantity}</Text>
                  </View>
                ))}
              </View>

              {/* Action Buttons */}
              {order.status === "assigned" && (
                <TouchableOpacity style={styles.actionBtn} onPress={() => openAdminOtpModal(order)}>
                  <Ionicons name="cube-outline" size={17} color="#fff" />
                  <Text style={styles.actionBtnText}>Pickup Order</Text>
                </TouchableOpacity>
              )}
              {order.status === "picked_up" && (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#0891b2' }]}
                  onPress={() => updateOrderStatus(order.id, "out_for_delivery")}
                >
                  <Ionicons name="navigate-outline" size={17} color="#fff" />
                  <Text style={styles.actionBtnText}>Out For Delivery</Text>
                </TouchableOpacity>
              )}
              {order.status === "out_for_delivery" && (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#16a34a' }]}
                  onPress={() => openUserOtpModal(order)}
                >
                  <Ionicons name="checkmark-done-outline" size={17} color="#fff" />
                  <Text style={styles.actionBtnText}>Deliver Order</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}

        {/* ── COMPLETED ── */}
        {completedOrders.length > 0 && (
          <Text style={styles.sectionLabel}>COMPLETED</Text>
        )}
        {completedOrders.map((order) => (
          <View key={order.id} style={[styles.card, styles.completedCard]}>
            <View style={styles.cardHeader}>
              <View style={styles.orderIdRow}>
                <View style={[styles.iconBox, { backgroundColor: '#F0FDF4' }]}>
                  <Ionicons name="checkmark-circle-outline" size={15} color="#22c55e" />
                </View>
                <View>
                  <Text style={styles.orderId}>#{order.id?.slice(-6).toUpperCase()}</Text>
                  <Text style={styles.completedName}>{order.customer_name}</Text>
                </View>
              </View>
              <View>
                <Text style={styles.completedAmount}>₹{order.total_amount}</Text>
                <View style={[styles.statusPill, { backgroundColor: '#F0FDF4', alignSelf: 'flex-end' }]}>
                  <View style={[styles.statusDot, { backgroundColor: '#22c55e' }]} />
                  <Text style={[styles.statusPillText, { color: '#22c55e' }]}>Delivered</Text>
                </View>
              </View>
            </View>
          </View>
        ))}

        {/* Empty State */}
        {deliveries.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="bicycle-outline" size={52} color="#ddd" />
            <Text style={styles.emptyTitle}>No deliveries yet</Text>
            <Text style={styles.emptyDesc}>Pull down to refresh</Text>
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* ── OTP MODAL ── */}
      <Modal
        visible={otpModal}
        transparent
        animationType="slide"
        onShow={() => inputRef.current?.focus()}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.dragHandle} />

            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Enter OTP</Text>
                <Text style={styles.modalSubtitle}>
                  {otpType === "admin" ? "Get OTP from the shop owner" : "Get OTP from the customer"}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => { setOtpModal(false); setOtpValue(""); }}
              >
                <Ionicons name="close" size={16} color="#666" />
              </TouchableOpacity>
            </View>

            {/* OTP Boxes */}
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => inputRef.current?.focus()}
              style={styles.otpWrapper}
            >
              <View style={styles.otpContainer}>
                {[0, 1, 2, 3].map((index) => (
                  <View
                    key={index}
                    style={[
                      styles.otpBox,
                      otpValue.length === index && styles.otpBoxActive,
                      otpValue.length > index && styles.otpBoxFilled,
                    ]}
                  >
                    <Text style={styles.otpDigit}>{otpValue[index] || ""}</Text>
                  </View>
                ))}
              </View>
              <TextInput
                ref={inputRef}
                value={otpValue}
                onChangeText={(text) => {
                  if (/^\d*$/.test(text) && text.length <= 4) setOtpValue(text);
                }}
                keyboardType="number-pad"
                maxLength={4}
                autoFocus
                caretHidden
                style={styles.hiddenInput}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitBtn, otpValue.length < 4 && styles.submitBtnDisabled]}
              onPress={handleOtpSubmit}
              disabled={otpValue.length < 4}
            >
              <Text style={styles.submitBtnText}>Verify & Continue</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelOtpBtn}
              onPress={() => { setOtpModal(false); setOtpValue(""); }}
            >
              <Text style={styles.cancelOtpText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F7F4' },
  listContent: { paddingHorizontal: 16, paddingBottom: 20 },

  /* ── Header ── */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
  },
  title: { fontSize: 26, fontWeight: '800', color: '#1A1A1A', letterSpacing: -0.5 },
  headerBadges: { flexDirection: 'row', gap: 8 },
  newBadge: {
    backgroundColor: '#FFF4E6', paddingHorizontal: 10,
    paddingVertical: 4, borderRadius: 20,
  },
  newBadgeText: { fontSize: 12, fontWeight: '700', color: '#f59e0b' },
  activeBadge: {
    backgroundColor: '#EFF6FF', paddingHorizontal: 10,
    paddingVertical: 4, borderRadius: 20,
  },
  activeBadgeText: { fontSize: 12, fontWeight: '700', color: '#2563eb' },

  /* ── Section Label ── */
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#bbb',
    letterSpacing: 1, textTransform: 'uppercase',
    marginTop: 12, marginBottom: 10, marginLeft: 4,
  },

  /* ── Card ── */
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  completedCard: { opacity: 0.75 },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderIdRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBox: {
    width: 32, height: 32, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  orderId: { fontSize: 15, fontWeight: '800', color: '#1A1A1A' },

  statusPill: {
    flexDirection: 'row', alignItems: 'center',
    gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusPillText: { fontSize: 11, fontWeight: '700' },

  divider: { height: 1, backgroundColor: '#F5F5F5', marginVertical: 12 },

  /* ── Info ── */
  colLabel: {
    fontSize: 10, fontWeight: '700', color: '#bbb',
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6,
  },
  personName: { fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 },
  phoneText: { fontSize: 12, color: '#aaa', fontWeight: '500' },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  addressText: { fontSize: 12, color: '#aaa', fontWeight: '500' },

  /* ── Two Col ── */
  twoCol: { flexDirection: 'row' },
  col: { flex: 1 },
  colDivider: { width: 1, backgroundColor: '#F5F5F5', marginHorizontal: 12 },

  /* ── Items ── */
  itemsList: { gap: 6, marginTop: 6, marginBottom: 14 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary },
  itemText: { flex: 1, fontSize: 13, fontWeight: '500', color: '#333' },
  itemQty: { fontSize: 12, color: '#aaa', fontWeight: '600' },

  /* ── Buttons ── */
  acceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 13,
    marginTop: 4,
  },
  acceptBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#7c3aed',
    borderRadius: 12,
    paddingVertical: 13,
    marginTop: 4,
  },
  actionBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  /* ── Completed ── */
  completedName: { fontSize: 12, color: '#aaa', marginTop: 2 },
  completedAmount: { fontSize: 16, fontWeight: '800', color: '#1A1A1A', textAlign: 'right' },

  /* ── Empty ── */
  emptyState: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#ccc' },
  emptyDesc: { fontSize: 13, color: '#ddd' },

  /* ── OTP Modal ── */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 36,
  },
  dragHandle: {
    width: 40, height: 4, backgroundColor: '#E0E0E0',
    borderRadius: 2, alignSelf: 'center', marginBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 28,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1A1A1A' },
  modalSubtitle: { fontSize: 13, color: '#aaa', marginTop: 3 },
  modalCloseBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center',
  },

  otpWrapper: { position: 'relative', marginBottom: 28 },
  otpContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  otpBox: {
    width: 68, height: 72,
    borderWidth: 1.5, borderColor: '#E5E5E5',
    borderRadius: 14, justifyContent: 'center',
    alignItems: 'center', backgroundColor: '#FAFAFA',
  },
  otpBoxActive: {
    borderColor: Colors.primary,
    borderWidth: 2,
    backgroundColor: Colors.primary + '08',
  },
  otpBoxFilled: {
    borderColor: '#22c55e',
    backgroundColor: '#F0FDF4',
  },
  otpDigit: { fontSize: 28, fontWeight: '800', color: '#1A1A1A' },
  hiddenInput: {
    position: 'absolute', top: 0, left: 0,
    width: '100%', height: '100%', opacity: 0.01,
  },

  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 12,
  },
  submitBtnDisabled: { backgroundColor: '#E5E5E5' },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  cancelOtpBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelOtpText: { fontSize: 14, fontWeight: '600', color: '#aaa' },
});