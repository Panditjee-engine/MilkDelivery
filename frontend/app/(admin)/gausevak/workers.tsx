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

interface Worker {
  id: string;
  name: string;
  email: string;
  phone?: string;
  designation?: string;
  farm_name?: string;
  is_active: boolean;
  is_verified: boolean;
  admin_id?: string;
}

const DESIGNATIONS = [
  "Farm Manager",
  "Milking Operator",
  "Feed Supervisor",
  "Veterinary Assistant",
  "General Worker",
];

const AVATAR_COLORS = [
  ["#1a472a", "#2d6a4f"],
  ["#1c2b3a", "#4b75a5"],
  ["#2d1b33", "#6a0572"],
  ["#1a1a2e", "#16213e"],
  ["#2b1b17", "#6b3c2e"],
  ["#1b4332", "#40916c"],
];

// ── Toast Component ────────────────────────────────────────────────────
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
  const colors: Record<
    ToastVariant,
    { bg: string; icon: string; border: string }
  > = {
    success: { bg: "#f0fdf4", border: "#16a34a", icon: "checkmark-circle" },
    error: { bg: "#fef2f2", border: "#dc2626", icon: "close-circle" },
    info: { bg: "#eff6ff", border: "#2563eb", icon: "information-circle" },
  };
  const c = colors[variant];
  return (
    <Animated.View
      style={[
        toastS.wrap,
        {
          transform: [{ translateY: slide }],
          borderLeftColor: c.border,
          backgroundColor: c.bg,
        },
      ]}
    >
      <Ionicons name={c.icon as any} size={20} color={c.border} />
      <Text style={[toastS.msg, { color: c.border }]}>{msg}</Text>
      <TouchableOpacity
        onPress={onHide}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="close" size={15} color={c.border} />
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
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  msg: { flex: 1, fontSize: 13.5, fontWeight: "600", lineHeight: 18 },
});

