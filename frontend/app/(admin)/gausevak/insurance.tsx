import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  Alert,
  ActivityIndicator,
  Switch,
  RefreshControl,
  Animated,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
  Dimensions,
} from "react-native";
import { api } from "../../../src/services/api"; // adjust path

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ─── Types 
interface Cow {
  id: string;
  name: string;
  tag: string;
  breed: string;
  type: string;
  isActive: boolean;
  isSold: boolean;
}

interface Insurance {
  id: string;
  cow_id: string;
  cow_name: string;
  cow_tag: string;
  policy_number: string;
  company: string;
  sum_insured: number;
  annual_premium: number;
  start_date: string;
  expiry_date: string;
  premium_due_date: string;
  notify_before_expiry: boolean;
  notify_before_due: boolean;
  expiry_alert_days: number;
  due_alert_days: number;
  notes?: string;
  claim_filed: boolean;
  claim_date?: string;
  claim_amount?: number;
  claim_status?: string;
  claim_notes?: string;
  status: string;
  days_to_expiry?: number;
  created_at: string;
}

interface InsuranceSummary {
  total_insured: number;
  active: number;
  expiring_soon: number;
  expired: number;
  uninsured: number;
  total_cows: number;
  total_insured_value: number;
  total_annual_premium: number;
}

interface NotifLog {
  id: string;
  cow_name: string;
  cow_tag: string;
  notification_type: string;
  message: string;
  sent_at: string;
  success: boolean;
}

// ─── Constants 
const COLORS = {
  primary: "#2D5016",
  primaryLight: "#3B6D11",
  primaryMid: "#4A7A1F",
  bg: "#F5F7F2",
  white: "#FFFFFF",
  card: "#FFFFFF",
  border: "#E4EAD8",
  borderLight: "#EEF2E6",
  text: "#1A2410",
  textSec: "#5A6B4A",
  textMute: "#8A9A7A",
  activeGreen: "#EAF3DE",
  activeGreenText: "#3B6D11",
  activeGreenBorder: "#C0DD97",
  amberBg: "#FAEEDA",
  amberText: "#854F0B",
  amberBorder: "#FAC775",
  redBg: "#FCEBEB",
  redText: "#A32D2D",
  redBorder: "#F7C1C1",
  grayBg: "#F1EFE8",
  grayText: "#5F5E5A",
  grayBorder: "#D3D1C7",
  infoBg: "#E6F1FB",
  infoText: "#185FA5",
  infoBorder: "#B5D4F4",
};

const COMPANIES = [
  "GIC India",
  "LIC",
  "Oriental Insurance",
  "New India Assurance",
  "United India Insurance",
  "National Insurance",
  "Bajaj Allianz",
  "HDFC ERGO",
  "Other",
];

const TABS = ["Cows", "Alerts", "Settings"] as const;
type Tab = (typeof TABS)[number];

// ─── Helpers 
function daysLeft(dateStr?: string): number | null {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - today.getTime()) / 86400000);
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function statusColor(status: string) {
  switch (status) {
    case "active":
      return {
        bg: COLORS.activeGreen,
        text: COLORS.activeGreenText,
        border: COLORS.activeGreenBorder,
      };
    case "expiring":
      return {
        bg: COLORS.amberBg,
        text: COLORS.amberText,
        border: COLORS.amberBorder,
      };
    case "expired":
      return {
        bg: COLORS.redBg,
        text: COLORS.redText,
        border: COLORS.redBorder,
      };
    default:
      return {
        bg: COLORS.grayBg,
        text: COLORS.grayText,
        border: COLORS.grayBorder,
      };
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "active":
      return "Insured";
    case "expiring":
      return "Expiring";
    case "expired":
      return "Expired";
    default:
      return "No Insurance";
  }
}

function notifIcon(type: string): string {
  switch (type) {
    case "expiry_alert":
      return "";
    case "expired":
      return "";
    case "due_alert":
      return "";
    case "insurance_added":
      return "";
    case "claim_update":
      return "";
    default:
      return "";
  }
}

// ─── Calendar Component 
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface CalendarPickerProps {
  visible: boolean;
  value: string;
  onSelect: (date: string) => void;
  onClose: () => void;
  label?: string;
}

function CalendarPicker({
  visible,
  value,
  onSelect,
  onClose,
  label,
}: CalendarPickerProps) {
  const today = new Date();
  const initDate = value ? new Date(value) : today;
  const [viewYear, setViewYear] = useState(initDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initDate.getMonth());
  const [selected, setSelected] = useState<string>(value || "");
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(60)).current;

  useEffect(() => {
    if (visible) {
      const d = value ? new Date(value) : today;
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
      setSelected(value || "");
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 80,
          friction: 12,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(60);
    }
  }, [visible]);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else setViewMonth((m) => m + 1);
  };

  const handleDay = (day: number) => {
    const mm = String(viewMonth + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    setSelected(`${viewYear}-${mm}-${dd}`);
  };

  const handleConfirm = () => {
    if (selected) onSelect(selected);
    onClose();
  };

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const selParts = selected ? selected.split("-").map(Number) : [];
  const isSelected = (day: number) =>
    selParts.length === 3 &&
    selParts[0] === viewYear &&
    selParts[1] - 1 === viewMonth &&
    selParts[2] === day;
  const isToday = (day: number) =>
    today.getFullYear() === viewYear &&
    today.getMonth() === viewMonth &&
    today.getDate() === day;

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.calOverlay, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={{ flex: 1 }}
          onPress={onClose}
          activeOpacity={1}
        />
        <Animated.View
          style={[styles.calSheet, { transform: [{ translateY: slideAnim }] }]}
        >
          {/* Header */}
          <View style={styles.calHeader}>
            <View style={styles.calHandleWrap}>
              <View style={styles.calHandle} />
            </View>
            {label && <Text style={styles.calLabel}>{label}</Text>}
            <View style={styles.calNav}>
              <TouchableOpacity onPress={prevMonth} style={styles.calNavBtn}>
                <Text style={styles.calNavArrow}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.calMonthYear}>
                {MONTHS[viewMonth]} {viewYear}
              </Text>
              <TouchableOpacity onPress={nextMonth} style={styles.calNavBtn}>
                <Text style={styles.calNavArrow}>›</Text>
              </TouchableOpacity>
            </View>
            {/* Day headers */}
            <View style={styles.calDayHeaders}>
              {DAYS.map((d) => (
                <Text key={d} style={styles.calDayHeader}>
                  {d}
                </Text>
              ))}
            </View>
          </View>

          {/* Grid */}
          <View style={styles.calGrid}>
            {cells.map((day, i) => {
              if (!day) return <View key={`e-${i}`} style={styles.calCell} />;
              const sel = isSelected(day);
              const tod = isToday(day);
              return (
                <TouchableOpacity
                  key={`d-${day}`}
                  style={[
                    styles.calCell,
                    sel && styles.calCellSelected,
                    tod && !sel && styles.calCellToday,
                  ]}
                  onPress={() => handleDay(day)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.calDayNum,
                      sel && styles.calDayNumSelected,
                      tod && !sel && styles.calDayNumToday,
                    ]}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Footer */}
          <View style={styles.calFooter}>
            <TouchableOpacity style={styles.calCancelBtn} onPress={onClose}>
              <Text style={styles.calCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.calConfirmBtn, !selected && { opacity: 0.45 }]}
              onPress={handleConfirm}
              disabled={!selected}
            >
              <Text style={styles.calConfirmText}>
                {selected ? `Select  ${formatDate(selected)}` : "Pick a date"}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ─── DateInputField 
interface DateFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}

