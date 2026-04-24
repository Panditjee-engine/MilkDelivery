// index.tsx — GauSevak Worker Dashboard (Hindi + Extra Work modal v2) — No Emojis
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  StatusBar,
  ActivityIndicator,
  Alert,
  TextInput,
  Platform,
  UIManager,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  Ionicons,
  MaterialCommunityIcons,
  FontAwesome5,
} from "@expo/vector-icons";
import { useAuth } from "../../src/contexts/AuthContext";
import { useLang, LanguageProvider } from "../../src/contexts/LanguageContext";
import { api } from "../../src/services/api";

import MilkScreen from "./milk";
import FeedScreen from "./feed";
// @ts-ignore
import HealthScreen from "./health";
import Scanner from "../../src/components/Scanner";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Palette ──────────────────────────────────────────────────────────────────
const PALETTE = {
  primary: "#FFBF55",
  dark: "#8B6854",
  accent: "#BB6B3F",
  soft: "#FF9675",
  light: "#FFF3DC",
  mid: "#F5D9A8",
  cream: "#FFF8EE",
  deepBrown: "#5C3D2E",
  mutedBrown: "#A07860",
};

// ─── Types ────────────────────────────────────────────────────────────────────

type QuickAction = "milk" | "feed" | "health" | null;
type CowTab = "milk" | "feed" | "health";
type ExtraTaskType =
  | "cleaning"
  | "maintenance"
  | "vaccination"
  | "pregnancy_check"
  | "custom";

interface Cow {
  id: string;
  name: string;
  tag: string;
  tag_id?: string;
  breed?: string;
  isActive?: boolean;
  isSold?: boolean;
  milkActive?: boolean;
}

interface CowStatus {
  milkDone: boolean;
  feedDone: boolean;
  healthDone: boolean;
}

interface ExtraTask {
  id: string;
  task_type: ExtraTaskType;
  custom_label?: string;
  description?: string;
  date: string;
  worker_name: string;
}

// ─── Icon helpers for actions ─────────────────────────────────────────────────
// Instead of emojis, we define icon configs for each action
const ACTION_ICON: Record<
  "milk" | "feed" | "health",
  { library: "MaterialCommunity" | "FontAwesome5" | "Ionicons"; name: string; size: number }
> = {
  milk: { library: "MaterialCommunity", name: "water", size: 28 },
  feed: { library: "FontAwesome5", name: "seedling", size: 24 },
  health: { library: "MaterialCommunity", name: "heart-pulse", size: 28 },
};

function ActionIcon({
  actionKey,
  size,
  color,
}: {
  actionKey: "milk" | "feed" | "health";
  size?: number;
  color?: string;
}) {
  const icon = ACTION_ICON[actionKey];
  const finalSize = size ?? icon.size;
  const finalColor = color ?? "#fff";
  if (icon.library === "MaterialCommunity") {
    return (
      <MaterialCommunityIcons
        name={icon.name as any}
        size={finalSize}
        color={finalColor}
      />
    );
  }
  if (icon.library === "FontAwesome5") {
    return (
      <FontAwesome5 name={icon.name as any} size={finalSize} color={finalColor} />
    );
  }
  return (
    <Ionicons name={icon.name as any} size={finalSize} color={finalColor} />
  );
}

// ─── Task icon map ─────────────────────────────────────────────────────────────
const TASK_ICON_MAP: Record<
  ExtraTaskType,
  { library: "MaterialCommunity" | "FontAwesome5" | "Ionicons"; name: string }
> = {
  cleaning: { library: "MaterialCommunity", name: "broom" },
  maintenance: { library: "MaterialCommunity", name: "tools" },
  vaccination: { library: "MaterialCommunity", name: "needle" },
  pregnancy_check: { library: "MaterialCommunity", name: "cow" },
  custom: { library: "Ionicons", name: "create-outline" },
};

