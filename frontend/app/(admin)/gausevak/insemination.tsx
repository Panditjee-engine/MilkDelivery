import React, { useState, useRef, useEffect, useCallback } from "react";
import DateTimePicker from "@react-native-community/datetimepicker";
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
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../../src/services/api";

interface InseminationRecord {
  id: string;
  admin_id: string;
  cowSrNo: string;
  cowName: string;
  inseminationDate: string;
  aiDate?: string; // NEW — Artificial Insemination Date
  pregnancyStatus: boolean;
  pdDone: boolean;
  pregnancyStatusDate?: string;
  doctorName?: string;
  actualCalvingDate?: string;
  heatAfterCalvingDate?: string;
  sire?: string;
  lastCalvingDate?: string;
  created_at: string;
}

interface Cow {
  id: string;
  tag: string;
  name: string;
  breed: string;
  type: string;
}

interface FormData {
  cowSrNo: string;
  cowName: string;
  inseminationDate: string;
  aiDate: string; // NEW
  pregnancyStatus: boolean;
  pdDone: boolean;
  pregnancyStatusDate: string;
  doctorName: string;
  actualCalvingDate: string;
  heatAfterCalvingDate: string;
  sire: string;
  lastCalvingDate: string;
}

const EMPTY_FORM: FormData = {
  cowSrNo: "",
  cowName: "",
  inseminationDate: "",
  aiDate: "", // NEW
  pregnancyStatus: false,
  pdDone: false,
  pregnancyStatusDate: "",
  doctorName: "",
  actualCalvingDate: "",
  heatAfterCalvingDate: "",
  sire: "",
  lastCalvingDate: "",
};

const PAGE_SIZE = 4;

