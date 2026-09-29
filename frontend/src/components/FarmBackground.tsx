import React from "react";
import { View, StyleSheet, Dimensions, ViewStyle } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const { width: W, height: H } = Dimensions.get("window");

export const FARM_SKY = "#EAF5E4"; // status bar patch / container bg ke liye same color use karo

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

type DecoProps = {
  name: IconName;
  size: number;
  color: string;
  opacity?: number;
  rotate?: string;
  pos: ViewStyle; // top/left/right/bottom
};

const Deco = ({ name, size, color, opacity = 1, rotate = "0deg", pos }: DecoProps) => (
  <View
    style={[
      { position: "absolute", opacity, transform: [{ rotate }] },
      pos,
    ]}
  >
    <MaterialCommunityIcons name={name} size={size} color={color} />
  </View>
);

/**
 * Full-screen dairy / cow / milk / farm background.
 * Sirf View + vector-icons use hua hai -> koi extra package install nahi karna.
 * Touches ko block nahi karta (pointerEvents="none").
 */
export default function FarmBackground() {
  const GREEN = "#4C8B3F";
  const HILL_BACK = H * 0.2;
  const HILL_FRONT = H * 0.14;

  return (
    <View style={styles.root} pointerEvents="none">
      {/* ── Sun (top right) ── */}
      <View style={styles.sunGlow} />
      <View style={styles.sun} />

      {/* ── Clouds ── */}
      <Deco name="cloud" size={64} color="#FFFFFF" opacity={0.9} pos={{ top: H * 0.06, left: W * 0.06 }} />
      <Deco name="cloud" size={44} color="#FFFFFF" opacity={0.8} pos={{ top: H * 0.13, left: W * 0.42 }} />
      <Deco name="cloud" size={52} color="#FFFFFF" opacity={0.7} pos={{ top: H * 0.24, right: W * 0.02 }} />

      {/* ── Faint pattern icons (poori screen me) ── */}
      <Deco name="cow" size={54} color={GREEN} opacity={0.1} rotate="-12deg" pos={{ top: H * 0.2, left: W * 0.04 }} />
      <Deco name="baby-bottle-outline" size={40} color={GREEN} opacity={0.12} rotate="14deg" pos={{ top: H * 0.3, right: W * 0.1 }} />
      <Deco name="grass" size={44} color={GREEN} opacity={0.12} pos={{ top: H * 0.38, left: W * 0.5 }} />
      <Deco name="glass-pint-outline" size={38} color={GREEN} opacity={0.12} rotate="-8deg" pos={{ top: H * 0.46, left: W * 0.03 }} />
      <Deco name="water-outline" size={34} color={GREEN} opacity={0.14} pos={{ top: H * 0.5, right: W * 0.06 }} />
      <Deco name="flower-outline" size={36} color={GREEN} opacity={0.12} rotate="10deg" pos={{ top: H * 0.58, left: W * 0.42 }} />
      <Deco name="cow" size={46} color={GREEN} opacity={0.09} rotate="10deg" pos={{ top: H * 0.64, right: W * 0.04 }} />
      <Deco name="leaf" size={34} color={GREEN} opacity={0.13} rotate="-25deg" pos={{ top: H * 0.7, left: W * 0.08 }} />

      {/* ── Hills (back -> front) ── */}
      <View
        style={[
          styles.hill,
          {
            width: W * 1.7,
            height: W * 1.7,
            borderRadius: W * 0.85,
            left: -W * 0.55,
            bottom: -(W * 1.7 - HILL_BACK),
            backgroundColor: "#D3EBC3",
          },
        ]}
      />
      <View
        style={[
          styles.hill,
          {
            width: W * 1.9,
            height: W * 1.9,
            borderRadius: W * 0.95,
            right: -W * 0.75,
            bottom: -(W * 1.9 - HILL_FRONT),
            backgroundColor: "#BFE0AB",
          },
        ]}
      />

      {/* ── Bottom farm scene ── */}
      <Deco name="barn" size={72} color="#C9735C" opacity={0.75} pos={{ left: W * 0.05, bottom: HILL_BACK - 18 }} />
      <Deco name="cow" size={50} color="#5F7A57" opacity={0.6} pos={{ left: W * 0.36, bottom: HILL_BACK - 12 }} />
      <Deco name="cow" size={40} color="#5F7A57" opacity={0.5} pos={{ left: W * 0.55, bottom: HILL_BACK - 30 }} />
      <Deco name="tractor" size={52} color="#8A9A5B" opacity={0.6} pos={{ right: W * 0.05, bottom: HILL_FRONT - 6 }} />
      <Deco name="fence" size={56} color="#A68B5B" opacity={0.55} pos={{ right: W * 0.32, bottom: HILL_FRONT - 4 }} />
      <Deco name="grass" size={30} color={GREEN} opacity={0.35} pos={{ left: W * 0.02, bottom: HILL_FRONT + 2 }} />
      <Deco name="grass" size={26} color={GREEN} opacity={0.3} pos={{ left: W * 0.28, bottom: HILL_FRONT - 2 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: FARM_SKY,
    overflow: "hidden",
  },
  sun: {
    position: "absolute",
    top: H * 0.045,
    right: W * 0.08,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#FFE08A",
    opacity: 0.9,
  },
  sunGlow: {
    position: "absolute",
    top: H * 0.045 - 22,
    right: W * 0.08 - 22,
    width: 102,
    height: 102,
    borderRadius: 51,
    backgroundColor: "#FFF1B8",
    opacity: 0.55,
  },
  hill: { position: "absolute" },
});