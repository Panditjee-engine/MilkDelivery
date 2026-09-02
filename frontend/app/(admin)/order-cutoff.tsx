import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../src/services/api";

const C = {
  bg: "#FFF8F4",
  card: "#FFFFFF",
  primary: "#FF9675",
  dark: "#BB6B3F",
  text: "#1A1A1A",
  muted: "#8B6854",
  faint: "#C9A882",
  border: "#FFE8D6",
  green: "#16A34A",
  red: "#DC2626",
  amber: "#D97706",
};

type CutoffRule = {
  id: string;
  product_id?: string | null;
  product_name?: string | null;
  cutoff_time?: string;
  start_time?: string;
  end_time?: string;
  schedule_type?: ScheduleType;
  days?: number[];
  is_active: boolean;
};

type Scope = "all" | "product";
type ScheduleType = "daily" | "weekly" | "custom";
type TimeTarget = "start" | "end";
type TimeDraft = { hour: number; minute: string; period: "AM" | "PM" };

const DAYS = [
  { value: 0, label: "Mon" },
  { value: 1, label: "Tue" },
  { value: 2, label: "Wed" },
  { value: 3, label: "Thu" },
  { value: 4, label: "Fri" },
  { value: 5, label: "Sat" },
  { value: 6, label: "Sun" },
];
const HOURS = Array.from({ length: 12 }, (_, index) => index + 1);
const MINUTES = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];

