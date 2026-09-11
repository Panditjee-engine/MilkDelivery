function reasonText(value: unknown, depth = 0): string {
  if (depth > 5 || value == null) return "";
  if (Array.isArray(value)) return value.map(item => reasonText(item, depth + 1)).join(" ");
  if (typeof value === "object") {
    const data = value as Record<string, unknown>;
    return ["reason", "description", "message", "detail", "error", "code"]
      .map(key => reasonText(data[key], depth + 1)).join(" ");
  }
  if (typeof value !== "string") return "";
  const text = value.trim().slice(0, 4000);
  try { return reasonText(JSON.parse(text), depth + 1); } catch { return text; }
}

export function paymentFailureMessage(reason: unknown): string {
  const text = reasonText(reason).toLowerCase().replace(/[_-]/g, " ");
  if (/cancel|dismiss|closed by|payment closed/.test(text)) return "The payment was cancelled before it was completed.";
  if (/insufficient|not enough|low balance/.test(text)) return "There are insufficient funds in the selected payment account. Please choose another payment method.";
  if (/verification|signature|verify/.test(text)) return "We could not confirm the payment status. Please check your wallet and payment history before trying again.";
  if (/timeout|timed out|network|connection/.test(text)) return "The payment status could not be confirmed because of a connection problem. Please check your payment history before trying again.";
  if (/otp|authentication/.test(text)) return "Payment authentication could not be completed. Please check your bank details and try again.";
  if (/declin|reject/.test(text)) return "Your bank or payment provider declined the payment. Please contact your bank or choose another payment method.";
  if (/expired/.test(text)) return "The payment session has expired. Please start a new payment after checking your payment history.";
  if (/limit/.test(text)) return "This payment exceeds the limit allowed by your payment provider. Please try a smaller amount or another payment method.";
  return "We could not complete your payment. Please check your wallet and payment history before trying again.";
}

export function safePaymentId(value: unknown): string | null {
  const id = Array.isArray(value) ? value[0] : value;
  return typeof id === "string" && /^[A-Za-z0-9_-]{1,100}$/.test(id) ? id : null;
}
