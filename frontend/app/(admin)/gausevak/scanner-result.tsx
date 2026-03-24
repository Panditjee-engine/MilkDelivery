import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  StatusBar,
  Animated,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { api } from "../../../src/services/api";

function InfoChip({
  icon,
  label,
  value,
  color = "#2d6a4f",
}: {
  icon: string;
  label: string;
  value: string;
  color?: string;
}) {
  if (!value) return null;
  return (
    <View style={s.chip}>
      <View style={[s.chipIcon, { backgroundColor: color + "18" }]}>
        <Ionicons name={icon as any} size={14} color={color} />
      </View>
      <View style={s.chipText}>
        <Text style={s.chipLabel}>{label}</Text>
        <Text style={s.chipValue}>{value}</Text>
      </View>
    </View>
  );
}

function SectionCard({
  title,
  icon,
  color,
  children,
}: {
  title: string;
  icon: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <View style={[s.cardIconWrap, { backgroundColor: color + "15" }]}>
          <Ionicons name={icon as any} size={15} color={color} />
        </View>
        <Text style={[s.cardTitle, { color }]}>{title}</Text>
      </View>
      <View style={s.cardBody}>{children}</View>
    </View>
  );
}

function StatPill({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View
      style={[
        s.statPill,
        { borderColor: color + "30", backgroundColor: color + "08" },
      ]}
    >
      <Text style={[s.statPillValue, { color }]}>{value || "—"}</Text>
      <Text style={s.statPillLabel}>{label}</Text>
    </View>
  );
}

