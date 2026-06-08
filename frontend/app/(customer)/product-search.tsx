import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../../src/constants/colors";
import { useAuth } from "../../src/contexts/AuthContext";
import { api } from "../../src/services/api";

const RECENT_SEARCH_KEY = "customer_recent_product_searches";
const SCREEN_WIDTH = Dimensions.get("window").width;
const GRID_GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - 40 - GRID_GAP) / 2;
const DAIRY_CATEGORIES = ["milk", "dairy"];
const CATEGORY_PRIORITY: Record<string, number> = { milk: 0, dairy: 1 };
const weekDays = [
  { value: 0, label: "M" },
  { value: 1, label: "T" },
  { value: 2, label: "W" },
  { value: 3, label: "T" },
  { value: 4, label: "F" },
  { value: 5, label: "S" },
  { value: 6, label: "S" },
];
const subscriptionPatterns = [
  { value: "daily", label: "Daily", icon: "sunny-outline", hint: "Every day" },
  { value: "alternate", label: "Alternate", icon: "repeat-outline", hint: "Every other day" },
  { value: "custom", label: "Custom", icon: "calendar-outline", hint: "Pick days" },
  { value: "buy_once", label: "Buy Once", icon: "bag-check-outline", hint: "One delivery" },
];

const CATEGORY_THEMES: Record<
  string,
  { bg: string; accent: string; icon: string }
> = {
  milk: { bg: "#EAF4FF", accent: "#3B82F6", icon: "water" },
  dairy: { bg: "#FFF4E6", accent: "#F59E0B", icon: "ice-cream" },
  bakery: { bg: "#FEF2F2", accent: "#EF4444", icon: "pizza" },
  fruits: { bg: "#F0FDF4", accent: "#22C55E", icon: "nutrition" },
  vegetables: { bg: "#F0FDF4", accent: "#16A34A", icon: "leaf" },
  essentials: { bg: "#F5F3FF", accent: "#8B5CF6", icon: "basket" },
  other: { bg: "#F8F7F4", accent: "#6B7280", icon: "cube" },
};

const getCategoryTheme = (category: string) =>
  CATEGORY_THEMES[category?.toLowerCase()] || CATEGORY_THEMES.other;
const isDairyProduct = (product: any) =>
  DAIRY_CATEGORIES.includes(product?.category?.toLowerCase());
const hasCompleteDeliveryAddress = (address?: any) =>
  Boolean(address?.tower?.trim?.() && address?.flat?.trim?.());

function formatUnit(unit?: string) {
  if (!unit) return "";
  const lower = unit.toLowerCase().trim();
  const match = lower.match(/^(\d+\.?\d*)\s*(l|litre|litres|liter|liters)$/);
  if (match) return `${match[1]}L`;
  return unit.charAt(0).toUpperCase() + unit.slice(1);
}

