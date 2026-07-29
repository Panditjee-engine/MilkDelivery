import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Image,
  Modal,
  Alert,
  RefreshControl,
  LayoutAnimation,
  UIManager,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, FarmSale, FarmSaleCreate, PaymentMethod } from "../../../src/services/api";
// ^ adjust the relative import path to wherever api.ts lives in your admin app

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const UNIT_OPTIONS = ["kg", "L", "pcs"] as const;
const QR_TIMEOUT_SECONDS = 5 * 60; // 5 minutes

// ─── Helpers ─────────────────────────────────────────────────────────────

function fmtShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function fmtTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function animateNext() {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
}

// ─── Custom Number Stepper ───────────────────────────────────────────────

function NumberStepper({
  value,
  onChange,
  step = 1,
  placeholder = "0",
}: {
  value: string;
  onChange: (v: string) => void;
  step?: number;
  placeholder?: string;
}) {
  const bump = (dir: 1 | -1) => {
    const cur = parseFloat(value) || 0;
    const next = Math.max(0, Math.round((cur + dir * step) * 100) / 100);
    onChange(String(next));
  };

  return (
    <View style={ns.wrap}>
      <TextInput
        style={ns.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        keyboardType="decimal-pad"
      />
      <View style={ns.stepperCol}>
        <TouchableOpacity style={ns.stepperBtn} onPress={() => bump(1)}>
          <Ionicons name="chevron-up" size={14} color="#6b7280" />
        </TouchableOpacity>
        <View style={ns.stepperDivider} />
        <TouchableOpacity style={ns.stepperBtn} onPress={() => bump(-1)}>
          <Ionicons name="chevron-down" size={14} color="#6b7280" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const ns = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "stretch",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    backgroundColor: "#fff",
    height: 44,
  },
  input: { flex: 1, paddingHorizontal: 12, fontSize: 14, color: "#111827" },
  stepperCol: { borderLeftWidth: 1, borderLeftColor: "#e5e7eb", width: 32 },
  stepperBtn: { flex: 1, alignItems: "center", justifyContent: "center" },
  stepperDivider: { height: 1, backgroundColor: "#e5e7eb" },
});

// ─── Unit Picker Chip Row (used inside form) ─────────────────────────────

function UnitPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (u: string) => void;
}) {
  return (
    <View style={{ flexDirection: "row", gap: 6 }}>
      {UNIT_OPTIONS.map((u) => {
        const active = value === u;
        return (
          <TouchableOpacity
            key={u}
            onPress={() => onChange(u)}
            style={[unitStyles.chip, active && unitStyles.chipActive]}
          >
            <Text style={[unitStyles.chipText, active && unitStyles.chipTextActive]}>
              {u}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const unitStyles = StyleSheet.create({
  chip: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 14,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  chipActive: { borderColor: "#4f46e5", backgroundColor: "#eef2ff" },
  chipText: { fontSize: 13, fontWeight: "600", color: "#6b7280" },
  chipTextActive: { color: "#4f46e5" },
});

// ─── UPI QR Payment Modal (admin's own saved QR) ─────────────────────────

function UpiQrModal({
  visible,
  onCancel,
  onConfirmed,
}: {
  visible: boolean;
  onCancel: () => void;
  onConfirmed: () => void;
}) {
  const [qrData, setQrData] = useState<{
    qr_image_base64: string;
    file_type: string;
    label: string;
  } | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(QR_TIMEOUT_SECONDS);
  const [confirming, setConfirming] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!visible) return;

    setSecondsLeft(QR_TIMEOUT_SECONDS);
    setQrError(null);
    setLoadingQr(true);

    (async () => {
      try {
        const data = await api.getMyPaymentQr();
        setQrData(data);
      } catch (e: any) {
        setQrError(e.message || "No payment QR saved yet. Add one in Settings.");
      } finally {
        setLoadingQr(false);
      }
    })();

    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [visible]);

  const expired = secondsLeft <= 0;

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      onConfirmed();
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={qrStyles.overlay}>
        <View style={qrStyles.card}>
          <View style={qrStyles.headerRow}>
            <Text style={qrStyles.title}>Scan & Pay</Text>
            <TouchableOpacity onPress={onCancel} style={qrStyles.closeBtn}>
              <Ionicons name="close" size={20} color="#374151" />
            </TouchableOpacity>
          </View>

          <View
            style={[
              qrStyles.timerPill,
              expired && qrStyles.timerPillExpired,
            ]}
          >
            <Ionicons
              name="time-outline"
              size={14}
              color={expired ? "#dc2626" : "#4f46e5"}
            />
            <Text
              style={[
                qrStyles.timerText,
                expired && qrStyles.timerTextExpired,
              ]}
            >
              {expired ? "QR expired" : `Expires in ${fmtTimer(secondsLeft)}`}
            </Text>
          </View>

          <View style={qrStyles.qrBox}>
            {loadingQr ? (
              <ActivityIndicator color="#4f46e5" />
            ) : qrError ? (
              <View style={{ alignItems: "center", padding: 16 }}>
                <Ionicons name="alert-circle-outline" size={28} color="#dc2626" />
                <Text style={qrStyles.errorText}>{qrError}</Text>
              </View>
            ) : expired ? (
              <View style={{ alignItems: "center", padding: 16 }}>
                <Ionicons name="time-outline" size={28} color="#9ca3af" />
                <Text style={qrStyles.errorText}>
                  This QR has expired. Close and reopen to refresh.
                </Text>
              </View>
            ) : qrData ? (
              <Image
                source={{
                  uri: `data:${qrData.file_type};base64,${qrData.qr_image_base64}`,
                }}
                style={qrStyles.qrImage}
                resizeMode="contain"
              />
            ) : null}
          </View>

          {qrData?.label && !expired && !qrError && (
            <Text style={qrStyles.qrLabel}>{qrData.label}</Text>
          )}

          <Text style={qrStyles.helperText}>
            Once the customer completes the payment, tap the button below.
          </Text>

          <TouchableOpacity
            style={[
              qrStyles.confirmBtn,
              (expired || loadingQr || confirming) && qrStyles.confirmBtnDisabled,
            ]}
            disabled={expired || loadingQr || confirming}
            onPress={handleConfirm}
          >
            {confirming ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text style={qrStyles.confirmBtnText}>Payment Done</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={qrStyles.cancelLink} onPress={onCancel}>
            <Text style={qrStyles.cancelLinkText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const qrStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: { fontSize: 16, fontWeight: "bold", color: "#111827" },
  closeBtn: { padding: 4 },
  timerPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 6,
    backgroundColor: "#eef2ff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  timerPillExpired: { backgroundColor: "#fee2e2" },
  timerText: { fontSize: 12, fontWeight: "700", color: "#4f46e5" },
  timerTextExpired: { color: "#dc2626" },
  qrBox: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: 8,
  },
  qrImage: { width: "100%", height: "100%" },
  qrLabel: {
    textAlign: "center",
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 12,
  },
  errorText: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
    marginTop: 8,
  },
  helperText: {
    fontSize: 11,
    color: "#9ca3af",
    textAlign: "center",
    marginBottom: 16,
  },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#16a34a",
    borderRadius: 10,
    paddingVertical: 13,
  },
  confirmBtnDisabled: { backgroundColor: "#a7f3d0" },
  confirmBtnText: { color: "#fff", fontSize: 14, fontWeight: "bold" },
  cancelLink: { alignItems: "center", marginTop: 10, padding: 6 },
  cancelLinkText: { fontSize: 12, color: "#6b7280", fontWeight: "600" },
});

// ─── Receipt Viewer Modal ─────────────────────────────────────────────────

function ReceiptViewerModal({
  visible,
  uri,
  onClose,
}: {
  visible: boolean;
  uri: string | null;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={receiptStyles.overlay}>
        <TouchableOpacity style={receiptStyles.closeBtn} onPress={onClose}>
          <Ionicons name="close" size={26} color="#fff" />
        </TouchableOpacity>
        {uri ? (
          <Image source={{ uri }} style={receiptStyles.image} resizeMode="contain" />
        ) : (
          <ActivityIndicator color="#fff" />
        )}
      </View>
    </Modal>
  );
}

const receiptStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtn: { position: "absolute", top: 50, right: 20, zIndex: 10, padding: 8 },
  image: { width: "92%", height: "70%" },
});