export default function ScannerResultScreen() {
  const router = useRouter();
  const { data } = useLocalSearchParams<{ data: string }>();
  const [cow, setCow] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(32)).current;
  const scaleHero = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    if (!data) {
      setLoading(false);
      setNotFound(true);
      return;
    }
    fetchCow();
  }, [data]);

  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 55,
          friction: 11,
          useNativeDriver: true,
        }),
        Animated.spring(scaleHero, {
          toValue: 1,
          tension: 60,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loading]);

  const fetchCow = async () => {
    try {
      const cows = await api.getCows();
      const found = cows.find(
        (c: any) =>
          c.tag_id === data ||
          c.tag === data ||
          c._id === data ||
          String(c.tag_id).toLowerCase() === String(data).toLowerCase(),
      );
      if (found) setCow(found);
      else setNotFound(true);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const IS_IOS = Platform.OS === "ios";
  const STATUS_H = IS_IOS ? 0 : (StatusBar.currentHeight ?? 0);

  // ← FIXED: safe back navigation
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(admin)/gausevak" as any);
    }
  };

  if (loading) {
    return (
      <View style={[s.screen, s.centered]}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={s.loadingRing}>
          <ActivityIndicator size="large" color="#2d6a4f" />
        </View>
        <Text style={s.loadingTitle}>Looking up tag…</Text>
        <Text style={s.loadingSubtitle}>Searching cow database</Text>
      </View>
    );
  }

  if (notFound || !cow) {
    return (
      <View style={s.screen}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={[s.topBar, { paddingTop: IS_IOS ? 56 : STATUS_H + 16 }]}>
          <TouchableOpacity style={s.backBtn} onPress={handleBack}>
            <Ionicons name="arrow-back" size={20} color="#1a1a2e" />
          </TouchableOpacity>
          <Text style={s.topTitle}>Scan Result</Text>
          <View style={{ width: 40 }} />
        </View>

        <Animated.View
          style={[
            s.centered,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={s.notFoundCircle}>
            <Ionicons name="alert-circle-outline" size={44} color="#ef4444" />
          </View>
          <Text style={s.notFoundTitle}>No Cow Found</Text>
          <Text style={s.notFoundSub}>No match for scanned tag</Text>
          <View style={s.scannedRaw}>
            <Ionicons name="qr-code-outline" size={14} color="#94a3b8" />
            <Text style={s.scannedRawText} numberOfLines={1}>
              {data}
            </Text>
          </View>
          <TouchableOpacity style={s.scanAgainBtn} onPress={handleBack}>
            <Ionicons name="scan-outline" size={16} color="#fff" />
            <Text style={s.scanAgainText}>Scan Again</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  const isActive = cow.isActive && !cow.isSold;
  const statusLabel = cow.isSold
    ? "Sold"
    : cow.isActive
      ? "Active"
      : "Inactive";
  const statusColor = cow.isSold ? "#f59e0b" : isActive ? "#22c55e" : "#ef4444";
  const statusBg = cow.isSold ? "#fef3c7" : isActive ? "#f0fdf4" : "#fef2f2";

  return (
    <View style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── Top bar ── */}
      <View style={[s.topBar, { paddingTop: IS_IOS ? 56 : STATUS_H + 16 }]}>
        <TouchableOpacity style={s.backBtn} onPress={handleBack}>
          <Ionicons name="arrow-back" size={20} color="#1a1a2e" />
        </TouchableOpacity>
        <Text style={s.topTitle}>Cow Profile</Text>
        <TouchableOpacity
          style={[s.backBtn, { backgroundColor: "#f0fdf4" }]}
          onPress={() =>
            router.push(`/(admin)/gausevak/cows/${cow._id}` as any)
          }
        >
          <Ionicons name="open-outline" size={18} color="#2d6a4f" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
      >
        {/* ── Hero Card ── */}
        <Animated.View
          style={{ opacity: fadeAnim, transform: [{ scale: scaleHero }] }}
        >
          <LinearGradient
            colors={["#1a472a", "#2d6a4f", "#40916c"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.heroCard}
          >
            <View style={s.heroDecorTL} />
            <View style={s.heroDecorBR} />

            <View style={s.heroTop}>
              <View style={s.heroCowIcon}>
                <Ionicons name="paw" size={30} color="#52b788" />
              </View>
              <View style={[s.heroBadge, { backgroundColor: statusBg }]}>
                <View
                  style={[s.heroBadgeDot, { backgroundColor: statusColor }]}
                />
                <Text style={[s.heroBadgeText, { color: statusColor }]}>
                  {statusLabel}
                </Text>
              </View>
            </View>

            <Text style={s.heroCowName}>{cow.name || "Unnamed Cow"}</Text>
            <Text style={s.heroCowBreed}>{cow.breed || "Unknown breed"}</Text>

            <View style={s.heroTagRow}>
              <View style={s.heroTag}>
                <Ionicons name="pricetag-outline" size={12} color="#b7e4c7" />
                <Text style={s.heroTagText}>
                  {cow.tag_id || cow.tag || "No Tag"}
                </Text>
              </View>
              {cow.age && (
                <View style={s.heroTag}>
                  <Ionicons name="calendar-outline" size={12} color="#b7e4c7" />
                  <Text style={s.heroTagText}>{cow.age} yrs</Text>
                </View>
              )}
              {cow.gender && (
                <View style={s.heroTag}>
                  <Ionicons
                    name="male-female-outline"
                    size={12}
                    color="#b7e4c7"
                  />
                  <Text style={s.heroTagText}>{cow.gender}</Text>
                </View>
              )}
            </View>

            <View style={s.heroStats}>
              <View style={s.heroStat}>
                <Text style={s.heroStatVal}>
                  {cow.weight ? `${cow.weight}` : "—"}
                </Text>
                <Text style={s.heroStatLbl}>kg Weight</Text>
              </View>
              <View style={s.heroStatDivider} />
              <View style={s.heroStat}>
                <Text style={s.heroStatVal}>
                  {cow.milk_yield ? `${cow.milk_yield}L` : "—"}
                </Text>
                <Text style={s.heroStatLbl}>Milk/day</Text>
              </View>
              <View style={s.heroStatDivider} />
              <View style={s.heroStat}>
                <Text style={s.heroStatVal}>
                  {cow.shed || cow.stall || "—"}
                </Text>
                <Text style={s.heroStatLbl}>Shed</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        <Animated.View
          style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        >
          {/* ── Scanned Tag ── */}
          <View style={s.scannedCard}>
            <View style={s.scannedLeft}>
              <View style={s.scannedIconWrap}>
                <Ionicons name="checkmark-circle" size={22} color="#22c55e" />
              </View>
              <View>
                <Text style={s.scannedCardLabel}>Scanned Tag</Text>
                <Text style={s.scannedCardValue}>{data}</Text>
              </View>
            </View>
            <View style={s.scannedPill}>
              <Text style={s.scannedPillText}>✓ Matched</Text>
            </View>
          </View>

          {/* ── Basic Info ── */}
          <SectionCard
            title="Basic Info"
            icon="information-circle-outline"
            color="#2d6a4f"
          >
            <View style={s.chipGrid}>
              <InfoChip
                icon="paw-outline"
                label="Name"
                value={cow.name}
                color="#2d6a4f"
              />
              <InfoChip
                icon="leaf-outline"
                label="Breed"
                value={cow.breed}
                color="#2d6a4f"
              />
              <InfoChip
                icon="pricetag-outline"
                label="Tag ID"
                value={cow.tag_id || cow.tag}
                color="#2d6a4f"
              />
              <InfoChip
                icon="male-female-outline"
                label="Gender"
                value={cow.gender}
                color="#2d6a4f"
              />
              <InfoChip
                icon="calendar-outline"
                label="Age"
                value={cow.age ? `${cow.age} years` : cow.dob}
                color="#2d6a4f"
              />
              <InfoChip
                icon="color-palette-outline"
                label="Color"
                value={cow.color}
                color="#2d6a4f"
              />
            </View>
          </SectionCard>

          {/* ── Health & Production ── */}
          <SectionCard
            title="Health & Production"
            icon="heart-outline"
            color="#7c3aed"
          >
            <View style={s.statPillRow}>
              <StatPill
                label="Weight"
                value={cow.weight ? `${cow.weight} kg` : ""}
                color="#7c3aed"
              />
              <StatPill
                label="Milk/day"
                value={cow.milk_yield ? `${cow.milk_yield} L` : ""}
                color="#0284c7"
              />
              <StatPill
                label="Vaccination"
                value={cow.vaccination_status}
                color="#16a34a"
              />
            </View>
            <View style={s.chipGrid}>
              <InfoChip
                icon="medkit-outline"
                label="Last Checkup"
                value={cow.last_checkup}
                color="#7c3aed"
              />
              <InfoChip
                icon="fitness-outline"
                label="Health Status"
                value={cow.health_status}
                color="#7c3aed"
              />
            </View>
          </SectionCard>

          {/* ── Farm Details ── */}
          <SectionCard
            title="Farm Details"
            icon="location-outline"
            color="#b45309"
          >
            <View style={s.chipGrid}>
              <InfoChip
                icon="home-outline"
                label="Shed / Stall"
                value={cow.shed || cow.stall}
                color="#b45309"
              />
              <InfoChip
                icon="business-outline"
                label="Farm"
                value={cow.farm_name}
                color="#b45309"
              />
              <InfoChip
                icon="time-outline"
                label="Added On"
                value={
                  cow.created_at
                    ? new Date(cow.created_at).toLocaleDateString()
                    : ""
                }
                color="#b45309"
              />
            </View>
          </SectionCard>

          {/* ── Quick Actions ── */}
          <Text style={s.actionsLabel}>Quick Actions</Text>
          <View style={s.actionsGrid}>
            <TouchableOpacity
              style={s.actionCard}
              onPress={() =>
                router.push(`/(admin)/gausevak/feed?cow_id=${cow._id}` as any)
              }
            >
              <View style={[s.actionIcon, { backgroundColor: "#f0fdf4" }]}>
                <Ionicons name="restaurant-outline" size={22} color="#2d6a4f" />
              </View>
              <Text style={[s.actionLabel, { color: "#2d6a4f" }]}>Feed</Text>
              <Text style={s.actionSub}>Diet logs</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.actionCard}
              onPress={() =>
                router.push(`/(admin)/gausevak/health?cow_id=${cow._id}` as any)
              }
            >
              <View style={[s.actionIcon, { backgroundColor: "#faf5ff" }]}>
                <Ionicons name="heart-outline" size={22} color="#7c3aed" />
              </View>
              <Text style={[s.actionLabel, { color: "#7c3aed" }]}>Health</Text>
              <Text style={s.actionSub}>Checkups</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.actionCard}
              onPress={() =>
                router.push(
                  `/(admin)/gausevak/milkyield?cow_id=${cow._id}` as any,
                )
              }
            >
              <View style={[s.actionIcon, { backgroundColor: "#eff6ff" }]}>
                <Ionicons name="water-outline" size={22} color="#0284c7" />
              </View>
              <Text style={[s.actionLabel, { color: "#0284c7" }]}>Milk</Text>
              <Text style={s.actionSub}>Yield data</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.actionCard}
              onPress={() =>
                router.push(
                  `/(admin)/gausevak/medical?cow_id=${cow._id}` as any,
                )
              }
            >
              <View style={[s.actionIcon, { backgroundColor: "#fff7ed" }]}>
                <Ionicons name="medkit-outline" size={22} color="#ea580c" />
              </View>
              <Text style={[s.actionLabel, { color: "#ea580c" }]}>Medical</Text>
              <Text style={s.actionSub}>Records</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 48 }} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const IS_IOS = Platform.OS === "ios";

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f8fafc" },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 32,
  },
  scroll: { padding: 16, paddingTop: 8 },

  // Top bar
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.3,
  },

  // Loading
  loadingRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#f0fdf4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  loadingTitle: { fontSize: 18, fontWeight: "800", color: "#0f172a" },
  loadingSubtitle: { fontSize: 13, color: "#94a3b8" },

  // Not found
  notFoundCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#fef2f2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  notFoundTitle: { fontSize: 22, fontWeight: "900", color: "#0f172a" },
  notFoundSub: { fontSize: 14, color: "#94a3b8", marginTop: 2 },
  scannedRaw: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginTop: 4,
    maxWidth: "90%",
  },
  scannedRawText: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "600",
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
    flex: 1,
  },
  scanAgainBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#2d6a4f",
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 14,
    marginTop: 8,
  },
  scanAgainText: { color: "#fff", fontSize: 15, fontWeight: "800" },

  // Hero card
  heroCard: {
    borderRadius: 24,
    padding: 22,
    marginBottom: 14,
    overflow: "hidden",
    shadowColor: "#1a472a",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  heroDecorTL: {
    position: "absolute",
    top: -30,
    left: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  heroDecorBR: {
    position: "absolute",
    bottom: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  heroCowIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "rgba(82,183,136,0.2)",
    borderWidth: 1,
    borderColor: "rgba(82,183,136,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  heroBadgeDot: { width: 6, height: 6, borderRadius: 3 },
  heroBadgeText: { fontSize: 11, fontWeight: "800" },
  heroCowName: {
    fontSize: 28,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  heroCowBreed: {
    fontSize: 14,
    color: "rgba(255,255,255,0.65)",
    fontWeight: "500",
    marginBottom: 14,
  },
  heroTagRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 18,
  },
  heroTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  heroTagText: { color: "#d8f3dc", fontSize: 11, fontWeight: "700" },
  heroStats: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.18)",
    borderRadius: 16,
    padding: 14,
  },
  heroStat: { flex: 1, alignItems: "center" },
  heroStatDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.15)" },
  heroStatVal: {
    fontSize: 18,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -0.3,
  },
  heroStatLbl: {
    fontSize: 10,
    color: "rgba(255,255,255,0.55)",
    fontWeight: "600",
    marginTop: 2,
  },

  // Scanned card
  scannedCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  scannedLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  scannedIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#f0fdf4",
    alignItems: "center",
    justifyContent: "center",
  },
  scannedCardLabel: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "600",
    marginBottom: 2,
  },
  scannedCardValue: {
    fontSize: 13,
    color: "#0f172a",
    fontWeight: "700",
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
  },
  scannedPill: {
    backgroundColor: "#f0fdf4",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  scannedPillText: { color: "#16a34a", fontSize: 11, fontWeight: "800" },

  // Section card
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f8fafc",
  },
  cardIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  cardBody: { padding: 12 },

  // Chip grid
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 10,
    width: "47%",
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  chipIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  chipText: { flex: 1 },
  chipLabel: { fontSize: 10, color: "#94a3b8", fontWeight: "600" },
  chipValue: {
    fontSize: 13,
    color: "#0f172a",
    fontWeight: "700",
    marginTop: 1,
  },

  // Stat pills
  statPillRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  statPill: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  statPillValue: { fontSize: 16, fontWeight: "900", letterSpacing: -0.3 },
  statPillLabel: {
    fontSize: 10,
    color: "#94a3b8",
    fontWeight: "600",
    marginTop: 2,
  },

  // Actions
  actionsLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#94a3b8",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 10,
    marginLeft: 4,
  },
  actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  actionCard: {
    width: "47%",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: "#f1f5f9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  actionLabel: { fontSize: 14, fontWeight: "800", letterSpacing: -0.2 },
  actionSub: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "500",
    marginTop: 2,
  },
});
