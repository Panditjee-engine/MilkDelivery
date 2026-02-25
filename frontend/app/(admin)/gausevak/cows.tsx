import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Platform,
  FlatList,
  TextInput,
  Animated,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Switch,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

// ─── Types ────────────────────────────────────────────────────────────────────
type CowType = "mature" | "newborn";
type Screen = "home" | "list";

interface Cow {
  id: string;
  tag: string;
  name: string;
  breed: string;
  age: string;
  weight: string;
  status: string;
  milk: string;
  father: string;
  size: string;
  boughtDate?: string;
  bornDate?: string;
  isActive: boolean;
  isSold: boolean;
  type: CowType;
}

interface AddCowForm {
  srNo: string;
  name: string;
  breed: string;
  weight: string;
  size: string;
  father: string;
  boughtDate: string;
  bornDate: string;
  isActive: boolean;
  isSold: boolean;
}

const EMPTY_FORM: AddCowForm = {
  srNo: "",
  name: "",
  breed: "",
  weight: "",
  size: "",
  father: "",
  boughtDate: "",
  bornDate: "",
  isActive: true,
  isSold: false,
};

const SAMPLE_COWS: Cow[] = [
  {
    id: "1",
    tag: "GS-001",
    name: "Kamdhenu",
    breed: "Gir",
    age: "4 yrs",
    weight: "420 kg",
    status: "healthy",
    milk: "18L",
    father: "BULL-001",
    size: "Large",
    boughtDate: "12/01/2021",
    isActive: true,
    isSold: false,
    type: "mature",
  },
  {
    id: "2",
    tag: "GS-002",
    name: "Nandini",
    breed: "Sahiwal",
    age: "3 yrs",
    weight: "385 kg",
    status: "healthy",
    milk: "14L",
    father: "BULL-002",
    size: "Medium",
    boughtDate: "05/03/2022",
    isActive: true,
    isSold: false,
    type: "mature",
  },
  {
    id: "3",
    tag: "GS-003",
    name: "Ganga",
    breed: "Tharparkar",
    age: "5 yrs",
    weight: "460 kg",
    status: "sick",
    milk: "8L",
    father: "BULL-001",
    size: "Large",
    boughtDate: "20/07/2020",
    isActive: true,
    isSold: false,
    type: "mature",
  },
  {
    id: "4",
    tag: "GS-004",
    name: "Chhotu",
    breed: "Rathi",
    age: "Newborn",
    weight: "45 kg",
    status: "healthy",
    milk: "0L",
    father: "BULL-003",
    size: "Small",
    bornDate: "10/11/2024",
    isActive: true,
    isSold: false,
    type: "newborn",
  },
];

const STATUS = {
  healthy: {
    color: "#16a34a",
    bg: "#f0fdf4",
    border: "#bbf7d0",
    label: "Healthy",
  },
  sick: { color: "#dc2626", bg: "#fff1f2", border: "#fecdd3", label: "Sick" },
  pregnant: {
    color: "#7c3aed",
    bg: "#faf5ff",
    border: "#e9d5ff",
    label: "Pregnant",
  },
} as const;

// ─── Field ────────────────────────────────────────────────────────────────────
function Field({
  label,
  value,
  onChange,
  placeholder,
  icon,
  keyboardType,
}: any) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={f.wrap}>
      <Text style={f.label}>{label}</Text>
      <View style={[f.row, focused && f.focused]}>
        <Ionicons
          name={icon}
          size={15}
          color={focused ? "#16a34a" : "#9ca3af"}
          style={{ marginRight: 8 }}
        />
        <TextInput
          style={f.input}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder ?? label}
          placeholderTextColor="#d1d5db"
          keyboardType={keyboardType ?? "default"}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>
    </View>
  );
}

// ─── Toggle ───────────────────────────────────────────────────────────────────
function Toggle({ label, value, onChange, color }: any) {
  return (
    <View style={f.toggleRow}>
      <View>
        <Text style={f.toggleLabel}>{label}</Text>
        <Text style={[f.toggleSub, { color: value ? color : "#9ca3af" }]}>
          {value ? "Yes" : "No"}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: "#f3f4f6", true: color + "44" }}
        thumbColor={value ? color : "#d1d5db"}
      />
    </View>
  );
}

