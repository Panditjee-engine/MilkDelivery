import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { api } from "../services/api";
import { Colors } from "../constants/colors";
import { useAuth } from "../contexts/AuthContext";

const CHECK_INTERVAL_MS = 45_000; 
const RECENT_WINDOW_MS = 3 * 24 * 60 * 60 * 1000; 
const MAX_ORDERS_TO_CHECK = 3;

type PromptItem = {
  product_id: string;
  name: string;
  image?: string;
};

type PromptOrder = {
  id: string;
  items: PromptItem[];
};

function itemImage(item: any): string | undefined {
  const img = item?.product_image;
  if (!img) return undefined;
  if (String(img).startsWith("data:") || String(img).startsWith("http")) return img;
  return item?.image_type === "base64" ? `data:image/jpeg;base64,${img}` : img;
}

function isRecent(order: any): boolean {
  const raw = order.delivered_at || order.updated_at || order.delivery_date;
  if (!raw) return true;
  const s = String(raw);
  const t = new Date(s.includes("T") && !/(Z|[+-]\d\d:?\d\d)$/.test(s) ? s + "Z" : s).getTime();
  if (Number.isNaN(t)) return true;
  return Date.now() - t <= RECENT_WINDOW_MS;
}

export default function DeliveredRatingPrompt() {
  const { user } = useAuth();
  const userId = (user as any)?.id ?? (user as any)?._id;
  const storageKey = `rating_prompt_handled:${userId}`;

  const [visible, setVisible] = useState(false);
  const [order, setOrder] = useState<PromptOrder | null>(null);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const checkingRef = useRef(false);
  const visibleRef = useRef(false);
  visibleRef.current = visible;

  const loadHandled = useCallback(async (): Promise<string[]> => {
    try {
      const raw = await AsyncStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }, [storageKey]);

  const markHandled = useCallback(
    async (orderId: string) => {
      const list = await loadHandled();
      if (!list.includes(orderId)) list.push(orderId);
      await AsyncStorage.setItem(storageKey, JSON.stringify(list.slice(-100)));
    },
    [loadHandled, storageKey],
  );

  const check = useCallback(async () => {
    if (!userId || checkingRef.current || visibleRef.current) return;
    checkingRef.current = true;
    try {
      const orders = await api.getOrders();
      const handled = new Set(await loadHandled());

      const candidates = (orders || [])
        .filter(
          (o: any) =>
            String(o.status).toLowerCase() === "delivered" &&
            !handled.has(o.id) &&
            isRecent(o) &&
            Array.isArray(o.items) &&
            o.items.length > 0,
        )
        .slice(0, MAX_ORDERS_TO_CHECK);

      for (const o of candidates) {
        let feedback: Record<string, any> = {};
        try {
          feedback = (await api.getMyOrderFeedback(o.id)) || {};
        } catch {
          continue;
        }
        const ratedIds = new Set<string>([
          ...Object.keys(feedback),
          ...Object.values(feedback).map((f: any) => String(f?.product_id)),
        ]);

        const seen = new Set<string>();
        const unrated: PromptItem[] = [];
        for (const it of o.items) {
          const pid = String(it.product_id || "");
          if (!pid || seen.has(pid) || ratedIds.has(pid)) continue;
          seen.add(pid);
          unrated.push({
            product_id: pid,
            name: it.product_name || it.name || "Product",
            image: itemImage(it),
          });
        }

        if (unrated.length === 0) {
          await markHandled(o.id); 
          continue;
        }

        setRatings({});
        setComments({});
        setOrder({ id: o.id, items: unrated });
        setVisible(true);
        break;
      }
    } catch {
    } finally {
      checkingRef.current = false;
    }
  }, [userId, loadHandled, markHandled]);
  const isFocused = useIsFocused();

  useEffect(() => {
    if (!userId || !isFocused) return;
    check();
    const iv = setInterval(check, CHECK_INTERVAL_MS);
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") check();
    });
    return () => {
      clearInterval(iv);
      sub.remove();
    };
  }, [userId, isFocused, check]);

  const close = async (orderId: string) => {
    setVisible(false);
    await markHandled(orderId);
    setTimeout(() => setOrder(null), 300);
  };

  const onRateLater = () => {
    if (order && !submitting) close(order.id);
  };

  const ratedCount = Object.values(ratings).filter((v) => v > 0).length;

  const onSubmit = async () => {
    if (!order || submitting || ratedCount === 0) return;
    setSubmitting(true);
    try {
      const toSend = order.items.filter((i) => (ratings[i.product_id] || 0) > 0);
      const results = await Promise.allSettled(
        toSend.map((i) =>
          api.submitProductFeedback({
            order_id: order.id,
            product_id: i.product_id,
            rating: ratings[i.product_id],
            comment: (comments[i.product_id] || "").trim() || undefined,
          }),
        ),
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed === toSend.length) {
        Alert.alert("Rating not saved");
        return;
      }
      if (failed > 0) {
        Alert.alert("You can rate the remaining products from the Orders screen");
      }
      await close(order.id);
    } finally {
      setSubmitting(false);
    }
  };

  if (!order) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onRateLater}>
      <KeyboardAvoidingView
        style={s.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={s.sheet}>
          <View style={s.handle} />
          <View style={s.header}>
            <View style={s.checkCircle}>
              <Ionicons name="checkmark" size={20} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>Order Delivered</Text>
              <Text style={s.sub}>Please tell us about items in your orders</Text>
            </View>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            style={{ maxHeight: 420 }}
          >
            {order.items.map((item) => {
              const value = ratings[item.product_id] || 0;
              return (
                <View key={item.product_id} style={s.card}>
                  <View style={s.row}>
                    {item.image ? (
                      <Image source={{ uri: item.image }} style={s.img} />
                    ) : (
                      <View style={[s.img, s.imgFallback]}>
                        <Ionicons name="cube-outline" size={20} color="#9CA3AF" />
                      </View>
                    )}
                    <Text style={s.name} numberOfLines={2}>
                      {item.name}
                    </Text>
                  </View>

                  <View style={s.stars}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <TouchableOpacity
                        key={n}
                        hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                        onPress={() =>
                          setRatings((p) => ({
                            ...p,
                            [item.product_id]: p[item.product_id] === n ? 0 : n,
                          }))
                        }
                      >
                        <Ionicons
                          name={n <= value ? "star" : "star-outline"}
                          size={30}
                          color="#16A34A"
                        />
                      </TouchableOpacity>
                    ))}
                  </View>

                  {value > 0 && (
                    <TextInput
                      style={s.input}
                      placeholder="Write your review"
                      placeholderTextColor="#9CA3AF"
                      value={comments[item.product_id] || ""}
                      onChangeText={(t) =>
                        setComments((p) => ({ ...p, [item.product_id]: t }))
                      }
                      multiline
                      maxLength={300}
                    />
                  )}
                </View>
              );
            })}
          </ScrollView>

          <View style={s.actions}>
            <TouchableOpacity
              style={s.laterBtn}
              onPress={onRateLater}
              disabled={submitting}
              activeOpacity={0.8}
            >
              <Text style={s.laterTxt}>Rate Later</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.submitBtn, (ratedCount === 0 || submitting) && { opacity: 0.45 }]}
              onPress={onSubmit}
              disabled={ratedCount === 0 || submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.submitTxt}>
                  Submit{ratedCount > 0 ? ` (${ratedCount})` : ""}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 28,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
    alignSelf: "center",
    marginBottom: 14,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  checkCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#16A34A",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 18, fontWeight: "900", color: "#111827" },
  sub: { fontSize: 12.5, color: "#6B7280", fontWeight: "600", marginTop: 2 },
  card: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#F0F2F5",
  },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  img: { width: 48, height: 48, borderRadius: 12, backgroundColor: "#F3F4F6" },
  imgFallback: { alignItems: "center", justifyContent: "center" },
  name: { flex: 1, fontSize: 14, fontWeight: "800", color: "#111827" },
  stars: { flexDirection: "row", justifyContent: "center", gap: 8, marginTop: 12 },
  input: {
    marginTop: 12,
    minHeight: 60,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    backgroundColor: "#fff",
    padding: 10,
    fontSize: 13,
    color: "#111827",
    textAlignVertical: "top",
  },
  actions: { flexDirection: "row", gap: 10, marginTop: 8 },
  laterBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  laterTxt: { fontSize: 14, fontWeight: "800", color: "#374151" },
  submitBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#16A34A",
    alignItems: "center",
    justifyContent: "center",
  },
  submitTxt: { fontSize: 14, fontWeight: "900", color: "#fff" },
});