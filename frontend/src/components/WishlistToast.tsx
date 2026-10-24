import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  visible: boolean;
  triggerKey: number;
  productName?: string;
  bottomOffset?: number;
  duration?: number;
  onView: () => void;
  onHide: () => void;
  title?: string;
};

const HIDDEN_Y = 260;

export default function WishlistToast({
  visible,
  triggerKey,
  productName,
  bottomOffset = 20,
  duration = 5000,
  title = "Added to favourites",
  onView,
  onHide,
}: Props) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(HIDDEN_Y)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const slideOut = (done?: () => void) => {
    translateY.stopAnimation();
    opacity.stopAnimation();
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: HIDDEN_Y,
        duration: 280,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) done?.();
    });
  };

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);

    if (!visible) {
      slideOut();
      return;
    }

    translateY.stopAnimation();
    opacity.stopAnimation();
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        damping: 16,
        stiffness: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();

    timer.current = setTimeout(() => slideOut(onHide), duration);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [visible, triggerKey]);

  const handleView = () => {
    if (timer.current) clearTimeout(timer.current);
    onHide();
    onView();
  };

  return (
    <Animated.View
      pointerEvents={visible ? "auto" : "none"}
      style={[
        s.wrap,
        {
          bottom: bottomOffset + insets.bottom * 0,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={s.iconBox}>
        <Ionicons name="heart" size={16} color="#EF4444" />
      </View>
      <View style={s.textBox}>
        <Text style={s.title}>{title}</Text>
        {productName ? (
          <Text style={s.sub} numberOfLines={1}>
            {productName}
          </Text>
        ) : null}
      </View>
      <TouchableOpacity style={s.viewBtn} onPress={handleView} activeOpacity={0.85}>
        <Text style={s.viewTxt}>View</Text>
        <Ionicons name="chevron-forward" size={13} color="#111111" />
      </TouchableOpacity>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 120,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#1F1F1F",
    borderRadius: 16,
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 10,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 14,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(239,68,68,0.16)",
    justifyContent: "center",
    alignItems: "center",
  },
  textBox: { flex: 1 },
  title: { fontSize: 13, fontWeight: "800", color: "#fff" },
  sub: {
    fontSize: 11,
    fontWeight: "500",
    color: "rgba(255,255,255,0.6)",
    marginTop: 1,
  },
  viewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  viewTxt: { fontSize: 12, fontWeight: "800", color: "#111111" },
});