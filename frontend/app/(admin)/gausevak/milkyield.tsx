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
  SafeAreaView,
<<<<<<< HEAD
  LayoutAnimation,
  UIManager,
=======
  ActivityIndicator,
  RefreshControl,
  Modal,
  KeyboardAvoidingView,
>>>>>>> d0ef3950fe532a7f2ddb13147f25a8b1958d9b5a
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../../src/services/api";

<<<<<<< HEAD
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const MILK_DATA = [
  { id: "1", srNo: "GS-001", name: "Kamdhenu",  morningLiters: 9.5,  eveningLiters: 8.5  },
  { id: "2", srNo: "GS-002", name: "Nandini",   morningLiters: 7.0,  eveningLiters: 7.0  },
  { id: "3", srNo: "GS-003", name: "Ganga",     morningLiters: 4.0,  eveningLiters: 4.0  },
  { id: "4", srNo: "GS-004", name: "Saraswati", morningLiters: 0,    eveningLiters: 0    },
  { id: "5", srNo: "GS-005", name: "Lakshmi",   morningLiters: 12.0, eveningLiters: 10.0 },
  { id: "6", srNo: "GS-006", name: "Durga",     morningLiters: 0,    eveningLiters: 0    },
  { id: "7", srNo: "GS-007", name: "Parvati",   morningLiters: 8.5,  eveningLiters: 7.5  },
  { id: "8", srNo: "GS-008", name: "Radha",     morningLiters: 2.5,  eveningLiters: 3.0  },
];

const today = new Date().toLocaleDateString("en-IN", {
  weekday: "long", day: "numeric", month: "long", year: "numeric",
});

