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
  LayoutAnimation,
  Platform,
  UIManager,
  Easing,
} from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../src/services/api";
import { Colors } from "../../src/constants/colors";
import LoadingScreen from "../../src/components/LoadingScreen";
import { BlurView } from "expo-blur";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
const formatTime = (iso: string) => {
  if (!iso) return "";
  try {
    const dateStr = iso.endsWith("Z") || iso.includes("+") ? iso : iso + "Z";
    return new Date(dateStr).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    });
  } catch {
    return "";
  }
};

const getPatternLabel = (p: string) => {
  const map: Record<string, string> = {
    daily: "Every day",
    alternate: "Alternate days",
    custom: "Custom days",
    buy_once: "One-time",
  };
  return map[p] || p;
};

const STATUS_META: Record<
  string,
  { label: string; color: string; icon: string; step: number }
> = {
  no_order: {
    label: "Not scheduled",
    color: "#9ca3af",
    icon: "ellipse-outline",
    step: 0,
  },
  unassigned: {
    label: "Pending",
    color: "#f59e0b",
    icon: "time-outline",
    step: 1,
  },
  assigned: {
    label: "Rider assigned",
    color: "#3b82f6",
    icon: "bicycle-outline",
    step: 2,
  },
  out_for_delivery: {
    label: "On the way",
    color: "#8b5cf6",
    icon: "navigate-outline",
    step: 3,
  },
  delivered: {
    label: "Delivered",
    color: "#22c55e",
    icon: "checkmark-circle",
    step: 4,
  },
  cancelled: {
    label: "Cancelled",
    color: "#ef4444",
    icon: "close-circle-outline",
    step: 0,
  },
  skipped: {
    label: "Skipped",
    color: "#9ca3af",
    icon: "skip-forward-outline",
    step: 0,
  },
};

const getMeta = (status: string) =>
  STATUS_META[status] || STATUS_META["unassigned"];

