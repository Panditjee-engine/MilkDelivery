import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/services/api';
import { Colors } from '../../src/constants/colors';
import LoadingScreen from '../../src/components/LoadingScreen';

type FilterType = 'all' | 'today' | 'upcoming';

export default function SubscriptionsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [checkinStatus, setCheckinStatus] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [subs, status] = await Promise.all([
        api.getSubscriptions(),
        api.getCheckinStatus(),
      ]);
      setSubscriptions(subs || []);
      setCheckinStatus(status);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const getPatternLabel = (pattern: string) => {
    const patterns: any = {
      daily: { label: 'Daily', icon: 'calendar', color: '#2563eb' },
      alternate: { label: 'Alternate Days', icon: 'calendar-outline', color: '#7c3aed' },
      custom: { label: 'Custom', icon: 'calendar-number', color: '#0891b2' },
    };
    return patterns[pattern] || { label: 'Regular', icon: 'calendar', color: '#666' };
  };

  const isDeliveryToday = (subscription: any) => {
    const today = new Date().toLocaleDateString();
    const deliveryDate = new Date(subscription.start_date).toLocaleDateString();
    return deliveryDate === today;
  };

  const isDeliveryUpcoming = (subscription: any) => {
    const deliveryDate = new Date(subscription.start_date).getTime();
    const today = new Date().getTime();
    return deliveryDate > today;
  };

  const filteredSubscriptions = subscriptions.filter((sub) => {
    if (filter === 'today') return isDeliveryToday(sub);
    if (filter === 'upcoming') return isDeliveryUpcoming(sub);
    return true;
  });

  const todayCount = subscriptions.filter(isDeliveryToday).length;
  const upcomingCount = subscriptions.filter(isDeliveryUpcoming).length;

  if (loading) return <LoadingScreen />;

  // Check if shift is OFF
  const isShiftOff = !checkinStatus?.checked_in || checkinStatus?.checked_out;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subscriptions</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Shift Status Banner */}
      {isShiftOff && (
        <View style={styles.warningBanner}>
          <Ionicons name="alert-circle" size={18} color="#f59e0b" />
          <Text style={styles.warningText}>Start your shift to accept subscription deliveries</Text>
        </View>
      )}

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterTabText, filter === 'all' && styles.filterTabTextActive]}>
            All ({subscriptions.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'today' && styles.filterTabActive]}
          onPress={() => setFilter('today')}
        >
          <Text style={[styles.filterTabText, filter === 'today' && styles.filterTabTextActive]}>
            Today ({todayCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'upcoming' && styles.filterTabActive]}
          onPress={() => setFilter('upcoming')}
        >
          <Text style={[styles.filterTabText, filter === 'upcoming' && styles.filterTabTextActive]}>
            Upcoming ({upcomingCount})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scrollContent}
      >
        {filteredSubscriptions.length > 0 ? (
          filteredSubscriptions.map((subscription) => (
            <SubscriptionCard
              key={subscription.id || subscription._id}
              subscription={subscription}
              isShiftOff={isShiftOff}
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={64} color="#ddd" />
            <Text style={styles.emptyTitle}>No Subscriptions</Text>
            <Text style={styles.emptyText}>
              {filter === 'today'
                ? 'No deliveries scheduled for today'
                : filter === 'upcoming'
                ? 'No upcoming deliveries'
                : 'No subscriptions available'}
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// Subscription Card Component
function SubscriptionCard({
  subscription,
  isShiftOff,
}: {
  subscription: any;
  isShiftOff: boolean;
}) {
  const patternConfig = {
    daily: { label: 'Daily', icon: 'calendar', color: '#2563eb', bg: '#EFF6FF' },
    alternate: { label: 'Alternate Days', icon: 'calendar-outline', color: '#7c3aed', bg: '#F5F3FF' },
    custom: { label: 'Custom', icon: 'calendar-number', color: '#0891b2', bg: '#ECFEFF' },
  } as any;

  const pattern = patternConfig[subscription.pattern] || {
    label: 'Regular',
    icon: 'calendar',
    color: '#666',
    bg: '#F5F5F5',
  };

  const deliveryDate = new Date(subscription.start_date);
  const deliveryTime = subscription.product_id?.delivery_time || '9:00 AM';
  const formatDate = deliveryDate.toLocaleDateString('en-IN', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const endDate = subscription.end_date
    ? new Date(subscription.end_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
    : 'Ongoing';

  return (
    <View style={styles.subscriptionCard}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={styles.productIcon}>
            <Ionicons name="cube" size={22} color={Colors.primary} />
          </View>
          <View>
            <Text style={styles.productName}>
              {subscription.product_id?.name || 'Product'}
            </Text>
            <Text style={styles.customerName}>
              {subscription.customer_name || 'Customer'}
            </Text>
          </View>
        </View>
        <View style={[styles.patternBadge, { backgroundColor: pattern.bg }]}>
          <Ionicons name={pattern.icon} size={14} color={pattern.color} />
          <Text style={[styles.patternText, { color: pattern.color }]}>{pattern.label}</Text>
        </View>
      </View>

      <View style={styles.cardDivider} />

      {/* Delivery Details */}
      <View style={styles.detailsGrid}>
        {/* Quantity */}
        <View style={styles.detailItem}>
          <View style={[styles.detailIcon, { backgroundColor: '#FFF4E8' }]}>
            <Ionicons name="cube-outline" size={18} color={Colors.primary} />
          </View>
          <View>
            <Text style={styles.detailLabel}>Quantity</Text>
            <Text style={styles.detailValue}>{subscription.quantity} {subscription.product_id?.unit || 'units'}</Text>
          </View>
        </View>

        {/* Date */}
        <View style={styles.detailItem}>
          <View style={[styles.detailIcon, { backgroundColor: '#EFF6FF' }]}>
            <Ionicons name="calendar-outline" size={18} color="#2563eb" />
          </View>
          <View>
            <Text style={styles.detailLabel}>Delivery Date</Text>
            <Text style={styles.detailValue}>{formatDate}</Text>
          </View>
        </View>

        {/* Time */}
        <View style={styles.detailItem}>
          <View style={[styles.detailIcon, { backgroundColor: '#F0FDF4' }]}>
            <Ionicons name="time-outline" size={18} color="#22c55e" />
          </View>
          <View>
            <Text style={styles.detailLabel}>Delivery Time</Text>
            <Text style={styles.detailValue}>{deliveryTime}</Text>
          </View>
        </View>

        {/* Amount */}
        <View style={styles.detailItem}>
          <View style={[styles.detailIcon, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="cash-outline" size={18} color="#ef4444" />
          </View>
          <View>
            <Text style={styles.detailLabel}>Amount</Text>
            <Text style={styles.detailValue}>₹{subscription.amount?.toFixed(2) || '0.00'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.cardDivider} />

      {/* Delivery Address */}
      <View style={styles.addressSection}>
        <View style={styles.addressHeader}>
          <Ionicons name="location-outline" size={18} color={Colors.primary} />
          <Text style={styles.addressTitle}>Delivery Address</Text>
        </View>
        <Text style={styles.addressText}>
          {subscription.customer_address ||
            `${subscription.customer_id?.address?.street || 'Address not available'}`}
        </Text>
      </View>

      <View style={styles.cardDivider} />

      {/* Duration */}
      <View style={styles.durationRow}>
        <View style={styles.durationLeft}>
          <Text style={styles.durationLabel}>Subscription Period</Text>
          <Text style={styles.durationText}>
            From {formatDate} to {endDate}
          </Text>
        </View>
        <View style={styles.durationBadge}>
          <Text style={styles.durationBadgeText}>
            {subscription.pattern === 'daily' ? 'Daily' : 'Periodic'}
          </Text>
        </View>
      </View>

      {/* Action Button */}
      <TouchableOpacity
        style={[styles.actionButton, isShiftOff && styles.actionButtonDisabled]}
        disabled={isShiftOff}
      >
        <Ionicons
          name={isShiftOff ? 'lock-closed' : 'arrow-forward'}
          size={18}
          color={isShiftOff ? '#ccc' : Colors.primary}
        />
        <Text style={[styles.actionButtonText, isShiftOff && styles.actionButtonTextDisabled]}>
          {isShiftOff ? 'Start Shift to Accept' : 'View Details'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },

  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FEE2E2',
  },
  warningText: {
    fontSize: 13,
    color: '#92400e',
    fontWeight: '500',
    flex: 1,
  },

  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  filterTabActive: {
    borderBottomColor: '#FFD700',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999',
  },
  filterTabTextActive: {
    color: '#1A1A1A',
  },

  scrollContent: {
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },

  subscriptionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  productIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFF4E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  customerName: {
    fontSize: 12,
    color: '#999',
  },

  patternBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  patternText: {
    fontSize: 11,
    fontWeight: '600',
  },

  cardDivider: {
    height: 1,
    backgroundColor: '#F5F5F5',
    marginVertical: 12,
  },

  detailsGrid: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  detailItem: {
    flex: 1,
    minWidth: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 11,
    color: '#999',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 2,
  },

  addressSection: {
    marginVertical: 8,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  addressTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  addressText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginLeft: 26,
  },

  durationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  durationLeft: {
    flex: 1,
  },
  durationLabel: {
    fontSize: 11,
    color: '#999',
    fontWeight: '500',
  },
  durationText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: 2,
  },
  durationBadge: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  durationBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#666',
  },

  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFF4E8',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  actionButtonDisabled: {
    backgroundColor: '#F5F5F5',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  actionButtonTextDisabled: {
    color: '#ccc',
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
});
