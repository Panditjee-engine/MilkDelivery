import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/services/api';
import { Colors } from '../../src/constants/colors';
import LoadingScreen from '../../src/components/LoadingScreen';

type FilterType = 'all' | 'today' | 'upcoming';

// Only recurring patterns — buy_once are plain orders, not subscriptions
const RECURRING_PATTERNS = ['daily', 'alternate', 'custom'];

export default function SubscriptionsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [checkinStatus, setCheckinStatus] = useState<any>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [subs, status] = await Promise.all([
        // GET /subscriptions — returns the logged-in user's own active subscriptions.
        // Works for any role (customer / rider / admin).
        // Each sub has pattern, start_date, end_date, items[], customer_name, etc.
        api.getSubscriptions(),
        api.getCheckinStatus(),
      ]);

      console.log('[Subscriptions] raw count:', subs?.length);
      console.log('[Subscriptions] patterns:', [...new Set(subs?.map((s: any) => s.pattern))]);

      // Keep only recurring ones — exclude buy_once
      const recurring = (subs || []).filter((s: any) =>
        RECURRING_PATTERNS.includes(s.pattern)
      );

      console.log('[Subscriptions] recurring:', recurring.length);
      setSubscriptions(recurring);
      setCheckinStatus(status);
    } catch (err: any) {
      console.error('[Subscriptions] error:', err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  /**
   * Mirrors backend _should_deliver_on_date().
   * Python weekday: Mon=0…Sun=6
   * JS getDay():    Sun=0, Mon=1…Sat=6  → convert: js===0 ? 6 : js-1
   */
  const isDeliveryToday = (sub: any): boolean => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const { start_date, end_date, pattern, custom_days } = sub;

    if (!start_date || todayStr < start_date) return false;
    if (end_date && todayStr > end_date) return false;

    const start    = new Date(start_date);
    const jsDay    = today.getDay();
    const pyDay    = jsDay === 0 ? 6 : jsDay - 1;
    const daysDiff = Math.round((today.getTime() - start.getTime()) / 86400000);

    if (pattern === 'daily')     return true;
    if (pattern === 'alternate') return daysDiff % 2 === 0;
    if (pattern === 'custom')    return (custom_days ?? []).includes(pyDay);
    return false;
  };

  const isActive = (sub: any): boolean => {
    const todayStr = new Date().toISOString().split('T')[0];
    return !sub.end_date || sub.end_date >= todayStr;
  };

  const filteredSubscriptions = subscriptions.filter((sub) => {
    if (filter === 'today')    return isDeliveryToday(sub);
    if (filter === 'upcoming') return isActive(sub) && !isDeliveryToday(sub);
    return true;
  });

  const todayCount    = subscriptions.filter(isDeliveryToday).length;
  const upcomingCount = subscriptions.filter(s => isActive(s) && !isDeliveryToday(s)).length;

  if (loading) return <LoadingScreen />;

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

      {isShiftOff && (
        <View style={styles.warningBanner}>
          <Ionicons name="alert-circle" size={18} color="#f59e0b" />
          <Text style={styles.warningText}>
            Start your shift to accept subscription deliveries
          </Text>
        </View>
      )}

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {([
          { key: 'all',      label: 'All',      count: subscriptions.length },
          { key: 'today',    label: 'Today',    count: todayCount },
          { key: 'upcoming', label: 'Upcoming', count: upcomingCount },
        ] as { key: FilterType; label: string; count: number }[]).map(({ key, label, count }) => (
          <TouchableOpacity
            key={key}
            style={[styles.filterTab, filter === key && styles.filterTabActive]}
            onPress={() => setFilter(key)}
          >
            <Text style={[styles.filterTabText, filter === key && styles.filterTabTextActive]}>
              {label} ({count})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scrollContent}
      >
        {filteredSubscriptions.length > 0 ? (
          filteredSubscriptions.map((sub) => (
            <SubscriptionCard
              key={sub.id || sub._id}
              subscription={sub}
              isShiftOff={isShiftOff}
              deliversToday={isDeliveryToday(sub)}
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="repeat-outline" size={64} color="#ddd" />
            <Text style={styles.emptyTitle}>No Subscriptions</Text>
            <Text style={styles.emptyText}>
              {filter === 'today'
                ? 'No recurring deliveries scheduled for today'
                : filter === 'upcoming'
                ? 'No upcoming recurring deliveries'
                : 'No active recurring subscriptions'}
            </Text>
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Subscription Card ────────────────────────────────────────────

function SubscriptionCard({
  subscription: sub,
  isShiftOff,
  deliversToday,
}: {
  subscription: any;
  isShiftOff: boolean;
  deliversToday: boolean;
}) {
  const patternConfig: Record<string, { label: string; icon: any; color: string; bg: string }> = {
    daily:     { label: 'Daily',          icon: 'calendar',        color: '#2563eb', bg: '#EFF6FF' },
    alternate: { label: 'Alternate Days', icon: 'calendar-outline', color: '#7c3aed', bg: '#F5F3FF' },
    custom:    { label: 'Custom',         icon: 'calendar-number', color: '#0891b2', bg: '#ECFEFF' },
  };
  const pattern = patternConfig[sub.pattern] ?? {
    label: sub.pattern ?? 'Regular', icon: 'calendar', color: '#666', bg: '#F5F5F5',
  };

  // Dates
  const startFmt = new Date(sub.start_date).toLocaleDateString('en-IN', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
  const endFmt = sub.end_date
    ? new Date(sub.end_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
    : 'Ongoing';

  // Items — handle both legacy single-product and new items[] shape
  const items: any[] = sub.items ?? [];
  const productName =
    sub.product_id?.name ||
    (items.length === 1 ? items[0]?.name || 'Product'
      : items.length > 1 ? `${items.length} Products`
      : 'Product');

  const totalQty =
    sub.quantity ??
    sub.total_quantity ??
    items.reduce((a: number, i: any) => a + (i.quantity ?? 0), 0);

  const unit         = sub.product_id?.unit || 'units';
  const totalAmount  = Number(sub.amount ?? sub.total_amount ?? 0).toFixed(2);
  const slot         = sub.delivery_slot || sub.product_id?.delivery_time || '–';

  const address =
    sub.customer_address ||
    sub.address?.line1 ||
    sub.customer_id?.address?.street ||
    'Address not available';

  return (
    <View style={styles.card}>
      {/* Today badge */}
      {deliversToday && (
        <View style={styles.todayBadge}>
          <Ionicons name="flash" size={12} color="#fff" />
          <Text style={styles.todayBadgeText}>Delivers Today</Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={styles.productIcon}>
            <Ionicons name="cube" size={22} color={Colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.productName} numberOfLines={1}>{productName}</Text>
            <Text style={styles.customerName}>{sub.customer_name || 'Customer'}</Text>
          </View>
        </View>
        <View style={[styles.patternBadge, { backgroundColor: pattern.bg }]}>
          <Ionicons name={pattern.icon} size={13} color={pattern.color} />
          <Text style={[styles.patternText, { color: pattern.color }]}>{pattern.label}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Details */}
      <View style={styles.detailsGrid}>
        <View style={styles.detailItem}>
          <View style={[styles.detailIcon, { backgroundColor: '#FFF4E8' }]}>
            <Ionicons name="cube-outline" size={17} color={Colors.primary} />
          </View>
          <View>
            <Text style={styles.detailLabel}>Quantity</Text>
            <Text style={styles.detailValue}>{totalQty} {unit}</Text>
          </View>
        </View>

        <View style={styles.detailItem}>
          <View style={[styles.detailIcon, { backgroundColor: '#EFF6FF' }]}>
            <Ionicons name="calendar-outline" size={17} color="#2563eb" />
          </View>
          <View>
            <Text style={styles.detailLabel}>Start Date</Text>
            <Text style={styles.detailValue}>{startFmt}</Text>
          </View>
        </View>

        <View style={styles.detailItem}>
          <View style={[styles.detailIcon, { backgroundColor: '#F0FDF4' }]}>
            <Ionicons name="time-outline" size={17} color="#22c55e" />
          </View>
          <View>
            <Text style={styles.detailLabel}>Delivery Slot</Text>
            <Text style={styles.detailValue}>{slot}</Text>
          </View>
        </View>

        <View style={styles.detailItem}>
          <View style={[styles.detailIcon, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="cash-outline" size={17} color="#ef4444" />
          </View>
          <View>
            <Text style={styles.detailLabel}>Amount</Text>
            <Text style={styles.detailValue}>₹{totalAmount}</Text>
          </View>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Address */}
      <View style={styles.addressRow}>
        <Ionicons name="location-outline" size={16} color={Colors.primary} />
        <Text style={styles.addressText} numberOfLines={2}>{address}</Text>
      </View>

      <View style={styles.divider} />

      {/* Period */}
      <View style={styles.periodRow}>
        <View>
          <Text style={styles.detailLabel}>Subscription Period</Text>
          <Text style={styles.periodText}>{startFmt} → {endFmt}</Text>
        </View>
        <View style={[styles.patternBadge, { backgroundColor: pattern.bg }]}>
          <Text style={[styles.patternText, { color: pattern.color }]}>{pattern.label}</Text>
        </View>
      </View>

      {/* Action */}
      <TouchableOpacity
        style={[styles.actionBtn, isShiftOff && styles.actionBtnDisabled]}
        disabled={isShiftOff}
      >
        <Ionicons
          name={isShiftOff ? 'lock-closed' : 'arrow-forward'}
          size={17}
          color={isShiftOff ? '#ccc' : Colors.primary}
        />
        <Text style={[styles.actionBtnText, isShiftOff && styles.actionBtnTextDisabled]}>
          {isShiftOff ? 'Start Shift to Accept' : 'View Details'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },

  warningBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFFBEB', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#FEE2E2',
  },
  warningText: { fontSize: 13, color: '#92400e', fontWeight: '500', flex: 1 },

  filterContainer: {
    flexDirection: 'row', backgroundColor: '#fff',
    paddingHorizontal: 20, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  filterTab: {
    flex: 1, paddingVertical: 10, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  filterTabActive: { borderBottomColor: '#FFD700' },
  filterTabText: { fontSize: 13, fontWeight: '600', color: '#999' },
  filterTabTextActive: { color: '#1A1A1A' },

  scrollContent: { paddingTop: 16, paddingHorizontal: 20, paddingBottom: 20 },

  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },

  todayBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start', backgroundColor: '#22c55e',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginBottom: 10,
  },
  todayBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 12,
  },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  productIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#FFF4E8', justifyContent: 'center', alignItems: 'center',
  },
  productName: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 2 },
  customerName: { fontSize: 12, color: '#999' },

  patternBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8,
  },
  patternText: { fontSize: 11, fontWeight: '600' },

  divider: { height: 1, backgroundColor: '#F5F5F5', marginVertical: 12 },

  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  detailItem: { flex: 1, minWidth: '46%', flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailIcon: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  detailLabel: { fontSize: 11, color: '#999', fontWeight: '500' },
  detailValue: { fontSize: 13, fontWeight: '700', color: '#1A1A1A', marginTop: 1 },

  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  addressText: { fontSize: 13, color: '#666', lineHeight: 18, flex: 1 },

  periodRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  periodText: { fontSize: 13, fontWeight: '600', color: '#1A1A1A', marginTop: 2 },

  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#FFF4E8', paddingVertical: 12,
    borderRadius: 10, marginTop: 12,
  },
  actionBtnDisabled: { backgroundColor: '#F5F5F5' },
  actionBtnText: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  actionBtnTextDisabled: { color: '#ccc' },

  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 100 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginTop: 16 },
  emptyText: { fontSize: 14, color: '#999', marginTop: 8, textAlign: 'center', lineHeight: 22 },
});