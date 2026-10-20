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
      `₹${amount.toFixed(2)} is reserved in your wallet for milk bottles. This is one deposit for your account, not a charge per bottle. It cannot be spent and is released when no pending milk deliveries or outstanding bottles remain. Confirmed loss or damage uses this deposit; a replacement ₹50 is reserved when funds are available.`,
      [{ text: "Got it" }],
    );
    await AsyncStorage.setItem("bottle-deposit-notice", id);
  } catch {
    shown.delete(id);
  }
}
