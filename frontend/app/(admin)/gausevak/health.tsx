import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Animated,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../../src/services/api";

interface CowRow {
  cow_id: string;
  cow_name: string;
  cow_tag: string;
  breed: string;
  status: string; 
  worker_name: string | null;
  reported: boolean;
  date: string;
  checkupDone: boolean; 
  markedHealthy: boolean; 
}

interface Summary {
  total: number;
  healthy: number;
  unhealthy: number;
  not_reported: number;
}

const isHealthy = (s: string) => s === "healthy";
const isUnhealthy = (s: string) => s !== "healthy" && s !== "not_reported";
const isNotReported = (s: string) => s === "not_reported";

function statusCfg(s: string) {
  if (isHealthy(s))
    return {
      label: "Healthy",
      color: "#16a34a",
      bg: "#f0fdf4",
      border: "#86efac",
      icon: "checkmark-circle",
    };
  if (isNotReported(s))
    return {
      label: "Not Reported",
      color: "#9ca3af",
      bg: "#f9fafb",
      border: "#e5e7eb",
      icon: "ellipse-outline",
    };
  return {
    label: s.charAt(0).toUpperCase() + s.slice(1),
    color: "#dc2626",
    bg: "#fef2f2",
    border: "#fca5a5",
    icon: "alert-circle",
  };
}

function mapRow(r: any): CowRow {
  return {
    cow_id: r.cow_id ?? "",
    cow_name: r.cow_name ?? "",
    cow_tag: r.cow_tag ?? "",
    breed: r.breed ?? "",
    status: r.status ?? "not_reported",
    worker_name: r.worker_name ?? null,
    reported: r.reported ?? false,
    date: r.date ?? "",
    checkupDone: false,
    markedHealthy: false,
  };
}

