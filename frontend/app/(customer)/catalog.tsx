import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Animated,
  Vibration,
  Image,
  Dimensions,
} from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../src/services/api";
import { Colors } from "../../src/constants/colors";
import Button from "../../src/components/Button";
import LoadingScreen from "../../src/components/LoadingScreen";

const CARD_WIDTH = 130;
const SCREEN_WIDTH = Dimensions.get("window").width;

// Dairy category key — adjust if your API uses a different value
const DAIRY_CATEGORIES = ["milk", "dairy"];

// All 4 patterns available for dairy
const subscriptionPatterns = [
  {
    value: "daily",
    label: "Daily",
    description: "Subscription",
    icon: "sunny-outline",
    isSubscription: true,
    hint: "Delivered every day",
  },
  {
    value: "alternate",
    label: "Alternate",
    description: "Subscription",
    icon: "repeat-outline",
    isSubscription: true,
    hint: "Every other day",
  },
  {
    value: "custom",
    label: "Custom Days",
    description: "Subscription",
    icon: "calendar-outline",
    isSubscription: true,
    hint: "Pick your days",
  },
  {
    value: "buy_once",
    label: "Buy Once",
    description: "One-time",
    icon: "bag-check-outline",
    isSubscription: false,
    hint: "Single delivery",
  },
];

// Only buy once for non-dairy
const buyOncePattern = {
  value: "buy_once",
  label: "Buy Once",
  description: "One-time",
  icon: "bag-check-outline",
  isSubscription: false,
  hint: "Single delivery",
};

const weekDays = [
  { value: 0, label: "Mon" },
  { value: 1, label: "Tue" },
  { value: 2, label: "Wed" },
  { value: 3, label: "Thu" },
  { value: 4, label: "Fri" },
  { value: 5, label: "Sat" },
  { value: 6, label: "Sun" },
];

const CATEGORY_THEMES: Record<
  string,
  { bg: string; accent: string; icon: string }
> = {
  milk: { bg: "#EAF4FF", accent: "#3B82F6", icon: "water" },
  dairy: { bg: "#FFF4E6", accent: "#F59E0B", icon: "ice-cream" },
  bakery: { bg: "#FEF2F2", accent: "#EF4444", icon: "pizza" },
  fruits: { bg: "#F0FDF4", accent: "#22C55E", icon: "nutrition" },
  vegetables: { bg: "#F0FDF4", accent: "#16A34A", icon: "leaf" },
  essentials: { bg: "#F5F3FF", accent: "#8B5CF6", icon: "basket" },
  other: { bg: "#F8F7F4", accent: "#6B7280", icon: "cube" },
};

interface CartItem {
  id: string;
  product: any;
  quantity: number;
  pattern: string;
  customDays: number[];
}

function isDairyProduct(product: any): boolean {
  return DAIRY_CATEGORIES.includes(product?.category?.toLowerCase());
}

function getCategoryTheme(category: string) {
  return CATEGORY_THEMES[category?.toLowerCase()] || CATEGORY_THEMES.other;
}

function formatUnit(unit: string): string {
  if (!unit) return "";
  const lower = unit.toLowerCase().trim();
  const lMatch = lower.match(/^(\d+\.?\d*)\s*(l|litre|litres|liter|liters)$/);
  if (lMatch) return `${lMatch[1]}L`;
  const mlMatch = lower.match(/^(\d+\.?\d*)\s*ml$/);
  if (mlMatch) return `${mlMatch[1]}ml`;
  const kgMatch = lower.match(/^(\d+\.?\d*)\s*kg$/);
  if (kgMatch) return `${kgMatch[1]}kg`;
  const gMatch = lower.match(/^(\d+\.?\d*)\s*g$/);
  if (gMatch) return `${gMatch[1]}g`;
  return unit.charAt(0).toUpperCase() + unit.slice(1);
}

function patternLabel(pattern: string): string {
  return (
    {
      daily: "Daily",
      alternate: "Alternate",
      custom: "Custom",
      buy_once: "Once",
    }[pattern] ?? pattern
  );
}

// ─── Add-to-Cart Toast 
function AddedToCartToast({
  visible,
  productName,
  isSubscription,
}: {
  visible: boolean;
  productName: string;
  isSubscription?: boolean;
}) {
  const translateY = useRef(new Animated.Value(60)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      translateY.setValue(60);
      opacity.setValue(0);
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 16,
          stiffness: 200,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 60,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[toastStyles.toast, { opacity, transform: [{ translateY }] }]}
    >
      <Ionicons
        name={isSubscription ? "repeat-outline" : "checkmark-circle"}
        size={18}
        color={isSubscription ? "#f59e0b" : "#22c55e"}
      />
      <Text style={toastStyles.text}>
        <Text style={{ fontWeight: "800" }}>{productName}</Text>{" "}
        {isSubscription ? "subscription activated!" : "added to cart"}
      </Text>
    </Animated.View>
  );
}

const toastStyles = StyleSheet.create({
  toast: {
    position: "absolute",
    bottom: 100,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#1A1A1A",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 30,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    zIndex: 999,
  },
  text: { fontSize: 13, color: "#fff", fontWeight: "500" },
});

