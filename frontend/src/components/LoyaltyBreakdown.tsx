import React from 'react';
import { Text, View } from 'react-native';
import { loyaltyRateLabel } from '../utils/loyaltyLabel';
export default function LoyaltyBreakdown({ quote }: {quote: {data?: any; error?: string; ready: boolean}}) {
  if (!quote.ready) return <Text style={{fontSize:12,color:quote.error ? '#B42318' : '#756052'}}>{quote.error || 'Calculating payable amount...'}</Text>;
  if (!quote.data.discount) return null;
  return <View style={{gap:4, paddingVertical:8}}>
    <Text>Subtotal: ₹{quote.data.subtotal.toFixed(2)}</Text>
    <Text style={{color:'#15803D',fontWeight:'700'}}>Loyalty discount{loyaltyRateLabel(quote.data.percent, quote.data.items)}: -₹{quote.data.discount.toFixed(2)}</Text>
    <Text style={{fontWeight:'700'}}>Payable: ₹{quote.data.total.toFixed(2)}</Text>
  </View>;
}
