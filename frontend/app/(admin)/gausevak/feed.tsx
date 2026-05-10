import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Platform,
  FlatList,
  TextInput,
  Animated,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../../../src/services/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const cowImg = require("../../../assets/images/gir-cow.png");
const bullImg = require("../../../assets/images/bull-cow.png");
const calfImg = require("../../../assets/images/calf-cow.png");

const getAnimalImage = (type?: string) => {
  if (type === "bull") return bullImg;
  if (type === "newborn") return calfImg;
  return cowImg;
};

// ─── Types  
type ActiveTab = "stock" | "logs";
type FeedStatus = "fed" | "pending";
type Shift = "morning" | "evening";
type StockFilter = "All" | "Low Stock" | "Expiring" | "Expired";
type LogFilter = "All" | "Both Fed" | "Pending";

type FeedStockCategory =
  | "Dry Fodder"
  | "Green Fodder"
  | "Concentrate"
  | "Silage"
  | "Mixed Feed"
  | "Mineral Mix"
  | "Wheat Bran"
  | "Rice Straw"
  | "Cotton Seed"
  | "Mustard Cake"
  | "Other";

type FeedStockUnit = "kg" | "quintal" | "ton" | "bag" | "bundle" | "litre";
type FeedTxType = "purchase" | "used" | "adjusted" | "expired";

interface FeedStock {
  id: string;
  admin_id: string;
  name: string;
  category: FeedStockCategory;
  unit: FeedStockUnit;
  description?: string;
  supplier?: string;
  batch_number?: string;
  expiry_date?: string;
  purchase_date?: string;
  cost_per_unit?: number;
  current_stock: number;
  min_stock_alert?: number;
  storage_location?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

interface FeedStockSummary {
  total_items: number;
  low_stock_count: number;
  expired_count: number;
  expiring_soon_count: number;
  total_stock_value: number;
}

interface FeedStockTransaction {
  id: string;
  admin_id: string;
  feed_stock_id: string;
  feed_name: string;
  transaction_type: FeedTxType;
  quantity: number;
  unit: string;
  stock_before: number;
  stock_after: number;
  reason?: string;
  performed_by?: string;
  date: string;
  created_at: string;
}

interface FeedItem {
  feed_type: string;
  quantity_kg: number;
}

interface CowFeedRow {
  id: string;
  srNo: string;
  name: string;
  breed: string;
  type: string;
  morning: FeedStatus;
  evening: FeedStatus;
  morningNote: string;
  eveningNote: string;
  morningFeeds: FeedItem[];
  eveningFeeds: FeedItem[];
}

interface LogSummary {
  total: number;
  both_fed: number;
  morning_fed: number;
  evening_fed: number;
  not_fed_at_all: number;
}

// ─── Modern Alert 

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
}

interface AlertState {
  visible: boolean;
  title: string;
  message: string;
  buttons: AlertButton[];
  icon?: string;
}

let _showAlert: (state: Omit<AlertState, "visible">) => void = () => {};

function ModernAlertProvider() {
  const [state, setState] = useState<AlertState>({
    visible: false,
    title: "",
    message: "",
    buttons: [],
    icon: undefined,
  });
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  _showAlert = (s) => {
    setState({ ...s, visible: true });
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 200,
        friction: 18,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 130,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 130,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setState((p) => ({ ...p, visible: false }));
      scaleAnim.setValue(0.85);
    });
  };

  return (
    <Modal
      visible={state.visible}
      transparent
      animationType="none"
      onRequestClose={dismiss}
    >
      <Animated.View style={[alrt.overlay, { opacity: opacityAnim }]}>
        <Animated.View
          style={[alrt.box, { transform: [{ scale: scaleAnim }] }]}
        >
          {state.icon && (
            <View style={alrt.iconWrap}>
              <Text style={{ fontSize: 32 }}>{state.icon}</Text>
            </View>
          )}
          <Text style={alrt.title}>{state.title}</Text>
          {state.message ? <Text style={alrt.msg}>{state.message}</Text> : null}
          <View style={alrt.btnRow}>
            {state.buttons.map((btn, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  alrt.btn,
                  btn.style === "cancel" && alrt.btnCancel,
                  btn.style === "destructive" && alrt.btnDestructive,
                  state.buttons.length === 1 && { flex: 1 },
                ]}
                onPress={() => {
                  dismiss();
                  btn.onPress?.();
                }}
              >
                <Text
                  style={[
                    alrt.btnTxt,
                    btn.style === "cancel" && alrt.btnTxtCancel,
                    btn.style === "destructive" && alrt.btnTxtDestructive,
                  ]}
                >
                  {btn.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const alrt = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  box: {
    width: SCREEN_WIDTH * 0.82,
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 16,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "#FFF5EA",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#FFE8CC",
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#3D2B1F",
    textAlign: "center",
    marginBottom: 6,
  },
  msg: {
    fontSize: 14,
    color: "#8B6854",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  btnRow: { flexDirection: "row", gap: 10 },
  btn: {
    flex: 1,
    backgroundColor: "#BB6B3F",
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
  },
  btnCancel: {
    backgroundColor: "#FFF5EA",
    borderWidth: 1,
    borderColor: "#FFE8CC",
  },
  btnDestructive: {
    backgroundColor: "#fff1f2",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  btnTxt: { fontSize: 15, fontWeight: "700", color: "#fff" },
  btnTxtCancel: { color: "#8B6854" },
  btnTxtDestructive: { color: "#dc2626" },
});

const CustomAlert = {
  alert: (
    title: string,
    message?: string,
    buttons?: AlertButton[],
    icon?: string,
  ) => {
    _showAlert({
      title,
      message: message || "",
      buttons: buttons || [{ text: "OK", style: "default" }],
      icon,
    });
  },
};

// ─── Calendar Date Picker 

interface CalendarPickerProps {
  visible: boolean;
  value: string; // DD/MM/YYYY
  onClose: () => void;
  onSelect: (date: string) => void;
}

function CalendarPicker({
  visible,
  value,
  onClose,
  onSelect,
}: CalendarPickerProps) {
  const today = new Date();
  const parseVal = (): Date => {
    if (value) {
      const [d, m, y] = value.split("/");
      if (d && m && y) return new Date(Number(y), Number(m) - 1, Number(d));
    }
    return today;
  };

  const [viewDate, setViewDate] = useState<Date>(parseVal());

  useEffect(() => {
    if (visible) setViewDate(parseVal());
  }, [visible, value]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const MONTHS = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const selectedDate = parseVal();
  const isSelected = (d: number) =>
    selectedDate.getFullYear() === year &&
    selectedDate.getMonth() === month &&
    selectedDate.getDate() === d;

  const isToday = (d: number) =>
    today.getFullYear() === year &&
    today.getMonth() === month &&
    today.getDate() === d;

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const handleSelect = (d: number) => {
    const dd = String(d).padStart(2, "0");
    const mm = String(month + 1).padStart(2, "0");
    onSelect(`${dd}/${mm}/${year}`);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={cal.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={cal.box}>
          <View style={cal.hdr}>
            <TouchableOpacity
              style={cal.navBtn}
              onPress={() => setViewDate(new Date(year, month - 1, 1))}
            >
              <Ionicons name="chevron-back" size={18} color="#BB6B3F" />
            </TouchableOpacity>
            <Text style={cal.monthTxt}>
              {MONTHS[month]} {year}
            </Text>
            <TouchableOpacity
              style={cal.navBtn}
              onPress={() => setViewDate(new Date(year, month + 1, 1))}
            >
              <Ionicons name="chevron-forward" size={18} color="#BB6B3F" />
            </TouchableOpacity>
          </View>
          <View style={cal.dayRow}>
            {DAY_LABELS.map((l, i) => (
              <Text key={i} style={cal.dayLbl}>
                {l}
              </Text>
            ))}
          </View>
          <View style={cal.grid}>
            {cells.map((d, i) => {
              if (!d) return <View key={`empty-${i}`} style={cal.cell} />;
              const sel = isSelected(d);
              const tod = isToday(d);
              return (
                <TouchableOpacity
                  key={d}
                  style={cal.cell}
                  onPress={() => handleSelect(d)}
                >
                  <View
                    style={[
                      cal.dayBtn,
                      sel && cal.dayBtnSel,
                      !sel && tod && cal.dayBtnToday,
                    ]}
                  >
                    <Text
                      style={[
                        cal.dayNum,
                        sel && cal.dayNumSel,
                        !sel && tod && cal.dayNumToday,
                      ]}
                    >
                      {d}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity
            style={cal.todayBtn}
            onPress={() => {
              const d = String(today.getDate()).padStart(2, "0");
              const m = String(today.getMonth() + 1).padStart(2, "0");
              onSelect(`${d}/${m}/${today.getFullYear()}`);
              onClose();
            }}
          >
            <Ionicons name="today-outline" size={14} color="#BB6B3F" />
            <Text style={cal.todayTxt}>Today</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const cal = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  box: {
    width: SCREEN_WIDTH * 0.86,
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 12,
  },
  hdr: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#FFF5EA",
    alignItems: "center",
    justifyContent: "center",
  },
  monthTxt: { fontSize: 16, fontWeight: "800", color: "#3D2B1F" },
  dayRow: { flexDirection: "row", marginBottom: 6 },
  dayLbl: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "700",
    color: "#C4A882",
  },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: `${100 / 7}%`, alignItems: "center", paddingVertical: 3 },
  dayBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  dayBtnSel: { backgroundColor: "#BB6B3F" },
  dayBtnToday: {
    backgroundColor: "#FFF5EA",
    borderWidth: 1.5,
    borderColor: "#FFBF55",
  },
  dayNum: { fontSize: 13, fontWeight: "600", color: "#3D2B1F" },
  dayNumSel: { color: "#fff", fontWeight: "800" },
  dayNumToday: { color: "#BB6B3F", fontWeight: "800" },
  todayBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
    paddingVertical: 10,
    backgroundColor: "#FFF5EA",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FFE8CC",
  },
  todayTxt: { fontSize: 13, fontWeight: "700", color: "#BB6B3F" },
});

// ─── Date Input with Calendar 

function DateInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [calOpen, setCalOpen] = useState(false);
  return (
    <View style={{ marginBottom: 13 }}>
      <Text style={fms.lbl}>{label}</Text>
      <TouchableOpacity
        style={[
          fms.inp,
          { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
        ]}
        onPress={() => setCalOpen(true)}
        activeOpacity={0.8}
      >
        <Text
          style={{
            flex: 1,
            fontSize: 14,
            color: value ? "#3D2B1F" : "#FFD999",
          }}
        >
          {value || "DD/MM/YYYY"}
        </Text>
        <Ionicons name="calendar-outline" size={16} color="#BB6B3F" />
      </TouchableOpacity>
      <CalendarPicker
        visible={calOpen}
        value={value}
        onClose={() => setCalOpen(false)}
        onSelect={onChange}
      />
    </View>
  );
}

// ─── Constants 

const STOCK_CATEGORIES: FeedStockCategory[] = [
  "Dry Fodder",
  "Green Fodder",
  "Concentrate",
  "Silage",
  "Mixed Feed",
  "Mineral Mix",
  "Wheat Bran",
  "Rice Straw",
  "Cotton Seed",
  "Mustard Cake",
  "Other",
];
const STOCK_UNITS: FeedStockUnit[] = [
  "kg",
  "quintal",
  "ton",
  "bag",
  "bundle",
  "litre",
];

const CAT_ICONS: Record<string, string> = {
  "Dry Fodder": "🌾",
  "Green Fodder": "🌿",
  Concentrate: "🟤",
  Silage: "🫙",
  "Mixed Feed": "🥣",
  "Mineral Mix": "💊",
  "Wheat Bran": "🌾",
  "Rice Straw": "🌾",
  "Cotton Seed": "🌱",
  "Mustard Cake": "🟡",
  Other: "📦",
};

const FEED_OPTIONS = [
  { label: "Dry Fodder", icon: "🌾" },
  { label: "Green Fodder", icon: "🌿" },
  { label: "Concentrate", icon: "🟤" },
  { label: "Silage", icon: "🫙" },
  { label: "Mixed Feed", icon: "🥣" },
  { label: "Mineral Mix", icon: "💊" },
  { label: "Wheat Bran", icon: "🌾" },
  { label: "Rice Straw", icon: "🌾" },
  { label: "Cotton Seed", icon: "🌱" },
  { label: "Mustard Cake", icon: "🟡" },
];

const TX_CFG: Record<
  FeedTxType,
  { color: string; bg: string; icon: string; label: string }
> = {
  purchase: {
    color: "#16a34a",
    bg: "#f0fdf4",
    icon: "arrow-down-circle",
    label: "Purchase",
  },
  used: {
    color: "#BB6B3F",
    bg: "#FFF5EA",
    icon: "arrow-up-circle",
    label: "Used",
  },
  adjusted: {
    color: "#6366f1",
    bg: "#eef2ff",
    icon: "swap-horizontal",
    label: "Adjusted",
  },
  expired: {
    color: "#dc2626",
    bg: "#fff1f2",
    icon: "warning",
    label: "Expired",
  },
};

const STATUS_CFG: Record<
  FeedStatus,
  { color: string; bg: string; border: string; icon: string; label: string }
> = {
  fed: {
    color: "#16a34a",
    bg: "#f0fdf4",
    border: "#86efac",
    icon: "checkmark-circle",
    label: "Fed",
  },
  pending: {
    color: "#BB6B3F",
    bg: "#FFF5EA",
    border: "#FFCFAA",
    icon: "time",
    label: "Pending",
  },
};

// ─── Helpers

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function todayDDMM() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function getCurrentShift(): Shift {
  const h = new Date().getHours();
  return h >= 2 && h < 14 ? "morning" : "evening";
}

function parseExpiry(s?: string): Date | null {
  if (!s) return null;
  const [d, m, y] = s.split("/");
  if (!d || !m || !y) return null;
  return new Date(Number(y), Number(m) - 1, Number(d));
}

function isLowStock(it: FeedStock) {
  return it.min_stock_alert != null && it.current_stock <= it.min_stock_alert;
}
function isExpired(it: FeedStock) {
  const e = parseExpiry(it.expiry_date);
  return e != null && e < new Date();
}
function isExpiringSoon(it: FeedStock, days = 30) {
  const e = parseExpiry(it.expiry_date);
  if (!e) return false;
  const soon = new Date();
  soon.setDate(soon.getDate() + days);
  return e > new Date() && e <= soon;
}

function parseFeeds(raw: any): FeedItem[] {
  if (Array.isArray(raw)) return raw.filter((f: any) => f.feed_type);
  if (raw && typeof raw === "object" && raw.feed_type) return [raw];
  return [];
}

function mapToCowRows(
  cows: any[],
  typeMap: Record<string, string>,
): CowFeedRow[] {
  return cows.map((c) => {
    const rawType =
      c.animal_type ||
      c.type ||
      typeMap[c.cow_tag] ||
      typeMap[c.cow_id] ||
      "mature";
    return {
      id: c.cow_id,
      srNo: c.cow_tag || c.cow_id,
      name: c.cow_name || "Unknown",
      breed: c.breed || "",
      type: rawType,
      morning: c.morning_fed ? "fed" : "pending",
      evening: c.evening_fed ? "fed" : "pending",
      morningNote: c.morning_worker ? `By ${c.morning_worker}` : "—",
      eveningNote: c.evening_worker ? `By ${c.evening_worker}` : "—",
      morningFeeds: parseFeeds(c.morning_feeds),
      eveningFeeds: parseFeeds(c.evening_feeds),
    };
  });
}

// ─── AutoRefreshDot 

function AutoRefreshDot({ active }: { active: boolean }) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!active) return;
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.3,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    a.start();
    return () => a.stop();
  }, [active]);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <Animated.View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          opacity: pulse,
          backgroundColor: active ? "#16a34a" : "#d1d5db",
        }}
      />
      <Text
        style={{
          fontSize: 10,
          fontWeight: "700",
          color: active ? "#16a34a" : "#9ca3af",
        }}
      >
        {active ? "Live" : "Off"}
      </Text>
    </View>
  );
}
//  TAB 1 — FEED STOCK

