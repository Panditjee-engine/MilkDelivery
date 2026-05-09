// src/components/AnimalDetailModal.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Fix: Promise.allSettled so one 404 doesn't crash everything
//      Graceful empty states when endpoints don't exist yet on backend
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
    View,
    Text,
    Modal,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Animated,
    ActivityIndicator,
    TextInput,
    Alert,
    Platform,
    KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { api } from "../services/api";

// ── Types ──────────────────────────────────────────────────────────────────────

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

interface HealthRecord {
    id: string;
    cow_id: string;
    cow_name?: string;
    tag_number?: string;
    condition?: string;
    temperature?: number;
    notes?: string;
    date: string;
    worker_name?: string;
}

interface MilkRecord {
    id: string;
    cow_id: string;
    morning?: number;
    evening?: number;
    total?: number;
    date: string;
    worker_name?: string;
}

interface FeedRecord {
    id: string;
    cow_id: string;
    feed_type?: string;
    quantity?: number;
    unit?: string;
    date: string;
    shift?: string;
    worker_name?: string;
}

interface Props {
    visible: boolean;
    animal: Animal | null;
    onClose: () => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(dateStr?: string) {
    if (!dateStr) return "—";
    try {
        return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    } catch { return "—"; }
}

function todayStr() {
    return new Date().toISOString().split("T")[0];
}

// Safe array extractor — handles any shape from backend
function safeArray(result: PromiseSettledResult<any>): any[] {
    if (result.status === "rejected") return [];
    const val = result.value;
    if (Array.isArray(val)) return val;
    // Some backends wrap in { data: [...] } or { records: [...] }
    if (val && Array.isArray(val.data)) return val.data;
    if (val && Array.isArray(val.records)) return val.records;
    return [];
}

// ── Edit Medicine Modal ────────────────────────────────────────────────────────

interface EditMedicineModalProps {
    visible: boolean;
    record: MedicineRecord | null;
    onClose: () => void;
    onSaved: () => void;
}

function EditMedicineModal({ visible, record, onClose, onSaved }: EditMedicineModalProps) {
    const [form, setForm] = useState({
        medicine_name: "",
        dosage: "",
        administered_by: "",
        notes: "",
        next_due: "",
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (record) {
            setForm({
                medicine_name: record.medicine_name || "",
                dosage: record.dosage || "",
                administered_by: record.administered_by || "",
                notes: record.notes || "",
                next_due: record.next_due || "",
            });
        }
    }, [record]);

    const handleSave = async () => {
        if (!record) return;
        if (!form.medicine_name.trim()) {
            Alert.alert("Error", "Medicine name zaroori hai");
            return;
        }
        setSaving(true);
        try {
            await api.updateMedicineRecord(record.id, form);
            onSaved();
            onClose();
        } catch (e: any) {
            Alert.alert("Error", e?.message || "Record update nahi hua");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="slide">
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
                <View style={em.overlay}>
                    <View style={em.sheet}>
                        <View style={em.sheetHeader}>
                            <Text style={em.sheetTitle}>Medicine Record Edit Karein</Text>
                            <TouchableOpacity onPress={onClose} style={em.closeBtn}>
                                <Ionicons name="close" size={20} color="#666" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {[
                                { key: "medicine_name", label: "Medicine Name *", placeholder: "e.g. Penicillin" },
                                { key: "dosage", label: "Dosage", placeholder: "e.g. 10ml / 2 tablets" },
                                { key: "administered_by", label: "Administered By", placeholder: "Doctor / Worker naam" },
                                { key: "next_due", label: "Next Due Date (YYYY-MM-DD)", placeholder: "e.g. 2025-09-01" },
                            ].map(({ key, label, placeholder }) => (
                                <View key={key} style={em.fieldGroup}>
                                    <Text style={em.label}>{label}</Text>
                                    <TextInput
                                        style={em.input}
                                        value={(form as any)[key]}
                                        onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))}
                                        placeholder={placeholder}
                                        placeholderTextColor="#bbb"
                                    />
                                </View>
                            ))}
                            <View style={em.fieldGroup}>
                                <Text style={em.label}>Notes</Text>
                                <TextInput
                                    style={[em.input, em.textarea]}
                                    value={form.notes}
                                    onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))}
                                    placeholder="Additional notes..."
                                    placeholderTextColor="#bbb"
                                    multiline
                                    numberOfLines={3}
                                    textAlignVertical="top"
                                />
                            </View>
                            <TouchableOpacity
                                style={[em.saveBtn, saving && { opacity: 0.7 }]}
                                onPress={handleSave}
                                disabled={saving}
                            >
                                {saving ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <>
                                        <Ionicons name="checkmark-circle" size={18} color="#fff" />
                                        <Text style={em.saveBtnText}>Save Changes</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const em = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
    sheet: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "85%", paddingBottom: 40 },
    sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
    sheetTitle: { fontSize: 18, fontWeight: "800", color: "#1a1a1a" },
    closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#f0f0f0", alignItems: "center", justifyContent: "center" },
    fieldGroup: { marginBottom: 14 },
    label: { fontSize: 12, fontWeight: "700", color: "#555", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
    input: { backgroundColor: "#f5f7ff", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: "#1a1a1a", borderWidth: 1, borderColor: "#e8edf5" },
    textarea: { height: 80, paddingTop: 11 },
    saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#1a4a8a", borderRadius: 14, paddingVertical: 14, marginTop: 8 },
    saveBtnText: { fontSize: 15, fontWeight: "800", color: "#fff" },
});

