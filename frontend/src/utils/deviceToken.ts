import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

const NH_REG_ID_KEY = "GAUSATVA_NH_REG_ID";

// ── Get real FCM / APNs device token ─────────────────────────────────────────

export async function getAuthDevicePayload(): Promise<Record<string, string | null>> {
  try {
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

    // Send stored NH registration ID if available (so Azure updates instead of creating duplicate)
    const nhRegId = await AsyncStorage.getItem(NH_REG_ID_KEY);

    return {
      device_token: deviceToken,
      platform: Platform.OS === "ios" ? "apns" : "fcm",
      nh_registration_id: nhRegId || null,
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