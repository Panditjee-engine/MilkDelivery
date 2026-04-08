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
  ActivityIndicator,
  RefreshControl,
  Modal,
  KeyboardAvoidingView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../../src/services/api";

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
  // ✅ FIX 1 & 2: track type and milkActive so we can filter them out
  cowType: string;
  milkActive: boolean;
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
  const border = isEmpty ? "#e5e7eb" : isMorning ? "#fcd34d" : "#c7d2fe";
  const icon = isMorning ? "sunny" : "moon";

  return (
    <View style={[sh.card, { backgroundColor: bg, borderColor: border }]}>
      <View style={sh.topRow}>
        <View
          style={[
            sh.iconWrap,
            { backgroundColor: isEmpty ? "#f3f4f6" : color + "20" },
          ]}
        >
          <Ionicons
            name={icon as any}
            size={14}
            color={isEmpty ? "#d1d5db" : color}
          />
        </View>
        <Text style={[sh.sessionLabel, { color: isEmpty ? "#9ca3af" : color }]}>
          {session}
        </Text>
      </View>
      <Text style={[sh.liters, { color: isEmpty ? "#d1d5db" : color }]}>
        {isEmpty ? "0.0" : liters.toFixed(1)}
      </Text>
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
      {isEmpty && <Text style={sh.nilTag}>NIL</Text>}
    </View>
  );
}

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

// ─── MilkCard — collapsible ───────────────────────────────────────────────────
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
  const translateY = useRef(new Animated.Value(16)).current;
  // ✅ NEW: collapsed by default, tap to expand for full details
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        delay: index * 50,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        delay: index * 50,
        tension: 70,
        friction: 12,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const total = item.morningLiters + item.eveningLiters;
  const isHighYield = total >= 15;
  const isNil = total === 0;
  const capacity = item.dailyCapacity ?? 0;
  const peak = item.peak ?? null;

  const totalColor = isNil ? "#9ca3af" : isHighYield ? "#16a34a" : "#2563eb";
  const totalBg = isNil ? "#f9fafb" : isHighYield ? "#f0fdf4" : "#eff6ff";
  const totalBorder = isNil ? "#e5e7eb" : isHighYield ? "#86efac" : "#bfdbfe";

  return (
    <Animated.View style={[s.card, { opacity, transform: [{ translateY }] }]}>
      {/* ── Collapsed row — always visible ── */}
      <TouchableOpacity
        onPress={() => setExpanded((e) => !e)}
        activeOpacity={0.8}
        style={s.cardHeader}
      >
        <View style={s.avatarWrap}>
          <Text style={{ fontSize: 22 }}>🐄</Text>
        </View>

        {/* Name + Sr */}
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={s.cowName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={s.cowSr}>{item.srNo}</Text>
        </View>

        {/* Shift mini pills */}
        <View style={s.miniShifts}>
          <View
            style={[
              s.miniPill,
              { backgroundColor: "#fffbeb", borderColor: "#fcd34d" },
            ]}
          >
            <Ionicons name="sunny" size={10} color="#d97706" />
            <Text style={[s.miniPillText, { color: "#d97706" }]}>
              {item.morningLiters.toFixed(1)}L
            </Text>
          </View>
          <View
            style={[
              s.miniPill,
              { backgroundColor: "#eef2ff", borderColor: "#c7d2fe" },
            ]}
          >
            <Ionicons name="moon" size={10} color="#6366f1" />
            <Text style={[s.miniPillText, { color: "#6366f1" }]}>
              {item.eveningLiters.toFixed(1)}L
            </Text>
          </View>
        </View>

        {/* Total badge */}
        <View
          style={[
            s.totalBadge,
            {
              backgroundColor: totalBg,
              borderColor: totalBorder,
              marginLeft: 8,
            },
          ]}
        >
          <Ionicons name="water" size={12} color={totalColor} />
          <Text style={[s.totalText, { color: totalColor }]}>
            {total.toFixed(1)} L
          </Text>
        </View>

        {/* Expand chevron */}
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={16}
          color="#9ca3af"
          style={{ marginLeft: 6 }}
        />
      </TouchableOpacity>

      {/* ── Expanded details ── */}
      {expanded && (
        <>
          <View style={s.divider} />

          {/* Capacity button */}
          <TouchableOpacity
            style={s.capacityBtn}
            onPress={() => onSetCapacity(item)}
          >
            <Ionicons name="settings-outline" size={11} color="#6b7280" />
            <Text style={s.capacityBtnText}>
              {capacity > 0
                ? `${capacity.toFixed(0)}L daily cap`
                : "Set daily capacity"}
            </Text>
          </TouchableOpacity>

          {/* Capacity progress bar */}
          {capacity > 0 && <CapacityBar total={total} capacity={capacity} />}

          {/* Peak badge */}
          {peak && <PeakBadge peak={peak} />}

          <View style={s.divider} />

          {/* Shift cards */}
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
        </>
      )}
    </Animated.View>
  );
}

