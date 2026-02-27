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

interface SemenRecord {
  id: string;
  admin_id: string;
  bullSrNo: string;
  bullName?: string;
  breed?: string;
  femalCalves: number;
  maleCalves: number;
  damaged: number;
  conceptionCount: number;
  totalDoses: number;
  notes?: string;
  created_at: string;
}

interface SemenForm {
  bullSrNo: string;
  bullName: string;
  breed: string;
  femalCalves: number;
  maleCalves: number;
  damaged: number;
  conceptionCount: number;
  totalDoses: number;
  notes: string;
}

const EMPTY_FORM: SemenForm = {
  bullSrNo: "",
  bullName: "",
  breed: "",
  femalCalves: 0,
  maleCalves: 0,
  damaged: 0,
  conceptionCount: 0,
  totalDoses: 0,
  notes: "",
};

function conceptionRate(record: SemenRecord): string {
  if (!record.totalDoses || record.totalDoses === 0) return "—";
  const rate = (record.conceptionCount / record.totalDoses) * 100;
  return `${rate.toFixed(1)}%`;
}

function rateColor(record: SemenRecord): string {
  if (!record.totalDoses) return "#9ca3af";
  const rate = (record.conceptionCount / record.totalDoses) * 100;
  if (rate >= 70) return "#16a34a";
  if (rate >= 40) return "#d97706";
  return "#dc2626";
}

