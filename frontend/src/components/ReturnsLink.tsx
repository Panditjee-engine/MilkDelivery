import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
export default function ReturnsLink({ role }: { role: "customer" | "admin" | "delivery" }) {
  const router = useRouter();
  return <TouchableOpacity accessibilityRole="button" onPress={() => router.push(`/(${role})/returns` as any)} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 16, marginVertical: 12, backgroundColor: "#fff", borderColor: "#F1E3D0", borderWidth: 1, borderRadius: 8 }}>
    <Ionicons name="swap-horizontal-outline" size={24} color="#BB6B3F" />
    <View style={{ flex: 1 }}><Text style={{ color: "#3D1F0A", fontSize: 15, fontWeight: "700" }}>Returns & Exchanges</Text><Text style={{ color: "#76685D", fontSize: 12, marginTop: 3 }}>Bottles, products and pickup requests</Text></View>
    <Ionicons name="chevron-forward" size={18} color="#BB6B3F" />
  </TouchableOpacity>;
}
