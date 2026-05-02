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
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../../src/services/api";

type CowType = "mature" | "newborn" | "bull";
type PregnancyStatus = "pregnant" | "not_pregnant" | "unknown";

interface Cow {
  id: string;
  admin_id: string;
  tag: string;
  name: string;
  breed: string;
  weight?: string;
  father?: string;
  mother?: string;
  size?: string;
  boughtDate?: string;
  bornDate?: string;
  isActive: boolean;
  isSold: boolean;
  type: CowType;
  created_at: string;
  pregnancyStatus?: PregnancyStatus;
  activeSince?: string;
  milkActive?: boolean;
  semenAvailable?: boolean;
  totalDoses?: number;
  lastUsedDate?: string;
  successRate?: number;
  purpose?: string;
  damYield?: number;
  qrCode?: string;
  isExpired?: boolean;
  expiryDate?: string;
  expiryReason?: string;
  isTransferred?: boolean;
  transferGaushalaName?: string;
  transferAddress?: string;
  transferDate?: string;
  soldGaushalaName?: string;
  soldAddress?: string;
  soldDate?: string;
  soldPrice?: string;
  soldReason?: string;
}

interface Insurance {
  id: string;
  company: string;
  policy_number: string;
  sum_insured: number;
  annual_premium: number;
  expiry_date: string;
  status: string;
  days_to_expiry?: number;
  claim_filed?: boolean;
  claim_status?: string;
}

interface CowForm {
  tag: string;
  name: string;
  breed: string;
  weight: string;
  size: string;
  father: string;
  mother: string;
  boughtDate: string;
  bornDate: string;
  isActive: boolean;
  isSold: boolean;
  type: CowType;
  milkActive: boolean;
  semenAvailable: boolean;
  totalDoses: string;
  lastUsedDate: string;
  successRate: string;
  purpose: string;
  damYield: string;
  isExpired: boolean;
  expiryDate: string;
  expiryReason: string;
  isTransferred: boolean;
  transferGaushalaName: string;
  transferAddress: string;
  transferDate: string;
  soldGaushalaName: string;
  soldAddress: string;
  soldDate: string;
  soldPrice: string;
  soldReason: string;
}

const cowImg = require("../../../assets/images/gir-cow.png");
const bullImg = require("../../../assets/images/bull-cow.png");
const calfImg = require("../../../assets/images/calf-cow.png");

const getAnimalImage = (type: string) => {
  if (type === "bull") return bullImg;
  if (type === "newborn") return calfImg;
  return cowImg;
};

const EMPTY_FORM: CowForm = {
  tag: "",
  name: "",
  breed: "",
  weight: "",
  size: "",
  father: "",
  mother: "",
  boughtDate: "",
  bornDate: "",
  isActive: true,
  isSold: false,
  type: "mature",
  milkActive: false,
  semenAvailable: false,
  totalDoses: "",
  lastUsedDate: "",
  successRate: "",
  purpose: "breeding",
  damYield: "",
  isExpired: false,
  expiryDate: "",
  expiryReason: "",
  isTransferred: false,
  transferGaushalaName: "",
  transferAddress: "",
  transferDate: "",
  soldGaushalaName: "",
  soldAddress: "",
  soldDate: "",
  soldPrice: "",
  soldReason: "",
};

const STATUS = {
  healthy: {
    color: "#BB6B3F",
    bg: "#FFF8F0",
    border: "#8B6854",
    label: "Healthy",
  },
  sick: { color: "#8B6854", bg: "#F5EFEA", border: "#D4B8A8", label: "Sick" },
  sold: { color: "#FF9675", bg: "#FFF5F2", border: "#FFD4C4", label: "Sold" },
  bull: { color: "#FFBF55", bg: "#FFFBF0", border: "#8B6854", label: "Bull" },
  transferred: {
    color: "#7c3aed",
    bg: "#fdf4ff",
    border: "#e9d5ff",
    label: "Transferred",
  },
} as const;

function derivedStatus(cow: Cow): keyof typeof STATUS {
  if (cow.type === "bull") return "bull";
  if (cow.isTransferred) return "transferred";
  if (cow.isSold) return "sold";
  if (!cow.isActive) return "sick";
  return "healthy";
}

function getTodayStr(): string {
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, "0");
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${today.getFullYear()}`;
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
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${date.getFullYear()}`;
}

