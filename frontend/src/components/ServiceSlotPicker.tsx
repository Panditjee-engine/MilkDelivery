import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export const isServiceProduct = (product: any) => String(product?.category || "").toLowerCase() === "service";
export const productStock = (product: any, fallback = 0) => isServiceProduct(product) ? Infinity : (product?.stock ?? fallback);
const hourLabel = (hour: number) => `${hour % 12 || 12} ${hour < 12 ? "AM" : "PM"}`;
export default function ServiceSlotPicker({ value, onChange }: { value: string; onChange: (slot: string) => void }) {
  const match = /^(\d{2}):00-(\d{2}):00$/.exec(value);
  const duration = match ? Number(match[2]) - Number(match[1]) : 1;
  const start = match ? Number(match[1]) : 6;
  const slot = (hour: number, hours: number) => `${String(hour).padStart(2, "0")}:00-${String(hour + hours).padStart(2, "0")}:00`;
  return <View style={s.section}>
    <Text style={s.title}>Service Duration</Text>
    <View style={s.row}>{[1, 2, 3].map(hours => <TouchableOpacity accessibilityRole="radio" accessibilityState={{ checked: duration === hours }} key={hours} style={[s.option, duration === hours && s.selected]} onPress={() => onChange(slot(Math.min(start, 18-hours), hours))}><Text>{hours} {hours === 1 ? "hour" : "hours"}</Text></TouchableOpacity>)}</View>
    <Text style={s.title}>Appointment Time</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>{Array.from({ length: 13-duration }, (_, index) => index+6).map(hour => <TouchableOpacity key={hour} accessibilityRole="radio" accessibilityState={{ checked: value === slot(hour, duration) }} style={[s.option, value === slot(hour, duration) && s.selected]} onPress={() => onChange(slot(hour, duration))}><Text>{hourLabel(hour)} - {hourLabel(hour+duration)}</Text></TouchableOpacity>)}</ScrollView>
  </View>;
}
const s = StyleSheet.create({ section: { gap: 10, marginVertical: 14 }, title: { fontSize: 14, fontWeight: "700", color: "#3D1F0A" }, row: { flexDirection: "row", gap: 8 }, option: { minHeight: 44, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: "#E5D8CC", justifyContent: "center", backgroundColor: "white" }, selected: { borderColor: "#BB6B3F", backgroundColor: "#FFF0E4" } });
