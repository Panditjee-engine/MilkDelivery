import React, { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Alert, Modal, RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../src/services/api";
const Colors = { background: "#FFF8EF", surface: "#FFFFFF", primaryDark: "#BB6B3F", surfaceSecondary: "#FFD999", border: "#F5E6D0", text: "#3D1F0A", error: "#B42318" };
import { formatDeliveryAddress } from "../../src/utils/address";

type Job = {id:string;assignment_id?:string;service_name:string;customer_name:string;customer_phone?:string;address:any;date:string;start:string;end:string;status:string;partner_response?:string;payment_method:string;amount:number};
export default function GaumaliJobs() {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [jobs,setJobs]=useState<Job[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState("");
  const [filter,setFilter]=useState("Open"),[busy,setBusy]=useState(false),[selected,setSelected]=useState<{job:Job;decision:string}|null>(null);
  const [reason,setReason]=useState(""),[cash,setCash]=useState(false);const lock=useRef(false);
  const load=useCallback(async()=>{setLoading(true);try{setJobs(await api["request"]<Job[]>("/gaumali/delivery/appointments"));setError("");}catch(e:any){setError(e.message||"Could not load jobs.");}finally{setLoading(false);}},[]);
  useFocusEffect(useCallback(()=>{void load();},[load]));
  const open=(job:Job,decision:string)=>{setReason("");setCash(false);setSelected({job,decision});};
  const submit=async()=>{
    if(!selected||lock.current)return;
    if(!selected.job.assignment_id){Alert.alert("Assignment needs updating","Ask your admin to reassign this job.");return;}
    lock.current=true;setBusy(true);
    try{await api["request"](`/gaumali/delivery/appointments/${encodeURIComponent(selected.job.id)}`,{method:"PATCH",body:JSON.stringify({decision:selected.decision,assignment_id:selected.job.assignment_id,reason,cash_collected:cash})});setSelected(null);await load();}
    catch(e:any){Alert.alert("Could not update job",e.message||"Please try again.");}finally{lock.current=false;setBusy(false);}
  };
  const rows=jobs.filter(j=>filter==="All"||(filter==="Open"?j.status==="assigned":j.status==="completed"));
  return <SafeAreaView style={s.screen} edges={["top"]}>
    <View style={s.header}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Back" style={s.iconButton} onPress={()=>router.canGoBack()?router.back():router.replace("/(delivery)/home")}><Ionicons name="arrow-back" size={24} color={Colors.text}/></TouchableOpacity>
      <Text style={s.heading}>Gaumali Jobs</Text><View style={s.iconButton}/>
    </View>
    <View style={s.tabs}>{["Open","Completed","All"].map(f=><TouchableOpacity key={f} accessibilityRole="tab" accessibilityState={{selected:filter===f}} style={[s.tab,filter===f&&s.tabActive]} onPress={()=>{setFilter(f);setExpandedId(null);}}><Text style={[s.tabText,filter===f&&s.tabTextActive]}>{f==="Open"?"Active":f} ({jobs.filter(j=>f==="All"||(f==="Open"?j.status==="assigned":j.status==="completed")).length})</Text></TouchableOpacity>)}</View>
    <ScrollView contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={()=>void load()}/> }>
      {!!error&&<View style={s.card}><Text accessibilityRole="alert" style={s.error}>{error}</Text><TouchableOpacity accessibilityRole="button" disabled={loading} onPress={()=>void load()} style={s.button}><Text style={s.label}>Retry</Text></TouchableOpacity></View>}
      {loading&&!jobs.length&&<ActivityIndicator color={Colors.primaryDark} style={{paddingVertical:24}}/>}
      {!!rows.length&&<View style={s.sectionHeader}><View style={s.sectionIcon}><Ionicons name="leaf-outline" size={20} color="#BB6B3F"/></View><Text style={[s.title,{flex:1}]}>{filter==="Open"?"Assigned services":filter==="Completed"?"Completed services":"All services"}</Text><Text style={s.badge}>{rows.length}</Text></View>}
      {!loading&&!error&&!rows.length&&<View style={s.empty}><Ionicons name="leaf-outline" size={42} color={Colors.primaryDark}/><Text style={s.label}>No jobs in this view</Text></View>}
      {rows.map(job=><View key={job.id} style={s.card}>
        <TouchableOpacity accessibilityRole="button" accessibilityState={{expanded:expandedId===job.id}} accessibilityLabel={`${job.service_name}, ${expandedId===job.id?"hide":"show"} details`} onPress={()=>setExpandedId(id=>id===job.id?null:job.id)} style={{gap:8}}>
          <View style={s.cardTop}><Text style={[s.title,{flex:1}]} numberOfLines={2}>{job.customer_name || "Customer"}</Text><Text style={s.amount}>₹{Number(job.amount).toLocaleString("en-IN")}</Text></View>
          <View style={s.cardTop}><Text style={[s.body,{flex:1}]} numberOfLines={2}>{job.service_name}</Text><Ionicons name={expandedId===job.id?"chevron-up":"chevron-down"} size={20} color={Colors.primaryDark}/></View>
          <View style={s.cardTop}><Ionicons name="calendar-outline" size={15} color="#A07850"/><Text style={[s.body,{flex:1}]}>{job.date} · {job.start} - {job.end}</Text></View>
          <View style={s.cardTop}><Text style={s.badge}>{job.status==="assigned"?(job.partner_response==="accepted"?"Accepted":"Awaiting response"):job.status.replace(/_/g," ")}</Text><Text style={s.body}>{job.payment_method.toUpperCase()}</Text></View>
        </TouchableOpacity>
        {expandedId===job.id&&<View style={s.details}>
          {!!job.customer_phone&&<View style={s.cardTop}><Ionicons name="call-outline" size={16} color={Colors.primaryDark}/><Text selectable style={s.body}>{job.customer_phone}</Text></View>}
          <View style={[s.cardTop,{alignItems:"flex-start"}]}><Ionicons name="location-outline" size={18} color={Colors.primaryDark}/><Text style={[s.body,{flex:1}]}>{formatDeliveryAddress(job.address)||"Address not available"}</Text></View>
        </View>}
        {job.status==="assigned"&&<View style={[s.row,{padding:0}]}>{job.partner_response==="accepted"?<TouchableOpacity disabled={busy} style={[s.primaryButton,busy&&s.disabled]} onPress={()=>open(job,"completed")}><Text style={s.primaryText}>Complete service</Text></TouchableOpacity>:<><TouchableOpacity disabled={busy} style={[s.primaryButton,busy&&s.disabled]} onPress={()=>open(job,"accepted")}><Text style={s.primaryText}>Accept</Text></TouchableOpacity><TouchableOpacity disabled={busy} style={[s.button,{flex:1},busy&&s.disabled]} onPress={()=>open(job,"rejected")}><Text style={s.error}>Reject</Text></TouchableOpacity></>}</View>}
      </View>)}
    </ScrollView>
    <Modal visible={!!selected} transparent animationType="slide" onRequestClose={()=>{if(!busy)setSelected(null);}}><View style={s.overlay}><SafeAreaView style={s.sheet} edges={["bottom"]}><ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <Text style={s.title}>{selected?.decision==="accepted"?"Accept job?":selected?.decision==="rejected"?"Reject job?":"Complete service?"}</Text>
      <Text>{selected?.job.service_name}</Text>
      {selected?.decision==="rejected"&&<TextInput accessibilityLabel="Rejection reason" placeholder="Reason for rejection" value={reason} onChangeText={setReason} editable={!busy} maxLength={500} multiline style={s.input}/>}
      {selected?.decision==="completed"&&selected.job.payment_method==="cod"&&<View style={s.row}><Text style={{flex:1}}>Cash collected: ₹{selected.job.amount}</Text><Switch value={cash} onValueChange={setCash} disabled={busy}/></View>}
      <TouchableOpacity style={[s.button,s.selected]} disabled={busy||(selected?.decision==="rejected"&&!reason.trim())||(selected?.decision==="completed"&&selected.job.payment_method==="cod"&&!cash)} onPress={()=>void submit()}>{busy?<ActivityIndicator/>:<Text style={s.label}>Confirm</Text>}</TouchableOpacity><TouchableOpacity disabled={busy} style={s.button} onPress={()=>setSelected(null)}><Text>Close</Text></TouchableOpacity>
    </ScrollView></SafeAreaView></View></Modal>
  </SafeAreaView>;
}
const s=StyleSheet.create({
header:{flexDirection:"row",alignItems:"center",padding:12,backgroundColor:Colors.surface,borderBottomWidth:1,borderColor:Colors.border},iconButton:{width:44,height:44,alignItems:"center",justifyContent:"center"},tabs:{flexDirection:"row",backgroundColor:Colors.surface,paddingHorizontal:16,borderBottomWidth:1,borderColor:Colors.border},tab:{flex:1,minHeight:48,paddingVertical:14,alignItems:"center",justifyContent:"center",borderBottomWidth:3,borderBottomColor:"transparent"},tabActive:{borderBottomColor:"#FF9675"},tabText:{fontSize:13,fontWeight:"600",color:"#A07850"},tabTextActive:{color:"#BB6B3F",fontWeight:"700"},sectionHeader:{flexDirection:"row",alignItems:"center",gap:10},sectionIcon:{width:36,height:36,borderRadius:18,backgroundColor:Colors.surfaceSecondary,alignItems:"center",justifyContent:"center"},cardTop:{flexDirection:"row",alignItems:"center",gap:8,flexWrap:"wrap"},amount:{fontSize:16,fontWeight:"700",color:"#BB6B3F"},badge:{fontSize:12,fontWeight:"600",color:Colors.primaryDark,backgroundColor:Colors.surfaceSecondary,paddingHorizontal:8,paddingVertical:4,borderRadius:6,textTransform:"capitalize",overflow:"hidden"},body:{fontSize:13,lineHeight:20,color:"#A07850"},details:{gap:10,borderTopWidth:1,borderColor:Colors.border,paddingTop:12},primaryButton:{flex:2,backgroundColor:"#FF9675",minHeight:44,paddingVertical:12,paddingHorizontal:8,borderRadius:8,alignItems:"center",justifyContent:"center"},primaryText:{color:"#FFFFFF",fontSize:14,fontWeight:"700"},disabled:{opacity:0.45},
screen:{flex:1,backgroundColor:Colors.background},heading:{fontSize:20,fontWeight:"700",color:Colors.text,flex:1,textAlign:"center"},content:{padding:16,gap:12},row:{flexDirection:"row",alignItems:"center",flexWrap:"wrap",gap:10,paddingHorizontal:16},card:{backgroundColor:Colors.surface,borderRadius:12,padding:16,gap:10,borderWidth:1,borderColor:Colors.border,elevation:2,shadowColor:Colors.primaryDark,shadowOffset:{width:0,height:1},shadowOpacity:0.08,shadowRadius:2},title:{fontSize:16,fontWeight:"700",color:Colors.text,flexShrink:1},label:{fontWeight:"600",color:Colors.primaryDark},button:{padding:12,minHeight:44,borderWidth:1,borderColor:Colors.border,borderRadius:6,alignItems:"center"},selected:{backgroundColor:Colors.surfaceSecondary,borderColor:Colors.primaryDark},error:{color:Colors.error},empty:{alignItems:"center",paddingVertical:60,gap:16},overlay:{flex:1,justifyContent:"flex-end",backgroundColor:"#0008"},sheet:{maxHeight:"85%",backgroundColor:Colors.surface,borderTopLeftRadius:8,borderTopRightRadius:8},input:{borderWidth:1,borderColor:Colors.border,padding:12,borderRadius:6,minHeight:90}});
