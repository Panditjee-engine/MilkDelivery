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
  LayoutAnimation,
  UIManager,
  Modal,
  Image,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { api } from "../../src/services/api";

const bullImg = require("../../assets/images/bull-cow.png");
const calfImg = require("../../assets/images/calf-cow.png");
const cowImg = require("../../assets/images/icon-cow.png");

const getAnimalImage = (type?: string) => {
  if (type === "bull") return bullImg;
  if (type === "newborn") return calfImg;
  return cowImg;
};

// Enable LayoutAnimation on Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ── Color Palette ──────────────────────────────────────────────────────────

const C = {
  primary: "#FF9675",
  secondary: "#FF9675",
  accent: "#8B6854",
  light: "#8B6854",
  dark: "#BB6B3F",
  deep: "#8B6854",
  bg: "#FFF8EF",
  card: "#FFE8D6",
  text: "#3D1F0A",
  textMuted: "#A07850",
  textLight: "#C9A882",
};

// ── Types ──────────────────────────────────────────────────────────────────

interface MedicalRecord {
  id: string;
  admin_id?: string;
  cowSrNo: string;
  cowName?: string;
  cowAge?: string;
  cowType?: string;
  cowPhoto?: string;
  currentStatus?: "healthy" | "unhealthy";
  lastVaccinationDate?: string;
  nextVaccinationDate?: string;
  vaccinationName?: string;
  lastIssueName?: string;
  lastIssueDate?: string;
  currentIssueName?: string;
  currentIssueDate?: string;
  treatmentGiven?: string;
  doctorName?: string;
  medicineName?: string;
  notes?: string;
  lastDewormingDate?: string;
  nextDewormingDate?: string;
  dewormingMedicine?: string;
  added_by_vet?: boolean;
  vet_name?: string;
  created_at: string;
}

interface VetCowOption {
  id: string;
  tag: string;
  tag_number?: string;
  name?: string;
  breed?: string;
  age?: string;
  type?: string;
  photo?: string;
  isLeasedOut?: boolean;
  isLeasedIn?: boolean;
  lessorFarmName?: string;
  leasedToFarmName?: string;
}

const IS_IOS = Platform.OS === "ios";
const STATUS_BAR_HEIGHT = IS_IOS ? 0 : (StatusBar.currentHeight ?? 0);

const HEADER_MAX_H = IS_IOS ? 170 : 170 + STATUS_BAR_HEIGHT;
const HEADER_MIN_H = IS_IOS ? 56 : 56 + STATUS_BAR_HEIGHT;
const SEARCH_H = 58;

function formatDate(dateStr?: string) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr; // already dd/mm/yyyy style string
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ── Detail Row ───────────────────────────────────────────────────────────

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value?: string | number | boolean;
}) {
  if (value === undefined || value === null || value === "") return null;
  const displayVal =
    typeof value === "boolean" ? (value ? "Yes" : "No") : String(value);
  return (
    <View style={detail.row}>
      <View style={detail.iconWrap}>
        <Ionicons name={icon} size={12} color={C.primary} />
      </View>
      <Text style={detail.label}>{label}:</Text>
      <Text style={detail.value} numberOfLines={2}>
        {displayVal}
      </Text>
    </View>
  );
}

const detail = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginBottom: 6,
  },
  iconWrap: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  label: { fontSize: 11, color: C.textMuted, fontWeight: "600", minWidth: 90 },
  value: {
    fontSize: 11,
    color: C.text,
    fontWeight: "500",
    flex: 1,
    lineHeight: 16,
  },
});

// ── Cow Avatar ───────────────────────────────────────────────────────────

function CowAvatar({ record }: { record: MedicalRecord }) {
  return record.cowPhoto ? (
    <Image
      source={{ uri: record.cowPhoto }}
      style={mc.iconBox}
      resizeMode="cover"
    />
  ) : (
    <View style={mc.iconBox}>
      <Image
        source={getAnimalImage(record.cowType)}
        style={{ width: 26, height: 26, resizeMode: "contain" }}
      />
    </View>
  );
}

