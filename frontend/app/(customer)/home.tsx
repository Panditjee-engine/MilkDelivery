import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, FlatList, Image, Modal, Alert, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { api } from '../../src/services/api';
import { Colors } from '../../src/constants/colors';
import Button from '../../src/components/Button';
import LoadingScreen from '../../src/components/LoadingScreen';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = 140;

// ── Category themes ──────────────────────────────────────────────────────────
const CATEGORY_THEMES: Record<string, { bg: string; accent: string; icon: string }> = {
  milk:       { bg: '#EAF4FF', accent: '#3B82F6', icon: 'water' },
  dairy:      { bg: '#FFF4E6', accent: '#F59E0B', icon: 'ice-cream' },
  bakery:     { bg: '#FEF2F2', accent: '#EF4444', icon: 'pizza' },
  fruits:     { bg: '#F0FDF4', accent: '#22C55E', icon: 'nutrition' },
  vegetables: { bg: '#F0FDF4', accent: '#16A34A', icon: 'leaf' },
  essentials: { bg: '#F5F3FF', accent: '#8B5CF6', icon: 'basket' },
  other:      { bg: '#F8F7F4', accent: '#6B7280', icon: 'cube' },
};
function getCategoryTheme(category: string) {
  return CATEGORY_THEMES[category?.toLowerCase()] || CATEGORY_THEMES.other;
}

// ── Subscription modal config ────────────────────────────────────────────────
const patterns = [
  { value: 'daily',     label: 'Daily',     description: 'Every day',         icon: 'sunny-outline' },
  { value: 'alternate', label: 'Alternate', description: 'Every other day',   icon: 'repeat-outline' },
  { value: 'custom',    label: 'Custom',    description: 'Choose specific days', icon: 'calendar-outline' },
  { value: 'buy_once',  label: 'Buy Once',  description: 'One-time purchase', icon: 'bag-check-outline' },
];
const weekDays = [
  { value: 0, label: 'M' }, { value: 1, label: 'T' }, { value: 2, label: 'W' },
  { value: 3, label: 'T' }, { value: 4, label: 'F' }, { value: 5, label: 'S' },
  { value: 6, label: 'S' },
];