function Counter({
  label,
  value,
  onChange,
  color,
  icon,
  emoji,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  color: string;
  icon: string;
  emoji: string;
}) {
  return (
    <View style={[ct.wrap, { borderColor: color + "30" }]}>
      <View style={ct.top}>
        <Text style={ct.emoji}>{emoji}</Text>
        <Text style={[ct.label, { color }]}>{label}</Text>
      </View>
      <View style={ct.row}>
        <TouchableOpacity
          style={[ct.btn, ct.minus, { borderColor: color + "40" }]}
          onPress={() => onChange(Math.max(0, value - 1))}
          activeOpacity={0.7}
        >
          <Ionicons name="remove" size={16} color={color} />
        </TouchableOpacity>
        <View
          style={[
            ct.countBox,
            { borderColor: color + "30", backgroundColor: color + "08" },
          ]}
        >
          <Text style={[ct.count, { color }]}>{value}</Text>
        </View>
        <TouchableOpacity
          style={[
            ct.btn,
            ct.plus,
            { backgroundColor: color, borderColor: color },
          ]}
          onPress={() => onChange(value + 1)}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

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
          color={focused ? "#0891b2" : "#9ca3af"}
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

function SemenFormModal({
  visible,
  onClose,
  onSave,
  editRecord,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (r: SemenRecord) => void;
  editRecord: SemenRecord | null;
}) {
  const isEdit = !!editRecord;
  const [form, setForm] = useState<SemenForm>(EMPTY_FORM);
  const [submitting, setSub] = useState(false);

  useEffect(() => {
    if (editRecord) {
      setForm({
        bullSrNo: editRecord.bullSrNo,
        bullName: editRecord.bullName ?? "",
        breed: editRecord.breed ?? "",
        femalCalves: editRecord.femalCalves,
        maleCalves: editRecord.maleCalves,
        damaged: editRecord.damaged,
        conceptionCount: editRecord.conceptionCount,
        totalDoses: editRecord.totalDoses,
        notes: editRecord.notes ?? "",
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [editRecord, visible]);

  const setF = (k: keyof SemenForm) => (v: any) =>
    setForm((p) => ({ ...p, [k]: v }));

  const reset = () => {
    setForm(EMPTY_FORM);
    onClose();
  };

  const submit = async () => {
    if (!form.bullSrNo.trim()) {
      Alert.alert("Missing Field", "Bull Sr. No. is required.");
      return;
    }
    setSub(true);
    try {
      const payload = {
        bullSrNo: form.bullSrNo.trim(),
        bullName: form.bullName || undefined,
        breed: form.breed || undefined,
        femalCalves: form.femalCalves,
        maleCalves: form.maleCalves,
        damaged: form.damaged,
        conceptionCount: form.conceptionCount,
        totalDoses: form.totalDoses,
        notes: form.notes || undefined,
      };

      let result: SemenRecord;
      if (isEdit && editRecord) {
        result = await api.updateSemenRecord(editRecord.id, payload);
      } else {
        result = await api.createSemenRecord(payload);
      }
      onSave(result);
      reset();
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Failed to save record.");
    } finally {
      setSub(false);
    }
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

            <View style={m.header}>
              <View
                style={[
                  m.headerIcon,
                  { backgroundColor: isEdit ? "#fff7ed" : "#ecfeff" },
                ]}
              >
                <Ionicons
                  name={isEdit ? "create" : "add-circle"}
                  size={18}
                  color={isEdit ? "#ea580c" : "#0891b2"}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={m.title}>
                  {isEdit ? "Edit Record" : "Add Semen Record"}
                </Text>
                {isEdit && editRecord && (
                  <Text style={m.sub2}>
                    {editRecord.bullSrNo}
                    {editRecord.bullName ? ` · ${editRecord.bullName}` : ""}
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={reset} style={m.closeBtn}>
                <Ionicons name="close" size={18} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 500 }}
            >
              <SectionHeader
                title="Bull Information"
                icon="male-outline"
                color="#0891b2"
              />
              <Field
                label="Bull Sr. No."
                value={form.bullSrNo}
                onChange={setF("bullSrNo")}
                placeholder="e.g. BULL-001"
                icon="barcode-outline"
              />
              <Field
                label="Bull Name"
                value={form.bullName}
                onChange={setF("bullName")}
                placeholder="e.g. Hercules"
                icon="text-outline"
              />
              <Field
                label="Breed"
                value={form.breed}
                onChange={setF("breed")}
                placeholder="e.g. Gir, HF, Jersey"
                icon="paw-outline"
              />

              <SectionHeader
                title="Semen Doses"
                icon="flask-outline"
                color="#7c3aed"
              />
              <View style={m.counterGrid}>
                <Counter
                  label="Total Doses"
                  value={form.totalDoses}
                  onChange={setF("totalDoses")}
                  color="#7c3aed"
                  icon="flask-outline"
                  emoji="💉"
                />
                <Counter
                  label="Damaged"
                  value={form.damaged}
                  onChange={setF("damaged")}
                  color="#dc2626"
                  icon="close-circle-outline"
                  emoji="❌"
                />
              </View>

              <SectionHeader
                title="Calves Born"
                icon="star-outline"
                color="#16a34a"
              />
              <View style={m.counterGrid}>
                <Counter
                  label="Female Calves"
                  value={form.femalCalves}
                  onChange={setF("femalCalves")}
                  color="#e11d48"
                  icon="female-outline"
                  emoji="🐮"
                />
                <Counter
                  label="Male Calves"
                  value={form.maleCalves}
                  onChange={setF("maleCalves")}
                  color="#2563eb"
                  icon="male-outline"
                  emoji="🐂"
                />
              </View>

              <SectionHeader
                title="Conception"
                icon="heart-outline"
                color="#d97706"
              />
              <View style={m.counterGrid}>
                <Counter
                  label="Conceptions"
                  value={form.conceptionCount}
                  onChange={setF("conceptionCount")}
                  color="#d97706"
                  icon="checkmark-circle-outline"
                  emoji="✅"
                />
                <View style={m.ratePreview}>
                  <Text style={m.rateLabel}>Conception Rate</Text>
                  <Text
                    style={[
                      m.rateValue,
                      {
                        color:
                          form.totalDoses > 0
                            ? form.conceptionCount / form.totalDoses >= 0.7
                              ? "#16a34a"
                              : form.conceptionCount / form.totalDoses >= 0.4
                                ? "#d97706"
                                : "#dc2626"
                            : "#9ca3af",
                      },
                    ]}
                  >
                    {form.totalDoses > 0
                      ? `${((form.conceptionCount / form.totalDoses) * 100).toFixed(1)}%`
                      : "—"}
                  </Text>
                  <Text style={m.rateHint}>Conceptions ÷ Total Doses</Text>
                </View>
              </View>

              <SectionHeader
                title="Notes"
                icon="document-text-outline"
                color="#6b7280"
              />
              <Field
                label="Notes"
                value={form.notes}
                onChange={setF("notes")}
                placeholder="Optional remarks..."
                icon="chatbubble-outline"
              />

              <View style={{ height: 16 }} />
            </ScrollView>

            <TouchableOpacity
              onPress={submit}
              style={[
                m.submitBtn,
                { backgroundColor: isEdit ? "#ea580c" : "#0891b2" },
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
                    {isEdit ? "Save Changes" : "Add Record"}
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

function SemenCard({
  item,
  index,
  onEdit,
  onDelete,
}: {
  item: SemenRecord;
  index: number;
  onEdit: (r: SemenRecord) => void;
  onDelete: (r: SemenRecord) => void;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const [expanded, setExpanded] = useState(false);
  const rate = conceptionRate(item);
  const rColor = rateColor(item);
  const totalCalves = item.femalCalves + item.maleCalves;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 320,
        delay: index * 70,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        delay: index * 70,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[c.card, { opacity, transform: [{ translateY }] }]}>
      <TouchableOpacity
        onPress={() => setExpanded((e) => !e)}
        activeOpacity={0.85}
      >
        {/* Top row */}
        <View style={c.topRow}>
          <View style={c.bullAvatar}>
            <Text style={{ fontSize: 26 }}>🐂</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <Text style={c.bullSr}>{item.bullSrNo}</Text>
              {item.bullName && <Text style={c.bullName}>{item.bullName}</Text>}
            </View>
            <Text style={c.breed}>{item.breed ?? "Unknown breed"}</Text>
          </View>
          <View
            style={[
              c.rateBadge,
              { backgroundColor: rColor + "15", borderColor: rColor + "40" },
            ]}
          >
            <Text style={[c.rateText, { color: rColor }]}>{rate}</Text>
            <Text style={[c.rateSubText, { color: rColor }]}>Rate</Text>
          </View>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={15}
            color="#d1d5db"
            style={{ marginLeft: 8 }}
          />
        </View>

        <View style={c.statsStrip}>
          <View style={c.stripItem}>
            <Text style={c.stripEmoji}>🐮</Text>
            <Text style={c.stripCount}>{item.femalCalves}</Text>
            <Text style={c.stripLabel}>Female</Text>
          </View>
          <View style={c.stripDivider} />
          <View style={c.stripItem}>
            <Text style={c.stripEmoji}>🐂</Text>
            <Text style={c.stripCount}>{item.maleCalves}</Text>
            <Text style={c.stripLabel}>Male</Text>
          </View>
          <View style={c.stripDivider} />
          <View style={c.stripItem}>
            <Text style={c.stripEmoji}>💉</Text>
            <Text style={c.stripCount}>{item.totalDoses}</Text>
            <Text style={c.stripLabel}>Doses</Text>
          </View>
          <View style={c.stripDivider} />
          <View style={c.stripItem}>
            <Text style={c.stripEmoji}>❌</Text>
            <Text
              style={[
                c.stripCount,
                { color: item.damaged > 0 ? "#dc2626" : "#9ca3af" },
              ]}
            >
              {item.damaged}
            </Text>
            <Text style={c.stripLabel}>Damaged</Text>
          </View>
          <View style={c.stripDivider} />
          <View style={c.stripItem}>
            <Text style={c.stripEmoji}>✅</Text>
            <Text style={[c.stripCount, { color: "#d97706" }]}>
              {item.conceptionCount}
            </Text>
            <Text style={c.stripLabel}>Concepts</Text>
          </View>
        </View>
      </TouchableOpacity>

      {expanded && (
        <>
          <View style={c.divider} />
          <View style={c.detailGrid}>
            <View
              style={[
                c.detailCell,
                { borderColor: "#fecdd3", backgroundColor: "#fff1f2" },
              ]}
            >
              <Text style={c.detailEmoji}>🐮</Text>
              <Text style={[c.detailCount, { color: "#e11d48" }]}>
                {item.femalCalves}
              </Text>
              <Text style={[c.detailLabel, { color: "#e11d48" }]}>
                Female Calves
              </Text>
            </View>

            <View
              style={[
                c.detailCell,
                { borderColor: "#bfdbfe", backgroundColor: "#eff6ff" },
              ]}
            >
              <Text style={c.detailEmoji}>🐂</Text>
              <Text style={[c.detailCount, { color: "#2563eb" }]}>
                {item.maleCalves}
              </Text>
              <Text style={[c.detailLabel, { color: "#2563eb" }]}>
                Male Calves
              </Text>
            </View>

            <View
              style={[
                c.detailCell,
                { borderColor: "#bbf7d0", backgroundColor: "#f0fdf4" },
              ]}
            >
              <Text style={c.detailEmoji}>🐄</Text>
              <Text style={[c.detailCount, { color: "#16a34a" }]}>
                {totalCalves}
              </Text>
              <Text style={[c.detailLabel, { color: "#16a34a" }]}>
                Total Calves
              </Text>
            </View>

            <View
              style={[
                c.detailCell,
                { borderColor: "#e9d5ff", backgroundColor: "#faf5ff" },
              ]}
            >
              <Text style={c.detailEmoji}>💉</Text>
              <Text style={[c.detailCount, { color: "#7c3aed" }]}>
                {item.totalDoses}
              </Text>
              <Text style={[c.detailLabel, { color: "#7c3aed" }]}>
                Total Doses
              </Text>
            </View>

            <View
              style={[
                c.detailCell,
                { borderColor: "#fecdd3", backgroundColor: "#fff1f2" },
              ]}
            >
              <Text style={c.detailEmoji}>❌</Text>
              <Text style={[c.detailCount, { color: "#dc2626" }]}>
                {item.damaged}
              </Text>
              <Text style={[c.detailLabel, { color: "#dc2626" }]}>Damaged</Text>
            </View>

            <View
              style={[
                c.detailCell,
                { borderColor: rColor + "40", backgroundColor: rColor + "10" },
              ]}
            >
              <Text style={c.detailEmoji}>📊</Text>
              <Text style={[c.detailCount, { color: rColor }]}>{rate}</Text>
              <Text style={[c.detailLabel, { color: rColor }]}>
                Conception %
              </Text>
            </View>
          </View>

          {item.totalDoses > 0 && (
            <View style={c.barWrap}>
              <View style={c.barHeader}>
                <Text style={c.barTitle}>Conception Rate</Text>
                <Text style={[c.barPct, { color: rColor }]}>{rate}</Text>
              </View>
              <View style={c.barTrack}>
                <Animated.View
                  style={[
                    c.barFill,
                    {
                      width:
                        `${Math.min(100, (item.conceptionCount / item.totalDoses) * 100)}%` as any,
                      backgroundColor: rColor,
                    },
                  ]}
                />
              </View>
              <Text style={c.barHint}>
                {item.conceptionCount} conceptions out of {item.totalDoses}{" "}
                doses
              </Text>
            </View>
          )}

          {item.notes ? (
            <View style={c.notesBox}>
              <Ionicons name="chatbubble-outline" size={13} color="#6b7280" />
              <Text style={c.notesText}>{item.notes}</Text>
            </View>
          ) : null}

          <View style={c.actionRow}>
            <TouchableOpacity
              style={[c.actionBtn, c.editBtn]}
              onPress={() => onEdit(item)}
              activeOpacity={0.8}
            >
              <Ionicons name="create-outline" size={15} color="#0891b2" />
              <Text style={[c.actionText, { color: "#0891b2" }]}>Edit</Text>
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
    </Animated.View>
  );
}

export default function SemenRecordScreen() {
  const router = useRouter();
  const [records, setRecords] = useState<SemenRecord[]>([]);
  const [screen, setScreen] = useState<"home" | "list">("home");
  const [search, setSearch] = useState("");
  const [modalVisible, setModal] = useState(false);
  const [editRecord, setEditRecord] = useState<SemenRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = useCallback(async (q?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getSemenRecords(q);
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

  const handleDelete = (r: SemenRecord) => {
    Alert.alert(
      "Delete Record",
      `Delete semen record for Bull ${r.bullSrNo}${r.bullName ? ` (${r.bullName})` : ""}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.deleteSemenRecord(r.id);
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
  const openEdit = (r: SemenRecord) => {
    setEditRecord(r);
    setModal(true);
  };

  const totalFemalCalves = records.reduce((s, r) => s + r.femalCalves, 0);
  const totalMaleCalves = records.reduce((s, r) => s + r.maleCalves, 0);
  const totalDoses = records.reduce((s, r) => s + r.totalDoses, 0);
  const totalConceptions = records.reduce((s, r) => s + r.conceptionCount, 0);
  const overallRate =
    totalDoses > 0
      ? `${((totalConceptions / totalDoses) * 100).toFixed(1)}%`
      : "—";

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
          <Text style={s.headerTitle}>Semen Records</Text>
          <Text style={s.headerSub}>{records.length} bulls tracked</Text>
        </View>
        {screen === "list" && (
          <View style={s.countBadge}>
            <Text style={s.countText}>{records.length}</Text>
          </View>
        )}
      </View>

      <View style={s.statsRow}>
        {[
          { label: "Bulls", value: records.length, color: "#0891b2" },
          { label: "Female 🐮", value: totalFemalCalves, color: "#e11d48" },
          { label: "Male 🐂", value: totalMaleCalves, color: "#2563eb" },
          {
            label: "Rate",
            value: overallRate,
            color: rateColor({
              totalDoses,
              conceptionCount: totalConceptions,
            } as SemenRecord),
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
        <View style={s.homeBody}>
          <View style={s.heroWrap}>
            <Text style={s.heroEmoji}>🐂</Text>
            <Text style={s.homeHeading}>Semen Records</Text>
            <Text style={s.homeSub}>
              Track bull performance, calves & conception rates
            </Text>
          </View>

          <View style={s.btnGroup}>
            <TouchableOpacity
              onPress={openAdd}
              style={s.bigBtn}
              activeOpacity={0.85}
            >
              <View style={[s.bigBtnIcon, { backgroundColor: "#ecfeff" }]}>
                <Text style={{ fontSize: 30 }}>➕</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.bigBtnTitle}>Add Semen Record</Text>
                <Text style={s.bigBtnSub}>
                  Register a new bull's semen data
                </Text>
              </View>
              <View style={[s.bigBtnArrow, { backgroundColor: "#0891b2" }]}>
                <Ionicons name="add" size={18} color="#fff" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setScreen("list")}
              style={s.bigBtn}
              activeOpacity={0.85}
            >
              <View style={[s.bigBtnIcon, { backgroundColor: "#eff6ff" }]}>
                <Text style={{ fontSize: 30 }}>📋</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.bigBtnTitle}>View All Records</Text>
                <Text style={s.bigBtnSub}>
                  Browse {records.length} bull records
                </Text>
              </View>
              <View style={[s.bigBtnArrow, { backgroundColor: "#2563eb" }]}>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </View>
            </TouchableOpacity>
          </View>

          {records.length > 0 && (
            <View style={s.summaryRow}>
              <View
                style={[
                  s.summaryCard,
                  { backgroundColor: "#fff1f2", borderColor: "#fecdd3" },
                ]}
              >
                <Text style={s.summaryEmoji}>🐮</Text>
                <Text style={[s.summaryCount, { color: "#e11d48" }]}>
                  {totalFemalCalves}
                </Text>
                <Text style={[s.summaryLabel, { color: "#e11d48" }]}>
                  Female Calves
                </Text>
              </View>
              <View
                style={[
                  s.summaryCard,
                  { backgroundColor: "#eff6ff", borderColor: "#bfdbfe" },
                ]}
              >
                <Text style={s.summaryEmoji}>🐂</Text>
                <Text style={[s.summaryCount, { color: "#2563eb" }]}>
                  {totalMaleCalves}
                </Text>
                <Text style={[s.summaryLabel, { color: "#2563eb" }]}>
                  Male Calves
                </Text>
              </View>
              <View
                style={[
                  s.summaryCard,
                  { backgroundColor: "#fffbeb", borderColor: "#fcd34d" },
                ]}
              >
                <Text style={s.summaryEmoji}>📊</Text>
                <Text style={[s.summaryCount, { color: "#d97706" }]}>
                  {overallRate}
                </Text>
                <Text style={[s.summaryLabel, { color: "#d97706" }]}>
                  Avg Rate
                </Text>
              </View>
            </View>
          )}
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <View style={s.searchWrap}>
            <Ionicons name="search-outline" size={15} color="#9ca3af" />
            <TextInput
              style={s.searchInput}
              placeholder="Search bull Sr. No., name, breed..."
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
              <ActivityIndicator size="large" color="#0891b2" />
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
                paddingTop: 8,
                paddingBottom: 100,
              }}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor="#0891b2"
                />
              }
              renderItem={({ item, index }) => (
                <SemenCard
                  item={item}
                  index={index}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                />
              )}
              ListEmptyComponent={
                <View style={s.empty}>
                  <Text style={{ fontSize: 44 }}>🐂</Text>
                  <Text style={s.emptyText}>No records found</Text>
                  <TouchableOpacity onPress={openAdd} style={s.emptyAddBtn}>
                    <Ionicons name="add" size={14} color="#fff" />
                    <Text style={s.emptyAddText}>Add First Record</Text>
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

      <SemenFormModal
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
    backgroundColor: "#ecfeff",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#a5f3fc",
  },
  countText: { fontSize: 12, fontWeight: "700", color: "#0891b2" },
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

  homeBody: { flex: 1, paddingHorizontal: 20, paddingTop: 24 },
  heroWrap: { alignItems: "center", marginBottom: 28 },
  heroEmoji: { fontSize: 48, marginBottom: 10 },
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
  },

  btnGroup: { gap: 12, marginBottom: 24 },
  bigBtn: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1.5,
    borderColor: "#f1f5f9",
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  bigBtnIcon: {
    width: 52,
    height: 52,
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
  summaryCount: { fontSize: 18, fontWeight: "800", letterSpacing: -0.3 },
  summaryLabel: { fontSize: 10, fontWeight: "700", textTransform: "uppercase" },

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    margin: 14,
    marginBottom: 8,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: { flex: 1, color: "#0f172a", fontSize: 14 },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#0891b2",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0891b2",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 15, color: "#94a3b8", fontWeight: "600" },
  emptyAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0891b2",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 4,
  },
  emptyAddText: { fontSize: 13, fontWeight: "700", color: "#fff" },
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
    backgroundColor: "#0891b2",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryText: { fontSize: 13, fontWeight: "700", color: "#fff" },
});

const c = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  topRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  bullAvatar: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
  },
  bullSr: { fontSize: 14, fontWeight: "800", color: "#0f172a" },
  bullName: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  breed: { fontSize: 12, color: "#94a3b8", fontWeight: "500", marginTop: 2 },
  rateBadge: {
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: "center",
    minWidth: 52,
  },
  rateText: { fontSize: 14, fontWeight: "800" },
  rateSubText: {
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    marginTop: 1,
  },

  statsStrip: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  stripItem: { flex: 1, alignItems: "center", gap: 2 },
  stripDivider: { width: 1, backgroundColor: "#e2e8f0" },
  stripEmoji: { fontSize: 14 },
  stripCount: { fontSize: 14, fontWeight: "800", color: "#0f172a" },
  stripLabel: {
    fontSize: 8,
    color: "#94a3b8",
    fontWeight: "600",
    textTransform: "uppercase",
  },

  divider: { height: 1, backgroundColor: "#f1f5f9", marginVertical: 14 },

  detailGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  detailCell: {
    width: "30%",
    flex: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 12,
    alignItems: "center",
    gap: 4,
    minWidth: 90,
  },
  detailEmoji: { fontSize: 20 },
  detailCount: { fontSize: 20, fontWeight: "800", letterSpacing: -0.5 },
  detailLabel: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    textAlign: "center",
  },

  barWrap: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  barHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  barTitle: { fontSize: 12, fontWeight: "700", color: "#475569" },
  barPct: { fontSize: 13, fontWeight: "800" },
  barTrack: {
    height: 8,
    backgroundColor: "#e2e8f0",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 6,
  },
  barFill: { height: "100%" as any, borderRadius: 4 },
  barHint: { fontSize: 11, color: "#94a3b8", fontWeight: "500" },

  notesBox: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  notesText: { flex: 1, fontSize: 12, color: "#475569", fontWeight: "500" },

  actionRow: { flexDirection: "row", gap: 10 },
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
  editBtn: { backgroundColor: "#ecfeff", borderColor: "#a5f3fc" },
  deleteBtn: { backgroundColor: "#fff1f2", borderColor: "#fecdd3" },
  actionText: { fontSize: 13, fontWeight: "700" },
});

const ct = StyleSheet.create({
  wrap: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 12,
    backgroundColor: "#fff",
    alignItems: "center",
    gap: 8,
  },
  top: { flexDirection: "row", alignItems: "center", gap: 6 },
  emoji: { fontSize: 16 },
  label: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  btn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  minus: { backgroundColor: "#fff" },
  plus: {},
  countBox: {
    minWidth: 48,
    height: 36,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  count: { fontSize: 18, fontWeight: "800", letterSpacing: -0.5 },
});

const f = StyleSheet.create({
  wrap: { marginBottom: 12 },
  label: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "700",
    letterSpacing: 0.4,
    marginBottom: 6,
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
  focused: { borderColor: "#0891b2", backgroundColor: "#fff" },
  input: { flex: 1, color: "#0f172a", fontSize: 14, fontWeight: "500" },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderLeftWidth: 3,
    paddingLeft: 10,
    marginBottom: 12,
    marginTop: 6,
  },
  sectionTitle: { fontSize: 12, fontWeight: "700", letterSpacing: 0.2 },
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
    marginBottom: 20,
  },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.3,
  },
  sub2: { fontSize: 12, color: "#94a3b8", fontWeight: "500", marginTop: 1 },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: "auto" as any,
  },
  counterGrid: { flexDirection: "row", gap: 10, marginBottom: 12 },
  ratePreview: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#fcd34d40",
    backgroundColor: "#fffbeb",
    padding: 12,
    alignItems: "center",
    gap: 4,
  },
  rateLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#92400e",
    textTransform: "uppercase",
  },
  rateValue: { fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
  rateHint: {
    fontSize: 9,
    color: "#b45309",
    fontWeight: "500",
    textAlign: "center",
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    paddingVertical: 15,
    gap: 8,
    marginTop: 8,
  },
  submitText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.2,
  },
});
