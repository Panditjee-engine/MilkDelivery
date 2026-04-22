// app/(admin)/gausevak/index.tsx
// ─────────────────────────────────────────────────────────────────────────────
// CHANGES from original:
//   • getCows() ab sirf ek baar call hota hai (useSharedDashboard)
//   • Notifications NotificationContext se aata hai — no duplicate API calls
//   • NotificationModal ab context ka data use karta hai (same shape)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  FlatList,
  StyleSheet,
  Animated,
  Platform,
  StatusBar,
  ActivityIndicator,
  Modal,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { api } from "../../../src/services/api";
import Scanner from "../../../src/components/Scanner";
import { useNotifications } from "../../../src/contexts/NotificationContext";
import type { NotificationSummary } from "../../../src/services/notificationService";

// ── Menu ───────────────────────────────────────────────────────────────────────

const MENU = [
  { id: "cows",         title: "Cows",          subtitle: "Manage herd",        icon: "paw",           route: "/(admin)/gausevak/cows",          gradient: ["#1a472a","#2d6a4f"] as const, accent: "#52b788" },
  { id: "feed",         title: "Feed",           subtitle: "Diet & nutrition",   icon: "restaurant",    route: "/(admin)/gausevak/feed",          gradient: ["#1b4332","#40916c"] as const, accent: "#74c69d" },
  { id: "milkyield",    title: "Milkyield",      subtitle: "Milk Yield Records", icon: "water-outline", route: "/(admin)/gausevak/milkyield",     gradient: ["#1c2b3a","#4b75a5"] as const, accent: "#e27f2d" },
  { id: "health",       title: "Health",         subtitle: "Wellness tracker",   icon: "heart",         route: "/(admin)/gausevak/health",        gradient: ["#2d1b33","#6a0572"] as const, accent: "#c77dff" },
  { id: "insemination", title: "Insemination",   subtitle: "Breeding cycles",    icon: "flask",         route: "/(admin)/gausevak/insemination",  gradient: ["#1a1a2e","#16213e"] as const, accent: "#7b8cde" },
  { id: "semen",        title: "Semen Record",   subtitle: "Lab data & logs",    icon: "document-text", route: "/(admin)/gausevak/semen",         gradient: ["#2b1b17","#6b3c2e"] as const, accent: "#e07a5f" },
  { id: "medical",      title: "Medical",        subtitle: "Checkup history",    icon: "medkit",        route: "/(admin)/gausevak/medical",       gradient: ["#1c2b3a","#243b55"] as const, accent: "#56b4d3" },
  { id: "workers",      title: "Workers",        subtitle: "Farm staff",         icon: "people",        route: "/(admin)/gausevak/workers",       gradient: ["#1a2e1a","#2d5a27"] as const, accent: "#a3d977" },
];

// ── Types ──────────────────────────────────────────────────────────────────────

interface WeatherData {
  temp: number;
  humidity: number;
  windSpeed: number;
  condition: string;
}

