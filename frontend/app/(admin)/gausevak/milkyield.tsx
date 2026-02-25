import React, { useState, useRef } from "react";
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
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

// ─── Data ─────────────────────────────────────────────────────────────────────
const MILK_DATA = [
  {
    id: "1",
    srNo: "GS-001",
    name: "Kamdhenu",
    morningLiters: 9.5,
    eveningLiters: 8.5,
  },
  {
    id: "2",
    srNo: "GS-002",
    name: "Nandini",
    morningLiters: 7.0,
    eveningLiters: 7.0,
  },
  {
    id: "3",
    srNo: "GS-003",
    name: "Ganga",
    morningLiters: 4.0,
    eveningLiters: 4.0,
  },
  {
    id: "4",
    srNo: "GS-004",
    name: "Saraswati",
    morningLiters: 0,
    eveningLiters: 0,
  },
  {
    id: "5",
    srNo: "GS-005",
    name: "Lakshmi",
    morningLiters: 12.0,
    eveningLiters: 10.0,
  },
  {
    id: "6",
    srNo: "GS-006",
    name: "Durga",
    morningLiters: 0,
    eveningLiters: 0,
  },
  {
    id: "7",
    srNo: "GS-007",
    name: "Parvati",
    morningLiters: 8.5,
    eveningLiters: 7.5,
  },
  {
    id: "8",
    srNo: "GS-008",
    name: "Radha",
    morningLiters: 2.5,
    eveningLiters: 3.0,
  },
];

const today = new Date().toLocaleDateString("en-IN", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

// ─── Shift Card ───────────────────────────────────────────────────────────────
function ShiftCard({
  session,
  liters,
}: {
  session: "Morning" | "Evening";
  liters: number;
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
      {isEmpty && <Text style={sh.nilTag}>NIL</Text>}
    </View>
  );
}

// ─── Milk Yield Card ──────────────────────────────────────────────────────────
function MilkCard({
  item,
  index,
}: {
  item: (typeof MILK_DATA)[0];
  index: number;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        delay: index * 60,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        delay: index * 60,
        tension: 70,
        friction: 12,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const total = item.morningLiters + item.eveningLiters;
  const isHighYield = total >= 15;
  const isNil = total === 0;

  const totalColor = isNil ? "#9ca3af" : isHighYield ? "#16a34a" : "#2563eb";
  const totalBg = isNil ? "#f9fafb" : isHighYield ? "#f0fdf4" : "#eff6ff";
  const totalBorder = isNil ? "#e5e7eb" : isHighYield ? "#86efac" : "#bfdbfe";

  return (
    <Animated.View style={[s.card, { opacity, transform: [{ translateY }] }]}>
      {/* Header Row */}
      <View style={s.cardHeader}>
        <View style={s.avatarWrap}>
          <Text style={{ fontSize: 22 }}>🐄</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={s.cowName}>{item.name}</Text>
          <Text style={s.cowSr}>{item.srNo}</Text>
        </View>

        {/* Total badge */}
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
          <Text style={[s.totalSub, { color: totalColor + "88" }]}>Total</Text>
        </View>
      </View>

      {/* Divider */}
      <View style={s.divider} />

      {/* Shift Cards */}
      <View style={s.shiftsRow}>
        <ShiftCard session="Morning" liters={item.morningLiters} />
        <ShiftCard session="Evening" liters={item.eveningLiters} />
      </View>
    </Animated.View>
  );
}

// ─── Summary Bar ──────────────────────────────────────────────────────────────
function SummaryBar({ data }: { data: typeof MILK_DATA }) {
  const totalMorning = data.reduce((acc, d) => acc + d.morningLiters, 0);
  const totalEvening = data.reduce((acc, d) => acc + d.eveningLiters, 0);
  const grandTotal = totalMorning + totalEvening;
  const activeCows = data.filter(
    (d) => d.morningLiters + d.eveningLiters > 0,
  ).length;

  return (
    <View style={s.summaryBar}>
      {[
        {
          label: "Morning Total",
          value: `${totalMorning.toFixed(1)} L`,
          color: "#d97706",
          bg: "#fffbeb",
          icon: "sunny",
        },
        {
          label: "Evening Total",
          value: `${totalEvening.toFixed(1)} L`,
          color: "#6366f1",
          bg: "#eef2ff",
          icon: "moon",
        },
        {
          label: "Grand Total",
          value: `${grandTotal.toFixed(1)} L`,
          color: "#16a34a",
          bg: "#f0fdf4",
          icon: "water",
        },
        {
          label: "Active Cows",
          value: `${activeCows}`,
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

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function MilkYieldScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<
    "name" | "total" | "morning" | "evening"
  >("name");

  const filtered = MILK_DATA.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.srNo.toLowerCase().includes(search.toLowerCase()),
  ).sort((a, b) => {
    if (sortBy === "total")
      return (
        b.morningLiters + b.eveningLiters - (a.morningLiters + a.eveningLiters)
      );
    if (sortBy === "morning") return b.morningLiters - a.morningLiters;
    if (sortBy === "evening") return b.eveningLiters - a.eveningLiters;
    return a.name.localeCompare(b.name);
  });

  return (
    <SafeAreaView style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── Header ── */}
      <View
        style={[
          s.header,
          {
            paddingTop:
              Platform.OS === "ios" ? 0 : (StatusBar.currentHeight ?? 0),
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.headerTitle}>Milk Yield</Text>
          <Text style={s.headerSub}>{today}</Text>
        </View>
        <TouchableOpacity style={s.refreshBtn}>
          <Ionicons name="refresh-outline" size={18} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {/* ── Summary ── */}
      <SummaryBar data={MILK_DATA} />

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
            <Text
              style={[s.sortChipText, sortBy === opt && s.sortChipTextActive]}
            >
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
          </View>
        }
        ListFooterComponent={<View style={{ height: 100 }} />}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9fafb" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
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
    width: 36,
    height: 36,
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
    marginBottom: 12,
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

  listContent: { paddingHorizontal: 14 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
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
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#f9fafb",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  cowName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: -0.2,
  },
  cowSr: { fontSize: 12, color: "#9ca3af", fontWeight: "500", marginTop: 1 },
  totalBadge: {
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    gap: 2,
  },
  totalText: { fontSize: 14, fontWeight: "800", letterSpacing: -0.3 },
  totalSub: { fontSize: 9, fontWeight: "600" },
  divider: { height: 1, backgroundColor: "#f3f4f6", marginVertical: 12 },
  shiftsRow: { flexDirection: "row", gap: 10 },

  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 15, color: "#9ca3af", fontWeight: "600" },
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
