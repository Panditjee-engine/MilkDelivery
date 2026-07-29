import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  Modal,
  Animated,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Image,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Sharing from "expo-sharing";
import ViewShot, { captureRef } from "react-native-view-shot";
import { useAuth } from "../../../src/contexts/AuthContext";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { api, FarmSale, PaymentMethod } from "../../../src/services/api";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function fmtShortDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const UNIT_OPTIONS = ["kg", "L", "pcs"] as const;

// ─── Modern Alert ─────────────────────────────────────────────────────────────

interface AlertConfig {
  visible: boolean;
  title: string;
  message: string;
  icon?: string;
  iconColor?: string;
  iconBg?: string;
}

function ModernAlert({
  config,
  onClose,
}: {
  config: AlertConfig;
  onClose: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (config.visible) {
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          damping: 15,
          stiffness: 200,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [config.visible]);

  if (!config.visible) return null;

  return (
    <Modal visible={config.visible} transparent animationType="none">
      <View style={al.overlay}>
        <Animated.View
          style={[al.card, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}
        >
          <View style={[al.iconWrap, { backgroundColor: config.iconBg ?? "#fee2e2" }]}>
            <Ionicons
              name={(config.icon ?? "alert-circle-outline") as any}
              size={28}
              color={config.iconColor ?? "#ef4444"}
            />
          </View>
          <Text style={al.title}>{config.title}</Text>
          <Text style={al.message}>{config.message}</Text>
          <TouchableOpacity style={al.btn} onPress={onClose} activeOpacity={0.85}>
            <Text style={al.btnText}>OK</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

function useModernAlert() {
  const [config, setConfig] = useState<AlertConfig>({
    visible: false,
    title: "",
    message: "",
  });
  const show = (
    title: string,
    message: string,
    icon?: string,
    iconColor?: string,
    iconBg?: string,
  ) => setConfig({ visible: true, title, message, icon, iconColor, iconBg });
  const hide = () => setConfig((p) => ({ ...p, visible: false }));
  return { config, show, hide };
}

const al = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 22,
    width: "100%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 16,
  },
  iconWrap: {
    width: 62,
    height: 62,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 22,
    fontWeight: "500",
  },
  btn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#111827",
    alignItems: "center",
  },
  btnText: { fontSize: 15, fontWeight: "800", color: "#fff" },
});

// ─── Undo/Delete Confirm Modal ────────────────────────────────────────────────

function UndoConfirmModal({
  visible,
  sale,
  onConfirm,
  onCancel,
  loading,
}: {
  visible: boolean;
  sale: FarmSale | null;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.88);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          damping: 14,
          stiffness: 220,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible || !sale) return null;

  return (
    <Modal visible={visible} transparent animationType="none">
      <View style={uc.overlay}>
        <Animated.View
          style={[uc.card, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}
        >
          <View style={uc.iconRing}>
            <View style={uc.iconInner}>
              <Ionicons name="trash" size={24} color="#ef4444" />
            </View>
          </View>

          <Text style={uc.title}>Delete Sale Entry?</Text>
          <Text style={uc.subtitle}>This will permanently remove the sale for</Text>

          <View style={uc.chip}>
            <Ionicons name="person" size={14} color="#374151" />
            <Text style={uc.chipName}>{sale.customer_name}</Text>
            <View style={uc.chipDivider} />
            <Text style={uc.chipTag}>{sale.product_name}</Text>
            <View style={uc.chipDivider} />
            <Text style={uc.chipQty}>₹{sale.total_amount.toFixed(0)}</Text>
          </View>

          <Text style={uc.warn}>
            This sale will be removed from the total and cannot be recovered.
          </Text>

          <View style={uc.btnRow}>
            <TouchableOpacity
              style={uc.cancelBtn}
              onPress={onCancel}
              activeOpacity={0.75}
              disabled={loading}
            >
              <Text style={uc.cancelTxt}>Keep it</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[uc.confirmBtn, loading && { opacity: 0.7 }]}
              onPress={onConfirm}
              activeOpacity={0.8}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="trash" size={15} color="#fff" />
                  <Text style={uc.confirmTxt}>Yes, Delete</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const uc = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.52)",
    justifyContent: "center",
    alignItems: "center",
    padding: 28,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 26,
    paddingHorizontal: 22,
    paddingTop: 30,
    paddingBottom: 24,
    width: "100%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 10 },
    elevation: 18,
  },
  iconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: "#fca5a5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  iconInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#fee2e2",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 20, fontWeight: "900", color: "#111827", marginBottom: 6 },
  subtitle: { fontSize: 13, color: "#6b7280", fontWeight: "500", marginBottom: 14 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#f9fafb",
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  chipName: { fontSize: 14, fontWeight: "800", color: "#111827" },
  chipTag: { fontSize: 12, fontWeight: "700", color: "#6b7280" },
  chipQty: { fontSize: 13, fontWeight: "800", color: "#4f46e5" },
  chipDivider: { width: 1, height: 14, backgroundColor: "#e5e7eb" },
  warn: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 22,
    paddingHorizontal: 8,
  },
  btnRow: { flexDirection: "row", gap: 10, width: "100%" },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    alignItems: "center",
    backgroundColor: "#f9fafb",
  },
  cancelTxt: { fontSize: 14, fontWeight: "800", color: "#374151" },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#ef4444",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  confirmTxt: { fontSize: 14, fontWeight: "800", color: "#fff" },
});