// ─── Shift Card ───────────────────────────────────────────────────────────────
function ShiftCard({ session, liters }: { session: "Morning" | "Evening"; liters: number }) {
  const isMorning = session === "Morning";
  const isEmpty = liters === 0;
  const color  = isEmpty ? "#9ca3af" : isMorning ? "#d97706" : "#6366f1";
  const bg     = isEmpty ? "#f9fafb" : isMorning ? "#fffbeb" : "#eef2ff";
=======
// ─── Types ────────────────────────────────────────────────────────────────────
interface MilkRow {
  id: string;
  srNo: string;
  name: string;
  morningLiters: number;
  eveningLiters: number;
  morningWorker: string | null;
  eveningWorker: string | null;
  dailyCapacity: number;
  peak: { date: string; total: number } | null;
}

interface Summary {
  total_morning: number;
  total_evening: number;
  grand_total: number;
  active_cows: number;
  total_cows: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function todayStr() {
  return new Date().toISOString().split("T")[0];
}

const todayLabel = new Date().toLocaleDateString("en-IN", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

// ─── ShiftCard ────────────────────────────────────────────────────────────────
function ShiftCard({
  session,
  liters,
  worker,
}: {
  session: "Morning" | "Evening";
  liters: number;
  worker: string | null;
}) {
  const isMorning = session === "Morning";
  const isEmpty = liters === 0;
  const color = isEmpty ? "#9ca3af" : isMorning ? "#d97706" : "#6366f1";
  const bg = isEmpty ? "#f9fafb" : isMorning ? "#fffbeb" : "#eef2ff";
>>>>>>> d0ef3950fe532a7f2ddb13147f25a8b1958d9b5a
  const border = isEmpty ? "#e5e7eb" : isMorning ? "#fcd34d" : "#c7d2fe";
  const icon   = isMorning ? "sunny" : "moon";

  return (
    <View style={[sh.card, { backgroundColor: bg, borderColor: border }]}>
      <View style={sh.topRow}>
        <View style={[sh.iconWrap, { backgroundColor: isEmpty ? "#f3f4f6" : color + "20" }]}>
          <Ionicons name={icon as any} size={14} color={isEmpty ? "#d1d5db" : color} />
        </View>
        <Text style={[sh.sessionLabel, { color: isEmpty ? "#9ca3af" : color }]}>{session}</Text>
      </View>
      <Text style={[sh.liters, { color: isEmpty ? "#d1d5db" : color }]}>
        {isEmpty ? "0.0" : liters.toFixed(1)}
      </Text>
<<<<<<< HEAD
      <Text style={[sh.unit, { color: isEmpty ? "#d1d5db" : color + "99" }]}>Litres</Text>
=======
      <Text style={[sh.unit, { color: isEmpty ? "#d1d5db" : color + "99" }]}>
        Litres
      </Text>
      {!isEmpty && worker && (
        <Text
          style={[sh.workerName, { color: color + "99" }]}
          numberOfLines={1}
        >
          by {worker}
        </Text>
      )}
>>>>>>> d0ef3950fe532a7f2ddb13147f25a8b1958d9b5a
      {isEmpty && <Text style={sh.nilTag}>NIL</Text>}
    </View>
  );
}

<<<<<<< HEAD
// ─── Milk Yield Card ──────────────────────────────────────────────────────────
function MilkCard({ item, index }: { item: (typeof MILK_DATA)[0]; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const opacity   = useRef(new Animated.Value(0)).current;
=======
// ─── CapacityBar ──────────────────────────────────────────────────────────────
function CapacityBar({ total, capacity }: { total: number; capacity: number }) {
  const pct = capacity > 0 ? Math.min(total / capacity, 1) : 0;
  const barColor = pct >= 1 ? "#16a34a" : pct >= 0.7 ? "#d97706" : "#ef4444";
  const barBg = pct >= 1 ? "#dcfce7" : pct >= 0.7 ? "#fef3c7" : "#fee2e2";
  const label =
    pct >= 1 ? "At Capacity" : pct >= 0.7 ? "Good Yield" : "Below Target";

  return (
    <View style={cap.wrap}>
      <View style={cap.labelRow}>
        <Text style={cap.title}>Daily Capacity</Text>
        <Text style={[cap.pctText, { color: barColor }]}>
          {total.toFixed(1)} / {capacity.toFixed(1)} L
        </Text>
      </View>
      <View style={[cap.track, { backgroundColor: barBg }]}>
        <View
          style={[
            cap.fill,
            { width: `${pct * 100}%`, backgroundColor: barColor },
          ]}
        />
      </View>
      <Text style={[cap.status, { color: barColor }]}>{label}</Text>
    </View>
  );
}

// ─── PeakBadge ────────────────────────────────────────────────────────────────
function PeakBadge({ peak }: { peak: { date: string; total: number } | null }) {
  if (!peak) return null;
  const d = new Date(peak.date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
  return (
    <View style={pk.wrap}>
      <Ionicons name="trophy" size={11} color="#b45309" />
      <Text style={pk.text}>
        Peak: <Text style={pk.val}>{peak.total.toFixed(1)} L</Text> on {d}
      </Text>
    </View>
  );
}

// ─── CapacityModal ────────────────────────────────────────────────────────────
function CapacityModal({
  visible,
  cow,
  currentCapacity,
  onSave,
  onClose,
}: {
  visible: boolean;
  cow: MilkRow | null;
  currentCapacity: number;
  onSave: (val: number) => void;
  onClose: () => void;
}) {
  const [val, setVal] = useState(
    currentCapacity > 0 ? currentCapacity.toString() : "",
  );

  // Sync input when modal opens with current capacity
  useEffect(() => {
    setVal(currentCapacity > 0 ? currentCapacity.toString() : "");
  }, [currentCapacity, visible]);

  const handleSave = () => {
    const n = parseFloat(val);
    if (!isNaN(n) && n > 0) onSave(n);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={md.overlay}
      >
        <TouchableOpacity
          style={md.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={md.sheet}>
          <View style={md.handle} />
          <Text style={md.title}>Set Milking Capacity</Text>
          {cow && (
            <Text style={md.sub}>
              🐄 {cow.name} · {cow.srNo}
            </Text>
          )}
          <Text style={md.hint}>
            Enter the expected maximum daily milk yield for this cow (in
            litres).
          </Text>
          <View style={md.inputRow}>
            <TextInput
              style={md.input}
              value={val}
              onChangeText={setVal}
              keyboardType="decimal-pad"
              placeholder="e.g. 20"
              placeholderTextColor="#d1d5db"
              autoFocus
            />
            <Text style={md.unit}>L / day</Text>
          </View>
          <View style={md.btnRow}>
            <TouchableOpacity style={md.cancel} onPress={onClose}>
              <Text style={md.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={md.save} onPress={handleSave}>
              <Ionicons name="checkmark" size={16} color="#fff" />
              <Text style={md.saveText}>Save Capacity</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── MilkCard ─────────────────────────────────────────────────────────────────
function MilkCard({
  item,
  index,
  onSetCapacity,
}: {
  item: MilkRow;
  index: number;
  onSetCapacity: (cow: MilkRow) => void;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
>>>>>>> d0ef3950fe532a7f2ddb13147f25a8b1958d9b5a
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 300, delay: index * 60, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, delay: index * 60, tension: 70, friction: 12, useNativeDriver: true }),
    ]).start();
  }, []);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
  };

  const total = item.morningLiters + item.eveningLiters;
  const isHighYield = total >= 15;
  const isNil = total === 0;

<<<<<<< HEAD
  const totalColor  = isNil ? "#9ca3af" : isHighYield ? "#16a34a" : "#2563eb";
  const totalBg     = isNil ? "#f9fafb" : isHighYield ? "#f0fdf4" : "#eff6ff";
=======
  // Read directly from item — updated optimistically on save
  const capacity = item.dailyCapacity ?? 0;
  const peak = item.peak ?? null;

  const totalColor = isNil ? "#9ca3af" : isHighYield ? "#16a34a" : "#2563eb";
  const totalBg = isNil ? "#f9fafb" : isHighYield ? "#f0fdf4" : "#eff6ff";
>>>>>>> d0ef3950fe532a7f2ddb13147f25a8b1958d9b5a
  const totalBorder = isNil ? "#e5e7eb" : isHighYield ? "#86efac" : "#bfdbfe";

  return (
    <Animated.View style={[s.card, { opacity, transform: [{ translateY }] }]}>
<<<<<<< HEAD

      {/* ── Tappable Header ── */}
      <TouchableOpacity onPress={toggle} activeOpacity={0.7} style={s.cardHeader}>
=======
      <View style={s.cardHeader}>
>>>>>>> d0ef3950fe532a7f2ddb13147f25a8b1958d9b5a
        <View style={s.avatarWrap}>
          <Text style={{ fontSize: 22 }}>🐄</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={s.cowName}>{item.name}</Text>
          <Text style={s.cowSr}>{item.srNo}</Text>
        </View>
<<<<<<< HEAD
        <View style={[s.totalBadge, { backgroundColor: totalBg, borderColor: totalBorder }]}>
          <Ionicons name="water" size={12} color={totalColor} />
          <Text style={[s.totalText, { color: totalColor }]}>{total.toFixed(1)} L</Text>
          <Text style={[s.totalSub, { color: totalColor + "88" }]}>Total</Text>
=======
        <View style={{ alignItems: "flex-end", gap: 6 }}>
          <View
            style={[
              s.totalBadge,
              { backgroundColor: totalBg, borderColor: totalBorder },
            ]}
          >
            <Ionicons name="water" size={12} color={totalColor} />
            <Text style={[s.totalText, { color: totalColor }]}>
              {total.toFixed(1)} L
            </Text>
            <Text style={[s.totalSub, { color: totalColor + "88" }]}>
              Today
            </Text>
          </View>

          {/* Capacity button — shows current value or "Set cap" */}
          <TouchableOpacity
            style={s.capacityBtn}
            onPress={() => onSetCapacity(item)}
          >
            <Ionicons name="settings-outline" size={11} color="#6b7280" />
            <Text style={s.capacityBtnText}>
              {capacity > 0 ? `${capacity.toFixed(0)}L cap` : "Set cap"}
            </Text>
          </TouchableOpacity>
>>>>>>> d0ef3950fe532a7f2ddb13147f25a8b1958d9b5a
        </View>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={16}
          color="#bbb"
          style={{ marginLeft: 8 }}
        />
      </TouchableOpacity>

<<<<<<< HEAD
      {/* ── Expanded Content ── */}
      {expanded && (
        <>
          <View style={s.divider} />
          <View style={s.shiftsRow}>
            <ShiftCard session="Morning" liters={item.morningLiters} />
            <ShiftCard session="Evening" liters={item.eveningLiters} />
          </View>
        </>
      )}
=======
      {/* Capacity progress bar — only shown when capacity is set */}
      {capacity > 0 && <CapacityBar total={total} capacity={capacity} />}

      {/* Peak badge — only shown when history exists */}
      {peak && <PeakBadge peak={peak} />}

      <View style={s.divider} />

      <View style={s.shiftsRow}>
        <ShiftCard
          session="Morning"
          liters={item.morningLiters}
          worker={item.morningWorker}
        />
        <ShiftCard
          session="Evening"
          liters={item.eveningLiters}
          worker={item.eveningWorker}
        />
      </View>
>>>>>>> d0ef3950fe532a7f2ddb13147f25a8b1958d9b5a
    </Animated.View>
  );
}

<<<<<<< HEAD
// ─── Summary Bar ──────────────────────────────────────────────────────────────
function SummaryBar({ data }: { data: typeof MILK_DATA }) {
  const totalMorning = data.reduce((acc, d) => acc + d.morningLiters, 0);
  const totalEvening = data.reduce((acc, d) => acc + d.eveningLiters, 0);
  const grandTotal   = totalMorning + totalEvening;
  const activeCows   = data.filter((d) => d.morningLiters + d.eveningLiters > 0).length;

  return (
    <View style={s.summaryBar}>
      {[
        { label: "Morning Total", value: `${totalMorning.toFixed(1)} L`, color: "#d97706", bg: "#fffbeb", icon: "sunny"  },
        { label: "Evening Total", value: `${totalEvening.toFixed(1)} L`, color: "#6366f1", bg: "#eef2ff", icon: "moon"   },
        { label: "Grand Total",   value: `${grandTotal.toFixed(1)} L`,   color: "#16a34a", bg: "#f0fdf4", icon: "water"  },
        { label: "Active Cows",   value: `${activeCows}`,                color: "#2563eb", bg: "#eff6ff", icon: "paw"    },
=======
// ─── SummaryBar ───────────────────────────────────────────────────────────────
function SummaryBar({ summary }: { summary: Summary }) {
  return (
    <View style={s.summaryBar}>
      {[
        {
          label: "Morning Total",
          value: `${summary.total_morning.toFixed(1)} L`,
          color: "#d97706",
          bg: "#fffbeb",
          icon: "sunny",
        },
        {
          label: "Evening Total",
          value: `${summary.total_evening.toFixed(1)} L`,
          color: "#6366f1",
          bg: "#eef2ff",
          icon: "moon",
        },
        {
          label: "Grand Total",
          value: `${summary.grand_total.toFixed(1)} L`,
          color: "#16a34a",
          bg: "#f0fdf4",
          icon: "water",
        },
        {
          label: "Active Cows",
          value: `${summary.active_cows}`,
          color: "#2563eb",
          bg: "#eff6ff",
          icon: "paw",
        },
>>>>>>> d0ef3950fe532a7f2ddb13147f25a8b1958d9b5a
      ].map((st, i) => (
        <View key={i} style={[s.summaryItem, { backgroundColor: st.bg }]}>
          <Ionicons name={st.icon as any} size={15} color={st.color} />
          <Text style={[s.summaryValue, { color: st.color }]}>{st.value}</Text>
          <Text style={s.summaryLabel}>{st.label}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function MilkYieldScreen() {
  const router = useRouter();
<<<<<<< HEAD
  const [search, setSearch]   = useState("");
  const [sortBy, setSortBy]   = useState<"name" | "total" | "morning" | "evening">("name");

  const filtered = MILK_DATA.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.srNo.toLowerCase().includes(search.toLowerCase()),
  ).sort((a, b) => {
    if (sortBy === "total")   return (b.morningLiters + b.eveningLiters) - (a.morningLiters + a.eveningLiters);
    if (sortBy === "morning") return b.morningLiters - a.morningLiters;
    if (sortBy === "evening") return b.eveningLiters - a.eveningLiters;
    return a.name.localeCompare(b.name);
  });
=======
  const [milkRows, setMilkRows] = useState<MilkRow[]>([]);
  const [summary, setSummary] = useState<Summary>({
    total_morning: 0,
    total_evening: 0,
    grand_total: 0,
    active_cows: 0,
    total_cows: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<
    "name" | "total" | "morning" | "evening"
  >("name");
  const [modalCow, setModalCow] = useState<MilkRow | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const data = await api.getMilkDashboard(todayStr());
      setSummary(data.summary);
      setMilkRows(
        data.cows.map((c: any) => ({
          id: c.cow_id,
          srNo: c.cow_tag || c.cow_id,
          name: c.cow_name || "Unknown",
          morningLiters: c.morning_liters ?? 0,
          eveningLiters: c.evening_liters ?? 0,
          morningWorker: c.morning_worker ?? null,
          eveningWorker: c.evening_worker ?? null,
          dailyCapacity: c.daily_capacity_liters ?? 0,
          peak: c.peak ?? null,
        })),
      );
    } catch (e) {
      console.log("milk fetch error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAll();
  };

  const handleSetCapacity = (cow: MilkRow) => setModalCow(cow);

  const handleSaveCapacity = async (val: number) => {
    if (!modalCow) return;

    // Snapshot for rollback
    const snapshot = milkRows;

    // 1️⃣ Optimistic update — card shows new capacity instantly
    setMilkRows((prev) =>
      prev.map((row) =>
        row.id === modalCow.id ? { ...row, dailyCapacity: val } : row,
      ),
    );

    // 2️⃣ Close modal right away — feels instant
    setModalCow(null);

    try {
      // 3️⃣ Persist to backend in background
      await api.setCowCapacity(modalCow.id, val);
    } catch (e) {
      // 4️⃣ Revert if API fails
      console.log("capacity save error:", e);
      setMilkRows(snapshot);
    }
  };

  const filtered = milkRows
    .filter(
      (d) =>
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        d.srNo.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) => {
      if (sortBy === "total")
        return (
          b.morningLiters +
          b.eveningLiters -
          (a.morningLiters + a.eveningLiters)
        );
      if (sortBy === "morning") return b.morningLiters - a.morningLiters;
      if (sortBy === "evening") return b.eveningLiters - a.eveningLiters;
      return a.name.localeCompare(b.name);
    });

  // Always read current capacity from live state so modal pre-fills correctly
  const modalCurrentCapacity = modalCow
    ? (milkRows.find((r) => r.id === modalCow.id)?.dailyCapacity ?? 0)
    : 0;
>>>>>>> d0ef3950fe532a7f2ddb13147f25a8b1958d9b5a

  return (
    <SafeAreaView style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

<<<<<<< HEAD
      {/* ── Header ── */}
      <View style={[s.header, { paddingTop: Platform.OS === "ios" ? 0 : (StatusBar.currentHeight ?? 0) }]}>
=======
      {/* Header */}
      <View style={s.header}>
>>>>>>> d0ef3950fe532a7f2ddb13147f25a8b1958d9b5a
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.headerTitle}>Milk Yield</Text>
          <Text style={s.headerSub}>{todayLabel}</Text>
        </View>
        <TouchableOpacity style={s.refreshBtn} onPress={onRefresh}>
          <Ionicons name="refresh-outline" size={18} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color="#16a34a" />
          <Text style={s.loadingText}>Loading milk data...</Text>
        </View>
      ) : (
        <>
          <SummaryBar summary={summary} />

<<<<<<< HEAD
      {/* ── Search ── */}
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={15} color="#9ca3af" />
        <TextInput
          style={s.searchInput}
          placeholder="Search cow name or Sr. No..."
          placeholderTextColor="#d1d5db"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={15} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Sort Chips ── */}
      <View style={s.sortRow}>
        <Text style={s.sortLabel}>Sort by:</Text>
        {(["name", "total", "morning", "evening"] as const).map((opt) => (
          <TouchableOpacity
            key={opt}
            onPress={() => setSortBy(opt)}
            style={[s.sortChip, sortBy === opt && s.sortChipActive]}
          >
            <Text style={[s.sortChipText, sortBy === opt && s.sortChipTextActive]}>
              {opt.charAt(0).toUpperCase() + opt.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── List ── */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => <MilkCard item={item} index={index} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={{ fontSize: 40 }}>🥛</Text>
            <Text style={s.emptyText}>No records found</Text>
=======
          {/* Search */}
          <View style={s.searchWrap}>
            <Ionicons name="search-outline" size={15} color="#9ca3af" />
            <TextInput
              style={s.searchInput}
              placeholder="Search cow name or Sr. No..."
              placeholderTextColor="#d1d5db"
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={15} color="#9ca3af" />
              </TouchableOpacity>
            )}
>>>>>>> d0ef3950fe532a7f2ddb13147f25a8b1958d9b5a
          </View>

          {/* Sort */}
          <View style={s.sortRow}>
            <Text style={s.sortLabel}>Sort:</Text>
            {(["name", "total", "morning", "evening"] as const).map((opt) => (
              <TouchableOpacity
                key={opt}
                onPress={() => setSortBy(opt)}
                style={[s.sortChip, sortBy === opt && s.sortChipActive]}
              >
                <Text
                  style={[
                    s.sortChipText,
                    sortBy === opt && s.sortChipTextActive,
                  ]}
                >
                  {opt.charAt(0).toUpperCase() + opt.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            contentContainerStyle={s.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#16a34a"
              />
            }
            renderItem={({ item, index }) => (
              <MilkCard
                item={item}
                index={index}
                onSetCapacity={handleSetCapacity}
              />
            )}
            ListEmptyComponent={
              <View style={s.empty}>
                <Text style={{ fontSize: 40 }}>🥛</Text>
                <Text style={s.emptyText}>No records found</Text>
              </View>
            }
            ListFooterComponent={<View style={{ height: 100 }} />}
          />
        </>
      )}

      <CapacityModal
        visible={!!modalCow}
        cow={modalCow}
        currentCapacity={modalCurrentCapacity}
        onSave={handleSaveCapacity}
        onClose={() => setModalCow(null)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const ANDROID_STATUS_BAR =
  Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0;

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9fafb" },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: { color: "#6b7280", fontSize: 14, fontWeight: "600" },
  header: {
<<<<<<< HEAD
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f3f4f6",
=======
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingTop: Platform.OS === "android" ? ANDROID_STATUS_BAR + 14 : 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
>>>>>>> d0ef3950fe532a7f2ddb13147f25a8b1958d9b5a
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "#f9fafb", alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "#e5e7eb",
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#111827", letterSpacing: -0.3 },
  headerSub: { fontSize: 12, color: "#9ca3af", fontWeight: "500", marginTop: 1 },
  refreshBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "#f9fafb", alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "#e5e7eb",
  },
  summaryBar: {
    flexDirection: "row", backgroundColor: "#fff",
    paddingHorizontal: 10, paddingVertical: 10, gap: 6,
    borderBottomWidth: 1, borderBottomColor: "#f3f4f6",
  },
  summaryItem: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 12, gap: 3 },
  summaryValue: { fontSize: 13, fontWeight: "800", letterSpacing: -0.3 },
<<<<<<< HEAD
  summaryLabel: { fontSize: 9, color: "#9ca3af", fontWeight: "600", textAlign: "center" },

=======
  summaryLabel: {
    fontSize: 9,
    color: "#9ca3af",
    fontWeight: "600",
    textAlign: "center",
  },
>>>>>>> d0ef3950fe532a7f2ddb13147f25a8b1958d9b5a
  searchWrap: {
    flexDirection: "row", alignItems: "center",
    margin: 14, marginBottom: 8,
    backgroundColor: "#fff", borderRadius: 12,
    borderWidth: 1, borderColor: "#e5e7eb",
    paddingHorizontal: 12, paddingVertical: 10, gap: 8,
  },
  searchInput: { flex: 1, color: "#111827", fontSize: 14 },
  sortRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, gap: 8, marginBottom: 12,
  },
  sortLabel: { fontSize: 12, color: "#9ca3af", fontWeight: "600" },
  sortChip: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb",
  },
  sortChipActive: { backgroundColor: "#111827", borderColor: "#111827" },
  sortChipText: { fontSize: 11, color: "#6b7280", fontWeight: "600" },
  sortChipTextActive: { color: "#fff" },
  listContent: { paddingHorizontal: 14 },
  card: {
    backgroundColor: "#fff", borderRadius: 18, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: "#f3f4f6",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  cardHeader: { flexDirection: "row", alignItems: "center" },
  avatarWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: "#f9fafb", alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "#e5e7eb",
  },
  cowName: { fontSize: 15, fontWeight: "700", color: "#111827", letterSpacing: -0.2 },
  cowSr: { fontSize: 12, color: "#9ca3af", fontWeight: "500", marginTop: 1 },
  totalBadge: {
<<<<<<< HEAD
    alignItems: "center", paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 14, borderWidth: 1, gap: 2,
=======
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    gap: 2,
>>>>>>> d0ef3950fe532a7f2ddb13147f25a8b1958d9b5a
  },
  totalText: { fontSize: 14, fontWeight: "800", letterSpacing: -0.3 },
  totalSub: { fontSize: 9, fontWeight: "600" },
  capacityBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  capacityBtnText: { fontSize: 10, color: "#6b7280", fontWeight: "600" },
  divider: { height: 1, backgroundColor: "#f3f4f6", marginVertical: 12 },
  shiftsRow: { flexDirection: "row", gap: 10 },
  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 15, color: "#9ca3af", fontWeight: "600" },
});

const sh = StyleSheet.create({
  card: { flex: 1, borderRadius: 14, padding: 14, borderWidth: 1 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  iconWrap: { width: 24, height: 24, borderRadius: 7, alignItems: "center", justifyContent: "center" },
  sessionLabel: { fontSize: 12, fontWeight: "700", flex: 1 },
  liters: { fontSize: 26, fontWeight: "800", letterSpacing: -0.5 },
  unit: { fontSize: 12, fontWeight: "600", marginTop: 1 },
  workerName: { fontSize: 10, fontWeight: "600", marginTop: 4 },
  nilTag: {
    marginTop: 6, alignSelf: "flex-start",
    backgroundColor: "#f3f4f6", borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
    fontSize: 10, fontWeight: "700", color: "#9ca3af", overflow: "hidden",
  },
<<<<<<< HEAD
});
=======
});

const cap = StyleSheet.create({
  wrap: { marginTop: 12, marginBottom: 4 },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  title: { fontSize: 11, color: "#6b7280", fontWeight: "600" },
  pctText: { fontSize: 11, fontWeight: "700" },
  track: { height: 7, borderRadius: 6, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 6 },
  status: { fontSize: 10, fontWeight: "700", marginTop: 4 },
});

const pk = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 8,
    backgroundColor: "#fef3c7",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  text: { fontSize: 11, color: "#92400e", fontWeight: "600" },
  val: { fontWeight: "800", color: "#b45309" },
});

const md = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === "ios" ? 40 : 28,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: "#e5e7eb",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  title: { fontSize: 18, fontWeight: "800", color: "#111827", marginBottom: 4 },
  sub: { fontSize: 13, color: "#6b7280", fontWeight: "600", marginBottom: 8 },
  hint: { fontSize: 12, color: "#9ca3af", marginBottom: 20, lineHeight: 18 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#f9fafb",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 20,
  },
  input: { flex: 1, fontSize: 24, fontWeight: "800", color: "#111827" },
  unit: { fontSize: 14, color: "#9ca3af", fontWeight: "600" },
  btnRow: { flexDirection: "row", gap: 12 },
  cancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#f9fafb",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  cancelText: { fontSize: 14, fontWeight: "700", color: "#6b7280" },
  save: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#111827",
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  saveText: { fontSize: 14, fontWeight: "700", color: "#fff" },
});
>>>>>>> d0ef3950fe532a7f2ddb13147f25a8b1958d9b5a
