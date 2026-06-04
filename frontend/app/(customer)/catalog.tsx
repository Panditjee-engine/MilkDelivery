import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Animated,
  Vibration,
  Image,
  Dimensions,
} from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../src/services/api";
import { Colors } from "../../src/constants/colors";
import Button from "../../src/components/Button";
import LoadingScreen from "../../src/components/LoadingScreen";
import { useAuth } from "../../src/contexts/AuthContext";

const CARD_WIDTH = 134;
const SCREEN_WIDTH = Dimensions.get("window").width;
const DAIRY_CATEGORIES = ["milk", "dairy"];

// ─── Design tokens ─────────────────────────────────────────────────────────
const T = {
  bg: "#F9F8F6",
  surface: "#FFFFFF",
  border: "#EBEBEB",
  text: "#111111",
  muted: "#888888",
  faint: "#BBBBBB",
  accent: "#111111",
  amber: "#D97706",
  amberLight: "#FEF3C7",
  amberBorder: "#FDE68A",
  green: "#16A34A",
  greenLight: "#F0FDF4",
  red: "#DC2626",
  redLight: "#FEF2F2",
  orange: "#EA580C",
  orangeLight: "#FFF7ED",
  radius: { sm: 8, md: 12, lg: 16, xl: 20, full: 999 },
};

// ─── Data ──────────────────────────────────────────────────────────────────
const subscriptionPatterns = [
  { value: "daily",     label: "Daily",       icon: "sunny-outline",    hint: "Every day" },
  { value: "alternate", label: "Alternate",   icon: "repeat-outline",   hint: "Every other day" },
  { value: "custom",    label: "Custom",      icon: "calendar-outline", hint: "Pick days" },
];

const weekDays = [
  { value: 0, label: "Mon" }, { value: 1, label: "Tue" }, { value: 2, label: "Wed" },
  { value: 3, label: "Thu" }, { value: 4, label: "Fri" }, { value: 5, label: "Sat" },
  { value: 6, label: "Sun" },
];

const DELIVERY_SLOTS = [
  { value: "morning",   label: "Morning",   time: "6 AM – 9 AM",  icon: "sunny-outline" },
  { value: "afternoon", label: "Afternoon", time: "12 PM – 3 PM", icon: "partly-sunny-outline" },
  { value: "evening",   label: "Evening",   time: "5 PM – 8 PM",  icon: "moon-outline" },
];

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_NAMES   = ["Su","Mo","Tu","We","Th","Fr","Sa"];

const CATEGORY_THEMES: Record<string, { bg: string; accent: string; icon: string }> = {
  milk:       { bg: "#EBF5FF", accent: "#2563EB", icon: "water" },
  dairy:      { bg: "#FEF9EC", accent: "#CA8A04", icon: "ice-cream" },
  bakery:     { bg: "#FEF2F2", accent: "#DC2626", icon: "pizza" },
  fruits:     { bg: "#F0FDF4", accent: "#16A34A", icon: "nutrition" },
  vegetables: { bg: "#F0FDF4", accent: "#15803D", icon: "leaf" },
  essentials: { bg: "#F5F3FF", accent: "#7C3AED", icon: "basket" },
  other:      { bg: "#F5F5F4", accent: "#57534E", icon: "cube" },
};

interface CartItem {
  id: string; product: any; quantity: number; pattern: string; customDays: number[];
}

