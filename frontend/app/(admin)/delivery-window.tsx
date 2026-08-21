import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Modal,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../src/services/api";

const C = {
  bg: "#FFF8F4",
  card: "#FFFFFF",
  primary: "#FF9675",
  dark: "#BB6B3F",
  text: "#1A1A1A",
  muted: "#8B6854",
  faint: "#C9A882",
  border: "#FFE8D6",
  green: "#16A34A",
  red: "#DC2626",
};

type DeliveryWindow = {
  id: string;
  product_id?: string | null;
  product_name?: string | null;
  start_time: string;
  end_time: string;
  is_active: boolean;
};

type Scope = "all" | "product";
type TimeTarget = "start" | "end" | null;

const toTimeLabel = (value: string) => {
  const [h, m] = String(value || "06:00").split(":").map(Number);
  const date = new Date();
  date.setHours(h || 0, m || 0, 0, 0);
  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const timeToDate = (value: string) => {
  const [h, m] = String(value || "06:00").split(":").map(Number);
  const date = new Date();
  date.setHours(h || 0, m || 0, 0, 0);
  return date;
};

const dateToTime = (date: Date) =>
  `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

export default function AdminDeliveryWindowScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [windows, setWindows] = useState<DeliveryWindow[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<DeliveryWindow | null>(null);
  const [editSheetVisible, setEditSheetVisible] = useState(false);
  const [scope, setScope] = useState<Scope>("all");
  const [productId, setProductId] = useState("");
  const [startTime, setStartTime] = useState("06:00");
  const [endTime, setEndTime] = useState("09:00");
  const [isActive, setIsActive] = useState(true);
  const [timeTarget, setTimeTarget] = useState<TimeTarget>(null);

  const goBackToSettings = useCallback(() => {
    router.replace("/(admin)/settings" as any);
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        goBackToSettings();
        return true;
      });
      return () => sub.remove();
    }, [goBackToSettings]),
  );

  const load = useCallback(async (soft = false) => {
    soft ? setRefreshing(true) : setLoading(true);
    try {
      const [windowResult, productResult] = await Promise.allSettled([
        api.getAdminDeliveryWindows(),
        api.getProducts(),
      ]);

      if (windowResult.status === "fulfilled") {
        setWindows(Array.isArray(windowResult.value) ? windowResult.value : []);
      } else {
        setWindows([]);
        if (!String(windowResult.reason?.message || "").includes("Not Found")) {
          Alert.alert("Could not load delivery windows", windowResult.reason?.message || "Please try again.");
        }
      }

      if (productResult.status === "fulfilled") {
        setProducts(Array.isArray(productResult.value) ? productResult.value : []);
      } else {
        setProducts([]);
        Alert.alert("Could not load products", productResult.reason?.message || "Please try again.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setEditing(null);
    setEditSheetVisible(false);
    setScope("all");
    setProductId("");
    setStartTime("06:00");
    setEndTime("09:00");
    setIsActive(true);
  };

  const startEdit = (item: DeliveryWindow) => {
    setEditing(item);
    setScope(item.product_id ? "product" : "all");
    setProductId(item.product_id || "");
    setStartTime(item.start_time || "06:00");
    setEndTime(item.end_time || "09:00");
    setIsActive(item.is_active !== false);
    setEditSheetVisible(true);
  };

  const validate = () => {
    if (scope === "product" && !productId) {
      Alert.alert("Select product", "Please choose a product for individual delivery window.");
      return false;
    }
    if (endTime <= startTime) {
      Alert.alert("Invalid time", "End time must be after start time.");
      return false;
    }
    return true;
  };

  const saveWindow = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        product_id: scope === "product" ? productId : null,
        start_time: startTime,
        end_time: endTime,
        is_active: isActive,
      };
      if (editing) {
        await api.updateAdminDeliveryWindow(editing.id, payload);
      } else {
        await api.createAdminDeliveryWindow(payload);
      }
      resetForm();
      await load(true);
    } catch (error: any) {
      Alert.alert("Could not save window", error?.message || "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const toggleWindow = async (item: DeliveryWindow) => {
    try {
      await api.updateAdminDeliveryWindow(item.id, {
        product_id: item.product_id || null,
        start_time: item.start_time,
        end_time: item.end_time,
        is_active: !item.is_active,
      });
      setWindows((rows) =>
        rows.map((row) =>
          row.id === item.id ? { ...row, is_active: !item.is_active } : row,
        ),
      );
    } catch (error: any) {
      Alert.alert("Could not update window", error?.message || "Please try again.");
    }
  };

  const confirmDelete = (item: DeliveryWindow) => {
    Alert.alert(
      "Delete delivery window?",
      `${item.product_name || "All Products"} window will be removed.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.deleteAdminDeliveryWindow(item.id);
              if (editing?.id === item.id) resetForm();
              await load(true);
            } catch (error: any) {
              Alert.alert("Could not delete window", error?.message || "Please try again.");
            }
          },
        },
      ],
    );
  };

  const renderForm = (mode: "add" | "edit") => (
    <>
      <Text style={s.label}>Scope</Text>
      <View style={s.segment}>
        {(["all", "product"] as Scope[]).map((item) => {
          const active = scope === item;
          return (
            <TouchableOpacity
              key={item}
              style={[s.segmentBtn, active && s.segmentActive]}
              onPress={() => setScope(item)}
            >
              <Ionicons
                name={item === "all" ? "apps-outline" : "cube-outline"}
                size={15}
                color={active ? "#fff" : C.dark}
              />
              <Text style={[s.segmentText, active && s.segmentTextActive]}>
                {item === "all" ? "All Products" : "Individual"}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {scope === "product" ? (
        <>
          <Text style={s.label}>Product</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.productRow}>
            {products.map((product) => {
              const active = productId === product.id;
              return (
                <TouchableOpacity
                  key={product.id}
                  style={[s.productChip, active && s.productChipActive]}
                  onPress={() => setProductId(product.id)}
                >
                  <Text style={[s.productChipText, active && s.productChipTextActive]} numberOfLines={1}>
                    {product.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </>
      ) : null}

      <Text style={s.label}>Delivery Window</Text>
      <View style={s.timeGrid}>
        <TouchableOpacity style={s.timeBtn} onPress={() => setTimeTarget("start")}>
          <Text style={s.timeLabel}>Start</Text>
          <Text style={s.timeText}>{toTimeLabel(startTime)}</Text>
          <Text style={s.timeHint}>{startTime}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.timeBtn} onPress={() => setTimeTarget("end")}>
          <Text style={s.timeLabel}>End</Text>
          <Text style={s.timeText}>{toTimeLabel(endTime)}</Text>
          <Text style={s.timeHint}>{endTime}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={s.activeRow} onPress={() => setIsActive((value) => !value)}>
        <View>
          <Text style={s.activeTitle}>Window Status</Text>
          <Text style={s.activeSub}>{isActive ? "Customers can use this delivery window." : "Window is saved but hidden."}</Text>
        </View>
        <View style={[s.switchTrack, isActive && s.switchTrackOn]}>
          <View style={[s.switchKnob, isActive && s.switchKnobOn]} />
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={[mode === "edit" ? s.updateBtn : s.saveBtn, saving && { opacity: 0.6 }]} onPress={saveWindow} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Ionicons name={mode === "edit" ? "checkmark-circle-outline" : "save-outline"} size={17} color="#fff" />}
        <Text style={s.saveText}>{mode === "edit" ? "Update Window" : "Save Window"}</Text>
      </TouchableOpacity>
    </>
  );

  return (
    <SafeAreaView style={s.safe}>
      <View style={[s.header, { paddingTop: Math.max(insets.top + 8, 18) }]}>
        <TouchableOpacity style={s.backBtn} onPress={goBackToSettings}>
          <Ionicons name="chevron-back" size={22} color={C.dark} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Delivery Window</Text>
          <Text style={s.subtitle}>Manage customer delivery time ranges</Text>
        </View>
      </View>

      {loading ? (
        <View style={s.loader}>
          <ActivityIndicator color={C.primary} />
          <Text style={s.loaderText}>Loading delivery windows...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
          showsVerticalScrollIndicator={false}
        >
          <View style={s.infoCard}>
            <Ionicons name="bicycle-outline" size={20} color={C.green} />
            <Text style={s.infoText}>
              Set the delivery time shown to customers. Product-specific windows override the All Products window.
            </Text>
          </View>

          <View style={s.formCard}>
            <Text style={s.cardTitle}>Add Delivery Window</Text>
            {renderForm("add")}
          </View>

          <View style={s.listHeader}>
            <Text style={s.cardTitle}>Configured Windows</Text>
            <Text style={s.count}>{windows.length}</Text>
          </View>

          {windows.length ? (
            windows.map((item) => (
              <View key={item.id} style={s.ruleCard}>
                <View style={s.ruleTop}>
                  <View style={s.ruleIcon}>
                    <Ionicons name={item.product_id ? "cube-outline" : "apps-outline"} size={18} color={C.dark} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.ruleTitle}>{item.product_name || "All Products"}</Text>
                    <Text style={s.ruleSub}>{toTimeLabel(item.start_time)} - {toTimeLabel(item.end_time)}</Text>
                  </View>
                  <TouchableOpacity
                    style={[s.statusPill, item.is_active ? s.statusOn : s.statusOff]}
                    onPress={() => toggleWindow(item)}
                  >
                    <Text style={[s.statusText, { color: item.is_active ? C.green : C.faint }]}>
                      {item.is_active ? "Active" : "Off"}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={s.ruleActions}>
                  <TouchableOpacity style={s.editBtn} onPress={() => startEdit(item)}>
                    <Ionicons name="create-outline" size={15} color={C.dark} />
                    <Text style={s.editText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.deleteBtn} onPress={() => confirmDelete(item)}>
                    <Ionicons name="trash-outline" size={15} color={C.red} />
                    <Text style={s.deleteText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <View style={s.emptyCard}>
              <Ionicons name="time-outline" size={28} color={C.faint} />
              <Text style={s.emptyTitle}>No delivery windows yet</Text>
              <Text style={s.emptySub}>Add one window for all products or create product-specific windows.</Text>
            </View>
          )}
        </ScrollView>
      )}

      <Modal transparent visible={editSheetVisible} animationType="slide" onRequestClose={resetForm}>
        <View style={s.sheetOverlay}>
          <TouchableOpacity style={s.sheetBackdrop} activeOpacity={1} onPress={resetForm} />
          <View style={s.editSheet}>
            <View style={s.drag} />
            <View style={s.sheetHeader}>
              <View>
                <Text style={s.sheetTitle}>Edit Delivery Window</Text>
                <Text style={s.sheetSub}>Update {editing?.product_name || "All Products"} window</Text>
              </View>
              <TouchableOpacity style={s.closeBtn} onPress={resetForm}>
                <Ionicons name="close" size={18} color={C.dark} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 12 }}>
              {renderForm("edit")}
              <TouchableOpacity style={s.cancelBtn} onPress={resetForm}>
                <Text style={s.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {timeTarget && (
        <Modal transparent animationType="fade" visible={Boolean(timeTarget)}>
          <View style={s.modalOverlay}>
            <View style={s.timeSheet}>
              <Text style={s.cardTitle}>Select {timeTarget === "start" ? "Start" : "End"} Time</Text>
              <DateTimePicker
                mode="time"
                value={timeToDate(timeTarget === "start" ? startTime : endTime)}
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(event, date) => {
                  if (Platform.OS !== "ios") setTimeTarget(null);
                  if (!date) return;
                  const value = dateToTime(date);
                  if (timeTarget === "start") setStartTime(value);
                  else setEndTime(value);
                }}
              />
              {Platform.OS === "ios" ? (
                <TouchableOpacity style={s.saveBtn} onPress={() => setTimeTarget(null)}>
                  <Text style={s.saveText}>Done</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingVertical: 14, backgroundColor: C.bg },
  backBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 21, fontWeight: "900", color: C.text },
  subtitle: { marginTop: 2, fontSize: 12, fontWeight: "600", color: C.muted },
  content: { padding: 18, paddingBottom: 42 },
  loader: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  loaderText: { color: C.muted, fontWeight: "700" },
  infoCard: { flexDirection: "row", gap: 10, padding: 14, borderRadius: 18, backgroundColor: "#F0FFF4", borderWidth: 1, borderColor: "#BBF7D0", marginBottom: 14 },
  infoText: { flex: 1, fontSize: 12.5, fontWeight: "700", color: "#166534", lineHeight: 18 },
  formCard: { backgroundColor: C.card, borderRadius: 22, padding: 16, borderWidth: 1, borderColor: C.border, marginBottom: 18 },
  cardTitle: { fontSize: 16, fontWeight: "900", color: C.text },
  label: { marginTop: 16, marginBottom: 8, fontSize: 12, fontWeight: "900", color: C.muted },
  segment: { flexDirection: "row", gap: 8 },
  segmentBtn: { flex: 1, minHeight: 44, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, backgroundColor: "#FFFDFB", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  segmentActive: { backgroundColor: C.primary, borderColor: C.primary },
  segmentText: { fontSize: 13, fontWeight: "900", color: C.dark },
  segmentTextActive: { color: "#fff" },
  productRow: { gap: 8, paddingRight: 18 },
  productChip: { maxWidth: 170, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999, backgroundColor: "#FFFDFB", borderWidth: 1, borderColor: C.border },
  productChipActive: { backgroundColor: "#FFF3E8", borderColor: C.primary },
  productChipText: { fontSize: 12, fontWeight: "800", color: C.muted },
  productChipTextActive: { color: C.dark },
  timeGrid: { flexDirection: "row", gap: 10 },
  timeBtn: { flex: 1, minHeight: 74, borderRadius: 16, borderWidth: 1.5, borderColor: C.border, backgroundColor: "#FFFDFB", justifyContent: "center", paddingHorizontal: 14 },
  timeLabel: { fontSize: 11, fontWeight: "900", color: C.muted, marginBottom: 4 },
  timeText: { fontSize: 16, fontWeight: "900", color: C.text },
  timeHint: { marginTop: 2, fontSize: 12, fontWeight: "800", color: C.faint },
  activeRow: { marginTop: 16, padding: 13, borderRadius: 16, backgroundColor: "#FFF8F0", flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  activeTitle: { fontSize: 13, fontWeight: "900", color: C.text },
  activeSub: { marginTop: 2, fontSize: 11.5, fontWeight: "600", color: C.muted, maxWidth: 230 },
  switchTrack: { width: 46, height: 26, borderRadius: 999, backgroundColor: "#E7D3C4", padding: 3 },
  switchTrackOn: { backgroundColor: C.green },
  switchKnob: { width: 20, height: 20, borderRadius: 999, backgroundColor: "#fff" },
  switchKnobOn: { transform: [{ translateX: 20 }] },
  saveBtn: { marginTop: 16, minHeight: 48, borderRadius: 16, backgroundColor: C.dark, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  saveText: { fontSize: 14, fontWeight: "900", color: "#fff" },
  updateBtn: { marginTop: 16, minHeight: 48, borderRadius: 16, backgroundColor: C.dark, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  listHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  count: { minWidth: 28, textAlign: "center", paddingVertical: 4, borderRadius: 999, backgroundColor: "#FFF3E8", color: C.dark, fontWeight: "900" },
  ruleCard: { backgroundColor: C.card, borderRadius: 20, padding: 14, borderWidth: 1, borderColor: C.border, marginBottom: 12 },
  ruleTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  ruleIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#FFF3E8", alignItems: "center", justifyContent: "center" },
  ruleTitle: { fontSize: 15, fontWeight: "900", color: C.text },
  ruleSub: { marginTop: 3, fontSize: 12, fontWeight: "700", color: C.muted },
  statusPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  statusOn: { backgroundColor: "#DCFCE7" },
  statusOff: { backgroundColor: "#F5EDE8" },
  statusText: { fontSize: 11, fontWeight: "900" },
  ruleActions: { flexDirection: "row", gap: 8, marginTop: 14 },
  editBtn: { flex: 1, minHeight: 38, borderRadius: 13, backgroundColor: "#FFF3E8", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 },
  editText: { fontSize: 12, fontWeight: "900", color: C.dark },
  deleteBtn: { flex: 1, minHeight: 38, borderRadius: 13, backgroundColor: "#FEF2F2", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 },
  deleteText: { fontSize: 12, fontWeight: "900", color: C.red },
  emptyCard: { alignItems: "center", justifyContent: "center", padding: 28, borderRadius: 20, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  emptyTitle: { marginTop: 8, fontSize: 15, fontWeight: "900", color: C.text },
  emptySub: { marginTop: 4, textAlign: "center", fontSize: 12, fontWeight: "600", color: C.muted },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "center", padding: 18 },
  timeSheet: { backgroundColor: C.card, borderRadius: 22, padding: 18 },
  sheetOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.35)" },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject },
  editSheet: { maxHeight: "86%", backgroundColor: C.card, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 18, paddingBottom: 18, paddingTop: 8 },
  drag: { alignSelf: "center", width: 48, height: 5, borderRadius: 999, backgroundColor: "#E9D8C8", marginBottom: 14 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingBottom: 6 },
  sheetTitle: { fontSize: 18, fontWeight: "900", color: C.text },
  sheetSub: { marginTop: 3, fontSize: 12, fontWeight: "700", color: C.muted },
  closeBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#FFF3E8", alignItems: "center", justifyContent: "center" },
  cancelBtn: { marginTop: 10, minHeight: 46, borderRadius: 16, backgroundColor: "#FFF3E8", alignItems: "center", justifyContent: "center" },
  cancelText: { fontSize: 14, fontWeight: "900", color: C.dark },
});
