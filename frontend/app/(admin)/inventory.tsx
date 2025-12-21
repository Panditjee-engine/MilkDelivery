import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/services/api';
import { Colors, CategoryColors } from '../../src/constants/colors';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import LoadingScreen from '../../src/components/LoadingScreen';

export default function InventoryScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [procurement, setProcurement] = useState<any>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [stockModal, setStockModal] = useState(false);
  const [newStock, setNewStock] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchData = async () => {
    try {
      const [productsData, procurementData] = await Promise.all([
        api.getProducts(),
        api.getProcurement(),
      ]);
      setProducts(productsData);
      setProcurement(procurementData);
    } catch (error) {
      console.error('Error fetching inventory:', error);
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

  const openStockModal = (product: any) => {
    setSelectedProduct(product);
    setNewStock(product.stock.toString());
    setStockModal(true);
  };

  const handleUpdateStock = async () => {
    const qty = parseInt(newStock);
    if (isNaN(qty) || qty < 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    setUpdating(true);
    try {
      await api.updateStock(selectedProduct.id, qty);
      Alert.alert('Success', 'Stock updated');
      setStockModal(false);
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  // Group products by category
  const productsByCategory = products.reduce((acc, product) => {
    if (!acc[product.category]) {
      acc[product.category] = [];
    }
    acc[product.category].push(product);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Inventory</Text>
        <Text style={styles.subtitle}>{products.length} products</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Procurement Summary */}
        <Card variant="elevated" style={styles.procurementCard}>
          <View style={styles.procurementHeader}>
            <Ionicons name="clipboard" size={24} color={Colors.textInverse} />
            <Text style={styles.procurementTitle}>Tomorrow's Procurement</Text>
          </View>
          <Text style={styles.procurementDate}>{procurement?.date}</Text>
          <Text style={styles.procurementCount}>
            {procurement?.items?.length || 0} items needed
          </Text>
        </Card>

        {/* Procurement Details */}
        {procurement?.items?.length > 0 && (
          <Card variant="outlined" style={styles.section}>
            <Text style={styles.sectionTitle}>Procurement List</Text>
            {procurement.items.map((item: any) => (
              <View key={item.product_id} style={styles.procurementItem}>
                <View style={styles.procurementInfo}>
                  <Text style={styles.procurementName}>{item.product_name}</Text>
                  <Text style={styles.procurementCategory}>{item.category}</Text>
                </View>
                <View style={styles.procurementQtyContainer}>
                  <Text style={styles.procurementQty}>{item.total_quantity}</Text>
                  <Text style={styles.procurementUnit}>{item.unit}</Text>
                </View>
              </View>
            ))}
          </Card>
        )}

        {/* Products by Category */}
        {Object.entries(productsByCategory).map(([category, categoryProducts]) => (
          <View key={category} style={styles.categorySection}>
            <View style={styles.categoryHeader}>
              <View style={[styles.categoryBadge, { backgroundColor: CategoryColors[category] || Colors.surfaceSecondary }]}>
                <Text style={styles.categoryLabel}>{category}</Text>
              </View>
              <Text style={styles.categoryCount}>{(categoryProducts as any[]).length} items</Text>
            </View>
            {(categoryProducts as any[]).map((product) => (
              <Card key={product.id} variant="outlined" style={styles.productCard}>
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={styles.productUnit}>{product.unit} • ₹{product.price}</Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.stockBadge,
                    { backgroundColor: product.stock < 50 ? Colors.error + '20' : Colors.success + '20' },
                  ]}
                  onPress={() => openStockModal(product)}
                >
                  <Text
                    style={[
                      styles.stockText,
                      { color: product.stock < 50 ? Colors.error : Colors.success },
                    ]}
                  >
                    {product.stock}
                  </Text>
                  <Ionicons
                    name="pencil"
                    size={12}
                    color={product.stock < 50 ? Colors.error : Colors.success}
                  />
                </TouchableOpacity>
              </Card>
            ))}
          </View>
        ))}
      </ScrollView>

      {/* Stock Modal */}
      <Modal visible={stockModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Stock</Text>
              <TouchableOpacity onPress={() => setStockModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {selectedProduct && (
              <>
                <Text style={styles.modalProductName}>{selectedProduct.name}</Text>
                <Text style={styles.modalProductUnit}>{selectedProduct.unit}</Text>

                <View style={styles.stockInput}>
                  <Text style={styles.stockInputLabel}>Current Stock:</Text>
                  <TextInput
                    style={styles.stockTextInput}
                    value={newStock}
                    onChangeText={setNewStock}
                    keyboardType="numeric"
                  />
                </View>

                <Button
                  title="Update Stock"
                  onPress={handleUpdateStock}
                  loading={updating}
                  style={styles.updateButton}
                />
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  procurementCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: Colors.primary,
  },
  procurementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  procurementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textInverse,
  },
  procurementDate: {
    fontSize: 12,
    color: Colors.textInverse,
    opacity: 0.8,
  },
  procurementCount: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textInverse,
    marginTop: 8,
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  procurementItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  procurementInfo: {
    flex: 1,
  },
  procurementName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  procurementCategory: {
    fontSize: 12,
    color: Colors.textSecondary,
    textTransform: 'capitalize',
  },
  procurementQtyContainer: {
    alignItems: 'flex-end',
  },
  procurementQty: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
  },
  procurementUnit: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
  categorySection: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    textTransform: 'capitalize',
  },
  categoryCount: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  productUnit: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  stockText: {
    fontSize: 14,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  modalProductName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  modalProductUnit: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 20,
  },
  stockInput: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  stockInputLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginRight: 12,
  },
  stockTextInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    backgroundColor: Colors.surfaceSecondary,
    padding: 16,
    borderRadius: 12,
  },
  updateButton: {},
});
