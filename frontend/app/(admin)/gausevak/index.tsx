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
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { api } from "../../../src/services/api";
import Scanner from "../../../src/components/Scanner";

const MENU = [
  {
    id: "cows",
    title: "Cows",
    subtitle: "Manage herd",
    icon: "paw",
    route: "/(admin)/gausevak/cows",
    gradient: ["#1a472a", "#2d6a4f"] as const,
    accent: "#52b788",
  },
  {
    id: "feed",
    title: "Feed",
    subtitle: "Diet & nutrition",
    icon: "restaurant",
    route: "/(admin)/gausevak/feed",
    gradient: ["#1b4332", "#40916c"] as const,
    accent: "#74c69d",
  },
  {
    id: "milkyield",
    title: "Milkyield",
    subtitle: "Milk Yield Records",
    icon: "water-outline",
    route: "/(admin)/gausevak/milkyield",
    gradient: ["#1c2b3a", "#4b75a5"] as const,
    accent: "#e27f2d",
  },
  {
    id: "health",
    title: "Health",
    subtitle: "Wellness tracker",
    icon: "heart",
    route: "/(admin)/gausevak/health",
    gradient: ["#2d1b33", "#6a0572"] as const,
    accent: "#c77dff",
  },
  {
    id: "insemination",
    title: "Insemination",
    subtitle: "Breeding cycles",
    icon: "flask",
    route: "/(admin)/gausevak/insemination",
    gradient: ["#1a1a2e", "#16213e"] as const,
    accent: "#7b8cde",
  },
  {
    id: "semen",
    title: "Semen Record",
    subtitle: "Lab data & logs",
    icon: "document-text",
    route: "/(admin)/gausevak/semen",
    gradient: ["#2b1b17", "#6b3c2e"] as const,
    accent: "#e07a5f",
  },
  {
    id: "medical",
    title: "Medical",
    subtitle: "Checkup history",
    icon: "medkit",
    route: "/(admin)/gausevak/medical",
    gradient: ["#1c2b3a", "#243b55"] as const,
    accent: "#56b4d3",
  },
  {
    id: "workers",
    title: "Workers",
    subtitle: "Farm staff",
    icon: "people",
    route: "/(admin)/gausevak/workers",
    gradient: ["#1a2e1a", "#2d5a27"] as const,
    accent: "#a3d977",
  },
  {
    id: "notes",
    title: "Notes",
    subtitle: "Quick reminders",
    icon: "pencil", // ← unique icon
    route: "/(admin)/gausevak/notes",
    gradient: ["#3d2b1f", "#7c4a2d"] as const, // warm brown matching your palette
    accent: "#FF9675", // ← your brand primary colour
  },
];

interface WeatherData {
  temp: number;
  humidity: number;
  windSpeed: number;
  condition: string;
}

// Weather hook: fetches from wttr.in, retries once
function useWeather(): WeatherData | null {
  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    let cancelled = false;

    const tryFetch = async (attempt: number) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      try {
        const url = "https://wttr.in/Ghaziabad?format=%t|%h|%w|%C";
        const res = await fetch(url, {
          signal: controller.signal,
          headers: { "User-Agent": "GausevakApp/1.0" },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = (await res.text()).trim();
        const parts = text.split("|");
        if (parts.length < 4) throw new Error("Bad format: " + text);

        const temp = parseInt(parts[0].replace(/[^\d-]/g, ""), 10);
        const humidity = parseInt(parts[1].replace(/\D/g, ""), 10);
        const windSpeed = parseInt(parts[2].replace(/\D/g, ""), 10);
        const condition = parts[3].trim();

        if (!cancelled && !isNaN(temp)) {
          setWeather({ temp, humidity, windSpeed, condition });
        }
      } catch (err: any) {
        console.warn(`Weather attempt ${attempt}:`, err?.message ?? err);
        if (attempt === 1 && !cancelled) {
          setTimeout(() => tryFetch(2), 4000);
        }
      } finally {
        clearTimeout(timeoutId);
      }
    };

    tryFetch(1);
    return () => {
      cancelled = true;
    };
  }, []);

  return weather;
}

