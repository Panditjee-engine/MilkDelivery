import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Animated, ActivityIndicator, Alert, BackHandler, Image, NativeModules, Platform, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { api } from "../../src/services/api";
import { useRouter } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import { useAuth } from "../../src/contexts/AuthContext";
import { Colors } from "../../src/constants/colors";
import { gaumali, Appointment, Booking, PaymentMethod, Service, Slot, Verification } from "../../src/services/gaumali";

type Address = {
  id: string; label?: string; is_default?: boolean; full_address?: string;
  flat?: string; building?: string; tower?: string; area?: string; city?: string;
  pincode?: string; society?: string; locality?: string; address_line1?: string; address_line?: string;
};
type Pending = { key: string; body: Booking; appointment?: Appointment; receipt?: Verification };
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T12:00:00`);
  return !Number.isNaN(d.getTime()) && d.getFullYear() === Number(value.slice(0, 4)) &&
    d.getMonth() + 1 === Number(value.slice(5, 7)) && d.getDate() === Number(value.slice(8, 10)) && value >= today();
}
const uuid = () => "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
  const r = Math.floor(Math.random() * 16);
  return (c === "x" ? r : (r & 3) | 8).toString(16);
});
const money = (amount: number) => `₹${Number(amount).toLocaleString("en-IN")}`;
const historyDate = (value: string) => { const date = new Date(`${value}T12:00:00`); return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); };
const historyTime = (value: string) => { const match = /^(\d{2}):(\d{2})$/.exec(value); if (!match) return value; const hour = Number(match[1]); return `${hour % 12 || 12}:${match[2]} ${hour >= 12 ? "PM" : "AM"}`; };
const label = (value?: string) => (value || "Unknown").replace(/_/g, " ");
function AppointmentWindow({ service, overlay = false }: { service: Service; overlay?: boolean }) {
  const window = service.appointment_window;
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    let mounted = true;
    let animation: Animated.CompositeAnimation | undefined;
    const update = (reduce: boolean) => {
      if (!mounted) return;
      animation?.stop();
      pulse.setValue(1);
      if (reduce || !overlay || !window?.is_active) return;
      animation = Animated.loop(Animated.sequence([
        Animated.timing(pulse, { toValue: 0.82, duration: 1200, useNativeDriver: true, isInteraction: false }),
        Animated.timing(pulse, { toValue: 1, duration: 1200, useNativeDriver: true, isInteraction: false }),
      ]));
      animation.start();
    };
    void AccessibilityInfo.isReduceMotionEnabled().then(update).catch(() => {});
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', update);
    return () => { mounted = false; animation?.stop(); listener.remove(); };
  }, [overlay, window?.is_active, pulse]);
  if (!window) return null;
  return <Animated.View pointerEvents="none" style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: overlay ? (window.is_active ? "#166534" : "#4B5563") : "#FFF1E8", borderRadius: 6, padding: 6, marginVertical: overlay ? 0 : 4, opacity: pulse }}>
    <Ionicons name="time-outline" size={13} color={overlay ? "#FFFFFF" : Colors.primaryDark} />
    <Text numberOfLines={1} ellipsizeMode="tail" style={{ minWidth: 0, flexShrink: 1, fontSize: 10, lineHeight: 14, fontWeight: "700", color: overlay ? "#FFFFFF" : Colors.primaryDark }}>
      {window.is_active ? `Daily ${historyTime(window.start_time)} - ${historyTime(window.end_time)} IST` : "Appointments currently closed"}
    </Text>
  </Animated.View>;
}
const message = (e: unknown) => e instanceof Error ? e.message :
  typeof e === "object" && e !== null && "description" in e ? String(e.description) : "Please try again.";
const nativeCheckoutAvailable = () => Platform.OS !== "web" && Constants.appOwnership !== "expo" &&
  Boolean(NativeModules.RNRazorpayCheckout || NativeModules.RazorpayCheckout);
const completeAddress = (a: Address) => !!a.id && (!!a.full_address?.trim() ||
  (!!a.city?.trim() && [a.area, a.society, a.locality, a.address_line1, a.address_line].some(v => v?.trim())));

const SERVICE_IMAGE = "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&auto=format&fit=crop&q=80";
function ServiceImage({ service, large = false }: { service: Service; large?: boolean }) {
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const images = [...new Set([...(service.images || []), service.image].filter(Boolean))] as string[];
  const slides = images.length ? images : [SERVICE_IMAGE];
  return <View onLayout={event => setWidth(event.nativeEvent.layout.width)} style={{ width: "100%", height: large ? 230 : 104, backgroundColor: "#EAF5EC", overflow: "hidden" }}>
    {!!width && <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={event => setPage(Math.round(event.nativeEvent.contentOffset.x / width))}>{slides.map(uri => <View key={uri} style={{ width, height: "100%", alignItems: "center", justifyContent: "center" }}>
      {failed[uri] ? <Ionicons name="leaf-outline" size={40} color={Colors.primaryDark} /> : <Image accessibilityLabel={service.name} source={{ uri }} style={{ width, height: "100%" }} resizeMode="cover" onError={() => setFailed(current => ({ ...current, [uri]: true }))} />}
    </View>)}</ScrollView>}
    <View pointerEvents="none" style={{ position: "absolute", top: 6, left: 6, right: large ? 12 : 48, alignItems: "flex-start" }}><AppointmentWindow service={service} overlay /></View>
    {slides.length > 1 && <View pointerEvents="none" style={{ position: "absolute", bottom: 8, alignSelf: "center", flexDirection: "row", gap: 4, backgroundColor: "#ffffffdd", padding: 5, borderRadius: 8 }}>{slides.map((_, i) => <View key={i} style={{ width: i === page ? 14 : 5, height: 5, borderRadius: 3, backgroundColor: i === page ? Colors.primaryDark : "#aaa" }} />)}</View>}
  </View>;
}

export default function GaumaliScreen({ historyOnly = false, detailId, startBooking = false }: { historyOnly?: boolean; detailId?: string; startBooking?: boolean } = {}) {
  const router = useRouter();
  const { user } = useAuth();
  const focused = useIsFocused();
  const [services, setServices] = useState<Service[]>([]);
  const [history, setHistory] = useState<Appointment[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [step, setStep] = useState<"details" | "slot" | "payment">(startBooking ? "slot" : "details");
  const [collection, setCollection] = useState<"all" | "favorites" | "cart">("all");
  const [historyFilter, setHistoryFilter] = useState("All");
  const [expandedBooking, setExpandedBooking] = useState<string | null>(null);
  useEffect(() => { setExpandedBooking(null); }, [historyFilter, user?.id]);
  const historyGroup = (status: string) => status === "completed" ? "Completed" : ["cancelled", "canceled", "rejected", "expired"].includes(status) ? "Cancelled" : "Active";
  const [saved, setSaved] = useState<{ favorites: string[]; cart: string[] }>({ favorites: [], cart: [] });
  const [savedReady, setSavedReady] = useState(false);
  const savedKey = `gaumali-saved:${user?.id}:${user?.admin_id || user?.referral_admin_id || ""}`;
  useEffect(() => {
    let active = true;
    setSavedReady(false); setSaved({ favorites: [], cart: [] });
    AsyncStorage.getItem(savedKey).then(value => {
      if (!active) return;
      try { const parsed = JSON.parse(value || "{}"); setSaved({ favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [], cart: Array.isArray(parsed.cart) ? parsed.cart : [] }); } catch {}
      setSavedReady(true);
    }).catch(() => { if (active) setSavedReady(true); });
    return () => { active = false; };
  }, [savedKey, focused]);
  const toggleSaved = async (kind: "favorites" | "cart", id: string) => {
    if (kind === "cart" && saved.cart.length >= 10) { Alert.alert("Cart limit", "You can book up to 10 services in one checkout."); return; }
    if (!savedReady) return;
    const next = { ...saved, [kind]: kind === "cart" ? [...saved.cart, id] : saved[kind].includes(id) ? saved[kind].filter(value => value !== id) : [...saved[kind], id] };
    setSavedReady(false);
    try { await AsyncStorage.setItem(savedKey, JSON.stringify(next)); setSaved(next); }
    catch { Alert.alert("Could not save", "Please try again."); }
    finally { setSavedReady(true); }
  };
  const [date, setDate] = useState(today);
  const removeCart = async (id: string) => {
    if (!savedReady) return;
    const index = saved.cart.indexOf(id);
    if (index < 0) return;
    const next = { ...saved, cart: saved.cart.filter((_, i) => i !== index) };
    setSavedReady(false);
    try { await AsyncStorage.setItem(savedKey, JSON.stringify(next)); setSaved(next); }
    catch { Alert.alert("Could not update cart", "Please try again."); }
    finally { setSavedReady(true); }
  };
  const cartControl = (id: string, compact = false) => {
    const count = saved.cart.filter(value => value === id).length;
    return <View style={s.counter}>{count > 0 && <TouchableOpacity disabled={!savedReady} accessibilityLabel="Remove one appointment" style={s.counterButton} onPress={() => void removeCart(id)}><Ionicons name="remove" size={18} color={Colors.primaryDark} /></TouchableOpacity>}{count > 0 && <Text style={s.title}>{count}</Text>}<TouchableOpacity disabled={!savedReady} accessibilityLabel="Add appointment to cart" style={s.counterButton} onPress={() => void toggleSaved("cart", id)}>{!count && !compact ? <Text style={s.title}>Add to Cart</Text> : <Ionicons name="add" size={18} color={Colors.primaryDark} />}</TouchableOpacity></View>;
  };
  const [showDate, setShowDate] = useState(false);
  const [savedProfile, setSavedProfile] = useState<{ addresses?: Address[]; address?: Address } | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [start, setStart] = useState("");
  const [addressId, setAddressId] = useState("");
  const [walletBalance, setWalletBalance] = useState<number|null>(null);
  useEffect(() => { let active=true; if(focused) api.getWallet().then(w=>{if(active)setWalletBalance(Number(w.available_balance ?? w.balance ?? 0));}).catch(()=>{if(active)setWalletBalance(null);}); return ()=>{active=false;}; }, [focused]);
  const [payment, setPayment] = useState<PaymentMethod>("wallet");
  const [loading, setLoading] = useState(true);
  const [slotLoading, setSlotLoading] = useState(false);
  const [error, setError] = useState("");
  const [slotError, setSlotError] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const locked = useRef(false);
  const generation = useRef(0);
  const readVersion = useRef(0);
  // Keep the original request and checkout receipt across retries, never rebook to retry payment.
  const attempts = useRef(new Map<string, Pending>());
  const storageKey = `gaumali-attempts:${user?.id || "signed-out"}`;
  const hydrated = useRef<Promise<void>>(Promise.resolve());
  const persist = () => AsyncStorage.setItem(storageKey, JSON.stringify([...attempts.current.entries()]));
  const profile = savedProfile || user as typeof user & { addresses?: Address[]; address?: Address };
  const addresses = useMemo(() => {
    const rows = Array.isArray(profile?.addresses) ? profile.addresses : [];
    return (rows.length ? rows : profile?.address ? [profile.address] : []).filter(completeAddress);
  }, [profile?.addresses, profile?.address]);
  const service = services.find(row => row.id === serviceId && row.is_active);
  const dateOK = validDate(date);
  const goBack = useCallback(() => {
    if (busy) return;
    if (detailId && step === "payment") { setStep("slot"); return; }
    if (detailId && step === "slot" && !startBooking) { setStep("details"); return; }
    if (router.canGoBack()) router.back(); else router.replace(historyOnly ? "/(customer)/profile" : "/(customer)/gaumali");
  }, [busy, detailId, step, historyOnly, router, startBooking]);
  useEffect(() => {
    if (!focused || (!detailId && !historyOnly)) return;
    const listener = BackHandler.addEventListener("hardwareBackPress", () => { goBack(); return true; });
    return () => listener.remove();
  }, [focused, detailId, historyOnly, goBack]);

  useEffect(() => {
    generation.current++;
    setServices([]); setHistory([]); setServiceId(""); setStart(""); setError("");
    setSavedProfile(null);
    attempts.current.clear();
    const session = generation.current;
    hydrated.current = AsyncStorage.getItem(storageKey).then(value => {
      if (value && session === generation.current) {
        try { attempts.current = new Map(JSON.parse(value)); } catch { /* Ignore corrupt local retry state. */ }
      }
    });
    return () => { generation.current++; };
  }, [user?.id, user?.admin_id, storageKey]);
  useEffect(() => {
    setAddressId(current => addresses.some(a => a.id === current) ? current :
      (addresses.find(a => a.is_default) || addresses[0])?.id || "");
  }, [addresses]);

  const load = useCallback(async () => {
    const current = generation.current;
    const version = ++readVersion.current;
    setLoading(true);
    try {
      await hydrated.current;
      const [catalog, appointments, currentProfile] = await Promise.all([
        historyOnly ? Promise.resolve([] as Service[]) : gaumali.services(),
        gaumali.appointments(),
        historyOnly ? Promise.resolve(null) : api.getMe(),
      ]);
      if (current !== generation.current || version !== readVersion.current) return;
      setServices(catalog);
      setSavedProfile(currentProfile);
      for (const [key, attempt] of attempts.current) {
        if (appointments.some(row => row.id === attempt.appointment?.id && ["cancelled", "rejected", "completed"].includes(row.status))) {
          attempts.current.delete(key);
        }
      }
      setHistory(appointments.map(row => {
        const pending = [...attempts.current.values()].find(a => a.appointment?.id === row.id);
        return { ...row, checkout: row.checkout || pending?.appointment?.checkout };
      }));
      setError("");
      setServiceId(id => catalog.some(s => s.id === (detailId || id) && s.is_active) ? (detailId || id) : "");
    } catch (e) {
      if (current === generation.current && version === readVersion.current) setError(`Could not refresh Gaumali. ${message(e)}`);
    } finally {
      if (current === generation.current && version === readVersion.current) setLoading(false);
    }
  }, [user?.id, user?.admin_id, historyOnly, detailId]);
  useEffect(() => { if (focused) void load(); }, [focused, load]);

  useEffect(() => {
    let active = true;
    setSlots([]); setSlotError(""); setSlotLoading(false);
    if (historyOnly || !detailId || step === "details" || !serviceId || !dateOK || !focused) return;
    setSlotLoading(true);
    void gaumali.slots(serviceId, date).then(rows => { if (active) {
      setSlots(rows);
      setStart(current => rows.some(slot => slot.start === current && slot.available > 0) ? current : "");
    } })
      .catch(e => { if (active) setSlotError(`Could not load slots. ${message(e)}`); })
      .finally(() => { if (active) setSlotLoading(false); });
    return () => { active = false; };
  }, [serviceId, date, dateOK, focused, revision, user?.id, user?.admin_id, historyOnly, detailId, step === "details"]);

  async function pay(appointment: Appointment, pending?: Pending) {
    const session = generation.current;
    const latest = await gaumali.paymentStatus(appointment.id);
    if (latest.payment_status === "paid") return;
    if (latest.status !== "awaiting_payment") throw new Error("This appointment is no longer payable.");
    appointment = latest;
    let receipt = pending?.receipt;
    if (!receipt) {
      if (!nativeCheckoutAvailable()) throw new Error("Online payment requires an Android/iOS development build or production app, not Expo Go or web.");
      if (!appointment.checkout) throw new Error("Checkout is unavailable. Refresh history before trying again.");
      const checkout = appointment.checkout;
      const RazorpayCheckout = require("react-native-razorpay").default;
      const result = await RazorpayCheckout.open({
        key: checkout.key_id, order_id: checkout.order_id, amount: checkout.amount,
        currency: checkout.currency, name: "Gaumali", description: "Service appointment",
        prefill: { name: user?.name, contact: String(user?.phone || "").replace(/\D/g, "").slice(-10) || undefined },
        theme: { color: Colors.primary },
      });
      receipt = { razorpay_order_id: result.razorpay_order_id, razorpay_payment_id: result.razorpay_payment_id, razorpay_signature: result.razorpay_signature };
      if (pending) pending.receipt = receipt;
      await persist();
    }
    if (session !== generation.current) return;
    await gaumali.verify(appointment.id, receipt);
    if (pending) pending.receipt = undefined;
    await persist();
  }
  async function act(action: () => Promise<void>) {
    if (locked.current) return;
    locked.current = true; setBusy(true);
    const current = generation.current;
    try { await action(); }
    catch (e) { if (current === generation.current) Alert.alert("Gaumali", message(e)); }
    finally {
      locked.current = false; setBusy(false);
      if (current === generation.current) { setRevision(r => r + 1); void load(); }
    }
  }
  const canBook = !!service && addresses.some(a => a.id === addressId) && dateOK && !!start &&
    slots.some(slot => slot.start === start && slot.available > 0) && !slotLoading && !busy && !loading && !error;
  const book = () => {
    if (!canBook) return;
    if (payment === "online" && !nativeCheckoutAvailable()) {
      Alert.alert("Online payment unavailable", "Use an Android/iOS development build or production app for Razorpay, or choose Wallet or COD.");
      return;
    }
    void act(async () => {
      const current = generation.current;
      await hydrated.current;
      const body = { service_id: serviceId, date, start, address_id: addressId, payment_method: payment };
      const key = JSON.stringify(body);
      let pending = attempts.current.get(key);
      if (!pending) {
        pending = { key, body: { ...body, request_id: uuid() } };
        attempts.current.set(key, pending);
        await persist();
      }
      if (pending.appointment) {
        Alert.alert("Appointment already saved", "Continue payment or cancel the existing appointment in history.");
        return;
      }
      const appointment = await gaumali.book(pending.body);
      if (current !== generation.current) return;
      pending.appointment = appointment;
      await persist();
      setHistory(rows => [appointment, ...rows.filter(row => row.id !== appointment.id)]);
      if (payment === "online" && appointment.payment_status !== "paid") {
        try { await pay(appointment, pending); }
        catch (e) { throw new Error(`Appointment saved. Payment is not confirmed. Retry payment from history, not a new booking. ${message(e)}`); }
      }
      if (current !== generation.current) return;
      setStart("");
      Alert.alert("Appointment saved", payment === "online" ? "Payment verified. Check history for appointment status." : `Status: ${label(appointment.status)}.`, [{ text: "View booking", onPress: () => router.replace("/(customer)/gaumali-history" as any) }]);
    });
  };
  const cancel = (appointment: Appointment) => Alert.alert("Cancel appointment?",
    "Any paid amount will be marked for refund. Refund completion is deferred.", [
      { text: "Keep appointment", style: "cancel" },
      { text: "Cancel appointment", style: "destructive", onPress: () => void act(async () => {
        await gaumali.cancel(appointment.id);
        for (const [key, pending] of attempts.current) {
          if (pending.appointment?.id === appointment.id) attempts.current.delete(key);
        }
        await persist();
        Alert.alert("Appointment cancelled", appointment.payment_status === "paid" ? "Refund pending. The paid amount has not yet been refunded." : "Check history for the latest payment status.");
      }) },
    ]);

  return <SafeAreaView style={s.screen} edges={["top"]}>
    <View style={s.row}>
      {(historyOnly || detailId) && <TouchableOpacity disabled={busy} accessibilityLabel="Go back" accessibilityRole="button" style={{ padding: 16 }} onPress={goBack}><Ionicons name="arrow-back" size={24} color={Colors.primaryDark} /></TouchableOpacity>}
      <Text style={[s.heading, (historyOnly || detailId) ? { paddingLeft: 0, flex: 1 } : undefined] }>{historyOnly ? "Gaumali Bookings" : detailId ? step === "details" ? "Service Details" : step === "slot" ? "Choose Date & Time" : "Confirm Booking" : "Gaumali"}</Text>
      {!historyOnly && !detailId && <View style={{ flexDirection: "row", marginLeft: "auto", marginRight: 12 }}>{(["favorites", "cart"] as const).map(kind => <TouchableOpacity key={kind} accessibilityRole="button" accessibilityLabel={kind === "favorites" ? "Favorites" : "Cart"} onPress={() => kind === "cart" ? router.push("/(customer)/gaumali-cart" as any) : setCollection(current => current === kind ? "all" : kind)} style={{ padding: 12, backgroundColor: collection === kind ? Colors.surfaceSecondary : "transparent", borderRadius: 8 }}><Ionicons name={kind === "favorites" ? "heart-outline" : "cart-outline"} size={23} color={Colors.primaryDark} />{saved[kind].length > 0 && <Text style={{ position: "absolute", top: 0, right: 1, backgroundColor: Colors.primaryDark, color: "white", borderRadius: 8, paddingHorizontal: 4, fontSize: 10 }}>{saved[kind].length}</Text>}</TouchableOpacity>)}</View>}
    </View>
    <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => { setRevision(r => r + 1); void load(); }} tintColor={Colors.primary} />}>
      {!!error && <View style={s.notice}><Text style={s.error}>{error}</Text><TouchableOpacity accessibilityRole="button" onPress={() => void load()}><Text style={s.link}>Retry</Text></TouchableOpacity></View>}
      {!historyOnly && <>
      {!detailId && <>
      {collection !== "all" && <View style={s.row}><Text style={s.section}>{collection === "cart" ? "Saved services" : "Favorites"}</Text><TouchableOpacity onPress={() => setCollection("all")}><Text style={s.link}>All services</Text></TouchableOpacity></View>}
      {collection !== "all" && !services.some(row => row.is_active && saved[collection].includes(row.id)) && <Text style={s.muted}>No saved services yet.</Text>}
      {!loading && !error && !services.some(row => row.is_active) && <Text style={s.muted}>No services available yet.</Text>}
      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 14 }}>
      {services.filter(row => row.is_active && (collection === "all" || saved[collection].includes(row.id))).map(row => <View key={row.id} style={{ width: "48%", backgroundColor: Colors.surface, borderRadius: 8, overflow: "hidden", borderWidth: 1, borderColor: Colors.border }}>
        <ServiceImage service={row} />
        <TouchableOpacity disabled={!savedReady} accessibilityLabel={saved.favorites.includes(row.id) ? "Remove favorite" : "Add favorite"} onPress={() => void toggleSaved("favorites", row.id)} style={{ position: "absolute", top: 6, right: 6, padding: 9, backgroundColor: "#fffffff0", borderRadius: 20 }}><Ionicons name={saved.favorites.includes(row.id) ? "heart" : "heart-outline"} size={19} color={saved.favorites.includes(row.id) ? "#DC3545" : Colors.primaryDark} /></TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" style={{ padding: 8, gap: 3 }} onPress={() => router.push({ pathname: "/(customer)/gaumali-details", params: { id: row.id } } as any)}><Text style={[s.title, { minHeight: 34, fontSize:13 }]} numberOfLines={2}>{row.name}</Text><Text style={s.muted}>{row.duration_hours} {row.duration_hours === 1 ? "hour" : "hours"}</Text><Text style={s.price}>{money(row.price)}</Text></TouchableOpacity>
        <View style={s.cardActions}><View style={{flex:1,minWidth:0}}>{cartControl(row.id,true)}</View><TouchableOpacity style={[s.book,s.compactBuy]} onPress={() => router.push({pathname:"/(customer)/gaumali-details",params:{id:row.id,booking:"1"}} as any)}><Text numberOfLines={1} style={[s.bookText,{fontSize:12}]}>Book Now</Text></TouchableOpacity></View>
      </View>)}
      </View>
      </>}
      {!!detailId && !loading && !error && !service && <Text style={s.error}>This service is no longer available.</Text>}
      {!!detailId && !!service && step === "details" && <>
        <ServiceImage service={service} large />
        <Text style={[s.heading, { padding: 0 }]}>{service.name}</Text>
        <Text style={s.price}>{money(service.price)} <Text style={s.muted}>per appointment</Text></Text>
        <Text style={s.muted}>{service.duration_hours} hours · Service at your selected address</Text>
        <Text style={s.section}>About this service</Text><Text style={s.title}>{service.description || "Gardening service by your Gaushala's Gaumali team."}</Text>
      </>}
      {!!detailId && !!service && step === "slot" && <>
      <Text style={s.section}>Date</Text>
      {Platform.OS !== "web" && <TouchableOpacity accessibilityRole="button" style={s.input} disabled={busy} onPress={() => setShowDate(value => !value)}><View style={s.row}><Ionicons name="calendar-outline" size={20} color={Colors.primaryDark} /><Text style={s.title}>{date}</Text><Ionicons name={showDate ? "chevron-up" : "chevron-down"} size={18} color={Colors.primaryDark} /></View></TouchableOpacity>}
      {showDate && Platform.OS !== "web" && <DateTimePicker mode="date" display={Platform.OS === "ios" ? "inline" : "default"} value={new Date(`${dateOK ? date : today()}T12:00:00`)} minimumDate={new Date()} maximumDate={new Date(Date.now() + 90 * 86400000)} onChange={(event, value) => {
        if (Platform.OS === "android") setShowDate(false);
        if (event.type === "set" && value) { setDate(`${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`); setStart(""); }
      }} />}
      {Platform.OS === "web" && <TextInput accessibilityLabel="Appointment date, YYYY-MM-DD" placeholder="YYYY-MM-DD" placeholderTextColor={Colors.textSecondary}
        value={date} maxLength={10} autoCorrect={false} editable={!busy} style={s.input}
        onChangeText={value => { setDate(value); setStart(""); setSlots([]); }} />}
      {!dateOK && <Text style={s.error}>Enter a valid date today or later (YYYY-MM-DD).</Text>}
      <Text style={s.section}>Available Slots</Text>
      {service && <AppointmentWindow service={service} />}
      {slotLoading ? <ActivityIndicator color={Colors.primaryDark} /> : <View style={s.wrap}>
        {slots.map(slot => <TouchableOpacity key={slot.start} disabled={busy || slot.available <= 0} accessibilityRole="radio"
          accessibilityState={{ checked: start === slot.start, disabled: busy || slot.available <= 0 }}
          style={[s.slot, start === slot.start && s.selected, slot.available <= 0 && s.disabled]}
          onPress={() => setStart(slot.start)}><Text style={s.title}>{slot.start} - {slot.end}</Text><Text style={s.muted}>{slot.available > 0 ? `${slot.available} available` : "Full"}</Text></TouchableOpacity>)}
      </View>}
      {!!slotError && <TouchableOpacity onPress={() => setRevision(r => r + 1)} accessibilityRole="button"><Text style={s.error}>{slotError}</Text><Text style={s.link}>Retry slots</Text></TouchableOpacity>}
      {!slotLoading && !slotError && !slots.length && <Text style={s.muted}>{!serviceId ? "Select a service." : dateOK ? "No slots available for this date." : "Choose a valid date."}</Text>}
      </>}
      {!!detailId && !!service && step === "payment" && <>
      <View style={s.card}><Text style={s.title}>{service.name}</Text><Text style={s.muted}>{date} · {start} · {service.duration_hours} hours</Text><Text style={s.price}>{money(service.price)}</Text><TouchableOpacity onPress={() => setStep("slot")}><Text style={s.link}>Change date or time</Text></TouchableOpacity></View>
      <View style={[s.row, s.sectionRow]}><Text style={s.sectionInline}>Saved Address</Text><TouchableOpacity disabled={busy} accessibilityRole="button" onPress={() => router.push("/address-book")}><Text style={s.link}>Manage addresses</Text></TouchableOpacity></View>
      {!addresses.length && <Text style={s.muted}>No complete saved addresses. Add an address to book.</Text>}
      {addresses.map(address => <TouchableOpacity key={address.id} disabled={busy} style={[s.card, addressId === address.id && s.selected]}
        accessibilityRole="radio" accessibilityState={{ checked: addressId === address.id }} onPress={() => setAddressId(address.id)}>
        <Text style={s.title}>{address.label || "Address"}{address.is_default ? " (Default)" : ""}</Text>
        <Text style={s.muted}>{[address.flat, address.building || address.tower, address.full_address || address.area || address.society || address.locality || address.address_line1 || address.address_line, address.city, address.pincode].filter(Boolean).join(", ")}</Text>
      </TouchableOpacity>)}
      <Text style={s.section}>Payment</Text>
      {walletBalance !== null && <View style={[s.card,payment === "wallet" && walletBalance < service.price && {borderColor:Colors.error,backgroundColor:"#FEF2F2"}]}><Text style={s.title}>Wallet balance: {money(walletBalance)}</Text>{payment === "wallet" && walletBalance < service.price && <Text style={s.error}>Insufficient wallet balance. Add {money(service.price-walletBalance)} or select another payment method.</Text>}</View>}
      <View style={s.wrap}>{(["wallet", "online", "cod"] as const).map(method => <TouchableOpacity key={method} disabled={busy}
        accessibilityRole="radio" accessibilityState={{ checked: payment === method }} style={[s.slot, payment === method && s.selected]} onPress={() => setPayment(method)}>
        <View style={s.row}><Ionicons name={method === "wallet" ? "wallet-outline" : method === "online" ? "card-outline" : "cash-outline"} size={20} color={Colors.primaryDark} /><Text style={s.title}>{method === "cod" ? "COD" : method === "wallet" ? "Wallet" : "Online"}</Text></View>
      </TouchableOpacity>)}</View>
      </>}
      </>}
      {historyOnly && <>
      {loading && !history.length && <ActivityIndicator style={{paddingVertical:24}} color={Colors.primaryDark} accessibilityLabel="Loading bookings" />}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8,paddingVertical:6}}>{["All","Active","Completed","Cancelled"].map(filter => <TouchableOpacity key={filter} accessibilityRole="button" accessibilityState={{selected:historyFilter===filter}} onPress={()=>setHistoryFilter(filter)} style={[s.historyFilter,historyFilter===filter && s.selected]}><Text style={[s.muted,historyFilter===filter && {color:Colors.primaryDark,fontWeight:"700"}]}>{filter} ({history.filter(a=>filter==="All" || historyGroup(a.status)===filter).length})</Text></TouchableOpacity>)}</ScrollView>
      {!loading && !error && !history.some(a=>historyFilter==="All" || historyGroup(a.status)===historyFilter) && <View style={s.historyEmpty}><Ionicons name="calendar-outline" size={42} color={Colors.primaryDark}/><Text style={s.title}>{history.length ? "No bookings in this view" : "No appointments yet"}</Text></View>}
      {history.filter(a=>historyFilter==="All" || historyGroup(a.status)===historyFilter).map(appointment => {
        const expanded = expandedBooking === appointment.id;
        const serviceName = appointment.service_name || services.find(row => row.id === appointment.service_id)?.name || "Gaumali appointment";
        const group = historyGroup(appointment.status);
        const statusColor = group === "Completed" ? "#15803D" : group === "Cancelled" ? "#B91C1C" : "#1D4ED8";
        const statusBackground = group === "Completed" ? "#F0FDF4" : group === "Cancelled" ? "#FEF2F2" : "#EFF6FF";
        const cancellable = !["cancelled", "canceled", "completed", "rejected", "expired", "payment_review"].includes(appointment.status.toLowerCase());
        const pending = [...attempts.current.values()].find(a => a.appointment?.id === appointment.id);
        const retryPayment = !appointment.checkout_id && cancellable && appointment.payment_method === "online" && appointment.payment_status !== "paid" &&
          (appointment.status === "awaiting_payment" || ["pending", "unpaid", "failed", "created"].includes(appointment.payment_status)) && (appointment.checkout || pending?.receipt);
        const manageCheckout = !!appointment.checkout_id && appointment.status === "awaiting_payment";
        const canCancel = cancellable && !manageCheckout;
        return <View key={appointment.id} style={[s.card,{gap:12}]}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`${serviceName}, ${label(appointment.status)}, ${expanded ? "hide" : "show"} booking details`}
            accessibilityState={{ expanded }}
            activeOpacity={0.75}
            onPress={() => setExpandedBooking(current => current === appointment.id ? null : appointment.id)}
            style={{ gap: 10, minHeight: 44 }}
          >
          <View style={[s.row,{justifyContent:"space-between"}]}><Text style={s.muted}>#{appointment.id.slice(-8).toUpperCase()}</Text><View style={[s.statusBadge,{backgroundColor:statusBackground}]}><Text style={{fontSize:12,fontWeight:"700",color:statusColor}}>{label(appointment.status)}</Text></View></View>
          <View style={[s.row,{flexWrap:"nowrap"}]}><View style={s.serviceIcon}><Ionicons name="leaf-outline" size={23} color={Colors.primaryDark}/></View><View style={{flex:1,minWidth:0,gap:4}}><Text numberOfLines={expanded ? undefined : 2} style={[s.title,{lineHeight:21}]}>{serviceName}</Text><Text style={s.muted}>{historyDate(appointment.date)} · {historyTime(appointment.start)}</Text></View><Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={20} color={Colors.primaryDark}/></View>
          </TouchableOpacity>
          {expanded && <>
          <View style={s.historySchedule}><View style={s.row}><Ionicons name="calendar-outline" size={16} color={Colors.textSecondary}/><Text style={s.muted}>{historyDate(appointment.date)}</Text></View><View style={s.row}><Ionicons name="time-outline" size={16} color={Colors.textSecondary}/><Text style={s.muted}>{historyTime(appointment.start)}{appointment.end ? ` - ${historyTime(appointment.end)}` : ""}</Text></View></View>
          <View style={[s.row,{justifyContent:"space-between"}]}><Text style={s.price}>{money(appointment.amount)}</Text><Text style={[s.muted,{color:appointment.payment_status==="paid"?"#15803D":Colors.textSecondary}]}>{appointment.payment_method === "cod" ? "COD" : label(appointment.payment_method)} · {label(appointment.payment_status)}</Text></View>
          {!!appointment.assigned_mali_name && <View style={s.row}><Ionicons name="person-circle-outline" size={20} color={Colors.primaryDark}/><Text style={[s.title,{flex:1,fontSize:13}]}>{appointment.assigned_mali_name}</Text></View>}
          {!!appointment.assigned_mali_phone && <Text selectable style={s.muted}>Phone: {appointment.assigned_mali_phone}</Text>}
          {(appointment.payment_status === "refund_pending" || appointment.refund_status === "pending") && <Text style={s.error}>Refund pending. Refund is not complete.</Text>}
          {(manageCheckout || retryPayment || canCancel) && <View style={s.historyActions}>
            {manageCheckout && <TouchableOpacity style={[s.historyAction,busy && s.disabled]} disabled={busy} accessibilityRole="button" onPress={() => router.push({ pathname: "/(customer)/gaumali-cart", params: { checkoutId: appointment.checkout_id } } as any)}><Ionicons name="cart-outline" size={16} color={Colors.primaryDark}/><Text style={s.historyActionText}>Manage checkout</Text></TouchableOpacity>}
            {!!retryPayment && <TouchableOpacity style={[s.historyAction,busy && s.disabled]} disabled={busy} accessibilityRole="button" onPress={() => void act(async () => {
              let retry = pending;
              if (!retry) {
                retry = { key: appointment.id, body: { service_id: appointment.service_id, date: appointment.date, start: appointment.start, address_id: "", payment_method: "online", request_id: uuid() }, appointment };
                attempts.current.set(appointment.id, retry);
              }
              await pay(appointment, retry); Alert.alert("Payment verified");
            })}><Ionicons name="card-outline" size={16} color={Colors.primaryDark}/><Text style={s.historyActionText}>{pending?.receipt ? "Verify payment" : "Pay online"}</Text></TouchableOpacity>}
            {canCancel && <TouchableOpacity style={[s.historyAction,{borderColor:"#FECACA"},busy && s.disabled]} disabled={busy} accessibilityRole="button" onPress={() => cancel(appointment)}><Ionicons name="close-circle-outline" size={16} color={Colors.error}/><Text style={[s.historyActionText,{color:Colors.error}]}>Cancel booking</Text></TouchableOpacity>}
          </View>}
          </>}
        </View>;
      })}
      </>}
    </ScrollView>
    {!!detailId && !!service && step === "slot" && <View style={s.bottomBar}>
      <TouchableOpacity accessibilityRole="button" disabled={!start || slotLoading || !slots.some(slot => slot.start === start && slot.available > 0)} style={[s.book,s.footerButton,(!start || slotLoading || !slots.some(slot => slot.start === start && slot.available > 0)) && s.disabled]} onPress={() => { setShowDate(false); setStep("payment"); }}><Text style={s.bookText}>Continue</Text></TouchableOpacity>
    </View>}
    {!!detailId && !!service && step === "payment" && <View style={s.bottomBar}>
      <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: !canBook, busy }} disabled={!canBook} style={[s.book,s.footerButton,!canBook && s.disabled]} onPress={book}>
        {busy ? <ActivityIndicator color={Colors.textInverse} /> : <Text style={s.bookText}>Book appointment · {money(service.price)}</Text>}
      </TouchableOpacity>
    </View>}
    {!!detailId && !!service && step === "details" && <View style={s.bottomBar}><View style={{flex:1,minWidth:0}}>{cartControl(service.id)}</View><TouchableOpacity disabled={loading || !!error} style={[s.book,{flex:1,marginTop:0,height:44,minHeight:44,padding:8}]} onPress={() => setStep("slot")}><Text style={s.bookText}>Book Now</Text></TouchableOpacity></View>}
  </SafeAreaView>;
}

const s = StyleSheet.create({
  historyActions: {flexDirection:"row",flexWrap:"wrap",gap:8,borderTopWidth:1,borderColor:Colors.border,paddingTop:12},
  historyAction: {flexDirection:"row",alignItems:"center",justifyContent:"center",gap:6,minHeight:44,paddingHorizontal:12,paddingVertical:8,borderWidth:1,borderColor:Colors.border,borderRadius:6},
  historyActionText: {fontSize:13,fontWeight:"700",color:Colors.primaryDark},
  historyFilter: {paddingHorizontal:14,paddingVertical:8,borderRadius:8,borderWidth:1,borderColor:Colors.border,backgroundColor:Colors.surface},
  historyEmpty: {alignItems:"center",justifyContent:"center",paddingVertical:72,gap:16},
  statusBadge: {paddingHorizontal:10,paddingVertical:5,borderRadius:6},
  serviceIcon: {width:42,height:42,borderRadius:8,backgroundColor:Colors.surfaceSecondary,alignItems:"center",justifyContent:"center"},
  historySchedule: {gap:6,paddingVertical:10,borderTopWidth:1,borderBottomWidth:1,borderColor:Colors.border},
  footerButton: {flex:1,marginTop:0},
  cardActions: {flexDirection:"row",alignItems:"center",paddingHorizontal:8,paddingBottom:8,gap:6},
  compactBuy: {flex:1,marginTop:0,height:44,minHeight:44,padding:4},
  counter: {flexDirection:"row",alignItems:"center",justifyContent:"center",borderWidth:1,borderColor:Colors.primaryDark,borderRadius:8,backgroundColor:Colors.surfaceSecondary,height:44},
  counterButton: {paddingHorizontal:4,height:42,minWidth:24,alignItems:"center",justifyContent:"center",flexShrink:1},
  bottomBar: {flexDirection:"row",alignItems:"center",gap:12,padding:16,backgroundColor:Colors.surface,borderTopWidth:1,borderColor:Colors.border},
  screen: { flex: 1, backgroundColor: Colors.background },
  heading: { fontSize: 24, fontWeight: "800", color: Colors.primaryDark, padding: 20 },
  content: { paddingHorizontal: 16, paddingBottom: 32, gap: 10 },
  section: { fontSize: 17, fontWeight: "700", color: Colors.text, marginTop: 16 },
  sectionInline: { fontSize: 17, fontWeight: "700", color: Colors.text },
  sectionRow: { marginTop: 16, justifyContent: "space-between", flexWrap: "wrap" },
  card: { backgroundColor: Colors.surface, borderRadius: 8, padding: 14, gap: 8, borderWidth: 1, borderColor: Colors.border },
  selected: { borderColor: Colors.primaryDark, backgroundColor: Colors.surfaceSecondary },
  row: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  flex: { flex: 1, minWidth: 100 },
  title: { fontSize: 15, fontWeight: "700", color: Colors.text },
  muted: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
  price: { fontSize: 16, fontWeight: "700", color: Colors.primaryDark },
  link: { fontSize: 14, fontWeight: "700", color: Colors.primaryDark, paddingVertical: 10 },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: 8, padding: 14, fontSize: 16, backgroundColor: Colors.surface, color: Colors.text },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  slot: { borderWidth: 1, borderColor: Colors.border, borderRadius: 8, padding: 12, minHeight: 48, backgroundColor: Colors.surface },
  disabled: { opacity: 0.45 },
  book: { marginTop: 16, minHeight: 52, justifyContent: "center", alignItems: "center", padding: 14, borderRadius: 8, backgroundColor: Colors.primaryDark },
  bookText: { color: Colors.textInverse, fontWeight: "700", fontSize: 16, textAlign: "center" },
  notice: { padding: 12, backgroundColor: Colors.surfaceSecondary, gap: 6 },
  error: { color: Colors.error, fontSize: 13, lineHeight: 20 },
});