// ── Medicine / Medical Record Card ──────────────────────────────────────

function MedicineCard({
  record,
  index,
}: {
  record: MedicalRecord;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(24)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 340,
        delay: index * 60,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        delay: index * 60,
        tension: 75,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Animated.timing(rotateAnim, {
      toValue: expanded ? 0 : 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
    setExpanded(!expanded);
  };

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const isHealthy = record.currentStatus !== "unhealthy";
  const statusColor = isHealthy ? "#16a34a" : "#dc2626";

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <TouchableOpacity activeOpacity={0.88} onPress={toggle} style={mc.card}>
        <View style={[mc.stripe, { backgroundColor: statusColor }]} />

        <View style={mc.topRow}>
          <CowAvatar record={record} />
          <View style={mc.titleBlock}>
            <Text style={mc.medicineName}>
              {record.cowName || record.cowSrNo}
            </Text>
            <View style={mc.animalRow}>
              <Ionicons name="pricetag" size={11} color={C.textMuted} />
              <Text style={mc.animalText}>{record.cowSrNo}</Text>
              {record.added_by_vet && (
                <View style={mc.vetBadge}>
                  <Text style={mc.vetBadgeText}>You</Text>
                </View>
              )}
            </View>
          </View>
          <View style={mc.rightCol}>
            <View
              style={[
                mc.statusBadge,
                { backgroundColor: statusColor + "18", borderColor: statusColor + "44" },
              ]}
            >
              <View style={[mc.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[mc.statusText, { color: statusColor }]}>
                {isHealthy ? "Healthy" : "Unhealthy"}
              </Text>
            </View>
            <Animated.View style={{ transform: [{ rotate }], marginTop: 8 }}>
              <Ionicons name="chevron-down" size={16} color={C.textMuted} />
            </Animated.View>
          </View>
        </View>

        {/* Always-visible footer */}
        <View style={mc.footerRow}>
          {record.medicineName ? (
            <View style={mc.dateChip}>
              <Ionicons name="flask-outline" size={11} color={C.textMuted} />
              <Text style={mc.dateText}>{record.medicineName}</Text>
            </View>
          ) : null}
          {record.currentIssueName ? (
            <View style={[mc.dateChip, mc.dueChip]}>
              <Ionicons name="alert-circle-outline" size={11} color={C.dark} />
              <Text style={[mc.dateText, { color: C.dark }]}>
                {record.currentIssueName}
              </Text>
            </View>
          ) : null}
          <View style={mc.dateChip}>
            <Ionicons name="calendar-outline" size={11} color={C.textMuted} />
            <Text style={mc.dateText}>{formatDate(record.created_at)}</Text>
          </View>
        </View>

        {/* Expanded Details */}
        {expanded && (
          <View style={mc.expandedBox}>
            <View style={mc.divider} />
            <Text style={mc.sectionHead}>
              <Ionicons name="list-outline" size={12} color={C.accent} /> Full
              Details
            </Text>
            <View style={mc.detailGrid}>
              <DetailRow icon="paw-outline" label="Cow" value={record.cowName} />
              <DetailRow
                icon="pricetag-outline"
                label="Sr. No."
                value={record.cowSrNo}
              />
              <DetailRow icon="time-outline" label="Age" value={record.cowAge} />
              <DetailRow
                icon="shield-checkmark-outline"
                label="Vaccine"
                value={record.vaccinationName}
              />
              <DetailRow
                icon="calendar-outline"
                label="Last Vacc."
                value={formatDate(record.lastVaccinationDate)}
              />
              <DetailRow
                icon="calendar-outline"
                label="Next Vacc."
                value={formatDate(record.nextVaccinationDate)}
              />
              <DetailRow
                icon="bandage-outline"
                label="Last Issue"
                value={record.lastIssueName}
              />
              <DetailRow
                icon="alert-circle-outline"
                label="Current Issue"
                value={record.currentIssueName}
              />
              <DetailRow
                icon="medical-outline"
                label="Treatment"
                value={record.treatmentGiven}
              />
              <DetailRow
                icon="flask-outline"
                label="Medicine"
                value={record.medicineName}
              />
              <DetailRow
                icon="bug-outline"
                label="Deworming"
                value={record.dewormingMedicine}
              />
              <DetailRow
                icon="calendar-outline"
                label="Next Deworm"
                value={formatDate(record.nextDewormingDate)}
              />
              <DetailRow
                icon="person-outline"
                label="Doctor"
                value={record.doctorName || record.vet_name}
              />
              {record.notes ? (
                <View style={mc.notesBox}>
                  <Ionicons
                    name="document-text-outline"
                    size={11}
                    color={C.textMuted}
                  />
                  <Text style={mc.notesText}>{record.notes}</Text>
                </View>
              ) : null}
            </View>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const mc = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: C.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#FFD9BE",
  },
  stripe: { height: 3, opacity: 0.7 },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    paddingBottom: 8,
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  titleBlock: { flex: 1, gap: 4 },
  medicineName: {
    fontSize: 15,
    fontWeight: "800",
    color: C.text,
    letterSpacing: -0.2,
  },
  animalRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  animalText: { fontSize: 12, color: C.textMuted, fontWeight: "600" },
  vetBadge: {
    marginLeft: 4,
    backgroundColor: C.card,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  vetBadgeText: { fontSize: 9, color: C.dark, fontWeight: "700" },
  rightCol: { alignItems: "flex-end", gap: 2 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: "700" },
  dosageBadge: {
    backgroundColor: C.card,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  dosageText: { fontSize: 11, color: C.dark, fontWeight: "700" },
  footerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingHorizontal: 14,
    paddingBottom: 12,
    paddingTop: 4,
  },
  dateChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.bg,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  dueChip: { backgroundColor: "#FFF0E6" },
  dateText: { fontSize: 11, color: C.textMuted, fontWeight: "600" },
  expandedBox: { paddingHorizontal: 14, paddingBottom: 14 },
  divider: { height: 1, backgroundColor: C.card, marginBottom: 12 },
  sectionHead: {
    fontSize: 12,
    fontWeight: "700",
    color: C.accent,
    marginBottom: 10,
  },
  detailGrid: { gap: 0 },
  notesBox: {
    flexDirection: "row",
    gap: 6,
    backgroundColor: C.bg,
    borderRadius: 10,
    padding: 10,
    marginTop: 4,
  },
  notesText: {
    fontSize: 11,
    color: C.textMuted,
    flex: 1,
    lineHeight: 16,
    fontStyle: "italic",
  },
});

// ── Vet Cow Selector (for Add Record modal) ────────────────────────────

function VetCowSelector({
  value,
  onSelect,
}: {
  value: { tag: string; name?: string } | null;
  onSelect: (c: VetCowOption) => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [allCows, setAllCows] = useState<VetCowOption[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

const open = async () => {
  setModalOpen(true);
  setSearch("");
  setLoading(true);
  try {
    const data = await api.vetGetCows();
    setAllCows(Array.isArray(data) ? data : []);
  } catch {
    setAllCows([]);
  } finally {
    setLoading(false);
  }
};

  const close = () => {
    setModalOpen(false);
    setSearch("");
  };

  const visible = allCows.filter((c) => {
    if (c.isLeasedOut) return false; // never allow selecting leased-out cows
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (c.tag || "").toLowerCase().includes(q) ||
      (c.name || "").toLowerCase().includes(q)
    );
  });

  return (
    <>
      <View style={{ marginBottom: 12 }}>
        <Text style={vcs.label}>COW SR. NO.</Text>
        <TouchableOpacity style={vcs.selectBtn} onPress={open} activeOpacity={0.85}>
          <Ionicons
            name={value ? "checkmark-circle" : "search-outline"}
            size={16}
            color={value ? "#16a34a" : C.primary}
          />
          <Text style={vcs.selectBtnText}>
            {value ? `${value.tag}${value.name ? ` · ${value.name}` : ""}` : "Select Cow"}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={close}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <TouchableOpacity style={vcs.overlay} activeOpacity={1} onPress={close}>
            <TouchableOpacity activeOpacity={1} style={vcs.sheet} onPress={() => {}}>
              <View style={vcs.sheetHeader}>
                <Text style={vcs.sheetTitle}>Select Cow</Text>
                <TouchableOpacity onPress={close} style={vcs.sheetClose}>
                  <Ionicons name="close" size={18} color="#6b7280" />
                </TouchableOpacity>
              </View>
              <View style={vcs.searchBox}>
                <Ionicons name="search-outline" size={14} color="#9ca3af" />
                <TextInput
                  style={vcs.searchInput}
                  placeholder="Search tag or name..."
                  placeholderTextColor="#d1d5db"
                  value={search}
                  onChangeText={setSearch}
                />
                {search.length > 0 && (
                  <TouchableOpacity onPress={() => setSearch("")}>
                    <Ionicons name="close-circle" size={14} color="#9ca3af" />
                  </TouchableOpacity>
                )}
              </View>
              {loading ? (
                <View style={vcs.loadBox}>
                  <ActivityIndicator color={C.primary} size="large" />
                  <Text style={vcs.loadText}>Loading cows...</Text>
                </View>
              ) : (
                <FlatList
                  data={visible}
                  keyExtractor={(i) => i.id}
                  style={{ flexGrow: 0 }}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{ paddingBottom: 8 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={vcs.cowRow}
                      onPress={() => {
                        onSelect(item);
                        close();
                      }}
                      activeOpacity={0.75}
                    >
                      <View style={vcs.cowIcon}>
                        {item.photo ? (
                          <Image
                            source={{ uri: item.photo }}
                            style={{ width: 38, height: 38, borderRadius: 10 }}
                            resizeMode="cover"
                          />
                        ) : (
                          <Image
                            source={getAnimalImage(item.type)}
                            style={{ width: 24, height: 24, resizeMode: "contain" }}
                          />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={vcs.cowTag}>{item.tag}</Text>
                        <Text style={vcs.cowMeta}>
                          {item.name}
                          {item.breed ? ` · ${item.breed}` : ""}
                        </Text>
                        {item.isLeasedIn && (
                          <Text style={vcs.leaseTag}>
                            Leased in{item.lessorFarmName ? ` from ${item.lessorFarmName}` : ""}
                          </Text>
                        )}
                      </View>
                      <Ionicons name="chevron-forward" size={14} color="#d1d5db" />
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    <View style={vcs.emptyBox}>
                      <Text style={vcs.emptyText}>
                        No cows available at your branch
                      </Text>
                    </View>
                  }
                />
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const vcs = StyleSheet.create({
  label: {
    fontSize: 10,
    color: C.textMuted,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  selectBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  selectBtnText: { fontSize: 13, fontWeight: "700", color: C.text },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-start",
    paddingTop: Platform.OS === "ios" ? 60 : (StatusBar.currentHeight ?? 0) + 16,
    paddingBottom: 16,
  },
  sheet: {
    backgroundColor: "#fff",
    borderRadius: 20,
    marginHorizontal: 16,
    minHeight: 260,
    maxHeight: "80%",
    overflow: "hidden",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },
  sheetTitle: { fontSize: 16, fontWeight: "800", color: "#0f172a" },
  sheetClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 6,
  },
  searchInput: { flex: 1, color: "#0f172a", fontSize: 14 },
  loadBox: { paddingVertical: 40, alignItems: "center", gap: 8 },
  loadText: { fontSize: 13, color: "#94a3b8" },
  cowRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f8fafc",
    gap: 10,
  },
  cowIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cowTag: { fontSize: 13, fontWeight: "700", color: "#0f172a" },
  cowMeta: { fontSize: 11, color: "#94a3b8", fontWeight: "500", marginTop: 1 },
  leaseTag: { fontSize: 10, color: "#7c3aed", fontWeight: "600", marginTop: 2 },
  emptyBox: { paddingVertical: 40, alignItems: "center", gap: 8 },
  emptyText: { fontSize: 14, color: "#94a3b8", fontWeight: "600" },
});

// ── Add Medical Record Modal ────────────────────────────────────────────

const COMMON_ISSUES = [
  "Fever",
  "Mastitis",
  "Bloat",
  "Diarrhea",
  "Lameness",
  "Eye Infection",
  "Skin Disease",
  "Respiratory",
  "Tick Infestation",
  "FMD",
];

function VetAddRecordModal({
  visible,
  onClose,
  onSaved,
}: {
  visible: boolean;
  onClose: () => void;
  onSaved: (r: MedicalRecord) => void;
}) {
  const [cow, setCow] = useState<VetCowOption | null>(null);
  const [status, setStatus] = useState<"healthy" | "unhealthy">("healthy");
  const [issue, setIssue] = useState("");
  const [treatment, setTreatment] = useState("");
  const [medicine, setMedicine] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setCow(null);
    setStatus("healthy");
    setIssue("");
    setTreatment("");
    setMedicine("");
    setNotes("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const submit = async () => {
    if (!cow) {
      Alert.alert("Missing", "Please select a cow first.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        cowSrNo: cow.tag,
        cowName: cow.name || undefined,
        cowAge: cow.age || undefined,
        currentStatus: status,
        currentIssueName: issue || undefined,
        treatmentGiven: treatment || undefined,
        medicineName: medicine || undefined,
        notes: notes || undefined,
      };
      const result = await api.createVetMedicalRecord(payload);
      onSaved({
        ...result,
        cowType: cow.type,
        cowPhoto: cow.photo,
      });
      reset();
      onClose();
    } catch (err: any) {
      Alert.alert(
        "Error",
        err?.message ??
          "Could not save. This animal may be leased out or outside your branch.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={am.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ width: "100%" }}
        >
          <View style={am.sheet}>
            <View style={am.handle} />
            <View style={am.header}>
              <View style={am.iconWrap}>
                <Ionicons name="add-circle" size={18} color={C.primary} />
              </View>
              <Text style={am.title}>Add Medical Record</Text>
              <TouchableOpacity onPress={handleClose} style={am.closeBtn}>
                <Ionicons name="close" size={18} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 460 }}
              keyboardShouldPersistTaps="handled"
            >
              <VetCowSelector
                value={cow ? { tag: cow.tag, name: cow.name } : null}
                onSelect={setCow}
              />

              <Text style={am.label}>STATUS</Text>
              <View style={am.statusRow}>
                <TouchableOpacity
                  style={[am.statusBtn, status === "healthy" && am.statusActiveHealthy]}
                  onPress={() => setStatus("healthy")}
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color={status === "healthy" ? "#fff" : "#9ca3af"}
                  />
                  <Text style={[am.statusBtnText, status === "healthy" && am.statusActiveText]}>
                    Healthy
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[am.statusBtn, status === "unhealthy" && am.statusActiveUnhealthy]}
                  onPress={() => setStatus("unhealthy")}
                >
                  <Ionicons
                    name="alert-circle"
                    size={16}
                    color={status === "unhealthy" ? "#fff" : "#9ca3af"}
                  />
                  <Text style={[am.statusBtnText, status === "unhealthy" && am.statusActiveText]}>
                    Unhealthy
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={am.label}>ISSUE</Text>
              <View style={am.chipGrid}>
                {COMMON_ISSUES.map((opt) => {
                  const active = issue === opt;
                  return (
                    <TouchableOpacity
                      key={opt}
                      style={[am.chip, active && am.chipActive]}
                      onPress={() => setIssue(active ? "" : opt)}
                    >
                      <Text style={[am.chipText, active && am.chipTextActive]}>
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={am.inputRow}>
                <Ionicons name="bandage-outline" size={14} color={C.primary} style={{ marginRight: 8 }} />
                <TextInput
                  style={am.input}
                  value={issue}
                  onChangeText={setIssue}
                  placeholder="Or type custom issue..."
                  placeholderTextColor="#c9a882"
                />
              </View>

              <Text style={am.label}>TREATMENT GIVEN</Text>
              <View style={am.inputRow}>
                <Ionicons name="medical-outline" size={14} color={C.primary} style={{ marginRight: 8 }} />
                <TextInput
                  style={am.input}
                  value={treatment}
                  onChangeText={setTreatment}
                  placeholder="e.g. Antibiotic, Homeopathic..."
                  placeholderTextColor="#c9a882"
                />
              </View>

              <Text style={am.label}>MEDICINE NAME</Text>
              <View style={am.inputRow}>
                <Ionicons name="flask-outline" size={14} color={C.primary} style={{ marginRight: 8 }} />
                <TextInput
                  style={am.input}
                  value={medicine}
                  onChangeText={setMedicine}
                  placeholder="e.g. Oxytetracycline"
                  placeholderTextColor="#c9a882"
                />
              </View>

              <Text style={am.label}>NOTES</Text>
              <View style={[am.inputRow, { alignItems: "flex-start", paddingVertical: 10 }]}>
                <Ionicons name="chatbubble-outline" size={14} color={C.primary} style={{ marginRight: 8, marginTop: 2 }} />
                <TextInput
                  style={[am.input, { minHeight: 54, textAlignVertical: "top" }]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Any extra remarks..."
                  placeholderTextColor="#c9a882"
                  multiline
                />
              </View>
              <View style={{ height: 16 }} />
            </ScrollView>

            <TouchableOpacity
              onPress={submit}
              style={[am.submitBtn, submitting && { opacity: 0.6 }]}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                  <Text style={am.submitText}>Save Record</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const am = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: C.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: C.card,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 18,
  },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    marginLeft: 10,
    fontSize: 17,
    fontWeight: "800",
    color: C.text,
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 10,
    color: C.textMuted,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 10,
    textTransform: "uppercase",
  },
  statusRow: { flexDirection: "row", gap: 10, marginBottom: 4 },
  statusBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: C.card,
  },
  statusActiveHealthy: { backgroundColor: "#16a34a", borderColor: "#16a34a" },
  statusActiveUnhealthy: { backgroundColor: "#dc2626", borderColor: "#dc2626" },
  statusBtnText: { fontSize: 13, fontWeight: "700", color: "#9ca3af" },
  statusActiveText: { color: "#fff" },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: 8 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: C.card,
  },
  chipActive: { backgroundColor: C.primary, borderColor: C.primary },
  chipText: { fontSize: 11, fontWeight: "700", color: C.textMuted },
  chipTextActive: { color: "#fff" },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.card,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 4,
  },
  input: { flex: 1, color: C.text, fontSize: 14, fontWeight: "500" },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.primary,
    borderRadius: 14,
    paddingVertical: 15,
    gap: 8,
    marginTop: 10,
  },
  submitText: { fontSize: 15, fontWeight: "800", color: "#fff", letterSpacing: -0.2 },
});

// ── Main Page ────────────────────────────────────────────────────────────

export default function MedicalPage() {
  const router = useRouter();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [addVisible, setAddVisible] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollThreshold = HEADER_MAX_H - HEADER_MIN_H;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getVetMedicalRecords();
      setRecords(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("MedicalPage load error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const headerHeight = scrollY.interpolate({
    inputRange: [0, scrollThreshold],
    outputRange: [HEADER_MAX_H, HEADER_MIN_H],
    extrapolate: "clamp",
  });
  const searchOpacity = scrollY.interpolate({
    inputRange: [0, scrollThreshold * 0.5, scrollThreshold],
    outputRange: [1, 0, 0],
    extrapolate: "clamp",
  });
  const titleScale = scrollY.interpolate({
    inputRange: [0, scrollThreshold],
    outputRange: [1, 0.88],
    extrapolate: "clamp",
  });
  const titleTranslateX = scrollY.interpolate({
    inputRange: [0, scrollThreshold],
    outputRange: [0, -12],
    extrapolate: "clamp",
  });

  const q = searchQuery.toLowerCase().trim();
  const filtered = records.filter(
    (r) =>
      !q ||
      (r.cowSrNo || "").toLowerCase().includes(q) ||
      (r.cowName || "").toLowerCase().includes(q) ||
      (r.medicineName || "").toLowerCase().includes(q),
  );

  return (
    <View style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      <Animated.View style={[s.header, { height: headerHeight }]}>
        <LinearGradient
          colors={["#FFEEDE", "#FFF8EF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={s.blob1} />
        <View style={s.blob2} />

        <View
          style={[
            s.headerTopRow,
            { paddingTop: IS_IOS ? 56 : STATUS_BAR_HEIGHT + 16 },
          ]}
        >
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={C.text} />
          </TouchableOpacity>
          <Animated.Text
            style={[
              s.headerTitle,
              {
                transform: [
                  { scale: titleScale },
                  { translateX: titleTranslateX },
                ],
              },
            ]}
            numberOfLines={1}
          >
            Medical Records
          </Animated.Text>
          <View style={s.countBadge}>
            <Text style={s.countText}>{filtered.length}</Text>
          </View>
        </View>

        <Animated.View style={[s.searchRow, { opacity: searchOpacity }]}>
          <View style={s.searchBox}>
            <Ionicons name="search-outline" size={16} color={C.textLight} />
            <TextInput
              style={s.searchInput}
              placeholder="Search cow, medicine..."
              placeholderTextColor={C.textLight}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={16} color={C.textLight} />
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </Animated.View>

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={s.loadingText}>Loading records...</Text>
        </View>
      ) : (
        <Animated.FlatList
          data={filtered}
          keyExtractor={(item: any) => item.id}
          renderItem={({ item, index }: { item: MedicalRecord; index: number }) => (
            <MedicineCard record={item} index={index} />
          )}
          contentContainerStyle={[
            s.listContent,
            filtered.length === 0 && s.listContentEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false },
          )}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={C.primary}
              colors={[C.primary]}
              progressViewOffset={HEADER_MAX_H}
            />
          }
          ListEmptyComponent={
            <View style={s.centered}>
              <View style={s.emptyIconBox}>
                <Ionicons name="medical-outline" size={32} color={C.textLight} />
              </View>
              <Text style={s.emptyTitle}>No Medical Records</Text>
              <Text style={s.emptySubtitle}>No records found</Text>
            </View>
          }
          ListFooterComponent={<View style={{ height: 90 }} />}
          contentInset={{ top: HEADER_MAX_H }}
          contentOffset={{ x: 0, y: -HEADER_MAX_H }}
          automaticallyAdjustContentInsets={false}
        />
      )}

      <TouchableOpacity
        style={s.fab}
        onPress={() => setAddVisible(true)}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={26} color="#fff" />
      </TouchableOpacity>

      <VetAddRecordModal
        visible={addVisible}
        onClose={() => setAddVisible(false)}
        onSaved={(r) => setRecords((prev) => [r, ...prev])}
      />
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },

  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    overflow: "hidden",
    borderBottomWidth: 1,
    borderBottomColor: "#FFD9BE",
    shadowColor: C.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  blob1: {
    position: "absolute",
    top: -30,
    right: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: C.primary,
    opacity: 0.12,
  },
  blob2: {
    position: "absolute",
    top: 60,
    right: 60,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.dark,
    opacity: 0.07,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: "#FFD9BE",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    marginLeft: 12,
    fontSize: 18,
    fontWeight: "800",
    color: C.text,
    letterSpacing: -0.3,
  },
  countBadge: {
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#FFD9BE",
  },
  countText: { fontSize: 12, fontWeight: "700", color: C.dark },

  searchRow: { paddingHorizontal: 16, marginBottom: 8 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FFD9BE",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 13, color: C.text },

  listContent: { paddingHorizontal: 16, paddingTop: HEADER_MAX_H + 12 },
  listContentEmpty: { flexGrow: 1 },

  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingTop: HEADER_MAX_H,
  },
  loadingText: { fontSize: 13, color: C.textMuted, fontWeight: "500" },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FFD9BE",
  },
  emptyTitle: { fontSize: 17, fontWeight: "800", color: C.text },
  emptySubtitle: { fontSize: 13, color: C.textMuted, textAlign: "center" },

  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: C.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
});