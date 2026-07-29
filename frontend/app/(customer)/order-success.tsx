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

function paymentLabel(method?: string) {
  switch ((method || "").toLowerCase()) {
    case "online":
      return "Online Payment";
    case "cash_on_delivery":
    case "cod":
      return "Cash on Delivery";
    case "wallet":
      return "Wallet";
    default:
      return "Payment";
  }
}

export default function OrderSuccessScreen() {
  const params = useLocalSearchParams<{
    amount?: string;
    items?: string;
    method?: string;
    type?: string;
    paymentId?: string;
  }>();
  const isSubscription = first(params.type) === "subscription";

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons name="checkmark" size={58} color="#fff" />
        </View>

        <Text style={styles.title}>Order Placed</Text>
        <Text style={styles.subtitle}>
          {isSubscription
            ? "Your subscription has been created successfully."
            : "Your order has been created successfully."}
        </Text>

        <View style={styles.summary}>
          <View style={styles.row}>
            <Text style={styles.label}>Amount</Text>
            <Text style={styles.value}>{money(params.amount)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.label}>Items</Text>
            <Text style={styles.value}>{first(params.items) || "1"}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.label}>Payment</Text>
            <Text style={styles.value}>{paymentLabel(first(params.method))}</Text>
          </View>
          {params.paymentId ? (
            <>
              <View style={styles.divider} />
              <Text style={styles.label}>Payment ID</Text>
              <Text style={styles.paymentId}>{first(params.paymentId)}</Text>
            </>
          ) : null}
        </View>

        <TouchableOpacity
          style={styles.primaryBtn}
          activeOpacity={0.88}
          onPress={() => router.replace("/(customer)/subscriptions")}
        >
          <Ionicons name="receipt-outline" size={20} color="#fff" />
          <Text style={styles.primaryText}>View My Orders</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          activeOpacity={0.85}
          onPress={() => router.replace("/(customer)/catalog")}
        >
          <Text style={styles.secondaryText}>Continue Shopping</Text>
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
    backgroundColor: "#16a34a",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#16a34a",
    shadowOpacity: 0.28,
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
  paymentId: { marginTop: 6, fontSize: 12, color: Colors.text, fontWeight: "700" },
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
