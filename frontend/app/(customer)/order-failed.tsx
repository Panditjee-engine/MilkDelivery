import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Colors } from "../../src/constants/colors";

function first(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function money(value?: string | string[]) {
  const amount = Number(first(value) || 0);
  return `₹${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function OrderFailedScreen() {
  const params = useLocalSearchParams<{
    amount?: string;
    reason?: string;
    method?: string;
  }>();
  const reason = first(params.reason);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons name="close" size={56} color="#fff" />
        </View>

        <Text style={styles.title}>Order Failed</Text>
        <Text style={styles.subtitle}>
          Your order was not created. If online payment was selected, no order will be placed until payment is successful.
        </Text>

        <View style={styles.summary}>
          <View style={styles.row}>
            <Text style={styles.label}>Attempted amount</Text>
            <Text style={styles.value}>{money(params.amount)}</Text>
          </View>
          {params.method ? (
            <>
              <View style={styles.divider} />
              <View style={styles.row}>
                <Text style={styles.label}>Payment method</Text>
                <Text style={styles.value}>{first(params.method)}</Text>
              </View>
            </>
          ) : null}
          {reason ? (
            <>
              <View style={styles.divider} />
              <Text style={styles.label}>Reason</Text>
              <Text style={styles.reason}>{reason}</Text>
            </>
          ) : null}
        </View>

        <TouchableOpacity
          style={styles.primaryBtn}
          activeOpacity={0.88}
          onPress={() => router.replace("/(customer)/catalog")}
        >
          <Ionicons name="refresh-outline" size={20} color="#fff" />
          <Text style={styles.primaryText}>Try Again</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          activeOpacity={0.85}
          onPress={() => router.replace("/(customer)/subscriptions")}
        >
          <Text style={styles.secondaryText}>View My Orders</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1, padding: 24, alignItems: "center", justifyContent: "center" },
  iconWrap: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: "#dc2626",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#dc2626",
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  title: { marginTop: 24, fontSize: 28, fontWeight: "900", color: Colors.text, textAlign: "center" },
  subtitle: { marginTop: 8, fontSize: 15, color: Colors.textSecondary, textAlign: "center", lineHeight: 22 },
  summary: {
    width: "100%",
    marginTop: 28,
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 18,
  },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  label: { fontSize: 13, color: Colors.textSecondary, fontWeight: "700" },
  value: { fontSize: 16, color: Colors.text, fontWeight: "900", textAlign: "right" },
  divider: { height: 1, backgroundColor: Colors.divider, marginVertical: 14 },
  reason: { marginTop: 6, fontSize: 13, color: Colors.text, lineHeight: 19 },
  primaryBtn: {
    marginTop: 28,
    width: "100%",
    height: 54,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryText: { color: "#fff", fontSize: 16, fontWeight: "900" },
  secondaryBtn: { marginTop: 12, height: 48, alignItems: "center", justifyContent: "center" },
  secondaryText: { color: Colors.textSecondary, fontSize: 15, fontWeight: "800" },
});
