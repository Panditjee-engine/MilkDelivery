import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, TextInput, Alert, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/services/api';
import { Colors } from '../../src/constants/colors';
import LoadingScreen from '../../src/components/LoadingScreen';
import Button from '../../src/components/Button';

const quickAmounts = [100, 200, 500, 1000];

export default function WalletScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [rechargeModal, setRechargeModal] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [recharging, setRecharging] = useState(false);

  const fetchData = async () => {
    try {
      const [walletData, txData] = await Promise.all([
        api.getWallet(),
        api.getWalletTransactions(),
      ]);
      setBalance(walletData.balance);
      setTransactions(txData);
    } catch (error) {
      console.error('Error fetching wallet:', error);
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

  const handleRecharge = async () => {
    const amount = parseFloat(rechargeAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    setRecharging(true);
    try {
      await api.rechargeWallet(amount);
      Alert.alert('Success', `₹${amount} added to wallet`);
      setRechargeModal(false);
      setRechargeAmount('');
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setRecharging(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  if (loading) return <LoadingScreen />;

  const credits = transactions.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
  const debits = transactions.filter(t => t.type === 'debit').reduce((s, t) => s + t.amount, 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <Text style={styles.heroLabel}>Total Balance</Text>
            <View style={styles.walletBadge}>
              <Ionicons name="wallet-outline" size={14} color="#fff" />
              <Text style={styles.walletBadgeText}>My Wallet</Text>
            </View>
          </View>

          <Text style={styles.heroAmount}>₹{balance.toFixed(2)}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={styles.statIconGreen}>
                <Ionicons name="arrow-down" size={12} color="#22c55e" />
              </View>
              <View>
                <Text style={styles.statLabel}>Total Added</Text>
                <Text style={styles.statValue}>₹{credits.toFixed(0)}</Text>
              </View>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <View style={styles.statIconRed}>
                <Ionicons name="arrow-up" size={12} color="#ef4444" />
              </View>
              <View>
                <Text style={styles.statLabel}>Total Spent</Text>
                <Text style={styles.statValue}>₹{debits.toFixed(0)}</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.addMoneyBtn}
            onPress={() => setRechargeModal(true)}
          >
            <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
            <Text style={styles.addMoneyText}>Add Money</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transaction History</Text>
          <Text style={styles.sectionSub}>{transactions.length} transactions</Text>
        </View>

        {transactions.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="receipt-outline" size={32} color="#ccc" />
            </View>
            <Text style={styles.emptyTitle}>No transactions yet</Text>
            <Text style={styles.emptyDesc}>Your transaction history will appear here</Text>
          </View>
        ) : (
          <View style={styles.txList}>
            {transactions.slice().reverse().map((tx, index) => (
              <View key={tx.id || index} style={styles.txCard}>
                <View style={[
                  styles.txIcon,
                  tx.type === 'credit' ? styles.txIconGreen : styles.txIconRed
                ]}>
                  <Ionicons
                    name={tx.type === 'credit' ? 'arrow-down' : 'arrow-up'}
                    size={16}
                    color={tx.type === 'credit' ? '#22c55e' : '#ef4444'}
                  />
                </View>

                <View style={styles.txInfo}>
                  <Text style={styles.txDesc}>{tx.description}</Text>
                  <Text style={styles.txDate}>{formatDate(tx.created_at)}</Text>
                </View>

                <View style={styles.txRight}>
                  <Text style={[
                    styles.txAmount,
                    { color: tx.type === 'credit' ? '#22c55e' : '#ef4444' }
                  ]}>
                    {tx.type === 'credit' ? '+' : '-'}₹{tx.amount}
                  </Text>
                  <Text style={styles.txBal}>₹{tx.balance_after}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>

      <Modal visible={rechargeModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>

            <View style={styles.dragHandle} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Money</Text>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => { setRechargeModal(false); setRechargeAmount(''); }}
              >
                <Ionicons name="close" size={16} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.amountBox}>
              <Text style={styles.rupeeSymbol}>₹</Text>
              <TextInput
                style={styles.amountInput}
                value={rechargeAmount}
                onChangeText={setRechargeAmount}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#ddd"
                autoFocus
              />
            </View>

            <Text style={styles.quickLabel}>Quick Select</Text>
            <View style={styles.quickRow}>
              {quickAmounts.map((amt) => (
                <TouchableOpacity
                  key={amt}
                  style={[
                    styles.quickChip,
                    rechargeAmount === amt.toString() && styles.quickChipActive
                  ]}
                  onPress={() => setRechargeAmount(amt.toString())}
                >
                  <Text style={[
                    styles.quickChipText,
                    rechargeAmount === amt.toString() && styles.quickChipTextActive
                  ]}>
                    ₹{amt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Button
              title={rechargeAmount ? `Add ₹${rechargeAmount}` : 'Enter Amount'}
              onPress={handleRecharge}
              loading={recharging}
              disabled={!rechargeAmount}
            />

            <Text style={styles.mockNote}>Mock payment — for demo purposes only</Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F7F4',
  },

  heroCard: {
    margin: 20,
    backgroundColor: Colors.primary,
    borderRadius: 24,
    padding: 24,
    shadowColor: Colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  heroLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  walletBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  walletBadgeText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  heroAmount: {
    fontSize: 44,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -1,
    marginBottom: 20,
  },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 12,
  },
  statIconGreen: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(34,197,94,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statIconRed: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(239,68,68,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },

  addMoneyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
  },
  addMoneyText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
  },

  section: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: 20,
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  sectionSub: {
    fontSize: 12,
    color: '#bbb',
    fontWeight: '500',
  },

  txList: {
    paddingHorizontal: 20,
    gap: 10,
  },
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
    marginBottom: 8,
  },
  txIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  txIconGreen: {
    backgroundColor: '#f0fdf4',
  },
  txIconRed: {
    backgroundColor: '#fef2f2',
  },
  txInfo: {
    flex: 1,
  },
  txDesc: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  txDate: {
    fontSize: 11,
    color: '#aaa',
    marginTop: 3,
  },
  txRight: {
    alignItems: 'flex-end',
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '800',
  },
  txBal: {
    fontSize: 10,
    color: '#bbb',
    marginTop: 3,
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 10,
  },
  emptyIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#999',
  },
  emptyDesc: {
    fontSize: 13,
    color: '#ccc',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 36,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },

  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 16,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  rupeeSymbol: {
    fontSize: 36,
    fontWeight: '800',
    color: '#1A1A1A',
    marginRight: 4,
  },
  amountInput: {
    flex: 1,
    fontSize: 36,
    fontWeight: '800',
    color: '#1A1A1A',
    paddingVertical: 18,
  },

  quickLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#999',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  quickRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  quickChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  quickChipActive: {
    backgroundColor: Colors.primary + '15',
    borderColor: Colors.primary,
  },
  quickChipText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#888',
  },
  quickChipTextActive: {
    color: Colors.primary,
  },

  mockNote: {
    fontSize: 11,
    color: '#ccc',
    textAlign: 'center',
    marginTop: 12,
  },
});