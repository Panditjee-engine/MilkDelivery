import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert, Modal, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../../src/services/api';
import { Colors } from '../../src/constants/colors';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import LoadingScreen from '../../src/components/LoadingScreen';

export default function DeliveriesScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<any>(null);
  const [completeModal, setCompleteModal] = useState(false);
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);

  const fetchData = async () => {
    try {
      const data = await api.getTodayDeliveries();
      setDeliveries(data);
    } catch (error) {
      console.error('Error fetching deliveries:', error);
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

  const openCompleteModal = (delivery: any) => {
    setSelectedDelivery(delivery);
    setProofImage(null);
    setCompleteModal(true);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera permission is required to take proof photos');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setProofImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const handleComplete = async () => {
    setCompleting(true);
    try {
      await api.completeDelivery(selectedDelivery.id, proofImage || undefined);
      Alert.alert('Success', 'Delivery marked as complete!');
      setCompleteModal(false);
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setCompleting(false);
    }
  };

  const openMaps = (address: any) => {
    const addressString = `${address?.tower || ''} ${address?.flat || ''}`;
    const url = `https://maps.google.com/maps?q=${encodeURIComponent(addressString)}`;
    Linking.openURL(url);
  };

  const callCustomer = (phone: string) => {
    if (phone && phone !== 'N/A') {
      Linking.openURL(`tel:${phone}`);
    } else {
      Alert.alert('No Phone', 'Customer phone number not available');
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  const pendingDeliveries = deliveries.filter(d => d.status !== 'delivered');
  const completedDeliveries = deliveries.filter(d => d.status === 'delivered');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Today's Deliveries</Text>
        <Text style={styles.subtitle}>{deliveries.length} total deliveries</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Pending */}
        {pendingDeliveries.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pending ({pendingDeliveries.length})</Text>
            {pendingDeliveries.map((delivery, index) => (
              <Card key={delivery.id} variant="elevated" style={styles.deliveryCard}>
                <View style={styles.deliveryHeader}>
                  <View style={styles.sequenceBadge}>
                    <Text style={styles.sequenceText}>#{index + 1}</Text>
                  </View>
                  <View style={styles.deliveryInfo}>
                    <Text style={styles.customerName}>{delivery.customer_name}</Text>
                    <Text style={styles.deliveryAmount}>₹{delivery.total_amount}</Text>
                  </View>
                </View>

                <View style={styles.addressSection}>
                  <Ionicons name="location" size={16} color={Colors.textSecondary} />
                  <Text style={styles.addressText}>
                    {delivery.address?.tower && `Tower ${delivery.address.tower}, `}
                    {delivery.address?.flat && `Flat ${delivery.address.flat}, `}
                    {delivery.address?.floor && `Floor ${delivery.address.floor}`}
                  </Text>
                </View>

                <View style={styles.itemsList}>
                  {delivery.items?.map((item: any, idx: number) => (
                    <Text key={idx} style={styles.itemText}>
                      • {item.product_name} x{item.quantity}
                    </Text>
                  ))}
                </View>

                <View style={styles.deliveryActions}>
                  <TouchableOpacity style={styles.actionIcon} onPress={() => openMaps(delivery.address)}>
                    <Ionicons name="navigate" size={20} color={Colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionIcon} onPress={() => callCustomer(delivery.customer_phone)}>
                    <Ionicons name="call" size={20} color={Colors.secondary} />
                  </TouchableOpacity>
                  <Button
                    title="Complete Delivery"
                    onPress={() => openCompleteModal(delivery)}
                    size="small"
                    style={styles.completeButton}
                  />
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Completed */}
        {completedDeliveries.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Completed ({completedDeliveries.length})</Text>
            {completedDeliveries.map((delivery) => (
              <Card key={delivery.id} variant="outlined" style={styles.completedCard}>
                <View style={styles.completedHeader}>
                  <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
                  <View style={styles.completedInfo}>
                    <Text style={styles.completedName}>{delivery.customer_name}</Text>
                    <Text style={styles.completedAmount}>₹{delivery.total_amount}</Text>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}

        {deliveries.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="bicycle-outline" size={60} color={Colors.textLight} />
            <Text style={styles.emptyTitle}>No Deliveries Today</Text>
            <Text style={styles.emptyText}>Check back later or contact your supervisor</Text>
          </View>
        )}
      </ScrollView>

      {/* Complete Modal */}
      <Modal visible={completeModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Complete Delivery</Text>
              <TouchableOpacity onPress={() => setCompleteModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {selectedDelivery && (
              <>
                <View style={styles.modalDeliveryInfo}>
                  <Text style={styles.modalCustomer}>{selectedDelivery.customer_name}</Text>
                  <Text style={styles.modalAddress}>
                    {selectedDelivery.address?.tower && `Tower ${selectedDelivery.address.tower}, `}
                    {selectedDelivery.address?.flat && `Flat ${selectedDelivery.address.flat}`}
                  </Text>
                </View>

                <Text style={styles.photoLabel}>Proof of Delivery (Optional)</Text>
                <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
                  {proofImage ? (
                    <View style={styles.photoPreview}>
                      <Ionicons name="checkmark-circle" size={40} color={Colors.success} />
                      <Text style={styles.photoTaken}>Photo captured</Text>
                    </View>
                  ) : (
                    <View style={styles.photoPlaceholder}>
                      <Ionicons name="camera" size={40} color={Colors.textSecondary} />
                      <Text style={styles.photoText}>Take photo of delivery</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <View style={styles.silentReminder}>
                  <Ionicons name="volume-mute" size={20} color={Colors.warning} />
                  <Text style={styles.silentText}>Remember: Silent delivery - don't ring doorbell</Text>
                </View>

                <Button
                  title="Confirm Delivery Complete"
                  onPress={handleComplete}
                  loading={completing}
                  style={styles.confirmButton}
                />
              </>
            )}
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
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  deliveryCard: {
    marginBottom: 12,
  },
  deliveryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sequenceBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sequenceText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textInverse,
  },
  deliveryInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  deliveryAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  addressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  addressText: {
    fontSize: 14,
    color: Colors.textSecondary,
    flex: 1,
  },
  itemsList: {
    backgroundColor: Colors.surfaceSecondary,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  itemText: {
    fontSize: 13,
    color: Colors.text,
    marginBottom: 4,
  },
  deliveryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completeButton: {
    flex: 1,
  },
  completedCard: {
    marginBottom: 8,
  },
  completedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  completedInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  completedName: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  completedAmount: {
    fontSize: 14,
    color: Colors.textSecondary,
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
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  modalDeliveryInfo: {
    marginBottom: 20,
  },
  modalCustomer: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  modalAddress: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  photoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  photoButton: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  photoPlaceholder: {
    alignItems: 'center',
  },
  photoPreview: {
    alignItems: 'center',
  },
  photoText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  photoTaken: {
    fontSize: 14,
    color: Colors.success,
    fontWeight: '600',
    marginTop: 8,
  },
  silentReminder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.warning + '20',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  silentText: {
    fontSize: 13,
    color: Colors.warning,
    flex: 1,
  },
  confirmButton: {
    marginBottom: 16,
  },
});
