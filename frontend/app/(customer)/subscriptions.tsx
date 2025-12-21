import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { api } from '../../src/services/api';
import { Colors } from '../../src/constants/colors';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import LoadingScreen from '../../src/components/LoadingScreen';

export default function SubscriptionsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [selectedSub, setSelectedSub] = useState<any>(null);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [modifyQuantity, setModifyQuantity] = useState(1);

  const fetchData = async () => {
    try {
      const data = await api.getSubscriptions();
      setSubscriptions(data);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
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

  const handleCancel = async (subId: string) => {
    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel this subscription?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.cancelSubscription(subId);
              fetchData();
              Alert.alert('Success', 'Subscription cancelled');
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const openCalendar = (sub: any) => {
    setSelectedSub(sub);
    setModifyQuantity(sub.quantity);
    setSelectedDate('');
    setCalendarVisible(true);
  };

  const handleDateSelect = (day: any) => {
    setSelectedDate(day.dateString);
    // Check if there's already a modification for this date
    const existing = selectedSub?.modifications?.find((m: any) => m.date === day.dateString);
    if (existing) {
      setModifyQuantity(existing.quantity);
    } else {
      setModifyQuantity(selectedSub?.quantity || 1);
    }
  };

  const handleSaveModification = async () => {
    if (!selectedDate) {
      Alert.alert('Error', 'Please select a date');
      return;
    }

    try {
      await api.modifySubscriptionDate(selectedSub.id, selectedDate, modifyQuantity);
      Alert.alert('Success', 'Modification saved');
      setCalendarVisible(false);
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const getPatternLabel = (pattern: string) => {
    switch (pattern) {
      case 'daily': return 'Every day';
      case 'alternate': return 'Alternate days';
      case 'custom': return 'Custom days';
      case 'buy_once': return 'One-time';
      default: return pattern;
    }
  };

  const getMarkedDates = () => {
    const marks: any = {};
    const today = new Date().toISOString().split('T')[0];
    
    // Mark modifications
    selectedSub?.modifications?.forEach((mod: any) => {
      marks[mod.date] = {
        marked: true,
        dotColor: Colors.accent,
      };
    });

    // Mark selected date
    if (selectedDate) {
      marks[selectedDate] = {
        ...marks[selectedDate],
        selected: true,
        selectedColor: Colors.primary,
      };
    }

    return marks;
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>My Subscriptions</Text>
        <Text style={styles.subtitle}>Manage your daily deliveries</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {subscriptions.length > 0 ? (
          subscriptions.map((sub) => (
            <Card key={sub.id} variant="elevated" style={styles.subscriptionCard}>
              <View style={styles.cardHeader}>
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{sub.product?.name || 'Product'}</Text>
                  <Text style={styles.productUnit}>{sub.product?.unit}</Text>
                </View>
                <View style={styles.priceTag}>
                  <Text style={styles.price}>₹{sub.product?.price || 0}</Text>
                </View>
              </View>

              <View style={styles.detailsRow}>
                <View style={styles.detail}>
                  <Ionicons name="repeat" size={16} color={Colors.textSecondary} />
                  <Text style={styles.detailText}>{getPatternLabel(sub.pattern)}</Text>
                </View>
                <View style={styles.detail}>
                  <Ionicons name="cube" size={16} color={Colors.textSecondary} />
                  <Text style={styles.detailText}>{sub.quantity}x per delivery</Text>
                </View>
              </View>

              {sub.custom_days && sub.custom_days.length > 0 && (
                <View style={styles.customDays}>
                  <Text style={styles.customDaysLabel}>Days: </Text>
                  <Text style={styles.customDaysText}>
                    {sub.custom_days.map((d: number) => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][d]).join(', ')}
                  </Text>
                </View>
              )}

              {sub.modifications && sub.modifications.length > 0 && (
                <View style={styles.modificationsSection}>
                  <Text style={styles.modificationsTitle}>Upcoming changes:</Text>
                  {sub.modifications.slice(0, 3).map((mod: any, idx: number) => (
                    <Text key={idx} style={styles.modificationText}>
                      {mod.date}: {mod.quantity}x
                    </Text>
                  ))}
                </View>
              )}

              <View style={styles.cardActions}>
                <TouchableOpacity style={styles.actionButton} onPress={() => openCalendar(sub)}>
                  <Ionicons name="calendar" size={18} color={Colors.primary} />
                  <Text style={styles.actionText}>Modify</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={() => handleCancel(sub.id)}>
                  <Ionicons name="close-circle" size={18} color={Colors.error} />
                  <Text style={[styles.actionText, { color: Colors.error }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </Card>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={60} color={Colors.textLight} />
            <Text style={styles.emptyTitle}>No Active Subscriptions</Text>
            <Text style={styles.emptyText}>Start by adding products from the catalog</Text>
          </View>
        )}
      </ScrollView>

      {/* Calendar Modal */}
      <Modal visible={calendarVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Modify Delivery</Text>
              <TouchableOpacity onPress={() => setCalendarVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Select a date to change quantity for {selectedSub?.product?.name}
            </Text>

            <Calendar
              minDate={new Date().toISOString().split('T')[0]}
              markedDates={getMarkedDates()}
              onDayPress={handleDateSelect}
              theme={{
                todayTextColor: Colors.primary,
                selectedDayBackgroundColor: Colors.primary,
                arrowColor: Colors.primary,
              }}
            />

            {selectedDate && (
              <View style={styles.quantitySection}>
                <Text style={styles.quantityLabel}>Quantity for {selectedDate}:</Text>
                <View style={styles.quantityControl}>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => setModifyQuantity(Math.max(0, modifyQuantity - 1))}
                  >
                    <Ionicons name="remove" size={20} color={Colors.primary} />
                  </TouchableOpacity>
                  <Text style={styles.quantityText}>{modifyQuantity}</Text>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => setModifyQuantity(modifyQuantity + 1)}
                  >
                    <Ionicons name="add" size={20} color={Colors.primary} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.quantityHint}>Set to 0 to skip delivery</Text>
              </View>
            )}

            <Button
              title="Save Modification"
              onPress={handleSaveModification}
              disabled={!selectedDate}
              style={styles.saveButton}
            />
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
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  subscriptionCard: {
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  productUnit: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  priceTag: {
    backgroundColor: Colors.primaryLight + '30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  customDays: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  customDaysLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  customDaysText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },
  modificationsSection: {
    backgroundColor: Colors.surfaceSecondary,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  modificationsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  modificationText: {
    fontSize: 12,
    color: Colors.text,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
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
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  quantitySection: {
    marginTop: 20,
    alignItems: 'center',
  },
  quantityLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  quantityButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryLight + '30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    minWidth: 50,
    textAlign: 'center',
  },
  quantityHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  saveButton: {
    marginTop: 20,
  },
});
