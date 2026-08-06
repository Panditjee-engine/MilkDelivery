import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Modal,
  StatusBar,
  Platform,
  Animated,
  KeyboardAvoidingView,
  ScrollView,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../../src/services/api";

interface CustomerAddress {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  landmark?: string;
  lat?: number;
  lng?: number;
}

interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: CustomerAddress;
  zone?: string;
  notes?: string;
  delivery_partner_id?: string;
  delivery_partner_name?: string;
  linked_user_id?: string | null;
  linked?: boolean;
  claim_status?: string;
  is_active: boolean;
  created_at?: string;
  customer_source?: "online" | "offline" | "both";
  is_app_user_only?: boolean;
}

interface DeliveryPartner {
  id: string;
  name: string;
  phone?: string;
}

type SortOption =
  | "name_asc"
  | "name_desc"
  | "active_first"
  | "linked_first"
  | "recent_first";
type FilterOption = "all" | "active" | "inactive" | "linked" | "unlinked";
type ToastVariant = "success" | "error" | "info";
const FILTER_CHIP_WIDTHS: Record<FilterOption, number> = {
  all: 54,
  active: 76,
  inactive: 88,
  linked: 76,
  unlinked: 78,
};

const DEFAULT_ZONES = [
  "Zone A",
  "Zone B",
  "Zone C",
  "Zone D",
  "North Zone",
  "South Zone",
  "East Zone",
  "West Zone",
];

interface CustomerFormState {
  name: string;
  phone: string;
  email: string;
  zone: string;
  notes: string;
  delivery_partner_id: string;
  is_active: boolean;
  address_line1: string;
  address_line2: string;
  address_city: string;
  address_state: string;
  address_pincode: string;
  address_landmark: string;
  address_lat: string;
  address_lng: string;
}

const EMPTY_FORM: CustomerFormState = {
  name: "",
  phone: "",
  email: "",
  zone: "",
  notes: "",
  delivery_partner_id: "",
  is_active: true,
  address_line1: "",
  address_line2: "",
  address_city: "",
  address_state: "",
  address_pincode: "",
  address_landmark: "",
  address_lat: "",
  address_lng: "",
};

function readBool(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "active", "linked"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "no", "inactive", "unlinked", ""].includes(normalized)) {
      return false;
    }
  }
  return fallback;
}

function isLinkedCustomer(customer: Customer | any): boolean {
  const linkedValue = customer?.linked ?? customer?.is_linked ?? customer?.claimed;
  if (typeof linkedValue !== "undefined") return readBool(linkedValue, false);
  return Boolean(
    customer?.linked_user_id ||
      customer?.user_id ||
      customer?.claimed_user_id ||
      customer?.customer_user_id,
  );
}

function normalizeCustomer(raw: any): Customer {
  return {
    ...raw,
    id: raw?.id || raw?._id,
    name: raw?.name || raw?.full_name || "Customer",
    linked: isLinkedCustomer(raw),
    is_active: readBool(raw?.is_active, true),
    customer_source: raw?.customer_source || (raw?.linked_user_id ? "both" : "offline"),
    is_app_user_only: false,
  };
}

function normalizeOnlineCustomer(raw: any): Customer {
  const id = raw?.id || raw?._id;
  return {
    ...raw,
    id,
    name: raw?.name || raw?.full_name || "Customer",
    phone: raw?.phone || raw?.mobile || "",
    email: raw?.email || "",
    address: raw?.address || raw?.delivery_address,
    zone: raw?.zone || "",
    notes: raw?.notes || "",
    linked_user_id: id,
    linked: true,
    is_active: readBool(raw?.is_active, true),
    customer_source: "online",
    is_app_user_only: true,
  };
}

function customerMergeKey(customer: Customer): string {
  const phone = String(customer.phone || "").trim().toLowerCase();
  const email = String(customer.email || "").trim().toLowerCase();
  if (customer.linked_user_id) return `linked:${customer.linked_user_id}`;
  if (phone) return `phone:${phone}`;
  if (email) return `email:${email}`;
  return `id:${customer.id}`;
}

function mergeCustomerLists(offlineRows: any[], onlineRows: any[]): Customer[] {
  const map = new Map<string, Customer>();
  offlineRows.map(normalizeCustomer).forEach((customer) => {
    map.set(customerMergeKey(customer), customer);
  });
  onlineRows.map(normalizeOnlineCustomer).forEach((customer) => {
    const key = customerMergeKey(customer);
    const existing = map.get(key);
    if (existing) {
      map.set(key, {
        ...customer,
        ...existing,
        linked: true,
        linked_user_id: existing.linked_user_id || customer.linked_user_id,
        customer_source: "both",
        is_app_user_only: false,
      });
      return;
    }
    map.set(key, customer);
  });
  return [...map.values()];
}

async function fetchAllAdminCustomerRows() {
  const pageSize = 200;
  const rows: any[] = [];
  for (let skip = 0; skip < 2000; skip += pageSize) {
    const page = await api.getAdminCustomers({ skip, limit: pageSize });
    rows.push(...(page ?? []));
    if (!page || page.length < pageSize) break;
  }
  return rows;
}

function formFromCustomer(customer?: Customer | null): CustomerFormState {
  if (!customer) return EMPTY_FORM;
  return {
    name: customer.name ?? "",
    phone: customer.phone ?? "",
    email: customer.email ?? "",
    zone: customer.zone ?? "",
    notes: customer.notes ?? "",
    delivery_partner_id: customer.delivery_partner_id ?? "",
    is_active: customer.is_active ?? true,
    address_line1: customer.address?.line1 ?? "",
    address_line2: customer.address?.line2 ?? "",
    address_city: customer.address?.city ?? "",
    address_state: customer.address?.state ?? "",
    address_pincode: customer.address?.pincode ?? "",
    address_landmark: customer.address?.landmark ?? "",
    address_lat:
      typeof customer.address?.lat === "number" ? String(customer.address.lat) : "",
    address_lng:
      typeof customer.address?.lng === "number" ? String(customer.address.lng) : "",
  };
}

