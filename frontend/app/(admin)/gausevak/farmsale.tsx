import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  Modal,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { api, FarmSale } from "../../../src/services/api";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseUTCDate(dateString: string): Date {
  const hasTimezone = /Z$|[+-]\d{2}:?\d{2}$/.test(dateString);
  return new Date(hasTimezone ? dateString : dateString + "Z");
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

const UNIT_OPTIONS = ["L", "kg", "piece"] as const;

// ─── Modern Alert ─────────────────────────────────────────────────────────────

interface AlertConfig {
  visible: boolean;
  title: string;
  message: string;
  icon?: string;
  iconColor?: string;
  iconBg?: string;
}

function ModernAlert({
  config,
  onClose,
}: {
  config: AlertConfig;
  onClose: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (config.visible) {
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          damping: 15,
          stiffness: 200,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [config.visible]);

  if (!config.visible) return null;

  return (
    <Modal visible={config.visible} transparent animationType="none">
      <View style={al.overlay}>
        <Animated.View
          style={[
            al.card,
            { opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          <View
            style={[al.iconWrap, { backgroundColor: config.iconBg ?? "#fee2e2" }]}
          >
            <Ionicons
              name={(config.icon ?? "alert-circle-outline") as any}
              size={28}
              color={config.iconColor ?? "#ef4444"}
            />
          </View>
          <Text style={al.title}>{config.title}</Text>
          <Text style={al.message}>{config.message}</Text>
          <TouchableOpacity style={al.btn} onPress={onClose} activeOpacity={0.85}>
            <Text style={al.btnText}>OK</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

function useModernAlert() {
  const [config, setConfig] = useState<AlertConfig>({
    visible: false,
    title: "",
    message: "",
  });
  const show = (
    title: string,
    message: string,
    icon?: string,
    iconColor?: string,
    iconBg?: string,
  ) => setConfig({ visible: true, title, message, icon, iconColor, iconBg });
  const hide = () => setConfig((p) => ({ ...p, visible: false }));
  return { config, show, hide };
}

const al = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 22,
    width: "100%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 16,
  },
  iconWrap: {
    width: 62,
    height: 62,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 22,
    fontWeight: "500",
  },
  btn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#111827",
    alignItems: "center",
  },
  btnText: { fontSize: 15, fontWeight: "800", color: "#fff" },
});

// ─── Delete Confirm Modal ──────────────────────────────────────────────────────

function DeleteConfirmModal({
  visible,
  sale,
  onConfirm,
  onCancel,
  loading,
}: {
  visible: boolean;
  sale: FarmSale | null;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.88);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          damping: 14,
          stiffness: 220,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible || !sale) return null;

  return (
    <Modal visible={visible} transparent animationType="none">
      <View style={dc.overlay}>
        <Animated.View
          style={[
            dc.card,
            { opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          <View style={dc.iconRing}>
            <View style={dc.iconInner}>
              <Ionicons name="trash" size={26} color="#ef4444" />
            </View>
          </View>

          <Text style={dc.title}>Delete Sale Entry?</Text>
          <Text style={dc.subtitle}>This will permanently remove this record</Text>

          <View style={dc.chip}>
            <Ionicons name="person" size={14} color="#374151" />
            <Text style={dc.chipName}>{sale.customer_name}</Text>
            <View style={dc.chipDivider} />
            <Text style={dc.chipTag}>{sale.product_name}</Text>
            <View style={dc.chipDivider} />
            <Text style={dc.chipQty}>₹{sale.total_amount.toFixed(0)}</Text>
          </View>

          <Text style={dc.warn}>
            This action cannot be undone. The entry will be removed from all reports.
          </Text>

          <View style={dc.btnRow}>
            <TouchableOpacity
              style={dc.cancelBtn}
              onPress={onCancel}
              activeOpacity={0.75}
              disabled={loading}
            >
              <Text style={dc.cancelTxt}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[dc.confirmBtn, loading && { opacity: 0.7 }]}
              onPress={onConfirm}
              activeOpacity={0.8}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="trash" size={15} color="#fff" />
                  <Text style={dc.confirmTxt}>Delete</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const dc = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.52)",
    justifyContent: "center",
    alignItems: "center",
    padding: 28,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 26,
    paddingHorizontal: 22,
    paddingTop: 30,
    paddingBottom: 24,
    width: "100%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 10 },
    elevation: 18,
  },
  iconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: "#fca5a5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  iconInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#fee2e2",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 20, fontWeight: "900", color: "#111827", marginBottom: 6 },
  subtitle: { fontSize: 13, color: "#6b7280", fontWeight: "500", marginBottom: 14 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#f9fafb",
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  chipName: { fontSize: 14, fontWeight: "800", color: "#111827" },
  chipTag: { fontSize: 12, fontWeight: "700", color: "#6b7280" },
  chipQty: { fontSize: 13, fontWeight: "800", color: "#16a34a" },
  chipDivider: { width: 1, height: 14, backgroundColor: "#e5e7eb" },
  warn: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 22,
    paddingHorizontal: 8,
  },
  btnRow: { flexDirection: "row", gap: 10, width: "100%" },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    alignItems: "center",
    backgroundColor: "#f9fafb",
  },
  cancelTxt: { fontSize: 14, fontWeight: "800", color: "#374151" },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#ef4444",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  confirmTxt: { fontSize: 14, fontWeight: "800", color: "#fff" },
});

