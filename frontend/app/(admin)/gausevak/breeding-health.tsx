import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";

const C = {
  bg: "#FFF8EF",
  text: "#3D1F0A",
  textMuted: "#A07850",
  card: "#FFFFFF",
  border: "#F1E3D0",
};

const ITEMS = [
  {
    id: "insemination",
    title: "Insemination",
    subtitle: "Breeding cycles and pregnancy flow",
    route: "/(admin)/gausevak/insemination",
    icon: "flask",
    gradient: ["#1a1a2e", "#16213e"] as const,
    accent: "#7b8cde",
  },
  {
    id: "semen",
    title: "Semen Record",
    subtitle: "Doses, conceptions and lab logs",
    route: "/(admin)/gausevak/semen",
    icon: "document-text",
    gradient: ["#2b1b17", "#6b3c2e"] as const,
    accent: "#e07a5f",
  },
  {
    id: "medical",
    title: "Medical",
    subtitle: "Treatments, vaccines and issue history",
    route: "/(admin)/gausevak/medical",
    icon: "medkit",
    gradient: ["#1c2b3a", "#243b55"] as const,
    accent: "#56b4d3",
  },
];

export default function BreedingHealthScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={18} color={C.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Breeding & Health</Text>
          <Text style={styles.subtitle}>Manage breeding records and medical operations</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {ITEMS.map((item) => (
          <TouchableOpacity
            key={item.id}
            activeOpacity={0.85}
            onPress={() => router.push(item.route as any)}
            style={styles.cardWrap}
          >
            <LinearGradient
              colors={item.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.card}
            >
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: item.accent + "24", borderColor: item.accent + "44" },
                ]}
              >
                <Ionicons name={item.icon as any} size={24} color={item.accent} />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={[styles.cardSubtitle, { color: item.accent + "dd" }]}>
                  {item.subtitle}
                </Text>
              </View>
              <View style={[styles.arrowPill, { backgroundColor: item.accent + "18" }]}>
                <Ionicons name="arrow-forward" size={14} color={item.accent} />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ))}

        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={18} color={C.textMuted} />
          <Text style={styles.infoText}>
            Use this section for insemination, semen records, and medical history.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 14,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: C.text,
    letterSpacing: -0.4,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    color: C.textMuted,
    fontWeight: "500",
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  cardWrap: {
    marginBottom: 14,
  },
  card: {
    borderRadius: 24,
    padding: 20,
    minHeight: 150,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginBottom: 18,
  },
  cardText: {
    paddingRight: 46,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#f4fbff",
    letterSpacing: -0.4,
  },
  cardSubtitle: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 19,
  },
  arrowPill: {
    position: "absolute",
    right: 16,
    bottom: 16,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  infoCard: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
  },
  infoText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    color: C.textMuted,
    fontWeight: "500",
  },
});