// ─── Number Stepper ───────────────────────────────────────────────────────────

function NumberStepper({
  value,
  onChange,
  step = 1,
  placeholder = "0",
}: {
  value: string;
  onChange: (v: string) => void;
  step?: number;
  placeholder?: string;
}) {
  const bump = (dir: 1 | -1) => {
    const cur = parseFloat(value) || 0;
    const next = Math.max(0, Math.round((cur + dir * step) * 100) / 100);
    onChange(String(next));
  };

  return (
    <View style={ns.wrap}>
      <TextInput
        style={ns.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        keyboardType="decimal-pad"
      />
      <View style={ns.stepperCol}>
        <TouchableOpacity style={ns.stepperBtn} onPress={() => bump(1)}>
          <Ionicons name="chevron-up" size={14} color="#6b7280" />
        </TouchableOpacity>
        <View style={ns.stepperDivider} />
        <TouchableOpacity style={ns.stepperBtn} onPress={() => bump(-1)}>
          <Ionicons name="chevron-down" size={14} color="#6b7280" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const ns = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "stretch",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    backgroundColor: "#fff",
    height: 44,
  },
  input: { flex: 1, paddingHorizontal: 12, fontSize: 14, color: "#111827" },
  stepperCol: { borderLeftWidth: 1, borderLeftColor: "#e5e7eb", width: 32 },
  stepperBtn: { flex: 1, alignItems: "center", justifyContent: "center" },
  stepperDivider: { height: 1, backgroundColor: "#e5e7eb" },
});

// ─── Receipt Viewer Modal (still used for legacy receipt_image on old entries) ─

