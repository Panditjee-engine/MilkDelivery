import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export function useLoyaltyQuote(items: {product_id: string; quantity: number; price: number; amount: number}[], enabled = true) {
  const { user } = useAuth();
  const serialized = JSON.stringify(items);
  const key = `${user?.id || ''}:${serialized}`;
  const [state, setState] = useState<{key: string; data?: any; error?: string}>({key: ''});
  useEffect(() => {
    if (!enabled || !items.length || !user?.id) return;
    let active = true;
    let fetching = false;
    const refresh = async () => {
      if (!active || fetching || (AppState.currentState && AppState.currentState !== 'active')) return;
      fetching = true;
      try {
        const data = await api['request']<any>('/subscriptions/quote', {method:'POST', body: JSON.stringify({items: JSON.parse(serialized), pattern:'buy_once', start_date: new Date().toISOString().slice(0,10), delivery_slot:'morning'})});
        if (active) setState({key, data});
      } catch (error: any) {
        if (active) setState({key, error: error.message || 'Could not calculate total'});
      } finally {
        fetching = false;
      }
    };
    const timer = setTimeout(() => void refresh(), 200);
    const interval = setInterval(() => void refresh(), 15000);
    const subscription = AppState.addEventListener('change', status => {
      if (status === 'active') void refresh();
    });
    return () => {
      active = false;
      clearTimeout(timer);
      clearInterval(interval);
      subscription.remove();
    };
  }, [key, serialized, enabled, user?.id]);
  return { data: state.key === key ? state.data : undefined, error: state.key === key ? state.error : undefined, ready: state.key === key && !!state.data };
}
