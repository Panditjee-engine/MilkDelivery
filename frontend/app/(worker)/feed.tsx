import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Animated,
  Dimensions,
} from "react-native";
import {
  MaterialCommunityIcons,
  Ionicons,
  FontAwesome5,
} from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../../src/contexts/AuthContext";
import { useLang } from "../../src/contexts/LanguageContext";
import { api } from "../../src/services/api";

// Types

interface Cow {
  id: string;
  name: string;
  tag_id?: string;
  tag?: string;
  isActive?: boolean;
  isSold?: boolean;
}

interface FeedItem {
  feed_type: string;
  quantity_kg: number;
}

interface FeedState {
  done: boolean;
  loading: boolean;
  feeds: FeedItem[];
}

interface FeedEntry {
  cow_id: string;
  fed_at: string | null;
  feeds?: FeedItem[];
  feed_type?: string;
  quantity_kg?: number;
}

// Custom Alert Modal

interface AlertButton {
  text: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void;
}

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message?: string;
  buttons: AlertButton[];
  onDismiss: () => void;
  icon?: React.ReactNode;
}

function CustomAlert({
  visible,
  title,
  message,
  buttons,
  onDismiss,
  icon,
}: CustomAlertProps) {
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 200,
          friction: 12,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <Animated.View style={[al.overlay, { opacity: opacityAnim }]}>
        <Animated.View
          style={[al.sheet, { transform: [{ scale: scaleAnim }] }]}
        >
          {/* Icon area */}
          {icon && <View style={al.iconWrap}>{icon}</View>}

          {/* Title */}
          <Text style={al.title}>{title}</Text>

          {/* Message */}
          {message ? <Text style={al.message}>{message}</Text> : null}

          {/* Divider */}
          <View style={al.divider} />

          {/* Buttons */}
          <View
            style={[
              al.btnRow,
              buttons.length > 2 && { flexDirection: "column" },
            ]}
          >
            {buttons.map((btn, i) => {
              const isCancel = btn.style === "cancel";
              const isDestructive = btn.style === "destructive";
              const isPrimary = !isCancel && !isDestructive;

              return (
                <TouchableOpacity
                  key={i}
                  activeOpacity={0.75}
                  style={[
                    al.btn,
                    buttons.length === 2 && i === 0 && { marginRight: 8 },
                    buttons.length > 2 && { marginBottom: 8 },
                    isCancel && al.btnCancel,
                    isPrimary && al.btnPrimary,
                    isDestructive && al.btnDestructive,
                  ]}
                  onPress={() => {
                    btn.onPress?.();
                    onDismiss();
                  }}
                >
                  {isPrimary ? (
                    <LinearGradient
                      colors={["#f5c842", "#ca8a04"]}
                      style={al.btnGrad}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <Text style={al.btnTextPrimary}>{btn.text}</Text>
                    </LinearGradient>
                  ) : isDestructive ? (
                    <LinearGradient
                      colors={["#ef4444", "#b91c1c"]}
                      style={al.btnGrad}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <Text style={al.btnTextPrimary}>{btn.text}</Text>
                    </LinearGradient>
                  ) : (
                    <Text style={al.btnTextCancel}>{btn.text}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const al = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  sheet: {
    width: "100%",
    backgroundColor: "#1a1a0e",
    borderRadius: 24,
    paddingTop: 28,
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(245,200,66,0.18)",
    maxWidth: 360,
  },
  iconWrap: {
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#f5f0d8",
    textAlign: "center",
    letterSpacing: 0.2,
    marginBottom: 10,
  },
  message: {
    fontSize: 14,
    color: "#888878",
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 4,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(245,200,66,0.12)",
    marginVertical: 18,
  },
  btnRow: {
    flexDirection: "row",
  },
  btn: {
    flex: 1,
    borderRadius: 14,
    overflow: "hidden",
    minHeight: 48,
  },
  btnGrad: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    borderRadius: 14,
  },
  btnCancel: {
    backgroundColor: "#262614",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimary: {},
  btnDestructive: {},
  btnTextPrimary: {
    fontSize: 15,
    fontWeight: "900",
    color: "#1a1a0a",
    letterSpacing: 0.2,
  },
  btnTextCancel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#888",
  },
});

// Helpers

function getCurrentShift(): "morning" | "evening" {
  const hour = new Date().getHours();
  return hour >= 2 && hour < 14 ? "morning" : "evening";
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function formatDate(str: string) {
  const d = new Date(str);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Main Screen

export default function FeedScreen({
  onFedCountChange,
}: {
  onFedCountChange?: (done: number, total: number) => void;
}) {
  const { workerToken } = useAuth();
  const { t } = useLang();
  const token = workerToken ?? "";
  const shift = getCurrentShift();

  const [cows, setCows] = useState<Cow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedStatus, setFeedStatus] = useState<Record<string, FeedState>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  // ── Custom alert state ──
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    title: string;
    message?: string;
    buttons: AlertButton[];
    icon?: React.ReactNode;
  }>({ title: "", buttons: [] });

  const showAlert = (
    title: string,
    message?: string,
    buttons: AlertButton[] = [{ text: "OK" }],
    icon?: React.ReactNode,
  ) => {
    setAlertConfig({ title, message, buttons, icon });
    setAlertVisible(true);
  };

  // ── Feed state helpers ──
  const get = (id: string): FeedState =>
    feedStatus[id] ?? { done: false, loading: false, feeds: [] };

  const patch = (id: string, p: Partial<FeedState>) =>
    setFeedStatus((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] ?? { done: false, loading: false, feeds: [] }),
        ...p,
      },
    }));

  // ── Parse feeds from log entry (handles all formats) ──
  const parseFeeds = (log: any): FeedItem[] => {
    if (log?.feeds?.length) return log.feeds;
    if (log?.feed_type)
      return [{ feed_type: log.feed_type, quantity_kg: log.quantity_kg ?? 0 }];
    return [];
  };

  // ── Fetch cows + feed status ──
  const fetchAll = useCallback(async () => {
    try {
      const [cowsData, statusData] = await Promise.all([
        api.workerGetCows(),
        api.workerGetFeedStatus(todayStr(), shift),
      ]);

      const activeCows: Cow[] = cowsData.filter(
        (c: Cow) => c.isActive !== false && !c.isSold,
      );
      setCows(activeCows);

      setFeedStatus(() => {
        const next: Record<string, FeedState> = {};
        activeCows.forEach((c) => {
          const log = statusData.find((e: FeedEntry) => e.cow_id === c.id);
          next[c.id] = {
            done: !!log?.fed_at,
            loading: false,
            feeds: parseFeeds(log),
          };
        });
        return next;
      });
    } catch (e) {
      console.log("feed fetch error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, shift]);

  useEffect(() => {
    fetchAll();
  }, []);

  const doneCount = cows.filter((c) => get(c.id).done).length;

  useEffect(() => {
    onFedCountChange?.(doneCount, cows.length);
  }, [doneCount, cows.length]);

  // ── Toggle single cow ──
  const handleToggle = async (cow: Cow) => {
    const d = get(cow.id);
    if (d.loading) return;
    patch(cow.id, { loading: true });
    try {
      if (!d.done) {
        await api.workerMarkFed({
          cow_id: cow.id,
          cow_name: cow.name,
          cow_tag: cow.tag_id ?? cow.tag ?? "",
          date: todayStr(),
          shift,
        });
        patch(cow.id, { done: true, loading: false, feeds: d.feeds });
      } else {
        await api.workerUnmarkFed(cow.id, todayStr(), shift);
        patch(cow.id, { done: false, loading: false, feeds: d.feeds });
      }
    } catch (e) {
      console.log("toggle feed error:", e);
      patch(cow.id, { loading: false });
    }
  };

  // ── Select mode ──
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const pendingCows = cows.filter((c) => !get(c.id).done);
  const allPendingSelected =
    pendingCows.length > 0 && pendingCows.every((c) => selectedIds.has(c.id));

  const handleSelectAll = () => {
    if (allPendingSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingCows.map((c) => c.id)));
    }
  };

  const handleEnterSelectMode = () => {
    setSelectMode(true);
    setSelectedIds(new Set(pendingCows.map((c) => c.id)));
  };

  const handleCancelSelect = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  // ── Bulk feed with custom alert ──
  const handleBulkFeed = () => {
    if (selectedIds.size === 0) return;
    const shiftLabel =
      shift === "morning"
        ? (t("morningShiftLabel") ?? "Morning")
        : (t("eveningShiftLabel") ?? "Evening");

    showAlert(
      t("markAsFed") ?? "Mark as Fed",
      `Mark ${selectedIds.size} cow${selectedIds.size > 1 ? "s" : ""} as fed for the ${shiftLabel} shift?`,
      [
        { text: t("cancel") ?? "Cancel", style: "cancel" },
        {
          text: t("yesMarkFed") ?? "Yes, Mark Fed",
          style: "default",
          onPress: async () => {
            setBulkLoading(true);
            const targets = cows.filter((c) => selectedIds.has(c.id));
            await Promise.all(
              targets.map(async (cow) => {
                try {
                  const d = get(cow.id);
                  patch(cow.id, { loading: true });
                  await api.workerMarkFed({
                    cow_id: cow.id,
                    cow_name: cow.name,
                    cow_tag: cow.tag_id ?? cow.tag ?? "",
                    date: todayStr(),
                    shift,
                  });
                  patch(cow.id, { done: true, loading: false, feeds: d.feeds });
                } catch {
                  patch(cow.id, { loading: false });
                }
              }),
            );
            setBulkLoading(false);
            setSelectMode(false);
            setSelectedIds(new Set());
          },
        },
      ],
      <LinearGradient
        colors={["#f5c842", "#ca8a04"]}
        style={{
          width: 60,
          height: 60,
          borderRadius: 18,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <FontAwesome5 name="check-double" size={26} color="#1a1a0a" />
      </LinearGradient>,
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAll();
  };

  // ── Progress ──
  const pct = cows.length > 0 ? doneCount / cows.length : 0;
  const progressColors: [string, string] =
    pct === 1
      ? ["#22d3a0", "#059669"]
      : pct > 0.5
        ? ["#f5c842", "#ca8a04"]
        : ["#fb923c", "#ea580c"];

  const sortedCows = [
    ...cows.filter((c) => !get(c.id).done),
    ...cows.filter((c) => get(c.id).done),
  ];

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color="#f5c842" />
        <Text style={{ color: "#888", marginTop: 10, fontSize: 14 }}>
          {t("loadingCows") ?? "Loading cows…"}
        </Text>
      </View>
    );
  }

  return (
    <>
      {/* ── Custom Alert ── */}
      <CustomAlert
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        icon={alertConfig.icon}
        onDismiss={() => setAlertVisible(false)}
      />

      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#f5c842"
          />
        }
      >
        {/* ── Banner ── */}
        <LinearGradient colors={["#ffffffb2", "#ffffff00"]} style={s.banner}>
          <View style={s.bannerTop}>
            <View style={s.bannerLeft}>
              <LinearGradient
                colors={["#f5c842", "#ca8a04"]}
                style={s.feedIconBox}
              >
                <FontAwesome5 name="seedling" size={20} color="#fff" />
              </LinearGradient>
              <View>
                <Text style={s.bannerDate}>{formatDate(todayStr())}</Text>
                <Text style={s.bannerShift}>
                  {shift === "morning" ? "🌅" : "🌙"}{" "}
                  {shift === "morning"
                    ? (t("morningShiftLabel") ?? "Morning Shift")
                    : (t("eveningShiftLabel") ?? "Evening Shift")}
                </Text>
              </View>
            </View>
            <View style={s.countBox}>
              <Text style={s.countBig}>{doneCount}</Text>
              <Text style={s.countSmall}>/{cows.length}</Text>
            </View>
          </View>
          <View style={s.progressBg}>
            <LinearGradient
              colors={progressColors}
              style={[
                s.progressFill,
                { width: `${Math.max(pct * 100, 2)}%` as any },
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          </View>
          <Text style={s.progressLabel}>
            {doneCount === cows.length && cows.length > 0
              ? (t("allCowsFed") ?? "All cows fed!")
              : `${cows.length - doneCount} ${t("cowsRemaining") ?? "remaining"}`}
          </Text>
        </LinearGradient>

        {/* ── Stats Row ── */}
        <View style={s.statsRow}>
          {[
            {
              icon: "checkmark-circle",
              label: t("fed") ?? "Fed",
              val: doneCount,
              color: "#22d3a0",
              lib: "ion",
            },
            {
              icon: "time-outline",
              label: t("pendingFeed") ?? "Pending",
              val: cows.length - doneCount,
              color: "#fb923c",
              lib: "ion",
            },
            {
              icon: "cow",
              label: t("activeCows") ?? "Total",
              val: cows.length,
              color: "#f5c842",
              lib: "mci",
            },
          ].map((st) => (
            <View key={st.label} style={s.statCard}>
              {st.lib === "mci" ? (
                <MaterialCommunityIcons
                  name={st.icon as any}
                  size={22}
                  color={st.color}
                />
              ) : (
                <Ionicons name={st.icon as any} size={22} color={st.color} />
              )}
              <Text style={[s.statVal, { color: st.color }]}>{st.val}</Text>
              <Text style={s.statLbl}>{st.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Bulk Feed Bar ── */}
        {pendingCows.length > 0 && (
          <View style={s.bulkBar}>
            {selectMode ? (
              <TouchableOpacity
                style={s.selectAllRow}
                onPress={handleSelectAll}
              >
                <View style={[s.checkbox, allPendingSelected && s.checkboxOn]}>
                  {allPendingSelected && (
                    <Ionicons name="checkmark" size={13} color="#1a1a0a" />
                  )}
                </View>
                <Text style={s.selectAllText}>
                  {allPendingSelected
                    ? (t("deselectAll") ?? "Deselect All")
                    : (t("selectAllPending") ?? "Select All Pending")}
                </Text>
                <Text style={s.selCount}>
                  {selectedIds.size}/{pendingCows.length}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={s.feedAllBtn}
                onPress={handleEnterSelectMode}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={["#f5c842", "#ca8a04"]}
                  style={s.feedAllGrad}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <FontAwesome5 name="check-double" size={15} color="#1a1a0a" />
                  <Text style={s.feedAllText}>
                    {t("feedAllCows") ?? "Feed All Cows"}
                  </Text>
                  <View style={s.feedAllBadge}>
                    <Text style={s.feedAllBadgeText}>{pendingCows.length}</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── PENDING section label ── */}
        {pendingCows.length > 0 && doneCount > 0 && (
          <View style={s.divider}>
            <View style={s.dividerLine} />
            <View
              style={[
                s.dividerBadge,
                {
                  backgroundColor: "rgba(251,146,60,0.12)",
                  borderColor: "rgba(251,146,60,0.35)",
                },
              ]}
            >
              <Ionicons name="time-outline" size={11} color="#fb923c" />
              <Text style={[s.dividerText, { color: "#fb923c" }]}>
                {(t("pendingFeed") ?? "PENDING").toUpperCase()} ·{" "}
                {pendingCows.length}
              </Text>
            </View>
            <View style={s.dividerLine} />
          </View>
        )}

        {/* ── Cow Cards ── */}
        {sortedCows.map((cow, index) => {
          const d = get(cow.id);
          const isSelected = selectedIds.has(cow.id);
          const seqNum = cows.indexOf(cow) + 1;
          const totalKg = d.feeds.reduce(
            (sum, f) => sum + (f.quantity_kg || 0),
            0,
          );
          const hasFeedDetails = d.feeds.length > 0;

          const prevCow = sortedCows[index - 1];
          const showFedLabel =
            d.done &&
            pendingCows.length > 0 &&
            doneCount > 0 &&
            (index === 0 || !get(prevCow?.id)?.done);

          return (
            <React.Fragment key={cow.id}>
              {showFedLabel && (
                <View style={s.divider}>
                  <View
                    style={[
                      s.dividerLine,
                      { backgroundColor: "rgba(34,211,160,0.2)" },
                    ]}
                  />
                  <View
                    style={[
                      s.dividerBadge,
                      {
                        backgroundColor: "rgba(34,211,160,0.12)",
                        borderColor: "rgba(34,211,160,0.35)",
                      },
                    ]}
                  >
                    <Ionicons
                      name="checkmark-circle"
                      size={11}
                      color="#22d3a0"
                    />
                    <Text style={[s.dividerText, { color: "#22d3a0" }]}>
                      {(t("fed") ?? "FED").toUpperCase()} · {doneCount}
                    </Text>
                  </View>
                  <View
                    style={[
                      s.dividerLine,
                      { backgroundColor: "rgba(34,211,160,0.2)" },
                    ]}
                  />
                </View>
              )}

              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => {
                  if (selectMode && !d.done) toggleSelect(cow.id);
                }}
                onLongPress={() => {
                  if (!d.done && !selectMode) {
                    setSelectMode(true);
                    setSelectedIds(new Set([cow.id]));
                  }
                }}
              >
                <View
                  style={[
                    s.card,
                    d.done ? s.cardDone : s.cardPending,
                    isSelected && selectMode && s.cardSelected,
                  ]}
                >
                  <View
                    style={[
                      s.accentBar,
                      {
                        backgroundColor: d.done ? "#22d3a0" : "#f5c842",
                        opacity: d.done ? 1 : isSelected ? 1 : 0.5,
                      },
                    ]}
                  />

                  <View style={s.cardBody}>
                    <View style={s.cardTopRow}>
                      {selectMode && !d.done && (
                        <TouchableOpacity
                          onPress={() => toggleSelect(cow.id)}
                          style={{ marginRight: 4 }}
                        >
                          <View
                            style={[
                              s.selectCircle,
                              isSelected && s.selectCircleOn,
                            ]}
                          >
                            {isSelected && (
                              <Ionicons
                                name="checkmark"
                                size={13}
                                color="#1a1a0a"
                              />
                            )}
                          </View>
                        </TouchableOpacity>
                      )}

                      <View style={[s.seqBadge, d.done && s.seqBadgeDone]}>
                        <Text style={[s.seqText, d.done && s.seqTextDone]}>
                          {seqNum}
                        </Text>
                      </View>

                      <LinearGradient
                        colors={
                          d.done
                            ? ["#22d3a0", "#059669"]
                            : isSelected
                              ? ["#f5c842", "#ca8a04"]
                              : ["#2e2e1a", "#242410"]
                        }
                        style={s.cowAvatar}
                      >
                        <MaterialCommunityIcons
                          name="cow"
                          size={24}
                          color={d.done || isSelected ? "#fff" : "#777"}
                        />
                      </LinearGradient>

                      <View style={s.cowInfo}>
                        <Text style={s.cowName} numberOfLines={1}>
                          {cow.name}
                        </Text>
                        <View style={s.tagRow}>
                          <MaterialCommunityIcons
                            name="tag-outline"
                            size={11}
                            color="#666"
                          />
                          <Text style={s.tagText}>
                            {cow.tag_id ?? cow.tag ?? t("noTag") ?? "No tag"}
                          </Text>
                        </View>
                        <View
                          style={[
                            s.statusBadge,
                            d.done ? s.badgeDone : s.badgePending,
                          ]}
                        >
                          <Ionicons
                            name={d.done ? "checkmark-circle" : "time-outline"}
                            size={11}
                            color={d.done ? "#22d3a0" : "#fb923c"}
                          />
                          <Text
                            style={[
                              s.statusText,
                              { color: d.done ? "#22d3a0" : "#fb923c" },
                            ]}
                          >
                            {d.done
                              ? (t("fedCheck") ?? "Fed ✓")
                              : (t("pendingFeed") ?? "Pending")}
                          </Text>
                        </View>
                      </View>

                      {!selectMode && (
                        <TouchableOpacity
                          style={[
                            s.toggleBtn,
                            d.done ? s.toggleDone : s.togglePending,
                          ]}
                          onPress={() => handleToggle(cow)}
                          disabled={d.loading}
                          activeOpacity={0.8}
                        >
                          {d.loading ? (
                            <ActivityIndicator
                              size="small"
                              color={d.done ? "#555" : "#1a1a0a"}
                            />
                          ) : (
                            <>
                              <FontAwesome5
                                name={d.done ? "undo" : "check"}
                                size={12}
                                color={d.done ? "#555" : "#1a1a0a"}
                              />
                              <Text
                                style={[
                                  s.toggleText,
                                  { color: d.done ? "#555" : "#1a1a0a" },
                                ]}
                              >
                                {d.done
                                  ? (t("undo") ?? "Undo")
                                  : (t("markAsFed") ?? "Mark Fed")}
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* ── Feed Schedule Section ── */}
                    {hasFeedDetails && (
                      <View style={s.feedSection}>
                        <View style={s.feedSectionHeader}>
                          <View style={s.feedHeaderIconWrap}>
                            <FontAwesome5
                              name="clipboard-list"
                              size={10}
                              color="#ca8a04"
                            />
                          </View>
                          <Text style={s.feedSectionLabel}>
                            {t("feedSchedule") ?? "Feed Schedule"}
                          </Text>
                          <View style={s.totalKgBadge}>
                            <FontAwesome5
                              name="weight-hanging"
                              size={9}
                              color="#f5c842"
                            />
                            <Text style={s.totalKgText}>
                              {totalKg.toFixed(1)} kg {t("total") ?? "total"}
                            </Text>
                          </View>
                        </View>

                        <View style={s.chipsWrap}>
                          {d.feeds.map((f, i) => (
                            <View key={i} style={s.feedChip}>
                              <View style={s.chipIconWrap}>
                                <FontAwesome5
                                  name="seedling"
                                  size={10}
                                  color="#f5c842"
                                />
                              </View>
                              <Text style={s.chipFeedType}>{f.feed_type}</Text>
                              <View style={s.chipQtyBadge}>
                                <Text style={s.chipQtyText}>
                                  {f.quantity_kg} kg
                                </Text>
                              </View>
                            </View>
                          ))}
                        </View>

                        {/* No feed scheduled notice */}
                      </View>
                    )}

                    {/* Show when no feed details set by admin */}
                    {!hasFeedDetails && (
                      <View style={s.noFeedNote}>
                        <Ionicons
                          name="information-circle-outline"
                          size={13}
                          color="#444"
                        />
                        <Text style={s.noFeedNoteText}>
                          No feed schedule set by admin
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            </React.Fragment>
          );
        })}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ── Sticky bottom bar ── */}
      {selectMode && (
        <View style={s.stickyBar}>
          <TouchableOpacity style={s.cancelBtn} onPress={handleCancelSelect}>
            <Ionicons name="close" size={18} color="#888" />
            <Text style={s.cancelText}>{t("cancel") ?? "Cancel"}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              s.confirmBtn,
              (selectedIds.size === 0 || bulkLoading) && { opacity: 0.5 },
            ]}
            onPress={handleBulkFeed}
            disabled={selectedIds.size === 0 || bulkLoading}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={
                selectedIds.size > 0
                  ? ["#f5c842", "#ca8a04"]
                  : ["#2a2a2a", "#222"]
              }
              style={s.confirmGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {bulkLoading ? (
                <ActivityIndicator size="small" color="#1a1a0a" />
              ) : (
                <>
                  <FontAwesome5
                    name="check-double"
                    size={15}
                    color={selectedIds.size > 0 ? "#1a1a0a" : "#555"}
                  />
                  <Text
                    style={[
                      s.confirmText,
                      { color: selectedIds.size > 0 ? "#1a1a0a" : "#555" },
                    ]}
                  >
                    {t("feed") ?? "Feed"} {selectedIds.size}{" "}
                    {t("cowsLabel") ?? "cows"}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
}

// Styles

const s = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: "#f3f3ee",
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
    backgroundColor: "#0e0e08",
  },
  banner: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(245,200,66,0.2)",
  },
  bannerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  bannerLeft: { flexDirection: "row", alignItems: "center", gap: 13 },
  feedIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  bannerDate: { fontSize: 12, color: "#888", fontWeight: "700" },
  bannerShift: {
    fontSize: 13,
    color: "#f5c842",
    fontWeight: "800",
    marginTop: 3,
  },
  countBox: { flexDirection: "row", alignItems: "baseline" },
  countBig: { fontSize: 38, fontWeight: "900", color: "#f5c842" },
  countSmall: { fontSize: 18, fontWeight: "700", color: "#444" },
  progressBg: {
    height: 7,
    backgroundColor: "rgb(255,255,255)",
    borderRadius: 4,
    marginBottom: 8,
    overflow: "hidden",
  },
  progressFill: { height: 7, borderRadius: 4 },
  progressLabel: { fontSize: 11, color: "#555", fontWeight: "700" },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  statCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: "#252512",
  },
  statVal: { fontSize: 20, fontWeight: "900" },
  statLbl: {
    fontSize: 10,
    color: "#555",
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  bulkBar: { marginBottom: 14 },
  feedAllBtn: { borderRadius: 14, overflow: "hidden" },
  feedAllGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 15,
    borderRadius: 14,
  },
  feedAllText: { fontSize: 15, fontWeight: "900", color: "#1a1a0a" },
  feedAllBadge: {
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 2,
  },
  feedAllBadgeText: { fontSize: 12, fontWeight: "900", color: "#1a1a0a" },
  selectAllRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#1a1a0a",
    borderWidth: 1,
    borderColor: "rgba(245,200,66,0.3)",
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#444",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxOn: { backgroundColor: "#f5c842", borderColor: "#f5c842" },
  selectAllText: { flex: 1, fontSize: 14, fontWeight: "700", color: "#ccc" },
  selCount: { fontSize: 13, fontWeight: "900", color: "#f5c842" },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
    marginTop: 2,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  dividerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  dividerText: { fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  card: {
    flexDirection: "row",
    borderRadius: 18,
    marginBottom: 10,
    overflow: "hidden",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  cardPending: { backgroundColor: "#ffffff", borderColor: "#2e2e1c" },
  cardDone: { backgroundColor: "#ffffff", borderColor: "#1c3028" },
  cardSelected: {
    borderColor: "rgba(245,200,66,0.6)",
    backgroundColor: "#ffffff",
  },
  accentBar: { width: 4 },
  cardBody: { flex: 1, padding: 14 },
  cardTopRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  seqBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#252514",
    borderWidth: 1,
    borderColor: "#353520",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  seqBadgeDone: {
    backgroundColor: "rgba(34,211,160,0.15)",
    borderColor: "rgba(34,211,160,0.3)",
  },
  seqText: { fontSize: 11, fontWeight: "900", color: "#666" },
  seqTextDone: { color: "#22d3a0" },
  selectCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#444",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  selectCircleOn: { backgroundColor: "#f5c842", borderColor: "#f5c842" },
  cowAvatar: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cowInfo: { flex: 1, gap: 4 },
  cowName: {
    fontSize: 16,
    fontWeight: "900",
    color: "#000000",
    letterSpacing: 0.3,
  },
  tagRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  tagText: { fontSize: 11, color: "#666", fontWeight: "600" },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 2,
  },
  badgePending: {
    backgroundColor: "rgba(179,173,173,0.1)",
    borderColor: "rgba(251,146,60,0.3)",
  },
  badgeDone: {
    backgroundColor: "rgba(34,211,160,0.1)",
    borderColor: "rgba(34,211,160,0.3)",
  },
  statusText: { fontSize: 11, fontWeight: "800" },
  toggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    flexShrink: 0,
  },
  togglePending: { backgroundColor: "#f5c842" },
  toggleDone: {
    backgroundColor: "#1e1e12",
    borderWidth: 1,
    borderColor: "#2e2e1e",
  },
  toggleText: { fontSize: 12, fontWeight: "900" },

  // ── Feed Section ──
  feedSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(245,200,66,0.1)",
    gap: 8,
  },
  feedSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  feedHeaderIconWrap: {
    width: 20,
    height: 20,
    borderRadius: 5,
    backgroundColor: "rgba(245,200,66,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  feedSectionLabel: {
    flex: 1,
    fontSize: 11,
    color: "#997a00",
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  totalKgBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(245,200,66,0.15)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "rgba(245,200,66,0.3)",
  },
  totalKgText: { fontSize: 10, color: "#f5c842", fontWeight: "900" },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  feedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#1e1e0a",
    borderWidth: 1,
    borderColor: "rgba(245,200,66,0.3)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipIconWrap: {
    width: 18,
    height: 18,
    borderRadius: 4,
    backgroundColor: "rgba(245,200,66,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  chipFeedType: { fontSize: 12, color: "#e8c84a", fontWeight: "700" },
  chipQtyBadge: {
    backgroundColor: "rgba(245,200,66,0.2)",
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  chipQtyText: { fontSize: 11, color: "#f5c842", fontWeight: "900" },

  // No feed note
  noFeedNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
  },
  noFeedNoteText: {
    fontSize: 11,
    color: "#3a3a2a",
    fontWeight: "600",
  },

  // ── Sticky bar ──
  stickyBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    paddingBottom: 30,
    backgroundColor: "#0e0e08",
    borderTopWidth: 1,
    borderTopColor: "#1c1c10",
  },
  cancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#252512",
    backgroundColor: "#181810",
  },
  cancelText: { fontSize: 14, fontWeight: "700", color: "#777" },
  confirmBtn: { flex: 1, borderRadius: 14, overflow: "hidden" },
  confirmGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
  },
  confirmText: { fontSize: 15, fontWeight: "900" },
});
