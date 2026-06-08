import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Modal,
  StatusBar,
  Platform,
  Animated,
  KeyboardAvoidingView,
  ScrollView,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { api } from "../../../src/services/api";

// ── Palette 

const C = {
  primary:   "#FF9675",
  secondary: "#FF9675",
  accent:    "#8B6854",
  light:     "#8B6854",
  dark:      "#BB6B3F",
  deep:      "#8B6854",
  bg:        "#FFF8EF",
  card:      "#FFE8D6",
  text:      "#3D1F0A",
  textMuted: "#A07850",
  textLight: "#C9A882",
};

// ── Types 

interface Veterinary {
  id: string;
  name: string;
  email: string;
  phone?: string;
  specialization?: string;
  license_number?: string;
  farm_name?: string;
  is_active: boolean;
  is_verified: boolean;
  admin_id?: string;
}

// ── Constants 

const SPECIALIZATIONS = [
  "Bovine Specialist",
  "General Veterinarian",
  "Reproduction Expert",
  "Nutritionist",
  "Livestock Surgeon",
];

const AVATAR_GRADIENTS: [string, string][] = [
  ["#FF9675", "#BB6B3F"],
  ["#FFB347", "#E07B39"],
  ["#FF7F50", "#CC5500"],
  ["#E8956D", "#9B5B3A"],
  ["#FFAA80", "#C86B3F"],
  ["#FF8C61", "#A0522D"],
];

// ── Toast
type ToastVariant = "success" | "error" | "info";

function Toast({
  msg,
  variant,
  visible,
  onHide,
}: {
  msg: string;
  variant: ToastVariant;
  visible: boolean;
  onHide: () => void;
}) {
  const slide = useRef(new Animated.Value(-80)).current;

  useEffect(() => {
    if (!visible) return;
    Animated.spring(slide, {
      toValue: 0,
      useNativeDriver: true,
      tension: 80,
      friction: 9,
    }).start();
    const t = setTimeout(() => {
      Animated.timing(slide, {
        toValue: -80,
        duration: 250,
        useNativeDriver: true,
      }).start(onHide);
    }, 3000);
    return () => clearTimeout(t);
  }, [visible]);

  if (!visible) return null;

  const colors: Record<ToastVariant, { bg: string; icon: keyof typeof Ionicons.glyphMap; border: string; iconColor: string }> = {
    success: { bg: "#FFF3ED", border: "#FF9675", icon: "checkmark-circle", iconColor: "#BB6B3F" },
    error:   { bg: "#FFF0EE", border: "#E05A3A", icon: "close-circle",     iconColor: "#E05A3A" },
    info:    { bg: "#FFF8EF", border: "#A07850", icon: "information-circle", iconColor: "#A07850" },
  };
  const c = colors[variant];

  return (
    <Animated.View
      style={[
        toastS.wrap,
        { transform: [{ translateY: slide }], borderLeftColor: c.border, backgroundColor: c.bg },
      ]}
    >
      <Ionicons name={c.icon} size={20} color={c.iconColor} />
      <Text style={[toastS.msg, { color: c.iconColor }]}>{msg}</Text>
      <TouchableOpacity onPress={onHide} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="close" size={15} color={c.iconColor} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const toastS = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    zIndex: 9999,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderLeftWidth: 4,
    shadowColor: "#BB6B3F",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  msg: { flex: 1, fontSize: 13.5, fontWeight: "600", lineHeight: 18 },
});

// ── Field Row (detail view) 

function DetailRow({ icon, label, val }: { icon: keyof typeof Ionicons.glyphMap; label: string; val: string }) {
  return (
    <View style={dm.detailRow}>
      <View style={dm.detailIconBox}>
        <Ionicons name={icon} size={15} color={C.accent} />
      </View>
      <View style={dm.detailInfo}>
        <Text style={dm.detailLabel}>{label}</Text>
        <Text style={dm.detailVal}>{val}</Text>
      </View>
    </View>
  );
}

// ── Vet Detail Modal 

