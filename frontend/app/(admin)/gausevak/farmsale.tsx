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
  StatusBar,
  Image,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Sharing from "expo-sharing";
import ViewShot, { captureRef } from "react-native-view-shot";
import { useAuth } from "../../../src/contexts/AuthContext";
import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { api, FarmSale, PaymentMethod } from "../../../src/services/api";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function fmtShortDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const UNIT_OPTIONS = ["kg", "L", "pcs"] as const;

// ─── Customer directory (merged online + offline) ─────────────────────────────

interface SimpleCustomer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  source: "online" | "offline" | "both";
}

function customerDirKey(c: { id: string; phone?: string; email?: string }): string {
  const phone = (c.phone || "").trim().toLowerCase();
  const email = (c.email || "").trim().toLowerCase();
  if (phone) return `phone:${phone}`;
  if (email) return `email:${email}`;
  return `id:${c.id}`;
}

function buildCustomerDirectory(offlineRows: any[], onlineRows: any[]): SimpleCustomer[] {
  const map = new Map<string, SimpleCustomer>();

  offlineRows.forEach((row) => {
    const id = row?.id || row?._id;
    if (!id || !row?.name) return;
    const entry: SimpleCustomer = {
      id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      source: row.linked_user_id ? "both" : "offline",
    };
    map.set(customerDirKey(entry), entry);
  });

  onlineRows.forEach((row) => {
    const id = row?.id || row?._id;
    const name = row?.name || row?.full_name;
    if (!id || !name) return;
    const entry: SimpleCustomer = {
      id,
      name,
      phone: row.phone || row.mobile,
      email: row.email,
      source: "online",
    };
    const key = customerDirKey(entry);
    const existing = map.get(key);
    if (existing) {
      map.set(key, { ...existing, source: "both" });
    } else {
      map.set(key, entry);
    }
  });

  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

// ─── Product directory (admin's own inventory / catalog) ──────────────────────

interface SimpleProduct {
  id: string;
  name: string;
  price?: number;
  unit?: string;
  category?: string;
  stock?: number;
}

function normalizeProducts(rows: any[]): SimpleProduct[] {
  const map = new Map<string, SimpleProduct>();
  (rows || []).forEach((row) => {
    const id = row?.id || row?._id;
    const name = row?.name || row?.product_name || row?.title;
    if (!id || !name) return;
    const price =
      typeof row?.price === "number"
        ? row.price
        : typeof row?.price_per_unit === "number"
          ? row.price_per_unit
          : typeof row?.sale_price === "number"
            ? row.sale_price
            : undefined;
    const rawUnit = (row?.unit || row?.unit_type || "").toString().toLowerCase();
    let unit: string | undefined;
    if (rawUnit.startsWith("kg")) unit = "kg";
    else if (rawUnit === "l" || rawUnit.startsWith("lit")) unit = "L";
    else if (rawUnit.startsWith("pc") || rawUnit.startsWith("piece")) unit = "pcs";

    const stock =
      typeof row?.stock === "number"
        ? row.stock
        : typeof row?.stock_quantity === "number"
          ? row.stock_quantity
          : typeof row?.quantity === "number"
            ? row.quantity
            : undefined;

    map.set(id, {
      id,
      name,
      price,
      unit,
      category: row?.category,
      stock,
    });
  });
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

// ─── Grouping sales by customer (for "All Sales") ─────────────────────────────

type CustomerGroup = {
  key: string;
  name: string;
  phone?: string;
  sales: FarmSale[];
  totalAmount: number;
  lastDate: string;
};

function buildCustomerGroups(
  sales: FarmSale[],
  directory: SimpleCustomer[],
): CustomerGroup[] {
  const byId = new Map(directory.map((c) => [c.id, c]));
  const map = new Map<string, CustomerGroup>();

  sales.forEach((sale) => {
    const dirMatch = (sale as any).customer_id ? byId.get((sale as any).customer_id) : undefined;
    const key = (sale as any).customer_id || sale.customer_name.trim().toLowerCase();
    const existing = map.get(key);
    if (existing) {
      existing.sales.push(sale);
      existing.totalAmount += sale.total_amount;
      if (sale.date > existing.lastDate) existing.lastDate = sale.date;
    } else {
      map.set(key, {
        key,
        name: dirMatch?.name || sale.customer_name,
        phone: dirMatch?.phone,
        sales: [sale],
        totalAmount: sale.total_amount,
        lastDate: sale.date,
      });
    }
  });

  return [...map.values()].sort((a, b) => (a.lastDate < b.lastDate ? 1 : -1));
}

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
          style={[al.card, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}
        >
          <View style={[al.iconWrap, { backgroundColor: config.iconBg ?? "#fee2e2" }]}>
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

// ─── Undo/Delete Confirm Modal ────────────────────────────────────────────────

function UndoConfirmModal({
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
      <View style={uc.overlay}>
        <Animated.View
          style={[uc.card, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}
        >
          <View style={uc.iconRing}>
            <View style={uc.iconInner}>
              <Ionicons name="trash" size={24} color="#ef4444" />
            </View>
          </View>

          <Text style={uc.title}>Delete Sale Entry?</Text>
          <Text style={uc.subtitle}>This will permanently remove the sale for</Text>

          <View style={uc.chip}>
            <Ionicons name="person" size={14} color="#374151" />
            <Text style={uc.chipName}>{sale.customer_name}</Text>
            <View style={uc.chipDivider} />
            <Text style={uc.chipTag}>{sale.product_name}</Text>
            <View style={uc.chipDivider} />
            <Text style={uc.chipQty}>₹{sale.total_amount.toFixed(0)}</Text>
          </View>

          <Text style={uc.warn}>
            This sale will be removed from the total and cannot be recovered.
          </Text>

          <View style={uc.btnRow}>
            <TouchableOpacity
              style={uc.cancelBtn}
              onPress={onCancel}
              activeOpacity={0.75}
              disabled={loading}
            >
              <Text style={uc.cancelTxt}>Keep it</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[uc.confirmBtn, loading && { opacity: 0.7 }]}
              onPress={onConfirm}
              activeOpacity={0.8}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="trash" size={15} color="#fff" />
                  <Text style={uc.confirmTxt}>Yes, Delete</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const uc = StyleSheet.create({
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
  chipQty: { fontSize: 13, fontWeight: "800", color: "#4f46e5" },
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

// ─── Number Stepper ───────────────────────────────────────────────────────────

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

// ─── Customer Picker Modal (select existing app customer, or add new) ────────

function CustomerPickerModal({
  visible,
  customers,
  loading,
  onSelect,
  onClose,
}: {
  visible: boolean;
  customers: SimpleCustomer[];
  loading: boolean;
  onSelect: (customer: { id: string | null; name: string }) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (visible) setSearch("");
  }, [visible]);

  const filtered = customers.filter((c) =>
    `${c.name} ${c.phone ?? ""}`.toLowerCase().includes(search.toLowerCase()),
  );
  const trimmed = search.trim();
  const exactMatch = customers.some(
    (c) => c.name.toLowerCase() === trimmed.toLowerCase(),
  );
  const showAddNew = trimmed.length > 0 && !exactMatch;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity activeOpacity={1} style={cp.overlay} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={cp.sheet}>
          <View style={cp.header}>
            <Text style={cp.title}>Select Customer</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <View style={cp.searchRow}>
            <Ionicons name="search-outline" size={16} color="#9ca3af" />
            <TextInput
              style={cp.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search or type new customer name"
              placeholderTextColor="#9ca3af"
              autoFocus
            />
          </View>

          {loading ? (
            <View style={cp.loadingBox}>
              <ActivityIndicator color="#4f46e5" />
            </View>
          ) : (
            <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
              {showAddNew && (
                <TouchableOpacity
                  style={cp.addNewItem}
                  onPress={() => {
                    onSelect({ id: null, name: trimmed });
                    onClose();
                  }}
                >
                  <Ionicons name="add-circle" size={18} color="#4f46e5" />
                  <View style={{ flex: 1 }}>
                    <Text style={cp.addNewText}>Add "{trimmed}" as new customer</Text>
                    <Text style={cp.addNewSub}>Not in your customer list yet</Text>
                  </View>
                </TouchableOpacity>
              )}

              {filtered.length === 0 && !showAddNew ? (
                <View style={cp.emptyBox}>
                  <Ionicons name="people-outline" size={26} color="#d1d5db" />
                  <Text style={cp.emptyText}>No customers found</Text>
                </View>
              ) : (
                filtered.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={cp.item}
                    onPress={() => {
                      onSelect({ id: c.id, name: c.name });
                      onClose();
                    }}
                  >
                    <View style={cp.itemAvatar}>
                      <Text style={cp.itemAvatarText}>
                        {c.name.slice(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={cp.itemName}>{c.name}</Text>
                      <Text style={cp.itemSub}>{c.phone || "No phone"}</Text>
                    </View>
                    <View
                      style={[
                        cp.sourceBadge,
                        c.source === "online"
                          ? { backgroundColor: "#f5f3ff", borderColor: "#ddd6fe" }
                          : c.source === "both"
                            ? { backgroundColor: "#eff6ff", borderColor: "#bfdbfe" }
                            : { backgroundColor: "#f8fafc", borderColor: "#e2e8f0" },
                      ]}
                    >
                      <Text style={cp.sourceBadgeText}>
                        {c.source === "online"
                          ? "Online"
                          : c.source === "both"
                            ? "Online+Offline"
                            : "Offline"}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const cp = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.35)",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  sheet: {
    backgroundColor: "#fff",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 16,
    maxHeight: "80%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: { fontSize: 16, fontWeight: "800", color: "#111827" },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#111827" },
  loadingBox: { paddingVertical: 40, alignItems: "center" },
  emptyBox: { paddingVertical: 30, alignItems: "center", gap: 6 },
  emptyText: { fontSize: 13, color: "#9ca3af", fontWeight: "600" },
  addNewItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#eef2ff",
    borderWidth: 1,
    borderColor: "#c7d2fe",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
  },
  addNewText: { fontSize: 13, fontWeight: "800", color: "#4f46e5" },
  addNewSub: { fontSize: 11, color: "#6366f1", marginTop: 1 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    marginBottom: 8,
  },
  itemAvatar: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#eef2ff",
    alignItems: "center",
    justifyContent: "center",
  },
  itemAvatarText: { fontSize: 12, fontWeight: "800", color: "#4f46e5" },
  itemName: { fontSize: 13.5, fontWeight: "700", color: "#111827" },
  itemSub: { fontSize: 11, color: "#9ca3af", marginTop: 1 },
  sourceBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  sourceBadgeText: { fontSize: 9.5, fontWeight: "700", color: "#4b5563" },
});

// ─── Product Picker Modal (select existing inventory product, or add new) ────

function ProductPickerModal({
  visible,
  products,
  loading,
  onSelect,
  onClose,
}: {
  visible: boolean;
  products: SimpleProduct[];
  loading: boolean;
  onSelect: (product: { id: string | null; name: string; price?: number; unit?: string }) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (visible) setSearch("");
  }, [visible]);

  const filtered = products.filter((p) =>
    `${p.name} ${p.category ?? ""}`.toLowerCase().includes(search.toLowerCase()),
  );
  const trimmed = search.trim();
  const exactMatch = products.some(
    (p) => p.name.toLowerCase() === trimmed.toLowerCase(),
  );
  const showAddNew = trimmed.length > 0 && !exactMatch;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity activeOpacity={1} style={cp.overlay} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={cp.sheet}>
          <View style={cp.header}>
            <Text style={cp.title}>Select Product</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <View style={cp.searchRow}>
            <Ionicons name="search-outline" size={16} color="#9ca3af" />
            <TextInput
              style={cp.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search or type a new product name"
              placeholderTextColor="#9ca3af"
              autoFocus
            />
          </View>

          {loading ? (
            <View style={cp.loadingBox}>
              <ActivityIndicator color="#4f46e5" />
            </View>
          ) : (
            <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
              {showAddNew && (
                <TouchableOpacity
                  style={cp.addNewItem}
                  onPress={() => {
                    onSelect({ id: null, name: trimmed });
                    onClose();
                  }}
                >
                  <Ionicons name="add-circle" size={18} color="#4f46e5" />
                  <View style={{ flex: 1 }}>
                    <Text style={cp.addNewText}>Add "{trimmed}" as new product</Text>
                    <Text style={cp.addNewSub}>Not in your inventory yet</Text>
                  </View>
                </TouchableOpacity>
              )}

              {filtered.length === 0 && !showAddNew ? (
                <View style={cp.emptyBox}>
                  <Ionicons name="cube-outline" size={26} color="#d1d5db" />
                  <Text style={cp.emptyText}>
                    {products.length === 0 ? "No inventory products yet" : "No products found"}
                  </Text>
                </View>
              ) : (
                filtered.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={cp.item}
                    onPress={() => {
                      onSelect({ id: p.id, name: p.name, price: p.price, unit: p.unit });
                      onClose();
                    }}
                  >
                    <View style={cp.itemAvatar}>
                      <MaterialCommunityIcons name="package-variant" size={16} color="#4f46e5" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={cp.itemName}>{p.name}</Text>
                      <Text style={cp.itemSub}>
                        {typeof p.stock === "number" ? `${p.stock} in stock` : "In inventory"}
                      </Text>
                    </View>
                   
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Receipt Viewer Modal (still used for legacy receipt_image on old entries) ─

function ReceiptViewerModal({
  visible,
  imageUri,
  onClose,
}: {
  visible: boolean;
  imageUri: string | null;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState<"share" | "download" | null>(null);
  const { config: alertConfig, show: showAlert, hide: hideAlert } = useModernAlert();

  const writeToTempFile = async (uri: string) => {
    const FileSystem = require("expo-file-system");
    const base64Data = uri.includes(",") ? uri.split(",")[1] : uri;
    const fileUri = `${FileSystem.cacheDirectory}receipt_${Date.now()}.jpg`;
    await FileSystem.writeAsStringAsync(fileUri, base64Data, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return fileUri;
  };

  const handleShare = async () => {
    if (!imageUri) return;
    setBusy("share");
    try {
      const fileUri = await writeToTempFile(imageUri);
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        showAlert("Something Went Wrong", "Could not share the receipt.", "share-outline", "#ef4444", "#fee2e2");
        return;
      }
      await Sharing.shareAsync(fileUri, { mimeType: "image/jpeg" });
    } catch (err) {
      showAlert("Something Went Wrong", "Could not share the receipt.", "share-outline", "#ef4444", "#fee2e2");
    } finally {
      setBusy(null);
    }
  };

  const handleDownload = async () => {
    if (!imageUri) return;
    setBusy("download");
    try {
      const MediaLibrary = require("expo-media-library");
      const perm = await MediaLibrary.requestPermissionsAsync();
      if (!perm.granted) {
        showAlert("Permission Needed", "Allow gallery access to save the receipt.", "images-outline", "#6b7280", "#f3f4f6");
        return;
      }
      const fileUri = await writeToTempFile(imageUri);
      const asset = await MediaLibrary.createAssetAsync(fileUri);
      await MediaLibrary.createAlbumAsync("Farm Sale Receipts", asset, false);
      showAlert("Saved", "Receipt has been saved to your gallery.", "checkmark-circle-outline", "#16a34a", "#dcfce7");
    } catch (err) {
      showAlert("Something Went Wrong", "Could not save the receipt.", "download-outline", "#ef4444", "#fee2e2");
    } finally {
      setBusy(null);
    }
  };

  if (!imageUri) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <ModernAlert config={alertConfig} onClose={hideAlert} />
      <View style={rv.overlay}>
        <View style={rv.header}>
          <Text style={rv.headerTitle}>Receipt</Text>
          <TouchableOpacity onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={rv.imageWrap}>
          <Image source={{ uri: imageUri }} style={rv.image} resizeMode="contain" />
        </View>
        <View style={rv.actionRow}>
          <TouchableOpacity style={rv.actionBtn} onPress={handleShare} disabled={busy !== null}>
            {busy === "share" ? (
              <ActivityIndicator size="small" color="#111827" />
            ) : (
              <>
                <Ionicons name="share-outline" size={18} color="#111827" />
                <Text style={rv.actionBtnText}>Share</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[rv.actionBtn, rv.actionBtnPrimary]}
            onPress={handleDownload}
            disabled={busy !== null}
          >
            {busy === "download" ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="download-outline" size={18} color="#fff" />
                <Text style={[rv.actionBtnText, { color: "#fff" }]}>Download</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const rv = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.92)" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 16, fontWeight: "800", color: "#fff" },
  imageWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  image: { width: "100%", height: "100%" },
  actionRow: { flexDirection: "row", gap: 10, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 36 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 14,
  },
  actionBtnPrimary: { backgroundColor: "#4f46e5" },
  actionBtnText: { fontSize: 14, fontWeight: "800", color: "#111827" },
});

// ─── Auto-generated / on-demand Receipt Modal ────────────────────────────────

type ReceiptPreviewData = {
  customer_name: string;
  product_name: string;
  quantity: number;
  unit: string;
  price_per_unit: number;
  total_amount: number;
  payment_method?: PaymentMethod;
  worker_name?: string;
  date: string;
};

function SuccessReceiptModal({
  visible,
  sale,
  farmName,
  onClose,
  title = "Sale Recorded",
  subtitle = "Receipt generated successfully",
}: {
  visible: boolean;
  sale: ReceiptPreviewData | null;
  farmName: string;
  onClose: () => void;
  title?: string;
  subtitle?: string;
}) {
  const shotRef = useRef<any>(null);
  const [sharing, setSharing] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.9);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          damping: 14,
          stiffness: 200,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible || !sale) return null;

  const handleShare = async () => {
    if (sharing || !shotRef.current) return;
    setSharing(true);
    try {
      const uri = await captureRef(shotRef.current, {
        format: "png",
        quality: 1,
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "image/png",
          dialogTitle: "Share Receipt",
        });
      }
    } catch (e) {
      // non-critical — sharing failing shouldn't block the flow
    } finally {
      setSharing(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={rc.overlay}>
        <Animated.View
          style={[rc.card, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}
        >
          <ViewShot ref={shotRef} style={rc.shotWrap}>
            <View style={rc.receiptBody}>
              <View style={rc.successIconRing}>
                <View style={rc.successIconInner}>
                  <Ionicons name="checkmark" size={26} color="#fff" />
                </View>
              </View>
              <Text style={rc.successTitle}>{title}</Text>
              <Text style={rc.successSub}>{subtitle}</Text>

              <View style={rc.divider} />

              <View style={rc.headerRow}>
                <Text style={rc.farmName}>{farmName}</Text>
                <Text style={rc.dateText}>{fmtShortDate(sale.date)}</Text>
              </View>

              <View style={rc.rowsBlock}>
                <View style={rc.row}>
                  <Text style={rc.rowLabel}>Customer</Text>
                  <Text style={rc.rowValue}>{sale.customer_name}</Text>
                </View>
                <View style={rc.row}>
                  <Text style={rc.rowLabel}>Product</Text>
                  <Text style={rc.rowValue}>{sale.product_name}</Text>
                </View>
                <View style={rc.row}>
                  <Text style={rc.rowLabel}>Quantity</Text>
                  <Text style={rc.rowValue}>
                    {sale.quantity} {sale.unit}
                  </Text>
                </View>
                <View style={rc.row}>
                  <Text style={rc.rowLabel}>Price / unit</Text>
                  <Text style={rc.rowValue}>₹{sale.price_per_unit.toFixed(2)}</Text>
                </View>
                <View style={rc.row}>
                  <Text style={rc.rowLabel}>Payment Mode</Text>
                  <Text style={rc.rowValue}>
                    {sale.payment_method === "upi" ? "UPI" : "Cash"}
                  </Text>
                </View>
                {sale.worker_name ? (
                  <View style={rc.row}>
                    <Text style={rc.rowLabel}>Recorded By</Text>
                    <Text style={rc.rowValue}>{sale.worker_name}</Text>
                  </View>
                ) : null}
              </View>

              <View style={rc.totalDivider} />

              <View style={rc.totalRow}>
                <Text style={rc.totalLabel}>Total Amount</Text>
                <Text style={rc.totalValue}>₹{sale.total_amount.toFixed(2)}</Text>
              </View>

              <View style={rc.footerRow}>
                <Ionicons name="shield-checkmark" size={11} color="#9ca3af" />
                <Text style={rc.footerText}>Farm Sale Receipt</Text>
              </View>
            </View>
          </ViewShot>

          <View style={rc.actionRow}>
            <TouchableOpacity style={rc.shareBtn} onPress={handleShare} disabled={sharing}>
              {sharing ? (
                <ActivityIndicator size="small" color="#111827" />
              ) : (
                <>
                  <Ionicons name="share-outline" size={17} color="#111827" />
                  <Text style={rc.shareBtnText}>Share</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={rc.doneBtn} onPress={onClose} activeOpacity={0.85}>
              <Text style={rc.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const rc = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 26,
  },
  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 10 },
    elevation: 18,
  },
  shotWrap: { borderRadius: 18, overflow: "hidden" },
  receiptBody: {
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 18,
    alignItems: "center",
  },
  successIconRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  successIconInner: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#16a34a",
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: { fontSize: 18, fontWeight: "900", color: "#111827" },
  successSub: { fontSize: 12, color: "#6b7280", fontWeight: "500", marginTop: 2 },
  divider: {
    height: 1,
    backgroundColor: "#f3f4f6",
    width: "100%",
    marginVertical: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 14,
  },
  farmName: { fontSize: 14, fontWeight: "800", color: "#111827" },
  dateText: { fontSize: 12, color: "#9ca3af", fontWeight: "600" },
  rowsBlock: { width: "100%", gap: 10 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowLabel: { fontSize: 12.5, color: "#6b7280", fontWeight: "600" },
  rowValue: { fontSize: 13, color: "#111827", fontWeight: "700" },
  totalDivider: {
    height: 1,
    backgroundColor: "#f3f4f6",
    width: "100%",
    marginTop: 16,
    marginBottom: 12,
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 16,
  },
  totalLabel: { fontSize: 14, fontWeight: "800", color: "#111827" },
  totalValue: { fontSize: 18, fontWeight: "900", color: "#4f46e5" },
  footerRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  footerText: { fontSize: 10, color: "#9ca3af", fontWeight: "600" },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  shareBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 14,
    paddingVertical: 13,
  },
  shareBtnText: { fontSize: 13, fontWeight: "800", color: "#111827" },
  doneBtn: {
    flex: 1,
    backgroundColor: "#111827",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  doneBtnText: { fontSize: 13, fontWeight: "800", color: "#fff" },
});

// ─── Invoice Modal (multi-item, generated from a customer's full sale history) ─

function InvoiceModal({
  visible,
  group,
  farmName,
  onClose,
}: {
  visible: boolean;
  group: CustomerGroup | null;
  farmName: string;
  onClose: () => void;
}) {
  const shotRef = useRef<any>(null);
  const [sharing, setSharing] = useState(false);

  if (!visible || !group) return null;

  const sortedSales = [...group.sales].sort((a, b) => (a.date < b.date ? -1 : 1));
  const invoiceNo = `INV-${group.key.replace(/[^a-zA-Z0-9]/g, "").slice(0, 5).toUpperCase() || "CUST"}-${Date.now()
    .toString()
    .slice(-6)}`;

  const handleShare = async () => {
    if (sharing || !shotRef.current) return;
    setSharing(true);
    try {
      const uri = await captureRef(shotRef.current, { format: "png", quality: 1 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "image/png",
          dialogTitle: "Share Invoice",
        });
      }
    } catch (e) {
      // non-critical
    } finally {
      setSharing(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={inv.overlay}>
        <View style={inv.card}>
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 540 }}>
            <ViewShot ref={shotRef} style={inv.shotWrap}>
              <View style={inv.body}>
                <View style={inv.headerRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={inv.farmName}>{farmName}</Text>
                    <Text style={inv.invoiceLabel}>Sales Invoice</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={inv.invoiceNo}>{invoiceNo}</Text>
                    <Text style={inv.invoiceDate}>{fmtShortDate(todayStr())}</Text>
                  </View>
                </View>

                <View style={inv.divider} />

                <Text style={inv.billTo}>Billed To</Text>
                <Text style={inv.customerName}>{group.name}</Text>
                {group.phone ? <Text style={inv.customerPhone}>{group.phone}</Text> : null}

                <View style={inv.tableHeader}>
                  <Text style={[inv.th, { flex: 2 }]}>Product</Text>
                  <Text style={[inv.th, { flex: 1, textAlign: "center" }]}>Qty</Text>
                  <Text style={[inv.th, { flex: 1, textAlign: "right" }]}>Rate</Text>
                  <Text style={[inv.th, { flex: 1, textAlign: "right" }]}>Amount</Text>
                </View>

                {sortedSales.map((sale) => (
                  <View key={sale.id} style={inv.tableRow}>
                    <View style={{ flex: 2 }}>
                      <Text style={inv.td}>{sale.product_name}</Text>
                      <Text style={inv.tdSub}>{fmtShortDate(sale.date)}</Text>
                    </View>
                    <Text style={[inv.td, { flex: 1, textAlign: "center" }]}>
                      {sale.quantity} {sale.unit}
                    </Text>
                    <Text style={[inv.td, { flex: 1, textAlign: "right" }]}>
                      ₹{sale.price_per_unit.toFixed(2)}
                    </Text>
                    <Text
                      style={[
                        inv.td,
                        { flex: 1, textAlign: "right", fontWeight: "800" },
                      ]}
                    >
                      ₹{sale.total_amount.toFixed(2)}
                    </Text>
                  </View>
                ))}

                <View style={inv.totalDivider} />
                <View style={inv.totalRow}>
                  <Text style={inv.totalLabel}>Grand Total</Text>
                  <Text style={inv.totalValue}>₹{group.totalAmount.toFixed(2)}</Text>
                </View>

                <View style={inv.footerRow}>
                  <Ionicons name="shield-checkmark" size={11} color="#9ca3af" />
                  <Text style={inv.footerText}>Generated Sales Invoice</Text>
                </View>
              </View>
            </ViewShot>
          </ScrollView>

          <View style={inv.actionRow}>
            <TouchableOpacity style={inv.shareBtn} onPress={handleShare} disabled={sharing}>
              {sharing ? (
                <ActivityIndicator size="small" color="#111827" />
              ) : (
                <>
                  <Ionicons name="share-outline" size={17} color="#111827" />
                  <Text style={inv.shareBtnText}>Share</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={inv.doneBtn} onPress={onClose} activeOpacity={0.85}>
              <Text style={inv.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const inv = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 18,
  },
  shotWrap: { borderRadius: 16, overflow: "hidden" },
  body: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    padding: 18,
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between" },
  farmName: { fontSize: 16, fontWeight: "900", color: "#111827" },
  invoiceLabel: { fontSize: 11, color: "#6b7280", marginTop: 2, fontWeight: "600" },
  invoiceNo: { fontSize: 12, fontWeight: "800", color: "#4f46e5" },
  invoiceDate: { fontSize: 11, color: "#9ca3af", marginTop: 2 },
  divider: { height: 1, backgroundColor: "#f3f4f6", marginVertical: 14 },
  billTo: {
    fontSize: 10,
    color: "#9ca3af",
    fontWeight: "700",
    textTransform: "uppercase",
  },
  customerName: { fontSize: 15, fontWeight: "800", color: "#111827", marginTop: 3 },
  customerPhone: { fontSize: 12, color: "#6b7280", marginTop: 1 },
  tableHeader: {
    flexDirection: "row",
    marginTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  th: { fontSize: 10.5, fontWeight: "800", color: "#6b7280", textTransform: "uppercase" },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  td: { fontSize: 12.5, color: "#111827", fontWeight: "600" },
  tdSub: { fontSize: 10.5, color: "#9ca3af", marginTop: 2 },
  totalDivider: {
    height: 1,
    marginTop: 8,
    marginBottom: 12,
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
  totalLabel: { fontSize: 14, fontWeight: "800", color: "#111827" },
  totalValue: { fontSize: 18, fontWeight: "900", color: "#4f46e5" },
  footerRow: { flexDirection: "row", alignItems: "center", gap: 5, justifyContent: "center" },
  footerText: { fontSize: 10, color: "#9ca3af", fontWeight: "600" },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  shareBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 14,
    paddingVertical: 13,
  },
  shareBtnText: { fontSize: 13, fontWeight: "800", color: "#111827" },
  doneBtn: {
    flex: 1,
    backgroundColor: "#111827",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  doneBtnText: { fontSize: 13, fontWeight: "800", color: "#fff" },
});

// ─── All Sales (grouped by customer) Modal ────────────────────────────────────

function CustomerSalesModal({
  visible,
  groups,
  farmName,
  onClose,
}: {
  visible: boolean;
  groups: CustomerGroup[];
  farmName: string;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<CustomerGroup | null>(null);
  const [invoiceGroup, setInvoiceGroup] = useState<CustomerGroup | null>(null);

  useEffect(() => {
    if (!visible) {
      setSearch("");
      setSelected(null);
    }
  }, [visible]);

  // Keep the open detail view in sync if the underlying sales list refreshes
  useEffect(() => {
    if (selected) {
      const fresh = groups.find((g) => g.key === selected.key);
      setSelected(fresh ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups]);

  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={csm.overlay}>
        <View style={csm.sheet}>
          <View style={csm.handle} />
          <View style={csm.header}>
            <View style={{ flex: 1 }}>
              {selected ? (
                <TouchableOpacity style={csm.backRow} onPress={() => setSelected(null)}>
                  <Ionicons name="arrow-back" size={18} color="#4f46e5" />
                  <Text style={csm.backText}>All Customers</Text>
                </TouchableOpacity>
              ) : (
                <Text style={csm.title}>All Farm Sales </Text>
              )}
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {!selected ? (
            <>
              <View style={csm.searchRow}>
                <Ionicons name="search-outline" size={16} color="#9ca3af" />
                <TextInput
                  style={csm.searchInput}
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search customer"
                  placeholderTextColor="#9ca3af"
                />
              </View>
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
                {filteredGroups.length === 0 ? (
                  <View style={csm.emptyBox}>
                    <Ionicons name="receipt-outline" size={30} color="#d1d5db" />
                    <Text style={csm.emptyText}>No sales recorded yet</Text>
                  </View>
                ) : (
                  filteredGroups.map((g) => (
                    <TouchableOpacity
                      key={g.key}
                      style={csm.groupCard}
                      onPress={() => setSelected(g)}
                    >
                      <View style={csm.groupAvatar}>
                        <Text style={csm.groupAvatarText}>
                          {g.name.slice(0, 2).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={csm.groupName}>{g.name}</Text>
                        <Text style={csm.groupMeta}>
                          {g.sales.length} sale{g.sales.length > 1 ? "s" : ""} · Last{" "}
                          {fmtShortDate(g.lastDate)}
                        </Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={csm.groupTotal}>₹{g.totalAmount.toFixed(0)}</Text>
                        <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </>
          ) : (
            <>
              <View style={csm.detailHeaderCard}>
                <Text style={csm.detailName}>{selected.name}</Text>
                {selected.phone ? <Text style={csm.detailPhone}>{selected.phone}</Text> : null}
                <View style={csm.detailTotalRow}>
                  <Text style={csm.detailTotalLabel}>Total Purchased</Text>
                  <Text style={csm.detailTotalValue}>₹{selected.totalAmount.toFixed(2)}</Text>
                </View>
                <TouchableOpacity
                  style={csm.invoiceBtn}
                  onPress={() => setInvoiceGroup(selected)}
                >
                  <Ionicons name="receipt-outline" size={16} color="#fff" />
                  <Text style={csm.invoiceBtnText}>Generate Invoice</Text>
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
                {[...selected.sales]
                  .sort((a, b) => (a.date < b.date ? 1 : -1))
                  .map((sale) => (
                    <View key={sale.id} style={csm.saleRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={csm.saleProduct}>{sale.product_name}</Text>
                        <Text style={csm.saleMeta}>
                          {sale.quantity} {sale.unit} × ₹{sale.price_per_unit.toFixed(2)} ·{" "}
                          {fmtShortDate(sale.date)}
                        </Text>
                      </View>
                      <Text style={csm.saleAmount}>₹{sale.total_amount.toFixed(0)}</Text>
                    </View>
                  ))}
              </ScrollView>
            </>
          )}
        </View>
      </View>

      <InvoiceModal
        visible={!!invoiceGroup}
        group={invoiceGroup}
        farmName={farmName}
        onClose={() => setInvoiceGroup(null)}
      />
    </Modal>
  );
}

const csm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.42)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 18,
    paddingBottom: Platform.OS === "ios" ? 34 : 22,
    maxHeight: "88%",
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: "#e5e7eb",
    borderRadius: 999,
    alignSelf: "center",
    marginBottom: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: { fontSize: 17, fontWeight: "800", color: "#111827" },
  backRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  backText: { fontSize: 14, fontWeight: "800", color: "#4f46e5" },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#111827" },
  emptyBox: { paddingVertical: 50, alignItems: "center", gap: 8 },
  emptyText: { fontSize: 13, color: "#9ca3af" },
  groupCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  groupAvatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#eef2ff",
    alignItems: "center",
    justifyContent: "center",
  },
  groupAvatarText: { fontSize: 13, fontWeight: "800", color: "#4f46e5" },
  groupName: { fontSize: 14, fontWeight: "800", color: "#111827" },
  groupMeta: { fontSize: 11.5, color: "#9ca3af", marginTop: 2 },
  groupTotal: { fontSize: 14, fontWeight: "900", color: "#111827" },
  detailHeaderCard: {
    borderWidth: 1,
    borderColor: "#f3f4f6",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    backgroundColor: "#f9fafb",
  },
  detailName: { fontSize: 17, fontWeight: "900", color: "#111827" },
  detailPhone: { fontSize: 12.5, color: "#6b7280", marginTop: 2 },
  detailTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    marginBottom: 12,
  },
  detailTotalLabel: { fontSize: 12.5, color: "#6b7280", fontWeight: "600" },
  detailTotalValue: { fontSize: 16, fontWeight: "900", color: "#4f46e5" },
  invoiceBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "#111827",
    borderRadius: 12,
    paddingVertical: 12,
  },
  invoiceBtnText: { fontSize: 13, fontWeight: "800", color: "#fff" },
  saleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  saleProduct: { fontSize: 13.5, fontWeight: "700", color: "#111827" },
  saleMeta: { fontSize: 11.5, color: "#9ca3af", marginTop: 2 },
  saleAmount: { fontSize: 14, fontWeight: "800", color: "#111827" },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

function FarmSaleScreenInner() {
  const { user } = useAuth(); // ← logged-in admin (farm owner)
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const formLayoutY = useRef(0);

  const [allSales, setAllSales] = useState<FarmSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("Today");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<FarmSale | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [viewerUri, setViewerUri] = useState<string | null>(null);
  const [viewerVisible, setViewerVisible] = useState(false);

  const { config: alertConfig, show: showAlert, hide: hideAlert } = useModernAlert();

  // Business identity — pulled straight from the logged-in admin's profile
  const farmName = user?.name ?? "My Farm";
  const supportContact = (user as any)?.phone ?? "";

  // Form state
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPickerVisible, setCustomerPickerVisible] = useState(false);
  const [productId, setProductId] = useState<string | null>(null);
  const [productName, setProductName] = useState("");
  const [productPickerVisible, setProductPickerVisible] = useState(false);
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState<string>("kg");
  const [pricePerUnit, setPricePerUnit] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);

  const [qrLoading, setQrLoading] = useState(false);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);

  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [qrSecondsLeft, setQrSecondsLeft] = useState(300);

  // Auto-generated success receipt shown right after a sale is saved
  const [successReceipt, setSuccessReceipt] = useState<ReceiptPreviewData | null>(null);
  // Receipt preview generated on-demand from current form fields, before saving
  const [receiptPreview, setReceiptPreview] = useState<ReceiptPreviewData | null>(null);

  // Customer directory (merged online + offline app customers) + "All Sales" view
  const [customersList, setCustomersList] = useState<SimpleCustomer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [allSalesVisible, setAllSalesVisible] = useState(false);

  // Product / inventory directory (admin's own catalog products)
  const [productsList, setProductsList] = useState<SimpleProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);

  // ── Data loading — admin-scoped farm sales ──

  const fetchAll = useCallback(async () => {
    try {
      const res = await api.getAdminFarmSales({ all: true });
      setAllSales(res.sales ?? []);
    } catch (e) {
      console.log("all sales fetch error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchCustomerDirectory = useCallback(async () => {
    setCustomersLoading(true);
    try {
      const [offlineRes, onlineRes] = await Promise.allSettled([
        api.getAdminCustomers({ limit: 200, is_active: true }),
        api.getAllUsers("customer"),
      ]);
      const offlineRows = offlineRes.status === "fulfilled" ? offlineRes.value ?? [] : [];
      const onlineRows = onlineRes.status === "fulfilled" ? onlineRes.value ?? [] : [];
      setCustomersList(buildCustomerDirectory(offlineRows, onlineRows));
    } catch (e) {
      console.log("customer directory fetch error:", e);
      setCustomersList([]);
    } finally {
      setCustomersLoading(false);
    }
  }, []);

  // Loads the admin's own inventory/catalog products so they can be picked
  // straight from the sale form instead of retyping name + price each time.
  const fetchProductDirectory = useCallback(async () => {
    setProductsLoading(true);
    try {
      const rows = await api.getProducts(user?.id);
      setProductsList(normalizeProducts(rows ?? []));
    } catch (e) {
      console.log("product directory fetch error:", e);
      setProductsList([]);
    } finally {
      setProductsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchAll();
    fetchCustomerDirectory();
    fetchProductDirectory();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAll();
  };

  // Attribution helper: sales added directly by this admin show as "Farm Owner"
  const attributionFor = (sale: FarmSale) =>
    sale.worker_id === user?.id ? "Farm Owner" : sale.worker_name;

  // ── Filter chips + search (client-side only, UI only) ──

  const displayedSales = React.useMemo(() => {
    let list = allSales;
    const now = new Date();
    if (activeFilter === "Today") {
      list = list.filter((s) => s.date === todayStr());
    } else if (activeFilter === "Last 7 days") {
      list = list.filter((s) => {
        const d = new Date(s.date);
        const diff = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
        return diff >= 0 && diff < 7;
      });
    } else if (activeFilter === "This month") {
      list = list.filter((s) => {
        const d = new Date(s.date);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      });
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (s) =>
          s.customer_name.toLowerCase().includes(q) ||
          s.product_name.toLowerCase().includes(q),
      );
    }
    return list;
  }, [allSales, activeFilter, searchQuery]);

  // ── Customer groups for the "All Sales" view (built from the full history) ──

  const customerGroups = useMemo(
    () => buildCustomerGroups(allSales, customersList),
    [allSales, customersList],
  );

  // ── Form handlers ──

  const resetForm = () => {
    setEditingId(null);
    setCustomerId(null);
    setCustomerName("");
    setProductId(null);
    setProductName("");
    setQuantity("");
    setUnit("kg");
    setPricePerUnit("");
    setPaymentMethod("cash");
    setPaymentConfirmed(false);
    setQrImage(null);
    setQrError(null);
  };

  const openNewSale = () => {
    resetForm();
    setIsFormOpen(true);
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: formLayoutY.current, animated: true });
    }, 150);
  };

  const openEditSale = (sale: FarmSale) => {
    setEditingId(sale.id);
    setCustomerId((sale as any).customer_id ?? null);
    setCustomerName(sale.customer_name);
    setProductId(null);
    setProductName(sale.product_name);
    setQuantity(String(sale.quantity));
    setUnit(sale.unit);
    setPricePerUnit(String(sale.price_per_unit));
    setPaymentMethod((sale.payment_method as PaymentMethod) ?? "cash");
    setPaymentConfirmed(!!sale.payment_confirmed);
    setIsFormOpen(true);
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: formLayoutY.current, animated: true });
    }, 150);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    resetForm();
  };

  // Called when a product is picked from inventory (or typed as a new one).
  // Prefills unit + price straight from the catalog entry, if available.
  const handleSelectProduct = (p: { id: string | null; name: string; price?: number; unit?: string }) => {
    setProductId(p.id);
    setProductName(p.name);
    if (p.unit && (UNIT_OPTIONS as readonly string[]).includes(p.unit)) {
      setUnit(p.unit);
    }
  };

  // Opens the UPI QR popup, fetches the admin's own uploaded QR (cached after
  // first fetch this session), and resets the 5-minute countdown each time.
  const openUpiQrModal = async () => {
    setPaymentMethod("upi");
    setQrSecondsLeft(300);
    setQrModalVisible(true);

    if (qrImage) return;
    setQrLoading(true);
    setQrError(null);
    try {
      const res = await api.getMyPaymentQr();
      setQrImage(res.qr_image_base64);
    } catch (err: any) {
      setQrError(
        err?.message ??
          "No payment QR uploaded yet. Upload one from Settings → Wallet Payment.",
      );
    } finally {
      setQrLoading(false);
    }
  };

  // 5-minute countdown while the QR modal is open
  useEffect(() => {
    if (!qrModalVisible || qrSecondsLeft <= 0) return;
    const t = setTimeout(() => setQrSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [qrModalVisible, qrSecondsLeft]);

  const qrTimerLabel = `${Math.floor(qrSecondsLeft / 60)}:${String(qrSecondsLeft % 60).padStart(2, "0")}`;

  const handleConfirmPaymentFromModal = () => {
    setPaymentConfirmed(true);
    setQrModalVisible(false);
  };

  const handleRegenerateQrTimer = async () => {
    setQrSecondsLeft(300);
    setQrLoading(true);
    setQrError(null);
    try {
      const res = await api.getMyPaymentQr();
      setQrImage(res.qr_image_base64);
    } catch (err: any) {
      setQrError(err?.message ?? "Could not refresh QR right now.");
    } finally {
      setQrLoading(false);
    }
  };

  const total = (parseFloat(quantity) || 0) * (parseFloat(pricePerUnit) || 0);

  const canGenerateReceipt =
    customerName.trim().length > 0 &&
    productName.trim().length > 0 &&
    (parseFloat(quantity) || 0) > 0 &&
    (parseFloat(pricePerUnit) || 0) > 0;

  const handleGenerateReceipt = () => {
    if (!canGenerateReceipt) {
      showAlert(
        "Missing Details",
        "Fill in customer, product, quantity and price to generate a receipt.",
        "receipt-outline",
        "#f97316",
        "#fff7ed",
      );
      return;
    }
    setReceiptPreview({
      customer_name: customerName.trim(),
      product_name: productName.trim(),
      quantity: parseFloat(quantity),
      unit,
      price_per_unit: parseFloat(pricePerUnit),
      total_amount: total,
      payment_method: paymentMethod,
      worker_name: "Farm Owner",
      date: todayStr(),
    });
  };

  const canSave =
    customerName.trim().length > 0 &&
    productName.trim().length > 0 &&
    (parseFloat(quantity) || 0) > 0 &&
    (parseFloat(pricePerUnit) || 0) > 0 &&
    (paymentMethod === "cash" || paymentConfirmed) &&
    !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const paymentConfirmedFinal = paymentMethod === "cash" ? true : paymentConfirmed;
      const payload = {
        customer_id: customerId || undefined,
        customer_name: customerName.trim(),
        product_name: productName.trim(),
        quantity: parseFloat(quantity),
        unit,
        price_per_unit: parseFloat(pricePerUnit),
        payment_method: paymentMethod,
        payment_confirmed: paymentConfirmedFinal,
      };

      const savedSale = editingId
        ? await api.adminUpdateFarmSale(editingId, payload)
        : await api.adminCreateFarmSale({ ...payload, date: todayStr() });

      closeForm();
      await fetchAll();

      setSuccessReceipt({
        customer_name: savedSale.customer_name,
        product_name: savedSale.product_name,
        quantity: savedSale.quantity,
        unit: savedSale.unit,
        price_per_unit: savedSale.price_per_unit,
        total_amount: savedSale.total_amount,
        payment_method: savedSale.payment_method,
        worker_name: savedSale.worker_id === user?.id ? "Farm Owner" : savedSale.worker_name,
        date: savedSale.date,
      });
    } catch (err: any) {
      showAlert(
        editingId ? "Could Not Update" : "Could Not Save",
        err?.message ?? "Something went wrong while saving the sale entry.",
        "cart-outline",
        "#ef4444",
        "#fee2e2",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.adminDeleteFarmSale(deleteTarget.id);
      setAllSales((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err: any) {
      setDeleteTarget(null);
      showAlert(
        "Delete Failed",
        err?.message ?? "Could not remove the entry.",
        "trash-outline",
        "#ef4444",
        "#fee2e2",
      );
    } finally {
      setDeleting(false);
    }
  };

  const openReceiptViewer = (uri: string) => {
    setViewerUri(uri);
    setViewerVisible(true);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ModernAlert config={alertConfig} onClose={hideAlert} />
      <UndoConfirmModal
        visible={!!deleteTarget}
        sale={deleteTarget}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
      <ReceiptViewerModal
        visible={viewerVisible}
        imageUri={viewerUri}
        onClose={() => setViewerVisible(false)}
      />

      <SuccessReceiptModal
        visible={!!successReceipt}
        sale={successReceipt}
        farmName={farmName}
        onClose={() => setSuccessReceipt(null)}
      />

      <SuccessReceiptModal
        visible={!!receiptPreview}
        sale={receiptPreview}
        farmName={farmName}
        onClose={() => setReceiptPreview(null)}
        title="Receipt Preview"
        subtitle="Share this with your customer"
      />

      <CustomerPickerModal
        visible={customerPickerVisible}
        customers={customersList}
        loading={customersLoading}
        onSelect={(c) => {
          setCustomerName(c.name);
          setCustomerId(c.id);
        }}
        onClose={() => setCustomerPickerVisible(false)}
      />

      <ProductPickerModal
        visible={productPickerVisible}
        products={productsList}
        loading={productsLoading}
        onSelect={handleSelectProduct}
        onClose={() => setProductPickerVisible(false)}
      />

      <CustomerSalesModal
        visible={allSalesVisible}
        groups={customerGroups}
        farmName={farmName}
        onClose={() => setAllSalesVisible(false)}
      />

      <Modal
        visible={qrModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setQrModalVisible(false)}
      >
        <View style={qm.overlay}>
          <View style={qm.card}>
            <View style={qm.header}>
              <Text style={qm.title}>Scan to Pay</Text>
              <TouchableOpacity onPress={() => setQrModalVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={22} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={[qm.timerPill, qrSecondsLeft === 0 && qm.timerPillExpired]}>
              <Ionicons
                name="time-outline"
                size={14}
                color={qrSecondsLeft === 0 ? "#ef4444" : "#4f46e5"}
              />
              <Text style={[qm.timerText, qrSecondsLeft === 0 && qm.timerTextExpired]}>
                {qrSecondsLeft === 0 ? "QR expired" : `Expires in ${qrTimerLabel}`}
              </Text>
            </View>

            {qrLoading ? (
              <View style={qm.qrBox}>
                <ActivityIndicator color="#4f46e5" size="large" />
              </View>
            ) : qrError ? (
              <View style={qm.qrBox}>
                <Ionicons name="alert-circle-outline" size={28} color="#ef4444" />
                <Text style={qm.errorText}>{qrError}</Text>
              </View>
            ) : qrSecondsLeft === 0 ? (
              <View style={qm.qrBox}>
                <Ionicons name="refresh-circle-outline" size={32} color="#9ca3af" />
                <Text style={qm.expiredText}>This QR session has expired</Text>
                <TouchableOpacity style={qm.regenBtn} onPress={handleRegenerateQrTimer}>
                  <Text style={qm.regenBtnText}>Get New QR</Text>
                </TouchableOpacity>
              </View>
            ) : qrImage ? (
              <View style={qm.qrBox}>
                <Image source={{ uri: qrImage }} style={qm.qrImage} resizeMode="contain" />
              </View>
            ) : null}

            <TouchableOpacity
              style={[
                qm.confirmBtn,
                (qrSecondsLeft === 0 || qrLoading || qrError) && qm.confirmBtnDisabled,
              ]}
              onPress={handleConfirmPaymentFromModal}
              disabled={qrSecondsLeft === 0 || qrLoading || !!qrError}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
              <Text style={qm.confirmBtnText}>Confirm Payment</Text>
            </TouchableOpacity>

            <TouchableOpacity style={qm.cancelLink} onPress={() => setQrModalVisible(false)}>
              <Text style={qm.cancelLinkText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Header — business name + admin support contact on top */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View style={styles.logoCircle}>
            <MaterialCommunityIcons name="sprout" size={20} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {farmName}
            </Text>
            <View style={styles.headerSubRow}>
              <Text style={styles.headerSubtitle}>Sales management</Text>
              {supportContact ? (
                <>
                  <View style={styles.headerSubDot} />
                  <Ionicons name="call-outline" size={11} color="#6b7280" />
                  <Text style={styles.headerSubtitle}>{supportContact}</Text>
                </>
              ) : null}
            </View>
          </View>
        </View>

        <View style={styles.headerActionsRow}>
          <TouchableOpacity style={styles.allSalesBtnTop} onPress={() => setAllSalesVisible(true)}>
            <Ionicons name="people-outline" size={16} color="#374151" />
            <Text style={styles.allSalesBtnTopText} numberOfLines={1}>
              All Sales
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtnTop} onPress={openNewSale}>
            <Ionicons name="add" size={18} color="#000" />
            <Text style={styles.addBtnTopText} numberOfLines={1}>
              Add
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search & Filter Bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <TextInput
            placeholder="Search customer or product"
            placeholderTextColor="#9ca3af"
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity style={styles.filterIconBtn}>
          <Ionicons name="funnel-outline" size={20} color="#374151" />
        </TouchableOpacity>
      </View>

      {/* Filter Chips */}
      <View style={styles.chipsRow}>
        {["Today", "Last 7 days", "This month"].map((chip) => {
          const isActive = activeFilter === chip;
          return (
            <TouchableOpacity
              key={chip}
              style={[styles.chip, isActive && styles.chipActive]}
              onPress={() => setActiveFilter(chip)}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                {chip}
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
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
                  <Text style={styles.formTitle}>{editingId ? "Edit Sale" : "New Sale"}</Text>
                  <Text style={styles.formSubtitle}>Quickly add a sale record</Text>
                </View>
              </View>

              {/* Customer selector — pick an existing app customer or add a new one */}
              <TouchableOpacity
                style={styles.customerSelectTrigger}
                onPress={() => setCustomerPickerVisible(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="person-circle-outline" size={20} color="#6b7280" />
                <Text
                  style={[
                    styles.customerSelectText,
                    !customerName && styles.customerSelectPlaceholder,
                  ]}
                  numberOfLines={1}
                >
                  {customerName || "Select or add customer"}
                </Text>
                {customerId ? (
                  <View style={styles.customerLinkedBadge}>
                    <Text style={styles.customerLinkedBadgeText}>Linked</Text>
                  </View>
                ) : null}
                <Ionicons name="chevron-down" size={16} color="#9ca3af" />
              </TouchableOpacity>

              {/* Product selector — pick from inventory or add a new product type */}
              <TouchableOpacity
                style={styles.customerSelectTrigger}
                onPress={() => setProductPickerVisible(true)}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="package-variant-closed" size={20} color="#6b7280" />
                <Text
                  style={[
                    styles.customerSelectText,
                    !productName && styles.customerSelectPlaceholder,
                  ]}
                  numberOfLines={1}
                >
                  {productName || "Select or add product"}
                </Text>
                {productId ? (
                  <View style={styles.customerLinkedBadge}>
                    <Text style={styles.customerLinkedBadgeText}>Inventory</Text>
                  </View>
                ) : null}
                <Ionicons name="chevron-down" size={16} color="#9ca3af" />
              </TouchableOpacity>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <NumberStepper value={quantity} onChange={setQuantity} />
                </View>
                <View style={styles.unitSelector}>
                  {UNIT_OPTIONS.map((u) => {
                    const active = unit === u;
                    return (
                      <TouchableOpacity
                        key={u}
                        onPress={() => setUnit(u)}
                        style={[styles.unitChip, active && styles.unitChipActive]}
                      >
                        <Text style={[styles.unitChipText, active && styles.unitChipTextActive]}>
                          {u}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <NumberStepper
                value={pricePerUnit}
                onChange={setPricePerUnit}
                placeholder="Price per unit"
              />

              {total > 0 && (
                <View style={styles.totalPreview}>
                  <Text style={styles.totalPreviewLabel}>Total</Text>
                  <Text style={styles.totalPreviewValue}>₹{total.toFixed(2)}</Text>
                </View>
              )}

              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Payment</Text>
                <TouchableOpacity style={styles.radioOption} onPress={openUpiQrModal}>
                  <View
                    style={[styles.radioCircle, paymentMethod === "upi" && styles.radioCircleActive]}
                  >
                    {paymentMethod === "upi" && <View style={styles.radioInner} />}
                  </View>
                  <Text style={styles.radioText}>UPI</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.radioOption}
                  onPress={() => setPaymentMethod("cash")}
                >
                  <View
                    style={[styles.radioCircle, paymentMethod === "cash" && styles.radioCircleActive]}
                  >
                    {paymentMethod === "cash" && <View style={styles.radioInner} />}
                  </View>
                  <Text style={styles.radioText}>Cash</Text>
                </TouchableOpacity>
              </View>

              {paymentMethod === "upi" && (
                <View style={styles.upiStatusRow}>
                  {paymentConfirmed ? (
                    <>
                      <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
                      <Text style={styles.upiStatusTextDone}>Payment confirmed</Text>
                    </>
                  ) : (
                    <TouchableOpacity style={styles.upiStatusPending} onPress={openUpiQrModal}>
                      <Ionicons name="qr-code-outline" size={16} color="#4f46e5" />
                      <Text style={styles.upiStatusTextPending}>Show QR again</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Cancel / Save — sits between payment mode and the receipt section */}
              <View style={styles.formActionsRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={closeForm}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, (!canSave || saving) && { opacity: 0.6 }]}
                  onPress={handleSave}
                  disabled={!canSave || saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <Text style={styles.saveBtnText}>Save Sale</Text>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.receiptUploadRow}>
                <View style={styles.receiptThumbPlaceholder}>
                  <Ionicons name="receipt-outline" size={22} color="#9ca3af" />
                </View>
                <View style={styles.receiptTextCol}>
                  <Text style={styles.receiptLabel}>Receipt</Text>
                  <Text style={styles.receiptSub}>Generate a shareable receipt for this sale</Text>
                </View>
                <TouchableOpacity
                  style={[styles.uploadBtn, !canGenerateReceipt && { opacity: 0.5 }]}
                  onPress={handleGenerateReceipt}
                >
                  <Text style={styles.uploadBtnText}>Generate Receipt</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Empty state */}
          {displayedSales.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={36} color="#d1d5db" />
              <Text style={styles.emptyStateText}>No sales in this range</Text>
            </View>
          )}

          {/* List of Sales */}
          {displayedSales.map((sale) => (
            <View key={sale.id} style={styles.saleCard}>
              <View style={styles.saleCardLeft}>
                <View style={styles.avatar}>
                  <Ionicons name="person" size={16} color="#4f46e5" />
                </View>
                <View style={styles.saleDetails}>
                  <Text style={styles.saleName}>{sale.customer_name}</Text>
                  <Text style={styles.saleProduct}>Product: {sale.product_name}</Text>
                  <Text style={styles.saleQtyPrice}>
                    {sale.quantity} {sale.unit} x ₹{sale.price_per_unit.toFixed(2)}
                  </Text>
                  <Text style={styles.saleTotal}>Total: ₹{sale.total_amount.toFixed(2)}</Text>

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
                      <TouchableOpacity
                        style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                        onPress={() => openReceiptViewer(sale.receipt_image!)}
                      >
                        <View style={styles.badgeReceipt}>
                          <Text style={styles.badgeReceiptText}>Receipt</Text>
                        </View>
                        <Image
                          source={{ uri: sale.receipt_image }}
                          style={styles.receiptMiniThumb}
                        />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              </View>

              <View style={styles.saleCardRight}>
                <View style={styles.actionBtns}>
                  <TouchableOpacity style={styles.iconBtn} onPress={() => openEditSale(sale)}>
                    <MaterialCommunityIcons name="pencil-outline" size={16} color="#000" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.iconBtn} onPress={() => setDeleteTarget(sale)}>
                    <Ionicons name="trash" size={16} color="#000" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.addedByText}>{attributionFor(sale)}</Text>
                <Text style={styles.saleDate}>{fmtShortDate(sale.date)}</Text>
              </View>
            </View>
          ))}
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
    </View>
  );
}

export default function FarmSaleScreen() {
  return <FarmSaleScreenInner />;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fefefe" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },

  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  logoCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#4f46e5",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 16, fontWeight: "bold", color: "#111827" },
  headerSubRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2, flexWrap: "wrap" },
  headerSubtitle: { fontSize: 11, color: "#6b7280" },
  headerSubDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: "#d1d5db" },
  headerActionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  allSalesBtnTop: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 5,
  },
  allSalesBtnTopText: { fontSize: 12, fontWeight: "bold", color: "#374151" },
  addBtnTop: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f97316",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 4,
  },
  addBtnTopText: { fontSize: 13, fontWeight: "bold", color: "#000" },

  searchRow: { flexDirection: "row", paddingHorizontal: 16, gap: 10, marginBottom: 12 },
  searchBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    justifyContent: "center",
  },
  searchInput: { fontSize: 13, color: "#111827" },
  filterIconBtn: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

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
  chipText: { fontSize: 12, fontWeight: "600", color: "#4b5563" },
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
  formActionsRow: {
    flexDirection: "row",
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    paddingTop: 16,
    marginTop: 4,
    marginBottom: 4,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: { fontSize: 13, fontWeight: "bold", color: "#111827" },
  saveBtn: {
    flex: 1.4,
    backgroundColor: "#4ade80",
    borderRadius: 10,
    paddingVertical: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  saveBtnText: { fontSize: 13, fontWeight: "bold", color: "#000" },

  customerSelectTrigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 10,
  },
  customerSelectText: { flex: 1, fontSize: 13, color: "#111827", fontWeight: "600" },
  customerSelectPlaceholder: { color: "#9ca3af", fontWeight: "400" },
  customerLinkedBadge: {
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  customerLinkedBadgeText: { fontSize: 9.5, fontWeight: "800", color: "#2563eb" },

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
  unitSelector: { flexDirection: "row", gap: 6 },
  unitChip: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  unitChipActive: { borderColor: "#4f46e5", backgroundColor: "#eef2ff" },
  unitChipText: { fontSize: 12, fontWeight: "600", color: "#6b7280" },
  unitChipTextActive: { color: "#4f46e5" },

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

  upiStatusRow: { marginTop: 4, marginBottom: 10 },
  upiStatusPending: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
  },
  upiStatusTextPending: { fontSize: 12, fontWeight: "700", color: "#4f46e5" },
  upiStatusTextDone: { fontSize: 12, fontWeight: "700", color: "#16a34a" },

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
    flexDirection: "row",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#f3f4f6",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    backgroundColor: "#fff",
  },
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
  saleQtyPrice: { fontSize: 11, color: "#6b7280", marginBottom: 4 },
  saleTotal: { fontSize: 13, fontWeight: "bold", color: "#111827", marginBottom: 8 },

  badgeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  badgeUpi: { backgroundColor: "#4f46e5", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  badgeUpiText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
  badgeCash: { borderWidth: 1, borderColor: "#e5e7eb", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  badgeCashText: { color: "#111827", fontSize: 10, fontWeight: "bold" },
  badgeReceipt: { borderWidth: 1, borderColor: "#e5e7eb", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  badgeReceiptText: { color: "#4b5563", fontSize: 10 },
  receiptMiniThumb: { width: 20, height: 24, backgroundColor: "#d1d5db", borderRadius: 4 },

  saleCardRight: { alignItems: "flex-end", justifyContent: "space-between" },
  actionBtns: { flexDirection: "row", gap: 8 },
  iconBtn: {
    width: 28,
    height: 28,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  addedByText: { fontSize: 10, fontWeight: "700", color: "#9ca3af", maxWidth: 90, textAlign: "right" },
  saleDate: { fontSize: 10, color: "#6b7280", marginTop: 8 },

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

const qm = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 28,
  },
  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 22,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 14,
  },
  title: { fontSize: 17, fontWeight: "800", color: "#111827" },
  timerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#eef2ff",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 16,
  },
  timerPillExpired: { backgroundColor: "#fee2e2" },
  timerText: { fontSize: 13, fontWeight: "700", color: "#4f46e5" },
  timerTextExpired: { color: "#ef4444" },
  qrBox: {
    width: "100%",
    minHeight: 200,
    borderRadius: 16,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 18,
    padding: 16,
  },
  qrImage: { width: 200, height: 200 },
  errorText: { fontSize: 13, color: "#ef4444", textAlign: "center" },
  expiredText: { fontSize: 13, color: "#6b7280", textAlign: "center" },
  regenBtn: {
    backgroundColor: "#111827",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 4,
  },
  regenBtnText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#4f46e5",
    width: "100%",
    paddingVertical: 14,
    borderRadius: 14,
  },
  confirmBtnDisabled: { backgroundColor: "#c7c9f5" },
  confirmBtnText: { fontSize: 15, fontWeight: "800", color: "#fff" },
  cancelLink: { marginTop: 12, paddingVertical: 4 },
  cancelLinkText: { fontSize: 13, fontWeight: "700", color: "#6b7280" },
});