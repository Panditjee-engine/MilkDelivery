import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  StatusBar,
  Platform,
  Animated,
  Modal,
  RefreshControl,
  TouchableOpacity,
  LayoutAnimation,
  UIManager,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { api } from "../../src/services/api";
import Scanner from "../../src/components/Scanner";

// ── Enable LayoutAnimation on Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ── Color System
const C = {
  primary: "#FF9675",
  accent: "#8B6854",
  dark: "#BB6B3F",
  bg: "#FFF8EF",
  card: "#FFE8D6",
  text: "#3D1F0A",
  textMuted: "#A07850",
  textLight: "#C9A882",
};

// ── Platform
const IS_IOS = Platform.OS === "ios";
const STATUS_BAR_HEIGHT = IS_IOS ? 0 : (StatusBar.currentHeight ?? 0);
const HEADER_EXPANDED = IS_IOS ? 178 : 168;
const HEADER_COLLAPSED = IS_IOS ? 100 : 90;
const SCROLL_THRESHOLD = 60;

// ── Types
interface Animal {
  id: string;
  tag_number: string;
  name?: string;
  breed?: string;
  age?: number;
  isActive: boolean;
  isSold: boolean;
  gender?: string;
  weight?: number;
  dob?: string;
  purchase_date?: string;
  purchase_price?: number;
  notes?: string;
  type?: string;
  photo?: string;
  isLeasedIn?: boolean;
  isLeasedOut?: boolean;
  lessorFarmName?: string;
  leasedToFarmName?: string;
  leasedLocationLabel?: string;
  leaseEndDate?: string;
}

