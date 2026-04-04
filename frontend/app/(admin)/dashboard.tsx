import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, Modal, FlatList, Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { api } from '../../src/services/api';
import LoadingScreen from '../../src/components/LoadingScreen';

// ── Warm Color Palette ──────────────────────────
const C = {
  primary:   '#FF9675',
  secondary: '#FF9675',
  accent:    '#FD9E69',
  light:     '#FFD999',
  dark:      '#BB6B3F',
  deep:      '#8B6854',
  bg:        '#FFF8EF',
  card:      '#FFFFFF',
  text:      '#3D1F0A',
  textMuted: '#A07850',
  textLight: '#C9A882',
};

// ── Modal Types ─────────────────────────────────
type ModalType =
  | 'customers' | 'products' | 'orders'
  | 'delivered' | 'total' | 'pending' | null;

// ── Detail Modal Component ───────────────────────
function DetailModal({
  visible,
  type,
  products,
  stats,
  onClose,
}: {
  visible: boolean;
  type: ModalType;
  products: any[];
  stats: any;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();

  const config: Record<
    Exclude<ModalType, null>,
    { title: string; icon: string; color: string; bgColor: string }
  > = {
    customers: { title: 'All Customers',    icon: 'people',           color: C.dark,   bgColor: '#FFF3DC' },
    products:  { title: 'All Products',     icon: 'cube',             color: C.dark,   bgColor: '#FFEEDD' },
    orders:    { title: 'Today\'s Orders',  icon: 'receipt',          color: C.dark,   bgColor: '#FFE8D6' },
    delivered: { title: 'Delivered Orders', icon: 'checkmark-circle', color: C.deep,   bgColor: '#FFD9B8' },
    total:     { title: 'All Orders Today', icon: 'list',             color: C.dark,   bgColor: '#FFE8D6' },
    pending:   { title: 'Pending Orders',   icon: 'time',             color: C.secondary, bgColor: '#FFF0E0' },
  };

  if (!type) return null;
  const cfg = config[type];

  // ── Build list data based on type ──────────────
  const renderItem = ({ item, index }: { item: any; index: number }) => {
    if (type === 'products') {
      return (
        <View style={[mStyles.listRow, index % 2 === 0 && mStyles.listRowAlt]}>
          <View style={[mStyles.listDot, { backgroundColor: item.is_available ? C.accent : C.textLight }]} />
          <View style={mStyles.listInfo}>
            <Text style={mStyles.listTitle} numberOfLines={1}>{item.name}</Text>
            <Text style={mStyles.listSub}>₹{item.price}</Text>
          </View>
          <View style={[mStyles.pill, { backgroundColor: item.is_available ? '#FFF3DC' : '#FFE8D6' }]}>
            <Text style={[mStyles.pillText, { color: item.is_available ? C.dark : C.secondary }]}>
              {item.is_available ? 'Active' : 'Off'}
            </Text>
          </View>
        </View>
      );
    }

    if (type === 'customers') {
      return (
        <View style={[mStyles.listRow, index % 2 === 0 && mStyles.listRowAlt]}>
          <View style={mStyles.avatarCircle}>
            <Text style={mStyles.avatarText}>
              {(item.name || item.phone || '#')[0].toUpperCase()}
            </Text>
          </View>
          <View style={mStyles.listInfo}>
            <Text style={mStyles.listTitle} numberOfLines={1}>{item.name || 'Customer'}</Text>
            <Text style={mStyles.listSub}>{item.phone || item.email || '—'}</Text>
          </View>
        </View>
      );
    }

    // orders / delivered / pending / total
    const statusColor =
      item.status === 'delivered' ? C.dark :
      item.status === 'pending'   ? C.secondary : C.accent;

    return (
      <View style={[mStyles.listRow, index % 2 === 0 && mStyles.listRowAlt]}>
        <View style={[mStyles.orderNumBox, { backgroundColor: cfg.bgColor }]}>
          <Text style={[mStyles.orderNum, { color: cfg.color }]}>#{item.id}</Text>
        </View>
        <View style={mStyles.listInfo}>
          <Text style={mStyles.listTitle} numberOfLines={1}>
            {item.customer_name || item.customer || 'Order'}
          </Text>
          <Text style={mStyles.listSub}>₹{item.total || item.amount || 0}</Text>
        </View>
        <View style={[mStyles.pill, { backgroundColor: statusColor + '22' }]}>
          <Text style={[mStyles.pillText, { color: statusColor }]}>
            {item.status || 'N/A'}
          </Text>
        </View>
      </View>
    );
  };

  // ── Determine list source ──────────────────────
  const getListData = () => {
    if (type === 'products') return products;
    if (type === 'customers') return stats?.customers_list || [];
    if (type === 'delivered') return (stats?.orders_list || []).filter((o: any) => o.status === 'delivered');
    if (type === 'pending')   return (stats?.orders_list || []).filter((o: any) => o.status !== 'delivered');
    return stats?.orders_list || [];
  };

  const listData = getListData();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Pressable style={mStyles.backdrop} onPress={onClose} />

      {/* Sheet */}
      <View style={[mStyles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        {/* Drag handle */}
        <View style={mStyles.handle} />

        {/* Modal header */}
        <View style={mStyles.sheetHeader}>
          <View style={[mStyles.sheetIconBox, { backgroundColor: cfg.bgColor }]}>
            <Ionicons name={cfg.icon as any} size={18} color={cfg.color} />
          </View>
          <Text style={mStyles.sheetTitle}>{cfg.title}</Text>
          <View style={mStyles.countPill}>
            <Text style={mStyles.countText}>{listData.length}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={mStyles.closeBtn} hitSlop={10}>
            <Ionicons name="close" size={20} color={C.textMuted} />
          </TouchableOpacity>
        </View>

        {listData.length === 0 ? (
          <View style={mStyles.emptyBox}>
            <Ionicons name="file-tray-outline" size={40} color={C.textLight} />
            <Text style={mStyles.emptyTxt}>No data available</Text>
          </View>
        ) : (
          <FlatList
            data={listData}
            keyExtractor={(item, i) => String(item.id ?? i)}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 4 }}
          />
        )}
      </View>
    </Modal>
  );
}

