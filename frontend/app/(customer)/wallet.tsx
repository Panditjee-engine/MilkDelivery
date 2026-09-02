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
  Alert,
  Animated,
  Vibration,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  NativeModules,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import * as Sharing from "expo-sharing";
import { Calendar } from "react-native-calendars";
import { api, StatementTemplateSettings } from "../../src/services/api";
import { Colors } from "../../src/constants/colors";
import LoadingScreen from "../../src/components/LoadingScreen";
import Button from "../../src/components/Button";
import { useAuth } from "../../src/contexts/AuthContext";
import { useFocusEffect } from "@react-navigation/native";

const quickAmounts = [100, 200, 500, 1000];
const MIN_AMOUNT = 100;
const MAX_AMOUNT = 99999;
type RechargeMode = "online" | "manual";
type StatementRange = "1m" | "3m" | "6m" | "custom";
type StatementDateTarget = "start" | "end";

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function getStatementRangeDates(range: StatementRange, start: string, end: string) {
  const today = new Date();
  if (range === "custom") {
    return { startDate: start, endDate: end };
  }
  const months = range === "1m" ? 1 : range === "3m" ? 3 : 6;
  return {
    startDate: toDateKey(addMonths(today, -months)),
    endDate: toDateKey(today),
  };
}

function statementLogoUri(value?: string) {
  if (!value) return "";
  return value.startsWith("data:image") ? value : `data:image/jpeg;base64,${value}`;
}

function isExpoGo(): boolean {
  return Constants.appOwnership === "expo";
}

function canUseRazorpayNativeModule(): boolean {
  return Boolean(
    !isExpoGo() &&
      (NativeModules.RNRazorpayCheckout || NativeModules.RazorpayCheckout),
  );
}

function getRazorpayContact(phone?: string): string | undefined {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length >= 10) return digits.slice(-10);
  return digits || undefined;
}

function getFileCacheDir(): string {
  try {
    const FS = require("expo-file-system/legacy");
    return (
      FS.cacheDirectory ??
      FS.documentDirectory ??
      ""
    );
  } catch {
    try {
      const FS = require("expo-file-system");
      const dir =
        FS.cacheDirectory ??
        FS.documentDirectory ??
        FS.Paths?.cache?.uri ??
        FS.Paths?.document?.uri ??
        "";
      return dir && !String(dir).endsWith("/") ? `${dir}/` : dir;
    } catch {
      return "";
    }
  }
}

async function writeBase64File(uri: string, base64: string) {
  try {
    const FS = require("expo-file-system/legacy");
    if (typeof FS.writeAsStringAsync === "function") {
      await FS.writeAsStringAsync(uri, base64, {
        encoding: FS.EncodingType?.Base64 ?? "base64",
      });
      return;
    }
  } catch {
    // Fallback to the new Expo FileSystem API below.
  }
  const FS = require("expo-file-system");
  if (typeof FS.File === "function") {
    const file = new FS.File(uri);
    await file.write(base64, { encoding: "base64" });
    return;
  }
  throw new Error("FileSystem write API is not available");
}

// ─── Limit Toast ─────────────────────────────────────────────────────────────
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

// ─── Particle ─────────────────────────────────────────────────────────────────
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

