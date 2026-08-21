import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../../src/services/api";

const C = {
  bg: "#FFF8F4",
  card: "#FFFFFF",
  primary: "#FF9675",
  dark: "#BB6B3F",
  text: "#1A1A1A",
  muted: "#A07850",
  border: "#FFE8D6",
  green: "#16A34A",
  blue: "#2563EB",
  amber: "#D97706",
};

const DEFAULT_METHODS = {
  wallet: true,
  online: true,
  cash_on_delivery: false,
};

const METHODS = [
  {
    key: "wallet",
    title: "Wallet",
    desc: "Customers pay using Gau Satva wallet balance.",
    icon: "wallet-outline",
    color: C.green,
  },
  {
    key: "online",
    title: "Online Payment",
    desc: "Razorpay UPI, card, netbanking and payment apps.",
    icon: "card-outline",
    color: C.blue,
  },
  {
    key: "cash_on_delivery",
    title: "Cash on Delivery",
    desc: "Customers pay directly when delivery is completed.",
    icon: "cash-outline",
    color: C.amber,
  },
] as const;

type MethodKey = keyof typeof DEFAULT_METHODS;

export default function AdminAppSettingsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ from?: string }>();
  const [methods, setMethods] = useState(DEFAULT_METHODS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingKey, setSavingKey] = useState<MethodKey | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.getAdminAppSettings();
      setMethods({
        ...DEFAULT_METHODS,
        ...(data?.payment_methods || {}),
      });
    } catch (error: any) {
      Alert.alert("Could not load settings", error?.message || "Please try again.");
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

  const toggleMethod = async (key: MethodKey) => {
    const next = { ...methods, [key]: !methods[key] };
    if (!Object.values(next).some(Boolean)) {
      Alert.alert("One method required", "At least one payment method must stay active.");
      return;
    }

    const previous = methods;
    setMethods(next);
    setSavingKey(key);
    try {
      const saved = await api.saveAdminAppSettings({ payment_methods: next });
      setMethods({
        ...DEFAULT_METHODS,
        ...(saved?.payment_methods || {}),
      });
      setSavedAt(new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      }));
    } catch (error: any) {
      setMethods(previous);
      Alert.alert("Could not save", error?.message || "Please try again.");
    } finally {
      setSavingKey(null);
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
          <Text style={s.title}>App Settings</Text>
          <Text style={s.subtitle}>Manage customer payment methods</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={s.content}
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
        <View style={s.infoCard}>
          <Ionicons name="phone-portrait-outline" size={22} color={C.dark} />
          <View style={{ flex: 1 }}>
            <Text style={s.infoTitle}>Customer checkout behavior</Text>
            <Text style={s.infoText}>
              Enabled methods are shown in catalog checkout and disabled methods are blocked from ordering.
            </Text>
          </View>
        </View>

        <View style={s.card}>
          {METHODS.map((item, index) => {
            const enabled = methods[item.key];
            const saving = savingKey === item.key;
            return (
              <View key={item.key}>
                {index > 0 ? <View style={s.divider} /> : null}
                <View style={s.methodRow}>
                  <View style={[s.methodIcon, { backgroundColor: item.color + "18" }]}>
                    <Ionicons name={item.icon as any} size={20} color={item.color} />
                  </View>
                  <View style={s.methodBody}>
                    <Text style={s.methodTitle}>{item.title}</Text>
                    <Text style={s.methodDesc}>{item.desc}</Text>
                    <Text style={[s.stateText, { color: enabled ? C.green : "#DC2626" }]}>
                      {saving ? "Updating..." : enabled ? "Visible to customers" : "Hidden from customers"}
                    </Text>
                  </View>
                  <Switch
                    value={enabled}
                    onValueChange={() => toggleMethod(item.key)}
                    disabled={Boolean(savingKey)}
                    trackColor={{ false: "#E5D5CB", true: C.primary + "99" }}
                    thumbColor={enabled ? C.dark : "#FFFFFF"}
                  />
                </View>
              </View>
            );
          })}
        </View>

        <View style={s.savedCard}>
          <Ionicons name="shield-checkmark-outline" size={18} color={C.green} />
          <Text style={s.savedText}>
            {savedAt ? `Last saved at ${savedAt}` : "Changes save instantly when you toggle a method."}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
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
  content: { padding: 18, paddingBottom: 34 },
  infoCard: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#FFF1E8",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 14,
  },
  infoTitle: { fontSize: 14, fontWeight: "900", color: C.text },
  infoText: { fontSize: 12, fontWeight: "600", color: C.muted, lineHeight: 17, marginTop: 3 },
  card: {
    backgroundColor: C.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
  },
  divider: { height: 1, backgroundColor: C.border, marginLeft: 72 },
  methodRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  methodIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  methodBody: { flex: 1 },
  methodTitle: { fontSize: 15, fontWeight: "900", color: C.text },
  methodDesc: { fontSize: 11.5, fontWeight: "600", color: C.muted, lineHeight: 16, marginTop: 2 },
  stateText: { fontSize: 11, fontWeight: "900", marginTop: 5 },
  savedCard: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F0FDF4",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  savedText: { flex: 1, fontSize: 12, fontWeight: "800", color: "#166534" },
});
