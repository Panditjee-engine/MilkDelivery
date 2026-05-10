import React, { useState, useRef, useEffect, useCallback } from "react";
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
  ActivityIndicator,
  RefreshControl,
  Alert,
  Image
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../../src/services/api";

const bullImg = require("../../../assets/bull.png");
const calfImg = require("../../../assets/calf.png");
const cowImg = require("../../../assets/cow.png");

// INTERFACES
interface MedicalRecord {
  id: string;
  admin_id: string;
  cowSrNo: string;
  cowName?: string;
  cowAge?: string;
  cowType?: string;
  currentStatus: "healthy" | "unhealthy";
  lastVaccinationDate?: string;
  nextVaccinationDate?: string;
  vaccinationName?: string;
  lastIssueName?: string;
  lastIssueDate?: string;
  currentIssueName?: string;
  currentIssueDate?: string;
  treatmentGiven?: string;
  doctorName?: string;
  medicineName?: string;
  notes?: string;
  created_at: string;
}

interface CowOption {
  id: string;
  tag: string;
  name: string;
  age: string;
  breed: string;
  type: string;
}

interface MedicalForm {
  cowSrNo: string;
  cowName: string;
  cowAge: string;
  currentStatus: "healthy" | "unhealthy";
  lastVaccinationDate: string;
  nextVaccinationDate: string;
  vaccinationName: string;
  lastIssueName: string;
  lastIssueDate: string;
  currentIssueName: string;
  currentIssueDate: string;
  treatmentGiven: string;
  doctorName: string;
  medicineName: string;
  notes: string;
}

type MedicineCategory =
  | "Antibiotic"
  | "Vaccine"
  | "Antiparasitic"
  | "Vitamin"
  | "Homeopathic"
  | "Ethnovetary"
  | "Supplement"
  | "Other";

type MedicineUnit =
  | "ml"
  | "L"
  | "mg"
  | "g"
  | "kg"
  | "tablet"
  | "vial"
  | "dose"
  | "sachet";

interface Medicine {
  id: string;
  admin_id: string;
  name: string;
  category: MedicineCategory;
  unit: MedicineUnit;
  description?: string;
  manufacturer?: string;
  batch_number?: string;
  expiry_date?: string;
  purchase_date?: string;
  cost_per_unit?: number;
  current_stock: number;
  min_stock_alert?: number;
  storage_instructions?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

interface MedicineCreate {
  name: string;
  category: MedicineCategory;
  unit: MedicineUnit;
  description?: string;
  manufacturer?: string;
  batch_number?: string;
  expiry_date?: string;
  purchase_date?: string;
  cost_per_unit?: number;
  current_stock?: number;
  min_stock_alert?: number;
  storage_instructions?: string;
  notes?: string;
}

interface MedicineStockSummary {
  total_medicines: number;
  low_stock_count: number;
  expired_count: number;
  expiring_soon_count: number;
  total_stock_value: number;
}

// CONSTANTS
const EMPTY_FORM: MedicalForm = {
  cowSrNo: "",
  cowName: "",
  cowAge: "",
  currentStatus: "healthy",
  lastVaccinationDate: "",
  nextVaccinationDate: "",
  vaccinationName: "",
  lastIssueName: "",
  lastIssueDate: "",
  currentIssueName: "",
  currentIssueDate: "",
  treatmentGiven: "",
  doctorName: "",
  medicineName: "",
  notes: "",
};

const EMPTY_MED_FORM: MedicineCreate = {
  name: "",
  category: "Other",
  unit: "ml",
  description: "",
  manufacturer: "",
  batch_number: "",
  expiry_date: "",
  purchase_date: "",
  current_stock: 0,
};

const PAGE_SIZE = 4;

const VACCINE_OPTIONS = [
  { label: "FMD", desc: "Foot & Mouth Disease", color: "#7c3aed" },
  { label: "BQ", desc: "Black Quarter", color: "#0891b2" },
  { label: "HS", desc: "Hemorrhagic Septicemia", color: "#ea580c" },
];

const TREATMENT_OPTIONS = [
  { label: "Homeopathic", value: "Homeopathic" },
  { label: "Ethnovetary", value: "Ethnovetary" },
  { label: "Antibiotic", value: "Antibiotic" },
];

const CALF_VACCINE_SCHEDULE = [
  { label: "15 Days", days: 15 },
  { label: "1 Month", days: 30 },
  { label: "2 Months", days: 60 },
  { label: "3 Months", days: 90 },
  { label: "6 Months", days: 180 },
];

const MED_CATEGORIES: {
  label: string;
  value: MedicineCategory;
  color: string;
  icon: string;
}[] = [
  {
    label: "Antibiotic",
    value: "Antibiotic",
    color: "#0891b2",
    icon: "medical-outline",
  },
  {
    label: "Vaccine",
    value: "Vaccine",
    color: "#7c3aed",
    icon: "shield-checkmark-outline",
  },
  {
    label: "Antiparasitic",
    value: "Antiparasitic",
    color: "#ea580c",
    icon: "bug-outline",
  },
  {
    label: "Vitamin",
    value: "Vitamin",
    color: "#16a34a",
    icon: "leaf-outline",
  },
  {
    label: "Homeopathic",
    value: "Homeopathic",
    color: "#059669",
    icon: "flower-outline",
  },
  {
    label: "Ethnovetary",
    value: "Ethnovetary",
    color: "#8b5cf6",
    icon: "flask-outline",
  },
  {
    label: "Supplement",
    value: "Supplement",
    color: "#d97706",
    icon: "nutrition-outline",
  },
  {
    label: "Other",
    value: "Other",
    color: "#6b7280",
    icon: "ellipsis-horizontal-outline",
  },
];

const MED_UNITS: MedicineUnit[] = [
  "ml",
  "L",
  "mg",
  "g",
  "kg",
  "tablet",
  "vial",
  "dose",
  "sachet",
];

// HELPERS
function getCalfVaccineDates(bornDate: string) {
  const parts = bornDate.split("/");
  let base: Date | null = null;
  if (parts.length === 3) base = new Date(+parts[2], +parts[1] - 1, +parts[0]);
  if (!base || isNaN(base.getTime())) return null;
  return CALF_VACCINE_SCHEDULE.map((s) => {
    const d = new Date(base!);
    d.setDate(d.getDate() + s.days);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return {
      label: s.label,
      date: `${dd}/${mm}/${d.getFullYear()}`,
      days: s.days,
    };
  });
}

function getCatMeta(cat: string) {
  return (
    MED_CATEGORIES.find((c) => c.value === cat) ??
    MED_CATEGORIES[MED_CATEGORIES.length - 1]
  );
}

function parseExpiry(ddmmyyyy?: string): Date | null {
  if (!ddmmyyyy) return null;
  const p = ddmmyyyy.split("/");
  if (p.length !== 3) return null;
  const d = new Date(+p[2], +p[1] - 1, +p[0]);
  return isNaN(d.getTime()) ? null : d;
}

function expiryStatus(ddmmyyyy?: string): "ok" | "soon" | "expired" {
  const d = parseExpiry(ddmmyyyy);
  if (!d) return "ok";
  const now = new Date();
  if (d < now) return "expired";
  const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diff <= 30 ? "soon" : "ok";
}

function stockStatus(med: Medicine): "ok" | "low" | "out" {
  if (med.current_stock === 0) return "out";
  if (med.min_stock_alert != null && med.current_stock <= med.min_stock_alert)
    return "low";
  return "ok";
}

function todayYMD() {
  return new Date().toISOString().split("T")[0];
}

// SHARED FIELD COMPONENTS
function Sec({
  title,
  icon,
  color,
}: {
  title: string;
  icon: string;
  color: string;
}) {
  return (
    <View style={[f.secRow, { borderLeftColor: color }]}>
      <Ionicons name={icon as any} size={13} color={color} />
      <Text style={[f.secTitle, { color }]}>{title}</Text>
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  icon,
  color = "#16a34a",
  keyboardType = "default",
  multiline = false,
}: any) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={f.wrap}>
      <Text style={f.label}>{label}</Text>
      <View
        style={[
          f.row,
          focused && { borderColor: color, backgroundColor: "#fff" },
          multiline && { alignItems: "flex-start", paddingVertical: 10 },
        ]}
      >
        <Ionicons
          name={icon}
          size={14}
          color={focused ? color : "#9ca3af"}
          style={{ marginRight: 8, marginTop: multiline ? 2 : 0 }}
        />
        <TextInput
          style={[
            f.input,
            multiline && { minHeight: 54, textAlignVertical: "top" },
          ]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder ?? label}
          placeholderTextColor="#d1d5db"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          keyboardType={keyboardType}
          multiline={multiline}
        />
      </View>
    </View>
  );
}

function VaccinePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={vp.wrap}>
      <Text style={f.label}>VACCINE NAME</Text>
      <View style={vp.chipRow}>
        {VACCINE_OPTIONS.map((opt) => {
          const active = value === opt.label;
          return (
            <TouchableOpacity
              key={opt.label}
              style={[
                vp.chip,
                active && {
                  backgroundColor: opt.color,
                  borderColor: opt.color,
                },
              ]}
              onPress={() => onChange(active ? "" : opt.label)}
              activeOpacity={0.8}
            >
              <Ionicons
                name="shield-checkmark"
                size={11}
                color={active ? "#fff" : opt.color}
              />
              <Text style={[vp.chipLabel, active && { color: "#fff" }]}>
                {opt.label}
              </Text>
              {active && <Ionicons name="checkmark" size={11} color="#fff" />}
            </TouchableOpacity>
          );
        })}
      </View>
      {VACCINE_OPTIONS.find((o) => o.label === value) && (
        <Text style={vp.descHint}>
          {VACCINE_OPTIONS.find((o) => o.label === value)?.desc}
        </Text>
      )}
      <View style={[vp.inputRow, focused && vp.inputFocused]}>
        <Ionicons
          name="medkit-outline"
          size={14}
          color={focused ? "#7c3aed" : "#9ca3af"}
          style={{ marginRight: 8 }}
        />
        <TextInput
          style={vp.input}
          value={value}
          onChangeText={onChange}
          placeholder="Or type custom vaccine name..."
          placeholderTextColor="#d1d5db"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {value.length > 0 && (
          <TouchableOpacity onPress={() => onChange("")}>
            <Ionicons name="close-circle" size={15} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function CowSelector({
  value,
  onSelect,
  onClear,
  onManual,
}: {
  value: { tag: string; name: string; age: string } | null;
  onSelect: (c: CowOption) => void;
  onClear: () => void;
  onManual: (tag: string) => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [allCows, setAllCows] = useState<CowOption[]>([]);
  const [visibleCows, setVisibleCows] = useState<CowOption[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const initialLoadDone = useRef(false);

  const loadCows = async (q?: string) => {
    setLoading(true);
    setPage(0);
    try {
      await api.init();
      const data = await api.getCows(q);
      setAllCows(data);
      const first = data.slice(0, PAGE_SIZE);
      setVisibleCows(first);
      setHasMore(data.length > PAGE_SIZE);
    } catch {
      setAllCows([]);
      setVisibleCows([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    const nextSlice = allCows.slice(0, (nextPage + 1) * PAGE_SIZE);
    setVisibleCows(nextSlice);
    setPage(nextPage);
    setHasMore(nextSlice.length < allCows.length);
    setLoadingMore(false);
  };

  const open = () => {
    initialLoadDone.current = false;
    setSearch("");
    setModalOpen(true);
    loadCows().then(() => {
      initialLoadDone.current = true;
    });
  };

  const close = () => {
    setModalOpen(false);
    setSearch("");
    setPage(0);
    setAllCows([]);
    setVisibleCows([]);
    initialLoadDone.current = false;
  };

  useEffect(() => {
    if (!modalOpen || !initialLoadDone.current) return;
    const t = setTimeout(() => loadCows(search || undefined), 350);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <>
      <View style={cs.wrap}>
        <Text style={cs.label}>COW SR. NO.</Text>
        {value ? (
          <View style={cs.selected}>
            <View style={{ flex: 1 }}>
              <Text style={cs.selTag}>{value.tag}</Text>
              <Text style={cs.selMeta}>
                {value.name}
                {value.age ? ` · ${value.age}` : ""}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClear}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={cs.row}>
            <TouchableOpacity
              style={cs.selectBtn}
              onPress={open}
              activeOpacity={0.8}
            >
              <Ionicons name="search-outline" size={14} color="#16a34a" />
              <Text style={cs.selectBtnText}>Select Cow</Text>
            </TouchableOpacity>
            <Text style={cs.orText}>or</Text>
            <TouchableOpacity
              style={cs.manualTagBtn}
              onPress={open}
              activeOpacity={0.8}
            >
              <Ionicons name="keypad-outline" size={14} color="#6b7280" />
              <Text style={cs.manualTagBtnText}>Enter Sr. No.</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      <Modal
        visible={modalOpen}
        transparent
        animationType="fade"
        onRequestClose={close}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <TouchableOpacity
            style={cs.overlay}
            activeOpacity={1}
            onPress={close}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={cs.sheet}
              onPress={() => { }}
            >
              <View style={cs.sheetHeader}>
                <Text style={cs.sheetTitle}>Select Cow</Text>
                <TouchableOpacity onPress={close} style={cs.sheetClose}>
                  <Ionicons name="close" size={18} color="#6b7280" />
                </TouchableOpacity>
              </View>
              <View style={cs.searchBox}>
                <Ionicons name="search-outline" size={14} color="#9ca3af" />
                <TextInput
                  style={cs.searchInput}
                  placeholder="Search tag or name..."
                  placeholderTextColor="#d1d5db"
                  value={search}
                  onChangeText={(text) => {
                    if (initialLoadDone.current) setSearch(text);
                  }}
                />
                {search.length > 0 && (
                  <TouchableOpacity onPress={() => setSearch("")}>
                    <Ionicons name="close-circle" size={14} color="#9ca3af" />
                  </TouchableOpacity>
                )}
              </View>
              {search.trim().length > 0 &&
                visibleCows.length === 0 &&
                !loading && (
                  <TouchableOpacity
                    style={cs.useManualBtn}
                    onPress={() => {
                      onManual(search.trim());
                      close();
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="add-circle-outline"
                      size={15}
                      color="#16a34a"
                    />
                    <Text style={cs.useManualText}>
                      Use "{search.trim()}" as Sr. No.
                    </Text>
                  </TouchableOpacity>
                )}
              {!loading && allCows.length > 0 && (
                <Text style={cs.countHint}>
                  Showing {visibleCows.length} of {allCows.length} cows
                </Text>
              )}
              {loading ? (
                <View style={cs.loadBox}>
                  <ActivityIndicator color="#16a34a" size="large" />
                  <Text style={cs.loadText}>Loading cows...</Text>
                </View>
              ) : (
                <FlatList
                  data={visibleCows}
                  keyExtractor={(i) => i.id}
                  style={cs.list}
                  showsVerticalScrollIndicator
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{ paddingBottom: 8 }}
                  onEndReached={loadMore}
                  onEndReachedThreshold={0.5}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={cs.cowRow}
                      onPress={() => {
                        onSelect(item);
                        close();
                      }}
                      activeOpacity={0.75}
                    >
                      <View style={cs.cowIcon}>
                        <Text style={{ fontSize: 20 }}>🐄</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={cs.cowTag}>{item.tag}</Text>
                        <Text style={cs.cowMeta}>
                          {item.name} · {item.breed}
                          {item.age ? ` · ${item.age}` : ""}
                        </Text>
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={14}
                        color="#d1d5db"
                      />
                    </TouchableOpacity>
                  )}
                  ListFooterComponent={
                    loadingMore ? (
                      <View style={cs.footerLoader}>
                        <ActivityIndicator size="small" color="#16a34a" />
                        <Text style={cs.footerLoaderText}>Loading more...</Text>
                      </View>
                    ) : hasMore ? (
                      <TouchableOpacity
                        style={cs.loadMoreBtn}
                        onPress={loadMore}
                      >
                        <Ionicons
                          name="chevron-down-circle-outline"
                          size={16}
                          color="#16a34a"
                        />
                        <Text style={cs.loadMoreText}>
                          Load more ({allCows.length - visibleCows.length}{" "}
                          remaining)
                        </Text>
                      </TouchableOpacity>
                    ) : visibleCows.length > 0 ? (
                      <Text style={cs.endText}>
                        ✓ All {allCows.length} cows loaded
                      </Text>
                    ) : null
                  }
                  ListEmptyComponent={
                    <View style={cs.emptyBox}>
                      <Text style={cs.emptyText}>No cows found</Text>
                    </View>
                  }
                />
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

function StatusToggle({
  value,
  onChange,
}: {
  value: "healthy" | "unhealthy";
  onChange: (v: "healthy" | "unhealthy") => void;
}) {
  return (
    <View style={st.wrap}>
      <TouchableOpacity
        style={[st.btn, value === "healthy" && st.activeHealthy]}
        onPress={() => onChange("healthy")}
        activeOpacity={0.85}
      >
        <Ionicons
          name="checkmark-circle"
          size={18}
          color={value === "healthy" ? "#fff" : "#9ca3af"}
        />
        <Text style={[st.btnText, value === "healthy" && st.activeText]}>
          Healthy
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[st.btn, value === "unhealthy" && st.activeUnhealthy]}
        onPress={() => onChange("unhealthy")}
        activeOpacity={0.85}
      >
        <Ionicons
          name="alert-circle"
          size={18}
          color={value === "unhealthy" ? "#fff" : "#9ca3af"}
        />
        <Text style={[st.btnText, value === "unhealthy" && st.activeText]}>
          Unhealthy
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function MedicalFormBody({
  form,
  setF,
  onCowSelect,
  onCowClear,
  onCowManual,
}: {
  form: MedicalForm;
  setF: (k: keyof MedicalForm) => (v: any) => void;
  onCowSelect: (c: CowOption) => void;
  onCowClear: () => void;
  onCowManual: (tag: string) => void;
}) {
  const selectedCow = form.cowSrNo
    ? { tag: form.cowSrNo, name: form.cowName, age: form.cowAge }
    : null;
  return (
    <>
      <Sec title="Cow Identity" icon="paw-outline" color="#16a34a" />
      <CowSelector
        value={selectedCow}
        onSelect={onCowSelect}
        onClear={onCowClear}
        onManual={onCowManual}
      />
      {form.cowName || form.cowAge ? (
        <View style={f.autoRow}>
          {form.cowName && (
            <View
              style={[
                f.autoChip,
                { backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" },
              ]}
            >
              <Ionicons name="text-outline" size={11} color="#16a34a" />
              <Text style={[f.autoChipText, { color: "#16a34a" }]}>
                {form.cowName}
              </Text>
            </View>
          )}
          {form.cowAge && (
            <View
              style={[
                f.autoChip,
                { backgroundColor: "#eff6ff", borderColor: "#bfdbfe" },
              ]}
            >
              <Ionicons name="time-outline" size={11} color="#2563eb" />
              <Text style={[f.autoChipText, { color: "#2563eb" }]}>
                {form.cowAge}
              </Text>
            </View>
          )}
          <View
            style={[
              f.autoChip,
              { backgroundColor: "#f9fafb", borderColor: "#e5e7eb" },
            ]}
          >
            <Ionicons name="flash-outline" size={11} color="#9ca3af" />
            <Text style={[f.autoChipText, { color: "#9ca3af" }]}>
              Auto-filled
            </Text>
          </View>
        </View>
      ) : null}
      <Sec
        title="Current Health Status"
        icon="heart-outline"
        color={form.currentStatus === "healthy" ? "#16a34a" : "#dc2626"}
      />
      <StatusToggle
        value={form.currentStatus}
        onChange={setF("currentStatus")}
      />
      <Sec
        title="Vaccination"
        icon="shield-checkmark-outline"
        color="#7c3aed"
      />
      <VaccinePicker
        value={form.vaccinationName}
        onChange={setF("vaccinationName")}
      />
      <View style={f.twoCol}>
        <View style={{ flex: 1 }}>
          <Field
            label="Last Vaccination"
            value={form.lastVaccinationDate}
            onChange={setF("lastVaccinationDate")}
            placeholder="DD/MM/YYYY"
            icon="calendar-outline"
            color="#7c3aed"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Field
            label="Next Vaccination"
            value={form.nextVaccinationDate}
            onChange={setF("nextVaccinationDate")}
            placeholder="DD/MM/YYYY"
            icon="calendar-outline"
            color="#7c3aed"
          />
        </View>
      </View>
      <Sec title="Health Issues" icon="alert-circle-outline" color="#ea580c" />
      <View style={f.twoCol}>
        <View style={{ flex: 1 }}>
          <Field
            label="Last Issue"
            value={form.lastIssueName}
            onChange={setF("lastIssueName")}
            placeholder="e.g. Fever"
            icon="bandage-outline"
            color="#ea580c"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Field
            label="Last Issue Date"
            value={form.lastIssueDate}
            onChange={setF("lastIssueDate")}
            placeholder="DD/MM/YYYY"
            icon="calendar-outline"
            color="#ea580c"
          />
        </View>
      </View>
      <View style={f.twoCol}>
        <View style={{ flex: 1 }}>
          <Field
            label="Current Issue"
            value={form.currentIssueName}
            onChange={setF("currentIssueName")}
            placeholder="e.g. Mastitis"
            icon="bandage-outline"
            color="#dc2626"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Field
            label="Issue Date"
            value={form.currentIssueDate}
            onChange={setF("currentIssueDate")}
            placeholder="DD/MM/YYYY"
            icon="calendar-outline"
            color="#dc2626"
          />
        </View>
      </View>
      <Sec title="Treatment" icon="flask-outline" color="#0891b2" />
      <View style={{ marginBottom: 12 }}>
        <Text style={f.label}>TREATMENT GIVEN</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {TREATMENT_OPTIONS.map((opt) => {
            const isSel = form.treatmentGiven === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => setF("treatmentGiven")(isSel ? "" : opt.value)}
                style={{
                  flex: 1,
                  paddingVertical: 11,
                  paddingHorizontal: 6,
                  borderRadius: 12,
                  borderWidth: 1.5,
                  borderColor: isSel ? "#0891b2" : "#e2e8f0",
                  backgroundColor: isSel ? "#ecfeff" : "#f8fafc",
                  alignItems: "center",
                }}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={
                    (opt.value === "Homeopathic"
                      ? "leaf-outline"
                      : opt.value === "Ethnovetary"
                        ? "flask-outline"
                        : "medical-outline") as any
                  }
                  size={14}
                  color={isSel ? "#0891b2" : "#9ca3af"}
                  style={{ marginBottom: 3 }}
                />
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "700",
                    color: isSel ? "#0891b2" : "#6b7280",
                    textAlign: "center",
                  }}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      <Field
        label="Medicine Name"
        value={form.medicineName}
        onChange={setF("medicineName")}
        placeholder="e.g. Oxytetracycline"
        icon="flask-outline"
        color="#0891b2"
      />
      <Field
        label="Doctor / Vet Name"
        value={form.doctorName}
        onChange={setF("doctorName")}
        placeholder="e.g. Dr. Sharma"
        icon="person-outline"
        color="#0891b2"
      />
      <Sec title="Notes" icon="document-text-outline" color="#6b7280" />
      <Field
        label="Additional Notes"
        value={form.notes}
        onChange={setF("notes")}
        placeholder="Any extra remarks..."
        icon="chatbubble-outline"
        multiline
      />
      <View style={{ height: 16 }} />
    </>
  );
}

function MedicalFormModal({
  visible,
  onClose,
  onSave,
  editRecord,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (r: MedicalRecord) => void;
  editRecord: MedicalRecord | null;
}) {
  const isEdit = !!editRecord;
  const [form, setForm] = useState<MedicalForm>(EMPTY_FORM);
  const [submitting, setSub] = useState(false);

  useEffect(() => {
    if (editRecord) {
      setForm({
        cowSrNo: editRecord.cowSrNo,
        cowName: editRecord.cowName ?? "",
        cowAge: editRecord.cowAge ?? "",
        currentStatus: editRecord.currentStatus as "healthy" | "unhealthy",
        lastVaccinationDate: editRecord.lastVaccinationDate ?? "",
        nextVaccinationDate: editRecord.nextVaccinationDate ?? "",
        vaccinationName: editRecord.vaccinationName ?? "",
        lastIssueName: editRecord.lastIssueName ?? "",
        lastIssueDate: editRecord.lastIssueDate ?? "",
        currentIssueName: editRecord.currentIssueName ?? "",
        currentIssueDate: editRecord.currentIssueDate ?? "",
        treatmentGiven: editRecord.treatmentGiven ?? "",
        doctorName: editRecord.doctorName ?? "",
        medicineName: editRecord.medicineName ?? "",
        notes: editRecord.notes ?? "",
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [editRecord, visible]);

  const setF = (k: keyof MedicalForm) => (v: any) =>
    setForm((p) => ({ ...p, [k]: v }));
  const handleCowSelect = (c: CowOption) =>
    setForm((p) => ({
      ...p,
      cowSrNo: c.tag,
      cowName: c.name,
      cowAge: c.age || "",
    }));
  const handleCowClear = () =>
    setForm((p) => ({ ...p, cowSrNo: "", cowName: "", cowAge: "" }));
  const handleCowManual = (tag: string) =>
    setForm((p) => ({ ...p, cowSrNo: tag, cowName: "", cowAge: "" }));
  const reset = () => {
    setForm(EMPTY_FORM);
    onClose();
  };

  const submit = async () => {
    if (!form.cowSrNo.trim()) {
      Alert.alert("Missing Field", "Please select or enter a Cow Sr. No.");
      return;
    }
    setSub(true);
    try {
      const n = (s: string) => s.trim() || undefined;
      const payload = {
        cowSrNo: form.cowSrNo.trim(),
        cowName: n(form.cowName),
        cowAge: n(form.cowAge),
        currentStatus: form.currentStatus,
        lastVaccinationDate: n(form.lastVaccinationDate),
        nextVaccinationDate: n(form.nextVaccinationDate),
        vaccinationName: n(form.vaccinationName),
        lastIssueName: n(form.lastIssueName),
        lastIssueDate: n(form.lastIssueDate),
        currentIssueName: n(form.currentIssueName),
        currentIssueDate: n(form.currentIssueDate),
        treatmentGiven: n(form.treatmentGiven),
        doctorName: n(form.doctorName),
        medicineName: n(form.medicineName),
        notes: n(form.notes),
      };
      const result: MedicalRecord =
        isEdit && editRecord
          ? await api.updateMedicalRecord(editRecord.id, payload)
          : await api.createMedicalRecord(payload);
      onSave(result);
      reset();
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Failed to save.");
    } finally {
      setSub(false);
    }
  };

  const accent = isEdit ? "#ea580c" : "#16a34a";
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={reset}
    >
      <View style={mo.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ width: "100%" }}
        >
          <View style={mo.sheet}>
            <View style={mo.handle} />
            <View style={mo.header}>
              <View style={[mo.iconWrap, { backgroundColor: accent + "18" }]}>
                <Ionicons
                  name={isEdit ? "create" : "add-circle"}
                  size={18}
                  color={accent}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={mo.title}>
                  {isEdit ? "Edit Medical Record" : "Add Medical Record"}
                </Text>
                {isEdit && editRecord && (
                  <Text style={mo.subTitle}>
                    {editRecord.cowSrNo}
                    {editRecord.cowName ? ` · ${editRecord.cowName}` : ""}
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={reset} style={mo.closeBtn}>
                <Ionicons name="close" size={18} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 520 }}
              keyboardShouldPersistTaps="handled"
            >
              <MedicalFormBody
                form={form}
                setF={setF}
                onCowSelect={handleCowSelect}
                onCowClear={handleCowClear}
                onCowManual={handleCowManual}
              />
            </ScrollView>
            <TouchableOpacity
              onPress={submit}
              style={[
                mo.submitBtn,
                { backgroundColor: accent },
                submitting && { opacity: 0.6 },
              ]}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons
                    name={isEdit ? "save-outline" : "checkmark-circle-outline"}
                    size={18}
                    color="#fff"
                  />
                  <Text style={mo.submitText}>
                    {isEdit ? "Save Changes" : "Save Record"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function CalfVaccineCard({ record }: { record: MedicalRecord }) {
  const [expanded, setExpanded] = useState(false);
  const vaccineDates = record.cowAge
    ? getCalfVaccineDates(record.cowAge)
    : null;
  if (!vaccineDates) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextDue = vaccineDates.find((v) => {
    const p = v.date.split("/");
    const d = new Date(+p[2], +p[1] - 1, +p[0]);
    return d >= today;
  });
  return (
    <View style={cv.card}>
      <View style={cv.accentBar} />
      <TouchableOpacity
        style={cv.header}
        onPress={() => setExpanded((e) => !e)}
        activeOpacity={0.85}
      >
        <View style={cv.avatarWrap}>
          <Text style={{ fontSize: 22 }}>🐮</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={cv.name}>{record.cowName || record.cowSrNo}</Text>
            <View style={cv.calfBadge}>
              <Text style={cv.calfBadgeText}>Calf</Text>
            </View>
          </View>
          <Text style={cv.srNo}>{record.cowSrNo}</Text>
          {nextDue ? (
            <View style={cv.nextDueRow}>
              <Ionicons name="time-outline" size={11} color="#ea580c" />
              <Text style={cv.nextDueText}>
                Next: {nextDue.label} — {nextDue.date}
              </Text>
            </View>
          ) : (
            <View style={cv.nextDueRow}>
              <Ionicons name="checkmark-circle" size={11} color="#16a34a" />
              <Text style={[cv.nextDueText, { color: "#16a34a" }]}>
                All vaccines completed
              </Text>
            </View>
          )}
        </View>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={15}
          color="#cbd5e1"
        />
      </TouchableOpacity>
      {expanded && (
        <View style={cv.scheduleWrap}>
          <View style={cv.divider} />
          <Text style={cv.scheduleTitle}>Vaccination Schedule</Text>
          {vaccineDates.map((v, i) => {
            const p = v.date.split("/");
            const vDate = new Date(+p[2], +p[1] - 1, +p[0]);
            const isPast = vDate < today;
            const isNext = nextDue?.label === v.label;
            return (
              <View key={i} style={cv.scheduleRow}>
                <View style={cv.lineCol}>
                  <View
                    style={[
                      cv.dot,
                      {
                        backgroundColor: isPast
                          ? "#16a34a"
                          : isNext
                            ? "#ea580c"
                            : "#e2e8f0",
                        borderColor: isPast
                          ? "#16a34a"
                          : isNext
                            ? "#ea580c"
                            : "#cbd5e1",
                      },
                    ]}
                  />
                  {i < vaccineDates.length - 1 && (
                    <View
                      style={[
                        cv.line,
                        { backgroundColor: isPast ? "#bbf7d0" : "#e2e8f0" },
                      ]}
                    />
                  )}
                </View>
                <View style={cv.scheduleContent}>
                  <Text
                    style={[
                      cv.scheduleLabel,
                      isNext && { color: "#ea580c", fontWeight: "800" },
                      isPast && { color: "#16a34a" },
                    ]}
                  >
                    {v.label}
                  </Text>
                  <View
                    style={[
                      cv.dateBadge,
                      {
                        backgroundColor: isPast
                          ? "#f0fdf4"
                          : isNext
                            ? "#fff7ed"
                            : "#f8fafc",
                        borderColor: isPast
                          ? "#bbf7d0"
                          : isNext
                            ? "#fed7aa"
                            : "#e2e8f0",
                      },
                    ]}
                  >
                    {isPast && (
                      <Ionicons name="checkmark" size={10} color="#16a34a" />
                    )}
                    {isNext && (
                      <Ionicons name="alert-circle" size={10} color="#ea580c" />
                    )}
                    {!isPast && !isNext && (
                      <Ionicons
                        name="calendar-outline"
                        size={10}
                        color="#94a3b8"
                      />
                    )}
                    <Text
                      style={[
                        cv.dateText,
                        isPast
                          ? { color: "#16a34a" }
                          : isNext
                            ? { color: "#ea580c" }
                            : { color: "#64748b" },
                      ]}
                    >
                      {v.date}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

function DRow({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value?: string;
  color?: string;
}) {
  if (!value) return null;
  return (
    <View style={dr.row}>
      <View
        style={[dr.iconBox, { backgroundColor: (color ?? "#9ca3af") + "18" }]}
      >
        <Ionicons name={icon as any} size={12} color={color ?? "#9ca3af"} />
      </View>
      <Text style={dr.label}>{label}</Text>
      <Text style={[dr.value, color ? { color } : {}]}>{value}</Text>
    </View>
  );
}

function MedicalCard({
  item,
  index,
  onEdit,
  onDelete,
}: {
  item: MedicalRecord;
  index: number;
  onEdit: (r: MedicalRecord) => void;
  onDelete: (r: MedicalRecord) => void;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;
  const [expanded, setExpanded] = useState(false);
  const isHealthy = item.currentStatus === "healthy";
  const statusColor = isHealthy ? "#16a34a" : "#dc2626";
  const statusBg = isHealthy ? "#f0fdf4" : "#fff1f2";
  const statusBorder = isHealthy ? "#bbf7d0" : "#fecdd3";
  const vaccinePreset = VACCINE_OPTIONS.find(
    (o) => o.label === item.vaccinationName,
  );
  const treatColor =
    item.treatmentGiven === "Homeopathic"
      ? "#16a34a"
      : item.treatmentGiven === "Ethnovetary"
        ? "#7c3aed"
        : item.treatmentGiven === "Antibiotic"
          ? "#0891b2"
          : "#6b7280";
  const treatBg =
    item.treatmentGiven === "Homeopathic"
      ? "#f0fdf4"
      : item.treatmentGiven === "Ethnovetary"
        ? "#faf5ff"
        : item.treatmentGiven === "Antibiotic"
          ? "#ecfeff"
          : "#f8fafc";
  const treatBorder =
    item.treatmentGiven === "Homeopathic"
      ? "#bbf7d0"
      : item.treatmentGiven === "Ethnovetary"
        ? "#e9d5ff"
        : item.treatmentGiven === "Antibiotic"
          ? "#a5f3fc"
          : "#e2e8f0";

  useEffect(() => {
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
        tension: 68,
        friction: 12,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[c.card, { opacity, transform: [{ translateY }] }]}>
      <View style={[c.accent, { backgroundColor: statusColor }]} />
      <View style={{ padding: 14 }}>
        <TouchableOpacity
          onPress={() => setExpanded((e) => !e)}
          activeOpacity={0.85}
        >
          <View style={c.topRow}>
            <View style={[c.avatar, { borderColor: statusBorder, backgroundColor: statusBg }]}>
              <Image
                source={
                  item.cowType === "bull" ? bullImg :
                    item.cowType === "newborn" ? calfImg :
                      cowImg
                }
                style={{ width: 32, height: 32, resizeMode: "contain" }}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 2,
                }}
              >
                <Text style={c.cowSr}>{item.cowSrNo}</Text>
                {item.cowName && <Text style={c.cowName}>{item.cowName}</Text>}
              </View>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                {item.cowAge && (
                  <View style={c.agePill}>
                    <Ionicons name="time-outline" size={10} color="#64748b" />
                    <Text style={c.agePillText}>{item.cowAge}</Text>
                  </View>
                )}
                <View
                  style={[
                    c.statusPill,
                    { backgroundColor: statusBg, borderColor: statusBorder },
                  ]}
                >
                  <View
                    style={[c.statusDot, { backgroundColor: statusColor }]}
                  />
                  <Text style={[c.statusText, { color: statusColor }]}>
                    {isHealthy ? "Healthy" : "Unhealthy"}
                  </Text>
                </View>
              </View>
            </View>
            <Ionicons
              name={expanded ? "chevron-up" : "chevron-down"}
              size={15}
              color="#cbd5e1"
              style={{ marginLeft: 6 }}
            />
          </View>
          <View style={c.chips}>
            {item.vaccinationName && (
              <View
                style={[
                  c.chip,
                  {
                    backgroundColor: vaccinePreset
                      ? vaccinePreset.color + "15"
                      : "#faf5ff",
                    borderColor: vaccinePreset
                      ? vaccinePreset.color + "55"
                      : "#e9d5ff",
                  },
                ]}
              >
                <Ionicons
                  name="shield-checkmark"
                  size={10}
                  color={vaccinePreset?.color ?? "#7c3aed"}
                />
                <Text
                  style={[
                    c.chipText,
                    { color: vaccinePreset?.color ?? "#7c3aed" },
                  ]}
                >
                  {item.vaccinationName}
                </Text>
              </View>
            )}
            {item.currentIssueName && (
              <View
                style={[
                  c.chip,
                  { backgroundColor: "#fff7ed", borderColor: "#fed7aa" },
                ]}
              >
                <Ionicons
                  name="alert-circle-outline"
                  size={10}
                  color="#ea580c"
                />
                <Text style={[c.chipText, { color: "#ea580c" }]}>
                  {item.currentIssueName}
                </Text>
              </View>
            )}
            {item.treatmentGiven && (
              <View
                style={[
                  c.chip,
                  { backgroundColor: treatBg, borderColor: treatBorder },
                ]}
              >
                <Ionicons name="medical-outline" size={10} color={treatColor} />
                <Text style={[c.chipText, { color: treatColor }]}>
                  {item.treatmentGiven}
                </Text>
              </View>
            )}
            {item.nextVaccinationDate && (
              <View
                style={[
                  c.chip,
                  { backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" },
                ]}
              >
                <Ionicons name="calendar-outline" size={10} color="#16a34a" />
                <Text style={[c.chipText, { color: "#16a34a" }]}>
                  Next: {item.nextVaccinationDate}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
        {expanded && (
          <>
            <View style={c.divider} />
            <Text style={c.secLabel}>Vaccination</Text>
            <DRow
              icon="shield-checkmark-outline"
              label="Vaccine"
              value={item.vaccinationName}
              color={vaccinePreset?.color ?? "#7c3aed"}
            />
            <DRow
              icon="calendar-outline"
              label="Last Vacc."
              value={item.lastVaccinationDate}
              color="#7c3aed"
            />
            <DRow
              icon="calendar-outline"
              label="Next Vacc."
              value={item.nextVaccinationDate}
              color="#16a34a"
            />
            <Text style={c.secLabel}>Health Issues</Text>
            <DRow
              icon="bandage-outline"
              label="Last Issue"
              value={item.lastIssueName}
              color="#ea580c"
            />
            <DRow
              icon="calendar-outline"
              label="Last Issue Date"
              value={item.lastIssueDate}
              color="#ea580c"
            />
            <DRow
              icon="alert-circle-outline"
              label="Current Issue"
              value={item.currentIssueName}
              color="#dc2626"
            />
            <DRow
              icon="calendar-outline"
              label="Issue Date"
              value={item.currentIssueDate}
              color="#dc2626"
            />
            <Text style={c.secLabel}>🔬 Treatment</Text>
            <DRow
              icon="medical-outline"
              label="Treatment"
              value={item.treatmentGiven}
              color="#0891b2"
            />
            <DRow
              icon="flask-outline"
              label="Medicine"
              value={item.medicineName}
              color="#0891b2"
            />
            <DRow
              icon="person-outline"
              label="Doctor"
              value={item.doctorName}
              color="#0891b2"
            />
            {item.notes && (
              <View style={c.notesBox}>
                <Ionicons name="chatbubble-outline" size={13} color="#64748b" />
                <Text style={c.notesText}>{item.notes}</Text>
              </View>
            )}
            <View style={c.actionRow}>
              <TouchableOpacity
                style={[c.actionBtn, c.editBtn]}
                onPress={() => onEdit(item)}
                activeOpacity={0.8}
              >
                <Ionicons name="create-outline" size={15} color="#ea580c" />
                <Text style={[c.actionText, { color: "#ea580c" }]}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[c.actionBtn, c.deleteBtn]}
                onPress={() => onDelete(item)}
                activeOpacity={0.8}
              >
                <Ionicons name="trash-outline" size={15} color="#dc2626" />
                <Text style={[c.actionText, { color: "#dc2626" }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </Animated.View>
  );
}

function CategoryPicker({
  value,
  onChange,
}: {
  value: MedicineCategory;
  onChange: (v: MedicineCategory) => void;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={f.label}>CATEGORY</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {MED_CATEGORIES.map((cat) => {
          const active = value === cat.value;
          return (
            <TouchableOpacity
              key={cat.value}
              onPress={() => onChange(cat.value)}
              style={[
                mcp.chip,
                active && {
                  backgroundColor: cat.color,
                  borderColor: cat.color,
                },
              ]}
              activeOpacity={0.8}
            >
              <Ionicons
                name={cat.icon as any}
                size={12}
                color={active ? "#fff" : cat.color}
              />
              <Text style={[mcp.label, active && { color: "#fff" }]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

function UnitPicker({
  value,
  onChange,
}: {
  value: MedicineUnit;
  onChange: (v: MedicineUnit) => void;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={f.label}>UNIT</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {MED_UNITS.map((u) => {
          const active = value === u;
          return (
            <TouchableOpacity
              key={u}
              onPress={() => onChange(u)}
              style={[mup.chip, active && mup.active]}
              activeOpacity={0.8}
            >
              <Text style={[mup.label, active && { color: "#fff" }]}>{u}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

function MedicineFormModal({
  visible,
  onClose,
  onSave,
  editMedicine,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (m: Medicine) => void;
  editMedicine: Medicine | null;
}) {
  const isEdit = !!editMedicine;
  const [form, setForm] = useState<MedicineCreate>(EMPTY_MED_FORM);
  const [submitting, setSub] = useState(false);

  useEffect(() => {
    if (editMedicine) {
      setForm({
        name: editMedicine.name,
        category: editMedicine.category,
        unit: editMedicine.unit,
        description: editMedicine.description ?? "",
        manufacturer: editMedicine.manufacturer ?? "",
        batch_number: editMedicine.batch_number ?? "",
        expiry_date: editMedicine.expiry_date ?? "",
        purchase_date: editMedicine.purchase_date ?? "",
        cost_per_unit: editMedicine.cost_per_unit,
        current_stock: editMedicine.current_stock,
        min_stock_alert: editMedicine.min_stock_alert,
        storage_instructions: editMedicine.storage_instructions ?? "",
        notes: editMedicine.notes ?? "",
      });
    } else {
      setForm(EMPTY_MED_FORM);
    }
  }, [editMedicine, visible]);

  const setF = (k: keyof MedicineCreate) => (v: any) =>
    setForm((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.name.trim()) {
      Alert.alert("Missing Field", "Please enter a medicine name.");
      return;
    }
    setSub(true);
    try {
      const payload: any = { ...form };
      Object.keys(payload).forEach((k) => {
        if (payload[k] === "") payload[k] = undefined;
      });
      const result: Medicine =
        isEdit && editMedicine
          ? await (api as any).updateMedicine(editMedicine.id, payload)
          : await (api as any).createMedicine(payload);
      onSave(result);
      onClose();
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Failed to save.");
    } finally {
      setSub(false);
    }
  };

  const accent = isEdit ? "#ea580c" : "#16a34a";
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={mo.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ width: "100%" }}
        >
          <View style={mo.sheet}>
            <View style={mo.handle} />
            <View style={mo.header}>
              <View style={[mo.iconWrap, { backgroundColor: accent + "18" }]}>
                <Ionicons
                  name={isEdit ? "create" : "add-circle"}
                  size={18}
                  color={accent}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={mo.title}>
                  {isEdit ? "Edit Medicine" : "Add Medicine"}
                </Text>
                {isEdit && editMedicine && (
                  <Text style={mo.subTitle}>{editMedicine.name}</Text>
                )}
              </View>
              <TouchableOpacity onPress={onClose} style={mo.closeBtn}>
                <Ionicons name="close" size={18} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 530 }}
              keyboardShouldPersistTaps="handled"
            >
              <Sec
                title="Medicine Details"
                icon="medkit-outline"
                color="#16a34a"
              />
              <Field
                label="MEDICINE NAME"
                value={form.name}
                onChange={setF("name")}
                placeholder="e.g. Oxytetracycline"
                icon="text-outline"
                color="#16a34a"
              />
              <CategoryPicker
                value={form.category}
                onChange={setF("category")}
              />
              <UnitPicker value={form.unit} onChange={setF("unit")} />
              <Field
                label="MANUFACTURER"
                value={form.manufacturer}
                onChange={setF("manufacturer")}
                placeholder="e.g. Pfizer"
                icon="business-outline"
              />
              <Field
                label="DESCRIPTION"
                value={form.description}
                onChange={setF("description")}
                placeholder="Short description..."
                icon="document-text-outline"
                multiline
              />
              <Sec
                title="Stock & Pricing"
                icon="cube-outline"
                color="#0891b2"
              />
              <View style={f.twoCol}>
                <View style={{ flex: 1 }}>
                  <Field
                    label={`STOCK (${form.unit})`}
                    value={
                      form.current_stock != null
                        ? String(form.current_stock)
                        : ""
                    }
                    onChange={(v: string) =>
                      setF("current_stock")(parseFloat(v) || 0)
                    }
                    placeholder="0"
                    icon="layers-outline"
                    keyboardType="numeric"
                    color="#0891b2"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Field
                    label="ALERT BELOW"
                    value={
                      form.min_stock_alert != null
                        ? String(form.min_stock_alert)
                        : ""
                    }
                    onChange={(v: string) =>
                      setF("min_stock_alert")(v ? parseFloat(v) : undefined)
                    }
                    placeholder="e.g. 5"
                    icon="notifications-outline"
                    keyboardType="numeric"
                    color="#ea580c"
                  />
                </View>
              </View>
              <Field
                label="COST PER UNIT (₹)"
                value={
                  form.cost_per_unit != null ? String(form.cost_per_unit) : ""
                }
                onChange={(v: string) =>
                  setF("cost_per_unit")(v ? parseFloat(v) : undefined)
                }
                placeholder="e.g. 12.5"
                icon="cash-outline"
                keyboardType="numeric"
                color="#16a34a"
              />
              <Sec
                title="Batch & Expiry"
                icon="calendar-outline"
                color="#7c3aed"
              />
              <Field
                label="BATCH NUMBER"
                value={form.batch_number}
                onChange={setF("batch_number")}
                placeholder="e.g. BN2024-01"
                icon="barcode-outline"
                color="#7c3aed"
              />
              <View style={f.twoCol}>
                <View style={{ flex: 1 }}>
                  <Field
                    label="PURCHASE DATE"
                    value={form.purchase_date}
                    onChange={setF("purchase_date")}
                    placeholder="DD/MM/YYYY"
                    icon="calendar-outline"
                    color="#7c3aed"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Field
                    label="EXPIRY DATE"
                    value={form.expiry_date}
                    onChange={setF("expiry_date")}
                    placeholder="DD/MM/YYYY"
                    icon="calendar-outline"
                    color="#dc2626"
                  />
                </View>
              </View>
              <Sec
                title="Notes"
                icon="information-circle-outline"
                color="#6b7280"
              />
              <Field
                label="STORAGE"
                value={form.storage_instructions}
                onChange={setF("storage_instructions")}
                placeholder="e.g. Store below 25°C"
                icon="thermometer-outline"
                multiline
              />
              <Field
                label="NOTES"
                value={form.notes}
                onChange={setF("notes")}
                placeholder="Any additional notes..."
                icon="chatbubble-outline"
                multiline
              />
              <View style={{ height: 16 }} />
            </ScrollView>
            <TouchableOpacity
              onPress={submit}
              style={[
                mo.submitBtn,
                { backgroundColor: accent },
                submitting && { opacity: 0.6 },
              ]}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons
                    name={isEdit ? "save-outline" : "checkmark-circle-outline"}
                    size={18}
                    color="#fff"
                  />
                  <Text style={mo.submitText}>
                    {isEdit ? "Save Changes" : "Add Medicine"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function QuickActionModal({
  visible,
  onClose,
  medicine,
  action,
  onDone,
}: {
  visible: boolean;
  onClose: () => void;
  medicine: Medicine | null;
  action: "use" | "restock" | "adjust";
  onDone: (updated: Medicine) => void;
}) {
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSub] = useState(false);
  useEffect(() => {
    setQty("");
    setNote("");
  }, [visible]);
  if (!medicine) return null;

  const colors = { use: "#dc2626", restock: "#16a34a", adjust: "#0891b2" };
  const titles = {
    use: "Use Medicine",
    restock: "Restock",
    adjust: "Adjust Stock",
  };
  const icons = {
    use: "medical-outline",
    restock: "arrow-up-circle-outline",
    adjust: "settings-outline",
  };
  const accent = colors[action];

  const submit = async () => {
    const amount = parseFloat(qty);
    if (!amount || amount <= 0) {
      Alert.alert("Invalid", "Enter a valid quantity.");
      return;
    }
    setSub(true);
    try {
      if (action === "use") {
        await (api as any).useMedicine({
          medicine_id: medicine.id,
          cow_id: "manual",
          cow_name: "Manual",
          cow_tag: "—",
          quantity_used: amount,
          date: todayYMD(),
          notes: note || undefined,
        });
      } else if (action === "restock") {
        await (api as any).restockMedicine(medicine.id, {
          medicine_id: medicine.id,
          quantity_added: amount,
          notes: note || undefined,
          purchase_date: todayYMD().split("-").reverse().join("/"),
        });
      } else {
        await (api as any).adjustMedicineStock(medicine.id, {
          medicine_id: medicine.id,
          new_quantity: amount,
          reason: note || undefined,
        });
      }
      const updated = await (api as any).getMedicine(medicine.id);
      onDone(updated);
      onClose();
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Operation failed.");
    } finally {
      setSub(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <TouchableOpacity
          style={qa.overlay}
          activeOpacity={1}
          onPress={onClose}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={qa.sheet}
            onPress={() => {}}
          >
            <View style={[qa.headerBar, { backgroundColor: accent + "12" }]}>
              <Ionicons name={icons[action] as any} size={22} color={accent} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[qa.title, { color: accent }]}>
                  {titles[action]}
                </Text>
                <Text style={qa.subTitle}>{medicine.name}</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={qa.closeBtn}>
                <Ionicons name="close" size={16} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <View style={qa.stockRow}>
              <Ionicons name="cube-outline" size={13} color="#64748b" />
              <Text style={qa.stockLabel}>Current Stock:</Text>
              <Text style={[qa.stockVal, { color: accent }]}>
                {medicine.current_stock} {medicine.unit}
              </Text>
            </View>
            <Text style={f.label}>
              {action === "adjust" ? "NEW STOCK LEVEL" : "QUANTITY"} (
              {medicine.unit})
            </Text>
            <View
              style={[
                f.row,
                {
                  marginBottom: 10,
                  borderColor: accent,
                  backgroundColor: "#fff",
                },
              ]}
            >
              <Ionicons
                name="calculator-outline"
                size={14}
                color={accent}
                style={{ marginRight: 8 }}
              />
              <TextInput
                style={f.input}
                value={qty}
                onChangeText={setQty}
                placeholder="0"
                placeholderTextColor="#d1d5db"
                keyboardType="numeric"
                autoFocus
              />
              <Text style={{ color: "#94a3b8", fontWeight: "600" }}>
                {medicine.unit}
              </Text>
            </View>
            <Text style={f.label}>NOTE (OPTIONAL)</Text>
            <View style={[f.row, { marginBottom: 16 }]}>
              <Ionicons
                name="chatbubble-outline"
                size={14}
                color="#9ca3af"
                style={{ marginRight: 8 }}
              />
              <TextInput
                style={f.input}
                value={note}
                onChangeText={setNote}
                placeholder="Add a note..."
                placeholderTextColor="#d1d5db"
              />
            </View>
            <TouchableOpacity
              onPress={submit}
              style={[
                mo.submitBtn,
                { backgroundColor: accent },
                submitting && { opacity: 0.6 },
              ]}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={18}
                    color="#fff"
                  />
                  <Text style={mo.submitText}>{titles[action]}</Text>
                </>
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function MedicineCard({
  item,
  index,
  onEdit,
  onDelete,
  onUse,
  onRestock,
  onAdjust,
}: {
  item: Medicine;
  index: number;
  onEdit: (m: Medicine) => void;
  onDelete: (m: Medicine) => void;
  onUse: (m: Medicine) => void;
  onRestock: (m: Medicine) => void;
  onAdjust: (m: Medicine) => void;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;
  const [expanded, setExpanded] = useState(false);
  const catMeta = getCatMeta(item.category);
  const sStock = stockStatus(item);
  const sExpiry = expiryStatus(item.expiry_date);
  const stockColor =
    sStock === "out" ? "#dc2626" : sStock === "low" ? "#ea580c" : "#16a34a";
  const expiryColor =
    sExpiry === "expired"
      ? "#dc2626"
      : sExpiry === "soon"
        ? "#ea580c"
        : "#16a34a";

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        delay: index * 55,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        delay: index * 55,
        tension: 68,
        friction: 12,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[mc.card, { opacity, transform: [{ translateY }] }]}>
      <View style={[mc.accent, { backgroundColor: catMeta.color }]} />
      <View style={{ padding: 14 }}>
        <TouchableOpacity
          onPress={() => setExpanded((e) => !e)}
          activeOpacity={0.85}
        >
          <View style={mc.topRow}>
            <View
              style={[
                mc.avatar,
                {
                  backgroundColor: catMeta.color + "18",
                  borderColor: catMeta.color + "44",
                },
              ]}
            >
              <Ionicons
                name={catMeta.icon as any}
                size={22}
                color={catMeta.color}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={mc.name} numberOfLines={1}>
                {item.name}
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  gap: 6,
                  marginTop: 3,
                  flexWrap: "wrap",
                }}
              >
                <View
                  style={[
                    mc.pill,
                    {
                      backgroundColor: catMeta.color + "15",
                      borderColor: catMeta.color + "44",
                    },
                  ]}
                >
                  <Text style={[mc.pillText, { color: catMeta.color }]}>
                    {item.category}
                  </Text>
                </View>
                <View
                  style={[
                    mc.pill,
                    {
                      backgroundColor: stockColor + "15",
                      borderColor: stockColor + "44",
                    },
                  ]}
                >
                  <View style={[mc.dot, { backgroundColor: stockColor }]} />
                  <Text style={[mc.pillText, { color: stockColor }]}>
                    {item.current_stock} {item.unit}
                  </Text>
                </View>
              </View>
            </View>
            <Ionicons
              name={expanded ? "chevron-up" : "chevron-down"}
              size={15}
              color="#cbd5e1"
              style={{ marginLeft: 6 }}
            />
          </View>
          <View
            style={{
              flexDirection: "row",
              gap: 6,
              marginTop: 10,
              flexWrap: "wrap",
            }}
          >
            {sStock !== "ok" && (
              <View
                style={[
                  mc.alertChip,
                  {
                    backgroundColor: stockColor + "12",
                    borderColor: stockColor + "44",
                  },
                ]}
              >
                <Ionicons name="warning-outline" size={10} color={stockColor} />
                <Text style={[mc.alertText, { color: stockColor }]}>
                  {sStock === "out" ? "Out of Stock" : "Low Stock"}
                </Text>
              </View>
            )}
            {sExpiry !== "ok" && item.expiry_date && (
              <View
                style={[
                  mc.alertChip,
                  {
                    backgroundColor: expiryColor + "12",
                    borderColor: expiryColor + "44",
                  },
                ]}
              >
                <Ionicons name="time-outline" size={10} color={expiryColor} />
                <Text style={[mc.alertText, { color: expiryColor }]}>
                  {sExpiry === "expired"
                    ? `Expired ${item.expiry_date}`
                    : `Expires ${item.expiry_date}`}
                </Text>
              </View>
            )}
            {item.manufacturer && (
              <View style={mc.alertChip}>
                <Ionicons name="business-outline" size={10} color="#64748b" />
                <Text style={[mc.alertText, { color: "#64748b" }]}>
                  {item.manufacturer}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
        {expanded && (
          <>
            <View style={mc.divider} />
            {item.batch_number && (
              <DRow
                icon="barcode-outline"
                label="Batch"
                value={item.batch_number}
                color={catMeta.color}
              />
            )}
            {item.purchase_date && (
              <DRow
                icon="calendar-outline"
                label="Purchased"
                value={item.purchase_date}
                color="#7c3aed"
              />
            )}
            {item.expiry_date && (
              <DRow
                icon="calendar-outline"
                label="Expiry"
                value={item.expiry_date}
                color={expiryColor}
              />
            )}
            {item.cost_per_unit != null && (
              <DRow
                icon="cash-outline"
                label="Cost/Unit"
                value={`₹ ${item.cost_per_unit}`}
                color="#16a34a"
              />
            )}
            {item.min_stock_alert != null && (
              <DRow
                icon="notifications-outline"
                label="Alert Below"
                value={`${item.min_stock_alert} ${item.unit}`}
                color="#ea580c"
              />
            )}
            {item.storage_instructions && (
              <DRow
                icon="thermometer-outline"
                label="Storage"
                value={item.storage_instructions}
              />
            )}
            {(item.description || item.notes) && (
              <View style={mc.notesBox}>
                <Ionicons name="chatbubble-outline" size={13} color="#64748b" />
                <Text style={mc.notesText}>
                  {item.description || item.notes}
                </Text>
              </View>
            )}
            <View style={mc.actionRow}>
              <TouchableOpacity
                style={[
                  mc.actionBtn,
                  { backgroundColor: "#fef2f2", borderColor: "#fecaca" },
                ]}
                onPress={() => onUse(item)}
                activeOpacity={0.8}
              >
                <Ionicons name="medical-outline" size={13} color="#dc2626" />
                <Text style={[mc.actionText, { color: "#dc2626" }]}>Use</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  mc.actionBtn,
                  { backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" },
                ]}
                onPress={() => onRestock(item)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="arrow-up-circle-outline"
                  size={13}
                  color="#16a34a"
                />
                <Text style={[mc.actionText, { color: "#16a34a" }]}>
                  Restock
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  mc.actionBtn,
                  { backgroundColor: "#ecfeff", borderColor: "#a5f3fc" },
                ]}
                onPress={() => onAdjust(item)}
                activeOpacity={0.8}
              >
                <Ionicons name="settings-outline" size={13} color="#0891b2" />
                <Text style={[mc.actionText, { color: "#0891b2" }]}>
                  Adjust
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  mc.actionBtn,
                  { backgroundColor: "#fff7ed", borderColor: "#fed7aa" },
                ]}
                onPress={() => onEdit(item)}
                activeOpacity={0.8}
              >
                <Ionicons name="create-outline" size={13} color="#ea580c" />
                <Text style={[mc.actionText, { color: "#ea580c" }]}>Edit</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[
                mc.actionBtn,
                {
                  backgroundColor: "#fff1f2",
                  borderColor: "#fecdd3",
                  marginTop: 6,
                  flex: 0,
                  justifyContent: "center",
                  paddingHorizontal: 16,
                },
              ]}
              onPress={() => onDelete(item)}
              activeOpacity={0.8}
            >
              <Ionicons name="trash-outline" size={13} color="#dc2626" />
              <Text style={[mc.actionText, { color: "#dc2626" }]}>Delete</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </Animated.View>
  );
}

// MAIN SCREEN
type ActiveTab = "records" | "stock";
type ActiveScreen = "home" | "list";

export default function MedicalScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<ActiveTab>("records");

  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [recScreen, setRecScreen] = useState<ActiveScreen>("home");
  const [recSearch, setRecSearch] = useState("");
  const [filterStatus, setFilter] = useState<"all" | "healthy" | "unhealthy">(
    "all",
  );
  const [medFormVisible, setMedFormVisible] = useState(false);
  const [editRecord, setEditRecord] = useState<MedicalRecord | null>(null);
  const [recLoading, setRecLoading] = useState(false);
  const [recRefreshing, setRecRefreshing] = useState(false);
  const [recError, setRecError] = useState<string | null>(null);

  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [medSummary, setMedSummary] = useState<MedicineStockSummary | null>(
    null,
  );
  const [stockScreen, setStockScreen] = useState<ActiveScreen>("home");
  const [stockSearch, setStockSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [stockLoading, setStockLoading] = useState(false);
  const [stockRefreshing, setStockRefreshing] = useState(false);
  const [stockError, setStockError] = useState<string | null>(null);
  const [stockFormVisible, setStockFormVisible] = useState(false);
  const [editMedicine, setEditMedicine] = useState<Medicine | null>(null);
  const [actionMed, setActionMed] = useState<Medicine | null>(null);
  const [actionType, setActionType] = useState<"use" | "restock" | "adjust">(
    "use",
  );
  const [actionVisible, setActionVisible] = useState(false);

  const fetchRecords = useCallback(async (q?: string, status?: string) => {
    setRecLoading(true);
    setRecError(null);
    try {
      const [data, cowsData] = await Promise.all([
        api.getMedicalRecords(q, status === "all" ? undefined : status),
        api.getCows().catch(() => []),
      ]);

      const cowTypeMap: Record<string, string> = {};
      for (const cow of cowsData) {
        cowTypeMap[cow.tag] = cow.type;
      }

      const enriched = data.map((r: MedicalRecord) => ({
        ...r,
        cowType: cowTypeMap[r.cowSrNo] ?? "mature",
      }));

      setRecords(enriched);
    } catch (err: any) {
      setRecError(err.message ?? "Failed to load.");
    } finally {
      setRecLoading(false);
    }
  }, []);

  const fetchMedicines = useCallback(async (q?: string, cat?: string) => {
    setStockLoading(true);
    setStockError(null);
    try {
      const [meds, sum] = await Promise.all([
        (api as any).getMedicines({
          search: q,
          category: cat === "all" ? undefined : cat,
        }),
        (api as any).getMedicineStockSummary(),
      ]);
      setMedicines(meds);
      setMedSummary(sum);
    } catch (err: any) {
      setStockError(err.message ?? "Failed to load.");
    } finally {
      setStockLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
    fetchMedicines();
  }, []);
  useEffect(() => {
    const t = setTimeout(
      () =>
        fetchRecords(
          recSearch || undefined,
          filterStatus === "all" ? undefined : filterStatus,
        ),
      400,
    );
    return () => clearTimeout(t);
  }, [recSearch, filterStatus]);
  useEffect(() => {
    const t = setTimeout(
      () => fetchMedicines(stockSearch || undefined, filterCat),
      400,
    );
    return () => clearTimeout(t);
  }, [stockSearch, filterCat]);

  const handleDeleteRecord = (r: MedicalRecord) => {
    Alert.alert(
      "Delete Record",
      `Delete medical record for ${r.cowSrNo}${r.cowName ? ` (${r.cowName})` : ""}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.deleteMedicalRecord(r.id);
              setRecords((p) => p.filter((x) => x.id !== r.id));
            } catch (err: any) {
              Alert.alert("Error", err.message);
            }
          },
        },
      ],
    );
  };

  const handleDeleteMedicine = (m: Medicine) => {
    Alert.alert("Delete Medicine", `Delete "${m.name}" from stock?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await (api as any).deleteMedicine(m.id);
            setMedicines((p) => p.filter((x) => x.id !== m.id));
            fetchMedicines();
          } catch (err: any) {
            Alert.alert("Error", err.message);
          }
        },
      },
    ]);
  };

  const openStockAction = (m: Medicine, type: "use" | "restock" | "adjust") => {
    setActionMed(m);
    setActionType(type);
    setActionVisible(true);
  };
  const handleActionDone = (updated: Medicine) => {
    setMedicines((p) => p.map((x) => (x.id === updated.id ? updated : x)));
    fetchMedicines();
  };
  const handleMedicineSave = (m: Medicine) => {
    setMedicines((p) => {
      const i = p.findIndex((x) => x.id === m.id);
      if (i >= 0) {
        const n = [...p];
        n[i] = m;
        return n;
      }
      return [m, ...p];
    });
    fetchMedicines();
    setStockScreen("list");
  };

  const healthy = records.filter((r) => r.currentStatus === "healthy").length;
  const unhealthy = records.filter(
    (r) => r.currentStatus === "unhealthy",
  ).length;
  const calfRecords = records.filter(
    (r) => r.cowAge && getCalfVaccineDates(r.cowAge) !== null,
  );
  const lowStockCount = medicines.filter((m) => stockStatus(m) !== "ok").length;
  const catOptions = ["all", ...MED_CATEGORIES.map((c) => c.value)];

  const backAction = () => {
    if (activeTab === "records") {
      if (recScreen === "list") {
        setRecScreen("home");
        return;
      }
    } else {
      if (stockScreen === "list") {
        setStockScreen("home");
        return;
      }
    }
    router.back();
  };

  // ── Stats data per tab
  const statsData =
    activeTab === "records"
      ? [
          { label: "Total", value: records.length, color: "#0f172a" },
          { label: "Healthy", value: healthy, color: "#16a34a" },
          { label: "Unhealthy", value: unhealthy, color: "#dc2626" },
          {
            label: "Vaccinated",
            value: records.filter((r) => !!r.vaccinationName).length,
            color: "#7c3aed",
          },
        ]
      : [
          {
            label: "Total",
            value: medSummary?.total_medicines ?? 0,
            color: "#0f172a",
          },
          {
            label: "Low Stock",
            value: medSummary?.low_stock_count ?? 0,
            color: "#ea580c",
          },
          {
            label: "Expiring",
            value: medSummary?.expiring_soon_count ?? 0,
            color: "#d97706",
          },
          {
            label: "Expired",
            value: medSummary?.expired_count ?? 0,
            color: "#dc2626",
          },
        ];

  // ── Records list header (scrolls away)
  const RecordsListHeader = () => (
    <View>
      {/* Stats */}
      <View style={[s.statsRow, { marginHorizontal: -14 }]}>
        {statsData.map((st, i, arr) => (
          <View
            key={i}
            style={[s.statItem, i < arr.length - 1 && s.statBorder]}
          >
            <Text style={[s.statValue, { color: st.color }]}>{st.value}</Text>
            <Text style={s.statLabel}>{st.label}</Text>
          </View>
        ))}
      </View>
      {/* Search */}
      <View style={[s.searchWrap, { marginHorizontal: 0, marginTop: 12 }]}>
        <Ionicons name="search-outline" size={15} color="#9ca3af" />
        <TextInput
          style={s.searchInput}
          placeholder="Search cow name or Sr. No..."
          placeholderTextColor="#d1d5db"
          value={recSearch}
          onChangeText={setRecSearch}
        />
        {recSearch.length > 0 && (
          <TouchableOpacity onPress={() => setRecSearch("")}>
            <Ionicons name="close-circle" size={15} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>
      {/* Filters */}
      <View style={[s.filterRow, { paddingHorizontal: 0 }]}>
        {(["all", "healthy", "unhealthy"] as const).map((fil) => (
          <TouchableOpacity
            key={fil}
            style={[s.filterTab, filterStatus === fil && s.filterTabActive]}
            onPress={() => setFilter(fil)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                s.filterTabText,
                filterStatus === fil && s.filterTabTextActive,
              ]}
            >
              {fil === "all"
                ? "All"
                : fil === "healthy"
                  ? "✅ Healthy"
                  : "🤒 Unhealthy"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // ── Stock list header (scrolls away)
  const StockListHeader = () => (
    <View>
      {/* Stats */}
      <View style={[s.statsRow, { marginHorizontal: -14 }]}>
        {statsData.map((st, i, arr) => (
          <View
            key={i}
            style={[s.statItem, i < arr.length - 1 && s.statBorder]}
          >
            <Text style={[s.statValue, { color: st.color }]}>{st.value}</Text>
            <Text style={s.statLabel}>{st.label}</Text>
          </View>
        ))}
      </View>
      {/* Search */}
      <View style={[s.searchWrap, { marginHorizontal: 0, marginTop: 12 }]}>
        <Ionicons name="search-outline" size={15} color="#9ca3af" />
        <TextInput
          style={s.searchInput}
          placeholder="Search medicines..."
          placeholderTextColor="#d1d5db"
          value={stockSearch}
          onChangeText={setStockSearch}
        />
        {stockSearch.length > 0 && (
          <TouchableOpacity onPress={() => setStockSearch("")}>
            <Ionicons name="close-circle" size={15} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>
      {/* Category filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 8 }}
        contentContainerStyle={{ gap: 8 }}
      >
        {catOptions.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[s.filterTab, filterCat === cat && s.filterTabActive]}
            onPress={() => setFilterCat(cat)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                s.filterTabText,
                filterCat === cat && s.filterTabTextActive,
              ]}
            >
              {cat === "all" ? "All" : cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── Fixed Header ── */}
      <View style={s.header}>
        <TouchableOpacity onPress={backAction} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.headerTitle}>
            {activeTab === "records" ? "Medical Records" : "Medicine Stock"}
          </Text>
          <Text style={s.headerSub}>
            {activeTab === "records"
              ? `${records.length} records`
              : `${medicines.length} medicines`}
          </Text>
        </View>
        {activeTab === "stock" && lowStockCount > 0 && (
          <View
            style={[
              s.countBadge,
              { backgroundColor: "#fff7ed", borderColor: "#fed7aa" },
            ]}
          >
            <Ionicons name="warning-outline" size={11} color="#ea580c" />
            <Text style={[s.countText, { color: "#ea580c" }]}>
              {lowStockCount} alerts
            </Text>
          </View>
        )}
        {activeTab === "records" && (
          <View style={s.countBadge}>
            <Text style={s.countText}>{records.length}</Text>
          </View>
        )}
      </View>

      {/* ── Fixed Tab Bar ── */}
      <View style={s.tabBar}>
        <TouchableOpacity
          style={[s.tab, activeTab === "records" && s.tabActive]}
          onPress={() => setActiveTab("records")}
          activeOpacity={0.8}
        >
          <Ionicons
            name="heart-outline"
            size={15}
            color={activeTab === "records" ? "#16a34a" : "#9ca3af"}
          />
          <Text style={[s.tabText, activeTab === "records" && s.tabTextActive]}>
            Medical Records
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            s.tab,
            activeTab === "stock" && [
              s.tabActive,
              { borderBottomColor: "#0891b2" },
            ],
          ]}
          onPress={() => setActiveTab("stock")}
          activeOpacity={0.8}
        >
          <Ionicons
            name="medkit-outline"
            size={15}
            color={activeTab === "stock" ? "#0891b2" : "#9ca3af"}
          />
          <Text
            style={[
              s.tabText,
              activeTab === "stock" && [s.tabTextActive, { color: "#0891b2" }],
            ]}
          >
            Medicine Stock
          </Text>
          {lowStockCount > 0 && (
            <View style={s.tabBadge}>
              <Text style={s.tabBadgeText}>{lowStockCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ── RECORDS TAB ── */}
      {activeTab === "records" && (
        <>
          {recScreen === "home" ? (
            // Home screen keeps stats inline (not a list)
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={s.homeBody}
              showsVerticalScrollIndicator={false}
            >
              {/* Stats scroll with home content */}
              <View
                style={[s.statsRow, { marginHorizontal: -16, marginTop: -20 }]}
              >
                {statsData.map((st, i, arr) => (
                  <View
                    key={i}
                    style={[s.statItem, i < arr.length - 1 && s.statBorder]}
                  >
                    <Text style={[s.statValue, { color: st.color }]}>
                      {st.value}
                    </Text>
                    <Text style={s.statLabel}>{st.label}</Text>
                  </View>
                ))}
              </View>
              <View style={{ height: 20 }} />
              <View style={s.heroWrap}>
                <Text style={s.homeHeading}>Medical Records</Text>
                <Text style={s.homeSub}>
                  Track health, vaccination & treatment for each cow
                </Text>
              </View>
              <View style={s.btnGroup}>
                <TouchableOpacity
                  onPress={() => {
                    setEditRecord(null);
                    setMedFormVisible(true);
                  }}
                  style={s.bigBtn}
                  activeOpacity={0.85}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={s.bigBtnTitle}>Add Medical Record</Text>
                    <Text style={s.bigBtnSub}>
                      Register a new cow health record
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setRecScreen("list")}
                  style={s.bigBtn}
                  activeOpacity={0.85}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={s.bigBtnTitle}>View All Records</Text>
                    <Text style={s.bigBtnSub}>
                      Browse {records.length} medical records
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
              <View style={s.summaryRow}>
                {[
                  {
                    label: "Healthy",
                    val: healthy,
                    color: "#16a34a",
                    bg: "#f0fdf4",
                    border: "#bbf7d0",
                    emoji: "✅",
                    filterVal: "healthy" as const,
                  },
                  {
                    label: "Unhealthy",
                    val: unhealthy,
                    color: "#dc2626",
                    bg: "#fff1f2",
                    border: "#fecdd3",
                    emoji: "🤒",
                    filterVal: "unhealthy" as const,
                  },
                  {
                    label: "Scheduled",
                    val: records.filter((r) => !!r.nextVaccinationDate).length,
                    color: "#7c3aed",
                    bg: "#faf5ff",
                    border: "#e9d5ff",
                    emoji: "💉",
                    filterVal: null,
                  },
                ].map((sc, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[
                      s.summaryCard,
                      { backgroundColor: sc.bg, borderColor: sc.border },
                    ]}
                    onPress={() => {
                      if (sc.filterVal) {
                        setFilter(sc.filterVal);
                        setRecScreen("list");
                      }
                    }}
                    activeOpacity={sc.filterVal ? 0.8 : 1}
                  >
                    <Text style={s.summaryEmoji}>{sc.emoji}</Text>
                    <Text style={[s.summaryCount, { color: sc.color }]}>
                      {sc.val}
                    </Text>
                    <Text style={[s.summaryLabel, { color: sc.color }]}>
                      {sc.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {calfRecords.length > 0 && (
                <View style={{ marginTop: 22 }}>
                  <View style={s.calfSectionHeader}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <Text style={{ fontSize: 18 }}>🐄</Text>
                      <Text style={s.calfSectionTitle}>
                        Calf Vaccine Schedule
                      </Text>
                    </View>
                    <View style={s.calfCountBadge}>
                      <Text style={s.calfCountText}>{calfRecords.length}</Text>
                    </View>
                  </View>
                  <Text style={s.calfSectionSub}>
                    Auto-calculated from calf birth date
                  </Text>
                  {calfRecords.map((r) => (
                    <CalfVaccineCard key={r.id} record={r} />
                  ))}
                </View>
              )}
            </ScrollView>
          ) : (
            // List screen: stats + search + filters scroll away with cards
            <View style={{ flex: 1 }}>
              {recLoading && records.length === 0 ? (
                <View style={s.loadingWrap}>
                  <ActivityIndicator size="large" color="#16a34a" />
                  <Text style={s.loadingText}>Loading records...</Text>
                </View>
              ) : recError ? (
                <View style={s.errorWrap}>
                  <Text style={{ fontSize: 36 }}>⚠️</Text>
                  <Text style={s.errorText}>{recError}</Text>
                  <TouchableOpacity
                    onPress={() => fetchRecords()}
                    style={s.retryBtn}
                  >
                    <Ionicons name="refresh" size={14} color="#fff" />
                    <Text style={s.retryText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <FlatList
                  data={records}
                  keyExtractor={(item) => item.id}
                  ListHeaderComponent={<RecordsListHeader />}
                  contentContainerStyle={{
                    paddingHorizontal: 14,
                    paddingTop: 0,
                    paddingBottom: 100,
                  }}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="on-drag"
                  refreshControl={
                    <RefreshControl
                      refreshing={recRefreshing}
                      onRefresh={async () => {
                        setRecRefreshing(true);
                        await fetchRecords(
                          recSearch || undefined,
                          filterStatus === "all" ? undefined : filterStatus,
                        );
                        setRecRefreshing(false);
                      }}
                      tintColor="#16a34a"
                    />
                  }
                  renderItem={({ item, index }) => (
                    <MedicalCard
                      item={item}
                      index={index}
                      onEdit={(r) => {
                        setEditRecord(r);
                        setMedFormVisible(true);
                      }}
                      onDelete={handleDeleteRecord}
                    />
                  )}
                  ListEmptyComponent={
                    <View style={s.empty}>
                      <Text style={{ fontSize: 44 }}>🏥</Text>
                      <Text style={s.emptyText}>No records found</Text>
                      <TouchableOpacity
                        onPress={() => {
                          setEditRecord(null);
                          setMedFormVisible(true);
                        }}
                        style={s.emptyBtn}
                      >
                        <Ionicons name="add" size={14} color="#fff" />
                        <Text style={s.emptyBtnText}>Add First Record</Text>
                      </TouchableOpacity>
                    </View>
                  }
                />
              )}
              <TouchableOpacity
                onPress={() => {
                  setEditRecord(null);
                  setMedFormVisible(true);
                }}
                style={[s.fab, { backgroundColor: "#16a34a" }]}
              >
                <Ionicons name="add" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      {/* ── STOCK TAB ── */}
      {activeTab === "stock" && (
        <>
          {stockScreen === "home" ? (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={s.homeBody}
              showsVerticalScrollIndicator={false}
            >
              {/* Stats scroll with home content */}
              <View
                style={[s.statsRow, { marginHorizontal: -16, marginTop: -20 }]}
              >
                {statsData.map((st, i, arr) => (
                  <View
                    key={i}
                    style={[s.statItem, i < arr.length - 1 && s.statBorder]}
                  >
                    <Text style={[s.statValue, { color: st.color }]}>
                      {st.value}
                    </Text>
                    <Text style={s.statLabel}>{st.label}</Text>
                  </View>
                ))}
              </View>
              <View style={{ height: 20 }} />
              <View style={s.heroWrap}>
                <Text style={s.homeHeading}>Medicine Stock</Text>
                <Text style={s.homeSub}>
                  Track medicines, dosages & expiry dates
                </Text>
              </View>
              <View style={s.btnGroup}>
                <TouchableOpacity
                  onPress={() => {
                    setEditMedicine(null);
                    setStockFormVisible(true);
                  }}
                  style={s.bigBtn}
                  activeOpacity={0.85}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={s.bigBtnTitle}>Add Medicine</Text>
                    <Text style={s.bigBtnSub}>
                      Register a new medicine to stock
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setStockScreen("list")}
                  style={s.bigBtn}
                  activeOpacity={0.85}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={s.bigBtnTitle}>View All Medicines</Text>
                    <Text style={s.bigBtnSub}>
                      Browse {medicines.length} medicines
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
              <View style={s.summaryRow}>
                {[
                  {
                    label: "In Stock",
                    val: medicines.filter((m) => stockStatus(m) === "ok")
                      .length,
                    color: "#16a34a",
                    bg: "#f0fdf4",
                    border: "#bbf7d0",
                    emoji: "✅",
                  },
                  {
                    label: "Low/Out",
                    val: medicines.filter((m) => stockStatus(m) !== "ok")
                      .length,
                    color: "#ea580c",
                    bg: "#fff7ed",
                    border: "#fed7aa",
                    emoji: "⚠️",
                  },
                  {
                    label: "Expiring",
                    val: medSummary?.expiring_soon_count ?? 0,
                    color: "#d97706",
                    bg: "#fffbeb",
                    border: "#fde68a",
                    emoji: "📅",
                  },
                ].map((sc, i) => (
                  <View
                    key={i}
                    style={[
                      s.summaryCard,
                      { backgroundColor: sc.bg, borderColor: sc.border },
                    ]}
                  >
                    <Text style={s.summaryEmoji}>{sc.emoji}</Text>
                    <Text style={[s.summaryCount, { color: sc.color }]}>
                      {sc.val}
                    </Text>
                    <Text style={[s.summaryLabel, { color: sc.color }]}>
                      {sc.label}
                    </Text>
                  </View>
                ))}
              </View>
              {medSummary && medSummary.total_stock_value > 0 && (
                <View style={s.valueBanner}>
                  <Ionicons name="cash-outline" size={18} color="#16a34a" />
                  <Text style={s.valueBannerText}>Total Stock Value</Text>
                  <Text style={s.valueBannerAmt}>
                    ₹{" "}
                    {medSummary.total_stock_value.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </Text>
                </View>
              )}
              {medicines.filter((m) => stockStatus(m) !== "ok").length > 0 && (
                <View style={{ marginTop: 18 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "800",
                        color: "#0f172a",
                      }}
                    >
                      ⚠️ Needs Attention
                    </Text>
                    <TouchableOpacity onPress={() => setStockScreen("list")}>
                      <Text
                        style={{
                          fontSize: 12,
                          color: "#0891b2",
                          fontWeight: "700",
                        }}
                      >
                        View All
                      </Text>
                    </TouchableOpacity>
                  </View>
                  {medicines
                    .filter((m) => stockStatus(m) !== "ok")
                    .slice(0, 3)
                    .map((m) => {
                      const catMeta = getCatMeta(m.category);
                      const sStock = stockStatus(m);
                      const sc = sStock === "out" ? "#dc2626" : "#ea580c";
                      return (
                        <View
                          key={m.id}
                          style={[s.alertRow, { borderLeftColor: sc }]}
                        >
                          <Ionicons
                            name={catMeta.icon as any}
                            size={16}
                            color={catMeta.color}
                          />
                          <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={s.alertName}>{m.name}</Text>
                            <Text style={[s.alertSub, { color: sc }]}>
                              {sStock === "out"
                                ? "Out of stock"
                                : `Low: ${m.current_stock} ${m.unit} left`}
                            </Text>
                          </View>
                          <TouchableOpacity
                            style={[
                              s.alertActionBtn,
                              {
                                borderColor: "#bbf7d0",
                                backgroundColor: "#f0fdf4",
                              },
                            ]}
                            onPress={() => openStockAction(m, "restock")}
                            activeOpacity={0.8}
                          >
                            <Text
                              style={{
                                fontSize: 11,
                                fontWeight: "700",
                                color: "#16a34a",
                              }}
                            >
                              Restock
                            </Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                </View>
              )}
            </ScrollView>
          ) : (
            // List screen: stats + search + category filter scroll away
            <View style={{ flex: 1 }}>
              {stockLoading && medicines.length === 0 ? (
                <View style={s.loadingWrap}>
                  <ActivityIndicator size="large" color="#0891b2" />
                  <Text style={s.loadingText}>Loading medicines...</Text>
                </View>
              ) : stockError ? (
                <View style={s.errorWrap}>
                  <Text style={{ fontSize: 36 }}>⚠️</Text>
                  <Text style={s.errorText}>{stockError}</Text>
                  <TouchableOpacity
                    onPress={() => fetchMedicines()}
                    style={[s.retryBtn, { backgroundColor: "#0891b2" }]}
                  >
                    <Ionicons name="refresh" size={14} color="#fff" />
                    <Text style={s.retryText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <FlatList
                  data={medicines}
                  keyExtractor={(item) => item.id}
                  ListHeaderComponent={<StockListHeader />}
                  contentContainerStyle={{
                    paddingHorizontal: 14,
                    paddingTop: 0,
                    paddingBottom: 100,
                  }}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="on-drag"
                  refreshControl={
                    <RefreshControl
                      refreshing={stockRefreshing}
                      onRefresh={async () => {
                        setStockRefreshing(true);
                        await fetchMedicines(
                          stockSearch || undefined,
                          filterCat,
                        );
                        setStockRefreshing(false);
                      }}
                      tintColor="#0891b2"
                    />
                  }
                  renderItem={({ item, index }) => (
                    <MedicineCard
                      item={item}
                      index={index}
                      onEdit={(m) => {
                        setEditMedicine(m);
                        setStockFormVisible(true);
                      }}
                      onDelete={handleDeleteMedicine}
                      onUse={(m) => openStockAction(m, "use")}
                      onRestock={(m) => openStockAction(m, "restock")}
                      onAdjust={(m) => openStockAction(m, "adjust")}
                    />
                  )}
                  ListEmptyComponent={
                    <View style={s.empty}>
                      <Text style={{ fontSize: 44 }}>💊</Text>
                      <Text style={s.emptyText}>No medicines found</Text>
                      <TouchableOpacity
                        onPress={() => {
                          setEditMedicine(null);
                          setStockFormVisible(true);
                        }}
                        style={[s.emptyBtn, { backgroundColor: "#0891b2" }]}
                      >
                        <Ionicons name="add" size={14} color="#fff" />
                        <Text style={s.emptyBtnText}>Add First Medicine</Text>
                      </TouchableOpacity>
                    </View>
                  }
                />
              )}
              <TouchableOpacity
                onPress={() => {
                  setEditMedicine(null);
                  setStockFormVisible(true);
                }}
                style={[s.fab, { backgroundColor: "#0891b2" }]}
              >
                <Ionicons name="add" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      {/* ── Modals ── */}
      <MedicalFormModal
        visible={medFormVisible}
        onClose={() => {
          setMedFormVisible(false);
          setEditRecord(null);
        }}
        editRecord={editRecord}
        onSave={(r) => {
          if (editRecord) {
            setRecords((p) => p.map((x) => (x.id === r.id ? r : x)));
          } else {
            setRecords((p) => [r, ...p]);
            setRecScreen("list");
          }
        }}
      />
      <MedicineFormModal
        visible={stockFormVisible}
        onClose={() => {
          setStockFormVisible(false);
          setEditMedicine(null);
        }}
        editMedicine={editMedicine}
        onSave={handleMedicineSave}
      />
      <QuickActionModal
        visible={actionVisible}
        onClose={() => setActionVisible(false)}
        medicine={actionMed}
        action={actionType}
        onDone={handleActionDone}
      />
    </View>
  );
}

// STYLES
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFF8F0" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFF8F0",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFF8F0",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#9cc1f1",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.4,
  },
  headerSub: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "500",
    marginTop: 1,
  },
  countBadge: {
    backgroundColor: "#FFF8F0",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#bbf7d0",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  countText: { fontSize: 12, fontWeight: "700", color: "#16a34a" },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2.5,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: "#16a34a" },
  tabText: { fontSize: 13, fontWeight: "600", color: "#9ca3af" },
  tabTextActive: { color: "#16a34a", fontWeight: "800" },
  tabBadge: {
    backgroundColor: "#ea580c",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tabBadgeText: { fontSize: 10, fontWeight: "800", color: "#fff" },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  statItem: { flex: 1, alignItems: "center", paddingVertical: 11 },
  statBorder: { borderRightWidth: 1, borderRightColor: "#f1f5f9" },
  statValue: { fontSize: 16, fontWeight: "800", letterSpacing: -0.3 },
  statLabel: {
    fontSize: 9,
    color: "#94a3b8",
    marginTop: 2,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  homeBody: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 50 },
  heroWrap: { alignItems: "center", marginBottom: 24 },
  homeHeading: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.4,
    marginBottom: 6,
    textAlign: "center",
  },
  homeSub: {
    fontSize: 14,
    color: "#94a3b8",
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 20,
  },
  btnGroup: { gap: 12, marginBottom: 20 },
  bigBtn: {
    backgroundColor: "#fdf6e5",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#ecd657",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  bigBtnTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  bigBtnSub: { fontSize: 12, color: "#94a3b8", fontWeight: "500" },
  summaryRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  summaryCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 12,
    alignItems: "center",
    gap: 4,
  },
  summaryEmoji: { fontSize: 20 },
  summaryCount: { fontSize: 20, fontWeight: "800", letterSpacing: -0.5 },
  summaryLabel: { fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  valueBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#f0fdf4",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: "#bbf7d0",
    marginBottom: 4,
  },
  valueBannerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#15803d",
  },
  valueBannerAmt: { fontSize: 16, fontWeight: "800", color: "#16a34a" },
  alertRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    borderLeftWidth: 3,
  },
  alertName: { fontSize: 13, fontWeight: "700", color: "#0f172a" },
  alertSub: { fontSize: 11, fontWeight: "600", marginTop: 1 },
  alertActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  calfSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  calfSectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.3,
  },
  calfSectionSub: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "500",
    marginBottom: 12,
  },
  calfCountBadge: {
    backgroundColor: "#fff7ed",
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#fed7aa",
  },
  calfCountText: { fontSize: 12, fontWeight: "700", color: "#ea580c" },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 14,
    marginTop: 12,
    marginBottom: 6,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: { flex: 1, color: "#0f172a", fontSize: 14 },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  filterTabActive: { backgroundColor: "#0f172a", borderColor: "#0f172a" },
  filterTabText: { fontSize: 12, fontWeight: "600", color: "#64748b" },
  filterTabTextActive: { color: "#fff" },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 15, color: "#94a3b8", fontWeight: "600" },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 4,
  },
  emptyBtnText: { fontSize: 13, fontWeight: "700", color: "#fff" },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: { fontSize: 14, color: "#94a3b8", fontWeight: "500" },
  errorWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    color: "#dc2626",
    fontWeight: "500",
    textAlign: "center",
    paddingHorizontal: 32,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#16a34a",
  },
  retryText: { fontSize: 13, fontWeight: "700", color: "#fff" },
});

const c = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  accent: { height: 3, width: "100%" },
  topRow: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  cowSr: { fontSize: 14, fontWeight: "800", color: "#0f172a" },
  cowName: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  agePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#f8fafc",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  agePillText: { fontSize: 10, color: "#64748b", fontWeight: "600" },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: "700" },
  chips: { flexDirection: "row", gap: 6, marginTop: 10, flexWrap: "wrap" },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 10, fontWeight: "700" },
  divider: { height: 1, backgroundColor: "#f1f5f9", marginVertical: 12 },
  secLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 6,
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  notesBox: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    padding: 10,
    marginTop: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  notesText: { flex: 1, fontSize: 12, color: "#475569", fontWeight: "500" },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  editBtn: { backgroundColor: "#fff7ed", borderColor: "#fed7aa" },
  deleteBtn: { backgroundColor: "#fff1f2", borderColor: "#fecdd3" },
  actionText: { fontSize: 13, fontWeight: "700" },
});

const mc = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  accent: { height: 3, width: "100%" },
  topRow: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  name: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.2,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillText: { fontSize: 10, fontWeight: "700" },
  dot: { width: 6, height: 6, borderRadius: 3 },
  alertChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: "#f8fafc",
    borderColor: "#e2e8f0",
  },
  alertText: { fontSize: 10, fontWeight: "700", color: "#64748b" },
  divider: { height: 1, backgroundColor: "#f1f5f9", marginVertical: 12 },
  notesBox: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    padding: 10,
    marginTop: 4,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  notesText: { flex: 1, fontSize: 12, color: "#475569", fontWeight: "500" },
  actionRow: { flexDirection: "row", gap: 8, marginTop: 14 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  actionText: { fontSize: 12, fontWeight: "700" },
});

const cv = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#fed7aa",
    overflow: "hidden",
  },
  accentBar: { height: 3, backgroundColor: "#ea580c", width: "100%" },
  header: { flexDirection: "row", alignItems: "center", padding: 14 },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#fff7ed",
    borderWidth: 1.5,
    borderColor: "#fed7aa",
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontSize: 14, fontWeight: "800", color: "#0f172a" },
  srNo: { fontSize: 11, color: "#94a3b8", fontWeight: "500", marginTop: 1 },
  calfBadge: {
    backgroundColor: "#fff7ed",
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "#fed7aa",
  },
  calfBadgeText: { fontSize: 10, fontWeight: "700", color: "#ea580c" },
  nextDueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  nextDueText: { fontSize: 11, color: "#ea580c", fontWeight: "600" },
  divider: { height: 1, backgroundColor: "#fef3c7", marginBottom: 12 },
  scheduleWrap: { paddingHorizontal: 14, paddingBottom: 16 },
  scheduleTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#92400e",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  scheduleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 0,
  },
  lineCol: { alignItems: "center", width: 16 },
  dot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, marginTop: 2 },
  line: { width: 2, height: 22, marginTop: 2 },
  scheduleContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 14,
  },
  scheduleLabel: { fontSize: 13, fontWeight: "600", color: "#64748b" },
  dateBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  dateText: { fontSize: 12, fontWeight: "700" },
});

const dr = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    gap: 8,
    marginBottom: 2,
  },
  iconBox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { flex: 1, fontSize: 12, color: "#64748b", fontWeight: "500" },
  value: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0f172a",
    maxWidth: "50%" as any,
    textAlign: "right",
  },
});

const f = StyleSheet.create({
  wrap: { marginBottom: 10 },
  label: {
    fontSize: 10,
    color: "#64748b",
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 5,
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  input: { flex: 1, color: "#0f172a", fontSize: 14, fontWeight: "500" },
  secRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderLeftWidth: 3,
    paddingLeft: 10,
    marginBottom: 10,
    marginTop: 8,
  },
  secTitle: { fontSize: 12, fontWeight: "700", letterSpacing: 0.2 },
  twoCol: { flexDirection: "row", gap: 10 },
  autoRow: { flexDirection: "row", gap: 6, flexWrap: "wrap", marginBottom: 10 },
  autoChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  autoChipText: { fontSize: 11, fontWeight: "600" },
});

const mo = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFF8F0",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: "#e2e8f0",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 18,
  },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.3,
  },
  subTitle: { fontSize: 12, color: "#94a3b8", marginTop: 1 },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: "auto" as any,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    paddingVertical: 15,
    gap: 8,
    marginTop: 10,
  },
  submitText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.2,
  },
});

const qa = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  sheet: { backgroundColor: "#fff", borderRadius: 20, padding: 18 },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  title: { fontSize: 16, fontWeight: "800" },
  subTitle: { fontSize: 12, color: "#64748b", marginTop: 1 },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  stockRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  stockLabel: { fontSize: 13, color: "#64748b", flex: 1 },
  stockVal: { fontSize: 14, fontWeight: "800" },
});

const st = StyleSheet.create({
  wrap: { flexDirection: "row", gap: 10, marginBottom: 12 },
  btn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: "#f8fafc",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
  },
  activeHealthy: { backgroundColor: "#16a34a", borderColor: "#16a34a" },
  activeUnhealthy: { backgroundColor: "#dc2626", borderColor: "#dc2626" },
  btnText: { fontSize: 14, fontWeight: "700", color: "#9ca3af" },
  activeText: { color: "#fff" },
});

const vp = StyleSheet.create({
  wrap: { marginBottom: 12 },
  chipRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#f8fafc",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
  },
  chipLabel: { fontSize: 13, fontWeight: "800", color: "#374151" },
  descHint: {
    fontSize: 11,
    color: "#7c3aed",
    fontWeight: "600",
    marginBottom: 6,
    paddingLeft: 2,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  inputFocused: { borderColor: "#7c3aed", backgroundColor: "#fff" },
  input: { flex: 1, color: "#0f172a", fontSize: 14, fontWeight: "500" },
});

const cs = StyleSheet.create({
  wrap: { marginBottom: 12 },
  label: {
    fontSize: 10,
    color: "#64748b",
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  selectBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f0fdf4",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#bbf7d0",
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  selectBtnText: { fontSize: 13, fontWeight: "700", color: "#16a34a" },
  orText: { fontSize: 12, color: "#94a3b8", fontWeight: "500" },
  manualTagBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  manualTagBtnText: { fontSize: 13, fontWeight: "600", color: "#6b7280" },
  useManualBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f0fdf4",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#bbf7d0",
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 6,
  },
  useManualText: { fontSize: 13, fontWeight: "700", color: "#16a34a" },
  selected: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#bbf7d0",
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  selTag: { fontSize: 14, fontWeight: "800", color: "#16a34a" },
  selMeta: { fontSize: 12, color: "#4ade80", fontWeight: "500", marginTop: 1 },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-start",
    paddingTop:
      Platform.OS === "ios" ? 60 : (StatusBar.currentHeight ?? 0) + 16,
    paddingBottom: 16,
  },
  sheet: {
    backgroundColor: "#fff",
    borderRadius: 20,
    marginHorizontal: 16,
    minHeight: 300,
    maxHeight: "80%",
    overflow: "hidden",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },
  sheetTitle: { fontSize: 16, fontWeight: "800", color: "#0f172a" },
  sheetClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 4,
  },
  searchInput: { flex: 1, color: "#0f172a", fontSize: 14 },
  countHint: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "500",
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  list: { flexGrow: 0 },
  cowRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f8fafc",
    gap: 10,
  },
  cowIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cowTag: { fontSize: 13, fontWeight: "700", color: "#0f172a" },
  cowMeta: { fontSize: 11, color: "#94a3b8", fontWeight: "500", marginTop: 1 },
  loadBox: { paddingVertical: 40, alignItems: "center", gap: 8 },
  loadText: { fontSize: 13, color: "#94a3b8" },
  emptyBox: { paddingVertical: 40, alignItems: "center", gap: 8 },
  emptyText: { fontSize: 14, color: "#94a3b8", fontWeight: "600" },
  footerLoader: { paddingVertical: 14, alignItems: "center", gap: 4 },
  footerLoaderText: { fontSize: 11, color: "#94a3b8" },
  loadMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  loadMoreText: { fontSize: 13, fontWeight: "700", color: "#16a34a" },
  endText: {
    fontSize: 11,
    color: "#cbd5e1",
    textAlign: "center",
    paddingVertical: 12,
  },
});

const mcp = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginRight: 8,
    backgroundColor: "#f8fafc",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
  },
  label: { fontSize: 12, fontWeight: "700", color: "#374151" },
});

const mup = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginRight: 8,
    backgroundColor: "#f8fafc",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
  },
  active: { backgroundColor: "#0f172a", borderColor: "#0f172a" },
  label: { fontSize: 12, fontWeight: "700", color: "#374151" },
});