// ─── Add Cow Modal ────────────────────────────────────────────────────────────
function AddCowModal({
  visible,
  onClose,
  onAdd,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (c: Cow) => void;
}) {
  const [step, setStep] = useState<"pick" | "form">("pick");
  const [cowType, setCowType] = useState<CowType>("mature");
  const [form, setForm] = useState<AddCowForm>(EMPTY_FORM);
  const fade = useRef(new Animated.Value(0)).current;

  const setF = (k: keyof AddCowForm) => (v: any) =>
    setForm((p) => ({ ...p, [k]: v }));

  const pickType = (t: CowType) => {
    setCowType(t);
    setStep("form");
    Animated.timing(fade, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  const reset = () => {
    setStep("pick");
    setForm(EMPTY_FORM);
    fade.setValue(0);
    onClose();
  };

  const submit = () => {
    const id = Date.now().toString();
    onAdd({
      id,
      type: cowType,
      tag: `GS-${(form.srNo || id.slice(-3)).padStart(3, "0")}`,
      name: form.name || "Unnamed",
      breed: form.breed || "Unknown",
      age: cowType === "newborn" ? "Newborn" : "Adult",
      weight: form.weight ? `${form.weight} kg` : "—",
      status: form.isSold ? "sick" : form.isActive ? "healthy" : "sick",
      milk: "—",
      father: form.father,
      size: form.size,
      boughtDate: form.boughtDate,
      bornDate: form.bornDate,
      isActive: form.isActive,
      isSold: form.isSold,
    });
    reset();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={reset}
    >
      <View style={m.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ width: "100%" }}
        >
          <View style={m.sheet}>
            <View style={m.handle} />

            {/* Pick Step */}
            {step === "pick" && (
              <View>
                <View style={m.header}>
                  <Text style={m.title}>Add New Cow</Text>
                  <TouchableOpacity onPress={reset} style={m.closeBtn}>
                    <Ionicons name="close" size={18} color="#6b7280" />
                  </TouchableOpacity>
                </View>
                <Text style={m.sub}>Select the type of cow to register</Text>

                <View style={m.typeRow}>
                  {/* Mature */}
                  <TouchableOpacity
                    onPress={() => pickType("mature")}
                    style={m.typeCard}
                  >
                    <View
                      style={[
                        m.typeInner,
                        { backgroundColor: "#f0fdf4", borderColor: "#86efac" },
                      ]}
                    >
                      <Text style={m.typeEmoji}>🐄</Text>
                      <Text style={[m.typeTitle, { color: "#15803d" }]}>
                        Mature Cow
                      </Text>
                      <Text style={m.typeSub}>Purchased / Adult</Text>
                      <View
                        style={[m.typePill, { backgroundColor: "#16a34a" }]}
                      >
                        <Text style={m.typePillText}>SELECT</Text>
                        <Ionicons name="arrow-forward" size={10} color="#fff" />
                      </View>
                    </View>
                  </TouchableOpacity>

                  {/* Newborn */}
                  <TouchableOpacity
                    onPress={() => pickType("newborn")}
                    style={m.typeCard}
                  >
                    <View
                      style={[
                        m.typeInner,
                        { backgroundColor: "#eff6ff", borderColor: "#93c5fd" },
                      ]}
                    >
                      <Text style={m.typeEmoji}>🐮</Text>
                      <Text style={[m.typeTitle, { color: "#1d4ed8" }]}>
                        New Born
                      </Text>
                      <Text style={m.typeSub}>Born on farm</Text>
                      <View
                        style={[m.typePill, { backgroundColor: "#2563eb" }]}
                      >
                        <Text style={m.typePillText}>SELECT</Text>
                        <Ionicons name="arrow-forward" size={10} color="#fff" />
                      </View>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Form Step */}
            {step === "form" && (
              <Animated.View style={{ opacity: fade }}>
                <View style={m.header}>
                  <TouchableOpacity
                    onPress={() => {
                      setStep("pick");
                      fade.setValue(0);
                    }}
                    style={m.backBtn}
                  >
                    <Ionicons name="arrow-back" size={16} color="#6b7280" />
                  </TouchableOpacity>
                  <Text style={[m.title, { marginLeft: 10, flex: 1 }]}>
                    {cowType === "mature"
                      ? "🐄 Mature Cow"
                      : "🐮 New Born Calf"}
                  </Text>
                  <TouchableOpacity onPress={reset} style={m.closeBtn}>
                    <Ionicons name="close" size={18} color="#6b7280" />
                  </TouchableOpacity>
                </View>
                <Text style={m.sub}>Fill in the details below</Text>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  style={{ maxHeight: 380 }}
                >
                  <Field
                    label="Serial No."
                    value={form.srNo}
                    onChange={setF("srNo")}
                    placeholder="e.g. 009"
                    icon="barcode-outline"
                  />
                  <Field
                    label="Name"
                    value={form.name}
                    onChange={setF("name")}
                    placeholder="e.g. Kamdhenu"
                    icon="text-outline"
                  />
                  <Field
                    label="Breed"
                    value={form.breed}
                    onChange={setF("breed")}
                    placeholder="e.g. Gir, Sahiwal"
                    icon="paw-outline"
                  />
                  <Field
                    label="Father (Bull)"
                    value={form.father}
                    onChange={setF("father")}
                    placeholder="e.g. BULL-001"
                    icon="male-outline"
                  />
                  <Field
                    label="Weight (kg)"
                    value={form.weight}
                    onChange={setF("weight")}
                    placeholder="e.g. 420"
                    icon="scale-outline"
                    keyboardType="numeric"
                  />
                  <Field
                    label="Size"
                    value={form.size}
                    onChange={setF("size")}
                    placeholder="Large / Medium / Small"
                    icon="resize-outline"
                  />
                  {cowType === "mature" ? (
                    <Field
                      label="Bought Date"
                      value={form.boughtDate}
                      onChange={setF("boughtDate")}
                      placeholder="DD/MM/YYYY"
                      icon="calendar-outline"
                    />
                  ) : (
                    <Field
                      label="Born Date"
                      value={form.bornDate}
                      onChange={setF("bornDate")}
                      placeholder="DD/MM/YYYY"
                      icon="calendar-outline"
                    />
                  )}
                  <View style={m.toggleCard}>
                    <Toggle
                      label="Active Status"
                      value={form.isActive}
                      onChange={setF("isActive")}
                      color="#16a34a"
                    />
                    <View style={m.divider} />
                    <Toggle
                      label="Sold Status"
                      value={form.isSold}
                      onChange={setF("isSold")}
                      color="#dc2626"
                    />
                  </View>
                  <View style={{ height: 12 }} />
                </ScrollView>

                <TouchableOpacity onPress={submit} style={m.submitBtn}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={18}
                    color="#fff"
                  />
                  <Text style={m.submitText}>Register Cow</Text>
                </TouchableOpacity>
              </Animated.View>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ─── Cow Detail Card ──────────────────────────────────────────────────────────
function CowCard({ item, index }: { item: Cow; index: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;
  const st = STATUS[item.status as keyof typeof STATUS] ?? STATUS.healthy;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        delay: index * 60,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        delay: index * 60,
        tension: 70,
        friction: 12,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[c.card, { opacity, transform: [{ translateY }] }]}>
      {/* Top row */}
      <View style={c.topRow}>
        <View style={c.avatarWrap}>
          <Text style={{ fontSize: 28 }}>
            {item.type === "newborn" ? "🐮" : "🐄"}
          </Text>
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={c.nameRow}>
            <Text style={c.name}>{item.name}</Text>
            <View
              style={[
                c.badge,
                { backgroundColor: st.bg, borderColor: st.border },
              ]}
            >
              <View style={[c.dot, { backgroundColor: st.color }]} />
              <Text style={[c.badgeText, { color: st.color }]}>{st.label}</Text>
            </View>
          </View>
          <Text style={c.tag}>
            {item.tag} · {item.breed} · {item.age}
          </Text>
        </View>
      </View>

      {/* Divider */}
      <View style={c.divider} />

      {/* Details grid */}
      <View style={c.grid}>
        <DetailItem icon="scale-outline" label="Weight" value={item.weight} />
        <DetailItem
          icon="male-outline"
          label="Father"
          value={item.father || "—"}
        />
        <DetailItem
          icon="resize-outline"
          label="Size"
          value={item.size || "—"}
        />
        <DetailItem
          icon="calendar-outline"
          label={item.type === "newborn" ? "Born" : "Bought"}
          value={item.bornDate || item.boughtDate || "—"}
        />
      </View>

      {/* Status pills */}
      <View style={c.pillRow}>
        <View
          style={[
            c.pill,
            {
              backgroundColor: item.isActive ? "#f0fdf4" : "#fff1f2",
              borderColor: item.isActive ? "#86efac" : "#fecdd3",
            },
          ]}
        >
          <Ionicons
            name={item.isActive ? "checkmark-circle" : "close-circle"}
            size={12}
            color={item.isActive ? "#16a34a" : "#dc2626"}
          />
          <Text
            style={[
              c.pillText,
              { color: item.isActive ? "#16a34a" : "#dc2626" },
            ]}
          >
            {item.isActive ? "Active" : "Inactive"}
          </Text>
        </View>
        {item.isSold && (
          <View
            style={[
              c.pill,
              { backgroundColor: "#fff7ed", borderColor: "#fed7aa" },
            ]}
          >
            <Ionicons name="pricetag" size={12} color="#ea580c" />
            <Text style={[c.pillText, { color: "#ea580c" }]}>Sold</Text>
          </View>
        )}
        <View
          style={[
            c.pill,
            { backgroundColor: "#eff6ff", borderColor: "#bfdbfe" },
          ]}
        >
          <Ionicons
            name={item.type === "newborn" ? "star" : "shield-checkmark"}
            size={12}
            color="#2563eb"
          />
          <Text style={[c.pillText, { color: "#2563eb" }]}>
            {item.type === "newborn" ? "New Born" : "Mature"}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

function DetailItem({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <View style={c.detailItem}>
      <Ionicons name={icon as any} size={13} color="#9ca3af" />
      <Text style={c.detailLabel}>{label}</Text>
      <Text style={c.detailValue}>{value}</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function CowsScreen() {
  const router = useRouter();
  const [cows, setCows] = useState<Cow[]>(SAMPLE_COWS);
  const [screen, setScreen] = useState<Screen>("home");
  const [search, setSearch] = useState("");
  const [modalVisible, setModalVisible] = useState(false);

  const filtered = cows.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.tag.toLowerCase().includes(search.toLowerCase()) ||
      c.breed.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <SafeAreaView style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── Header ── */}
      <View
        style={[
          s.header,
          {
            paddingTop:
              Platform.OS === "ios" ? 0 : (StatusBar.currentHeight ?? 0),
          },
        ]}
      >
        <TouchableOpacity
          onPress={
            screen === "home" ? () => router.back() : () => setScreen("home")
          }
          style={s.backBtn}
        >
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.headerTitle}>
            {screen === "home" ? "Cows" : "All Cows"}
          </Text>
          <Text style={s.headerSub}>{cows.length} animals registered</Text>
        </View>
        {screen === "list" && (
          <View style={s.countBadge}>
            <Text style={s.countText}>{filtered.length}</Text>
          </View>
        )}
      </View>

      {/* ── Stats strip ── */}
      <View style={s.statsRow}>
        {[
          { label: "Total", value: cows.length, color: "#2563eb" },
          {
            label: "Healthy",
            value: cows.filter((c) => c.status === "healthy").length,
            color: "#16a34a",
          },
          {
            label: "Sick",
            value: cows.filter((c) => c.status === "sick").length,
            color: "#dc2626",
          },
          {
            label: "Pregnant",
            value: cows.filter((c) => c.status === "pregnant").length,
            color: "#7c3aed",
          },
        ].map((st, i, arr) => (
          <View
            key={i}
            style={[s.statItem, i < arr.length - 1 && s.statBorder]}
          >
            <Text style={[s.statValue, { color: st.color }]}>{st.value}</Text>
            <Text style={s.statLabel}>{st.label}</Text>
          </View>
        ))}
      </View>

      {screen === "home" ? (
        // ── Home: two big buttons ──
        <View style={s.homeBody}>
          <Text style={s.homeHeading}>What would you like to do?</Text>
          <Text style={s.homeSub}>Manage your cattle records easily</Text>

          <View style={s.btnGroup}>
            {/* Add Cow */}
            <TouchableOpacity
              onPress={() => setModalVisible(true)}
              style={s.bigBtn}
              activeOpacity={0.85}
            >
              <View style={[s.bigBtnIcon, { backgroundColor: "#f0fdf4" }]}>
                <Text style={{ fontSize: 32 }}>🐄</Text>
              </View>
              <Text style={s.bigBtnTitle}>Add New Cow</Text>
              <Text style={s.bigBtnSub}>Register a mature or newborn cow</Text>
              <View style={[s.bigBtnArrow, { backgroundColor: "#16a34a" }]}>
                <Ionicons name="add" size={18} color="#fff" />
              </View>
            </TouchableOpacity>

            {/* See Cows */}
            <TouchableOpacity
              onPress={() => setScreen("list")}
              style={s.bigBtn}
              activeOpacity={0.85}
            >
              <View style={[s.bigBtnIcon, { backgroundColor: "#eff6ff" }]}>
                <Text style={{ fontSize: 32 }}>📋</Text>
              </View>
              <Text style={s.bigBtnTitle}>See All Cows</Text>
              <Text style={s.bigBtnSub}>
                View and search all {cows.length} animals
              </Text>
              <View style={[s.bigBtnArrow, { backgroundColor: "#2563eb" }]}>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        // ── List: search + cards ──
        <View style={{ flex: 1 }}>
          <View style={s.searchWrap}>
            <Ionicons name="search-outline" size={16} color="#9ca3af" />
            <TextInput
              style={s.searchInput}
              placeholder="Search name, tag, breed..."
              placeholderTextColor="#d1d5db"
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={16} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 8,
              paddingBottom: 100,
            }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item, index }) => (
              <CowCard item={item} index={index} />
            )}
            ListEmptyComponent={
              <View style={s.empty}>
                <Text style={{ fontSize: 48 }}>🐄</Text>
                <Text style={s.emptyText}>No cows found</Text>
              </View>
            }
          />
        </View>
      )}

      <AddCowModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onAdd={(cow) => setCows((prev) => [cow, ...prev])}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f9fafb",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 12,
    color: "#9ca3af",
    fontWeight: "500",
    marginTop: 1,
  },
  countBadge: {
    backgroundColor: "#eff6ff",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  countText: { fontSize: 12, fontWeight: "700", color: "#2563eb" },

  statsRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  statItem: { flex: 1, alignItems: "center", paddingVertical: 12 },
  statBorder: { borderRightWidth: 1, borderRightColor: "#f3f4f6" },
  statValue: { fontSize: 18, fontWeight: "800", letterSpacing: -0.3 },
  statLabel: {
    fontSize: 10,
    color: "#9ca3af",
    marginTop: 2,
    fontWeight: "500",
  },

  homeBody: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  homeHeading: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.4,
    marginBottom: 6,
    textAlign: "center",
  },
  homeSub: {
    fontSize: 14,
    color: "#9ca3af",
    fontWeight: "500",
    marginBottom: 36,
    textAlign: "center",
  },

  btnGroup: { width: "100%", gap: 14 },
  bigBtn: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.5,
    borderColor: "#f3f4f6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  bigBtnIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  bigBtnTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  bigBtnSub: {
    fontSize: 13,
    color: "#9ca3af",
    fontWeight: "500",
    marginBottom: 16,
  },
  bigBtnArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    margin: 16,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: { flex: 1, color: "#111827", fontSize: 14 },
  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 15, color: "#9ca3af", fontWeight: "600" },
});