// ─── Edit Sale Modal ────────────────────────────────────────────────────────────

function EditSaleModal({
  visible,
  sale,
  onClose,
  onSaved,
}: {
  visible: boolean;
  sale: FarmSale | null;
  onClose: () => void;
  onSaved: (updated: FarmSale) => void;
}) {
  const [customerName, setCustomerName] = useState("");
  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState<string>("L");
  const [pricePerUnit, setPricePerUnit] = useState("");
  const [saving, setSaving] = useState(false);

  const { config: alertConfig, show: showAlert, hide: hideAlert } = useModernAlert();

  useEffect(() => {
    if (sale && visible) {
      setCustomerName(sale.customer_name);
      setProductName(sale.product_name);
      setQuantity(String(sale.quantity));
      setUnit(sale.unit);
      setPricePerUnit(String(sale.price_per_unit));
    }
  }, [sale, visible]);

  const qtyNum = parseFloat(quantity) || 0;
  const priceNum = parseFloat(pricePerUnit) || 0;
  const computedTotal = Math.round(qtyNum * priceNum * 100) / 100;

  const canSave =
    customerName.trim().length > 0 &&
    productName.trim().length > 0 &&
    qtyNum > 0 &&
    priceNum > 0 &&
    !saving;

  const handleSave = async () => {
    if (!sale || !canSave) return;
    setSaving(true);
    try {
      const updated = await api.adminUpdateFarmSale(sale.id, {
        customer_name: customerName.trim(),
        product_name: productName.trim(),
        quantity: qtyNum,
        unit,
        price_per_unit: priceNum,
      });
      onSaved(updated);
      onClose();
    } catch (err: any) {
      showAlert(
        "Could Not Update",
        err?.message ?? "Something went wrong while updating the sale entry.",
        "alert-circle-outline",
        "#ef4444",
        "#fee2e2",
      );
    } finally {
      setSaving(false);
    }
  };

  if (!sale) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={em.container}>
        <ModernAlert config={alertConfig} onClose={hideAlert} />

        <LinearGradient colors={["#0891b2", "#0e7490"]} style={em.header}>
          <TouchableOpacity style={em.backBtn} onPress={onClose}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={em.headerTitle}>Edit Sale</Text>
            <Text style={em.headerSub}>{sale.worker_name}'s entry</Text>
          </View>
        </LinearGradient>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={80}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={em.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={em.label}>Customer Name</Text>
            <TextInput
              style={em.input}
              value={customerName}
              onChangeText={setCustomerName}
              placeholder="Customer name"
              placeholderTextColor="#9ca3af"
            />

            <Text style={em.label}>Product Name</Text>
            <TextInput
              style={em.input}
              value={productName}
              onChangeText={setProductName}
              placeholder="Product name"
              placeholderTextColor="#9ca3af"
            />

            <View style={em.row2}>
              <View style={{ flex: 1 }}>
                <Text style={em.label}>Quantity</Text>
                <TextInput
                  style={em.input}
                  value={quantity}
                  onChangeText={setQuantity}
                  placeholder="0"
                  placeholderTextColor="#9ca3af"
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={em.label}>Unit</Text>
                <View style={em.unitRow}>
                  {UNIT_OPTIONS.map((u) => {
                    const active = unit === u;
                    return (
                      <TouchableOpacity
                        key={u}
                        style={[em.unitChip, active && em.unitChipActive]}
                        onPress={() => setUnit(u)}
                        activeOpacity={0.8}
                      >
                        <Text style={[em.unitChipText, active && { color: "#fff" }]}>{u}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>

            <Text style={em.label}>Price per {unit}</Text>
            <View style={em.priceInputWrap}>
              <Text style={em.rupee}>₹</Text>
              <TextInput
                style={em.priceInput}
                value={pricePerUnit}
                onChangeText={setPricePerUnit}
                placeholder="0"
                placeholderTextColor="#9ca3af"
                keyboardType="decimal-pad"
              />
            </View>

            <View style={em.totalPreview}>
              <Text style={em.totalPreviewLabel}>Updated Total</Text>
              <Text style={em.totalPreviewValue}>₹{computedTotal.toFixed(2)}</Text>
            </View>

            <TouchableOpacity
              style={[em.saveBtn, !canSave && em.saveBtnDisabled]}
              onPress={handleSave}
              disabled={!canSave}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                  <Text style={em.saveBtnText}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const em = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingTop: 56,
    paddingBottom: 18,
    paddingHorizontal: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "900", color: "#fff" },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  scrollContent: { padding: 16 },
  label: { fontSize: 12, fontWeight: "700", color: "#6b7280", marginBottom: 6, marginTop: 14 },
  input: {
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    backgroundColor: "#f9fafb",
  },
  row2: { flexDirection: "row" },
  unitRow: { flexDirection: "row", gap: 6 },
  unitChip: {
    flex: 1,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingVertical: 12,
    backgroundColor: "#f9fafb",
  },
  unitChipActive: { backgroundColor: "#0891b2", borderColor: "#0891b2" },
  unitChipText: { fontSize: 13, fontWeight: "800", color: "#374151" },
  priceInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    backgroundColor: "#f9fafb",
    paddingHorizontal: 14,
  },
  rupee: { fontSize: 15, fontWeight: "800", color: "#6b7280", marginRight: 4 },
  priceInput: { flex: 1, paddingVertical: 12, fontSize: 14, fontWeight: "600", color: "#111827" },
  totalPreview: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#ecfeff",
    borderWidth: 1,
    borderColor: "#0891b230",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 20,
  },
  totalPreviewLabel: { fontSize: 13, fontWeight: "700", color: "#0891b2" },
  totalPreviewValue: { fontSize: 18, fontWeight: "900", color: "#0891b2" },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#0891b2",
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 20,
  },
  saveBtnDisabled: { backgroundColor: "#d1d5db" },
  saveBtnText: { fontSize: 15, fontWeight: "800", color: "#fff" },
});

