import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView,
  RefreshControl, Alert, TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../src/contexts/AuthContext";
import { api } from "../../src/services/api";
import { Colors } from "../../src/constants/colors";
import Button from "../../src/components/Button";
import LoadingScreen from "../../src/components/LoadingScreen";

export default function DeliveryHome() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkinStatus, setCheckinStatus] = useState<any>(null);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = async () => {
    try {
      const [status, deliveriesData] = await Promise.all([
        api.getCheckinStatus(),
        api.getTodayDeliveries(),
      ]);
      setCheckinStatus(status);
      setDeliveries(deliveriesData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const onRefresh = useCallback(() => { setRefreshing(true); fetchData(); }, []);

  const handleCheckin = async () => {
    setActionLoading(true);
    try {
      await api.checkin();
      setCheckinStatus({
        checked_in: true,
        checked_out: false,
        checkin_time: new Date().toISOString(),
      });
      Alert.alert("✓ Checked In", "Your shift has started. Good luck!");
      setTimeout(() => fetchData(), 2000);
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckout = async () => {
    Alert.alert("End Shift", "Are you sure you want to end your shift?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "End Shift", style: "destructive",
        onPress: async () => {
          setActionLoading(true);
          try {
            await api.checkout();
            setCheckinStatus((prev: any) => ({ ...prev, checked_out: true }));
            Alert.alert("Shift Ended", "Great work today!");
            fetchData();
          } catch (error: any) {
            Alert.alert("Error", error.message);
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  if (loading) return <LoadingScreen />;

  const isOnDuty = checkinStatus?.checked_in && !checkinStatus?.checked_out;
  const completedCount = deliveries.filter(d => d.status === "delivered").length;
  const pendingCount = deliveries.filter(d => d.status !== "delivered").length;

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long", month: "long", day: "numeric",
  });

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.userName}>{user?.name || "Partner"} 👋</Text>
            <Text style={styles.date}>{today}</Text>
          </View>
          <View style={styles.zoneBadge}>
            <Ionicons name="location" size={13} color={Colors.primary} />
            <Text style={styles.zoneText}>{user?.zone || "No Zone"}</Text>
          </View>
        </View>

        {/* ── Shift Card ── */}
        <View style={[styles.shiftCard, isOnDuty ? styles.shiftCardActive : styles.shiftCardIdle]}>
          {/* Status Row */}
          <View style={styles.shiftTop}>
            <View style={styles.shiftStatusRow}>
              <View style={[styles.pulseDot, { backgroundColor: isOnDuty ? '#4ade80' : 'rgba(255,255,255,0.4)' }]} />
              <Text style={styles.shiftStatusText}>
                {isOnDuty ? "On Duty" : "Off Duty"}
              </Text>
            </View>
            {checkinStatus?.checkin_time && (
              <Text style={styles.shiftTime}>
                Since {new Date(checkinStatus.checkin_time).toLocaleTimeString("en-IN", {
                  hour: "2-digit", minute: "2-digit"
                })}
              </Text>
            )}
          </View>

          <Text style={styles.shiftTitle}>
            {isOnDuty ? "You're clocked in" : "Ready to start?"}
          </Text>
          <Text style={styles.shiftSubtitle}>
            {isOnDuty
              ? `${pendingCount} deliveries remaining`
              : "Tap below to begin your shift"}
          </Text>

          <TouchableOpacity
            style={styles.shiftBtn}
            onPress={isOnDuty ? handleCheckout : handleCheckin}
            disabled={actionLoading}
          >
            <Ionicons
              name={isOnDuty ? "log-out-outline" : "play-circle-outline"}
              size={18}
              color={isOnDuty ? "#ef4444" : Colors.primary}
            />
            <Text style={[styles.shiftBtnText, { color: isOnDuty ? "#ef4444" : Colors.primary }]}>
              {actionLoading ? "Please wait..." : isOnDuty ? "End Shift" : "Start Shift"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Stats ── */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: '#EEF4FF' }]}>
            <View style={[styles.statIcon, { backgroundColor: '#4F7EFF20' }]}>
              <Ionicons name="cube-outline" size={18} color="#4F7EFF" />
            </View>
            <Text style={[styles.statVal, { color: '#4F7EFF' }]}>{deliveries.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#F0FDF4' }]}>
            <View style={[styles.statIcon, { backgroundColor: '#22c55e20' }]}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#22c55e" />
            </View>
            <Text style={[styles.statVal, { color: '#22c55e' }]}>{completedCount}</Text>
            <Text style={styles.statLabel}>Delivered</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#FFFBEB' }]}>
            <View style={[styles.statIcon, { backgroundColor: '#f59e0b20' }]}>
              <Ionicons name="time-outline" size={18} color="#f59e0b" />
            </View>
            <Text style={[styles.statVal, { color: '#f59e0b' }]}>{pendingCount}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>

        {/* ── Progress Bar ── */}
        {deliveries.length > 0 && (
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>Today's Progress</Text>
              <Text style={styles.progressPercent}>
                {Math.round((completedCount / deliveries.length) * 100)}%
              </Text>
            </View>
            <View style={styles.progressBg}>
              <View style={[
                styles.progressFill,
                { width: `${(completedCount / deliveries.length) * 100}%` }
              ]} />
            </View>
            <Text style={styles.progressSub}>
              {completedCount} of {deliveries.length} deliveries completed
            </Text>
          </View>
        )}

        {/* ── Guidelines ── */}
        <View style={styles.guidelinesCard}>
          <Text style={styles.guidelinesTitle}>Delivery Guidelines</Text>

          {[
            { icon: "time-outline",        color: "#4F7EFF", text: "Delivery window: 5:00 AM – 7:00 AM" },
            { icon: "volume-mute-outline", color: "#f59e0b", text: "Silent delivery — don't ring doorbell" },
            { icon: "camera-outline",      color: "#22c55e", text: "Take photo proof of delivery" },
          ].map((item, i) => (
            <View key={i} style={styles.guidelineRow}>
              <View style={[styles.guidelineIcon, { backgroundColor: item.color + '18' }]}>
                <Ionicons name={item.icon as any} size={15} color={item.color} />
              </View>
              <Text style={styles.guidelineText}>{item.text}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F7F4' },

  /* ── Header ── */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 16,
  },
  greeting: { fontSize: 13, color: '#aaa', fontWeight: '500' },
  userName: { fontSize: 22, fontWeight: '800', color: '#1A1A1A', letterSpacing: -0.3 },
  date: { fontSize: 12, color: '#bbb', marginTop: 3 },
  zoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  zoneText: { fontSize: 12, fontWeight: '700', color: Colors.primary },

  /* ── Shift Card ── */
  shiftCard: {
    marginHorizontal: 20,
    borderRadius: 22,
    padding: 22,
    marginBottom: 16,
    shadowOpacity: 0.2,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  shiftCardActive: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
  },
  shiftCardIdle: {
    backgroundColor: '#1A1A1A',
    shadowColor: '#000',
  },
  shiftTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  shiftStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  pulseDot: { width: 8, height: 8, borderRadius: 4 },
  shiftStatusText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.8)' },
  shiftTime: { fontSize: 12, color: 'rgba(255,255,255,0.55)', fontWeight: '500' },
  shiftTitle: { fontSize: 24, fontWeight: '800', color: '#fff', letterSpacing: -0.4, marginBottom: 4 },
  shiftSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginBottom: 20 },
  shiftBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 13,
  },
  shiftBtnText: { fontSize: 15, fontWeight: '700' },

  /* ── Stats ── */
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  statIcon: {
    width: 34, height: 34, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 4,
  },
  statVal: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  statLabel: { fontSize: 11, color: '#888', fontWeight: '600' },

  /* ── Progress ── */
  progressCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  progressPercent: { fontSize: 14, fontWeight: '800', color: Colors.primary },
  progressBg: {
    height: 8, backgroundColor: '#F0F0F0',
    borderRadius: 4, overflow: 'hidden', marginBottom: 8,
  },
  progressFill: {
    height: 8, backgroundColor: '#22c55e', borderRadius: 4,
  },
  progressSub: { fontSize: 12, color: '#aaa', fontWeight: '500' },

  /* ── Guidelines ── */
  guidelinesCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 18,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  guidelinesTitle: {
    fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginBottom: 14,
  },
  guidelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  guidelineIcon: {
    width: 32, height: 32, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  guidelineText: { fontSize: 13, color: '#555', fontWeight: '500', flex: 1 },
});