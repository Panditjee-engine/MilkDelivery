import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/constants/colors';

export default function DeliveryContactSupportScreen() {
  const router = useRouter();

  const openPhone = () => Linking.openURL('tel:+919999999999');
  const openEmail = () => Linking.openURL('mailto:support@gausatva.com');

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Contact Support</Text>
          <Text style={s.subtitle}>Use these contacts for delivery issues and account help.</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={s.primaryCard} onPress={openPhone} activeOpacity={0.82}>
          <View style={s.primaryIcon}>
            <Ionicons name="call" size={24} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.primaryTitle}>Call Support</Text>
            <Text style={s.primarySub}>+91 99999 99999</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity style={s.card} onPress={openEmail} activeOpacity={0.82}>
          <View style={[s.iconBox, { backgroundColor: '#EEF4FF' }]}>
            <Ionicons name="mail-outline" size={20} color="#4F7EFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle}>Email Support</Text>
            <Text style={s.cardSub}>support@gausatva.com</Text>
          </View>
          <Ionicons name="chevron-forward" size={17} color="#CBD5E1" />
        </TouchableOpacity>

        <View style={s.card}>
          <View style={[s.iconBox, { backgroundColor: '#F0FDF4' }]}>
            <Ionicons name="time-outline" size={20} color="#22c55e" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle}>Support Hours</Text>
            <Text style={s.cardSub}>Daily, 6:00 AM to 9:00 PM</Text>
          </View>
        </View>

        <View style={s.noteCard}>
          <Ionicons name="information-circle-outline" size={20} color={Colors.primary} />
          <Text style={s.noteText}>
            For urgent delivery problems, call support and also inform your admin from the delivery dashboard.
          </Text>
        </View>
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
  primaryCard: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  primaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryTitle: { fontSize: 17, fontWeight: '900', color: '#fff' },
  primarySub: { fontSize: 14, color: 'rgba(255,255,255,0.82)', marginTop: 3, fontWeight: '700' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#EEF2F7',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: 15, fontWeight: '900', color: '#111827' },
  cardSub: { fontSize: 13, color: '#6B7280', marginTop: 3, fontWeight: '600' },
  noteCard: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    gap: 10,
  },
  noteText: { flex: 1, fontSize: 13, color: '#9A3412', lineHeight: 19, fontWeight: '700' },
});
