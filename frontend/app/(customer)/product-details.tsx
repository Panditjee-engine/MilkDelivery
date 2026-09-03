import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { api } from "../../src/services/api";
import { Colors } from "../../src/constants/colors";
import { hasCompleteDeliveryAddress } from "../../src/utils/address";
import {
  getOrderCutoffBadgeText,
  getOrderCutoffBlockedMessage,
  getOrderCutoffForProduct,
  isOrderCutoffPassed,
  type OrderCutoffRule,
} from "../../src/utils/orderCutoff";

const CATEGORY_THEMES: Record<string, { bg: string; accent: string; icon: string }> = {
  milk: { bg: "#EAF4FF", accent: "#3B82F6", icon: "water" },
  dairy: { bg: "#FFF4E6", accent: "#F59E0B", icon: "ice-cream" },
  bakery: { bg: "#FEF2F2", accent: "#EF4444", icon: "pizza" },
  fruits: { bg: "#F0FDF4", accent: "#22C55E", icon: "nutrition" },
  vegetables: { bg: "#F0FDF4", accent: "#16A34A", icon: "leaf" },
  essentials: { bg: "#F5F3FF", accent: "#8B5CF6", icon: "basket" },
  other: { bg: "#F8F7F4", accent: "#6B7280", icon: "cube" },
};

const getTheme = (category?: string) =>
  CATEGORY_THEMES[category?.toLowerCase?.() || ""] || CATEGORY_THEMES.other;
const DAIRY_CATEGORIES = ["milk", "dairy"];
const weekDays = [
  { value: 0, label: "M" },
  { value: 1, label: "T" },
  { value: 2, label: "W" },
  { value: 3, label: "T" },
  { value: 4, label: "F" },
  { value: 5, label: "S" },
  { value: 6, label: "S" },
];
const subscriptionPatterns = [
  { value: "daily", label: "Daily", icon: "sunny-outline", hint: "Every day" },
  { value: "alternate", label: "Alternate", icon: "repeat-outline", hint: "Every other day" },
  { value: "custom", label: "Custom", icon: "calendar-outline", hint: "Pick days" },
  { value: "buy_once", label: "Buy Once", icon: "bag-check-outline", hint: "Single order" },
];

const isDairyProduct = (product: any) =>
  DAIRY_CATEGORIES.includes(product?.category?.toLowerCase?.());

function isCutoffError(error: any) {
  return String(error?.message || error?.detail || "")
    .toLowerCase()
    .includes("cut-off");
}

function formatUnit(unit?: string) {
  if (!unit) return "";
  const lower = unit.toLowerCase().trim();
  const lMatch = lower.match(/^(\d+\.?\d*)\s*(l|litre|litres|liter|liters)$/);
  if (lMatch) return `${lMatch[1]}L`;
  const mlMatch = lower.match(/^(\d+\.?\d*)\s*ml$/);
  if (mlMatch) return `${mlMatch[1]}ml`;
  return unit.charAt(0).toUpperCase() + unit.slice(1);
}

