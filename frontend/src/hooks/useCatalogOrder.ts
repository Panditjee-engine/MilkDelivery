import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { api } from '../services/api';

export const buyableProduct = (product: any) => product.is_active !== false && product.is_available !== false;

export function orderedSections<T>(rows: T[], order: string[], key: (row: T) => string): T[] {
  const rank = new Map(order.map((value, index) => [value, index]));
  return [...rows].sort((a, b) => (rank.get(key(a)) ?? order.length) - (rank.get(key(b)) ?? order.length));
}

export function useCatalogOrder(adminId?: string | null) {
  const focused = useIsFocused();
  const [state, setState] = useState<{adminId?: string | null; order: string[]}>({order: []});
  useEffect(() => {
    if (!focused) return;
    let active = true;
    let pending = false;
    const refresh = async () => {
      if (pending || (AppState.currentState && AppState.currentState !== 'active')) return;
      pending = true;
      try {
        const data = await api['request']<{order: string[]}>(`/catalog/layout${adminId ? `?admin_id=${encodeURIComponent(adminId)}` : ''}`, {headers: {'Cache-Control': 'no-cache'}});
        if (active) {
          const order = Array.isArray(data.order) ? data.order : [];
          setState(previous => previous.adminId === adminId && JSON.stringify(previous.order) === JSON.stringify(order) ? previous : {adminId, order});
        }
      } catch { /* Keep the last known order during connection failures. */ }
      finally { pending = false; }
    };
    void refresh();
    const timer = setInterval(() => void refresh(), 3000);
    const listener = AppState.addEventListener('change', status => { if (status === 'active') void refresh(); });
    return () => { active = false; clearInterval(timer); listener.remove(); };
  }, [adminId, focused]);
  return state.adminId === adminId ? state.order : [];
}
