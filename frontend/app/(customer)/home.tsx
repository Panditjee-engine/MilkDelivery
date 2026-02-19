import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { api } from '../../src/services/api';
import { Colors } from '../../src/constants/colors';
import Card from '../../src/components/Card';
import LoadingScreen from '../../src/components/LoadingScreen';

export default function CustomerHome() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [tomorrowPreview, setTomorrowPreview] = useState<any>(null);

  const fetchData = async () => {
    try {
      const [walletData, preview] = await Promise.all([
        api.getWallet(),
        api.getTomorrowPreview(),
      ]);
      setWalletBalance(walletData.balance);
      setTomorrowPreview(preview);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

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

        {/* ── GauSatva Branding ── */}
        <View style={styles.brandingSection}>
          <View style={styles.brandingDivider} />
          <View style={styles.brandingContent}>
            <Ionicons name="leaf" size={16} color={Colors.primary} />
            <Text style={styles.brandName}>GauSatva</Text>
          </View>
          <Text style={styles.brandTagline}>Pure. Fresh. Delivered daily.</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F7F4',
  },
  scrollView: {
    flex: 1,
  },

  /* ── Header ── */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  greeting: {
    fontSize: 13,
    color: '#999',
    fontWeight: '500',
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: -0.3,
  },
  notificationButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },

  /* ── Wallet Card ── */
  walletCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: Colors.primary,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: Colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  walletLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  walletIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  walletLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  walletBalance: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  walletRight: {
    alignItems: 'flex-end',
  },
  lowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245,158,11,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  lowBadgeText: {
    fontSize: 11,
    color: '#f59e0b',
    fontWeight: '700',
  },
  okBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34,197,94,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  okBadgeText: {
    fontSize: 11,
    color: '#22c55e',
    fontWeight: '700',
  },

  /* ── Tomorrow Preview ── */
  previewCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  previewTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  previewTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  previewDate: {
    fontSize: 12,
    color: '#aaa',
    fontWeight: '500',
  },
  previewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  previewItemName: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  previewItemQty: {
    fontSize: 13,
    color: '#aaa',
    marginRight: 14,
  },
  previewItemPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  previewTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
  },
  previewTotalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
  },
  previewTotalAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary,
  },
  insufficientAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  insufficientText: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '500',
  },
  noOrder: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  noOrderText: {
    fontSize: 14,
    color: '#bbb',
    fontWeight: '500',
  },

  /* ── Quick Actions ── */
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A1A',
    paddingHorizontal: 20,
    marginBottom: 14,
    letterSpacing: -0.2,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 32,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  quickActionIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    fontWeight: '600',
  },

  /* ── GauSatva Branding ── */
  brandingSection: {
    alignItems: 'center',
    paddingBottom: 36,
    paddingTop: 8,
  },
  brandingDivider: {
    width: 40,
    height: 2,
    backgroundColor: '#E8E8E8',
    borderRadius: 1,
    marginBottom: 16,
  },
  brandingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  brandName: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  brandTagline: {
    fontSize: 12,
    color: '#bbb',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
});