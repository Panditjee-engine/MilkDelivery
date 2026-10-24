import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { api } from "../../../src/services/api";
import type {
  WorkAssignment,
  AssignmentStatus,
} from "../../../src/services/api";

// ─── Palette
const C = {
  primary: "#FF9675",
  secondary: "#FF9675",
  accent: "#8B6854",
  light: "#8B6854",
  dark: "#BB6B3F",
  deep: "#8B6854",
  bg: "#FFF8EF",
  card: "#FFE8D6",
  text: "#3D1F0A",
  textMuted: "#A07850",
  textLight: "#C9A882",
  success: "#22C55E",
  successBg: "#F0FDF4",
  white: "#FFFFFF",
  border: "#FFE8C8",
  inputBg: "#FFF8EF",
  chipBg: "#FFF3DC",
  overlay: "rgba(61,31,10,0.45)",
  // status helpers
  red: "#DC2626",
  redBg: "#FEF2F2",
  blue: "#2563EB",
  blueBg: "#EFF6FF",
  amber: "#D97706",
  amberBg: "#FFFBEB",
};

type Status = AssignmentStatus;

interface Worker {
  id: string;
  name: string;
  // Optional fields: shown when your API returns them
  address?: string | null;
  location?: string | null;
  role?: string | null;
  on_shift?: boolean | null;
  active?: boolean | null;
  station?: string | null;
  shift_start?: string | null; // e.g. "06:00"
  shift_end?: string | null; // e.g. "14:30"
  photo?: string | null;
  avatar_url?: string | null;
}

const STEPS: Status[] = ["assigned", "accepted", "submitted", "approved"];
const LABEL: Record<Status, string> = {
  assigned: "Assigned",
  accepted: "Accepted",
  submitted: "Submitted",
  approved: "Approved",
  rejected: "Rejected",
  declined: "Cancelled",
};
const STATUS_COLOR: Record<Status, string> = {
  assigned: C.textMuted,
  accepted: C.blue,
  submitted: C.amber,
  approved: C.success,
  rejected: C.red,
  declined: C.red,
};
const STATUS_BG: Record<Status, string> = {
  assigned: C.chipBg,
  accepted: C.blueBg,
  submitted: C.amberBg,
  approved: C.successBg,
  rejected: C.redBg,
  declined: C.redBg,
};
const TABS = [
  "all",
  "assigned",
  "accepted",
  "submitted",
  "rejected",
  "declined",
  "approved",
] as const;
type Priority = "low" | "normal" | "high";
const PRIORITIES: Priority[] = ["low", "normal", "high"];
const PRIORITY_STYLE: Record<Priority, { fg: string; bg: string }> = {
  high: { fg: C.red, bg: C.redBg },
  normal: { fg: C.amber, bg: C.amberBg },
  low: { fg: C.success, bg: C.successBg },
};

const fmtDate = (x?: string | null) =>
  x ? new Date(x).toLocaleString("en-IN") : "";
const fmtShort = (x?: string | null) => {
  if (!x) return "";
  const d = new Date(x);
  if (isNaN(d.getTime())) return x;
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};
const timeOf = (i: any) => i?.created_at ?? i?.assigned_at ?? null;