// ── Worker Detail / Edit Modal ─────────────────────────────────────────
function WorkerDetailModal({
  worker,
  visible,
  onClose,
  onSave,
  onToggleActive,
}: {
  worker: Worker | null;
  visible: boolean;
  onClose: () => void;
  onSave: (id: string, data: Partial<Worker>) => Promise<void>;
  onToggleActive: (id: string, active: boolean) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    designation: "",
    farm_name: "",
  });
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    if (visible && worker) {
      setForm({
        name: worker.name,
        phone: worker.phone || "",
        designation: worker.designation || "",
        farm_name: worker.farm_name || "",
      });
      setEditing(false);
      scaleAnim.setValue(0.92);
      opacityAnim.setValue(0);
      slideAnim.setValue(40);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          damping: 15,
          stiffness: 220,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 15,
          stiffness: 200,
        }),
      ]).start();
    }
  }, [visible, worker]);

  if (!worker) return null;

  const initials = worker.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const colorIdx = worker.name.charCodeAt(0) % AVATAR_COLORS.length;

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    await onSave(worker.id, {
      name: form.name.trim(),
      phone: form.phone.trim() || undefined,
      designation: form.designation.trim() || undefined,
      farm_name: form.farm_name.trim() || undefined,
    });
    setSaving(false);
    setEditing(false);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={dm.overlay}>
        <Animated.View
          style={[
            dm.card,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }, { translateY: slideAnim }],
            },
          ]}
        >
          {/* Header */}
          <LinearGradient
            colors={AVATAR_COLORS[colorIdx] as any}
            style={dm.headerGrad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={dm.headerTop}>
              <TouchableOpacity onPress={onClose} style={dm.closeCircle}>
                <Ionicons name="close" size={18} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setEditing(!editing)}
                style={dm.editCircle}
              >
                <Ionicons
                  name={editing ? "checkmark" : "pencil"}
                  size={16}
                  color="#fff"
                />
              </TouchableOpacity>
            </View>
            <View style={dm.avatarWrap}>
              <Text style={dm.avatarText}>{initials}</Text>
            </View>
            <Text style={dm.workerName}>{worker.name}</Text>
            <Text style={dm.workerEmail}>{worker.email}</Text>
            <View
              style={[
                dm.statusBadge,
                { backgroundColor: worker.is_active ? "#16a34a" : "#dc2626" },
              ]}
            >
              <View style={dm.statusDotWhite} />
              <Text style={dm.statusBadgeText}>
                {worker.is_active ? "Active" : "Inactive"}
              </Text>
            </View>
          </LinearGradient>

          <ScrollView style={dm.body} showsVerticalScrollIndicator={false}>
            {editing ? (
              <>
                <Text style={dm.sectionLabel}>EDIT DETAILS</Text>
                {[
                  {
                    icon: "person-outline",
                    key: "name",
                    label: "Full Name",
                    kb: "default",
                  },
                  {
                    icon: "call-outline",
                    key: "phone",
                    label: "Phone",
                    kb: "phone-pad",
                  },
                  {
                    icon: "briefcase-outline",
                    key: "designation",
                    label: "Designation",
                    kb: "default",
                  },
                  {
                    icon: "home-outline",
                    key: "farm_name",
                    label: "Farm Name",
                    kb: "default",
                  },
                ].map((f) => (
                  <View key={f.key} style={dm.inputRow}>
                    <Ionicons
                      name={f.icon as any}
                      size={16}
                      color="#888"
                      style={dm.inputIcon}
                    />
                    <TextInput
                      style={dm.input}
                      placeholder={f.label}
                      placeholderTextColor="#bbb"
                      value={(form as any)[f.key]}
                      onChangeText={(v) =>
                        setForm((p) => ({ ...p, [f.key]: v }))
                      }
                      keyboardType={f.kb as any}
                    />
                  </View>
                ))}
                <Text style={[dm.sectionLabel, { marginTop: 8 }]}>
                  DESIGNATION
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginBottom: 16 }}
                >
                  {DESIGNATIONS.map((d) => (
                    <TouchableOpacity
                      key={d}
                      style={[dm.chip, form.designation === d && dm.chipActive]}
                      onPress={() =>
                        setForm((p) => ({
                          ...p,
                          designation: p.designation === d ? "" : d,
                        }))
                      }
                    >
                      <Text
                        style={[
                          dm.chipText,
                          form.designation === d && dm.chipTextActive,
                        ]}
                      >
                        {d}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity
                  style={[dm.saveBtn, saving && { opacity: 0.6 }]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  <LinearGradient
                    colors={AVATAR_COLORS[colorIdx] as any}
                    style={dm.saveBtnGrad}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {saving ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Ionicons
                          name="checkmark-circle"
                          size={18}
                          color="#fff"
                        />
                        <Text style={dm.saveBtnText}>Save Changes</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={dm.sectionLabel}>DETAILS</Text>
                {[
                  { icon: "mail-outline", label: "Email", val: worker.email },
                  {
                    icon: "call-outline",
                    label: "Phone",
                    val: worker.phone || "—",
                  },
                  {
                    icon: "briefcase-outline",
                    label: "Designation",
                    val: worker.designation || "—",
                  },
                  {
                    icon: "home-outline",
                    label: "Farm",
                    val: worker.farm_name || "—",
                  },
                  {
                    icon: "shield-checkmark-outline",
                    label: "Verified",
                    val: worker.is_verified ? "Yes" : "No",
                  },
                ].map((row) => (
                  <View key={row.label} style={dm.detailRow}>
                    <View style={dm.detailIconBox}>
                      <Ionicons name={row.icon as any} size={15} color="#666" />
                    </View>
                    <View style={dm.detailInfo}>
                      <Text style={dm.detailLabel}>{row.label}</Text>
                      <Text style={dm.detailVal}>{row.val}</Text>
                    </View>
                  </View>
                ))}

                {/* Active toggle */}
                <View style={dm.toggleRow}>
                  <View style={dm.detailIconBox}>
                    <Ionicons name="power-outline" size={15} color="#666" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={dm.detailLabel}>Status</Text>
                    <Text style={dm.detailVal}>
                      {worker.is_active ? "Active" : "Inactive"}
                    </Text>
                  </View>
                  <Switch
                    value={worker.is_active}
                    onValueChange={(v) => onToggleActive(worker.id, v)}
                    trackColor={{ false: "#fecaca", true: "#bbf7d0" }}
                    thumbColor={worker.is_active ? "#16a34a" : "#dc2626"}
                  />
                </View>
              </>
            )}
            <View style={{ height: 24 }} />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const dm = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 28,
    width: "100%",
    overflow: "hidden",
    maxHeight: "88%",
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 12 },
    elevation: 18,
  },
  headerGrad: {
    paddingTop: 20,
    paddingBottom: 28,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 16,
  },
  closeCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  editCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: { fontSize: 22, fontWeight: "800", color: "#fff" },
  workerName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.3,
  },
  workerEmail: {
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
    marginTop: 3,
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusDotWhite: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#fff",
  },
  statusBadgeText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  body: { paddingHorizontal: 20, paddingTop: 20 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#bbb",
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  detailIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
  },
  detailInfo: { flex: 1 },
  detailLabel: { fontSize: 11, color: "#aaa", fontWeight: "600" },
  detailVal: {
    fontSize: 14,
    color: "#1a1a1a",
    fontWeight: "600",
    marginTop: 1,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
    paddingVertical: 4,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#eee",
    borderRadius: 13,
    paddingHorizontal: 12,
    marginBottom: 10,
    backgroundColor: "#fafafa",
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, paddingVertical: 13, fontSize: 15, color: "#1a1a1a" },
  chip: {
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginRight: 8,
    backgroundColor: "#fafafa",
  },
  chipActive: { borderColor: "#2d6a4f", backgroundColor: "#f0fdf4" },
  chipText: { fontSize: 12, fontWeight: "600", color: "#888" },
  chipTextActive: { color: "#2d6a4f" },
  saveBtn: { borderRadius: 16, overflow: "hidden", marginTop: 4 },
  saveBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
  },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});

