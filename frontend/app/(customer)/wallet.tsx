import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/services/api';
import { Colors } from '../../src/constants/colors';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import LoadingScreen from '../../src/components/LoadingScreen';

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

  useEffect(() => {
    fetchData();
  }, []);

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
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return <LoadingScreen />;
  }

  const quickAmounts = [100, 200, 500, 1000];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Wallet</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Balance Card */}
        <Card variant="elevated" style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Ionicons name="wallet" size={32} color={Colors.textInverse} />
            <Text style={styles.balanceLabel}>Available Balance</Text>
          </View>
          <Text style={styles.balanceAmount}>₹{balance.toFixed(2)}</Text>
          <Button
            title="Add Money"
            onPress={() => setRechargeModal(true)}
            variant="outline"
            style={styles.addMoneyButton}
            textStyle={{ color: Colors.textInverse }}
          />
        </Card>

        {/* Transactions */}
        <View style={styles.transactionsSection}>
          <Text style={styles.sectionTitle}>Transaction History</Text>
          {transactions.length > 0 ? (
            transactions.slice().reverse().map((tx, index) => (
              <Card key={tx.id || index} variant="outlined" style={styles.transactionCard}>
                <View style={styles.transactionIcon}>
                  <Ionicons
                    name={tx.type === 'credit' ? 'arrow-down' : 'arrow-up'}
                    size={20}
                    color={tx.type === 'credit' ? Colors.success : Colors.error}
                  />
                </View>
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionDesc}>{tx.description}</Text>
                  <Text style={styles.transactionDate}>{formatDate(tx.created_at)}</Text>
                </View>
                <View style={styles.transactionAmount}>
                  <Text
                    style={[
                      styles.transactionValue,
                      { color: tx.type === 'credit' ? Colors.success : Colors.error },
                    ]}
                  >
                    {tx.type === 'credit' ? '+' : '-'}₹{tx.amount}
                  </Text>
                  <Text style={styles.transactionBalance}>Bal: ₹{tx.balance_after}</Text>
                </View>
              </Card>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={60} color={Colors.textLight} />
              <Text style={styles.emptyText}>No transactions yet</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Recharge Modal */}
      <Modal visible={rechargeModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Money</Text>
              <TouchableOpacity onPress={() => setRechargeModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Enter Amount</Text>
            <View style={styles.amountInput}>
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                style={styles.amountTextInput}
                value={rechargeAmount}
                onChangeText={setRechargeAmount}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={Colors.textLight}
              />
            </View>

            <Text style={styles.quickAmountsLabel}>Quick Add</Text>
            <View style={styles.quickAmounts}>
              {quickAmounts.map((amount) => (
                <TouchableOpacity
                  key={amount}
                  style={styles.quickAmountChip}
                  onPress={() => setRechargeAmount(amount.toString())}
                >
                  <Text style={styles.quickAmountText}>₹{amount}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Button
              title={`Add ₹${rechargeAmount || '0'}`}
              onPress={handleRecharge}
              loading={recharging}
              disabled={!rechargeAmount}
              style={styles.rechargeButton}
            />

            <Text style={styles.mockNote}>This is a mock payment for demo purposes</Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
  },
  scrollView: {
    flex: 1,
  },
  balanceCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    paddingVertical: 32,
  },
  balanceHeader: {
    alignItems: 'center',
    marginBottom: 8,
  },
  balanceLabel: {
    fontSize: 14,
    color: Colors.textInverse,
    opacity: 0.9,
    marginTop: 8,
  },
  balanceAmount: {
    fontSize: 48,
    fontWeight: '700',
    color: Colors.textInverse,
    marginBottom: 20,
  },
  addMoneyButton: {
    borderColor: Colors.textInverse,
    paddingHorizontal: 32,
  },
  transactionsSection: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDesc: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  transactionDate: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  transactionValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  transactionBalance: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  amountInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  currencySymbol: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.text,
    marginRight: 8,
  },
  amountTextInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: '700',
    color: Colors.text,
    paddingVertical: 16,
  },
  quickAmountsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  quickAmounts: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  quickAmountChip: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: Colors.primaryLight + '30',
    borderRadius: 8,
    alignItems: 'center',
  },
  quickAmountText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  rechargeButton: {
    marginBottom: 12,
  },
  mockNote: {
    fontSize: 12,
    color: Colors.textLight,
    textAlign: 'center',
  },
});
