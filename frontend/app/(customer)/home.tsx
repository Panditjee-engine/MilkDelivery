import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
  Animated,
  Easing,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useIsFocused } from "@react-navigation/native";
import Svg, {
  Rect,
  Circle,
  Path,
  G,
  Ellipse,
  Line,
  Text as SvgText,
} from "react-native-svg";
import { useAuth } from "../../src/contexts/AuthContext";
import { api } from "../../src/services/api";
import { Colors } from "../../src/constants/colors";
import LoadingScreen from "../../src/components/LoadingScreen";

const SCREEN_WIDTH = Dimensions.get("window").width;

// ─── Category config
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
const getCategoryTheme = (cat: string) =>
  CATEGORY_THEMES[cat?.toLowerCase()] || CATEGORY_THEMES.other;

const homeBanners = [
  {
    id: "bull-cow",
    image: require("../../assets/images/bull-cow.png"),
    title: "Fresh dairy, every day",
    subtitle: "Manage subscriptions and deliveries in one place",
  },
];
const HOME_BANNER_WIDTH = Math.max(0, SCREEN_WIDTH - 40);

type BannerSlide = {
  id: string;
  image: any;
  title: string;
  subtitle: string;
};

function normalizeContentImage(img?: string) {
  if (!img) return null;
  if (img.startsWith("http") || img.startsWith("data:image")) {
    return { uri: img };
  }
  return { uri: `data:image/jpeg;base64,${img}` };
}

function mapContentToSlides(content: any[]): BannerSlide[] {
  return (content || [])
    .flatMap((item, itemIndex) => {
      const images = Array.isArray(item?.images) ? item.images : [];
      return images.map((img: string, imageIndex: number) => ({
        id: `${item?.id || item?._id || itemIndex}-${imageIndex}`,
        image: normalizeContentImage(img),
        title: item?.title || "Fresh dairy, every day",
        subtitle:
          item?.description || "Manage subscriptions and deliveries in one place",
      }));
    })
    .filter((slide) => Boolean(slide.image));
}

// ─── Status helpers
const statusConfig = (status: string) => {
  switch (status) {
    case "delivered":
      return {
        color: "#16a34a",
        bg: "#F0FDF4",
        border: "#BBF7D0",
        label: "Delivered",
        icon: "checkmark-circle",
      };
    case "out_for_delivery":
      return {
        color: "#d97706",
        bg: "#FFFBEB",
        border: "#FDE68A",
        label: "Out for Delivery",
        icon: "bicycle",
      };
    case "cancelled":
      return {
        color: "#dc2626",
        bg: "#FEF2F2",
        border: "#FECACA",
        label: "Cancelled",
        icon: "close-circle",
      };
    default:
      return {
        color: "#6366f1",
        bg: "#EEF2FF",
        border: "#C7D2FE",
        label: status?.replace(/_/g, " ") || "Pending",
        icon: "time",
      };
  }
};

