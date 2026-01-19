import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { AuthProvider } from '../src/contexts/AuthContext';
import { Colors } from '../src/constants/colors';

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      const seen = await AsyncStorage.getItem('onboardingSeen');

      if (seen) {
        router.replace('/(auth)/login');
      } else {
        router.replace('/(auth)/onboarding');
      }
    };

    init();
  }, []);

  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
        }}
      />
    </AuthProvider>
  );
}
