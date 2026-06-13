import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Alert, Modal, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/services/api';
import { Colors } from '../../src/constants/colors';
import LoadingScreen from '../../src/components/LoadingScreen';

// ── Types ──────────────────────────────────────────────────────────────────

type FilterType = 'all' | 'today' | 'upcoming';

interface SubItem {
  product_id: string;
  product_name?: string;
  name?: string;
  quantity: number;
  price: number;
  amount: number;
}

interface Subscription {
  id: string;
  items: SubItem[];
  total_quantity: number;
  total_amount: number;
  pattern: string;
  custom_days?: number[];
  start_date: string;
  end_date?: string;
  delivery_slot?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_address?: any;
  address?: any;
  admin_name?: string;
  is_accepted?: boolean;
  accepted_by?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const getPattern = (s: any): string =>
  String(s?.pattern ?? s?.subscription_type ?? s?.frequency ?? '').toLowerCase().trim();

const isRecurring = (s: any): boolean => {
  const p = getPattern(s);
  if (!p) return true;
  return p !== 'buy_once' && p !== 'one_time' && p !== 'once';
};

const todayStr = () => new Date().toISOString().split('T')[0];

const isDeliveryToday = (sub: any): boolean => {
  const today  = new Date();
  const tStr   = today.toISOString().split('T')[0];
  const start  = sub.start_date?.split?.('T')?.[0] ?? sub.start_date;
  const end    = sub.end_date?.split?.('T')?.[0]   ?? sub.end_date;
  if (!start || tStr < start) return false;
  if (end && tStr > end)      return false;
  const pattern   = getPattern(sub);
  const startDate = new Date(start);
  const jsDay     = today.getDay();
  const pyDay     = jsDay === 0 ? 6 : jsDay - 1;
  const daysDiff  = Math.round((today.getTime() - startDate.getTime()) / 86400000);
  if (pattern === 'daily')     return true;
  if (pattern === 'alternate') return daysDiff % 2 === 0;
  if (pattern === 'custom' || pattern === 'weekly')
    return (sub.custom_days ?? sub.days ?? []).includes(pyDay);
  return false;
};

const isActive = (sub: any): boolean => {
  const end = sub.end_date?.split?.('T')?.[0] ?? sub.end_date;
  return !end || end >= todayStr();
};

const formatAddress = (a: any): string => {
  if (!a) return 'Address not available';
  if (typeof a === 'string') return a;
  const parts = [a.line1, a.line2, a.landmark, a.city, a.pincode].filter(Boolean);
  return parts.length ? parts.join(', ') : 'Address not available';
};

/** Parse slot string like "5:00 AM - 7:00 AM" → check if current time is within */
const isWithinSlot = (slotStr?: string): boolean => {
  if (!slotStr) return true; // no slot = always show
  try {
    const parts = slotStr.split('-').map(s => s.trim());
    if (parts.length < 2) return true;
    const toMins = (t: string) => {
      const [time, period] = t.split(' ');
      let [h, m] = time.split(':').map(Number);
      if (period === 'PM' && h !== 12) h += 12;
      if (period === 'AM' && h === 12) h = 0;
      return h * 60 + m;
    };
    const now   = new Date();
    const nowM  = now.getHours() * 60 + now.getMinutes();
    return nowM >= toMins(parts[0]) && nowM <= toMins(parts[1]);
  } catch { return true; }
};

const daysUntilEnd = (endDate?: string): number | null => {
  if (!endDate) return null;
  const end   = new Date(endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((end.getTime() - today.getTime()) / 86400000));
};

const PATTERN_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  daily:     { label: 'Daily',          icon: 'calendar',         color: '#2563eb', bg: '#EFF6FF' },
  alternate: { label: 'Alternate Days', icon: 'calendar-outline', color: '#7c3aed', bg: '#F5F3FF' },
  custom:    { label: 'Custom Days',    icon: 'calendar-number',  color: '#0891b2', bg: '#ECFEFF' },
  weekly:    { label: 'Weekly',         icon: 'calendar-number',  color: '#0891b2', bg: '#ECFEFF' },
};

// ── Main Screen ────────────────────────────────────────────────────────────