function DateField({
  label,
  value,
  onChange,
  placeholder,
  required,
}: DateFieldProps) {
  const [calVisible, setCalVisible] = useState(false);
  return (
    <>
      <Text style={styles.fieldLabel}>
        {label}
        {required && <Text style={{ color: COLORS.redText }}> *</Text>}
      </Text>
      <TouchableOpacity
        style={styles.dateInput}
        onPress={() => setCalVisible(true)}
        activeOpacity={0.75}
      >
        <Text style={styles.dateIcon}></Text>
        <Text style={[styles.dateText, !value && { color: COLORS.textMute }]}>
          {value ? formatDate(value) : placeholder || "Select date"}
        </Text>
        {value && (
          <TouchableOpacity
            onPress={() => onChange("")}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.dateClear}>✕</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
      <CalendarPicker
        visible={calVisible}
        value={value}
        label={label}
        onSelect={onChange}
        onClose={() => setCalVisible(false)}
      />
    </>
  );
}

// ─── Modern Alert 
interface ModernAlertProps {
  visible: boolean;
  type: "success" | "error" | "warning" | "confirm";
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

function ModernAlert({
  visible,
  type,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
}: ModernAlertProps) {
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.85);
    }
  }, [visible]);

  const config = {
    success: {
      icon: "",
      color: COLORS.activeGreenText,
      bg: COLORS.activeGreen,
      border: COLORS.activeGreenBorder,
    },
    error: {
      icon: "",
      color: COLORS.redText,
      bg: COLORS.redBg,
      border: COLORS.redBorder,
    },
    warning: {
      icon: "",
      color: COLORS.amberText,
      bg: COLORS.amberBg,
      border: COLORS.amberBorder,
    },
    confirm: {
      icon: "",
      color: COLORS.redText,
      bg: COLORS.redBg,
      border: COLORS.redBorder,
    },
  }[type];

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onCancel || onConfirm}
    >
      <Animated.View style={[styles.alertOverlay, { opacity: fadeAnim }]}>
        <Animated.View
          style={[styles.alertBox, { transform: [{ scale: scaleAnim }] }]}
        >
          <View
            style={[
              styles.alertIconWrap,
              { backgroundColor: config.bg, borderColor: config.border },
            ]}
          >
            <Text style={styles.alertIcon}>{config.icon}</Text>
          </View>
          <Text style={styles.alertTitle}>{title}</Text>
          <Text style={styles.alertMessage}>{message}</Text>
          <View style={styles.alertBtns}>
            {(onCancel || cancelText) && (
              <TouchableOpacity style={styles.alertCancel} onPress={onCancel}>
                <Text style={styles.alertCancelText}>
                  {cancelText || "Cancel"}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.alertConfirm,
                {
                  backgroundColor:
                    type === "confirm" ? COLORS.redText : COLORS.primary,
                },
              ]}
              onPress={onConfirm}
            >
              <Text style={styles.alertConfirmText}>{confirmText || "OK"}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ─── useModernAlert hook 
function useModernAlert() {
  const [alertState, setAlertState] = useState<{
    visible: boolean;
    type: ModernAlertProps["type"];
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
  }>({ visible: false, type: "success", title: "", message: "" });

  const showAlert = (opts: Omit<typeof alertState, "visible">) => {
    setAlertState({ ...opts, visible: true });
  };

  const hideAlert = () => setAlertState((s) => ({ ...s, visible: false }));

  const alertEl = (
    <ModernAlert
      {...alertState}
      onConfirm={() => {
        alertState.onConfirm?.();
        hideAlert();
      }}
      onCancel={() => {
        alertState.onCancel?.();
        hideAlert();
      }}
    />
  );

  return { showAlert, hideAlert, alertEl };
}

