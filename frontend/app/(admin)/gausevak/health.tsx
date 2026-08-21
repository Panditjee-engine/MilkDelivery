import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Animated,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../../src/services/api";
import { useIsFocused } from "@react-navigation/native";

interface CowRow {
  cow_id: string;
  cow_name: string;
  cow_tag: string;
  breed: string;
  type: string;
  status: string;
  worker_name: string | null;
  reported: boolean;
  date: string;
  checkupDone: boolean;
  markedHealthy: boolean;
  isLeasedIn: boolean;
  isLeasedOut: boolean;
  lessorFarmName?: string;
}

interface Summary {
  total: number;
  healthy: number;
  unhealthy: number;
  not_reported: number;
}

type SortOption =
  | "name_asc"
  | "name_desc"
  | "healthy_first"
  | "unhealthy_first"
  | "reported_first";

const cowImg = require("../../../assets/images/gir-cow.png");
const bullImg = require("../../../assets/images/bull-cow.png");
const calfImg = require("../../../assets/images/calf-cow.png");

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

function getCowImage(type: string) {
  if (type === "bull") return bullImg;
  if (type === "newborn") return calfImg;
  return cowImg;
}

function mapRow(r: any): CowRow {
  console.log("TYPE:", r.type, "NAME:", r.cow_name);
  return {
    cow_id: r.cow_id ?? "",
    cow_name: r.cow_name ?? "",
    cow_tag: r.cow_tag ?? "",
    breed: r.breed ?? "",
    type: r.type ?? "mature",
    status: r.status ?? "not_reported",
    worker_name: r.worker_name ?? null,
    reported: r.reported ?? false,
    date: r.date ?? "",
    checkupDone: false,
    markedHealthy: false,
    isLeasedIn: !!r.is_leased_in,
    isLeasedOut: !!r.is_leased_out,
    lessorFarmName: r.lessor_farm_name,
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
          <Image
            source={getCowImage(item.type)}
            style={{ width: 26, height: 26, resizeMode: "contain" }}
          />
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

      {/* ── Lease status row — own line, doesn't compete with status badge ── */}
      {(item.isLeasedIn || item.isLeasedOut) && (
        <View style={cc.leaseRow}>
          {item.isLeasedIn && (
            <View style={cc.leaseBadgeIn}>
              <Ionicons name="log-in-outline" size={10} color="#7c3aed" />
              <Text style={cc.leaseBadgeInTxt}>
                Leased In{item.lessorFarmName ? ` · from ${item.lessorFarmName}` : ""}
              </Text>
            </View>
          )}
          {item.isLeasedOut && (
            <View style={cc.leaseBadgeOut}>
              <Ionicons name="log-out-outline" size={10} color="#dc2626" />
              <Text style={cc.leaseBadgeOutTxt}>Leased Out</Text>
            </View>
          )}
        </View>
      )}

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

      {/* ── Leased out: locked, no actions available from this farm ── */}
      {item.isLeasedOut ? (
        <View style={cc.lockedNotice}>
          <Ionicons name="lock-closed-outline" size={12} color="#9ca3af" />
          <Text style={cc.lockedNoticeTxt}>
            On lease — health reporting managed by receiving farm
          </Text>
        </View>
      ) : (
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
                color="#7c3aed"
              />
              <Text style={[cc.actionText, { color: "#7c3aed" }]}>
                {item.checkupDone ? "Checkup Done" : "Mark Checkup"}
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
      )}
    </Animated.View>
  );
}

