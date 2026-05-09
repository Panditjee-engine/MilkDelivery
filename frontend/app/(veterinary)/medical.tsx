import React, { useState, useRef, useEffect, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    StatusBar,
    Platform,
    Animated,
    RefreshControl,
    TextInput,
    TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { api } from "../../src/services/api";

// ── Types ──────────────────────────────────────────────────────────────────────

interface MedicineRecord {
    id: string;
    animal_id: string;
    animal_name?: string;
    tag_number?: string;
    medicine_name: string;
    dosage?: string;
    administered_by?: string;
    date: string;
    notes?: string;
    next_due?: string;
}

interface InseminationRecord {
    id: string;
    animal_id?: string;
    cow_id?: string;
    animal_name?: string;
    cow_name?: string;
    tag_number?: string;
    bull_name?: string;
    semen_type?: string;
    insemination_date?: string;
    date?: string;
    result?: string;
    notes?: string;
    performed_by?: string;
    worker_name?: string;
}

interface SemenRecord {
    id: string;
    bull_name?: string;
    breed?: string;
    semen_id?: string;
    batch_number?: string;
    quantity?: number;
    unit?: string;
    date?: string;
    expiry_date?: string;
    notes?: string;
    supplier?: string;
}

type MedicalSubTab = "medicine" | "insemination" | "semen";

const IS_IOS = Platform.OS === "ios";
const STATUS_BAR_HEIGHT = IS_IOS ? 0 : (StatusBar.currentHeight ?? 0);

function formatDate(dateStr?: string) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// ── Medicine Card ──────────────────────────────────────────────────────────────

function MedicineCard({ record, index }: { record: MedicineRecord; index: number }) {
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(20)).current;
    useEffect(() => {
        Animated.parallel([
            Animated.timing(opacity, { toValue: 1, duration: 300, delay: index * 50, useNativeDriver: true }),
            Animated.spring(translateY, { toValue: 0, delay: index * 50, tension: 80, friction: 11, useNativeDriver: true }),
        ]).start();
    }, []);

    return (
        <Animated.View style={[card.base, { opacity, transform: [{ translateY }] }]}>
            <View style={[card.iconBox, { backgroundColor: "#f5f3ff" }]}>
                <Ionicons name="medical" size={18} color="#7c3aed" />
            </View>
            <View style={card.info}>
                <Text style={card.title}>{record.medicine_name}</Text>
                <View style={card.metaRow}>
                    <View style={card.animalChip}>
                        <Ionicons name="paw" size={10} color="#1a4a8a" />
                        <Text style={card.animalChipText}>{record.animal_name || record.tag_number || "—"}</Text>
                    </View>
                    {record.dosage ? (
                        <View style={[card.chip, { backgroundColor: "#f5f3ff" }]}>
                            <Text style={[card.chipText, { color: "#7c3aed" }]}>{record.dosage}</Text>
                        </View>
                    ) : null}
                </View>
                {record.notes ? <Text style={card.notes} numberOfLines={2}>{record.notes}</Text> : null}
                <View style={card.footer}>
                    <Ionicons name="calendar-outline" size={10} color="#aaa" />
                    <Text style={card.dateText}>{formatDate(record.date)}</Text>
                    {record.next_due ? (
                        <>
                            <View style={card.sep} />
                            <Ionicons name="alarm-outline" size={10} color="#f59e0b" />
                            <Text style={[card.dateText, { color: "#f59e0b" }]}>Due: {formatDate(record.next_due)}</Text>
                        </>
                    ) : null}
                </View>
            </View>
        </Animated.View>
    );
}

// ── Insemination Card ──────────────────────────────────────────────────────────

