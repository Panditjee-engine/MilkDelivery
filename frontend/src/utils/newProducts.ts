const NEW_PRODUCT_WINDOW = 15 * 24 * 60 * 60 * 1000;

export function productCreatedTime(product: { created_at?: string }): number {
  const value = product.created_at;
  if (!value) return NaN;
  // The API's legacy naive timestamps are UTC, not the device's local time.
  const timestamp = /T| /.test(value) && !/(Z|[+-]\d{2}:?\d{2})$/i.test(value)
    ? `${value.replace(" ", "T")}Z` : value;
  return Date.parse(timestamp);
}

export function isNewProduct(product: { created_at?: string }, now = Date.now()): boolean {
  const age = now - productCreatedTime(product);
  return Number.isFinite(age) && age >= 0 && age < NEW_PRODUCT_WINDOW;
}

export function newlyAddedProducts<T extends { created_at?: string }>(products: T[], now = Date.now()): T[] {
  return products.filter(product => isNewProduct(product, now))
    .sort((a, b) => productCreatedTime(b) - productCreatedTime(a));
}
