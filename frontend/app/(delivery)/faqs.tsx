import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const faqs = [
  {
    question: 'What should I do if a customer is unavailable?',
    answer: 'Call the customer once, wait briefly, then mark the delivery status as instructed by your admin.',
  },
  {
    question: 'When should I mark a delivery as completed?',
    answer: 'Only after the product has been handed over or placed at the approved customer drop location.',
  },
  {
    question: 'What if the address is wrong?',
    answer: 'Do not guess the location. Contact support or admin and update the delivery notes if needed.',
  },
  {
    question: 'How are wallet earnings updated?',
    answer: 'Earnings are updated after completed deliveries are synced and reviewed by the system or admin.',
  },
  {
    question: 'Can I change my assigned zone?',
    answer: 'Assigned zones are managed by admin. Contact support or your admin for zone updates.',
  },
];

export default function DeliveryFaqsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>FAQs</Text>
          <Text style={s.subtitle}>Quick answers for common delivery questions.</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {faqs.map((item) => (
          <View key={item.question} style={s.card}>
            <View style={s.questionRow}>
              <View style={s.iconBox}>
                <Ionicons name="help-circle-outline" size={19} color="#f59e0b" />
              </View>
              <Text style={s.question}>{item.question}</Text>
            </View>
            <Text style={s.answer}>{item.answer}</Text>
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
  content: { padding: 20, gap: 12, paddingBottom: 36 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EEF2F7',
  },
  questionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#FFF4E6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  question: { flex: 1, fontSize: 15, fontWeight: '900', color: '#111827', lineHeight: 20 },
  answer: { fontSize: 14, color: '#4B5563', lineHeight: 21, fontWeight: '600' },
});
