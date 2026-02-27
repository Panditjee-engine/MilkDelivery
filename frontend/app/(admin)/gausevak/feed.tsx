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
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../../../src/services/api";

type FeedStatus = "fed" | "pending";
type Shift = "morning" | "evening";

interface CowFeedRow {
  id: string;
  srNo: string;
  name: string;
  breed: string;
  morning: FeedStatus;
  evening: FeedStatus;
  morningNote: string;
  eveningNote: string;
}

interface Summary {
  total: number;
  both_fed: number;
  morning_fed: number;
  evening_fed: number;
  not_fed_at_all: number;
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function mapToCowRows(cows: any[]): CowFeedRow[] {
  return cows.map((c) => ({
    id: c.cow_id,
    srNo: c.cow_tag || c.cow_id,
    name: c.cow_name || "Unknown",
    breed: c.breed || "",
    morning: c.morning_fed ? "fed" : "pending",
    evening: c.evening_fed ? "fed" : "pending",
    morningNote: c.morning_worker ? `By ${c.morning_worker}` : "—",
    eveningNote: c.evening_worker ? `By ${c.evening_worker}` : "—",
  }));
}

const STATUS_CFG: Record<
  FeedStatus,
  {
    color: string;
    bg: string;
    border: string;
    icon: string;
    label: string;
  }
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
};

const FILTERS = ["All", "Both Fed", "Pending"] as const;

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