// ─── Status rail (unchanged)
function Rail({ status }: { status: Status }) {
  const idx = {
    assigned: 0,
    accepted: 1,
    submitted: 2,
    approved: 3,
    rejected: 2,
    declined: 1,
  }[status];
  const bad = status === "rejected" || status === "declined";
  const steps: Status[] =
    status === "declined" ? ["assigned", "declined"] : STEPS;
  return (
    <View style={s.rail}>
      {steps.map((st, i) => {
        const done = i <= idx;
        const isBad = bad && i === idx;
        const color = isBad ? C.red : done ? C.success : C.border;
        return (
          <View key={st} style={s.step}>
            {i > 0 && <View style={[s.line, { backgroundColor: color }]} />}
            <View style={[s.dot, { backgroundColor: color }]} />
            <Text
              style={[
                s.stepTxt,
                isBad && { color: C.red },
                done && !isBad && { color: C.text },
              ]}
            >
              {isBad ? LABEL[status] : LABEL[st]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function Avatar({ w, size = 48 }: { w: Worker; size?: number }) {
  const uri = w.photo || w.avatar_url;
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }
  return (
    <View
      style={[
        s.avatar,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={[s.avatarTxt, { fontSize: size * 0.38 }]}>
        {(w.name || "?")[0].toUpperCase()}
      </Text>
    </View>
  );
}

// ─── Main screen
export default function AssignWorkScreen() {
  const router = useRouter();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [items, setItems] = useState<WorkAssignment[]>([]);
  const [selected, setSelected] = useState<Worker | null>(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<(typeof TABS)[number]>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const w: any = await api.getAdminWorkers();
      setWorkers(Array.isArray(w) ? w : (w?.workers ?? []));
      const a = await api.getAdminAssignments();
      setItems(a?.assignments ?? []);
    } catch (e: any) {
      Alert.alert("Could not load", e?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const mine = useMemo(
    () => items.filter((i) => i.worker_id === selected?.id),
    [items, selected],
  );
  const count = (t: string) =>
    t === "all" ? mine.length : mine.filter((i) => i.status === t).length;
  const shown = tab === "all" ? mine : mine.filter((i) => i.status === tab);

  const earned = useMemo(
    () =>
      mine
        .filter((i) => i.status === "approved")
        .reduce((sum, i) => sum + (i.points ?? 0), 0),
    [mine],
  );

  const filteredWorkers = useMemo(
    () =>
      workers.filter((w) =>
        (w.name ?? "").toLowerCase().includes(search.toLowerCase()),
      ),
    [workers, search],
  );

  const toReviewTotal = items.filter((i) => i.status === "submitted").length;

  const latestFor = (workerId: string) => {
    const list = items.filter((i) => i.worker_id === workerId);
    if (!list.length) return null;
    return [...list].sort((a, b) => {
      const ta = timeOf(a) ? new Date(timeOf(a)).getTime() : 0;
      const tb = timeOf(b) ? new Date(timeOf(b)).getTime() : 0;
      return tb - ta;
    })[0];
  };

  const goBack = () => (selected ? setSelected(null) : router.back());

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const onShift = selected?.on_shift ?? false;
  const shiftText =
    selected?.shift_start && selected?.shift_end
      ? `${selected.shift_start} - ${selected.shift_end}`
      : "Not set";

  return (
    <SafeAreaView style={s.safe} edges={["top", "left", "right"]}>
      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={goBack}
          style={s.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>
          {selected ? selected.name : "Assign Work"}
        </Text>
        {selected ? (
          <TouchableOpacity style={s.newBtn} onPress={() => setFormOpen(true)}>
            <Ionicons name="add" size={16} color={C.white} />
            <Text style={s.newBtnTxt}>New work</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 80 }} />
        )}
      </View>

      {/* ── Step 1: choose worker ── */}
      {!selected && (
        <View style={{ flex: 1, padding: 16 }}>
          <View style={s.statRow}>
            <View style={s.statBox}>
              <Text style={s.statLabel}>Total gausevak</Text>
              <Text style={s.statValue}>{workers.length}</Text>
            </View>
            <View style={s.statBox}>
              <Text style={s.statLabel}>Total tasks</Text>
              <Text style={s.statValue}>{items.length}</Text>
            </View>
            <View style={s.statBox}>
              <Text style={s.statLabel}>To review</Text>
              <Text style={s.statValue}>{toReviewTotal}</Text>
            </View>
          </View>

          <View style={s.searchWrap}>
            <Ionicons name="search" size={18} color={C.textLight} />
            <TextInput
              style={s.searchInput}
              placeholder="Search gausevak"
              placeholderTextColor={C.textLight}
              value={search}
              onChangeText={setSearch}
            />
          </View>

          {loading ? (
            <ActivityIndicator color={C.primary} style={{ marginTop: 30 }} />
          ) : (
            <FlatList
              data={filteredWorkers}
              keyExtractor={(w) => w.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={C.primary}
                />
              }
              ListEmptyComponent={
                <Text style={s.empty}>No gausevak found.</Text>
              }
              renderItem={({ item: w }) => {
                const latest = latestFor(w.id);
                const address = w.address || w.location;
                return (
                  <View style={s.worker}>
                    <TouchableOpacity
                      style={s.workerTop}
                      activeOpacity={0.7}
                      onPress={() => {
                        setSelected(w);
                        setTab("all");
                      }}
                    >
                      <Avatar w={w} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.workerName} numberOfLines={1}>
                          {w.name}
                        </Text>
                        {!!address && (
                          <View style={s.addrRow}>
                            <Ionicons
                              name="location-outline"
                              size={13}
                              color={C.textMuted}
                            />
                            <Text style={s.muted} numberOfLines={1}>
                              {address}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color={C.textLight}
                      />
                    </TouchableOpacity>

                    <View style={s.latestBox}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.latestLabel}>Latest assigned work</Text>
                        <Text style={s.latestTitle} numberOfLines={2}>
                          {latest ? latest.title : "No work assigned yet"}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={s.assignBtn}
                        activeOpacity={0.8}
                        onPress={() => {
                          setSelected(w);
                          setTab("all");
                          setFormOpen(true);
                        }}
                      >
                        <Ionicons
                          name="add-circle-outline"
                          size={16}
                          color={C.white}
                        />
                        <Text style={s.assignBtnTxt}>Assign</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }}
            />
          )}
        </View>
      )}

      {/* ── Step 2: worker's work + status ── */}
      {selected && (
        <View style={{ flex: 1, padding: 16 }}>
          {/* Worker status + shift + points */}
          <View style={s.statusCard}>
            <View style={s.rowBetween}>
              <View
                style={[
                  s.chip,
                  { backgroundColor: C.successBg, borderColor: C.success },
                ]}
              >
                <View style={[s.chipDot, { backgroundColor: C.success }]} />
                <Text style={[s.chipTxt, { color: C.success }]}>
                  {selected.active === false ? "Inactive" : "Active duty"}
                </Text>
              </View>
              <View
                style={[
                  s.chip,
                  {
                    backgroundColor: onShift ? C.chipBg : C.card,
                    borderColor: onShift ? C.dark : C.textLight,
                  },
                ]}
              >
                <Text
                  style={[
                    s.chipTxt,
                    { color: onShift ? C.dark : C.textMuted },
                  ]}
                >
                  {onShift ? "On shift" : "Off shift"}
                </Text>
              </View>
            </View>

            <View style={s.shiftRow}>
              <View style={s.shiftCell}>
                <Text style={s.shiftLabel}>Station</Text>
                <Text style={s.shiftValue} numberOfLines={1}>
                  {selected.station || selected.address || "-"}
                </Text>
              </View>
              <View style={s.shiftDivider} />
              <View style={s.shiftCell}>
                <Text style={s.shiftLabel}>Shift today</Text>
                <Text style={s.shiftValue}>{shiftText}</Text>
              </View>
              <View style={s.shiftDivider} />
              <View style={s.shiftCell}>
                <Text style={s.shiftLabel}>Points earned</Text>
                <Text style={[s.shiftValue, { color: C.success }]}>
                  +{earned} pts
                </Text>
              </View>
            </View>
          </View>

          {/* Tabs */}
          <View style={{ height: 44, marginBottom: 6 }}>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={TABS as unknown as string[]}
              keyExtractor={(t) => t}
              renderItem={({ item: t }) => {
                const on = tab === t;
                return (
                  <TouchableOpacity
                    style={[s.tab, on && s.tabOn]}
                    onPress={() => setTab(t as any)}
                  >
                    <Text style={[s.tabTxt, on && { color: C.white }]}>
                      {t === "all" ? "All" : LABEL[t as Status]} {count(t)}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>

          {/* Assigned work cards */}
          <FlatList
            data={shown}
            keyExtractor={(i) => i.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={C.primary}
              />
            }
            ListEmptyComponent={
              <Text style={s.empty}>
                {mine.length
                  ? "Nothing in this status."
                  : `No work yet. Tap "New work" to write the first task for ${selected.name}.`}
              </Text>
            }
            renderItem={({ item: it }) => {
              const pr = PRIORITY_STYLE[(it.priority as Priority) ?? "normal"];
              const hasProof =
                it.status === "submitted" ||
                it.status === "approved" ||
                !!(it as any).photos?.length;
              const when = it.due_date
                ? `Due ${it.due_date}`
                : timeOf(it)
                  ? fmtShort(timeOf(it))
                  : "";
              return (
                <TouchableOpacity
                  style={s.card}
                  onPress={() => setDetailId(it.id)}
                  activeOpacity={0.8}
                >
                  <View style={s.rowBetween}>
                    <View style={s.rowGapSm}>
                      <View style={[s.tag, { backgroundColor: pr.bg }]}>
                        <Text style={[s.tagTxt, { color: pr.fg }]}>
                          {(it.priority ?? "normal").toString().toUpperCase()}
                        </Text>
                      </View>
                      <View style={[s.tag, { backgroundColor: C.successBg }]}>
                        <Text style={[s.tagTxt, { color: C.success }]}>
                          +{it.points ?? 0} pts
                        </Text>
                      </View>
                    </View>
                    <Text
                      style={[
                        s.pill,
                        {
                          color: STATUS_COLOR[it.status],
                          backgroundColor: STATUS_BG[it.status],
                          borderColor: STATUS_COLOR[it.status],
                        },
                      ]}
                    >
                      {LABEL[it.status]}
                    </Text>
                  </View>

                  {!!when && (
                    <View style={s.timeRow}>
                      <Ionicons
                        name="time-outline"
                        size={13}
                        color={C.textMuted}
                      />
                      <Text style={s.muted}>{when}</Text>
                    </View>
                  )}

                  <Text style={s.cardTitle} numberOfLines={2}>
                    {it.title}
                  </Text>

                  {(it.submission_count ?? 0) > 1 && (
                    <Text style={s.muted}>
                      Resubmitted {(it.submission_count ?? 1) - 1}x
                    </Text>
                  )}

                  <Rail status={it.status} />

                  {hasProof && (
                    <View style={s.proofRow}>
                      <Ionicons
                        name="attach"
                        size={15}
                        color={C.success}
                      />
                      <Text style={s.proofTxt}>
                        Proof attached - tap to view
                      </Text>
                      <Ionicons
                        name="chevron-forward"
                        size={14}
                        color={C.textMuted}
                      />
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}

      {selected && (
        <AssignForm
          visible={formOpen}
          worker={selected}
          onClose={() => setFormOpen(false)}
          onDone={() => {
            setFormOpen(false);
            load();
          }}
        />
      )}
      <DetailModal
        id={detailId}
        onClose={() => setDetailId(null)}
        onChanged={() => {
          setDetailId(null);
          load();
        }}
      />
    </SafeAreaView>
  );
}

// ─── Write new work
function AssignForm({
  visible,
  worker,
  onClose,
  onDone,
}: {
  visible: boolean;
  worker: Worker;
  onClose: () => void;
  onDone: () => void;
}) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [priority, setPriority] = useState<Priority>("normal");
  const [due, setDue] = useState("");
  const [points, setPoints] = useState("1");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (title.trim().length < 2)
      return Alert.alert("Write what needs to be done");
    if (due && !/^\d{4}-\d{2}-\d{2}$/.test(due))
      return Alert.alert("Due date must look like 2026-10-25");
    setBusy(true);
    try {
      await api.createAssignment({
        worker_ids: [worker.id],
        title: title.trim(),
        description: desc.trim() || null,
        priority,
        due_date: due || null,
        points: parseInt(points, 10) || 0,
      });
      setTitle("");
      setDesc("");
      setDue("");
      setPoints("1");
      setPriority("normal");
      onDone();
    } catch (e: any) {
      Alert.alert("Could not assign", e?.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={s.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={{ padding: 16 }}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={s.h1}>New work for {worker.name}</Text>
            <Text style={s.label}>What needs to be done</Text>
            <TextInput
              style={s.input}
              value={title}
              onChangeText={setTitle}
              maxLength={120}
              placeholder="Clean shed 2 and refill water troughs"
              placeholderTextColor={C.textLight}
            />
            <Text style={s.label}>Details (optional)</Text>
            <TextInput
              style={[s.input, { height: 90, textAlignVertical: "top" }]}
              multiline
              value={desc}
              onChangeText={setDesc}
              placeholder="Anything the gausevak should know"
              placeholderTextColor={C.textLight}
            />
            <Text style={s.label}>Priority</Text>
            <View style={s.rowGap}>
              {PRIORITIES.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[s.tab, priority === p && s.tabOn]}
                  onPress={() => setPriority(p)}
                >
                  <Text
                    style={[s.tabTxt, priority === p && { color: C.white }]}
                  >
                    {p[0].toUpperCase() + p.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={s.label}>Due date (YYYY-MM-DD, optional)</Text>
            <TextInput
              style={s.input}
              value={due}
              onChangeText={setDue}
              placeholder="2026-10-25"
              placeholderTextColor={C.textLight}
              keyboardType="numbers-and-punctuation"
            />
            <Text style={s.label}>Points on approval</Text>
            <TextInput
              style={s.input}
              value={points}
              onChangeText={setPoints}
              keyboardType="number-pad"
            />
            <View style={[s.rowGap, { marginTop: 20 }]}>
              <TouchableOpacity style={s.btn} onPress={onClose}>
                <Text style={s.btnTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.btnP, busy && { opacity: 0.6 }]}
                disabled={busy}
                onPress={submit}
              >
                <Text style={s.btnPTxt}>
                  {busy ? "Assigning..." : `Assign to ${worker.name}`}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Work order details + review
function SectionTitle({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={s.secTitleRow}>
      <Ionicons name={icon} size={15} color={C.accent} />
      <Text style={s.secTitle}>{text}</Text>
    </View>
  );
}

function DetailModal({
  id,
  onClose,
  onChanged,
}: {
  id: string | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [it, setIt] = useState<WorkAssignment | null>(null);
  const [pts, setPts] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) {
      setIt(null);
      return;
    }
    setNote("");
    api
      .getAdminAssignment(id)
      .then((d) => {
        setIt(d);
        setPts(String(d.points ?? 0));
      })
      .catch((e: any) => {
        Alert.alert("Could not load", e?.message ?? "");
        onClose();
      });
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const review = async (action: "approve" | "reject") => {
    if (!id) return;
    if (action === "reject" && !note.trim())
      return Alert.alert("Add a reason to reject");
    setBusy(true);
    try {
      await api.reviewAssignment(id, {
        action,
        points: parseInt(pts, 10) || 0,
        note: note.trim() || null,
      });
      onChanged();
    } catch (e: any) {
      Alert.alert("Could not review", e?.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const remove = () =>
    Alert.alert("Withdraw this work?", "The gausevak will no longer see it.", [
      { text: "Keep", style: "cancel" },
      {
        text: "Withdraw",
        style: "destructive",
        onPress: async () => {
          try {
            await api.deleteAssignment(id!);
            onChanged();
          } catch (e: any) {
            Alert.alert("Could not withdraw", e?.message ?? "");
          }
        },
      },
    ]);

  const canReview = it?.status === "submitted";

  return (
    <Modal
      visible={!!id}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.grabber} />
          <View style={s.sheetHeader}>
            <View style={s.rowGapSm}>
              <Ionicons name="clipboard-outline" size={18} color={C.accent} />
              <Text style={s.sheetTitle}>Work order details</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={s.closeBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={18} color={C.text} />
            </TouchableOpacity>
          </View>

          {!it ? (
            <ActivityIndicator color={C.primary} style={{ margin: 40 }} />
          ) : (
            <>
              <ScrollView
                contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {/* Title + status + worker + due */}
                <View style={s.block}>
                  <View style={s.rowBetween}>
                    <Text style={[s.h1, { flex: 1, marginBottom: 0 }]}>
                      {it.title}
                    </Text>
                    <Text
                      style={[
                        s.pill,
                        {
                          color: STATUS_COLOR[it.status],
                          backgroundColor: STATUS_BG[it.status],
                          borderColor: STATUS_COLOR[it.status],
                        },
                      ]}
                    >
                      {LABEL[it.status]}
                    </Text>
                  </View>
                  <View style={s.metaRow}>
                    <Ionicons
                      name="person-outline"
                      size={14}
                      color={C.textMuted}
                    />
                    <Text style={s.muted}>For {it.worker_name}</Text>
                  </View>
                  <View style={s.metaRow}>
                    <Ionicons
                      name="calendar-outline"
                      size={14}
                      color={C.textMuted}
                    />
                    <Text style={s.muted}>
                      {it.due_date ? `Due ${it.due_date}` : "No due date"}
                    </Text>
                  </View>
                  <View style={s.metaRow}>
                    <Ionicons
                      name="trophy-outline"
                      size={14}
                      color={C.textMuted}
                    />
                    <Text style={s.muted}>
                      {it.points} point{it.points === 1 ? "" : "s"} on approval
                    </Text>
                  </View>
                </View>

                {/* Description */}
                {!!it.description && (
                  <View style={s.block}>
                    <SectionTitle
                      icon="document-text-outline"
                      text="Work description"
                    />
                    <Text style={s.body}>{it.description}</Text>
                  </View>
                )}

                {!!it.decline_reason && (
                  <View style={[s.block, { backgroundColor: C.redBg }]}>
                    <SectionTitle
                      icon="close-circle-outline"
                      text="Cancelled by worker"
                    />
                    <Text style={[s.body, { color: C.red }]}>
                      {it.decline_reason}
                    </Text>
                  </View>
                )}

                {/* Worker note */}
                {!!it.submission_note && (
                  <View style={s.block}>
                    <SectionTitle
                      icon="chatbubble-ellipses-outline"
                      text="Worker note"
                    />
                    <Text style={s.body}>{it.submission_note}</Text>
                  </View>
                )}

                {/* Image proof */}
                {!!it.photos?.length && (
                  <View style={s.block}>
                    <SectionTitle
                      icon="camera-outline"
                      text="Image proof sent by worker"
                    />
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={{ marginTop: 8 }}
                    >
                      {it.photos.map((p, i) => (
                        <Image key={i} source={{ uri: p }} style={s.photo} />
                      ))}
                    </ScrollView>
                  </View>
                )}

                {!!it.review_note && (
                  <View style={s.block}>
                    <SectionTitle
                      icon="create-outline"
                      text="Your review note"
                    />
                    <Text style={s.body}>{it.review_note}</Text>
                  </View>
                )}

                {/* Lifecycle history */}
                <View style={s.block}>
                  <SectionTitle icon="git-branch-outline" text="Work lifecycle history" />
                  {(it.history ?? []).map((h, i) => (
                    <View key={i} style={s.hist}>
                      <View
                        style={[
                          s.histDot,
                          {
                            backgroundColor:
                              STATUS_COLOR[h.status as Status] ?? C.textMuted,
                          },
                        ]}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={s.bold}>
                          {LABEL[h.status as Status] ?? h.status}{" "}
                          <Text style={s.muted}>by {h.by_name}</Text>
                        </Text>
                        <Text style={s.muted}>
                          {fmtDate(h.at)}
                          {h.note ? ` - ${h.note}` : ""}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>

                {/* Review inputs */}
                {canReview && (
                  <View style={s.block}>
                    <Text style={s.label}>Points to give</Text>
                    <TextInput
                      style={s.input}
                      value={pts}
                      onChangeText={setPts}
                      keyboardType="number-pad"
                    />
                    <Text style={s.label}>Note (required to reject)</Text>
                    <TextInput
                      style={s.input}
                      value={note}
                      onChangeText={setNote}
                      placeholder="Optional for approval"
                      placeholderTextColor={C.textLight}
                    />
                  </View>
                )}

                {it.status !== "approved" && (
                  <TouchableOpacity style={s.withdrawBtn} onPress={remove}>
                    <Ionicons name="trash-outline" size={15} color={C.red} />
                    <Text style={[s.btnTxt, { color: C.red }]}>
                      Withdraw work
                    </Text>
                  </TouchableOpacity>
                )}
              </ScrollView>

              {/* Sticky action bar */}
              {canReview && (
                <View style={s.actionBar}>
                  <TouchableOpacity
                    style={[s.rejectBtn, busy && { opacity: 0.6 }]}
                    disabled={busy}
                    onPress={() => review("reject")}
                  >
                    <Text style={[s.btnTxt, { color: C.red }]}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.approveBtn, busy && { opacity: 0.6 }]}
                    disabled={busy}
                    onPress={() => review("approve")}
                  >
                    <Ionicons
                      name="thumbs-up-outline"
                      size={16}
                      color={C.white}
                    />
                    <Text style={s.btnPTxt}>
                      Approve & release points (+{parseInt(pts, 10) || 0})
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  // header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: C.text,
    letterSpacing: -0.4,
  },
  newBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: C.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  newBtnTxt: { color: C.white, fontWeight: "700", fontSize: 12 },

  // typography
  h1: {
    fontSize: 18,
    fontWeight: "700",
    color: C.text,
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  muted: { color: C.textMuted, fontSize: 12 },
  body: { color: C.text, fontSize: 14, marginTop: 6, lineHeight: 20 },
  bold: { fontWeight: "700", color: C.text, fontSize: 13 },
  label: {
    color: C.textMuted,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.inputBg,
    color: C.text,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 6,
  },
  empty: {
    color: C.textLight,
    textAlign: "center",
    marginTop: 40,
    paddingHorizontal: 20,
    fontSize: 13,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  rowGap: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  rowGapSm: { flexDirection: "row", gap: 6, alignItems: "center" },

  // stats + search (worker list)
  statRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  statBox: {
    flex: 1,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  statLabel: { fontSize: 11, color: C.textMuted, fontWeight: "600" },
  statValue: {
    fontSize: 18,
    fontWeight: "800",
    color: C.text,
    marginTop: 2,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: C.text,
  },

  // worker card
  worker: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
  },
  workerTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarTxt: { color: C.white, fontWeight: "700" },
  workerName: { color: C.text, fontSize: 15, fontWeight: "700" },
  addrRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 },
  latestBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 10,
    marginTop: 12,
  },
  latestLabel: { fontSize: 11, color: C.textMuted, fontWeight: "600" },
  latestTitle: {
    fontSize: 13,
    color: C.text,
    fontWeight: "700",
    marginTop: 2,
  },
  assignBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.deep,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  assignBtnTxt: { color: C.white, fontWeight: "700", fontSize: 13 },

  // worker status card
  statusCard: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipDot: { width: 7, height: 7, borderRadius: 4 },
  chipTxt: { fontSize: 11, fontWeight: "700" },
  shiftRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card,
    borderRadius: 12,
    paddingVertical: 10,
    marginTop: 12,
  },
  shiftCell: { flex: 1, alignItems: "center", paddingHorizontal: 6 },
  shiftDivider: { width: 1, height: 28, backgroundColor: C.border },
  shiftLabel: { fontSize: 10, color: C.textMuted, fontWeight: "600" },
  shiftValue: {
    fontSize: 13,
    color: C.text,
    fontWeight: "700",
    marginTop: 3,
  },

  // tabs
  tab: {
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
    borderRadius: 99,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 6,
    alignSelf: "flex-start",
  },
  tabOn: { backgroundColor: C.deep, borderColor: C.deep },
  tabTxt: { color: C.text, fontSize: 12, fontWeight: "600" },

  // work card
  card: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  tag: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  tagTxt: { fontSize: 10, fontWeight: "800" },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 10,
  },
  cardTitle: {
    color: C.text,
    fontSize: 15,
    fontWeight: "700",
    marginTop: 4,
  },
  pill: {
    fontSize: 11,
    fontWeight: "700",
    borderWidth: 1,
    borderRadius: 99,
    paddingHorizontal: 9,
    paddingVertical: 2,
    overflow: "hidden",
  },
  proofRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.successBg,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 12,
  },
  proofTxt: { flex: 1, color: C.success, fontSize: 12, fontWeight: "600" },

  // rail (unchanged)
  rail: { flexDirection: "row", marginTop: 14 },
  step: { flex: 1, alignItems: "center" },
  line: {
    position: "absolute",
    top: 6,
    right: "50%",
    width: "100%",
    height: 2,
  },
  dot: { width: 14, height: 14, borderRadius: 7 },
  stepTxt: {
    fontSize: 10,
    color: C.textLight,
    marginTop: 4,
    fontWeight: "500",
  },

  // buttons
  btn: {
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  btnTxt: { color: C.text, fontSize: 14, fontWeight: "600" },
  btnP: {
    backgroundColor: C.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  btnPTxt: { color: C.white, fontWeight: "700", fontSize: 14 },

  // detail sheet
  overlay: { flex: 1, backgroundColor: C.overlay, justifyContent: "flex-end" },
  sheet: {
    backgroundColor: C.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "92%",
    minHeight: "50%",
    overflow: "hidden",
  },
  grabber: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.textLight,
    marginTop: 8,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  sheetTitle: { fontSize: 15, fontWeight: "700", color: C.text },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
  },
  block: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  secTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  secTitle: { fontSize: 13, fontWeight: "700", color: C.accent },
  photo: {
    width: 220,
    height: 170,
    borderRadius: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  hist: {
    flexDirection: "row",
    gap: 10,
    borderLeftWidth: 2,
    borderLeftColor: C.border,
    paddingLeft: 10,
    marginTop: 10,
  },
  histDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  withdrawBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: C.red,
    backgroundColor: C.white,
    borderRadius: 10,
    paddingVertical: 11,
    marginTop: 4,
  },
  actionBar: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    backgroundColor: C.white,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  rejectBtn: {
    borderWidth: 1,
    borderColor: C.red,
    backgroundColor: C.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  approveBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: C.deep,
    borderRadius: 12,
    paddingVertical: 14,
  },
});