function StockBadge({ item }: { item: FeedStock }) {
  if (isExpired(item))
    return (
      <View
        style={[sb.w, { backgroundColor: "#fff1f2", borderColor: "#fecaca" }]}
      >
        <Ionicons name="close-circle" size={11} color="#dc2626" />
        <Text style={[sb.t, { color: "#dc2626" }]}>Expired</Text>
      </View>
    );
  if (isLowStock(item))
    return (
      <View
        style={[sb.w, { backgroundColor: "#fffbeb", borderColor: "#fcd34d" }]}
      >
        <Ionicons name="alert-circle" size={11} color="#d97706" />
        <Text style={[sb.t, { color: "#d97706" }]}>Low Stock</Text>
      </View>
    );
  if (isExpiringSoon(item))
    return (
      <View
        style={[sb.w, { backgroundColor: "#eef2ff", borderColor: "#c7d2fe" }]}
      >
        <Ionicons name="time" size={11} color="#6366f1" />
        <Text style={[sb.t, { color: "#6366f1" }]}>Expiring</Text>
      </View>
    );
  return (
    <View
      style={[sb.w, { backgroundColor: "#f0fdf4", borderColor: "#86efac" }]}
    >
      <Ionicons name="checkmark-circle" size={11} color="#16a34a" />
      <Text style={[sb.t, { color: "#16a34a" }]}>OK</Text>
    </View>
  );
}

const sb = StyleSheet.create({
  w: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  t: { fontSize: 10, fontWeight: "700" },
});

function StockCard({
  item,
  index,
  onEdit,
  onRestock,
  onUse,
  onHistory,
}: {
  item: FeedStock;
  index: number;
  onEdit: (i: FeedStock) => void;
  onRestock: (i: FeedStock) => void;
  onUse: (i: FeedStock) => void;
  onHistory: (i: FeedStock) => void;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 280,
        delay: index * 35,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        delay: index * 35,
        tension: 70,
        friction: 12,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const barPct =
    item.min_stock_alert && item.min_stock_alert > 0
      ? Math.min(1, item.current_stock / (item.min_stock_alert * 3))
      : null;
  const barColor = isExpired(item)
    ? "#dc2626"
    : isLowStock(item)
      ? "#d97706"
      : "#16a34a";

  return (
    <Animated.View style={[stk.card, { opacity, transform: [{ translateY }] }]}>
      <TouchableOpacity
        onPress={() => setExpanded((e) => !e)}
        activeOpacity={0.85}
        style={stk.hdr}
      >
        <View style={stk.icon}>
          <Text style={{ fontSize: 22 }}>
            {CAT_ICONS[item.category] || "📦"}
          </Text>
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={stk.name} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={stk.cat}>{item.category}</Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 4 }}>
          <StockBadge item={item} />
          <Text style={stk.qty}>
            {item.current_stock} <Text style={stk.unit}>{item.unit}</Text>
          </Text>
        </View>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={16}
          color="#C4A882"
          style={{ marginLeft: 6 }}
        />
      </TouchableOpacity>

      {barPct !== null && (
        <View style={stk.barWrap}>
          <View
            style={[
              stk.bar,
              {
                width: `${Math.round(barPct * 100)}%`,
                backgroundColor: barColor,
              },
            ]}
          />
        </View>
      )}

      <View style={stk.actions}>
        <TouchableOpacity
          style={[
            stk.aBtn,
            { backgroundColor: "#f0fdf4", borderColor: "#86efac" },
          ]}
          onPress={() => onRestock(item)}
        >
          <Ionicons name="add-circle-outline" size={13} color="#16a34a" />
          <Text style={[stk.aTxt, { color: "#16a34a" }]}>Restock</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            stk.aBtn,
            { backgroundColor: "#FFF5EA", borderColor: "#FFCFAA" },
          ]}
          onPress={() => onUse(item)}
        >
          <Ionicons name="remove-circle-outline" size={13} color="#BB6B3F" />
          <Text style={[stk.aTxt, { color: "#BB6B3F" }]}>Use</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            stk.aBtn,
            { backgroundColor: "#eef2ff", borderColor: "#c7d2fe" },
          ]}
          onPress={() => onHistory(item)}
        >
          <Ionicons name="time-outline" size={13} color="#6366f1" />
          <Text style={[stk.aTxt, { color: "#6366f1" }]}>History</Text>
        </TouchableOpacity>
        <TouchableOpacity style={stk.editBtn} onPress={() => onEdit(item)}>
          <Ionicons name="pencil" size={13} color="#8B6854" />
        </TouchableOpacity>
      </View>

      {expanded && (
        <>
          <View style={stk.divider} />
          <View style={{ gap: 6 }}>
            {(
              [
                ["Supplier", item.supplier],
                ["Batch", item.batch_number],
                ["Purchased", item.purchase_date],
                ["Expires", item.expiry_date],
                [
                  "Cost/Unit",
                  item.cost_per_unit != null
                    ? `₹${item.cost_per_unit}`
                    : undefined,
                ],
                ["Location", item.storage_location],
                [
                  "Min Alert",
                  item.min_stock_alert != null
                    ? `${item.min_stock_alert} ${item.unit}`
                    : undefined,
                ],
              ] as [string, string | undefined][]
            ).map(([l, v]) =>
              v ? (
                <View
                  key={l}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#9ca3af",
                      fontWeight: "500",
                    }}
                  >
                    {l}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#3D2B1F",
                      fontWeight: "600",
                    }}
                  >
                    {v}
                  </Text>
                </View>
              ) : null,
            )}
            {item.notes && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  gap: 6,
                  backgroundColor: "#FFF5EA",
                  borderRadius: 8,
                  padding: 8,
                  marginTop: 2,
                }}
              >
                <Ionicons
                  name="document-text-outline"
                  size={12}
                  color="#FD9E69"
                />
                <Text style={{ fontSize: 12, color: "#8B6854", flex: 1 }}>
                  {item.notes}
                </Text>
              </View>
            )}
          </View>
        </>
      )}
    </Animated.View>
  );
}