// ── Worker Card ────────────────────────────────────────────────────────
function WorkerCard({
  item,
  index,
  onPress,
}: {
  item: Worker;
  index: number;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(24)).current;
  const colorPair = AVATAR_COLORS[index % AVATAR_COLORS.length];
  const initials = item.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 350,
        delay: index * 60,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        delay: index * 60,
        tension: 70,
        friction: 11,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }, { scale }] }}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        onPressIn={() =>
          Animated.spring(scale, {
            toValue: 0.97,
            useNativeDriver: true,
            speed: 50,
            bounciness: 2,
          }).start()
        }
        onPressOut={() =>
          Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
            speed: 30,
            bounciness: 4,
          }).start()
        }
      >
        <View style={styles.card}>
          <LinearGradient
            colors={colorPair as any}
            style={styles.avatar}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.avatarText}>{initials}</Text>
          </LinearGradient>
          <View style={styles.cardInfo}>
            <Text style={styles.workerName}>{item.name}</Text>
            <Text style={styles.workerEmail} numberOfLines={1}>
              {item.email}
            </Text>
            <View style={styles.cardTags}>
              {item.designation ? (
                <View style={styles.tag}>
                  <Text style={styles.tagText}>{item.designation}</Text>
                </View>
              ) : null}
              {item.phone ? (
                <View style={[styles.tag, styles.tagPhone]}>
                  <Ionicons name="call-outline" size={10} color="#5b8db8" />
                  <Text style={[styles.tagText, { color: "#5b8db8" }]}>
                    {item.phone}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
          <View style={styles.cardRight}>
            <View
              style={[
                styles.statusPill,
                { backgroundColor: item.is_active ? "#dcfce7" : "#fee2e2" },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: item.is_active ? "#16a34a" : "#dc2626" },
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: item.is_active ? "#16a34a" : "#dc2626" },
                ]}
              >
                {item.is_active ? "Active" : "Inactive"}
              </Text>
            </View>
            <View style={styles.editHint}>
              <Ionicons name="create-outline" size={13} color="#aaa" />
              <Text style={styles.editHintText}>tap to edit</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────
