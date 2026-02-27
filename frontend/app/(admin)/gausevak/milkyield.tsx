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

interface MilkRow {
  id: string;
  srNo: string;
  name: string;
  morningLiters: number;
  eveningLiters: number;
  morningWorker: string | null;
  eveningWorker: string | null;
}

interface Summary {
  total_morning: number;
  total_evening: number;
  grand_total: number;
  active_cows: number;
  total_cows: number;
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

const today = new Date().toLocaleDateString("en-IN", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

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

function MilkCard({ item, index }: { item: MilkRow; index: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
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
      <View style={s.cardHeader}>
        <View style={s.avatarWrap}>
          <Text style={{ fontSize: 22 }}>🐄</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={s.cowName}>{item.name}</Text>
          <Text style={s.cowSr}>{item.srNo}</Text>
        </View>
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
    </Animated.View>
  );
}

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
  >("name");

  const fetchAll = useCallback(async () => {
    try {
      const authToken = await AsyncStorage.getItem("access_token");
      if (!authToken) {
        setLoading(false);
        return;
      }

      const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "";
      const url = `${BASE_URL}/api/admin/milk?date=${todayStr()}`;

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
      setMilkRows(
        data.cows.map((c: any) => ({
          id: c.cow_id,
          srNo: c.cow_tag || c.cow_id,
          name: c.cow_name || "Unknown",
          morningLiters: c.morning_liters ?? 0,
          eveningLiters: c.evening_liters ?? 0,
          morningWorker: c.morning_worker ?? null,
          eveningWorker: c.evening_worker ?? null,
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
          <Text style={s.headerTitle}>Milk Yield</Text>
          <Text style={s.headerSub}>{today}</Text>
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

          <View style={s.sortRow}>
            <Text style={s.sortLabel}>Sort by:</Text>
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
              <MilkCard item={item} index={index} />
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
