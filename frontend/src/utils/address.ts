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
  if (typeof address === "string") return clean(address).length > 0;
  if (clean(address.full_address)) return true;

  const hasHome = Boolean(clean(address.flat) || clean((address as any).house) || clean((address as any).house_no));
  const hasArea = Boolean(clean(address.tower) || clean(address.area));
  const hasCity = Boolean(clean(address.city));
  const hasPin = Boolean(clean(address.pincode) || clean((address as any).pin_code) || clean((address as any).zip));
  return hasHome && hasArea && hasCity && hasPin;
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
