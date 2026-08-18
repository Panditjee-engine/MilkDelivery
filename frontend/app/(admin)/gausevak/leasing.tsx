import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { api } from "../../../src/services/api";

interface FarmResult {
  admin_id: string;
  farm_name?: string;
  email?: string;
  phone?: string;
  location_id?: string;
  location_label?: string;
  location_address?: string;
}

interface Cow {
  id: string;
  name: string;
  tag: string;
}

function getTodayStr(): string {
  const today = new Date();
  return `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`;
}

function strToDate(str: string): Date {
  const parts = str.split("/");
  if (parts.length === 3) {
    const d = new Date(+parts[2], +parts[1] - 1, +parts[0]);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
}

function dateToStr(date: Date): string {
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

function DateField({
  label,
  value,
  onChange,
  minimumDate,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  minimumDate?: Date;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const currentDate = value ? strToDate(value) : new Date();

  const handlePickerChange = (_: any, selectedDate?: Date) => {
    if (Platform.OS === "android") setShowPicker(false);
    if (selectedDate) onChange(dateToStr(selectedDate));
  };

  return (
    <View>
      <Text style={s.label}>{label}</Text>
      <TouchableOpacity
        style={s.dateRow}
        onPress={() => setShowPicker(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="calendar-outline" size={15} color="#7c3aed" />
        <Text style={[s.dateText, !value && { color: "#D4B8A8" }]}>
          {value || "Select date"}
        </Text>
        <Ionicons name="chevron-down" size={14} color="#C4A882" />
      </TouchableOpacity>

      {showPicker && Platform.OS === "ios" && (
        <Modal transparent animationType="slide" visible={showPicker}>
          <View style={s.pickerOverlay}>
            <View style={s.pickerCard}>
              <View style={s.pickerHeader}>
                <Text style={s.pickerTitle}>{label}</Text>
                <TouchableOpacity
                  onPress={() => setShowPicker(false)}
                  style={s.pickerDoneBtn}
                >
                  <Text style={s.pickerDoneText}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={currentDate}
                mode="date"
                display="spinner"
                onChange={handlePickerChange}
                minimumDate={minimumDate}
              />
            </View>
          </View>
        </Modal>
      )}
      {showPicker && Platform.OS === "android" && (
        <DateTimePicker
          value={currentDate}
          mode="date"
          display="default"
          onChange={handlePickerChange}
          minimumDate={minimumDate}
        />
      )}
    </View>
  );
}

export default function LeaseModal({
  visible,
  cow,
  onClose,
  onLeased,
  showAlert,
}: {
  visible: boolean;
  cow: Cow | null;
  onClose: () => void;
  onLeased: (cowId: string, lease: any) => void;
  showAlert: (c: any) => void;
}) {
  const [step, setStep] = useState<"search" | "form">("search");
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<FarmResult[]>([]);
  const [selectedFarm, setSelectedFarm] = useState<FarmResult | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [price, setPrice] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setStep("search");
    setQuery("");
    setResults([]);
    setSelectedFarm(null);
    setPrice("");
    setStartDate("");
    setEndDate("");
    setReason("");
    onClose();
  };

  const handleSearchChange = (v: string) => {
    setQuery(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (v.trim().length < 3) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.searchFarms(v.trim());
        setResults(res ?? []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  };

  const pickFarm = (farm: FarmResult) => {
    setSelectedFarm(farm);
    setStep("form");
  };

  const submit = async () => {
    if (!cow || !selectedFarm) return;
    if (!price || !startDate || !endDate) {
      showAlert({
        title: "Missing Fields",
        message: "Price, start date and end date are required.",
        type: "error",
      });
      return;
    }
    setSubmitting(true);
    try {
      const lease = await api.leaseCow(cow.id, {
        cow_id: cow.id, 
        lessee_admin_id: selectedFarm.admin_id,
        lessee_farm_name: selectedFarm.farm_name,
        lessee_email: selectedFarm.email,
        lessee_phone: selectedFarm.phone,
        price: parseFloat(price),
        start_date: startDate,
        end_date: endDate,
        reason: reason || undefined,
        location_id: selectedFarm.location_id,
        location_label: selectedFarm.location_label,
        location_address: selectedFarm.location_address,
      });
      onLeased(cow.id, lease);
      reset();
    } catch (err: any) {
      showAlert({
        title: "Lease Failed",
        message: err.message ?? "Failed to create lease.",
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!cow) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={reset}
    >
      <View style={s.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ width: "100%" }}
        >
          <View style={s.sheet}>
            <View style={s.handle} />
            <View style={s.header}>
              {step === "form" && (
                <TouchableOpacity
                  onPress={() => setStep("search")}
                  style={s.backBtn}
                >
                  <Ionicons name="arrow-back" size={16} color="#8B6854" />
                </TouchableOpacity>
              )}
              <Text style={s.title}>Lease {cow.name}</Text>
              <TouchableOpacity onPress={reset} style={s.closeBtn}>
                <Ionicons name="close" size={18} color="#8B6854" />
              </TouchableOpacity>
            </View>

            {step === "search" && (
              <>
                <Text style={s.sub}>Search farm by email or phone number</Text>
                <View style={s.searchRow}>
                  <Ionicons name="search-outline" size={15} color="#C4A882" />
                  <TextInput
                    style={s.searchInput}
                    value={query}
                    onChangeText={handleSearchChange}
                    placeholder="farm@email.com or phone number"
                    placeholderTextColor="#D4B8A8"
                    autoCapitalize="none"
                  />
                  {searching && (
                    <ActivityIndicator size="small" color="#7c3aed" />
                  )}
                </View>
                <ScrollView
                  style={{ maxHeight: 320 }}
                  showsVerticalScrollIndicator={false}
                >
                  {results.map((farm) => (
                    <TouchableOpacity
                      key={farm.admin_id}
                      style={s.farmRow}
                      onPress={() => pickFarm(farm)}
                      activeOpacity={0.8}
                    >
                      <View style={s.farmIconWrap}>
                        <Ionicons
                          name="business-outline"
                          size={18}
                          color="#7c3aed"
                        />
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={s.farmName}>
                          {farm.farm_name || "Unnamed Farm"}
                        </Text>
                        <Text style={s.farmMeta}>
                          {farm.email || farm.phone}
                        </Text>
                        {farm.location_label && (
                          <Text style={s.farmMeta}>
                            📍 {farm.location_label}
                          </Text>
                        )}
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color="#C4A882"
                      />
                    </TouchableOpacity>
                  ))}
                  {!searching && query.length >= 3 && results.length === 0 && (
                    <Text style={s.emptyText}>
                      No farms found for "{query}"
                    </Text>
                  )}
                </ScrollView>
              </>
            )}

            {step === "form" && selectedFarm && (
              <ScrollView
                showsVerticalScrollIndicator={false}
                style={{ maxHeight: 420 }}
              >
                <View style={s.selectedFarmBanner}>
                  <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
                  <View style={{ marginLeft: 8 }}>
                    <Text style={s.selectedFarmName}>
                      {selectedFarm.farm_name}
                    </Text>
                    <Text style={s.farmMeta}>
                      {selectedFarm.email || selectedFarm.phone}
                    </Text>
                  </View>
                </View>

                <Text style={s.label}>Lease Price (₹)</Text>
                <TextInput
                  style={s.input}
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="numeric"
                  placeholder="e.g. 5000"
                  placeholderTextColor="#D4B8A8"
                />

                <DateField
                  label="Start Date"
                  value={startDate}
                  onChange={(v) => {
                    setStartDate(v);
                    // if end date is now before the new start date, clear it so user re-picks
                    if (endDate) {
                      const s = strToDate(v);
                      const e = strToDate(endDate);
                      if (e < s) setEndDate("");
                    }
                  }}
                  minimumDate={new Date()}
                />

                <DateField
                  label="End Date"
                  value={endDate}
                  onChange={setEndDate}
                  minimumDate={startDate ? strToDate(startDate) : new Date()}
                />
                <Text style={s.label}>Reason</Text>
                <TextInput
                  style={[s.input, { minHeight: 60 }]}
                  value={reason}
                  onChangeText={setReason}
                  placeholder="e.g. Breeding, dairy supplement..."
                  placeholderTextColor="#D4B8A8"
                  multiline
                />

                <Text style={s.label}>Location</Text>
                <View style={s.locationBox}>
                  <Ionicons name="location-outline" size={15} color="#8B6854" />
                  <Text style={s.locationText}>
                    {selectedFarm.location_address ||
                      selectedFarm.location_label ||
                      "No saved location for this farm"}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[s.submitBtn, submitting && { opacity: 0.7 }]}
                  onPress={submit}
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
                      <Text style={s.submitText}>Confirm Lease</Text>
                    </>
                  )}
                </TouchableOpacity>
                <View style={{ height: 20 }} />
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(61,43,31,0.45)",
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
    backgroundColor: "#F5EDE5",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  title: { flex: 1, fontSize: 17, fontWeight: "800", color: "#7c3aed" },
  sub: { fontSize: 13, color: "#C4A882", fontWeight: "500", marginBottom: 14 },
  backBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F5EDE5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F5EDE5",
    alignItems: "center",
    justifyContent: "center",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF8F0",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#F5EDE5",
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 8,
    marginBottom: 12,
  },
  searchInput: { flex: 1, color: "#8B6854", fontSize: 14 },
  farmRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF8F0",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F5EDE5",
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
  },
  farmIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#f5f3ff",
    alignItems: "center",
    justifyContent: "center",
  },
  farmName: { fontSize: 14, fontWeight: "700", color: "#111827" },
  farmMeta: { fontSize: 11, color: "#9ca3af", fontWeight: "500", marginTop: 1 },
  emptyText: {
    fontSize: 13,
    color: "#C4A882",
    textAlign: "center",
    paddingVertical: 24,
  },
  selectedFarmBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#86efac",
    padding: 12,
    marginBottom: 16,
  },
  selectedFarmName: { fontSize: 14, fontWeight: "700", color: "#15803d" },
  label: {
    fontSize: 11,
    color: "#8B6854",
    fontWeight: "700",
    letterSpacing: 0.4,
    marginBottom: 6,
    marginTop: 10,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: "#FFF8F0",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#F5EDE5",
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: "#8B6854",
    fontSize: 14,
  },
  locationBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFF8F0",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#F5EDE5",
    padding: 12,
  },
  locationText: { flex: 1, fontSize: 13, color: "#8B6854", fontWeight: "500" },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7c3aed",
    borderRadius: 14,
    paddingVertical: 15,
    gap: 8,
    marginTop: 20,
  },
  submitText: { fontSize: 15, fontWeight: "800", color: "#fff" },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFF8F0",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#F5EDE5",
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  dateText: { flex: 1, color: "#8B6854", fontSize: 14, fontWeight: "500" },
  pickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  pickerCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
  },
  pickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F5EDE5",
  },
  pickerTitle: { fontSize: 15, fontWeight: "700", color: "#111827" },
  pickerDoneBtn: {
    backgroundColor: "#7c3aed",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  pickerDoneText: { fontSize: 13, fontWeight: "800", color: "#fff" },
});