// ── Section Header ─────────────────────────────────────────────────────────────

function SectionHeader({ icon, title, color }: { icon: any; title: string; color: string }) {
    return (
        <View style={sh.row}>
            <View style={[sh.iconBox, { backgroundColor: color + "18" }]}>
                <Ionicons name={icon} size={14} color={color} />
            </View>
            <Text style={sh.title}>{title}</Text>
            <View style={[sh.line, { backgroundColor: color + "22" }]} />
        </View>
    );
}
const sh = StyleSheet.create({
    row: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10, marginTop: 18 },
    iconBox: { width: 28, height: 28, borderRadius: 9, alignItems: "center", justifyContent: "center" },
    title: { fontSize: 13, fontWeight: "800", color: "#333", textTransform: "uppercase", letterSpacing: 0.6 },
    line: { flex: 1, height: 1.5, borderRadius: 1 },
});

// ── Info Row ───────────────────────────────────────────────────────────────────

function InfoRow({ icon, label, value, color }: { icon: any; label: string; value: string; color?: string }) {
    return (
        <View style={ir.row}>
            <Ionicons name={icon} size={13} color="#aaa" style={{ marginTop: 1 }} />
            <Text style={ir.label}>{label}</Text>
            <Text style={[ir.value, color ? { color } : {}]}>{value || "—"}</Text>
        </View>
    );
}
const ir = StyleSheet.create({
    row: { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#f0f2f8" },
    label: { fontSize: 13, color: "#888", width: 110, fontWeight: "500" },
    value: { flex: 1, fontSize: 13, color: "#1a1a1a", fontWeight: "700", textAlign: "right" },
});

// ── Endpoint Status Banner ─────────────────────────────────────────────────────
// Shows when backend endpoint is missing — helps during development

function EndpointMissingNote({ section }: { section: string }) {
    return (
        <View style={ep.box}>
            <Ionicons name="cloud-offline-outline" size={16} color="#f59e0b" />
            <Text style={ep.text}>Backend endpoint missing: {section}</Text>
        </View>
    );
}
const ep = StyleSheet.create({
    box: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fffbeb", borderRadius: 10, padding: 10, borderWidth: 1, borderColor: "#fde68a", marginBottom: 8 },
    text: { fontSize: 11, color: "#92400e", fontWeight: "600", flex: 1 },
});

// ── Main Modal ─────────────────────────────────────────────────────────────────

export default function AnimalDetailModal({ visible, animal, onClose }: Props) {
    const slideAnim = useRef(new Animated.Value(800)).current;

    const [loading, setLoading] = useState(true);
    const [medicineRecords, setMedicineRecords] = useState<MedicineRecord[]>([]);
    const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([]);
    const [milkRecords, setMilkRecords] = useState<MilkRecord[]>([]);
    const [feedRecords, setFeedRecords] = useState<FeedRecord[]>([]);

    // Track which endpoints failed (404) so we can show helpful notes
    const [failedEndpoints, setFailedEndpoints] = useState<Set<string>>(new Set());

    const [editRecord, setEditRecord] = useState<MedicineRecord | null>(null);
    const [showEdit, setShowEdit] = useState(false);

    useEffect(() => {
        if (visible) {
            Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 14, useNativeDriver: true }).start();
        } else {
            Animated.timing(slideAnim, { toValue: 800, duration: 250, useNativeDriver: true }).start();
        }
    }, [visible]);

    const loadAnimalData = useCallback(async () => {
        if (!animal) return;
        setLoading(true);
        setFailedEndpoints(new Set());

        // ── KEY FIX: Promise.allSettled so one 404 doesn't crash all ──
        const [medsResult, healthResult, milkResult, feedResult] = await Promise.allSettled([
            api.getAnimalMedicineRecords(animal.id),
            api.getAnimalHealthRecords(animal.id),
            api.getAnimalMilkRecords(animal.id),
            api.getAnimalFeedRecords(animal.id),
        ]);

        // Track which ones failed
        const failed = new Set<string>();
        const isNotFound = (r: PromiseSettledResult<any>) =>
            r.status === "rejected" &&
            (r.reason?.message === "Not Found" || r.reason?.message?.includes("404") || r.reason?.message?.includes("not found"));

        if (isNotFound(medsResult)) failed.add("medicine");
        if (isNotFound(healthResult)) failed.add("health");
        if (isNotFound(milkResult)) failed.add("milk");
        if (isNotFound(feedResult)) failed.add("feed");

        // Log non-404 errors
        [medsResult, healthResult, milkResult, feedResult].forEach((r, i) => {
            if (r.status === "rejected" && !isNotFound(r)) {
                const names = ["medicine", "health", "milk", "feed"];
                console.warn(`AnimalDetail [${names[i]}] error:`, r.reason?.message);
            }
        });

        setMedicineRecords(safeArray(medsResult));
        setHealthRecords(safeArray(healthResult));
        setMilkRecords(safeArray(milkResult));
        setFeedRecords(safeArray(feedResult));
        setFailedEndpoints(failed);
        setLoading(false);
    }, [animal]);

    useEffect(() => {
        if (visible && animal) loadAnimalData();
    }, [visible, animal]);

    if (!animal) return null;

    // Determine health status from latest health record
    const latestHealth = [...healthRecords].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    const isHealthy = !latestHealth?.condition ||
        latestHealth.condition.toLowerCase() === "healthy" ||
        latestHealth.condition.toLowerCase() === "normal";
    const healthColor = isHealthy ? "#16a34a" : "#dc2626";

    const statusColor = animal.isSold ? "#dc2626" : animal.isActive ? "#16a34a" : "#f59e0b";
    const statusLabel = animal.isSold ? "Sold" : animal.isActive ? "Active" : "Inactive";

    const todayMilk = milkRecords.filter((m) => m.date?.startsWith(todayStr()));
    const totalTodayMilk = todayMilk.reduce((s, m) => s + (m.total || 0), 0);

    const recentMilk = [...milkRecords]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
            <View style={d.overlay}>
                <TouchableOpacity style={d.backdrop} activeOpacity={1} onPress={onClose} />

                <Animated.View style={[d.sheet, { transform: [{ translateY: slideAnim }] }]}>
                    {/* ── Animal Header ── */}
                    <LinearGradient colors={["#0f1f3d", "#1a3a6a"]} style={d.animalHeader} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                        <TouchableOpacity style={d.closeBtn} onPress={onClose}>
                            <Ionicons name="chevron-down" size={22} color="#7ca9d4" />
                        </TouchableOpacity>

                        <View style={d.avatarBox}>
                            <Ionicons name="paw" size={28} color="#e8f4f8" />
                        </View>

                        <Text style={d.animalName}>{animal.name || "Unnamed"}</Text>
                        <View style={d.tagRow}>
                            <View style={d.tagBadge}>
                                <Ionicons name="pricetag" size={10} color="#7ca9d4" />
                                <Text style={d.tagText}>{animal.tag_number}</Text>
                            </View>
                            {animal.breed ? (
                                <View style={d.breedBadge}>
                                    <Text style={d.breedText}>{animal.breed}</Text>
                                </View>
                            ) : null}
                        </View>

                        <View style={d.statusRow}>
                            <View style={[d.statusPill, { backgroundColor: statusColor + "22", borderColor: statusColor + "44" }]}>
                                <View style={[d.dot, { backgroundColor: statusColor }]} />
                                <Text style={[d.statusText, { color: statusColor }]}>{statusLabel}</Text>
                            </View>
                            <View style={[d.statusPill, { backgroundColor: healthColor + "22", borderColor: healthColor + "44" }]}>
                                <Ionicons name={isHealthy ? "heart" : "alert-circle"} size={11} color={healthColor} />
                                <Text style={[d.statusText, { color: healthColor }]}>{isHealthy ? "Healthy" : "Sick"}</Text>
                            </View>
                            {latestHealth?.condition ? (
                                <View style={[d.statusPill, { backgroundColor: "#ffffff15", borderColor: "#ffffff22" }]}>
                                    <Text style={[d.statusText, { color: "#cbd5e1" }]}>{latestHealth.condition}</Text>
                                </View>
                            ) : null}
                        </View>

                        <View style={d.quickStats}>
                            <View style={d.qStat}>
                                <Text style={d.qStatVal}>{medicineRecords.length}</Text>
                                <Text style={d.qStatLabel}>Medicines</Text>
                            </View>
                            <View style={d.qStatDiv} />
                            <View style={d.qStat}>
                                <Text style={d.qStatVal}>{healthRecords.length}</Text>
                                <Text style={d.qStatLabel}>Health</Text>
                            </View>
                            <View style={d.qStatDiv} />
                            <View style={d.qStat}>
                                <Text style={[d.qStatVal, { color: "#e27f2d" }]}>{totalTodayMilk}L</Text>
                                <Text style={d.qStatLabel}>Today's Milk</Text>
                            </View>
                        </View>
                    </LinearGradient>

                    {/* ── Scrollable Content ── */}
                    <ScrollView style={d.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>

                        {loading ? (
                            <View style={d.loadingBox}>
                                <ActivityIndicator size="large" color="#1a4a8a" />
                                <Text style={d.loadingText}>Records load ho rahe hain...</Text>
                            </View>
                        ) : (
                            <>
                                {/* ── Animal Profile ── */}
                                <SectionHeader icon="information-circle-outline" title="Animal Profile" color="#1a4a8a" />
                                <View style={d.card}>
                                    <InfoRow icon="person-outline" label="Name" value={animal.name || "—"} />
                                    <InfoRow icon="male-female-outline" label="Gender" value={animal.gender || "—"} />
                                    <InfoRow icon="calendar-outline" label="Age" value={animal.age ? `${animal.age} years` : "—"} />
                                    <InfoRow icon="scale-outline" label="Weight" value={animal.weight ? `${animal.weight} kg` : "—"} />
                                    <InfoRow icon="ribbon-outline" label="Breed" value={animal.breed || "—"} />
                                    <InfoRow icon="today-outline" label="DOB" value={formatDate(animal.dob)} />
                                    <InfoRow icon="cart-outline" label="Purchase Date" value={formatDate(animal.purchase_date)} />
                                    {animal.purchase_price ? (
                                        <InfoRow icon="cash-outline" label="Purchase Price" value={`₹${animal.purchase_price.toLocaleString("en-IN")}`} />
                                    ) : null}
                                    {animal.notes ? (
                                        <View style={d.notesBox}>
                                            <Text style={d.notesLabel}>Notes</Text>
                                            <Text style={d.notesText}>{animal.notes}</Text>
                                        </View>
                                    ) : null}
                                </View>

                                {/* ── Health Status ── */}
                                <SectionHeader icon="heart-outline" title="Health Status" color={healthColor} />

                                {failedEndpoints.has("health") ? (
                                    <EndpointMissingNote section="GET /vet/animals/{id}/health-records" />
                                ) : null}

                                <View style={[d.healthBanner, { backgroundColor: healthColor + "12", borderColor: healthColor + "30" }]}>
                                    <Ionicons name={isHealthy ? "checkmark-circle" : "alert-circle"} size={28} color={healthColor} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={[d.healthBannerTitle, { color: healthColor }]}>
                                            {isHealthy ? "Animal Theek Hai" : "Dhyan Chahiye"}
                                        </Text>
                                        {latestHealth ? (
                                            <Text style={d.healthBannerSub}>
                                                Last checked: {formatDate(latestHealth.date)}
                                                {latestHealth.temperature ? ` • Temp: ${latestHealth.temperature}°C` : ""}
                                            </Text>
                                        ) : (
                                            <Text style={d.healthBannerSub}>Koi health record nahi mila</Text>
                                        )}
                                    </View>
                                </View>

                                {healthRecords.length > 0 && (
                                    <>
                                        <Text style={d.subSectionTitle}>All Health Records ({healthRecords.length})</Text>
                                        {[...healthRecords]
                                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                            .map((hr) => {
                                                const isHr = !hr.condition ||
                                                    hr.condition.toLowerCase() === "healthy" ||
                                                    hr.condition.toLowerCase() === "normal";
                                                const hrColor = isHr ? "#16a34a" : "#dc2626";
                                                return (
                                                    <View key={hr.id} style={[d.recordCard, { borderLeftColor: hrColor }]}>
                                                        <View style={d.recordCardTop}>
                                                            <View style={[d.conditionBadge, { backgroundColor: hrColor + "18" }]}>
                                                                <Ionicons name={isHr ? "heart" : "alert-circle"} size={11} color={hrColor} />
                                                                <Text style={[d.conditionText, { color: hrColor }]}>{hr.condition || "Healthy"}</Text>
                                                            </View>
                                                            <Text style={d.recordDate}>{formatDate(hr.date)}</Text>
                                                        </View>
                                                        {hr.temperature ? <Text style={d.recordMeta}>🌡️ Temperature: {hr.temperature}°C</Text> : null}
                                                        {hr.worker_name ? <Text style={d.recordMeta}>👤 Checked by: {hr.worker_name}</Text> : null}
                                                        {hr.notes ? <Text style={d.recordNotes}>{hr.notes}</Text> : null}
                                                    </View>
                                                );
                                            })}
                                    </>
                                )}

                                {/* ── Medicine Records ── */}
                                <SectionHeader icon="medical-outline" title={`Medicine Records (${medicineRecords.length})`} color="#7c3aed" />

                                {failedEndpoints.has("medicine") ? (
                                    <EndpointMissingNote section="GET /vet/animals/{id}/medicine-records" />
                                ) : null}

                                {medicineRecords.length === 0 ? (
                                    <View style={d.emptyCard}>
                                        <Ionicons name="medical-outline" size={24} color="#ccc" />
                                        <Text style={d.emptyText}>Koi medicine record nahi</Text>
                                    </View>
                                ) : (
                                    [...medicineRecords]
                                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                        .map((med) => {
                                            const isDue = med.next_due && new Date(med.next_due) <= new Date();
                                            return (
                                                <View key={med.id} style={[d.medCard, isDue && d.medCardDue]}>
                                                    <View style={d.medCardTop}>
                                                        <View style={d.medIconBox}>
                                                            <Ionicons name="medical" size={16} color="#7c3aed" />
                                                        </View>
                                                        <View style={{ flex: 1 }}>
                                                            <Text style={d.medName}>{med.medicine_name}</Text>
                                                            {med.dosage ? (
                                                                <View style={d.dosageBadge}>
                                                                    <Text style={d.dosageText}>{med.dosage}</Text>
                                                                </View>
                                                            ) : null}
                                                        </View>
                                                        <TouchableOpacity
                                                            style={d.editBtn}
                                                            onPress={() => { setEditRecord(med); setShowEdit(true); }}
                                                        >
                                                            <Ionicons name="pencil" size={13} color="#1a4a8a" />
                                                            <Text style={d.editBtnText}>Edit</Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                    <View style={d.medMeta}>
                                                        <Text style={d.medMetaText}>📅 {formatDate(med.date)}</Text>
                                                        {med.administered_by ? <Text style={d.medMetaText}>👤 {med.administered_by}</Text> : null}
                                                        {med.next_due ? (
                                                            <Text style={[d.medMetaText, { color: isDue ? "#dc2626" : "#f59e0b" }]}>
                                                                {isDue ? "⚠️ OVERDUE" : "⏰"} Due: {formatDate(med.next_due)}
                                                            </Text>
                                                        ) : null}
                                                    </View>
                                                    {med.notes ? <Text style={d.medNotes}>{med.notes}</Text> : null}
                                                </View>
                                            );
                                        })
                                )}

                                {/* ── Milk Records ── */}
                                <SectionHeader icon="water-outline" title="Milk Records (Last 5)" color="#e27f2d" />

                                {failedEndpoints.has("milk") ? (
                                    <EndpointMissingNote section="GET /vet/animals/{id}/milk-records" />
                                ) : null}

                                {recentMilk.length === 0 ? (
                                    <View style={d.emptyCard}>
                                        <Ionicons name="water-outline" size={24} color="#ccc" />
                                        <Text style={d.emptyText}>Koi milk record nahi</Text>
                                    </View>
                                ) : (
                                    recentMilk.map((mr) => (
                                        <View key={mr.id} style={[d.recordCard, { borderLeftColor: "#e27f2d" }]}>
                                            <View style={d.recordCardTop}>
                                                <Text style={[d.medName, { fontSize: 13 }]}>
                                                    🌅 {mr.morning ?? 0}L + 🌙 {mr.evening ?? 0}L = <Text style={{ color: "#e27f2d" }}>{mr.total ?? 0}L</Text>
                                                </Text>
                                                <Text style={d.recordDate}>{formatDate(mr.date)}</Text>
                                            </View>
                                            {mr.worker_name ? <Text style={d.recordMeta}>👤 {mr.worker_name}</Text> : null}
                                        </View>
                                    ))
                                )}

                                {/* ── Feed Records ── */}
                                <SectionHeader icon="restaurant-outline" title="Feed Records (Last 5)" color="#16a34a" />

                                {failedEndpoints.has("feed") ? (
                                    <EndpointMissingNote section="GET /vet/animals/{id}/feed-records" />
                                ) : null}

                                {feedRecords.length === 0 ? (
                                    <View style={d.emptyCard}>
                                        <Ionicons name="restaurant-outline" size={24} color="#ccc" />
                                        <Text style={d.emptyText}>Koi feed record nahi</Text>
                                    </View>
                                ) : (
                                    [...feedRecords]
                                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                        .slice(0, 5)
                                        .map((fr) => (
                                            <View key={fr.id} style={[d.recordCard, { borderLeftColor: "#16a34a" }]}>
                                                <View style={d.recordCardTop}>
                                                    <Text style={[d.medName, { fontSize: 13 }]}>
                                                        {fr.feed_type || "Feed"} — <Text style={{ color: "#16a34a" }}>{fr.quantity} {fr.unit || "kg"}</Text>
                                                    </Text>
                                                    <Text style={d.recordDate}>{formatDate(fr.date)}</Text>
                                                </View>
                                                <View style={{ flexDirection: "row", gap: 12, marginTop: 2 }}>
                                                    {fr.shift ? <Text style={d.recordMeta}>{fr.shift === "morning" ? "🌅 Morning" : "🌙 Evening"}</Text> : null}
                                                    {fr.worker_name ? <Text style={d.recordMeta}>👤 {fr.worker_name}</Text> : null}
                                                </View>
                                            </View>
                                        ))
                                )}
                            </>
                        )}
                    </ScrollView>
                </Animated.View>
            </View>

            {/* Edit Medicine Modal */}
            <EditMedicineModal
                visible={showEdit}
                record={editRecord}
                onClose={() => setShowEdit(false)}
                onSaved={loadAnimalData}
            />
        </Modal>
    );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const d = StyleSheet.create({
    overlay: { flex: 1, justifyContent: "flex-end" },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.55)" },
    sheet: { backgroundColor: "#F0F4FF", borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: "hidden", maxHeight: "93%" },
    animalHeader: { padding: 20, paddingTop: 14, alignItems: "center", gap: 6 },
    closeBtn: { alignSelf: "center", marginBottom: 4, backgroundColor: "#ffffff15", borderRadius: 12, padding: 4 },
    avatarBox: { width: 68, height: 68, borderRadius: 22, backgroundColor: "#0d2137", borderWidth: 2, borderColor: "#2a4a6b", alignItems: "center", justifyContent: "center" },
    animalName: { fontSize: 22, fontWeight: "900", color: "#e8f4f8", letterSpacing: -0.5, marginTop: 4 },
    tagRow: { flexDirection: "row", gap: 8, alignItems: "center" },
    tagBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#0d2137", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
    tagText: { fontSize: 12, fontWeight: "800", color: "#7ca9d4" },
    breedBadge: { backgroundColor: "#ffffff18", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
    breedText: { fontSize: 11, fontWeight: "600", color: "#cbd5e1" },
    statusRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center" },
    statusPill: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1 },
    dot: { width: 6, height: 6, borderRadius: 3 },
    statusText: { fontSize: 11, fontWeight: "800" },
    quickStats: { flexDirection: "row", backgroundColor: "#0d2137", borderRadius: 16, borderWidth: 1, borderColor: "#1e3a5f", overflow: "hidden", width: "100%", marginTop: 4 },
    qStat: { flex: 1, alignItems: "center", paddingVertical: 10 },
    qStatVal: { fontSize: 16, fontWeight: "900", color: "#e8f4f8" },
    qStatLabel: { fontSize: 10, color: "#5b8db8", fontWeight: "500", marginTop: 1 },
    qStatDiv: { width: 1, backgroundColor: "#1e3a5f", marginVertical: 8 },
    content: { flex: 1 },
    card: { backgroundColor: "#fff", borderRadius: 16, padding: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
    subSectionTitle: { fontSize: 12, fontWeight: "700", color: "#888", marginTop: 10, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
    healthBanner: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, padding: 14, borderWidth: 1.5 },
    healthBannerTitle: { fontSize: 15, fontWeight: "800" },
    healthBannerSub: { fontSize: 12, color: "#888", marginTop: 2 },
    recordCard: { backgroundColor: "#fff", borderRadius: 14, padding: 12, marginBottom: 8, borderLeftWidth: 3, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
    recordCardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
    recordDate: { fontSize: 11, color: "#aaa", fontWeight: "500" },
    recordMeta: { fontSize: 12, color: "#888", fontWeight: "500", marginTop: 2 },
    recordNotes: { fontSize: 12, color: "#aaa", marginTop: 4, fontStyle: "italic" },
    conditionBadge: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    conditionText: { fontSize: 11, fontWeight: "700" },
    medCard: { backgroundColor: "#fff", borderRadius: 16, padding: 14, marginBottom: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
    medCardDue: { borderLeftWidth: 3, borderLeftColor: "#dc2626" },
    medCardTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
    medIconBox: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#f5f3ff", alignItems: "center", justifyContent: "center" },
    medName: { fontSize: 14, fontWeight: "800", color: "#1a1a1a", flex: 1 },
    dosageBadge: { backgroundColor: "#f5f3ff", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, alignSelf: "flex-start", marginTop: 3 },
    dosageText: { fontSize: 11, fontWeight: "700", color: "#7c3aed" },
    medMeta: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 8 },
    medMetaText: { fontSize: 11, color: "#aaa", fontWeight: "500" },
    medNotes: { fontSize: 12, color: "#aaa", marginTop: 6, fontStyle: "italic" },
    editBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#eff6ff", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
    editBtnText: { fontSize: 12, fontWeight: "700", color: "#1a4a8a" },
    emptyCard: { backgroundColor: "#fff", borderRadius: 14, padding: 20, alignItems: "center", gap: 8 },
    emptyText: { fontSize: 13, color: "#bbb", fontWeight: "500" },
    loadingBox: { paddingVertical: 60, alignItems: "center", gap: 12 },
    loadingText: { fontSize: 14, color: "#999" },
    notesBox: { paddingTop: 10, marginTop: 4 },
    notesLabel: { fontSize: 11, fontWeight: "700", color: "#888", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
    notesText: { fontSize: 13, color: "#555", lineHeight: 18 },
});