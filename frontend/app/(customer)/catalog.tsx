import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Alert,
  TextInput,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../src/services/api";
import { Colors, CategoryColors } from "../../src/constants/colors";
import ProductCard from "../../src/components/ProductCard";
import Button from "../../src/components/Button";
import LoadingScreen from "../../src/components/LoadingScreen";

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

export default function CatalogScreen() {
  const [admins, setAdmins] = useState<any[]>([]);
  const [selectedAdmin, setSelectedAdmin] = useState<any | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
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
      if (!selectedAdmin) {
        const rawAdmins = await api.getAdmins();
        const normalized = rawAdmins.map((a: any) => ({
          ...a,
          id: a.id || a._id || a.admin_id,
        }));
        setAdmins(normalized);
        setLoading(false);
        return;
      }
      const productsData = await api.getCatalogProducts(
        selectedAdmin?.id,
        selectedCategory || undefined,
      );
      const categoriesData = await api.getCategories();
      setProducts(productsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error("Catalog error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedAdmin, selectedCategory]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
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

  if (loading) return <LoadingScreen />;

  return (
    <SafeAreaView style={styles.container}>
      {/* ─── ADMIN / SHOP LIST ─── */}
      {!selectedAdmin && (
        <>
          <View style={styles.pageHeader}>
            <Text style={styles.pageTitle}>Shops</Text>
            <Text style={styles.pageSubtitle}>
              Select a shop to browse products
            </Text>
          </View>

          <ScrollView
            contentContainerStyle={styles.adminList}
            showsVerticalScrollIndicator={false}
          >
            {admins.map((admin, index) => (
              <TouchableOpacity
                key={admin.id}
                style={styles.adminCard}
                onPress={() => {
                  setSelectedAdmin(admin);
                  setSelectedCategory(null);
                  setLoading(true);
                }}
                activeOpacity={0.85}
              >
                {/* Icon Circle */}
                <View style={styles.adminIconCircle}>
                  <Ionicons name="storefront" size={22} color="#fff" />
                </View>

                {/* Info */}
                <View style={styles.adminInfo}>
                  <Text style={styles.adminName}>
                    {admin.shop_name || admin.name}
                  </Text>
                  {admin.address ? (
                    <Text style={styles.adminAddress} numberOfLines={1}>
                      <Ionicons
                        name="location-outline"
                        size={11}
                        color="#aaa"
                      />{" "}
                      {typeof admin.address === "string"
                        ? admin.address
                        : admin.address?.tower || ""}
                    </Text>
                  ) : null}
                </View>

                <Ionicons name="chevron-forward" size={18} color="#ccc" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      )}

      {/* ─── PRODUCT LIST ─── */}
      {selectedAdmin && (
        <>
          {/* Header */}
          <View style={styles.productHeader}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => {
                setSelectedAdmin(null);
                setProducts([]);
                setCategories([]);
              }}
            >
              <Ionicons name="arrow-back" size={20} color={Colors.text} />
            </TouchableOpacity>

            <View style={styles.productHeaderText}>
              <Text style={styles.pageTitle}>
                {selectedAdmin.shop_name || selectedAdmin.name}
              </Text>
              <Text style={styles.pageSubtitle}>
                {products.length} products available
              </Text>
            </View>
          </View>

          {/* Category Chips */}
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

          {/* Products Grid */}
          <ScrollView
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            showsVerticalScrollIndicator={false}
          >
            {products.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="cube-outline" size={52} color="#ddd" />
                <Text style={styles.emptyText}>No products found</Text>
              </View>
            ) : (
              <View style={styles.productsGrid}>
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onPress={() => openSubscriptionModal(product)}
                  />
                ))}
              </View>
            )}
          </ScrollView>
        </>
      )}

      {/* ─── SUBSCRIPTION MODAL ─── */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            {/* Drag Handle */}
            <View style={styles.dragHandle} />

            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{selectedProduct?.name}</Text>
                <Text style={styles.modalPrice}>
                  ₹{selectedProduct?.price} / {selectedProduct?.unit}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={18} color={Colors.text} />
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
                  <Ionicons name="remove" size={18} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.qtyValue}>{quantity}</Text>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => setQuantity((q) => q + 1)}
                >
                  <Ionicons name="add" size={18} color={Colors.text} />
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
                      pattern === p.value && styles.patternCardActive,
                    ]}
                    onPress={() => setPattern(p.value)}
                  >
                    <Ionicons
                      name={p.icon as any}
                      size={20}
                      color={pattern === p.value ? "#fff" : Colors.primary}
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
                          customDays.includes(day.value) &&
                            styles.dayCircleActive,
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
  container: {
    flex: 1,
    backgroundColor: "#F8F7F4",
  },

  /* ── Page Header ── */
  pageHeader: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1A1A1A",
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: 13,
    color: "#999",
    marginTop: 2,
  },

  /* ── Admin List ── */
  adminList: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 30,
  },
  adminCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  adminIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  adminInfo: {
    flex: 1,
  },
  adminName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  adminAddress: {
    fontSize: 12,
    color: "#aaa",
    marginTop: 3,
  },

  /* ── Product Header ── */
  productHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  productHeaderText: { flex: 1 },

  /* ── Category Chips ── */
  categoryRow: {
    paddingHorizontal: 20,
    paddingVertical: 6, // reduced from 10
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6, // reduced from 8
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eee",
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 12, // reduced from 13
    fontWeight: "600",
    color: "#888",
  },
  chipTextActive: {
    color: "#fff",
  },

  /* ── Products ── */
  productsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 30,
    justifyContent: "space-between",
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    color: "#ccc",
    fontWeight: "500",
  },

  /* ── Modal ── */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 34,
    maxHeight: "90%",
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#E0E0E0",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1A1A1A",
    letterSpacing: -0.3,
  },
  modalPrice: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: "600",
    marginTop: 4,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
  },
  divider: {
    height: 1,
    backgroundColor: "#F0F0F0",
    marginVertical: 16,
  },

  /* ── Quantity ── */
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#999",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 12,
    marginTop: 4,
  },
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
  qtyValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1A1A1A",
    minWidth: 30,
    textAlign: "center",
  },

  /* ── Pattern Cards ── */
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
  patternLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  patternLabelActive: {
    color: "#fff",
  },
  patternDesc: {
    fontSize: 11,
    color: "#999",
  },

  /* ── Custom Days ── */
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
  dayCircleActive: {
    backgroundColor: Colors.primary,
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#999",
  },
  dayLabelActive: {
    color: "#fff",
  },
});
