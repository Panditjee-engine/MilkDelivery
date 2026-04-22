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

// ─── Helpers 

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function getCurrentShift(): "morning" | "evening" {
  return new Date().getHours() < 12 ? "morning" : "evening";
}

// ─── Types 

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

// ─── Modern Alert 

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
          {/* Icon */}
          <View
            style={[
              al.iconWrap,
              { backgroundColor: config.iconBg ?? "#fee2e2" },
            ]}
          >
            <Ionicons
              name={(config.icon ?? "alert-circle-outline") as any}
              size={28}
              color={config.iconColor ?? "#ef4444"}
            />
          </View>

          <Text style={al.title}>{config.title}</Text>
          <Text style={al.message}>{config.message}</Text>

          <TouchableOpacity
            style={al.btn}
            onPress={onClose}
            activeOpacity={0.85}
          >
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
  btnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#fff",
  },
});

// ─── Qty Input 

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

// ─── Main Screen 

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

  const [cowData, setCowData] = useState<
    Record<
      string,
      { qty: number; saving: boolean; saved: boolean; savedShift?: string }
    >
  >({});

  const {
    config: alertConfig,
    show: showAlert,
    hide: hideAlert,
  } = useModernAlert();

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

  useEffect(() => {
    fetchAll();
  }, []);

  const shiftEntries = todayEntries.filter((e) => e.shift === shift);
  const savedTotal = shiftEntries.reduce((s, e) => s + e.quantity, 0);
  const pendingTotal = cows.reduce((s, c) => {
    const d = get(c.id);
    return s + (d.saved ? 0 : d.qty);
  }, 0);
  const totalMilk = savedTotal + pendingTotal;

  useEffect(() => {
    onTotalChange?.(totalMilk);
  }, [totalMilk]);

  const doneCount = cows.filter((c) => get(c.id).saved).length;

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
        err?.message ??
          "Something went wrong while saving the milk entry. Please try again.",
        "water-outline",
        "#ef4444",
        "#fee2e2",
      );
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAll();
  };

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

      <ScrollView
        style={s.container}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#16a34a"
          />
        }
      >
        {/* ── Shift Banner ── */}
        <LinearGradient
          colors={isMorning ? ["#fffbeb", "#fef3c7"] : ["#eef2ff", "#e0e7ff"]}
          style={[
            s.shiftBanner,
            { borderColor: isMorning ? "#f59e0b40" : "#6366f140" },
          ]}
        >
          <View style={s.shiftLeft}>
            <View style={[s.shiftIconBox, { backgroundColor: accentLight }]}>
              <Ionicons
                name={isMorning ? "sunny" : "moon"}
                size={22}
                color={accentColor}
              />
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
            <View
              style={[
                s.statusChip,
                {
                  backgroundColor: shiftStatus.morning_done
                    ? "#f0fdf4"
                    : "#f9fafb",
                  borderColor: shiftStatus.morning_done
                    ? "#16a34a40"
                    : "#e5e7eb",
                },
              ]}
            >
              <Ionicons
                name={
                  shiftStatus.morning_done
                    ? "checkmark-circle"
                    : "ellipse-outline"
                }
                size={14}
                color={shiftStatus.morning_done ? "#16a34a" : "#9ca3af"}
              />
              <Text
                style={[
                  s.statusText,
                  { color: shiftStatus.morning_done ? "#16a34a" : "#9ca3af" },
                ]}
              >
                {t("morning")}{" "}
                {shiftStatus.morning_done
                  ? `✓ ${shiftStatus.morning_count}`
                  : "—"}
              </Text>
            </View>

            <View
              style={[
                s.statusChip,
                {
                  backgroundColor: shiftStatus.evening_done
                    ? "#eef2ff"
                    : "#f9fafb",
                  borderColor: shiftStatus.evening_done
                    ? "#6366f140"
                    : "#e5e7eb",
                },
              ]}
            >
              <Ionicons
                name={
                  shiftStatus.evening_done
                    ? "checkmark-circle"
                    : "ellipse-outline"
                }
                size={14}
                color={shiftStatus.evening_done ? "#6366f1" : "#9ca3af"}
              />
              <Text
                style={[
                  s.statusText,
                  { color: shiftStatus.evening_done ? "#6366f1" : "#9ca3af" },
                ]}
              >
                {t("evening")}{" "}
                {shiftStatus.evening_done
                  ? `✓ ${shiftStatus.evening_count}`
                  : "—"}
              </Text>
            </View>
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
                width:
                  `${cows.length > 0 ? (doneCount / cows.length) * 100 : 0}%` as any,
                backgroundColor: accentColor,
              },
            ]}
          />
        </View>

        {/* ── All Done Banner ── */}
        {doneCount === cows.length && cows.length > 0 && (
          <View
            style={[
              s.allDoneBanner,
              { backgroundColor: accentBg, borderColor: accentColor + "40" },
            ]}
          >
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

        {/* ── Empty State ── */}
        {cows.length === 0 && !loading && (
          <View style={s.emptyWrap}>
            <MaterialCommunityIcons name="cow-off" size={48} color="#d1d5db" />
            <Text style={s.emptyTitle}>{t("noCowsTitle")}</Text>
            <Text style={s.emptySub}>{t("noCowsSub")}</Text>
          </View>
        )}

        {/* ── Cow Cards ── */}
        {cows.map((cow) => {
          const d = get(cow.id);

          return (
            <View
              key={cow.id}
              style={[
                s.card,
                d.saved && {
                  borderColor: "#16a34a40",
                  backgroundColor: "#f0fdf4",
                },
              ]}
            >
              <View style={s.cardTop}>
                <View
                  style={[
                    s.cowAvatar,
                    { backgroundColor: d.saved ? "#dcfce7" : "#f3f4f6" },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="cow"
                    size={22}
                    color={d.saved ? "#16a34a" : "#6b7280"}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.cowName}>{cow.name}</Text>
                  <Text style={s.cowTag}>
                    #{cow.tag}
                    {cow.breed ? ` · ${cow.breed}` : ""}
                  </Text>
                </View>

                {d.saved && (
                  <View style={s.savedBadge}>
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color="#16a34a"
                    />
                    <Text style={s.savedBadgeText}>{t("done")}</Text>
                  </View>
                )}
              </View>

              {/* Saved quantity row */}
              {d.saved &&
                (() => {
                  const entry = todayEntries.find(
                    (e) => e.cow_id === cow.id && e.shift === shift,
                  );
                  return entry ? (
                    <View style={s.savedRow}>
                      <Ionicons name="water" size={13} color="#16a34a" />
                      <Text style={s.savedQtyText}>
                        {entry.quantity.toFixed(1)} {t("recordedThisShift")}
                      </Text>
                    </View>
                  ) : null;
                })()}

              {/* Input controls */}
              {!d.saved && (
                <View style={s.controls}>
                  <TouchableOpacity
                    style={s.stepBtn}
                    onPress={() =>
                      patch(cow.id, {
                        qty: Math.max(0, Math.round((d.qty - 0.5) * 10) / 10),
                      })
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
                      patch(cow.id, {
                        qty: Math.round((d.qty + 0.5) * 10) / 10,
                      })
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
                      <Text
                        style={[
                          s.saveBtnText,
                          { color: d.qty > 0 ? "#fff" : "#9ca3af" },
                        ]}
                      >
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

// ─── Export 

export default function MilkScreen(props: {
  token?: string;
  cows?: any[];
  onTotalChange?: (total: number) => void;
}) {
  return <MilkScreenInner {...props} />;
}

// ─── Styles 

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  content: { padding: 16 },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
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

  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  progressTxt: { fontSize: 12, color: "#6b7280", fontWeight: "600" },
  progressPct: { fontSize: 12, fontWeight: "800", color: "#374151" },
  progressBg: {
    height: 6,
    backgroundColor: "#f3f4f6",
    borderRadius: 4,
    marginBottom: 16,
  },
  progressFill: { height: 6, borderRadius: 4 },

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
    paddingVertical: 60,
    gap: 10,
  },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: "#6b7280" },
  emptySub: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center",
    paddingHorizontal: 32,
  },

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
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  cowAvatar: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cowName: { fontSize: 16, fontWeight: "800", color: "#111827" },
  cowTag: { fontSize: 12, color: "#9ca3af", marginTop: 2 },
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
  savedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 2,
    paddingBottom: 4,
  },
  savedQtyText: { fontSize: 12, color: "#16a34a", fontWeight: "600" },

  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
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