function InseminationCard({ record, index }: { record: InseminationRecord; index: number }) {
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(20)).current;
    useEffect(() => {
        Animated.parallel([
            Animated.timing(opacity, { toValue: 1, duration: 300, delay: index * 50, useNativeDriver: true }),
            Animated.spring(translateY, { toValue: 0, delay: index * 50, tension: 80, friction: 11, useNativeDriver: true }),
        ]).start();
    }, []);

    const resultColor =
        record.result === "Pregnant" || record.result === "Success" ? "#16a34a"
        : record.result === "Failed" || record.result === "Negative" ? "#dc2626"
        : "#f59e0b";

    return (
        <Animated.View style={[card.base, { opacity, transform: [{ translateY }] }]}>
            <View style={[card.iconBox, { backgroundColor: "#fff7ed" }]}>
                <Ionicons name="heart" size={18} color="#e27f2d" />
            </View>
            <View style={card.info}>
                <Text style={card.title}>{record.animal_name || record.cow_name || "—"}</Text>
                <View style={card.metaRow}>
                    {record.tag_number ? (
                        <View style={card.animalChip}>
                            <Ionicons name="paw" size={10} color="#1a4a8a" />
                            <Text style={card.animalChipText}>{record.tag_number}</Text>
                        </View>
                    ) : null}
                    {record.bull_name ? (
                        <View style={[card.chip, { backgroundColor: "#eff6ff" }]}>
                            <Ionicons name="male" size={10} color="#1a4a8a" />
                            <Text style={[card.chipText, { color: "#1a4a8a" }]}>{record.bull_name}</Text>
                        </View>
                    ) : null}
                    {record.semen_type ? (
                        <View style={[card.chip, { backgroundColor: "#fff7ed" }]}>
                            <Text style={[card.chipText, { color: "#e27f2d" }]}>{record.semen_type}</Text>
                        </View>
                    ) : null}
                    {record.result ? (
                        <View style={[card.chip, { backgroundColor: resultColor + "22" }]}>
                            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: resultColor }} />
                            <Text style={[card.chipText, { color: resultColor }]}>{record.result}</Text>
                        </View>
                    ) : null}
                </View>
                {record.performed_by || record.worker_name ? (
                    <View style={card.workerRow}>
                        <Ionicons name="person-outline" size={10} color="#aaa" />
                        <Text style={card.workerText}>{record.performed_by || record.worker_name}</Text>
                    </View>
                ) : null}
                {record.notes ? <Text style={card.notes} numberOfLines={2}>{record.notes}</Text> : null}
                <View style={card.footer}>
                    <Ionicons name="calendar-outline" size={10} color="#aaa" />
                    <Text style={card.dateText}>{formatDate(record.insemination_date || record.date)}</Text>
                </View>
            </View>
        </Animated.View>
    );
}

// ── Semen Card ─────────────────────────────────────────────────────────────────

function SemenCard({ record, index }: { record: SemenRecord; index: number }) {
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(20)).current;
    useEffect(() => {
        Animated.parallel([
            Animated.timing(opacity, { toValue: 1, duration: 300, delay: index * 50, useNativeDriver: true }),
            Animated.spring(translateY, { toValue: 0, delay: index * 50, tension: 80, friction: 11, useNativeDriver: true }),
        ]).start();
    }, []);

    return (
        <Animated.View style={[card.base, { opacity, transform: [{ translateY }] }]}>
            <View style={[card.iconBox, { backgroundColor: "#ecfeff" }]}>
                <Ionicons name="flask" size={18} color="#0891b2" />
            </View>
            <View style={card.info}>
                <Text style={card.title}>{record.bull_name || "Unknown Bull"}</Text>
                <View style={card.metaRow}>
                    {record.breed ? (
                        <View style={[card.chip, { backgroundColor: "#f0f4ff" }]}>
                            <Text style={[card.chipText, { color: "#1a4a8a" }]}>{record.breed}</Text>
                        </View>
                    ) : null}
                    {record.semen_id || record.batch_number ? (
                        <View style={[card.chip, { backgroundColor: "#ecfeff" }]}>
                            <Ionicons name="barcode-outline" size={10} color="#0891b2" />
                            <Text style={[card.chipText, { color: "#0891b2" }]}>{record.semen_id || record.batch_number}</Text>
                        </View>
                    ) : null}
                    {record.quantity !== undefined ? (
                        <View style={[card.chip, { backgroundColor: "#ecfeff" }]}>
                            <Text style={[card.chipText, { color: "#0891b2", fontWeight: "700" }]}>
                                {record.quantity} {record.unit || "doses"}
                            </Text>
                        </View>
                    ) : null}
                </View>
                {record.supplier ? (
                    <View style={card.workerRow}>
                        <Ionicons name="business-outline" size={10} color="#aaa" />
                        <Text style={card.workerText}>{record.supplier}</Text>
                    </View>
                ) : null}
                {record.notes ? <Text style={card.notes} numberOfLines={2}>{record.notes}</Text> : null}
                <View style={card.footer}>
                    <Ionicons name="calendar-outline" size={10} color="#aaa" />
                    <Text style={card.dateText}>{formatDate(record.date)}</Text>
                    {record.expiry_date ? (
                        <>
                            <View style={card.sep} />
                            <Ionicons name="alarm-outline" size={10} color="#dc2626" />
                            <Text style={[card.dateText, { color: "#dc2626" }]}>Exp: {formatDate(record.expiry_date)}</Text>
                        </>
                    ) : null}
                </View>
            </View>
        </Animated.View>
    );
}

// ── Shared Card Styles ─────────────────────────────────────────────────────────

