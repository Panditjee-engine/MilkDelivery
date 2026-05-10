import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  PanResponder,
  Animated,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ─── Colour Palette
const C = {
  primary: "#FF9675",
  accent: "#FD9E69",
  light: "#FFD999",
  dark: "#BB6B3F",
  bg: "#FFF8EF",
  card: "#FFFFFF",
  text: "#3D1F0A",
  textMuted: "#A07850",
  textLight: "#C9A882",
  border: "#F5E6D0",
};

// ─── Tab Config
const TABS = [
  {
    id: "feed",
    title: "Feed",
    subtitle: "Diet & Nutrition",
    icon: "restaurant" as const,
    route: "/(admin)/gausevak/feed",
    heroBg: ["#d4edda", "#a8d5b5"] as const,
    iconBg: ["#e8f5e9", "#a5d6a7"] as const,
    emoji: "🌿",
    stats: [
      { label: "Today's Feed", value: "12 kg" },
      { label: "Intake Rate", value: "94%" },
    ],
  },
  {
    id: "milkyield",
    title: "Milk Yield",
    subtitle: "Milk Yield Records",
    icon: "water-outline" as const,
    route: "/(admin)/gausevak/milkyield",
    heroBg: ["#d0e8f7", "#93c4e8"] as const,
    iconBg: ["#e3f0fb", "#90c1e8"] as const,
    emoji: "🥛",
    stats: [
      { label: "Today's Yield", value: "18 L" },
      { label: "vs Last Week", value: "+6%" },
    ],
  },
  {
    id: "health",
    title: "Health",
    subtitle: "Wellness Tracker",
    icon: "heart" as const,
    route: "/(admin)/gausevak/health",
    heroBg: ["#fde8ef", "#f5a7c0"] as const,
    iconBg: ["#fce4ec", "#f48fb1"] as const,
    emoji: "🫀",
    stats: [
      { label: "Status", value: "All OK" },
      { label: "Checkups Due", value: "3" },
    ],
  },
];

const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

