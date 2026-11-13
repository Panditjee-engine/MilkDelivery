type DiscountItem = {
  discount_percent?: number;
  discount_amount?: number;
  original_price?: number;
  quantity?: number;
};

export function loyaltyRateLabel(percent?: number, items: DiscountItem[] = []): string {
  const rates = [...new Set(items.map(item => item.discount_percent).filter(
    (rate): rate is number => typeof rate === 'number' && Number.isFinite(rate) && rate > 0,
  ))];
  if (rates.length) return ` (${rates.map(rate => `${rate}%`).join(', ')})`;
  if (typeof percent === 'number' && Number.isFinite(percent) && percent > 0) return ` (${percent}%)`;
  // Older orders store rounded savings but not the original percentage.
  const discounted = items.filter(item => (item.discount_amount ?? 0) > 0);
  const base = discounted.reduce((sum, item) => sum + (item.original_price ?? 0) * (item.quantity ?? 0), 0);
  const savings = discounted.reduce((sum, item) => sum + (item.discount_amount ?? 0), 0);
  return base > 0 ? ` (~${Number((savings / base * 100).toFixed(2))}%)` : '';
}