const toTimeLabel = (value: string) => {
  const [h, m] = String(value || "20:00").split(":").map(Number);
  const date = new Date();
  date.setHours(h || 0, m || 0, 0, 0);
  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const toTimeDraft = (value: string): TimeDraft => {
  const [rawHour, rawMinute] = String(value || "20:00").split(":").map(Number);
  const hour24 = Number.isFinite(rawHour) ? rawHour : 20;
  const minute = Number.isFinite(rawMinute) ? rawMinute : 0;
  const roundedMinute = Math.min(55, Math.round(minute / 5) * 5);
  return {
    hour: hour24 % 12 || 12,
    minute: String(roundedMinute).padStart(2, "0"),
    period: hour24 >= 12 ? "PM" : "AM",
  };
};

const timeDraftToValue = (draft: TimeDraft) => {
  let hour = draft.hour % 12;
  if (draft.period === "PM") hour += 12;
  return `${String(hour).padStart(2, "0")}:${draft.minute}`;
};

const ruleStart = (rule: CutoffRule) => rule.start_time || rule.cutoff_time || "18:00";
const ruleEnd = (rule: CutoffRule) => rule.end_time || rule.cutoff_time || "20:00";
const scheduleLabel = (rule: CutoffRule) => {
  const type = rule.schedule_type || "daily";
  if (type === "daily") return "Daily";
  const days = (rule.days || []).map((day) => DAYS.find((d) => d.value === day)?.label).filter(Boolean);
  return `${type === "weekly" ? "Weekly" : "Custom"}${days.length ? ` · ${days.join(", ")}` : ""}`;
};

export default function AdminOrderCutoffScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [rules, setRules] = useState<CutoffRule[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<CutoffRule | null>(null);
  const [scope, setScope] = useState<Scope>("all");
  const [productId, setProductId] = useState("");
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("20:00");
  const [scheduleType, setScheduleType] = useState<ScheduleType>("daily");
  const [days, setDays] = useState<number[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [timeTarget, setTimeTarget] = useState<TimeTarget>("start");
  const [timeDraft, setTimeDraft] = useState<TimeDraft>(() => toTimeDraft("18:00"));
  const [editSheetVisible, setEditSheetVisible] = useState(false);

  const goBackToSettings = useCallback(() => {
    router.replace("/(admin)/settings" as any);
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        goBackToSettings();
        return true;
      });
      return () => sub.remove();
    }, [goBackToSettings]),
  );

  const load = useCallback(async (soft = false) => {
    if (soft) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const [ruleResult, productResult] = await Promise.allSettled([
        api.getAdminOrderCutoffs(),
        api.getProducts(),
      ]);

      if (ruleResult.status === "fulfilled") {
        setRules(Array.isArray(ruleResult.value) ? ruleResult.value : []);
      } else {
        setRules([]);
        if (!String(ruleResult.reason?.message || "").includes("Not Found")) {
          Alert.alert(
            "Could not load cut-off rules",
            ruleResult.reason?.message || "Please try again.",
          );
        }
      }

      if (productResult.status === "fulfilled") {
        setProducts(Array.isArray(productResult.value) ? productResult.value : []);
      } else {
        setProducts([]);
        Alert.alert(
          "Could not load products",
          productResult.reason?.message || "Please try again.",
        );
      }
    } catch (error: any) {
      Alert.alert("Could not load cut-off rules", error?.message || "Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setEditing(null);
    setEditSheetVisible(false);
    setTimePickerVisible(false);
    setScope("all");
    setProductId("");
    setStartTime("18:00");
    setEndTime("20:00");
    setScheduleType("daily");
    setDays([]);
    setIsActive(true);
  };

  const startEdit = (rule: CutoffRule) => {
    setTimePickerVisible(false);
    setEditing(rule);
    setScope(rule.product_id ? "product" : "all");
    setProductId(rule.product_id || "");
    setStartTime(ruleStart(rule));
    setEndTime(ruleEnd(rule));
    setScheduleType(rule.schedule_type || "daily");
    setDays(rule.days || []);
    setIsActive(rule.is_active !== false);
    setEditSheetVisible(true);
  };

  const openTimePicker = (target: TimeTarget) => {
    setTimeTarget(target);
    setTimeDraft(toTimeDraft(target === "start" ? startTime : endTime));
    setTimePickerVisible(true);
  };

  const closeTimePicker = () => {
    setTimePickerVisible(false);
  };

  const confirmTimePicker = () => {
    const value = timeDraftToValue(timeDraft);
    if (timeTarget === "start") {
      setStartTime(value);
    } else {
      setEndTime(value);
    }
    closeTimePicker();
  };

  const renderInlineTimePicker = () => {
    if (!timePickerVisible) return null;
    return (
      <View style={s.inlineTimePicker}>
        <View style={s.pickerHeader}>
          <View>
            <Text style={s.pickerTitle}>
              Select Cut-off {timeTarget === "start" ? "Start" : "End"} Time
            </Text>
            <Text style={s.pickerSub}>{toTimeLabel(timeDraftToValue(timeDraft))}</Text>
          </View>
          <TouchableOpacity style={s.closeBtn} onPress={closeTimePicker}>
            <Ionicons name="close" size={18} color={C.dark} />
          </TouchableOpacity>
        </View>

        <Text style={s.pickerSectionLabel}>Hour</Text>
        <View style={s.pickerGrid}>
          {HOURS.map((hour) => {
            const active = timeDraft.hour === hour;
            return (
              <TouchableOpacity
                key={hour}
                style={[s.pickerChip, active && s.pickerChipActive]}
                onPress={() => setTimeDraft((current) => ({ ...current, hour }))}
              >
                <Text style={[s.pickerChipText, active && s.pickerChipTextActive]}>{hour}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={s.pickerSectionLabel}>Minute</Text>
        <View style={s.pickerGrid}>
          {MINUTES.map((minute) => {
            const active = timeDraft.minute === minute;
            return (
              <TouchableOpacity
                key={minute}
                style={[s.pickerChip, active && s.pickerChipActive]}
                onPress={() => setTimeDraft((current) => ({ ...current, minute }))}
              >
                <Text style={[s.pickerChipText, active && s.pickerChipTextActive]}>{minute}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={s.periodRow}>
          {(["AM", "PM"] as const).map((period) => {
            const active = timeDraft.period === period;
            return (
              <TouchableOpacity
                key={period}
                style={[s.periodBtn, active && s.pickerChipActive]}
                onPress={() => setTimeDraft((current) => ({ ...current, period }))}
              >
                <Text style={[s.pickerChipText, active && s.pickerChipTextActive]}>{period}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={s.pickerActions}>
          <TouchableOpacity style={s.pickerCancel} onPress={closeTimePicker}>
            <Text style={s.pickerCancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.pickerConfirm} onPress={confirmTimePicker}>
            <Text style={s.pickerConfirmText}>Apply Time</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const toggleDay = (day: number) => {
    setDays((current) =>
      current.includes(day)
        ? current.filter((value) => value !== day)
        : [...current, day].sort((a, b) => a - b),
    );
  };

  const saveRule = async () => {
    if (scope === "product" && !productId) {
      Alert.alert("Select product", "Please choose a product for individual cut-off time.");
      return;
    }
    if (scheduleType !== "daily" && !days.length) {
      Alert.alert("Select days", "Please choose at least one day for weekly/custom cut-off.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        product_id: scope === "product" ? productId : null,
        cutoff_time: endTime,
        start_time: startTime,
        end_time: endTime,
        schedule_type: scheduleType,
        days: scheduleType === "daily" ? [] : days,
        is_active: isActive,
      };
      const wasEditing = Boolean(editing);
      if (wasEditing && editing) {
        await api.updateAdminOrderCutoff(editing.id, payload);
      } else {
        await api.createAdminOrderCutoff(payload);
      }
      resetForm();
      await load(true);
    } catch (error: any) {
      Alert.alert("Could not save rule", error?.message || "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (rule: CutoffRule) => {
    Alert.alert(
      "Delete cut-off rule?",
      `${rule.product_name || "All Products"} cut-off will be removed.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.deleteAdminOrderCutoff(rule.id);
              if (editing?.id === rule.id) resetForm();
              await load(true);
            } catch (error: any) {
              Alert.alert("Could not delete rule", error?.message || "Please try again.");
            }
          },
        },
      ],
    );
  };

  const toggleRule = async (rule: CutoffRule) => {
    try {
      await api.updateAdminOrderCutoff(rule.id, {
        product_id: rule.product_id || null,
        cutoff_time: ruleEnd(rule),
        start_time: ruleStart(rule),
        end_time: ruleEnd(rule),
        schedule_type: rule.schedule_type || "daily",
        days: rule.schedule_type === "daily" ? [] : rule.days || [],
        is_active: !rule.is_active,
      });
      setRules((rows) =>
        rows.map((row) =>
          row.id === rule.id ? { ...row, is_active: !rule.is_active } : row,
        ),
      );
    } catch (error: any) {
      Alert.alert("Could not update rule", error?.message || "Please try again.");
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={[s.header, { paddingTop: Math.max(insets.top + 8, 18) }]}>
        <TouchableOpacity style={s.backBtn} onPress={goBackToSettings}>
          <Ionicons name="chevron-back" size={22} color={C.dark} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Order Cut-off Time</Text>
          <Text style={s.subtitle}>Block customer orders after configured time</Text>
        </View>
      </View>

      {loading ? (
        <View style={s.loader}>
          <ActivityIndicator color={C.primary} />
          <Text style={s.loaderText}>Loading cut-off settings...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={s.infoCard}>
            <Ionicons name="shield-checkmark-outline" size={20} color={C.green} />
            <Text style={s.infoText}>
              Product-specific rules override the All Products cut-off. Customers cannot place orders or subscriptions after the matching time.
            </Text>
          </View>

          <View style={s.formCard}>
            <View style={s.formHeader}>
              <Text style={s.cardTitle}>Add Cut-off Rule</Text>
            </View>

            <Text style={s.label}>Scope</Text>
            <View style={s.segment}>
              {(["all", "product"] as Scope[]).map((item) => {
                const active = scope === item;
                return (
                  <TouchableOpacity
                    key={item}
                    style={[s.segmentBtn, active && s.segmentActive]}
                    onPress={() => setScope(item)}
                  >
                    <Ionicons
                      name={item === "all" ? "apps-outline" : "cube-outline"}
                      size={15}
                      color={active ? "#fff" : C.dark}
                    />
                    <Text style={[s.segmentText, active && s.segmentTextActive]}>
                      {item === "all" ? "All Products" : "Individual"}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {scope === "product" ? (
              <>
                <Text style={s.label}>Product</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.productRow}>
                  {products.map((product) => {
                    const active = productId === product.id;
                    return (
                      <TouchableOpacity
                        key={product.id}
                        style={[s.productChip, active && s.productChipActive]}
                        onPress={() => setProductId(product.id)}
                      >
                        <Text style={[s.productChipText, active && s.productChipTextActive]} numberOfLines={1}>
                          {product.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </>
            ) : null}

            <Text style={s.label}>Cut-off Window</Text>
            <View style={s.timeGrid}>
              <TouchableOpacity style={s.timeBtn} onPress={() => openTimePicker("start")}>
                <Ionicons name="play-outline" size={18} color={C.dark} />
                <View style={{ flex: 1 }}>
                  <Text style={s.timeMiniLabel}>Start</Text>
                  <Text style={s.timeText}>{toTimeLabel(startTime)}</Text>
                </View>
                <Text style={s.timeHint}>{startTime}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.timeBtn} onPress={() => openTimePicker("end")}>
                <Ionicons name="stop-outline" size={18} color={C.dark} />
                <View style={{ flex: 1 }}>
                  <Text style={s.timeMiniLabel}>End</Text>
                  <Text style={s.timeText}>{toTimeLabel(endTime)}</Text>
                </View>
                <Text style={s.timeHint}>{endTime}</Text>
              </TouchableOpacity>
            </View>
            {renderInlineTimePicker()}

            <Text style={s.label}>Schedule</Text>
            <View style={s.segment}>
              {(["daily", "weekly", "custom"] as ScheduleType[]).map((item) => {
                const active = scheduleType === item;
                return (
                  <TouchableOpacity
                    key={item}
                    style={[s.segmentBtn, active && s.segmentActive]}
                    onPress={() => setScheduleType(item)}
                  >
                    <Text style={[s.segmentText, active && s.segmentTextActive]}>
                      {item === "daily" ? "Daily" : item === "weekly" ? "Weekly" : "Custom"}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {scheduleType !== "daily" ? (
              <View style={s.dayRow}>
                {DAYS.map((day) => {
                  const active = days.includes(day.value);
                  return (
                    <TouchableOpacity
                      key={day.value}
                      style={[s.dayChip, active && s.dayChipActive]}
                      onPress={() => toggleDay(day.value)}
                    >
                      <Text style={[s.dayText, active && s.dayTextActive]}>{day.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : null}

            <TouchableOpacity style={s.activeRow} onPress={() => setIsActive((value) => !value)}>
              <View>
                <Text style={s.activeTitle}>Rule Status</Text>
                <Text style={s.activeSub}>{isActive ? "Customers will be blocked during this cut-off window." : "Rule is saved but not applied."}</Text>
              </View>
              <View style={[s.switchTrack, isActive && s.switchTrackOn]}>
                <View style={[s.switchKnob, isActive && s.switchKnobOn]} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={saveRule} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Ionicons name="save-outline" size={17} color="#fff" />}
              <Text style={s.saveText}>Save Rule</Text>
            </TouchableOpacity>
          </View>

          <View style={s.listHeader}>
            <Text style={s.cardTitle}>Configured Rules</Text>
            <Text style={s.count}>{rules.length}</Text>
          </View>

          {rules.length ? (
            rules.map((rule) => (
              <View key={rule.id} style={s.ruleCard}>
                <View style={s.ruleTop}>
                  <View style={s.ruleIcon}>
                    <Ionicons name={rule.product_id ? "cube-outline" : "apps-outline"} size={18} color={C.dark} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.ruleTitle}>{rule.product_name || "All Products"}</Text>
                    <Text style={s.ruleSub}>
                      Cut-off {toTimeLabel(ruleStart(rule))} - {toTimeLabel(ruleEnd(rule))} · {scheduleLabel(rule)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[s.statusPill, rule.is_active ? s.statusOn : s.statusOff]}
                    onPress={() => toggleRule(rule)}
                  >
                    <Text style={[s.statusText, { color: rule.is_active ? C.green : C.faint }]}>
                      {rule.is_active ? "Active" : "Off"}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={s.ruleActions}>
                  <TouchableOpacity style={s.editBtn} onPress={() => startEdit(rule)}>
                    <Ionicons name="create-outline" size={15} color={C.dark} />
                    <Text style={s.editText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.deleteBtn} onPress={() => confirmDelete(rule)}>
                    <Ionicons name="trash-outline" size={15} color={C.red} />
                    <Text style={s.deleteText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <View style={s.emptyCard}>
              <Ionicons name="time-outline" size={28} color={C.faint} />
              <Text style={s.emptyTitle}>No cut-off rules yet</Text>
              <Text style={s.emptySub}>Add an All Products rule or create individual product rules.</Text>
            </View>
          )}
        </ScrollView>
      )}

      <Modal
        transparent
        visible={editSheetVisible}
        animationType="slide"
        onRequestClose={resetForm}
      >
        <View style={s.sheetOverlay}>
          <TouchableOpacity style={s.sheetBackdrop} activeOpacity={1} onPress={resetForm} />
          <View style={s.editSheet}>
            <View style={s.drag} />
            <View style={s.sheetHeader}>
              <View>
                <Text style={s.sheetTitle}>Edit Cut-off Rule</Text>
                <Text style={s.sheetSub}>
                  Update {editing?.product_name || "All Products"} rule
                </Text>
              </View>
              <TouchableOpacity style={s.closeBtn} onPress={resetForm}>
                <Ionicons name="close" size={18} color={C.dark} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 12 }}>
              <Text style={s.label}>Scope</Text>
              <View style={s.segment}>
                {(["all", "product"] as Scope[]).map((item) => {
                  const active = scope === item;
                  return (
                    <TouchableOpacity
                      key={item}
                      style={[s.segmentBtn, active && s.segmentActive]}
                      onPress={() => setScope(item)}
                    >
                      <Ionicons
                        name={item === "all" ? "apps-outline" : "cube-outline"}
                        size={15}
                        color={active ? "#fff" : C.dark}
                      />
                      <Text style={[s.segmentText, active && s.segmentTextActive]}>
                        {item === "all" ? "All Products" : "Individual"}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {scope === "product" ? (
                <>
                  <Text style={s.label}>Product</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.productRow}>
                    {products.map((product) => {
                      const active = productId === product.id;
                      return (
                        <TouchableOpacity
                          key={product.id}
                          style={[s.productChip, active && s.productChipActive]}
                          onPress={() => setProductId(product.id)}
                        >
                          <Text style={[s.productChipText, active && s.productChipTextActive]} numberOfLines={1}>
                            {product.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </>
              ) : null}

              <Text style={s.label}>Cut-off Window</Text>
              <View style={s.timeGrid}>
                <TouchableOpacity style={s.timeBtn} onPress={() => openTimePicker("start")}>
                  <Ionicons name="play-outline" size={18} color={C.dark} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.timeMiniLabel}>Start</Text>
                    <Text style={s.timeText}>{toTimeLabel(startTime)}</Text>
                  </View>
                  <Text style={s.timeHint}>{startTime}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.timeBtn} onPress={() => openTimePicker("end")}>
                  <Ionicons name="stop-outline" size={18} color={C.dark} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.timeMiniLabel}>End</Text>
                    <Text style={s.timeText}>{toTimeLabel(endTime)}</Text>
                  </View>
                  <Text style={s.timeHint}>{endTime}</Text>
                </TouchableOpacity>
              </View>
              {renderInlineTimePicker()}

              <Text style={s.label}>Schedule</Text>
              <View style={s.segment}>
                {(["daily", "weekly", "custom"] as ScheduleType[]).map((item) => {
                  const active = scheduleType === item;
                  return (
                    <TouchableOpacity
                      key={item}
                      style={[s.segmentBtn, active && s.segmentActive]}
                      onPress={() => setScheduleType(item)}
                    >
                      <Text style={[s.segmentText, active && s.segmentTextActive]}>
                        {item === "daily" ? "Daily" : item === "weekly" ? "Weekly" : "Custom"}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {scheduleType !== "daily" ? (
                <View style={s.dayRow}>
                  {DAYS.map((day) => {
                    const active = days.includes(day.value);
                    return (
                      <TouchableOpacity
                        key={day.value}
                        style={[s.dayChip, active && s.dayChipActive]}
                        onPress={() => toggleDay(day.value)}
                      >
                        <Text style={[s.dayText, active && s.dayTextActive]}>{day.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : null}

              <TouchableOpacity style={s.activeRow} onPress={() => setIsActive((value) => !value)}>
                <View>
                  <Text style={s.activeTitle}>Rule Status</Text>
                  <Text style={s.activeSub}>
                    {isActive ? "Customers will be blocked during this cut-off window." : "Rule is saved but not applied."}
                  </Text>
                </View>
                <View style={[s.switchTrack, isActive && s.switchTrackOn]}>
                  <View style={[s.switchKnob, isActive && s.switchKnobOn]} />
                </View>
              </TouchableOpacity>

              <View style={s.sheetActions}>
                <TouchableOpacity style={s.cancelBtn} onPress={resetForm}>
                  <Text style={s.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.updateBtn, saving && { opacity: 0.6 }]}
                  onPress={saveRule}
                  disabled={saving}
                >
                  {saving ? <ActivityIndicator color="#fff" /> : <Ionicons name="checkmark-circle-outline" size={17} color="#fff" />}
                  <Text style={s.updateText}>Update Rule</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: C.bg,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 21, fontWeight: "900", color: C.text },
  subtitle: { marginTop: 2, fontSize: 12, fontWeight: "600", color: C.muted },
  content: { padding: 18, paddingBottom: 42 },
  loader: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  loaderText: { color: C.muted, fontWeight: "700" },
  infoCard: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "#F0FFF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    marginBottom: 14,
  },
  infoText: { flex: 1, fontSize: 12.5, fontWeight: "700", color: "#166534", lineHeight: 18 },
  formCard: {
    backgroundColor: C.card,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 18,
  },
  formHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { fontSize: 16, fontWeight: "900", color: C.text },
  clearBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: "#FFF3E8" },
  clearText: { fontSize: 12, fontWeight: "800", color: C.dark },
  label: { marginTop: 16, marginBottom: 8, fontSize: 12, fontWeight: "900", color: C.muted },
  segment: { flexDirection: "row", gap: 8 },
  segmentBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: "#FFFDFB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  segmentActive: { backgroundColor: C.primary, borderColor: C.primary },
  segmentText: { fontSize: 13, fontWeight: "900", color: C.dark },
  segmentTextActive: { color: "#fff" },
  productRow: { gap: 8, paddingRight: 18 },
  productChip: {
    maxWidth: 170,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: "#FFFDFB",
    borderWidth: 1,
    borderColor: C.border,
  },
  productChipActive: { backgroundColor: "#FFF3E8", borderColor: C.primary },
  productChipText: { fontSize: 12, fontWeight: "800", color: C.muted },
  productChipTextActive: { color: C.dark },
  timeGrid: { gap: 10 },
  timeBtn: {
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: "#FFFDFB",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 10,
  },
  timeMiniLabel: { fontSize: 10, fontWeight: "900", color: C.muted, textTransform: "uppercase" },
  timeText: { flex: 1, fontSize: 16, fontWeight: "900", color: C.text },
  timeHint: { fontSize: 12, fontWeight: "800", color: C.faint },
  dayRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  dayChip: {
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#FFFDFB",
    borderWidth: 1,
    borderColor: C.border,
  },
  dayChipActive: { backgroundColor: C.dark, borderColor: C.dark },
  dayText: { fontSize: 12, fontWeight: "900", color: C.muted },
  dayTextActive: { color: "#fff" },
  activeRow: {
    marginTop: 16,
    padding: 13,
    borderRadius: 16,
    backgroundColor: "#FFF8F0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  activeTitle: { fontSize: 13, fontWeight: "900", color: C.text },
  activeSub: { marginTop: 2, fontSize: 11.5, fontWeight: "600", color: C.muted, maxWidth: 230 },
  switchTrack: { width: 46, height: 26, borderRadius: 999, backgroundColor: "#E7D3C4", padding: 3 },
  switchTrackOn: { backgroundColor: C.green },
  switchKnob: { width: 20, height: 20, borderRadius: 999, backgroundColor: "#fff" },
  switchKnobOn: { transform: [{ translateX: 20 }] },
  saveBtn: {
    marginTop: 16,
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: C.dark,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  saveText: { fontSize: 14, fontWeight: "900", color: "#fff" },
  listHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  count: { minWidth: 28, textAlign: "center", paddingVertical: 4, borderRadius: 999, backgroundColor: "#FFF3E8", color: C.dark, fontWeight: "900" },
  ruleCard: {
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 12,
  },
  ruleTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  ruleIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#FFF3E8", alignItems: "center", justifyContent: "center" },
  ruleTitle: { fontSize: 15, fontWeight: "900", color: C.text },
  ruleSub: { marginTop: 3, fontSize: 12, fontWeight: "700", color: C.muted },
  statusPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  statusOn: { backgroundColor: "#DCFCE7" },
  statusOff: { backgroundColor: "#F5EDE8" },
  statusText: { fontSize: 11, fontWeight: "900" },
  ruleActions: { flexDirection: "row", gap: 8, marginTop: 14 },
  editBtn: {
    flex: 1,
    minHeight: 38,
    borderRadius: 13,
    backgroundColor: "#FFF3E8",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  editText: { fontSize: 12, fontWeight: "900", color: C.dark },
  deleteBtn: {
    flex: 1,
    minHeight: 38,
    borderRadius: 13,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  deleteText: { fontSize: 12, fontWeight: "900", color: C.red },
  emptyCard: {
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    borderRadius: 20,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
  },
  emptyTitle: { marginTop: 8, fontSize: 15, fontWeight: "900", color: C.text },
  emptySub: { marginTop: 4, textAlign: "center", fontSize: 12, fontWeight: "600", color: C.muted },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "center", padding: 18 },
  timeSheet: { backgroundColor: C.card, borderRadius: 22, padding: 18, maxHeight: "88%" },
  inlineTimePicker: { marginTop: 10, padding: 14, borderRadius: 18, backgroundColor: "#FFF8F0", borderWidth: 1, borderColor: C.border },
  pickerHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 },
  pickerTitle: { fontSize: 16, fontWeight: "900", color: C.text },
  pickerSub: { marginTop: 3, fontSize: 13, fontWeight: "800", color: C.dark },
  pickerSectionLabel: { marginTop: 12, marginBottom: 8, fontSize: 11, fontWeight: "900", color: C.muted, textTransform: "uppercase" },
  pickerGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pickerChip: { width: 48, height: 40, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: "#FFFDFB", alignItems: "center", justifyContent: "center" },
  pickerChipActive: { backgroundColor: C.dark, borderColor: C.dark },
  pickerChipText: { fontSize: 13, fontWeight: "900", color: C.dark },
  pickerChipTextActive: { color: "#fff" },
  periodRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  periodBtn: { flex: 1, minHeight: 42, borderRadius: 13, borderWidth: 1, borderColor: C.border, backgroundColor: "#FFFDFB", alignItems: "center", justifyContent: "center" },
  pickerActions: { flexDirection: "row", gap: 10, marginTop: 16 },
  pickerCancel: { flex: 1, minHeight: 46, borderRadius: 15, backgroundColor: "#FFF3E8", alignItems: "center", justifyContent: "center" },
  pickerConfirm: { flex: 1.35, minHeight: 46, borderRadius: 15, backgroundColor: C.dark, alignItems: "center", justifyContent: "center" },
  pickerCancelText: { fontSize: 14, fontWeight: "900", color: C.dark },
  pickerConfirmText: { fontSize: 14, fontWeight: "900", color: "#fff" },
  sheetOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.35)" },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject },
  editSheet: {
    maxHeight: "86%",
    backgroundColor: C.card,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 18,
    paddingBottom: 18,
    paddingTop: 8,
  },
  drag: {
    alignSelf: "center",
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#E9D8C8",
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingBottom: 6,
  },
  sheetTitle: { fontSize: 18, fontWeight: "900", color: C.text },
  sheetSub: { marginTop: 3, fontSize: 12, fontWeight: "700", color: C.muted },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#FFF3E8",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetActions: { flexDirection: "row", gap: 10, marginTop: 16 },
  cancelBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: "#FFF3E8",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: { fontSize: 14, fontWeight: "900", color: C.dark },
  updateBtn: {
    flex: 1.4,
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: C.dark,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  updateText: { fontSize: 14, fontWeight: "900", color: "#fff" },
});