export default function SubscriptionsScreen() {
  const router = useRouter();

  const [loading,        setLoading]        = useState(true);
  const [refreshing,     setRefreshing]     = useState(false);
  const [subscriptions,  setSubscriptions]  = useState<Subscription[]>([]);
  const [filter,         setFilter]         = useState<FilterType>('all');
  const [checkinStatus,  setCheckinStatus]  = useState<any>(null);
  const [error,          setError]          = useState<string | null>(null);
  const [deliveredToday, setDeliveredToday] = useState<Set<string>>(new Set());
  const [acceptedIds,    setAcceptedIds]    = useState<Set<string>>(new Set());
  const [selectedSub,    setSelectedSub]    = useState<Subscription | null>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setError(null);
    try {
      const [subs, status] = await Promise.all([
        api.getAssignedSubscriptions(),
        api.getCheckinStatus().catch(() => null),
      ]);
      const list: any[]  = Array.isArray(subs) ? subs : subs?.subscriptions ?? subs?.data ?? [];
      const recurring    = list.filter(isRecurring);
      setSubscriptions(recurring);
      setCheckinStatus(status);
      // Restore accepted state from backend
      const accepted = new Set<string>(
        recurring.filter((s: any) => s.is_accepted).map((s: any) => s.id)
      );
      setAcceptedIds(accepted);
    } catch (err: any) {
      setError(err?.message || 'Failed to load subscriptions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  // ── Accept ───────────────────────────────────────────────────────────────
  const handleAccept = useCallback((sub: Subscription) => {
    Alert.alert(
      'Accept Subscription',
      `Accept deliveries for ${sub.customer_name || 'this customer'}?\n\nYou will deliver every scheduled day until ${sub.end_date || 'subscription ends'}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              await api.acceptSubscription(sub.id).catch(() => null);
              setAcceptedIds(prev => new Set([...prev, sub.id]));
              Alert.alert('✅ Accepted!', 'You will see a delivery button each scheduled day.');
            } catch {
              setAcceptedIds(prev => new Set([...prev, sub.id]));
            }
          },
        },
      ]
    );
  }, []);

  // ── Mark Delivered ───────────────────────────────────────────────────────
  const handleMarkDelivered = useCallback(async (sub: Subscription) => {
    const key = `${sub.id}:${todayStr()}`;
    Alert.alert(
      '📦 Mark as Delivered',
      `Confirm delivery to ${sub.customer_name || 'customer'} today (${todayStr()})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Delivered',
          onPress: async () => {
            try {
              // Find today's order for this subscription
              const orders: any[] = await api.getOrders().catch(() => []);
              const todayOrder = orders.find(
                o => o.subscription_id === sub.id && o.delivery_date === todayStr()
              );
              if (todayOrder) {
                await api.updateOrderStatus(todayOrder.id, 'delivered').catch(() => null);
              }
            } catch { /* graceful */ } finally {
              setDeliveredToday(prev => new Set([...prev, key]));
              Alert.alert('✅ Delivered!', 'Marked as delivered for today. See you tomorrow!');
            }
          },
        },
      ]
    );
  }, []);

  // ── Filter ───────────────────────────────────────────────────────────────
  const filtered = subscriptions.filter(sub => {
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>My Subscriptions</Text>
          <Text style={styles.headerSub}>{subscriptions.length} assigned</Text>
        </View>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>{todayCount} today</Text>
        </View>
      </View>

      {/* Shift warning */}
      {isShiftOff && !error && (
        <View style={styles.warningBanner}>
          <Ionicons name="alert-circle" size={15} color="#f59e0b" />
          <Text style={styles.warningText}>Start your shift to unlock delivery actions</Text>
        </View>
      )}

      {/* Filter tabs */}
      <View style={styles.tabRow}>
        {([
          { key: 'all',      label: 'All',      count: subscriptions.length },
          { key: 'today',    label: 'Today',    count: todayCount },
          { key: 'upcoming', label: 'Upcoming', count: upcomingCount },
        ] as { key: FilterType; label: string; count: number }[]).map(({ key, label, count }) => (
          <TouchableOpacity
            key={key}
            style={[styles.tab, filter === key && styles.tabActive]}
            onPress={() => setFilter(key as FilterType)}
          >
            <Text style={[styles.tabText, filter === key && styles.tabTextActive]}>{label}</Text>
            {count > 0 && (
              <View style={[styles.tabBubble, filter === key && styles.tabBubbleActive]}>
                <Text style={[styles.tabBubbleText, filter === key && styles.tabBubbleTextActive]}>
                  {count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.list}
      >
        {error ? (
          <ErrorState error={error} onRetry={fetchData} />
        ) : filtered.length > 0 ? (
          filtered.map(sub => {
            const key = `${sub.id}:${todayStr()}`;
            return (
              <SubCard
                key={sub.id}
                sub={sub}
                isShiftOff={isShiftOff}
                deliversToday={isDeliveryToday(sub)}
                isAccepted={acceptedIds.has(sub.id)}
                isDeliveredToday={deliveredToday.has(key)}
                onAccept={() => handleAccept(sub)}
                onMarkDelivered={() => handleMarkDelivered(sub)}
                onViewDetails={() => setSelectedSub(sub)}
              />
            );
          })
        ) : (
          <EmptyState filter={filter} />
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Detail Modal */}
      {selectedSub && (
        <DetailModal
          sub={selectedSub}
          isAccepted={acceptedIds.has(selectedSub.id)}
          isDeliveredToday={deliveredToday.has(`${selectedSub.id}:${todayStr()}`)}
          deliversToday={isDeliveryToday(selectedSub)}
          isShiftOff={isShiftOff}
          onAccept={() => { setSelectedSub(null); handleAccept(selectedSub); }}
          onMarkDelivered={() => { setSelectedSub(null); handleMarkDelivered(selectedSub); }}
          onClose={() => setSelectedSub(null)}
        />
      )}
    </SafeAreaView>
  );
}

// ── Sub Card ───────────────────────────────────────────────────────────────

function SubCard({
  sub, isShiftOff, deliversToday, isAccepted, isDeliveredToday,
  onAccept, onMarkDelivered, onViewDetails,
}: {
  sub: Subscription;
  isShiftOff: boolean;
  deliversToday: boolean;
  isAccepted: boolean;
  isDeliveredToday: boolean;
  onAccept: () => void;
  onMarkDelivered: () => void;
  onViewDetails: () => void;
}) {
  const patternKey   = getPattern(sub);
  const pattern      = PATTERN_CONFIG[patternKey] ?? { label: patternKey || 'Regular', icon: 'calendar', color: '#666', bg: '#F5F5F5' };
  const address      = formatAddress(sub.customer_address || sub.address);
  const items        = sub.items ?? [];
  const daysLeft     = daysUntilEnd(sub.end_date);
  const withinSlot   = isWithinSlot(sub.delivery_slot);
  const canDeliver   = isAccepted && deliversToday && !isDeliveredToday;
  const showStartMsg = isAccepted && deliversToday && !isDeliveredToday && !withinSlot;

  return (
    <View style={[
      styles.card,
      deliversToday && styles.cardToday,
      isDeliveredToday && styles.cardDone,
    ]}>

      {/* Top badges row */}
      <View style={styles.badgeRow}>
        {deliversToday && !isDeliveredToday && (
          <View style={styles.todayBadge}>
            <Ionicons name="flash" size={10} color="#fff" />
            <Text style={styles.todayBadgeText}>Delivers Today</Text>
          </View>
        )}
        {isDeliveredToday && (
          <View style={styles.doneBadge}>
            <Ionicons name="checkmark-circle" size={10} color="#fff" />
            <Text style={styles.doneBadgeText}>Done Today</Text>
          </View>
        )}
        {daysLeft !== null && daysLeft <= 3 && (
          <View style={styles.urgentBadge}>
            <Ionicons name="timer-outline" size={10} color="#fff" />
            <Text style={styles.urgentBadgeText}>{daysLeft}d left</Text>
          </View>
        )}
      </View>

      {/* Card header */}
      <View style={styles.cardHeader}>
        <View style={[styles.productIconWrap, isDeliveredToday && { backgroundColor: '#DCFCE7' }]}>
          <Ionicons name={isDeliveredToday ? 'checkmark' : 'cube'} size={20}
            color={isDeliveredToday ? '#16a34a' : Colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.productName} numberOfLines={1}>
            {items.length === 1
              ? items[0].product_name || items[0].name || 'Product'
              : items.length > 1
              ? `${items[0].product_name || 'Product'} +${items.length - 1} more`
              : 'Product'}
          </Text>
          <Text style={styles.customerName}>{sub.customer_name || 'Customer'}</Text>
        </View>
        <View style={[styles.patternPill, { backgroundColor: pattern.bg }]}>
          <Ionicons name={pattern.icon} size={10} color={pattern.color} />
          <Text style={[styles.patternPillText, { color: pattern.color }]}>{pattern.label}</Text>
        </View>
      </View>

      {/* Products breakdown */}
      <View style={styles.itemsBox}>
        {items.map((item, i) => (
          <View key={i} style={styles.itemRow}>
            <View style={styles.itemDot} />
            <Text style={styles.itemName} numberOfLines={1}>
              {item.product_name || item.name || 'Product'}
            </Text>
            <Text style={styles.itemQty}>×{item.quantity}</Text>
            <Text style={styles.itemAmt}>₹{Number(item.amount).toFixed(0)}</Text>
          </View>
        ))}
        <View style={styles.itemTotalRow}>
          <Text style={styles.itemTotalLabel}>Daily Total</Text>
          <Text style={styles.itemTotal}>₹{Number(sub.total_amount).toFixed(2)}</Text>
        </View>
      </View>

      {/* Slot + period */}
      <View style={styles.metaRow}>
        <View style={styles.metaChip}>
          <Ionicons name="time-outline" size={13} color="#2563eb" />
          <Text style={styles.metaChipText}>{sub.delivery_slot || 'Any time'}</Text>
        </View>
        <View style={styles.metaChip}>
          <Ionicons name="calendar-outline" size={13} color="#7c3aed" />
          <Text style={styles.metaChipText}>
            {sub.start_date} → {sub.end_date || 'Ongoing'}
          </Text>
        </View>
      </View>

      {/* Address */}
      <View style={styles.addressRow}>
        <Ionicons name="location-outline" size={13} color={Colors.primary} />
        <Text style={styles.addressText} numberOfLines={2}>{address}</Text>
      </View>

      {/* ── Delivery slot banner (accepted + today + not within slot yet) ── */}
      {showStartMsg && (
        <View style={styles.slotBanner}>
          <Ionicons name="alarm-outline" size={16} color="#d97706" />
          <View style={{ flex: 1 }}>
            <Text style={styles.slotBannerTitle}>Delivery Window</Text>
            <Text style={styles.slotBannerText}>
              Start delivery between {sub.delivery_slot || 'scheduled time'}
            </Text>
          </View>
        </View>
      )}

      {/* ── Action buttons ── */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.detailBtn} onPress={onViewDetails}>
          <Ionicons name="eye-outline" size={14} color="#555" />
          <Text style={styles.detailBtnText}>Details</Text>
        </TouchableOpacity>

        {!isAccepted ? (
          <TouchableOpacity
            style={[styles.acceptBtn, isShiftOff && styles.btnDisabled]}
            disabled={isShiftOff}
            onPress={onAccept}
          >
            <Ionicons name="checkmark-circle" size={15} color={isShiftOff ? '#ccc' : '#fff'} />
            <Text style={[styles.acceptBtnText, isShiftOff && { color: '#ccc' }]}>
              {isShiftOff ? 'Start Shift First' : 'Accept Subscription'}
            </Text>
          </TouchableOpacity>
        ) : isDeliveredToday ? (
          <View style={styles.doneBtn}>
            <Ionicons name="checkmark-done" size={15} color="#16a34a" />
            <Text style={styles.doneBtnText}>Delivered Today ✓</Text>
          </View>
        ) : deliversToday ? (
          <TouchableOpacity
            style={[styles.deliverBtn, !withinSlot && styles.deliverBtnEarly]}
            onPress={onMarkDelivered}
          >
            <Ionicons name="cube-outline" size={15} color="#fff" />
            <Text style={styles.deliverBtnText}>
              {withinSlot ? 'Mark as Delivered' : 'Mark Delivered (Early)'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.acceptedPill}>
            <Ionicons name="checkmark-circle" size={14} color="#2563eb" />
            <Text style={styles.acceptedPillText}>Accepted • Next: {getNextDelivery(sub)}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

/** Get next delivery date label */
function getNextDelivery(sub: Subscription): string {
  const today = new Date();
  for (let i = 1; i <= 7; i++) {
    const next    = new Date(today);
    next.setDate(today.getDate() + i);
    const nextStr = next.toISOString().split('T')[0];
    if (isDeliveryToday({ ...sub, start_date: sub.start_date })) {
      // reuse helper by shifting start
    }
    const pattern   = getPattern(sub);
    const startDate = new Date(sub.start_date);
    const jsDay     = next.getDay();
    const pyDay     = jsDay === 0 ? 6 : jsDay - 1;
    const daysDiff  = Math.round((next.getTime() - startDate.getTime()) / 86400000);
    let delivers    = false;
    if (pattern === 'daily')     delivers = true;
    if (pattern === 'alternate') delivers = daysDiff % 2 === 0;
    if (pattern === 'custom' || pattern === 'weekly')
      delivers = (sub.custom_days ?? []).includes(pyDay);
    const end = sub.end_date;
    if (end && nextStr > end) break;
    if (delivers) {
      if (i === 1) return 'Tomorrow';
      return next.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
    }
  }
  return 'Soon';
}

// ── Detail Modal ───────────────────────────────────────────────────────────

function DetailModal({
  sub, isAccepted, isDeliveredToday, deliversToday, isShiftOff,
  onAccept, onMarkDelivered, onClose,
}: {
  sub: Subscription; isAccepted: boolean; isDeliveredToday: boolean;
  deliversToday: boolean; isShiftOff: boolean;
  onAccept: () => void; onMarkDelivered: () => void; onClose: () => void;
}) {
  const items      = sub.items ?? [];
  const address    = formatAddress(sub.customer_address || sub.address);
  const patternKey = getPattern(sub);
  const pattern    = PATTERN_CONFIG[patternKey] ?? { label: patternKey || 'Regular', icon: 'calendar', color: '#666', bg: '#F5F5F5' };
  const daysLeft   = daysUntilEnd(sub.end_date);
  const withinSlot = isWithinSlot(sub.delivery_slot);

  // Build delivery timeline
  const deliveryDates: string[] = [];
  if (sub.start_date) {
    const start = new Date(sub.start_date);
    const end   = sub.end_date ? new Date(sub.end_date) : new Date(start.getTime() + 30 * 86400000);
    for (let d = new Date(start); d <= end && deliveryDates.length < 10; d.setDate(d.getDate() + 1)) {
      const dStr    = d.toISOString().split('T')[0];
      const jsDay   = d.getDay();
      const pyDay   = jsDay === 0 ? 6 : jsDay - 1;
      const daysDiff = Math.round((d.getTime() - start.getTime()) / 86400000);
      let delivers  = false;
      if (patternKey === 'daily')     delivers = true;
      if (patternKey === 'alternate') delivers = daysDiff % 2 === 0;
      if (patternKey === 'custom' || patternKey === 'weekly')
        delivers = (sub.custom_days ?? []).includes(pyDay);
      if (delivers) deliveryDates.push(dStr);
    }
  }

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Subscription Details</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={20} color="#555" />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalBody}>

          {/* Customer */}
          <View style={styles.modalSection}>
            <Text style={styles.sectionLabel}>CUSTOMER</Text>
            <View style={styles.customerBox}>
              <View style={styles.customerAvatar}>
                <Text style={styles.customerAvatarText}>
                  {(sub.customer_name || 'C')[0].toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={styles.modalCustomerName}>{sub.customer_name || 'Customer'}</Text>
                <Text style={styles.modalCustomerPhone}>{sub.customer_phone || '–'}</Text>
              </View>
            </View>
            <View style={styles.addressBox}>
              <Ionicons name="location-outline" size={14} color={Colors.primary} />
              <Text style={styles.modalAddressText}>{address}</Text>
            </View>
          </View>

          {/* Products */}
          <View style={styles.modalSection}>
            <Text style={styles.sectionLabel}>PRODUCTS TO DELIVER DAILY</Text>
            {items.map((item, i) => (
              <View key={i} style={styles.modalItemRow}>
                <View style={styles.modalItemIcon}>
                  <Ionicons name="cube-outline" size={15} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalItemName}>
                    {item.product_name || item.name || 'Product'}
                  </Text>
                  <Text style={styles.modalItemMeta}>₹{item.price} per unit</Text>
                </View>
                <View style={styles.modalItemRight}>
                  <Text style={styles.modalItemQty}>×{item.quantity}</Text>
                  <Text style={styles.modalItemAmt}>₹{Number(item.amount).toFixed(0)}</Text>
                </View>
              </View>
            ))}
            <View style={styles.modalTotalRow}>
              <Text style={styles.modalTotalLabel}>Daily Delivery Amount</Text>
              <Text style={styles.modalTotal}>₹{Number(sub.total_amount).toFixed(2)}</Text>
            </View>
          </View>

          {/* Delivery schedule */}
          <View style={styles.modalSection}>
            <Text style={styles.sectionLabel}>DELIVERY SCHEDULE</Text>
            <View style={styles.scheduleBox}>
              <View style={styles.scheduleRow}>
                <Ionicons name="repeat-outline" size={15} color={pattern.color} />
                <Text style={styles.scheduleKey}>Pattern</Text>
                <Text style={[styles.scheduleVal, { color: pattern.color }]}>{pattern.label}</Text>
              </View>
              <View style={styles.scheduleRow}>
                <Ionicons name="time-outline" size={15} color="#2563eb" />
                <Text style={styles.scheduleKey}>Time Slot</Text>
                <Text style={styles.scheduleVal}>{sub.delivery_slot || '–'}</Text>
              </View>
              <View style={styles.scheduleRow}>
                <Ionicons name="calendar-outline" size={15} color="#16a34a" />
                <Text style={styles.scheduleKey}>Start Date</Text>
                <Text style={styles.scheduleVal}>{sub.start_date}</Text>
              </View>
              <View style={styles.scheduleRow}>
                <Ionicons name="flag-outline" size={15} color="#ef4444" />
                <Text style={styles.scheduleKey}>End Date</Text>
                <Text style={styles.scheduleVal}>{sub.end_date || 'Ongoing'}</Text>
              </View>
              {daysLeft !== null && (
                <View style={styles.scheduleRow}>
                  <Ionicons name="timer-outline" size={15} color="#f59e0b" />
                  <Text style={styles.scheduleKey}>Days Left</Text>
                  <Text style={[styles.scheduleVal, daysLeft <= 3 && { color: '#ef4444' }]}>
                    {daysLeft} day{daysLeft !== 1 ? 's' : ''}
                  </Text>
                </View>
              )}
            </View>

            {/* Custom days pills */}
            {sub.custom_days && sub.custom_days.length > 0 && (
              <View style={styles.daysRow}>
                {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d, i) => (
                  <View key={i} style={[styles.dayPill, sub.custom_days!.includes(i) && styles.dayPillOn]}>
                    <Text style={[styles.dayPillText, sub.custom_days!.includes(i) && styles.dayPillTextOn]}>
                      {d}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Upcoming deliveries timeline */}
          {deliveryDates.length > 0 && (
            <View style={styles.modalSection}>
              <Text style={styles.sectionLabel}>UPCOMING DELIVERIES</Text>
              <View style={styles.timeline}>
                {deliveryDates.map((date, i) => {
                  const isToday     = date === todayStr();
                  const isPast      = date < todayStr();
                  const isDelivered = isDeliveredToday && isToday;
                  return (
                    <View key={i} style={styles.timelineRow}>
                      <View style={styles.timelineLeft}>
                        <View style={[
                          styles.timelineDot,
                          isDelivered && styles.timelineDotDone,
                          isToday && !isDelivered && styles.timelineDotToday,
                          isPast && styles.timelineDotPast,
                        ]} />
                        {i < deliveryDates.length - 1 && <View style={styles.timelineLine} />}
                      </View>
                      <View style={styles.timelineContent}>
                        <Text style={[
                          styles.timelineDate,
                          isToday && styles.timelineDateToday,
                          isPast && styles.timelineDatePast,
                        ]}>
                          {isToday ? 'Today' : new Date(date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </Text>
                        {isDelivered && <Text style={styles.timelineDelivered}>✓ Delivered</Text>}
                        {isToday && !isDelivered && <Text style={styles.timelineToday}>Pending delivery</Text>}
                      </View>
                      <Text style={styles.timelineAmt}>₹{Number(sub.total_amount).toFixed(0)}</Text>
                    </View>
                  );
                })}
                {sub.end_date && (
                  <Text style={styles.timelineMore}>
                    Subscription ends {sub.end_date}
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Today's delivery status box */}
          {isAccepted && deliversToday && (
            <View style={styles.modalSection}>
              <Text style={styles.sectionLabel}>TODAY'S ACTION</Text>
              {isDeliveredToday ? (
                <View style={styles.deliveredBox}>
                  <Ionicons name="checkmark-circle" size={28} color="#16a34a" />
                  <View>
                    <Text style={styles.deliveredBoxTitle}>Delivered ✓</Text>
                    <Text style={styles.deliveredBoxSub}>Great work! See you tomorrow.</Text>
                  </View>
                </View>
              ) : withinSlot ? (
                <View style={styles.activeSlotBox}>
                  <View style={styles.activeSlotDot} />
                  <View>
                    <Text style={styles.activeSlotTitle}>Within Delivery Window</Text>
                    <Text style={styles.activeSlotSub}>{sub.delivery_slot} — Deliver now</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.waitSlotBox}>
                  <Ionicons name="alarm-outline" size={22} color="#d97706" />
                  <View>
                    <Text style={styles.waitSlotTitle}>Delivery Window</Text>
                    <Text style={styles.waitSlotSub}>Start delivery between {sub.delivery_slot}</Text>
                  </View>
                </View>
              )}
            </View>
          )}

        </ScrollView>

        {/* Footer action */}
        <View style={styles.modalFooter}>
          {!isAccepted ? (
            <TouchableOpacity
              style={[styles.modalAcceptBtn, isShiftOff && styles.btnDisabled]}
              disabled={isShiftOff}
              onPress={onAccept}
            >
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
              <Text style={styles.modalAcceptBtnText}>
                {isShiftOff ? 'Start Shift First' : 'Accept This Subscription'}
              </Text>
            </TouchableOpacity>
          ) : isDeliveredToday ? (
            <View style={styles.modalDoneFooter}>
              <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
              <Text style={styles.modalDoneFooterText}>Delivered today — come back tomorrow</Text>
            </View>
          ) : deliversToday ? (
            <TouchableOpacity
              style={[styles.modalDeliverBtn, !withinSlot && styles.modalDeliverBtnEarly]}
              onPress={onMarkDelivered}
            >
              <Ionicons name="checkmark-done" size={18} color="#fff" />
              <Text style={styles.modalDeliverBtnText}>
                {withinSlot ? '✓ Mark as Delivered Today' : 'Mark Delivered (Outside Window)'}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.modalAcceptedFooter}>
              <Ionicons name="checkmark-circle" size={18} color="#2563eb" />
              <Text style={styles.modalAcceptedFooterText}>
                Accepted • Next delivery: {getNextDelivery(sub)}
              </Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// ── Empty / Error ──────────────────────────────────────────────────────────

function EmptyState({ filter }: { filter: FilterType }) {
  const msgs: Record<FilterType, string> = {
    today:    'No deliveries scheduled for today',
    upcoming: 'No upcoming scheduled deliveries',
    all:      'No subscriptions assigned yet.\nAsk your admin to assign customers to you.',
  };
  return (
    <View style={styles.empty}>
      <Ionicons name="repeat-outline" size={56} color="#ddd" />
      <Text style={styles.emptyTitle}>No Subscriptions</Text>
      <Text style={styles.emptyText}>{msgs[filter]}</Text>
    </View>
  );
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <View style={styles.empty}>
      <Ionicons name="cloud-offline-outline" size={56} color="#fca5a5" />
      <Text style={styles.emptyTitle}>Couldn't Load</Text>
      <Text style={styles.emptyText}>{error}</Text>
      <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
        <Ionicons name="refresh" size={14} color="#fff" />
        <Text style={styles.retryBtnText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const C = {
  primary: Colors.primary,
  green:   '#16a34a',
  blue:    '#2563eb',
  amber:   '#d97706',
  red:     '#ef4444',
  purple:  '#7c3aed',
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6FA' },

  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  backBtn:        { width: 36, height: 36, justifyContent: 'center' },
  headerTitle:    { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  headerSub:      { fontSize: 11, color: '#999', marginTop: 1 },
  headerBadge:    { backgroundColor: C.primary, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  headerBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  warningBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFFBEB', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#FEF08A' },
  warningText:   { fontSize: 12, color: '#92400e', fontWeight: '500' },

  tabRow:              { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  tab:                 { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive:           { borderBottomColor: C.primary },
  tabText:             { fontSize: 13, fontWeight: '600', color: '#999' },
  tabTextActive:       { color: '#1A1A1A' },
  tabBubble:           { backgroundColor: '#F0F0F0', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1 },
  tabBubbleActive:     { backgroundColor: C.primary + '22' },
  tabBubbleText:       { fontSize: 10, fontWeight: '700', color: '#999' },
  tabBubbleTextActive: { color: C.primary },

  list: { paddingTop: 14, paddingHorizontal: 14, paddingBottom: 20 },

  // Card
  card:      { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardToday: { borderWidth: 1.5, borderColor: '#bbf7d0' },
  cardDone:  { borderWidth: 1.5, borderColor: '#d1fae5' },

  badgeRow:       { flexDirection: 'row', gap: 6, marginBottom: 10 },
  todayBadge:     { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#22c55e', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  todayBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  doneBadge:      { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: C.green, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  doneBadgeText:  { fontSize: 10, fontWeight: '700', color: '#fff' },
  urgentBadge:    { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: C.red, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  urgentBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },

  cardHeader:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  productIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFF4E8', justifyContent: 'center', alignItems: 'center' },
  productName:    { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  customerName:   { fontSize: 11, color: '#999', marginTop: 2 },
  patternPill:    { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 8 },
  patternPillText: { fontSize: 10, fontWeight: '600' },

  itemsBox:      { backgroundColor: '#FAFAFA', borderRadius: 10, padding: 10, marginBottom: 10 },
  itemRow:       { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 3 },
  itemDot:       { width: 5, height: 5, borderRadius: 3, backgroundColor: C.primary },
  itemName:      { flex: 1, fontSize: 12, color: '#333', fontWeight: '500' },
  itemQty:       { fontSize: 12, color: '#888', fontWeight: '600' },
  itemAmt:       { fontSize: 13, color: '#1A1A1A', fontWeight: '700', minWidth: 40, textAlign: 'right' },
  itemTotalRow:  { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#EBEBEB' },
  itemTotalLabel: { fontSize: 11, color: '#888', fontWeight: '600' },
  itemTotal:     { fontSize: 13, color: C.primary, fontWeight: '800' },

  metaRow:        { flexDirection: 'row', gap: 8, marginBottom: 8 },
  metaChip:       { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#F4F6FA', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 },
  metaChipText:   { fontSize: 11, color: '#444', fontWeight: '500', flex: 1 },

  addressRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 5, backgroundColor: '#FAFAFA', borderRadius: 8, padding: 8, marginBottom: 10 },
  addressText: { fontSize: 11, color: '#666', lineHeight: 16, flex: 1 },

  // Slot banner (within-slot reminder)
  slotBanner:      { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFBEB', borderRadius: 10, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: '#FDE68A' },
  slotBannerTitle: { fontSize: 12, fontWeight: '700', color: '#92400e' },
  slotBannerText:  { fontSize: 11, color: '#b45309', marginTop: 1 },

  // Action row
  actionRow:     { flexDirection: 'row', gap: 8 },
  detailBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  detailBtnText: { fontSize: 12, fontWeight: '600', color: '#555' },

  acceptBtn:     { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: C.primary },
  acceptBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  deliverBtn:      { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: C.green },
  deliverBtnEarly: { backgroundColor: '#65a30d' },
  deliverBtnText:  { fontSize: 12, fontWeight: '700', color: '#fff' },

  doneBtn:     { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: '#DCFCE7' },
  doneBtnText: { fontSize: 12, fontWeight: '700', color: C.green },

  acceptedPill:     { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, borderRadius: 10, backgroundColor: '#EFF6FF' },
  acceptedPillText: { fontSize: 11, fontWeight: '600', color: C.blue },

  btnDisabled: { backgroundColor: '#F0F0F0' },

  // Empty / Error
  empty:        { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, paddingHorizontal: 30 },
  emptyTitle:   { fontSize: 17, fontWeight: '700', color: '#1A1A1A', marginTop: 14 },
  emptyText:    { fontSize: 13, color: '#999', marginTop: 6, textAlign: 'center', lineHeight: 20 },
  retryBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#1A1A1A', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, marginTop: 14 },
  retryBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },

  // Modal
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  modalTitle:     { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  closeBtn:       { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
  modalBody:      { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  modalSection:   { marginBottom: 20 },
  sectionLabel:   { fontSize: 10, fontWeight: '700', color: '#aaa', letterSpacing: 1, marginBottom: 10 },

  customerBox:    { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  customerAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center' },
  customerAvatarText: { fontSize: 18, fontWeight: '700', color: '#fff' },
  modalCustomerName:  { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  modalCustomerPhone: { fontSize: 12, color: '#888', marginTop: 2 },
  addressBox:         { flexDirection: 'row', gap: 6, backgroundColor: '#F8F9FA', borderRadius: 10, padding: 10 },
  modalAddressText:   { fontSize: 12, color: '#555', lineHeight: 17, flex: 1 },

  modalItemRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  modalItemIcon:  { width: 32, height: 32, borderRadius: 9, backgroundColor: '#FFF4E8', justifyContent: 'center', alignItems: 'center' },
  modalItemName:  { fontSize: 13, fontWeight: '600', color: '#1A1A1A' },
  modalItemMeta:  { fontSize: 11, color: '#888', marginTop: 2 },
  modalItemRight: { alignItems: 'flex-end' },
  modalItemQty:   { fontSize: 11, color: '#888' },
  modalItemAmt:   { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },
  modalTotalRow:  { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 10 },
  modalTotalLabel: { fontSize: 12, fontWeight: '600', color: '#888' },
  modalTotal:     { fontSize: 16, fontWeight: '800', color: C.primary },

  scheduleBox:  { backgroundColor: '#F8F9FA', borderRadius: 12, padding: 12 },
  scheduleRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#EFEFEF' },
  scheduleKey:  { flex: 1, fontSize: 12, color: '#888', fontWeight: '500' },
  scheduleVal:  { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },

  daysRow:          { flexDirection: 'row', gap: 6, marginTop: 12, flexWrap: 'wrap' },
  dayPill:          { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: '#F0F0F0' },
  dayPillOn:        { backgroundColor: C.primary },
  dayPillText:      { fontSize: 11, fontWeight: '700', color: '#999' },
  dayPillTextOn:    { color: '#fff' },

  // Timeline
  timeline:        { paddingLeft: 4 },
  timelineRow:     { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 0 },
  timelineLeft:    { alignItems: 'center', width: 20, marginRight: 12 },
  timelineDot:     { width: 12, height: 12, borderRadius: 6, backgroundColor: '#D1D5DB', marginTop: 3 },
  timelineDotToday: { backgroundColor: C.primary, width: 14, height: 14, borderRadius: 7 },
  timelineDotDone:  { backgroundColor: C.green },
  timelineDotPast:  { backgroundColor: '#E5E7EB' },
  timelineLine:    { width: 2, flex: 1, minHeight: 24, backgroundColor: '#E5E7EB', marginTop: 2 },
  timelineContent: { flex: 1, paddingBottom: 16 },
  timelineDate:    { fontSize: 13, fontWeight: '600', color: '#555' },
  timelineDateToday: { color: C.primary, fontWeight: '700' },
  timelineDatePast:  { color: '#aaa' },
  timelineDelivered: { fontSize: 11, color: C.green, marginTop: 2 },
  timelineToday:     { fontSize: 11, color: C.primary, marginTop: 2 },
  timelineAmt:       { fontSize: 12, fontWeight: '700', color: '#888' },
  timelineMore:      { fontSize: 11, color: '#aaa', marginTop: 4, paddingLeft: 32 },

  // Today action boxes
  deliveredBox:     { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#DCFCE7', borderRadius: 12, padding: 14 },
  deliveredBoxTitle: { fontSize: 14, fontWeight: '700', color: C.green },
  deliveredBoxSub:   { fontSize: 12, color: '#166534', marginTop: 2 },
  activeSlotBox:    { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#DCFCE7', borderRadius: 12, padding: 12 },
  activeSlotDot:    { width: 10, height: 10, borderRadius: 5, backgroundColor: C.green },
  activeSlotTitle:  { fontSize: 13, fontWeight: '700', color: C.green },
  activeSlotSub:    { fontSize: 11, color: '#166534', marginTop: 2 },
  waitSlotBox:      { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFBEB', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#FDE68A' },
  waitSlotTitle:    { fontSize: 13, fontWeight: '700', color: '#92400e' },
  waitSlotSub:      { fontSize: 11, color: '#b45309', marginTop: 2 },

  // Modal footer
  modalFooter:         { paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  modalAcceptBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.primary, paddingVertical: 14, borderRadius: 12 },
  modalAcceptBtnText:  { fontSize: 15, fontWeight: '700', color: '#fff' },
  modalDeliverBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.green, paddingVertical: 14, borderRadius: 12 },
  modalDeliverBtnEarly: { backgroundColor: '#65a30d' },
  modalDeliverBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  modalDoneFooter:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#DCFCE7', paddingVertical: 14, borderRadius: 12 },
  modalDoneFooterText: { fontSize: 14, fontWeight: '700', color: C.green },
  modalAcceptedFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#EFF6FF', paddingVertical: 14, borderRadius: 12 },
  modalAcceptedFooterText: { fontSize: 13, fontWeight: '700', color: C.blue },
});