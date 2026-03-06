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
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../../../src/services/api";

type FeedStatus = "fed" | "pending";
type Shift = "morning" | "evening";

const FEED_SUGGESTIONS = [
  "Dry Fodder",
  "Green Fodder",
  "Concentrate",
  "Silage",
  "Mixed Feed",
  "Mineral Mix",
];

interface CowFeedRow {
  id: string;
  srNo: string;
  name: string;
  breed: string;
  morning: FeedStatus;
  evening: FeedStatus;
  morningNote: string;
  eveningNote: string;
  morningFeedType?: string;
  morningQuantity?: number;
  eveningFeedType?: string;
  eveningQuantity?: number;
}

interface Summary {
  total: number;
  both_fed: number;
  morning_fed: number;
  evening_fed: number;
  not_fed_at_all: number;
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function mapToCowRows(cows: any[]): CowFeedRow[] {
  return cows.map((c) => ({
    id: c.cow_id,
    srNo: c.cow_tag || c.cow_id,
    name: c.cow_name || "Unknown",
    breed: c.breed || "",
    morning: c.morning_fed ? "fed" : "pending",
    evening: c.evening_fed ? "fed" : "pending",
    morningNote: c.morning_worker ? `By ${c.morning_worker}` : "—",
    eveningNote: c.evening_worker ? `By ${c.evening_worker}` : "—",
    morningFeedType: c.morning_feed_type || undefined,
    morningQuantity: c.morning_quantity_kg ?? undefined,
    eveningFeedType: c.evening_feed_type || undefined,
    eveningQuantity: c.evening_quantity_kg ?? undefined,
  }));
}

const STATUS_CFG: Record<
  FeedStatus,
  { color: string; bg: string; border: string; icon: string; label: string }
> = {
  fed: {
    color: "#16a34a",
    bg: "#f0fdf4",
    border: "#86efac",
    icon: "checkmark-circle",
    label: "Fed",
  },
  pending: {
    color: "#d97706",
    bg: "#fffbeb",
    border: "#fcd34d",
    icon: "time",
    label: "Pending",
  },
};

const FILTERS = ["All", "Both Fed", "Pending"] as const;

function FeedDetailModal({
  visible,
  cow,
  shift,
  currentFeedType,
  currentQuantity,
  onClose,
  onSave,
}: {
  visible: boolean;
  cow: CowFeedRow | null;
  shift: Shift;
  currentFeedType?: string;
  currentQuantity?: number;
  onClose: () => void;
  onSave: (feedType: string, quantity: number) => void;
}) {
  const [selectedType, setSelectedType] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setSelectedType(currentFeedType || "");
      setQuantity(currentQuantity ? String(currentQuantity) : "");
    }
  }, [visible, currentFeedType, currentQuantity]);

  const handleSave = async () => {
    if (!selectedType) {
      Alert.alert("Required", "Please select a feed type");
      return;
    }
    if (!quantity || isNaN(Number(quantity)) || Number(quantity) <= 0) {
      Alert.alert("Required", "Please enter a valid quantity");
      return;
    }
    setSaving(true);
    try {
      await onSave(selectedType, Number(quantity));
      onClose();
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (!cow) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={fd.overlay}>
          <View style={fd.sheet}>
            <View style={fd.handle} />

            <View style={fd.header}>
              <View>
                <Text style={fd.title}>Feed Details</Text>
                <Text style={fd.sub}>
                  {cow.name} ·{" "}
                  {shift === "morning" ? "☀️ Morning" : "🌙 Evening"}
                </Text>
              </View>
              <TouchableOpacity style={fd.closeBtn} onPress={onClose}>
                <Ionicons name="close" size={18} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <Text style={fd.sectionLabel}>FEED TYPE</Text>
            <View style={fd.feedInputWrap}>
              <Ionicons
                name="leaf-outline"
                size={16}
                color="#9ca3af"
                style={{ marginRight: 8 }}
              />
              <TextInput
                style={fd.feedInput}
                value={selectedType}
                onChangeText={setSelectedType}
                placeholder="Type feed name e.g. Dry Fodder"
                placeholderTextColor="#d1d5db"
              />
              {selectedType.length > 0 && (
                <TouchableOpacity onPress={() => setSelectedType("")}>
                  <Ionicons name="close-circle" size={16} color="#9ca3af" />
                </TouchableOpacity>
              )}
            </View>
            
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginTop: 8, marginBottom: 4 }}
            >
              {FEED_SUGGESTIONS.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[
                    fd.suggestionChip,
                    selectedType === s && fd.suggestionChipActive,
                  ]}
                  onPress={() => setSelectedType(s)}
                >
                  <Text
                    style={[
                      fd.suggestionText,
                      selectedType === s && fd.suggestionTextActive,
                    ]}
                  >
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[fd.sectionLabel, { marginTop: 16 }]}>
              QUANTITY (KG)
            </Text>
            <View style={fd.quantityRow}>
              <TouchableOpacity
                style={fd.qBtn}
                onPress={() => {
                  const v = Math.max(0, (Number(quantity) || 0) - 0.5);
                  setQuantity(String(v));
                }}
              >
                <Ionicons name="remove" size={20} color="#374151" />
              </TouchableOpacity>
              <TextInput
                style={fd.qInput}
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="decimal-pad"
                placeholder="0.0"
                placeholderTextColor="#d1d5db"
              />
              <TouchableOpacity
                style={fd.qBtn}
                onPress={() =>
                  setQuantity(String((Number(quantity) || 0) + 0.5))
                }
              >
                <Ionicons name="add" size={20} color="#374151" />
              </TouchableOpacity>
            </View>

            {/* Quick quantity chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginTop: 10, marginBottom: 20 }}
            >
              {["5", "10", "15", "20", "25", "30"].map((q) => (
                <TouchableOpacity
                  key={q}
                  style={[fd.qChip, quantity === q && fd.qChipActive]}
                  onPress={() => setQuantity(q)}
                >
                  <Text
                    style={[fd.qChipText, quantity === q && fd.qChipTextActive]}
                  >
                    {q} kg
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[fd.saveBtn, saving && { opacity: 0.65 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="save-outline" size={18} color="#fff" />
                  <Text style={fd.saveBtnText}>Save Feed Details</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function FeedBadge({
  status,
  note,
  session,
  feedType,
  quantity,
  onEdit,
}: {
  status: FeedStatus;
  note: string;
  session: string;
  feedType?: string;
  quantity?: number;
  onEdit: () => void;
}) {
  const cfg = STATUS_CFG[status];
  return (
    <View
      style={[
        s.sessionCard,
        { backgroundColor: cfg.bg, borderColor: cfg.border },
      ]}
    >
      <View style={s.sessionTop}>
        <View style={s.sessionIconWrap}>
          <Ionicons
            name={session === "Morning" ? "sunny" : "moon"}
            size={13}
            color={session === "Morning" ? "#d97706" : "#6366f1"}
          />
        </View>
        <Text style={s.sessionLabel}>{session}</Text>
        <View style={[s.statusDot, { backgroundColor: cfg.color }]} />
      </View>
      <View style={s.sessionBottom}>
        <Ionicons name={cfg.icon as any} size={16} color={cfg.color} />
        <Text style={[s.statusLabel, { color: cfg.color }]}>{cfg.label}</Text>
      </View>

      {feedType && quantity !== undefined && (
        <Text style={s.feedSummaryText}>
          🌾 {feedType} · {quantity} kg
        </Text>
      )}
      <TouchableOpacity
        style={[
          s.feedActionBtn,
          feedType ? s.feedActionBtnUpdate : s.feedActionBtnAdd,
        ]}
        onPress={onEdit}
      >
        <Ionicons
          name={feedType ? "pencil" : "add"}
          size={13}
          color={feedType ? "#2563eb" : "#16a34a"}
        />
        <Text
          style={[
            s.feedActionBtnText,
            { color: feedType ? "#2563eb" : "#16a34a" },
          ]}
        >
          {feedType ? "Update Feed" : "Add Feed"}
        </Text>
      </TouchableOpacity>

      {note !== "—" && (
        <Text style={s.noteText} numberOfLines={1}>
          {note}
        </Text>
      )}
    </View>
  );
}

function FeedCard({
  item,
  index,
  activeShift,
  onEditFeed,
}: {
  item: CowFeedRow;
  index: number;
  activeShift: Shift | "both";
  onEditFeed: (cow: CowFeedRow, shift: Shift) => void;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 280,
        delay: index * 50,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        delay: index * 50,
        tension: 70,
        friction: 12,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const bothFed = item.morning === "fed" && item.evening === "fed";
  const shiftStatus =
    activeShift === "morning"
      ? item.morning
      : activeShift === "evening"
        ? item.evening
        : bothFed
          ? "fed"
          : "pending";

  const overallColor = shiftStatus === "fed" ? "#16a34a" : "#d97706";
  const overallBg = shiftStatus === "fed" ? "#f0fdf4" : "#fffbeb";
  const overallBorder = shiftStatus === "fed" ? "#86efac" : "#fcd34d";
  const overallLabel =
    activeShift !== "both"
      ? shiftStatus === "fed"
        ? "Fed"
        : "Pending"
      : bothFed
        ? "Fully Fed"
        : "Partially Fed";

  return (
    <Animated.View style={[s.card, { opacity, transform: [{ translateY }] }]}>
      <View style={s.cardHeader}>
        <View style={s.cowAvatarWrap}>
          <Text style={{ fontSize: 22 }}>🐄</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={s.cowName}>{item.name}</Text>
          <Text style={s.cowSr}>
            {item.srNo}
            {item.breed ? ` · ${item.breed}` : ""}
          </Text>
        </View>
        <View
          style={[
            s.overallBadge,
            { backgroundColor: overallBg, borderColor: overallBorder },
          ]}
        >
          <View style={[s.overallDot, { backgroundColor: overallColor }]} />
          <Text style={[s.overallText, { color: overallColor }]}>
            {overallLabel}
          </Text>
        </View>
      </View>

      <View style={s.divider} />

      <View style={s.sessionsRow}>
        {(activeShift === "both" || activeShift === "morning") && (
          <FeedBadge
            status={item.morning}
            note={item.morningNote}
            session="Morning"
            feedType={item.morningFeedType}
            quantity={item.morningQuantity}
            onEdit={() => onEditFeed(item, "morning")}
          />
        )}
        {(activeShift === "both" || activeShift === "evening") && (
          <FeedBadge
            status={item.evening}
            note={item.eveningNote}
            session="Evening"
            feedType={item.eveningFeedType}
            quantity={item.eveningQuantity}
            onEdit={() => onEditFeed(item, "evening")}
          />
        )}
      </View>
    </Animated.View>
  );
}

function SummaryStrip({
  summary,
  activeShift,
}: {
  summary: Summary;
  activeShift: Shift | "both";
}) {
  const fedCount =
    activeShift === "morning"
      ? summary.morning_fed
      : activeShift === "evening"
        ? summary.evening_fed
        : summary.both_fed;
  const fedLabel = activeShift === "both" ? "Both Fed" : "Fed";
  const pending = summary.total - fedCount;

  return (
    <View style={s.summary}>
      {[
        {
          label: fedLabel,
          value: fedCount,
          color: "#16a34a",
          bg: "#f0fdf4",
          icon: "checkmark-circle",
        },
        {
          label: "Pending",
          value: pending,
          color: "#d97706",
          bg: "#fffbeb",
          icon: "time",
        },
        {
          label: "No Feed",
          value: summary.not_fed_at_all,
          color: "#dc2626",
          bg: "#fff1f2",
          icon: "close-circle",
        },
        {
          label: "Total",
          value: summary.total,
          color: "#2563eb",
          bg: "#eff6ff",
          icon: "list",
        },
      ].map((st, i) => (
        <View key={i} style={[s.summaryItem, { backgroundColor: st.bg }]}>
          <Ionicons name={st.icon as any} size={16} color={st.color} />
          <Text style={[s.summaryValue, { color: st.color }]}>{st.value}</Text>
          <Text style={s.summaryLabel}>{st.label}</Text>
        </View>
      ))}
    </View>
  );
}

function ShiftToggle({
  active,
  onChange,
}: {
  active: Shift | "both";
  onChange: (s: Shift | "both") => void;
}) {
  const options: { key: Shift | "both"; label: string; icon: string }[] = [
    { key: "both", label: "Both", icon: "grid-outline" },
    { key: "morning", label: "Morning", icon: "sunny-outline" },
    { key: "evening", label: "Evening", icon: "moon-outline" },
  ];
  return (
    <View style={s.shiftToggle}>
      {options.map((o) => {
        const isActive = active === o.key;
        return (
          <TouchableOpacity
            key={o.key}
            style={[s.shiftBtn, isActive && s.shiftBtnActive]}
            onPress={() => onChange(o.key)}
          >
            <Ionicons
              name={o.icon as any}
              size={14}
              color={isActive ? "#fff" : "#6b7280"}
            />
            <Text style={[s.shiftBtnText, isActive && s.shiftBtnTextActive]}>
              {o.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function AdminFeedScreen() {
  const router = useRouter();
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const [cowRows, setCowRows] = useState<CowFeedRow[]>([]);
  const [summary, setSummary] = useState<Summary>({
    total: 0,
    both_fed: 0,
    morning_fed: 0,
    evening_fed: 0,
    not_fed_at_all: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeShift, setActiveShift] = useState<Shift | "both">("both");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] =
    useState<(typeof FILTERS)[number]>("All");

  // Feed detail modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCow, setEditingCow] = useState<CowFeedRow | null>(null);
  const [editingShift, setEditingShift] = useState<Shift>("morning");

  const fetchAll = useCallback(
    async (shift?: Shift) => {
      try {
        const authToken = await AsyncStorage.getItem("access_token");
        if (!authToken) {
          setLoading(false);
          return;
        }
        const data = await api.getAdminFeedLogs(authToken, todayStr(), shift);

        if (!data) {
          console.log("getAdminFeedLogs returned null/undefined");
          setLoading(false);
          setRefreshing(false);
          return;
        }

        if (!data.summary || !data.cows) {
          console.log("Unexpected response shape:", JSON.stringify(data));
          setLoading(false);
          setRefreshing(false);
          return;
        }

        setSummary(data.summary);
        setCowRows(mapToCowRows(data.cows));
      } catch (e) {
        console.log("admin feed fetch error:", e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeShift],
  );

  useEffect(() => {
    const shift = activeShift === "both" ? undefined : activeShift;
    fetchAll(shift);
  }, [activeShift]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAll(activeShift === "both" ? undefined : activeShift);
  };

  const handleEditFeed = (cow: CowFeedRow, shift: Shift) => {
    setEditingCow(cow);
    setEditingShift(shift);
    setModalVisible(true);
  };

  const handleSaveFeed = async (feedType: string, quantity: number) => {
    if (!editingCow) return;
    await (api as any).updateAdminFeedDetails(
      editingCow.id,
      todayStr(),
      editingShift,
      feedType,
      quantity,
    );

    setCowRows((prev) =>
      prev.map((row) => {
        if (row.id !== editingCow.id) return row;
        if (editingShift === "morning") {
          return {
            ...row,
            morningFeedType: feedType,
            morningQuantity: quantity,
          };
        } else {
          return {
            ...row,
            eveningFeedType: feedType,
            eveningQuantity: quantity,
          };
        }
      }),
    );
  };

  const filtered = cowRows.filter((d) => {
    const matchSearch =
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.srNo.toLowerCase().includes(search.toLowerCase());

    const shiftStatus =
      activeShift === "morning"
        ? d.morning
        : activeShift === "evening"
          ? d.evening
          : d.morning === "fed" && d.evening === "fed"
            ? "fed"
            : "pending";

    const matchFilter =
      activeFilter === "All" ||
      (activeFilter === "Both Fed" &&
        d.morning === "fed" &&
        d.evening === "fed") ||
      (activeFilter === "Pending" && shiftStatus === "pending");

    return matchSearch && matchFilter;
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
          <Text style={s.headerTitle}>Feed Status</Text>
          <Text style={s.headerSub}>{today}</Text>
        </View>
        <TouchableOpacity style={s.refreshBtn} onPress={onRefresh}>
          <Ionicons name="refresh-outline" size={18} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color="#16a34a" />
          <Text style={s.loadingText}>Loading feed status...</Text>
        </View>
      ) : (
        <>
          <SummaryStrip summary={summary} activeShift={activeShift} />

          <View style={s.controlsRow}>
            <ShiftToggle active={activeShift} onChange={setActiveShift} />
          </View>

          <View style={s.searchWrap}>
            <Ionicons name="search-outline" size={15} color="#9ca3af" />
            <TextInput
              style={s.searchInput}
              placeholder="Search cow name or tag..."
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

          <View style={s.filterRow}>
            {FILTERS.map((f) => {
              const active = activeFilter === f;
              return (
                <TouchableOpacity
                  key={f}
                  onPress={() => setActiveFilter(f)}
                  style={[s.filterChip, active && s.filterChipActive]}
                >
                  <Text style={[s.filterText, active && s.filterTextActive]}>
                    {f}
                  </Text>
                </TouchableOpacity>
              );
            })}
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
              <FeedCard
                item={item}
                index={index}
                activeShift={activeShift}
                onEditFeed={handleEditFeed}
              />
            )}
            ListEmptyComponent={
              <View style={s.empty}>
                <Text style={{ fontSize: 40 }}>🌾</Text>
                <Text style={s.emptyText}>No records found</Text>
              </View>
            }
            ListFooterComponent={<View style={{ height: 100 }} />}
          />
        </>
      )}

      <FeedDetailModal
        visible={modalVisible}
        cow={editingCow}
        shift={editingShift}
        currentFeedType={
          editingShift === "morning"
            ? editingCow?.morningFeedType
            : editingCow?.eveningFeedType
        }
        currentQuantity={
          editingShift === "morning"
            ? editingCow?.morningQuantity
            : editingCow?.eveningQuantity
        }
        onClose={() => setModalVisible(false)}
        onSave={handleSaveFeed}
      />
    </SafeAreaView>
  );
}

const fd = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: "#e5e7eb",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  title: { fontSize: 20, fontWeight: "800", color: "#111827" },
  sub: { fontSize: 13, color: "#9ca3af", marginTop: 3 },
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
  feedInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 14,
    paddingHorizontal: 12,
    backgroundColor: "#fafafa",
    marginBottom: 4,
  },
  feedInput: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 15,
    color: "#111827",
  },
  suggestionChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    backgroundColor: "#fafafa",
    marginRight: 8,
  },
  suggestionChipActive: { borderColor: "#16a34a", backgroundColor: "#f0fdf4" },
  suggestionText: { fontSize: 12, fontWeight: "600", color: "#888" },
  suggestionTextActive: { color: "#16a34a" },
  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    overflow: "hidden",
  },
  qBtn: {
    width: 48,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f3f4f6",
  },
  qInput: {
    flex: 1,
    textAlign: "center",
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    paddingVertical: 12,
  },
  qChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
    marginRight: 8,
  },
  qChipActive: { borderColor: "#16a34a", backgroundColor: "#f0fdf4" },
  qChipText: { fontSize: 13, fontWeight: "600", color: "#6b7280" },
  qChipTextActive: { color: "#16a34a" },
  saveBtn: {
    backgroundColor: "#16a34a",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});

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
  summary: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
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
  summaryValue: { fontSize: 17, fontWeight: "800", letterSpacing: -0.3 },
  summaryLabel: {
    fontSize: 9,
    color: "#9ca3af",
    fontWeight: "600",
    textAlign: "center",
  },
  controlsRow: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4 },
  shiftToggle: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    padding: 3,
    gap: 2,
  },
  shiftBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 8,
    borderRadius: 10,
  },
  shiftBtnActive: { backgroundColor: "#111827" },
  shiftBtnText: { fontSize: 12, fontWeight: "700", color: "#6b7280" },
  shiftBtnTextActive: { color: "#fff" },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 14,
    marginTop: 10,
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
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 14,
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  filterChipActive: { backgroundColor: "#111827", borderColor: "#111827" },
  filterText: { fontSize: 12, color: "#6b7280", fontWeight: "600" },
  filterTextActive: { color: "#fff" },
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
  cowAvatarWrap: {
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
  overallBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  overallDot: { width: 6, height: 6, borderRadius: 3 },
  overallText: { fontSize: 11, fontWeight: "700" },
  divider: { height: 1, backgroundColor: "#f3f4f6", marginVertical: 12 },
  sessionsRow: { flexDirection: "row", gap: 10 },
  sessionCard: { flex: 1, borderRadius: 12, padding: 12, borderWidth: 1 },
  sessionTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 8,
  },
  sessionIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: "rgba(0,0,0,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  sessionLabel: { flex: 1, fontSize: 11, fontWeight: "700", color: "#374151" },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  sessionBottom: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 4,
  },
  statusLabel: { fontSize: 13, fontWeight: "700" },
  noteText: { fontSize: 11, color: "#6b7280", fontWeight: "500", marginTop: 2 },

  feedSummaryText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#374151",
    marginTop: 6,
    marginBottom: 4,
  },
  feedActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    marginTop: 8,
    borderRadius: 8,
    paddingVertical: 7,
    borderWidth: 1.5,
  },
  feedActionBtnAdd: { backgroundColor: "#f0fdf4", borderColor: "#86efac" },
  feedActionBtnUpdate: { backgroundColor: "#eff6ff", borderColor: "#bfdbfe" },
  feedActionBtnText: { fontSize: 12, fontWeight: "700" },
  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 15, color: "#9ca3af", fontWeight: "600" },
});
