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
    Modal,
    RefreshControl,
    TextInput,
    TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { api } from "../../src/services/api";
import Scanner from "../../src/components/Scanner";
import AnimalDetailModal from "../../src/components/AnimalDetailModal";

interface Animal {
    id: string;
    tag_number: string;
    name?: string;
    breed?: string;
    age?: number;
    isActive: boolean;
    isSold: boolean;
    gender?: string;
    weight?: number;
    image_url?: string;
    dob?: string;
    purchase_date?: string;
    purchase_price?: number;
    notes?: string;
}

const IS_IOS = Platform.OS === "ios";
const STATUS_BAR_HEIGHT = IS_IOS ? 0 : (StatusBar.currentHeight ?? 0);

// ── Animal Card ────────────────────────────────────────────────────────────────

function AnimalCard({
    animal,
    index,
    onPress,
}: {
    animal: Animal;
    index: number;
    onPress: (animal: Animal) => void;
}) {
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(20)).current;
    const scale = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(opacity, { toValue: 1, duration: 300, delay: index * 50, useNativeDriver: true }),
            Animated.spring(translateY, { toValue: 0, delay: index * 50, tension: 80, friction: 11, useNativeDriver: true }),
        ]).start();
    }, []);

    const statusColor = animal.isSold ? "#dc2626" : animal.isActive ? "#16a34a" : "#f59e0b";
    const statusLabel = animal.isSold ? "Sold" : animal.isActive ? "Active" : "Inactive";

    const handlePressIn = () =>
        Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, tension: 200, friction: 10 }).start();
    const handlePressOut = () =>
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 10 }).start();

    return (
        <Animated.View style={[s.card, { opacity, transform: [{ translateY }, { scale }] }]}>
            <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => onPress(animal)}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                style={s.cardTouch}
            >
                <LinearGradient colors={["#1a2e4a", "#0f1f3d"]} style={s.tagBadge} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                    <Ionicons name="paw" size={12} color="#7ca9d4" />
                    <Text style={s.tagText}>{animal.tag_number}</Text>
                </LinearGradient>
                <View style={s.info}>
                    <Text style={s.name}>{animal.name || "—"}</Text>
                    <View style={s.metaRow}>
                        {animal.breed ? (
                            <View style={s.chip}>
                                <Text style={s.chipText}>{animal.breed}</Text>
                            </View>
                        ) : null}
                        {animal.gender ? (
                            <View style={[s.chip, { backgroundColor: animal.gender === "Male" ? "#eff6ff" : "#fdf4ff" }]}>
                                <Ionicons name={animal.gender === "Male" ? "male" : "female"} size={10} color={animal.gender === "Male" ? "#1a4a8a" : "#7c3aed"} />
                                <Text style={[s.chipText, { color: animal.gender === "Male" ? "#1a4a8a" : "#7c3aed" }]}>{animal.gender}</Text>
                            </View>
                        ) : null}
                        {animal.age ? (
                            <View style={s.chip}>
                                <Text style={s.chipText}>{animal.age} yrs</Text>
                            </View>
                        ) : null}
                    </View>
                </View>
                <View style={s.right}>
                    <View style={[s.status, { backgroundColor: statusColor + "22" }]}>
                        <View style={[s.statusDot, { backgroundColor: statusColor }]} />
                        <Text style={[s.statusText, { color: statusColor }]}>{statusLabel}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={14} color="#ccc" style={{ marginTop: 4 }} />
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function CowPage() {
    const router = useRouter();
    const [animals, setAnimals] = useState<Animal[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [showScanner, setShowScanner] = useState(false);
    const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
    const [showDetail, setShowDetail] = useState(false);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.vetGetCows();
            setAnimals(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error("CowPage load error:", e);
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
    const filtered = animals.filter((a) =>
        !q ||
        a.tag_number.toLowerCase().includes(q) ||
        (a.name || "").toLowerCase().includes(q) ||
        (a.breed || "").toLowerCase().includes(q)
    );

    const totalAnimals = animals.length;
    const activeAnimals = animals.filter((a) => a.isActive && !a.isSold).length;

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
                    <Text style={s.headerTitle}>Animals</Text>
                    <TouchableOpacity style={s.headerActionBtn} onPress={() => setShowScanner(true)}>
                        <Ionicons name="qr-code-outline" size={20} color="#7ca9d4" />
                    </TouchableOpacity>
                </View>

                {/* Stats */}
                <View style={s.statsStrip}>
                    <View style={s.statItem}>
                        <Text style={s.statValue}>{totalAnimals}</Text>
                        <Text style={s.statLabel}>Total</Text>
                    </View>
                    <View style={s.statDivider} />
                    <View style={s.statItem}>
                        <Text style={[s.statValue, { color: "#4ade80" }]}>{activeAnimals}</Text>
                        <Text style={s.statLabel}>Active</Text>
                    </View>
                    <View style={s.statDivider} />
                    <View style={s.statItem}>
                        <Text style={[s.statValue, { color: "#f87171" }]}>{animals.filter(a => a.isSold).length}</Text>
                        <Text style={s.statLabel}>Sold</Text>
                    </View>
                </View>
            </LinearGradient>

            {/* Search */}
            <View style={s.searchRow}>
                <View style={s.searchBox}>
                    <Ionicons name="search-outline" size={16} color="#bbb" />
                    <TextInput
                        style={s.searchInput}
                        placeholder="Tag, naam, breed se search karein..."
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

            {/* List */}
            {loading ? (
                <View style={s.centered}>
                    <ActivityIndicator size="large" color="#1a4a8a" />
                    <Text style={s.loadingText}>Loading...</Text>
                </View>
            ) : filtered.length === 0 ? (
                <View style={s.centered}>
                    <LinearGradient colors={["#1a2e4a", "#0f1f3d"]} style={s.emptyIconBox}>
                        <Ionicons name="paw-outline" size={32} color="#7ca9d4" />
                    </LinearGradient>
                    <Text style={s.emptyTitle}>Koi animal nahi mila</Text>
                    <Text style={s.emptySubtitle}>Search ya filter badlein</Text>
                </View>
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={(a) => a.id}
                    renderItem={({ item, index }) => (
                        <AnimalCard
                            animal={item}
                            index={index}
                            onPress={(a) => { setSelectedAnimal(a); setShowDetail(true); }}
                        />
                    )}
                    contentContainerStyle={s.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1a4a8a" />}
                    ListFooterComponent={<View style={{ height: 40 }} />}
                />
            )}

            {/* QR Scanner Modal */}
            <Modal visible={showScanner} animationType="slide">
                <Scanner
                    title="Scan Animal Tag"
                    subtitle="Scan the QR code on animal's ear tag"
                    onScanned={(data) => {
                        setShowScanner(false);
                        router.push({ pathname: "/(veterinary)/scanner-result", params: { data } } as any);
                    }}
                    onClose={() => setShowScanner(false)}
                />
            </Modal>

            {/* Animal Detail Modal */}
            <AnimalDetailModal
                visible={showDetail}
                animal={selectedAnimal}
                onClose={() => setShowDetail(false)}
            />
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
    headerActionBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: "#0d2137", borderWidth: 1,
        borderColor: "#1e3a5f", alignItems: "center", justifyContent: "center",
    },
    statsStrip: {
        flexDirection: "row", backgroundColor: "#0d2137",
        borderRadius: 16, borderWidth: 1, borderColor: "#1e3a5f", overflow: "hidden",
    },
    statItem: { flex: 1, alignItems: "center", paddingVertical: 10 },
    statDivider: { width: 1, backgroundColor: "#1e3a5f", marginVertical: 8 },
    statValue: { fontSize: 16, fontWeight: "800", color: "#e8f4f8" },
    statLabel: { fontSize: 10, color: "#5b8db8", marginTop: 2, fontWeight: "500" },
    searchRow: {
        paddingHorizontal: 16, paddingVertical: 10,
        backgroundColor: "#fff",
        borderBottomWidth: 1, borderBottomColor: "#eef0f5",
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

    /* Card */
    card: {
        backgroundColor: "#fff", borderRadius: 16, marginBottom: 10,
        shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    },
    cardTouch: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
    tagBadge: {
        borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8,
        alignItems: "center", justifyContent: "center", minWidth: 60, gap: 4,
    },
    tagText: { fontSize: 12, fontWeight: "800", color: "#e8f4f8", letterSpacing: 0.5 },
    info: { flex: 1, gap: 6 },
    name: { fontSize: 15, fontWeight: "700", color: "#1a1a1a" },
    metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
    chip: {
        flexDirection: "row", alignItems: "center", gap: 3,
        backgroundColor: "#f0f4ff", borderRadius: 8,
        paddingHorizontal: 7, paddingVertical: 3,
    },
    chipText: { fontSize: 11, fontWeight: "600", color: "#1a4a8a" },
    right: { alignItems: "center", gap: 2 },
    status: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5, alignItems: "center", gap: 3 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusText: { fontSize: 11, fontWeight: "700" },
});