function buildPayload(form: CustomerFormState) {
  const address: CustomerAddress = {};
  if (form.address_line1.trim()) address.line1 = form.address_line1.trim();
  if (form.address_line2.trim()) address.line2 = form.address_line2.trim();
  if (form.address_city.trim()) address.city = form.address_city.trim();
  if (form.address_state.trim()) address.state = form.address_state.trim();
  if (form.address_pincode.trim()) address.pincode = form.address_pincode.trim();
  if (form.address_landmark.trim()) address.landmark = form.address_landmark.trim();
  if (form.address_lat.trim()) address.lat = Number(form.address_lat);
  if (form.address_lng.trim()) address.lng = Number(form.address_lng);

  const hasAddress = Object.keys(address).length > 0;

  return {
    name: form.name.trim(),
    ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
    ...(form.email.trim() ? { email: form.email.trim() } : {}),
    ...(hasAddress ? { address } : {}),
    ...(form.zone.trim() ? { zone: form.zone.trim() } : {}),
    ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
    ...(form.delivery_partner_id ? { delivery_partner_id: form.delivery_partner_id } : {}),
    is_active: form.is_active,
  };
}

function formatAddress(address?: CustomerAddress) {
  if (!address) return "No address added";
  return [
    address.line1,
    address.line2,
    address.landmark,
    address.city,
    address.state,
    address.pincode,
  ]
    .filter(Boolean)
    .join(", ");
}