// Card styles
const c = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  topRow: { flexDirection: "row", alignItems: "center" },
  avatarWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#f9fafb",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: -0.2,
  },
  tag: { fontSize: 12, color: "#9ca3af", fontWeight: "500" },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 10, fontWeight: "700" },
  divider: { height: 1, backgroundColor: "#f3f4f6", marginVertical: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  detailLabel: { fontSize: 11, color: "#9ca3af", fontWeight: "500" },
  detailValue: { fontSize: 11, color: "#374151", fontWeight: "600" },
  pillRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillText: { fontSize: 11, fontWeight: "600" },
});

// Field styles
const f = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: {
    fontSize: 11,
    color: "#6b7280",
    fontWeight: "700",
    letterSpacing: 0.4,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  focused: { borderColor: "#16a34a", backgroundColor: "#fff" },
  input: { flex: 1, color: "#111827", fontSize: 14, fontWeight: "500" },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  toggleLabel: { fontSize: 14, fontWeight: "700", color: "#111827" },
  toggleSub: { fontSize: 11, fontWeight: "500", marginTop: 2 },
});

// Modal styles
const m = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: "#e5e7eb",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.3,
  },
  sub: { fontSize: 13, color: "#9ca3af", fontWeight: "500", marginBottom: 20 },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  backBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },

  typeRow: { flexDirection: "row", gap: 12, marginBottom: 8 },
  typeCard: { flex: 1 },
  typeInner: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    minHeight: 160,
    justifyContent: "space-between",
  },
  typeEmoji: { fontSize: 36, marginBottom: 10 },
  typeTitle: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  typeSub: {
    fontSize: 12,
    color: "#9ca3af",
    fontWeight: "500",
    marginBottom: 14,
  },
  typePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  typePillText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.5,
  },

  toggleCard: {
    backgroundColor: "#f9fafb",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    overflow: "hidden",
    marginBottom: 4,
  },
  divider: { height: 1, backgroundColor: "#e5e7eb", marginHorizontal: 16 },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#16a34a",
    borderRadius: 14,
    paddingVertical: 15,
    gap: 8,
    marginTop: 16,
  },
  submitText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.2,
  },
});