// ─── Success Modal 
function SuccessModal({
  visible,
  itemCount,
  isSubscription,
  onClose,
}: {
  visible: boolean;
  itemCount: number;
  isSubscription?: boolean;
  onClose: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    if (visible) {
      [scaleAnim, opacityAnim, checkScale, slideAnim].forEach((a) =>
        a.stopAnimation()
      );
      scaleAnim.setValue(0.8);
      opacityAnim.setValue(0);
      checkScale.setValue(0);
      slideAnim.setValue(18);

      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          damping: 14,
          stiffness: 180,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        Animated.spring(checkScale, {
          toValue: 1,
          useNativeDriver: true,
          damping: 8,
          stiffness: 220,
        }).start();
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 16,
          stiffness: 160,
        }).start();
      });
      Vibration.vibrate([0, 60, 40, 80]);
    }
  }, [visible]);

  const color = isSubscription ? "#f59e0b" : "#22c55e";
  const bgColor = isSubscription ? "#fffbeb" : "#f0fdf4";
  const borderColor = isSubscription ? "#fde68a" : "#bbf7d0";

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={ms.overlay}>
        <Animated.View
          style={[
            ms.card,
            { opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          <View style={ms.iconWrap}>
            <Animated.View
              style={[
                ms.iconCircle,
                { backgroundColor: bgColor, borderColor },
                { transform: [{ scale: checkScale }] },
              ]}
            >
              <Ionicons
                name={isSubscription ? "repeat" : "checkmark-circle"}
                size={28}
                color={color}
              />
            </Animated.View>
          </View>
          <Text style={ms.title}>
            {isSubscription ? "Subscription Active!" : "Order Placed!"}
          </Text>
          <Text style={ms.subtitle}>
            {isSubscription
              ? "Your dairy subscription has been activated\nand will be delivered as scheduled."
              : `${itemCount} item${itemCount > 1 ? "s" : ""} from your cart\nhave been placed successfully.`}
          </Text>
          <Animated.View
            style={[
              ms.tagRow,
              { opacity: opacityAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <View style={[ms.tag, { backgroundColor: bgColor, borderColor }]}>
              <Ionicons
                name={isSubscription ? "calendar-outline" : "bag-check-outline"}
                size={12}
                color={color}
              />
              <Text style={[ms.tagText, { color }]}>
                {isSubscription ? "Auto-delivery scheduled" : "Delivery scheduled"}
              </Text>
            </View>
          </Animated.View>
          <TouchableOpacity
            style={[ms.btn, { backgroundColor: color, shadowColor: color }]}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Text style={ms.btnText}>Great!</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── Info Modal 
function InfoModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
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
      Vibration.vibrate(60);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={ms.overlay}>
        <Animated.View
          style={[
            ms.card,
            { opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          <View style={ms.iconWrap}>
            <View
              style={[
                ms.iconCircle,
                { backgroundColor: "#fffbeb", borderColor: "#fde68a" },
              ]}
            >
              <Ionicons name="calendar-outline" size={28} color="#f59e0b" />
            </View>
          </View>
          <Text style={ms.title}>Select Days</Text>
          <Text style={ms.subtitle}>
            Please choose at least one day for your custom delivery schedule.
          </Text>
          <TouchableOpacity
            style={[
              ms.btn,
              { backgroundColor: "#f59e0b", shadowColor: "#f59e0b" },
            ]}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Text style={ms.btnText}>Got it</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── Wallet Error Modal 
function WalletErrorModal({
  visible,
  walletBalance,
  orderTotal,
  onClose,
}: {
  visible: boolean;
  walletBalance: number;
  orderTotal: number;
  onClose: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.85);
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
      Vibration.vibrate([0, 50, 30, 60]);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={ms.overlay}>
        <Animated.View
          style={[
            ms.card,
            { opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          <View style={ms.iconWrap}>
            <View
              style={[
                ms.iconCircle,
                { backgroundColor: "#fff7ed", borderColor: "#fed7aa" },
              ]}
            >
              <Ionicons name="wallet-outline" size={28} color="#f97316" />
            </View>
          </View>
          <Text style={ms.title}>Insufficient Balance</Text>
          <Text style={ms.subtitle}>
            Your wallet balance{" "}
            <Text style={{ fontWeight: "800", color: "#f97316" }}>
              ₹{walletBalance.toFixed(2)}
            </Text>{" "}
            is less than the cart total{" "}
            <Text style={{ fontWeight: "800", color: "#1A1A1A" }}>
              ₹{orderTotal.toFixed(2)}
            </Text>
            .{"\n"}Please recharge your wallet to continue.
          </Text>
          <TouchableOpacity
            style={[
              ms.btn,
              { backgroundColor: "#f97316", shadowColor: "#f97316" },
            ]}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Text style={ms.btnText}>OK, Got it</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const ms = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.52)",
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    width: "100%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 10 },
    elevation: 14,
  },
  iconWrap: {
    width: 90,
    height: 90,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111",
    marginBottom: 8,
    letterSpacing: -0.4,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    color: "#888",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  tagRow: { marginBottom: 22 },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  tagText: { fontSize: 11, fontWeight: "700" },
  btn: {
    width: "100%",
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  btnText: { fontSize: 16, fontWeight: "800", color: "#fff" },
});

// ─── Subscription Details Sheet 
function SubscriptionSheet({
  visible,
  subscriptions,
  onClose,
  onCancel,
  cancelling,
}: {
  visible: boolean;
  subscriptions: any[];
  onClose: () => void;
  onCancel: (id: string) => void;
  cancelling: string | null;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={subStyles.overlay}>
        <View style={subStyles.sheet}>
          <View style={subStyles.dragHandle} />
          <View style={subStyles.header}>
            <View style={subStyles.headerLeft}>
              <Ionicons name="repeat" size={18} color="#f59e0b" />
              <Text style={subStyles.headerTitle}>Active Subscriptions</Text>
              <View style={[subStyles.countBadge, { backgroundColor: "#f59e0b" }]}>
                <Text style={subStyles.countBadgeText}>
                  {subscriptions.length}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={subStyles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={16} color="#555" />
            </TouchableOpacity>
          </View>

          {subscriptions.length === 0 ? (
            <View style={subStyles.empty}>
              <Ionicons name="repeat-outline" size={44} color="#ddd" />
              <Text style={subStyles.emptyText}>No active subscriptions</Text>
              <Text style={subStyles.emptySubtext}>
                Subscribe to dairy products to see them here
              </Text>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 16 }}
            >
              {subscriptions.map((sub) => {
                const theme = getCategoryTheme(sub.product?.category || "dairy");
                const isCancelling = cancelling === sub.id;
                return (
                  <View key={sub.id} style={subStyles.subItem}>
                    <View
                      style={[subStyles.subIcon, { backgroundColor: theme.bg }]}
                    >
                      <Ionicons
                        name={theme.icon as any}
                        size={18}
                        color={theme.accent}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={subStyles.subName} numberOfLines={1}>
                        {sub.product?.name ?? sub.product_name ?? "Product"}
                      </Text>
                      <View style={subStyles.subMeta}>
                        <View style={subStyles.patternPill}>
                          <Ionicons
                            name="repeat-outline"
                            size={9}
                            color="#f59e0b"
                          />
                          <Text style={subStyles.patternPillText}>
                            {patternLabel(sub.pattern)}
                          </Text>
                        </View>
                        <Text style={subStyles.subQty}>Qty: {sub.quantity}</Text>
                        <Text style={subStyles.subPrice}>
                          ₹{(sub.amount ?? 0).toFixed(2)}
                        </Text>
                      </View>
                      {sub.start_date && (
                        <Text style={subStyles.subDate}>
                          Started: {sub.start_date}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      style={[
                        subStyles.cancelBtn,
                        isCancelling && { opacity: 0.5 },
                      ]}
                      onPress={() => onCancel(sub.id)}
                      disabled={isCancelling}
                    >
                      <Ionicons name="close-circle" size={13} color="#ef4444" />
                      <Text style={subStyles.cancelBtnText}>
                        {isCancelling ? "Cancelling…" : "Cancel"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
          )}
          <View style={{ height: 8 }} />
        </View>
      </View>
    </Modal>
  );
}

const subStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 34,
    maxHeight: "80%",
  },
  dragHandle: {
    width: 38,
    height: 4,
    backgroundColor: "#E0E0E0",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { fontSize: 17, fontWeight: "800", color: "#1A1A1A" },
  countBadge: {
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  countBadgeText: { fontSize: 11, fontWeight: "800", color: "#fff" },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.07)",
    justifyContent: "center",
    alignItems: "center",
  },
  subItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  subIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  subName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  subMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 3,
  },
  patternPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fffbeb",
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  patternPillText: { fontSize: 10, fontWeight: "700", color: "#b45309" },
  subQty: { fontSize: 11, color: "#888", fontWeight: "600" },
  subPrice: { fontSize: 11, fontWeight: "700", color: "#888" },
  subDate: { fontSize: 10, color: "#bbb", fontWeight: "500" },
  cancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fef2f2",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  cancelBtnText: { fontSize: 11, fontWeight: "700", color: "#ef4444" },
  empty: { alignItems: "center", paddingVertical: 44, gap: 8 },
  emptyText: { fontSize: 15, fontWeight: "800", color: "#aaa" },
  emptySubtext: { fontSize: 12, color: "#ccc", fontWeight: "500" },
});

// ─── Product Card 
function ModernProductCard({
  product,
  onPress,
  cartQty,
}: {
  product: any;
  onPress: () => void;
  cartQty: number;
}) {
  const theme = getCategoryTheme(product.category);
  const isDairy = isDairyProduct(product);
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.88}
    >
      <View style={[styles.cardImageBox, { backgroundColor: theme.bg }]}>
        {product.image ? (
          <Image
            source={{ uri: product.image }}
            style={styles.cardImage}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[
              styles.cardIconCircle,
              { backgroundColor: theme.accent + "22" },
            ]}
          >
            <Ionicons name={theme.icon as any} size={24} color={theme.accent} />
          </View>
        )}
        {!product.is_available && (
          <View style={styles.outOfStockBadge}>
            <Text style={styles.outOfStockText}>Out of stock</Text>
          </View>
        )}
        {isDairy ? (
          <View style={[styles.subTypeBadge, { backgroundColor: "#f59e0b" }]}>
            <Ionicons name="repeat-outline" size={8} color="#fff" />
            <Text style={styles.subTypeBadgeText}>Sub</Text>
          </View>
        ) : (
          cartQty > 0 && (
            <View
              style={[styles.cartQtyBadge, { backgroundColor: theme.accent }]}
            >
              <Text style={styles.cartQtyBadgeText}>{cartQty}</Text>
            </View>
          )
        )}
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={1}>
          {product.name}
        </Text>
        <View style={styles.cardFooter}>
          <Text style={[styles.cardPrice, { color: theme.accent }]}>
            ₹{product.price}
          </Text>
          <Text style={[styles.cardUnit, { color: theme.accent + "99" }]}>
            {formatUnit(product.unit)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Category Section 
function CategorySection({
  value,
  label,
  items,
  onPress,
  cart,
}: {
  value: string;
  label: string;
  items: any[];
  onPress: (item: any) => void;
  cart: CartItem[];
}) {
  const theme = getCategoryTheme(value);
  const isDairy = DAIRY_CATEGORIES.includes(value.toLowerCase());
  return (
    <View style={styles.categorySection}>
      <View style={styles.categoryHeader}>
        <View style={styles.categoryTitleRow}>
          <View
            style={[styles.categoryDot, { backgroundColor: theme.accent }]}
          />
          <Text style={styles.categoryTitle}>{label}</Text>
          <View
            style={[
              styles.categoryCountBadge,
              { backgroundColor: theme.accent + "18" },
            ]}
          >
            <Text style={[styles.categoryCount, { color: theme.accent }]}>
              {items.length}
            </Text>
          </View>
          {isDairy && (
            <View style={styles.dairySubBadge}>
              <Ionicons name="repeat-outline" size={9} color="#f59e0b" />
              <Text style={styles.dairySubBadgeText}>Sub available</Text>
            </View>
          )}
        </View>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalList}
        directionalLockEnabled={true}
      >
        {items.map((item) => {
          const cartQty = cart
            .filter((c) => c.product.id === item.id)
            .reduce((sum, c) => sum + c.quantity, 0);
          return (
            <ModernProductCard
              key={item.id?.toString()}
              product={item}
              cartQty={cartQty}
              onPress={() => onPress(item)}
            />
          );
        })}
      </ScrollView>
    </View>
  );
}

// ─── RIGHT SIDEBAR Cart Sheet 
function CartSheet({
  visible,
  cart,
  walletBalance,
  onClose,
  onRemove,
  onUpdateQty,
  onPlaceOrder,
  submitting,
}: {
  visible: boolean;
  cart: CartItem[];
  walletBalance: number;
  onClose: () => void;
  onRemove: (id: string) => void;
  onUpdateQty: (id: string, qty: number) => void;
  onPlaceOrder: () => void;
  submitting: boolean;
}) {
  const slideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 20,
          stiffness: 200,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_WIDTH,
          duration: 240,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const canAfford = walletBalance >= cartTotal;

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none">
      <View style={{ flex: 1 }}>
        {/* Dimmed overlay */}
        <Animated.View
          style={[cartStyles.overlay, { opacity: overlayOpacity }]}
        >
          <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
        </Animated.View>

        {/* Right sidebar panel */}
        <Animated.View
          style={[
            cartStyles.sidebar,
            { transform: [{ translateX: slideAnim }] },
          ]}
        >
          {/* Header */}
          <View style={cartStyles.header}>
            <TouchableOpacity style={cartStyles.backBtn} onPress={onClose}>
              <Ionicons name="arrow-back" size={18} color="#555" />
            </TouchableOpacity>
            <View style={cartStyles.headerCenter}>
              <Ionicons name="cart" size={18} color={Colors.primary} />
              <Text style={cartStyles.headerTitle}>My Cart</Text>
              {cart.length > 0 && (
                <View style={cartStyles.countBadge}>
                  <Text style={cartStyles.countBadgeText}>{cart.length}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Wallet strip */}
          <View style={cartStyles.walletStrip}>
            <View style={cartStyles.walletLeft}>
              <Ionicons
                name="wallet-outline"
                size={13}
                color={canAfford ? "#22c55e" : "#f97316"}
              />
              <Text style={cartStyles.walletLabel}>Wallet</Text>
            </View>
            <Text
              style={[
                cartStyles.walletBalance,
                { color: canAfford ? "#22c55e" : "#f97316" },
              ]}
            >
              ₹{walletBalance.toFixed(2)}
            </Text>
          </View>

          <View style={styles.divider} />

          {cart.length === 0 ? (
            <View style={cartStyles.empty}>
              <Ionicons name="cart-outline" size={44} color="#ddd" />
              <Text style={cartStyles.emptyText}>Cart is empty</Text>
              <Text style={cartStyles.emptySubtext}>Add products to order</Text>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 8 }}
            >
              {cart.map((item) => {
                const theme = getCategoryTheme(item.product.category);
                return (
                  <View key={item.id} style={cartStyles.cartItem}>
                    <View
                      style={[
                        cartStyles.cartItemIcon,
                        { backgroundColor: theme.bg },
                      ]}
                    >
                      <Ionicons
                        name={theme.icon as any}
                        size={16}
                        color={theme.accent}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={cartStyles.cartItemName} numberOfLines={2}>
                        {item.product.name}
                      </Text>
                      <Text style={cartStyles.cartItemPrice}>
                        ₹{(item.product.price * item.quantity).toFixed(2)}
                      </Text>
                    </View>
                    <View style={cartStyles.qtyRow}>
                      <TouchableOpacity
                        style={cartStyles.qtyBtn}
                        onPress={() =>
                          item.quantity > 1
                            ? onUpdateQty(item.id, item.quantity - 1)
                            : onRemove(item.id)
                        }
                      >
                        <Ionicons
                          name={item.quantity === 1 ? "trash-outline" : "remove"}
                          size={12}
                          color={item.quantity === 1 ? "#f97316" : Colors.text}
                        />
                      </TouchableOpacity>
                      <Text style={cartStyles.qtyValue}>{item.quantity}</Text>
                      <TouchableOpacity
                        style={[
                          cartStyles.qtyBtn,
                          { backgroundColor: theme.accent },
                        ]}
                        onPress={() => onUpdateQty(item.id, item.quantity + 1)}
                      >
                        <Ionicons name="add" size={12} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}

          {cart.length > 0 && (
            <View style={cartStyles.footer}>
              <View style={styles.divider} />
              <View style={cartStyles.totalRow}>
                <Text style={cartStyles.totalLabel}>Total</Text>
                <Text
                  style={[
                    cartStyles.totalValue,
                    { color: canAfford ? "#1A1A1A" : "#f97316" },
                  ]}
                >
                  ₹{cartTotal.toFixed(2)}
                </Text>
              </View>
              {!canAfford && (
                <View style={cartStyles.insufficientBanner}>
                  <Ionicons name="warning-outline" size={12} color="#f97316" />
                  <Text style={cartStyles.insufficientText}>
                    Insufficient balance. Recharge to order.
                  </Text>
                </View>
              )}
              <Button
                title={
                  submitting
                    ? "Placing Order..."
                    : `Place Order · ₹${cartTotal.toFixed(2)}`
                }
                onPress={onPlaceOrder}
                loading={submitting}
                disabled={!canAfford}
              />
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const cartStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sidebar: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: SCREEN_WIDTH * 0.82,
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderBottomLeftRadius: 24,
    paddingBottom: 34,
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: { width: -6, height: 0 },
    elevation: 18,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 14,
    gap: 10,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.06)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    flex: 1,
  },
  headerTitle: { fontSize: 17, fontWeight: "800", color: "#1A1A1A" },
  countBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  countBadgeText: { fontSize: 11, fontWeight: "800", color: "#fff" },
  walletStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 6,
  },
  walletLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  walletLabel: { fontSize: 12, fontWeight: "600", color: "#888" },
  walletBalance: { fontSize: 14, fontWeight: "800" },
  cartItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  cartItemIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  cartItemName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 3,
  },
  cartItemPrice: { fontSize: 12, fontWeight: "700", color: "#888" },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  qtyBtn: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  qtyValue: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1A1A1A",
    minWidth: 16,
    textAlign: "center",
  },
  footer: {
    paddingHorizontal: 16,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  totalLabel: { fontSize: 13, fontWeight: "700", color: "#888" },
  totalValue: { fontSize: 19, fontWeight: "800" },
  insufficientBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#fff7ed",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 10,
  },
  insufficientText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#f97316",
    flex: 1,
  },
  empty: { alignItems: "center", paddingVertical: 60, gap: 8, flex: 1, justifyContent: "center" },
  emptyText: { fontSize: 15, fontWeight: "800", color: "#aaa" },
  emptySubtext: { fontSize: 12, color: "#ccc", fontWeight: "500" },
});

// ─── Zepto-style Mini Cart Pill 
function MiniCartPill({
  cart,
  onPress,
}: {
  cart: CartItem[];
  onPress: () => void;
}) {
  const translateY = useRef(new Animated.Value(80)).current;
  const scale = useRef(new Animated.Value(0.9)).current;
  const prevCount = useRef(0);
  const bounceAnim = useRef(new Animated.Value(1)).current;

  const totalItems = cart.reduce((sum, c) => sum + c.quantity, 0);
  const cartTotal = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  useEffect(() => {
    if (totalItems > 0) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 18,
          stiffness: 220,
        }),
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          damping: 14,
          stiffness: 200,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 80,
          useNativeDriver: true,
          damping: 18,
          stiffness: 220,
        }),
        Animated.spring(scale, {
          toValue: 0.9,
          useNativeDriver: true,
          damping: 14,
          stiffness: 200,
        }),
      ]).start();
    }

    // Bounce on count change
    if (totalItems > 0 && totalItems !== prevCount.current) {
      Animated.sequence([
        Animated.spring(bounceAnim, {
          toValue: 1.12,
          useNativeDriver: true,
          damping: 6,
          stiffness: 400,
        }),
        Animated.spring(bounceAnim, {
          toValue: 1,
          useNativeDriver: true,
          damping: 10,
          stiffness: 300,
        }),
      ]).start();
    }
    prevCount.current = totalItems;
  }, [totalItems]);

  if (totalItems === 0) return null;

  return (
    <Animated.View
      style={[
        miniCartStyles.container,
        {
          transform: [{ translateY }, { scale }],
        },
      ]}
    >
      <TouchableOpacity
        style={miniCartStyles.pill}
        onPress={onPress}
        activeOpacity={0.93}
      >
        {/* Left: item count badge */}
        <Animated.View
          style={[
            miniCartStyles.countBox,
            { transform: [{ scale: bounceAnim }] },
          ]}
        >
          <Text style={miniCartStyles.countText}>{totalItems}</Text>
        </Animated.View>

        {/* Center: label */}
        <View style={miniCartStyles.center}>
          <Text style={miniCartStyles.label}>View Cart</Text>
          <Text style={miniCartStyles.sublabel}>
            {cart.length} item{cart.length > 1 ? "s" : ""}
          </Text>
        </View>

        {/* Right: total + arrow */}
        <View style={miniCartStyles.right}>
          <Text style={miniCartStyles.total}>₹{cartTotal.toFixed(0)}</Text>
          <View style={miniCartStyles.arrowBox}>
            <Ionicons name="chevron-forward" size={13} color={Colors.primary} />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const miniCartStyles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
    zIndex: 100,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 14,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1A1A",
    borderRadius: 20,
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 12,
    gap: 10,
  },
  countBox: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    minWidth: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  countText: { fontSize: 14, fontWeight: "900", color: "#fff" },
  center: { flex: 1 },
  label: { fontSize: 14, fontWeight: "800", color: "#fff" },
  sublabel: { fontSize: 10, fontWeight: "500", color: "rgba(255,255,255,0.55)", marginTop: 1 },
  right: { flexDirection: "row", alignItems: "center", gap: 6 },
  total: { fontSize: 15, fontWeight: "800", color: "#fff" },
  arrowBox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: Colors.primary + "25",
    justifyContent: "center",
    alignItems: "center",
  },
});

// ─── Main Screen 
export default function CatalogScreen() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Product detail modal
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [pattern, setPattern] = useState("daily");
  const [customDays, setCustomDays] = useState<number[]>([]);

  // Cart (buy_once items for both dairy and non-dairy)
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartVisible, setCartVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Subscriptions panel
  const [subSheetVisible, setSubSheetVisible] = useState(false);
  const [activeSubscriptions, setActiveSubscriptions] = useState<any[]>([]);
  const [cancelling, setCancelling] = useState<string | null>(null);

  // Modals & feedback
  const [successVisible, setSuccessVisible] = useState(false);
  const [successIsSubscription, setSuccessIsSubscription] = useState(false);
  const [infoVisible, setInfoVisible] = useState(false);
  const [walletErrorVisible, setWalletErrorVisible] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastProduct, setToastProduct] = useState("");
  const [toastIsSubscription, setToastIsSubscription] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isFocused = useIsFocused();

  const fetchSubscriptions = useCallback(async () => {
    try {
      const subs = await api.getSubscriptions();
      setActiveSubscriptions(
        (subs || []).filter(
          (s: any) => s.status === "active" || !s.status
        )
      );
    } catch (e) {
      console.error("Subscriptions fetch error:", e);
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [productsData, categoriesData, adminsData, walletData] =
        await Promise.all([
          api.getCatalogProducts(undefined, selectedCategory || undefined),
          api.getCategories(),
          api.getAdmins(),
          api.getWallet(),
        ]);
      setProducts(productsData);
      setCategories(categoriesData);
      setAdmins(
        adminsData.map((a: any) => ({
          ...a,
          id: a.id || a._id || a.admin_id,
        }))
      );
      setWalletBalance(walletData.balance ?? 0);
      await fetchSubscriptions();
    } catch (error) {
      console.error("Catalog error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory, fetchSubscriptions]);

  useEffect(() => {
    if (!isFocused) return;
    fetchData();
    const interval = setInterval(() => {
      if (!modalVisible && !cartVisible && !subSheetVisible) fetchData();
    }, 2000);
    return () => clearInterval(interval);
  }, [isFocused, fetchData, modalVisible, cartVisible, subSheetVisible]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const getAdminName = (adminId: string) => {
    const admin = admins.find((a) => a.id === adminId);
    return admin?.shop_name || admin?.name || null;
  };

  const openModal = (product: any) => {
    const dairy = isDairyProduct(product);
    setSelectedProduct(product);
    setQuantity(1);
    // Dairy defaults to daily; non-dairy only has buy_once
    setPattern(dairy ? "daily" : "buy_once");
    setCustomDays([]);
    setModalVisible(true);
  };

  const toggleCustomDay = (day: number) => {
    setCustomDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  // Whether the selected pattern is a subscription (not buy_once)
  const isSubscriptionPattern = (p: string) => p !== "buy_once";

  // ── Handle primary action
  const handlePrimaryAction = async () => {
    const dairy = isDairyProduct(selectedProduct);
    const isSub = isSubscriptionPattern(pattern);

    if (dairy && isSub) {
      // Dairy + subscription pattern → direct subscription
      if (pattern === "custom" && customDays.length === 0) {
        setInfoVisible(true);
        return;
      }

      setSubmitting(true);
      try {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const startDate = tomorrow.toISOString().split("T")[0];

        await api.createSubscription({
          product_id: selectedProduct.id,
          quantity,
          pattern,
          custom_days: pattern === "custom" ? customDays : null,
          start_date: startDate,
          end_date: null,
          amount: selectedProduct.price * quantity,
        });

        setModalVisible(false);

        // ✅ Fix: re-fetch subscriptions immediately so the badge updates
        await fetchSubscriptions();
        api.getWallet().then((w) => setWalletBalance(w.balance ?? 0)).catch(() => {});

        setSuccessIsSubscription(true);
        setSuccessVisible(true);

        setToastProduct(selectedProduct.name);
        setToastIsSubscription(true);
        setToastVisible(true);
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToastVisible(false), 3000);
      } catch (e: any) {
        console.error("Subscription error:", e);
      } finally {
        setSubmitting(false);
      }
    } else {
      // buy_once (dairy or non-dairy) → add to cart
      const newItem: CartItem = {
        id: `${selectedProduct.id}_${Date.now()}`,
        product: selectedProduct,
        quantity,
        pattern: "buy_once",
        customDays: [],
      };

      setCart((prev) => [...prev, newItem]);
      setModalVisible(false);

      setToastProduct(selectedProduct.name);
      setToastIsSubscription(false);
      setToastVisible(true);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToastVisible(false), 2800);
    }
  };

  // ── Cart handlers
  const handleRemoveFromCart = (id: string) => {
    setCart((prev) => prev.filter((c) => c.id !== id));
  };

  const handleUpdateQty = (id: string, qty: number) => {
    setCart((prev) =>
      prev.map((c) => (c.id === id ? { ...c, quantity: qty } : c))
    );
  };

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const handlePlaceOrder = async () => {
    if (walletBalance < cartTotal) {
      setWalletErrorVisible(true);
      return;
    }

    setSubmitting(true);
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const startDate = tomorrow.toISOString().split("T")[0];

      await Promise.all(
        cart.map((item) =>
          api.createSubscription({
            product_id: item.product.id,
            quantity: item.quantity,
            pattern: "buy_once",
            custom_days: null,
            start_date: startDate,
            end_date: startDate,
            amount: item.product.price * item.quantity,
          })
        )
      );

      const itemCount = cart.length;
      setCart([]);
      setCartVisible(false);
      setSuccessIsSubscription(false);
      setSuccessVisible(true);

      api.getWallet().then((w) => setWalletBalance(w.balance ?? 0)).catch(() => {});
    } catch (e: any) {
      console.error("Order error:", e);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Cancel subscription
  const handleCancelSubscription = async (id: string) => {
    setCancelling(id);
    try {
      await api.cancelSubscription(id);
      setActiveSubscriptions((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      console.error("Cancel subscription error:", e);
    } finally {
      setCancelling(null);
    }
  };

  const groupedProducts = React.useMemo(() => {
    if (selectedCategory) {
      const label =
        categories.find((c) => c.value === selectedCategory)?.label ||
        selectedCategory;
      return [{ value: selectedCategory, label, items: products }];
    }
    const map: Record<string, any[]> = {};
    products.forEach((p) => {
      const cat = p.category || "other";
      if (!map[cat]) map[cat] = [];
      map[cat].push(p);
    });
    return Object.entries(map).map(([catValue, items]) => ({
      value: catValue,
      label:
        categories.find((c) => c.value === catValue)?.label || catValue,
      items,
    }));
  }, [products, selectedCategory, categories]);

  if (loading) return <LoadingScreen />;

  const modalTheme = getCategoryTheme(selectedProduct?.category);
  const shopName = getAdminName(selectedProduct?.admin_id);
  const isSelectedDairy = isDairyProduct(selectedProduct);
  // All 4 patterns for dairy; only buy_once for non-dairy
  const displayPatterns = isSelectedDairy ? subscriptionPatterns : [buyOncePattern];
  const selectedPatternObj = displayPatterns.find((p) => p.value === pattern);
  const orderTotal = (selectedProduct?.price ?? 0) * quantity;
  const cartItemCount = cart.length;
  const subCount = activeSubscriptions.length;
  const isSub = isSubscriptionPattern(pattern);

  const ListHeader = (
    <>
      <View style={styles.pageHeader}>
        <View style={styles.pageHeaderTop}>
          <Text style={styles.pageTitle}>Shop</Text>

          <View style={styles.headerButtons}>
            {/* Subscription details button */}
            <TouchableOpacity
              style={styles.subBtn}
              onPress={() => setSubSheetVisible(true)}
            >
              <Ionicons name="repeat-outline" size={17} color="#f59e0b" />
              {subCount > 0 && (
                <View style={styles.subBadge}>
                  <Text style={styles.subBadgeText}>{subCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Cart button */}
            <TouchableOpacity
              style={styles.cartBtn}
              onPress={() => setCartVisible(true)}
            >
              <Ionicons name="cart-outline" size={20} color={Colors.primary} />
              {cartItemCount > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{cartItemCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.pageHeaderRight}>
          <Text style={styles.pageSubtitle}>
            {products.length} products available
          </Text>
          <View style={styles.walletPill}>
            <Ionicons name="wallet-outline" size={11} color={Colors.primary} />
            <Text style={styles.walletPillText}>
              ₹{walletBalance.toFixed(2)}
            </Text>
          </View>
        </View>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryRow}
        style={styles.categoryChipsScroll}
      >
        <TouchableOpacity
          style={[styles.chip, !selectedCategory && styles.chipActive]}
          onPress={() => setSelectedCategory(null)}
        >
          <Text
            style={[
              styles.chipText,
              !selectedCategory && styles.chipTextActive,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.value}
            style={[
              styles.chip,
              selectedCategory === cat.value && styles.chipActive,
            ]}
            onPress={() => setSelectedCategory(cat.value)}
          >
            <Text
              style={[
                styles.chipText,
                selectedCategory === cat.value && styles.chipTextActive,
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={groupedProducts}
        keyExtractor={(item) => item.value}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="cube-outline" size={36} color="#ccc" />
            </View>
            <Text style={styles.emptyText}>No products found</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        renderItem={({ item }) => (
          <CategorySection
            value={item.value}
            label={item.label}
            items={item.items}
            cart={cart}
            onPress={openModal}
          />
        )}
      />

      {/* ── Zepto-style Mini Cart Pill ── */}
      <MiniCartPill cart={cart} onPress={() => setCartVisible(true)} />

      {/* ── Product Detail Modal ── */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.dragHandle} />

            {/* Product header */}
            <View
              style={[
                styles.modalProductHeader,
                { backgroundColor: modalTheme.bg },
              ]}
            >
              <View
                style={[
                  styles.modalIconCircle,
                  { backgroundColor: modalTheme.accent + "22" },
                ]}
              >
                <Ionicons
                  name={modalTheme.icon as any}
                  size={26}
                  color={modalTheme.accent}
                />
              </View>
              <View style={{ flex: 1 }}>
                {shopName && (
                  <Text style={styles.modalShopName}>{shopName}</Text>
                )}
                <Text style={styles.modalTitle}>{selectedProduct?.name}</Text>
                <View style={styles.modalMetaRow}>
                  <Text
                    style={[styles.modalPrice, { color: modalTheme.accent }]}
                  >
                    ₹{selectedProduct?.price}
                  </Text>
                  <Text style={styles.modalDot}>·</Text>
                  <Text
                    style={[styles.modalUnit, { color: modalTheme.accent }]}
                  >
                    {formatUnit(selectedProduct?.unit)}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={16} color="#555" />
              </TouchableOpacity>
            </View>

            {/* Info banner: dairy shows "choose pattern", non-dairy shows "buy once only" */}
            {isSelectedDairy ? (
              <View style={styles.dairyInfoBanner}>
                <Ionicons name="repeat-outline" size={13} color="#f59e0b" />
                <Text style={styles.dairyInfoText}>
                  Choose a subscription or buy once for dairy products
                </Text>
              </View>
            ) : (
              <View style={styles.buyOnceInfoBanner}>
                <Ionicons name="flash-outline" size={13} color={Colors.primary} />
                <Text style={styles.buyOnceInfoText}>
                  Added to cart as a one-time order
                </Text>
              </View>
            )}

            <View style={styles.divider} />

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Quantity */}
              <Text style={styles.sectionLabel}>Quantity</Text>
              <View style={styles.quantityRow}>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                >
                  <Ionicons name="remove" size={16} color={Colors.text} />
                </TouchableOpacity>
                <View style={styles.qtyValueBox}>
                  <Text style={styles.qtyValue}>{quantity}</Text>
                  <Text
                    style={[styles.qtyUnitLabel, { color: modalTheme.accent }]}
                  >
                    {formatUnit(selectedProduct?.unit)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.qtyBtn,
                    { backgroundColor: modalTheme.accent },
                  ]}
                  onPress={() => setQuantity((q) => q + 1)}
                >
                  <Ionicons name="add" size={16} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* Order subtotal */}
              <View style={styles.orderTotalRow}>
                <Text style={styles.orderTotalLabel}>Item Subtotal</Text>
                <Text style={[styles.orderTotalValue, { color: "#1A1A1A" }]}>
                  ₹{orderTotal.toFixed(2)}
                </Text>
              </View>

              {/* Delivery Pattern — all 4 for dairy, only buy_once for non-dairy */}
              <Text style={styles.sectionLabel}>
                {isSelectedDairy ? "Delivery Option" : "Order Type"}
              </Text>
              <View style={styles.patternGrid}>
                {displayPatterns.map((p) => {
                  const isActive = pattern === p.value;
                  const activeColor = p.isSubscription ? "#22c55e" : Colors.primary;
                  return (
                    <TouchableOpacity
                      key={p.value}
                      style={[
                        styles.patternCard,
                        isActive && {
                          backgroundColor: activeColor,
                          borderColor: activeColor,
                        },
                      ]}
                      onPress={() => setPattern(p.value)}
                    >
                      <View style={styles.patternCardTop}>
                        <Ionicons
                          name={p.icon as any}
                          size={18}
                          color={isActive ? "#fff" : activeColor}
                        />
                        <View
                          style={[
                            styles.patternTypeBadge,
                            {
                              backgroundColor: isActive
                                ? "rgba(255,255,255,0.2)"
                                : activeColor + "15",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.patternTypeBadgeText,
                              { color: isActive ? "#fff" : activeColor },
                            ]}
                          >
                            {p.description}
                          </Text>
                        </View>
                      </View>
                      <Text
                        style={[
                          styles.patternLabel,
                          isActive && { color: "#fff" },
                        ]}
                      >
                        {p.label}
                      </Text>
                      <Text
                        style={[
                          styles.patternHint,
                          {
                            color: isActive
                              ? "rgba(255,255,255,0.8)"
                              : "#aaa",
                          },
                        ]}
                      >
                        {p.hint}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Custom days picker — only for dairy + custom pattern */}
              {isSelectedDairy && pattern === "custom" && (
                <>
                  <Text style={styles.sectionLabel}>Select Delivery Days</Text>
                  <View style={styles.daysRow}>
                    {weekDays.map((day) => (
                      <TouchableOpacity
                        key={day.value}
                        style={[
                          styles.dayPill,
                          customDays.includes(day.value) && {
                            backgroundColor: modalTheme.accent,
                            borderColor: modalTheme.accent,
                          },
                        ]}
                        onPress={() => toggleCustomDay(day.value)}
                      >
                        <Text
                          style={[
                            styles.dayLabel,
                            customDays.includes(day.value) &&
                              styles.dayLabelActive,
                          ]}
                        >
                          {day.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {customDays.length > 0 && (
                    <Text style={styles.selectedDaysHint}>
                      Delivering on {customDays.length} day
                      {customDays.length > 1 ? "s" : ""} per week
                    </Text>
                  )}
                </>
              )}

              <View style={{ height: 16 }} />

              {/* Primary action button */}
              <Button
                title={
                  submitting
                    ? isSub
                      ? "Subscribing..."
                      : "Adding..."
                    : isSub
                    ? `Subscribe — ${selectedPatternObj?.label ?? "Daily"}`
                    : "Add to Cart"
                }
                onPress={handlePrimaryAction}
                loading={submitting}
              />
              <View style={{ height: 16 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Right Sidebar Cart ── */}
      <CartSheet
        visible={cartVisible}
        cart={cart}
        walletBalance={walletBalance}
        onClose={() => setCartVisible(false)}
        onRemove={handleRemoveFromCart}
        onUpdateQty={handleUpdateQty}
        onPlaceOrder={handlePlaceOrder}
        submitting={submitting}
      />

      {/* ── Subscription Details Sheet ── */}
      <SubscriptionSheet
        visible={subSheetVisible}
        subscriptions={activeSubscriptions}
        onClose={() => setSubSheetVisible(false)}
        onCancel={handleCancelSubscription}
        cancelling={cancelling}
      />

      {/* ── Modals ── */}
      <SuccessModal
        visible={successVisible}
        itemCount={cart.length || 1}
        isSubscription={successIsSubscription}
        onClose={() => setSuccessVisible(false)}
      />
      <InfoModal visible={infoVisible} onClose={() => setInfoVisible(false)} />
      <WalletErrorModal
        visible={walletErrorVisible}
        walletBalance={walletBalance}
        orderTotal={cartTotal}
        onClose={() => setWalletErrorVisible(false)}
      />

      {/* ── Toast ── */}
      <AddedToCartToast
        visible={toastVisible}
        productName={toastProduct}
        isSubscription={toastIsSubscription}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F7F4" },
  listContent: { paddingBottom: 120 },

  pageHeader: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 6 },
  pageHeaderTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1A1A1A",
    letterSpacing: -0.5,
  },

  headerButtons: { flexDirection: "row", alignItems: "center", gap: 10 },

  subBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#fffbeb",
    borderWidth: 1.5,
    borderColor: "#fde68a",
    justifyContent: "center",
    alignItems: "center",
  },
  subBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#f59e0b",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  subBadgeText: { fontSize: 9, fontWeight: "800", color: "#fff" },

  cartBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: Colors.primary + "12",
    justifyContent: "center",
    alignItems: "center",
  },
  cartBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  cartBadgeText: { fontSize: 9, fontWeight: "800", color: "#fff" },
  pageHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  pageSubtitle: { fontSize: 12, color: "#aaa" },
  walletPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.primary + "12",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  walletPillText: { fontSize: 11, fontWeight: "700", color: Colors.primary },

  categoryChipsScroll: { flexShrink: 0 },
  categoryRow: { paddingHorizontal: 20, paddingVertical: 8, gap: 8 },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eee",
    marginRight: 6,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 12, fontWeight: "600", color: "#888" },
  chipTextActive: { color: "#fff" },

  categorySection: { marginTop: 22 },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  categoryTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  categoryDot: { width: 7, height: 7, borderRadius: 4 },
  categoryTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1A1A1A",
    letterSpacing: -0.2,
  },
  categoryCountBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  categoryCount: { fontSize: 11, fontWeight: "700" },
  dairySubBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fffbeb",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  dairySubBadgeText: { fontSize: 9, fontWeight: "700", color: "#b45309" },
  horizontalList: { paddingLeft: 20, paddingRight: 8, gap: 10 },

  card: {
    width: CARD_WIDTH,
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    alignSelf: "flex-start",
  },
  cardImageBox: { height: 88, justifyContent: "center", alignItems: "center" },
  cardImage: { width: "100%", height: "100%" },
  cardIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  outOfStockBadge: {
    position: "absolute",
    bottom: 6,
    left: 6,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  outOfStockText: { color: "#fff", fontSize: 9, fontWeight: "700" },
  subTypeBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 3,
  },
  subTypeBadgeText: { fontSize: 8, fontWeight: "800", color: "#fff" },
  cartQtyBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cartQtyBadgeText: { fontSize: 10, fontWeight: "800", color: "#fff" },
  cardBody: { padding: 8, paddingBottom: 10 },
  cardName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardPrice: { fontSize: 14, fontWeight: "800" },
  cardUnit: { fontSize: 10, fontWeight: "600" },

  emptyState: { alignItems: "center", paddingTop: 70, gap: 10 },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: { fontSize: 14, color: "#bbb", fontWeight: "500" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 34,
    maxHeight: "92%",
  },
  dragHandle: {
    width: 38,
    height: 4,
    backgroundColor: "#E0E0E0",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 14,
  },
  modalProductHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    padding: 12,
    marginBottom: 4,
  },
  modalIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  modalShopName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1A1A1A",
    letterSpacing: -0.3,
    marginBottom: 1,
  },
  modalTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    marginBottom: 4,
  },
  modalMetaRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  modalPrice: { fontSize: 14, fontWeight: "800" },
  modalDot: { fontSize: 13, color: "#ccc" },
  modalUnit: { fontSize: 12, fontWeight: "600" },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.07)",
    justifyContent: "center",
    alignItems: "center",
  },

  dairyInfoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fffbeb",
    borderColor: "#fde68a",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 6,
    marginBottom: 2,
  },
  dairyInfoText: { fontSize: 11, fontWeight: "600", color: "#b45309", flex: 1 },
  buyOnceInfoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.primary + "10",
    borderColor: Colors.primary + "30",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 6,
    marginBottom: 2,
  },
  buyOnceInfoText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.primary,
    flex: 1,
  },

  divider: { height: 1, backgroundColor: "#F0F0F0", marginVertical: 14 },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#bbb",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 10,
    marginTop: 2,
  },
  orderTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 22,
  },
  orderTotalLabel: { fontSize: 12, fontWeight: "600", color: "#888" },
  orderTotalValue: { fontSize: 16, fontWeight: "800" },
  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 16,
  },
  qtyBtn: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  qtyValueBox: { alignItems: "center", minWidth: 54 },
  qtyValue: { fontSize: 24, fontWeight: "800", color: "#1A1A1A" },
  qtyUnitLabel: { fontSize: 10, fontWeight: "700", marginTop: 1 },
  patternGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14,
  },
  patternCard: {
    width: "47%",
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#F8F8F8",
    borderWidth: 1.5,
    borderColor: "transparent",
    gap: 4,
  },
  patternCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  patternTypeBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  patternTypeBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  patternLabel: { fontSize: 13, fontWeight: "700", color: "#1A1A1A" },
  patternHint: { fontSize: 10, color: "#aaa", fontWeight: "500" },
  daysRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  dayPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
    borderWidth: 1.5,
    borderColor: "#E5E5E5",
  },
  dayLabel: { fontSize: 11, fontWeight: "700", color: "#999" },
  dayLabelActive: { color: "#fff" },
  selectedDaysHint: {
    fontSize: 11,
    color: "#888",
    marginBottom: 16,
    fontWeight: "500",
  },
});