function isDairyProduct(p: any): boolean {
  return DAIRY_CATEGORIES.includes(p?.category?.toLowerCase());
}
function getCategoryTheme(cat: string) {
  return CATEGORY_THEMES[cat?.toLowerCase()] || CATEGORY_THEMES.other;
}
function formatUnit(unit: string): string {
  if (!unit) return "";
  const l = unit.toLowerCase().trim();
  const m = l.match(/^(\d+\.?\d*)\s*(l|litre|litres|liter|liters)$/) ||
            l.match(/^(\d+\.?\d*)\s*ml$/) ||
            l.match(/^(\d+\.?\d*)\s*kg$/) ||
            l.match(/^(\d+\.?\d*)\s*g$/);
  if (m) {
    if (l.match(/l(itre)?s?$/)) return `${m[1]}L`;
    if (l.endsWith("ml"))        return `${m[1]}ml`;
    if (l.endsWith("kg"))        return `${m[1]}kg`;
    if (l.endsWith("g"))         return `${m[1]}g`;
  }
  return unit.charAt(0).toUpperCase() + unit.slice(1);
}
function patternLabel(p: string) {
  return ({ daily:"Daily", alternate:"Alternate", custom:"Custom", buy_once:"Once" }[p] ?? p);
}
function formatDate(s: string): string {
  if (!s) return "";
  const d = new Date(s + "T00:00:00");
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0,3)} ${d.getFullYear()}`;
}
function dateToString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function estimateDeliveryCount(pattern: string, start: string, end: string|null, custom: number[]): number {
  if (!start) return 0;
  if (pattern === "buy_once") return 1;
  if (!end) return 30;
  const s = new Date(start + "T00:00:00"), e = new Date(end + "T00:00:00");
  let count = 0, cur = new Date(s), idx = 0;
  while (cur <= e) {
    const dow = cur.getDay() === 0 ? 6 : cur.getDay() - 1;
    if (pattern === "daily") count++;
    else if (pattern === "alternate" && idx % 2 === 0) count++;
    else if (pattern === "custom" && custom.includes(dow)) count++;
    cur.setDate(cur.getDate() + 1); idx++;
  }
  return count;
}

// ─── Mini Calendar ──────────────────────────────────────────────────────────
function MiniCalendar({ startDate, endDate, onSelect, accentColor, minDate, isBuyOnce }: {
  startDate: string|null; endDate: string|null;
  onSelect: (s: string, e: string|null) => void;
  accentColor: string; minDate?: string; isBuyOnce?: boolean;
}) {
  const today   = new Date();
  const init    = startDate ? new Date(startDate + "T00:00:00") : today;
  const [yr, setYr]   = useState(init.getFullYear());
  const [mo, setMo]   = useState(init.getMonth());
  const [sel, setSel] = useState<"start"|"end">(startDate ? "end" : "start");

  const minObj      = minDate ? new Date(minDate + "T00:00:00") : today;
  const daysInMonth = new Date(yr, mo+1, 0).getDate();
  const firstDay    = new Date(yr, mo, 1).getDay();

  const cells: (number|null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const ds = (day: number) => dateToString(new Date(yr, mo, day));
  const minStr = dateToString(minObj);

  const press = (day: number) => {
    const s = ds(day);
    if (s < minStr) return;
    if (isBuyOnce) { onSelect(s, s); return; }
    if (sel === "start" || !startDate) { onSelect(s, null); setSel("end"); }
    else if (s < startDate)            { onSelect(s, null); setSel("end"); }
    else                               { onSelect(startDate, s); setSel("start"); }
  };
  const prevMo = () => mo === 0 ? (setMo(11), setYr(y => y-1)) : setMo(m => m-1);
  const nextMo = () => mo === 11 ? (setMo(0),  setYr(y => y+1)) : setMo(m => m+1);

  return (
    <View style={calS.wrap}>
      <View style={calS.header}>
        <TouchableOpacity onPress={prevMo} style={calS.nav}><Ionicons name="chevron-back"    size={15} color={T.muted} /></TouchableOpacity>
        <Text style={calS.title}>{MONTH_NAMES[mo]} {yr}</Text>
        <TouchableOpacity onPress={nextMo} style={calS.nav}><Ionicons name="chevron-forward" size={15} color={T.muted} /></TouchableOpacity>
      </View>
      <View style={calS.names}>
        {DAY_NAMES.map(d => <Text key={d} style={calS.name}>{d}</Text>)}
      </View>
      <View style={calS.grid}>
        {cells.map((day, i) => {
          if (!day) return <View key={`e-${i}`} style={calS.cell} />;
          const str   = ds(day);
          const past  = str < minStr;
          const isS   = startDate === str;
          const isE   = endDate === str;
          const inR   = !!(startDate && endDate && str > startDate && str < endDate);
          const isTod = str === dateToString(today);
          return (
            <TouchableOpacity
              key={`d-${day}`}
              style={[calS.cell, inR && calS.cellRange, (isS||isE) && { backgroundColor: accentColor, borderRadius: 8 }, past && { opacity: 0.25 }]}
              onPress={() => !past && press(day)} activeOpacity={past ? 1 : 0.7}
            >
              <Text style={[calS.day, (isS||isE) && { color:"#fff", fontWeight:"800" }, isTod && !isS && !isE && { color: accentColor, fontWeight:"700" }]}>{day}</Text>
              {isTod && !isS && !isE && <View style={[calS.dot, { backgroundColor: accentColor }]} />}
            </TouchableOpacity>
          );
        })}
      </View>
      {!isBuyOnce && (
        <View style={calS.hint}>
          <Text style={[calS.hintTxt, { color: accentColor }]}>
            {sel === "start" ? "Tap to set start date" : "Tap to set end date (or skip)"}
          </Text>
        </View>
      )}
    </View>
  );
}

const calS = StyleSheet.create({
  wrap:  { paddingBottom: 4 },
  header:{ flexDirection:"row", alignItems:"center", justifyContent:"space-between", marginBottom: 12 },
  nav:   { width: 30, height: 30, borderRadius: T.radius.sm, backgroundColor:"#F5F5F3", justifyContent:"center", alignItems:"center" },
  title: { fontSize: 13, fontWeight:"700", color: T.text, letterSpacing: 0.2 },
  names: { flexDirection:"row", marginBottom: 6 },
  name:  { flex:1, textAlign:"center", fontSize: 10, fontWeight:"600", color: T.faint },
  grid:  { flexDirection:"row", flexWrap:"wrap" },
  cell:  { width:`${100/7}%`, aspectRatio:1, justifyContent:"center", alignItems:"center" },
  cellRange: { backgroundColor:"#11111110" },
  day:   { fontSize: 12, fontWeight:"500", color: T.text },
  dot:   { width: 3, height: 3, borderRadius: 2, position:"absolute", bottom: 4 },
  hint:  { marginTop: 8 },
  hintTxt:{ fontSize: 10, fontWeight:"600", textAlign:"center" },
});

// ─── Toast ──────────────────────────────────────────────────────────────────
function AddedToCartToast({ visible, productName, isSubscription }: { visible: boolean; productName: string; isSubscription?: boolean }) {
  const ty  = useRef(new Animated.Value(60)).current;
  const op  = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) {
      ty.setValue(60); op.setValue(0);
      Animated.parallel([
        Animated.spring(ty, { toValue:0, useNativeDriver:true, damping:16, stiffness:200 }),
        Animated.timing(op, { toValue:1, duration:180, useNativeDriver:true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(ty, { toValue:60, duration:200, useNativeDriver:true }),
        Animated.timing(op, { toValue:0,  duration:160, useNativeDriver:true }),
      ]).start();
    }
  }, [visible]);
  return (
    <Animated.View pointerEvents="none" style={[toastS.wrap, { opacity:op, transform:[{translateY:ty}] }]}>
      <View style={[toastS.dot, { backgroundColor: isSubscription ? T.amber : T.green }]} />
      <Text style={toastS.txt}>
        <Text style={{ fontWeight:"700" }}>{productName}</Text>
        {isSubscription ? " subscribed" : " added"}
      </Text>
    </Animated.View>
  );
}
const toastS = StyleSheet.create({
  wrap: { position:"absolute", bottom:100, alignSelf:"center", flexDirection:"row", alignItems:"center", gap:8, backgroundColor: T.text, paddingHorizontal:16, paddingVertical:11, borderRadius: T.radius.full, zIndex:999, shadowColor:"#000", shadowOpacity:0.15, shadowRadius:16, elevation:8 },
  dot:  { width:7, height:7, borderRadius:4 },
  txt:  { fontSize:13, color:"#fff", fontWeight:"500" },
});

// ─── Modals (Success, Info, WalletError) ───────────────────────────────────
function AnimCard({ visible, children }: { visible: boolean; children: React.ReactNode }) {
  const sc = useRef(new Animated.Value(0.92)).current;
  const op = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) {
      sc.setValue(0.92); op.setValue(0);
      Animated.parallel([
        Animated.spring(sc, { toValue:1, useNativeDriver:true, damping:15, stiffness:200 }),
        Animated.timing(op, { toValue:1, duration:180, useNativeDriver:true }),
      ]).start();
      Vibration.vibrate([0,50,30,60]);
    }
  }, [visible]);
  return (
    <Animated.View style={[mBase.card, { opacity:op, transform:[{scale:sc}] }]}>
      {children}
    </Animated.View>
  );
}

function SuccessModal({ visible, itemCount, isSubscription, onClose }: { visible:boolean; itemCount:number; isSubscription?:boolean; onClose:()=>void }) {
  const color = isSubscription ? T.amber : T.green;
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={mBase.overlay}>
        <AnimCard visible={visible}>
          <View style={[mBase.iconRing, { borderColor: color + "30", backgroundColor: color + "12" }]}>
            <Ionicons name={isSubscription ? "repeat" : "checkmark"} size={24} color={color} />
          </View>
          <Text style={mBase.title}>{isSubscription ? "Subscribed" : "Order Placed"}</Text>
          <Text style={mBase.sub}>{isSubscription ? "Delivery scheduled as configured." : `${itemCount} item${itemCount>1?"s":""} confirmed.`}</Text>
          <TouchableOpacity style={[mBase.btn, { backgroundColor: color }]} onPress={onClose}>
            <Text style={mBase.btnTxt}>Done</Text>
          </TouchableOpacity>
        </AnimCard>
      </View>
    </Modal>
  );
}

function InfoModal({ visible, onClose }: { visible:boolean; onClose:()=>void }) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={mBase.overlay}>
        <AnimCard visible={visible}>
          <View style={[mBase.iconRing, { borderColor: T.amberBorder, backgroundColor: T.amberLight }]}>
            <Ionicons name="calendar-outline" size={22} color={T.amber} />
          </View>
          <Text style={mBase.title}>Select Days</Text>
          <Text style={mBase.sub}>Choose at least one delivery day for your custom schedule.</Text>
          <TouchableOpacity style={[mBase.btn, { backgroundColor: T.amber }]} onPress={onClose}>
            <Text style={mBase.btnTxt}>Got it</Text>
          </TouchableOpacity>
        </AnimCard>
      </View>
    </Modal>
  );
}

function WalletErrorModal({ visible, walletBalance, orderTotal, onClose }: { visible:boolean; walletBalance:number; orderTotal:number; onClose:()=>void }) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={mBase.overlay}>
        <AnimCard visible={visible}>
          <View style={[mBase.iconRing, { borderColor:"#FDBA74", backgroundColor: T.orangeLight }]}>
            <Ionicons name="wallet-outline" size={22} color={T.orange} />
          </View>
          <Text style={mBase.title}>Low Balance</Text>
          <Text style={mBase.sub}>
            Wallet <Text style={{ fontWeight:"800", color: T.orange }}>₹{walletBalance.toFixed(2)}</Text>
            {" "}· Order <Text style={{ fontWeight:"800", color: T.text }}>₹{orderTotal.toFixed(2)}</Text>
            {"\n"}Please recharge to continue.
          </Text>
          <TouchableOpacity style={[mBase.btn, { backgroundColor: T.orange }]} onPress={onClose}>
            <Text style={mBase.btnTxt}>OK</Text>
          </TouchableOpacity>
        </AnimCard>
      </View>
    </Modal>
  );
}

const mBase = StyleSheet.create({
  overlay: { flex:1, backgroundColor:"rgba(0,0,0,0.48)", justifyContent:"center", alignItems:"center", padding:36 },
  card:    { backgroundColor: T.surface, borderRadius: 24, paddingHorizontal:24, paddingVertical:32, width:"100%", alignItems:"center", shadowColor:"#000", shadowOpacity:0.1, shadowRadius:28, elevation:12 },
  iconRing:{ width:56, height:56, borderRadius:28, borderWidth:1.5, justifyContent:"center", alignItems:"center", marginBottom:20 },
  title:   { fontSize:18, fontWeight:"800", color: T.text, marginBottom:6, letterSpacing:-0.4, textAlign:"center" },
  sub:     { fontSize:13, color: T.muted, textAlign:"center", lineHeight:20, marginBottom:24 },
  btn:     { width:"100%", paddingVertical:14, borderRadius: T.radius.md, alignItems:"center" },
  btnTxt:  { fontSize:15, fontWeight:"700", color:"#fff" },
});

// ─── Subscription Sheet ─────────────────────────────────────────────────────
function SubscriptionSheet({ visible, subscriptions, onClose, onCancel, cancelling }: {
  visible:boolean; subscriptions:any[]; onClose:()=>void; onCancel:(id:string)=>void; cancelling:string|null;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={ssS.overlay}>
        <View style={ssS.sheet}>
          <View style={ssS.handle} />
          <View style={ssS.header}>
            <View style={{ flexDirection:"row", alignItems:"center", gap:8 }}>
              <Text style={ssS.title}>Subscriptions</Text>
              {subscriptions.length > 0 && (
                <View style={ssS.badge}><Text style={ssS.badgeTxt}>{subscriptions.length}</Text></View>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={ssS.closeBtn}>
              <Ionicons name="close" size={15} color={T.muted} />
            </TouchableOpacity>
          </View>
          {subscriptions.length === 0 ? (
            <View style={ssS.empty}>
              <Ionicons name="repeat-outline" size={36} color={T.faint} />
              <Text style={ssS.emptyTxt}>No active subscriptions</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom:24 }}>
              {subscriptions.map(sub => {
                const theme = getCategoryTheme(sub.product?.category || "dairy");
                return (
                  <View key={sub.id} style={ssS.item}>
                    <View style={[ssS.icon, { backgroundColor: theme.bg }]}>
                      <Ionicons name={theme.icon as any} size={15} color={theme.accent} />
                    </View>
                    <View style={{ flex:1, gap:3 }}>
                      <Text style={ssS.name} numberOfLines={1}>{sub.product?.name ?? "Product"}</Text>
                      <View style={{ flexDirection:"row", alignItems:"center", gap:8 }}>
                        <Text style={ssS.pattern}>{patternLabel(sub.pattern)}</Text>
                        <Text style={ssS.meta}>Qty {sub.quantity}</Text>
                        <Text style={ssS.meta}>₹{(sub.amount ?? 0).toFixed(2)}</Text>
                      </View>
                      {sub.start_date && (
                        <Text style={ssS.date}>{formatDate(sub.start_date)}{sub.end_date ? ` → ${formatDate(sub.end_date)}` : " · Ongoing"}</Text>
                      )}
                    </View>
                    <TouchableOpacity
                      style={[ssS.cancelBtn, cancelling === sub.id && { opacity:0.4 }]}
                      onPress={() => onCancel(sub.id)} disabled={cancelling === sub.id}
                    >
                      <Text style={ssS.cancelTxt}>{cancelling === sub.id ? "…" : "Cancel"}</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}
const ssS = StyleSheet.create({
  overlay:   { flex:1, backgroundColor:"rgba(0,0,0,0.4)", justifyContent:"flex-end" },
  sheet:     { backgroundColor: T.surface, borderTopLeftRadius:24, borderTopRightRadius:24, paddingHorizontal:20, paddingTop:12, paddingBottom:36, maxHeight:"80%" },
  handle:    { width:36, height:3, backgroundColor: T.border, borderRadius:2, alignSelf:"center", marginBottom:18 },
  header:    { flexDirection:"row", alignItems:"center", justifyContent:"space-between", marginBottom:18 },
  title:     { fontSize:17, fontWeight:"800", color: T.text },
  badge:     { backgroundColor: T.amber, borderRadius:10, minWidth:20, height:20, alignItems:"center", justifyContent:"center", paddingHorizontal:5 },
  badgeTxt:  { fontSize:10, fontWeight:"800", color:"#fff" },
  closeBtn:  { width:30, height:30, borderRadius:T.radius.sm, backgroundColor:"#F5F5F3", justifyContent:"center", alignItems:"center" },
  item:      { flexDirection:"row", alignItems:"center", gap:12, paddingVertical:13, borderBottomWidth:1, borderBottomColor: T.border },
  icon:      { width:38, height:38, borderRadius: T.radius.sm, justifyContent:"center", alignItems:"center" },
  name:      { fontSize:13, fontWeight:"700", color: T.text },
  pattern:   { fontSize:10, fontWeight:"700", color: T.amber, backgroundColor: T.amberLight, paddingHorizontal:6, paddingVertical:2, borderRadius:6 },
  meta:      { fontSize:11, color: T.muted, fontWeight:"600" },
  date:      { fontSize:10, color: T.faint, fontWeight:"500" },
  cancelBtn: { paddingHorizontal:10, paddingVertical:6, borderRadius: T.radius.sm, borderWidth:1, borderColor:"#FECACA", backgroundColor: T.redLight },
  cancelTxt: { fontSize:10, fontWeight:"700", color: T.red },
  empty:     { alignItems:"center", paddingVertical:44, gap:8 },
  emptyTxt:  { fontSize:14, fontWeight:"600", color: T.faint },
});

// ─── Product Card ───────────────────────────────────────────────────────────
function ProductCard({ product, onBuyOnce, onSubscribe, onAddToCart, cartQty }: {
  product: any; onBuyOnce:()=>void; onSubscribe:()=>void; onAddToCart:()=>void; cartQty: number;
}) {
  const theme    = getCategoryTheme(product.category);
  const isDairy  = isDairyProduct(product);
  const noStock  = !product.is_available || (product.stock ?? 0) === 0;

  return (
    <View style={cardS.card}>
      <View style={[cardS.imgBox, { backgroundColor: theme.bg }]}>
        {product.image ? (
          <Image source={{ uri: product.image }} style={cardS.img} resizeMode="cover" />
        ) : (
          <View style={[cardS.iconBox, { backgroundColor: theme.accent + "18" }]}>
            <Ionicons name={theme.icon as any} size={22} color={theme.accent} />
          </View>
        )}
        {noStock && <View style={cardS.oosBadge}><Text style={cardS.oosTxt}>Out of stock</Text></View>}
        {isDairy && !noStock && (
          <View style={cardS.subBadge}>
            <Ionicons name="repeat-outline" size={8} color="#fff" />
          </View>
        )}
        {!isDairy && cartQty > 0 && (
          <View style={[cardS.qtyBadge, { backgroundColor: theme.accent }]}>
            <Text style={cardS.qtyBadgeTxt}>{cartQty}</Text>
          </View>
        )}
      </View>
      <View style={cardS.body}>
        <Text style={cardS.name} numberOfLines={1}>{product.name}</Text>
        <View style={cardS.priceRow}>
          <Text style={[cardS.price, { color: theme.accent }]}>₹{product.price}</Text>
          <Text style={[cardS.unit, { color: theme.accent + "88" }]}>{formatUnit(product.unit)}</Text>
        </View>
      </View>
      {noStock ? (
        <View style={cardS.actionRow}>
          <View style={cardS.oosBtn}><Text style={cardS.oosBtnTxt}>Unavailable</Text></View>
        </View>
      ) : isDairy ? (
        <View style={cardS.actionRow}>
          <TouchableOpacity style={[cardS.halfBtn, cardS.halfOutline, { borderColor: theme.accent }]} onPress={onBuyOnce} activeOpacity={0.7}>
            <Text style={[cardS.halfTxt, { color: theme.accent }]}>Once</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[cardS.halfBtn, { backgroundColor: T.amber }]} onPress={onSubscribe} activeOpacity={0.7}>
            <Ionicons name="repeat-outline" size={10} color="#fff" />
            <Text style={[cardS.halfTxt, { color:"#fff" }]}>Sub</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={cardS.actionRow}>
          <TouchableOpacity style={[cardS.fullBtn, { backgroundColor: theme.accent }]} onPress={onAddToCart} activeOpacity={0.7}>
            <Ionicons name="add" size={12} color="#fff" />
            <Text style={cardS.fullTxt}>Add</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
const cardS = StyleSheet.create({
  card:        { width: CARD_WIDTH, backgroundColor: T.surface, borderRadius: T.radius.lg, overflow:"hidden", shadowColor:"#000", shadowOpacity:0.04, shadowRadius:8, elevation:2 },
  imgBox:      { height:86, justifyContent:"center", alignItems:"center" },
  img:         { width:"100%", height:"100%" },
  iconBox:     { width:44, height:44, borderRadius:22, justifyContent:"center", alignItems:"center" },
  oosBadge:    { position:"absolute", bottom:5, left:5, backgroundColor:"rgba(0,0,0,0.45)", paddingHorizontal:5, paddingVertical:2, borderRadius:5 },
  oosTxt:      { color:"#fff", fontSize:8, fontWeight:"700" },
  subBadge:    { position:"absolute", top:5, right:5, backgroundColor: T.amber, width:16, height:16, borderRadius:8, justifyContent:"center", alignItems:"center" },
  qtyBadge:    { position:"absolute", top:5, right:5, width:18, height:18, borderRadius:9, justifyContent:"center", alignItems:"center" },
  qtyBadgeTxt: { fontSize:9, fontWeight:"800", color:"#fff" },
  body:        { padding:9, paddingBottom:6 },
  name:        { fontSize:11, fontWeight:"700", color: T.text, marginBottom:3 },
  priceRow:    { flexDirection:"row", alignItems:"center", justifyContent:"space-between" },
  price:       { fontSize:13, fontWeight:"800" },
  unit:        { fontSize:9, fontWeight:"600" },
  actionRow:   { flexDirection:"row", gap:5, paddingHorizontal:8, paddingBottom:8, paddingTop:2 },
  halfBtn:     { flex:1, flexDirection:"row", alignItems:"center", justifyContent:"center", gap:3, paddingVertical:6, borderRadius: T.radius.sm },
  halfOutline: { borderWidth:1.5, backgroundColor:"transparent" },
  halfTxt:     { fontSize:10, fontWeight:"800" },
  fullBtn:     { flex:1, flexDirection:"row", alignItems:"center", justifyContent:"center", gap:3, paddingVertical:7, borderRadius: T.radius.sm },
  fullTxt:     { fontSize:11, fontWeight:"800", color:"#fff" },
  oosBtn:      { flex:1, paddingVertical:7, borderRadius: T.radius.sm, backgroundColor:"#F0EFED", alignItems:"center" },
  oosBtnTxt:   { fontSize:10, fontWeight:"700", color: T.faint },
});

// ─── Category Section ────────────────────────────────────────────────────────
function CategorySection({ value, label, items, onBuyOnce, onSubscribe, onAddToCart, cart }: {
  value:string; label:string; items:any[];
  onBuyOnce:(i:any)=>void; onSubscribe:(i:any)=>void; onAddToCart:(i:any)=>void;
  cart:CartItem[];
}) {
  const theme = getCategoryTheme(value);
  const isDairyCat = DAIRY_CATEGORIES.includes(value.toLowerCase());
  return (
    <View style={secS.section}>
      <View style={secS.header}>
        <View style={[secS.dot, { backgroundColor: theme.accent }]} />
        <Text style={secS.title}>{label}</Text>
        <Text style={[secS.count, { color: theme.accent }]}>{items.length}</Text>
        {isDairyCat && (
          <View style={secS.subPill}>
            <Ionicons name="repeat-outline" size={8} color={T.amber} />
            <Text style={secS.subPillTxt}>Sub</Text>
          </View>
        )}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={secS.list}>
        {items.map(item => {
          const qty = cart.filter(c => c.product.id === item.id).reduce((s,c)=>s+c.quantity,0);
          return (
            <ProductCard key={item.id?.toString()} product={item} cartQty={qty}
              onBuyOnce={()=>onBuyOnce(item)} onSubscribe={()=>onSubscribe(item)} onAddToCart={()=>onAddToCart(item)} />
          );
        })}
      </ScrollView>
    </View>
  );
}
const secS = StyleSheet.create({
  section: { marginTop:24 },
  header:  { flexDirection:"row", alignItems:"center", gap:7, paddingHorizontal:20, marginBottom:12 },
  dot:     { width:6, height:6, borderRadius:3 },
  title:   { fontSize:14, fontWeight:"800", color: T.text, letterSpacing:-0.2 },
  count:   { fontSize:11, fontWeight:"700", opacity:0.6 },
  subPill: { flexDirection:"row", alignItems:"center", gap:3, backgroundColor: T.amberLight, borderRadius:6, paddingHorizontal:6, paddingVertical:2 },
  subPillTxt:{ fontSize:9, fontWeight:"700", color: T.amber },
  list:    { paddingLeft:20, paddingRight:8, gap:10 },
});

// ─── Quick Add Modal ────────────────────────────────────────────────────────
function QuickAddModal({ visible, product, walletBalance, onClose, onConfirm, submitting }: {
  visible:boolean; product:any; walletBalance:number;
  onClose:()=>void; onConfirm:(qty:number)=>void; submitting:boolean;
}) {
  const [qty, setQty] = useState(1);
  const theme = getCategoryTheme(product?.category);
  const total = (product?.price ?? 0) * qty;
  const ok    = walletBalance >= total;

  useEffect(() => { if (visible) setQty(1); }, [visible]);
  if (!product) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={sheetS.overlay}>
        <View style={sheetS.sheet}>
          <View style={sheetS.handle} />
          <View style={[sheetS.prodRow, { backgroundColor: theme.bg }]}>
            <View style={[sheetS.prodIcon, { backgroundColor: theme.accent + "20" }]}>
              <Ionicons name={theme.icon as any} size={22} color={theme.accent} />
            </View>
            <View style={{ flex:1 }}>
              <Text style={sheetS.prodName}>{product.name}</Text>
              <Text style={[sheetS.prodPrice, { color: theme.accent }]}>₹{product.price} · {formatUnit(product.unit)}</Text>
            </View>
            <TouchableOpacity style={sheetS.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={14} color={T.muted} />
            </TouchableOpacity>
          </View>

          <View style={qS.label}>
            <Ionicons name="bag-check-outline" size={12} color={T.muted} />
            <Text style={qS.labelTxt}>One-time purchase</Text>
          </View>

          <View style={sheetS.divider} />

          <Text style={sheetS.sectionLabel}>Quantity</Text>
          <View style={sheetS.qtyRow}>
            <TouchableOpacity style={sheetS.qtyBtn} onPress={()=>setQty(q=>Math.max(1,q-1))}>
              <Ionicons name="remove" size={15} color={T.text} />
            </TouchableOpacity>
            <View style={sheetS.qtyVal}>
              <Text style={sheetS.qtyNum}>{qty}</Text>
              <Text style={[sheetS.qtyUnit, { color: theme.accent }]}>{formatUnit(product.unit)}</Text>
            </View>
            <TouchableOpacity
              style={[sheetS.qtyBtn, { backgroundColor: theme.accent }]}
              onPress={()=>{ const m=product?.stock??Infinity; if(qty>=m){alert(`Only ${m} available`);return;} setQty(q=>q+1); }}
            >
              <Ionicons name="add" size={15} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={qS.summary}>
            <View style={qS.row}>
              <Text style={qS.label2}>Total</Text>
              <Text style={[qS.val, { color: theme.accent }]}>₹{total.toFixed(2)}</Text>
            </View>
            <View style={[qS.divLine]} />
            <View style={qS.row}>
              <View style={{ flexDirection:"row", alignItems:"center", gap:5 }}>
                <Ionicons name="wallet-outline" size={12} color={ok ? T.green : T.orange} />
                <Text style={qS.label2}>Wallet</Text>
              </View>
              <Text style={[qS.val, { color: ok ? T.green : T.orange }]}>₹{walletBalance.toFixed(2)}</Text>
            </View>
          </View>

          <View style={{ height:16 }} />
          <Button title={submitting ? "Adding…" : `Add to Cart · ₹${total.toFixed(2)}`} onPress={()=>onConfirm(qty)} loading={submitting} />
          <View style={{ height:16 }} />
        </View>
      </View>
    </Modal>
  );
}
const qS = StyleSheet.create({
  label:   { flexDirection:"row", alignItems:"center", gap:6, marginTop:12, marginBottom:2 },
  labelTxt:{ fontSize:11, fontWeight:"600", color: T.muted },
  summary: { backgroundColor:"#F7F6F4", borderRadius: T.radius.md, padding:14, marginTop:4 },
  row:     { flexDirection:"row", justifyContent:"space-between", alignItems:"center" },
  label2:  { fontSize:12, color: T.muted, fontWeight:"600" },
  val:     { fontSize:15, fontWeight:"800" },
  divLine: { height:1, backgroundColor: T.border, marginVertical:10 },
});

// ─── Subscribe Modal (3-step + delivery slot) ───────────────────────────────
function SubscribeModal({ visible, product, walletBalance, tomorrow, onClose, onSuccess, onToast }: {
  visible:boolean; product:any; walletBalance:number; tomorrow:string;
  onClose:()=>void;
  onSuccess:(refresh:()=>void)=>void;
  onToast:(n:string,s:boolean)=>void;
}) {
  const [step,       setStep]       = useState<1|2|3>(1);
  const [qty,        setQty]        = useState(1);
  const [pattern,    setPattern]    = useState("daily");
  const [customDays, setCustomDays] = useState<number[]>([]);
  const [slot,       setSlot]       = useState("morning");
  const [startDate,  setStartDate]  = useState<string|null>(null);
  const [endDate,    setEndDate]    = useState<string|null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [infoVis,    setInfoVis]    = useState(false);

  const theme     = getCategoryTheme(product?.category);
  const total     = (product?.price ?? 0) * qty;
  const canAfford = walletBalance >= total;
  const deliveries= estimateDeliveryCount(pattern, startDate ?? "", endDate, customDays);

  useEffect(() => {
    if (visible) {
      setStep(1); setQty(1); setPattern("daily");
      setCustomDays([]); setSlot("morning");
      setStartDate(tomorrow); setEndDate(null);
    }
  }, [visible, tomorrow]);

  const toggleDay = (d:number) => setCustomDays(p => p.includes(d) ? p.filter(x=>x!==d) : [...p,d]);

  const step1Next = () => {
    if (pattern === "custom" && customDays.length === 0) { setInfoVis(true); return; }
    setStep(2);
  };
  const step2Next = () => {
    if (!startDate) { alert("Please select a start date."); return; }
    setStep(3);
  };
  const confirm = async () => {
    setSubmitting(true);
    try {
      await api.createSubscription({
        product_id:   product.id,
        quantity:     qty,
        pattern,
        custom_days:  pattern === "custom" ? customDays : null,
        start_date:   startDate!,
        end_date:     endDate || null,
        amount:       product.price * qty,
        delivery_slot: slot,  // ← NEW FIELD
      });
      onClose();
      onToast(product.name, true);
      onSuccess(() => api.getWallet().then(w=>w.balance??0).catch(()=>walletBalance));
    } catch (e:any) {
      alert(e?.message || "Something went wrong");
    } finally { setSubmitting(false); }
  };

  if (!product) return null;

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent>
        <View style={sheetS.overlay}>
          <View style={[sheetS.sheet, step===2 && { maxHeight:"96%" }]}>
            <View style={sheetS.handle} />

            {/* Product header */}
            <View style={[sheetS.prodRow, { backgroundColor: theme.bg }]}>
              <View style={[sheetS.prodIcon, { backgroundColor: theme.accent + "20" }]}>
                <Ionicons name={theme.icon as any} size={22} color={theme.accent} />
              </View>
              <View style={{ flex:1 }}>
                <Text style={sheetS.prodName}>{product.name}</Text>
                <Text style={[sheetS.prodPrice, { color: theme.accent }]}>₹{product.price} · {formatUnit(product.unit)}</Text>
              </View>
              <TouchableOpacity style={sheetS.closeBtn} onPress={onClose}>
                <Ionicons name="close" size={14} color={T.muted} />
              </TouchableOpacity>
            </View>

            <View style={subModalS.subTag}>
              <Ionicons name="repeat-outline" size={11} color={T.amber} />
              <Text style={subModalS.subTagTxt}>Recurring subscription</Text>
            </View>

            <StepDots step={step} total={3} color={theme.accent} />

            {/* ── STEP 1: Pattern + Qty + Slot ── */}
            {step === 1 && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Quantity */}
                <Text style={sheetS.sectionLabel}>Quantity</Text>
                <View style={sheetS.qtyRow}>
                  <TouchableOpacity style={sheetS.qtyBtn} onPress={()=>setQty(q=>Math.max(1,q-1))}>
                    <Ionicons name="remove" size={15} color={T.text} />
                  </TouchableOpacity>
                  <View style={sheetS.qtyVal}>
                    <Text style={sheetS.qtyNum}>{qty}</Text>
                    <Text style={[sheetS.qtyUnit, { color: theme.accent }]}>{formatUnit(product.unit)}</Text>
                  </View>
                  <TouchableOpacity
                    style={[sheetS.qtyBtn, { backgroundColor: theme.accent }]}
                    onPress={()=>{ const m=product?.stock??Infinity; if(qty>=m){alert(`Only ${m} available`);return;} setQty(q=>q+1); }}
                  >
                    <Ionicons name="add" size={15} color="#fff" />
                  </TouchableOpacity>
                </View>

                <View style={subModalS.subtotalRow}>
                  <Text style={subModalS.subtotalLabel}>Per delivery</Text>
                  <Text style={[subModalS.subtotalVal, { color: theme.accent }]}>₹{total.toFixed(2)}</Text>
                </View>

                {/* Schedule */}
                <Text style={sheetS.sectionLabel}>Schedule</Text>
                <View style={subModalS.patternRow}>
                  {subscriptionPatterns.map(p => {
                    const active = pattern === p.value;
                    return (
                      <TouchableOpacity
                        key={p.value}
                        style={[subModalS.patternCard, active && { backgroundColor: theme.accent, borderColor: theme.accent }]}
                        onPress={()=>setPattern(p.value)}
                      >
                        <Ionicons name={p.icon as any} size={16} color={active ? "#fff" : theme.accent} />
                        <Text style={[subModalS.patternLabel, active && { color:"#fff" }]}>{p.label}</Text>
                        <Text style={[subModalS.patternHint, { color: active ? "rgba(255,255,255,0.7)" : T.faint }]}>{p.hint}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {pattern === "custom" && (
                  <>
                    <Text style={sheetS.sectionLabel}>Days</Text>
                    <View style={subModalS.daysRow}>
                      {weekDays.map(d => {
                        const sel = customDays.includes(d.value);
                        return (
                          <TouchableOpacity
                            key={d.value}
                            style={[subModalS.dayPill, sel && { backgroundColor: theme.accent, borderColor: theme.accent }]}
                            onPress={()=>toggleDay(d.value)}
                          >
                            <Text style={[subModalS.dayTxt, sel && { color:"#fff" }]}>{d.label}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    {customDays.length > 0 && (
                      <Text style={subModalS.daysHint}>{customDays.length} day{customDays.length>1?"s":""} / week</Text>
                    )}
                  </>
                )}

                {/* Delivery Slot — NEW */}
                <Text style={sheetS.sectionLabel}>Delivery Slot</Text>
                <View style={subModalS.slotRow}>
                  {DELIVERY_SLOTS.map(s => {
                    const active = slot === s.value;
                    return (
                      <TouchableOpacity
                        key={s.value}
                        style={[subModalS.slotCard, active && { borderColor: theme.accent, backgroundColor: theme.bg }]}
                        onPress={()=>setSlot(s.value)}
                      >
                        <Ionicons name={s.icon as any} size={15} color={active ? theme.accent : T.faint} />
                        <Text style={[subModalS.slotLabel, active && { color: theme.accent }]}>{s.label}</Text>
                        <Text style={subModalS.slotTime}>{s.time}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={{ height:16 }} />
                <Button title="Next: Choose Dates →" onPress={step1Next} />
                <View style={{ height:16 }} />
              </ScrollView>
            )}

            {/* ── STEP 2: Calendar ── */}
            {step === 2 && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <TouchableOpacity style={subModalS.back} onPress={()=>setStep(1)}>
                  <Ionicons name="arrow-back" size={13} color={T.muted} />
                  <Text style={subModalS.backTxt}>Back</Text>
                </TouchableOpacity>

                <View style={[subModalS.infoBanner, { backgroundColor: theme.bg, borderColor: theme.accent + "30" }]}>
                  <Ionicons name="calendar-outline" size={12} color={theme.accent} />
                  <Text style={[subModalS.infoTxt, { color: theme.accent }]}>Set your window. End date is optional.</Text>
                </View>

                <View style={subModalS.rangeRow}>
                  <View style={[subModalS.rangeBox, startDate && { borderColor: theme.accent }]}>
                    <Text style={subModalS.rangeLabel}>Start</Text>
                    <Text style={[subModalS.rangeVal, { color: startDate ? theme.accent : T.faint }]}>{startDate ? formatDate(startDate) : "—"}</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={12} color={T.faint} />
                  <View style={[subModalS.rangeBox, endDate && { borderColor: T.amber }]}>
                    <Text style={subModalS.rangeLabel}>End</Text>
                    <Text style={[subModalS.rangeVal, { color: endDate ? T.amber : T.faint }]}>{endDate ? formatDate(endDate) : "Ongoing"}</Text>
                  </View>
                </View>

                <View style={[subModalS.calCard, { borderColor: theme.accent + "25" }]}>
                  <MiniCalendar startDate={startDate} endDate={endDate}
                    onSelect={(s,e)=>{ setStartDate(s); setEndDate(e); }}
                    accentColor={theme.accent} minDate={tomorrow} isBuyOnce={false} />
                </View>

                {startDate && (
                  <View style={[subModalS.estimate, { backgroundColor: theme.bg, borderColor: theme.accent + "22" }]}>
                    <Ionicons name="cube-outline" size={12} color={theme.accent} />
                    <Text style={[subModalS.estimateTxt, { color: theme.accent }]}>
                      ~{deliveries} deliveries {!endDate ? "(30-day est.)" : "in this period"}
                    </Text>
                  </View>
                )}

                <View style={{ height:12 }} />
                <Button title="Next: Review →" onPress={step2Next} disabled={!startDate} />
                <View style={{ height:16 }} />
              </ScrollView>
            )}

            {/* ── STEP 3: Summary ── */}
            {step === 3 && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <TouchableOpacity style={subModalS.back} onPress={()=>setStep(2)}>
                  <Ionicons name="arrow-back" size={13} color={T.muted} />
                  <Text style={subModalS.backTxt}>Back</Text>
                </TouchableOpacity>

                <View style={reviewS.card}>
                  <Text style={reviewS.title}>Summary</Text>
                  {[
                    ["Product",   product.name],
                    ["Quantity",  `${qty} × ${formatUnit(product.unit)}`],
                    ["Schedule",  subscriptionPatterns.find(p=>p.value===pattern)?.label + (pattern==="custom" && customDays.length>0 ? ` · ${customDays.map(d=>weekDays[d].label).join(", ")}` : "")],
                    ["Slot",      DELIVERY_SLOTS.find(s=>s.value===slot)?.label + " (" + DELIVERY_SLOTS.find(s=>s.value===slot)?.time + ")"],
                    ["Start",     formatDate(startDate ?? "")],
                    ["End",       endDate ? formatDate(endDate) : "Open-ended"],
                    ...(deliveries > 0 ? [["Deliveries", `~${deliveries}${!endDate?" (est.)":""}`]] : []),
                  ].map(([k,v]) => (
                    <View key={k} style={reviewS.row}>
                      <Text style={reviewS.key}>{k}</Text>
                      <Text style={reviewS.val} numberOfLines={2}>{v}</Text>
                    </View>
                  ))}
                  <View style={reviewS.divider} />
                  <View style={reviewS.totalRow}>
                    <Text style={reviewS.totalLabel}>Per delivery</Text>
                    <Text style={[reviewS.totalVal, { color: theme.accent }]}>₹{total.toFixed(2)}</Text>
                  </View>
                  <Text style={reviewS.note}>Deducted from wallet each delivery</Text>
                </View>

                <View style={[reviewS.walletRow, { borderColor: canAfford ? "#BBF7D0" : "#FED7AA", backgroundColor: canAfford ? T.greenLight : T.orangeLight }]}>
                  <View style={{ flexDirection:"row", alignItems:"center", gap:8 }}>
                    <Ionicons name="wallet-outline" size={14} color={canAfford ? T.green : T.orange} />
                    <View>
                      <Text style={reviewS.walletLabel}>Wallet</Text>
                      <Text style={[reviewS.walletVal, { color: canAfford ? T.green : T.orange }]}>₹{walletBalance.toFixed(2)}</Text>
                    </View>
                  </View>
                  <View style={[reviewS.statusPill, { backgroundColor: canAfford ? "#DCF5E8" : "#FEE2C8" }]}>
                    <Ionicons name={canAfford ? "checkmark-circle" : "warning"} size={12} color={canAfford ? T.green : T.orange} />
                    <Text style={[reviewS.statusTxt, { color: canAfford ? T.green : T.orange }]}>
                      {canAfford ? "Sufficient" : "Low"}
                    </Text>
                  </View>
                </View>

                {!canAfford && (
                  <View style={reviewS.warn}>
                    <Ionicons name="information-circle-outline" size={13} color={T.orange} />
                    <Text style={reviewS.warnTxt}>Balance is below order amount. Recharge before confirming.</Text>
                  </View>
                )}

                <View style={{ height:14 }} />
                <Button
                  title={submitting ? "Subscribing…" : `Confirm · ₹${total.toFixed(2)}/delivery`}
                  onPress={confirm} loading={submitting} disabled={!canAfford}
                />
                <View style={{ height:16 }} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
      <InfoModal visible={infoVis} onClose={()=>setInfoVis(false)} />
    </>
  );
}

const subModalS = StyleSheet.create({
  subTag:       { flexDirection:"row", alignItems:"center", gap:6, marginTop:10, marginBottom:2 },
  subTagTxt:    { fontSize:11, fontWeight:"600", color: T.amber },
  subtotalRow:  { flexDirection:"row", justifyContent:"space-between", alignItems:"center", backgroundColor:"#F7F6F4", borderRadius: T.radius.md, paddingHorizontal:14, paddingVertical:10, marginBottom:20 },
  subtotalLabel:{ fontSize:12, fontWeight:"600", color: T.muted },
  subtotalVal:  { fontSize:16, fontWeight:"800" },
  patternRow:   { flexDirection:"row", flexWrap:"wrap", gap:8, marginBottom:14 },
  patternCard:  { width:"47%", padding:12, borderRadius: T.radius.md, backgroundColor:"#F7F6F4", borderWidth:1.5, borderColor:"transparent", gap:4 },
  patternLabel: { fontSize:12, fontWeight:"700", color: T.text },
  patternHint:  { fontSize:10, fontWeight:"500" },
  // Delivery days
  daysRow:      { flexDirection:"row", flexWrap:"wrap", gap:7, marginBottom:6 },
  dayPill:      { paddingHorizontal:11, paddingVertical:7, borderRadius: T.radius.full, backgroundColor:"#F5F5F3", borderWidth:1.5, borderColor: T.border },
  dayTxt:       { fontSize:11, fontWeight:"700", color: T.muted },
  daysHint:     { fontSize:11, color: T.muted, marginBottom:16, fontWeight:"500" },
  // Slot
  slotRow:      { flexDirection:"row", gap:8, marginBottom:14 },
  slotCard:     { flex:1, alignItems:"center", paddingVertical:12, borderRadius: T.radius.md, backgroundColor:"#F7F6F4", borderWidth:1.5, borderColor: T.border, gap:4 },
  slotLabel:    { fontSize:11, fontWeight:"700", color: T.text },
  slotTime:     { fontSize:9, fontWeight:"500", color: T.faint, textAlign:"center" },
  // Step 2
  back:         { flexDirection:"row", alignItems:"center", gap:5, marginBottom:14 },
  backTxt:      { fontSize:12, color: T.muted, fontWeight:"600" },
  infoBanner:   { flexDirection:"row", alignItems:"center", gap:7, borderWidth:1, borderRadius: T.radius.sm, paddingHorizontal:12, paddingVertical:9, marginBottom:14 },
  infoTxt:      { fontSize:11, fontWeight:"600", flex:1 },
  rangeRow:     { flexDirection:"row", alignItems:"center", gap:10, marginBottom:14 },
  rangeBox:     { flex:1, borderWidth:1.5, borderColor: T.border, borderRadius: T.radius.md, paddingHorizontal:12, paddingVertical:10 },
  rangeLabel:   { fontSize:9, fontWeight:"700", color: T.faint, textTransform:"uppercase", letterSpacing:0.5, marginBottom:2 },
  rangeVal:     { fontSize:12, fontWeight:"700" },
  calCard:      { borderWidth:1.5, borderRadius: T.radius.lg, padding:12, marginBottom:12 },
  estimate:     { flexDirection:"row", alignItems:"center", gap:7, borderWidth:1, borderRadius: T.radius.sm, paddingHorizontal:12, paddingVertical:9, marginBottom:4 },
  estimateTxt:  { fontSize:11, fontWeight:"700" },
});

const reviewS = StyleSheet.create({
  card:        { borderWidth:1.5, borderColor: T.border, borderRadius: T.radius.lg, padding:16, marginBottom:14, backgroundColor:"#FAFAF8" },
  title:       { fontSize:12, fontWeight:"800", color: T.text, marginBottom:14, textTransform:"uppercase", letterSpacing:0.5 },
  row:         { flexDirection:"row", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 },
  key:         { fontSize:12, color: T.muted, fontWeight:"500" },
  val:         { fontSize:12, fontWeight:"700", color: T.text, maxWidth:"55%", textAlign:"right" },
  divider:     { height:1, backgroundColor: T.border, marginVertical:12 },
  totalRow:    { flexDirection:"row", justifyContent:"space-between", alignItems:"center" },
  totalLabel:  { fontSize:13, fontWeight:"700", color: T.text },
  totalVal:    { fontSize:20, fontWeight:"900", letterSpacing:-0.5 },
  note:        { fontSize:10, color: T.faint, marginTop:4, textAlign:"right" },
  walletRow:   { flexDirection:"row", alignItems:"center", justifyContent:"space-between", borderWidth:1.5, borderRadius: T.radius.md, paddingHorizontal:14, paddingVertical:12, marginBottom:10 },
  walletLabel: { fontSize:9, color: T.muted, fontWeight:"600", textTransform:"uppercase", letterSpacing:0.5 },
  walletVal:   { fontSize:16, fontWeight:"800", marginTop:2 },
  statusPill:  { flexDirection:"row", alignItems:"center", gap:4, borderRadius: T.radius.sm, paddingHorizontal:10, paddingVertical:6 },
  statusTxt:   { fontSize:11, fontWeight:"700" },
  warn:        { flexDirection:"row", alignItems:"flex-start", gap:7, backgroundColor: T.orangeLight, borderRadius: T.radius.sm, paddingHorizontal:12, paddingVertical:10, marginBottom:6 },
  warnTxt:     { fontSize:11, color: T.orange, fontWeight:"600", flex:1, lineHeight:16 },
});

// ─── Shared sheet styles ────────────────────────────────────────────────────
const sheetS = StyleSheet.create({
  overlay:      { flex:1, backgroundColor:"rgba(0,0,0,0.4)", justifyContent:"flex-end" },
  sheet:        { backgroundColor: T.surface, borderTopLeftRadius:24, borderTopRightRadius:24, paddingHorizontal:20, paddingTop:12, paddingBottom:34, maxHeight:"92%" },
  handle:       { width:36, height:3, backgroundColor: T.border, borderRadius:2, alignSelf:"center", marginBottom:14 },
  prodRow:      { flexDirection:"row", alignItems:"center", gap:12, borderRadius: T.radius.md, padding:12, marginBottom:4 },
  prodIcon:     { width:46, height:46, borderRadius: T.radius.sm, justifyContent:"center", alignItems:"center" },
  prodName:     { fontSize:14, fontWeight:"800", color: T.text, marginBottom:3 },
  prodPrice:    { fontSize:12, fontWeight:"600" },
  closeBtn:     { width:30, height:30, borderRadius: T.radius.sm, backgroundColor:"rgba(0,0,0,0.06)", justifyContent:"center", alignItems:"center" },
  divider:      { height:1, backgroundColor: T.border, marginVertical:14 },
  sectionLabel: { fontSize:9, fontWeight:"700", color: T.faint, letterSpacing:1, textTransform:"uppercase", marginBottom:10, marginTop:2 },
  qtyRow:       { flexDirection:"row", alignItems:"center", marginBottom:14, gap:16 },
  qtyBtn:       { width:36, height:36, borderRadius: T.radius.sm, backgroundColor:"#F5F5F3", justifyContent:"center", alignItems:"center" },
  qtyVal:       { alignItems:"center", minWidth:54 },
  qtyNum:       { fontSize:24, fontWeight:"800", color: T.text },
  qtyUnit:      { fontSize:10, fontWeight:"700", marginTop:1 },
});

// ─── Step Dots ──────────────────────────────────────────────────────────────
function StepDots({ step, total, color }: { step:number; total:number; color:string }) {
  return (
    <View style={dotsS.row}>
      {Array.from({length:total}).map((_,i) => (
        <React.Fragment key={i}>
          <View style={[dotsS.dot, i < step && { backgroundColor: color }, i === step-1 && { width:18 }]} />
          {i < total-1 && <View style={[dotsS.line, i < step-1 && { backgroundColor: color }]} />}
        </React.Fragment>
      ))}
    </View>
  );
}
const dotsS = StyleSheet.create({
  row:  { flexDirection:"row", alignItems:"center", justifyContent:"center", gap:4, marginBottom:18, marginTop:8 },
  dot:  { width:7, height:7, borderRadius:4, backgroundColor: T.border },
  line: { width:20, height:1.5, backgroundColor: T.border, borderRadius:1 },
});

// ─── Cart Sheet ─────────────────────────────────────────────────────────────
function CartSheet({ visible, cart, walletBalance, onClose, onRemove, onUpdateQty, onPlaceOrder, submitting }: {
  visible:boolean; cart:CartItem[]; walletBalance:number; onClose:()=>void;
  onRemove:(id:string)=>void; onUpdateQty:(id:string,q:number)=>void;
  onPlaceOrder:()=>void; submitting:boolean;
}) {
  const slide   = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const overlay = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slide,   { toValue:0, useNativeDriver:true, damping:20, stiffness:220 }),
        Animated.timing(overlay, { toValue:1, duration:200, useNativeDriver:true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slide,   { toValue:SCREEN_WIDTH, duration:220, useNativeDriver:true }),
        Animated.timing(overlay, { toValue:0, duration:180, useNativeDriver:true }),
      ]).start();
    }
  }, [visible]);

  const cartTotal = cart.reduce((s,i)=>s+i.product.price*i.quantity,0);
  const canAfford = walletBalance >= cartTotal;
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none">
      <View style={{ flex:1 }}>
        <Animated.View style={[cartS.overlay, { opacity:overlay }]}>
          <TouchableOpacity style={{ flex:1 }} onPress={onClose} activeOpacity={1} />
        </Animated.View>
        <Animated.View style={[cartS.sidebar, { transform:[{translateX:slide}] }]}>
          <View style={cartS.header}>
            <TouchableOpacity onPress={onClose} style={cartS.backBtn}>
              <Ionicons name="arrow-back" size={16} color={T.muted} />
            </TouchableOpacity>
            <Text style={cartS.title}>Cart</Text>
            {cart.length > 0 && <View style={cartS.badge}><Text style={cartS.badgeTxt}>{cart.length}</Text></View>}
          </View>

          <View style={cartS.walletStrip}>
            <View style={{ flexDirection:"row", alignItems:"center", gap:6 }}>
              <Ionicons name="wallet-outline" size={12} color={canAfford ? T.green : T.orange} />
              <Text style={cartS.walletLabel}>Wallet</Text>
            </View>
            <Text style={[cartS.walletBal, { color: canAfford ? T.green : T.orange }]}>₹{walletBalance.toFixed(2)}</Text>
          </View>

          <View style={cartS.divider} />

          {cart.length === 0 ? (
            <View style={cartS.empty}>
              <Ionicons name="cart-outline" size={36} color={T.faint} />
              <Text style={cartS.emptyTxt}>Cart is empty</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom:8 }}>
              {cart.map(item => {
                const theme = getCategoryTheme(item.product.category);
                return (
                  <View key={item.id} style={cartS.item}>
                    <View style={[cartS.icon, { backgroundColor: theme.bg }]}>
                      <Ionicons name={theme.icon as any} size={14} color={theme.accent} />
                    </View>
                    <View style={{ flex:1 }}>
                      <Text style={cartS.itemName} numberOfLines={2}>{item.product.name}</Text>
                      <Text style={cartS.itemPrice}>₹{(item.product.price*item.quantity).toFixed(2)}</Text>
                    </View>
                    <View style={cartS.qtyRow}>
                      <TouchableOpacity style={cartS.qtyBtn} onPress={()=>item.quantity>1?onUpdateQty(item.id,item.quantity-1):onRemove(item.id)}>
                        <Ionicons name={item.quantity===1?"trash-outline":"remove"} size={11} color={item.quantity===1?T.red:T.text} />
                      </TouchableOpacity>
                      <Text style={cartS.qtyVal}>{item.quantity}</Text>
                      <TouchableOpacity
                        style={[cartS.qtyBtn, { backgroundColor: theme.accent }]}
                        onPress={()=>{ const m=item.product.stock??0; if(item.quantity>=m){alert(`Only ${m} available`);return;} onUpdateQty(item.id,item.quantity+1); }}
                      >
                        <Ionicons name="add" size={11} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}

          {cart.length > 0 && (
            <View style={cartS.footer}>
              <View style={cartS.divider} />
              <View style={cartS.totalRow}>
                <Text style={cartS.totalLabel}>Total</Text>
                <Text style={[cartS.totalVal, { color: canAfford ? T.text : T.orange }]}>₹{cartTotal.toFixed(2)}</Text>
              </View>
              {!canAfford && (
                <View style={cartS.lowBal}>
                  <Ionicons name="warning-outline" size={11} color={T.orange} />
                  <Text style={cartS.lowBalTxt}>Insufficient balance. Recharge to order.</Text>
                </View>
              )}
              <Button title={submitting ? "Placing Order…" : `Place Order · ₹${cartTotal.toFixed(2)}`} onPress={onPlaceOrder} loading={submitting} disabled={!canAfford} />
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}
const cartS = StyleSheet.create({
  overlay:   { ...StyleSheet.absoluteFillObject, backgroundColor:"rgba(0,0,0,0.4)" },
  sidebar:   { position:"absolute", top:0, right:0, bottom:0, width:SCREEN_WIDTH*0.82, backgroundColor: T.surface, borderTopLeftRadius:24, borderBottomLeftRadius:24, paddingBottom:34, shadowColor:"#000", shadowOpacity:0.14, shadowRadius:24, elevation:18 },
  header:    { flexDirection:"row", alignItems:"center", paddingHorizontal:16, paddingTop:52, paddingBottom:14, gap:10 },
  backBtn:   { width:32, height:32, borderRadius: T.radius.sm, backgroundColor:"#F5F5F3", justifyContent:"center", alignItems:"center" },
  title:     { fontSize:17, fontWeight:"800", color: T.text, flex:1 },
  badge:     { backgroundColor: Colors.primary, borderRadius:10, minWidth:20, height:20, alignItems:"center", justifyContent:"center", paddingHorizontal:5 },
  badgeTxt:  { fontSize:10, fontWeight:"800", color:"#fff" },
  walletStrip:{ flexDirection:"row", alignItems:"center", justifyContent:"space-between", backgroundColor:"#F7F6F4", borderRadius: T.radius.md, paddingHorizontal:14, paddingVertical:10, marginHorizontal:16, marginBottom:6 },
  walletLabel:{ fontSize:12, fontWeight:"600", color: T.muted },
  walletBal: { fontSize:14, fontWeight:"800" },
  divider:   { height:1, backgroundColor: T.border, marginVertical:10 },
  item:      { flexDirection:"row", alignItems:"center", gap:10, paddingVertical:11, paddingHorizontal:16, borderBottomWidth:1, borderBottomColor: T.border },
  icon:      { width:36, height:36, borderRadius: T.radius.sm, justifyContent:"center", alignItems:"center" },
  itemName:  { fontSize:12, fontWeight:"700", color: T.text, marginBottom:3 },
  itemPrice: { fontSize:11, fontWeight:"700", color: T.muted },
  qtyRow:    { flexDirection:"row", alignItems:"center", gap:6 },
  qtyBtn:    { width:24, height:24, borderRadius:7, backgroundColor:"#F5F5F3", justifyContent:"center", alignItems:"center" },
  qtyVal:    { fontSize:13, fontWeight:"800", color: T.text, minWidth:16, textAlign:"center" },
  footer:    { paddingHorizontal:16 },
  totalRow:  { flexDirection:"row", justifyContent:"space-between", alignItems:"center", paddingVertical:8 },
  totalLabel:{ fontSize:13, fontWeight:"700", color: T.muted },
  totalVal:  { fontSize:19, fontWeight:"800" },
  lowBal:    { flexDirection:"row", alignItems:"center", gap:6, backgroundColor: T.orangeLight, borderRadius: T.radius.sm, paddingHorizontal:12, paddingVertical:9, marginBottom:10 },
  lowBalTxt: { fontSize:11, fontWeight:"600", color: T.orange, flex:1 },
  empty:     { alignItems:"center", paddingVertical:60, gap:8, flex:1, justifyContent:"center" },
  emptyTxt:  { fontSize:14, fontWeight:"600", color: T.faint },
});

// ─── Mini Cart Pill ─────────────────────────────────────────────────────────
function MiniCartPill({ cart, onPress }: { cart:CartItem[]; onPress:()=>void }) {
  const ty    = useRef(new Animated.Value(80)).current;
  const sc    = useRef(new Animated.Value(0.9)).current;
  const bounce= useRef(new Animated.Value(1)).current;
  const prev  = useRef(0);
  const total = cart.reduce((s,c)=>s+c.quantity,0);
  const sum   = cart.reduce((s,i)=>s+i.product.price*i.quantity,0);

  useEffect(() => {
    if (total > 0) {
      Animated.parallel([
        Animated.spring(ty, { toValue:0, useNativeDriver:true, damping:18, stiffness:220 }),
        Animated.spring(sc, { toValue:1, useNativeDriver:true, damping:14, stiffness:200 }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(ty, { toValue:80, useNativeDriver:true, damping:18, stiffness:220 }),
        Animated.spring(sc, { toValue:0.9, useNativeDriver:true, damping:14, stiffness:200 }),
      ]).start();
    }
    if (total > 0 && total !== prev.current) {
      Animated.sequence([
        Animated.spring(bounce, { toValue:1.1, useNativeDriver:true, damping:6, stiffness:400 }),
        Animated.spring(bounce, { toValue:1,   useNativeDriver:true, damping:10, stiffness:300 }),
      ]).start();
    }
    prev.current = total;
  }, [total]);

  if (total === 0) return null;

  return (
    <Animated.View style={[pillS.wrap, { transform:[{translateY:ty},{scale:sc}] }]}>
      <TouchableOpacity style={pillS.pill} onPress={onPress} activeOpacity={0.9}>
        <Animated.View style={[pillS.badge, { transform:[{scale:bounce}] }]}>
          <Text style={pillS.badgeTxt}>{total}</Text>
        </Animated.View>
        <View style={{ flex:1 }}>
          <Text style={pillS.label}>View Cart</Text>
          <Text style={pillS.sub}>{cart.length} item{cart.length>1?"s":""}</Text>
        </View>
        <Text style={pillS.total}>₹{sum.toFixed(0)}</Text>
        <View style={pillS.arrow}><Ionicons name="chevron-forward" size={12} color={Colors.primary} /></View>
      </TouchableOpacity>
    </Animated.View>
  );
}
const pillS = StyleSheet.create({
  wrap:    { position:"absolute", bottom:20, left:16, right:16, zIndex:100, shadowColor:"#000", shadowOpacity:0.14, shadowRadius:18, elevation:12 },
  pill:    { flexDirection:"row", alignItems:"center", backgroundColor: T.text, borderRadius:18, paddingVertical:10, paddingLeft:10, paddingRight:12, gap:10 },
  badge:   { backgroundColor: Colors.primary, borderRadius:12, minWidth:30, height:30, justifyContent:"center", alignItems:"center", paddingHorizontal:6 },
  badgeTxt:{ fontSize:13, fontWeight:"900", color:"#fff" },
  label:   { fontSize:13, fontWeight:"800", color:"#fff" },
  sub:     { fontSize:10, color:"rgba(255,255,255,0.5)", marginTop:1 },
  total:   { fontSize:14, fontWeight:"800", color:"#fff" },
  arrow:   { width:24, height:24, borderRadius:7, backgroundColor: Colors.primary + "28", justifyContent:"center", alignItems:"center" },
});

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function CatalogScreen() {
  const { user } = useAuth();
  const [linkedAdminId, setLinkedAdminId]     = useState<string|null>(null);
  const [products, setProducts]               = useState<any[]>([]);
  const [categories, setCategories]           = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string|null>(null);
  const [loading, setLoading]                 = useState(true);
  const [refreshing, setRefreshing]           = useState(false);

  const [quickAddVisible,    setQuickAddVisible]    = useState(false);
  const [quickAddProduct,    setQuickAddProduct]    = useState<any>(null);
  const [quickAddSubmitting, setQuickAddSubmitting] = useState(false);

  const [subscribeVisible, setSubscribeVisible] = useState(false);
  const [subscribeProduct, setSubscribeProduct] = useState<any>(null);

  const [cart,        setCart]        = useState<CartItem[]>([]);
  const [cartVisible, setCartVisible] = useState(false);
  const [submitting,  setSubmitting]  = useState(false);

  const [subSheetVisible,    setSubSheetVisible]    = useState(false);
  const [activeSubscriptions,setActiveSubscriptions] = useState<any[]>([]);
  const [cancelling,         setCancelling]         = useState<string|null>(null);

  const [successVisible,      setSuccessVisible]      = useState(false);
  const [successIsSub,        setSuccessIsSub]        = useState(false);
  const [walletErrorVisible,  setWalletErrorVisible]  = useState(false);
  const [walletBalance,       setWalletBalance]       = useState(0);
  const [toastVisible,        setToastVisible]        = useState(false);
  const [toastProduct,        setToastProduct]        = useState("");
  const [toastIsSub,          setToastIsSub]          = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout>|null>(null);
  const isFocused  = useIsFocused();

  const tomorrow = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate()+1); return dateToString(d);
  }, []);

  const fetchSubs = useCallback(async () => {
    try {
      const subs = await api.getSubscriptions();
      setActiveSubscriptions((subs||[]).filter((s:any)=>s.status==="active"||!s.status));
    } catch {}
  }, []);

  useEffect(() => {
    const id = (user as any)?.admin_id ?? (user as any)?.referral_admin_id;
    setLinkedAdminId(id ?? null);
  }, [user]);

  const fetchData = useCallback(async () => {
    try {
      const [prods, cats, wallet] = await Promise.all([
        api.getCatalogProducts(linkedAdminId ?? undefined, selectedCategory || undefined),
        api.getCategories(),
        api.getWallet(),
      ]);
      setProducts(prods); setCategories(cats);
      setWalletBalance(wallet.balance ?? 0);
      await fetchSubs();
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, [selectedCategory, fetchSubs, linkedAdminId]);

  useEffect(() => {
    if (!isFocused) return;
    fetchData();
    const iv = setInterval(() => {
      if (!quickAddVisible && !subscribeVisible && !cartVisible && !subSheetVisible) fetchData();
    }, 2000);
    return () => clearInterval(iv);
  }, [isFocused, fetchData, quickAddVisible, subscribeVisible, cartVisible, subSheetVisible]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const showToast = (name:string, sub:boolean) => {
    setToastProduct(name); setToastIsSub(sub); setToastVisible(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(()=>setToastVisible(false), 2800);
  };

  const handleAddToCart    = (p:any) => { if((p.stock??0)===0){alert("Out of stock");return;} setQuickAddProduct(p); setQuickAddVisible(true); };
  const handleDairyBuyOnce = (p:any) => { if((p.stock??0)===0){alert("Out of stock");return;} setQuickAddProduct(p); setQuickAddVisible(true); };
  const handleSubscribe    = (p:any) => { if((p.stock??0)===0){alert("Out of stock");return;} setSubscribeProduct(p); setSubscribeVisible(true); };

  const handleQuickAddConfirm = async (qty:number) => {
    if (!quickAddProduct) return;
    const avail = quickAddProduct?.stock ?? 0;
    if (qty > avail) { alert(`Only ${avail} available`); return; }
    setQuickAddSubmitting(true);
    await new Promise(r=>setTimeout(r,100));
    setCart(prev => [...prev, { id:`${quickAddProduct.id}_${Date.now()}`, product:quickAddProduct, quantity:qty, pattern:"buy_once", customDays:[] }]);
    setQuickAddVisible(false);
    showToast(quickAddProduct.name, false);
    setQuickAddSubmitting(false);
  };

  const handleRemove    = (id:string) => setCart(p=>p.filter(c=>c.id!==id));
  const handleUpdateQty = (id:string, qty:number) => {
    setCart(p=>p.map(c=>{
      if(c.id!==id) return c;
      const m=c.product.stock??Infinity;
      if(qty>m){alert(`Only ${m} available`);return c;}
      return {...c,quantity:qty};
    }));
  };

  const cartTotal = cart.reduce((s,i)=>s+i.product.price*i.quantity,0);

  const handlePlaceOrder = async () => {
    if (walletBalance < cartTotal) { setWalletErrorVisible(true); return; }
    setSubmitting(true);
    try {
      await Promise.all(cart.map(item=>api.createSubscription({
        product_id:    item.product.id,
        quantity:      item.quantity,
        pattern:       "buy_once",
        custom_days:   null,
        start_date:    tomorrow,
        end_date:      tomorrow,
        amount:        item.product.price * item.quantity,
        delivery_slot: "morning", // default for buy_once cart orders
      })));
      setCart([]); setCartVisible(false);
      setSuccessIsSub(false); setSuccessVisible(true);
      api.getWallet().then(w=>setWalletBalance(w.balance??0)).catch(()=>{});
      await fetchData();
    } catch (e:any) { alert(e?.message || "Order failed"); }
    finally { setSubmitting(false); }
  };

  const handleCancelSub = async (id:string) => {
    setCancelling(id);
    try { await api.cancelSubscription(id); setActiveSubscriptions(p=>p.filter(s=>s.id!==id)); }
    catch {}
    finally { setCancelling(null); }
  };

  const grouped = useMemo(() => {
    if (selectedCategory) {
      const label = categories.find(c=>c.value===selectedCategory)?.label || selectedCategory;
      return [{ value:selectedCategory, label, items:products }];
    }
    const map: Record<string,any[]> = {};
    products.forEach(p=>{ const c=p.category||"other"; if(!map[c]) map[c]=[]; map[c].push(p); });
    return Object.entries(map).map(([v,items])=>({ value:v, label:categories.find(c=>c.value===v)?.label||v, items }));
  }, [products, selectedCategory, categories]);

  if (loading) return <LoadingScreen />;

  const ListHeader = (
    <>
      <View style={mainS.pageHeader}>
        <View style={mainS.headerTop}>
          <Text style={mainS.pageTitle}>Shop</Text>
          <View style={mainS.headerBtns}>
            <TouchableOpacity style={mainS.iconBtn} onPress={()=>setSubSheetVisible(true)}>
              <Ionicons name="repeat-outline" size={17} color={T.amber} />
              {activeSubscriptions.length > 0 && (
                <View style={[mainS.dot, { backgroundColor: T.amber }]}>
                  <Text style={mainS.dotTxt}>{activeSubscriptions.length}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={mainS.iconBtn} onPress={()=>setCartVisible(true)}>
              <Ionicons name="cart-outline" size={19} color={Colors.primary} />
              {cart.length > 0 && (
                <View style={[mainS.dot, { backgroundColor: Colors.primary }]}>
                  <Text style={mainS.dotTxt}>{cart.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
        <View style={mainS.headerSub}>
          <Text style={mainS.productCount}>{products.length} products</Text>
          <View style={mainS.walletPill}>
            <Ionicons name="wallet-outline" size={10} color={Colors.primary} />
            <Text style={mainS.walletTxt}>₹{walletBalance.toFixed(2)}</Text>
          </View>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={mainS.chips} style={{ flexShrink:0 }}>
        <TouchableOpacity style={[mainS.chip, !selectedCategory && mainS.chipActive]} onPress={()=>setSelectedCategory(null)}>
          <Text style={[mainS.chipTxt, !selectedCategory && mainS.chipTxtActive]}>All</Text>
        </TouchableOpacity>
        {categories.map(cat=>(
          <TouchableOpacity key={cat.value} style={[mainS.chip, selectedCategory===cat.value && mainS.chipActive]} onPress={()=>setSelectedCategory(cat.value)}>
            <Text style={[mainS.chipTxt, selectedCategory===cat.value && mainS.chipTxtActive]}>{cat.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </>
  );

  return (
    <SafeAreaView style={mainS.container}>
      <FlatList
        data={grouped}
        keyExtractor={i=>i.value}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <View style={mainS.empty}>
            <Ionicons name="cube-outline" size={32} color={T.faint} />
            <Text style={mainS.emptyTxt}>No products found</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom:120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({item})=>(
          <CategorySection value={item.value} label={item.label} items={item.items} cart={cart}
            onBuyOnce={handleDairyBuyOnce} onSubscribe={handleSubscribe} onAddToCart={handleAddToCart} />
        )}
      />

      <MiniCartPill cart={cart} onPress={()=>setCartVisible(true)} />

      <QuickAddModal visible={quickAddVisible} product={quickAddProduct} walletBalance={walletBalance}
        onClose={()=>setQuickAddVisible(false)} onConfirm={handleQuickAddConfirm} submitting={quickAddSubmitting} />

      <SubscribeModal visible={subscribeVisible} product={subscribeProduct} walletBalance={walletBalance}
        tomorrow={tomorrow} onClose={()=>setSubscribeVisible(false)}
        onSuccess={async (getWal)=>{ await fetchSubs(); const b=await getWal(); setWalletBalance(b); setSuccessIsSub(true); setSuccessVisible(true); }}
        onToast={showToast} />

      <CartSheet visible={cartVisible} cart={cart} walletBalance={walletBalance}
        onClose={()=>setCartVisible(false)} onRemove={handleRemove}
        onUpdateQty={handleUpdateQty} onPlaceOrder={handlePlaceOrder} submitting={submitting} />

      <SubscriptionSheet visible={subSheetVisible} subscriptions={activeSubscriptions}
        onClose={()=>setSubSheetVisible(false)} onCancel={handleCancelSub} cancelling={cancelling} />

      <SuccessModal visible={successVisible} itemCount={cart.length||1} isSubscription={successIsSub}
        onClose={()=>setSuccessVisible(false)} />
      <WalletErrorModal visible={walletErrorVisible} walletBalance={walletBalance} orderTotal={cartTotal}
        onClose={()=>setWalletErrorVisible(false)} />
      <AddedToCartToast visible={toastVisible} productName={toastProduct} isSubscription={toastIsSub} />
    </SafeAreaView>
  );
}

const mainS = StyleSheet.create({
  container:    { flex:1, backgroundColor: T.bg },
  pageHeader:   { paddingHorizontal:20, paddingTop:14, paddingBottom:8 },
  headerTop:    { flexDirection:"row", alignItems:"center", justifyContent:"space-between" },
  pageTitle:    { fontSize:24, fontWeight:"800", color: T.text, letterSpacing:-0.5 },
  headerBtns:   { flexDirection:"row", alignItems:"center", gap:8 },
  iconBtn:      { width:38, height:38, borderRadius: T.radius.md, backgroundColor: T.surface, borderWidth:1, borderColor: T.border, justifyContent:"center", alignItems:"center" },
  dot:          { position:"absolute", top:-4, right:-4, borderRadius:8, minWidth:16, height:16, alignItems:"center", justifyContent:"center", paddingHorizontal:3 },
  dotTxt:       { fontSize:9, fontWeight:"800", color:"#fff" },
  headerSub:    { flexDirection:"row", alignItems:"center", justifyContent:"space-between", marginTop:6 },
  productCount: { fontSize:12, color: T.muted },
  walletPill:   { flexDirection:"row", alignItems:"center", gap:4, backgroundColor: Colors.primary + "12", borderRadius: T.radius.full, paddingHorizontal:10, paddingVertical:4 },
  walletTxt:    { fontSize:11, fontWeight:"700", color: Colors.primary },
  chips:        { paddingHorizontal:20, paddingVertical:10, gap:7 },
  chip:         { paddingHorizontal:14, paddingVertical:7, borderRadius: T.radius.full, backgroundColor: T.surface, borderWidth:1, borderColor: T.border },
  chipActive:   { backgroundColor: T.text, borderColor: T.text },
  chipTxt:      { fontSize:12, fontWeight:"600", color: T.muted },
  chipTxtActive:{ color:"#fff" },
  empty:        { alignItems:"center", paddingTop:70, gap:8 },
  emptyTxt:     { fontSize:13, color: T.faint, fontWeight:"500" },
});