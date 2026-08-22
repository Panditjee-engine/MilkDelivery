import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../src/contexts/AuthContext";
import { api } from "../../src/services/api";
import { Colors } from "../../src/constants/colors";
import Button from "../../src/components/Button";
import Input from "../../src/components/Input";

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const saveProfile = async () => {
    if (!name.trim()) {
      Alert.alert("Name required", "Please enter your name.");
      return;
    }
    setSaving(true);
    try {
      await api.updateProfile({
        name: name.trim(),
        phone: phone.trim(),
      });
      updateUser({ name: name.trim(), phone: phone.trim() } as any);
      Alert.alert("Profile updated", "Your profile has been saved.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert("Could not update profile", error?.message || "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const deleteAccount = () => {
    if (!password.trim()) {
      Alert.alert("Password required", "Enter your password to delete your account.");
      return;
    }

    Alert.alert(
      "Delete Account?",
      "This will permanently delete your Gau Satva account and personal profile data. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await api.deleteAccount(password);
              router.replace("/(auth)/login");
            } catch (error: any) {
              Alert.alert(
                "Could not delete account",
                error?.message || "Please check your password and try again.",
              );
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.avatarCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {name.trim()?.charAt(0).toUpperCase() || "U"}
              </Text>
            </View>
            <Text style={styles.avatarName}>{name || "Your profile"}</Text>
            <Text style={styles.avatarSub}>{user?.email || "Update your details"}</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.iconBox}>
                <Ionicons name="person-outline" size={18} color={Colors.primary} />
              </View>
              <Text style={styles.cardTitle}>Profile Details</Text>
            </View>
            <Input
              label="Name"
              value={name}
              onChangeText={setName}
              placeholder="Your name"
            />
            <Input
              label="Phone"
              value={phone}
              onChangeText={setPhone}
              placeholder="Phone number"
              keyboardType="phone-pad"
            />
            <Button
              title={saving ? "Saving..." : "Save Changes"}
              onPress={saveProfile}
              loading={saving}
              disabled={saving}
              style={{ marginTop: 10 }}
            />
          </View>

          <View style={[styles.card, styles.dangerCard]}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, styles.dangerIconBox]}>
                <Ionicons name="trash-outline" size={18} color="#DC2626" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.dangerTitle}>Delete Account</Text>
                <Text style={styles.dangerText}>
                  This option is permanent. Enter your password only if you want to delete your account.
                </Text>
              </View>
            </View>
            <Input
              label="Password"
              placeholder="Enter password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <TouchableOpacity
              style={[styles.deleteBtn, deleting && styles.disabledBtn]}
              onPress={deleteAccount}
              disabled={deleting}
              activeOpacity={0.86}
            >
              <Ionicons name="trash-outline" size={17} color="#DC2626" />
              <Text style={styles.deleteBtnText}>
                {deleting ? "Deleting..." : "Delete Account"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F4F6" },
  header: {
    height: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#EFEFEF",
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F5F5",
  },
  headerTitle: { fontSize: 18, fontWeight: "900", color: "#1F2937" },
  headerSpacer: { width: 38 },
  content: { padding: 16, paddingBottom: 34 },
  avatarCard: {
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 18,
    backgroundColor: "#fff",
    borderRadius: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },
  avatar: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: { fontSize: 30, fontWeight: "900", color: "#fff" },
  avatarName: { fontSize: 18, fontWeight: "900", color: "#111827" },
  avatarSub: { marginTop: 3, fontSize: 13, color: "#6B7280" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.primary + "12",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontSize: 16, fontWeight: "900", color: "#1F2937" },
  dangerCard: {
    marginTop: 8,
    borderColor: "#FECACA",
    backgroundColor: "#FFF7F7",
  },
  dangerIconBox: { backgroundColor: "#FEE2E2" },
  dangerTitle: { fontSize: 15, fontWeight: "900", color: "#991B1B" },
  dangerText: {
    marginTop: 3,
    fontSize: 12.5,
    lineHeight: 18,
    color: "#7F1D1D",
  },
  deleteBtn: {
    marginTop: 10,
    height: 48,
    borderRadius: 15,
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FECACA",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  disabledBtn: { opacity: 0.65 },
  deleteBtnText: { fontSize: 14.5, fontWeight: "900", color: "#DC2626" },
});
