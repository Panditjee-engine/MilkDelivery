import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Animated,
  Vibration,
  Dimensions,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../src/services/api";
import { Colors } from "../../src/constants/colors";
import Button from "../../src/components/Button";
import LoadingScreen from "../../src/components/LoadingScreen";

const CARD_WIDTH = 130;

const patterns = [
  { value: "daily",     label: "Daily",     description: "Subscription",  icon: "sunny-outline",      isSubscription: true  },
  { value: "alternate", label: "Alternate",  description: "Order",         icon: "repeat-outline",     isSubscription: false },
  { value: "custom",    label: "Custom",     description: "Order",         icon: "calendar-outline",   isSubscription: false },
  { value: "buy_once",  label: "Buy Once",   description: "Order",         icon: "bag-check-outline",  isSubscription: false },
];

const weekDays = [
  { value: 0, label: "M" }, { value: 1, label: "T" }, { value: 2, label: "W" },
  { value: 3, label: "T" }, { value: 4, label: "F" }, { value: 5, label: "S" }, { value: 6, label: "S" },
];

const CATEGORY_THEMES: Record<string, { bg: string; accent: string; icon: string }> = {
  milk:       { bg: "#EAF4FF", accent: "#3B82F6", icon: "water" },
  dairy:      { bg: "#FFF4E6", accent: "#F59E0B", icon: "ice-cream" },
  bakery:     { bg: "#FEF2F2", accent: "#EF4444", icon: "pizza" },
  fruits:     { bg: "#F0FDF4", accent: "#22C55E", icon: "nutrition" },
  vegetables: { bg: "#F0FDF4", accent: "#16A34A", icon: "leaf" },
  essentials: { bg: "#F5F3FF", accent: "#8B5CF6", icon: "basket" },
  other:      { bg: "#F8F7F4", accent: "#6B7280", icon: "cube" },
};

function getCategoryTheme(category: string) {
  return CATEGORY_THEMES[category?.toLowerCase()] || CATEGORY_THEMES.other;
}

function formatUnit(unit: string): string {
  if (!unit) return "";
  const lower = unit.toLowerCase().trim();
  const match = lower.match(/^(\d+\.?\d*)\s*(l|litre|litres|liter|liters)$/);
  if (match) return `${match[1]}L`;
  const mlMatch = lower.match(/^(\d+\.?\d*)\s*ml$/);
  if (mlMatch) return `${mlMatch[1]}ml`;
  const kgMatch = lower.match(/^(\d+\.?\d*)\s*kg$/);
  if (kgMatch) return `${kgMatch[1]}kg`;
  const gMatch = lower.match(/^(\d+\.?\d*)\s*g$/);
  if (gMatch) return `${gMatch[1]}g`;
  return unit.charAt(0).toUpperCase() + unit.slice(1);
}

