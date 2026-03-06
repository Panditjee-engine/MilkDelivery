import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  StatusBar,
  Platform,
  Animated,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { api } from "../../../src/services/api";

interface Worker {
  id: string;
  name: string;
  email: string;
  phone?: string;
  designation?: string;
  farm_name?: string;
  is_active: boolean;
  is_verified: boolean;
  admin_id?: string;
}

const DESIGNATIONS = [
  "Farm Manager",
  "Milking Operator",
  "Feed Supervisor",
  "Veterinary Assistant",
  "General Worker",
];

const AVATAR_COLORS = [
  ["#1a472a", "#2d6a4f"],
  ["#1c2b3a", "#4b75a5"],
  ["#2d1b33", "#6a0572"],
  ["#1a1a2e", "#16213e"],
  ["#2b1b17", "#6b3c2e"],
  ["#1b4332", "#40916c"],
];

function WorkerCard({
  item,
  index,
  onPress,
}: {
  item: Worker;
  index: number;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(24)).current;
  const colorPair = AVATAR_COLORS[index % AVATAR_COLORS.length];
  const initials = item.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 350,
        delay: index * 60,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        delay: index * 60,
        tension: 70,
        friction: 11,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }, { scale }] }}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        onPressIn={() =>
          Animated.spring(scale, {
            toValue: 0.97,
            useNativeDriver: true,
            speed: 50,
            bounciness: 2,
          }).start()
        }
        onPressOut={() =>
          Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
            speed: 30,
            bounciness: 4,
          }).start()
        }
      >
        <View style={styles.card}>

          <LinearGradient
            colors={colorPair as any}
            style={styles.avatar}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.avatarText}>{initials}</Text>
          </LinearGradient>

          <View style={styles.cardInfo}>
            <Text style={styles.workerName}>{item.name}</Text>
            <Text style={styles.workerEmail} numberOfLines={1}>
              {item.email}
            </Text>
            <View style={styles.cardTags}>
              {item.designation ? (
                <View style={styles.tag}>
                  <Text style={styles.tagText}>{item.designation}</Text>
                </View>
              ) : null}
              {item.phone ? (
                <View style={[styles.tag, styles.tagPhone]}>
                  <Ionicons name="call-outline" size={10} color="#5b8db8" />
                  <Text style={[styles.tagText, { color: "#5b8db8" }]}>
                    {item.phone}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.cardRight}>
            <View
              style={[
                styles.statusPill,
                {
                  backgroundColor: item.is_active ? "#dcfce7" : "#fee2e2",
                },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: item.is_active ? "#16a34a" : "#dc2626" },
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: item.is_active ? "#16a34a" : "#dc2626" },
                ]}
              >
                {item.is_active ? "Active" : "Inactive"}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={16}
              color="#ccc"
              style={{ marginTop: 8 }}
            />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function WorkersScreen() {
  const router = useRouter();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    designation: "",
    farm_name: "",
  });

  const fetchWorkers = async () => {
    try {
      setLoading(true);
      const data = await api.getAdminWorkers();
      setWorkers(data);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to load workers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkers();
  }, []);

  const handleCreate = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      Alert.alert("Required", "Name, email and password are required");
      return;
    }
    try {
      setCreating(true);
      await api.createWorker({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim() || undefined,
        designation: form.designation.trim() || undefined,
        farm_name: form.farm_name.trim() || undefined,
      });
      setModalVisible(false);
      setForm({
        name: "",
        email: "",
        phone: "",
        password: "",
        designation: "",
        farm_name: "",
      });
      fetchWorkers();
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to create worker");
    } finally {
      setCreating(false);
    }
  };

  const totalActive = workers.filter((w) => w.is_active).length;

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={["#112240", "#0a1a30"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#7ca9d4" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Farm Workers</Text>
          <Text style={styles.headerSub}>
            {workers.length} total · {totalActive} active
          </Text>
        </View>

        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setModalVisible(true)}
        >
          <LinearGradient
            colors={["#2d6a4f", "#1b4332"]}
            style={styles.addBtnGradient}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>

      {!loading && workers.length > 0 && (
        <View style={styles.statsBar}>
          <View style={styles.statChip}>
            <Ionicons name="people" size={13} color="#2d6a4f" />
            <Text style={styles.statChipText}>{workers.length} Workers</Text>
          </View>
          <View style={[styles.statChip, { backgroundColor: "#dcfce7" }]}>
            <View style={[styles.statusDot, { backgroundColor: "#16a34a" }]} />
            <Text style={[styles.statChipText, { color: "#16a34a" }]}>
              {totalActive} Active
            </Text>
          </View>
          <View style={[styles.statChip, { backgroundColor: "#fee2e2" }]}>
            <View style={[styles.statusDot, { backgroundColor: "#dc2626" }]} />
            <Text style={[styles.statChipText, { color: "#dc2626" }]}>
              {workers.length - totalActive} Inactive
            </Text>
          </View>
        </View>
      )}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2d6a4f" />
          <Text style={styles.loadingText}>Loading workers...</Text>
        </View>
      ) : workers.length === 0 ? (
        <View style={styles.centered}>
          <LinearGradient
            colors={["#1b4332", "#2d6a4f"]}
            style={styles.emptyIcon}
          >
            <Ionicons name="people-outline" size={36} color="#74c69d" />
          </LinearGradient>
          <Text style={styles.emptyTitle}>No Workers Yet</Text>
          <Text style={styles.emptySubtitle}>
            Add your first farm worker to get started
          </Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.emptyBtnText}>+ Add Worker</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={workers}
          keyExtractor={(w) => w.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <WorkerCard
              item={item}
              index={index}
              onPress={() =>
                Alert.alert(
                  item.name,
                  `Email: ${item.email}\nPhone: ${item.phone || "—"}\nDesignation: ${item.designation || "—"}\nStatus: ${item.is_active ? "Active" : "Inactive"}`,
                )
              }
            />
          )}
          ListFooterComponent={<View style={{ height: 100 }} />}
        />
      )}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <View style={styles.modalHandle} />

              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Add New Worker</Text>
                  <Text style={styles.modalSub}>
                    Worker will be bound to your farm
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={() => setModalVisible(false)}
                >
                  <Ionicons name="close" size={20} color="#666" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>

                <Text style={styles.sectionLabel}>REQUIRED</Text>

                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="person-outline"
                    size={16}
                    color="#999"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Full Name"
                    placeholderTextColor="#bbb"
                    value={form.name}
                    onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="mail-outline"
                    size={16}
                    color="#999"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor="#bbb"
                    value={form.email}
                    onChangeText={(v) => setForm((f) => ({ ...f, email: v }))}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={16}
                    color="#999"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor="#bbb"
                    value={form.password}
                    onChangeText={(v) =>
                      setForm((f) => ({ ...f, password: v }))
                    }
                    secureTextEntry
                  />
                </View>

                <Text style={[styles.sectionLabel, { marginTop: 16 }]}>
                  OPTIONAL
                </Text>

                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="call-outline"
                    size={16}
                    color="#999"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Phone Number"
                    placeholderTextColor="#bbb"
                    value={form.phone}
                    onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))}
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="briefcase-outline"
                    size={16}
                    color="#999"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Designation (e.g. Milking Operator)"
                    placeholderTextColor="#bbb"
                    value={form.designation}
                    onChangeText={(v) =>
                      setForm((f) => ({ ...f, designation: v }))
                    }
                  />
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginBottom: 16 }}
                >
                  {DESIGNATIONS.map((d) => (
                    <TouchableOpacity
                      key={d}
                      style={[
                        styles.designationChip,
                        form.designation === d && styles.designationChipActive,
                      ]}
                      onPress={() =>
                        setForm((f) => ({
                          ...f,
                          designation: f.designation === d ? "" : d,
                        }))
                      }
                    >
                      <Text
                        style={[
                          styles.designationChipText,
                          form.designation === d &&
                            styles.designationChipTextActive,
                        ]}
                      >
                        {d}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <TouchableOpacity
                  style={[styles.createBtn, creating && { opacity: 0.65 }]}
                  onPress={handleCreate}
                  disabled={creating}
                >
                  <LinearGradient
                    colors={["#2d6a4f", "#1b4332"]}
                    style={styles.createBtnGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {creating ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="person-add" size={18} color="#fff" />
                        <Text style={styles.createBtnText}>Create Worker</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <View style={{ height: 30 }} />
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const IS_IOS = Platform.OS === "ios";
const STATUS_BAR_HEIGHT = IS_IOS ? 0 : (StatusBar.currentHeight ?? 0);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F0F4F8" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: IS_IOS ? 56 : STATUS_BAR_HEIGHT + 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#0d2137",
    borderWidth: 1,
    borderColor: "#1e3a5f",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: { flex: 1 },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#e8f4f8",
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 12,
    color: "#5b8db8",
    marginTop: 2,
    fontWeight: "500",
  },
  addBtn: { borderRadius: 14, overflow: "hidden" },
  addBtnGradient: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
  },

  statsBar: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  statChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#f0fdf4",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2d6a4f",
  },

  list: { padding: 16, gap: 10 },

  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
    gap: 12,
    marginBottom: 10,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 17,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.3,
  },
  cardInfo: { flex: 1, gap: 3 },
  workerName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1a1a1a",
    letterSpacing: -0.2,
  },
  workerEmail: { fontSize: 12, color: "#888", fontWeight: "500" },
  cardTags: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 4 },
  tag: {
    backgroundColor: "#f0fdf4",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagPhone: {
    backgroundColor: "#eff6ff",
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
  },
  tagText: { fontSize: 11, color: "#2d6a4f", fontWeight: "600" },
  cardRight: { alignItems: "flex-end" },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: "700" },

  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  loadingText: { fontSize: 14, color: "#999", marginTop: 8 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 20, fontWeight: "800", color: "#1a1a1a" },
  emptySubtitle: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    lineHeight: 20,
  },
  emptyBtn: {
    backgroundColor: "#2d6a4f",
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 8,
  },
  emptyBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "#00000070",
    justifyContent: "flex-end",
  },
  modalBox: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: "90%",
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: "#e0e0e0",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#1a1a1a" },
  modalSub: { fontSize: 13, color: "#999", marginTop: 3 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#bbb",
    letterSpacing: 1,
    marginBottom: 10,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#eee",
    borderRadius: 14,
    paddingHorizontal: 12,
    backgroundColor: "#fafafa",
    marginBottom: 10,
  },
  inputIcon: { marginRight: 8 },
  input: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 15,
    color: "#1a1a1a",
  },
  designationChip: {
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginRight: 8,
    backgroundColor: "#fafafa",
  },
  designationChipActive: {
    borderColor: "#2d6a4f",
    backgroundColor: "#f0fdf4",
  },
  designationChipText: { fontSize: 12, fontWeight: "600", color: "#888" },
  designationChipTextActive: { color: "#2d6a4f" },
  createBtn: { borderRadius: 16, overflow: "hidden", marginTop: 8 },
  createBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  createBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
