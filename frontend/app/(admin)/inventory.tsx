import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, TextInput, Modal, Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import SwipeToConfirm from "../../src/components/SwipeToConfirm";
import { api } from "../../src/services/api";
import Button from "../../src/components/Button";
import LoadingScreen from "../../src/components/LoadingScreen";
import { useAuth } from "../../src/contexts/AuthContext";

// ── Warm Color Palette 
const C = {
  primary:    '#FF9675',
  secondary:  '#FF9675',
  accent:     '#8B6854',
  light:      '#8B6854',
  dark:       '#BB6B3F',
  deep:       '#8B6854',
  bg:         '#FFF8EF',
  card:       '#FFE8D6',
  text:       '#3D1F0A',
  textMuted:  '#A07850',
  textLight:  '#C9A882',
};

// ── Custom Alert
type AlertButton = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
};

type AlertConfig = {
  visible: boolean;
  title: string;
  message?: string;
  buttons: AlertButton[];
};

function CustomAlert({ config, onDismiss }: { config: AlertConfig; onDismiss: () => void }) {
  if (!config.visible) return null;
  return (
    <Modal transparent animationType="fade" visible={config.visible} onRequestClose={onDismiss}>
      <View style={alertStyles.overlay}>
        <View style={alertStyles.box}>
          {/* Icon */}
          <View style={alertStyles.iconWrap}>
            <Ionicons
              name={
                config.buttons.some(b => b.style === 'destructive')
                  ? 'warning-outline'
                  : 'information-circle-outline'
              }
              size={28}
              color={config.buttons.some(b => b.style === 'destructive') ? C.secondary : C.dark}
            />
          </View>

          <Text style={alertStyles.title}>{config.title}</Text>
          {config.message ? <Text style={alertStyles.message}>{config.message}</Text> : null}

          <View style={alertStyles.btnRow}>
            {config.buttons.map((btn, idx) => {
              const isDestructive = btn.style === 'destructive';
              const isCancel = btn.style === 'cancel';
              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    alertStyles.btn,
                    isDestructive && alertStyles.btnDestructive,
                    isCancel && alertStyles.btnCancel,
                    config.buttons.length === 1 && { flex: 1 },
                  ]}
                  onPress={() => {
                    onDismiss();
                    btn.onPress?.();
                  }}
                  activeOpacity={0.75}
                >
                  <Text style={[
                    alertStyles.btnText,
                    isDestructive && alertStyles.btnTextDestructive,
                    isCancel && alertStyles.btnTextCancel,
                  ]}>
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Alert hook 
function useCustomAlert() {
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    visible: false, title: '', buttons: [],
  });

  const showAlert = (title: string, message?: string, buttons?: AlertButton[]) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      buttons: buttons ?? [{ text: 'OK', style: 'default' }],
    });
  };

  const dismissAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

  return { alertConfig, showAlert, dismissAlert };
}