const TODAY = new Date().toISOString().split("T")[0];
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export default function CowHealthScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();

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
  const [sortBy, setSortBy] = useState<SortOption>("name_asc");
  const [sortVisible, setSortVisible] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [res, cowsList] = await Promise.all([
        api.getAdminHealthLogs(TODAY),
        api.getCows(),
      ]);

      // update by Badal on 28-06-2024: creating a map of cow_id to type for quick lookup while mapping rows
      const typeMap: Record<string, string> = {};
      cowsList.forEach((c: any) => {
        typeMap[c.id] = c.type ?? "mature";
      });

      setSummary(
        res.summary ?? { total: 0, healthy: 0, unhealthy: 0, not_reported: 0 },
      );
      setRows(
        Array.isArray(res.cows)
          ? res.cows.map((r: any) => mapRow({ ...r, type: typeMap[r.cow_id] ?? "mature" }))
          : []
      );
    } catch (e: any) {
      console.log("admin health fetch error:", e.message);
      Alert.alert("Error", e.message || "Failed to load");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!isFocused) return;
    fetchAll();
    const interval = setInterval(() => fetchAll(), 2000);
    return () => clearInterval(interval);
  }, [isFocused]);

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

const handleToggleHealth = async (cowId: string) => {
  const row = rows.find((r) => r.cow_id === cowId);
  if (!row) return;
  const goingHealthy = !isHealthy(row.status);
  const newStatus = goingHealthy ? "healthy" : "sick";

  setRows((prev) =>
    prev.map((r) =>
      r.cow_id === cowId
        ? {
            ...r,
            status: newStatus,
            markedHealthy: goingHealthy,
            checkupDone: goingHealthy ? true : r.checkupDone,
            reported: true,
            worker_name: "Admin",
          }
        : r,
    ),
  );

  try {
    await api.adminSetHealth(cowId, newStatus, row.cow_name, row.cow_tag);
  } catch (e: any) {
    console.log("admin health save error:", e.message);
    Alert.alert("Error", e.message || "Failed to save health status");
    setRows((prev) => prev.map((r) => (r.cow_id === cowId ? row : r)));
  }
};

  const groupedRows = rows.reduce<CowRow[]>((groups, row) => {
    const existing = groups.find((item) => item.cow_id === row.cow_id);
    if (!existing) {
      groups.push(row);
      return groups;
    }

    const existingScore =
      (existing.reported ? 2 : 0) +
      (existing.worker_name ? 1 : 0) +
      (isHealthy(existing.status) ? 1 : 0);
    const nextScore =
      (row.reported ? 2 : 0) +
      (row.worker_name ? 1 : 0) +
      (isHealthy(row.status) ? 1 : 0);

    if (nextScore >= existingScore) {
      const index = groups.findIndex((item) => item.cow_id === row.cow_id);
      groups[index] = row;
    }

    return groups;
  }, []);

  const filtered = groupedRows.filter((r) => {
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
  }).sort((a, b) => {
    if (sortBy === "name_asc") return a.cow_name.localeCompare(b.cow_name);
    if (sortBy === "name_desc") return b.cow_name.localeCompare(a.cow_name);
    if (sortBy === "healthy_first") {
      return isHealthy(a.status) === isHealthy(b.status)
        ? a.cow_name.localeCompare(b.cow_name)
        : isHealthy(a.status)
          ? -1
          : 1;
    }
    if (sortBy === "unhealthy_first") {
      return isUnhealthy(a.status) === isUnhealthy(b.status)
        ? a.cow_name.localeCompare(b.cow_name)
        : isUnhealthy(a.status)
          ? -1
          : 1;
    }
    return a.reported === b.reported
      ? a.cow_name.localeCompare(b.cow_name)
      : a.reported
        ? -1
        : 1;
  });
  const sortMeta: Record<
    SortOption,
    { label: string; icon: keyof typeof Ionicons.glyphMap }
  > = {
    name_asc: { label: "Name A-Z", icon: "text-outline" },
    name_desc: { label: "Name Z-A", icon: "text-outline" },
    healthy_first: { label: "Healthy First", icon: "heart-outline" },
    unhealthy_first: { label: "Unhealthy First", icon: "alert-circle-outline" },
    reported_first: { label: "Reported First", icon: "checkmark-done-outline" },
  };

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

  // ── Collapsible header: rendered as FlatList ListHeaderComponent
  const ListHeader = () => (
    <View>
      {/* Stats */}
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

      {/* Search */}
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

      {/* Filters */}
      <View style={s.filterRow}>
        {FILTERS.map((fl) => {
          const active = filter === fl.key;
          return (
            <TouchableOpacity
              key={fl.key}
              onPress={() => setFilter(fl.key)}
              style={[
                s.chip,
                active && { backgroundColor: fl.color, borderColor: fl.color },
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
    </View>
  );

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Fixed top header — always visible */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.headerTitle}>Cow Health</Text>
          <Text style={s.headerSub}>
            {rows.length} cows · {fmtDate(TODAY)}
          </Text>
        </View>
        <TouchableOpacity style={s.refreshBtn} onPress={onRefresh}>
          <Ionicons name="refresh-outline" size={18} color="#16a34a" />
        </TouchableOpacity>
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
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.cow_id}
          // Stats + search + filter scroll away with the list
          ListHeaderComponent={<ListHeader />}
          contentContainerStyle={{
            paddingHorizontal: 14,
            paddingBottom: 40,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
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
                {search ? "No results for your search" : "No data for today"}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9fafb" },

  // Fixed header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e6a681",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f9fafb",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e6a681",
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
  sortBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f0fdf4",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#86efac",
    marginRight: 8,
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

  // Stats — inside ListHeader (scrolls away)
  sortOverlay: {
    flex: 1,
    backgroundColor: "rgba(17,24,39,0.28)",
    justifyContent: "flex-start",
    paddingTop: 96,
    paddingHorizontal: 16,
  },
  sortSheet: {
    alignSelf: "flex-end",
    width: 220,
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#86efac",
    padding: 12,
  },
  sortSheetTitle: { fontSize: 15, fontWeight: "800", color: "#111827" },
  sortSheetSub: {
    fontSize: 12,
    color: "#9ca3af",
    fontWeight: "500",
    marginTop: 2,
    marginBottom: 8,
  },
  sortOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
  },
  sortOptionActive: { backgroundColor: "#f0fdf4" },
  sortOptionText: { fontSize: 13, fontWeight: "700", color: "#6b7280" },
  sortOptionTextActive: { color: "#16a34a" },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    marginHorizontal: -14, // bleed to full width despite FlatList padding
  },
  statItem: { flex: 1, alignItems: "center", paddingVertical: 9 },
  statBorder: { borderRightWidth: 1, borderRightColor: "#f3f4f6" },
  statValue: { fontSize: 16, fontWeight: "800", letterSpacing: -0.3 },
  statLabel: { fontSize: 9, color: "#9ca3af", marginTop: 1, fontWeight: "500" },

  // Search — inside ListHeader (scrolls away)
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
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

  // Filters — inside ListHeader (scrolls away)
  filterRow: {
    flexDirection: "row",
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
    backgroundColor: "#fdfafa",
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#ffc9b8",
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
  leaseRow: {
  flexDirection: "row",
  flexWrap: "wrap",
  gap: 6,
  marginTop: 8,
},
leaseBadgeIn: {
  flexDirection: "row",
  alignItems: "center",
  gap: 4,
  backgroundColor: "#f5f3ff",
  borderWidth: 1,
  borderColor: "#ddd6fe",
  borderRadius: 8,
  paddingHorizontal: 8,
  paddingVertical: 4,
  alignSelf: "flex-start",
},
leaseBadgeInTxt: { fontSize: 10, fontWeight: "800", color: "#7c3aed" },
leaseBadgeOut: {
  flexDirection: "row",
  alignItems: "center",
  gap: 4,
  backgroundColor: "#fff1f2",
  borderWidth: 1,
  borderColor: "#fecdd3",
  borderRadius: 8,
  paddingHorizontal: 8,
  paddingVertical: 4,
  alignSelf: "flex-start",
},
leaseBadgeOutTxt: { fontSize: 10, fontWeight: "800", color: "#dc2626" },
lockedNotice: {
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
  marginTop: 10,
  paddingVertical: 8,
  paddingHorizontal: 10,
  backgroundColor: "#f9fafb",
  borderRadius: 9,
  borderWidth: 1,
  borderColor: "#e5e7eb",
  borderStyle: "dashed",
},
lockedNoticeTxt: { fontSize: 11, color: "#9ca3af", fontWeight: "600" },
});
