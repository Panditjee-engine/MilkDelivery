import React, { useCallback, useRef, useState, useMemo, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, ScrollView, Alert, Platform } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/services/api';
import { Colors } from '../../src/constants/colors';

function savedAddress(value: any): string {
  if (typeof value === 'string') return value.trim();
  if (!value || typeof value !== 'object') return '';
  return [...new Set(['full_address', 'flat', 'house_number', 'tower', 'building', 'floor', 'address_line1', 'address_line2', 'street', 'area', 'landmark', 'city', 'state', 'pincode', 'postal_code']
    .map(key => value[key])
    .filter(part => typeof part === 'string' || typeof part === 'number')
    .map(part => String(part).trim()).filter(Boolean))].join(', ');
}

export default function FarmOrders() {
  const router = useRouter();
  const [kind, setKind] = useState<'orders' | 'subscriptions'>('orders');
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const generation = useRef(0);
  const busy = useRef(false);
  const actionBusy = useRef(false);
  const [acting, setActing] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [status, setStatus] = useState('pending');
  const [dateMode, setDateMode] = useState('today');
  const [customer, setCustomer] = useState('all');
  const [product, setProduct] = useState('all');
  const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const [from, setFrom] = useState(dateKey(new Date()));
  const [to, setTo] = useState(dateKey(new Date()));
  const [picker, setPicker] = useState<'from' | 'to' | null>(null);
  const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS !== 'ios') setPicker(null);
    if (!picker || !date || event.type === 'dismissed') return;
    const key = dateKey(date);
    if (picker === 'from') {
      setFrom(key);
      if (key > to) setTo(key);
    } else {
      setTo(key);
      if (key < from) setFrom(key);
    }
  };
  const customers = useMemo(() => [...new Map(rows.map(row => [row.user_id, row.customer_name])).entries()], [rows]);
  const products = useMemo(() => [...new Map(rows.flatMap(row => (row.items || []).map((item: any) => [item.product_id, item.product_name || item.name || item.product_id])) as [string,string][]).entries()], [rows]);
  const filtered = useMemo(() => rows.filter(row => {
    const state = String(row.status || 'pending').toLowerCase();
    const expired = kind === 'subscriptions' && row.end_date && String(row.end_date).slice(0,10) < dateKey(new Date());
    if (status === 'default' && (['cancelled','canceled','inactive','paused','skipped','expired'].includes(state) || expired)) return false;
    const deliveryState = String(row.delivery_status || state).toLowerCase();
    if (status === 'pending') {
      if (expired || ['cancelled','canceled','inactive','paused','skipped','expired'].includes(state)) return false;
      if (!['pending','unassigned','assigned','accepted','picked_up','out_for_delivery','active'].includes(deliveryState)) return false;
    } else if (status !== 'default' && status !== 'all' && (status === 'expired' ? !expired && state !== 'expired' : status === 'cancelled' ? !['cancelled','canceled'].includes(state) : state !== status && deliveryState !== status)) return false;
    if (customer !== 'all' && row.user_id !== customer) return false;
    if (product !== 'all' && !(row.items || []).some((item: any) => item.product_id === product)) return false;
    if (dateMode === 'all') return true;
    const today = dateKey(new Date());
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate()+1);
    const start = dateMode === 'today' ? today : dateMode === 'tomorrow' ? dateKey(tomorrow) : from;
    const end = dateMode === 'custom' ? to : start;
    if (kind === 'orders') return String(row.delivery_date || '').slice(0,10) >= start && String(row.delivery_date || '').slice(0,10) <= end;
    return String(row.start_date || '').slice(0,10) <= end && (!row.end_date || String(row.end_date).slice(0,10) >= start);
  }), [rows, status, customer, product, dateMode, from, to, kind]);
  const eligible = filtered.filter(row => row.can_deliver && row.action_order_id);
  useEffect(() => {
    const allowed = new Set(eligible.map(row => row.action_order_id));
    setSelected(previous => { const next = new Set([...previous].filter(id => allowed.has(id))); return next.size === previous.size ? previous : next; });
  }, [rows, status, customer, product, dateMode, from, to]);
  const load = useCallback(async (offset = 0) => {
    if (busy.current) return;
    busy.current = true;
    const version = generation.current;
    setLoading(true); setError('');
    try {
      let cursor = offset;
      let more = true;
      while (more && version === generation.current) {
        const result = await api['request']<{items: any[]; total: number}>(`/delivery/farm-records?kind=${kind}&offset=${cursor}&limit=100`, {headers: {'Cache-Control': 'no-cache'}});
        if (version !== generation.current) return;
        const first = cursor === 0;
        setRows(previous => first ? result.items : [...previous, ...result.items.filter(item => !previous.some(row => row.id === item.id))]);
        setTotal(result.total);
        cursor += result.items.length;
        more = result.items.length > 0 && cursor < result.total;
      }
    } catch (err: any) { if (version === generation.current) setError(err.message || 'Could not load records'); }
    finally { if (version === generation.current) { busy.current = false; setLoading(false); } }
  }, [kind]);
  const mark = (ids: string[]) => {
    if (!ids.length || actionBusy.current) return;
    Alert.alert('Mark Delivered', `Confirm delivery of ${ids.length} selected record(s)?`, [{text:'Cancel',style:'cancel'}, {text:'Confirm',onPress:async () => {
      if (actionBusy.current) return;
      actionBusy.current = true; setActing(true);
      try {
        const result = await api['request']<{updated:number;results:{id:string;success:boolean;error?:string}[]}>('/delivery/farm-records/mark-delivered', {method:'POST',body:JSON.stringify({order_ids:ids})});
        const failures = result.results.filter(row => !row.success);
        setSelected(new Set(failures.map(row => row.id)));
        api.refreshLists();
        await load();
        Alert.alert('Delivery result', `${result.updated} delivered. ${failures.length} failed.${failures.length ? '\n'+failures.map(row => `${row.id.slice(0,8)}: ${row.error}`).join('\n') : ''}`);
      } catch (err: any) { Alert.alert('Could not mark delivered', err.message || 'Please refresh and check delivery status before retrying.'); }
      finally { actionBusy.current = false; setActing(false); }
    }}]);
  };
  useFocusEffect(useCallback(() => {
    generation.current++; busy.current = false;
    void load();
    return () => { generation.current++; busy.current = false; };
  }, [load]));
  return <SafeAreaView style={s.screen} edges={['top']}>
    <View style={s.header}><TouchableOpacity accessibilityLabel="Back" onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={Colors.primary}/></TouchableOpacity><Text style={s.heading}>Orders & Subscriptions</Text></View>
    <View style={s.tabs}>{(['orders','subscriptions'] as const).map(tab => <TouchableOpacity disabled={acting} key={tab} style={[s.tab, kind === tab && s.active]} onPress={() => { if (kind !== tab) { setRows([]); setTotal(0); setExpanded(null); setSelected(new Set()); setStatus('pending'); setDateMode('today'); setCustomer('all'); setProduct('all'); setKind(tab); } }}><Text style={{color:kind === tab ? '#fff' : Colors.primary, fontWeight:'700'}}>{tab === 'orders' ? 'Orders' : 'Subscriptions'}</Text></TouchableOpacity>)}</View>
    <View style={s.toolbar}><Text style={[s.name,{flex:1}]}>{kind === 'orders' ? 'Orders' : 'Subscriptions'} Mark Delivered</Text><TouchableOpacity disabled={acting || !selected.size} style={[s.action,{opacity:acting || !selected.size ? .45 : 1}]} onPress={() => mark([...selected])}><Text style={s.actionText}>{acting ? 'Updating...' : `Deliver (${selected.size})`}</Text></TouchableOpacity></View>
    <View style={s.toolbar}><TouchableOpacity disabled={acting} onPress={() => setSelected(new Set(eligible.slice(0,100).map(row => row.action_order_id)))}><Text style={s.status}>Select All Today ({eligible.length})</Text></TouchableOpacity><TouchableOpacity disabled={acting} onPress={() => setSelected(new Set())}><Text style={s.detail}>Clear</Text></TouchableOpacity><TouchableOpacity accessibilityLabel="Filter records" onPress={() => setFiltersOpen(true)}><Ionicons name="filter" size={24} color={Colors.primary}/></TouchableOpacity></View>
    <View style={s.productFilterRow}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.productFilterScroll} contentContainerStyle={s.productFilterContent}>
        {[['all','All Products'],...products].map(([id,name]) => (
          <TouchableOpacity key={id} accessibilityRole="button" accessibilityState={{selected:product===id}} accessibilityLabel={name} style={[s.productChip,product===id && s.active]} onPress={() => setProduct(id)}>
            <Text numberOfLines={1} ellipsizeMode="tail" maxFontSizeMultiplier={1.3} style={[s.productChipText,{color:product===id ? '#fff' : Colors.primary}]}>{name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
    <Text style={s.count}>{filtered.length} shown · {rows.length}/{total} loaded · ₹{filtered.reduce((sum,row) => sum+Number(row.total_amount || 0),0).toFixed(2)}</Text>
    {!!error && <TouchableOpacity onPress={() => load()} style={s.card}><Text style={{color:'#B42318'}}>{error} · Retry</Text></TouchableOpacity>}
    <FlatList data={filtered} keyExtractor={item => item.id} refreshing={loading && !rows.length} onRefresh={() => load()} contentContainerStyle={{padding:16,gap:10,paddingBottom:32}}
      ListEmptyComponent={!loading && !error ? <Text style={s.count}>No records found</Text> : null}
      ListFooterComponent={loading ? <ActivityIndicator color={Colors.primary}/> : rows.length < total ? <TouchableOpacity style={s.action} onPress={() => load(rows.length)}><Text style={s.actionText}>Load More</Text></TouchableOpacity> : null}
      renderItem={({item}) => {
        const open = expanded === item.id;
        const address = savedAddress(item.address) || savedAddress(item.customer_address) || savedAddress(item.delivery_address);
        const names = (item.items || []).map((line: any) => line.product_name || line.name || line.product_id).join(', ') || item.product_name || 'Items unavailable';
        return <View style={s.card}>
          {item.can_deliver && <View style={[s.row,{justifyContent:'space-between',marginBottom:8}]}><TouchableOpacity disabled={acting} accessibilityLabel="Select delivery" accessibilityRole="checkbox" accessibilityState={{checked:selected.has(item.action_order_id)}} onPress={() => setSelected(previous => {const next=new Set(previous); next.has(item.action_order_id) ? next.delete(item.action_order_id) : next.add(item.action_order_id); return next;})}><Ionicons name={selected.has(item.action_order_id) ? 'checkbox' : 'square-outline'} size={25} color={Colors.primary}/></TouchableOpacity><TouchableOpacity disabled={acting} onPress={() => mark([item.action_order_id])}><Text style={s.status}>Mark Delivered</Text></TouchableOpacity></View>}
          <TouchableOpacity onPress={() => setExpanded(open ? null : item.id)} accessibilityState={{expanded:open}}>
            <View style={s.row}><Text style={s.name}>{item.customer_name}</Text><Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.primary}/></View>
            <Text style={s.status}>{String(item.status || 'pending').replace(/_/g,' ').toUpperCase()}</Text>
            <Text style={s.name} numberOfLines={open ? undefined : 2}>{names}</Text>
            <Text style={s.detail}>{item.delivery_date || item.start_date || '-'} · {item.delivery_slot || '-'}</Text>
          </TouchableOpacity>
          {open && <View style={{gap:8,marginTop:12}}>
            <Text style={s.detail}>{address || 'Address not available'}</Text>
            {(item.items || []).map((line: any,index: number) => <Text key={index} style={s.detail}>{line.product_name || line.name || line.product_id} · Qty {line.quantity}</Text>)}
            <Text style={s.name}>Amount: ₹{Number(item.total_amount || 0).toFixed(2)}</Text>
            <Text style={s.detail}>{item.payment_method || '-'} · {item.payment_status || 'pending'}</Text>
            <Text style={s.detail}>Rider: {item.delivery_partner_name || (item.delivery_partner_id ? 'Assigned' : 'Not assigned')}</Text>
            {!!item.action_reason && <Text style={s.readOnly}>{item.action_reason}</Text>}
            {item.can_act ? <TouchableOpacity style={s.action} onPress={() => router.push(kind === 'orders' ? '/(delivery)/deliveries' : '/(delivery)/subscriptions')}><Text style={s.actionText}>Open My Delivery Actions</Text></TouchableOpacity> : <Text style={s.readOnly}>Read only · Not assigned to you</Text>}
          </View>}
        </View>;
      }}/>
    <Modal visible={filtersOpen} transparent animationType="slide" onRequestClose={() => {setPicker(null);setFiltersOpen(false);}}><View style={s.overlay}><View style={s.sheet}>
      <View style={s.row}><Text style={[s.heading,{flex:1}]}>Filter {kind === 'orders' ? 'Orders' : 'Subscriptions'}</Text><TouchableOpacity accessibilityLabel="Close filters" onPress={() => {setPicker(null);setFiltersOpen(false);}}><Ionicons name="close" size={26}/></TouchableOpacity></View>
      <ScrollView><Text style={s.status}>Status</Text><View style={s.wrap}>{['default','all','pending','assigned','out_for_delivery','delivered','cancelled',...(kind==='subscriptions' ? ['active','inactive','paused','skipped','expired'] : [])].map(value => <TouchableOpacity key={value} style={[s.chip,status===value && s.active]} onPress={() => setStatus(value)}><Text style={{color:status===value?'white':Colors.primary}}>{value==='default'?'Active records':value.replace(/_/g,' ')}</Text></TouchableOpacity>)}</View>
      <Text style={s.status}>{kind==='subscriptions' ? 'Subscription period' : 'Delivery date'}</Text><View style={s.wrap}>{['all','today','tomorrow','custom'].map(value => <TouchableOpacity key={value} style={[s.chip,dateMode===value && s.active]} onPress={() => setDateMode(value)}><Text style={{color:dateMode===value?'white':Colors.primary}}>{value}</Text></TouchableOpacity>)}</View>
      {dateMode==='custom' && <View style={s.wrap}>{(['from','to'] as const).map(value => <TouchableOpacity key={value} style={s.chip} onPress={() => setPicker(value)}><Text>{value}: {value==='from'?from:to}</Text></TouchableOpacity>)}</View>}
      {picker && (
        <>
          <DateTimePicker
            value={new Date(`${picker === 'from' ? from : to}T12:00:00`)}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
          />
          {Platform.OS === 'ios' && (
            <TouchableOpacity onPress={() => setPicker(null)}>
              <Text style={s.status}>Done</Text>
            </TouchableOpacity>
          )}
        </>
      )}
      <Text style={s.status}>Customer</Text><View style={s.wrap}>{[['all','All Customers'],...customers].map(([id,name]) => <TouchableOpacity key={id} style={[s.chip,customer===id && s.active]} onPress={() => setCustomer(id)}><Text style={{color:customer===id?'white':Colors.primary}}>{name}</Text></TouchableOpacity>)}</View></ScrollView>
      <View style={s.toolbar}><TouchableOpacity onPress={() => {setStatus('pending');setCustomer('all');setProduct('all');setDateMode('today');}}><Text style={s.status}>Reset</Text></TouchableOpacity><TouchableOpacity style={s.action} onPress={() => {setPicker(null);setFiltersOpen(false);}}><Text style={s.actionText}>Apply Filters</Text></TouchableOpacity></View>
    </View></View></Modal>
  </SafeAreaView>;
}
const s = StyleSheet.create({
  productFilterRow:{height:56,flexShrink:0},
  productFilterScroll:{flex:1},
  productFilterContent:{paddingHorizontal:16,paddingVertical:6,gap:8,alignItems:'center'},
  productChip:{height:44,maxWidth:240,flexShrink:0,justifyContent:'center',alignItems:'center',paddingHorizontal:14,borderWidth:1,borderColor:'#EEDFD2',borderRadius:8,backgroundColor:'#fff'},
  productChipText:{fontSize:13,fontWeight:'600',lineHeight:18,includeFontPadding:false},
  toolbar:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10,paddingHorizontal:16,paddingVertical:8},chip:{borderWidth:1,borderColor:'#EEDFD2',borderRadius:8,paddingHorizontal:12,paddingVertical:8},wrap:{flexDirection:'row',flexWrap:'wrap',gap:8},overlay:{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(0,0,0,.4)'},sheet:{backgroundColor:'#FFF8F2',maxHeight:'85%',padding:18,paddingBottom:28,borderTopLeftRadius:16,borderTopRightRadius:16},
  screen:{flex:1,backgroundColor:'#FFF8F2'},header:{flexDirection:'row',alignItems:'center',gap:12,padding:16},heading:{fontSize:19,fontWeight:'800',flex:1,color:Colors.primary},
  tabs:{flexDirection:'row',gap:8,paddingHorizontal:16},tab:{flex:1,alignItems:'center',padding:12,borderRadius:8,borderWidth:1,borderColor:Colors.primary},active:{backgroundColor:Colors.primary},
  count:{padding:16,color:'#756052',fontSize:12},card:{backgroundColor:'#fff',borderWidth:1,borderColor:'#EEDFD2',borderRadius:8,padding:14},row:{flexDirection:'row',alignItems:'center',gap:8},
  name:{fontSize:14,fontWeight:'700',color:'#31241C',flexShrink:1},status:{fontSize:11,fontWeight:'800',color:Colors.primary,marginVertical:8},detail:{fontSize:12,color:'#756052',marginTop:4},
  action:{padding:12,borderRadius:8,backgroundColor:Colors.primary,alignItems:'center'},actionText:{fontWeight:'700',color:'#fff'},readOnly:{fontSize:12,color:'#756052'},
});
