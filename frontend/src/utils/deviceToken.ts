import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";

const NH_REG_ID_KEY = "GAUSATVA_NH_REG_ID";

// ── Get real FCM / APNs device token ─────────────────────────────────────────

export async function getAuthDevicePayload(): Promise<Record<string, string>> {
  try {
    if (Constants.appOwnership === "expo") {
      console.warn(
        "Native push token is not available in Expo Go. Use a development build or production build.",
      );
      return {};
    }

    const Notifications = require("expo-notifications");

    // Request permission first
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") {
      console.warn("⚠️ Notification permission not granted");
      return {};
    }

    // ✅ getDevicePushTokenAsync returns the REAL FCM token (not Expo token)
    const tokenResult = await Notifications.getDevicePushTokenAsync();
    const deviceToken: string = tokenResult.data;

    console.log("✅ Real FCM Token:", deviceToken);

    return {
      device_token: deviceToken,
      platform: Platform.OS === "ios" ? "apns" : "fcm",
    };

  } catch (error) {
    console.error("❌ Failed to get device token:", error);
    return {};
  }
}

// ── Save NH registration ID returned from backend after login ─────────────────

export async function saveNhRegistrationId(nhRegId: string | null): Promise<void> {
  if (nhRegId) {
    await AsyncStorage.setItem(NH_REG_ID_KEY, nhRegId);
    console.log("✅ NH Registration ID saved:", nhRegId);
  }
}

// ── Clear NH registration ID on logout ────────────────────────────────────────

export async function clearNhRegistrationId(): Promise<void> {
  await AsyncStorage.removeItem(NH_REG_ID_KEY);
}
