import React, { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export type HistoryFilter = { type: string; period: string };
export const defaultHistoryFilter: HistoryFilter = { type: "all", period: "all" };
export function matchesWalletHistory(item: any, filter: HistoryFilter, request = false) {
  const type = String(item.type || "").toLowerCase();
  const status = String(item.status || "pending").toLowerCase();
  if (["credit", "debit"].includes(filter.type) && (request || type !== filter.type)) return false;
  if (["pending", "approved", "rejected"].includes(filter.type) && (!request || status !== filter.type)) return false;
  if (filter.period !== "all") {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    if (filter.period !== "today") start.setDate(start.getDate() - Number(filter.period) + 1);
    const date = new Date(item.created_at).getTime();
    if (!Number.isFinite(date) || date < start.getTime() || date > now.getTime()) return false;
  }
  return true;
}

export default function WalletHistoryFilter({ value, onChange, requests = false }: {
  value: HistoryFilter; onChange: (value: HistoryFilter) => void; requests?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const [draft, setDraft] = useState(value);
  const active = value.type !== "all" || value.period !== "all";
  const options = (field: keyof HistoryFilter, rows: string[][]) => <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{rows.map(([key, label]) => <Pressable key={key} accessibilityRole="radio" accessibilityState={{ checked: draft[field] === key }} onPress={() => setDraft(prev => ({ ...prev, [field]: key }))} style={{ padding: 12, borderWidth: 1, borderColor: draft[field] === key ? "#BB6B3F" : "#ddd", borderRadius: 6, backgroundColor: draft[field] === key ? "#FFF0E5" : "white" }}><Text>{label}</Text></Pressable>)}</View>;
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={active ? "Transaction filters active" : "Filter transactions"} onPress={() => { setDraft(value); setVisible(true); }} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center", backgroundColor: active ? "#FFE1CC" : "#FFF8F4", borderRadius: 6, marginLeft: 8 }}><Ionicons name="filter-outline" size={21} color="#BB6B3F" />{active && <View style={{ position: "absolute", right: 6, top: 6, width: 6, height: 6, borderRadius: 3, backgroundColor: "#BB6B3F" }} />}</Pressable>
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "#0006" }}>
        <Pressable style={{ position: "absolute", width: "100%", height: "100%" }} onPress={() => setVisible(false)} accessibilityLabel="Dismiss filters" />
        <SafeAreaView edges={["bottom"]} style={{ backgroundColor: "white", padding: 20, maxHeight: "85%", borderTopLeftRadius: 8, borderTopRightRadius: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}><Text style={{ fontSize: 18, fontWeight: "700" }}>Filter Transactions</Text><Pressable accessibilityLabel="Close filters" onPress={() => setVisible(false)} style={{ padding: 12 }}><Ionicons name="close" size={24} /></Pressable></View>
          <ScrollView><Text style={{ marginVertical: 14, fontWeight: "600" }}>Transaction Type</Text>{options("type", [["all", "All"], ["credit", "Credit"], ["debit", "Debit"], ...(requests ? [["pending", "Pending Requests"], ["approved", "Approved Requests"], ["rejected", "Rejected Requests"]] : [])])}
          <Text style={{ marginVertical: 14, fontWeight: "600" }}>Period</Text>{options("period", [["all", "All Time"], ["today", "Today"], ["7", "Last 7 Days"], ["30", "Last 30 Days"], ["90", "Last 90 Days"]])}</ScrollView>
          <View style={{ flexDirection: "row", gap: 12, marginTop: 24 }}><Pressable onPress={() => setDraft(defaultHistoryFilter)} style={{ padding: 14 }}><Text>Reset</Text></Pressable><Pressable onPress={() => { onChange(draft); setVisible(false); }} style={{ flex: 1, backgroundColor: "#BB6B3F", padding: 14, alignItems: "center", borderRadius: 6 }}><Text style={{ color: "white", fontWeight: "700" }}>Apply Filters</Text></Pressable></View>
        </SafeAreaView>
      </View>
    </Modal>
  </>;
}
