import React, {useState} from "react";
import {ActivityIndicator,Image,Modal,StyleSheet,Text,TouchableOpacity,View} from "react-native";
import {SafeAreaView} from "react-native-safe-area-context";
import {Ionicons} from "@expo/vector-icons";
import {supportRequest,SupportRole} from "../services/support";
import {Colors} from "../constants/colors";

export default function SupportScreenshots({role,ticketId,images}:{role:SupportRole;ticketId:string;images?:{id:string;name:string}[]}) {
 const [selected,setSelected]=useState<string|null>(null),[uri,setUri]=useState(""),[error,setError]=useState("");
 const request=React.useRef(0);
 React.useEffect(()=>()=>{request.current++;},[]);
 const show=async(id:string)=>{const seq=++request.current;setSelected(id);setUri("");setError("");try{const image=await supportRequest<{data_url:string}>(role,`/tickets/${ticketId}/screenshots/${id}`);if(seq===request.current)setUri(image.data_url);}catch(e:any){if(seq===request.current)setError(e.message);}};
 const close=()=>{request.current++;setSelected(null);setUri("");};
 if(!images?.length)return null;
 return <View style={{gap:10}}><Text style={{fontWeight:"700",color:Colors.text}}>Attachments · {images.length}</Text><View style={{flexDirection:"row",flexWrap:"wrap",gap:8}}>{images.map(item=><TouchableOpacity accessibilityRole="button" accessibilityLabel={`View ${item.name}`} key={item.id} style={s.attachment} onPress={()=>void show(item.id)}><Ionicons name="image-outline" size={24} color={Colors.primaryDark}/><Text style={{color:Colors.text}}>{item.name}</Text></TouchableOpacity>)}</View>
 <Modal visible={!!selected} onRequestClose={close} animationType="fade"><SafeAreaView style={s.viewer}><View style={s.bar}><Text style={s.white}>Screenshot</Text><TouchableOpacity accessibilityLabel="Close screenshot" onPress={close} style={{padding:12}}><Ionicons name="close" size={28} color="white"/></TouchableOpacity></View>{uri?<Image source={{uri}} resizeMode="contain" style={{flex:1}} onError={()=>{setUri("");setError("Could not display this screenshot.");}}/>:error?<TouchableOpacity onPress={()=>selected&&void show(selected)} style={{padding:24}}><Text style={s.white}>{error} Tap to retry.</Text></TouchableOpacity>:<ActivityIndicator color="white"/>}</SafeAreaView></Modal></View>;
}
const s=StyleSheet.create({attachment:{borderWidth:1,borderColor:Colors.border,borderRadius:8,backgroundColor:"white",padding:12,gap:8,flexDirection:"row",alignItems:"center"},viewer:{flex:1,backgroundColor:"#171717"},bar:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",paddingHorizontal:16},white:{color:"white",fontSize:16}});
