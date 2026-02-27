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
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../../src/services/api"; 

interface MedicalRecord {
  id: string;
  admin_id: string;
  cowSrNo: string;
  cowName?: string;
  cowAge?: string;
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
  const [open, setOpen] = useState(false);
  const [cows, setCows] = useState<CowOption[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [manualTag, setManual] = useState("");

  const loadCows = async (q?: string) => {
    setLoading(true);
    try {
      setCows(await api.getCows(q));
    } catch {
      setCows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => loadCows(search || undefined), 350);
    return () => clearTimeout(t);
  }, [search, open]);

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
              onPress={() => {
                setOpen(true);
                loadCows();
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="search-outline" size={14} color="#16a34a" />
              <Text style={cs.selectBtnText}>Select Cow</Text>
            </TouchableOpacity>
            <Text style={cs.orText}>or</Text>
            <View style={cs.manualRow}>
              <TextInput
                style={cs.manualInput}
                placeholder="Enter Sr. No."
                placeholderTextColor="#d1d5db"
                value={manualTag}
                onChangeText={setManual}
              />
              <TouchableOpacity
                style={[cs.manualBtn, !manualTag.trim() && { opacity: 0.4 }]}
                disabled={!manualTag.trim()}
                onPress={() => {
                  onManual(manualTag.trim());
                  setManual("");
                }}
              >
                <Ionicons name="arrow-forward" size={14} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <View style={cs.overlay}>
          <View style={cs.sheet}>
            <View style={cs.handle} />
            <View style={cs.sheetHeader}>
              <Text style={cs.sheetTitle}>Select Cow</Text>
              <TouchableOpacity
                onPress={() => {
                  setOpen(false);
                  setSearch("");
                }}
                style={cs.sheetClose}
              >
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
                autoFocus
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch("")}>
                  <Ionicons name="close-circle" size={14} color="#9ca3af" />
                </TouchableOpacity>
              )}
            </View>
            {loading ? (
              <View style={cs.loadBox}>
                <ActivityIndicator color="#16a34a" />
                <Text style={cs.loadText}>Loading...</Text>
              </View>
            ) : (
              <FlatList
                data={cows}
                keyExtractor={(i) => i.id}
                style={{ maxHeight: 380 }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={cs.cowRow}
                    onPress={() => {
                      onSelect(item);
                      setOpen(false);
                      setSearch("");
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={cs.cowIcon}>
                      <Text style={{ fontSize: 20 }}>
                        {item.type === "newborn" ? "🐮" : "🐄"}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={cs.cowTag}>{item.tag}</Text>
                      <Text style={cs.cowMeta}>
                        {item.name} · {item.breed} · {item.age || "—"}
                      </Text>
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
                    <Text style={{ fontSize: 32 }}>🐄</Text>
                    <Text style={cs.emptyText}>No cows found</Text>
                  </View>
                }
              />
            )}
          </View>
        </View>
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

function Field({
  label,
  value,
  onChange,
  placeholder,
  icon,
  color = "#16a34a",
}: any) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={f.wrap}>
      <Text style={f.label}>{label}</Text>
      <View style={[f.row, focused && { ...f.focused, borderColor: color }]}>
        <Ionicons
          name={icon}
          size={14}
          color={focused ? color : "#9ca3af"}
          style={{ marginRight: 8 }}
        />
        <TextInput
          style={f.input}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder ?? label}
          placeholderTextColor="#d1d5db"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>
    </View>
  );
}

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
          {form.cowName ? (
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
          ) : null}
          {form.cowAge ? (
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
          ) : null}
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
      <Field
        label="Vaccine Name"
        value={form.vaccinationName}
        onChange={setF("vaccinationName")}
        placeholder="e.g. FMD, BQ, HS"
        icon="medkit-outline"
        color="#7c3aed"
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
      <Field
        label="Treatment Given"
        value={form.treatmentGiven}
        onChange={setF("treatmentGiven")}
        placeholder="e.g. Antibiotic"
        icon="medical-outline"
        color="#0891b2"
      />
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
        color="#6b7280"
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

  const handleCowSelect = (c: CowOption) => {
    setForm((p) => ({
      ...p,
      cowSrNo: c.tag,
      cowName: c.name,
      cowAge: c.age || "",
    }));
  };
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
      <View style={m.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ width: "100%" }}
        >
          <View style={m.sheet}>
            <View style={m.handle} />
            <View style={m.header}>
              <View style={[m.iconWrap, { backgroundColor: accent + "18" }]}>
                <Ionicons
                  name={isEdit ? "create" : "add-circle"}
                  size={18}
                  color={accent}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={m.title}>
                  {isEdit ? "Edit Medical Record" : "Add Medical Record"}
                </Text>
                {isEdit && editRecord && (
                  <Text style={m.subTitle}>
                    {editRecord.cowSrNo}
                    {editRecord.cowName ? ` · ${editRecord.cowName}` : ""}
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={reset} style={m.closeBtn}>
                <Ionicons name="close" size={18} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 520 }}
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
                m.submitBtn,
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
                  <Text style={m.submitText}>
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
    <View style={d.row}>
      <View
        style={[d.iconBox, { backgroundColor: (color ?? "#9ca3af") + "18" }]}
      >
        <Ionicons name={icon as any} size={12} color={color ?? "#9ca3af"} />
      </View>
      <Text style={d.label}>{label}</Text>
      <Text style={[d.value, color ? { color } : {}]}>{value}</Text>
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
            <View
              style={[
                c.avatar,
                { borderColor: statusBorder, backgroundColor: statusBg },
              ]}
            >
              <Text style={{ fontSize: 24 }}>🐄</Text>
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
                {item.cowName ? (
                  <Text style={c.cowName}>{item.cowName}</Text>
                ) : null}
              </View>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                {item.cowAge ? (
                  <View style={c.agePill}>
                    <Ionicons name="time-outline" size={10} color="#64748b" />
                    <Text style={c.agePillText}>{item.cowAge}</Text>
                  </View>
                ) : null}
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
                  { backgroundColor: "#faf5ff", borderColor: "#e9d5ff" },
                ]}
              >
                <Ionicons
                  name="shield-checkmark-outline"
                  size={10}
                  color="#7c3aed"
                />
                <Text style={[c.chipText, { color: "#7c3aed" }]}>
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

            <Text style={c.secLabel}>💉 Vaccination</Text>
            <DRow
              icon="medkit-outline"
              label="Vaccine"
              value={item.vaccinationName}
              color="#7c3aed"
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

            <Text style={c.secLabel}>🩹 Health Issues</Text>
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

