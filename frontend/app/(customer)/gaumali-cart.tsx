import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Image, NativeModules, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../../src/contexts/AuthContext";
import { api } from "../../src/services/api";
import { gaumali, CartBooking, Checkout, PaymentMethod, Service, Slot } from "../../src/services/gaumali";
import { Colors } from "../../src/constants/colors";
import { formatDeliveryAddress, hasCompleteDeliveryAddress } from "../../src/utils/address";

const day = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const uuid = () => "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => { const n = Math.floor(Math.random()*16); return (c === "x" ? n : (n&3)|8).toString(16); });
type Choice = { date: string; start: string };
function SlotChoice({ service, value, onChange, disabled }: { service: Service; value: Choice; onChange: (v: Choice) => void; disabled: boolean }) {
  const [slots, setSlots] = useState<Slot[]>([]), [error, setError] = useState("");
  const [loading, setLoading] = useState(false), [picker, setPicker] = useState(false);
  useEffect(() => {
    let active = true; setSlots([]); setLoading(true); setError("");
    gaumali.slots(service.id, value.date).then(rows => { if(active) setSlots(rows); }).catch(() => { if(active) setError("Slots unavailable. Change date or refresh the cart."); }).finally(() => { if(active) setLoading(false); });
    return () => { active = false; };
  }, [service.id, value.date]);
  return <>
    {Platform.OS === "web" ? <TextInput editable={!disabled} style={s.input} value={value.date} placeholder="YYYY-MM-DD" onChangeText={date => onChange({ date, start: "" })} /> : <TouchableOpacity disabled={disabled} style={s.date} onPress={() => setPicker(!picker)}><Ionicons name="calendar-outline" size={18} color={Colors.primaryDark} /><Text>{value.date}</Text></TouchableOpacity>}
    {picker && Platform.OS !== "web" && <DateTimePicker mode="date" display={Platform.OS === "ios" ? "inline" : "default"} value={new Date(`${value.date}T12:00:00`)} minimumDate={new Date()} maximumDate={new Date(Date.now()+90*86400000)} onChange={(e,d) => { if(Platform.OS === "android")setPicker(false); if(e.type === "set" && d) onChange({ date: day(d), start: "" }); }} />}
    {loading ? <ActivityIndicator color={Colors.primaryDark} /> : <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>{slots.map(slot => <TouchableOpacity key={slot.start} disabled={disabled || slot.available < 1} onPress={() => onChange({ ...value, start: slot.start })} style={[s.slot, value.start === slot.start && s.selected, slot.available < 1 && {opacity:.4}]}><Text>{slot.start}–{slot.end}</Text></TouchableOpacity>)}</ScrollView>}
    {!!error && <Text style={s.error}>{error}</Text>}
  </>;
}
export default function GaumaliCart() {
  const router = useRouter(); const { user } = useAuth(); const params = useLocalSearchParams<{ checkoutId?: string }>();
  const key = `gaumali-saved:${user?.id}:${user?.admin_id || user?.referral_admin_id || ""}`;
  const pendingKey = `${key}:checkout`;
  const [items,setItems] = useState<(Service & { sourceId: string })[]>([]), [ids,setIds] = useState<string[]>([]);
  const [choices,setChoices] = useState<Record<string,Choice>>({}), [addresses,setAddresses] = useState<any[]>([]);
  const [address,setAddress] = useState(""), [method,setMethod] = useState<PaymentMethod>("wallet");
  const [walletBalance,setWalletBalance] = useState<number|null>(null);
  const [busy,setBusy] = useState(false), [loading,setLoading] = useState(true), [error,setError] = useState("");
  const [checkout,setCheckout] = useState<Checkout|null>(null);
  const pending = useRef<CartBooking|null>(null), lock = useRef(false), generation = useRef(0);
  useFocusEffect(useCallback(() => {
    const version = ++generation.current; setLoading(true);
    api.getWallet().then(w=>{if(version===generation.current)setWalletBalance(Number(w.available_balance ?? w.balance ?? 0));}).catch(()=>{if(version===generation.current)setWalletBalance(null);});
    Promise.all([AsyncStorage.getItem(key), gaumali.services(), api.getMe(), AsyncStorage.getItem(pendingKey)]).then(async ([raw,services,profile,stored]) => {
      if(version !== generation.current)return;
      const saved = JSON.parse(raw || "{}"); const cart: string[] = Array.isArray(saved.cart) ? saved.cart : [];
      setIds(cart.map((id,index)=>`${id}:${index}`)); setItems(cart.flatMap((id,index)=>{const service=services.find(s=>s.id===id && s.is_active);return service?[{...service,sourceId:id,id:`${id}:${index}`}]:[];}));
      setChoices(current => Object.fromEntries(cart.map((id,index) => {const key=`${id}:${index}`;return [key,current[key] || {date:day(),start:""}];})));
      const rows = (profile.addresses?.length ? profile.addresses : profile.address ? [profile.address] : []).filter((a:any)=>a.id && hasCompleteDeliveryAddress(a));
      setAddresses(rows); setAddress(current=>rows.some((a:any)=>a.id===current)?current:(rows.find((a:any)=>a.is_default)||rows[0])?.id||"");
      pending.current = stored ? JSON.parse(stored) : null;
      if(params.checkoutId) { const group = await gaumali.getCheckout(params.checkoutId); if(version===generation.current)setCheckout(group); }
      setError("");
    }).catch(e=>{if(version===generation.current)setError(e.message || "Could not load cart.");}).finally(()=>{if(version===generation.current)setLoading(false);});
    return ()=>{generation.current++;};
  },[key,pendingKey,params.checkoutId]));
  const total = items.reduce((sum,s)=>sum+Math.round(s.price*100),0)/100;
  const remove = async(id:string)=>{
    try { const saved=JSON.parse(await AsyncStorage.getItem(key)||"{}"); saved.cart=(saved.cart||[]).filter((_:string,index:number)=>index!==ids.indexOf(id)); await AsyncStorage.setItem(key,JSON.stringify(saved)); setIds(rows=>rows.filter(value=>value!==id));setItems(rows=>rows.filter(s=>s.id!==id)); }
    catch {Alert.alert("Could not update cart","Please try again.");}
  };
  const pay = async(group:Checkout)=>{
    const status=await gaumali.checkoutStatus(group.id); setCheckout(status);
    if(status.payment_status==="paid")return status;
    if(status.status!=="awaiting_payment" || !status.checkout)throw new Error("Checkout is not payable. Review its status before trying again.");
    if(Platform.OS==="web" || Constants.appOwnership==="expo" || !(NativeModules.RNRazorpayCheckout || NativeModules.RazorpayCheckout))throw new Error("Online payment needs a development or production mobile build.");
    const result=await require("react-native-razorpay").default.open({key:status.checkout.key_id,order_id:status.checkout.order_id,amount:status.checkout.amount,currency:status.checkout.currency,name:"Gaumali",description:"Appointment cart",prefill:{name:user?.name,contact:user?.phone},theme:{color:Colors.primary}});
    return gaumali.verifyCheckout(group.id,result);
  };
  const submit=async()=>{
    if(lock.current)return;lock.current=true;setBusy(true);setError("");
    try {
      let group=checkout;
      if(!group){
        if(!pending.current){
          if(!items.length || items.length!==ids.length || !address || items.some(s=>!choices[s.id]?.start))throw new Error("Select every service's slot and a complete address. Remove unavailable services.");
          if(method==="online" && (Platform.OS==="web" || Constants.appOwnership==="expo" || !(NativeModules.RNRazorpayCheckout || NativeModules.RazorpayCheckout)))throw new Error("Online payment needs a development or production mobile build.");
          pending.current={items:items.map(s=>({service_id:s.sourceId,...choices[s.id]})),address_id:address,payment_method:method,request_id:uuid()};
          await AsyncStorage.setItem(pendingKey,JSON.stringify(pending.current));
        }
        group=await gaumali.checkout(pending.current);setCheckout(group);
      }
      if(group.status==="awaiting_payment")group=await pay(group);
      if(!["confirmed"].includes(group.status))throw new Error("Checkout needs review. Check your booking history.");
      const saved=JSON.parse(await AsyncStorage.getItem(key)||"{}");const booked=group.appointments.map(a=>a.service_id);
      saved.cart=(saved.cart||[]).filter((id:string)=>!booked.includes(id));await AsyncStorage.setItem(key,JSON.stringify(saved));await AsyncStorage.removeItem(pendingKey);pending.current=null;
      router.replace("/(customer)/gaumali-history" as any);
    }catch(e:any){setError(typeof e?.message==="string"?e.message:"Payment was not confirmed. Retry this checkout, not a new booking.");}
    finally{lock.current=false;setBusy(false);}
  };
  const abandon=async()=>{
    if(lock.current)return;lock.current=true;setBusy(true);
    try{
      let group=checkout;
      if(!group && pending.current) {
        try { group=await gaumali.resolveCheckout(pending.current.request_id); }
        catch(e:any) { if(e?.status!==404)throw e; }
      }
      if(group)await gaumali.cancelCheckout(group.id);
      await AsyncStorage.removeItem(pendingKey);pending.current=null;setCheckout(null);setError("");
      if(params.checkoutId)router.replace("/(customer)/gaumali-history" as any);
    }
    catch(e:any){setError(e.message||"Could not cancel checkout.");}finally{lock.current=false;setBusy(false);}
  };
  const emptyCart = !loading && !error && ids.length === 0 && !checkout && !pending.current;
  const checkoutDisabled = busy || loading || (!checkout && !pending.current && !items.length);
  const frozen=busy || !!checkout || !!pending.current;
  return <SafeAreaView style={s.screen} edges={["top"]}>
    <View style={s.header}><TouchableOpacity disabled={busy} accessibilityLabel="Back" onPress={()=>router.canGoBack()?router.back():router.replace("/(customer)/gaumali")}><Ionicons name="arrow-back" size={24} color={Colors.primaryDark}/></TouchableOpacity><Text style={s.heading}>Gaumali Cart</Text>{!emptyCart && <Text>{items.length} services</Text>}</View>
    {loading?<ActivityIndicator style={{flex:1}}/>:<ScrollView contentContainerStyle={[s.content,emptyCart && {flexGrow:1,justifyContent:"center"}]}>
      {!emptyCart && items.length > 0 && method === "wallet" && walletBalance !== null && <View style={[s.card,walletBalance<total && {borderColor:"#DC2626",backgroundColor:"#FEF2F2"}]}><Text style={s.title}>Wallet balance: {rupees(walletBalance)}</Text>{walletBalance<total && <Text style={s.error}>Insufficient balance. Add {rupees(total-walletBalance)} or choose another payment method.</Text>}</View>}
      {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
      {checkout && <View style={s.card}><Text style={s.title}>Checkout {checkout.id.slice(-8)}</Text><Text>{checkout.appointments.length} appointments · {rupees(checkout.amount)}</Text><Text>{checkout.status.replace(/_/g," ")}</Text></View>}
      {emptyCart && <View style={{alignItems:"center",gap:16,padding:24}}><View style={{width:88,height:88,borderRadius:44,alignItems:"center",justifyContent:"center",backgroundColor:Colors.surfaceSecondary}}><Ionicons name="cart-outline" size={42} color={Colors.primaryDark} /></View><Text accessibilityRole="header" style={s.title}>Your cart is empty</Text></View>}
      {!checkout && ids.filter(id=>!items.some(s=>s.id===id)).map(id=><View key={id} style={s.card}><Text>Service no longer available</Text><TouchableOpacity disabled={frozen} onPress={()=>void remove(id)}><Text style={s.error}>Remove</Text></TouchableOpacity></View>)}
      {!checkout && items.map(service=><View key={service.id} style={s.card}><View style={s.row}>{(service.images?.[0]||service.image)?<Image source={{uri:service.images?.[0]||service.image}} style={s.image}/>:<View style={[s.image,{alignItems:"center",justifyContent:"center",backgroundColor:"#EAF5EC"}]}><Ionicons name="leaf-outline" size={28} color={Colors.primaryDark}/></View>}<View style={{flex:1,gap:5}}><Text style={s.title}>{service.name}</Text><Text>{service.duration_hours} hours</Text><Text style={s.price}>{rupees(service.price)}</Text></View><TouchableOpacity accessibilityLabel={`Remove ${service.name}`} disabled={frozen} onPress={()=>void remove(service.id)}><Ionicons name="trash-outline" size={22} color="#B91C1C"/></TouchableOpacity></View><SlotChoice service={{...service,id:service.sourceId}} value={choices[service.id]||{date:day(),start:""}} disabled={frozen} onChange={choice=>setChoices(current=>({...current,[service.id]:choice}))}/></View>)}
      {!checkout && items.length>0 && <><View style={s.row}><Text style={s.title}>Service address</Text><TouchableOpacity disabled={frozen} onPress={()=>router.push("/address-book")}><Text style={s.link}>Add / change</Text></TouchableOpacity></View>{addresses.map(a=><TouchableOpacity key={a.id} disabled={frozen} style={[s.card,address===a.id&&s.selected]} onPress={()=>setAddress(a.id)}><Text style={s.title}>{a.label||"Address"}</Text><Text>{formatDeliveryAddress(a)}</Text></TouchableOpacity>)}<Text style={s.title}>Payment method</Text><View style={s.row}>{(["wallet","online","cod"] as const).map(m=><TouchableOpacity key={m} disabled={frozen} onPress={()=>setMethod(m)} style={[s.slot,method===m&&s.selected]}><Text>{m==="cod"?"COD":m==="wallet"?"Wallet":"Online"}</Text></TouchableOpacity>)}</View><View style={s.card}><Text style={s.title}>Price details</Text><View style={s.row}><Text>{items.length} appointments</Text><Text style={s.price}>{rupees(total)}</Text></View></View></>}
      {pending.current && <TouchableOpacity disabled={busy} onPress={()=>Alert.alert("Cancel unpaid checkout?","Paid appointments must be cancelled individually from history.",[{text:"Keep",style:"cancel"},{text:"Cancel checkout",style:"destructive",onPress:()=>void abandon()}])}><Text style={s.error}>Cancel unpaid checkout</Text></TouchableOpacity>}
    </ScrollView>}
    <View style={s.footer}>{!emptyCart && <View><Text>Total</Text><Text style={s.price}>{rupees(checkout?.amount??total)}</Text></View>}<TouchableOpacity accessibilityRole="button" accessibilityState={{disabled:checkoutDisabled}} disabled={checkoutDisabled} style={[s.primary,emptyCart && {flex:1,alignItems:"center"},checkoutDisabled && {opacity:.35}]} onPress={()=>void submit()}>{busy?<ActivityIndicator color="white"/>:<Text style={s.white}>{checkout||pending.current?"Resume checkout":"Checkout"}</Text>}</TouchableOpacity></View>
  </SafeAreaView>;
}
const s=StyleSheet.create({screen:{flex:1,backgroundColor:Colors.background},header:{flexDirection:"row",alignItems:"center",gap:14,padding:18},heading:{fontSize:20,fontWeight:"800",color:Colors.primaryDark,flex:1},content:{padding:16,gap:14},card:{padding:14,gap:12,borderRadius:8,backgroundColor:"white",borderWidth:1,borderColor:Colors.border},row:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:10},title:{fontSize:15,fontWeight:"700",color:Colors.text},price:{fontSize:18,fontWeight:"800",color:Colors.primaryDark},image:{width:70,height:76,borderRadius:6},date:{flexDirection:"row",gap:8,alignItems:"center",padding:10,borderWidth:1,borderColor:Colors.border,borderRadius:6},slot:{padding:12,borderRadius:6,borderWidth:1,borderColor:Colors.border},selected:{borderColor:Colors.primaryDark,backgroundColor:Colors.surfaceSecondary},error:{color:"#B91C1C",fontSize:13},input:{padding:12,borderWidth:1,borderColor:Colors.border},empty:{textAlign:"center",paddingVertical:50,color:Colors.textSecondary},link:{color:Colors.primaryDark,fontWeight:"700"},footer:{padding:16,flexDirection:"row",alignItems:"center",justifyContent:"space-between",backgroundColor:"white",borderTopWidth:1,borderColor:Colors.border},primary:{backgroundColor:Colors.primaryDark,paddingHorizontal:30,paddingVertical:14,borderRadius:8},white:{color:"white",fontWeight:"800"}});