// ─── Component
export default function GausevakTabs() {
  const [activeIndex, setActiveIndex] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const router = useRouter();

  const goToTab = (index: number) => {
    if (index < 0 || index >= TABS.length) return;
    setActiveIndex(index);
    translateX.setValue(0);
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 20,
      onPanResponderMove: (_, gestureState) => {
        translateX.setValue(gestureState.dx * 0.15);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -SWIPE_THRESHOLD) {
          setActiveIndex((prev) => {
            const next = Math.min(prev + 1, TABS.length - 1);
            return next;
          });
        } else if (gestureState.dx > SWIPE_THRESHOLD) {
          setActiveIndex((prev) => {
            const next = Math.max(prev - 1, 0);
            return next;
          });
        }
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 12,
        }).start();
      },
    })
  ).current;

  const activeTab = TABS[activeIndex];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      <View style={styles.container}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerLabel}>GauSevak</Text>
            <Text style={styles.headerTitle}>
              Cattle <Text style={{ color: C.primary }}>Care</Text>
            </Text>
          </View>
          <LinearGradient colors={[C.primary, C.dark]} style={styles.avatar}>
            <Text style={{ fontSize: 22 }}>🐄</Text>
          </LinearGradient>
        </View>

        {/* ── Tab Bar ── */}
        <View style={styles.tabBar}>
          {TABS.map((tab, idx) => {
            const isActive = activeIndex === idx;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                onPress={() => goToTab(idx)}
                activeOpacity={0.75}
              >
                {isActive && (
                  <View style={[styles.pip, { backgroundColor: C.primary }]} />
                )}
                <LinearGradient colors={tab.iconBg} style={styles.tabIconWrap}>
                  <Ionicons
                    name={tab.icon}
                    size={17}
                    color={isActive ? C.dark : C.textLight}
                  />
                </LinearGradient>
                <Text
                  style={[
                    styles.tabLabel,
                    { color: isActive ? C.dark : C.textLight },
                  ]}
                >
                  {tab.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Swipable Panel ── */}
        <Animated.View
          style={[styles.swipeWrapper, { transform: [{ translateX }] }]}
          {...panResponder.panHandlers}
        >
          <ScrollView
            contentContainerStyle={styles.panel}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
          >
            {/* Hero Card */}
            <LinearGradient
              colors={activeTab.heroBg}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hero}
            >
              <View style={styles.heroTag}>
                <View style={[styles.heroTagDot, { backgroundColor: C.dark }]} />
                <Text style={[styles.heroTagText, { color: C.dark }]}>
                  {activeTab.subtitle.toUpperCase()}
                </Text>
              </View>
              <Text style={[styles.heroTitle, { color: C.text }]}>
                {activeTab.title}
              </Text>
              <Text style={[styles.heroSub, { color: C.textMuted }]}>
                {activeTab.subtitle}
              </Text>
              <Text style={styles.heroEmoji}>{activeTab.emoji}</Text>
            </LinearGradient>

            {/* Stats Row */}
            <View style={styles.statsRow}>
              {activeTab.stats.map((s) => (
                <View
                  key={s.label}
                  style={[
                    styles.statCard,
                    { backgroundColor: C.bg, borderColor: C.border },
                  ]}
                >
                  <Text style={[styles.statValue, { color: C.dark }]}>
                    {s.value}
                  </Text>
                  <Text style={[styles.statLabel, { color: C.textLight }]}>
                    {s.label}
                  </Text>
                </View>
              ))}
            </View>

            {/* Quick Info Card */}
            <View
              style={[
                styles.infoCard,
                { backgroundColor: C.bg, borderColor: C.border },
              ]}
            >
              <Ionicons
                name="information-circle-outline"
                size={16}
                color={C.textMuted}
              />
              <Text style={[styles.infoText, { color: C.textMuted }]}>
                Last updated today at 08:30 AM
              </Text>
            </View>

            {/* Swipe Hint */}
            <View style={styles.swipeHint}>
              {activeIndex > 0 && (
                <TouchableOpacity
                  onPress={() => goToTab(activeIndex - 1)}
                  style={styles.swipeHintBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-back" size={14} color={C.textLight} />
                  <Text style={[styles.swipeHintText, { color: C.textLight }]}>
                    {TABS[activeIndex - 1].title}
                  </Text>
                </TouchableOpacity>
              )}
              <View style={{ flex: 1 }} />
              {activeIndex < TABS.length - 1 && (
                <TouchableOpacity
                  onPress={() => goToTab(activeIndex + 1)}
                  style={styles.swipeHintBtn}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.swipeHintText, { color: C.textLight }]}>
                    {TABS[activeIndex + 1].title}
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={14}
                    color={C.textLight}
                  />
                </TouchableOpacity>
              )}
            </View>

            {/* CTA Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push(activeTab.route as any)}
            >
              <LinearGradient
                colors={[C.primary, C.accent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.actionBtn}
              >
                <Text style={styles.actionText}>
                  Open {activeTab.title} Records
                </Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.bg,
  },
  container: {
    flex: 1,
    backgroundColor: C.card,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    paddingVertical: 16,
    backgroundColor: C.bg,
    borderBottomWidth: 1.5,
    borderBottomColor: C.border,
  },
  headerLabel: {
    fontSize: 9,
    letterSpacing: 2.5,
    textTransform: "uppercase",
    color: C.textLight,
    marginBottom: 3,
    fontWeight: "700",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: C.text,
    letterSpacing: -0.5,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },

  // Tab Bar
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
    backgroundColor: C.bg,
    borderBottomWidth: 1.5,
    borderBottomColor: C.border,
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 9,
    gap: 5,
    borderRadius: 14,
    position: "relative",
  },
  tabBtnActive: {
    backgroundColor: C.card,
    borderWidth: 1.5,
    borderColor: C.border,
  },
  pip: {
    position: "absolute",
    top: -10,
    alignSelf: "center",
    width: 22,
    height: 3,
    borderRadius: 2,
  },
  tabIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },

  // Swipable wrapper
  swipeWrapper: {
    flex: 1,
  },

  // Panel
  panel: {
    padding: 20,
    paddingBottom: 32,
  },

  // Hero
  hero: {
    borderRadius: 20,
    padding: 22,
    marginBottom: 14,
    minHeight: 128,
    position: "relative",
    overflow: "hidden",
  },
  heroTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 10,
  },
  heroTagDot: { width: 5, height: 5, borderRadius: 3 },
  heroTagText: {
    fontSize: 8,
    letterSpacing: 1.5,
    fontWeight: "800",
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  heroSub: { fontSize: 12, marginTop: 3 },
  heroEmoji: {
    position: "absolute",
    right: 18,
    bottom: 14,
    fontSize: 48,
    opacity: 0.3,
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 3,
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Info card
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  infoText: { fontSize: 11, fontWeight: "600" },

  // Swipe hint
  swipeHint: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  swipeHintBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  swipeHintText: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.3,
  },

  // Action button
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 15,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  actionText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
});