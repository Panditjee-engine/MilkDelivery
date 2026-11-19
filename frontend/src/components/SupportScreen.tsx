import React, {useCallback,useRef,useState} from "react";
import {ActivityIndicator,Alert,AppState,FlatList,KeyboardAvoidingView,Linking,Modal,Platform,RefreshControl,ScrollView,StyleSheet,Text,TextInput,TouchableOpacity,View} from "react-native";
import {SafeAreaView} from "react-native-safe-area-context";
import {useFocusEffect,useLocalSearchParams,useRouter} from "expo-router";
import {Ionicons} from "@expo/vector-icons";
import {Colors} from "../constants/colors";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import {Image} from "react-native";
import SupportScreenshots from "./SupportScreenshots";
import {supportRequest, supportRequestId, SupportRole, SupportFarm, Ticket, ticketStatuses} from "../services/support";

export function SupportLink({role}:{role:SupportRole}) {
 const router=useRouter();
 return <TouchableOpacity accessibilityRole="button" style={s.link} onPress={()=>router.push(`/(${role})/contact-support` as any)}><Ionicons name="headset-outline" size={24} color={Colors.primary}/><Text style={s.subject}>Help & Support</Text><Ionicons name="chevron-forward" size={20} color={Colors.secondary}/></TouchableOpacity>;
}
function Header({title,back}:{title:string;back:()=>void}) {return <View style={s.header}><TouchableOpacity accessibilityLabel="Go back" onPress={back}><Ionicons name="arrow-back" size={25} color={Colors.primary}/></TouchableOpacity><Text style={s.title}>{title}</Text></View>;}
function Badge({status}:{status:string}) {
 const colors:Record<string,[string,string]>={open:["#2463A6","#EBF4FF"],in_progress:["#7A48A6","#F4ECFC"],waiting_on_user:["#98620E","#FFF4D9"],resolved:["#16804A","#EAF7EF"],closed:["#626B75","#F0F2F4"]};
 const [color,backgroundColor]=colors[status]||colors.open;
 return <Text style={[s.badge,{color,backgroundColor}]}>{ticketStatuses[status]||status}</Text>;
}
const date=(value:string)=>new Date(value).toLocaleString();

