import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Platform,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import { api } from "../../../src/services/api";

const C = {
  primary: "#FF9675",
  accent: "#8B6854",
  dark: "#BB6B3F",
  bg: "#FFF8EF",
  card: "#FFE8D6",
  text: "#3D1F0A",
  textMuted: "#A07850",
  textLight: "#C9A882",
  danger: "#E05A3A",
};

type Shift = {
  id: string;
  vet_id: string;
  vet_name: string;
  started_at: string | null;
  ended_at: string | null;
  duration_minutes: number | null;
  ongoing: boolean;
};

const fmtDuration = (mins: number | null) => {
  if (mins == null) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const fmtTime = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "—";

const fmtDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" })
    : "";

const todayStr = () => {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
};

export default function VetShiftLogsScreen() {
  const router = useRouter();
  const { vet_id, vet_name } = useLocalSearchParams<{ vet_id?: string; vet_name?: string }>();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [onDutyNow, setOnDutyNow] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "today">("all");

  const load = useCallback(async () => {
    try {
      const res = await api.getAdminVetShifts({
        vet_id: vet_id || undefined,
        date: filter === "today" ? todayStr() : undefined,
      });
      setShifts(res.shifts);
      setOnDutyNow(res.on_duty_now);
    } catch {
      setShifts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [vet_id, filter]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const totalMinutes = shifts.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);

  const renderItem = ({ item }: { item: Shift }) => (
    <View style={s.card}>
      <View style={s.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={s.vetName}>Dr. {item.vet_name || "Unknown"}</Text>
          <Text style={s.date}>{fmtDate(item.started_at)}</Text>
        </View>
        <View
          style={[
            s.pill,
            { backgroundColor: item.ongoing ? "#E8F8EC" : C.card },
          ]}
        >
          <View
            style={[
              s.dot,
              { backgroundColor: item.ongoing ? "#22C55E" : C.textLight },
            ]}
          />
          <Text style={[s.pillText, { color: item.ongoing ? "#15803D" : C.textMuted }]}>
            {item.ongoing ? "On Duty" : "Completed"}
          </Text>
        </View>
      </View>

      <View style={s.timeRow}>
        <View style={s.timeBox}>
          <Text style={s.timeLabel}>START</Text>
          <Text style={s.timeVal}>{fmtTime(item.started_at)}</Text>
        </View>
        <Ionicons name="arrow-forward" size={14} color={C.textLight} />
        <View style={s.timeBox}>
          <Text style={s.timeLabel}>END</Text>
          <Text style={s.timeVal}>{item.ongoing ? "Ongoing" : fmtTime(item.ended_at)}</Text>
        </View>
        <View style={[s.timeBox, { alignItems: "flex-end", flex: 1 }]}>
          <Text style={s.timeLabel}>DURATION</Text>
          <Text style={[s.timeVal, { color: C.dark }]}>
            {item.ongoing ? "—" : fmtDuration(item.duration_minutes)}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={s.screen}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={["#3D1F0A", "#6B3520"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.header}
      >
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={C.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <View style={s.titleRow}>
            <Ionicons name="time-outline" size={16} color={C.primary} />
            <Text style={s.title}>Shift Logs</Text>
          </View>
          <Text style={s.sub}>
            {vet_name ? `Dr. ${vet_name}` : "All veterinarians"}
          </Text>
        </View>
      </LinearGradient>

      {/* Summary */}
      <View style={s.summary}>
        <View style={s.sumChip}>
          <View style={[s.dot, { backgroundColor: "#22C55E" }]} />
          <Text style={s.sumText}>{onDutyNow} on duty now</Text>
        </View>
        <View style={s.sumChip}>
          <Ionicons name="list-outline" size={13} color={C.dark} />
          <Text style={s.sumText}>{shifts.length} shifts</Text>
        </View>
        <View style={s.sumChip}>
          <Ionicons name="hourglass-outline" size={13} color={C.dark} />
          <Text style={s.sumText}>{fmtDuration(totalMinutes)}</Text>
        </View>
      </View>

      {/* Filter */}
      <View style={s.filters}>
        {(["all", "today"] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[s.filterChip, filter === f && s.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[s.filterText, filter === f && s.filterTextActive]}>
              {f === "all" ? "All" : "Today"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : (
        <FlatList
          data={shifts}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={C.primary}
            />
          }
          ListEmptyComponent={
            <View style={s.centered}>
              <Ionicons name="time-outline" size={40} color={C.textLight} />
              <Text style={s.emptyText}>No shift logs yet</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 56 : (StatusBar.currentHeight ?? 0) + 16,
    paddingBottom: 18,
    paddingHorizontal: 16,
    gap: 12,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,150,117,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,150,117,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  title: { fontSize: 20, fontWeight: "800", color: "#FFF8EF" },
  sub: { fontSize: 12, color: C.textLight, marginTop: 2, fontWeight: "500" },

  summary: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F5D5BC",
  },
  sumChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: C.card,
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  sumText: { fontSize: 12, fontWeight: "600", color: C.dark },

  filters: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  filterChip: {
    borderWidth: 1.5,
    borderColor: "#F5D5BC",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: "#fff",
  },
  filterChipActive: { borderColor: C.primary, backgroundColor: C.card },
  filterText: { fontSize: 12, fontWeight: "600", color: C.textMuted },
  filterTextActive: { color: C.dark },

  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#F5E6D8",
  },
  cardTop: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  vetName: { fontSize: 15, fontWeight: "700", color: C.text },
  date: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontSize: 11, fontWeight: "700" },

  timeRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  timeBox: {},
  timeLabel: { fontSize: 9, fontWeight: "700", color: C.textLight, letterSpacing: 1 },
  timeVal: { fontSize: 14, fontWeight: "700", color: C.text, marginTop: 2 },

  centered: { alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 10 },
  emptyText: { fontSize: 14, color: C.textMuted },
});