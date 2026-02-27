import React, { useRef } from "react";
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
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

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

];

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

function Header() {
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
        <View style={styles.badge}>
          <View style={styles.badgeDot} />
          <Text style={styles.badgeText}>LIVESTOCK MANAGEMENT</Text>
        </View>
        <View style={styles.headerRow}>
          <View style={styles.logoRing}>
            <Image
              source={{
                uri: "https://cdn-icons-png.flaticon.com/512/1998/1998610.png",
              }}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heading}>Gausevak</Text>
            <Text style={styles.subheading}>Cattle care, simplified</Text>
          </View>
          <TouchableOpacity style={styles.notifBtn}>
            <Ionicons name="notifications-outline" size={20} color="#7ca9d4" />
            <View style={styles.notifDot} />
          </TouchableOpacity>
        </View>
        <View style={styles.statsRow}>
          {[
            { label: "Total Cows", value: "142" },
            { label: "Healthy", value: "138" },
            { label: "Alerts", value: "4" },
          ].map((stat, i) => (
            <View key={i} style={[styles.statItem, i < 2 && styles.statBorder]}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#ffffff" },
  listContent: { paddingHorizontal: 12, paddingTop: 10 },
  headerWrapper: {
    paddingTop: IS_IOS ? 56 : STATUS_BAR_HEIGHT + 16,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "#1e3a5f",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 14,
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
    marginBottom: 16,
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
    alignItems: "center",
    gap: 14,
    marginBottom: 18,
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
  logo: { width: 32, height: 32 },
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
