import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  Modal,
  Animated,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../../src/contexts/AuthContext";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { useLang } from "../../src/contexts/LanguageContext";
import { api } from "../../src/services/api";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function getCurrentShift(): "morning" | "evening" {
  return new Date().getHours() < 12 ? "morning" : "evening";
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface Cow {
  id: string;
  name: string;
  tag: string;
  breed?: string;
  isActive?: boolean;
  isSold?: boolean;
  milkActive?: boolean;
}

interface ShiftStatus {
  date: string;
  morning_done: boolean;
  morning_count: number;
  evening_done: boolean;
  evening_count: number;
}

interface MilkEntry {
  id: string;
  cow_id: string;
  cow_name: string;
  cow_tag: string;
  quantity: number;
  shift: "morning" | "evening";
  date: string;
  worker_name: string;
}

// ─── Modern Alert ─────────────────────────────────────────────────────────────

interface AlertConfig {
  visible: boolean;
  title: string;
  message: string;
  icon?: string;
  iconColor?: string;
  iconBg?: string;
}

function ModernAlert({
  config,
  onClose,
}: {
  config: AlertConfig;
  onClose: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (config.visible) {
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          damping: 15,
          stiffness: 200,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [config.visible]);

  if (!config.visible) return null;

  return (
    <Modal visible={config.visible} transparent animationType="none">
      <View style={al.overlay}>
        <Animated.View
          style={[
            al.card,
            { opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          <View
            style={[al.iconWrap, { backgroundColor: config.iconBg ?? "#fee2e2" }]}
          >
            <Ionicons
              name={(config.icon ?? "alert-circle-outline") as any}
              size={28}
              color={config.iconColor ?? "#ef4444"}
            />
          </View>
          <Text style={al.title}>{config.title}</Text>
          <Text style={al.message}>{config.message}</Text>
          <TouchableOpacity style={al.btn} onPress={onClose} activeOpacity={0.85}>
            <Text style={al.btnText}>OK, Got it</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

function useModernAlert() {
  const [config, setConfig] = useState<AlertConfig>({
    visible: false,
    title: "",
    message: "",
  });
  const show = (
    title: string,
    message: string,
    icon?: string,
    iconColor?: string,
    iconBg?: string,
  ) => setConfig({ visible: true, title, message, icon, iconColor, iconBg });
  const hide = () => setConfig((p) => ({ ...p, visible: false }));
  return { config, show, hide };
}

const al = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 22,
    width: "100%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 16,
  },
  iconWrap: {
    width: 62,
    height: 62,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  message: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 22,
    fontWeight: "500",
  },
  btn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#111827",
    alignItems: "center",
  },
  btnText: { fontSize: 15, fontWeight: "800", color: "#fff" },
});

// ─── Undo Confirm Modal ───────────────────────────────────────────────────────

interface UndoConfirmProps {
  visible: boolean;
  cowName: string;
  cowTag: string;
  quantity: number;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
  accentColor: string;
}

function UndoConfirmModal({
  visible,
  cowName,
  cowTag,
  quantity,
  onConfirm,
  onCancel,
  loading,
  accentColor,
}: UndoConfirmProps) {
  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.88);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          damping: 14,
          stiffness: 220,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none">
      <View style={uc.overlay}>
        <Animated.View
          style={[
            uc.card,
            { opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          {/* Icon */}
          <View style={[uc.iconRing, { borderColor: "#fca5a5" }]}>
            <View style={uc.iconInner}>
              <Ionicons name="arrow-undo" size={26} color="#ef4444" />
            </View>
          </View>

          <Text style={uc.title}>Undo Milk Log?</Text>
          <Text style={uc.subtitle}>This will permanently remove the entry for</Text>

          {/* Entry preview chip */}
          <View style={uc.chip}>
            <MaterialCommunityIcons name="cow" size={16} color="#374151" />
            <Text style={uc.chipName}>{cowName}</Text>
            <View style={uc.chipDivider} />
            <Text style={uc.chipTag}>#{cowTag}</Text>
            <View style={uc.chipDivider} />
            <Ionicons name="water" size={13} color="#2563eb" />
            <Text style={uc.chipQty}>{quantity.toFixed(1)} L</Text>
          </View>

          <Text style={uc.warn}>
            The quantity will be removed from today's total and you can re-enter it.
          </Text>

          {/* Buttons */}
          <View style={uc.btnRow}>
            <TouchableOpacity
              style={uc.cancelBtn}
              onPress={onCancel}
              activeOpacity={0.75}
              disabled={loading}
            >
              <Text style={uc.cancelTxt}>Keep it</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[uc.confirmBtn, loading && { opacity: 0.7 }]}
              onPress={onConfirm}
              activeOpacity={0.8}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="arrow-undo" size={15} color="#fff" />
                  <Text style={uc.confirmTxt}>Yes, Undo</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const uc = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.52)",
    justifyContent: "center",
    alignItems: "center",
    padding: 28,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 26,
    paddingHorizontal: 22,
    paddingTop: 30,
    paddingBottom: 24,
    width: "100%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 10 },
    elevation: 18,
  },
  iconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  iconInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#fee2e2",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 6,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "500",
    marginBottom: 14,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#f9fafb",
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  chipName: { fontSize: 14, fontWeight: "800", color: "#111827" },
  chipTag: { fontSize: 12, fontWeight: "700", color: "#6b7280" },
  chipQty: { fontSize: 13, fontWeight: "800", color: "#2563eb" },
  chipDivider: { width: 1, height: 14, backgroundColor: "#e5e7eb" },
  warn: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 22,
    paddingHorizontal: 8,
  },
  btnRow: { flexDirection: "row", gap: 10, width: "100%" },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    alignItems: "center",
    backgroundColor: "#f9fafb",
  },
  cancelTxt: { fontSize: 14, fontWeight: "800", color: "#374151" },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#ef4444",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  confirmTxt: { fontSize: 14, fontWeight: "800", color: "#fff" },
});