const stk = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#FFE8CC",
    shadowColor: "#f0b791",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  hdr: { flexDirection: "row", alignItems: "center" },
  icon: {
    width: 46,
    height: 46,
    borderRadius: 13,
    backgroundColor: "#FFF5EA",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FFE8CC",
  },
  name: {
    fontSize: 14,
    fontWeight: "700",
    color: "#3D2B1F",
    letterSpacing: -0.2,
  },
  cat: { fontSize: 11, color: "#FD9E69", fontWeight: "500", marginTop: 1 },
  qty: { fontSize: 16, fontWeight: "800", color: "#3D2B1F" },
  unit: { fontSize: 12, fontWeight: "500", color: "#8B6854" },
  barWrap: {
    height: 4,
    backgroundColor: "#FFE8CC",
    borderRadius: 2,
    marginTop: 10,
    overflow: "hidden",
  },
  bar: { height: "100%" as any, borderRadius: 2 },
  actions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    alignItems: "center",
  },
  aBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderRadius: 10,
    paddingVertical: 8,
    borderWidth: 1,
  },
  aTxt: { fontSize: 11, fontWeight: "700" },
  editBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#FFF5EA",
    borderWidth: 1,
    borderColor: "#FFE8CC",
    alignItems: "center",
    justifyContent: "center",
  },
  divider: { height: 1, backgroundColor: "#FFF0DC", marginVertical: 12 },
});

function StockSummaryStrip({ summary }: { summary: FeedStockSummary }) {
  return (
    <View style={sss.strip}>
      {[
        {
          l: "Items",
          v: summary.total_items,
          c: "#8B6854",
          bg: "#FFF5EA",
          i: "layers-outline",
        },
        {
          l: "Low Stock",
          v: summary.low_stock_count,
          c: "#d97706",
          bg: "#fffbeb",
          i: "alert-circle",
        },
        {
          l: "Expiring",
          v: summary.expiring_soon_count,
          c: "#6366f1",
          bg: "#eef2ff",
          i: "time",
        },
        {
          l: "Expired",
          v: summary.expired_count,
          c: "#dc2626",
          bg: "#fff1f2",
          i: "close-circle",
        },
      ].map((it, i) => (
        <View key={i} style={[sss.item, { backgroundColor: it.bg }]}>
          <Ionicons name={it.i as any} size={15} color={it.c} />
          <Text style={[sss.val, { color: it.c }]}>{it.v}</Text>
          <Text style={sss.lbl}>{it.l}</Text>
        </View>
      ))}
    </View>
  );
}
const sss = StyleSheet.create({
  strip: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#FFE8CC",
  },
  item: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 9,
    borderRadius: 12,
    gap: 2,
  },
  val: { fontSize: 16, fontWeight: "800", letterSpacing: -0.3 },
  lbl: {
    fontSize: 9,
    color: "#8B6854",
    fontWeight: "600",
    textAlign: "center",
  },
});

