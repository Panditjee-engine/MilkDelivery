import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { api } from '../../src/services/api';
import { Colors } from '../../src/constants/colors';
import LoadingScreen from '../../src/components/LoadingScreen';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);

  const fetchData = async () => {
    try {
      const [dashboardData, productsData] = await Promise.all([
        api.getAdminDashboard(),
        api.getProducts(),
      ]);
      setStats(dashboardData);
      setProducts(productsData);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
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

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  const deliveryRate = stats?.today_orders
    ? Math.round((stats.delivered_today / stats.today_orders) * 100)
    : 0;

  const pending = (stats?.today_orders || 0) - (stats?.delivered_today || 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Admin Dashboard</Text>
            <Text style={styles.userName}>{user?.name}</Text>
            <Text style={styles.date}>{today}</Text>
          </View>
          <View style={styles.adminBadge}>
            <Ionicons name="shield-checkmark" size={22} color="#fff" />
          </View>
        </View>

        {/* ── Revenue Hero Card ── */}
        <View style={styles.revenueCard}>
          <View style={styles.revenueLeft}>
            <Text style={styles.revenueLabel}>Today's Revenue</Text>
            <Text style={styles.revenueAmount}>₹{stats?.today_revenue || 0}</Text>
            <View style={styles.revenueBadge}>
              <Ionicons name="trending-up" size={12} color="#22c55e" />
              <Text style={styles.revenueBadgeText}>Live</Text>
            </View>
          </View>
          <View style={styles.revenueIcon}>
            <Ionicons name="cash" size={36} color="rgba(255,255,255,0.3)" />
          </View>
        </View>

        {/* ── Stats Grid ── */}
        <View style={styles.statsGrid}>

          {/* Customers */}
          <View style={[styles.statCard, { backgroundColor: '#EEF4FF' }]}>
            <View style={[styles.statIcon, { backgroundColor: '#4F7EFF20' }]}>
              <Ionicons name="people" size={20} color="#4F7EFF" />
            </View>
            <Text style={[styles.statValue, { color: '#4F7EFF' }]}>
              {stats?.total_customers || 0}
            </Text>
            <Text style={styles.statLabel}>Customers</Text>
          </View>

          {/* Total Products */}
          <View style={[styles.statCard, { backgroundColor: '#FFF4E6' }]}>
            <View style={[styles.statIcon, { backgroundColor: '#F59E0B20' }]}>
              <Ionicons name="cube" size={20} color="#f59e0b" />
            </View>
            <Text style={[styles.statValue, { color: '#f59e0b' }]}>
              {products.length}
            </Text>
            <Text style={styles.statLabel}>Products</Text>
          </View>

          {/* Total Orders */}
          <View style={[styles.statCard, { backgroundColor: '#F0F9FF' }]}>
            <View style={[styles.statIcon, { backgroundColor: '#0EA5E920' }]}>
              <Ionicons name="receipt" size={20} color="#0ea5e9" />
            </View>
            <Text style={[styles.statValue, { color: '#0ea5e9' }]}>
              {stats?.today_orders || 0}
            </Text>
            <Text style={styles.statLabel}>Total Orders</Text>
          </View>

          {/* Total Delivered */}
          <View style={[styles.statCard, { backgroundColor: '#F0FDF4' }]}>
            <View style={[styles.statIcon, { backgroundColor: '#22c55e20' }]}>
              <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
            </View>
            <Text style={[styles.statValue, { color: '#22c55e' }]}>
              {stats?.delivered_today || 0}
            </Text>
            <Text style={styles.statLabel}>Delivered</Text>
          </View>

        </View>

        {/* ── Today's Order Progress ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconBox, { backgroundColor: '#EEF4FF' }]}>
              <Ionicons name="stats-chart" size={16} color="#4F7EFF" />
            </View>
            <Text style={styles.cardTitle}>Delivery Progress</Text>
            <View style={styles.ratePill}>
              <Text style={styles.rateText}>{deliveryRate}%</Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${deliveryRate}%` }]} />
          </View>

          {/* 3 Stats */}
          <View style={styles.progressStats}>
            <View style={styles.progressStat}>
              <Text style={styles.progressStatVal}>{stats?.today_orders || 0}</Text>
              <Text style={styles.progressStatLabel}>Total</Text>
            </View>
            <View style={styles.progressDivider} />
            <View style={styles.progressStat}>
              <Text style={[styles.progressStatVal, { color: '#22c55e' }]}>
                {stats?.delivered_today || 0}
              </Text>
              <Text style={styles.progressStatLabel}>Delivered</Text>
            </View>
            <View style={styles.progressDivider} />
            <View style={styles.progressStat}>
              <Text style={[styles.progressStatVal, { color: '#f59e0b' }]}>
                {pending}
              </Text>
              <Text style={styles.progressStatLabel}>Pending</Text>
            </View>
          </View>
        </View>

        {/* ── Products Overview ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconBox, { backgroundColor: '#FFF4E6' }]}>
              <Ionicons name="cube-outline" size={16} color="#f59e0b" />
            </View>
            <Text style={styles.cardTitle}>Product Overview</Text>
          </View>

          {products.length > 0 ? (
            <>
              {products.slice(0, 4).map((p, i) => (
                <View
                  key={p.id}
                  style={[styles.productRow, i < Math.min(products.length, 4) - 1 && styles.productRowBorder]}
                >
                  <View style={styles.productDot} />
                  <Text style={styles.productName} numberOfLines={1}>{p.name}</Text>
                  <View style={[
                    styles.availPill,
                    { backgroundColor: p.is_available ? '#F0FDF4' : '#FEF2F2' }
                  ]}>
                    <Text style={[
                      styles.availText,
                      { color: p.is_available ? '#22c55e' : '#ef4444' }
                    ]}>
                      {p.is_available ? 'Active' : 'Off'}
                    </Text>
                  </View>
                  <Text style={styles.productPrice}>₹{p.price}</Text>
                </View>
              ))}
              {products.length > 4 && (
                <Text style={styles.moreText}>+{products.length - 4} more products</Text>
              )}
            </>
          ) : (
            <Text style={styles.emptyText}>No products added yet</Text>
          )}
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F7F4' },

  /* ── Header ── */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  greeting: { fontSize: 12, color: '#aaa', fontWeight: '500' },
  userName: { fontSize: 22, fontWeight: '800', color: '#1A1A1A', letterSpacing: -0.3 },
  date: { fontSize: 12, color: '#bbb', marginTop: 3 },
  adminBadge: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  /* ── Revenue Card ── */
  revenueCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: Colors.primary,
    borderRadius: 20,
    padding: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  revenueLeft: { gap: 4 },
  revenueLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  revenueAmount: { fontSize: 38, fontWeight: '800', color: '#fff', letterSpacing: -1 },
  revenueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(34,197,94,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  revenueBadgeText: { fontSize: 11, color: '#22c55e', fontWeight: '700' },
  revenueIcon: { opacity: 0.6 },

  /* ── Stats Grid ── */
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    width: '47.5%',
    borderRadius: 16,
    padding: 16,
    gap: 6,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  statValue: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  statLabel: { fontSize: 12, color: '#888', fontWeight: '600' },

  /* ── Cards ── */
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  cardIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', flex: 1 },
  ratePill: {
    backgroundColor: '#EEF4FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  rateText: { fontSize: 12, fontWeight: '800', color: '#4F7EFF' },

  /* Progress */
  progressBg: {
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFill: {
    height: 8,
    backgroundColor: '#22c55e',
    borderRadius: 4,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  progressStat: { alignItems: 'center', flex: 1 },
  progressStatVal: { fontSize: 26, fontWeight: '800', color: '#1A1A1A' },
  progressStatLabel: { fontSize: 11, color: '#aaa', marginTop: 3, fontWeight: '600' },
  progressDivider: { width: 1, backgroundColor: '#F0F0F0' },

  /* Products */
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    gap: 10,
  },
  productRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  productDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#f59e0b',
  },
  productName: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  availPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  availText: { fontSize: 11, fontWeight: '700' },
  productPrice: { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },
  moreText: { fontSize: 12, color: '#bbb', textAlign: 'center', marginTop: 10, fontWeight: '500' },
  emptyText: { fontSize: 13, color: '#ccc', fontStyle: 'italic' },
});