// ── Mini Product Card ────────────────────────────────────────────────────────
function MiniProductCard({ product, onPress }: { product: any; onPress: () => void }) {
  const theme = getCategoryTheme(product.category);
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.88}>
      <View style={[styles.cardImageBox, { backgroundColor: theme.bg }]}>
        {product.image ? (
          <Image source={{ uri: product.image }} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <View style={[styles.cardIconCircle, { backgroundColor: theme.accent + '22' }]}>
            <Ionicons name={theme.icon as any} size={28} color={theme.accent} />
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
          <Text style={styles.cardName} numberOfLines={1}>{product.name}</Text>
          <Text style={[styles.cardUnit, { color: theme.accent }]}>{product.unit}</Text>
        </View>
        <Text style={[styles.cardPrice, { color: theme.accent }]}>₹{product.price}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────────────
export default function CustomerHome() {
  const { user } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [tomorrowPreview, setTomorrowPreview] = useState<any>(null);
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [pattern, setPattern] = useState('daily');
  const [customDays, setCustomDays] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const [walletData, preview, productsData] = await Promise.all([
        api.getWallet(),
        api.getTomorrowPreview(),
        api.getCatalogProducts(undefined, undefined),
      ]);
      setWalletBalance(walletData.balance);
      setTomorrowPreview(preview);
      // Show only first 6 products as featured
      setFeaturedProducts((productsData || []).slice(0, 6));
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchData(); }, []);

  const openSubscriptionModal = (product: any) => {
    setSelectedProduct(product);
    setQuantity(1);
    setPattern('daily');
    setCustomDays([]);
    setModalVisible(true);
  };

  const toggleCustomDay = (day: number) => {
    setCustomDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]);
  };

  const handleSubscribe = async () => {
    if (pattern === 'custom' && customDays.length === 0) {
      Alert.alert('Select Days', 'Please select at least one day for delivery.');
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
        custom_days: pattern === 'custom' ? customDays : null,
        start_date: tomorrow.toISOString().split('T')[0],
        end_date: pattern === 'buy_once' ? tomorrow.toISOString().split('T')[0] : null,
      });
      Alert.alert('🎉 Success', 'Your subscription has been created!');
      setModalVisible(false);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create subscription');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingScreen />;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const modalTheme = getCategoryTheme(selectedProduct?.category);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.userName}>{user?.name || 'User'} 👋</Text>
          </View>
          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons name="notifications-outline" size={22} color={Colors.text} />
          </TouchableOpacity>
        </View>

        {/* ── Wallet Card ── */}
        <TouchableOpacity
          style={styles.walletCard}
          onPress={() => router.push('/(customer)/wallet')}
          activeOpacity={0.9}
        >
          <View style={styles.walletLeft}>
            <View style={styles.walletIconCircle}>
              <Ionicons name="wallet" size={20} color="#fff" />
            </View>
            <View>
              <Text style={styles.walletLabel}>Wallet Balance</Text>
              <Text style={styles.walletBalance}>₹{walletBalance.toFixed(2)}</Text>
            </View>
          </View>
          <View style={styles.walletRight}>
            {walletBalance < 100 ? (
              <View style={styles.lowBadge}>
                <Ionicons name="warning" size={11} color="#f59e0b" />
                <Text style={styles.lowBadgeText}>Low</Text>
              </View>
            ) : (
              <View style={styles.okBadge}>
                <Ionicons name="checkmark-circle" size={11} color="#22c55e" />
                <Text style={styles.okBadgeText}>Good</Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.6)" style={{ marginTop: 6 }} />
          </View>
        </TouchableOpacity>

        {/* ── Tomorrow Preview ── */}
        <View style={styles.previewCard}>
          <View style={styles.previewHeader}>
            <View style={styles.previewTitleRow}>
              <Ionicons name="time-outline" size={18} color={Colors.primary} />
              <Text style={styles.previewTitle}>Tomorrow's Order</Text>
            </View>
            {tomorrowPreview?.date && (
              <Text style={styles.previewDate}>{formatDate(tomorrowPreview.date)}</Text>
            )}
          </View>
          {tomorrowPreview?.items?.length > 0 ? (
            <>
              {tomorrowPreview.items.map((item: any, index: number) => (
                <View key={index} style={styles.previewItem}>
                  <Text style={styles.previewItemName}>{item.product_name}</Text>
                  <Text style={styles.previewItemQty}>x{item.quantity}</Text>
                  <Text style={styles.previewItemPrice}>₹{item.total}</Text>
                </View>
              ))}
              <View style={styles.previewTotalRow}>
                <Text style={styles.previewTotalLabel}>Total</Text>
                <Text style={styles.previewTotalAmount}>₹{tomorrowPreview.total}</Text>
              </View>
              {!tomorrowPreview.sufficient_balance && (
                <View style={styles.insufficientAlert}>
                  <Ionicons name="alert-circle" size={14} color="#ef4444" />
                  <Text style={styles.insufficientText}>Insufficient balance for tomorrow</Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.noOrder}>
              <Ionicons name="moon-outline" size={36} color="#ddd" />
              <Text style={styles.noOrderText}>
                {tomorrowPreview?.message || 'No deliveries scheduled'}
              </Text>
            </View>
          )}
        </View>

        {/* ── Featured Products ── */}
        {featuredProducts.length > 0 && (
          <View style={styles.featuredSection}>
            <View style={styles.featuredHeader}>
              <Text style={styles.sectionTitle}>Popular Items</Text>
              <TouchableOpacity
                onPress={() => router.push('/(customer)/catalog')}
                style={styles.seeAllBtn}
              >
                <Text style={styles.seeAllText}>See all</Text>
                <Ionicons name="chevron-forward" size={13} color={Colors.primary} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={featuredProducts}
              horizontal
              keyExtractor={(item) => item.id?.toString()}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
              renderItem={({ item }) => (
                <MiniProductCard product={item} onPress={() => openSubscriptionModal(item)} />
              )}
            />

            {/* Explore More Banner */}
            <TouchableOpacity
              style={styles.exploreBanner}
              onPress={() => router.push('/(customer)/catalog')}
              activeOpacity={0.88}
            >
              <View style={styles.exploreBannerLeft}>
                <View style={styles.exploreIconCircle}>
                  <Ionicons name="storefront" size={20} color={Colors.primary} />
                </View>
                <View>
                  <Text style={styles.exploreTitle}>Explore All Products</Text>
                  <Text style={styles.exploreSubtitle}>Browse by category & subscribe</Text>
                </View>
              </View>
              <View style={styles.exploreArrow}>
                <Ionicons name="arrow-forward" size={16} color={Colors.primary} />
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Quick Actions ── */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => router.push('/(customer)/catalog')}
            activeOpacity={0.85}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#EEF4FF' }]}>
              <Ionicons name="add-circle" size={26} color="#4F7EFF" />
            </View>
            <Text style={styles.quickActionText}>Add Items</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => router.push('/(customer)/subscriptions')}
            activeOpacity={0.85}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#FFF4E6' }]}>
              <Ionicons name="calendar" size={26} color="#F59E0B" />
            </View>
            <Text style={styles.quickActionText}>Subscriptions</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => router.push('/(customer)/profile')}
            activeOpacity={0.85}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="airplane" size={26} color="#22c55e" />
            </View>
            <Text style={styles.quickActionText}>Vacation Mode</Text>
          </TouchableOpacity>
        </View>

        {/* ── Branding ── */}
        <View style={styles.brandingSection}>
          <View style={styles.brandingDivider} />
          <View style={styles.brandingContent}>
            <Ionicons name="leaf" size={16} color={Colors.primary} />
            <Text style={styles.brandName}>GauSatva</Text>
          </View>
          <Text style={styles.brandTagline}>Pure. Fresh. Delivered daily.</Text>
        </View>
      </ScrollView>

      {/* ── Subscription Modal ── */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.dragHandle} />

            <View style={[styles.modalProductHeader, { backgroundColor: modalTheme.bg }]}>
              <View style={[styles.modalIconCircle, { backgroundColor: modalTheme.accent + '22' }]}>
                <Ionicons name={modalTheme.icon as any} size={32} color={modalTheme.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>{selectedProduct?.name}</Text>
                <Text style={[styles.modalPrice, { color: modalTheme.accent }]}>
                  ₹{selectedProduct?.price} / {selectedProduct?.unit}
                </Text>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={18} color="#555" />
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalSectionLabel}>Quantity</Text>
              <View style={styles.quantityRow}>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => setQuantity((q) => Math.max(1, q - 1))}>
                  <Ionicons name="remove" size={18} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.qtyValue}>{quantity}</Text>
                <TouchableOpacity
                  style={[styles.qtyBtn, { backgroundColor: modalTheme.accent }]}
                  onPress={() => setQuantity((q) => q + 1)}
                >
                  <Ionicons name="add" size={18} color="#fff" />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSectionLabel}>Delivery Pattern</Text>
              <View style={styles.patternGrid}>
                {patterns.map((p) => (
                  <TouchableOpacity
                    key={p.value}
                    style={[
                      styles.patternCard,
                      pattern === p.value && { backgroundColor: modalTheme.accent, borderColor: modalTheme.accent },
                    ]}
                    onPress={() => setPattern(p.value)}
                  >
                    <Ionicons name={p.icon as any} size={20} color={pattern === p.value ? '#fff' : modalTheme.accent} />
                    <Text style={[styles.patternLabel, pattern === p.value && { color: '#fff' }]}>{p.label}</Text>
                    <Text style={[styles.patternDesc, pattern === p.value && { color: 'rgba(255,255,255,0.75)' }]}>
                      {p.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {pattern === 'custom' && (
                <>
                  <Text style={styles.modalSectionLabel}>Select Days</Text>
                  <View style={styles.daysRow}>
                    {weekDays.map((day) => (
                      <TouchableOpacity
                        key={day.value}
                        style={[styles.dayCircle, customDays.includes(day.value) && { backgroundColor: modalTheme.accent }]}
                        onPress={() => toggleCustomDay(day.value)}
                      >
                        <Text style={[styles.dayLabel, customDays.includes(day.value) && { color: '#fff' }]}>
                          {day.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <View style={{ height: 20 }} />
              <Button title={submitting ? 'Creating...' : 'Subscribe Now'} onPress={handleSubscribe} loading={submitting} />
              <View style={{ height: 16 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F7F4' },
  scrollView: { flex: 1 },

  /* ── Header ── */
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16,
  },
  greeting: { fontSize: 13, color: '#999', fontWeight: '500' },
  userName: { fontSize: 22, fontWeight: '800', color: '#1A1A1A', letterSpacing: -0.3 },
  notificationButton: {
    width: 42, height: 42, borderRadius: 14, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },

  /* ── Wallet ── */
  walletCard: {
    marginHorizontal: 20, marginBottom: 16, backgroundColor: Colors.primary,
    borderRadius: 20, paddingHorizontal: 20, paddingVertical: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: Colors.primary, shadowOpacity: 0.3, shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  walletLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  walletIconCircle: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center',
  },
  walletLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  walletBalance: { fontSize: 24, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  walletRight: { alignItems: 'flex-end' },
  lowBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(245,158,11,0.2)',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, gap: 4,
  },
  lowBadgeText: { fontSize: 11, color: '#f59e0b', fontWeight: '700' },
  okBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(34,197,94,0.2)',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, gap: 4,
  },
  okBadgeText: { fontSize: 11, color: '#22c55e', fontWeight: '700' },

  /* ── Tomorrow Preview ── */
  previewCard: {
    marginHorizontal: 20, marginBottom: 24, backgroundColor: '#fff',
    borderRadius: 20, padding: 18,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  previewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  previewTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  previewTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  previewDate: { fontSize: 12, color: '#aaa', fontWeight: '500' },
  previewItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#F5F5F5',
  },
  previewItemName: { flex: 1, fontSize: 14, color: '#333', fontWeight: '500' },
  previewItemQty: { fontSize: 13, color: '#aaa', marginRight: 14 },
  previewItemPrice: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  previewTotalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12 },
  previewTotalLabel: { fontSize: 14, fontWeight: '600', color: '#999' },
  previewTotalAmount: { fontSize: 18, fontWeight: '800', color: Colors.primary },
  insufficientAlert: {
    flexDirection: 'row', alignItems: 'center', marginTop: 12,
    backgroundColor: '#FEF2F2', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, gap: 6,
  },
  insufficientText: { fontSize: 12, color: '#ef4444', fontWeight: '500' },
  noOrder: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  noOrderText: { fontSize: 14, color: '#bbb', fontWeight: '500' },

  /* ── Featured Products ── */
  featuredSection: { marginBottom: 28 },
  featuredHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, marginBottom: 12,
  },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  horizontalList: { paddingLeft: 20, paddingRight: 8, gap: 12 },

  /* ── Explore More Banner ── */
  exploreBanner: {
    marginHorizontal: 20, marginTop: 14,
    backgroundColor: '#fff',
    borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1.5, borderColor: Colors.primary + '22',
    shadowColor: Colors.primary, shadowOpacity: 0.06, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  exploreBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  exploreIconCircle: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center', alignItems: 'center',
  },
  exploreTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  exploreSubtitle: { fontSize: 12, color: '#aaa', marginTop: 2 },
  exploreArrow: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center', alignItems: 'center',
  },

  /* ── Mini Card ── */
  card: {
    width: CARD_WIDTH, backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  cardImageBox: { height: 110, justifyContent: 'center', alignItems: 'center' },
  cardImage: { width: '100%', height: '100%' },
  cardIconCircle: { width: 54, height: 54, borderRadius: 27, justifyContent: 'center', alignItems: 'center' },
  outOfStockBadge: {
    position: 'absolute', bottom: 6, left: 6,
    backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5,
  },
  outOfStockText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  cardBody: { padding: 10, gap: 3 },
  cardNameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 4 },
  cardName: { fontSize: 12, fontWeight: '700', color: '#1A1A1A', flex: 1 },
  cardUnit: { fontSize: 11, fontWeight: '600' },
  cardPrice: { fontSize: 15, fontWeight: '800' },

  /* ── Quick Actions ── */
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1A1A1A', paddingHorizontal: 20, marginBottom: 14, letterSpacing: -0.2 },
  quickActions: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 32 },
  quickAction: {
    flex: 1, alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, paddingVertical: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  quickActionIcon: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  quickActionText: { fontSize: 11, color: '#666', textAlign: 'center', fontWeight: '600' },

  /* ── Branding ── */
  brandingSection: { alignItems: 'center', paddingBottom: 36, paddingTop: 8 },
  brandingDivider: { width: 40, height: 2, backgroundColor: '#E8E8E8', borderRadius: 1, marginBottom: 16 },
  brandingContent: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  brandName: { fontSize: 20, fontWeight: '800', color: Colors.primary, letterSpacing: -0.5 },
  brandTagline: { fontSize: 12, color: '#bbb', fontWeight: '500', letterSpacing: 0.3 },

  /* ── Modal ── */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingTop: 12, paddingBottom: 34, maxHeight: '92%',
  },
  dragHandle: { width: 40, height: 4, backgroundColor: '#E0E0E0', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalProductHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 16, padding: 14, marginBottom: 4 },
  modalIconCircle: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#1A1A1A', letterSpacing: -0.3, flexShrink: 1 },
  modalPrice: { fontSize: 14, fontWeight: '700', marginTop: 3 },
  closeBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.07)', justifyContent: 'center', alignItems: 'center' },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 16 },
  modalSectionLabel: { fontSize: 11, fontWeight: '700', color: '#bbb', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12, marginTop: 4 },
  quantityRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 20 },
  qtyBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
  qtyValue: { fontSize: 22, fontWeight: '800', color: '#1A1A1A', minWidth: 30, textAlign: 'center' },
  patternGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  patternCard: {
    width: '47%', padding: 14, borderRadius: 16,
    backgroundColor: '#F8F8F8', borderWidth: 1.5, borderColor: 'transparent', gap: 6,
  },
  patternLabel: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  patternDesc: { fontSize: 11, color: '#999' },
  daysRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  dayCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
  dayLabel: { fontSize: 12, fontWeight: '700', color: '#999' },
});