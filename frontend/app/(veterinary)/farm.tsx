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
  Image,
  Modal,
  LayoutAnimation,
  UIManager,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import { api } from "../../src/services/api";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ── Color Palette 
const C = {
  primary: "#FF9675",
  accent: "#8B6854",
  dark: "#BB6B3F",
  bg: "#FFF8EF",
  card: "#FFE8D6",
  cardBorder: "#FFD4B8",
  text: "#3D1F0A",
  textMuted: "#A07850",
  textLight: "#C9A882",
  healthy: "#16a34a",
  sick: "#dc2626",
  notRep: "#A07850",
  milkBlue: "#0369a1",
  feedGreen: "#15803d",
};

// ── Images 
const cowImg = require("../../assets/images/gir-cow.png");
const bullImg = require("../../assets/images/bull-cow.png");
const calfImg = require("../../assets/images/calf-cow.png");

function getCowImage(type?: string) {
  if (type === "bull") return bullImg;
  if (type === "newborn") return calfImg;
  return cowImg;
}

// ── Constants 
const IS_IOS = Platform.OS === "ios";
const STATUS_H = IS_IOS ? 0 : (StatusBar.currentHeight ?? 0);
const TODAY = new Date().toISOString().split("T")[0];
const todayLabel = new Date().toLocaleDateString("en-IN", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

const HEADER_MAX = IS_IOS ? 210 : 210 + STATUS_H;
const HEADER_MIN = IS_IOS ? 60 : 60 + STATUS_H;

// ── Types 
interface AnimalRow {
  id: string;
  tag_number: string;
  name: string;
  breed: string;
  type: string;
  gender: string;
  age: number | null;
  isActive: boolean;
  isSold: boolean;
  healthStatus: string;
  workerName: string | null;
  // extras loaded on expand
  milkMorning?: number;
  milkEvening?: number;
  milkTotal?: number;
  milkWorkerMorning?: string | null;
  milkWorkerEvening?: string | null;
  feedMorning?: boolean;
  feedEvening?: boolean;
  feedWorker?: string | null;
}

// ── Helpers 
function isHealthy(s: string) {
  return s === "healthy";
}
function isUnhealthy(s: string) {
  return s !== "healthy" && s !== "not_reported";
}
function isNotReported(s: string) {
  return s === "not_reported";
}

function healthCfg(s: string) {
  if (isHealthy(s))
    return {
      label: "Healthy",
      color: C.healthy,
      bg: "#f0fdf4",
      border: "#86efac",
      icon: "checkmark-circle" as const,
    };
  if (isNotReported(s))
    return {
      label: "Not Reported",
      color: C.notRep,
      bg: "#FFF8EF",
      border: C.cardBorder,
      icon: "ellipse-outline" as const,
    };
  return {
    label: s.charAt(0).toUpperCase() + s.slice(1),
    color: C.sick,
    bg: "#fef2f2",
    border: "#fca5a5",
    icon: "alert-circle" as const,
  };
}

function formatDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ── Stats Strip 
function StatsStrip({
  total,
  healthy,
  sick,
  notReported,
  active,
}: {
  total: number;
  healthy: number;
  sick: number;
  notReported: number;
  active: number;
}) {
  const items = [
    { label: "Total", value: total, color: C.primary },
    { label: "Active", value: active, color: "#6ee7b7" },
    { label: "Healthy", value: healthy, color: C.healthy },
    { label: "Sick", value: sick, color: C.sick },
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
const ss = StyleSheet.create({
  strip: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    overflow: "hidden",
    marginHorizontal: 16,
    marginBottom: 4,
  },
  item: { flex: 1, alignItems: "center", paddingVertical: 10 },
  divider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginVertical: 8,
  },
  val: { fontSize: 16, fontWeight: "900", letterSpacing: -0.4 },
  lbl: {
    fontSize: 9,
    color: "rgba(255,255,255,0.7)",
    marginTop: 2,
    fontWeight: "600",
  },
});

// ── Health Update Modal 
const HEALTH_OPTIONS = [
  {
    key: "healthy",
    label: "Healthy",
    icon: "checkmark-circle" as const,
    color: C.healthy,
  },
  { key: "sick", label: "Sick", icon: "alert-circle" as const, color: C.sick },
  {
    key: "injured",
    label: "Injured",
    icon: "bandage-outline" as const,
    color: "#f59e0b",
  },
  {
    key: "not_reported",
    label: "Not Reported",
    icon: "ellipse-outline" as const,
    color: C.notRep,
  },
];

function HealthModal({
  visible,
  animal,
  onClose,
  onUpdated,
}: {
  visible: boolean;
  animal: AnimalRow | null;
  onClose: () => void;
  onUpdated: (id: string, status: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<string>("");

  useEffect(() => {
    if (animal) setSelected(animal.healthStatus || "not_reported");
  }, [animal]);

  const save = async () => {
    if (!animal) return;
    setSaving(true);
    try {
      await api.workerAddHealthLog({
        cow_id: animal.id,
        cow_name: animal.name,
        cow_tag: animal.tag_number,
        status: selected,
        date: TODAY,
      });
      onUpdated(animal.id, selected);
      onClose();
    } catch (e: any) {
      console.error("Health update error:", e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!animal) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={hm.overlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          onPress={onClose}
        />
        <View style={hm.sheet}>
          {/* Handle */}
          <View style={hm.handle} />

          {/* Animal info */}
          <View style={hm.animalRow}>
            <View style={hm.avatar}>
              <Image
                source={getCowImage(animal.type)}
                style={{ width: 32, height: 32, resizeMode: "contain" }}
              />
            </View>
            <View>
              <Text style={hm.animalName}>{animal.name}</Text>
              <Text style={hm.animalTag}>
                #{animal.tag_number} · {animal.breed || "—"}
              </Text>
            </View>
          </View>

          <Text style={hm.title}>Update Health Status</Text>

          {HEALTH_OPTIONS.map((opt) => {
            const active = selected === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                onPress={() => setSelected(opt.key)}
                activeOpacity={0.8}
                style={[
                  hm.option,
                  active && {
                    backgroundColor: opt.color + "18",
                    borderColor: opt.color + "66",
                  },
                ]}
              >
                <View
                  style={[hm.optIconBox, { backgroundColor: opt.color + "22" }]}
                >
                  <Ionicons name={opt.icon} size={18} color={opt.color} />
                </View>
                <Text
                  style={[hm.optLabel, { color: active ? opt.color : C.text }]}
                >
                  {opt.label}
                </Text>
                {active && (
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color={opt.color}
                    style={{ marginLeft: "auto" }}
                  />
                )}
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            style={[hm.saveBtn, saving && { opacity: 0.6 }]}
            onPress={save}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={hm.saveBtnText}>Save Status</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const hm = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(61,31,10,0.4)",
  },
  sheet: {
    backgroundColor: C.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: IS_IOS ? 40 : 24,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.cardBorder,
    alignSelf: "center",
    marginBottom: 18,
  },
  animalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 12,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  animalName: { fontSize: 15, fontWeight: "800", color: C.text },
  animalTag: {
    fontSize: 12,
    color: C.textMuted,
    fontWeight: "500",
    marginTop: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: C.textMuted,
    marginBottom: 12,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1.5,
    borderColor: C.cardBorder,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  optIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  optLabel: { fontSize: 14, fontWeight: "700", color: C.text },
  saveBtn: {
    backgroundColor: C.primary,
    borderRadius: 16,
    padding: 15,
    alignItems: "center",
    marginTop: 8,
  },
  saveBtnText: { fontSize: 15, fontWeight: "800", color: "#fff" },
});

// ── Detail Row 
function DR({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: any;
  label: string;
  value?: string | number | null;
  valueColor?: string;
}) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <View style={dr.row}>
      <View style={dr.iconBox}>
        <Ionicons name={icon} size={11} color={C.primary} />
      </View>
      <Text style={dr.label}>{label}</Text>
      <Text style={[dr.value, valueColor ? { color: valueColor } : {}]}>
        {String(value)}
      </Text>
    </View>
  );
}
const dr = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 5 },
  iconBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { fontSize: 11, color: C.textMuted, fontWeight: "600", width: 100 },
  value: { fontSize: 11, color: C.text, fontWeight: "600", flex: 1 },
});

// ── Section Header 
function SectionHead({
  icon,
  label,
  color,
}: {
  icon: any;
  label: string;
  color?: string;
}) {
  return (
    <View style={seh.row}>
      <View
        style={[seh.iconBox, { backgroundColor: (color || C.primary) + "22" }]}
      >
        <Ionicons name={icon} size={12} color={color || C.primary} />
      </View>
      <Text style={[seh.label, { color: color || C.accent }]}>{label}</Text>
      <View style={seh.line} />
    </View>
  );
}
const seh = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
    marginTop: 4,
  },
  iconBox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  line: { flex: 1, height: 1, backgroundColor: C.card },
});