// ─── Animated brand logo
function BrandHeader() {
  const leafRotate = useRef(new Animated.Value(0)).current;
  const leafScale = useRef(new Animated.Value(0.7)).current;
  const textSlide = useRef(new Animated.Value(-20)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(leafScale, {
        toValue: 1,
        tension: 60,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(leafRotate, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.back(2)),
        useNativeDriver: true,
      }),
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 500,
        delay: 200,
        useNativeDriver: true,
      }),
      Animated.spring(textSlide, {
        toValue: 0,
        tension: 80,
        friction: 8,
        delay: 150,
        useNativeDriver: true,
      }),
    ]).start();

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseScale, {
          toValue: 1.12,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseScale, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const rotate = leafRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["-45deg", "0deg"],
  });

  return (
    <View style={brandStyles.wrap}>
      <View style={brandStyles.logoRow}>
        <Animated.View
          style={[
            brandStyles.leafWrap,
            {
              transform: [
                { rotate },
                { scale: Animated.multiply(leafScale, pulseScale) },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={[Colors.primary, Colors.primary + "BB"]}
            style={brandStyles.leafGrad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="leaf" size={18} color="#fff" />
          </LinearGradient>
        </Animated.View>
        <Animated.Text
          style={[
            brandStyles.brandName,
            { opacity: textOpacity, transform: [{ translateX: textSlide }] },
          ]}
        >
          GauSatv
        </Animated.Text>
        <Animated.View style={[brandStyles.tagPill, { opacity: textOpacity }]}>
          <Text style={brandStyles.tagText}>PURE</Text>
        </Animated.View>
      </View>
    </View>
  );
}

function HomeBannerSlider({ banners }: { banners: BannerSlide[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const slides = banners.length > 0 ? banners : homeBanners;

  return (
    <View style={s.bannerWrap}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(
            event.nativeEvent.contentOffset.x / HOME_BANNER_WIDTH,
          );
          setActiveIndex(index);
        }}
      >
        {slides.map((banner) => (
          <View key={banner.id} style={s.bannerSlide}>
            <LinearGradient
              colors={["#123524", "#1f6f43"]}
              style={s.bannerCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={s.bannerTextBox}>
                <Text style={s.bannerKicker}>Gau Satva</Text>
                <Text style={s.bannerTitle}>{banner.title}</Text>
                <Text style={s.bannerSubtitle}>{banner.subtitle}</Text>
              </View>
              <Image
                source={banner.image}
                style={s.bannerImage}
                resizeMode="contain"
              />
              <View style={s.bannerGlow} />
            </LinearGradient>
          </View>
        ))}
      </ScrollView>
      <View style={s.bannerDots}>
        {slides.map((banner, index) => (
          <View
            key={banner.id}
            style={[s.bannerDot, activeIndex === index && s.bannerDotActive]}
          />
        ))}
      </View> 
      
    </View>
  );
}

const brandStyles = StyleSheet.create({
  wrap: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  leafWrap: {
    shadowColor: Colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  leafGrad: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  brandName: {
    fontSize: 26,
    fontWeight: "900",
    color: "#111",
    letterSpacing: -1,
  },
  tagPill: {
    backgroundColor: Colors.primary + "18",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    marginLeft: 2,
  },
  tagText: {
    fontSize: 9,
    fontWeight: "800",
    color: Colors.primary,
    letterSpacing: 1.2,
  },
});

const POPULAR_GRID_GAP = 12;
const POPULAR_CARD_WIDTH = (SCREEN_WIDTH - 40 - POPULAR_GRID_GAP) / 2;

// ─── Product grid — tapping ANYWHERE opens product details
function ProductGridCard({
  product,
  index,
  onOpenDetails,
  adminName,
}: {
  product: any;
  index: number;
  onOpenDetails: () => void;
  adminName?: string;
}) {
  const theme = getCategoryTheme(product.category);
  const slideAnim = useRef(new Animated.Value(40)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 70,
        friction: 9,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 320,
        delay: index * 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{ opacity: opacityAnim, transform: [{ translateY: slideAnim }] }}
    >
      <TouchableOpacity
        style={productGridStyles.card}
        onPress={onOpenDetails}
        activeOpacity={0.86}
      >
        <View style={[productGridStyles.imgBox, { backgroundColor: theme.bg }]}>
          {product?.image ? (
            <Image
              source={{ uri: product.image }}
              style={productGridStyles.img}
            />
          ) : (
            <Ionicons name={theme.icon as any} size={26} color={theme.accent} />
          )}
          <View style={productGridStyles.addBtn}>
            <Ionicons name="arrow-forward" size={14} color={Colors.primary} />
          </View>
        </View>
        <View style={productGridStyles.info}>
          {adminName && (
            <View style={productGridStyles.adminBadge}>
              <Ionicons name="storefront-outline" size={10} color="#16a34a" />
              <Text style={productGridStyles.adminName} numberOfLines={1}>
                {adminName}
              </Text>
            </View>
          )}
          <Text style={productGridStyles.name} numberOfLines={2}>
            {product.name}
          </Text>
          <View style={productGridStyles.footer}>
            <Text style={productGridStyles.price}>₹{product.price}</Text>
            <Text style={productGridStyles.unit} numberOfLines={1}>
              {product.unit}
            </Text>
          </View>
          <View
            style={[
              productGridStyles.buyNowBtn,
              { backgroundColor: theme.accent },
            ]}
          >
            <Text style={productGridStyles.buyNowText}>View Details</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function ExploreAllProductsCard({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity
      style={productGridStyles.exploreCard}
      onPress={onPress}
      activeOpacity={0.86}
    >
      <LinearGradient
        colors={[Colors.primary, Colors.primary + "D9"]}
        style={productGridStyles.exploreGrad}
      >
        <Ionicons name="storefront-outline" size={30} color="#fff" />
        <Text style={productGridStyles.exploreTitle}>Explore All Product</Text>
        <Text style={productGridStyles.exploreSub}>Browse full catalog</Text>
        <View style={productGridStyles.exploreArrow}>
          <Ionicons name="arrow-forward" size={16} color={Colors.primary} />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const productGridStyles = StyleSheet.create({
  card: {
    width: POPULAR_CARD_WIDTH,
    backgroundColor: "#fff",
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  imgBox: {
    height: 105,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  img: { width: "100%", height: "100%" },
  info: { padding: 10, paddingBottom: 12 },
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginBottom: 5,
  },
  adminName: {
    fontSize: 10,
    fontWeight: "700",
    color: "#16a34a",
    maxWidth: 110,
  },
  name: { fontSize: 13, fontWeight: "800", color: "#111", minHeight: 34 },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  unit: { fontSize: 10.5, color: "#aaa", fontWeight: "700", maxWidth: 58 },
  price: { fontSize: 15, fontWeight: "900", color: Colors.primary },
  buyNowBtn: {
    marginTop: 9,
    borderRadius: 12,
    paddingVertical: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  buyNowText: { fontSize: 12, fontWeight: "900", color: "#fff" },
  addBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  exploreCard: {
    width: POPULAR_CARD_WIDTH,
    borderRadius: 18,
    overflow: "hidden",
  },
  exploreGrad: { minHeight: 176, padding: 16, justifyContent: "space-between" },
  exploreTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  exploreSub: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 12,
    fontWeight: "700",
  },
  exploreArrow: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-end",
  },
});

// ─── Main Screen
export default function CustomerHome() {
  const { user } = useAuth();
  const router = useRouter();
  const isFocused = useIsFocused();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [recentOrder, setRecentOrder] = useState<any>(null);
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [adminsList, setAdminsList] = useState<any[]>([]);
  const [contentSlides, setContentSlides] = useState<BannerSlide[]>([]);

  // Wallet card entrance
  const walletAnim = useRef(new Animated.Value(0)).current;
  const headerAnim = useRef(new Animated.Value(0)).current;

  const fetchData = async (isInitial = false) => {
    try {
      const [walletData, ordersData, productsData, adminsData, contentData] =
        await Promise.all([
          api.getWallet(),
          api.getOrders(),
          api.getCatalogProducts(
            (user as any)?.admin_id ?? undefined,
            undefined,
          ),
          api.getAdmins(),
          api.getCatalogContent().catch(() => null),
        ]);

      setAdminsList(adminsData.map((a: any) => ({ ...a, id: a.id || a._id })));
      setWalletBalance(walletData.balance);
      setRecentOrder(ordersData?.[0] || null);
      setFeaturedProducts((productsData || []).slice(0, 3));
      setContentSlides(mapContentToSlides(contentData?.data || []));

      if (isInitial) {
        Animated.parallel([
          Animated.spring(walletAnim, {
            toValue: 1,
            tension: 55,
            friction: 8,
            delay: 100,
            useNativeDriver: true,
          }),
          Animated.timing(headerAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ]).start();
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  useEffect(() => {
    if (!isFocused) return;
    fetchData(true);
    const interval = setInterval(() => fetchData(false), 2000);
    return () => clearInterval(interval);
  }, [isFocused]);

  const goToCatalog = () => router.push("/(customer)/catalog");
  const openProductDetails = (product: any) => {
    router.push({
      pathname: "/(customer)/product-details",
      params: {
        id: product.id || product._id,
        product: encodeURIComponent(JSON.stringify(product)),
      },
    } as any);
  };

  if (loading) return <LoadingScreen />;

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

  const sc = recentOrder ? statusConfig(recentOrder.status) : null;

  const walletSlide = walletAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [30, 0],
  });

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 0 }}
      >
        {/* ── Brand Header ── */}
        <View style={s.headerRow}>
          <BrandHeader />
          <TouchableOpacity
            style={s.notifBtn}
            onPress={() =>
              router.push("/(customer)/order-notifications" as any)
            }
            activeOpacity={0.82}
          >
            <Ionicons name="notifications-outline" size={21} color="#333" />
            {recentOrder ? <View style={s.notifDot} /> : null}
          </TouchableOpacity>
        </View>

        {/* ── Wallet Card ── */}
        <Animated.View
          style={{
            opacity: walletAnim,
            transform: [{ translateY: walletSlide }],
          }}
        >
          <TouchableOpacity
            style={s.walletCard}
            onPress={() => router.push("/(customer)/wallet")}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={[Colors.primary, Colors.primary + "DD"]}
              style={s.walletGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={s.walletCircle1} />
              <View style={s.walletCircle2} />

              <View style={s.walletInner}>
                <View style={s.walletLeft}>
                  <View style={s.walletIconBox}>
                    <Ionicons name="wallet-outline" size={19} color="#fff" />
                  </View>
                  <View>
                    <Text style={s.walletLabel}>Wallet Balance</Text>
                    <Text style={s.walletAmount}>
                      ₹{walletBalance.toFixed(2)}
                    </Text>
                  </View>
                </View>
                <View style={s.walletRight}>
                  {walletBalance < 100 ? (
                    <View style={s.lowBadge}>
                      <Ionicons name="warning" size={10} color="#f59e0b" />
                      <Text style={s.lowBadgeText}>Low</Text>
                    </View>
                  ) : (
                    <View style={s.okBadge}>
                      <Ionicons
                        name="checkmark-circle"
                        size={10}
                        color="#4ade80"
                      />
                      <Text style={s.okBadgeText}>Good</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={s.topUpBtn}
                    onPress={() => router.push("/(customer)/wallet")}
                    activeOpacity={0.85}
                  >
                    <Text style={s.topUpText}>Top Up</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        <HomeBannerSlider banners={contentSlides} />

        {/* ── Recent Order ── */}
        <View style={s.sectionWrap}>
          <Text style={s.sectionTitle}>Recent Order</Text>
          <View style={s.card}>
            {recentOrder && sc ? (
              <>
                <View style={s.orderTopRow}>
                  <View
                    style={[
                      s.orderStatusPill,
                      { backgroundColor: sc.bg, borderColor: sc.border },
                    ]}
                  >
                    <Ionicons
                      name={sc.icon as any}
                      size={12}
                      color={sc.color}
                    />
                    <Text style={[s.orderStatusText, { color: sc.color }]}>
                      {sc.label}
                    </Text>
                  </View>
                  {recentOrder.delivery_date && (
                    <Text style={s.orderDate}>
                      {formatDate(recentOrder.delivery_date)}
                    </Text>
                  )}
                </View>
                {recentOrder.items?.slice(0, 3).map((item: any, i: number) => (
                  <View
                    key={i}
                    style={[
                      s.orderItem,
                      i < Math.min(recentOrder.items.length, 3) - 1 &&
                        s.orderItemBorder,
                    ]}
                  >
                    <Text style={s.orderItemName}>{item.product_name}</Text>
                    <Text style={s.orderItemQty}>×{item.quantity}</Text>
                    <Text style={s.orderItemPrice}>₹{item.total}</Text>
                  </View>
                ))}
                {recentOrder.items?.length > 3 && (
                  <Text style={s.moreItems}>
                    +{recentOrder.items.length - 3} more items
                  </Text>
                )}
                <View style={s.orderTotalRow}>
                  <Text style={s.orderTotalLabel}>Total</Text>
                  <Text style={s.orderTotalAmt}>
                    ₹{recentOrder.total_amount}
                  </Text>
                </View>
              </>
            ) : (
              <View style={s.emptyState}>
                <View style={s.emptyIconWrap}>
                  <Ionicons
                    name="bag-outline"
                    size={28}
                    color={Colors.primary + "80"}
                  />
                </View>
                <Text style={s.emptyTitle}>No orders yet</Text>
                <Text style={s.emptySubtitle}>
                  Your recent order will appear here
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Popular Items ── */}
        {featuredProducts.length > 0 && (
          <View style={s.sectionWrap}>
            <View style={s.sectionHeaderRow}>
              <Text style={s.sectionTitle}>Popular Items</Text>
              <TouchableOpacity onPress={goToCatalog} activeOpacity={0.7}>
                <Text style={s.seeAllText}>See all →</Text>
              </TouchableOpacity>
            </View>
            <View style={s.popularGrid}>
              {featuredProducts.map((product, i) => {
                const admin = adminsList.find((a) => a.id === product.admin_id);
                const adminName = admin?.shop_name || admin?.name || undefined;
                return (
                  <ProductGridCard
                    key={product.id}
                    product={product}
                    index={i}
                    adminName={adminName}
                    onOpenDetails={() => openProductDetails(product)}
                  />
                );
              })}
              <ExploreAllProductsCard onPress={goToCatalog} />
            </View>
          </View>
        )}

        {/* ── Animated Brand Footer ── */}
        <BrandFooter />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Brand Footer
function BrandFooter() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const sceneSlide = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        delay: 300,
        useNativeDriver: true,
      }),
      Animated.spring(sceneSlide, {
        toValue: 0,
        tension: 50,
        friction: 9,
        delay: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[footerStyles.wrap, { opacity: fadeAnim }]}>
      <Text style={footerStyles.trustedBy}>TRUSTED BY</Text>
      <View style={footerStyles.statRow}>
        <Text style={footerStyles.statSuffix}> Families</Text>
      </View>
      <Text style={footerStyles.statSub}>ACROSS YOUR SOCIETY</Text>
      <Text style={footerStyles.tagline}>Pure. Fresh. Delivered daily.</Text>

      <Animated.View
        style={[
          footerStyles.sceneWrap,
          { transform: [{ translateY: sceneSlide }] },
        ]}
      >
        <Svg width="100%" height={130} viewBox="0 0 400 130">
          <Rect
            x="0"
            y="0"
            width="400"
            height="130"
            fill={Colors.primary + "10"}
          />
          <Circle cx="48" cy="45" r="28" fill="#FCD34D" opacity={0.9} />
          <Circle cx="48" cy="45" r="20" fill="#FDE68A" />
          <Path
            d="M0 95 Q50 65 100 90 Q150 110 200 85 Q250 60 300 88 Q350 108 400 80 L400 130 L0 130 Z"
            fill={Colors.primary + "22"}
          />
          <Path
            d="M0 105 Q60 80 120 100 Q180 118 240 95 Q300 72 360 100 L400 95 L400 130 L0 130 Z"
            fill={Colors.primary + "40"}
          />
          <G transform="translate(60, 72)">
            <Ellipse
              cx="0"
              cy="0"
              rx="18"
              ry="10"
              fill={Colors.primary + "CC"}
            />
            <Circle cx="16" cy="-8" r="7" fill={Colors.primary + "CC"} />
            <Line
              x1="-10"
              y1="8"
              x2="-10"
              y2="20"
              stroke={Colors.primary}
              strokeWidth="3"
              strokeLinecap="round"
            />
            <Line
              x1="-2"
              y1="9"
              x2="-2"
              y2="21"
              stroke={Colors.primary}
              strokeWidth="3"
              strokeLinecap="round"
            />
            <Line
              x1="8"
              y1="9"
              x2="8"
              y2="21"
              stroke={Colors.primary}
              strokeWidth="3"
              strokeLinecap="round"
            />
            <Line
              x1="15"
              y1="8"
              x2="15"
              y2="20"
              stroke={Colors.primary}
              strokeWidth="3"
              strokeLinecap="round"
            />
            <Path
              d="M19 -13 Q24 -18 22 -22"
              stroke={Colors.primary}
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
            <Path
              d="M22 -13 Q28 -14 27 -18"
              stroke={Colors.primary}
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
          </G>
          <G transform="translate(155, 58)">
            <Rect
              x="-8"
              y="0"
              width="16"
              height="28"
              rx="4"
              fill="#fff"
              stroke={Colors.primary}
              strokeWidth="1.5"
            />
            <Rect
              x="-5"
              y="-6"
              width="10"
              height="8"
              rx="2"
              fill="#fff"
              stroke={Colors.primary}
              strokeWidth="1.5"
            />
            <Rect
              x="-8"
              y="6"
              width="16"
              height="8"
              fill={Colors.primary + "40"}
            />
          </G>
          <G transform="translate(230, 80)">
            <Ellipse
              cx="0"
              cy="0"
              rx="12"
              ry="7"
              fill={Colors.primary + "88"}
            />
            <Circle cx="11" cy="-6" r="5" fill={Colors.primary + "88"} />
            <Line
              x1="-7"
              y1="6"
              x2="-7"
              y2="14"
              stroke={Colors.primary + "88"}
              strokeWidth="2"
              strokeLinecap="round"
            />
            <Line
              x1="-1"
              y1="7"
              x2="-1"
              y2="15"
              stroke={Colors.primary + "88"}
              strokeWidth="2"
              strokeLinecap="round"
            />
            <Line
              x1="6"
              y1="7"
              x2="6"
              y2="15"
              stroke={Colors.primary + "88"}
              strokeWidth="2"
              strokeLinecap="round"
            />
            <Line
              x1="10"
              y1="6"
              x2="10"
              y2="14"
              stroke={Colors.primary + "88"}
              strokeWidth="2"
              strokeLinecap="round"
            />
          </G>
          <G transform="translate(310, 55)">
            <Rect
              x="-3"
              y="20"
              width="6"
              height="18"
              fill={Colors.primary + "80"}
            />
            <Ellipse
              cx="0"
              cy="18"
              rx="14"
              ry="18"
              fill={Colors.primary + "90"}
            />
          </G>
          <G transform="translate(340, 62)">
            <Rect
              x="-2"
              y="15"
              width="5"
              height="14"
              fill={Colors.primary + "60"}
            />
            <Ellipse
              cx="0"
              cy="14"
              rx="10"
              ry="13"
              fill={Colors.primary + "70"}
            />
          </G>
          <G transform="translate(370, 58)">
            <Rect
              x="-3"
              y="18"
              width="6"
              height="16"
              fill={Colors.primary + "80"}
            />
            <Ellipse
              cx="0"
              cy="16"
              rx="13"
              ry="16"
              fill={Colors.primary + "88"}
            />
          </G>
          <Line
            x1="0"
            y1="108"
            x2="400"
            y2="108"
            stroke={Colors.primary + "60"}
            strokeWidth="1"
          />
          <G transform="translate(310, 90)">
            <Circle
              cx="-12"
              cy="10"
              r="7"
              fill="none"
              stroke={Colors.primary}
              strokeWidth="2.5"
            />
            <Circle
              cx="12"
              cy="10"
              r="7"
              fill="none"
              stroke={Colors.primary}
              strokeWidth="2.5"
            />
            <Path
              d="M-12 10 L0 2 L12 10"
              fill="none"
              stroke={Colors.primary}
              strokeWidth="2"
            />
            <Path
              d="M0 2 L4 -6 L14 -6"
              fill="none"
              stroke={Colors.primary}
              strokeWidth="2"
              strokeLinecap="round"
            />
            <Rect
              x="4"
              y="-14"
              width="20"
              height="10"
              rx="3"
              fill={Colors.primary}
            />
            <SvgText fill="#fff" x={7} y={-6} fontSize={6}>
              milk
            </SvgText>
          </G>
          <Rect x="0" y="120" width="400" height="10" fill={Colors.primary} />
        </Svg>
      </Animated.View>

      <Text style={footerStyles.madeIn}>MADE WITH LOVE FOR PURITY</Text>
    </Animated.View>
  );
}

const footerStyles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    paddingTop: 32,
    paddingBottom: 0,
    backgroundColor: "#fff",
    marginTop: 8,
    marginBottom: 0,
  },
  trustedBy: {
    fontSize: 11,
    fontWeight: "700",
    color: "#bbb",
    letterSpacing: 2,
    marginBottom: 6,
  },
  statRow: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  statSuffix: {
    fontSize: 28,
    fontWeight: "900",
    color: "#E0E0E0",
    letterSpacing: -1,
  },
  statSub: {
    fontSize: 11,
    fontWeight: "700",
    color: "#bbb",
    letterSpacing: 2,
    marginTop: 4,
    marginBottom: 16,
  },
  tagline: {
    fontSize: 13,
    color: "#aaa",
    fontWeight: "500",
    letterSpacing: 0.4,
    marginBottom: 24,
  },
  sceneWrap: { width: "100%", overflow: "hidden" },
  madeIn: {
    fontSize: 10,
    color: "#aaa",
    fontWeight: "600",
    letterSpacing: 1,
    paddingTop: 8,
    paddingBottom: 0,
  },
});

// ─── Styles
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F4F6" },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  notifBtn: {
    marginTop: 14,
    marginRight: 20,
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  notifDot: {
    position: "absolute",
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ef4444",
    borderWidth: 1.5,
    borderColor: "#fff",
  },

  // Wallet
  walletCard: {
    marginHorizontal: 20,
    marginBottom: 22,
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: Colors.primary,
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  walletGrad: { padding: 20, overflow: "hidden" },
  walletCircle1: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.08)",
    top: -30,
    right: -20,
  },
  walletCircle2: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.06)",
    bottom: -20,
    left: 30,
  },
  walletInner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  walletLeft: { flexDirection: "row", alignItems: "center", gap: 14 },
  walletIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  walletLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.7)",
    fontWeight: "500",
    marginBottom: 2,
  },
  walletAmount: {
    fontSize: 26,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -0.8,
  },
  walletRight: { alignItems: "flex-end", gap: 8 },
  lowBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(245,158,11,0.25)",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
  },
  lowBadgeText: { fontSize: 11, color: "#fcd34d", fontWeight: "700" },
  okBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(74,222,128,0.2)",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
  },
  okBadgeText: { fontSize: 11, color: "#4ade80", fontWeight: "700" },
  topUpBtn: {
    backgroundColor: "rgba(255,255,255,0.22)",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  topUpText: { fontSize: 12, fontWeight: "700", color: "#fff" },

  // Home banner slider
  bannerWrap: { marginHorizontal: 20, marginBottom: 20 },
  bannerSlide: { width: HOME_BANNER_WIDTH },
  bannerCard: {
    height: 150,
    borderRadius: 24,
    overflow: "hidden",
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#123524",
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  bannerTextBox: { flex: 1, zIndex: 2 },
  bannerKicker: {
    fontSize: 10,
    fontWeight: "900",
    color: "#bbf7d0",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  bannerTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -0.6,
    maxWidth: 190,
  },
  bannerSubtitle: {
    fontSize: 11.5,
    color: "rgba(255,255,255,0.76)",
    fontWeight: "600",
    marginTop: 7,
    lineHeight: 16,
    maxWidth: 190,
  },
  bannerImage: {
    width: 135,
    height: 120,
    marginRight: -6,
    zIndex: 2,
  },
  bannerGlow: {
    position: "absolute",
    right: -35,
    bottom: -45,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(187,247,208,0.18)",
  },
  bannerDots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 9,
  },
  bannerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#D1D5DB",
  },
  bannerDotActive: { width: 18, backgroundColor: Colors.primary },

  // Sections
  sectionWrap: { marginHorizontal: 20, marginBottom: 20 },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111",
    letterSpacing: -0.3,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.primary,
  },
  popularGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: POPULAR_GRID_GAP,
  },

  // Generic card
  card: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  // Order card
  orderTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  orderStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  orderStatusText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  orderDate: { fontSize: 12, color: "#aaa", fontWeight: "500" },
  orderItem: { flexDirection: "row", alignItems: "center", paddingVertical: 9 },
  orderItemBorder: { borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  orderItemName: { flex: 1, fontSize: 13, color: "#333", fontWeight: "500" },
  orderItemQty: { fontSize: 12, color: "#bbb", marginRight: 14 },
  orderItemPrice: { fontSize: 13, fontWeight: "700", color: "#111" },
  moreItems: {
    fontSize: 12,
    color: "#ccc",
    fontStyle: "italic",
    paddingTop: 6,
  },
  orderTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 12,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  orderTotalLabel: { fontSize: 13, color: "#999", fontWeight: "600" },
  orderTotalAmt: {
    fontSize: 18,
    fontWeight: "900",
    color: Colors.primary,
    letterSpacing: -0.5,
  },

  // Empty state
  emptyState: { alignItems: "center", paddingVertical: 20, gap: 8 },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: Colors.primary + "10",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: "#999" },
  emptySubtitle: { fontSize: 12, color: "#ccc" },
});