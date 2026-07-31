export type DeliveryAddress = {
  label?: "home" | "work" | "other" | string;
  is_default?: boolean;
  tower?: string;
  flat?: string;
  floor?: string;
  area?: string;
  city?: string;
  pincode?: string;
  landmark?: string;
  full_address?: string;
};

const clean = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

export function hasCompleteDeliveryAddress(address?: DeliveryAddress | string | null) {
  if (!address) return false;

  if (typeof address === "string") {
    return clean(address).length > 0;
  }

  // If full address is entered, it's valid
  if (clean(address.full_address)) {
    return true;
  }

  const hasArea = Boolean(clean(address.area));
  const hasCity = Boolean(clean(address.city));
  const hasPin = Boolean(clean(address.pincode));

  return hasArea && hasCity && hasPin;
}

export function formatDeliveryAddress(address?: DeliveryAddress | string | null) {
  if (!address) return "";
  if (typeof address === "string") return clean(address);
  return [
    address.flat,
    address.floor ? `Floor ${address.floor}` : "",
    address.tower,
    address.area,
    address.city,
    address.pincode,
    address.landmark ? `Near ${address.landmark}` : "",
  ]
    .map(clean)
    .filter(Boolean)
    .join(", ");
}
