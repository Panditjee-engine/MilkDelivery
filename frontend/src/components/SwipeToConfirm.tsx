import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
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
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: () => !disabled,

      // 🔥 THIS IS THE KEY FIX
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,

      onPanResponderMove: (_, g) => {
        if (g.dx >= 0 && g.dx <= MAX_TRANSLATE) {
          translateX.setValue(g.dx);
        }
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx > MAX_TRANSLATE * 0.85) {
          Animated.timing(translateX, {
            toValue: MAX_TRANSLATE,
            duration: 150,
            useNativeDriver: false,
          }).start(() => {
            onSwipeSuccess();
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
      <View style={styles.container}>
        <Animated.View
          style={[
            styles.fill,
            {
              width: fillWidth,
              backgroundColor: fillColor,
            },
          ]}
        />

        <Text style={styles.text}>{text}</Text>

        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.thumb,
            {
              transform: [{ translateX }],
            },
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
});