function calcExpectedCalving(dateStr: string): string {
  if (!dateStr || dateStr.length < 8) return "";
  const parts = dateStr.split("/");
  if (parts.length !== 3) return "";
  const [dd, mm, yyyy] = parts;
  if (!dd || !mm || !yyyy || yyyy.length < 4) return "";
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  if (isNaN(d.getTime())) return "";
  d.setMonth(d.getMonth() + 9);
  d.setDate(d.getDate() + 9);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function getStatus(r: InseminationRecord) {
  if (r.actualCalvingDate)
    return {
      label: "Calved",
      color: "#16a34a",
      bg: "#f0fdf4",
      border: "#86efac",
      icon: "checkmark-circle",
    };
  if (r.pregnancyStatus)
    return {
      label: "Pregnant",
      color: "#7c3aed",
      bg: "#faf5ff",
      border: "#e9d5ff",
      icon: "heart",
    };
  if (r.pdDone)
    return {
      label: "PD Done",
      color: "#0891b2",
      bg: "#ecfeff",
      border: "#a5f3fc",
      icon: "medical",
    };
  return {
    label: "Inseminated",
    color: "#d97706",
    bg: "#fffbeb",
    border: "#fcd34d",
    icon: "time",
  };
}

// CowSelector
function CowSelector({
  value,
  onSelect,
  onClear,
}: {
  value: { tag: string; name: string } | null;
  onSelect: (cow: Cow) => void;
  onClear: () => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [allCows, setAllCows] = useState<Cow[]>([]);
  const [visibleCows, setVisibleCows] = useState<Cow[]>([]);
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
            <View style={cs.selectedLeft}>
              <Text style={cs.selectedTag}>{value.tag}</Text>
              <Text style={cs.selectedName}>{value.name}</Text>
            </View>
            <TouchableOpacity onPress={onClear} style={cs.clearBtn}>
              <Ionicons name="close-circle" size={18} color="#9ca3af" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={cs.trigger}
            onPress={open}
            activeOpacity={0.8}
          >
            <Ionicons name="search-outline" size={15} color="#9ca3af" />
            <Text style={cs.triggerText}>Search & select a cow...</Text>
            <Ionicons name="chevron-down" size={14} color="#9ca3af" />
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
              <View style={cs.searchRow}>
                <Ionicons name="search-outline" size={15} color="#9ca3af" />
                <TextInput
                  style={cs.searchInput}
                  placeholder="Search tag or name..."
                  placeholderTextColor="#d1d5db"
                  value={search}
                  onChangeText={(text) => {
                    if (initialLoadDone.current) setSearch(text);
                  }}
                  autoFocus={false}
                />
                {search.length > 0 && (
                  <TouchableOpacity onPress={() => setSearch("")}>
                    <Ionicons name="close-circle" size={15} color="#9ca3af" />
                  </TouchableOpacity>
                )}
              </View>
              {!loading && allCows.length > 0 && (
                <Text style={cs.countHint}>
                  Showing {visibleCows.length} of {allCows.length} cows
                </Text>
              )}
              {loading ? (
                <View style={cs.loadingWrap}>
                  <ActivityIndicator color="#7c3aed" size="large" />
                  <Text style={cs.loadingText}>Loading cows...</Text>
                </View>
              ) : (
                <FlatList
                  data={visibleCows}
                  keyExtractor={(item) => item.id}
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
                      <View style={cs.cowEmoji}>
                        <Text style={{ fontSize: 20 }}>
                          {item.type === "newborn" ? "🐮" : "🐄"}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={cs.cowTag}>{item.tag}</Text>
                        <Text style={cs.cowName}>
                          {item.name} · {item.breed}
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
                        <ActivityIndicator size="small" color="#7c3aed" />
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
                          color="#7c3aed"
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
                    <View style={cs.emptyWrap}>
                      <Text style={{ fontSize: 32 }}>🐄</Text>
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

// Field
function Field({ label, value, onChange, placeholder, icon }: any) {
  const [focused, setFocused] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const isDateField = icon === "calendar-outline";

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowPicker(false);
    if (selectedDate) {
      const day = String(selectedDate.getDate()).padStart(2, "0");
      const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const year = selectedDate.getFullYear();
      onChange(`${day}/${month}/${year}`);
    }
  };

  return (
    <View style={f.wrap}>
      <Text style={f.label}>{label}</Text>
      <TouchableOpacity
        activeOpacity={isDateField ? 0.7 : 1}
        onPress={() => {
          if (isDateField) setShowPicker(true);
        }}
      >
        <View style={[f.row, focused && f.focused]}>
          <Ionicons
            name={icon}
            size={15}
            color={focused ? "#7c3aed" : "#9ca3af"}
            style={{ marginRight: 8 }}
            onPress={() => {
              if (isDateField) setShowPicker(true);
            }}
          />
          <TextInput
            style={f.input}
            value={value}
            onChangeText={onChange}
            placeholder={placeholder ?? label}
            placeholderTextColor="#d1d5db"
            editable={!isDateField}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
        </View>
      </TouchableOpacity>
      {showPicker && (
        <DateTimePicker
          value={new Date()}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}
    </View>
  );
}

// AiDateField  — highlighted variant for AI Date
function AiDateField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowPicker(false);
    if (selectedDate) {
      const day = String(selectedDate.getDate()).padStart(2, "0");
      const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const year = selectedDate.getFullYear();
      onChange(`${day}/${month}/${year}`);
    }
  };

  return (
    <View style={f.wrap}>
      <Text style={f.label}>AI DATE (ARTIFICIAL INSEMINATION)</Text>
      <TouchableOpacity activeOpacity={0.7} onPress={() => setShowPicker(true)}>
        <View style={[f.row, f.aiDateRow]}>
          {/* DNA icon badge */}
          <View style={f.aiIconBadge}>
            <Text style={{ fontSize: 13 }}>🧬</Text>
          </View>
          <Text
            style={[f.input, value ? f.aiDateValueText : f.aiDatePlaceholder]}
          >
            {value || "DD/MM/YYYY"}
          </Text>
          {!!value && (
            <TouchableOpacity
              onPress={() => onChange("")}
              style={{ padding: 2 }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={16} color="#a78bfa" />
            </TouchableOpacity>
          )}
          <Ionicons
            name="calendar"
            size={15}
            color="#7c3aed"
            style={{ marginLeft: 4 }}
          />
        </View>
      </TouchableOpacity>
      {!!value && <Text style={f.aiDateHint}>📅 AI performed on {value}</Text>}
      {showPicker && (
        <DateTimePicker
          value={new Date()}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}
    </View>
  );
}

// ToggleCard
function ToggleCard({
  label,
  sub,
  value,
  onChange,
  activeColor,
}: {
  label: string;
  sub: string;
  value: boolean;
  onChange: (v: boolean) => void;
  activeColor: string;
}) {
  return (
    <View
      style={[
        f.toggleCard,
        value && {
          borderColor: activeColor + "44",
          backgroundColor: activeColor + "08",
        },
      ]}
    >
      <View style={f.toggleRow}>
        <View style={{ flex: 1 }}>
          <Text style={f.toggleLabel}>{label}</Text>
          <Text
            style={[f.toggleSub, { color: value ? activeColor : "#9ca3af" }]}
          >
            {sub}
          </Text>
        </View>
        <Switch
          value={value}
          onValueChange={onChange}
          trackColor={{ false: "#f3f4f6", true: activeColor + "55" }}
          thumbColor={value ? activeColor : "#d1d5db"}
        />
      </View>
    </View>
  );
}

// SectionHeader
function SectionHeader({
  title,
  icon,
  color,
}: {
  title: string;
  icon: string;
  color: string;
}) {
  return (
    <View style={[f.sectionHeader, { borderLeftColor: color }]}>
      <Ionicons name={icon as any} size={13} color={color} />
      <Text style={[f.sectionTitle, { color }]}>{title}</Text>
    </View>
  );
}

// RecordFormBody
function RecordFormBody({
  form,
  setF,
  onCowSelect,
  onCowClear,
}: {
  form: FormData;
  setF: (k: keyof FormData) => (v: any) => void;
  onCowSelect: (cow: Cow) => void;
  onCowClear: () => void;
}) {
  const selectedCow = form.cowSrNo
    ? { tag: form.cowSrNo, name: form.cowName }
    : null;
  const expectedCalving = calcExpectedCalving(form.inseminationDate);

  return (
    <>
      {/* ── Cow Info ── */}
      <SectionHeader
        title="Cow Information"
        icon="paw-outline"
        color="#2563eb"
      />
      <CowSelector
        value={selectedCow}
        onSelect={onCowSelect}
        onClear={onCowClear}
      />

      {form.cowName ? (
        <View style={f.readOnlyWrap}>
          <Text style={f.label}>COW NAME</Text>
          <View style={f.readOnlyRow}>
            <Ionicons
              name="text-outline"
              size={15}
              color="#7c3aed"
              style={{ marginRight: 8 }}
            />
            <Text style={f.readOnlyText}>{form.cowName}</Text>
            <View style={f.autoBadge}>
              <Text style={f.autoBadgeText}>Auto</Text>
            </View>
          </View>
        </View>
      ) : null}

      {/* ── Insemination ── */}
      <SectionHeader
        title="Insemination"
        icon="flask-outline"
        color="#7c3aed"
      />

      <Field
        label="Insemination Date"
        value={form.inseminationDate}
        onChange={setF("inseminationDate")}
        placeholder="DD/MM/YYYY"
        icon="calendar-outline"
      />

      {/* ── AI Date (Artificial Insemination Date) ── NEW */}
      <AiDateField value={form.aiDate} onChange={setF("aiDate")} />

      {/* Sire field */}
      <Field
        label="Sire (Bull Name)"
        value={form.sire}
        onChange={setF("sire")}
        placeholder="e.g. HF Bull / Jersey Bull"
        icon="male-outline"
      />

      {/* Last Calving Date */}
      <Field
        label="Last Calving Date"
        value={form.lastCalvingDate}
        onChange={setF("lastCalvingDate")}
        placeholder="DD/MM/YYYY"
        icon="calendar-outline"
      />

      {/* Auto expected calving */}
      {!!expectedCalving && (
        <View style={f.expectedWrap}>
          <Text style={f.label}>EXPECTED CALVING DATE</Text>
          <View style={f.expectedRow}>
            <Ionicons
              name="calendar"
              size={15}
              color="#16a34a"
              style={{ marginRight: 8 }}
            />
            <Text style={f.expectedText}>{expectedCalving}</Text>
            <View style={f.expectedBadge}>
              <Text style={f.expectedBadgeText}>9M + 9D</Text>
            </View>
          </View>
          <Text style={f.expectedHint}>
            Auto-calculated · Insemination + 9 months 9 days
          </Text>
        </View>
      )}

      {/* ── Pregnancy ── */}
      <SectionHeader
        title="Pregnancy Status"
        icon="heart-outline"
        color="#e11d48"
      />
      <ToggleCard
        label="Pregnancy Status"
        sub={form.pregnancyStatus ? "Cow is pregnant ✓" : "Not confirmed yet"}
        value={form.pregnancyStatus}
        onChange={setF("pregnancyStatus")}
        activeColor="#e11d48"
      />

      {/* ── PD ── */}
      <SectionHeader
        title="Pregnancy Determination (PD)"
        icon="medical-outline"
        color="#0891b2"
      />
      <ToggleCard
        label="PD Done"
        sub={form.pdDone ? "PD completed by vet" : "PD not yet done"}
        value={form.pdDone}
        onChange={setF("pdDone")}
        activeColor="#0891b2"
      />
      {form.pdDone && (
        <View style={m.subFields}>
          <Field
            label="PD Date"
            value={form.pregnancyStatusDate}
            onChange={setF("pregnancyStatusDate")}
            placeholder="DD/MM/YYYY"
            icon="calendar-outline"
          />
          <Field
            label="Doctor Name"
            value={form.doctorName}
            onChange={setF("doctorName")}
            placeholder="e.g. Dr. Sharma"
            icon="person-outline"
          />
        </View>
      )}

      {/* ── Calving ── */}
      <SectionHeader
        title="Calving Details"
        icon="star-outline"
        color="#16a34a"
      />
      <Field
        label="Actual Calving Date"
        value={form.actualCalvingDate}
        onChange={setF("actualCalvingDate")}
        placeholder="DD/MM/YYYY"
        icon="calendar-outline"
      />
      <Field
        label="Heat After Calving Date"
        value={form.heatAfterCalvingDate}
        onChange={setF("heatAfterCalvingDate")}
        placeholder="DD/MM/YYYY"
        icon="calendar-outline"
      />
      <View style={{ height: 12 }} />
    </>
  );
}

// AddModal
function AddModal({
  visible,
  onClose,
  onAdd,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (r: InseminationRecord) => void;
}) {
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [submitting, setSub] = useState(false);
  const setF = (k: keyof FormData) => (v: any) =>
    setForm((p) => ({ ...p, [k]: v }));
  const handleCowSelect = (cow: Cow) =>
    setForm((p) => ({ ...p, cowSrNo: cow.tag, cowName: cow.name }));
  const handleCowClear = () =>
    setForm((p) => ({ ...p, cowSrNo: "", cowName: "" }));
  const reset = () => {
    setForm(EMPTY_FORM);
    onClose();
  };

  const submit = async () => {
    if (!form.cowSrNo || !form.inseminationDate) {
      Alert.alert(
        "Missing Fields",
        "Please select a cow and enter insemination date.",
      );
      return;
    }
    setSub(true);
    try {
      const payload = {
        cowSrNo: form.cowSrNo,
        cowName: form.cowName,
        inseminationDate: form.inseminationDate,
        aiDate: form.aiDate || undefined, // NEW
        pregnancyStatus: form.pregnancyStatus,
        pdDone: form.pdDone,
        pregnancyStatusDate: form.pdDone
          ? form.pregnancyStatusDate || undefined
          : undefined,
        doctorName: form.pdDone ? form.doctorName || undefined : undefined,
        actualCalvingDate: form.actualCalvingDate || undefined,
        heatAfterCalvingDate: form.heatAfterCalvingDate || undefined,
        sire: form.sire || undefined,
        lastCalvingDate: form.lastCalvingDate || undefined,
      };
      const created = await api.createInsemination(payload);
      onAdd(created);
      reset();
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Failed to save record.");
    } finally {
      setSub(false);
    }
  };

  const canSubmit = !!form.cowSrNo && !!form.inseminationDate;

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
              <View style={m.headerIcon}>
                <Ionicons name="flask" size={18} color="#7c3aed" />
              </View>
              <Text style={m.title}>New Insemination</Text>
              <TouchableOpacity onPress={reset} style={m.closeBtn}>
                <Ionicons name="close" size={18} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <Text style={m.sub}>Fill in the insemination details</Text>
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 480 }}
              keyboardShouldPersistTaps="handled"
            >
              <RecordFormBody
                form={form}
                setF={setF}
                onCowSelect={handleCowSelect}
                onCowClear={handleCowClear}
              />
            </ScrollView>
            <TouchableOpacity
              onPress={submit}
              style={[
                m.submitBtn,
                (!canSubmit || submitting) && { opacity: 0.45 },
              ]}
              disabled={!canSubmit || submitting}
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
                  <Text style={m.submitText}>Save Record</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// EditModal
function EditModal({
  visible,
  record,
  onClose,
  onSave,
}: {
  visible: boolean;
  record: InseminationRecord | null;
  onClose: () => void;
  onSave: (updated: InseminationRecord) => void;
}) {
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [submitting, setSub] = useState(false);

  useEffect(() => {
    if (record) {
      setForm({
        cowSrNo: record.cowSrNo,
        cowName: record.cowName,
        inseminationDate: record.inseminationDate,
        aiDate: record.aiDate ?? "", // NEW
        pregnancyStatus: record.pregnancyStatus,
        pdDone: record.pdDone,
        pregnancyStatusDate: record.pregnancyStatusDate ?? "",
        doctorName: record.doctorName ?? "",
        actualCalvingDate: record.actualCalvingDate ?? "",
        heatAfterCalvingDate: record.heatAfterCalvingDate ?? "",
        sire: record.sire ?? "",
        lastCalvingDate: record.lastCalvingDate ?? "",
      });
    }
  }, [record]);

  const setF = (k: keyof FormData) => (v: any) =>
    setForm((p) => ({ ...p, [k]: v }));
  const handleCowSelect = (cow: Cow) =>
    setForm((p) => ({ ...p, cowSrNo: cow.tag, cowName: cow.name }));
  const handleCowClear = () =>
    setForm((p) => ({ ...p, cowSrNo: "", cowName: "" }));

  const save = async () => {
    if (!record || !form.cowSrNo || !form.inseminationDate) return;
    setSub(true);
    try {
      const payload = {
        cowSrNo: form.cowSrNo,
        cowName: form.cowName,
        inseminationDate: form.inseminationDate,
        aiDate: form.aiDate || undefined, // NEW
        pregnancyStatus: form.pregnancyStatus,
        pdDone: form.pdDone,
        pregnancyStatusDate: form.pdDone
          ? form.pregnancyStatusDate || undefined
          : undefined,
        doctorName: form.pdDone ? form.doctorName || undefined : undefined,
        actualCalvingDate: form.actualCalvingDate || undefined,
        heatAfterCalvingDate: form.heatAfterCalvingDate || undefined,
        sire: form.sire || undefined,
        lastCalvingDate: form.lastCalvingDate || undefined,
      };
      const updated = await api.updateInsemination(record.id, payload);
      onSave(updated);
      onClose();
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Failed to update record.");
    } finally {
      setSub(false);
    }
  };

  const canSave = !!form.cowSrNo && !!form.inseminationDate;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={m.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ width: "100%" }}
        >
          <View style={m.sheet}>
            <View style={m.handle} />
            <View style={m.header}>
              <View style={[m.headerIcon, { backgroundColor: "#fff7ed" }]}>
                <Ionicons name="create" size={18} color="#ea580c" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={m.title}>Update Record</Text>
                {record && (
                  <Text style={m.editSubName}>
                    {record.cowName} · {record.cowSrNo}
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={onClose} style={m.closeBtn}>
                <Ionicons name="close" size={18} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 480 }}
              keyboardShouldPersistTaps="handled"
            >
              <RecordFormBody
                form={form}
                setF={setF}
                onCowSelect={handleCowSelect}
                onCowClear={handleCowClear}
              />
            </ScrollView>
            <TouchableOpacity
              onPress={save}
              style={[
                m.submitBtn,
                { backgroundColor: "#ea580c" },
                (!canSave || submitting) && { opacity: 0.45 },
              ]}
              disabled={!canSave || submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="save-outline" size={18} color="#fff" />
                  <Text style={m.submitText}>Update Record</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// DetailRow
function DetailRow({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: string;
  color?: string;
}) {
  if (!value) return null;
  return (
    <View style={d.row}>
      <View
        style={[d.iconWrap, { backgroundColor: (color ?? "#6b7280") + "15" }]}
      >
        <Ionicons name={icon as any} size={12} color={color ?? "#6b7280"} />
      </View>
      <Text style={d.label}>{label}</Text>
      <Text style={[d.value, color ? { color } : {}]}>{value}</Text>
    </View>
  );
}

// InseminationCard
function InseminationCard({
  item,
  index,
  onEdit,
  onDelete,
}: {
  item: InseminationRecord;
  index: number;
  onEdit: (r: InseminationRecord) => void;
  onDelete: (r: InseminationRecord) => void;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;
  const [expanded, setExpanded] = useState(false);
  const status = getStatus(item);
  const expectedCalving = calcExpectedCalving(item.inseminationDate);

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
        tension: 70,
        friction: 12,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[c.card, { opacity, transform: [{ translateY }] }]}>
      <TouchableOpacity
        onPress={() => setExpanded((e) => !e)}
        activeOpacity={0.8}
      >
        <View style={c.topRow}>
          <View style={c.avatar}>
            <Text style={{ fontSize: 22 }}>🐄</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={c.name}>{item.cowName}</Text>
            <Text style={c.sr}>{item.cowSrNo}</Text>
            {!!item.sire && <Text style={c.sireLabel}>🐂 {item.sire}</Text>}
          </View>
          <View
            style={[
              c.badge,
              { backgroundColor: status.bg, borderColor: status.border },
            ]}
          >
            <Ionicons
              name={status.icon as any}
              size={11}
              color={status.color}
            />
            <Text style={[c.badgeText, { color: status.color }]}>
              {status.label}
            </Text>
          </View>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={15}
            color="#d1d5db"
            style={{ marginLeft: 8 }}
          />
        </View>

        {/* Pills row */}
        <View style={c.pills}>
          <View style={c.pill}>
            <Ionicons name="flask-outline" size={10} color="#7c3aed" />
            <Text style={c.pillText}>{item.inseminationDate}</Text>
          </View>
          {/* NEW — AI Date pill */}
          {!!item.aiDate && (
            <View
              style={[
                c.pill,
                { backgroundColor: "#fdf4ff", borderColor: "#e879f9" },
              ]}
            >
              <Text style={{ fontSize: 9 }}>🧬</Text>
              <Text style={[c.pillText, { color: "#a21caf" }]}>
                AI {item.aiDate}
              </Text>
            </View>
          )}
          {!!expectedCalving && !item.actualCalvingDate && (
            <View
              style={[
                c.pill,
                { backgroundColor: "#f0fdf4", borderColor: "#86efac" },
              ]}
            >
              <Ionicons name="calendar" size={10} color="#16a34a" />
              <Text style={[c.pillText, { color: "#16a34a" }]}>
                Exp. {expectedCalving}
              </Text>
            </View>
          )}
          <View
            style={[
              c.pill,
              {
                backgroundColor: item.pregnancyStatus ? "#fff1f2" : "#f9fafb",
                borderColor: item.pregnancyStatus ? "#fecdd3" : "#e5e7eb",
              },
            ]}
          >
            <Ionicons
              name="heart"
              size={10}
              color={item.pregnancyStatus ? "#e11d48" : "#9ca3af"}
            />
            <Text
              style={[
                c.pillText,
                { color: item.pregnancyStatus ? "#e11d48" : "#9ca3af" },
              ]}
            >
              {item.pregnancyStatus ? "Pregnant" : "Not Confirmed"}
            </Text>
          </View>
          {item.pdDone && (
            <View
              style={[
                c.pill,
                { backgroundColor: "#ecfeff", borderColor: "#a5f3fc" },
              ]}
            >
              <Ionicons name="medical" size={10} color="#0891b2" />
              <Text style={[c.pillText, { color: "#0891b2" }]}>PD Done</Text>
            </View>
          )}
          {!!item.sire && (
            <View
              style={[
                c.pill,
                { backgroundColor: "#fef3c7", borderColor: "#fcd34d" },
              ]}
            >
              <Ionicons name="male-outline" size={10} color="#92400e" />
              <Text style={[c.pillText, { color: "#92400e" }]}>
                {item.sire}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      {expanded && (
        <View>
          <View style={c.divider} />

          <Text style={c.section}>📋 Insemination</Text>
          <DetailRow
            icon="calendar-outline"
            label="Date"
            value={item.inseminationDate}
            color="#7c3aed"
          />
          {/* NEW */}
          <DetailRow
            icon="flask"
            label="AI Date"
            value={item.aiDate ?? ""}
            color="#a21caf"
          />
          <DetailRow
            icon="male-outline"
            label="Sire"
            value={item.sire ?? ""}
            color="#92400e"
          />
          {!!expectedCalving && (
            <DetailRow
              icon="calendar"
              label="Expected Calving"
              value={expectedCalving}
              color="#16a34a"
            />
          )}

          <Text style={c.section}>Pregnancy Status</Text>
          <DetailRow
            icon="heart"
            label="Status"
            value={item.pregnancyStatus ? "Pregnant ✓" : "Not Confirmed"}
            color={item.pregnancyStatus ? "#e11d48" : "#9ca3af"}
          />

          <Text style={c.section}>🏥 PD Details</Text>
          <DetailRow
            icon="checkmark-circle-outline"
            label="PD Done"
            value={item.pdDone ? "Yes" : "No"}
            color={item.pdDone ? "#0891b2" : "#9ca3af"}
          />
          {item.pdDone && (
            <>
              <DetailRow
                icon="calendar-outline"
                label="PD Date"
                value={item.pregnancyStatusDate ?? ""}
                color="#0891b2"
              />
              <DetailRow
                icon="person-outline"
                label="Doctor Name"
                value={item.doctorName ?? ""}
                color="#0891b2"
              />
            </>
          )}

          <Text style={c.section}>🐣 Calving</Text>
          <DetailRow
            icon="calendar-outline"
            label="Last Calving"
            value={item.lastCalvingDate || "—"}
            color={item.lastCalvingDate ? "#7c3aed" : "#9ca3af"}
          />
          <DetailRow
            icon="calendar-outline"
            label="Actual Calving"
            value={item.actualCalvingDate || "—"}
            color={item.actualCalvingDate ? "#16a34a" : "#9ca3af"}
          />
          <DetailRow
            icon="calendar-outline"
            label="Heat After Calving"
            value={item.heatAfterCalvingDate || "—"}
            color={item.heatAfterCalvingDate ? "#d97706" : "#9ca3af"}
          />

          <View style={c.actionRow}>
            <TouchableOpacity
              style={[c.actionBtn, c.editBtn]}
              onPress={() => onEdit(item)}
              activeOpacity={0.8}
            >
              <Ionicons name="create-outline" size={15} color="#ea580c" />
              <Text style={[c.actionText, { color: "#ea580c" }]}>Update</Text>
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
        </View>
      )}
    </Animated.View>
  );
}

// Main Screen
export default function InseminationScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [records, setRecords] = useState<InseminationRecord[]>([]);
  const [screen, setScreen] = useState<"home" | "list">("home");
  const [search, setSearch] = useState("");
  const [addModal, setAddModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<InseminationRecord | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = useCallback(async (searchTerm?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getInseminations(searchTerm);
      setRecords(data);
    } catch (err: any) {
      setError(err.message ?? "Failed to load records.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);
  useEffect(() => {
    const t = setTimeout(() => fetchRecords(search || undefined), 400);
    return () => clearTimeout(t);
  }, [search]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRecords(search || undefined);
    setRefreshing(false);
  };

  const handleDelete = (r: InseminationRecord) => {
    Alert.alert(
      "Delete Record",
      `Delete insemination record for ${r.cowName} (${r.cowSrNo})?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.deleteInsemination(r.id);
              setRecords((prev) => prev.filter((x) => x.id !== r.id));
            } catch (err: any) {
              Alert.alert("Error", err.message ?? "Failed to delete.");
            }
          },
        },
      ],
    );
  };

  const stats = {
    total: records.length,
    pregnant: records.filter((r) => r.pregnancyStatus).length,
    pdDone: records.filter((r) => r.pdDone).length,
    calved: records.filter((r) => !!r.actualCalvingDate).length,
  };

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={
            screen === "home" ? () => router.back() : () => setScreen("home")
          }
          style={s.backBtn}
        >
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.headerTitle}>Insemination</Text>
          <Text style={s.headerSub}>{records.length} records</Text>
        </View>
        <TouchableOpacity
          onPress={() => setAddModal(true)}
          style={s.headerAddBtn}
        >
          <Ionicons name="add" size={20} color="#7c3aed" />
        </TouchableOpacity>
      </View>

      {/* ── Stats bar ── */}
      <View style={s.statsRow}>
        {[
          { label: "Total", value: stats.total, color: "#7c3aed" },
          { label: "Pregnant", value: stats.pregnant, color: "#e11d48" },
          { label: "PD Done", value: stats.pdDone, color: "#0891b2" },
          { label: "Calved", value: stats.calved, color: "#16a34a" },
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

      {/* ── Home screen ── */}
      {screen === "home" ? (
        <View style={s.homeBody}>
          <Text style={s.homeHeading}>Insemination Records</Text>
          <Text style={s.homeSub}>Track breeding cycles, PD and calving</Text>
          <View style={s.btnGroup}>
            <TouchableOpacity
              onPress={() => setAddModal(true)}
              style={s.bigBtn}
              activeOpacity={0.85}
            >
              <View style={[s.bigBtnIcon, { backgroundColor: "#faf5ff" }]}>
                <Text style={{ fontSize: 32 }}>🧬</Text>
              </View>
              <Text style={s.bigBtnTitle}>Add Insemination</Text>
              <Text style={s.bigBtnSub}>Record a new insemination entry</Text>
              <View style={[s.bigBtnArrow, { backgroundColor: "#7c3aed" }]}>
                <Ionicons name="add" size={18} color="#fff" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setScreen("list")}
              style={s.bigBtn}
              activeOpacity={0.85}
            >
              <View style={[s.bigBtnIcon, { backgroundColor: "#eff6ff" }]}>
                <Text style={{ fontSize: 32 }}>📋</Text>
              </View>
              <Text style={s.bigBtnTitle}>View Records</Text>
              <Text style={s.bigBtnSub}>
                Browse all {records.length} insemination records
              </Text>
              <View style={[s.bigBtnArrow, { backgroundColor: "#2563eb" }]}>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </View>
            </TouchableOpacity>
          </View>
        </View>
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

          {loading && records.length === 0 ? (
            <View style={s.loadingWrap}>
              <ActivityIndicator size="large" color="#7c3aed" />
              <Text style={s.loadingText}>Loading records...</Text>
            </View>
          ) : error ? (
            <View style={s.errorWrap}>
              <Text style={{ fontSize: 40 }}>⚠️</Text>
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
                paddingTop: 8,
                paddingBottom: 100,
              }}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor="#7c3aed"
                />
              }
              renderItem={({ item, index }) => (
                <InseminationCard
                  item={item}
                  index={index}
                  onEdit={(r) => {
                    setEditingRecord(r);
                    setEditModal(true);
                  }}
                  onDelete={handleDelete}
                />
              )}
              ListEmptyComponent={
                <View style={s.empty}>
                  <Text style={{ fontSize: 40 }}>🧬</Text>
                  <Text style={s.emptyText}>No records found</Text>
                </View>
              }
            />
          )}
        </View>
      )}

      {screen === "list" && (
        <TouchableOpacity onPress={() => setAddModal(true)} style={s.fab}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      )}

      <AddModal
        visible={addModal}
        onClose={() => setAddModal(false)}
        onAdd={(r) => {
          setRecords((p) => [r, ...p]);
          setScreen("list");
        }}
      />
      <EditModal
        visible={editModal}
        record={editingRecord}
        onClose={() => {
          setEditModal(false);
          setEditingRecord(null);
        }}
        onSave={(updated) =>
          setRecords((prev) =>
            prev.map((r) => (r.id === updated.id ? updated : r)),
          )
        }
      />
    </View>
  );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9fafb" },
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
  headerAddBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#faf5ff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e9d5ff",
  },
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
    margin: 14,
    marginBottom: 10,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: { flex: 1, color: "#111827", fontSize: 14 },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#7c3aed",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#7c3aed",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 15, color: "#9ca3af", fontWeight: "600" },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: { fontSize: 14, color: "#9ca3af", fontWeight: "500" },
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
    backgroundColor: "#7c3aed",
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
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  topRow: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#f9fafb",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: -0.2,
  },
  sr: { fontSize: 12, color: "#9ca3af", fontWeight: "500", marginTop: 1 },
  sireLabel: {
    fontSize: 11,
    color: "#92400e",
    fontWeight: "600",
    marginTop: 2,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeText: { fontSize: 10, fontWeight: "700" },
  pills: { flexDirection: "row", gap: 6, marginTop: 10, flexWrap: "wrap" },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: "#faf5ff",
    borderWidth: 1,
    borderColor: "#e9d5ff",
  },
  pillText: { fontSize: 11, color: "#7c3aed", fontWeight: "600" },
  divider: { height: 1, backgroundColor: "#f3f4f6", marginVertical: 12 },
  section: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 8,
    marginTop: 4,
  },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
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
    paddingVertical: 5,
    gap: 8,
  },
  iconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { flex: 1, fontSize: 13, color: "#6b7280", fontWeight: "500" },
  value: { fontSize: 13, fontWeight: "700", color: "#111827" },
});

const f = StyleSheet.create({
  wrap: { marginBottom: 12 },
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
  focused: { borderColor: "#7c3aed", backgroundColor: "#fff" },
  input: { flex: 1, color: "#111827", fontSize: 14, fontWeight: "500" },

  // ── AI Date field styles ── NEW
  aiDateRow: {
    backgroundColor: "#fdf4ff",
    borderColor: "#e879f9",
    borderWidth: 1.5,
  },
  aiIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#fae8ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#e879f9",
  },
  aiDateValueText: { color: "#a21caf", fontWeight: "700" },
  aiDatePlaceholder: { color: "#d8b4fe", fontWeight: "500" },
  aiDateHint: {
    fontSize: 11,
    color: "#c026d3",
    marginTop: 4,
    paddingLeft: 2,
    fontWeight: "500",
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderLeftWidth: 3,
    paddingLeft: 10,
    marginBottom: 10,
    marginTop: 8,
  },
  sectionTitle: { fontSize: 12, fontWeight: "700", letterSpacing: 0.2 },
  toggleCard: {
    backgroundColor: "#f9fafb",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    marginBottom: 10,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  toggleLabel: { fontSize: 14, fontWeight: "700", color: "#111827" },
  toggleSub: { fontSize: 11, fontWeight: "500", marginTop: 2 },
  readOnlyWrap: { marginBottom: 12 },
  readOnlyRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#faf5ff",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e9d5ff",
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  readOnlyText: { flex: 1, color: "#7c3aed", fontSize: 14, fontWeight: "600" },
  autoBadge: {
    backgroundColor: "#7c3aed",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  autoBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.4,
  },
  expectedWrap: { marginBottom: 12 },
  expectedRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#86efac",
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  expectedText: { flex: 1, color: "#16a34a", fontSize: 14, fontWeight: "700" },
  expectedBadge: {
    backgroundColor: "#16a34a",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  expectedBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.4,
  },
  expectedHint: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 4,
    paddingLeft: 2,
  },
});

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
  headerIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#faf5ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.3,
  },
  editSubName: {
    fontSize: 12,
    color: "#9ca3af",
    fontWeight: "500",
    marginTop: 1,
  },
  sub: { fontSize: 13, color: "#9ca3af", fontWeight: "500", marginBottom: 16 },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  subFields: {
    backgroundColor: "#f9fafb",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e0f2fe",
    marginBottom: 4,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7c3aed",
    borderRadius: 14,
    paddingVertical: 15,
    gap: 8,
    marginTop: 14,
  },
  submitText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.2,
  },
});

const cs = StyleSheet.create({
  wrap: { marginBottom: 12 },
  label: {
    fontSize: 11,
    color: "#6b7280",
    fontWeight: "700",
    letterSpacing: 0.4,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  triggerText: { flex: 1, color: "#d1d5db", fontSize: 14 },
  selected: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#faf5ff",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#c4b5fd",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  selectedLeft: { flex: 1 },
  selectedTag: { fontSize: 13, fontWeight: "800", color: "#7c3aed" },
  selectedName: {
    fontSize: 12,
    color: "#a78bfa",
    fontWeight: "500",
    marginTop: 1,
  },
  clearBtn: { padding: 4 },
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
  sheetTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },
  sheetClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 4,
  },
  searchInput: { flex: 1, color: "#111827", fontSize: 14 },
  countHint: {
    fontSize: 11,
    color: "#9ca3af",
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
    borderBottomColor: "#f3f4f6",
    gap: 12,
  },
  cowEmoji: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#f9fafb",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  cowTag: { fontSize: 13, fontWeight: "700", color: "#111827" },
  cowName: { fontSize: 12, color: "#9ca3af", fontWeight: "500", marginTop: 1 },
  loadingWrap: { paddingVertical: 40, alignItems: "center", gap: 10 },
  loadingText: { fontSize: 13, color: "#9ca3af" },
  emptyWrap: { paddingVertical: 40, alignItems: "center", gap: 8 },
  emptyText: { fontSize: 14, color: "#9ca3af", fontWeight: "600" },
  footerLoader: { paddingVertical: 14, alignItems: "center", gap: 4 },
  footerLoaderText: { fontSize: 11, color: "#9ca3af" },
  loadMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  loadMoreText: { fontSize: 13, fontWeight: "700", color: "#7c3aed" },
  endText: {
    fontSize: 11,
    color: "#d1d5db",
    textAlign: "center",
    paddingVertical: 12,
  },
});