export default function WorkersScreen() {
  const router = useRouter();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [toast, setToast] = useState({
    visible: false,
    msg: "",
    variant: "success" as ToastVariant,
  });
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    designation: "",
    farm_name: "",
  });

  const showToast = (msg: string, variant: ToastVariant = "success") =>
    setToast({ visible: true, msg, variant });
  const hideToast = () => setToast((t) => ({ ...t, visible: false }));

  const fetchWorkers = async () => {
    try {
      setLoading(true);
      const data = await api.getAdminWorkers();
      setWorkers(data);
    } catch (e: any) {
      showToast(e?.message || "Failed to load workers", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkers();
  }, []);

  const handleCreate = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      showToast("Name, email and password are required", "error");
      return;
    }
    try {
      setCreating(true);
      await api.createWorker({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim() || undefined,
        designation: form.designation.trim() || undefined,
        farm_name: form.farm_name.trim() || undefined,
      });
      setModalVisible(false);
      setForm({
        name: "",
        email: "",
        phone: "",
        password: "",
        designation: "",
        farm_name: "",
      });
      fetchWorkers();
      showToast("Worker created successfully!", "success");
    } catch (e: any) {
      showToast(e?.message || "Failed to create worker", "error");
    } finally {
      setCreating(false);
    }
  };

  // ── Update worker ──
  const handleUpdateWorker = async (id: string, data: Partial<Worker>) => {
    try {
      await api.updateWorker(id, data);
      setWorkers((ws) => ws.map((w) => (w.id === id ? { ...w, ...data } : w)));
      if (selectedWorker?.id === id)
        setSelectedWorker((w) => (w ? { ...w, ...data } : w));
      showToast("Worker updated!", "success");
    } catch (e: any) {
      showToast(e?.message || "Update failed", "error");
    }
  };

  // ── Toggle active ──
  const handleToggleActive = async (id: string, active: boolean) => {
    try {
      await api.updateWorker(id, { is_active: active });
      setWorkers((ws) =>
        ws.map((w) => (w.id === id ? { ...w, is_active: active } : w)),
      );
      if (selectedWorker?.id === id)
        setSelectedWorker((w) => (w ? { ...w, is_active: active } : w));
      showToast(
        `Worker ${active ? "activated" : "deactivated"}`,
        active ? "success" : "info",
      );
    } catch (e: any) {
      showToast(e?.message || "Failed to update status", "error");
    }
  };

  const totalActive = workers.filter((w) => w.is_active).length;

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />

      {/* Toast */}
      <Toast
        msg={toast.msg}
        variant={toast.variant}
        visible={toast.visible}
        onHide={hideToast}
      />

      {/* Header */}
      <LinearGradient
        colors={["#112240", "#0a1a30"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#7ca9d4" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Farm Workers</Text>
          <Text style={styles.headerSub}>
            {workers.length} total · {totalActive} active
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setModalVisible(true)}
        >
          <LinearGradient
            colors={["#2d6a4f", "#1b4332"]}
            style={styles.addBtnGradient}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>

      {!loading && workers.length > 0 && (
        <View style={styles.statsBar}>
          <View style={styles.statChip}>
            <Ionicons name="people" size={13} color="#2d6a4f" />
            <Text style={styles.statChipText}>{workers.length} Workers</Text>
          </View>
          <View style={[styles.statChip, { backgroundColor: "#dcfce7" }]}>
            <View style={[styles.statusDot, { backgroundColor: "#16a34a" }]} />
            <Text style={[styles.statChipText, { color: "#16a34a" }]}>
              {totalActive} Active
            </Text>
          </View>
          <View style={[styles.statChip, { backgroundColor: "#fee2e2" }]}>
            <View style={[styles.statusDot, { backgroundColor: "#dc2626" }]} />
            <Text style={[styles.statChipText, { color: "#dc2626" }]}>
              {workers.length - totalActive} Inactive
            </Text>
          </View>
        </View>
      )}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2d6a4f" />
          <Text style={styles.loadingText}>Loading workers...</Text>
        </View>
      ) : workers.length === 0 ? (
        <View style={styles.centered}>
          <LinearGradient
            colors={["#1b4332", "#2d6a4f"]}
            style={styles.emptyIcon}
          >
            <Ionicons name="people-outline" size={36} color="#74c69d" />
          </LinearGradient>
          <Text style={styles.emptyTitle}>No Workers Yet</Text>
          <Text style={styles.emptySubtitle}>
            Add your first farm worker to get started
          </Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.emptyBtnText}>+ Add Worker</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={workers}
          keyExtractor={(w) => w.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <WorkerCard
              item={item}
              index={index}
              onPress={() => {
                setSelectedWorker(item);
                setDetailVisible(true);
              }}
            />
          )}
          ListFooterComponent={<View style={{ height: 100 }} />}
        />
      )}

      {/* Worker Detail / Edit Modal */}
      <WorkerDetailModal
        worker={selectedWorker}
        visible={detailVisible}
        onClose={() => setDetailVisible(false)}
        onSave={handleUpdateWorker}
        onToggleActive={handleToggleActive}
      />

      {/* Create Worker Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Add New Worker</Text>
                  <Text style={styles.modalSub}>
                    Worker will be bound to your farm
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={() => setModalVisible(false)}
                >
                  <Ionicons name="close" size={20} color="#666" />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.sectionLabel}>REQUIRED</Text>
                {[
                  {
                    icon: "person-outline",
                    key: "name",
                    label: "Full Name",
                    kb: "default",
                    secure: false,
                  },
                  {
                    icon: "mail-outline",
                    key: "email",
                    label: "Email",
                    kb: "email-address",
                    secure: false,
                  },
                  {
                    icon: "lock-closed-outline",
                    key: "password",
                    label: "Password",
                    kb: "default",
                    secure: true,
                  },
                ].map((f) => (
                  <View key={f.key} style={styles.inputWrapper}>
                    <Ionicons
                      name={f.icon as any}
                      size={16}
                      color="#999"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder={f.label}
                      placeholderTextColor="#bbb"
                      value={(form as any)[f.key]}
                      onChangeText={(v) =>
                        setForm((p) => ({ ...p, [f.key]: v }))
                      }
                      autoCapitalize="none"
                      keyboardType={f.kb as any}
                      secureTextEntry={f.secure}
                    />
                  </View>
                ))}
                <Text style={[styles.sectionLabel, { marginTop: 16 }]}>
                  OPTIONAL
                </Text>
                {[
                  {
                    icon: "call-outline",
                    key: "phone",
                    label: "Phone Number",
                    kb: "phone-pad",
                  },
                  {
                    icon: "briefcase-outline",
                    key: "designation",
                    label: "Designation",
                    kb: "default",
                  },
                ].map((f) => (
                  <View key={f.key} style={styles.inputWrapper}>
                    <Ionicons
                      name={f.icon as any}
                      size={16}
                      color="#999"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder={f.label}
                      placeholderTextColor="#bbb"
                      value={(form as any)[f.key]}
                      onChangeText={(v) =>
                        setForm((p) => ({ ...p, [f.key]: v }))
                      }
                      keyboardType={f.kb as any}
                    />
                  </View>
                ))}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginBottom: 16 }}
                >
                  {DESIGNATIONS.map((d) => (
                    <TouchableOpacity
                      key={d}
                      style={[
                        styles.designationChip,
                        form.designation === d && styles.designationChipActive,
                      ]}
                      onPress={() =>
                        setForm((f) => ({
                          ...f,
                          designation: f.designation === d ? "" : d,
                        }))
                      }
                    >
                      <Text
                        style={[
                          styles.designationChipText,
                          form.designation === d &&
                            styles.designationChipTextActive,
                        ]}
                      >
                        {d}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity
                  style={[styles.createBtn, creating && { opacity: 0.65 }]}
                  onPress={handleCreate}
                  disabled={creating}
                >
                  <LinearGradient
                    colors={["#2d6a4f", "#1b4332"]}
                    style={styles.createBtnGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {creating ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="person-add" size={18} color="#fff" />
                        <Text style={styles.createBtnText}>Create Worker</Text>
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

const IS_IOS = Platform.OS === "ios";
const STATUS_BAR_HEIGHT = IS_IOS ? 0 : (StatusBar.currentHeight ?? 0);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F0F4F8" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: IS_IOS ? 56 : STATUS_BAR_HEIGHT + 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#0d2137",
    borderWidth: 1,
    borderColor: "#1e3a5f",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: { flex: 1 },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#e8f4f8",
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 12,
    color: "#5b8db8",
    marginTop: 2,
    fontWeight: "500",
  },
  addBtn: { borderRadius: 14, overflow: "hidden" },
  addBtnGradient: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
  },
  statsBar: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  statChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#f0fdf4",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statChipText: { fontSize: 12, fontWeight: "600", color: "#2d6a4f" },
  list: { padding: 16, gap: 10 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
    gap: 12,
    marginBottom: 10,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 17,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.3,
  },
  cardInfo: { flex: 1, gap: 3 },
  workerName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1a1a1a",
    letterSpacing: -0.2,
  },
  workerEmail: { fontSize: 12, color: "#888", fontWeight: "500" },
  cardTags: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 4 },
  tag: {
    backgroundColor: "#f0fdf4",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagPhone: {
    backgroundColor: "#eff6ff",
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
  },
  tagText: { fontSize: 11, color: "#2d6a4f", fontWeight: "600" },
  cardRight: { alignItems: "flex-end", gap: 6 },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: "700" },
  editHint: { flexDirection: "row", alignItems: "center", gap: 3 },
  editHintText: { fontSize: 10, color: "#aaa", fontWeight: "500" },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  loadingText: { fontSize: 14, color: "#999", marginTop: 8 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 20, fontWeight: "800", color: "#1a1a1a" },
  emptySubtitle: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    lineHeight: 20,
  },
  emptyBtn: {
    backgroundColor: "#2d6a4f",
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 8,
  },
  emptyBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "#00000070",
    justifyContent: "flex-end",
  },
  modalBox: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: "90%",
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: "#e0e0e0",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#1a1a1a" },
  modalSub: { fontSize: 13, color: "#999", marginTop: 3 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#bbb",
    letterSpacing: 1,
    marginBottom: 10,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#eee",
    borderRadius: 14,
    paddingHorizontal: 12,
    backgroundColor: "#fafafa",
    marginBottom: 10,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, paddingVertical: 13, fontSize: 15, color: "#1a1a1a" },
  designationChip: {
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginRight: 8,
    backgroundColor: "#fafafa",
  },
  designationChipActive: { borderColor: "#2d6a4f", backgroundColor: "#f0fdf4" },
  designationChipText: { fontSize: 12, fontWeight: "600", color: "#888" },
  designationChipTextActive: { color: "#2d6a4f" },
  createBtn: { borderRadius: 16, overflow: "hidden", marginTop: 8 },
  createBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  createBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
