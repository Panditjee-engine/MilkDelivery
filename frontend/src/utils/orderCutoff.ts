export type OrderCutoffRule = {
  id?: string;
  product_id?: string | null;
  product_name?: string | null;
  cutoff_time?: string;
  start_time?: string;
  end_time?: string;
  schedule_type?: "daily" | "weekly" | "custom" | string;
  days?: number[];
  is_active?: boolean;
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function getOrderCutoffProductId(product: any): string {
  return String(product?.id || product?._id || product?.product_id || "");
}

export function getOrderCutoffForProduct(
  product: any,
  rules: OrderCutoffRule[] = [],
): OrderCutoffRule | null {
  if (product?.order_cutoff && product.order_cutoff.is_active !== false) {
    return product.order_cutoff;
  }
  const productId = getOrderCutoffProductId(product);
  const activeRules = rules.filter((rule) => rule?.is_active !== false);
  const productRule = activeRules.find(
    (rule) => rule.product_id && String(rule.product_id) === productId,
  );
  return productRule || activeRules.find((rule) => !rule.product_id) || null;
}

export function isOrderCutoffPassed(rule?: OrderCutoffRule | null): boolean {
  if (!rule) return false;
  if (!doesCutoffScheduleApplyToday(rule)) return false;
  const startValue = rule.start_time || rule.cutoff_time || rule.end_time;
  const endValue = rule.end_time || rule.cutoff_time || rule.start_time;
  if (!startValue || !endValue) return false;
  const [startHour, startMinute] = String(startValue).split(":").map(Number);
  const [endHour, endMinute] = String(endValue).split(":").map(Number);
  if (
    !Number.isFinite(startHour) ||
    !Number.isFinite(startMinute) ||
    !Number.isFinite(endHour) ||
    !Number.isFinite(endMinute)
  ) {
    return false;
  }
  const now = new Date();
  const current = now.getHours() * 60 + now.getMinutes();
  const start = startHour * 60 + startMinute;
  const end = endHour * 60 + endMinute;
  if (start <= end) return current >= start && current <= end;
  return current >= start || current <= end;
}

export function doesCutoffScheduleApplyToday(rule?: OrderCutoffRule | null): boolean {
  if (!rule) return false;
  const schedule = rule.schedule_type || "daily";
  if (schedule === "daily") return true;
  const today = (new Date().getDay() + 6) % 7;
  return Array.isArray(rule.days) && rule.days.includes(today);
}

export function formatOrderCutoffClock(value?: string): string {
  if (!value) return "";
  const [hourRaw, minuteRaw] = String(value).split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return value;
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

export function formatOrderCutoffTime(rule?: OrderCutoffRule | null): string {
  if (!rule) return "";
  const start = formatOrderCutoffClock(rule.start_time || rule.cutoff_time);
  const end = formatOrderCutoffClock(rule.end_time || rule.cutoff_time);
  if (!start && !end) return "";
  if (start === end || !start) return end;
  if (!end) return start;
  return `${start} - ${end}`;
}

export function formatOrderCutoffSchedule(rule?: OrderCutoffRule | null): string {
  if (!rule) return "";
  const schedule = rule.schedule_type || "daily";
  if (schedule === "daily") return "Daily";
  const days = (rule.days || []).map((day) => DAY_LABELS[day]).filter(Boolean);
  if (!days.length) return schedule === "weekly" ? "Weekly" : "Custom";
  return `${schedule === "weekly" ? "Weekly" : "Custom"}: ${days.join(", ")}`;
}

export function getOrderCutoffBadgeText(rule?: OrderCutoffRule | null): string {
  if (!rule) return "";
  const time = formatOrderCutoffTime(rule);
  if (!time) return "";
  const schedule = formatOrderCutoffSchedule(rule);
  return isOrderCutoffPassed(rule)
    ? `Cut-off active ${time}`
    : `Cut-off ${time}${schedule ? ` · ${schedule}` : ""}`;
}

export function getOrderCutoffBlockedMessage(product: any, rule: OrderCutoffRule): string {
  const time = formatOrderCutoffTime(rule);
  const schedule = formatOrderCutoffSchedule(rule);
  const productName = product?.name || rule.product_name || "this product";
  return `Order cut-off for ${productName} is active from ${time}${schedule ? ` (${schedule})` : ""}. Please place your order outside this cut-off window.`;
}
