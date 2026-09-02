import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Image,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { api, StatementTemplateSettings } from "../../src/services/api";
import { useAuth } from "../../src/contexts/AuthContext";

const C = {
  bg: "#FFF8F4",
  card: "#FFFFFF",
  primary: "#FF9675",
  dark: "#BB6B3F",
  text: "#1A1A1A",
  muted: "#A07850",
  border: "#FFE8D6",
  red: "#DC2626",
};

const DEFAULT_TEMPLATE: StatementTemplateSettings = {
  business_name: "",
  tagline: "Wallet statement",
  address: "",
  phone: "",
  email: "",
  footer_note: "This is a computer generated wallet statement.",
  primary_color: "#BB6B3F",
  logo_base64: "",
  show_summary: true,
  show_footer: true,
};

const PRIMARY_COLOR_OPTIONS = [
  { name: "GauSatva Brown", value: "#BB6B3F" },
  { name: "Warm Coral", value: "#FF9675" },
  { name: "Fresh Green", value: "#16A34A" },
  { name: "Royal Blue", value: "#2563EB" },
  { name: "Deep Indigo", value: "#4F46E5" },
  { name: "Premium Purple", value: "#7C3AED" },
  { name: "Rose Pink", value: "#E11D48" },
  { name: "Golden Amber", value: "#D97706" },
  { name: "Charcoal", value: "#374151" },
  { name: "Teal", value: "#0F766E" },
];

function imageUri(value?: string) {
  if (!value) return "";
  return value.startsWith("data:image") ? value : `data:image/jpeg;base64,${value}`;
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
}: {
  label: string;
  value?: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: "default" | "email-address" | "phone-pad";
}) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        value={value ?? ""}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#C9A882"
        multiline={multiline}
        keyboardType={keyboardType}
        style={[s.input, multiline && s.textArea]}
      />
    </View>
  );
}

function ToggleRow({
  title,
  subtitle,
  value,
  onValueChange,
}: {
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={s.toggleRow}>
      <View style={{ flex: 1 }}>
        <Text style={s.toggleTitle}>{title}</Text>
        <Text style={s.toggleSub}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#E5D5CB", true: C.primary + "99" }}
        thumbColor={value ? C.dark : "#FFFFFF"}
      />
    </View>
  );
}

