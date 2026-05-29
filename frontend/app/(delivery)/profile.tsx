import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput, ActivityIndicator, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../src/contexts/AuthContext';
import { Colors } from '../../src/constants/colors';
import { api } from '../../src/services/api';

type BankForm = {
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  upiId: string;
};

export default function DeliveryProfileScreen() {
  const { user, logout, updateUser } = useAuth();
  const router = useRouter();
  const [deleteModal, setDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');
  const [editZone, setEditZone] = useState(user?.zone || '');
  const [editImage, setEditImage] = useState((user as any)?.profile_image || (user as any)?.avatar_url || '');
  const [bankModal, setBankModal] = useState(false);
  const [savingBank, setSavingBank] = useState(false);
  const [bankForm, setBankForm] = useState<BankForm>({
    accountHolderName: '',
    accountNumber: '',
    ifscCode: '',
    bankName: '',
    upiId: '',
  });

  const profileImage = editImage || (user as any)?.profile_image || (user as any)?.avatar_url || '';

  React.useEffect(() => {
    api.getBankAccount()
      .then((data: any) => {
        setBankForm({
          accountHolderName: data?.accountHolderName || '',
          accountNumber: data?.accountNumber || '',
          ifscCode: data?.ifscCode || '',
          bankName: data?.bankName || '',
          upiId: data?.upiId || '',
        });
      })
      .catch(() => {});
  }, []);

  const openEditProfile = () => {
    setEditName(user?.name || '');
    setEditPhone(user?.phone || '');
    setEditZone(user?.zone || '');
    setEditImage((user as any)?.profile_image || (user as any)?.avatar_url || '');
    setEditModal(true);
  };

  const pickProfileImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Please allow photo library access to choose your profile photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (asset?.base64) {
      setEditImage(`data:image/jpeg;base64,${asset.base64}`);
    }
  };

  const saveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Name Required', 'Please enter your name.');
      return;
    }
    setSavingProfile(true);
    try {
      const payload = {
        name: editName.trim(),
        phone: editPhone.trim(),
        zone: editZone.trim(),
        profile_image: editImage || undefined,
      };
      await api.updateProfile(payload);
      updateUser(payload as any);
      setEditModal(false);
      Alert.alert('Profile Updated', 'Your profile details have been saved.');
    } catch (error: any) {
      Alert.alert('Update Failed', error?.message || 'Could not update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const updateBankField = (key: keyof BankForm, value: string) => {
    setBankForm((prev) => ({ ...prev, [key]: key === 'ifscCode' ? value.toUpperCase() : value }));
  };

  const saveBankDetails = async () => {
    if (!bankForm.accountHolderName.trim() || !bankForm.accountNumber.trim() || !bankForm.ifscCode.trim() || !bankForm.bankName.trim()) {
      Alert.alert('Missing Details', 'Please fill account holder name, account number, IFSC code, and bank name.');
      return;
    }
    setSavingBank(true);
    try {
      await api.saveBankAccount({
        accountHolderName: bankForm.accountHolderName.trim(),
        accountNumber: bankForm.accountNumber.trim(),
        ifscCode: bankForm.ifscCode.trim().toUpperCase(),
        bankName: bankForm.bankName.trim(),
        upiId: bankForm.upiId.trim() || undefined,
      });
      setBankModal(false);
      Alert.alert('Bank Details Saved', 'Your bank and UPI details have been saved.');
    } catch (error: any) {
      Alert.alert('Save Failed', error?.message || 'Could not save bank details.');
    } finally {
      setSavingBank(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout', style: 'destructive',
        onPress: async () => { await logout(); router.replace('/'); },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    setDeletePassword('');
    setDeleteModal(true);
  };

  const confirmDeleteAccount = () => {
    if (!deletePassword.trim()) {
      Alert.alert('Password Required', 'Enter your password to delete your account.');
      return;
    }
    Alert.alert(
      'Delete Account',
      'This will permanently delete your Gau Satva account and remove your personal profile data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            setDeletingAccount(true);
            try {
              await api.deleteAccount(deletePassword);
              setDeleteModal(false);
              router.replace('/(auth)/login');
            } catch (error: any) {
              Alert.alert('Delete Failed', error?.message || 'Could not delete account. Please try again.');
            } finally {
              setDeletingAccount(false);
            }
          },
        },
      ],
    );
  };

  const HelpRow = ({ icon, iconBg, iconColor, label, onPress }: {
    icon: any; iconBg: string; iconColor: string; label: string; onPress: () => void;
  }) => (
    <TouchableOpacity style={styles.helpRow} onPress={onPress} activeOpacity={0.78}>
      <View style={[styles.helpIconBox, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={16} color={iconColor} />
      </View>
      <Text style={styles.helpLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={15} color="#ddd" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>

        <View style={styles.heroCard}>
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.avatarImage} />
              ) : (
                <Ionicons name="bicycle" size={30} color="#fff" />
              )}
            </View>
          </View>

          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>

          <View style={styles.roleBadge}>
            <Ionicons name="bicycle" size={11} color="#fff" />
            <Text style={styles.roleBadgeText}>Delivery Partner</Text>
          </View>
          <TouchableOpacity style={styles.editProfileBtn} onPress={openEditProfile} activeOpacity={0.82}>
            <Ionicons name="create-outline" size={14} color={Colors.primary} />
            <Text style={styles.editProfileText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.zoneCard}>
          <View style={styles.zoneLeft}>
            <View style={[styles.cardIconBox, { backgroundColor: '#EEF4FF' }]}>
              <Ionicons name="location" size={18} color="#4F7EFF" />
            </View>
            <View>
              <Text style={styles.zoneLabel}>Assigned Zone</Text>
              <Text style={styles.zoneValue}>{user?.zone || 'Not Assigned'}</Text>
            </View>
          </View>
          {!user?.zone && (
            <View style={styles.zonePill}>
              <Text style={styles.zonePillText}>Contact Admin</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <View style={styles.card}>
            <View style={styles.contactRow}>
              <View style={[styles.cardIconBox, { backgroundColor: '#F0FDF4' }]}>
                <Ionicons name="call-outline" size={16} color="#22c55e" />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>Phone</Text>
                <Text style={styles.contactValue}>{user?.phone || 'Not provided'}</Text>
              </View>
            </View>

            <View style={styles.rowDivider} />

            <View style={styles.contactRow}>
              <View style={[styles.cardIconBox, { backgroundColor: '#FFF4E6' }]}>
                <Ionicons name="mail-outline" size={16} color="#f59e0b" />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>Email</Text>
                <Text style={styles.contactValue}>{user?.email}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payments</Text>
          <TouchableOpacity style={styles.bankCard} onPress={() => setBankModal(true)} activeOpacity={0.82}>
            <View style={[styles.cardIconBox, { backgroundColor: '#EEF4FF' }]}>
              <Ionicons name="card-outline" size={18} color="#4F7EFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bankTitle}>Bank Details</Text>
              <Text style={styles.bankSub}>
                {bankForm.bankName
                  ? `${bankForm.bankName} •••• ${bankForm.accountNumber.slice(-4)}`
                  : 'Add account number, IFSC, bank name and UPI ID'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#ddd" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Help & Support</Text>
          <View style={styles.card}>
            <HelpRow
              icon="book-outline"
              iconBg="#EEF4FF"
              iconColor="#4F7EFF"
              label="Delivery Guidelines"
              onPress={() => router.push('/(delivery)/delivery-guidelines' as any)}
            />
            <View style={styles.rowDivider} />
            <HelpRow
              icon="headset-outline"
              iconBg="#F0FDF4"
              iconColor="#22c55e"
              label="Contact Support"
              onPress={() => router.push('/(delivery)/contact-support' as any)}
            />
            <View style={styles.rowDivider} />
            <HelpRow
              icon="help-circle-outline"
              iconBg="#FFF4E6"
              iconColor="#f59e0b"
              label="FAQs"
              onPress={() => router.push('/(delivery)/faqs' as any)}
            />
          </View>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={19} color="#ef4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteAccountBtn} onPress={handleDeleteAccount}>
          <Ionicons name="trash-outline" size={19} color="#dc2626" />
          <Text style={styles.deleteAccountText}>Delete Account</Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>

      <Modal visible={deleteModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.deleteSheet}>
            <View style={styles.deleteIconWrap}>
              <Ionicons name="trash-outline" size={26} color="#dc2626" />
            </View>
            <Text style={styles.deleteTitle}>Delete Account</Text>
            <Text style={styles.deleteHelp}>
              Enter your password to confirm permanent account deletion.
            </Text>
            <TextInput
              style={styles.passwordInput}
              value={deletePassword}
              onChangeText={setDeletePassword}
              placeholder="Password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
            />
            <View style={styles.deleteActions}>
              <TouchableOpacity style={styles.cancelDeleteBtn} onPress={() => setDeleteModal(false)}>
                <Text style={styles.cancelDeleteText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmDeleteBtn} onPress={confirmDeleteAccount} disabled={deletingAccount}>
                {deletingAccount ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.confirmDeleteText}>Continue</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={editModal} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetOverlay}
        >
          <View style={styles.formSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditModal(false)}>
                <Ionicons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.photoPicker} onPress={pickProfileImage} activeOpacity={0.82}>
              <View style={styles.photoPreview}>
                {editImage ? (
                  <Image source={{ uri: editImage }} style={styles.photoPreviewImage} />
                ) : (
                  <Ionicons name="person-outline" size={28} color="#9CA3AF" />
                )}
              </View>
              <Text style={styles.photoPickerText}>Change Profile Photo</Text>
            </TouchableOpacity>

            <Text style={styles.inputLabel}>Name</Text>
            <TextInput style={styles.formInput} value={editName} onChangeText={setEditName} placeholder="Full name" />
            <Text style={styles.inputLabel}>Phone</Text>
            <TextInput style={styles.formInput} value={editPhone} onChangeText={setEditPhone} placeholder="Phone number" keyboardType="phone-pad" />
            <Text style={styles.inputLabel}>Zone</Text>
            <TextInput style={styles.formInput} value={editZone} onChangeText={setEditZone} placeholder="Assigned zone" />

            <TouchableOpacity style={styles.savePrimaryBtn} onPress={saveProfile} disabled={savingProfile}>
              {savingProfile ? <ActivityIndicator color="#fff" /> : <Text style={styles.savePrimaryText}>Save Profile</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={bankModal} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetOverlay}
        >
          <View style={styles.bankSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Bank Details</Text>
              <TouchableOpacity
                style={styles.sheetCloseBtn}
                onPress={() => setBankModal(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                activeOpacity={0.75}
              >
                <Ionicons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Account Holder Name *</Text>
              <TextInput style={styles.formInput} value={bankForm.accountHolderName} onChangeText={(v) => updateBankField('accountHolderName', v)} placeholder="Full name as per bank" />
              <Text style={styles.inputLabel}>Account Number *</Text>
              <TextInput style={styles.formInput} value={bankForm.accountNumber} onChangeText={(v) => updateBankField('accountNumber', v)} placeholder="Account number" keyboardType="numeric" />
              <Text style={styles.inputLabel}>IFSC Code *</Text>
              <TextInput style={styles.formInput} value={bankForm.ifscCode} onChangeText={(v) => updateBankField('ifscCode', v)} placeholder="SBIN0001234" autoCapitalize="characters" />
              <Text style={styles.inputLabel}>Bank Name *</Text>
              <TextInput style={styles.formInput} value={bankForm.bankName} onChangeText={(v) => updateBankField('bankName', v)} placeholder="Bank name" />
              <Text style={styles.inputLabel}>UPI ID</Text>
              <TextInput style={styles.formInput} value={bankForm.upiId} onChangeText={(v) => updateBankField('upiId', v)} placeholder="name@upi" autoCapitalize="none" keyboardType="email-address" />

              <TouchableOpacity style={styles.savePrimaryBtn} onPress={saveBankDetails} disabled={savingBank}>
                {savingBank ? <ActivityIndicator color="#fff" /> : <Text style={styles.savePrimaryText}>Save Bank Details</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F7F4' },

  heroCard: {
    backgroundColor: Colors.primary,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    marginBottom: 14,
  },
  avatarRing: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 14,
  },
  avatar: {
    width: 66, height: 66, borderRadius: 33,
    backgroundColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarImage: { width: '100%', height: '100%' },
  userName: {
    fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: -0.3,
  },
  userEmail: {
    fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 3, marginBottom: 14,
  },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
  },
  roleBadgeText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 12,
  },
  editProfileText: { fontSize: 12, fontWeight: '800', color: Colors.primary },

  zoneCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  zoneLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  zoneLabel: { fontSize: 11, color: '#bbb', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  zoneValue: { fontSize: 16, fontWeight: '800', color: '#1A1A1A', marginTop: 2 },
  zonePill: {
    backgroundColor: '#FFF4E6', paddingHorizontal: 12,
    paddingVertical: 6, borderRadius: 20,
  },
  zonePillText: { fontSize: 11, fontWeight: '700', color: '#f59e0b' },

  section: { marginBottom: 14 },
  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: '#bbb',
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: 8, marginLeft: 20,
  },

  card: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 18,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  cardIconBox: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  rowDivider: { height: 1, backgroundColor: '#F5F5F5', marginLeft: 48 },

  contactRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, paddingVertical: 14,
  },
  contactInfo: { flex: 1 },
  contactLabel: { fontSize: 11, color: '#bbb', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  contactValue: { fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginTop: 2 },
  bankCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  bankTitle: { fontSize: 15, fontWeight: '800', color: '#1A1A1A' },
  bankSub: { fontSize: 12.5, fontWeight: '600', color: '#888', marginTop: 3 },

  helpRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, paddingVertical: 13,
  },
  helpIconBox: {
    width: 34, height: 34, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  helpLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1A1A1A' },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginHorizontal: 20, padding: 16,
    backgroundColor: '#FEF2F2', borderRadius: 16, gap: 8,
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#ef4444' },
  deleteAccountBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginHorizontal: 20, marginTop: 10, padding: 16,
    backgroundColor: '#FFF7F7', borderRadius: 16, gap: 8,
    borderWidth: 1, borderColor: '#FECACA',
  },
  deleteAccountText: { fontSize: 15, fontWeight: '800', color: '#dc2626' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  deleteSheet: {
    width: '100%', backgroundColor: '#fff', borderRadius: 24,
    padding: 22, alignItems: 'center',
  },
  deleteIconWrap: {
    width: 58, height: 58, borderRadius: 20,
    backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  deleteTitle: { fontSize: 21, fontWeight: '900', color: '#111827' },
  deleteHelp: {
    fontSize: 14, color: '#6B7280', textAlign: 'center',
    lineHeight: 20, marginTop: 8, marginBottom: 16,
  },
  passwordInput: {
    width: '100%', borderWidth: 1, borderColor: '#E5E7EB',
    borderRadius: 14, padding: 14, fontSize: 15, color: '#111827',
    marginBottom: 16,
  },
  deleteActions: { flexDirection: 'row', gap: 10, width: '100%' },
  cancelDeleteBtn: {
    flex: 1, height: 48, borderRadius: 14, backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },
  cancelDeleteText: { fontSize: 15, fontWeight: '800', color: '#111827' },
  confirmDeleteBtn: {
    flex: 1, height: 48, borderRadius: 14, backgroundColor: '#dc2626',
    alignItems: 'center', justifyContent: 'center',
  },
  confirmDeleteText: { fontSize: 15, fontWeight: '900', color: '#fff' },
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  formSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 22,
    paddingBottom: 34,
  },
  bankSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 34,
    maxHeight: '88%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    minHeight: 48,
  },
  sheetCloseBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: { fontSize: 21, fontWeight: '900', color: '#111827' },
  photoPicker: { alignItems: 'center', marginBottom: 18 },
  photoPreview: {
    width: 84,
    height: 84,
    borderRadius: 28,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 8,
  },
  photoPreviewImage: { width: '100%', height: '100%' },
  photoPickerText: { fontSize: 13, fontWeight: '800', color: Colors.primary },
  inputLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6B7280',
    marginBottom: 7,
    marginTop: 6,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: '#111827',
    marginBottom: 10,
  },
  savePrimaryBtn: {
    height: 52,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  savePrimaryText: { fontSize: 16, fontWeight: '900', color: '#fff' },
});