// ── Main Dashboard ───────────────────────────────
export default function AdminDashboard() {
  const { user } = useAuth();
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats]         = useState<any>(null);
  const [products, setProducts]   = useState<any[]>([]);
  const [modalType, setModalType] = useState<ModalType>(null);

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
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.primary}
            colors={[C.primary, C.accent]}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Admin Dashboard</Text>
            <Text style={styles.userName}>{user?.name}</Text>
            <Text style={styles.date}>{today}</Text>
          </View>
          <View style={styles.adminBadge}>
            <Ionicons name="shield-checkmark" size={22} color={C.deep} />
          </View>
        </View>

        {/* ── Revenue Card ── */}
        <View style={styles.revenueCard}>
          <View style={styles.revenueLeft}>
            <Text style={styles.revenueLabel}>Today's Revenue</Text>
            <Text style={styles.revenueAmount}>₹{stats?.today_revenue || 0}</Text>
            <View style={styles.revenueBadge}>
              <Ionicons name="trending-up" size={12} color={C.deep} />
              <Text style={styles.revenueBadgeText}>Live</Text>
            </View>
          </View>
          <View style={styles.revenueIcon}>
            <Ionicons name="cash" size={42} color={C.deep} />
          </View>
        </View>

        {/* ── Stats Grid ── */}
        <View style={styles.statsGrid}>

          {/* Customers */}
          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: '#FFF3DC' }]}
            onPress={() => setModalType('customers')}
            activeOpacity={0.75}
          >
            <View style={[styles.statIcon, { backgroundColor: C.primary + '30' }]}>
              <Ionicons name="people" size={20} color={C.dark} />
            </View>
            <Text style={[styles.statValue, { color: C.dark }]}>
              {stats?.total_customers || 0}
            </Text>
            <Text style={styles.statLabel}>Customers</Text>
            <View style={styles.tapHint}>
              <Ionicons name="chevron-forward" size={11} color={C.textLight} />
            </View>
          </TouchableOpacity>

          {/* Products */}
          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: '#FFEEDD' }]}
            onPress={() => setModalType('products')}
            activeOpacity={0.75}
          >
            <View style={[styles.statIcon, { backgroundColor: C.accent + '30' }]}>
              <Ionicons name="cube" size={20} color={C.dark} />
            </View>
            <Text style={[styles.statValue, { color: C.dark }]}>
              {products.length}
            </Text>
            <Text style={styles.statLabel}>Products</Text>
            <View style={styles.tapHint}>
              <Ionicons name="chevron-forward" size={11} color={C.textLight} />
            </View>
          </TouchableOpacity>

          {/* Total Orders */}
          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: '#FFE8D6' }]}
            onPress={() => setModalType('orders')}
            activeOpacity={0.75}
          >
            <View style={[styles.statIcon, { backgroundColor: C.secondary + '30' }]}>
              <Ionicons name="receipt" size={20} color={C.dark} />
            </View>
            <Text style={[styles.statValue, { color: C.dark }]}>
              {stats?.today_orders || 0}
            </Text>
            <Text style={styles.statLabel}>Total Orders</Text>
            <View style={styles.tapHint}>
              <Ionicons name="chevron-forward" size={11} color={C.textLight} />
            </View>
          </TouchableOpacity>

          {/* Delivered */}
          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: '#FFD9B8' }]}
            onPress={() => setModalType('delivered')}
            activeOpacity={0.75}
          >
            <View style={[styles.statIcon, { backgroundColor: C.dark + '20' }]}>
              <Ionicons name="checkmark-circle" size={20} color={C.deep} />
            </View>
            <Text style={[styles.statValue, { color: C.deep }]}>
              {stats?.delivered_today || 0}
            </Text>
            <Text style={styles.statLabel}>Delivered</Text>
            <View style={styles.tapHint}>
              <Ionicons name="chevron-forward" size={11} color={C.textLight} />
            </View>
          </TouchableOpacity>

        </View>

        {/* ── Delivery Progress ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconBox, { backgroundColor: '#FFF3DC' }]}>
              <Ionicons name="stats-chart" size={16} color={C.dark} />
            </View>
            <Text style={styles.cardTitle}>Delivery Progress</Text>
            <View style={styles.ratePill}>
              <Text style={styles.rateText}>{deliveryRate}%</Text>
            </View>
          </View>

          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${deliveryRate}%` }]} />
          </View>

          <View style={styles.progressStats}>

            {/* Total — clickable */}
            <TouchableOpacity
              style={styles.progressStat}
              onPress={() => setModalType('total')}
              activeOpacity={0.7}
            >
              <Text style={styles.progressStatVal}>{stats?.today_orders || 0}</Text>
              <Text style={styles.progressStatLabel}>Total</Text>
              <Ionicons name="chevron-down" size={10} color={C.textLight} style={{ marginTop: 2 }} />
            </TouchableOpacity>

            <View style={styles.progressDivider} />

            {/* Delivered — clickable */}
            <TouchableOpacity
              style={styles.progressStat}
              onPress={() => setModalType('delivered')}
              activeOpacity={0.7}
            >
              <Text style={[styles.progressStatVal, { color: C.dark }]}>
                {stats?.delivered_today || 0}
              </Text>
              <Text style={styles.progressStatLabel}>Delivered</Text>
              <Ionicons name="chevron-down" size={10} color={C.textLight} style={{ marginTop: 2 }} />
            </TouchableOpacity>

            <View style={styles.progressDivider} />

            {/* Pending — clickable */}
            <TouchableOpacity
              style={styles.progressStat}
              onPress={() => setModalType('pending')}
              activeOpacity={0.7}
            >
              <Text style={[styles.progressStatVal, { color: C.secondary }]}>
                {pending}
              </Text>
              <Text style={styles.progressStatLabel}>Pending</Text>
              <Ionicons name="chevron-down" size={10} color={C.textLight} style={{ marginTop: 2 }} />
            </TouchableOpacity>

          </View>
        </View>

        {/* ── Product Overview ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconBox, { backgroundColor: '#FFEEDD' }]}>
              <Ionicons name="cube-outline" size={16} color={C.dark} />
            </View>
            <Text style={styles.cardTitle}>Product Overview</Text>
            {products.length > 0 && (
              <TouchableOpacity
                onPress={() => setModalType('products')}
                hitSlop={10}
              >
                <Ionicons name="arrow-forward-circle-outline" size={22} color={C.accent} />
              </TouchableOpacity>
            )}
          </View>

          {products.length > 0 ? (
            <>
              {products.slice(0, 4).map((p, i) => (
                <View
                  key={p.id}
                  style={[
                    styles.productRow,
                    i < Math.min(products.length, 4) - 1 && styles.productRowBorder,
                  ]}
                >
                  <View style={styles.productDot} />
                  <Text style={styles.productName} numberOfLines={1}>{p.name}</Text>
                  <View style={[
                    styles.availPill,
                    { backgroundColor: p.is_available ? '#FFF3DC' : '#FFE8D6' },
                  ]}>
                    <Text style={[
                      styles.availText,
                      { color: p.is_available ? C.dark : C.secondary },
                    ]}>
                      {p.is_available ? 'Active' : 'Off'}
                    </Text>
                  </View>
                  <Text style={styles.productPrice}>₹{p.price}</Text>
                </View>
              ))}

              {/* +X more — now clickable */}
              {products.length > 4 && (
                <TouchableOpacity
                  onPress={() => setModalType('products')}
                  style={styles.moreBtn}
                  activeOpacity={0.7}
                >
                  <Text style={styles.moreText}>+{products.length - 4} more products</Text>
                  <Ionicons name="chevron-forward" size={13} color={C.accent} />
                </TouchableOpacity>
              )}
            </>
          ) : (
            <Text style={styles.emptyText}>No products added yet</Text>
          )}
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* ── Detail Modal ── */}
      <DetailModal
        visible={modalType !== null}
        type={modalType}
        products={products}
        stats={stats}
        onClose={() => setModalType(null)}
      />
    </SafeAreaView>
  );
}

