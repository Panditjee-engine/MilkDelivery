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
const FEED_DATA = [
  {
    id: "1",
    srNo: "GS-001",
    name: "Kamdhenu",
    morning: "fed",
    evening: "fed",
    morningNote: "5 kg dry fodder",
    eveningNote: "4 kg green grass",
  },
  {
    id: "2",
    srNo: "GS-002",
    name: "Nandini",
    morning: "fed",
    evening: "pending",
    morningNote: "4 kg silage",
    eveningNote: "—",
  },
  {
    id: "3",
    srNo: "GS-003",
    name: "Ganga",
    morning: "missed",
    evening: "pending",
    morningNote: "—",
    eveningNote: "—",
  },
  {
    id: "4",
    srNo: "GS-004",
    name: "Saraswati",
    morning: "fed",
    evening: "fed",
    morningNote: "3 kg concentrates",
    eveningNote: "5 kg dry fodder",
  },
  {
    id: "5",
    srNo: "GS-005",
    name: "Lakshmi",
    morning: "fed",
    evening: "pending",
    morningNote: "6 kg green grass",
    eveningNote: "—",
  },
  {
    id: "6",
    srNo: "GS-006",
    name: "Durga",
    morning: "missed",
    evening: "missed",
    morningNote: "—",
    eveningNote: "—",
  },
  {
    id: "7",
    srNo: "GS-007",
    name: "Parvati",
    morning: "fed",
    evening: "fed",
    morningNote: "4 kg silage",
    eveningNote: "3 kg concentrates",
  },
  {
    id: "8",
    srNo: "GS-008",
    name: "Radha",
    morning: "fed",
    evening: "pending",
    morningNote: "5 kg dry fodder",
    eveningNote: "—",
  },
];

type FeedStatus = "fed" | "pending" | "missed";

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
    color: "#d97706",
    bg: "#fffbeb",
    border: "#fcd34d",
    icon: "time",
    label: "Pending",
  },
  missed: {
    color: "#dc2626",
    bg: "#fff1f2",
    border: "#fecdd3",
    icon: "close-circle",
    label: "Missed",
  },
};

const FILTERS = ["All", "Fed", "Pending", "Missed"];

// ─── Feed Status Badge ────────────────────────────────────────────────────────
function FeedBadge({
  status,
  note,
  session,
}: {
  status: FeedStatus;
  note: string;
  session: string;
}) {
  const cfg = STATUS_CFG[status];
  return (
    <View
      style={[
        s.sessionCard,
        { backgroundColor: cfg.bg, borderColor: cfg.border },
      ]}
    >
      <View style={s.sessionTop}>
        <View style={s.sessionIconWrap}>
          <Ionicons
            name={session === "Morning" ? "sunny" : "moon"}
            size={13}
            color={session === "Morning" ? "#d97706" : "#6366f1"}
          />
        </View>
        <Text style={s.sessionLabel}>{session}</Text>
        <View style={[s.statusDot, { backgroundColor: cfg.color }]} />
      </View>
      <View style={s.sessionBottom}>
        <Ionicons name={cfg.icon as any} size={16} color={cfg.color} />
        <Text style={[s.statusLabel, { color: cfg.color }]}>{cfg.label}</Text>
      </View>
      {note !== "—" && (
        <Text style={s.noteText} numberOfLines={1}>
          {note}
        </Text>
      )}
    </View>
  );
}

