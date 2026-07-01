import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Modal,
  Image,
  Animated,
  Vibration,
  Easing,
  KeyboardAvoidingView,  // ← ADD
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Sharing from "expo-sharing";
import { api } from "../../src/services/api";
import { Colors } from "../../src/constants/colors";
import LoadingScreen from "../../src/components/LoadingScreen";
import Button from "../../src/components/Button";

const quickAmounts = [100, 200, 500, 1000];
const MIN_AMOUNT = 100;
const MAX_AMOUNT = 99999;

function getFileCacheDir(): string {
  try {
    const FS = require("expo-file-system");
    return (
      FS.cacheDirectory ??
      FS.documentDirectory ??
      FS.Dirs?.Cache ??
      FS.Dirs?.Document ??
      ""
    );
  } catch {
    return "";
  }
}

async function writeBase64File(uri: string, base64: string) {
  const FS = require("expo-file-system");
  if (typeof FS.writeAsStringAsync === "function") {
    await FS.writeAsStringAsync(uri, base64, {
      encoding: FS.EncodingType?.Base64 ?? "base64",
    });
    return;
  }
  if (typeof FS.File === "function") {
    const file = new FS.File(uri);
    await file.write(base64, { encoding: "base64" });
  }
}

// ─── Limit Toast 
type ToastType = "min" | "max" | null;

function LimitToast({ type }: { type: ToastType }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-10)).current;

  useEffect(() => {
    if (type) {
      Animated.parallel([
        Animated.spring(fadeAnim, {
          toValue: 1,
          useNativeDriver: true,
          speed: 20,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          speed: 20,
        }),
      ]).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
      slideAnim.setValue(-10);
    }
  }, [type]);

  if (!type) return null;
  const isMin = type === "min";

  return (
    <Animated.View
      style={[
        styles.toast,
        isMin ? styles.toastMin : styles.toastMax,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <View
        style={[
          styles.toastIcon,
          isMin ? styles.toastIconMin : styles.toastIconMax,
        ]}
      >
        <Ionicons
          name={isMin ? "arrow-up-circle" : "warning"}
          size={15}
          color={isMin ? "#f59e0b" : "#ef4444"}
        />
      </View>
      <View>
        <Text style={styles.toastTitle}>
          {isMin ? "Minimum Amount" : "Maximum Amount"}
        </Text>
        <Text style={styles.toastSub}>
          {isMin
            ? `Enter at least ₹${MIN_AMOUNT}`
            : `Cannot exceed ₹${MAX_AMOUNT.toLocaleString("en-IN")}`}
        </Text>
      </View>
    </Animated.View>
  );
}

// ─── Particle 
const PARTICLE_COLORS = [
  "#22c55e",
  "#4ade80",
  Colors.primary,
  "#86efac",
  "#bbf7d0",
  "#fff",
];

function Particle({ delay, color }: { delay: number; color: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  const angle = useRef(Math.random() * Math.PI * 2).current;
  const distance = useRef(60 + Math.random() * 60).current;
  const size = useRef(5 + Math.random() * 6).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.timing(anim, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{
        position: "absolute",
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity: anim.interpolate({
          inputRange: [0, 0.6, 1],
          outputRange: [0, 1, 0],
        }),
        transform: [
          {
            translateX: anim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, Math.cos(angle) * distance],
            }),
          },
          {
            translateY: anim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, Math.sin(angle) * distance],
            }),
          },
        ],
      }}
    />
  );
}

