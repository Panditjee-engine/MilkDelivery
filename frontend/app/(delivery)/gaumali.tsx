import React, { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Alert, Modal, RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../src/services/api";
import { Colors } from "../../src/constants/colors";
import { formatDeliveryAddress } from "../../src/utils/address";

type Job = {id:string;assignment_id?:string;service_name:string;customer_name:string;customer_phone?:string;address:any;date:string;start:string;end:string;status:string;partner_response?:string;payment_method:string;amount:number};
export default function GaumaliJobs() {
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
    <Text style={s.heading}>Gaumali Jobs</Text>
    <View style={s.row}>{["Open","Completed","All"].map(f=><TouchableOpacity key={f} accessibilityRole="button" accessibilityState={{selected:filter===f}} style={[s.button,filter===f&&s.selected]} onPress={()=>setFilter(f)}><Text style={s.label}>{f}</Text></TouchableOpacity>)}</View>
    <ScrollView contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={()=>void load()}/> }>
      {!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}
      {!loading&&!error&&!rows.length&&<View style={s.empty}><Ionicons name="leaf-outline" size={42} color={Colors.primaryDark}/><Text style={s.label}>No jobs in this view</Text></View>}
      {rows.map(job=><View key={job.id} style={s.card}>
        <View style={[s.row,{padding:0,justifyContent:"space-between"}]}><Text style={s.title}>{job.service_name}</Text><Text style={s.label}>{job.status==="assigned"?(job.partner_response==="accepted"?"Accepted":"Awaiting response"):job.status}</Text></View>
        <Text>{job.date} · {job.start} - {job.end}</Text><Text style={s.label}>{job.customer_name}</Text>{!!job.customer_phone&&<Text selectable>{job.customer_phone}</Text>}<Text>{formatDeliveryAddress(job.address)}</Text>
        <Text style={s.label}>₹{job.amount} · {job.payment_method.toUpperCase()}</Text>
        {job.status==="assigned"&&<View style={[s.row,{padding:0}]}>{job.partner_response==="accepted"?<TouchableOpacity disabled={busy} style={[s.button,s.selected]} onPress={()=>open(job,"completed")}><Text style={s.label}>Complete service</Text></TouchableOpacity>:<><TouchableOpacity disabled={busy} style={[s.button,s.selected]} onPress={()=>open(job,"accepted")}><Text style={s.label}>Accept</Text></TouchableOpacity><TouchableOpacity disabled={busy} style={s.button} onPress={()=>open(job,"rejected")}><Text style={s.error}>Reject</Text></TouchableOpacity></>}</View>}
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
const s=StyleSheet.create({screen:{flex:1,backgroundColor:Colors.background},heading:{fontSize:22,fontWeight:"800",color:Colors.primaryDark,padding:18},content:{padding:16,gap:12},row:{flexDirection:"row",alignItems:"center",flexWrap:"wrap",gap:10,paddingHorizontal:16},card:{backgroundColor:Colors.surface,borderRadius:8,padding:16,gap:10,borderWidth:1,borderColor:Colors.border},title:{fontSize:16,fontWeight:"700",color:Colors.text,flexShrink:1},label:{fontWeight:"600",color:Colors.primaryDark},button:{padding:12,minHeight:44,borderWidth:1,borderColor:Colors.border,borderRadius:6,alignItems:"center"},selected:{backgroundColor:Colors.surfaceSecondary,borderColor:Colors.primaryDark},error:{color:Colors.error},empty:{alignItems:"center",paddingVertical:60,gap:16},overlay:{flex:1,justifyContent:"flex-end",backgroundColor:"#0008"},sheet:{maxHeight:"85%",backgroundColor:Colors.surface,borderTopLeftRadius:8,borderTopRightRadius:8},input:{borderWidth:1,borderColor:Colors.border,padding:12,borderRadius:6,minHeight:90}});
