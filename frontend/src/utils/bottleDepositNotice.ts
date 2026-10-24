import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";

const shown = new Set<string>();

export async function notifyBottleDeposit(wallet: {
  bottle_deposit_held?: number;
  bottle_deposit_event_id?: string;
}) {
  const id = wallet.bottle_deposit_event_id;
  const amount = Number(wallet.bottle_deposit_held || 0);
  if (!id || amount <= 0 || shown.has(id)) return;
  shown.add(id);
  try {
    if ((await AsyncStorage.getItem("bottle-deposit-notice")) === id) return;
    Alert.alert(
      "Bottle security deposit",
      `₹${amount.toFixed(2)} is reserved because an earlier milk bottle was still outstanding when a later day's delivery was completed. This is one account-level hold, not a charge per bottle. Loss or damage is charged only after admin review and your acceptance. After a charge, a new ₹50 hold starts on a later day's milk delivery.`,
      [{ text: "Got it" }],
    );
    await AsyncStorage.setItem("bottle-deposit-notice", id);
  } catch {
    shown.delete(id);
  }
}
