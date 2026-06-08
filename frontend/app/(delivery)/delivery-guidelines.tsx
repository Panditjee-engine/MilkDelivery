import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/constants/colors';

const guidelines = [
  {
    title: 'Before starting',
    items: [
      'Check your assigned zone and delivery list before leaving.',
      'Carry clean delivery bags and keep milk products sealed.',
      'Confirm customer address, tower, flat, and phone before delivery.',
    ],
  },
  {
    title: 'During delivery',
    items: [
      'Handle products carefully and avoid leaving packages unattended.',
      'Mark the delivery status only after reaching the customer location.',
      'Take proof when requested by the app or admin.',
    ],
  },
  {
    title: 'After delivery',
    items: [
      'Update completed, failed, or skipped deliveries immediately.',
      'Report wrong addresses, unavailable customers, or damaged items to admin.',
      'End your shift only after all assigned deliveries are updated.',
    ],
  },
];

export default function DeliveryGuidelinesScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Delivery Guidelines</Text>
          <Text style={s.subtitle}>Follow these steps for clean and reliable deliveries.</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {guidelines.map((section, index) => (
          <View key={section.title} style={s.card}>
            <View style={s.cardHeader}>
              <View style={s.badge}>
                <Text style={s.badgeText}>{index + 1}</Text>
              </View>
              <Text style={s.cardTitle}>{section.title}</Text>
            </View>
            {section.items.map((item) => (
              <View key={item} style={s.itemRow}>
                <Ionicons name="checkmark-circle-outline" size={17} color="#16a34a" />
                <Text style={s.itemText}>{item}</Text>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F7F4' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 22, fontWeight: '900', color: '#111827' },
  subtitle: { fontSize: 13, color: '#6B7280', marginTop: 3, lineHeight: 18 },
  content: { padding: 20, gap: 14, paddingBottom: 36 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EEF2F7',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  badge: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  cardTitle: { fontSize: 16, fontWeight: '900', color: '#111827' },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, paddingVertical: 8 },
  itemText: { flex: 1, fontSize: 14, color: '#374151', lineHeight: 20, fontWeight: '600' },
});
