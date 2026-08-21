import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
  Animated,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../../src/services/api";
import { Colors } from "../../src/constants/colors";
import LoadingScreen from "../../src/components/LoadingScreen";

// ─── Types 

interface SubscriptionItem {
  product_id: string;
  quantity: number;
  price: number;
  amount: number;
  product?: {
    id: string;
    name: string;
    price: number;
    unit: string;
    image?: string;
    category?: string;
  };
}

interface Subscription {
  id: string;
  items?: SubscriptionItem[];
  total_quantity?: number;
  total_amount?: number;
  // Legacy flat shape (fallback)
  product_id?: string;
  product?: {
    id: string;
    name: string;
    price: number;
    unit: string;
    image?: string;
    category?: string;
  };
  quantity?: number;
  amount?: number;
  // Common fields
  pattern: "daily" | "alternate" | "custom" | "buy_once";
  custom_days?: number[];
  start_date: string;
  end_date?: string | null;
  delivery_slot?: string;
  status?: string;
  created_at?: string;
  admin_name?: string;
}

async function saveAndShareInvoice(payload: {
  filename?: string;
  mime_type?: string;
  base64: string;
}) {
  const FileSystem = require("expo-file-system");
  const Sharing = require("expo-sharing");
  const filename = payload.filename || `invoice-${Date.now()}.pdf`;
  let fileUri = "";
  if (typeof FileSystem.File === "function" && FileSystem.Paths?.cache) {
    const file = new FileSystem.File(FileSystem.Paths.cache, filename);
    file.write(payload.base64, { encoding: "base64" });
    fileUri = file.uri;
  } else if (typeof FileSystem.writeAsStringAsync === "function") {
    const cacheDir =
      FileSystem.cacheDirectory ??
      FileSystem.documentDirectory ??
      FileSystem.Dirs?.Cache ??
      FileSystem.Dirs?.Document ??
      "";
    fileUri = `${cacheDir}${filename}`;
    await FileSystem.writeAsStringAsync(fileUri, payload.base64, {
      encoding: FileSystem.EncodingType?.Base64 ?? "base64",
    });
  } else {
    throw new Error("File download is not supported on this device.");
  }
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType: payload.mime_type || "application/pdf",
      UTI: "com.adobe.pdf",
    });
  } else {
    Alert.alert("Invoice Ready", "Invoice PDF has been saved on this device.");
  }
}

// ─── Helpers 

const MONTH_NAMES = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec",
];