function TaskIcon({
  taskType,
  size = 22,
  color,
}: {
  taskType: ExtraTaskType;
  size?: number;
  color?: string;
}) {
  const icon = TASK_ICON_MAP[taskType] ?? TASK_ICON_MAP.custom;
  const finalColor = color ?? "#374151";
  if (icon.library === "MaterialCommunity") {
    return (
      <MaterialCommunityIcons
        name={icon.name as any}
        size={size}
        color={finalColor}
      />
    );
  }
  if (icon.library === "FontAwesome5") {
    return (
      <FontAwesome5 name={icon.name as any} size={size} color={finalColor} />
    );
  }
  return <Ionicons name={icon.name as any} size={size} color={finalColor} />;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ACTION_KEYS = {
  milk: {
    color: "#16a34a",
    gradient: ["#16a34a", "#15803d"] as const,
    bg: "#f0fdf4",
  },
  feed: {
    color: "#d97706",
    gradient: ["#f59e0b", "#d97706"] as const,
    bg: "#fffbeb",
  },
  health: {
    color: "#dc2626",
    gradient: ["#ef4444", "#dc2626"] as const,
    bg: "#fef2f2",
  },
};

// ─── Task Meta with Hindi support ─────────────────────────────────────────────
const TASK_META_EN: Record<
  ExtraTaskType,
  { label: string; color: string; bg: string; border: string }
> = {
  cleaning: {
    label: "Cleaning / Sanitation",
    color: "#0891b2",
    bg: "#ecfeff",
    border: "#a5f3fc",
  },
  maintenance: {
    label: "Maintenance / Repairs",
    color: "#7c3aed",
    bg: "#f5f3ff",
    border: "#ddd6fe",
  },
  vaccination: {
    label: "Vaccination / Deworming",
    color: "#dc2626",
    bg: "#fef2f2",
    border: "#fecaca",
  },
  pregnancy_check: {
    label: "Pregnancy Check",
    color: "#d97706",
    bg: "#fffbeb",
    border: "#fde68a",
  },
  custom: {
    label: "Custom Task",
    color: "#374151",
    bg: "#f9fafb",
    border: "#e5e7eb",
  },
};

const TASK_META_HI: Record<
  ExtraTaskType,
  { label: string; color: string; bg: string; border: string }
> = {
  cleaning: {
    label: "सफाई / स्वच्छता",
    color: "#0891b2",
    bg: "#ecfeff",
    border: "#a5f3fc",
  },
  maintenance: {
    label: "रखरखाव / मरम्मत",
    color: "#7c3aed",
    bg: "#f5f3ff",
    border: "#ddd6fe",
  },
  vaccination: {
    label: "टीकाकरण / कृमिनाशक",
    color: "#dc2626",
    bg: "#fef2f2",
    border: "#fecaca",
  },
  pregnancy_check: {
    label: "गर्भावस्था जाँच",
    color: "#d97706",
    bg: "#fffbeb",
    border: "#fde68a",
  },
  custom: {
    label: "कस्टम कार्य",
    color: "#374151",
    bg: "#f9fafb",
    border: "#e5e7eb",
  },
};

function useTaskMeta() {
  const { lang } = useLang();
  return lang === "hi" ? TASK_META_HI : TASK_META_EN;
}

function useActionMeta() {
  const { t } = useLang();
  return {
    milk: { ...ACTION_KEYS.milk, label: t("milkLabel"), desc: t("milkDesc") },
    feed: { ...ACTION_KEYS.feed, label: t("feedLabel"), desc: t("feedDesc") },
    health: {
      ...ACTION_KEYS.health,
      label: t("healthLabel"),
      desc: t("healthDesc"),
    },
  };
}

function useHealthOptions() {
  const { t } = useLang();
  return [
    {
      key: "healthy",
      label: t("healthy"),
      icon: "heart-pulse",
      color: "#16a34a",
      bg: "#f0fdf4",
      border: "#bbf7d0",
    },
    {
      key: "fever",
      label: t("fever"),
      icon: "thermometer-high",
      color: "#dc2626",
      bg: "#fff1f2",
      border: "#fecdd3",
    },
    {
      key: "upset_stomach",
      label: t("upsetStomach"),
      icon: "stomach",
      color: "#ea580c",
      bg: "#fff7ed",
      border: "#fed7aa",
    },
    {
      key: "injury",
      label: t("injury"),
      icon: "bandage",
      color: "#ca8a04",
      bg: "#fefce8",
      border: "#fde68a",
    },
    {
      key: "other",
      label: t("other"),
      icon: "help-circle",
      color: "#7c3aed",
      bg: "#f5f3ff",
      border: "#ddd6fe",
    },
  ] as const;
}

type HealthKey = "healthy" | "fever" | "upset_stomach" | "injury" | "other";

const todayStr = () => new Date().toISOString().split("T")[0];
const currentShift = (): "morning" | "evening" =>
  new Date().getHours() < 13 ? "morning" : "evening";

function buildStatusMap(
  cows: Cow[],
  milkData: any,
  feedData: any[],
  healthData: any[]
): Record<string, CowStatus> {
  const map: Record<string, CowStatus> = {};
  cows.forEach((c) => {
    map[c.id] = { milkDone: false, feedDone: false, healthDone: false };
  });
  const milkEntries: any[] = Array.isArray(milkData)
    ? milkData
    : milkData?.entries ?? milkData?.cows ?? [];
  milkEntries.forEach((e: any) => {
    const id = e.cow_id ?? e.id;
    if (map[id]) map[id].milkDone = true;
  });
  (feedData ?? []).forEach((e: any) => {
    const id = e.cow_id ?? e.id;
    if (map[id]) map[id].feedDone = true;
  });
  (healthData ?? []).forEach((e: any) => {
    const id = e.cow_id ?? e.id;
    if (map[id]) map[id].healthDone = true;
  });
  return map;
}

// ─── Modern Alert Helper ──────────────────────────────────────────────────────

interface ModernAlertProps {
  visible: boolean;
  title: string;
  message: string;
  type?: "success" | "error" | "warning" | "confirm";
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

function ModernAlert({
  visible,
  title,
  message,
  type = "warning",
  confirmText = "OK",
  cancelText,
  onConfirm,
  onCancel,
}: ModernAlertProps) {
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;

  const iconMap = {
    success: { icon: "checkmark-circle", color: "#16a34a", bg: "#f0fdf4" },
    error: { icon: "close-circle", color: "#dc2626", bg: "#fef2f2" },
    warning: { icon: "warning", color: PALETTE.accent, bg: PALETTE.light },
    confirm: { icon: "help-circle", color: PALETTE.dark, bg: PALETTE.mid },
  };
  const iconMeta = iconMap[type];

  return (
    <Modal visible={visible} transparent animationType="none">
      <View style={ma.overlay}>
        <Animated.View
          style={[
            ma.card,
            { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
          ]}
        >
          <View style={[ma.iconWrap, { backgroundColor: iconMeta.bg }]}>
            <Ionicons
              name={iconMeta.icon as any}
              size={36}
              color={iconMeta.color}
            />
          </View>
          <Text style={ma.title}>{title}</Text>
          <Text style={ma.message}>{message}</Text>
          <View style={ma.btnRow}>
            {cancelText && (
              <TouchableOpacity style={ma.cancelBtn} onPress={onCancel}>
                <Text style={ma.cancelText}>{cancelText}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                ma.confirmBtn,
                { backgroundColor: iconMeta.color },
                cancelText ? { flex: 1 } : { width: "100%" },
              ]}
              onPress={onConfirm}
            >
              <Text style={ma.confirmText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── Single Cow — Milk Tab ────────────────────────────────────────────────────

function SingleCowMilk({ cow, onDone }: { cow: Cow; onDone: () => void }) {
  const { t } = useLang();
  const shift = currentShift();
  const isMorning = shift === "morning";
  const accentColor = isMorning ? "#d97706" : "#4f46e5";
  const accentLight = isMorning ? "#fef3c7" : "#e0e7ff";

  const [qty, setQty] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedQty, setSavedQty] = useState(0);
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState("");
  const [alert, setAlert] = useState<Partial<ModernAlertProps> | null>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    api
      .workerGetTodayMilk()
      .then((entries: any) => {
        const arr: any[] = Array.isArray(entries)
          ? entries
          : entries?.entries ?? entries?.cows ?? [];
        const entry = arr.find(
          (e: any) => e.cow_id === cow.id && e.shift === shift
        );
        if (entry) {
          setSaved(true);
          setSavedQty(entry.quantity);
        }
      })
      .catch(() => {});
  }, []);

  const commit = () => {
    const n = parseFloat(raw);
    if (!isNaN(n) && n >= 0) setQty(Math.round(n * 10) / 10);
    setEditing(false);
  };

  const handleSave = async () => {
    if (qty === 0 || saving) return;
    setSaving(true);
    try {
      await api.workerAddMilk({
        cow_id: cow.id,
        cow_name: cow.name,
        cow_tag: cow.tag ?? cow.tag_id ?? "",
        quantity: qty,
        shift,
        date: todayStr(),
      });
      setSaved(true);
      setSavedQty(qty);
      onDone();
    } catch (err: any) {
      setAlert({
        visible: true,
        type: "error",
        title: t("noMilkQty"),
        message: err?.message ?? t("couldNotSave"),
        confirmText: "OK",
        onConfirm: () => setAlert(null),
      });
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <View style={smk.doneWrap}>
        <View style={smk.doneCircle}>
          <Ionicons name="checkmark-circle" size={72} color="#16a34a" />
        </View>
        <Text style={smk.doneTitle}>{t("milkRecorded")}</Text>
        <Text style={smk.doneSub}>
          {savedQty.toFixed(1)} L —{" "}
          {isMorning ? t("morningLabel") : t("eveningLabel")}{" "}
          {t("shiftSuffix")}
        </Text>
      </View>
    );
  }

  return (
    <View style={smk.wrap}>
      {alert?.visible && (
        <ModernAlert {...(alert as ModernAlertProps)} visible={true} />
      )}
      <LinearGradient
        colors={isMorning ? ["#fffbeb", "#fef3c7"] : ["#eef2ff", "#e0e7ff"]}
        style={smk.shiftBadge}
      >
        <Ionicons
          name={isMorning ? "sunny" : "moon"}
          size={16}
          color={accentColor}
        />
        <Text style={[smk.shiftText, { color: accentColor }]}>
          {isMorning ? t("morningShiftLabel") : t("eveningShiftLabel")}
        </Text>
      </LinearGradient>

      <Text style={smk.qtyLabel}>{t("enterMilkQty")}</Text>

      <View style={smk.controls}>
        <TouchableOpacity
          style={smk.stepBtn}
          onPress={() =>
            setQty((q) => Math.max(0, Math.round((q - 0.5) * 10) / 10))
          }
        >
          <Ionicons name="remove" size={28} color="#374151" />
        </TouchableOpacity>

        <TouchableOpacity
          style={smk.qtyBox}
          onPress={() => {
            setRaw(qty === 0 ? "" : String(qty));
            setEditing(true);
            setTimeout(() => inputRef.current?.focus(), 60);
          }}
          activeOpacity={0.8}
        >
          {editing ? (
            <TextInput
              ref={inputRef}
              style={[
                smk.qtyNum,
                {
                  color: accentColor,
                  borderBottomWidth: 2,
                  borderBottomColor: accentColor,
                },
              ]}
              value={raw}
              onChangeText={setRaw}
              onBlur={commit}
              onSubmitEditing={commit}
              keyboardType="decimal-pad"
              maxLength={5}
              selectTextOnFocus
            />
          ) : (
            <Text style={smk.qtyNum}>{qty}</Text>
          )}
          <Text style={smk.qtyUnit}>{t("litres")}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={smk.stepBtn}
          onPress={() => setQty((q) => Math.round((q + 0.5) * 10) / 10)}
        >
          <Ionicons name="add" size={28} color="#374151" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[
          smk.saveBtn,
          { backgroundColor: qty > 0 ? accentColor : "#e5e7eb" },
        ]}
        onPress={handleSave}
        disabled={saving || qty === 0}
        activeOpacity={0.8}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text
            style={[smk.saveBtnText, { color: qty > 0 ? "#fff" : "#9ca3af" }]}
          >
            {t("saveBtn")} {qty > 0 ? `${qty} L` : ""}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

// ─── Single Cow — Feed Tab ────────────────────────────────────────────────────

function SingleCowFeed({ cow, onDone }: { cow: Cow; onDone: () => void }) {
  const { t } = useLang();
  const shift = currentShift();
  const isMorning = shift === "morning";

  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feeds, setFeeds] = useState<
    { feed_type: string; quantity_kg: number }[]
  >([]);
  const [alert, setAlert] = useState<Partial<ModernAlertProps> | null>(null);

  useEffect(() => {
    api
      .workerGetFeedStatus(todayStr(), shift)
      .then((logs: any[]) => {
        const log = logs.find((e: any) => e.cow_id === cow.id);
        if (log?.fed_at) {
          setDone(true);
          if (log.feeds?.length) setFeeds(log.feeds);
          else if (log.feed_type)
            setFeeds([
              { feed_type: log.feed_type, quantity_kg: log.quantity_kg ?? 0 },
            ]);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleMark = async () => {
    setSaving(true);
    try {
      await api.workerMarkFed({
        cow_id: cow.id,
        cow_name: cow.name,
        cow_tag: cow.tag ?? cow.tag_id ?? "",
        date: todayStr(),
        shift,
      });
      setDone(true);
      onDone();
    } catch (err: any) {
      setAlert({
        visible: true,
        type: "error",
        title: t("noMilkQty"),
        message: err?.message ?? t("couldNotMark"),
        confirmText: "OK",
        onConfirm: () => setAlert(null),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUnmark = async () => {
    setSaving(true);
    try {
      await api.workerUnmarkFed(cow.id, todayStr(), shift);
      setDone(false);
      onDone();
    } catch (err: any) {
      setAlert({
        visible: true,
        type: "error",
        title: t("noMilkQty"),
        message: err?.message ?? t("couldNotUnmark"),
        confirmText: "OK",
        onConfirm: () => setAlert(null),
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return <ActivityIndicator color="#d97706" style={{ marginTop: 60 }} />;

  return (
    <View style={sfd.wrap}>
      {alert?.visible && (
        <ModernAlert {...(alert as ModernAlertProps)} visible={true} />
      )}
      <LinearGradient
        colors={isMorning ? ["#fffbeb", "#fef3c7"] : ["#f0f9ff", "#e0f2fe"]}
        style={sfd.shiftBadge}
      >
        <Ionicons
          name={isMorning ? "sunny" : "moon"}
          size={16}
          color="#d97706"
        />
        <Text style={sfd.shiftText}>
          {isMorning ? t("morningShiftLabel") : t("eveningShiftLabel")}
        </Text>
      </LinearGradient>

      {done ? (
        <View style={sfd.doneWrap}>
          <View style={sfd.doneCircle}>
            <FontAwesome5 name="check" size={36} color="#16a34a" />
          </View>
          <Text style={sfd.doneTitle}>{t("fedCheck")}</Text>
          <Text style={sfd.doneSub}>
            {t("markedAsFed")}{" "}
            {isMorning ? t("morningLabel") : t("eveningLabel")}{" "}
            {t("shiftSuffix")}
          </Text>
          {feeds.length > 0 && (
            <View style={sfd.feedList}>
              {feeds.map((f, i) => (
                <View key={i} style={sfd.feedChip}>
                  <FontAwesome5 name="seedling" size={11} color="#d97706" />
                  <Text style={sfd.feedChipText}>
                    {f.feed_type} — {f.quantity_kg} kg
                  </Text>
                </View>
              ))}
            </View>
          )}
          <TouchableOpacity
            style={sfd.undoBtn}
            onPress={handleUnmark}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#6b7280" />
            ) : (
              <Text style={sfd.undoText}>{t("undo")}</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={sfd.pendingWrap}>
          <View style={sfd.pendingIcon}>
            <FontAwesome5 name="seedling" size={44} color="#d97706" />
          </View>
          <Text style={sfd.pendingTitle}>{t("notYetFed")}</Text>
          <Text style={sfd.pendingSub}>
            {t("tapToMark")} {cow.name}
          </Text>
          <TouchableOpacity
            style={sfd.markBtn}
            onPress={handleMark}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <FontAwesome5 name="check" size={16} color="#fff" />
                <Text style={sfd.markBtnText}>{t("markAsFed")}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─── Single Cow — Health Tab ──────────────────────────────────────────────────

function SingleCowHealth({ cow, onDone }: { cow: Cow; onDone: () => void }) {
  const { t } = useLang();
  const HEALTH_OPTIONS = useHealthOptions();

  const [status, setStatus] = useState<HealthKey | null>(null);
  const [saving, setSaving] = useState<HealthKey | null>(null);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<Partial<ModernAlertProps> | null>(null);

  useEffect(() => {
    api
      .workerGetTodayHealthLogs()
      .then((logs: any[]) => {
        const log = (Array.isArray(logs) ? logs : []).find(
          (l: any) => l.cow_id === cow.id
        );
        if (log) setStatus(log.status as HealthKey);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = async (key: HealthKey) => {
    if (saving) return;
    setSaving(key);
    try {
      await api.workerAddHealthLog({
        cow_id: cow.id,
        cow_name: cow.name,
        cow_tag: cow.tag ?? cow.tag_id ?? "",
        status: key,
        date: todayStr(),
      });
      setStatus(key);
      onDone();
    } catch (err: any) {
      setAlert({
        visible: true,
        type: "error",
        title: t("noMilkQty"),
        message: err?.message ?? t("couldNotSave"),
        confirmText: "OK",
        onConfirm: () => setAlert(null),
      });
    } finally {
      setSaving(null);
    }
  };

  if (loading)
    return <ActivityIndicator color="#dc2626" style={{ marginTop: 60 }} />;

  const selectedOpt = HEALTH_OPTIONS.find((o) => o.key === status);

  return (
    <View style={shh.wrap}>
      {alert?.visible && (
        <ModernAlert {...(alert as ModernAlertProps)} visible={true} />
      )}
      {status && selectedOpt && (
        <View
          style={[
            shh.currentBadge,
            {
              backgroundColor: selectedOpt.bg,
              borderColor: selectedOpt.border,
            },
          ]}
        >
          <MaterialCommunityIcons
            name={selectedOpt.icon as any}
            size={18}
            color={selectedOpt.color}
          />
          <Text style={[shh.currentText, { color: selectedOpt.color }]}>
            {t("currentLabel")} {selectedOpt.label}
          </Text>
          <Ionicons
            name="checkmark-circle"
            size={16}
            color={selectedOpt.color}
          />
        </View>
      )}

      <Text style={shh.prompt}>
        {status ? t("updateHealth") : t("selectHealth")}
      </Text>

      {HEALTH_OPTIONS.map((opt) => {
        const isSelected = status === opt.key;
        const isSaving = saving === opt.key;
        return (
          <TouchableOpacity
            key={opt.key}
            style={[
              shh.optBtn,
              { borderColor: isSelected ? opt.color : "#e5e7eb" },
              isSelected && { backgroundColor: opt.bg },
            ]}
            onPress={() => handleSelect(opt.key as HealthKey)}
            disabled={!!saving}
            activeOpacity={0.75}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={opt.color} />
            ) : (
              <MaterialCommunityIcons
                name={opt.icon as any}
                size={22}
                color={isSelected ? opt.color : "#9ca3af"}
              />
            )}
            <Text
              style={[
                shh.optLabel,
                { color: isSelected ? opt.color : "#374151" },
              ]}
            >
              {opt.label}
            </Text>
            {isSelected && (
              <Ionicons name="checkmark-circle" size={20} color={opt.color} />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Scanned Cow Screen ───────────────────────────────────────────────────────

function ScannedCowScreen({
  cow,
  initialStatus,
  onClose,
  onRefreshStatus,
}: {
  cow: Cow;
  initialStatus: CowStatus;
  onClose: () => void;
  onRefreshStatus: () => void;
}) {
  const { t } = useLang();
  const ACTION_META = useActionMeta();

  const tabs: {
    key: CowTab;
    label: string;
    doneKey: keyof CowStatus;
    iconName: string;
    iconLib: "MaterialCommunity" | "FontAwesome5" | "Ionicons";
  }[] = [
    ...(cow.milkActive
      ? [
          {
            key: "milk" as CowTab,
            label: t("tabMilk"),
            doneKey: "milkDone" as keyof CowStatus,
            iconName: "water",
            iconLib: "MaterialCommunity" as const,
          },
        ]
      : []),
    {
      key: "feed" as CowTab,
      label: t("tabFeed"),
      doneKey: "feedDone" as keyof CowStatus,
      iconName: "seedling",
      iconLib: "FontAwesome5" as const,
    },
    {
      key: "health" as CowTab,
      label: t("tabHealth"),
      doneKey: "healthDone" as keyof CowStatus,
      iconName: "heart-pulse",
      iconLib: "MaterialCommunity" as const,
    },
  ];

  const [tab, setTab] = useState<CowTab>(cow.milkActive ? "milk" : "feed");
  const [status, setStatus] = useState<CowStatus>(initialStatus);

  const markDone = (key: keyof CowStatus) =>
    setStatus((prev) => ({ ...prev, [key]: true }));

  const handleClose = () => {
    onRefreshStatus();
    onClose();
  };

  const allDone = status.milkDone && status.feedDone && status.healthDone;
  const currentTabMeta = tabs.find((tb) => tb.key === tab);
  const currentTabDone = currentTabMeta
    ? status[currentTabMeta.doneKey]
    : false;

  const renderTabIcon = (
    iconName: string,
    iconLib: "MaterialCommunity" | "FontAwesome5" | "Ionicons",
    isActive: boolean
  ) => {
    const color = isActive ? "#16a34a" : "rgba(255,255,255,0.65)";
    const size = 18;
    if (iconLib === "MaterialCommunity")
      return <MaterialCommunityIcons name={iconName as any} size={size} color={color} />;
    if (iconLib === "FontAwesome5")
      return <FontAwesome5 name={iconName as any} size={size} color={color} />;
    return <Ionicons name={iconName as any} size={size} color={color} />;
  };

  return (
    <Modal visible animationType="slide" onRequestClose={handleClose}>
      <View style={scs.container}>
        <LinearGradient colors={["#16a34a", "#14532d"]} style={scs.header}>
          <TouchableOpacity style={scs.backBtn} onPress={handleClose}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>

          <View style={scs.cowRow}>
            <View style={scs.cowAvatar}>
              <MaterialCommunityIcons name="cow" size={28} color="#16a34a" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={scs.cowName}>{cow.name}</Text>
              <Text style={scs.cowTag}>
                #{cow.tag ?? cow.tag_id}
                {cow.breed ? ` · ${cow.breed}` : ""}
              </Text>
            </View>
            {allDone && (
              <View style={scs.allDonePill}>
                <Ionicons name="checkmark-circle" size={12} color="#16a34a" />
                <Text style={scs.allDonePillText}>{t("allDone")}</Text>
              </View>
            )}
          </View>

          <View style={scs.tabBar}>
            {tabs.map((tb) => {
              const isActive = tab === tb.key;
              const isDone = status[tb.doneKey];
              return (
                <TouchableOpacity
                  key={tb.key}
                  style={[scs.tab, isActive && scs.tabActive]}
                  onPress={() => setTab(tb.key)}
                >
                  {renderTabIcon(tb.iconName, tb.iconLib, isActive)}
                  <Text
                    style={[scs.tabLabel, isActive && scs.tabLabelActive]}
                  >
                    {tb.label}
                  </Text>
                  {isDone && (
                    <View style={scs.tabDoneDot}>
                      <Ionicons name="checkmark" size={8} color="#16a34a" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </LinearGradient>

        {currentTabDone && (
          <View style={scs.doneBanner}>
            <Ionicons name="checkmark-circle" size={15} color="#16a34a" />
            <Text style={scs.doneBannerText}>
              {ACTION_META[tab].label} {t("alreadyRecorded")}
            </Text>
          </View>
        )}

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {tab === "milk" && cow.milkActive && (
            <SingleCowMilk cow={cow} onDone={() => markDone("milkDone")} />
          )}
          {tab === "feed" && (
            <SingleCowFeed cow={cow} onDone={() => markDone("feedDone")} />
          )}
          {tab === "health" && (
            <SingleCowHealth
              cow={cow}
              onDone={() => markDone("healthDone")}
            />
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Pending Banner ───────────────────────────────────────────────────────────

function PendingBanner({
  cows,
  cowStatuses,
  onGoTo,
}: {
  cows: Cow[];
  cowStatuses: Record<string, CowStatus>;
  onGoTo: (a: QuickAction) => void;
}) {
  const { t } = useLang();
  const ACTION_META = useActionMeta();

  const pending = {
    milk: cows.filter((c) => !cowStatuses[c.id]?.milkDone).length,
    feed: cows.filter((c) => !cowStatuses[c.id]?.feedDone).length,
    health: cows.filter((c) => !cowStatuses[c.id]?.healthDone).length,
  };
  const anyPending = Object.values(pending).some((v) => v > 0);

  if (!anyPending) {
    return (
      <View style={pb.allDone}>
        <View style={pb.allDoneIconWrap}>
          <Ionicons name="checkmark-done-circle" size={32} color="#16a34a" />
        </View>
        <View>
          <Text style={pb.allDoneTitle}>{t("allTasksDone")}</Text>
          <Text style={pb.allDoneSub}>{t("allTasksSub")}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={pb.container}>
      <View style={pb.header}>
        <View style={pb.dot} />
        <Text style={pb.headerText}>{t("pendingToday")}</Text>
      </View>
      <View style={pb.row}>
        {(["milk", "feed", "health"] as const).map((key) => {
          const count = pending[key];
          const m = ACTION_META[key];
          const done = count === 0;
          return (
            <TouchableOpacity
              key={key}
              style={[
                pb.pill,
                done
                  ? pb.pillDone
                  : { borderColor: m.color + "50", backgroundColor: m.bg },
              ]}
              onPress={() => !done && onGoTo(key)}
              disabled={done}
              activeOpacity={done ? 1 : 0.7}
            >
              <ActionIcon
                actionKey={key}
                size={16}
                color={done ? "#16a34a" : m.color}
              />
              {done ? (
                <Ionicons name="checkmark-circle" size={14} color="#16a34a" />
              ) : (
                <>
                  <Text style={[pb.pillCount, { color: m.color }]}>
                    {count} {t("left")}
                  </Text>
                  <Ionicons
                    name="arrow-forward-circle"
                    size={14}
                    color={m.color}
                  />
                </>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Big Action Button ────────────────────────────────────────────────────────

function BigActionButton({
  actionKey,
  onPress,
  delay,
}: {
  actionKey: keyof ReturnType<typeof useActionMeta>;
  onPress: () => void;
  delay: number;
}) {
  const ACTION_META = useActionMeta();
  const meta = ACTION_META[actionKey];

  const translateY = useRef(new Animated.Value(40)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        delay,
        useNativeDriver: true,
        tension: 70,
        friction: 9,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        delay,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{
        transform: [{ translateY }, { scale: pressScale }],
        opacity,
        marginBottom: 16,
      }}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={() =>
          Animated.spring(pressScale, {
            toValue: 0.97,
            useNativeDriver: true,
          }).start()
        }
        onPressOut={() =>
          Animated.spring(pressScale, {
            toValue: 1,
            useNativeDriver: true,
          }).start()
        }
        activeOpacity={1}
      >
        <View
          style={[
            bb.card,
            { backgroundColor: meta.bg, borderColor: meta.color + "30" },
          ]}
        >
          <View style={[bb.colorBar, { backgroundColor: meta.color }]} />
          <LinearGradient colors={meta.gradient} style={bb.iconCircle}>
            <ActionIcon actionKey={actionKey} size={28} color="#fff" />
          </LinearGradient>
          <View style={bb.textWrap}>
            <Text style={bb.label}>{meta.label}</Text>
            <Text style={bb.desc}>{meta.desc}</Text>
          </View>
          <View style={[bb.arrowWrap, { backgroundColor: meta.color + "15" }]}>
            <Ionicons name="chevron-forward" size={20} color={meta.color} />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Full-Screen Action Modal ─────────────────────────────────────────────────

function FullScreenModal({
  action,
  onClose,
  token,
  onMilkTotal,
  onFedCount,
  onRefreshStatus,
}: {
  action: QuickAction;
  onClose: () => void;
  token: string;
  onMilkTotal: (v: number) => void;
  onFedCount: (done: number, total: number) => void;
  onRefreshStatus: () => void;
}) {
  const ACTION_META = useActionMeta();
  if (!action) return null;
  const meta = ACTION_META[action];

  const handleClose = () => {
    onRefreshStatus();
    onClose();
  };

  return (
    <Modal visible animationType="slide" onRequestClose={handleClose}>
      <View style={ms.container}>
        <View style={[ms.header, { borderBottomColor: meta.color + "20" }]}>
          <View style={[ms.colorBar, { backgroundColor: meta.color }]} />
          <LinearGradient colors={meta.gradient} style={ms.headerIcon}>
            <ActionIcon actionKey={action} size={18} color="#fff" />
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={ms.title}>{meta.label}</Text>
            <Text style={ms.sub}>{meta.desc}</Text>
          </View>
          <TouchableOpacity style={ms.closeBtn} onPress={handleClose}>
            <Ionicons name="close" size={18} color="#374151" />
          </TouchableOpacity>
        </View>
        <View style={ms.content}>
          {action === "milk" && (
            <MilkScreen token={token} onTotalChange={onMilkTotal} />
          )}
          {action === "feed" && <FeedScreen onFedCountChange={onFedCount} />}
          {action === "health" && <HealthScreen />}
        </View>
      </View>
    </Modal>
  );
}

// ─── Extra Work Modal ─────────────────────────────────────────────────────────

function ExtraWorkModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { lang } = useLang();
  const TASK_META = useTaskMeta();

  const [tasks, setTasks] = useState<ExtraTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedType, setSelectedType] = useState<ExtraTaskType | null>(null);
  const [customLabel, setCustomLabel] = useState("");
  const [description, setDescription] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [alert, setAlert] = useState<Partial<ModernAlertProps> | null>(null);
  const [deleteAlert, setDeleteAlert] = useState<{
    visible: boolean;
    taskId: string | null;
  }>({ visible: false, taskId: null });

  const isHindi = lang === "hi";

  const labels = {
    modalTitle: isHindi ? "अतिरिक्त कार्य" : "Extra Work",
    modalSub: isHindi
      ? "आज किए गए अतिरिक्त कार्य दर्ज करें"
      : "Log additional tasks you did today",
    formTitle: isHindi ? "आपने क्या किया?" : "What did you do?",
    customPlaceholder: isHindi
      ? "जैसे: बाड़ की मरम्मत, यार्ड सफाई…"
      : "e.g. Fence repair, Yard cleaning…",
    notesLabel: isHindi ? "नोट्स (वैकल्पिक)" : "Notes (optional)",
    notesPlaceholder: isHindi
      ? "आपने क्या किया वर्णन करें…"
      : "Describe what you did…",
    saveBtn: isHindi ? "कार्य सहेजें" : "Save Task",
    todaySection: isHindi ? "आज के अतिरिक्त कार्य" : "Today's Extra Work",
    loadingText: isHindi ? "कार्य लोड हो रहे हैं…" : "Loading tasks…",
    emptyTitle: isHindi ? "अभी कोई अतिरिक्त कार्य नहीं" : "No extra tasks yet",
    emptySub: isHindi
      ? "आज किया गया कोई कार्य दर्ज करने के लिए + बटन दबाएं"
      : "Tap the + button above to log something you did today",
    loggedToday: isHindi ? "आज दर्ज किया" : "Logged today",
    deleteTitle: isHindi ? "कार्य हटाएं" : "Delete Task",
    deleteMsg: isHindi ? "यह प्रविष्टि हटाएं?" : "Remove this entry?",
    cancelBtn: isHindi ? "रद्द करें" : "Cancel",
    deleteBtn: isHindi ? "हटाएं" : "Delete",
    taskNameLabel: isHindi ? "कार्य का नाम" : "Task Name",
    taskNamePlaceholder: isHindi
      ? "अपना कार्य टाइप करें…"
      : "Type your task…",
    orSelectLabel: isHindi ? "— या नीचे से चुनें —" : "— or choose below —",
    errorRequired: isHindi
      ? "कृपया कार्य का प्रकार चुनें या नाम दर्ज करें।"
      : "Please select a task type or enter a task name.",
    errorSave: isHindi ? "कार्य सहेजा नहीं जा सका।" : "Could not save task.",
    errorDelete: isHindi ? "कार्य हटाया नहीं जा सका।" : "Could not delete task.",
  };

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const data = await api.workerGetTodayExtraTasks();
      setTasks(Array.isArray(data) ? data : []);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) fetchTasks();
  }, [visible]);

  const toggleForm = () => {
    setShowForm((prev) => !prev);
  };

  const resetForm = () => {
    setSelectedType(null);
    setCustomLabel("");
    setDescription("");
    setShowForm(false);
  };

  const handleSave = async () => {
    if (saving) return;
    const hasCustomText = customLabel.trim().length > 0;
    const finalType: ExtraTaskType = selectedType ?? (hasCustomText ? "custom" : null as any);

    if (!finalType && !hasCustomText) {
      setAlert({
        visible: true,
        type: "warning",
        title: isHindi ? "आवश्यक है" : "Required",
        message: labels.errorRequired,
        confirmText: "OK",
        onConfirm: () => setAlert(null),
      });
      return;
    }

    setSaving(true);
    try {
      await api.workerAddExtraTask({
        task_type: finalType,
        custom_label: hasCustomText ? customLabel.trim() : undefined,
        description: description.trim() || undefined,
        date: todayStr(),
      });
      await fetchTasks();
      resetForm();
    } catch (err: any) {
      setAlert({
        visible: true,
        type: "error",
        title: isHindi ? "त्रुटि" : "Error",
        message: err?.detail ?? labels.errorSave,
        confirmText: "OK",
        onConfirm: () => setAlert(null),
      });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (taskId: string) => {
    setDeleteAlert({ visible: true, taskId });
  };

  const handleDeleteConfirmed = async () => {
    const taskId = deleteAlert.taskId;
    setDeleteAlert({ visible: false, taskId: null });
    if (!taskId) return;
    try {
      await api.workerDeleteExtraTask(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch {
      setAlert({
        visible: true,
        type: "error",
        title: isHindi ? "त्रुटि" : "Error",
        message: labels.errorDelete,
        confirmText: "OK",
        onConfirm: () => setAlert(null),
      });
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={ew.container}>
        <StatusBar barStyle="light-content" />

        {alert?.visible && (
          <ModernAlert {...(alert as ModernAlertProps)} visible={true} />
        )}

        <ModernAlert
          visible={deleteAlert.visible}
          title={labels.deleteTitle}
          message={labels.deleteMsg}
          type="confirm"
          confirmText={labels.deleteBtn}
          cancelText={labels.cancelBtn}
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setDeleteAlert({ visible: false, taskId: null })}
        />

        {/* ── Header ── */}
        <LinearGradient
          colors={[PALETTE.accent, PALETTE.primary]}
          style={ew.header}
        >
          <TouchableOpacity style={ew.headerBackBtn} onPress={onClose}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={ew.headerTitleWrap}>
            <View style={ew.headerIconCircle}>
              <MaterialCommunityIcons name="clipboard-list-outline" size={20} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={ew.headerTitle}>{labels.modalTitle}</Text>
              <Text style={ew.headerSub}>{labels.modalSub}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[ew.headerAddBtn, showForm && ew.headerAddBtnActive]}
            onPress={toggleForm}
            activeOpacity={0.8}
          >
            <Ionicons
              name={showForm ? "close" : "add-circle-outline"}
              size={24}
              color={showForm ? PALETTE.accent : "#fff"}
            />
          </TouchableOpacity>
        </LinearGradient>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={ew.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Add Form ── */}
          {showForm && (
            <View style={ew.formCard}>
              <View style={ew.formTitleRow}>
                <LinearGradient
                  colors={[PALETTE.accent, PALETTE.primary]}
                  style={ew.formTitleDot}
                />
                <Text style={ew.formTitle}>{labels.formTitle}</Text>
              </View>

              {/* Custom text input */}
              <View style={ew.inputWrap}>
                <Text style={ew.inputLabel}>{labels.taskNameLabel}</Text>
                <View style={ew.customInputRow}>
                  <View style={ew.customInputIcon}>
                    <Ionicons name="create-outline" size={18} color={PALETTE.accent} />
                  </View>
                  <TextInput
                    style={ew.customInput}
                    placeholder={labels.taskNamePlaceholder}
                    placeholderTextColor={PALETTE.mutedBrown}
                    value={customLabel}
                    onChangeText={(text) => {
                      setCustomLabel(text);
                      if (text.trim()) setSelectedType(null);
                    }}
                    maxLength={60}
                  />
                </View>
              </View>

              {/* Divider */}
              <View style={ew.dividerRow}>
                <View style={ew.dividerLine} />
                <Text style={ew.dividerText}>{labels.orSelectLabel}</Text>
                <View style={ew.dividerLine} />
              </View>

              {/* Task type grid */}
              <View style={ew.typeGrid}>
                {(Object.keys(TASK_META) as ExtraTaskType[])
                  .filter((k) => k !== "custom")
                  .map((key) => {
                    const meta = TASK_META[key];
                    const isSelected = selectedType === key;
                    return (
                      <TouchableOpacity
                        key={key}
                        style={[
                          ew.typeChip,
                          {
                            borderColor: isSelected ? meta.color : PALETTE.mid,
                            backgroundColor: isSelected ? meta.bg : PALETTE.cream,
                          },
                        ]}
                        onPress={() => {
                          setSelectedType(isSelected ? null : key);
                          if (!isSelected) setCustomLabel("");
                        }}
                        activeOpacity={0.75}
                      >
                        <View style={[ew.typeChipIconWrap, { backgroundColor: isSelected ? meta.color + "20" : PALETTE.light }]}>
                          <TaskIcon
                            taskType={key}
                            size={20}
                            color={isSelected ? meta.color : PALETTE.mutedBrown}
                          />
                        </View>
                        <Text
                          style={[
                            ew.typeChipLabel,
                            { color: isSelected ? meta.color : PALETTE.deepBrown },
                          ]}
                          numberOfLines={2}
                        >
                          {meta.label}
                        </Text>
                        {isSelected && (
                          <View
                            style={[
                              ew.typeCheckBadge,
                              { backgroundColor: meta.color },
                            ]}
                          >
                            <Ionicons name="checkmark" size={9} color="#fff" />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
              </View>

              {/* Description */}
              <View style={ew.inputWrap}>
                <Text style={ew.inputLabel}>{labels.notesLabel}</Text>
                <TextInput
                  style={[ew.input, ew.textArea]}
                  placeholder={labels.notesPlaceholder}
                  placeholderTextColor={PALETTE.mutedBrown}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={3}
                  maxLength={300}
                  textAlignVertical="top"
                />
              </View>

              <TouchableOpacity
                style={[
                  ew.saveBtn,
                  {
                    opacity: (selectedType || customLabel.trim()) ? 1 : 0.5,
                  },
                ]}
                onPress={handleSave}
                disabled={(!selectedType && !customLabel.trim()) || saving}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[PALETTE.accent, PALETTE.primary]}
                  style={ew.saveBtnGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color="#fff"
                      />
                      <Text style={ew.saveBtnText}>{labels.saveBtn}</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Today's tasks section ── */}
          <View style={ew.sectionHeader}>
            <Text style={ew.sectionLabel}>{labels.todaySection}</Text>
            {tasks.length > 0 && (
              <View style={ew.sectionBadge}>
                <Text style={ew.sectionBadgeText}>{tasks.length}</Text>
              </View>
            )}
          </View>

          {loading ? (
            <View style={ew.loadingWrap}>
              <ActivityIndicator color={PALETTE.accent} size="large" />
              <Text style={ew.loadingText}>{labels.loadingText}</Text>
            </View>
          ) : tasks.length === 0 ? (
            <View style={ew.emptyState}>
              <View style={ew.emptyIconWrap}>
                <MaterialCommunityIcons
                  name="clipboard-text-outline"
                  size={44}
                  color={PALETTE.mutedBrown}
                />
              </View>
              <Text style={ew.emptyTitle}>{labels.emptyTitle}</Text>
              <Text style={ew.emptySub}>{labels.emptySub}</Text>
            </View>
          ) : (
            <View style={ew.taskList}>
              {tasks.map((task) => {
                const meta =
                  TASK_META[task.task_type as ExtraTaskType] ??
                  TASK_META.custom;
                const displayLabel =
                  task.task_type === "custom" && task.custom_label
                    ? task.custom_label
                    : meta.label;
                return (
                  <View
                    key={task.id}
                    style={[
                      ew.taskCard,
                      {
                        borderColor: meta.border,
                        backgroundColor: meta.bg,
                      },
                    ]}
                  >
                    <View
                      style={[
                        ew.taskColorBar,
                        { backgroundColor: meta.color },
                      ]}
                    />
                    <View style={ew.taskEmojiWrap}>
                      <TaskIcon
                        taskType={task.task_type as ExtraTaskType}
                        size={24}
                        color={meta.color}
                      />
                    </View>
                    <View style={ew.taskInfo}>
                      <Text
                        style={[ew.taskLabel, { color: meta.color }]}
                        numberOfLines={1}
                      >
                        {displayLabel}
                      </Text>
                      {task.description ? (
                        <Text style={ew.taskDesc} numberOfLines={2}>
                          {task.description}
                        </Text>
                      ) : null}
                      <Text style={ew.taskTime}>
                        {labels.loggedToday} • {task.worker_name}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => confirmDelete(task.id)}
                      style={ew.deleteBtn}
                      hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={15}
                        color="#9ca3af"
                      />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}

          <View style={{ height: 48 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

function DashboardContent() {
  const { worker, workerToken, workerLogout } = useAuth();
  const { lang, toggleLang, t } = useLang();
  const router = useRouter();

  const [activeAction, setActiveAction] = useState<QuickAction>(null);
  const [cows, setCows] = useState<Cow[]>([]);
  const [cowsLoading, setCowsLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(true);
  const [milkTotal, setMilkTotal] = useState(0);
  const [fedDone, setFedDone] = useState(0);
  const [fedTotal, setFedTotal] = useState(0);
  const [cowStatuses, setCowStatuses] = useState<Record<string, CowStatus>>(
    {}
  );

  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannedCow, setScannedCow] = useState<Cow | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const [extraWorkOpen, setExtraWorkOpen] = useState(false);

  const headerAnim = useRef(new Animated.Value(0)).current;

  const fetchCows = async () => {
    if (!workerToken) return;
    setCowsLoading(true);
    try {
      const data = await api.workerGetCows();
      setCows(data);
      setFedTotal(
        data.filter((c: Cow) => c.isActive !== false && !c.isSold).length
      );
    } catch (e) {
      console.log("fetchCows error:", e);
    } finally {
      setCowsLoading(false);
    }
  };

  const fetchStatuses = useCallback(async (cowList: Cow[]) => {
    if (!cowList.length) return;
    setStatusLoading(true);
    try {
      const date = todayStr();
      const shift = currentShift();
      const [milkRes, feedRes, healthRes] = await Promise.allSettled([
        api.workerGetTodayMilk(),
        api.workerGetFeedStatus(date, shift),
        api.workerGetTodayHealthLogs(),
      ]);
      const milk = milkRes.status === "fulfilled" ? milkRes.value : [];
      const feed = feedRes.status === "fulfilled" ? feedRes.value : [];
      const health = healthRes.status === "fulfilled" ? healthRes.value : [];

      const milkArr: any[] = Array.isArray(milk)
        ? milk
        : milk?.entries ?? milk?.cows ?? [];
      const total = milkArr.reduce(
        (s: number, e: any) =>
          s + (e.quantity ?? e.morning_liters ?? e.evening_liters ?? 0),
        0
      );
      if (total > 0) setMilkTotal(total);

      const feedArr: any[] = Array.isArray(feed) ? feed : [];
      setFedDone(feedArr.length);

      setCowStatuses(
        buildStatusMap(
          cowList,
          milk,
          feedArr,
          Array.isArray(health) ? health : []
        )
      );
    } catch (e) {
      console.log("fetchStatuses error:", e);
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
    fetchCows();
  }, []);

  useEffect(() => {
    if (cows.length > 0) fetchStatuses(cows);
  }, [cows]);

  const handleRefreshStatus = () => fetchStatuses(cows);

  const handleScanResult = (data: string) => {
    setScannerOpen(false);
    setScanError(null);
    const trimmed = data.trim();
    const matched = activeCows.find(
      (c) =>
        c.tag === trimmed || c.id === trimmed || c.tag_id === trimmed
    );
    if (matched) {
      setScannedCow(matched);
    } else {
      setScanError(`No cow found for: "${trimmed}"`);
      setTimeout(() => setScanError(null), 3000);
    }
  };

  const handleLogout = async () => {
    await workerLogout();
    router.replace("/(auth)/login");
  };

  const firstName = worker?.name?.split(" ")[0] ?? "Worker";
  const fedPct = fedTotal > 0 ? Math.round((fedDone / fedTotal) * 100) : 0;
  const todayDate = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
  const activeCows = cows.filter((c) => c.isActive !== false && !c.isSold);

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* ── Top Bar ── */}
      <Animated.View style={[s.topBar, { opacity: headerAnim }]}>
        <View>
          <Text style={s.greeting}>{t("appName")}</Text>
          <Text style={s.workerName}>{firstName}</Text>
          {worker?.farm_name ? (
            <Text style={s.farmName}> {worker.farm_name}</Text>
          ) : null}
        </View>
        <View style={s.topRight}>
          {/* Add Task button */}
          <TouchableOpacity
            onPress={() => setExtraWorkOpen(true)}
            activeOpacity={0.85}
            style={s.addTaskBtn}
          >
            <LinearGradient
              colors={[PALETTE.accent, PALETTE.primary]}
              style={s.addTaskGradient}
            >
              <MaterialCommunityIcons name="clipboard-plus-outline" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>

          {/* Hindi / English Toggle */}
          <TouchableOpacity
            style={s.langBtn}
            onPress={toggleLang}
            activeOpacity={0.75}
          >
            <Text style={s.langBtnText}>{lang === "en" ? "हि" : "EN"}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.scanBtn}
            onPress={() => {
              setScanError(null);
              setScannerOpen(true);
            }}
          >
            <Ionicons name="qr-code-outline" size={18} color="#16a34a" />
          </TouchableOpacity>
          <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={16} color="#dc2626" />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* ── Date + shift ── */}
      <View style={s.dateStrip}>
        <Ionicons name="calendar-outline" size={13} color="#6b7280" />
        <Text style={s.dateText}> {todayDate}</Text>
        <View style={s.shiftBadge}>
          <Text style={s.shiftText}>
            {currentShift() === "morning"
              ? t("morningShift")
              : t("eveningShift")}
          </Text>
        </View>
      </View>

      {scanError && (
        <View style={s.errorBanner}>
          <Ionicons name="warning-outline" size={14} color="#dc2626" />
          <Text style={s.errorText}>{scanError}</Text>
        </View>
      )}

      {/* ── Stats ── */}
      <View style={s.statsRow}>
        <View
          style={[
            s.statCard,
            { borderColor: "#16a34a30", backgroundColor: "#f0fdf4" },
          ]}
        >
          <MaterialCommunityIcons name="cow" size={20} color="#16a34a" />
          <Text style={[s.statValue, { color: "#16a34a" }]}>
            {cowsLoading ? "…" : activeCows.length}
          </Text>
          <Text style={s.statLabel}>{t("activeCows")}</Text>
        </View>
        <View
          style={[
            s.statCard,
            { borderColor: "#60a5fa30", backgroundColor: "#eff6ff" },
          ]}
        >
          <MaterialCommunityIcons name="water" size={20} color="#3b82f6" />
          <Text style={[s.statValue, { color: "#3b82f6" }]}>
            {milkTotal > 0
              ? `${
                  Number.isInteger(milkTotal)
                    ? milkTotal
                    : milkTotal.toFixed(1)
                }L`
              : "--"}
          </Text>
          <Text style={s.statLabel}>{t("milkToday")}</Text>
        </View>
        <View
          style={[
            s.statCard,
            { borderColor: "#d9770630", backgroundColor: "#fffbeb" },
          ]}
        >
          <FontAwesome5 name="seedling" size={16} color="#d97706" />
          <Text style={[s.statValue, { color: "#d97706" }]}>{fedPct}%</Text>
          <Text style={s.statLabel}>{t("fed")}</Text>
        </View>
      </View>

      {/* ── Pending Banner ── */}
      {!cowsLoading && !statusLoading && activeCows.length > 0 && (
        <PendingBanner
          cows={activeCows}
          cowStatuses={cowStatuses}
          onGoTo={setActiveAction}
        />
      )}
      {statusLoading && (
        <View style={s.statusLoadingRow}>
          <ActivityIndicator size="small" color="#d97706" />
          <Text style={s.statusLoadingText}>{t("syncingStatus")}</Text>
        </View>
      )}

      {/* ── Quick Entry ── */}
      <Text style={[s.sectionLabel, { marginTop: 24 }]}>
        {t("quickEntry")}
      </Text>
      <BigActionButton
        actionKey="milk"
        delay={0}
        onPress={() => setActiveAction("milk")}
      />
      <BigActionButton
        actionKey="feed"
        delay={80}
        onPress={() => setActiveAction("feed")}
      />
      <BigActionButton
        actionKey="health"
        delay={160}
        onPress={() => setActiveAction("health")}
      />

      <View style={{ height: 40 }} />

      {/* ── Scanner Modal ── */}
      <Modal
        visible={scannerOpen}
        animationType="slide"
        onRequestClose={() => setScannerOpen(false)}
      >
        <Scanner
          title={t("scanCowQR")}
          subtitle={t("pointAtTag")}
          onScanned={handleScanResult}
          onClose={() => setScannerOpen(false)}
        />
      </Modal>

      {/* ── Scanned Cow: single cow tabbed screen ── */}
      {scannedCow && (
        <ScannedCowScreen
          cow={scannedCow}
          initialStatus={
            cowStatuses[scannedCow.id] ?? {
              milkDone: false,
              feedDone: false,
              healthDone: false,
            }
          }
          onClose={() => setScannedCow(null)}
          onRefreshStatus={handleRefreshStatus}
        />
      )}

      {/* ── Quick Entry: full-screen with ALL cows ── */}
      <FullScreenModal
        action={activeAction}
        token={workerToken ?? ""}
        onClose={() => setActiveAction(null)}
        onMilkTotal={setMilkTotal}
        onFedCount={(done, total) => {
          setFedDone(done);
          setFedTotal(total);
        }}
        onRefreshStatus={handleRefreshStatus}
      />

      {/* ── Extra Work Modal ── */}
      <ExtraWorkModal
        visible={extraWorkOpen}
        onClose={() => setExtraWorkOpen(false)}
      />
    </ScrollView>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  return (
    <LanguageProvider>
      <DashboardContent />
    </LanguageProvider>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const smk = StyleSheet.create({
  wrap: { padding: 32, alignItems: "center", gap: 28 },
  shiftBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
  },
  shiftText: { fontSize: 13, fontWeight: "700" },
  qtyLabel: { fontSize: 16, fontWeight: "700", color: "#374151" },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    width: "100%",
  },
  stepBtn: {
    width: 56,
    height: 56,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f9fafb",
  },
  qtyBox: { flex: 1, alignItems: "center" },
  qtyNum: {
    fontSize: 56,
    fontWeight: "900",
    color: "#111827",
    minWidth: 80,
    textAlign: "center",
  },
  qtyUnit: {
    fontSize: 14,
    color: "#9ca3af",
    fontWeight: "600",
    marginTop: -6,
  },
  saveBtn: {
    width: "100%",
    paddingVertical: 20,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: { fontSize: 19, fontWeight: "900" },
  doneWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    padding: 32,
  },
  doneCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#f0fdf4",
    alignItems: "center",
    justifyContent: "center",
  },
  doneTitle: { fontSize: 26, fontWeight: "900", color: "#15803d" },
  doneSub: { fontSize: 15, color: "#16a34a", fontWeight: "600" },
});

const sfd = StyleSheet.create({
  wrap: { padding: 28, alignItems: "center", gap: 24 },
  shiftBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  shiftText: { fontSize: 13, fontWeight: "700", color: "#d97706" },
  doneWrap: { alignItems: "center", gap: 12, paddingTop: 8 },
  doneCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#f0fdf4",
    alignItems: "center",
    justifyContent: "center",
  },
  doneTitle: { fontSize: 26, fontWeight: "900", color: "#15803d" },
  doneSub: { fontSize: 14, color: "#16a34a", fontWeight: "600" },
  feedList: { gap: 8, marginTop: 8, width: "100%" },
  feedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fffbeb",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#fde68a",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  feedChipText: { fontSize: 13, color: "#92400e", fontWeight: "700" },
  undoBtn: {
    marginTop: 10,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  undoText: { fontSize: 14, color: "#6b7280", fontWeight: "700" },
  pendingWrap: { alignItems: "center", gap: 14, paddingTop: 8 },
  pendingIcon: {
    width: 100,
    height: 100,
    borderRadius: 32,
    backgroundColor: "#fffbeb",
    alignItems: "center",
    justifyContent: "center",
  },
  pendingTitle: { fontSize: 24, fontWeight: "900", color: "#111827" },
  pendingSub: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
  },
  markBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#d97706",
    paddingHorizontal: 36,
    paddingVertical: 18,
    borderRadius: 20,
    marginTop: 8,
  },
  markBtnText: { fontSize: 18, fontWeight: "900", color: "#fff" },
});

const shh = StyleSheet.create({
  wrap: { padding: 20, gap: 12 },
  currentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 4,
  },
  currentText: { flex: 1, fontSize: 14, fontWeight: "800" },
  prompt: {
    fontSize: 12,
    fontWeight: "800",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  optBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1.5,
    borderRadius: 16,
    borderColor: "#e5e7eb",
    paddingVertical: 16,
    paddingHorizontal: 18,
    backgroundColor: "#fafafa",
  },
  optLabel: { flex: 1, fontSize: 16, fontWeight: "700" },
});

const scs = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: { paddingTop: 56, paddingBottom: 0, paddingHorizontal: 16 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  cowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 18,
  },
  cowAvatar: {
    width: 54,
    height: 54,
    borderRadius: 17,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
  },
  cowName: { fontSize: 22, fontWeight: "900", color: "#fff" },
  cowTag: { fontSize: 13, color: "rgba(255,255,255,0.65)", marginTop: 3 },
  allDonePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  allDonePillText: { fontSize: 11, fontWeight: "800", color: "#16a34a" },
  tabBar: { flexDirection: "row", gap: 4 },
  tab: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    paddingVertical: 14,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    backgroundColor: "rgba(255,255,255,0.12)",
    position: "relative",
  },
  tabActive: { backgroundColor: "#fff" },
  tabLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255,255,255,0.65)",
  },
  tabLabelActive: { color: "#16a34a" },
  tabDoneDot: {
    position: "absolute",
    top: 7,
    right: 10,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
  },
  doneBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f0fdf4",
    borderBottomWidth: 1,
    borderBottomColor: "#bbf7d0",
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  doneBannerText: {
    fontSize: 13,
    color: "#15803d",
    fontWeight: "600",
    flex: 1,
  },
});

const pb = StyleSheet.create({
  container: {
    backgroundColor: "#fffbeb",
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#fde68a",
    padding: 16,
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#f59e0b" },
  headerText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#92400e",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  row: { flexDirection: "row", gap: 8 },
  pill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  pillDone: { backgroundColor: "#f0fdf4", borderColor: "#86efac" },
  pillCount: { fontSize: 12, fontWeight: "800" },
  allDone: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#f0fdf4",
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#86efac",
    padding: 16,
    marginBottom: 8,
  },
  allDoneIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
  },
  allDoneTitle: { fontSize: 15, fontWeight: "800", color: "#15803d" },
  allDoneSub: { fontSize: 12, color: "#16a34a", marginTop: 2 },
});

const bb = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1.5,
    paddingVertical: 20,
    paddingHorizontal: 16,
    gap: 14,
    overflow: "hidden",
  },
  colorBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: { flex: 1 },
  label: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },
  desc: { fontSize: 13, color: "#6b7280" },
  arrowWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});

const ms = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 56,
    paddingBottom: 18,
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: 1,
    backgroundColor: "#fff",
  },
  colorBar: { width: 3, height: 38, borderRadius: 4 },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 18, fontWeight: "800", color: "#111827" },
  sub: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  content: { flex: 1 },
});

const ma = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 28,
    padding: 28,
    width: "100%",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  iconWrap: {
    width: 76,
    height: 76,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "900",
    color: PALETTE.deepBrown,
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    color: PALETTE.mutedBrown,
    textAlign: "center",
    lineHeight: 20,
  },
  btnRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PALETTE.light,
    borderWidth: 1.5,
    borderColor: PALETTE.mid,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "800",
    color: PALETTE.dark,
  },
  confirmBtn: {
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#fff",
  },
});

const ew = StyleSheet.create({
  container: { flex: 1, backgroundColor: PALETTE.cream },

  header: {
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerAddBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.35)",
  },
  headerAddBtnActive: {
    backgroundColor: "#fff",
    borderColor: PALETTE.mid,
  },
  headerTitle: { fontSize: 20, fontWeight: "900", color: "#fff" },
  headerSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },

  scrollContent: { padding: 18, gap: 16 },

  formCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: PALETTE.mid,
    padding: 18,
    gap: 16,
    shadowColor: PALETTE.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 4,
  },
  formTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  formTitleDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  formTitle: { fontSize: 15, fontWeight: "800", color: PALETTE.deepBrown },

  customInputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: PALETTE.mid,
    borderRadius: 16,
    backgroundColor: PALETTE.light,
    overflow: "hidden",
  },
  customInputIcon: {
    width: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 4,
  },
  customInput: {
    flex: 1,
    paddingVertical: 13,
    paddingRight: 14,
    fontSize: 14,
    color: PALETTE.deepBrown,
    fontWeight: "600",
  },

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: PALETTE.mid,
  },
  dividerText: {
    fontSize: 11,
    fontWeight: "700",
    color: PALETTE.mutedBrown,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  typeChip: {
    width: "47%",
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 12,
    gap: 8,
    alignItems: "flex-start",
    position: "relative",
    minHeight: 84,
  },
  typeChipIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  typeChipLabel: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
    flexShrink: 1,
  },
  typeCheckBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },

  inputWrap: { gap: 6 },
  inputLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: PALETTE.mutedBrown,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  input: {
    borderWidth: 1.5,
    borderColor: PALETTE.mid,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: PALETTE.deepBrown,
    backgroundColor: PALETTE.light,
  },
  textArea: { minHeight: 80 },

  saveBtn: {
    borderRadius: 18,
    overflow: "hidden",
  },
  saveBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  saveBtnText: { fontSize: 16, fontWeight: "900", color: "#fff" },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
    marginBottom: 4,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: PALETTE.mutedBrown,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  sectionBadge: {
    backgroundColor: PALETTE.accent,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 22,
    alignItems: "center",
  },
  sectionBadgeText: { fontSize: 11, fontWeight: "900", color: "#fff" },

  loadingWrap: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 48,
  },
  loadingText: { fontSize: 13, color: PALETTE.accent, fontWeight: "600" },

  emptyState: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 32,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: PALETTE.mid,
    shadowColor: PALETTE.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 2,
  },
  emptyTitle: { fontSize: 17, fontWeight: "800", color: PALETTE.deepBrown },
  emptySub: {
    fontSize: 13,
    color: PALETTE.mutedBrown,
    textAlign: "center",
    lineHeight: 20,
  },

  taskList: { gap: 12 },
  taskCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1.5,
    paddingVertical: 14,
    paddingRight: 14,
    gap: 0,
    overflow: "hidden",
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  taskColorBar: {
    width: 4,
    alignSelf: "stretch",
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
  },
  taskEmojiWrap: {
    width: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  taskInfo: { flex: 1, gap: 3 },
  taskLabel: { fontSize: 14, fontWeight: "800" },
  taskDesc: {
    fontSize: 12,
    color: "#6b7280",
    lineHeight: 17,
  },
  taskTime: {
    fontSize: 11,
    color: "#9ca3af",
    fontWeight: "600",
    marginTop: 2,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },
});

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { paddingHorizontal: 20, paddingBottom: 20 },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingTop: 52,
    paddingBottom: 8,
  },
  greeting: { fontSize: 14, color: "#6b7280", fontWeight: "500" },
  workerName: {
    fontSize: 28,
    fontWeight: "900",
    color: "#111827",
    marginTop: 2,
  },
  farmName: { fontSize: 13, color: "#6b7280", marginTop: 3 },
  topRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  addTaskBtn: {
    borderRadius: 14,
    overflow: "hidden",
  },
  addTaskGradient: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  langBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: PALETTE.light,
    borderWidth: 1,
    borderColor: PALETTE.mid,
    alignItems: "center",
    justifyContent: "center",
  },
  langBtnText: {
    fontSize: 14,
    fontWeight: "900",
    color: PALETTE.accent,
  },
  scanBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    alignItems: "center",
    justifyContent: "center",
  },
  dateStrip: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 4,
  },
  dateText: {
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "500",
    flex: 1,
  },
  shiftBadge: {
    backgroundColor: "#f0fdf4",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  shiftText: { fontSize: 11, fontWeight: "700", color: "#16a34a" },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  errorText: { fontSize: 13, color: "#dc2626", fontWeight: "600", flex: 1 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingVertical: 14,
    alignItems: "center",
    gap: 4,
  },
  statValue: { fontSize: 20, fontWeight: "900" },
  statLabel: {
    fontSize: 10,
    color: "#9ca3af",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  statusLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fffbeb",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  statusLoadingText: { fontSize: 13, color: "#92400e", fontWeight: "600" },
});