// ─── Main Admin Screen ──────────────────────────────────────────────────────────

function AdminFarmSaleScreenInner() {
  const [data, setData] = useState<{
    total_sales: number;
    total_amount: number;
    by_product: Record<string, number>;
    sales: FarmSale[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [editTarget, setEditTarget] = useState<FarmSale | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FarmSale | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { config: alertConfig, show: showAlert, hide: hideAlert } = useModernAlert();

  const fetchData = useCallback(async () => {
    try {
      const res = await api.getAdminFarmSales({ date: todayStr() });
      setData(res);
    } catch (e) {
      console.log("admin farm sale fetch error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleEditSaved = (updated: FarmSale) => {
    setData((prev) => {
      if (!prev) return prev;
      const nextSales = prev.sales.map((s) => (s.id === updated.id ? updated : s));
      const nextTotal = nextSales.reduce((sum, s) => sum + s.total_amount, 0);
      return { ...prev, sales: nextSales, total_amount: nextTotal };
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.adminDeleteFarmSale(deleteTarget.id);
      setData((prev) => {
        if (!prev) return prev;
        const nextSales = prev.sales.filter((s) => s.id !== deleteTarget.id);
        const nextTotal = nextSales.reduce((sum, s) => sum + s.total_amount, 0);
        return { ...prev, sales: nextSales, total_sales: nextSales.length, total_amount: nextTotal };
      });
      setDeleteTarget(null);
    } catch (err: any) {
      setDeleteTarget(null);
      showAlert(
        "Delete Failed",
        err?.message ?? "Could not delete this sale entry.",
        "trash-outline",
        "#ef4444",
        "#fee2e2",
      );
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color="#0891b2" />
        <Text style={s.loadingText}>Loading farm sales…</Text>
      </View>
    );
  }

  const sales = data?.sales ?? [];

  return (
    <>
      <ModernAlert config={alertConfig} onClose={hideAlert} />
      <EditSaleModal
        visible={!!editTarget}
        sale={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={handleEditSaved}
      />
      <DeleteConfirmModal
        visible={!!deleteTarget}
        sale={deleteTarget}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />

      <View style={s.container}>
        {/* ── Header ── */}
        <View style={s.topBar}>
          <View style={{ flex: 1 }}>
            <Text style={s.topBarTitle}>Farm Sales</Text>
            <Text style={s.topBarDate}>{todayStr()}</Text>
          </View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0891b2" />
          }
        >
          {/* ── Revenue Banner ── */}
          <LinearGradient
            colors={["#ecfeff", "#cffafe"]}
            style={[s.banner, { borderColor: "#0891b240" }]}
          >
            <View style={s.bannerLeft}>
              <View style={[s.bannerIconBox, { backgroundColor: "#a5f3fc" }]}>
                <MaterialCommunityIcons name="cash-register" size={22} color="#0891b2" />
              </View>
              <View>
                <Text style={[s.bannerTitle, { color: "#0891b2" }]}>Total Revenue</Text>
                <Text style={s.bannerSub}>
                  {sales.length} sale{sales.length !== 1 ? "s" : ""} today
                </Text>
              </View>
            </View>
            <Text style={[s.totalNum, { color: "#0891b2" }]}>
              ₹{(data?.total_amount ?? 0).toFixed(0)}
            </Text>
          </LinearGradient>

          {/* ── By-product breakdown ── */}
          {data && Object.keys(data.by_product).length > 0 && (
            <View style={s.productBreakdown}>
              {Object.entries(data.by_product).map(([product, qty]) => (
                <View key={product} style={s.productChip}>
                  <Text style={s.productChipLabel}>{product}</Text>
                  <Text style={s.productChipValue}>{qty}</Text>
                </View>
              ))}
            </View>
          )}

          {/* ── Sales List ── */}
          <Text style={s.sectionTitle}>All Sales</Text>

          {sales.length === 0 ? (
            <View style={s.emptyWrap}>
              <MaterialCommunityIcons name="cart-off" size={48} color="#d1d5db" />
              <Text style={s.emptyTitle}>No sales recorded today</Text>
              <Text style={s.emptySub}>
                Sales logged by workers will appear here.
              </Text>
            </View>
          ) : (
            sales.map((sale) => (
              <View key={sale.id} style={s.saleCard}>
                <View style={s.saleTop}>
                  <View style={s.saleAvatar}>
                    <Ionicons name="person" size={18} color="#0891b2" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.saleCustomer}>{sale.customer_name}</Text>
                    <Text style={s.saleMeta}>
                      {sale.product_name} · {sale.quantity} {sale.unit} × ₹{sale.price_per_unit}
                    </Text>
                    <View style={s.workerRow}>
                      <Ionicons name="briefcase-outline" size={11} color="#9ca3af" />
                      <Text style={s.workerName}>{sale.worker_name}</Text>
                    </View>
                  </View>
                  <Text style={s.saleAmount}>₹{sale.total_amount.toFixed(0)}</Text>
                </View>

                <View style={s.saleFooter}>
                  <Text style={s.saleTime}>
                    {parseUTCDate(sale.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                  <View style={s.actionRow}>
                    <TouchableOpacity
                      style={s.editBtn}
                      onPress={() => setEditTarget(sale)}
                      activeOpacity={0.75}
                    >
                      <Ionicons name="pencil" size={13} color="#0891b2" />
                      <Text style={s.editBtnText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={s.deleteBtn}
                      onPress={() => setDeleteTarget(sale)}
                      activeOpacity={0.75}
                    >
                      <Ionicons name="trash-outline" size={13} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </>
  );
}

export default function AdminFarmSaleScreen() {
  return <AdminFarmSaleScreenInner />;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  content: { padding: 16 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { color: "#6b7280", fontSize: 14 },

  topBar: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  topBarTitle: { fontSize: 20, fontWeight: "900", color: "#111827" },
  topBarDate: { fontSize: 12, color: "#9ca3af", marginTop: 2 },

  banner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    marginBottom: 14,
    marginTop: 4,
  },
  bannerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  bannerIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  bannerTitle: { fontSize: 14, fontWeight: "800" },
  bannerSub: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  totalNum: { fontSize: 24, fontWeight: "900" },

  productBreakdown: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  productChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  productChipLabel: { fontSize: 12, fontWeight: "700", color: "#374151" },
  productChipValue: { fontSize: 12, fontWeight: "900", color: "#0891b2" },

  sectionTitle: { fontSize: 14, fontWeight: "800", color: "#111827", marginBottom: 10 },

  emptyWrap: { alignItems: "center", justifyContent: "center", paddingVertical: 48, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: "#6b7280" },
  emptySub: { fontSize: 12, color: "#9ca3af", textAlign: "center", paddingHorizontal: 32 },

  saleCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#f3f4f6",
    padding: 14,
    marginBottom: 10,
  },
  saleTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  saleAvatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#ecfeff",
    alignItems: "center",
    justifyContent: "center",
  },
  saleCustomer: { fontSize: 14, fontWeight: "800", color: "#111827" },
  saleMeta: { fontSize: 12, color: "#9ca3af", marginTop: 2 },
  workerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  workerName: { fontSize: 11, color: "#9ca3af", fontWeight: "600" },
  saleAmount: { fontSize: 16, fontWeight: "900", color: "#0891b2" },
  saleFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  saleTime: { fontSize: 11, color: "#9ca3af", fontWeight: "600" },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ecfeff",
    borderWidth: 1,
    borderColor: "#a5f3fc",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  editBtnText: { fontSize: 12, fontWeight: "800", color: "#0891b2" },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fca5a5",
    alignItems: "center",
    justifyContent: "center",
  },
});