// ─── Status Summary Bar ────────────────────────────────────────────────────────
function StatusSummaryBar({ subscriptions }: { subscriptions: any[] }) {
  const counts: Record<string, number> = {};
  subscriptions.forEach((s) => {
    const key = s.status || "unassigned";
    counts[key] = (counts[key] || 0) + 1;
  });

  const pills = Object.entries(counts).map(([status, count]) => ({
    status,
    count,
    ...getMeta(status),
  }));

  if (pills.length === 0) return null;

  return (
    <View style={sb.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={sb.row}
      >
        <View
          style={[
            sb.pill,
            { backgroundColor: "#f3f4f6", borderColor: "#e5e7eb" },
          ]}
        >
          <Ionicons name="layers-outline" size={13} color="#374151" />
          <Text style={[sb.pillCount, { color: "#374151" }]}>
            {subscriptions.length}
          </Text>
          <Text style={[sb.pillLabel, { color: "#6b7280" }]}>Total</Text>
        </View>
        {pills.map(({ status, count, label, color, icon }) => (
          <View
            key={status}
            style={[
              sb.pill,
              { backgroundColor: color + "14", borderColor: color + "40" },
            ]}
          >
            <Ionicons name={icon as any} size={13} color={color} />
            <Text style={[sb.pillCount, { color }]}>{count}</Text>
            <Text style={[sb.pillLabel, { color: color + "cc" }]}>{label}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const sb = StyleSheet.create({
  wrap: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    paddingVertical: 10,
  },
  row: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  pillCount: { fontSize: 14, fontWeight: "800" },
  pillLabel: { fontSize: 11, fontWeight: "600" },
});

// ─── Progress Steps ────────────────────────────────────────────────────────────
const STEPS = ["Placed", "Assigned", "On way", "Delivered"];

function DeliveryProgress({ status }: { status: string }) {
  const meta = getMeta(status);
  if (["no_order", "cancelled", "skipped"].includes(status)) return null;

  return (
    <View style={pg.wrap}>
      {STEPS.map((label, i) => {
        const done = meta.step > i;
        const active = meta.step === i + 1;
        const dotColor = done || active ? meta.color : "#e5e7eb";
        return (
          <React.Fragment key={label}>
            <View style={pg.step}>
              <View
                style={[
                  pg.dot,
                  { backgroundColor: dotColor, borderColor: dotColor },
                ]}
              >
                {done && <Ionicons name="checkmark" size={9} color="#fff" />}
                {active && <View style={pg.activePulse} />}
              </View>
              <Text
                style={[
                  pg.label,
                  (done || active) && { color: meta.color, fontWeight: "700" },
                ]}
              >
                {label}
              </Text>
            </View>
            {i < STEPS.length - 1 && (
              <View
                style={[
                  pg.line,
                  { backgroundColor: done ? meta.color : "#e5e7eb" },
                ]}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const pg = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 12,
    marginBottom: 4,
  },
  step: { alignItems: "center", gap: 4 },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  activePulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fff",
  },
  label: {
    fontSize: 9,
    color: "#9ca3af",
    fontWeight: "500",
    textAlign: "center",
    width: 46,
  },
  line: { flex: 1, height: 2, marginTop: 9, borderRadius: 2 },
});

// ─── Confirm Modal ─────────────────────────────────────────────────────────────
function ConfirmModal({
  visible,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const iconAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
      iconAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          damping: 15,
          stiffness: 200,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() =>
        Animated.spring(iconAnim, {
          toValue: 1,
          useNativeDriver: true,
          damping: 8,
          stiffness: 180,
        }).start(),
      );
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={ms.overlay}>
        <Animated.View
          style={[
            ms.card,
            { opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          <Animated.View
            style={[ms.iconWrap, { transform: [{ scale: iconAnim }] }]}
          >
            <View style={ms.iconCircleRed}>
              <Ionicons name="close" size={30} color="#ef4444" />
            </View>
          </Animated.View>
          <Text style={ms.title}>Cancel Subscription?</Text>
          <Text style={ms.subtitle}>
            This will stop your daily delivery.{"\n"}This action cannot be
            undone.
          </Text>
          <View style={ms.warningPill}>
            <Ionicons name="warning-outline" size={13} color="#f59e0b" />
            <Text style={ms.warningText}>
              You won't be charged for future deliveries
            </Text>
          </View>
          <View style={ms.btnRow}>
            <TouchableOpacity
              style={ms.btnSecondary}
              onPress={onCancel}
              activeOpacity={0.8}
            >
              <Text style={ms.btnSecondaryText}>Keep it</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={ms.btnDanger}
              onPress={onConfirm}
              activeOpacity={0.8}
            >
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
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.8);
      opacityAnim.setValue(0);
      checkScale.setValue(0);
      slideAnim.setValue(20);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          damping: 14,
          stiffness: 180,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        Animated.spring(checkScale, {
          toValue: 1,
          useNativeDriver: true,
          damping: 8,
          stiffness: 220,
        }).start();
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 16,
          stiffness: 160,
        }).start();
      });
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={ms.overlay}>
        <Animated.View
          style={[
            ms.card,
            { opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          <Animated.View
            style={[ms.iconWrap, { transform: [{ scale: checkScale }] }]}
          >
            <View style={ms.iconCircleGreen}>
              <Ionicons name="checkmark" size={30} color="#22c55e" />
            </View>
          </Animated.View>
          <Text style={ms.title}>Subscription Cancelled</Text>
          <Animated.View
            style={{
              opacity: opacityAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
            <Text style={ms.subtitle}>
              Your subscription has been{"\n"}successfully cancelled.
            </Text>
            <View style={ms.infoPill}>
              <Ionicons
                name="information-circle-outline"
                size={13}
                color={Colors.primary}
              />
              <Text style={ms.infoText}>
                No further deliveries will be scheduled
              </Text>
            </View>
          </Animated.View>
          <TouchableOpacity
            style={ms.btnPrimary}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Text style={ms.btnPrimaryText}>Got it</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

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

// ─── Floating OTP Pill ─────────────────────────────────────────────────────────
// Tapping it animates "flying down" then scrolls to the large OTP block
function FloatingOTPPill({
  otp,
  color,
  onPress,
}: {
  otp: string;
  color: string;
  onPress: () => void;
}) {
  const translateY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Vibration.vibrate(30);
    Animated.sequence([
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 60,
          duration: 260,
          easing: Easing.out(Easing.back(1.4)),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1.18,
          duration: 130,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.6,
          duration: 130,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 12,
          stiffness: 200,
        }),
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          damping: 12,
          stiffness: 200,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 120,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
    // Call parent scroll handler
    setTimeout(onPress, 180);
  };

  return (
    <Animated.View
      style={[
        fp.container,
        {
          borderColor: color + "40",
          backgroundColor: color + "10",
          transform: [{ translateY }, { scale }],
          opacity,
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handlePress}
        style={fp.inner}
      >
        <Ionicons name="lock-closed-outline" size={11} color={color} />
        <Text style={[fp.label, { color }]}>OTP</Text>
        <Text style={[fp.value, { color }]}>{otp}</Text>
        <Ionicons name="arrow-down-outline" size={11} color={color} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const fp = StyleSheet.create({
  container: { borderWidth: 1.5, borderRadius: 14, overflow: "hidden" },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  label: { fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },
  value: { fontSize: 18, fontWeight: "900", letterSpacing: 3 },
});

// ─── OTP Block with entrance animation ────────────────────────────────────────
function OTPBlockAnimated({ otp, color }: { otp: string; color: string }) {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        damping: 10,
        stiffness: 200,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 900,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    });
  }, []);

  const digitScale = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.05],
  });

  return (
    <Animated.View
      style={[
        ob.wrap,
        {
          borderColor: color + "30",
          backgroundColor: color + "08",
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <Text style={[ob.label, { color }]}>🔐 Delivery OTP</Text>
      <Animated.Text
        style={[ob.value, { color, transform: [{ scale: digitScale }] }]}
      >
        {otp}
      </Animated.Text>
      <Text style={ob.hint}>Share this with your delivery partner</Text>
    </Animated.View>
  );
}

const ob = StyleSheet.create({
  wrap: {
    borderWidth: 1.5,
    borderRadius: 16,
    alignItems: "center",
    paddingVertical: 16,
    marginTop: 10,
    marginBottom: 12,
  },
  label: { fontSize: 12, fontWeight: "700", marginBottom: 6 },
  value: { fontSize: 38, fontWeight: "900", letterSpacing: 8 },
  hint: { fontSize: 11, color: "#9ca3af", marginTop: 6 },
});

// ─── Subscription Card ─────────────────────────────────────────────────────────
function SubscriptionCard({
  sub,
  onCancelPress,
  onScrollToOTP,
}: {
  sub: any;
  onCancelPress: (id: string) => void;
  onScrollToOTP: (offsetY: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const chevronAnim = useRef(new Animated.Value(0)).current;
  const cardScaleAnim = useRef(new Animated.Value(1)).current;
  const cardRef = useRef<View>(null);
  const otpBlockRef = useRef<View>(null);
  const [otpLocalY, setOtpLocalY] = useState(0);

  const toggle = () => {
    const toValue = expanded ? 0 : 1;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    // Card press bounce
    Animated.sequence([
      Animated.timing(cardScaleAnim, {
        toValue: 0.985,
        duration: 80,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
      Animated.spring(cardScaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        damping: 12,
        stiffness: 300,
      }),
    ]).start();

    setExpanded((prev) => !prev);
    Animated.timing(chevronAnim, {
      toValue,
      duration: 220,
      useNativeDriver: true,
    }).start();
  };

  const isDelivered = sub.status === "delivered";
  const isCancelled = sub.status === "cancelled";
  const meta = getMeta(sub.status);

  // ── Admin name — now populated by backend fix ───────────────────────────────
  const adminName = sub.admin_name || `Store ${sub.admin_id?.slice(-4) || ""}`;

  const chevronRotate = chevronAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const handleOTPPillPress = () => {
    // Measure the card's position in the scroll view, add local OTP block offset
    if (cardRef.current) {
      cardRef.current.measureInWindow((_x, y) => {
        // otpLocalY is the OTP block's Y inside the card
        onScrollToOTP(y + otpLocalY - 100);
      });
    }
  };

  return (
    <Animated.View
      ref={cardRef as any}
      style={[
        cd.wrapper,
        isCancelled && { opacity: 0.65 },
        { transform: [{ scale: cardScaleAnim }] },
      ]}
    >
      {/* ── Top row ── */}
      <TouchableOpacity activeOpacity={0.9} onPress={toggle} style={cd.top}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <Text style={cd.productName} numberOfLines={1}>
            {sub.product?.name || "Product"}
          </Text>
          <View style={cd.storePill}>
            <Ionicons name="storefront-outline" size={12} color="#6366f1" />
            <Text style={cd.storeName} numberOfLines={1}>
              {adminName}
            </Text>
          </View>
          <View
            style={[
              cd.statusBadge,
              {
                backgroundColor: meta.color + "15",
                borderColor: meta.color + "40",
              },
            ]}
          >
            <View style={[cd.statusDot, { backgroundColor: meta.color }]} />
            <Text style={[cd.statusText, { color: meta.color }]}>
              {meta.label}
            </Text>
          </View>
        </View>

        <View style={{ alignItems: "flex-end", gap: 8 }}>
          {sub.delivery_otp && !isDelivered && !isCancelled ? (
            <FloatingOTPPill
              otp={sub.delivery_otp}
              color={Colors.primary}
              onPress={handleOTPPillPress}
            />
          ) : isDelivered ? (
            <View style={cd.deliveredBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#22c55e" />
              <Text style={cd.deliveredBadgeText}>Done</Text>
            </View>
          ) : null}

          <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
            <Ionicons name="chevron-down" size={18} color="#9ca3af" />
          </Animated.View>
        </View>
      </TouchableOpacity>

      {/* Dashed separator */}
      <View style={cd.dashed} />

      {/* ── Expanded ── */}
      {expanded && (
        <View style={cd.expanded}>
          <DeliveryProgress status={sub.status} />

          <View style={cd.grid}>
            <View style={cd.gridCell}>
              <Text style={cd.gridLabel}>Pattern</Text>
              <Text style={cd.gridValue}>{getPatternLabel(sub.pattern)}</Text>
            </View>
            <View style={cd.gridCell}>
              <Text style={cd.gridLabel}>Quantity</Text>
              <Text style={cd.gridValue}>{sub.quantity}×</Text>
            </View>
            <View style={cd.gridCell}>
              <Text style={cd.gridLabel}>Unit</Text>
              <Text style={cd.gridValue}>{sub.product?.unit || "—"}</Text>
            </View>
            <View style={cd.gridCell}>
              <Text style={cd.gridLabel}>Price</Text>
              <Text style={[cd.gridValue, { color: Colors.primary }]}>
                ₹{sub.product?.price}
              </Text>
            </View>
          </View>

          <View style={cd.storeRow}>
            <View style={cd.storeRowLeft}>
              <View style={cd.storeIconWrap}>
                <Ionicons name="storefront" size={16} color="#6366f1" />
              </View>
              <View>
                <Text style={cd.storeRowLabel}>Fulfilled by</Text>
                <Text style={cd.storeRowValue}>{adminName}</Text>
              </View>
            </View>
            {sub.created_at ? (
              <View style={{ alignItems: "flex-end" }}>
                <Text style={cd.storeRowLabel}>Ordered</Text>
                <Text style={cd.storeRowValue}>
                  {formatTime(sub.created_at)}
                </Text>
              </View>
            ) : null}
          </View>

          {sub.start_date && (
            <View style={cd.dateRow}>
              <Ionicons name="calendar-outline" size={13} color="#9ca3af" />
              <Text style={cd.dateText}>
                Starts {sub.start_date}
                {sub.end_date && sub.end_date !== sub.start_date
                  ? `  →  Ends ${sub.end_date}`
                  : ""}
              </Text>
            </View>
          )}

          <View style={cd.dateRow}>
            <Ionicons name="receipt-outline" size={13} color="#9ca3af" />
            <Text style={cd.dateText}>Order #{sub.id?.slice(-8)}</Text>
          </View>

          {/* ── Large OTP block — scroll target ── */}
          {sub.delivery_otp && !isDelivered && !isCancelled && (
            <View
              ref={otpBlockRef}
              onLayout={(e) => {
                // Safe null check for New Architecture (Fabric)
                const layout = e?.nativeEvent?.layout;
                if (layout) setOtpLocalY(layout.y);
              }}
            >
              <OTPBlockAnimated otp={sub.delivery_otp} color={Colors.primary} />
            </View>
          )}

          {!isDelivered && !isCancelled && (
            <TouchableOpacity
              style={cd.cancelBtn}
              onPress={() => onCancelPress(sub.id)}
              activeOpacity={0.8}
            >
              <Ionicons name="close-circle-outline" size={15} color="#ef4444" />
              <Text style={cd.cancelText}>Cancel Subscription</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {isDelivered && (
        <>
          <BlurView
            intensity={8}
            tint="light"
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <View style={cd.deliveredStamp} pointerEvents="none">
            <Ionicons name="checkmark-circle" size={15} color="#fff" />
            <Text style={cd.deliveredStampText}>DELIVERED</Text>
          </View>
        </>
      )}
    </Animated.View>
  );
}

const cd = StyleSheet.create({
  wrapper: {
    backgroundColor: "#fff",
    borderRadius: 20,
    marginBottom: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
    position: "relative",
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  productName: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111",
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  storePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#eef2ff",
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 4,
    alignSelf: "flex-start",
    marginBottom: 6,
  },
  storeName: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6366f1",
    maxWidth: 160,
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
  statusText: { fontSize: 11, fontWeight: "700" },
  deliveredBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f0fdf4",
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  deliveredBadgeText: { fontSize: 11, fontWeight: "700", color: "#22c55e" },
  dashed: {
    height: 1,
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginHorizontal: 16,
  },
  expanded: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 12 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: "#f9fafb",
    borderRadius: 14,
    padding: 12,
    marginTop: 14,
    marginBottom: 12,
  },
  gridCell: { width: "50%", paddingVertical: 6, paddingHorizontal: 4 },
  gridLabel: {
    fontSize: 10,
    color: "#9ca3af",
    fontWeight: "600",
    marginBottom: 2,
  },
  gridValue: { fontSize: 15, fontWeight: "800", color: "#111" },
  storeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f5f3ff",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  storeRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  storeIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#ede9fe",
    justifyContent: "center",
    alignItems: "center",
  },
  storeRowLabel: { fontSize: 10, color: "#9ca3af", fontWeight: "600" },
  storeRowValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111",
    marginTop: 1,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  dateText: { fontSize: 12, color: "#6b7280" },
  cancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#fef2f2",
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fecaca",
    marginTop: 4,
  },
  cancelText: { color: "#ef4444", fontWeight: "700", fontSize: 14 },
  deliveredStamp: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#22c55e",
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  deliveredStampText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 11,
    letterSpacing: 0.8,
  },
});

// ─── Card entrance animation wrapper ──────────────────────────────────────────
function CardEntrance({
  children,
  delay,
}: {
  children: React.ReactNode;
  delay: number;
}) {
  const translateY = useRef(new Animated.Value(28)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 14,
          stiffness: 140,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function SubscriptionsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [pendingSubId, setPendingSubId] = useState<string | null>(null);
  const isFocused = useIsFocused();

  const scrollRef = useRef<ScrollView>(null);

  // Header entrance
  const headerAnim = useRef(new Animated.Value(-24)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;

// Animation — runs once on mount (keep as-is)
useEffect(() => {
  Animated.parallel([
    Animated.spring(headerAnim, {
      toValue: 0,
      useNativeDriver: true,
      damping: 14,
      stiffness: 160,
    }),
    Animated.timing(headerOpacity, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }),
  ]).start();
}, []);

// Auto-refresh — separate effect
useEffect(() => {
  if (!isFocused) return;

  fetchData();
  const interval = setInterval(() => {
    fetchData();
  }, 2000);

  return () => clearInterval(interval);
}, [isFocused]);

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
    } catch (err: any) {
      console.error("Cancel failed:", err.message);
    } finally {
      setPendingSubId(null);
    }
  };

  // Called by OTP pill — scroll to the OTP block position in the window
  const handleScrollToOTP = (windowY: number) => {
    // windowY is already the absolute screen Y of the OTP block
    // We convert to scroll offset by using the scroll view's own position
    scrollRef.current?.scrollTo({
      y: Math.max(0, windowY - 80),
      animated: true,
    });
  };

  if (loading) return <LoadingScreen />;

  return (
    <SafeAreaView style={sc.container} edges={["top"]}>
      {/* Header */}
      <Animated.View
        style={[
          sc.header,
          { transform: [{ translateY: headerAnim }], opacity: headerOpacity },
        ]}
      >
        <View>
          <Text style={sc.title}>My Orders</Text>
          <Text style={sc.subtitle}>
            {subscriptions.length} subscription
            {subscriptions.length !== 1 ? "s" : ""}
          </Text>
        </View>
        <View style={sc.headerIcon}>
          <Ionicons name="receipt-outline" size={20} color={Colors.primary} />
        </View>
      </Animated.View>

      {/* Status bar */}
      <StatusSummaryBar subscriptions={subscriptions} />

      {/* Hint */}
      {subscriptions.length > 0 && (
        <View style={sc.hint}>
          <Ionicons name="hand-right-outline" size={12} color="#9ca3af" />
          <Text style={sc.hintText}>
            Tap OTP badge to jump to it • Tap card for details
          </Text>
        </View>
      )}

      {/* List */}
      <ScrollView
        ref={scrollRef}
        style={sc.scroll}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 40,
          paddingTop: 8,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {subscriptions.length > 0 ? (
          subscriptions.map((sub, index) => (
            <CardEntrance key={sub.id} delay={index * 55}>
              <SubscriptionCard
                sub={sub}
                onCancelPress={handleCancelPress}
                onScrollToOTP={handleScrollToOTP}
              />
            </CardEntrance>
          ))
        ) : (
          <View style={sc.empty}>
            <View style={sc.emptyIcon}>
              <Ionicons
                name="calendar-outline"
                size={40}
                color={Colors.primary}
              />
            </View>
            <Text style={sc.emptyTitle}>No Active Subscriptions</Text>
            <Text style={sc.emptyText}>
              Start by adding products from the catalog
            </Text>
          </View>
        )}
      </ScrollView>

      <ConfirmModal
        visible={confirmVisible}
        onConfirm={handleConfirmCancel}
        onCancel={() => {
          setConfirmVisible(false);
          setPendingSubId(null);
        }}
      />
      <SuccessModal
        visible={successVisible}
        onClose={() => setSuccessVisible(false)}
      />
    </SafeAreaView>
  );
}

const sc = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F6FA" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
    backgroundColor: "#F4F6FA",
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#111",
    letterSpacing: -0.5,
  },
  subtitle: { fontSize: 13, color: "#9ca3af", marginTop: 2, fontWeight: "500" },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.primary + "15",
    justifyContent: "center",
    alignItems: "center",
  },
  hint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: "#F4F6FA",
  },
  hintText: { fontSize: 12, color: "#9ca3af" },
  scroll: { flex: 1 },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: Colors.primary + "12",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
    marginBottom: 6,
  },
  emptyText: { fontSize: 14, color: "#9ca3af", textAlign: "center" },
});
