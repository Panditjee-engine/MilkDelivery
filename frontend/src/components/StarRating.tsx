import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function StarRating({
  value,
  onChange,
  size = 20,
  color = "#F59E0B",
  readOnly = false,
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
  color?: string;
  readOnly?: boolean;
}) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          disabled={readOnly}
          onPress={() => onChange?.(star)}
          hitSlop={6}
        >
          <Ionicons
            name={star <= value ? "star" : "star-outline"}
            size={size}
            color={color}
            style={{ marginRight: 2 }}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
});