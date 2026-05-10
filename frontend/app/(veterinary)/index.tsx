import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
  Animated,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../../src/services/api";

// ── Palette 

const C = {
  primary:   "#FF9675",
  secondary: "#FF9675",
  accent:    "#8B6854",
  light:     "#8B6854",
  dark:      "#BB6B3F",
  deep:      "#8B6854",
  bg:        "#FFF8EF",
  card:      "#FFE8D6",
  text:      "#3D1F0A",
  textMuted: "#A07850",
  textLight: "#C9A882",
};

const IS_IOS = Platform.OS === "ios";
const STATUS_BAR_HEIGHT = IS_IOS ? 0 : (StatusBar.currentHeight ?? 0);

// ── Menu Config 

const MENU_CARDS = [
  {
    route:       "/(veterinary)/cow",
    icon:        "paw-outline" as const,
    iconBg:      ["#FF9675", "#BB6B3F"] as [string, string],
    title:       "Animals",
    subtitle:    "All animals under your care",
    arrowColor:  C.dark,
    arrowBg:     C.card,
  },
  {
    route:       "/(veterinary)/medical",
    icon:        "medkit-outline" as const,
    iconBg:      ["#E8956D", "#9B5B3A"] as [string, string],
    title:       "Medical Records",
    subtitle:    "Medicine, Insemination & Semen",
    arrowColor:  C.accent,
    arrowBg:     "#FFF0E8",
  },
  {
    route:       "/(veterinary)/farm",
    icon:        "leaf-outline" as const,
    iconBg:      ["#FFAA80", "#C86B3F"] as [string, string],
    title:       "Farm Records",
    subtitle:    "Health, Feed & Milk",
    arrowColor:  C.dark,
    arrowBg:     C.card,
  },
];

// ── Custom Alert Modal 

function LogoutAlert({
  visible,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const scaleAnim   = useRef(new Animated.Value(0.88)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim,   { toValue: 1, useNativeDriver: true, damping: 14, stiffness: 200 }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    } else {
      scaleAnim.setValue(0.88);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none">
      <View style={al.overlay}>
        <Animated.View style={[al.box, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
          {/* Icon */}
          <View style={al.iconWrap}>
            <LinearGradient colors={["#FF9675", "#BB6B3F"]} style={al.iconCircle}>
              <Ionicons name="log-out-outline" size={28} color="#fff" />
            </LinearGradient>
          </View>

          <Text style={al.title}>Log Out?</Text>
          <Text style={al.subtitle}>You'll need to sign in again to access your veterinary dashboard.</Text>

          <View style={al.divider} />

          <View style={al.btnRow}>
            <TouchableOpacity style={al.cancelBtn} onPress={onCancel} activeOpacity={0.8}>
              <Text style={al.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onConfirm} activeOpacity={0.8}>
              <LinearGradient colors={["#FF9675", "#BB6B3F"]} style={al.confirmBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Ionicons name="log-out-outline" size={16} color="#fff" />
                <Text style={al.confirmText}>Log Out</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const al = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(61,31,10,0.52)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  box: {
    backgroundColor: C.bg,
    borderRadius: 26,
    paddingTop: 28,
    paddingHorizontal: 24,
    paddingBottom: 22,
    width: "100%",
    alignItems: "center",
    shadowColor: C.deep,
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 16,
  },
  iconWrap:    { marginBottom: 16 },
  iconCircle: {
    width: 62,
    height: 62,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  title:    { fontSize: 19, fontWeight: "800", color: C.text, marginBottom: 8 },
  subtitle: { fontSize: 14, color: C.textMuted, textAlign: "center", lineHeight: 20, marginBottom: 20 },
  divider:  { height: 1, backgroundColor: "#F5D5BC", width: "100%", marginBottom: 18 },
  btnRow:   { flexDirection: "row", gap: 12, width: "100%" },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#F5D5BC",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText:  { fontSize: 15, fontWeight: "700", color: C.textMuted },
  confirmBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 13,
    borderRadius: 14,
  },
  confirmText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});

// ── Menu Card 

function MenuCard({ card, index, onPress }: { card: typeof MENU_CARDS[0]; index: number; onPress: () => void }) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(28)).current;
  const scale      = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 350, delay: index * 90, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, delay: index * 90, tension: 75, friction: 11, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[s.card, { opacity, transform: [{ translateY }, { scale }] }]}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        onPressIn={() =>
          Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 2 }).start()
        }
        onPressOut={() =>
          Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 4 }).start()
        }
        style={s.cardTouchable}
      >
        {/* Icon */}
        <LinearGradient colors={card.iconBg} style={s.cardIconBox} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Ionicons name={card.icon} size={26} color="#fff" />
        </LinearGradient>

        {/* Text */}
        <View style={s.cardText}>
          <Text style={s.cardTitle}>{card.title}</Text>
          <Text style={s.cardSubtitle}>{card.subtitle}</Text>
        </View>

        {/* Arrow */}
        <View style={[s.cardArrow, { backgroundColor: card.arrowBg }]}>
          <Ionicons name="chevron-forward" size={17} color={card.arrowColor} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Main Screen