// ─── Success Modal ─────────────────────────────────────────────────────────────
function SuccessModal({
  visible,
  isSubscription,
  productName,
  onClose,
}: {
  visible: boolean;
  isSubscription: boolean;
  productName: string;
  onClose: () => void;
}) {
  const scaleAnim    = useRef(new Animated.Value(0.8)).current;
  const opacityAnim  = useRef(new Animated.Value(0)).current;
  const checkScale   = useRef(new Animated.Value(0)).current;
  const slideAnim    = useRef(new Animated.Value(18)).current;
  const ringAnim     = useRef(new Animated.Value(0.6)).current;
  const ringOpacity  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      [scaleAnim, opacityAnim, checkScale, slideAnim, ringAnim, ringOpacity].forEach(a => a.stopAnimation());
      scaleAnim.setValue(0.8);
      opacityAnim.setValue(0);
      checkScale.setValue(0);
      slideAnim.setValue(18);
      ringAnim.setValue(0.6);
      ringOpacity.setValue(0);

      Animated.parallel([
        Animated.spring(scaleAnim,   { toValue: 1, useNativeDriver: true, damping: 14, stiffness: 180 }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start(() => {
        Animated.spring(checkScale,  { toValue: 1, useNativeDriver: true, damping: 8, stiffness: 220 }).start();
        Animated.spring(slideAnim,   { toValue: 0, useNativeDriver: true, damping: 16, stiffness: 160 }).start();
        Animated.parallel([
          Animated.spring(ringAnim,   { toValue: 1, useNativeDriver: true, damping: 10, stiffness: 200 }),
          Animated.timing(ringOpacity,{ toValue: 0.2, duration: 300, useNativeDriver: true }),
        ]).start();
      });
      Vibration.vibrate([0, 60, 40, 80]);
    }
  }, [visible]);

  const color = isSubscription ? "#22c55e" : Colors.primary;
  const bgLight = isSubscription ? "#f0fdf4" : Colors.primary + "12";
  const border  = isSubscription ? "#bbf7d0" : Colors.primary + "33";

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={ms.overlay}>
        <Animated.View style={[ms.card, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>

          {/* Icon */}
          <View style={ms.iconWrap}>
            <Animated.View style={[ms.ring, { backgroundColor: color, opacity: ringOpacity, transform: [{ scale: ringAnim }] }]} />
            <Animated.View style={[ms.iconCircle, { backgroundColor: bgLight, borderColor: border }, { transform: [{ scale: checkScale }] }]}>
              <Ionicons name={isSubscription ? "repeat" : "bag-check"} size={28} color={color} />
            </Animated.View>
          </View>

          <Text style={ms.title}>
            {isSubscription ? "Subscription Created!" : "Order Placed!"}
          </Text>
          <Text style={ms.subtitle}>
            {isSubscription
              ? `${productName} will be delivered every day starting tomorrow.`
              : `Your order for ${productName} has been placed successfully.`}
          </Text>

          {/* Tag */}
          <Animated.View style={[ms.tagRow, { opacity: opacityAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={[ms.tag, { backgroundColor: bgLight, borderColor: border }]}>
              <Ionicons name={isSubscription ? "calendar-outline" : "flash-outline"} size={12} color={color} />
              <Text style={[ms.tagText, { color }]}>
                {isSubscription ? "Recurring daily delivery" : "One-time delivery"}
              </Text>
            </View>
          </Animated.View>

          <TouchableOpacity
            style={[ms.btn, { backgroundColor: color, shadowColor: color }]}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Text style={ms.btnText}>Great!</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── Custom Days Error Modal ───────────────────────────────────────────────────
function InfoModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const scaleAnim   = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.85); opacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim,   { toValue: 1, useNativeDriver: true, damping: 15, stiffness: 200 }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
      Vibration.vibrate(60);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={ms.overlay}>
        <Animated.View style={[ms.card, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
          <View style={ms.iconWrap}>
            <View style={[ms.iconCircle, { backgroundColor: "#fffbeb", borderColor: "#fde68a" }]}>
              <Ionicons name="calendar-outline" size={28} color="#f59e0b" />
            </View>
          </View>
          <Text style={ms.title}>Select Days</Text>
          <Text style={ms.subtitle}>Please choose at least one day for your custom delivery schedule.</Text>
          <TouchableOpacity style={[ms.btn, { backgroundColor: "#f59e0b", shadowColor: "#f59e0b" }]} onPress={onClose} activeOpacity={0.85}>
            <Text style={ms.btnText}>Got it</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const ms = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.52)",
    justifyContent: "center", alignItems: "center", padding: 32,
  },
  card: {
    backgroundColor: "#fff", borderRadius: 28,
    paddingHorizontal: 24, paddingTop: 32, paddingBottom: 24,
    width: "100%", alignItems: "center",
    shadowColor: "#000", shadowOpacity: 0.16, shadowRadius: 28,
    shadowOffset: { width: 0, height: 10 }, elevation: 14,
  },
  iconWrap: { width: 90, height: 90, justifyContent: "center", alignItems: "center", marginBottom: 18 },
  ring: {
    position: "absolute", width: 90, height: 90, borderRadius: 45,
  },
  iconCircle: {
    width: 64, height: 64, borderRadius: 32,
    justifyContent: "center", alignItems: "center",
    borderWidth: 2,
  },
  title: { fontSize: 20, fontWeight: "800", color: "#111", marginBottom: 8, letterSpacing: -0.4, textAlign: "center" },
  subtitle: { fontSize: 13, color: "#888", textAlign: "center", lineHeight: 20, marginBottom: 20 },
  tagRow: { marginBottom: 22 },
  tag: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
  },
  tagText: { fontSize: 11, fontWeight: "700" },
  btn: {
    width: "100%", paddingVertical: 15, borderRadius: 16,
    alignItems: "center", shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5,
  },
  btnText: { fontSize: 16, fontWeight: "800", color: "#fff" },
});

// ─── Product Card ─────────────────────────────────────────────────────────────
function ModernProductCard({ product, onPress }: { product: any; onPress: () => void }) {
  const theme = getCategoryTheme(product.category);
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.88}>
      <View style={[styles.cardImageBox, { backgroundColor: theme.bg }]}>
        {product.image ? (
          <Image source={{ uri: product.image }} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <View style={[styles.cardIconCircle, { backgroundColor: theme.accent + "22" }]}>
            <Ionicons name={theme.icon as any} size={24} color={theme.accent} />
          </View>
        )}
        {!product.is_available && (
          <View style={styles.outOfStockBadge}>
            <Text style={styles.outOfStockText}>Out of stock</Text>
          </View>
        )}
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={1}>{product.name}</Text>
        <View style={styles.cardFooter}>
          <Text style={[styles.cardPrice, { color: theme.accent }]}>₹{product.price}</Text>
          <Text style={[styles.cardUnit, { color: theme.accent + "99" }]}>{formatUnit(product.unit)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Category Section ─────────────────────────────────────────────────────────
function CategorySection({ value, label, items, onPress }: {
  value: string; label: string; items: any[]; onPress: (item: any) => void;
}) {
  const theme = getCategoryTheme(value);
  return (
    <View style={styles.categorySection}>
      <View style={styles.categoryHeader}>
        <View style={styles.categoryTitleRow}>
          <View style={[styles.categoryDot, { backgroundColor: theme.accent }]} />
          <Text style={styles.categoryTitle}>{label}</Text>
          <View style={[styles.categoryCountBadge, { backgroundColor: theme.accent + "18" }]}>
            <Text style={[styles.categoryCount, { color: theme.accent }]}>{items.length}</Text>
          </View>
        </View>
      </View>
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalList}
        directionalLockEnabled={true}
      >
        {items.map((item) => (
          <ModernProductCard key={item.id?.toString()} product={item} onPress={() => onPress(item)} />
        ))}
      </ScrollView>
    </View>
  );
}

// ─── Pattern pill badge ────────────────────────────────────────────────────────
function PatternBadge({ isSubscription }: { isSubscription: boolean }) {
  return (
    <View style={[
      styles.patternBadge,
      { backgroundColor: isSubscription ? "#f0fdf4" : Colors.primary + "12" },
    ]}>
      <Ionicons
        name={isSubscription ? "repeat-outline" : "flash-outline"}
        size={10}
        color={isSubscription ? "#22c55e" : Colors.primary}
      />
      <Text style={[styles.patternBadgeText, { color: isSubscription ? "#22c55e" : Colors.primary }]}>
        {isSubscription ? "Subscription" : "Order"}
      </Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function CatalogScreen() {
  const [products, setProducts]               = useState<any[]>([]);
  const [categories, setCategories]           = useState<any[]>([]);
  const [admins, setAdmins]                   = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading]                 = useState(true);
  const [refreshing, setRefreshing]           = useState(false);
  const [modalVisible, setModalVisible]       = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [quantity, setQuantity]               = useState(1);
  const [pattern, setPattern]                 = useState("daily");
  const [customDays, setCustomDays]           = useState<number[]>([]);
  const [submitting, setSubmitting]           = useState(false);
  const [successVisible, setSuccessVisible]   = useState(false);
  const [infoVisible, setInfoVisible]         = useState(false);
  const [lastIsSubscription, setLastIsSubscription] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [productsData, categoriesData, adminsData] = await Promise.all([
        api.getCatalogProducts(undefined, selectedCategory || undefined),
        api.getCategories(),
        api.getAdmins(),
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
      setAdmins(adminsData.map((a: any) => ({ ...a, id: a.id || a._id || a.admin_id })));
    } catch (error) {
      console.error("Catalog error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory]);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const getAdminName = (adminId: string) => {
    const admin = admins.find((a) => a.id === adminId);
    return admin?.shop_name || admin?.name || null;
  };

  const openModal = (product: any) => {
    setSelectedProduct(product);
    setQuantity(1);
    setPattern("daily");
    setCustomDays([]);
    setModalVisible(true);
  };

  const toggleCustomDay = (day: number) => {
    setCustomDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]);
  };

  const isCurrentPatternSubscription = pattern === "daily";

  const handleSubmit = async () => {
    if (pattern === "custom" && customDays.length === 0) {
      setInfoVisible(true);
      return;
    }
    setSubmitting(true);
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const startDate = tomorrow.toISOString().split("T")[0];

      if (isCurrentPatternSubscription) {
        // daily → subscription
        await api.createSubscription({
          product_id: selectedProduct.id,
          quantity,
          pattern,
          custom_days: null,
          start_date: startDate,
          end_date: null,
        });
      } else {
        // alternate / custom / buy_once → order ->  have to build api in backend to handle alternate and custom patterns as one-time orders with instructions for fulfillment team
        await api.createOrder({
          product_id: selectedProduct.id,
          quantity,
          pattern,
          custom_days: pattern === "custom" ? customDays : null,
          delivery_date: startDate,
        });
      }

      setLastIsSubscription(isCurrentPatternSubscription);
      setModalVisible(false);
      setSuccessVisible(true);
    } catch (e: any) {
      // Could show an error modal here
    } finally {
      setSubmitting(false);
    }
  };

  const groupedProducts = React.useMemo(() => {
    if (selectedCategory) {
      const label = categories.find((c) => c.value === selectedCategory)?.label || selectedCategory;
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
  const shopName   = getAdminName(selectedProduct?.admin_id);

  const ListHeader = (
    <>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Shop</Text>
        <Text style={styles.pageSubtitle}>{products.length} products available</Text>
      </View>
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryRow}
        style={styles.categoryChipsScroll}
      >
        <TouchableOpacity
          style={[styles.chip, !selectedCategory && styles.chipActive]}
          onPress={() => setSelectedCategory(null)}
        >
          <Text style={[styles.chipText, !selectedCategory && styles.chipTextActive]}>All</Text>
        </TouchableOpacity>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.value}
            style={[styles.chip, selectedCategory === cat.value && styles.chipActive]}
            onPress={() => setSelectedCategory(cat.value)}
          >
            <Text style={[styles.chipText, selectedCategory === cat.value && styles.chipTextActive]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={groupedProducts}
        keyExtractor={(item) => item.value}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="cube-outline" size={36} color="#ccc" />
            </View>
            <Text style={styles.emptyText}>No products found</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <CategorySection value={item.value} label={item.label} items={item.items} onPress={openModal} />
        )}
      />

      {/* ── Subscribe / Order Modal ── */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.dragHandle} />

            {/* Product header */}
            <View style={[styles.modalProductHeader, { backgroundColor: modalTheme.bg }]}>
              <View style={[styles.modalIconCircle, { backgroundColor: modalTheme.accent + "22" }]}>
                <Ionicons name={modalTheme.icon as any} size={26} color={modalTheme.accent} />
              </View>
              <View style={{ flex: 1 }}>
                {shopName && <Text style={styles.modalShopName}>{shopName}</Text>}
                <Text style={styles.modalTitle}>{selectedProduct?.name}</Text>
                <View style={styles.modalMetaRow}>
                  <Text style={[styles.modalPrice, { color: modalTheme.accent }]}>₹{selectedProduct?.price}</Text>
                  <Text style={styles.modalDot}>·</Text>
                  <Text style={[styles.modalUnit, { color: modalTheme.accent }]}>{formatUnit(selectedProduct?.unit)}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={16} color="#555" />
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            <ScrollView showsVerticalScrollIndicator={false}>

              {/* Quantity */}
              <Text style={styles.sectionLabel}>Quantity</Text>
              <View style={styles.quantityRow}>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                >
                  <Ionicons name="remove" size={16} color={Colors.text} />
                </TouchableOpacity>
                <View style={styles.qtyValueBox}>
                  <Text style={styles.qtyValue}>{quantity}</Text>
                  <Text style={[styles.qtyUnitLabel, { color: modalTheme.accent }]}>
                    {formatUnit(selectedProduct?.unit)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.qtyBtn, { backgroundColor: modalTheme.accent }]}
                  onPress={() => setQuantity((q) => q + 1)}
                >
                  <Ionicons name="add" size={16} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* Pattern */}
              <Text style={styles.sectionLabel}>Delivery Pattern</Text>
              <View style={styles.patternGrid}>
                {patterns.map((p) => {
                  const isActive = pattern === p.value;
                  const activeColor = p.isSubscription ? "#22c55e" : Colors.primary;
                  return (
                    <TouchableOpacity
                      key={p.value}
                      style={[
                        styles.patternCard,
                        isActive && { backgroundColor: activeColor, borderColor: activeColor },
                      ]}
                      onPress={() => setPattern(p.value)}
                    >
                      <View style={styles.patternCardTop}>
                        <Ionicons
                          name={p.icon as any}
                          size={18}
                          color={isActive ? "#fff" : activeColor}
                        />
                        {/* Subscription / Order mini badge */}
                        <View style={[
                          styles.patternTypeBadge,
                          { backgroundColor: isActive ? "rgba(255,255,255,0.2)" : (p.isSubscription ? "#f0fdf4" : Colors.primary + "12") }
                        ]}>
                          <Text style={[styles.patternTypeBadgeText, { color: isActive ? "#fff" : (p.isSubscription ? "#22c55e" : Colors.primary) }]}>
                            {p.description}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.patternLabel, isActive && { color: "#fff" }]}>{p.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Live badge showing what will be created */}
              <View style={[
                styles.submitTypeBanner,
                { backgroundColor: isCurrentPatternSubscription ? "#f0fdf4" : Colors.primary + "10",
                  borderColor: isCurrentPatternSubscription ? "#bbf7d0" : Colors.primary + "30" }
              ]}>
                <Ionicons
                  name={isCurrentPatternSubscription ? "repeat-outline" : "flash-outline"}
                  size={14}
                  color={isCurrentPatternSubscription ? "#22c55e" : Colors.primary}
                />
                <Text style={[styles.submitTypeBannerText, { color: isCurrentPatternSubscription ? "#15803d" : Colors.primary }]}>
                  {isCurrentPatternSubscription
                    ? "This will create a daily subscription"
                    : "This will place a one-time order"}
                </Text>
              </View>

              {/* Custom days */}
              {pattern === "custom" && (
                <>
                  <Text style={styles.sectionLabel}>Select Days</Text>
                  <View style={styles.daysRow}>
                    {weekDays.map((day) => (
                      <TouchableOpacity
                        key={day.value}
                        style={[styles.dayCircle, customDays.includes(day.value) && { backgroundColor: modalTheme.accent }]}
                        onPress={() => toggleCustomDay(day.value)}
                      >
                        <Text style={[styles.dayLabel, customDays.includes(day.value) && styles.dayLabelActive]}>
                          {day.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <View style={{ height: 16 }} />
              <Button
                title={
                  submitting
                    ? (isCurrentPatternSubscription ? "Subscribing..." : "Placing Order...")
                    : (isCurrentPatternSubscription ? "Subscribe Now" : "Place Order")
                }
                onPress={handleSubmit}
                loading={submitting}
              />
              <View style={{ height: 16 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Success Modal ── */}
      <SuccessModal
        visible={successVisible}
        isSubscription={lastIsSubscription}
        productName={selectedProduct?.name || ""}
        onClose={() => setSuccessVisible(false)}
      />

      {/* ── Info Modal (custom days error) ── */}
      <InfoModal visible={infoVisible} onClose={() => setInfoVisible(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: "#F8F7F4" },
  listContent:  { paddingBottom: 40 },

  pageHeader:   { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 6 },
  pageTitle:    { fontSize: 24, fontWeight: "800", color: "#1A1A1A", letterSpacing: -0.5 },
  pageSubtitle: { fontSize: 12, color: "#aaa", marginTop: 2 },

  categoryChipsScroll: { flexShrink: 0 },
  categoryRow: { paddingHorizontal: 20, paddingVertical: 8, gap: 8 },
  chip: {
    paddingHorizontal: 13, paddingVertical: 6,
    borderRadius: 20, backgroundColor: "#fff",
    borderWidth: 1, borderColor: "#eee", marginRight: 6,
  },
  chipActive:     { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText:       { fontSize: 12, fontWeight: "600", color: "#888" },
  chipTextActive: { color: "#fff" },

  categorySection: { marginTop: 22 },
  categoryHeader: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 20, marginBottom: 10,
  },
  categoryTitleRow:  { flexDirection: "row", alignItems: "center", gap: 8 },
  categoryDot:       { width: 7, height: 7, borderRadius: 4 },
  categoryTitle:     { fontSize: 15, fontWeight: "800", color: "#1A1A1A", letterSpacing: -0.2 },
  categoryCountBadge:{
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10,
  },
  categoryCount: { fontSize: 11, fontWeight: "700" },
  horizontalList: { paddingLeft: 20, paddingRight: 8, gap: 10 },

  // ── Smaller card ──
  card: {
    width: CARD_WIDTH, backgroundColor: "#fff", borderRadius: 16, overflow: "hidden",
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 }, elevation: 2,
    alignSelf: "flex-start",
  },
  cardImageBox: { height: 88, justifyContent: "center", alignItems: "center" },
  cardImage:    { width: "100%", height: "100%" },
  cardIconCircle: { width: 48, height: 48, borderRadius: 24, justifyContent: "center", alignItems: "center" },
  outOfStockBadge: {
    position: "absolute", bottom: 6, left: 6,
    backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5,
  },
  outOfStockText: { color: "#fff", fontSize: 9, fontWeight: "700" },
  cardBody:   { padding: 8, paddingBottom: 10 },
  cardName:   { fontSize: 12, fontWeight: "700", color: "#1A1A1A", marginBottom: 4 },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardPrice:  { fontSize: 14, fontWeight: "800" },
  cardUnit:   { fontSize: 10, fontWeight: "600" },

  emptyState:   { alignItems: "center", paddingTop: 70, gap: 10 },
  emptyIconWrap:{
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: "#f5f5f5", justifyContent: "center", alignItems: "center",
  },
  emptyText:    { fontSize: 14, color: "#bbb", fontWeight: "500" },

  // ── Modal ──
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 22, paddingTop: 12, paddingBottom: 34, maxHeight: "92%",
  },
  dragHandle: { width: 38, height: 4, backgroundColor: "#E0E0E0", borderRadius: 2, alignSelf: "center", marginBottom: 14 },
  modalProductHeader: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 16, padding: 12, marginBottom: 4,
  },
  modalIconCircle: { width: 50, height: 50, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  modalShopName:   { fontSize: 14, fontWeight: "800", color: "#1A1A1A", letterSpacing: -0.3, marginBottom: 1 },
  modalTitle:      { fontSize: 12, fontWeight: "600", color: "#666", marginBottom: 4 },
  modalMetaRow:    { flexDirection: "row", alignItems: "center", gap: 5 },
  modalPrice:      { fontSize: 14, fontWeight: "800" },
  modalDot:        { fontSize: 13, color: "#ccc" },
  modalUnit:       { fontSize: 12, fontWeight: "600" },
  closeBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.07)", justifyContent: "center", alignItems: "center",
  },
  divider: { height: 1, backgroundColor: "#F0F0F0", marginVertical: 14 },
  sectionLabel: {
    fontSize: 10, fontWeight: "700", color: "#bbb",
    letterSpacing: 1, textTransform: "uppercase", marginBottom: 10, marginTop: 2,
  },
  quantityRow: { flexDirection: "row", alignItems: "center", marginBottom: 22, gap: 16 },
  qtyBtn: { width: 38, height: 38, borderRadius: 11, backgroundColor: "#F5F5F5", justifyContent: "center", alignItems: "center" },
  qtyValueBox: { alignItems: "center", minWidth: 54 },
  qtyValue: { fontSize: 24, fontWeight: "800", color: "#1A1A1A" },
  qtyUnitLabel: { fontSize: 10, fontWeight: "700", marginTop: 1 },

  patternGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 },
  patternCard: {
    width: "47%", padding: 12, borderRadius: 14,
    backgroundColor: "#F8F8F8", borderWidth: 1.5, borderColor: "transparent", gap: 6,
  },
  patternCardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  patternTypeBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  patternTypeBadgeText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.3 },
  patternLabel: { fontSize: 13, fontWeight: "700", color: "#1A1A1A" },

  submitTypeBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16,
  },
  submitTypeBannerText: { fontSize: 12, fontWeight: "700", flex: 1 },

  daysRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  dayCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#F5F5F5", justifyContent: "center", alignItems: "center" },
  dayLabel: { fontSize: 11, fontWeight: "700", color: "#999" },
  dayLabelActive: { color: "#fff" },

  patternBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  patternBadgeText: { fontSize: 9, fontWeight: "800" },
});