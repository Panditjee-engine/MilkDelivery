import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";

const DEVICE_ID_KEY = "GAUSATVA_DEVICE_ID";
const AUTH_PLATFORM = "fcm";

export async function getDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;

  const generated = `${Platform.OS}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 12)}`;
  await AsyncStorage.setItem(DEVICE_ID_KEY, generated);
  return generated;
}

async function getExpoPushToken(fallbackToken: string): Promise<string> {
  try {
    const Notifications = require("expo-notifications");
    const current = await Notifications.getPermissionsAsync();
    let status = current?.status;

    if (status !== "granted") {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested?.status;
    }

    if (status !== "granted") return fallbackToken;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ||
      (Constants as any).easConfig?.projectId;
    const tokenResult = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );

    return tokenResult?.data || fallbackToken;
  } catch {
    return fallbackToken;
  }
}

export async function getAuthDevicePayload() {
  const deviceId = await getDeviceId();
  const deviceToken = await getExpoPushToken(deviceId);

  return {
    device_type: Platform.OS,
    device_token: deviceToken,
    platform: AUTH_PLATFORM,
  };
}
