import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

// Save as: app/(admin)/gausevak/semen.tsx
export default function SemenScreen() {
  const router = useRouter();
  const accent = "#e07a5f";
  return (
    <View style={[styles.screen, { backgroundColor: "#1a100d" }]}>
      <StatusBar barStyle="light-content" />
      <View
        style={[
          styles.topBar,
          {
            paddingTop:
              Platform.OS === "ios" ? 56 : (StatusBar.currentHeight ?? 0) + 12,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#cde" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Semen Record</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={styles.body}>
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: accent + "18", borderColor: accent + "44" },
          ]}
        >
          <Ionicons name="document-text" size={40} color={accent} />
        </View>
        <Text style={[styles.sectionTitle, { color: accent }]}>
          Semen Record
        </Text>
        <Text style={styles.hint}>Lab data & logs coming soon.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.07)",
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#e8f4f8",
    letterSpacing: -0.3,
  },
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 22, fontWeight: "800", letterSpacing: -0.4 },
  hint: {
    fontSize: 14,
    color: "#4a6a8a",
    textAlign: "center",
    fontWeight: "500",
  },
});