// ── Animal Card 
function AnimalCard({
  item,
  index,
  onHealthPress,
}: {
  item: AnimalRow;
  index: number;
  onHealthPress: (a: AnimalRow) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [loadingExtra, setLoadingExtra] = useState(false);
  const [extraData, setExtraData] = useState<{
    milk?: {
      morning: number;
      evening: number;
      total: number;
      mWorker?: string;
      eWorker?: string;
    };
    feedMorning?: boolean;
    feedEvening?: boolean;
    feedWorker?: string;
  } | null>(null);

  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 320,
        delay: index * 55,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        delay: index * 55,
        tension: 75,
        friction: 11,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const loadExtra = async () => {
    if (extraData) return;
    setLoadingExtra(true);
    try {
      const [milkRaw, feedRaw] = await Promise.all([
        api.getAnimalMilkRecords(item.id).catch(() => []),
        api.getAnimalFeedRecords(item.id).catch(() => []),
      ]);

      // milk: find today's record
      const milkArr: any[] = Array.isArray(milkRaw) ? milkRaw : [];
      const todayMilk = milkArr.find((m: any) =>
        (m.date || "").startsWith(TODAY),
      );
      const morning = todayMilk?.morning_liters ?? 0;
      const evening = todayMilk?.evening_liters ?? 0;
      const total = todayMilk?.total_liters ?? morning + evening;
      const mWorker = todayMilk?.morning_worker ?? null;
      const eWorker = todayMilk?.evening_worker ?? null;

      // feed: check today
      const feedArr: any[] = Array.isArray(feedRaw) ? feedRaw : [];
      const todayFeed = feedArr.find((f: any) =>
        (f.date || "").startsWith(TODAY),
      );
      const feedMorning = todayFeed?.morning_fed ?? false;
      const feedEvening = todayFeed?.evening_fed ?? false;
      const feedWorker = todayFeed?.worker_name ?? null;

      setExtraData({
        milk: { morning, evening, total, mWorker, eWorker },
        feedMorning,
        feedEvening,
        feedWorker,
      });
    } catch {
      setExtraData({});
    } finally {
      setLoadingExtra(false);
    }
  };

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Animated.timing(rotateAnim, {
      toValue: expanded ? 0 : 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
    if (!expanded) loadExtra();
    setExpanded(!expanded);
  };

  const hCfg = healthCfg(item.healthStatus);
  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });
  const statusColor = item.isSold
    ? C.sick
    : item.isActive
      ? C.healthy
      : "#f59e0b";
  const statusLabel = item.isSold
    ? "Sold"
    : item.isActive
      ? "Active"
      : "Inactive";

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <View
        style={[
          ac.card,
          isHealthy(item.healthStatus) && ac.cardHealthy,
          isUnhealthy(item.healthStatus) && ac.cardSick,
        ]}
      >
        {/* Stripe */}
        <View style={[ac.stripe, { backgroundColor: hCfg.color }]} />

        {/* Tap area: top row */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={toggle}
          style={ac.topTap}
        >
          {/* Avatar */}
          <View
            style={[
              ac.avatar,
              { borderColor: hCfg.border, backgroundColor: hCfg.bg },
            ]}
          >
            <Image
              source={getCowImage(item.type)}
              style={{ width: 30, height: 30, resizeMode: "contain" }}
            />
          </View>

          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={ac.name}>{item.name || "—"}</Text>
            <Text style={ac.tag}>#{item.tag_number}</Text>
          </View>

          <View style={ac.rightGroup}>
            <View
              style={[
                ac.activeBadge,
                {
                  backgroundColor: statusColor + "18",
                  borderColor: statusColor + "44",
                },
              ]}
            >
              <View style={[ac.dot, { backgroundColor: statusColor }]} />
              <Text style={[ac.activeText, { color: statusColor }]}>
                {statusLabel}
              </Text>
            </View>
            <Animated.View style={{ transform: [{ rotate }], marginTop: 6 }}>
              <Ionicons name="chevron-down" size={15} color={C.textLight} />
            </Animated.View>
          </View>
        </TouchableOpacity>

        {/* Meta chips */}
        <View style={ac.metaRow}>
          {item.breed ? (
            <View style={ac.chip}>
              <Ionicons name="leaf-outline" size={10} color={C.textMuted} />
              <Text style={ac.chipText}>{item.breed}</Text>
            </View>
          ) : null}
          {item.gender ? (
            <View
              style={[
                ac.chip,
                {
                  backgroundColor:
                    item.gender === "Male" ? "#eff6ff" : "#fdf0ff",
                },
              ]}
            >
              <Ionicons
                name={item.gender === "Male" ? "male" : "female"}
                size={10}
                color={item.gender === "Male" ? "#1a4a8a" : "#7c3aed"}
              />
              <Text
                style={[
                  ac.chipText,
                  { color: item.gender === "Male" ? "#1a4a8a" : "#7c3aed" },
                ]}
              >
                {item.gender}
              </Text>
            </View>
          ) : null}
          {item.age != null ? (
            <View style={ac.chip}>
              <Ionicons name="time-outline" size={10} color={C.textMuted} />
              <Text style={ac.chipText}>{item.age} yrs</Text>
            </View>
          ) : null}
          {item.type ? (
            <View style={[ac.chip, { backgroundColor: C.card }]}>
              <Text style={[ac.chipText, { color: C.accent }]}>
                {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Health row */}
        <View style={ac.healthRow}>
          <View
            style={[
              ac.healthBadge,
              { backgroundColor: hCfg.bg, borderColor: hCfg.border },
            ]}
          >
            <Ionicons name={hCfg.icon} size={12} color={hCfg.color} />
            <Text style={[ac.healthText, { color: hCfg.color }]}>
              {hCfg.label}
            </Text>
          </View>

          {/* Update health button */}
          <TouchableOpacity
            style={ac.updateBtn}
            onPress={() => onHealthPress(item)}
            activeOpacity={0.8}
          >
            <Ionicons name="create-outline" size={12} color={C.primary} />
            <Text style={ac.updateBtnText}>Update</Text>
          </TouchableOpacity>

          {item.workerName ? (
            <View style={ac.workerPill}>
              <Ionicons name="person-outline" size={9} color={C.textLight} />
              <Text style={ac.workerText}>{item.workerName}</Text>
            </View>
          ) : null}
        </View>

        {/* ── Expanded Section ── */}
        {expanded && (
          <View style={ac.expanded}>
            <View style={ac.divider} />

            {loadingExtra ? (
              <View style={ac.loadingRow}>
                <ActivityIndicator size="small" color={C.primary} />
                <Text style={ac.loadingTxt}>Loading details...</Text>
              </View>
            ) : (
              <>
                {/* Basic Info */}
                <SectionHead
                  icon="information-circle-outline"
                  label="BASIC INFO"
                />
                <DR icon="paw-outline" label="Name" value={item.name} />
                <DR
                  icon="pricetag-outline"
                  label="Tag No."
                  value={item.tag_number}
                />
                <DR icon="leaf-outline" label="Breed" value={item.breed} />
                <DR icon="body-outline" label="Type" value={item.type} />
                <DR
                  icon="male-female-outline"
                  label="Gender"
                  value={item.gender}
                />
                <DR
                  icon="time-outline"
                  label="Age"
                  value={item.age != null ? `${item.age} years` : undefined}
                />
                <DR
                  icon="checkmark-done-outline"
                  label="Status"
                  value={statusLabel}
                  valueColor={statusColor}
                />

                {/* Health */}
                <SectionHead
                  icon="heart-outline"
                  label="HEALTH STATUS"
                  color={hCfg.color}
                />
                <View style={ac.healthDetailRow}>
                  <View
                    style={[
                      ac.healthDetailBadge,
                      { backgroundColor: hCfg.bg, borderColor: hCfg.border },
                    ]}
                  >
                    <Ionicons name={hCfg.icon} size={16} color={hCfg.color} />
                    <Text style={[ac.healthDetailText, { color: hCfg.color }]}>
                      {hCfg.label}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[ac.editHealthBtn, { backgroundColor: C.primary }]}
                    onPress={() => onHealthPress(item)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="create-outline" size={13} color="#fff" />
                    <Text style={ac.editHealthText}>Edit Health</Text>
                  </TouchableOpacity>
                </View>
                {item.workerName ? (
                  <DR
                    icon="person-outline"
                    label="Reported By"
                    value={item.workerName}
                  />
                ) : null}

                {/* Today's Milk */}
                <SectionHead
                  icon="water-outline"
                  label="TODAY'S MILK"
                  color={C.milkBlue}
                />
                {extraData?.milk ? (
                  <View style={ac.milkGrid}>
                    <View style={[ac.milkBox, { backgroundColor: "#eff6ff" }]}>
                      <Ionicons
                        name="sunny-outline"
                        size={14}
                        color={C.milkBlue}
                      />
                      <Text style={ac.milkVal}>{extraData.milk.morning} L</Text>
                      <Text style={ac.milkLbl}>Morning</Text>
                      {extraData.milk.mWorker ? (
                        <Text style={ac.milkWorker}>
                          {extraData.milk.mWorker}
                        </Text>
                      ) : null}
                    </View>
                    <View style={[ac.milkBox, { backgroundColor: "#f0f9ff" }]}>
                      <Ionicons name="moon-outline" size={14} color="#0891b2" />
                      <Text style={ac.milkVal}>{extraData.milk.evening} L</Text>
                      <Text style={ac.milkLbl}>Evening</Text>
                      {extraData.milk.eWorker ? (
                        <Text style={ac.milkWorker}>
                          {extraData.milk.eWorker}
                        </Text>
                      ) : null}
                    </View>
                    <View
                      style={[
                        ac.milkBox,
                        { backgroundColor: C.card, flex: 1.2 },
                      ]}
                    >
                      <Ionicons name="flask-outline" size={14} color={C.dark} />
                      <Text
                        style={[ac.milkVal, { color: C.dark, fontSize: 18 }]}
                      >
                        {extraData.milk.total} L
                      </Text>
                      <Text style={[ac.milkLbl, { color: C.accent }]}>
                        Total Today
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text style={ac.noDataTxt}>No milk records for today</Text>
                )}

                {/* Today's Feed */}
                <SectionHead
                  icon="leaf-outline"
                  label="TODAY'S FEED"
                  color={C.feedGreen}
                />
                {extraData !== null ? (
                  <View style={ac.feedRow}>
                    <View
                      style={[
                        ac.feedBox,
                        extraData.feedMorning
                          ? {
                              backgroundColor: "#f0fdf4",
                              borderColor: "#86efac",
                            }
                          : {
                              backgroundColor: "#fff5f5",
                              borderColor: "#fca5a5",
                            },
                      ]}
                    >
                      <Ionicons
                        name={
                          extraData.feedMorning
                            ? "checkmark-circle"
                            : "close-circle"
                        }
                        size={18}
                        color={extraData.feedMorning ? C.feedGreen : C.sick}
                      />
                      <Text
                        style={[
                          ac.feedLabel,
                          {
                            color: extraData.feedMorning ? C.feedGreen : C.sick,
                          },
                        ]}
                      >
                        Morning
                      </Text>
                      <Text style={ac.feedStatus}>
                        {extraData.feedMorning ? "Fed" : "Not Fed"}
                      </Text>
                    </View>
                    <View
                      style={[
                        ac.feedBox,
                        extraData.feedEvening
                          ? {
                              backgroundColor: "#f0fdf4",
                              borderColor: "#86efac",
                            }
                          : {
                              backgroundColor: "#fff5f5",
                              borderColor: "#fca5a5",
                            },
                      ]}
                    >
                      <Ionicons
                        name={
                          extraData.feedEvening
                            ? "checkmark-circle"
                            : "close-circle"
                        }
                        size={18}
                        color={extraData.feedEvening ? C.feedGreen : C.sick}
                      />
                      <Text
                        style={[
                          ac.feedLabel,
                          {
                            color: extraData.feedEvening ? C.feedGreen : C.sick,
                          },
                        ]}
                      >
                        Evening
                      </Text>
                      <Text style={ac.feedStatus}>
                        {extraData.feedEvening ? "Fed" : "Not Fed"}
                      </Text>
                    </View>
                    {extraData.feedWorker ? (
                      <View style={ac.feedWorkerPill}>
                        <Ionicons
                          name="person-outline"
                          size={10}
                          color={C.textMuted}
                        />
                        <Text style={ac.feedWorkerTxt}>
                          {extraData.feedWorker}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ) : (
                  <Text style={ac.noDataTxt}>No feed records for today</Text>
                )}
              </>
            )}
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const ac = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.cardBorder,
    shadowColor: C.dark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.09,
    shadowRadius: 10,
    elevation: 3,
    overflow: "hidden",
  },
  cardHealthy: { borderColor: "#bbf7d0" },
  cardSick: { borderColor: "#fecaca" },
  stripe: { height: 3, opacity: 0.6 },
  topTap: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    paddingBottom: 6,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  name: { fontSize: 15, fontWeight: "800", color: C.text, letterSpacing: -0.2 },
  tag: { fontSize: 11, color: C.textMuted, fontWeight: "600", marginTop: 2 },
  rightGroup: { alignItems: "flex-end", gap: 4 },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  activeText: { fontSize: 10, fontWeight: "700" },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: C.bg,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  chipText: { fontSize: 10, fontWeight: "600", color: C.textMuted },
  healthRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingBottom: 12,
    flexWrap: "wrap",
  },
  healthBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  healthText: { fontSize: 11, fontWeight: "700" },
  updateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.primary + "18",
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: C.primary + "44",
  },
  updateBtnText: { fontSize: 10, fontWeight: "700", color: C.primary },
  workerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginLeft: "auto" as any,
  },
  workerText: { fontSize: 10, color: C.textLight, fontWeight: "500" },

  // Expanded
  expanded: { paddingHorizontal: 12, paddingBottom: 14, paddingTop: 4 },
  divider: { height: 1, backgroundColor: C.card, marginBottom: 14 },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    justifyContent: "center",
  },
  loadingTxt: { fontSize: 12, color: C.textMuted },
  noDataTxt: {
    fontSize: 11,
    color: C.textLight,
    fontStyle: "italic",
    marginBottom: 10,
    paddingLeft: 4,
  },

  healthDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  healthDetailBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  healthDetailText: { fontSize: 13, fontWeight: "700" },
  editHealthBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  editHealthText: { fontSize: 11, fontWeight: "700", color: "#fff" },

  // Milk
  milkGrid: { flexDirection: "row", gap: 6, marginBottom: 12 },
  milkBox: {
    flex: 1,
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    gap: 3,
  },
  milkVal: { fontSize: 16, fontWeight: "900", color: C.milkBlue },
  milkLbl: { fontSize: 10, color: C.textMuted, fontWeight: "600" },
  milkWorker: { fontSize: 9, color: C.textLight, fontWeight: "500" },

  // Feed
  feedRow: { flexDirection: "row", gap: 8, marginBottom: 8, flexWrap: "wrap" },
  feedBox: {
    flex: 1,
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    minWidth: 90,
  },
  feedLabel: { fontSize: 11, fontWeight: "700" },
  feedStatus: { fontSize: 10, color: C.textMuted, fontWeight: "600" },
  feedWorkerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    width: "100%",
    paddingTop: 4,
  },
  feedWorkerTxt: { fontSize: 10, color: C.textMuted, fontWeight: "500" },
});

