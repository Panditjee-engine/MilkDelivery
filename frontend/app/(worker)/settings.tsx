import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "../../src/contexts/AuthContext";
import { useLang } from "../../src/contexts/LanguageContext";
import { ExtraWorkModal } from "./index";

const COLORS = {
  bg: "#FFF8EE",
  surface: "#FFFFFF",
  text: "#111827",
  sub: "#6B7280",
  border: "#F1D9B8",
  primary: "#BB6B3F",
  amber: "#FFBF55",
  light: "#FFF3DC",
  green: "#16A34A",
  red: "#DC2626",
  indigo: "#4F46E5",
};

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string | null;
}) {
  if (!value) return null;
  return (
    <View style={st.infoRow}>
      <View style={st.infoIcon}>
        <Ionicons name={icon} size={16} color={COLORS.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={st.infoLabel}>{label}</Text>
        <Text style={st.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function WorkerSettingsScreen() {
  const router = useRouter();
  const { worker, workerLogout } = useAuth();
  const { lang, toggleLang } = useLang();
  const [extraWorkOpen, setExtraWorkOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const isHindi = lang === "hi";
  const initials =
    worker?.name
      ?.split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "W";

  const handleLogout = async () => {
    setLogoutOpen(false);
    await workerLogout();
    router.replace("/(auth)/login");
  };

  return (
    <View style={st.screen}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <LinearGradient
        colors={[COLORS.primary, COLORS.amber]}
        style={st.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity style={st.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={st.headerTitle}>{isHindi ? "सेटिंग्स" : "Settings"}</Text>
          <Text style={st.headerSub}>
            {isHindi ? "प्रोफाइल, कार्य और भाषा" : "Profile, tasks and language"}
          </Text>
        </View>
        <View style={st.headerIcon}>
          <Ionicons name="settings-outline" size={22} color="#fff" />
        </View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={st.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={st.profileCard}>
          <LinearGradient
            colors={[COLORS.primary, COLORS.amber]}
            style={st.avatar}
          >
            <Text style={st.avatarText}>{initials}</Text>
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={st.name}>{worker?.name || (isHindi ? "वर्कर" : "Worker")}</Text>
            <Text style={st.role}>
              {worker?.designation || (isHindi ? "गौसेवक" : "GauSevak Worker")}
            </Text>
          </View>
        </View>

        <View style={st.card}>
          <Text style={st.cardTitle}>{isHindi ? "प्रोफाइल विवरण" : "Profile Details"}</Text>
          <InfoRow icon="mail-outline" label="Email" value={worker?.email} />
          <InfoRow icon="call-outline" label={isHindi ? "फोन" : "Phone"} value={worker?.phone} />
          <InfoRow
            icon="business-outline"
            label={isHindi ? "फार्म" : "Farm"}
            value={worker?.farm_name}
          />
          <InfoRow
            icon="shield-checkmark-outline"
            label={isHindi ? "स्थिति" : "Status"}
            value={worker?.is_verified ? (isHindi ? "वेरिफाइड" : "Verified") : (isHindi ? "वेरिफिकेशन बाकी" : "Pending verification")}
          />
        </View>

        <TouchableOpacity
          style={st.extraCard}
          activeOpacity={0.85}
          onPress={() => setExtraWorkOpen(true)}
        >
          <View style={st.extraIcon}>
            <MaterialCommunityIcons name="clipboard-plus-outline" size={26} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.extraTitle}>{isHindi ? "अतिरिक्त कार्य" : "Extra Task"}</Text>
            <Text style={st.extraSub}>
              {isHindi ? "आज का अतिरिक्त काम दर्ज करें" : "Add or review today's extra work"}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.sub} />
        </TouchableOpacity>

        <View style={st.card}>
          <Text style={st.cardTitle}>{isHindi ? "भाषा बदलें" : "Change Language"}</Text>
          <View style={st.langToggle}>
            <TouchableOpacity
              style={[st.langOption, lang === "en" && st.langOptionActive]}
              onPress={() => lang !== "en" && toggleLang()}
              activeOpacity={0.8}
            >
              <Text style={[st.langText, lang === "en" && st.langTextActive]}>English</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[st.langOption, lang === "hi" && st.langOptionActive]}
              onPress={() => lang !== "hi" && toggleLang()}
              activeOpacity={0.8}
            >
              <Text style={[st.langText, lang === "hi" && st.langTextActive]}>Hindi</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={st.logoutBtn}
          onPress={() => setLogoutOpen(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="log-out-outline" size={20} color={COLORS.red} />
          <Text style={st.logoutText}>{isHindi ? "लॉगआउट" : "Logout"}</Text>
        </TouchableOpacity>
      </ScrollView>

      <ExtraWorkModal
        visible={extraWorkOpen}
        onClose={() => setExtraWorkOpen(false)}
      />

      <Modal visible={logoutOpen} transparent animationType="fade">
        <View style={st.modalOverlay}>
          <View style={st.logoutSheet}>
            <View style={st.logoutIconWrap}>
              <Ionicons name="log-out-outline" size={28} color={COLORS.red} />
            </View>
            <Text style={st.logoutTitle}>{isHindi ? "लॉगआउट करें?" : "Logout?"}</Text>
            <Text style={st.logoutMsg}>
              {isHindi ? "क्या आप वाकई अपने खाते से बाहर जाना चाहते हैं?" : "Are you sure you want to sign out of this account?"}
            </Text>
            <View style={st.modalActions}>
              <TouchableOpacity style={st.cancelBtn} onPress={() => setLogoutOpen(false)}>
                <Text style={st.cancelText}>{isHindi ? "रद्द करें" : "Cancel"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.confirmBtn} onPress={handleLogout}>
                <Text style={st.confirmText}>{isHindi ? "लॉगआउट" : "Logout"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    paddingTop: 54,
    paddingHorizontal: 20,
    paddingBottom: 26,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 25, fontWeight: "900", color: "#fff" },
  headerSub: { fontSize: 13, color: "rgba(255,255,255,0.86)", marginTop: 3 },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  content: { padding: 18, paddingBottom: 36, gap: 14 },
  profileCard: {
    marginTop: -4,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 22, fontWeight: "900", color: "#fff" },
  name: { fontSize: 20, fontWeight: "900", color: COLORS.text },
  role: { fontSize: 13, color: COLORS.sub, marginTop: 4, fontWeight: "600" },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: COLORS.text,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#F3E7D6",
  },
  infoIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: COLORS.light,
    alignItems: "center",
    justifyContent: "center",
  },
  infoLabel: { fontSize: 11, color: COLORS.sub, fontWeight: "800", textTransform: "uppercase" },
  infoValue: { fontSize: 14, color: COLORS.text, fontWeight: "700", marginTop: 2 },
  extraCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  extraIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  extraTitle: { fontSize: 16, fontWeight: "900", color: COLORS.text },
  extraSub: { fontSize: 12.5, color: COLORS.sub, marginTop: 3, lineHeight: 18 },
  langToggle: {
    flexDirection: "row",
    backgroundColor: COLORS.light,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  langOption: {
    flex: 1,
    height: 44,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  langOptionActive: {
    backgroundColor: COLORS.surface,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  langText: { fontSize: 14, color: COLORS.sub, fontWeight: "800" },
  langTextActive: { color: COLORS.primary },
  logoutBtn: {
    height: 54,
    borderRadius: 16,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  logoutText: { fontSize: 16, fontWeight: "900", color: COLORS.red },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.48)",
    justifyContent: "center",
    alignItems: "center",
    padding: 26,
  },
  logoutSheet: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 22,
    alignItems: "center",
  },
  logoutIconWrap: {
    width: 62,
    height: 62,
    borderRadius: 22,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  logoutTitle: { fontSize: 21, fontWeight: "900", color: COLORS.text },
  logoutMsg: {
    fontSize: 14,
    color: COLORS.sub,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 20,
  },
  modalActions: { flexDirection: "row", gap: 10, width: "100%" },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: { fontSize: 15, fontWeight: "900", color: COLORS.text },
  confirmBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.red,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmText: { fontSize: 15, fontWeight: "900", color: "#fff" },
});