// ─── SummaryBar ───────────────────────────────────────────────────────────────
function SummaryBar({ summary }: { summary: Summary }) {
  return (
    <View style={s.summaryBar}>
      {[
        {
          label: "Morning",
          value: `${summary.total_morning.toFixed(1)} L`,
          color: "#d97706",
          bg: "#fffbeb",
          icon: "sunny",
        },
        {
          label: "Evening",
          value: `${summary.total_evening.toFixed(1)} L`,
          color: "#6366f1",
          bg: "#eef2ff",
          icon: "moon",
        },
        {
          label: "Total",
          value: `${summary.grand_total.toFixed(1)} L`,
          color: "#16a34a",
          bg: "#f0fdf4",
          icon: "water",
        },
        {
          label: "Active",
          value: `${summary.active_cows}`,
          color: "#2563eb",
          bg: "#eff6ff",
          icon: "paw",
        },
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

// ─── Auto-refresh indicator ───────────────────────────────────────────────────
function AutoRefreshDot({ active }: { active: boolean }) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!active) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [active]);

  return (
    <View style={ar.wrap}>
      <Animated.View
        style={[
          ar.dot,
          { opacity: pulse, backgroundColor: active ? "#16a34a" : "#d1d5db" },
        ]}
      />
      <Text style={[ar.label, { color: active ? "#16a34a" : "#9ca3af" }]}>
        {active ? "Live" : "Paused"}
      </Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function MilkYieldScreen() {
  const router = useRouter();
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
  >("total");
  const [modalCow, setModalCow] = useState<MilkRow | null>(null);

  // ✅ NEW: auto-refresh every 2 seconds
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [autoRefreshActive, setAutoRefreshActive] = useState(true);
  const isMountedRef = useRef(true);

  const fetchAll = useCallback(async (silent = false) => {
    if (!isMountedRef.current) return;
    try {
      if (!silent) setLoading(true);
      const data = await api.getMilkDashboard(todayStr());
      if (!isMountedRef.current) return;

      // ✅ FIX 1 & 2: filter out bulls AND milk-inactive cows
      const filtered = data.cows.filter(
        (c: any) => c.cow_type !== "bull" && c.milk_active !== false,
      );

      setSummary(data.summary);
      setMilkRows(
        filtered.map((c: any) => ({
          id: c.cow_id,
          srNo: c.cow_tag || c.cow_id,
          name: c.cow_name || "Unknown",
          morningLiters: c.morning_liters ?? 0,
          eveningLiters: c.evening_liters ?? 0,
          morningWorker: c.morning_worker ?? null,
          eveningWorker: c.evening_worker ?? null,
          dailyCapacity: c.daily_capacity_liters ?? 0,
          peak: c.peak ?? null,
          cowType: c.cow_type ?? "mature",
          milkActive: c.milk_active ?? true,
        })),
      );
    } catch (e) {
      // silent fail on background refresh
      if (!silent) console.log("milk fetch error:", e);
    } finally {
      if (!silent && isMountedRef.current) setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchAll(false);
  }, []);

  // ✅ Auto-refresh every 2 seconds
  useEffect(() => {
    isMountedRef.current = true;

    if (autoRefreshActive) {
      autoRefreshRef.current = setInterval(() => {
        fetchAll(true); // silent = true so no loading spinner flicker
      }, 2000);
    }

    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    };
  }, [autoRefreshActive, fetchAll]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAll(false).finally(() => setRefreshing(false));
  };

  const handleSetCapacity = (cow: MilkRow) => setModalCow(cow);

  const handleSaveCapacity = async (val: number) => {
    if (!modalCow) return;
    const snapshot = milkRows;

    setMilkRows((prev) =>
      prev.map((row) =>
        row.id === modalCow.id ? { ...row, dailyCapacity: val } : row,
      ),
    );
    setModalCow(null);

    try {
      await api.setCowCapacity(modalCow.id, val);
    } catch (e) {
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

  const modalCurrentCapacity = modalCow
    ? (milkRows.find((r) => r.id === modalCow.id)?.dailyCapacity ?? 0)
    : 0;

  return (
    <SafeAreaView style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.headerTitle}>Milk Yield</Text>
          <Text style={s.headerSub}>{todayLabel}</Text>
        </View>
        {/* ✅ Auto-refresh toggle */}
        <TouchableOpacity
          onPress={() => setAutoRefreshActive((a) => !a)}
          style={s.refreshBtn}
        >
          <AutoRefreshDot active={autoRefreshActive} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.refreshBtn, { marginLeft: 8 }]}
          onPress={onRefresh}
        >
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

          {/* Search */}
          <View style={s.searchWrap}>
            <Ionicons name="search-outline" size={15} color="#9ca3af" />
            <TextInput
              style={s.searchInput}
              placeholder="Search cow name or tag..."
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

          {/* Sort + count */}
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
            <Text style={s.cowCount}>{filtered.length} cows</Text>
          </View>

          {/* ✅ Hint: tap to expand */}
          {filtered.length > 0 && (
            <Text style={s.expandHint}>Tap a card to see full details</Text>
          )}

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
                <Text style={s.emptyText}>
                  {milkRows.length === 0
                    ? "No milk-active cows found.\nEnable milk recording in cattle settings."
                    : "No records match your search."}
                </Text>
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
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingTop: Platform.OS === "android" ? ANDROID_STATUS_BAR + 14 : 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f9fafb",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 12,
    color: "#9ca3af",
    fontWeight: "500",
    marginTop: 1,
  },
  refreshBtn: {
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 18,
    backgroundColor: "#f9fafb",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  summaryBar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 12,
    gap: 3,
  },
  summaryValue: { fontSize: 13, fontWeight: "800", letterSpacing: -0.3 },
  summaryLabel: {
    fontSize: 9,
    color: "#9ca3af",
    fontWeight: "600",
    textAlign: "center",
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    margin: 14,
    marginBottom: 8,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: { flex: 1, color: "#111827", fontSize: 14 },
  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 8,
    marginBottom: 6,
  },
  sortLabel: { fontSize: 12, color: "#9ca3af", fontWeight: "600" },
  sortChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  sortChipActive: { backgroundColor: "#111827", borderColor: "#111827" },
  sortChipText: { fontSize: 11, color: "#6b7280", fontWeight: "600" },
  sortChipTextActive: { color: "#fff" },
  cowCount: {
    marginLeft: "auto",
    fontSize: 11,
    color: "#9ca3af",
    fontWeight: "600",
  },
  expandHint: {
    fontSize: 11,
    color: "#9ca3af",
    fontWeight: "500",
    textAlign: "center",
    marginBottom: 8,
  },
  listContent: { paddingHorizontal: 14, paddingTop: 4 },

  // ── Card ──
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: { flexDirection: "row", alignItems: "center" },
  avatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#f9fafb",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  cowName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: -0.2,
  },
  cowSr: { fontSize: 11, color: "#9ca3af", fontWeight: "500", marginTop: 1 },

  // ── Mini shift pills (collapsed view) ──
  miniShifts: { flexDirection: "row", gap: 4, marginLeft: 4 },
  miniPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  miniPillText: { fontSize: 11, fontWeight: "700" },

  // ── Total badge ──
  totalBadge: {
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    gap: 2,
  },
  totalText: { fontSize: 13, fontWeight: "800", letterSpacing: -0.3 },

  // ── Capacity button ──
  capacityBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignSelf: "flex-start",
    marginBottom: 10,
  },
  capacityBtnText: { fontSize: 11, color: "#6b7280", fontWeight: "600" },

  divider: { height: 1, backgroundColor: "#f3f4f6", marginVertical: 12 },
  shiftsRow: { flexDirection: "row", gap: 10 },
  empty: {
    alignItems: "center",
    paddingTop: 60,
    gap: 10,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 14,
    color: "#9ca3af",
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 20,
  },
});

const sh = StyleSheet.create({
  card: { flex: 1, borderRadius: 14, padding: 14, borderWidth: 1 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  iconWrap: {
    width: 24,
    height: 24,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  sessionLabel: { fontSize: 12, fontWeight: "700", flex: 1 },
  liters: { fontSize: 26, fontWeight: "800", letterSpacing: -0.5 },
  unit: { fontSize: 12, fontWeight: "600", marginTop: 1 },
  workerName: { fontSize: 10, fontWeight: "600", marginTop: 4 },
  nilTag: {
    marginTop: 6,
    alignSelf: "flex-start",
    backgroundColor: "#f3f4f6",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontSize: 10,
    fontWeight: "700",
    color: "#9ca3af",
    overflow: "hidden",
  },
});

const cap = StyleSheet.create({
  wrap: { marginTop: 0, marginBottom: 4 },
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

const ar = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { fontSize: 10, fontWeight: "700" },
});
