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
import { Image } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../../../src/services/api";

type FeedStatus = "fed" | "pending";
type Shift = "morning" | "evening";

const cowImg = require("../../../assets/images/gir-cow.png");
const bullImg = require("../../../assets/images/bull-cow.png");
const calfImg = require("../../../assets/images/calf-cow.png");

const getAnimalImage = (type?: string) => {
  if (type === "bull") return bullImg;
  if (type === "newborn") return calfImg;
  return cowImg;
};

const FEED_OPTIONS = [
  { label: "Dry Fodder", icon: "🌾" },
  { label: "Green Fodder", icon: "🌿" },
  { label: "Concentrate", icon: "🟤" },
  { label: "Silage", icon: "🫙" },
  { label: "Mixed Feed", icon: "🥗" },
  { label: "Mineral Mix", icon: "🔬" },
  { label: "Wheat Bran", icon: "🌻" },
  { label: "Rice Straw", icon: "🍂" },
  { label: "Cotton Seed", icon: "☁️" },
  { label: "Mustard Cake", icon: "🟡" },
];

interface FeedItem {
  feed_type: string;
  quantity_kg: number;
}

interface CowFeedRow {
  id: string;
  srNo: string;
  name: string;
  breed: string;
  type: string;
  morning: FeedStatus;
  evening: FeedStatus;
  morningNote: string;
  eveningNote: string;
  morningFeeds: FeedItem[];
  eveningFeeds: FeedItem[];
}

interface Summary {
  total: number;
  both_fed: number;
  morning_fed: number;
  evening_fed: number;
  not_fed_at_all: number;
}

const FILTERS = ["All", "Both Fed", "Pending"] as const;

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function parseFeeds(raw: any): FeedItem[] {
  if (Array.isArray(raw)) return raw.filter((f: any) => f.feed_type);
  if (raw && typeof raw === "object" && raw.feed_type) return [raw];
  return [];
}

function mapToCowRows(cows: any[], typeMap: Record<string, string>): CowFeedRow[] {
  return cows.map((c) => {
    const rawType =
      c.animal_type || c.type || typeMap[c.cow_tag] || typeMap[c.cow_id] || "mature";
    return {
      id: c.cow_id,
      srNo: c.cow_tag || c.cow_id,
      name: c.cow_name || "Unknown",
      breed: c.breed || "",
      type: rawType,
      morning: c.morning_fed ? "fed" : "pending",
      evening: c.evening_fed ? "fed" : "pending",
      morningNote: c.morning_worker ? `By ${c.morning_worker}` : "—",
      eveningNote: c.evening_worker ? `By ${c.evening_worker}` : "—",
      morningFeeds: parseFeeds(c.morning_feeds),
      eveningFeeds: parseFeeds(c.evening_feeds),
    };
  });
}

// ✅ Green/Red kept as-is, pending border lightened
const STATUS_CFG: Record<FeedStatus, { color: string; bg: string; border: string; icon: string; label: string }> = {
  fed: {
    color: "#16a34a",
    bg: "#f0fdf4",
    border: "#86efac",
    icon: "checkmark-circle",
    label: "Fed",
  },
  pending: {
    color: "#BB6B3F",
    bg: "#FFF5EA",
    border: "#FFCFAA",   // was #FD9E69 — lighter now
    icon: "time",
    label: "Pending",
  },
};