function ProductSearchCard({
  product,
  onPress,
  onBuyNow,
}: {
  product: any;
  onPress: () => void;
  onBuyNow: () => void;
}) {
  const theme = getCategoryTheme(product.category);
  const isDairy = DAIRY_CATEGORIES.includes(product.category?.toLowerCase());

  return (
    <TouchableOpacity style={s.productCard} activeOpacity={0.88} onPress={onPress}>
      <View style={[s.imageBox, { backgroundColor: theme.bg }]}>
        {product.image ? (
          <Image source={{ uri: product.image }} style={s.image} resizeMode="cover" />
        ) : (
          <View style={[s.iconCircle, { backgroundColor: theme.accent + "22" }]}>
            <Ionicons name={theme.icon as any} size={24} color={theme.accent} />
          </View>
        )}
        {isDairy && (
          <View style={s.subBadge}>
            <Ionicons name="repeat-outline" size={8} color="#fff" />
            <Text style={s.subBadgeText}>Sub</Text>
          </View>
        )}
      </View>
      <View style={s.productBody}>
        <Text style={s.productName} numberOfLines={2}>{product.name}</Text>
        <View style={s.productFooter}>
          <Text style={[s.price, { color: theme.accent }]}>₹{product.price}</Text>
          <Text style={[s.unit, { color: theme.accent + "99" }]}>{formatUnit(product.unit)}</Text>
        </View>
        <TouchableOpacity
          style={[s.buyNowBtn, { backgroundColor: theme.accent }]}
          onPress={(event) => {
            event.stopPropagation?.();
            onBuyNow();
          }}
          activeOpacity={0.86}
        >
          <Text style={s.buyNowText}>Buy Now</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default function ProductSearchScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [pattern, setPattern] = useState("daily");
  const [customDays, setCustomDays] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const adminId = (user as any)?.admin_id ?? (user as any)?.referral_admin_id;
      const [productData, categoryData, recentRaw] = await Promise.all([
        api.getCatalogProducts(adminId || undefined),
        api.getCategories(),
        AsyncStorage.getItem(RECENT_SEARCH_KEY),
      ]);
      setProducts(Array.isArray(productData) ? productData : []);
      setCategories(Array.isArray(categoryData) ? categoryData : []);
      setRecentSearches(recentRaw ? JSON.parse(recentRaw) : []);
    } catch (error) {
      console.error("Product search load failed:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (isFocused) loadData();
  }, [isFocused, loadData]);

  const saveRecentSearch = async (text: string) => {
    const value = text.trim();
    if (!value) return;
    const next = [value, ...recentSearches.filter((item) => item.toLowerCase() !== value.toLowerCase())].slice(0, 8);
    setRecentSearches(next);
    await AsyncStorage.setItem(RECENT_SEARCH_KEY, JSON.stringify(next));
  };

  const filteredProducts = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return products;
    return products.filter((product) => {
      const haystack = [
        product.name,
        product.category,
        product.description,
        product.unit,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(text);
    });
  }, [products, query]);

  const groupedProducts = useMemo(() => {
    const map: Record<string, any[]> = {};
    filteredProducts.forEach((product) => {
      const category = product.category || "other";
      if (!map[category]) map[category] = [];
      map[category].push(product);
    });
    return Object.entries(map)
      .map(([value, items]) => ({
        value,
        label: categories.find((cat) => cat.value === value)?.label || value,
        items,
      }))
      .sort((a, b) => {
        const aPriority = CATEGORY_PRIORITY[a.value.toLowerCase()] ?? 99;
        const bPriority = CATEGORY_PRIORITY[b.value.toLowerCase()] ?? 99;
        if (aPriority !== bPriority) return aPriority - bPriority;
        return a.label.localeCompare(b.label);
      });
  }, [filteredProducts, categories]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };
  const openProduct = (product: any) => {
    setSelectedProduct(product);
    setQuantity(1);
    setPattern(isDairyProduct(product) ? "daily" : "buy_once");
    setCustomDays([]);
    setFeedback("");
  };
  const openProductDetails = (product: any) => {
    router.push({
      pathname: "/(customer)/product-details",
      params: {
        id: product.id || product._id,
        product: encodeURIComponent(JSON.stringify(product)),
      },
    } as any);
  };
  const closeProduct = () => {
    if (submitting) return;
    setSelectedProduct(null);
    setFeedback("");
  };
  const toggleCustomDay = (day: number) => {
    setCustomDays((current) =>
      current.includes(day)
        ? current.filter((value) => value !== day)
        : [...current, day],
    );
  };
  const ensureAddress = async () => {
    const latestUser = await api.getMe();
    if (hasCompleteDeliveryAddress(latestUser?.address)) return true;
    setFeedback("Please add delivery address from Profile before ordering.");
    return false;
  };
  const handleCreateOrder = async () => {
    if (!selectedProduct) return;
    if (pattern === "custom" && customDays.length === 0) {
      setFeedback("Please choose at least one custom delivery day.");
      return;
    }
    setSubmitting(true);
    setFeedback("");
    try {
      if (!(await ensureAddress())) return;
      const amount = selectedProduct.price * quantity;
      const wallet = await api.getWallet();
      if ((wallet.balance ?? 0) < amount) {
        setFeedback("Wallet balance is low. Please recharge wallet first.");
        return;
      }
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const startDate = tomorrow.toISOString().split("T")[0];
      await api.createSubscription({
        product_id: selectedProduct.id,
        quantity,
        pattern,
        custom_days: pattern === "custom" ? customDays : null,
        start_date: startDate,
        end_date: pattern === "buy_once" ? startDate : null,
        amount,
      });
      setFeedback(pattern === "buy_once" ? "Order placed successfully." : "Subscription activated successfully.");
      setTimeout(() => setSelectedProduct(null), 700);
    } catch (error: any) {
      setFeedback(error?.message || "Could not create order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const ListHeader = (
    <View>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </TouchableOpacity>
        <View style={s.searchBox}>
          <Ionicons name="search-outline" size={18} color="#94A3B8" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search milk, paneer, ghee..."
            placeholderTextColor="#94A3B8"
            style={s.searchInput}
            returnKeyType="search"
            autoFocus
            onSubmitEditing={() => saveRecentSearch(query)}
          />
          {query ? (
            <TouchableOpacity onPress={() => setQuery("")}>
              <Ionicons name="close-circle" size={18} color="#CBD5E1" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <View style={s.recentBlock}>
        <View style={s.sectionTitleRow}>
          <Text style={s.sectionTitle}>Recent Search</Text>
          {recentSearches.length > 0 && (
            <TouchableOpacity
              onPress={async () => {
                setRecentSearches([]);
                await AsyncStorage.removeItem(RECENT_SEARCH_KEY);
              }}
            >
              <Text style={s.clearText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
        {recentSearches.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.recentRow}>
            {recentSearches.map((item) => (
              <TouchableOpacity key={item} style={s.recentChip} onPress={() => setQuery(item)}>
                <Ionicons name="time-outline" size={13} color={Colors.primary} />
                <Text style={s.recentChipText}>{item}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <Text style={s.emptyRecent}>Search products to build your recent list.</Text>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.loading}>
          <ActivityIndicator color={Colors.primary} />
          <Text style={s.loadingText}>Loading products...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <FlatList
        data={groupedProducts}
        keyExtractor={(item) => item.value}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={s.emptyState}>
            <Ionicons name="search-outline" size={34} color="#CBD5E1" />
            <Text style={s.emptyTitle}>No products found</Text>
            <Text style={s.emptySubtitle}>Try another product name or category.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={s.categorySection}>
            <View style={s.categoryHeader}>
              <Text style={s.categoryTitle}>{item.label}</Text>
              <View style={s.countBadge}>
                <Text style={s.countText}>{item.items.length}</Text>
              </View>
            </View>
            <View style={s.grid}>
              {item.items.map((product: any) => (
                <ProductSearchCard
                  key={product.id?.toString()}
                  product={product}
                  onPress={() => openProductDetails(product)}
                  onBuyNow={() => openProduct(product)}
                />
              ))}
            </View>
          </View>
        )}
      />
      <Modal visible={Boolean(selectedProduct)} transparent animationType="slide" onRequestClose={closeProduct}>
        <View style={s.modalOverlay}>
          <View style={s.sheet}>
            <View style={s.sheetHandle} />
            <View style={s.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={s.sheetTitle}>{selectedProduct?.name}</Text>
                <Text style={s.sheetSub}>
                  ₹{selectedProduct?.price} · {formatUnit(selectedProduct?.unit)}
                </Text>
              </View>
              <TouchableOpacity style={s.closeBtn} onPress={closeProduct}>
                <Ionicons name="close" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={s.modalLabel}>Quantity</Text>
            <View style={s.qtyRow}>
              <TouchableOpacity
                style={s.qtyBtn}
                onPress={() => setQuantity((value) => Math.max(1, value - 1))}
              >
                <Ionicons name="remove" size={18} color={Colors.primary} />
              </TouchableOpacity>
              <View style={s.qtyValueBox}>
                <Text style={s.qtyValue}>{quantity}</Text>
                <Text style={s.qtyUnit}>{formatUnit(selectedProduct?.unit)}</Text>
              </View>
              <TouchableOpacity
                style={[s.qtyBtn, s.qtyBtnActive]}
                onPress={() => setQuantity((value) => value + 1)}
              >
                <Ionicons name="add" size={18} color="#fff" />
              </TouchableOpacity>
            </View>

            <Text style={s.modalLabel}>
              {isDairyProduct(selectedProduct) ? "Delivery Option" : "Order Type"}
            </Text>
            <View style={s.patternGrid}>
              {(isDairyProduct(selectedProduct) ? subscriptionPatterns : [subscriptionPatterns[3]]).map((item) => {
                const active = pattern === item.value;
                return (
                  <TouchableOpacity
                    key={item.value}
                    style={[s.patternCard, active && s.patternCardActive]}
                    onPress={() => setPattern(item.value)}
                  >
                    <Ionicons
                      name={item.icon as any}
                      size={17}
                      color={active ? "#fff" : Colors.primary}
                    />
                    <Text style={[s.patternName, active && s.patternTextActive]}>{item.label}</Text>
                    <Text style={[s.patternHint, active && s.patternHintActive]}>{item.hint}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {pattern === "custom" && (
              <View style={s.daysRow}>
                {weekDays.map((day) => (
                  <TouchableOpacity
                    key={day.value}
                    style={[s.dayChip, customDays.includes(day.value) && s.dayChipActive]}
                    onPress={() => toggleCustomDay(day.value)}
                  >
                    <Text style={[s.dayText, customDays.includes(day.value) && s.dayTextActive]}>
                      {day.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Total</Text>
              <Text style={s.totalValue}>₹{((selectedProduct?.price ?? 0) * quantity).toFixed(2)}</Text>
            </View>
            {feedback ? <Text style={s.feedback}>{feedback}</Text> : null}
            <TouchableOpacity
              style={[s.primaryBtn, submitting && { opacity: 0.65 }]}
              onPress={handleCreateOrder}
              disabled={submitting}
            >
              <Text style={s.primaryBtnText}>
                {submitting
                  ? "Processing..."
                  : pattern === "buy_once"
                    ? "Place Order"
                    : "Subscribe Now"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F7F4" },
  content: { paddingBottom: 36 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 10,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#EEF2F7",
  },
  searchBox: {
    flex: 1,
    height: 44,
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#EEF2F7",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, fontSize: 14, fontWeight: "700", color: "#111827" },
  recentBlock: { paddingHorizontal: 20, paddingBottom: 12 },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: "900", color: "#111827" },
  clearText: { fontSize: 12, fontWeight: "800", color: Colors.primary },
  recentRow: { gap: 8, paddingRight: 20 },
  recentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.primary + "10",
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  recentChipText: { fontSize: 12, fontWeight: "800", color: Colors.primary },
  emptyRecent: { fontSize: 12, color: "#94A3B8", fontWeight: "600" },
  categorySection: { marginTop: 18 },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  categoryTitle: { fontSize: 16, fontWeight: "900", color: "#111827", textTransform: "capitalize" },
  countBadge: {
    backgroundColor: Colors.primary + "14",
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  countText: { fontSize: 11, fontWeight: "900", color: Colors.primary },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: GRID_GAP, paddingHorizontal: 20 },
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: "#fff",
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  imageBox: { height: 112, justifyContent: "center", alignItems: "center" },
  image: { width: "100%", height: "100%" },
  iconCircle: { width: 48, height: 48, borderRadius: 24, justifyContent: "center", alignItems: "center" },
  subBadge: {
    position: "absolute",
    top: 7,
    right: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "#f59e0b",
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 3,
  },
  subBadgeText: { fontSize: 8, fontWeight: "900", color: "#fff" },
  productBody: { padding: 10, paddingBottom: 12 },
  productName: { fontSize: 13, fontWeight: "900", color: "#111827", minHeight: 34 },
  productFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  price: { fontSize: 15, fontWeight: "900" },
  unit: { fontSize: 10.5, fontWeight: "800" },
  buyNowBtn: {
    marginTop: 9,
    borderRadius: 12,
    paddingVertical: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  buyNowText: { fontSize: 12, fontWeight: "900", color: "#fff" },
  emptyState: { alignItems: "center", paddingTop: 70, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "900", color: "#111827" },
  emptySubtitle: { fontSize: 13, color: "#94A3B8", fontWeight: "600" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  loadingText: { color: "#64748B", fontWeight: "700" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.48)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 30 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#CBD5E1", alignSelf: "center", marginBottom: 16 },
  sheetHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  sheetTitle: { fontSize: 20, fontWeight: "900", color: "#111827" },
  sheetSub: { fontSize: 13, color: "#64748B", fontWeight: "700", marginTop: 3 },
  closeBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  modalLabel: { fontSize: 12, fontWeight: "900", color: "#64748B", textTransform: "uppercase", marginBottom: 9, marginTop: 6 },
  qtyRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 14 },
  qtyBtn: { width: 44, height: 44, borderRadius: 15, backgroundColor: Colors.primary + "12", alignItems: "center", justifyContent: "center" },
  qtyBtnActive: { backgroundColor: Colors.primary },
  qtyValueBox: { minWidth: 76, alignItems: "center" },
  qtyValue: { fontSize: 28, fontWeight: "900", color: "#111827" },
  qtyUnit: { fontSize: 10, fontWeight: "800", color: "#94A3B8" },
  patternGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  patternCard: { width: (SCREEN_WIDTH - 50) / 2, borderRadius: 16, borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC", padding: 12 },
  patternCardActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  patternName: { fontSize: 13, fontWeight: "900", color: "#111827", marginTop: 8 },
  patternTextActive: { color: "#fff" },
  patternHint: { fontSize: 10.5, color: "#94A3B8", fontWeight: "700", marginTop: 3 },
  patternHintActive: { color: "rgba(255,255,255,0.78)" },
  daysRow: { flexDirection: "row", gap: 8, marginTop: 13, marginBottom: 4 },
  dayChip: { width: 34, height: 34, borderRadius: 12, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  dayChipActive: { backgroundColor: Colors.primary },
  dayText: { fontSize: 12, fontWeight: "900", color: "#64748B" },
  dayTextActive: { color: "#fff" },
  totalRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#F1F5F9", paddingTop: 14, marginTop: 14 },
  totalLabel: { fontSize: 13, fontWeight: "800", color: "#64748B" },
  totalValue: { fontSize: 20, fontWeight: "900", color: Colors.primary },
  feedback: { marginTop: 12, fontSize: 12, color: "#dc2626", fontWeight: "800", textAlign: "center" },
  primaryBtn: { marginTop: 14, backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 15, alignItems: "center" },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "900" },
});
