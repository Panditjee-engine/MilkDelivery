import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
  Animated,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api } from '../../src/services/api';
import { Colors } from '../../src/constants/colors';
import LoadingScreen from '../../src/components/LoadingScreen';

interface Subscription {
  id: string;
  product_id: string;
  product?: {
    id: string;
    name: string;
    price: number;
    unit: string;
    image?: string;
  };
  quantity: number;
  pattern: 'daily' | 'alternate' | 'custom' | 'buy_once';
  custom_days?: number[];
  start_date: string;
  end_date?: string;
  amount: number;
  status?: string;
  created_at?: string;
  admin_name?: string;
}

export default function MySubscriptionsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'past'>('active');

  // Modal states
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editQuantity, setEditQuantity] = useState(1);
  const [editPattern, setEditPattern] = useState<'daily' | 'alternate' | 'custom'>('daily');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      const data = await api.getSubscriptions();
      // ✅ Filter out buy_once — show only recurring subscriptions
      const recurringOnly = (data || []).filter(
        (sub: Subscription) => sub.pattern !== 'buy_once'
      );
      setSubscriptions(recurringOnly);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      Alert.alert('Error', 'Failed to load subscriptions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchSubscriptions();
  };

  const isActive = (sub: Subscription) => {
    const endDate = sub.end_date ? new Date(sub.end_date) : null;
    const now = new Date();
    return !endDate || endDate > now;
  };

  // Both lists are already buy_once-free because we filtered at fetch time
  const activeSubscriptions = subscriptions.filter(isActive);
  const pastSubscriptions = subscriptions.filter((sub) => !isActive(sub));
  const displaySubs = activeTab === 'active' ? activeSubscriptions : pastSubscriptions;

  const handleEditPress = (sub: Subscription) => {
    setEditingSubscription(sub);
    setEditQuantity(sub.quantity);
    setEditPattern(sub.pattern as 'daily' | 'alternate' | 'custom');
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingSubscription) return;
    setActionLoading(true);
    try {
      await api.updateSubscription(editingSubscription.id, {
        quantity: editQuantity,
        pattern: editPattern,
      });
      Alert.alert('Success', 'Subscription updated successfully');
      setShowEditModal(false);
      await fetchSubscriptions();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update subscription');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelSubscription = (sub: Subscription) => {
    Alert.alert(
      'Cancel Subscription?',
      `Are you sure you want to cancel the subscription for ${sub.product?.name}?`,
      [
        { text: 'Keep it', onPress: () => { } },
        {
          text: 'Cancel Subscription',
          onPress: async () => {
            setActionLoading(true);
            try {
              await api.cancelSubscription(sub.id);
              Alert.alert('Success', 'Subscription cancelled');
              await fetchSubscriptions();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to cancel subscription');
            } finally {
              setActionLoading(false);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  if (loading) return <LoadingScreen />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Subscriptions</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.activeTab]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>
            Active ({activeSubscriptions.length})
          </Text>
          {activeTab === 'active' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'past' && styles.activeTab]}
          onPress={() => setActiveTab('past')}
        >
          <Text style={[styles.tabText, activeTab === 'past' && styles.activeTabText]}>
            Past ({pastSubscriptions.length})
          </Text>
          {activeTab === 'past' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
      </View>

      {/* Subscriptions List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scrollContent}
      >
        {displaySubs.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="repeat-outline" size={48} color="#ccc" />
            <Text style={styles.emptyTitle}>
              {activeTab === 'active'
                ? 'No active subscriptions'
                : 'No past subscriptions'}
            </Text>
            <Text style={styles.emptySubText}>
              {activeTab === 'active'
                ? 'Subscribe to a product with Daily, Alternate, or Custom delivery to see it here.'
                : 'Expired recurring subscriptions will appear here.'}
            </Text>
            {activeTab === 'active' && (
              <TouchableOpacity
                style={styles.browseButton}
                onPress={() => router.push('/(customer)/catalog')}
              >
                <Ionicons name="grid-outline" size={14} color="#fff" />
                <Text style={styles.browseButtonText}>Browse Catalog</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          displaySubs.map((sub) => (
            <SubscriptionCard
              key={sub.id}
              subscription={sub}
              isActive={activeTab === 'active'}
              onEdit={handleEditPress}
              onCancel={handleCancelSubscription}
            />
          ))
        )}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Edit Modal */}
      <EditSubscriptionModal
        visible={showEditModal}
        subscription={editingSubscription}
        quantity={editQuantity}
        pattern={editPattern}
        onQuantityChange={setEditQuantity}
        onPatternChange={setEditPattern}
        onSave={handleSaveEdit}
        onClose={() => setShowEditModal(false)}
        loading={actionLoading}
      />
    </SafeAreaView>
  );
}

// ─── Subscription Card 

function SubscriptionCard({
  subscription,
  isActive,
  onEdit,
  onCancel,
}: {
  subscription: Subscription;
  isActive: boolean;
  onEdit: (sub: Subscription) => void;
  onCancel: (sub: Subscription) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const chevronAnim = useRef(new Animated.Value(0)).current;

  const toggle = () => {
    const toValue = expanded ? 0 : 1;
    Animated.timing(chevronAnim, {
      toValue,
      duration: 220,
      useNativeDriver: true,
    }).start();
    setExpanded(!expanded);
  };

  const chevronRotate = chevronAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const patternLabel = {
    daily: 'Every Day',
    alternate: 'Alternate Days',
    custom: 'Custom Days',
    // buy_once is intentionally omitted — filtered at data level
  }[subscription.pattern] ?? subscription.pattern;

  const patternIcon = {
    daily: 'sunny-outline',
    alternate: 'git-compare-outline',
    custom: 'calendar-outline',
  }[subscription.pattern] as any ?? 'repeat-outline';

  return (
    <View style={styles.card}>
      {/* Card Header */}
      <TouchableOpacity style={styles.cardHeader} onPress={toggle} activeOpacity={0.7}>
        <View style={styles.cardLeft}>
          <View style={styles.productImageBox}>
            <Ionicons name="cube" size={28} color={Colors.primary} />
          </View>

          <View style={styles.productInfo}>
            <Text style={styles.productName} numberOfLines={1}>
              {subscription.product?.name || 'Product'}
            </Text>

            <View style={styles.patternBadge}>
              <Ionicons name={patternIcon} size={11} color={Colors.primary} />
              <Text style={styles.patternText}>{patternLabel}</Text>
            </View>

            <View style={styles.quantityRow}>
              <Text style={styles.quantityLabel}>
                {subscription.quantity}× {subscription.product?.unit || 'unit'}
              </Text>
              <View style={styles.priceBadge}>
                <Text style={styles.priceText}>₹{subscription.amount}</Text>
              </View>
            </View>
          </View>
        </View>

        <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
          <Ionicons name="chevron-down" size={20} color="#999" />
        </Animated.View>
      </TouchableOpacity>

      {/* Expanded Content */}
      {expanded && (
        <View style={styles.cardExpanded}>
          <View style={styles.divider} />

          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Start Date</Text>
              <Text style={styles.detailValue}>{subscription.start_date}</Text>
            </View>
            {subscription.end_date && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>End Date</Text>
                <Text style={styles.detailValue}>{subscription.end_date}</Text>
              </View>
            )}
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Price / Unit</Text>
              <Text style={[styles.detailValue, { color: Colors.primary }]}>
                ₹{subscription.product?.price}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Total Amount</Text>
              <Text style={[styles.detailValue, { fontWeight: '700' }]}>
                ₹{subscription.amount}
              </Text>
            </View>
          </View>

          {isActive && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => onEdit(subscription)}
              >
                <Ionicons name="pencil-outline" size={15} color={Colors.primary} />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => onCancel(subscription)}
              >
                <Ionicons name="trash-outline" size={15} color="#ef4444" />
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Edit Modal 

function EditSubscriptionModal({
  visible,
  subscription,
  quantity,
  pattern,
  onQuantityChange,
  onPatternChange,
  onSave,
  onClose,
  loading,
}: {
  visible: boolean;
  subscription: Subscription | null;
  quantity: number;
  pattern: string;
  onQuantityChange: (qty: number) => void;
  onPatternChange: (pattern: 'daily' | 'alternate' | 'custom') => void;
  onSave: () => void;
  onClose: () => void;
  loading: boolean;
}) {
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 15,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  if (!subscription) return null;

  // Only recurring patterns are shown in the edit modal
  const recurringPatterns: Array<{ key: 'daily' | 'alternate' | 'custom'; label: string; icon: string }> = [
    { key: 'daily', label: 'Daily', icon: 'sunny-outline' },
    { key: 'alternate', label: 'Alternate Days', icon: 'git-compare-outline' },
    { key: 'custom', label: 'Custom Days', icon: 'calendar-outline' },
  ];

  return (
    <Modal visible={visible} transparent animationType="none">
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <Animated.View
          style={[styles.modalContent, { transform: [{ translateY: slideAnim }] }]}
        >
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Subscription</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#1A1A1A" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Product Info */}
            <View style={styles.infoBox}>
              <Ionicons name="cube-outline" size={16} color={Colors.primary} />
              <Text style={styles.infoText}>{subscription.product?.name}</Text>
            </View>

            {/* Quantity */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quantity</Text>
              <View style={styles.quantitySelector}>
                <TouchableOpacity
                  style={styles.qtyButton}
                  onPress={() => quantity > 1 && onQuantityChange(quantity - 1)}
                >
                  <Ionicons name="remove-circle-outline" size={28} color={Colors.primary} />
                </TouchableOpacity>
                <Text style={styles.qtyDisplay}>{quantity}</Text>
                <TouchableOpacity
                  style={styles.qtyButton}
                  onPress={() => onQuantityChange(quantity + 1)}
                >
                  <Ionicons name="add-circle-outline" size={28} color={Colors.primary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Delivery Pattern — recurring only */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Delivery Pattern</Text>
              <View style={styles.patternOptions}>
                {recurringPatterns.map(({ key, label, icon }) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.patternOption,
                      pattern === key && styles.patternOptionActive,
                    ]}
                    onPress={() => onPatternChange(key)}
                  >
                    <View
                      style={[
                        styles.patternRadio,
                        pattern === key && styles.patternRadioActive,
                      ]}
                    >
                      {pattern === key && <View style={styles.patternRadioDot} />}
                    </View>
                    <Ionicons
                      name={icon as any}
                      size={16}
                      color={pattern === key ? Colors.primary : '#aaa'}
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={[
                        styles.patternLabel,
                        pattern === key && styles.patternLabelActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={loading}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, loading && { opacity: 0.6 }]}
              onPress={onSave}
              disabled={loading}
            >
              <Text style={styles.saveBtnText}>{loading ? 'Saving…' : 'Save Changes'}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── Styles 

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },

  // Tabs
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    position: 'relative',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999',
  },
  activeTabText: {
    color: Colors.primary,
    fontWeight: '700',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    height: 2,
    backgroundColor: Colors.primary,
    width: '100%',
  },

  // Scroll
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    color: '#555',
    marginTop: 14,
    fontWeight: '700',
  },
  emptySubText: {
    fontSize: 13,
    color: '#999',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 20,
  },
  browseButton: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 11,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  browseButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },

  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  cardLeft: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  productImageBox: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: '#FFF4E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  patternBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF4E8',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  patternText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quantityLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  priceBadge: {
    backgroundColor: '#2ECC71',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  priceText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },

  // Expanded
  cardExpanded: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginBottom: 12,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  detailItem: {
    width: '48%',
    backgroundColor: '#F8F9FA',
    padding: 10,
    borderRadius: 8,
  },
  detailLabel: {
    fontSize: 11,
    color: '#999',
    fontWeight: '600',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 13,
    color: '#1A1A1A',
    fontWeight: '700',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFF4E8',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFE8D6',
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ef4444',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F0F9FF',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginBottom: 20,
  },
  infoText: {
    fontSize: 13,
    color: '#0369A1',
    fontWeight: '600',
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    backgroundColor: '#F8F9FA',
    paddingVertical: 12,
    borderRadius: 10,
  },
  qtyButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyDisplay: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    minWidth: 44,
    textAlign: 'center',
  },
  patternOptions: {
    gap: 10,
  },
  patternOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  patternOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: '#FFF4E8',
  },
  patternRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
  },
  patternRadioActive: {
    borderColor: Colors.primary,
  },
  patternRadioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  patternLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  patternLabelActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666',
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});