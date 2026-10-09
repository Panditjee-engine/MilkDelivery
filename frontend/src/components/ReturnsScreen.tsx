import React, { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../services/api";
import ReturnPhoto from "./ReturnPhoto";
import { formatDeliveryAddress } from "../utils/address";

const kinds = [
  { key: "bottle_return", name: "Bottle Return", icon: "water-outline" },
  { key: "product_return", name: "Product Return", icon: "return-down-back-outline" },
  { key: "exchange", name: "Exchange", icon: "swap-horizontal-outline" },
] as const;
const labels: Record<string, string> = { requested: "Awaiting approval", approved: "Ready for pickup", rejected: "Rejected", picked_up: "Pickup confirmed" };
const colors: Record<string, string> = { requested: "#9A6700", approved: "#2563EB", rejected: "#B42318", picked_up: "#15803D" };

export default function ReturnsScreen({ role }: { role: "customer" | "admin" | "delivery" }) {
  const router = useRouter();
  const [rows, setRows] = useState<any[]>([]);
  const [allOrders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [kind, setKind] = useState<string>("bottle_return");
  const orders = role === "customer" && kind === "bottle_return"
    ? allOrders.map(order => ({ ...order, items: order.bottle_items || [] })).filter(order => order.items.length > 0)
    : allOrders;
  const [orderId, setOrderId] = useState("");
  const [reason, setReason] = useState("");
  const [showOrders, setShowOrders] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [bottleOrder, setBottleOrder] = useState("");
  const [bottleQuantity, setBottleQuantity] = useState("1");
  const load = useCallback(async () => {
    setError("");
    try {
      const [requests, eligible] = await Promise.all([api.getReturnRequests(), role === "customer" ? api.getReturnEligibleOrders() : role === "delivery" ? api.getBottleReturnOrders() : Promise.resolve([])]);
      setRows(requests); setOrders(eligible);
    } catch { setError("Could not load returns. Please try again."); }
    finally { setLoading(false); }
  }, [role]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const perform = async (operation: () => Promise<unknown>) => {
    if (lock.current) return;
    lock.current = true; setBusy(true);
    try { await operation(); await load(); }
    catch (e: any) { Alert.alert("Unable to update request", e?.message || "Please try again."); }
    finally { lock.current = false; setBusy(false); }
  };
  const confirm = (id: string, action: string) => Alert.alert(
    action === "pickup" ? "Confirm physical pickup?" : `${action === "approve" ? "Approve" : "Reject"} request?`,
    action === "pickup" ? "Confirm only after collecting the items. This does not confirm a refund." : "The customer will see the updated request status.",
    [{ text: "Cancel", style: "cancel" }, { text: "Confirm", onPress: () => void perform(() => api.updateReturnRequest(id, action)) }],
  );
  const selected = orders.find(order => order.id === orderId);
  return <SafeAreaView style={s.page} edges={["top", "left", "right"]}>
    <View style={s.header}><TouchableOpacity accessibilityLabel="Back" onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#3D1F0A" /></TouchableOpacity><Text style={s.title}>Returns & Exchanges</Text></View>
    <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={loading} onRefresh={() => { setLoading(true); void load(); }} />}>
      {error ? <TouchableOpacity onPress={() => void load()}><Text style={s.error}>{error} Tap to retry.</Text></TouchableOpacity> : null}
      {role === "delivery" && <View style={s.form}>
        <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded: formOpen }} style={s.newRequest} onPress={() => setFormOpen(!formOpen)}><Ionicons name="water-outline" size={24} color="#BB6B3F" /><Text style={[s.heading, { flex: 1 }]}>Collect Bottles</Text><Ionicons name={formOpen ? "chevron-up" : "chevron-down"} size={20} color="#BB6B3F" /></TouchableOpacity>
        {formOpen && <>
          <ScrollView style={{ maxHeight: 260 }} nestedScrollEnabled>{orders.length === 0 ? <Text style={s.muted}>{loading ? "Loading orders..." : "No pending bottles in your delivered orders."}</Text> : orders.map(order => <TouchableOpacity key={order.id} disabled={busy} style={[s.order, bottleOrder === order.id && s.active]} onPress={() => { setBottleOrder(order.id); setBottleQuantity("1"); }}><Text style={s.text}>{order.customer_name || "Customer"} · #{order.id.slice(0, 8)}</Text><Text style={s.muted}>{order.delivery_date} · {order.pending_bottle_count} bottles pending</Text><Text style={s.muted}>{formatDeliveryAddress(order.address)}</Text></TouchableOpacity>)}</ScrollView>
          <Text style={s.fieldLabel}>BOTTLES COLLECTED NOW</Text>
          <TextInput accessibilityLabel="Bottles collected now" editable={!busy} style={s.input} keyboardType="number-pad" value={bottleQuantity} maxLength={5} onChangeText={setBottleQuantity} />
          <TouchableOpacity disabled={busy || !bottleOrder} style={[s.button, (busy || !bottleOrder) && s.disabled]} onPress={() => {
            const order = orders.find(item => item.id === bottleOrder);
            const quantity = Number(bottleQuantity);
            if (!order || !Number.isInteger(quantity) || quantity < 1 || quantity > order.pending_bottle_count) { Alert.alert("Check quantity", "Enter a whole number within the pending bottle count."); return; }
            Alert.alert("Confirm bottle collection?", `Record ${quantity} collected bottle(s) for ${order.customer_name || "this customer"}?`, [{ text: "Cancel", style: "cancel" }, { text: "Confirm", onPress: () => void perform(async () => {
              await api.collectReturnBottles(order.id, order.collected_bottle_count + quantity);
              setBottleOrder(""); setBottleQuantity("1");
              Alert.alert("Collection recorded", "Bottle collection saved. You can attach a pickup photo to the request below.");
            }) }]);
          }}><Text style={s.buttonText}>{busy ? "Saving..." : "Mark Bottles Returned"}</Text></TouchableOpacity>
        </>}
      </View>}
      {role === "customer" && <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded: formOpen }} onPress={() => setFormOpen(!formOpen)} style={s.newRequest}>
        <View style={s.newIcon}><Ionicons name={formOpen ? "remove" : "add"} size={23} color="#BB6B3F" /></View>
        <View style={{ flex: 1 }}><Text style={s.heading}>New Request</Text><Text style={s.muted}>Bottle return, product return or exchange</Text></View>
        <Ionicons name={formOpen ? "chevron-up" : "chevron-down"} size={18} color="#8A8178" />
      </TouchableOpacity>}
      {role === "customer" && formOpen && <View style={[s.form, s.customerForm]}>
        <Text style={s.fieldLabel}>REQUEST TYPE</Text>
        <View style={s.tabs}>{kinds.map(item => <TouchableOpacity key={item.key} accessibilityRole="tab" accessibilityState={{ selected: kind === item.key }} onPress={() => setKind(item.key)} style={[s.tab, kind === item.key && s.active]}><Ionicons name={item.icon} size={20} color="#BB6B3F" /><Text style={s.small}>{item.name}</Text></TouchableOpacity>)}</View>
        <Text style={s.fieldLabel}>DELIVERED ORDER</Text>
        <TouchableOpacity style={s.input} accessibilityRole="button" accessibilityState={{ expanded: showOrders }} onPress={() => setShowOrders(!showOrders)}><View style={{ flex: 1, gap: 4 }}><Text style={s.text}>{selected ? `Order #${selected.id.slice(0, 8)} · ${selected.delivery_date}` : "Select delivered order"}</Text>{selected && <Text style={s.muted}>{selected.items?.map((item: any) => `${item.product_name || "Product"} × ${item.quantity}`).join(" · ")}</Text>}</View><Ionicons name={showOrders ? "chevron-up" : "chevron-down"} size={18} color="#8A8178" /></TouchableOpacity>
        {showOrders && <ScrollView style={s.orderList} nestedScrollEnabled>{orders.length === 0 ? <Text style={s.muted}>No delivered orders available.</Text> : orders.map(order => <TouchableOpacity style={s.order} key={order.id} onPress={() => { setOrderId(order.id); setShowOrders(false); }}><Text>#{order.id.slice(0, 8)} · {order.delivery_date}</Text><Text style={s.muted}>{order.items?.map((item: any) => `${item.product_name || "Product"} x ${item.quantity}`).join(", ")}</Text></TouchableOpacity>)}</ScrollView>}
        <View style={s.labelRow}><Text style={s.fieldLabel}>REASON</Text><Text style={s.muted}>{reason.length}/500</Text></View>
        <TextInput accessibilityLabel="Reason for return or exchange" style={[s.input, { minHeight: 90, textAlignVertical: "top", color: "#3D1F0A" }]} multiline maxLength={500} placeholder="Tell us what happened" placeholderTextColor="#8A8178" value={reason} onChangeText={setReason} />
        <TouchableOpacity accessibilityRole="button" disabled={busy || !orderId || reason.trim().length < 3} style={[s.button, s.submit, (busy || !orderId || reason.trim().length < 3) && s.disabled]} onPress={() => void perform(async () => { await api.createReturnRequest({ order_id: orderId, kind, reason: reason.trim() }); setReason(""); setOrderId(""); setFormOpen(false); setShowOrders(false); setStatusFilter("all"); Alert.alert("Request received", "Your farm admin will review the request."); })}>{busy ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="arrow-forward" size={18} color="#fff" />}<Text style={s.buttonText}>{busy ? "Submitting..." : "Submit Request"}</Text></TouchableOpacity>
      </View>}
      <Text style={s.heading}>{role === "customer" ? "Your Requests" : "Customer Requests"}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {[{ key: "all", label: "All" }, { key: "requested", label: "Pending" }, { key: "approved", label: "Pickup" }, { key: "picked_up", label: "Collected" }, { key: "rejected", label: "Rejected" }].map(tab => <TouchableOpacity key={tab.key} accessibilityRole="tab" accessibilityState={{ selected: statusFilter === tab.key }} onPress={() => setStatusFilter(tab.key)} style={{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: statusFilter === tab.key ? "#BB6B3F" : "#E9DED4", backgroundColor: statusFilter === tab.key ? "#FFF0E4" : "#fff" }}><Text style={{ color: "#6C594B", fontSize: 12, fontWeight: "600" }}>{tab.label} · {rows.filter(row => tab.key === "all" || row.status === tab.key).length}</Text></TouchableOpacity>)}
      </ScrollView>
      {busy && <ActivityIndicator color="#BB6B3F" />}
      {!loading && !error && !rows.some(row => statusFilter === "all" || row.status === statusFilter) && <View style={{ alignItems: "center", paddingVertical: 32, gap: 12 }}><Ionicons name="file-tray-outline" size={36} color="#B3A398" /><Text style={s.muted}>No requests in this view.</Text></View>}
      {rows.filter(row => statusFilter === "all" || row.status === statusFilter).map(row => <View key={row.id} style={s.card}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><Ionicons name={kinds.find(item => item.key === row.kind)?.icon || "cube-outline"} size={22} color="#BB6B3F" /><View style={{ flex: 1 }} /><Text style={[s.status, { color: colors[row.status] || "#666", backgroundColor: `${colors[row.status] || "#666666"}12`, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6 }]}>{labels[row.status] || row.status}</Text></View>
        <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded: expanded === row.id }} onPress={() => setExpanded(expanded === row.id ? null : row.id)} style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 44 }}><Text style={[s.heading, { flex: 1 }]}>{kinds.find(item => item.key === row.kind)?.name || row.kind}</Text><Ionicons name={expanded === row.id ? "chevron-up" : "chevron-down"} size={20} color="#BB6B3F" /></TouchableOpacity>
        <Text style={s.muted}>Order #{row.order_id.slice(0, 8)}{role !== "customer" ? ` · ${row.customer_name}` : ""}</Text>
        {row.kind === "bottle_return" && <Text style={s.text}>Bottles: {row.bottle_count}</Text>}
        {row.kind === "bottle_return" && row.collected_bottle_count != null && <Text style={s.muted}>Collected: {row.collected_bottle_count} · Pending: {Math.max(0, row.bottle_count - row.collected_bottle_count)}</Text>}
        {expanded === row.id && <>
        <Text style={s.text}>{row.items?.map((item: any) => `${item.product_name || "Product"} x ${item.quantity}`).join(", ") || "Product details unavailable"}</Text>
        <Text style={s.muted}>{row.reason}</Text>
        {row.delivery_partner_name && <Text style={s.text}>Assigned rider: {row.delivery_partner_name}</Text>}
        {role === "delivery" && <Text style={s.text}>Pickup: {formatDeliveryAddress(row.address) || "Address not available"}</Text>}
        <ReturnPhoto id={row.id} exists={!!row.has_pickup_photo} editable={role === "delivery" && ["approved", "picked_up"].includes(row.status)} />
        {row.status === "picked_up" && <Text style={s.muted}>Pickup recorded. Refund or exchange completion is not yet confirmed.</Text>}
        <View style={s.actions}>
          {role === "admin" && row.status === "requested" && <><TouchableOpacity disabled={busy} style={s.button} onPress={() => confirm(row.id, "approve")}><Text style={s.buttonText}>Approve</Text></TouchableOpacity><TouchableOpacity disabled={busy} style={s.secondary} onPress={() => confirm(row.id, "reject")}><Text style={s.error}>Reject</Text></TouchableOpacity></>}
          {role !== "customer" && row.status === "approved" && <TouchableOpacity disabled={busy} style={s.button} onPress={() => confirm(row.id, "pickup")}><Text style={s.buttonText}>Confirm Pickup</Text></TouchableOpacity>}
        </View>
        </>}
      </View>)}
    </ScrollView>
  </SafeAreaView>;
}
const s = StyleSheet.create({
  newRequest: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderColor: "#EDDFD2" },
  newIcon: { width: 42, height: 42, borderRadius: 8, backgroundColor: "#FFEADA", justifyContent: "center", alignItems: "center" },
  customerForm: { paddingBottom: 18, borderBottomWidth: 1, borderColor: "#EDDFD2" },
  fieldLabel: { fontSize: 11, fontWeight: "700", color: "#8A7565", marginTop: 6 },
  labelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  submit: { flexDirection: "row", gap: 8, justifyContent: "center", minHeight: 48 },
  page: { flex: 1, backgroundColor: "#FFF8EF" }, header: { flexDirection: "row", alignItems: "center", gap: 14, padding: 18 }, title: { fontSize: 20, fontWeight: "700", color: "#3D1F0A", flex: 1 },
  body: { padding: 16, paddingBottom: 40, gap: 14 }, form: { gap: 12 }, tabs: { flexDirection: "row", gap: 6 }, tab: { flex: 1, padding: 10, alignItems: "center", gap: 6, borderBottomWidth: 2, borderColor: "transparent" }, active: { borderColor: "#BB6B3F", backgroundColor: "#FFE9D6" }, small: { fontSize: 12, textAlign: "center", color: "#3D1F0A" },
  input: { borderWidth: 1, borderColor: "#E5D8CC", borderRadius: 8, backgroundColor: "white", padding: 12, flexDirection: "row", justifyContent: "space-between" }, orderList: { maxHeight: 200, backgroundColor: "white" }, order: { padding: 12, borderBottomWidth: 1, borderColor: "#eee" },
  heading: { fontSize: 16, fontWeight: "700", color: "#3D1F0A" }, card: { backgroundColor: "white", padding: 16, borderRadius: 8, borderWidth: 1, borderColor: "#F1E3D0", gap: 8 }, status: { fontSize: 12, fontWeight: "700" }, muted: { color: "#76685D", fontSize: 13, lineHeight: 20 }, text: { color: "#3D1F0A", fontSize: 14 },
  button: { backgroundColor: "#BB6B3F", borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, alignItems: "center" }, buttonText: { color: "white", fontWeight: "700" }, secondary: { padding: 12 }, actions: { flexDirection: "row", flexWrap: "wrap", gap: 10 }, error: { color: "#B42318", fontSize: 13 }, disabled: { opacity: 0.45 },
});
