export type DeliveryWindowRule = {
  id?: string;
  product_id?: string | null;
  product_name?: string | null;
  start_time?: string;
  end_time?: string;
  is_active?: boolean;
};

export function getDeliveryWindowProductId(product: any): string {
  return String(product?.id || product?._id || product?.product_id || "");
}

export function getDeliveryWindowForProduct(
  product: any,
  windows?: DeliveryWindowRule[] | null,
): DeliveryWindowRule | null {
  if (Array.isArray(windows)) {
    const productId = getDeliveryWindowProductId(product);
    const activeWindows = windows.filter((item) => item?.is_active !== false);
    const productWindow = activeWindows.find(
      (item) => item.product_id && String(item.product_id) === productId,
    );
    return productWindow || activeWindows.find((item) => !item.product_id) || null;
  }
  return product?.delivery_window && product.delivery_window.is_active !== false
    ? product.delivery_window
    : null;
}

export function formatDeliveryClock(value?: string): string {
  if (!value) return "";
  const [hourRaw, minuteRaw] = String(value).split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return value;
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

export function formatDeliveryWindowTime(rule?: DeliveryWindowRule | null): string {
  if (!rule) return "";
  const start = formatDeliveryClock(rule.start_time);
  const end = formatDeliveryClock(rule.end_time);
  if (start && end) return `${start} - ${end}`;
  return start || end || "";
}

export function getDeliveryPromiseDay(): string {
  return "Tomorrow";
}

export function getDeliveryWindowBadgeText(rule?: DeliveryWindowRule | null): string {
  const time = formatDeliveryWindowTime(rule);
  if (!time) return "";
  return `Delivery ${getDeliveryPromiseDay()} · ${time}`;
}

export function getDeliveryWindowDetailText(rule?: DeliveryWindowRule | null): string {
  const time = formatDeliveryWindowTime(rule);
  if (!time) return "Delivery time will be confirmed after order placement.";
  return `Expected delivery ${getDeliveryPromiseDay().toLowerCase()} between ${time}.`;
}
