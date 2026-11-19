export function couponExpired(coupon: {valid_until?: string; expired?: boolean}, now = Date.now()) {
  const end = Date.parse(coupon.valid_until || '');
  return coupon.expired === true || !Number.isFinite(end) || end <= now;
}

export function sortedCoupons<T extends {id: string; valid_until?: string; expired?: boolean}>(rows: T[], now: number): T[] {
  return [...rows].sort((a, b) => {
    const expiredA = couponExpired(a, now), expiredB = couponExpired(b, now);
    if (expiredA !== expiredB) return expiredA ? 1 : -1;
    const endA = Date.parse(a.valid_until || '') || 0, endB = Date.parse(b.valid_until || '') || 0;
    return (expiredA ? endB - endA : endA - endB) || a.id.localeCompare(b.id);
  });
}