function AddEditStockModal({
  visible,
  editItem,
  onClose,
  onSave,
}: {
  visible: boolean;
  editItem: FeedStock | null;
  onClose: () => void;
  onSave: (data: any, isEdit: boolean) => Promise<void>;
}) {
  const isEdit = !!editItem;
  const [saving, setSaving] = useState(false);

  // Use separate state fields so only the changed field re-renders
  const [name, setName] = useState("");
  const [category, setCategory] = useState<FeedStockCategory>("Dry Fodder");
  const [unit, setUnit] = useState<FeedStockUnit>("kg");
  const [supplier, setSupplier] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [costPerUnit, setCostPerUnit] = useState("");
  const [currentStock, setCurrentStock] = useState("");
  const [minStockAlert, setMinStockAlert] = useState("");
  const [storageLocation, setStorageLocation] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!visible) return;
    if (editItem) {
      setName(editItem.name || "");
      setCategory(editItem.category || "Dry Fodder");
      setUnit(editItem.unit || "kg");
      setSupplier(editItem.supplier || "");
      setBatchNumber(editItem.batch_number || "");
      setExpiryDate(editItem.expiry_date || "");
      setPurchaseDate(editItem.purchase_date || "");
      setCostPerUnit(
        editItem.cost_per_unit != null ? String(editItem.cost_per_unit) : "",
      );
      setCurrentStock(String(editItem.current_stock));
      setMinStockAlert(
        editItem.min_stock_alert != null
          ? String(editItem.min_stock_alert)
          : "",
      );
      setStorageLocation(editItem.storage_location || "");
      setNotes(editItem.notes || "");
    } else {
      setName("");
      setCategory("Dry Fodder");
      setUnit("kg");
      setSupplier("");
      setBatchNumber("");
      setExpiryDate(todayDDMM());
      setPurchaseDate(todayDDMM());
      setCostPerUnit("");
      setCurrentStock("");
      setMinStockAlert("");
      setStorageLocation("");
      setNotes("");
    }
  }, [visible, editItem]);

  const handleSave = async () => {
    if (!name.trim()) {
      CustomAlert.alert(
        "Required",
        "Feed name is required",
        [{ text: "OK" }],
        "⚠️",
      );
      return;
    }
    setSaving(true);
    try {
      const p: any = { name: name.trim(), category, unit };
      if (supplier) p.supplier = supplier;
      if (batchNumber) p.batch_number = batchNumber;
      if (expiryDate) p.expiry_date = expiryDate;
      if (purchaseDate) p.purchase_date = purchaseDate;
      if (costPerUnit) p.cost_per_unit = parseFloat(costPerUnit);
      if (currentStock) p.current_stock = parseFloat(currentStock);
      if (minStockAlert) p.min_stock_alert = parseFloat(minStockAlert);
      if (storageLocation) p.storage_location = storageLocation;
      if (notes) p.notes = notes;
      await onSave(p, isEdit);
      onClose();
    } catch (e: any) {
      CustomAlert.alert(
        "Error",
        e?.message || "Failed to save",
        [{ text: "OK" }],
        "❌",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={mdl.overlay}>
          <View style={mdl.sheet}>
            <View style={mdl.handle} />
            <View style={mdl.hdrRow}>
              <View>
                <Text style={mdl.title}>
                  {isEdit ? "Edit Feed Item" : "Add Feed Stock"}
                </Text>
                <Text style={mdl.sub}>
                  {isEdit
                    ? `Editing: ${editItem!.name}`
                    : "New inventory entry"}
                </Text>
              </View>
              <TouchableOpacity style={mdl.closeBtn} onPress={onClose}>
                <Ionicons name="close" size={18} color="#8B6854" />
              </TouchableOpacity>
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="none"
            >
              {/* ── Feed Name ── */}
              <View style={{ marginBottom: 13 }}>
                <Text style={fms.lbl}>FEED NAME *</Text>
                <TextInput
                  style={fms.inp}
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Premium Dry Fodder"
                  placeholderTextColor="#FFD999"
                  blurOnSubmit={false}
                  returnKeyType="next"
                />
              </View>

              {/* ── Category ── */}
              <Text style={fms.lbl}>CATEGORY *</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 13 }}
                keyboardShouldPersistTaps="handled"
              >
                <View
                  style={{ flexDirection: "row", gap: 8, paddingVertical: 2 }}
                >
                  {STOCK_CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[fms.chip, category === cat && fms.chipA]}
                      onPress={() => setCategory(cat)}
                    >
                      <Text style={{ fontSize: 13 }}>{CAT_ICONS[cat]}</Text>
                      <Text
                        style={[fms.chipTxt, category === cat && fms.chipTxtA]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* ── Unit ── */}
              <Text style={fms.lbl}>UNIT *</Text>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 8,
                  marginBottom: 13,
                }}
              >
                {STOCK_UNITS.map((u) => (
                  <TouchableOpacity
                    key={u}
                    style={[fms.uChip, unit === u && fms.uChipA]}
                    onPress={() => setUnit(u)}
                  >
                    <Text style={[fms.uTxt, unit === u && fms.uTxtA]}>{u}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* ── Initial Stock (add only) ── */}
              {!isEdit && (
                <View style={{ marginBottom: 13 }}>
                  <Text style={fms.lbl}>INITIAL STOCK *</Text>
                  <TextInput
                    style={fms.inp}
                    value={currentStock}
                    onChangeText={setCurrentStock}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor="#FFD999"
                    blurOnSubmit={false}
                  />
                </View>
              )}

              {/* ── Cost per unit ── */}
              <View style={{ marginBottom: 13 }}>
                <Text style={fms.lbl}>COST PER UNIT (₹)</Text>
                <TextInput
                  style={fms.inp}
                  value={costPerUnit}
                  onChangeText={setCostPerUnit}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor="#FFD999"
                  blurOnSubmit={false}
                />
              </View>

              {/* ── Min alert ── */}
              <View style={{ marginBottom: 13 }}>
                <Text style={fms.lbl}>MIN. ALERT LEVEL</Text>
                <TextInput
                  style={fms.inp}
                  value={minStockAlert}
                  onChangeText={setMinStockAlert}
                  keyboardType="decimal-pad"
                  placeholder="Alert threshold"
                  placeholderTextColor="#FFD999"
                  blurOnSubmit={false}
                />
              </View>

              {/* ── Supplier ── */}
              <View style={{ marginBottom: 13 }}>
                <Text style={fms.lbl}>SUPPLIER / SOURCE</Text>
                <TextInput
                  style={fms.inp}
                  value={supplier}
                  onChangeText={setSupplier}
                  placeholder="Supplier name"
                  placeholderTextColor="#FFD999"
                  blurOnSubmit={false}
                />
              </View>

              {/* ── Batch ── */}
              <View style={{ marginBottom: 13 }}>
                <Text style={fms.lbl}>BATCH NUMBER</Text>
                <TextInput
                  style={fms.inp}
                  value={batchNumber}
                  onChangeText={setBatchNumber}
                  placeholder="e.g. BATCH-2025"
                  placeholderTextColor="#FFD999"
                  blurOnSubmit={false}
                />
              </View>

              {/* ── Calendar date pickers ── */}
              <DateInput
                label="PURCHASE DATE"
                value={purchaseDate}
                onChange={setPurchaseDate}
              />
              <DateInput
                label="EXPIRY DATE"
                value={expiryDate}
                onChange={setExpiryDate}
              />

              {/* ── Storage location ── */}
              <View style={{ marginBottom: 13 }}>
                <Text style={fms.lbl}>STORAGE LOCATION</Text>
                <TextInput
                  style={fms.inp}
                  value={storageLocation}
                  onChangeText={setStorageLocation}
                  placeholder="Shed A / Godown 1"
                  placeholderTextColor="#FFD999"
                  blurOnSubmit={false}
                />
              </View>

              {/* ── Notes ── */}
              <View style={{ marginBottom: 13 }}>
                <Text style={fms.lbl}>NOTES</Text>
                <TextInput
                  style={fms.inp}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Optional notes..."
                  placeholderTextColor="#FFD999"
                  blurOnSubmit={false}
                  multiline
                />
              </View>

              <TouchableOpacity
                style={[fms.saveBtn, saving && { opacity: 0.65 }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={18} color="#fff" />
                    <Text style={fms.saveTxt}>
                      {isEdit ? "Update Feed" : "Save Feed"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              <View style={{ height: 30 }} />
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Restock / Use Stock Modals 

function QuickStockModal({
  visible,
  item,
  mode,
  onClose,
  onSave,
}: {
  visible: boolean;
  item: FeedStock | null;
  mode: "restock" | "use";
  onClose: () => void;
  onSave: (qty: number, notes: string) => Promise<void>;
}) {
  const [qty, setQty] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const QUICK =
    mode === "restock"
      ? ["50", "100", "200", "500", "1000"]
      : ["5", "10", "20", "50", "100"];

  useEffect(() => {
    if (visible) {
      setQty("");
      setNotes("");
    }
  }, [visible]);

  const handleSave = async () => {
    const q = parseFloat(qty);
    if (!q || q <= 0) {
      CustomAlert.alert(
        "Required",
        "Enter a valid quantity",
        [{ text: "OK" }],
        "⚠️",
      );
      return;
    }
    if (mode === "use" && item && q > item.current_stock) {
      CustomAlert.alert(
        "Insufficient Stock",
        `Only ${item.current_stock} ${item.unit} available`,
        [{ text: "OK" }],
        "📦",
      );
      return;
    }
    setSaving(true);
    try {
      await onSave(q, notes);
      onClose();
    } catch (e: any) {
      CustomAlert.alert(
        "Error",
        e?.message || "Failed",
        [{ text: "OK" }],
        "❌",
      );
    } finally {
      setSaving(false);
    }
  };

  if (!item) return null;
  const isRestock = mode === "restock";
  const accent = isRestock ? "#16a34a" : "#BB6B3F";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={mdl.overlay}>
          <View style={[mdl.sheet, { maxHeight: "65%" }]}>
            <View style={mdl.handle} />
            <View style={mdl.hdrRow}>
              <View>
                <Text style={mdl.title}>
                  {isRestock ? "Restock Feed" : "Record Usage"}
                </Text>
                <Text style={mdl.sub}>
                  {item.name} · {isRestock ? "Current" : "Available"}:{" "}
                  {item.current_stock} {item.unit}
                </Text>
              </View>
              <TouchableOpacity style={mdl.closeBtn} onPress={onClose}>
                <Ionicons name="close" size={18} color="#8B6854" />
              </TouchableOpacity>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="none"
            >
              <Text style={fms.lbl}>QUANTITY ({item.unit})</Text>
              <View style={qm.row}>
                <TouchableOpacity
                  style={qm.btn}
                  onPress={() =>
                    setQty((v) =>
                      String(Math.max(0, (parseFloat(v) || 0) - 0.5)),
                    )
                  }
                >
                  <Ionicons name="remove" size={20} color="#8B6854" />
                </TouchableOpacity>
                <TextInput
                  style={qm.inp}
                  keyboardType="decimal-pad"
                  value={qty}
                  onChangeText={setQty}
                  placeholder="0"
                  placeholderTextColor="#FFD999"
                  blurOnSubmit={false}
                />
                <TouchableOpacity
                  style={qm.btn}
                  onPress={() =>
                    setQty((v) => String((parseFloat(v) || 0) + 0.5))
                  }
                >
                  <Ionicons name="add" size={20} color="#8B6854" />
                </TouchableOpacity>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 14 }}
                keyboardShouldPersistTaps="handled"
              >
                {QUICK.map((q) => (
                  <TouchableOpacity
                    key={q}
                    style={[qm.chip, qty === q && qm.chipA]}
                    onPress={() => setQty(q)}
                  >
                    <Text style={[qm.chipTxt, qty === q && { color: accent }]}>
                      {q} {item.unit}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={fms.lbl}>NOTES (OPTIONAL)</Text>
              <TextInput
                style={[fms.inp, { marginBottom: 16 }]}
                value={notes}
                onChangeText={setNotes}
                placeholder={
                  isRestock
                    ? "e.g. Purchased from local market"
                    : "e.g. Morning feed for 15 cows"
                }
                placeholderTextColor="#FFD999"
                blurOnSubmit={false}
              />
              <TouchableOpacity
                style={[
                  fms.saveBtn,
                  { backgroundColor: accent },
                  saving && { opacity: 0.65 },
                ]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons
                      name={
                        isRestock
                          ? "arrow-down-circle-outline"
                          : "arrow-up-circle-outline"
                      }
                      size={18}
                      color="#fff"
                    />
                    <Text style={fms.saveTxt}>
                      {isRestock ? "Add to Stock" : "Record Usage"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const qm = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBF5",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FFE8CC",
    overflow: "hidden",
    marginBottom: 12,
  },
  btn: {
    width: 46,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF5EA",
  },
  inp: {
    flex: 1,
    textAlign: "center",
    fontSize: 24,
    fontWeight: "800",
    color: "#3D2B1F",
    paddingVertical: 10,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FFE8CC",
    backgroundColor: "#fff",
    marginRight: 8,
  },
  chipA: { borderColor: "#FFCFAA", backgroundColor: "#FFF5EA" },
  chipTxt: { fontSize: 12, fontWeight: "600", color: "#8B6854" },
});

// ─── Transaction History Modal 

function StockHistoryModal({
  visible,
  item,
  onClose,
}: {
  visible: boolean;
  item: FeedStock | null;
  onClose: () => void;
}) {
  const [history, setHistory] = useState<FeedStockTransaction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible || !item) return;
    setLoading(true);
    api
      .getFeedStockTransactions(item.id)
      .then(setHistory)
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, [visible, item]);

  if (!item) return null;
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={mdl.overlay}>
        <View style={[mdl.sheet, { maxHeight: "72%" }]}>
          <View style={mdl.handle} />
          <View style={mdl.hdrRow}>
            <View>
              <Text style={mdl.title}>Transaction History</Text>
              <Text style={mdl.sub}>{item.name}</Text>
            </View>
            <TouchableOpacity style={mdl.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={18} color="#8B6854" />
            </TouchableOpacity>
          </View>
          {loading ? (
            <View style={{ alignItems: "center", padding: 30 }}>
              <ActivityIndicator color="#FFBF55" />
            </View>
          ) : history.length === 0 ? (
            <View style={{ alignItems: "center", padding: 30 }}>
              <Text style={{ fontSize: 36 }}>📋</Text>
              <Text style={{ color: "#8B6854", fontSize: 14, marginTop: 8 }}>
                No transactions yet
              </Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {history.map((tx) => {
                const cfg = TX_CFG[tx.transaction_type as FeedTxType];
                return (
                  <View
                    key={tx.id}
                    style={[txs.row, { borderLeftColor: cfg.color }]}
                  >
                    <View style={[txs.ic, { backgroundColor: cfg.bg }]}>
                      <Ionicons
                        name={cfg.icon as any}
                        size={16}
                        color={cfg.color}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                        }}
                      >
                        <Text style={txs.type}>{cfg.label}</Text>
                        <Text style={[txs.qty, { color: cfg.color }]}>
                          {tx.transaction_type === "purchase"
                            ? "+"
                            : tx.transaction_type === "used"
                              ? "-"
                              : ""}
                          {tx.quantity} {tx.unit}
                        </Text>
                      </View>
                      <Text style={txs.stock}>
                        {tx.stock_before} → {tx.stock_after} {tx.unit}
                      </Text>
                      {tx.reason && <Text style={txs.reason}>{tx.reason}</Text>}
                      <Text style={txs.date}>{tx.date}</Text>
                    </View>
                  </View>
                );
              })}
              <View style={{ height: 20 }} />
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}
const txs = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#FFF0DC",
    borderLeftWidth: 3,
    paddingLeft: 12,
    marginBottom: 2,
  },
  ic: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  type: { fontSize: 13, fontWeight: "700", color: "#3D2B1F" },
  qty: { fontSize: 13, fontWeight: "800" },
  stock: { fontSize: 11, color: "#8B6854", fontWeight: "500", marginTop: 2 },
  reason: { fontSize: 11, color: "#FD9E69", marginTop: 2 },
  date: { fontSize: 10, color: "#9ca3af", marginTop: 2 },
});

//  TAB 2 — FEED LOGS
function LogSummaryStrip({
  summary,
  activeShift,
}: {
  summary: LogSummary;
  activeShift: Shift | "both";
}) {
  const fedCount =
    activeShift === "morning"
      ? summary.morning_fed
      : activeShift === "evening"
        ? summary.evening_fed
        : summary.both_fed;
  return (
    <View style={sss.strip}>
      {[
        {
          l: activeShift === "both" ? "Both Fed" : "Fed",
          v: fedCount,
          c: "#16a34a",
          bg: "#f0fdf4",
          i: "checkmark-circle",
        },
        {
          l: "Pending",
          v: summary.total - fedCount,
          c: "#BB6B3F",
          bg: "#FFF5EA",
          i: "time",
        },
        {
          l: "No Feed",
          v: summary.not_fed_at_all,
          c: "#dc2626",
          bg: "#fff1f2",
          i: "close-circle",
        },
        {
          l: "Total",
          v: summary.total,
          c: "#8B6854",
          bg: "#FFF5EA",
          i: "list",
        },
      ].map((it, i) => (
        <View key={i} style={[sss.item, { backgroundColor: it.bg }]}>
          <Ionicons name={it.i as any} size={15} color={it.c} />
          <Text style={[sss.val, { color: it.c }]}>{it.v}</Text>
          <Text style={sss.lbl}>{it.l}</Text>
        </View>
      ))}
    </View>
  );
}

function ShiftToggle({
  active,
  onChange,
}: {
  active: Shift | "both";
  onChange: (s: Shift | "both") => void;
}) {
  const opts: [Shift | "both", string, string][] = [
    ["both", "Both", "grid-outline"],
    ["morning", "Morning", "sunny-outline"],
    ["evening", "Evening", "moon-outline"],
  ];
  return (
    <View style={sht.wrap}>
      {opts.map(([k, l, ic]) => {
        const on = active === k;
        return (
          <TouchableOpacity
            key={k}
            style={[sht.btn, on && sht.btnA]}
            onPress={() => onChange(k)}
          >
            <Ionicons
              name={ic as any}
              size={13}
              color={on ? "#fff" : "#8B6854"}
            />
            <Text style={[sht.txt, on && sht.txtA]}>{l}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
const sht = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    backgroundColor: "#FFF5EA",
    borderRadius: 12,
    padding: 3,
    gap: 2,
  },
  btn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 8,
    borderRadius: 10,
  },
  btnA: { backgroundColor: "#BB6B3F" },
  txt: { fontSize: 12, fontWeight: "700", color: "#8B6854" },
  txtA: { color: "#fff" },
});

// ─── Feed Detail Modal 

function FeedDetailModal({
  visible,
  cow,
  shift,
  currentFeeds,
  onClose,
  onSave,
}: {
  visible: boolean;
  cow: CowFeedRow | null;
  shift: Shift;
  currentFeeds: FeedItem[];
  onClose: () => void;
  onSave: (feeds: FeedItem[], saveAsDefault: boolean) => Promise<void>;
}) {
  const [feedRows, setFeedRows] = useState<FeedItem[]>([]);
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setFeedRows(
        currentFeeds.length > 0
          ? currentFeeds.map((f) => ({ ...f }))
          : [{ feed_type: "", quantity_kg: 0 }],
      );
      setSaveAsDefault(false);
    }
  }, [visible, currentFeeds]);

  const upd = (idx: number, p: Partial<FeedItem>) =>
    setFeedRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...p } : r)));

  const handleSave = async () => {
    const valid = feedRows.filter(
      (f) => f.feed_type.trim() && f.quantity_kg > 0,
    );
    if (!valid.length) {
      CustomAlert.alert(
        "Required",
        "Add at least one feed with quantity > 0",
        [{ text: "OK" }],
        "⚠️",
      );
      return;
    }
    setSaving(true);
    try {
      await onSave(valid, saveAsDefault);
      onClose();
    } catch (e: any) {
      CustomAlert.alert(
        "Error",
        e?.message || "Failed to save",
        [{ text: "OK" }],
        "❌",
      );
    } finally {
      setSaving(false);
    }
  };

  if (!cow) return null;
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={mdl.overlay}>
          <View style={mdl.sheet}>
            <View style={mdl.handle} />
            <View style={mdl.hdrRow}>
              <View style={{ flex: 1 }}>
                <Text style={mdl.title}>Feed Details</Text>
                <Text style={mdl.sub}>
                  {cow.name} · {shift === "morning" ? "Morning" : "Evening"}
                </Text>
              </View>
              <TouchableOpacity style={mdl.closeBtn} onPress={onClose}>
                <Ionicons name="close" size={18} color="#8B6854" />
              </TouchableOpacity>
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="none"
            >
              {feedRows.map((row, idx) => (
                <View key={idx} style={fdm.card}>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginBottom: 10,
                    }}
                  >
                    <View style={fdm.badge}>
                      <Text style={fdm.badgeTxt}>Feed {idx + 1}</Text>
                    </View>
                    <TouchableOpacity
                      style={fdm.trashBtn}
                      onPress={() => {
                        if (feedRows.length === 1)
                          setFeedRows([{ feed_type: "", quantity_kg: 0 }]);
                        else
                          setFeedRows((prev) =>
                            prev.filter((_, i) => i !== idx),
                          );
                      }}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={15}
                        color="#ef4444"
                      />
                    </TouchableOpacity>
                  </View>
                  <Text style={fms.lbl}>FEED TYPE</Text>
                  <View style={fdm.chips}>
                    {FEED_OPTIONS.map((opt) => {
                      const active = row.feed_type === opt.label;
                      return (
                        <TouchableOpacity
                          key={opt.label}
                          style={[fdm.chip, active && fdm.chipA]}
                          onPress={() =>
                            upd(idx, { feed_type: active ? "" : opt.label })
                          }
                        >
                          <Text style={{ fontSize: 13 }}>{opt.icon}</Text>
                          <Text style={[fdm.chipTxt, active && fdm.chipTxtA]}>
                            {opt.label}
                          </Text>
                          {active && (
                            <Ionicons
                              name="checkmark-circle"
                              size={13}
                              color="#16a34a"
                            />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <View style={fdm.customWrap}>
                    <Ionicons name="create-outline" size={15} color="#FD9E69" />
                    <TextInput
                      style={fdm.customInp}
                      placeholder="Or type custom..."
                      placeholderTextColor="#FFD999"
                      value={
                        FEED_OPTIONS.find((o) => o.label === row.feed_type)
                          ? ""
                          : row.feed_type
                      }
                      onChangeText={(t) => upd(idx, { feed_type: t })}
                      blurOnSubmit={false}
                    />
                  </View>
                  <Text style={[fms.lbl, { marginTop: 12 }]}>
                    QUANTITY (KG)
                  </Text>
                  <View style={qm.row}>
                    <TouchableOpacity
                      style={qm.btn}
                      onPress={() =>
                        upd(idx, {
                          quantity_kg: Math.max(
                            0,
                            (row.quantity_kg || 0) - 0.5,
                          ),
                        })
                      }
                    >
                      <Ionicons name="remove" size={20} color="#8B6854" />
                    </TouchableOpacity>
                    <TextInput
                      style={qm.inp}
                      value={row.quantity_kg > 0 ? String(row.quantity_kg) : ""}
                      onChangeText={(t) =>
                        upd(idx, { quantity_kg: parseFloat(t) || 0 })
                      }
                      keyboardType="decimal-pad"
                      placeholder="0.0"
                      placeholderTextColor="#FFD999"
                      blurOnSubmit={false}
                    />
                    <TouchableOpacity
                      style={qm.btn}
                      onPress={() =>
                        upd(idx, { quantity_kg: (row.quantity_kg || 0) + 0.5 })
                      }
                    >
                      <Ionicons name="add" size={20} color="#8B6854" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              <TouchableOpacity
                style={fdm.addBtn}
                onPress={() =>
                  setFeedRows((p) => [...p, { feed_type: "", quantity_kg: 0 }])
                }
              >
                <Ionicons name="add-circle-outline" size={18} color="#BB6B3F" />
                <Text style={fdm.addTxt}>Add Another Feed Type</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[fdm.defToggle, saveAsDefault && fdm.defToggleA]}
                onPress={() => setSaveAsDefault((v) => !v)}
              >
                <Ionicons
                  name={saveAsDefault ? "checkmark-circle" : "ellipse-outline"}
                  size={20}
                  color={saveAsDefault ? "#FFBF55" : "#FD9E69"}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      fdm.defTitle,
                      saveAsDefault && { color: "#BB6B3F" },
                    ]}
                  >
                    Save as default feed
                  </Text>
                  <Text style={fdm.defSub}>
                    Auto-fill every day for {cow?.name}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[fms.saveBtn, saving && { opacity: 0.65 }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={18} color="#fff" />
                    <Text style={fms.saveTxt}>Save Feed Details</Text>
                  </>
                )}
              </TouchableOpacity>
              <View style={{ height: 30 }} />
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const fdm = StyleSheet.create({
  card: {
    backgroundColor: "#FFFBF5",
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#FFCFAA",
  },
  badge: {
    backgroundColor: "#BB6B3F",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeTxt: { fontSize: 11, fontWeight: "700", color: "#fff" },
  trashBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#fff1f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    alignItems: "center",
    justifyContent: "center",
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FFE8CC",
    backgroundColor: "#fff",
  },
  chipA: { borderColor: "#16a34a", backgroundColor: "#f0fdf4" },
  chipTxt: { fontSize: 12, fontWeight: "600", color: "#8B6854" },
  chipTxtA: { color: "#16a34a" },
  customWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FFE8CC",
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    marginBottom: 4,
  },
  customInp: { flex: 1, paddingVertical: 11, fontSize: 14, color: "#3D2B1F" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#FFCFAA",
    borderRadius: 12,
    backgroundColor: "#FFF5EA",
    paddingVertical: 12,
    marginBottom: 14,
    borderStyle: "dashed",
  },
  addTxt: { fontSize: 14, fontWeight: "700", color: "#BB6B3F" },
  defToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FFE8CC",
    backgroundColor: "#FFFBF5",
    marginBottom: 16,
  },
  defToggleA: { borderColor: "#FFCFAA", backgroundColor: "#FFF5EA" },
  defTitle: { fontSize: 14, fontWeight: "700", color: "#8B6854" },
  defSub: { fontSize: 11, color: "#FD9E69", marginTop: 2 },
});

// ─── Feed Card 

function FeedCard({
  item,
  index,
  activeShift,
  currentShift,
  onEditFeed,
  onMarkedFed,
}: {
  item: CowFeedRow;
  index: number;
  activeShift: Shift | "both";
  currentShift: Shift;
  onEditFeed: (cow: CowFeedRow, shift: Shift) => void;
  onMarkedFed: (cowId: string, shift: Shift) => void;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(14)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const [expanded, setExpanded] = useState(false);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 260,
        delay: index * 35,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        delay: index * 35,
        tension: 70,
        friction: 12,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const bothFed = item.morning === "fed" && item.evening === "fed";
  const shiftStat =
    activeShift === "morning"
      ? item.morning
      : activeShift === "evening"
        ? item.evening
        : bothFed
          ? "fed"
          : "pending";
  const mC = item.morning === "fed" ? "#16a34a" : "#BB6B3F";
  const eC = item.evening === "fed" ? "#16a34a" : "#BB6B3F";
  const mBg = item.morning === "fed" ? "#f0fdf4" : "#FFF5EA";
  const eBg = item.evening === "fed" ? "#f0fdf4" : "#FFF5EA";
  const oC = shiftStat === "fed" ? "#16a34a" : "#BB6B3F";
  const oBg = shiftStat === "fed" ? "#f0fdf4" : "#FFF5EA";
  const oBr = shiftStat === "fed" ? "#86efac" : "#FFCFAA";

  const currentShiftFed =
    currentShift === "morning"
      ? item.morning === "fed"
      : item.evening === "fed";

  const handleMarkFed = async () => {
    if (currentShiftFed || marking) return;
    setMarking(true);
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.94,
        duration: 70,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        tension: 200,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
    try {
      await api.adminMarkFed({
        cow_id: item.id,
        cow_name: item.name,
        cow_tag: item.srNo,
        date: todayStr(),
        shift: currentShift,
      });
      onMarkedFed(item.id, currentShift);
    } catch (e: any) {
      CustomAlert.alert(
        "Error",
        e?.message || "Failed to mark as fed",
        [{ text: "OK" }],
        "❌",
      );
    } finally {
      setMarking(false);
    }
  };

  return (
    <Animated.View
      style={[lc.card, { opacity, transform: [{ translateY }, { scale }] }]}
    >
      <TouchableOpacity
        onPress={() => setExpanded((e) => !e)}
        activeOpacity={0.85}
        style={lc.hdr}
      >
        <View style={lc.avatar}>
          <Image
            source={getAnimalImage(item.type)}
            style={{ width: 36, height: 36 }}
            resizeMode="contain"
          />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={lc.name} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={lc.sr}>
            {item.srNo}
            {item.breed ? ` · ${item.breed}` : ""}
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: 4 }}>
          <View
            style={[
              lc.pill,
              {
                backgroundColor: mBg,
                borderColor: item.morning === "fed" ? "#86efac" : "#FFCFAA",
              },
            ]}
          >
            <Ionicons name="sunny" size={9} color={mC} />
            <Text style={[lc.pillTxt, { color: mC }]}>
              {item.morning === "fed" ? "✓" : "—"}
            </Text>
          </View>
          <View
            style={[
              lc.pill,
              {
                backgroundColor: eBg,
                borderColor: item.evening === "fed" ? "#86efac" : "#FFCFAA",
              },
            ]}
          >
            <Ionicons name="moon" size={9} color={eC} />
            <Text style={[lc.pillTxt, { color: eC }]}>
              {item.evening === "fed" ? "✓" : "—"}
            </Text>
          </View>
        </View>
        <View
          style={[
            lc.badge,
            { backgroundColor: oBg, borderColor: oBr, marginLeft: 6 },
          ]}
        >
          <View style={[lc.dot, { backgroundColor: oC }]} />
          <Text style={[lc.badgeTxt, { color: oC }]}>
            {activeShift !== "both"
              ? shiftStat === "fed"
                ? "Fed"
                : "Pending"
              : bothFed
                ? "Fully Fed"
                : "Partial"}
          </Text>
        </View>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={15}
          color="#C4A882"
          style={{ marginLeft: 5 }}
        />
      </TouchableOpacity>

      {!currentShiftFed && (
        <TouchableOpacity
          style={lc.markBtn}
          onPress={handleMarkFed}
          disabled={marking}
        >
          {marking ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="add-circle-outline" size={14} color="#fff" />
              <Text style={lc.markBtnTxt}>
                Mark {currentShift === "morning" ? "☀️ Morning" : "🌙 Evening"}{" "}
                Fed
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {expanded && (
        <>
          <View style={lc.divider} />
          <View style={{ flexDirection: "row", gap: 10 }}>
            {(activeShift === "both" || activeShift === "morning") && (
              <FeedSessionCard
                status={item.morning}
                note={item.morningNote}
                session="Morning"
                feeds={item.morningFeeds}
                onEdit={() => onEditFeed(item, "morning")}
              />
            )}
            {(activeShift === "both" || activeShift === "evening") && (
              <FeedSessionCard
                status={item.evening}
                note={item.eveningNote}
                session="Evening"
                feeds={item.eveningFeeds}
                onEdit={() => onEditFeed(item, "evening")}
              />
            )}
          </View>
        </>
      )}
    </Animated.View>
  );
}

const lc = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#FFE8CC",
    shadowColor: "#f0b791",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  hdr: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#FFF5EA",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FFE8CC",
  },
  name: {
    fontSize: 14,
    fontWeight: "700",
    color: "#3D2B1F",
    letterSpacing: -0.2,
  },
  sr: { fontSize: 11, color: "#FD9E69", fontWeight: "500", marginTop: 1 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 7,
    borderWidth: 1,
  },
  pillTxt: { fontSize: 9, fontWeight: "700" },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  dot: { width: 5, height: 5, borderRadius: 3 },
  badgeTxt: { fontSize: 9, fontWeight: "700" },
  markBtn: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#BB6B3F",
    borderRadius: 10,
    paddingVertical: 9,
  },
  markBtnTxt: { fontSize: 13, fontWeight: "700", color: "#fff" },
  divider: { height: 1, backgroundColor: "#FFF0DC", marginVertical: 12 },
});