// ── Types 
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
  const { alertConfig, showAlert, dismissAlert } = useCustomAlert();

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
    if (!permission.granted) {
      showAlert("Permission Required", "Gallery access is needed to pick a product image.");
      return;
    }
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
    } catch (e: any) {
      showAlert("Something went wrong", e.message);
    }
  };

  const toggleAvailability = async (product: Product) => {
    try {
      await api.updateProduct(product.id!, { is_available: !product.is_available });
      fetchData();
    } catch (e: any) {
      showAlert("Update Failed", e.message);
    }
  };

  const deleteProduct = (id?: string) => {
    if (!id) return;
    showAlert(
      "Delete Product",
      "Are you sure you want to delete this product? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => { await api.deleteProduct(id); fetchData(); },
        },
      ]
    );
  };

  const resetModal = () => {
    setAddModal(false);
    setNewProduct({ name: "", category: "", unit: "", price: "", stock: "", image: "" });
  };

  if (loading) return <LoadingScreen />;

  const available = products.filter(p => p.is_available).length;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>

      <CustomAlert config={alertConfig} onDismiss={dismissAlert} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Inventory</Text>
          <Text style={styles.subtitle}>{products.length} products · {available} available</Text>
        </View>
        {isAdmin && (
          <TouchableOpacity style={styles.addBtn} onPress={() => setAddModal(true)}>
            <Ionicons name="add" size={22} color={C.deep} />
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
          <Text style={[styles.summaryVal, { color: C.dark }]}>{available}</Text>
          <Text style={styles.summaryLabel}>Active</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryVal, { color: C.secondary }]}>{products.length - available}</Text>
          <Text style={styles.summaryLabel}>Inactive</Text>
        </View>
      </View>

      {/* ── Product List ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.primary}
            colors={[C.primary, C.accent]}
          />
        }
        contentContainerStyle={styles.listContent}
      >
        {products.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={52} color={C.light} />
            <Text style={styles.emptyTitle}>No products yet</Text>
            <Text style={styles.emptyDesc}>Tap + to add your first product</Text>
          </View>
        ) : (
          products.map((product) => (
            <View key={product.id} style={styles.productCard}>
              {product.image ? (
                <Image source={{ uri: product.image }} style={styles.productImage} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="cube-outline" size={22} color={C.light} />
                </View>
              )}

              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
                <Text style={styles.productMeta}>{product.unit} · ₹{product.price}</Text>
                <View style={[
                  styles.statusPill,
                  { backgroundColor: product.is_available ? '#FFF3DC' : '#FFE8D6' }
                ]}>
                  <View style={[
                    styles.statusDot,
                    { backgroundColor: product.is_available ? C.dark : C.secondary }
                  ]} />
                  <Text style={[
                    styles.statusText,
                    { color: product.is_available ? C.dark : C.secondary }
                  ]}>
                    {product.is_available ? 'Available' : 'Unavailable'}
                  </Text>
                </View>
              </View>

              <View style={styles.stockBadge}>
                <Text style={styles.stockVal}>{product.stock}</Text>
                <Text style={styles.stockLabel}>stock</Text>
              </View>

              {isAdmin && (
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: product.is_available ? '#FFE8D6' : '#FFF3DC' }]}
                    onPress={() => toggleAvailability(product)}
                  >
                    <Ionicons
                      name={product.is_available ? "eye-off" : "eye"}
                      size={15}
                      color={product.is_available ? C.secondary : C.dark}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#FFE8D6' }]}
                    onPress={() => deleteProduct(product.id)}
                  >
                    <Ionicons name="trash-outline" size={15} color={C.secondary} />
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
                <Ionicons name="close" size={16} color={C.deep} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>

              <TouchableOpacity style={styles.imagePicker} onPress={pickImageFromGallery}>
                {newProduct.image ? (
                  <Image source={{ uri: newProduct.image }} style={styles.previewImage} />
                ) : (
                  <View style={styles.imagePickerEmpty}>
                    <Ionicons name="camera-outline" size={28} color={C.light} />
                    <Text style={styles.imagePickerText}>Tap to add product image</Text>
                  </View>
                )}
              </TouchableOpacity>

              <Text style={styles.fieldLabel}>Product Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Full Cream Milk"
                placeholderTextColor={C.textLight}
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
                    placeholderTextColor={C.textLight}
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
                    placeholderTextColor={C.textLight}
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
                placeholderTextColor={C.textLight}
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

// ── Alert Styles 
const alertStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(61,31,10,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  box: {
    width: '100%',
    backgroundColor: '#FFF8EF',
    borderRadius: 24,
    paddingTop: 28,
    paddingBottom: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#3D1F0A',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 10,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#FFE8D6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#3D1F0A',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  message: {
    fontSize: 14,
    color: '#A07850',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 22,
    fontWeight: '500',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 4,
  },
  btn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#FFE8D6',
    alignItems: 'center',
  },
  btnCancel: {
    backgroundColor: '#FFF3DC',
  },
  btnDestructive: {
    backgroundColor: '#FF9675',
  },
  btnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#BB6B3F',
  },
  btnTextCancel: {
    color: '#A07850',
  },
  btnTextDestructive: {
    color: '#3D1F0A',
  },
});

// ── Screen Styles 
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
  },
  title: { fontSize: 26, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: C.textLight, marginTop: 2, fontWeight: '500' },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: C.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: C.dark,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  summaryStrip: {
    flexDirection: 'row',
    backgroundColor: C.card,
    marginHorizontal: 20,
    borderRadius: 16,
    paddingVertical: 14,
    marginBottom: 16,
    shadowColor: C.dark,
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryVal: { fontSize: 22, fontWeight: '800', color: C.text },
  summaryLabel: { fontSize: 11, color: C.textLight, fontWeight: '600', marginTop: 2 },
  summaryDivider: { width: 1, backgroundColor: '#FFE8C8' },

  listContent: { paddingHorizontal: 16 },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    gap: 12,
    shadowColor: C.dark,
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  productImage: { width: 56, height: 56, borderRadius: 12 },
  imagePlaceholder: {
    width: 56, height: 56, borderRadius: 12,
    backgroundColor: '#FFF3DC',
    justifyContent: 'center', alignItems: 'center',
  },
  productInfo: { flex: 1, gap: 3 },
  productName: { fontSize: 15, fontWeight: '700', color: C.text },
  productMeta: { fontSize: 12, color: C.textMuted, fontWeight: '500' },
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
    backgroundColor: '#FFF3DC',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  stockVal: { fontSize: 16, fontWeight: '800', color: C.dark },
  stockLabel: { fontSize: 9, color: C.textMuted, fontWeight: '600' },

  actions: { gap: 6 },
  actionBtn: {
    width: 32, height: 32, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },

  emptyState: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: C.textLight },
  emptyDesc: { fontSize: 13, color: C.textLight },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(61,31,10,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: C.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: '92%',
  },
  dragHandle: {
    width: 40, height: 4, backgroundColor: C.light,
    borderRadius: 2, alignSelf: 'center', marginBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: C.text },
  closeBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: '#FFF3DC', justifyContent: 'center', alignItems: 'center',
  },

  imagePicker: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: C.light,
    borderStyle: 'dashed',
  },
  imagePickerEmpty: {
    height: 130,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF8EF',
  },
  imagePickerText: { fontSize: 13, color: C.textLight, fontWeight: '500' },
  previewImage: { width: '100%', height: 150 },

  fieldLabel: {
    fontSize: 12, fontWeight: '700', color: C.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.6,
    marginBottom: 8, marginTop: 4,
  },
  input: {
    backgroundColor: '#FFF8EF',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    fontSize: 15,
    color: C.text,
    borderWidth: 1,
    borderColor: '#FFE8C8',
  },
  row: { flexDirection: 'row' },

  categoryRow: { marginBottom: 16 },
  catChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, backgroundColor: '#FFF3DC',
    marginRight: 8, borderWidth: 1.5, borderColor: 'transparent',
  },
  catChipActive: { backgroundColor: C.primary + '25', borderColor: C.primary },
  catChipText: { fontSize: 13, fontWeight: '600', color: C.textMuted, textTransform: 'capitalize' },
  catChipTextActive: { color: C.dark },

  swipeWrapper: { marginBottom: 12, alignItems: 'center' },
  cancelBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#FFE8D6',
    alignItems: 'center',
    marginTop: 8,
  },
  cancelBtnText: { fontSize: 15, fontWeight: '700', color: C.secondary },
});