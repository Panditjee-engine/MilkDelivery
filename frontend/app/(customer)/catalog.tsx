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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../src/services/api";
import { Colors, CategoryColors } from "../../src/constants/colors";
import ProductCard from "../../src/components/ProductCard";
import Button from "../../src/components/Button";
import LoadingScreen from "../../src/components/LoadingScreen";

/* ---------------- CONSTANTS ----------------  29 - jan - 6:00 pm*/
const patterns = [
  { value: "daily", label: "Daily", description: "Every day" },
  { value: "alternate", label: "Alternate", description: "Every other day" },
  { value: "custom", label: "Custom", description: "Choose specific days" },
  { value: "buy_once", label: "Buy Once", description: "One-time purchase" },
];

const weekDays = [
  { value: 0, label: "Mon" },
  { value: 1, label: "Tue" },
  { value: 2, label: "Wed" },
  { value: 3, label: "Thu" },
  { value: 4, label: "Fri" },
  { value: 5, label: "Sat" },
  { value: 6, label: "Sun" },
];

/* ---------------- SCREEN ---------------- */
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

  /* ---------------- DATA ---------------- */
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
      //chnages 27-jan
      const productsData = await api.getCatalogProducts(
        selectedAdmin?.id,
        selectedCategory || undefined,
      );
      //till here
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

  /* ---------------- SUBSCRIBE ---------------- */
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
      Alert.alert("Error", "Please select at least one day");
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

      Alert.alert("Success", "Subscription created!");
      setModalVisible(false);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------------- UI ---------------- */
  if (loading) return <LoadingScreen />;

  return (
    <SafeAreaView style={styles.container}>
      {/* ---------- ADMIN LIST ---------- */}
      {!selectedAdmin && (
        <>
          <View style={styles.header}>
            <Text style={styles.title}>Shops</Text>
            <Text style={styles.subtitle}>Choose a shop</Text>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20 }}>
            {admins.map((admin) => (
              <TouchableOpacity
                key={admin.id}
                style={styles.adminCard}
                onPress={() => {
                  setSelectedAdmin(admin);
                  setSelectedCategory(null);
                  setLoading(true);
                }}
              >
                <Ionicons
                  name="storefront-outline"
                  size={20}
                  color={Colors.primary}
                />
                <Text style={styles.shopName}>
                  {admin.shop_name || admin.name}
                </Text>
                <Text style={styles.adminAddress}>{admin.address}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      )}

      {/* ---------- PRODUCTS ---------- */}
      {selectedAdmin && (
        <>
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => {
                setSelectedAdmin(null);
                setProducts([]);
                setCategories([]);
              }}
            >
              <Ionicons name="arrow-back" size={24} />
            </TouchableOpacity>

            <View>
              <Text style={styles.title}>{selectedAdmin.shop_name}</Text>
              <Text style={styles.subtitle}>Products</Text>
            </View>
          </View>

          {/* Categories */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesContainer}
            contentContainerStyle={styles.categoriesContent}
          >
            <TouchableOpacity
              style={[
                styles.categoryChip,
                !selectedCategory && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(null)}
            >
              <Text style={styles.categoryText}>All</Text>
            </TouchableOpacity>

            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.value}
                style={[
                  styles.categoryChip,
                  selectedCategory === cat.value && styles.categoryChipActive,
                  {
                    backgroundColor:
                      selectedCategory === cat.value
                        ? Colors.primary
                        : CategoryColors[cat.value] || Colors.surfaceSecondary,
                  },
                ]}
                onPress={() => setSelectedCategory(cat.value)}
              >
                <Text style={styles.categoryText}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Products */}
          <ScrollView
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            <View style={styles.productsGrid}>
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onPress={() => openSubscriptionModal(product)}
                />
              ))}
            </View>
          </ScrollView>
        </>
      )}

      {/* ---------- SUBSCRIPTION MODAL ---------- */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* --------- Modal Header --------- */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedProduct?.name}</Text>

              {/* Close Button */}
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {/* Quantity */}
            <Text>Quantity:</Text>
            <TextInput
              style={styles.quantityInput}
              keyboardType="numeric"
              value={quantity.toString()}
              onChangeText={(text) => setQuantity(Number(text))}
            />

            {/* Pattern */}
            {patterns.map((p) => (
              <TouchableOpacity
                key={p.value}
                style={[
                  styles.patternOption,
                  pattern === p.value && styles.patternOptionSelected,
                ]}
                onPress={() => setPattern(p.value)}
              >
                <Text style={{ fontWeight: "700" }}>{p.label}</Text>
                <Text>{p.description}</Text>
              </TouchableOpacity>
            ))}

            {/* Custom days */}
            {pattern === "custom" && (
              <View style={styles.weekDaysContainer}>
                {weekDays.map((day) => (
                  <TouchableOpacity
                    key={day.value}
                    style={[
                      styles.dayChip,
                      customDays.includes(day.value) && styles.dayChipSelected,
                    ]}
                    onPress={() => toggleCustomDay(day.value)}
                  >
                    <Text>{day.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Button
              title="Subscribe Now"
              onPress={handleSubscribe}
              loading={submitting}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* ---------------- STYLES ---------------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: { padding: 20 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 20,
  },

  title: { fontSize: 22, fontWeight: "700" },
  subtitle: { fontSize: 14, color: Colors.textSecondary },

  adminCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  shopName: { fontSize: 18, fontWeight: "700" },
  adminAddress: { fontSize: 12, color: Colors.textSecondary },

  categoriesContainer: { maxHeight: 50 },
  categoriesContent: { paddingHorizontal: 20 },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  categoryChipActive: { backgroundColor: Colors.primary },
  categoryText: { color: Colors.textInverse },

  productsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 20,
    justifyContent: "space-between",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.surface,
    padding: 24,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 16 },

  quantityInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 8,
    marginBottom: 12,
    borderRadius: 8,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  patternOption: {
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
  },
  patternOptionSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },

  weekDaysContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12,
    marginTop: 8,
  },
  dayChip: {
    padding: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    marginRight: 6,
    marginBottom: 6,
  },
  dayChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
});