function FeedSessionCard({
  status,
  note,
  session,
  feeds,
  onEdit,
}: {
  status: FeedStatus;
  note: string;
  session: string;
  feeds: FeedItem[];
  onEdit: () => void;
}) {
  const cfg = STATUS_CFG[status];
  const totKg = feeds.reduce((s, f) => s + f.quantity_kg, 0);
  return (
    <View
      style={[fsc.card, { backgroundColor: cfg.bg, borderColor: cfg.border }]}
    >
      <View style={fsc.top}>
        <View style={fsc.ico}>
          <Ionicons
            name={session === "Morning" ? "sunny" : "moon"}
            size={12}
            color={session === "Morning" ? "#FFBF55" : "#BB6B3F"}
          />
        </View>
        <Text style={fsc.lbl}>{session}</Text>
        <View style={[fsc.dot, { backgroundColor: cfg.color }]} />
      </View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          marginBottom: 6,
        }}
      >
        <Ionicons name={cfg.icon as any} size={15} color={cfg.color} />
        <Text style={[fsc.status, { color: cfg.color }]}>{cfg.label}</Text>
      </View>
      {feeds.length > 0 && (
        <View style={{ gap: 2, marginBottom: 6 }}>
          {feeds.map((f, i) => (
            <View
              key={i}
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <Text style={fsc.feedTxt} numberOfLines={1}>
                • {f.feed_type}
              </Text>
              <Text style={fsc.feedQty}>{f.quantity_kg}kg</Text>
            </View>
          ))}
          {feeds.length > 1 && (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                borderTopWidth: 1,
                borderTopColor: "rgba(0,0,0,0.06)",
                marginTop: 2,
                paddingTop: 3,
              }}
            >
              <Text
                style={{ fontSize: 11, fontWeight: "800", color: "#3D2B1F" }}
              >
                Total
              </Text>
              <Text
                style={{ fontSize: 11, fontWeight: "800", color: "#3D2B1F" }}
              >
                {totKg.toFixed(1)}kg
              </Text>
            </View>
          )}
        </View>
      )}
      <TouchableOpacity
        style={[
          fsc.editBtn,
          feeds.length > 0 ? fsc.editBtnUpd : fsc.editBtnAdd,
        ]}
        onPress={onEdit}
      >
        <Ionicons
          name={feeds.length > 0 ? "pencil" : "add"}
          size={12}
          color={feeds.length > 0 ? "#BB6B3F" : "#16a34a"}
        />
        <Text
          style={[
            fsc.editTxt,
            { color: feeds.length > 0 ? "#BB6B3F" : "#16a34a" },
          ]}
        >
          {feeds.length > 0 ? "Update" : "Add Feed"}
        </Text>
      </TouchableOpacity>
      {note !== "—" && (
        <Text style={fsc.note} numberOfLines={1}>
          {note}
        </Text>
      )}
    </View>
  );
}
const fsc = StyleSheet.create({
  card: { flex: 1, borderRadius: 12, padding: 12, borderWidth: 1 },
  top: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 7 },
  ico: {
    width: 20,
    height: 20,
    borderRadius: 5,
    backgroundColor: "rgba(0,0,0,0.04)",
    alignItems: "center",
    justifyContent: "center",
  },
  lbl: { flex: 1, fontSize: 11, fontWeight: "700", color: "#8B6854" },
  dot: { width: 6, height: 6, borderRadius: 3 },
  status: { fontSize: 12, fontWeight: "700" },
  feedTxt: { fontSize: 11, color: "#8B6854", fontWeight: "500", flex: 1 },
  feedQty: { fontSize: 11, fontWeight: "700", color: "#8B6854" },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginTop: 6,
    borderRadius: 8,
    paddingVertical: 6,
    borderWidth: 1,
  },
  editBtnAdd: { backgroundColor: "#f0fdf4", borderColor: "#86efac" },
  editBtnUpd: { backgroundColor: "#FFF5EA", borderColor: "#FFCFAA" },
  editTxt: { fontSize: 11, fontWeight: "700" },
  note: { fontSize: 10, color: "#FD9E69", fontWeight: "500", marginTop: 4 },
});

