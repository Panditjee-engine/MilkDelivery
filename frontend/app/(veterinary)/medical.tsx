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
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../src/services/api";
import DateTimePicker from "@react-native-community/datetimepicker";

const bullImg = require("../../assets/images/bull-cow.png");
const calfImg = require("../../assets/images/calf-cow.png");
const cowImg = require("../../assets/images/icon-cow.png");

const getAnimalImage = (type?: string) => {
  if (type === "bull") return bullImg;
  if (type === "newborn") return calfImg;
  return cowImg;
};

// ── Error-message normalizer ────────────────────────────────────────────
// FastAPI 422 responses send `detail` as an ARRAY of objects, e.g.
// [{ loc: [...], msg: "field required", type: "..." }]. If your api.ts
// does `new Error(data.detail)` on that array, JS coerces it to a string
// via toString() → "[object Object]". This normalizes any shape safely,
// so it's always readable no matter what the request layer throws.
function getErrorMessage(err: any, fallback = "Something went wrong"): string {
  if (!err) return fallback;
  const raw = err?.message ?? err;
  if (typeof raw === "string" && raw && raw !== "[object Object]") return raw;
  const detail = err?.detail ?? err?.response?.data?.detail ?? raw;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const msgs = detail
      .map((d: any) => (typeof d === "string" ? d : d?.msg))
      .filter(Boolean);
    if (msgs.length) return msgs.join("\n");
  }
  if (detail && typeof detail === "object" && typeof detail.msg === "string") {
    return detail.msg;
  }
  return fallback;
}

// ── Types ──────────────────────────────────────────────────────────────
interface MedicalRecord {
  id: string;
  admin_id?: string;
  cowSrNo: string;
  cowName?: string;
  cowAge?: string;
  cowType?: string;
  cowPhoto?: string;
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
  lastDewormingDate?: string;
  nextDewormingDate?: string;
  dewormingMedicine?: string;
  added_by_vet?: boolean;
  vet_name?: string;
  created_at: string;
}

interface MedicalGroup {
  cowSrNo: string;
  cowName?: string;
  cowType?: string;
  cowPhoto?: string;
  cowAge?: string;
  records: MedicalRecord[];
}

type SortOption = "newest" | "oldest" | "name_asc" | "name_desc";
type DateRangeOption = "all_time" | "last_week" | "last_month" | "last_year";

interface VetCowOption {
  tag: string | undefined;
  id: string;
  tag_number?: string;
  name?: string;
  age?: string;
  breed?: string;
  type?: string;
  photo?: string;
  isLeasedOut?: boolean;
  isLeasedIn?: boolean;
  lessorFarmName?: string;
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
  lastDewormingDate: string;
  nextDewormingDate: string;
  dewormingMedicine: string;
}

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
  lastDewormingDate: "",
  nextDewormingDate: "",
  dewormingMedicine: "",
};

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

const COMMON_ISSUES = [
  { label: "Fever", icon: "thermometer-outline", color: "#dc2626" },
  { label: "Mastitis", icon: "water-outline", color: "#e11d48" },
  { label: "Bloat", icon: "resize-outline", color: "#ea580c" },
  { label: "Diarrhea", icon: "alert-circle-outline", color: "#d97706" },
  { label: "Lameness", icon: "footsteps-outline", color: "#9333ea" },
  { label: "Eye Infection", icon: "eye-outline", color: "#0891b2" },
  { label: "Skin Disease", icon: "body-outline", color: "#65a30d" },
  { label: "Respiratory", icon: "cloud-outline", color: "#6366f1" },
  { label: "Tick Infestation", icon: "bug-outline", color: "#b45309" },
  { label: "FMD", icon: "paw-outline", color: "#be123c" },
];

const CALF_VACCINE_SCHEDULE = [
  { label: "15 Days", days: 15 },
  { label: "1 Month", days: 30 },
  { label: "2 Months", days: 60 },
  { label: "3 Months", days: 90 },
  { label: "6 Months", days: 180 },
];

function getCalfVaccineDates(bornDate: string) {
  const parts = bornDate.split("/");
  let base: Date | null = null;
  if (parts.length === 3) base = new Date(+parts[2], +parts[1] - 1, +parts[0]);
  if (!base || isNaN(base.getTime())) return null;
  return CALF_VACCINE_SCHEDULE.map((sch) => {
    const d = new Date(base!);
    d.setDate(d.getDate() + sch.days);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return {
      label: sch.label,
      date: `${dd}/${mm}/${d.getFullYear()}`,
      days: sch.days,
    };
  });
}

