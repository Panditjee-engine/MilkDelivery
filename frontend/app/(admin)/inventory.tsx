import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { api } from '../../src/services/api';
import { Colors } from '../../src/constants/colors';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import LoadingScreen from '../../src/components/LoadingScreen';
import { useAuth } from '../../src/contexts/AuthContext';

/* ================= TYPES ================= */
type Product = {
  id?: number; // 👈 optional to avoid TS error
  name: string;
  category: string;
  unit: string;
  price: number;
  stock: number;
  image_url?: string | null;
};

/* ================= SCREEN ================= */
export default function InventoryScreen() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [stockModal, setStockModal] = useState(false);
  const [newStock, setNewStock] = useState('');
  const [updating, setUpdating] = useState(false);

  const [addModal, setAddModal] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    category: '',
    unit: '',
    price: '',
    stock: '',
    image_url: '',
  });

  /* ================= DATA ================= */
  const fetchData = async () => {
    try {
      const data = await api.getProducts();
      setProducts(data);
    } catch (e) {
      console.error(e);
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

  /* ================= ACTIONS ================= */
  const openStockModal = (product: Product) => {
    if (!product.id) return;
    setSelectedProduct(product);
    setNewStock(String(product.stock));
    setStockModal(true);
  };

  const handleUpdateStock = async () => {
    if (!selectedProduct?.id) return;

    const qty = parseInt(newStock);
    if (isNaN(qty) || qty < 0) {
      Alert.alert('Error', 'Invalid stock value');
      return;
    }

    setUpdating(true);
    try {
      await api.updateStock(selectedProduct.id, qty);
      setStockModal(false);
      fetchData();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setUpdating(false);
    }
  };

  const deleteProduct = async (id?: number) => {
    if (!id) return;

    try {
      await api.deleteProduct(id);
      fetchData();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const confirmDelete = (product: Product) => {
    if (!product.id) return;

    Alert.alert('Delete Product', product.name, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteProduct(product.id),
      },
    ]);
  };

  const handleAddProduct = async () => {
    const { name, category, unit, price, stock, image_url } = newProduct;

    if (!name || !category || !unit || !price || !stock) {
      Alert.alert('Error', 'All fields except image are required');
      return;
    }

    try {
      await api.createProduct({
        name,
        category,
        unit,
        price: Number(price),
        stock: Number(stock),
        image: image_url || null,
      });

      setAddModal(false);
      setNewProduct({
        name: '',
        category: '',
        unit: '',
        price: '',
        stock: '',
        image_url: '',
      });

      fetchData();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  if (loading) return <LoadingScreen />;

  /* ================= GROUP ================= */
  const productsByCategory: Record<string, Product[]> = products.reduce(
    (acc, product) => {
      acc[product.category] = acc[product.category] || [];
      acc[product.category].push(product);
      return acc;
    },
    {} as Record<string, Product[]>
  );

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

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {Object.entries(productsByCategory).map(([category, list]) => (
          <View key={category} style={styles.categorySection}>
            <Text style={styles.categoryTitle}>{category}</Text>

            {list.map((product, index) => (
              <Card key={product.id ?? index} style={styles.productCard}>
                {product.image_url ? (
                  <Image source={{ uri: product.image_url }} style={styles.productImage} />
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

                <TouchableOpacity
                  onPress={() => openStockModal(product)}
                  style={styles.stockBadge}
                >
                  <Text>{product.stock}</Text>
                </TouchableOpacity>

                {isAdmin && product.id && (
                  <TouchableOpacity onPress={() => confirmDelete(product)}>
                    <Ionicons name="trash" size={18} color={Colors.error} />
                  </TouchableOpacity>
                )}
              </Card>
            ))}
          </View>
        ))}
      </ScrollView>

      {/* ADD PRODUCT MODAL */}
      <Modal visible={addModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Product</Text>

            {['name', 'category', 'unit', 'price', 'stock', 'image_url'].map(field => (
              <TextInput
                key={field}
                placeholder={field === 'image_url' ? 'Image URL (optional)' : field.toUpperCase()}
                keyboardType={field === 'price' || field === 'stock' ? 'numeric' : 'default'}
                value={(newProduct as any)[field]}
                onChangeText={v => setNewProduct(p => ({ ...p, [field]: v }))}
                style={styles.input}
              />
            ))}

            {newProduct.image_url ? (
              <Image source={{ uri: newProduct.image_url }} style={styles.previewImage} />
            ) : null}

            <View style={{ marginBottom: 12 }}>
              <Button title="Save Product" onPress={handleAddProduct} />
            </View>

            <Button
              title="Cancel"
              onPress={() => setAddModal(false)}
              style={{ backgroundColor: Colors.error }}
            />
          </View>
        </View>
      </Modal>

      {/* STOCK MODAL */}
      <Modal visible={stockModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TextInput
              value={newStock}
              keyboardType="numeric"
              onChangeText={setNewStock}
              style={styles.input}
            />
            <Button title="Update Stock" onPress={handleUpdateStock} loading={updating} />
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
  title: { fontSize: 24, fontWeight: '700' },
  subtitle: { color: Colors.textSecondary },
  adminActions: { paddingHorizontal: 20, marginBottom: 12 },

  categorySection: { paddingHorizontal: 20, marginBottom: 20 },
  categoryTitle: { fontWeight: '700', marginBottom: 8 },

  productCard: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  productImage: { width: 48, height: 48, borderRadius: 8 },
  imagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: { flex: 1 },
  productName: { fontWeight: '600' },
  productUnit: { fontSize: 12 },

  stockBadge: {
    padding: 8,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },

  input: {
    backgroundColor: Colors.surfaceSecondary,
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  previewImage: {
    width: '100%',
    height: 150,
    borderRadius: 12,
    marginBottom: 12,
  },
});
