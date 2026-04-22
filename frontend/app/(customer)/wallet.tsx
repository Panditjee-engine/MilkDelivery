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
  Animated,
  Vibration,
  Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../src/services/api";
import { Colors } from "../../src/constants/colors";
import LoadingScreen from "../../src/components/LoadingScreen";
import Button from "../../src/components/Button";

const quickAmounts = [100, 200, 500, 1000];
const MIN_AMOUNT = 100;
const MAX_AMOUNT = 99999;

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
          <Text style={ss.title}>Money Added!</Text>
          <Text style={ss.subtitle}>Your wallet has been topped up</Text>

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
            <Text style={ss.amountLabel}>Amount Added</Text>
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
            <Text style={ss.balanceText}>New Balance</Text>
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
  const [rechargeModal, setRechargeModal] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState("");
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
      const [walletData, txData] = await Promise.all([
        api.getWallet(),
        api.getWalletTransactions(),
      ]);
      setBalance(walletData.balance);
      setTransactions(txData);
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

    setRecharging(true);
    try {
      await api.rechargeWallet(amount);

      // Close sheet
      setRechargeModal(false);
      setRechargeAmount("");
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
    setToast(null);
    if (toastTimer.current) clearTimeout(toastTimer.current);
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
    return !isNaN(n) && n >= MIN_AMOUNT && n <= MAX_AMOUNT;
  })();

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
            <Text style={styles.heroLabel}>Total Balance</Text>
            <View style={styles.walletBadge}>
              <Ionicons name="wallet-outline" size={14} color="#fff" />
              <Text style={styles.walletBadgeText}>My Wallet</Text>
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

        {/* ── Transactions ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transaction History</Text>
          <Text style={styles.sectionSub}>
            {transactions.length} transactions
          </Text>
        </View>
        {transactions.length === 0 ? (
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
            {transactions
              .slice()
              .reverse()
              .map((tx, index) => (
                <View key={tx.id || index} style={styles.txCard}>
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
              ))}
          </View>
        )}
        <View style={{ height: 30 }} />
      </ScrollView>

      {/* ── Recharge Modal ── */}
      <Modal visible={rechargeModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.dragHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Money</Text>
              <TouchableOpacity style={styles.closeBtn} onPress={closeModal}>
                <Ionicons name="close" size={16} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.limitBar}>
              <View style={styles.limitBadge}>
                <Ionicons
                  name="information-circle-outline"
                  size={12}
                  color="#888"
                />
                <Text style={styles.limitText}>
                  Min ₹{MIN_AMOUNT} · Max ₹{MAX_AMOUNT.toLocaleString("en-IN")}
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
              title={isValidAmount ? `Add ₹${rechargeAmount}` : "Enter Amount"}
              onPress={handleRecharge}
              loading={recharging}
              disabled={!rechargeAmount}
            />
            <Text style={styles.mockNote}>
              Mock payment — for demo purposes only
            </Text>
          </View>
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
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  heroLabel: {
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    fontWeight: "500",
  },
  walletBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  walletBadgeText: { fontSize: 11, color: "#fff", fontWeight: "600" },
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
  txInfo: { flex: 1 },
  txDesc: { fontSize: 14, fontWeight: "600", color: "#1A1A1A" },
  txDate: { fontSize: 11, color: "#aaa", marginTop: 3 },
  txRight: { alignItems: "flex-end" },
  txAmount: { fontSize: 15, fontWeight: "800" },
  txBal: { fontSize: 10, color: "#bbb", marginTop: 3 },

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
});