// ─── Qty Input ────────────────────────────────────────────────────────────────

function QtyInput({
  qty,
  onChange,
  disabled,
}: {
  qty: number;
  onChange: (v: number) => void;
  disabled: boolean;
}) {
  const { t } = useLang();
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState("");
  const ref = useRef<TextInput>(null);

  const startEdit = () => {
    if (disabled) return;
    setRaw(qty === 0 ? "" : String(qty));
    setEditing(true);
    setTimeout(() => ref.current?.focus(), 60);
  };

  const commit = () => {
    const n = parseFloat(raw);
    if (!isNaN(n) && n >= 0) onChange(Math.round(n * 10) / 10);
    setEditing(false);
  };

  return (
    <TouchableOpacity style={s.qtyWrap} onPress={startEdit} activeOpacity={0.8}>
      {editing ? (
        <TextInput
          ref={ref}
          style={s.qtyInput}
          value={raw}
          onChangeText={setRaw}
          onBlur={commit}
          onSubmitEditing={commit}
          keyboardType="decimal-pad"
          maxLength={5}
          selectTextOnFocus
        />
      ) : (
        <Text style={[s.qtyNum, disabled && { color: "#9ca3af" }]}>{qty}</Text>
      )}
      <Text style={s.qtyHint}>{editing ? t("tapCheck") : "L"}</Text>
    </TouchableOpacity>
  );
}

// ─── Search Bar ───────────────────────────────────────────────────────────────

