import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Switch,
  ScrollView,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { api } from "../../../src/services/api";

const SCREEN_HEIGHT = Dimensions.get("window").height;

type Partner = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  zone?: string;
  is_active?: boolean;
  is_verified?: boolean;
};

const EMPTY = {
  name: "",
  email: "",
  phone: "",
  zone: "",
  password: "",
  is_active: true,
};

export default function DeliveryPartnersScreen() {
  const router = useRouter();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Partner | null>(null);
  const [form, setForm] = useState(EMPTY);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getAdminDeliveryPartners();
      setPartners(Array.isArray(data) ? data : []);
    } catch (err: any) {
      Alert.alert(
        "Delivery Partners",
        err?.message || "Failed to load delivery partners.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const active = partners.filter((p) => p.is_active !== false).length;
    return { total: partners.length, active };
  }, [partners]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setModalVisible(true);
  };

  const openEdit = (partner: Partner) => {
    setEditing(partner);
    setForm({
      name: partner.name || "",
      email: partner.email || "",
      phone: partner.phone || "",
      zone: partner.zone || "",
      password: "",
      is_active: partner.is_active !== false,
    });
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditing(null);
    setForm(EMPTY);
  };

  const save = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      Alert.alert("Missing details", "Name and email are required.");
      return;
    }
    if (!editing && !form.password.trim()) {
      Alert.alert(
        "Password required",
        "Set a password so delivery partner can login.",
      );
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await api.updateDeliveryPartner(editing.id, {
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          zone: form.zone.trim() || undefined,
          password: form.password.trim() || undefined,
          is_active: form.is_active,
          is_verified: true,
        });
      } else {
        await api.createDeliveryPartner({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          zone: form.zone.trim() || undefined,
          password: form.password.trim(),
        });
      }
      closeModal();
      await load();
    } catch (err: any) {
      Alert.alert(
        "Save failed",
        err?.message || "Could not save delivery partner.",
      );
    } finally {
      setSaving(false);
    }
  };

  const remove = (partner: Partner) => {
    Alert.alert(
      "Delete delivery partner?",
      `${partner.name} will be removed from this farm. Active assigned orders must be completed first.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.deleteDeliveryPartner(partner.id);
              await load();
            } catch (err: any) {
              Alert.alert(
                "Delete failed",
                err?.message || "Could not delete delivery partner.",
              );
            }
          },
        },
      ],
    );
  };

  const renderPartner = ({ item }: { item: Partner }) => (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <Ionicons name="bicycle" size={22} color="#8f4f2a" />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.row}>
          <Text style={styles.name} numberOfLines={1}>
            {item.name}
          </Text>
          <View
            style={[styles.badge, item.is_active === false && styles.badgeOff]}
          >
            <Text
              style={[
                styles.badgeText,
                item.is_active === false && styles.badgeTextOff,
              ]}
            >
              {item.is_active === false ? "Inactive" : "Active"}
            </Text>
          </View>
        </View>
        <Text style={styles.meta}>{item.email}</Text>
        {item.phone ? <Text style={styles.meta}>{item.phone}</Text> : null}
        {item.zone ? <Text style={styles.zone}>Zone: {item.zone}</Text> : null}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => openEdit(item)}
          >
            <Ionicons name="create-outline" size={15} color="#3D1F0A" />
            <Text style={styles.actionText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.deleteBtn]}
            onPress={() => remove(item)}
          >
            <Ionicons name="trash-outline" size={15} color="#DC2626" />
            <Text style={[styles.actionText, { color: "#DC2626" }]}>
              Delete
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={18} color="#3D1F0A" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Delivery Partners</Text>
          <Text style={styles.subtitle}>Farm riders for order assignment</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <LinearGradient colors={["#3a2016", "#8f4f2a"]} style={styles.summary}>
        <View>
          <Text style={styles.summaryLabel}>Total Partners</Text>
          <Text style={styles.summaryValue}>{stats.total}</Text>
        </View>
        <View>
          <Text style={styles.summaryLabel}>Active</Text>
          <Text style={styles.summaryValue}>{stats.active}</Text>
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color="#8f4f2a" />
        </View>
      ) : (
        <FlatList
          data={partners}
          keyExtractor={(item) => item.id}
          renderItem={renderPartner}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="bicycle-outline" size={30} color="#A07850" />
              <Text style={styles.emptyText}>
                No delivery partner added yet.
              </Text>
            </View>
          }
        />
      )}

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          {/* Tap outside sheet to dismiss */}
          <TouchableOpacity
            style={styles.overlayTouchable}
            activeOpacity={1}
            onPress={closeModal}
          />

          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>
                {editing ? "Edit Delivery Partner" : "Add Delivery Partner"}
              </Text>
              <TouchableOpacity onPress={closeModal} style={styles.closeBtn}>
                <Ionicons name="close" size={18} color="#3D1F0A" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.scrollArea}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Input
                label="Name"
                value={form.name}
                onChangeText={(name) => setForm((f) => ({ ...f, name }))}
                placeholder="e.g. Rahul Kumar"
              />
              <Input
                label="Email"
                value={form.email}
                onChangeText={(email) => setForm((f) => ({ ...f, email }))}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="e.g. rahul@example.com"
              />
              <Input
                label="Phone"
                value={form.phone}
                onChangeText={(phone) => setForm((f) => ({ ...f, phone }))}
                keyboardType="phone-pad"
                placeholder="e.g. 9876543210"
              />
              <Input
                label="Zone"
                value={form.zone}
                onChangeText={(zone) => setForm((f) => ({ ...f, zone }))}
                placeholder="e.g. North Patna"
              />
              <Input
                label={editing ? "New Password (optional)" : "Password"}
                value={form.password}
                onChangeText={(password) =>
                  setForm((f) => ({ ...f, password }))
                }
                secureTextEntry
                placeholder={
                  editing
                    ? "Leave blank to keep current"
                    : "Set a login password"
                }
              />

              {editing && (
                <View style={styles.switchRow}>
                  <Text style={styles.switchText}>Active account</Text>
                  <Switch
                    value={form.is_active}
                    onValueChange={(is_active) =>
                      setForm((f) => ({ ...f, is_active }))
                    }
                    trackColor={{ false: "#E5D6C8", true: "#f7b267" }}
                    thumbColor={form.is_active ? "#8f4f2a" : "#fff"}
                  />
                </View>
              )}

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={save}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveText}>
                    {editing ? "Save Changes" : "Create Partner"}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function Input(
  props: React.ComponentProps<typeof TextInput> & { label: string },
) {
  const { label, ...inputProps } = props;
  return (
    <View style={styles.inputWrap}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        {...inputProps}
        style={styles.input}
        placeholderTextColor="#B8997A"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF8EF" },
  header: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#F1E3D0",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 24, fontWeight: "900", color: "#3D1F0A" },
  subtitle: { marginTop: 2, fontSize: 12, color: "#A07850", fontWeight: "600" },
  addBtn: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: "#8f4f2a",
    alignItems: "center",
    justifyContent: "center",
  },
  summary: {
    marginHorizontal: 16,
    borderRadius: 22,
    padding: 18,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summaryLabel: {
    color: "#f7d6bd",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  summaryValue: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "900",
    marginTop: 3,
  },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: 16, paddingBottom: 28 },
  card: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F1E3D0",
    padding: 14,
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#FFF3E6",
    alignItems: "center",
    justifyContent: "center",
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { flex: 1, fontSize: 16, fontWeight: "900", color: "#3D1F0A" },
  meta: { marginTop: 3, color: "#8B6854", fontSize: 12, fontWeight: "600" },
  zone: {
    marginTop: 6,
    alignSelf: "flex-start",
    backgroundColor: "#FFF3E6",
    color: "#8f4f2a",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: "800",
  },
  badge: {
    backgroundColor: "#ECFDF3",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeOff: { backgroundColor: "#FEF2F2" },
  badgeText: { color: "#16A34A", fontSize: 10, fontWeight: "900" },
  badgeTextOff: { color: "#DC2626" },
  actions: { flexDirection: "row", gap: 8, marginTop: 12 },
  actionBtn: {
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
    backgroundColor: "#FFF8EF",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#F1E3D0",
  },
  deleteBtn: { backgroundColor: "#FEF2F2", borderColor: "#FECACA" },
  actionText: { color: "#3D1F0A", fontSize: 12, fontWeight: "800" },
  empty: { alignItems: "center", paddingTop: 70 },
  emptyText: { marginTop: 8, color: "#A07850", fontWeight: "700" },

  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(61,31,10,0.35)",
  },
  overlayTouchable: { ...StyleSheet.absoluteFillObject },
  sheet: {
    backgroundColor: "#FFF8EF",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 18,
    paddingTop: 10,
    borderWidth: 1,
    borderColor: "#F1E3D0",
    maxHeight: SCREEN_HEIGHT * 0.85,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E9D8C4",
    marginBottom: 10,
  },
  sheetHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#3D1F0A",
    flex: 1,
    marginRight: 10,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },

  scrollArea: { flexGrow: 0 },
  scrollContent: { paddingBottom: 24 },

  inputWrap: { marginBottom: 10 },
  inputLabel: {
    marginBottom: 5,
    color: "#8B6854",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  input: {
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E9D8C4",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    color: "#3D1F0A",
    fontWeight: "700",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E9D8C4",
    marginBottom: 12,
  },
  switchText: { color: "#3D1F0A", fontWeight: "800" },
  saveBtn: {
    marginTop: 4,
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: "#8f4f2a",
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: { color: "#fff", fontSize: 15, fontWeight: "900" },
});
