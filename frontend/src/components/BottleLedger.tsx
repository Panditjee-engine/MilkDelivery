import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';

export default function BottleLedger() {
  const [data, setData] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setBusy(true); setError('');
    try { setData(await api.getBottleLedger()); }
    catch { setError('Could not load bottle history. Please retry.'); }
    finally { setBusy(false); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  return <View style={{ padding: 12, marginVertical: 12, borderRadius: 8, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E9DED4' }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)} style={{ flex: 1, flexDirection: 'row', gap: 8, paddingVertical: 10 }}>
        <Ionicons name="water-outline" size={20} color="#BB6B3F" /><Text style={{ fontWeight: '700', color: '#3D1F0A' }}>Bottle Ledger</Text><Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color="#BB6B3F" />
      </TouchableOpacity>
      <TouchableOpacity accessibilityLabel="Refresh bottle ledger" disabled={busy} onPress={() => void load()} style={{ padding: 10 }}>{busy ? <ActivityIndicator /> : <Ionicons name="refresh" size={20} color="#BB6B3F" />}</TouchableOpacity>
    </View>
    {error ? <Text style={{ color: '#B42318' }}>{error}</Text> : null}
    {data && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>{['delivered', 'collected', 'damaged', 'remaining'].map(key => <View key={key}><Text style={{ color: '#756052', fontSize: 11, textTransform: 'capitalize' }}>{key}</Text><Text style={{ fontWeight: '800', color: key === 'remaining' ? '#B42318' : '#3D1F0A' }}>{data.totals[key]}</Text></View>)}</View>}
    {open && data && <>
      {(data.truncated || data.metadata_review_count > 0) && <Text style={{ color: '#B42318', marginTop: 8 }}>Latest 500 deliveries only. {data.metadata_review_count} entries need bottle metadata review.</Text>}
      {!data.rows.length && <Text style={{ paddingVertical: 12 }}>No delivered bottles yet.</Text>}
      {data.rows.map((row: any) => <View key={row.order_id} style={{ borderTopWidth: 1, borderTopColor: '#E9DED4', paddingVertical: 12, marginTop: 8, gap: 4 }}>
        <Text style={{ fontWeight: '700' }}>{row.customer_name || 'Milk delivery'} · {String(row.date || '').slice(0, 10)}</Text>
        <Text>500 ml: {row.packs['500ml']} · 1 L: {row.packs['1L']}</Text>
        <Text>Collected {row.collected} · Damaged {row.damaged} · Remaining {row.remaining}</Text>
        {row.damage_status && <Text style={{ color: '#B42318' }}>Report: {row.damage_status.replace(/_/g, ' ')}</Text>}
        {row.history.map((event: any, index: number) => <Text key={index} style={{ color: '#756052', fontSize: 12 }}>{String(event.at || '').slice(0, 10)} · {event.action?.replace(/_/g, ' ')}{event.quantity ? ` · ${event.quantity} bottles` : ''}{event.note ? ` · ${event.note}` : ''}</Text>)}
      </View>)}
    </>}
  </View>;
}