// ── Inline weather row inside the header (no card wrapper)
function InlineWeather({ weather }: { weather: WeatherData | null }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (weather) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }
  }, [weather]);

  if (!weather) {
    // Show a subtle skeleton while loading — no text, just a faint pulse
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
      {/* Condition */}
      <Ionicons name="partly-sunny-outline" size={12} color="#f4a261" />
      <Text style={inlineStyles.conditionText} numberOfLines={1}>
        {weather.condition}
      </Text>

      <View style={inlineStyles.sep} />

      {/* Temp */}
      <Ionicons name="thermometer-outline" size={12} color="#f4a261" />
      <Text style={inlineStyles.value}>{weather.temp}°C</Text>

      <View style={inlineStyles.sep} />

      {/* Humidity */}
      <Ionicons name="water-outline" size={12} color="#56b4d3" />
      <Text style={inlineStyles.value}>{weather.humidity}%</Text>

      <View style={inlineStyles.sep} />

      {/* Wind */}
      <Ionicons name="flag-outline" size={12} color="#74c69d" />
      <Text style={inlineStyles.value}>{weather.windSpeed} km/h</Text>
    </Animated.View>
  );
}

function MenuCard({ item, index }: { item: (typeof MENU)[0]; index: number }) {
  const router = useRouter();
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(30)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        delay: index * 80,
        tension: 60,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.cardWrapper,
        { opacity, transform: [{ scale }, { translateY }] },
      ]}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => router.push(item.route as any)}
        onPressIn={() =>
          Animated.spring(scale, {
            toValue: 0.94,
            useNativeDriver: true,
            speed: 40,
            bounciness: 4,
          }).start()
        }
        onPressOut={() =>
          Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
            speed: 30,
            bounciness: 6,
          }).start()
        }
      >
        <LinearGradient
          colors={item.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          <View
            style={[styles.decorCircle, { borderColor: item.accent + "22" }]}
          />
          <View
            style={[
              styles.decorCircleSmall,
              { backgroundColor: item.accent + "11" },
            ]}
          />
          <View
            style={[
              styles.iconBadge,
              {
                backgroundColor: item.accent + "22",
                borderColor: item.accent + "44",
              },
            ]}
          >
            <Ionicons name={item.icon as any} size={22} color={item.accent} />
          </View>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={[styles.cardSubtitle, { color: item.accent + "cc" }]}>
            {item.subtitle}
          </Text>
          <View
            style={[styles.arrowBadge, { backgroundColor: item.accent + "18" }]}
          >
            <Ionicons name="arrow-forward" size={12} color={item.accent} />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

interface CowStats {
  total: number;
  active: number;
  inactive: number;
}

function Header() {
  const router = useRouter();
  const weather = useWeather();
  const [stats, setStats] = useState<CowStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    const fetchCowStats = async () => {
      try {
        const cows = await api.getCows();
        const total = cows.length;
        const active = cows.filter((c: any) => c.isActive && !c.isSold).length;
        const inactive = total - active;
        setStats({ total, active, inactive });
      } catch (error) {
        console.error("Failed to fetch cow stats:", error);
        setStats({ total: 0, active: 0, inactive: 0 });
      } finally {
        setLoading(false);
      }
    };
    fetchCowStats();
  }, []);

  const statItems = [
    { label: "Total Cows", value: stats?.total ?? "-" },
    { label: "Active", value: stats?.active ?? "-" },
    { label: "Inactive", value: stats?.inactive ?? "-" },
  ];

  const handleScanned = (data: string) => {
    setShowScanner(false);
    router.push({
      pathname: "/(admin)/gausevak/scanner-result",
      params: { data },
    } as any);
  };

  return (
    <View style={styles.headerWrapper}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={["#112240", "#0a1a30"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerCard}
      >
        <View style={styles.headerGlow} />

        {/* ── Top badge */}
        <View style={styles.badge}>
          <View style={styles.badgeDot} />
          <Text style={styles.badgeText}>LIVESTOCK MANAGEMENT</Text>
        </View>

        {/* ── Logo row with weather inline below title */}
        <View style={styles.headerRow}>
          <View style={styles.logoRing}>
            <Image
              source={require("../../../assets/images/Gausevak-logo.png")}
              style={{ width: 40, height: 40 }}
              resizeMode="contain"
            />
          </View>

          {/* Title + weather directly below it, no card */}
          <View style={{ flex: 1 }}>
            <Text style={styles.heading}>Gausevak</Text>
            <Text style={styles.subheading}>Cattle care</Text>
            {/* Inline weather sits right under the subtitle */}
            <InlineWeather weather={weather} />
          </View>

          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity
              style={styles.notifBtn}
              onPress={() => setShowScanner(true)}
            >
              <Ionicons name="qr-code-outline" size={20} color="#7ca9d4" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.notifBtn}>
              <Ionicons
                name="notifications-outline"
                size={20}
                color="#7ca9d4"
              />
              <View style={styles.notifDot} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Cow stats  */}
        <View style={styles.statsRow}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#7ca9d4" />
            </View>
          ) : (
            statItems.map((stat, i) => (
              <View
                key={i}
                style={[
                  styles.statItem,
                  i < statItems.length - 1 && styles.statBorder,
                ]}
              >
                <Text style={styles.statValue}>{String(stat.value)}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))
          )}
        </View>
      </LinearGradient>

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

