import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  RefreshControl,
  Dimensions,
  Animated,
  PanResponder,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { api } from "../../../src/services/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ─── Colour Palette
const C = {
  primary: "#FF9675",
  bg: "#F5F5F7",
  card: "#FFFFFF",
  text: "#111111",
  textMuted: "#6B6B6B",
  textLight: "#ABABAB",
  border: "#E8E8E8",
  green: "#16A34A",
  greenBg: "#F0FDF4",
  greenBorder: "#BBF7D0",
  blue: "#2563EB",
  blueBg: "#EFF6FF",
  blueBorder: "#BFDBFE",
  red: "#DC2626",
  redBg: "#FEF2F2",
  redBorder: "#FECACA",
  amber: "#D97706",
  amberBg: "#FFFBEB",
  amberBorder: "#FDE68A",
  purple: "#7C3AED",
};

// ─── Types
interface FeedSummary {
  total_cows: number;
  fed_count: number;
  unfed_count: number;
  shift?: string;
}
interface MilkSummary {
  total_morning: number;
  total_evening: number;
  grand_total: number;
  active_cows: number;
  total_cows: number;
}
interface HealthSummary {
  total: number;
  healthy: number;
  sick: number;
  under_observation: number;
}

const today = () => new Date().toISOString().split("T")[0];
const currentShift = (): "morning" | "evening" => {
  const h = new Date().getHours();
  return h < 14 ? "morning" : "evening";
};
const fmt = (n: number | null | undefined, decimals = 1) =>
  n == null ? "—" : Number(n).toFixed(decimals);

// ════════════════════════════════════════════════
// TABS CONFIG
// ════════════════════════════════════════════════

const TABS = [
  { key: "feed", label: "Feed", icon: "leaf" as const, color: C.green },
  { key: "milk", label: "Milk", icon: "water" as const, color: C.blue },
  { key: "health", label: "Health", icon: "heart" as const, color: C.red },
] as const;
type TabKey = typeof TABS[number]["key"];

// ════════════════════════════════════════════════
// TAB BAR
// ════════════════════════════════════════════════

