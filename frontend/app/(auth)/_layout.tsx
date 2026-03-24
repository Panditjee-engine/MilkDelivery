import React from 'react';
import { Stack } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
      }}
    />
  );
}