// ─── Success Modal ────────────────────────────────────────────────────────────
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

          <Text style={ss.title}>Request Submitted!</Text>
          <Text style={ss.subtitle}>
            Your wallet will update after admin approval
          </Text>

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

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function WalletScreen() {
  const router = useRouter();
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [rechargeRequests, setRechargeRequests] = useState<any[]>([]);
  const [paymentQr, setPaymentQr] = useState<any>(null);
  const [qrPreviewVisible, setQrPreviewVisible] = useState(false);
  const [downloadingQr, setDownloadingQr] = useState(false);
  const [statementModal, setStatementModal] = useState(false);
  const [statementRange, setStatementRange] = useState<StatementRange>("1m");
  const [statementStartDate, setStatementStartDate] = useState(() =>
    toDateKey(addMonths(new Date(), -1)),
  );
  const [statementEndDate, setStatementEndDate] = useState(() =>
    toDateKey(new Date()),
  );
  const [statementDateTarget, setStatementDateTarget] =
    useState<StatementDateTarget>("start");
  const [downloadingStatement, setDownloadingStatement] = useState(false);
  const [statementTemplate, setStatementTemplate] =
    useState<StatementTemplateSettings | null>(null);
  const [rechargeModal, setRechargeModal] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState("");
  const [reference, setReference] = useState("");
  const [rechargeMode, setRechargeMode] = useState<RechargeMode>("online");
  const [recharging, setRecharging] = useState(false);
  const [toast, setToast] = useState<ToastType>(null);
  const [successVisible, setSuccessVisible] = useState(false);
  const [successAmount, setSuccessAmount] = useState(0);
  const manualQrEnabled = user?.manual_qr_recharge_enabled === true;

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchingRef = useRef(false);

  const syncManualQrAccess = useCallback(async () => {
    try {
      const latestUser = await api.getMe();
      if (latestUser) updateUser(latestUser);
    } catch {
      // Keep wallet usable even if profile sync briefly fails.
    }
  }, [updateUser]);

  useEffect(() => {
    if (!manualQrEnabled && rechargeMode === "manual") {
      setRechargeMode("online");
      setReference("");
    }
  }, [manualQrEnabled, rechargeMode]);

  useEffect(() => {
    if (!rechargeModal) return;
    syncManualQrAccess();
  }, [rechargeModal, syncManualQrAccess]);

  useEffect(() => {
    if (!rechargeModal || !manualQrEnabled) return;
    api
      .getPaymentQr()
      .then(setPaymentQr)
      .catch(() => setPaymentQr(null));
  }, [rechargeModal, manualQrEnabled]);

  useEffect(() => {
    if (!statementModal) return;
    api
      .getCurrentWalletStatementTemplate()
      .then(setStatementTemplate)
      .catch(() => setStatementTemplate(null));
  }, [statementModal]);

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

   const updateUserRef = useRef(updateUser);
  useEffect(() => {
    updateUserRef.current = updateUser;
  }, [updateUser]);

  const fetchData = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const [walletData, txData, requestData, meData] = await Promise.all([
        api.getWallet(),
        api.getWalletTransactions(),
        api.getRechargeRequests().catch(() => []),
        api.getMe().catch(() => null),
      ]);
      setBalance(Number(walletData.balance || 0));
      setTransactions(txData);
      setRechargeRequests(Array.isArray(requestData) ? requestData : []);
      if (meData) updateUserRef.current(meData);
    } catch (error) {
      console.error("Error fetching wallet:", error);
    } finally {
      fetchingRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);

   useFocusEffect(
    useCallback(() => {
      fetchData();
      const interval = setInterval(fetchData, 3000);
      return () => clearInterval(interval);
    }, [fetchData]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

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
      await api.createRechargeRequest({ amount, reference: reference.trim() });
      setRechargeModal(false);
      setRechargeAmount("");
      setReference("");
      setToast(null);
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

  const handleOnlineRecharge = async () => {
    const amount = parseFloat(rechargeAmount);
    if (isNaN(amount) || amount < MIN_AMOUNT) {
      triggerShake();
      showToast("min");
      return;
    }
    if (amount > MAX_AMOUNT) {
      triggerShake();
      showToast("max");
      return;
    }
    if (!canUseRazorpayNativeModule()) {
      Alert.alert(
        "Development build needed",
        manualQrEnabled
          ? "Online Razorpay payments cannot run inside Expo Go because the native Razorpay module is not included there. Please use an Android/iOS development build, or use QR Manual for testing."
          : "Online Razorpay payments cannot run inside Expo Go because the native Razorpay module is not included there. Please use an Android/iOS development build or production app.",
      );
      return;
    }

    setRecharging(true);
    try {
      const RazorpayCheckout = require("react-native-razorpay").default;
      const order = await api.createRazorpayWalletRechargeOrder(amount);
      const prefill = {
        name: user?.name || "Gau Satva Customer",
        email: user?.email || "",
        contact: getRazorpayContact(user?.phone),
      };
      const checkoutResult = await RazorpayCheckout.open({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency || "INR",
        name: order.name || "Gau Satva",
        description: order.description || "Wallet recharge",
        order_id: order.order_id,
        prefill,
        readonly: {
          contact: Boolean(prefill.contact),
          email: Boolean(prefill.email),
          name: Boolean(prefill.name),
        },
        method: {
          upi: true,
          card: true,
          netbanking: true,
          wallet: true,
        },
        config: {
          display: {
            blocks: {
              upi: {
                name: "Pay using UPI",
                instruments: [{ method: "upi" }],
              },
            },
            sequence: ["block.upi"],
            preferences: {
              show_default_blocks: true,
            },
          },
        },
        theme: { color: Colors.primary },
        retry: { enabled: true, max_count: 1 },
      });
      const verified = await api.verifyRazorpayWalletRecharge({
        razorpay_order_id: checkoutResult.razorpay_order_id,
        razorpay_payment_id: checkoutResult.razorpay_payment_id,
        razorpay_signature: checkoutResult.razorpay_signature,
      });
      const verifiedBalance = Number(verified?.new_balance);
      if (Number.isFinite(verifiedBalance)) {
        setBalance(verifiedBalance);
      }
      setRechargeModal(false);
      setRechargeAmount("");
      setReference("");
      setToast(null);
      await fetchData();
      Vibration.vibrate([0, 60, 40, 80]);
      router.push({
        pathname: "/(customer)/payment-success",
        params: {
          amount: amount.toFixed(2),
          balance: Number.isFinite(verifiedBalance) ? String(verifiedBalance) : "",
          paymentId: checkoutResult.razorpay_payment_id || "",
        },
      });
    } catch (error: any) {
      triggerShake();
      const message = String(error?.description || error?.message || "");
      const isRazorpayRouteMissing =
        error?.status === 404 &&
        String(error?.url || "").includes("/wallet/razorpay/recharge-order");
      const reason = isRazorpayRouteMissing
        ? "Online payment API is not active on the server yet. Please restart/deploy the backend with Razorpay wallet routes."
        : message.includes("react-native-razorpay")
        ? "Online payments need a development or production build. Please open the installed app build and try again."
        : message || "Your wallet was not charged. Please try again.";
      setRechargeModal(false);
      router.push({
        pathname: "/(customer)/payment-failed",
        params: {
          amount: amount.toFixed(2),
          reason,
        },
      });
    } finally {
      setRecharging(false);
    }
  };

  const closeModal = () => {
    Keyboard.dismiss();
    setRechargeModal(false);
    setRechargeAmount("");
    setReference("");
    setRechargeMode("online");
    setToast(null);
    if (toastTimer.current) clearTimeout(toastTimer.current);
  };

  const downloadQr = async () => {
    if (!paymentQr?.qr_image_base64) return;
    const base64 = String(paymentQr.qr_image_base64).replace(
      /^data:image\/\w+;base64,/,
      "",
    );
    const ext = String(paymentQr.file_type || "")
      .toLowerCase()
      .includes("png")
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

  const closeStatementModal = () => {
    setStatementModal(false);
    setStatementDateTarget("start");
  };

  const downloadStatement = async () => {
    const { startDate, endDate } = getStatementRangeDates(
      statementRange,
      statementStartDate,
      statementEndDate,
    );
    if (!startDate || !endDate) {
      Alert.alert("Select date range", "Please select both start and end date.");
      return;
    }
    if (startDate > endDate) {
      Alert.alert("Invalid date range", "Start date cannot be after end date.");
      return;
    }
    const dir = getFileCacheDir();
    if (!dir) {
      Alert.alert("Storage unavailable", "Could not prepare the statement file.");
      return;
    }
    setDownloadingStatement(true);
    try {
      const payload = await api.downloadWalletStatement({
        start_date: startDate,
        end_date: endDate,
      });
      const filename =
        payload.filename ||
        `wallet-statement-${startDate}-${endDate}.pdf`;
      const fileUri = `${dir}${filename}`;
      await writeBase64File(fileUri, payload.base64);
      closeStatementModal();
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: payload.mime_type || "application/pdf",
          dialogTitle: "Download Wallet Statement",
        });
      } else {
        Alert.alert("Statement ready", `Saved as ${filename}`);
      }
    } catch (error: any) {
      Alert.alert(
        "Could not download statement",
        error?.message || "Please try again.",
      );
    } finally {
      setDownloadingStatement(false);
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
    if (isNaN(n) || n < MIN_AMOUNT || n > MAX_AMOUNT) return false;
    return rechargeMode === "online" || Boolean(reference.trim());
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
    (a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime(),
  );
  const activeStatementRange = getStatementRangeDates(
    statementRange,
    statementStartDate,
    statementEndDate,
  );
  const statementMarkedDates =
    statementRange === "custom"
      ? {
          ...(statementStartDate
            ? {
                [statementStartDate]: {
                  selected: true,
                  startingDay: true,
                  color: Colors.primary,
                  textColor: "#fff",
                },
              }
            : {}),
          ...(statementEndDate
            ? {
                [statementEndDate]: {
                  selected: true,
                  endingDay: true,
                  color: Colors.primary,
                  textColor: "#fff",
                },
              }
            : {}),
        }
      : {};
  const statementLogo = statementLogoUri(statementTemplate?.logo_base64);
  const statementBrandName =
    statementTemplate?.business_name || "Gau Satva Wallet";
  const statementBrandSub =
    statementTemplate?.tagline || "Wallet statement";

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

        {pendingRequests.length > 0 && (
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
              <View
                key={item.id || item._id || item.reference}
                style={styles.pendingRow}
              >
                <Text style={styles.pendingRef} numberOfLines={1}>
                  {item.reference || "Reference pending"}
                </Text>
                <Text style={styles.pendingAmount}>₹{item.amount}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Transactions ── */}
        <View style={styles.section}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Transaction History</Text>
            <Text style={styles.sectionSub}>{historyItems.length} records</Text>
          </View>
          <TouchableOpacity
            style={styles.statementBtn}
            onPress={() => setStatementModal(true)}
            activeOpacity={0.86}
          >
            <Ionicons name="download-outline" size={15} color={Colors.primary} />
            <Text style={styles.statementBtnText}>Statement</Text>
          </TouchableOpacity>
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
                  <View
                    key={`request-${entry.id || index}`}
                    style={styles.txCard}
                  >
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

      {/* ── Recharge Modal ── keyboard-safe ── */}
      <Modal
        visible={rechargeModal}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        {/*
          KeyboardAvoidingView sits inside the Modal so it only adjusts
          the sheet, not the whole screen.
          On iOS: behavior="padding" lifts the sheet above the keyboard.
          On Android: behavior="height" shrinks the sheet height.
        */}
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        >
          {/* Tap-to-dismiss backdrop */}
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={closeModal}
          />

          <View style={styles.modalSheet}>
            <View style={styles.dragHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Money</Text>
              <TouchableOpacity style={styles.closeBtn} onPress={closeModal}>
                <Ionicons name="close" size={16} color="#666" />
              </TouchableOpacity>
            </View>

            {/*
              ScrollView inside the sheet so all content is reachable
              even on small screens or when the keyboard is open.
              keyboardShouldPersistTaps="handled" lets quick-select chips
              work without first dismissing the keyboard.
            */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.sheetScrollContent}
            >
              <View style={styles.limitBar}>
                <View style={styles.limitBadge}>
                  <Ionicons
                    name="information-circle-outline"
                    size={12}
                    color="#888"
                  />
                  <Text style={styles.limitText}>
                    Min ₹{MIN_AMOUNT} · Max ₹
                    {MAX_AMOUNT.toLocaleString("en-IN")}
                  </Text>
                </View>
              </View>

              <View style={styles.modeTabs}>
                {[
                  { key: "online" as RechargeMode, label: "Online", icon: "card-outline" },
                  ...(manualQrEnabled
                    ? [{ key: "manual" as RechargeMode, label: "QR Manual", icon: "qr-code-outline" }]
                    : []),
                ].map((mode) => {
                  const active = rechargeMode === mode.key;
                  return (
                    <TouchableOpacity
                      key={mode.key}
                      style={[styles.modeTab, active && styles.modeTabActive]}
                      onPress={() => setRechargeMode(mode.key)}
                      activeOpacity={0.85}
                    >
                      <Ionicons
                        name={mode.icon as any}
                        size={15}
                        color={active ? "#fff" : Colors.primary}
                      />
                      <Text style={[styles.modeTabText, active && styles.modeTabTextActive]}>
                        {mode.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {rechargeMode === "online" || !manualQrEnabled ? (
                <View style={styles.onlineBox}>
                  <View style={styles.onlineIcon}>
                    <Ionicons name="shield-checkmark-outline" size={22} color={Colors.primary} />
                  </View>
                  <View style={styles.qrInfo}>
                    <Text style={styles.qrLabel}>Secure Razorpay Payment</Text>
                    <Text style={styles.qrNote}>
                      Wallet balance updates only after successful payment verification.
                    </Text>
                  </View>
                </View>
              ) : (
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
                      <Text style={styles.qrEmptyText}>
                        Payment QR unavailable
                      </Text>
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
              )}

              {/* Amount input */}
              <Text style={styles.quickLabel}>Enter Amount</Text>
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
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
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

              {/* Quick amounts */}
              <Text style={styles.quickLabel}>Quick Select</Text>
              <View style={styles.quickRow}>
                {quickAmounts.map((amt) => (
                  <TouchableOpacity
                    key={amt}
                    style={[
                      styles.quickChip,
                      rechargeAmount === amt.toString() &&
                        styles.quickChipActive,
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

              {manualQrEnabled && rechargeMode === "manual" && (
                <>
                  <Text style={styles.quickLabel}>Payment Reference</Text>
                  <TextInput
                    style={styles.referenceInput}
                    value={reference}
                    onChangeText={setReference}
                    placeholder="UPI / transaction reference"
                    placeholderTextColor="#bbb"
                    autoCapitalize="characters"
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                  />
                </>
              )}

              {isValidAmount ? (
                <>
                  <Button
                    title={
                      rechargeMode === "online" || !manualQrEnabled
                        ? `Pay ₹${rechargeAmount} Online`
                        : `Submit ₹${rechargeAmount} Request`
                    }
                    onPress={
                      rechargeMode === "online" || !manualQrEnabled
                        ? handleOnlineRecharge
                        : handleRecharge
                    }
                    loading={recharging}
                  />
                  <Text style={styles.mockNote}>
                    {rechargeMode === "online" || !manualQrEnabled
                      ? "Online recharge is credited only after Razorpay signature verification."
                      : "Amount will be usable only after admin approval."}
                  </Text>
                </>
              ) : null}

              {/* Safe bottom padding so content clears the home bar */}
              <View style={{ height: 12 }} />
            </ScrollView>
          </View>

          {/* QR full preview (inside the KAV so it covers the sheet) */}
          {qrPreviewVisible && (
            <View style={styles.previewOverlay}>
              <View style={styles.previewCard}>
                <View style={styles.previewHeader}>
                  <View>
                    <Text style={styles.previewTitle}>
                      {paymentQr?.label || "Payment QR"}
                    </Text>
                    <Text style={styles.previewSub}>
                      Scan or download this QR
                    </Text>
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
          )}
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={statementModal}
        animationType="slide"
        transparent
        onRequestClose={closeStatementModal}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={closeStatementModal}
          />
          <View style={styles.modalSheet}>
            <View style={styles.dragHandle} />
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Wallet Statement</Text>
                <Text style={styles.statementPeriodText}>
                  {activeStatementRange.startDate} to {activeStatementRange.endDate}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={closeStatementModal}
              >
                <Ionicons name="close" size={16} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.statementSheetContent}
            >
              <View style={styles.statementOptions}>
                {[
                  { key: "1m" as StatementRange, label: "1 Month" },
                  { key: "3m" as StatementRange, label: "3 Months" },
                  { key: "6m" as StatementRange, label: "6 Months" },
                  { key: "custom" as StatementRange, label: "Custom" },
                ].map((option) => {
                  const active = statementRange === option.key;
                  return (
                    <TouchableOpacity
                      key={option.key}
                      style={[
                        styles.statementChip,
                        active && styles.statementChipActive,
                      ]}
                      onPress={() => setStatementRange(option.key)}
                      activeOpacity={0.86}
                    >
                      <Text
                        style={[
                          styles.statementChipText,
                          active && styles.statementChipTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {statementRange === "custom" && (
                <View style={styles.customDateBox}>
                  <View style={styles.datePickRow}>
                    <TouchableOpacity
                      style={[
                        styles.datePickCard,
                        statementDateTarget === "start" &&
                          styles.datePickCardActive,
                      ]}
                      onPress={() => setStatementDateTarget("start")}
                    >
                      <Text style={styles.datePickLabel}>From</Text>
                      <Text style={styles.datePickValue}>
                        {statementStartDate || "Select date"}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.datePickCard,
                        statementDateTarget === "end" &&
                          styles.datePickCardActive,
                      ]}
                      onPress={() => setStatementDateTarget("end")}
                    >
                      <Text style={styles.datePickLabel}>To</Text>
                      <Text style={styles.datePickValue}>
                        {statementEndDate || "Select date"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <Calendar
                    maxDate={toDateKey(new Date())}
                    markedDates={statementMarkedDates}
                    markingType="period"
                    onDayPress={(day: any) => {
                      if (statementDateTarget === "start") {
                        setStatementStartDate(day.dateString);
                        setStatementDateTarget("end");
                      } else {
                        setStatementEndDate(day.dateString);
                      }
                    }}
                    theme={{
                      todayTextColor: Colors.primary,
                      selectedDayBackgroundColor: Colors.primary,
                      arrowColor: Colors.primary,
                      textDayFontWeight: "600",
                      textMonthFontWeight: "900",
                    }}
                  />
                </View>
              )}

              <View style={styles.statementBrandCard}>
                <View
                  style={[
                    styles.statementBrandLogo,
                    {
                      borderColor:
                        statementTemplate?.primary_color || Colors.primary,
                    },
                  ]}
                >
                  {statementLogo ? (
                    <Image source={{ uri: statementLogo }} style={styles.statementBrandImage} />
                  ) : (
                    <Ionicons name="business-outline" size={23} color={Colors.primary} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.statementBrandName} numberOfLines={1}>
                    {statementBrandName}
                  </Text>
                  <Text style={styles.statementBrandSub} numberOfLines={1}>
                    {statementBrandSub}
                  </Text>
                  <Text style={styles.statementBrandMeta} numberOfLines={2}>
                    {[statementTemplate?.phone, statementTemplate?.email]
                      .filter(Boolean)
                      .join(" · ") || "Template details will appear on PDF."}
                  </Text>
                </View>
              </View>

              <View style={styles.statementInfoBox}>
                <Ionicons name="document-text-outline" size={19} color={Colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.statementInfoTitle}>PDF statement</Text>
                  <Text style={styles.statementInfoText}>
                    Includes credits, debits, transaction dates, descriptions and running balance.
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.statementDownloadBtn,
                  downloadingStatement && styles.statementDownloadBtnDisabled,
                ]}
                onPress={downloadStatement}
                disabled={downloadingStatement}
                activeOpacity={0.86}
              >
                <Ionicons name="download-outline" size={18} color="#fff" />
                <Text style={styles.statementDownloadText}>
                  {downloadingStatement ? "Preparing PDF..." : "Download Statement"}
                </Text>
              </TouchableOpacity>
            </ScrollView>
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

// ─── Styles ──────────────────────────────────────────────────────────────────
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
  heroInfoLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.72)",
    fontWeight: "700",
  },
  heroInfoValue: {
    fontSize: 13,
    color: "#fff",
    fontWeight: "900",
    marginTop: 2,
  },
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
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: "#1A1A1A" },
  sectionSub: { fontSize: 12, color: "#bbb", fontWeight: "500" },
  statementBtn: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 11,
    borderRadius: 12,
    backgroundColor: "#FFF7F2",
    borderWidth: 1,
    borderColor: Colors.primary + "28",
  },
  statementBtnText: {
    fontSize: 12,
    fontWeight: "900",
    color: Colors.primary,
  },

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

  // ── Modal shell ──
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    // No fixed height — grows with content, shrinks when keyboard opens
    maxHeight: "92%",
    // Horizontal padding on the shell; vertical padding lives in the scroll content
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  // Padding inside the ScrollView so nothing touches the edges
  sheetScrollContent: {
    paddingBottom: 24,
  },

  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#E0E0E0",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#1A1A1A" },
  statementPeriodText: {
    fontSize: 11.5,
    color: "#8A8A8A",
    fontWeight: "700",
    marginTop: 3,
  },
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

  modeTabs: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#F5F5F5",
    borderRadius: 16,
    padding: 5,
    marginBottom: 14,
  },
  modeTab: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  modeTabActive: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  modeTabText: { fontSize: 13, fontWeight: "800", color: Colors.primary },
  modeTabTextActive: { color: "#fff" },

  onlineBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFF7F2",
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.primary + "26",
  },
  onlineIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },

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
  qrImage: { width: 86, height: 86, borderRadius: 12, backgroundColor: "#fff" },
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
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "center",
    padding: 20,
    zIndex: 50,
  },
  previewCard: { backgroundColor: "#fff", borderRadius: 24, padding: 18 },
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
  statementSheetContent: { paddingBottom: 24 },
  statementOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  statementChip: {
    minHeight: 38,
    paddingHorizontal: 13,
    borderRadius: 13,
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#ECECEC",
    justifyContent: "center",
  },
  statementChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  statementChipText: { fontSize: 12, fontWeight: "900", color: "#777" },
  statementChipTextActive: { color: "#fff" },
  customDateBox: {
    backgroundColor: "#FAFAFA",
    borderRadius: 18,
    padding: 10,
    borderWidth: 1,
    borderColor: "#EFEFEF",
    marginBottom: 14,
  },
  datePickRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  datePickCard: {
    flex: 1,
    minHeight: 56,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#EFEFEF",
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  datePickCardActive: {
    borderColor: Colors.primary,
    backgroundColor: "#FFF7F2",
  },
  datePickLabel: {
    fontSize: 10,
    fontWeight: "900",
    color: "#999",
    textTransform: "uppercase",
    marginBottom: 3,
  },
  datePickValue: { fontSize: 13, fontWeight: "900", color: "#1A1A1A" },
  statementBrandCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.primary + "22",
    padding: 12,
    marginBottom: 14,
  },
  statementBrandLogo: {
    width: 54,
    height: 54,
    borderRadius: 16,
    borderWidth: 1.5,
    backgroundColor: "#FFF7F2",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  statementBrandImage: { width: "100%", height: "100%" },
  statementBrandName: { fontSize: 14.5, fontWeight: "900", color: "#1A1A1A" },
  statementBrandSub: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#777",
    marginTop: 2,
  },
  statementBrandMeta: {
    fontSize: 10.5,
    fontWeight: "600",
    color: "#888",
    marginTop: 4,
    lineHeight: 14,
  },
  statementInfoBox: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#FFF7F2",
    borderRadius: 16,
    padding: 13,
    borderWidth: 1,
    borderColor: Colors.primary + "22",
    marginBottom: 14,
  },
  statementInfoTitle: { fontSize: 13.5, fontWeight: "900", color: "#1A1A1A" },
  statementInfoText: {
    fontSize: 11.5,
    color: "#777",
    fontWeight: "600",
    lineHeight: 16,
    marginTop: 2,
  },
  statementDownloadBtn: {
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  statementDownloadBtnDisabled: { opacity: 0.65 },
  statementDownloadText: { fontSize: 15, fontWeight: "900", color: "#fff" },
});