export default function VeterinaryDashboard() {
  const router = useRouter();
  const [vetData, setVetData]         = useState<any>(null);
  const [alertVisible, setAlertVisible] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem("vet_data").then((d) => {
      if (d) setVetData(JSON.parse(d));
    });
  }, []);

  const handleLogout = async () => {
    try {
      try { await api.vetLogout(); } catch (_) {}
      await AsyncStorage.multiRemove(["vet_data", "vet_token", "auth_token"]);
    } catch (_) {}
    setAlertVisible(false);
    // Use replace with a slight delay so the modal closes smoothly first
    setTimeout(() => {
      router.replace("/login" as any);
    }, 150);
  };

  // Initials from name
  const initials = vetData?.name
    ? vetData.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "VT";

  return (
    <View style={s.screen}>
      <StatusBar barStyle="light-content" />

      <LogoutAlert
        visible={alertVisible}
        onCancel={() => setAlertVisible(false)}
        onConfirm={handleLogout}
      />

      {/* ── Header ── */}
      <LinearGradient
        colors={["#3D1F0A", "#6B3520"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.header}
      >
        {/* decorative glow */}
        <View style={s.glowCircle} />

        {/* Top row */}
        <View style={s.headerTopRow}>
          <View style={s.headerBadge}>
            <Ionicons name="medkit-outline" size={11} color={C.primary} />
            <Text style={s.headerBadgeText}>VETERINARY</Text>
          </View>
          <TouchableOpacity style={s.logoutBtn} onPress={() => setAlertVisible(true)} activeOpacity={0.8}>
            <Ionicons name="log-out-outline" size={19} color="#EF4444" />
          </TouchableOpacity>
        </View>

        {/* Vet info */}
        <View style={s.vetInfo}>
          <LinearGradient colors={["#FF9675", "#BB6B3F"]} style={s.vetAvatar}>
            <Text style={s.vetInitials}>{initials}</Text>
          </LinearGradient>
          <View style={{ gap: 2 }}>
            <Text style={s.vetName}>Dr. {vetData?.name || "Veterinarian"}</Text>
            <View style={s.emailRow}>
              <Ionicons name="mail-outline" size={11} color={C.textLight} />
              <Text style={s.vetEmail}>{vetData?.email || "—"}</Text>
            </View>
          </View>
        </View>

        {/* Online status pill */}
        <View style={s.onlinePill}>
          <View style={s.onlineDot} />
          <Text style={s.onlinePillText}>Online · Ready for consult</Text>
        </View>
      </LinearGradient>

      {/* ── Cards ── */}
      <View style={s.cardsContainer}>
        <Text style={s.sectionTitle}>Dashboard</Text>
        {MENU_CARDS.map((card, i) => (
          <MenuCard
            key={card.route}
            card={card}
            index={i}
            onPress={() => router.push(card.route as any)}
          />
        ))}
      </View>
    </View>
  );
}

// ── Styles 

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },

  // Header
  header: {
    paddingTop: IS_IOS ? 56 : STATUS_BAR_HEIGHT + 16,
    paddingHorizontal: 20,
    paddingBottom: 28,
    overflow: "hidden",
  },
  glowCircle: {
    position: "absolute",
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: C.primary,
    opacity: 0.1,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 22,
  },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,150,117,0.12)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(255,150,117,0.22)",
  },
  headerBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: C.primary,
    letterSpacing: 1.3,
  },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(239,68,68,0.1)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  vetInfo:    { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 16 },
  vetAvatar: {
    width: 56,
    height: 56,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.25)",
  },
  vetInitials: { fontSize: 20, fontWeight: "800", color: "#fff" },
  vetName:  { fontSize: 22, fontWeight: "800", color: "#FFF8EF", letterSpacing: -0.4 },
  emailRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  vetEmail: { fontSize: 12, color: C.textLight, fontWeight: "500" },
  onlinePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "rgba(255,150,117,0.12)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(255,150,117,0.2)",
  },
  onlineDot:      { width: 7, height: 7, borderRadius: 3.5, backgroundColor: C.primary },
  onlinePillText: { fontSize: 12, fontWeight: "600", color: C.primary },

  // Cards
  cardsContainer: { flex: 1, paddingHorizontal: 20, paddingTop: 22, gap: 14 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: C.textLight,
    letterSpacing: 1.3,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    shadowColor: C.deep,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.09,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#F5E6D8",
  },
  cardTouchable: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    gap: 16,
  },
  cardIconBox: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  cardText:     { flex: 1, gap: 4 },
  cardTitle:    { fontSize: 17, fontWeight: "800", color: C.text },
  cardSubtitle: { fontSize: 12, color: C.textMuted, fontWeight: "500" },
  cardArrow: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});