// ── Main Page 
export default function FarmPage() {
  const router = useRouter();
  const isFocused = useIsFocused();

  const [animals, setAnimals] = useState<AnimalRow[]>([]);
  const [summary, setSummary] = useState({
    total: 0,
    active: 0,
    healthy: 0,
    sick: 0,
    notReported: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<
    "all" | "healthy" | "unhealthy" | "not_reported"
  >("all");
  const [healthModal, setHealthModal] = useState<{
    visible: boolean;
    animal: AnimalRow | null;
  }>({ visible: false, animal: null });

  const scrollY = useRef(new Animated.Value(0)).current;
  const isMountedRef = useRef(true);

  // ── Animated interpolations 
  const threshold = HEADER_MAX - HEADER_MIN;
  const headerH = scrollY.interpolate({
    inputRange: [0, threshold],
    outputRange: [HEADER_MAX, HEADER_MIN],
    extrapolate: "clamp",
  });
  const statsOp = scrollY.interpolate({
    inputRange: [0, threshold * 0.5],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });
  const statsY = scrollY.interpolate({
    inputRange: [0, threshold],
    outputRange: [0, -18],
    extrapolate: "clamp",
  });
  const controlsOp = scrollY.interpolate({
    inputRange: [0, threshold * 0.4, threshold * 0.75],
    outputRange: [1, 0.5, 0],
    extrapolate: "clamp",
  });
  const titleScale = scrollY.interpolate({
    inputRange: [0, threshold],
    outputRange: [1, 0.86],
    extrapolate: "clamp",
  });
  const titleX = scrollY.interpolate({
    inputRange: [0, threshold],
    outputRange: [0, -10],
    extrapolate: "clamp",
  });

  // ── Fetch 
  const fetchAll = useCallback(async (silent = false) => {
    if (!isMountedRef.current) return;
    try {
      if (!silent) setLoading(true);
      const [cowsList, healthRaw] = await Promise.all([
        api.vetGetCows().catch(() => []),
        api.vetGetHealthLogs(TODAY).catch(() => []),
      ]);
      if (!isMountedRef.current) return;

      const healthArr: any[] = Array.isArray(healthRaw) ? healthRaw : [];
      const healthMap: Record<
        string,
        { status: string; worker_name: string | null }
      > = {};
      healthArr.forEach((r: any) => {
        const key = r.cow_id ?? r.id ?? "";
        if (key)
          healthMap[key] = {
            status: r.status ?? "not_reported",
            worker_name: r.worker_name ?? null,
          };
      });

      const safeList: any[] = Array.isArray(cowsList) ? cowsList : [];
      const merged: AnimalRow[] = safeList.map((c: any) => {
        const id = c.id ?? c.cow_id ?? "";
        const h = healthMap[id] ?? {
          status: "not_reported",
          worker_name: null,
        };
        return {
          id,
          tag_number: c.tag_number ?? c.tag ?? "",
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

      const cHealthy = merged.filter((r) => isHealthy(r.healthStatus)).length;
      const cSick = merged.filter((r) => isUnhealthy(r.healthStatus)).length;
      const cNotReported = merged.filter((r) =>
        isNotReported(r.healthStatus),
      ).length;
      const cActive = merged.filter((r) => r.isActive && !r.isSold).length;

      setSummary({
        total: merged.length,
        active: cActive,
        healthy: cHealthy,
        sick: cSick,
        notReported: cNotReported,
      });
      setAnimals(merged);
    } catch (e: any) {
      if (!silent) console.log("FarmPage error:", e.message);
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
    const interval = setInterval(() => fetchAll(true), 8000);
    return () => {
      clearInterval(interval);
      isMountedRef.current = false;
    };
  }, [isFocused, fetchAll]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAll(false);
  };

  // ── Health update callback 
  const handleHealthUpdated = useCallback(
    (id: string, status: string) => {
      setAnimals((prev) =>
        prev.map((a) => (a.id === id ? { ...a, healthStatus: status } : a)),
      );
      const updated = animals.map((a) =>
        a.id === id ? { ...a, healthStatus: status } : a,
      );
      const cH = updated.filter((r) => isHealthy(r.healthStatus)).length;
      const cS = updated.filter((r) => isUnhealthy(r.healthStatus)).length;
      const cN = updated.filter((r) => isNotReported(r.healthStatus)).length;
      setSummary((s) => ({ ...s, healthy: cH, sick: cS, notReported: cN }));
    },
    [animals],
  );

  // ── Filter 
  const q = search.toLowerCase().trim();
  const filtered = animals.filter((r) => {
    const matchSearch =
      !q ||
      r.name.toLowerCase().includes(q) ||
      r.tag_number.toLowerCase().includes(q) ||
      r.breed.toLowerCase().includes(q);
    const matchFilter =
      filter === "all"
        ? true
        : filter === "healthy"
          ? isHealthy(r.healthStatus)
          : filter === "unhealthy"
            ? isUnhealthy(r.healthStatus)
            : isNotReported(r.healthStatus);
    return matchSearch && matchFilter;
  });

  const FILTERS = [
    {
      key: "all" as const,
      label: "All",
      color: C.accent,
      count: summary.total,
      icon: "list-outline" as const,
    },
    {
      key: "healthy" as const,
      label: "Healthy",
      color: C.healthy,
      count: summary.healthy,
      icon: "checkmark-circle-outline" as const,
    },
    {
      key: "unhealthy" as const,
      label: "Sick",
      color: C.sick,
      count: summary.sick,
      icon: "alert-circle-outline" as const,
    },
    {
      key: "not_reported" as const,
      label: "No Report",
      color: C.textMuted,
      count: summary.notReported,
      icon: "ellipse-outline" as const,
    },
  ];

  const renderItem = useCallback(
    ({ item, index }: { item: AnimalRow; index: number }) => (
      <AnimalCard
        item={item}
        index={index}
        onHealthPress={(a) => setHealthModal({ visible: true, animal: a })}
      />
    ),
    [],
  );

  return (
    <View style={s.screen}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* ── Animated Header ── */}
      <Animated.View style={[s.header, { height: headerH }]}>
        <LinearGradient
          colors={["#BB6B3F", "#8B6854", "#6B4A3A"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        {/* Decorative blobs */}
        <View style={s.blob1} />
        <View style={s.blob2} />

        {/* Top row */}
        <View style={[s.topRow, { paddingTop: IS_IOS ? 56 : STATUS_H + 16 }]}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Animated.Text
              style={[
                s.headerTitle,
                { transform: [{ scale: titleScale }, { translateX: titleX }] },
              ]}
            >
              Animals
            </Animated.Text>
            <Animated.Text style={[s.headerSub, { opacity: statsOp }]}>
              {todayLabel}
            </Animated.Text>
          </View>
          <TouchableOpacity style={s.refreshBtn} onPress={onRefresh}>
            <Ionicons
              name="refresh-outline"
              size={18}
              color="rgba(255,255,255,0.85)"
            />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <Animated.View
          style={{ opacity: statsOp, transform: [{ translateY: statsY }] }}
        >
          <StatsStrip
            total={summary.total}
            active={summary.active}
            healthy={summary.healthy}
            sick={summary.sick}
            notReported={summary.notReported}
          />
        </Animated.View>

        {/* Search + filters */}
        <Animated.View style={[s.controlsWrap, { opacity: controlsOp }]}>
          {/* Search */}
          <View style={s.searchBox}>
            <Ionicons
              name="search-outline"
              size={15}
              color="rgba(255,255,255,0.6)"
            />
            <TextInput
              style={s.searchInput}
              placeholder="Search by name, tag, breed..."
              placeholderTextColor="rgba(255,255,255,0.45)"
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Ionicons
                  name="close-circle"
                  size={15}
                  color="rgba(255,255,255,0.6)"
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter chips
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.filterScroll}
          >
            {FILTERS.map((fl) => {
              const active = filter === fl.key;
              return (
                <TouchableOpacity
                  key={fl.key}
                  onPress={() => setFilter(fl.key)}
                  style={[
                    s.filterChip,
                    active && {
                      backgroundColor: "rgba(255,255,255,0.9)",
                      borderColor: "transparent",
                    },
                  ]}
                  activeOpacity={0.78}
                >
                  <Ionicons
                    name={fl.icon}
                    size={11}
                    color={active ? fl.color : "rgba(255,255,255,0.7)"}
                  />
                  <Text
                    style={[
                      s.filterChipText,
                      { color: active ? fl.color : "rgba(255,255,255,0.85)" },
                    ]}
                  >
                    {fl.label}
                  </Text>
                  <View
                    style={[
                      s.filterBadge,
                      active && { backgroundColor: fl.color + "22" },
                    ]}
                  >
                    <Text
                      style={[
                        s.filterBadgeText,
                        { color: active ? fl.color : "rgba(255,255,255,0.7)" },
                      ]}
                    >
                      {fl.count}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView> */}
        </Animated.View>
      </Animated.View>

      {/* ── List ── */}
      {loading ? (
        <View style={s.centered}>
          <View style={s.loadingBox}>
            <ActivityIndicator size="large" color={C.primary} />
            <Text style={s.loadingTxt}>Loading animals...</Text>
          </View>
        </View>
      ) : (
        <Animated.FlatList
          data={filtered}
          keyExtractor={(item: AnimalRow) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[
            s.listContent,
            filtered.length === 0 && s.listEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
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
              progressViewOffset={HEADER_MAX}
            />
          }
          contentInset={{ top: HEADER_MAX }}
          contentOffset={{ x: 0, y: -HEADER_MAX }}
          automaticallyAdjustContentInsets={false}
          ListEmptyComponent={
            <View style={s.emptyBox}>
              <View style={s.emptyIconBox}>
                <Ionicons name="paw-outline" size={36} color={C.textLight} />
              </View>
              <Text style={s.emptyTitle}>No animals found</Text>
              <Text style={s.emptySubtitle}>
                {search ? "Try a different search" : "No data available"}
              </Text>
            </View>
          }
          ListFooterComponent={<View style={{ height: 50 }} />}
        />
      )}

      {/* ── Health Modal ── */}
      <HealthModal
        visible={healthModal.visible}
        animal={healthModal.animal}
        onClose={() => setHealthModal({ visible: false, animal: null })}
        onUpdated={handleHealthUpdated}
      />
    </View>
  );
}

// ── Styles 
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },

  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    overflow: "hidden",
    shadowColor: C.dark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 10,
  },
  blob1: {
    position: "absolute",
    top: -50,
    right: -50,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "#fff",
    opacity: 0.06,
  },
  blob2: {
    position: "absolute",
    top: 80,
    right: 40,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: C.primary,
    opacity: 0.12,
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 11,
    color: "rgba(255,255,255,0.65)",
    fontWeight: "500",
    marginTop: 2,
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },

  controlsWrap: { paddingHorizontal: 16, gap: 8, marginTop: 6 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  searchInput: { flex: 1, fontSize: 13, color: "#fff" },
  filterScroll: { paddingBottom: 6, gap: 6 },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  filterChipText: { fontSize: 11, fontWeight: "700" },
  filterBadge: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 7,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  filterBadgeText: { fontSize: 9, fontWeight: "700" },

  listContent: { paddingHorizontal: 14, paddingTop: HEADER_MAX + 10 },
  listEmpty: { flexGrow: 1 },

  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingBox: {
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    padding: 28,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  loadingTxt: { fontSize: 13, color: C.textMuted, fontWeight: "600" },
  emptyBox: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyIconBox: {
    width: 88,
    height: 88,
    borderRadius: 26,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  emptyTitle: { fontSize: 17, fontWeight: "800", color: C.text },
  emptySubtitle: { fontSize: 13, color: C.textMuted, textAlign: "center" },
});
