import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../src/services/api";
import LoadingScreen from "../../src/components/LoadingScreen";

// ── Palette 
const C = {
  bg: "#FFF8F4",
  card: "#fff",
  primary: "#FF9675",
  dark: "#BB6B3F",
  accent: "#8B6854",
  muted: "#A07850",
  light: "#C9A882",
  amber: "#FFBF55",
  warn: "#FFF8E8",
  peach: "#FFF3E8",
  deepPeach: "#FFE8D6",
  text: "#1A1A1A",
  textSub: "#8B6854",
};

// ── Custom Alert 
type AlertBtn = {
  text: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void;
};
type AlertCfg = {
  visible: boolean;
  icon?: string;
  iconColor?: string;
  title: string;
  message?: string;
  buttons: AlertBtn[];
};

function CustomAlert({
  cfg,
  onDismiss,
}: {
  cfg: AlertCfg;
  onDismiss: () => void;
}) {
  if (!cfg.visible) return null;
  return (
    <Modal
      transparent
      animationType="fade"
      visible={cfg.visible}
      onRequestClose={onDismiss}
    >
      <View style={aS.overlay}>
        <View style={aS.box}>
          <View
            style={[
              aS.iconWrap,
              {
                backgroundColor: cfg.iconColor
                  ? cfg.iconColor + "22"
                  : "#FFE8D6",
              },
            ]}
          >
            <Ionicons
              name={(cfg.icon as any) ?? "information-circle-outline"}
              size={28}
              color={cfg.iconColor ?? C.dark}
            />
          </View>
          <Text style={aS.title}>{cfg.title}</Text>
          {cfg.message ? <Text style={aS.msg}>{cfg.message}</Text> : null}
          <View
            style={[
              aS.btnRow,
              cfg.buttons.length === 1 && { justifyContent: "center" },
            ]}
          >
            {cfg.buttons.map((b, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  aS.btn,
                  b.style === "destructive" && aS.btnDest,
                  b.style === "cancel" && aS.btnCancel,
                  cfg.buttons.length === 1 && { flex: 1 },
                ]}
                activeOpacity={0.75}
                onPress={() => {
                  onDismiss();
                  b.onPress?.();
                }}
              >
                <Text
                  style={[
                    aS.btnTxt,
                    b.style === "destructive" && aS.btnTxtDest,
                    b.style === "cancel" && aS.btnTxtCancel,
                  ]}
                >
                  {b.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function useAlert() {
  const [cfg, setCfg] = useState<AlertCfg>({
    visible: false,
    title: "",
    buttons: [],
  });
  const show = (
    title: string,
    message?: string,
    buttons?: AlertBtn[],
    icon?: string,
    iconColor?: string,
  ) =>
    setCfg({
      visible: true,
      title,
      message,
      buttons: buttons ?? [{ text: "OK" }],
      icon,
      iconColor,
    });
  const dismiss = () => setCfg((p) => ({ ...p, visible: false }));
  return { cfg, show, dismiss };
}

// ── Bank Account Modal 
type BankAccount = {
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  upiId?: string;
};

function BankModal({
  visible,
  existing,
  onClose,
  onSave,
}: {
  visible: boolean;
  existing: BankAccount | null;
  onClose: () => void;
  onSave: (data: BankAccount) => void;
}) {
  const [form, setForm] = useState<BankAccount>({
    accountHolderName: "",
    accountNumber: "",
    ifscCode: "",
    bankName: "",
    upiId: "",
  });
  const { cfg: alertCfg, show: showAlert, dismiss: dismissAlert } = useAlert();

  useEffect(() => {
    if (existing) setForm(existing);
    else
      setForm({
        accountHolderName: "",
        accountNumber: "",
        ifscCode: "",
        bankName: "",
        upiId: "",
      });
  }, [existing, visible]);

  const set = (k: keyof BankAccount) => (v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

  const handleSave = () => {
    if (
      !form.accountHolderName.trim() ||
      !form.accountNumber.trim() ||
      !form.ifscCode.trim() ||
      !form.bankName.trim()
    ) {
      showAlert(
        "Missing Fields",
        "Please fill all required bank details.",
        undefined,
        "alert-circle-outline",
        C.amber,
      );
      return;
    }
    if (!/^\d{9,18}$/.test(form.accountNumber.trim())) {
      showAlert(
        "Invalid Account",
        "Account number must be 9–18 digits.",
        undefined,
        "alert-circle-outline",
        C.amber,
      );
      return;
    }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.ifscCode.trim().toUpperCase())) {
      showAlert(
        "Invalid IFSC",
        "Enter a valid IFSC code (e.g. SBIN0001234).",
        undefined,
        "alert-circle-outline",
        C.amber,
      );
      return;
    }
    onSave({ ...form, ifscCode: form.ifscCode.toUpperCase() });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <CustomAlert cfg={alertCfg} onDismiss={dismissAlert} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <View style={bS.overlay}>
          <View style={bS.sheet}>
            <View style={bS.drag} />
            <View style={bS.hdr}>
              <Text style={bS.title}>
                {existing ? "Edit Bank Account" : "Add Bank Account"}
              </Text>
              <TouchableOpacity style={bS.closeBtn} onPress={onClose}>
                <Ionicons name="close" size={16} color={C.dark} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {[
                {
                  label: "Account Holder Name *",
                  key: "accountHolderName",
                  placeholder: "Full name as on bank account",
                },
                {
                  label: "Bank Name *",
                  key: "bankName",
                  placeholder: "e.g. State Bank of India",
                },
                {
                  label: "Account Number *",
                  key: "accountNumber",
                  placeholder: "Enter account number",
                  keyboard: "numeric",
                },
                {
                  label: "IFSC Code *",
                  key: "ifscCode",
                  placeholder: "e.g. SBIN0001234",
                  caps: true,
                },
                {
                  label: "UPI ID (optional)",
                  key: "upiId",
                  placeholder: "e.g. name@upi",
                },
              ].map((f) => (
                <View key={f.key}>
                  <Text style={bS.label}>{f.label}</Text>
                  <TextInput
                    style={bS.input}
                    placeholder={f.placeholder}
                    placeholderTextColor={C.light}
                    value={form[f.key as keyof BankAccount]}
                    onChangeText={set(f.key as keyof BankAccount)}
                    keyboardType={(f.keyboard as any) ?? "default"}
                    autoCapitalize={f.caps ? "characters" : "words"}
                  />
                </View>
              ))}

              <TouchableOpacity
                style={bS.saveBtn}
                onPress={handleSave}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text style={bS.saveTxt}>
                  {existing ? "Update Account" : "Save Account"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={bS.cancelBtn} onPress={onClose}>
                <Text style={bS.cancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <View style={{ height: 24 }} />
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Withdraw Modal 
function WithdrawModal({
  visible,
  balance,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  balance: number;
  onClose: () => void;
  onSubmit: (amount: number) => void;
}) {
  const [amount, setAmount] = useState("");
  const { cfg: alertCfg, show: showAlert, dismiss: dismissAlert } = useAlert();

  const quickAmounts = [500, 1000, 2000, 5000];

  const handleSubmit = () => {
    const val = parseFloat(amount);
    if (!val || isNaN(val)) {
      showAlert(
        "Enter Amount",
        "Please enter the withdrawal amount.",
        undefined,
        "cash-outline",
        C.amber,
      );
      return;
    }
    if (val < 100) {
      showAlert(
        "Minimum ₹100",
        "Minimum withdrawal amount is ₹100.",
        undefined,
        "alert-circle-outline",
        C.amber,
      );
      return;
    }
    if (val > 100000) {
      showAlert(
        "Maximum ₹1,00,000",
        "Maximum withdrawal per request is ₹1,00,000.",
        undefined,
        "alert-circle-outline",
        C.amber,
      );
      return;
    }
    if (val > balance) {
      showAlert(
        "Insufficient Balance",
        `Your available balance is ₹${balance.toFixed(2)}.`,
        undefined,
        "wallet-outline",
        C.dark,
      );
      return;
    }
    onSubmit(val);
    setAmount("");
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <CustomAlert cfg={alertCfg} onDismiss={dismissAlert} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <View style={wS.overlay}>
          <View style={wS.sheet}>
            <View style={wS.drag} />
            <View style={wS.hdr}>
              <Text style={wS.title}>Withdraw Money</Text>
              <TouchableOpacity style={wS.closeBtn} onPress={onClose}>
                <Ionicons name="close" size={16} color={C.dark} />
              </TouchableOpacity>
            </View>

            {/* Balance pill */}
            <View style={wS.balancePill}>
              <Ionicons name="wallet-outline" size={14} color={C.dark} />
              <Text style={wS.balanceTxt}>
                Available:{" "}
                <Text style={{ fontWeight: "800" }}>₹{balance.toFixed(2)}</Text>
              </Text>
            </View>

            <Text style={wS.fieldLabel}>Enter Amount</Text>
            <View style={wS.amountRow}>
              <Text style={wS.rupee}>₹</Text>
              <TextInput
                style={wS.amountInput}
                placeholder="0"
                placeholderTextColor={C.light}
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
              />
            </View>

            <Text style={wS.limitNote}>Min ₹100 · Max ₹1,00,000</Text>

            {/* Quick select */}
            <View style={wS.quickRow}>
              {quickAmounts.map((q) => (
                <TouchableOpacity
                  key={q}
                  style={wS.quickChip}
                  onPress={() => setAmount(String(q))}
                >
                  <Text style={wS.quickTxt}>
                    ₹{q >= 1000 ? `${q / 1000}K` : q}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={wS.submitBtn}
              onPress={handleSubmit}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-up-circle" size={18} color="#fff" />
              <Text style={wS.submitTxt}>Request Withdrawal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={wS.cancelBtn} onPress={onClose}>
              <Text style={wS.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <View style={{ height: 24 }} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Main Screen 
export default function AdminWalletScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [filter, setFilter] = useState<"ALL" | "credit" | "debit">("ALL");
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null);
  const [showBank, setShowBank] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);

  const { cfg: alertCfg, show: showAlert, dismiss: dismissAlert } = useAlert();

  const fetchData = async () => {
    try {
      const [walletData, txData, bankData, withdrawalData] = await Promise.all([
        api.getWallet(),
        api.getWalletTransactions(),
        api.getBankAccount().catch(() => null),
        api.getWithdrawalHistory().catch(() => []),
      ]);
      setBalance(walletData.balance ?? 0);
      setTransactions(txData ?? []);
      setWithdrawals(withdrawalData ?? []);
      if (bankData) setBankAccount(bankData);
    } catch (e) {
      console.error("Error fetching wallet:", e);
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

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const statusMeta = (status: string) => {
    switch (status?.toLowerCase()) {
      case "pending":
        return {
          label: "Pending",
          color: C.amber,
          bg: C.warn,
          icon: "time-outline",
        };
      case "completed":
      case "approved":
        return {
          label: "Completed",
          color: "#22A06B",
          bg: "#E6F9F1",
          icon: "checkmark-circle-outline",
        };
      case "failed":
      case "rejected":
        return {
          label: "Failed",
          color: C.primary,
          bg: C.peach,
          icon: "close-circle-outline",
        };
      default:
        return {
          label: status ?? "Unknown",
          color: C.accent,
          bg: C.deepPeach,
          icon: "help-circle-outline",
        };
    }
  };

  const handleSaveBank = async (data: BankAccount) => {
    try {
      await api.saveBankAccount(data);
      setBankAccount(data);
      setShowBank(false);
      showAlert(
        "Account Saved",
        "Your bank account has been saved successfully.",
        undefined,
        "checkmark-circle",
        C.dark,
      );
    } catch (e: any) {
      showAlert(
        "Error",
        e.message,
        undefined,
        "alert-circle-outline",
        C.primary,
      );
    }
  };

  const handleWithdrawClick = () => {
    if (!bankAccount) {
      showAlert(
        "No Bank Account",
        "Please add a bank account before requesting a withdrawal.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Add Account",
            style: "default",
            onPress: () => setShowBank(true),
          },
        ],
        "bank-outline",
        C.dark,
      );
      return;
    }
    setShowWithdraw(true);
  };

  const handleWithdrawSubmit = async (amount: number) => {
    try {
      await api.requestWithdrawal(amount);
      setShowWithdraw(false);
      showAlert(
        "Request Submitted!",
        `₹${amount.toFixed(0)} withdrawal request received. Amount will be credited to your bank account within 24 hours.`,
        undefined,
        "checkmark-circle",
        C.dark,
      );
      fetchData();
    } catch (e: any) {
      showAlert(
        "Withdrawal Failed",
        e.message,
        undefined,
        "alert-circle-outline",
        C.primary,
      );
    }
  };

  if (loading) return <LoadingScreen />;

  const credits = transactions.filter((t) => t.type === "credit");
  const debits = transactions.filter((t) => t.type === "debit");
  const totalEarned = credits.reduce((s, t) => s + t.amount, 0);
  const totalRefunded = debits.reduce((s, t) => s + t.amount, 0);
  const todayStr = new Date().toDateString();
  const todayEarnings = credits
    .filter((t) => new Date(t.created_at).toDateString() === todayStr)
    .reduce((s, t) => s + t.amount, 0);

  const filteredTx =
    filter === "ALL"
      ? transactions
      : transactions.filter((t) => t.type === filter);

  // Withdrawal summary counts
  const pendingCount = withdrawals.filter(
    (w) => w.status?.toLowerCase() === "pending",
  ).length;
  const completedCount = withdrawals.filter((w) =>
    ["completed", "approved"].includes(w.status?.toLowerCase()),
  ).length;
  const totalWithdrawn = withdrawals
    .filter((w) => ["completed", "approved"].includes(w.status?.toLowerCase()))
    .reduce((s, w) => s + w.amount, 0);

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <CustomAlert cfg={alertCfg} onDismiss={dismissAlert} />

      <BankModal
        visible={showBank}
        existing={bankAccount}
        onClose={() => setShowBank(false)}
        onSave={handleSaveBank}
      />
      <WithdrawModal
        visible={showWithdraw}
        balance={balance}
        onClose={() => setShowWithdraw(false)}
        onSubmit={handleWithdrawSubmit}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.primary}
          />
        }
      >
        <View style={s.header}>
          <Text style={s.title}>Wallet</Text>
        </View>

        {/* ── Hero Card ── */}
        <View style={s.heroCard}>
          <View style={s.heroTop}>
            <Text style={s.heroLabel}>Total Balance</Text>
            <View style={s.walletBadge}>
              <Ionicons name="shield-checkmark" size={12} color="#fff" />
              <Text style={s.walletBadgeTxt}>Admin Wallet</Text>
            </View>
          </View>

          <Text style={s.heroAmount}>₹{balance.toFixed(2)}</Text>

          {/* Action buttons Withdraw and edit bank modal Enable for admin now commented */}
          {/* <View style={s.actionRow}>
            <TouchableOpacity
              style={s.actionBtn}
              onPress={handleWithdrawClick}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-up-circle" size={16} color={C.dark} />
              <Text style={s.actionBtnTxt}>Withdraw</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                s.actionBtn,
                { backgroundColor: "rgba(255,255,255,0.12)" },
              ]}
              onPress={() => setShowBank(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="card" size={16} color="rgba(255,255,255,0.9)" />
              <Text
                style={[s.actionBtnTxt, { color: "rgba(255,255,255,0.9)" }]}
              >
                {bankAccount ? "Edit Bank" : "Add Bank"}
              </Text>
            </TouchableOpacity>
          </View> */}

          <View style={s.heroStatsRow}>
            <View style={s.heroStat}>
              <View style={s.heroStatIcon}>
                <Ionicons name="arrow-down" size={12} color="#8B6854" />
              </View>
              <View>
                <Text style={s.heroStatLabel}>Total Earned</Text>
                <Text style={s.heroStatVal}>₹{totalEarned.toFixed(0)}</Text>
              </View>
            </View>
            <View style={s.heroStatDivider} />
            <View style={s.heroStat}>
              <View
                style={[
                  s.heroStatIcon,
                  { backgroundColor: "rgba(255,191,85,0.2)" },
                ]}
              >
                <Ionicons name="today" size={12} color="#FFBF55" />
              </View>
              <View>
                <Text style={s.heroStatLabel}>Today</Text>
                <Text style={s.heroStatVal}>₹{todayEarnings.toFixed(0)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Bank Account Card Add bank Modal Commented now Enable for access── */}
        {/* <View style={s.bankCard}>
          <View style={s.bankLeft}>
            <View style={s.bankIcon}>
              <Ionicons name="card-outline" size={20} color={C.dark} />
            </View>
            <View>
              <Text style={s.bankTitle}>
                {bankAccount ? bankAccount.bankName : "No Bank Account"}
              </Text>
              <Text style={s.bankSub}>
                {bankAccount
                  ? `•••• ${bankAccount.accountNumber.slice(-4)}  ·  ${bankAccount.accountHolderName}`
                  : "Add account to withdraw funds"}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={s.bankEditBtn}
            onPress={() => setShowBank(true)}
          >
            <Text style={s.bankEditTxt}>{bankAccount ? "Edit" : "Add"}</Text>
          </TouchableOpacity>
        </View> */}

        {/* ── Quick Stats ── */}
        <View style={s.quickStats}>
          {[
            {
              bg: "#FFF3E8",
              iconBg: "#FF967520",
              icon: "checkmark-circle-outline",
              color: C.primary,
              val: String(credits.length),
              label: "Orders Paid",
            },
            {
              bg: "#FFF8E8",
              iconBg: "#FFBF5520",
              icon: "calendar-outline",
              color: C.amber,
              val: String(
                credits.filter(
                  (t) => new Date(t.created_at).toDateString() === todayStr,
                ).length,
              ),
              label: "Today's",
            },
            {
              bg: "#F5EDE8",
              iconBg: "#BB6B3F20",
              icon: "arrow-undo-outline",
              color: C.dark,
              val: `₹${totalRefunded.toFixed(0)}`,
              label: "Refunded",
            },
          ].map((stat, i) => (
            <View key={i} style={[s.quickStat, { backgroundColor: stat.bg }]}>
              <View style={[s.quickStatIcon, { backgroundColor: stat.iconBg }]}>
                <Ionicons
                  name={stat.icon as any}
                  size={18}
                  color={stat.color}
                />
              </View>
              <Text style={[s.quickStatVal, { color: stat.color }]}>
                {stat.val}
              </Text>
              <Text style={s.quickStatLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Withdrawal Requests Section ── */}
        {withdrawals.length > 0 && (
          <View style={s.withdrawSection}>
            {/* Section header */}
            <View style={s.withdrawSectionHdr}>
              <View>
                <Text style={s.txTitle}>Withdrawal Requests</Text>
                <Text style={s.txSub}>{withdrawals.length} requests</Text>
              </View>
              {/* Summary pills */}
              <View style={s.withdrawPills}>
                {pendingCount > 0 && (
                  <View style={[s.withdrawPill, { backgroundColor: C.warn }]}>
                    <Ionicons name="time-outline" size={10} color={C.amber} />
                    <Text style={[s.withdrawPillTxt, { color: C.amber }]}>
                      {pendingCount} Pending
                    </Text>
                  </View>
                )}
                {completedCount > 0 && (
                  <View style={[s.withdrawPill, { backgroundColor: "#E6F9F1" }]}>
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={10}
                      color="#22A06B"
                    />
                    <Text style={[s.withdrawPillTxt, { color: "#22A06B" }]}>
                      {completedCount} Done
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Total withdrawn strip */}
            {totalWithdrawn > 0 && (
              <View style={s.withdrawStrip}>
                <Ionicons name="trending-up-outline" size={14} color={C.dark} />
                <Text style={s.withdrawStripTxt}>
                  Total Withdrawn:{" "}
                  <Text style={{ fontWeight: "800", color: C.dark }}>
                    ₹{totalWithdrawn.toFixed(0)}
                  </Text>
                </Text>
              </View>
            )}

            {/* Withdrawal cards */}
            {[...withdrawals].reverse().map((w, i) => {
              const meta = statusMeta(w.status);
              return (
                <View key={w.id ?? i} style={s.withdrawCard}>
                  {/* Status color strip on left */}
                  <View
                    style={[s.withdrawStripe, { backgroundColor: meta.color }]}
                  />

                  {/* Icon */}
                  <View
                    style={[s.withdrawIcon, { backgroundColor: meta.bg }]}
                  >
                    <Ionicons
                      name={meta.icon as any}
                      size={18}
                      color={meta.color}
                    />
                  </View>

                  {/* Info */}
                  <View style={s.withdrawInfo}>
                    <Text style={s.withdrawTitle}>Withdrawal Request</Text>
                    <Text style={s.withdrawDate}>{formatDate(w.created_at)}</Text>
                    {(w.bank_name || w.account_last4) && (
                      <Text style={s.withdrawBank}>
                        {w.bank_name ?? ""}
                        {w.account_last4 ? `  ••••${w.account_last4}` : ""}
                      </Text>
                    )}
                    {w.remarks ? (
                      <Text style={s.withdrawRemarks} numberOfLines={1}>
                        {w.remarks}
                      </Text>
                    ) : null}
                  </View>

                  {/* Amount + Badge */}
                  <View style={s.withdrawRight}>
                    <Text style={[s.withdrawAmt, { color: meta.color }]}>
                      -₹{w.amount}
                    </Text>
                    <View
                      style={[s.statusBadge, { backgroundColor: meta.bg }]}
                    >
                      <Ionicons
                        name={meta.icon as any}
                        size={9}
                        color={meta.color}
                      />
                      <Text style={[s.statusBadgeTxt, { color: meta.color }]}>
                        {meta.label}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ── Transactions ── */}
        <View style={s.txHeader}>
          <View>
            <Text style={s.txTitle}>Transactions</Text>
            <Text style={s.txSub}>{filteredTx.length} records</Text>
          </View>
          <View style={s.filterRow}>
            {(["ALL", "credit", "debit"] as const).map((f) => (
              <TouchableOpacity
                key={f}
                style={[s.filterChip, filter === f && s.filterChipActive]}
                onPress={() => setFilter(f)}
              >
                <Text
                  style={[
                    s.filterChipTxt,
                    filter === f && s.filterChipTxtActive,
                  ]}
                >
                  {f === "ALL" ? "All" : f === "credit" ? "Earned" : "Refunds"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {filteredTx.length === 0 ? (
          <View style={s.emptyState}>
            <View style={s.emptyIcon}>
              <Ionicons name="receipt-outline" size={32} color={C.accent} />
            </View>
            <Text style={s.emptyTitle}>No transactions yet</Text>
            <Text style={s.emptyDesc}>
              Earnings appear here when orders are delivered
            </Text>
          </View>
        ) : (
          <View style={s.txList}>
            {[...filteredTx].reverse().map((tx, i) => (
              <View key={tx.id ?? i} style={s.txCard}>
                <View
                  style={[
                    s.txIcon,
                    {
                      backgroundColor:
                        tx.type === "credit" ? C.peach : "#F5EDE8",
                    },
                  ]}
                >
                  <Ionicons
                    name={tx.type === "credit" ? "arrow-down" : "arrow-up"}
                    size={16}
                    color={tx.type === "credit" ? C.primary : C.dark}
                  />
                </View>
                <View style={s.txInfo}>
                  <Text style={s.txDesc} numberOfLines={1}>
                    {tx.description}
                  </Text>
                  <Text style={s.txDate}>{formatDate(tx.created_at)}</Text>
                </View>
                <View style={s.txRight}>
                  <Text
                    style={[
                      s.txAmount,
                      { color: tx.type === "credit" ? C.primary : C.dark },
                    ]}
                  >
                    {tx.type === "credit" ? "+" : "-"}₹{tx.amount}
                  </Text>
                  {tx.balance_after !== undefined && (
                    <Text style={s.txBal}>
                      Bal: ₹{tx.balance_after?.toFixed(0)}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Alert Styles 
const aS = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(61,31,10,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  box: {
    width: "100%",
    backgroundColor: "#FFF8EF",
    borderRadius: 24,
    paddingTop: 28,
    paddingBottom: 20,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    color: "#3D1F0A",
    textAlign: "center",
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  msg: {
    fontSize: 14,
    color: "#A07850",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 22,
    fontWeight: "500",
  },
  btnRow: { flexDirection: "row", gap: 10, width: "100%", marginTop: 4 },
  btn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: "#FFE8D6",
    alignItems: "center",
  },
  btnCancel: { backgroundColor: "#FFF3DC" },
  btnDest: { backgroundColor: "#FF9675" },
  btnTxt: { fontSize: 14, fontWeight: "700", color: "#BB6B3F" },
  btnTxtCancel: { color: "#A07850" },
  btnTxtDest: { color: "#3D1F0A" },
});

// ── Bank Modal Styles 
const bS = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(61,31,10,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFF8EF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: "92%",
  },
  drag: {
    width: 40,
    height: 4,
    backgroundColor: "#C9A882",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  hdr: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: { fontSize: 20, fontWeight: "800", color: "#3D1F0A" },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#FFF3DC",
    justifyContent: "center",
    alignItems: "center",
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: "#A07850",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
    marginTop: 4,
  },
  input: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    fontSize: 15,
    color: "#3D1F0A",
    borderWidth: 1,
    borderColor: "#FFE8C8",
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FF9675",
    borderRadius: 14,
    paddingVertical: 15,
    marginTop: 8,
  },
  saveTxt: { fontSize: 15, fontWeight: "800", color: "#fff" },
  cancelBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#FFE8D6",
    alignItems: "center",
    marginTop: 10,
  },
  cancelTxt: { fontSize: 15, fontWeight: "700", color: "#BB6B3F" },
});

// ── Withdraw Modal Styles 
const wS = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(61,31,10,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFF8EF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
  },
  drag: {
    width: 40,
    height: 4,
    backgroundColor: "#C9A882",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  hdr: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: { fontSize: 20, fontWeight: "800", color: "#3D1F0A" },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#FFF3DC",
    justifyContent: "center",
    alignItems: "center",
  },
  balancePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFF3DC",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignSelf: "flex-start",
    marginBottom: 20,
  },
  balanceTxt: { fontSize: 13, color: "#BB6B3F", fontWeight: "600" },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#A07850",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#FF9675",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  rupee: { fontSize: 24, fontWeight: "800", color: "#3D1F0A", marginRight: 4 },
  amountInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: "800",
    color: "#3D1F0A",
    paddingVertical: 16,
  },
  limitNote: {
    fontSize: 12,
    color: "#A07850",
    fontWeight: "500",
    marginBottom: 16,
  },
  quickRow: { flexDirection: "row", gap: 8, marginBottom: 24 },
  quickChip: {
    flex: 1,
    backgroundColor: "#FFE8D6",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  quickTxt: { fontSize: 13, fontWeight: "700", color: "#BB6B3F" },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FF9675",
    borderRadius: 14,
    paddingVertical: 15,
  },
  submitTxt: { fontSize: 15, fontWeight: "800", color: "#fff" },
  cancelBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#FFE8D6",
    alignItems: "center",
    marginTop: 10,
  },
  cancelTxt: { fontSize: 15, fontWeight: "700", color: "#BB6B3F" },
});

// ── Screen Styles 
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8 },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: C.text,
    letterSpacing: -0.5,
  },

  heroCard: {
    margin: 20,
    backgroundColor: C.primary,
    borderRadius: 24,
    padding: 22,
    shadowColor: C.dark,
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
    color: "rgba(255,255,255,0.8)",
    fontWeight: "500",
  },
  walletBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  walletBadgeTxt: { fontSize: 11, color: "#fff", fontWeight: "600" },
  heroAmount: {
    fontSize: 44,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -1,
    marginBottom: 16,
  },

  actionRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 12,
    paddingVertical: 11,
  },
  actionBtnTxt: { fontSize: 13, fontWeight: "700", color: C.dark },

  heroStatsRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 14,
    padding: 14,
  },
  heroStat: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  heroStatDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.25)",
    marginHorizontal: 12,
  },
  heroStatIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,217,153,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  heroStatLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.7)",
    fontWeight: "500",
  },
  heroStatVal: { fontSize: 14, fontWeight: "700", color: "#fff" },

  bankCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: C.card,
    marginHorizontal: 20,
    marginBottom: 14,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FFE8C8",
    shadowColor: C.dark,
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  bankLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  bankIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.peach,
    justifyContent: "center",
    alignItems: "center",
  },
  bankTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: C.text,
    marginBottom: 2,
  },
  bankSub: { fontSize: 12, color: C.muted, fontWeight: "500" },
  bankEditBtn: {
    backgroundColor: C.deepPeach,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  bankEditTxt: { fontSize: 13, fontWeight: "700", color: C.dark },

  quickStats: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 20,
  },
  quickStat: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    gap: 6,
  },
  quickStatIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  quickStatVal: { fontSize: 18, fontWeight: "800" },
  quickStatLabel: {
    fontSize: 10,
    color: C.accent,
    fontWeight: "600",
    textAlign: "center",
  },

  // ── Withdrawal Section ──
  withdrawSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  withdrawSectionHdr: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 10,
  },
  withdrawPills: {
    flexDirection: "row",
    gap: 6,
  },
  withdrawPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  withdrawPillTxt: { fontSize: 10, fontWeight: "700" },
  withdrawStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.deepPeach,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  withdrawStripTxt: { fontSize: 12, color: C.muted, fontWeight: "500" },
  withdrawCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#FFE8C8",
    overflow: "hidden",
    shadowColor: C.dark,
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  withdrawStripe: {
    width: 4,
    alignSelf: "stretch",
  },
  withdrawIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
    marginRight: 10,
    marginVertical: 14,
  },
  withdrawInfo: { flex: 1, paddingVertical: 14 },
  withdrawTitle: { fontSize: 13, fontWeight: "700", color: C.text },
  withdrawDate: { fontSize: 11, color: C.accent, marginTop: 2 },
  withdrawBank: { fontSize: 11, color: C.muted, marginTop: 1, fontWeight: "500" },
  withdrawRemarks: {
    fontSize: 10,
    color: C.light,
    marginTop: 2,
    fontStyle: "italic",
  },
  withdrawRight: {
    alignItems: "flex-end",
    paddingRight: 14,
    paddingVertical: 14,
    gap: 6,
  },
  withdrawAmt: { fontSize: 15, fontWeight: "800" },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusBadgeTxt: { fontSize: 10, fontWeight: "700" },

  txHeader: {
    paddingHorizontal: 20,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  txTitle: { fontSize: 16, fontWeight: "800", color: C.text },
  txSub: { fontSize: 12, color: C.accent, marginTop: 2 },
  filterRow: { flexDirection: "row", gap: 6 },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: C.peach,
  },
  filterChipActive: {
    backgroundColor: "#FF967520",
    borderWidth: 1.5,
    borderColor: C.primary,
  },
  filterChipTxt: { fontSize: 11, fontWeight: "600", color: C.accent },
  filterChipTxtActive: { color: C.primary },

  txList: { paddingHorizontal: 16, gap: 8 },
  txCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    shadowColor: C.dark,
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  txIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  txInfo: { flex: 1 },
  txDesc: { fontSize: 13, fontWeight: "600", color: C.text },
  txDate: { fontSize: 11, color: C.accent, marginTop: 3 },
  txRight: { alignItems: "flex-end" },
  txAmount: { fontSize: 15, fontWeight: "800" },
  txBal: { fontSize: 10, color: C.dark, marginTop: 3 },

  emptyState: { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: C.peach,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: C.accent },
  emptyDesc: { fontSize: 13, color: C.accent, textAlign: "center" },
});