function getActiveDays(activeSince?: string): number | null {
  if (!activeSince) return null;
  const parts = activeSince.split("/");
  if (parts.length !== 3) return null;
  const start = new Date(+parts[2], +parts[1] - 1, +parts[0]);
  if (isNaN(start.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor(
    (today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
  );
  return diff >= 0 ? diff : null;
}

// ── DateField 
function DateField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const currentDate = value ? strToDate(value) : new Date();

  const handlePickerChange = (_: any, selectedDate?: Date) => {
    if (Platform.OS === "android") setShowPicker(false);
    if (selectedDate) onChange(dateToStr(selectedDate));
  };

  return (
    <View style={f.wrap}>
      <Text style={f.label}>{label}</Text>
      <View style={[f.row, focused && f.focused]}>
        <TouchableOpacity onPress={() => setShowPicker(true)}>
          <Ionicons
            name="calendar-outline"
            size={15}
            color={showPicker || focused ? "#FFBF55" : "#C4A882"}
            style={{ marginRight: 8 }}
          />
        </TouchableOpacity>
        <TextInput
          style={f.input}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder ?? "DD/MM/YYYY"}
          placeholderTextColor="#D4B8A8"
          keyboardType="numeric"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {value === "" && (
          <TouchableOpacity
            onPress={() => onChange(getTodayStr())}
            style={f.todayBtn}
          >
            <Text style={f.todayText}>Today</Text>
          </TouchableOpacity>
        )}
      </View>
      {showPicker && Platform.OS === "ios" && (
        <Modal transparent animationType="slide" visible={showPicker}>
          <View style={f.pickerOverlay}>
            <View style={f.pickerCard}>
              <View style={f.pickerHeader}>
                <Text style={f.pickerTitle}>{label}</Text>
                <TouchableOpacity
                  onPress={() => setShowPicker(false)}
                  style={f.pickerDoneBtn}
                >
                  <Text style={f.pickerDoneText}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={currentDate}
                mode="date"
                display="spinner"
                onChange={handlePickerChange}
                maximumDate={new Date()}
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
          maximumDate={new Date()}
        />
      )}
    </View>
  );
}

// ── Field 
function Field({
  label,
  value,
  onChange,
  placeholder,
  icon,
  keyboardType,
  multiline,
}: any) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={f.wrap}>
      <Text style={f.label}>{label}</Text>
      <View
        style={[
          f.row,
          focused && f.focused,
          multiline && {
            alignItems: "flex-start",
            paddingTop: 10,
            paddingBottom: 10,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={15}
          color={focused ? "#FFBF55" : "#C4A882"}
          style={{ marginRight: 8, marginTop: multiline ? 2 : 0 }}
        />
        <TextInput
          style={[
            f.input,
            multiline && { minHeight: 64, textAlignVertical: "top" },
          ]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder ?? label}
          placeholderTextColor="#D4B8A8"
          keyboardType={keyboardType ?? "default"}
          multiline={multiline}
          numberOfLines={multiline ? 3 : 1}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>
    </View>
  );
}

const BREEDS = [
  { name: "Gir", image: cowImg, origin: "Gujarat" },
  { name: "Sahiwal", image: cowImg, origin: "Punjab" },
  { name: "Red Sindhi", image: cowImg, origin: "Sindh" },
  { name: "Tharparkar", image: cowImg, origin: "Rajasthan" },
  { name: "Rathi", image: cowImg, origin: "Rajasthan" },
  { name: "Kankrej", image: cowImg, origin: "Gujarat" },
  { name: "Badri / Pahadi", image: cowImg, origin: "Uttarakhand" },
];

function BreedSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const searchRef = useRef<TextInput>(null);
  const filtered = BREEDS.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase()),
  );
  const select = (name: string) => {
    onChange(name);
    setOpen(false);
    setSearch("");
  };
  const openDropdown = () => {
    setOpen(true);
    setTimeout(() => searchRef.current?.focus(), 150);
  };

  return (
    <View style={f.wrap}>
      <Text style={f.label}>Breed</Text>
      <TouchableOpacity
        onPress={openDropdown}
        style={[f.row, open && f.focused]}
        activeOpacity={0.8}
      >
        <Ionicons
          name="paw-outline"
          size={15}
          color={open ? "#FFBF55" : "#C4A882"}
          style={{ marginRight: 8 }}
        />
        <Text
          style={[
            f.input,
            { paddingVertical: 0 },
            !value && { color: "#D4B8A8" },
          ]}
        >
          {value || "Select or type breed"}
        </Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={14}
          color="#C4A882"
        />
      </TouchableOpacity>
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setOpen(false);
          setSearch("");
        }}
      >
        <TouchableOpacity
          style={bd.overlay}
          activeOpacity={1}
          onPress={() => {
            setOpen(false);
            setSearch("");
          }}
        >
          <TouchableOpacity activeOpacity={1} style={bd.card}>
            <View style={bd.header}>
              <Text style={bd.title}>Select Breed</Text>
              <TouchableOpacity
                onPress={() => {
                  setOpen(false);
                  setSearch("");
                }}
                style={bd.closeBtn}
              >
                <Ionicons name="close" size={16} color="#8B6854" />
              </TouchableOpacity>
            </View>
            <View style={bd.searchRow}>
              <Ionicons name="search-outline" size={15} color="#C4A882" />
              <TextInput
                ref={searchRef}
                style={bd.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder="Search breed..."
                placeholderTextColor="#D4B8A8"
                returnKeyType="done"
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch("")}>
                  <Ionicons name="close-circle" size={15} color="#C4A882" />
                </TouchableOpacity>
              )}
            </View>
            <ScrollView
              style={{ maxHeight: 320 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {filtered.length === 0 ? (
                <TouchableOpacity
                  style={bd.customRow}
                  onPress={() => select(search)}
                >
                  <Ionicons
                    name="add-circle-outline"
                    size={18}
                    color="#BB6B3F"
                  />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={bd.customLabel}>Add "{search}"</Text>
                    <Text style={bd.customSub}>Custom breed</Text>
                  </View>
                </TouchableOpacity>
              ) : (
                filtered.map((b, i) => {
                  const selected = value === b.name;
                  return (
                    <TouchableOpacity
                      key={b.name}
                      onPress={() => select(b.name)}
                      style={[
                        bd.item,
                        selected && bd.itemSelected,
                        i === filtered.length - 1 && { borderBottomWidth: 0 },
                      ]}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          bd.emojiWrap,
                          selected && {
                            backgroundColor: "#FFF8F0",
                            borderColor: "#8B6854",
                          },
                        ]}
                      >
                        <Image
                          source={b.image}
                          style={{
                            width: 28,
                            height: 28,
                            resizeMode: "contain",
                          }}
                        />
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text
                          style={[
                            bd.breedName,
                            selected && { color: "#16a34a" },
                          ]}
                        >
                          {b.name}
                        </Text>
                        <Text style={bd.origin}>{b.origin}</Text>
                      </View>
                      {selected && (
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color="#BB6B3F"
                        />
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function Toggle({ label, value, onChange, color }: any) {
  return (
    <View style={f.toggleRow}>
      <View>
        <Text style={f.toggleLabel}>{label}</Text>
        <Text style={[f.toggleSub, { color: value ? color : "#C4A882" }]}>
          {value ? "Yes" : "No"}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: "#F5EDE5", true: color + "44" }}
        thumbColor={value ? color : "#D4B8A8"}
      />
    </View>
  );
}

function PurposeSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const options = [
    {
      key: "breeding",
      label: "Breeding",
      icon: "heart-outline",
      color: "#7c3aed",
    },
    { key: "dairy", label: "Dairy", icon: "water-outline", color: "#0891b2" },
    { key: "both", label: "Both", icon: "star-outline", color: "#d97706" },
  ];
  return (
    <View style={f.wrap}>
      <Text style={f.label}>Purpose</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {options.map((o) => (
          <TouchableOpacity
            key={o.key}
            onPress={() => onChange(o.key)}
            style={[
              f.purposeChip,
              value === o.key && {
                backgroundColor: o.color + "18",
                borderColor: o.color,
              },
            ]}
          >
            <Ionicons
              name={o.icon as any}
              size={13}
              color={value === o.key ? o.color : "#C4A882"}
            />
            <Text
              style={[f.purposeText, value === o.key && { color: o.color }]}
            >
              {o.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function TransferSection({
  form,
  setF,
}: {
  form: CowForm;
  setF: (k: keyof CowForm) => (v: any) => void;
}) {
  return (
    <View style={tr.wrap}>
      <View style={tr.toggleRow}>
        <View style={tr.toggleLeft}>
          <View style={tr.iconWrap}>
            <Ionicons
              name="swap-horizontal-outline"
              size={15}
              color="#7c3aed"
            />
          </View>
          <View>
            <Text style={tr.toggleLabel}>Mark as Transferred</Text>
            <Text
              style={[
                tr.toggleSub,
                { color: form.isTransferred ? "#7c3aed" : "#C4A882" },
              ]}
            >
              {form.isTransferred ? "Yes – transferred" : "No"}
            </Text>
          </View>
        </View>
        <Switch
          value={form.isTransferred}
          onValueChange={(v) => {
            setF("isTransferred")(v);
            if (!v) {
              setF("transferGaushalaName")("");
              setF("transferAddress")("");
              setF("transferDate")("");
            }
          }}
          trackColor={{ false: "#F5EDE5", true: "#7c3aed44" }}
          thumbColor={form.isTransferred ? "#7c3aed" : "#D4B8A8"}
        />
      </View>
      {form.isTransferred && (
        <View style={tr.fields}>
          <View style={tr.divider} />
          <Field
            label="Gaushala Name"
            value={form.transferGaushalaName}
            onChange={setF("transferGaushalaName")}
            placeholder="e.g. Shri Radha Gaushala"
            icon="home-outline"
          />
          <Field
            label="Address"
            value={form.transferAddress}
            onChange={setF("transferAddress")}
            placeholder="City, State"
            icon="location-outline"
          />
          <DateField
            label="Transfer Date"
            value={form.transferDate}
            onChange={setF("transferDate")}
            placeholder="DD/MM/YYYY"
          />
        </View>
      )}
    </View>
  );
}

function SoldSection({
  form,
  setF,
}: {
  form: CowForm;
  setF: (k: keyof CowForm) => (v: any) => void;
}) {
  return (
    <View style={sd.wrap}>
      <View style={sd.toggleRow}>
        <View style={sd.toggleLeft}>
          <View style={sd.iconWrap}>
            <Ionicons name="pricetag-outline" size={15} color="#ea580c" />
          </View>
          <View>
            <Text style={sd.toggleLabel}>Mark as Sold</Text>
            <Text
              style={[
                sd.toggleSub,
                { color: form.isSold ? "#ea580c" : "#C4A882" },
              ]}
            >
              {form.isSold ? "Yes – sold" : "No"}
            </Text>
          </View>
        </View>
        <Switch
          value={form.isSold}
          onValueChange={(v) => {
            setF("isSold")(v);
            if (!v) {
              setF("soldGaushalaName")("");
              setF("soldAddress")("");
              setF("soldDate")("");
              setF("soldPrice")("");
              setF("soldReason")("");
            }
          }}
          trackColor={{ false: "#F5EDE5", true: "#ea580c44" }}
          thumbColor={form.isSold ? "#ea580c" : "#D4B8A8"}
        />
      </View>
      {form.isSold && (
        <View style={sd.fields}>
          <View style={sd.divider} />
          <Field
            label="Gaushala / Buyer Name"
            value={form.soldGaushalaName}
            onChange={setF("soldGaushalaName")}
            placeholder="e.g. Ram Dairy Farm"
            icon="person-outline"
          />
          <Field
            label="Address"
            value={form.soldAddress}
            onChange={setF("soldAddress")}
            placeholder="City, State"
            icon="location-outline"
          />
          <DateField
            label="Sale Date"
            value={form.soldDate}
            onChange={setF("soldDate")}
            placeholder="DD/MM/YYYY"
          />
          <Field
            label="Sale Price (₹)"
            value={form.soldPrice}
            onChange={setF("soldPrice")}
            placeholder="e.g. 45000"
            icon="cash-outline"
            keyboardType="numeric"
          />
          <Field
            label="Reason for Selling"
            value={form.soldReason}
            onChange={setF("soldReason")}
            placeholder="e.g. Surplus cattle, low yield..."
            icon="document-text-outline"
            multiline
          />
        </View>
      )}
    </View>
  );
}

function ExpirySection({
  form,
  setF,
}: {
  form: CowForm;
  setF: (k: keyof CowForm) => (v: any) => void;
}) {
  return (
    <View style={ex.wrap}>
      <View style={ex.toggleRow}>
        <View style={ex.toggleLeft}>
          <View style={ex.iconWrap}>
            <Ionicons name="warning-outline" size={15} color="#dc2626" />
          </View>
          <View>
            <Text style={ex.toggleLabel}>Mark as Expired</Text>
            <Text
              style={[
                ex.toggleSub,
                { color: form.isExpired ? "#dc2626" : "#C4A882" },
              ]}
            >
              {form.isExpired ? "Yes – expired" : "No"}
            </Text>
          </View>
        </View>
        <Switch
          value={form.isExpired}
          onValueChange={(v) => {
            setF("isExpired")(v);
            if (!v) {
              setF("expiryDate")("");
              setF("expiryReason")("");
            }
          }}
          trackColor={{ false: "#F5EDE5", true: "#dc262644" }}
          thumbColor={form.isExpired ? "#dc2626" : "#D4B8A8"}
        />
      </View>
      {form.isExpired && (
        <View style={ex.fields}>
          <View style={ex.divider} />
          <DateField
            label="Expiry Date"
            value={form.expiryDate}
            onChange={setF("expiryDate")}
            placeholder="DD/MM/YYYY"
          />
          <Field
            label="Reason for Expiry"
            value={form.expiryReason}
            onChange={setF("expiryReason")}
            placeholder="e.g. Natural death, disease, injury..."
            icon="document-text-outline"
            multiline
          />
        </View>
      )}
    </View>
  );
}

function CowFormFields({
  form,
  setF,
  showTagField,
  cows,
}: {
  form: CowForm;
  setF: (k: keyof CowForm) => (v: any) => void;
  showTagField?: boolean;
  cows?: Cow[];
}) {
  const isBull = form.type === "bull";
  const isNewborn = form.type === "newborn";
  const motherOptions =
    cows?.filter((c) => c.type !== "bull" && !c.isSold && c.isActive) ?? [];

  return (
    <>
      {showTagField && (
        <Field
          label="Tag"
          value={form.tag}
          onChange={setF("tag")}
          placeholder="e.g. GS-009"
          icon="barcode-outline"
        />
      )}
      <Field
        label="Name"
        value={form.name}
        onChange={setF("name")}
        placeholder={isBull ? "e.g. Sultan" : "e.g. Kamdhenu"}
        icon="text-outline"
      />
      <BreedSelector value={form.breed} onChange={setF("breed")} />

      {isBull ? (
        <>
          <PurposeSelector value={form.purpose} onChange={setF("purpose")} />
          <Field
            label="Weight (kg)"
            value={form.weight}
            onChange={setF("weight")}
            placeholder="e.g. 600"
            icon="scale-outline"
            keyboardType="numeric"
          />
          <Field
            label="Size"
            value={form.size}
            onChange={setF("size")}
            placeholder="Large / Medium / Small"
            icon="resize-outline"
          />
          <Field
            label="Dam Yield (L/day)"
            value={form.damYield}
            onChange={setF("damYield")}
            placeholder="Mother's avg daily yield e.g. 18"
            icon="water-outline"
            keyboardType="decimal-pad"
          />
          <Field
            label="Total Semen Doses"
            value={form.totalDoses}
            onChange={setF("totalDoses")}
            placeholder="e.g. 50"
            icon="flask-outline"
            keyboardType="numeric"
          />
          <Field
            label="Success Rate (%)"
            value={form.successRate}
            onChange={setF("successRate")}
            placeholder="e.g. 78"
            icon="trending-up-outline"
            keyboardType="numeric"
          />
          <DateField
            label="Last Used Date"
            value={form.lastUsedDate}
            onChange={setF("lastUsedDate")}
            placeholder="DD/MM/YYYY"
          />
          <DateField
            label="Bought Date"
            value={form.boughtDate}
            onChange={setF("boughtDate")}
            placeholder="DD/MM/YYYY"
          />
          <View style={m.toggleCard}>
            <Toggle
              label="Semen Available"
              value={form.semenAvailable}
              onChange={setF("semenAvailable")}
              color="#FFBF55"
            />
            <View style={m.divider} />
            <Toggle
              label="Active Status"
              value={form.isActive}
              onChange={setF("isActive")}
              color="#BB6B3F"
            />
          </View>
        </>
      ) : (
        <>
          <Field
            label="Father (Bull)"
            value={form.father}
            onChange={setF("father")}
            placeholder="e.g. BULL-001"
            icon="male-outline"
          />
          {isNewborn && (
            <View style={f.wrap}>
              <Text style={f.label}>Mother (Dam)</Text>
              <View style={[f.row]}>
                <Ionicons
                  name="female-outline"
                  size={15}
                  color="#C4A882"
                  style={{ marginRight: 8 }}
                />
                <TextInput
                  style={f.input}
                  value={form.mother}
                  onChangeText={setF("mother")}
                  placeholder="Cow name or tag"
                  placeholderTextColor="#D4B8A8"
                />
              </View>
              {motherOptions.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginTop: 8 }}
                >
                  {motherOptions.map((cow) => (
                    <TouchableOpacity
                      key={cow.id}
                      onPress={() => setF("mother")(cow.name)}
                      style={[
                        f.motherChip,
                        form.mother === cow.name && f.motherChipActive,
                      ]}
                    >
                      <Image
                        source={cowImg}
                        style={{ width: 16, height: 16, resizeMode: "contain" }}
                      />
                      <Text
                        style={[
                          f.motherChipText,
                          form.mother === cow.name && { color: "#BB6B3F" },
                        ]}
                      >
                        {cow.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          )}
          <Field
            label="Weight (kg)"
            value={form.weight}
            onChange={setF("weight")}
            placeholder="e.g. 420"
            icon="scale-outline"
            keyboardType="numeric"
          />
          <Field
            label="Size"
            value={form.size}
            onChange={setF("size")}
            placeholder="Large / Medium / Small"
            icon="resize-outline"
          />
          {form.type === "mature" ? (
            <DateField
              label="Bought Date"
              value={form.boughtDate}
              onChange={setF("boughtDate")}
              placeholder="DD/MM/YYYY"
            />
          ) : (
            <DateField
              label="Born Date"
              value={form.bornDate}
              onChange={setF("bornDate")}
              placeholder="DD/MM/YYYY"
            />
          )}
          <View style={m.toggleCard}>
            <Toggle
              label="Active Status"
              value={form.isActive}
              onChange={setF("isActive")}
              color="#BB6B3F"
            />
            <View style={m.divider} />
            <Toggle
              label="Milk Recording"
              value={form.milkActive}
              onChange={setF("milkActive")}
              color="#8B6854"
            />
          </View>
        </>
      )}

      <TransferSection form={form} setF={setF} />
      <SoldSection form={form} setF={setF} />
      <ExpirySection form={form} setF={setF} />
      <View style={{ height: 12 }} />
    </>
  );
}

// ── AddCowModal 
function AddCowModal({
  visible,
  onClose,
  onAdd,
  cows,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (c: Cow) => void;
  cows: Cow[];
}) {
  const [step, setStep] = useState<"pick" | "form">("pick");
  const [form, setForm] = useState<CowForm>(EMPTY_FORM);
  const [submitting, setSub] = useState(false);
  const fade = useRef(new Animated.Value(0)).current;
  const setF = (k: keyof CowForm) => (v: any) =>
    setForm((p) => ({ ...p, [k]: v }));

  const pickType = (t: CowType) => {
    setForm((p) => ({ ...p, type: t }));
    setStep("form");
    Animated.timing(fade, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  const reset = () => {
    setStep("pick");
    setForm(EMPTY_FORM);
    fade.setValue(0);
    onClose();
  };

  const submit = async () => {
    if (!form.name.trim() || !form.breed.trim() || !form.tag.trim()) {
      Alert.alert("Missing Fields", "Please fill in Tag, Name, and Breed.");
      return;
    }
    setSub(true);
    try {
      const isBull = form.type === "bull";
      const payload: any = {
        tag: form.tag,
        name: form.name,
        breed: form.breed,
        weight: form.weight ? `${form.weight} kg` : undefined,
        father: !isBull && form.father ? form.father : undefined,
        mother:
          form.type === "newborn" && form.mother ? form.mother : undefined,
        size: form.size || undefined,
        isActive: form.isActive,
        isSold: form.isSold,
        type: form.type,
        milkActive: !isBull ? form.milkActive : undefined,
        activeSince: form.isActive ? getTodayStr() : undefined,
        isExpired: form.isExpired,
        expiryDate:
          form.isExpired && form.expiryDate ? form.expiryDate : undefined,
        expiryReason:
          form.isExpired && form.expiryReason ? form.expiryReason : undefined,
        isTransferred: form.isTransferred,
        transferGaushalaName:
          form.isTransferred && form.transferGaushalaName
            ? form.transferGaushalaName
            : undefined,
        transferAddress:
          form.isTransferred && form.transferAddress
            ? form.transferAddress
            : undefined,
        transferDate:
          form.isTransferred && form.transferDate
            ? form.transferDate
            : undefined,
        soldGaushalaName:
          form.isSold && form.soldGaushalaName
            ? form.soldGaushalaName
            : undefined,
        soldAddress:
          form.isSold && form.soldAddress ? form.soldAddress : undefined,
        soldDate: form.isSold && form.soldDate ? form.soldDate : undefined,
        soldPrice: form.isSold && form.soldPrice ? form.soldPrice : undefined,
        soldReason:
          form.isSold && form.soldReason ? form.soldReason : undefined,
        ...(isBull && {
          semenAvailable: form.semenAvailable,
          totalDoses: form.totalDoses ? parseInt(form.totalDoses) : undefined,
          successRate: form.successRate
            ? parseFloat(form.successRate)
            : undefined,
          lastUsedDate: form.lastUsedDate || undefined,
          purpose: form.purpose,
          boughtDate: form.boughtDate || undefined,
          damYield: form.damYield ? parseFloat(form.damYield) : undefined,
        }),
        ...(!isBull && {
          boughtDate:
            form.type === "mature" ? form.boughtDate || undefined : undefined,
          bornDate:
            form.type === "newborn" ? form.bornDate || undefined : undefined,
        }),
      };
      const created: Cow = await api.createCow(payload);
      onAdd(created);
      reset();
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Failed to register.");
    } finally {
      setSub(false);
    }
  };

  const TYPE_OPTIONS = [
    {
      key: "mature" as CowType,
      image: cowImg,
      title: "Mature Cow",
      sub: "Purchased / Adult",
      bg: "#FFF8F0",
      border: "#8B6854",
      titleColor: "#BB6B3F",
      pillColor: "#BB6B3F",
    },
    {
      key: "newborn" as CowType,
      image: calfImg,
      title: "New Born",
      sub: "Born on farm",
      bg: "#FFF5EE",
      border: "#FFC4A0",
      titleColor: "#8B6854",
      pillColor: "#8B6854",
    },
  ];

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
            {step === "pick" && (
              <View>
                <View style={m.header}>
                  <Text style={m.title}>Add Animal</Text>
                  <TouchableOpacity onPress={reset} style={m.closeBtn}>
                    <Ionicons name="close" size={18} color="#8B6854" />
                  </TouchableOpacity>
                </View>
                <Text style={m.sub}>Select the type to register</Text>
                <View style={m.typeRow}>
                  {TYPE_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.key}
                      onPress={() => pickType(opt.key)}
                      style={m.typeCard}
                    >
                      <View
                        style={[
                          m.typeInner,
                          { backgroundColor: opt.bg, borderColor: opt.border },
                        ]}
                      >
                        <Image
                          source={opt.image}
                          style={{
                            width: 50,
                            height: 50,
                            resizeMode: "contain",
                          }}
                        />
                        <Text style={[m.typeTitle, { color: opt.titleColor }]}>
                          {opt.title}
                        </Text>
                        <Text style={m.typeSub}>{opt.sub}</Text>
                        <View
                          style={[
                            m.typePill,
                            { backgroundColor: opt.pillColor },
                          ]}
                        >
                          <Text style={m.typePillText}>SELECT</Text>
                          <Ionicons
                            name="arrow-forward"
                            size={10}
                            color="#fff"
                          />
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity
                  onPress={() => pickType("bull")}
                  style={m.bullCard}
                >
                  <View style={m.bullInner}>
                    <Image
                      source={bullImg}
                      style={{ width: 45, height: 45, resizeMode: "contain" }}
                    />
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <Text style={m.bullTitle}>Bull</Text>
                      <Text style={m.bullSub}>
                        Register a stud / breeding bull with semen details
                      </Text>
                    </View>
                    <View style={[m.typePill, { backgroundColor: "#8B6854" }]}>
                      <Text style={m.typePillText}>SELECT</Text>
                      <Ionicons name="arrow-forward" size={10} color="#fff" />
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            )}
            {step === "form" && (
              <Animated.View style={{ opacity: fade }}>
                <View style={m.header}>
                  <TouchableOpacity
                    onPress={() => {
                      setStep("pick");
                      fade.setValue(0);
                    }}
                    style={m.backBtn}
                  >
                    <Ionicons name="arrow-back" size={16} color="#8B6854" />
                  </TouchableOpacity>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      flex: 1,
                      marginLeft: 10,
                    }}
                  >
                    <Image
                      source={
                        form.type === "bull"
                          ? bullImg
                          : form.type === "newborn"
                            ? calfImg
                            : cowImg
                      }
                      style={{
                        width: 50,
                        height: 50,
                        resizeMode: "contain",
                        marginRight: 6,
                      }}
                    />
                    <Text style={m.title}>
                      {form.type === "mature"
                        ? "Mature Cow"
                        : form.type === "newborn"
                          ? "New Born Calf"
                          : "Bull"}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={reset} style={m.closeBtn}>
                    <Ionicons name="close" size={18} color="#8B6854" />
                  </TouchableOpacity>
                </View>
                <Text style={m.sub}>Fill in the details below</Text>
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  style={{ maxHeight: 400 }}
                >
                  <CowFormFields
                    form={form}
                    setF={setF}
                    showTagField
                    cows={cows}
                  />
                </ScrollView>
                <TouchableOpacity
                  onPress={submit}
                  style={[
                    m.submitBtn,
                    form.type === "bull" && { backgroundColor: "#f3dbbc" },
                    form.type === "newborn" && { backgroundColor: "#f3dbbc" },
                    submitting && { opacity: 0.7 },
                  ]}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#baf1b2" size="small" />
                  ) : (
                    <>
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={18}
                        color="#f59696"
                      />
                      <Text style={m.submitText}>
                        {form.type === "bull"
                          ? "Register Bull"
                          : form.type === "newborn"
                            ? "Register Calf"
                            : "Register Cow"}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </Animated.View>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ── EditCowModal 
function EditCowModal({
  cow,
  visible,
  onClose,
  onSaved,
  cows,
}: {
  cow: Cow | null;
  visible: boolean;
  onClose: () => void;
  onSaved: (updated: Cow) => void;
  cows: Cow[];
}) {
  const [form, setForm] = useState<CowForm>(EMPTY_FORM);
  const [submitting, setSub] = useState(false);
  const originalIsActive = useRef<boolean>(false);
  const originalActiveSince = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (cow) {
      originalIsActive.current = cow.isActive;
      originalActiveSince.current = cow.activeSince;
      setForm({
        tag: cow.tag,
        name: cow.name,
        breed: cow.breed,
        weight: cow.weight?.replace(" kg", "") ?? "",
        size: cow.size ?? "",
        father: cow.father ?? "",
        mother: cow.mother ?? "",
        boughtDate: cow.boughtDate ?? "",
        bornDate: cow.bornDate ?? "",
        isActive: cow.isActive,
        isSold: cow.isSold,
        type: cow.type,
        milkActive: cow.milkActive ?? false,
        semenAvailable: cow.semenAvailable ?? false,
        totalDoses: cow.totalDoses?.toString() ?? "",
        lastUsedDate: cow.lastUsedDate ?? "",
        successRate: cow.successRate?.toString() ?? "",
        purpose: cow.purpose ?? "breeding",
        damYield: cow.damYield?.toString() ?? "",
        isExpired: cow.isExpired ?? false,
        expiryDate: cow.expiryDate ?? "",
        expiryReason: cow.expiryReason ?? "",
        isTransferred: cow.isTransferred ?? false,
        transferGaushalaName: cow.transferGaushalaName ?? "",
        transferAddress: cow.transferAddress ?? "",
        transferDate: cow.transferDate ?? "",
        soldGaushalaName: cow.soldGaushalaName ?? "",
        soldAddress: cow.soldAddress ?? "",
        soldDate: cow.soldDate ?? "",
        soldPrice: cow.soldPrice ?? "",
        soldReason: cow.soldReason ?? "",
      });
    }
  }, [cow]);

  const setF = (k: keyof CowForm) => (v: any) =>
    setForm((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!cow) return;
    if (!form.name.trim() || !form.breed.trim()) {
      Alert.alert("Missing Fields", "Name and Breed are required.");
      return;
    }
    setSub(true);
    try {
      const isBull = form.type === "bull";
      let activeSince: string | undefined | null = originalActiveSince.current;
      if (!originalIsActive.current && form.isActive)
        activeSince = getTodayStr();
      else if (originalIsActive.current && !form.isActive) activeSince = null;

      const payload: any = {
        tag: form.tag,
        name: form.name,
        breed: form.breed,
        weight: form.weight ? `${form.weight} kg` : undefined,
        father: !isBull && form.father ? form.father : undefined,
        mother:
          form.type === "newborn" && form.mother ? form.mother : undefined,
        size: form.size || undefined,
        isActive: form.isActive,
        isSold: form.isSold,
        type: form.type,
        activeSince: activeSince ?? undefined,
        milkActive: !isBull ? form.milkActive : undefined,
        isExpired: form.isExpired,
        expiryDate:
          form.isExpired && form.expiryDate ? form.expiryDate : undefined,
        expiryReason:
          form.isExpired && form.expiryReason ? form.expiryReason : undefined,
        isTransferred: form.isTransferred,
        transferGaushalaName:
          form.isTransferred && form.transferGaushalaName
            ? form.transferGaushalaName
            : undefined,
        transferAddress:
          form.isTransferred && form.transferAddress
            ? form.transferAddress
            : undefined,
        transferDate:
          form.isTransferred && form.transferDate
            ? form.transferDate
            : undefined,
        soldGaushalaName:
          form.isSold && form.soldGaushalaName
            ? form.soldGaushalaName
            : undefined,
        soldAddress:
          form.isSold && form.soldAddress ? form.soldAddress : undefined,
        soldDate: form.isSold && form.soldDate ? form.soldDate : undefined,
        soldPrice: form.isSold && form.soldPrice ? form.soldPrice : undefined,
        soldReason:
          form.isSold && form.soldReason ? form.soldReason : undefined,
        ...(isBull && {
          semenAvailable: form.semenAvailable,
          totalDoses: form.totalDoses ? parseInt(form.totalDoses) : undefined,
          successRate: form.successRate
            ? parseFloat(form.successRate)
            : undefined,
          lastUsedDate: form.lastUsedDate || undefined,
          purpose: form.purpose,
          boughtDate: form.boughtDate || undefined,
          damYield: form.damYield ? parseFloat(form.damYield) : undefined,
        }),
        ...(!isBull && {
          boughtDate:
            form.type === "mature" ? form.boughtDate || undefined : undefined,
          bornDate:
            form.type === "newborn" ? form.bornDate || undefined : undefined,
        }),
      };
      const updated: Cow = await api.updateCow(cow.id, payload);
      onSaved(updated);
      onClose();
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Failed to update.");
    } finally {
      setSub(false);
    }
  };

  const isBull = cow?.type === "bull";
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
              <View style={[m.editIconWrap, isBull && { backgroundColor: "#f5f3ff" }]}>
                <Ionicons
                  name="create-outline"
                  size={16}
                  color={isBull ? "#FFBF55" : "#BB6B3F"}
                />
              </View>
              <Text style={[m.title, { marginLeft: 10, flex: 1 }]}>
                Edit {isBull ? "Bull" : "Cow"}
              </Text>
              <TouchableOpacity onPress={onClose} style={m.closeBtn}>
                <Ionicons name="close" size={18} color="#8B6854" />
              </TouchableOpacity>
            </View>
            <Text style={m.sub}>Update the details below</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <CowFormFields form={form} setF={setF} showTagField cows={cows} />
            </ScrollView>
            <TouchableOpacity
              onPress={submit}
              style={[
                m.submitBtn,
                isBull ? { backgroundColor: "#8B6854" } : m.submitBtnTerra,
                submitting && { opacity: 0.7 },
              ]}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="save-outline" size={18} color="#fff" />
                  <Text style={m.submitText}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>
          </View >
        </KeyboardAvoidingView >
      </View >
    </Modal >
  );
}

// ── QRModal 
function QRModal({
  visible,
  onClose,
  cow,
}: {
  visible: boolean;
  onClose: () => void;
  cow: Cow | null;
}) {
  if (!cow) return null;
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={qr.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={qr.card}>
          <View style={qr.header}>
            <Image
              source={getAnimalImage(cow.type)}
              style={{ width: 44, height: 44, resizeMode: "contain" }}
            />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={qr.name}>{cow.name}</Text>
              <Text style={qr.tag}>TAG: {cow.tag}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={qr.closeBtn}>
              <Ionicons name="close" size={16} color="#8B6854" />
            </TouchableOpacity>
          </View>
          <View style={qr.qrWrap}>
            {cow.qrCode ? (
              <Image
                source={{ uri: cow.qrCode }}
                style={qr.qrImage}
                resizeMode="contain"
              />
            ) : (
              <View style={qr.qrPlaceholder}>
                <Ionicons name="qr-code-outline" size={48} color="#D4B8A8" />
              </View>
            )}
          </View>
          <Text style={qr.hint}>Scan to identify this animal</Text>
          <TouchableOpacity onPress={onClose} style={qr.doneBtn}>
            <Text style={qr.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

function DetailItem({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <View style={c.detailItem}>
      <Ionicons name={icon as any} size={13} color="#C4A882" />
      <Text style={c.detailLabel}>{label}</Text>
      <Text style={c.detailValue}>{value}</Text>
    </View>
  );
}

// ── Insurance helpers 
function getInsuranceColors(status: string) {
  if (status === "expired")
    return {
      bg: "#fff1f2",
      border: "#fecdd3",
      color: "#dc2626",
      icon: "shield-outline" as const,
    };
  if (status === "expiring")
    return {
      bg: "#fffbeb",
      border: "#fde68a",
      color: "#d97706",
      icon: "shield-half-outline" as const,
    };
  return {
    bg: "#f0fdf4",
    border: "#bbf7d0",
    color: "#16a34a",
    icon: "shield-checkmark" as const,
  };
}

// ── CowCard 
function CowCard({
  item,
  index,
  onEdit,
  onDelete,
  onUpdate,
}: {
  item: Cow;
  index: number;
  onEdit: (cow: Cow) => void;
  onDelete: (cow: Cow) => void;
  onUpdate: (cow: Cow) => void;
}) {
  const router = useRouter();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;
  const [expanded, setExpanded] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrVisible, setQrVisible] = useState(false);

  // ── Insurance state 
  const [insurance, setInsurance] = useState<Insurance | null | undefined>(
    undefined,
  );
  const [insuranceLoading, setInsuranceLoading] = useState(false);
  const insuranceFetched = useRef(false);

  const st = STATUS[derivedStatus(item)];
  const isBull = item.type === "bull";
  const activeDays = getActiveDays(item.activeSince);

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

  // Fetch insurance when card is first expanded
  useEffect(() => {
    if (expanded && !insuranceFetched.current) {
      insuranceFetched.current = true;
      setInsuranceLoading(true);
      api
        .getCowInsurance(item.id)
        .then((ins) => setInsurance(ins ?? null))
        .catch(() => setInsurance(null))
        .finally(() => setInsuranceLoading(false));
    }
  }, [expanded]);

  const handleQR = async () => {
    if (item.qrCode) {
      setQrVisible(true);
      return;
    }
    setQrLoading(true);
    try {
      const updated: Cow = await api.generateCowQR(item.id);
      onUpdate(updated);
      setTimeout(() => setQrVisible(true), 100);
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Failed to generate QR.");
    } finally {
      setQrLoading(false);
    }
  };

  const navigateToInsurance = () => {
    router.push({
      pathname: "/(admin)/gausevak/insurance",
      params: {
        cowId: String(item.id),
        cowTag: item.tag,
        cowName: item.name,
      },
    } as any);
  };

  // Determine the insurance badge shown in collapsed header
  const insuranceBadgeColor = insurance
    ? getInsuranceColors(insurance.status).color
    : insurance === null
      ? "#d97706"
      : undefined;

  return (
    <Animated.View
      style={[
        c.card,
        { opacity, transform: [{ translateY }] },
        isBull && c.bullCard,
      ]}
    >
      <TouchableOpacity
        onPress={() => setExpanded((e) => !e)}
        activeOpacity={0.8}
      >
        <View style={c.topRow}>
          <View style={[c.avatarWrap, isBull && { backgroundColor: "#f5f3ff", borderColor: "#ddd6fe" }]}>
            <Image source={getAnimalImage(item.type)} style={{ width: 40, height: 40, resizeMode: "contain" }} />
          </View>
          <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
            <View style={c.nameRow}>
              <Text style={c.name} numberOfLines={1}>{item.name}</Text>
              <View style={c.badgeGroup}>
                <View style={[c.badge, { backgroundColor: st.bg, borderColor: st.border }]}>
                  <View style={[c.dot, { backgroundColor: st.color }]} />
                  <Text style={[c.badgeText, { color: st.color }]}>{st.label}</Text>
                </View>
                {item.pregnancyStatus === "pregnant" && (
                  <View style={[c.badge, { backgroundColor: "#fdf4ff", borderColor: "#e9d5ff" }]}>
                    <Text style={{ fontSize: 9 }}>🤰</Text>
                    <Text style={[c.badgeText, { color: "#9333ea" }]}>Pregnant</Text>
                  </View>
                )}
                {isBull && item.semenAvailable && (
                  <View style={[c.badge, { backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" }]}>
                    <Ionicons name="flask" size={9} color="#16a34a" />
                    <Text style={[c.badgeText, { color: "#16a34a" }]}>Semen ✓</Text>
                  </View>
                )}
                {item.isTransferred && (
                  <View
                    style={[
                      c.badge,
                      { backgroundColor: "#fdf4ff", borderColor: "#e9d5ff" },
                    ]}
                  >
                    <Ionicons name="swap-horizontal" size={9} color="#7c3aed" />
                    <Text style={[c.badgeText, { color: "#7c3aed" }]}>
                      Transferred
                    </Text>
                  </View>
                )}
                {/* Insurance badge in header */}
                {insurance !== undefined && insurance !== null && (
                  <View
                    style={[
                      c.badge,
                      {
                        backgroundColor: getInsuranceColors(insurance.status)
                          .bg,
                        borderColor: getInsuranceColors(insurance.status)
                          .border,
                      },
                    ]}
                  >
                    <Ionicons
                      name={getInsuranceColors(insurance.status).icon}
                      size={9}
                      color={getInsuranceColors(insurance.status).color}
                    />
                    <Text
                      style={[
                        c.badgeText,
                        { color: getInsuranceColors(insurance.status).color },
                      ]}
                    >
                      {insurance.status === "expiring"
                        ? "Exp Soon"
                        : insurance.status === "expired"
                          ? "Ins Exp"
                          : "Insured"}
                    </Text>
                  </View>
                )}
                {insurance === null && (
                  <View
                    style={[
                      c.badge,
                      { backgroundColor: "#fffbeb", borderColor: "#fde68a" },
                    ]}
                  >
                    <Ionicons name="shield-outline" size={9} color="#d97706" />
                    <Text style={[c.badgeText, { color: "#d97706" }]}>
                      Uninsured
                    </Text>
                  </View>
                )}
              </View>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <Text style={c.tag}>
                {item.tag} · {item.breed} ·{" "}
                {isBull ? "Bull" : item.type === "newborn" ? "Newborn" : "Adult"}
              </Text>
              {item.isActive && activeDays !== null && (
                <View style={c.miniDaysBadge}>
                  <Ionicons name="time-outline" size={9} color="#BB6B3F" />
                  <Text style={c.miniDaysText}>{activeDays}d active</Text>
                </View>
              )}
            </View>
          </View>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={16}
            color="#C4A882"
            style={{ marginLeft: 8 }}
          />
        </View >
      </TouchableOpacity >

      {expanded && (
        <>
          <View style={c.divider} />

          {/* Transfer info banner */}
          {item.isTransferred && (
            <View
              style={[
                c.infoBanner,
                { backgroundColor: "#fdf4ff", borderColor: "#e9d5ff" },
              ]}
            >
              <Ionicons name="swap-horizontal" size={14} color="#7c3aed" />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={[c.infoBannerTitle, { color: "#7c3aed" }]}>
                  Transferred
                </Text>
                {item.transferGaushalaName ? (
                  <Text style={[c.infoBannerSub, { color: "#7c3aed" }]}>
                    To: {item.transferGaushalaName}
                  </Text>
                ) : null}
                {item.transferAddress ? (
                  <Text style={[c.infoBannerSub, { color: "#7c3aed" }]}>
                    Address: {item.transferAddress}
                  </Text>
                ) : null}
                {item.transferDate ? (
                  <Text style={[c.infoBannerSub, { color: "#7c3aed" }]}>
                    Date: {item.transferDate}
                  </Text>
                ) : null}
              </View>
            </View>
          )}

          {/* Sold info banner */}
          {item.isSold &&
            (item.soldGaushalaName || item.soldDate || item.soldPrice) && (
              <View
                style={[
                  c.infoBanner,
                  { backgroundColor: "#fff7ed", borderColor: "#fed7aa" },
                ]}
              >
                <Ionicons name="pricetag" size={14} color="#ea580c" />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={[c.infoBannerTitle, { color: "#ea580c" }]}>
                    Sold
                  </Text>
                  {item.soldGaushalaName ? (
                    <Text style={[c.infoBannerSub, { color: "#ea580c" }]}>
                      To: {item.soldGaushalaName}
                    </Text>
                  ) : null}
                  {item.soldAddress ? (
                    <Text style={[c.infoBannerSub, { color: "#ea580c" }]}>
                      Address: {item.soldAddress}
                    </Text>
                  ) : null}
                  {item.soldDate ? (
                    <Text style={[c.infoBannerSub, { color: "#ea580c" }]}>
                      Date: {item.soldDate}
                    </Text>
                  ) : null}
                  {item.soldPrice ? (
                    <Text style={[c.infoBannerSub, { color: "#ea580c" }]}>
                      Price: ₹{item.soldPrice}
                    </Text>
                  ) : null}
                  {item.soldReason ? (
                    <Text style={[c.infoBannerSub, { color: "#ea580c" }]}>
                      Reason: {item.soldReason}
                    </Text>
                  ) : null}
                </View>
              </View>
            )}

          {isBull ? (
            <>
              <View style={c.bullStatsRow}>
                <View style={c.bullStat}>
                  <Text style={c.bullStatVal}>{item.totalDoses ?? "—"}</Text>
                  <Text style={c.bullStatLabel}>Doses</Text>
                </View>
                <View style={c.bullStatDivider} />
                <View style={c.bullStat}>
                  <Text style={c.bullStatVal}>
                    {item.successRate != null ? `${item.successRate}%` : "—"}
                  </Text>
                  <Text style={c.bullStatLabel}>Success Rate</Text>
                </View>
                <View style={c.bullStatDivider} />
                <View style={c.bullStat}>
                  <Text style={c.bullStatVal}>{item.purpose ?? "—"}</Text>
                  <Text style={c.bullStatLabel}>Purpose</Text>
                </View>
              </View>
              <View style={c.grid}>
                <DetailItem icon="scale-outline" label="Weight" value={item.weight || "—"} />
                <DetailItem icon="resize-outline" label="Size" value={item.size || "—"} />
                <DetailItem icon="calendar-outline" label="Bought" value={item.boughtDate || "—"} />
                <DetailItem icon="time-outline" label="Last Used" value={item.lastUsedDate || "—"} />
                {item.damYield != null && (
                  <DetailItem icon="water-outline" label="Dam Yield" value={`${item.damYield} L/day`} />
                )}
              </View>
            </>
          ) : (
            <View style={c.grid}>
              <DetailItem
                icon="scale-outline"
                label="Weight"
                value={item.weight || "—"}
              />
              <DetailItem
                icon="male-outline"
                label="Father"
                value={item.father || "—"}
              />
              {item.type === "newborn" && (
                <DetailItem
                  icon="female-outline"
                  label="Mother"
                  value={(item as any).mother || "—"}
                />
              )}
              <DetailItem
                icon="resize-outline"
                label="Size"
                value={item.size || "—"}
              />
              <DetailItem
                icon="calendar-outline"
                label={item.type === "newborn" ? "Born" : "Bought"}
                value={item.bornDate || item.boughtDate || "—"}
              />
            </View>
          )}

          {item.isExpired && (
            <View
              style={[
                c.infoBanner,
                { backgroundColor: "#fff1f2", borderColor: "#fecdd3" },
              ]}
            >
              <Ionicons name="warning" size={14} color="#dc2626" />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={[c.infoBannerTitle, { color: "#dc2626" }]}>
                  Expired
                </Text>
                {item.expiryDate ? (
                  <Text style={[c.infoBannerSub, { color: "#dc2626" }]}>
                    Date: {item.expiryDate}
                  </Text>
                ) : null}
                {item.expiryReason ? (
                  <Text style={[c.infoBannerSub, { color: "#dc2626" }]}>
                    Reason: {item.expiryReason}
                  </Text>
                ) : null}
              </View>
            </View>
          )}

          {/* ── Insurance Section*/}
          <View style={ins.sectionHeader}>
            <View style={ins.sectionTitleRow}>
              <Ionicons name="shield-outline" size={13} color="#8B6854" />
              <Text style={ins.sectionTitle}>Insurance</Text>
            </View>
          </View>

          {insuranceLoading && (
            <View style={ins.loadingRow}>
              <ActivityIndicator size="small" color="#16a34a" />
              <Text style={ins.loadingText}>Checking insurance...</Text>
            </View>
          )}

          {!insuranceLoading && insurance && (
            <View
              style={[
                ins.infoBanner,
                {
                  backgroundColor: getInsuranceColors(insurance.status).bg,
                  borderColor: getInsuranceColors(insurance.status).border,
                },
              ]}
            >
              <View
                style={[
                  ins.shieldIconWrap,
                  {
                    backgroundColor:
                      getInsuranceColors(insurance.status).color + "20",
                  },
                ]}
              >
                <Ionicons
                  name={getInsuranceColors(insurance.status).icon}
                  size={18}
                  color={getInsuranceColors(insurance.status).color}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Text
                    style={[
                      ins.insCompany,
                      { color: getInsuranceColors(insurance.status).color },
                    ]}
                  >
                    {insurance.company}
                  </Text>
                  <View
                    style={[
                      ins.statusPill,
                      {
                        backgroundColor:
                          getInsuranceColors(insurance.status).color + "20",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        ins.statusPillText,
                        { color: getInsuranceColors(insurance.status).color },
                      ]}
                    >
                      {insurance.status === "expiring"
                        ? "Expiring Soon"
                        : insurance.status === "expired"
                          ? "Expired"
                          : "Active"}
                    </Text>
                  </View>
                </View>
                <Text style={ins.policyNo}>
                  Policy: {insurance.policy_number}
                </Text>
                <View style={ins.insDetailsRow}>
                  <View style={ins.insDetailItem}>
                    <Ionicons name="cash-outline" size={11} color="#6b7280" />
                    <Text style={ins.insDetailText}>
                      ₹{insurance.sum_insured?.toLocaleString("en-IN")}
                    </Text>
                  </View>
                  <View style={ins.insDetailItem}>
                    <Ionicons
                      name="calendar-outline"
                      size={11}
                      color="#6b7280"
                    />
                    <Text style={ins.insDetailText}>
                      Exp: {insurance.expiry_date}
                    </Text>
                  </View>
                  {insurance.days_to_expiry != null && (
                    <View style={ins.insDetailItem}>
                      <Ionicons
                        name="time-outline"
                        size={11}
                        color={getInsuranceColors(insurance.status).color}
                      />
                      <Text
                        style={[
                          ins.insDetailText,
                          {
                            color: getInsuranceColors(insurance.status).color,
                            fontWeight: "700",
                          },
                        ]}
                      >
                        {insurance.days_to_expiry}d left
                      </Text>
                    </View>
                  )}
                </View>
                {insurance.claim_filed && (
                  <View style={ins.claimRow}>
                    <Ionicons
                      name="document-text-outline"
                      size={10}
                      color="#7c3aed"
                    />
                    <Text style={ins.claimText}>
                      Claim {insurance.claim_status ?? "filed"}
                    </Text>
                  </View>
                )}
                <TouchableOpacity
                  style={ins.editInsBtn}
                  onPress={navigateToInsurance}
                  activeOpacity={0.8}
                >
                  <Ionicons name="create-outline" size={12} color="#fff" />
                  <Text style={ins.editInsBtnText}>Manage Insurance</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {!insuranceLoading && insurance === null && (
            <TouchableOpacity
              style={ins.addInsuranceBtn}
              onPress={navigateToInsurance}
              activeOpacity={0.85}
            >
              <View style={ins.addInsuranceBtnLeft}>
                <View style={ins.addInsuranceIcon}>
                  <Ionicons name="shield-outline" size={16} color="#16a34a" />
                </View>
                <View>
                  <Text style={ins.addInsuranceBtnTitle}>
                    No Insurance Found
                  </Text>
                  <Text style={ins.addInsuranceBtnSub}>
                    Tap to add insurance coverage
                  </Text>
                </View>
              </View>
              <View style={ins.addInsuranceArrow}>
                <Ionicons name="arrow-forward" size={14} color="#16a34a" />
              </View>
            </TouchableOpacity>
          )}
          {/* ── End Insurance Section ───────────────────────── */}

          <View style={c.actionRow}>
            <TouchableOpacity style={[c.actionBtn, c.editBtn]} onPress={() => onEdit(item)} activeOpacity={0.8}>
              <Ionicons name="create-outline" size={15} color="#2563eb" />
              <Text style={[c.actionText, { color: "#2563eb" }]}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[c.actionBtn, c.qrBtn]} onPress={handleQR} activeOpacity={0.8} disabled={qrLoading}>
              {qrLoading ? (
                <ActivityIndicator size="small" color="#FFBF55" />
              ) : (
                <>
                  <Ionicons name={item.qrCode ? "qr-code" : "qr-code-outline"} size={15} color="#7c3aed" />
                  <Text style={[c.actionText, { color: "#7c3aed" }]}>
                    {item.qrCode ? "View QR" : "Gen QR"}
                  </Text>
                </>
              )
              }
            </TouchableOpacity >
            <TouchableOpacity style={[c.actionBtn, c.deleteBtn]} onPress={() => onDelete(item)} activeOpacity={0.8}>
              <Ionicons name="trash-outline" size={15} color="#dc2626" />
              <Text style={[c.actionText, { color: "#dc2626" }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
      <QRModal visible={qrVisible} onClose={() => setQrVisible(false)} cow={item} />
    </Animated.View >
  );
}

// ── Main Screen 
export default function CowsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [cows, setCows] = useState<Cow[]>([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<
    "all" | "mature" | "newborn" | "bull"
  >("all");
  const [addVisible, setAddVisible] = useState(false);
  const [editCow, setEditCow] = useState<Cow | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCows = useCallback(async (searchTerm?: string) => {
    setLoading(true);
    setError(null);
    try {
      const [cowsData, inseminations] = await Promise.all([
        api.getCows(searchTerm),
        api.getInseminations().catch(() => []),
      ]);
      const pregnancyMap: Record<string, boolean> = {};
      for (const ins of inseminations) {
        const tag = ins.cowSrNo;
        if (!(tag in pregnancyMap)) pregnancyMap[tag] = ins.pregnancyStatus;
        else if (ins.pregnancyStatus === true) pregnancyMap[tag] = true;
      }
      const enriched: Cow[] = cowsData.map((cow: Cow) => ({
        ...cow,
        pregnancyStatus:
          cow.tag in pregnancyMap
            ? pregnancyMap[cow.tag]
              ? "pregnant"
              : "not_pregnant"
            : "unknown",
      }));
      setCows(enriched);
    } catch (err: any) {
      setError(err.message ?? "Failed to load cows.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCows();
  }, [fetchCows]);
  useEffect(() => {
    const t = setTimeout(() => fetchCows(search || undefined), 400);
    return () => clearTimeout(t);
  }, [search]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCows(search || undefined);
    setRefreshing(false);
  };

  const handleDelete = (cow: Cow) => {
    Alert.alert(
      `Delete ${cow.type === "bull" ? "Bull" : "Cow"}`,
      `Are you sure you want to delete ${cow.name} (${cow.tag})?\nThis cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.deleteCow(cow.id);
              setCows((prev) => prev.filter((c) => c.id !== cow.id));
            } catch (err: any) {
              Alert.alert("Error", err.message ?? "Failed to delete.");
            }
          },
        },
      ],
    );
  };

  const bulls = cows.filter((c) => c.type === "bull");
  const nonBulls = cows.filter((c) => c.type !== "bull");
  const stats = {
    total: cows.length,
    active: nonBulls.filter((c) => c.isActive && !c.isSold).length,
    bulls: bulls.length,
    newborns: cows.filter((c) => c.type === "newborn").length,
    sold: cows.filter((c) => c.isSold).length,
  };

  const filteredCows = cows
    .filter((c) => filterType === "all" || c.type === filterType)
    .filter(
      (c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.tag.toLowerCase().includes(search.toLowerCase()) ||
        c.breed.toLowerCase().includes(search.toLowerCase()),
    );

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#8B6854" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.headerTitle}>Cattle</Text>
          <Text style={s.headerSub}>{cows.length} animals registered</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={s.countBadge}>
            <Text style={s.countText}>{filteredCows.length}</Text>
          </View>
          <TouchableOpacity
            style={s.headerAddBtn}
            onPress={() => setAddVisible(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={27} color="#184d20" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats */}
      <View style={s.statsRow}>
        {[
          { label: "Total", value: stats.total, color: "#8B6854" },
          { label: "Active", value: stats.active, color: "#BB6B3F" },
          { label: "Bulls", value: stats.bulls, color: "#FFBF55" },
          { label: "Newborns", value: stats.newborns, color: "#8B6854" },
          { label: "Sold", value: stats.sold, color: "#FF9675" },
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

      {/* Search */}
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={16} color="#C4A882" />
        <TextInput
          style={s.searchInput}
          placeholder="Search name, tag, breed..."
          placeholderTextColor="#D4B8A8"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={16} color="#C4A882" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter chips */}
      <View style={s.filterCard}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 12,
            gap: 8,
            paddingVertical: 2,
          }}
        >
          {(["all", "mature", "newborn", "bull"] as const).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setFilterType(t)}
              style={[s.filterChip, filterType === t && s.filterChipActive]}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Image
                  source={
                    t === "bull" ? bullImg : t === "newborn" ? calfImg : cowImg
                  }
                  style={{ width: 20, height: 20, resizeMode: "contain" }}
                />
                <Text
                  style={[
                    s.filterChipText,
                    filterType === t && s.filterChipTextActive,
                  ]}
                >
                  {t === "all"
                    ? "All"
                    : t === "mature"
                      ? "Cows"
                      : t === "newborn"
                        ? "Calves"
                        : "Bulls"}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* List */}
      {loading && cows.length === 0 ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color="#FFBF55" />
          <Text style={s.loadingText}>Loading animals...</Text>
        </View>
      ) : error ? (
        <View style={s.errorWrap}>
          <Text style={{ fontSize: 40 }}>⚠️</Text>
          <Text style={s.errorText}>{error}</Text>
          <TouchableOpacity
            onPress={() => fetchCows(search || undefined)}
            style={s.retryBtn}
          >
            <Ionicons name="refresh" size={14} color="#fff" />
            <Text style={s.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredCows}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: 120,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#BB6B3F"
            />
          }
          renderItem={({ item, index }) => (
            <CowCard
              item={item}
              index={index}
              onEdit={(cow) => setEditCow(cow)}
              onDelete={handleDelete}
              onUpdate={(updated) =>
                setCows((prev) =>
                  prev.map((c) => (c.id === updated.id ? updated : c)),
                )
              }
            />
          )}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={{ fontSize: 48 }}>
                {filterType === "bull"
                  ? "🐂"
                  : filterType === "newborn"
                    ? "🐮"
                    : "🐄"}
              </Text>
              <Text style={s.emptyText}>
                No{" "}
                {filterType === "all"
                  ? "animals"
                  : filterType === "bull"
                    ? "bulls"
                    : filterType === "newborn"
                      ? "calves"
                      : "cows"}{" "}
                found
              </Text>
            </View>
          }
        />
      )}

      {/* Floating Add Button 
      <TouchableOpacity
        style={s.fab}
        onPress={() => setAddVisible(true)}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity> */}

      <AddCowModal
        visible={addVisible}
        onClose={() => setAddVisible(false)}
        onAdd={(cow) => setCows((prev) => [cow, ...prev])}
        cows={cows}
      />
      <EditCowModal
        cow={editCow}
        visible={!!editCow}
        onClose={() => setEditCow(null)}
        onSaved={(updated) =>
          setCows((prev) =>
            prev.map((c) => (c.id === updated.id ? updated : c)),
          )
        }
        cows={cows}
      />
    </View>
  );
}

// ── Styles 

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F5EDE5",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFF8F0",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#f0ba9b",
  },
  headerAddBtn: {
    width: 40,
    height: 40,
    borderRadius: 18,
    backgroundColor: "#81df8f",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#185810",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#020201",
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 12,
    color: "#fcad80",
    fontWeight: "500",
    marginTop: 1,
  },
  countBadge: {
    backgroundColor: "#FFF8F0",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#f0ba9b",
  },
  countText: { fontSize: 12, fontWeight: "700", color: "#BB6B3F" },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F5EDE5",
  },
  statItem: { flex: 1, alignItems: "center", paddingVertical: 10 },
  statBorder: { borderRightWidth: 1, borderRightColor: "#F5EDE5" },
  statValue: { fontSize: 16, fontWeight: "800", letterSpacing: -0.3 },
  statLabel: { fontSize: 9, color: "#C4A882", marginTop: 2, fontWeight: "500" },
  filterRow: { maxHeight: 44, marginTop: 4 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#FFF8F0",
    borderWidth: 1,
    borderColor: "#F5EDE5",
    overflow: "hidden",
  },
  filterChipActive: { backgroundColor: "#8B6854", borderColor: "#8B6854" },
  filterChipText: { fontSize: 12, color: "#8B6854", fontWeight: "600" },
  filterChipTextActive: { color: "#fff" },

  filterCard: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    backgroundColor: "#FFF8F0",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F5EDE5",
    paddingVertical: 8,
    shadowColor: "#BB6B3F",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    margin: 16,
    marginBottom: 4,
    backgroundColor: "#FFF8F0",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fad9b9",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: { flex: 1, color: "#8B6854", fontSize: 14 },
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
    color: "#BB6B3F",
    fontWeight: "500",
    textAlign: "center",
    paddingHorizontal: 32,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#BB6B3F",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryText: { fontSize: 13, fontWeight: "700", color: "#fff" },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#BB6B3F",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#BB6B3F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
});

const c = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F5EDE5",
    shadowColor: "#BB6B3F",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  bullCard: { borderColor: "#F5EDE5", borderWidth: 1.5 },
  topRow: { flexDirection: "row", alignItems: "center" },
  avatarWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#FFF8F0",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#F5EDE5",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 3,
    flexWrap: "wrap",
    gap: 4,
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: -0.2,
  },
  badgeGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 1,
    flexWrap: "wrap",
  },
  tag: { fontSize: 12, color: "#9ca3af", fontWeight: "500" },
  miniDaysBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FFF8F0",
    borderRadius: 20,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "#F5EDE5",
  },
  miniDaysText: { fontSize: 9, fontWeight: "700", color: "#BB6B3F" },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 10, fontWeight: "700" },
  divider: { height: 1, backgroundColor: "#F5EDE5", marginVertical: 12 },
  bullStatsRow: {
    flexDirection: "row",
    backgroundColor: "#FFF8F0",
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F5EDE5",
  },
  bullStat: { flex: 1, alignItems: "center" },
  bullStatVal: {
    fontSize: 16,
    fontWeight: "800",
    color: "#7c3aed",
    letterSpacing: -0.3,
  },
  bullStatLabel: {
    fontSize: 10,
    color: "#a78bfa",
    fontWeight: "600",
    marginTop: 2,
  },
  bullStatDivider: { width: 1, backgroundColor: "#ddd6fe" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFF8F0",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#F5EDE5",
  },
  detailLabel: { fontSize: 11, color: "#C4A882", fontWeight: "500" },
  detailValue: { fontSize: 11, color: "#5C3D2E", fontWeight: "600" },
  actionRow: { flexDirection: "row", gap: 8, marginTop: 12 },
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
  editBtn: { backgroundColor: "#FFF8F0", borderColor: "#8B6854" },
  deleteBtn: { backgroundColor: "#FFF5F2", borderColor: "#FFD4C4" },
  qrBtn: { backgroundColor: "#F5EFEA", borderColor: "#D4B8A8" },
  actionText: { fontSize: 13, fontWeight: "700" },
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  infoBannerTitle: { fontSize: 12, fontWeight: "700" },
  infoBannerSub: { fontSize: 11, opacity: 0.85, marginTop: 2 },
});

const f = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: {
    fontSize: 11,
    color: "#8B6854",
    fontWeight: "700",
    letterSpacing: 0.4,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF8F0",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#F5EDE5",
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  focused: { borderColor: "#FFBF55", backgroundColor: "#fff" },
  input: { flex: 1, color: "#8B6854", fontSize: 14, fontWeight: "500" },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  toggleLabel: { fontSize: 14, fontWeight: "700", color: "#8B6854" },
  toggleSub: { fontSize: 11, fontWeight: "500", marginTop: 2 },
  purposeChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#F5EDE5",
    backgroundColor: "#FFF8F0",
  },
  purposeText: { fontSize: 12, fontWeight: "700", color: "#C4A882" },
  motherChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#FFF8F0",
    borderWidth: 1,
    borderColor: "#F5EDE5",
    marginRight: 6,
  },
  motherChipActive: { backgroundColor: "#f0fdf4", borderColor: "#86efac" },
  motherChipText: { fontSize: 12, color: "#6b7280", fontWeight: "600" },
  todayBtn: {
    backgroundColor: "#FFF8F0",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#8B6854",
  },
  todayText: { fontSize: 11, fontWeight: "700", color: "#BB6B3F" },
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
    backgroundColor: "#FFBF55",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  pickerDoneText: { fontSize: 13, fontWeight: "800", color: "#fff" },
});

const m = StyleSheet.create({
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
    color: "#8B6854",
    letterSpacing: -0.3,
  },
  sub: { fontSize: 13, color: "#C4A882", fontWeight: "500", marginBottom: 20 },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F5EDE5",
    alignItems: "center",
    justifyContent: "center",
  },
  backBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F5EDE5",
    alignItems: "center",
    justifyContent: "center",
  },
  editIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#FFF8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  typeRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  typeCard: { flex: 1 },
  typeInner: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    minHeight: 160,
    justifyContent: "space-between",
  },
  typeTitle: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  typeSub: {
    fontSize: 12,
    color: "#9ca3af",
    fontWeight: "500",
    marginBottom: 14,
  },
  typePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  typePillText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.5,
  },
  bullCard: { marginBottom: 8 },
  bullInner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF8F0",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1.5,
    borderColor: "#F5EDE5",
  },
  bullTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#7c3aed",
    marginBottom: 3,
  },
  bullSub: { fontSize: 12, color: "#a78bfa", fontWeight: "500" },
  toggleCard: {
    backgroundColor: "#FFF8F0",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F5EDE5",
    overflow: "hidden",
    marginBottom: 4,
  },
  divider: { height: 1, backgroundColor: "#F5EDE5", marginHorizontal: 16 },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f3dbbc",
    borderRadius: 14,
    paddingVertical: 15,
    gap: 8,
    marginTop: 16,
  },
  submitBtnTerra: { backgroundColor: "#C4A882" },
  submitText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.2,
  },
});

const qr = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(61,43,31,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    width: 300,
    shadowColor: "#F5EDE5",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: 16,
  },
  name: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.2,
  },
  tag: { fontSize: 11, color: "#9ca3af", fontWeight: "600", marginTop: 1 },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F5EDE5",
    alignItems: "center",
    justifyContent: "center",
  },
  qrWrap: {
    width: 210,
    height: 210,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#FFF8F0",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#F5EDE5",
  },
  qrImage: { width: 210, height: 210 },
  qrPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%",
  },
  hint: {
    fontSize: 11,
    color: "#9ca3af",
    fontWeight: "500",
    marginTop: 14,
    marginBottom: 4,
  },
  doneBtn: {
    marginTop: 14,
    backgroundColor: "#8B6854",
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 11,
  },
  doneBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
    letterSpacing: 0.2,
  },
});

const bd = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(204, 137, 92, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    width: "100%",
    maxWidth: 400,
    paddingBottom: 12,
    shadowColor: "#8B6854",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F5EDE5",
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F5EDE5",
    alignItems: "center",
    justifyContent: "center",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 14,
    marginVertical: 10,
    backgroundColor: "#FFF8F0",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#F5EDE5",
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 8,
  },
  searchInput: { flex: 1, color: "#111827", fontSize: 14, fontWeight: "500" },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#FFF8F0",
  },
  itemSelected: { backgroundColor: "#f0fdf4" },
  emojiWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#FFF8F0",
    borderWidth: 1,
    borderColor: "#F5EDE5",
    alignItems: "center",
    justifyContent: "center",
  },
  breedName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: -0.2,
  },
  origin: { fontSize: 11, color: "#9ca3af", fontWeight: "500", marginTop: 2 },
  customRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFF8F0",
    margin: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#8B6854",
  },
  customLabel: { fontSize: 14, fontWeight: "700", color: "#16a34a" },
  customSub: {
    fontSize: 11,
    color: "#86efac",
    fontWeight: "500",
    marginTop: 1,
  },
});

const tr = StyleSheet.create({
  wrap: {
    backgroundColor: "#fdf4ff",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#e9d5ff",
    overflow: "hidden",
    marginBottom: 4,
    marginTop: 8,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  toggleLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#e9d5ff",
    alignItems: "center",
    justifyContent: "center",
  },
  toggleLabel: { fontSize: 14, fontWeight: "700", color: "#7c3aed" },
  toggleSub: { fontSize: 11, fontWeight: "500", marginTop: 2 },
  fields: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    backgroundColor: "#faf5ff",
  },
  divider: { height: 1, backgroundColor: "#e9d5ff", marginBottom: 14 },
});

const sd = StyleSheet.create({
  wrap: {
    backgroundColor: "#fff7ed",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#fed7aa",
    overflow: "hidden",
    marginBottom: 4,
    marginTop: 8,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  toggleLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#fed7aa",
    alignItems: "center",
    justifyContent: "center",
  },
  toggleLabel: { fontSize: 14, fontWeight: "700", color: "#ea580c" },
  toggleSub: { fontSize: 11, fontWeight: "500", marginTop: 2 },
  fields: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    backgroundColor: "#fffbf5",
  },
  divider: { height: 1, backgroundColor: "#fed7aa", marginBottom: 14 },
});

const ex = StyleSheet.create({
  wrap: {
    backgroundColor: "#fff1f2",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#fecdd3",
    overflow: "hidden",
    marginBottom: 4,
    marginTop: 8,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  toggleLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#fecdd3",
    alignItems: "center",
    justifyContent: "center",
  },
  toggleLabel: { fontSize: 14, fontWeight: "700", color: "#dc2626" },
  toggleSub: { fontSize: 11, fontWeight: "500", marginTop: 2 },
  fields: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    backgroundColor: "#fff5f5",
  },
  divider: { height: 1, backgroundColor: "#fecdd3", marginBottom: 14 },
});

// ── Insurance Styles 
const ins = StyleSheet.create({
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    marginTop: 4,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#8B6854",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  loadingText: {
    fontSize: 12,
    color: "#9ca3af",
    fontWeight: "500",
  },
  // ── Insured banner ──
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 12,
  },
  shieldIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  insCompany: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  statusPill: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: "700",
  },
  policyNo: {
    fontSize: 11,
    color: "#6b7280",
    fontWeight: "500",
    marginTop: 2,
    marginBottom: 8,
  },
  insDetailsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 6,
  },
  insDetailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  insDetailText: {
    fontSize: 11,
    color: "#374151",
    fontWeight: "600",
  },
  claimRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 10,
  },
  claimText: {
    fontSize: 11,
    color: "#7c3aed",
    fontWeight: "600",
  },
  editInsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    backgroundColor: "#16a34a",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 4,
  },
  editInsBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
  },
  // ── Uninsured / Add button ──
  addInsuranceBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f0fdf4",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#bbf7d0",
    borderStyle: "dashed",
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 12,
  },
  addInsuranceBtnLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  addInsuranceIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  addInsuranceBtnTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#15803d",
    letterSpacing: -0.2,
  },
  addInsuranceBtnSub: {
    fontSize: 11,
    color: "#4ade80",
    fontWeight: "500",
    marginTop: 1,
  },
  addInsuranceArrow: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
  },
});
