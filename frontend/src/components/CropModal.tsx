import React, { useState, useRef, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  PanResponder,
  Animated,
  Dimensions,
} from "react-native";
import * as ImageManipulator from "expo-image-manipulator";
import { Colors } from "../constants/colors";

const CROP_SIZE = Math.min(Dimensions.get("window").width - 60, 300);

export default function CropModal({
  visible,
  imageUri,
  imageSize, // ← new prop
  onCancel,
  onDone,
}: {
  visible: boolean;
  imageUri: string | null;
  imageSize?: { w: number; h: number } | null;
  onCancel: () => void;
  onDone: (croppedUri: string) => void;
}) {
  const [natural, setNatural] = useState({ w: 1, h: 1 });
  const [displaySize, setDisplaySize] = useState({ w: CROP_SIZE, h: CROP_SIZE });
  const [processing, setProcessing] = useState(false);

  const pan = useRef(new Animated.ValueXY()).current;
  const panOffset = useRef({ x: 0, y: 0 });
  const boundsRef = useRef({ minX: 0, minY: 0 });

  const setupFromSize = (w: number, h: number) => {
    const scale = Math.max(CROP_SIZE / w, CROP_SIZE / h);
    const dW = w * scale;
    const dH = h * scale;
    setNatural({ w, h });
    setDisplaySize({ w: dW, h: dH });

    const minX = CROP_SIZE - dW;
    const minY = CROP_SIZE - dH;
    boundsRef.current = { minX, minY };

    const startX = minX / 2;
    const startY = minY / 2;
    panOffset.current = { x: startX, y: startY };
    pan.setValue({ x: startX, y: startY });
  };

  useEffect(() => {
    if (!imageUri) return;

    // Prefer the size the picker already gave us — Image.getSize()
    // can silently fail on content:// URIs on Android.
    if (imageSize?.w && imageSize?.h) {
      setupFromSize(imageSize.w, imageSize.h);
      return;
    }

    Image.getSize(
      imageUri,
      (w, h) => setupFromSize(w, h),
      (err) => {
        console.warn("Image.getSize failed, falling back to square", err);
        setupFromSize(CROP_SIZE, CROP_SIZE); // safe fallback — no wild zoom
      },
    );
  }, [imageUri, imageSize]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        const { minX, minY } = boundsRef.current;
        let nextX = panOffset.current.x + gesture.dx;
        let nextY = panOffset.current.y + gesture.dy;
        nextX = Math.min(0, Math.max(minX, nextX));
        nextY = Math.min(0, Math.max(minY, nextY));
        pan.setValue({ x: nextX, y: nextY });
      },
      onPanResponderRelease: (_, gesture) => {
        const { minX, minY } = boundsRef.current;
        let nextX = panOffset.current.x + gesture.dx;
        let nextY = panOffset.current.y + gesture.dy;
        nextX = Math.min(0, Math.max(minX, nextX));
        nextY = Math.min(0, Math.max(minY, nextY));
        panOffset.current = { x: nextX, y: nextY };
        pan.setValue({ x: nextX, y: nextY });
      },
    }),
  ).current;

 const handleDone = async () => {
  if (!imageUri) return;
  setProcessing(true);
  try {
    const scale = displaySize.w / natural.w;
    const cropX = Math.round(Math.max(0, -panOffset.current.x / scale));
    const cropY = Math.round(Math.max(0, -panOffset.current.y / scale));
    const cropSizeOriginal = Math.round(CROP_SIZE / scale);

    const finalWidth = Math.min(cropSizeOriginal, natural.w - cropX);
    const finalHeight = Math.min(cropSizeOriginal, natural.h - cropY);
    const finalSize = Math.min(finalWidth, finalHeight); // force a perfect square

    const result = await ImageManipulator.manipulateAsync(
      imageUri,
      [
        {
          crop: {
            originX: cropX,
            originY: cropY,
            width: finalSize,
            height: finalSize,
          },
        },
        { resize: { width: 500, height: 500 } },
      ],
      { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG },
    );
    onDone(result.uri);
  } catch (e) {
    console.error("Crop failed", e);
  } finally {
    setProcessing(false);
  }
};

  if (!imageUri) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <Text style={styles.title}>Move to reposition</Text>

        <View style={styles.cropFrame}>
          <Animated.View
            {...panResponder.panHandlers}
            style={{
              width: displaySize.w,
              height: displaySize.h,
              transform: [{ translateX: pan.x }, { translateY: pan.y }],
            }}
          >
            <Image
              source={{ uri: imageUri }}
              style={{ width: displaySize.w, height: displaySize.h }}
            />
          </Animated.View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.btn, styles.cancelBtn]}
            onPress={onCancel}
            disabled={processing}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.doneBtn]}
            onPress={handleDone}
            disabled={processing}
          >
            <Text style={styles.doneText}>
              {processing ? "Processing..." : "Done"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
    alignItems: "center",
  },
  title: { color: "#fff", fontSize: 14, fontWeight: "600", marginBottom: 20 },
  cropFrame: {
    width: CROP_SIZE,
    height: CROP_SIZE,
    borderRadius: CROP_SIZE / 2,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#fff",
  },
  actions: {
    flexDirection: "row",
    gap: 14,
    marginTop: 32,
  },
  btn: {
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 14,
  },
  cancelBtn: { backgroundColor: "rgba(255,255,255,0.12)" },
  doneBtn: { backgroundColor: Colors.primary },
  cancelText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  doneText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});