// ─── Shared Modal Styles 

const mdl = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
    maxHeight: "92%",
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: "#FFE8CC",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 18,
  },
  hdrRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  title: { fontSize: 20, fontWeight: "800", color: "#3D2B1F" },
  sub: { fontSize: 13, color: "#8B6854", marginTop: 3 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFF5EA",
    alignItems: "center",
    justifyContent: "center",
  },
});

const fms = StyleSheet.create({
  lbl: {
    fontSize: 10,
    fontWeight: "700",
    color: "#8B6854",
    letterSpacing: 1,
    marginBottom: 8,
  },
  inp: {
    borderWidth: 1,
    borderColor: "#FFE8CC",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#3D2B1F",
    backgroundColor: "#FFFBF5",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FFE8CC",
    backgroundColor: "#fff",
  },
  chipA: { borderColor: "#BB6B3F", backgroundColor: "#FFF5EA" },
  chipTxt: { fontSize: 12, fontWeight: "600", color: "#8B6854" },
  chipTxtA: { color: "#BB6B3F" },
  uChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FFE8CC",
    backgroundColor: "#fff",
  },
  uChipA: { borderColor: "#BB6B3F", backgroundColor: "#FFF5EA" },
  uTxt: { fontSize: 12, fontWeight: "600", color: "#8B6854" },
  uTxtA: { color: "#BB6B3F" },
  saveBtn: {
    backgroundColor: "#BB6B3F",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    marginTop: 6,
  },
  saveTxt: { color: "#fff", fontSize: 16, fontWeight: "700" },
});