// ── Shared field components ──────────────────────────────────────────
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

function IssuePicker({
  label,
  value,
  onChange,
  accentColor = "#ea580c",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  accentColor?: string;
}) {
  const [focused, setFocused] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const visibleIssues = showAll ? COMMON_ISSUES : COMMON_ISSUES.slice(0, 6);
  return (
    <View style={ip.wrap}>
      <Text style={f.label}>{label}</Text>
      <View style={ip.chipGrid}>
        {visibleIssues.map((issue) => {
          const active = value === issue.label;
          return (
            <TouchableOpacity
              key={issue.label}
              style={[
                ip.chip,
                active && {
                  backgroundColor: issue.color + "18",
                  borderColor: issue.color,
                },
              ]}
              onPress={() => onChange(active ? "" : issue.label)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={issue.icon as any}
                size={12}
                color={active ? issue.color : "#9ca3af"}
              />
              <Text style={[ip.chipLabel, active && { color: issue.color }]}>
                {issue.label}
              </Text>
              {active && (
                <Ionicons name="checkmark" size={11} color={issue.color} />
              )}
            </TouchableOpacity>
          );
        })}
        {!showAll && COMMON_ISSUES.length > 6 && (
          <TouchableOpacity
            style={ip.moreChip}
            onPress={() => setShowAll(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="ellipsis-horizontal" size={12} color="#9ca3af" />
            <Text style={ip.moreText}>+{COMMON_ISSUES.length - 6} more</Text>
          </TouchableOpacity>
        )}
        {showAll && (
          <TouchableOpacity
            style={ip.moreChip}
            onPress={() => setShowAll(false)}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-up" size={12} color="#9ca3af" />
            <Text style={ip.moreText}>Show less</Text>
          </TouchableOpacity>
        )}
      </View>
      <View
        style={[
          ip.inputRow,
          focused && { borderColor: accentColor, backgroundColor: "#fff" },
        ]}
      >
        <Ionicons
          name="bandage-outline"
          size={14}
          color={focused ? accentColor : "#9ca3af"}
          style={{ marginRight: 8 }}
        />
        <TextInput
          style={ip.input}
          value={value}
          onChangeText={onChange}
          placeholder="Or type custom issue..."
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

function DateField({
  label,
  value,
  onChange,
  color = "#7c3aed",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  color?: string;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const parseDate = (ddmmyyyy: string): Date => {
    const parts = ddmmyyyy.split("/");
    if (parts.length === 3) {
      const d = new Date(+parts[2], +parts[1] - 1, +parts[0]);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  };
  const formatToDisplay = (ddmmyyyy: string): string => {
    const parts = ddmmyyyy.split("/");
    if (parts.length === 3) {
      const d = new Date(+parts[2], +parts[1] - 1, +parts[0]);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
      }
    }
    return "";
  };
  const handleDateChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") setShowPicker(false);
    if (selectedDate) {
      const dd = String(selectedDate.getDate()).padStart(2, "0");
      const mm = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const yyyy = selectedDate.getFullYear();
      onChange(`${dd}/${mm}/${yyyy}`);
    }
  };
  const displayValue = value ? formatToDisplay(value) : "";
  return (
    <View style={df.wrap}>
      <Text style={f.label}>{label}</Text>
      <TouchableOpacity
        style={[
          df.row,
          value
            ? { borderColor: color + "55", backgroundColor: color + "08" }
            : {},
        ]}
        onPress={() => setShowPicker(true)}
        activeOpacity={0.8}
      >
        <View style={[df.iconWrap, { backgroundColor: color + "18" }]}>
          <Ionicons name="calendar" size={14} color={color} />
        </View>
        <Text
          style={[
            df.valueText,
            !displayValue && df.placeholder,
            displayValue ? { color: "#0f172a" } : {},
          ]}
        >
          {displayValue || "Select date"}
        </Text>
        {value ? (
          <TouchableOpacity
            onPress={() => onChange("")}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close-circle" size={16} color="#9ca3af" />
          </TouchableOpacity>
        ) : (
          <Ionicons name="chevron-down" size={14} color="#9ca3af" />
        )}
      </TouchableOpacity>
      {showPicker &&
        (Platform.OS === "ios" ? (
          <Modal
            transparent
            animationType="fade"
            onRequestClose={() => setShowPicker(false)}
          >
            <TouchableOpacity
              style={df.overlay}
              activeOpacity={1}
              onPress={() => setShowPicker(false)}
            >
              <View style={df.pickerSheet}>
                <View style={df.pickerHeader}>
                  <Text style={df.pickerTitle}>{label}</Text>
                  <TouchableOpacity
                    onPress={() => setShowPicker(false)}
                    style={df.pickerDoneBtn}
                  >
                    <Text style={[df.pickerDoneText, { color }]}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={parseDate(value)}
                  mode="date"
                  display="spinner"
                  onChange={handleDateChange}
                  style={{ height: 200 }}
                />
              </View>
            </TouchableOpacity>
          </Modal>
        ) : (
          <DateTimePicker
            value={parseDate(value)}
            mode="date"
            display="default"
            onChange={handleDateChange}
          />
        ))}
    </View>
  );
}

// ── Vet Cow Selector ─────────────────────────────────────────────────
function VetCowSelector({
  value,
  onSelect,
  onClear,
}: {
  value: { tag: string; name: string; age: string } | null;
  onSelect: (c: VetCowOption) => void;
  onClear: () => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [allCows, setAllCows] = useState<VetCowOption[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

const open = async () => {
  setModalOpen(true);
  setSearch("");
  setLoading(true);
  try {
    const data = await api.vetGetCows();
    const normalized = (Array.isArray(data) ? data : []).map((c: any) => ({
      ...c,
      tag: c.tag || c.tag_number || "",
    }));
    setAllCows(normalized);
  } catch {
    setAllCows([]);
  } finally {
    setLoading(false);
  }
};

  const close = () => {
    setModalOpen(false);
    setSearch("");
  };

const visible = allCows.filter((c) => {
  if (c.isLeasedOut) return false;
  const tag = c.tag || c.tag_number || "";
  if (!search.trim()) return true;
  const q = search.toLowerCase();
  return tag.toLowerCase().includes(q) || (c.name || "").toLowerCase().includes(q);
});

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
          <TouchableOpacity
            style={cs.selectBtn}
            onPress={open}
            activeOpacity={0.85}
          >
            <Ionicons name="search-outline" size={16} color="#16a34a" />
            <Text style={cs.selectBtnText}>Select Cow</Text>
          </TouchableOpacity>
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
              onPress={() => {}}
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
                  onChangeText={setSearch}
                />
                {search.length > 0 && (
                  <TouchableOpacity onPress={() => setSearch("")}>
                    <Ionicons name="close-circle" size={14} color="#9ca3af" />
                  </TouchableOpacity>
                )}
              </View>
              {loading ? (
                <View style={cs.loadBox}>
                  <ActivityIndicator color="#16a34a" size="large" />
                  <Text style={cs.loadText}>Loading cows...</Text>
                </View>
              ) : (
                <FlatList
                  data={visible}
                  keyExtractor={(i) => i.id}
                  style={cs.list}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{ paddingBottom: 8 }}
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
                        {item.photo ? (
                          <Image
                            source={{ uri: item.photo }}
                            style={{ width: 38, height: 38, borderRadius: 10 }}
                            resizeMode="cover"
                          />
                        ) : (
                          <Image
                            source={getAnimalImage(item.type)}
                            style={{
                              width: 24,
                              height: 24,
                              resizeMode: "contain",
                            }}
                          />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={cs.cowTag}>{item.tag || item.tag_number}</Text>
                        <Text style={cs.cowMeta}>
                          {item.name}
                          {item.breed ? ` · ${item.breed}` : ""}
                          {item.age ? ` · ${item.age}` : ""}
                        </Text>
                        {item.isLeasedIn && (
                          <Text style={cs.leaseTag}>
                            Leased in
                            {item.lessorFarmName
                              ? ` from ${item.lessorFarmName}`
                              : ""}
                          </Text>
                        )}
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={14}
                        color="#d1d5db"
                      />
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    <View style={cs.emptyBox}>
                      <Text style={cs.emptyText}>
                        No cows available at your branch
                      </Text>
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
}: {
  form: MedicalForm;
  setF: (k: keyof MedicalForm) => (v: any) => void;
  onCowSelect: (c: VetCowOption) => void;
  onCowClear: () => void;
}) {
  const selectedCow = form.cowSrNo
    ? { tag: form.cowSrNo, name: form.cowName, age: form.cowAge }
    : null;
  return (
    <>
      <Sec title="Cow Identity" icon="paw-outline" color="#16a34a" />
      <VetCowSelector
        value={selectedCow}
        onSelect={onCowSelect}
        onClear={onCowClear}
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
          <DateField
            label="Last Vaccination"
            value={form.lastVaccinationDate}
            onChange={setF("lastVaccinationDate")}
            color="#7c3aed"
          />
        </View>
        <View style={{ flex: 1 }}>
          <DateField
            label="Next Vaccination"
            value={form.nextVaccinationDate}
            onChange={setF("nextVaccinationDate")}
            color="#7c3aed"
          />
        </View>
      </View>
      <Sec title="Deworming" icon="bug-outline" color="#65a30d" />
      <Field
        label="Deworming Medicine"
        value={form.dewormingMedicine}
        onChange={setF("dewormingMedicine")}
        placeholder="e.g. Albendazole"
        icon="flask-outline"
        color="#65a30d"
      />
      <View style={f.twoCol}>
        <View style={{ flex: 1 }}>
          <DateField
            label="Last Deworming"
            value={form.lastDewormingDate}
            onChange={setF("lastDewormingDate")}
            color="#65a30d"
          />
        </View>
        <View style={{ flex: 1 }}>
          <DateField
            label="Next Deworming"
            value={form.nextDewormingDate}
            onChange={setF("nextDewormingDate")}
            color="#65a30d"
          />
        </View>
      </View>
      <Sec title="Health Issues" icon="alert-circle-outline" color="#ea580c" />
      <IssuePicker
        label="LAST ISSUE"
        value={form.lastIssueName}
        onChange={setF("lastIssueName")}
        accentColor="#ea580c"
      />
      <DateField
        label="Last Issue Date"
        value={form.lastIssueDate}
        onChange={setF("lastIssueDate")}
        color="#ea580c"
      />
      <IssuePicker
        label="CURRENT ISSUE"
        value={form.currentIssueName}
        onChange={setF("currentIssueName")}
        accentColor="#dc2626"
      />
      <DateField
        label="Issue Date"
        value={form.currentIssueDate}
        onChange={setF("currentIssueDate")}
        color="#dc2626"
      />
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
        placeholder="Auto-filled with your name"
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
  vetName,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (r: MedicalRecord) => void;
  editRecord: MedicalRecord | null;
  vetName?: string;
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
        currentStatus: editRecord.currentStatus,
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
        lastDewormingDate: editRecord.lastDewormingDate ?? "",
        nextDewormingDate: editRecord.nextDewormingDate ?? "",
        dewormingMedicine: editRecord.dewormingMedicine ?? "",
      });
    } else {
      setForm({ ...EMPTY_FORM, doctorName: vetName ?? "" });
    }
  }, [editRecord, visible]);

  const setF = (k: keyof MedicalForm) => (v: any) =>
    setForm((p) => ({ ...p, [k]: v }));
const handleCowSelect = (c: VetCowOption) =>
  setForm((p) => ({
    ...p,
    cowSrNo: c.tag || c.tag_number || "",
    cowName: c.name || "",
    cowAge: c.age || "",
  }));
  const handleCowClear = () =>
    setForm((p) => ({ ...p, cowSrNo: "", cowName: "", cowAge: "" }));
  const reset = () => {
    setForm(EMPTY_FORM);
    onClose();
  };

const submit = async () => {
  if (!(form.cowSrNo || "").trim()) {
      Alert.alert("Missing Field", "Please select a cow first.");
      return;
    }
    setSub(true);
    try {
      const n = (v?: string) => (v || "").trim() || undefined;
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
        lastDewormingDate: n(form.lastDewormingDate),
        nextDewormingDate: n(form.nextDewormingDate),
        dewormingMedicine: n(form.dewormingMedicine),
      };
      const result: MedicalRecord =
        isEdit && editRecord
          ? await api.updateVetMedicalRecord(editRecord.id, payload)
          : await api.createVetMedicalRecord(payload);
      onSave(result);
      reset();
    } catch (err: any) {
      Alert.alert(
        "Error",
        getErrorMessage(
          err,
          "Could not save. This animal may be leased out or outside your branch.",
        ),
      );
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
  group,
  index,
  onEdit,
}: {
  group: MedicalGroup;
  index: number;
  onEdit: (r: MedicalRecord) => void;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;
  const [expanded, setExpanded] = useState(false);
  const [recordIndex, setRecordIndex] = useState(0);
  const item = group.records[recordIndex];
  const hasMultipleRecords = group.records.length > 1;
  const isHealthy = item.currentStatus === "healthy";
  const statusColor = isHealthy ? "#16a34a" : "#dc2626";
  const statusBg = isHealthy ? "#f0fdf4" : "#fff1f2";
  const statusBorder = isHealthy ? "#bbf7d0" : "#fecdd3";
  const vaccinePreset = VACCINE_OPTIONS.find(
    (o) => o.label === item.vaccinationName,
  );

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

  useEffect(() => {
    setRecordIndex(0);
  }, [group.cowSrNo]);

  const treatmentColor =
    item.treatmentGiven === "Homeopathic"
      ? "#16a34a"
      : item.treatmentGiven === "Ethnovetary"
        ? "#7c3aed"
        : item.treatmentGiven === "Antibiotic"
          ? "#0891b2"
          : "#6b7280";

  return (
    <Animated.View style={[c.card, { opacity, transform: [{ translateY }] }]}>
      <View style={[c.accent, { backgroundColor: statusColor }]} />
      <View style={{ padding: 14 }}>
        <TouchableOpacity
          onPress={() => setExpanded((e) => !e)}
          activeOpacity={0.85}
        >
          <View style={c.topRow}>
            <View
              style={[
                c.avatar,
                { borderColor: statusBorder, backgroundColor: statusBg },
              ]}
            >
              {item.cowPhoto ? (
                <Image
                  source={{ uri: item.cowPhoto }}
                  style={{ width: 48, height: 48, borderRadius: 13 }}
                  resizeMode="cover"
                />
              ) : (
                <Image
                  source={getAnimalImage(item.cowType)}
                  style={{ width: 32, height: 32, resizeMode: "contain" }}
                />
              )}
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
                {item.added_by_vet && (
                  <View style={c.vetBadge}>
                    <Text style={c.vetBadgeText}>You</Text>
                  </View>
                )}
              </View>
              {hasMultipleRecords && (
                <Text style={c.historyHint}>
                  Record {recordIndex + 1} of {group.records.length}
                </Text>
              )}
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
                  { backgroundColor: "#f8fafc", borderColor: "#e2e8f0" },
                ]}
              >
                <Ionicons
                  name="medical-outline"
                  size={10}
                  color={treatmentColor}
                />
                <Text style={[c.chipText, { color: treatmentColor }]}>
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
            <Text style={c.secLabel}>Treatment</Text>
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
              value={item.doctorName || item.vet_name}
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
            </View>
          </>
        )}
      </View>
    </Animated.View>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────
export default function VetMedicalScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [screen, setScreen] = useState<"home" | "list">("home");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [dateRange, setDateRange] = useState<DateRangeOption>("all_time");
  const [sortVisible, setSortVisible] = useState(false);
  const [filterStatus, setFilter] = useState<"all" | "healthy" | "unhealthy">(
    "all",
  );
  const [formVisible, setFormVisible] = useState(false);
  const [editRecord, setEditRecord] = useState<MedicalRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cowLookup, setCowLookup] = useState<
    Record<string, { type: string; photo?: string }>
  >({});
  const [vetName, setVetName] = useState<string | undefined>(undefined);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, cows] = await Promise.all([
        api.getVetMedicalRecords(),
        api.vetGetCows().catch(() => []),
      ]);
      const lookup: Record<string, { type: string; photo?: string }> = {};
      for (const cow of cows as VetCowOption[]) {
        const tag = typeof cow?.tag === "string" ? cow.tag.trim() : "";
        if (!tag) continue;
        lookup[tag] = { type: cow.type || "mature", photo: cow.photo };
      }
      setCowLookup(lookup);
      const list = Array.isArray(data) ? data : [];
      const enriched = list.map((r: MedicalRecord) => {
        const cowKey = typeof r.cowSrNo === "string" ? r.cowSrNo.trim() : "";
        return {
          ...r,
          cowType: cowKey ? lookup[cowKey]?.type ?? "mature" : "mature",
          cowPhoto: cowKey ? lookup[cowKey]?.photo : undefined,
        };
      });
      setRecords(enriched);
    } catch (err: any) {
      setError(getErrorMessage(err, "Failed to load records."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const healthy = records.filter((r) => r.currentStatus === "healthy").length;
  const unhealthy = records.filter(
    (r) => r.currentStatus === "unhealthy",
  ).length;
  const calfRecords = records.filter(
    (r) => r.cowAge && getCalfVaccineDates(r.cowAge) !== null,
  );

  const isWithinRange = (createdAt: string, range: DateRangeOption) => {
    if (range === "all_time") return true;
    const created = new Date(createdAt);
    if (Number.isNaN(created.getTime())) return true;
    const diffDays = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
    if (range === "last_week") return diffDays <= 7;
    if (range === "last_month") return diffDays <= 30;
    return diffDays <= 365;
  };

  const q = search.toLowerCase().trim();
  const filteredRecords = records.filter(
    (r) =>
      (filterStatus === "all" || r.currentStatus === filterStatus) &&
      (!q ||
        (r.cowSrNo || "").toLowerCase().includes(q) ||
        (r.cowName || "").toLowerCase().includes(q)),
  );

  const groupedRecords = filteredRecords.reduce<MedicalGroup[]>(
    (groups, record) => {
      const existing = groups.find((g) => g.cowSrNo === record.cowSrNo);
      if (existing) {
        existing.records.push(record);
        existing.records.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
      } else {
        groups.push({
          cowSrNo: record.cowSrNo,
          cowName: record.cowName,
          cowType: record.cowType,
          cowPhoto: record.cowPhoto,
          cowAge: record.cowAge,
          records: [record],
        });
      }
      return groups;
    },
    [],
  );

  const visibleGroupedRecords = groupedRecords
    .filter((g) => isWithinRange(g.records[0]?.created_at ?? "", dateRange))
    .sort((a, b) => {
      if (sortBy === "name_asc")
        return (a.cowName ?? a.cowSrNo).localeCompare(b.cowName ?? b.cowSrNo);
      if (sortBy === "name_desc")
        return (b.cowName ?? b.cowSrNo).localeCompare(a.cowName ?? a.cowSrNo);
      const aTime = new Date(a.records[0]?.created_at ?? 0).getTime();
      const bTime = new Date(b.records[0]?.created_at ?? 0).getTime();
      if (sortBy === "oldest") return aTime - bTime;
      return bTime - aTime;
    });

  const sortMeta: Record<
    SortOption,
    { label: string; icon: keyof typeof Ionicons.glyphMap }
  > = {
    newest: { label: "Newest", icon: "time-outline" },
    oldest: { label: "Oldest", icon: "hourglass-outline" },
    name_asc: { label: "Name A-Z", icon: "text-outline" },
    name_desc: { label: "Name Z-A", icon: "text-outline" },
  };
  const dateRangeMeta: Record<
    DateRangeOption,
    { label: string; icon: keyof typeof Ionicons.glyphMap }
  > = {
    all_time: { label: "All Time", icon: "calendar-outline" },
    last_week: { label: "Last Week", icon: "today-outline" },
    last_month: { label: "Last Month", icon: "calendar-clear-outline" },
    last_year: { label: "Last Year", icon: "calendar-number-outline" },
  };

  const statsData = [
    { label: "Total", value: records.length, color: "#0f172a" },
    { label: "Healthy", value: healthy, color: "#16a34a" },
    { label: "Unhealthy", value: unhealthy, color: "#dc2626" },
    {
      label: "Vaccinated",
      value: records.filter((r) => !!r.vaccinationName).length,
      color: "#7c3aed",
    },
  ];

  const backAction = () => {
    if (screen === "list") {
      setScreen("home");
      return;
    }
    router.back();
  };

  const ListHeader = () => (
    <View>
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
      <View style={[s.searchWrap, { marginHorizontal: 0, marginTop: 12 }]}>
        <Ionicons name="search-outline" size={15} color="#9ca3af" />
        <TextInput
          style={s.searchInput}
          placeholder="Search cow name or Sr. No..."
          placeholderTextColor="#d1d5db"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={15} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>
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
                  ? "Healthy"
                  : "Unhealthy"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={s.header}>
        <TouchableOpacity onPress={backAction} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.headerTitle}>Medical Records</Text>
          <Text style={s.headerSub}>{records.length} records</Text>
        </View>
        <TouchableOpacity
          onPress={() => setSortVisible(true)}
          style={s.sortBtn}
        >
          <Ionicons name={sortMeta[sortBy].icon} size={16} color="#16a34a" />
        </TouchableOpacity>
        <View style={s.countBadge}>
          <Text style={s.countText}>{visibleGroupedRecords.length}</Text>
        </View>
      </View>

      {screen === "home" ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.homeBody}
          showsVerticalScrollIndicator={false}
        >
          <View style={[s.statsRow, { marginHorizontal: -16, marginTop: 0 }]}>
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
                setFormVisible(true);
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
              onPress={() => setScreen("list")}
              style={s.bigBtn}
              activeOpacity={0.85}
            >
              <View style={{ flex: 1 }}>
                <Text style={s.bigBtnTitle}>View All Records</Text>
                <Text style={s.bigBtnSub}>
                  Browse {visibleGroupedRecords.length} cow medical records
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
                    setScreen("list");
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
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <Text style={{ fontSize: 18 }}>🐄</Text>
                  <Text style={s.calfSectionTitle}>Calf Vaccine Schedule</Text>
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
        <View style={{ flex: 1 }}>
          {loading && records.length === 0 ? (
            <View style={s.loadingWrap}>
              <ActivityIndicator size="large" color="#16a34a" />
              <Text style={s.loadingText}>Loading records...</Text>
            </View>
          ) : error ? (
            <View style={s.errorWrap}>
              <Text style={{ fontSize: 36 }}>⚠️</Text>
              <Text style={s.errorText}>{error}</Text>
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
              data={visibleGroupedRecords}
              keyExtractor={(item) => item.cowSrNo}
              ListHeaderComponent={<ListHeader />}
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
                  refreshing={refreshing}
                  onRefresh={async () => {
                    setRefreshing(true);
                    await fetchRecords();
                    setRefreshing(false);
                  }}
                  tintColor="#16a34a"
                />
              }
              renderItem={({ item, index }) => (
                <MedicalCard
                  group={item}
                  index={index}
                  onEdit={(r) => {
                    setEditRecord(r);
                    setFormVisible(true);
                  }}
                />
              )}
              ListEmptyComponent={
                <View style={s.empty}>
                  <Text style={{ fontSize: 44 }}>🏥</Text>
                  <Text style={s.emptyText}>No cow medical records found</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setEditRecord(null);
                      setFormVisible(true);
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
              setFormVisible(true);
            }}
            style={[s.fab, { backgroundColor: "#16a34a" }]}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      <MedicalFormModal
        visible={formVisible}
        onClose={() => {
          setFormVisible(false);
          setEditRecord(null);
        }}
        editRecord={editRecord}
        vetName={vetName}
        onSave={(r) => {
          const enriched = {
            ...r,
            cowType: cowLookup[r.cowSrNo]?.type ?? "mature",
            cowPhoto: cowLookup[r.cowSrNo]?.photo,
          };
          if (editRecord) {
            setRecords((p) =>
              p.map((x) => (x.id === enriched.id ? enriched : x)),
            );
          } else {
            setRecords((p) => [enriched, ...p]);
            setScreen("list");
          }
        }}
      />

      <Modal
        visible={sortVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSortVisible(false)}
      >
        <TouchableOpacity
          style={s.sortOverlay}
          activeOpacity={1}
          onPress={() => setSortVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={s.sortSheet}
            onPress={() => {}}
          >
            <Text style={s.sortSheetTitle}>Sort & Filter</Text>
            <Text style={s.sortSheetSub}>Choose how to sort records</Text>
            <Text style={s.sortSectionTitle}>Sort By</Text>
            {(Object.keys(sortMeta) as SortOption[]).map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[s.sortOption, sortBy === opt && s.sortOptionActive]}
                onPress={() => {
                  setSortBy(opt);
                  setSortVisible(false);
                }}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={sortMeta[opt].icon}
                  size={15}
                  color={sortBy === opt ? "#16a34a" : "#64748b"}
                />
                <Text
                  style={[
                    s.sortOptionText,
                    sortBy === opt && s.sortOptionTextActive,
                  ]}
                >
                  {sortMeta[opt].label}
                </Text>
                {sortBy === opt && (
                  <Ionicons
                    name="checkmark"
                    size={15}
                    color="#16a34a"
                    style={{ marginLeft: "auto" as any }}
                  />
                )}
              </TouchableOpacity>
            ))}
            <Text style={s.sortSectionTitle}>Date Range</Text>
            {(Object.keys(dateRangeMeta) as DateRangeOption[]).map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[s.sortOption, dateRange === opt && s.sortOptionActive]}
                onPress={() => {
                  setDateRange(opt);
                  setSortVisible(false);
                }}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={dateRangeMeta[opt].icon}
                  size={15}
                  color={dateRange === opt ? "#16a34a" : "#64748b"}
                />
                <Text
                  style={[
                    s.sortOptionText,
                    dateRange === opt && s.sortOptionTextActive,
                  ]}
                >
                  {dateRangeMeta[opt].label}
                </Text>
                {dateRange === opt && (
                  <Ionicons
                    name="checkmark"
                    size={15}
                    color="#16a34a"
                    style={{ marginLeft: "auto" as any }}
                  />
                )}
              </TouchableOpacity>
            ))}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ── Styles (mirrors admin's medical screen) ─────────────────────────
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
  sortBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f0fdf4",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    marginRight: 8,
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
  sortOverlay: {
    flex: 1,
    backgroundColor: "rgba(17,24,39,0.28)",
    justifyContent: "flex-start",
    paddingTop: 96,
    paddingHorizontal: 16,
  },
  sortSheet: {
    alignSelf: "flex-end",
    width: 220,
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#bbf7d0",
    padding: 12,
  },
  sortSheetTitle: { fontSize: 15, fontWeight: "800", color: "#111827" },
  sortSheetSub: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "500",
    marginTop: 2,
    marginBottom: 8,
  },
  sortSectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#94a3b8",
    textTransform: "uppercase",
    marginTop: 8,
    marginBottom: 4,
  },
  sortOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
  },
  sortOptionActive: { backgroundColor: "#f0fdf4" },
  sortOptionText: { fontSize: 13, fontWeight: "700", color: "#64748b" },
  sortOptionTextActive: { color: "#16a34a" },
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
    backgroundColor: "#16a34a",
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
  vetBadge: {
    backgroundColor: "#f0fdf4",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  vetBadgeText: { fontSize: 9, color: "#16a34a", fontWeight: "700" },
  historyHint: {
    fontSize: 11,
    color: "#16a34a",
    fontWeight: "700",
    marginBottom: 6,
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
  actionText: { fontSize: 13, fontWeight: "700" },
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

const ip = StyleSheet.create({
  wrap: { marginBottom: 12 },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: "#f8fafc",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
  },
  chipLabel: { fontSize: 11, fontWeight: "700", color: "#6b7280" },
  moreChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderStyle: "dashed" as any,
  },
  moreText: { fontSize: 11, fontWeight: "600", color: "#9ca3af" },
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
  input: { flex: 1, color: "#0f172a", fontSize: 14, fontWeight: "500" },
});

const df = StyleSheet.create({
  wrap: { marginBottom: 10 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  valueText: { flex: 1, fontSize: 13, fontWeight: "600", color: "#0f172a" },
  placeholder: { color: "#d1d5db", fontWeight: "500" },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  pickerSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 30,
  },
  pickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  pickerTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  pickerDoneBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#f8fafc",
  },
  pickerDoneText: { fontSize: 15, fontWeight: "700" },
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
  leaseTag: { fontSize: 10, color: "#7c3aed", fontWeight: "600", marginTop: 2 },
  loadBox: { paddingVertical: 40, alignItems: "center", gap: 8 },
  loadText: { fontSize: 13, color: "#94a3b8" },
  emptyBox: { paddingVertical: 40, alignItems: "center", gap: 8 },
  emptyText: { fontSize: 14, color: "#94a3b8", fontWeight: "600" },
});
