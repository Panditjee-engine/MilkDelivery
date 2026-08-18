import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../src/services/api";
import LoadingScreen from "../../src/components/LoadingScreen";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ── Color palette ─────────────────────────────────────────────────────────

const C = {
  primary: "#FF9675",
  accent: "#FD9E69",
  light: "#FFD999",
  dark: "#BB6B3F",
  bg: "#FFF8EF",
  card: "#FFFFFF",
  text: "#3D1F0A",
  textMuted: "#A07850",
  textLight: "#C9A882",
  border: "#F5E6D0",
  green: "#3D8B4C",
  greenBg: "#E8F3E5",
  red: "#E0553F",
  redBg: "#FDECE8",
};

// ── Types ──────────────────────────────────────────────────────────────────

type FilterType = "today" | "assigned" | "all" | "expired";

interface SubItem {
  product_id: string;
  product_name?: string;
  name?: string;
  quantity: number;
  price: number;
  amount: number;
}

interface Subscription {
  id: string;
  items: SubItem[];
  total_quantity: number;
  total_amount: number;
  pattern: string;
  custom_days?: number[];
  start_date: string;
  end_date?: string;
  delivery_slot?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_address?: any;
  address?: any;
  admin_name?: string;
  is_accepted?: boolean;
  accepted_by?: string;
  status?: string;
  on_vacation_today?: boolean;
  vacation_start_date?: string;
  vacation_end_date?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────

const getPattern = (s: any): string =>
  String(s?.pattern ?? s?.subscription_type ?? s?.frequency ?? "")
    .toLowerCase()
    .trim();

const isRecurring = (s: any): boolean => {
  const p = getPattern(s);
  if (!p) return true;
  return p !== "buy_once" && p !== "one_time" && p !== "once";
};

const getStatus = (s: any): string => String(s?.status ?? "").toLowerCase().trim();
const isCancelledStatus = (s: any): boolean => getStatus(s) === "cancelled";
const isInactiveStatus = (s: any): boolean => getStatus(s) === "inactive";

const todayStr = () => {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

/** Date-only diff in days between two YYYY-MM-DD strings */
const dateDiffDays = (aStr: string, bStr: string): number =>
  Math.round((new Date(aStr).getTime() - new Date(bStr).getTime()) / 86400000);

/** True only when TODAY exactly matches a scheduled delivery day for this subscription */
const isDeliveryToday = (sub: any): boolean => {
  const tStr = todayStr();
  const start = sub.start_date?.split?.("T")?.[0] ?? sub.start_date;
  const end = sub.end_date?.split?.("T")?.[0] ?? sub.end_date;
  if (!start || tStr < start) return false;
  if (end && tStr > end) return false;

  const pattern = getPattern(sub);
  const jsDay = new Date().getDay();
  const pyDay = jsDay === 0 ? 6 : jsDay - 1;
  const daysDiff = dateDiffDays(tStr, start);

  if (pattern === "daily") return true;
  if (pattern === "alternate") return daysDiff % 2 === 0;
  if (pattern === "custom" || pattern === "weekly")
    return (sub.custom_days ?? sub.days ?? []).includes(pyDay);
  return false;
};

const isExpired = (sub: any): boolean => {
  const end = sub.end_date?.split?.("T")?.[0] ?? sub.end_date;
  return !!end && end < todayStr();
};

const ADDRESS_SKIP_KEYS = new Set([
  "lat",
  "lng",
  "latitude",
  "longitude",
  "id",
  "_id",
  "type",
  "isPrimary",
  "is_primary",
  "isDefault",
  "is_default",
  "label",
  "createdAt",
  "created_at",
  "updatedAt",
  "updated_at",
]);

const formatAddress = (a: any): string => {
  if (!a) return "Address not available";
  if (typeof a === "string") return a.trim() || "Address not available";

  const used = new Set<string>();
  const take = (...keys: string[]): string | undefined => {
    for (const k of keys) {
      const v = a[k];
      if (typeof v === "string" && v.trim()) {
        used.add(k);
        return v.trim();
      }
    }
    return undefined;
  };

  const parts = [
    take("full_address", "fullAddress"),
    take("flat", "house", "house_no", "houseNo", "flatNo", "flat_no", "apartment", "doorNo", "door_no"),
    take("line1", "addressLine1", "address_line1", "street"),
    take("line2", "addressLine2", "address_line2"),
    take("society", "area", "tower", "societyName", "locality", "block", "colony"),
    take("landmark"),
    take("city"),
    take("state"),
    take("pincode", "pin_code", "zip", "zipcode", "postal_code", "postalCode"),
  ].filter(Boolean) as string[];

  // Catch-all: pick up any other plain string fields on the address object
  // that weren't already captured above, so nothing gets silently dropped
  // regardless of exactly how the backend named its fields.
  Object.keys(a).forEach((k) => {
    if (used.has(k) || ADDRESS_SKIP_KEYS.has(k)) return;
    const v = a[k];
    if (typeof v === "string" && v.trim() && !parts.includes(v.trim())) {
      parts.push(v.trim());
    }
  });

  return parts.length ? parts.join(", ") : "Address not available";
};

const isWithinSlot = (slotStr?: string): boolean => {
  if (!slotStr) return true;
  try {
    const parts = slotStr.split("-").map((s) => s.trim());
    if (parts.length < 2) return true;
    const toMins = (t: string) => {
      const [time, period] = t.split(" ");
      let [h, m] = time.split(":").map(Number);
      if (period === "PM" && h !== 12) h += 12;
      if (period === "AM" && h === 12) h = 0;
      return h * 60 + m;
    };
    const now = new Date();
    const nowM = now.getHours() * 60 + now.getMinutes();
    return nowM >= toMins(parts[0]) && nowM <= toMins(parts[1]);
  } catch {
    return true;
  }
};

const daysUntilEnd = (endDate?: string): number | null => {
  if (!endDate) return null;
  const end = new Date(endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((end.getTime() - today.getTime()) / 86400000));
};

function getNextDeliveryDate(sub: Subscription): string | null {
  const pattern = getPattern(sub);
  const start = sub.start_date;

  for (let i = 1; i <= 7; i++) {
    const next = new Date();
    next.setDate(next.getDate() + i);
    const nextStr = next.toISOString().split("T")[0];

    const end = sub.end_date;
    if (end && nextStr > end) break;
    if (nextStr < start) continue;

    const jsDay = next.getDay();
    const pyDay = jsDay === 0 ? 6 : jsDay - 1;
    const daysDiff = dateDiffDays(nextStr, start);

    let delivers = false;
    if (pattern === "daily") delivers = true;
    if (pattern === "alternate") delivers = daysDiff % 2 === 0;
    if (pattern === "custom" || pattern === "weekly")
      delivers = (sub.custom_days ?? []).includes(pyDay);

    if (delivers) return nextStr;
  }
  return null;
}

const isOnVacation = (sub: any): boolean => !!sub.on_vacation_today;

// Expiry is ONLY based on end_date vs today — nothing else
const isEffectivelyExpired = (
  sub: Subscription,
  _accepted?: boolean,
  _deliversToday?: boolean,
): boolean => isExpired(sub);

function formatDeliveryDateLabel(dateStr: string | null): string {
  if (!dateStr) return "Soon";
  const today = todayStr();
  if (dateStr === today) return "Today";
  const d = new Date(dateStr);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (dateStr === tomorrow.toISOString().split("T")[0]) return "Tomorrow";
  return d.toLocaleDateString("en-IN", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function getDeliveryDateLabel(
  sub: Subscription,
  deliversToday: boolean,
): string {
  if (deliversToday) return formatDeliveryDateLabel(todayStr());
  return formatDeliveryDateLabel(getNextDeliveryDate(sub));
}

/** Build a horizontal timeline range (past few days up to upcoming days) */
function buildCalendarTimeline(
  sub: Subscription,
  patternKey: string,
  daysBefore = 3,
  daysAfter = 4,
): string[] {
  const dates: string[] = [];
  if (!sub.start_date) return dates;

  const baseDate = new Date();
  for (let i = -daysBefore; i <= daysAfter; i++) {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() + i);
    const dStr = d.toISOString().split("T")[0];

    const start = sub.start_date?.split("T")[0];
    const end = sub.end_date?.split("T")[0];

    if (start && dStr < start) continue;
    if (end && dStr > end) continue;

    const jsDay = d.getDay();
    const pyDay = jsDay === 0 ? 6 : jsDay - 1;
    const daysDiff = dateDiffDays(dStr, start);

    let delivers = false;
    if (patternKey === "daily") delivers = true;
    if (patternKey === "alternate") delivers = daysDiff % 2 === 0;
    if (patternKey === "custom" || patternKey === "weekly")
      delivers = (sub.custom_days ?? []).includes(pyDay);

    if (delivers) dates.push(dStr);
  }
  return dates;
}

const PATTERN_CONFIG: Record<
  string,
  { label: string; icon: any; color: string; bg: string }
> = {
  daily: { label: "Daily", icon: "calendar", color: C.primary, bg: C.light + "55" },
  alternate: {
    label: "Alternate Days",
    icon: "calendar-outline",
    color: C.dark,
    bg: "#F3E4D6",
  },
  custom: {
    label: "Custom Days",
    icon: "calendar-number",
    color: C.accent,
    bg: "#FFEEDD",
  },
  weekly: {
    label: "Weekly",
    icon: "calendar-number",
    color: C.accent,
    bg: "#FFEEDD",
  },
};

const animate = () =>
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

// ── Main Screen ────────────────────────────────────────────────────────────

export default function SubscriptionsScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [filter, setFilter] = useState<FilterType>("today");
  const [checkinStatus, setCheckinStatus] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [deliveredToday, setDeliveredToday] = useState<Set<string>>(new Set());
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setError(null);
    try {
      const [subs, status, orders]: [any, any, any] = await Promise.all([
        api.getAssignedSubscriptions(),
        api.getCheckinStatus().catch(() => null),
        api.getOrders().catch(() => []),
      ]);
      const list: any[] = Array.isArray(subs)
        ? subs
        : (subs?.subscriptions ?? subs?.data ?? []);
      const recurring = list.filter(isRecurring);
      setSubscriptions(recurring);
      setCheckinStatus(status);

      const accepted = new Set<string>(
        recurring.filter((s: any) => s.is_accepted).map((s: any) => s.id),
      );
      setAcceptedIds(accepted);

      const today = todayStr();
      const deliveredKeys = new Set<string>(
        (Array.isArray(orders) ? orders : [])
          .filter(
            (o: any) =>
              o.subscription_id &&
              o.delivery_date === today &&
              o.status === "delivered",
          )
          .map((o: any) => `${o.subscription_id}:${today}`),
      );
      recurring.forEach((s: any) => {
        if (String(s.delivery_status || "").toLowerCase() === "delivered") {
          deliveredKeys.add(`${s.id}:${today}`);
        }
      });

      setDeliveredToday(deliveredKeys);
    } catch (err: any) {
      setError(err?.message || "Failed to load subscriptions");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const toggleExpand = useCallback((id: string) => {
    animate();
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const changeFilter = useCallback((f: FilterType) => {
    animate();
    setExpandedId(null);
    setFilter(f);
  }, []);

  const handleAccept = useCallback((sub: Subscription) => {
    Alert.alert(
      "Accept Subscription",
      `Accept deliveries for ${sub.customer_name || "this customer"}?\n\nYou will deliver every scheduled day until ${sub.end_date || "subscription ends"}.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Accept",
          onPress: async () => {
            try {
              await api.acceptSubscription(sub.id).catch(() => null);
            } finally {
              animate();
              setAcceptedIds((prev) => new Set([...prev, sub.id]));
              setExpandedId(null);
            }
          },
        },
      ],
    );
  }, []);

  const handleMarkDelivered = useCallback(async (sub: Subscription) => {
    const key = `${sub.id}:${todayStr()}`;
    Alert.alert(
      "📦 Mark as Delivered",
      `Confirm delivery to ${sub.customer_name || "customer"} today (${todayStr()})?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm Delivered",
          onPress: async () => {
            try {
              await api.updateSubscriptionStatus(sub.id, "delivered");

              setDeliveredToday((prev) => new Set([...prev, key]));
              Alert.alert(
                "✅ Delivered!",
                "Marked as delivered for today. See you tomorrow!",
              );
            } catch (err: any) {
              Alert.alert("Error", err?.message || "Could not update status");
            }
          },
        },
      ],
    );
  }, []);

  // ── Filters ──────────────────────────────────────────────────────────────

  const isExpiredTabMember = (sub: Subscription, accepted: boolean) =>
    isEffectivelyExpired(sub, accepted, isDeliveryToday(sub)) ||
    isInactiveStatus(sub) ||
    isCancelledStatus(sub);

  const filtered = subscriptions.filter((sub) => {
    const accepted = acceptedIds.has(sub.id);
    const deliversToday = isDeliveryToday(sub) && !isOnVacation(sub);
    const expiredTab = isExpiredTabMember(sub, accepted);

    if (filter === "expired") return expiredTab;
    if (expiredTab) return false;

    if (filter === "all") return !accepted;
    if (filter === "today") return accepted && deliversToday;
    if (filter === "assigned") {
      return accepted;
    }
    return true;
  });

  // Split the Expired tab list into "Cancelled" vs "Expired" groups
  const cancelledList = filtered.filter((s) => isCancelledStatus(s));
  const expiredList = filtered.filter((s) => !isCancelledStatus(s));

  const pendingCount = subscriptions.filter((s) => {
    const accepted = acceptedIds.has(s.id);
    return !accepted && !isExpiredTabMember(s, accepted);
  }).length;

  const todayCount = subscriptions.filter((s) => {
    const accepted = acceptedIds.has(s.id);
    const deliversToday = isDeliveryToday(s);
    return accepted && deliversToday && !isExpiredTabMember(s, accepted);
  }).length;

  const assignedCount = subscriptions.filter((s) => {
    const accepted = acceptedIds.has(s.id);
    return accepted && !isExpiredTabMember(s, accepted);
  }).length;

  const expiredCount = subscriptions.filter((s) => {
    const accepted = acceptedIds.has(s.id);
    return isExpiredTabMember(s, accepted);
  }).length;

  if (loading) return <LoadingScreen />;

  const isShiftOff = !checkinStatus?.checked_in || checkinStatus?.checked_out;

  const renderSubCard = (sub: Subscription) => {
    const key = `${sub.id}:${todayStr()}`;
    const accepted = acceptedIds.has(sub.id);
    const delivers = isDeliveryToday(sub) && !isOnVacation(sub);
    return (
      <SubCard
        key={sub.id}
        sub={sub}
        context={filter}
        isShiftOff={isShiftOff}
        deliversToday={delivers}
        isAccepted={accepted}
        isOnVacation={isOnVacation(sub)}
        isEffectivelyExpired={isEffectivelyExpired(sub, accepted, delivers)}
        isCancelled={isCancelledStatus(sub)}
        isDeliveredToday={deliveredToday.has(key)}
        isExpanded={expandedId === sub.id}
        onToggleExpand={() => toggleExpand(sub.id)}
        onAccept={() => handleAccept(sub)}
        onMarkDelivered={() => handleMarkDelivered(sub)}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={C.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>My Subscriptions</Text>
          <Text style={styles.headerSub}>{subscriptions.length} total</Text>
        </View>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>{todayCount} today</Text>
        </View>
      </View>

      {/* Shift warning */}
      {isShiftOff && !error && (
        <View style={styles.warningBanner}>
          <Ionicons name="alert-circle" size={15} color={C.dark} />
          <Text style={styles.warningText}>
            Start your shift to unlock delivery actions
          </Text>
        </View>
      )}

      {/* Filter tabs */}
      <View style={styles.tabRow}>
        {(
          [
            { key: "today", label: "Today", count: todayCount },
            { key: "assigned", label: "Assigned", count: assignedCount },
            { key: "all", label: "Action", count: pendingCount },
            { key: "expired", label: "Expired", count: expiredCount },
          ] as { key: FilterType; label: string; count: number }[]
        ).map(({ key, label, count }) => (
          <TouchableOpacity
            key={key}
            style={[styles.tab, filter === key && styles.tabActive]}
            onPress={() => changeFilter(key)}
          >
            <Text
              style={[styles.tabText, filter === key && styles.tabTextActive]}
            >
              {label}
            </Text>
            {count > 0 && (
              <View
                style={[
                  styles.tabBubble,
                  filter === key && styles.tabBubbleActive,
                ]}
              >
                <Text
                  style={[
                    styles.tabBubbleText,
                    filter === key && styles.tabBubbleTextActive,
                  ]}
                >
                  {count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.list}
      >
        {error ? (
          <ErrorState error={error} onRetry={fetchData} />
        ) : filter === "expired" ? (
          expiredList.length > 0 || cancelledList.length > 0 ? (
            <>
              {expiredList.length > 0 && (
                <>
                  <View style={styles.groupHeaderRow}>
                    <Ionicons name="close-circle" size={13} color={C.red} />
                    <Text style={styles.groupHeaderText}>
                      Expired ({expiredList.length})
                    </Text>
                  </View>
                  {expiredList.map(renderSubCard)}
                </>
              )}
              {cancelledList.length > 0 && (
                <>
                  <View style={[styles.groupHeaderRow, { marginTop: 6 }]}>
                    <Ionicons name="ban" size={13} color={C.dark} />
                    <Text style={styles.groupHeaderText}>
                      Cancelled ({cancelledList.length})
                    </Text>
                  </View>
                  {cancelledList.map(renderSubCard)}
                </>
              )}
            </>
          ) : (
            <EmptyState filter={filter} />
          )
        ) : filtered.length > 0 ? (
          filtered.map(renderSubCard)
        ) : (
          <EmptyState filter={filter} />
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Sub Card ───────────────────────────────────────────────────────────────

function SubCard({
  sub,
  context,
  isShiftOff,
  deliversToday,
  isAccepted,
  isEffectivelyExpired,
  isCancelled,
  isDeliveredToday,
  isOnVacation,
  isExpanded,
  onToggleExpand,
  onAccept,
  onMarkDelivered,
}: {
  sub: Subscription;
  context: FilterType;
  isShiftOff: boolean;
  deliversToday: boolean;
  isAccepted: boolean;
  isEffectivelyExpired: boolean;
  isCancelled: boolean;
  isDeliveredToday: boolean;
  isExpanded: boolean;
  isOnVacation: boolean;
  onToggleExpand: () => void;
  onAccept: () => void;
  onMarkDelivered: () => void;
}) {
  const patternKey = getPattern(sub);
  const pattern = PATTERN_CONFIG[patternKey] ?? {
    label: patternKey || "Regular",
    icon: "calendar",
    color: C.textMuted,
    bg: C.border,
  };
  const address = formatAddress(sub.customer_address || sub.address);
  const items = sub.items ?? [];
  const daysLeft = daysUntilEnd(sub.end_date);
  const withinSlot = isWithinSlot(sub.delivery_slot);
  // In the Expired tab, a cancelled subscription is shown as "Cancelled", not "Expired"
  const expired = context === "expired" ? true : isEffectivelyExpired;
  const trueExpired = isExpired(sub);
  const showStartMsg =
    isAccepted && deliversToday && !isDeliveredToday && !withinSlot && !expired;

  // Horizontal calendar timeline for the Today tab when expanded
  const calendarTimeline =
    context === "today" && !expired ? buildCalendarTimeline(sub, patternKey) : [];

  const dateLabel = getDeliveryDateLabel(sub, deliversToday);
  const canQuickDeliver =
    context === "today" && isAccepted && deliversToday && !expired && !isOnVacation;

  const expiredMessage = isCancelled
    ? "Subscription Cancelled"
    : trueExpired
      ? `Expired on ${sub.end_date}`
      : "No upcoming deliveries scheduled";

  const handleTickPress = () => {
    if (isDeliveredToday) return;
    onMarkDelivered();
  };

  return (
    <View
      style={[
        styles.card,
        context === "today" &&
          deliversToday &&
          !expired &&
          (isDeliveredToday ? styles.cardDone : styles.cardPending),
        expired && (isCancelled ? styles.cardCancelled : styles.cardExpired),
        isExpanded && styles.cardExpanded,
      ]}
    >
      <TouchableOpacity activeOpacity={0.75} onPress={onToggleExpand}>
        <View style={styles.badgeRow}>
          {expired ? (
            <View
              style={[
                styles.expiredBadge,
                isCancelled && { backgroundColor: C.dark },
              ]}
            >
              <Ionicons
                name={isCancelled ? "ban" : "close-circle"}
                size={10}
                color="#fff"
              />
              <Text style={styles.expiredBadgeText}>
                {isCancelled
                  ? "Cancelled"
                  : trueExpired
                    ? "Subscription Expired"
                    : "No Upcoming Delivery"}
              </Text>
            </View>
          ) : (
            <>
              {context === "all" && (
                <View style={styles.acceptTag}>
                  <Ionicons name="add-circle" size={10} color="#fff" />
                  <Text style={styles.acceptTagText}>Accept Subscription</Text>
                </View>
              )}

              {context === "today" && isDeliveredToday && (
                <View style={styles.doneBadge}>
                  <Ionicons name="checkmark-circle" size={10} color="#fff" />
                  <Text style={styles.doneBadgeText}>Done Today</Text>
                </View>
              )}
              {context === "today" && !isDeliveredToday && (
                <View style={styles.pendingBadge}>
                  <Ionicons name="time" size={10} color={C.dark} />
                  <Text style={styles.pendingBadgeText}>To Be Delivered</Text>
                </View>
              )}

              {context === "assigned" && (
                <View style={styles.acceptedBadge}>
                  <Ionicons name="checkmark-circle" size={10} color="#fff" />
                  <Text style={styles.acceptedBadgeText}>
                    Accepted Subscription
                  </Text>
                </View>
              )}

              {daysLeft !== null && daysLeft <= 3 && (
                <View style={styles.urgentBadge}>
                  <Ionicons name="timer-outline" size={10} color="#fff" />
                  <Text style={styles.urgentBadgeText}>{daysLeft}d left</Text>
                </View>
              )}
            </>
          )}
        </View>

        <View style={styles.cardHeader}>
          <View
            style={[
              styles.productIconWrap,
              isDeliveredToday && !expired && { backgroundColor: C.greenBg },
            ]}
          >
            <Ionicons
              name={isDeliveredToday && !expired ? "checkmark" : "location"}
              size={18}
              color={isDeliveredToday && !expired ? C.green : C.primary}
            />
          </View>
          {!isExpanded ? (
            <View style={{ flex: 1 }}>
              <Text style={styles.productName} numberOfLines={2}>
                {address}
              </Text>
              <Text style={styles.customerName} numberOfLines={1}>
                {sub.customer_name || "Customer"} • ₹
                {Number(sub.total_amount).toFixed(0)}/day
              </Text>
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              <Text style={styles.productName} numberOfLines={1}>
                {sub.customer_name || "Customer"}
              </Text>
              <Text style={styles.customerName} numberOfLines={1}>
                {items.length === 1
                  ? items[0].product_name || items[0].name || "Product"
                  : items.length > 1
                    ? `${items[0].product_name || "Product"} +${items.length - 1} more`
                    : "Product"}
                {" • ₹"}
                {Number(sub.total_amount).toFixed(0)}/day
              </Text>
            </View>
          )}
          <View style={[styles.patternPill, { backgroundColor: pattern.bg }]}>
            <Ionicons name={pattern.icon} size={10} color={pattern.color} />
            <Text style={[styles.patternPillText, { color: pattern.color }]}>
              {pattern.label}
            </Text>
          </View>

          {canQuickDeliver && (
            <TouchableOpacity
              style={[styles.tickBtn, isDeliveredToday && styles.tickBtnDone]}
              onPress={handleTickPress}
              disabled={isDeliveredToday}
            >
              <Ionicons
                name={isDeliveredToday ? "checkmark-done" : "checkmark"}
                size={16}
                color={isDeliveredToday ? C.green : "#fff"}
              />
            </TouchableOpacity>
          )}

          <Ionicons
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={18}
            color={C.textLight}
            style={{ marginLeft: 2 }}
          />
        </View>

        {!isExpanded && (
          <View style={styles.quickRow}>
            {expired ? (
              <>
                <Ionicons
                  name={isCancelled ? "ban-outline" : "close-circle-outline"}
                  size={12}
                  color={isCancelled ? C.dark : C.red}
                />
                <Text
                  style={[
                    styles.quickRowExpiredText,
                    isCancelled && { color: C.dark },
                  ]}
                >
                  {expiredMessage}
                </Text>
              </>
            ) : isOnVacation ? (
              <>
                <Ionicons name="airplane-outline" size={12} color={C.dark} />
                <Text style={[styles.quickRowText, { color: C.dark }]}>
                  Paused — resumes {sub.vacation_end_date || "soon"}
                </Text>
              </>
            ) : context === "assigned" ? (
              <>
                <Ionicons name="calendar-outline" size={12} color={C.textMuted} />
                <Text style={styles.quickRowText}>
                  {sub.start_date} → {sub.end_date || "Ongoing"}
                </Text>
              </>
            ) : context === "today" ? (
              <>
                <Ionicons name="calendar-outline" size={12} color={C.textMuted} />
                <Text style={styles.quickRowText}>Delivery: {dateLabel}</Text>
              </>
            ) : (
              <>
                <Ionicons name="calendar-outline" size={12} color={C.textMuted} />
                <Text style={styles.quickRowText}>Delivery: {dateLabel}</Text>
              </>
            )}
          </View>
        )}
      </TouchableOpacity>

      {/* Expanded detail */}
      {isExpanded && (
        <View style={styles.expandedBody}>
          <View style={styles.itemsBox}>
            {items.map((item, i) => (
              <View key={i} style={styles.itemRow}>
                <View style={styles.itemDot} />
                <Text style={styles.itemName} numberOfLines={1}>
                  {item.product_name || item.name || "Product"}
                </Text>
                <Text style={styles.itemQty}>×{item.quantity}</Text>
                <Text style={styles.itemAmt}>
                  ₹{Number(item.amount).toFixed(0)}
                </Text>
              </View>
            ))}
            <View style={styles.itemTotalRow}>
              <Text style={styles.itemTotalLabel}>Daily Total</Text>
              <Text style={styles.itemTotal}>
                ₹{Number(sub.total_amount).toFixed(2)}
              </Text>
            </View>
          </View>

          <View style={styles.customerBox}>
            <View style={styles.customerAvatar}>
              <Text style={styles.customerAvatarText}>
                {(sub.customer_name || "C")[0].toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalCustomerName}>
                {sub.customer_name || "Customer"}
              </Text>
              <Text style={styles.modalCustomerPhone}>
                {sub.customer_phone || "–"}
              </Text>
            </View>
          </View>

          <View style={styles.addressRow}>
            <Ionicons name="location-outline" size={13} color={C.primary} />
            <Text style={styles.addressText}>{address}</Text>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaChip}>
              <Ionicons name="time-outline" size={13} color={C.dark} />
              <Text style={styles.metaChipText}>
                {sub.delivery_slot || "Any time"}
              </Text>
            </View>
            <View style={[styles.metaChip, expired && styles.metaChipExpired]}>
              <Ionicons
                name={expired ? "close-circle" : "calendar-outline"}
                size={13}
                color={expired ? C.red : C.accent}
              />
              <Text
                style={[
                  styles.metaChipText,
                  expired && { color: C.red, fontWeight: "700" },
                ]}
              >
                {expired ? expiredMessage : `Delivery: ${dateLabel}`}
              </Text>
            </View>
          </View>
          {context === "assigned" && !expired && (
            <View style={styles.metaRow}>
              <View style={styles.metaChip}>
                <Ionicons name="play-outline" size={13} color={C.green} />
                <Text style={styles.metaChipText}>Start: {sub.start_date}</Text>
              </View>
              <View style={styles.metaChip}>
                <Ionicons name="flag-outline" size={13} color={C.red} />
                <Text style={styles.metaChipText}>
                  End: {sub.end_date || "No end date (ongoing)"}
                </Text>
              </View>
            </View>
          )}
          {isOnVacation && !expired && (
            <View style={styles.vacationBadge}>
              <Ionicons name="airplane" size={10} color="#fff" />
              <Text style={styles.vacationBadgeText}>
                On Vacation{sub.vacation_end_date ? ` till ${sub.vacation_end_date}` : ""}
              </Text>
            </View>
          )}
          {/* Horizontal Calendar Timeline view with Month & Date for Today Tab */}
          {context === "today" && calendarTimeline.length > 0 && (
            <View style={styles.calendarSection}>
              <Text style={styles.sectionLabel}>DELIVERY TIMELINE</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.calendarRow}>
                {calendarTimeline.map((dateStr, i) => {
                  const isToday = dateStr === todayStr();
                  const isDelivered = isToday && isDeliveredToday;
                  const dObj = new Date(dateStr);
                  const monthName = dObj.toLocaleDateString("en-IN", { month: "short" });
                  const dayName = dObj.toLocaleDateString("en-IN", { weekday: "short" });
                  const dayNum = dObj.getDate();

                  return (
                    <View
                      key={i}
                      style={[
                        styles.calendarCell,
                        isToday && styles.calendarCellToday,
                        isDelivered && styles.calendarCellDelivered,
                      ]}
                    >
                      <Text style={[styles.calendarMonthName, isToday && styles.calendarTextActive]}>
                        {monthName}
                      </Text>
                      <Text style={[styles.calendarDayNum, isToday && styles.calendarTextActive]}>
                        {dayNum}
                      </Text>
                      <Text style={[styles.calendarDayName, isToday && styles.calendarTextActive]}>
                        {dayName}
                      </Text>
                      {isDelivered ? (
                        <View style={styles.calendarTickBadge}>
                          <Ionicons name="checkmark" size={10} color="#fff" />
                        </View>
                      ) : (
                        <View style={styles.calendarDotSpace} />
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {sub.custom_days && sub.custom_days.length > 0 && (
            <View style={styles.daysRow}>
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => (
                <View
                  key={i}
                  style={[
                    styles.dayPill,
                    sub.custom_days!.includes(i) && styles.dayPillOn,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayPillText,
                      sub.custom_days!.includes(i) && styles.dayPillTextOn,
                    ]}
                  >
                    {d}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {showStartMsg && (
            <View style={styles.slotBanner}>
              <Ionicons name="alarm-outline" size={16} color={C.dark} />
              <View style={{ flex: 1 }}>
                <Text style={styles.slotBannerTitle}>Delivery Window</Text>
                <Text style={styles.slotBannerText}>
                  Start delivery between {sub.delivery_slot || "scheduled time"}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.actionRow}>
            {expired ? (
              <View
                style={[
                  styles.expiredPill,
                  isCancelled && styles.cancelledPill,
                ]}
              >
                <Ionicons
                  name={isCancelled ? "ban" : "close-circle"}
                  size={16}
                  color={isCancelled ? C.dark : C.red}
                />
                <Text
                  style={[
                    styles.expiredPillText,
                    isCancelled && { color: C.dark },
                  ]}
                >
                  {expiredMessage}
                </Text>
              </View>
            ) : isOnVacation ? (
              <View style={styles.vacationPill}>
                <Ionicons name="airplane" size={14} color={C.dark} />
                <Text style={styles.vacationPillText}>
                  Customer on vacation — no delivery until {sub.vacation_end_date || "further notice"}
                </Text>
              </View>
            ) : !isAccepted ? (
              <TouchableOpacity
                style={[styles.acceptBtn, isShiftOff && styles.btnDisabled]}
                disabled={isShiftOff}
                onPress={onAccept}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color={isShiftOff ? C.textLight : "#fff"}
                />
                <Text
                  style={[
                    styles.acceptBtnText,
                    isShiftOff && { color: C.textLight },
                  ]}
                >
                  {isShiftOff ? "Start Shift First" : "Accept Subscription"}
                </Text>
              </TouchableOpacity>
            ) : isDeliveredToday ? (
              <View style={styles.doneBtn}>
                <Ionicons name="checkmark-done" size={16} color={C.green} />
                <Text style={styles.doneBtnText}>Delivered Today ✓</Text>
              </View>
            ) : deliversToday ? (
              <TouchableOpacity
                style={[
                  styles.deliverBtn,
                  !withinSlot && styles.deliverBtnEarly,
                ]}
                onPress={onMarkDelivered}
              >
                <Ionicons name="cube-outline" size={16} color="#fff" />
                <Text style={styles.deliverBtnText}>
                  {withinSlot ? "Mark as Delivered" : "Mark Delivered (Early)"}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.acceptedPill}>
                <Ionicons name="checkmark-circle" size={14} color={C.dark} />
                <Text style={styles.acceptedPillText}>
                  Accepted • Next: {dateLabel}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

// ── Empty / Error States ───────────────────────────────────────────────────

function EmptyState({ filter }: { filter: FilterType }) {
  const msgs: Record<FilterType, string> = {
    today: "No accepted subscriptions have a delivery scheduled for today.",
    assigned: "You haven’t accepted any subscriptions yet",
    all: "No pending subscriptions.\nEverything assigned to you has been accepted.",
    expired: "Nothing expired or cancelled — everything is still active",
  };
  return (
    <View style={styles.empty}>
      <Ionicons name="repeat-outline" size={56} color={C.border} />
      <Text style={styles.emptyTitle}>All Accepted</Text>
      <Text style={styles.emptyText}>{msgs[filter]}</Text>
    </View>
  );
}

function ErrorState({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  return (
    <View style={styles.empty}>
      <Ionicons name="cloud-offline-outline" size={56} color={C.red} />
      <Text style={styles.emptyTitle}>Couldn't Load</Text>
      <Text style={styles.emptyText}>{error}</Text>
      <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
        <Ionicons name="refresh" size={14} color="#fff" />
        <Text style={styles.retryBtnText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: { width: 36, height: 36, justifyContent: "center" },
  headerTitle: { fontSize: 16, fontWeight: "700", color: C.text },
  headerSub: { fontSize: 11, color: C.textMuted, marginTop: 1 },
  headerBadge: {
    backgroundColor: C.primary,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  headerBadgeText: { fontSize: 11, fontWeight: "700", color: "#fff" },
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.light + "40",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.light,
  },
  warningText: { fontSize: 12, color: C.dark, fontWeight: "500" },
  tabRow: {
    flexDirection: "row",
    backgroundColor: C.card,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: C.primary },
  tabText: { fontSize: 12, fontWeight: "600", color: C.textMuted },
  tabTextActive: { color: C.text },
  tabBubble: {
    backgroundColor: C.border,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  tabBubbleActive: { backgroundColor: C.primary + "22" },
  tabBubbleText: { fontSize: 10, fontWeight: "700", color: C.textMuted },
  tabBubbleTextActive: { color: C.primary },
  list: { paddingTop: 14, paddingHorizontal: 14, paddingBottom: 20 },
  groupHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
    marginLeft: 2,
  },
  groupHeaderText: {
    fontSize: 12,
    fontWeight: "700",
    color: C.text,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    shadowColor: C.dark,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardPending: { borderWidth: 1.5, borderColor: C.light },
  cardDone: { borderWidth: 1.5, borderColor: C.greenBg },
  cardExpired: {
    borderWidth: 1.5,
    borderColor: C.redBg,
    backgroundColor: "#FFFCFA",
    opacity: 0.9,
  },
  cardCancelled: {
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: "#FBF5EE",
    opacity: 0.9,
  },
  cardExpanded: { paddingBottom: 14 },
  badgeRow: { flexDirection: "row", gap: 6, marginBottom: 8, flexWrap: "wrap" },
  acceptTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: C.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  acceptTagText: { fontSize: 10, fontWeight: "700", color: "#fff" },
  doneBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: C.green,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  doneBadgeText: { fontSize: 10, fontWeight: "700", color: "#fff" },
  pendingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: C.light,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pendingBadgeText: { fontSize: 10, fontWeight: "700", color: C.dark },
  acceptedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: C.dark,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  acceptedBadgeText: { fontSize: 10, fontWeight: "700", color: "#fff" },
  urgentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: C.red,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  urgentBadgeText: { fontSize: 10, fontWeight: "700", color: "#fff" },
  expiredBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: C.red,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  expiredBadgeText: { fontSize: 10, fontWeight: "700", color: "#fff" },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 9 },
  productIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: C.light + "40",
    justifyContent: "center",
    alignItems: "center",
  },
  productName: { fontSize: 13.5, fontWeight: "700", color: C.text },
  customerName: { fontSize: 11, color: C.textMuted, marginTop: 2 },
  patternPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 8,
  },
  patternPillText: { fontSize: 10, fontWeight: "600" },
  tickBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.green,
    justifyContent: "center",
    alignItems: "center",
  },
  tickBtnDone: { backgroundColor: C.greenBg },
  quickRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  quickRowText: { fontSize: 11, color: C.textMuted, fontWeight: "600" },
  quickRowExpiredText: { fontSize: 11, color: C.red, fontWeight: "700" },
  expandedBody: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  itemsBox: {
    backgroundColor: C.bg,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 3,
  },
  itemDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.primary },
  itemName: { flex: 1, fontSize: 12, color: C.text, fontWeight: "500" },
  itemQty: { fontSize: 12, color: C.textMuted, fontWeight: "600" },
  itemAmt: {
    fontSize: 13,
    color: C.text,
    fontWeight: "700",
    minWidth: 40,
    textAlign: "right",
  },
  itemTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  itemTotalLabel: { fontSize: 11, color: C.textMuted, fontWeight: "600" },
  itemTotal: { fontSize: 13, color: C.primary, fontWeight: "800" },
  customerBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  customerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  customerAvatarText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  modalCustomerName: { fontSize: 13.5, fontWeight: "700", color: C.text },
  modalCustomerPhone: { fontSize: 11.5, color: C.textMuted, marginTop: 2 },
  metaRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  metaChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: C.bg,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  metaChipExpired: { backgroundColor: C.redBg },
  metaChipText: { fontSize: 11, color: C.text, fontWeight: "500", flex: 1 },
  addressRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 5,
    backgroundColor: C.bg,
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
  },
  addressText: { fontSize: 11, color: C.textMuted, lineHeight: 16, flex: 1 },

  // Horizontal Calendar Timeline Styles with Month
  calendarSection: { marginBottom: 12 },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: C.textLight,
    letterSpacing: 1,
    marginBottom: 8,
  },
  calendarRow: { gap: 8, paddingVertical: 2 },
  calendarCell: {
    width: 52,
    height: 72,
    borderRadius: 10,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: C.border,
  },
  calendarCellToday: {
    backgroundColor: C.light + "40",
    borderColor: C.primary,
  },
  calendarCellDelivered: {
    backgroundColor: C.greenBg,
    borderColor: C.green,
  },
  calendarMonthName: { fontSize: 9, fontWeight: "700", color: C.textMuted, textTransform: "uppercase" },
  calendarDayName: { fontSize: 9, fontWeight: "600", color: C.textMuted },
  calendarDayNum: { fontSize: 13, fontWeight: "700", color: C.text },
  calendarTextActive: { color: C.primary },
  calendarTickBadge: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: C.green,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarDotSpace: {
    height: 14,
  },

  daysRow: { flexDirection: "row", gap: 6, marginBottom: 10, flexWrap: "wrap" },
  dayPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: C.border,
  },
  dayPillOn: { backgroundColor: C.primary },
  dayPillText: { fontSize: 11, fontWeight: "700", color: C.textMuted },
  dayPillTextOn: { color: "#fff" },
  slotBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: C.light + "40",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.light,
  },
  slotBannerTitle: { fontSize: 12, fontWeight: "700", color: C.dark },
  slotBannerText: { fontSize: 11, color: C.dark, marginTop: 1 },
  actionRow: { flexDirection: "row", gap: 8 },
  acceptBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: C.primary,
  },
  acceptBtnText: { fontSize: 12.5, fontWeight: "700", color: "#fff" },
  deliverBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: C.green,
  },
  deliverBtnEarly: { backgroundColor: C.accent },
  deliverBtnText: { fontSize: 12.5, fontWeight: "700", color: "#fff" },
  doneBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: C.greenBg,
  },
  doneBtnText: { fontSize: 12.5, fontWeight: "700", color: C.green },
  acceptedPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: C.light + "40",
  },
  acceptedPillText: { fontSize: 11.5, fontWeight: "600", color: C.dark },
  btnDisabled: { backgroundColor: C.border },
  expiredPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: C.redBg,
    borderWidth: 1,
    borderColor: C.red + "40",
  },
  cancelledPill: {
    backgroundColor: C.border,
    borderColor: C.dark + "40",
  },
  expiredPillText: { fontSize: 12, fontWeight: "700", color: C.red },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: C.text,
    marginTop: 14,
  },
  emptyText: {
    fontSize: 13,
    color: C.textMuted,
    marginTop: 6,
    textAlign: "center",
    lineHeight: 20,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.text,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 14,
  },
  retryBtnText: { fontSize: 13, fontWeight: "600", color: "#fff" },
  vacationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: C.dark,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  vacationBadgeText: { fontSize: 10, fontWeight: "700", color: "#fff" },
  vacationPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: C.light + "40",
    borderWidth: 1,
    borderColor: C.light,
  },
  vacationPillText: { fontSize: 11.5, fontWeight: "700", color: C.dark, flex: 1, textAlign: "center" },
});