function FeedDetailModal({
  visible, cow, shift, currentFeeds, onClose, onSave,
}: {
  visible: boolean;
  cow: CowFeedRow | null;
  shift: Shift;
  currentFeeds: FeedItem[];
  onClose: () => void;
  onSave: (feeds: FeedItem[], saveAsDefault: boolean) => Promise<void>;
}) {
  const [feedRows, setFeedRows] = useState<FeedItem[]>([]);
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setFeedRows(
        currentFeeds.length > 0
          ? currentFeeds.map((f) => ({ ...f }))
          : [{ feed_type: "", quantity_kg: 0 }],
      );
      setSaveAsDefault(false);
    }
  }, [visible, currentFeeds]);

  const updateRow = (idx: number, patch: Partial<FeedItem>) => {
    setFeedRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const addRow = () => setFeedRows((prev) => [...prev, { feed_type: "", quantity_kg: 0 }]);

  const removeRow = (idx: number) => {
    if (feedRows.length === 1) {
      setFeedRows([{ feed_type: "", quantity_kg: 0 }]);
    } else {
      setFeedRows((prev) => prev.filter((_, i) => i !== idx));
    }
  };

  const toggleOption = (idx: number, label: string) => {
    if (feedRows[idx]?.feed_type === label) {
      updateRow(idx, { feed_type: "" });
    } else {
      updateRow(idx, { feed_type: label });
    }
  };

  const handleSave = async () => {
    const valid = feedRows.filter((f) => f.feed_type.trim() && f.quantity_kg > 0);
    if (valid.length === 0) {
      Alert.alert("Required", "Add at least one feed type with quantity > 0");
      return;
    }
    setSaving(true);
    try {
      await onSave(valid, saveAsDefault);
      onClose();
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (!cow) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={md.overlay}>
          <View style={md.sheet}>
            <View style={md.handle} />
            <View style={md.headerRow}>
              <View style={{ flex: 1 }}>
                <Text style={md.title}>Feed Details</Text>
                <Text style={md.sub}>
                  {cow.name} · {shift === "morning" ? "☀️ Morning" : "🌙 Evening"}
                </Text>
              </View>
              <TouchableOpacity style={md.closeBtn} onPress={onClose}>
                <Ionicons name="close" size={18} color="#8B6854" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {feedRows.map((row, idx) => (
                <View key={idx} style={md.feedRowCard}>
                  <View style={md.feedRowHeader}>
                    <View style={md.feedRowBadge}>
                      <Text style={md.feedRowBadgeText}>Feed {idx + 1}</Text>
                    </View>
                    <TouchableOpacity style={md.removeRowBtn} onPress={() => removeRow(idx)}>
                      <Ionicons name="trash-outline" size={15} color="#ef4444" />
                    </TouchableOpacity>
                  </View>

                  <Text style={md.sectionLabel}>FEED TYPE</Text>
                  <View style={md.chipsWrap}>
                    {FEED_OPTIONS.map((opt) => {
                      const active = row.feed_type === opt.label;
                      return (
                        <TouchableOpacity
                          key={opt.label}
                          style={[md.chip, active && md.chipActive]}
                          onPress={() => toggleOption(idx, opt.label)}
                        >
                          <Text style={md.chipIcon}>{opt.icon}</Text>
                          <Text style={[md.chipText, active && md.chipTextActive]}>
                            {opt.label}
                          </Text>
                          {active && (
                            <Ionicons name="checkmark-circle" size={13} color="#16a34a" />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <View style={md.customWrap}>
                    <Ionicons name="create-outline" size={15} color="#FD9E69" />
                    <TextInput
                      style={md.customInput}
                      placeholder="Or type custom feed name..."
                      placeholderTextColor="#FFD999"
                      value={
                        FEED_OPTIONS.find((o) => o.label === row.feed_type) ? "" : row.feed_type
                      }
                      onChangeText={(t) => updateRow(idx, { feed_type: t })}
                    />
                  </View>

                  {row.feed_type !== "" && (
                    <View style={md.selectedBadge}>
                      <Ionicons name="checkmark-circle" size={14} color="#16a34a" />
                      <Text style={md.selectedBadgeText}>Selected: {row.feed_type}</Text>
                    </View>
                  )}

                  <Text style={[md.sectionLabel, { marginTop: 14 }]}>QUANTITY (KG)</Text>
                  <View style={md.quantityRow}>
                    <TouchableOpacity
                      style={md.qBtn}
                      onPress={() =>
                        updateRow(idx, { quantity_kg: Math.max(0, (row.quantity_kg || 0) - 0.5) })
                      }
                    >
                      <Ionicons name="remove" size={20} color="#8B6854" />
                    </TouchableOpacity>
                    <TextInput
                      style={md.qInput}
                      value={row.quantity_kg > 0 ? String(row.quantity_kg) : ""}
                      onChangeText={(t) => updateRow(idx, { quantity_kg: parseFloat(t) || 0 })}
                      keyboardType="decimal-pad"
                      placeholder="0.0"
                      placeholderTextColor="#FFD999"
                    />
                    <TouchableOpacity
                      style={md.qBtn}
                      onPress={() =>
                        updateRow(idx, { quantity_kg: (row.quantity_kg || 0) + 0.5 })
                      }
                    >
                      <Ionicons name="add" size={20} color="#8B6854" />
                    </TouchableOpacity>
                  </View>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ marginTop: 8 }}
                  >
                    {["5", "10", "15", "20", "25", "30"].map((q) => {
                      const active = row.quantity_kg === Number(q);
                      return (
                        <TouchableOpacity
                          key={q}
                          style={[md.qChip, active && md.qChipActive]}
                          onPress={() => updateRow(idx, { quantity_kg: Number(q) })}
                        >
                          <Text style={[md.qChipText, active && md.qChipTextActive]}>
                            {q} kg
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              ))}

              <TouchableOpacity style={md.addRowBtn} onPress={addRow}>
                <Ionicons name="add-circle-outline" size={18} color="#BB6B3F" />
                <Text style={md.addRowText}>Add Another Feed Type</Text>
              </TouchableOpacity>

              {feedRows.filter((f) => f.feed_type && f.quantity_kg > 0).length > 0 && (
                <View style={md.summaryBox}>
                  <Text style={md.summaryTitle}>📋 Feed Summary</Text>
                  {feedRows
                    .filter((f) => f.feed_type && f.quantity_kg > 0)
                    .map((f, i) => (
                      <View key={i} style={md.summaryRow}>
                        <Text style={md.summaryRowText}>• {f.feed_type}</Text>
                        <Text style={md.summaryRowQty}>{f.quantity_kg} kg</Text>
                      </View>
                    ))}
                  <View style={[md.summaryRow, md.summaryTotal]}>
                    <Text style={md.summaryTotalText}>Total</Text>
                    <Text style={md.summaryTotalQty}>
                      {feedRows
                        .filter((f) => f.feed_type && f.quantity_kg > 0)
                        .reduce((s, f) => s + f.quantity_kg, 0)
                        .toFixed(1)}{" "}
                      kg
                    </Text>
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={[md.defaultToggle, saveAsDefault && md.defaultToggleActive]}
                onPress={() => setSaveAsDefault((v) => !v)}
              >
                <Ionicons
                  name={saveAsDefault ? "checkmark-circle" : "ellipse-outline"}
                  size={20}
                  color={saveAsDefault ? "#FFBF55" : "#FD9E69"}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[md.defaultToggleTitle, saveAsDefault && { color: "#BB6B3F" }]}>
                    Save as default feed
                  </Text>
                  <Text style={md.defaultToggleSub}>
                    Auto-fill this every day for {cow.name}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[md.saveBtn, saving && { opacity: 0.65 }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={18} color="#fff" />
                    <Text style={md.saveBtnText}>Save Feed Details</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={{ height: 30 }} />
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function FeedBadge({
  status, note, session, feeds, onEdit,
}: {
  status: FeedStatus; note: string; session: string;
  feeds: FeedItem[]; onEdit: () => void;
}) {
  const cfg = STATUS_CFG[status];
  const totalKg = feeds.reduce((s, f) => s + f.quantity_kg, 0);

  return (
    <View style={[bs.sessionCard, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
      <View style={bs.sessionTop}>
        <View style={bs.sessionIconWrap}>
          <Ionicons
            name={session === "Morning" ? "sunny" : "moon"}
            size={13}
            color={session === "Morning" ? "#FFBF55" : "#BB6B3F"}
          />
        </View>
        <Text style={bs.sessionLabel}>{session}</Text>
        <View style={[bs.statusDot, { backgroundColor: cfg.color }]} />
      </View>

      <View style={bs.sessionBottom}>
        <Ionicons name={cfg.icon as any} size={16} color={cfg.color} />
        <Text style={[bs.statusLabel, { color: cfg.color }]}>{cfg.label}</Text>
      </View>

      {feeds.length > 0 && (
        <View style={bs.feedList}>
          {feeds.map((f, i) => (
            <View key={i} style={bs.feedItem}>
              <Text style={bs.feedItemText} numberOfLines={1}>🌾 {f.feed_type}</Text>
              <Text style={bs.feedItemQty}>{f.quantity_kg}kg</Text>
            </View>
          ))}
          {feeds.length > 1 && (
            <View style={[bs.feedItem, bs.feedItemTotal]}>
              <Text style={bs.feedItemTotalText}>Total</Text>
              <Text style={bs.feedItemTotalQty}>{totalKg.toFixed(1)}kg</Text>
            </View>
          )}
        </View>
      )}

      <TouchableOpacity
        style={[
          bs.feedActionBtn,
          feeds.length > 0 ? bs.feedActionBtnUpdate : bs.feedActionBtnAdd,
        ]}
        onPress={onEdit}
      >
        <Ionicons
          name={feeds.length > 0 ? "pencil" : "add"}
          size={13}
          color={feeds.length > 0 ? "#BB6B3F" : "#16a34a"}
        />
        <Text style={[bs.feedActionBtnText, { color: feeds.length > 0 ? "#BB6B3F" : "#16a34a" }]}>
          {feeds.length > 0 ? "Update Feed" : "Add Feed"}
        </Text>
      </TouchableOpacity>

      {note !== "—" && (
        <Text style={bs.noteText} numberOfLines={1}>{note}</Text>
      )}
    </View>
  );
}

function FeedCard({
  item, index, activeShift, onEditFeed,
}: {
  item: CowFeedRow; index: number;
  activeShift: Shift | "both";
  onEditFeed: (cow: CowFeedRow, shift: Shift) => void;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1, duration: 280, delay: index * 40, useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0, delay: index * 40, tension: 70, friction: 12, useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const bothFed = item.morning === "fed" && item.evening === "fed";
  const shiftStatus =
    activeShift === "morning" ? item.morning
    : activeShift === "evening" ? item.evening
    : bothFed ? "fed" : "pending";

  const overallColor = shiftStatus === "fed" ? "#16a34a" : "#BB6B3F";
  const overallBg = shiftStatus === "fed" ? "#f0fdf4" : "#FFF5EA";
  const overallBorder = shiftStatus === "fed" ? "#86efac" : "#FFCFAA"; // lightened pending border
  const overallLabel =
    activeShift !== "both" ? (shiftStatus === "fed" ? "Fed" : "Pending")
    : bothFed ? "Fully Fed" : "Partially Fed";

  return (
    <Animated.View style={[cs.card, { opacity, transform: [{ translateY }] }]}>
      <View style={cs.cardHeader}>
        <View style={cs.cowAvatarWrap}>
          <Image
            source={getAnimalImage(item.type)}
            style={{ width: 38, height: 38 }}
            resizeMode="contain"
          />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={cs.cowName}>{item.name}</Text>
          <Text style={cs.cowSr}>
            {item.srNo}{item.breed ? ` · ${item.breed}` : ""}
            {" · "}
            <Text style={{ color: "#8B6854" }}>
              {item.type === "bull" ? "Bull" : item.type === "newborn" ? "Calf" : "Cow"}
            </Text>
          </Text>
        </View>
        <View style={[cs.overallBadge, { backgroundColor: overallBg, borderColor: overallBorder }]}>
          <View style={[cs.overallDot, { backgroundColor: overallColor }]} />
          <Text style={[cs.overallText, { color: overallColor }]}>{overallLabel}</Text>
        </View>
      </View>

      <View style={cs.divider} />

      <View style={cs.sessionsRow}>
        {(activeShift === "both" || activeShift === "morning") && (
          <FeedBadge
            status={item.morning} note={item.morningNote}
            session="Morning" feeds={item.morningFeeds}
            onEdit={() => onEditFeed(item, "morning")}
          />
        )}
        {(activeShift === "both" || activeShift === "evening") && (
          <FeedBadge
            status={item.evening} note={item.eveningNote}
            session="Evening" feeds={item.eveningFeeds}
            onEdit={() => onEditFeed(item, "evening")}
          />
        )}
      </View>
    </Animated.View>
  );
}

function SummaryStrip({ summary, activeShift }: { summary: Summary; activeShift: Shift | "both" }) {
  const fedCount =
    activeShift === "morning" ? summary.morning_fed
    : activeShift === "evening" ? summary.evening_fed
    : summary.both_fed;
  const fedLabel = activeShift === "both" ? "Both Fed" : "Fed";
  const pending = summary.total - fedCount;

  return (
    <View style={ss.summary}>
      {[
        { label: fedLabel, value: fedCount, color: "#16a34a", bg: "#f0fdf4", icon: "checkmark-circle" },
        { label: "Pending", value: pending, color: "#BB6B3F", bg: "#FFF5EA", icon: "time" },
        { label: "No Feed", value: summary.not_fed_at_all, color: "#dc2626", bg: "#fff1f2", icon: "close-circle" },
        { label: "Total", value: summary.total, color: "#8B6854", bg: "#FFF5EA", icon: "list" },
      ].map((st, i) => (
        <View key={i} style={[ss.summaryItem, { backgroundColor: st.bg }]}>
          <Ionicons name={st.icon as any} size={16} color={st.color} />
          <Text style={[ss.summaryValue, { color: st.color }]}>{st.value}</Text>
          <Text style={ss.summaryLabel}>{st.label}</Text>
        </View>
      ))}
    </View>
  );
}

function ShiftToggle({ active, onChange }: { active: Shift | "both"; onChange: (s: Shift | "both") => void }) {
  const options: { key: Shift | "both"; label: string; icon: string }[] = [
    { key: "both", label: "Both", icon: "grid-outline" },
    { key: "morning", label: "Morning", icon: "sunny-outline" },
    { key: "evening", label: "Evening", icon: "moon-outline" },
  ];
  return (
    <View style={st.shiftToggle}>
      {options.map((o) => {
        const isActive = active === o.key;
        return (
          <TouchableOpacity
            key={o.key}
            style={[st.shiftBtn, isActive && st.shiftBtnActive]}
            onPress={() => onChange(o.key)}
          >
            <Ionicons name={o.icon as any} size={14} color={isActive ? "#fff" : "#8B6854"} />
            <Text style={[st.shiftBtnText, isActive && st.shiftBtnTextActive]}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function AdminFeedScreen() {
  const router = useRouter();
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long",
  });

  const [cowRows, setCowRows] = useState<CowFeedRow[]>([]);
  const [summary, setSummary] = useState<Summary>({
    total: 0, both_fed: 0, morning_fed: 0, evening_fed: 0, not_fed_at_all: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeShift, setActiveShift] = useState<Shift | "both">("both");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<(typeof FILTERS)[number]>("All");

  const [modalVisible, setModalVisible] = useState(false);
  const [editingCow, setEditingCow] = useState<CowFeedRow | null>(null);
  const [editingShift, setEditingShift] = useState<Shift>("morning");

  const buildTypeMap = async (): Promise<Record<string, string>> => {
    try {
      const cattleList = await api.getCows();
      const map: Record<string, string> = {};
      for (const cow of cattleList) {
        if (cow.tag) map[cow.tag] = cow.type;
        if (cow.id) map[cow.id] = cow.type;
      }
      return map;
    } catch {
      return {};
    }
  };

  const fetchAll = useCallback(async (shift?: Shift) => {
    try {
      const authToken = await AsyncStorage.getItem("access_token");
      if (!authToken) { setLoading(false); return; }

      const [data, typeMap] = await Promise.all([
        api.getAdminFeedLogs(authToken, todayStr(), shift),
        buildTypeMap(),
      ]);

      if (!data?.summary || !data?.cows) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      setSummary(data.summary);
      setCowRows(mapToCowRows(data.cows, typeMap));
    } catch (e) {
      console.log("admin feed fetch error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAll(activeShift === "both" ? undefined : activeShift);
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

  const handleSaveFeed = async (feeds: FeedItem[], saveAsDefault: boolean) => {
    if (!editingCow) return;
    const authToken = await AsyncStorage.getItem("access_token");
    if (!authToken) return;
    api.setToken(authToken);

    await api.updateAdminFeedDetails(
      editingCow.id, todayStr(), editingShift, feeds, saveAsDefault,
    );

    setCowRows((prev) =>
      prev.map((row) => {
        if (row.id !== editingCow.id) return row;
        if (editingShift === "morning") return { ...row, morningFeeds: feeds };
        return { ...row, eveningFeeds: feeds };
      }),
    );
  };

  const filtered = cowRows.filter((d) => {
    const matchSearch =
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.srNo.toLowerCase().includes(search.toLowerCase());

    const shiftStatus =
      activeShift === "morning" ? d.morning
      : activeShift === "evening" ? d.evening
      : d.morning === "fed" && d.evening === "fed" ? "fed" : "pending";

    const matchFilter =
      activeFilter === "All" ||
      (activeFilter === "Both Fed" && d.morning === "fed" && d.evening === "fed") ||
      (activeFilter === "Pending" && shiftStatus === "pending");

    return matchSearch && matchFilter;
  });

  return (
    <SafeAreaView style={sc.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={[sc.header, { paddingTop: Platform.OS === "ios" ? 0 : (StatusBar.currentHeight ?? 0) }]}>
        <TouchableOpacity onPress={() => router.back()} style={sc.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#8B6854" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={sc.headerTitle}>Feed Status</Text>
          <Text style={sc.headerSub}>{today}</Text>
        </View>
        <TouchableOpacity style={sc.refreshBtn} onPress={onRefresh}>
          <Ionicons name="refresh-outline" size={18} color="#BB6B3F" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={sc.loadingWrap}>
          <ActivityIndicator size="large" color="#FFBF55" />
          <Text style={sc.loadingText}>Loading feed status...</Text>
        </View>
      ) : (
        <>
          <SummaryStrip summary={summary} activeShift={activeShift} />

          <View style={sc.controlsRow}>
            <ShiftToggle active={activeShift} onChange={setActiveShift} />
          </View>

          <View style={sc.searchWrap}>
            <Ionicons name="search-outline" size={15} color="#FD9E69" />
            <TextInput
              style={sc.searchInput}
              placeholder="Search cow name or tag..."
              placeholderTextColor="#FFD999"
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={15} color="#FD9E69" />
              </TouchableOpacity>
            )}
          </View>

          <View style={sc.filterRow}>
            {FILTERS.map((f) => {
              const active = activeFilter === f;
              return (
                <TouchableOpacity
                  key={f}
                  onPress={() => setActiveFilter(f)}
                  style={[sc.filterChip, active && sc.filterChipActive]}
                >
                  <Text style={[sc.filterText, active && sc.filterTextActive]}>{f}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            contentContainerStyle={sc.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFBF55" />
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
              <View style={sc.empty}>
                <Text style={{ fontSize: 40 }}>🌾</Text>
                <Text style={sc.emptyText}>No records found</Text>
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
        currentFeeds={
          editingShift === "morning"
            ? (editingCow?.morningFeeds ?? [])
            : (editingCow?.eveningFeeds ?? [])
        }
        onClose={() => setModalVisible(false)}
        onSave={handleSaveFeed}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const md = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 20, paddingBottom: Platform.OS === "ios" ? 36 : 24, maxHeight: "92%",
  },
  // ── handle: #FFE8CC (was #FFD999) ──
  handle: { width: 36, height: 4, backgroundColor: "#FFE8CC", borderRadius: 2, alignSelf: "center", marginBottom: 18 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  title: { fontSize: 20, fontWeight: "800", color: "#3D2B1F" },
  sub: { fontSize: 13, color: "#8B6854", marginTop: 3 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#FFF5EA", alignItems: "center", justifyContent: "center" },
  // ── feedRowCard: border #FFCFAA (was #FFD999) ──
  feedRowCard: { backgroundColor: "#FFFBF5", borderRadius: 16, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: "#FFCFAA" },
  feedRowHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  feedRowBadge: { backgroundColor: "#BB6B3F", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  feedRowBadgeText: { fontSize: 11, fontWeight: "700", color: "#fff" },
  removeRowBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: "#fff1f2", borderWidth: 1, borderColor: "#fecaca", alignItems: "center", justifyContent: "center" },
  sectionLabel: { fontSize: 10, fontWeight: "700", color: "#8B6854", letterSpacing: 1, marginBottom: 10 },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  // ── chip: border #FFE8CC (was #FFD999) ──
  chip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: "#FFE8CC", backgroundColor: "#fff" },
  chipActive: { borderColor: "#16a34a", backgroundColor: "#f0fdf4" },
  chipIcon: { fontSize: 13 },
  chipText: { fontSize: 12, fontWeight: "600", color: "#8B6854" },
  chipTextActive: { color: "#16a34a" },
  // ── customWrap: border #FFE8CC (was #FFD999) ──
  customWrap: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#FFE8CC", borderRadius: 12, paddingHorizontal: 12, backgroundColor: "#fff", marginBottom: 8 },
  customInput: { flex: 1, paddingVertical: 11, fontSize: 14, color: "#3D2B1F" },
  selectedBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#f0fdf4", borderRadius: 8, borderWidth: 1, borderColor: "#86efac", paddingHorizontal: 10, paddingVertical: 6, alignSelf: "flex-start", marginBottom: 4 },
  selectedBadgeText: { fontSize: 12, fontWeight: "600", color: "#16a34a" },
  // ── quantityRow: border #FFE8CC (was #FFD999) ──
  quantityRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#FFE8CC", overflow: "hidden" },
  qBtn: { width: 44, height: 50, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF5EA" },
  qInput: { flex: 1, textAlign: "center", fontSize: 22, fontWeight: "800", color: "#3D2B1F", paddingVertical: 10 },
  // ── qChip: border #FFE8CC (was #FFD999) ──
  qChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: "#FFE8CC", backgroundColor: "#fff", marginRight: 8 },
  qChipActive: { borderColor: "#FFCFAA", backgroundColor: "#FFF5EA" },
  qChipText: { fontSize: 12, fontWeight: "600", color: "#8B6854" },
  qChipTextActive: { color: "#BB6B3F" },
  // ── addRowBtn: dashed border #FFCFAA (was #FD9E69) ──
  addRowBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: "#FFCFAA", borderRadius: 12, backgroundColor: "#FFF5EA", paddingVertical: 12, marginBottom: 16, borderStyle: "dashed" },
  addRowText: { fontSize: 14, fontWeight: "700", color: "#BB6B3F" },
  // ── summaryBox: border #FFE8CC (was #FFBF55) ──
  summaryBox: { backgroundColor: "#FFF5EA", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#FFE8CC", marginBottom: 16 },
  summaryTitle: { fontSize: 13, fontWeight: "800", color: "#3D2B1F", marginBottom: 8 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  summaryRowText: { fontSize: 13, color: "#8B6854", fontWeight: "600" },
  summaryRowQty: { fontSize: 13, color: "#8B6854", fontWeight: "700" },
  // ── summaryTotal divider: #FFE8CC (was #FFBF55) ──
  summaryTotal: { borderTopWidth: 1, borderTopColor: "#FFE8CC", marginTop: 6, paddingTop: 6 },
  summaryTotalText: { fontSize: 13, fontWeight: "800", color: "#BB6B3F" },
  summaryTotalQty: { fontSize: 13, fontWeight: "800", color: "#BB6B3F" },
  // ── defaultToggle: border #FFE8CC (was #FFD999) ──
  defaultToggle: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: "#FFE8CC", backgroundColor: "#FFFBF5", marginBottom: 16 },
  defaultToggleActive: { borderColor: "#FFCFAA", backgroundColor: "#FFF5EA" },
  defaultToggleTitle: { fontSize: 14, fontWeight: "700", color: "#8B6854" },
  defaultToggleSub: { fontSize: 11, color: "#FD9E69", marginTop: 2 },
  saveBtn: { backgroundColor: "#BB6B3F", borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15 },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});

const bs = StyleSheet.create({
  sessionCard: { flex: 1, borderRadius: 12, padding: 12, borderWidth: 1 },
  sessionTop: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 8 },
  sessionIconWrap: { width: 22, height: 22, borderRadius: 6, backgroundColor: "rgba(0,0,0,0.04)", alignItems: "center", justifyContent: "center" },
  sessionLabel: { flex: 1, fontSize: 11, fontWeight: "700", color: "#8B6854" },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  sessionBottom: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 6 },
  statusLabel: { fontSize: 13, fontWeight: "700" },
  feedList: { marginBottom: 6, gap: 3 },
  feedItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 2 },
  feedItemText: { fontSize: 11, color: "#8B6854", fontWeight: "500", flex: 1 },
  feedItemQty: { fontSize: 11, fontWeight: "700", color: "#8B6854" },
  feedItemTotal: { borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.06)", marginTop: 3, paddingTop: 4 },
  feedItemTotalText: { fontSize: 11, fontWeight: "800", color: "#3D2B1F" },
  feedItemTotalQty: { fontSize: 11, fontWeight: "800", color: "#3D2B1F" },
  feedActionBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, marginTop: 8, borderRadius: 8, paddingVertical: 7, borderWidth: 1 },
  feedActionBtnAdd: { backgroundColor: "#f0fdf4", borderColor: "#86efac" },
  // ── feedActionBtnUpdate: border #FFCFAA (was #FD9E69) ──
  feedActionBtnUpdate: { backgroundColor: "#FFF5EA", borderColor: "#FFCFAA" },
  feedActionBtnText: { fontSize: 12, fontWeight: "700" },
  noteText: { fontSize: 11, color: "#FD9E69", fontWeight: "500", marginTop: 4 },
});

const cs = StyleSheet.create({
  // ── card: border #FFE8CC (was #FFD999) ──
  card: { backgroundColor: "#fff", borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#FFE8CC", shadowColor: "#f0b791", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  cardHeader: { flexDirection: "row", alignItems: "center" },
  // ── cowAvatarWrap: border #FFE8CC (was #FFD999) ──
  cowAvatarWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#FFF5EA", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#FFE8CC" },
  cowName: { fontSize: 15, fontWeight: "700", color: "#3D2B1F", letterSpacing: -0.2 },
  cowSr: { fontSize: 12, color: "#FD9E69", fontWeight: "500", marginTop: 1 },
  overallBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  overallDot: { width: 6, height: 6, borderRadius: 3 },
  overallText: { fontSize: 11, fontWeight: "700" },
  // ── divider: #FFF0DC (was #FFD999) ──
  divider: { height: 1, backgroundColor: "#FFF0DC", marginVertical: 12 },
  sessionsRow: { flexDirection: "row", gap: 10 },
});

const ss = StyleSheet.create({
  // ── summary strip bottom border: #FFE8CC (was #FFD999) ──
  summary: { flexDirection: "row", backgroundColor: "#fff", paddingHorizontal: 12, paddingVertical: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: "#FFE8CC" },
  summaryItem: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 12, gap: 3 },
  summaryValue: { fontSize: 17, fontWeight: "800", letterSpacing: -0.3 },
  summaryLabel: { fontSize: 9, color: "#8B6854", fontWeight: "600", textAlign: "center" },
});

const st = StyleSheet.create({
  shiftToggle: { flexDirection: "row", backgroundColor: "#FFF5EA", borderRadius: 12, padding: 3, gap: 2 },
  shiftBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 8, borderRadius: 10 },
  shiftBtnActive: { backgroundColor: "#BB6B3F" },
  shiftBtnText: { fontSize: 12, fontWeight: "700", color: "#8B6854" },
  shiftBtnTextActive: { color: "#fff" },
});

const sc = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFBF5" },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { color: "#8B6854", fontSize: 14, fontWeight: "600" },
  // ── header bottom border: #FFE8CC (was #FFD999) ──
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#FFE8CC" },
  // ── backBtn border: #FFE8CC (was #FFD999) ──
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#FFF5EA", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#FFE8CC" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#3D2B1F", letterSpacing: -0.3 },
  headerSub: { fontSize: 12, color: "#8B6854", fontWeight: "500", marginTop: 1 },
  // ── refreshBtn border: #FFE8CC (was #FFD999) ──
  refreshBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#FFF5EA", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#FFE8CC" },
  controlsRow: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4 },
  // ── searchWrap border: #FFE8CC (was #FFD999) ──
  searchWrap: { flexDirection: "row", alignItems: "center", marginHorizontal: 14, marginTop: 10, marginBottom: 8, backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#FFE8CC", paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  searchInput: { flex: 1, color: "#3D2B1F", fontSize: 14 },
  filterRow: { flexDirection: "row", paddingHorizontal: 14, gap: 8, marginBottom: 12 },
  // ── filterChip border: #FFE8CC (was #FFD999) ──
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: "#fff", borderWidth: 1, borderColor: "#FFE8CC" },
  filterChipActive: { backgroundColor: "#BB6B3F", borderColor: "#BB6B3F" },
  filterText: { fontSize: 12, color: "#8B6854", fontWeight: "600" },
  filterTextActive: { color: "#fff" },
  listContent: { paddingHorizontal: 14 },
  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 15, color: "#8B6854", fontWeight: "600" },
});