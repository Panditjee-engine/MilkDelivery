import React from "react";
import { StyleSheet, Text } from "react-native";
import { isNewProduct } from "../utils/newProducts";

export default function NewProductBadge({ product }: { product: { created_at?: string } }) {
  return isNewProduct(product) ? <Text style={styles.badge}>NEW</Text> : null;
}

const styles = StyleSheet.create({
  badge: { alignSelf: "flex-start", backgroundColor: "#DCFCE7", color: "#166534",
    fontSize: 9, lineHeight: 13, fontWeight: "800", paddingHorizontal: 5,
    borderRadius: 4, marginBottom: 3 },
});