function FeedCard({
  item,
  index,
  activeShift,
}: {
  item: CowFeedRow;
  index: number;
  activeShift: Shift | "both";
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 280,
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

  const bothFed = item.morning === "fed" && item.evening === "fed";
  const shiftStatus =
    activeShift === "morning"
      ? item.morning
      : activeShift === "evening"
        ? item.evening
        : bothFed
          ? "fed"
          : "pending";

  const overallColor = shiftStatus === "fed" ? "#16a34a" : "#d97706";
  const overallBg = shiftStatus === "fed" ? "#f0fdf4" : "#fffbeb";
  const overallBorder = shiftStatus === "fed" ? "#86efac" : "#fcd34d";
  const overallLabel =
    activeShift !== "both"
      ? shiftStatus === "fed"
        ? "Fed"
        : "Pending"
      : bothFed
        ? "Fully Fed"
        : "Partially Fed";

  return (
    <Animated.View style={[s.card, { opacity, transform: [{ translateY }] }]}>
      <View style={s.cardHeader}>
        <View style={s.cowAvatarWrap}>
          <Text style={{ fontSize: 22 }}>🐄</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={s.cowName}>{item.name}</Text>
          <Text style={s.cowSr}>
            {item.srNo}
            {item.breed ? ` · ${item.breed}` : ""}
          </Text>
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

      <View style={s.divider} />

      <View style={s.sessionsRow}>
        {(activeShift === "both" || activeShift === "morning") && (
          <FeedBadge
            status={item.morning}
            note={item.morningNote}
            session="Morning"
          />
        )}
        {(activeShift === "both" || activeShift === "evening") && (
          <FeedBadge
            status={item.evening}
            note={item.eveningNote}
            session="Evening"
          />
        )}
      </View>
    </Animated.View>
  );
}

function SummaryStrip({
  summary,
  activeShift,
}: {
  summary: Summary;
  activeShift: Shift | "both";
}) {
  const fedCount =
    activeShift === "morning"
      ? summary.morning_fed
      : activeShift === "evening"
        ? summary.evening_fed
        : summary.both_fed;
  const fedLabel = activeShift === "both" ? "Both Fed" : "Fed";
  const pending = summary.total - fedCount;

  return (
    <View style={s.summary}>
      {[
        {
          label: fedLabel,
          value: fedCount,
          color: "#16a34a",
          bg: "#f0fdf4",
          icon: "checkmark-circle",
        },
        {
          label: "Pending",
          value: pending,
          color: "#d97706",
          bg: "#fffbeb",
          icon: "time",
        },
        {
          label: "No Feed",
          value: summary.not_fed_at_all,
          color: "#dc2626",
          bg: "#fff1f2",
          icon: "close-circle",
        },
        {
          label: "Total",
          value: summary.total,
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

function ShiftToggle({
  active,
  onChange,
}: {
  active: Shift | "both";
  onChange: (s: Shift | "both") => void;
}) {
  const options: { key: Shift | "both"; label: string; icon: string }[] = [
    { key: "both", label: "Both", icon: "grid-outline" },
    { key: "morning", label: "Morning", icon: "sunny-outline" },
    { key: "evening", label: "Evening", icon: "moon-outline" },
  ];
  return (
    <View style={s.shiftToggle}>
      {options.map((o) => {
        const isActive = active === o.key;
        return (
          <TouchableOpacity
            key={o.key}
            style={[s.shiftBtn, isActive && s.shiftBtnActive]}
            onPress={() => onChange(o.key)}
          >
            <Ionicons
              name={o.icon as any}
              size={14}
              color={isActive ? "#fff" : "#6b7280"}
            />
            <Text style={[s.shiftBtnText, isActive && s.shiftBtnTextActive]}>
              {o.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function AdminFeedScreen() {
  const router = useRouter();
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const [cowRows, setCowRows] = useState<CowFeedRow[]>([]);
  const [summary, setSummary] = useState<Summary>({
    total: 0,
    both_fed: 0,
    morning_fed: 0,
    evening_fed: 0,
    not_fed_at_all: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeShift, setActiveShift] = useState<Shift | "both">("both");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] =
    useState<(typeof FILTERS)[number]>("All");

  const fetchAll = useCallback(
    async (shift?: Shift) => {
      try {
        const authToken = await AsyncStorage.getItem("access_token");

        if (!authToken) {
          console.log("No admin token in AsyncStorage");
          setLoading(false);
          return;
        }
        api.setToken(authToken);

        const params = new URLSearchParams();
        params.append("date", todayStr());
        if (shift) params.append("shift", shift);

        const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "";
        const url = `${BASE_URL}/api/admin/feed?${params.toString()}`;

        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`, 
          },
        });

        if (!response.ok) {
          const err = await response
            .json()
            .catch(() => ({ detail: "Request failed" }));
          throw new Error(err.detail || "Request failed");
        }

        const data = await response.json();
        setSummary(data.summary);
        setCowRows(mapToCowRows(data.cows));
      } catch (e) {
        console.log("admin feed fetch error:", e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeShift],
  );

  useEffect(() => {
    const shift = activeShift === "both" ? undefined : activeShift;
    fetchAll(shift);
  }, [activeShift]);

  const onRefresh = () => {
    setRefreshing(true);
    const shift = activeShift === "both" ? undefined : activeShift;
    fetchAll(shift);
  };

  const filtered = cowRows.filter((d) => {
    const matchSearch =
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.srNo.toLowerCase().includes(search.toLowerCase());

    const shiftStatus =
      activeShift === "morning"
        ? d.morning
        : activeShift === "evening"
          ? d.evening
          : d.morning === "fed" && d.evening === "fed"
            ? "fed"
            : "pending";

    const matchFilter =
      activeFilter === "All" ||
      (activeFilter === "Both Fed" &&
        d.morning === "fed" &&
        d.evening === "fed") ||
      (activeFilter === "Pending" && shiftStatus === "pending");

    return matchSearch && matchFilter;
  });

  return (
    <SafeAreaView style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

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
        <TouchableOpacity style={s.refreshBtn} onPress={onRefresh}>
          <Ionicons name="refresh-outline" size={18} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color="#16a34a" />
          <Text style={s.loadingText}>Loading feed status...</Text>
        </View>
      ) : (
        <>
          <SummaryStrip summary={summary} activeShift={activeShift} />

          <View style={s.controlsRow}>
            <ShiftToggle active={activeShift} onChange={setActiveShift} />
          </View>

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
              <FeedCard item={item} index={index} activeShift={activeShift} />
            )}
            ListEmptyComponent={
              <View style={s.empty}>
                <Text style={{ fontSize: 40 }}>🌾</Text>
                <Text style={s.emptyText}>No records found</Text>
              </View>
            }
            ListFooterComponent={<View style={{ height: 100 }} />}
          />
        </>
      )}
    </SafeAreaView>
  );
}

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
  controlsRow: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4 },
  shiftToggle: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    padding: 3,
    gap: 2,
  },
  shiftBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 8,
    borderRadius: 10,
  },
  shiftBtnActive: { backgroundColor: "#111827" },
  shiftBtnText: { fontSize: 12, fontWeight: "700", color: "#6b7280" },
  shiftBtnTextActive: { color: "#fff" },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 14,
    marginTop: 10,
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
