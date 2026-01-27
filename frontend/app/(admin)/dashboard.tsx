import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { api } from '../../src/services/api';
import { Colors } from '../../src/constants/colors';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import LoadingScreen from '../../src/components/LoadingScreen';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [procurement, setProcurement] = useState<any>(null);
  const [generating, setGenerating] = useState(false);

  const fetchData = async () => {
    try {
      const [dashboardData, procurementData] = await Promise.all([
        api.getAdminDashboard(),
        api.getProcurement(),
      ]);
      setStats(dashboardData);
      setProcurement(procurementData);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
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

  const handleGenerateOrders = async () => {
    Alert.alert(
      'Generate Orders',
      'This will create orders for tomorrow based on active subscriptions. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate',
          onPress: async () => {
            setGenerating(true);
            try {
              const result = await api.generateOrders();
              Alert.alert(
                'Success',
                `Orders generated!\nCreated: ${result.orders_created}\nSkipped: ${result.orders_skipped}`
              );
              fetchData();
            } catch (error: any) {
              Alert.alert('Error', error.message);
            } finally {
              setGenerating(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return <LoadingScreen />;
  }

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Admin Dashboard</Text>
            <Text style={styles.userName}>{user?.name}</Text>
          </View>
          <View style={styles.adminBadge}>
            <Ionicons name="shield-checkmark" size={20} color={Colors.primary} />
          </View>
        </View>

        <Text style={styles.date}>{today}</Text>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <Card variant="elevated" style={{ ...styles.statCard, backgroundColor: Colors.primary }}>
            <Ionicons name="people" size={28} color={Colors.textInverse} />
            <Text style={styles.statValue}>{stats?.total_customers || 0}</Text>
            <Text style={styles.statLabel}>Customers</Text>
          </Card>
          <Card variant="elevated" style={{ ...styles.statCard, backgroundColor: Colors.secondary }}>
            <Ionicons name="bicycle" size={28} color={Colors.textInverse} />
            <Text style={styles.statValue}>{stats?.total_delivery_partners || 0}</Text>
            <Text style={styles.statLabel}>Partners</Text>
          </Card>
          <Card variant="elevated" style={{ ...styles.statCard, backgroundColor: Colors.accent }}>
            <Ionicons name="repeat" size={28} color={Colors.textInverse} />
            <Text style={styles.statValue}>{stats?.active_subscriptions || 0}</Text>
            <Text style={styles.statLabel}>Active Subs</Text>
          </Card>
          <Card variant="elevated" style={{ ...styles.statCard, backgroundColor: Colors.info }}>
            <Ionicons name="cash" size={28} color={Colors.textInverse} />
            <Text style={styles.statValue}>₹{stats?.today_revenue || 0}</Text>
            <Text style={styles.statLabel}>Revenue Today</Text>
          </Card>
        </View>

        {/* Today's Orders */}
        <Card variant="outlined" style={styles.ordersCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="cube" size={24} color={Colors.primary} />
            <Text style={styles.cardTitle}>Today's Orders</Text>
          </View>
          <View style={styles.ordersStats}>
            <View style={styles.orderStat}>
              <Text style={styles.orderStatValue}>{stats?.today_orders || 0}</Text>
              <Text style={styles.orderStatLabel}>Total</Text>
            </View>
            <View style={styles.orderStatDivider} />
            <View style={styles.orderStat}>
              <Text style={[styles.orderStatValue, { color: Colors.success }]}>
                {stats?.delivered_today || 0}
              </Text>
              <Text style={styles.orderStatLabel}>Delivered</Text>
            </View>
            <View style={styles.orderStatDivider} />
            <View style={styles.orderStat}>
              <Text style={[styles.orderStatValue, { color: Colors.warning }]}>
                {(stats?.today_orders || 0) - (stats?.delivered_today || 0)}
              </Text>
              <Text style={styles.orderStatLabel}>Pending</Text>
            </View>
          </View>
        </Card>

        {/* Midnight Run */}
        <Card variant="outlined" style={styles.midnightCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="moon" size={24} color={Colors.primary} />
            <Text style={styles.cardTitle}>Midnight Run</Text>
          </View>
          <Text style={styles.midnightDesc}>
            Generate orders for tomorrow based on active subscriptions and wallet balances.
          </Text>
          <Button
            title="Generate Tomorrow's Orders"
            onPress={handleGenerateOrders}
            loading={generating}
            style={styles.generateButton}
          />
        </Card>

        {/* Procurement Preview */}
        <Card variant="outlined" style={styles.procurementCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="clipboard" size={24} color={Colors.accent} />
            <Text style={styles.cardTitle}>Tomorrow's Procurement</Text>
          </View>
          {procurement?.items?.length > 0 ? (
            <>
              <Text style={styles.procurementDate}>For: {procurement.date}</Text>
              {procurement.items.slice(0, 5).map((item: any) => (
                <View key={item.product_id} style={styles.procurementItem}>
                  <Text style={styles.procurementName}>{item.product_name}</Text>
                  <Text style={styles.procurementQty}>
                    {item.total_quantity} {item.unit}
                  </Text>
                </View>
              ))}
              {procurement.items.length > 5 && (
                <Text style={styles.moreItems}>+{procurement.items.length - 5} more items</Text>
              )}
            </>
          ) : (
            <Text style={styles.noProcurement}>No procurement needed for tomorrow</Text>
          )}
        </Card>
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
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 16,
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
  adminBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryLight + '30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  date: {
    fontSize: 12,
    color: Colors.textSecondary,
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: 20,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textInverse,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textInverse,
    opacity: 0.9,
    marginTop: 4,
  },
  ordersCard: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  ordersStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  orderStat: {
    alignItems: 'center',
    flex: 1,
  },
  orderStatValue: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.text,
  },
  orderStatLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  orderStatDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  midnightCard: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  midnightDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  generateButton: {},
  procurementCard: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  procurementDate: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  procurementItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  procurementName: {
    fontSize: 14,
    color: Colors.text,
  },
  procurementQty: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  moreItems: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  noProcurement: {
    fontSize: 14,
    color: Colors.textLight,
    fontStyle: 'italic',
  },
});