function formatCreatedAt(date?: string) {
  if (!date) return "Recently added";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "Recently added";
  return parsed.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function Toast({
  msg,
  variant,
  visible,
  onHide,
}: {
  msg: string;
  variant: ToastVariant;
  visible: boolean;
  onHide: () => void;
}) {
  const slide = useRef(new Animated.Value(-80)).current;
  useEffect(() => {
    if (!visible) return;
    Animated.spring(slide, {
      toValue: 0,
      useNativeDriver: true,
      tension: 80,
      friction: 9,
    }).start();
    const t = setTimeout(() => {
      Animated.timing(slide, {
        toValue: -80,
        duration: 250,
        useNativeDriver: true,
      }).start(onHide);
    }, 3000);
    return () => clearTimeout(t);
  }, [visible]);
  if (!visible) return null;
  const colors: Record<ToastVariant, { bg: string; border: string; icon: string }> = {
    success: { bg: "#f0fdf4", border: "#16a34a", icon: "checkmark-circle" },
    error: { bg: "#fef2f2", border: "#dc2626", icon: "close-circle" },
    info: { bg: "#eff6ff", border: "#2563eb", icon: "information-circle" },
  };
  const c = colors[variant];
  return (
    <Animated.View
      style={[
        toastS.wrap,
        {
          transform: [{ translateY: slide }],
          borderLeftColor: c.border,
          backgroundColor: c.bg,
        },
      ]}
    >
      <Ionicons name={c.icon as any} size={20} color={c.border} />
      <Text style={[toastS.msg, { color: c.border }]}>{msg}</Text>
      <TouchableOpacity onPress={onHide}>
        <Ionicons name="close" size={15} color={c.border} />
      </TouchableOpacity>
    </Animated.View>
  );
}

function SectionTitle({ icon, title }: { icon: keyof typeof Ionicons.glyphMap; title: string }) {
  return (
    <View style={formS.sectionHeader}>
      <Ionicons name={icon} size={14} color="#2d6a4f" />
      <Text style={formS.sectionTitle}>{title}</Text>
    </View>
  );
}

function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "email-address" | "phone-pad" | "numeric";
  multiline?: boolean;
}) {
  return (
    <View style={formS.fieldWrap}>
      <Text style={formS.label}>{label}</Text>
      <TextInput
        style={[formS.input, multiline && formS.inputMultiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? label}
        placeholderTextColor="#9ca3af"
        keyboardType={keyboardType ?? "default"}
        multiline={multiline}
      />
    </View>
  );
}

function PartnerSelector({
  value,
  partners,
  onChange,
}: {
  value: string;
  partners: DeliveryPartner[];
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selectedPartner = partners.find((partner) => partner.id === value);
  const filteredPartners = partners.filter((partner) =>
    `${partner.name} ${partner.phone ?? ""}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  return (
    <>
      <View style={formS.fieldWrap}>
        <Text style={formS.label}>Delivery Partner</Text>
        <TouchableOpacity
          style={formS.selectTrigger}
          activeOpacity={0.85}
          onPress={() => setOpen(true)}
        >
          <View style={{ flex: 1 }}>
            <Text style={formS.selectValue}>
              {selectedPartner?.name || "Select delivery partner"}
            </Text>
            <Text style={formS.selectSub}>
              {selectedPartner?.phone || "Search by name or phone"}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={16} color="#64748b" />
        </TouchableOpacity>
      </View>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={pickerS.overlay}
          onPress={() => setOpen(false)}
        >
          <TouchableOpacity activeOpacity={1} style={pickerS.sheet}>
            <View style={pickerS.header}>
              <Text style={pickerS.title}>Select Delivery Partner</Text>
              <TouchableOpacity
                style={pickerS.closeBtn}
                onPress={() => setOpen(false)}
              >
                <Ionicons name="close" size={16} color="#64748b" />
              </TouchableOpacity>
            </View>
            <View style={pickerS.searchRow}>
              <Ionicons name="search-outline" size={15} color="#64748b" />
              <TextInput
                style={pickerS.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder="Search partner..."
                placeholderTextColor="#9ca3af"
              />
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 320 }}>
              <TouchableOpacity
                style={[pickerS.item, !value && pickerS.itemActive]}
                onPress={() => {
                  onChange("");
                  setOpen(false);
                }}
              >
                <Text
                  style={[pickerS.itemTitle, !value && pickerS.itemTitleActive]}
                >
                  Unassigned
                </Text>
              </TouchableOpacity>
              {filteredPartners.map((partner) => {
                const active = value === partner.id;
                return (
                  <TouchableOpacity
                    key={partner.id}
                    style={[pickerS.item, active && pickerS.itemActive]}
                    onPress={() => {
                      onChange(active ? "" : partner.id);
                      setOpen(false);
                    }}
                  >
                    <Text
                      style={[
                        pickerS.itemTitle,
                        active && pickerS.itemTitleActive,
                      ]}
                    >
                      {partner.name}
                    </Text>
                    <Text style={pickerS.itemSub}>{partner.phone || "No phone"}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

function ZoneSelector({
  value,
  zones,
  onChange,
}: {
  value: string;
  zones: string[];
  onChange: (zone: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const filteredZones = zones.filter((zone) =>
    zone.toLowerCase().includes(search.toLowerCase()),
  );
  const showCustom =
    search.trim().length > 0 &&
    !zones.some((zone) => zone.toLowerCase() === search.trim().toLowerCase());

  return (
    <>
      <View style={formS.fieldWrap}>
        <Text style={formS.label}>Zone</Text>
        <TouchableOpacity
          style={formS.selectTrigger}
          activeOpacity={0.85}
          onPress={() => setOpen(true)}
        >
          <View style={{ flex: 1 }}>
            <Text style={formS.selectValue}>{value || "Select zone"}</Text>
            <Text style={formS.selectSub}>Search or add a zone</Text>
          </View>
          <Ionicons name="chevron-down" size={16} color="#64748b" />
        </TouchableOpacity>
      </View>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={pickerS.overlay}
          onPress={() => setOpen(false)}
        >
          <TouchableOpacity activeOpacity={1} style={pickerS.sheet}>
            <View style={pickerS.header}>
              <Text style={pickerS.title}>Select Zone</Text>
              <TouchableOpacity
                style={pickerS.closeBtn}
                onPress={() => setOpen(false)}
              >
                <Ionicons name="close" size={16} color="#64748b" />
              </TouchableOpacity>
            </View>
            <View style={pickerS.searchRow}>
              <Ionicons name="search-outline" size={15} color="#64748b" />
              <TextInput
                style={pickerS.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder="Search zone..."
                placeholderTextColor="#9ca3af"
              />
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 320 }}>
              {showCustom && (
                <TouchableOpacity
                  style={[pickerS.item, pickerS.customItem]}
                  onPress={() => {
                    onChange(search.trim());
                    setOpen(false);
                  }}
                >
                  <Text style={pickerS.itemTitle}>Add "{search.trim()}"</Text>
                  <Text style={pickerS.itemSub}>Custom zone</Text>
                </TouchableOpacity>
              )}
              {filteredZones.map((zone) => {
                const active = value === zone;
                return (
                  <TouchableOpacity
                    key={zone}
                    style={[pickerS.item, active && pickerS.itemActive]}
                    onPress={() => {
                      onChange(active ? "" : zone);
                      setOpen(false);
                    }}
                  >
                    <Text
                      style={[
                        pickerS.itemTitle,
                        active && pickerS.itemTitleActive,
                      ]}
                    >
                      {zone}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

function CustomerCard({
  item,
  index,
  onPress,
}: {
  item: Customer;
  index: number;
  onPress: () => void;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 280,
        delay: index * 45,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        delay: index * 45,
        tension: 80,
        friction: 12,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);
  const sourceLabel =
    item.customer_source === "online"
      ? "Online"
      : item.customer_source === "both"
        ? "Online + Offline"
        : "Offline";
  const sourceColor =
    item.customer_source === "online"
      ? "#7c3aed"
      : item.customer_source === "both"
        ? "#2563eb"
        : "#6b7280";

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <TouchableOpacity style={cardS.card} activeOpacity={0.9} onPress={onPress}>
        <LinearGradient
          colors={item.is_active ? ["#f8fffb", "#effcf5"] : ["#fff7f7", "#fff1f2"]}
          style={cardS.cardBg}
        >
          <View style={cardS.row}>
            <View style={cardS.avatar}>
              <Text style={cardS.avatarText}>
                {item.name.slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={cardS.titleRow}>
                <Text style={cardS.name} numberOfLines={1}>
                  {item.name}
                </Text>
                <View
                  style={[
                    cardS.statusPill,
                    item.is_active ? cardS.activePill : cardS.inactivePill,
                  ]}
                >
                  <Text
                    style={[
                      cardS.statusPillText,
                      { color: item.is_active ? "#16a34a" : "#dc2626" },
                    ]}
                  >
                    {item.is_active ? "Active" : "Inactive"}
                  </Text>
                </View>
              </View>
              <Text style={cardS.metaText}>{item.phone || "No phone added"}</Text>
              <Text style={cardS.metaText} numberOfLines={1}>
                {item.zone || "No zone"} {item.delivery_partner_name ? `· ${item.delivery_partner_name}` : ""}
              </Text>
              <View style={cardS.badgeRow}>
                <View
                  style={[
                    cardS.badge,
                    isLinkedCustomer(item)
                      ? cardS.badgeLinked
                      : cardS.badgeUnlinked,
                  ]}
                >
                  <Text
                    style={[
                      cardS.badgeText,
                      { color: isLinkedCustomer(item) ? "#2563eb" : "#6b7280" },
                    ]}
                  >
                    {isLinkedCustomer(item) ? "Linked" : "Offline"}
                  </Text>
                </View>
                <View style={[cardS.badge, { backgroundColor: "#f8fafc", borderColor: "#e2e8f0" }]}>
                  <Text style={[cardS.badgeText, { color: sourceColor }]}>
                    {sourceLabel}
                  </Text>
                </View>
                {item.claim_status ? (
                  <View style={[cardS.badge, cardS.badgeClaim]}>
                    <Text style={[cardS.badgeText, { color: "#c2410c" }]}>
                      {item.claim_status}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

function CustomerFormBody({
  form,
  setForm,
  partners,
  zones,
}: {
  form: CustomerFormState;
  setForm: React.Dispatch<React.SetStateAction<CustomerFormState>>;
  partners: DeliveryPartner[];
  zones: string[];
}) {
  const setField = (key: keyof CustomerFormState) => (value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value as never }));

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <SectionTitle icon="person-outline" title="Customer Info" />
      <InputField label="Name" value={form.name} onChangeText={setField("name")} />
      <InputField
        label="Phone"
        value={form.phone}
        onChangeText={setField("phone")}
        keyboardType="phone-pad"
      />
      <InputField
        label="Email"
        value={form.email}
        onChangeText={setField("email")}
        keyboardType="email-address"
      />
      <ZoneSelector
        value={form.zone}
        zones={zones}
        onChange={(zone) => setForm((prev) => ({ ...prev, zone }))}
      />
      <InputField
        label="Notes"
        value={form.notes}
        onChangeText={setField("notes")}
        multiline
      />
      <PartnerSelector
        value={form.delivery_partner_id}
        partners={partners}
        onChange={(id) =>
          setForm((prev) => ({ ...prev, delivery_partner_id: id }))
        }
      />

      <SectionTitle icon="location-outline" title="Address" />
      <InputField
        label="Line 1"
        value={form.address_line1}
        onChangeText={setField("address_line1")}
      />
      <InputField
        label="Line 2"
        value={form.address_line2}
        onChangeText={setField("address_line2")}
      />
      <InputField
        label="City"
        value={form.address_city}
        onChangeText={setField("address_city")}
      />
      <InputField
        label="State"
        value={form.address_state}
        onChangeText={setField("address_state")}
      />
      <InputField
        label="Pincode"
        value={form.address_pincode}
        onChangeText={setField("address_pincode")}
        keyboardType="numeric"
      />
      <InputField
        label="Landmark"
        value={form.address_landmark}
        onChangeText={setField("address_landmark")}
      />
   

      <View style={formS.switchRow}>
        <Text style={formS.switchLabel}>Customer Active</Text>
        <Switch
          value={form.is_active}
          onValueChange={(value) =>
            setForm((prev) => ({ ...prev, is_active: value }))
          }
          trackColor={{ false: "#d1d5db", true: "#86efac" }}
          thumbColor={form.is_active ? "#16a34a" : "#f3f4f6"}
        />
      </View>
    </ScrollView>
  );
}

function CustomerDetailModal({
  customer,
  visible,
  partners,
  zones,
  onClose,
  onSave,
  onDelete,
  onApproveClaim,
  onRejectClaim,
}: {
  customer: Customer | null;
  visible: boolean;
  partners: DeliveryPartner[];
  zones: string[];
  onClose: () => void;
  onSave: (id: string, payload: ReturnType<typeof buildPayload>) => Promise<void>;
  onDelete: (id: string, hard?: boolean) => Promise<void>;
  onApproveClaim: (id: string) => Promise<void>;
  onRejectClaim: (id: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CustomerFormState>(EMPTY_FORM);

  useEffect(() => {
    if (visible) {
      setForm(formFromCustomer(customer));
      setEditing(false);
    }
  }, [visible, customer]);

  if (!customer) return null;
  const canManageOfflineRecord = !customer.is_app_user_only;
  const sourceLabel =
    customer.customer_source === "online"
      ? "Online app customer"
      : customer.customer_source === "both"
        ? "Online + offline record"
        : "Offline customer record";

  const handleSave = async () => {
    if (!form.name.trim() || !canManageOfflineRecord) return;
    setSaving(true);
    try {
      await onSave(customer.id, buildPayload(form));
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={modalS.overlay}>
        <KeyboardAvoidingView
          style={{ width: "100%" }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={modalS.sheet}>
            <View style={modalS.handle} />
            <View style={modalS.header}>
              <View>
                <Text style={modalS.title}>{editing ? "Edit Customer" : "Customer Details"}</Text>
                <Text style={modalS.sub}>{formatCreatedAt(customer.created_at)}</Text>
              </View>
              <View style={modalS.headerActions}>
                {!editing && (
                  <TouchableOpacity
                    style={[modalS.iconBtn, !canManageOfflineRecord && { opacity: 0.45 }]}
                    onPress={() => setEditing(true)}
                    disabled={!canManageOfflineRecord}
                  >
                    <Ionicons name="create-outline" size={18} color="#2d6a4f" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={modalS.iconBtn} onPress={onClose}>
                  <Ionicons name="close" size={18} color="#6b7280" />
                </TouchableOpacity>
              </View>
            </View>

            {editing ? (
              <>
                <CustomerFormBody
                  form={form}
                  setForm={setForm}
                  partners={partners}
                  zones={zones}
                />
                <TouchableOpacity
                  style={[modalS.primaryBtn, saving && { opacity: 0.6 }]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="save-outline" size={18} color="#fff" />
                      <Text style={modalS.primaryBtnText}>Save Changes</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={detailS.section}>
                  <Text style={detailS.name}>{customer.name}</Text>
                  <Text style={detailS.sub}>
                    {customer.phone || "No phone"} {customer.email ? `· ${customer.email}` : ""}
                  </Text>
                  <View style={detailS.sourcePill}>
                    <Ionicons name="cloud-done-outline" size={13} color="#2563eb" />
                    <Text style={detailS.sourcePillText}>{sourceLabel}</Text>
                  </View>
                </View>
                <View style={detailS.infoCard}>
                  <Text style={detailS.infoLabel}>Address</Text>
                  <Text style={detailS.infoValue}>{formatAddress(customer.address)}</Text>
                  <Text style={detailS.infoLabel}>Zone</Text>
                  <Text style={detailS.infoValue}>{customer.zone || "Not assigned"}</Text>
                  <Text style={detailS.infoLabel}>Delivery Partner</Text>
                  <Text style={detailS.infoValue}>
                    {customer.delivery_partner_name || "Unassigned"}
                  </Text>
                  <Text style={detailS.infoLabel}>Notes</Text>
                  <Text style={detailS.infoValue}>{customer.notes || "No notes"}</Text>
                </View>

                {customer.claim_status === "pending" && (
                  <View style={detailS.claimRow}>
                    <TouchableOpacity
                      style={[detailS.claimBtn, detailS.approveBtn]}
                      onPress={() => onApproveClaim(customer.id)}
                    >
                      <Ionicons name="checkmark-circle-outline" size={16} color="#16a34a" />
                      <Text style={[detailS.claimBtnText, { color: "#16a34a" }]}>
                        Approve Claim
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[detailS.claimBtn, detailS.rejectBtn]}
                      onPress={() => onRejectClaim(customer.id)}
                    >
                      <Ionicons name="close-circle-outline" size={16} color="#dc2626" />
                      <Text style={[detailS.claimBtnText, { color: "#dc2626" }]}>
                        Reject Claim
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {canManageOfflineRecord ? (
                  <View style={detailS.deleteRow}>
                    <TouchableOpacity
                      style={[detailS.deleteBtn, detailS.softDeleteBtn]}
                      onPress={() => onDelete(customer.id, false)}
                    >
                      <Text style={[detailS.deleteText, { color: "#b45309" }]}>
                        Soft Delete
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[detailS.deleteBtn, detailS.hardDeleteBtn]}
                      onPress={() => onDelete(customer.id, true)}
                    >
                      <Text style={[detailS.deleteText, { color: "#dc2626" }]}>
                        Hard Delete
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={detailS.readOnlyNote}>
                    <Ionicons name="information-circle-outline" size={16} color="#2563eb" />
                    <Text style={detailS.readOnlyNoteText}>
                      This is a registered app customer. Create or link an offline record to manage delivery zone, partner, and notes here.
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function CreateCustomerModal({
  visible,
  partners,
  zones,
  creating,
  onClose,
  onCreate,
}: {
  visible: boolean;
  partners: DeliveryPartner[];
  zones: string[];
  creating: boolean;
  onClose: () => void;
  onCreate: (payload: ReturnType<typeof buildPayload>) => Promise<void>;
}) {
  const [form, setForm] = useState<CustomerFormState>(EMPTY_FORM);

  useEffect(() => {
    if (visible) setForm(EMPTY_FORM);
  }, [visible]);

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    await onCreate(buildPayload(form));
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={modalS.overlay}>
        <KeyboardAvoidingView
          style={{ width: "100%" }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={modalS.sheet}>
            <View style={modalS.handle} />
            <View style={modalS.header}>
              <View>
                <Text style={modalS.title}>Create Customer</Text>
                <Text style={modalS.sub}>Add a new offline customer record</Text>
              </View>
              <TouchableOpacity style={modalS.iconBtn} onPress={onClose}>
                <Ionicons name="close" size={18} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <CustomerFormBody
              form={form}
              setForm={setForm}
              partners={partners}
              zones={zones}
            />
            <TouchableOpacity
              style={[modalS.primaryBtn, creating && { opacity: 0.6 }]}
              onPress={handleCreate}
              disabled={creating}
            >
              {creating ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="add-circle-outline" size={18} color="#fff" />
                  <Text style={modalS.primaryBtnText}>Create Customer</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

export default function CustomersScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ from?: string }>();
  const insets = useSafeAreaInsets();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [partners, setPartners] = useState<DeliveryPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [createVisible, setCreateVisible] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterOption>("all");
  const [sortBy, setSortBy] = useState<SortOption>("name_asc");
  const [sortVisible, setSortVisible] = useState(false);
  const [toast, setToast] = useState({
    visible: false,
    msg: "",
    variant: "success" as ToastVariant,
  });

  const showToast = (msg: string, variant: ToastVariant = "success") =>
    setToast({ visible: true, msg, variant });
  const hideToast = () => setToast((prev) => ({ ...prev, visible: false }));

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const [offlineResult, onlineResult] = await Promise.allSettled([
        fetchAllAdminCustomerRows(),
        api.getAllUsers("customer"),
      ]);
      if (offlineResult.status === "rejected" && onlineResult.status === "rejected") {
        throw offlineResult.reason || onlineResult.reason;
      }
      const offlineRows = offlineResult.status === "fulfilled" ? offlineResult.value : [];
      const onlineRows = onlineResult.status === "fulfilled" ? onlineResult.value ?? [] : [];
      setCustomers(mergeCustomerLists(offlineRows, onlineRows));
      if (offlineResult.status === "rejected") {
        showToast("Offline records failed. Showing app customers.", "error");
      } else if (onlineResult.status === "rejected") {
        showToast("App customers failed. Showing offline records.", "error");
      }
    } catch (e: any) {
      showToast(e?.message || "Failed to load customers", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchPartners = async () => {
    try {
      const data = await api.getAllUsers("delivery_partner");
      setPartners(
        data.map((user: any) => ({
          id: user.id,
          name: user.name ?? user.full_name ?? "Partner",
          phone: user.phone,
        })),
      );
    } catch {
      setPartners([]);
    }
  };

  useEffect(() => {
    fetchCustomers();
    fetchPartners();
  }, []);

  const totalActive = customers.filter((c) => c.is_active).length;
  const totalLinked = customers.filter((c) => isLinkedCustomer(c)).length;
  const zones = useMemo(
    () =>
      Array.from(
        new Set(
          [
            ...DEFAULT_ZONES,
            ...(customers
              .map((customer) => customer.zone)
              .filter(Boolean) as string[]),
          ].filter(Boolean),
        ),
      ),
    [customers],
  );

  const visibleCustomers = useMemo(() => {
    return [...customers]
      .filter((customer) => {
        const q = search.toLowerCase();
        const matchesSearch =
          customer.name.toLowerCase().includes(q) ||
          (customer.phone ?? "").toLowerCase().includes(q) ||
          (customer.zone ?? "").toLowerCase().includes(q);
        const linked = isLinkedCustomer(customer);
        const matchesFilter =
          filter === "all"
            ? true
            : filter === "active"
              ? customer.is_active
              : filter === "inactive"
                ? !customer.is_active
                : filter === "linked"
                  ? linked
                  : !linked;
        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => {
        if (sortBy === "name_asc") return a.name.localeCompare(b.name);
        if (sortBy === "name_desc") return b.name.localeCompare(a.name);
        if (sortBy === "active_first") {
          return a.is_active === b.is_active
            ? a.name.localeCompare(b.name)
            : a.is_active
              ? -1
              : 1;
        }
        if (sortBy === "linked_first") {
          const aLinked = isLinkedCustomer(a);
          const bLinked = isLinkedCustomer(b);
          return aLinked === bLinked
            ? a.name.localeCompare(b.name)
            : aLinked
              ? -1
              : 1;
        }
        return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
      });
  }, [customers, search, filter, sortBy]);

  const sortMeta: Record<
    SortOption,
    { label: string; icon: keyof typeof Ionicons.glyphMap }
  > = {
    name_asc: { label: "Name A-Z", icon: "text-outline" },
    name_desc: { label: "Name Z-A", icon: "text-outline" },
    active_first: { label: "Active First", icon: "checkmark-circle-outline" },
    linked_first: { label: "Linked First", icon: "link-outline" },
    recent_first: { label: "Recent First", icon: "time-outline" },
  };

  const handleBack = () => {
    if (params.from === "dashboard") {
      router.replace("/(admin)/dashboard" as any);
      return;
    }
    if (params.from === "gausevak") {
      router.replace("/(admin)/gausevak" as any);
      return;
    }
    router.back();
  };

  const handleCreate = async (payload: ReturnType<typeof buildPayload>) => {
    try {
      setCreating(true);
      const created = await api.createAdminCustomer(payload);
      setCustomers((prev) => [normalizeCustomer(created), ...prev]);
      setCreateVisible(false);
      showToast("Customer created successfully!", "success");
    } catch (e: any) {
      showToast(e?.message || "Failed to create customer", "error");
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async (
    id: string,
    payload: ReturnType<typeof buildPayload>,
  ) => {
    try {
      const current = customers.find((item) => item.id === id);
      if (current?.is_app_user_only) {
        showToast("App customers need an offline record before editing here.", "info");
        return;
      }
      const updated = await api.updateAdminCustomer(id, payload);
      const normalized = normalizeCustomer(updated);
      setCustomers((prev) => prev.map((item) => (item.id === id ? normalized : item)));
      setSelectedCustomer(normalized);
      showToast("Customer updated!", "success");
    } catch (e: any) {
      showToast(e?.message || "Update failed", "error");
    }
  };

  const handleDelete = async (id: string, hard = false) => {
    try {
      const current = customers.find((item) => item.id === id);
      if (current?.is_app_user_only) {
        showToast("App customers cannot be deleted from offline customer records.", "info");
        return;
      }
      await api.deleteAdminCustomer(id, hard);
      setCustomers((prev) => prev.filter((item) => item.id !== id));
      setDetailVisible(false);
      setSelectedCustomer(null);
      showToast(hard ? "Customer permanently deleted" : "Customer deleted", "info");
    } catch (e: any) {
      showToast(e?.message || "Delete failed", "error");
    }
  };

  const handleApproveClaim = async (id: string) => {
    try {
      await api.approveCustomerClaim(id);
      const full = await api.getAdminCustomer(id);
      const normalized = normalizeCustomer(full);
      setCustomers((prev) => prev.map((item) => (item.id === id ? normalized : item)));
      setSelectedCustomer(normalized);
      showToast("Claim approved", "success");
    } catch (e: any) {
      showToast(e?.message || "Failed to approve claim", "error");
    }
  };

  const handleRejectClaim = async (id: string) => {
    try {
      await api.rejectCustomerClaim(id);
      const full = await api.getAdminCustomer(id);
      const normalized = normalizeCustomer(full);
      setCustomers((prev) => prev.map((item) => (item.id === id ? normalized : item)));
      setSelectedCustomer(normalized);
      showToast("Claim rejected", "info");
    } catch (e: any) {
      showToast(e?.message || "Failed to reject claim", "error");
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <Toast
        msg={toast.msg}
        variant={toast.variant}
        visible={toast.visible}
        onHide={hideToast}
      />

      <LinearGradient
        colors={["#112240", "#0a1a30"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}
      >
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <Ionicons name="arrow-back" size={20} color="#7ca9d4" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Customers</Text>
          <Text style={styles.headerSub}>
            {visibleCustomers.length} total · {totalActive} active
          </Text>
        </View>
        <TouchableOpacity
          style={styles.sortBtn}
          onPress={() => setSortVisible(true)}
        >
          <Ionicons name={sortMeta[sortBy].icon} size={18} color="#7ca9d4" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setCreateVisible(true)}
        >
          <LinearGradient colors={["#2d6a4f", "#1b4332"]} style={styles.addBtnGradient}>
            <Ionicons name="add" size={22} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>

      <Modal
        visible={sortVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSortVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.sortOverlay}
          onPress={() => setSortVisible(false)}
        >
          <View style={styles.sortSheet}>
            <Text style={styles.sortSheetTitle}>Sort Customers</Text>
            <Text style={styles.sortSheetSub}>Choose data ordering</Text>
            {(["name_asc", "name_desc", "active_first", "linked_first", "recent_first"] as const).map(
              (option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.sortOption,
                    sortBy === option && styles.sortOptionActive,
                  ]}
                  onPress={() => {
                    setSortBy(option);
                    setSortVisible(false);
                  }}
                >
                  <Ionicons
                    name={sortMeta[option].icon}
                    size={15}
                    color={sortBy === option ? "#2d6a4f" : "#9ca3af"}
                  />
                  <Text
                    style={[
                      styles.sortOptionText,
                      sortBy === option && styles.sortOptionTextActive,
                    ]}
                  >
                    {sortMeta[option].label}
                  </Text>
                </TouchableOpacity>
              ),
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {!loading && customers.length > 0 && (
        <View style={styles.statsBar}>
          <View style={styles.statChip}>
            <Ionicons name="people" size={13} color="#2d6a4f" />
            <Text style={styles.statChipText}>{visibleCustomers.length} Customers</Text>
          </View>
          <View style={[styles.statChip, { backgroundColor: "#dcfce7" }]}>
            <View style={[styles.statusDot, { backgroundColor: "#16a34a" }]} />
            <Text style={[styles.statChipText, { color: "#16a34a" }]}>
              {totalActive} Active
            </Text>
          </View>
          <View style={[styles.statChip, { backgroundColor: "#dbeafe" }]}>
            <View style={[styles.statusDot, { backgroundColor: "#2563eb" }]} />
            <Text style={[styles.statChipText, { color: "#2563eb" }]}>
              {totalLinked} Linked
            </Text>
          </View>
        </View>
      )}

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={15} color="#7ca9d4" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search customer, phone or zone..."
          placeholderTextColor="#8aa7c2"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={15} color="#8aa7c2" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {(["all", "active", "inactive", "linked", "unlinked"] as const).map((option) => {
          const active = filter === option;
          return (
            <TouchableOpacity
              key={option}
              style={[
                styles.filterChip,
                { width: FILTER_CHIP_WIDTHS[option] },
                active && styles.filterChipActive,
              ]}
              onPress={() => setFilter(option)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  active && styles.filterChipTextActive,
                ]}
              >
                {option === "all"
                  ? "All"
                  : option === "active"
                    ? "Active"
                    : option === "inactive"
                      ? "Inactive"
                      : option === "linked"
                        ? "Linked"
                        : "Offline"}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2d6a4f" />
          <Text style={styles.loadingText}>Loading customers...</Text>
        </View>
      ) : visibleCustomers.length === 0 ? (
        <View style={styles.centered}>
          <LinearGradient colors={["#1b4332", "#2d6a4f"]} style={styles.emptyIcon}>
            <Ionicons name="people-outline" size={36} color="#74c69d" />
          </LinearGradient>
          <Text style={styles.emptyTitle}>No Customers Found</Text>
          <Text style={styles.emptySubtitle}>
            Create your first customer record to get started
          </Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => setCreateVisible(true)}
          >
            <Text style={styles.emptyBtnText}>+ Add Customer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={visibleCustomers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <CustomerCard
              item={item}
              index={index}
              onPress={() => {
                setSelectedCustomer(item);
                setDetailVisible(true);
              }}
            />
          )}
          ListFooterComponent={<View style={{ height: 100 }} />}
        />
      )}

      <CustomerDetailModal
        customer={selectedCustomer}
        visible={detailVisible}
        partners={partners}
        zones={zones}
        onClose={() => setDetailVisible(false)}
        onSave={handleUpdate}
        onDelete={handleDelete}
        onApproveClaim={handleApproveClaim}
        onRejectClaim={handleRejectClaim}
      />

      <CreateCustomerModal
        visible={createVisible}
        partners={partners}
        zones={zones}
        creating={creating}
        onClose={() => setCreateVisible(false)}
        onCreate={handleCreate}
      />
    </View>
  );
}

const toastS = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    zIndex: 9999,
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderLeftWidth: 4,
    elevation: 12,
  },
  msg: { flex: 1, fontSize: 13.5, fontWeight: "600", lineHeight: 18 },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f7fafc" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 18,
    paddingTop: 18,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#0d2137",
    borderWidth: 1,
    borderColor: "#1e3a5f",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: { flex: 1, marginLeft: 12 },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#e8f4f8" },
  headerSub: { fontSize: 12, color: "#5b8db8", marginTop: 2, fontWeight: "500" },
  sortBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#0d2137",
    borderWidth: 1,
    borderColor: "#1e3a5f",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  addBtn: { borderRadius: 14, overflow: "hidden" },
  addBtnGradient: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
  },
  sortOverlay: {
    flex: 1,
    backgroundColor: "rgba(3,8,18,0.45)",
    justifyContent: "flex-start",
    paddingTop: 92,
    paddingHorizontal: 16,
  },
  sortSheet: {
    alignSelf: "flex-end",
    width: 228,
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#d9e7ef",
    padding: 12,
  },
  sortSheetTitle: { fontSize: 15, fontWeight: "800", color: "#111827" },
  sortSheetSub: { fontSize: 12, color: "#6b7280", fontWeight: "500", marginTop: 2, marginBottom: 8 },
  sortOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
  },
  sortOptionActive: { backgroundColor: "#f0fdf4" },
  sortOptionText: { fontSize: 13, fontWeight: "700", color: "#4b5563" },
  sortOptionTextActive: { color: "#2d6a4f" },
  statsBar: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  statChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#f0fdf4",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statChipText: { fontSize: 11.5, fontWeight: "700", color: "#2d6a4f" },
  statusDot: { width: 8, height: 8, borderRadius: 999 },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#dbe5ef",
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 8,
  },
  searchInput: { flex: 1, color: "#111827", fontSize: 14 },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    gap: 8,
    paddingRight: 16,
  },
  filterChip: {
    height: 34,
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderRadius: 999,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#dbe5ef",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  filterChipActive: { backgroundColor: "#2d6a4f", borderColor: "#2d6a4f" },
  filterChipText: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "800",
    color: "#475569",
    textAlign: "center",
    includeFontPadding: false,
  },
  filterChipTextActive: { color: "#fff" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  loadingText: { marginTop: 10, fontSize: 14, color: "#64748b", fontWeight: "600" },
  emptyIcon: { width: 82, height: 82, borderRadius: 26, alignItems: "center", justifyContent: "center", marginBottom: 18 },
  emptyTitle: { fontSize: 19, fontWeight: "800", color: "#111827" },
  emptySubtitle: { fontSize: 13, color: "#64748b", textAlign: "center", marginTop: 8, marginBottom: 18 },
  emptyBtn: { backgroundColor: "#2d6a4f", borderRadius: 12, paddingHorizontal: 18, paddingVertical: 12 },
  emptyBtnText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  list: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 100, gap: 12 },
});

const cardS = StyleSheet.create({
  card: { borderRadius: 18, overflow: "hidden" },
  cardBg: { borderRadius: 18, padding: 15, borderWidth: 1, borderColor: "#deebf3" },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 46, height: 46, borderRadius: 15, backgroundColor: "#112240", alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 3 },
  name: { flex: 1, fontSize: 14, fontWeight: "800", color: "#111827" },
  metaText: { fontSize: 11.5, color: "#64748b", fontWeight: "500", marginTop: 1, lineHeight: 16 },
  statusPill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  activePill: { backgroundColor: "#f0fdf4", borderColor: "#86efac" },
  inactivePill: { backgroundColor: "#fff1f2", borderColor: "#fecdd3" },
  statusPillText: { fontSize: 9.5, fontWeight: "800" },
  badgeRow: { flexDirection: "row", gap: 6, marginTop: 7, flexWrap: "wrap", alignSelf: "flex-start" },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, alignSelf: "flex-start" },
  badgeLinked: { backgroundColor: "#eff6ff", borderColor: "#bfdbfe" },
  badgeUnlinked: { backgroundColor: "#f8fafc", borderColor: "#e2e8f0" },
  badgeClaim: { backgroundColor: "#fff7ed", borderColor: "#fdba74" },
  badgeText: { fontSize: 9.5, fontWeight: "700" },
});

const formS = StyleSheet.create({
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6, marginBottom: 10 },
  sectionTitle: { fontSize: 13, fontWeight: "800", color: "#2d6a4f" },
  fieldWrap: { marginBottom: 12 },
  label: { fontSize: 11, fontWeight: "800", color: "#64748b", textTransform: "uppercase", marginBottom: 6 },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#dbe5ef",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: "#111827",
  },
  selectTrigger: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#dbe5ef",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  selectValue: { fontSize: 14, color: "#111827", fontWeight: "600" },
  selectSub: { fontSize: 11, color: "#64748b", marginTop: 2 },
  inputMultiline: { minHeight: 88, textAlignVertical: "top" as const },
  row2: { flexDirection: "row", gap: 10 },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#dbe5ef",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  switchLabel: { fontSize: 14, fontWeight: "700", color: "#111827" },
});

const pickerS = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.28)",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  sheet: {
    backgroundColor: "#fff",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#dbe5ef",
    padding: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  title: { fontSize: 16, fontWeight: "800", color: "#111827" },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#dbe5ef",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#111827" },
  item: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eef2f7",
    backgroundColor: "#fff",
    marginBottom: 8,
  },
  itemActive: { backgroundColor: "#ecfdf5", borderColor: "#86efac" },
  customItem: { backgroundColor: "#eff6ff", borderColor: "#bfdbfe" },
  itemTitle: { fontSize: 14, fontWeight: "700", color: "#111827" },
  itemTitleActive: { color: "#166534" },
  itemSub: { fontSize: 11, color: "#64748b", marginTop: 2 },
});

const modalS = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.42)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#f8fbfd",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
    maxHeight: "90%",
  },
  handle: { width: 36, height: 4, backgroundColor: "#dbe5ef", borderRadius: 999, alignSelf: "center", marginBottom: 18 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  title: { fontSize: 18, fontWeight: "800", color: "#111827" },
  sub: { fontSize: 12, color: "#64748b", marginTop: 2 },
  headerActions: { flexDirection: "row", gap: 8 },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#dbe5ef",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtn: {
    backgroundColor: "#2d6a4f",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },
});

const detailS = StyleSheet.create({
  section: { marginBottom: 14 },
  name: { fontSize: 18, fontWeight: "800", color: "#111827" },
  sub: { fontSize: 13, color: "#64748b", marginTop: 4 },
  sourcePill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    marginTop: 9,
  },
  sourcePillText: { fontSize: 11, fontWeight: "800", color: "#2563eb" },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#dbe5ef",
    padding: 14,
    gap: 6,
  },
  infoLabel: { fontSize: 11, fontWeight: "800", color: "#64748b", textTransform: "uppercase", marginTop: 6 },
  infoValue: { fontSize: 13, color: "#111827", fontWeight: "600" },
  claimRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  claimBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    paddingVertical: 11,
    borderWidth: 1,
  },
  approveBtn: { backgroundColor: "#f0fdf4", borderColor: "#86efac" },
  rejectBtn: { backgroundColor: "#fff1f2", borderColor: "#fecdd3" },
  claimBtnText: { fontSize: 13, fontWeight: "800" },
  deleteRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  deleteBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingVertical: 11,
    borderWidth: 1,
  },
  softDeleteBtn: { backgroundColor: "#fffbeb", borderColor: "#fcd34d" },
  hardDeleteBtn: { backgroundColor: "#fff1f2", borderColor: "#fecdd3" },
  deleteText: { fontSize: 13, fontWeight: "800" },
  readOnlyNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe",
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginTop: 14,
  },
  readOnlyNoteText: { flex: 1, fontSize: 12, fontWeight: "600", color: "#1d4ed8", lineHeight: 17 },
});