// ── Helpers
function fmtDate(d?: string) {
  if (!d) return "—";
  const parts = d.split("-");
  if (parts.length !== 3) return d;
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${parts[2]} ${months[Number(parts[1]) - 1]} ${parts[0]}`;
}

function fmtPrice(p?: number) {
  if (!p) return "—";
  return "₹" + p.toLocaleString("en-IN");
}

function getStatusProps(a: Animal) {
  if (a.isSold) return { color: "#dc2626", bg: "#fef2f2", label: "Sold" };
  if (a.isActive) return { color: "#16a34a", bg: "#f0fdf4", label: "Active" };
  return { color: "#d97706", bg: "#fffbeb", label: "Inactive" };
}

// ── Animal Avatar
function AnimalAvatar({
  animal,
  size = 52,
  expanded = false,
}: {
  animal: Animal;
  size?: number;
  expanded?: boolean;
}) {
  const isMale = animal.gender === "Male";
  const isCalf = (animal.age ?? 0) < 1;
  const bgColor = expanded ? "#FFF0E4" : C.card;
  const borderClr = expanded ? C.primary : "#EDD8C4";

  if (animal.photo) {
    return (
      <Image
        source={{ uri: animal.photo }}
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.28,
          borderWidth: 1.5,
          borderColor: borderClr,
        }}
      />
    );
  }

  let iconName: keyof typeof Ionicons.glyphMap = "paw-outline";
  let iconColor = C.dark;
  if (isMale && !isCalf) {
    iconName = "paw";
    iconColor = "#6B4C8B";
  } else if (isCalf) {
    iconName = "leaf-outline";
    iconColor = "#3a7d44";
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        backgroundColor: bgColor,
        borderWidth: 1.5,
        borderColor: borderClr,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons
        name={iconName}
        size={Math.round(size * 0.52)}
        color={iconColor}
      />
    </View>
  );
}

// ── Info Row
function InfoRow({
  icon,
  label,
  value,
  highlight,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={s.infoRow}>
      <View style={s.infoIconWrap}>
        <Ionicons name={icon} size={14} color={C.accent} />
      </View>
      <Text style={s.infoLabel}>{label}</Text>
      <Text
        style={[s.infoValue, highlight && { color: C.dark, fontWeight: "800" }]}
      >
        {value}
      </Text>
    </View>
  );
}

// ── Section Header
function SectionHeader({
  title,
  icon,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={s.sectionHeader}>
      <Ionicons name={icon} size={13} color={C.accent} />
      <Text style={s.sectionTitle}>{title}</Text>
    </View>
  );
}

// ── Animal Card
function AnimalCard({
  animal,
  index,
  expanded,
  onToggle,
}: {
  animal: Animal;
  index: number;
  expanded: boolean;
  onToggle: (id: string) => void;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const chevronRot = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 280,
        delay: index * 50,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        delay: index * 50,
        tension: 90,
        friction: 12,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    Animated.timing(chevronRot, {
      toValue: expanded ? 1 : 0,
      duration: 260,
      useNativeDriver: true,
    }).start();
  }, [expanded]);

  const rotateStr = chevronRot.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });
  const st = getStatusProps(animal);
  const isMale = animal.gender === "Male";
  const gColor = isMale ? "#1a4a8a" : "#7c3aed";
  const gBg = isMale ? "#EEF4FF" : "#FDF4FF";

  const onPressIn = () =>
    Animated.spring(scale, {
      toValue: 0.975,
      useNativeDriver: true,
      tension: 200,
      friction: 10,
    }).start();
  const onPressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 200,
      friction: 10,
    }).start();

  const handlePress = () => onToggle(animal.id);

  return (
    <Animated.View
      style={[
        s.card,
        expanded && s.cardExpanded,
        { opacity, transform: [{ translateY }, { scale }] },
      ]}
    >
      {/* ── Header Row ── */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handlePress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={s.cardHeader}
      >
        <AnimalAvatar animal={animal} size={54} expanded={expanded} />

        <View style={s.cardInfo}>
          <View style={s.nameRow}>
            <Text style={s.cowName} numberOfLines={1}>
              {animal.name || "Unknown"}
            </Text>
            <View style={s.tagPill}>
              <Text style={s.tagPillText}>{animal.tag_number}</Text>
            </View>
          </View>
          <View style={s.metaRow}>
            {!!animal.breed && (
              <View style={s.chip}>
                <Text style={s.chipText}>{animal.breed}</Text>
              </View>
            )}
            {!!animal.gender && (
              <View style={[s.chip, { backgroundColor: gBg }]}>
                <Ionicons
                  name={isMale ? "male" : "female"}
                  size={10}
                  color={gColor}
                />
                <Text style={[s.chipText, { color: gColor }]}>
                  {animal.gender}
                </Text>
              </View>
            )}
            {animal.age !== undefined && animal.age !== null && (
              <View style={s.chip}>
                <Text style={s.chipText}>
                  {animal.age} yr{animal.age !== 1 ? "s" : ""}
                </Text>
              </View>
            )}
            {animal.isLeasedIn && (
              <View style={[s.chip, { backgroundColor: "#EEF4FF" }]}>
                <Ionicons
                  name="swap-horizontal-outline"
                  size={10}
                  color="#1a4a8a"
                />
                <Text style={[s.chipText, { color: "#1a4a8a" }]}>
                  Leased in
                  {animal.lessorFarmName ? ` · ${animal.lessorFarmName}` : ""}
                </Text>
              </View>
            )}
            {animal.isLeasedOut && (
              <View style={[s.chip, { backgroundColor: "#FEF2F2" }]}>
                <Ionicons
                  name="lock-closed-outline"
                  size={10}
                  color="#dc2626"
                />
                <Text style={[s.chipText, { color: "#dc2626" }]}>
                  Leased out
                  {animal.leasedLocationLabel
                    ? ` · ${animal.leasedLocationLabel}`
                    : ""}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={s.cardRight}>
          <View style={[s.statusBadge, { backgroundColor: st.bg }]}>
            <View style={[s.statusDot, { backgroundColor: st.color }]} />
            <Text style={[s.statusText, { color: st.color }]}>{st.label}</Text>
          </View>
          <Animated.View
            style={{ transform: [{ rotate: rotateStr }], marginTop: 4 }}
          >
            <Ionicons name="chevron-down" size={16} color={C.textLight} />
          </Animated.View>
        </View>
      </TouchableOpacity>

      {/* ── Expanded Body ── */}
      {expanded && (
        <View style={s.cardBody}>
          {/* Top divider */}
          <View style={s.bodyDivider} />

          {/* Identity banner */}
          <View style={s.identityBanner}>
            <AnimalAvatar animal={animal} size={72} expanded />
            <View style={s.identityInfo}>
              <Text style={s.identityName}>{animal.name || "Unknown"}</Text>
              <Text style={s.identityBreed}>
                {animal.breed || "Breed not specified"}
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  gap: 6,
                  marginTop: 8,
                  flexWrap: "wrap",
                }}
              >
                <View style={[s.statusBadge, { backgroundColor: st.bg }]}>
                  <View style={[s.statusDot, { backgroundColor: st.color }]} />
                  <Text style={[s.statusText, { color: st.color }]}>
                    {st.label}
                  </Text>
                </View>
                {!!animal.gender && (
                  <View style={[s.chip, { backgroundColor: gBg }]}>
                    <Ionicons
                      name={isMale ? "male" : "female"}
                      size={10}
                      color={gColor}
                    />
                    <Text style={[s.chipText, { color: gColor }]}>
                      {animal.gender}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* ── Basic Info ── */}
          <SectionHeader
            title="Basic Information"
            icon="information-circle-outline"
          />
          <View style={s.infoBlock}>
            <InfoRow
              icon="pricetag-outline"
              label="Tag Number"
              value={animal.tag_number}
            />
            <InfoRow
              icon="paw-outline"
              label="Breed"
              value={animal.breed || "—"}
            />
            <InfoRow
              icon="calendar-outline"
              label="Age"
              value={
                animal.age !== undefined && animal.age !== null
                  ? `${animal.age} year${animal.age !== 1 ? "s" : ""}`
                  : "—"
              }
            />
            <InfoRow
              icon="barbell-outline"
              label="Weight"
              value={animal.weight ? `${animal.weight} kg` : "—"}
            />
            <InfoRow
              icon="male-female-outline"
              label="Gender"
              value={animal.gender || "—"}
            />
            <InfoRow
              icon="layers-outline"
              label="Type"
              value={animal.type || "—"}
            />
          </View>

          {/* ── Date Info ── */}
          <SectionHeader title="Dates" icon="calendar-outline" />
          <View style={s.infoBlock}>
            <InfoRow
              icon="gift-outline"
              label="Date of Birth"
              value={fmtDate(animal.dob)}
            />
            <InfoRow
              icon="cart-outline"
              label="Purchase Date"
              value={fmtDate(animal.purchase_date)}
            />
          </View>

          {/* ── Financial Info ── */}
          <SectionHeader title="Financial" icon="cash-outline" />
          <View style={s.infoBlock}>
            <InfoRow
              icon="cash-outline"
              label="Purchase Price"
              value={fmtPrice(animal.purchase_price)}
              highlight
            />
          </View>

          {/* ── Status ── */}
          <SectionHeader title="Status" icon="shield-checkmark-outline" />
          <View style={s.infoBlock}>
            <InfoRow
              icon="checkmark-circle-outline"
              label="Active"
              value={animal.isActive ? "Yes" : "No"}
            />
            <InfoRow
              icon="storefront-outline"
              label="Sold"
              value={animal.isSold ? "Yes" : "No"}
            />
          </View>

          {/* ── Notes ── */}
          {!!animal.notes && (
            <>
              <SectionHeader title="Notes" icon="document-text-outline" />
              <View style={s.notesBox}>
                <Text style={s.notesText}>{animal.notes}</Text>
              </View>
            </>
          )}

          {/* ── Actions ── */}
          <View style={s.actionRow}>
            <TouchableOpacity style={s.btnPrimary} activeOpacity={0.8}>
              <Ionicons name="eye-outline" size={15} color="#fff" />
              <Text style={s.btnPrimaryText}>View Full Record</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.btnOutline} activeOpacity={0.8}>
              <Ionicons name="create-outline" size={15} color={C.dark} />
              <Text style={s.btnOutlineText}>Edit</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </Animated.View>
  );
}

// ── Main Page
export default function CowPage() {
  const router = useRouter();

  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const scrollY = useRef(new Animated.Value(0)).current;

  const headerHeight = scrollY.interpolate({
    inputRange: [0, SCROLL_THRESHOLD],
    outputRange: [HEADER_EXPANDED, HEADER_COLLAPSED],
    extrapolate: "clamp",
  });
  const statsOpacity = scrollY.interpolate({
    inputRange: [0, SCROLL_THRESHOLD * 0.55],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });
  const statsTranslate = scrollY.interpolate({
    inputRange: [0, SCROLL_THRESHOLD],
    outputRange: [0, -24],
    extrapolate: "clamp",
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.vetGetCows();
      setAnimals(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("CowPage load error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const toggleCard = (id: string) =>
    setExpandedId((prev) => (prev === id ? null : id));

  const totalAnimals = animals.length;
  const activeAnimals = animals.filter((a) => a.isActive && !a.isSold).length;
  const soldAnimals = animals.filter((a) => a.isSold).length;

  return (
    <View style={s.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.dark} />

      {/* ── Collapsing Header ── */}
      <Animated.View style={[s.header, { height: headerHeight }]}>
        <LinearGradient
          colors={["#BB6B3F", "#8B6854"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={s.headerGlow} pointerEvents="none" />
        <View style={s.headerGlow2} pointerEvents="none" />

        {/* Top row */}
        <View style={s.headerTopRow}>
          <TouchableOpacity style={s.iconBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Animals</Text>
          <TouchableOpacity
            style={s.iconBtn}
            onPress={() => setShowScanner(true)}
          >
            <Ionicons name="qr-code-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Stats — fade on scroll */}
        <Animated.View
          style={[
            s.statsStrip,
            {
              opacity: statsOpacity,
              transform: [{ translateY: statsTranslate }],
            },
          ]}
        >
          <View style={s.statItem}>
            <Text style={s.statValue}>{totalAnimals}</Text>
            <Text style={s.statLabel}>Total</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={[s.statValue, { color: "#86efac" }]}>
              {activeAnimals}
            </Text>
            <Text style={s.statLabel}>Active</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={[s.statValue, { color: "#fca5a5" }]}>
              {soldAnimals}
            </Text>
            <Text style={s.statLabel}>Sold</Text>
          </View>
        </Animated.View>
      </Animated.View>

      {/* ── Content ── */}
      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={s.loadingText}>Loading animals...</Text>
        </View>
      ) : animals.length === 0 ? (
        <View style={s.centered}>
          <View style={s.emptyIconBox}>
            <Ionicons name="paw-outline" size={34} color={C.textLight} />
          </View>
          <Text style={s.emptyTitle}>No Animals Found</Text>
          <Text style={s.emptySubtitle}>Pull down to refresh</Text>
        </View>
      ) : (
        <Animated.FlatList
          data={animals}
          keyExtractor={(a) => a.id}
          renderItem={({ item, index }) => (
            <AnimalCard
              animal={item}
              index={index}
              expanded={expandedId === item.id}
              onToggle={toggleCard}
            />
          )}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false },
          )}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={C.primary}
              colors={[C.primary]}
            />
          }
          ListFooterComponent={<View style={{ height: 48 }} />}
        />
      )}

      {/* ── QR Scanner Modal ── */}
      <Modal visible={showScanner} animationType="slide">
        <Scanner
          title="Scan Animal Tag"
          subtitle="Scan the QR code on animal's ear tag"
          onScanned={(data: string) => {
            setShowScanner(false);
            router.push({
              pathname: "/(veterinary)/scanner-result",
              params: { data },
            } as any);
          }}
          onClose={() => setShowScanner(false)}
        />
      </Modal>
    </View>
  );
}

// ── Styles
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },

  // Header
  header: {
    paddingTop: IS_IOS ? 54 : STATUS_BAR_HEIGHT + 12,
    paddingHorizontal: 20,
    overflow: "hidden",
    zIndex: 10,
  },
  headerGlow: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: C.primary,
    opacity: 0.25,
  },
  headerGlow2: {
    position: "absolute",
    bottom: -20,
    left: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#fff",
    opacity: 0.06,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.4,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
  },
  statsStrip: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.18)",
    borderRadius: 14,
    overflow: "hidden",
  },
  statItem: { flex: 1, alignItems: "center", paddingVertical: 10 },
  statDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
    marginVertical: 8,
  },
  statValue: { fontSize: 17, fontWeight: "800", color: "#fff" },
  statLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.55)",
    marginTop: 2,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  // List
  listContent: { padding: 14 },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: { fontSize: 14, color: C.textMuted },
  emptyIconBox: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#EDD8C4",
  },
  emptyTitle: { fontSize: 17, fontWeight: "800", color: C.text },
  emptySubtitle: { fontSize: 13, color: C.textMuted, textAlign: "center" },

  // Card shell
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: "#EDD8C4",
    overflow: "hidden",
  },
  cardExpanded: {
    borderColor: C.primary,
    shadowColor: C.dark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 8,
  },

  // Card header row
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  cardInfo: { flex: 1, gap: 5, minWidth: 0 },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    flexWrap: "wrap",
  },
  cowName: { fontSize: 15, fontWeight: "700", color: C.text, flexShrink: 1 },
  tagPill: {
    backgroundColor: C.card,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "#EDD8C4",
  },
  tagPillText: {
    fontSize: 11,
    fontWeight: "800",
    color: C.dark,
    letterSpacing: 0.5,
  },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: C.bg,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#EDD8C4",
  },
  chipText: { fontSize: 11, fontWeight: "600", color: C.accent },

  cardRight: { alignItems: "flex-end", gap: 6 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: "700" },

  // Expanded body
  cardBody: { paddingHorizontal: 14, paddingBottom: 16 },
  bodyDivider: {
    height: 1.5,
    backgroundColor: C.card,
    marginBottom: 14,
    borderRadius: 1,
  },

  // Identity banner
  identityBanner: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
    backgroundColor: C.bg,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#EDD8C4",
  },
  identityInfo: { flex: 1 },
  identityName: { fontSize: 19, fontWeight: "800", color: C.text },
  identityBreed: { fontSize: 13, color: C.textMuted, marginTop: 2 },

  // Section header
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: C.accent,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  // Info block + row
  infoBlock: {
    backgroundColor: C.bg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EDD8C4",
    overflow: "hidden",
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EDD8C4",
    gap: 10,
  },
  infoIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
  },
  infoLabel: {
    flex: 1,
    fontSize: 13,
    color: C.textMuted,
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 13,
    fontWeight: "700",
    color: C.text,
    textAlign: "right",
    maxWidth: "50%",
  },

  // Notes
  notesBox: {
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 13,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#EDD8C4",
  },
  notesText: { fontSize: 13, color: C.textMuted, lineHeight: 20 },

  // Actions
  actionRow: { flexDirection: "row", gap: 10 },
  btnPrimary: {
    flex: 1,
    backgroundColor: C.primary,
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  btnPrimaryText: { fontSize: 13, fontWeight: "700", color: "#fff" },
  btnOutline: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: C.primary,
  },
  btnOutlineText: { fontSize: 13, fontWeight: "700", color: C.dark },
});
