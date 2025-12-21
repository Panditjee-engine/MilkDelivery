import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/services/api';
import { Colors, CategoryColors } from '../../src/constants/colors';
import ProductCard from '../../src/components/ProductCard';
import Button from '../../src/components/Button';
import LoadingScreen from '../../src/components/LoadingScreen';

const patterns = [
  { value: 'daily', label: 'Daily', description: 'Every day' },
  { value: 'alternate', label: 'Alternate', description: 'Every other day' },
  { value: 'custom', label: 'Custom', description: 'Choose specific days' },
  { value: 'buy_once', label: 'Buy Once', description: 'One-time purchase' },
];

const weekDays = [
  { value: 0, label: 'Mon' },
  { value: 1, label: 'Tue' },
  { value: 2, label: 'Wed' },
  { value: 3, label: 'Thu' },
  { value: 4, label: 'Fri' },
  { value: 5, label: 'Sat' },
  { value: 6, label: 'Sun' },
];

export default function CatalogScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Subscription modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [pattern, setPattern] = useState('daily');
  const [customDays, setCustomDays] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const [productsData, categoriesData] = await Promise.all([
        api.getProducts(selectedCategory || undefined),
        api.getCategories(),
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error fetching products:', error);
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

  const openSubscriptionModal = (product: any) => {
    setSelectedProduct(product);
    setQuantity(1);
    setPattern('daily');
    setCustomDays([]);
    setModalVisible(true);
  };

  const toggleCustomDay = (day: number) => {
    setCustomDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSubscribe = async () => {
    if (pattern === 'custom' && customDays.length === 0) {
      Alert.alert('Error', 'Please select at least one day');
      return;
    }

    setSubmitting(true);
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const startDate = tomorrow.toISOString().split('T')[0];

      await api.createSubscription({
        product_id: selectedProduct.id,
        quantity,
        pattern,
        custom_days: pattern === 'custom' ? customDays : null,
        start_date: startDate,
        end_date: pattern === 'buy_once' ? startDate : null,
      });

      Alert.alert('Success', 'Subscription created successfully!');
      setModalVisible(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create subscription');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Product Catalog</Text>
        <Text style={styles.subtitle}>Fresh daily essentials</Text>
      </View>

      {/* Categories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesContent}
      >
        <TouchableOpacity
          style={[styles.categoryChip, !selectedCategory && styles.categoryChipActive]}
          onPress={() => setSelectedCategory(null)}
        >
          <Text style={[styles.categoryText, !selectedCategory && styles.categoryTextActive]}>All</Text>
        </TouchableOpacity>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.value}
            style={[
              styles.categoryChip,
              selectedCategory === cat.value && styles.categoryChipActive,
              { backgroundColor: selectedCategory === cat.value ? Colors.primary : CategoryColors[cat.value] || Colors.surfaceSecondary },
            ]}
            onPress={() => setSelectedCategory(cat.value)}
          >
            <Text style={[styles.categoryText, selectedCategory === cat.value && styles.categoryTextActive]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Products Grid */}
      <ScrollView
        style={styles.productsContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.productsGrid}>
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onPress={() => openSubscriptionModal(product)}
              onSubscribe={() => openSubscriptionModal(product)}
            />
          ))}
        </View>
      </ScrollView>

      {/* Subscription Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Subscribe</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {selectedProduct && (
              <>
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{selectedProduct.name}</Text>
                  <Text style={styles.productPrice}>₹{selectedProduct.price}/{selectedProduct.unit}</Text>
                </View>

                {/* Quantity */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Quantity</Text>
                  <View style={styles.quantityControl}>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => setQuantity(Math.max(1, quantity - 1))}
                    >
                      <Ionicons name="remove" size={20} color={Colors.primary} />
                    </TouchableOpacity>
                    <Text style={styles.quantityText}>{quantity}</Text>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => setQuantity(quantity + 1)}
                    >
                      <Ionicons name="add" size={20} color={Colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Pattern */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Delivery Pattern</Text>
                  <View style={styles.patternGrid}>
                    {patterns.map((p) => (
                      <TouchableOpacity
                        key={p.value}
                        style={[styles.patternCard, pattern === p.value && styles.patternCardActive]}
                        onPress={() => setPattern(p.value)}
                      >
                        <Text style={[styles.patternLabel, pattern === p.value && styles.patternLabelActive]}>
                          {p.label}
                        </Text>
                        <Text style={styles.patternDesc}>{p.description}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Custom Days */}
                {pattern === 'custom' && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Select Days</Text>
                    <View style={styles.daysGrid}>
                      {weekDays.map((day) => (
                        <TouchableOpacity
                          key={day.value}
                          style={[
                            styles.dayChip,
                            customDays.includes(day.value) && styles.dayChipActive,
                          ]}
                          onPress={() => toggleCustomDay(day.value)}
                        >
                          <Text
                            style={[
                              styles.dayText,
                              customDays.includes(day.value) && styles.dayTextActive,
                            ]}
                          >
                            {day.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* Total */}
                <View style={styles.totalSection}>
                  <Text style={styles.totalLabel}>Per Delivery Total</Text>
                  <Text style={styles.totalAmount}>₹{selectedProduct.price * quantity}</Text>
                </View>

                <Button
                  title="Subscribe Now"
                  onPress={handleSubscribe}
                  loading={submitting}
                  style={styles.subscribeButton}
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
  categoriesContainer: {
    maxHeight: 50,
  },
  categoriesContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surfaceSecondary,
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  categoryTextActive: {
    color: Colors.textInverse,
  },
  productsContainer: {
    flex: 1,
    paddingTop: 16,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    paddingBottom: 20,
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
    maxHeight: '85%',
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
  productInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  productName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  quantityButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryLight + '30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    minWidth: 40,
    textAlign: 'center',
  },
  patternGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  patternCard: {
    width: '48%',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  patternCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight + '20',
  },
  patternLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  patternLabelActive: {
    color: Colors.primary,
  },
  patternDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  dayChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  dayText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  dayTextActive: {
    color: Colors.textInverse,
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary,
  },
  subscribeButton: {
    marginBottom: 16,
  },
});