function ReceiptViewerModal({
  visible,
  imageUri,
  onClose,
}: {
  visible: boolean;
  imageUri: string | null;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState<"share" | "download" | null>(null);
  const { config: alertConfig, show: showAlert, hide: hideAlert } = useModernAlert();

  const writeToTempFile = async (uri: string) => {
    const FileSystem = require("expo-file-system");
    const base64Data = uri.includes(",") ? uri.split(",")[1] : uri;
    const fileUri = `${FileSystem.cacheDirectory}receipt_${Date.now()}.jpg`;
    await FileSystem.writeAsStringAsync(fileUri, base64Data, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return fileUri;
  };

  const handleShare = async () => {
    if (!imageUri) return;
    setBusy("share");
    try {
      const fileUri = await writeToTempFile(imageUri);
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        showAlert("Something Went Wrong", "Could not share the receipt.", "share-outline", "#ef4444", "#fee2e2");
        return;
      }
      await Sharing.shareAsync(fileUri, { mimeType: "image/jpeg" });
    } catch (err) {
      showAlert("Something Went Wrong", "Could not share the receipt.", "share-outline", "#ef4444", "#fee2e2");
    } finally {
      setBusy(null);
    }
  };

  const handleDownload = async () => {
    if (!imageUri) return;
    setBusy("download");
    try {
      const MediaLibrary = require("expo-media-library");
      const perm = await MediaLibrary.requestPermissionsAsync();
      if (!perm.granted) {
        showAlert("Permission Needed", "Allow gallery access to save the receipt.", "images-outline", "#6b7280", "#f3f4f6");
        return;
      }
      const fileUri = await writeToTempFile(imageUri);
      const asset = await MediaLibrary.createAssetAsync(fileUri);
      await MediaLibrary.createAlbumAsync("Farm Sale Receipts", asset, false);
      showAlert("Saved", "Receipt has been saved to your gallery.", "checkmark-circle-outline", "#16a34a", "#dcfce7");
    } catch (err) {
      showAlert("Something Went Wrong", "Could not save the receipt.", "download-outline", "#ef4444", "#fee2e2");
    } finally {
      setBusy(null);
    }
  };

  if (!imageUri) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <ModernAlert config={alertConfig} onClose={hideAlert} />
      <View style={rv.overlay}>
        <View style={rv.header}>
          <Text style={rv.headerTitle}>Receipt</Text>
          <TouchableOpacity onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={rv.imageWrap}>
          <Image source={{ uri: imageUri }} style={rv.image} resizeMode="contain" />
        </View>
        <View style={rv.actionRow}>
          <TouchableOpacity style={rv.actionBtn} onPress={handleShare} disabled={busy !== null}>
            {busy === "share" ? (
              <ActivityIndicator size="small" color="#111827" />
            ) : (
              <>
                <Ionicons name="share-outline" size={18} color="#111827" />
                <Text style={rv.actionBtnText}>Share</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[rv.actionBtn, rv.actionBtnPrimary]}
            onPress={handleDownload}
            disabled={busy !== null}
          >
            {busy === "download" ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="download-outline" size={18} color="#fff" />
                <Text style={[rv.actionBtnText, { color: "#fff" }]}>Download</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const rv = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.92)" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 16, fontWeight: "800", color: "#fff" },
  imageWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  image: { width: "100%", height: "100%" },
  actionRow: { flexDirection: "row", gap: 10, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 36 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 14,
  },
  actionBtnPrimary: { backgroundColor: "#4f46e5" },
  actionBtnText: { fontSize: 14, fontWeight: "800", color: "#111827" },
});

// ─── Auto-generated / on-demand Receipt Modal ────────────────────────────────

type ReceiptPreviewData = {
  customer_name: string;
  product_name: string;
  quantity: number;
  unit: string;
  price_per_unit: number;
  total_amount: number;
  payment_method?: PaymentMethod;
  worker_name?: string;
  date: string;
};

function SuccessReceiptModal({
  visible,
  sale,
  farmName,
  onClose,
  title = "Sale Recorded",
  subtitle = "Receipt generated successfully",
}: {
  visible: boolean;
  sale: ReceiptPreviewData | null;
  farmName: string;
  onClose: () => void;
  title?: string;
  subtitle?: string;
}) {
  const shotRef = useRef<any>(null);
  const [sharing, setSharing] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.9);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          damping: 14,
          stiffness: 200,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible || !sale) return null;

  const handleShare = async () => {
    if (sharing || !shotRef.current) return;
    setSharing(true);
    try {
      const uri = await captureRef(shotRef.current, {
        format: "png",
        quality: 1,
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "image/png",
          dialogTitle: "Share Receipt",
        });
      }
    } catch (e) {
      // non-critical — sharing failing shouldn't block the flow
    } finally {
      setSharing(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={rc.overlay}>
        <Animated.View
          style={[rc.card, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}
        >
          <ViewShot ref={shotRef} style={rc.shotWrap}>
            <View style={rc.receiptBody}>
              <View style={rc.successIconRing}>
                <View style={rc.successIconInner}>
                  <Ionicons name="checkmark" size={26} color="#fff" />
                </View>
              </View>
              <Text style={rc.successTitle}>{title}</Text>
              <Text style={rc.successSub}>{subtitle}</Text>

              <View style={rc.divider} />

              <View style={rc.headerRow}>
                <Text style={rc.farmName}>{farmName}</Text>
                <Text style={rc.dateText}>{fmtShortDate(sale.date)}</Text>
              </View>

              <View style={rc.rowsBlock}>
                <View style={rc.row}>
                  <Text style={rc.rowLabel}>Customer</Text>
                  <Text style={rc.rowValue}>{sale.customer_name}</Text>
                </View>
                <View style={rc.row}>
                  <Text style={rc.rowLabel}>Product</Text>
                  <Text style={rc.rowValue}>{sale.product_name}</Text>
                </View>
                <View style={rc.row}>
                  <Text style={rc.rowLabel}>Quantity</Text>
                  <Text style={rc.rowValue}>
                    {sale.quantity} {sale.unit}
                  </Text>
                </View>
                <View style={rc.row}>
                  <Text style={rc.rowLabel}>Price / unit</Text>
                  <Text style={rc.rowValue}>₹{sale.price_per_unit.toFixed(2)}</Text>
                </View>
                <View style={rc.row}>
                  <Text style={rc.rowLabel}>Payment Mode</Text>
                  <Text style={rc.rowValue}>
                    {sale.payment_method === "upi" ? "UPI" : "Cash"}
                  </Text>
                </View>
                {sale.worker_name ? (
                  <View style={rc.row}>
                    <Text style={rc.rowLabel}>Recorded By</Text>
                    <Text style={rc.rowValue}>{sale.worker_name}</Text>
                  </View>
                ) : null}
              </View>

              <View style={rc.totalDivider} />

              <View style={rc.totalRow}>
                <Text style={rc.totalLabel}>Total Amount</Text>
                <Text style={rc.totalValue}>₹{sale.total_amount.toFixed(2)}</Text>
              </View>

              <View style={rc.footerRow}>
                <Ionicons name="shield-checkmark" size={11} color="#9ca3af" />
                <Text style={rc.footerText}>Farm Sale Receipt</Text>
              </View>
            </View>
          </ViewShot>

          <View style={rc.actionRow}>
            <TouchableOpacity style={rc.shareBtn} onPress={handleShare} disabled={sharing}>
              {sharing ? (
                <ActivityIndicator size="small" color="#111827" />
              ) : (
                <>
                  <Ionicons name="share-outline" size={17} color="#111827" />
                  <Text style={rc.shareBtnText}>Share</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={rc.doneBtn} onPress={onClose} activeOpacity={0.85}>
              <Text style={rc.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const rc = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 26,
  },
  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 10 },
    elevation: 18,
  },
  shotWrap: { borderRadius: 18, overflow: "hidden" },
  receiptBody: {
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 18,
    alignItems: "center",
  },
  successIconRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  successIconInner: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#16a34a",
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: { fontSize: 18, fontWeight: "900", color: "#111827" },
  successSub: { fontSize: 12, color: "#6b7280", fontWeight: "500", marginTop: 2 },
  divider: {
    height: 1,
    backgroundColor: "#f3f4f6",
    width: "100%",
    marginVertical: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 14,
  },
  farmName: { fontSize: 14, fontWeight: "800", color: "#111827" },
  dateText: { fontSize: 12, color: "#9ca3af", fontWeight: "600" },
  rowsBlock: { width: "100%", gap: 10 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowLabel: { fontSize: 12.5, color: "#6b7280", fontWeight: "600" },
  rowValue: { fontSize: 13, color: "#111827", fontWeight: "700" },
  totalDivider: {
    height: 1,
    backgroundColor: "#f3f4f6",
    width: "100%",
    marginTop: 16,
    marginBottom: 12,
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 16,
  },
  totalLabel: { fontSize: 14, fontWeight: "800", color: "#111827" },
  totalValue: { fontSize: 18, fontWeight: "900", color: "#4f46e5" },
  footerRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  footerText: { fontSize: 10, color: "#9ca3af", fontWeight: "600" },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  shareBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 14,
    paddingVertical: 13,
  },
  shareBtnText: { fontSize: 13, fontWeight: "800", color: "#111827" },
  doneBtn: {
    flex: 1,
    backgroundColor: "#111827",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  doneBtnText: { fontSize: 13, fontWeight: "800", color: "#fff" },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

function FarmSaleScreenInner() {
  const { user } = useAuth(); // ← logged-in admin (farm owner)
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const formLayoutY = useRef(0);

  const [allSales, setAllSales] = useState<FarmSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("Today");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<FarmSale | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [viewerUri, setViewerUri] = useState<string | null>(null);
  const [viewerVisible, setViewerVisible] = useState(false);

  const { config: alertConfig, show: showAlert, hide: hideAlert } = useModernAlert();

  // Business identity — pulled straight from the logged-in admin's profile
  const farmName = user?.name ?? "My Farm";
  const supportContact = (user as any)?.phone ?? "";

  // Form state
  const [customerName, setCustomerName] = useState("");
  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState<string>("kg");
  const [pricePerUnit, setPricePerUnit] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);

  const [qrLoading, setQrLoading] = useState(false);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);

  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [qrSecondsLeft, setQrSecondsLeft] = useState(300);

  // Auto-generated success receipt shown right after a sale is saved
  const [successReceipt, setSuccessReceipt] = useState<ReceiptPreviewData | null>(null);
  // Receipt preview generated on-demand from current form fields, before saving
  const [receiptPreview, setReceiptPreview] = useState<ReceiptPreviewData | null>(null);

  // ── Data loading — admin-scoped farm sales ──

  const fetchAll = useCallback(async () => {
    try {
      const res = await api.getAdminFarmSales({ all: true });
      setAllSales(res.sales ?? []);
    } catch (e) {
      console.log("all sales fetch error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAll();
  };

  // Attribution helper: sales added directly by this admin show as "Farm Owner"
  const attributionFor = (sale: FarmSale) =>
    sale.worker_id === user?.id ? "Farm Owner" : sale.worker_name;

  // ── Filter chips + search (client-side only, UI only) ──

  const displayedSales = React.useMemo(() => {
    let list = allSales;
    const now = new Date();
    if (activeFilter === "Today") {
      list = list.filter((s) => s.date === todayStr());
    } else if (activeFilter === "Last 7 days") {
      list = list.filter((s) => {
        const d = new Date(s.date);
        const diff = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
        return diff >= 0 && diff < 7;
      });
    } else if (activeFilter === "This month") {
      list = list.filter((s) => {
        const d = new Date(s.date);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      });
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (s) =>
          s.customer_name.toLowerCase().includes(q) ||
          s.product_name.toLowerCase().includes(q),
      );
    }
    return list;
  }, [allSales, activeFilter, searchQuery]);

  // ── Form handlers ──

  const resetForm = () => {
    setEditingId(null);
    setCustomerName("");
    setProductName("");
    setQuantity("");
    setUnit("kg");
    setPricePerUnit("");
    setPaymentMethod("cash");
    setPaymentConfirmed(false);
    setQrImage(null);
    setQrError(null);
  };

  const openNewSale = () => {
    resetForm();
    setIsFormOpen(true);
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: formLayoutY.current, animated: true });
    }, 150);
  };

  const openEditSale = (sale: FarmSale) => {
    setEditingId(sale.id);
    setCustomerName(sale.customer_name);
    setProductName(sale.product_name);
    setQuantity(String(sale.quantity));
    setUnit(sale.unit);
    setPricePerUnit(String(sale.price_per_unit));
    setPaymentMethod((sale.payment_method as PaymentMethod) ?? "cash");
    setPaymentConfirmed(!!sale.payment_confirmed);
    setIsFormOpen(true);
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: formLayoutY.current, animated: true });
    }, 150);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    resetForm();
  };

  // Opens the UPI QR popup, fetches the admin's own uploaded QR (cached after
  // first fetch this session), and resets the 5-minute countdown each time.
  const openUpiQrModal = async () => {
    setPaymentMethod("upi");
    setQrSecondsLeft(300);
    setQrModalVisible(true);

    if (qrImage) return;
    setQrLoading(true);
    setQrError(null);
    try {
      const res = await api.getMyPaymentQr();
      setQrImage(res.qr_image_base64);
    } catch (err: any) {
      setQrError(
        err?.message ??
          "No payment QR uploaded yet. Upload one from Settings → Wallet Payment.",
      );
    } finally {
      setQrLoading(false);
    }
  };

  // 5-minute countdown while the QR modal is open
  useEffect(() => {
    if (!qrModalVisible || qrSecondsLeft <= 0) return;
    const t = setTimeout(() => setQrSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [qrModalVisible, qrSecondsLeft]);

  const qrTimerLabel = `${Math.floor(qrSecondsLeft / 60)}:${String(qrSecondsLeft % 60).padStart(2, "0")}`;

  const handleConfirmPaymentFromModal = () => {
    setPaymentConfirmed(true);
    setQrModalVisible(false);
  };

  const handleRegenerateQrTimer = async () => {
    setQrSecondsLeft(300);
    setQrLoading(true);
    setQrError(null);
    try {
      const res = await api.getMyPaymentQr();
      setQrImage(res.qr_image_base64);
    } catch (err: any) {
      setQrError(err?.message ?? "Could not refresh QR right now.");
    } finally {
      setQrLoading(false);
    }
  };

  const total = (parseFloat(quantity) || 0) * (parseFloat(pricePerUnit) || 0);

  const canGenerateReceipt =
    customerName.trim().length > 0 &&
    productName.trim().length > 0 &&
    (parseFloat(quantity) || 0) > 0 &&
    (parseFloat(pricePerUnit) || 0) > 0;

  const handleGenerateReceipt = () => {
    if (!canGenerateReceipt) {
      showAlert(
        "Missing Details",
        "Fill in customer, product, quantity and price to generate a receipt.",
        "receipt-outline",
        "#f97316",
        "#fff7ed",
      );
      return;
    }
    setReceiptPreview({
      customer_name: customerName.trim(),
      product_name: productName.trim(),
      quantity: parseFloat(quantity),
      unit,
      price_per_unit: parseFloat(pricePerUnit),
      total_amount: total,
      payment_method: paymentMethod,
      worker_name: "Farm Owner",
      date: todayStr(),
    });
  };

  const canSave =
    customerName.trim().length > 0 &&
    productName.trim().length > 0 &&
    (parseFloat(quantity) || 0) > 0 &&
    (parseFloat(pricePerUnit) || 0) > 0 &&
    (paymentMethod === "cash" || paymentConfirmed) &&
    !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const paymentConfirmedFinal = paymentMethod === "cash" ? true : paymentConfirmed;
      const payload = {
        customer_name: customerName.trim(),
        product_name: productName.trim(),
        quantity: parseFloat(quantity),
        unit,
        price_per_unit: parseFloat(pricePerUnit),
        payment_method: paymentMethod,
        payment_confirmed: paymentConfirmedFinal,
      };

      const savedSale = editingId
        ? await api.adminUpdateFarmSale(editingId, payload)
        : await api.adminCreateFarmSale({ ...payload, date: todayStr() });

      closeForm();
      await fetchAll();

      setSuccessReceipt({
        customer_name: savedSale.customer_name,
        product_name: savedSale.product_name,
        quantity: savedSale.quantity,
        unit: savedSale.unit,
        price_per_unit: savedSale.price_per_unit,
        total_amount: savedSale.total_amount,
        payment_method: savedSale.payment_method,
        worker_name: savedSale.worker_id === user?.id ? "Farm Owner" : savedSale.worker_name,
        date: savedSale.date,
      });
    } catch (err: any) {
      showAlert(
        editingId ? "Could Not Update" : "Could Not Save",
        err?.message ?? "Something went wrong while saving the sale entry.",
        "cart-outline",
        "#ef4444",
        "#fee2e2",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.adminDeleteFarmSale(deleteTarget.id);
      setAllSales((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err: any) {
      setDeleteTarget(null);
      showAlert(
        "Delete Failed",
        err?.message ?? "Could not remove the entry.",
        "trash-outline",
        "#ef4444",
        "#fee2e2",
      );
    } finally {
      setDeleting(false);
    }
  };

  const openReceiptViewer = (uri: string) => {
    setViewerUri(uri);
    setViewerVisible(true);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ModernAlert config={alertConfig} onClose={hideAlert} />
      <UndoConfirmModal
        visible={!!deleteTarget}
        sale={deleteTarget}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
      <ReceiptViewerModal
        visible={viewerVisible}
        imageUri={viewerUri}
        onClose={() => setViewerVisible(false)}
      />

      <SuccessReceiptModal
        visible={!!successReceipt}
        sale={successReceipt}
        farmName={farmName}
        onClose={() => setSuccessReceipt(null)}
      />

      <SuccessReceiptModal
        visible={!!receiptPreview}
        sale={receiptPreview}
        farmName={farmName}
        onClose={() => setReceiptPreview(null)}
        title="Receipt Preview"
        subtitle="Share this with your customer"
      />

      <Modal
        visible={qrModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setQrModalVisible(false)}
      >
        <View style={qm.overlay}>
          <View style={qm.card}>
            <View style={qm.header}>
              <Text style={qm.title}>Scan to Pay</Text>
              <TouchableOpacity onPress={() => setQrModalVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={22} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={[qm.timerPill, qrSecondsLeft === 0 && qm.timerPillExpired]}>
              <Ionicons
                name="time-outline"
                size={14}
                color={qrSecondsLeft === 0 ? "#ef4444" : "#4f46e5"}
              />
              <Text style={[qm.timerText, qrSecondsLeft === 0 && qm.timerTextExpired]}>
                {qrSecondsLeft === 0 ? "QR expired" : `Expires in ${qrTimerLabel}`}
              </Text>
            </View>

            {qrLoading ? (
              <View style={qm.qrBox}>
                <ActivityIndicator color="#4f46e5" size="large" />
              </View>
            ) : qrError ? (
              <View style={qm.qrBox}>
                <Ionicons name="alert-circle-outline" size={28} color="#ef4444" />
                <Text style={qm.errorText}>{qrError}</Text>
              </View>
            ) : qrSecondsLeft === 0 ? (
              <View style={qm.qrBox}>
                <Ionicons name="refresh-circle-outline" size={32} color="#9ca3af" />
                <Text style={qm.expiredText}>This QR session has expired</Text>
                <TouchableOpacity style={qm.regenBtn} onPress={handleRegenerateQrTimer}>
                  <Text style={qm.regenBtnText}>Get New QR</Text>
                </TouchableOpacity>
              </View>
            ) : qrImage ? (
              <View style={qm.qrBox}>
                <Image source={{ uri: qrImage }} style={qm.qrImage} resizeMode="contain" />
              </View>
            ) : null}

            <TouchableOpacity
              style={[
                qm.confirmBtn,
                (qrSecondsLeft === 0 || qrLoading || qrError) && qm.confirmBtnDisabled,
              ]}
              onPress={handleConfirmPaymentFromModal}
              disabled={qrSecondsLeft === 0 || qrLoading || !!qrError}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
              <Text style={qm.confirmBtnText}>Confirm Payment</Text>
            </TouchableOpacity>

            <TouchableOpacity style={qm.cancelLink} onPress={() => setQrModalVisible(false)}>
              <Text style={qm.cancelLinkText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Header — business name + admin support contact on top */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoCircle}>
            <MaterialCommunityIcons name="sprout" size={20} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {farmName}
            </Text>
            <View style={styles.headerSubRow}>
              <Text style={styles.headerSubtitle}>Sales management</Text>
              {supportContact ? (
                <>
                  <View style={styles.headerSubDot} />
                  <Ionicons name="call-outline" size={11} color="#6b7280" />
                  <Text style={styles.headerSubtitle}>{supportContact}</Text>
                </>
              ) : null}
            </View>
          </View>
        </View>
        <TouchableOpacity style={styles.addBtnTop} onPress={openNewSale}>
          <Ionicons name="add" size={18} color="#000" />
          <Text style={styles.addBtnTopText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Search & Filter Bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <TextInput
            placeholder="Search customer or product"
            placeholderTextColor="#9ca3af"
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity style={styles.filterIconBtn}>
          <Ionicons name="funnel-outline" size={20} color="#374151" />
        </TouchableOpacity>
      </View>

      {/* Filter Chips */}
      <View style={styles.chipsRow}>
        {["Today", "Last 7 days", "This month"].map((chip) => {
          const isActive = activeFilter === chip;
          return (
            <TouchableOpacity
              key={chip}
              style={[styles.chip, isActive && styles.chipActive]}
              onPress={() => setActiveFilter(chip)}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                {chip}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Inline Form */}
          {isFormOpen && (
            <View
              style={styles.formCard}
              onLayout={(e) => {
                formLayoutY.current = e.nativeEvent.layout.y;
              }}
            >
              <View style={styles.formHeaderRow}>
                <View>
                  <Text style={styles.formTitle}>{editingId ? "Edit Sale" : "New Sale"}</Text>
                  <Text style={styles.formSubtitle}>Quickly add a sale record</Text>
                </View>
                <View style={styles.formActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={closeForm}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveBtn, (!canSave || saving) && { opacity: 0.6 }]}
                    onPress={handleSave}
                    disabled={!canSave || saving}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color="#000" />
                    ) : (
                      <Text style={styles.saveBtnText}>Save</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              <TextInput
                style={styles.inputField}
                placeholder="Customer name (e.g., Aarav Patel)"
                placeholderTextColor="#9ca3af"
                value={customerName}
                onChangeText={setCustomerName}
              />
              <TextInput
                style={styles.inputField}
                placeholder="Product name (e.g., Organic Tomatoes)"
                placeholderTextColor="#9ca3af"
                value={productName}
                onChangeText={setProductName}
              />

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <NumberStepper value={quantity} onChange={setQuantity} />
                </View>
                <View style={styles.unitSelector}>
                  {UNIT_OPTIONS.map((u) => {
                    const active = unit === u;
                    return (
                      <TouchableOpacity
                        key={u}
                        onPress={() => setUnit(u)}
                        style={[styles.unitChip, active && styles.unitChipActive]}
                      >
                        <Text style={[styles.unitChipText, active && styles.unitChipTextActive]}>
                          {u}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <NumberStepper
                value={pricePerUnit}
                onChange={setPricePerUnit}
                placeholder="Price per unit"
              />

              {total > 0 && (
                <View style={styles.totalPreview}>
                  <Text style={styles.totalPreviewLabel}>Total</Text>
                  <Text style={styles.totalPreviewValue}>₹{total.toFixed(2)}</Text>
                </View>
              )}

              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Payment</Text>
                <TouchableOpacity style={styles.radioOption} onPress={openUpiQrModal}>
                  <View
                    style={[styles.radioCircle, paymentMethod === "upi" && styles.radioCircleActive]}
                  >
                    {paymentMethod === "upi" && <View style={styles.radioInner} />}
                  </View>
                  <Text style={styles.radioText}>UPI</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.radioOption}
                  onPress={() => setPaymentMethod("cash")}
                >
                  <View
                    style={[styles.radioCircle, paymentMethod === "cash" && styles.radioCircleActive]}
                  >
                    {paymentMethod === "cash" && <View style={styles.radioInner} />}
                  </View>
                  <Text style={styles.radioText}>Cash</Text>
                </TouchableOpacity>
              </View>

              {paymentMethod === "upi" && (
                <View style={styles.upiStatusRow}>
                  {paymentConfirmed ? (
                    <>
                      <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
                      <Text style={styles.upiStatusTextDone}>Payment confirmed</Text>
                    </>
                  ) : (
                    <TouchableOpacity style={styles.upiStatusPending} onPress={openUpiQrModal}>
                      <Ionicons name="qr-code-outline" size={16} color="#4f46e5" />
                      <Text style={styles.upiStatusTextPending}>Show QR again</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              <View style={styles.receiptUploadRow}>
                <View style={styles.receiptThumbPlaceholder}>
                  <Ionicons name="receipt-outline" size={22} color="#9ca3af" />
                </View>
                <View style={styles.receiptTextCol}>
                  <Text style={styles.receiptLabel}>Receipt</Text>
                  <Text style={styles.receiptSub}>Generate a shareable receipt for this sale</Text>
                </View>
                <TouchableOpacity
                  style={[styles.uploadBtn, !canGenerateReceipt && { opacity: 0.5 }]}
                  onPress={handleGenerateReceipt}
                >
                  <Text style={styles.uploadBtnText}>Generate Receipt</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Empty state */}
          {displayedSales.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={36} color="#d1d5db" />
              <Text style={styles.emptyStateText}>No sales in this range</Text>
            </View>
          )}

          {/* List of Sales */}
          {displayedSales.map((sale) => (
            <View key={sale.id} style={styles.saleCard}>
              <View style={styles.saleCardLeft}>
                <View style={styles.avatar}>
                  <Ionicons name="person" size={16} color="#4f46e5" />
                </View>
                <View style={styles.saleDetails}>
                  <Text style={styles.saleName}>{sale.customer_name}</Text>
                  <Text style={styles.saleProduct}>Product: {sale.product_name}</Text>
                  <Text style={styles.saleQtyPrice}>
                    {sale.quantity} {sale.unit} x ₹{sale.price_per_unit.toFixed(2)}
                  </Text>
                  <Text style={styles.saleTotal}>Total: ₹{sale.total_amount.toFixed(2)}</Text>

                  <View style={styles.badgeRow}>
                    {sale.payment_method === "upi" ? (
                      <View style={styles.badgeUpi}>
                        <Text style={styles.badgeUpiText}>UPI</Text>
                      </View>
                    ) : (
                      <View style={styles.badgeCash}>
                        <Text style={styles.badgeCashText}>Cash</Text>
                      </View>
                    )}

                    {sale.receipt_image ? (
                      <TouchableOpacity
                        style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                        onPress={() => openReceiptViewer(sale.receipt_image!)}
                      >
                        <View style={styles.badgeReceipt}>
                          <Text style={styles.badgeReceiptText}>Receipt</Text>
                        </View>
                        <Image
                          source={{ uri: sale.receipt_image }}
                          style={styles.receiptMiniThumb}
                        />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              </View>

              <View style={styles.saleCardRight}>
                <View style={styles.actionBtns}>
                  <TouchableOpacity style={styles.iconBtn} onPress={() => openEditSale(sale)}>
                    <MaterialCommunityIcons name="pencil-outline" size={16} color="#000" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.iconBtn} onPress={() => setDeleteTarget(sale)}>
                    <Ionicons name="trash" size={16} color="#000" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.addedByText}>{attributionFor(sale)}</Text>
                <Text style={styles.saleDate}>{fmtShortDate(sale.date)}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Sticky Add Button */}
      {!isFormOpen && (
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.bottomAddBtn} onPress={openNewSale}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.bottomAddBtnText}>Add New Sale</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function FarmSaleScreen() {
  return <FarmSaleScreenInner />;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fefefe" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  logoCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#4f46e5",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 16, fontWeight: "bold", color: "#111827" },
  headerSubRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  headerSubtitle: { fontSize: 11, color: "#6b7280" },
  headerSubDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: "#d1d5db" },
  addBtnTop: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f97316",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  addBtnTopText: { fontSize: 13, fontWeight: "bold", color: "#000" },

  searchRow: { flexDirection: "row", paddingHorizontal: 16, gap: 10, marginBottom: 12 },
  searchBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    justifyContent: "center",
  },
  searchInput: { fontSize: 13, color: "#111827" },
  filterIconBtn: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  chipsRow: { flexDirection: "row", paddingHorizontal: 16, gap: 8, marginBottom: 16 },
  chip: {
    flex: 1,
    height: 36,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  chipActive: { borderColor: "#3b82f6", backgroundColor: "#eff6ff" },
  chipText: { fontSize: 12, fontWeight: "600", color: "#4b5563" },
  chipTextActive: { color: "#3b82f6" },

  scrollContent: { paddingHorizontal: 16, paddingBottom: 100 },

  formCard: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    backgroundColor: "#fff",
  },
  formHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  formTitle: { fontSize: 16, fontWeight: "bold", color: "#111827" },
  formSubtitle: { fontSize: 11, color: "#6b7280", marginTop: 2 },
  formActions: { flexDirection: "row", gap: 8 },
  cancelBtn: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    justifyContent: "center",
  },
  cancelBtnText: { fontSize: 12, fontWeight: "bold", color: "#111827" },
  saveBtn: {
    backgroundColor: "#4ade80",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
    justifyContent: "center",
    minWidth: 56,
    alignItems: "center",
  },
  saveBtnText: { fontSize: 12, fontWeight: "bold", color: "#000" },

  inputField: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 13,
    marginBottom: 10,
    color: "#111827",
  },
  row: { flexDirection: "row", gap: 10, marginBottom: 10 },
  unitSelector: { flexDirection: "row", gap: 6 },
  unitChip: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  unitChipActive: { borderColor: "#4f46e5", backgroundColor: "#eef2ff" },
  unitChipText: { fontSize: 12, fontWeight: "600", color: "#6b7280" },
  unitChipTextActive: { color: "#4f46e5" },

  totalPreview: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  totalPreviewLabel: { fontSize: 12, color: "#6b7280" },
  totalPreviewValue: { fontSize: 14, fontWeight: "bold", color: "#111827" },

  paymentRow: { flexDirection: "row", alignItems: "center", marginTop: 4, marginBottom: 10, gap: 16 },
  paymentLabel: { fontSize: 12, color: "#6b7280" },
  radioOption: { flexDirection: "row", alignItems: "center", gap: 6 },
  radioCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#d1d5db",
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleActive: { borderColor: "#4f46e5" },
  radioInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#4f46e5" },
  radioText: { fontSize: 12, fontWeight: "600", color: "#111827" },

  upiStatusRow: { marginTop: 4, marginBottom: 10 },
  upiStatusPending: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
  },
  upiStatusTextPending: { fontSize: 12, fontWeight: "700", color: "#4f46e5" },
  upiStatusTextDone: { fontSize: 12, fontWeight: "700", color: "#16a34a" },

  receiptUploadRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    paddingTop: 16,
    gap: 12,
  },
  receiptThumbPlaceholder: {
    width: 48,
    height: 48,
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  receiptTextCol: { flex: 1 },
  receiptLabel: { fontSize: 12, color: "#374151", fontWeight: "600" },
  receiptSub: { fontSize: 11, color: "#9ca3af", marginTop: 2 },
  uploadBtn: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  uploadBtnText: { fontSize: 12, fontWeight: "bold", color: "#111827" },

  emptyState: { alignItems: "center", paddingVertical: 50, gap: 8 },
  emptyStateText: { fontSize: 13, color: "#9ca3af" },

  saleCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#f3f4f6",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    backgroundColor: "#fff",
  },
  saleCardLeft: { flexDirection: "row", flex: 1, gap: 12 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#eef2ff",
    alignItems: "center",
    justifyContent: "center",
  },
  saleDetails: { flex: 1 },
  saleName: { fontSize: 14, fontWeight: "bold", color: "#111827", marginBottom: 2 },
  saleProduct: { fontSize: 11, color: "#4b5563" },
  saleQtyPrice: { fontSize: 11, color: "#6b7280", marginBottom: 4 },
  saleTotal: { fontSize: 13, fontWeight: "bold", color: "#111827", marginBottom: 8 },

  badgeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  badgeUpi: { backgroundColor: "#4f46e5", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  badgeUpiText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
  badgeCash: { borderWidth: 1, borderColor: "#e5e7eb", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  badgeCashText: { color: "#111827", fontSize: 10, fontWeight: "bold" },
  badgeReceipt: { borderWidth: 1, borderColor: "#e5e7eb", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  badgeReceiptText: { color: "#4b5563", fontSize: 10 },
  receiptMiniThumb: { width: 20, height: 24, backgroundColor: "#d1d5db", borderRadius: 4 },

  saleCardRight: { alignItems: "flex-end", justifyContent: "space-between" },
  actionBtns: { flexDirection: "row", gap: 8 },
  iconBtn: {
    width: 28,
    height: 28,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  addedByText: { fontSize: 10, fontWeight: "700", color: "#9ca3af", maxWidth: 90, textAlign: "right" },
  saleDate: { fontSize: 10, color: "#6b7280", marginTop: 8 },

  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: Platform.OS === "ios" ? 32 : 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  bottomAddBtn: {
    backgroundColor: "#000",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  bottomAddBtnText: { color: "#fff", fontSize: 14, fontWeight: "bold" },
});

const qm = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 28,
  },
  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 22,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 14,
  },
  title: { fontSize: 17, fontWeight: "800", color: "#111827" },
  timerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#eef2ff",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 16,
  },
  timerPillExpired: { backgroundColor: "#fee2e2" },
  timerText: { fontSize: 13, fontWeight: "700", color: "#4f46e5" },
  timerTextExpired: { color: "#ef4444" },
  qrBox: {
    width: "100%",
    minHeight: 200,
    borderRadius: 16,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 18,
    padding: 16,
  },
  qrImage: { width: 200, height: 200 },
  errorText: { fontSize: 13, color: "#ef4444", textAlign: "center" },
  expiredText: { fontSize: 13, color: "#6b7280", textAlign: "center" },
  regenBtn: {
    backgroundColor: "#111827",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 4,
  },
  regenBtnText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#4f46e5",
    width: "100%",
    paddingVertical: 14,
    borderRadius: 14,
  },
  confirmBtnDisabled: { backgroundColor: "#c7c9f5" },
  confirmBtnText: { fontSize: 15, fontWeight: "800", color: "#fff" },
  cancelLink: { marginTop: 12, paddingVertical: 4 },
  cancelLinkText: { fontSize: 13, fontWeight: "700", color: "#6b7280" },
});