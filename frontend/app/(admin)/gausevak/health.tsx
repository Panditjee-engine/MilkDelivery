import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Animated,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Switch,
  Platform,
  StatusBar,
  SafeAreaView,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

// ─── Types ────────────────────────────────────────────────────────────────────
interface HealthRecord {
  id: string;
  cowSrNo: string;
  cowName: string;
  healthIssue: string;
  issueDate: string;
  severity: "mild" | "moderate" | "severe";
  checkupDone: boolean;
  checkupDate: string;
  doctorName: string;
  isHealthy: boolean;
  resolvedDate: string;
  notes: string;
}

interface FormData {
  cowSrNo: string;
  cowName: string;
  healthIssue: string;
  issueDate: string;
  severity: "mild" | "moderate" | "severe";
  checkupDone: boolean;
  checkupDate: string;
  doctorName: string;
  isHealthy: boolean;
  resolvedDate: string;
  notes: string;
}

const EMPTY_FORM: FormData = {
  cowSrNo: "",
  cowName: "",
  healthIssue: "",
  issueDate: "",
  severity: "mild",
  checkupDone: false,
  checkupDate: "",
  doctorName: "",
  isHealthy: false,
  resolvedDate: "",
  notes: "",
};

// ─── Sample Data ──────────────────────────────────────────────────────────────
const SAMPLE: HealthRecord[] = [
  {
    id: "1",
    cowSrNo: "GS-001",
    cowName: "Kamdhenu",
    healthIssue: "Foot and Mouth Disease",
    issueDate: "10/01/2025",
    severity: "severe",
    checkupDone: true,
    checkupDate: "11/01/2025",
    doctorName: "Dr. Sharma",
    isHealthy: false,
    resolvedDate: "",
    notes: "Started treatment with antibiotics",
  },
  {
    id: "2",
    cowSrNo: "GS-002",
    cowName: "Nandini",
    healthIssue: "Mild Fever",
    issueDate: "14/02/2025",
    severity: "mild",
    checkupDone: true,
    checkupDate: "14/02/2025",
    doctorName: "Dr. Patel",
    isHealthy: true,
    resolvedDate: "18/02/2025",
    notes: "Recovered after 4 days of medication",
  },
  {
    id: "3",
    cowSrNo: "GS-005",
    cowName: "Lakshmi",
    healthIssue: "Loss of Appetite",
    issueDate: "05/03/2025",
    severity: "moderate",
    checkupDone: false,
    checkupDate: "",
    doctorName: "",
    isHealthy: false,
    resolvedDate: "",
    notes: "",
  },
  {
    id: "4",
    cowSrNo: "GS-008",
    cowName: "Ganga",
    healthIssue: "Mastitis",
    issueDate: "20/03/2025",
    severity: "moderate",
    checkupDone: true,
    checkupDate: "21/03/2025",
    doctorName: "Dr. Verma",
    isHealthy: false,
    resolvedDate: "",
    notes: "Udder inflammation, under treatment",
  },
];

// ─── Severity config ──────────────────────────────────────────────────────────
const SEVERITY = {
  mild: { label: "Mild", color: "#16a34a", bg: "#f0fdf4", border: "#86efac" },
  moderate: {
    label: "Moderate",
    color: "#d97706",
    bg: "#fffbeb",
    border: "#fcd34d",
  },
  severe: {
    label: "Severe",
    color: "#dc2626",
    bg: "#fef2f2",
    border: "#fca5a5",
  },
};

// ─── Status helper ────────────────────────────────────────────────────────────
function getOverallStatus(r: HealthRecord) {
  if (r.isHealthy)
    return {
      label: "Healthy",
      color: "#16a34a",
      bg: "#f0fdf4",
      border: "#86efac",
      icon: "checkmark-circle",
    };
  if (r.checkupDone)
    return {
      label: "Under Treatment",
      color: "#7c3aed",
      bg: "#faf5ff",
      border: "#e9d5ff",
      icon: "medical",
    };
  return {
    label: "Needs Checkup",
    color: "#dc2626",
    bg: "#fef2f2",
    border: "#fca5a5",
    icon: "alert-circle",
  };
}