// ─── Feed Card ────────────────────────────────────────────────────────────────
function FeedCard({
  item,
  index,
}: {
  item: (typeof FEED_DATA)[0];
  index: number;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        delay: index * 55,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        delay: index * 55,
        tension: 70,
        friction: 12,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const morningCfg = STATUS_CFG[item.morning as FeedStatus];
  const eveningCfg = STATUS_CFG[item.evening as FeedStatus];

  const bothFed = item.morning === "fed" && item.evening === "fed";
  const anyMissed = item.morning === "missed" || item.evening === "missed";

  const overallColor = anyMissed ? "#dc2626" : bothFed ? "#16a34a" : "#d97706";
  const overallBg = anyMissed ? "#fff1f2" : bothFed ? "#f0fdf4" : "#fffbeb";
  const overallBorder = anyMissed ? "#fecdd3" : bothFed ? "#86efac" : "#fcd34d";
  const overallLabel = anyMissed
    ? "Needs Attention"
    : bothFed
      ? "Fully Fed"
      : "Partially Fed";

  return (
    <Animated.View style={[s.card, { opacity, transform: [{ translateY }] }]}>
      {/* Card Header */}
      <View style={s.cardHeader}>
        <View style={s.cowAvatarWrap}>
          <Text style={{ fontSize: 22 }}>🐄</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={s.cowName}>{item.name}</Text>
          <Text style={s.cowSr}>{item.srNo}</Text>
        </View>
        <View
          style={[
            s.overallBadge,
            { backgroundColor: overallBg, borderColor: overallBorder },
          ]}
        >
          <View style={[s.overallDot, { backgroundColor: overallColor }]} />
          <Text style={[s.overallText, { color: overallColor }]}>
            {overallLabel}
          </Text>
        </View>
      </View>

      {/* Divider */}
      <View style={s.divider} />

      {/* Session cards */}
      <View style={s.sessionsRow}>
        <FeedBadge
          status={item.morning as FeedStatus}
          note={item.morningNote}
          session="Morning"
        />
        <FeedBadge
          status={item.evening as FeedStatus}
          note={item.eveningNote}
          session="Evening"
        />
      </View>
    </Animated.View>
  );
}

// ─── Summary Strip ────────────────────────────────────────────────────────────
function SummaryStrip({ data }: { data: typeof FEED_DATA }) {
  const allFed = data.filter(
    (d) => d.morning === "fed" && d.evening === "fed",
  ).length;
  const partial = data.filter(
    (d) =>
      (d.morning === "fed" || d.evening === "fed") &&
      !(d.morning === "fed" && d.evening === "fed"),
  ).length;
  const missed = data.filter(
    (d) => d.morning === "missed" || d.evening === "missed",
  ).length;

  return (
    <View style={s.summary}>
      {[
        {
          label: "Fully Fed",
          value: allFed,
          color: "#16a34a",
          bg: "#f0fdf4",
          icon: "checkmark-circle",
        },
        {
          label: "Partial",
          value: partial,
          color: "#d97706",
          bg: "#fffbeb",
          icon: "time",
        },
        {
          label: "Missed",
          value: missed,
          color: "#dc2626",
          bg: "#fff1f2",
          icon: "close-circle",
        },
        {
          label: "Total",
          value: data.length,
          color: "#2563eb",
          bg: "#eff6ff",
          icon: "list",
        },
      ].map((st, i) => (
        <View key={i} style={[s.summaryItem, { backgroundColor: st.bg }]}>
          <Ionicons name={st.icon as any} size={16} color={st.color} />
          <Text style={[s.summaryValue, { color: st.color }]}>{st.value}</Text>
          <Text style={s.summaryLabel}>{st.label}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function FeedScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const filtered = FEED_DATA.filter((d) => {
    const matchSearch =
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.srNo.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      activeFilter === "All" ||
      (activeFilter === "Fed" && d.morning === "fed" && d.evening === "fed") ||
      (activeFilter === "Missed" &&
        (d.morning === "missed" || d.evening === "missed")) ||
      (activeFilter === "Pending" &&
        (d.morning === "pending" || d.evening === "pending"));
    return matchSearch && matchFilter;
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
          <Text style={s.headerTitle}>Feed Status</Text>
          <Text style={s.headerSub}>{today}</Text>
        </View>
        <TouchableOpacity style={s.refreshBtn}>
          <Ionicons name="refresh-outline" size={18} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {/* ── Summary ── */}
      <SummaryStrip data={FEED_DATA} />

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

      {/* ── Filters ── */}
      <View style={s.filterRow}>
        {FILTERS.map((f) => {
          const active = activeFilter === f;
          return (
            <TouchableOpacity
              key={f}
              onPress={() => setActiveFilter(f)}
              style={[s.filterChip, active && s.filterChipActive]}
            >
              <Text style={[s.filterText, active && s.filterTextActive]}>
                {f}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── List ── */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => <FeedCard item={item} index={index} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={{ fontSize: 40 }}>🌾</Text>
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

  // Summary
  summary: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
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
  summaryValue: { fontSize: 17, fontWeight: "800", letterSpacing: -0.3 },
  summaryLabel: {
    fontSize: 9,
    color: "#9ca3af",
    fontWeight: "600",
    textAlign: "center",
  },

  // Search
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

  // Filters
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 14,
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  filterChipActive: { backgroundColor: "#111827", borderColor: "#111827" },
  filterText: { fontSize: 12, color: "#6b7280", fontWeight: "600" },
  filterTextActive: { color: "#fff" },

  listContent: { paddingHorizontal: 14 },

  // Card
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
  cowAvatarWrap: {
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
  overallBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  overallDot: { width: 6, height: 6, borderRadius: 3 },
  overallText: { fontSize: 11, fontWeight: "700" },
  divider: { height: 1, backgroundColor: "#f3f4f6", marginVertical: 12 },

  // Sessions
  sessionsRow: { flexDirection: "row", gap: 10 },
  sessionCard: { flex: 1, borderRadius: 12, padding: 12, borderWidth: 1 },
  sessionTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 8,
  },
  sessionIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: "rgba(0,0,0,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  sessionLabel: { flex: 1, fontSize: 11, fontWeight: "700", color: "#374151" },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  sessionBottom: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 4,
  },
  statusLabel: { fontSize: 13, fontWeight: "700" },
  noteText: { fontSize: 11, color: "#6b7280", fontWeight: "500", marginTop: 2 },

  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 15, color: "#9ca3af", fontWeight: "600" },
});
