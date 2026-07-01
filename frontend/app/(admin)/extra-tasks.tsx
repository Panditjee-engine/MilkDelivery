import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { api } from "../../src/services/api";

const C = {
  primary: "#FF9675",
  secondary: "#FD9E69",
  light: "#FFD999",
  dark: "#BB6B3F",
  deep: "#8B6854",
  bg: "#FFF8EF",
  card: "#FFFFFF",
  text: "#3D1F0A",
  textMuted: "#A07850",
  textLight: "#C9A882",
  border: "#F4E3CF",
};

type TaskStatus = "pending" | "verified" | "rejected";
type StatusFilter = "all" | TaskStatus;

interface AdminExtraTask {
  id: string;
  worker_id: string;
  worker_name: string;
  task_type: string;
  description?: string | null;
  image_url?: string | null;
  date: string;
  verification_status: TaskStatus;
  points_awarded: boolean;
  verified_by?: string | null;
  verified_at?: string | null;
  verification_note?: string | null;
}

interface WorkerOption {
  id: string;
  name: string;
  phone?: string;
  is_active?: boolean;
}

interface ExtraTaskResponse {
  date: string;
  total: number;
  pending: number;
  verified: number;
  rejected: number;
  tasks: AdminExtraTask[];
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function formatDateLabel(value?: string) {
  if (!value) return "No date";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value?: string | null) {
  if (!value) return "Not verified yet";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getImageUri(imageUrl?: string | null) {
  if (!imageUrl) return null;
  const trimmed = imageUrl.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("data:") || trimmed.startsWith("http")) return trimmed;
  return `data:image/jpeg;base64,${trimmed}`;
}

function statusPalette(status: TaskStatus) {
  if (status === "verified") {
    return {
      bg: "#ecfdf5",
      border: "#bbf7d0",
      text: "#15803d",
      icon: "checkmark-circle" as const,
    };
  }
  if (status === "rejected") {
    return {
      bg: "#fef2f2",
      border: "#fecaca",
      text: "#dc2626",
      icon: "close-circle" as const,
    };
  }
  return {
    bg: "#fff7ed",
    border: "#fed7aa",
    text: "#c2410c",
    icon: "time" as const,
  };
}

export default function AdminExtraTasksScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ from?: string }>();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState<ExtraTaskResponse | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dateFilter, setDateFilter] = useState(todayStr());
  const [selectedTask, setSelectedTask] = useState<AdminExtraTask | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [workers, setWorkers] = useState<WorkerOption[]>([]);
  const [bonusOpen, setBonusOpen] = useState(false);
  const [workerPickerOpen, setWorkerPickerOpen] = useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState("");
  const [pointsValue, setPointsValue] = useState("10");
  const [bonusNote, setBonusNote] = useState("");
  const [bonusMode, setBonusMode] = useState<"bonus" | "penalty">("bonus");
  const [toast, setToast] = useState<{ msg: string; kind: "success" | "error" } | null>(null);

  const showToast = useCallback((msg: string, kind: "success" | "error") => {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 2500);
  }, []);

  const loadTasks = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const data = await api.getAdminExtraTasks({
        date: dateFilter.trim() || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
      });
      setSummary({
        ...data,
        tasks: Array.isArray(data.tasks) ? data.tasks : [],
      });
    } catch (error: any) {
      setSummary({
        date: dateFilter,
        total: 0,
        pending: 0,
        verified: 0,
        rejected: 0,
        tasks: [],
      });
      showToast(error?.message || "Failed to load extra tasks", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateFilter, showToast, statusFilter]);

  const loadWorkers = useCallback(async () => {
    try {
      const data = await api.getAdminWorkers();
      setWorkers(Array.isArray(data) ? data : []);
    } catch {
      setWorkers([]);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    loadWorkers();
  }, [loadWorkers]);

  const selectedWorker = useMemo(
    () => workers.find((worker) => worker.id === selectedWorkerId) ?? null,
    [selectedWorkerId, workers],
  );

const handleBack = useCallback(() => {
  router.replace("/(admin)/gausevak");
}, [router]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadTasks(false);
  };

  const handleReview = async (action: "approve" | "reject") => {
    if (!selectedTask || submitting) return;
    setSubmitting(true);
    try {
      const result = await api.verifyAdminExtraTask(
        selectedTask.id,
        action,
        reviewNote.trim() || undefined,
      );
      showToast(
        action === "approve"
          ? `Task approved${result.points ? ` • ${result.points} point` : ""}`
          : "Task rejected",
        "success",
      );
      setSelectedTask(null);
      setReviewNote("");
      await loadTasks(false);
    } catch (error: any) {
      showToast(error?.message || "Could not update task", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const submitBonus = async () => {
    if (!selectedWorkerId) {
      showToast("Please choose a worker", "error");
      return;
    }
    const numeric = Number(pointsValue);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      showToast("Enter valid points", "error");
      return;
    }
    setSubmitting(true);
    try {
      const signedPoints = bonusMode === "bonus" ? numeric : -numeric;
      await api.awardAdminBonusPoints({
        worker_id: selectedWorkerId,
        points: signedPoints,
        note: bonusNote.trim() || undefined,
      });
      showToast(
        bonusMode === "bonus" ? "Bonus points added" : "Penalty points added",
        "success",
      );
      setBonusOpen(false);
      setSelectedWorkerId("");
      setPointsValue("10");
      setBonusNote("");
      setBonusMode("bonus");
    } catch (error: any) {
      showToast(error?.message || "Could not update points", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const renderTask = ({ item }: { item: AdminExtraTask }) => {
    const palette = statusPalette(item.verification_status);
    const imageUri = getImageUri(item.image_url);
    return (
      <TouchableOpacity
        style={styles.taskCard}
        activeOpacity={0.85}
        onPress={() => {
          setSelectedTask(item);
          setReviewNote(item.verification_note || "");
        }}
      >
        <View style={styles.taskHeader}>
          <View style={styles.workerAvatar}>
            <Text style={styles.workerAvatarText}>
              {(item.worker_name || "W")[0].toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.taskWorker} numberOfLines={1}>
              {item.worker_name}
            </Text>
            <Text style={styles.taskType}>
              {item.task_type.replace(/_/g, " ")} • {formatDateLabel(item.date)}
            </Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: palette.bg, borderColor: palette.border }]}>
            <Ionicons name={palette.icon} size={12} color={palette.text} />
            <Text style={[styles.statusText, { color: palette.text }]}>
              {item.verification_status}
            </Text>
          </View>
        </View>

        {item.description ? (
          <Text style={styles.taskDescription} numberOfLines={3}>
            {item.description}
          </Text>
        ) : null}

        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.taskImage} />
        ) : (
          <View style={styles.imageFallback}>
            <Ionicons name="image-outline" size={18} color={C.textLight} />
            <Text style={styles.imageFallbackText}>No image attached</Text>
          </View>
        )}

        <View style={styles.cardFooter}>
          <View style={styles.footerTag}>
            <Ionicons name="sparkles-outline" size={12} color={item.points_awarded ? "#15803d" : C.textLight} />
            <Text style={[styles.footerTagText, { color: item.points_awarded ? "#15803d" : C.textLight }]}>
              {item.points_awarded ? "Points awarded" : "No points yet"}
            </Text>
          </View>
          <Ionicons name="arrow-forward" size={16} color={C.textLight} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {toast ? (
        <View
          style={[
            styles.toast,
            toast.kind === "success" ? styles.toastSuccess : styles.toastError,
            { top: insets.top + 10 },
          ]}
        >
          <Ionicons
            name={toast.kind === "success" ? "checkmark-circle" : "alert-circle"}
            size={18}
            color={toast.kind === "success" ? "#15803d" : "#dc2626"}
          />
          <Text
            style={[
              styles.toastText,
              { color: toast.kind === "success" ? "#15803d" : "#dc2626" },
            ]}
          >
            {toast.msg}
          </Text>
        </View>
      ) : null}

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <Ionicons name="arrow-back" size={18} color={C.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Extra Tasks</Text>
          <Text style={styles.headerSub}>Review worker tasks and manage bonus points</Text>
        </View>
        <TouchableOpacity style={styles.headerAction} onPress={() => setBonusOpen(true)}>
          <Ionicons name="gift-outline" size={18} color={C.dark} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.dark} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: "#FFF3DC" }]}>
            <Text style={styles.summaryValue}>{summary?.total ?? 0}</Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: "#FFF7ED" }]}>
            <Text style={styles.summaryValue}>{summary?.pending ?? 0}</Text>
            <Text style={styles.summaryLabel}>Pending</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: "#ECFDF5" }]}>
            <Text style={styles.summaryValue}>{summary?.verified ?? 0}</Text>
            <Text style={styles.summaryLabel}>Verified</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: "#FEF2F2" }]}>
            <Text style={styles.summaryValue}>{summary?.rejected ?? 0}</Text>
            <Text style={styles.summaryLabel}>Rejected</Text>
          </View>
        </View>

        <View style={styles.filterCard}>
          <View style={styles.filterHeader}>
            <Text style={styles.filterTitle}>Filter Tasks</Text>
            <TouchableOpacity onPress={() => loadTasks(false)}>
              <Ionicons name="refresh" size={18} color={C.dark} />
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.dateInput}
            value={dateFilter}
            onChangeText={setDateFilter}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={C.textLight}
            autoCapitalize="none"
          />

          <View style={styles.chipRow}>
            {(["all", "pending", "verified", "rejected"] as StatusFilter[]).map((item) => {
              const active = statusFilter === item;
              return (
                <TouchableOpacity
                  key={item}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => setStatusFilter(item)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                    {item === "all" ? "All" : item}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={styles.applyBtn} onPress={() => loadTasks(false)} activeOpacity={0.85}>
            <Ionicons name="funnel-outline" size={16} color="#fff" />
            <Text style={styles.applyBtnText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={C.dark} />
            <Text style={styles.loadingText}>Loading extra tasks...</Text>
          </View>
        ) : (
          <FlatList
            data={summary?.tasks ?? []}
            scrollEnabled={false}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Ionicons name="clipboard-outline" size={24} color={C.textLight} />
                <Text style={styles.emptyTitle}>No tasks found</Text>
                <Text style={styles.emptySub}>Try another date or status filter.</Text>
              </View>
            }
            renderItem={renderTask}
          />
        )}
      </ScrollView>

      <Modal visible={!!selectedTask} animationType="slide" onRequestClose={() => setSelectedTask(null)}>
        <SafeAreaView style={styles.modalPage}>
          <View style={styles.modalHeader}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedTask(null)}>
              <Ionicons name="arrow-back" size={18} color={C.text} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>Review Task</Text>
              <Text style={styles.modalSub}>{selectedTask?.worker_name}</Text>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody}>
            {selectedTask ? (
              <>
                <View style={styles.detailCard}>
                  <Text style={styles.detailLabel}>Task Type</Text>
                  <Text style={styles.detailValue}>{selectedTask.task_type.replace(/_/g, " ")}</Text>
                  <Text style={styles.detailLabel}>Description</Text>
                  <Text style={styles.detailValue}>
                    {selectedTask.description || "No description added"}
                  </Text>
                  <Text style={styles.detailLabel}>Submitted On</Text>
                  <Text style={styles.detailValue}>{formatDateLabel(selectedTask.date)}</Text>
                  <Text style={styles.detailLabel}>Verified At</Text>
                  <Text style={styles.detailValue}>{formatDateTime(selectedTask.verified_at)}</Text>
                </View>

                {getImageUri(selectedTask.image_url) ? (
                  <Image source={{ uri: getImageUri(selectedTask.image_url)! }} style={styles.detailImage} />
                ) : (
                  <View style={styles.detailImageFallback}>
                    <Ionicons name="images-outline" size={26} color={C.textLight} />
                    <Text style={styles.imageFallbackText}>Worker did not attach an image</Text>
                  </View>
                )}

                <TextInput
                  style={styles.noteInput}
                  value={reviewNote}
                  onChangeText={setReviewNote}
                  placeholder="Verification note"
                  placeholderTextColor={C.textLight}
                  multiline
                />

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.reviewBtn, styles.rejectBtn]}
                    onPress={() => handleReview("reject")}
                    disabled={submitting}
                  >
                    <Text style={styles.rejectBtnText}>{submitting ? "Please wait..." : "Reject"}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.reviewBtn, styles.approveBtn]}
                    onPress={() => handleReview("approve")}
                    disabled={submitting}
                  >
                    <Text style={styles.approveBtnText}>{submitting ? "Please wait..." : "Approve"}</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : null}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={bonusOpen} animationType="slide" onRequestClose={() => setBonusOpen(false)} transparent>
        <View style={styles.sheetBackdrop}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setBonusOpen(false)} activeOpacity={1} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 18 }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Bonus / Penalty Points</Text>
              <TouchableOpacity style={styles.sheetClose} onPress={() => setBonusOpen(false)}>
                <Ionicons name="close" size={18} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.modeRow}>
              {(["bonus", "penalty"] as const).map((mode) => {
                const active = bonusMode === mode;
                return (
                  <TouchableOpacity
                    key={mode}
                    style={[styles.modeChip, active && styles.modeChipActive]}
                    onPress={() => setBonusMode(mode)}
                  >
                    <Text style={[styles.modeChipText, active && styles.modeChipTextActive]}>
                      {mode === "bonus" ? "Bonus" : "Penalty"}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={styles.workerPicker} onPress={() => setWorkerPickerOpen(true)}>
              <Text style={selectedWorker ? styles.workerPickerValue : styles.workerPickerPlaceholder}>
                {selectedWorker ? selectedWorker.name : "Choose worker"}
              </Text>
              <Ionicons name="chevron-down" size={16} color={C.textMuted} />
            </TouchableOpacity>

            <TextInput
              style={styles.sheetInput}
              value={pointsValue}
              onChangeText={setPointsValue}
              placeholder="Points"
              placeholderTextColor={C.textLight}
              keyboardType="numeric"
            />

            <TextInput
              style={[styles.sheetInput, styles.sheetTextArea]}
              value={bonusNote}
              onChangeText={setBonusNote}
              placeholder="Reason / note"
              placeholderTextColor={C.textLight}
              multiline
            />

            <TouchableOpacity style={styles.sheetPrimary} onPress={submitBonus} disabled={submitting}>
              <Text style={styles.sheetPrimaryText}>
                {submitting ? "Please wait..." : bonusMode === "bonus" ? "Award Bonus" : "Apply Penalty"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={workerPickerOpen} transparent animationType="fade" onRequestClose={() => setWorkerPickerOpen(false)}>
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setWorkerPickerOpen(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.pickerSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Select Worker</Text>
              <TouchableOpacity style={styles.sheetClose} onPress={() => setWorkerPickerOpen(false)}>
                <Ionicons name="close" size={18} color={C.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom: 10 }}>
              {workers.map((worker) => (
                <TouchableOpacity
                  key={worker.id}
                  style={[
                    styles.workerOption,
                    selectedWorkerId === worker.id && styles.workerOptionActive,
                  ]}
                  onPress={() => {
                    setSelectedWorkerId(worker.id);
                    setWorkerPickerOpen(false);
                  }}
                >
                  <View style={styles.workerOptionAvatar}>
                    <Text style={styles.workerOptionAvatarText}>
                      {(worker.name || "W")[0].toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.workerOptionName}>{worker.name}</Text>
                    <Text style={styles.workerOptionMeta}>{worker.phone || "No phone"}</Text>
                  </View>
                  {selectedWorkerId === worker.id ? (
                    <Ionicons name="checkmark-circle" size={18} color={C.dark} />
                  ) : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { paddingHorizontal: 16, paddingBottom: 24 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  headerAction: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FFF3DC",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 22, fontWeight: "800", color: C.text },
  headerSub: { marginTop: 2, fontSize: 12, color: C.textMuted },
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14,
  },
  summaryCard: {
    width: "47.5%",
    borderRadius: 18,
    padding: 16,
  },
  summaryValue: { fontSize: 26, fontWeight: "800", color: C.text },
  summaryLabel: { marginTop: 4, fontSize: 12, color: C.textMuted, fontWeight: "600" },
  filterCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  filterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  filterTitle: { fontSize: 15, fontWeight: "800", color: C.text },
  dateInput: {
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bg,
    paddingHorizontal: 14,
    fontSize: 14,
    color: C.text,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
  },
  filterChipActive: {
    backgroundColor: "#FFF3DC",
    borderColor: "#f3c183",
  },
  filterChipText: { fontSize: 12, fontWeight: "700", color: C.textMuted, textTransform: "capitalize" },
  filterChipTextActive: { color: C.dark },
  applyBtn: {
    marginTop: 14,
    height: 46,
    borderRadius: 14,
    backgroundColor: C.dark,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  applyBtnText: { fontSize: 14, fontWeight: "800", color: "#fff" },
  loadingWrap: { alignItems: "center", gap: 12, paddingVertical: 40 },
  loadingText: { fontSize: 13, color: C.textMuted },
  listContent: { gap: 12, paddingBottom: 10 },
  emptyWrap: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 40,
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
  },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: C.text },
  emptySub: { fontSize: 12, color: C.textMuted },
  taskCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    gap: 12,
  },
  taskHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  workerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FFF3DC",
    alignItems: "center",
    justifyContent: "center",
  },
  workerAvatarText: { fontSize: 16, fontWeight: "800", color: C.dark },
  taskWorker: { fontSize: 15, fontWeight: "800", color: C.text },
  taskType: { marginTop: 2, fontSize: 12, color: C.textMuted, textTransform: "capitalize" },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusText: { fontSize: 11, fontWeight: "800", textTransform: "capitalize" },
  taskDescription: { fontSize: 13, lineHeight: 19, color: C.textMuted },
  taskImage: {
    width: "100%",
    height: 180,
    borderRadius: 16,
    backgroundColor: C.bg,
  },
  imageFallback: {
    height: 74,
    borderRadius: 16,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  imageFallbackText: { fontSize: 12, color: C.textLight, fontWeight: "600" },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  footerTag: { flexDirection: "row", alignItems: "center", gap: 6 },
  footerTagText: { fontSize: 12, fontWeight: "700" },
  modalPage: { flex: 1, backgroundColor: C.bg },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modalTitle: { fontSize: 20, fontWeight: "800", color: C.text },
  modalSub: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  modalBody: { paddingHorizontal: 16, paddingBottom: 24, gap: 14 },
  detailCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    gap: 8,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: C.textLight,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  detailValue: { fontSize: 14, color: C.text, lineHeight: 20, textTransform: "capitalize" },
  detailImage: { width: "100%", height: 240, borderRadius: 20, backgroundColor: C.bg },
  detailImageFallback: {
    height: 170,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  noteInput: {
    minHeight: 110,
    borderRadius: 18,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 14,
    color: C.text,
    textAlignVertical: "top",
  },
  actionRow: { flexDirection: "row", gap: 10 },
  reviewBtn: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  rejectBtn: { backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "#fecaca" },
  approveBtn: { backgroundColor: "#ecfdf5", borderWidth: 1, borderColor: "#bbf7d0" },
  rejectBtnText: { fontSize: 15, fontWeight: "800", color: "#dc2626" },
  approveBtnText: { fontSize: 15, fontWeight: "800", color: "#15803d" },
  sheetBackdrop: { flex: 1, backgroundColor: "rgba(61,31,10,0.25)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  sheetHandle: {
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#E5C9AE",
    alignSelf: "center",
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sheetTitle: { fontSize: 17, fontWeight: "800", color: C.text },
  sheetClose: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  modeRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  modeChip: {
    flex: 1,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.bg,
  },
  modeChipActive: { backgroundColor: "#FFF3DC", borderColor: "#f3c183" },
  modeChipText: { fontSize: 13, fontWeight: "700", color: C.textMuted },
  modeChipTextActive: { color: C.dark },
  workerPicker: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  workerPickerPlaceholder: { color: C.textLight, fontSize: 14 },
  workerPickerValue: { color: C.text, fontSize: 14, fontWeight: "700" },
  sheetInput: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bg,
    paddingHorizontal: 14,
    fontSize: 14,
    color: C.text,
    marginBottom: 12,
  },
  sheetTextArea: { minHeight: 90, paddingVertical: 12, textAlignVertical: "top" },
  sheetPrimary: {
    height: 50,
    borderRadius: 16,
    backgroundColor: C.dark,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetPrimaryText: { fontSize: 15, fontWeight: "800", color: "#fff" },
  pickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(61,31,10,0.25)",
    justifyContent: "flex-end",
    padding: 16,
  },
  pickerSheet: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 16,
    maxHeight: "72%",
  },
  workerOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 16,
  },
  workerOptionActive: { backgroundColor: "#FFF8EF" },
  workerOptionAvatar: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "#FFF3DC",
    alignItems: "center",
    justifyContent: "center",
  },
  workerOptionAvatarText: { fontSize: 14, fontWeight: "800", color: C.dark },
  workerOptionName: { fontSize: 14, fontWeight: "700", color: C.text },
  workerOptionMeta: { marginTop: 2, fontSize: 12, color: C.textLight },
  toast: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 20,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderLeftWidth: 4,
  },
  toastSuccess: { backgroundColor: "#ecfdf5", borderLeftColor: "#15803d" },
  toastError: { backgroundColor: "#fef2f2", borderLeftColor: "#dc2626" },
  toastText: { flex: 1, fontSize: 13, fontWeight: "700" },
});