// ─── Field ────────────────────────────────────────────────────────────────────
function Field({ label, value, onChange, placeholder, icon }: any) {
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
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>
    </View>
  );
}

// ─── Toggle Card ─────────────────────────────────────────────────────────────
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

// ─── Severity Picker ─────────────────────────────────────────────────────────
function SeverityPicker({
  value,
  onChange,
}: {
  value: "mild" | "moderate" | "severe";
  onChange: (v: any) => void;
}) {
  return (
    <View style={f.wrap}>
      <Text style={f.label}>Severity</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {(["mild", "moderate", "severe"] as const).map((s) => {
          const cfg = SEVERITY[s];
          const active = value === s;
          return (
            <TouchableOpacity
              key={s}
              onPress={() => onChange(s)}
              style={[
                f.severityChip,
                {
                  borderColor: active ? cfg.color : "#e5e7eb",
                  backgroundColor: active ? cfg.bg : "#f9fafb",
                },
              ]}
            >
              <View style={[f.severityDot, { backgroundColor: cfg.color }]} />
              <Text
                style={[
                  f.severityText,
                  { color: active ? cfg.color : "#9ca3af" },
                ]}
              >
                {cfg.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
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

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────
function RecordModal({
  visible,
  record,
  onClose,
  onSave,
}: {
  visible: boolean;
  record: HealthRecord | null; // null = add mode
  onClose: () => void;
  onSave: (r: HealthRecord) => void;
}) {
  const isEdit = !!record;
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const setF = (k: keyof FormData) => (v: any) =>
    setForm((p) => ({ ...p, [k]: v }));

  React.useEffect(() => {
    if (record) {
      setForm({ ...record });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [record, visible]);

  const canSave = !!form.cowSrNo && !!form.cowName && !!form.healthIssue;

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      id: record?.id ?? Date.now().toString(),
      cowSrNo: form.cowSrNo,
      cowName: form.cowName,
      healthIssue: form.healthIssue,
      issueDate: form.issueDate,
      severity: form.severity,
      checkupDone: form.checkupDone,
      checkupDate: form.checkupDone ? form.checkupDate : "",
      doctorName: form.checkupDone ? form.doctorName : "",
      isHealthy: form.isHealthy,
      resolvedDate: form.isHealthy ? form.resolvedDate : "",
      notes: form.notes,
    });
    onClose();
  };

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
              <View
                style={[
                  mo.headerIcon,
                  { backgroundColor: isEdit ? "#fff7ed" : "#f0fdf4" },
                ]}
              >
                <Ionicons
                  name={isEdit ? "create" : "medkit"}
                  size={18}
                  color={isEdit ? "#ea580c" : "#16a34a"}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={mo.title}>
                  {isEdit ? "Update Health Record" : "New Health Record"}
                </Text>
                {isEdit && record && (
                  <Text style={mo.subName}>
                    {record.cowName} · {record.cowSrNo}
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={onClose} style={mo.closeBtn}>
                <Ionicons name="close" size={18} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 500 }}
            >
              <SectionHeader
                title="Cow Information"
                icon="paw-outline"
                color="#2563eb"
              />
              <Field
                label="Cow Sr. No."
                value={form.cowSrNo}
                onChange={setF("cowSrNo")}
                placeholder="e.g. GS-001"
                icon="barcode-outline"
              />
              <Field
                label="Cow Name"
                value={form.cowName}
                onChange={setF("cowName")}
                placeholder="e.g. Kamdhenu"
                icon="text-outline"
              />

              <SectionHeader
                title="Health Issue"
                icon="medkit-outline"
                color="#dc2626"
              />
              <Field
                label="Health Issue / Disease"
                value={form.healthIssue}
                onChange={setF("healthIssue")}
                placeholder="e.g. Foot and Mouth Disease"
                icon="bug-outline"
              />
              <Field
                label="Issue Date"
                value={form.issueDate}
                onChange={setF("issueDate")}
                placeholder="DD/MM/YYYY"
                icon="calendar-outline"
              />
              <SeverityPicker
                value={form.severity}
                onChange={setF("severity")}
              />
              <Field
                label="Notes"
                value={form.notes}
                onChange={setF("notes")}
                placeholder="Additional observations..."
                icon="document-text-outline"
              />

              <SectionHeader
                title="Checkup Status"
                icon="stethoscope"
                color="#7c3aed"
              />
              <ToggleCard
                label="Checkup Done"
                sub={
                  form.checkupDone
                    ? "Vet has examined the cow ✓"
                    : "Checkup not done yet"
                }
                value={form.checkupDone}
                onChange={setF("checkupDone")}
                activeColor="#7c3aed"
              />
              {form.checkupDone && (
                <View style={mo.subFields}>
                  <Field
                    label="Checkup Date"
                    value={form.checkupDate}
                    onChange={setF("checkupDate")}
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

              <SectionHeader
                title="Recovery Status"
                icon="heart"
                color="#16a34a"
              />
              <ToggleCard
                label="Cow is Healthy"
                sub={
                  form.isHealthy
                    ? "Fully recovered ✓"
                    : "Still under observation"
                }
                value={form.isHealthy}
                onChange={setF("isHealthy")}
                activeColor="#16a34a"
              />
              {form.isHealthy && (
                <View style={mo.subFields}>
                  <Field
                    label="Resolved Date"
                    value={form.resolvedDate}
                    onChange={setF("resolvedDate")}
                    placeholder="DD/MM/YYYY"
                    icon="calendar-outline"
                  />
                </View>
              )}

              <View style={{ height: 12 }} />
            </ScrollView>

            <TouchableOpacity
              onPress={handleSave}
              style={[
                mo.submitBtn,
                { backgroundColor: isEdit ? "#ea580c" : "#16a34a" },
                !canSave && { opacity: 0.45 },
              ]}
              disabled={!canSave}
            >
              <Ionicons
                name={isEdit ? "save-outline" : "checkmark-circle-outline"}
                size={18}
                color="#fff"
              />
              <Text style={mo.submitText}>
                {isEdit ? "Update Record" : "Save Record"}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ─── Detail Row ───────────────────────────────────────────────────────────────
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
    <View style={dr.row}>
      <View
        style={[dr.iconWrap, { backgroundColor: (color ?? "#6b7280") + "15" }]}
      >
        <Ionicons name={icon as any} size={12} color={color ?? "#6b7280"} />
      </View>
      <Text style={dr.label}>{label}</Text>
      <Text style={[dr.value, color ? { color } : {}]}>{value}</Text>
    </View>
  );
}

// ─── Health Card ──────────────────────────────────────────────────────────────
function HealthCard({
  item,
  index,
  onEdit,
  onQuickToggle,
}: {
  item: HealthRecord;
  index: number;
  onEdit: (r: HealthRecord) => void;
  onQuickToggle: (
    id: string,
    field: "checkupDone" | "isHealthy",
    value: boolean,
  ) => void;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;
  const [expanded, setExpanded] = useState(false);
  const status = getOverallStatus(item);
  const sev = SEVERITY[item.severity];

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
    <Animated.View
      style={[
        hc.card,
        item.isHealthy && hc.cardHealthy,
        { opacity, transform: [{ translateY }] },
      ]}
    >
      <TouchableOpacity
        onPress={() => setExpanded((e) => !e)}
        activeOpacity={0.8}
      >
        {/* Top row */}
        <View style={hc.topRow}>
          <View
            style={[
              hc.avatar,
              item.isHealthy && {
                backgroundColor: "#f0fdf4",
                borderColor: "#86efac",
              },
            ]}
          >
            <Text style={{ fontSize: 22 }}>{item.isHealthy ? "🐄" : "🤒"}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={hc.cowName}>{item.cowName}</Text>
            <Text style={hc.cowSr}>{item.cowSrNo}</Text>
          </View>
          <View
            style={[
              hc.statusBadge,
              { backgroundColor: status.bg, borderColor: status.border },
            ]}
          >
            <Ionicons
              name={status.icon as any}
              size={11}
              color={status.color}
            />
            <Text style={[hc.statusText, { color: status.color }]}>
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

        {/* Issue + severity row */}
        <View style={hc.issueRow}>
          <Ionicons name="medkit-outline" size={13} color="#dc2626" />
          <Text style={hc.issueText} numberOfLines={1}>
            {item.healthIssue}
          </Text>
          <View
            style={[
              hc.sevBadge,
              { backgroundColor: sev.bg, borderColor: sev.border },
            ]}
          >
            <Text style={[hc.sevText, { color: sev.color }]}>{sev.label}</Text>
          </View>
        </View>

        {/* Quick toggles row — always visible */}
        <View style={hc.quickToggles}>
          <TouchableOpacity
            style={[
              hc.toggleChip,
              item.checkupDone && {
                backgroundColor: "#faf5ff",
                borderColor: "#c4b5fd",
              },
            ]}
            onPress={() =>
              onQuickToggle(item.id, "checkupDone", !item.checkupDone)
            }
            activeOpacity={0.8}
          >
            <Ionicons
              name={item.checkupDone ? "checkmark-circle" : "ellipse-outline"}
              size={14}
              color={item.checkupDone ? "#7c3aed" : "#9ca3af"}
            />
            <Text
              style={[
                hc.toggleChipText,
                { color: item.checkupDone ? "#7c3aed" : "#9ca3af" },
              ]}
            >
              {item.checkupDone ? "Checkup Done" : "Mark Checkup"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              hc.toggleChip,
              item.isHealthy && {
                backgroundColor: "#f0fdf4",
                borderColor: "#86efac",
              },
            ]}
            onPress={() => onQuickToggle(item.id, "isHealthy", !item.isHealthy)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={item.isHealthy ? "heart-circle" : "heart-outline"}
              size={14}
              color={item.isHealthy ? "#16a34a" : "#9ca3af"}
            />
            <Text
              style={[
                hc.toggleChipText,
                { color: item.isHealthy ? "#16a34a" : "#9ca3af" },
              ]}
            >
              {item.isHealthy ? "Healthy" : "Mark Healthy"}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {/* Expanded details */}
      {expanded && (
        <View>
          <View style={hc.divider} />

          <Text style={hc.section}>🐄 Cow Info</Text>
          <DetailRow
            icon="barcode-outline"
            label="Sr. No."
            value={item.cowSrNo}
            color="#2563eb"
          />

          <Text style={hc.section}>🤒 Health Issue</Text>
          <DetailRow
            icon="bug-outline"
            label="Issue"
            value={item.healthIssue}
            color="#dc2626"
          />
          <DetailRow
            icon="calendar-outline"
            label="Reported On"
            value={item.issueDate}
            color="#dc2626"
          />
          <DetailRow
            icon="warning-outline"
            label="Severity"
            value={sev.label}
            color={sev.color}
          />
          {item.notes ? (
            <DetailRow
              icon="document-text-outline"
              label="Notes"
              value={item.notes}
              color="#6b7280"
            />
          ) : null}

          <Text style={hc.section}>🩺 Checkup</Text>
          <DetailRow
            icon="checkmark-circle-outline"
            label="Checkup Done"
            value={item.checkupDone ? "Yes" : "No"}
            color={item.checkupDone ? "#7c3aed" : "#9ca3af"}
          />
          {item.checkupDone && (
            <>
              <DetailRow
                icon="calendar-outline"
                label="Checkup Date"
                value={item.checkupDate}
                color="#7c3aed"
              />
              <DetailRow
                icon="person-outline"
                label="Doctor"
                value={item.doctorName}
                color="#7c3aed"
              />
            </>
          )}

          <Text style={hc.section}>💚 Recovery</Text>
          <DetailRow
            icon="heart"
            label="Status"
            value={item.isHealthy ? "Fully Recovered ✓" : "Under Observation"}
            color={item.isHealthy ? "#16a34a" : "#9ca3af"}
          />
          {item.isHealthy && (
            <DetailRow
              icon="calendar-outline"
              label="Resolved On"
              value={item.resolvedDate}
              color="#16a34a"
            />
          )}

          {/* Update button */}
          <TouchableOpacity
            style={hc.updateBtn}
            onPress={() => onEdit(item)}
            activeOpacity={0.85}
          >
            <Ionicons name="create-outline" size={15} color="#fff" />
            <Text style={hc.updateBtnText}>Update Record</Text>
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function CowHealthScreen() {
  const router = useRouter();
  const [records, setRecords] = useState<HealthRecord[]>(SAMPLE);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "healthy" | "sick" | "pending">(
    "all",
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<HealthRecord | null>(null);

  const filtered = records.filter((r) => {
    const matchSearch =
      r.cowName.toLowerCase().includes(search.toLowerCase()) ||
      r.cowSrNo.toLowerCase().includes(search.toLowerCase()) ||
      r.healthIssue.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "all"
        ? true
        : filter === "healthy"
          ? r.isHealthy
          : filter === "sick"
            ? !r.isHealthy && r.checkupDone
            : !r.checkupDone;
    return matchSearch && matchFilter;
  });

  const stats = {
    total: records.length,
    healthy: records.filter((r) => r.isHealthy).length,
    sick: records.filter((r) => !r.isHealthy && r.checkupDone).length,
    pending: records.filter((r) => !r.checkupDone).length,
  };

  const openAdd = () => {
    setEditingRecord(null);
    setModalVisible(true);
  };
  const openEdit = (r: HealthRecord) => {
    setEditingRecord(r);
    setModalVisible(true);
  };

  const handleSave = (r: HealthRecord) => {
    if (editingRecord) {
      setRecords((prev) => prev.map((x) => (x.id === r.id ? r : x)));
    } else {
      setRecords((prev) => [r, ...prev]);
    }
  };

  const handleQuickToggle = (
    id: string,
    field: "checkupDone" | "isHealthy",
    value: boolean,
  ) => {
    setRecords((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        if (field === "isHealthy" && value && !r.checkupDone) {
          return { ...r, checkupDone: true, isHealthy: true };
        }
        return { ...r, [field]: value };
      }),
    );
  };

  const FILTERS: {
    key: typeof filter;
    label: string;
    color: string;
    count: number;
  }[] = [
    { key: "all", label: "All", color: "#6b7280", count: stats.total },
    {
      key: "pending",
      label: "Pending",
      color: "#dc2626",
      count: stats.pending,
    },
    { key: "sick", label: "Sick", color: "#7c3aed", count: stats.sick },
    {
      key: "healthy",
      label: "Healthy",
      color: "#16a34a",
      count: stats.healthy,
    },
  ];

  return (
    <SafeAreaView style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.headerTitle}>Cow Health</Text>
          <Text style={s.headerSub}>{records.length} records</Text>
        </View>
        <TouchableOpacity
          style={s.addBtn}
          onPress={openAdd}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={s.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* ── Stats ── */}
      <View style={s.statsRow}>
        {[
          { label: "Total", value: stats.total, color: "#6b7280" },
          { label: "Pending", value: stats.pending, color: "#dc2626" },
          { label: "Sick", value: stats.sick, color: "#7c3aed" },
          { label: "Healthy", value: stats.healthy, color: "#16a34a" },
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

      {/* ── Search ── */}
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={15} color="#9ca3af" />
        <TextInput
          style={s.searchInput}
          placeholder="Search cow, Sr. No. or issue..."
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

      {/* ── Filter Chips ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filterRow}
      >
        {FILTERS.map((fl) => (
          <TouchableOpacity
            key={fl.key}
            onPress={() => setFilter(fl.key)}
            style={[
              s.filterChip,
              filter === fl.key && {
                backgroundColor: fl.color,
                borderColor: fl.color,
              },
            ]}
          >
            <Text
              style={[s.filterChipText, filter === fl.key && { color: "#fff" }]}
            >
              {fl.label}
            </Text>
            <View
              style={[
                s.filterBadge,
                filter === fl.key && {
                  backgroundColor: "rgba(255,255,255,0.3)",
                },
              ]}
            >
              <Text
                style={[
                  s.filterBadgeText,
                  filter === fl.key && { color: "#fff" },
                ]}
              >
                {fl.count}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── List ── */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: 14,
          paddingTop: 8,
          paddingBottom: 100,
        }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <HealthCard
            item={item}
            index={index}
            onEdit={openEdit}
            onQuickToggle={handleQuickToggle}
          />
        )}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={{ fontSize: 40 }}>🐄</Text>
            <Text style={s.emptyText}>No records found</Text>
          </View>
        }
      />

      {/* ── FAB ── */}
      <TouchableOpacity style={s.fab} onPress={openAdd} activeOpacity={0.85}>
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>

      {/* ── Modal ── */}
      <RecordModal
        visible={modalVisible}
        record={editingRecord}
        onClose={() => setModalVisible(false)}
        onSave={handleSave}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
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
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#16a34a",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addBtnText: { fontSize: 13, fontWeight: "700", color: "#fff" },

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

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    margin: 14,
    marginBottom: 8,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: { flex: 1, color: "#111827", fontSize: 14 },

  filterRow: { paddingHorizontal: 14, paddingBottom: 10, gap: 8 },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
  },
  filterChipText: { fontSize: 12, fontWeight: "700", color: "#6b7280" },
  filterBadge: {
    backgroundColor: "#f3f4f6",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  filterBadgeText: { fontSize: 10, fontWeight: "700", color: "#6b7280" },

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
  emptyText: { fontSize: 15, color: "#9ca3af", fontWeight: "600" },
});

const hc = StyleSheet.create({
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
  cardHealthy: { borderColor: "#bbf7d0" },
  topRow: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#fef2f2",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  cowName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: -0.2,
  },
  cowSr: { fontSize: 12, color: "#9ca3af", fontWeight: "500", marginTop: 1 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusText: { fontSize: 10, fontWeight: "700" },

  issueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    backgroundColor: "#fef2f2",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  issueText: { flex: 1, fontSize: 12, fontWeight: "600", color: "#991b1b" },
  sevBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
  },
  sevText: { fontSize: 10, fontWeight: "700" },

  quickToggles: { flexDirection: "row", gap: 8, marginTop: 10 },
  toggleChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#f9fafb",
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
  },
  toggleChipText: { fontSize: 11, fontWeight: "700" },

  divider: { height: 1, backgroundColor: "#f3f4f6", marginVertical: 12 },
  section: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 8,
    marginTop: 4,
  },

  updateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: 16,
    backgroundColor: "#ea580c",
    borderRadius: 12,
    paddingVertical: 12,
  },
  updateBtnText: { fontSize: 14, fontWeight: "800", color: "#fff" },
});

const dr = StyleSheet.create({
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
  focused: { borderColor: "#16a34a", backgroundColor: "#fff" },
  input: { flex: 1, color: "#111827", fontSize: 14, fontWeight: "500" },
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
  severityChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  severityDot: { width: 7, height: 7, borderRadius: 4 },
  severityText: { fontSize: 12, fontWeight: "700" },
});

const mo = StyleSheet.create({
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
  header: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  headerIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
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
  subName: { fontSize: 12, color: "#9ca3af", fontWeight: "500", marginTop: 1 },
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
    borderColor: "#e0e7ff",
    marginBottom: 4,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
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