// ─── Main Screen ──────────────────────────────────────────────────────────

type FilterMode = "today" | "week" | "month" | "all";

export default function AdminFarmSaleScreen() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const formLayoutY = useRef(0);

  const [sales, setSales] = useState<FarmSale[]>([]);
  const [summary, setSummary] = useState<{
    total_sales: number;
    total_amount: number;
    by_product: Record<string, number>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [filterMode, setFilterMode] = useState<FilterMode>("today");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [customerName, setCustomerName] = useState("");
  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState<string>("kg");
  const [pricePerUnit, setPricePerUnit] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  // UPI QR modal
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [pendingUpiSelection, setPendingUpiSelection] = useState(false);

  // Receipt viewer
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerUri, setViewerUri] = useState<string | null>(null);

  const total = (parseFloat(quantity) || 0) * (parseFloat(pricePerUnit) || 0);

  // ── Load data ──

  const loadSales = useCallback(async () => {
    try {
      const params =
        filterMode === "all"
          ? { all: true }
          : filterMode === "today"
          ? { date: todayStr() }
          : { all: true }; // week/month filtered client-side from all_time set

      const res = await api.getAdminFarmSales(params);
      setSales(res.sales || []);
      setSummary({
        total_sales: res.total_sales,
        total_amount: res.total_amount,
        by_product: res.by_product,
      });
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to load farm sales");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterMode]);

  useEffect(() => {
    setLoading(true);
    loadSales();
  }, [loadSales]);

  const onRefresh = () => {
    setRefreshing(true);
    loadSales();
  };

  const displayedSales = React.useMemo(() => {
    if (filterMode === "today" || filterMode === "all") return sales;
    const now = new Date();
    return sales.filter((s) => {
      const d = new Date(s.date);
      if (filterMode === "week") {
        const diff = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
        return diff >= 0 && diff < 7;
      }
      if (filterMode === "month") {
        return (
          d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
        );
      }
      return true;
    });
  }, [sales, filterMode]);

  // ── Form handlers ──

  const resetForm = () => {
    setEditingId(null);
    setCustomerName("");
    setProductName("");
    setQuantity("");
    setUnit("kg");
    setPricePerUnit("");
    setPaymentMethod("cash");
    setReceiptImage(null);
    setNotes("");
  };

  const openNewSale = () => {
    animateNext();
    resetForm();
    setIsFormOpen(true);
    setExpandedId(null);
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: formLayoutY.current, animated: true });
    }, 150);
  };

  const openEditSale = (sale: FarmSale) => {
    animateNext();
    setEditingId(sale.id);
    setCustomerName(sale.customer_name);
    setProductName(sale.product_name);
    setQuantity(String(sale.quantity));
    setUnit(sale.unit);
    setPricePerUnit(String(sale.price_per_unit));
    setPaymentMethod(sale.payment_method || "cash");
    setReceiptImage(sale.receipt_image || null);
    setNotes(sale.notes || "");
    setIsFormOpen(true);
    setExpandedId(null);
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: formLayoutY.current, animated: true });
    }, 150);
  };

  const closeForm = () => {
    animateNext();
    setIsFormOpen(false);
    resetForm();
  };

  const selectPaymentMethod = (method: PaymentMethod) => {
    if (method === "upi") {
      setPendingUpiSelection(true);
      setQrModalVisible(true);
    } else {
      setPaymentMethod("cash");
    }
  };

  const onQrConfirmed = () => {
    setPaymentMethod("upi");
    setPendingUpiSelection(false);
    setQrModalVisible(false);
  };

  const onQrCancelled = () => {
    setPendingUpiSelection(false);
    setQrModalVisible(false);
    // stay on whatever payment method was already set
  };

  const pickReceipt = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow photo access to attach a receipt.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      if (asset.base64) {
        const mime = asset.mimeType || "image/jpeg";
        setReceiptImage(`data:${mime};base64,${asset.base64}`);
      } else {
        setReceiptImage(asset.uri);
      }
    }
  };

  const validate = (): string | null => {
    if (!customerName.trim()) return "Customer name is required";
    if (!productName.trim()) return "Product name is required";
    const qty = parseFloat(quantity);
    if (!qty || qty <= 0) return "Enter a valid quantity";
    const price = parseFloat(pricePerUnit);
    if (!price || price <= 0) return "Enter a valid price per unit";
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) {
      Alert.alert("Missing info", err);
      return;
    }

    setSaving(true);
    try {
      const payload: FarmSaleCreate = {
        customer_name: customerName.trim(),
        product_name: productName.trim(),
        quantity: parseFloat(quantity),
        unit,
        price_per_unit: parseFloat(pricePerUnit),
        date: todayStr(),
        notes: notes.trim() || undefined,
        payment_method: paymentMethod,
        payment_confirmed: true,
        receipt_image: receiptImage || undefined,
      };

      if (editingId) {
        await api.adminUpdateFarmSale(editingId, payload);
      } else {
        await api.adminCreateFarmSale(payload);
      }

      animateNext();
      closeForm();
      await loadSales();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to save sale");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (sale: FarmSale) => {
    Alert.alert(
      "Delete entry",
      `Delete the sale to ${sale.customer_name}? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.adminDeleteFarmSale(sale.id);
              animateNext();
              await loadSales();
            } catch (e: any) {
              Alert.alert("Error", e.message || "Failed to delete sale");
            }
          },
        },
      ],
    );
  };

  const toggleExpand = (id: string) => {
    animateNext();
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const openReceiptViewer = (uri: string) => {
    setViewerUri(uri);
    setViewerVisible(true);
  };

  // ── Render ──

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoCircle}>
            <MaterialCommunityIcons name="sprout" size={20} color="#fff" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Farm Sales</Text>
            <Text style={styles.headerSubtitle}>All workers &amp; admin</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.addBtnTop} onPress={openNewSale}>
          <Ionicons name="add" size={18} color="#000" />
          <Text style={styles.addBtnTopText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Summary strip */}
      {summary && (
        <View style={styles.summaryRow}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryValue}>{summary.total_sales}</Text>
            <Text style={styles.summaryLabel}>Sales</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryValue}>
              ₹{summary.total_amount.toFixed(0)}
            </Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </View>
        </View>
      )}

      {/* Filter Chips */}
      <View style={styles.chipsRow}>
        {(
          [
            { key: "today", label: "Today" },
            { key: "week", label: "Last 7 days" },
            { key: "month", label: "This month" },
            { key: "all", label: "All time" },
          ] as { key: FilterMode; label: string }[]
        ).map((chip) => {
          const isActive = filterMode === chip.key;
          return (
            <TouchableOpacity
              key={chip.key}
              style={[styles.chip, isActive && styles.chipActive]}
              onPress={() => setFilterMode(chip.key)}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                {chip.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Inline Form */}
          {isFormOpen && (
            <View
              style={styles.formCard}
              onLayout={(e) => {
                formLayoutY.current = e.nativeEvent.layout.y;
              }}
            >
              <View style={styles.formHeaderRow}>
                <View>
                  <Text style={styles.formTitle}>
                    {editingId ? "Edit Sale" : "New Sale"}
                  </Text>
                  <Text style={styles.formSubtitle}>
                    {editingId ? "Update this record" : "Recorded as Admin"}
                  </Text>
                </View>
                <View style={styles.formActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={closeForm}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                    onPress={handleSave}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color="#000" />
                    ) : (
                      <Text style={styles.saveBtnText}>Save</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              <TextInput
                style={styles.inputField}
                placeholder="Customer name (e.g., Aarav Patel)"
                placeholderTextColor="#9ca3af"
                value={customerName}
                onChangeText={setCustomerName}
              />
              <TextInput
                style={styles.inputField}
                placeholder="Product name (e.g., Organic Tomatoes)"
                placeholderTextColor="#9ca3af"
                value={productName}
                onChangeText={setProductName}
              />

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <NumberStepper value={quantity} onChange={setQuantity} />
                </View>
                <UnitPicker value={unit} onChange={setUnit} />
              </View>

              <NumberStepper
                value={pricePerUnit}
                onChange={setPricePerUnit}
                placeholder="Price per unit (₹)"
              />

              {(parseFloat(quantity) > 0 || parseFloat(pricePerUnit) > 0) && (
                <View style={styles.totalPreview}>
                  <Text style={styles.totalPreviewLabel}>Total amount</Text>
                  <Text style={styles.totalPreviewValue}>₹{total.toFixed(2)}</Text>
                </View>
              )}

              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Payment</Text>
                <TouchableOpacity
                  style={styles.radioOption}
                  onPress={() => selectPaymentMethod("upi")}
                >
                  <View
                    style={[
                      styles.radioCircle,
                      paymentMethod === "upi" && styles.radioCircleActive,
                    ]}
                  >
                    {paymentMethod === "upi" && <View style={styles.radioInner} />}
                  </View>
                  <Text style={styles.radioText}>UPI</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.radioOption}
                  onPress={() => selectPaymentMethod("cash")}
                >
                  <View
                    style={[
                      styles.radioCircle,
                      paymentMethod === "cash" && styles.radioCircleActive,
                    ]}
                  >
                    {paymentMethod === "cash" && <View style={styles.radioInner} />}
                  </View>
                  <Text style={styles.radioText}>Cash</Text>
                </TouchableOpacity>
              </View>

              {paymentMethod === "upi" && (
                <View style={styles.upiConfirmedPill}>
                  <Ionicons name="checkmark-circle" size={14} color="#16a34a" />
                  <Text style={styles.upiConfirmedText}>
                    UPI payment confirmed via QR
                  </Text>
                </View>
              )}

              <TextInput
                style={[styles.inputField, { height: 60, textAlignVertical: "top" }]}
                placeholder="Notes (optional)"
                placeholderTextColor="#9ca3af"
                value={notes}
                onChangeText={setNotes}
                multiline
              />

              <View style={styles.receiptUploadRow}>
                <TouchableOpacity
                  style={styles.receiptThumbPlaceholder}
                  onPress={receiptImage ? () => openReceiptViewer(receiptImage) : undefined}
                >
                  {receiptImage ? (
                    <Image source={{ uri: receiptImage }} style={styles.receiptImage} />
                  ) : (
                    <Ionicons name="receipt-outline" size={24} color="#9ca3af" />
                  )}
                </TouchableOpacity>
                <View style={styles.receiptTextCol}>
                  <Text style={styles.receiptLabel}>Receipt (optional)</Text>
                  <Text style={styles.receiptSub}>Tap upload to attach or replace</Text>
                </View>
                <TouchableOpacity style={styles.uploadBtn} onPress={pickReceipt}>
                  <Text style={styles.uploadBtnText}>Upload</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Loading state */}
          {loading && (
            <View style={{ paddingVertical: 40, alignItems: "center" }}>
              <ActivityIndicator color="#4f46e5" />
            </View>
          )}

          {/* Empty state */}
          {!loading && displayedSales.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={36} color="#d1d5db" />
              <Text style={styles.emptyStateText}>No sales in this range</Text>
            </View>
          )}

          {/* List of Sales */}
          {!loading &&
            displayedSales.map((sale) => {
              const expanded = expandedId === sale.id;
              return (
                <TouchableOpacity
                  key={sale.id}
                  activeOpacity={0.8}
                  style={styles.saleCard}
                  onPress={() => toggleExpand(sale.id)}
                >
                  <View style={styles.saleCardTopRow}>
                    <View style={styles.saleCardLeft}>
                      <View style={styles.avatar}>
                        <Ionicons name="person" size={16} color="#4f46e5" />
                      </View>
                      <View style={styles.saleDetails}>
                        <Text style={styles.saleName}>{sale.customer_name}</Text>
                        <Text style={styles.saleProduct}>{sale.product_name}</Text>
                        <Text style={styles.saleWorker}>
                          by {sale.worker_name}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.saleCardRight}>
                      <Text style={styles.saleTotal}>
                        ₹{sale.total_amount.toFixed(2)}
                      </Text>
                      <Text style={styles.saleDate}>{fmtShortDate(sale.date)}</Text>
                      <Ionicons
                        name={expanded ? "chevron-up" : "chevron-down"}
                        size={16}
                        color="#9ca3af"
                        style={{ marginTop: 4 }}
                      />
                    </View>
                  </View>

                  <View style={styles.badgeRow}>
                    {sale.payment_method === "upi" ? (
                      <View style={styles.badgeUpi}>
                        <Text style={styles.badgeUpiText}>UPI</Text>
                      </View>
                    ) : (
                      <View style={styles.badgeCash}>
                        <Text style={styles.badgeCashText}>Cash</Text>
                      </View>
                    )}
                    {sale.receipt_image ? (
                      <View style={styles.badgeReceipt}>
                        <Text style={styles.badgeReceiptText}>Receipt attached</Text>
                      </View>
                    ) : (
                      <View style={styles.badgeReceipt}>
                        <Text style={styles.badgeReceiptText}>No receipt</Text>
                      </View>
                    )}
                  </View>

                  {/* Expanded detail */}
                  {expanded && (
                    <View style={styles.expandedSection}>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Quantity</Text>
                        <Text style={styles.detailValue}>
                          {sale.quantity} {sale.unit}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Price / unit</Text>
                        <Text style={styles.detailValue}>
                          ₹{sale.price_per_unit.toFixed(2)}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Recorded at</Text>
                        <Text style={styles.detailValue}>
                          {fmtShortDate(sale.date)} · {fmtTime(sale.created_at)}
                        </Text>
                      </View>
                      {sale.notes ? (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Notes</Text>
                          <Text style={styles.detailValue}>{sale.notes}</Text>
                        </View>
                      ) : null}

                      {sale.receipt_image && (
                        <TouchableOpacity
                          style={styles.viewReceiptBtn}
                          onPress={() => openReceiptViewer(sale.receipt_image!)}
                        >
                          <Ionicons name="image-outline" size={16} color="#4f46e5" />
                          <Text style={styles.viewReceiptBtnText}>View receipt</Text>
                        </TouchableOpacity>
                      )}

                      <View style={styles.expandedActions}>
                        <TouchableOpacity
                          style={styles.expandedActionBtn}
                          onPress={() => openEditSale(sale)}
                        >
                          <MaterialCommunityIcons
                            name="pencil-outline"
                            size={15}
                            color="#111827"
                          />
                          <Text style={styles.expandedActionText}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.expandedActionBtn, styles.expandedDeleteBtn]}
                          onPress={() => handleDelete(sale)}
                        >
                          <Ionicons name="trash" size={15} color="#dc2626" />
                          <Text style={[styles.expandedActionText, { color: "#dc2626" }]}>
                            Delete
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Sticky Add Button */}
      {!isFormOpen && (
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.bottomAddBtn} onPress={openNewSale}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.bottomAddBtnText}>Add New Sale</Text>
          </TouchableOpacity>
        </View>
      )}

      <UpiQrModal
        visible={qrModalVisible}
        onCancel={onQrCancelled}
        onConfirmed={onQrConfirmed}
      />

      <ReceiptViewerModal
        visible={viewerVisible}
        uri={viewerUri}
        onClose={() => setViewerVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fefefe" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  logoCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#4f46e5",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 16, fontWeight: "bold", color: "#111827" },
  headerSubtitle: { fontSize: 11, color: "#6b7280" },
  addBtnTop: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f97316",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  addBtnTopText: { fontSize: 13, fontWeight: "bold", color: "#000" },

  summaryRow: { flexDirection: "row", paddingHorizontal: 16, gap: 10, marginBottom: 12 },
  summaryBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  summaryValue: { fontSize: 16, fontWeight: "bold", color: "#111827" },
  summaryLabel: { fontSize: 10, color: "#6b7280", marginTop: 2 },

  chipsRow: { flexDirection: "row", paddingHorizontal: 16, gap: 8, marginBottom: 16 },
  chip: {
    flex: 1,
    height: 36,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  chipActive: { borderColor: "#3b82f6", backgroundColor: "#eff6ff" },
  chipText: { fontSize: 11, fontWeight: "600", color: "#4b5563" },
  chipTextActive: { color: "#3b82f6" },

  scrollContent: { paddingHorizontal: 16, paddingBottom: 100 },

  formCard: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    backgroundColor: "#fff",
  },
  formHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  formTitle: { fontSize: 16, fontWeight: "bold", color: "#111827" },
  formSubtitle: { fontSize: 11, color: "#6b7280", marginTop: 2 },
  formActions: { flexDirection: "row", gap: 8 },
  cancelBtn: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    justifyContent: "center",
  },
  cancelBtnText: { fontSize: 12, fontWeight: "bold", color: "#111827" },
  saveBtn: {
    backgroundColor: "#4ade80",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
    justifyContent: "center",
    minWidth: 56,
    alignItems: "center",
  },
  saveBtnText: { fontSize: 12, fontWeight: "bold", color: "#000" },

  inputField: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 13,
    marginBottom: 10,
    color: "#111827",
  },
  row: { flexDirection: "row", gap: 10, marginBottom: 10 },

  totalPreview: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  totalPreviewLabel: { fontSize: 12, color: "#6b7280" },
  totalPreviewValue: { fontSize: 14, fontWeight: "bold", color: "#111827" },

  paymentRow: { flexDirection: "row", alignItems: "center", marginTop: 4, marginBottom: 10, gap: 16 },
  paymentLabel: { fontSize: 12, color: "#6b7280" },
  radioOption: { flexDirection: "row", alignItems: "center", gap: 6 },
  radioCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#d1d5db",
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleActive: { borderColor: "#4f46e5" },
  radioInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#4f46e5" },
  radioText: { fontSize: 12, fontWeight: "600", color: "#111827" },

  upiConfirmedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f0fdf4",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
  },
  upiConfirmedText: { fontSize: 11, color: "#16a34a", fontWeight: "600" },

  receiptUploadRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    paddingTop: 16,
    gap: 12,
  },
  receiptThumbPlaceholder: {
    width: 48,
    height: 48,
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  receiptImage: { width: "100%", height: "100%" },
  receiptTextCol: { flex: 1 },
  receiptLabel: { fontSize: 12, color: "#374151", fontWeight: "600" },
  receiptSub: { fontSize: 11, color: "#9ca3af", marginTop: 2 },
  uploadBtn: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  uploadBtnText: { fontSize: 12, fontWeight: "bold", color: "#111827" },

  emptyState: { alignItems: "center", paddingVertical: 50, gap: 8 },
  emptyStateText: { fontSize: 13, color: "#9ca3af" },

  saleCard: {
    borderWidth: 1,
    borderColor: "#f3f4f6",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    backgroundColor: "#fff",
  },
  saleCardTopRow: { flexDirection: "row", justifyContent: "space-between" },
  saleCardLeft: { flexDirection: "row", flex: 1, gap: 12 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#eef2ff",
    alignItems: "center",
    justifyContent: "center",
  },
  saleDetails: { flex: 1 },
  saleName: { fontSize: 14, fontWeight: "bold", color: "#111827", marginBottom: 2 },
  saleProduct: { fontSize: 11, color: "#4b5563" },
  saleWorker: { fontSize: 10, color: "#9ca3af", marginTop: 2 },

  saleCardRight: { alignItems: "flex-end" },
  saleTotal: { fontSize: 14, fontWeight: "bold", color: "#111827" },
  saleDate: { fontSize: 10, color: "#6b7280", marginTop: 2 },

  badgeRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  badgeUpi: { backgroundColor: "#4f46e5", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  badgeUpiText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
  badgeCash: { borderWidth: 1, borderColor: "#e5e7eb", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  badgeCashText: { color: "#111827", fontSize: 10, fontWeight: "bold" },
  badgeReceipt: { borderWidth: 1, borderColor: "#e5e7eb", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  badgeReceiptText: { color: "#4b5563", fontSize: 10 },

  expandedSection: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    gap: 8,
  },
  detailRow: { flexDirection: "row", justifyContent: "space-between" },
  detailLabel: { fontSize: 11, color: "#9ca3af" },
  detailValue: { fontSize: 12, color: "#111827", fontWeight: "600", flexShrink: 1, textAlign: "right" },

  viewReceiptBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  viewReceiptBtnText: { fontSize: 12, color: "#4f46e5", fontWeight: "600" },

  expandedActions: { flexDirection: "row", gap: 10, marginTop: 8 },
  expandedActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  expandedDeleteBtn: { borderColor: "#fecaca" },
  expandedActionText: { fontSize: 12, fontWeight: "600", color: "#111827" },

  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: Platform.OS === "ios" ? 32 : 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  bottomAddBtn: {
    backgroundColor: "#000",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  bottomAddBtnText: { color: "#fff", fontSize: 14, fontWeight: "bold" },
});