// app/(customer)/wishlist.tsx
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { api, WishlistRow } from "../../src/services/api";
import { Colors } from "../../src/constants/colors";
import WishlistToast from "../../src/components/WishlistToast";

const SCREEN_WIDTH = Dimensions.get("window").width;
const PAD = 16;
const GAP = 12;
const CARD_W = Math.floor((SCREEN_WIDTH - PAD * 2 - GAP) / 2);

const resolveId = (p: any) => p?.id || p?._id || p?.product_id || null;

export default function WishlistScreen() {
  const router = useRouter();
  const [rows, setRows] = useState<WishlistRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [toast, setToast] = useState({
    visible: false,
    key: 0,
    title: "",
    name: "",
  });

  const showToast = (title: string, name?: string) =>
    setToast((t) => ({
      visible: true,
      key: t.key + 1,
      title,
      name: name ?? "",
    }));

  const load = useCallback(async () => {
    try {
      const data = await api.getWishlist();
      setRows((data || []).filter((r) => r.product));
    } catch {
      // keep whatever is on screen
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const remove = async (productId: string, name?: string) => {
    if (busyId) return;
    setBusyId(productId);
    const previous = rows;
    setRows((r) => r.filter((x) => String(x.product_id) !== productId));
    showToast("Removed from favourites", name); // instant, before the request

    try {
      const res = await api.toggleWishlist(productId);
      if (res?.wishlisted) {
        setRows(previous);
        showToast("Couldn't remove. Try again", name);
      }
    } catch {
      setRows(previous);
      showToast("Couldn't remove. Try again", name);
    } finally {
      setBusyId(null);
    }
  };

  const openProduct = (product: any) => {
    router.push({
      pathname: "/(customer)/product-details",
      params: {
        id: resolveId(product),
        product: encodeURIComponent(JSON.stringify(product)),
      },
    } as any);
  };

  const renderItem = ({ item }: { item: WishlistRow }) => {
    const p = item.product;
    const id = String(item.product_id);
    const out = !p?.is_available || (p?.stock ?? 0) <= 0;
    const img = p?.image || p?.images?.[0];
    return (
      <TouchableOpacity
        style={s.card}
        activeOpacity={0.88}
        onPress={() => openProduct(p)}
      >
        <View style={s.imgBox}>
          {img ? (
            <Image source={{ uri: img }} style={s.img} resizeMode="cover" />
          ) : (
            <Ionicons name="cube-outline" size={28} color="#BBBBBB" />
          )}
          {out && (
            <View style={s.oos}>
              <Text style={s.oosTxt}>Out of stock</Text>
            </View>
          )}
          <TouchableOpacity
            style={s.heartBtn}
            onPress={(e) => {
              e.stopPropagation?.();
              void remove(id, p?.name);
            }}
            activeOpacity={0.8}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="heart" size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>
        <View style={s.body}>
          <Text style={s.name} numberOfLines={2}>
            {p?.name}
          </Text>
          <View style={s.priceRow}>
            <Text style={s.price}>₹{p?.price}</Text>
            {p?.unit ? <Text style={s.unit}>{p.unit}</Text> : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={18} color="#111" />
        </TouchableOpacity>
        <Text style={s.title}>Favourites</Text>
        {rows.length > 0 && (
          <View style={s.countPill}>
            <Text style={s.countTxt}>{rows.length}</Text>
          </View>
        )}
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => String(r.product_id)}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={{ gap: GAP }}
          contentContainerStyle={{
            paddingHorizontal: PAD,
            paddingTop: 8,
            paddingBottom: 40,
            gap: GAP,
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void load();
              }}
            />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <View style={s.emptyIcon}>
                <Ionicons name="heart-outline" size={30} color="#EF4444" />
              </View>
              <Text style={s.emptyTitle}>No favourites yet</Text>
              <Text style={s.emptySub}>
                Tap the heart on any product to save it here.
              </Text>
              <TouchableOpacity
                style={s.shopBtn}
                onPress={() => router.push("/(customer)/catalog" as any)}
              >
                <Text style={s.shopTxt}>Browse products</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
      <WishlistToast
        visible={toast.visible}
        triggerKey={toast.key}
        title={toast.title}
        productName={toast.name}
        duration={2500}
        onView={() => router.push("/(customer)/catalog" as any)}
        onHide={() => setToast((t) => ({ ...t, visible: false }))}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9F8F6" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: PAD,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#EBEBEB",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111",
    letterSpacing: -0.4,
  },
  countPill: {
    backgroundColor: "#FEE2E2",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  countTxt: { fontSize: 11, fontWeight: "800", color: "#EF4444" },
  card: {
    width: CARD_W,
    backgroundColor: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  imgBox: {
    height: 120,
    backgroundColor: "#F5F5F3",
    alignItems: "center",
    justifyContent: "center",
  },
  img: { width: "100%", height: "100%" },
  oos: {
    position: "absolute",
    left: 6,
    bottom: 6,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  oosTxt: { color: "#fff", fontSize: 9, fontWeight: "700" },
  heartBtn: {
    position: "absolute",
    right: 6,
    bottom: 6,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  body: { padding: 10 },
  name: { fontSize: 13, fontWeight: "700", color: "#111", minHeight: 34 },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    marginTop: 4,
  },
  price: { fontSize: 15, fontWeight: "800", color: Colors.primary },
  unit: { fontSize: 10, color: "#888", fontWeight: "600" },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 90,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: { fontSize: 17, fontWeight: "800", color: "#111" },
  emptySub: { fontSize: 13, color: "#888", marginTop: 4, textAlign: "center" },
  shopBtn: {
    marginTop: 18,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 11,
  },
  shopTxt: { color: "#fff", fontWeight: "800", fontSize: 13 },
});
