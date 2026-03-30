// index.tsx — GauSevak Worker Dashboard (with Hindi toggle)
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
// ─── Types ────────────────────────────────────────────────────────────────────

type QuickAction = "milk" | "feed" | "health" | null;
type CowTab = "milk" | "feed" | "health";

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ACTION_KEYS = {
  milk:   { color: "#16a34a", gradient: ["#16a34a", "#15803d"] as const, bg: "#f0fdf4", emoji: "🥛" },
  feed:   { color: "#d97706", gradient: ["#f59e0b", "#d97706"] as const, bg: "#fffbeb", emoji: "🌾" },
  health: { color: "#dc2626", gradient: ["#ef4444", "#dc2626"] as const, bg: "#fef2f2", emoji: "❤️" },
};

// Returns ACTION_META using translated labels — call inside components with useLang()
function useActionMeta() {
  const { t } = useLang();
  return {
    milk:   { ...ACTION_KEYS.milk,   label: t("milkLabel"),   desc: t("milkDesc") },
    feed:   { ...ACTION_KEYS.feed,   label: t("feedLabel"),   desc: t("feedDesc") },
    health: { ...ACTION_KEYS.health, label: t("healthLabel"), desc: t("healthDesc") },
  };
}

function useHealthOptions() {
  const { t } = useLang();
  return [
    { key: "healthy",       label: t("healthy"),      icon: "heart-pulse",    color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
    { key: "fever",         label: t("fever"),         icon: "thermometer-high", color: "#dc2626", bg: "#fff1f2", border: "#fecdd3" },
    { key: "upset_stomach", label: t("upsetStomach"), icon: "stomach",        color: "#ea580c", bg: "#fff7ed", border: "#fed7aa" },
    { key: "injury",        label: t("injury"),        icon: "bandage",        color: "#ca8a04", bg: "#fefce8", border: "#fde68a" },
    { key: "other",         label: t("other"),         icon: "help-circle",    color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
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
  healthData: any[],
): Record<string, CowStatus> {
  const map: Record<string, CowStatus> = {};
  cows.forEach((c) => {
    map[c.id] = { milkDone: false, feedDone: false, healthDone: false };
  });
  const milkEntries: any[] = Array.isArray(milkData)
    ? milkData
    : (milkData?.entries ?? milkData?.cows ?? []);
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
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    api
      .workerGetTodayMilk()
      .then((entries: any) => {
        const arr: any[] = Array.isArray(entries)
          ? entries
          : (entries?.entries ?? entries?.cows ?? []);
        const entry = arr.find(
          (e: any) => e.cow_id === cow.id && e.shift === shift,
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
      Alert.alert(t("noMilkQty"), err?.message ?? t("couldNotSave"));
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
          {savedQty.toFixed(1)} L — {isMorning ? t("morningLabel") : t("eveningLabel")} {t("shiftSuffix")}
        </Text>
      </View>
    );
  }

  return (
    <View style={smk.wrap}>
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
      Alert.alert(t("noMilkQty"), err?.message ?? t("couldNotMark"));
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
      Alert.alert(t("noMilkQty"), err?.message ?? t("couldNotUnmark"));
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return <ActivityIndicator color="#d97706" style={{ marginTop: 60 }} />;

  return (
    <View style={sfd.wrap}>
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
            {t("markedAsFed")} {isMorning ? t("morningLabel") : t("eveningLabel")} {t("shiftSuffix")}
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

  useEffect(() => {
    api
      .workerGetTodayHealthLogs()
      .then((logs: any[]) => {
        const log = (Array.isArray(logs) ? logs : []).find(
          (l: any) => l.cow_id === cow.id,
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
      Alert.alert(t("noMilkQty"), err?.message ?? t("couldNotSave"));
    } finally {
      setSaving(null);
    }
  };

  if (loading)
    return <ActivityIndicator color="#dc2626" style={{ marginTop: 60 }} />;

  const selectedOpt = HEALTH_OPTIONS.find((o) => o.key === status);

  return (
    <View style={shh.wrap}>
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

// ─── Scanned Cow Screen (tabbed, single cow) ──────────────────────────────────

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
    emoji: string;
    label: string;
    doneKey: keyof CowStatus;
  }[] = [
    ...(cow.milkActive
      ? [{ key: "milk" as CowTab, emoji: "🥛", label: t("tabMilk"), doneKey: "milkDone" as keyof CowStatus }]
      : []),
    { key: "feed", emoji: "🌾", label: t("tabFeed"), doneKey: "feedDone" },
    { key: "health", emoji: "❤️", label: t("tabHealth"), doneKey: "healthDone" },
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
  const currentTabMeta = tabs.find((t) => t.key === tab);
  const currentTabDone = currentTabMeta ? status[currentTabMeta.doneKey] : false;

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
                  <Text style={{ fontSize: 20 }}>{tb.emoji}</Text>
                  <Text style={[scs.tabLabel, isActive && scs.tabLabelActive]}>
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
            <SingleCowHealth cow={cow} onDone={() => markDone("healthDone")} />
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
    milk:   cows.filter((c) => !cowStatuses[c.id]?.milkDone).length,
    feed:   cows.filter((c) => !cowStatuses[c.id]?.feedDone).length,
    health: cows.filter((c) => !cowStatuses[c.id]?.healthDone).length,
  };
  const anyPending = Object.values(pending).some((v) => v > 0);

  if (!anyPending) {
    return (
      <View style={pb.allDone}>
        <Text style={{ fontSize: 28 }}>🎉</Text>
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
              <Text style={{ fontSize: 16 }}>{m.emoji}</Text>
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
            <Text style={{ fontSize: 28 }}>{meta.emoji}</Text>
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
            <Text style={{ fontSize: 18 }}>{meta.emoji}</Text>
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
  const [cowStatuses, setCowStatuses] = useState<Record<string, CowStatus>>({});

  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannedCow, setScannedCow] = useState<Cow | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const headerAnim = useRef(new Animated.Value(0)).current;

  const fetchCows = async () => {
    if (!workerToken) return;
    setCowsLoading(true);
    try {
      const data = await api.workerGetCows();
      setCows(data);
      setFedTotal(
        data.filter((c: Cow) => c.isActive !== false && !c.isSold).length,
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
        : (milk?.entries ?? milk?.cows ?? []);
      const total = milkArr.reduce(
        (s: number, e: any) =>
          s + (e.quantity ?? e.morning_liters ?? e.evening_liters ?? 0),
        0,
      );
      if (total > 0) setMilkTotal(total);

      const feedArr: any[] = Array.isArray(feed) ? feed : [];
      setFedDone(feedArr.length);

      setCowStatuses(
        buildStatusMap(
          cowList,
          milk,
          feedArr,
          Array.isArray(health) ? health : [],
        ),
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
      (c) => c.tag === trimmed || c.id === trimmed || c.tag_id === trimmed,
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
  const initial = worker?.name?.charAt(0)?.toUpperCase() ?? "W";
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
            <Text style={s.farmName}>🏡 {worker.farm_name}</Text>
          ) : null}
        </View>
        <View style={s.topRight}>
          <LinearGradient colors={["#16a34a", "#15803d"]} style={s.avatar}>
            <Text style={s.avatarText}>{initial}</Text>
          </LinearGradient>

          {/* ── Hindi / English Toggle ── */}
          <TouchableOpacity style={s.langBtn} onPress={toggleLang} activeOpacity={0.75}>
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
            {currentShift() === "morning" ? t("morningShift") : t("eveningShift")}
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
        <View style={[s.statCard, { borderColor: "#16a34a30", backgroundColor: "#f0fdf4" }]}>
          <Text style={[s.statValue, { color: "#16a34a" }]}>
            {cowsLoading ? "…" : activeCows.length}
          </Text>
          <Text style={s.statLabel}>{t("activeCows")}</Text>
        </View>
        <View style={[s.statCard, { borderColor: "#60a5fa30", backgroundColor: "#eff6ff" }]}>
          <Text style={[s.statValue, { color: "#3b82f6" }]}>
            {milkTotal > 0
              ? `${Number.isInteger(milkTotal) ? milkTotal : milkTotal.toFixed(1)}L`
              : "--"}
          </Text>
          <Text style={s.statLabel}>{t("milkToday")}</Text>
        </View>
        <View style={[s.statCard, { borderColor: "#d9770630", backgroundColor: "#fffbeb" }]}>
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
      <Text style={[s.sectionLabel, { marginTop: 24 }]}>{t("quickEntry")}</Text>
      <BigActionButton actionKey="milk"   delay={0}   onPress={() => setActiveAction("milk")} />
      <BigActionButton actionKey="feed"   delay={80}  onPress={() => setActiveAction("feed")} />
      <BigActionButton actionKey="health" delay={160} onPress={() => setActiveAction("health")} />

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
    </ScrollView>
  );
}

// ─── Root export — wraps everything in LanguageProvider ───────────────────────

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
  qtyUnit: { fontSize: 14, color: "#9ca3af", fontWeight: "600", marginTop: -6 },
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
  label: { fontSize: 18, fontWeight: "800", color: "#111827", marginBottom: 4 },
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
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontSize: 18, fontWeight: "900", color: "#fff" },
  // ── NEW: language toggle button ──────────────────────────────────────────
  langBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#faf5ff",
    borderWidth: 1,
    borderColor: "#e9d5ff",
    alignItems: "center",
    justifyContent: "center",
  },
  langBtnText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#7c3aed",
  },
  // ────────────────────────────────────────────────────────────────────────
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
  dateText: { fontSize: 13, color: "#6b7280", fontWeight: "500", flex: 1 },
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