function TabBar({ active, onChange }: { active: TabKey; onChange: (k: TabKey) => void }) {
  return (
    <View style={tabStyles.bar}>
      {TABS.map((t) => {
        const isActive = t.key === active;
        return (
          <TouchableOpacity
            key={t.key}
            style={[tabStyles.tab, isActive && { backgroundColor: t.color + "14", borderColor: t.color + "60" }]}
            onPress={() => onChange(t.key)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isActive ? t.icon : (`${t.icon}-outline` as any)}
              size={15}
              color={isActive ? t.color : C.textLight}
            />
            <Text style={[tabStyles.label, { color: isActive ? t.color : C.textLight, fontWeight: isActive ? "700" : "500" }]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const tabStyles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "transparent",
  },
  label: { fontSize: 12, letterSpacing: -0.1 },
});

// ════════════════════════════════════════════════
// SHARED COMPONENTS
// ════════════════════════════════════════════════

function SectionHeader({
  icon,
  title,
  subtitle,
  accentColor,
  route,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  subtitle: string;
  accentColor: string;
  route: string;
}) {
  const router = useRouter();
  return (
    <View style={sectionStyles.header}>
      <View style={[sectionStyles.iconWrap, { backgroundColor: accentColor + "18" }]}>
        <Ionicons name={icon} size={20} color={accentColor} />
      </View>
      <View style={sectionStyles.headerText}>
        <Text style={sectionStyles.title}>{title}</Text>
        <Text style={sectionStyles.subtitle}>{subtitle}</Text>
      </View>
      <TouchableOpacity
        style={[sectionStyles.openBtn, { borderColor: accentColor + "40", backgroundColor: accentColor + "0E" }]}
        onPress={() => router.push(route as any)}
        activeOpacity={0.7}
      >
        <Text style={[sectionStyles.openBtnText, { color: accentColor }]}>Open</Text>
        <Ionicons name="arrow-forward" size={11} color={accentColor} />
      </TouchableOpacity>
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 18 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: { flex: 1 },
  title: { fontSize: 16, fontWeight: "700", color: C.text, letterSpacing: -0.4 },
  subtitle: { fontSize: 11, color: C.textLight, fontWeight: "500", marginTop: 2 },
  openBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  openBtnText: { fontSize: 12, fontWeight: "600" },
});

function StatPill({
  label, value, color, bgColor, borderColor, icon,
}: {
  label: string; value: string | number; color: string; bgColor: string; borderColor: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
}) {
  return (
    <View style={[pillStyles.wrap, { backgroundColor: bgColor, borderColor }]}>
      <View style={[pillStyles.iconWrap, { backgroundColor: color + "18" }]}>
        <Ionicons name={icon} size={14} color={color} />
      </View>
      <View>
        <Text style={[pillStyles.value, { color }]}>{value}</Text>
        <Text style={pillStyles.label}>{label}</Text>
      </View>
    </View>
  );
}

const pillStyles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flex: 1,
  },
  iconWrap: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  value: { fontSize: 17, fontWeight: "700", letterSpacing: -0.5 },
  label: {
    fontSize: 9,
    fontWeight: "600",
    color: C.textLight,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginTop: 1,
  },
});

function ProgressBar({ value, total, color }: { value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.min((value / total) * 100, 100) : 0;
  return (
    <View style={{ marginTop: 14 }}>
      <View style={progressStyles.track}>
        <View style={[progressStyles.fill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const progressStyles = StyleSheet.create({
  track: { height: 6, backgroundColor: C.border, borderRadius: 6, overflow: "hidden" },
  fill: { height: 6, borderRadius: 6 },
});

function Card({ accentColor, children }: { accentColor: string; children: React.ReactNode }) {
  return (
    <View style={[cardStyles.card, { borderColor: accentColor + "28" }]}>
      {/* Top accent line */}
      <View style={[cardStyles.accentLine, { backgroundColor: accentColor }]} />
      <View style={cardStyles.content}>{children}</View>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: C.card,
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 4,
  },
  accentLine: { height: 3, width: "100%" },
  content: { padding: 20 },
});

function SkeletonCard() {
  return (
    <View style={[cardStyles.card, { borderColor: C.border }]}>
      <View style={{ height: 3, backgroundColor: C.border }} />
      <View style={{ padding: 20, gap: 12 }}>
        <View style={{ height: 44, backgroundColor: C.border, borderRadius: 12 }} />
        <View style={{ height: 66, backgroundColor: C.border, borderRadius: 12 }} />
        <View style={{ height: 6, backgroundColor: C.border, borderRadius: 6 }} />
      </View>
    </View>
  );
}

// ════════════════════════════════════════════════
// SECTION PANELS
// ════════════════════════════════════════════════

function FeedPanel({ loading, summary, date, shift }: {
  loading: boolean; summary: FeedSummary | null; date: string; shift: string;
}) {
  const pct = summary && summary.total_cows > 0
    ? Math.round(((summary.fed_count ?? 0) / summary.total_cows) * 100)
    : 0;

  return (
    <Card accentColor={C.green}>
      <SectionHeader
        icon="leaf"
        title="Feed Management"
        subtitle={`${shift === "morning" ? "Morning" : "Evening"} shift  ·  ${date}`}
        accentColor={C.green}
        route="/(admin)/gausevak/feed"
      />
      {loading ? (
        <View style={{ height: 66, backgroundColor: C.border, borderRadius: 12 }} />
      ) : summary ? (
        <>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <StatPill label="Fed" value={summary.fed_count ?? 0} color={C.green} bgColor={C.greenBg} borderColor={C.greenBorder} icon="checkmark-circle-outline" />
            <StatPill
              label="Pending"
              value={summary.unfed_count ?? 0}
              color={summary.unfed_count > 0 ? C.amber : C.textLight}
              bgColor={summary.unfed_count > 0 ? C.amberBg : C.bg}
              borderColor={summary.unfed_count > 0 ? C.amberBorder : C.border}
              icon="time-outline"
            />
            <StatPill label="Total" value={summary.total_cows ?? 0} color={C.textMuted} bgColor={C.bg} borderColor={C.border} icon="list-outline" />
          </View>
          <ProgressBar value={summary.fed_count ?? 0} total={summary.total_cows ?? 1} color={C.green} />
          <View style={styles.progressRow}>
            <View style={[styles.dot, { backgroundColor: C.green }]} />
            <Text style={styles.progressHint}>
              {summary.total_cows > 0 ? `${pct}% of herd fed` : "No cows registered"}
            </Text>
          </View>
        </>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="leaf-outline" size={28} color={C.border} />
          <Text style={styles.emptyText}>No feed data for today</Text>
        </View>
      )}
    </Card>
  );
}

function MilkPanel({ loading, summary, date }: {
  loading: boolean; summary: MilkSummary | null; date: string;
}) {
  return (
    <Card accentColor={C.blue}>
      <SectionHeader
        icon="water"
        title="Milk Yield"
        subtitle={`Today  ·  ${date}`}
        accentColor={C.blue}
        route="/(admin)/gausevak/milkyield"
      />
      {loading ? (
        <View style={{ height: 66, backgroundColor: C.border, borderRadius: 12 }} />
      ) : summary ? (
        <>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <StatPill label="Morning" value={`${fmt(summary.total_morning)} L`} color={C.blue} bgColor={C.blueBg} borderColor={C.blueBorder} icon="sunny-outline" />
            <StatPill label="Evening" value={`${fmt(summary.total_evening)} L`} color={C.amber} bgColor={C.amberBg} borderColor={C.amberBorder} icon="moon-outline" />
          </View>

          {/* Grand Total Row */}
          <View style={[styles.totalRow, { backgroundColor: C.blueBg, borderColor: C.blueBorder }]}>
            <Ionicons name="stats-chart" size={15} color={C.blue} />
            <Text style={[styles.totalLabel, { color: C.textMuted }]}>Grand Total Today</Text>
            <Text style={[styles.totalValue, { color: C.blue }]}>{fmt(summary.grand_total)} L</Text>
          </View>

          <ProgressBar value={summary.active_cows ?? 0} total={summary.total_cows ?? 1} color={C.blue} />
          <View style={styles.progressRow}>
            <View style={[styles.dot, { backgroundColor: C.blue }]} />
            <Text style={styles.progressHint}>
              {summary.active_cows ?? 0} of {summary.total_cows ?? 0} cows milked
            </Text>
          </View>
        </>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="water-outline" size={28} color={C.border} />
          <Text style={styles.emptyText}>No milk records for today</Text>
        </View>
      )}
    </Card>
  );
}

function HealthPanel({ loading, summary, date }: {
  loading: boolean; summary: HealthSummary | null; date: string;
}) {
  return (
    <Card accentColor={C.red}>
      <SectionHeader
        icon="heart"
        title="Herd Health"
        subtitle={`Today  ·  ${date}`}
        accentColor={C.red}
        route="/(admin)/gausevak/health"
      />
      {loading ? (
        <View style={{ height: 66, backgroundColor: C.border, borderRadius: 12 }} />
      ) : summary ? (
        <>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <StatPill label="Healthy" value={summary.healthy ?? 0} color={C.green} bgColor={C.greenBg} borderColor={C.greenBorder} icon="shield-checkmark-outline" />
            <StatPill
              label="Sick"
              value={summary.sick ?? 0}
              color={summary.sick > 0 ? C.red : C.textLight}
              bgColor={summary.sick > 0 ? C.redBg : C.bg}
              borderColor={summary.sick > 0 ? C.redBorder : C.border}
              icon="medical-outline"
            />
            <StatPill
              label="Watch"
              value={summary.under_observation ?? 0}
              color={summary.under_observation > 0 ? C.amber : C.textLight}
              bgColor={summary.under_observation > 0 ? C.amberBg : C.bg}
              borderColor={summary.under_observation > 0 ? C.amberBorder : C.border}
              icon="eye-outline"
            />
          </View>

          {(summary.sick > 0 || summary.under_observation > 0) && (
            <View style={[styles.alertBanner, { backgroundColor: C.redBg, borderColor: C.redBorder }]}>
              <Ionicons name="warning-outline" size={14} color={C.red} />
              <Text style={[styles.alertText, { color: C.red }]}>
                {summary.sick > 0
                  ? `${summary.sick} cow${summary.sick > 1 ? "s" : ""} need${summary.sick === 1 ? "s" : ""} immediate attention`
                  : `${summary.under_observation} under observation`}
              </Text>
            </View>
          )}

          <ProgressBar value={summary.healthy ?? 0} total={summary.total ?? 1} color={C.green} />
          <View style={styles.progressRow}>
            <View style={[styles.dot, { backgroundColor: C.green }]} />
            <Text style={styles.progressHint}>
              {summary.total > 0
                ? `${Math.round(((summary.healthy ?? 0) / summary.total) * 100)}% of herd healthy`
                : "No health logs today"}
            </Text>
          </View>
        </>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="heart-outline" size={28} color={C.border} />
          <Text style={styles.emptyText}>No health records for today</Text>
        </View>
      )}
    </Card>
  );
}

// ─── Parse health summary from API response
function parseHealthSummary(logs: any[]): HealthSummary {
  const summary: HealthSummary = { total: 0, healthy: 0, sick: 0, under_observation: 0 };
  if (!Array.isArray(logs)) return summary;
  logs.forEach((log) => {
    summary.total++;
    const s = (log.status ?? "").toLowerCase();
    if (s === "healthy" || s === "normal" || s === "good") summary.healthy++;
    else if (s === "sick" || s === "ill" || s === "critical") summary.sick++;
    else summary.under_observation++;
  });
  return summary;
}

// ════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════

export default function GausevakTabs() {
  const router = useRouter();
  const dateStr = today();
  const shift = currentShift();

  const [activeTab, setActiveTab] = useState<TabKey>("feed");
  const [feedLoading, setFeedLoading] = useState(true);
  const [milkLoading, setMilkLoading] = useState(true);
  const [healthLoading, setHealthLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [feedSummary, setFeedSummary] = useState<FeedSummary | null>(null);
  const [milkSummary, setMilkSummary] = useState<MilkSummary | null>(null);
  const [healthSummary, setHealthSummary] = useState<HealthSummary | null>(null);

  // ── Smooth swipe with animation
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const switchTab = useCallback((newTab: TabKey) => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 100, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: -20, duration: 100, useNativeDriver: true }),
    ]).start(() => {
      setActiveTab(newTab);
      translateX.setValue(20);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start();
    });
  }, [opacity, translateX]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > Math.abs(g.dy) && Math.abs(g.dx) > 12,
      onPanResponderRelease: (_, g) => {
        if (g.dx < -50) {
          setActiveTab((prev) => {
            const idx = TABS.findIndex((t) => t.key === prev);
            const next = TABS[Math.min(idx + 1, TABS.length - 1)].key;
            if (next !== prev) {
              translateX.setValue(30);
              opacity.setValue(0);
              Animated.parallel([
                Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
                Animated.timing(translateX, { toValue: 0, duration: 200, useNativeDriver: true }),
              ]).start();
            }
            return next;
          });
        } else if (g.dx > 50) {
          setActiveTab((prev) => {
            const idx = TABS.findIndex((t) => t.key === prev);
            const next = TABS[Math.max(idx - 1, 0)].key;
            if (next !== prev) {
              translateX.setValue(-30);
              opacity.setValue(0);
              Animated.parallel([
                Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
                Animated.timing(translateX, { toValue: 0, duration: 200, useNativeDriver: true }),
              ]).start();
            }
            return next;
          });
        }
      },
    })
  ).current;

  const loadFeed = useCallback(async () => {
    try {
      setFeedLoading(true);
      const res = await api.getAdminFeedLogs(dateStr, shift);
      if (res?.summary) {
        setFeedSummary({
          total_cows: res.summary.total_cows ?? res.cows?.length ?? 0,
          fed_count: res.summary.fed_count ?? 0,
          unfed_count: res.summary.unfed_count ?? 0,
          shift,
        });
      }
    } catch (e) { console.log("Feed error", e); }
    finally { setFeedLoading(false); }
  }, [dateStr, shift]);

  const loadMilk = useCallback(async () => {
    try {
      setMilkLoading(true);
      const res = await api.getAdminMilkLogs(dateStr);
      if (res?.summary) setMilkSummary(res.summary);
    } catch (e) { console.log("Milk error", e); }
    finally { setMilkLoading(false); }
  }, [dateStr]);

  const loadHealth = useCallback(async () => {
    try {
      setHealthLoading(true);
      const res = await api.getAdminHealthLogs(dateStr);
      const logs = Array.isArray(res) ? res : res?.cows ?? [];
      if (res?.summary && typeof res.summary === "object" && "healthy" in res.summary) {
        setHealthSummary({
          total: res.summary.total ?? logs.length,
          healthy: res.summary.healthy ?? 0,
          sick: res.summary.sick ?? 0,
          under_observation: res.summary.under_observation ?? 0,
        });
      } else {
        setHealthSummary(parseHealthSummary(logs));
      }
    } catch (e) { console.log("Health error", e); }
    finally { setHealthLoading(false); }
  }, [dateStr]);

  useEffect(() => { loadFeed(); loadMilk(); loadHealth(); }, [loadFeed, loadMilk, loadHealth]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadFeed(), loadMilk(), loadHealth()]);
    setRefreshing(false);
  }, [loadFeed, loadMilk, loadHealth]);

  const dateLabel = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  const activeTabConfig = TABS.find((t) => t.key === activeTab)!;
  const isAllLoading = feedLoading && milkLoading && healthLoading;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.75}
          >
            <Ionicons name="arrow-back" size={18} color={C.text} />
          </TouchableOpacity>
          <View style={styles.logoWrap}>
            <Ionicons name="leaf" size={18} color="white" />
          </View>
          <View>
            <Text style={styles.headerLabel}>GauSevak</Text>
            <Text style={styles.headerTitle}>
              Cattle <Text style={{ color: C.primary }}>Care</Text>
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <View style={styles.dateBadge}>
            <Ionicons name="calendar-outline" size={11} color={C.textMuted} />
            <Text style={styles.dateText}>{dateLabel}</Text>
          </View>
          <View style={[
            styles.shiftBadge,
            { backgroundColor: shift === "morning" ? C.amberBg : "#EDE7F6", borderColor: shift === "morning" ? C.amberBorder : "#DDD6FE" },
          ]}>
            <Ionicons
              name={shift === "morning" ? "sunny-outline" : "moon-outline"}
              size={11}
              color={shift === "morning" ? C.amber : C.purple}
            />
            <Text style={[styles.shiftText, { color: shift === "morning" ? C.amber : C.purple }]}>
              {shift === "morning" ? "Morning" : "Evening"}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} colors={[C.primary]} />
        }
      >
        {/* ── Quick Stats Strip ── */}
        <View style={styles.statsStrip}>
          <TouchableOpacity style={styles.stripItem} onPress={() => switchTab("feed")} activeOpacity={0.7}>
            <Text style={[styles.stripValue, { color: C.green }]}>{feedSummary?.fed_count ?? "—"}</Text>
            <Text style={styles.stripLabel}>Fed</Text>
          </TouchableOpacity>
          <View style={styles.stripDivider} />
          <TouchableOpacity style={styles.stripItem} onPress={() => switchTab("milk")} activeOpacity={0.7}>
            <Text style={[styles.stripValue, { color: C.blue }]}>{fmt(milkSummary?.grand_total)} L</Text>
            <Text style={styles.stripLabel}>Milk Today</Text>
          </TouchableOpacity>
          <View style={styles.stripDivider} />
          <TouchableOpacity style={styles.stripItem} onPress={() => switchTab("health")} activeOpacity={0.7}>
            <Text style={[
              styles.stripValue,
              { color: (healthSummary?.sick ?? 0) > 0 ? C.red : C.green },
            ]}>
              {healthSummary?.healthy ?? "—"}
            </Text>
            <Text style={styles.stripLabel}>Healthy</Text>
          </TouchableOpacity>
        </View>

        {/* ── Tab Bar ── */}
        <TabBar
          active={activeTab}
          onChange={(k) => switchTab(k)}
        />

        {/* ── Swipeable Card ── */}
        <View {...panResponder.panHandlers}>
          {isAllLoading ? (
            <SkeletonCard />
          ) : (
            <Animated.View style={{ opacity, transform: [{ translateX }] }}>
              {activeTab === "feed" && (
                <FeedPanel loading={feedLoading} summary={feedSummary} date={dateLabel} shift={shift} />
              )}
              {activeTab === "milk" && (
                <MilkPanel loading={milkLoading} summary={milkSummary} date={dateLabel} />
              )}
              {activeTab === "health" && (
                <HealthPanel loading={healthLoading} summary={healthSummary} date={dateLabel} />
              )}
            </Animated.View>
          )}
        </View>

        {/* ── Dot Indicators ── */}
        <View style={styles.dotRow}>
          {TABS.map((t) => (
            <TouchableOpacity key={t.key} onPress={() => switchTab(t.key)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <View
                style={[
                  styles.dotIndicator,
                  activeTab === t.key
                    ? { backgroundColor: activeTabConfig.color, width: 22, borderRadius: 4 }
                    : { backgroundColor: C.border, width: 8, borderRadius: 4 },
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Swipe Hint ── */}
        <View style={styles.swipeHint}>
          <Ionicons name="swap-horizontal-outline" size={12} color={C.textLight} />
          <Text style={styles.swipeHintText}>Swipe left or right to switch sections</Text>
        </View>

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <Ionicons name="refresh-outline" size={11} color={C.textLight} />
          <Text style={styles.footerText}>
            Pull to refresh  ·  {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  logoWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: C.green,
    alignItems: "center",
    justifyContent: "center",
  },
  headerLabel: {
    fontSize: 9,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: C.textLight,
    fontWeight: "600",
    marginBottom: 1,
  },
  headerTitle: { fontSize: 19, fontWeight: "700", color: C.text, letterSpacing: -0.5 },
  headerRight: { flexDirection: "row", gap: 6, alignItems: "center" },
  dateBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  dateText: { fontSize: 11, fontWeight: "600", color: C.textMuted },
  shiftBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  shiftText: { fontSize: 11, fontWeight: "600" },

  // Scroll
  scroll: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, paddingBottom: 36, gap: 0 },

  // Stats strip
  statsStrip: {
    flexDirection: "row",
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 14,
    paddingVertical: 16,
    paddingHorizontal: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  stripItem: { flex: 1, alignItems: "center" },
  stripValue: { fontSize: 20, fontWeight: "700", letterSpacing: -0.6 },
  stripLabel: { fontSize: 10, fontWeight: "500", color: C.textLight, marginTop: 3 },
  stripDivider: { width: 1, backgroundColor: C.border, marginVertical: 4 },

  // Progress
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 8,
    justifyContent: "flex-end",
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  progressHint: { fontSize: 11, color: C.textLight, fontWeight: "500" },

  // Total row (milk)
  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginTop: 10,
  },
  totalLabel: { flex: 1, fontSize: 12, fontWeight: "500" },
  totalValue: { fontSize: 17, fontWeight: "700", letterSpacing: -0.4 },

  // Alert banner
  alertBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 10,
    marginTop: 10,
  },
  alertText: { fontSize: 12, fontWeight: "600", flex: 1 },

  // Dots
  dotRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
    marginBottom: 8,
  },
  dotIndicator: { height: 8 },

  // Swipe hint
  swipeHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginBottom: 18,
  },
  swipeHintText: { fontSize: 10, color: C.textLight, fontWeight: "500" },

  // Empty state
  emptyState: {
    alignItems: "center",
    paddingVertical: 20,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: C.textLight,
    fontWeight: "500",
    textAlign: "center",
  },

  // Footer
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  footerText: { fontSize: 10, color: C.textLight, fontWeight: "500" },
});
