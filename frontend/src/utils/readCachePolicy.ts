/** Session-only list caching. Money, authentication and live checks stay fresh. */
export function readCacheTtl(endpoint: string): number {
  const path = endpoint.split("?")[0];
  if (/(wallet|payment|razorpay|recharge|settlement|withdraw|auth|otp|password|token|download|export|debug|notification|version|search-history)/i.test(path)) return 0;
  if (/(order-cutoffs|delivery-windows|app-settings)/.test(path)) return 0;
  if (/^\/(orders|subscriptions|delivery)(\/|$)/.test(path) || /^\/admin\/(orders|customers|users)(\/|$)/.test(path)) return 10000;
  if (/^\/(catalog|products|categories|gausevak|worker|vet|admin|content|notes|expenses|farm-sales|feed-stocks)(\/|$)/.test(path)) {
    if (/(status|balance|points|today|available|shift)/.test(path)) return 5000;
    return 30000;
  }
  return 0;
}
