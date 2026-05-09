import React, { useState, useRef, useEffect, useCallback } from "react";
import {
    View, Text, StyleSheet, FlatList, ActivityIndicator,
    StatusBar, Platform, Animated, RefreshControl,
    TextInput, TouchableOpacity, Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import { api } from "../../src/services/api";

// ── Images ─────────────────────────────────────────────────────────────────────
const cowImg = require("../../assets/images/gir-cow.png");
const bullImg = require("../../assets/images/bull-cow.png");
const calfImg = require("../../assets/images/calf-cow.png");

function getCowImage(type?: string) {
    if (type === "bull") return bullImg;
    if (type === "newborn") return calfImg;
    return cowImg;
}

// ── Types ──────────────────────────────────────────────────────────────────────
interface AnimalRow {
    id: string;
    tag_number: string;
    name: string;
    breed: string;
    type: string;         // bull / newborn / mature
    gender: string;
    age: number | null;
    isActive: boolean;
    isSold: boolean;
    healthStatus: string; // healthy / sick / not_reported
    workerName: string | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const TODAY = new Date().toISOString().split("T")[0];

const todayLabel = new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long",
});

function isHealthy(s: string) { return s === "healthy"; }
function isUnhealthy(s: string) { return s !== "healthy" && s !== "not_reported"; }
function isNotReported(s: string) { return s === "not_reported"; }

function healthCfg(s: string) {
    if (isHealthy(s)) return { label: "Healthy", color: "#16a34a", bg: "#f0fdf4", border: "#86efac", icon: "checkmark-circle" };
    if (isNotReported(s)) return { label: "Not Reported", color: "#9ca3af", bg: "#f9fafb", border: "#e5e7eb", icon: "ellipse-outline" };
    return { label: s.charAt(0).toUpperCase() + s.slice(1), color: "#dc2626", bg: "#fef2f2", border: "#fca5a5", icon: "alert-circle" };
}

// ── Summary Strip ──────────────────────────────────────────────────────────────
function StatsStrip({ total, healthy, sick, notReported, active }: {
    total: number; healthy: number; sick: number; notReported: number; active: number;
}) {
    const items = [
        { label: "Total", value: total, color: "#93c5fd" },
        { label: "Active", value: active, color: "#6ee7b7" },
        { label: "Healthy", value: healthy, color: "#86efac" },
        { label: "Sick", value: sick, color: "#f87171" },
    ];
    return (
        <View style={ss.strip}>
            {items.map((it, i) => (
                <React.Fragment key={i}>
                    {i > 0 && <View style={ss.divider} />}
                    <View style={ss.item}>
                        <Text style={[ss.val, { color: it.color }]}>{it.value}</Text>
                        <Text style={ss.lbl}>{it.label}</Text>
                    </View>
                </React.Fragment>
            ))}
        </View>
    );
}

