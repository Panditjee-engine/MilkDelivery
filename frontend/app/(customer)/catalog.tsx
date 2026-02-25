import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Alert,
  Dimensions,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../src/services/api";
import { Colors } from "../../src/constants/colors";
import Button from "../../src/components/Button";
import LoadingScreen from "../../src/components/LoadingScreen";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_WIDTH = 160;

const patterns = [
  {
    value: "daily",
    label: "Daily",
    description: "Every day",
    icon: "sunny-outline",
  },
  {
    value: "alternate",
    label: "Alternate",
    description: "Every other day",
    icon: "repeat-outline",
  },
  {
    value: "custom",
    label: "Custom",
    description: "Choose specific days",
    icon: "calendar-outline",
  },
  {
    value: "buy_once",
    label: "Buy Once",
    description: "One-time purchase",
    icon: "bag-check-outline",
  },
];

const weekDays = [
  { value: 0, label: "M" },
  { value: 1, label: "T" },
  { value: 2, label: "W" },
  { value: 3, label: "T" },
  { value: 4, label: "F" },
  { value: 5, label: "S" },
  { value: 6, label: "S" },
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

function getCategoryTheme(category: string) {
  return CATEGORY_THEMES[category?.toLowerCase()] || CATEGORY_THEMES.other;
}

// Formats unit: "2l" → "2 Litres", "500ml" → "500 ML", "1kg" → "1 KG", else capitalize
function formatUnit(unit: string): string {
  if (!unit) return "";
  const lower = unit.toLowerCase().trim();
  const match = lower.match(/^(\d+\.?\d*)\s*(l|litre|litres|liter|liters)$/);
  if (match) return `${match[1]} Litres`;
  const mlMatch = lower.match(/^(\d+\.?\d*)\s*ml$/);
  if (mlMatch) return `${mlMatch[1]} ML`;
  const kgMatch = lower.match(/^(\d+\.?\d*)\s*kg$/);
  if (kgMatch) return `${kgMatch[1]} KG`;
  const gMatch = lower.match(/^(\d+\.?\d*)\s*g$/);
  if (gMatch) return `${gMatch[1]} G`;
  return unit.charAt(0).toUpperCase() + unit.slice(1);
}

// ── Modern Product Card ──────────────────────────────────────────────────────
function ModernProductCard({
  product,
  onPress,
}: {
  product: any;
  onPress: () => void;
}) {
  const theme = getCategoryTheme(product.category);
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.88}
    >
      <View style={[styles.cardImageBox, { backgroundColor: theme.bg }]}>
        {product.image ? (
          <Image
            source={{ uri: product.image }}
            style={styles.cardImage}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[
              styles.cardIconCircle,
              { backgroundColor: theme.accent + "22" },
            ]}
          >
            <Ionicons name={theme.icon as any} size={32} color={theme.accent} />
          </View>
        )}
        {!product.is_available && (
          <View style={styles.outOfStockBadge}>
            <Text style={styles.outOfStockText}>Out of stock</Text>
          </View>
        )}
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardNameRow}>
          <Text style={styles.cardName} numberOfLines={1}>
            {product.name}
          </Text>
          <Text style={[styles.cardUnit, { color: theme.accent }]}>
            {formatUnit(product.unit)}
          </Text>
        </View>
        <Text style={[styles.cardPrice, { color: theme.accent }]}>
          ₹{product.price}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────────────