interface CowStats {
  total: number;
  active: number;
  inactive: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function getCurrentShift(): "morning" | "evening" {
  const hour = new Date().getHours();
  return hour >= 2 && hour < 14 ? "morning" : "evening";
}

// ── Weather hook ───────────────────────────────────────────────────────────────

function useWeather(): WeatherData | null {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  useEffect(() => {
    let cancelled = false;
    const tryFetch = async (attempt: number) => {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 15000);
      try {
        const res = await fetch("https://wttr.in/Ghaziabad?format=%t|%h|%w|%C", {
          signal: controller.signal,
          headers: { "User-Agent": "GausevakApp/1.0" },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = (await res.text()).trim();
        const parts = text.split("|");
        if (parts.length < 4) throw new Error("Bad format");
        const temp = parseInt(parts[0].replace(/[^\d-]/g, ""), 10);
        const humidity = parseInt(parts[1].replace(/\D/g, ""), 10);
        const windSpeed = parseInt(parts[2].replace(/\D/g, ""), 10);
        const condition = parts[3].trim();
        if (!cancelled && !isNaN(temp)) setWeather({ temp, humidity, windSpeed, condition });
      } catch {
        if (attempt === 1 && !cancelled) setTimeout(() => tryFetch(2), 4000);
      } finally {
        clearTimeout(tid);
      }
    };
    tryFetch(1);
    return () => { cancelled = true; };
  }, []);
  return weather;
}

// ── Cow stats hook (sirf stats ke liye — getCows ek baar) ─────────────────────

function useCowStats() {
  const [stats, setStats] = useState<CowStats>({ total: 0, active: 0, inactive: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCows()
      .then((fetchedCows: any[]) => {
        const total = fetchedCows.length;
        const active = fetchedCows.filter((c: any) => c.isActive && !c.isSold).length;
        setStats({ total, active, inactive: total - active });
      })
      .catch(() => setStats({ total: 0, active: 0, inactive: 0 }))
      .finally(() => setLoading(false));
  }, []);

  return { stats, loading };
}

// ── Notification config ────────────────────────────────────────────────────────

const NOTIF_CONFIG = {
  feed: {
    color: "#74c69d", bg: "#0d2a1a", border: "#1a4a2a",
    icon: "restaurant-outline" as const,
    label: "Feed", doneLabel: "All Cows Fed ✓",
  },
  milk: {
    color: "#e27f2d", bg: "#2a1a0d", border: "#4a2a0d",
    icon: "water-outline" as const,
    label: "Milk Yield", doneLabel: "All Milk Recorded ✓",
  },
  health: {
    color: "#c77dff", bg: "#1a0d2a", border: "#2a0d4a",
    icon: "heart-outline" as const,
    label: "Health", doneLabel: "All Health Checked ✓",
  },
};

// ── Notification Modal ─────────────────────────────────────────────────────────
// NotificationSummary (from context) ko NotificationModal mein directly use karte hain

function NotificationModal({
  visible,
  onClose,
  summary,
  loading,
}: {
  visible: boolean;
  onClose: () => void;
  summary: NotificationSummary | null;
  loading: boolean;
}) {
  const slideAnim = useRef(new Animated.Value(700)).current;
  const bgOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 200 }),
        Animated.timing(bgOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 700, duration: 220, useNativeDriver: true }),
        Animated.timing(bgOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const shift = summary?.shift ?? getCurrentShift();
  const allClear = summary?.all_complete ?? false;

  const renderSection = (type: "feed" | "milk" | "health") => {
    if (!summary) return null;
    const cfg = NOTIF_CONFIG[type];
    const cat = summary[type];
    const allDone = cat.total_pending === 0;
    const total = cat.total_done + cat.total_pending;

    return (
      <View key={type} style={nm.section}>
        <View style={[nm.sectionHeader, { borderColor: cfg.border }]}>
          <View style={[nm.sectionIconBg, { backgroundColor: cfg.bg }]}>
            <Ionicons name={cfg.icon} size={15} color={cfg.color} />
          </View>
          <Text style={[nm.sectionTitle, { color: cfg.color }]}>{cfg.label}</Text>
          <View style={[nm.countBadge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
            <Text style={[nm.countBadgeText, { color: cfg.color }]}>
              {cat.total_done}/{total}
            </Text>
          </View>
        </View>

        {allDone ? (
          <View style={[nm.allDoneRow, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
            <Ionicons name="checkmark-circle" size={16} color={cfg.color} />
            <Text style={[nm.allDoneText, { color: cfg.color }]}>{cfg.doneLabel}</Text>
          </View>
        ) : (
          <>
            {cat.pending.length > 0 && (
              <View style={nm.cowGroup}>
                <Text style={nm.cowGroupLabel}>Pending ({cat.total_pending})</Text>
                <View style={nm.cowChipsWrap}>
                  {cat.pending.map((name, i) => (
                    <View key={i} style={[nm.cowChip, nm.cowChipPending, { borderColor: cfg.color + "55" }]}>
                      <View style={[nm.chipDot, { backgroundColor: cfg.color }]} />
                      <Text style={[nm.chipText, { color: cfg.color }]}>{name}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
            {cat.done.length > 0 && (
              <View style={nm.cowGroup}>
                <Text style={[nm.cowGroupLabel, { color: "#3a5a3a" }]}>Done ({cat.total_done})</Text>
                <View style={nm.cowChipsWrap}>
                  {cat.done.map((name, i) => (
                    <View key={i} style={[nm.cowChip, nm.cowChipDone]}>
                      <Ionicons name="checkmark" size={10} color="#4ade80" />
                      <Text style={nm.chipTextDone}>{name}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        )}
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[nm.backdrop, { opacity: bgOpacity }]}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
      </Animated.View>

      <Animated.View style={[nm.sheet, { transform: [{ translateY: slideAnim }] }]}>
        <View style={nm.handle} />

        {/* Header */}
        <View style={nm.header}>
          <View style={nm.headerLeft}>
            <View style={[nm.bellBg, {
              backgroundColor: allClear ? "#0d2a1a" : "#2a0d0d",
              borderColor: allClear ? "#1a4a2a" : "#5a1a1a",
            }]}>
              <Ionicons
                name={allClear ? "checkmark-circle" : "notifications"}
                size={18}
                color={allClear ? "#4ade80" : "#ef4444"}
              />
            </View>
            <View>
              <Text style={nm.headerTitle}>Today's Status</Text>
              <Text style={nm.headerSub}>
                {shift === "morning" ? "🌅 Morning" : "🌙 Evening"} shift · {todayStr()}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={nm.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={18} color="#5b8db8" />
          </TouchableOpacity>
        </View>

        {/* Summary chips */}
        {!loading && summary && (
          <View style={nm.summaryRow}>
            {(["feed", "milk", "health"] as const).map((type) => {
              const cfg = NOTIF_CONFIG[type];
              const cat = summary[type];
              const isDone = cat.total_pending === 0;
              return (
                <View key={type} style={[nm.summaryChip, {
                  backgroundColor: isDone ? "#0d2a1a" : cfg.bg,
                  borderColor: isDone ? "#1a4a2a" : cfg.border,
                }]}>
                  <Ionicons name={isDone ? "checkmark-circle" : cfg.icon} size={12} color={isDone ? "#4ade80" : cfg.color} />
                  <Text style={[nm.summaryChipText, { color: isDone ? "#4ade80" : cfg.color }]}>
                    {cfg.label} {isDone ? "✓" : `${cat.total_pending} left`}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Content */}
        {loading ? (
          <View style={nm.centered}>
            <ActivityIndicator size="large" color="#7ca9d4" />
            <Text style={nm.loadingText}>Checking cow status...</Text>
          </View>
        ) : allClear ? (
          <View style={nm.centered}>
            <View style={nm.allGoodIcon}>
              <Ionicons name="checkmark-circle" size={44} color="#4ade80" />
            </View>
            <Text style={nm.allGoodTitle}>Sab Complete! 🎉</Text>
            <Text style={nm.allGoodSub}>
              Feed, Milk aur Health — aaj ka sab kaam ho gaya.
            </Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={nm.scrollContent}>
            {renderSection("feed")}
            {renderSection("milk")}
            {renderSection("health")}
            <View style={{ height: 20 }} />
          </ScrollView>
        )}
      </Animated.View>
    </Modal>
  );
}

// ── Inline Weather ─────────────────────────────────────────────────────────────

function InlineWeather({ weather }: { weather: WeatherData | null }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (weather) Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, [weather]);

  if (!weather) {
    return (
      <View style={inlineStyles.skeletonRow}>
        <View style={inlineStyles.skeletonChip} />
        <View style={[inlineStyles.skeletonChip, { width: 44 }]} />
        <View style={[inlineStyles.skeletonChip, { width: 52 }]} />
      </View>
    );
  }
  return (
    <Animated.View style={[inlineStyles.row, { opacity: fadeAnim }]}>
      <Ionicons name="partly-sunny-outline" size={12} color="#f4a261" />
      <Text style={inlineStyles.conditionText} numberOfLines={1}>{weather.condition}</Text>
      <View style={inlineStyles.sep} />
      <Ionicons name="thermometer-outline" size={12} color="#f4a261" />
      <Text style={inlineStyles.value}>{weather.temp}°C</Text>
      <View style={inlineStyles.sep} />
      <Ionicons name="water-outline" size={12} color="#56b4d3" />
      <Text style={inlineStyles.value}>{weather.humidity}%</Text>
      <View style={inlineStyles.sep} />
      <Ionicons name="flag-outline" size={12} color="#74c69d" />
      <Text style={inlineStyles.value}>{weather.windSpeed} km/h</Text>
    </Animated.View>
  );
}

// ── MenuCard ───────────────────────────────────────────────────────────────────

function MenuCard({ item, index }: { item: (typeof MENU)[0]; index: number }) {
  const router = useRouter();
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(30)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 400, delay: index * 80, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, delay: index * 80, tension: 60, friction: 10, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.cardWrapper, { opacity, transform: [{ scale }, { translateY }] }]}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => router.push(item.route as any)}
        onPressIn={() => Animated.spring(scale, { toValue: 0.94, useNativeDriver: true, speed: 40, bounciness: 4 }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 6 }).start()}
      >
        <LinearGradient colors={item.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
          <View style={[styles.decorCircle, { borderColor: item.accent + "22" }]} />
          <View style={[styles.decorCircleSmall, { backgroundColor: item.accent + "11" }]} />
          <View style={[styles.iconBadge, { backgroundColor: item.accent + "22", borderColor: item.accent + "44" }]}>
            <Ionicons name={item.icon as any} size={22} color={item.accent} />
          </View>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={[styles.cardSubtitle, { color: item.accent + "cc" }]}>{item.subtitle}</Text>
          <View style={[styles.arrowBadge, { backgroundColor: item.accent + "18" }]}>
            <Ionicons name="arrow-forward" size={12} color={item.accent} />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Header ─────────────────────────────────────────────────────────────────────

function Header({
  stats,
  statsLoading,
  onOpenNotifications,
}: {
  stats: CowStats;
  statsLoading: boolean;
  onOpenNotifications: () => void;
}) {
  const router = useRouter();
  const weather = useWeather();
  const [showScanner, setShowScanner] = useState(false);

  // Notification data from context
  const { totalPending, allComplete, loading: notifLoading } = useNotifications();

  // Bell dot pulse animation
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (totalPending > 0) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.7, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        ])
      );
      anim.start();
      return () => anim.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [totalPending]);

  const handleScanned = (data: string) => {
    setShowScanner(false);
    router.push({ pathname: "/(admin)/gausevak/scanner-result", params: { data } } as any);
  };

  const statItems = [
    { label: "Total Cows", value: stats?.total ?? "-" },
    { label: "Active",     value: stats?.active ?? "-" },
    { label: "Inactive",   value: stats?.inactive ?? "-" },
  ];

  const hasPending = !notifLoading && totalPending > 0;
  const showAllClear = !notifLoading && allComplete;

  return (
    <View style={styles.headerWrapper}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={["#112240", "#0a1a30"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.headerCard}>
        <View style={styles.headerGlow} />

        <View style={styles.badge}>
          <View style={styles.badgeDot} />
          <Text style={styles.badgeText}>LIVESTOCK MANAGEMENT</Text>
        </View>

        <View style={styles.headerRow}>
          <View style={styles.logoRing}>
            <Image
              source={require("../../../assets/images/Gausevak-logo.png")}
              style={{ width: 40, height: 40 }}
              resizeMode="contain"
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.heading}>Gausevak</Text>
            <Text style={styles.subheading}>Cattle care</Text>
            <InlineWeather weather={weather} />
          </View>

          <View style={{ flexDirection: "row", gap: 8 }}>
            {/* QR Scanner button */}
            <TouchableOpacity style={styles.notifBtn} onPress={() => setShowScanner(true)}>
              <Ionicons name="qr-code-outline" size={20} color="#7ca9d4" />
            </TouchableOpacity>

            {/* Notification bell */}
            <TouchableOpacity style={styles.notifBtn} onPress={onOpenNotifications}>
              <Ionicons name="notifications-outline" size={20} color="#7ca9d4" />

              {/* Loading dot — yellow */}
              {notifLoading && (
                <View style={[styles.notifDot, { backgroundColor: "#f5c842" }]} />
              )}

              {/* Pending dot — red pulsing */}
              {!notifLoading && hasPending && (
                <Animated.View style={[styles.notifDot, { transform: [{ scale: pulseAnim }] }]} />
              )}

              {/* All clear dot — green */}
              {!notifLoading && showAllClear && (
                <View style={[styles.notifDot, { backgroundColor: "#4ade80" }]} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          {statsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#7ca9d4" />
            </View>
          ) : (
            statItems.map((stat, i) => (
              <View key={i} style={[styles.statItem, i < statItems.length - 1 && styles.statBorder]}>
                <Text style={styles.statValue}>{String(stat.value)}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))
          )}
        </View>

       {/* Pending alert strip 
        {hasPending && (
          <TouchableOpacity style={styles.alertStrip} onPress={onOpenNotifications} activeOpacity={0.8}>
            <Ionicons name="warning-outline" size={14} color="#ef4444" />
            <Text style={styles.alertStripText}>
              {totalPending} pending task{totalPending > 1 ? "s" : ""} — tap to view
            </Text>
            <Ionicons name="chevron-forward" size={13} color="#ef444488" />
          </TouchableOpacity>
        )} */}

        {/* All clear strip */}
        {showAllClear && (
          <View style={styles.allClearStrip}>
            <Ionicons name="checkmark-circle" size={14} color="#4ade80" />
            <Text style={styles.allClearText}>Sab complete — Feed, Milk & Health ✓</Text>
          </View>
        )}
      </LinearGradient>

      {/* QR Scanner modal */}
      <Modal visible={showScanner} animationType="slide">
        <Scanner
          title="Scan Cow Tag"
          subtitle="Scan the QR code on cow's ear tag"
          onScanned={handleScanned}
          onClose={() => setShowScanner(false)}
        />
      </Modal>
    </View>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────────

export default function GausevakScreen() {
  const { stats, loading: statsLoading } = useCowStats();
  const { summary, loading: notifLoading, refresh } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);

  const handleOpenNotifications = () => {
    setShowNotifications(true);
    // Force fresh fetch when user opens notifications
    refresh();
  };

  return (
    <View style={styles.screen}>
      <FlatList
        data={MENU}
        keyExtractor={(item) => item.id}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Header
            stats={stats}
            statsLoading={statsLoading}
            onOpenNotifications={handleOpenNotifications}
          />
        }
        contentContainerStyle={styles.listContent}
        renderItem={({ item, index }) => <MenuCard item={item} index={index} />}
        ListFooterComponent={<View style={{ height: 100 }} />}
      />

      <NotificationModal
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
        summary={summary}
        loading={notifLoading}
      />
    </View>
  );
}

// ── Constants ──────────────────────────────────────────────────────────────────

const IS_IOS = Platform.OS === "ios";
const STATUS_BAR_HEIGHT = IS_IOS ? 0 : (StatusBar.currentHeight ?? 0);

// ── Notification Modal Styles ──────────────────────────────────────────────────

const nm = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.65)" },
  sheet: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "#0a1a30",
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    maxHeight: "88%", borderWidth: 1, borderColor: "#1e3a5f",
    paddingBottom: IS_IOS ? 34 : 20,
  },
  handle: { width: 40, height: 4, backgroundColor: "#1e3a5f", borderRadius: 2, alignSelf: "center", marginTop: 12, marginBottom: 4 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#1e3a5f" },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  bellBg: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontWeight: "800", color: "#e8f4f8", letterSpacing: -0.3 },
  headerSub: { fontSize: 11, color: "#5b8db8", marginTop: 2, fontWeight: "500" },
  closeBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: "#0d2137", borderWidth: 1, borderColor: "#1e3a5f", alignItems: "center", justifyContent: "center" },
  summaryRow: { flexDirection: "row", gap: 8, paddingHorizontal: 20, paddingVertical: 10, flexWrap: "wrap", borderBottomWidth: 1, borderBottomColor: "#0f2035" },
  summaryChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  summaryChipText: { fontSize: 11, fontWeight: "700" },
  scrollContent: { paddingHorizontal: 16, paddingTop: 12 },
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10, paddingBottom: 8, borderBottomWidth: 1 },
  sectionIconBg: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  sectionTitle: { flex: 1, fontSize: 14, fontWeight: "800", letterSpacing: 0.2 },
  countBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  countBadgeText: { fontSize: 12, fontWeight: "900" },
  allDoneRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  allDoneText: { fontSize: 13, fontWeight: "700" },
  cowGroup: { marginBottom: 8 },
  cowGroupLabel: { fontSize: 11, color: "#5b8db8", fontWeight: "700", marginBottom: 6, letterSpacing: 0.3 },
  cowChipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  cowChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  cowChipPending: { backgroundColor: "#0d1f30" },
  cowChipDone: { backgroundColor: "#0d2a1a", borderColor: "#1a4a2a" },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipText: { fontSize: 12, fontWeight: "600" },
  chipTextDone: { fontSize: 12, fontWeight: "600", color: "#4ade80" },
  centered: { alignItems: "center", justifyContent: "center", paddingVertical: 50, gap: 12 },
  loadingText: { color: "#5b8db8", fontSize: 13, fontWeight: "500" },
  allGoodIcon: { width: 76, height: 76, borderRadius: 22, backgroundColor: "#0d2a1a", borderWidth: 1, borderColor: "#1a4a2a", alignItems: "center", justifyContent: "center" },
  allGoodTitle: { fontSize: 20, fontWeight: "800", color: "#4ade80" },
  allGoodSub: { fontSize: 13, color: "#5b8db8", textAlign: "center", paddingHorizontal: 32, lineHeight: 20 },
});

// ── Inline Weather Styles ──────────────────────────────────────────────────────

const inlineStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6, flexWrap: "wrap" },
  conditionText: { color: "#a8c8e8", fontSize: 10, fontWeight: "500", maxWidth: 90 },
  value: { color: "#c8dff0", fontSize: 10, fontWeight: "700" },
  sep: { width: 1, height: 10, backgroundColor: "#2a4a6b", marginHorizontal: 2 },
  skeletonRow: { flexDirection: "row", gap: 6, marginTop: 6 },
  skeletonChip: { height: 10, width: 36, borderRadius: 5, backgroundColor: "#1e3a5f", opacity: 0.5 },
});

// ── Main Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFF8EF" },
  listContent: { paddingHorizontal: 12, paddingTop: 10 },
  headerWrapper: { paddingTop: IS_IOS ? 56 : STATUS_BAR_HEIGHT + 16, paddingHorizontal: 5, paddingBottom: 8 },
  headerCard: { borderRadius: 24, padding: 20, paddingHorizontal: 20, borderWidth: 1, borderColor: "#1e3a5f", overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.45, shadowRadius: 24, elevation: 14, gap: 10 },
  headerGlow: { position: "absolute", top: -40, right: -40, width: 150, height: 150, borderRadius: 75, backgroundColor: "#1e6fa0", opacity: 0.12 },
  badge: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", backgroundColor: "#0d2137", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, gap: 6, borderWidth: 1, borderColor: "#1e3a5f" },
  badgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#4ade80" },
  badgeText: { color: "#7ca9d4", fontSize: 10, fontWeight: "700", letterSpacing: 1.2 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
  logoRing: { width: 52, height: 52, borderRadius: 26, borderWidth: 1.5, borderColor: "#2a4a6b", backgroundColor: "#0d2137", alignItems: "center", justifyContent: "center" },
  heading: { fontSize: 24, fontWeight: "800", color: "#e8f4f8", letterSpacing: -0.5 },
  subheading: { fontSize: 13, color: "#5b8db8", fontWeight: "500", marginTop: 2 },
  notifBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#0d2137", borderWidth: 1, borderColor: "#1e3a5f", alignItems: "center", justifyContent: "center" },
  notifDot: { position: "absolute", top: 8, right: 9, width: 7, height: 7, borderRadius: 4, backgroundColor: "#ef4444", borderWidth: 1.5, borderColor: "#0d2137" },
  statsRow: { flexDirection: "row", backgroundColor: "#0d2137", borderRadius: 16, borderWidth: 1, borderColor: "#1e3a5f", overflow: "hidden", minHeight: 56 },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 12 },
  statItem: { flex: 1, alignItems: "center", paddingVertical: 12 },
  statBorder: { borderRightWidth: 1, borderRightColor: "#1e3a5f" },
  statValue: { fontSize: 18, fontWeight: "800", color: "#e8f4f8", letterSpacing: -0.3 },
  statLabel: { fontSize: 11, color: "#5b8db8", marginTop: 2, fontWeight: "500" },
  alertStrip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#2a0d0d", borderRadius: 10, borderWidth: 1, borderColor: "#5a1a1a", paddingHorizontal: 12, paddingVertical: 8 },
  alertStripText: { flex: 1, fontSize: 12, fontWeight: "700", color: "#ef4444cc" },
  allClearStrip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#0d2a1a", borderRadius: 10, borderWidth: 1, borderColor: "#1a4a2a", paddingHorizontal: 12, paddingVertical: 8 },
  allClearText: { flex: 1, fontSize: 12, fontWeight: "700", color: "#4ade80cc" },
  cardWrapper: { flex: 1, margin: 6 },
  card: { borderRadius: 20, padding: 18, minHeight: 148, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  decorCircle: { position: "absolute", top: -20, right: -20, width: 90, height: 90, borderRadius: 45, borderWidth: 1.5 },
  decorCircleSmall: { position: "absolute", bottom: 12, right: 12, width: 40, height: 40, borderRadius: 20 },
  iconBadge: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 1, marginBottom: 14 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#f0f8ff", letterSpacing: -0.2 },
  cardSubtitle: { fontSize: 11, fontWeight: "500", marginTop: 3, letterSpacing: 0.1 },
  arrowBadge: { position: "absolute", bottom: 14, right: 14, width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
});