// ── Animal Card ────────────────────────────────────────────────────────────────
function AnimalCard({ item, index }: { item: AnimalRow; index: number }) {
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(12)).current;
    const hCfg = healthCfg(item.healthStatus);
    const healthy = isHealthy(item.healthStatus);
    const unhealthy = isUnhealthy(item.healthStatus);

    useEffect(() => {
        Animated.parallel([
            Animated.timing(opacity, { toValue: 1, duration: 260, delay: index * 40, useNativeDriver: true }),
            Animated.spring(translateY, { toValue: 0, delay: index * 40, tension: 80, friction: 12, useNativeDriver: true }),
        ]).start();
    }, []);

    const statusColor = item.isSold ? "#dc2626" : item.isActive ? "#16a34a" : "#f59e0b";
    const statusLabel = item.isSold ? "Sold" : item.isActive ? "Active" : "Inactive";

    return (
        <Animated.View style={[
            ac.card,
            healthy && ac.cardHealthy,
            unhealthy && ac.cardSick,
            { opacity, transform: [{ translateY }] },
        ]}>
            {/* Top row: avatar + name + active badge */}
            <View style={ac.topRow}>
                <View style={[
                    ac.avatar,
                    healthy && { backgroundColor: "#f0fdf4", borderColor: "#86efac" },
                    unhealthy && { backgroundColor: "#fef2f2", borderColor: "#fca5a5" },
                ]}>
                    <Image source={getCowImage(item.type)} style={{ width: 28, height: 28, resizeMode: "contain" }} />
                </View>

                <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={ac.name}>{item.name || "—"}</Text>
                    <Text style={ac.tag}>#{item.tag_number}</Text>
                </View>

                {/* Active / Sold badge */}
                <View style={[ac.activeBadge, { backgroundColor: statusColor + "18", borderColor: statusColor + "44" }]}>
                    <View style={[ac.activeDot, { backgroundColor: statusColor }]} />
                    <Text style={[ac.activeText, { color: statusColor }]}>{statusLabel}</Text>
                </View>
            </View>

            {/* Meta chips row */}
            <View style={ac.metaRow}>
                {item.breed ? (
                    <View style={ac.chip}>
                        <Ionicons name="leaf-outline" size={10} color="#6b7280" />
                        <Text style={ac.chipText}>{item.breed}</Text>
                    </View>
                ) : null}
                {item.gender ? (
                    <View style={[ac.chip, { backgroundColor: item.gender === "Male" ? "#eff6ff" : "#fdf4ff" }]}>
                        <Ionicons name={item.gender === "Male" ? "male" : "female"} size={10}
                            color={item.gender === "Male" ? "#1a4a8a" : "#7c3aed"} />
                        <Text style={[ac.chipText, { color: item.gender === "Male" ? "#1a4a8a" : "#7c3aed" }]}>
                            {item.gender}
                        </Text>
                    </View>
                ) : null}
                {item.age != null ? (
                    <View style={ac.chip}>
                        <Ionicons name="time-outline" size={10} color="#6b7280" />
                        <Text style={ac.chipText}>{item.age} yrs</Text>
                    </View>
                ) : null}
                {item.type ? (
                    <View style={[ac.chip, { backgroundColor: "#f0f9ff" }]}>
                        <Text style={[ac.chipText, { color: "#0369a1" }]}>
                            {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                        </Text>
                    </View>
                ) : null}
            </View>

            {/* Health status row */}
            <View style={ac.healthRow}>
                <View style={[ac.healthBadge, { backgroundColor: hCfg.bg, borderColor: hCfg.border }]}>
                    <Ionicons name={hCfg.icon as any} size={12} color={hCfg.color} />
                    <Text style={[ac.healthText, { color: hCfg.color }]}>{hCfg.label}</Text>
                </View>
                {item.workerName ? (
                    <View style={ac.workerRow}>
                        <Ionicons name="person-outline" size={10} color="#9ca3af" />
                        <Text style={ac.workerText}>by {item.workerName}</Text>
                    </View>
                ) : (
                    <View style={ac.workerRow}>
                        <Ionicons name="time-outline" size={10} color="#d1d5db" />
                        <Text style={[ac.workerText, { color: "#d1d5db" }]}>Not yet reported</Text>
                    </View>
                )}
            </View>
        </Animated.View>
    );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function FarmPage() {
    const router = useRouter();
    const isFocused = useIsFocused();

    const [animals, setAnimals] = useState<AnimalRow[]>([]);
    const [summary, setSummary] = useState({ total: 0, active: 0, healthy: 0, sick: 0, notReported: 0 });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<"all" | "healthy" | "unhealthy" | "not_reported">("all");

    const isMountedRef = useRef(true);

    // ── Fetch ──────────────────────────────────────────────────────────────────
    const fetchAll = useCallback(async (silent = false) => {
        if (!isMountedRef.current) return;
        try {
            if (!silent) setLoading(true);

            const [cowsList, healthRaw] = await Promise.all([
                api.vetGetCows().catch((e: any) => { console.log("vet cows err:", e?.message); return []; }),
                api.vetGetHealthLogs(TODAY).catch((e: any) => { console.log("health err:", e?.message); return []; }),
            ]);
            if (!isMountedRef.current) return;

            // Health map: cow_id → {status, worker_name}
            // Health map banana
            const healthCows: any[] = Array.isArray(healthRaw) ? healthRaw : [];

            const healthMap: Record<string, { status: string; worker_name: string | null }> = {};
            healthCows.forEach((r: any) => {
                const key = r.cow_id ?? r.id ?? "";
                if (key) healthMap[key] = {
                    status: r.status ?? "not_reported",
                    worker_name: r.worker_name ?? null
                };
            });

            // Merge
            const safeList: any[] = Array.isArray(cowsList) ? cowsList : [];
            const merged: AnimalRow[] = safeList.map((c: any) => {
                const id = c.id ?? c.cow_id ?? "";
                const h = healthMap[id] ?? { status: "not_reported", worker_name: null };
                return {
                    id,
                    tag_number: c.tag_number ?? c.tag ?? c.cow_tag ?? "",
                    name: c.name ?? c.cow_name ?? "—",
                    breed: c.breed ?? "",
                    type: c.type ?? c.cow_type ?? "mature",
                    gender: c.gender ?? "",
                    age: c.age ?? null,
                    isActive: c.isActive ?? c.is_active ?? true,
                    isSold: c.isSold ?? c.is_sold ?? false,
                    healthStatus: h.status,
                    workerName: h.worker_name,
                };
            });

            const hHealthy = merged.filter(r => isHealthy(r.healthStatus)).length;
            const hSick = merged.filter(r => isUnhealthy(r.healthStatus)).length;
            const hNotReported = merged.filter(r => isNotReported(r.healthStatus)).length;
            const hActive = merged.filter(r => r.isActive && !r.isSold).length;

            setSummary({ total: merged.length, active: hActive, healthy: hHealthy, sick: hSick, notReported: hNotReported });
            setAnimals(merged);

        } catch (e: any) {
            if (!silent) console.log("FarmPage fetch error:", e.message);
        } finally {
            if (!silent && isMountedRef.current) {
                setLoading(false);
                setRefreshing(false);
            }
        }
    }, []);
    useEffect(() => {
        if (!isFocused) return;
        isMountedRef.current = true;
        fetchAll(false);
        const interval = setInterval(() => fetchAll(true), 5000);
        return () => {
            clearInterval(interval);
            isMountedRef.current = false;
        };
    }, [isFocused, fetchAll]);

    const onRefresh = () => { setRefreshing(true); fetchAll(false); };

    // ── Filter ─────────────────────────────────────────────────────────────────
    const q = search.toLowerCase().trim();
    const filtered = animals.filter(r => {
        const matchSearch = !q ||
            r.name.toLowerCase().includes(q) ||
            r.tag_number.toLowerCase().includes(q) ||
            r.breed.toLowerCase().includes(q);
        const matchFilter =
            filter === "all" ? true :
                filter === "healthy" ? isHealthy(r.healthStatus) :
                    filter === "unhealthy" ? isUnhealthy(r.healthStatus) :
                        isNotReported(r.healthStatus);
        return matchSearch && matchFilter;
    });

    const FILTERS = [
        { key: "all" as const, label: "All", color: "#6b7280", count: summary.total, icon: "list-outline" },
        { key: "healthy" as const, label: "Healthy", color: "#16a34a", count: summary.healthy, icon: "checkmark-circle-outline" },
        { key: "unhealthy" as const, label: "Sick", color: "#dc2626", count: summary.sick, icon: "alert-circle-outline" },
        { key: "not_reported" as const, label: "No Report", color: "#9ca3af", count: summary.notReported, icon: "ellipse-outline" },
    ];

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <View style={s.screen}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <LinearGradient colors={["#0f1f3d", "#0a1626"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.header}>
                <View style={s.headerGlow} />
                <View style={s.headerTopRow}>
                    <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={20} color="#e8f4f8" />
                    </TouchableOpacity>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={s.headerTitle}>Animals</Text>
                        <Text style={s.headerSub}>{todayLabel}</Text>
                    </View>
                    <TouchableOpacity style={s.refreshBtn} onPress={onRefresh}>
                        <Ionicons name="refresh-outline" size={18} color="#7ca9d4" />
                    </TouchableOpacity>
                </View>
                <StatsStrip
                    total={summary.total}
                    active={summary.active}
                    healthy={summary.healthy}
                    sick={summary.sick}
                    notReported={summary.notReported}
                />
            </LinearGradient>

            {/* Search */}
            <View style={s.searchWrap}>
                <Ionicons name="search-outline" size={15} color="#9ca3af" />
                <TextInput
                    style={s.searchInput}
                    placeholder="Name, tag ya breed se search karein..."
                    placeholderTextColor="#bbb"
                    value={search}
                    onChangeText={setSearch}
                />
                {search.length > 0 && (
                    <TouchableOpacity onPress={() => setSearch("")}>
                        <Ionicons name="close-circle" size={15} color="#9ca3af" />
                    </TouchableOpacity>
                )}
            </View>

            {/* Health filters */}
            <View style={s.filterRow}>
                {FILTERS.map(fl => {
                    const active = filter === fl.key;
                    return (
                        <TouchableOpacity
                            key={fl.key}
                            onPress={() => setFilter(fl.key)}
                            style={[s.chip, active && { backgroundColor: fl.color, borderColor: fl.color }]}
                        >
                            <Ionicons name={fl.icon as any} size={11} color={active ? "#fff" : fl.color} />
                            <Text style={[s.chipText, { color: active ? "#fff" : "#374151" }]}>{fl.label}</Text>
                            <View style={[s.chipBadge, active && { backgroundColor: "rgba(255,255,255,0.25)" }]}>
                                <Text style={[s.chipBadgeText, { color: active ? "#fff" : "#6b7280" }]}>{fl.count}</Text>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* List */}
            {loading ? (
                <View style={s.centered}>
                    <ActivityIndicator size="large" color="#7ca9d4" />
                    <Text style={s.loadingText}>Loading...</Text>
                </View>
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={s.listContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7ca9d4" />}
                    renderItem={({ item, index }) => <AnimalCard item={item} index={index} />}
                    ListEmptyComponent={
                        <View style={s.empty}>
                            <Ionicons name="paw-outline" size={40} color="#d1d5db" />
                            <Text style={s.emptyTitle}>Koi animal nahi mila</Text>
                            <Text style={s.emptySubtitle}>{search ? "Search badlein" : "Koi data nahi hai"}</Text>
                        </View>
                    }
                    ListFooterComponent={<View style={{ height: 40 }} />}
                />
            )}
        </View>
    );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
    screen: { flex: 1, backgroundColor: "#F0F4FF" },
    header: {
        paddingTop: Platform.OS === "ios" ? 56 : (StatusBar.currentHeight ?? 0) + 16,
        paddingHorizontal: 16, paddingBottom: 16, overflow: "hidden",
    },
    headerGlow: {
        position: "absolute", top: -40, right: -40,
        width: 180, height: 180, borderRadius: 90,
        backgroundColor: "#1a4a8a", opacity: 0.15,
    },
    headerTopRow: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
    backBtn: {
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: "#0d2137", borderWidth: 1, borderColor: "#1e3a5f",
        alignItems: "center", justifyContent: "center",
    },
    headerTitle: { fontSize: 17, fontWeight: "800", color: "#e8f4f8" },
    headerSub: { fontSize: 11, color: "#5b8db8", fontWeight: "500", marginTop: 1 },
    refreshBtn: {
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: "#0d2137", borderWidth: 1, borderColor: "#1e3a5f",
        alignItems: "center", justifyContent: "center",
    },
    searchWrap: {
        flexDirection: "row", alignItems: "center",
        marginHorizontal: 14, marginVertical: 10,
        backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#e5e7eb",
        paddingHorizontal: 12, paddingVertical: 10, gap: 8,
    },
    searchInput: { flex: 1, color: "#111827", fontSize: 14 },
    filterRow: { flexDirection: "row", paddingHorizontal: 14, paddingBottom: 8, gap: 6, flexWrap: "wrap" },
    chip: {
        flexDirection: "row", alignItems: "center", gap: 4,
        height: 30, paddingHorizontal: 9, borderRadius: 9,
        backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#e5e7eb",
    },
    chipText: { fontSize: 10, fontWeight: "700" },
    chipBadge: { backgroundColor: "#f3f4f6", borderRadius: 7, paddingHorizontal: 4, paddingVertical: 1 },
    chipBadgeText: { fontSize: 9, fontWeight: "700" },
    listContent: { paddingHorizontal: 14, paddingTop: 4 },
    centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingTop: 60 },
    loadingText: { fontSize: 14, color: "#999" },
    empty: { alignItems: "center", paddingTop: 60, gap: 8 },
    emptyTitle: { fontSize: 16, fontWeight: "800", color: "#374151" },
    emptySubtitle: { fontSize: 13, color: "#9ca3af", fontWeight: "500", textAlign: "center" },
});

const ss = StyleSheet.create({
    strip: {
        flexDirection: "row", backgroundColor: "#0d2137",
        borderRadius: 14, borderWidth: 1, borderColor: "#1e3a5f", overflow: "hidden",
    },
    item: { flex: 1, alignItems: "center", paddingVertical: 10 },
    divider: { width: 1, backgroundColor: "#1e3a5f", marginVertical: 8 },
    val: { fontSize: 15, fontWeight: "800" },
    lbl: { fontSize: 9, color: "#5b8db8", marginTop: 2, fontWeight: "500" },
});

const ac = StyleSheet.create({
    card: {
        backgroundColor: "#fff", borderRadius: 14, padding: 12, marginBottom: 8,
        borderWidth: 1, borderColor: "#e5e7eb",
        shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
    },
    cardHealthy: { borderColor: "#bbf7d0" },
    cardSick: { borderColor: "#fecaca" },
    topRow: { flexDirection: "row", alignItems: "center" },
    avatar: {
        width: 42, height: 42, borderRadius: 11, backgroundColor: "#f9fafb",
        alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#e5e7eb",
    },
    name: { fontSize: 14, fontWeight: "700", color: "#111827" },
    tag: { fontSize: 11, color: "#9ca3af", fontWeight: "500", marginTop: 1 },
    activeBadge: {
        flexDirection: "row", alignItems: "center", gap: 4,
        paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1,
    },
    activeDot: { width: 6, height: 6, borderRadius: 3 },
    activeText: { fontSize: 10, fontWeight: "700" },
    metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 8 },
    chip: {
        flexDirection: "row", alignItems: "center", gap: 3,
        backgroundColor: "#f3f4f6", borderRadius: 7,
        paddingHorizontal: 7, paddingVertical: 3,
    },
    chipText: { fontSize: 10, fontWeight: "600", color: "#6b7280" },
    healthRow: {
        flexDirection: "row", alignItems: "center",
        justifyContent: "space-between", marginTop: 10,
    },
    healthBadge: {
        flexDirection: "row", alignItems: "center", gap: 4,
        paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1,
    },
    healthText: { fontSize: 11, fontWeight: "700" },
    workerRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    workerText: { fontSize: 10, color: "#9ca3af", fontWeight: "500" },
});