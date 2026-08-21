import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
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
import { api, InvoiceTemplateSettings } from "../../src/services/api";

const C = {
  bg: "#FFF8F4",
  card: "#FFFFFF",
  primary: "#FF9675",
  dark: "#BB6B3F",
  text: "#1A1A1A",
  muted: "#A07850",
  border: "#FFE8D6",
  green: "#16A34A",
  red: "#DC2626",
};

const DEFAULT_TEMPLATE: InvoiceTemplateSettings = {
  business_name: "",
  tagline: "",
  address: "",
  phone: "",
  email: "",
  gstin: "",
  footer_note: "",
  terms: "",
  primary_color: "#BB6B3F",
  show_payment_details: true,
  show_terms: true,
};

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

export default function InvoiceTemplateScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ from?: string }>();
  const [form, setForm] = useState<InvoiceTemplateSettings>(DEFAULT_TEMPLATE);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.getInvoiceTemplate();
      setForm({ ...DEFAULT_TEMPLATE, ...data });
    } catch (error: any) {
      Alert.alert("Could not load template", error?.message || "Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

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

  const setField = (key: keyof InvoiceTemplateSettings) => (value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const save = async () => {
    if (!String(form.business_name || "").trim()) {
      Alert.alert("Business name required", "Please enter the seller name shown on invoices.");
      return;
    }
    try {
      setSaving(true);
      const saved = await api.saveInvoiceTemplate({
        ...form,
        business_name: String(form.business_name || "").trim(),
        primary_color: form.primary_color || "#BB6B3F",
      });
      setForm({ ...DEFAULT_TEMPLATE, ...saved });
      Alert.alert("Saved", "Invoice template updated successfully.");
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

  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={goBack}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Invoice Template</Text>
          <Text style={s.subtitle}>Customize order and subscription PDFs</Text>
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
            <View style={s.previewBody}>
              <Text style={s.previewTitle}>{form.business_name || "Gau Satva Farm"}</Text>
              <Text style={s.previewSub}>{form.tagline || "Fresh dairy delivered with care"}</Text>
              <Text style={s.previewSmall}>Invoice header preview</Text>
            </View>
            <Ionicons name="receipt-outline" size={26} color={form.primary_color || C.dark} />
          </View>

          <View style={s.section}>
            <View style={s.sectionHead}>
              <Ionicons name="business-outline" size={18} color={C.dark} />
              <Text style={s.sectionTitle}>Invoice Header</Text>
            </View>
            <Field label="Business Name" value={form.business_name} onChangeText={setField("business_name")} placeholder="Gau Satva Farm" />
            <Field label="Tagline" value={form.tagline} onChangeText={setField("tagline")} placeholder="Fresh dairy delivered with care" />
            <Field label="Business Address" value={form.address} onChangeText={setField("address")} placeholder="Street, city, state" multiline />
            <Field label="Phone" value={form.phone} onChangeText={setField("phone")} placeholder="+91..." keyboardType="phone-pad" />
            <Field label="Email" value={form.email} onChangeText={setField("email")} placeholder="billing@example.com" keyboardType="email-address" />
            <Field label="GSTIN" value={form.gstin} onChangeText={setField("gstin")} placeholder="Optional tax registration number" />
          </View>

          <View style={s.section}>
            <View style={s.sectionHead}>
              <Ionicons name="color-palette-outline" size={18} color={C.dark} />
              <Text style={s.sectionTitle}>Design & Visibility</Text>
            </View>
            <Field label="Primary Color" value={form.primary_color} onChangeText={setField("primary_color")} placeholder="#BB6B3F" />
            <ToggleRow
              title="Show Payment Details"
              subtitle="Payment method and status will appear on invoice."
              value={form.show_payment_details !== false}
              onValueChange={setField("show_payment_details")}
            />
            <View style={s.thinDivider} />
            <ToggleRow
              title="Show Terms"
              subtitle="Terms text will appear near the footer."
              value={form.show_terms !== false}
              onValueChange={setField("show_terms")}
            />
          </View>

          <View style={s.section}>
            <View style={s.sectionHead}>
              <Ionicons name="document-text-outline" size={18} color={C.dark} />
              <Text style={s.sectionTitle}>Footer</Text>
            </View>
            <Field label="Footer Note" value={form.footer_note} onChangeText={setField("footer_note")} placeholder="Thank you for your order." multiline />
            <Field label="Terms" value={form.terms} onChangeText={setField("terms")} placeholder="This is a computer generated invoice." multiline />
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
  previewBody: { flex: 1, padding: 16 },
  previewTitle: { fontSize: 18, fontWeight: "900", color: C.text },
  previewSub: { fontSize: 12, fontWeight: "700", color: C.muted, marginTop: 3 },
  previewSmall: { fontSize: 10.5, fontWeight: "900", color: C.dark, marginTop: 10 },
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
  field: { marginBottom: 12 },
  label: { fontSize: 11, fontWeight: "900", color: C.muted, marginBottom: 6, textTransform: "uppercase" },
  input: {
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: "#FFF8F4",
    paddingHorizontal: 12,
    color: C.text,
    fontSize: 14,
    fontWeight: "700",
  },
  textArea: {
    minHeight: 82,
    paddingTop: 12,
    textAlignVertical: "top",
  },
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