export default function GausevakScreen() {
  return (
    <View style={styles.screen}>
      <FlatList
        data={MENU}
        keyExtractor={(item) => item.id}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={<Header />}
        contentContainerStyle={styles.listContent}
        renderItem={({ item, index }) => <MenuCard item={item} index={index} />}
        ListFooterComponent={<View style={{ height: 100 }} />}
      />
    </View>
  );
}

const IS_IOS = Platform.OS === "ios";
const STATUS_BAR_HEIGHT = IS_IOS ? 0 : (StatusBar.currentHeight ?? 0);

// ── Inline weather styles (no card/box)
const inlineStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
    flexWrap: "wrap",
  },
  conditionText: {
    color: "#a8c8e8",
    fontSize: 10,
    fontWeight: "500",
    maxWidth: 90,
  },
  value: {
    color: "#c8dff0",
    fontSize: 10,
    fontWeight: "700",
  },
  sep: {
    width: 1,
    height: 10,
    backgroundColor: "#2a4a6b",
    marginHorizontal: 2,
  },
  skeletonRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 6,
  },
  skeletonChip: {
    height: 10,
    width: 36,
    borderRadius: 5,
    backgroundColor: "#1e3a5f",
    opacity: 0.5,
  },
});

// ── Main styles
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFF8EF" },
  listContent: { paddingHorizontal: 12, paddingTop: 10 },
  headerWrapper: {
    paddingTop: IS_IOS ? 56 : STATUS_BAR_HEIGHT + 16,
    paddingHorizontal: 5,
    paddingBottom: 8,
  },
  headerCard: {
    borderRadius: 24,
    padding: 20,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "#1e3a5f",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 14,
    gap: 10,
  },
  headerGlow: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "#1e6fa0",
    opacity: 0.12,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#0d2137",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    gap: 6,
    borderWidth: 1,
    borderColor: "#1e3a5f",
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#4ade80",
  },
  badgeText: {
    color: "#7ca9d4",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  logoRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: "#2a4a6b",
    backgroundColor: "#0d2137",
    alignItems: "center",
    justifyContent: "center",
  },
  heading: {
    fontSize: 24,
    fontWeight: "800",
    color: "#e8f4f8",
    letterSpacing: -0.5,
  },
  subheading: {
    fontSize: 13,
    color: "#5b8db8",
    fontWeight: "500",
    marginTop: 2,
  },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#0d2137",
    borderWidth: 1,
    borderColor: "#1e3a5f",
    alignItems: "center",
    justifyContent: "center",
  },
  notifDot: {
    position: "absolute",
    top: 8,
    right: 9,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#ef4444",
    borderWidth: 1.5,
    borderColor: "#0d2137",
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "#0d2137",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1e3a5f",
    overflow: "hidden",
    minHeight: 56,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  statItem: { flex: 1, alignItems: "center", paddingVertical: 12 },
  statBorder: { borderRightWidth: 1, borderRightColor: "#1e3a5f" },
  statValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#e8f4f8",
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 11,
    color: "#5b8db8",
    marginTop: 2,
    fontWeight: "500",
  },
  cardWrapper: { flex: 1, margin: 6 },
  card: {
    borderRadius: 20,
    padding: 18,
    minHeight: 148,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  decorCircle: {
    position: "absolute",
    top: -20,
    right: -20,
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1.5,
  },
  decorCircleSmall: {
    position: "absolute",
    bottom: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  iconBadge: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#f0f8ff",
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 3,
    letterSpacing: 0.1,
  },
  arrowBadge: {
    position: "absolute",
    bottom: 14,
    right: 14,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
});