export default function SupportScreen({role}:{role:SupportRole}) {
 const router=useRouter();
 const [farms,setFarms]=useState<SupportFarm[]>([]),[farmId,setFarmId]=useState("");
 const [rows,setRows]=useState<Ticket[]>([]),[total,setTotal]=useState(0),[offset,setOffset]=useState(0),[status,setStatus]=useState("");
 const [loading,setLoading]=useState(true),[refreshing,setRefreshing]=useState(false),[error,setError]=useState("");
 const [newTicket,setNewTicket]=useState(false),[subject,setSubject]=useState(""),[message,setMessage]=useState(""),[reference,setReference]=useState(""),[category,setCategory]=useState("");
 const [busy,setBusy]=useState(false),[formError,setFormError]=useState("");
 const [screenshots,setScreenshots]=useState<{uri:string;data:string}[]>([]),[picking,setPicking]=useState(false);
 const pickScreenshot=async()=>{
  if(picking||busy||screenshots.length>=3)return;
  setPicking(true);setFormError("");
  try{
   // The system picker grants access only to the selected image.
   const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:["images"],quality:1,allowsMultipleSelection:false});
   if(result.canceled)return;
   const asset=result.assets[0];
   const scale=Math.min(1,1800/Math.max(asset.width,asset.height));
   const image=await ImageManipulator.manipulateAsync(asset.uri,[{resize:{width:Math.max(1,Math.round(asset.width*scale)),height:Math.max(1,Math.round(asset.height*scale))}}],{compress:0.85,format:ImageManipulator.SaveFormat.JPEG,base64:true});
   if(!image.base64||image.base64.length>2000000){setFormError("This screenshot is too large. Choose a smaller image (under 1.5 MB).");return;}
   setScreenshots(current=>[...current,{uri:image.uri,data:`data:image/jpeg;base64,${image.base64}`}].slice(0,3));operation.current=null;
  }catch{setFormError("Could not prepare the screenshot. Please try another image.");}finally{setPicking(false);}
 };
 const operation=useRef<string|null>(null),refresh=useRef<()=>void>(()=>{});
 const farm=farms.find(value=>value.id===farmId)||farms[0];
 useFocusEffect(useCallback(()=>{
   let active=true,pending=false;
   const load=async(manual=false)=>{if(pending)return;pending=true;if(manual)setRefreshing(true);try{const [context,list]=await Promise.all([supportRequest<{farms:SupportFarm[]}>(role,"/context"),supportRequest<{items:Ticket[];total:number}>(role,`/tickets?offset=${offset}&limit=30${status?`&status=${status}`:""}`)]);if(active){setFarms(context.farms);setRows(list.items);setTotal(list.total);setError("");}}catch(e:any){if(active)setError(e.message);}finally{pending=false;if(active){setLoading(false);setRefreshing(false);}}};
   refresh.current=()=>{void load(true);};void load();
   const timer=setInterval(()=>{if(AppState.currentState==="active")void load();},30000);
   const listener=AppState.addEventListener("change",state=>{if(state==="active")void load();});
   return()=>{active=false;clearInterval(timer);listener.remove();refresh.current=()=>{};};
 },[role,offset,status]));
 const openContact=async(kind:"phone"|"email")=>{const value=farm?.settings[kind];if(!value)return;try{await Linking.openURL(kind==="phone"?`tel:${value}`:`mailto:${encodeURIComponent(value)}`);}catch{Alert.alert("Unable to open",`Please ${kind==="phone"?"call":"email"} ${value}, or create a support ticket below.`);}};
 const resetOperation=()=>{operation.current=null;};
 const submit=async()=>{if(busy||picking||!farm)return;setBusy(true);setFormError("");if(!operation.current)operation.current=supportRequestId();try{const ticket=await supportRequest<Ticket>(role,"/tickets",{method:"POST",body:JSON.stringify({request_id:operation.current,farm_id:farm.id,subject:subject.trim(),message:message.trim(),category,reference:reference.trim(),screenshots:screenshots.map(image=>image.data)})});setNewTicket(false);setSubject("");setMessage("");setReference("");setScreenshots([]);operation.current=null;router.push({pathname:`/(${role})/support-ticket` as any,params:{id:ticket.id}});}catch(e:any){setFormError(e.message);}finally{setBusy(false);}};
 return <SafeAreaView edges={["top"]} style={s.page}><Header title="Help & Support" back={()=>router.canGoBack()?router.back():router.replace(`/(${role})` as any)}/>
  <FlatList data={rows} keyExtractor={item=>item.id} contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>refresh.current()}/>}
   ListHeaderComponent={<View style={s.stack}>
    {error?<TouchableOpacity onPress={()=>refresh.current()}><Text accessibilityRole="alert" style={s.error}>{error} Tap to retry.</Text></TouchableOpacity>:null}
    {farms.length>1&&<ScrollView horizontal showsHorizontalScrollIndicator={false}>{farms.map(item=><TouchableOpacity key={item.id} style={[s.chip,item.id===farm?.id&&s.chipSelected]} onPress={()=>{setFarmId(item.id);setCategory("");resetOperation();}}><Text style={s.body}>{item.name}</Text></TouchableOpacity>)}</ScrollView>}
    {farm&&<><Text style={s.section}>{farm.name}</Text><View style={s.wrap}>{farm.settings.phone?<TouchableOpacity style={s.contact} onPress={()=>void openContact("phone")}><Ionicons name="call-outline" size={20} color={Colors.primaryDark}/><Text style={s.body}>{farm.settings.phone}</Text></TouchableOpacity>:null}{farm.settings.email?<TouchableOpacity style={s.contact} onPress={()=>void openContact("email")}><Ionicons name="mail-outline" size={20} color="#2463A6"/><Text style={[s.body,{flexShrink:1}]}>{farm.settings.email}</Text></TouchableOpacity>:null}</View>{farm.settings.hours?<Text style={s.muted}>{farm.settings.hours} · {farm.settings.timezone}</Text>:null}
    <TouchableOpacity style={s.primary} onPress={()=>{setFormError("");setCategory(current=>farm.settings.categories.includes(current)?current:farm.settings.categories[0]||"");setNewTicket(true);}}><Ionicons name="add" size={20} color="white"/><Text style={s.primaryText}>New ticket</Text></TouchableOpacity></>}
    <Text style={s.section}>My tickets · {total}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false}>{[["","All"],...Object.entries(ticketStatuses)].map(([value,label])=><TouchableOpacity key={value} onPress={()=>{setStatus(value);setOffset(0);}} style={[s.chip,status===value&&s.chipSelected]}><Text style={s.body}>{label}</Text></TouchableOpacity>)}</ScrollView>
   </View>}
   ListEmptyComponent={loading?<ActivityIndicator color={Colors.primary}/>:<View style={{alignItems:"center",paddingVertical:24}}><Ionicons name="chatbubbles-outline" size={40} color={Colors.primaryDark}/><Text style={s.empty}>{error?"Tickets could not be loaded.":"No tickets found."}</Text></View>}
   renderItem={({item})=><TouchableOpacity accessibilityRole="button" style={s.card} onPress={()=>router.push({pathname:`/(${role})/support-ticket` as any,params:{id:item.id}})}><View style={s.between}><Text style={s.muted}>{item.number}</Text><Badge status={item.status}/></View><View style={{flexDirection:"row",alignItems:"center",gap:10}}><Text style={[s.subject,{flex:1}]} numberOfLines={2}>{item.subject}</Text><Ionicons name="chevron-forward" color={Colors.secondary} size={18}/></View><Text style={s.muted}>{item.farm_name} · {item.category}{item.screenshots?.length?` · ${item.screenshots.length} attachments`:""}</Text><View style={[s.between,{borderTopWidth:1,borderTopColor:Colors.divider,paddingTop:10}]}><Text style={s.muted}>{date(item.updated_at)}</Text>{item.last_admin_at&&(!item.user_seen_at||new Date(item.last_admin_at)>new Date(item.user_seen_at))?<Text style={{color:"#2463A6",fontSize:12,fontWeight:"700"}}>New reply</Text>:null}</View></TouchableOpacity>}
   ListFooterComponent={<View style={s.between}><TouchableOpacity disabled={!offset} onPress={()=>setOffset(Math.max(0,offset-30))}><Text style={[s.body,!offset&&s.disabled]}>Previous</Text></TouchableOpacity><Text style={s.muted}>{total?offset+1:0}–{Math.min(offset+30,total)} of {total}</Text><TouchableOpacity disabled={offset+30>=total} onPress={()=>setOffset(offset+30)}><Text style={[s.body,offset+30>=total&&s.disabled]}>Next</Text></TouchableOpacity></View>}/>
  <Modal visible={newTicket} animationType="slide" presentationStyle="pageSheet" onRequestClose={()=>{if(!busy)setNewTicket(false);}}><SafeAreaView style={s.page}><KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==="ios"?"padding":undefined}><Header title="New ticket" back={()=>{if(!busy)setNewTicket(false);}}/><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
   <Text style={s.section}>{farm?.name}</Text>{formError?<Text accessibilityRole="alert" style={s.error}>{formError}</Text>:null}
   <Text style={s.label}>Category</Text><View style={s.wrap}>{farm?.settings.categories.map(value=><TouchableOpacity disabled={busy} key={value} style={[s.chip,category===value&&s.chipSelected]} onPress={()=>{setCategory(value);resetOperation();}}><Text style={s.body}>{value}</Text></TouchableOpacity>)}</View>
   <Text style={s.label}>Subject</Text><TextInput accessibilityLabel="Subject" editable={!busy} style={s.input} value={subject} maxLength={160} onChangeText={value=>{setSubject(value);resetOperation();}}/>
   <Text style={s.label}>Order or subscription reference (optional)</Text><TextInput accessibilityLabel="Reference" editable={!busy} style={s.input} value={reference} maxLength={100} onChangeText={value=>{setReference(value);resetOperation();}}/>
   <View style={s.between}><Text style={s.label}>Screenshots · {screenshots.length}/3</Text><TouchableOpacity accessibilityRole="button" disabled={busy||picking||screenshots.length>=3} onPress={()=>void pickScreenshot()} style={s.attachmentButton}><Ionicons name="image-outline" size={18} color={Colors.primaryDark}/><Text style={s.body}>{picking?"Preparing...":"Add screenshot"}</Text></TouchableOpacity></View>
   <View style={s.wrap}>{screenshots.map((image,index)=><View key={image.uri} style={s.thumbnail}><Image source={{uri:image.uri}} style={{width:"100%",height:"100%",borderRadius:8}} resizeMode="cover"/><TouchableOpacity accessibilityLabel={`Remove screenshot ${index+1}`} disabled={busy} onPress={()=>{setScreenshots(current=>current.filter((_,i)=>i!==index));resetOperation();}} style={s.removeImage}><Ionicons name="close" size={18} color="white"/></TouchableOpacity></View>)}</View>
   <Text style={s.label}>Your query</Text><TextInput accessibilityLabel="Your query" editable={!busy} style={[s.input,s.multiline]} multiline textAlignVertical="top" value={message} maxLength={4000} onChangeText={value=>{setMessage(value);resetOperation();}}/>
  </ScrollView><TouchableOpacity disabled={busy||picking||subject.trim().length<3||message.trim().length<5||!category} style={[s.primary,s.footer,(busy||picking||subject.trim().length<3||message.trim().length<5||!category)&&s.disabled]} onPress={()=>void submit()}><Text style={s.primaryText}>{busy?"Submitting...":"Submit ticket"}</Text></TouchableOpacity></KeyboardAvoidingView></SafeAreaView></Modal>
 </SafeAreaView>;
}

