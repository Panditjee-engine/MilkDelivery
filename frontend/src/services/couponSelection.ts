import { useSyncExternalStore } from 'react';
type Selection = {coupon_code: string; coupon_request_id: string};
const selections = new Map<string, Selection>();
const drafts = new Map<string, any[]>();
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export function couponKey(user: string, items: any[], scope = 'cart') {
  return `${user}:${scope}:${JSON.stringify(items.map(i => [i.product_id,i.quantity]).sort())}`;
}
export function setCouponDraft(key: string, items: any[]) { drafts.set(key, items); }
export function getCouponDraft(key: string) { return drafts.get(key); }
export function selectCoupon(key: string, code?: string) {
  if (code) selections.set(key, {coupon_code: code, coupon_request_id: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {const n = Math.floor(Math.random()*16); return (c === 'x' ? n : (n&3)|8).toString(16);})});
  else selections.delete(key);
  listeners.forEach(listener => listener());
}
export function useCouponSelection(key: string) { return useSyncExternalStore(subscribe, () => selections.get(key), () => undefined); }
