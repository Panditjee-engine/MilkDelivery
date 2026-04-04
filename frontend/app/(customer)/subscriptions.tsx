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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../src/services/api";
import { Colors } from "../../src/constants/colors";
import LoadingScreen from "../../src/components/LoadingScreen";
import { BlurView } from "expo-blur";

// ─── Confirm Cancel Modal ─────────────────────────────────────────────────────
function ConfirmModal({
  visible,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const scaleAnim   = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const iconAnim    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
      iconAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim,   { toValue: 1, useNativeDriver: true, damping: 15, stiffness: 200 }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start(() => {
        Animated.spring(iconAnim, { toValue: 1, useNativeDriver: true, damping: 8, stiffness: 180 }).start();
      });
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={ms.overlay}>
        <Animated.View style={[ms.card, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>

          {/* Icon */}
          <Animated.View style={[ms.iconWrap, { transform: [{ scale: iconAnim }] }]}>
            <View style={ms.iconCircleRed}>
              <Ionicons name="close" size={30} color="#ef4444" />
            </View>
          </Animated.View>

          <Text style={ms.title}>Cancel Subscription?</Text>
          <Text style={ms.subtitle}>
            This will stop your daily delivery.{"\n"}This action cannot be undone.
          </Text>

          {/* Warning pill */}
          <View style={ms.warningPill}>
            <Ionicons name="warning-outline" size={13} color="#f59e0b" />
            <Text style={ms.warningText}>You won't be charged for future deliveries</Text>
          </View>

          {/* Buttons */}
          <View style={ms.btnRow}>
            <TouchableOpacity style={ms.btnSecondary} onPress={onCancel} activeOpacity={0.8}>
              <Text style={ms.btnSecondaryText}>Keep it</Text>
            </TouchableOpacity>
            <TouchableOpacity style={ms.btnDanger} onPress={onConfirm} activeOpacity={0.8}>
              <Ionicons name="trash-outline" size={15} color="#fff" />
              <Text style={ms.btnDangerText}>Yes, Cancel</Text>
            </TouchableOpacity>
          </View>

        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── Success Modal ─────────────────────────────────────────────────────────────
function SuccessModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const scaleAnim    = useRef(new Animated.Value(0.8)).current;
  const opacityAnim  = useRef(new Animated.Value(0)).current;
  const checkScale   = useRef(new Animated.Value(0)).current;
  const slideAnim    = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.8);
      opacityAnim.setValue(0);
      checkScale.setValue(0);
      slideAnim.setValue(20);

      Animated.parallel([
        Animated.spring(scaleAnim,   { toValue: 1, useNativeDriver: true, damping: 14, stiffness: 180 }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start(() => {
        Animated.spring(checkScale, { toValue: 1, useNativeDriver: true, damping: 8, stiffness: 220 }).start();
        Animated.spring(slideAnim,  { toValue: 0, useNativeDriver: true, damping: 16, stiffness: 160 }).start();
      });
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={ms.overlay}>
        <Animated.View style={[ms.card, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>

          <Animated.View style={[ms.iconWrap, { transform: [{ scale: checkScale }] }]}>
            <View style={ms.iconCircleGreen}>
              <Ionicons name="checkmark" size={30} color="#22c55e" />
            </View>
          </Animated.View>

          <Text style={ms.title}>Subscription Cancelled</Text>

          <Animated.View style={{ opacity: opacityAnim, transform: [{ translateY: slideAnim }] }}>
            <Text style={ms.subtitle}>
              Your subscription has been{"\n"}successfully cancelled.
            </Text>

            <View style={ms.infoPill}>
              <Ionicons name="information-circle-outline" size={13} color={Colors.primary} />
              <Text style={ms.infoText}>No further deliveries will be scheduled</Text>
            </View>
          </Animated.View>

          <TouchableOpacity style={ms.btnPrimary} onPress={onClose} activeOpacity={0.85}>
            <Text style={ms.btnPrimaryText}>Got it</Text>
          </TouchableOpacity>

        </Animated.View>
      </View>
    </Modal>
  );
}

// Modal styles
const ms = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    width: "100%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 10 },
    elevation: 14,
  },
  iconWrap: { marginBottom: 20 },
  iconCircleRed: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#fef2f2",
    borderWidth: 2,
    borderColor: "#fecaca",
    justifyContent: "center",
    alignItems: "center",
  },
  iconCircleGreen: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#f0fdf4",
    borderWidth: 2,
    borderColor: "#bbf7d0",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111",
    marginBottom: 8,
    letterSpacing: -0.4,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    color: "#888",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 18,
  },
  warningPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fde68a",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 24,
  },
  warningText: { fontSize: 11, color: "#92400e", fontWeight: "600" },
  infoPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderColor: "#bae6fd",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 24,
  },
  infoText: { fontSize: 11, color: "#0369a1", fontWeight: "600" },
  btnRow: { flexDirection: "row", gap: 10, width: "100%" },
  btnSecondary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
  },
  btnSecondaryText: { fontSize: 15, fontWeight: "700", color: "#555" },
  btnDanger: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "#ef4444",
    shadowColor: "#ef4444",
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  btnDangerText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  btnPrimary: {
    width: "100%",
    paddingVertical: 15,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: "center",
    shadowColor: Colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  btnPrimaryText: { fontSize: 16, fontWeight: "800", color: "#fff" },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function SubscriptionsScreen() {
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [pendingSubId, setPendingSubId]   = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const data = await api.getSubscriptions();
      setSubscriptions(data);
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchData(); }, []);

  const handleCancelPress = (subId: string) => {
    setPendingSubId(subId);
    setConfirmVisible(true);
    Vibration.vibrate(40);
  };

  const handleConfirmCancel = async () => {
    if (!pendingSubId) return;
    setConfirmVisible(false);
    try {
      await api.cancelSubscription(pendingSubId);
      await fetchData();
      setSuccessVisible(true);
      Vibration.vibrate([0, 60, 40, 80]);
    } catch (error: any) {
      // Could add an error modal here too
    } finally {
      setPendingSubId(null);
    }
  };

  const getPatternLabel = (pattern: string) => {
    switch (pattern) {
      case "daily":     return "Every day";
      case "alternate": return "Alternate days";
      case "custom":    return "Custom days";
      case "buy_once":  return "One-time";
      default:          return pattern;
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Subscriptions/orders</Text>
        <Text style={styles.subtitle}>Manage your daily deliveries</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {subscriptions.length > 0 ? (
          subscriptions.map((sub) => {
            const isDelivered = sub.status === "delivered";
            const riderProgress =
              sub.status === "assigned"        ? 0.3 :
              sub.status === "out_for_delivery"? 0.7 :
              sub.status === "delivered"       ? 1   : 0.1;

            return (
              <View key={sub.id} style={styles.ticketWrapper}>
                <View style={styles.perforationTop} />
                <View style={styles.ticketCard}>
                  <View style={[styles.ticketContent, isDelivered && { opacity: 0.45 }]}>

                    <View style={styles.ticketHeader}>
                      <View>
                        <Text style={styles.productName}>{sub.product?.name}</Text>
                        <Text style={styles.ticketId}>#{sub.id?.slice(-6)}</Text>
                      </View>
                      <Text style={styles.price}>₹{sub.product?.price}</Text>
                    </View>

                    <View style={styles.progressContainer}>
                      <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${riderProgress * 100}%` }]} />
                      </View>
                      <Text style={styles.progressLabel}>{sub.status}</Text>
                    </View>

                    <View style={styles.detailsRow}>
                      <View>
                        <Text style={styles.smallLabel}>Pattern</Text>
                        <Text style={styles.valueText}>{getPatternLabel(sub.pattern)}</Text>
                      </View>
                      <View>
                        <Text style={styles.smallLabel}>Qty</Text>
                        <Text style={styles.valueText}>{sub.quantity}x</Text>
                      </View>
                      <View>
                        <Text style={styles.smallLabel}>Unit</Text>
                        <Text style={styles.valueText}>{sub.product?.unit}</Text>
                      </View>
                    </View>

                    {sub.delivery_otp && !isDelivered && (
                      <View style={styles.otpSection}>
                        <Text style={styles.smallLabel}>OTP</Text>
                        <Text style={styles.otpText}>{sub.delivery_otp}</Text>
                      </View>
                    )}

                    {!isDelivered && (
                      <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={() => handleCancelPress(sub.id)}
                      >
                        <Ionicons name="close-circle-outline" size={15} color="#ef4444" />
                        <Text style={styles.cancelText}>Cancel Subscription</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {isDelivered && (
                    <>
                      <BlurView intensity={18} tint="light" style={styles.blurOverlay} />
                      <View style={styles.deliveredStampWrap}>
                        <View style={styles.deliveredStamp}>
                          <Ionicons name="checkmark-circle" size={18} color="#fff" />
                          <Text style={styles.deliveredStampText}>DELIVERED</Text>
                        </View>
                      </View>
                    </>
                  )}
                </View>
                <View style={styles.perforationBottom} />
              </View>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={60} color={Colors.textLight} />
            <Text style={styles.emptyTitle}>No Active Subscriptions</Text>
            <Text style={styles.emptyText}>Start by adding products from the catalog</Text>
          </View>
        )}
      </ScrollView>

      {/* ── Confirm Cancel Modal ── */}
      <ConfirmModal
        visible={confirmVisible}
        onConfirm={handleConfirmCancel}
        onCancel={() => { setConfirmVisible(false); setPendingSubId(null); }}
      />

      {/* ── Success Modal ── */}
      <SuccessModal
        visible={successVisible}
        onClose={() => setSuccessVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: Colors.background },
  header:     { paddingHorizontal: 20, paddingVertical: 16 },
  title:      { fontSize: 24, fontWeight: "700", color: Colors.text },
  subtitle:   { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  scrollView: { flex: 1, paddingHorizontal: 20 },

  ticketWrapper: { marginBottom: 30, position: "relative" },
  ticketCard: { backgroundColor: "#fff", borderRadius: 20, overflow: "hidden", position: "relative" },
  ticketContent: { padding: 18 },

  ticketHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  ticketId:     { fontSize: 12, color: "#888" },
  productName:  { fontSize: 18, fontWeight: "700", color: Colors.text },
  price:        { fontSize: 16, fontWeight: "700", color: Colors.primary },

  progressContainer: { marginTop: 15 },
  progressBarBg: { height: 6, backgroundColor: "#eee", borderRadius: 10, overflow: "hidden" },
  progressBarFill: { height: 6, backgroundColor: "#22c55e" },
  progressLabel: { marginTop: 6, fontSize: 12, color: Colors.textSecondary },

  detailsRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 18 },
  smallLabel: { fontSize: 11, color: "#999" },
  valueText:  { fontSize: 14, fontWeight: "600", marginTop: 3, color: Colors.text },

  otpSection: { marginTop: 18, alignItems: "center" },
  otpText:    { fontSize: 22, fontWeight: "700", letterSpacing: 4, color: Colors.primary },

  cancelBtn: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#fef2f2",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  cancelText: { color: "#ef4444", fontWeight: "700", fontSize: 14 },

  blurOverlay:       { ...StyleSheet.absoluteFillObject },
  deliveredStampWrap: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  deliveredStamp: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#22c55e", paddingVertical: 10, paddingHorizontal: 24,
    borderRadius: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 6, elevation: 4,
  },
  deliveredStampText: { color: "#fff", fontWeight: "800", fontSize: 15, letterSpacing: 1 },

  perforationTop:    { height: 12, borderTopWidth: 1, borderStyle: "dashed", borderColor: "#ccc", marginBottom: -6 },
  perforationBottom: { height: 12, borderBottomWidth: 1, borderStyle: "dashed", borderColor: "#ccc", marginTop: -6 },

  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: Colors.text, marginTop: 16 },
  emptyText:  { fontSize: 14, color: Colors.textSecondary, marginTop: 8 },
});