// ── Modal Styles ─────────────────────────────────
const mStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(61,31,10,0.35)',
  },
  sheet: {
    backgroundColor: C.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '75%',
    paddingHorizontal: 20,
    paddingTop: 12,
    shadowColor: C.dark,
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -6 },
    elevation: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E0C8B0',
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  sheetIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: C.text,
    flex: 1,
  },
  countPill: {
    backgroundColor: C.light,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.dark,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFF3DC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 10,
    borderRadius: 12,
    paddingHorizontal: 6,
  },
  listRowAlt: {
    backgroundColor: '#FFF8EF',
  },
  listDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: C.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: C.dark,
  },
  orderNumBox: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  orderNum: {
    fontSize: 12,
    fontWeight: '700',
  },
  listInfo: {
    flex: 1,
  },
  listTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: C.text,
  },
  listSub: {
    fontSize: 12,
    color: C.textLight,
    marginTop: 2,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  emptyTxt: {
    fontSize: 14,
    color: C.textLight,
    fontStyle: 'italic',
  },
});

// ── Dashboard Styles ─────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scrollContent: { paddingBottom: 8 },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  greeting: { fontSize: 12, color: C.textLight, fontWeight: '500' },
  userName: { fontSize: 22, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
  date: { fontSize: 12, color: C.textLight, marginTop: 3 },
  adminBadge: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: C.light,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: C.primary, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },

  // Revenue Card
  revenueCard: {
    marginHorizontal: 20, marginBottom: 16,
    backgroundColor: C.primary, borderRadius: 20, padding: 22,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    shadowColor: C.dark, shadowOpacity: 0.25, shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  revenueLeft: { gap: 4 },
  revenueLabel: { fontSize: 13, color: C.deep, fontWeight: '600' },
  revenueAmount: { fontSize: 38, fontWeight: '800', color: C.text, letterSpacing: -1 },
  revenueBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.light, paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 20, alignSelf: 'flex-start',
  },
  revenueBadgeText: { fontSize: 11, color: C.deep, fontWeight: '700' },
  revenueIcon: { opacity: 0.5 },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 16, gap: 10, marginBottom: 16,
  },
  statCard: {
    width: '47.5%', borderRadius: 16, padding: 16, gap: 6,
    position: 'relative',
  },
  statIcon: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', marginBottom: 4,
  },
  statValue: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  statLabel: { fontSize: 12, color: C.textMuted, fontWeight: '600' },
  tapHint: {
    position: 'absolute', bottom: 10, right: 10,
  },

  // Cards
  card: {
    backgroundColor: C.card, borderRadius: 20,
    marginHorizontal: 16, marginBottom: 14, padding: 18,
    shadowColor: C.dark, shadowOpacity: 0.06, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16,
  },
  cardIconBox: {
    width: 32, height: 32, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: C.text, flex: 1 },
  ratePill: {
    backgroundColor: '#f8c18e', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  rateText: { fontSize: 12, fontWeight: '800', color: C.dark },

  // Progress
  progressBg: {
    height: 8, backgroundColor: '#FFE8C8', borderRadius: 4,
    overflow: 'hidden', marginBottom: 16,
  },
  progressFill: { height: 8, backgroundColor: C.primary, borderRadius: 4 },
  progressStats: { flexDirection: 'row', justifyContent: 'space-around' },
  progressStat: { alignItems: 'center', flex: 1, paddingVertical: 4 },
  progressStatVal: { fontSize: 26, fontWeight: '800', color: C.text },
  progressStatLabel: { fontSize: 11, color: C.textLight, marginTop: 3, fontWeight: '600' },
  progressDivider: { width: 1, backgroundColor: '#FFE8C8' },

  // Products
  productRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 11, gap: 10,
  },
  productRowBorder: { borderBottomWidth: 1, borderBottomColor: '#FFF3DC' },
  productDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.accent },
  productName: { flex: 1, fontSize: 14, fontWeight: '600', color: C.text },
  availPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  availText: { fontSize: 11, fontWeight: '700' },
  productPrice: { fontSize: 13, fontWeight: '700', color: C.text },

  // More button
  moreBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginTop: 10, gap: 4,
  },
  moreText: { fontSize: 12, color: C.accent, fontWeight: '700' },
  emptyText: { fontSize: 13, color: C.textLight, fontStyle: 'italic' },
});