export default function CatalogScreen() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [pattern, setPattern] = useState("daily");
  const [customDays, setCustomDays] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const [productsData, categoriesData, adminsData] = await Promise.all([
        api.getCatalogProducts(undefined, selectedCategory || undefined),
        api.getCategories(),
        api.getAdmins(),
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
      setAdmins(
        adminsData.map((a: any) => ({ ...a, id: a.id || a._id || a.admin_id })),
      );
    } catch (error) {
      console.error("Catalog error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedCategory]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const getAdminName = (adminId: string) => {
    const admin = admins.find((a) => a.id === adminId);
    return admin?.shop_name || admin?.name || null;
  };

  const openSubscriptionModal = (product: any) => {
    setSelectedProduct(product);
    setQuantity(1);
    setPattern("daily");
    setCustomDays([]);
    setModalVisible(true);
  };

  const toggleCustomDay = (day: number) => {
    setCustomDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const handleSubscribe = async () => {
    if (pattern === "custom" && customDays.length === 0) {
      Alert.alert(
        "Select Days",
        "Please select at least one day for delivery.",
      );
      return;
    }
    setSubmitting(true);
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      await api.createSubscription({
        product_id: selectedProduct.id,
        quantity,
        pattern,
        custom_days: pattern === "custom" ? customDays : null,
        start_date: tomorrow.toISOString().split("T")[0],
        end_date:
          pattern === "buy_once" ? tomorrow.toISOString().split("T")[0] : null,
      });
      Alert.alert("🎉 Success", "Your subscription has been created!");
      setModalVisible(false);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to create subscription");
    } finally {
      setSubmitting(false);
    }
  };

  const groupedProducts = React.useMemo(() => {
    if (selectedCategory) {
      const label =
        categories.find((c) => c.value === selectedCategory)?.label ||
        selectedCategory;
      return [{ value: selectedCategory, label, items: products }];
    }
    const map: Record<string, any[]> = {};
    products.forEach((p) => {
      const cat = p.category || "other";
      if (!map[cat]) map[cat] = [];
      map[cat].push(p);
    });
    return Object.entries(map).map(([catValue, items]) => ({
      value: catValue,
      label: categories.find((c) => c.value === catValue)?.label || catValue,
      items,
    }));
  }, [products, selectedCategory, categories]);

  if (loading) return <LoadingScreen />;

  const modalTheme = getCategoryTheme(selectedProduct?.category);
  const shopName = getAdminName(selectedProduct?.admin_id);

  return (
    <SafeAreaView style={styles.container}>
      {/* ─── HEADER ─── */}
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Shop</Text>
        <Text style={styles.pageSubtitle}>
          {products.length} products available
        </Text>
      </View>

      {/* ─── CATEGORY CHIPS ─── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryRow}
        style={{ maxHeight: 44 }}
      >
        <TouchableOpacity
          style={[styles.chip, !selectedCategory && styles.chipActive]}
          onPress={() => setSelectedCategory(null)}
        >
          <Text
            style={[
              styles.chipText,
              !selectedCategory && styles.chipTextActive,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.value}
            style={[
              styles.chip,
              selectedCategory === cat.value && styles.chipActive,
            ]}
            onPress={() => setSelectedCategory(cat.value)}
          >
            <Text
              style={[
                styles.chipText,
                selectedCategory === cat.value && styles.chipTextActive,
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ─── PRODUCT SECTIONS ─── */}
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {products.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={52} color="#ddd" />
            <Text style={styles.emptyText}>No products found</Text>
          </View>
        ) : (
          groupedProducts.map(({ value, label, items }) => (
            <View key={value} style={styles.categorySection}>
              <View style={styles.categoryHeader}>
                <View style={styles.categoryTitleRow}>
                  <View
                    style={[
                      styles.categoryDot,
                      { backgroundColor: getCategoryTheme(value).accent },
                    ]}
                  />
                  <Text style={styles.categoryTitle}>{label}</Text>
                </View>
                <Text style={styles.categoryCount}>{items.length} items</Text>
              </View>

              <FlatList
                data={items}
                horizontal
                keyExtractor={(item) => item.id?.toString()}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalList}
                renderItem={({ item }) => (
                  <ModernProductCard
                    product={item}
                    onPress={() => openSubscriptionModal(item)}
                  />
                )}
              />
            </View>
          ))
        )}
      </ScrollView>

      {/* ─── SUBSCRIPTION MODAL ─── */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.dragHandle} />

            {/* Product + Shop header */}
            <View
              style={[
                styles.modalProductHeader,
                { backgroundColor: modalTheme.bg },
              ]}
            >
              <View
                style={[
                  styles.modalIconCircle,
                  { backgroundColor: modalTheme.accent + "22" },
                ]}
              >
                <Ionicons
                  name={modalTheme.icon as any}
                  size={32}
                  color={modalTheme.accent}
                />
              </View>
              <View style={{ flex: 1 }}>
                {/* Shop name — big, at top */}
                {shopName && (
                  <Text style={styles.modalShopName}>{shopName}</Text>
                )}
                <Text style={styles.modalTitle}>{selectedProduct?.name}</Text>
                <View style={styles.modalMetaRow}>
                  <Text
                    style={[styles.modalPrice, { color: modalTheme.accent }]}
                  >
                    ₹{selectedProduct?.price}
                  </Text>
                  <Text style={styles.modalDot}>·</Text>
                  <Text
                    style={[styles.modalUnit, { color: modalTheme.accent }]}
                  >
                    {formatUnit(selectedProduct?.unit)}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={18} color="#555" />
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Quantity label then stepper */}
              <Text style={styles.sectionLabel}>Quantity</Text>
              <Text style={styles.quantityHint}>
                How many{" "}
                <Text style={{ fontWeight: "700", color: "#1A1A1A" }}>
                  {formatUnit(selectedProduct?.unit)}
                </Text>{" "}
                per delivery?
              </Text>
              <View style={styles.quantityRow}>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                >
                  <Ionicons name="remove" size={18} color={Colors.text} />
                </TouchableOpacity>
                <View style={styles.qtyValueBox}>
                  <Text style={styles.qtyValue}>{quantity}</Text>
                  <Text
                    style={[styles.qtyUnitLabel, { color: modalTheme.accent }]}
                  >
                    {formatUnit(selectedProduct?.unit)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.qtyBtn,
                    { backgroundColor: modalTheme.accent },
                  ]}
                  onPress={() => setQuantity((q) => q + 1)}
                >
                  <Ionicons name="add" size={18} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* Pattern */}
              <Text style={styles.sectionLabel}>Delivery Pattern</Text>
              <View style={styles.patternGrid}>
                {patterns.map((p) => (
                  <TouchableOpacity
                    key={p.value}
                    style={[
                      styles.patternCard,
                      pattern === p.value && {
                        ...styles.patternCardActive,
                        backgroundColor: modalTheme.accent,
                        borderColor: modalTheme.accent,
                      },
                    ]}
                    onPress={() => setPattern(p.value)}
                  >
                    <Ionicons
                      name={p.icon as any}
                      size={20}
                      color={pattern === p.value ? "#fff" : modalTheme.accent}
                    />
                    <Text
                      style={[
                        styles.patternLabel,
                        pattern === p.value && styles.patternLabelActive,
                      ]}
                    >
                      {p.label}
                    </Text>
                    <Text
                      style={[
                        styles.patternDesc,
                        pattern === p.value && {
                          color: "rgba(255,255,255,0.75)",
                        },
                      ]}
                    >
                      {p.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Custom Days */}
              {pattern === "custom" && (
                <>
                  <Text style={styles.sectionLabel}>Select Days</Text>
                  <View style={styles.daysRow}>
                    {weekDays.map((day) => (
                      <TouchableOpacity
                        key={day.value}
                        style={[
                          styles.dayCircle,
                          customDays.includes(day.value) && {
                            backgroundColor: modalTheme.accent,
                          },
                        ]}
                        onPress={() => toggleCustomDay(day.value)}
                      >
                        <Text
                          style={[
                            styles.dayLabel,
                            customDays.includes(day.value) &&
                              styles.dayLabelActive,
                          ]}
                        >
                          {day.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <View style={{ height: 20 }} />
              <Button
                title={submitting ? "Creating..." : "Subscribe Now"}
                onPress={handleSubscribe}
                loading={submitting}
              />
              <View style={{ height: 16 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F7F4" },

  pageHeader: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 8 },
  pageTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1A1A1A",
    letterSpacing: -0.5,
  },
  pageSubtitle: { fontSize: 13, color: "#999", marginTop: 2 },

  categoryRow: { paddingHorizontal: 20, paddingVertical: 6, gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eee",
    marginRight: 8,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 12, fontWeight: "600", color: "#888" },
  chipTextActive: { color: "#fff" },

  categorySection: { marginTop: 28 },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  categoryTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  categoryDot: { width: 8, height: 8, borderRadius: 4 },
  categoryTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1A1A1A",
    letterSpacing: -0.2,
  },
  categoryCount: { fontSize: 12, color: "#bbb", fontWeight: "600" },
  horizontalList: { paddingLeft: 20, paddingRight: 8, gap: 12 },

  /* ── Card ── */
  card: {
    width: CARD_WIDTH,
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardImageBox: { height: 120, justifyContent: "center", alignItems: "center" },
  cardImage: { width: "100%", height: "100%" },
  cardIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  outOfStockBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  outOfStockText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  cardBody: { padding: 10, gap: 4 },
  cardNameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 4,
  },
  cardName: { fontSize: 13, fontWeight: "700", color: "#1A1A1A", flex: 1 },
  cardUnit: { fontSize: 11, fontWeight: "700" },
  cardPrice: { fontSize: 16, fontWeight: "800", marginTop: 2 },

  /* ── Empty ── */
  emptyState: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 15, color: "#ccc", fontWeight: "500" },

  /* ── Modal ── */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 34,
    maxHeight: "92%",
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#E0E0E0",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },

  modalProductHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 16,
    padding: 14,
    marginBottom: 4,
  },
  modalIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },

  /* Shop name — big, prominent */
  modalShopName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1A1A1A",
    letterSpacing: -0.3,
    marginBottom: 2,
  },

  modalTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#555",
    marginBottom: 4,
  },

  modalMetaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  modalPrice: { fontSize: 15, fontWeight: "800" },
  modalDot: { fontSize: 14, color: "#ccc" },
  modalUnit: { fontSize: 13, fontWeight: "600" },

  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.07)",
    justifyContent: "center",
    alignItems: "center",
  },
  divider: { height: 1, backgroundColor: "#F0F0F0", marginVertical: 16 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#bbb",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 6,
    marginTop: 4,
  },

  /* Quantity hint text */
  quantityHint: { fontSize: 13, color: "#aaa", marginBottom: 14 },

  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    gap: 20,
  },
  qtyBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },

  /* Quantity value + unit stacked */
  qtyValueBox: { alignItems: "center", minWidth: 60 },
  qtyValue: { fontSize: 26, fontWeight: "800", color: "#1A1A1A" },
  qtyUnitLabel: { fontSize: 11, fontWeight: "700", marginTop: 1 },

  patternGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 24,
  },
  patternCard: {
    width: "47%",
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#F8F8F8",
    borderWidth: 1.5,
    borderColor: "transparent",
    gap: 6,
  },
  patternCardActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  patternLabel: { fontSize: 14, fontWeight: "700", color: "#1A1A1A" },
  patternLabelActive: { color: "#fff" },
  patternDesc: { fontSize: 11, color: "#999" },

  daysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  dayCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  dayLabel: { fontSize: 12, fontWeight: "700", color: "#999" },
  dayLabelActive: { color: "#fff" },
});
