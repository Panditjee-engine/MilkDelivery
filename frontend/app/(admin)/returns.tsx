import React, { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Modal, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../src/services/api";
import ReturnPhoto from "../../src/components/ReturnPhoto";
import { formatDeliveryAddress } from "../../src/utils/address";

type Request = { id: string; has_pickup_photo?: boolean; order_id: string; status: string; kind: string; customer_name?: string; reason?: string; bottle_count?: number; created_at?: string; address?: any; items?: { product_name?: string; quantity: number }[] };
const statuses = [
  { key: "all", title: "All", color: "#BB6B3F", bg: "#FFF0E4" },
  { key: "requested", title: "Pending", color: "#946200", bg: "#FFF5D6" },
  { key: "approved", title: "Pickup", color: "#2864BD", bg: "#EAF2FF" },
  { key: "picked_up", title: "Collected", color: "#20825C", bg: "#E7F6EE" },
  { key: "rejected", title: "Rejected", color: "#B44145", bg: "#FCEDEE" },
];
const kinds = [
  { key: "all", label: "All requests", icon: "albums-outline" },
  { key: "bottle_return", label: "Bottles", icon: "water-outline" },
  { key: "product_return", label: "Products", icon: "cube-outline" },
  { key: "exchange", label: "Exchanges", icon: "swap-horizontal-outline" },
] as const;
const titles: Record<string, string> = { bottle_return: "Bottle return", product_return: "Product return", exchange: "Product exchange" };
const dateLabel = (value?: string) => {
  if (!value) return "";
  const date = new Date(/(?:Z|[+-]\d{2}:?\d{2})$/.test(value) ? value : `${value}Z`);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

export default function AdminReturns() {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const [rows, setRows] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("all");
  const [kind, setKind] = useState("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const mutationLock = useRef(false);
  const [approving, setApproving] = useState<Request | null>(null);
  const [partners, setPartners] = useState<any[]>([]);
  const [partnerId, setPartnerId] = useState("");
  const [partnerLoading, setPartnerLoading] = useState(false);
  const [partnerError, setPartnerError] = useState("");
  const loadPartners = async () => {
    setPartnerLoading(true); setPartnerError("");
    try { setPartners((await api.getAdminDeliveryPartners()).filter(p => p.is_active !== false)); }
    catch { setPartnerError("Could not load delivery partners. Please retry."); }
    finally { setPartnerLoading(false); }
  };
  const choosePartner = (row: Request) => {
    setApproving(row); setPartnerId(""); setPartners([]); void loadPartners();
  };
  const generation = useRef(0);
  const load = useCallback(async () => {
    const version = ++generation.current;
    try {
      const data = await api.getReturnRequests();
      if (version !== generation.current) return;
      setRows(data); setError("");
    } catch { if (version === generation.current) setError("Could not refresh requests. Please try again."); }
    finally { if (version === generation.current) { setLoading(false); setRefreshing(false); } }
  }, []);
  useFocusEffect(useCallback(() => { void load(); return () => { generation.current++; }; }, [load]));
  const counts = useMemo(() => Object.fromEntries(statuses.map(item => [item.key, item.key === "all" ? rows.length : rows.filter(row => row.status === item.key).length])), [rows]);
  const filtered = useMemo(() => rows.filter(row =>
    (status === "all" || row.status === status) && (kind === "all" || row.kind === kind) &&
    [row.customer_name, row.order_id, row.reason, ...(row.items || []).map(item => item.product_name)].join(" ").toLowerCase().includes(search.trim().toLowerCase())
  ), [rows, status, kind, search]);
  const update = async (id: string, action: string, rider?: string) => {
    if (mutationLock.current) return;
    mutationLock.current = true; setBusy(id);
    try {
      const updated = await api.updateReturnRequest(id, action, rider);
      setRows(previous => previous.map(row => row.id === id ? updated : row));
      setApproving(null);
    } catch (e: any) { Alert.alert("Request not updated", e?.message || "Please refresh and try again."); }
    finally { mutationLock.current = false; setBusy(null); }
  };
  const confirm = (row: Request, action: string) => Alert.alert(
    action === "pickup" ? "Confirm pickup?" : action === "approve" ? "Approve request?" : "Reject request?",
    action === "pickup" ? "Confirm only after collecting the items. This does not confirm a refund." : `${row.customer_name || "Customer"} · Order #${row.order_id.slice(0, 8)}`,
    [{ text: "Cancel", style: "cancel" }, { text: "Confirm", style: action === "reject" ? "destructive" : "default", onPress: () => void update(row.id, action) }],
  );
  return <SafeAreaView style={s.page} edges={["top", "left", "right"]}>
    <View style={s.header}>
      <TouchableOpacity style={s.iconButton} accessibilityLabel="Back to settings" onPress={() => from === "settings" ? router.replace("/(admin)/settings" as any) : router.canGoBack() ? router.back() : router.replace("/(admin)/settings" as any)}><Ionicons name="arrow-back" size={22} color="#3D1F0A" /></TouchableOpacity>
      <View style={s.flex}><Text style={s.title}>Returns & Exchanges</Text><Text style={s.caption}>Customer requests</Text></View>
      <TouchableOpacity style={s.iconButton} accessibilityLabel="Refresh requests" disabled={loading || refreshing} onPress={() => { setRefreshing(true); void load(); }}><Ionicons name="refresh-outline" size={21} color="#BB6B3F" /></TouchableOpacity>
    </View>
    <FlatList data={filtered} keyExtractor={item => item.id} contentContainerStyle={s.list} keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor="#BB6B3F" />}
      ListHeaderComponent={<View style={s.controls}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.statusRow}>{statuses.map(item => <TouchableOpacity key={item.key} accessibilityRole="tab" accessibilityState={{ selected: status === item.key }} onPress={() => setStatus(item.key)} style={[s.score, { borderBottomColor: status === item.key ? item.color : "transparent" }]}><Text style={[s.number, { color: item.color }]}>{counts[item.key]}</Text><Text style={[s.scoreLabel, status === item.key && { color: item.color, fontWeight: "700" }]}>{item.title}</Text></TouchableOpacity>)}</ScrollView>
        <View style={s.search}><Ionicons name="search-outline" size={19} color="#8A8178" /><TextInput accessibilityLabel="Search requests" value={search} onChangeText={setSearch} placeholder="Customer, order or product" placeholderTextColor="#8A8178" style={s.searchInput} autoCorrect={false} />{search ? <TouchableOpacity accessibilityLabel="Clear search" onPress={() => setSearch("")}><Ionicons name="close-circle" size={20} color="#8A8178" /></TouchableOpacity> : null}</View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.kindRow}>{kinds.map(item => <TouchableOpacity key={item.key} accessibilityRole="tab" accessibilityState={{ selected: kind === item.key }} onPress={() => setKind(item.key)} style={[s.kind, kind === item.key && s.kindSelected]}><Ionicons name={item.icon} size={16} color={kind === item.key ? "#BB6B3F" : "#76685D"} /><Text style={[s.kindText, kind === item.key && { color: "#BB6B3F" }]}>{item.label}</Text></TouchableOpacity>)}</ScrollView>
        {error ? <TouchableOpacity style={s.errorBox} onPress={() => void load()}><Ionicons name="alert-circle-outline" size={18} color="#B44145" /><Text style={s.errorText}>{error}</Text></TouchableOpacity> : null}
        <View style={s.sectionRow}><Text style={s.sectionTitle}>{statuses.find(item => item.key === status)?.title} requests</Text><Text style={s.caption}>{filtered.length} shown</Text></View>
      </View>}
      ListEmptyComponent={loading ? <ActivityIndicator style={s.empty} color="#BB6B3F" /> : <View style={s.empty}><Ionicons name={error ? "cloud-offline-outline" : "file-tray-outline"} size={38} color="#B3A398" /><Text style={s.emptyTitle}>{error ? "Requests unavailable" : "No requests found"}</Text>{!error && (status !== "all" || kind !== "all" || search) ? <TouchableOpacity onPress={() => { setStatus("all"); setKind("all"); setSearch(""); }}><Text style={s.reset}>Clear filters</Text></TouchableOpacity> : null}</View>}
      renderItem={({ item: row }) => {
        const meta = statuses.find(item => item.key === row.status) || statuses[0];
        const open = expanded === row.id;
        return <View style={s.card}>
          <View style={s.cardTop}><View style={[s.badge, { backgroundColor: meta.bg }]}><View style={[s.dot, { backgroundColor: meta.color }]} /><Text style={[s.badgeText, { color: meta.color }]}>{meta.title}</Text></View><Text style={s.date}>{dateLabel(row.created_at)}</Text></View>
          <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setExpanded(open ? null : row.id)} style={s.requestHead}>
            <View style={s.typeIcon}><Ionicons name={kinds.find(item => item.key === row.kind)?.icon || "cube-outline"} size={22} color="#BB6B3F" /></View>
            <View style={s.flex}><Text style={s.requestTitle}>{titles[row.kind] || "Return request"}</Text><Text style={s.customer}>{row.customer_name || "Customer"}</Text></View>
            <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color="#8A8178" />
          </TouchableOpacity>
          <View style={s.orderRow}><Text style={s.caption}>Order #{row.order_id.slice(0, 8)}</Text>{row.kind === "bottle_return" && <Text style={s.quantity}>{row.bottle_count || 0} bottles</Text>}</View>
          <Text style={s.products} numberOfLines={open ? undefined : 2}>{(row.items || []).map(item => `${item.product_name || "Product"} × ${item.quantity}`).join(" · ")}</Text>
          {open && <View style={s.details}><Text style={s.detailLabel}>REASON</Text><Text style={s.detailText}>{row.reason || "Not provided"}</Text><Text style={s.detailLabel}>PICKUP ADDRESS</Text><Text style={s.detailText}>{formatDeliveryAddress(row.address) || "Address not available"}</Text></View>}
          {open && row.status === "picked_up" && <Text style={s.notice}>Pickup confirmed. Refund or exchange completion is still pending.</Text>}
          {open && <ReturnPhoto id={row.id} exists={!!row.has_pickup_photo} />}
          {open && (row.status === "requested" || row.status === "approved") && <View style={s.actions}>
            {row.status === "requested" && <TouchableOpacity disabled={!!busy} style={[s.reject, !!busy && s.disabled]} onPress={() => confirm(row, "reject")}><Ionicons name="close" size={17} color="#B44145" /><Text style={s.rejectText}>Reject</Text></TouchableOpacity>}
            <TouchableOpacity disabled={!!busy} style={[s.primary, !!busy && s.disabled]} onPress={() => row.status === "requested" ? choosePartner(row) : confirm(row, "pickup")}>
              {busy === row.id ? <ActivityIndicator size="small" color="white" /> : <Ionicons name={row.status === "requested" ? "checkmark" : "bag-check-outline"} size={18} color="white" />}<Text style={s.primaryText}>{row.status === "requested" ? "Approve" : "Confirm Pickup"}</Text>
            </TouchableOpacity>
          </View>}
        </View>;
      }} />
    <Modal visible={!!approving} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { if (!busy) setApproving(null); }}>
      <SafeAreaView style={s.page}>
        <View style={s.header}><View style={s.flex}><Text style={s.title}>Assign Pickup</Text><Text style={s.caption}>{approving?.customer_name || "Customer"} · Order #{approving?.order_id.slice(0, 8)}</Text></View><TouchableOpacity accessibilityLabel="Close assignment" disabled={!!busy} style={s.iconButton} onPress={() => setApproving(null)}><Ionicons name="close" size={24} color="#3D1F0A" /></TouchableOpacity></View>
        <ScrollView contentContainerStyle={s.list}>
          {partnerLoading ? <ActivityIndicator color="#BB6B3F" /> : partnerError ? <TouchableOpacity onPress={() => void loadPartners()}><Text style={s.errorText}>{partnerError}</Text></TouchableOpacity> : partners.length === 0 ? <Text style={s.detailText}>No active delivery partners. Add a delivery partner to your farm before approving this request.</Text> : partners.map(partner => <TouchableOpacity key={partner.id} accessibilityRole="radio" accessibilityState={{ checked: partnerId === partner.id }} disabled={!!busy} onPress={() => setPartnerId(partner.id)} style={[s.card, s.requestHead]}><Ionicons name={partnerId === partner.id ? "radio-button-on" : "radio-button-off"} size={24} color="#BB6B3F" /><View style={s.flex}><Text style={s.requestTitle}>{partner.name}</Text><Text style={s.caption}>{partner.phone || "Delivery partner"}</Text></View></TouchableOpacity>)}
        </ScrollView>
        <View style={s.header}><TouchableOpacity disabled={!partnerId || !!busy || partnerLoading} style={[s.primary, (!partnerId || !!busy || partnerLoading) && s.disabled]} onPress={() => { if (approving && partnerId) void update(approving.id, "approve", partnerId); }}>{busy ? <ActivityIndicator color="#fff" /> : <Ionicons name="checkmark" size={20} color="#fff" />}<Text style={s.primaryText}>Approve & Assign</Text></TouchableOpacity></View>
      </SafeAreaView>
    </Modal>
  </SafeAreaView>;
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#FFF8EF" }, flex: { flex: 1, minWidth: 0 }, header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderColor: "#F1E3D0" },
  iconButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" }, title: { fontSize: 19, fontWeight: "700", color: "#3D1F0A" }, caption: { fontSize: 12, color: "#817164", lineHeight: 18 }, list: { padding: 16, paddingBottom: 36 }, controls: { gap: 14, paddingBottom: 12 },
  statusRow: { gap: 8 }, score: { minWidth: 76, paddingVertical: 8, paddingHorizontal: 8, borderBottomWidth: 3, alignItems: "center" }, number: { fontSize: 24, fontWeight: "700", fontVariant: ["tabular-nums"] }, scoreLabel: { fontSize: 12, color: "#817164", marginTop: 4 },
  search: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fff", borderWidth: 1, borderColor: "#E9DED4", borderRadius: 8, paddingHorizontal: 12, minHeight: 46 }, searchInput: { flex: 1, minWidth: 0, paddingVertical: 12, fontSize: 14, color: "#3D1F0A" }, kindRow: { gap: 8 }, kind: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 40, paddingHorizontal: 12, borderWidth: 1, borderColor: "#E9DED4", borderRadius: 8 }, kindSelected: { borderColor: "#DFAC8C", backgroundColor: "#FFF0E4" }, kindText: { fontSize: 12, color: "#76685D", fontWeight: "600" },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }, sectionTitle: { fontSize: 14, fontWeight: "700", color: "#3D1F0A" }, card: { borderRadius: 8, backgroundColor: "#fff", borderWidth: 1, borderColor: "#EDDFD2", marginBottom: 12, padding: 16 }, cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }, badge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 6 }, dot: { height: 5, width: 5, borderRadius: 3 }, badgeText: { fontSize: 11, fontWeight: "700" }, date: { fontSize: 11, color: "#817164" },
  requestHead: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 14 }, typeIcon: { width: 42, height: 42, borderRadius: 8, backgroundColor: "#FFF3E9", alignItems: "center", justifyContent: "center" }, requestTitle: { fontSize: 16, fontWeight: "700", color: "#3D1F0A" }, customer: { fontSize: 13, color: "#6C594B", marginTop: 4 }, orderRow: { flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }, quantity: { fontSize: 12, fontWeight: "700", color: "#2864BD" }, products: { fontSize: 13, color: "#6C594B", lineHeight: 20, marginTop: 8 },
  details: { marginTop: 12, borderTopWidth: 1, borderColor: "#F1E8E0", paddingTop: 12, gap: 6 }, detailLabel: { fontSize: 10, fontWeight: "700", color: "#988476", marginTop: 4 }, detailText: { fontSize: 13, lineHeight: 20, color: "#5E5148" }, notice: { marginTop: 12, fontSize: 12, lineHeight: 18, color: "#6C746E" }, actions: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderColor: "#F1E8E0" },
  primary: { flex: 1, minWidth: 140, minHeight: 44, borderRadius: 8, backgroundColor: "#BB6B3F", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, padding: 12 }, primaryText: { fontSize: 13, fontWeight: "700", color: "white" }, reject: { minHeight: 44, padding: 12, borderWidth: 1, borderColor: "#F0D6D8", borderRadius: 8, flexDirection: "row", alignItems: "center", gap: 6 }, rejectText: { fontSize: 13, color: "#B44145", fontWeight: "600" }, disabled: { opacity: 0.5 }, empty: { paddingVertical: 56, alignItems: "center", gap: 12 }, emptyTitle: { fontSize: 15, color: "#817164" }, reset: { color: "#BB6B3F", fontSize: 13, fontWeight: "700", padding: 10 }, errorBox: { flexDirection: "row", gap: 8, paddingVertical: 10 }, errorText: { flex: 1, color: "#B44145", fontSize: 13, lineHeight: 19 },
});
