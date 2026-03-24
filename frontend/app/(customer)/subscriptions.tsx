import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Calendar } from "react-native-calendars";
import { api } from "../../src/services/api";
import { Colors } from "../../src/constants/colors";
import Card from "../../src/components/Card";
import Button from "../../src/components/Button";
import LoadingScreen from "../../src/components/LoadingScreen";
import { BlurView } from "expo-blur";

export default function SubscriptionsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [selectedSub, setSelectedSub] = useState<any>(null);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [modifyQuantity, setModifyQuantity] = useState(1);

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

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  const handleCancel = async (subId: string) => {
    Alert.alert(
      "Cancel Subscription",
      "Are you sure you want to cancel this subscription?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes",
          style: "destructive",
          onPress: async () => {
            try {
              await api.cancelSubscription(subId);
              fetchData();
              Alert.alert("Success", "Subscription cancelled");
            } catch (error: any) {
              Alert.alert("Error", error.message);
            }
          },
        },
      ],
    );
  };

  const getPatternLabel = (pattern: string) => {
    switch (pattern) {
      case "daily":
        return "Every day";
      case "alternate":
        return "Alternate days";
      case "custom":
        return "Custom days";
      case "buy_once":
        return "One-time";
      default:
        return pattern;
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>My Subscriptions</Text>
        <Text style={styles.subtitle}>Manage your daily deliveries</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {subscriptions.length > 0 ? (
          subscriptions.map((sub) => {
            const isDelivered = sub.status === "delivered";

            const riderProgress =
              sub.status === "assigned"
                ? 0.3
                : sub.status === "out_for_delivery"
                  ? 0.7
                  : sub.status === "delivered"
                    ? 1
                    : 0.1;

            return (
              <View key={sub.id} style={styles.ticketWrapper}>
                <View style={styles.perforationTop} />

                {/* ── FIXED: blur is now inside ticketCard so it covers only the card ── */}
                <View style={styles.ticketCard}>
                  <View style={[styles.ticketContent, isDelivered && { opacity: 0.45 }]}>
                    <View style={styles.ticketHeader}>
                      <View>
                        <Text style={styles.productName}>
                          {sub.product?.name}
                        </Text>
                        <Text style={styles.ticketId}>#{sub.id?.slice(-6)}</Text>
                      </View>

                      <Text style={styles.price}>₹{sub.product?.price}</Text>
                    </View>

                    <View style={styles.progressContainer}>
                      <View style={styles.progressBarBg}>
                        <View
                          style={[
                            styles.progressBarFill,
                            { width: `${riderProgress * 100}%` },
                          ]}
                        />
                      </View>
                      <Text style={styles.progressLabel}>{sub.status}</Text>
                    </View>

                    <View style={styles.detailsRow}>
                      <View>
                        <Text style={styles.smallLabel}>Pattern</Text>
                        <Text style={styles.valueText}>
                          {getPatternLabel(sub.pattern)}
                        </Text>
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
                        onPress={() => handleCancel(sub.id)}
                      >
                        <Text style={styles.cancelText}>Cancel Subscription</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* ── FIXED: blur + stamp live inside the card with absolute fill ── */}
                  {isDelivered && (
                    <>
                      <BlurView
                        intensity={18}
                        tint="light"
                        style={styles.blurOverlay}
                      />
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
            <Ionicons
              name="calendar-outline"
              size={60}
              color={Colors.textLight}
            />
            <Text style={styles.emptyTitle}>No Active Subscriptions</Text>
            <Text style={styles.emptyText}>
              Start by adding products from the catalog
            </Text>
          </View>
        )}
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

  ticketWrapper: { marginBottom: 30, position: "relative" },

  // ── FIXED: card is now `overflow: hidden` + `position: relative`
  // so absolute children (blur, stamp) are clipped to the card bounds
  ticketCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
    position: "relative",
  },

  // content sits inside ticketCard, gets opacity when delivered
  ticketContent: {
    padding: 18,
  },

  ticketHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  ticketId: { fontSize: 12, color: "#888" },

  productName: { fontSize: 18, fontWeight: "700", color: Colors.text },

  price: { fontSize: 16, fontWeight: "700", color: Colors.primary },

  progressContainer: { marginTop: 15 },

  progressBarBg: {
    height: 6,
    backgroundColor: "#eee",
    borderRadius: 10,
    overflow: "hidden",
  },

  progressBarFill: { height: 6, backgroundColor: "#22c55e" },

  progressLabel: {
    marginTop: 6,
    fontSize: 12,
    color: Colors.textSecondary,
  },

  detailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
  },

  smallLabel: { fontSize: 11, color: "#999" },

  valueText: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 3,
    color: Colors.text,
  },

  otpSection: { marginTop: 18, alignItems: "center" },

  otpText: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 4,
    color: Colors.primary,
  },

  cancelBtn: {
    marginTop: 20,
    backgroundColor: "#ffeaea",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },

  cancelText: { color: Colors.error, fontWeight: "600" },

  // ── FIXED: blur fills the entire card absolutely
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
  },

  // ── FIXED: stamp is centered over the card
  deliveredStampWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },

  deliveredStamp: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#22c55e",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },

  deliveredStampText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
    letterSpacing: 1,
  },

  perforationTop: {
    height: 12,
    borderTopWidth: 1,
    borderStyle: "dashed",
    borderColor: "#ccc",
    marginBottom: -6,
  },

  perforationBottom: {
    height: 12,
    borderBottomWidth: 1,
    borderStyle: "dashed",
    borderColor: "#ccc",
    marginTop: -6,
  },

  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text,
    marginTop: 16,
  },

  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
  },
});