const card = StyleSheet.create({
    base: {
        flexDirection: "row", backgroundColor: "#fff", borderRadius: 16,
        padding: 14, marginBottom: 10,
        shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
        gap: 12, alignItems: "flex-start",
    },
    iconBox: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center", marginTop: 1 },
    info: { flex: 1, gap: 5 },
    title: { fontSize: 15, fontWeight: "700", color: "#1a1a1a" },
    metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    animalChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#eff6ff", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    animalChipText: { fontSize: 11, fontWeight: "600", color: "#1a4a8a" },
    chip: { flexDirection: "row", alignItems: "center", gap: 3, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    chipText: { fontSize: 11, fontWeight: "600" },
    workerRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    workerText: { fontSize: 11, color: "#aaa", fontWeight: "500" },
    notes: { fontSize: 12, color: "#888", lineHeight: 16 },
    footer: { flexDirection: "row", alignItems: "center", gap: 4 },
    dateText: { fontSize: 11, color: "#aaa", fontWeight: "500" },
    sep: { width: 1, height: 10, backgroundColor: "#e0e0e0", marginHorizontal: 4 },
});

// ── Sub-tab config ─────────────────────────────────────────────────────────────

const SUB_CONFIG = {
    medicine:     { color: "#7c3aed", bg: "#f5f3ff", icon: "medical-outline" as const,   label: "Medicine" },
    insemination: { color: "#e27f2d", bg: "#fff7ed", icon: "heart-outline" as const,      label: "Insemination" },
    semen:        { color: "#0891b2", bg: "#ecfeff", icon: "flask-outline" as const,      label: "Semen" },
};

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function MedicalPage() {
    const router = useRouter();
    const [subTab, setSubTab] = useState<MedicalSubTab>("medicine");
    const [medicineRecords, setMedicineRecords] = useState<MedicineRecord[]>([]);
    const [inseminationRecords, setInseminationRecords] = useState<InseminationRecord[]>([]);
    const [semenRecords, setSemenRecords] = useState<SemenRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [meds, insem, semen] = await Promise.all([
                api.getVetMedicineRecords().catch(() => []),
                (api.getVetInseminationRecords ? api.getVetInseminationRecords() : Promise.resolve([])).catch(() => []),
                (api.getVetSemenRecords ? api.getVetSemenRecords() : Promise.resolve([])).catch(() => []),
            ]);
            setMedicineRecords(Array.isArray(meds) ? meds : []);
            setInseminationRecords(Array.isArray(insem) ? insem : []);
            setSemenRecords(Array.isArray(semen) ? semen : []);
        } catch (e) {
            console.error("MedicalPage load error:", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, []);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    }, []);

    const q = searchQuery.toLowerCase().trim();

    const filteredMedicine = medicineRecords.filter((m) =>
        !q || m.medicine_name.toLowerCase().includes(q) ||
        (m.animal_name || "").toLowerCase().includes(q) ||
        (m.tag_number || "").toLowerCase().includes(q)
    );
    const filteredInsem = inseminationRecords.filter((r) =>
        !q || (r.animal_name || "").toLowerCase().includes(q) ||
        (r.cow_name || "").toLowerCase().includes(q) ||
        (r.tag_number || "").toLowerCase().includes(q) ||
        (r.bull_name || "").toLowerCase().includes(q)
    );
    const filteredSemen = semenRecords.filter((r) =>
        !q || (r.bull_name || "").toLowerCase().includes(q) ||
        (r.breed || "").toLowerCase().includes(q) ||
        (r.semen_id || "").toLowerCase().includes(q)
    );

    const cfg = SUB_CONFIG[subTab];

    const renderEmpty = (icon: any, title: string) => (
        <View style={s.centered}>
            <LinearGradient colors={["#1a2e4a", "#0f1f3d"]} style={s.emptyIconBox}>
                <Ionicons name={icon} size={32} color="#7ca9d4" />
            </LinearGradient>
            <Text style={s.emptyTitle}>{title}</Text>
            <Text style={s.emptySubtitle}>No Record Found</Text>
        </View>
    );

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
                    <Text style={s.headerTitle}>Medical Records</Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* Stats strip */}
                <View style={s.statsStrip}>
                    <View style={s.statItem}>
                        <Text style={s.statValue}>{medicineRecords.length}</Text>
                        <Text style={s.statLabel}>Medicine</Text>
                    </View>
                    <View style={s.statDivider} />
                    <View style={s.statItem}>
                        <Text style={[s.statValue, { color: "#fdba74" }]}>{inseminationRecords.length}</Text>
                        <Text style={s.statLabel}>Insemination</Text>
                    </View>
                    <View style={s.statDivider} />
                    <View style={s.statItem}>
                        <Text style={[s.statValue, { color: "#67e8f9" }]}>{semenRecords.length}</Text>
                        <Text style={s.statLabel}>Semen</Text>
                    </View>
                </View>
            </LinearGradient>

            {/* Sub-tabs */}
            <View style={s.subTabRow}>
                {(["medicine", "insemination", "semen"] as MedicalSubTab[]).map((t) => {
                    const c = SUB_CONFIG[t];
                    const isActive = subTab === t;
                    return (
                        <TouchableOpacity
                            key={t}
                            style={[s.subTab, isActive && { backgroundColor: c.bg, borderColor: c.color + "44" }]}
                            onPress={() => setSubTab(t)}
                        >
                            <Ionicons name={c.icon} size={13} color={isActive ? c.color : "#aaa"} />
                            <Text style={[s.subTabText, { color: isActive ? c.color : "#aaa" }]}>{c.label}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Search */}
            <View style={s.searchRow}>
                <View style={s.searchBox}>
                    <Ionicons name="search-outline" size={16} color="#bbb" />
                    <TextInput
                        style={s.searchInput}
                        placeholder="Animal, medicine, bull se search..."
                        placeholderTextColor="#bbb"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery("")}>
                            <Ionicons name="close-circle" size={16} color="#bbb" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Content */}
            {loading ? (
                <View style={s.centered}>
                    <ActivityIndicator size="large" color={cfg.color} />
                    <Text style={s.loadingText}>Loading...</Text>
                </View>
            ) : subTab === "medicine" ? (
                filteredMedicine.length === 0 ? renderEmpty("medical-outline", "No Medicine Records") :
                <FlatList
                    data={filteredMedicine}
                    keyExtractor={(m) => m.id}
                    renderItem={({ item, index }) => <MedicineCard record={item} index={index} />}
                    contentContainerStyle={s.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7c3aed" />}
                    ListFooterComponent={<View style={{ height: 40 }} />}
                />
            ) : subTab === "insemination" ? (
                filteredInsem.length === 0 ? renderEmpty("heart-outline", "No Insemination Records") :
                <FlatList
                    data={filteredInsem}
                    keyExtractor={(r) => r.id}
                    renderItem={({ item, index }) => <InseminationCard record={item} index={index} />}
                    contentContainerStyle={s.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e27f2d" />}
                    ListFooterComponent={<View style={{ height: 40 }} />}
                />
            ) : (
                filteredSemen.length === 0 ? renderEmpty("flask-outline", "No Semen Records") :
                <FlatList
                    data={filteredSemen}
                    keyExtractor={(r) => r.id}
                    renderItem={({ item, index }) => <SemenCard record={item} index={index} />}
                    contentContainerStyle={s.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0891b2" />}
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
        paddingTop: IS_IOS ? 56 : STATUS_BAR_HEIGHT + 16,
        paddingHorizontal: 20, paddingBottom: 20, overflow: "hidden",
    },
    headerGlow: {
        position: "absolute", top: -40, right: -40,
        width: 180, height: 180, borderRadius: 90,
        backgroundColor: "#1a4a8a", opacity: 0.15,
    },
    headerTopRow: {
        flexDirection: "row", alignItems: "center",
        justifyContent: "space-between", marginBottom: 16,
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: "#0d2137", borderWidth: 1,
        borderColor: "#1e3a5f", alignItems: "center", justifyContent: "center",
    },
    headerTitle: { fontSize: 18, fontWeight: "800", color: "#e8f4f8" },
    statsStrip: {
        flexDirection: "row", backgroundColor: "#0d2137",
        borderRadius: 16, borderWidth: 1, borderColor: "#1e3a5f", overflow: "hidden",
    },
    statItem: { flex: 1, alignItems: "center", paddingVertical: 10 },
    statDivider: { width: 1, backgroundColor: "#1e3a5f", marginVertical: 8 },
    statValue: { fontSize: 16, fontWeight: "800", color: "#e8f4f8" },
    statLabel: { fontSize: 10, color: "#5b8db8", marginTop: 2, fontWeight: "500" },
    subTabRow: {
        flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingVertical: 10,
        backgroundColor: "#f8faff", borderBottomWidth: 1, borderBottomColor: "#eef0f5",
    },
    subTab: {
        flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
        gap: 4, paddingVertical: 8, borderRadius: 12,
        borderWidth: 1, borderColor: "transparent", backgroundColor: "#f0f4ff",
    },
    subTabText: { fontSize: 11, fontWeight: "700" },
    searchRow: {
        paddingHorizontal: 16, paddingVertical: 10,
        backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#eef0f5",
    },
    searchBox: {
        flexDirection: "row", alignItems: "center",
        backgroundColor: "#f0f4ff", borderRadius: 12,
        paddingHorizontal: 12, paddingVertical: 9, gap: 8,
    },
    searchInput: { flex: 1, fontSize: 14, color: "#1a1a1a" },
    listContent: { padding: 16 },
    centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
    loadingText: { fontSize: 14, color: "#999" },
    emptyIconBox: { width: 72, height: 72, borderRadius: 22, alignItems: "center", justifyContent: "center" },
    emptyTitle: { fontSize: 18, fontWeight: "800", color: "#1a1a1a" },
    emptySubtitle: { fontSize: 14, color: "#999", textAlign: "center" },
});