import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { api, getApiBaseUrl } from "../../src/services/api";

const C = {
  primary: "#FF9675",
  dark: "#BB6B3F",
  deep: "#8B6854",
  bg: "#FFF8EF",
  card: "#FFE8D6",
  text: "#3D1F0A",
  textMuted: "#A07850",
  textLight: "#C9A882",
  success: "#22C55E",
  white: "#FFFFFF",
  border: "#FFE8C8",
  inputBg: "#FFF8EF",
};

type Product = {
  id?: string;
  _id?: string;
  product_id?: string;
  name: string;
  price: number;
  image?: string | null;
  images?: string[];
  category?: string;
  unit?: string;
};

type DraftPrices = Record<string, string>;

const getProductId = (product?: Product | null) =>
  product?.id || product?._id || product?.product_id || "";

const normalizeImageUrl = (url?: string | null) => {
  const value = (url || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value) || value.startsWith("data:")) return value;

  const baseUrl = getApiBaseUrl().replace(/\/api\/v1\/?$/, "");
  return `${baseUrl}${value.startsWith("/") ? "" : "/"}${value}`;
};

const parsePrice = (value: string) => {
  const normalized = value.replace(/,/g, ".").trim();
  if (!normalized) return NaN;
  return Number(normalized);
};

export default function PriceUpdateScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [draftPrices, setDraftPrices] = useState<DraftPrices>({});
  const [query, setQuery] = useState("");

  const loadProducts = useCallback(async () => {
    try {
      const data = await api.getProducts();
      const list = Array.isArray(data) ? data : [];
      setProducts(list);
      setDraftPrices((prev) => {
        const next: DraftPrices = {};
        for (const product of list) {
          const id = getProductId(product);
          if (!id) continue;
          next[id] = prev[id] ?? String(product.price ?? 0);
        }
        return next;
      });
    } catch (error: any) {
      Alert.alert("Could not load products", error?.message || "Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadProducts();
  }, [loadProducts]);

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((product) => {
      return (
        product.name.toLowerCase().includes(q) ||
        (product.category || "").toLowerCase().includes(q)
      );
    });
  }, [products, query]);

  const changedUpdates = useMemo(() => {
    return products
      .map((product) => {
        const productId = getProductId(product);
        if (!productId) return null;
        const nextPrice = parsePrice(draftPrices[productId] ?? "");
        const currentPrice = Number(product.price ?? 0);
        if (!Number.isFinite(nextPrice) || nextPrice < 0) return null;
        if (Math.round(nextPrice * 100) === Math.round(currentPrice * 100)) {
          return null;
        }
        return { product_id: productId, price: Math.round(nextPrice * 100) / 100 };
      })
      .filter(Boolean) as Array<{ product_id: string; price: number }>;
  }, [products, draftPrices]);

  const invalidCount = useMemo(() => {
    return products.reduce((count, product) => {
      const id = getProductId(product);
      if (!id) return count;
      const value = draftPrices[id] ?? "";
      const price = parsePrice(value);
      return !Number.isFinite(price) || price < 0 ? count + 1 : count;
    }, 0);
  }, [products, draftPrices]);

  const updateDraft = (productId: string, value: string) => {
    const sanitized = value.replace(/[^0-9.,]/g, "");
    setDraftPrices((prev) => ({ ...prev, [productId]: sanitized }));
  };

  const resetOne = (product: Product) => {
    const id = getProductId(product);
    if (!id) return;
    setDraftPrices((prev) => ({ ...prev, [id]: String(product.price ?? 0) }));
  };

  const saveOne = async (product: Product) => {
    const productId = getProductId(product);
    if (!productId || saving) return;
    const nextPrice = parsePrice(draftPrices[productId] ?? "");
    if (!Number.isFinite(nextPrice) || nextPrice < 0) {
      Alert.alert("Invalid price", "Please enter a valid non-negative price.");
      return;
    }
    await saveUpdates([{ product_id: productId, price: Math.round(nextPrice * 100) / 100 }]);
  };

  const saveBulk = async () => {
    if (invalidCount > 0) {
      Alert.alert("Invalid prices", "Please fix invalid price fields before saving.");
      return;
    }
    if (changedUpdates.length === 0) {
      Alert.alert("No changes", "Edit one or more new prices before saving.");
      return;
    }
    await saveUpdates(changedUpdates);
  };

  const saveUpdates = async (updates: Array<{ product_id: string; price: number }>) => {
    try {
      setSaving(true);
      const result = await api.updateProductPrices(updates);
      await loadProducts();
      Alert.alert(
        "Prices updated",
        `${result?.updated ?? updates.length} product price${updates.length === 1 ? "" : "s"} updated successfully.`,
      );
    } catch (error: any) {
      Alert.alert("Update failed", error?.message || "Could not update prices.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={C.dark} size="large" />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={C.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Update Prices</Text>
            <Text style={styles.subtitle}>
              {changedUpdates.length} changed · {products.length} products
            </Text>
          </View>
          <View style={styles.currencyBadge}>
            <Text style={styles.currencyText}>Rs</Text>
          </View>
        </View>

        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color={C.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search product..."
            placeholderTextColor={C.textLight}
            value={query}
            onChangeText={setQuery}
          />
          {query ? (
            <TouchableOpacity onPress={() => setQuery("")}>
              <Ionicons name="close-circle" size={18} color={C.textLight} />
            </TouchableOpacity>
          ) : null}
        </View>

        <ScrollView
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 118 }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.dark} />
          }
          keyboardShouldPersistTaps="handled"
        >
          {filteredProducts.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="cube-outline" size={42} color={C.textLight} />
              <Text style={styles.emptyTitle}>No products found</Text>
              <Text style={styles.emptySub}>Try a different search term.</Text>
            </View>
          ) : (
            filteredProducts.map((product) => {
              const productId = getProductId(product);
              const draft = draftPrices[productId] ?? "";
              const parsed = parsePrice(draft);
              const invalid = !Number.isFinite(parsed) || parsed < 0;
              const changed =
                !invalid &&
                Math.round(parsed * 100) !== Math.round(Number(product.price ?? 0) * 100);
              const image = normalizeImageUrl(product.image || product.images?.[0]);

              return (
                <View key={productId || product.name} style={styles.card}>
                  <View style={styles.productImageWrap}>
                    {image ? (
                      <Image source={{ uri: image }} style={styles.productImage} />
                    ) : (
                      <View style={styles.productImageFallback}>
                        <Ionicons name="image-outline" size={24} color={C.textLight} />
                      </View>
                    )}
                  </View>

                  <View style={styles.productBody}>
                    <View style={styles.productTopRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.productName} numberOfLines={2}>
                          {product.name}
                        </Text>
                        <Text style={styles.currentPrice}>Current Rs {product.price ?? 0}</Text>
                      </View>
                      {changed ? <Text style={styles.changedPill}>Changed</Text> : null}
                    </View>

                    <View style={styles.priceRow}>
                      <View style={[styles.inputWrap, invalid && styles.inputError]}>
                        <Text style={styles.inputPrefix}>Rs</Text>
                        <TextInput
                          style={styles.priceInput}
                          value={draft}
                          onChangeText={(value) => updateDraft(productId, value)}
                          keyboardType="decimal-pad"
                          placeholder="New price"
                          placeholderTextColor={C.textLight}
                        />
                      </View>
                      <TouchableOpacity
                        style={[styles.smallBtn, (!changed || saving) && styles.smallBtnDisabled]}
                        onPress={() => saveOne(product)}
                        disabled={!changed || saving}
                      >
                        <Text style={styles.smallBtnText}>Update</Text>
                      </TouchableOpacity>
                    </View>

                    {invalid ? (
                      <Text style={styles.errorText}>Enter a valid price.</Text>
                    ) : changed ? (
                      <TouchableOpacity onPress={() => resetOne(product)}>
                        <Text style={styles.resetText}>Reset to Rs {product.price ?? 0}</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
          <View>
            <Text style={styles.footerTitle}>{changedUpdates.length} price changes</Text>
            <Text style={styles.footerSub}>
              {invalidCount > 0 ? `${invalidCount} invalid field${invalidCount === 1 ? "" : "s"}` : "Ready for bulk update"}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.saveBtn,
              (saving || changedUpdates.length === 0 || invalidCount > 0) && styles.saveBtnDisabled,
            ]}
            onPress={saveBulk}
            disabled={saving || changedUpdates.length === 0 || invalidCount > 0}
          >
            {saving ? (
              <ActivityIndicator color={C.white} />
            ) : (
              <>
                <Ionicons name="save-outline" size={18} color={C.white} />
                <Text style={styles.saveBtnText}>Save Prices</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { color: C.textMuted, fontWeight: "700" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 12,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: C.card,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  title: { fontSize: 25, fontWeight: "900", color: C.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: C.textLight, marginTop: 2, fontWeight: "600" },
  currencyBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: C.text,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: C.text,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  currencyText: { color: C.white, fontSize: 15, fontWeight: "900" },
  searchWrap: {
    marginHorizontal: 18,
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    height: 48,
  },
  searchInput: { flex: 1, color: C.text, fontWeight: "700", marginLeft: 8 },
  listContent: { paddingHorizontal: 16, gap: 12 },
  card: {
    flexDirection: "row",
    backgroundColor: C.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
    shadowColor: C.dark,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  productImageWrap: {
    width: 76,
    height: 76,
    borderRadius: 16,
    backgroundColor: C.card,
    overflow: "hidden",
  },
  productImage: { width: "100%", height: "100%", resizeMode: "cover" },
  productImageFallback: { flex: 1, justifyContent: "center", alignItems: "center" },
  productBody: { flex: 1, marginLeft: 12 },
  productTopRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  productName: { color: C.text, fontSize: 15, fontWeight: "900", lineHeight: 19 },
  currentPrice: { color: C.textMuted, fontSize: 12, fontWeight: "700", marginTop: 4 },
  changedPill: {
    color: C.success,
    backgroundColor: "#ECFDF3",
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 10,
    fontWeight: "900",
  },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  inputWrap: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    backgroundColor: C.inputBg,
    borderWidth: 1,
    borderColor: C.border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  inputError: { borderColor: "#DC2626", backgroundColor: "#FFF0F0" },
  inputPrefix: { color: C.dark, fontWeight: "900", marginRight: 6 },
  priceInput: { flex: 1, color: C.text, fontSize: 15, fontWeight: "800", paddingVertical: 0 },
  smallBtn: {
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: C.dark,
    justifyContent: "center",
    alignItems: "center",
  },
  smallBtnDisabled: { opacity: 0.45 },
  smallBtnText: { color: C.white, fontSize: 12, fontWeight: "900" },
  errorText: { color: "#DC2626", fontSize: 11, fontWeight: "700", marginTop: 6 },
  resetText: { color: C.deep, fontSize: 11, fontWeight: "800", marginTop: 6 },
  emptyState: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyTitle: { color: C.text, fontSize: 18, fontWeight: "900" },
  emptySub: { color: C.textMuted, fontSize: 13, fontWeight: "600" },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
    paddingTop: 12,
    backgroundColor: C.white,
    borderTopWidth: 1,
    borderTopColor: C.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  footerTitle: { color: C.text, fontSize: 15, fontWeight: "900" },
  footerSub: { color: C.textMuted, fontSize: 12, fontWeight: "700", marginTop: 2 },
  saveBtn: {
    minWidth: 146,
    height: 50,
    borderRadius: 16,
    backgroundColor: C.dark,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
  },
  saveBtnDisabled: { opacity: 0.45 },
  saveBtnText: { color: C.white, fontSize: 14, fontWeight: "900" },
});
