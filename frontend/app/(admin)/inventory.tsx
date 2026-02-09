import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
// import SwipeButton from 'react-native-swipe-button';
// 30-Jan status all fine after updates at 39(add new product type), 64-73(add new toggle availabilityy),214 - 237(update product card)
//223 - 227 (add new availability icons)
import { Dimensions } from "react-native";

import SwipeToConfirm from "../../src/components/SwipeToConfirm";
import { api } from "../../src/services/api";
import { Colors } from "../../src/constants/colors";
import Card from "../../src/components/Card";
import Button from "../../src/components/Button";
import LoadingScreen from "../../src/components/LoadingScreen";
import { useAuth } from "../../src/contexts/AuthContext";

/* ================= TYPES ================= */
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

/* ================= SCREEN ================= */
export default function InventoryScreen() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [stockModal, setStockModal] = useState(false);
  const [newStock, setNewStock] = useState("");

  const [addModal, setAddModal] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: "",
    category: "",
    unit: "",
    price: "",
    stock: "",
    image: "", // base64
  });

  const toggleAvailability = async (product: Product) => {
    try {
      await api.updateProduct(product.id!, {
        is_available: !product.is_available,
      });
      fetchData(); // refresh list
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  /* ================= DATA ================= */
  const fetchData = async () => {
    try {
      const data = await api.getProducts();
      setProducts(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  /* ================= IMAGE PICKER ================= */
  const pickImageFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission required", "Gallery access is needed");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setNewProduct((p) => ({
        ...p,
        image: `data:image/jpeg;base64,${result.assets[0].base64}`,
      }));
    }
  };

  /* ================= FORM VALID ================= */
  const isFormValid = useMemo(() => {
    const name = newProduct.name.trim();
    const category = newProduct.category.trim();
    const unit = newProduct.unit.trim();
    const price = parseFloat(newProduct.price);
    const stock = parseInt(newProduct.stock, 10);

    if (!name || !category || !unit) return false;
    if (!Number.isFinite(price) || price <= 0) return false;
    if (!Number.isInteger(stock) || stock < 0) return false;
    //if (!newProduct.image || newProduct.image.length < 10) return false;-----> badal

    return true;
  }, [newProduct]);
   //================== Remove wrong image ================= update by badal*/
   const removeImage = () => {
  setNewProduct((p) => ({ ...p, image: "" }));
};
  /* ================= ACTIONS ================= */
 /* const handleAddProduct = async () => {
    try {
      await api.createProduct({
        name: newProduct.name,
        category: newProduct.category.toLowerCase(),
        unit: newProduct.unit,
        price: Number(newProduct.price),
        stock: Number(newProduct.stock),
        image: newProduct.image,
        image_type: "base64",
      });*/

      /*==============ACTIONS UPDATED================= Date: 05-02-2026 ================ updated actions method by badal*/
      const handleAddProduct = async () => {
  try {
    await api.createProduct({
      name: newProduct.name.trim(),
      category: newProduct.category.trim().toLowerCase(),
      unit: newProduct.unit.trim(),
      price: Number(newProduct.price),
      stock: Number(newProduct.stock),
      image: newProduct.image ? newProduct.image : null,
    });

      setAddModal(false);
      setNewProduct({
        name: "",
        category: "",
        unit: "",
        price: "",
        stock: "",
        image: "",
      });

      fetchData();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  const deleteProduct = async (id?: string) => {
    if (!id) return;
    await api.deleteProduct(id);
    fetchData();
  };

  if (loading) return <LoadingScreen />;

  /* ================= UI ================= */
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Inventory</Text>
        <Text style={styles.subtitle}>{products.length} products</Text>
      </View>

      {isAdmin && (
        <View style={styles.adminActions}>
          <Button title="Add Product" onPress={() => setAddModal(true)} />
        </View>
      )}

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {products.map((product) => (
          <Card key={product.id} style={styles.productCard}>
            {product.image ? (
              <Image
                source={{ uri: product.image }}
                style={styles.productImage}
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="image" size={24} color={Colors.textSecondary} />
              </View>
            )}

            <View style={styles.productInfo}>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productUnit}>
                {product.unit} • ₹{product.price}
              </Text>
            </View>

            <View style={styles.stockBadge}>
              <Text>{product.stock}</Text>
            </View>

            {isAdmin && (
              <TouchableOpacity onPress={() => deleteProduct(product.id)}>
                <Ionicons name="trash" size={18} color={Colors.error} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => toggleAvailability(product)}
              style={{ marginRight: 10 }}
            >
              <Ionicons
                name={product.is_available ? "eye" : "eye-off"}
                size={18}
                color={product.is_available ? "#16a34a" : "#dc2626"}
              />
            </TouchableOpacity>

            <View style={{ alignItems: "center", gap: 6 }}>
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 10,
                  backgroundColor: product.is_available ? "#dcfce7" : "#fee2e2",
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: product.is_available ? "#166534" : "#991b1b",
                  }}
                >
                  {product.is_available ? "Available" : "Not Available"}
                </Text>
              </View>

              <View style={styles.stockBadge}>
                <Text>{product.stock}</Text>
              </View>
            </View>
          </Card>
        ))}
      </ScrollView>

      {/* ADD PRODUCT MODAL */}
      <Modal visible={addModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Product</Text>

            {["name", "category", "unit", "price", "stock"].map((field) => (
              <TextInput
                key={field}
                placeholder={field.toUpperCase()}
                keyboardType={
                  field === "price" || field === "stock" ? "numeric" : "default"
                }
                value={(newProduct as any)[field]}
                onChangeText={(v) =>
                  setNewProduct((p) => ({ ...p, [field]: v }))
                }
                style={styles.input}
              />
            ))}

            {/* IMAGE PICKER BUTTON */}
            <TouchableOpacity
              style={styles.imagePicker}
              onPress={pickImageFromGallery}
            >
              <Ionicons name="image-outline" size={20} color="#16a34a" />
              <Text style={styles.imagePickerText}>
                Select Image from Gallery
              </Text>
            </TouchableOpacity>
    {/*================== Image Preview and Remove Button =================  Date: 05-02-2026 */}
    {/*newProduct.image ? (
              <Image
                source={{ uri: newProduct.image }}
                style={styles.previewImage}
              />
            ) : null} */}
            {newProduct.image ? (
             <View style={{ alignItems: "center" }}>
               <Image
                source={{ uri: newProduct.image }}
                style={styles.previewImage}
                 />

           <TouchableOpacity
            onPress={removeImage}
            style={{
             marginTop: 8,
              backgroundColor: "#f14141",
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 8,
                }}
                >
                <Text style={{ color: "white", fontWeight: "600" }}>
                Remove Image
                </Text>
              </TouchableOpacity>
              </View>
              ) : null}

            <View style={{ paddingHorizontal: 20, marginVertical: 16 }}>
              {isFormValid && (
                <View style={{ alignItems: "center", marginVertical: 16 }}>
                  <SwipeToConfirm
                    text="Swipe → Add Product"
                    disabled={!isFormValid}
                    onSwipeSuccess={handleAddProduct}
                  />
                </View>
              )}

              <View style={{ marginTop: 12 }}>
                <Button
                  title="Cancel"
                  onPress={() => setAddModal(false)}
                  style={{ backgroundColor: Colors.error }}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { padding: 20 },
  title: { fontSize: 24, fontWeight: "700" },
  subtitle: { color: Colors.textSecondary },
  adminActions: { paddingHorizontal: 20, marginBottom: 12 },

  productCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
  },
  productImage: { width: 48, height: 48, borderRadius: 8 },
  imagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  productInfo: { flex: 1 },
  productName: { fontWeight: "600" },
  productUnit: { fontSize: 12 },

  stockBadge: {
    padding: 8,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
  },
  // swipeButton: {
  //   marginHorizontal: 20,
  //   marginVertical: 10,
  // },

  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.surface,
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12 },

  input: {
    backgroundColor: Colors.surfaceSecondary,
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  imagePicker: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#22c55e",
    marginBottom: 10,
  },
  imagePickerText: {
    color: "#16a34a",
    fontWeight: "600",
  },
  previewImage: {
    width: "100%",
    height: 150,
    borderRadius: 12,
    marginBottom: 12,
  },
  swipeContainer: {
    marginVertical: 16,
    alignItems: "center",
  },
});