function VetDetailModal({
  vet,
  visible,
  onClose,
  onSave,
  onToggleActive,
}: {
  vet: Veterinary | null;
  visible: boolean;
  onClose: () => void;
  onSave: (id: string, data: Partial<Veterinary>) => Promise<void>;
  onToggleActive: (id: string, active: boolean) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", specialization: "", license_number: "" });
  const scaleAnim   = useRef(new Animated.Value(0.92)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const slideAnim   = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    if (visible && vet) {
      setForm({ name: vet.name, phone: vet.phone || "", specialization: vet.specialization || "", license_number: vet.license_number || "" });
      setEditing(false);
      scaleAnim.setValue(0.92);
      opacityAnim.setValue(0);
      slideAnim.setValue(40);
      Animated.parallel([
        Animated.spring(scaleAnim,   { toValue: 1, useNativeDriver: true, damping: 15, stiffness: 220 }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(slideAnim,   { toValue: 0, useNativeDriver: true, damping: 15, stiffness: 200 }),
      ]).start();
    }
  }, [visible, vet]);

  if (!vet) return null;

  const initials  = vet.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const colorIdx  = vet.name.charCodeAt(0) % AVATAR_GRADIENTS.length;
  const gradPair  = AVATAR_GRADIENTS[colorIdx];

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    await onSave(vet.id, {
      name:           form.name.trim(),
      phone:          form.phone.trim() || undefined,
      specialization: form.specialization.trim() || undefined,
      license_number: form.license_number.trim() || undefined,
    });
    setSaving(false);
    setEditing(false);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={dm.overlay}>
        <Animated.View
          style={[dm.card, { opacity: opacityAnim, transform: [{ scale: scaleAnim }, { translateY: slideAnim }] }]}
        >
          {/* Header */}
          <LinearGradient colors={gradPair as any} style={dm.headerGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={dm.headerTop}>
              <TouchableOpacity onPress={onClose} style={dm.circleBtn}>
                <Ionicons name="arrow-back" size={18} color="#fff" />
              </TouchableOpacity>
              <View style={dm.vetBadge}>
                <Ionicons name="medkit-outline" size={11} color="#fff" />
                <Text style={dm.vetBadgeText}>VETERINARY</Text>
              </View>
              <TouchableOpacity onPress={() => setEditing(!editing)} style={dm.circleBtn}>
                <Ionicons name={editing ? "checkmark" : "create-outline"} size={16} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={dm.avatarCircle}>
              <Text style={dm.avatarText}>{initials}</Text>
            </View>
            <Text style={dm.modalName}>Dr. {vet.name}</Text>
            <Text style={dm.modalEmail}>{vet.email}</Text>
            <View style={[dm.statusPill, { backgroundColor: vet.is_active ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.18)" }]}>
              <View style={[dm.dot, { backgroundColor: vet.is_active ? "#fff" : "#fca5a5" }]} />
              <Text style={dm.statusPillText}>{vet.is_active ? "Active" : "Inactive"}</Text>
            </View>
          </LinearGradient>

          <ScrollView style={dm.body} showsVerticalScrollIndicator={false}>
            {editing ? (
              <>
                <SectionLabel>EDIT DETAILS</SectionLabel>
                {[
                  { icon: "person-outline" as keyof typeof Ionicons.glyphMap, key: "name",           label: "Full Name",      kb: "default"   },
                  { icon: "call-outline"   as keyof typeof Ionicons.glyphMap, key: "phone",          label: "Phone",          kb: "phone-pad"  },
                  { icon: "ribbon-outline" as keyof typeof Ionicons.glyphMap, key: "license_number", label: "License Number", kb: "default"   },
                ].map((f) => (
                  <View key={f.key} style={dm.inputRow}>
                    <Ionicons name={f.icon} size={16} color={C.textMuted} style={dm.inputIcon} />
                    <TextInput
                      style={dm.input}
                      placeholder={f.label}
                      placeholderTextColor={C.textLight}
                      value={(form as any)[f.key]}
                      onChangeText={(v) => setForm((p) => ({ ...p, [f.key]: v }))}
                      keyboardType={f.kb as any}
                    />
                  </View>
                ))}
                <SectionLabel style={{ marginTop: 8 }}>SPECIALIZATION</SectionLabel>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                  {SPECIALIZATIONS.map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[dm.chip, form.specialization === s && dm.chipActive]}
                      onPress={() => setForm((p) => ({ ...p, specialization: p.specialization === s ? "" : s }))}
                    >
                      <Text style={[dm.chipText, form.specialization === s && dm.chipTextActive]}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity style={[dm.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                  <LinearGradient colors={gradPair as any} style={dm.saveBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    {saving ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                        <Text style={dm.saveBtnText}>Save Changes</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <SectionLabel>DETAILS</SectionLabel>
                <DetailRow icon="mail-outline"    label="Email"          val={vet.email} />
                <DetailRow icon="call-outline"    label="Phone"          val={vet.phone || "—"} />
                <DetailRow icon="medical-outline" label="Specialization" val={vet.specialization || "—"} />
                <DetailRow icon="ribbon-outline"  label="License No."    val={vet.license_number || "—"} />

                <View style={dm.toggleRow}>
                  <View style={dm.detailIconBox}>
                    <Ionicons name="power-outline" size={15} color={C.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={dm.detailLabel}>Account Status</Text>
                    <Text style={dm.detailVal}>{vet.is_active ? "Active" : "Inactive"}</Text>
                  </View>
                  <Switch
                    value={vet.is_active}
                    onValueChange={(v) => onToggleActive(vet.id, v)}
                    trackColor={{ false: "#FECACA", true: "#FFD5BC" }}
                    thumbColor={vet.is_active ? C.primary : "#ccc"}
                  />
                </View>
              </>
            )}
            <View style={{ height: 28 }} />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

// small helper
function SectionLabel({ children, style }: { children: string; style?: any }) {
  return <Text style={[dm.sectionLabel, style]}>{children}</Text>;
}

const dm = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(61,31,10,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    backgroundColor: C.bg,
    borderRadius: 28,
    width: "100%",
    overflow: "hidden",
    maxHeight: "88%",
    shadowColor: C.deep,
    shadowOpacity: 0.25,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 12 },
    elevation: 18,
  },
  headerGrad: {
    paddingTop: 22,
    paddingBottom: 28,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 18,
  },
  circleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  vetBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  vetBadgeText: { fontSize: 10, fontWeight: "800", color: "#fff", letterSpacing: 1.2 },
  avatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.28)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.35)",
  },
  avatarText: { fontSize: 24, fontWeight: "800", color: "#fff" },
  modalName:  { fontSize: 20, fontWeight: "800", color: "#fff", letterSpacing: -0.4 },
  modalEmail: { fontSize: 13, color: "rgba(255,255,255,0.78)", marginTop: 3, marginBottom: 14 },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  statusPillText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  body: { paddingHorizontal: 20, paddingTop: 22 },
  sectionLabel: { fontSize: 11, fontWeight: "700", color: C.textLight, letterSpacing: 1.3, marginBottom: 12 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  detailIconBox: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
  },
  detailInfo: { flex: 1 },
  detailLabel: { fontSize: 11, color: C.textMuted, fontWeight: "600" },
  detailVal:   { fontSize: 14, color: C.text, fontWeight: "600", marginTop: 1 },
  toggleRow:   { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14, paddingVertical: 4 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#F5D5BC",
    borderRadius: 14,
    paddingHorizontal: 12,
    marginBottom: 10,
    backgroundColor: "#FFF3E8",
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, paddingVertical: 13, fontSize: 15, color: C.text },
  chip: {
    borderWidth: 1.5,
    borderColor: "#F5D5BC",
    borderRadius: 22,
    paddingHorizontal: 13,
    paddingVertical: 7,
    marginRight: 8,
    backgroundColor: "#FFF3E8",
  },
  chipActive:     { borderColor: C.primary, backgroundColor: "#FFE8D6" },
  chipText:       { fontSize: 12, fontWeight: "600", color: C.textMuted },
  chipTextActive: { color: C.dark },
  saveBtn:     { borderRadius: 16, overflow: "hidden", marginTop: 4 },
  saveBtnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15 },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});

// ── Vet Card ───────────────────────────────────────────────────────────────────

function VetCard({ item, index, onPress }: { item: Veterinary; index: number; onPress: () => void }) {
  const scale      = useRef(new Animated.Value(1)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(24)).current;
  const gradPair   = AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length];
  const initials   = item.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 350, delay: index * 60, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, delay: index * 60, tension: 70, friction: 11, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }, { scale }] }}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        onPressIn={() =>
          Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 2 }).start()
        }
        onPressOut={() =>
          Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 4 }).start()
        }
      >
        <View style={styles.card}>
          {/* Avatar */}
          <LinearGradient colors={gradPair as any} style={styles.avatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={styles.avatarText}>{initials}</Text>
          </LinearGradient>

          {/* Info */}
          <View style={styles.cardInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.workerName}>Dr. {item.name}</Text>
              <View style={styles.vetTag}>
                <Ionicons name="medkit-outline" size={9} color={C.dark} />
                <Text style={styles.vetTagText}>VET</Text>
              </View>
            </View>
            <View style={styles.emailRow}>
              <Ionicons name="mail-outline" size={11} color={C.textMuted} />
              <Text style={styles.workerEmail} numberOfLines={1}>{item.email}</Text>
            </View>
            <View style={styles.cardTags}>
              {item.specialization ? (
                <View style={styles.tag}>
                  <Ionicons name="medical-outline" size={10} color={C.dark} />
                  <Text style={styles.tagText}>{item.specialization}</Text>
                </View>
              ) : null}
              {item.license_number ? (
                <View style={[styles.tag, styles.tagLicense]}>
                  <Ionicons name="ribbon-outline" size={10} color={C.accent} />
                  <Text style={[styles.tagText, { color: C.accent }]}>{item.license_number}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Right */}
          <View style={styles.cardRight}>
            <View style={[styles.statusPill, { backgroundColor: item.is_active ? "#FFE8D6" : "#FEE2E2" }]}>
              <View style={[styles.statusDot, { backgroundColor: item.is_active ? C.primary : "#EF4444" }]} />
              <Text style={[styles.statusText, { color: item.is_active ? C.dark : "#EF4444" }]}>
                {item.is_active ? "Active" : "Inactive"}
              </Text>
            </View>
            <View style={styles.editHint}>
              <Ionicons name="create-outline" size={12} color={C.textLight} />
              <Text style={styles.editHintText}>tap to edit</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────────

export default function VeterinaryScreen() {
  const router = useRouter();
  const [vets, setVets]               = useState<Veterinary[]>([]);
  const [loading, setLoading]         = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [creating, setCreating]       = useState(false);
  const [selectedVet, setSelectedVet] = useState<Veterinary | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [toast, setToast] = useState({ visible: false, msg: "", variant: "success" as ToastVariant });
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", specialization: "", license_number: "" });
  const [showPassword, setShowPassword] = useState(false);

  const showToast = (msg: string, variant: ToastVariant = "success") => setToast({ visible: true, msg, variant });
  const hideToast = () => setToast((t) => ({ ...t, visible: false }));

  const fetchVets = async () => {
    try {
      setLoading(true);
      const data = await api.getAdminVeterinarians();
      setVets(data);
    } catch (e: any) {
      showToast(e?.message || "Failed to load veterinarians", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchVets(); }, []);

  const handleCreate = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      showToast("Name, email and password are required", "error");
      return;
    }
    try {
      setCreating(true);
      await api.createVeterinarian({
        name:           form.name.trim(),
        email:          form.email.trim(),
        password:       form.password,
        phone:          form.phone.trim() || undefined,
        specialization: form.specialization.trim() || undefined,
        license_number: form.license_number.trim() || undefined,
      });
      setModalVisible(false);
      setShowPassword(false);
      setForm({ name: "", email: "", phone: "", password: "", specialization: "", license_number: "" });
      fetchVets();
      showToast("Veterinarian created successfully!", "success");
    } catch (e: any) {
      showToast(e?.message || "Failed to create veterinarian", "error");
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateVet = async (id: string, data: Partial<Veterinary>) => {
    try {
      await api.updateVeterinarian(id, data);
      setVets((vs) => vs.map((v) => (v.id === id ? { ...v, ...data } : v)));
      if (selectedVet?.id === id) setSelectedVet((v) => (v ? { ...v, ...data } : v));
      showToast("Veterinarian updated!", "success");
    } catch (e: any) {
      showToast(e?.message || "Update failed", "error");
    }
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    try {
      await api.updateVeterinarian(id, { is_active: active });
      setVets((vs) => vs.map((v) => (v.id === id ? { ...v, is_active: active } : v)));
      if (selectedVet?.id === id) setSelectedVet((v) => (v ? { ...v, is_active: active } : v));
      showToast(`Veterinarian ${active ? "activated" : "deactivated"}`, active ? "success" : "info");
    } catch (e: any) {
      showToast(e?.message || "Failed to update status", "error");
    }
  };

  const totalActive = vets.filter((v) => v.is_active).length;

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <Toast msg={toast.msg} variant={toast.variant} visible={toast.visible} onHide={hideToast} />

      {/* ── Header ── */}
      <LinearGradient
        colors={["#3D1F0A", "#6B3520"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={C.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.headerTitleRow}>
            <Ionicons name="medkit-outline" size={16} color={C.primary} />
            <Text style={styles.headerTitle}>Veterinary Staff</Text>
          </View>
          <Text style={styles.headerSub}>{vets.length} total · {totalActive} active</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => {
            setShowPassword(false);
            setModalVisible(true);
          }}
        >
          <LinearGradient colors={[C.primary, C.dark]} style={styles.addBtnGrad}>
            <Ionicons name="add" size={22} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>

      {/* ── Stats bar ── */}
      {!loading && vets.length > 0 && (
        <View style={styles.statsBar}>
          <View style={styles.statChip}>
            <Ionicons name="people-outline" size={13} color={C.dark} />
            <Text style={styles.statChipText}>{vets.length} Vets</Text>
          </View>
          <View style={[styles.statChip, { backgroundColor: "#FFE8D6" }]}>
            <Ionicons name="checkmark-circle-outline" size={13} color={C.dark} />
            <Text style={[styles.statChipText, { color: C.dark }]}>{totalActive} Active</Text>
          </View>
          <View style={[styles.statChip, { backgroundColor: "#FEE2E2" }]}>
            <Ionicons name="close-circle-outline" size={13} color="#DC2626" />
            <Text style={[styles.statChipText, { color: "#DC2626" }]}>{vets.length - totalActive} Inactive</Text>
          </View>
        </View>
      )}

      {/* ── Body ── */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={styles.loadingText}>Loading veterinarians…</Text>
        </View>
      ) : vets.length === 0 ? (
        <View style={styles.centered}>
          <LinearGradient colors={[C.primary, C.dark]} style={styles.emptyIcon}>
            <Ionicons name="medkit-outline" size={36} color="#fff" />
          </LinearGradient>
          <Text style={styles.emptyTitle}>No Veterinarians Yet</Text>
          <Text style={styles.emptySubtitle}>Add your first vet to get started</Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => {
              setShowPassword(false);
              setModalVisible(true);
            }}
          >
            <Ionicons name="add-circle-outline" size={18} color="#fff" />
            <Text style={styles.emptyBtnText}>Add Veterinarian</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={vets}
          keyExtractor={(v) => v.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <VetCard
              item={item}
              index={index}
              onPress={() => { setSelectedVet(item); setDetailVisible(true); }}
            />
          )}
          ListFooterComponent={<View style={{ height: 100 }} />}
        />
      )}

      {/* ── Detail Modal ── */}
      <VetDetailModal
        vet={selectedVet}
        visible={detailVisible}
        onClose={() => setDetailVisible(false)}
        onSave={handleUpdateVet}
        onToggleActive={handleToggleActive}
      />

      {/* ── Create Vet Modal ── */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <View style={styles.modalHandle} />

              {/* Modal header */}
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderLeft}>
                  <View style={styles.modalIconBox}>
                    <Ionicons name="medkit-outline" size={20} color={C.dark} />
                  </View>
                  <View>
                    <Text style={styles.modalTitle}>Add Veterinarian</Text>
                    <Text style={styles.modalSub}>Linked to your farm</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={() => {
                    setShowPassword(false);
                    setModalVisible(false);
                  }}
                >
                  <Ionicons name="close" size={19} color={C.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Required */}
                <Text style={styles.sectionLabel}>REQUIRED</Text>
                {[
                  { icon: "person-outline" as keyof typeof Ionicons.glyphMap, key: "name",  label: "Full Name", kb: "default" },
                  { icon: "mail-outline"   as keyof typeof Ionicons.glyphMap, key: "email", label: "Email",     kb: "email-address" },
                ].map((f) => (
                  <View key={f.key} style={styles.inputWrapper}>
                    <Ionicons name={f.icon} size={16} color={C.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder={f.label}
                      placeholderTextColor={C.textLight}
                      value={(form as any)[f.key]}
                      onChangeText={(v) => setForm((p) => ({ ...p, [f.key]: v }))}
                      autoCapitalize="none"
                      keyboardType={f.kb as any}
                    />
                  </View>
                ))}
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={16} color={C.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor={C.textLight}
                    value={form.password}
                    onChangeText={(v) => setForm((p) => ({ ...p, password: v }))}
                    autoCapitalize="none"
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword((prev) => !prev)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={styles.passwordEyeBtn}
                  >
                    <Ionicons
                      name={showPassword ? "eye-outline" : "eye-off-outline"}
                      size={20}
                      color={C.textMuted}
                    />
                  </TouchableOpacity>
                </View>

                {/* Optional */}
                <Text style={[styles.sectionLabel, { marginTop: 16 }]}>OPTIONAL</Text>
                {[
                  { icon: "call-outline"   as keyof typeof Ionicons.glyphMap, key: "phone",          label: "Phone Number",   kb: "phone-pad" },
                  { icon: "ribbon-outline" as keyof typeof Ionicons.glyphMap, key: "license_number",  label: "License Number", kb: "default"   },
                ].map((f) => (
                  <View key={f.key} style={styles.inputWrapper}>
                    <Ionicons name={f.icon} size={16} color={C.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder={f.label}
                      placeholderTextColor={C.textLight}
                      value={(form as any)[f.key]}
                      onChangeText={(v) => setForm((p) => ({ ...p, [f.key]: v }))}
                      keyboardType={f.kb as any}
                    />
                  </View>
                ))}

                {/* Specialization */}
                <Text style={[styles.sectionLabel, { marginTop: 4 }]}>SPECIALIZATION</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                  {SPECIALIZATIONS.map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[styles.designationChip, form.specialization === s && styles.designationChipActive]}
                      onPress={() => setForm((f) => ({ ...f, specialization: f.specialization === s ? "" : s }))}
                    >
                      <Ionicons
                        name="medical-outline"
                        size={11}
                        color={form.specialization === s ? C.dark : C.textLight}
                      />
                      <Text style={[styles.designationChipText, form.specialization === s && styles.designationChipTextActive]}>
                        {s}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Create button */}
                <TouchableOpacity
                  style={[styles.createBtn, creating && { opacity: 0.65 }]}
                  onPress={handleCreate}
                  disabled={creating}
                >
                  <LinearGradient
                    colors={[C.primary, C.dark]}
                    style={styles.createBtnGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {creating ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="person-add-outline" size={18} color="#fff" />
                        <Text style={styles.createBtnText}>Create Veterinarian</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
                <View style={{ height: 30 }} />
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const IS_IOS = Platform.OS === "ios";
const STATUS_BAR_HEIGHT = IS_IOS ? 0 : (StatusBar.currentHeight ?? 0);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: IS_IOS ? 56 : STATUS_BAR_HEIGHT + 16,
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
  headerCenter: { flex: 1 },
  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  headerTitle:   { fontSize: 20, fontWeight: "800", color: "#FFF8EF", letterSpacing: -0.3 },
  headerSub:     { fontSize: 12, color: C.textLight, marginTop: 2, fontWeight: "500" },
  addBtn:        { borderRadius: 15, overflow: "hidden" },
  addBtnGrad:    { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 15 },

  // Stats
  statsBar: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F5D5BC",
  },
  statChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: C.card,
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  statChipText: { fontSize: 12, fontWeight: "600", color: C.dark },

  // List
  list: { padding: 16, gap: 10 },

  // Card
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 14,
    shadowColor: C.deep,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 10,
    elevation: 3,
    gap: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#F5E6D8",
  },
  avatar:     { width: 52, height: 52, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 17, fontWeight: "800", color: "#fff", letterSpacing: -0.3 },
  nameRow:    { flexDirection: "row", alignItems: "center", gap: 6 },
  vetTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: C.card,
    borderRadius: 7,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  vetTagText:   { fontSize: 9, fontWeight: "800", color: C.dark, letterSpacing: 0.5 },
  cardInfo:     { flex: 1, gap: 3 },
  workerName:   { fontSize: 15, fontWeight: "700", color: C.text, letterSpacing: -0.2 },
  emailRow:     { flexDirection: "row", alignItems: "center", gap: 4 },
  workerEmail:  { fontSize: 12, color: C.textMuted, fontWeight: "500" },
  cardTags:     { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 4 },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.card,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagLicense:   { backgroundColor: "#FFF0E8" },
  tagText:      { fontSize: 11, color: C.dark, fontWeight: "600" },
  cardRight:    { alignItems: "flex-end", gap: 6 },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  statusDot:     { width: 6, height: 6, borderRadius: 3 },
  statusText:    { fontSize: 11, fontWeight: "700" },
  editHint:      { flexDirection: "row", alignItems: "center", gap: 3 },
  editHintText:  { fontSize: 10, color: C.textLight, fontWeight: "500" },

  // Centered (empty/loading)
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 40 },
  loadingText: { fontSize: 14, color: C.textMuted, marginTop: 8 },
  emptyIcon: {
    width: 74,
    height: 74,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle:    { fontSize: 20, fontWeight: "800", color: C.text },
  emptySubtitle: { fontSize: 14, color: C.textMuted, textAlign: "center", lineHeight: 20 },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: C.primary,
    borderRadius: 14,
    paddingHorizontal: 22,
    paddingVertical: 12,
    marginTop: 8,
  },
  emptyBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(61,31,10,0.55)", justifyContent: "flex-end" },
  modalBox: {
    backgroundColor: C.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: "90%",
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: C.card,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 22,
  },
  modalHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  modalIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: { fontSize: 20, fontWeight: "800", color: C.text },
  modalSub:   { fontSize: 13, color: C.textMuted, marginTop: 2 },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: C.textLight,
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#F5D5BC",
    borderRadius: 14,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    marginBottom: 10,
  },
  inputIcon: { marginRight: 8 },
  input:     { flex: 1, paddingVertical: 13, fontSize: 15, color: C.text },
  passwordEyeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF3ED",
    marginLeft: 8,
  },
  designationChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1.5,
    borderColor: "#F5D5BC",
    borderRadius: 22,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginRight: 8,
    backgroundColor: "#fff",
  },
  designationChipActive:     { borderColor: C.primary, backgroundColor: C.card },
  designationChipText:       { fontSize: 12, fontWeight: "600", color: C.textMuted },
  designationChipTextActive: { color: C.dark },
  createBtn:        { borderRadius: 16, overflow: "hidden", marginTop: 8 },
  createBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  createBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
