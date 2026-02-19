import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, TextInput, Alert, Modal, Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import SwipeToConfirm from "../../src/components/SwipeToConfirm";
import { api } from "../../src/services/api";
import { Colors } from "../../src/constants/colors";
import Button from "../../src/components/Button";
import LoadingScreen from "../../src/components/LoadingScreen";
import { useAuth } from "../../src/contexts/AuthContext";

type Product = {
  id?: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  stock: number;
  image?: string | null;
  is_available: boolean;
};

const CATEGORIES = ["milk", "dairy", "bakery", "fruits", "vegetables", "essentials"];

export default function InventoryScreen() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [addModal, setAddModal] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: "", category: "", unit: "", price: "", stock: "", image: "",
  });

  const fetchData = async () => {
    try {
      const data = await api.getProducts();
      setProducts(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const onRefresh = useCallback(() => { setRefreshing(true); fetchData(); }, []);

  const pickImageFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { Alert.alert("Permission required", "Gallery access is needed"); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6, base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      setNewProduct((p) => ({ ...p, image: `data:image/jpeg;base64,${result.assets[0].base64}` }));
    }
  };

  const isFormValid = useMemo(() => {
    const price = parseFloat(newProduct.price);
    const stock = parseInt(newProduct.stock, 10);
    if (!newProduct.name.trim() || !newProduct.category.trim() || !newProduct.unit.trim()) return false;
    if (!Number.isFinite(price) || price <= 0) return false;
    if (!Number.isInteger(stock) || stock < 0) return false;
    if (!newProduct.image || newProduct.image.length < 10) return false;
    return true;
  }, [newProduct]);

  const handleAddProduct = async () => {
    try {
      await api.createProduct({
        name: newProduct.name,
        category: newProduct.category.toLowerCase(),
        unit: newProduct.unit,
        price: Number(newProduct.price),
        stock: Number(newProduct.stock),
        image: newProduct.image,
        image_type: "base64",
      });
      setAddModal(false);
      setNewProduct({ name: "", category: "", unit: "", price: "", stock: "", image: "" });
      fetchData();
    } catch (e: any) { Alert.alert("Error", e.message); }
  };

  const toggleAvailability = async (product: Product) => {
    try {
      await api.updateProduct(product.id!, { is_available: !product.is_available });
      fetchData();
    } catch (e: any) { Alert.alert("Error", e.message); }
  };

  const deleteProduct = (id?: string) => {
    if (!id) return;
    Alert.alert("Delete Product", "Are you sure you want to delete this product?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => { await api.deleteProduct(id); fetchData(); } }
    ]);
  };

  const resetModal = () => {
    setAddModal(false);
    setNewProduct({ name: "", category: "", unit: "", price: "", stock: "", image: "" });
  };

  if (loading) return <LoadingScreen />;

  const available = products.filter(p => p.is_available).length;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Inventory</Text>
          <Text style={styles.subtitle}>{products.length} products · {available} available</Text>
        </View>
        {isAdmin && (
          <TouchableOpacity style={styles.addBtn} onPress={() => setAddModal(true)}>
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Summary Strip ── */}
      <View style={styles.summaryStrip}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryVal}>{products.length}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryVal, { color: '#22c55e' }]}>{available}</Text>
          <Text style={styles.summaryLabel}>Active</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryVal, { color: '#ef4444' }]}>{products.length - available}</Text>
          <Text style={styles.summaryLabel}>Inactive</Text>
        </View>
      </View>

      {/* ── Product List ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.listContent}
      >
        {products.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={52} color="#ddd" />
            <Text style={styles.emptyTitle}>No products yet</Text>
            <Text style={styles.emptyDesc}>Tap + to add your first product</Text>
          </View>
        ) : (
          products.map((product) => (
            <View key={product.id} style={styles.productCard}>
              {/* Image */}
              {product.image ? (
                <Image source={{ uri: product.image }} style={styles.productImage} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="cube-outline" size={22} color="#ccc" />
                </View>
              )}

              {/* Info */}
              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
                <Text style={styles.productMeta}>{product.unit} · ₹{product.price}</Text>
                <View style={[
                  styles.statusPill,
                  { backgroundColor: product.is_available ? '#F0FDF4' : '#FEF2F2' }
                ]}>
                  <View style={[
                    styles.statusDot,
                    { backgroundColor: product.is_available ? '#22c55e' : '#ef4444' }
                  ]} />
                  <Text style={[
                    styles.statusText,
                    { color: product.is_available ? '#16a34a' : '#dc2626' }
                  ]}>
                    {product.is_available ? 'Available' : 'Unavailable'}
                  </Text>
                </View>
              </View>

              {/* Stock Badge */}
              <View style={styles.stockBadge}>
                <Text style={styles.stockVal}>{product.stock}</Text>
                <Text style={styles.stockLabel}>stock</Text>
              </View>

              {/* Actions */}
              {isAdmin && (
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: product.is_available ? '#FEF2F2' : '#F0FDF4' }]}
                    onPress={() => toggleAvailability(product)}
                  >
                    <Ionicons
                      name={product.is_available ? "eye-off" : "eye"}
                      size={15}
                      color={product.is_available ? '#ef4444' : '#22c55e'}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#FEF2F2' }]}
                    onPress={() => deleteProduct(product.id)}
                  >
                    <Ionicons name="trash-outline" size={15} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* ── Add Product Modal ── */}
      <Modal visible={addModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.dragHandle} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Product</Text>
              <TouchableOpacity style={styles.closeBtn} onPress={resetModal}>
                <Ionicons name="close" size={16} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>

              {/* Image Picker */}
              <TouchableOpacity style={styles.imagePicker} onPress={pickImageFromGallery}>
                {newProduct.image ? (
                  <Image source={{ uri: newProduct.image }} style={styles.previewImage} />
                ) : (
                  <View style={styles.imagePickerEmpty}>
                    <Ionicons name="camera-outline" size={28} color="#aaa" />
                    <Text style={styles.imagePickerText}>Tap to add product image</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Fields */}
              <Text style={styles.fieldLabel}>Product Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Full Cream Milk"
                placeholderTextColor="#ccc"
                value={newProduct.name}
                onChangeText={(v) => setNewProduct(p => ({ ...p, name: v }))}
              />

              <Text style={styles.fieldLabel}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.catChip,
                      newProduct.category === cat && styles.catChipActive
                    ]}
                    onPress={() => setNewProduct(p => ({ ...p, category: cat }))}
                  >
                    <Text style={[
                      styles.catChipText,
                      newProduct.category === cat && styles.catChipTextActive
                    ]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Unit</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 500ml"
                    placeholderTextColor="#ccc"
                    value={newProduct.unit}
                    onChangeText={(v) => setNewProduct(p => ({ ...p, unit: v }))}
                  />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Price (₹)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0.00"
                    placeholderTextColor="#ccc"
                    keyboardType="numeric"
                    value={newProduct.price}
                    onChangeText={(v) => setNewProduct(p => ({ ...p, price: v }))}
                  />
                </View>
              </View>

              <Text style={styles.fieldLabel}>Stock Quantity</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor="#ccc"
                keyboardType="numeric"
                value={newProduct.stock}
                onChangeText={(v) => setNewProduct(p => ({ ...p, stock: v }))}
              />

              <View style={{ height: 16 }} />

              {isFormValid && (
                <View style={styles.swipeWrapper}>
                  <SwipeToConfirm
                    text="Swipe to Add Product"
                    disabled={!isFormValid}
                    onSwipeSuccess={handleAddProduct}
                  />
                </View>
              )}

              <TouchableOpacity style={styles.cancelBtn} onPress={resetModal}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F7F4' },

  /* ── Header ── */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
  },
  title: { fontSize: 26, fontWeight: '800', color: '#1A1A1A', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: '#aaa', marginTop: 2, fontWeight: '500' },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  /* ── Summary ── */
  summaryStrip: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 16,
    paddingVertical: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryVal: { fontSize: 22, fontWeight: '800', color: '#1A1A1A' },
  summaryLabel: { fontSize: 11, color: '#aaa', fontWeight: '600', marginTop: 2 },
  summaryDivider: { width: 1, backgroundColor: '#F0F0F0' },

  /* ── Product Cards ── */
  listContent: { paddingHorizontal: 16 },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  productImage: { width: 56, height: 56, borderRadius: 12 },
  imagePlaceholder: {
    width: 56, height: 56, borderRadius: 12,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center', alignItems: 'center',
  },
  productInfo: { flex: 1, gap: 3 },
  productName: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  productMeta: { fontSize: 12, color: '#aaa', fontWeight: '500' },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    marginTop: 2,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },

  stockBadge: {
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  stockVal: { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },
  stockLabel: { fontSize: 9, color: '#aaa', fontWeight: '600' },

  actions: { gap: 6 },
  actionBtn: {
    width: 32, height: 32, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },

  /* ── Empty ── */
  emptyState: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#ccc' },
  emptyDesc: { fontSize: 13, color: '#ddd' },

  /* ── Modal ── */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: '92%',
  },
  dragHandle: {
    width: 40, height: 4, backgroundColor: '#E0E0E0',
    borderRadius: 2, alignSelf: 'center', marginBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1A1A1A' },
  closeBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center',
  },

  /* Image Picker */
  imagePicker: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: '#F0F0F0',
    borderStyle: 'dashed',
  },
  imagePickerEmpty: {
    height: 130,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FAFAFA',
  },
  imagePickerText: { fontSize: 13, color: '#aaa', fontWeight: '500' },
  previewImage: { width: '100%', height: 150 },

  /* Fields */
  fieldLabel: {
    fontSize: 12, fontWeight: '700', color: '#999',
    textTransform: 'uppercase', letterSpacing: 0.6,
    marginBottom: 8, marginTop: 4,
  },
  input: {
    backgroundColor: '#F8F8F8',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    fontSize: 15,
    color: '#1A1A1A',
  },
  row: { flexDirection: 'row' },

  /* Categories */
  categoryRow: { marginBottom: 16 },
  catChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, backgroundColor: '#F5F5F5',
    marginRight: 8, borderWidth: 1.5, borderColor: 'transparent',
  },
  catChipActive: { backgroundColor: Colors.primary + '15', borderColor: Colors.primary },
  catChipText: { fontSize: 13, fontWeight: '600', color: '#888', textTransform: 'capitalize' },
  catChipTextActive: { color: Colors.primary },

  swipeWrapper: { marginBottom: 12, alignItems: 'center' },
  cancelBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    marginTop: 8,
  },
  cancelBtnText: { fontSize: 15, fontWeight: '700', color: '#ef4444' },
});