import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Animated,
  Modal,
  ScrollView,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../../src/services/api";

// ── Palette
const C = {
  primary: "#FF9675",
  accent: "#8B6854",
  dark: "#BB6B3F",
  bg: "#FFF8EF",
  card: "#FFE8D6",
  text: "#3D1F0A",
  textMuted: "#A07850",
  textLight: "#C9A882",
  border: "#F5E6D8",
  white: "#FFFFFF",
  soft: "#FFF0E8",
};

const DISMISSED_KEY = "vet_dismissed_alerts";

// ── Alert types (add new ones here later)
type AlertType = "healthy" | "ultrasound" | "cryo";

type AlertStyle = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  tint: string;
};

const ALERT_TYPES: { [key in AlertType]: AlertStyle } = {
  healthy: { label: "HEALTH CHECK", icon: "heart-outline", color: C.accent, tint: C.soft },
  ultrasound: { label: "DUE ULTRASOUND", icon: "pulse-outline", color: C.dark, tint: C.card },
  cryo: { label: "CRYO TANK ALERT", icon: "snow-outline", color: C.primary, tint: C.soft },
};

type VetAlert = {
  id: string;
  type: AlertType;
  tag?: string;
  title: string;
  message: string;
  primaryLabel: string;
  primaryRoute?: string;
  dismissLabel: string;
};

// ── Build alerts. Replace the fetch part with your real API calls.
async function buildAlerts() {
  const alerts: VetAlert[] = [];

  try {
    // TODO: use your real method that returns cows
    const cows: any[] = (await (api as any).getCows?.()) ?? [];
    cows
      .filter((c) => String(c.health_status ?? c.status).toLowerCase() === "healthy")
      .forEach((c) => {
        alerts.push({
          id: `healthy-${c.id ?? c._id}`,
          type: "healthy",
          tag: "Today",
          title: `${c.farm_name ?? "Farm"} - Cow #${c.tag_number ?? c.id ?? c._id}`,
          message: "Cow is healthy. All vitals normal, no treatment required.",
          primaryLabel: "View Cow",
          primaryRoute: "/(veterinary)/cow",
          dismissLabel: "Dismiss",
        });
      });
  } catch (_) {}

  // Add more alert types here later, e.g.
  // alerts.push({ id: "ultra-602", type: "ultrasound", ... })

  return alerts;
}

// ── Menu
const MODULES = [
  {
    route: "/(veterinary)/cow",
    icon: "paw-outline" as const,
    tint: C.card,
    color: C.dark,
    title: "Animals & Herd",
    subtitle: "Livestock, equine, canine registry & health",
  },
  {
    route: "/(veterinary)/medical",
    icon: "document-text-outline" as const,
    tint: C.soft,
    color: C.accent,
    title: "Medical Records",
    subtitle: "Clinical diagnoses, prescriptions, vaccinations",
  },
  {
    route: "/(veterinary)/insemination",
    icon: "flask-outline" as const,
    tint: C.card,
    color: C.primary,
    title: "Insemination (AI)",
    subtitle: "Cycles, synchronization protocols, breeding",
  },
  {
    route: "/(veterinary)/semen",
    icon: "snow-outline" as const,
    tint: C.soft,
    color: C.dark,
    title: "Cryo Semen Stock",
    subtitle: "Canisters, sire inventory, motility grades",
  },
  {
    route: "/(veterinary)/farm",
    icon: "business-outline" as const,
    tint: C.card,
    color: C.accent,
    title: "Client Farms",
    subtitle: "Dairy, beef & equine estates, GPS locations",
  },
];

const TABS = [
  { label: "Dashboard", icon: "grid-outline" as const, route: null },
  { label: "Animals", icon: "paw-outline" as const, route: "/(veterinary)/cow" },
  { label: "Records", icon: "document-text-outline" as const, route: "/(veterinary)/medical" },
  { label: "Insem", icon: "flask-outline" as const, route: "/(veterinary)/insemination" },
  { label: "Farm", icon: "business-outline" as const, route: "/(veterinary)/farm" },
];

