import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Modal, TextInput, Pressable
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';

// ─── Types ───────────────────────────────────────────────────────────────────

type ModalType = 'cutoff' | 'delivery' | 'grace' | 'business' | 'contact' | null;

interface Settings {
  cutoffHour: string;
  cutoffMin: string;
  cutoffAmPm: 'AM' | 'PM';
  deliveryStartHour: string;
  deliveryStartMin: string;
  deliveryStartAmPm: 'AM' | 'PM';
  deliveryEndHour: string;
  deliveryEndMin: string;
  deliveryEndAmPm: 'AM' | 'PM';
  gracePeriod: string;
  businessName: string;
  supportContact: string;
}

const GRACE_OPTIONS = ['No grace period', '1 day', '2 days', '3 days', '1 week'];
const HOURS_12 = ['6', '7', '8', '9', '10', '11', '12'];
const MINUTES = ['00', '15', '30', '45'];

// ─── Main Component ──────────────────────────────────────────────────────────

export default function AdminSettingsScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [settings, setSettings] = useState<Settings>({
    cutoffHour: '10', cutoffMin: '00', cutoffAmPm: 'PM',
    deliveryStartHour: '5', deliveryStartMin: '00', deliveryStartAmPm: 'AM',
    deliveryEndHour: '7', deliveryEndMin: '00', deliveryEndAmPm: 'AM',
    gracePeriod: '1 day',
    businessName: 'GauSatva',
    supportContact: '+91 9999999999',
  });

  // Temp state for editing inside modal
  const [draft, setDraft] = useState<Settings>(settings);
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await AsyncStorage.getItem('APP_SETTINGS');
        if (data !== null) {
          const parsed = JSON.parse(data);
          setSettings(parsed);
        }
      } catch (e) {
        console.log('LOAD ERROR:', e);
      }
    };

    loadSettings();
  }, []);

  const openModal = (type: ModalType) => {
    setDraft({ ...settings });
    setActiveModal(type);
  };
  const closeModal = () => setActiveModal(null);
  const saveModal = async () => {
    setSettings({ ...draft });
    await AsyncStorage.setItem('APP_SETTINGS', JSON.stringify(draft));

    setActiveModal(null);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => { await logout(); router.replace('/'); } },
    ]);
  };

  // 🔥 Cutoff check function
  const isAfterCutoff = () => {
    const now = new Date();

    let hour = parseInt(settings.cutoffHour);
    const min = parseInt(settings.cutoffMin);

    if (settings.cutoffAmPm === 'PM' && hour !== 12) hour += 12;
    if (settings.cutoffAmPm === 'AM' && hour === 12) hour = 0;

    const cutoff = new Date();
    cutoff.setHours(hour, min, 0);

    return now > cutoff;
  };
  // ─── Display Strings ───────────────────────────────────────────────────────
  const cutoffDisplay = `${settings.cutoffHour}:${settings.cutoffMin} ${settings.cutoffAmPm}`;
  const deliveryDisplay = `${settings.deliveryStartHour}:${settings.deliveryStartMin} ${settings.deliveryStartAmPm} – ${settings.deliveryEndHour}:${settings.deliveryEndMin} ${settings.deliveryEndAmPm}`;
  const graceDisplay = `${settings.gracePeriod} negative balance`;

  // ─── Reusable Row ──────────────────────────────────────────────────────────
  const SettingRow = ({
    icon, iconBg, iconColor, label, value, onPress,
  }: {
    icon: any; iconBg: string; iconColor: string;
    label: string; value: string; onPress: () => void;
  }) => (
    <TouchableOpacity style={styles.settingRow} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.settingIconBox, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={17} color={iconColor} />
      </View>
      <View style={styles.settingInfo}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.settingValue}>{value}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#8B6854" />
    </TouchableOpacity>
  );

  // ─── Picker Row (inline horizontal scroll) ─────────────────────────────────
  const PickerRow = ({
    label, options, selected, onSelect,
  }: {
    label: string; options: string[]; selected: string; onSelect: (v: string) => void;
  }) => (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
        {options.map(opt => (
          <TouchableOpacity
            key={opt}
            style={[styles.chip, selected === opt && styles.chipActive]}
            onPress={() => onSelect(opt)}
          >
            <Text style={[styles.chipText, selected === opt && styles.chipTextActive]}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  // ─── Modal Shell ──────────────────────────────────────────────────────────
  const SettingModal = ({ visible, title, onClose, onSave, children }: {
    visible: boolean; title: string;
    onClose: () => void; onSave: () => void;
    children: React.ReactNode;
  }) => (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modalSheet} onPress={() => { }}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose}>
              <Ionicons name="close" size={18} color="#BB6B3F" />
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            {children}
            <TouchableOpacity style={styles.saveBtn} onPress={onSave}>
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
        </View>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Ionicons name="shield-checkmark" size={28} color="#fff" />
            </View>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
          </View>
          <View style={styles.adminBadge}>
            <Ionicons name="shield-checkmark" size={11} color="#fff" />
            <Text style={styles.adminBadgeText}>Administrator</Text>
          </View>
        </View>

        {/* System Configuration */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System Configuration</Text>
          <View style={styles.card}>
            <SettingRow
              icon="time-outline" iconBg="#FFF8E8" iconColor="#FFBF55"
              label="Order Cut-off Time" value={cutoffDisplay}
              onPress={() => openModal('cutoff')}
            />
            <View style={styles.rowDivider} />
            <SettingRow
              icon="bicycle-outline" iconBg="#FFF3E8" iconColor="#FF9675"
              label="Delivery Window" value={deliveryDisplay}
              onPress={() => openModal('delivery')}
            />
            <View style={styles.rowDivider} />
            <SettingRow
              icon="wallet-outline" iconBg="#F5EDE8" iconColor="#BB6B3F"
              label="Grace Period" value={graceDisplay}
              onPress={() => openModal('grace')}
            />
          </View>
        </View>

        {/* Business Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Business Information</Text>
          <View style={styles.card}>
            <SettingRow
              icon="storefront-outline" iconBg="#FFF0E8" iconColor="#8B6854"
              label="Business Name" value={settings.businessName}
              onPress={() => openModal('business')}
            />
            <View style={styles.rowDivider} />
            <SettingRow
              icon="call-outline" iconBg="#FFF8E8" iconColor="#8B6854"
              label="Support Contact" value={settings.supportContact}
              onPress={() => openModal('contact')}
            />
          </View>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={19} color="#BB6B3F" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* ── Modal: Order Cut-off Time ──────────────────────────────────── */}
      <SettingModal
        visible={activeModal === 'cutoff'}
        title="Order Cut-off Time"
        onClose={closeModal} onSave={saveModal}
      >
        <Text style={styles.fieldLabel}>Hour</Text>
        <PickerRow
          label="" options={HOURS_12}
          selected={draft.cutoffHour}
          onSelect={v => setDraft(d => ({ ...d, cutoffHour: v }))}
        />
        <PickerRow
          label="Minute" options={MINUTES}
          selected={draft.cutoffMin}
          onSelect={v => setDraft(d => ({ ...d, cutoffMin: v }))}
        />
        <PickerRow
          label="AM / PM" options={['AM', 'PM']}
          selected={draft.cutoffAmPm}
          onSelect={v => setDraft(d => ({ ...d, cutoffAmPm: v as 'AM' | 'PM' }))}
        />
      </SettingModal>

      {/* ── Modal: Delivery Window ─────────────────────────────────────── */}
      <SettingModal
        visible={activeModal === 'delivery'}
        title="Delivery Window"
        onClose={closeModal} onSave={saveModal}
      >
        <Text style={styles.subHeading}>Start Time</Text>
        <PickerRow label="Hour" options={HOURS_12}
          selected={draft.deliveryStartHour}
          onSelect={v => setDraft(d => ({ ...d, deliveryStartHour: v }))} />
        <PickerRow label="Minute" options={MINUTES}
          selected={draft.deliveryStartMin}
          onSelect={v => setDraft(d => ({ ...d, deliveryStartMin: v }))} />
        <PickerRow label="AM / PM" options={['AM', 'PM']}
          selected={draft.deliveryStartAmPm}
          onSelect={v => setDraft(d => ({ ...d, deliveryStartAmPm: v as 'AM' | 'PM' }))} />

        <View style={styles.windowSeparator} />

        <Text style={styles.subHeading}>End Time</Text>
        <PickerRow label="Hour" options={HOURS_12}
          selected={draft.deliveryEndHour}
          onSelect={v => setDraft(d => ({ ...d, deliveryEndHour: v }))} />
        <PickerRow label="Minute" options={MINUTES}
          selected={draft.deliveryEndMin}
          onSelect={v => setDraft(d => ({ ...d, deliveryEndMin: v }))} />
        <PickerRow label="AM / PM" options={['AM', 'PM']}
          selected={draft.deliveryEndAmPm}
          onSelect={v => setDraft(d => ({ ...d, deliveryEndAmPm: v as 'AM' | 'PM' }))} />
      </SettingModal>

      {/* ── Modal: Grace Period ────────────────────────────────────────── */}
      <SettingModal
        visible={activeModal === 'grace'}
        title="Grace Period"
        onClose={closeModal} onSave={saveModal}
      >
        <Text style={styles.fieldLabel}>Allowed Negative Balance Duration</Text>
        <View style={styles.graceGrid}>
          {GRACE_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt}
              style={[styles.chip, draft.gracePeriod === opt && styles.chipActive]}
              onPress={() => setDraft(d => ({ ...d, gracePeriod: opt }))}
            >
              <Text style={[styles.chipText, draft.gracePeriod === opt && styles.chipTextActive]}>
                {opt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </SettingModal>

      {/* ── Modal: Business Name ───────────────────────────────────────── */}
      <SettingModal
        visible={activeModal === 'business'}
        title="Business Name"
        onClose={closeModal} onSave={saveModal}
      >
        <Text style={styles.fieldLabel}>Business Name</Text>
        <TextInput
          style={styles.textInput}
          value={draft.businessName}
          onChangeText={v => setDraft(d => ({ ...d, businessName: v }))}
          placeholder="Enter business name"
          placeholderTextColor="#C4A99A"
          autoFocus
        />
      </SettingModal>

      {/* ── Modal: Support Contact ─────────────────────────────────────── */}
      <SettingModal
        visible={activeModal === 'contact'}
        title="Support Contact"
        onClose={closeModal} onSave={saveModal}
      >
        <Text style={styles.fieldLabel}>Phone Number</Text>
        <TextInput
          style={styles.textInput}
          value={draft.supportContact}
          onChangeText={v => setDraft(d => ({ ...d, supportContact: v }))}
          placeholder="+91 XXXXXXXXXX"
          placeholderTextColor="#C4A99A"
          keyboardType="phone-pad"
          autoFocus
        />
      </SettingModal>

    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F4' },
  header: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8 },
  title: { fontSize: 26, fontWeight: '800', color: '#1A1A1A', letterSpacing: -0.5 },

  profileCard: {
    backgroundColor: '#FF9675', marginHorizontal: 20, borderRadius: 22,
    padding: 22, marginBottom: 22, alignItems: 'center',
    shadowColor: '#BB6B3F', shadowOpacity: 0.3, shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  avatarRing: {
    width: 76, height: 76, borderRadius: 38,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  avatar: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  profileInfo: { alignItems: 'center', marginBottom: 12 },
  profileName: { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  profileEmail: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 3 },
  adminBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
  },
  adminBadgeText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 12, fontWeight: '700', color: '#BB6B3F',
    textTransform: 'uppercase', letterSpacing: 0.8, paddingHorizontal: 20, marginBottom: 10,
  },
  card: {
    backgroundColor: '#fff', marginHorizontal: 20, borderRadius: 18,
    paddingHorizontal: 16, shadowColor: '#BB6B3F',
    shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
  settingIconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  settingInfo: { flex: 1 },
  settingLabel: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  settingValue: { fontSize: 12, color: '#8B6854', marginTop: 2, fontWeight: '500' },
  rowDivider: { height: 1, backgroundColor: '#FFF0E8', marginLeft: 48 },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginHorizontal: 20, marginTop: 8, padding: 16,
    backgroundColor: '#F5EDE8', borderRadius: 16, gap: 8,
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#BB6B3F' },

  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingBottom: 34,
  },
  modalHandle: {
    width: 36, height: 4, backgroundColor: '#E0D5CF',
    borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#FFF0E8',
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  modalCloseBtn: {
    backgroundColor: '#F5EDE8', width: 32, height: 32,
    borderRadius: 16, justifyContent: 'center', alignItems: 'center',
  },
  modalBody: { padding: 20 },

  fieldLabel: {
    fontSize: 11, fontWeight: '700', color: '#BB6B3F',
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10,
  },
  subHeading: {
    fontSize: 13, fontWeight: '700', color: '#1A1A1A', marginBottom: 10, marginTop: 4,
  },
  chip: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5, borderColor: '#F5EDE8',
    backgroundColor: '#FFF8F4', marginRight: 8, marginBottom: 8,
  },
  chipActive: { backgroundColor: '#FF9675', borderColor: '#FF9675' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#8B6854' },
  chipTextActive: { color: '#fff' },
  graceGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 },

  textInput: {
    borderWidth: 1.5, borderColor: '#F5EDE8', borderRadius: 14,
    padding: 14, fontSize: 15, fontWeight: '600', color: '#1A1A1A',
    backgroundColor: '#FFF8F4', marginBottom: 4,
  },

  windowSeparator: {
    height: 1, backgroundColor: '#FFF0E8, marginVertical: 16',
  },

  saveBtn: {
    backgroundColor: '#FF9675', borderRadius: 14, padding: 15,
    alignItems: 'center', marginTop: 8,
  },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});