//  MAIN SCREEN
export default function AdminFeedHubScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const currentShift = getCurrentShift();

  const [activeTab, setActiveTab] = useState<ActiveTab>("stock");
  const tabAnim = useRef(new Animated.Value(0)).current;

  const switchTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    Animated.spring(tabAnim, {
      toValue: tab === "stock" ? 0 : 1,
      tension: 200,
      friction: 20,
      useNativeDriver: false,
    }).start();
  };

  // ── Stock state ──
  const [stocks, setStocks] = useState<FeedStock[]>([]);
  const [stockSummary, setStockSummary] = useState<FeedStockSummary>({
    total_items: 0,
    low_stock_count: 0,
    expired_count: 0,
    expiring_soon_count: 0,
    total_stock_value: 0,
  });
  const [stockLoading, setStockLoading] = useState(true);
  const [stockRefreshing, setStockRefreshing] = useState(false);
  const [stockSearch, setStockSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("All");
  const [addStockModal, setAddStockModal] = useState(false);
  const [editStockItem, setEditStockItem] = useState<FeedStock | null>(null);
  const [restockItem, setRestockItem] = useState<FeedStock | null>(null);
  const [useItem, setUseItem] = useState<FeedStock | null>(null);
  const [historyItem, setHistoryItem] = useState<FeedStock | null>(null);

  // ── Logs state ──
  const [cowRows, setCowRows] = useState<CowFeedRow[]>([]);
  const [logSummary, setLogSummary] = useState<LogSummary>({
    total: 0,
    both_fed: 0,
    morning_fed: 0,
    evening_fed: 0,
    not_fed_at_all: 0,
  });
  const [logLoading, setLogLoading] = useState(true);
  const [logRefreshing, setLogRefreshing] = useState(false);
  const [activeShift, setActiveShift] = useState<Shift | "both">("both");
  const [logSearch, setLogSearch] = useState("");
  const [logFilter, setLogFilter] = useState<LogFilter>("All");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [feedDetailVisible, setFeedDetailVisible] = useState(false);
  const [editingCow, setEditingCow] = useState<CowFeedRow | null>(null);
  const [editingShift, setEditingShift] = useState<Shift>("morning");

  const isMounted = useRef(true);
  const autoRefRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeShiftRef = useRef(activeShift);
  useEffect(() => {
    activeShiftRef.current = activeShift;
  }, [activeShift]);

  // Fetch stock
  const fetchStock = useCallback(async (silent = false) => {
    if (!isMounted.current) return;
    try {
      const [data, sum] = await Promise.all([
        api.getFeedStocks(),
        api.getFeedStockSummary(),
      ]);
      if (!isMounted.current) return;
      setStocks(data);
      setStockSummary(sum);
    } catch (e) {
      if (!silent) console.log("stock fetch error:", e);
    } finally {
      if (!silent && isMounted.current) {
        setStockLoading(false);
        setStockRefreshing(false);
      }
    }
  }, []);

  const buildTypeMap = async (): Promise<Record<string, string>> => {
    try {
      const list = await api.getCows();
      const m: Record<string, string> = {};
      for (const c of list) {
        if (c.tag) m[c.tag] = c.type;
        if (c.id) m[c.id] = c.type;
      }
      return m;
    } catch {
      return {};
    }
  };

  const fetchLogs = useCallback(async (shift?: Shift, silent = false) => {
    if (!isMounted.current) return;
    try {
      const token = await AsyncStorage.getItem("access_token");
      if (!token) {
        if (!silent) setLogLoading(false);
        return;
      }
      api.setToken(token);
      const [data, typeMap] = await Promise.all([
        api.getAdminFeedLogs(todayStr(), shift),
        buildTypeMap(),
      ]);
      if (!isMounted.current) return;
      if (!data?.summary || !data?.cows) {
        if (!silent) {
          setLogLoading(false);
          setLogRefreshing(false);
        }
        return;
      }
      setLogSummary(data.summary);
      setCowRows(mapToCowRows(data.cows, typeMap));
    } catch (e) {
      if (!silent) console.log("log fetch error:", e);
    } finally {
      if (!silent && isMounted.current) {
        setLogLoading(false);
        setLogRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    setStockLoading(true);
    fetchStock(false);
    setLogLoading(true);
    fetchLogs(undefined, false);
    return () => {
      isMounted.current = false;
      if (autoRefRef.current) clearInterval(autoRefRef.current);
    };
  }, []);

  useEffect(() => {
    if (autoRefRef.current) clearInterval(autoRefRef.current);
    if (autoRefresh) {
      autoRefRef.current = setInterval(() => {
        const s = activeShiftRef.current;
        fetchLogs(s === "both" ? undefined : s, true);
      }, 2000);
    }
    return () => {
      if (autoRefRef.current) clearInterval(autoRefRef.current);
    };
  }, [autoRefresh, fetchLogs]);

  useEffect(() => {
    setLogLoading(true);
    fetchLogs(activeShift === "both" ? undefined : activeShift, false);
  }, [activeShift]);

  // Stock handlers
  const handleAddStock = async (data: any) => {
    const created = await api.createFeedStock(data);
    setStocks((p) => [created, ...p]);
    setStockSummary((p) => ({ ...p, total_items: p.total_items + 1 }));
  };
  const handleEditStock = async (data: any) => {
    if (!editStockItem) return;
    const updated = await api.updateFeedStock(editStockItem.id, data);
    setStocks((p) =>
      p.map((it) => (it.id === editStockItem.id ? updated : it)),
    );
    setEditStockItem(null);
  };
  const handleRestock = async (qty: number, notes: string) => {
    if (!restockItem) return;
    const r = await api.restockFeedStock(restockItem.id, {
      feed_stock_id: restockItem.id,
      quantity_added: qty,
      notes,
    });
    setStocks((p) =>
      p.map((it) =>
        it.id === restockItem.id ? { ...it, current_stock: r.stock_after } : it,
      ),
    );
  };
  const handleUse = async (qty: number, notes: string) => {
    if (!useItem) return;
    const r = await api.useFeedStock({
      feed_stock_id: useItem.id,
      quantity_used: qty,
      date: todayStr(),
      notes,
    });
    setStocks((p) =>
      p.map((it) =>
        it.id === useItem.id ? { ...it, current_stock: r.stock_after } : it,
      ),
    );
  };

  // Log handlers
  const handleEditFeed = (cow: CowFeedRow, shift: Shift) => {
    setEditingCow(cow);
    setEditingShift(shift);
    setFeedDetailVisible(true);
  };
  const handleSaveFeed = async (feeds: FeedItem[], _: boolean) => {
    if (!editingCow) return;
    const token = await AsyncStorage.getItem("access_token");
    if (!token) return;
    api.setToken(token);
    await api.updateAdminFeedDetails(
      editingCow.id,
      todayStr(),
      editingShift,
      feeds,
      false,
    );
    setCowRows((p) =>
      p.map((row) => {
        if (row.id !== editingCow.id) return row;
        return editingShift === "morning"
          ? { ...row, morningFeeds: feeds }
          : { ...row, eveningFeeds: feeds };
      }),
    );
  };
  const handleMarkedFed = (cowId: string, shift: Shift) => {
    setCowRows((p) =>
      p.map((row) => {
        if (row.id !== cowId) return row;
        return shift === "morning"
          ? { ...row, morning: "fed", morningNote: "By Admin" }
          : { ...row, evening: "fed", eveningNote: "By Admin" };
      }),
    );
    setLogSummary((p) => ({
      ...p,
      morning_fed: shift === "morning" ? p.morning_fed + 1 : p.morning_fed,
      evening_fed: shift === "evening" ? p.evening_fed + 1 : p.evening_fed,
      not_fed_at_all: Math.max(0, p.not_fed_at_all - 1),
    }));
  };

  // Filtered lists
  const filteredStocks = stocks.filter((it) => {
    const ms =
      it.name.toLowerCase().includes(stockSearch.toLowerCase()) ||
      it.category.toLowerCase().includes(stockSearch.toLowerCase()) ||
      (it.supplier || "").toLowerCase().includes(stockSearch.toLowerCase());
    const mf =
      stockFilter === "All" ||
      (stockFilter === "Low Stock" && isLowStock(it)) ||
      (stockFilter === "Expiring" && isExpiringSoon(it)) ||
      (stockFilter === "Expired" && isExpired(it));
    return ms && mf;
  });

  const filteredLogs = cowRows.filter((d) => {
    const ms =
      d.name.toLowerCase().includes(logSearch.toLowerCase()) ||
      d.srNo.toLowerCase().includes(logSearch.toLowerCase());
    const ss =
      activeShift === "morning"
        ? d.morning
        : activeShift === "evening"
          ? d.evening
          : d.morning === "fed" && d.evening === "fed"
            ? "fed"
            : "pending";
    const mf =
      logFilter === "All" ||
      (logFilter === "Both Fed" &&
        d.morning === "fed" &&
        d.evening === "fed") ||
      (logFilter === "Pending" && ss === "pending");
    return ms && mf;
  });

  const indicatorLeft = tabAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["2%", "52%"],
  });


  const logsListHeader = useCallback(
    () => (
      <View>
        <LogSummaryStrip summary={logSummary} activeShift={activeShift} />

        {/* Shift banner */}
        <View
          style={[
            root.shiftBanner,
            {
              backgroundColor:
                currentShift === "morning" ? "#fffbeb" : "#eef2ff",
              borderColor: currentShift === "morning" ? "#fcd34d" : "#c7d2fe",
            },
          ]}
        >
          <Ionicons
            name={currentShift === "morning" ? "sunny" : "moon"}
            size={13}
            color={currentShift === "morning" ? "#d97706" : "#6366f1"}
          />
          <Text
            style={[
              root.shiftTxt,
              { color: currentShift === "morning" ? "#d97706" : "#6366f1" },
            ]}
          >
            Current shift:{" "}
            <Text style={{ fontWeight: "800" }}>
              {currentShift === "morning" ? "Morning" : "Evening"}
            </Text>
            {"  ·  "}
            <Text style={{ fontWeight: "500", opacity: 0.7 }}>
              Mark Fed uses this shift
            </Text>
          </Text>
        </View>

        {/* Shift view toggle */}
        <View
          style={{ paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4 }}
        >
          <ShiftToggle active={activeShift} onChange={setActiveShift} />
        </View>

        {/* Search */}
        <View style={root.searchWrap}>
          <Ionicons name="search-outline" size={14} color="#FD9E69" />
          <TextInput
            style={root.searchInp}
            value={logSearch}
            onChangeText={setLogSearch}
            placeholder="Search cow name or tag..."
            placeholderTextColor="#FFD999"
            returnKeyType="search"
            blurOnSubmit={false}
          />
          {logSearch.length > 0 && (
            <TouchableOpacity onPress={() => setLogSearch("")}>
              <Ionicons name="close-circle" size={14} color="#FD9E69" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter row */}
        <View style={root.filterRow}>
          {(["All", "Both Fed", "Pending"] as LogFilter[]).map((f) => {
            const on = logFilter === f;
            return (
              <TouchableOpacity
                key={f}
                onPress={() => setLogFilter(f)}
                style={[root.chip, on && root.chipA]}
              >
                <Text style={[root.chipTxt, on && root.chipTxtA]}>{f}</Text>
              </TouchableOpacity>
            );
          })}
          <Text style={root.count}>{filteredLogs.length} cows</Text>
        </View>

        {filteredLogs.length > 0 && (
          <Text
            style={{
              fontSize: 11,
              color: "#C4A882",
              fontWeight: "500",
              textAlign: "center",
              marginBottom: 4,
            }}
          >
            Tap a card to see feed details
          </Text>
        )}
      </View>
    ),
    [
      logSummary,
      activeShift,
      currentShift,
      logSearch,
      logFilter,
      filteredLogs.length,
    ],
  );

  // STOCK TAB: similarly, render sticky controls as ListHeaderComponent
  const stockListHeader = useCallback(
    () => (
      <View>
        <StockSummaryStrip summary={stockSummary} />

        {stockSummary.total_stock_value > 0 && (
          <View style={root.valueChip}>
            <Ionicons name="wallet-outline" size={13} color="#BB6B3F" />
            <Text style={root.valueText}>
              Total Value:{" "}
              <Text style={{ fontWeight: "800" }}>
                ₹{stockSummary.total_stock_value.toLocaleString("en-IN")}
              </Text>
            </Text>
          </View>
        )}

        <View style={root.searchWrap}>
          <Ionicons name="search-outline" size={14} color="#FD9E69" />
          <TextInput
            style={root.searchInp}
            value={stockSearch}
            onChangeText={setStockSearch}
            placeholder="Search name, category, supplier..."
            placeholderTextColor="#FFD999"
            returnKeyType="search"
            blurOnSubmit={false}
          />
          {stockSearch.length > 0 && (
            <TouchableOpacity onPress={() => setStockSearch("")}>
              <Ionicons name="close-circle" size={14} color="#FD9E69" />
            </TouchableOpacity>
          )}
        </View>

        <View style={root.filterRow}>
          {(["All", "Low Stock", "Expiring", "Expired"] as StockFilter[]).map(
            (f) => {
              const on = stockFilter === f;
              return (
                <TouchableOpacity
                  key={f}
                  onPress={() => setStockFilter(f)}
                  style={[root.chip, on && root.chipA]}
                >
                  <Text style={[root.chipTxt, on && root.chipTxtA]}>{f}</Text>
                </TouchableOpacity>
              );
            },
          )}
          <Text style={root.count}>{filteredStocks.length}</Text>
        </View>
      </View>
    ),
    [stockSummary, stockSearch, stockFilter, filteredStocks.length],
  );

  return (
    <View style={[root.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ModernAlertProvider />

      {/* ── Header ── */}
      <View style={root.header}>
        <TouchableOpacity onPress={() => router.back()} style={root.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#8B6854" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={root.headerTitle}>Feed Hub</Text>
          <Text style={root.headerSub}>{today}</Text>
        </View>
        {activeTab === "logs" && (
          <TouchableOpacity
            style={root.liveBtn}
            onPress={() => setAutoRefresh((a) => !a)}
          >
            <AutoRefreshDot active={autoRefresh} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={root.iconBtn}
          onPress={() =>
            activeTab === "stock"
              ? fetchStock(false)
              : fetchLogs(
                  activeShift === "both" ? undefined : activeShift,
                  false,
                )
          }
        >
          <Ionicons name="refresh-outline" size={18} color="#BB6B3F" />
        </TouchableOpacity>
        {activeTab === "stock" && (
          <TouchableOpacity
            style={root.addBtn}
            onPress={() => {
              setEditStockItem(null);
              setAddStockModal(true);
            }}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={root.addTxt}>Add</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Tab Bar ── */}
      <View style={root.tabBar}>
        <Animated.View style={[root.tabIndicator, { left: indicatorLeft }]} />
        <TouchableOpacity
          style={root.tabBtn}
          onPress={() => switchTab("stock")}
        >
          <Ionicons
            name="layers"
            size={16}
            color={activeTab === "stock" ? "#BB6B3F" : "#9ca3af"}
          />
          <Text style={[root.tabTxt, activeTab === "stock" && root.tabTxtA]}>
            Feed Stock
          </Text>
          {stockSummary.low_stock_count > 0 && (
            <View style={root.tabBadge}>
              <Text style={root.tabBadgeTxt}>
                {stockSummary.low_stock_count}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={root.tabBtn} onPress={() => switchTab("logs")}>
          <Ionicons
            name="clipboard"
            size={16}
            color={activeTab === "logs" ? "#BB6B3F" : "#9ca3af"}
          />
          <Text style={[root.tabTxt, activeTab === "logs" && root.tabTxtA]}>
            Feed Logs
          </Text>
          {logSummary.not_fed_at_all > 0 && (
            <View style={[root.tabBadge, { backgroundColor: "#BB6B3F" }]}>
              <Text style={root.tabBadgeTxt}>{logSummary.not_fed_at_all}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ════ STOCK TAB ════
          KEY: ListHeaderComponent holds summary strip + search + filters.
          FlatList is the ONLY scrollable container → no nested scroll issues,
          and the header scrolls with it so nothing disappears.                */}
      {activeTab === "stock" &&
        (stockLoading ? (
          <View style={root.loadWrap}>
            <ActivityIndicator size="large" color="#FFBF55" />
            <Text style={root.loadTxt}>Loading feed stock...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredStocks}
            keyExtractor={(it) => it.id}
            contentContainerStyle={root.list}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="none"
            ListHeaderComponent={stockListHeader}
            refreshControl={
              <RefreshControl
                refreshing={stockRefreshing}
                onRefresh={() => {
                  setStockRefreshing(true);
                  fetchStock(false);
                }}
                tintColor="#FFBF55"
              />
            }
            renderItem={({ item, index }) => (
              <StockCard
                item={item}
                index={index}
                onEdit={(it) => {
                  setEditStockItem(it);
                  setAddStockModal(true);
                }}
                onRestock={(it) => setRestockItem(it)}
                onUse={(it) => setUseItem(it)}
                onHistory={(it) => setHistoryItem(it)}
              />
            )}
            ListEmptyComponent={
              <View style={root.empty}>
                <Text style={{ fontSize: 44 }}>🌾</Text>
                <Text style={root.emptyTxt}>No feed stock found</Text>
                <TouchableOpacity
                  style={root.emptyBtn}
                  onPress={() => {
                    setEditStockItem(null);
                    setAddStockModal(true);
                  }}
                >
                  <Ionicons
                    name="add-circle-outline"
                    size={15}
                    color="#BB6B3F"
                  />
                  <Text style={root.emptyBtnTxt}>Add First Feed Item</Text>
                </TouchableOpacity>
              </View>
            }
            ListFooterComponent={<View style={{ height: 100 }} />}
          />
        ))}

      {/* ════ LOGS TAB ════
          KEY: ALL controls (summary strip, shift banner, shift toggle, search,
          filters) are rendered inside ListHeaderComponent. The FlatList is the
          only scroll container. Controls never disappear on scroll.            */}
      {activeTab === "logs" &&
        (logLoading ? (
          <View style={root.loadWrap}>
            <ActivityIndicator size="large" color="#FFBF55" />
            <Text style={root.loadTxt}>Loading feed logs...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredLogs}
            keyExtractor={(it) => it.id}
            contentContainerStyle={root.list}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="none"
            ListHeaderComponent={logsListHeader}
            refreshControl={
              <RefreshControl
                refreshing={logRefreshing}
                onRefresh={() => {
                  setLogRefreshing(true);
                  fetchLogs(
                    activeShift === "both" ? undefined : activeShift,
                    false,
                  );
                }}
                tintColor="#FFBF55"
              />
            }
            renderItem={({ item, index }) => (
              <FeedCard
                item={item}
                index={index}
                activeShift={activeShift}
                currentShift={currentShift}
                onEditFeed={handleEditFeed}
                onMarkedFed={handleMarkedFed}
              />
            )}
            ListEmptyComponent={
              <View style={root.empty}>
                <Text style={{ fontSize: 44 }}>🐄</Text>
                <Text style={root.emptyTxt}>No records found</Text>
              </View>
            }
            ListFooterComponent={<View style={{ height: 100 }} />}
          />
        ))}

      {/* ── Modals ── */}
      <AddEditStockModal
        visible={addStockModal}
        editItem={editStockItem}
        onClose={() => {
          setAddStockModal(false);
          setEditStockItem(null);
        }}
        onSave={editStockItem ? handleEditStock : handleAddStock}
      />

      <QuickStockModal
        visible={!!restockItem}
        item={restockItem}
        mode="restock"
        onClose={() => setRestockItem(null)}
        onSave={handleRestock}
      />

      <QuickStockModal
        visible={!!useItem}
        item={useItem}
        mode="use"
        onClose={() => setUseItem(null)}
        onSave={handleUse}
      />

      <StockHistoryModal
        visible={!!historyItem}
        item={historyItem}
        onClose={() => setHistoryItem(null)}
      />

      <FeedDetailModal
        visible={feedDetailVisible}
        cow={editingCow}
        shift={editingShift}
        currentFeeds={
          editingShift === "morning"
            ? (editingCow?.morningFeeds ?? [])
            : (editingCow?.eveningFeeds ?? [])
        }
        onClose={() => setFeedDetailVisible(false)}
        onSave={handleSaveFeed}
      />
    </View>
  );
}

// ─── Root Styles 

const root = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFBF5" },
  loadWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadTxt: { color: "#8B6854", fontSize: 14, fontWeight: "600" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#FFE8CC",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFF5EA",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FFE8CC",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#3D2B1F",
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 12,
    color: "#8B6854",
    fontWeight: "500",
    marginTop: 1,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFF5EA",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FFE8CC",
    marginLeft: 6,
  },
  liveBtn: {
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 18,
    backgroundColor: "#FFF5EA",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FFE8CC",
    marginLeft: 6,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#BB6B3F",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 6,
  },
  addTxt: { color: "#fff", fontWeight: "700", fontSize: 13 },

  tabBar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#FFE8CC",
    position: "relative",
  },
  tabIndicator: {
    position: "absolute",
    bottom: 8,
    height: 36,
    width: "46%",
    backgroundColor: "#FFF5EA",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FFE8CC",
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 12,
    zIndex: 1,
  },
  tabTxt: { fontSize: 13, fontWeight: "700", color: "#9ca3af" },
  tabTxtA: { color: "#BB6B3F" },
  tabBadge: {
    backgroundColor: "#d97706",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 18,
    alignItems: "center",
  },
  tabBadgeTxt: { fontSize: 10, fontWeight: "800", color: "#fff" },

  valueChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 14,
    marginTop: 10,
    backgroundColor: "#FFF5EA",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FFE8CC",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  valueText: { fontSize: 12, color: "#8B6854", fontWeight: "600" },
  shiftBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 14,
    marginTop: 10,
    marginBottom: 2,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  shiftTxt: { fontSize: 12, fontWeight: "600", flex: 1 },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 14,
    marginTop: 10,
    marginBottom: 8,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FFE8CC",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInp: { flex: 1, color: "#3D2B1F", fontSize: 14 },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 8,
    marginBottom: 6,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#FFE8CC",
  },
  chipA: { backgroundColor: "#BB6B3F", borderColor: "#BB6B3F" },
  chipTxt: { fontSize: 12, color: "#8B6854", fontWeight: "600" },
  chipTxtA: { color: "#fff" },
  count: {
    marginLeft: "auto",
    fontSize: 11,
    color: "#9ca3af",
    fontWeight: "600",
  },
  list: { paddingTop: 4 },
  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyTxt: { fontSize: 15, color: "#8B6854", fontWeight: "600" },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#FFCFAA",
    borderRadius: 12,
    backgroundColor: "#FFF5EA",
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 4,
  },
  emptyBtnTxt: { fontSize: 14, fontWeight: "700", color: "#BB6B3F" },
});
