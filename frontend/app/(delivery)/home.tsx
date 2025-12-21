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

export default function DeliveryHome() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkinStatus, setCheckinStatus] = useState<any>(null);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = async () => {
    try {
      const [status, deliveriesData] = await Promise.all([
        api.getCheckinStatus(),
        api.getTodayDeliveries(),
      ]);
      setCheckinStatus(status);
      setDeliveries(deliveriesData);
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

  const handleCheckin = async () => {
    setActionLoading(true);
    try {
      await api.checkin();
      Alert.alert('Success', 'Checked in successfully!');
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckout = async () => {
    Alert.alert('Checkout', 'Are you sure you want to end your shift?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Checkout',
        onPress: async () => {
          setActionLoading(true);
          try {
            await api.checkout();
            Alert.alert('Success', 'Checked out successfully!');
            fetchData();
          } catch (error: any) {
            Alert.alert('Error', error.message);
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return <LoadingScreen />;
  }

  const completedCount = deliveries.filter(d => d.status === 'delivered').length;
  const pendingCount = deliveries.filter(d => d.status !== 'delivered').length;
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome,</Text>
            <Text style={styles.userName}>{user?.name || 'Partner'}</Text>
          </View>
          <View style={styles.zoneBadge}>
            <Ionicons name="location" size={16} color={Colors.primary} />
            <Text style={styles.zoneText}>{user?.zone || 'Not Assigned'}</Text>
          </View>
        </View>

        <Text style={styles.date}>{today}</Text>

        {/* Check-in Card */}
        <Card variant="elevated" style={[
          styles.checkinCard,
          { backgroundColor: checkinStatus?.checked_in ? Colors.secondary : Colors.primary }
        ]}>
          <View style={styles.checkinHeader}>
            <Ionicons 
              name={checkinStatus?.checked_in ? 'checkmark-circle' : 'time'} 
              size={40} 
              color={Colors.textInverse} 
            />
            <View style={styles.checkinInfo}>
              <Text style={styles.checkinStatus}>
                {checkinStatus?.checked_in 
                  ? (checkinStatus?.checked_out ? 'Shift Completed' : 'On Duty')
                  : 'Not Checked In'
                }
              </Text>
              {checkinStatus?.checkin_time && (
                <Text style={styles.checkinTime}>
                  Started at {new Date(checkinStatus.checkin_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              )}
            </View>
          </View>
          {!checkinStatus?.checked_out && (
            <Button
              title={checkinStatus?.checked_in ? 'End Shift' : 'Start Shift'}
              onPress={checkinStatus?.checked_in ? handleCheckout : handleCheckin}
              variant="outline"
              loading={actionLoading}
              style={styles.checkinButton}
              textStyle={{ color: Colors.textInverse }}
            />
          )}
        </Card>

        {/* Stats */}
        <View style={styles.statsRow}>
          <Card variant="outlined" style={styles.statCard}>
            <Ionicons name="cube" size={24} color={Colors.accent} />
            <Text style={styles.statValue}>{deliveries.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </Card>
          <Card variant="outlined" style={styles.statCard}>
            <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
            <Text style={styles.statValue}>{completedCount}</Text>
            <Text style={styles.statLabel}>Delivered</Text>
          </Card>
          <Card variant="outlined" style={styles.statCard}>
            <Ionicons name="time" size={24} color={Colors.warning} />
            <Text style={styles.statValue}>{pendingCount}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </Card>
        </View>

        {/* Delivery Info */}
        <Card variant="outlined" style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={24} color={Colors.info} />
            <Text style={styles.infoTitle}>Delivery Guidelines</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="time-outline" size={18} color={Colors.textSecondary} />
            <Text style={styles.infoText}>Delivery window: 5:00 AM - 7:00 AM</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="volume-mute-outline" size={18} color={Colors.textSecondary} />
            <Text style={styles.infoText}>Silent delivery - Don't ring doorbell</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="camera-outline" size={18} color={Colors.textSecondary} />
            <Text style={styles.infoText}>Take photo proof of delivery</Text>
          </View>
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
  zoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight + '30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  zoneText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  date: {
    fontSize: 14,
    color: Colors.textSecondary,
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 20,
  },
  checkinCard: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  checkinHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  checkinInfo: {
    flex: 1,
  },
  checkinStatus: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textInverse,
  },
  checkinTime: {
    fontSize: 14,
    color: Colors.textInverse,
    opacity: 0.9,
    marginTop: 4,
  },
  checkinButton: {
    borderColor: Colors.textInverse,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  infoCard: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  infoText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