function formatDate(s: string): string {
  if (!s) return "—";
  const d = new Date(s + "T00:00:00");
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

function dateToString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getProductName(sub: Subscription): string {
  return sub.items?.[0]?.product?.name ?? sub.product?.name ?? "Product";
}
function getProductUnit(sub: Subscription): string {
  return sub.items?.[0]?.product?.unit ?? sub.product?.unit ?? "unit";
}
function getProductPrice(sub: Subscription): number {
  return sub.items?.[0]?.price ?? sub.product?.price ?? 0;
}
function getTotalAmount(sub: Subscription): number {
  return sub.total_amount ?? sub.amount ?? 0;
}
function getTotalQty(sub: Subscription): number {
  return sub.total_quantity ?? sub.quantity ?? 1;
}

// ── Status is now the single source of truth (backend keeps it in sync
// with end_date expiry and cancellation) — no more end_date math here.
function isSubscriptionActive(sub: Subscription): boolean {
  return String(sub.status || "").toLowerCase() === "active";
}

// ── Distinct badge for the two "not active" reasons: cancelled by the
// customer/admin vs expired automatically once end_date passed.
function getStatusBadge(
  sub: Subscription,
): { label: string; bg: string; color: string } | null {
  const status = String(sub.status || "").toLowerCase();
  if (status === "cancelled") {
    return { label: "Cancelled", bg: "#FEE2E2", color: "#ef4444" };
  }
  if (status === "inactive") {
    return { label: "Expired", bg: "#F3F4F6", color: "#6B7280" };
  }
  return null;
}

const PATTERN_LABELS: Record<string, string> = {
  daily: "Every Day",
  alternate: "Alternate Days",
  custom: "Custom Days",
};
const PATTERN_ICONS: Record<string, string> = {
  daily: "sunny-outline",
  alternate: "git-compare-outline",
  custom: "calendar-outline",
};
const SLOT_LABELS: Record<string, string> = {
  morning: "Morning (6–9 AM)",
  afternoon: "Afternoon (12–3 PM)",
  evening: "Evening (5–8 PM)",
};

// ─── Mini Calendar 

const DAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const FULL_MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function MiniCalendar({
  selectedDate,
  onSelect,
  minDate,
  accentColor,
}: {
  selectedDate: string | null;
  onSelect: (d: string) => void;
  minDate: string;
  accentColor: string;
}) {
  const init = selectedDate ? new Date(selectedDate + "T00:00:00") : new Date();
  const [yr, setYr] = useState(init.getFullYear());
  const [mo, setMo] = useState(init.getMonth());

  const daysInMonth = new Date(yr, mo + 1, 0).getDate();
  const firstDay = new Date(yr, mo, 1).getDay();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const ds = (day: number) => dateToString(new Date(yr, mo, day));
  const today = dateToString(new Date());

  const prevMo = () =>
    mo === 0 ? (setMo(11), setYr((y) => y - 1)) : setMo((m) => m - 1);
  const nextMo = () =>
    mo === 11 ? (setMo(0), setYr((y) => y + 1)) : setMo((m) => m + 1);

  return (
    <View style={calS.wrap}>
      <View style={calS.header}>
        <TouchableOpacity onPress={prevMo} style={calS.nav}>
          <Ionicons name="chevron-back" size={14} color="#666" />
        </TouchableOpacity>
        <Text style={calS.title}>
          {FULL_MONTH_NAMES[mo]} {yr}
        </Text>
        <TouchableOpacity onPress={nextMo} style={calS.nav}>
          <Ionicons name="chevron-forward" size={14} color="#666" />
        </TouchableOpacity>
      </View>
      <View style={calS.names}>
        {DAY_NAMES.map((d) => (
          <Text key={d} style={calS.dayName}>{d}</Text>
        ))}
      </View>
      <View style={calS.grid}>
        {cells.map((day, i) => {
          if (!day) return <View key={`e-${i}`} style={calS.cell} />;
          const str = ds(day);
          const isPast = str < minDate;
          const isSel = selectedDate === str;
          const isToday = str === today;
          return (
            <TouchableOpacity
              key={`d-${day}`}
              style={[
                calS.cell,
                isSel && { backgroundColor: accentColor, borderRadius: 8 },
                isPast && { opacity: 0.25 },
              ]}
              onPress={() => !isPast && onSelect(str)}
              activeOpacity={isPast ? 1 : 0.7}
            >
              <Text
                style={[
                  calS.dayNum,
                  isSel && { color: "#fff", fontWeight: "800" },
                  isToday && !isSel && { color: accentColor, fontWeight: "700" },
                ]}
              >
                {day}
              </Text>
              {isToday && !isSel && (
                <View style={[calS.todayDot, { backgroundColor: accentColor }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const calS = StyleSheet.create({
  wrap: { paddingBottom: 4 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  nav: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: "#F5F5F3",
    justifyContent: "center",
    alignItems: "center",
  },
  title: { fontSize: 13, fontWeight: "700", color: "#111" },
  names: { flexDirection: "row", marginBottom: 4 },
  dayName: {
    flex: 1,
    textAlign: "center",
    fontSize: 10,
    fontWeight: "600",
    color: "#bbb",
  },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  dayNum: { fontSize: 12, fontWeight: "500", color: "#111" },
  todayDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    position: "absolute",
    bottom: 3,
  },
});

// ─── Main Screen 

export default function MySubscriptionsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [activeTab, setActiveTab] = useState<"active" | "past">("active");

  const [editingSub, setEditingSub] = useState<Subscription | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editQty, setEditQty] = useState(1);
  const [editPattern, setEditPattern] = useState<"daily" | "alternate" | "custom">("daily");
  const [editEndDate, setEditEndDate] = useState<string | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [invoiceLoadingId, setInvoiceLoadingId] = useState<string | null>(null);
  const hasLoadedOnce = useRef(false);
  const fetchInFlight = useRef(false);

  // ── Use the history endpoint so cancelled/expired subs still come back
  // for the "Past" tab — api.getSubscriptions() now only returns
  // status === "active" ones on the backend.
  const fetchSubscriptions = useCallback(async (showInitialLoader = false) => {
    if (fetchInFlight.current) return;
    fetchInFlight.current = true;
    if (showInitialLoader && !hasLoadedOnce.current) setLoading(true);
    try {
      const data = await api.getSubscriptionHistory();
      const filtered = (data || []).filter(
        (sub: Subscription) => sub.pattern !== "buy_once",
      );
      setSubscriptions(filtered);
    } catch {
      Alert.alert("Error", "Failed to load subscriptions");
    } finally {
      hasLoadedOnce.current = true;
      fetchInFlight.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchSubscriptions(!hasLoadedOnce.current);
    }, [fetchSubscriptions]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchSubscriptions();
  };

  const activeSubs = subscriptions.filter(isSubscriptionActive);
  const pastSubs = subscriptions.filter((s) => !isSubscriptionActive(s));
  const displaySubs = activeTab === "active" ? activeSubs : pastSubs;

  const openEdit = (sub: Subscription) => {
    setEditingSub(sub);
    setEditQty(getTotalQty(sub));
    setEditPattern(
      (sub.pattern as any) === "buy_once" ? "daily" : (sub.pattern as any)
    );
    setEditEndDate(sub.end_date ?? null);
    setShowCalendar(false);
    setShowEditModal(true);
  };

  const saveEdit = async () => {
    if (!editingSub) return;
    setActionLoading(true);
    try {
      const unitPrice = getProductPrice(editingSub);

      const payload: any = {
        pattern: editPattern,
        end_date: editEndDate ?? null,
      };

      // Build updated items array if we have items
      if (editingSub.items && editingSub.items.length > 0) {
        payload.items = editingSub.items.map((item, idx) => ({
          product_id: item.product_id,
          quantity: idx === 0 ? editQty : item.quantity,
          price: item.price,
          amount: idx === 0 ? item.price * editQty : item.amount,
        }));
        payload.total_quantity = editQty;
        payload.total_amount = unitPrice * editQty;
      } else if (unitPrice > 0) {
        // Legacy flat sub fallback
        payload.quantity = editQty;
        payload.amount = unitPrice * editQty;
      }

      await api.editSubscription(editingSub.id, payload);
      Alert.alert("Updated", "Subscription updated successfully.");
      setShowEditModal(false);
      await fetchSubscriptions();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to update");
    } finally {
      setActionLoading(false);
    }
  };

  const confirmCancel = (sub: Subscription) => {
    Alert.alert(
      "Cancel Subscription?",
      `Stop deliveries for "${getProductName(sub)}"?`,
      [
        { text: "Keep it" },
        {
          text: "Cancel",
          style: "destructive",
          onPress: async () => {
            setActionLoading(true);
            try {
              await api.cancelSubscription(sub.id);
              Alert.alert("Cancelled", "Subscription cancelled.");
              await fetchSubscriptions();
            } catch (e: any) {
              Alert.alert("Error", e.message || "Failed to cancel");
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleDownloadInvoice = async (sub: Subscription) => {
    if (invoiceLoadingId) return;
    setInvoiceLoadingId(sub.id);
    try {
      const payload = await api.downloadSubscriptionInvoice(sub.id);
      await saveAndShareInvoice(payload);
    } catch (e: any) {
      Alert.alert(
        "Invoice Not Available",
        e?.message || "Could not prepare this subscription invoice right now.",
      );
    } finally {
      setInvoiceLoadingId(null);
    }
  };

  if (loading) return <LoadingScreen />;

  const tomorrow = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return dateToString(d);
  })();

  return (
    <SafeAreaView style={S.container} edges={["top"]}>
      {/* ── Header ── */}
      <View style={S.header}>
        <TouchableOpacity onPress={() => router.back()} style={S.headerBack}>
          <Ionicons name="chevron-back" size={22} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={S.headerTitle}>My Subscriptions</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* ── Tabs ── */}
      <View style={S.tabRow}>
        {(["active", "past"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[S.tab, activeTab === tab && S.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[S.tabTxt, activeTab === tab && S.tabTxtActive]}>
              {tab === "active"
                ? `Active (${activeSubs.length})`
                : `Past (${pastSubs.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── List ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={S.scroll}
      >
        {displaySubs.length === 0 ? (
          <View style={S.empty}>
            <View style={S.emptyIcon}>
              <Ionicons name="repeat-outline" size={32} color="#ccc" />
            </View>
            <Text style={S.emptyTitle}>
              {activeTab === "active"
                ? "No active subscriptions"
                : "No past subscriptions"}
            </Text>
            <Text style={S.emptyBody}>
              {activeTab === "active"
                ? "Subscribe to a product with Daily, Alternate, or Custom delivery."
                : "Expired or cancelled subscriptions will appear here."}
            </Text>
            {activeTab === "active" && (
              <TouchableOpacity
                style={S.browsBtn}
                onPress={() => router.push("/(customer)/catalog")}
              >
                <Ionicons name="grid-outline" size={13} color="#fff" />
                <Text style={S.browsBtnTxt}>Browse Catalog</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          displaySubs.map((sub) => (
            <SubscriptionCard
              key={sub.id}
              sub={sub}
              isActive={activeTab === "active"}
              onEdit={openEdit}
              onCancel={confirmCancel}
              onDownloadInvoice={handleDownloadInvoice}
              downloadingInvoice={invoiceLoadingId === sub.id}
            />
          ))
        )}
        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ── Edit Modal ── */}
      <EditModal
        visible={showEditModal}
        sub={editingSub}
        qty={editQty}
        pattern={editPattern}
        endDate={editEndDate}
        showCalendar={showCalendar}
        tomorrow={tomorrow}
        loading={actionLoading}
        onQtyChange={setEditQty}
        onPatternChange={setEditPattern}
        onEndDateChange={setEditEndDate}
        onToggleCalendar={() => setShowCalendar((v) => !v)}
        onClearEndDate={() => {
          setEditEndDate(null);
          setShowCalendar(false);
        }}
        onSave={saveEdit}
        onClose={() => setShowEditModal(false)}
      />
    </SafeAreaView>
  );
}

// ─── Subscription Card 

function SubscriptionCard({
  sub,
  isActive,
  onEdit,
  onCancel,
  onDownloadInvoice,
  downloadingInvoice,
}: {
  sub: Subscription;
  isActive: boolean;
  onEdit: (s: Subscription) => void;
  onCancel: (s: Subscription) => void;
  onDownloadInvoice: (s: Subscription) => void;
  downloadingInvoice?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const rot = useRef(new Animated.Value(0)).current;

  const toggle = () => {
    Animated.timing(rot, {
      toValue: expanded ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    setExpanded((e) => !e);
  };

  const chevron = rot.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const name = getProductName(sub);
  const unit = getProductUnit(sub);
  const price = getProductPrice(sub);
  const total = getTotalAmount(sub);
  const qty = getTotalQty(sub);
  const pattern = PATTERN_LABELS[sub.pattern] ?? sub.pattern;
  const icon = PATTERN_ICONS[sub.pattern] ?? "repeat-outline";

  // Distinct badge: "Cancelled" (customer/admin action) vs "Expired"
  // (end_date lapsed automatically) — falls back to null when active.
  const statusBadge = getStatusBadge(sub);
  const isDimmed = !!statusBadge;

  return (
    <View style={[C.card, isDimmed && { opacity: 0.6 }]}>
      <TouchableOpacity style={C.row} onPress={toggle} activeOpacity={0.75}>
        <View style={C.iconBox}>
          <Ionicons name="cube" size={26} color={Colors.primary} />
        </View>

        <View style={C.info}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={C.name} numberOfLines={1}>{name}</Text>
            {statusBadge && (
              <View
                style={[C.statusBadge, { backgroundColor: statusBadge.bg }]}
              >
                <Text
                  style={[C.statusBadgeTxt, { color: statusBadge.color }]}
                >
                  {statusBadge.label}
                </Text>
              </View>
            )}
          </View>

          <View style={C.patternPill}>
            <Ionicons name={icon as any} size={10} color={Colors.primary} />
            <Text style={C.patternTxt}>{pattern}</Text>
          </View>

          <View style={C.priceRow}>
            <Text style={C.qtyTxt}>{qty}× {unit}</Text>
            <View style={C.priceStack}>
              {price > 0 && (
                <Text style={C.unitPrice}>₹{price.toFixed(2)}/{unit}</Text>
              )}
              <View style={C.totalBadge}>
                <Text style={C.totalTxt}>₹{total.toFixed(2)}</Text>
              </View>
            </View>
          </View>
        </View>

        <Animated.View style={{ transform: [{ rotate: chevron }] }}>
          <Ionicons name="chevron-down" size={18} color="#bbb" />
        </Animated.View>
      </TouchableOpacity>

      {expanded && (
        <View style={C.expanded}>
          <View style={C.divider} />

          <View style={C.grid}>
            <DetailCell label="Start" value={formatDate(sub.start_date)} />
            <DetailCell
              label="End"
              value={sub.end_date ? formatDate(sub.end_date) : "Open-ended"}
              highlight={!sub.end_date}
            />
            <DetailCell label="Price / Unit" value={`₹${price.toFixed(2)}`} accent />
            <DetailCell label="Per Delivery" value={`₹${total.toFixed(2)}`} bold />
            {sub.delivery_slot && (
              <DetailCell
                label="Slot"
                value={SLOT_LABELS[sub.delivery_slot] ?? sub.delivery_slot}
                fullWidth
              />
            )}
            {sub.admin_name && (
              <DetailCell label="Supplier" value={sub.admin_name} fullWidth />
            )}
            {/* ── show all items if multi-item sub ── */}
            {sub.items && sub.items.length > 1 && (
              <View style={{ width: "100%", marginTop: 4 }}>
                <Text style={C.cellLabel}>All Items</Text>
                {sub.items.map((item, idx) => (
                  <View key={idx} style={C.itemRow}>
                    <Text style={C.itemRowTxt}>
                      {item.product?.name ?? item.product_id}
                    </Text>
                    <Text style={C.itemRowAmt}>
                      {item.quantity}× ₹{item.amount.toFixed(2)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          <TouchableOpacity
            style={C.invoiceBtn}
            onPress={() => onDownloadInvoice(sub)}
            disabled={downloadingInvoice}
            activeOpacity={0.85}
          >
            <Ionicons
              name={downloadingInvoice ? "hourglass-outline" : "download-outline"}
              size={15}
              color={Colors.primary}
            />
            <Text style={C.invoiceTxt}>
              {downloadingInvoice ? "Preparing Invoice..." : "Download Invoice"}
            </Text>
          </TouchableOpacity>

          {isActive && !isDimmed && (
            <View style={C.actions}>
              <TouchableOpacity style={C.editBtn} onPress={() => onEdit(sub)}>
                <Ionicons name="create-outline" size={15} color={Colors.primary} />
                <Text style={C.editTxt}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={C.cancelBtn} onPress={() => onCancel(sub)}>
                <Ionicons name="close-circle-outline" size={15} color="#ef4444" />
                <Text style={C.cancelTxt}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

function DetailCell({
  label,
  value,
  accent,
  bold,
  highlight,
  fullWidth,
}: {
  label: string;
  value: string;
  accent?: boolean;
  bold?: boolean;
  highlight?: boolean;
  fullWidth?: boolean;
}) {
  return (
    <View style={[C.cell, fullWidth && { width: "100%" }]}>
      <Text style={C.cellLabel}>{label}</Text>
      <Text
        style={[
          C.cellValue,
          accent && { color: Colors.primary },
          bold && { fontWeight: "800" },
          highlight && { color: "#888", fontStyle: "italic" },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const C = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: "#FFF4E8",
    justifyContent: "center",
    alignItems: "center",
  },
  info: { flex: 1, gap: 4 },
  name: { fontSize: 14, fontWeight: "700", color: "#111" },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  statusBadgeTxt: { fontSize: 9, fontWeight: "700" },
  patternPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF4E8",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  patternTxt: { fontSize: 10, fontWeight: "700", color: Colors.primary },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  qtyTxt: { fontSize: 12, color: "#666", fontWeight: "600" },
  priceStack: { flexDirection: "row", alignItems: "center", gap: 6 },
  unitPrice: { fontSize: 10, color: "#999", fontWeight: "600" },
  totalBadge: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  totalTxt: { fontSize: 12, fontWeight: "800", color: "#16a34a" },
  expanded: { paddingHorizontal: 14, paddingBottom: 14 },
  divider: { height: 1, backgroundColor: "#f0f0f0", marginBottom: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  cell: {
    width: "48%",
    backgroundColor: "#F8F9FA",
    padding: 10,
    borderRadius: 9,
  },
  cellLabel: {
    fontSize: 10,
    color: "#999",
    fontWeight: "600",
    marginBottom: 3,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  cellValue: { fontSize: 13, color: "#111", fontWeight: "700" },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  itemRowTxt: { fontSize: 12, color: "#333", fontWeight: "600" },
  itemRowAmt: { fontSize: 12, color: "#555", fontWeight: "700" },
  actions: { flexDirection: "row", gap: 10 },
  invoiceBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FFF7ED",
    paddingVertical: 10,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#FED7AA",
    marginBottom: 10,
  },
  invoiceTxt: { fontSize: 13, fontWeight: "800", color: Colors.primary },
  editBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FFF4E8",
    paddingVertical: 10,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#ffe8d6",
  },
  editTxt: { fontSize: 13, fontWeight: "700", color: Colors.primary },
  cancelBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FEF2F2",
    paddingVertical: 10,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  cancelTxt: { fontSize: 13, fontWeight: "700", color: "#ef4444" },
});

// ─── Edit Modal 

function EditModal({
  visible,
  sub,
  qty,
  pattern,
  endDate,
  showCalendar,
  tomorrow,
  loading,
  onQtyChange,
  onPatternChange,
  onEndDateChange,
  onToggleCalendar,
  onClearEndDate,
  onSave,
  onClose,
}: {
  visible: boolean;
  sub: Subscription | null;
  qty: number;
  pattern: string;
  endDate: string | null;
  showCalendar: boolean;
  tomorrow: string;
  loading: boolean;
  onQtyChange: (n: number) => void;
  onPatternChange: (p: "daily" | "alternate" | "custom") => void;
  onEndDateChange: (d: string) => void;
  onToggleCalendar: () => void;
  onClearEndDate: () => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const slide = useRef(new Animated.Value(400)).current;

  useEffect(() => {
    Animated.spring(slide, {
      toValue: visible ? 0 : 400,
      useNativeDriver: true,
      damping: 18,
      stiffness: 200,
    }).start();
  }, [visible]);

  if (!sub) return null;

  const unitPrice = getProductPrice(sub);
  const previewTotal = unitPrice * qty;

  const PATTERNS: Array<{
    key: "daily" | "alternate" | "custom";
    label: string;
    icon: string;
    hint: string;
  }> = [
    { key: "daily", label: "Daily", icon: "sunny-outline", hint: "Every day" },
    { key: "alternate", label: "Alternate", icon: "git-compare-outline", hint: "Every other day" },
    { key: "custom", label: "Custom", icon: "calendar-outline", hint: "Specific days" },
  ];

  return (
    <Modal visible={visible} transparent animationType="none">
      <View style={M.overlay}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
        <Animated.View style={[M.sheet, { transform: [{ translateY: slide }] }]}>
          <View style={M.handle} />
          <View style={M.header}>
            <View>
              <Text style={M.title}>Edit Subscription</Text>
              <Text style={M.subtitle}>{getProductName(sub)}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={M.closeBtn}>
              <Ionicons name="close" size={16} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={M.body} showsVerticalScrollIndicator={false}>
            {/* ── Quantity ── */}
            <View style={M.section}>
              <Text style={M.sectionLabel}>Quantity</Text>
              <View style={M.qtyRow}>
                <TouchableOpacity
                  style={M.qtyBtn}
                  onPress={() => qty > 1 && onQtyChange(qty - 1)}
                >
                  <Ionicons name="remove" size={18} color={qty <= 1 ? "#ccc" : "#111"} />
                </TouchableOpacity>
                <View style={M.qtyCenter}>
                  <Text style={M.qtyNum}>{qty}</Text>
                  <Text style={M.qtyUnit}>{getProductUnit(sub)}</Text>
                </View>
                <TouchableOpacity
                  style={[M.qtyBtn, { backgroundColor: Colors.primary }]}
                  onPress={() => onQtyChange(qty + 1)}
                >
                  <Ionicons name="add" size={18} color="#fff" />
                </TouchableOpacity>
              </View>

              {unitPrice > 0 && (
                <View style={M.pricePreview}>
                  <View style={M.pricePreviewRow}>
                    <Text style={M.pricePreviewLabel}>Price per unit</Text>
                    <Text style={M.pricePreviewVal}>₹{unitPrice.toFixed(2)}</Text>
                  </View>
                  <View style={M.pricePreviewDivider} />
                  <View style={M.pricePreviewRow}>
                    <Text style={M.pricePreviewLabel}>Per delivery total</Text>
                    <Text
                      style={[
                        M.pricePreviewVal,
                        { color: Colors.primary, fontSize: 16, fontWeight: "800" },
                      ]}
                    >
                      ₹{previewTotal.toFixed(2)}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* ── Pattern ── */}
            <View style={M.section}>
              <Text style={M.sectionLabel}>Delivery Schedule</Text>
              <View style={M.patternGrid}>
                {PATTERNS.map((p) => {
                  const active = pattern === p.key;
                  return (
                    <TouchableOpacity
                      key={p.key}
                      style={[M.patternCard, active && M.patternCardActive]}
                      onPress={() => onPatternChange(p.key)}
                    >
                      <Ionicons
                        name={p.icon as any}
                        size={18}
                        color={active ? "#fff" : Colors.primary}
                      />
                      <Text style={[M.patternCardLabel, active && { color: "#fff" }]}>
                        {p.label}
                      </Text>
                      <Text
                        style={[
                          M.patternCardHint,
                          active && { color: "rgba(255,255,255,0.75)" },
                        ]}
                      >
                        {p.hint}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* ── End Date ── */}
            <View style={M.section}>
              <View style={M.endDateHeader}>
                <Text style={M.sectionLabel}>End Date</Text>
                {endDate && (
                  <TouchableOpacity onPress={onClearEndDate} style={M.clearBtn}>
                    <Ionicons name="close-circle" size={14} color="#999" />
                    <Text style={M.clearBtnTxt}>Clear (open-ended)</Text>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity style={M.datePickerRow} onPress={onToggleCalendar}>
                <Ionicons name="calendar-outline" size={16} color={Colors.primary} />
                <Text
                  style={[
                    M.datePickerTxt,
                    !endDate && { color: "#aaa", fontStyle: "italic" },
                  ]}
                >
                  {endDate ? formatDate(endDate) : "No end date (open-ended)"}
                </Text>
                <Ionicons
                  name={showCalendar ? "chevron-up" : "chevron-down"}
                  size={14}
                  color="#999"
                />
              </TouchableOpacity>

              {showCalendar && (
                <View style={M.calendarBox}>
                  <MiniCalendar
                    selectedDate={endDate}
                    onSelect={(d) => {
                      onEndDateChange(d);
                      onToggleCalendar();
                    }}
                    minDate={tomorrow}
                    accentColor={Colors.primary}
                  />
                </View>
              )}
            </View>

            <View style={{ height: 8 }} />
          </ScrollView>

          {/* ── Footer ── */}
          <View style={M.footer}>
            <TouchableOpacity
              style={M.footerCancelBtn}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={M.footerCancelTxt}>Discard</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[M.footerSaveBtn, loading && { opacity: 0.6 }]}
              onPress={onSave}
              disabled={loading}
            >
              <Text style={M.footerSaveTxt}>
                {loading ? "Saving…" : "Save Changes"}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const M = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.48)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    maxHeight: "92%",
  },
  handle: {
    width: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#e5e7eb",
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  title: { fontSize: 17, fontWeight: "800", color: "#111", marginBottom: 2 },
  subtitle: { fontSize: 12, color: "#888", fontWeight: "500" },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#F5F5F3",
    justifyContent: "center",
    alignItems: "center",
  },
  body: { paddingHorizontal: 20, paddingTop: 6 },
  section: { marginTop: 20 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 12,
  },
  qtyBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#F5F5F3",
    justifyContent: "center",
    alignItems: "center",
  },
  qtyCenter: { flex: 1, alignItems: "center" },
  qtyNum: { fontSize: 28, fontWeight: "800", color: "#111" },
  qtyUnit: { fontSize: 11, fontWeight: "600", color: "#888", marginTop: 1 },
  pricePreview: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#ebebeb",
  },
  pricePreviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pricePreviewLabel: { fontSize: 12, color: "#888", fontWeight: "600" },
  pricePreviewVal: { fontSize: 13, fontWeight: "700", color: "#111" },
  pricePreviewDivider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginVertical: 10,
  },
  patternGrid: { flexDirection: "row", gap: 8 },
  patternCard: {
    flex: 1,
    backgroundColor: "#F7F6F4",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    gap: 4,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  patternCardActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  patternCardLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#111",
    textAlign: "center",
  },
  patternCardHint: {
    fontSize: 9,
    fontWeight: "500",
    color: "#888",
    textAlign: "center",
  },
  endDateHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  clearBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  clearBtnTxt: { fontSize: 11, color: "#999", fontWeight: "600" },
  datePickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F7F6F4",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1.5,
    borderColor: "#ebebeb",
  },
  datePickerTxt: { flex: 1, fontSize: 13, fontWeight: "700", color: "#111" },
  calendarBox: {
    marginTop: 10,
    borderWidth: 1.5,
    borderColor: "#ebebeb",
    borderRadius: 12,
    padding: 12,
  },
  footer: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 4,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  footerCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#F5F5F3",
    alignItems: "center",
  },
  footerCancelTxt: { fontSize: 14, fontWeight: "700", color: "#666" },
  footerSaveBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
  },
  footerSaveTxt: { fontSize: 14, fontWeight: "800", color: "#fff" },
});

// ─── Main screen styles 

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  headerBack: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: "#F5F5F3",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 17, fontWeight: "800", color: "#111" },
  tabRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  tab: {
    flex: 1,
    paddingVertical: 13,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: Colors.primary },
  tabTxt: { fontSize: 13, fontWeight: "600", color: "#999" },
  tabTxtActive: { color: Colors.primary, fontWeight: "800" },
  scroll: { paddingHorizontal: 16, paddingTop: 14 },
  empty: { alignItems: "center", paddingVertical: 60, paddingHorizontal: 24 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#f5f5f3",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#555",
    marginBottom: 6,
  },
  emptyBody: {
    fontSize: 13,
    color: "#aaa",
    textAlign: "center",
    lineHeight: 20,
  },
  browsBtn: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.primary,
    borderRadius: 10,
  },
  browsBtnTxt: { color: "#fff", fontWeight: "700", fontSize: 13 },
});
