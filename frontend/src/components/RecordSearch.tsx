import React from "react";
import { View, TextInput, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export function matchesRecordSearch(query: string, fields: unknown[]) {
  const text = fields.filter(value => value != null).join(" ").toLowerCase().replace(/_/g, " ");
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean).every(term => text.includes(term));
}

export default function RecordSearch({ value, onChange, placeholder }: {
  value: string; onChange: (value: string) => void; placeholder: string;
}) {
  return <View style={{ flexDirection: "row", alignItems: "center", marginHorizontal: 20, marginVertical: 10, paddingHorizontal: 12, minHeight: 46, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8, backgroundColor: "white", gap: 8 }}>
    <Ionicons name="search-outline" size={19} color="#6B7280" />
    <TextInput value={value} onChangeText={onChange} placeholder={placeholder} accessibilityLabel={placeholder} autoCorrect={false} autoCapitalize="none" returnKeyType="search" maxLength={120} style={{ flex: 1, minWidth: 0, fontSize: 14, color: "#111827", paddingVertical: 10 }} />
    {value.length > 0 && <Pressable onPress={() => onChange("")} accessibilityLabel="Clear search" accessibilityRole="button" hitSlop={10} style={{ padding: 6 }}><Ionicons name="close-circle" size={20} color="#6B7280" /></Pressable>}
  </View>;
}
