import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../src/services/api";
import { Colors } from "../../src/constants/colors";
import LoadingScreen from "../../src/components/LoadingScreen";
import { Image } from "react-native";
import { BlurView } from "expo-blur";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const getPatternLabel = (pattern: string) => {
  switch (pattern) {
    case "daily":      return "Every day";
    case "alternate":  return "Alternate days";
    case "custom":     return "Custom days";
    case "buy_once":   return "One-time";
    default:           return pattern;
  }
};

const statusConfig: Record<string, { color: string; bg: string; icon: any; label: string }> = {
  pending:          { color: "#d97706", bg: "#FFFBEB", icon: "time",             label: "Pending"         },
  assigned:         { color: "#2563eb", bg: "#EFF6FF", icon: "bicycle",          label: "Assigned"        },
  out_for_delivery: { color: "#0891b2", bg: "#ECFEFF", icon: "navigate",         label: "Out for Delivery"},
  delivered:        { color: "#16a34a", bg: "#F0FDF4", icon: "checkmark-circle", label: "Delivered"       },
};

function SubscriptionCard({ sub }: { sub: any }) {
  const [expanded, setExpanded] = useState(false);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
  };

  const isDelivered = sub.status === "delivered";
  const sc = statusConfig[sub.status] ?? statusConfig["pending"];

  const riderProgress =
    sub.status === "assigned"         ? 0.3 :
    sub.status === "out_for_delivery" ? 0.7 :
    sub.status === "delivered"        ? 1   : 0.1;

  const handleCancel = () => {
    Alert.alert(
      "Cancel Subscription",
      "Are you sure you want to cancel this subscription?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes", style: "destructive",
          onPress: async () => {
            try {
              await api.cancelSubscription(sub.id);
              Alert.alert("Success", "Subscription cancelled");
            } catch (error: any) {
              Alert.alert("Error", error.message);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.ticketWrapper}>
      <View style={styles.perforationTop} />

      <View style={[styles.ticketCard, isDelivered && { opacity: 0.75 }]}>

        {/* ── Tappable Header (always visible) ── */}
        <TouchableOpacity onPress={toggle} activeOpacity={0.7} style={styles.ticketHeader}>
          <View style={styles.headerLeft}>
            {sub.product?.image ? (
              <Image
                source={{ uri: sub.product.image }}
                style={styles.productImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.productIconBox}>
                <Ionicons name="cube-outline" size={18} color={Colors.primary} />
              </View>
            )}
            <View>
              <Text style={styles.productName}>{sub.product?.name}</Text>
              <Text style={styles.ticketId}>#{sub.id?.slice(-6)}</Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            <Text style={styles.price}>₹{sub.product?.price}</Text>
            <View style={[styles.statusPill, { backgroundColor: sc.bg }]}>
              <Ionicons name={sc.icon} size={11} color={sc.color} />
              <Text style={[styles.statusText, { color: sc.color }]}>{sc.label}</Text>
            </View>
            <Ionicons
              name={expanded ? "chevron-up" : "chevron-down"}
              size={15}
              color="#bbb"
              style={{ marginLeft: 4 }}
            />
          </View>
        </TouchableOpacity>

        {/* ── Expanded Content ── */}
        {expanded && (
          <>
            <View style={styles.divider} />

            {/* Progress */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${riderProgress * 100}%` }]} />
              </View>
              <View style={styles.progressLabelRow}>
                {["Pending", "Assigned", "On the Way", "Delivered"].map((step, i) => (
                  <Text
                    key={i}
                    style={[
                      styles.progressStep,
                      riderProgress >= (i + 1) * 0.25 && styles.progressStepActive,
                    ]}
                  >
                    {step}
                  </Text>
                ))}
              </View>
            </View>

            <View style={styles.divider} />

            {/* Details row */}
            <View style={styles.detailsRow}>
              <View style={styles.detailChip}>
                <Ionicons name="repeat-outline" size={13} color="#6366f1" />
                <View>
                  <Text style={styles.smallLabel}>Pattern</Text>
                  <Text style={styles.valueText}>{getPatternLabel(sub.pattern)}</Text>
                </View>
              </View>

              <View style={styles.detailChip}>
                <Ionicons name="layers-outline" size={13} color="#0891b2" />
                <View>
                  <Text style={styles.smallLabel}>Qty</Text>
                  <Text style={styles.valueText}>{sub.quantity}×</Text>
                </View>
              </View>

              <View style={styles.detailChip}>
                <Ionicons name="scale-outline" size={13} color="#d97706" />
                <View>
                  <Text style={styles.smallLabel}>Unit</Text>
                  <Text style={styles.valueText}>{sub.product?.unit}</Text>
                </View>
              </View>
            </View>

            {/* OTP */}
            {sub.delivery_otp && !isDelivered && (
              <>
                <View style={styles.divider} />
                <View style={styles.otpSection}>
                  <Text style={styles.otpLabel}>DELIVERY OTP</Text>
                  <Text style={styles.otpText}>{sub.delivery_otp}</Text>
                </View>
              </>
            )}

            {/* Cancel */}
            {!isDelivered && (
              <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
                <Ionicons name="close-circle-outline" size={16} color={Colors.error} />
                <Text style={styles.cancelText}>Cancel Subscription</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Delivered stamp */}
        {isDelivered && (
          <View style={styles.deliveredStamp}>
            <Text style={styles.deliveredStampText}>DELIVERED</Text>
          </View>
        )}
      </View>

      {isDelivered && <BlurView intensity={30} style={styles.blurOverlay} />}
    </View>
  );
}

export default function SubscriptionsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);

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

  if (loading) return <LoadingScreen />;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>My Subscriptions</Text>
        <Text style={styles.subtitle}>Manage your daily deliveries</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {subscriptions.length > 0 ? (
          subscriptions.map((sub) => <SubscriptionCard key={sub.id} sub={sub} />)
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={60} color={Colors.textLight} />
            <Text style={styles.emptyTitle}>No Active Subscriptions</Text>
            <Text style={styles.emptyText}>Start by adding products from the catalog</Text>
          </View>
        )}
        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingVertical: 16 },
  title: { fontSize: 24, fontWeight: "700", color: Colors.text },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  scrollView: { flex: 1, paddingHorizontal: 20 },

  ticketWrapper: { marginBottom: 24, position: "relative" },
  perforationTop: {
    height: 12, borderTopWidth: 1,
    borderStyle: "dashed", borderColor: "#ccc", marginBottom: -6,
  },
  ticketCard: {
    backgroundColor: "#fff", borderRadius: 20,
    padding: 18, overflow: "hidden",
  },

  /* ── Header ── */
  ticketHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", zIndex: 10 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1, zIndex: 10 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8, zIndex: 10 },
  productImage: {
    width: 44, height: 44, borderRadius: 12,
    borderWidth: 1, borderColor: "#F0F0F0",
  },
  productIconBox: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.primary + "12",
    justifyContent: "center", alignItems: "center",
  },
  productName: { fontSize: 15, fontWeight: "700", color: Colors.text },
  ticketId: { fontSize: 11, color: "#aaa", marginTop: 1 },
  price: { fontSize: 15, fontWeight: "800", color: Colors.primary },
  statusPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20,
  },
  statusText: { fontSize: 10, fontWeight: "700" },

  divider: { height: 1, backgroundColor: "#F5F5F5", marginVertical: 14 },

  /* ── Progress ── */
  progressContainer: {},
  progressBarBg: { height: 6, backgroundColor: "#eee", borderRadius: 10, overflow: "hidden" },
  progressBarFill: { height: 6, backgroundColor: "#22c55e", borderRadius: 10 },
  progressLabelRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  progressStep: { fontSize: 9, color: "#ccc", fontWeight: "600" },
  progressStepActive: { color: "#22c55e" },

  /* ── Details ── */
  detailsRow: { flexDirection: "row", gap: 8 },
  detailChip: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#F8F8F8", borderRadius: 12, padding: 10,
  },
  smallLabel: { fontSize: 10, color: "#aaa", fontWeight: "500" },
  valueText: { fontSize: 13, fontWeight: "700", color: Colors.text, marginTop: 1 },

  /* ── OTP ── */
  otpSection: { alignItems: "center", paddingVertical: 4 },
  otpLabel: { fontSize: 10, color: "#aaa", fontWeight: "700", letterSpacing: 1, marginBottom: 4 },
  otpText: { fontSize: 28, fontWeight: "800", letterSpacing: 6, color: Colors.primary },

  /* ── Cancel ── */
  cancelBtn: {
    marginTop: 14, backgroundColor: "#FEF2F2",
    paddingVertical: 12, borderRadius: 12,
    alignItems: "center", flexDirection: "row",
    justifyContent: "center", gap: 6,
  },
  cancelText: { color: Colors.error, fontWeight: "700", fontSize: 14 },

  /* ── Delivered stamp ── */
  deliveredStamp: {
    position: "absolute", bottom: 0, right: 160,
    backgroundColor: "#22c55e",
    paddingVertical: 5, paddingHorizontal: 12,
    borderRadius: 20, zIndex: 1,
  },
  deliveredStampText: { color: "#fff", fontWeight: "700", fontSize: 9, letterSpacing: 1 },
  blurOverlay: { ...StyleSheet.absoluteFillObject, borderRadius: 20 },

  /* ── Empty ── */
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: Colors.text, marginTop: 16 },
  emptyText: { fontSize: 14, color: Colors.textSecondary, marginTop: 8 },
});