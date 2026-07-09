import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  Modal,
  Animated,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useAuth } from "../../src/contexts/AuthContext";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { api, FarmSale } from "../../src/services/api";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function parseUTCDate(dateString: string): Date {
  const hasTimezone = /Z$|[+-]\d{2}:?\d{2}$/.test(dateString);
  return new Date(hasTimezone ? dateString : dateString + "Z");
}

function fmtDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

const PRODUCT_OPTIONS = [
  { key: "Milk", icon: "cup-water", labelHi: "दूध" },
  { key: "Ghee", icon: "food-variant", labelHi: "घी" },
  { key: "Curd", icon: "bowl-mix", labelHi: "दही" },
  { key: "Paneer", icon: "cheese", labelHi: "पनीर" },
  { key: "Cow Dung", icon: "compost", labelHi: "गोबर" },
  { key: "Other", icon: "dots-horizontal", labelHi: "अन्य" },
] as const;

const UNIT_OPTIONS = ["L", "kg", "piece"] as const;

// ─── Modern Alert ─────────────────────────────────────────────────────────────

interface AlertConfig {
  visible: boolean;
  title: string;
  message: string;
  icon?: string;
  iconColor?: string;
  iconBg?: string;
}

function ModernAlert({
  config,
  onClose,
}: {
  config: AlertConfig;
  onClose: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (config.visible) {
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          damping: 15,
          stiffness: 200,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [config.visible]);

  if (!config.visible) return null;

  return (
    <Modal visible={config.visible} transparent animationType="none">
      <View style={al.overlay}>
        <Animated.View
          style={[
            al.card,
            { opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          <View
            style={[
              al.iconWrap,
              { backgroundColor: config.iconBg ?? "#fee2e2" },
            ]}
          >
            <Ionicons
              name={(config.icon ?? "alert-circle-outline") as any}
              size={28}
              color={config.iconColor ?? "#ef4444"}
            />
          </View>
          <Text style={al.title}>{config.title}</Text>
          <Text style={al.message}>{config.message}</Text>
          <TouchableOpacity
            style={al.btn}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Text style={al.btnText}>OK</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

function useModernAlert() {
  const [config, setConfig] = useState<AlertConfig>({
    visible: false,
    title: "",
    message: "",
  });
  const show = (
    title: string,
    message: string,
    icon?: string,
    iconColor?: string,
    iconBg?: string,
  ) => setConfig({ visible: true, title, message, icon, iconColor, iconBg });
  const hide = () => setConfig((p) => ({ ...p, visible: false }));
  return { config, show, hide };
}

const al = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 22,
    width: "100%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 16,
  },
  iconWrap: {
    width: 62,
    height: 62,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 22,
    fontWeight: "500",
  },
  btn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#111827",
    alignItems: "center",
  },
  btnText: { fontSize: 15, fontWeight: "800", color: "#fff" },
});

// ─── Undo Confirm Modal ───────────────────────────────────────────────────────

function UndoConfirmModal({
  visible,
  sale,
  onConfirm,
  onCancel,
  loading,
  isHindi,
}: {
  visible: boolean;
  sale: FarmSale | null;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
  isHindi: boolean;
}) {
  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.88);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          damping: 14,
          stiffness: 220,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible || !sale) return null;

  return (
    <Modal visible={visible} transparent animationType="none">
      <View style={uc.overlay}>
        <Animated.View
          style={[
            uc.card,
            { opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          <View style={uc.iconRing}>
            <View style={uc.iconInner}>
              <Ionicons name="arrow-undo" size={26} color="#ef4444" />
            </View>
          </View>

          <Text style={uc.title}>
            {isHindi ? "बिक्री हटाएं?" : "Undo Sale Entry?"}
          </Text>
          <Text style={uc.subtitle}>
            {isHindi
              ? "इसे हमेशा के लिए हटा देगा"
              : "This will permanently remove the sale for"}
          </Text>

          <View style={uc.chip}>
            <Ionicons name="person" size={14} color="#374151" />
            <Text style={uc.chipName}>{sale.customer_name}</Text>
            <View style={uc.chipDivider} />
            <Text style={uc.chipTag}>{sale.product_name}</Text>
            <View style={uc.chipDivider} />
            <Text style={uc.chipQty}>₹{sale.total_amount.toFixed(0)}</Text>
          </View>

          <Text style={uc.warn}>
            {isHindi
              ? "यह बिक्री आज के कुल से हट जाएगी, आप इसे फिर से जोड़ सकते हैं।"
              : "This sale will be removed from today's total and you can re-enter it."}
          </Text>

          <View style={uc.btnRow}>
            <TouchableOpacity
              style={uc.cancelBtn}
              onPress={onCancel}
              activeOpacity={0.75}
              disabled={loading}
            >
              <Text style={uc.cancelTxt}>
                {isHindi ? "रहने दें" : "Keep it"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[uc.confirmBtn, loading && { opacity: 0.7 }]}
              onPress={onConfirm}
              activeOpacity={0.8}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="arrow-undo" size={15} color="#fff" />
                  <Text style={uc.confirmTxt}>
                    {isHindi ? "हां, हटाएं" : "Yes, Undo"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const uc = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.52)",
    justifyContent: "center",
    alignItems: "center",
    padding: 28,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 26,
    paddingHorizontal: 22,
    paddingTop: 30,
    paddingBottom: 24,
    width: "100%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 10 },
    elevation: 18,
  },
  iconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: "#fca5a5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  iconInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#fee2e2",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 20, fontWeight: "900", color: "#111827", marginBottom: 6 },
  subtitle: {
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "500",
    marginBottom: 14,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#f9fafb",
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  chipName: { fontSize: 14, fontWeight: "800", color: "#111827" },
  chipTag: { fontSize: 12, fontWeight: "700", color: "#6b7280" },
  chipQty: { fontSize: 13, fontWeight: "800", color: "#16a34a" },
  chipDivider: { width: 1, height: 14, backgroundColor: "#e5e7eb" },
  warn: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 22,
    paddingHorizontal: 8,
  },
  btnRow: { flexDirection: "row", gap: 10, width: "100%" },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    alignItems: "center",
    backgroundColor: "#f9fafb",
  },
  cancelTxt: { fontSize: 14, fontWeight: "800", color: "#374151" },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#ef4444",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  confirmTxt: { fontSize: 14, fontWeight: "800", color: "#fff" },
});