export function SupportTicketScreen({role}:{role:SupportRole}) {
 const params=useLocalSearchParams<{id:string}>(),id=Array.isArray(params.id)?params.id[0]:params.id,router=useRouter();
 const [ticket,setTicket]=useState<Ticket|null>(null),[message,setMessage]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 const refresh=useRef<()=>void>(()=>{}),operation=useRef<{type:string;body:any}|null>(null),busyRef=useRef(false);
 useFocusEffect(useCallback(()=>{let active=true,pending=false;const load=async()=>{if(pending||busyRef.current||!id)return;pending=true;try{const data=await supportRequest<Ticket>(role,`/tickets/${encodeURIComponent(id)}`);if(active){setTicket(data);setError("");await supportRequest(role,`/tickets/${encodeURIComponent(id)}/read`,{method:"POST"});}}catch(e:any){if(active)setError(e.message);}finally{pending=false;}};refresh.current=()=>{void load();};void load();const timer=setInterval(()=>{if(AppState.currentState==="active")void load();},30000);return()=>{active=false;clearInterval(timer);refresh.current=()=>{};};},[role,id]));
 const action=async(type:string)=>{if(!ticket||busyRef.current)return;busyRef.current=true;setBusy(true);setError("");if(!operation.current||operation.current.type!==type)operation.current={type,body:{request_id:supportRequestId(),revision:ticket.revision,...(type==="reply"?{message:message.trim()}:{status:type,priority:ticket.priority,reason:type==="closed"?"Closed by requester":"Reopened by requester"})}};
  try{const data=await supportRequest<Ticket>(role,`/tickets/${encodeURIComponent(id)}${type==="reply"?"/messages":""}`,{method:type==="reply"?"POST":"PATCH",body:JSON.stringify(operation.current.body)});setTicket(data);if(type==="reply")setMessage("");operation.current=null;}
  catch(e:any){setError(e.message);if(e.status===409){operation.current=null;try{setTicket(await supportRequest<Ticket>(role,`/tickets/${encodeURIComponent(id)}`));}catch{ /* Preserve the action error. */ }}}
  finally{busyRef.current=false;setBusy(false);}
 };
 return <SafeAreaView edges={["top"]} style={s.page}><Header title={ticket?.number||"Support ticket"} back={()=>router.canGoBack()?router.back():router.replace(`/(${role})/contact-support` as any)}/><KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==="ios"?"padding":undefined}>
  <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={false} onRefresh={()=>refresh.current()}/>}>
   {error?<TouchableOpacity onPress={()=>refresh.current()}><Text accessibilityRole="alert" style={s.error}>{error} Tap to refresh.</Text></TouchableOpacity>:null}
   {!ticket?(!error?<ActivityIndicator color={Colors.primary}/>:null):<><Text style={s.section}>{ticket.subject}</Text><View style={s.between}><Text style={s.muted}>{ticket.category} · {ticket.farm_name}</Text><Badge status={ticket.status}/></View>{ticket.reference?<Text style={s.muted}>Reference: {ticket.reference}</Text>:null}
   <SupportScreenshots role={role} ticketId={ticket.id} images={ticket.screenshots}/>
   <Text style={s.section}>Conversation</Text>
   {ticket.messages.map(item=><View key={item.id} style={[s.card,item.side==="admin"&&{borderColor:"#B8D6F0",backgroundColor:"#F2F8FF"}]}><Text style={s.muted}>{item.author} · {date(item.at)}</Text><Text style={[s.body,item.kind==="status"&&{fontStyle:"italic"}]}>{item.text}</Text></View>)}
   <TouchableOpacity disabled={busy} style={s.secondary} onPress={()=>{const next=["closed","resolved"].includes(ticket.status)?"open":"closed";Alert.alert(next==="open"?"Reopen ticket?":"Close ticket?","Your conversation history will be kept.",[{text:"Cancel",style:"cancel"},{text:"Confirm",onPress:()=>void action(next)}]);}}><Text style={s.body}>{["closed","resolved"].includes(ticket.status)?"Reopen ticket":"Close ticket"}</Text></TouchableOpacity>
   </>}
  </ScrollView>
  {ticket&&!["closed","resolved"].includes(ticket.status)&&<View style={s.composer}><TextInput style={[s.input,{flex:1,maxHeight:120}]} accessibilityLabel="Reply" placeholder="Write a reply" multiline value={message} maxLength={4000} editable={!busy} onChangeText={value=>{setMessage(value);operation.current=null;}}/><TouchableOpacity accessibilityLabel="Send reply" disabled={busy||!message.trim()} style={[s.send,(busy||!message.trim())&&s.disabled]} onPress={()=>void action("reply")}><Ionicons name="send" size={22} color="white"/></TouchableOpacity></View>}
 </KeyboardAvoidingView></SafeAreaView>;
}
const s=StyleSheet.create({
 thumbnail:{width:88,height:104,position:"relative"},removeImage:{position:"absolute",top:4,right:4,padding:5,borderRadius:14,backgroundColor:"#343434"},attachmentButton:{flexDirection:"row",alignItems:"center",gap:6,padding:8},
 page:{flex:1,backgroundColor:Colors.background},header:{flexDirection:"row",alignItems:"center",gap:14,padding:18},title:{fontSize:21,fontWeight:"700",color:Colors.primaryDark,flex:1},
 content:{padding:16,paddingBottom:32,gap:14},stack:{gap:14,marginBottom:14},section:{fontSize:18,fontWeight:"700",color:Colors.text},subject:{fontSize:16,fontWeight:"600",color:Colors.text,flexShrink:1},
 body:{fontSize:15,lineHeight:22,color:Colors.text},muted:{fontSize:12,lineHeight:18,color:Colors.textSecondary,flexShrink:1},label:{fontSize:14,fontWeight:"600",color:Colors.text},
 card:{backgroundColor:"white",borderRadius:8,borderWidth:1,borderColor:Colors.border,padding:14,gap:8,marginBottom:10},between:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:8,flexWrap:"wrap"},
 wrap:{flexDirection:"row",flexWrap:"wrap",gap:8},chip:{borderWidth:1,borderColor:Colors.border,borderRadius:8,paddingHorizontal:12,paddingVertical:9,marginRight:7},chipSelected:{backgroundColor:Colors.surfaceSecondary,borderColor:Colors.primary},
 primary:{backgroundColor:Colors.primary,borderRadius:8,padding:14,flexDirection:"row",justifyContent:"center",alignItems:"center",gap:8},primaryText:{color:"white",fontWeight:"700",fontSize:16},
 secondary:{padding:14,borderWidth:1,borderColor:Colors.border,borderRadius:8,alignItems:"center"},input:{backgroundColor:"white",borderWidth:1,borderColor:Colors.border,borderRadius:8,padding:12,fontSize:15,color:Colors.text},multiline:{minHeight:130},
 footer:{margin:16},disabled:{opacity:0.4},error:{color:"#B42318",lineHeight:21},empty:{paddingVertical:18,textAlign:"center",color:Colors.textSecondary},badge:{fontSize:12,fontWeight:"700",paddingHorizontal:8,paddingVertical:5,borderRadius:6,overflow:"hidden"},
 contact:{flexDirection:"row",gap:8,alignItems:"center",paddingVertical:8},link:{flexDirection:"row",gap:12,alignItems:"center",justifyContent:"space-between",backgroundColor:"white",margin:16,padding:16,borderWidth:1,borderColor:Colors.border,borderRadius:8},
 composer:{flexDirection:"row",gap:10,padding:12,paddingBottom:20,backgroundColor:"white",borderTopWidth:1,borderColor:Colors.border,alignItems:"flex-end"},send:{width:46,height:46,borderRadius:8,backgroundColor:Colors.primary,alignItems:"center",justifyContent:"center"},
});