function CowCard({
  item,
  index,
  onCheckup,
  onToggleHealth,
}: {
  item: CowRow;
  index: number;
  onCheckup: (id: string) => void;
  onToggleHealth: (id: string) => void;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  const cfg = statusCfg(item.status);
  const unhealthy = isUnhealthy(item.status);
  const healthy = isHealthy(item.status);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 260,
        delay: index * 40,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        delay: index * 40,
        tension: 80,
        friction: 12,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        cc.card,
        healthy && cc.cardHealthy,
        unhealthy && cc.cardSick,
        { opacity, transform: [{ translateY }] },
      ]}
    >
      <View style={cc.row}>
        <View
          style={[
            cc.avatar,
            healthy && { backgroundColor: "#f0fdf4", borderColor: "#86efac" },
            unhealthy && { backgroundColor: "#fef2f2", borderColor: "#fca5a5" },
          ]}
        >
          <Text style={{ fontSize: 20 }}>
            {healthy ? "🐄" : isNotReported(item.status) ? "❓" : "🤒"}
          </Text>
        </View>

        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={cc.cowName}>{item.cow_name}</Text>
          <Text style={cc.cowTag}>#{item.cow_tag}</Text>
        </View>

        <View
          style={[
            cc.badge,
            { backgroundColor: cfg.bg, borderColor: cfg.border },
          ]}
        >
          <Ionicons name={cfg.icon as any} size={11} color={cfg.color} />
          <Text style={[cc.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>

      {item.worker_name ? (
        <View style={cc.workerRow}>
          <Ionicons name="person-outline" size={10} color="#9ca3af" />
          <Text style={cc.workerText}>Reported by {item.worker_name}</Text>
        </View>
      ) : (
        <View style={cc.workerRow}>
          <Ionicons name="time-outline" size={10} color="#d1d5db" />
          <Text style={[cc.workerText, { color: "#d1d5db" }]}>
            Not yet reported
          </Text>
        </View>
      )}

      <View style={cc.actions}>
        {unhealthy && (
          <TouchableOpacity
            style={[
              cc.actionBtn,
              item.checkupDone ? cc.checkupActive : cc.checkupIdle,
            ]}
            onPress={() => onCheckup(item.cow_id)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={item.checkupDone ? "checkmark-circle" : "ellipse-outline"}
              size={13}
              color={item.checkupDone ? "#7c3aed" : "#7c3aed"}
            />
            <Text style={[cc.actionText, { color: "#7c3aed" }]}>
              {item.checkupDone ? "Checkup Done ✓" : "Mark Checkup"}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[cc.actionBtn, healthy ? cc.markSickBtn : cc.markHealthyBtn]}
          onPress={() => onToggleHealth(item.cow_id)}
          activeOpacity={0.8}
        >
          <Ionicons
            name={healthy ? "alert-circle-outline" : "heart-outline"}
            size={13}
            color={healthy ? "#dc2626" : "#16a34a"}
          />
          <Text
            style={[cc.actionText, { color: healthy ? "#dc2626" : "#16a34a" }]}
          >
            {healthy ? "Mark Unhealthy" : "Mark Healthy"}
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

export default function CowHealthScreen() {
  const router = useRouter();

  const [rows, setRows] = useState<CowRow[]>([]);
  const [summary, setSummary] = useState<Summary>({
    total: 0,
    healthy: 0,
    unhealthy: 0,
    not_reported: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<
    "all" | "healthy" | "unhealthy" | "not_reported"
  >("all");
  const [selectedDate, setSelectedDate] = useState(
    () => new Date().toISOString().split("T")[0],
  );

  const fetchAll = useCallback(async () => {
    try {
      const res = await api.getAdminHealthLogs(selectedDate);
      setSummary(
        res.summary ?? { total: 0, healthy: 0, unhealthy: 0, not_reported: 0 },
      );
      setRows(Array.isArray(res.cows) ? res.cows.map(mapRow) : []);
    } catch (e: any) {
      console.log("admin health fetch error:", e.message);
      Alert.alert("Error", e.message || "Failed to load");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    setLoading(true);
    fetchAll();
  }, [selectedDate]);
  const onRefresh = () => {
    setRefreshing(true);
    fetchAll();
  };


  const handleCheckup = (cowId: string) =>
    setRows((prev) =>
      prev.map((r) =>
        r.cow_id === cowId ? { ...r, checkupDone: !r.checkupDone } : r,
      ),
    );

  const handleToggleHealth = (cowId: string) =>
    setRows((prev) =>
      prev.map((r) => {
        if (r.cow_id !== cowId) return r;
        const goingHealthy = !isHealthy(r.status);
        return {
          ...r,
          status: goingHealthy ? "healthy" : "sick",
          markedHealthy: goingHealthy,
          checkupDone: goingHealthy ? true : r.checkupDone,
        };
      }),
    );

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch =
      r.cow_name.toLowerCase().includes(q) ||
      r.cow_tag.toLowerCase().includes(q) ||
      r.status.toLowerCase().includes(q) ||
      (r.worker_name ?? "").toLowerCase().includes(q);
    const matchFilter =
      filter === "all"
        ? true
        : filter === "healthy"
          ? isHealthy(r.status)
          : filter === "unhealthy"
            ? isUnhealthy(r.status)
            : isNotReported(r.status);
    return matchSearch && matchFilter;
  });

  const shiftDate = (d: number) => {
    const dt = new Date(selectedDate);
    dt.setDate(dt.getDate() + d);
    setSelectedDate(dt.toISOString().split("T")[0]);
  };
  const isToday = selectedDate === new Date().toISOString().split("T")[0];
  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const FILTERS = [
    {
      key: "all" as const,
      label: "All",
      color: "#6b7280",
      count: summary.total,
      icon: "list-outline",
    },
    {
      key: "healthy" as const,
      label: "Healthy",
      color: "#16a34a",
      count: summary.healthy,
      icon: "checkmark-circle-outline",
    },
    {
      key: "unhealthy" as const,
      label: "Unhealthy",
      color: "#dc2626",
      count: summary.unhealthy,
      icon: "alert-circle-outline",
    },
    {
      key: "not_reported" as const,
      label: "No Report",
      color: "#9ca3af",
      count: summary.not_reported,
      icon: "ellipse-outline",
    },
  ];

  return (
    <SafeAreaView style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.headerTitle}>Cow Health</Text>
          <Text style={s.headerSub}>
            {rows.length} cows · {fmtDate(selectedDate)}
          </Text>
        </View>
        <TouchableOpacity style={s.refreshBtn} onPress={onRefresh}>
          <Ionicons name="refresh-outline" size={18} color="#16a34a" />
        </TouchableOpacity>
      </View>

      <View style={s.dateNav}>
        <TouchableOpacity style={s.dateArrow} onPress={() => shiftDate(-1)}>
          <Ionicons name="chevron-back" size={18} color="#374151" />
        </TouchableOpacity>
        <View style={{ alignItems: "center", gap: 3 }}>
          <Text style={s.dateLabel}>{fmtDate(selectedDate)}</Text>
          {isToday && (
            <View style={s.todayPill}>
              <Text style={s.todayText}>Today</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={[s.dateArrow, isToday && { borderColor: "#f3f4f6" }]}
          onPress={() => !isToday && shiftDate(1)}
          disabled={isToday}
        >
          <Ionicons
            name="chevron-forward"
            size={18}
            color={isToday ? "#d1d5db" : "#374151"}
          />
        </TouchableOpacity>
      </View>

      <View style={s.statsRow}>
        {[
          {
            label: "Total",
            value: summary.total,
            color: "#6b7280",
            icon: "list",
          },
          {
            label: "Healthy",
            value: summary.healthy,
            color: "#16a34a",
            icon: "heart",
          },
          {
            label: "Sick",
            value: summary.unhealthy,
            color: "#dc2626",
            icon: "alert-circle",
          },
          {
            label: "No Report",
            value: summary.not_reported,
            color: "#9ca3af",
            icon: "ellipse",
          },
        ].map((st, i, arr) => (
          <View
            key={i}
            style={[s.statItem, i < arr.length - 1 && s.statBorder]}
          >
            <Ionicons
              name={st.icon as any}
              size={13}
              color={st.color}
              style={{ marginBottom: 2 }}
            />
            <Text style={[s.statValue, { color: st.color }]}>{st.value}</Text>
            <Text style={s.statLabel}>{st.label}</Text>
          </View>
        ))}
      </View>

      {loading ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
          }}
        >
          <ActivityIndicator size="large" color="#16a34a" />
          <Text style={{ color: "#6b7280", fontSize: 14, fontWeight: "600" }}>
            Loading...
          </Text>
        </View>
      ) : (
        <>
          <View style={s.searchWrap}>
            <Ionicons name="search-outline" size={15} color="#9ca3af" />
            <TextInput
              style={s.searchInput}
              placeholder="Search cow, tag or status..."
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
            {FILTERS.map((fl) => {
              const active = filter === fl.key;
              return (
                <TouchableOpacity
                  key={fl.key}
                  onPress={() => setFilter(fl.key)}
                  style={[
                    s.chip,
                    active && {
                      backgroundColor: fl.color,
                      borderColor: fl.color,
                    },
                  ]}
                >
                  <Ionicons
                    name={fl.icon as any}
                    size={11}
                    color={active ? "#fff" : fl.color}
                  />
                  <Text
                    style={[s.chipText, { color: active ? "#fff" : "#374151" }]}
                  >
                    {fl.label}
                  </Text>
                  <View
                    style={[
                      s.chipBadge,
                      active && { backgroundColor: "rgba(255,255,255,0.25)" },
                    ]}
                  >
                    <Text
                      style={[
                        s.chipBadgeText,
                        { color: active ? "#fff" : "#6b7280" },
                      ]}
                    >
                      {fl.count}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.cow_id}
            contentContainerStyle={{
              paddingHorizontal: 14,
              paddingTop: 6,
              paddingBottom: 40,
            }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#16a34a"
              />
            }
            renderItem={({ item, index }) => (
              <CowCard
                item={item}
                index={index}
                onCheckup={handleCheckup}
                onToggleHealth={handleToggleHealth}
              />
            )}
            ListEmptyComponent={
              <View style={s.empty}>
                <Text style={{ fontSize: 44 }}>🐄</Text>
                <Text style={s.emptyTitle}>No cows found</Text>
                <Text style={s.emptyText}>
                  {search
                    ? "No results for your search"
                    : `No data for ${fmtDate(selectedDate)}`}
                </Text>
              </View>
            }
          />
        </>
      )}
    </SafeAreaView>
  );
}

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
    backgroundColor: "#f0fdf4",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#86efac",
  },
  dateNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  dateArrow: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#f9fafb",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  dateLabel: { fontSize: 14, fontWeight: "700", color: "#111827" },
  todayPill: {
    backgroundColor: "#dcfce7",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 1,
  },
  todayText: { fontSize: 10, fontWeight: "700", color: "#16a34a" },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  statItem: { flex: 1, alignItems: "center", paddingVertical: 9 },
  statBorder: { borderRightWidth: 1, borderRightColor: "#f3f4f6" },
  statValue: { fontSize: 16, fontWeight: "800", letterSpacing: -0.3 },
  statLabel: { fontSize: 9, color: "#9ca3af", marginTop: 1, fontWeight: "500" },
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
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingBottom: 10,
    gap: 6,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 30,
    paddingHorizontal: 9,
    borderRadius: 9,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
  },
  chipText: { fontSize: 10, fontWeight: "700" },
  chipBadge: {
    backgroundColor: "#f3f4f6",
    borderRadius: 7,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  chipBadgeText: { fontSize: 9, fontWeight: "700" },
  empty: { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: "#374151" },
  emptyText: {
    fontSize: 13,
    color: "#9ca3af",
    fontWeight: "500",
    textAlign: "center",
  },
});

const cc = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHealthy: { borderColor: "#bbf7d0" },
  cardSick: { borderColor: "#fecaca" },
  row: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#f9fafb",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  cowName: { fontSize: 14, fontWeight: "700", color: "#111827" },
  cowTag: { fontSize: 11, color: "#9ca3af", fontWeight: "500", marginTop: 1 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 16,
    borderWidth: 1,
  },
  badgeText: { fontSize: 10, fontWeight: "700" },
  workerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  workerText: { fontSize: 11, color: "#9ca3af", fontWeight: "500" },
  actions: { flexDirection: "row", gap: 7, marginTop: 10 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    height: 34,
    borderRadius: 9,
    borderWidth: 1.5,
  },
  checkupIdle: { backgroundColor: "#faf5ff", borderColor: "#e9d5ff" },
  checkupActive: { backgroundColor: "#f3e8ff", borderColor: "#c4b5fd" },
  markHealthyBtn: { backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" },
  markSickBtn: { backgroundColor: "#fef2f2", borderColor: "#fecaca" },
  actionText: { fontSize: 11, fontWeight: "700" },
});