function PrimaryColorDropdown({
  value,
  onChange,
}: {
  value?: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected =
    PRIMARY_COLOR_OPTIONS.find(
      (item) => item.value.toLowerCase() === String(value || "").toLowerCase(),
    ) || PRIMARY_COLOR_OPTIONS[0];

  return (
    <View style={s.field}>
      <Text style={s.label}>Primary Color</Text>
      <TouchableOpacity
        style={s.colorSelect}
        activeOpacity={0.86}
        onPress={() => setOpen((current) => !current)}
      >
        <View style={[s.colorSwatch, { backgroundColor: selected.value }]} />
        <View style={{ flex: 1 }}>
          <Text style={s.colorName}>{selected.name}</Text>
          <Text style={s.colorHex}>{selected.value}</Text>
        </View>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={C.muted} />
      </TouchableOpacity>

      {open ? (
        <View style={s.colorMenu}>
          {PRIMARY_COLOR_OPTIONS.map((item) => {
            const active = item.value === selected.value;
            return (
              <TouchableOpacity
                key={item.value}
                style={[s.colorOption, active && s.colorOptionActive]}
                activeOpacity={0.85}
                onPress={() => {
                  onChange(item.value);
                  setOpen(false);
                }}
              >
                <View style={[s.colorSwatchSmall, { backgroundColor: item.value }]} />
                <View style={{ flex: 1 }}>
                  <Text style={s.colorOptionName}>{item.name}</Text>
                  <Text style={s.colorOptionHex}>{item.value}</Text>
                </View>
                {active ? <Ionicons name="checkmark-circle" size={18} color={C.dark} /> : null}
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function addressText(address: any): string {
  if (!address) return "";
  if (typeof address === "string") return address;
  if (typeof address !== "object") return String(address);
  const keys = [
    "address_line",
    "addressLine",
    "line1",
    "street",
    "area",
    "city",
    "district",
    "state",
    "pincode",
    "pin_code",
  ];
  return keys
    .map((key) => address[key])
    .filter(Boolean)
    .map((value) => String(value).trim())
    .filter(Boolean)
    .join(", ");
}

function adminDefaults(user: any): Partial<StatementTemplateSettings> {
  return {
    business_name: user?.farm_name || user?.business_name || user?.name || "",
    address: addressText(user?.business_address || user?.address),
    phone: user?.support_contact || user?.phone || "",
    email: user?.email || "",
  };
}

export default function StatementTemplateScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ from?: string }>();
  const [form, setForm] = useState<StatementTemplateSettings>(DEFAULT_TEMPLATE);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const fallback = adminDefaults(user);
    try {
      const data = await api.getStatementTemplate();
      setForm({ ...DEFAULT_TEMPLATE, ...fallback, ...data });
    } catch (error: any) {
      setForm((prev) => ({ ...DEFAULT_TEMPLATE, ...prev, ...fallback }));
      if (error?.status !== 404) {
        Alert.alert("Could not load template", error?.message || "Please try again.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const goBack = useCallback(() => {
    if (params.from === "settings") {
      router.replace("/(admin)/settings" as any);
      return;
    }
    router.back();
  }, [params.from, router]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        goBack();
        return true;
      });
      return () => sub.remove();
    }, [goBack]),
  );

  const setField = (key: keyof StatementTemplateSettings) => (value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const pickLogo = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Please allow photo access to add a logo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.65,
      base64: true,
    });
    if (!result.canceled && result.assets?.[0]?.base64) {
      setField("logo_base64")(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const save = async () => {
    if (!String(form.business_name || "").trim()) {
      Alert.alert("Business name required", "Please enter the name shown on statements.");
      return;
    }
    try {
      setSaving(true);
      const saved = await api.saveStatementTemplate({
        ...form,
        business_name: String(form.business_name || "").trim(),
        primary_color: form.primary_color || "#BB6B3F",
      });
      setForm({ ...DEFAULT_TEMPLATE, ...saved });
      Alert.alert("Saved", "Statement template updated successfully.");
    } catch (error: any) {
      Alert.alert("Could not save", error?.message || "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={s.center}>
        <ActivityIndicator color={C.primary} />
      </SafeAreaView>
    );
  }

  const logo = imageUri(form.logo_base64);

  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={goBack}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Statement Template</Text>
          <Text style={s.subtitle}>Brand wallet statements for customers</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={C.primary}
            />
          }
        >
          <View style={s.previewCard}>
            <View style={[s.previewStripe, { backgroundColor: form.primary_color || C.dark }]} />
            <View style={s.logoPreview}>
              {logo ? (
                <Image source={{ uri: logo }} style={s.logoImage} />
              ) : (
                <Ionicons name="image-outline" size={24} color={C.dark} />
              )}
            </View>
            <View style={s.previewBody}>
              <Text style={s.previewTitle}>{form.business_name || "Gau Satva Farm"}</Text>
              <Text style={s.previewSub}>{form.tagline || "Wallet statement"}</Text>
              <Text style={s.previewSmall}>Wallet statement header preview</Text>
            </View>
          </View>

          <View style={s.section}>
            <View style={s.sectionHead}>
              <Ionicons name="image-outline" size={18} color={C.dark} />
              <Text style={s.sectionTitle}>Logo</Text>
            </View>
            <TouchableOpacity style={s.logoPicker} onPress={pickLogo} activeOpacity={0.86}>
              {logo ? (
                <Image source={{ uri: logo }} style={s.logoPickerImage} />
              ) : (
                <View style={s.logoPickerEmpty}>
                  <Ionicons name="cloud-upload-outline" size={24} color={C.dark} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={s.logoPickerTitle}>{logo ? "Change Logo" : "Upload Logo"}</Text>
                <Text style={s.logoPickerSub}>Shown on customer wallet statements.</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={C.muted} />
            </TouchableOpacity>
            {logo ? (
              <TouchableOpacity
                style={s.removeLogoBtn}
                onPress={() => setField("logo_base64")("")}
              >
                <Ionicons name="trash-outline" size={14} color={C.red} />
                <Text style={s.removeLogoText}>Remove logo</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={s.section}>
            <View style={s.sectionHead}>
              <Ionicons name="business-outline" size={18} color={C.dark} />
              <Text style={s.sectionTitle}>Statement Header</Text>
            </View>
            <Field label="Business Name" value={form.business_name} onChangeText={setField("business_name")} placeholder="Gau Satva Farm" />
            <Field label="Tagline" value={form.tagline} onChangeText={setField("tagline")} placeholder="Wallet statement" />
            <Field label="Business Address" value={form.address} onChangeText={setField("address")} placeholder="Street, city, state" multiline />
            <Field label="Phone" value={form.phone} onChangeText={setField("phone")} placeholder="+91..." keyboardType="phone-pad" />
            <Field label="Email" value={form.email} onChangeText={setField("email")} placeholder="billing@example.com" keyboardType="email-address" />
          </View>

          <View style={s.section}>
            <View style={s.sectionHead}>
              <Ionicons name="color-palette-outline" size={18} color={C.dark} />
              <Text style={s.sectionTitle}>Design & Footer</Text>
            </View>
            <PrimaryColorDropdown value={form.primary_color} onChange={setField("primary_color")} />
            <ToggleRow
              title="Show Summary"
              subtitle="Opening balance, total added and total spent will appear."
              value={form.show_summary !== false}
              onValueChange={setField("show_summary")}
            />
            <View style={s.thinDivider} />
            <ToggleRow
              title="Show Footer"
              subtitle="Footer note will appear at the end of statement."
              value={form.show_footer !== false}
              onValueChange={setField("show_footer")}
            />
            <Field label="Footer Note" value={form.footer_note} onChangeText={setField("footer_note")} placeholder="This is a computer generated wallet statement." multiline />
          </View>
        </ScrollView>

        <View style={s.footer}>
          <TouchableOpacity
            style={[s.saveBtn, saving && { opacity: 0.65 }]}
            activeOpacity={0.85}
            onPress={save}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="save-outline" size={18} color="#fff" />
                <Text style={s.saveText}>Save Template</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.bg },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingVertical: 14 },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  title: { fontSize: 22, fontWeight: "900", color: C.text },
  subtitle: { fontSize: 12, fontWeight: "700", color: C.muted, marginTop: 2 },
  content: { padding: 18, paddingBottom: 104 },
  previewCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
    marginBottom: 14,
    paddingRight: 16,
  },
  previewStripe: { width: 8, alignSelf: "stretch" },
  previewBody: { flex: 1, paddingVertical: 16, paddingRight: 10 },
  previewTitle: { fontSize: 18, fontWeight: "900", color: C.text },
  previewSub: { fontSize: 12, fontWeight: "700", color: C.muted, marginTop: 3 },
  previewSmall: { fontSize: 10.5, fontWeight: "900", color: C.dark, marginTop: 10 },
  logoPreview: {
    width: 58,
    height: 58,
    borderRadius: 18,
    marginHorizontal: 14,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logoImage: { width: "100%", height: "100%" },
  section: {
    backgroundColor: C.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    marginBottom: 14,
  },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: "900", color: C.text },
  logoPicker: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: C.bg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
  },
  logoPickerImage: { width: 52, height: 52, borderRadius: 14, backgroundColor: C.card },
  logoPickerEmpty: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
  },
  logoPickerTitle: { fontSize: 14, fontWeight: "900", color: C.text },
  logoPickerSub: { fontSize: 11.5, fontWeight: "600", color: C.muted, marginTop: 2 },
  removeLogoBtn: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", marginTop: 10, paddingVertical: 7, paddingHorizontal: 10 },
  removeLogoText: { fontSize: 12, fontWeight: "900", color: C.red },
  field: { marginBottom: 12 },
  label: { fontSize: 11, fontWeight: "900", color: C.muted, marginBottom: 6, textTransform: "uppercase" },
  colorSelect: {
    minHeight: 52,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bg,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  colorSwatch: { width: 28, height: 28, borderRadius: 10, borderWidth: 2, borderColor: C.card },
  colorName: { fontSize: 14, fontWeight: "900", color: C.text },
  colorHex: { marginTop: 1, fontSize: 11, fontWeight: "800", color: C.muted },
  colorMenu: {
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
    overflow: "hidden",
  },
  colorOption: {
    minHeight: 50,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  colorOptionActive: { backgroundColor: C.bg },
  colorSwatchSmall: { width: 22, height: 22, borderRadius: 8 },
  colorOptionName: { fontSize: 13, fontWeight: "900", color: C.text },
  colorOptionHex: { marginTop: 1, fontSize: 10.5, fontWeight: "800", color: C.muted },
  input: {
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bg,
    paddingHorizontal: 12,
    color: C.text,
    fontSize: 14,
    fontWeight: "700",
  },
  textArea: { minHeight: 82, paddingTop: 12, textAlignVertical: "top" },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 },
  toggleTitle: { fontSize: 14, fontWeight: "900", color: C.text },
  toggleSub: { fontSize: 11.5, fontWeight: "600", color: C.muted, lineHeight: 16, marginTop: 2 },
  thinDivider: { height: 1, backgroundColor: C.border, marginVertical: 4 },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 18,
    backgroundColor: C.bg,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  saveBtn: {
    height: 52,
    borderRadius: 16,
    backgroundColor: C.dark,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  saveText: { fontSize: 15, fontWeight: "900", color: "#fff" },
});
