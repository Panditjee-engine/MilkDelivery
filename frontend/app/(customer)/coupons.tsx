import React, {useEffect, useState, useMemo} from 'react';
import {View, Text, TouchableOpacity, FlatList, ActivityIndicator, StyleSheet, Alert, NativeModules} from 'react-native';
import Constants from 'expo-constants';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import {api} from '../../src/services/api';
import {getCouponDraft, selectCoupon} from '../../src/services/couponSelection';
import {Colors} from '../../src/constants/colors';
import {couponExpired, sortedCoupons} from '../../src/utils/couponDisplay';
export default function Coupons(){
 const params=useLocalSearchParams<{key:string}>(); const key=String(params.key||''); const router=useRouter();
 const [rows,setRows]=useState<any[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true),[retry,setRetry]=useState(0);
 const [pending,setPending]=useState<any[]>([]),[paying,setPaying]=useState<string|null>(null);
 const [now,setNow]=useState(Date.now);
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
 const displayRows=useMemo(()=>sortedCoupons(rows,now),[rows,now]);
 async function resume(order:any){
  if(paying)return;
  if(Constants.appOwnership==='expo'||!(NativeModules.RNRazorpayCheckout||NativeModules.RazorpayCheckout)){
   Alert.alert('Development build needed','Open the installed app to resume this payment. Online payments are not available in Expo Go.');return;
  }
  setPaying(order.order_id);
  try{
   const checkout=require('react-native-razorpay').default;
   const result=await checkout.open({key:order.key_id,order_id:order.order_id,amount:order.amount,currency:order.currency||'INR',name:order.name||'Gau Satva',description:order.description||'Order payment',theme:{color:Colors.primary}});
   await api.verifySubscriptionRazorpayPayment({razorpay_order_id:result.razorpay_order_id,razorpay_payment_id:result.razorpay_payment_id,razorpay_signature:result.razorpay_signature});
   selectCoupon(key);setRetry(n=>n+1);
   Alert.alert('Payment confirmed','Your order is available in Orders or Subscriptions.');
  }catch(e:any){Alert.alert('Payment not confirmed','Your payment could not be confirmed yet. Check your order history before retrying. You can resume the same payment here without creating another payment order.');}
  finally{setPaying(null);}
 }
 useEffect(()=>{let active=true;setLoading(true);setError('');const items=getCouponDraft(key);if(!items?.length){setError('Your cart has changed. Return to checkout and try again.');setLoading(false);return;}
 api['request']<any>('/coupons/available',{method:'POST',body:JSON.stringify({items:items.map(i=>({product_id:i.product_id,quantity:i.quantity}))})}).then(r=>{if(active){setRows(r.coupons);setPending(r.pending_payments||[]);}}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[key,retry]);
 return <SafeAreaView style={s.page}>
  <View style={s.header}>
   <TouchableOpacity accessibilityLabel="Back" onPress={()=>router.back()}><Ionicons name="arrow-back" size={24} color={Colors.primary}/></TouchableOpacity>
   <Text style={s.title}>Apply Coupon</Text>
  </View>
  {loading ? <ActivityIndicator color={Colors.primary}/> : error ? <View style={s.empty}>
   <Text>{error}</Text><TouchableOpacity onPress={()=>setRetry(n=>n+1)}><Text style={s.link}>Retry</Text></TouchableOpacity>
  </View> : <FlatList data={displayRows} extraData={now} keyExtractor={r=>r.id} contentContainerStyle={{padding:16,gap:12}}
   ListHeaderComponent={pending.length ? <View style={{gap:12,marginBottom:12}}>
    <Text style={s.titleSmall}>Pending payments</Text>
    {pending.map(({gateway_response:order})=><View key={order.order_id} style={s.card}>
     <Text>Payment of ₹{(order.amount/100).toFixed(2)}</Text>
     <Text>{order.order_id}</Text>
     <TouchableOpacity style={s.button} disabled={!!paying} onPress={()=>resume(order)}>
      <Text style={{color:'white',fontWeight:'700'}}>{paying===order.order_id?'Confirming...':'Resume Payment'}</Text>
     </TouchableOpacity>
    </View>)}
   </View> : null}
   ListEmptyComponent={<Text style={s.empty}>No coupons available for your account.</Text>}
   renderItem={({item})=>{const expired=couponExpired(item,now);const applicable=item.eligible&&!expired;return <View style={[s.card,!applicable&&{opacity:.65},expired&&{backgroundColor:'#f1f2f3',borderColor:'#d6d8db'}]}>
    <Text style={s.code}>{item.code} · {item.percent}% off</Text>
    <Text style={s.titleSmall}>{item.title}</Text>
    <Text>Minimum cart ₹{item.minimum_subtotal}</Text>
    <Text>Valid until {new Date(item.valid_until).toLocaleDateString()}</Text>
    {applicable ? <Text style={s.link}>Save ₹{Number(item.discount).toFixed(2)} after loyalty discount</Text> : <Text>{expired?'This coupon has expired':item.reason}</Text>}
    <TouchableOpacity accessibilityRole="button" accessibilityState={{disabled:!applicable||!!paying}} disabled={!applicable||!!paying} style={[s.button,!applicable&&{backgroundColor:'#707780'}]} onPress={()=>{if(couponExpired(item)){setNow(Date.now());return;}selectCoupon(key,item.code);router.back();}}>
     <Text style={{color:'white',fontWeight:'700'}}>{expired?'Expired':applicable?'Apply':'Not eligible'}</Text>
    </TouchableOpacity>
   </View>;}}/>}</SafeAreaView>;
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:Colors.background},header:{flexDirection:'row',gap:14,alignItems:'center',padding:18},title:{fontSize:22,fontWeight:'700',color:Colors.primary},titleSmall:{fontSize:16,fontWeight:'600'},card:{backgroundColor:'white',borderWidth:1,borderColor:'#d8e5dc',borderRadius:8,padding:16,gap:8},code:{fontSize:18,fontWeight:'700',color:Colors.primary},button:{backgroundColor:Colors.primary,padding:12,borderRadius:6,alignItems:'center',marginTop:6},link:{color:'#16805c',fontWeight:'600',paddingVertical:6},empty:{padding:24,textAlign:'center'}});
