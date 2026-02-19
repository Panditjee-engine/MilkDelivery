import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Animated, PanResponder, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const WIDTH = Dimensions.get('window').width - 80;
const HEIGHT = 52;
const THUMB_SIZE = 44;
const MAX_TRANSLATE = WIDTH - THUMB_SIZE - 4;

type Props = {
  text?: string;
  disabled?: boolean;
  onSwipeSuccess: () => void;
};

export default function SwipeToConfirm({
  text = 'Swipe → Confirm',
  disabled = false,
  onSwipeSuccess,
}: Props) {
  const translateX = useRef(new Animated.Value(0)).current;

  // ✅ Keep refs in sync with latest props so the stale closure is never an issue
  const disabledRef = useRef(disabled);
  const onSwipeSuccessRef = useRef(onSwipeSuccess);

  useEffect(() => { disabledRef.current = disabled; }, [disabled]);
  useEffect(() => { onSwipeSuccessRef.current = onSwipeSuccess; }, [onSwipeSuccess]);

  const fillWidth = translateX.interpolate({
    inputRange: [0, MAX_TRANSLATE],
    outputRange: [THUMB_SIZE, WIDTH],
    extrapolate: 'clamp',
  });

  const fillColor = translateX.interpolate({
    inputRange: [0, MAX_TRANSLATE],
    outputRange: ['#e5e7eb', '#22c55e'],
  });

  const panResponder = useRef(
    PanResponder.create({
      // ✅ Read from ref, not the stale closure
      onStartShouldSetPanResponder: () => !disabledRef.current,
      onMoveShouldSetPanResponder: () => !disabledRef.current,
      onStartShouldSetPanResponderCapture: () => !disabledRef.current,
      onMoveShouldSetPanResponderCapture: () => !disabledRef.current,
      onPanResponderTerminationRequest: () => false,

      onPanResponderMove: (_, g) => {
        if (disabledRef.current) return;
        if (g.dx >= 0 && g.dx <= MAX_TRANSLATE) {
          translateX.setValue(g.dx);
        }
      },

      onPanResponderRelease: (_, g) => {
        if (disabledRef.current) return;
        if (g.dx > MAX_TRANSLATE * 0.85) {
          Animated.timing(translateX, {
            toValue: MAX_TRANSLATE,
            duration: 150,
            useNativeDriver: false,
          }).start(() => {
            // ✅ Always calls the latest version of the callback
            onSwipeSuccessRef.current();
            Animated.timing(translateX, {
              toValue: 0,
              duration: 300,
              useNativeDriver: false,
            }).start();
          });
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  return (
    <View style={styles.wrapper}>
      {/* ✅ Visual dimming when disabled */}
      <View style={[styles.container, disabled && styles.containerDisabled]}>
        <Animated.View style={[styles.fill, { width: fillWidth, backgroundColor: fillColor }]} />

        <Text style={[styles.text, disabled && styles.textDisabled]}>{text}</Text>

        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.thumb,
            { transform: [{ translateX }] },
            disabled && styles.thumbDisabled,
          ]}
        >
          <Ionicons name="chevron-forward" size={24} color="#fff" />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  container: {
    width: WIDTH,
    height: HEIGHT,
    borderRadius: HEIGHT / 2,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  containerDisabled: {
    opacity: 0.5,
  },
  fill: {
    position: 'absolute',
    height: '100%',
    left: 0,
    borderRadius: HEIGHT / 2,
  },
  text: {
    alignSelf: 'center',
    fontWeight: '600',
    color: '#374151',
  },
  textDisabled: {
    color: '#9ca3af',
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#16a34a',
    justifyContent: 'center',
    alignItems: 'center',
    left: 4,
    elevation: 3,
  },
  thumbDisabled: {
    backgroundColor: '#9ca3af',
  },
});