export default function MedicalScreen() {
  const router = useRouter();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [screen, setScreen] = useState<"home" | "list">("home");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilter] = useState<"all" | "healthy" | "unhealthy">(
    "all",
  );
  const [modalVisible, setModal] = useState(false);
  const [editRecord, setEditRecord] = useState<MedicalRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = useCallback(async (q?: string, status?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getMedicalRecords(
        q,
        status === "all" ? undefined : status,
      );
      setRecords(data);
    } catch (err: any) {
      setError(err.message ?? "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  useEffect(() => {
    const t = setTimeout(
      () =>
        fetchRecords(
          search || undefined,
          filterStatus === "all" ? undefined : filterStatus,
        ),
      400,
    );
    return () => clearTimeout(t);
  }, [search, filterStatus]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRecords(
      search || undefined,
      filterStatus === "all" ? undefined : filterStatus,
    );
    setRefreshing(false);
  };

  const handleDelete = (r: MedicalRecord) => {
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
              setRecords((prev) => prev.filter((x) => x.id !== r.id));
            } catch (err: any) {
              Alert.alert("Error", err.message ?? "Failed to delete.");
            }
          },
        },
      ],
    );
  };

  const openAdd = () => {
    setEditRecord(null);
    setModal(true);
  };
  const openEdit = (r: MedicalRecord) => {
    setEditRecord(r);
    setModal(true);
  };

  const healthy = records.filter((r) => r.currentStatus === "healthy").length;
  const unhealthy = records.filter(
    (r) => r.currentStatus === "unhealthy",
  ).length;

  return (
    <SafeAreaView style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

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
          <Text style={s.headerTitle}>Medical Records</Text>
          <Text style={s.headerSub}>{records.length} records</Text>
        </View>
        {screen === "list" && (
          <View style={s.countBadge}>
            <Text style={s.countText}>{records.length}</Text>
          </View>
        )}
      </View>

      <View style={s.statsRow}>
        {[
          { label: "Total", value: records.length, color: "#0f172a" },
          { label: "Healthy", value: healthy, color: "#16a34a" },
          { label: "Unhealthy", value: unhealthy, color: "#dc2626" },
          {
            label: "Vaccinated",
            value: records.filter((r) => !!r.vaccinationName).length,
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
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.homeBody}
          showsVerticalScrollIndicator={false}
        >
          <View style={s.heroWrap}>
            <Text style={s.heroEmoji}>🏥</Text>
            <Text style={s.homeHeading}>Medical Records</Text>
            <Text style={s.homeSub}>
              Track health, vaccination & treatment for each cow
            </Text>
          </View>

          <View style={s.btnGroup}>
            <TouchableOpacity
              onPress={openAdd}
              style={s.bigBtn}
              activeOpacity={0.85}
            >
              <View style={[s.bigBtnIcon, { backgroundColor: "#f0fdf4" }]}>
                <Text style={{ fontSize: 28 }}>➕</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.bigBtnTitle}>Add Medical Record</Text>
                <Text style={s.bigBtnSub}>
                  Register a new cow health record
                </Text>
              </View>
              <View style={[s.bigBtnArrow, { backgroundColor: "#16a34a" }]}>
                <Ionicons name="add" size={18} color="#fff" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setScreen("list")}
              style={s.bigBtn}
              activeOpacity={0.85}
            >
              <View style={[s.bigBtnIcon, { backgroundColor: "#fff7ed" }]}>
                <Text style={{ fontSize: 28 }}>📋</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.bigBtnTitle}>View All Records</Text>
                <Text style={s.bigBtnSub}>
                  Browse {records.length} medical records
                </Text>
              </View>
              <View style={[s.bigBtnArrow, { backgroundColor: "#ea580c" }]}>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </View>
            </TouchableOpacity>
          </View>

          {records.length > 0 && (
            <View style={s.summaryRow}>
              <TouchableOpacity
                style={[
                  s.summaryCard,
                  { backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" },
                ]}
                onPress={() => {
                  setFilter("healthy");
                  setScreen("list");
                }}
                activeOpacity={0.8}
              >
                <Text style={s.summaryEmoji}>✅</Text>
                <Text style={[s.summaryCount, { color: "#16a34a" }]}>
                  {healthy}
                </Text>
                <Text style={[s.summaryLabel, { color: "#16a34a" }]}>
                  Healthy
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  s.summaryCard,
                  { backgroundColor: "#fff1f2", borderColor: "#fecdd3" },
                ]}
                onPress={() => {
                  setFilter("unhealthy");
                  setScreen("list");
                }}
                activeOpacity={0.8}
              >
                <Text style={s.summaryEmoji}>⚠️</Text>
                <Text style={[s.summaryCount, { color: "#dc2626" }]}>
                  {unhealthy}
                </Text>
                <Text style={[s.summaryLabel, { color: "#dc2626" }]}>
                  Unhealthy
                </Text>
              </TouchableOpacity>
              <View
                style={[
                  s.summaryCard,
                  { backgroundColor: "#faf5ff", borderColor: "#e9d5ff" },
                ]}
              >
                <Text style={s.summaryEmoji}>💉</Text>
                <Text style={[s.summaryCount, { color: "#7c3aed" }]}>
                  {records.filter((r) => !!r.nextVaccinationDate).length}
                </Text>
                <Text style={[s.summaryLabel, { color: "#7c3aed" }]}>
                  Scheduled
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>
          <View style={s.searchWrap}>
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

          <View style={s.filterRow}>
            {(["all", "healthy", "unhealthy"] as const).map((f) => (
              <TouchableOpacity
                key={f}
                style={[s.filterTab, filterStatus === f && s.filterTabActive]}
                onPress={() => setFilter(f)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    s.filterTabText,
                    filterStatus === f && s.filterTabTextActive,
                  ]}
                >
                  {f === "all"
                    ? "All"
                    : f === "healthy"
                      ? "✅ Healthy"
                      : "⚠️ Unhealthy"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

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
              data={records}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{
                paddingHorizontal: 14,
                paddingTop: 6,
                paddingBottom: 100,
              }}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor="#16a34a"
                />
              }
              renderItem={({ item, index }) => (
                <MedicalCard
                  item={item}
                  index={index}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                />
              )}
              ListEmptyComponent={
                <View style={s.empty}>
                  <Text style={{ fontSize: 44 }}>🏥</Text>
                  <Text style={s.emptyText}>No records found</Text>
                  <TouchableOpacity onPress={openAdd} style={s.emptyBtn}>
                    <Ionicons name="add" size={14} color="#fff" />
                    <Text style={s.emptyBtnText}>Add First Record</Text>
                  </TouchableOpacity>
                </View>
              }
            />
          )}
        </View>
      )}

      {screen === "list" && (
        <TouchableOpacity onPress={openAdd} style={s.fab}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      )}

      <MedicalFormModal
        visible={modalVisible}
        onClose={() => {
          setModal(false);
          setEditRecord(null);
        }}
        editRecord={editRecord}
        onSave={(r) => {
          if (editRecord) {
            setRecords((prev) => prev.map((x) => (x.id === r.id ? r : x)));
          } else {
            setRecords((prev) => [r, ...prev]);
            setScreen("list");
          }
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
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
    backgroundColor: "#f0fdf4",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  countText: { fontSize: 12, fontWeight: "700", color: "#16a34a" },
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
  homeBody: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  heroWrap: { alignItems: "center", marginBottom: 28 },
  heroEmoji: { fontSize: 52, marginBottom: 10 },
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
  btnGroup: { gap: 12, marginBottom: 24 },
  bigBtn: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#f1f5f9",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  bigBtnIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  bigBtnTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  bigBtnSub: { fontSize: 12, color: "#94a3b8", fontWeight: "500" },
  bigBtnArrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryRow: { flexDirection: "row", gap: 10 },
  summaryCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 12,
    alignItems: "center",
    gap: 4,
  },
  summaryEmoji: { fontSize: 22 },
  summaryCount: { fontSize: 20, fontWeight: "800", letterSpacing: -0.5 },
  summaryLabel: { fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
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
    backgroundColor: "#16a34a",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#16a34a",
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
    backgroundColor: "#16a34a",
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
    backgroundColor: "#16a34a",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
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
  chipText: { fontSize: 10, fontWeight: "600" },
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

const d = StyleSheet.create({
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
  focused: { backgroundColor: "#fff" },
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

const m = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
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
  manualRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    overflow: "hidden",
  },
  manualInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: "#0f172a",
    fontSize: 13,
  },
  manualBtn: {
    width: 38,
    height: 42,
    backgroundColor: "#16a34a",
    alignItems: "center",
    justifyContent: "center",
  },
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
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
    maxHeight: "80%",
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: "#e2e8f0",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
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
    marginBottom: 10,
  },
  searchInput: { flex: 1, color: "#0f172a", fontSize: 14 },
  cowRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
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
});
