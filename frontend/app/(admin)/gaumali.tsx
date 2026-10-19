import React, { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, RefreshControl, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { Appointment, AppointmentUpdate, Mali, gaumaliAdmin } from "../../src/services/gaumaliAdmin";
import { formatDeliveryAddress } from "../../src/utils/address";
const message = (error: unknown) => error instanceof Error ? error.message : "Please check your connection and try again.";
const label = (value: string) => value.replace(/_/g, " ");

function Button({ title, onPress, disabled = false, danger = false }: { title: string; onPress: () => void; disabled?: boolean; danger?: boolean }) {
  return <TouchableOpacity accessibilityRole="button" disabled={disabled} onPress={onPress} style={[s.button, danger && s.danger, disabled && s.disabled]}><Text style={[s.buttonText, danger && s.dangerText]}>{title}</Text></TouchableOpacity>;
}

export default function GaumaliManagement() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [malis, setMalis] = useState<Mali[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const generation = useRef(0);
  const [filter, setFilter] = useState("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [action, setAction] = useState<{ appointment: Appointment; status: AppointmentUpdate["status"] } | null>(null);
  const [maliId, setMaliId] = useState("");
  const [cash, setCash] = useState(false);

  const load = useCallback(async () => {
    const version = ++generation.current;
    setRefreshing(true);
    setError("");
    try {
      const [nextAppointments, nextMalis] = await Promise.all([gaumaliAdmin.appointments(), gaumaliAdmin.malis()]);
      if (version !== generation.current) return;
      setAppointments(nextAppointments); setMalis(nextMalis);
    } catch (err) { if (version === generation.current) setError(message(err)); }
    finally { if (version === generation.current) { setLoading(false); setRefreshing(false); } }
  }, []);
  useFocusEffect(useCallback(() => { void load(); return () => { generation.current += 1; }; }, [load]));

  const mutate = async (operation: () => Promise<unknown>, done: () => void) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setFormError("");
    try { await operation(); done(); await load(); }
    catch (err) { setFormError(message(err)); Alert.alert("Could not save", message(err)); }
    finally { lock.current = false; setBusy(false); }
  };
  const openAction = (appointment: Appointment, status: AppointmentUpdate["status"]) => {
    setAction({ appointment, status }); setMaliId(""); setCash(false); setFormError("");
  };
  // Older list responses may omit payment_method. Require confirmation for any unpaid completion.
  const needsCash = !!action && action.status === "completed" && (
    ["cod", "cash", "cash_on_delivery"].includes(action.appointment.payment_method?.toLowerCase() || "") ||
    !["paid", "completed", "success"].includes(action.appointment.payment_status.toLowerCase())
  );
  const submitAction = () => {
    if (!action) return;
    if (action.status === "assigned" && (!["approved", "assigned"].includes(action.appointment.status) || !malis.some(m => m.id === maliId && m.is_active))) {
      setFormError("Select an active Mali for an approved appointment."); return;
    }
    if (needsCash && !cash) { setFormError("Confirm that cash has been collected before completing."); return; }
    const payload: AppointmentUpdate = { status: action.status };
    if (action.status === "assigned") payload.mali_id = maliId;
    if (action.status === "completed") payload.cash_collected = cash;
    void mutate(() => gaumaliAdmin.updateAppointment(action.appointment.id, payload), () => setAction(null));
  };
  const close = () => { if (!lock.current) setAction(null); };

  return <SafeAreaView style={s.safe} edges={["top", "left", "right"]}>
    <View style={s.header}>
      <TouchableOpacity accessibilityLabel="Back to settings" accessibilityRole="button" style={s.icon} onPress={() => router.back()}><Ionicons name="arrow-back" size={23} color="#34433C" /></TouchableOpacity>
      <Text style={s.title}>Gaumali Appointments</Text>
      <TouchableOpacity accessibilityLabel="Filter Gaumali" accessibilityRole="button" disabled={busy} style={s.icon} onPress={() => setFilterOpen(true)}><Ionicons name="filter" size={22} color={filter !== "all" ? "#287A52" : "#34433C"} /></TouchableOpacity>
    </View>
    {loading ? <View style={s.center}><ActivityIndicator size="large" color="#287A52" /><Text>Loading Gaumali...</Text></View> : <ScrollView contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load()} />}>
      {!!error && <View style={s.errorBox}><Text accessibilityRole="alert" style={s.dangerText}>{error}</Text><Button title="Retry" disabled={refreshing} onPress={() => void load()} /></View>}
      <>

        {appointments.filter(a => filter === "all" || a.status === filter || (filter === "refund_pending" && (a.payment_status === "refund_pending" || a.refund_status === "pending"))).map(a => {
          const pending = ["pending", "requested"].includes(a.status);
          const active = ["approved", "assigned"].includes(a.status);
          return <View key={a.id} style={s.card}>
            <Text style={s.heading}>{a.customer_name || "Customer"}</Text>
            {!!a.service_name && <Text style={s.body}>{a.service_name}</Text>}
            <Text style={s.body}>{a.date} | {a.start} - {a.end}</Text>
            <Text style={s.body}>{formatDeliveryAddress(a.address) || "No address provided"}</Text>
            <Text style={s.status}>{label(a.status)} | {label(a.payment_status)} | INR {a.amount}</Text>
            <Text style={s.body}>Mali: {a.assigned_mali_name || "Unassigned"}</Text>
            {!!a.partner_response && <Text style={a.partner_response === "rejected" ? s.dangerText : s.status}>Partner: {label(a.partner_response)}</Text>}
            {a.partner_response === "rejected" && !!a.partner_rejection_reason && <Text style={s.body}>{a.partner_rejection_reason}</Text>}
            {(a.payment_status === "refund_pending" || a.refund_status === "pending") && <Text style={s.dangerText}>Refund pending. No automatic refund has been issued.</Text>}
            <View style={s.row}>
              {pending && <Button title="Approve" disabled={busy || refreshing || !!error} onPress={() => openAction(a, "approved")} />}
              {pending && <Button title="Reject" danger disabled={busy || refreshing || !!error} onPress={() => openAction(a, "rejected")} />}
              {active && <Button title={a.status === "assigned" ? "Reassign Mali" : "Assign Mali"} disabled={busy || refreshing || !!error} onPress={() => openAction(a, "assigned")} />}
              {a.status === "assigned" && <Button title="Complete" disabled={busy || refreshing || !!error} onPress={() => openAction(a, "completed")} />}
              {(pending || active || a.status === "awaiting_payment") && <Button title="Cancel" danger disabled={busy || refreshing || !!error} onPress={() => openAction(a, "cancelled")} />}
            </View>
          </View>;
        })}
        {!appointments.some(a => filter === "all" || a.status === filter || (filter === "refund_pending" && (a.payment_status === "refund_pending" || a.refund_status === "pending"))) && !error && <Text style={s.empty}>No appointments found.</Text>}
      </>
    </ScrollView>}
    <Modal visible={filterOpen} transparent animationType="slide" onRequestClose={() => setFilterOpen(false)}>
      <View style={s.overlay}><SafeAreaView style={s.sheet} edges={["bottom"]}>
        <View style={s.header}><Text style={[s.heading,{flex:1}]}>Filter Appointments</Text><TouchableOpacity style={s.icon} accessibilityLabel="Close filters" onPress={() => setFilterOpen(false)}><Ionicons name="close" size={24} color="#34433C"/></TouchableOpacity></View>
        <ScrollView contentContainerStyle={s.content}>
          {["all","awaiting_payment","pending","approved","assigned","completed","cancelled","rejected","payment_review","refund_pending"].map(value => <TouchableOpacity key={value} accessibilityRole="radio" accessibilityState={{checked:filter===value}} style={[s.button,{flexDirection:"row",justifyContent:"space-between"}]} onPress={() => { setFilter(value);setFilterOpen(false); }}><Text style={s.buttonText}>{label(value)}</Text><Ionicons name={filter===value ? "radio-button-on" : "radio-button-off"} size={20} color="#287A52"/></TouchableOpacity>)}
        </ScrollView>
      </SafeAreaView></View>
    </Modal>
    <Modal visible={!!action} transparent animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <SafeAreaView style={s.sheet} edges={["bottom"]}>
          <View style={s.header}><Text style={[s.heading, { flex: 1 }]}>{`${label(action?.status || "")} appointment`}</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel="Close" disabled={busy} style={s.icon} onPress={close}><Ionicons name="close" size={24} color="#34433C" /></TouchableOpacity></View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
            {action && <>
              <Text style={s.heading}>{action.appointment.customer_name}</Text><Text style={s.body}>{action.appointment.date} | {action.appointment.start} - {action.appointment.end}</Text>
              {action.status === "assigned" && <><Text style={s.label}>Active Mali</Text><Picker enabled={!busy} accessibilityLabel="Assign Mali" selectedValue={maliId} onValueChange={setMaliId}><Picker.Item label="Select Mali" value="" />{malis.filter(m => m.is_active).map(m => <Picker.Item key={m.id} label={`${m.name} (${m.phone})`} value={m.id} />)}</Picker>{!malis.some(m => m.is_active) && <Text style={s.dangerText}>No active Malis or linked delivery partners available.</Text>}</>}
              {action.status === "completed" && <><Text style={s.body}>Amount: INR {action.appointment.amount} | {label(action.appointment.payment_status)}</Text>{needsCash && <View style={s.switchRow}><Text style={[s.label, { flex: 1 }]}>Cash collected: INR {action.appointment.amount}</Text><Switch accessibilityLabel="Cash collected" disabled={busy} value={cash} onValueChange={setCash} /></View>}</>}
              {["cancelled", "rejected"].includes(action.status) && <Text style={s.body}>Confirm this change? Any pending refund must be handled separately. No automatic refund will be issued.</Text>}
            </>}
            {!!formError && <Text accessibilityRole="alert" style={s.dangerText}>{formError}</Text>}
            {busy && <ActivityIndicator color="#287A52" />}
            <Button title={busy ? "Saving..." : "Confirm"} disabled={busy || (!!action && ((action.status === "assigned" && !maliId) || (needsCash && !cash)))} onPress={submitAction} />
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  </SafeAreaView>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F9F7" },
  header: { flexDirection: "row", alignItems: "center", padding: 12, gap: 8 },
  title: { flex: 1, fontSize: 22, fontWeight: "700", color: "#24362D" },
  icon: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  card: { padding: 16, gap: 8, borderRadius: 8, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#DCE4DF" },
  heading: { fontSize: 17, fontWeight: "700", color: "#24362D" },
  body: { fontSize: 14, lineHeight: 21, color: "#526158" },
  status: { fontSize: 13, lineHeight: 20, fontWeight: "600", color: "#287A52", textTransform: "capitalize" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  button: { minHeight: 44, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 6, backgroundColor: "#E8F5EE", alignItems: "center", justifyContent: "center" },
  buttonText: { fontSize: 14, fontWeight: "700", color: "#236142" },
  danger: { backgroundColor: "#FFF0ED" },
  dangerText: { color: "#A53027", fontSize: 14, lineHeight: 21 },
  disabled: { opacity: 0.45 },
  empty: { textAlign: "center", color: "#526158", paddingVertical: 32 },
  errorBox: { gap: 10, padding: 12, backgroundColor: "#FFF0ED" },
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: { maxHeight: "90%", backgroundColor: "#FFFFFF", borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  label: { fontSize: 14, fontWeight: "600", color: "#34433C" },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, minHeight: 48 },
});
