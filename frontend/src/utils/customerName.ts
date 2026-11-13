import { Alert } from "react-native";

export function hasCustomerName(name: unknown): boolean {
  return typeof name === "string" && !!name.trim() && name.trim().toLowerCase() !== "customer";
}

export function requireCustomerName(name: unknown, openProfile: () => void): boolean {
  if (hasCustomerName(name)) return true;
  Alert.alert(
    "Please add your name",
    "Enter your name in Edit Profile before placing an order or starting a subscription.",
    [{ text: "Not now", style: "cancel" }, { text: "Update name", onPress: openProfile }],
  );
  return false;
}