// ─── Date Filter Modal ────────────────────────────────────────────────────────

function DateFilterModal({
  visible,
  onClose,
  onSelect,
  currentDate,
  isHindi,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (date: string | null) => void;
  currentDate: string | null;
  isHindi: boolean;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [pickedDate, setPickedDate] = useState(new Date());

  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setShowPicker(false);
      scaleAnim.setValue(0.9);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          damping: 15,
          stiffness: 200,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={fm.overlay} activeOpacity={1} onPress={onClose}>
        <Animated.View
          style={[
            fm.card,
            { opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
          ]}
          onStartShouldSetResponder={() => true}
        >
          <View style={fm.header}>
            <View style={fm.headerIconWrap}>
              <Ionicons name="filter" size={16} color="#16a34a" />
            </View>
            <Text style={fm.title}>
              {isHindi ? "बिक्री फ़िल्टर करें" : "Filter Sales"}
            </Text>
          </View>

          <TouchableOpacity
            style={[fm.option, !currentDate && fm.optionActive]}
            onPress={() => onSelect(null)}
            activeOpacity={0.8}
          >
            <Ionicons
              name="infinite-outline"
              size={17}
              color={!currentDate ? "#16a34a" : "#6b7280"}
            />
            <Text style={[fm.optionText, !currentDate && fm.optionTextActive]}>
              {isHindi ? "सभी समय" : "All Time"}
            </Text>
            {!currentDate && (
              <Ionicons name="checkmark-circle" size={17} color="#16a34a" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[fm.option, currentDate === todayStr() && fm.optionActive]}
            onPress={() => onSelect(todayStr())}
            activeOpacity={0.8}
          >
            <Ionicons
              name="today-outline"
              size={17}
              color={currentDate === todayStr() ? "#16a34a" : "#6b7280"}
            />
            <Text
              style={[
                fm.optionText,
                currentDate === todayStr() && fm.optionTextActive,
              ]}
            >
              {isHindi ? "आज" : "Today"}
            </Text>
            {currentDate === todayStr() && (
              <Ionicons name="checkmark-circle" size={17} color="#16a34a" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              fm.option,
              currentDate && currentDate !== todayStr() && fm.optionActive,
            ]}
            onPress={() => {
              setPickedDate(
                currentDate && currentDate !== todayStr()
                  ? new Date(currentDate)
                  : new Date(),
              );
              setShowPicker(true);
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name="calendar-outline"
              size={17}
              color={
                currentDate && currentDate !== todayStr()
                  ? "#16a34a"
                  : "#6b7280"
              }
            />
            <Text
              style={[
                fm.optionText,
                currentDate &&
                  currentDate !== todayStr() &&
                  fm.optionTextActive,
              ]}
            >
              {currentDate && currentDate !== todayStr()
                ? currentDate
                : isHindi
                  ? "विशिष्ट तिथि चुनें"
                  : "Pick a specific date"}
            </Text>
            <Ionicons name="chevron-forward" size={15} color="#d1d5db" />
          </TouchableOpacity>

          {showPicker && (
            <View style={fm.pickerWrap}>
              <DateTimePicker
                value={pickedDate}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                maximumDate={new Date()}
                onChange={(_e, selected) => {
                  if (Platform.OS === "android") {
                    setShowPicker(false);
                    if (selected) onSelect(fmtDate(selected));
                    return;
                  }
                  if (selected) setPickedDate(selected);
                }}
              />
              {Platform.OS === "ios" && (
                <TouchableOpacity
                  style={fm.confirmBtn}
                  onPress={() => onSelect(fmtDate(pickedDate))}
                  activeOpacity={0.85}
                >
                  <Text style={fm.confirmBtnText}>
                    {isHindi ? "लागू करें" : "Apply"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const fm = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 28,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  headerIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "#f0fdf4",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 15, fontWeight: "900", color: "#111827" },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 4,
  },
  optionActive: { backgroundColor: "#f0fdf4" },
  optionText: { flex: 1, fontSize: 13, fontWeight: "700", color: "#374151" },
  optionTextActive: { color: "#16a34a" },
  pickerWrap: { marginTop: 4 },
  confirmBtn: {
    backgroundColor: "#16a34a",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 8,
  },
  confirmBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },
});

// ─── Add Sale Modal ────────────────────────────────────────────────────────────

function AddSaleModal({
  visible,
  onClose,
  onSaved,
  isHindi,
}: {
  visible: boolean;
  onClose: () => void;
  onSaved: (entry: FarmSale) => void;
  isHindi: boolean;
}) {
  const [customerName, setCustomerName] = useState("");
  const [product, setProduct] = useState<string>("Milk");
  const [customProduct, setCustomProduct] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState<string>("L");
  const [pricePerUnit, setPricePerUnit] = useState("");
  const [saving, setSaving] = useState(false);

  const {
    config: alertConfig,
    show: showAlert,
    hide: hideAlert,
  } = useModernAlert();

  const labels = {
    title: isHindi ? "नई बिक्री दर्ज करें" : "Record a New Sale",
    customer: isHindi ? "ग्राहक का नाम" : "Customer Name",
    customerPh: isHindi ? "जैसे: रमेश कुमार" : "e.g. Ramesh Kumar",
    product: isHindi ? "उत्पाद" : "Product",
    productPh: isHindi ? "उत्पाद का नाम लिखें" : "Enter product name",
    quantity: isHindi ? "मात्रा" : "Quantity",
    unit: isHindi ? "यूनिट" : "Unit",
    price: isHindi ? "प्रति" : "Price per",
    total: isHindi ? "कुल राशि" : "Total Amount",
    save: isHindi ? "बिक्री सहेजें" : "Save Sale",
    errorTitle: isHindi ? "सहेजा नहीं जा सका" : "Could Not Save",
    errorMsg: isHindi
      ? "बिक्री सहेजते समय कुछ गलत हो गया।"
      : "Something went wrong while saving the sale entry.",
  };

  const qtyNum = parseFloat(quantity) || 0;
  const priceNum = parseFloat(pricePerUnit) || 0;
  const computedTotal = Math.round(qtyNum * priceNum * 100) / 100;
  const resolvedProductName =
    product === "Other" ? customProduct.trim() : product;

  const canSave =
    customerName.trim().length > 0 &&
    resolvedProductName.length > 0 &&
    qtyNum > 0 &&
    priceNum > 0 &&
    !saving;

  const resetForm = () => {
    setCustomerName("");
    setProduct("Milk");
    setCustomProduct("");
    setQuantity("");
    setUnit("L");
    setPricePerUnit("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const entry = await api.workerCreateFarmSale({
        customer_name: customerName.trim(),
        product_name: resolvedProductName,
        quantity: qtyNum,
        unit,
        price_per_unit: priceNum,
        date: todayStr(),
      });
      onSaved(entry);
      resetForm();
      onClose();
    } catch (err: any) {
      showAlert(
        labels.errorTitle,
        err?.message ?? labels.errorMsg,
        "cart-outline",
        "#ef4444",
        "#fee2e2",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={am.container}>
        <StatusBar barStyle="light-content" />
        <ModernAlert config={alertConfig} onClose={hideAlert} />

        {/* Header */}
        <LinearGradient colors={["#16a34a", "#15803d"]} style={am.header}>
          <TouchableOpacity style={am.backBtn} onPress={handleClose}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={am.headerTitle}>{labels.title}</Text>
          </View>
        </LinearGradient>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={80}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={am.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={am.label}>{labels.customer}</Text>
            <TextInput
              style={am.input}
              value={customerName}
              onChangeText={setCustomerName}
              placeholder={labels.customerPh}
              placeholderTextColor="#9ca3af"
            />

            <Text style={am.label}>{labels.product}</Text>
            <View style={am.chipRow}>
              {PRODUCT_OPTIONS.map((p) => {
                const active = product === p.key;
                return (
                  <TouchableOpacity
                    key={p.key}
                    style={[am.productChip, active && am.productChipActive]}
                    onPress={() => setProduct(p.key)}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons
                      name={p.icon as any}
                      size={14}
                      color={active ? "#fff" : "#374151"}
                    />
                    <Text
                      style={[am.productChipText, active && { color: "#fff" }]}
                    >
                      {isHindi ? p.labelHi : p.key}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {product === "Other" && (
              <TextInput
                style={[am.input, { marginTop: 10 }]}
                value={customProduct}
                onChangeText={setCustomProduct}
                placeholder={labels.productPh}
                placeholderTextColor="#9ca3af"
              />
            )}

            <View style={am.row2}>
              <View style={{ flex: 1 }}>
                <Text style={am.label}>{labels.quantity}</Text>
                <TextInput
                  style={am.input}
                  value={quantity}
                  onChangeText={setQuantity}
                  placeholder="0"
                  placeholderTextColor="#9ca3af"
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={am.label}>{labels.unit}</Text>
                <View style={am.unitRow}>
                  {UNIT_OPTIONS.map((u) => {
                    const active = unit === u;
                    return (
                      <TouchableOpacity
                        key={u}
                        style={[am.unitChip, active && am.unitChipActive]}
                        onPress={() => setUnit(u)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[am.unitChipText, active && { color: "#fff" }]}
                        >
                          {u}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>

            <Text style={am.label}>
              {labels.price} {unit}
            </Text>
            <View style={am.priceInputWrap}>
              <Text style={am.rupee}>₹</Text>
              <TextInput
                style={am.priceInput}
                value={pricePerUnit}
                onChangeText={setPricePerUnit}
                placeholder="0"
                placeholderTextColor="#9ca3af"
                keyboardType="decimal-pad"
              />
            </View>

            <View style={am.totalPreview}>
              <Text style={am.totalPreviewLabel}>{labels.total}</Text>
              <Text style={am.totalPreviewValue}>
                ₹{computedTotal.toFixed(2)}
              </Text>
            </View>

            <TouchableOpacity
              style={[am.saveBtn, !canSave && am.saveBtnDisabled]}
              onPress={handleSave}
              disabled={!canSave}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={18}
                    color="#fff"
                  />
                  <Text style={am.saveBtnText}>{labels.save}</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const am = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingTop: 56,
    paddingBottom: 18,
    paddingHorizontal: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "900", color: "#fff" },
  scrollContent: { padding: 16 },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6b7280",
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    backgroundColor: "#f9fafb",
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  productChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#f9fafb",
  },
  productChipActive: { backgroundColor: "#16a34a", borderColor: "#16a34a" },
  productChipText: { fontSize: 12, fontWeight: "700", color: "#374151" },
  row2: { flexDirection: "row" },
  unitRow: { flexDirection: "row", gap: 6 },
  unitChip: {
    flex: 1,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingVertical: 12,
    backgroundColor: "#f9fafb",
  },
  unitChipActive: { backgroundColor: "#16a34a", borderColor: "#16a34a" },
  unitChipText: { fontSize: 13, fontWeight: "800", color: "#374151" },
  priceInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    backgroundColor: "#f9fafb",
    paddingHorizontal: 14,
  },
  rupee: { fontSize: 15, fontWeight: "800", color: "#6b7280", marginRight: 4 },
  priceInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  totalPreview: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#16a34a30",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 20,
  },
  totalPreviewLabel: { fontSize: 13, fontWeight: "700", color: "#16a34a" },
  totalPreviewValue: { fontSize: 18, fontWeight: "900", color: "#16a34a" },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#16a34a",
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 20,
  },
  saveBtnDisabled: { backgroundColor: "#d1d5db" },
  saveBtnText: { fontSize: 15, fontWeight: "800", color: "#fff" },
});

// ─── Sale Card (shared) ────────────────────────────────────────────────────────

function SaleCard({
  sale,
  myWorkerId,
  onUndo,
  undoLabel,
  showDate = false,
}: {
  sale: FarmSale;
  myWorkerId: string | null;
  onUndo: () => void;
  undoLabel: string;
  showDate?: boolean;
}) {
  return (
    <View style={s.saleCard}>
      <View style={s.saleTop}>
        <View style={s.saleAvatar}>
          <Ionicons name="person" size={18} color="#16a34a" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.saleCustomer}>{sale.customer_name}</Text>
          <Text style={s.saleMeta}>
            {sale.product_name} · {sale.quantity} {sale.unit} × ₹
            {sale.price_per_unit}
          </Text>
        </View>
        <Text style={s.saleAmount}>₹{sale.total_amount.toFixed(0)}</Text>
      </View>

      <View style={s.saleFooter}>
        <Text style={s.saleTime}>
          {showDate ? `${sale.date} · ` : ""}
          {parseUTCDate(sale.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
        {sale.worker_id === myWorkerId ? (
          <TouchableOpacity
            style={s.undoBtn}
            onPress={onUndo}
            activeOpacity={0.75}
          >
            <Ionicons name="arrow-undo" size={13} color="#ef4444" />
            <Text style={s.undoBtnText}>{undoLabel}</Text>
          </TouchableOpacity>
        ) : (
          <View style={s.addedByBadge}>
            <Text style={s.addedByText}>{sale.worker_name}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

function FarmSaleScreenInner() {
  const { workerToken } = useAuth();

  const [todaySales, setTodaySales] = useState<FarmSale[]>([]);
  const [allSales, setAllSales] = useState<FarmSale[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [allLoading, setAllLoading] = useState(true);
  const [allRefreshing, setAllRefreshing] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [isHindi, setIsHindi] = useState(false);

  const [filterDate, setFilterDate] = useState<string | null>(null); // null = All Time
  const [filterVisible, setFilterVisible] = useState(false);

  const [undoTarget, setUndoTarget] = useState<FarmSale | null>(null);
  const [undoing, setUndoing] = useState(false);
  const [myWorkerId, setMyWorkerId] = useState<string | null>(null);

  const {
    config: alertConfig,
    show: showAlert,
    hide: hideAlert,
  } = useModernAlert();

  const labels = {
    title: isHindi ? "फार्म सेल" : "Farm Sale",
    revenueLbl: isHindi ? "आज की कमाई" : "Today's Revenue",
    salesToday: (n: number) =>
      isHindi ? `आज ${n} बिक्री` : `${n} sale${n !== 1 ? "s" : ""} today`,
    sectionTitle: isHindi ? "आज की बिक्री" : "Today's Sales",
    allSalesTitle: isHindi ? "सभी बिक्री" : "All Sales",
    emptyTitle: isHindi ? "अभी कोई बिक्री नहीं" : "No sales recorded yet",
    emptySub: isHindi
      ? "ऊपर + बटन दबाकर नई बिक्री जोड़ें"
      : "Tap the + button above to add a new sale",
    emptyAllTitle: isHindi
      ? "इस अवधि में कोई बिक्री नहीं"
      : "No sales in this period",
    undo: isHindi ? "पूर्ववत करें" : "Undo",
    undoFailTitle: isHindi ? "पूर्ववत नहीं हो सका" : "Undo Failed",
    undoFailMsg: isHindi
      ? "प्रविष्टि हटाई नहीं जा सकी। आप केवल आज की प्रविष्टियां हटा सकते हैं।"
      : "Could not remove the entry. You can only undo today's sales.",
    loadingText: isHindi
      ? "बिक्री रिकॉर्ड लोड हो रहे हैं…"
      : "Loading sale records…",
    allTime: isHindi ? "सभी समय" : "All Time",
    today: isHindi ? "आज" : "Today",
  };

  const fetchToday = useCallback(async () => {
    try {
      const data = await api.workerGetFarmSales({ date: todayStr() });
      setTodaySales(data);
    } catch (e) {
      console.log("today sales fetch error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [workerToken]);

  const fetchAll = useCallback(async (date: string | null) => {
    setAllLoading(true);
    try {
      const data = date
        ? await api.workerGetFarmSales({ date })
        : await api.workerGetFarmSales({ all_time: true });
      setAllSales(data);
    } catch (e) {
      console.log("all sales fetch error:", e);
    } finally {
      setAllLoading(false);
      setAllRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchToday();
    fetchAll(null);
  }, []);

  useEffect(() => {
    AsyncStorage.getItem("worker_data").then((raw) => {
      if (raw) {
        try {
          const w = JSON.parse(raw);
          setMyWorkerId(w.id ?? null);
        } catch {}
      }
    });
  }, []);

  const onRefreshTop = () => {
    setRefreshing(true);
    setAllRefreshing(true);
    fetchToday();
    fetchAll(filterDate);
  };

  const totalRevenue = todaySales.reduce((s, e) => s + e.total_amount, 0);

  const handleSaved = (entry: FarmSale) => {
    setTodaySales((prev) => [entry, ...prev]);
    if (!filterDate || filterDate === todayStr()) {
      setAllSales((prev) => [entry, ...prev]);
    }
  };

  const handleUndoConfirm = async () => {
    if (!undoTarget) return;
    setUndoing(true);
    try {
      await api.workerDeleteFarmSale(undoTarget.id);
      setTodaySales((prev) => prev.filter((s) => s.id !== undoTarget.id));
      setAllSales((prev) => prev.filter((s) => s.id !== undoTarget.id));
      setUndoTarget(null);
    } catch (err: any) {
      setUndoTarget(null);
      showAlert(
        labels.undoFailTitle,
        err?.message ?? labels.undoFailMsg,
        "arrow-undo-outline",
        "#ef4444",
        "#fee2e2",
      );
    } finally {
      setUndoing(false);
    }
  };

  const applyDateFilter = (date: string | null) => {
    setFilterDate(date);
    setFilterVisible(false);
    fetchAll(date);
  };

  const filterLabel = filterDate
    ? filterDate === todayStr()
      ? labels.today
      : filterDate
    : labels.allTime;

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color="#16a34a" />
        <Text style={s.loadingText}>{labels.loadingText}</Text>
      </View>
    );
  }

  return (
    <>
      <ModernAlert config={alertConfig} onClose={hideAlert} />
      <UndoConfirmModal
        visible={!!undoTarget}
        sale={undoTarget}
        onConfirm={handleUndoConfirm}
        onCancel={() => setUndoTarget(null)}
        loading={undoing}
        isHindi={isHindi}
      />
      <AddSaleModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSaved={handleSaved}
        isHindi={isHindi}
      />
      <DateFilterModal
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        onSelect={applyDateFilter}
        currentDate={filterDate}
        isHindi={isHindi}
      />

      <View style={s.container}>
        {/* ── Header ── */}
        <View style={s.topBar}>
          <View style={{ flex: 1 }}>
            <Text style={s.topBarTitle}>{labels.title}</Text>
            <Text style={s.topBarDate}>{todayStr()}</Text>
          </View>

          <TouchableOpacity
            style={s.langBtn}
            onPress={() => setIsHindi((v) => !v)}
            activeOpacity={0.8}
          >
            <Text style={s.langBtnText}>{isHindi ? "EN" : "हि"}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.addBtn}
            onPress={() => setShowAddModal(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={26} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing || allRefreshing}
              onRefresh={onRefreshTop}
              tintColor="#16a34a"
            />
          }
        >
          {/* ── Revenue Banner (Today) ── */}
          <LinearGradient
            colors={["#f0fdf4", "#dcfce7"]}
            style={[s.banner, { borderColor: "#16a34a40" }]}
          >
            <View style={s.bannerLeft}>
              <View style={[s.bannerIconBox, { backgroundColor: "#bbf7d0" }]}>
                <MaterialCommunityIcons
                  name="cash-register"
                  size={22}
                  color="#16a34a"
                />
              </View>
              <View>
                <Text style={[s.bannerTitle, { color: "#16a34a" }]}>
                  {labels.revenueLbl}
                </Text>
                <Text style={s.bannerSub}>
                  {labels.salesToday(todaySales.length)}
                </Text>
              </View>
            </View>
            <Text style={[s.totalNum, { color: "#16a34a" }]}>
              ₹{totalRevenue.toFixed(0)}
            </Text>
          </LinearGradient>

          {/* ── Today's Sales ── */}
          <Text style={s.sectionTitle}>{labels.sectionTitle}</Text>

          {todaySales.length === 0 ? (
            <View style={s.emptyWrap}>
              <MaterialCommunityIcons
                name="cart-off"
                size={44}
                color="#d1d5db"
              />
              <Text style={s.emptyTitle}>{labels.emptyTitle}</Text>
              <Text style={s.emptySub}>{labels.emptySub}</Text>
              <TouchableOpacity
                style={s.emptyAddBtn}
                onPress={() => setShowAddModal(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="add-circle-outline" size={18} color="#fff" />
                <Text style={s.emptyAddBtnText}>
                  {isHindi ? "बिक्री जोड़ें" : "Add Sale"}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            todaySales.map((sale) => (
              <SaleCard
                key={sale.id}
                sale={sale}
                myWorkerId={myWorkerId}
                onUndo={() => setUndoTarget(sale)}
                undoLabel={labels.undo}
              />
            ))
          )}

          {/* ── Divider ── */}
          <View style={s.sectionDivider} />

          {/* ── All Sales (with filter) ── */}
          <View style={s.allHeaderRow}>
            <Text style={[s.sectionTitle, { marginBottom: 0 }]}>
              {labels.allSalesTitle}
            </Text>
            <TouchableOpacity
              style={s.filterBtn}
              onPress={() => setFilterVisible(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="filter" size={13} color="#16a34a" />
              <Text style={s.filterBtnText}>{filterLabel}</Text>
              <Ionicons name="chevron-down" size={12} color="#16a34a" />
            </TouchableOpacity>
          </View>

          {allLoading ? (
            <ActivityIndicator
              color="#16a34a"
              style={{ marginTop: 24, marginBottom: 24 }}
            />
          ) : allSales.length === 0 ? (
            <View style={s.emptyWrap}>
              <MaterialCommunityIcons
                name="cart-off"
                size={40}
                color="#d1d5db"
              />
              <Text style={s.emptyTitle}>{labels.emptyAllTitle}</Text>
            </View>
          ) : (
            allSales.map((sale) => (
              <SaleCard
                key={sale.id}
                sale={sale}
                myWorkerId={myWorkerId}
                onUndo={() => setUndoTarget(sale)}
                undoLabel={labels.undo}
                showDate
              />
            ))
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </>
  );
}

export default function FarmSaleScreen() {
  return <FarmSaleScreenInner />;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  content: { padding: 16 },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: { color: "#6b7280", fontSize: 14 },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  topBarTitle: { fontSize: 20, fontWeight: "900", color: "#111827" },
  topBarDate: { fontSize: 12, color: "#9ca3af", marginTop: 2 },
  langBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    alignItems: "center",
    justifyContent: "center",
  },
  langBtnText: { fontSize: 13, fontWeight: "900", color: "#16a34a" },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#16a34a",
    alignItems: "center",
    justifyContent: "center",
  },

  banner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    marginBottom: 20,
    marginTop: 4,
  },
  bannerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  bannerIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  bannerTitle: { fontSize: 14, fontWeight: "800" },
  bannerSub: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  totalNum: { fontSize: 24, fontWeight: "900" },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 10,
  },

  sectionDivider: {
    height: 1,
    backgroundColor: "#f3f4f6",
    marginVertical: 22,
  },
  allHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  filterBtnText: { fontSize: 12, fontWeight: "800", color: "#16a34a" },

  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 8,
  },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: "#6b7280" },
  emptySub: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center",
    paddingHorizontal: 32,
  },
  emptyAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#16a34a",
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginTop: 14,
  },
  emptyAddBtnText: { fontSize: 13, fontWeight: "800", color: "#fff" },

  saleCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#f3f4f6",
    padding: 14,
    marginBottom: 10,
  },
  saleTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  saleAvatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
  },
  saleCustomer: { fontSize: 14, fontWeight: "800", color: "#111827" },
  saleMeta: { fontSize: 12, color: "#9ca3af", marginTop: 2 },
  saleAmount: { fontSize: 16, fontWeight: "900", color: "#16a34a" },
  saleFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  saleTime: { fontSize: 11, color: "#9ca3af", fontWeight: "600" },
  undoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fca5a5",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  undoBtnText: { fontSize: 12, fontWeight: "800", color: "#ef4444" },

  addedByBadge: {
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  addedByText: { fontSize: 11, fontWeight: "700", color: "#6b7280" },
});
