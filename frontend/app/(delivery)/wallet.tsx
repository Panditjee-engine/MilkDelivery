import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Animated,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../../src/contexts/AuthContext";
import { api } from "../../src/services/api";

interface Transaction {
  id: string;
  amount: number;
  type: "credit" | "debit";
  description: string;
  balance_after: number;
  created_at: string;
}
interface BankAccount {
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  upiId?: string;
}
interface WithdrawalRecord {
  id: string;
  amount: number;
  status: "pending" | "processing" | "completed" | "rejected";
  created_at: string;
  bank_account: { bankName: string; accountNumber: string };
}

function formatCurrency(amount: number) {
  return `₹${Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function formatDate(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}
const STATUS_CONFIG: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  pending: { bg: "#FFF8E8", text: "#854F0B", label: "Pending" },
  processing: { bg: "#FFF8E8", text: "#854F0B", label: "Processing" },
  completed: { bg: "#E1F5EE", text: "#0F6E56", label: "Completed" },
  rejected: { bg: "#FCEBEB", text: "#A32D2D", label: "Rejected" },
};

// ── Bank Modal 
interface BankModalProps {
  visible: boolean;
  existing: BankAccount | null;
  onDismiss: () => void;
  onSuccess: (b: BankAccount) => void;
}

function BankModal({
  visible,
  existing,
  onDismiss,
  onSuccess,
}: BankModalProps) {
  const holderRef = useRef<TextInput>(null);
  const accountRef = useRef<TextInput>(null);
  const ifscRef = useRef<TextInput>(null);
  const bankRef = useRef<TextInput>(null);
  const upiRef = useRef<TextInput>(null);
  const holderVal = useRef("");
  const accountVal = useRef("");
  const ifscVal = useRef("");
  const bankVal = useRef("");
  const upiVal = useRef("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(100)).current;

  useEffect(() => {
    if (visible) {
      holderVal.current = existing?.accountHolderName ?? "";
      accountVal.current = existing?.accountNumber ?? "";
      ifscVal.current = existing?.ifscCode ?? "";
      bankVal.current = existing?.bankName ?? "";
      upiVal.current = existing?.upiId ?? "";
      setTimeout(() => {
        holderRef.current?.setNativeProps({ text: holderVal.current });
        accountRef.current?.setNativeProps({ text: accountVal.current });
        ifscRef.current?.setNativeProps({ text: ifscVal.current });
        bankRef.current?.setNativeProps({ text: bankVal.current });
        upiRef.current?.setNativeProps({ text: upiVal.current });
      }, 60);
      setError("");
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 180,
          friction: 12,
        }),
      ]).start();
    } else {
      opacityAnim.setValue(0);
      slideAnim.setValue(100);
    }
  }, [visible]);

  const handleSave = async () => {
    if (
      !holderVal.current.trim() ||
      !accountVal.current.trim() ||
      !ifscVal.current.trim() ||
      !bankVal.current.trim()
    ) {
      setError("Please fill all required fields");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const payload: BankAccount = {
        accountHolderName: holderVal.current.trim(),
        accountNumber: accountVal.current.trim(),
        ifscCode: ifscVal.current.trim().toUpperCase(),
        bankName: bankVal.current.trim(),
        upiId: upiVal.current.trim() || undefined,
      };
      await api.saveBankAccount(payload);
      onSuccess(payload);
      onDismiss();
    } catch (e: any) {
      setError(e.message ?? "Failed to save bank account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <Animated.View style={[bm.overlay, { opacity: opacityAnim }]}>
          <Animated.View
            style={[bm.sheet, { transform: [{ translateY: slideAnim }] }]}
          >
            <View style={bm.header}>
              <View style={bm.headerIcon}>
                <Ionicons name="card-outline" size={18} color="#FF9675" />
              </View>
              <Text style={bm.title}>
                {existing ? "Update bank account" : "Add bank account"}
              </Text>
              <TouchableOpacity onPress={onDismiss} style={bm.closeBtn}>
                <Ionicons name="close" size={20} color="#888" />
              </TouchableOpacity>
            </View>
            <View>
              <Text style={bm.label}>Account holder name *</Text>
              <TextInput
                ref={holderRef}
                style={bm.input}
                defaultValue={existing?.accountHolderName ?? ""}
                onChangeText={(v) => {
                  holderVal.current = v;
                }}
                placeholder="Full name as per bank"
                placeholderTextColor="#ccc"
                returnKeyType="next"
                onSubmitEditing={() => accountRef.current?.focus()}
                blurOnSubmit={false}
              />

              <Text style={bm.label}>Account number *</Text>
              <TextInput
                ref={accountRef}
                style={bm.input}
                defaultValue={existing?.accountNumber ?? ""}
                onChangeText={(v) => {
                  accountVal.current = v;
                }}
                placeholder="Enter account number"
                placeholderTextColor="#ccc"
                keyboardType="numeric"
                returnKeyType="next"
                onSubmitEditing={() => ifscRef.current?.focus()}
                blurOnSubmit={false}
              />

              <Text style={bm.label}>IFSC code *</Text>
              <TextInput
                ref={ifscRef}
                style={bm.input}
                defaultValue={existing?.ifscCode ?? ""}
                onChangeText={(v) => {
                  ifscVal.current = v.toUpperCase();
                }}
                placeholder="e.g. SBIN0001234"
                placeholderTextColor="#ccc"
                autoCapitalize="characters"
                returnKeyType="next"
                onSubmitEditing={() => bankRef.current?.focus()}
                blurOnSubmit={false}
              />

              <Text style={bm.label}>Bank name *</Text>
              <TextInput
                ref={bankRef}
                style={bm.input}
                defaultValue={existing?.bankName ?? ""}
                onChangeText={(v) => {
                  bankVal.current = v;
                }}
                placeholder="e.g. State Bank of India"
                placeholderTextColor="#ccc"
                returnKeyType="next"
                onSubmitEditing={() => upiRef.current?.focus()}
                blurOnSubmit={false}
              />

              <Text style={bm.label}>
                UPI ID{" "}
                <Text style={{ color: "#ccc", fontWeight: "400" }}>
                  (optional)
                </Text>
              </Text>
              <TextInput
                ref={upiRef}
                style={bm.input}
                defaultValue={existing?.upiId ?? ""}
                onChangeText={(v) => {
                  upiVal.current = v;
                }}
                placeholder="yourname@upi"
                placeholderTextColor="#ccc"
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={handleSave}
              />

              {error ? (
                <View style={bm.errorRow}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={13}
                    color="#A32D2D"
                  />
                  <Text style={bm.errorText}>{error}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[bm.saveBtn, loading && { opacity: 0.55 }]}
                onPress={handleSave}
                disabled={loading}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={["#FF9675", "#e07050"]}
                  style={bm.saveGrad}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color="#fff"
                      />
                      <Text style={bm.saveText}>Save bank account</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const bm = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: Platform.OS === "ios" ? 42 : 28,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 18,
  },
  headerIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#FFF0E8",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { flex: 1, fontSize: 17, fontWeight: "800", color: "#1a1a1a" },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f5f5f0",
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#888",
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#f0ede8",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
    backgroundColor: "#FFFAF8",
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  errorText: { fontSize: 12, color: "#A32D2D", fontWeight: "500" },
  saveBtn: { borderRadius: 16, overflow: "hidden", marginTop: 18 },
  saveGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  saveText: { fontSize: 15, fontWeight: "800", color: "#fff" },
});

// ── Withdraw Modal 
interface WithdrawModalProps {
  visible: boolean;
  balance: number;
  bankAccount: BankAccount | null;
  onDismiss: () => void;
  onSuccess: () => void;
}

function WithdrawModal({
  visible,
  balance,
  bankAccount,
  onDismiss,
  onSuccess,
}: WithdrawModalProps) {
  const amountRef = useRef<TextInput>(null);
  const amountVal = useRef("");
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(100)).current;

  useEffect(() => {
    if (visible) {
      amountVal.current = "";
      setSelected(null);
      setError("");
      setTimeout(() => amountRef.current?.setNativeProps({ text: "" }), 60);
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 180,
          friction: 12,
        }),
      ]).start();
    } else {
      opacityAnim.setValue(0);
      slideAnim.setValue(100);
    }
  }, [visible]);

  const pickQuick = (q: number) => {
    setSelected(q);
    amountVal.current = String(q);
    amountRef.current?.setNativeProps({ text: String(q) });
    setError("");
  };

  const handleWithdraw = async () => {
    const amt = parseFloat(amountVal.current);
    if (!amt || amt <= 0) {
      setError("Enter a valid amount");
      return;
    }
    if (amt < 100) {
      setError("Minimum withdrawal is ₹100");
      return;
    }
    if (amt > balance) {
      setError("Insufficient balance");
      return;
    }
    if (!bankAccount) {
      setError("Please add a bank account first");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.requestWithdrawal(amt);
      onSuccess();
      onDismiss();
    } catch (e: any) {
      setError(e.message ?? "Withdrawal failed");
    } finally {
      setLoading(false);
    }
  };

  const QUICK = [500, 1000, 2000, 5000];
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <Animated.View style={[wdm.overlay, { opacity: opacityAnim }]}>
          <Animated.View
            style={[wdm.sheet, { transform: [{ translateY: slideAnim }] }]}
          >
            <View style={wdm.header}>
              <View style={wdm.headerIcon}>
                <Ionicons
                  name="arrow-up-circle-outline"
                  size={18}
                  color="#FF9675"
                />
              </View>
              <Text style={wdm.title}>Withdraw earnings</Text>
              <TouchableOpacity onPress={onDismiss} style={wdm.closeBtn}>
                <Ionicons name="close" size={20} color="#888" />
              </TouchableOpacity>
            </View>
            <View style={wdm.balancePill}>
              <View>
                <Text style={wdm.balLabel}>Available balance</Text>
                <Text style={wdm.balVal}>{formatCurrency(balance)}</Text>
              </View>
              <Ionicons name="wallet-outline" size={22} color="#FF9675" />
            </View>
            {bankAccount ? (
              <View style={wdm.bankRow}>
                <View style={wdm.bankIcon}>
                  <Ionicons name="card-outline" size={15} color="#FF9675" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={wdm.bankName}>{bankAccount.bankName}</Text>
                  <Text style={wdm.bankNum}>
                    •••• {bankAccount.accountNumber.slice(-4)}
                  </Text>
                </View>
                <View style={wdm.savedBadge}>
                  <Text style={wdm.savedText}>Saved</Text>
                </View>
              </View>
            ) : (
              <View style={[wdm.bankRow, { backgroundColor: "#FFF8E8" }]}>
                <Ionicons
                  name="alert-circle-outline"
                  size={15}
                  color="#BA7517"
                />
                <Text style={{ fontSize: 12, color: "#BA7517", marginLeft: 8 }}>
                  No bank account added yet
                </Text>
              </View>
            )}
            <Text style={wdm.label}>Enter amount</Text>
            <View style={wdm.inputRow}>
              <Text style={wdm.rupee}>₹</Text>
              <TextInput
                ref={amountRef}
                style={wdm.input}
                defaultValue=""
                onChangeText={(v) => {
                  amountVal.current = v;
                  setSelected(null);
                  setError("");
                }}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor="#ddd"
                returnKeyType="done"
                onSubmitEditing={handleWithdraw}
                maxLength={7}
              />
            </View>
            <View style={wdm.quickRow}>
              {QUICK.map((q) => (
                <TouchableOpacity
                  key={q}
                  style={[wdm.quickChip, selected === q && wdm.quickChipOn]}
                  onPress={() => pickQuick(q)}
                >
                  <Text
                    style={[wdm.quickText, selected === q && wdm.quickTextOn]}
                  >
                    ₹{q >= 1000 ? `${q / 1000}K` : q}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {error ? (
              <View style={wdm.errorRow}>
                <Ionicons
                  name="alert-circle-outline"
                  size={13}
                  color="#A32D2D"
                />
                <Text style={wdm.errorText}>{error}</Text>
              </View>
            ) : null}
            <TouchableOpacity
              style={[wdm.confirmBtn, loading && { opacity: 0.55 }]}
              onPress={handleWithdraw}
              disabled={loading}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={["#FF9675", "#e07050"]}
                style={wdm.confirmGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="arrow-up-circle" size={18} color="#fff" />
                    <Text style={wdm.confirmText}>Withdraw now</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
            <Text style={wdm.note}>
              Amount credited to your bank within 24 hours
            </Text>
          </Animated.View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const wdm = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: Platform.OS === "ios" ? 42 : 28,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 18,
  },
  headerIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#FFF0E8",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { flex: 1, fontSize: 17, fontWeight: "800", color: "#1a1a1a" },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f5f5f0",
    alignItems: "center",
    justifyContent: "center",
  },
  balancePill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFF5F0",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#FFE0D0",
  },
  balLabel: {
    fontSize: 12,
    color: "#BB6B3F",
    fontWeight: "600",
    marginBottom: 3,
  },
  balVal: { fontSize: 18, fontWeight: "800", color: "#FF9675" },
  bankRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFF8F4",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FFE8DC",
  },
  bankIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#FF967518",
    alignItems: "center",
    justifyContent: "center",
  },
  bankName: { fontSize: 13, fontWeight: "700", color: "#1a1a1a" },
  bankNum: { fontSize: 11, color: "#8B6854", marginTop: 1 },
  savedBadge: {
    backgroundColor: "#E1F5EE",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  savedText: { fontSize: 11, color: "#0F6E56", fontWeight: "700" },
  label: { fontSize: 12, fontWeight: "700", color: "#888", marginBottom: 8 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#FFD0B8",
    borderRadius: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    backgroundColor: "#FFFAF8",
  },
  rupee: { fontSize: 22, fontWeight: "800", color: "#FF9675", marginRight: 6 },
  input: {
    flex: 1,
    fontSize: 26,
    fontWeight: "800",
    color: "#1a1a1a",
    paddingVertical: 13,
  },
  quickRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  quickChip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "#f5f5f0",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  quickChipOn: { backgroundColor: "#FFF0E8", borderColor: "#FF9675" },
  quickText: { fontSize: 13, fontWeight: "700", color: "#888" },
  quickTextOn: { color: "#FF9675" },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  errorText: { fontSize: 12, color: "#A32D2D", fontWeight: "500" },
  confirmBtn: { borderRadius: 16, overflow: "hidden", marginBottom: 12 },
  confirmGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  confirmText: { fontSize: 15, fontWeight: "800", color: "#fff" },
  note: { fontSize: 11, color: "#bbb", textAlign: "center", fontWeight: "500" },
});

// ── Main Screen 
export default function RiderWalletScreen() {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>([]);
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<"transactions" | "withdrawals">(
    "transactions",
  );
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showBank, setShowBank] = useState(false);
  const balAnim = useRef(new Animated.Value(0)).current;
  const [dispBal, setDispBal] = useState(0);

  const fetchAll = useCallback(async () => {
    try {
      const [walletRes, txRes, wdRes] = await Promise.all([
        api.getWallet(),
        api.getWalletTransactions(),
        api.getWithdrawalHistory().catch(() => []),
      ]);
      const bal = walletRes?.balance ?? 0;
      setBalance(bal);
      setTransactions(txRes ?? []);
      setWithdrawals((wdRes ?? []) as WithdrawalRecord[]);
      Animated.timing(balAnim, {
        toValue: bal,
        duration: 900,
        useNativeDriver: false,
      }).start();
      try {
        const bank = await api.getBankAccount();
        setBankAccount(bank);
      } catch {
        setBankAccount(null);
      }
    } catch (e) {
      console.log("wallet fetch error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, []);
  useEffect(() => {
    const id = balAnim.addListener(({ value }) => setDispBal(value));
    return () => balAnim.removeListener(id);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAll();
  };
  const todayStr = new Date().toISOString().split("T")[0];
  const todayEarnings = transactions
    .filter(
      (t) =>
        t.type === "credit" &&
        t.created_at?.startsWith(todayStr) &&
        t.description?.toLowerCase().includes("delivered"),
    )
    .reduce((s, t) => s + t.amount, 0);
  const totalDeliveries = transactions.filter(
    (t) =>
      t.type === "credit" && t.description?.toLowerCase().includes("delivered"),
  ).length;
  const pendingPayout = withdrawals
    .filter((w) => w.status === "pending" || w.status === "processing")
    .reduce((s, w) => s + w.amount, 0);
  const initials = (user?.name ?? "RD")
    .split(" ")
    .map((w: string) => w[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);

  if (loading)
    return (
      <View style={s.loadingWrap}>
        <ActivityIndicator size="large" color="#FF9675" />
        <Text style={s.loadingText}>Loading wallet…</Text>
      </View>
    );

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <WithdrawModal
        visible={showWithdraw}
        balance={balance}
        bankAccount={bankAccount}
        onDismiss={() => setShowWithdraw(false)}
        onSuccess={fetchAll}
      />
      <BankModal
        visible={showBank}
        existing={bankAccount}
        onDismiss={() => setShowBank(false)}
        onSuccess={(b) => {
          setBankAccount(b);
        }}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FF9675"
          />
        }
      >
        <LinearGradient colors={["#FF9675", "#d96040"]} style={s.hero}>
          <View style={s.heroTop}>
            <View>
              <Text style={s.heroSub}>My wallet</Text>
              <Text style={s.heroName}>{user?.name ?? "Rider"}</Text>
            </View>
            <View style={s.avatar}>
              <Text style={s.avatarTxt}>{initials}</Text>
            </View>
          </View>
          <Text style={s.balLabel}>Total earnings</Text>
          <Text style={s.balVal}>
            ₹
            {dispBal.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
          <Text style={s.balSub}>Available to withdraw</Text>
          <View style={s.actionRow}>
            <TouchableOpacity
              style={s.actionBtn}
              onPress={() => setShowWithdraw(true)}
              activeOpacity={0.8}
            >
              <View style={s.actionIcon}>
                <Ionicons
                  name="arrow-up-circle-outline"
                  size={22}
                  color="#fff"
                />
              </View>
              <Text style={s.actionLbl}>Withdraw</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.actionBtn}
              onPress={() => setShowBank(true)}
              activeOpacity={0.8}
            >
              <View style={s.actionIcon}>
                <Ionicons name="card-outline" size={22} color="#fff" />
              </View>
              <Text style={s.actionLbl}>
                {bankAccount ? "Bank details" : "Add bank"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.actionBtn}
              onPress={() => setTab("withdrawals")}
              activeOpacity={0.8}
            >
              <View style={s.actionIcon}>
                <Ionicons name="document-text-outline" size={22} color="#fff" />
              </View>
              <Text style={s.actionLbl}>Payouts</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <View style={s.body}>
          {!bankAccount && (
            <TouchableOpacity
              style={s.bankWarn}
              onPress={() => setShowBank(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="alert-circle-outline" size={16} color="#854F0B" />
              <Text style={s.bankWarnTxt}>
                Add a bank account to withdraw your earnings
              </Text>
              <Ionicons name="chevron-forward" size={14} color="#854F0B" />
            </TouchableOpacity>
          )}

          <View style={s.grid}>
            <View style={s.statCard}>
              <Text style={s.statLbl}>Today's earnings</Text>
              <Text style={[s.statVal, { color: "#1D9E75" }]}>
                {formatCurrency(todayEarnings)}
              </Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statLbl}>Pending payout</Text>
              <Text style={[s.statVal, { color: "#BA7517" }]}>
                {formatCurrency(pendingPayout)}
              </Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statLbl}>Total deliveries</Text>
              <Text style={s.statVal}>{totalDeliveries}</Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statLbl}>Withdrawals</Text>
              <Text style={s.statVal}>{withdrawals.length}</Text>
            </View>
          </View>

          <View style={s.tabRow}>
            {(["transactions", "withdrawals"] as const).map((t) => (
              <TouchableOpacity
                key={t}
                style={[s.tabChip, tab === t && s.tabChipOn]}
                onPress={() => setTab(t)}
              >
                <Text style={[s.tabTxt, tab === t && s.tabTxtOn]}>
                  {t === "transactions" ? "Transactions" : "Payouts"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {tab === "transactions" && (
            <View style={s.listCard}>
              {transactions.length === 0 ? (
                <View style={s.empty}>
                  <Ionicons name="wallet-outline" size={40} color="#e0d8d0" />
                  <Text style={s.emptyTxt}>No transactions yet</Text>
                </View>
              ) : (
                transactions.slice(0, 50).map((tx, i) => {
                  const cr = tx.type === "credit";
                  return (
                    <View
                      key={tx.id ?? i}
                      style={[
                        s.txRow,
                        i === Math.min(transactions.length, 50) - 1 && {
                          borderBottomWidth: 0,
                        },
                      ]}
                    >
                      <View
                        style={[
                          s.txIcon,
                          { backgroundColor: cr ? "#E1F5EE" : "#FCEBEB" },
                        ]}
                      >
                        <Ionicons
                          name={cr ? "arrow-down-circle" : "arrow-up-circle"}
                          size={20}
                          color={cr ? "#1D9E75" : "#E24B4A"}
                        />
                      </View>
                      <View style={s.txInfo}>
                        <Text style={s.txDesc} numberOfLines={1}>
                          {tx.description}
                        </Text>
                        <Text style={s.txTime}>
                          {formatDate(tx.created_at)}
                        </Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text
                          style={[
                            s.txAmt,
                            { color: cr ? "#1D9E75" : "#E24B4A" },
                          ]}
                        >
                          {cr ? "+" : "-"}
                          {formatCurrency(tx.amount)}
                        </Text>
                        <Text style={s.txBal}>
                          Bal: {formatCurrency(tx.balance_after)}
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}

          {tab === "withdrawals" && (
            <View style={s.listCard}>
              {withdrawals.length === 0 ? (
                <View style={s.empty}>
                  <Ionicons name="cash-outline" size={40} color="#e0d8d0" />
                  <Text style={s.emptyTxt}>No withdrawals yet</Text>
                  <TouchableOpacity
                    style={s.emptyBtn}
                    onPress={() => setShowWithdraw(true)}
                  >
                    <Text style={s.emptyBtnTxt}>Withdraw now</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                withdrawals.map((wd, i) => {
                  const sc = STATUS_CONFIG[wd.status] ?? STATUS_CONFIG.pending;
                  return (
                    <View
                      key={wd.id ?? i}
                      style={[
                        s.txRow,
                        i === withdrawals.length - 1 && {
                          borderBottomWidth: 0,
                        },
                      ]}
                    >
                      <View style={[s.txIcon, { backgroundColor: "#FFF5F0" }]}>
                        <Ionicons
                          name="arrow-up-circle"
                          size={20}
                          color="#FF9675"
                        />
                      </View>
                      <View style={s.txInfo}>
                        <Text style={s.txDesc}>
                          {wd.bank_account.bankName} ···
                          {wd.bank_account.accountNumber.slice(-4)}
                        </Text>
                        <Text style={s.txTime}>
                          {formatDate(wd.created_at)}
                        </Text>
                        <View style={[s.pill, { backgroundColor: sc.bg }]}>
                          <Text style={[s.pillTxt, { color: sc.text }]}>
                            {sc.label}
                          </Text>
                        </View>
                      </View>
                      <Text style={[s.txAmt, { color: "#E24B4A" }]}>
                        -{formatCurrency(wd.amount)}
                      </Text>
                    </View>
                  );
                })
              )}
            </View>
          )}

          <View style={{ height: 50 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF8F4" },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF8F4",
    gap: 12,
  },
  loadingText: { fontSize: 14, color: "#BB6B3F", fontWeight: "500" },
  hero: { paddingTop: 20, paddingHorizontal: 20, paddingBottom: 28 },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 22,
  },
  heroSub: { fontSize: 13, color: "rgba(255,255,255,0.75)", fontWeight: "500" },
  heroName: { fontSize: 20, fontWeight: "800", color: "#fff" },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarTxt: { fontSize: 16, fontWeight: "700", color: "#fff" },
  balLabel: {
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
    fontWeight: "500",
    marginBottom: 4,
  },
  balVal: { fontSize: 40, fontWeight: "900", color: "#fff", letterSpacing: -1 },
  balSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    marginBottom: 22,
    fontWeight: "500",
  },
  actionRow: { flexDirection: "row", gap: 10 },
  actionBtn: { flex: 1, alignItems: "center", gap: 7 },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  actionLbl: { fontSize: 11, color: "#fff", fontWeight: "700" },
  body: { padding: 16 },
  bankWarn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FAEEDA",
    borderRadius: 12,
    padding: 13,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#EF9F2720",
  },
  bankWarnTxt: { flex: 1, fontSize: 12, color: "#854F0B", fontWeight: "600" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 18 },
  statCard: {
    width: "47.5%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  statLbl: { fontSize: 11, color: "#aaa", fontWeight: "600", marginBottom: 6 },
  statVal: { fontSize: 19, fontWeight: "800", color: "#1a1a1a" },
  tabRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  tabChip: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  tabChipOn: { backgroundColor: "#FF967512", borderColor: "#FF9675" },
  tabTxt: { fontSize: 13, fontWeight: "600", color: "#8B6854" },
  tabTxtOn: { color: "#FF9675" },
  listCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#FFF0E8",
  },
  txIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  txInfo: { flex: 1 },
  txDesc: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 2,
  },
  txTime: { fontSize: 11, color: "#aaa" },
  txAmt: { fontSize: 14, fontWeight: "800" },
  txBal: { fontSize: 10, color: "#ccc", marginTop: 2 },
  pill: {
    alignSelf: "flex-start",
    marginTop: 5,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  pillTxt: { fontSize: 10, fontWeight: "700" },
  empty: { alignItems: "center", paddingVertical: 40, gap: 10 },
  emptyTxt: { fontSize: 14, color: "#ccc", fontWeight: "600" },
  emptyBtn: {
    marginTop: 4,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#FFF0E8",
  },
  emptyBtnTxt: { fontSize: 13, color: "#FF9675", fontWeight: "700" },
});
