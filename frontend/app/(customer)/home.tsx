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
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [tomorrowPreview, setTomorrowPreview] = useState<any>(null);

  const fetchData = async () => {
    try {
      const [walletData, subsData, preview] = await Promise.all([
        api.getWallet(),
        api.getSubscriptions(),
        api.getTomorrowPreview(),
      ]);
      setWalletBalance(walletData.balance);
      setSubscriptions(subsData);
      setTomorrowPreview(preview);
    } catch (error) {
      console.error('Error fetching data:', error);
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

  if (loading) {
    return <LoadingScreen />;
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good Morning,</Text>
            <Text style={styles.userName}>{user?.name || 'User'}</Text>
          </View>
          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons name="notifications-outline" size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>

        {/* Wallet Card */}
        <Card variant="elevated" style={styles.walletCard} onPress={() => router.push('/(customer)/wallet')}>
          <View style={styles.walletHeader}>
            <View style={styles.walletIconContainer}>
              <Ionicons name="wallet" size={24} color={Colors.primary} />
            </View>
            <Text style={styles.walletLabel}>Wallet Balance</Text>
          </View>
          <Text style={styles.walletBalance}>₹{walletBalance.toFixed(2)}</Text>
          {walletBalance < 100 && (
            <View style={styles.lowBalanceAlert}>
              <Ionicons name="warning" size={16} color={Colors.warning} />
              <Text style={styles.lowBalanceText}>Low balance! Recharge now</Text>
            </View>
          )}
        </Card>

        {/* Tomorrow's Order Preview */}
        <Card variant="outlined" style={styles.previewCard}>
          <View style={styles.previewHeader}>
            <Ionicons name="time" size={20} color={Colors.primary} />
            <Text style={styles.previewTitle}>Tomorrow's Order</Text>
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
              <View style={styles.previewTotal}>
                <Text style={styles.previewTotalLabel}>Total</Text>
                <Text style={styles.previewTotalAmount}>₹{tomorrowPreview.total}</Text>
              </View>
              {!tomorrowPreview.sufficient_balance && (
                <View style={styles.insufficientAlert}>
                  <Ionicons name="alert-circle" size={16} color={Colors.error} />
                  <Text style={styles.insufficientText}>Insufficient balance for tomorrow's order</Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.noOrder}>
              <Ionicons name="calendar-outline" size={40} color={Colors.textLight} />
              <Text style={styles.noOrderText}>
                {tomorrowPreview?.message || 'No deliveries scheduled'}
              </Text>
            </View>
          )}
        </Card>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickAction} onPress={() => router.push('/(customer)/catalog')}>
            <View style={[styles.quickActionIcon, { backgroundColor: Colors.milk }]}>
              <Ionicons name="add-circle" size={28} color={Colors.primary} />
            </View>
            <Text style={styles.quickActionText}>Add Items</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction} onPress={() => router.push('/(customer)/subscriptions')}>
            <View style={[styles.quickActionIcon, { backgroundColor: Colors.dairy }]}>
              <Ionicons name="calendar" size={28} color={Colors.accent} />
            </View>
            <Text style={styles.quickActionText}>Manage Subscriptions</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction} onPress={() => router.push('/(customer)/profile')}>
            <View style={[styles.quickActionIcon, { backgroundColor: Colors.fruits }]}>
              <Ionicons name="airplane" size={28} color={Colors.secondary} />
            </View>
            <Text style={styles.quickActionText}>Vacation Mode</Text>
          </TouchableOpacity>
        </View>

        {/* Active Subscriptions */}
        <View style={styles.subscriptionsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Subscriptions</Text>
            <TouchableOpacity onPress={() => router.push('/(customer)/subscriptions')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          {subscriptions.length > 0 ? (
            subscriptions.slice(0, 3).map((sub) => (
              <Card key={sub.id} variant="outlined" style={styles.subscriptionCard}>
                <View style={styles.subscriptionInfo}>
                  <Text style={styles.subscriptionName}>{sub.product?.name || 'Product'}</Text>
                  <Text style={styles.subscriptionDetails}>
                    {sub.quantity}x • {sub.pattern.replace('_', ' ')}
                  </Text>
                </View>
                <Text style={styles.subscriptionPrice}>₹{sub.product?.price || 0}</Text>
              </Card>
            ))
          ) : (
            <Card variant="outlined" style={styles.emptyCard}>
              <Ionicons name="basket-outline" size={40} color={Colors.textLight} />
              <Text style={styles.emptyText}>No active subscriptions</Text>
              <TouchableOpacity onPress={() => router.push('/(customer)/catalog')}>
                <Text style={styles.addFirstText}>Add your first subscription</Text>
              </TouchableOpacity>
            </Card>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  greeting: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  walletCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: Colors.primary,
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  walletIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  walletLabel: {
    fontSize: 14,
    color: Colors.textInverse,
    opacity: 0.9,
  },
  walletBalance: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.textInverse,
  },
  lowBalanceAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  lowBalanceText: {
    fontSize: 12,
    color: Colors.textInverse,
  },
  previewCard: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  previewDate: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  previewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  previewItemName: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
  },
  previewItemQty: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginRight: 16,
  },
  previewItemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  previewTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
  },
  previewTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  previewTotalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  insufficientAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: Colors.error + '15',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  insufficientText: {
    fontSize: 12,
    color: Colors.error,
  },
  noOrder: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noOrderText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 60,
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  subscriptionsSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 20,
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  subscriptionCard: {
    marginHorizontal: 20,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subscriptionInfo: {
    flex: 1,
  },
  subscriptionName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  subscriptionDetails: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
    textTransform: 'capitalize',
  },
  subscriptionPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  emptyCard: {
    marginHorizontal: 20,
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  addFirstText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: 8,
  },
});
