import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Image,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../../src/services/api";

const C = {
  bg: "#FFF8F4",
  card: "#fff",
  primary: "#FF9675",
  dark: "#BB6B3F",
  accent: "#8B6854",
  muted: "#A07850",
  light: "#C9A882",
  peach: "#FFF3E8",
  deepPeach: "#FFE8D6",
  text: "#1A1A1A",
  success: "#388E3C",
  danger: "#dc2626",
  warn: "#D97706",
};

const STATUS_FILTERS = ["", "pending", "approved", "rejected"];

function imageBase64Uri(value?: string) {
  if (!value) return "";
  if (value.startsWith("http") || value.startsWith("data:image")) return value;
  return `data:image/jpeg;base64,${value}`;
}

function requestId(item: any) {
  return String(item?.id || item?._id || item?.request_id || "");
}

function statusColor(status?: string) {
  if (status === "approved") return C.success;
  if (status === "rejected") return C.danger;
  return C.warn;
}

function paymentStatusColor(status?: string) {
  const value = String(status || "").toLowerCase();
  if (["paid", "captured"].includes(value)) return C.success;
  if (["failed", "signature_failed"].includes(value)) return C.danger;
  if (["authorized", "credit_processing"].includes(value)) return C.warn;
  return C.muted;
}

export default function WalletPaymentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ from?: string }>();
  const [qr, setQr] = useState<any>(null);
  const [label, setLabel] = useState("");
  const [pickedFile, setPickedFile] = useState<any>(null);
  const [pickedPreview, setPickedPreview] = useState("");
  const [requests, setRequests] = useState<any[]>([]);
  const [razorpaySummary, setRazorpaySummary] = useState<any>(null);
  const [status, setStatus] = useState("");
  const [noteById, setNoteById] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingQr, setSavingQr] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [qrData, rechargeData, razorpayData] = await Promise.all([
        api.getMyPaymentQr().catch(() => null),
        api.getAdminRechargeRequests(status || undefined),
        api.getRazorpaySettlementSummary().catch(() => null),
      ]);
      setQr(qrData || null);
      setLabel(qrData?.label || "");
      setRequests(Array.isArray(rechargeData) ? rechargeData : []);
      setRazorpaySummary(razorpayData || null);
    } catch (error: any) {
      Alert.alert("Load Failed", error?.message || "Could not load wallet payment data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [status]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const goBack = useCallback(() => {
    if (params.from === "settings") {
      router.replace("/(admin)/settings" as any);
      return;
    }
    router.back();
  }, [params.from, router]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        goBack();
        return true;
      });
      return () => sub.remove();
    }, [goBack]),
  );

  const pickQrImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Needed", "Please allow photo access to upload payment QR.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    const mimeType = asset.mimeType || "image/jpeg";
    const name = asset.fileName || `payment-qr.${mimeType.includes("png") ? "png" : "jpg"}`;
    setPickedPreview(asset.uri);
    setPickedFile({ uri: asset.uri, name, type: mimeType });
  };

  const saveQr = async () => {
    if (!label.trim()) {
      Alert.alert("Missing Label", "Please enter a payment QR label.");
      return;
    }
    if (!pickedFile && !qr) {
      Alert.alert("Missing QR", "Please select a QR image first.");
      return;
    }
    if (!pickedFile) {
      Alert.alert("No New Image", "Please select a new QR image to upload.");
      return;
    }
    setSavingQr(true);
    try {
      if (qr?.qr_image_base64) {
        await api.updatePaymentQr({ file: pickedFile, label: label.trim() });
      } else {
        await api.createPaymentQr({ file: pickedFile, label: label.trim() });
      }
      setPickedFile(null);
      setPickedPreview("");
      await loadData();
      Alert.alert("Saved", "Payment QR saved successfully.");
    } catch (error: any) {
      Alert.alert("Save Failed", error?.message || "Could not save payment QR.");
    } finally {
      setSavingQr(false);
    }
  };

  const confirmUpdateRequest = (item: any, nextStatus: string) => {
    const id = requestId(item);
    if (!id) return;
    Alert.alert(
      nextStatus === "approved" ? "Approve Recharge?" : "Reject Recharge?",
      `This request will be marked as ${nextStatus}.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: nextStatus === "approved" ? "Approve" : "Reject",
          style: nextStatus === "rejected" ? "destructive" : "default",
          onPress: async () => {
            setUpdatingId(id);
            try {
              await api.updateRechargeRequest(id, {
                status: nextStatus,
                note: noteById[id] || "",
              });
              await loadData();
              Alert.alert("Updated", "Recharge request updated successfully.");
            } catch (error: any) {
              Alert.alert("Update Failed", error?.message || "Could not update request.");
            } finally {
              setUpdatingId(null);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={goBack}>
          <Ionicons name="arrow-back" size={20} color={C.dark} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Wallet Payment</Text>
          <Text style={s.subtitle}>Payment QR and recharge requests</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadData();
              }}
              tintColor={C.primary}
            />
          }
        >
          <View style={s.card}>
            <View style={s.cardHeader}>
              <View style={s.iconBox}>
                <Ionicons name="qr-code-outline" size={20} color={C.dark} />
              </View>
              <View>
                <Text style={s.cardTitle}>Payment QR</Text>
                <Text style={s.cardSub}>Upload QR image with label</Text>
              </View>
            </View>

            <View style={s.qrPreview}>
              {pickedPreview || qr?.qr_image_base64 ? (
                <Image
                  source={{ uri: pickedPreview || imageBase64Uri(qr?.qr_image_base64) }}
                  style={s.qrImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={s.qrEmpty}>
                  <Ionicons name="image-outline" size={34} color={C.light} />
                  <Text style={s.emptyText}>No payment QR uploaded</Text>
                </View>
              )}
            </View>

            <Text style={s.label}>Label</Text>
            <TextInput
              style={s.input}
              value={label}
              onChangeText={setLabel}
              placeholder="Example: UPI QR, Bank QR"
              placeholderTextColor={C.light}
            />

            {qr?.updated_at ? (
              <Text style={s.metaText}>Last updated: {String(qr.updated_at)}</Text>
            ) : null}

            <View style={s.qrActions}>
              <TouchableOpacity style={s.secondaryBtn} onPress={pickQrImage}>
                <Ionicons name="image-outline" size={16} color={C.dark} />
                <Text style={s.secondaryText}>Choose QR</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.primaryBtn, savingQr && { opacity: 0.65 }]}
                onPress={saveQr}
                disabled={savingQr}
              >
                {savingQr ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="cloud-upload-outline" size={16} color="#fff" />
                    <Text style={s.primaryText}>{qr ? "Update" : "Upload"}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={s.liveCard}>
            <View style={s.cardHeader}>
              <View style={[s.iconBox, { backgroundColor: "#E8F5E9" }]}>
                <Ionicons name="radio-outline" size={20} color={C.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle}>Razorpay Live Status</Text>
                <Text style={s.cardSub}>
                  Paid ₹{razorpaySummary?.total_paid ?? 0} · Pending {razorpaySummary?.pending_count ?? 0}
                </Text>
              </View>
            </View>

            {(razorpaySummary?.recent_payments || []).slice(0, 5).length ? (
              (razorpaySummary?.recent_payments || []).slice(0, 5).map((item: any) => {
                const current = item.status || item.razorpay_payment_status || "created";
                return (
                  <View key={item.id || item.razorpay_order_id} style={s.paymentRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.paymentTitle} numberOfLines={1}>
                        ₹{item.amount || 0} · {item.type || "payment"}
                      </Text>
                      <Text style={s.paymentSub} numberOfLines={2}>
                        {item.razorpay_payment_id || item.razorpay_order_id || "Waiting for Razorpay"}{item.last_webhook_event ? ` · ${item.last_webhook_event}` : ""}
                      </Text>
                      {item.razorpay_failure_reason ? (
                        <Text style={s.failureText} numberOfLines={2}>
                          {item.razorpay_failure_reason}
                        </Text>
                      ) : null}
                    </View>
                    <View
                      style={[
                        s.statusPill,
                        { backgroundColor: paymentStatusColor(current) + "18" },
                      ]}
                    >
                      <Text
                        style={[
                          s.statusText,
                          { color: paymentStatusColor(current) },
                        ]}
                      >
                        {current}
                      </Text>
                    </View>
                  </View>
                );
              })
            ) : (
              <Text style={s.emptyText}>No Razorpay payments yet</Text>
            )}
          </View>

          <View style={s.listHead}>
            <Text style={s.listTitle}>Recharge Requests</Text>
            <View style={s.countPill}>
              <Text style={s.countText}>{requests.length}</Text>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.filterRow}
          >
            {STATUS_FILTERS.map((item) => (
              <TouchableOpacity
                key={item || "all"}
                style={[s.filterChip, status === item && s.filterChipActive]}
                onPress={() => {
                  setStatus(item);
                  setLoading(true);
                }}
              >
                <Text
                  style={[
                    s.filterText,
                    status === item && s.filterTextActive,
                  ]}
                >
                  {item ? item : "all"}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {loading ? (
            <View style={s.centerBox}>
              <ActivityIndicator color={C.primary} />
              <Text style={s.centerText}>Loading requests...</Text>
            </View>
          ) : requests.length === 0 ? (
            <View style={s.centerBox}>
              <Ionicons name="wallet-outline" size={30} color={C.light} />
              <Text style={s.centerText}>No recharge requests found</Text>
            </View>
          ) : (
            requests.map((item) => {
              const id = requestId(item);
              const currentStatus = item.status || "pending";
              return (
                <View key={id || JSON.stringify(item)} style={s.requestCard}>
                  <View style={s.requestTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.requestTitle}>
                        {item.customer_name || item.user_name || item.name || "Customer"}
                      </Text>
                      <Text style={s.requestSub}>
                        ₹{item.amount ?? item.recharge_amount ?? "0"} ·{" "}
                        {item.created_at || item.date || ""}
                      </Text>
                    </View>
                    <View
                      style={[
                        s.statusPill,
                        { backgroundColor: statusColor(currentStatus) + "18" },
                      ]}
                    >
                      <Text
                        style={[
                          s.statusText,
                          { color: statusColor(currentStatus) },
                        ]}
                      >
                        {currentStatus}
                      </Text>
                    </View>
                  </View>

                  <TextInput
                    style={s.noteInput}
                    value={noteById[id] || ""}
                    onChangeText={(text) =>
                      setNoteById((prev) => ({ ...prev, [id]: text }))
                    }
                    placeholder="Add note for this request"
                    placeholderTextColor={C.light}
                  />

                  <View style={s.requestActions}>
                    <TouchableOpacity
                      style={[s.requestBtn, s.approveBtn]}
                      onPress={() => confirmUpdateRequest(item, "approved")}
                      disabled={updatingId === id}
                    >
                      <Text style={s.approveText}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.requestBtn, s.rejectBtn]}
                      onPress={() => confirmUpdateRequest(item, "rejected")}
                      disabled={updatingId === id}
                    >
                      <Text style={s.rejectText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.deepPeach,
  },
  title: { fontSize: 22, fontWeight: "900", color: C.text },
  subtitle: { fontSize: 12, fontWeight: "600", color: C.muted, marginTop: 2 },
  scroll: { paddingHorizontal: 16, paddingBottom: 36 },
  card: {
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: C.deepPeach,
    shadowColor: C.dark,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  liveCard: {
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: C.deepPeach,
    marginTop: 14,
    shadowColor: C.dark,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: C.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontSize: 16, fontWeight: "900", color: C.text },
  cardSub: { fontSize: 11, color: C.muted, fontWeight: "600", marginTop: 2 },
  qrPreview: {
    height: 210,
    borderRadius: 18,
    backgroundColor: "#FFFDFB",
    borderWidth: 1,
    borderColor: C.deepPeach,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: 14,
  },
  qrImage: { width: "100%", height: "100%" },
  qrEmpty: { alignItems: "center", gap: 8 },
  emptyText: { fontSize: 12, fontWeight: "700", color: C.light },
  label: {
    fontSize: 11,
    fontWeight: "900",
    color: C.accent,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#FFFDFB",
    borderWidth: 1,
    borderColor: C.deepPeach,
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 48,
    fontSize: 14,
    fontWeight: "700",
    color: C.text,
  },
  metaText: { marginTop: 8, fontSize: 11, color: C.muted, fontWeight: "600" },
  qrActions: { flexDirection: "row", gap: 10, marginTop: 14 },
  secondaryBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: C.peach,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  secondaryText: { fontSize: 13, fontWeight: "900", color: C.dark },
  primaryBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: C.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  primaryText: { fontSize: 13, fontWeight: "900", color: "#fff" },
  listHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 22,
    marginBottom: 10,
  },
  listTitle: { fontSize: 16, fontWeight: "900", color: C.text },
  countPill: {
    minWidth: 34,
    height: 30,
    borderRadius: 10,
    backgroundColor: C.peach,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  countText: { fontSize: 13, fontWeight: "900", color: C.dark },
  filterRow: { gap: 8, paddingBottom: 12 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.deepPeach,
  },
  filterChipActive: { backgroundColor: C.dark, borderColor: C.dark },
  filterText: { fontSize: 12, fontWeight: "800", color: C.muted, textTransform: "capitalize" },
  filterTextActive: { color: "#fff" },
  centerBox: { minHeight: 145, alignItems: "center", justifyContent: "center", gap: 8 },
  centerText: { fontSize: 13, fontWeight: "700", color: C.light },
  requestCard: {
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.deepPeach,
    padding: 14,
    marginBottom: 12,
  },
  requestTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  requestTitle: { fontSize: 14, fontWeight: "900", color: C.text, marginBottom: 4 },
  requestSub: { fontSize: 12, color: C.muted, fontWeight: "700" },
  paymentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: C.peach,
  },
  paymentTitle: { fontSize: 13, fontWeight: "900", color: C.text },
  paymentSub: { marginTop: 3, fontSize: 11, fontWeight: "700", color: C.muted },
  failureText: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: "800",
    color: C.danger,
  },
  statusPill: { borderRadius: 10, paddingHorizontal: 9, paddingVertical: 5 },
  statusText: { fontSize: 10, fontWeight: "900", textTransform: "capitalize" },
  noteInput: {
    marginTop: 12,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: "#FFFDFB",
    borderWidth: 1,
    borderColor: C.deepPeach,
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: "700",
    color: C.text,
  },
  requestActions: { flexDirection: "row", gap: 8, marginTop: 12 },
  requestBtn: {
    flex: 1,
    minHeight: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  approveBtn: { backgroundColor: "#E8F5E9" },
  rejectBtn: { backgroundColor: "#FEE2E2" },
  approveText: { fontSize: 12, fontWeight: "900", color: C.success },
  rejectText: { fontSize: 12, fontWeight: "900", color: C.danger },
});
