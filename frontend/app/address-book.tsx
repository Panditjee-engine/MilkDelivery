import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../src/contexts/AuthContext";
import { api } from "../src/services/api";
import { Colors } from "../src/constants/colors";
import Button from "../src/components/Button";
import Input from "../src/components/Input";
import {
  formatDeliveryAddress,
  hasCompleteDeliveryAddress,
} from "../src/utils/address";

const emptyAddress = () => ({
  id: `addr_${Date.now()}`,
  label: "home",
  is_default: true,
  full_address: "",
  area: "",
  city: "",
  pincode: "",
});

const normalizeAddressBook = (user: any) => {
  const addresses = Array.isArray(user?.addresses) ? user.addresses : [];
  const withIds = addresses.map((address: any, index: number) => ({
    id: address.id || `addr_${index}_${Date.now()}`,
    is_default: false,
    ...address,
  }));

  if (!withIds.length && user?.address) {
    withIds.push({
      id: user.address.id || "addr_default",
      label: user.address.label || "home",
      is_default: true,
      ...user.address,
    });
  }

  if (withIds.length && !withIds.some((address: any) => address.is_default)) {
    withIds[0].is_default = true;
  }

  return withIds;
};

export default function CustomerAddressesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ addressRequired?: string; returnTo?: string }>();
  const { user, updateUser } = useAuth();
  const [addressBook, setAddressBook] = useState<any[]>(() => normalizeAddressBook(user));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(() => emptyAddress());
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const next = normalizeAddressBook(user);
    setAddressBook(next);
    if (!next.length || params.addressRequired === "1") {
      setEditingId(null);
      setForm({ ...emptyAddress(), is_default: next.length === 0 });
      setFormOpen(true);
    }
  }, [user?.address, (user as any)?.addresses, params.addressRequired]);

  const defaultAddress = useMemo(
    () => addressBook.find((item) => item.is_default) || addressBook[0] || null,
    [addressBook],
  );

  const openNewAddress = () => {
    setEditingId(null);
    setForm({ ...emptyAddress(), is_default: addressBook.length === 0 });
    setFormOpen(true);
  };

  const openEditAddress = (address: any) => {
    setEditingId(address.id);
    setForm({
      ...emptyAddress(),
      ...address,
      full_address: address.full_address || "",
      area: address.area || "",
      city: address.city || "",
      pincode: address.pincode || "",
    });
    setFormOpen(true);
  };

  const persistAddresses = async (nextBook: any[], successMessage: string) => {
    const normalizedBook = nextBook.map((address, index) => ({
      ...address,
      id: address.id || `addr_${index}_${Date.now()}`,
    }));
    if (normalizedBook.length && !normalizedBook.some((address) => address.is_default)) {
      normalizedBook[0].is_default = true;
    }
    const nextDefault =
      normalizedBook.find((address) => address.is_default) || normalizedBook[0] || null;

    setSaving(true);
    try {
      await api.updateProfile({
        address: nextDefault,
        addresses: normalizedBook,
      });
      setAddressBook(normalizedBook);
      updateUser({ address: nextDefault, addresses: normalizedBook } as any);
      Alert.alert("Success", successMessage);
      return true;
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Could not save address. Please try again.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveAddress = async () => {
    const normalizedAddress = {
      id: form.id || `addr_${Date.now()}`,
      label: form.label || "home",
      is_default: form.is_default ?? addressBook.length === 0,
      full_address: String(form.full_address || "").trim(),
      area: String(form.area || "").trim(),
      city: String(form.city || "").trim(),
      pincode: String(form.pincode || "").replace(/\D/g, "").slice(0, 6),
    };

    if (!hasCompleteDeliveryAddress(normalizedAddress)) {
      Alert.alert("Address required", "Please enter Area / Society and City.");
      return;
    }

    const nextBook = editingId
      ? addressBook.map((address) =>
          address.id === editingId ? { ...address, ...normalizedAddress } : address,
        )
      : [...addressBook, normalizedAddress];

    const normalizedBook = nextBook.map((address) => ({
      ...address,
      is_default: normalizedAddress.is_default
        ? address.id === normalizedAddress.id
        : address.is_default,
    }));

    const saved = await persistAddresses(normalizedBook, "Address saved successfully.");
    if (saved) {
      setFormOpen(false);
      if (params.returnTo === "catalog") {
        router.replace("/(customer)/catalog" as any);
      }
    }
  };

  const deleteAddress = (address: any) => {
    Alert.alert("Delete Address", "Remove this saved delivery address?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const remaining = addressBook.filter((item) => item.id !== address.id);
          const saved = await persistAddresses(remaining, "Address removed successfully.");
          if (saved && editingId === address.id) {
            setFormOpen(false);
            setEditingId(null);
          }
        },
      },
    ]);
  };

  const setDefaultAddress = async (address: any) => {
    const nextBook = addressBook.map((item) => ({
      ...item,
      is_default: item.id === address.id,
    }));
    await persistAddresses(nextBook, "Default address updated.");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Delivery Addresses</Text>
          <Text style={styles.subtitle}>Add, edit and choose your default address</Text>
        </View>
        <TouchableOpacity style={styles.addTopBtn} onPress={openNewAddress}>
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {params.addressRequired === "1" && (
          <View style={styles.requiredCard}>
            <Ionicons name="location" size={18} color="#dc2626" />
            <Text style={styles.requiredText}>
              Please add your delivery address before placing an order.
            </Text>
          </View>
        )}

        {defaultAddress && (
          <View style={styles.defaultCard}>
            <View style={styles.defaultIcon}>
              <Ionicons name="navigate-circle" size={22} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.defaultLabel}>Default Address</Text>
              <Text style={styles.defaultText} numberOfLines={2}>
                {formatDeliveryAddress(defaultAddress)}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Saved Addresses</Text>
          <TouchableOpacity style={styles.newInlineBtn} onPress={openNewAddress}>
            <Ionicons name="add-circle-outline" size={16} color={Colors.primary} />
            <Text style={styles.newInlineText}>New Address</Text>
          </TouchableOpacity>
        </View>

        {addressBook.length ? (
          <View style={styles.addressList}>
            {addressBook.map((address) => (
              <View key={address.id} style={styles.addressCard}>
                <View style={styles.addressTop}>
                  <View style={styles.typeBadge}>
                    <Ionicons
                      name={
                        address.label === "work"
                          ? "briefcase-outline"
                          : address.label === "other"
                            ? "location-outline"
                            : "home-outline"
                      }
                      size={14}
                      color={Colors.primary}
                    />
                    <Text style={styles.typeText}>{String(address.label || "home").toUpperCase()}</Text>
                  </View>
                  {address.is_default && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultBadgeText}>Default</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.addressText}>{formatDeliveryAddress(address)}</Text>
                <View style={styles.actions}>
                  {!address.is_default && (
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => setDefaultAddress(address)}
                      disabled={saving}
                    >
                      <Ionicons name="checkmark-circle-outline" size={15} color={Colors.primary} />
                      <Text style={styles.actionText}>Set Default</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.actionBtn} onPress={() => openEditAddress(address)}>
                    <Ionicons name="create-outline" size={15} color="#2563eb" />
                    <Text style={[styles.actionText, { color: "#2563eb" }]}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => deleteAddress(address)}
                    disabled={saving}
                  >
                    <Ionicons name="trash-outline" size={15} color="#dc2626" />
                    <Text style={[styles.actionText, { color: "#dc2626" }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <TouchableOpacity style={styles.emptyCard} onPress={openNewAddress}>
            <Ionicons name="location-outline" size={28} color={Colors.primary} />
            <Text style={styles.emptyTitle}>No address added yet</Text>
            <Text style={styles.emptyText}>Add your delivery address to place orders faster.</Text>
          </TouchableOpacity>
        )}

        {formOpen && (
          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>{editingId ? "Edit Address" : "New Address"}</Text>
              <TouchableOpacity onPress={() => setFormOpen(false)}>
                <Ionicons name="close" size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.typeRow}>
              {[
                { key: "home", label: "Home", icon: "home-outline" },
                { key: "work", label: "Work", icon: "briefcase-outline" },
                { key: "other", label: "Other", icon: "location-outline" },
              ].map((item) => {
                const active = (form.label || "home") === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[styles.typeChip, active && styles.typeChipActive]}
                    onPress={() => setForm({ ...form, label: item.key })}
                  >
                    <Ionicons name={item.icon as any} size={14} color={active ? "#fff" : Colors.primary} />
                    <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Input
              label="Complete Address"
              value={form.full_address || ""}
              onChangeText={(text) => setForm({ ...form, full_address: text })}
              placeholder="House, street, society or nearby area"
            />
            <Input
              label="Area / Society*"
              value={form.area || ""}
              onChangeText={(text) => setForm({ ...form, area: text })}
              placeholder="Society, colony or area"
            />
            <Input
              label="City*"
              value={form.city || ""}
              onChangeText={(text) => setForm({ ...form, city: text })}
              placeholder="City"
            />
            <Input
              label="Pincode"
              value={form.pincode || ""}
              onChangeText={(text) =>
                setForm({ ...form, pincode: text.replace(/\D/g, "").slice(0, 6) })
              }
              placeholder="Optional"
              keyboardType="number-pad"
            />

            <TouchableOpacity
              style={styles.defaultRow}
              onPress={() => setForm({ ...form, is_default: !form.is_default })}
            >
              <View style={[styles.checkBox, form.is_default && styles.checkBoxActive]}>
                {form.is_default && <Ionicons name="checkmark" size={13} color="#fff" />}
              </View>
              <Text style={styles.defaultRowText}>Use as default delivery address</Text>
            </TouchableOpacity>

            <Button
              title={saving ? "Saving..." : editingId ? "Save Address" : "Add Address"}
              onPress={saveAddress}
              loading={saving}
            />
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F6F8" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#EEF0F3",
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 18, fontWeight: "900", color: "#111827" },
  subtitle: { marginTop: 2, fontSize: 12, fontWeight: "600", color: "#6B7280" },
  addTopBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { padding: 16, gap: 14 },
  requiredCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  requiredText: { flex: 1, fontSize: 13, fontWeight: "800", color: "#991B1B" },
  defaultCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E7F2EA",
  },
  defaultIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#EEF8F1",
    alignItems: "center",
    justifyContent: "center",
  },
  defaultLabel: { fontSize: 12, fontWeight: "900", color: Colors.primary },
  defaultText: { marginTop: 3, fontSize: 13, fontWeight: "700", color: "#111827", lineHeight: 18 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: { fontSize: 15, fontWeight: "900", color: "#111827" },
  newInlineBtn: { flexDirection: "row", alignItems: "center", gap: 5 },
  newInlineText: { fontSize: 12, fontWeight: "900", color: Colors.primary },
  addressList: { gap: 12 },
  addressCard: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#EEF0F3",
  },
  addressTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#EEF8F1",
  },
  typeText: { fontSize: 11, fontWeight: "900", color: Colors.primary },
  defaultBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#ECFDF5",
  },
  defaultBadgeText: { fontSize: 10, fontWeight: "900", color: "#047857" },
  addressText: { fontSize: 13, fontWeight: "700", color: "#374151", lineHeight: 19 },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: "#F9FAFB",
  },
  actionText: { fontSize: 12, fontWeight: "900", color: Colors.primary },
  emptyCard: {
    alignItems: "center",
    padding: 24,
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#BFD7C7",
  },
  emptyTitle: { marginTop: 10, fontSize: 15, fontWeight: "900", color: "#111827" },
  emptyText: { marginTop: 4, fontSize: 12, fontWeight: "600", color: "#6B7280", textAlign: "center" },
  formCard: {
    padding: 14,
    borderRadius: 18,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#DDEFE3",
  },
  formHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  formTitle: { fontSize: 16, fontWeight: "900", color: "#111827" },
  typeRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  typeChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#F3F8F5",
    borderWidth: 1,
    borderColor: "#DDEFE3",
  },
  typeChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  typeChipText: { fontSize: 12, fontWeight: "900", color: Colors.primary },
  typeChipTextActive: { color: "#fff" },
  defaultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 12,
  },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  checkBoxActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  defaultRowText: { fontSize: 13, fontWeight: "800", color: "#111827" },
});