export default function ProductDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; product?: string }>();
  const initialProduct = useMemo(() => {
    if (!params.product) return null;
    try {
      return JSON.parse(decodeURIComponent(params.product.toString()));
    } catch {
      return null;
    }
  }, [params.product]);
  const [product, setProduct] = useState<any>(initialProduct);
  const [loading, setLoading] = useState(!initialProduct);
  const [buySheetVisible, setBuySheetVisible] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [pattern, setPattern] = useState("buy_once");
  const [customDays, setCustomDays] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [feedbackType, setFeedbackType] = useState<"address" | "balance" | null>(null);
  const [orderCutoffs, setOrderCutoffs] = useState<OrderCutoffRule[]>([]);
  const productId = params.id?.toString() || product?.id || product?._id;
  const cutoffRule = getOrderCutoffForProduct(product, orderCutoffs);
  const cutoffText = getOrderCutoffBadgeText(cutoffRule);
  const cutoffPassed = isOrderCutoffPassed(cutoffRule);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (initialProduct) {
        setProduct(initialProduct);
        setLoading(false);
      }
      if (!productId) {
        setLoading(false);
        return;
      }
      try {
        const data = await api.getProduct(productId);
        if (mounted) setProduct(data);
      } catch {
        if (mounted && !initialProduct) setProduct(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [initialProduct, productId]);

  useEffect(() => {
    const adminId = product?.admin_id;
    if (!adminId) return;
    let mounted = true;
    const loadCutoffs = async () => {
      try {
        const data = await api.getCatalogOrderCutoffs(String(adminId));
        if (mounted) setOrderCutoffs(data || []);
      } catch {
        if (mounted) setOrderCutoffs([]);
      }
    };
    loadCutoffs();
    const interval = setInterval(loadCutoffs, 2000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [product?.admin_id]);

  const theme = useMemo(() => getTheme(product?.category), [product?.category]);
  const isUnavailable = !product?.is_available || (product?.stock ?? 1) === 0;
  const isDairy = isDairyProduct(product);
  const orderTotal = (Number(product?.price) || 0) * quantity;

  const openBuyFlow = () => {
    if (!productId || isUnavailable) return;
    if (cutoffRule && isOrderCutoffPassed(cutoffRule)) {
      Alert.alert(
        "Order cut-off time passed",
        getOrderCutoffBlockedMessage(product, cutoffRule),
        [{ text: "Got it" }],
      );
      return;
    }
    setQuantity(1);
    setPattern(isDairy ? "daily" : "buy_once");
    setCustomDays([]);
    setFeedback("");
    setBuySheetVisible(true);
  };

  const toggleCustomDay = (day: number) => {
    setCustomDays((current) =>
      current.includes(day)
        ? current.filter((value) => value !== day)
        : [...current, day],
    );
  };

  const ensureAddress = async () => {
    const latestUser = await api.getMe();
    if (hasCompleteDeliveryAddress(latestUser?.address)) return true;
    setFeedback("Please add your complete delivery address before payment.");
    setFeedbackType("address");
    Alert.alert(
      "Delivery address required",
      "Please add your complete delivery address before choosing payment.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Add Address",
          onPress: () => {
            setBuySheetVisible(false);
            router.push({
              pathname: "/address-book",
              params: {
                addressRequired: "1",
                returnTo: "catalog",
              },
            } as any);
          },
        },
      ],
    );
    return false;
  };

  const handleBuySubmit = async () => {
    if (!product || !productId) return;

    const latestCutoff = getOrderCutoffForProduct(product, orderCutoffs);
    if (latestCutoff && isOrderCutoffPassed(latestCutoff)) {
      Alert.alert(
        "Order cut-off time passed",
        getOrderCutoffBlockedMessage(product, latestCutoff),
        [{ text: "Got it" }],
      );
      return;
    }

    const stock = product.stock ?? Infinity;

    // ── BUY ONCE = just add to cart, don't place order here ──
    if (pattern === "buy_once") {
      if (quantity > stock) {
        setFeedback(`Only ${stock} item available.`);
        setFeedbackType(null);
        return;
      }
      setBuySheetVisible(false);
      router.push({
        pathname: "/(customer)/catalog",
        params: {
          addToCartProduct: encodeURIComponent(JSON.stringify(product)),
          addToCartQty: String(quantity),
        },
      } as any);
      return;
    }

    // ── Subscription patterns (daily/alternate/custom) keep old flow ──
    if (pattern === "custom" && customDays.length === 0) {
      setFeedback("Please choose at least one custom delivery day.");
      setFeedbackType(null);
      return;
    }

    setSubmitting(true);
    setFeedback("");
    setFeedbackType(null);
    try {
      if (!(await ensureAddress())) return;
      const wallet = await api.getWallet();
      if ((wallet.balance ?? 0) < orderTotal) {
        setFeedback("Wallet balance is low.Tap the arrow to recharge your wallet.");
        setFeedbackType("balance");
        return;
      }
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const startDate = tomorrow.toISOString().split("T")[0];
      await api.createSubscription({
        items: [{ product_id: productId, quantity, price: Number(product.price) || 0, amount: orderTotal }],
        pattern,
        custom_days: pattern === "custom" ? customDays : null,
        start_date: startDate,
        end_date: null,
        delivery_slot: "morning",
      });
      setFeedback("Subscription activated.");
      setFeedbackType(null);
      setTimeout(() => setBuySheetVisible(false), 700);
    } catch (error: any) {
      if (isCutoffError(error)) {
        Alert.alert(
          "Order cut-off time passed",
          error?.message || "Please place this order before the product cut-off time.",
          [{ text: "Got it" }],
        );
        setBuySheetVisible(false);
        return;
      }
      setFeedback(error?.message || "Could not place order. Please try again.");
      setFeedbackType(null);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={s.center}>
        <ActivityIndicator color={Colors.primary} />
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={s.center}>
        <Ionicons name="cube-outline" size={40} color="#C9C9C9" />
        <Text style={s.emptyTitle}>Product not found</Text>
        <TouchableOpacity style={s.backAction} onPress={() => router.back()}>
          <Text style={s.backActionText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <View style={s.header}>
          <TouchableOpacity style={s.iconBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#111827" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Product Details</Text>
          <View style={s.iconBtnGhost} />
        </View>

        <View style={[s.hero, { backgroundColor: theme.bg }]}>
          {product.image ? (
            <Image source={{ uri: product.image }} style={s.heroImage} resizeMode="cover" />
          ) : (
            <View style={[s.heroIcon, { backgroundColor: theme.accent + "22" }]}>
              <Ionicons name={theme.icon as any} size={52} color={theme.accent} />
            </View>
          )}
          {isUnavailable ? (
            <View style={s.outBadge}>
              <Text style={s.outBadgeText}>Out of stock</Text>
            </View>
          ) : null}
        </View>

        <View style={s.content}>
          <View style={s.categoryPill}>
            <Ionicons name={theme.icon as any} size={13} color={theme.accent} />
            <Text style={[s.categoryText, { color: theme.accent }]}>
              {product.category || "Product"}
            </Text>
          </View>
          <Text style={s.name}>{product.name}</Text>
          <View style={s.priceRow}>
            <Text style={[s.price, { color: theme.accent }]}>₹{product.price}</Text>
            <Text style={s.unit}>per {formatUnit(product.unit)}</Text>
          </View>
          {cutoffText ? (
            <View style={[s.cutoffNotice, cutoffPassed && s.cutoffNoticeBlocked]}>
              <Ionicons
                name={cutoffPassed ? "alert-circle-outline" : "time-outline"}
                size={15}
                color={cutoffPassed ? "#DC2626" : "#B45309"}
              />
              <Text
                style={[
                  s.cutoffNoticeText,
                  cutoffPassed && s.cutoffNoticeTextBlocked,
                ]}
              >
                {cutoffText}
              </Text>
            </View>
          ) : null}

          <View style={s.infoGrid}>
            <View style={s.infoBox}>
              <Ionicons name="cube-outline" size={18} color={Colors.primary} />
              <Text style={s.infoLabel}>Stock</Text>
              <Text style={s.infoValue}>{product.stock ?? "Available"}</Text>
            </View>
            <View style={s.infoBox}>
              <Ionicons name="repeat-outline" size={18} color={Colors.primary} />
              <Text style={s.infoLabel}>Order</Text>
              <Text style={s.infoValue}>Subscribe or cart</Text>
            </View>
          </View>

          {product.description ? (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Description</Text>
              <Text style={s.description}>{product.description}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View style={s.footer}>
        <TouchableOpacity
          style={[s.buyBtn, isUnavailable && s.buyBtnDisabled]}
          onPress={openBuyFlow}
          disabled={isUnavailable}
          activeOpacity={0.86}
        >
          <LinearGradient
            colors={isUnavailable ? ["#D1D5DB", "#9CA3AF"] : [Colors.primary, "#F97316"]}
            style={s.buyGrad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="bag-check-outline" size={19} color="#fff" />
            <Text style={s.buyText}>{isUnavailable ? "Unavailable" : "Buy Now"}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <Modal
        visible={buySheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => !submitting && setBuySheetVisible(false)}
      >
        <View style={s.sheetOverlay}>
          <View style={s.sheet}>
            <View style={s.sheetHandle} />
            <View style={s.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={s.sheetTitle}>{product.name}</Text>
                <Text style={s.sheetSub}>₹{product.price} · {formatUnit(product.unit)}</Text>
              </View>
              <TouchableOpacity
                style={s.closeBtn}
                onPress={() => !submitting && setBuySheetVisible(false)}
              >
                <Ionicons name="close" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={s.sheetLabel}>Quantity</Text>
            <View style={s.qtyRow}>
              <TouchableOpacity
                style={s.qtyBtn}
                onPress={() => setQuantity((value) => Math.max(1, value - 1))}
              >
                <Ionicons name="remove" size={18} color={Colors.primary} />
              </TouchableOpacity>
              <View style={s.qtyValueBox}>
                <Text style={s.qtyValue}>{quantity}</Text>
                <Text style={s.qtyUnit}>{formatUnit(product.unit)}</Text>
              </View>
              <TouchableOpacity
                style={[s.qtyBtn, s.qtyBtnActive]}
                onPress={() => setQuantity((value) => value + 1)}
              >
                <Ionicons name="add" size={18} color="#fff" />
              </TouchableOpacity>
            </View>

            <Text style={s.sheetLabel}>{isDairy ? "Subscribe or buy once" : "Order type"}</Text>
            <View style={s.patternGrid}>
              {(isDairy ? subscriptionPatterns : [subscriptionPatterns[3]]).map((item) => {
                const active = pattern === item.value;
                return (
                  <TouchableOpacity
                    key={item.value}
                    style={[s.patternCard, active && s.patternCardActive]}
                    onPress={() => setPattern(item.value)}
                  >
                    <Ionicons
                      name={item.icon as any}
                      size={17}
                      color={active ? "#fff" : Colors.primary}
                    />
                    <Text style={[s.patternLabel, active && s.patternLabelActive]}>
                      {item.label}
                    </Text>
                    <Text style={[s.patternHint, active && s.patternHintActive]}>
                      {item.hint}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {pattern === "custom" ? (
              <View style={s.weekRow}>
                {weekDays.map((day) => {
                  const active = customDays.includes(day.value);
                  return (
                    <TouchableOpacity
                      key={day.value}
                      style={[s.dayChip, active && s.dayChipActive]}
                      onPress={() => toggleCustomDay(day.value)}
                    >
                      <Text style={[s.dayText, active && s.dayTextActive]}>
                        {day.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : null}

            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Total</Text>
              <Text style={s.totalValue}>₹{orderTotal.toFixed(2)}</Text>
            </View>
            {feedback ? (
              <View style={s.feedbackRow}>
                <Text style={s.feedbackFlex}>{feedback}</Text>
                {feedbackType && (
                  <TouchableOpacity
                    style={s.feedbackArrow}
                    onPress={() => {
                      setBuySheetVisible(false);
                      if (feedbackType === "address") {
                        router.push({
                          pathname: "/address-book",
                          params: {
                            addressRequired: "1",
                            returnTo: "catalog",
                          },
                        } as any);
                      } else {
                        router.push("/(customer)/wallet" as any);
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="arrow-forward-circle" size={22} color="#B45309" />
                  </TouchableOpacity>
                )}
              </View>
            ) : null}

            <TouchableOpacity
              style={[s.submitBtn, submitting && { opacity: 0.65 }]}
              onPress={handleBuySubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.submitText}>
                  {pattern === "buy_once" ? "Add to Cart" : "Subscribe Now"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff", gap: 12 },
  scroll: { paddingBottom: 120 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingVertical: 12 },
  iconBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#F8F7F4", alignItems: "center", justifyContent: "center" },
  iconBtnGhost: { width: 42, height: 42 },
  headerTitle: { fontSize: 17, fontWeight: "900", color: "#111827" },
  hero: { marginHorizontal: 18, borderRadius: 24, height: 280, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  heroImage: { width: "100%", height: "100%" },
  heroIcon: { width: 118, height: 118, borderRadius: 34, alignItems: "center", justifyContent: "center" },
  outBadge: { position: "absolute", top: 16, right: 16, backgroundColor: "#111827", borderRadius: 18, paddingHorizontal: 12, paddingVertical: 7 },
  outBadgeText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  content: { padding: 20 },
  categoryPill: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#F8F7F4", borderRadius: 18, paddingHorizontal: 11, paddingVertical: 7, marginBottom: 12 },
  categoryText: { fontSize: 12, fontWeight: "900", textTransform: "capitalize" },
  name: { fontSize: 26, lineHeight: 32, fontWeight: "900", color: "#111827", letterSpacing: -0.6 },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 8, marginTop: 10 },
  price: { fontSize: 28, fontWeight: "900", letterSpacing: -0.5 },
  unit: { fontSize: 13, fontWeight: "800", color: "#9CA3AF" },
  cutoffNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginTop: 12,
  },
  cutoffNoticeBlocked: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  cutoffNoticeText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: "900",
    color: "#B45309",
  },
  cutoffNoticeTextBlocked: { color: "#DC2626" },
  infoGrid: { flexDirection: "row", gap: 12, marginTop: 18 },
  infoBox: { flex: 1, backgroundColor: "#F9FAFB", borderRadius: 18, padding: 14, gap: 5, borderWidth: 1, borderColor: "#F0F2F5" },
  infoLabel: { fontSize: 11, fontWeight: "800", color: "#9CA3AF", textTransform: "uppercase" },
  infoValue: { fontSize: 14, fontWeight: "900", color: "#111827" },
  section: { marginTop: 22 },
  sectionTitle: { fontSize: 15, fontWeight: "900", color: "#111827", marginBottom: 8 },
  description: { fontSize: 14, lineHeight: 21, color: "#6B7280", fontWeight: "600" },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 18, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#F0F2F5" },
  buyBtn: { borderRadius: 18, overflow: "hidden" },
  buyBtnDisabled: { opacity: 0.75 },
  buyGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, paddingVertical: 16 },
  buyText: { color: "#fff", fontSize: 16, fontWeight: "900" },
  sheetOverlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.48)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 30 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#CBD5E1", alignSelf: "center", marginBottom: 16 },
  sheetHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  sheetTitle: { fontSize: 20, fontWeight: "900", color: "#111827" },
  sheetSub: { fontSize: 13, color: "#64748B", fontWeight: "700", marginTop: 3 },
  closeBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  sheetLabel: { fontSize: 12, fontWeight: "900", color: "#64748B", textTransform: "uppercase", marginBottom: 9, marginTop: 6 },
  qtyRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 14 },
  qtyBtn: { width: 44, height: 44, borderRadius: 15, backgroundColor: Colors.primary + "12", alignItems: "center", justifyContent: "center" },
  qtyBtnActive: { backgroundColor: Colors.primary },
  qtyValueBox: { minWidth: 76, alignItems: "center" },
  qtyValue: { fontSize: 28, fontWeight: "900", color: "#111827" },
  qtyUnit: { fontSize: 10, fontWeight: "800", color: "#94A3B8" },
  patternGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  patternCard: { width: "47.8%", borderRadius: 16, borderWidth: 1.5, borderColor: "#E2E8F0", padding: 12, backgroundColor: "#fff" },
  patternCardActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  patternLabel: { fontSize: 13, fontWeight: "900", color: "#111827", marginTop: 7 },
  patternLabelActive: { color: "#fff" },
  patternHint: { fontSize: 10.5, fontWeight: "700", color: "#94A3B8", marginTop: 2 },
  patternHintActive: { color: "rgba(255,255,255,0.78)" },
  weekRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12, marginBottom: 4 },
  dayChip: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "#F1F5F9" },
  dayChipActive: { backgroundColor: Colors.primary },
  dayText: { fontSize: 12, fontWeight: "900", color: "#64748B" },
  dayTextActive: { color: "#fff" },
  totalRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  totalLabel: { fontSize: 13, fontWeight: "800", color: "#64748B" },
  totalValue: { fontSize: 20, fontWeight: "900", color: "#111827" },
  feedback: { marginTop: 10, color: "#B45309", fontSize: 12.5, fontWeight: "800" },
  submitBtn: { marginTop: 14, borderRadius: 16, backgroundColor: Colors.primary, paddingVertical: 15, alignItems: "center", justifyContent: "center" },
  submitText: { fontSize: 15, fontWeight: "900", color: "#fff" },
  emptyTitle: { fontSize: 16, fontWeight: "900", color: "#111827" },
  backAction: { backgroundColor: Colors.primary, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 11 },
  backActionText: { color: "#fff", fontSize: 14, fontWeight: "900" },
  feedbackRow: { flexDirection: "row", alignItems: "center", marginTop: 10, gap: 8 },
  feedbackFlex: { flex: 1, color: "#B45309", fontSize: 12.5, fontWeight: "800" },
  feedbackArrow: { padding: 2 },
});
