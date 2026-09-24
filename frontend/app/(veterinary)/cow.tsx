import { useCachedScreenState } from "../../src/hooks/useCachedScreenState";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  StatusBar,
  Platform,
  Modal,
  RefreshControl,
  TouchableOpacity,
  Image,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { api } from "../../src/services/api";
import Scanner from "../../src/components/Scanner";

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
  border: "#EDD8C4",
  white: "#FFFFFF",
};

const IS_IOS = Platform.OS === "ios";
const STATUS_BAR_HEIGHT = IS_IOS ? 0 : (StatusBar.currentHeight ?? 0);

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

type FilterKey = "all" | "active" | "inactive" | "sold";

// ── Helpers
function fmtDate(d?: string) {
  if (!d) return "—";
  const parts = d.split("-");
  if (parts.length !== 3) return d;
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${parts[2]} ${months[Number(parts[1]) - 1]} ${parts[0]}`;
}

function fmtPrice(p?: number) {
  if (!p) return "—";
  return "₹" + p.toLocaleString("en-IN");
}

function getStatusProps(a: Animal) {
  if (a.isSold)
    return { color: "#dc2626", bg: "#fef2f2", label: "Sold", icon: "pricetag" };
  if (a.isActive)
    return { color: "#16a34a", bg: "#f0fdf4", label: "Active", icon: "checkmark" };
  return { color: "#d97706", bg: "#fffbeb", label: "Inactive", icon: "pause" };
}

// ── Avatar (memoized so the photo doesn't reload on toggle)
const AnimalAvatar = React.memo(function AnimalAvatar({
  animal,
  size = 56,
}: {
  animal: Animal;
  size?: number;
}) {
  const st = getStatusProps(animal);
  const isMale = animal.gender === "Male";
  const isCalf = (animal.age ?? 0) < 1;
  const source = useMemo(
    () => (animal.photo ? { uri: animal.photo } : undefined),
    [animal.photo],
  );

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
    <View style={{ width: size, height: size }}>
      {source ? (
        <Image
          source={source}
          resizeMethod="resize"
          fadeDuration={0}
          style={{
            width: size,
            height: size,
            borderRadius: size * 0.26,
            borderWidth: 1.5,
            borderColor: C.border,
            backgroundColor: C.card,
          }}
        />
      ) : (
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size * 0.26,
            backgroundColor: C.card,
            borderWidth: 1.5,
            borderColor: C.border,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name={iconName} size={Math.round(size * 0.5)} color={iconColor} />
        </View>
      )}
      <View style={[s.avatarBadge, { backgroundColor: st.color }]}>
        <Ionicons name={st.icon as any} size={9} color="#fff" />
      </View>
    </View>
  );
});

// ── Data Block
function Block({
  label,
  value,
  unit,
  sub,
  icon,
  wide,
  highlight,
}: {
  label: string;
  value: string;
  unit?: string;
  sub?: string;
  icon: keyof typeof Ionicons.glyphMap;
  wide?: boolean;
  highlight?: boolean;
}) {
  return (
    <View style={[s.block, wide && s.blockWide]}>
      <View style={s.blockTop}>
        <Text style={s.blockLabel}>{label}</Text>
        <Ionicons name={icon} size={14} color={highlight ? C.dark : C.accent} />
      </View>
      <View style={s.blockValueRow}>
        <Text
          style={[s.blockValue, highlight && { color: C.dark }]}
          numberOfLines={1}
        >
          {value}
        </Text>
        {!!unit && value !== "—" && <Text style={s.blockUnit}>{unit}</Text>}
      </View>
      {!!sub && <Text style={s.blockSub}>{sub}</Text>}
    </View>
  );
}

// ── Animal Card (plain views: no animation, no elevation, no clipping)
const AnimalCard = React.memo(function AnimalCard({
  animal,
  expanded,
  onToggle,
}: {
  animal: Animal;
  expanded: boolean;
  onToggle: (id: string) => void;
}) {
  const st = getStatusProps(animal);
  const isMale = animal.gender === "Male";
  const gColor = isMale ? "#1a4a8a" : "#7c3aed";
  const gBg = isMale ? "#EEF4FF" : "#FDF4FF";
  const ageText =
    animal.age !== undefined && animal.age !== null
      ? `${animal.age} yr${animal.age !== 1 ? "s" : ""}`
      : null;

  return (
    <View style={[s.card, expanded && s.cardExpanded]}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => onToggle(animal.id)}
        style={s.cardHeader}
      >
        <AnimalAvatar animal={animal} size={58} />

        <View style={s.cardInfo}>
          <View style={s.nameRow}>
            <Text style={s.cowName} numberOfLines={1}>
              {animal.name || "Unknown"}
            </Text>
            <Text style={s.cowTag}>#{animal.tag_number}</Text>
          </View>

          {!!animal.breed && (
            <Text style={s.breedText} numberOfLines={1}>
              {animal.breed}
            </Text>
          )}

          <View style={s.metaRow}>
            <View style={s.tagPill}>
              <Text style={s.tagPillLabel}>TAG</Text>
              <Text style={s.tagPillValue}>{animal.tag_number}</Text>
            </View>
            {!!animal.gender && (
              <View style={[s.chip, { backgroundColor: gBg, borderColor: gBg }]}>
                <Ionicons name={isMale ? "male" : "female"} size={10} color={gColor} />
                <Text style={[s.chipText, { color: gColor }]}>{animal.gender}</Text>
              </View>
            )}
            {!!ageText && (
              <View style={s.chip}>
                <Text style={s.chipText}>{ageText}</Text>
              </View>
            )}
            {animal.isLeasedIn && (
              <View style={[s.chip, { backgroundColor: "#EEF4FF", borderColor: "#EEF4FF" }]}>
                <Ionicons name="swap-horizontal-outline" size={10} color="#1a4a8a" />
                <Text style={[s.chipText, { color: "#1a4a8a" }]}>Leased in</Text>
              </View>
            )}
            {animal.isLeasedOut && (
              <View style={[s.chip, { backgroundColor: "#FEF2F2", borderColor: "#FEF2F2" }]}>
                <Ionicons name="lock-closed-outline" size={10} color="#dc2626" />
                <Text style={[s.chipText, { color: "#dc2626" }]}>Leased out</Text>
              </View>
            )}
          </View>
        </View>

        <View style={s.cardRight}>
          <View style={[s.statusBadge, { backgroundColor: st.bg }]}>
            <Text style={[s.statusText, { color: st.color }]}>{st.label}</Text>
          </View>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={18}
            color={C.textLight}
          />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={s.cardBody}>
          <View style={s.grid}>
            <Block
              label="WEIGHT"
              value={animal.weight ? String(animal.weight) : "—"}
              unit="kg"
              icon="barbell-outline"
            />
            <Block
              label="AGE"
              value={
                animal.age !== undefined && animal.age !== null
                  ? String(animal.age)
                  : "—"
              }
              unit={animal.age === 1 ? "yr" : "yrs"}
              icon="calendar-outline"
            />
            <Block
              label="GENDER"
              value={animal.gender || "—"}
              icon="male-female-outline"
            />
            <Block
              label="TYPE"
              value={animal.type || "—"}
              icon="layers-outline"
            />
            <Block
              label="DATE OF BIRTH"
              value={fmtDate(animal.dob)}
              icon="gift-outline"
            />
            <Block
              label="PURCHASE DATE"
              value={fmtDate(animal.purchase_date)}
              icon="cart-outline"
            />
            <Block
              label="PURCHASE PRICE"
              value={fmtPrice(animal.purchase_price)}
              icon="cash-outline"
              highlight
            />
            <Block
              label="STATUS"
              value={st.label}
              sub={animal.isSold ? "Sold" : animal.isActive ? "In herd" : "Not active"}
              icon="shield-checkmark-outline"
            />

            {animal.isLeasedIn && (
              <Block
                wide
                label="LEASED IN FROM"
                value={animal.lessorFarmName || "—"}
                sub={
                  animal.leaseEndDate
                    ? `Until ${fmtDate(animal.leaseEndDate)}`
                    : animal.leasedLocationLabel
                }
                icon="swap-horizontal-outline"
              />
            )}
            {animal.isLeasedOut && (
              <Block
                wide
                label="LEASED OUT TO"
                value={animal.leasedToFarmName || "—"}
                sub={
                  animal.leaseEndDate
                    ? `Until ${fmtDate(animal.leaseEndDate)}`
                    : animal.leasedLocationLabel
                }
                icon="lock-closed-outline"
              />
            )}
            {!!animal.notes && (
              <View style={[s.block, s.blockWide]}>
                <View style={s.blockTop}>
                  <Text style={s.blockLabel}>NOTES</Text>
                  <Ionicons name="document-text-outline" size={14} color={C.accent} />
                </View>
                <Text style={s.notesText}>{animal.notes}</Text>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
});

// ── Main Page
export default function CowPage() {
  const router = useRouter();

  const [animals, setAnimals] = useCachedScreenState<Animal[]>(
    "screen:(veterinary)/cow:animals",
    [],
  );
  const [loading, setLoading] = useState(
    () => api.getScreenSnapshot("screen:(veterinary)/cow:animals") === undefined,
  );
  const [refreshing, setRefreshing] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");

  const loadData = useCallback(async () => {
    setLoading(
      api.getScreenSnapshot("screen:(veterinary)/cow:animals") === undefined,
    );
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
    api.refreshLists();
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const toggleCard = useCallback(
    (id: string) => setExpandedId((prev) => (prev === id ? null : id)),
    [],
  );

  const handleScanned = (data: string) => {
    setShowScanner(false);
    const code = (data || "").trim();
    if (!code) return;
    const lower = code.toLowerCase();
    const match = animals.find(
      (a) =>
        (a.tag_number || "").toLowerCase() === lower ||
        String(a.id).toLowerCase() === lower,
    );
    setFilter("all");
    setQuery(match ? match.tag_number : code);
    if (match) setExpandedId(match.id);
  };

  // counts
  const counts = {
    all: animals.length,
    active: animals.filter((a) => a.isActive && !a.isSold).length,
    inactive: animals.filter((a) => !a.isActive && !a.isSold).length,
    sold: animals.filter((a) => a.isSold).length,
  };

  const FILTERS = [
    { key: "all" as FilterKey, label: "All Herd", dot: null as string | null },
    { key: "active" as FilterKey, label: "Active", dot: "#16a34a" },
    { key: "inactive" as FilterKey, label: "Inactive", dot: "#d97706" },
    { key: "sold" as FilterKey, label: "Sold", dot: "#dc2626" },
  ];

  const q = query.trim().toLowerCase();
  const visible = animals.filter((a) => {
    if (filter === "active" && !(a.isActive && !a.isSold)) return false;
    if (filter === "inactive" && !(!a.isActive && !a.isSold)) return false;
    if (filter === "sold" && !a.isSold) return false;
    if (!q) return true;
    return (
      (a.tag_number || "").toLowerCase().includes(q) ||
      (a.name || "").toLowerCase().includes(q) ||
      (a.breed || "").toLowerCase().includes(q)
    );
  });

  const syncing = loading || refreshing;

  return (
    <View style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* ── Top: search + scan ── */}
      <View style={s.top}>
        <View style={s.searchRow}>
          <TouchableOpacity
            style={s.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={20} color={C.text} />
          </TouchableOpacity>

          <View style={s.searchBox}>
            <Ionicons name="search-outline" size={18} color={C.textLight} />
            <TextInput
              style={s.searchInput}
              placeholder="Search Tag, Cow Name, Breed"
              placeholderTextColor={C.textLight}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
            />
            {!!query && (
              <TouchableOpacity onPress={() => setQuery("")}>
                <Ionicons name="close-circle" size={17} color={C.textLight} />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={s.scanBtn}
            onPress={() => setShowScanner(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="qr-code-outline" size={17} color="#fff" />
            <Text style={s.scanText}>Scan</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filterRow}
        >
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[s.filterChip, active && s.filterChipActive]}
                onPress={() => setFilter(f.key)}
                activeOpacity={0.85}
              >
                {!!f.dot && !active && (
                  <View style={[s.filterDot, { backgroundColor: f.dot }]} />
                )}
                <Text style={[s.filterText, active && { color: "#fff" }]}>
                  {f.label}
                </Text>
                <View style={[s.filterCount, active && s.filterCountActive]}>
                  <Text style={[s.filterCountText, active && { color: C.text }]}>
                    {counts[f.key]}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Content ── */}
      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={s.loadingText}>Loading animals...</Text>
        </View>
      ) : (
        <FlatList
          data={visible}
          extraData={expandedId}
          keyExtractor={(a) => a.id}
          removeClippedSubviews={false}
          initialNumToRender={8}
          renderItem={({ item }) => (
            <AnimalCard
              animal={item}
              expanded={expandedId === item.id}
              onToggle={toggleCard}
            />
          )}
          ListHeaderComponent={
            <View style={s.listHead}>
              <Text style={s.listTitle}>Animals</Text>
              <View style={s.syncPill}>
                <Ionicons
                  name={syncing ? "sync-outline" : "checkmark-circle-outline"}
                  size={13}
                  color={C.dark}
                />
                <Text style={s.syncText}>
                  {syncing ? "Syncing..." : `${visible.length} shown`}
                </Text>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <View style={s.emptyIconBox}>
                <Ionicons name="paw-outline" size={34} color={C.textLight} />
              </View>
              <Text style={s.emptyTitle}>No Animals Found</Text>
              <Text style={s.emptySubtitle}>
                {q || filter !== "all"
                  ? "Try a different search or filter"
                  : "Pull down to refresh"}
              </Text>
            </View>
          }
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
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
          onScanned={handleScanned}
          onClose={() => setShowScanner(false)}
        />
      </Modal>
    </View>
  );
}

// ── Styles
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },

  // Top
  top: {
    backgroundColor: C.bg,
    paddingTop: IS_IOS ? 54 : STATUS_BAR_HEIGHT + 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F5E6D8",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
  },
  backBtn: {
    width: 40,
    height: 44,
    borderRadius: 14,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.white,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.border,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: { flex: 1, fontSize: 13, color: C.text, paddingVertical: 0 },
  scanBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.text,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 44,
  },
  scanText: { color: "#fff", fontSize: 13, fontWeight: "800" },

  // Filters
  filterRow: { paddingHorizontal: 14, paddingTop: 12, gap: 8 },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.white,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: C.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  filterChipActive: { backgroundColor: C.text, borderColor: C.text },
  filterDot: { width: 7, height: 7, borderRadius: 3.5 },
  filterText: { fontSize: 12, fontWeight: "700", color: C.accent },
  filterCount: {
    backgroundColor: C.card,
    borderRadius: 9,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: "center",
  },
  filterCountActive: { backgroundColor: C.primary },
  filterCountText: { fontSize: 10, fontWeight: "800", color: C.dark },

  // List
  listContent: { paddingHorizontal: 14, paddingTop: 6 },
  listHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  listTitle: { fontSize: 20, fontWeight: "800", color: C.text },
  syncPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: C.card,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  syncText: { fontSize: 11, fontWeight: "700", color: C.dark },

  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: { fontSize: 14, color: C.textMuted },
  emptyWrap: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyIconBox: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: C.border,
  },
  emptyTitle: { fontSize: 17, fontWeight: "800", color: C.text },
  emptySubtitle: { fontSize: 13, color: C.textMuted, textAlign: "center" },

  // Card: constant border width, no elevation, no clipping
  card: {
    backgroundColor: C.white,
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: C.border,
  },
  cardExpanded: {
    borderColor: C.primary,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 12,
  },
  avatarBadge: {
    position: "absolute",
    right: -4,
    bottom: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: C.white,
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: { flex: 1, gap: 4, minWidth: 0 },
  nameRow: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  cowName: { fontSize: 17, fontWeight: "800", color: C.text, flexShrink: 1 },
  cowTag: { fontSize: 14, fontWeight: "600", color: C.textLight },
  breedText: { fontSize: 12, color: C.textMuted, fontWeight: "500" },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 2 },
  tagPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: C.text,
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  tagPillLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: C.primary,
    letterSpacing: 0.6,
  },
  tagPillValue: { fontSize: 11, fontWeight: "700", color: "#fff" },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: C.bg,
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: C.border,
  },
  chipText: { fontSize: 11, fontWeight: "600", color: C.accent },

  cardRight: { alignItems: "flex-end", gap: 8, alignSelf: "flex-start" },
  statusBadge: {
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  statusText: { fontSize: 10, fontWeight: "800" },

  // Expanded body
  cardBody: { paddingHorizontal: 12, paddingBottom: 14 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  block: {
    flexBasis: "47%",
    flexGrow: 1,
    backgroundColor: C.bg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
  },
  blockWide: { flexBasis: "100%" },
  blockTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  blockLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: C.textMuted,
    letterSpacing: 0.8,
  },
  blockValueRow: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  blockValue: { fontSize: 20, fontWeight: "800", color: C.text, flexShrink: 1 },
  blockUnit: { fontSize: 12, fontWeight: "600", color: C.textLight },
  blockSub: { fontSize: 11, color: C.accent, fontWeight: "600", marginTop: 3 },
  notesText: { fontSize: 13, color: C.textLight === "" ? "" : C.textMuted, lineHeight: 19 },
});