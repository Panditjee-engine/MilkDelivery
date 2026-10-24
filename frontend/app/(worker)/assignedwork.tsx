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
import * as ImagePicker from "expo-image-picker";
import { api } from "../../src/services/api";
import type { WorkAssignment, AssignmentStatus } from "../../src/services/api";

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
  redBorder: "#FECACA",
  blue: "#2563EB",
  blueBg: "#EFF6FF",
  amber: "#D97706",
  amberBg: "#FFFBEB",
  amberBorder: "#FDE68A",
};

type Status = AssignmentStatus;
const STEPS: Status[] = ["assigned", "accepted", "submitted", "approved"];
const LABEL: Record<Status, string> = {
  assigned: "New",
  accepted: "Accepted",
  submitted: "Submitted",
  approved: "Approved",
  rejected: "Rejected",
  declined: "Cancelled",
};
const STATUS_COLOR: Record<Status, string> = {
  assigned: C.dark,
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
const PRIORITY_STYLE: Record<string, { fg: string; bg: string }> = {
  high: { fg: C.red, bg: C.redBg },
  normal: { fg: C.amber, bg: C.amberBg },
  low: { fg: C.success, bg: C.successBg },
};

type TabKey = "todo" | "waiting" | "approved" | "cancelled" | "all";
const TABS: { key: TabKey; label: string; statuses?: Status[] }[] = [
  {
    key: "todo",
    label: "To do",
    statuses: ["assigned", "accepted", "rejected"],
  },
  { key: "waiting", label: "Waiting", statuses: ["submitted"] },
  { key: "approved", label: "Approved", statuses: ["approved"] },
  { key: "cancelled", label: "Cancelled", statuses: ["declined"] },
  { key: "all", label: "All" },
];

const MAX_PHOTOS = 3;
const todayStr = () => new Date().toISOString().split("T")[0];
const fmtDate = (x?: string | null) =>
  x ? new Date(x).toLocaleString("en-IN") : "";
const isOverdue = (it: WorkAssignment) =>
  !!it.due_date &&
  it.due_date < todayStr() &&
  (it.status === "assigned" ||
    it.status === "accepted" ||
    it.status === "rejected");

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

// ─── Action buttons (card + detail)
function Actions({
  it,
  busy,
  onAccept,
  onCancel,
  onSubmit,
}: {
  it: WorkAssignment;
  busy: boolean;
  onAccept: () => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  if (it.status === "assigned") {
    return (
      <View style={s.actionRow}>
        <TouchableOpacity
          style={[s.btnP, { flex: 1 }, busy && { opacity: 0.6 }]}
          disabled={busy}
          onPress={onAccept}
        >
          <Ionicons name="checkmark-circle-outline" size={16} color={C.white} />
          <Text style={s.btnPTxt}>Accept work</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.btn, { borderColor: C.red }]}
          disabled={busy}
          onPress={onCancel}
        >
          <Text style={[s.btnTxt, { color: C.red }]}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }
  if (it.status === "accepted" || it.status === "rejected") {
    return (
      <View style={s.actionRow}>
        <TouchableOpacity style={[s.btnP, { flex: 1 }]} onPress={onSubmit}>
          <Ionicons name="camera-outline" size={16} color={C.white} />
          <Text style={s.btnPTxt}>
            {it.status === "rejected" ? "Fix and resubmit" : "Submit work"}
          </Text>
        </TouchableOpacity>
        {it.status === "accepted" && (
          <TouchableOpacity
            style={[s.btn, { borderColor: C.red }]}
            onPress={onCancel}
          >
            <Text style={[s.btnTxt, { color: C.red }]}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }
  return null;
}

// ─── Main screen
export default function WorkerAssignedWorkScreen() {
  const router = useRouter();
  const [items, setItems] = useState<WorkAssignment[]>([]);
  const [tab, setTab] = useState<TabKey>("todo");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [submitFor, setSubmitFor] = useState<WorkAssignment | null>(null);
  const [cancelFor, setCancelFor] = useState<WorkAssignment | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.workerGetAssignments();
      setItems(res?.assignments ?? []);
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

  const accept = async (it: WorkAssignment) => {
    setBusyId(it.id);
    try {
      await api.workerAcceptAssignment(it.id);
      await load();
    } catch (e: any) {
      Alert.alert("Could not accept", e?.message ?? "");
      load();
    } finally {
      setBusyId(null);
    }
  };

  const countFor = (statuses?: Status[]) =>
    statuses
      ? items.filter((i) => statuses.includes(i.status)).length
      : items.length;

  const shown = useMemo(() => {
    const t = TABS.find((x) => x.key === tab)!;
    return t.statuses
      ? items.filter((i) => t.statuses!.includes(i.status))
      : items;
  }, [items, tab]);

  const earned = useMemo(
    () =>
      items
        .filter((i) => i.status === "approved")
        .reduce((sum, i) => sum + (i.points_given ?? 0), 0),
    [items],
  );
  const needAction = countFor(["assigned", "rejected"]);

  const openSubmit = (it: WorkAssignment) => {
    setDetailId(null);
    setSubmitFor(it);
  };
  const openCancel = (it: WorkAssignment) => {
    setDetailId(null);
    setCancelFor(it);
  };

  return (
    <SafeAreaView style={s.safe} edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={s.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>My Work</Text>
        {needAction > 0 && (
          <View style={s.badge}>
            <Text style={s.badgeTxt}>{needAction} need action</Text>
          </View>
        )}
      </View>

      <View style={{ flex: 1, padding: 16, paddingBottom: 0 }}>
        {/* Summary card */}
        <View style={s.summary}>
          <View style={s.sumCell}>
            <Text style={s.sumLabel}>Points earned</Text>
            <Text style={[s.sumValue, { color: C.success }]}>+{earned}</Text>
          </View>
          <View style={s.sumDivider} />
          <View style={s.sumCell}>
            <Text style={s.sumLabel}>To do</Text>
            <Text style={s.sumValue}>
              {countFor(["assigned", "accepted", "rejected"])}
            </Text>
          </View>
          <View style={s.sumDivider} />
          <View style={s.sumCell}>
            <Text style={s.sumLabel}>Waiting</Text>
            <Text style={s.sumValue}>{countFor(["submitted"])}</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={{ height: 44, marginBottom: 6 }}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={TABS}
            keyExtractor={(t) => t.key}
            renderItem={({ item: t }) => {
              const on = tab === t.key;
              return (
                <TouchableOpacity
                  style={[s.tab, on && s.tabOn]}
                  onPress={() => setTab(t.key)}
                >
                  <Text style={[s.tabTxt, on && { color: C.white }]}>
                    {t.label} {countFor(t.statuses)}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>

        {loading ? (
          <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={shown}
            keyExtractor={(i) => i.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 24 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  load();
                }}
                tintColor={C.primary}
              />
            }
            ListEmptyComponent={
              <Text style={s.empty}>
                {items.length
                  ? "Nothing here right now."
                  : "No work assigned to you yet."}
              </Text>
            }
            renderItem={({ item: it }) => {
              const pr = PRIORITY_STYLE[it.priority as string] ??
                PRIORITY_STYLE.normal;
              const overdue = isOverdue(it);
              return (
                <TouchableOpacity
                  style={s.workCard}
                  onPress={() => setDetailId(it.id)}
                  activeOpacity={0.85}
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
                          +{it.points} pts
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

                  <View style={s.timeRow}>
                    <Ionicons
                      name="time-outline"
                      size={13}
                      color={overdue ? C.red : C.textMuted}
                    />
                    <Text style={[s.muted, overdue && { color: C.red }]}>
                      {it.due_date ? `Due ${it.due_date}` : "No due date"}
                      {overdue ? " (overdue)" : ""}
                    </Text>
                  </View>

                  <Text style={s.cardTitle} numberOfLines={2}>
                    {it.title}
                  </Text>

                  {it.cow_name ? (
                    <View style={s.timeRow}>
                      <Ionicons
                        name="paw-outline"
                        size={13}
                        color={C.textMuted}
                      />
                      <Text style={s.muted}>
                        {it.cow_name}
                        {it.cow_tag ? ` (${it.cow_tag})` : ""}
                      </Text>
                    </View>
                  ) : null}

                  {it.status === "rejected" && (
                    <View
                      style={[
                        s.banner,
                        {
                          backgroundColor: C.redBg,
                          borderColor: C.redBorder,
                        },
                      ]}
                    >
                      <Ionicons
                        name="alert-circle-outline"
                        size={14}
                        color={C.red}
                      />
                      <Text style={[s.bannerTxt, { color: C.red }]}>
                        Rejected: {it.review_note || "Please redo this work."}
                      </Text>
                    </View>
                  )}
                  {it.status === "approved" && (it.points_given ?? 0) > 0 && (
                    <View
                      style={[
                        s.banner,
                        { backgroundColor: C.successBg, borderColor: "#BBF7D0" },
                      ]}
                    >
                      <Ionicons
                        name="trophy-outline"
                        size={14}
                        color={C.success}
                      />
                      <Text style={[s.bannerTxt, { color: C.success }]}>
                        You earned {it.points_given} points
                      </Text>
                    </View>
                  )}

                  <Rail status={it.status} />

                  {(it.status === "submitted" || it.status === "approved") && (
                    <View style={s.proofRow}>
                      <Ionicons name="attach" size={15} color={C.success} />
                      <Text style={s.proofTxt}>
                        Proof sent - tap to view
                      </Text>
                      <Ionicons
                        name="chevron-forward"
                        size={14}
                        color={C.textMuted}
                      />
                    </View>
                  )}

                  {(it.status === "assigned" ||
                    it.status === "accepted" ||
                    it.status === "rejected") && (
                    <View style={{ marginTop: 12 }}>
                      <Actions
                        it={it}
                        busy={busyId === it.id}
                        onAccept={() => accept(it)}
                        onCancel={() => openCancel(it)}
                        onSubmit={() => openSubmit(it)}
                      />
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>

      <DetailModal
        id={detailId}
        busyId={busyId}
        onClose={() => setDetailId(null)}
        onAccept={(it) => {
          setDetailId(null);
          accept(it);
        }}
        onCancel={openCancel}
        onSubmit={openSubmit}
      />
      <SubmitModal
        item={submitFor}
        onClose={() => setSubmitFor(null)}
        onDone={() => {
          setSubmitFor(null);
          load();
        }}
      />
      <CancelModal
        item={cancelFor}
        onClose={() => setCancelFor(null)}
        onDone={() => {
          setCancelFor(null);
          load();
        }}
      />
    </SafeAreaView>
  );
}

// ─── Detail bottom sheet
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
  busyId,
  onClose,
  onAccept,
  onCancel,
  onSubmit,
}: {
  id: string | null;
  busyId: string | null;
  onClose: () => void;
  onAccept: (it: WorkAssignment) => void;
  onCancel: (it: WorkAssignment) => void;
  onSubmit: (it: WorkAssignment) => void;
}) {
  const [it, setIt] = useState<WorkAssignment | null>(null);

  useEffect(() => {
    if (!id) {
      setIt(null);
      return;
    }
    api
      .workerGetAssignment(id)
      .then(setIt)
      .catch((e: any) => {
        Alert.alert("Could not load", e?.message ?? "");
        onClose();
      });
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasActions =
    it && ["assigned", "accepted", "rejected"].includes(it.status);

  return (
    <Modal
      visible={!!id}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={s.overlayBottom}>
        <View style={s.detailSheet}>
          <View style={s.grabber} />
          <View style={s.sheetHeader}>
            <View style={s.rowGapSm}>
              <Ionicons name="clipboard-outline" size={18} color={C.accent} />
              <Text style={s.sheetTitle}>Work details</Text>
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
                showsVerticalScrollIndicator={false}
              >
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
                      name="flag-outline"
                      size={14}
                      color={C.textMuted}
                    />
                    <Text style={s.muted}>{it.priority} priority</Text>
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
                  {it.cow_name ? (
                    <View style={s.metaRow}>
                      <Ionicons
                        name="paw-outline"
                        size={14}
                        color={C.textMuted}
                      />
                      <Text style={s.muted}>
                        {it.cow_name}
                        {it.cow_tag ? ` (${it.cow_tag})` : ""}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {!!it.description && (
                  <View style={s.block}>
                    <SectionTitle
                      icon="document-text-outline"
                      text="Work description"
                    />
                    <Text style={s.body}>{it.description}</Text>
                  </View>
                )}

                {it.status === "rejected" && (
                  <View
                    style={[
                      s.block,
                      { backgroundColor: C.redBg, borderColor: C.redBorder },
                    ]}
                  >
                    <SectionTitle
                      icon="alert-circle-outline"
                      text="Rejected by admin"
                    />
                    <Text style={[s.body, { color: C.red }]}>
                      {it.review_note || "Please redo this work."}
                    </Text>
                  </View>
                )}

                {!!it.decline_reason && (
                  <View style={s.block}>
                    <SectionTitle
                      icon="close-circle-outline"
                      text="Your cancel reason"
                    />
                    <Text style={[s.body, { color: C.red }]}>
                      {it.decline_reason}
                    </Text>
                  </View>
                )}

                {!!it.submission_note && (
                  <View style={s.block}>
                    <SectionTitle
                      icon="chatbubble-ellipses-outline"
                      text="Your note"
                    />
                    <Text style={s.body}>{it.submission_note}</Text>
                  </View>
                )}

                {!!it.photos?.length && (
                  <View style={s.block}>
                    <SectionTitle
                      icon="camera-outline"
                      text="Image proof you sent"
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

                <View style={s.block}>
                  <SectionTitle
                    icon="git-branch-outline"
                    text="Work lifecycle history"
                  />
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
              </ScrollView>

              {hasActions && (
                <View style={s.actionBar}>
                  <Actions
                    it={it}
                    busy={busyId === it.id}
                    onAccept={() => onAccept(it)}
                    onCancel={() => onCancel(it)}
                    onSubmit={() => onSubmit(it)}
                  />
                </View>
              )}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── Submit work with photo
function SubmitModal({
  item,
  onClose,
  onDone,
}: {
  item: WorkAssignment | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [photos, setPhotos] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (item) {
      setPhotos([]);
      setNote("");
    }
  }, [item?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const addAssets = (assets: ImagePicker.ImagePickerAsset[]) => {
    const uris = assets
      .filter((a) => a.base64)
      .map((a) => `data:image/jpeg;base64,${a.base64}`);
    setPhotos((prev) => [...prev, ...uris].slice(0, MAX_PHOTOS));
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted)
      return Alert.alert(
        "Camera permission needed",
        "Allow camera access in settings to take a photo.",
      );
    const res = await ImagePicker.launchCameraAsync({
      base64: true,
      quality: 0.5,
    });
    if (!res.canceled) addAssets(res.assets);
  };

  const pickPhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      base64: true,
      quality: 0.5,
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS - photos.length,
    });
    if (!res.canceled) addAssets(res.assets);
  };

  const submit = async () => {
    if (!item) return;
    if (photos.length === 0)
      return Alert.alert(
        "Add a photo",
        "Take a photo of the finished work first.",
      );
    setBusy(true);
    try {
      await api.workerSubmitAssignment(
        item.id,
        photos,
        note.trim() || undefined,
      );
      Alert.alert("Submitted", "Your admin will review this work.");
      onDone();
    } catch (e: any) {
      Alert.alert("Could not submit", e?.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={!!item} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={s.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={{ padding: 16 }}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={s.h1}>Submit work</Text>
            <View style={s.block}>
              <Text style={s.bold}>{item?.title}</Text>
              <Text style={s.muted}>
                +{item?.points ?? 0} points on approval
              </Text>
            </View>

            <Text style={s.label}>
              Photos of the finished work ({photos.length}/{MAX_PHOTOS})
            </Text>
            <View style={s.rowGap}>
              {photos.map((p, i) => (
                <View key={i}>
                  <Image source={{ uri: p }} style={s.thumb} />
                  <TouchableOpacity
                    style={s.thumbX}
                    onPress={() =>
                      setPhotos((prev) => prev.filter((_, j) => j !== i))
                    }
                  >
                    <Ionicons name="close" size={14} color={C.white} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
            {photos.length < MAX_PHOTOS && (
              <View style={[s.rowGap, { marginTop: 10 }]}>
                <TouchableOpacity style={s.btn} onPress={takePhoto}>
                  <Ionicons name="camera-outline" size={15} color={C.text} />
                  <Text style={s.btnTxt}>Take photo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.btn} onPress={pickPhoto}>
                  <Ionicons name="images-outline" size={15} color={C.text} />
                  <Text style={s.btnTxt}>Choose from gallery</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={s.label}>Note (optional)</Text>
            <TextInput
              style={[s.input, { height: 90, textAlignVertical: "top" }]}
              multiline
              value={note}
              onChangeText={setNote}
              placeholder="Anything your admin should know"
              placeholderTextColor={C.textLight}
            />

            <View style={[s.rowGap, { marginTop: 20 }]}>
              <TouchableOpacity style={s.btn} onPress={onClose} disabled={busy}>
                <Text style={s.btnTxt}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.btnP, busy && { opacity: 0.6 }]}
                onPress={submit}
                disabled={busy}
              >
                <Text style={s.btnPTxt}>
                  {busy ? "Submitting..." : "Submit for review"}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Cancel work
function CancelModal({
  item,
  onClose,
  onDone,
}: {
  item: WorkAssignment | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (item) setReason("");
  }, [item?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const confirm = async () => {
    if (!item) return;
    setBusy(true);
    try {
      await api.workerCancelAssignment(item.id, reason.trim() || undefined);
      onDone();
    } catch (e: any) {
      Alert.alert("Could not cancel", e?.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      visible={!!item}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={s.overlayCenter}
      >
        <View style={s.dialog}>
          <Text style={s.h1}>Cancel this work?</Text>
          <Text style={s.muted}>{item?.title}</Text>
          <Text style={s.label}>Reason (optional)</Text>
          <TextInput
            style={s.input}
            value={reason}
            onChangeText={setReason}
            placeholder="Why can't you do this?"
            placeholderTextColor={C.textLight}
          />
          <View style={[s.rowGap, { marginTop: 14 }]}>
            <TouchableOpacity style={s.btn} onPress={onClose} disabled={busy}>
              <Text style={s.btnTxt}>Keep work</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                s.btnP,
                { backgroundColor: C.red },
                busy && { opacity: 0.6 },
              ]}
              onPress={confirm}
              disabled={busy}
            >
              <Text style={s.btnPTxt}>
                {busy ? "Cancelling..." : "Cancel work"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  // header
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
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
  badge: {
    backgroundColor: C.amberBg,
    borderWidth: 1,
    borderColor: C.amberBorder,
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeTxt: { color: C.amber, fontSize: 11, fontWeight: "700" },

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
    marginTop: 16,
    marginBottom: 6,
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
  },
  empty: {
    color: C.textLight,
    textAlign: "center",
    marginTop: 50,
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
  actionRow: { flexDirection: "row", gap: 8 },

  // summary
  summary: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card,
    borderRadius: 16,
    paddingVertical: 14,
    marginBottom: 12,
  },
  sumCell: { flex: 1, alignItems: "center" },
  sumDivider: { width: 1, height: 30, backgroundColor: C.border },
  sumLabel: { fontSize: 11, color: C.textMuted, fontWeight: "600" },
  sumValue: {
    fontSize: 22,
    fontWeight: "800",
    color: C.text,
    marginTop: 2,
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
  workCard: {
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
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 8,
    marginTop: 10,
  },
  bannerTxt: { flex: 1, fontSize: 12, fontWeight: "600" },
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  btnTxt: { color: C.text, fontSize: 14, fontWeight: "600" },
  btnP: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: C.deep,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  btnPTxt: { color: C.white, fontWeight: "700", fontSize: 14 },

  // detail sheet
  overlayBottom: {
    flex: 1,
    backgroundColor: C.overlay,
    justifyContent: "flex-end",
  },
  detailSheet: {
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
  actionBar: {
    padding: 12,
    backgroundColor: C.white,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },

  // submit + cancel
  thumb: {
    width: 100,
    height: 100,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  thumbX: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(61,31,10,0.65)",
    alignItems: "center",
    justifyContent: "center",
  },
  overlayCenter: {
    flex: 1,
    backgroundColor: C.overlay,
    justifyContent: "center",
    padding: 20,
  },
  dialog: { backgroundColor: C.white, borderRadius: 18, padding: 18 },
});