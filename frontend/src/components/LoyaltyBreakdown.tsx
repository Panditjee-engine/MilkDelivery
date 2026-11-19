import React from 'react';
import { Text, View, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { selectCoupon } from '../services/couponSelection';
import { loyaltyRateLabel } from '../utils/loyaltyLabel';
export default function LoyaltyBreakdown({ quote, onBrowse }: {quote: {data?: any; error?: string; ready: boolean; selectionKey?: string; couponPayload?: any}; onBrowse?: () => void}) {
  const router = useRouter();
  const loyaltyDiscount = Number(quote.data?.loyalty_discount ?? quote.data?.discount ?? 0);
  const showLoyalty = quote.data?.enabled !== false && quote.data?.eligible !== false && loyaltyDiscount > 0;
  const browse = () => { onBrowse?.(); router.push({pathname:'/(customer)/coupons' as any,params:{key:quote.selectionKey}}); };
  return <View style={{gap:4, paddingVertical:8}}>
    {quote.selectionKey && <View style={{flexDirection:'row',justifyContent:'space-between',paddingVertical:8}}><TouchableOpacity onPress={browse}><Text style={{color:'#16805c',fontWeight:'700'}}>{quote.couponPayload?.coupon_code || 'Apply Coupon'}</Text></TouchableOpacity>{quote.couponPayload?.coupon_code && <TouchableOpacity onPress={() => selectCoupon(quote.selectionKey!)}><Text>Remove</Text></TouchableOpacity>}</View>}
    {!quote.ready ? <Text style={{color:'#B42318'}}>{quote.error || 'Calculating payable amount...'}</Text> : <>
    <Text>Subtotal: ₹{quote.data.subtotal.toFixed(2)}</Text>
    {showLoyalty && <Text style={{color:'#15803D',fontWeight:'700'}}>Loyalty discount{loyaltyRateLabel(quote.data.percent, quote.data.items)}: -₹{loyaltyDiscount.toFixed(2)}</Text>}
    {!!quote.data.coupon_discount && <Text style={{color:'#15803D',fontWeight:'700'}}>Coupon {quote.data.coupon_code}: -₹{quote.data.coupon_discount.toFixed(2)}</Text>}
    <Text style={{fontWeight:'700'}}>Payable: ₹{quote.data.total.toFixed(2)}</Text>
    </>}
  </View>;
}