// ─── Success Modal 
function SuccessModal({
  visible,
  amount,
  newBalance,
  onClose,
}: {
  visible: boolean;
  amount: number;
  newBalance: number;
  onClose: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0)).current;
  const checkOpacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.5)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const amountAnim = useRef(new Animated.Value(0)).current;
  const [showParticles, setShowParticles] = useState(false);

  useEffect(() => {
    if (visible) {
      setShowParticles(false);
      scaleAnim.setValue(0.7);
      opacityAnim.setValue(0);
      checkScale.setValue(0);
      checkOpacity.setValue(0);
      ringScale.setValue(0.5);
      ringOpacity.setValue(0);
      amountAnim.setValue(0);

      // Card entrance
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          damping: 14,
          stiffness: 180,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowParticles(true);
        // Ring pulse
        Animated.parallel([
          Animated.spring(ringScale, {
            toValue: 1,
            useNativeDriver: true,
            damping: 10,
            stiffness: 200,
          }),
          Animated.timing(ringOpacity, {
            toValue: 0.25,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
        // Checkmark pop
        Animated.spring(checkScale, {
          toValue: 1,
          useNativeDriver: true,
          damping: 8,
          stiffness: 220,
        }).start();
        Animated.timing(checkOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
        // Amount slide up
        Animated.spring(amountAnim, {
          toValue: 1,
          useNativeDriver: true,
          damping: 16,
          stiffness: 160,
        }).start();
      });
    }
  }, [visible]);

  const particles = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
    delay: i * 30,
  }));

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={ss.overlay}>
        <Animated.View
          style={[
            ss.card,
            { opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          {/* Icon + particles */}
          <View style={ss.iconWrap}>
            <Animated.View
              style={[
                ss.ring,
                { opacity: ringOpacity, transform: [{ scale: ringScale }] },
              ]}
            />
            <View style={ss.iconCircle}>
              {showParticles &&
                particles.map((p) => (
                  <Particle key={p.id} delay={p.delay} color={p.color} />
                ))}
              <Animated.View
                style={{
                  opacity: checkOpacity,
                  transform: [{ scale: checkScale }],
                }}
              >
                <Ionicons name="checkmark" size={42} color="#fff" />
              </Animated.View>
            </View>
          </View>

          {/* Text */}
          <Text style={ss.title}>Request Submitted!</Text>
          <Text style={ss.subtitle}>Your wallet will update after admin approval</Text>

          {/* Amount chip */}
          <Animated.View
            style={[
              ss.amountChip,
              {
                opacity: amountAnim,
                transform: [
                  {
                    translateY: amountAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [16, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={ss.amountLabel}>Amount Requested</Text>
            <Text style={ss.amountValue}>+₹{amount.toFixed(2)}</Text>
          </Animated.View>

          {/* New balance */}
          <Animated.View
            style={[
              ss.balanceRow,
              {
                opacity: amountAnim,
                transform: [
                  {
                    translateY: amountAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [12, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Ionicons name="wallet-outline" size={14} color="#888" />
            <Text style={ss.balanceText}>Available Balance</Text>
            <Text style={ss.balanceValue}>₹{newBalance.toFixed(2)}</Text>
          </Animated.View>

          {/* Done button */}
          <TouchableOpacity
            style={ss.btn}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Text style={ss.btnText}>Done</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const ss = StyleSheet.create({
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
    paddingHorizontal: 28,
    paddingTop: 36,
    paddingBottom: 28,
    width: "100%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 12 },
    elevation: 16,
  },
  iconWrap: {
    width: 110,
    height: 110,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 22,
  },
  ring: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#22c55e",
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#22c55e",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#22c55e",
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111",
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: "#999",
    fontWeight: "500",
    marginBottom: 24,
  },
  amountChip: {
    backgroundColor: "#f0fdf4",
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 14,
    alignItems: "center",
    width: "100%",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  amountLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#86efac",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 32,
    fontWeight: "900",
    color: "#16a34a",
    letterSpacing: -1,
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fafafa",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    width: "100%",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  balanceText: {
    flex: 1,
    fontSize: 13,
    color: "#888",
    fontWeight: "500",
  },
  balanceValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1A1A1A",
  },
  btn: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 15,
    width: "100%",
    alignItems: "center",
    shadowColor: Colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  btnText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.2,
  },
});

// ─── Main Screen 
export default function WalletScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [rechargeRequests, setRechargeRequests] = useState<any[]>([]);
  const [paymentQr, setPaymentQr] = useState<any>(null);
  const [qrPreviewVisible, setQrPreviewVisible] = useState(false);
  const [downloadingQr, setDownloadingQr] = useState(false);
  const [rechargeModal, setRechargeModal] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState("");
  const [reference, setReference] = useState("");
  const [recharging, setRecharging] = useState(false);
  const [toast, setToast] = useState<ToastType>(null);
  const [successVisible, setSuccessVisible] = useState(false);
  const [successAmount, setSuccessAmount] = useState(0);

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerShake = () => {
    shakeAnim.setValue(0);
    Vibration.vibrate([0, 40, 30, 40]);
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 8,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -8,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 4,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const showToast = (type: ToastType) => {
    setToast(type);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  };

  const handleAmountChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, "");
    const numeric = parseInt(cleaned, 10);
    if (cleaned === "" || isNaN(numeric)) {
      setRechargeAmount("");
      setToast(null);
      return;
    }
    if (numeric > MAX_AMOUNT) {
      triggerShake();
      showToast("max");
      return;
    }
    setRechargeAmount(cleaned);
    if (numeric < MIN_AMOUNT) showToast("min");
    else setToast(null);
  };

  const fetchData = async () => {
    try {
      const [walletData, txData, requestData, qrData] = await Promise.all([
        api.getWallet(),
        api.getWalletTransactions(),
        api.getRechargeRequests().catch(() => []),
        api.getPaymentQr().catch(() => null),
      ]);
      setBalance(walletData.balance);
      setTransactions(txData);
      setRechargeRequests(Array.isArray(requestData) ? requestData : []);
      setPaymentQr(qrData);
    } catch (error) {
      console.error("Error fetching wallet:", error);
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

  const handleRecharge = async () => {
    const amount = parseFloat(rechargeAmount);
    if (isNaN(amount) || amount <= 0) {
      triggerShake();
      showToast("min");
      return;
    }
    if (amount < MIN_AMOUNT) {
      triggerShake();
      showToast("min");
      return;
    }
    if (amount > MAX_AMOUNT) {
      triggerShake();
      showToast("max");
      return;
    }
    if (!reference.trim()) {
      triggerShake();
      return;
    }

    setRecharging(true);
    try {
      await api.createRechargeRequest({
        amount,
        reference: reference.trim(),
      });

      // Close sheet
      setRechargeModal(false);
      setRechargeAmount("");
      setReference("");
      setToast(null);

      // Refresh data, then show success
      await fetchData();
      setSuccessAmount(amount);
      setSuccessVisible(true);
      Vibration.vibrate([0, 60, 40, 80]);
    } catch (error: any) {
      triggerShake();
    } finally {
      setRecharging(false);
    }
  };

  const closeModal = () => {
    setRechargeModal(false);
    setRechargeAmount("");
    setReference("");
    setToast(null);
    if (toastTimer.current) clearTimeout(toastTimer.current);
  };

  const downloadQr = async () => {
    if (!paymentQr?.qr_image_base64) return;
    const base64 = String(paymentQr.qr_image_base64).replace(
      /^data:image\/\w+;base64,/,
      "",
    );
    const ext = String(paymentQr.file_type || "").toLowerCase().includes("png")
      ? "png"
      : "jpg";
    const dir = getFileCacheDir();
    if (!dir) return;
    const fileUri = `${dir}payment-qr-${Date.now()}.${ext}`;
    setDownloadingQr(true);
    try {
      await writeBase64File(fileUri, base64);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: ext === "png" ? "image/png" : "image/jpeg",
          dialogTitle: "Download Payment QR",
        });
      }
    } finally {
      setDownloadingQr(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) return <LoadingScreen />;

  const credits = transactions
    .filter((t) => t.type === "credit")
    .reduce((s, t) => s + t.amount, 0);
  const debits = transactions
    .filter((t) => t.type === "debit")
    .reduce((s, t) => s + t.amount, 0);
  const isValidAmount = (() => {
    const n = parseFloat(rechargeAmount);
    return (
      !isNaN(n) &&
      n >= MIN_AMOUNT &&
      n <= MAX_AMOUNT &&
      Boolean(reference.trim())
    );
  })();
  const pendingRequests = rechargeRequests.filter(
    (item) => (item.status || "").toLowerCase() === "pending",
  );
  const qrImageUri = paymentQr?.qr_image_base64
    ? paymentQr.qr_image_base64.startsWith("data:image")
      ? paymentQr.qr_image_base64
      : `data:image/jpeg;base64,${paymentQr.qr_image_base64}`
    : "";
  const historyItems = [
    ...transactions.map((item) => ({
      kind: "transaction",
      id: item.id,
      date: item.created_at,
      data: item,
    })),
    ...rechargeRequests.map((item) => ({
      kind: "request",
      id: item.id || item._id || item.request_id,
      date: item.created_at,
      data: item,
    })),
  ].sort(
    (a, b) =>
      new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime(),
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* ── Hero ── */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroInfoCard}>
              <View style={styles.heroInfoIcon}>
                <Ionicons name="wallet-outline" size={15} color="#fff" />
              </View>
              <View>
                <Text style={styles.heroInfoLabel}>My Wallet</Text>
                <Text style={styles.heroInfoValue}>Active</Text>
              </View>
            </View>
            <View style={styles.heroInfoCard}>
              <View style={styles.heroInfoIcon}>
                <Ionicons name="cash-outline" size={15} color="#fff" />
              </View>
              <View>
                <Text style={styles.heroInfoLabel}>Total Balance</Text>
                <Text style={styles.heroInfoValue}>Available</Text>
              </View>
            </View>
          </View>
          <Text style={styles.heroAmount}>₹{balance.toFixed(2)}</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={styles.statIconGreen}>
                <Ionicons name="arrow-down" size={12} color="#22c55e" />
              </View>
              <View>
                <Text style={styles.statLabel}>Total Added</Text>
                <Text style={styles.statValue}>₹{credits.toFixed(0)}</Text>
              </View>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={styles.statIconRed}>
                <Ionicons name="arrow-up" size={12} color="#ef4444" />
              </View>
              <View>
                <Text style={styles.statLabel}>Total Spent</Text>
                <Text style={styles.statValue}>₹{debits.toFixed(0)}</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity
            style={styles.addMoneyBtn}
            onPress={() => setRechargeModal(true)}
          >
            <Ionicons
              name="add-circle-outline"
              size={18}
              color={Colors.primary}
            />
            <Text style={styles.addMoneyText}>Add Money</Text>
          </TouchableOpacity>
        </View>

        {pendingRequests.length > 0 ? (
          <View style={styles.pendingCard}>
            <View style={styles.pendingHead}>
              <View style={styles.pendingIcon}>
                <Ionicons name="time-outline" size={18} color="#f59e0b" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.pendingTitle}>Pending Approval</Text>
                <Text style={styles.pendingSub}>
                  Recharge amount can be used only after admin approval.
                </Text>
              </View>
              <View style={styles.pendingCount}>
                <Text style={styles.pendingCountText}>
                  {pendingRequests.length}
                </Text>
              </View>
            </View>
            {pendingRequests.slice(0, 3).map((item) => (
              <View key={item.id || item._id || item.reference} style={styles.pendingRow}>
                <Text style={styles.pendingRef} numberOfLines={1}>
                  {item.reference || "Reference pending"}
                </Text>
                <Text style={styles.pendingAmount}>₹{item.amount}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* ── Transactions ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transaction History</Text>
          <Text style={styles.sectionSub}>
            {historyItems.length} records
          </Text>
        </View>
        {historyItems.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="receipt-outline" size={32} color="#ccc" />
            </View>
            <Text style={styles.emptyTitle}>No transactions yet</Text>
            <Text style={styles.emptyDesc}>
              Your transaction history will appear here
            </Text>
          </View>
        ) : (
          <View style={styles.txList}>
            {historyItems.map((entry, index) => {
              if (entry.kind === "request") {
                const req = entry.data;
                const status = (req.status || "pending").toLowerCase();
                const isApproved = status === "approved";
                const isRejected = status === "rejected";
                const color = isApproved
                  ? "#22c55e"
                  : isRejected
                    ? "#ef4444"
                    : "#f59e0b";
                return (
                  <View key={`request-${entry.id || index}`} style={styles.txCard}>
                    <View
                      style={[
                        styles.txIcon,
                        isApproved
                          ? styles.txIconGreen
                          : isRejected
                            ? styles.txIconRed
                            : styles.txIconYellow,
                      ]}
                    >
                      <Ionicons
                        name={
                          isApproved
                            ? "checkmark"
                            : isRejected
                              ? "close"
                              : "time-outline"
                        }
                        size={16}
                        color={color}
                      />
                    </View>
                    <View style={styles.txInfo}>
                      <Text style={styles.txDesc}>Recharge Request</Text>
                      <Text style={styles.txDate}>
                        {req.reference || "No reference"} ·{" "}
                        {formatDate(req.created_at)}
                      </Text>
                    </View>
                    <View style={styles.txRight}>
                      <Text style={[styles.txAmount, { color }]}>
                        ₹{req.amount}
                      </Text>
                      <View
                        style={[
                          styles.requestStatusPill,
                          { backgroundColor: color + "18" },
                        ]}
                      >
                        <Text style={[styles.requestStatusText, { color }]}>
                          {status}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              }
              const tx = entry.data;
              return (
                <View key={`tx-${entry.id || index}`} style={styles.txCard}>
                  <View
                    style={[
                      styles.txIcon,
                      tx.type === "credit"
                        ? styles.txIconGreen
                        : styles.txIconRed,
                    ]}
                  >
                    <Ionicons
                      name={tx.type === "credit" ? "arrow-down" : "arrow-up"}
                      size={16}
                      color={tx.type === "credit" ? "#22c55e" : "#ef4444"}
                    />
                  </View>
                  <View style={styles.txInfo}>
                    <Text style={styles.txDesc}>{tx.description}</Text>
                    <Text style={styles.txDate}>
                      {formatDate(tx.created_at)}
                    </Text>
                  </View>
                  <View style={styles.txRight}>
                    <Text
                      style={[
                        styles.txAmount,
                        { color: tx.type === "credit" ? "#22c55e" : "#ef4444" },
                      ]}
                    >
                      {tx.type === "credit" ? "+" : "-"}₹{tx.amount}
                    </Text>
                    <Text style={styles.txBal}>₹{tx.balance_after}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
        <View style={{ height: 30 }} />
      </ScrollView>

      {/* ── Recharge Modal ── */}
      <Modal visible={rechargeModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ width: "100%" }}
          >
            <ScrollView
              style={styles.modalSheet}
              contentContainerStyle={{ paddingBottom: 36 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.dragHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Money</Text>
                <TouchableOpacity style={styles.closeBtn} onPress={closeModal}>
                  <Ionicons name="close" size={16} color="#666" />
                </TouchableOpacity>
              </View>

              <View style={styles.limitBar}>
                <View style={styles.limitBadge}>
                  <Ionicons name="information-circle-outline" size={12} color="#888" />
                  <Text style={styles.limitText}>
                    Min ₹{MIN_AMOUNT} · Max ₹{MAX_AMOUNT.toLocaleString("en-IN")}
                  </Text>
                </View>
              </View>

              <View style={styles.qrBox}>
                {qrImageUri ? (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => setQrPreviewVisible(true)}
                  >
                    <Image
                      source={{ uri: qrImageUri }}
                      style={styles.qrImage}
                      resizeMode="contain"
                    />
                    <View style={styles.qrTapHint}>
                      <Ionicons name="expand-outline" size={11} color="#fff" />
                    </View>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.qrEmpty}>
                    <Ionicons name="qr-code-outline" size={28} color="#bbb" />
                    <Text style={styles.qrEmptyText}>Payment QR unavailable</Text>
                  </View>
                )}
                <View style={styles.qrInfo}>
                  <Text style={styles.qrLabel}>
                    {paymentQr?.label || "Admin Payment QR"}
                  </Text>
                  <Text style={styles.qrNote}>
                    Pay on this QR, then enter transaction reference below.
                  </Text>
                </View>
              </View>

              <Animated.View
                style={[
                  styles.amountBox,
                  toast === "min" && styles.amountBoxWarnMin,
                  toast === "max" && styles.amountBoxWarnMax,
                  { transform: [{ translateX: shakeAnim }] },
                ]}
              >
                <Text
                  style={[
                    styles.rupeeSymbol,
                    toast === "max" && { color: "#ef4444" },
                    toast === "min" && { color: "#f59e0b" },
                  ]}
                >
                  ₹
                </Text>
                <TextInput
                  style={[
                    styles.amountInput,
                    toast === "max" && { color: "#ef4444" },
                    toast === "min" && { color: "#f59e0b" },
                  ]}
                  value={rechargeAmount}
                  onChangeText={handleAmountChange}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#ddd"
                  autoFocus
                  maxLength={5}
                />
                {rechargeAmount.length > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      setRechargeAmount("");
                      setToast(null);
                    }}
                    style={styles.clearBtn}
                  >
                    <Ionicons name="close-circle" size={20} color="#ccc" />
                  </TouchableOpacity>
                )}
              </Animated.View>

              <LimitToast type={toast} />

              <Text style={styles.quickLabel}>Payment Reference</Text>
              <TextInput
                style={styles.referenceInput}
                value={reference}
                onChangeText={setReference}
                placeholder="UPI / transaction reference"
                placeholderTextColor="#bbb"
                autoCapitalize="characters"
              />

              <Text style={styles.quickLabel}>Quick Select</Text>
              <View style={styles.quickRow}>
                {quickAmounts.map((amt) => (
                  <TouchableOpacity
                    key={amt}
                    style={[
                      styles.quickChip,
                      rechargeAmount === amt.toString() && styles.quickChipActive,
                    ]}
                    onPress={() => {
                      setRechargeAmount(amt.toString());
                      setToast(null);
                    }}
                  >
                    <Text
                      style={[
                        styles.quickChipText,
                        rechargeAmount === amt.toString() &&
                        styles.quickChipTextActive,
                      ]}
                    >
                      ₹{amt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Button
                title={
                  isValidAmount
                    ? `Submit ₹${rechargeAmount} Request`
                    : "Enter Amount & Reference"
                }
                onPress={handleRecharge}
                loading={recharging}
                disabled={!isValidAmount}
              />
              <Text style={styles.mockNote}>
                Amount will be usable only after admin approval.
              </Text>
            </ScrollView>
          </KeyboardAvoidingView>

          {qrPreviewVisible ? (
            <View style={styles.previewOverlay}>
              <View style={styles.previewCard}>
                <View style={styles.previewHeader}>
                  <View>
                    <Text style={styles.previewTitle}>
                      {paymentQr?.label || "Payment QR"}
                    </Text>
                    <Text style={styles.previewSub}>Scan or download this QR</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.previewClose}
                    onPress={() => setQrPreviewVisible(false)}
                  >
                    <Ionicons name="close" size={18} color="#333" />
                  </TouchableOpacity>
                </View>
                {qrImageUri ? (
                  <Image
                    source={{ uri: qrImageUri }}
                    style={styles.previewImage}
                    resizeMode="contain"
                  />
                ) : null}
                <TouchableOpacity
                  style={styles.downloadBtn}
                  onPress={downloadQr}
                  disabled={downloadingQr}
                  activeOpacity={0.85}
                >
                  <Ionicons name="download-outline" size={18} color="#fff" />
                  <Text style={styles.downloadText}>
                    {downloadingQr ? "Preparing..." : "Download QR"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </View>
      </Modal>

      {/* ── Success Modal ── */}
      <SuccessModal
        visible={successVisible}
        amount={successAmount}
        newBalance={balance}
        onClose={() => setSuccessVisible(false)}
      />
    </SafeAreaView>
  );
}

// ─── Styles 
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F7F4" },

  heroCard: {
    margin: 20,
    backgroundColor: Colors.primary,
    borderRadius: 24,
    padding: 24,
    shadowColor: Colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  heroTop: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    marginBottom: 14,
  },
  heroInfoCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    paddingHorizontal: 11,
    paddingVertical: 10,
    borderRadius: 16,
  },
  heroInfoIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  heroInfoLabel: { fontSize: 11, color: "rgba(255,255,255,0.72)", fontWeight: "700" },
  heroInfoValue: { fontSize: 13, color: "#fff", fontWeight: "900", marginTop: 2 },
  heroAmount: {
    fontSize: 44,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -1,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  statItem: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  statDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginHorizontal: 12,
  },
  statIconGreen: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(34,197,94,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  statIconRed: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(239,68,68,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  statLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.6)",
    fontWeight: "500",
  },
  statValue: { fontSize: 14, fontWeight: "700", color: "#fff" },
  addMoneyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
  },
  addMoneyText: { fontSize: 15, fontWeight: "700", color: Colors.primary },

  pendingCard: {
    marginHorizontal: 20,
    marginBottom: 18,
    backgroundColor: "#fffbeb",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  pendingHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  pendingIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#fef3c7",
    alignItems: "center",
    justifyContent: "center",
  },
  pendingTitle: { fontSize: 14, fontWeight: "900", color: "#92400e" },
  pendingSub: {
    fontSize: 11,
    lineHeight: 15,
    color: "#b45309",
    fontWeight: "600",
    marginTop: 2,
  },
  pendingCount: {
    minWidth: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "#f59e0b",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  pendingCountText: { fontSize: 13, fontWeight: "900", color: "#fff" },
  pendingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.72)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginTop: 7,
  },
  pendingRef: {
    flex: 1,
    fontSize: 12,
    fontWeight: "800",
    color: "#92400e",
    marginRight: 10,
  },
  pendingAmount: { fontSize: 13, fontWeight: "900", color: "#b45309" },

  section: {
    flexDirection: "row",
    alignItems: "baseline",
    paddingHorizontal: 20,
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: "#1A1A1A" },
  sectionSub: { fontSize: 12, color: "#bbb", fontWeight: "500" },

  txList: { paddingHorizontal: 20, gap: 10 },
  txCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
    marginBottom: 8,
  },
  txIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  txIconGreen: { backgroundColor: "#f0fdf4" },
  txIconRed: { backgroundColor: "#fef2f2" },
  txIconYellow: { backgroundColor: "#fffbeb" },
  txInfo: { flex: 1 },
  txDesc: { fontSize: 14, fontWeight: "600", color: "#1A1A1A" },
  txDate: { fontSize: 11, color: "#aaa", marginTop: 3 },
  txRight: { alignItems: "flex-end" },
  txAmount: { fontSize: 15, fontWeight: "800" },
  txBal: { fontSize: 10, color: "#bbb", marginTop: 3 },
  requestStatusPill: {
    marginTop: 4,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  requestStatusText: {
    fontSize: 9,
    fontWeight: "900",
    textTransform: "capitalize",
  },

  emptyState: { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#999" },
  emptyDesc: { fontSize: 13, color: "#ccc" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    //paddingBottom: 36,
    maxHeight: "92%",
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#E0E0E0",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#1A1A1A" },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
  },
  limitBar: { alignItems: "center", marginBottom: 16 },
  limitBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  limitText: { fontSize: 11, color: "#888", fontWeight: "600" },
  qrBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F8F8F8",
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#EFEFEF",
  },
  qrImage: {
    width: 86,
    height: 86,
    borderRadius: 12,
    backgroundColor: "#fff",
  },
  qrTapHint: {
    position: "absolute",
    right: 5,
    bottom: 5,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.58)",
    alignItems: "center",
    justifyContent: "center",
  },
  qrEmpty: {
    width: 86,
    height: 86,
    borderRadius: 12,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
  qrEmptyText: {
    fontSize: 9,
    color: "#aaa",
    fontWeight: "700",
    textAlign: "center",
    marginTop: 4,
  },
  qrInfo: { flex: 1 },
  qrLabel: { fontSize: 14, fontWeight: "900", color: "#1A1A1A" },
  qrNote: {
    fontSize: 11,
    color: "#888",
    lineHeight: 15,
    fontWeight: "600",
    marginTop: 4,
  },
  amountBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F8F8",
    borderRadius: 16,
    paddingHorizontal: 20,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: "transparent",
  },
  amountBoxWarnMin: { borderColor: "#f59e0b", backgroundColor: "#fffbeb" },
  amountBoxWarnMax: { borderColor: "#ef4444", backgroundColor: "#fff5f5" },
  rupeeSymbol: {
    fontSize: 36,
    fontWeight: "800",
    color: "#1A1A1A",
    marginRight: 4,
  },
  amountInput: {
    flex: 1,
    fontSize: 36,
    fontWeight: "800",
    color: "#1A1A1A",
    paddingVertical: 18,
  },
  clearBtn: { padding: 4 },

  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
  },
  toastMin: { backgroundColor: "#fffbeb", borderColor: "#fde68a" },
  toastMax: { backgroundColor: "#fff5f5", borderColor: "#fecaca" },
  toastIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  toastIconMin: { backgroundColor: "#fef3c7" },
  toastIconMax: { backgroundColor: "#fee2e2" },
  toastTitle: { fontSize: 13, fontWeight: "700", color: "#1A1A1A" },
  toastSub: { fontSize: 11, color: "#888", marginTop: 1 },
  referenceInput: {
    backgroundColor: "#F8F8F8",
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 48,
    borderWidth: 1.5,
    borderColor: "#EFEFEF",
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 16,
  },

  quickLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#999",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  quickRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  quickChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  quickChipActive: {
    backgroundColor: Colors.primary + "15",
    borderColor: Colors.primary,
  },
  quickChipText: { fontSize: 14, fontWeight: "700", color: "#888" },
  quickChipTextActive: { color: Colors.primary },
  mockNote: { fontSize: 11, color: "#ccc", textAlign: "center", marginTop: 12 },
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "center",
    padding: 20,
    zIndex: 50,
  },
  previewCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 18,
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  previewTitle: { fontSize: 18, fontWeight: "900", color: "#1A1A1A" },
  previewSub: { fontSize: 12, color: "#888", fontWeight: "600", marginTop: 2 },
  previewClose: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
  },
  previewImage: {
    width: "100%",
    height: 340,
    borderRadius: 18,
    backgroundColor: "#F8F8F8",
  },
  downloadBtn: {
    marginTop: 14,
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  downloadText: { fontSize: 15, fontWeight: "900", color: "#fff" },
});