function CowSearchBar({
  value,
  onChange,
  onClear,
  resultCount,
  totalCount,
  accentColor,
}: {
  value: string;
  onChange: (v: string) => void;
  onClear: () => void;
  resultCount: number;
  totalCount: number;
  accentColor: string;
}) {
  const inputRef = useRef<TextInput>(null);
  const focusAnim = useRef(new Animated.Value(0)).current;
  const [focused, setFocused] = useState(false);

  const onFocus = () => {
    setFocused(true);
    Animated.timing(focusAnim, { toValue: 1, duration: 180, useNativeDriver: false }).start();
  };
  const onBlur = () => {
    setFocused(false);
    Animated.timing(focusAnim, { toValue: 0, duration: 180, useNativeDriver: false }).start();
  };

  const borderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["#e5e7eb", accentColor],
  });
  const shadowOpacity = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.12],
  });

  return (
    <View style={sb.wrapper}>
      <Animated.View
        style={[
          sb.container,
          {
            borderColor,
            shadowOpacity,
            shadowColor: accentColor,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 2 },
            elevation: focused ? 3 : 0,
          },
        ]}
      >
        <View style={sb.iconLeft}>
          <Ionicons
            name="search"
            size={18}
            color={focused || value ? accentColor : "#9ca3af"}
          />
        </View>
        <TextInput
          ref={inputRef}
          style={sb.input}
          value={value}
          onChangeText={onChange}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder="Search by tag number…"
          placeholderTextColor="#9ca3af"
          keyboardType="default"
          returnKeyType="search"
          autoCapitalize="characters"
          autoCorrect={false}
          clearButtonMode="never"
        />
        {value.length > 0 && (
          <TouchableOpacity
            style={sb.clearBtn}
            onPress={() => { onClear(); inputRef.current?.focus(); }}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <View style={[sb.clearIcon, { backgroundColor: accentColor + "18" }]}>
              <Ionicons name="close" size={13} color={accentColor} />
            </View>
          </TouchableOpacity>
        )}
      </Animated.View>

      {value.length > 0 && (
        <View style={sb.resultRow}>
          {resultCount > 0 ? (
            <View style={[sb.resultPill, { backgroundColor: accentColor + "14", borderColor: accentColor + "30" }]}>
              <MaterialCommunityIcons name="cow" size={12} color={accentColor} />
              <Text style={[sb.resultText, { color: accentColor }]}>
                {resultCount} of {totalCount} cow{totalCount !== 1 ? "s" : ""} matched
              </Text>
            </View>
          ) : (
            <View style={sb.noResultPill}>
              <Ionicons name="alert-circle-outline" size={12} color="#ef4444" />
              <Text style={sb.noResultText}>No cow found with tag "{value}"</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const sb = StyleSheet.create({
  wrapper: { marginBottom: 4 },
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    height: 50,
  },
  iconLeft: { marginRight: 10 },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: 0.5,
    height: "100%",
  },
  clearBtn: { marginLeft: 8 },
  clearIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  resultRow: { marginTop: 8, flexDirection: "row" },
  resultPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  resultText: { fontSize: 12, fontWeight: "700" },
  noResultPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fca5a5",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  noResultText: { fontSize: 12, fontWeight: "600", color: "#ef4444" },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

function MilkScreenInner({
  onTotalChange,
}: {
  token?: string;
  cows?: any[];
  onTotalChange?: (total: number) => void;
}) {
  const { workerToken } = useAuth();
  const { t } = useLang();
  const token = workerToken ?? "";
  const shift = getCurrentShift();
  const isMorning = shift === "morning";

  const [cows, setCows] = useState<Cow[]>([]);
  const [shiftStatus, setShiftStatus] = useState<ShiftStatus | null>(null);
  const [todayEntries, setTodayEntries] = useState<MilkEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // ── Undo state ──
  const [undoTarget, setUndoTarget] = useState<{
    entryId: string;
    cowId: string;
    cowName: string;
    cowTag: string;
    quantity: number;
  } | null>(null);
  const [undoing, setUndoing] = useState(false);

  const [cowData, setCowData] = useState<
    Record<
      string,
      { qty: number; saving: boolean; saved: boolean; savedShift?: string }
    >
  >({});

  const { config: alertConfig, show: showAlert, hide: hideAlert } = useModernAlert();

  const get = (id: string) =>
    cowData[id] ?? { qty: 0, saving: false, saved: false };
  const patch = (id: string, p: Partial<ReturnType<typeof get>>) =>
    setCowData((prev) => ({ ...prev, [id]: { ...get(id), ...p } }));

  const fetchAll = useCallback(async () => {
    try {
      const [cowsData, status, entries] = await Promise.all([
        api.workerGetCows(),
        api.workerGetShiftStatus(),
        api.workerGetTodayMilk(),
      ]);

      const activeCows = cowsData.filter(
        (c: Cow) => c.isActive !== false && !c.isSold && c.milkActive === true,
      );

      setCows(activeCows);
      setShiftStatus(status);
      setTodayEntries(entries);

      const savedIds = new Set(
        entries
          .filter((e: MilkEntry) => e.shift === shift)
          .map((e: MilkEntry) => e.cow_id),
      );
      setCowData(() => {
        const next: Record<
          string,
          { qty: number; saving: boolean; saved: boolean; savedShift?: string }
        > = {};
        activeCows.forEach((c: Cow) => {
          next[c.id] = savedIds.has(c.id)
            ? { qty: 0, saving: false, saved: true, savedShift: shift }
            : { qty: 0, saving: false, saved: false };
        });
        return next;
      });
    } catch (e) {
      console.log("fetch error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, shift]);

  useEffect(() => { fetchAll(); }, []);

  // ── Filter cows by search ──
  const filteredCows = searchQuery.trim()
    ? cows.filter((c) =>
        c.tag.toLowerCase().includes(searchQuery.trim().toLowerCase()),
      )
    : cows;

  const shiftEntries = todayEntries.filter((e) => e.shift === shift);
  const savedTotal = shiftEntries.reduce((s, e) => s + e.quantity, 0);
  const pendingTotal = cows.reduce((s, c) => {
    const d = get(c.id);
    return s + (d.saved ? 0 : d.qty);
  }, 0);
  const totalMilk = savedTotal + pendingTotal;

  useEffect(() => { onTotalChange?.(totalMilk); }, [totalMilk]);

  const doneCount = cows.filter((c) => get(c.id).saved).length;

  // ── Save ──
  const handleSave = async (cow: Cow) => {
    const d = get(cow.id);
    if (d.qty === 0 || d.saving || !token) return;
    patch(cow.id, { saving: true });
    try {
      const entry = await api.workerAddMilk({
        cow_id: cow.id,
        cow_name: cow.name,
        cow_tag: cow.tag,
        quantity: d.qty,
        shift,
        date: todayStr(),
      });
      setTodayEntries((prev) => [...prev, entry]);
      patch(cow.id, { saved: true, qty: 0, saving: false, savedShift: shift });
    } catch (err: any) {
      patch(cow.id, { saving: false });
      showAlert(
        "Could Not Save",
        err?.message ?? "Something went wrong while saving the milk entry. Please try again.",
        "water-outline",
        "#ef4444",
        "#fee2e2",
      );
    }
  };

  // ── Undo: open confirm modal ──
  const handleUndoPress = (cow: Cow) => {
    const entry = todayEntries.find(
      (e) => e.cow_id === cow.id && e.shift === shift,
    );
    if (!entry) return;
    setUndoTarget({
      entryId: entry.id,
      cowId: cow.id,
      cowName: cow.name,
      cowTag: cow.tag,
      quantity: entry.quantity,
    });
  };

  // ── Undo: confirmed ──
  const handleUndoConfirm = async () => {
    if (!undoTarget) return;
    setUndoing(true);
    try {
      await api.workerDeleteMilkEntry(undoTarget.entryId);
      // Remove from local entries list
      setTodayEntries((prev) =>
        prev.filter((e) => e.id !== undoTarget.entryId),
      );
      // Reset cow card back to input state
      patch(undoTarget.cowId, {
        saved: false,
        savedShift: undefined,
        qty: 0,
        saving: false,
      });
      setUndoTarget(null);
    } catch (err: any) {
      setUndoTarget(null);
      showAlert(
        "Undo Failed",
        err?.message ?? "Could not remove the entry. You can only undo today's logs.",
        "arrow-undo-outline",
        "#ef4444",
        "#fee2e2",
      );
    } finally {
      setUndoing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); fetchAll(); };

  const accentColor = isMorning ? "#d97706" : "#4f46e5";
  const accentBg = isMorning ? "#fffbeb" : "#eef2ff";
  const accentLight = isMorning ? "#fef3c7" : "#e0e7ff";

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color="#16a34a" />
        <Text style={s.loadingText}>{t("loadingCows")}</Text>
      </View>
    );
  }

  return (
    <>
      <ModernAlert config={alertConfig} onClose={hideAlert} />

      {/* Undo Confirmation Modal */}
      <UndoConfirmModal
        visible={!!undoTarget}
        cowName={undoTarget?.cowName ?? ""}
        cowTag={undoTarget?.cowTag ?? ""}
        quantity={undoTarget?.quantity ?? 0}
        onConfirm={handleUndoConfirm}
        onCancel={() => setUndoTarget(null)}
        loading={undoing}
        accentColor={accentColor}
      />

      <ScrollView
        style={s.container}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />
        }
      >
        {/* ── Shift Banner ── */}
        <LinearGradient
          colors={isMorning ? ["#fffbeb", "#fef3c7"] : ["#eef2ff", "#e0e7ff"]}
          style={[s.shiftBanner, { borderColor: isMorning ? "#f59e0b40" : "#6366f140" }]}
        >
          <View style={s.shiftLeft}>
            <View style={[s.shiftIconBox, { backgroundColor: accentLight }]}>
              <Ionicons name={isMorning ? "sunny" : "moon"} size={22} color={accentColor} />
            </View>
            <View>
              <Text style={[s.shiftTitle, { color: accentColor }]}>
                {isMorning ? t("morningShift") : t("eveningShift")}
              </Text>
              <Text style={s.shiftDate}>{todayStr()}</Text>
            </View>
          </View>
          <View style={s.shiftRight}>
            <Text style={[s.totalNum, { color: accentColor }]}>
              {totalMilk.toFixed(1)}
              <Text style={s.totalUnit}> L</Text>
            </Text>
            <Text style={s.totalLbl}>{t("todayTotal")}</Text>
          </View>
        </LinearGradient>

        {/* ── Shift Status Strip ── */}
        {shiftStatus && (
          <View style={s.statusStrip}>
            {[
              {
                done: shiftStatus.morning_done,
                count: shiftStatus.morning_count,
                label: t("morning"),
                doneColor: "#16a34a",
                doneBg: "#f0fdf4",
                doneBorder: "#16a34a40",
              },
              {
                done: shiftStatus.evening_done,
                count: shiftStatus.evening_count,
                label: t("evening"),
                doneColor: "#6366f1",
                doneBg: "#eef2ff",
                doneBorder: "#6366f140",
              },
            ].map((item) => (
              <View
                key={item.label}
                style={[
                  s.statusChip,
                  {
                    backgroundColor: item.done ? item.doneBg : "#f9fafb",
                    borderColor: item.done ? item.doneBorder : "#e5e7eb",
                  },
                ]}
              >
                <Ionicons
                  name={item.done ? "checkmark-circle" : "ellipse-outline"}
                  size={14}
                  color={item.done ? item.doneColor : "#9ca3af"}
                />
                <Text style={[s.statusText, { color: item.done ? item.doneColor : "#9ca3af" }]}>
                  {item.label} {item.done ? `✓ ${item.count}` : "—"}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Progress Bar ── */}
        <View style={s.progressRow}>
          <Text style={s.progressTxt}>
            {doneCount}/{cows.length} {t("cowsLogged")}
          </Text>
          <Text style={s.progressPct}>
            {cows.length > 0 ? Math.round((doneCount / cows.length) * 100) : 0}%
          </Text>
        </View>
        <View style={s.progressBg}>
          <View
            style={[
              s.progressFill,
              {
                width: `${cows.length > 0 ? (doneCount / cows.length) * 100 : 0}%` as any,
                backgroundColor: accentColor,
              },
            ]}
          />
        </View>

        {/* ── Search Bar ── */}
        {cows.length > 0 && (
          <View style={s.searchSection}>
            <CowSearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              onClear={() => setSearchQuery("")}
              resultCount={filteredCows.length}
              totalCount={cows.length}
              accentColor={accentColor}
            />
          </View>
        )}

        {/* ── All Done Banner ── */}
        {!searchQuery && doneCount === cows.length && cows.length > 0 && (
          <View style={[s.allDoneBanner, { backgroundColor: accentBg, borderColor: accentColor + "40" }]}>
            <Text style={s.allDoneEmoji}>{isMorning ? "☀️" : "🌙"}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.allDoneTitle, { color: accentColor }]}>
                {isMorning ? t("morningComplete") : t("eveningComplete")}
              </Text>
              <Text style={s.allDoneSub}>
                {isMorning ? t("morningDoneSub") : t("eveningDoneSub")}
              </Text>
            </View>
          </View>
        )}

        {/* ── Empty State (no cows) ── */}
        {cows.length === 0 && !loading && (
          <View style={s.emptyWrap}>
            <MaterialCommunityIcons name="cow-off" size={48} color="#d1d5db" />
            <Text style={s.emptyTitle}>{t("noCowsTitle")}</Text>
            <Text style={s.emptySub}>{t("noCowsSub")}</Text>
          </View>
        )}

        {/* ── Empty Search Result ── */}
        {searchQuery.trim().length > 0 && filteredCows.length === 0 && (
          <View style={s.emptyWrap}>
            <View style={s.emptySearchIcon}>
              <Ionicons name="search-outline" size={32} color="#9ca3af" />
            </View>
            <Text style={s.emptyTitle}>Tag not found</Text>
            <Text style={s.emptySub}>
              No cow with tag containing "{searchQuery}" is assigned to you for milking.
            </Text>
            <TouchableOpacity
              style={[s.clearSearchBtn, { borderColor: accentColor }]}
              onPress={() => setSearchQuery("")}
              activeOpacity={0.7}
            >
              <Text style={[s.clearSearchBtnText, { color: accentColor }]}>Clear Search</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Search result heading ── */}
        {searchQuery.trim().length > 0 && filteredCows.length > 0 && (
          <View style={s.searchResultHeader}>
            <Text style={[s.searchResultHeading, { color: accentColor }]}>
              Results for "{searchQuery}"
            </Text>
            <TouchableOpacity onPress={() => setSearchQuery("")} activeOpacity={0.7}>
              <Text style={s.searchResultClear}>Show all</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Cow Cards ── */}
        {filteredCows.map((cow) => {
          const d = get(cow.id);
          const savedEntry = todayEntries.find(
            (e) => e.cow_id === cow.id && e.shift === shift,
          );

          return (
            <View
              key={cow.id}
              style={[
                s.card,
                d.saved && { borderColor: "#16a34a40", backgroundColor: "#f0fdf4" },
              ]}
            >
              <View style={s.cardTop}>
                <View style={[s.cowAvatar, { backgroundColor: d.saved ? "#dcfce7" : "#f3f4f6" }]}>
                  <MaterialCommunityIcons
                    name="cow"
                    size={22}
                    color={d.saved ? "#16a34a" : "#6b7280"}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.cowName}>{cow.name}</Text>
                  <Text style={s.cowTag}>
                    #{cow.tag}{cow.breed ? ` · ${cow.breed}` : ""}
                  </Text>
                </View>

                {/* Tag badge during search */}
                {searchQuery.trim().length > 0 && (
                  <View style={[s.tagBadge, { backgroundColor: accentColor + "14", borderColor: accentColor + "30" }]}>
                    <Text style={[s.tagBadgeText, { color: accentColor }]}>#{cow.tag}</Text>
                  </View>
                )}

                {d.saved && (
                  <View style={s.savedBadge}>
                    <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
                    <Text style={s.savedBadgeText}>{t("done")}</Text>
                  </View>
                )}
              </View>

              {/* ── Saved: quantity row + undo button ── */}
              {d.saved && savedEntry && (
                <View style={s.savedFooter}>
                  <View style={s.savedRow}>
                    <Ionicons name="water" size={13} color="#16a34a" />
                    <Text style={s.savedQtyText}>
                      {savedEntry.quantity.toFixed(1)} L {t("recordedThisShift")}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={s.undoBtn}
                    onPress={() => handleUndoPress(cow)}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="arrow-undo" size={13} color="#ef4444" />
                    <Text style={s.undoBtnText}>Undo</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* ── Input controls ── */}
              {!d.saved && (
                <View style={s.controls}>
                  <TouchableOpacity
                    style={s.stepBtn}
                    onPress={() =>
                      patch(cow.id, { qty: Math.max(0, Math.round((d.qty - 0.5) * 10) / 10) })
                    }
                    disabled={d.saving}
                  >
                    <Ionicons name="remove" size={20} color="#374151" />
                  </TouchableOpacity>

                  <QtyInput
                    qty={d.qty}
                    disabled={d.saving}
                    onChange={(v) => patch(cow.id, { qty: v })}
                  />

                  <TouchableOpacity
                    style={s.stepBtn}
                    onPress={() =>
                      patch(cow.id, { qty: Math.round((d.qty + 0.5) * 10) / 10 })
                    }
                    disabled={d.saving}
                  >
                    <Ionicons name="add" size={20} color="#374151" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      s.saveBtn,
                      {
                        backgroundColor: d.qty > 0 ? accentColor : "#f3f4f6",
                        borderColor: d.qty > 0 ? accentColor : "#e5e7eb",
                      },
                    ]}
                    onPress={() => handleSave(cow)}
                    disabled={d.saving || d.qty === 0}
                  >
                    {d.saving ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={[s.saveBtnText, { color: d.qty > 0 ? "#fff" : "#9ca3af" }]}>
                        {t("save")}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function MilkScreen(props: {
  token?: string;
  cows?: any[];
  onTotalChange?: (total: number) => void;
}) {
  return <MilkScreenInner {...props} />;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  content: { padding: 16 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { color: "#6b7280", fontSize: 14 },

  shiftBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    marginBottom: 14,
  },
  shiftLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  shiftIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  shiftTitle: { fontSize: 16, fontWeight: "900" },
  shiftDate: { fontSize: 12, color: "#9ca3af", marginTop: 2 },
  shiftRight: { alignItems: "flex-end" },
  totalNum: { fontSize: 28, fontWeight: "900" },
  totalUnit: { fontSize: 16, fontWeight: "700" },
  totalLbl: { fontSize: 11, color: "#9ca3af", marginTop: 2 },

  statusStrip: { flexDirection: "row", gap: 10, marginBottom: 16 },
  statusChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusText: { fontSize: 12, fontWeight: "700" },

  progressRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  progressTxt: { fontSize: 12, color: "#6b7280", fontWeight: "600" },
  progressPct: { fontSize: 12, fontWeight: "800", color: "#374151" },
  progressBg: { height: 6, backgroundColor: "#f3f4f6", borderRadius: 4, marginBottom: 16 },
  progressFill: { height: 6, borderRadius: 4 },

  searchSection: { marginBottom: 16 },
  searchResultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  searchResultHeading: { fontSize: 13, fontWeight: "800" },
  searchResultClear: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6b7280",
    textDecorationLine: "underline",
  },

  allDoneBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  allDoneEmoji: { fontSize: 28 },
  allDoneTitle: { fontSize: 14, fontWeight: "800", marginBottom: 2 },
  allDoneSub: { fontSize: 12, color: "#6b7280" },

  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: 10,
  },
  emptySearchIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: "#6b7280" },
  emptySub: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center",
    paddingHorizontal: 32,
  },
  clearSearchBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  clearSearchBtnText: { fontSize: 13, fontWeight: "800" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#f3f4f6",
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  cowAvatar: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cowName: { fontSize: 16, fontWeight: "800", color: "#111827" },
  cowTag: { fontSize: 12, color: "#9ca3af", marginTop: 2 },
  tagBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 4,
  },
  tagBadgeText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.3 },
  savedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#dcfce7",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  savedBadgeText: { fontSize: 12, fontWeight: "700", color: "#16a34a" },

  // ── Saved footer: quantity + undo side by side ──
  savedFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 2,
    paddingBottom: 2,
  },
  savedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  savedQtyText: { fontSize: 12, color: "#16a34a", fontWeight: "600" },
  undoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fca5a5",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  undoBtnText: { fontSize: 12, fontWeight: "800", color: "#ef4444" },

  controls: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f9fafb",
  },
  qtyWrap: { flex: 1, alignItems: "center" },
  qtyNum: { fontSize: 26, fontWeight: "900", color: "#111827" },
  qtyInput: {
    fontSize: 24,
    fontWeight: "900",
    color: "#16a34a",
    textAlign: "center",
    borderBottomWidth: 2,
    borderBottomColor: "#16a34a",
    minWidth: 60,
  },
  qtyHint: { fontSize: 11, color: "#9ca3af", fontWeight: "600", marginTop: 2 },
  saveBtn: {
    paddingHorizontal: 18,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 72,
  },
  saveBtnText: { fontSize: 14, fontWeight: "800" },
});