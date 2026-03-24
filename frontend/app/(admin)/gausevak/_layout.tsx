import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function GausevakLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}