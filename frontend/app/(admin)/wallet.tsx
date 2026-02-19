import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  RefreshControl, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/services/api';
import { Colors } from '../../src/constants/colors';
import LoadingScreen from '../../src/components/LoadingScreen';

export default function AdminWalletScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'credit' | 'debit'>('ALL');

  const fetchData = async () => {
    try {
      const [walletData, txData] = await Promise.all([
        api.getWallet(),
        api.getWalletTransactions(),
      ]);
      setBalance(walletData.balance ?? 0);
      setTransactions(txData ?? []);
    } catch (error) {
      console.error('Error fetching wallet:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const onRefresh = useCallback(() => { setRefreshing(true); fetchData(); }, []);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  if (loading) return <LoadingScreen />;

  const credits = transactions.filter(t => t.type === 'credit');
  const debits  = transactions.filter(t => t.type === 'debit');

  const totalEarned   = credits.reduce((s, t) => s + t.amount, 0);
  const totalRefunded = debits.reduce((s, t) => s + t.amount, 0);

  const todayStr = new Date().toDateString();
  const todayEarnings = credits
    .filter(t => new Date(t.created_at).toDateString() === todayStr)
    .reduce((s, t) => s + t.amount, 0);

  const filteredTx = filter === 'ALL'
    ? transactions
    : transactions.filter(t => t.type === filter);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.title}>Wallet</Text>
        </View>

        {/* ── Hero Balance Card ── */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <Text style={styles.heroLabel}>Total Balance</Text>
            <View style={styles.walletBadge}>
              <Ionicons name="shield-checkmark" size={12} color="#fff" />
              <Text style={styles.walletBadgeText}>Admin Wallet</Text>
            </View>
          </View>

          <Text style={styles.heroAmount}>₹{balance.toFixed(2)}</Text>

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStat}>
              <View style={styles.heroStatIcon}>
                <Ionicons name="arrow-down" size={12} color="#4ade80" />
              </View>
              <View>
                <Text style={styles.heroStatLabel}>Total Earned</Text>
                <Text style={styles.heroStatVal}>₹{totalEarned.toFixed(0)}</Text>
              </View>
            </View>

            <View style={styles.heroStatDivider} />

            <View style={styles.heroStat}>
              <View style={[styles.heroStatIcon, { backgroundColor: 'rgba(251,191,36,0.2)' }]}>
                <Ionicons name="today" size={12} color="#fbbf24" />
              </View>
              <View>
                <Text style={styles.heroStatLabel}>Today</Text>
                <Text style={styles.heroStatVal}>₹{todayEarnings.toFixed(0)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Quick Stats ── */}
        <View style={styles.quickStats}>
          <View style={[styles.quickStat, { backgroundColor: '#F0FDF4' }]}>
            <View style={[styles.quickStatIcon, { backgroundColor: '#22c55e20' }]}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#22c55e" />
            </View>
            <Text style={[styles.quickStatVal, { color: '#22c55e' }]}>{credits.length}</Text>
            <Text style={styles.quickStatLabel}>Orders Paid</Text>
          </View>

          <View style={[styles.quickStat, { backgroundColor: '#EEF4FF' }]}>
            <View style={[styles.quickStatIcon, { backgroundColor: '#4F7EFF20' }]}>
              <Ionicons name="calendar-outline" size={18} color="#4F7EFF" />
            </View>
            <Text style={[styles.quickStatVal, { color: '#4F7EFF' }]}>
              {credits.filter(t => new Date(t.created_at).toDateString() === todayStr).length}
            </Text>
            <Text style={styles.quickStatLabel}>Today's Orders</Text>
          </View>

          <View style={[styles.quickStat, { backgroundColor: '#FEF2F2' }]}>
            <View style={[styles.quickStatIcon, { backgroundColor: '#ef444420' }]}>
              <Ionicons name="arrow-undo-outline" size={18} color="#ef4444" />
            </View>
            <Text style={[styles.quickStatVal, { color: '#ef4444' }]}>₹{totalRefunded.toFixed(0)}</Text>
            <Text style={styles.quickStatLabel}>Refunded</Text>
          </View>
        </View>

        {/* ── Transaction History ── */}
        <View style={styles.txHeader}>
          <View>
            <Text style={styles.txTitle}>Transactions</Text>
            <Text style={styles.txSub}>{filteredTx.length} records</Text>
          </View>

          {/* Filter Chips */}
          <View style={styles.filterRow}>
            {(['ALL', 'credit', 'debit'] as const).map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.filterChip, filter === f && styles.filterChipActive]}
                onPress={() => setFilter(f)}
              >
                <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
                  {f === 'ALL' ? 'All' : f === 'credit' ? 'Earned' : 'Refunds'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {filteredTx.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="receipt-outline" size={32} color="#ccc" />
            </View>
            <Text style={styles.emptyTitle}>No transactions yet</Text>
            <Text style={styles.emptyDesc}>Earnings appear here when orders are delivered</Text>
          </View>
        ) : (
          <View style={styles.txList}>
            {[...filteredTx].reverse().map((tx, index) => (
              <View key={tx.id ?? index} style={styles.txCard}>
                <View style={[
                  styles.txIcon,
                  { backgroundColor: tx.type === 'credit' ? '#F0FDF4' : '#FEF2F2' }
                ]}>
                  <Ionicons
                    name={tx.type === 'credit' ? 'arrow-down' : 'arrow-up'}
                    size={16}
                    color={tx.type === 'credit' ? '#22c55e' : '#ef4444'}
                  />
                </View>

                <View style={styles.txInfo}>
                  <Text style={styles.txDesc} numberOfLines={1}>{tx.description}</Text>
                  <Text style={styles.txDate}>{formatDate(tx.created_at)}</Text>
                </View>

                <View style={styles.txRight}>
                  <Text style={[
                    styles.txAmount,
                    { color: tx.type === 'credit' ? '#22c55e' : '#ef4444' }
                  ]}>
                    {tx.type === 'credit' ? '+' : '-'}₹{tx.amount}
                  </Text>
                  {tx.balance_after !== undefined && (
                    <Text style={styles.txBal}>Bal: ₹{tx.balance_after?.toFixed(0)}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F7F4' },

  /* ── Header ── */
  header: {
    paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8,
  },
  title: { fontSize: 26, fontWeight: '800', color: '#1A1A1A', letterSpacing: -0.5 },

  /* ── Hero ── */
  heroCard: {
    margin: 20,
    backgroundColor: Colors.primary,
    borderRadius: 24,
    padding: 22,
    shadowColor: Colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  heroTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  heroLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  walletBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  walletBadgeText: { fontSize: 11, color: '#fff', fontWeight: '600' },
  heroAmount: {
    fontSize: 44, fontWeight: '800', color: '#fff',
    letterSpacing: -1, marginBottom: 20,
  },
  heroStatsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14, padding: 14,
  },
  heroStat: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  heroStatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 12 },
  heroStatIcon: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(74,222,128,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  heroStatLabel: { fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  heroStatVal: { fontSize: 14, fontWeight: '700', color: '#fff' },

  /* ── Quick Stats ── */
  quickStats: {
    flexDirection: 'row',
    paddingHorizontal: 20, gap: 10, marginBottom: 20,
  },
  quickStat: {
    flex: 1, borderRadius: 16, padding: 14,
    alignItems: 'center', gap: 6,
  },
  quickStatIcon: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  quickStatVal: { fontSize: 18, fontWeight: '800' },
  quickStatLabel: { fontSize: 10, color: '#888', fontWeight: '600', textAlign: 'center' },

  /* ── Tx Header ── */
  txHeader: {
    paddingHorizontal: 20, marginBottom: 12,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
  },
  txTitle: { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },
  txSub: { fontSize: 12, color: '#bbb', marginTop: 2 },

  filterRow: { flexDirection: 'row', gap: 6 },
  filterChip: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, backgroundColor: '#F0F0F0',
  },
  filterChipActive: { backgroundColor: Colors.primary + '15' },
  filterChipText: { fontSize: 11, fontWeight: '600', color: '#aaa' },
  filterChipTextActive: { color: Colors.primary },

  /* ── Tx List ── */
  txList: { paddingHorizontal: 16, gap: 8 },
  txCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 16,
    padding: 14, marginBottom: 8,
    shadowColor: '#000', shadowOpacity: 0.04,
    shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  txIcon: {
    width: 42, height: 42, borderRadius: 21,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  txInfo: { flex: 1 },
  txDesc: { fontSize: 13, fontWeight: '600', color: '#1A1A1A' },
  txDate: { fontSize: 11, color: '#aaa', marginTop: 3 },
  txRight: { alignItems: 'flex-end' },
  txAmount: { fontSize: 15, fontWeight: '800' },
  txBal: { fontSize: 10, color: '#bbb', marginTop: 3 },

  /* ── Empty ── */
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyIcon: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center', alignItems: 'center', marginBottom: 4,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#999' },
  emptyDesc: { fontSize: 13, color: '#ccc', textAlign: 'center' },
});