// ─── Main Screen 
export default function InsuranceScreen() {
  const [tab, setTab] = useState<Tab>("Cows");
  const [cows, setCows] = useState<Cow[]>([]);
  const [insurances, setInsurances] = useState<Record<string, Insurance>>({});
  const [summary, setSummary] = useState<InsuranceSummary | null>(null);
  const [notifLogs, setNotifLogs] = useState<NotifLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCow, setSelectedCow] = useState<Cow | null>(null);
  const [selectedIns, setSelectedIns] = useState<Insurance | null>(null);

  const { showAlert, alertEl } = useModernAlert();

  const [notifExpiry, setNotifExpiry] = useState(true);
  const [notifDue, setNotifDue] = useState(true);
  const [notifRenewal, setNotifRenewal] = useState(false);
  const [notifClaim, setNotifClaim] = useState(true);
  const [expiryDays, setExpiryDays] = useState("30");
  const [dueDays, setDueDays] = useState("7");
  const [savingSettings, setSavingSettings] = useState(false);

  const [form, setForm] = useState({
    policy_number: "",
    company: COMPANIES[0],
    sum_insured: "",
    annual_premium: "",
    start_date: "",
    expiry_date: "",
    premium_due_date: "",
    notes: "",
    notify_before_expiry: true,
    notify_before_due: true,
    expiry_alert_days: "30",
    due_alert_days: "7",
    claim_filed: false,
    claim_date: "",
    claim_amount: "",
    claim_status: "",
    claim_notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [showClaim, setShowClaim] = useState(false);
  const [showCompanyPicker, setShowCompanyPicker] = useState(false);

  // ── Load 
  const loadData = useCallback(async () => {
    try {
      const [cowsData, insData, summaryData, logsData] = await Promise.all([
        api.getCows(),
        api.getAllInsurances(),
        api.getInsuranceSummary(),
        api.getInsuranceNotificationLogs(30),
      ]);
      setCows((cowsData as Cow[]).filter((c) => c.isActive && !c.isSold));
      const insMap: Record<string, Insurance> = {};
      (insData as Insurance[]).forEach((i) => {
        insMap[i.cow_id] = i;
      });
      setInsurances(insMap);
      setSummary(summaryData as InsuranceSummary);
      setNotifLogs(logsData as NotifLog[]);
    } catch (e) {
      showAlert({
        type: "error",
        title: "Load Failed",
        message: "Could not load insurance data. Please try again.",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const s = await api.getInsuranceNotificationSettings();
      setNotifExpiry(s.notify_expiry);
      setNotifDue(s.notify_due);
      setNotifRenewal(s.notify_renewal);
      setNotifClaim(s.notify_claim);
      setExpiryDays(String(s.expiry_alert_days));
      setDueDays(String(s.due_alert_days));
    } catch {}
  }, []);

  useEffect(() => {
    loadData();
    loadSettings();
  }, []);

  // ── Open modal 
  const openModal = (cow: Cow) => {
    const ins = insurances[cow.id] || null;
    setSelectedCow(cow);
    setSelectedIns(ins);
    setShowClaim(false);
    setForm({
      policy_number: ins?.policy_number || "",
      company: ins?.company || COMPANIES[0],
      sum_insured: ins ? String(ins.sum_insured) : "",
      annual_premium: ins ? String(ins.annual_premium) : "",
      start_date: ins?.start_date || "",
      expiry_date: ins?.expiry_date || "",
      premium_due_date: ins?.premium_due_date || "",
      notes: ins?.notes || "",
      notify_before_expiry: ins?.notify_before_expiry ?? true,
      notify_before_due: ins?.notify_before_due ?? true,
      expiry_alert_days: ins ? String(ins.expiry_alert_days) : "30",
      due_alert_days: ins ? String(ins.due_alert_days) : "7",
      claim_filed: ins?.claim_filed || false,
      claim_date: ins?.claim_date || "",
      claim_amount: ins?.claim_amount ? String(ins.claim_amount) : "",
      claim_status: ins?.claim_status || "",
      claim_notes: ins?.claim_notes || "",
    });
    setModalVisible(true);
  };

  const closeModal = () => setModalVisible(false);

  // ── Save 
  const handleSave = async () => {
    if (!selectedCow) return;
    if (
      !form.policy_number ||
      !form.company ||
      !form.sum_insured ||
      !form.annual_premium ||
      !form.start_date ||
      !form.expiry_date ||
      !form.premium_due_date
    ) {
      showAlert({
        type: "warning",
        title: "Incomplete Form",
        message: "Please fill all required fields before saving.",
      });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        cow_id: selectedCow.id,
        cow_name: selectedCow.name,
        cow_tag: selectedCow.tag,
        policy_number: form.policy_number.trim(),
        company: form.company,
        sum_insured: parseFloat(form.sum_insured),
        annual_premium: parseFloat(form.annual_premium),
        start_date: form.start_date,
        expiry_date: form.expiry_date,
        premium_due_date: form.premium_due_date,
        notify_before_expiry: form.notify_before_expiry,
        notify_before_due: form.notify_before_due,
        expiry_alert_days: parseInt(form.expiry_alert_days) || 30,
        due_alert_days: parseInt(form.due_alert_days) || 7,
        notes: form.notes || undefined,
        claim_filed: form.claim_filed,
        claim_date: form.claim_date || undefined,
        claim_amount: form.claim_amount
          ? parseFloat(form.claim_amount)
          : undefined,
        claim_status: form.claim_status || undefined,
        claim_notes: form.claim_notes || undefined,
      };

      let updated: Insurance;
      if (selectedIns) {
        updated = await api.updateInsurance(selectedIns.id, payload);
      } else {
        updated = await api.createInsurance(payload);
      }

      setInsurances((prev) => ({ ...prev, [selectedCow.id]: updated }));
      await loadData();
      closeModal();
      showAlert({
        type: "success",
        title: selectedIns ? "Policy Updated" : "Policy Added",
        message: `Insurance ${selectedIns ? "updated" : "added"} successfully for ${selectedCow.name}.`,
      });
    } catch (e: any) {
      showAlert({
        type: "error",
        title: "Save Failed",
        message: e.message || "Could not save insurance record.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!selectedIns) return;
    showAlert({
      type: "confirm",
      title: "Remove Policy",
      message: `Are you sure you want to delete the insurance record for ${selectedCow?.name}? This cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Keep",
      onConfirm: async () => {
        try {
          await api.deleteInsurance(selectedIns.id);
          const updated = { ...insurances };
          delete updated[selectedCow!.id];
          setInsurances(updated);
          await loadData();
          closeModal();
        } catch (e: any) {
          showAlert({
            type: "error",
            title: "Delete Failed",
            message: e.message,
          });
        }
      },
    });
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await api.updateInsuranceNotificationSettings({
        notify_expiry: notifExpiry,
        notify_due: notifDue,
        notify_renewal: notifRenewal,
        notify_claim: notifClaim,
        expiry_alert_days: parseInt(expiryDays) || 30,
        due_alert_days: parseInt(dueDays) || 7,
      });
      showAlert({
        type: "success",
        title: "Settings Saved",
        message: "Notification preferences updated successfully.",
      });
    } catch {
      showAlert({
        type: "error",
        title: "Save Failed",
        message: "Could not save notification settings.",
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleTestNotif = async () => {
    try {
      const res = await api.sendTestInsuranceNotification();
      showAlert({
        type: "success",
        title: "Test Sent",
        message: `Notification sent to ${res.tokens_count} device(s).`,
      });
    } catch {
      showAlert({
        type: "error",
        title: "Send Failed",
        message: "Could not send test notification.",
      });
    }
  };

  const filteredCows = cows.filter(
    (c) =>
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.tag.toLowerCase().includes(search.toLowerCase()) ||
      c.breed.toLowerCase().includes(search.toLowerCase()),
  );

  // ── Render helpers 
  const renderSummaryCards = () => {
    if (!summary) return null;
    const cards = [
      {
        label: "Insured",
        value: summary.total_insured,
        color: COLORS.activeGreenText,
        bg: COLORS.activeGreen,
        border: COLORS.activeGreenBorder,
        icon: "",
      },
      {
        label: "Expiring",
        value: summary.expiring_soon,
        color: COLORS.amberText,
        bg: COLORS.amberBg,
        border: COLORS.amberBorder,
        icon: "",
      },
      {
        label: "Expired",
        value: summary.expired,
        color: COLORS.redText,
        bg: COLORS.redBg,
        border: COLORS.redBorder,
        icon: "",
      },
      {
        label: "Uninsured",
        value: summary.uninsured,
        color: COLORS.grayText,
        bg: COLORS.grayBg,
        border: COLORS.grayBorder,
        icon: "",
      },
    ];
    return (
      <View style={styles.summaryRow}>
        {cards.map((c) => (
          <View
            key={c.label}
            style={[
              styles.summaryCard,
              { backgroundColor: c.bg, borderColor: c.border },
            ]}
          >
            <Text style={styles.summaryCardIcon}>{c.icon}</Text>
            <Text style={[styles.summaryVal, { color: c.color }]}>
              {c.value}
            </Text>
            <Text style={[styles.summaryLabel, { color: c.color }]}>
              {c.label}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const renderCowItem = ({ item: cow }: { item: Cow }) => {
    const ins = insurances[cow.id];
    const st = ins ? ins.status : "none";
    const sc = statusColor(st);
    const dl = ins ? daysLeft(ins.expiry_date) : null;
    const initials = cow.name
      .split(" ")
      .map((w: string) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    return (
      <TouchableOpacity
        style={styles.cowCard}
        onPress={() => openModal(cow)}
        activeOpacity={0.72}
      >
        {/* Left accent bar */}
        <View style={[styles.cowAccentBar, { backgroundColor: sc.text }]} />

        <View
          style={[
            styles.cowAvatarModern,
            { backgroundColor: sc.bg, borderColor: sc.border },
          ]}
        >
          <Text style={styles.cowEmoji}></Text>
        </View>

        <View style={styles.cowInfo}>
          <View style={styles.cowNameRow}>
            <Text style={styles.cowName}>{cow.name}</Text>
            <View
              style={[
                styles.badgeModern,
                { backgroundColor: sc.bg, borderColor: sc.border },
              ]}
            >
              <Text style={[styles.badgeModernText, { color: sc.text }]}>
                {statusLabel(st)}
              </Text>
            </View>
          </View>
          <Text style={styles.cowMeta}>
            {cow.tag} · {cow.breed}
          </Text>
          {ins && (
            <Text style={styles.cowPolicy} numberOfLines={1}>
              {ins.policy_number} · {ins.company}
            </Text>
          )}
          {dl !== null && dl <= 30 && dl >= 0 && (
            <View
              style={[
                styles.cowDaysPill,
                { backgroundColor: dl <= 7 ? COLORS.redBg : COLORS.amberBg },
              ]}
            >
              <Text
                style={[
                  styles.cowDaysText,
                  { color: dl <= 7 ? COLORS.redText : COLORS.amberText },
                ]}
              >
                 Expires in {dl} day{dl !== 1 ? "s" : ""}
              </Text>
            </View>
          )}
          {dl !== null && dl < 0 && (
            <View
              style={[styles.cowDaysPill, { backgroundColor: COLORS.redBg }]}
            >
              <Text style={[styles.cowDaysText, { color: COLORS.redText }]}>
                 Expired {Math.abs(dl)} day{Math.abs(dl) !== 1 ? "s" : ""} ago
              </Text>
            </View>
          )}
          {!ins && (
            <View
              style={[styles.cowDaysPill, { backgroundColor: COLORS.grayBg }]}
            >
              <Text style={[styles.cowDaysText, { color: COLORS.grayText }]}>
                Tap to add insurance
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
    );
  };

  const renderNotifItem = ({ item }: { item: NotifLog }) => {
    const isWarn =
      item.notification_type === "expiry_alert" ||
      item.notification_type === "due_alert";
    const isErr = item.notification_type === "expired";
    const bg = isErr
      ? COLORS.redBg
      : isWarn
        ? COLORS.amberBg
        : COLORS.activeGreen;
    const border = isErr
      ? COLORS.redBorder
      : isWarn
        ? COLORS.amberBorder
        : COLORS.activeGreenBorder;
    const iconColor = isErr
      ? COLORS.redText
      : isWarn
        ? COLORS.amberText
        : COLORS.activeGreenText;
    return (
      <View
        style={[styles.notifCard, { backgroundColor: bg, borderColor: border }]}
      >
        <View
          style={[
            styles.notifIconWrap,
            { backgroundColor: "rgba(255,255,255,0.6)", borderColor: border },
          ]}
        >
          <Text style={styles.notifIcon}>
            {notifIcon(item.notification_type)}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.notifMsg}>{item.message}</Text>
          <View style={styles.notifMeta}>
            <Text style={[styles.notifCow, { color: iconColor }]}>
              {item.cow_name}
            </Text>
            <Text style={styles.notifDot}>·</Text>
            <Text style={styles.notifTime}>
              {new Date(item.sent_at).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
              })}
            </Text>
            {!item.success && (
              <View style={styles.failedPill}>
                <Text style={styles.failedPillText}>Failed</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  // ─── Render 
  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading insurance data...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      {alertEl}

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIconWrap}>
          <Text style={{ fontSize: 20 }}></Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Cow Insurance</Text>
          <Text style={styles.headerSub}>
            {summary
              ? `${summary.total_insured} insured · ${summary.expiring_soon} expiring soon`
              : "Manage livestock policies"}
          </Text>
        </View>
        {summary && (
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>{summary.total_cows}</Text>
            <Text style={styles.headerBadgeSub}>Total</Text>
          </View>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t}
            </Text>
            {tab === t && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Tab: Cows ── */}
      {tab === "Cows" && (
        <View style={{ flex: 1 }}>
          {renderSummaryCards()}
          {/* Total value chip */}
          {summary && (
            <View style={styles.totalValueRow}>
              <Text style={styles.totalValueLabel}>Total Insured Value</Text>
              <Text style={styles.totalValueAmount}>
                ₹{summary.total_insured_value?.toLocaleString("en-IN") || "—"}
              </Text>
              <View style={styles.totalValueDivider} />
              <Text style={styles.totalValueLabel}>Annual Premium</Text>
              <Text style={styles.totalValueAmount}>
                ₹{summary.total_annual_premium?.toLocaleString("en-IN") || "—"}
              </Text>
            </View>
          )}
          <View style={styles.searchWrap}>
            <Text style={styles.searchIcon}></Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, tag or breed..."
              placeholderTextColor={COLORS.textMute}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearch("")}
                style={styles.clearBtn}
              >
                <Text style={styles.clearSearch}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
          <FlatList
            data={filteredCows}
            keyExtractor={(c) => c.id}
            renderItem={renderCowItem}
            contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 30 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  loadData();
                }}
                colors={[COLORS.primary]}
                tintColor={COLORS.primary}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <View style={styles.emptyIconWrap}>
                  <Text style={styles.emptyIcon}></Text>
                </View>
                <Text style={styles.emptyTitle}>No cows found</Text>
                <Text style={styles.emptyText}>
                  Try adjusting your search filters
                </Text>
              </View>
            }
          />
        </View>
      )}

      {/* ── Tab: Alerts ── */}
      {tab === "Alerts" && (
        <FlatList
          data={notifLogs}
          keyExtractor={(n) => n.id}
          renderItem={renderNotifItem}
          contentContainerStyle={{ padding: 14, paddingBottom: 30 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadData();
              }}
              colors={[COLORS.primary]}
            />
          }
          ListHeaderComponent={
            <View style={styles.alertsHeader}>
              <Text style={styles.sectionLabel}>Recent notifications</Text>
              <Text style={styles.alertsCount}>
                {notifLogs.length} log{notifLogs.length !== 1 ? "s" : ""}
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIconWrap}>
                <Text style={styles.emptyIcon}></Text>
              </View>
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptyText}>
                Alerts will appear here once generated
              </Text>
            </View>
          }
        />
      )}

      {/* ── Tab: Settings ── */}
      {tab === "Settings" && (
        <ScrollView
          contentContainerStyle={{ padding: 14, paddingBottom: 50 }}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionLabel}>Notification toggles</Text>
          <View style={styles.settingsCard}>
            {[
              {
                label: "Expiry reminders",
                sub: "Alert before policy expires",
                val: notifExpiry,
                set: setNotifExpiry,
              },
              {
                label: "Premium due reminders",
                sub: "Alert before premium is due",
                val: notifDue,
                set: setNotifDue,
              },
              {
                label: "Renewal reminders",
                sub: "Alert when renewal window opens",
                val: notifRenewal,
                set: setNotifRenewal,
              },
              {
                label: "Claim updates",
                sub: "Notify on claim status changes",
                val: notifClaim,
                set: setNotifClaim,
              },
            ].map((row, idx, arr) => (
              <View
                key={row.label}
                style={[
                  styles.settingRow,
                  idx === arr.length - 1 && { borderBottomWidth: 0 },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingLabel}>{row.label}</Text>
                  <Text style={styles.settingSub}>{row.sub}</Text>
                </View>
                <Switch
                  value={row.val}
                  onValueChange={row.set}
                  trackColor={{
                    false: COLORS.grayBorder,
                    true: COLORS.primaryMid,
                  }}
                  thumbColor={COLORS.white}
                  ios_backgroundColor={COLORS.grayBorder}
                />
              </View>
            ))}
          </View>

          <Text style={[styles.sectionLabel, { marginTop: 20 }]}>
            Alert timing
          </Text>
          <View style={styles.settingsCard}>
            <View style={styles.inputRowSettings}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Days before expiry</Text>
                <TextInput
                  style={styles.settingInput}
                  value={expiryDays}
                  onChangeText={setExpiryDays}
                  keyboardType="number-pad"
                  placeholderTextColor={COLORS.textMute}
                />
              </View>
              <View style={{ width: 14 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Days before due date</Text>
                <TextInput
                  style={styles.settingInput}
                  value={dueDays}
                  onChangeText={setDueDays}
                  keyboardType="number-pad"
                  placeholderTextColor={COLORS.textMute}
                />
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, { marginTop: 20 }]}
            onPress={handleSaveSettings}
            disabled={savingSettings}
          >
            {savingSettings ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.primaryBtnText}> Save Settings</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.outlineBtn, { marginTop: 12 }]}
            onPress={handleTestNotif}
          >
            <Text style={styles.outlineBtnText}> Send Test Notification</Text>
          </TouchableOpacity>

          <View style={styles.infoCard}>
            <View style={styles.infoTitleRow}>
              <Text style={styles.infoIcon}>ℹ</Text>
              <Text style={styles.infoTitle}>How notifications work</Text>
            </View>
            <View style={styles.infoDivider} />
            {[
              "A daily job runs at 8:00 AM to check all insurances.",
              "Expiry alerts: 30 days, 7 days, and 1 day before.",
              "Premium due alerts: 7 days, 3 days, 1 day before.",
              "Claim status changes trigger immediate notifications.",
              "Ensure notifications are enabled in device settings.",
            ].map((line, i) => (
              <View key={i} style={styles.infoLine}>
                <View style={styles.infoDot} />
                <Text style={styles.infoText}>{line}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* ── Insurance Detail Modal ── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalDismiss} onPress={closeModal} />
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalSheet}
          >
            <View style={styles.modalHandle} />

            {/* Cow header */}
            <View style={styles.modalCowHeader}>
              <View
                style={[
                  styles.cowAvatarModern,
                  {
                    backgroundColor: selectedIns
                      ? statusColor(selectedIns.status).bg
                      : COLORS.grayBg,
                    borderColor: selectedIns
                      ? statusColor(selectedIns.status).border
                      : COLORS.grayBorder,
                  },
                ]}
              >
                <Text style={styles.cowEmoji}></Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalCowName}>{selectedCow?.name}</Text>
                <Text style={styles.modalCowMeta}>
                  {selectedCow?.tag} · {selectedCow?.breed}
                </Text>
              </View>
              {selectedIns && (
                <View
                  style={[
                    styles.badgeModern,
                    {
                      backgroundColor: statusColor(selectedIns.status).bg,
                      borderColor: statusColor(selectedIns.status).border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeModernText,
                      { color: statusColor(selectedIns.status).text },
                    ]}
                  >
                    {statusLabel(selectedIns.status)}
                  </Text>
                </View>
              )}
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 48 }}
            >
              {/* Existing insurance summary */}
              {selectedIns && (
                <View style={styles.insSummary}>
                  <View style={styles.insSumTitleRow}>
                    <Text style={styles.insSumTitle}>Current Policy</Text>
                    <Text style={styles.insSumSince}>
                      Since {formatDate(selectedIns.start_date)}
                    </Text>
                  </View>
                  <View style={styles.insSumGrid}>
                    {[
                      ["Policy No.", selectedIns.policy_number],
                      ["Company", selectedIns.company],
                      [
                        "Sum Insured",
                        `₹${selectedIns.sum_insured.toLocaleString("en-IN")}`,
                      ],
                      [
                        "Annual Premium",
                        `₹${selectedIns.annual_premium.toLocaleString("en-IN")}`,
                      ],
                      ["Valid Till", formatDate(selectedIns.expiry_date)],
                      ["Premium Due", formatDate(selectedIns.premium_due_date)],
                    ].map(([k, v]) => (
                      <View key={k} style={styles.insSumItem}>
                        <Text style={styles.insSumKey}>{k}</Text>
                        <Text style={styles.insSumVal}>{v}</Text>
                      </View>
                    ))}
                  </View>
                  {(selectedIns.days_to_expiry ?? 0) < 0 ? (
                    <View
                      style={[
                        styles.expiryBanner,
                        {
                          backgroundColor: COLORS.redBg,
                          borderColor: COLORS.redBorder,
                        },
                      ]}
                    >
                      <Text style={{ fontSize: 14 }}></Text>
                      <Text
                        style={[
                          styles.expiryBannerText,
                          { color: COLORS.redText },
                        ]}
                      >
                        Expired {Math.abs(selectedIns.days_to_expiry ?? 0)} days
                        ago
                      </Text>
                    </View>
                  ) : (selectedIns.days_to_expiry ?? 9999) <= 30 ? (
                    <View
                      style={[
                        styles.expiryBanner,
                        {
                          backgroundColor: COLORS.amberBg,
                          borderColor: COLORS.amberBorder,
                        },
                      ]}
                    >
                      <Text style={{ fontSize: 14 }}></Text>
                      <Text
                        style={[
                          styles.expiryBannerText,
                          { color: COLORS.amberText },
                        ]}
                      >
                        Expires in {selectedIns.days_to_expiry} day(s) — Renew
                        soon
                      </Text>
                    </View>
                  ) : null}
                </View>
              )}

              {/* Divider */}
              <View style={styles.sectionDivider}>
                <View style={styles.sectionDividerLine} />
                <Text style={styles.sectionDividerLabel}>
                  {selectedIns ? "Update Policy" : "Add Policy"}
                </Text>
                <View style={styles.sectionDividerLine} />
              </View>

              {/* Form */}
              <Text style={styles.fieldLabel}>
                Policy Number <Text style={{ color: COLORS.redText }}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={form.policy_number}
                onChangeText={(v) =>
                  setForm((f) => ({ ...f, policy_number: v }))
                }
                placeholder="e.g. GIC-2024-0023"
                placeholderTextColor={COLORS.textMute}
              />

              <Text style={styles.fieldLabel}>
                Insurance Company{" "}
                <Text style={{ color: COLORS.redText }}>*</Text>
              </Text>
              <TouchableOpacity
                style={styles.picker}
                onPress={() => setShowCompanyPicker(true)}
              >
                <Text style={styles.pickerText}>{form.company}</Text>
                <Text style={styles.pickerArrow}>▾</Text>
              </TouchableOpacity>

              <View style={styles.row2}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>
                    Sum Insured (₹){" "}
                    <Text style={{ color: COLORS.redText }}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={form.sum_insured}
                    onChangeText={(v) =>
                      setForm((f) => ({ ...f, sum_insured: v }))
                    }
                    keyboardType="numeric"
                    placeholder="25000"
                    placeholderTextColor={COLORS.textMute}
                  />
                </View>
                <View style={{ width: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>
                    Annual Premium (₹){" "}
                    <Text style={{ color: COLORS.redText }}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={form.annual_premium}
                    onChangeText={(v) =>
                      setForm((f) => ({ ...f, annual_premium: v }))
                    }
                    keyboardType="numeric"
                    placeholder="1200"
                    placeholderTextColor={COLORS.textMute}
                  />
                </View>
              </View>

              {/* Date fields with calendar */}
              <View style={styles.row2}>
                <View style={{ flex: 1 }}>
                  <DateField
                    label="Start Date"
                    value={form.start_date}
                    onChange={(v) => setForm((f) => ({ ...f, start_date: v }))}
                    required
                  />
                </View>
                <View style={{ width: 10 }} />
                <View style={{ flex: 1 }}>
                  <DateField
                    label="Expiry Date"
                    value={form.expiry_date}
                    onChange={(v) => setForm((f) => ({ ...f, expiry_date: v }))}
                    required
                  />
                </View>
              </View>

              <DateField
                label="Premium Due Date"
                value={form.premium_due_date}
                onChange={(v) =>
                  setForm((f) => ({ ...f, premium_due_date: v }))
                }
                required
              />

              <Text style={styles.fieldLabel}>Notes</Text>
              <TextInput
                style={[
                  styles.input,
                  { minHeight: 72, textAlignVertical: "top", paddingTop: 10 },
                ]}
                value={form.notes}
                onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))}
                multiline
                placeholder="Additional details..."
                placeholderTextColor={COLORS.textMute}
              />

              {/* Notification toggles */}
              <View style={styles.sectionDivider}>
                <View style={styles.sectionDividerLine} />
                <Text style={styles.sectionDividerLabel}>Notifications</Text>
                <View style={styles.sectionDividerLine} />
              </View>

              <View style={styles.settingsCard}>
                {[
                  {
                    label: "Alert before expiry",
                    sub: `${form.expiry_alert_days} days before expiry`,
                    val: form.notify_before_expiry,
                    key: "notify_before_expiry" as const,
                  },
                  {
                    label: "Alert before premium due",
                    sub: `${form.due_alert_days} days before due date`,
                    val: form.notify_before_due,
                    key: "notify_before_due" as const,
                  },
                ].map((row, idx) => (
                  <View
                    key={row.key}
                    style={[
                      styles.settingRow,
                      idx === 1 && { borderBottomWidth: 0 },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.settingLabel}>{row.label}</Text>
                      <Text style={styles.settingSub}>{row.sub}</Text>
                    </View>
                    <Switch
                      value={row.val}
                      onValueChange={(v) =>
                        setForm((f) => ({ ...f, [row.key]: v }))
                      }
                      trackColor={{
                        false: COLORS.grayBorder,
                        true: COLORS.primaryMid,
                      }}
                      thumbColor={COLORS.white}
                      ios_backgroundColor={COLORS.grayBorder}
                    />
                  </View>
                ))}
              </View>

              {/* Claim section */}
              <TouchableOpacity
                style={styles.claimToggle}
                onPress={() => setShowClaim((s) => !s)}
              >
                <View style={styles.claimToggleLeft}>
                  <Text style={styles.claimToggleIcon}></Text>
                  <View>
                    <Text style={styles.claimToggleText}>Claim Details</Text>
                    {form.claim_filed && (
                      <Text style={styles.claimToggleSub}>Claim filed</Text>
                    )}
                  </View>
                </View>
                <Text style={styles.claimToggleArrow}>
                  {showClaim ? "▴" : "▾"}
                </Text>
              </TouchableOpacity>

              {showClaim && (
                <View style={styles.claimSection}>
                  <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
                    <Text style={styles.settingLabel}>Claim Filed?</Text>
                    <Switch
                      value={form.claim_filed}
                      onValueChange={(v) =>
                        setForm((f) => ({ ...f, claim_filed: v }))
                      }
                      trackColor={{
                        false: COLORS.grayBorder,
                        true: COLORS.primaryMid,
                      }}
                      thumbColor={COLORS.white}
                    />
                  </View>
                  {form.claim_filed && (
                    <>
                      <View style={styles.row2}>
                        <View style={{ flex: 1 }}>
                          <DateField
                            label="Claim Date"
                            value={form.claim_date}
                            onChange={(v) =>
                              setForm((f) => ({ ...f, claim_date: v }))
                            }
                          />
                        </View>
                        <View style={{ width: 10 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.fieldLabel}>
                            Claim Amount (₹)
                          </Text>
                          <TextInput
                            style={styles.input}
                            value={form.claim_amount}
                            onChangeText={(v) =>
                              setForm((f) => ({ ...f, claim_amount: v }))
                            }
                            keyboardType="numeric"
                            placeholder="20000"
                            placeholderTextColor={COLORS.textMute}
                          />
                        </View>
                      </View>
                      <Text style={styles.fieldLabel}>Claim Status</Text>
                      <View style={styles.claimStatusRow}>
                        {(["pending", "approved", "rejected"] as const).map(
                          (s) => (
                            <TouchableOpacity
                              key={s}
                              style={[
                                styles.claimStatusBtn,
                                form.claim_status === s &&
                                  styles.claimStatusActive,
                              ]}
                              onPress={() =>
                                setForm((f) => ({ ...f, claim_status: s }))
                              }
                            >
                              <Text
                                style={[
                                  styles.claimStatusText,
                                  form.claim_status === s && {
                                    color: COLORS.white,
                                  },
                                ]}
                              >
                                {s === "pending"
                                  ? ""
                                  : s === "approved"
                                    ? ""
                                    : ""}{" "}
                                {s.charAt(0).toUpperCase() + s.slice(1)}
                              </Text>
                            </TouchableOpacity>
                          ),
                        )}
                      </View>
                      <Text style={styles.fieldLabel}>Claim Notes</Text>
                      <TextInput
                        style={[
                          styles.input,
                          {
                            minHeight: 60,
                            textAlignVertical: "top",
                            paddingTop: 10,
                          },
                        ]}
                        value={form.claim_notes}
                        onChangeText={(v) =>
                          setForm((f) => ({ ...f, claim_notes: v }))
                        }
                        multiline
                        placeholder="Details about the claim..."
                        placeholderTextColor={COLORS.textMute}
                      />
                    </>
                  )}
                </View>
              )}

              {/* Buttons */}
              <TouchableOpacity
                style={[styles.primaryBtn, { marginTop: 24 }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.primaryBtnText}>
                    {selectedIns
                      ? "💾  Update Insurance"
                      : "✅  Save Insurance"}
                  </Text>
                )}
              </TouchableOpacity>

              {selectedIns && (
                <TouchableOpacity
                  style={[styles.deleteBtn, { marginTop: 10 }]}
                  onPress={handleDelete}
                >
                  <Text style={styles.deleteBtnText}>
                     Remove Insurance Record
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Company picker modal */}
      <Modal
        visible={showCompanyPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCompanyPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalDismiss}
            onPress={() => setShowCompanyPicker(false)}
          />
          <View style={[styles.modalSheet, { maxHeight: "58%" }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.companyPickerTitle}>Select Insurer</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {COMPANIES.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.companyOption,
                    form.company === c && styles.companyOptionActive,
                  ]}
                  onPress={() => {
                    setForm((f) => ({ ...f, company: c }));
                    setShowCompanyPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.companyOptionText,
                      form.company === c && {
                        color: COLORS.primaryLight,
                        fontWeight: "600",
                      },
                    ]}
                  >
                    {c}
                  </Text>
                  {form.company === c && (
                    <View style={styles.companyCheckWrap}>
                      <Text
                        style={{ color: COLORS.primary, fontWeight: "700" }}
                      >
                        ✓
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.bg,
  },
  loadingCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  loadingText: { color: COLORS.textSec, fontSize: 15, fontWeight: "500" },

  // Header
  header: {
    backgroundColor: COLORS.primary,
    paddingTop:
      Platform.OS === "ios" ? 54 : (StatusBar.currentHeight ?? 0) + 14,
    paddingBottom: 18,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 19,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  headerSub: { color: "rgba(255,255,255,0.72)", fontSize: 12.5, marginTop: 2 },
  headerBadge: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  headerBadgeText: { color: "#fff", fontSize: 18, fontWeight: "700" },
  headerBadgeSub: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 10,
    marginTop: 1,
  },

  // Tabs
  tabs: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  tab: {
    flex: 1,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  tabActive: {},
  tabText: { fontSize: 13.5, color: COLORS.textMute, fontWeight: "500" },
  tabTextActive: { color: COLORS.primary, fontWeight: "700" },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    left: "20%",
    right: "20%",
    height: 2.5,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
  },

  // Summary
  summaryRow: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 4,
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  summaryCardIcon: { fontSize: 16, marginBottom: 4 },
  summaryVal: { fontSize: 21, fontWeight: "800", letterSpacing: -0.5 },
  summaryLabel: { fontSize: 10.5, marginTop: 2, fontWeight: "600" },

  // Total value row
  totalValueRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 14,
    marginVertical: 8,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  totalValueLabel: {
    fontSize: 10.5,
    color: COLORS.textMute,
    fontWeight: "500",
  },
  totalValueAmount: { fontSize: 13, color: COLORS.primary, fontWeight: "700" },
  totalValueDivider: {
    width: 1,
    height: 20,
    backgroundColor: COLORS.border,
    marginHorizontal: 4,
  },

  // Search
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 14,
    marginBottom: 10,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 13,
    height: 44,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  searchIcon: { fontSize: 14, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text },
  clearBtn: { padding: 4 },
  clearSearch: { fontSize: 12, color: COLORS.textMute },

  // Cow card
  cowCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 13,
    marginBottom: 10,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cowAccentBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3.5,
    borderRadius: 2,
  },
  cowAvatarModern: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
    borderWidth: 1,
  },
  cowEmoji: { fontSize: 24 },
  cowInfo: { flex: 1, marginLeft: 12 },
  cowNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  cowName: {
    fontSize: 15.5,
    fontWeight: "700",
    color: COLORS.text,
    flex: 1,
    marginRight: 8,
  },
  cowMeta: { fontSize: 12, color: COLORS.textSec, marginBottom: 2 },
  cowPolicy: { fontSize: 11, color: COLORS.textMute, marginBottom: 4 },
  cowDaysPill: {
    alignSelf: "flex-start",
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 3,
    marginTop: 2,
  },
  cowDaysText: { fontSize: 11, fontWeight: "600" },
  chevron: { fontSize: 22, color: COLORS.textMute, marginLeft: 4 },

  // Badge
  badgeModern: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeModernText: { fontSize: 10.5, fontWeight: "700", letterSpacing: 0.2 },

  // Section label
  sectionLabel: {
    fontSize: 10.5,
    fontWeight: "800",
    color: COLORS.textMute,
    textTransform: "uppercase",
    letterSpacing: 1.1,
    marginBottom: 10,
    marginTop: 2,
  },

  // Section divider
  sectionDivider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 18,
    gap: 10,
  },
  sectionDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.borderLight,
  },
  sectionDividerLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textSec,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  // Alerts
  alertsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  alertsCount: { fontSize: 12, color: COLORS.textMute, fontWeight: "500" },

  // Notification card
  notifCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 13,
    marginBottom: 9,
  },
  notifIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    flexShrink: 0,
  },
  notifIcon: { fontSize: 17 },
  notifMsg: {
    fontSize: 13.5,
    color: COLORS.text,
    lineHeight: 19,
    fontWeight: "500",
  },
  notifMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 5,
  },
  notifCow: { fontSize: 11.5, fontWeight: "600" },
  notifDot: { color: COLORS.textMute, fontSize: 12 },
  notifTime: { fontSize: 11.5, color: COLORS.textSec },
  failedPill: {
    backgroundColor: COLORS.redBg,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 0.5,
    borderColor: COLORS.redBorder,
  },
  failedPillText: { fontSize: 10, color: COLORS.redText, fontWeight: "600" },

  // Settings card
  settingsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  settingLabel: { fontSize: 14, color: COLORS.text, fontWeight: "500" },
  settingSub: { fontSize: 11.5, color: COLORS.textSec, marginTop: 1 },
  settingInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 11,
    fontSize: 15,
    color: COLORS.text,
    backgroundColor: COLORS.white,
    fontWeight: "600",
    textAlign: "center",
  },
  inputRowSettings: { flexDirection: "row", paddingVertical: 14 },
  inputLabel: {
    fontSize: 12,
    color: COLORS.textSec,
    marginBottom: 6,
    fontWeight: "500",
  },

  // Info card
  infoCard: {
    marginTop: 20,
    backgroundColor: COLORS.infoBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.infoBorder,
    padding: 16,
  },
  infoTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 10,
  },
  infoIcon: { fontSize: 16 },
  infoTitle: { fontSize: 13.5, fontWeight: "700", color: COLORS.infoText },
  infoDivider: {
    height: 1,
    backgroundColor: COLORS.infoBorder,
    marginBottom: 10,
  },
  infoLine: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 6,
  },
  infoDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.infoText,
    marginTop: 6,
    flexShrink: 0,
  },
  infoText: { fontSize: 12.5, color: COLORS.infoText, lineHeight: 19, flex: 1 },

  // Buttons
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    padding: 15,
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: {
    color: COLORS.white,
    fontSize: 15.5,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  outlineBtn: {
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
  },
  outlineBtnText: { color: COLORS.primary, fontSize: 14.5, fontWeight: "600" },
  deleteBtn: {
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: COLORS.redBorder,
    backgroundColor: COLORS.redBg,
  },
  deleteBtnText: { color: COLORS.redText, fontSize: 14.5, fontWeight: "600" },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  modalDismiss: { flex: 1 },
  modalSheet: {
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 12,
    maxHeight: "93%",
  },
  modalHandle: {
    width: 40,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: COLORS.border,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalCowHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 4,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  modalCowName: { fontSize: 18, fontWeight: "800", color: COLORS.text },
  modalCowMeta: { fontSize: 12.5, color: COLORS.textSec, marginTop: 2 },

  // Insurance summary box
  insSummary: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.activeGreenBorder,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primaryLight,
    padding: 14,
    marginTop: 10,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  insSumTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  insSumTitle: {
    fontSize: 12.5,
    fontWeight: "800",
    color: COLORS.primaryLight,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  insSumSince: { fontSize: 11, color: COLORS.textMute, fontWeight: "500" },
  insSumGrid: { flexDirection: "row", flexWrap: "wrap", gap: 0 },
  insSumItem: {
    width: "50%",
    paddingVertical: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.borderLight,
  },
  insSumKey: {
    fontSize: 10.5,
    color: COLORS.textMute,
    fontWeight: "500",
    marginBottom: 2,
  },
  insSumVal: { fontSize: 13, color: COLORS.text, fontWeight: "600" },
  expiryBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
  },
  expiryBannerText: { fontSize: 13, fontWeight: "600" },

  // Form fields
  fieldLabel: {
    fontSize: 12.5,
    color: COLORS.textSec,
    marginBottom: 5,
    marginTop: 12,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 11,
    padding: 11,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: COLORS.white,
  },
  row2: { flexDirection: "row" },
  picker: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 11,
    padding: 12,
    backgroundColor: COLORS.white,
  },
  pickerText: { fontSize: 14, color: COLORS.text, fontWeight: "500" },
  pickerArrow: { fontSize: 13, color: COLORS.textMute },

  // Date input
  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 11,
    padding: 11,
    backgroundColor: COLORS.white,
    gap: 8,
  },
  dateIcon: { fontSize: 15 },
  dateText: { flex: 1, fontSize: 14, color: COLORS.text, fontWeight: "500" },
  dateClear: { fontSize: 12, color: COLORS.textMute, padding: 2 },

  // Claim section
  claimToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
    padding: 14,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  claimToggleLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  claimToggleIcon: { fontSize: 18 },
  claimToggleText: { fontSize: 14.5, fontWeight: "600", color: COLORS.text },
  claimToggleSub: {
    fontSize: 11,
    color: COLORS.amberText,
    fontWeight: "500",
    marginTop: 1,
  },
  claimToggleArrow: { fontSize: 13, color: COLORS.textMute },
  claimSection: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 14,
    marginTop: 6,
    backgroundColor: COLORS.white,
  },
  claimStatusRow: { flexDirection: "row", gap: 8, marginTop: 6 },
  claimStatusBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  claimStatusActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  claimStatusText: { fontSize: 12.5, color: COLORS.textSec, fontWeight: "600" },

  // Company picker
  companyPickerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  companyOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.borderLight,
    borderRadius: 8,
  },
  companyOptionActive: {
    backgroundColor: COLORS.activeGreen,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  companyOptionText: { fontSize: 14.5, color: COLORS.text },
  companyCheckWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.activeGreen,
    alignItems: "center",
    justifyContent: "center",
  },

  // Empty
  emptyWrap: { alignItems: "center", paddingTop: 60 },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyIcon: { fontSize: 36 },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
  },
  emptyText: { fontSize: 13, color: COLORS.textMute },

  // Calendar
  calOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  calSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
  },
  calHandleWrap: { alignItems: "center", paddingTop: 12, paddingBottom: 4 },
  calHandle: {
    width: 40,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: COLORS.border,
  },
  calHeader: { paddingHorizontal: 16, paddingBottom: 8 },
  calLabel: {
    fontSize: 10.5,
    fontWeight: "800",
    color: COLORS.textMute,
    textTransform: "uppercase",
    letterSpacing: 1.1,
    marginBottom: 12,
    marginTop: 4,
  },
  calNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  calNavBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.bg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  calNavArrow: {
    fontSize: 22,
    color: COLORS.primary,
    fontWeight: "700",
    lineHeight: 26,
  },
  calMonthYear: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
    letterSpacing: 0.2,
  },
  calDayHeaders: { flexDirection: "row", marginBottom: 6 },
  calDayHeader: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textMute,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  calGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
  },
  calCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  calCellSelected: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
  },
  calCellToday: {
    backgroundColor: COLORS.activeGreen,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.activeGreenBorder,
  },
  calDayNum: { fontSize: 14, color: COLORS.text, fontWeight: "500" },
  calDayNumSelected: { color: COLORS.white, fontWeight: "800" },
  calDayNumToday: { color: COLORS.primaryLight, fontWeight: "800" },
  calFooter: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    marginTop: 8,
  },
  calCancelBtn: {
    flex: 1,
    borderRadius: 12,
    padding: 13,
    alignItems: "center",
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  calCancelText: { fontSize: 14.5, color: COLORS.textSec, fontWeight: "600" },
  calConfirmBtn: {
    flex: 2,
    borderRadius: 12,
    padding: 13,
    alignItems: "center",
    backgroundColor: COLORS.primary,
  },
  calConfirmText: { fontSize: 14.5, color: COLORS.white, fontWeight: "700" },

  // Modern Alert
  alertOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  alertBox: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 16,
  },
  alertIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 1.5,
  },
  alertIcon: { fontSize: 28 },
  alertTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 8,
    textAlign: "center",
    letterSpacing: 0.1,
  },
  alertMessage: {
    fontSize: 14,
    color: COLORS.textSec,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 22,
  },
  alertBtns: { flexDirection: "row", gap: 10, width: "100%" },
  alertCancel: {
    flex: 1,
    borderRadius: 13,
    padding: 13,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg,
  },
  alertCancelText: { fontSize: 14.5, color: COLORS.textSec, fontWeight: "600" },
  alertConfirm: {
    flex: 1.5,
    borderRadius: 13,
    padding: 13,
    alignItems: "center",
  },
  alertConfirmText: { fontSize: 14.5, color: COLORS.white, fontWeight: "700" },
});
