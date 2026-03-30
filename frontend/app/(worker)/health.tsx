import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../../src/contexts/AuthContext";
import { useLang } from "../../src/contexts/LanguageContext"; // ← shared context
import { api } from "../../src/services/api";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

interface Cow {
  id: string;
  name: string;
  tag?: string;
  tag_id?: string;
  breed?: string;
  isActive?: boolean;
  isSold?: boolean;
}

interface HealthLog {
  id: string;
  cow_id: string;
  cow_name: string;
  cow_tag: string;
  status: string;
  date: string;
}

// Health options are now a function so labels translate dynamically
function useHealthOptions() {
  const { t } = useLang();
  return [
    { key: "healthy",       label: t("healthy"),      icon: "heart-pulse",      lib: "MCI", color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
    { key: "fever",         label: t("fever"),         icon: "thermometer-high", lib: "MCI", color: "#dc2626", bg: "#fff1f2", border: "#fecdd3" },
    { key: "upset_stomach", label: t("upsetStomach"), icon: "stomach",          lib: "MCI", color: "#ea580c", bg: "#fff7ed", border: "#fed7aa" },
    { key: "injury",        label: t("injury"),        icon: "bandage",          lib: "MCI", color: "#ca8a04", bg: "#fefce8", border: "#fde68a" },
    { key: "other",         label: t("other"),         icon: "help-circle",      lib: "I",   color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
  ] as const;
}

type HealthKey = "healthy" | "fever" | "upset_stomach" | "injury" | "other";

function HealthIcon({
  icon,
  lib,
  color,
  size = 18,
}: {
  icon: string;
  lib: string;
  color: string;
  size?: number;
}) {
  if (lib === "I")
    return <Ionicons name={icon as any} size={size} color={color} />;
  return (
    <MaterialCommunityIcons name={icon as any} size={size} color={color} />
  );
}

export default function HealthScreen() {
  const { workerToken } = useAuth();
  const { t } = useLang(); // ← translation hook
  const token = workerToken ?? "";

  const HEALTH_OPTIONS = useHealthOptions(); // ← translated options

  const [cows, setCows] = useState<Cow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [cowHealth, setCowHealth] = useState<
    Record<
      string,
      {
        status: HealthKey | null;
        saving: HealthKey | null;
        expanded: boolean;
      }
    >
  >({});

  const get = (id: string) =>
    cowHealth[id] ?? { status: null, saving: null, expanded: true };
  const patch = (id: string, p: Partial<ReturnType<typeof get>>) =>
    setCowHealth((prev) => ({ ...prev, [id]: { ...get(id), ...p } }));

  const fetchAll = useCallback(async () => {
    try {
      const [cowsData, logs]: [Cow[], HealthLog[]] = await Promise.all([
        api.workerGetCows(),
        api.workerGetTodayHealthLogs(),
      ]);
      const active = (cowsData ?? []).filter(
        (c) => c.isActive !== false && !c.isSold
      );
      setCows(active);

      const logMap: Record<string, HealthKey> = {};
      (logs ?? []).forEach((l) => {
        logMap[l.cow_id] = l.status as HealthKey;
      });

      setCowHealth(() => {
        const next: Record<
          string,
          { status: HealthKey | null; saving: HealthKey | null; expanded: boolean }
        > = {};
        active.forEach((c) => {
          next[c.id] = {
            status: logMap[c.id] ?? null,
            saving: null,
            expanded: !logMap[c.id],
          };
        });
        return next;
      });
    } catch (e) {
      console.log("health fetch error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const toggleExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    patch(id, { expanded: !get(id).expanded });
  };

  const handleSelect = async (cow: Cow, optKey: HealthKey) => {
    const d = get(cow.id);
    if (d.saving) return;

    if (d.status === optKey) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      patch(cow.id, { expanded: false });
      return;
    }
    patch(cow.id, { saving: optKey });
    try {
      await api.workerAddHealthLog({
        cow_id: cow.id,
        cow_name: cow.name,
        cow_tag: cow.tag ?? cow.tag_id ?? "",
        status: optKey,
        date: todayStr(),
      });
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      patch(cow.id, { status: optKey, saving: null, expanded: false });
    } catch (err: any) {
      Alert.alert(t("noMilkQty"), err?.message ?? t("couldNotSave"));
      patch(cow.id, { saving: null });
    }
  };

  const healthyCount = cows.filter((c) => get(c.id).status === "healthy").length;
  const checkedCount = cows.filter((c) => get(c.id).status !== null).length;
  const issueCount = cows.filter(
    (c) => get(c.id).status !== null && get(c.id).status !== "healthy"
  ).length;

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color="#16a34a" />
        <Text style={s.loadingText}>{t("loadingCows")}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={s.scroll}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchAll();
          }}
          tintColor="#16a34a"
        />
      }
    >
      {/* ── Banner ── */}
      <LinearGradient colors={["#f0fdf4", "#dcfce7"]} style={s.banner}>
        <View style={s.bannerLeft}>
          <View style={s.bannerIconBox}>
            <MaterialCommunityIcons name="stethoscope" size={24} color="#16a34a" />
          </View>
          <View>
            <Text style={s.bannerTitle}>{t("healthBannerTitle")}</Text>
            <Text style={s.bannerDate}>{todayStr()}</Text>
          </View>
        </View>
        <View style={s.statsRow}>
          <View style={s.statPill}>
            <Text style={[s.statNum, { color: "#16a34a" }]}>{healthyCount}</Text>
            <Text style={s.statLbl}>{t("healthyCount")}</Text>
          </View>
          <View
            style={[
              s.statPill,
              { backgroundColor: issueCount > 0 ? "#fff1f2" : "#f9fafb" },
            ]}
          >
            <Text style={[s.statNum, { color: issueCount > 0 ? "#dc2626" : "#9ca3af" }]}>
              {issueCount}
            </Text>
            <Text style={s.statLbl}>{t("issuesCount")}</Text>
          </View>
          <View style={s.statPill}>
            <Text style={[s.statNum, { color: "#374151" }]}>
              {checkedCount}/{cows.length}
            </Text>
            <Text style={s.statLbl}>{t("checkedCount")}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* ── Progress ── */}
      <View style={s.progressRow}>
        <Text style={s.progressTxt}>
          {checkedCount} {t("of")} {cows.length} {t("cowsChecked")}
        </Text>
        <Text style={s.progressPct}>
          {cows.length > 0 ? Math.round((checkedCount / cows.length) * 100) : 0}%
        </Text>
      </View>
      <View style={s.progressBg}>
        <View
          style={[
            s.progressFill,
            {
              width: `${cows.length > 0 ? (checkedCount / cows.length) * 100 : 0}%` as any,
            },
          ]}
        />
      </View>

      {/* ── Cow Cards ── */}
      {cows.map((cow) => {
        const d = get(cow.id);
        const selectedOpt = HEALTH_OPTIONS.find((o) => o.key === d.status);
        const isHealthy = d.status === "healthy";
        const hasIssue = d.status && !isHealthy;

        return (
          <View
            key={cow.id}
            style={[
              s.card,
              isHealthy && { borderColor: "#bbf7d0", backgroundColor: "#f0fdf4" },
              hasIssue && { borderColor: "#fecdd3", backgroundColor: "#fff1f2" },
            ]}
          >
            <TouchableOpacity
              style={s.cardTop}
              onPress={() => toggleExpand(cow.id)}
              activeOpacity={0.75}
            >
              <View
                style={[
                  s.cowAvatar,
                  { backgroundColor: selectedOpt ? selectedOpt.bg : "#f3f4f6" },
                ]}
              >
                <MaterialCommunityIcons
                  name="cow"
                  size={22}
                  color={selectedOpt?.color ?? "#9ca3af"}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={s.cowName}>{cow.name}</Text>
                <Text style={s.cowTag}>
                  #{cow.tag ?? cow.tag_id ?? "—"}
                  {cow.breed ? ` · ${cow.breed}` : ""}
                </Text>
              </View>

              {selectedOpt ? (
                <View style={s.badgeChevronRow}>
                  <View
                    style={[
                      s.statusBadge,
                      { backgroundColor: selectedOpt.bg, borderColor: selectedOpt.border },
                    ]}
                  >
                    <HealthIcon
                      icon={selectedOpt.icon}
                      lib={selectedOpt.lib}
                      color={selectedOpt.color}
                      size={13}
                    />
                    <Text style={[s.statusBadgeTxt, { color: selectedOpt.color }]}>
                      {selectedOpt.label}
                    </Text>
                  </View>
                  <Ionicons
                    name={d.expanded ? "chevron-up" : "chevron-down"}
                    size={16}
                    color="#9ca3af"
                    style={{ marginLeft: 6 }}
                  />
                </View>
              ) : (
                <View style={s.selectPrompt}>
                  <Text style={s.selectPromptTxt}>{t("select")}</Text>
                  <Ionicons name="chevron-down" size={14} color="#9ca3af" />
                </View>
              )}
            </TouchableOpacity>

            {d.expanded && (
              <View style={s.optPanel}>
                {d.status && (
                  <View style={s.updateHintRow}>
                    <MaterialCommunityIcons name="pencil-outline" size={13} color="#9ca3af" />
                    <Text style={s.updateHintTxt}>{t("tapToUpdate")}</Text>
                  </View>
                )}
                <View style={s.optGrid}>
                  {HEALTH_OPTIONS.map((opt) => {
                    const isSelected = d.status === opt.key;
                    const isSaving = d.saving === opt.key;
                    return (
                      <TouchableOpacity
                        key={opt.key}
                        style={[
                          s.optBtn,
                          { borderColor: isSelected ? opt.color : "#e5e7eb" },
                          isSelected && { backgroundColor: opt.bg },
                        ]}
                        onPress={() => handleSelect(cow, opt.key)}
                        disabled={!!d.saving}
                        activeOpacity={0.7}
                      >
                        {isSaving ? (
                          <ActivityIndicator size="small" color={opt.color} />
                        ) : (
                          <HealthIcon
                            icon={opt.icon}
                            lib={opt.lib}
                            color={isSelected ? opt.color : "#9ca3af"}
                            size={17}
                          />
                        )}
                        <Text style={[s.optLabel, { color: isSelected ? opt.color : "#6b7280" }]}>
                          {opt.label}
                        </Text>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={15} color={opt.color} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        );
      })}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#ffffff" },
  content: { padding: 16 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  loadingText: { color: "#6b7280", fontSize: 14 },
  banner: {
    borderRadius: 18, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: "#bbf7d0",
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  bannerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  bannerIconBox: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: "#dcfce7", alignItems: "center", justifyContent: "center",
  },
  bannerTitle: { fontSize: 17, fontWeight: "900", color: "#14532d" },
  bannerDate: { fontSize: 12, color: "#16a34a", marginTop: 2 },
  statsRow: { flexDirection: "row", gap: 8 },
  statPill: {
    alignItems: "center", backgroundColor: "#fff", borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: "#e5e7eb",
  },
  statNum: { fontSize: 16, fontWeight: "900" },
  statLbl: { fontSize: 10, color: "#9ca3af", fontWeight: "600", marginTop: 1 },
  progressRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  progressTxt: { fontSize: 12, color: "#6b7280", fontWeight: "600" },
  progressPct: { fontSize: 12, fontWeight: "800", color: "#374151" },
  progressBg: { height: 6, backgroundColor: "#f3f4f6", borderRadius: 4, marginBottom: 16 },
  progressFill: { height: 6, borderRadius: 4, backgroundColor: "#16a34a" },
  card: {
    backgroundColor: "#fff", borderRadius: 18, borderWidth: 1.5,
    borderColor: "#f3f4f6", padding: 16, marginBottom: 14,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  cowAvatar: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  cowName: { fontSize: 16, fontWeight: "800", color: "#111827" },
  cowTag: { fontSize: 12, color: "#9ca3af", marginTop: 2 },
  badgeChevronRow: { flexDirection: "row", alignItems: "center" },
  statusBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1,
  },
  statusBadgeTxt: { fontSize: 12, fontWeight: "700" },
  selectPrompt: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: "#f9fafb", borderRadius: 10, borderWidth: 1, borderColor: "#e5e7eb",
  },
  selectPromptTxt: { fontSize: 12, color: "#9ca3af", fontWeight: "600" },
  optPanel: { marginTop: 14 },
  updateHintRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 10 },
  updateHintTxt: { fontSize: 12, color: "#9ca3af", fontWeight: "600" },
  optGrid: { gap: 8 },
  optBtn: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 11, paddingHorizontal: 14,
    borderRadius: 12, borderWidth: 1.5, backgroundColor: "#fafafa",
  },
  optLabel: { fontSize: 14, fontWeight: "600", flex: 1 },
});