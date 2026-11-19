import React, { useCallback, useState } from "react";
import { ActivityIndicator, AppState, FlatList, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Role = "customer" | "admin" | "delivery" | "worker" | "veterinary";
type Faq = { id: string; question: string; answer: string };

export function FaqLink({ role }: { role: Role }) {
  const router = useRouter();
  return <TouchableOpacity accessibilityRole="button" style={s.link} onPress={() => router.push(`/(${role})/faqs` as any)}>
    <Ionicons name="help-circle-outline" color="#FF956F" size={24}/><Text style={s.question}>FAQs</Text><Ionicons name="chevron-forward" color="#8B6D5C" size={20}/>
  </TouchableOpacity>;
}

export default function FaqScreen({ role }: { role: Role }) {
  const router = useRouter();
  const [rows, setRows] = useState<Faq[]>([]), [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true), [refreshing, setRefreshing] = useState(false), [error, setError] = useState("");
  const refresh = React.useRef<() => void>(() => {});
  useFocusEffect(useCallback(() => {
    let active = true, pending = false;
    let controller: AbortController | null = null;
    const load = async (manual = false) => {
      if(pending) return;
      pending = true;
      if(manual) setRefreshing(true);
      controller = new AbortController();
      const timeout = setTimeout(() => controller?.abort(), 15000);
      try {
        const key = role === "worker" ? "worker_token" : role === "veterinary" ? "vet_token" : "access_token";
        const token = await AsyncStorage.getItem(key);
        if(!token) throw new Error("Please sign in to view FAQs.");
        const suffix = role === "worker" || role === "veterinary" ? `/${role}` : "";
        const response = await fetch(`${(process.env.EXPO_PUBLIC_BACKEND_URL || "").replace(/\/+$/, "")}/api/faqs${suffix}`, {headers:{Authorization:`Bearer ${token}`}, signal:controller.signal});
        if(!response.ok) throw new Error(response.status === 401 ? "Please sign in again." : "FAQs could not be loaded. Please try again.");
        const data = await response.json();
        if(!Array.isArray(data)) throw new Error("Invalid FAQ response.");
        if(active) {setRows(data); setError("");}
      } catch(e: any) {if(active) setError(e.name === "AbortError" ? "Request timed out. Pull down to retry." : e.message);}
      finally {clearTimeout(timeout); pending = false; if(active) {setLoading(false); setRefreshing(false);}}
    };
    refresh.current = () => {void load(true);};
    void load();
    const interval = setInterval(() => {if(AppState.currentState === "active") void load();}, 30000);
    const listener = AppState.addEventListener("change", state => {if(state === "active") void load();});
    return () => {active = false; controller?.abort(); clearInterval(interval); listener.remove(); refresh.current = () => {};};
  }, [role]));
  const filtered = rows.filter(row => `${row.question} ${row.answer}`.toLowerCase().includes(search.toLowerCase().trim()));
  return <SafeAreaView style={s.page} edges={["top"]}>
    <View style={s.header}><TouchableOpacity accessibilityLabel="Go back" onPress={() => router.canGoBack() ? router.back() : router.replace(`/(${role})` as any)}><Ionicons name="arrow-back" size={25} color="#FF956F"/></TouchableOpacity><Text style={s.title}>FAQs</Text></View>
    <View style={s.searchRow}><Ionicons name="search-outline" size={20} color="#8B6D5C"/><TextInput style={s.search} accessibilityLabel="Search FAQs" placeholder="Search questions" value={search} onChangeText={setSearch}/>{!!search&&<TouchableOpacity accessibilityLabel="Clear search" onPress={()=>setSearch("")}><Ionicons name="close-circle" size={20} color="#8B6D5C"/></TouchableOpacity>}</View>
    <View style={s.summary}><Text style={s.section}>Frequently asked questions</Text><Text style={s.count}>{filtered.length}</Text></View>
    {error ? <TouchableOpacity onPress={() => refresh.current()} style={s.error}><Text accessibilityRole="alert" style={{color:"#B42318"}}>{error}</Text><Text>Retry</Text></TouchableOpacity> : null}
    {loading ? <ActivityIndicator style={{marginTop:30}} color="#FF956F"/> : <FlatList data={filtered} keyExtractor={row => row.id} contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => refresh.current()}/>}
      ListEmptyComponent={<View style={s.emptyState}><Ionicons name="help-circle-outline" size={40} color="#BB6B3F"/><Text style={s.empty}>{search ? "No matching questions." : "No FAQs published yet."}</Text></View>}
      ListFooterComponent={<TouchableOpacity style={s.support} onPress={()=>router.push(`/(${role})/contact-support` as any)}><Ionicons name="headset-outline" size={22} color="#BB6B3F"/><Text style={s.question}>Contact support</Text><Ionicons name="arrow-forward" size={20} color="#BB6B3F"/></TouchableOpacity>}
      renderItem={({item}) => <View style={[s.card,expanded===item.id&&s.activeCard]}><TouchableOpacity accessibilityRole="button" accessibilityState={{expanded:expanded === item.id}} style={s.row} onPress={() => setExpanded(expanded === item.id ? null : item.id)}><Text style={s.question}>{item.question}</Text><Ionicons name={expanded === item.id ? "remove" : "add"} color="#BB6B3F" size={22}/></TouchableOpacity>{expanded === item.id && <Text style={s.answer}>{item.answer}</Text>}</View>}/>} 
  </SafeAreaView>;
}
const s = StyleSheet.create({
  page:{flex:1,backgroundColor:"#FFF8F2"}, header:{flexDirection:"row",alignItems:"center",gap:16,padding:20}, title:{fontSize:24,fontWeight:"700",color:"#FF956F"},
  searchRow:{marginHorizontal:16,marginBottom:16,paddingHorizontal:12,flexDirection:"row",alignItems:"center",gap:8,borderWidth:1,borderColor:"#EBDACD",backgroundColor:"white",borderRadius:8},search:{flex:1,paddingVertical:14,color:"#29251F",fontSize:15},
  summary:{flexDirection:"row",alignItems:"center",gap:10,paddingHorizontal:18},section:{flex:1,fontSize:15,fontWeight:"700",color:"#706256"},count:{color:"#706256",fontWeight:"600"},activeCard:{borderColor:"#FF956F"},support:{flexDirection:"row",alignItems:"center",gap:12,paddingVertical:20,marginTop:14,borderTopWidth:1,borderTopColor:"#EBDACD"},emptyState:{alignItems:"center",paddingTop:28},
  content:{padding:16,paddingBottom:40,gap:10}, card:{backgroundColor:"white",borderRadius:8,borderWidth:1,borderColor:"#EBDACD",padding:16},
  row:{flexDirection:"row",alignItems:"center",gap:12,minHeight:30}, question:{flex:1,fontSize:16,fontWeight:"600",color:"#29251F",lineHeight:23}, answer:{fontSize:15,lineHeight:24,color:"#706256",marginTop:14,paddingTop:12,borderTopWidth:1,borderTopColor:"#FFF0E8"},
  empty:{textAlign:"center",color:"#706256",paddingVertical:40}, error:{marginHorizontal:16,padding:12,gap:8}, link:{flexDirection:"row",alignItems:"center",gap:12,padding:16,margin:16,backgroundColor:"white",borderRadius:8,borderWidth:1,borderColor:"#EBDACD"},
});