// ── Logout modal
function LogoutAlert({
  visible,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 14, stiffness: 200 }),
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    } else {
      scale.setValue(0.9);
      opacity.setValue(0);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none">
      <View style={al.overlay}>
        <Animated.View style={[al.box, { opacity, transform: [{ scale }] }]}>
          <LinearGradient colors={[C.primary, C.dark]} style={al.iconCircle}>
            <Ionicons name="log-out-outline" size={26} color="#fff" />
          </LinearGradient>
          <Text style={al.title}>Log Out?</Text>
          <Text style={al.subtitle}>
            You'll need to sign in again to access your veterinary dashboard.
          </Text>
          <View style={al.btnRow}>
            <TouchableOpacity style={al.cancelBtn} onPress={onCancel} activeOpacity={0.8}>
              <Text style={al.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ flex: 1 }} onPress={onConfirm} activeOpacity={0.8}>
              <LinearGradient
                colors={[C.primary, C.dark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={al.confirmBtn}
              >
                <Text style={al.confirmText}>Log Out</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ── Alert card
function AlertCard({
  alert,
  onPrimary,
  onDismiss,
}: {
  alert: VetAlert;
  onPrimary: () => void;
  onDismiss: () => void;
}) {
  const t = ALERT_TYPES[alert.type];
  return (
    <View style={s.alertCard}>
      <View style={s.alertTop}>
        <View style={s.alertTypeRow}>
          <View style={[s.alertIcon, { backgroundColor: t.tint }]}>
            <Ionicons name={t.icon} size={13} color={t.color} />
          </View>
          <Text style={[s.alertType, { color: t.color }]}>{t.label}</Text>
        </View>
        {!!alert.tag && <Text style={s.alertTag}>{alert.tag}</Text>}
      </View>
      <Text style={s.alertTitle}>{alert.title}</Text>
      <Text style={s.alertMsg}>{alert.message}</Text>
      <View style={s.alertBtns}>
        <TouchableOpacity
          style={[s.alertPrimary, { backgroundColor: t.color }]}
          onPress={onPrimary}
          activeOpacity={0.85}
        >
          <Text style={s.alertPrimaryText}>{alert.primaryLabel}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.alertSecondary} onPress={onDismiss} activeOpacity={0.85}>
          <Text style={s.alertSecondaryText}>{alert.dismissLabel}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Main screen
export default function VeterinaryDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [vetData, setVetData] = useState(null as any);
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [alerts, setAlerts] = useState([] as VetAlert[]);

  const loadAlerts = useCallback(async () => {
    const [all, dismissedRaw] = await Promise.all([
      buildAlerts(),
      AsyncStorage.getItem(DISMISSED_KEY),
    ]);
    const dismissed: string[] = dismissedRaw ? JSON.parse(dismissedRaw) : [];
    setAlerts(all.filter((a) => !dismissed.includes(a.id)));
  }, []);

  useEffect(() => {
    AsyncStorage.getItem("vet_data").then((d) => d && setVetData(JSON.parse(d)));
    loadAlerts();
  }, [loadAlerts]);

  const dismissAlert = async (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    const raw = await AsyncStorage.getItem(DISMISSED_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    await AsyncStorage.setItem(DISMISSED_KEY, JSON.stringify([...list, id]));
  };

  const handleLogout = async () => {
    try {
      try {
        await api.vetLogout();
      } catch (_) {}
      await AsyncStorage.multiRemove(["vet_data", "vet_token", "auth_token"]);
    } catch (_) {}
    setLogoutVisible(false);
    setTimeout(() => router.replace("/login" as any), 150);
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening";
  const name = vetData?.name || "Veterinarian";

  return (
    <View style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <LogoutAlert
        visible={logoutVisible}
        onCancel={() => setLogoutVisible(false)}
        onConfirm={handleLogout}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {/* Top bar */}
        <View style={[s.topBar, { paddingTop: insets.top + 10 }]}>
          <View style={s.brandRow}>
<Image
  source={{ uri: "https://panditjeeweb02.blob.core.windows.net/banners/gausatv-logo.jpeg" }}
  style={s.logo}
  resizeMode="cover"
/>
            <View>
              <Text style={s.brand}>
               GausSatv Vet<Text style={{ color: C.dark }}>+</Text>
              </Text>
              <Text style={s.brandSub}>Dr. {name} · Field & Clinic Vet</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => setLogoutVisible(true)}
            style={s.logoutBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={20} color={C.dark} />
          </TouchableOpacity>
        </View>

        {/* Banner */}
        <LinearGradient
          colors={[C.text, C.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.banner}
        >
          <View style={s.glow} />
          <View style={{ flex: 1 }}>
            <Text style={s.bannerLabel}>FIELD & CLINIC PRACTICE</Text>
            <Text style={s.bannerTitle}>
              {greeting}, Dr. {name}
            </Text>
          </View>
          <View style={s.dutyPill}>
            <View style={s.dutyDot} />
            <Text style={s.dutyText}>On Field Duty</Text>
          </View>
        </LinearGradient>

        {/* Urgent alerts */}
        <View style={s.sectionHead}>
          <View style={s.sectionTitleRow}>
            <Ionicons name="alert-circle-outline" size={18} color={C.dark} />
            <Text style={s.sectionTitle}>Urgent Field Alerts</Text>
          </View>
          {alerts.length > 0 && (
            <View style={s.countPill}>
              <Text style={s.countText}>{alerts.length} Action Required</Text>
            </View>
          )}
        </View>

        <View style={s.list}>
          {alerts.length === 0 ? (
            <View style={s.emptyBox}>
              <Ionicons name="checkmark-circle-outline" size={28} color={C.primary} />
              <Text style={s.emptyText}>All clear. No alerts right now.</Text>
            </View>
          ) : (
            alerts.map((a) => (
              <AlertCard
                key={a.id}
                alert={a}
                onPrimary={() => a.primaryRoute && router.push(a.primaryRoute as any)}
                onDismiss={() => dismissAlert(a.id)}
              />
            ))
          )}
        </View>

        {/* Practice hub */}
        <View style={s.sectionHead}>
          <Text style={s.sectionTitle}>Practice Hub</Text>
          <Text style={s.hubCount}>{MODULES.length} Core Modules</Text>
        </View>

        <View style={s.list}>
          {MODULES.map((m) => (
            <TouchableOpacity
              key={m.route}
              style={s.moduleCard}
              activeOpacity={0.8}
              onPress={() => router.push(m.route as any)}
            >
              <View style={[s.moduleIcon, { backgroundColor: m.tint }]}>
                <Ionicons name={m.icon} size={22} color={m.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.moduleTitle}>{m.title}</Text>
                <Text style={s.moduleSub} numberOfLines={1}>
                  {m.subtitle}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={C.textLight} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Bottom tab bar */}
      <View style={[s.tabBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        {TABS.map((t, i) => {
          const active = i === 0;
          return (
            <TouchableOpacity
              key={t.label}
              style={s.tabItem}
              activeOpacity={0.7}
              onPress={() => t.route && router.push(t.route as any)}
            >
              <Ionicons name={t.icon} size={22} color={active ? C.dark : C.textLight} />
              <Text style={[s.tabLabel, active && { color: C.dark, fontWeight: "700" }]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ── Styles
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },

  topBar: {
    backgroundColor: C.bg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
logo: {
  width: 40,
  height: 40,
  borderRadius: 12,
  backgroundColor: C.card,
},
  brand: { fontSize: 16, fontWeight: "800", color: C.text },
  brandSub: { fontSize: 11, color: C.textMuted, fontWeight: "500" },
  logoutBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
  },

  banner: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 18,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    overflow: "hidden",
  },
  glow: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: C.primary,
    opacity: 0.18,
  },
  bannerLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: C.textLight,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  bannerTitle: { fontSize: 20, fontWeight: "800", color: C.bg },
  dutyPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,150,117,0.18)",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "rgba(255,150,117,0.3)",
  },
  dutyDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.primary },
  dutyText: { fontSize: 10, fontWeight: "700", color: C.primary },

  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginTop: 22,
    marginBottom: 10,
  },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: C.text },
  countPill: {
    backgroundColor: C.card,
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  countText: { fontSize: 10, fontWeight: "700", color: C.dark },
  hubCount: { fontSize: 11, color: C.textMuted, fontWeight: "600" },

  list: { paddingHorizontal: 16, gap: 10 },

  alertCard: {
    backgroundColor: C.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  alertTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  alertTypeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  alertIcon: {
    width: 22,
    height: 22,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  alertType: { fontSize: 10, fontWeight: "800", letterSpacing: 0.8 },
  alertTag: { fontSize: 10, color: C.textLight, fontWeight: "600" },
  alertTitle: { fontSize: 14, fontWeight: "800", color: C.text, marginBottom: 3 },
  alertMsg: { fontSize: 12, color: C.textMuted, lineHeight: 17, marginBottom: 12 },
  alertBtns: { flexDirection: "row", gap: 8 },
  alertPrimary: { borderRadius: 9, paddingHorizontal: 14, paddingVertical: 8 },
  alertPrimaryText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  alertSecondary: {
    borderRadius: 9,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: C.card,
  },
  alertSecondaryText: { color: C.accent, fontSize: 12, fontWeight: "700" },
  emptyBox: {
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    paddingVertical: 22,
    gap: 6,
  },
  emptyText: { fontSize: 13, color: C.textMuted, fontWeight: "600" },

  moduleCard: {
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  moduleIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  moduleTitle: { fontSize: 15, fontWeight: "800", color: C.text },
  moduleSub: { fontSize: 11, color: C.textMuted, marginTop: 2 },

  tabBar: {
    flexDirection: "row",
    backgroundColor: C.white,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 8,
  },
  tabItem: { flex: 1, alignItems: "center", gap: 3 },
  tabLabel: { fontSize: 10, color: C.textLight, fontWeight: "600" },
});

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
    borderRadius: 24,
    padding: 24,
    width: "100%",
    alignItems: "center",
  },
  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  title: { fontSize: 18, fontWeight: "800", color: C.text, marginBottom: 6 },
  subtitle: {
    fontSize: 13,
    color: C.textMuted,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 20,
  },
  btnRow: { flexDirection: "row", gap: 10, width: "100%" },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: C.white,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: "center",
  },
  cancelText: { fontSize: 14, fontWeight: "700", color: C.textMuted },
  confirmBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  confirmText: { fontSize: 14, fontWeight: "700", color: "#fff" },
});